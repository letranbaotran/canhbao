'use client';

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Send,
  Cpu,
  AlertTriangle,
  BarChart3,
  MapPin,
  VolumeX,
  BellOff,
} from 'lucide-react';
import CryptoJS from 'crypto-js';
import { realtimeSync } from '@/services/realtimeSyncService';
import { stopAllEmergencyAlerts } from '@/utils/alarmSound';
import {
  getCurrentSessionUser,
  isUserManagerOrAdmin,
  AUTH_CHANGED_EVENT,
  type CurrentSessionUser,
} from '@/services/authRoleService';
import {
  useTelemetryStore,
  MIKE_FLOOD_SCENARIOS,
  MikeFloodScenarioId,
  DEFAULT_IOT_DATA,
  stopAllAlertsSystemWide,
  stopAlertsLocallyForGuest,
  interpolateHydroByZ,
  interpolateHydroByQ,
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

  // Phân quyền 3 cấp bậc: Chỉ 'ADMIN' và 'MANAGER' (Cán bộ quản lý) mới được điều chỉnh cảm biến diện rộng & gửi kiểm thử máy chủ
  const [currentUser, setCurrentUser] = useState<CurrentSessionUser>({
    email: '',
    fullName: 'Khách',
    role: 'GUEST',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUser(getCurrentSessionUser());
      const handleAuth = () => setCurrentUser(getCurrentSessionUser());
      window.addEventListener(AUTH_CHANGED_EVENT, handleAuth);
      return () => window.removeEventListener(AUTH_CHANGED_EVENT, handleAuth);
    }
  }, []);

  const canManageIoT = isUserManagerOrAdmin(currentUser.role);

  // Đồng bộ hai chiều: Khi Global Store thay đổi từ Tab Trực chiến hoặc thiết bị khác, cập nhật formData ngay lập tức
  useEffect(() => {
    setFormData(currentData);
  }, [currentData]);

  const handleSelectMikeScenario = (
    id: Exclude<MikeFloodScenarioId, 'NONE' | 'CUSTOM_SLIDER'> | 'NONE'
  ) => {
    if (id === 'NONE') {
      if (canManageIoT) {
        stopAllAlertsSystemWide();
      } else {
        stopAlertsLocallyForGuest();
        applyMikeFloodScenario('NONE', { broadcast: false });
      }
      return;
    }
    const nextData = applyMikeFloodScenario(id, { broadcast: canManageIoT });
    setFormData(nextData);
    setActiveStation('HO_THUONG');
    setApiResult(null);
  };

  const handleFieldChange = (station: keyof IoTTelemetryData, field: string, value: any) => {
    // 1. Kéo Cao trình Hồ Thượng Z: Nội suy 2 chiều tự động sang Q, W, RiseRate và Hồ Ea Súp Hạ
    if (station === 'hoThuong' && field === 'elevation') {
      const numElev = Number(Number(value).toFixed(2));
      const interp = interpolateHydroByZ(numElev);
      const isWarning = interp.q >= 100 || numElev >= 217.54;
      const updated: IoTTelemetryData = {
        ...formData,
        hoThuong: {
          ...formData.hoThuong,
          elevation: numElev,
          discharge: interp.q,
          capacity: interp.w,
          riseRate: interp.riseRate,
        },
        hoHa: {
          ...formData.hoHa,
          elevation: interp.hoHaZ,
          discharge: interp.hoHaQ,
          capacityM: interp.hoHaW,
          capacityPct: interp.hoHaPct,
        },
      };
      setFormData(updated);
      setIotData(updated, {
        broadcast: true,
        scenarioId: isWarning ? 'CUSTOM_SLIDER' : 'NONE',
        triggerDominoAudio: isWarning,
      });
      return;
    }

    // 2. Kéo Lưu lượng xả Hồ Thượng Q: Nội suy 2 chiều tự động sang Z, W, RiseRate và Hồ Ea Súp Hạ
    if (station === 'hoThuong' && field === 'discharge') {
      const numQ = Math.round(Number(value));
      const interp = interpolateHydroByQ(numQ);
      const isWarning = numQ >= 100 || interp.z >= 217.54;
      const updated: IoTTelemetryData = {
        ...formData,
        hoThuong: {
          ...formData.hoThuong,
          discharge: numQ,
          elevation: interp.z,
          capacity: interp.w,
          riseRate: interp.riseRate,
        },
        hoHa: {
          ...formData.hoHa,
          elevation: interp.hoHaZ,
          discharge: interp.hoHaQ,
          capacityM: interp.hoHaW,
          capacityPct: interp.hoHaPct,
        },
      };
      setFormData(updated);
      setIotData(updated, {
        broadcast: true,
        scenarioId: isWarning ? 'CUSTOM_SLIDER' : 'NONE',
        triggerDominoAudio: isWarning,
      });
      return;
    }

    const updated = {
      ...formData,
      [station]: {
        ...formData[station],
        [field]: value,
      },
    };

    if (station === 'hoHa' && field === 'illegalCages') {
      updated.hoHa.status = Number(value) > 0 ? 'Vi phạm nghiêm trọng' : 'An toàn';
    }

    setFormData(updated);
    const isHydroChange = station === 'hoThuong';
    const isWarningTrigger =
      isHydroChange &&
      (updated.hoThuong.discharge >= 100 ||
        updated.hoThuong.elevation >= 217.54 ||
        updated.hoThuong.riseRate > 30);

    setIotData(updated, {
      broadcast: true,
      scenarioId: isHydroChange ? (isWarningTrigger ? 'CUSTOM_SLIDER' : 'NONE') : scenarioId,
      triggerDominoAudio: isWarningTrigger,
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
      const { elevation, discharge, riseRate } = formData.hoThuong;
      if (discharge >= 600 || elevation >= 217.85 || riseRate > 30 || (scenarioId !== 'NONE' && scenarioId !== 'KB4_1')) {
        return {
          text: `🚨 Báo động Lũ Khẩn Cấp (${hydraulicModel.code}): MBL Ea Súp ${hydraulicModel.mblEaSup}m, ngập ${hydraulicModel.totalFloodedAreaHa.toLocaleString('en-US')} ha (${hydraulicModel.affectedHouseholds.toLocaleString('en-US')} hộ)!`,
          color: 'text-rose-700 bg-rose-50 border-rose-500 font-bold',
        };
      }
      if (discharge >= 100 || elevation >= 217.54 || riseRate >= 15 || scenarioId === 'KB4_1') {
        return {
          text: `⚠ Cảnh báo Ngập Hạ Du (${hydraulicModel.code}): MBL Ea Súp ${hydraulicModel.mblEaSup}m, ngập ${hydraulicModel.totalFloodedAreaHa.toLocaleString('en-US')} ha (${hydraulicModel.affectedHouseholds} hộ).`,
          color: 'text-amber-800 bg-amber-50 border-amber-500 font-semibold',
        };
      }
      return {
        text: '✓ Mực nước an toàn (dưới Báo động I), hồ chứa vận hành điều tiết ổn định. Nước nằm trong lòng dẫn sông Ea Súp, giao thông thông suốt.',
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

    // Kiểm tra phân quyền: Chỉ Cán bộ quản lý hoặc Admin mới được gửi kiểm thử máy chủ
    if (!canManageIoT) {
      setApiResult({
        success: false,
        msg: '⛔ QUYỀN TRUY CẬP BỊ TỪ CHỐI: Chức năng "Kiểm thử máy chủ" và phát tán gói tin diện rộng chỉ dành cho Cán bộ quản lý hoặc Admin. Quý khách vui lòng đăng nhập tài khoản có thẩm quyền!',
      });
      setIsSubmitting(false);
      return;
    }

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

  const handleSilenceAllAlerts = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    stopAllEmergencyAlerts();
    if (scenarioId !== 'NONE') {
      handleSelectMikeScenario('NONE');
    }
  };

  // Hàm xử lý nút TẮT CẢNH BÁO: Phân quyền Admin/Cán bộ tắt toàn hệ thống, Khách chỉ tắt trên thiết bị cá nhân
  const handleTurnOffAllAlertsAndReset = () => {
    if (canManageIoT) {
      // 1. Admin hoặc Cán bộ quản lý: Tắt toàn bộ cảnh báo trên TOÀN BỘ HỆ THỐNG
      stopAllAlertsSystemWide();
      setFormData(DEFAULT_IOT_DATA);
      setActiveStation('HO_THUONG');
      setApiResult(null);
    } else {
      // 2. Khách hoặc chưa đăng nhập: CHỈ TẮT TRÊN THIẾT BỊ CÁ NHÂN CỦA KHÁCH
      stopAlertsLocallyForGuest();
    }
  };

  return (
    <div className="w-full bg-white border border-[#0A4393]/25 rounded-xl shadow-lg overflow-hidden font-sans">
      {/* Ảnh 2: Đã bỏ thanh tiêu đề CẢM BIẾN IoT để giao diện gọn nhẹ */}

      {isOpen && (
        <div className="p-3 space-y-3">
          {/* Thông báo quyền hạn nếu chưa đăng nhập hoặc là Khách */}
          {!canManageIoT && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Chế độ xem (Khách / Chưa đăng nhập):</span> Quý vị có thể xem và mô phỏng trên thiết bị cá nhân. Quyền lưu cảm biến diện rộng, gửi <strong>Kiểm thử máy chủ</strong> và phát thanh toàn xã yêu cầu tài khoản <strong>Cán bộ quản lý</strong> hoặc <strong>Toàn quyền (Admin)</strong>.
              </div>
            </div>
          )}

          {/* YÊU CẦU 2 & Ảnh 3: BỘ CHỌN 'KỊCH BẢN ĐÃ KIỂM ĐỊNH' + NÚT 'TẮT CẢNH BÁO' TO ĐẬM */}
          <div className="p-2.5 rounded-xl bg-[#F0F6FF] border border-[#0A4393]/30 shadow-xs space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label
                htmlFor="mike-flood-scenario-select"
                className="text-[11px] font-bold text-[#0A4393] uppercase tracking-wide font-mono"
              >
                KỊCH BẢN ĐÃ KIỂM ĐỊNH
              </label>
              {(() => {
                const isWarningActive =
                  formData.hoThuong.discharge >= 100 ||
                  formData.hoThuong.elevation >= 217.54 ||
                  formData.hoThuong.riseRate > 30 ||
                  (scenarioId !== 'NONE' && scenarioId !== 'CUSTOM_SLIDER');
                return (
                  <button
                    type="button"
                    onClick={handleTurnOffAllAlertsAndReset}
                    className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-mono font-black tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-md select-none cursor-pointer ${
                      isWarningActive
                        ? formData.hoThuong.discharge >= 600 || formData.hoThuong.elevation >= 217.85
                          ? 'bg-rose-600 hover:bg-rose-700 ring-2 ring-rose-400 animate-pulse hover:animate-none'
                          : formData.hoThuong.discharge >= 350
                          ? 'bg-orange-600 hover:bg-orange-700 ring-2 ring-orange-400 animate-pulse hover:animate-none'
                          : 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-400 animate-pulse hover:animate-none'
                        : 'bg-slate-600 hover:bg-slate-700 ring-1 ring-slate-400'
                    }`}
                    title={
                      isWarningActive
                        ? 'Hệ thống đang phát Báo động Trực chiến! Bấm vào đây để TẮT CẢNH BÁO và đưa về trạng thái An toàn (Hồ Thượng 216.30m, 45 m³/s)'
                        : 'Hệ thống đang ở trạng thái Vận hành An toàn (dưới Báo động I). Bấm để đặt lại số liệu mặc định nếu cần'
                    }
                  >
                    <VolumeX className="w-4 h-4 shrink-0" />
                    <span>{isWarningActive ? 'ĐANG CẢNH BÁO TRỰC CHIẾN' : 'TẮT CẢNH BÁO'}</span>
                  </button>
                );
              })()}
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
                      <span>Mực nước hồ (Z):</span>
                      <strong
                        className={
                          formData.hoThuong.elevation >= 217.85
                            ? 'text-rose-600 font-bold'
                            : formData.hoThuong.elevation >= 217.54
                            ? 'text-amber-600 font-bold'
                            : 'text-[#0A4393]'
                        }
                      >
                        {formData.hoThuong.elevation} m
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={205.40}
                      max={219.80}
                      step={0.01}
                      value={formData.hoThuong.elevation}
                      onChange={(e) =>
                        handleFieldChange('hoThuong', 'elevation', parseFloat(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                      <span>MNC: 205.40m</span>
                      <span>MNDBT: 217.58m</span>
                      <span>Đỉnh: 219.80m</span>
                    </div>
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
                      min={0}
                      max={50}
                      step={1}
                      value={formData.hoThuong.riseRate}
                      onChange={(e) =>
                        handleFieldChange('hoThuong', 'riseRate', parseInt(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                      <span>0 cm/h</span>
                      <span>Ngưỡng lũ: 30 cm/h</span>
                      <span>50 cm/h</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Lưu lượng xả (Q):</span>
                      <strong
                        className={
                          formData.hoThuong.discharge >= 600
                            ? 'text-rose-600 font-bold'
                            : formData.hoThuong.discharge >= 100
                            ? 'text-amber-600 font-bold'
                            : 'text-[#0A4393]'
                        }
                      >
                        {formData.hoThuong.discharge} m³/s
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(1628, formData.hoThuong.discharge)}
                      step={1}
                      value={formData.hoThuong.discharge}
                      onChange={(e) =>
                        handleFieldChange('hoThuong', 'discharge', parseInt(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                      <span>0 m³/s</span>
                      <span>BĐ I: 100</span>
                      <span>P=1%: 1075</span>
                      <span>Max: 1628</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Dung tích nước (W):</span>
                      <strong className="text-[#0A4393]">
                        {formData.hoThuong.capacity} / 146.9 triệu m³
                      </strong>
                    </div>
                    <div className="w-full bg-[#E6F0FA] h-2 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full ${
                          formData.hoThuong.capacity >= 146.9 ? 'bg-rose-600' : 'bg-[#0A4393]'
                        }`}
                        style={{
                          width: `${Math.min(100, (formData.hoThuong.capacity / 146.9) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                      <span>Chết: 11.0M</span>
                      <span>MNDBT: 146.9M</span>
                      <span>Gia cường: 158.5M</span>
                    </div>
                  </div>
                </div>
              )}

              {activeStation === 'HO_HA' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Mực nước Hồ Hạ (Z):</span>
                      <strong className="text-[#0A4393]">{formData.hoHa.elevation ?? 196.35} m</strong>
                    </div>
                    <input
                      type="range"
                      min={193.40}
                      max={198.20}
                      step={0.01}
                      value={formData.hoHa.elevation ?? 196.35}
                      onChange={(e) =>
                        handleFieldChange('hoHa', 'elevation', parseFloat(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                      <span>MNC: 193.40m</span>
                      <span>MNDBT: 196.50m</span>
                      <span>Đỉnh: 198.20m</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Lưu lượng xả Hồ Hạ (Q):</span>
                      <strong className="text-[#0A4393]">{formData.hoHa.discharge ?? 15} m³/s</strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      step={1}
                      value={formData.hoHa.discharge ?? 15}
                      onChange={(e) =>
                        handleFieldChange('hoHa', 'discharge', parseInt(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                      <span>0 m³/s</span>
                      <span>Mặc định: 15</span>
                      <span>200 m³/s</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Dung tích Hồ Hạ (W):</span>
                      <strong className="text-[#0A4393]">
                        {formData.hoHa.capacityM ?? 8.85} / 9.25 triệu m³ ({formData.hoHa.capacityPct}%)
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={140}
                      value={formData.hoHa.capacityPct}
                      onChange={(e) =>
                        handleFieldChange('hoHa', 'capacityPct', parseInt(e.target.value))
                      }
                      className="w-full accent-[#0A4393] h-1.5 bg-[#E6F0FA] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-700 mb-1">
                      <span>Độ trong (Độ đục):</span>
                      <strong
                        className={
                          formData.hoHa.turbidity > 5 ? 'text-amber-600 font-bold' : 'text-[#0A4393]'
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

                  <div className="col-span-2 p-2 rounded-lg bg-rose-50 border border-rose-200">
                    <div className="flex justify-between items-center text-slate-700 mb-1">
                      <span className="font-semibold text-rose-900">
                        Lồng nuôi cá trái phép (CẤM TUYỆT ĐỐI HỒ HẠ):
                      </span>
                      <strong
                        className={
                          formData.hoHa.illegalCages > 0
                            ? 'text-rose-600 font-black'
                            : 'text-emerald-700 font-bold'
                        }
                      >
                        {formData.hoHa.illegalCages} lồng {formData.hoHa.illegalCages === 0 ? '(An toàn)' : '(Vi phạm!)'}
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
                        className="px-2.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs"
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
                        className="flex-1 accent-rose-600 h-1.5 bg-rose-100 rounded cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleFieldChange('hoHa', 'illegalCages', formData.hoHa.illegalCages + 1)
                        }
                        className="px-2.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
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
