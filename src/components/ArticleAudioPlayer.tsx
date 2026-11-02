'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';

export interface ArticleAudioPlayerProps {
  bulletinId: string;
  title: string;
  audioUrl?: string;
  voiceLabel?: string;
  content?: string;
}

export const ArticleAudioPlayer: React.FC<ArticleAudioPlayerProps> = ({
  bulletinId,
  title,
  audioUrl = '/storage/tts/sample_annhien_alert.mp3',
  voiceLabel = 'Nữ (1.4X)',
  content,
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
      className="p-3 my-2 rounded-lg border border-slate-700 bg-slate-900/90 text-slate-100 shadow-md backdrop-blur-sm"
      role="region"
      aria-label="Trình máy đọc giọng nữ tiếng Việt"
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Main player controls (Đã bỏ hoàn toàn nút Tải MP3) */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400 text-white transition-all transform active:scale-95 shadow-sm"
          aria-label={isPlaying ? 'Tạm dừng máy đọc' : 'Bắt đầu máy đọc giọng nữ tiếng Việt'}
          title={isPlaying ? 'Tạm dừng phát' : 'Máy đọc giọng nữ tiếng Việt (1.4X) nội dung cảnh báo'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Progress bar */}
        <div className="flex-1 w-full flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-8 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 22}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Thanh trượt thời lượng máy đọc"
          />
          <span className="w-8">{formatTime(duration || 22)}</span>
        </div>

        {/* Speed Selector Buttons: Mặc định tốc độ 1.4X */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded border border-slate-700/60">
          {([1, 1.25, 1.4, 1.5, 2] as const).map((rate) => (
            <button
              key={rate}
              onClick={() => handleRateChange(rate)}
              className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
                playbackRate === rate
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
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
