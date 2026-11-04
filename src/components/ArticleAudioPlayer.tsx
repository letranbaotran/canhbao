'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';

export interface ArticleAudioPlayerProps {
  bulletinId: string;
  title: string;
  audioUrl?: string;
  voiceLabel?: string;
  content?: string;
  autoPlayTrigger?: number;
}

export const ArticleAudioPlayer: React.FC<ArticleAudioPlayerProps> = ({
  bulletinId,
  title,
  audioUrl = '/storage/tts/sample_annhien_alert.mp3',
  voiceLabel = 'Nữ (1.4X)',
  content,
  autoPlayTrigger = 0,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(22); // Ước lượng ~22s ở tốc độ 1.4X
  const [playbackRate, setPlaybackRate] = useState<number>(1.4);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Nội dung cần đọc: ưu tiên nội dung cảnh báo chi tiết bên dưới
  const textToRead =
    content ||
    title ||
    'Ủy ban nhân dân và Ban Chỉ huy Phòng chống thiên tai và Tìm kiếm cứu nạn xã Ea Súp thông báo tình hình thiên tai.';

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

  // Tự động đồng bộ thời lượng và cập nhật giọng đọc ngay lập tức khi nội dung truyền thanh thay đổi từ Global Store
  useEffect(() => {
    const wordsCount = textToRead.split(/\s+/).length;
    const estimatedSecs = Math.max(10, Math.round((wordsCount / (170 * playbackRate)) * 60));
    setDuration(estimatedSecs);
    setCurrentTime(0);

    if (isPlaying) {
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

  // Hiệu ứng Domino: Tự động kích hoạt phát thanh Loa truyền thanh số khi người dùng chọn Kịch bản MIKE FLOOD
  useEffect(() => {
    if (!autoPlayTrigger || autoPlayTrigger <= 0) return;
    const autoTimer = setTimeout(() => {
      startSpeech(playbackRate);
    }, 80);
    return () => clearTimeout(autoTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayTrigger]);

  // Dọn dẹp khi unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopAllAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  };

  const startSpeech = (rate: number = playbackRate) => {
    if (typeof window === 'undefined') return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = 'vi-VN';
      utterance.rate = rate; // Đặt chuẩn tốc độ 1.4X

      const femaleVoice = getFemaleVietnameseVoice();
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      // Ước tính thời gian đọc theo số từ và tốc độ (khoảng 170 từ/phút ở 1.0X)
      const wordsCount = textToRead.split(/\s+/).length;
      const estimatedSecs = Math.max(10, Math.round((wordsCount / (170 * rate)) * 60));
      setDuration(estimatedSecs);

      utterance.onstart = () => {
        setIsPlaying(true);
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
        setIsPlaying(false);
        setCurrentTime(0);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      utterance.onerror = () => {
        fallbackPlayAudio(rate);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      fallbackPlayAudio(rate);
    }
  };

  const fallbackPlayAudio = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    audio.play().catch(() => {
      setIsPlaying(true);
    });
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAllAudio();
    } else {
      startSpeech(playbackRate);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (isPlaying) {
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
      className="px-2.5 py-2 sm:p-3 my-2 rounded-lg border border-[#0A4393]/25 bg-[#F0F6FF] text-[#0A4393] shadow-sm"
      role="region"
      aria-label="Trình máy đọc giọng nữ tiếng Việt"
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Main player controls: Nằm gọn trên 1 dòng cả trên điện thoại */}
      <div className="flex flex-row items-center gap-2 sm:gap-3">
        <button
          onClick={togglePlay}
          className="shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0A4393] hover:bg-[#083576] active:bg-[#062859] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0A4393] text-white transition-all transform active:scale-95 shadow-sm"
          aria-label={isPlaying ? 'Tạm dừng máy đọc' : 'Bắt đầu máy đọc giọng nữ tiếng Việt'}
          title={isPlaying ? 'Tạm dừng phát' : 'Máy đọc giọng nữ tiếng Việt (1.4X) nội dung cảnh báo'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />}
        </button>

        {/* Progress bar thu gọn linh hoạt */}
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

        {/* Speed Selector Buttons: Chỉ giữ 2 chế độ 1.25X và 1.4X */}
        <div className="shrink-0 flex items-center gap-0.5 sm:gap-1 bg-white p-0.5 rounded border border-[#0A4393]/30">
          {([1.25, 1.4] as const).map((rate) => (
            <button
              key={rate}
              onClick={() => handleRateChange(rate)}
              className={`px-1.5 py-0.5 text-[10px] sm:text-[11px] font-mono rounded transition-colors ${
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
    </div>
  );
};
