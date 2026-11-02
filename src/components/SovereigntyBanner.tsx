'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const SovereigntyBanner: React.FC = () => {
  return (
    <aside
      aria-label="Thông tin đề tài nghiên cứu khoa học kỹ thuật"
      className="w-full bg-slate-900/95 border-b border-amber-500/30 text-amber-300 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
          ĐỀ TÀI NGHIÊN CỨU KHOA HỌC KỸ THUẬT
        </span>
        <span className="text-xs text-slate-300">
          Nhóm thực hiện: Lê Trần Bảo Trân (10a1) - Lê Phương Trang (10a3) TRƯỜNG THPT EA SÚP
        </span>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-slate-300">
        <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Hệ Thống Trực Chiến 24/7</span>
        </span>
      </div>
    </aside>
  );
};
