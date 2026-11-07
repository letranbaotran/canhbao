'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface SatelliteTimelineSliderProps {
  currentYear: number;
  minYear?: number; // default 2001
  maxYear?: number; // default 2026
  isLoading?: boolean;
  onYearChange: (year: number) => void;
  className?: string;
}

export const SatelliteTimelineSlider: React.FC<SatelliteTimelineSliderProps> = ({
  currentYear,
  minYear = 2001,
  maxYear = 2026,
  isLoading = false,
  onYearChange,
  className = '',
}) => {
  // sliderValue phản hồi tức thì 60fps khi kéo chuột / chạm
  const [sliderValue, setSliderValue] = useState<number>(currentYear);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Đồng bộ khi currentYear từ bên ngoài thay đổi (ví dụ nút nhảy nhanh hoặc phím tắt)
  useEffect(() => {
    setSliderValue(currentYear);
  }, [currentYear]);

  // Xử lý kéo thanh trượt với Debounce 200ms chống spam request gạch vệ tinh
  const handleSliderChange = (newVal: number) => {
    setSliderValue(newVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onYearChange(newVal);
    }, 200);
  };

  // Hỗ trợ phím tắt mũi tên Trái / Phải để lùi / tiến 1 năm
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevYear = Math.max(minYear, sliderValue - 1);
      handleSliderChange(prevYear);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextYear = Math.min(maxYear, sliderValue + 1);
      handleSliderChange(nextYear);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`rounded-md bg-white border border-[#0A4393]/25 px-2.5 py-1.5 select-none transition-all flex flex-wrap items-center gap-2 ${className}`}
    >
      {/* Bên trái: Icon gọn (Ảnh 3: Đã tinh gọn, bỏ text Thanh trượt năm) */}
      <div className="flex items-center shrink-0">
        <span className="text-xs" role="img" aria-label="Lịch">
          📅
        </span>
      </div>

      {/* Giữa: Thanh trượt */}
      <div className="flex items-center flex-1 min-w-[160px] gap-2">
        <span className="text-[#0A4393] font-bold font-mono text-[11px] shrink-0">
          {minYear}
        </span>
        <input
          type="range"
          min={minYear}
          max={maxYear}
          step={1}
          value={sliderValue}
          onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
          onKeyDown={handleKeyDown}
          aria-label={`Thanh trượt chọn năm ảnh vệ tinh từ ${minYear} đến ${maxYear}`}
          className="satellite-timeline-slider w-full h-1.5 bg-[#cfe0f5] rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0A4393]"
        />
        <span className="text-rose-600 font-bold font-mono text-[11px] shrink-0">
          {maxYear}
        </span>
      </div>

      {/* Bên phải: Năm hiện trạng */}
      <div className="bg-[#0A4393] text-white px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs shrink-0 ml-auto">
        <span className="text-blue-100 text-[10px]">Năm:</span>
        <span className="font-bold text-white underline text-xs font-mono">
          {sliderValue}
        </span>
        {isLoading && (
          <Loader2 className="w-3 h-3 text-white animate-spin ml-0.5" />
        )}
      </div>
    </div>
  );
};
export default SatelliteTimelineSlider;
