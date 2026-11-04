'use client';

import React, { useState, useEffect } from 'react';
import { SovereigntyBanner } from './SovereigntyBanner';
import { WebGISMap } from './WebGISMap';
import { ArticleAudioPlayer } from './ArticleAudioPlayer';
import { IoTSimulatorTab } from './IoTSimulatorTab';
import { EASUP_VILLAGES } from '@/data/administrative_boundaries';
import {
  VILLAGE_DISASTER_PROFILES,
  getVillageScenarioImpact,
  CommunityDisasterReport,
} from '@/data/village_disaster_profiles';
import { alarmSystem } from '@/utils/alarmSound';
import { realtimeSync } from '@/services/realtimeSyncService';
import { useTelemetryStore } from '@/services/telemetryStore';
import {
  Flame,
  Droplets,
  ShieldAlert,
  Radio,
  Cpu,
  Activity,
  Info,
  ShieldCheck,
  Satellite,
  Waves,
  X,
  Volume2,
  MapPin,
  Users,
  Mountain,
  Camera,
  Send,
  Crosshair,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export const CommandCenterDashboard: React.FC = () => {
  const [telemetryTab, setTelemetryTab] = useState<'LIVE' | 'SIMULATOR'>('LIVE');
  const {
    iotData,
    setIotData,
    updateHoThuongElevation,
    triggerVillageBroadcast,
    bulletin,
    hydraulicModel,
    dominoAutoPlayTs,
  } = useTelemetryStore();
  const [showScientificModal, setShowScientificModal] = useState<boolean>(false);
  const [selectedVillage, setSelectedVillage] = useState<string>('Thôn Đoàn Kết');
  const [villageBroadcastToast, setVillageBroadcastToast] = useState<string | null>(null);

  // State cho tính năng Báo tin thiên tai cộng đồng (Gửi ảnh & GPS)
  const [showCommunityReportModal, setShowCommunityReportModal] = useState<boolean>(false);
  const [reportVillage, setReportVillage] = useState<string>('Thôn Đoàn Kết');
  const [reportType, setReportType] = useState<CommunityDisasterReport['incidentType']>('FLOOD');
  const [reportSender, setReportSender] = useState<string>('Tổ xung kích PCTT Thôn Đoàn Kết');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [reportLat, setReportLat] = useState<number>(13.0693);
  const [reportLng, setReportLng] = useState<number>(107.8815);
  const [reportImagePreview, setReportImagePreview] = useState<string | null>(null);
  const [isGettingReportGps, setIsGettingReportGps] = useState<boolean>(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);
  const [communityReports, setCommunityReports] = useState<CommunityDisasterReport[]>([
    {
      id: 'SOS-EASUP-01',
      villageName: 'Thôn Đoàn Kết',
      incidentType: 'FLOOD',
      incidentLabel: 'Ngập lụt / Nước dâng',
      description:
        'Tổ xung kích PCTT Thôn Đoàn Kết báo cáo: Mực nước khu vực trũng ven Hồ Trung Chuyển có dấu hiệu dâng nhanh, đã cử lực lượng cắm biển cảnh báo.',
      senderName: 'Tổ xung kích PCTT Thôn Đoàn Kết',
      lat: 13.069298,
      lng: 107.881527,
      timestamp: 'Trực chiến hôm nay',
    },
  ]);

  const activeVillageImpact = getVillageScenarioImpact(selectedVillage, hydraulicModel);

  const handleTriggerVillageSpeaker = (villageName: string) => {
    triggerVillageBroadcast(villageName);
    setVillageBroadcastToast(
      `🔊 Đã kích hoạt phát loa cảnh báo riêng cho ${villageName} trên Cụm Loa Truyền Thanh Số!`
    );
    setTimeout(() => setVillageBroadcastToast(null), 5000);
    const audioEl = document.getElementById('audio-alert-section');
    if (audioEl && typeof audioEl.scrollIntoView === 'function') {
      audioEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleGetReportGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setReportLat(13.069298);
      setReportLng(107.881527);
      return;
    }
    setIsGettingReportGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingReportGps(false);
        setReportLat(Number(pos.coords.latitude.toFixed(6)));
        setReportLng(Number(pos.coords.longitude.toFixed(6)));
      },
      () => {
        setIsGettingReportGps(false);
        setReportLat(13.069298);
        setReportLng(107.881527);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleReportImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReportImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitCommunityReport = (e: React.FormEvent) => {
    e.preventDefault();
    const typeLabels: Record<CommunityDisasterReport['incidentType'], string> = {
      FLOOD: '🌊 Ngập lụt / Nước dâng',
      LANDSLIDE: '⛰️ Sạt lở bờ suối / Kênh',
      FOREST_FIRE: '🔥 Khói cháy rừng',
      CAGE_VIOLATION: '⛔ Lồng bè xâm phạm Hồ Hạ',
    };
    const newReport: CommunityDisasterReport = {
      id: `SOS-${Date.now().toString().slice(-5)}`,
      villageName: reportVillage,
      incidentType: reportType,
      incidentLabel: typeLabels[reportType],
      description:
        reportDesc.trim() ||
        `Báo cáo nhanh hiện trường ${typeLabels[reportType]} tại ${reportVillage} gửi về Trung tâm điều hành xã Ea Súp.`,
      senderName: reportSender.trim() || `Tổ xung kích PCTT ${reportVillage}`,
      lat: reportLat,
      lng: reportLng,
      imageUrl: reportImagePreview || undefined,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setCommunityReports((prev) => [newReport, ...prev]);
    setSelectedVillage(reportVillage);
    triggerVillageBroadcast(
      reportVillage,
      `Trung tâm điều hành vừa tiếp nhận tin báo hiện trường "${newReport.incidentLabel}" tại tọa độ GPS (${newReport.lat}, ${newReport.lng}) do ${newReport.senderName} gửi về.`
    );
    setReportSuccessMsg(
      `✅ Đã gửi báo cáo hiện trường (${newReport.incidentLabel}) kèm tọa độ GPS về Trung tâm Chỉ huy & phát loa cảnh báo tại ${reportVillage}!`
    );
    setReportDesc('');
    setReportImagePreview(null);
    setTimeout(() => {
      setReportSuccessMsg(null);
      setShowCommunityReportModal(false);
    }, 2200);
  };
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
  }, [setIotData]);

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

  return (
    <div className="min-h-screen bg-[#F0F5FC] text-slate-900 flex flex-col font-sans overflow-x-clip selection:bg-[#0A4393] selection:text-white">
      {/* 1. Mốc Khẳng định Chủ quyền Quốc gia & Hoàng Sa, Trường Sa */}
      <SovereigntyBanner />

      {/* 2. Thanh Chỉ số Giám sát Trọng điểm Thời gian thực */}
      <header className="bg-white border-b border-[#0A4393]/20 px-4 py-2.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-start gap-2.5 text-xs font-mono">
          {/* 1. Trạm TK-293 */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              isTk293Red
                ? 'emergency-flash text-white'
                : 'bg-[#F0F6FF] border-[#0A4393]/25'
            }`}
          >
            <Flame className={`w-4 h-4 ${isTk293Red ? 'text-white siren-wobble' : 'text-[#0A4393]'}`} />
            <div>
              <div className={`text-[10px] ${isTk293Red ? 'text-rose-100' : 'text-slate-600'}`}>Trạm TK-293 (Lâm Nghiệp)</div>
              <div className={`font-bold ${isTk293Red ? 'text-white' : 'text-[#0A4393]'}`}>
                {iotData.tk293.temperature}°C {isTk293Red ? '🚨 BÁO ĐỘNG CHÁY!' : '(Ổn định)'}
              </div>
            </div>
          </div>

          {/* 2. Trạm Hồ Thượng */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              isHoThuongRed
                ? 'emergency-flash text-white'
                : iotData.hoThuong.elevation >= 208.5
                ? 'bg-amber-50 border-amber-500 text-amber-800'
                : 'bg-[#F0F6FF] border-[#0A4393]/25'
            }`}
          >
            <Droplets className={`w-4 h-4 ${isHoThuongRed ? 'text-white siren-wobble' : 'text-[#0A4393]'}`} />
            <div>
              <div className={`text-[10px] ${isHoThuongRed ? 'text-rose-100' : 'text-slate-600'}`}>Hồ Ea Súp Thượng</div>
              <div className={`font-bold ${isHoThuongRed ? 'text-white' : 'text-[#0A4393]'}`}>
                {iotData.hoThuong.elevation}m ({isHoThuongRed ? '🌊 XẢ LŨ CẤP III' : iotData.hoThuong.elevation >= 208.5 ? 'Báo động II' : 'An toàn'})
              </div>
            </div>
          </div>

          {/* 3. Trạm Hồ Hạ */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              isHoHaRed
                ? 'emergency-flash text-white'
                : 'bg-[#F0F6FF] border-[#0A4393]/25'
            }`}
          >
            <ShieldAlert className={`w-4 h-4 ${isHoHaRed ? 'text-white siren-wobble' : 'text-[#0A4393]'}`} />
            <div>
              <div className={`text-[10px] ${isHoHaRed ? 'text-rose-100' : 'text-slate-600'}`}>Hồ Ea Súp Hạ</div>
              <div className={`font-bold ${isHoHaRed ? 'text-white' : 'text-[#0A4393]'}`}>
                {isHoHaRed ? `⛔ CÓ ${iotData.hoHa.illegalCages} LỒNG BÈ VI PHẠM!` : 'Nguồn nước sinh hoạt (Bảo vệ)'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2.1 Thông báo nhận tín hiệu đồng bộ khẩn cấp từ thiết bị khác */}
      {networkSyncMsg && (
        <div className="bg-[#0A4393] border-b border-white/30 text-white px-4 py-2 text-xs font-mono flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-white animate-spin" />
            <span className="font-bold">{networkSyncMsg}</span>
          </div>
          <span className="text-[10px] text-[#0A4393] bg-white px-2 py-0.5 rounded font-bold">MQTT WSS Đồng Bộ Thời Gian Thực</span>
        </div>
      )}

      {/* 3. Main Dashboard Bento Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: WebGIS Map (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div id="gis-map-section">
            <WebGISMap />
          </div>

          {/* AI Voice Article Audio Player (Đồng bộ 100% với Global Store) */}
          <section
            id="audio-alert-section"
            aria-label="Loa truyền thanh thông minh"
            className="bg-white border border-[#0A4393]/25 rounded-xl p-3 shadow-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
              <h2 className="text-xs font-bold text-[#0A4393] uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#0A4393] animate-pulse" />
                Cụm Loa Truyền Thanh Số
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F0F6FF] text-[#0A4393] border border-[#0A4393]/30">
                  ⚡ Đồng bộ trực chiến: Hồ Thượng {iotData.hoThuong.elevation}m
                </span>
                <span className="text-[11px] font-mono text-slate-600 hidden sm:inline">Tự động phát thanh đa kênh</span>
              </div>
            </div>
            <ArticleAudioPlayer
              bulletinId={bulletin.id}
              title={bulletin.title}
              audioUrl={bulletin.audioUrl}
              voiceLabel={bulletin.voiceLabel}
              content={bulletin.content}
              autoPlayTrigger={dominoAutoPlayTs}
            />
          </section>

          {/* 20 Thôn Buôn Matrix Quick Overview + Card Chi Tiết Thôn/Buôn + Báo Tin Thiên Tai Cộng Đồng */}
          <section
            id="villages-matrix-section"
            aria-label="Danh sách 20 thôn buôn"
            className="bg-white border border-[#0A4393]/25 rounded-xl p-3 shadow-md space-y-3"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                <h3 className="text-xs font-bold text-[#0A4393] uppercase tracking-wider flex items-center gap-1.5">
                  <span>Trạng Thái An Ninh Thiên Tai 20 Thôn, Buôn Xã Ea Súp</span>
                </h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  {hydraulicModel.affectedVillages.length > 0 ? (
                    <span className="text-[10px] font-mono text-white bg-rose-600 px-2 py-0.5 rounded border border-rose-700 font-bold animate-pulse">
                      🚨 {hydraulicModel.affectedVillages.length}/20 Thôn bị ảnh hưởng ({hydraulicModel.code} • Ngập{' '}
                      {hydraulicModel.totalFloodedAreaHa.toLocaleString('en-US')} ha)
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-[#0A4393] bg-[#F0F6FF] px-2 py-0.5 rounded border border-[#0A4393]/25 font-semibold">
                      20/20 Trạm kết nối
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setReportVillage(selectedVillage);
                      setReportSender(`Tổ xung kích PCTT ${selectedVillage}`);
                      setShowCommunityReportModal(true);
                    }}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1 transition-all"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Báo tin thiên tai cộng đồng (Gửi ảnh & GPS)</span>
                  </button>
                </div>
              </div>
              <p className="text-[10px] font-mono text-slate-600">
                13 thôn số (Thôn 1 → Thôn 13) • 04 thôn tên (Thắng Lợi, Đoàn Kết, Hòa Bình, Bình Lợi) • 03 buôn (Buôn A, B, C) —{' '}
                <strong className="text-[#0A4393]">Bấm vào từng thôn/buôn để xem Card chi tiết & phát loa riêng</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1.5 text-xs">
              {EASUP_VILLAGES.map((v) => {
                const isCriticalFlood = hydraulicModel.criticalVillages.includes(v);
                const isAffectedFlood = hydraulicModel.affectedVillages.includes(v);
                const isSelected = selectedVillage === v;
                const vProfile = VILLAGE_DISASTER_PROFILES[v];

                let boxClass = 'bg-[#F4F8FD] border-[#0A4393]/20 text-slate-800 hover:bg-[#E6F0FA]';
                let statusText = '● Ổn định';
                let statusColor = 'text-[#0A4393]';

                if (isCriticalFlood) {
                  boxClass = 'bg-rose-600 border-rose-700 text-white shadow-md animate-pulse';
                  statusText = '🚨 Ngập sâu / Sơ tán';
                  statusColor = 'text-rose-100 font-bold';
                } else if (isAffectedFlood) {
                  boxClass = 'bg-amber-500 border-amber-600 text-white shadow-sm';
                  statusText = '⚠️ Cảnh báo ngập';
                  statusColor = 'text-amber-50 font-bold';
                } else if (v === 'Thôn Đoàn Kết') {
                  boxClass = 'bg-[#0A4393] border-[#0A4393] text-white';
                  statusColor = 'text-blue-100';
                } else if (v.startsWith('Buôn')) {
                  boxClass = 'bg-[#E6F0FA] border-[#0A4393]/40 text-[#0A4393] hover:bg-[#D6E6F8]';
                }

                const selectedRing = isSelected
                  ? 'ring-2 ring-offset-1 ring-[#0A4393] scale-[1.02] shadow-md'
                  : '';

                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSelectedVillage(v)}
                    className={`p-1.5 rounded border text-center font-mono text-[11px] transition-all duration-200 cursor-pointer ${boxClass} ${selectedRing}`}
                    title={`Xem hồ sơ thiên tai & điểm sơ tán của ${v}`}
                  >
                    <div className="font-semibold flex items-center justify-center gap-1">
                      <span>{v}</span>
                      {vProfile && (
                        <span className="text-[8px] opacity-80 font-normal">
                          (+{vProfile.avgElevationM}m)
                        </span>
                      )}
                    </div>
                    <div className={`text-[9px] font-semibold ${statusColor}`}>{statusText}</div>
                  </button>
                );
              })}
            </div>

            {/* CARD CHI TIẾT THÔN / BUÔN ĐANG CHỌN */}
            <div
              id="village-detail-card"
              className={`rounded-xl border-2 p-3 transition-all ${
                activeVillageImpact.statusLevel === 'CRITICAL'
                  ? 'bg-rose-50/90 border-rose-600 text-slate-900'
                  : activeVillageImpact.statusLevel === 'WARNING'
                  ? 'bg-amber-50/90 border-amber-500 text-slate-900'
                  : 'bg-[#F4F8FD] border-[#0A4393] text-slate-900'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2.5 border-b border-[#0A4393]/15">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#0A4393] text-white font-mono text-xs font-bold">
                    📍 {activeVillageImpact.profile.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      activeVillageImpact.statusLevel === 'CRITICAL'
                        ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                        : activeVillageImpact.statusLevel === 'WARNING'
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-emerald-600 text-white border-emerald-700'
                    }`}
                  >
                    {activeVillageImpact.statusLabel}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600">
                    ({activeVillageImpact.profile.leaderUnit})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTriggerVillageSpeaker(activeVillageImpact.profile.name)}
                    className="px-2.5 py-1 rounded-lg bg-[#0A4393] hover:bg-[#083576] text-white font-mono text-[11px] font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                    <span>Phát loa cảnh báo riêng cho thôn này</span>
                  </button>
                </div>
              </div>

              {villageBroadcastToast && (
                <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-[#0A4393] text-white text-[11px] font-mono font-bold flex items-center justify-between">
                  <span>{villageBroadcastToast}</span>
                  <span className="text-[9px] bg-white text-[#0A4393] px-1.5 py-0.5 rounded">Đang phát AI</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                {/* 1. Cao độ địa hình trung bình */}
                <div className="p-2.5 rounded-lg bg-white border border-[#0A4393]/20 shadow-2xs">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                    <Mountain className="w-3.5 h-3.5 text-[#0A4393]" />
                    <span>Cao độ địa hình trung bình</span>
                  </div>
                  <div className="text-sm font-black text-[#0A4393] mt-0.5">
                    +{activeVillageImpact.profile.avgElevationM}m{' '}
                    <span className="text-[10px] font-normal text-slate-600">(dải +172m → +185m)</span>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                    {activeVillageImpact.profile.terrainNote}
                  </div>
                </div>

                {/* 2. Dự báo số hộ bị ảnh hưởng theo kịch bản hiện tại */}
                <div className="p-2.5 rounded-lg bg-white border border-[#0A4393]/20 shadow-2xs">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                    <Users className="w-3.5 h-3.5 text-rose-600" />
                    <span>Dự báo hộ ảnh hưởng ({hydraulicModel.code})</span>
                  </div>
                  <div
                    className={`text-sm font-black mt-0.5 ${
                      activeVillageImpact.affectedHouseholds > 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {activeVillageImpact.affectedHouseholds} hộ{' '}
                    <span className="text-xs font-bold">
                      ({activeVillageImpact.affectedPeople} nhân khẩu)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                    Tổng quy mô: <strong>{activeVillageImpact.profile.totalHouseholds} hộ</strong> • Tham chiếu KB1.1 (P=1%):{' '}
                    <strong className="text-rose-700">{activeVillageImpact.referenceKb11Households} hộ</strong>
                  </div>
                </div>

                {/* 3. Điểm sơ tán an toàn gần nhất */}
                <div className="p-2.5 rounded-lg bg-white border border-[#0A4393]/20 shadow-2xs">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Điểm sơ tán an toàn gần nhất</span>
                  </div>
                  <div className="text-[11px] font-bold text-[#0A4393] mt-0.5 leading-snug">
                    {activeVillageImpact.profile.evacuationPoint}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    Cao độ an toàn +{activeVillageImpact.profile.evacuationElevationM}m • Cách{' '}
                    {activeVillageImpact.profile.evacuationDistanceKm} km
                  </div>
                </div>
              </div>

              {/* Danh sách tin báo thiên tai cộng đồng gần nhất */}
              {communityReports.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-[#0A4393]/15 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-300">
                      TIN BÁO TỔ XUNG KÍCH ({communityReports.length})
                    </span>
                    <span className="font-bold text-[#0A4393]">{communityReports[0].villageName}:</span>
                    <span className="truncate max-w-md">{communityReports[0].description}</span>
                    <span className="text-slate-500">
                      [GPS: {communityReports[0].lat.toFixed(4)}, {communityReports[0].lng.toFixed(4)} •{' '}
                      {communityReports[0].timestamp}]
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Alert Center & Command Telemetry (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* TAB CHUYỂN MẠCH: TRỰC CHIẾN LIVE (+ Nút Nguồn dữ liệu & Kiểm định KH) <-> TAB ẨN MÔ PHỎNG IoT */}
          <div className="flex items-center gap-1 p-1 bg-white border border-[#0A4393]/25 rounded-xl shadow-md">
            <button
              onClick={() => setTelemetryTab('LIVE')}
              className={`flex-1 py-1.5 px-1.5 rounded-lg text-[10px] xl:text-[11px] font-bold font-mono whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
                telemetryTab === 'LIVE'
                  ? 'bg-[#0A4393] text-white shadow-md'
                  : 'text-[#0A4393] hover:bg-[#F0F6FF]'
              }`}
            >
              <Activity className="w-3 h-3 shrink-0" />
              <span className="truncate">SỐ LIỆU TRỰC CHIẾN</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-normal shrink-0 ${telemetryTab === 'LIVE' ? 'bg-white text-[#0A4393] font-bold' : 'bg-[#F0F6FF] text-[#0A4393]'}`}>LIVE</span>
            </button>

            <button
              type="button"
              onClick={() => setShowScientificModal(true)}
              className="shrink-0 py-1.5 px-2 rounded-lg text-[10px] font-bold font-mono bg-[#F0F6FF] hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/35 transition-all flex items-center gap-1 shadow-xs"
              title="Nguồn dữ liệu & Kiểm định khoa học (NASA FIRMS & MIKE FLOOD)"
              aria-label="Mở Nguồn dữ liệu và Kiểm định khoa học"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Kiểm định KH</span>
            </button>

            <button
              onClick={() => setTelemetryTab('SIMULATOR')}
              className={`flex-1 py-1.5 px-1.5 rounded-lg text-[10px] xl:text-[11px] font-bold font-mono whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
                telemetryTab === 'SIMULATOR'
                  ? 'bg-[#0A4393] text-white shadow-md'
                  : 'text-[#0A4393] hover:bg-[#F0F6FF]'
              }`}
            >
              <Cpu className="w-3 h-3 shrink-0" />
              <span className="truncate">TAB MÔ PHỎNG IoT</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-normal shrink-0 ${telemetryTab === 'SIMULATOR' ? 'bg-white text-[#0A4393] font-bold' : 'bg-[#F0F6FF] text-[#0A4393]'}`}>LAB</span>
            </button>
          </div>

          {/* NỘI DUNG 1: CHUỖI SỐ LIỆU QUAN TRẮC TRỰC CHIẾN */}
          {telemetryTab === 'LIVE' && (
            <section
              aria-label="Chuỗi số liệu quan trắc trực chiến"
              className="bg-white border border-[#0A4393]/25 rounded-xl overflow-hidden shadow-lg flex-1 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-[#0A4393] text-white">
                  <h3 className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider font-mono truncate">
                    CHUỖI SỐ LIỆU QUAN TRẮC TRỰC CHIẾN
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowScientificModal(true)}
                      className="text-[10px] text-white bg-white/15 hover:bg-white hover:text-[#0A4393] border border-white/40 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 transition-all"
                      title="Xem Nguồn dữ liệu & Kiểm định khoa học"
                    >
                      <ShieldCheck className="w-3 h-3 shrink-0" />
                      <span>Nguồn & Kiểm định</span>
                    </button>
                    <span className="text-[10px] text-[#0A4393] bg-white px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 animate-pulse">
                      ● LIVE
                    </span>
                  </div>
                </div>

                <div className="p-3.5 space-y-2.5 text-xs font-mono">
                  {/* Trạm Lâm Nghiệp TK-293 */}
                  <div
                    className={`p-2.5 rounded-lg border transition-all ${
                      isTk293Red
                        ? 'emergency-flash text-white'
                        : 'bg-[#F4F8FD] border-[#0A4393]/20'
                    }`}
                  >
                    <div className={`flex justify-between font-bold ${isTk293Red ? 'text-white' : 'text-[#0A4393]'}`}>
                      <span className="flex items-center gap-1.5">
                        <Flame className={`w-3.5 h-3.5 ${isTk293Red ? 'text-white siren-wobble' : 'text-[#0A4393]'}`} />
                        Trạm Lâm Nghiệp TK-293
                      </span>
                    </div>
                    <div className={`mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] ${isTk293Red ? 'text-rose-100' : 'text-slate-700'}`}>
                      <div>
                        Nhiệt độ:{' '}
                        <strong className={isTk293Red ? 'text-white font-black' : 'text-[#0A4393]'}>
                          {iotData.tk293.temperature}°C
                        </strong>
                      </div>
                      <div>
                        Độ ẩm: <strong className={isTk293Red ? 'text-white' : 'text-[#0A4393]'}>{iotData.tk293.humidity}%</strong>
                      </div>
                      <div>
                        Khói CO:{' '}
                        <strong className={isTk293Red ? 'text-white font-black' : 'text-[#0A4393]'}>
                          {iotData.tk293.smokeCo} ppm
                        </strong>
                      </div>
                      <div>
                        Gió: <strong className={isTk293Red ? 'text-white' : 'text-[#0A4393]'}>{iotData.tk293.windSpeed} m/s</strong>
                      </div>
                    </div>
                  </div>

                  {/* Trạm Thủy Văn Hồ Thượng (Đồng bộ trực tiếp với Cụm Loa Truyền Thanh Số) */}
                  <div
                    className={`p-2.5 rounded-lg border transition-all ${
                      isHoThuongRed
                        ? 'emergency-flash text-white'
                        : 'bg-[#F4F8FD] border-[#0A4393]/20'
                    }`}
                  >
                    <div className={`flex justify-between font-bold ${isHoThuongRed ? 'text-white' : 'text-[#0A4393]'}`}>
                      <span className="flex items-center gap-1.5">
                        <Droplets className={`w-3.5 h-3.5 ${isHoThuongRed ? 'text-white siren-wobble' : 'text-[#0A4393]'}`} />
                        Trạm Thủy Văn Hồ Thượng
                      </span>
                      <span className={`font-normal ${isHoThuongRed ? 'text-rose-100' : 'text-slate-500'}`}>Radar Siêu Âm</span>
                    </div>
                    <div className={`mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] ${isHoThuongRed ? 'text-rose-100' : 'text-slate-700'}`}>
                      <div>
                        Cao trình:{' '}
                        <strong className={isHoThuongRed ? 'text-white font-black' : 'text-[#0A4393]'}>
                          {iotData.hoThuong.elevation} m
                        </strong>
                      </div>
                      <div>
                        Lưu lượng xả: <strong className={isHoThuongRed ? 'text-white' : 'text-[#0A4393]'}>{iotData.hoThuong.discharge} m³/s</strong>
                      </div>
                      <div>
                        Dung tích: <strong className={isHoThuongRed ? 'text-white' : 'text-[#0A4393]'}>{iotData.hoThuong.capacity}M m³</strong>
                      </div>
                      <div>
                        Tốc độ dâng:{' '}
                        <strong className={isHoThuongRed ? 'text-white font-bold' : 'text-[#0A4393]'}>
                          {iotData.hoThuong.riseRate > 0 ? `+${iotData.hoThuong.riseRate}` : iotData.hoThuong.riseRate} cm/h
                        </strong>
                      </div>
                    </div>

                    {/* Bộ chọn nhanh cao trình trực chiến để đồng bộ tức thì với Cụm Loa Truyền Thanh Số */}
                    <div className="mt-2 pt-2 border-t border-[#0A4393]/15 flex flex-wrap items-center justify-between gap-1 text-[10px]">
                      <span className={isHoThuongRed ? 'text-rose-100 font-semibold' : 'text-slate-600 font-semibold'}>
                        Đồng bộ Loa AI:
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {[206.8, 208.6, 210.8].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => updateHoThuongElevation(lvl)}
                            className={`px-1.5 py-0.5 rounded font-mono font-bold transition-all ${
                              iotData.hoThuong.elevation === lvl
                                ? 'bg-[#0A4393] text-white ring-1 ring-white shadow-xs'
                                : 'bg-white text-[#0A4393] border border-[#0A4393]/30 hover:bg-[#E6F0FA]'
                            }`}
                            title={`Đặt mực nước Hồ Thượng ${lvl}m & đồng bộ Cụm Loa Truyền Thanh Số`}
                          >
                            {lvl}m
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Hồ Ea Súp Hạ (Cấp Nước) */}
                  <div
                    className={`p-2.5 rounded-lg border transition-all ${
                      isHoHaRed
                        ? 'emergency-flash text-white'
                        : 'bg-[#F4F8FD] border-[#0A4393]/20'
                    }`}
                  >
                    <div className={`flex justify-between font-bold ${isHoHaRed ? 'text-white' : 'text-[#0A4393]'}`}>
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className={`w-3.5 h-3.5 ${isHoHaRed ? 'text-white siren-wobble' : 'text-[#0A4393]'}`} />
                        Hồ Ea Súp Hạ (Cấp Nước)
                      </span>
                      <span className={isHoHaRed ? 'text-rose-100 font-bold' : 'text-[#0A4393] font-bold'}>Nguồn sinh hoạt</span>
                    </div>
                    <div className={`mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] ${isHoHaRed ? 'text-rose-100' : 'text-slate-700'}`}>
                      <div>
                        Trạng thái:{' '}
                        <strong className={isHoHaRed ? 'text-white font-bold' : 'text-[#0A4393]'}>
                          {iotData.hoHa.status}
                        </strong>
                      </div>
                      <div>
                        Độ đục:{' '}
                        <strong className={iotData.hoHa.turbidity > 5 ? 'text-amber-600' : isHoHaRed ? 'text-white' : 'text-[#0A4393]'}>
                          {iotData.hoHa.turbidity} NTU
                        </strong>
                      </div>
                      <div>
                        Lồng bè vi phạm:{' '}
                        <strong className={isHoHaRed ? 'text-white font-black' : 'text-[#0A4393]'}>
                          {iotData.hoHa.illegalCages}
                        </strong>
                      </div>
                      <div>
                        Mực nước: <strong className={isHoHaRed ? 'text-white' : 'text-[#0A4393]'}>{iotData.hoHa.capacityPct}% dung tích</strong>
                      </div>
                    </div>
                  </div>

                  {/* Hồ Trung Chuyển */}
                  <div
                    className={`p-2.5 rounded-lg border transition-all ${
                      isHoTrungChuyenRed
                        ? 'emergency-flash text-white'
                        : 'bg-[#F4F8FD] border-[#0A4393]/20'
                    }`}
                  >
                    <div className={`flex justify-between font-bold ${isHoTrungChuyenRed ? 'text-white' : 'text-[#0A4393]'}`}>
                      <span className="flex items-center gap-1.5">
                        <Activity className={`w-3.5 h-3.5 ${isHoTrungChuyenRed ? 'text-white' : 'text-[#0A4393]'}`} />
                        Hồ Trung Chuyển
                      </span>
                      <span className={`font-normal ${isHoTrungChuyenRed ? 'text-rose-100' : 'text-slate-500'}`}>IoT Thủy Sản</span>
                    </div>
                    <div className={`mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] ${isHoTrungChuyenRed ? 'text-rose-100' : 'text-slate-700'}`}>
                      <div>
                        Oxy hòa tan DO:{' '}
                        <strong className={iotData.hoTrungChuyen.dissolvedOxygen < 4.0 ? 'text-white font-black' : 'text-[#0A4393]'}>
                          {iotData.hoTrungChuyen.dissolvedOxygen} mg/L
                        </strong>
                      </div>
                      <div>
                        Độ pH: <strong className={isHoTrungChuyenRed ? 'text-white' : 'text-[#0A4393]'}>{iotData.hoTrungChuyen.ph}</strong>
                      </div>
                      <div>
                        Nguy cơ ngập tràn:{' '}
                        <strong className={iotData.hoTrungChuyen.overflowRisk === 'Cao' ? 'text-white font-bold' : 'text-[#0A4393]'}>
                          {iotData.hoTrungChuyen.overflowRisk}
                        </strong>
                      </div>
                      <div>
                        Bờ bao: <strong className={isHoTrungChuyenRed ? 'text-white' : 'text-[#0A4393]'}>{iotData.hoTrungChuyen.dykeStatus}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* NỘI DUNG 2: TAB ẨN MÔ PHỎNG IoT VỚI CHỈ SỐ ĐO LƯỜNG THỰC TẾ */}
          {telemetryTab === 'SIMULATOR' && (
            <div className="flex-1">
              <IoTSimulatorTab
                currentData={iotData}
                onUpdateData={(nextData) => setIotData(nextData, { broadcast: true })}
                isOpen={true}
                onToggle={() => setTelemetryTab('LIVE')}
              />
            </div>
          )}
        </div>
      </main>

      {/* MODAL NGUỒN DỮ LIỆU & KIỂM ĐỊNH KHOA HỌC */}
      {showScientificModal && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowScientificModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="scientific-validation-modal-title"
        >
          <div
            className="bg-white border-2 border-[#0A4393] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="bg-[#0A4393] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-white shrink-0" />
                <h3
                  id="scientific-validation-modal-title"
                  className="text-xs sm:text-sm font-bold uppercase tracking-wide font-mono"
                >
                  Nguồn Dữ Liệu & Kiểm Định Khoa Học
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScientificModal(false)}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                aria-label="Đóng cửa sổ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nội dung chi tiết kiểm định */}
            <div className="p-4 space-y-3.5 text-xs leading-relaxed">
              {/* 1. NASA FIRMS */}
              <div className="p-3 rounded-xl bg-[#F4F8FD] border border-[#0A4393]/25">
                <div className="flex items-center gap-2 font-bold text-[#0A4393] text-xs sm:text-sm mb-1.5">
                  <Satellite className="w-4 h-4 text-[#0A4393] shrink-0" />
                  <span>1. Dữ liệu Ảnh nhiệt Vệ tinh & Cảnh báo Cháy rừng</span>
                </div>
                <p className="text-slate-700">
                  Dữ liệu ảnh nhiệt được thu nhận từ hệ thống vệ tinh{' '}
                  <strong className="text-[#0A4393]">NASA FIRMS (VIIRS 375m / MODIS 1km)</strong>, tích hợp
                  đối sánh đa tầng với mạng lưới cảm biến IoT LoRaWAN đo nhiệt độ, độ ẩm và nồng độ khói CO
                  trực chiến tại <strong className="text-[#0A4393]">Lâm phần Tiểu khu 293</strong> (vùng rừng
                  khộp trọng điểm xã Ea Súp).
                </p>
              </div>

              {/* 2. MIKE FLOOD */}
              <div className="p-3 rounded-xl bg-[#F4F8FD] border border-[#0A4393]/25">
                <div className="flex items-center gap-2 font-bold text-[#0A4393] text-xs sm:text-sm mb-1.5">
                  <Waves className="w-4 h-4 text-[#0A4393] shrink-0" />
                  <span>2. Dữ liệu Ngập lụt Hạ du & Thủy văn Hồ chứa</span>
                </div>
                <p className="text-slate-700">
                  Dữ liệu ngập lụt hạ du và kịch bản vận hành điều tiết nước Hồ Ea Súp Thượng, Hồ Ea Súp Hạ,
                  Hồ Trung Chuyển được chuẩn hóa từ{' '}
                  <strong className="text-[#0A4393]">
                    Báo cáo chuyên đề Mô hình thủy lực 2 chiều MIKE FLOOD (tích hợp MIKE 11 + MIKE 21 FM)
                  </strong>{' '}
                  đã được hiệu chỉnh và kiểm định thực tế qua{' '}
                  <strong className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                    trận lũ lịch sử tháng 8/2022 và tháng 7/2023
                  </strong>{' '}
                  trên lưu vực sông Ea Súp.
                </p>
              </div>

              {/* 3. Đồng bộ Reactive State */}
              <div className="px-3 py-2 rounded-lg bg-[#E6F0FA] border border-[#0A4393]/30 text-[11px] font-mono text-[#0A4393] flex items-center justify-between">
                <span>Trạng thái đồng bộ Global Store:</span>
                <span className="font-bold">● Khớp 100% Thời gian thực (Hồ Thượng {iotData.hoThuong.elevation}m)</span>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowScientificModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#0A4393] hover:bg-[#083576] text-white text-xs font-mono font-bold shadow-sm transition-colors"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NÚT NỔI (FLOATING ACTION BUTTON): BÁO TIN THIÊN TAI CỘNG ĐỒNG (GỬI ẢNH & GPS) */}
      <button
        type="button"
        onClick={() => {
          setReportVillage(selectedVillage);
          setReportSender(`Tổ xung kích PCTT ${selectedVillage}`);
          setShowCommunityReportModal(true);
        }}
        className="fixed bottom-4 right-4 z-[9000] bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2.5 rounded-full shadow-2xl border-2 border-white flex items-center gap-2 font-mono text-[11px] sm:text-xs font-bold transition-all hover:scale-105 cursor-pointer"
        aria-label="Báo tin thiên tai cộng đồng (Gửi ảnh và GPS)"
      >
        <span className="w-6 h-6 rounded-full bg-white text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
          <Camera className="w-3.5 h-3.5" />
        </span>
        <span>Báo tin thiên tai cộng đồng (Gửi ảnh & GPS)</span>
      </button>

      {/* MODAL BÁO TIN THIÊN TAI CỘNG ĐỒNG & TỔ XUNG KÍCH PCTT 20 THÔN BUÔN */}
      {showCommunityReportModal && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowCommunityReportModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="community-report-modal-title"
        >
          <div
            className="bg-white border-2 border-[#0A4393] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-800 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-rose-600 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white shrink-0" />
                <div>
                  <h3
                    id="community-report-modal-title"
                    className="text-xs sm:text-sm font-bold uppercase tracking-wide font-mono"
                  >
                    Báo Tin Thiên Tai Cộng Đồng (Gửi Ảnh & GPS)
                  </h3>
                  <p className="text-[10px] text-rose-100 font-mono">
                    Kênh kết nối trực tiếp Người dân & Tổ xung kích PCTT 20 thôn buôn về Trung tâm điều hành
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCommunityReportModal(false)}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                aria-label="Đóng cửa sổ báo tin"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSubmitCommunityReport} className="p-4 space-y-3 overflow-y-auto text-xs font-mono">
              {reportSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-400 text-emerald-900 font-bold flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{reportSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-[#0A4393] uppercase mb-1">
                    1. Thôn / Buôn xảy ra sự cố (20 thôn buôn)
                  </label>
                  <select
                    value={reportVillage}
                    onChange={(e) => {
                      setReportVillage(e.target.value);
                      setReportSender(`Tổ xung kích PCTT ${e.target.value}`);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#0A4393]/40 bg-[#F4F8FD] text-slate-900 font-bold text-xs"
                  >
                    {EASUP_VILLAGES.map((v) => (
                      <option key={v} value={v}>
                        {v} (Cao độ +{VILLAGE_DISASTER_PROFILES[v]?.avgElevationM ?? 178}m)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#0A4393] uppercase mb-1">
                    2. Loại hình thiên tai / sự cố
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) =>
                      setReportType(e.target.value as CommunityDisasterReport['incidentType'])
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#0A4393]/40 bg-[#F4F8FD] text-slate-900 font-bold text-xs"
                  >
                    <option value="FLOOD">🌊 Ngập lụt / Nước dâng tràn đường</option>
                    <option value="LANDSLIDE">⛰️ Sạt lở bờ suối / Kênh chính</option>
                    <option value="FOREST_FIRE">🔥 Khói cháy rừng (Tiểu khu 293)</option>
                    <option value="CAGE_VIOLATION">⛔ Lồng bè xâm phạm Hồ Ea Súp Hạ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-[#0A4393] uppercase mb-1">
                    3. Đơn vị / Người gửi báo cáo
                  </label>
                  <input
                    type="text"
                    value={reportSender}
                    onChange={(e) => setReportSender(e.target.value)}
                    placeholder="VD: Tổ xung kích PCTT Thôn Đoàn Kết"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#0A4393]/35 bg-white text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#0A4393] uppercase mb-1">
                    4. Định vị tọa độ GPS hiện trường
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={`${reportLat.toFixed(5)}, ${reportLng.toFixed(5)}`}
                      className="flex-1 px-2 py-1.5 rounded-lg border border-[#0A4393]/30 bg-slate-100 text-[#0A4393] font-bold text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={handleGetReportGps}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0A4393] hover:bg-[#083576] text-white font-bold text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Crosshair className={`w-3.5 h-3.5 ${isGettingReportGps ? 'animate-spin' : ''}`} />
                      <span>{isGettingReportGps ? 'Đang lấy...' : 'Lấy GPS'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#0A4393] uppercase mb-1">
                  5. Đính kèm ảnh hiện trường (Ngập lụt, sạt lở bờ suối, khói cháy rừng)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg border border-dashed border-[#0A4393] bg-[#F4F8FD] hover:bg-[#E6F0FA] text-[#0A4393] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Chụp ảnh / Chọn ảnh hiện trường</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReportImageUpload}
                      className="hidden"
                    />
                  </label>
                  {reportImagePreview && (
                    <span className="text-[10px] text-emerald-700 font-bold">
                      ✓ Đã đính kèm ảnh hiện trường
                    </span>
                  )}
                </div>
                {reportImagePreview && (
                  <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden border border-[#0A4393]/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={reportImagePreview}
                      alt="Ảnh hiện trường thiên tai"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#0A4393] uppercase mb-1">
                  6. Mô tả chi tiết tình hình hiện trường
                </label>
                <textarea
                  rows={2}
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Mô tả mực nước ngập, vị trí sạt lở bờ suối hoặc hướng khói cháy rừng để Ban Chỉ huy xã điều lực lượng ứng cứu..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#0A4393]/35 bg-white text-slate-900 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCommunityReportModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi ngay về Trung tâm điều hành & Phát loa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Footer Thông Tin Đề Tài */}
      <footer className="bg-[#0A4393] border-t border-[#083576] py-3.5 px-4 text-center text-xs text-white font-mono">
        <p className="font-bold">
          ĐỀ TÀI NGHIÊN CỨU KHOA HỌC KỸ THUẬT • TRƯỜNG THPT EA SÚP, TỈNH ĐẮK LẮK
        </p>
        <p className="mt-0.5 text-[11px] text-blue-100">
          Nhóm thực hiện: Lê Trần Bảo Trân (10a1) - Lê Phương Trang (10a3) TRƯỜNG THPT EA SÚP
        </p>
      </footer>
    </div>
  );
};
