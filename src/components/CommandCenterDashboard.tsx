'use client';

import React, { useState, useEffect } from 'react';
import { SovereigntyBanner } from './SovereigntyBanner';
import { WebGISMap } from './WebGISMap';
import { ArticleAudioPlayer } from './ArticleAudioPlayer';
import { IoTSimulatorTab, DEFAULT_IOT_DATA, IoTTelemetryData } from './IoTSimulatorTab';
import { EASUP_VILLAGES, NEIGHBOR_COMMUNES } from '@/data/administrative_boundaries';
import { alarmSystem } from '@/utils/alarmSound';
import { realtimeSync } from '@/services/realtimeSyncService';
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
  Cpu,
  Activity,
  Wifi,
} from 'lucide-react';

export const CommandCenterDashboard: React.FC = () => {
  const [telemetryTab, setTelemetryTab] = useState<'LIVE' | 'SIMULATOR'>('LIVE');
  const [iotData, setIotData] = useState<IoTTelemetryData>(DEFAULT_IOT_DATA);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [networkSyncMsg, setNetworkSyncMsg] = useState<string | null>(null);
  const [mqttStatus, setMqttStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Lắng nghe tín hiệu đồng bộ từ các máy khác qua MQTT Broker / BroadcastChannel
  useEffect(() => {
    const unsubscribeSync = realtimeSync.onSync((msg) => {
      setIotData(msg.data);
      const timeStr = new Date(msg.timestamp).toLocaleTimeString('vi-VN');
      setNetworkSyncMsg(`📡 Nhận tín hiệu đồng bộ từ thiết bị khác lúc ${timeStr}: Số liệu & cảnh báo đã đồng loạt cập nhật!`);
      setTimeout(() => setNetworkSyncMsg(null), 5000);
    });

    const unsubscribeStatus = realtimeSync.onStatus((status) => {
      setMqttStatus(status);
    });

    return () => {
      unsubscribeSync();
      unsubscribeStatus();
    };
  }, []);

  // Tính toán điều kiện chuyển sang màu đỏ (Báo động đỏ)
  const isTk293Red = iotData.tk293.temperature > 45 || iotData.tk293.smokeCo > 50;
  const isHoThuongRed = iotData.hoThuong.elevation >= 210 || iotData.hoThuong.riseRate > 30;
  const isHoHaRed = iotData.hoHa.illegalCages > 0;
  const isHoTrungChuyenRed =
    iotData.hoTrungChuyen.dissolvedOxygen < 4.0 ||
    iotData.hoTrungChuyen.overflowRisk === 'Cao' ||
    iotData.hoTrungChuyen.dykeStatus === 'Tràn bờ';

  const isAnyRedAlert = isTk293Red || isHoThuongRed || isHoHaRed || isHoTrungChuyenRed;

  // Tự động kích hoạt còi hú báo động âm thanh khi chuyển sang màu đỏ
  useEffect(() => {
    if (isAnyRedAlert) {
      alarmSystem.play();
    } else {
      alarmSystem.stop();
    }

    return () => {
      alarmSystem.stop();
    };
  }, [isAnyRedAlert]);

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
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">
              TRUNG TÂM ĐIỀU HÀNH CẢNH BÁO SỚM THIÊN TAI & GIÁM SÁT RỪNG
            </h1>
            <p className="text-xs text-slate-400">
              Hệ thống tích hợp ảnh vệ tinh NASA FIRMS/GIBS & Mạng cảm biến IoT thủy văn, lâm nghiệp
            </p>
          </div>

          {/* Quick Metrics Bar: Phản ánh trực tiếp số liệu thời gian thực, nhấp nháy đỏ & còi hú */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {/* 1. Trạm TK-293 */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                isTk293Red
                  ? 'emergency-flash text-rose-200'
                  : 'bg-slate-800/80 border-slate-700'
              }`}
            >
              <Flame className={`w-4 h-4 ${isTk293Red ? 'text-rose-400 siren-wobble' : 'text-amber-400'}`} />
              <div>
                <div className="text-[10px] text-slate-400">Trạm TK-293 (Lâm Nghiệp)</div>
                <div className={`font-bold ${isTk293Red ? 'text-white' : 'text-amber-300'}`}>
                  {iotData.tk293.temperature}°C {isTk293Red ? '🚨 BÁO ĐỘNG CHÁY!' : '(Ổn định)'}
                </div>
              </div>
            </div>

            {/* 2. Trạm Hồ Thượng */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                isHoThuongRed
                  ? 'emergency-flash text-rose-200'
                  : iotData.hoThuong.elevation >= 208.5
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700'
              }`}
            >
              <Droplets className={`w-4 h-4 ${isHoThuongRed ? 'text-rose-400 siren-wobble' : 'text-blue-400'}`} />
              <div>
                <div className="text-[10px] text-slate-400">Hồ Ea Súp Thượng</div>
                <div className={`font-bold ${isHoThuongRed ? 'text-white' : 'text-blue-300'}`}>
                  {iotData.hoThuong.elevation}m ({isHoThuongRed ? '🌊 XẢ LŨ CẤP III' : iotData.hoThuong.elevation >= 208.5 ? 'Báo động II' : 'An toàn'})
                </div>
              </div>
            </div>

            {/* 3. Trạm Hồ Hạ */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                isHoHaRed
                  ? 'emergency-flash text-rose-200'
                  : 'bg-emerald-950/60 border-emerald-800'
              }`}
            >
              <ShieldAlert className={`w-4 h-4 ${isHoHaRed ? 'text-rose-400 siren-wobble' : 'text-emerald-400'}`} />
              <div>
                <div className="text-[10px] text-emerald-300">Hồ Ea Súp Hạ</div>
                <div className={`font-bold ${isHoHaRed ? 'text-white' : 'text-emerald-200'}`}>
                  {isHoHaRed ? `⛔ CÓ ${iotData.hoHa.illegalCages} LỒNG BÈ VI PHẠM!` : 'Nguồn nước sinh hoạt (Bảo vệ)'}
                </div>
              </div>
            </div>

            {/* 4. Chỉ báo mạng đồng bộ trực tuyến WSS */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300">
              <span className={`inline-block w-2 h-2 rounded-full ${mqttStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
              <span>{mqttStatus === 'connected' ? 'Đồng bộ đa thiết bị' : 'Đang kết nối...'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2.1 Thông báo nhận tín hiệu đồng bộ khẩn cấp từ thiết bị khác */}
      {networkSyncMsg && (
        <div className="bg-emerald-950/95 border-b border-emerald-500/60 text-emerald-300 px-4 py-2 text-xs font-mono flex items-center justify-between shadow-2xl animate-pulse">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="font-bold">{networkSyncMsg}</span>
          </div>
          <span className="text-[10px] text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700">MQTT WSS Đồng Bộ Thời Gian Thực</span>
        </div>
      )}

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
          {/* TAB CHUYỂN MẠCH: TRỰC CHIẾN LIVE <-> TAB ẨN MÔ PHỎNG IoT */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
            <button
              onClick={() => setTelemetryTab('LIVE')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 ${
                telemetryTab === 'LIVE'
                  ? 'bg-emerald-600 text-slate-950 shadow-md ring-1 ring-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>SỐ LIỆU TRỰC CHIẾN</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 font-normal">LIVE</span>
            </button>

            <button
              onClick={() => setTelemetryTab('SIMULATOR')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 ${
                telemetryTab === 'SIMULATOR'
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-300'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>TAB MÔ PHỎNG IoT</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950/80 text-amber-300 font-normal">LAB</span>
            </button>
          </div>

          {/* NỘI DUNG 1: CHUỖI SỐ LIỆU QUAN TRẮC TRỰC CHIẾN (KHỚP 100% GIAO DIỆN HÌNH ẢNH) */}
          {telemetryTab === 'LIVE' && (
            <section
              aria-label="Chuỗi số liệu quan trắc trực chiến"
              className="bg-[#0b1220] border border-slate-800 rounded-xl p-3.5 shadow-2xl flex-1 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    CHUỖI SỐ LIỆU QUAN TRẮC TRỰC CHIẾN
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1 animate-pulse">
                    ● LIVE
                  </span>
                </div>

                <div className="space-y-2.5 text-xs font-mono">
                  {/* Trạm Lâm Nghiệp TK-293 */}
                  <div
                    className={`p-2.5 rounded-lg border transition-all ${
                      isTk293Red
                        ? 'emergency-flash text-rose-200'
                        : 'bg-slate-800/60 border-slate-700/80'
                    }`}
                  >
                    <div className="flex justify-between font-semibold text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <Flame className={`w-3.5 h-3.5 ${isTk293Red ? 'text-rose-400 siren-wobble' : 'text-amber-400'}`} />
                        Trạm Lâm Nghiệp TK-293
                      </span>
                      <span className="text-slate-400 font-normal">LoRaWAN</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                      <div>
                        Nhiệt độ:{' '}
                        <strong className={isTk293Red ? 'text-white font-black' : 'text-white'}>
                          {iotData.tk293.temperature}°C
                        </strong>
                      </div>
                      <div>
                        Độ ẩm: <strong className="text-white">{iotData.tk293.humidity}%</strong>
                      </div>
                      <div>
                        Khói CO:{' '}
                        <strong className={isTk293Red ? 'text-white font-black' : 'text-white'}>
                          {iotData.tk293.smokeCo} ppm
                        </strong>
                      </div>
                      <div>
                        Gió: <strong className="text-white">{iotData.tk293.windSpeed} m/s</strong>
                      </div>
                    </div>
                  </div>

                  {/* Trạm Thủy Văn Hồ Thượng */}
                  <div
                    className={`p-2.5 rounded-lg border transition-all ${
                      isHoThuongRed
                        ? 'emergency-flash text-rose-200'
                        : 'bg-slate-800/60 border-slate-700/80'
                    }`}
                  >
                    <div className="flex justify-between font-semibold text-blue-400">
                      <span className="flex items-center gap-1.5">
                        <Droplets className={`w-3.5 h-3.5 ${isHoThuongRed ? 'text-rose-400 siren-wobble' : 'text-blue-400'}`} />
                        Trạm Thủy Văn Hồ Thượng
                      </span>
                      <span className="text-slate-400 font-normal">Radar Siêu Âm</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                      <div>
                        Cao trình:{' '}
                        <strong className={isHoThuongRed ? 'text-white font-black' : 'text-white'}>
                          {iotData.hoThuong.elevation} m
                        </strong>
                      </div>
                      <div>
                        Lưu lượng xả: <strong className="text-white">{iotData.hoThuong.discharge} m³/s</strong>
                      </div>
                      <div>
                        Dung tích: <strong className="text-white">{iotData.hoThuong.capacity}M m³</strong>
                      </div>
                      <div>
                        Tốc độ dâng:{' '}
                        <strong className={isHoThuongRed ? 'text-white font-bold' : 'text-emerald-400'}>
                          {iotData.hoThuong.riseRate > 0 ? `+${iotData.hoThuong.riseRate}` : iotData.hoThuong.riseRate} cm/h
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Hồ Ea Súp Hạ (Cấp Nước) */}
                  <div
                    className={`p-2.5 rounded-lg border transition-all ${
                      isHoHaRed
                        ? 'emergency-flash text-rose-200'
                        : 'bg-emerald-950/40 border-emerald-800/80'
                    }`}
                  >
                    <div className="flex justify-between font-semibold text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className={`w-3.5 h-3.5 ${isHoHaRed ? 'text-rose-400 siren-wobble' : 'text-emerald-400'}`} />
                        Hồ Ea Súp Hạ (Cấp Nước)
                      </span>
                      <span className="text-emerald-400 font-bold">Nguồn sinh hoạt</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                      <div>
                        Trạng thái:{' '}
                        <strong className={isHoHaRed ? 'text-white font-bold' : 'text-emerald-400'}>
                          {iotData.hoHa.status}
                        </strong>
                      </div>
                      <div>
                        Độ đục:{' '}
                        <strong className={iotData.hoHa.turbidity > 5 ? 'text-amber-300' : 'text-white'}>
                          {iotData.hoHa.turbidity} NTU
                        </strong>
                      </div>
                      <div>
                        Lồng bè vi phạm:{' '}
                        <strong className={isHoHaRed ? 'text-white font-black' : 'text-emerald-400'}>
                          {iotData.hoHa.illegalCages}
                        </strong>
                      </div>
                      <div>
                        Mực nước: <strong className="text-white">{iotData.hoHa.capacityPct}% dung tích</strong>
                      </div>
                    </div>
                  </div>

                  {/* Hồ Trung Chuyển */}
                  <div
                    className={`p-2.5 rounded-lg border transition-all ${
                      isHoTrungChuyenRed
                        ? 'emergency-flash text-rose-200'
                        : 'bg-slate-800/60 border-slate-700/80'
                    }`}
                  >
                    <div className="flex justify-between font-semibold text-cyan-400">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        Hồ Trung Chuyển
                      </span>
                      <span className="text-slate-400 font-normal">IoT Thủy Sản</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                      <div>
                        Oxy hòa tan DO:{' '}
                        <strong className={iotData.hoTrungChuyen.dissolvedOxygen < 4.0 ? 'text-rose-400 font-black' : 'text-white'}>
                          {iotData.hoTrungChuyen.dissolvedOxygen} mg/L
                        </strong>
                      </div>
                      <div>
                        Độ pH: <strong className="text-white">{iotData.hoTrungChuyen.ph}</strong>
                      </div>
                      <div>
                        Nguy cơ ngập tràn:{' '}
                        <strong className={iotData.hoTrungChuyen.overflowRisk === 'Cao' ? 'text-rose-400' : 'text-emerald-400'}>
                          {iotData.hoTrungChuyen.overflowRisk}
                        </strong>
                      </div>
                      <div>
                        Bờ bao: <strong className="text-white">{iotData.hoTrungChuyen.dykeStatus}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Mô hình chính quyền 2 cấp xã Ea Súp</span>
                <button
                  onClick={() => setTelemetryTab('SIMULATOR')}
                  className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
                >
                  <Sliders className="w-3 h-3 text-amber-400" />
                  Mở Tab Mô Phỏng Kiểm Chứng
                </button>
              </div>
            </section>
          )}

          {/* NỘI DUNG 2: TAB ẨN MÔ PHỎNG IoT VỚI CHỈ SỐ ĐO LƯỜNG THỰC TẾ */}
          {telemetryTab === 'SIMULATOR' && (
            <div className="flex-1">
              <IoTSimulatorTab
                currentData={iotData}
                onUpdateData={setIotData}
                isOpen={true}
                onToggle={() => setTelemetryTab('LIVE')}
              />
            </div>
          )}

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

      {/* 4. Footer Thông Tin Đề Tài */}
      <footer className="bg-slate-900 border-t border-slate-800 py-3 px-4 text-center text-xs text-slate-500 font-mono">
        <p>
          ĐỀ TÀI NGHIÊN CỨU KHOA HỌC KỸ THUẬT • TRƯỜNG THPT EA SÚP, TỈNH ĐẮK LẮK
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Nhóm thực hiện: Lê Trần Bảo Trân (10a1) - Lê Phương Trang (10a3) TRƯỜNG THPT EA SÚP
        </p>
      </footer>
    </div>
  );
};
