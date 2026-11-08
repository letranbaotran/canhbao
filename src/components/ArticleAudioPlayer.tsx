'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Radio, Volume2 } from 'lucide-react';
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
  32, 55, 80, 45, 90, 60, 95, 65, 40, 85, 55, 92, 70, 48, 82, 96, 62, 42, 88, 66, 38, 78, 92, 54,
  72, 46, 84, 58, 74, 50,
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

    // 2. Fallback tìm voice nữ bất kỳ trong hệ thống
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

  // Dọn dẹp khi unmount & Lắng nghe lệnh tắt khẩn cấp toàn hệ thống
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
    setActiveTab('RADIO_LIVE');

    if (wasRadioPlayingRef.current) {
      wasRadioPlayingRef.current = false;
      setIsRadioDucked(false);
    }
  };

  const startSpeech = (rate: number = playbackRate) => {
    if (typeof window === 'undefined') return;

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

      utterance.onend = () => {
        setIsPlayingAI(false);
        setCurrentTime(0);
        if (timerRef.current) clearInterval(timerRef.current);

        if (wasRadioPlayingRef.current) {
          wasRadioPlayingRef.current = false;
          setIsRadioDucked(false);
        }
        setActiveTab('RADIO_LIVE');
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
      setActiveTab('RADIO_LIVE');
    };
  };

  const togglePlayAI = () => {
    if (isPlayingAI) {
      stopAllAudio();
    } else {
      startSpeech(playbackRate);
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
          ? 'relative z-0 isolate flex flex-col gap-1.5 bg-[#F0F6FF] px-2.5 py-1.5 rounded-lg border border-[#0A4393]/25 text-[#0A4393]'
          : 'relative z-0 isolate px-2.5 py-2 sm:p-3 my-2 rounded-lg border border-[#0A4393]/25 bg-[#F0F6FF] text-[#0A4393] shadow-sm flex flex-col gap-2'
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
      {/* NỘI DUNG TAB 1: LOA PHÓNG THANH GỌN BẰNG TAB RADIO + LOA LỚN NHƯ HÌNH 2     */}
      {/* ========================================================================== */}
      <div className={activeTab === 'EASUP_AI' ? 'block' : 'hidden'}>
        <div className="relative pt-5 select-none">
          {/* CỤM LOA PHÓNG THANH CỠ LỚN GẮN ĐẦU GÓC TRÁI (MÔ PHỎNG CHÍNH XÁC HÌNH 2) */}
          <button
            type="button"
            onClick={togglePlayAI}
            className="group absolute -top-1 -left-1 z-20 w-[108px] h-[88px] sm:w-[116px] sm:h-[94px] cursor-pointer focus:outline-none"
            title={
              isPlayingAI
                ? 'Đang phát Loa Phóng Thanh (Nhấn để tạm dừng)'
                : 'Nhấn vào Loa Phóng Thanh để phát bản tin'
            }
            aria-label="Phát Loa Phóng Thanh"
          >
            <svg
              viewBox="0 0 150 122"
              className="w-full h-full overflow-visible drop-shadow-[0_5px_7px_rgba(35,16,3,0.45)] transition-transform duration-200 group-hover:scale-104"
              aria-hidden="true"
            >
              <defs>
                {/* Gradient mặt trong vành loa màu kem ngà có chiều sâu âm học */}
                <radialGradient id="megaInnerCone" cx="58%" cy="52%" r="58%">
                  <stop offset="0%" stopColor="#5C4B32" />
                  <stop offset="28%" stopColor="#9E8A68" />
                  <stop offset="62%" stopColor="#E5D7B8" />
                  <stop offset="88%" stopColor="#FAF3E3" />
                  <stop offset="100%" stopColor="#CFC09E" />
                </radialGradient>

                {/* Gradient thân ngoài phễu loa màu kem cổ điển */}
                <linearGradient id="megaOuterShell" x1="20%" y1="5%" x2="75%" y2="95%">
                  <stop offset="0%" stopColor="#FFFDF7" />
                  <stop offset="40%" stopColor="#EFE3C6" />
                  <stop offset="78%" stopColor="#C4AD82" />
                  <stop offset="100%" stopColor="#7A6542" />
                </linearGradient>

                {/* Gradient vành kim loại bạc pha đồng (Brushed Steel / Brass Rim) */}
                <linearGradient id="megaMetalRim" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="25%" stopColor="#DCD5C5" />
                  <stop offset="55%" stopColor="#8F836C" />
                  <stop offset="80%" stopColor="#4A4132" />
                  <stop offset="100%" stopColor="#ACA18A" />
                </linearGradient>

                {/* Gradient củ còi trung tâm (Central Cylindrical Phase Plug) */}
                <linearGradient id="megaCorePlug" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="32%" stopColor="#D6CFC0" />
                  <stop offset="68%" stopColor="#6E6452" />
                  <stop offset="100%" stopColor="#3B3428" />
                </linearGradient>

                {/* Gradient 3 tia sóng âm vàng rực như Hình 2 */}
                <linearGradient id="megaGoldRay" x1="0%" y1="0%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#FFE838" />
                  <stop offset="60%" stopColor="#F5B800" />
                  <stop offset="100%" stopColor="#D98200" />
                </linearGradient>
              </defs>

              {/* 1. BA TIA SÓNG ÂM HÌNH NÊM VÀNG RỰC BÊN TRÁI (Giống hệt Hình 2) */}
              <g
                className={
                  isPlayingAI ? 'opacity-100 animate-pulse' : 'opacity-85 group-hover:opacity-100'
                }
              >
                {/* Tia trên */}
                <polygon
                  points="13,13 38,31 35,34 8,21"
                  fill="url(#megaGoldRay)"
                  stroke="#C97800"
                  strokeWidth="0.8"
                />
                {/* Tia giữa */}
                <polygon
                  points="3,38 33,44 32,48 2,46"
                  fill="url(#megaGoldRay)"
                  stroke="#C97800"
                  strokeWidth="0.8"
                />
                {/* Tia dưới */}
                <polygon
                  points="8,63 32,57 33,60 11,70"
                  fill="url(#megaGoldRay)"
                  stroke="#C97800"
                  strokeWidth="0.8"
                />
              </g>

              {/* 2. GIÁ ĐỠ BẢN LỀ KIM LOẠI BẮT ỐC VÀO THÙNG GỖ (Phía dưới & sau thân loa như Hình 2) */}
              <g>
                {/* Đế bắt ốc vào mặt gỗ */}
                <path
                  d="M 86,96 L 86,112 C 86,115 90,117 95,117 L 116,117 C 120,117 123,114 124,109 L 128,86 L 114,82 L 108,103 L 94,103 L 94,95 Z"
                  fill="url(#megaMetalRim)"
                  stroke="#2B241A"
                  strokeWidth="1.4"
                />
                {/* Ốc tán tròn trên chân đế */}
                <circle cx="93" cy="110" r="3" fill="url(#megaCorePlug)" stroke="#2B241A" strokeWidth="1" />
                <circle cx="116" cy="96" r="2.6" fill="url(#megaCorePlug)" stroke="#2B241A" strokeWidth="1" />
                {/* Tay đòn khớp nối lên đai loa */}
                <path
                  d="M 90,93 L 106,93 L 112,78 L 96,76 Z"
                  fill="url(#megaCorePlug)"
                  stroke="#2B241A"
                  strokeWidth="1.3"
                />
              </g>

              {/* 3. THÂN PHỄU LOA MÀU KEM NGÀ THUÔN VỀ PHÍA SAU */}
              <path
                d="M 73,9 C 97,22 116,32 132,37 C 141,42 142,66 131,79 C 113,84 91,92 60,101 Z"
                fill="url(#megaOuterShell)"
                stroke="#4A3E2B"
                strokeWidth="1.5"
              />

              {/* 4. ĐAI KIM LOẠI ÔM THÂN LOA KÈM TAI BẮT ỐC TRÊN (Giống Hình 2) */}
              <path
                d="M 119,32 C 130,36 135,59 121,83 L 130,81 C 143,60 139,38 128,34 Z"
                fill="url(#megaMetalRim)"
                stroke="#2B241A"
                strokeWidth="1.4"
              />
              {/* Tai bản lề phía trên đai kim loại */}
              <rect
                x="118"
                y="24"
                width="11"
                height="13"
                rx="3"
                fill="url(#megaMetalRim)"
                stroke="#2B241A"
                strokeWidth="1.3"
              />
              <circle cx="123.5" cy="30.5" r="2.3" fill="url(#megaCorePlug)" stroke="#2B241A" strokeWidth="0.9" />

              {/* 5. VÀNH MIỆNG LOA ELIP CỠ LỚN (Góc nghiêng 3D chuẩn Hình 2) */}
              <g transform="translate(66, 55) rotate(-11)">
                {/* Vành kim loại ngoài cùng */}
                <ellipse
                  cx="0"
                  cy="0"
                  rx="26"
                  ry="48"
                  fill="url(#megaMetalRim)"
                  stroke="#2B241A"
                  strokeWidth="1.8"
                />
                {/* Đường gờ kim loại thứ hai */}
                <ellipse
                  cx="1"
                  cy="0"
                  rx="23.2"
                  ry="44.5"
                  fill="none"
                  stroke="#FFFDF8"
                  strokeWidth="1.1"
                  opacity="0.8"
                />
                {/* Lòng phễu âm học màu kem ngà sâu vào trong */}
                <ellipse
                  cx="2.2"
                  cy="0"
                  rx="21.5"
                  ry="42"
                  fill="url(#megaInnerCone)"
                  stroke="#5C4E38"
                  strokeWidth="1.3"
                />
                {/* Họng tối sâu bên trong đáy phễu */}
                <ellipse cx="11" cy="1" rx="9" ry="16" fill="#3D3222" opacity="0.55" />

                {/* 6. CỦ CÒI PHẢN XẠ ÂM HÌNH TRỤ Ở TÂM LOA (Đặc trưng nổi bật của Hình 2) */}
                {/* Thân trụ kim loại vươn từ đáy phễu ra */}
                <path
                  d="M 15,-9 L -2,-11 L -2,11 L 15,9 C 19,6 19,-6 15,-9 Z"
                  fill="url(#megaCorePlug)"
                  stroke="#2B241A"
                  strokeWidth="1.3"
                />
                {/* Mặt nắp tròn phía trước củ còi */}
                <ellipse
                  cx="-2"
                  cy="0"
                  rx="6.2"
                  ry="11.2"
                  fill="url(#megaMetalRim)"
                  stroke="#2B241A"
                  strokeWidth="1.3"
                />
                <ellipse
                  cx="-2.3"
                  cy="0"
                  rx="4.2"
                  ry="8.2"
                  fill="url(#megaCorePlug)"
                  stroke="#FFFDF9"
                  strokeWidth="0.7"
                />
              </g>
            </svg>
          </button>

          {/* VÒM LOA TRÊN ĐỈNH HỘP GỖ (Đồng bộ chiều cao với Tab Radio) */}
          <div
            className="relative z-10 mx-auto w-36 sm:w-48 h-3.5 -mb-[3px] rounded-t-xl bg-gradient-to-b from-[#E6B87D] via-[#A66830] to-[#63360F] px-3 pt-1 pb-0.5 border-t border-x border-[#592E0A] shadow-[0_-1px_3px_rgba(70,35,5,0.2)] flex flex-col justify-center gap-[2px]"
            aria-hidden="true"
          >
            <div className="w-full h-[2px] rounded-full bg-[#2B1203] opacity-90" />
            <div className="w-11/12 mx-auto h-[2px] rounded-full bg-[#2B1203] opacity-90" />
          </div>

          {/* THÂN HỘP GỖ VIỀN ĐỒNG THU GỌN BẰNG KÍCH THƯỚC TAB RADIO */}
          <div className="relative z-10 rounded-2xl p-[3.5px] bg-gradient-to-b from-[#E5B880] via-[#965A25] to-[#4E2808] shadow-[0_5px_12px_rgba(68,35,8,0.28),inset_0_1px_1px_rgba(255,242,218,0.75)] border border-[#4A2407]">
            <div className="rounded-[13px] bg-gradient-to-b from-[#5E320E] via-[#7A4519] to-[#3E1F05] p-[2px]">
              {/* MẶT ĐIỀU KHIỂN KEM NGÀ GỌN GÀNG (Chỉ để: Nút Play, Dải âm thanh, Tốc độ âm thanh) */}
              <div className="rounded-[11px] bg-gradient-to-b from-[#FFFDF8] via-[#FAF0DA] to-[#EFE0C2] pl-[92px] sm:pl-[104px] pr-2.5 py-2 border border-[#D7B788] shadow-inner relative">
                {/* Màng loa trầm tròn viền đồng nằm gọn góc dưới bên trái dưới chân Loa Phóng Thanh */}
                <div
                  className="pointer-events-none absolute bottom-1.5 left-[58px] sm:left-[66px] w-7 h-7 sm:w-8 sm:h-8 rounded-full p-[2px] bg-gradient-to-br from-[#FFE8A3] via-[#C68632] to-[#592906] border border-[#3A1903] shadow-sm flex items-center justify-center"
                  aria-hidden="true"
                >
                  <div className="w-full h-full rounded-full bg-[#2B1204] flex flex-col items-center justify-evenly py-1 px-1">
                    <span className="w-4/5 h-[1.5px] rounded-full bg-[#B8732A]" />
                    <span className="w-full h-[1.5px] rounded-full bg-[#D18B3E]" />
                    <span className="w-4/5 h-[1.5px] rounded-full bg-[#B8732A]" />
                  </div>
                </div>

                {/* HÀNG TRÊN: Nút Play + Dải trượt thời gian âm thanh + Tốc độ âm thanh */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2">
                  {/* 1. NÚT PLAY / PAUSE TRÒN 3D */}
                  <button
                    type="button"
                    onClick={togglePlayAI}
                    className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-b from-[#2563EB] via-[#0F3F96] to-[#07245A] text-white border-2 border-[#C89143] shadow-[0_2px_5px_rgba(0,0,0,0.32),inset_0_1px_1px_rgba(255,255,255,0.45)] flex items-center justify-center hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    aria-label={isPlayingAI ? 'Tạm dừng Loa Phóng Thanh' : 'Phát Loa Phóng Thanh'}
                    title={isPlayingAI ? 'Tạm dừng phát thanh' : 'Phát bản tin Loa Phóng Thanh'}
                  >
                    {isPlayingAI ? (
                      <Pause className="w-3.5 h-3.5 fill-white text-white" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                    )}
                  </button>

                  {/* 2. DẢI ÂM THANH (Thanh kéo tiến độ 0:00 kết hợp sóng âm) */}
                  <div className="flex-1 min-w-[110px] flex items-center gap-1.5">
                    <div className="relative flex-1 flex items-center h-5 bg-gradient-to-b from-[#E2CAA0] to-[#F7EBD3] rounded-full px-2 border border-[#B27B38] shadow-[inset_0_1px_2px_rgba(74,36,6,0.25)]">
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
                        aria-label="Thanh trượt thời lượng Loa Phóng Thanh"
                      />
                      <div
                        className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gradient-to-b from-[#2563EB] to-[#0A2E73] border-[1.5px] border-[#FFF3C4] shadow-xs transition-all duration-150"
                        style={{ left: `calc(8px + ${progressPercent * 0.86}%)` }}
                      />
                    </div>
                    <span className="shrink-0 font-mono text-[10px] sm:text-[11px] font-extrabold text-[#3E1D04] tabular-nums">
                      {formatTime(currentTime)}
                    </span>
                  </div>

                  {/* 3. TỐC ĐỘ ÂM THANH (1X, 1.25X, 1.4X, 1.5X) */}
                  <div className="shrink-0 flex items-center gap-0.5 bg-[#EAD4B0] p-0.5 rounded-full border border-[#B27B38] shadow-inner">
                    {([1, 1.25, 1.4, 1.5] as const).map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleRateChange(rate)}
                        className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold rounded-full transition-all cursor-pointer ${
                          playbackRate === rate
                            ? 'bg-gradient-to-b from-[#1D56B8] to-[#0A2E73] text-white shadow-2xs'
                            : 'text-[#5A2D0C] hover:text-[#0F3F96]'
                        }`}
                        title={`Tốc độ âm thanh ${rate}X`}
                      >
                        {rate}X
                      </button>
                    ))}
                  </div>
                </div>

                {/* HÀNG DƯỚI: Dải sóng âm thanh (Cùng chiều cao với thước tần số của Tab Radio) */}
                <div className="mt-2 pt-1 flex items-center gap-2">
                  {/* Dải sóng âm màu xanh dao động theo giọng đọc */}
                  <div className="flex-1 h-5 rounded-full bg-gradient-to-b from-[#F4E3C3] via-[#FFF9EC] to-[#E5CFA6] border border-[#C6A06D] shadow-inner px-2.5 flex items-center justify-between gap-[2px] overflow-hidden">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8C5319] shrink-0" />
                    <div className="flex-1 flex items-center justify-between gap-[2px] h-3.5 px-1">
                      {WAVEFORM_BARS.map((barHeight, idx) => {
                        const isPassed = (idx / WAVEFORM_BARS.length) * 100 <= progressPercent;
                        return (
                          <span
                            key={idx}
                            className={`w-[2.5px] rounded-full transition-all duration-200 ${
                              isPlayingAI
                                ? 'bg-[#0F3F96] animate-pulse'
                                : isPassed
                                  ? 'bg-[#0F3F96]'
                                  : 'bg-[#0F3F96]/40'
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
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8C5319] shrink-0" />
                  </div>
                </div>
              </div>
            </div>
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
