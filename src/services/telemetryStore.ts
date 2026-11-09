'use client';

import { useSyncExternalStore, useMemo } from 'react';
import { realtimeSync } from '@/services/realtimeSyncService';
import { getVillageScenarioImpact } from '@/data/village_disaster_profiles';
import { stopAllEmergencyAlerts, alarmSystem } from '@/utils/alarmSound';

export interface IoTTelemetryData {
  tk293: {
    temperature: number; // °C
    humidity: number; // %
    smokeCo: number; // ppm
    windSpeed: number; // m/s
  };
  hoThuong: {
    elevation: number; // m (Z: 205.40 - 219.80m)
    discharge: number; // m³/s (Q: 0 - 1628m³/s, cực đại vỡ đập tới 7201m³/s)
    capacity: number; // M m³ (W: 11.0 - 175.0M m³, MNDBT 146.9M m³)
    riseRate: number; // cm/h
  };
  hoHa: {
    status: 'An toàn' | 'Cảnh báo ô nhiễm' | 'Vi phạm nghiêm trọng';
    turbidity: number; // NTU
    illegalCages: number; // Số lồng bè vi phạm
    capacityPct: number; // % dung tích (MNDBT 9.25M m³)
    elevation: number; // Cao trình (m, MNC 193.40m, MNDBT 196.50m)
    discharge: number; // Lưu lượng xả (m³/s)
    capacityM: number; // Dung tích thực tế (M m³)
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
    humidity: 57,
    smokeCo: 11,
    windSpeed: 2.8,
  },
  hoThuong: {
    elevation: 216.30,
    discharge: 45,
    capacity: 120.5,
    riseRate: 2,
  },
  hoHa: {
    status: 'An toàn',
    turbidity: 4.3,
    illegalCages: 0,
    capacityPct: 95.7,
    elevation: 196.35,
    discharge: 15,
    capacityM: 8.85,
  },
  hoTrungChuyen: {
    dissolvedOxygen: 6.8,
    ph: 7.4,
    overflowRisk: 'Thấp',
    dykeStatus: 'Ổn định',
  },
};

type Listener = () => void;

export type MikeFloodScenarioId =
  | 'NONE'
  | 'KB4_1'
  | 'KB1_1'
  | 'KB1_2'
  | 'KB2_1'
  | 'KB5_2'
  | 'CUSTOM_SLIDER';

export interface FloodDepthDistribution {
  under0_5m: number; // < 0.5m (ha)
  from0_5to1m: number; // 0.5 - 1m (ha)
  from1to2m: number; // 1 - 2m (ha)
  from2to3m: number; // 2 - 3m (ha)
  over3m: number; // > 3m (ha)
}

export interface MikeFloodScenarioMeta {
  id: MikeFloodScenarioId;
  code: string;
  shortTitle: string;
  fullName: string;
  probabilityLabel: string;
  mblEaSup: number; // Mực nước tại Mốc báo lũ Ea Súp (m)
  diffBd3EaSup: number; // Chênh lệch so với BĐ III Ea Súp (189.0m)
  mblEaRok: number; // Mực nước tại Mốc báo lũ Hạ lưu Ea Rốk (m)
  diffBd3EaRok: number; // Chênh lệch so với BĐ III Ea Rốk (169.0m)
  hoThuongElevation: number; // Cao trình Hồ Thượng tương ứng (m)
  hoThuongDischarge: number; // Lưu lượng xả (m3/s)
  hoThuongRiseRate: number; // Tốc độ dâng (cm/h)
  totalFloodedAreaHa: number; // Tổng diện tích ngập xã Ea Súp (ha)
  affectedHouseholds: number; // Số hộ bị ảnh hưởng
  affectedPeople: number; // Số nhân khẩu bị ảnh hưởng
  ql14cFloodedKm: number; // Ngập QL14C (km)
  tl681FloodedKm: number; // Ngập Tỉnh lộ 681 (km)
  infrastructureNotes: string[];
  depthDistribution: FloodDepthDistribution;
  affectedVillages: string[];
  criticalVillages: string[];
}

export const FLOOD_BENCHMARKS = {
  EA_SUP_CENTER: {
    name: 'Mốc báo lũ Ea Súp (Trung tâm xã)',
    bd1: 185.0,
    bd2: 187.0,
    bd3: 189.0,
  },
  EA_ROK_DOWNSTREAM: {
    name: 'Mốc báo lũ Hạ lưu (Ea Rốk)',
    bd1: 166.0,
    bd2: 167.5,
    bd3: 169.0,
  },
} as const;

export const CORE_FLOOD_AFFECTED_VILLAGES = [
  'Thôn Đoàn Kết',
  'Thôn 5',
  'Thôn 6',
  'Thôn 7',
  'Thôn 8',
  'Thôn 9',
  'Thôn 10',
  'Thôn 11',
  'Thôn Bình Lợi',
] as const;

export interface HydroPiecewiseBenchmark {
  q: number; // m³/s
  z: number; // m
  w: number; // M m³
  riseRate: number; // cm/h
  hoHaZ: number; // m
  hoHaQ: number; // m³/s
  hoHaW: number; // M m³
  hoHaPct: number; // %
}

export const HYDRO_PIECEWISE_BENCHMARKS: HydroPiecewiseBenchmark[] = [
  { q: 0, z: 215.50, w: 110.0, riseRate: 0, hoHaZ: 195.80, hoHaQ: 0, hoHaW: 7.80, hoHaPct: 84.3 },
  { q: 20, z: 215.97, w: 116.0, riseRate: 1, hoHaZ: 195.97, hoHaQ: 5, hoHaW: 8.20, hoHaPct: 88.6 },
  { q: 45, z: 216.30, w: 120.5, riseRate: 2, hoHaZ: 196.35, hoHaQ: 15, hoHaW: 8.85, hoHaPct: 95.7 },
  { q: 100, z: 217.54, w: 142.5, riseRate: 6, hoHaZ: 196.40, hoHaQ: 25, hoHaW: 9.05, hoHaPct: 97.8 },
  { q: 350, z: 217.58, w: 146.9, riseRate: 12, hoHaZ: 196.45, hoHaQ: 50, hoHaW: 9.25, hoHaPct: 100.0 },
  { q: 600, z: 217.85, w: 151.5, riseRate: 22, hoHaZ: 196.51, hoHaQ: 65, hoHaW: 9.35, hoHaPct: 101.1 },
  { q: 766, z: 217.95, w: 153.0, riseRate: 23, hoHaZ: 196.53, hoHaQ: 69, hoHaW: 9.40, hoHaPct: 101.6 },
  { q: 792, z: 218.10, w: 154.5, riseRate: 24, hoHaZ: 196.54, hoHaQ: 83, hoHaW: 9.50, hoHaPct: 102.7 },
  { q: 1075, z: 218.46, w: 158.51, riseRate: 25, hoHaZ: 196.95, hoHaQ: 124.5, hoHaW: 10.83, hoHaPct: 117.1 },
  { q: 1202, z: 219.08, w: 170.12, riseRate: 32, hoHaZ: 197.34, hoHaQ: 143.0, hoHaW: 12.36, hoHaPct: 133.6 },
  { q: 1628, z: 219.47, w: 175.0, riseRate: 38, hoHaZ: 197.35, hoHaQ: 152.0, hoHaW: 12.45, hoHaPct: 134.6 },
];

/**
 * Nội suy tuyến tính từng đoạn theo Cao trình Z (205.40m -> 219.80m)
 */
export function interpolateHydroByZ(z: number): HydroPiecewiseBenchmark {
  const clampedZ = Math.max(205.40, Math.min(219.80, Number(z.toFixed(2))));

  // Vùng dưới ngưỡng mốc 0 (205.40 -> 215.50m: Đóng tràn hoàn toàn Q=0)
  if (clampedZ <= 215.50) {
    const ratio = Math.max(0, (clampedZ - 205.40) / (215.50 - 205.40));
    return {
      q: 0,
      z: clampedZ,
      w: Number((11.0 + ratio * (110.0 - 11.0)).toFixed(1)),
      riseRate: 0,
      hoHaZ: Number((193.40 + ratio * (195.80 - 193.40)).toFixed(2)),
      hoHaQ: 0,
      hoHaW: Number((1.0 + ratio * (7.80 - 1.0)).toFixed(2)),
      hoHaPct: Number((10.8 + ratio * (84.3 - 10.8)).toFixed(1)),
    };
  }

  // Vùng trên mốc cao nhất (> 219.47m đến đỉnh đập 219.80m)
  const last = HYDRO_PIECEWISE_BENCHMARKS[HYDRO_PIECEWISE_BENCHMARKS.length - 1];
  if (clampedZ >= last.z) {
    const extraRatio = Math.min(1.0, (clampedZ - last.z) / (219.80 - last.z));
    return {
      q: Math.round(last.q + extraRatio * 400),
      z: clampedZ,
      w: Number((last.w + extraRatio * 5.0).toFixed(1)),
      riseRate: Math.round(last.riseRate + extraRatio * 12),
      hoHaZ: Number((last.hoHaZ + extraRatio * 0.45).toFixed(2)),
      hoHaQ: Number((last.hoHaQ + extraRatio * 21.5).toFixed(1)),
      hoHaW: Number((last.hoHaW + extraRatio * 0.5).toFixed(2)),
      hoHaPct: Number((last.hoHaPct + extraRatio * 5.0).toFixed(1)),
    };
  }

  // Tìm đoạn giữa 2 mốc
  for (let i = 0; i < HYDRO_PIECEWISE_BENCHMARKS.length - 1; i++) {
    const p1 = HYDRO_PIECEWISE_BENCHMARKS[i];
    const p2 = HYDRO_PIECEWISE_BENCHMARKS[i + 1];
    if (clampedZ >= p1.z && clampedZ <= p2.z) {
      const span = p2.z - p1.z;
      const ratio = span > 0 ? (clampedZ - p1.z) / span : 0;
      return {
        q: Math.round(p1.q + ratio * (p2.q - p1.q)),
        z: clampedZ,
        w: Number((p1.w + ratio * (p2.w - p1.w)).toFixed(1)),
        riseRate: Math.round(p1.riseRate + ratio * (p2.riseRate - p1.riseRate)),
        hoHaZ: Number((p1.hoHaZ + ratio * (p2.hoHaZ - p1.hoHaZ)).toFixed(2)),
        hoHaQ: Number((p1.hoHaQ + ratio * (p2.hoHaQ - p1.hoHaQ)).toFixed(1)),
        hoHaW: Number((p1.hoHaW + ratio * (p2.hoHaW - p1.hoHaW)).toFixed(2)),
        hoHaPct: Number((p1.hoHaPct + ratio * (p2.hoHaPct - p1.hoHaPct)).toFixed(1)),
      };
    }
  }

  return HYDRO_PIECEWISE_BENCHMARKS[2]; // Fallback mốc mặc định Q=45
}

/**
 * Nội suy tuyến tính từng đoạn theo Lưu lượng xả Q (0 -> 1628 m³/s, hoặc cực đại vỡ đập)
 */
export function interpolateHydroByQ(q: number): HydroPiecewiseBenchmark {
  const clampedQ = Math.max(0, Math.min(7500, Number(q)));

  // Nếu là kịch bản vỡ đập lớn (Q > 1628 m³/s)
  if (clampedQ > 1628) {
    const last = HYDRO_PIECEWISE_BENCHMARKS[HYDRO_PIECEWISE_BENCHMARKS.length - 1];
    return {
      q: clampedQ,
      z: 219.80,
      w: 175.0,
      riseRate: clampedQ >= 7000 ? 48 : 50,
      hoHaZ: 198.20,
      hoHaQ: 173.5,
      hoHaW: 12.80,
      hoHaPct: 138.4,
    };
  }

  // Tìm đoạn giữa 2 mốc chuẩn
  for (let i = 0; i < HYDRO_PIECEWISE_BENCHMARKS.length - 1; i++) {
    const p1 = HYDRO_PIECEWISE_BENCHMARKS[i];
    const p2 = HYDRO_PIECEWISE_BENCHMARKS[i + 1];
    if (clampedQ >= p1.q && clampedQ <= p2.q) {
      const span = p2.q - p1.q;
      const ratio = span > 0 ? (clampedQ - p1.q) / span : 0;
      return {
        q: clampedQ,
        z: Number((p1.z + ratio * (p2.z - p1.z)).toFixed(2)),
        w: Number((p1.w + ratio * (p2.w - p1.w)).toFixed(1)),
        riseRate: Math.round(p1.riseRate + ratio * (p2.riseRate - p1.riseRate)),
        hoHaZ: Number((p1.hoHaZ + ratio * (p2.hoHaZ - p1.hoHaZ)).toFixed(2)),
        hoHaQ: Number((p1.hoHaQ + ratio * (p2.hoHaQ - p1.hoHaQ)).toFixed(1)),
        hoHaW: Number((p1.hoHaW + ratio * (p2.hoHaW - p1.hoHaW)).toFixed(2)),
        hoHaPct: Number((p1.hoHaPct + ratio * (p2.hoHaPct - p1.hoHaPct)).toFixed(1)),
      };
    }
  }

  return HYDRO_PIECEWISE_BENCHMARKS[2]; // Fallback mốc mặc định Q=45
}

export const MIKE_FLOOD_SCENARIOS: Record<
  Exclude<MikeFloodScenarioId, 'NONE' | 'CUSTOM_SLIDER'>,
  MikeFloodScenarioMeta
> = {
  KB4_1: {
    id: 'KB4_1',
    code: 'KB4.1',
    shortTitle: 'KB4.1 • Xả lũ thường xuyên (P=10%)',
    fullName: 'Kịch bản KB4.1: Xả lũ thường xuyên tần suất P=10%',
    probabilityLabel: 'P = 10%',
    mblEaSup: 189.11,
    diffBd3EaSup: 0.11,
    mblEaRok: 169.08,
    diffBd3EaRok: 0.08,
    hoThuongElevation: 217.95,
    hoThuongDischarge: 766,
    hoThuongRiseRate: 23,
    totalFloodedAreaHa: 1413.17,
    affectedHouseholds: 419,
    affectedPeople: 1676,
    ql14cFloodedKm: 1.31,
    tl681FloodedKm: 10.65,
    infrastructureNotes: [
      'Ngập Quốc lộ 14C chiều dài 1.31 km',
      'Ngập Tỉnh lộ 681 chiều dài 10.65 km',
    ],
    depthDistribution: {
      under0_5m: 538.42,
      from0_5to1m: 395.69,
      from1to2m: 356.12,
      from2to3m: 98.92,
      over3m: 24.02,
    },
    affectedVillages: [...CORE_FLOOD_AFFECTED_VILLAGES],
    criticalVillages: ['Thôn Đoàn Kết', 'Thôn 8', 'Thôn Bình Lợi'],
  },
  KB1_1: {
    id: 'KB1_1',
    code: 'KB1.1',
    shortTitle: 'KB1.1 • Xả lũ khẩn cấp thiết kế (P=1%)',
    fullName: 'Kịch bản KB1.1: Xả lũ khẩn cấp tần suất thiết kế P=1%',
    probabilityLabel: 'P = 1%',
    mblEaSup: 189.56,
    diffBd3EaSup: 0.56,
    mblEaRok: 169.45,
    diffBd3EaRok: 0.45,
    hoThuongElevation: 218.46,
    hoThuongDischarge: 1075,
    hoThuongRiseRate: 25,
    totalFloodedAreaHa: 1613.76,
    affectedHouseholds: 533,
    affectedPeople: 2132,
    ql14cFloodedKm: 4.1,
    tl681FloodedKm: 13.1,
    infrastructureNotes: [
      'Ngập Bệnh viện Đa khoa Ea Súp (độ sâu 1 - 2m)',
      'Ngập Trường Mầm non Hoa Phượng (độ sâu 2 - 3m)',
      'Ngập Quốc lộ 14C: 4.10 km • Tỉnh lộ 681: 13.10 km',
    ],
    depthDistribution: {
      under0_5m: 583.07,
      from0_5to1m: 433.36,
      from1to2m: 426.02,
      from2to3m: 137.17,
      over3m: 34.14,
    },
    affectedVillages: [...CORE_FLOOD_AFFECTED_VILLAGES, 'Thôn 1', 'Thôn 2'],
    criticalVillages: [
      'Thôn Đoàn Kết',
      'Thôn 5',
      'Thôn 6',
      'Thôn 7',
      'Thôn 8',
      'Thôn Bình Lợi',
    ],
  },
  KB1_2: {
    id: 'KB1_2',
    code: 'KB1.2',
    shortTitle: 'KB1.2 • Xả lũ kiểm tra (P=0.2%)',
    fullName: 'Kịch bản KB1.2: Xả lũ kiểm tra tần suất P=0.2%',
    probabilityLabel: 'P = 0.2%',
    mblEaSup: 189.83,
    diffBd3EaSup: 0.83,
    mblEaRok: 169.72,
    diffBd3EaRok: 0.72,
    hoThuongElevation: 219.08,
    hoThuongDischarge: 1202,
    hoThuongRiseRate: 32,
    totalFloodedAreaHa: 1663.48,
    affectedHouseholds: 592,
    affectedPeople: 2368,
    ql14cFloodedKm: 4.45,
    tl681FloodedKm: 13.85,
    infrastructureNotes: [
      'Ngập sâu Bệnh viện Đa khoa Ea Súp & Trường MN Hoa Phượng',
      'Chia cắt Quốc lộ 14C (4.45 km) và Tỉnh lộ 681 (13.85 km)',
    ],
    depthDistribution: {
      under0_5m: 588.87,
      from0_5to1m: 442.49,
      from1to2m: 445.81,
      from2to3m: 146.39,
      over3m: 39.92,
    },
    affectedVillages: [...CORE_FLOOD_AFFECTED_VILLAGES, 'Thôn 1', 'Thôn 2', 'Thôn 3'],
    criticalVillages: [...CORE_FLOOD_AFFECTED_VILLAGES],
  },
  KB2_1: {
    id: 'KB2_1',
    code: 'KB2.1',
    shortTitle: 'KB2.1 • Khẩn cấp Vỡ đập ngày mưa (P=1%)',
    fullName: 'Kịch bản KB2.1: Tình huống khẩn cấp Vỡ đập ngày mưa P=1%',
    probabilityLabel: 'Vỡ đập P=1%',
    mblEaSup: 193.82,
    diffBd3EaSup: 4.82,
    mblEaRok: 172.65,
    diffBd3EaRok: 3.65,
    hoThuongElevation: 219.80,
    hoThuongDischarge: 6632,
    hoThuongRiseRate: 50,
    totalFloodedAreaHa: 2512.06,
    affectedHouseholds: 1026,
    affectedPeople: 4104,
    ql14cFloodedKm: 8.6,
    tl681FloodedKm: 18.4,
    infrastructureNotes: [
      'Ngập sâu >2m lên tới 1,472.28 ha tại vùng trũng hạ du',
      'Ngập 18 công trình công cộng trọng yếu toàn xã Ea Súp',
      'Tê liệt hoàn toàn tuyến Quốc lộ 14C và Tỉnh lộ 681',
    ],
    depthDistribution: {
      under0_5m: 284.5,
      from0_5to1m: 342.18,
      from1to2m: 413.1,
      from2to3m: 685.4,
      over3m: 786.88, // 685.40 + 786.88 = 1,472.28 ha (>2m)
    },
    affectedVillages: [
      ...CORE_FLOOD_AFFECTED_VILLAGES,
      'Thôn 1',
      'Thôn 2',
      'Thôn 3',
      'Thôn 4',
      'Thôn Thắng Lợi',
      'Thôn Hòa Bình',
    ],
    criticalVillages: [...CORE_FLOOD_AFFECTED_VILLAGES, 'Thôn 1', 'Thôn 2'],
  },
  KB5_2: {
    id: 'KB5_2',
    code: 'KB5.2',
    shortTitle: 'KB5.2 • Biến đổi khí hậu (RCP 4.5)',
    fullName: 'Kịch bản KB5.2: Biến đổi khí hậu kịch bản RCP 4.5',
    probabilityLabel: 'BĐKH RCP 4.5',
    mblEaSup: 194.15,
    diffBd3EaSup: 5.15,
    mblEaRok: 172.9,
    diffBd3EaRok: 3.9,
    hoThuongElevation: 219.80,
    hoThuongDischarge: 7201,
    hoThuongRiseRate: 48,
    totalFloodedAreaHa: 2547.26,
    affectedHouseholds: 1064,
    affectedPeople: 4256,
    ql14cFloodedKm: 9.1,
    tl681FloodedKm: 19.2,
    infrastructureNotes: [
      'Diện tích ngập cực đại 2,547.26 ha theo kịch bản BĐKH RCP 4.5',
      'Ảnh hưởng 1,064 hộ dân (4,256 nhân khẩu) và hơn 18 công trình công cộng',
    ],
    depthDistribution: {
      under0_5m: 289.1,
      from0_5to1m: 348.5,
      from1to2m: 418.2,
      from2to3m: 695.08,
      over3m: 796.38,
    },
    affectedVillages: [
      ...CORE_FLOOD_AFFECTED_VILLAGES,
      'Thôn 1',
      'Thôn 2',
      'Thôn 3',
      'Thôn 4',
      'Thôn Thắng Lợi',
      'Thôn Hòa Bình',
    ],
    criticalVillages: [...CORE_FLOOD_AFFECTED_VILLAGES, 'Thôn 1', 'Thôn 2'],
  },
};

export interface DynamicBulletin {
  id: string;
  title: string;
  content: string;
  audioUrl: string;
  voiceLabel: string;
  alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

let currentTelemetryState: IoTTelemetryData = DEFAULT_IOT_DATA;
let currentScenarioId: MikeFloodScenarioId = 'NONE';
let lastDominoAutoPlayTs: number = 0;
let customVillageBulletin: DynamicBulletin | null = null;

const listeners = new Set<Listener>();
let isRealtimeHooked = false;

function emitChange() {
  listeners.forEach((listener) => listener());
}

function ensureRealtimeSubscription() {
  if (isRealtimeHooked || typeof window === 'undefined') return;
  isRealtimeHooked = true;
  realtimeSync.onSync((msg) => {
    if (!msg) return;

    if (msg.action === 'STOP_ALL_ALERTS_SYSTEM_WIDE') {
      // 1. Tắt toàn bộ âm thanh còi hú và đọc AI trên mọi thiết bị
      stopAllEmergencyAlerts();
      // 2. Đặt lại kịch bản lũ về NONE
      currentScenarioId = 'NONE';
      // 3. Đặt lại dữ liệu telemetry về bình thường
      currentTelemetryState = msg.data || DEFAULT_IOT_DATA;
      customVillageBulletin = null;
      // 4. Cho phép thiết bị nhận báo động mới trong tương lai
      alarmSystem.setMuted(false);
      emitChange();
      return;
    }

    if (msg.data) {
      currentTelemetryState = msg.data;
      if (
        msg.data.hoThuong.elevation >= 208.6 ||
        msg.data.hoThuong.riseRate >= 30 ||
        msg.data.tk293.temperature >= 45
      ) {
        alarmSystem.setMuted(false);
      }
    }
    if (msg.scenarioId !== undefined) {
      currentScenarioId = msg.scenarioId as MikeFloodScenarioId;
      if (currentScenarioId !== 'NONE' && currentScenarioId !== 'CUSTOM_SLIDER') {
        // Tự động kích hoạt phát thanh AI đồng bộ trên máy nhận khi chuyển kịch bản
        lastDominoAutoPlayTs = Date.now();
        // Mở lại quyền phát còi hú cho kịch bản báo động mới
        alarmSystem.setMuted(false);
      }
    }
    customVillageBulletin = null;
    emitChange();
  });
}

/**
 * Nội suy động trạng thái thủy lực MIKE FLOOD khi người dùng chọn Kịch bản chuẩn
 * hoặc kéo thanh trượt mực nước Hồ Thượng / lưu lượng xả bất kỳ.
 */
export function computeActiveHydraulicModel(
  iotData: IoTTelemetryData,
  scenarioId: MikeFloodScenarioId
): MikeFloodScenarioMeta {
  if (scenarioId !== 'NONE' && scenarioId !== 'CUSTOM_SLIDER') {
    return MIKE_FLOOD_SCENARIOS[scenarioId];
  }

  const elev = iotData.hoThuong.elevation;
  const discharge = iotData.hoThuong.discharge;
  const riseRate = iotData.hoThuong.riseRate;

  // 1. TRẠNG THÁI AN TOÀN: Khi lưu lượng xả Q < 100 m³/s và cao trình Z < 217.54m (và chưa chọn kịch bản lũ)
  if (scenarioId === 'NONE' || (discharge < 100 && elev < 217.54)) {
    const safeQ = Math.max(0, Math.min(99, discharge));
    const mblEaSup = Number((184.20 + (safeQ / 100) * 0.75).toFixed(2)); // Luôn < 185.00m (Dưới BĐ I)
    const mblEaRok = Number((165.20 + (safeQ / 100) * 0.70).toFixed(2)); // Luôn < 166.00m (Dưới BĐ I)
    return {
      id: 'NONE',
      code: 'AN TOÀN',
      shortTitle: 'Vận hành An toàn (Dưới Báo động I)',
      fullName: 'Trạng thái vận hành điều tiết bình thường (Dưới Báo động I)',
      probabilityLabel: 'An toàn',
      mblEaSup,
      diffBd3EaSup: Number((mblEaSup - 189.0).toFixed(2)),
      mblEaRok,
      diffBd3EaRok: Number((mblEaRok - 169.0).toFixed(2)),
      hoThuongElevation: elev,
      hoThuongDischarge: discharge,
      hoThuongRiseRate: riseRate,
      totalFloodedAreaHa: 0,
      affectedHouseholds: 0,
      affectedPeople: 0,
      ql14cFloodedKm: 0,
      tl681FloodedKm: 0,
      infrastructureNotes: [
        '✓ Mực nước an toàn (dưới Báo động I), hồ chứa vận hành điều tiết ổn định. Nước nằm trong lòng dẫn sông Ea Súp, giao thông thông suốt',
      ],
      depthDistribution: {
        under0_5m: 0,
        from0_5to1m: 0,
        from1to2m: 0,
        from2to3m: 0,
        over3m: 0,
      },
      affectedVillages: [],
      criticalVillages: [],
    };
  }

  // 2. TRẠNG THÁI CẢNH BÁO TRỰC CHIẾN (Q >= 100 m³/s hoặc Z >= 217.54m)
  // Phân chia theo 4 cấp độ lưu lượng xả và cao trình
  let totalFloodedAreaHa = 0;
  let affectedHouseholds = 0;
  let affectedPeople = 0;
  let ql14cFloodedKm = 0;
  let tl681FloodedKm = 0;
  let mblEaSup = 185.0;
  let mblEaRok = 166.0;
  let code = 'CẢNH BÁO';
  let shortTitle = 'Cảnh báo Ngập lũ Hạ du';
  let fullName = 'Cảnh báo Ngập lụt Hạ du Sông Ea Súp';
  let infrastructureNotes: string[] = [];
  let depthDist: FloodDepthDistribution = {
    under0_5m: 0,
    from0_5to1m: 0,
    from1to2m: 0,
    from2to3m: 0,
    over3m: 0,
  };
  let affectedVillages: string[] = [];
  let criticalVillages: string[] = [];

  if (discharge < 350) {
    // CẤP ĐỘ 1: 100 <= Q < 350 m³/s (Bắt đầu ngập nông vùng trũng ven sông)
    const r = (discharge - 100) / (350 - 100);
    totalFloodedAreaHa = Number((28.5 + r * (485.0 - 28.5)).toFixed(2));
    affectedHouseholds = Math.round(15 + r * (110 - 15));
    ql14cFloodedKm = Number((0 + r * 0.4).toFixed(2));
    tl681FloodedKm = Number((0 + r * 3.2).toFixed(2));
    mblEaSup = Number((185.00 + r * (187.00 - 185.00)).toFixed(2)); // Báo động I -> Báo động II
    mblEaRok = Number((166.00 + r * (167.50 - 166.00)).toFixed(2));
    code = 'CẤP 1 (BĐ I)';
    shortTitle = `Cảnh báo Lũ Cấp 1 (Xả ${discharge} m³/s)`;
    fullName = `Cảnh báo Lũ Cấp 1 (Báo động I): Hồ Thượng xả ${discharge} m³/s (TB 135/TB-TL)`;
    infrastructureNotes = [
      'Ngập nông vùng trũng mép suối Ea Súp tại Thôn Đoàn Kết và Thôn 8',
      'Các trục đường giao thông chính thông suốt, giao thông nội đồng bị ngập cục bộ',
    ];
    depthDist = {
      under0_5m: Number((totalFloodedAreaHa * 0.75).toFixed(2)),
      from0_5to1m: Number((totalFloodedAreaHa * 0.25).toFixed(2)),
      from1to2m: 0,
      from2to3m: 0,
      over3m: 0,
    };
    affectedVillages = ['Thôn Đoàn Kết', 'Thôn 8'];
    criticalVillages = ['Thôn Đoàn Kết'];
  } else if (discharge < 600) {
    // CẤP ĐỘ 2: 350 <= Q < 600 m³/s (Mở 02 cửa tràn - TB 130 & 131/TB-TL)
    const r = (discharge - 350) / (600 - 350);
    totalFloodedAreaHa = Number((485.0 + r * (1150.0 - 485.0)).toFixed(2));
    affectedHouseholds = Math.round(110 + r * (340 - 110));
    ql14cFloodedKm = Number((0.4 + r * (1.1 - 0.4)).toFixed(2));
    tl681FloodedKm = Number((3.2 + r * (8.5 - 3.2)).toFixed(2));
    mblEaSup = Number((187.00 + r * (188.95 - 187.00)).toFixed(2)); // Báo động II -> Dưới BĐ III
    mblEaRok = Number((167.50 + r * (168.90 - 167.50)).toFixed(2));
    code = 'CẤP 2 (BĐ II)';
    shortTitle = `Cảnh báo Lũ Cấp 2 (Mở 02 cửa tràn ${discharge} m³/s)`;
    fullName = `Cảnh báo Lũ Cấp 2 (Báo động II): Mở 02 cửa tràn xả ${discharge} m³/s`;
    infrastructureNotes = [
      'Mở 02 cửa tràn đón lũ theo Thông báo số 130 & 131/TB-TL',
      'Ngập cục bộ Tỉnh lộ 681 qua Thôn Đoàn Kết và khu vực trũng Thôn 8, Thôn Bình Lợi',
    ];
    depthDist = {
      under0_5m: Number((totalFloodedAreaHa * 0.45).toFixed(2)),
      from0_5to1m: Number((totalFloodedAreaHa * 0.35).toFixed(2)),
      from1to2m: Number((totalFloodedAreaHa * 0.20).toFixed(2)),
      from2to3m: 0,
      over3m: 0,
    };
    affectedVillages = ['Thôn Đoàn Kết', 'Thôn 8', 'Thôn Bình Lợi', 'Thôn 5', 'Thôn 6'];
    criticalVillages = ['Thôn Đoàn Kết', 'Thôn 8'];
  } else if (discharge < 1075) {
    // CẤP ĐỘ 3: 600 <= Q < 1075 m³/s (Mở 03 cửa tràn xả lũ khẩn cấp - BC 1775/BC-CTTL, bao gồm KB4.1 tại 766 m³/s)
    const kb4 = MIKE_FLOOD_SCENARIOS.KB4_1;
    const kb1 = MIKE_FLOOD_SCENARIOS.KB1_1;
    const r = (discharge - 600) / (1075 - 600);
    totalFloodedAreaHa = Number((1150.0 + r * (kb1.totalFloodedAreaHa - 1150.0)).toFixed(2));
    affectedHouseholds = Math.round(340 + r * (kb1.affectedHouseholds - 340));
    ql14cFloodedKm = Number((1.1 + r * (kb1.ql14cFloodedKm - 1.1)).toFixed(2));
    tl681FloodedKm = Number((8.5 + r * (kb1.tl681FloodedKm - 8.5)).toFixed(2));
    mblEaSup = Number((189.00 + r * (kb1.mblEaSup - 189.00)).toFixed(2)); // Vượt Báo động III
    mblEaRok = Number((169.00 + r * (kb1.mblEaRok - 169.00)).toFixed(2));
    code = 'CẤP 3 (BĐ III)';
    shortTitle = `Xả lũ Khẩn cấp Cấp 3 (Mở 03 cửa tràn ${discharge} m³/s)`;
    fullName = `Xả lũ Khẩn cấp Cấp 3 (Báo động III): Mở 03 cửa tràn xả ${discharge} m³/s (BC 1775/BC-CTTL)`;
    infrastructureNotes = [
      'Xả lũ khẩn cấp mở 03 cửa tràn theo Báo cáo khẩn số 1775/BC-CTTL',
      `Ngập Quốc lộ 14C (${ql14cFloodedKm} km) và Tỉnh lộ 681 (${tl681FloodedKm} km)`,
      'Nguy cơ ngập mép sân Bệnh viện Đa khoa và các điểm trường hạ lưu',
    ];
    depthDist = {
      under0_5m: Number((kb4.depthDistribution.under0_5m * (totalFloodedAreaHa / kb4.totalFloodedAreaHa)).toFixed(2)),
      from0_5to1m: Number((kb4.depthDistribution.from0_5to1m * (totalFloodedAreaHa / kb4.totalFloodedAreaHa)).toFixed(2)),
      from1to2m: Number((kb4.depthDistribution.from1to2m * (totalFloodedAreaHa / kb4.totalFloodedAreaHa)).toFixed(2)),
      from2to3m: Number((kb4.depthDistribution.from2to3m * (totalFloodedAreaHa / kb4.totalFloodedAreaHa)).toFixed(2)),
      over3m: Number((kb4.depthDistribution.over3m * (totalFloodedAreaHa / kb4.totalFloodedAreaHa)).toFixed(2)),
    };
    affectedVillages = [...CORE_FLOOD_AFFECTED_VILLAGES];
    criticalVillages = ['Thôn Đoàn Kết', 'Thôn 8', 'Thôn Bình Lợi', 'Thôn 5', 'Thôn 6'];
  } else {
    // CẤP ĐỘ 4: Q >= 1075 m³/s (Xả lũ tần suất thiết kế P=1%, kiểm tra P=0.2% hoặc Vỡ đập)
    const kb1 = MIKE_FLOOD_SCENARIOS.KB1_1;
    const kb2 = MIKE_FLOOD_SCENARIOS.KB2_1;
    const r = Math.min(1.0, (discharge - 1075) / (6632 - 1075));
    totalFloodedAreaHa = Number((kb1.totalFloodedAreaHa + r * (kb2.totalFloodedAreaHa - kb1.totalFloodedAreaHa)).toFixed(2));
    affectedHouseholds = Math.round(kb1.affectedHouseholds + r * (kb2.affectedHouseholds - kb1.affectedHouseholds));
    ql14cFloodedKm = Number((kb1.ql14cFloodedKm + r * (kb2.ql14cFloodedKm - kb1.ql14cFloodedKm)).toFixed(2));
    tl681FloodedKm = Number((kb1.tl681FloodedKm + r * (kb2.tl681FloodedKm - kb1.tl681FloodedKm)).toFixed(2));
    mblEaSup = Number((kb1.mblEaSup + r * (kb2.mblEaSup - kb1.mblEaSup)).toFixed(2));
    mblEaRok = Number((kb1.mblEaRok + r * (kb2.mblEaRok - kb1.mblEaRok)).toFixed(2));
    code = discharge >= 6000 ? 'KHẨN CẤP VỠ ĐẬP' : 'CẤP 4 (LŨ THIẾT KẾ)';
    shortTitle = `Lũ Lớn Cực Đoan Cấp 4 (${discharge} m³/s)`;
    fullName = `Báo động Đặc biệt Nguy hiểm: Lưu lượng lũ xả đạt ${discharge} m³/s`;
    infrastructureNotes = [
      'Ngập sâu Bệnh viện Đa khoa Ea Súp (1 - 2m) và Trường Mầm non Hoa Phượng (2 - 3m)',
      `Tê liệt Quốc lộ 14C (${ql14cFloodedKm} km) và Tỉnh lộ 681 (${tl681FloodedKm} km)`,
      'Yêu cầu sơ tán khẩn cấp toàn bộ các thôn buôn hạ du theo phương án cấp 4',
    ];
    depthDist = {
      under0_5m: Number((kb1.depthDistribution.under0_5m * (1 - r) + kb2.depthDistribution.under0_5m * r).toFixed(2)),
      from0_5to1m: Number((kb1.depthDistribution.from0_5to1m * (1 - r) + kb2.depthDistribution.from0_5to1m * r).toFixed(2)),
      from1to2m: Number((kb1.depthDistribution.from1to2m * (1 - r) + kb2.depthDistribution.from1to2m * r).toFixed(2)),
      from2to3m: Number((kb1.depthDistribution.from2to3m * (1 - r) + kb2.depthDistribution.from2to3m * r).toFixed(2)),
      over3m: Number((kb1.depthDistribution.over3m * (1 - r) + kb2.depthDistribution.over3m * r).toFixed(2)),
    };
    affectedVillages = [...kb2.affectedVillages];
    criticalVillages = [...kb2.criticalVillages];
  }

  affectedPeople = affectedHouseholds * 4;

  return {
    id: 'CUSTOM_SLIDER',
    code,
    shortTitle,
    fullName,
    probabilityLabel: `Xả ${discharge} m³/s`,
    mblEaSup,
    diffBd3EaSup: Number((mblEaSup - 189.0).toFixed(2)),
    mblEaRok,
    diffBd3EaRok: Number((mblEaRok - 169.0).toFixed(2)),
    hoThuongElevation: elev,
    hoThuongDischarge: discharge,
    hoThuongRiseRate: riseRate,
    totalFloodedAreaHa,
    affectedHouseholds,
    affectedPeople,
    ql14cFloodedKm,
    tl681FloodedKm,
    infrastructureNotes,
    depthDistribution: depthDist,
    affectedVillages,
    criticalVillages,
  };
}

export function getTelemetrySnapshot(): IoTTelemetryData {
  ensureRealtimeSubscription();
  return currentTelemetryState;
}

export function getServerTelemetrySnapshot(): IoTTelemetryData {
  return DEFAULT_IOT_DATA;
}

export function getScenarioIdSnapshot(): MikeFloodScenarioId {
  return currentScenarioId;
}

export function getServerScenarioIdSnapshot(): MikeFloodScenarioId {
  return 'NONE';
}

export function getDominoAutoPlaySnapshot(): number {
  return lastDominoAutoPlayTs;
}

export function getServerDominoAutoPlaySnapshot(): number {
  return 0;
}

export function getCustomVillageBulletinSnapshot(): DynamicBulletin | null {
  return customVillageBulletin;
}

export function getServerCustomVillageBulletinSnapshot(): DynamicBulletin | null {
  return null;
}

export function subscribeTelemetry(listener: Listener): () => void {
  ensureRealtimeSubscription();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setTelemetryData(
  updater: IoTTelemetryData | ((prev: IoTTelemetryData) => IoTTelemetryData),
  options?: {
    broadcast?: boolean;
    scenarioName?: string;
    scenarioId?: MikeFloodScenarioId;
    triggerDominoAudio?: boolean;
  }
): IoTTelemetryData {
  const nextData =
    typeof updater === 'function' ? updater(currentTelemetryState) : updater;
  currentTelemetryState = nextData;
  customVillageBulletin = null;

  if (options?.scenarioId !== undefined) {
    currentScenarioId = options.scenarioId;
  } else if (currentScenarioId !== 'NONE') {
    currentScenarioId = 'CUSTOM_SLIDER';
  }

  if (options?.triggerDominoAudio) {
    lastDominoAutoPlayTs = Date.now();
  }

  emitChange();

  if (options?.broadcast && typeof window !== 'undefined') {
    realtimeSync.broadcastTelemetry(
      nextData,
      'SCENARIO_CLICK',
      options.scenarioName || 'Cập nhật Trực chiến Global Store',
      options.scenarioId || currentScenarioId,
      'SYNC'
    );
  }
  return nextData;
}

/**
 * Lệnh TẮT CẢNH BÁO TOÀN HỆ THỐNG dành riêng cho Admin và Cán bộ Quản lý:
 * 1. Tắt còi hú Web Audio & giọng đọc AI trên mọi thiết bị kết nối.
 * 2. Đặt lại kịch bản MIKE FLOOD về 'NONE' (an toàn).
 * 3. Đặt lại toàn bộ thông số IoT về mặc định an toàn vận hành thực tế (Hồ Thượng 216.30m, 45 m³/s).
 * 4. Phát lệnh MQTT WSS & BroadcastChannel đến toàn bộ thiết bị đang mở hệ thống.
 */
export function stopAllAlertsSystemWide(): void {
  stopAllEmergencyAlerts();
  currentScenarioId = 'NONE';
  const safeData: IoTTelemetryData = {
    ...DEFAULT_IOT_DATA,
    hoThuong: {
      ...DEFAULT_IOT_DATA.hoThuong,
      elevation: 216.30,
      riseRate: 2,
      discharge: 45,
      capacity: 120.5,
    },
    tk293: {
      ...DEFAULT_IOT_DATA.tk293,
      temperature: 32.4,
      smokeCo: 11,
      humidity: 57,
      windSpeed: 2.8,
    },
    hoHa: {
      ...DEFAULT_IOT_DATA.hoHa,
      elevation: 196.35,
      discharge: 15,
      capacityM: 8.85,
      capacityPct: 95.7,
      turbidity: 4.3,
      illegalCages: 0,
      status: 'An toàn',
    },
    hoTrungChuyen: {
      ...DEFAULT_IOT_DATA.hoTrungChuyen,
      dissolvedOxygen: 6.8,
      overflowRisk: 'Thấp',
      dykeStatus: 'Ổn định',
    },
  };
  currentTelemetryState = safeData;
  customVillageBulletin = null;
  alarmSystem.setMuted(false);

  if (typeof window !== 'undefined') {
    realtimeSync.broadcastStopAllAlerts(safeData);
  }
  emitChange();
}

/**
 * Lệnh TẮT CẢNH BÁO CÁ NHÂN dành cho Khách / Người dùng chưa đăng nhập:
 * 1. Tắt còi hú Web Audio & dừng đọc AI TRÊN ĐÚNG THIẾT BỊ NÀY.
 * 2. Bật cờ mute cá nhân để không bị hú còi tiếp trên máy này.
 * 3. TUYỆT ĐỐI KHÔNG GỬI LỆNH RA HỆ THỐNG (giữ nguyên cảnh báo cho các thiết bị khác).
 */
export function stopAlertsLocallyForGuest(): void {
  stopAllEmergencyAlerts();
  alarmSystem.setMuted(true);
}

/**
 * Kích hoạt Kịch bản Thủy lực MIKE FLOOD chuẩn hóa và tạo Hiệu ứng Domino toàn hệ thống
 * (Vẽ biểu đồ 5 mức ngập + Đổi màu 9 thôn trọng điểm + Bật Bản đồ vùng ngập + Phát Loa AI).
 */
export function applyMikeFloodScenario(
  scenarioId: Exclude<MikeFloodScenarioId, 'NONE' | 'CUSTOM_SLIDER'> | 'NONE',
  options?: { broadcast?: boolean }
): IoTTelemetryData {
  const shouldBroadcast = options?.broadcast !== undefined ? options.broadcast : true;

  if (scenarioId === 'NONE') {
    currentScenarioId = 'NONE';
    return setTelemetryData(JSON.parse(JSON.stringify(DEFAULT_IOT_DATA)), {
      broadcast: shouldBroadcast,
      scenarioId: 'NONE',
      scenarioName: 'Đặt lại trạng thái an toàn ban đầu',
      triggerDominoAudio: false,
    });
  }

  // Khi kích hoạt kịch bản lũ khẩn cấp, đảm bảo mở lại âm thanh cảnh báo
  alarmSystem.setMuted(false);

  const meta = MIKE_FLOOD_SCENARIOS[scenarioId];
  const hoHaInterp = interpolateHydroByQ(meta.hoThuongDischarge);
  const nextData: IoTTelemetryData = {
    ...currentTelemetryState,
    hoThuong: {
      elevation: meta.hoThuongElevation,
      discharge: meta.hoThuongDischarge,
      capacity: meta.hoThuongElevation >= 219 ? 175.0 : meta.hoThuongElevation >= 218.4 ? 158.5 : 153.0,
      riseRate: meta.hoThuongRiseRate,
    },
    hoHa: {
      ...currentTelemetryState.hoHa,
      elevation: hoHaInterp.hoHaZ,
      discharge: hoHaInterp.hoHaQ,
      capacityM: hoHaInterp.hoHaW,
      capacityPct: hoHaInterp.hoHaPct,
    },
    hoTrungChuyen: {
      ...currentTelemetryState.hoTrungChuyen,
      overflowRisk: 'Cao',
      dykeStatus: scenarioId === 'KB2_1' || scenarioId === 'KB5_2' ? 'Tràn bờ' : 'Nguy cơ sạt lở',
    },
  };

  return setTelemetryData(nextData, {
    broadcast: shouldBroadcast,
    scenarioId,
    scenarioName: meta.fullName,
    triggerDominoAudio: true,
  });
}

/**
 * Cập nhật nhanh cao trình mực nước Hồ Ea Súp Thượng từ cả Tab Trực chiến hoặc Tab Mô phỏng
 * và tự động nội suy hai chiều Z -> Q, W, Dâng, Hồ Ea Súp Hạ để đồng bộ tức thời 100%.
 */
export function updateHoThuongElevation(elevation: number): IoTTelemetryData {
  const roundedElev = Number(elevation.toFixed(2));
  const interp = interpolateHydroByZ(roundedElev);

  let mappedScenario: MikeFloodScenarioId = 'NONE';
  let triggerDominoAudio = false;

  if (roundedElev >= 219.0) {
    mappedScenario = 'CUSTOM_SLIDER';
    triggerDominoAudio = true;
  } else if (roundedElev >= 217.54 || interp.q >= 100) {
    mappedScenario = 'CUSTOM_SLIDER';
    triggerDominoAudio = true;
  } else {
    mappedScenario = 'NONE';
    triggerDominoAudio = false;
  }

  return setTelemetryData(
    (prev) => ({
      ...prev,
      hoThuong: {
        elevation: interp.z,
        discharge: interp.q,
        capacity: interp.w,
        riseRate: interp.riseRate,
      },
      hoHa: {
        ...prev.hoHa,
        elevation: interp.hoHaZ,
        discharge: interp.hoHaQ,
        capacityM: interp.hoHaW,
        capacityPct: interp.hoHaPct,
      },
    }),
    {
      broadcast: true,
      scenarioId: mappedScenario,
      scenarioName: `Đồng bộ Mực nước Hồ Thượng ${roundedElev}m (Q=${interp.q} m³/s)`,
      triggerDominoAudio,
    }
  );
}

/**
 * Cập nhật lưu lượng xả Hồ Ea Súp Thượng và tự động nội suy hai chiều Q -> Z, W, Dâng, Hồ Ea Súp Hạ
 */
export function updateHoThuongDischarge(discharge: number): IoTTelemetryData {
  const roundedQ = Math.round(discharge);
  const interp = interpolateHydroByQ(roundedQ);

  const isWarning = roundedQ >= 100 || interp.z >= 217.54;
  const mappedScenario: MikeFloodScenarioId = isWarning ? 'CUSTOM_SLIDER' : 'NONE';

  return setTelemetryData(
    (prev) => ({
      ...prev,
      hoThuong: {
        elevation: interp.z,
        discharge: interp.q,
        capacity: interp.w,
        riseRate: interp.riseRate,
      },
      hoHa: {
        ...prev.hoHa,
        elevation: interp.hoHaZ,
        discharge: interp.hoHaQ,
        capacityM: interp.hoHaW,
        capacityPct: interp.hoHaPct,
      },
    }),
    {
      broadcast: true,
      scenarioId: mappedScenario,
      scenarioName: `Đồng bộ Lưu lượng xả Hồ Thượng ${roundedQ} m³/s (Z=${interp.z}m)`,
      triggerDominoAudio: isWarning,
    }
  );
}

/**
 * Tự động tổng hợp nội dung văn bản và kịch bản giọng đọc Cụm Loa Truyền Thanh Số
 * khớp 100% với thông số thực tế và kịch bản MIKE FLOOD tại Global Store.
 */
export function buildDynamicBulletin(
  iotData: IoTTelemetryData,
  scenarioId: MikeFloodScenarioId = currentScenarioId
): DynamicBulletin {
  const elev = iotData.hoThuong.elevation;
  const riseRate = iotData.hoThuong.riseRate;
  const discharge = iotData.hoThuong.discharge;
  const temp = iotData.tk293.temperature;
  const smoke = iotData.tk293.smokeCo;
  const doVal = iotData.hoTrungChuyen.dissolvedOxygen;
  const phVal = iotData.hoTrungChuyen.ph;
  const cages = iotData.hoHa.illegalCages;

  const hydraulic = computeActiveHydraulicModel(iotData, scenarioId);

  const isFireAlert = temp > 45 || smoke > 50;
  const isFloodCritical =
    discharge >= 600 || elev >= 217.85 || riseRate > 30 || (scenarioId !== 'NONE' && scenarioId !== 'KB4_1');
  const isFloodWarning =
    !isFloodCritical && (discharge >= 100 || elev >= 217.54 || riseRate >= 15 || scenarioId === 'KB4_1');
  const isCageAlert = cages > 0;
  const isFishAlert =
    doVal < 4.0 ||
    iotData.hoTrungChuyen.overflowRisk === 'Cao' ||
    iotData.hoTrungChuyen.dykeStatus === 'Tràn bờ';

  const parts: string[] = [];

  if (scenarioId !== 'NONE' && hydraulic.totalFloodedAreaHa > 0) {
    const diffSign = hydraulic.diffBd3EaSup >= 0 ? `+${hydraulic.diffBd3EaSup}m` : `${hydraulic.diffBd3EaSup}m`;
    parts.push(
      `Kích hoạt ${hydraulic.fullName}: Mực nước Hồ Ea Súp Thượng ở cao trình ${elev} mét (lưu lượng ${discharge} m³/s), mực nước tại Mốc báo lũ Ea Súp đạt ${hydraulic.mblEaSup} mét (${diffSign} so với Báo động 3), tổng diện tích ngập tại xã Ea Súp là ${hydraulic.totalFloodedAreaHa.toLocaleString('en-US')} héc-ta, ảnh hưởng ${hydraulic.affectedHouseholds.toLocaleString('en-US')} hộ (${hydraulic.affectedPeople.toLocaleString('en-US')} nhân khẩu).`
    );
    if (hydraulic.ql14cFloodedKm > 0 || hydraulic.tl681FloodedKm > 0) {
      parts.push(
        `Cảnh báo ngập Quốc lộ 14C ${hydraulic.ql14cFloodedKm} km, Tỉnh lộ 681 ${hydraulic.tl681FloodedKm} km${
          scenarioId === 'KB1_1' || scenarioId === 'KB1_2'
            ? ', ngập Bệnh viện Đa khoa Ea Súp (1 đến 2 mét) và Trường Mầm non Hoa Phượng (2 đến 3 mét)'
            : scenarioId === 'KB2_1'
            ? ', ngập sâu trên 2 mét tới 1,472.28 héc-ta và ngập 18 công trình công cộng'
            : ''
        }.`
      );
    }
    parts.push(
      `Yêu cầu Ban tự quản và nhân dân tại Thôn Đoàn Kết, Thôn 5, Thôn 6, Thôn 7, Thôn 8, Thôn 9, Thôn 10, Thôn 11 và Thôn Bình Lợi khẩn trương triển khai phương án ứng phó, di dời tài sản và sơ tán khỏi vùng ngập sâu.`
    );
  } else if (isFloodCritical) {
    parts.push(
      `BÁO ĐỘNG KHẨN CẤP CẤP ĐỘ 3: Mực nước Hồ Ea Súp Thượng đang dâng cao đạt cao trình ${elev} mét (tốc độ nước dâng +${riseRate} cm/giờ, lưu lượng xả tràn ${discharge} m³/s). Đề nghị nhân dân vùng hạ du Thôn Đoàn Kết, Thôn 5, Thôn 6, Thôn 7, Thôn 8, Thôn 9, Thôn 10, Thôn 11 và Thôn Bình Lợi khẩn trương sơ tán theo phương án phòng chống thiên tai.`
    );
  } else if (isFloodWarning) {
    parts.push(
      `Mực nước Hồ Ea Súp Thượng đang dâng nhanh đạt cao trình ${elev} mét (tốc độ dâng +${riseRate} cm/giờ, lưu lượng điều tiết ${discharge} m³/s). Đề nghị nhân dân Thôn Đoàn Kết, Thôn 5, Thôn 6, Thôn 7, Thôn 8, Thôn 9, Thôn 10, Thôn 11 và Thôn Bình Lợi chủ động gia cố bờ bao, theo dõi sát diễn biến.`
    );
  } else {
    parts.push(
      `Mực nước Hồ Ea Súp Thượng hiện đang ở cao trình ${elev} mét (biến thiên +${riseRate} cm/giờ, lưu lượng vận hành điều tiết ${discharge} m³/s, mực nước Mốc báo lũ Ea Súp ${hydraulic.mblEaSup} mét - dưới Báo động 1, trạng thái an toàn).`
    );
  }

  if (isFireAlert) {
    parts.push(
      `CẢNH BÁO CHÁY RỪNG KHẨN CẤP tại Lâm phần Tiểu khu 293: Nhiệt độ tăng vọt lên ${temp}°C, nồng độ khói CO đạt ${smoke} ppm.`
    );
  } else if (scenarioId === 'NONE') {
    parts.push(
      `Tại Lâm phần Tiểu khu 293, nhiệt độ rừng ghi nhận ${temp}°C, nồng độ khói CO ở mức ${smoke} ppm; Hồ Trung Chuyển Thôn Đoàn Kết duy trì Oxy hòa tan DO ${doVal} mg/L, độ pH ${phVal}.`
    );
  }

  if (isCageAlert) {
    parts.push(
      `Phát hiện ${cages} lồng bè xâm phạm trái phép vùng bảo vệ nguồn nước sinh hoạt Hồ Ea Súp Hạ.`
    );
  }

  const fullContent = `Ủy ban nhân dân và Ban Chỉ huy Phòng chống thiên tai và Tìm kiếm cứu nạn xã Ea Súp thông báo: ${parts.join(' ')}`;

  const alertLevel: DynamicBulletin['alertLevel'] =
    isFloodCritical || isFireAlert || isCageAlert || isFishAlert
      ? 'CRITICAL'
      : isFloodWarning
      ? 'WARNING'
      : 'NORMAL';

  const title =
    scenarioId !== 'NONE'
      ? `Bản tin Khẩn cấp ${hydraulic.code}: MBL Ea Súp ${hydraulic.mblEaSup}m • Ngập ${hydraulic.totalFloodedAreaHa.toLocaleString('en-US')} ha (${hydraulic.affectedHouseholds} hộ)`
      : alertLevel === 'CRITICAL'
      ? `Bản tin Báo động Khẩn cấp: Hồ Ea Súp Thượng (${elev}m, ${discharge} m³/s) & Cảnh báo Trực chiến Toàn Xã`
      : alertLevel === 'WARNING'
      ? `Bản tin Cảnh báo Cấp độ: Mực nước Hồ Ea Súp Thượng (${elev}m, ${discharge} m³/s) và An toàn Hạ du`
      : `Bản tin Trực chiến Thời gian thực: Hồ Ea Súp Thượng (${elev}m, ${discharge} m³/s) & Hệ thống Quan trắc An toàn`;

  return {
    id: `EASUP-LIVE-${scenarioId}-${String(elev).replace('.', '_')}-${temp}-${smoke}`,
    title,
    content: fullContent,
    audioUrl: '/storage/tts/sample_annhien_alert.mp3',
    voiceLabel: 'An Nhiên',
    alertLevel,
  };
}

/**
 * Kích hoạt phát loa cảnh báo chuyên biệt cho 1 thôn/buôn cụ thể trong 20 thôn buôn xã Ea Súp.
 * Đồng bộ tức thời lên Cụm Loa Truyền Thanh Số và tự động đọc lớn qua giọng AI.
 */
export function triggerVillageBroadcast(villageName: string, extraNote?: string): DynamicBulletin {
  const hydraulic = computeActiveHydraulicModel(currentTelemetryState, currentScenarioId);
  const impact = getVillageScenarioImpact(villageName, hydraulic);
  const { profile } = impact;
  const elev = currentTelemetryState.hoThuong.elevation;

  const hhCount =
    impact.affectedHouseholds > 0 ? impact.affectedHouseholds : impact.referenceKb11Households;
  const statusSpeech =
    impact.statusLevel === 'CRITICAL'
      ? `đang ở mức BÁO ĐỘNG ĐỎ NGẬP SÂU CẦN SƠ TÁN KHẨN CẤP (kịch bản ${hydraulic.code}, dự báo ảnh hưởng trực tiếp ${impact.affectedHouseholds} hộ dân, ${impact.affectedPeople} nhân khẩu)`
      : impact.statusLevel === 'WARNING'
      ? `đang ở mức CẢNH BÁO NGẬP (kịch bản ${hydraulic.code}, dự báo ảnh hưởng ${impact.affectedHouseholds} hộ dân, ${impact.affectedPeople} nhân khẩu)`
      : `hiện đang trong trạng thái AN TOÀN (nếu xảy ra kịch bản xả lũ khẩn cấp thiết kế KB1.1 sẽ có khoảng ${hhCount} hộ dân vùng trũng cần lưu ý di dời)`;

  const content = `Ủy ban nhân dân và Ban Chỉ huy Phòng chống thiên tai và Tìm kiếm cứu nạn xã Ea Súp phát bản tin truyền thanh chuyên biệt tới Ban tự quản, Tổ xung kích và toàn thể nhân dân ${villageName}: Địa hình trung bình tại ${villageName} có cao độ dương ${profile.avgElevationM} mét (${profile.terrainNote}). Với mực nước Hồ Ea Súp Thượng hiện tại ${elev} mét, trạng thái an ninh thiên tai của ${villageName} ${statusSpeech}. ${
    extraNote ? `${extraNote} ` : ''
  }Khi có lệnh di dời, đề nghị bà con nhân dân ${villageName} khẩn trương di chuyển người và tài sản về điểm sơ tán an toàn gần nhất tại ${profile.evacuationPoint} (cao độ dương ${profile.evacuationElevationM} mét, cách trung tâm thôn ${profile.evacuationDistanceKm} ki-lô-mét).`;

  const bulletin: DynamicBulletin = {
    id: `EASUP-VILLAGE-${villageName.replace(/\s+/g, '_')}-${Date.now()}`,
    title: `🔊 Loa Cảnh Báo Chuyên Biệt: ${villageName} (Cao độ +${profile.avgElevationM}m • Sơ tán: ${profile.evacuationPoint})`,
    content,
    audioUrl: '/storage/tts/sample_annhien_alert.mp3',
    voiceLabel: 'An Nhiên',
    alertLevel: impact.statusLevel === 'SAFE' ? 'WARNING' : impact.statusLevel,
  };

  customVillageBulletin = bulletin;
  lastDominoAutoPlayTs = Date.now();
  emitChange();
  return bulletin;
}

export function useTelemetryStore() {
  const iotData = useSyncExternalStore(
    subscribeTelemetry,
    getTelemetrySnapshot,
    getServerTelemetrySnapshot
  );
  const scenarioId = useSyncExternalStore(
    subscribeTelemetry,
    getScenarioIdSnapshot,
    getServerScenarioIdSnapshot
  );
  const dominoAutoPlayTs = useSyncExternalStore(
    subscribeTelemetry,
    getDominoAutoPlaySnapshot,
    getServerDominoAutoPlaySnapshot
  );
  const villageOverride = useSyncExternalStore(
    subscribeTelemetry,
    getCustomVillageBulletinSnapshot,
    getServerCustomVillageBulletinSnapshot
  );

  const hydraulicModel = useMemo(
    () => computeActiveHydraulicModel(iotData, scenarioId),
    [iotData, scenarioId]
  );
  const bulletin = useMemo(
    () => villageOverride ?? buildDynamicBulletin(iotData, scenarioId),
    [villageOverride, iotData, scenarioId]
  );

  return {
    iotData,
    scenarioId,
    hydraulicModel,
    dominoAutoPlayTs,
    setIotData: setTelemetryData,
    applyMikeFloodScenario,
    updateHoThuongElevation,
    updateHoThuongDischarge,
    triggerVillageBroadcast,
    bulletin,
  };
}
