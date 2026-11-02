'use client';

import React from 'react';
import { ShieldCheck, Flag } from 'lucide-react';

export const SovereigntyBanner: React.FC = () => {
  return (
    <aside
      aria-label="Khẳng định chủ quyền quốc gia"
      className="w-full bg-slate-900/95 border-b border-amber-600/40 text-amber-300 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <Flag className="w-3.5 h-3.5 text-red-500" />
        <span className="font-semibold text-white tracking-wide">
          BẢN ĐỒ CHỦ QUYỀN QUỐC GIA VIỆT NAM
        </span>
        <span className="hidden sm:inline text-slate-400">|</span>
        <span className="hidden sm:inline text-amber-200">
          Xã Ea Súp - Điểm tựa biên giới Tây Nguyên
        </span>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-slate-300">
        <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Quần đảo Hoàng Sa (Việt Nam)</span>
        </span>
        <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Quần đảo Trường Sa (Việt Nam)</span>
        </span>
      </div>
    </aside>
  );
};
