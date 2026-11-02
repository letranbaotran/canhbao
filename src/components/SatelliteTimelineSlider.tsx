'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Loader2 } from 'lucide-react';

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
      className={`rounded-lg bg-[#0a1120]/95 backdrop-blur-md border border-amber-800/80 shadow-2xl p-3 select-none transition-all ${className}`}
    >
      {/* Hàng tiêu đề trên (Header Row) */}
      <div className="flex items-center justify-between mb-2">
        {/* Bên trái: Icon lịch và Tiêu đề font monospace xanh ngọc */}
        <div className="flex items-center gap-2">
          <span className="text-base" role="img" aria-label="Lịch">
            📅
          </span>
          <span className="text-emerald-400 font-mono font-semibold text-sm tracking-wide">
            Thanh Trượt Theo Năm ({minYear} - {maxYear}):
          </span>
        </div>

        {/* Bên phải: Hộp trạng thái viền vàng hổ phách */}
        <div className="border border-amber-600/70 bg-amber-950/40 px-3 py-1 rounded flex items-center gap-1.5 shadow-sm">
          <span className="text-amber-300 text-sm">Năm hiện trạng:</span>
          <span className="font-bold text-amber-400 underline text-base font-mono">
            {sliderValue}
          </span>
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin ml-1" />
          )}
        </div>
      </div>

      {/* Hàng thanh trượt dưới (Slider Row) */}
      <div className="flex items-center w-full">
        {/* Mốc đầu 2001 */}
        <span className="text-emerald-400 font-bold font-mono text-sm mr-3 shrink-0">
          {minYear}
        </span>

        {/* Thanh trượt tùy biến */}
        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min={minYear}
            max={maxYear}
            step={1}
            value={sliderValue}
            onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
            onKeyDown={handleKeyDown}
            aria-label={`Thanh trượt chọn năm ảnh vệ tinh từ ${minYear} đến ${maxYear}`}
            className="satellite-timeline-slider w-full h-2 bg-[#1e293b] rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Mốc cuối 2026 */}
        <span className="text-rose-500 font-bold font-mono text-sm ml-3 shrink-0">
          {maxYear}
        </span>
      </div>
    </div>
  );
};
export default SatelliteTimelineSlider;
