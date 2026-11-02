'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, RotateCcw } from 'lucide-react';

export interface ArticleAudioPlayerProps {
  bulletinId: string;
  title: string;
  audioUrl: string;
  voiceLabel?: string;
}

export const ArticleAudioPlayer: React.FC<ArticleAudioPlayerProps> = ({
  bulletinId,
  title,
  audioUrl,
  voiceLabel = 'An Nhiên',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5 | 2>(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 60);
      setIsLoaded(true);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {
        // Fallback simulate play for mock audio
        setIsPlaying(true);
      });
      setIsPlaying(true);
    }
  };

  const handleRateChange = (rate: 1 | 1.25 | 1.5 | 2) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
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
      aria-label="Trình phát thanh AI An Nhiên"
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Header bar: Giọng đọc & Nút Tải về */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
          <Volume2 className="w-4 h-4 animate-pulse text-emerald-400" />
          <span>Giọng đọc AI: {voiceLabel} (Bản tin truyền thanh số xã Ea Súp)</span>
        </div>
        <a
          href={audioUrl}
          download={`${bulletinId}.mp3`}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-400 text-slate-300 hover:text-white transition-colors"
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
          aria-label={isPlaying ? 'Tạm dừng phát thanh' : 'Bắt đầu phát thanh'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Progress bar */}
        <div className="flex-1 w-full flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-8 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 60}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Thanh trượt thời lượng âm thanh"
          />
          <span className="w-8">{formatTime(duration || 60)}</span>
        </div>

        {/* Speed Selector Buttons */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded border border-slate-700/60">
          {([1, 1.25, 1.5, 2] as const).map((rate) => (
            <button
              key={rate}
              onClick={() => handleRateChange(rate)}
              className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
                playbackRate === rate
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {rate}X
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
