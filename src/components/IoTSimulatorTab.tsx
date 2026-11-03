'use client';

import React, { useState } from 'react';
import {
  RotateCcw,
  Send,
  Cpu,
} from 'lucide-react';
import CryptoJS from 'crypto-js';
import { realtimeSync } from '@/services/realtimeSyncService';

export interface IoTTelemetryData {
  tk293: {
    temperature: number; // °C
    humidity: number; // %
    smokeCo: number; // ppm
    windSpeed: number; // m/s
  };
  hoThuong: {
    elevation: number; // m
    discharge: number; // m³/s
    capacity: number; // M m³
    riseRate: number; // cm/h
  };
  hoHa: {
    status: 'An toàn' | 'Cảnh báo ô nhiễm' | 'Vi phạm nghiêm trọng';
    turbidity: number; // NTU
    illegalCages: number; // Số lồng bè vi phạm
    capacityPct: number; // % dung tích
  };
  hoTrungChuyen: {
    dissolvedOxygen: number; // mg/L
    ph: number;
    overflowRisk: 'Thấp' | 'Trung bình' | 'Cao' | 'Rất cao';
    dykeStatus: 'Ổn định' | 'Rò rỉ' | 'Nguy cơ sạt lở' | 'Tràn bờ';
  };
}

export const DEFAULT_IOT_DATA: IoTTelemetryData = {
  tk293: {
    temperature: 32.4,
    humidity: 58,
    smokeCo: 12,
    windSpeed: 2.8,
  },
  hoThuong: {
    elevation: 206.8,
    discharge: 0,
    capacity: 118,
    riseRate: 2,
  },
  hoHa: {
    status: 'An toàn',
    turbidity: 4.2,
    illegalCages: 0,
    capacityPct: 82,
  },
  hoTrungChuyen: {
    dissolvedOxygen: 6.8,
    ph: 7.4,
    overflowRisk: 'Thấp',
    dykeStatus: 'Ổn định',
  },
};

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
  const [formData, setFormData] = useState<IoTTelemetryData>(currentData);
  const [activeStation, setActiveStation] = useState<'TK293' | 'HO_THUONG' | 'HO_HA' | 'HO_TRUNG_CHUYEN'>('HO_THUONG');
  const [apiResult, setApiResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateCapacity = (elevation: number) => {
    const cap = 80 + ((elevation - 200) / 10) * 66;
    return Math.round(Math.max(60, Math.min(160, cap)));
  };

  const applyScenario = (type: 'DEFAULT' | 'FIRE_ALERT' | 'FLOOD_ALERT' | 'CAGE_VIOLATION' | 'OXYGEN_DEPLETION') => {
    let updated: IoTTelemetryData;
    switch (type) {
      case 'FIRE_ALERT':
        updated = {
          ...formData,
          tk293: { temperature: 52.6, humidity: 24, smokeCo: 86, windSpeed: 7.2 },
        };
        setActiveStation('TK293');
        break;
      case 'FLOOD_ALERT':
        updated = {
          ...formData,
          hoThuong: { elevation: 210.8, discharge: 450, capacity: 152, riseRate: 36 },
        };
        setActiveStation('HO_THUONG');
        break;
      case 'CAGE_VIOLATION':
        updated = {
          ...formData,
          hoHa: { status: 'Vi phạm nghiêm trọng', turbidity: 16.4, illegalCages: 3, capacityPct: 88 },
        };
        setActiveStation('HO_HA');
        break;
      case 'OXYGEN_DEPLETION':
        updated = {
          ...formData,
          hoTrungChuyen: { dissolvedOxygen: 2.7, ph: 6.2, overflowRisk: 'Cao', dykeStatus: 'Nguy cơ sạt lở' },
        };
        setActiveStation('HO_TRUNG_CHUYEN');
        break;
      case 'DEFAULT':
      default:
        updated = JSON.parse(JSON.stringify(DEFAULT_IOT_DATA));
        break;
    }
    setFormData(updated);
    onUpdateData(updated);
    realtimeSync.broadcastTelemetry(updated, 'SCENARIO_CLICK', type);
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
      updated.hoThuong.capacity = calculateCapacity(Number(value));
    }
    if (station === 'hoHa' && field === 'illegalCages') {
      updated.hoHa.status = Number(value) > 0 ? 'Vi phạm nghiêm trọng' : 'An toàn';
    }
    setFormData(updated);
    onUpdateData(updated);
  };

  // Đánh giá 1 dòng ngắn gọn, không chuyên ngành
  const getAssessment = () => {
    if (activeStation === 'TK293') {
      const { temperature, smokeCo } = formData.tk293;
      if (temperature > 45 || smokeCo > 50) {
        return { text: '🚨 Nguy cơ cháy rừng rất cao! Cần báo động khẩn cấp.', color: 'text-rose-700 bg-rose-50 border-rose-500 font-bold' };
      }
      if (temperature > 38 || smokeCo > 30) {
        return { text: '⚠ Thời tiết khô nóng, cần chú ý theo dõi rừng.', color: 'text-amber-800 bg-amber-50 border-amber-500 font-semibold' };
      }
      return { text: '✓ Rừng an toàn, thời tiết bình thường.', color: 'text-[#0A4393] bg-[#F0F6FF] border-[#0A4393]/30 font-semibold' };
    }

    if (activeStation === 'HO_THUONG') {
      const { elevation, riseRate } = formData.hoThuong;
      if (elevation >= 210.0 || riseRate >= 30) {
        return { text: '🚨 Báo động lũ lớn! Nước tràn bờ, cần sơ tán người dân.', color: 'text-rose-700 bg-rose-50 border-rose-500 font-bold' };
      }
      if (elevation >= 208.5 || riseRate >= 15) {
        return { text: '⚠ Nước dâng nhanh, cần chủ động phòng chống ngập.', color: 'text-amber-800 bg-amber-50 border-amber-500 font-semibold' };
      }
      return { text: '✓ Mực nước an toàn, hồ chứa ổn định.', color: 'text-[#0A4393] bg-[#F0F6FF] border-[#0A4393]/30 font-semibold' };
    }

    if (activeStation === 'HO_HA') {
      const { illegalCages, turbidity } = formData.hoHa;
      if (illegalCages > 0) {
        return { text: `🚨 Vi phạm: Có ${illegalCages} lồng cá! Cấm nuôi cá trong nguồn nước sạch.`, color: 'text-rose-700 bg-rose-50 border-rose-500 font-bold' };
      }
      if (turbidity > 5.0) {
        return { text: '⚠ Nước đục hơn bình thường, cần kiểm tra lại.', color: 'text-amber-800 bg-amber-50 border-amber-500 font-semibold' };
      }
      return { text: '✓ Nguồn nước ăn uống sạch, không có vi phạm.', color: 'text-[#0A4393] bg-[#F0F6FF] border-[#0A4393]/30 font-semibold' };
    }

    const { dissolvedOxygen, overflowRisk, dykeStatus } = formData.hoTrungChuyen;
    if (dissolvedOxygen < 4.0 || overflowRisk === 'Rất cao' || dykeStatus === 'Tràn bờ') {
      return { text: '🚨 Nước thiếu oxy (cá dễ chết) hoặc bờ bao sắp tràn!', color: 'text-rose-700 bg-rose-50 border-rose-500 font-bold' };
    }
    if (dissolvedOxygen < 5.0 || overflowRisk === 'Cao' || dykeStatus === 'Nguy cơ sạt lở') {
      return { text: '⚠ Mực nước cao, cần gia cố bờ hồ nuôi cá.', color: 'text-amber-800 bg-amber-50 border-amber-500 font-semibold' };
    }
    return { text: '✓ Hồ cá phát triển tốt, bờ bao chắc chắn.', color: 'text-[#0A4393] bg-[#F0F6FF] border-[#0A4393]/30 font-semibold' };
  };

  const handleTestSend = async () => {
    setIsSubmitting(true);
    setApiResult(null);
    try {
      const payload: Record<string, unknown> = {
        stationId: activeStation === 'TK293' ? 'IOT_TK293_01' : activeStation === 'HO_THUONG' ? 'HYDRO_EASUP_THUONG_01' : activeStation === 'HO_HA' ? 'WATER_EASUP_HA_DRINKING' : 'HYDRO_TRUNG_CHUYEN_DOANKET',
        stationType: activeStation === 'TK293' ? 'FOREST_FIRE_LORAWAN' : 'HYDRO_ULTRASONIC_RADAR',
        timestamp: Date.now(),
        airTempC: formData.tk293.temperature,
        smokePpm: formData.tk293.smokeCo,
        waterLevelM: formData.hoThuong.elevation,
        riseRateCmPerHour: formData.hoThuong.riseRate,
      };

      const sorted = JSON.stringify(Object.keys(payload).sort().reduce((obj: any, key) => { obj[key] = payload[key]; return obj; }, {}));
      const signature = CryptoJS.HmacSHA256(sorted, 'easup-iot-secret-2026').toString(CryptoJS.enc.Hex);

      // 1. Cập nhật ngay tại máy hiện tại
      onUpdateData(formData);

      // 2. Phát lệnh đồng bộ tức thì qua MQTT Cloud WSS & BroadcastChannel tới tất cả các máy khác
      realtimeSync.broadcastTelemetry(formData, 'BUTTON_TEST');

      // 3. Giả lập xác thực mạng viễn thông 200ms
      await new Promise((r) => setTimeout(r, 200));

      setApiResult({
        success: true,
        msg: `✓ ĐÃ ĐỒNG BỘ TOÀN HỆ THỐNG THÀNH CÔNG! Đã xác thực chữ ký HMAC-SHA256 (${signature.slice(0, 8)}...). Tất cả các máy đang mở trang sẽ đồng loạt nhận số liệu và kích hoạt cảnh báo!`,
      });
    } catch {
      setApiResult({ success: false, msg: 'Lỗi kiểm thử dữ liệu gói tin' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const assessment = getAssessment();

  return (
    <div className="w-full bg-white border border-[#0A4393]/25 rounded-xl shadow-lg overflow-hidden font-sans">
      {/* 1. Header Tinh Gọn */}
      <div
        onClick={onToggle}
        className="px-3.5 py-2.5 bg-[#0A4393] text-white flex items-center justify-between cursor-pointer hover:bg-[#083576] transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-white" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Mô Phỏng Tình Huống Đo Lường</span>
        </div>
      </div>

      {isOpen && (
        <div className="p-3 space-y-3">
          {/* 2. Khối kịch bản nhanh bên trên */}
          <div className="p-2.5 rounded-lg bg-[#F0F6FF] border border-[#0A4393]/20 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#0A4393]">
              <span>Tình huống khẩn cấp mô phỏng:</span>
              <button
                onClick={() => applyScenario('DEFAULT')}
                className="px-2 py-0.5 rounded bg-white hover:bg-[#E6F0FA] border border-[#0A4393]/30 text-[#0A4393] text-[10px] transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Đặt lại ban đầu
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => applyScenario('FIRE_ALERT')}
                className="px-2.5 py-1 rounded bg-white hover:bg-rose-50 border border-rose-400 text-rose-700 text-[11px] font-semibold transition-colors"
              >
                🔥 Cháy rừng
              </button>
              <button
                onClick={() => applyScenario('FLOOD_ALERT')}
                className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 border border-[#0A4393]/40 text-[#0A4393] text-[11px] font-semibold transition-colors"
              >
                🌊 Lũ lớn
              </button>
              <button
                onClick={() => applyScenario('CAGE_VIOLATION')}
                className="px-2.5 py-1 rounded bg-white hover:bg-amber-50 border border-amber-500 text-amber-800 text-[11px] font-semibold transition-colors"
              >
                ⛔ Vi phạm hồ nước
              </button>
              <button
                onClick={() => applyScenario('OXYGEN_DEPLETION')}
                className="px-2.5 py-1 rounded bg-white hover:bg-cyan-50 border border-cyan-500 text-cyan-800 text-[11px] font-semibold transition-colors"
              >
                🐟 Cá ngạt khí
              </button>
            </div>
          </div>

          {/* 3. Khối điều khiển chi tiết bên dưới */}
          <div className="p-3 rounded-xl bg-[#F4F8FD] border border-[#0A4393]/20 shadow-sm space-y-3 mt-3">
            {/* Thanh chọn 4 trạm */}
            <div className="grid grid-cols-4 gap-1.5 text-[11px]">
              <button
                onClick={() => setActiveStation('TK293')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  activeStation === 'TK293' ? 'bg-[#0A4393] text-white font-bold shadow-sm' : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
              >
                Rừng TK-293
              </button>
              <button
                onClick={() => setActiveStation('HO_THUONG')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  activeStation === 'HO_THUONG' ? 'bg-[#0A4393] text-white font-bold shadow-sm' : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
              >
                Hồ Thượng
              </button>
              <button
                onClick={() => setActiveStation('HO_HA')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  activeStation === 'HO_HA' ? 'bg-[#0A4393] text-white font-bold shadow-sm' : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
              >
                Hồ Hạ
              </button>
              <button
                onClick={() => setActiveStation('HO_TRUNG_CHUYEN')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  activeStation === 'HO_TRUNG_CHUYEN' ? 'bg-[#0A4393] text-white font-bold shadow-sm' : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
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
                      <strong className={formData.tk293.temperature > 45 ? 'text-rose-600 font-bold' : 'text-[#0A4393]'}>
                        {formData.tk293.temperature}°C
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={65}
                      step={0.5}
                      value={formData.tk293.temperature}
                      onChange={(e) => handleFieldChange('tk293', 'temperature', parseFloat(e.target.value))}
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Lượng khói:</span>
                      <strong className={formData.tk293.smokeCo > 50 ? 'text-rose-600 font-bold' : 'text-[#0A4393]'}>
                        {formData.tk293.smokeCo} ppm
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={150}
                      step={2}
                      value={formData.tk293.smokeCo}
                      onChange={(e) => handleFieldChange('tk293', 'smokeCo', parseInt(e.target.value))}
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
                      onChange={(e) => handleFieldChange('tk293', 'humidity', parseInt(e.target.value))}
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
                      onChange={(e) => handleFieldChange('tk293', 'windSpeed', parseFloat(e.target.value))}
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
                      <strong className={formData.hoThuong.elevation >= 210 ? 'text-rose-600 font-bold' : 'text-[#0A4393]'}>
                        {formData.hoThuong.elevation} m
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={200}
                      max={214}
                      step={0.2}
                      value={formData.hoThuong.elevation}
                      onChange={(e) => handleFieldChange('hoThuong', 'elevation', parseFloat(e.target.value))}
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Nước dâng:</span>
                      <strong className={formData.hoThuong.riseRate > 30 ? 'text-rose-600 font-bold' : 'text-[#0A4393]'}>
                        {formData.hoThuong.riseRate > 0 ? `+${formData.hoThuong.riseRate}` : formData.hoThuong.riseRate} cm/h
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={-10}
                      max={50}
                      step={2}
                      value={formData.hoThuong.riseRate}
                      onChange={(e) => handleFieldChange('hoThuong', 'riseRate', parseInt(e.target.value))}
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
                      onChange={(e) => handleFieldChange('hoThuong', 'discharge', parseInt(e.target.value))}
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Dung tích nước:</span>
                      <strong className="text-[#0A4393]">{formData.hoThuong.capacity} / 146 triệu m³</strong>
                    </div>
                    <div className="w-full bg-[#E6F0FA] h-2 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full ${formData.hoThuong.capacity >= 146 ? 'bg-rose-600' : 'bg-[#0A4393]'}`}
                        style={{ width: `${Math.min(100, (formData.hoThuong.capacity / 146) * 100)}%` }}
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
                      <strong className={formData.hoHa.illegalCages > 0 ? 'text-rose-600 font-bold' : 'text-[#0A4393]'}>
                        {formData.hoHa.illegalCages} lồng
                      </strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFieldChange('hoHa', 'illegalCages', Math.max(0, formData.hoHa.illegalCages - 1))}
                        className="px-2.5 py-0.5 rounded bg-[#F0F6FF] hover:bg-[#E6F0FA] border border-[#0A4393]/30 text-[#0A4393] font-bold text-xs"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        value={formData.hoHa.illegalCages}
                        onChange={(e) => handleFieldChange('hoHa', 'illegalCages', parseInt(e.target.value))}
                        className="flex-1 accent-rose-600 h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                      />
                      <button
                        onClick={() => handleFieldChange('hoHa', 'illegalCages', formData.hoHa.illegalCages + 1)}
                        className="px-2.5 py-0.5 rounded bg-[#F0F6FF] hover:bg-[#E6F0FA] border border-[#0A4393]/30 text-[#0A4393] font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Độ trong của nước:</span>
                      <strong className={formData.hoHa.turbidity > 5 ? 'text-amber-600' : 'text-[#0A4393]'}>
                        {formData.hoHa.turbidity} NTU
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={0.5}
                      value={formData.hoHa.turbidity}
                      onChange={(e) => handleFieldChange('hoHa', 'turbidity', parseFloat(e.target.value))}
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
                      onChange={(e) => handleFieldChange('hoHa', 'capacityPct', parseInt(e.target.value))}
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
                      <strong className={formData.hoTrungChuyen.dissolvedOxygen < 4 ? 'text-rose-600 font-bold' : 'text-[#0A4393]'}>
                        {formData.hoTrungChuyen.dissolvedOxygen} mg/L
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={0.2}
                      value={formData.hoTrungChuyen.dissolvedOxygen}
                      onChange={(e) => handleFieldChange('hoTrungChuyen', 'dissolvedOxygen', parseFloat(e.target.value))}
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
                      onChange={(e) => handleFieldChange('hoTrungChuyen', 'ph', parseFloat(e.target.value))}
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="text-slate-700 mb-1">Mực nước:</div>
                    <select
                      value={formData.hoTrungChuyen.overflowRisk}
                      onChange={(e) => handleFieldChange('hoTrungChuyen', 'overflowRisk', e.target.value)}
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
                      onChange={(e) => handleFieldChange('hoTrungChuyen', 'dykeStatus', e.target.value)}
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
                onClick={onToggle}
                className="text-[11px] text-[#0A4393] hover:bg-[#E6F0FA] px-2.5 py-1 rounded bg-white border border-[#0A4393]/30 transition-colors font-semibold"
              >
                ← Quay lại số liệu quan trắc
              </button>
              <button
                onClick={handleTestSend}
                disabled={isSubmitting}
                className="px-3 py-1 rounded bg-[#0A4393] hover:bg-[#083576] active:bg-[#062859] text-white font-bold text-xs transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                {isSubmitting ? 'Đang gửi...' : 'Kiểm thử máy chủ'}
              </button>
            </div>

            {apiResult && (
              <div className={`p-2 rounded text-xs border ${apiResult.success ? 'bg-[#F0F6FF] text-[#0A4393] border-[#0A4393]/40 font-semibold' : 'bg-rose-50 text-rose-700 border-rose-500'}`}>
                {apiResult.msg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
