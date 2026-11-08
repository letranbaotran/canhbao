'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Radio,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  ListMusic,
  ChevronDown,
  Maximize2,
  MoreHorizontal,
} from 'lucide-react';
import { normalizeTextForTTS } from '@/utils/tts_normalizer';
import { RadioStreamPlayer } from './RadioStreamPlayer';

export interface ArticleAudioPlayerProps {
  bulletinId: string;
  title: string;
  audioUrl?: string;
  voiceLabel?: string;
  content?: string;
  autoPlayTrigger?: number;
  compact?: boolean;
  isAdmin?: boolean;
}

const WAVEFORM_BARS = [
  28, 45, 72, 38, 86, 55, 92, 60, 34, 78, 50, 88, 65, 42, 76, 95, 58, 40, 82, 62, 36, 74, 90, 52,
  68, 44, 80, 56, 70, 48, 84, 60, 38, 72, 54, 66,
];

export const ArticleAudioPlayer: React.FC<ArticleAudioPlayerProps> = ({
  bulletinId,
  title,
  audioUrl = '/storage/tts/sample_annhien_alert.mp3',
  voiceLabel = 'AI An Nhiên (1.4X)',
  content,
  autoPlayTrigger = 0,
  compact = true,
  isAdmin = false,
}) => {
  // Chế độ phát thanh: Mặc định hiển thị Tab Radio Thời Sự (LIVE) theo yêu cầu
  const [activeTab, setActiveTab] = useState<'EASUP_AI' | 'RADIO_LIVE'>('RADIO_LIVE');

  // Trạng thái Loa Phóng Thanh (AI An Nhiên)
  const [isPlayingAI, setIsPlayingAI] = useState<boolean>(false);
  const [isMutedAI, setIsMutedAI] = useState<boolean>(false);
  const [showScriptPanel, setShowScriptPanel] = useState<boolean>(false);
  const [selectedQuickTag, setSelectedQuickTag] = useState<string>('UBND Xã');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(22);
  const [playbackRate, setPlaybackRate] = useState<number>(1.4);

  // Trạng thái Radio HLS Live & Auto-Ducking (Tự động tạm dừng khi có tin khẩn)
  const [isRadioPlaying, setIsRadioPlaying] = useState<boolean>(false);
  const [isRadioDucked, setIsRadioDucked] = useState<boolean>(false);
  const wasRadioPlayingRef = useRef<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Nội dung cần đọc: Được chuẩn hóa từ điển hành chính (UBMTTQ -> Ủy ban Mặt trận Tổ quốc, UBND -> Ủy ban nhân dân, HĐND -> Hội đồng nhân dân, DTTS -> dân tộc thiểu số, TK 277 / TK 293 -> Tiểu khu...)
  const rawText =
    content ||
    title ||
    'Ủy ban nhân dân và Ban Chỉ huy Phòng chống thiên tai và Tìm kiếm cứu nạn xã Ea Súp thông báo tình hình thiên tai.';
  const textToRead = normalizeTextForTTS(rawText);

  // Tìm giọng đọc nữ tiếng Việt Nam
  const getFemaleVietnameseVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Lọc tất cả các giọng tiếng Việt (vi, vi-VN, vi_VN, vietnam)
    const viVoices = voices.filter(
      (v) =>
        v.lang.toLowerCase().startsWith('vi') ||
        v.lang.toLowerCase().includes('vn') ||
        v.lang.toLowerCase().includes('vietnam')
    );

    if (viVoices.length > 0) {
      // Ưu tiên giọng nữ tiếng Việt rõ ràng (như HoaiMy, Mai, Linh, An, Chi, Ngọc...)
      const femaleViVoice = viVoices.find((v) => {
        const name = v.name.toLowerCase();
        return (
          name.includes('hoaimy') ||
          name.includes('female') ||
          name.includes('nu') ||
          name.includes('nữ') ||
          name.includes('mai') ||
          name.includes('linh') ||
          name.includes('chi') ||
          name.includes('an') ||
          name.includes('ngoc') ||
          name.includes('ngọc') ||
          name.includes('natural') ||
          (!name.includes('nam') && !name.includes('male'))
        );
      });
      return femaleViVoice || viVoices[0];
    }

    // 2. Fallback tìm voice nữ bất kỳ trong hệ thống nếu máy tính chưa nạp gói tiếng Việt
    const anyFemaleVoice = voices.find((v) => {
      const name = v.name.toLowerCase();
      return (
        name.includes('female') ||
        name.includes('woman') ||
        name.includes('zira') ||
        name.includes('samantha')
      );
    });
    return anyFemaleVoice || null;
  }, []);

  // Khởi tạo và nạp giọng đọc trong trình duyệt khi mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Tự động đồng bộ thời lượng khi nội dung thay đổi
  useEffect(() => {
    const wordsCount = textToRead.split(/\s+/).length;
    const estimatedSecs = Math.max(10, Math.round((wordsCount / (170 * playbackRate)) * 60));
    setDuration(estimatedSecs);
    setCurrentTime(0);

    if (isPlayingAI) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const restartTimeout = setTimeout(() => {
        startSpeech(playbackRate);
      }, 60);
      return () => clearTimeout(restartTimeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textToRead]);

  // Hiệu ứng Domino & Auto-Ducking: Tự động kích hoạt phát thanh Loa Phóng Thanh khi người dùng chọn Kịch bản MIKE FLOOD
  useEffect(() => {
    if (!autoPlayTrigger || autoPlayTrigger <= 0) return;

    // Yêu cầu 4: Auto-Ducking - Tự động tạm dừng Radio VOV1 khi có bản tin cảnh báo khẩn cấp mới
    if (isRadioPlaying) {
      wasRadioPlayingRef.current = true;
      setIsRadioDucked(true);
    }

    setActiveTab('EASUP_AI');

    const autoTimer = setTimeout(() => {
      startSpeech(playbackRate);
    }, 80);
    return () => clearTimeout(autoTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayTrigger]);

  // Dọn dẹp khi unmount & Lắng nghe lệnh tắt khẩn cấp toàn hệ thống (Hỗ trợ cả iOS Safari)
  useEffect(() => {
    const handleSilence = () => {
      stopAllAudio();
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'EASUP_LAST_STOP_ALERTS') {
        stopAllAudio();
      }
    };

    window.addEventListener('MUTE_OR_STOP_ALL_ALERTS', handleSilence);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('MUTE_OR_STOP_ALL_ALERTS', handleSilence);
      window.removeEventListener('storage', handleStorage);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopAllAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlayingAI(false);

    // Nếu đã dừng bản tin khẩn, kiểm tra phục hồi Radio nếu trước đó đang phát
    if (wasRadioPlayingRef.current) {
      wasRadioPlayingRef.current = false;
      setIsRadioDucked(false);
    }
  };

  const startSpeech = (rate: number = playbackRate) => {
    if (typeof window === 'undefined') return;

    // Yêu cầu 4: Auto-Ducking - Nếu đang nghe Radio, tạm dừng Radio để ưu tiên phát bản tin xã
    if (isRadioPlaying) {
      wasRadioPlayingRef.current = true;
      setIsRadioDucked(true);
    }

    if ('speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch {}

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = 'vi-VN';
      utterance.rate = rate;
      utterance.volume = isMutedAI ? 0 : 1;

      const femaleVoice = getFemaleVietnameseVoice();
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      const wordsCount = textToRead.split(/\s+/).length;
      const estimatedSecs = Math.max(10, Math.round((wordsCount / (170 * rate)) * 60));
      setDuration(estimatedSecs);

      utterance.onstart = () => {
        setIsPlayingAI(true);
        const startTime = Date.now() - currentTime * 1000;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed >= estimatedSecs) {
            setCurrentTime(estimatedSecs);
            if (timerRef.current) clearInterval(timerRef.current);
          } else {
            setCurrentTime(elapsed);
          }
        }, 150);
      };

      // Yêu cầu 4: Khi phát xong bản tin khẩn cấp của xã -> Tự động phát tiếp Radio
      utterance.onend = () => {
        setIsPlayingAI(false);
        setCurrentTime(0);
        if (timerRef.current) clearInterval(timerRef.current);

        if (wasRadioPlayingRef.current) {
          wasRadioPlayingRef.current = false;
          setIsRadioDucked(false);
        }
      };

      utterance.onerror = () => {
        setIsPlayingAI(false);
        if (timerRef.current) clearInterval(timerRef.current);
        fallbackPlayAudio(rate);
      };

      setTimeout(() => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch {
          fallbackPlayAudio(rate);
        }
      }, 30);
    } else {
      fallbackPlayAudio(rate);
    }
  };

  const fallbackPlayAudio = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    audio.muted = isMutedAI;
    audio.play().catch(() => {
      setIsPlayingAI(true);
    });
    setIsPlayingAI(true);

    audio.onended = () => {
      setIsPlayingAI(false);
      setCurrentTime(0);
      if (wasRadioPlayingRef.current) {
        wasRadioPlayingRef.current = false;
        setIsRadioDucked(false);
      }
    };
  };

  const togglePlayAI = () => {
    if (isPlayingAI) {
      stopAllAudio();
    } else {
      startSpeech(playbackRate);
    }
  };

  const toggleMuteAI = () => {
    const nextMuted = !isMutedAI;
    setIsMutedAI(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (isPlayingAI) {
      stopAllAudio();
      setTimeout(() => {
        startSpeech(rate);
      }, 50);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
  };

  const stepSeek = (delta: number) => {
    setCurrentTime((prev) => Math.max(0, Math.min(duration || 22, prev + delta)));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = Math.min(100, Math.max(0, (currentTime / (duration || 22)) * 100));

  return (
    <div
      className={
        compact
          ? 'flex flex-col gap-1.5 bg-[#F0F6FF] px-2.5 py-1.5 rounded-lg border border-[#0A4393]/25 text-[#0A4393]'
          : 'px-2.5 py-2 sm:p-3 my-2 rounded-lg border border-[#0A4393]/25 bg-[#F0F6FF] text-[#0A4393] shadow-sm flex flex-col gap-2'
      }
      role="region"
      aria-label="Cụm Loa Truyền Thanh Số Đa Năng Xã Ea Súp"
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Thanh chuyển đổi 2 chế độ (Tab 1: Loa Phóng Thanh & Tab 2: Radio Thời Sự - LIVE) */}
      <div className="flex items-center justify-between gap-1 border-b border-[#0A4393]/15 pb-1">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
          {/* Tab 1: Loa Phóng Thanh */}
          <button
            type="button"
            onClick={() => setActiveTab('EASUP_AI')}
            className={`px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold rounded transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'EASUP_AI'
                ? 'bg-[#0A4393] text-white shadow-xs'
                : 'text-[#0A4393] bg-white/80 hover:bg-white hover:text-[#0A4393] border border-[#0A4393]/15'
            }`}
            title="Nghe Bản tin Cảnh báo xã Ea Súp qua Loa Phóng Thanh AI"
          >
            <Volume2 className="w-3 h-3" />
            <span>Loa Phóng Thanh</span>
            {isPlayingAI && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block ml-0.5" />
            )}
          </button>

          {/* Tab 2: Radio Thời Sự (LIVE) */}
          <button
            type="button"
            onClick={() => setActiveTab('RADIO_LIVE')}
            className={`px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold rounded transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'RADIO_LIVE'
                ? 'bg-[#0A4393] text-white shadow-xs'
                : 'text-[#0A4393] bg-white/80 hover:bg-white hover:text-[#0A4393] border border-[#0A4393]/15'
            }`}
            title="Nghe Radio Thời sự trực tuyến VOV1, VOV2, VOV Giao thông, Đài Đắk Lắk"
          >
            <Radio className="w-3 h-3 text-rose-500" />
            <span>Radio Thời Sự (LIVE)</span>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600" />
            </span>
          </button>
        </div>

        {/* Nhãn trạng thái nhỏ bên phải */}
        <div className="hidden sm:flex items-center text-[9px] font-mono font-medium text-[#0A4393]/70">
          {activeTab === 'EASUP_AI' ? 'Giọng Nữ AI' : 'HLS 24/7'}
        </div>
      </div>

      {/* ========================================================================== */}
      {/* NỘI DUNG TAB 1: LOA PHÓNG THANH CỔ ĐIỂN MÔ PHỎNG THEO ẢNH 5                */}
      {/* ========================================================================== */}
      <div className={activeTab === 'EASUP_AI' ? 'block pt-0.5' : 'hidden'}>
        <div className="relative rounded-2xl bg-gradient-to-b from-[#9E5520] via-[#7A3E12] to-[#4E2408] p-[6px] shadow-[0_6px_16px_rgba(61,28,4,0.38)] border-2 border-[#D6A15C]">
          {/* Viền chỉ vàng đồng bên trong hộp gỗ */}
          <div className="relative rounded-[11px] border border-[#E5B869]/60 bg-gradient-to-b from-[#8A4717] to-[#59290A] p-2 sm:p-2.5">
            {/* 4 đinh tán đồng ở 4 góc */}
            <span className="pointer-events-none absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFF0C2] via-[#C88A36] to-[#522705] border border-[#3E1B02] shadow-xs" />
            <span className="pointer-events-none absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFF0C2] via-[#C88A36] to-[#522705] border border-[#3E1B02] shadow-xs" />
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFF0C2] via-[#C88A36] to-[#522705] border border-[#3E1B02] shadow-xs" />
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFF0C2] via-[#C88A36] to-[#522705] border border-[#3E1B02] shadow-xs" />

            {/* Bố cục chính: Cột trái (Loa phóng thanh + Màng loa tròn) & Cột phải (Bảng điều khiển) */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              {/* CỘT TRÁI: Loa Phóng Thanh vươn góc trái + Loa Tròn Đồng phía dưới (Giống Ảnh 5) */}
              <div className="flex sm:flex-col items-center justify-around sm:justify-between bg-gradient-to-b from-[#6B330E] to-[#461E05] rounded-xl px-2.5 py-1.5 border border-[#C88A36]/50 shadow-inner shrink-0 sm:w-[104px]">
                {/* Hình Loa Phóng Thanh 3D + Tia sóng âm vàng */}
                <button
                  type="button"
                  onClick={togglePlayAI}
                  className="relative group cursor-pointer focus:outline-none"
                  title={isPlayingAI ? 'Đang phát Loa Phóng Thanh (Nhấn để dừng)' : 'Nhấn để phát Loa Phóng Thanh'}
                >
                  <svg
                    viewBox="0 0 110 72"
                    className="w-[84px] h-[54px] sm:w-[92px] sm:h-[60px] drop-shadow-[0_3px_4px_rgba(0,0,0,0.45)] transition-transform group-hover:scale-105"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="hornBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFFDF7" />
                        <stop offset="45%" stopColor="#F2DFBE" />
                        <stop offset="80%" stopColor="#C99649" />
                        <stop offset="100%" stopColor="#7C4711" />
                      </linearGradient>
                      <linearGradient id="brassRimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFF3C4" />
                        <stop offset="35%" stopColor="#DDA247" />
                        <stop offset="75%" stopColor="#8F5112" />
                        <stop offset="100%" stopColor="#4A2404" />
                      </linearGradient>
                      <radialGradient id="hornMouthDark" cx="45%" cy="50%" r="55%">
                        <stop offset="0%" stopColor="#1A0B02" />
                        <stop offset="65%" stopColor="#4E260A" />
                        <stop offset="100%" stopColor="#8C5319" />
                      </radialGradient>
                    </defs>

                    {/* 3 Tia sóng âm vàng phát ra từ miệng loa bên trái */}
                    <g
                      className={
                        isPlayingAI ? 'opacity-100 animate-pulse' : 'opacity-65 group-hover:opacity-95'
                      }
                      stroke="#FFD56B"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <line x1="4" y1="16" x2="15" y2="21" />
                      <line x1="2" y1="30" x2="13" y2="30" />
                      <line x1="5" y1="45" x2="16" y2="40" />
                    </g>

                    {/* Chân đế gắn loa vào thùng gỗ */}
                    <path
                      d="M 64 46 L 76 64 L 94 64 L 84 42 Z"
                      fill="url(#brassRimGrad)"
                      stroke="#3B1B04"
                      strokeWidth="1.2"
                    />
                    <rect
                      x="70"
                      y="61"
                      width="28"
                      height="6"
                      rx="2.5"
                      fill="url(#brassRimGrad)"
                      stroke="#3B1B04"
                      strokeWidth="1.2"
                    />

                    {/* Thân phễu loa phóng thanh vươn về bên trái */}
                    <path
                      d="M 28 11 C 48 18, 66 25, 84 28 L 88 41 C 68 41, 48 44, 24 51 Z"
                      fill="url(#hornBodyGrad)"
                      stroke="#5C2E09"
                      strokeWidth="1.4"
                    />

                    {/* Đai đồng giữa thân loa */}
                    <path
                      d="M 59 22 L 63 43"
                      stroke="url(#brassRimGrad)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Củ loa nén phía sau (Compression driver) */}
                    <ellipse
                      cx="88"
                      cy="35"
                      rx="9"
                      ry="10"
                      fill="url(#brassRimGrad)"
                      stroke="#3B1B04"
                      strokeWidth="1.3"
                    />
                    <circle cx="91" cy="35" r="4" fill="#5A2A07" />

                    {/* Vành miệng loa elip phía trước */}
                    <ellipse
                      cx="25"
                      cy="31"
                      rx="8.5"
                      ry="21"
                      transform="rotate(-6 25 31)"
                      fill="url(#brassRimGrad)"
                      stroke="#472105"
                      strokeWidth="1.5"
                    />
                    <ellipse
                      cx="24.5"
                      cy="31"
                      rx="6.2"
                      ry="17.5"
                      transform="rotate(-6 24.5 31)"
                      fill="url(#hornMouthDark)"
                    />
                    {/* Nón phản xạ âm giữa họng loa */}
                    <ellipse
                      cx="27.5"
                      cy="31"
                      rx="3"
                      ry="6.5"
                      transform="rotate(-6 27.5 31)"
                      fill="url(#brassRimGrad)"
                    />
                  </svg>
                </button>

                {/* Màng Loa Tròn Viền Đồng Cổ Điển (Phía dưới Loa Phóng Thanh giống Ảnh 5) */}
                <div
                  className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full p-1 bg-gradient-to-br from-[#FFE8A3] via-[#C68632] to-[#592906] border-2 border-[#3A1903] shadow-[0_3px_6px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.6)] flex items-center justify-center shrink-0"
                  title="Cụm loa trầm cộng hưởng truyền thanh xã Ea Súp"
                >
                  {/* 8 đinh tán quanh vành loa */}
                  <span className="w-1 h-1 rounded-full bg-[#3A1903] absolute top-0.5 left-1/2 -translate-x-1/2" />
                  <span className="w-1 h-1 rounded-full bg-[#3A1903] absolute bottom-0.5 left-1/2 -translate-x-1/2" />
                  <span className="w-1 h-1 rounded-full bg-[#3A1903] absolute left-0.5 top-1/2 -translate-y-1/2" />
                  <span className="w-1 h-1 rounded-full bg-[#3A1903] absolute right-0.5 top-1/2 -translate-y-1/2" />

                  {/* Lưới loa khe ngang màu nâu đen */}
                  <div className="w-full h-full rounded-full bg-gradient-to-b from-[#2B1204] via-[#3F1C08] to-[#1E0B02] border border-[#8E5317] flex flex-col items-center justify-evenly py-1.5 px-1.5 overflow-hidden shadow-inner">
                    <span className="w-4/5 h-[2px] rounded-full bg-[#9E6021]/70" />
                    <span className="w-full h-[2.5px] rounded-full bg-[#B8732A]/80" />
                    <span className="w-full h-[2.5px] rounded-full bg-[#D18B3E]/90" />
                    <span className="w-full h-[2.5px] rounded-full bg-[#B8732A]/80" />
                    <span className="w-4/5 h-[2px] rounded-full bg-[#9E6021]/70" />
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: 3 Tầng Điều Khiển Màu Kem & Xanh Hoàng Gia (Giống Ảnh 5) */}
              <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                {/* TẦNG 1: Thanh Tiêu đề Xanh + Các Nhãn Chọn Nhanh + Cụm Nút Tiện Ích */}
                <div className="flex flex-wrap xl:flex-nowrap items-center gap-1.5">
                  {/* Nút chính màu Xanh Hoàng Gia bên trái */}
                  <button
                    type="button"
                    onClick={togglePlayAI}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-b from-[#1D56B8] via-[#0F3F96] to-[#082B6B] text-white font-bold text-[11px] sm:text-xs border border-[#72A4F8]/60 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-98 transition-all cursor-pointer shrink-0"
                    title="Phát / Tạm dừng Bản tin Loa Phóng Thanh"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#FFD97D] shrink-0" />
                    <span className="whitespace-nowrap">Loa Phóng Thanh</span>
                    <ChevronDown className="w-3 h-3 opacity-80 shrink-0" />
                  </button>

                  {/* Thanh chọn nhanh các đầu mối phát thanh ở giữa */}
                  <div className="flex-1 min-w-[180px] flex items-center justify-around bg-gradient-to-b from-[#FFF9EA] to-[#EAD7B3] rounded-lg px-2 py-1 border border-[#B27B38] shadow-[inset_0_1px_3px_rgba(89,45,10,0.25)] text-[10px] sm:text-[11px] font-bold text-[#4E2608] overflow-x-auto no-scrollbar">
                    {(['UBND Xã', 'PCTT', 'TK-293', 'Hồ Thượng'] as const).map((tag, idx) => (
                      <React.Fragment key={tag}>
                        {idx > 0 && <span className="text-[#B27B38]/60 px-1 select-none">|</span>}
                        <button
                          type="button"
                          onClick={() => setSelectedQuickTag(tag)}
                          className={`whitespace-nowrap px-1.5 py-0.2 rounded transition-colors cursor-pointer ${
                            selectedQuickTag === tag
                              ? 'bg-[#0F3F96] text-white shadow-2xs'
                              : 'hover:text-[#0F3F96]'
                          }`}
                        >
                          {tag}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Cụm 3 nút tiện ích bên phải (Loa, Mở rộng nội dung, Tùy chọn) */}
                  <div className="flex items-center gap-1 bg-gradient-to-b from-[#FFF9EA] to-[#EAD7B3] rounded-lg px-2 py-1 border border-[#B27B38] shadow-[inset_0_1px_2px_rgba(89,45,10,0.2)] text-[#4E2608] shrink-0">
                    <button
                      type="button"
                      onClick={toggleMuteAI}
                      className="p-0.5 hover:text-[#0F3F96] transition-colors cursor-pointer"
                      title={isMutedAI ? 'Bật tiếng Loa Phóng Thanh' : 'Tắt tiếng Loa Phóng Thanh'}
                      aria-label={isMutedAI ? 'Bật tiếng' : 'Tắt tiếng'}
                    >
                      {isMutedAI ? (
                        <VolumeX className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="text-[#B27B38]/50 text-[10px] select-none">|</span>
                    <button
                      type="button"
                      onClick={() => setShowScriptPanel((prev) => !prev)}
                      className="p-0.5 hover:text-[#0F3F96] transition-colors cursor-pointer"
                      title="Xem văn bản bản tin đã chuẩn hóa từ điển hành chính"
                      aria-label="Xem văn bản bản tin"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                    <span className="text-[#B27B38]/50 text-[10px] select-none">|</span>
                    <button
                      type="button"
                      onClick={() => setShowScriptPanel((prev) => !prev)}
                      className="p-0.5 hover:text-[#0F3F96] transition-colors cursor-pointer"
                      title="Thông tin chi tiết bản tin phát thanh"
                      aria-label="Thông tin chi tiết"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* TẦNG 2: Bảng Điều Khiển Phát Thanh Chính (Nút Play Tròn Xanh, Tua, Thanh trượt 0:00, Tốc độ, Nút Danh sách) */}
                <div className="bg-gradient-to-b from-[#FFFDF7] via-[#F5E6C8] to-[#E5CFA6] rounded-xl px-2.5 py-2 border border-[#B9823C] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_5px_rgba(0,0,0,0.25)] flex flex-wrap sm:flex-nowrap items-center gap-2">
                  {/* Nút Play / Pause Tròn 3D Màu Xanh Hoàng Gia */}
                  <button
                    type="button"
                    onClick={togglePlayAI}
                    className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-[#2563EB] via-[#0F3F96] to-[#07245A] text-white border-2 border-[#C89143] shadow-[0_3px_6px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.45)] flex items-center justify-center hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    aria-label={isPlayingAI ? 'Tạm dừng máy đọc' : 'Bắt đầu máy đọc giọng nữ tiếng Việt'}
                    title={isPlayingAI ? 'Tạm dừng phát thanh' : 'Phát bản tin Loa Phóng Thanh'}
                  >
                    {isPlayingAI ? (
                      <Pause className="w-4 h-4 fill-white text-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                    )}
                  </button>

                  {/* Cụm nút Tua lùi / Tua tới (-5s / +5s) */}
                  <div className="flex items-center gap-1 text-[#5A2D0C] shrink-0">
                    <button
                      type="button"
                      onClick={() => stepSeek(-5)}
                      className="p-1 rounded hover:bg-[#D9BF93]/60 active:scale-95 transition-all cursor-pointer"
                      title="Lùi 5 giây"
                      aria-label="Lùi 5 giây"
                    >
                      <SkipBack className="w-3.5 h-3.5 fill-[#5A2D0C]" />
                    </button>
                    <span className="text-[#B27B38]/60 text-xs select-none">|</span>
                    <button
                      type="button"
                      onClick={() => stepSeek(5)}
                      className="p-1 rounded hover:bg-[#D9BF93]/60 active:scale-95 transition-all cursor-pointer"
                      title="Tới 5 giây"
                      aria-label="Tới 5 giây"
                    >
                      <SkipForward className="w-3.5 h-3.5 fill-[#5A2D0C]" />
                    </button>
                    <span className="text-[#B27B38]/60 text-xs select-none hidden sm:inline">|</span>
                  </div>

                  {/* Biểu tượng loa xanh + Thanh kéo thời gian 0:00 giống Ảnh 5 */}
                  <div className="flex-1 min-w-[140px] flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-[#0F3F96] shrink-0 hidden md:block" />

                    {/* Rãnh trượt thời lượng màu kem viền đồng kèm nút tròn xanh */}
                    <div className="relative flex-1 flex items-center h-5 bg-gradient-to-b from-[#E2CAA0] to-[#F7EBD3] rounded-full px-2 border border-[#B27B38] shadow-[inset_0_1px_3px_rgba(74,36,6,0.3)]">
                      <div className="relative w-full h-1.5 bg-[#C5A472] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#0F3F96] to-[#2563EB] rounded-full transition-all duration-150"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={duration || 22}
                        value={currentTime}
                        onChange={handleSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label="Thanh trượt thời lượng máy đọc"
                      />
                      {/* Nút trượt tròn màu xanh viền vàng đồng */}
                      <div
                        className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-gradient-to-b from-[#2563EB] to-[#0A2E73] border-2 border-[#FFF3C4] shadow-sm transition-all duration-150"
                        style={{ left: `calc(8px + ${progressPercent * 0.88}%)` }}
                      />
                    </div>

                    <span className="shrink-0 font-mono text-[11px] sm:text-xs font-extrabold text-[#3E1D04] tabular-nums">
                      {formatTime(currentTime)}
                    </span>
                  </div>

                  {/* Bộ chọn tốc độ đọc (1X, 1.25X, 1.4X, 1.5X) */}
                  <div className="shrink-0 flex items-center gap-0.5 bg-[#EAD4B0] p-0.5 rounded-lg border border-[#B27B38]">
                    {([1, 1.25, 1.4, 1.5] as const).map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleRateChange(rate)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                          playbackRate === rate
                            ? 'bg-gradient-to-b from-[#1D56B8] to-[#0A2E73] text-white shadow-2xs'
                            : 'text-[#5A2D0C] hover:text-[#0F3F96]'
                        }`}
                        title={`Tốc độ đọc ${rate}X`}
                      >
                        {rate}X
                      </button>
                    ))}
                  </div>

                  {/* Nút bật/tắt bảng nội dung kịch bản màu xanh bên phải (Giống nút 3 gạch xanh ở Ảnh 5) */}
                  <button
                    type="button"
                    onClick={() => setShowScriptPanel((prev) => !prev)}
                    className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-b from-[#1D56B8] via-[#0F3F96] to-[#082B6B] text-white border border-[#C89143] shadow-sm flex items-center justify-center hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    title="Hiển thị nội dung bản tin phát thanh chuẩn hóa"
                    aria-label="Hiển thị nội dung bản tin"
                  >
                    <ListMusic className="w-4 h-4" />
                  </button>
                </div>

                {/* TẦNG 3: Thanh Sóng Âm Quang Phổ Màu Xanh Hoàng Gia + Đinh Tán Đồng 2 Đầu (Giống Đáy Ảnh 5) */}
                <div className="bg-gradient-to-b from-[#F4E3C3] via-[#FFF9EC] to-[#E5CFA6] rounded-full px-3 py-1.5 border border-[#B9823C] shadow-[inset_0_1px_3px_rgba(74,36,6,0.3)] flex items-center justify-between gap-2">
                  {/* Đinh tán đồng bên trái */}
                  <span className="w-2 h-2 rounded-full bg-gradient-to-br from-[#FFF0C2] via-[#C88A36] to-[#522705] border border-[#3E1B02] shrink-0" />

                  {/* Dải sóng âm màu xanh (Dao động khi Loa Phóng Thanh đang phát) */}
                  <div className="flex-1 flex items-center justify-between gap-[2px] h-4 overflow-hidden px-1">
                    {WAVEFORM_BARS.map((barHeight, idx) => {
                      const isPassed = (idx / WAVEFORM_BARS.length) * 100 <= progressPercent;
                      return (
                        <span
                          key={idx}
                          className={`w-[3px] rounded-full transition-all duration-200 ${
                            isPlayingAI
                              ? 'bg-[#0F3F96] animate-pulse'
                              : isPassed
                                ? 'bg-[#0F3F96]'
                                : 'bg-[#0F3F96]/45'
                          }`}
                          style={{
                            height: isPlayingAI
                              ? `${Math.max(25, ((barHeight + idx * 13) % 85) + 15)}%`
                              : `${barHeight}%`,
                            animationDelay: `${(idx % 6) * 90}ms`,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Tên bản tin rút gọn & Đinh tán đồng bên phải */}
                  <span className="hidden md:inline-block text-[10px] font-bold text-[#4E2608] truncate max-w-[180px]">
                    {title || 'Bản tin Cảnh báo UBND xã Ea Súp'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-gradient-to-br from-[#FFF0C2] via-[#C88A36] to-[#522705] border border-[#3E1B02] shrink-0" />
                </div>
              </div>
            </div>

            {/* Khung văn bản kịch bản chuẩn hóa từ điển hành chính (Mở khi bấm nút Danh sách) */}
            {showScriptPanel && (
              <div className="mt-2 bg-[#FFFDF7] rounded-lg p-2.5 border border-[#B9823C] text-[11px] text-[#3E1D04] shadow-inner space-y-1">
                <div className="flex items-center justify-between font-bold text-[#0F3F96] border-b border-[#E5CFA6] pb-1">
                  <span>📜 Nội dung phát thanh (Đã chuẩn hóa từ điển hành chính):</span>
                  <span className="text-[10px] font-mono bg-[#EAD4B0] px-1.5 py-0.5 rounded text-[#4E2608]">
                    {voiceLabel} • {formatTime(duration || 22)}
                  </span>
                </div>
                <p className="leading-relaxed italic text-[#4E2608]">{textToRead}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================== */}
      {/* NỘI DUNG TAB 2: RADIO THỜI SỰ TRỰC TIẾP - GIAO DIỆN RADIO CỔ ĐIỂN          */}
      {/* ========================================================================== */}
      <div className={activeTab === 'RADIO_LIVE' ? 'block' : 'hidden'}>
        <RadioStreamPlayer
          isAdmin={isAdmin}
          isDucked={isRadioDucked}
          onPlayingChange={(playing) => setIsRadioPlaying(playing)}
        />
      </div>
    </div>
  );
};
