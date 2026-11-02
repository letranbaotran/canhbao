'use client';

import React, { useState } from 'react';
import { SovereigntyBanner } from './SovereigntyBanner';
import { WebGISMap } from './WebGISMap';
import { ArticleAudioPlayer } from './ArticleAudioPlayer';
import { EASUP_VILLAGES, NEIGHBOR_COMMUNES } from '@/data/administrative_boundaries';
import {
  Flame,
  Droplets,
  AlertOctagon,
  ShieldAlert,
  Radio,
  Bell,
  RefreshCw,
  Send,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

export const CommandCenterDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'MAP' | 'ALERTS' | 'SIMULATION'>('MAP');
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);

  // Mẫu bản tin phát thanh khẩn cấp AI An Nhiên
  const sampleBulletin = {
    id: 'EASUP-ALERT-2026-001',
    title: 'Bản tin Cảnh báo Cấp độ 2 Mực nước Hồ Ea Súp Thượng và An toàn Hồ cá Thôn Đoàn Kết',
    content:
      'Ủy ban nhân dân và Ban Chỉ huy Phòng chống thiên tai và Tìm kiếm cứu nạn xã Ea Súp thông báo: Mực nước Hồ Ea Súp Thượng đang dâng nhanh đạt cao trình 208.6 mét. Đề nghị nhân dân Thôn 1, Thôn 2, Thôn 8 và đặc biệt các hộ nuôi trồng thủy sản tại Thôn Đoàn Kết chủ động gia cố bờ bao, theo dõi sát diễn biến.',
    audioUrl: '/storage/tts/sample_annhien_alert.mp3',
    voiceLabel: 'An Nhiên',
  };

  const handleSimulate = (scenario: string) => {
    setSimulationStatus(`Đang kích hoạt kịch bản diễn tập: ${scenario}...`);
    setTimeout(() => {
      setSimulationStatus(`Kịch bản "${scenario}" đã kích hoạt thành công! Cảnh báo đỏ đẩy tới hệ thống.`);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-clip selection:bg-emerald-500 selection:text-white">
      {/* 1. Mốc Khẳng định Chủ quyền Quốc gia & Hoàng Sa, Trường Sa */}
      <SovereigntyBanner />

      {/* 2. Header Trung tâm Chỉ huy Điều hành PCTT Xã Ea Súp */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                Chính Quyền 2 Cấp
              </span>
              <span className="text-xs text-slate-400 font-mono">
                UBND & UBMTTQ VN XÃ EA SÚP • TỈNH ĐẮK LẮK
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white mt-1">
              TRUNG TÂM ĐIỀU HÀNH CẢNH BÁO SỚM THIÊN TAI & GIÁM SÁT RỪNG
            </h1>
            <p className="text-xs text-slate-400">
              Hệ thống tích hợp ảnh vệ tinh NASA FIRMS/GIBS & Mạng cảm biến IoT thủy văn, lâm nghiệp | canhbao.easupso.com
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <Flame className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-slate-400">Điểm nhiệt NASA</div>
                <div className="font-bold text-amber-300">01 (Tiểu khu 293)</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <Droplets className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-[10px] text-slate-400">Hồ Ea Súp Thượng</div>
                <div className="font-bold text-blue-300">206.8m (An toàn)</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <div>
                <div className="text-[10px] text-rose-300">Hồ Ea Súp Hạ</div>
                <div className="font-bold text-rose-200">CẤM NUÔI CÁ (Nghiêm ngặt)</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Main Dashboard Bento Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: WebGIS Map (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <WebGISMap />

          {/* AI Voice Article Audio Player (Báo Tiền Phong Standard) */}
          <section
            aria-label="Loa truyền thanh thông minh"
            className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Cụm Loa Truyền Thanh Số AI - Giọng Đọc An Nhiên
              </h2>
              <span className="text-[11px] font-mono text-slate-400">Tự động phát thanh đa kênh</span>
            </div>
            <ArticleAudioPlayer
              bulletinId={sampleBulletin.id}
              title={sampleBulletin.title}
              audioUrl={sampleBulletin.audioUrl}
              voiceLabel={sampleBulletin.voiceLabel}
            />
            <p className="text-[11px] text-slate-400 mt-1 italic">
              {sampleBulletin.content}
            </p>
          </section>

          {/* 20 Thôn Buôn Matrix Quick Overview */}
          <section
            aria-label="Danh sách 20 thôn buôn"
            className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md"
          >
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Trạng Thái An Ninh Thiên Tai 20 Thôn, Buôn Xã Ea Súp</span>
              <span className="text-[10px] font-mono text-emerald-400 font-normal">20/20 Trạm kết nối</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1.5 text-xs">
              {EASUP_VILLAGES.map((v) => (
                <div
                  key={v}
                  className={`p-1.5 rounded border text-center font-mono text-[11px] transition-colors ${
                    v === 'Thôn Đoàn Kết'
                      ? 'bg-cyan-950/60 border-cyan-700 text-cyan-200'
                      : v.startsWith('Buôn')
                      ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="font-semibold">{v}</div>
                  <div className="text-[9px] text-emerald-400">● Ổn định</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Alert Center & Command Telemetry (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Disaster Simulation Control */}
          <section
            aria-label="Diễn tập tình huống"
            className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md"
          >
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Diễn Tập Tình Huống PCTT Khẩn Cấp
            </h3>
            <p className="text-[11px] text-slate-400 mb-2">
              Kích hoạt giả lập dữ liệu cảm biến để kiểm thử phản ứng nhanh của 20 thôn buôn:
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => handleSimulate('CHÁY RỪNG TIỂU KHU 293 (NHIỆT ĐỘ 52°C, KHÓI)')}
                className="w-full text-left px-2.5 py-1.5 rounded bg-slate-800 hover:bg-rose-900/60 active:bg-rose-800 border border-slate-700 hover:border-rose-500 text-xs text-rose-300 transition-colors"
              >
                🔥 Diễn tập: Báo cháy khẩn cấp Tiểu khu 293
              </button>
              <button
                onClick={() => handleSimulate('HỒ EA SÚP THƯỢNG XẢ LŨ TRÀN TỰ DO > 210M')}
                className="w-full text-left px-2.5 py-1.5 rounded bg-slate-800 hover:bg-blue-900/60 active:bg-blue-800 border border-slate-700 hover:border-blue-500 text-xs text-blue-300 transition-colors"
              >
                🌊 Diễn tập: Xả lũ Hồ Ea Súp Thượng đe dọa Hồ Trung Chuyển
              </button>
              <button
                onClick={() => handleSimulate('CẢNH BÁO VI PHẠM CẤM NUÔI CÁ TẠI HỒ EA SÚP HẠ')}
                className="w-full text-left px-2.5 py-1.5 rounded bg-slate-800 hover:bg-amber-900/60 active:bg-amber-800 border border-slate-700 hover:border-amber-500 text-xs text-amber-300 transition-colors"
              >
                🚫 Diễn tập: Phát hiện vi phạm nuôi cá lồng bè Hồ Hạ
              </button>
            </div>
            {simulationStatus && (
              <div className="mt-2 p-2 rounded bg-slate-800/90 border border-emerald-500/50 text-[11px] text-emerald-300 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{simulationStatus}</span>
              </div>
            )}
          </section>

          {/* Telemetry Live Feed */}
          <section
            aria-label="Chuỗi số liệu quan trắc"
            className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md flex-1"
          >
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Chuỗi Số Liệu Quan Trắc Trực Chiến</span>
              <span className="text-[10px] text-emerald-400 font-mono animate-pulse">● LIVE</span>
            </h3>

            <div className="space-y-2 text-xs font-mono">
              {/* TK 293 */}
              <div className="p-2 rounded bg-slate-800/80 border border-slate-700">
                <div className="flex justify-between font-semibold text-emerald-400">
                  <span>Trạm Lâm Nghiệp TK-293</span>
                  <span className="text-slate-400">LoRaWAN</span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                  <div>Nhiệt độ: <strong className="text-white">32.4°C</strong></div>
                  <div>Độ ẩm: <strong className="text-white">58%</strong></div>
                  <div>Khói CO: <strong className="text-white">12 ppm</strong></div>
                  <div>Gió: <strong className="text-white">2.8 m/s</strong></div>
                </div>
              </div>

              {/* Hồ Thượng */}
              <div className="p-2 rounded bg-slate-800/80 border border-slate-700">
                <div className="flex justify-between font-semibold text-blue-400">
                  <span>Trạm Thủy Văn Hồ Thượng</span>
                  <span className="text-slate-400">Radar Siêu Âm</span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                  <div>Cao trình: <strong className="text-white">206.8 m</strong></div>
                  <div>Lưu lượng xả: <strong className="text-white">0 m³/s</strong></div>
                  <div>Dung tích: <strong className="text-white">118M m³</strong></div>
                  <div>Tốc độ dâng: <strong className="text-emerald-400">+2 cm/h</strong></div>
                </div>
              </div>

              {/* Hồ Hạ */}
              <div className="p-2 rounded bg-rose-950/40 border border-rose-800">
                <div className="flex justify-between font-semibold text-rose-300">
                  <span>Hồ Ea Súp Hạ (Cấp Nước)</span>
                  <span className="text-rose-400 font-bold">CẤM NUÔI CÁ</span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                  <div>Trạng thái: <strong className="text-emerald-400">An toàn</strong></div>
                  <div>Độ đục: <strong className="text-white">4.2 NTU</strong></div>
                  <div>Lồng bè vi phạm: <strong className="text-emerald-400">0</strong></div>
                  <div>Mực nước: <strong className="text-white">82% dung tích</strong></div>
                </div>
              </div>

              {/* Hồ Trung Chuyển */}
              <div className="p-2 rounded bg-slate-800/80 border border-slate-700">
                <div className="flex justify-between font-semibold text-cyan-400">
                  <span>Hồ Trung Chuyển</span>
                  <span className="text-slate-400">IoT Thủy Sản</span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                  <div>Oxy hòa tan DO: <strong className="text-white">6.8 mg/L</strong></div>
                  <div>Độ pH: <strong className="text-white">7.4</strong></div>
                  <div>Nguy cơ ngập tràn: <strong className="text-emerald-400">Thấp</strong></div>
                  <div>Bờ bao: <strong className="text-white">Ổn định</strong></div>
                </div>
              </div>
            </div>
          </section>

          {/* Vùng Liên Xã Giáp Ranh */}
          <section
            aria-label="Vùng liên xã giáp ranh"
            className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md text-xs"
          >
            <h3 className="font-bold text-amber-400 uppercase tracking-wider mb-1.5">
              Vùng Đệm Liên Xã Biên Giới (Bán kính 5km)
            </h3>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
              {NEIGHBOR_COMMUNES.map((nc) => (
                <span
                  key={nc}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300"
                >
                  {nc}
                </span>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* 4. Footer Thông Tin Công Vụ */}
      <footer className="bg-slate-900 border-t border-slate-800 py-3 px-4 text-center text-xs text-slate-500 font-mono">
        <p>
          Hệ sinh thái Chuyển đổi số Xã Ea Súp, Tỉnh Đắk Lắk • Ban Chỉ huy Phòng chống thiên tai & Tìm kiếm cứu nạn xã Ea Súp
        </p>
        <p className="mt-0.5 text-[11px] text-slate-600">
          Cổng thông tin tích hợp viễn thám NASA & Trạm quan trắc IoT • Bản đồ số chủ quyền quốc gia Việt Nam
        </p>
      </footer>
    </div>
  );
};
