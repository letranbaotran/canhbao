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

      {/* NỘI DUNG TAB 1: Loa Phóng Thanh */}
      <div className={activeTab === 'EASUP_AI' ? 'flex flex-col gap-1' : 'hidden'}>
        <div className="flex flex-row items-center gap-2 sm:gap-3 w-full">
          <button
            type="button"
            onClick={togglePlayAI}
            className="shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0A4393] hover:bg-[#083576] active:bg-[#062859] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0A4393] text-white transition-all transform active:scale-95 shadow-sm cursor-pointer"
            aria-label={isPlayingAI ? 'Tạm dừng máy đọc' : 'Bắt đầu máy đọc giọng nữ tiếng Việt'}
            title={isPlayingAI ? 'Tạm dừng phát' : 'Loa Phóng Thanh đọc nội dung cảnh báo'}
          >
            {isPlayingAI ? (
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
            )}
          </button>

          {/* Thanh kéo thời gian 00:00 */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono text-[#0A4393] font-semibold">
            <span className="shrink-0 tabular-nums">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 22}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 min-w-[48px] w-full h-1.5 bg-[#0A4393]/20 rounded-lg appearance-none cursor-pointer accent-[#0A4393] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A4393]"
              aria-label="Thanh trượt thời lượng máy đọc"
            />
            <span className="shrink-0 tabular-nums">{formatTime(duration || 22)}</span>
          </div>

          {/* Bộ chọn tốc độ đọc: 1X, 1.25X, 1.4X, 1.5X */}
          <div className="shrink-0 flex items-center gap-0.5 sm:gap-1 bg-white p-0.5 rounded border border-[#0A4393]/30">
            {([1, 1.25, 1.4, 1.5] as const).map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleRateChange(rate)}
                className={`px-1.5 py-0.5 text-[10px] sm:text-[11px] font-mono rounded transition-colors cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-[#0A4393] text-white font-semibold shadow-xs'
                    : 'text-[#0A4393]/70 hover:text-[#0A4393]'
                }`}
                title={`Tốc độ đọc ${rate}X`}
              >
                {rate}X
              </button>
            ))}
          </div>
        </div>

        {/* Chú thích bản tin & lưu ý chuẩn hóa từ điển hành chính */}
        <div className="flex items-center justify-between text-[10px] text-[#0A4393]/75 pt-0.5">
          <span className="truncate">
            📢 Bản tin cảnh báo: <strong>{title || 'UBND xã Ea Súp'}</strong>
          </span>
          <span className="shrink-0 text-[9px] font-mono bg-blue-100/60 px-1 py-0.2 rounded text-[#0A4393]">
            Cache MP3 VPS
          </span>
        </div>
      </div>

      {/* NỘI DUNG TAB 2: Radio Thời Sự Trực Tiếp - Giao diện Radio Cổ Điển */}
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
