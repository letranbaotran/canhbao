'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Download, Volume2, RotateCcw } from 'lucide-react';

export interface ArticleAudioPlayerProps {
  bulletinId: string;
  title: string;
  audioUrl: string;
  voiceLabel?: string;
  content?: string;
}

export const ArticleAudioPlayer: React.FC<ArticleAudioPlayerProps> = ({
  bulletinId,
  title,
  audioUrl,
  voiceLabel = 'Nữ (1.4X)',
  content,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(25); // Ước lượng ~25s ở tốc độ 1.4X cho đoạn tin
  const [playbackRate, setPlaybackRate] = useState<number>(1.4);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const textToRead = content || title || 'Bản tin cảnh báo thiên tai và giám sát rừng xã Ea Súp.';

  // Tìm giọng đọc nữ tiếng Việt
  const getFemaleVietnameseVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    // 1. Tìm giọng tiếng Việt nữ (như HoaiMy, Mai, Linh, Lan, Chi...)
    const viVoices = voices.filter(
      (v) => v.lang.toLowerCase().includes('vi') || v.lang.toLowerCase().includes('vn')
    );
    if (viVoices.length > 0) {
      const female = viVoices.find(
        (v) =>
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('hoaimy') ||
          v.name.toLowerCase().includes('nu') ||
          v.name.toLowerCase().includes('mai') ||
          v.name.toLowerCase().includes('an') ||
          !v.name.toLowerCase().includes('male')
      );
      return female || viVoices[0];
    }
    // 2. Fallback tìm giọng nữ bất kỳ
    return voices.find((v) => v.name.toLowerCase().includes('female')) || null;
  }, []);

  // Khởi tạo giọng đọc trong trình duyệt khi mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        getFemaleVietnameseVoice();
      };
    }
  }, [getFemaleVietnameseVoice]);

  // Dọn dẹp SpeechSynthesis khi unmount
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
      utterance.rate = rate; // Đặt tốc độ 1.4X

      const femaleVoice = getFemaleVietnameseVoice();
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      // Ước tính thời gian đọc dựa vào số từ và tốc độ (trung bình 180 từ/phút ở 1.0X)
      const wordsCount = textToRead.split(/\s+/).length;
      const estimatedSecs = Math.max(10, Math.round((wordsCount / (180 * rate)) * 60));
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
        }, 200);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      utterance.onerror = () => {
        // Fallback sang HTML5 audio nếu SpeechSynthesis gặp lỗi
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
      aria-label="Trình phát thanh bản tin"
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Header bar: Bỏ dòng chữ "Giọng đọc AI: An Nhiên...", chỉ giữ Nút Tải về MP3 */}
      <div className="flex items-center justify-end gap-2 mb-2 pb-1 border-b border-slate-800">
        <a
          href={audioUrl}
          download={`${bulletinId}.mp3`}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-400 text-slate-300 hover:text-white transition-colors"
          title="Tải file .mp3 phát qua cụm loa truyền thanh thôn buôn"
        >
          <Download className="w-3 h-3" />
          <span>Tải MP3</span>
        </a>
      </div>

      {/* Main player controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400 text-white transition-all transform active:scale-95 shadow-sm"
          aria-label={isPlaying ? 'Tạm dừng phát thanh' : 'Bắt đầu máy đọc giọng nữ bản tin'}
          title={isPlaying ? 'Tạm dừng phát' : 'Máy đọc giọng nữ (1.4X) nội dung bản tin'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Progress bar */}
        <div className="flex-1 w-full flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-8 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 25}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Thanh trượt thời lượng âm thanh"
          />
          <span className="w-8">{formatTime(duration || 25)}</span>
        </div>

        {/* Speed Selector Buttons: Mặc định 1.4X */}
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
