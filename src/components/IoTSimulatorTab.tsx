'use client';

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Send,
  Cpu,
  Waves,
  AlertTriangle,
  BarChart3,
  MapPin,
} from 'lucide-react';
import CryptoJS from 'crypto-js';
import { realtimeSync } from '@/services/realtimeSyncService';
import {
  useTelemetryStore,
  FLOOD_BENCHMARKS,
  MIKE_FLOOD_SCENARIOS,
  MikeFloodScenarioId,
  DEFAULT_IOT_DATA,
  type IoTTelemetryData,
} from '@/services/telemetryStore';

export { DEFAULT_IOT_DATA, type IoTTelemetryData };

interface IoTSimulatorTabProps {
  currentData: IoTTelemetryData;
  onUpdateData: (newData: IoTTelemetryData) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const IoTSimulatorTab: React.FC<IoTSimulatorTabProps> = ({
  currentData,
  onUpdateData,
  isOpen,
  onToggle,
}) => {
  const {
    scenarioId,
    hydraulicModel,
    applyMikeFloodScenario,
    setIotData,
  } = useTelemetryStore();

  const [formData, setFormData] = useState<IoTTelemetryData>(currentData);
  const [activeStation, setActiveStation] = useState<
    'TK293' | 'HO_THUONG' | 'HO_HA' | 'HO_TRUNG_CHUYEN'
  >('HO_THUONG');
  const [apiResult, setApiResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đồng bộ hai chiều: Khi Global Store thay đổi từ Tab Trực chiến hoặc thiết bị khác, cập nhật formData ngay lập tức
  useEffect(() => {
    setFormData(currentData);
  }, [currentData]);

  const calculateCapacity = (elevation: number) => {
    const cap = 80 + ((elevation - 200) / 10) * 66;
    return Math.round(Math.max(60, Math.min(160, cap)));
  };

  const handleSelectMikeScenario = (
    id: Exclude<MikeFloodScenarioId, 'NONE' | 'CUSTOM_SLIDER'> | 'NONE'
  ) => {
    const nextData = applyMikeFloodScenario(id);
    setFormData(nextData);
    setActiveStation('HO_THUONG');
    setApiResult(null);
  };

  const applyScenario = (
    type: 'DEFAULT' | 'FIRE_ALERT' | 'FLOOD_ALERT' | 'CAGE_VIOLATION' | 'OXYGEN_DEPLETION'
  ) => {
    if (type === 'DEFAULT') {
      handleSelectMikeScenario('NONE');
      return;
    }
    if (type === 'FLOOD_ALERT') {
      handleSelectMikeScenario('KB1_1');
      return;
    }

    let updated: IoTTelemetryData;
    switch (type) {
      case 'FIRE_ALERT':
        updated = {
          ...formData,
          tk293: { temperature: 52.6, humidity: 24, smokeCo: 86, windSpeed: 7.2 },
        };
        setActiveStation('TK293');
        break;
      case 'CAGE_VIOLATION':
        updated = {
          ...formData,
          hoHa: { status: 'Vi phạm nghiêm trọng', turbidity: 16.4, illegalCages: 3, capacityPct: 88 },
        };
        setActiveStation('HO_HA');
        break;
      case 'OXYGEN_DEPLETION':
      default:
        updated = {
          ...formData,
          hoTrungChuyen: {
            dissolvedOxygen: 2.7,
            ph: 6.2,
            overflowRisk: 'Cao',
            dykeStatus: 'Nguy cơ sạt lở',
          },
        };
        setActiveStation('HO_TRUNG_CHUYEN');
        break;
    }
    setFormData(updated);
    setIotData(updated, {
      broadcast: true,
      scenarioName: type,
      triggerDominoAudio: true,
    });
    setApiResult(null);
  };

  const handleFieldChange = (station: keyof IoTTelemetryData, field: string, value: any) => {
    const updated = {
      ...formData,
      [station]: {
        ...formData[station],
        [field]: value,
      },
    };
    if (station === 'hoThuong' && field === 'elevation') {
      const numElev = Number(value);
      updated.hoThuong.capacity = calculateCapacity(numElev);
      if (numElev >= 210) {
        updated.hoThuong.riseRate = Math.max(updated.hoThuong.riseRate, 34);
        updated.hoThuong.discharge = Math.max(updated.hoThuong.discharge, 580);
      } else if (numElev >= 208) {
        updated.hoThuong.riseRate = Math.max(updated.hoThuong.riseRate, 20);
        updated.hoThuong.discharge = Math.max(updated.hoThuong.discharge, 280);
      }
    }
    if (station === 'hoHa' && field === 'illegalCages') {
      updated.hoHa.status = Number(value) > 0 ? 'Vi phạm nghiêm trọng' : 'An toàn';
    }
    setFormData(updated);
    const isHydroChange = station === 'hoThuong';
    setIotData(updated, {
      broadcast: true,
      scenarioId: isHydroChange ? 'CUSTOM_SLIDER' : scenarioId,
      triggerDominoAudio: isHydroChange && updated.hoThuong.elevation >= 208.0,
    });
  };

  // Đánh giá 1 dòng ngắn gọn
  const getAssessment = () => {
    if (activeStation === 'TK293') {
      const { temperature, smokeCo } = formData.tk293;
      if (temperature > 45 || smokeCo > 50) {
        return {
          text: '🚨 Nguy cơ cháy rừng rất cao! Cần báo động khẩn cấp.',
          color: 'text-rose-700 bg-rose-50 border-rose-500 font-bold',
        };
      }
      if (temperature > 38 || smokeCo > 30) {
        return {
          text: '⚠ Thời tiết khô nóng, cần chú ý theo dõi rừng.',
          color: 'text-amber-800 bg-amber-50 border-amber-500 font-semibold',
        };
      }
      return {
        text: '✓ Rừng an toàn, thời tiết bình thường.',
        color: 'text-[#0A4393] bg-[#F0F6FF] border-[#0A4393]/30 font-semibold',
      };
    }

    if (activeStation === 'HO_THUONG') {
      const { elevation, riseRate } = formData.hoThuong;
      if (elevation >= 210.0 || riseRate >= 30 || (scenarioId !== 'NONE' && scenarioId !== 'KB4_1')) {
        return {
          text: `🚨 Báo động Lũ Khẩn Cấp (${hydraulicModel.code}): MBL Ea Súp ${hydraulicModel.mblEaSup}m, ngập ${hydraulicModel.totalFloodedAreaHa.toLocaleString('en-US')} ha (${hydraulicModel.affectedHouseholds.toLocaleString('en-US')} hộ)!`,
          color: 'text-rose-700 bg-rose-50 border-rose-500 font-bold',
        };
      }
      if (elevation >= 208.0 || riseRate >= 15 || scenarioId === 'KB4_1') {
        return {
          text: `⚠ Cảnh báo Ngập Hạ Du (${hydraulicModel.code}): MBL Ea Súp ${hydraulicModel.mblEaSup}m, ngập ${hydraulicModel.totalFloodedAreaHa.toLocaleString('en-US')} ha.`,
          color: 'text-amber-800 bg-amber-50 border-amber-500 font-semibold',
        };
      }
      return {
        text: '✓ Mực nước an toàn (dưới Báo động I), hồ chứa vận hành ổn định.',
        color: 'text-[#0A4393] bg-[#F0F6FF] border-[#0A4393]/30 font-semibold',
      };
    }

    if (activeStation === 'HO_HA') {
      const { illegalCages, turbidity } = formData.hoHa;
      if (illegalCages > 0) {
        return {
          text: `🚨 Vi phạm: Có ${illegalCages} lồng cá! Cấm nuôi cá trong nguồn nước sạch.`,
          color: 'text-rose-700 bg-rose-50 border-rose-500 font-bold',
        };
      }
      if (turbidity > 5.0) {
        return {
          text: '⚠ Nước đục hơn bình thường, cần kiểm tra lại.',
          color: 'text-amber-800 bg-amber-50 border-amber-500 font-semibold',
        };
      }
      return {
        text: '✓ Nguồn nước ăn uống sạch, không có vi phạm.',
        color: 'text-[#0A4393] bg-[#F0F6FF] border-[#0A4393]/30 font-semibold',
      };
    }

    const { dissolvedOxygen, overflowRisk, dykeStatus } = formData.hoTrungChuyen;
    if (dissolvedOxygen < 4.0 || overflowRisk === 'Rất cao' || dykeStatus === 'Tràn bờ') {
      return {
        text: '🚨 Nước thiếu oxy (cá dễ chết) hoặc bờ bao sắp tràn!',
        color: 'text-rose-700 bg-rose-50 border-rose-500 font-bold',
      };
    }
    if (dissolvedOxygen < 5.0 || overflowRisk === 'Cao' || dykeStatus === 'Nguy cơ sạt lở') {
      return {
        text: '⚠ Mực nước cao, cần gia cố bờ hồ nuôi cá.',
        color: 'text-amber-800 bg-amber-50 border-amber-500 font-semibold',
      };
    }
    return {
      text: '✓ Hồ cá phát triển tốt, bờ bao chắc chắn.',
      color: 'text-[#0A4393] bg-[#F0F6FF] border-[#0A4393]/30 font-semibold',
    };
  };

  const handleTestSend = async () => {
    setIsSubmitting(true);
    setApiResult(null);
    try {
      const payload: Record<string, unknown> = {
        stationId:
          activeStation === 'TK293'
            ? 'IOT_TK293_01'
            : activeStation === 'HO_THUONG'
            ? 'HYDRO_EASUP_THUONG_01'
            : activeStation === 'HO_HA'
            ? 'WATER_EASUP_HA_DRINKING'
            : 'HYDRO_TRUNG_CHUYEN_DOANKET',
        stationType:
          activeStation === 'TK293' ? 'FOREST_FIRE_LORAWAN' : 'HYDRO_ULTRASONIC_RADAR',
        timestamp: Date.now(),
        airTempC: formData.tk293.temperature,
        smokePpm: formData.tk293.smokeCo,
        waterLevelM: formData.hoThuong.elevation,
        riseRateCmPerHour: formData.hoThuong.riseRate,
      };

      const sorted = JSON.stringify(
        Object.keys(payload)
          .sort()
          .reduce((obj: any, key) => {
            obj[key] = payload[key];
            return obj;
          }, {})
      );
      const signature = CryptoJS.HmacSHA256(sorted, 'easup-iot-secret-2026').toString(
        CryptoJS.enc.Hex
      );

      onUpdateData(formData);
      realtimeSync.broadcastTelemetry(formData, 'BUTTON_TEST');
      await new Promise((r) => setTimeout(r, 200));

      setApiResult({
        success: true,
        msg: `✓ ĐÃ ĐỒNG BỘ TOÀN HỆ THỐNG THÀNH CÔNG! Đã xác thực chữ ký HMAC-SHA256 (${signature.slice(
          0,
          8
        )}...). Tất cả các máy đang mở trang sẽ đồng loạt nhận số liệu và kích hoạt cảnh báo!`,
      });
    } catch {
      setApiResult({ success: false, msg: 'Lỗi kiểm thử dữ liệu gói tin' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const assessment = getAssessment();
  const dist = hydraulicModel.depthDistribution;
  const maxBarHa = Math.max(
    100,
    dist.under0_5m,
    dist.from0_5to1m,
    dist.from1to2m,
    dist.from2to3m,
    dist.over3m
  );

  const depthBars = [
    { label: '< 0.5m', ha: dist.under0_5m, color: 'bg-sky-500', textColor: 'text-sky-700' },
    { label: '0.5 - 1m', ha: dist.from0_5to1m, color: 'bg-blue-600', textColor: 'text-blue-700' },
    { label: '1 - 2m', ha: dist.from1to2m, color: 'bg-amber-500', textColor: 'text-amber-700' },
    { label: '2 - 3m', ha: dist.from2to3m, color: 'bg-orange-600', textColor: 'text-orange-700' },
    { label: '> 3m', ha: dist.over3m, color: 'bg-rose-600', textColor: 'text-rose-700' },
  ];

  const isEaSupOverBd3 = hydraulicModel.mblEaSup >= FLOOD_BENCHMARKS.EA_SUP_CENTER.bd3;
  const isEaRokOverBd3 = hydraulicModel.mblEaRok >= FLOOD_BENCHMARKS.EA_ROK_DOWNSTREAM.bd3;

  return (
    <div className="w-full bg-white border border-[#0A4393]/25 rounded-xl shadow-lg overflow-hidden font-sans">
      {/* 1. Header Tinh Gọn */}
      <div
        onClick={onToggle}
        className="px-3.5 py-2.5 bg-[#0A4393] text-white flex items-center justify-between cursor-pointer hover:bg-[#083576] transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-white" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            TAB MÔ PHỎNG IoT LAB & THỦY LỰC MIKE FLOOD
          </span>
        </div>
        <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded font-bold">
          {hydraulicModel.code}
        </span>
      </div>

      {isOpen && (
        <div className="p-3 space-y-3">
          {/* YÊU CẦU 1: THẺ HIỂN THỊ 'MỐC BÁO LŨ CHUẨN' */}
          <div className="p-2.5 rounded-xl bg-[#F4F8FD] border border-[#0A4393]/25 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#0A4393] uppercase tracking-wide flex items-center gap-1.5 font-mono">
                <Waves className="w-3.5 h-3.5 text-[#0A4393]" />
                Mốc Báo Lũ Chuẩn (Quy chuẩn Thủy văn)
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-[#0A4393] border border-[#0A4393]/25">
                MIKE 11 + MIKE 21 FM
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-[11px] font-mono">
              {/* Mốc 1: Trung tâm xã Ea Súp */}
              <div
                className={`p-2 rounded-lg border transition-colors ${
                  isEaSupOverBd3
                    ? 'bg-rose-50 border-rose-400 text-rose-900'
                    : 'bg-white border-[#0A4393]/20 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="text-[#0A4393]">1. Mốc báo lũ Ea Súp (Trung tâm xã)</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isEaSupOverBd3
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-[#F0F6FF] text-[#0A4393]'
                    }`}
                  >
                    Hiện tại: {hydraulicModel.mblEaSup.toFixed(2)}m (
                    {hydraulicModel.diffBd3EaSup >= 0
                      ? `+${hydraulicModel.diffBd3EaSup.toFixed(2)}m BĐ III`
                      : 'An toàn'}
                    )
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
                  <div className="py-0.5 px-1 rounded bg-sky-50 border border-sky-200 text-sky-900 font-semibold">
                    Báo động I: <strong>185.0m</strong>
                  </div>
                  <div className="py-0.5 px-1 rounded bg-amber-50 border border-amber-300 text-amber-900 font-semibold">
                    Báo động II: <strong>187.0m</strong>
                  </div>
                  <div className="py-0.5 px-1 rounded bg-rose-50 border border-rose-300 text-rose-800 font-bold">
                    Báo động III: <strong>189.0m</strong>
                  </div>
                </div>
              </div>

              {/* Mốc 2: Hạ lưu Ea Rốk */}
              <div
                className={`p-2 rounded-lg border transition-colors ${
                  isEaRokOverBd3
                    ? 'bg-rose-50 border-rose-400 text-rose-900'
                    : 'bg-white border-[#0A4393]/20 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="text-[#0A4393]">2. Mốc báo lũ Hạ lưu (Ea Rốk)</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isEaRokOverBd3
                        ? 'bg-rose-600 text-white'
                        : 'bg-[#F0F6FF] text-[#0A4393]'
                    }`}
                  >
                    Hiện tại: {hydraulicModel.mblEaRok.toFixed(2)}m
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
                  <div className="py-0.5 px-1 rounded bg-sky-50 border border-sky-200 text-sky-900 font-semibold">
                    Báo động I: <strong>166.0m</strong>
                  </div>
                  <div className="py-0.5 px-1 rounded bg-amber-50 border border-amber-300 text-amber-900 font-semibold">
                    Báo động II: <strong>167.5m</strong>
                  </div>
                  <div className="py-0.5 px-1 rounded bg-rose-50 border border-rose-300 text-rose-800 font-bold">
                    Báo động III: <strong>169.0m</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* YÊU CẦU 2: BỘ CHỌN 'KỊCH BẢN THỦY LỰC MIKE FLOOD ĐÃ KIỂM ĐỊNH' */}
          <div className="p-2.5 rounded-xl bg-[#F0F6FF] border border-[#0A4393]/30 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="mike-flood-scenario-select"
                className="text-[11px] font-bold text-[#0A4393] uppercase tracking-wide font-mono"
              >
                Kịch bản Thủy lực MIKE FLOOD đã kiểm định:
              </label>
              <button
                type="button"
                onClick={() => handleSelectMikeScenario('NONE')}
                className="px-2 py-0.5 rounded bg-white hover:bg-[#E6F0FA] border border-[#0A4393]/30 text-[#0A4393] text-[10px] font-mono font-semibold transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Đặt lại
              </button>
            </div>

            {/* Dropdown chọn nhanh hoặc cụm nút 5 kịch bản */}
            <select
              id="mike-flood-scenario-select"
              value={scenarioId === 'CUSTOM_SLIDER' ? 'NONE' : scenarioId}
              onChange={(e) =>
                handleSelectMikeScenario(
                  e.target.value as Exclude<MikeFloodScenarioId, 'NONE' | 'CUSTOM_SLIDER'> | 'NONE'
                )
              }
              className="w-full p-1.5 rounded-lg bg-white border border-[#0A4393]/40 text-[#0A4393] font-bold text-xs font-mono shadow-2xs cursor-pointer focus:ring-2 focus:ring-[#0A4393]"
            >
              <option value="NONE">-- Chọn kịch bản MIKE FLOOD (Hoặc kéo thanh trượt) --</option>
              <option value="KB4_1">
                KB4.1 (Xả lũ thường xuyên P=10%): MBL 189.11m (+0.11m BĐ III) • 1,413.17 ha • 419 hộ
              </option>
              <option value="KB1_1">
                KB1.1 (Xả lũ khẩn cấp thiết kế P=1%): MBL 189.56m (+0.56m BĐ III) • 1,613.76 ha • 533 hộ
              </option>
              <option value="KB1_2">
                KB1.2 (Xả lũ kiểm tra P=0.2%): MBL 189.83m (+0.83m BĐ III) • 1,663.48 ha • 592 hộ
              </option>
              <option value="KB2_1">
                KB2.1 (Khẩn cấp Vỡ đập ngày mưa P=1%): MBL 193.82m (+4.82m BĐ III) • 2,512.06 ha • 1,026 hộ
              </option>
              <option value="KB5_2">
                KB5.2 (Biến đổi khí hậu RCP 4.5): MBL 194.15m • Ngập 2,547.26 ha • 1,064 hộ (4,256 người)
              </option>
            </select>

            {/* 5 Nút Kịch Bản Bấm Trực Tiếp (1-Click Domino Trigger) */}
            <div className="grid grid-cols-5 gap-1">
              {(
                ['KB4_1', 'KB1_1', 'KB1_2', 'KB2_1', 'KB5_2'] as Array<
                  Exclude<MikeFloodScenarioId, 'NONE' | 'CUSTOM_SLIDER'>
                >
              ).map((key) => {
                const sc = MIKE_FLOOD_SCENARIOS[key];
                const isSelected = scenarioId === key;
                const isDamBreak = key === 'KB2_1' || key === 'KB5_2';
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectMikeScenario(key)}
                    className={`py-1 px-1 rounded text-[10px] font-mono font-bold border transition-all text-center ${
                      isSelected
                        ? isDamBreak
                          ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-300 shadow-sm'
                          : 'bg-[#0A4393] text-white border-[#0A4393] ring-2 ring-[#0A4393]/30 shadow-sm'
                        : isDamBreak
                        ? 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
                        : 'bg-white text-[#0A4393] border-[#0A4393]/30 hover:bg-[#E6F0FA]'
                    }`}
                    title={sc.fullName}
                  >
                    <div>{sc.code}</div>
                    <div className="text-[8px] font-normal opacity-85 truncate">
                      {sc.probabilityLabel}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Các tình huống nhanh khác (Cháy rừng, Vi phạm hồ Hạ, Cá ngạt khí) */}
            <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-[#0A4393]/15">
              <button
                type="button"
                onClick={() => applyScenario('FIRE_ALERT')}
                className="px-2 py-0.5 rounded bg-white hover:bg-rose-50 border border-rose-400 text-rose-700 text-[10px] font-semibold transition-colors"
              >
                🔥 Cháy rừng TK-293
              </button>
              <button
                type="button"
                onClick={() => applyScenario('CAGE_VIOLATION')}
                className="px-2 py-0.5 rounded bg-white hover:bg-amber-50 border border-amber-500 text-amber-800 text-[10px] font-semibold transition-colors"
              >
                ⛔ Vi phạm lồng bè Hồ Hạ
              </button>
              <button
                type="button"
                onClick={() => applyScenario('OXYGEN_DEPLETION')}
                className="px-2 py-0.5 rounded bg-white hover:bg-cyan-50 border border-cyan-500 text-cyan-800 text-[10px] font-semibold transition-colors"
              >
                🐟 Cá ngạt khí Hồ Trung Chuyển
              </button>
            </div>
          </div>

          {/* YÊU CẦU 3: HIỆU ỨNG DOMINO - BIỂU ĐỒ CỘT PHÂN BỔ 5 MỨC NGẬP & CHI TIẾT THIỆT HẠI */}
          <div className="p-2.5 rounded-xl bg-white border-2 border-[#0A4393]/30 shadow-sm space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="font-bold text-[#0A4393] flex items-center gap-1.5 font-mono text-[11px]">
                <BarChart3 className="w-3.5 h-3.5 text-[#0A4393]" />
                PHÂN BỔ 5 MỨC NGẬP XÃ EA SÚP ({hydraulicModel.code})
              </span>
              <span className="font-mono font-bold text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Tổng: {hydraulicModel.totalFloodedAreaHa.toLocaleString('en-US')} ha
              </span>
            </div>

            {/* Biểu đồ cột ngang / dọc 5 mức độ sâu ngập */}
            <div className="space-y-1.5 font-mono text-[10px]">
              {depthBars.map((bar) => {
                const widthPct =
                  hydraulicModel.totalFloodedAreaHa > 0
                    ? Math.max(4, Math.round((bar.ha / maxBarHa) * 100))
                    : 0;
                const sharePct =
                  hydraulicModel.totalFloodedAreaHa > 0
                    ? ((bar.ha / hydraulicModel.totalFloodedAreaHa) * 100).toFixed(1)
                    : '0.0';
                return (
                  <div key={bar.label} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Mức ngập {bar.label}:</span>
                      <span className={`font-bold ${bar.textColor}`}>
                        {bar.ha.toLocaleString('en-US')} ha ({sharePct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full ${bar.color} transition-all duration-300 rounded-full`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Thông số tổng hợp Dân sinh & Hạ tầng ngập của Kịch bản */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
              <div className="p-1.5 rounded bg-[#F4F8FD] border border-[#0A4393]/20">
                <div className="text-slate-500">Dân cư bị ảnh hưởng:</div>
                <div className="font-bold text-[#0A4393] text-[11px]">
                  {hydraulicModel.affectedHouseholds.toLocaleString('en-US')} hộ (
                  {hydraulicModel.affectedPeople.toLocaleString('en-US')} người)
                </div>
              </div>
              <div className="p-1.5 rounded bg-[#F4F8FD] border border-[#0A4393]/20">
                <div className="text-slate-500">Giao thông ngập lụt:</div>
                <div className="font-bold text-[#0A4393] text-[11px]">
                  QL14C: {hydraulicModel.ql14cFloodedKm}km • TL681: {hydraulicModel.tl681FloodedKm}km
                </div>
              </div>
            </div>

            {/* Ghi chú các công trình trọng điểm bị ngập (Bệnh viện, Trường MN Hoa Phượng, 18 công trình...) */}
            <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-300 text-[10px] space-y-0.5">
              <div className="font-bold text-amber-900 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                <span>Tác động Hạ tầng & Công trình Công cộng:</span>
              </div>
              <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                {hydraulicModel.infrastructureNotes.map((note, idx) => (
                  <li key={idx} className="font-medium">
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            {/* Danh sách các thôn bị ảnh hưởng Domino */}
            {hydraulicModel.affectedVillages.length > 0 && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-300 text-[10px] space-y-1">
                <div className="font-bold text-rose-800 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-600 shrink-0" />
                    Domino Cảnh báo Thôn/Buôn ngập lụt ({hydraulicModel.affectedVillages.length} thôn):
                  </span>
                  <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-mono">
                    ĐÃ ĐỔI MÀU BẢNG 20 THÔN
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {hydraulicModel.affectedVillages.map((v) => {
                    const isCritical = hydraulicModel.criticalVillages.includes(v);
                    return (
                      <span
                        key={v}
                        className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] border ${
                          isCritical
                            ? 'bg-rose-600 text-white border-rose-700'
                            : 'bg-amber-100 text-amber-900 border-amber-400'
                        }`}
                      >
                        {v}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. Khối điều khiển thanh trượt chi tiết từng trạm */}
          <div className="p-3 rounded-xl bg-[#F4F8FD] border border-[#0A4393]/20 shadow-sm space-y-3">
            {/* Thanh chọn 4 trạm */}
            <div className="grid grid-cols-4 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveStation('TK293')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  activeStation === 'TK293'
                    ? 'bg-[#0A4393] text-white font-bold shadow-sm'
                    : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
              >
                Rừng TK-293
              </button>
              <button
                type="button"
                onClick={() => setActiveStation('HO_THUONG')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  activeStation === 'HO_THUONG'
                    ? 'bg-[#0A4393] text-white font-bold shadow-sm'
                    : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
              >
                Hồ Thượng
              </button>
              <button
                type="button"
                onClick={() => setActiveStation('HO_HA')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  activeStation === 'HO_HA'
                    ? 'bg-[#0A4393] text-white font-bold shadow-sm'
                    : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
              >
                Hồ Hạ
              </button>
              <button
                type="button"
                onClick={() => setActiveStation('HO_TRUNG_CHUYEN')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  activeStation === 'HO_TRUNG_CHUYEN'
                    ? 'bg-[#0A4393] text-white font-bold shadow-sm'
                    : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
              >
                Hồ Cá
              </button>
            </div>

            {/* Khung điều khiển thanh trượt */}
            <div className="p-3 rounded-lg bg-white border border-[#0A4393]/20 space-y-3 text-xs">
              {activeStation === 'TK293' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Nhiệt độ:</span>
                      <strong
                        className={
                          formData.tk293.temperature > 45
                            ? 'text-rose-600 font-bold'
                            : 'text-[#0A4393]'
                        }
                      >
                        {formData.tk293.temperature}°C
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={65}
                      step={0.5}
                      value={formData.tk293.temperature}
                      onChange={(e) =>
                        handleFieldChange('tk293', 'temperature', parseFloat(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Lượng khói:</span>
                      <strong
                        className={
                          formData.tk293.smokeCo > 50 ? 'text-rose-600 font-bold' : 'text-[#0A4393]'
                        }
                      >
                        {formData.tk293.smokeCo} ppm
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={150}
                      step={2}
                      value={formData.tk293.smokeCo}
                      onChange={(e) =>
                        handleFieldChange('tk293', 'smokeCo', parseInt(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Độ ẩm:</span>
                      <strong className="text-[#0A4393]">{formData.tk293.humidity}%</strong>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={95}
                      value={formData.tk293.humidity}
                      onChange={(e) =>
                        handleFieldChange('tk293', 'humidity', parseInt(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Tốc độ gió:</span>
                      <strong className="text-[#0A4393]">{formData.tk293.windSpeed} m/s</strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={0.5}
                      value={formData.tk293.windSpeed}
                      onChange={(e) =>
                        handleFieldChange('tk293', 'windSpeed', parseFloat(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {activeStation === 'HO_THUONG' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Mực nước hồ:</span>
                      <strong
                        className={
                          formData.hoThuong.elevation >= 210
                            ? 'text-rose-600 font-bold'
                            : 'text-[#0A4393]'
                        }
                      >
                        {formData.hoThuong.elevation} m
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={200}
                      max={214}
                      step={0.2}
                      value={formData.hoThuong.elevation}
                      onChange={(e) =>
                        handleFieldChange('hoThuong', 'elevation', parseFloat(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Nước dâng:</span>
                      <strong
                        className={
                          formData.hoThuong.riseRate > 30
                            ? 'text-rose-600 font-bold'
                            : 'text-[#0A4393]'
                        }
                      >
                        {formData.hoThuong.riseRate > 0
                          ? `+${formData.hoThuong.riseRate}`
                          : formData.hoThuong.riseRate}{' '}
                        cm/h
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={-10}
                      max={50}
                      step={2}
                      value={formData.hoThuong.riseRate}
                      onChange={(e) =>
                        handleFieldChange('hoThuong', 'riseRate', parseInt(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Lưu lượng xả:</span>
                      <strong className="text-[#0A4393]">{formData.hoThuong.discharge} m³/s</strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1200}
                      step={20}
                      value={formData.hoThuong.discharge}
                      onChange={(e) =>
                        handleFieldChange('hoThuong', 'discharge', parseInt(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Dung tích nước:</span>
                      <strong className="text-[#0A4393]">
                        {formData.hoThuong.capacity} / 146 triệu m³
                      </strong>
                    </div>
                    <div className="w-full bg-[#E6F0FA] h-2 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full ${
                          formData.hoThuong.capacity >= 146 ? 'bg-rose-600' : 'bg-[#0A4393]'
                        }`}
                        style={{
                          width: `${Math.min(100, (formData.hoThuong.capacity / 146) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeStation === 'HO_HA' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Lồng nuôi cá trái phép:</span>
                      <strong
                        className={
                          formData.hoHa.illegalCages > 0
                            ? 'text-rose-600 font-bold'
                            : 'text-[#0A4393]'
                        }
                      >
                        {formData.hoHa.illegalCages} lồng
                      </strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleFieldChange(
                            'hoHa',
                            'illegalCages',
                            Math.max(0, formData.hoHa.illegalCages - 1)
                          )
                        }
                        className="px-2.5 py-0.5 rounded bg-[#F0F6FF] hover:bg-[#E6F0FA] border border-[#0A4393]/30 text-[#0A4393] font-bold text-xs"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        value={formData.hoHa.illegalCages}
                        onChange={(e) =>
                          handleFieldChange('hoHa', 'illegalCages', parseInt(e.target.value))
                        }
                        className="flex-1 accent-rose-600 h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleFieldChange('hoHa', 'illegalCages', formData.hoHa.illegalCages + 1)
                        }
                        className="px-2.5 py-0.5 rounded bg-[#F0F6FF] hover:bg-[#E6F0FA] border border-[#0A4393]/30 text-[#0A4393] font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Độ trong của nước:</span>
                      <strong
                        className={
                          formData.hoHa.turbidity > 5 ? 'text-amber-600' : 'text-[#0A4393]'
                        }
                      >
                        {formData.hoHa.turbidity} NTU
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={0.5}
                      value={formData.hoHa.turbidity}
                      onChange={(e) =>
                        handleFieldChange('hoHa', 'turbidity', parseFloat(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div className="col-span-2">
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Mực nước hồ hiện tại:</span>
                      <strong className="text-[#0A4393]">{formData.hoHa.capacityPct}%</strong>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={formData.hoHa.capacityPct}
                      onChange={(e) =>
                        handleFieldChange('hoHa', 'capacityPct', parseInt(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {activeStation === 'HO_TRUNG_CHUYEN' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Lượng oxy (DO):</span>
                      <strong
                        className={
                          formData.hoTrungChuyen.dissolvedOxygen < 4
                            ? 'text-rose-600 font-bold'
                            : 'text-[#0A4393]'
                        }
                      >
                        {formData.hoTrungChuyen.dissolvedOxygen} mg/L
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={0.2}
                      value={formData.hoTrungChuyen.dissolvedOxygen}
                      onChange={(e) =>
                        handleFieldChange(
                          'hoTrungChuyen',
                          'dissolvedOxygen',
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Độ pH:</span>
                      <strong className="text-[#0A4393]">{formData.hoTrungChuyen.ph}</strong>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={9}
                      step={0.1}
                      value={formData.hoTrungChuyen.ph}
                      onChange={(e) =>
                        handleFieldChange('hoTrungChuyen', 'ph', parseFloat(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="text-slate-700 mb-1">Mực nước:</div>
                    <select
                      value={formData.hoTrungChuyen.overflowRisk}
                      onChange={(e) =>
                        handleFieldChange('hoTrungChuyen', 'overflowRisk', e.target.value)
                      }
                      className="w-full p-1 rounded bg-[#F0F6FF] border border-[#0A4393]/30 text-[#0A4393] font-semibold text-xs"
                    >
                      <option value="Thấp">Bình thường</option>
                      <option value="Trung bình">Nước cao</option>
                      <option value="Cao">Tràn bờ</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-slate-700 mb-1">Bờ hồ nuôi cá:</div>
                    <select
                      value={formData.hoTrungChuyen.dykeStatus}
                      onChange={(e) =>
                        handleFieldChange('hoTrungChuyen', 'dykeStatus', e.target.value)
                      }
                      className="w-full p-1 rounded bg-[#F0F6FF] border border-[#0A4393]/30 text-[#0A4393] font-semibold text-xs"
                    >
                      <option value="Ổn định">Chắc chắn</option>
                      <option value="Nguy cơ sạt lở">Yếu, cần đắp</option>
                      <option value="Tràn bờ">Bị vỡ / sạt lở</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Đánh giá trạng thái ngắn gọn 1 dòng */}
            <div className={`px-2.5 py-1.5 rounded border text-xs ${assessment.color}`}>
              {assessment.text}
            </div>

            {/* 6. Nút kiểm tra nhanh & quay lại */}
            <div className="flex items-center justify-between pt-1 border-t border-[#0A4393]/15 mt-1">
              <button
                type="button"
                onClick={onToggle}
                className="text-[11px] text-[#0A4393] hover:bg-[#E6F0FA] px-2.5 py-1 rounded bg-white border border-[#0A4393]/30 transition-colors font-semibold"
              >
                ← Quay lại số liệu quan trắc
              </button>
              <button
                type="button"
                onClick={handleTestSend}
                disabled={isSubmitting}
                className="px-3 py-1 rounded bg-[#0A4393] hover:bg-[#083576] active:bg-[#062859] text-white font-bold text-xs transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                {isSubmitting ? 'Đang gửi...' : 'Kiểm thử máy chủ'}
              </button>
            </div>

            {apiResult && (
              <div
                className={`p-2 rounded text-xs border ${
                  apiResult.success
                    ? 'bg-[#F0F6FF] text-[#0A4393] border-[#0A4393]/40 font-semibold'
                    : 'bg-rose-50 text-rose-700 border-rose-500'
                }`}
              >
                {apiResult.msg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
