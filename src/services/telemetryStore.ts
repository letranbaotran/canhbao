'use client';

import { useSyncExternalStore } from 'react';
import { realtimeSync } from '@/services/realtimeSyncService';
import { getVillageScenarioImpact } from '@/data/village_disaster_profiles';

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
    hoThuongElevation: 208.6,
    hoThuongDischarge: 320,
    hoThuongRiseRate: 22,
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
    hoThuongElevation: 210.4,
    hoThuongDischarge: 580,
    hoThuongRiseRate: 34,
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
    hoThuongElevation: 211.2,
    hoThuongDischarge: 760,
    hoThuongRiseRate: 40,
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
    hoThuongElevation: 213.6,
    hoThuongDischarge: 1200,
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
    hoThuongElevation: 213.8,
    hoThuongDischarge: 1150,
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
    if (msg?.data) {
      currentTelemetryState = msg.data;
      emitChange();
    }
  });
}

/**
 * Nội suy động trạng thái thủy lực MIKE FLOOD khi người dùng chọn Kịch bản chuẩn
 * hoặc kéo thanh trượt mực nước Hồ Thượng / tốc độ nước dâng bất kỳ.
 */
export function computeActiveHydraulicModel(
  iotData: IoTTelemetryData,
  scenarioId: MikeFloodScenarioId
): MikeFloodScenarioMeta {
  if (scenarioId !== 'NONE' && scenarioId !== 'CUSTOM_SLIDER') {
    return MIKE_FLOOD_SCENARIOS[scenarioId];
  }

  const elev = iotData.hoThuong.elevation;
  const riseRate = iotData.hoThuong.riseRate;

  // Nếu ở mức an toàn bình thường (< 207.5m và tốc độ dâng thấp) và chưa chọn kịch bản
  if (scenarioId === 'NONE' && elev <= 207.2 && riseRate < 15) {
    const mblEaSup = Number((184.2 + (elev - 206.8) * 1.2).toFixed(2));
    const mblEaRok = Number((165.3 + (elev - 206.8) * 0.9).toFixed(2));
    return {
      id: 'NONE',
      code: 'TRỰC CHIẾN',
      shortTitle: 'Vận hành An toàn (Dưới Báo động I)',
      fullName: 'Trạng thái vận hành điều tiết bình thường (Dưới ngưỡng Báo động I)',
      probabilityLabel: 'An toàn',
      mblEaSup,
      diffBd3EaSup: Number((mblEaSup - 189.0).toFixed(2)),
      mblEaRok,
      diffBd3EaRok: Number((mblEaRok - 169.0).toFixed(2)),
      hoThuongElevation: elev,
      hoThuongDischarge: iotData.hoThuong.discharge,
      hoThuongRiseRate: riseRate,
      totalFloodedAreaHa: 0,
      affectedHouseholds: 0,
      affectedPeople: 0,
      ql14cFloodedKm: 0,
      tl681FloodedKm: 0,
      infrastructureNotes: ['Nước nằm trong lòng dẫn sông Ea Súp, giao thông thông suốt'],
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

  // Nội suy theo cao trình thanh trượt (từ 200m -> 214m)
  const factor = Math.max(0.08, Math.min(1.35, (elev - 206.8) / (210.4 - 206.8)));
  const base = MIKE_FLOOD_SCENARIOS.KB1_1;
  const under0_5m = Number((base.depthDistribution.under0_5m * factor).toFixed(2));
  const from0_5to1m = Number((base.depthDistribution.from0_5to1m * factor).toFixed(2));
  const from1to2m = Number((base.depthDistribution.from1to2m * factor).toFixed(2));
  const from2to3m = Number((base.depthDistribution.from2to3m * factor).toFixed(2));
  const over3m = Number((base.depthDistribution.over3m * factor).toFixed(2));
  const totalFloodedAreaHa = Number(
    (under0_5m + from0_5to1m + from1to2m + from2to3m + over3m).toFixed(2)
  );

  const mblEaSup = Number((185.2 + factor * 4.36).toFixed(2));
  const mblEaRok = Number((166.2 + factor * 3.25).toFixed(2));
  const affectedHouseholds = Math.round(base.affectedHouseholds * factor);
  const affectedPeople = affectedHouseholds * 4;

  const isHighFlood = elev >= 209.5 || riseRate >= 25;
  const affectedVillages =
    elev >= 207.4 || riseRate >= 12 ? [...CORE_FLOOD_AFFECTED_VILLAGES] : ['Thôn Đoàn Kết', 'Thôn 8'];
  const criticalVillages = isHighFlood
    ? ['Thôn Đoàn Kết', 'Thôn 5', 'Thôn 6', 'Thôn 7', 'Thôn 8', 'Thôn Bình Lợi']
    : ['Thôn Đoàn Kết'];

  return {
    id: 'CUSTOM_SLIDER',
    code: 'MÔ PHỎNG ĐỘNG',
    shortTitle: `Mô phỏng Thủy lực Động (Hồ Thượng ${elev}m)`,
    fullName: `Mô phỏng Nội suy MIKE FLOOD theo cao trình Hồ Thượng ${elev}m`,
    probabilityLabel: 'Nội suy Động',
    mblEaSup,
    diffBd3EaSup: Number((mblEaSup - 189.0).toFixed(2)),
    mblEaRok,
    diffBd3EaRok: Number((mblEaRok - 169.0).toFixed(2)),
    hoThuongElevation: elev,
    hoThuongDischarge: iotData.hoThuong.discharge,
    hoThuongRiseRate: riseRate,
    totalFloodedAreaHa,
    affectedHouseholds,
    affectedPeople,
    ql14cFloodedKm: Number((base.ql14cFloodedKm * factor).toFixed(2)),
    tl681FloodedKm: Number((base.tl681FloodedKm * factor).toFixed(2)),
    infrastructureNotes: isHighFlood
      ? [
          'Cảnh báo ngập Bệnh viện Đa khoa Ea Súp & Trường MN Hoa Phượng',
          `Ngập QL14C (${(base.ql14cFloodedKm * factor).toFixed(2)} km) & Tỉnh lộ 681 (${(
            base.tl681FloodedKm * factor
          ).toFixed(2)} km)`,
        ]
      : ['Cảnh báo ngập cục bộ vùng trũng ven sông Ea Súp và Thôn Đoàn Kết'],
    depthDistribution: {
      under0_5m,
      from0_5to1m,
      from1to2m,
      from2to3m,
      over3m,
    },
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
      options.scenarioName || 'Cập nhật Trực chiến Global Store'
    );
  }
  return nextData;
}

/**
 * Kích hoạt Kịch bản Thủy lực MIKE FLOOD chuẩn hóa và tạo Hiệu ứng Domino toàn hệ thống
 * (Vẽ biểu đồ 5 mức ngập + Đổi màu 9 thôn trọng điểm + Bật Bản đồ vùng ngập + Phát Loa AI).
 */
export function applyMikeFloodScenario(
  scenarioId: Exclude<MikeFloodScenarioId, 'NONE' | 'CUSTOM_SLIDER'> | 'NONE'
): IoTTelemetryData {
  if (scenarioId === 'NONE') {
    currentScenarioId = 'NONE';
    return setTelemetryData(JSON.parse(JSON.stringify(DEFAULT_IOT_DATA)), {
      broadcast: true,
      scenarioId: 'NONE',
      scenarioName: 'Đặt lại trạng thái an toàn ban đầu',
      triggerDominoAudio: false,
    });
  }

  const meta = MIKE_FLOOD_SCENARIOS[scenarioId];
  const nextData: IoTTelemetryData = {
    ...currentTelemetryState,
    hoThuong: {
      elevation: meta.hoThuongElevation,
      discharge: meta.hoThuongDischarge,
      capacity: meta.hoThuongElevation >= 210 ? 146 : 139,
      riseRate: meta.hoThuongRiseRate,
    },
    hoTrungChuyen: {
      ...currentTelemetryState.hoTrungChuyen,
      overflowRisk: 'Cao',
      dykeStatus: scenarioId === 'KB2_1' || scenarioId === 'KB5_2' ? 'Tràn bờ' : 'Nguy cơ sạt lở',
    },
  };

  return setTelemetryData(nextData, {
    broadcast: true,
    scenarioId,
    scenarioName: meta.fullName,
    triggerDominoAudio: true,
  });
}

/**
 * Cập nhật nhanh cao trình mực nước Hồ Ea Súp Thượng từ cả Tab Trực chiến hoặc Tab Mô phỏng
 * để đồng bộ tức thời 100% với Cụm Loa Truyền Thanh Số và Bản đồ WebGIS.
 */
export function updateHoThuongElevation(elevation: number): IoTTelemetryData {
  const roundedElev = Number(elevation.toFixed(1));
  let riseRate = 2;
  let discharge = 15;
  let capacity = 128;
  let mappedScenario: MikeFloodScenarioId = 'CUSTOM_SLIDER';

  if (roundedElev === 206.8) {
    mappedScenario = 'NONE';
  } else if (roundedElev === 208.6) {
    mappedScenario = 'KB4_1';
    riseRate = 22;
    discharge = 320;
    capacity = 139;
  } else if (roundedElev >= 210.0) {
    mappedScenario = 'KB1_1';
    riseRate = 34;
    discharge = 580;
    capacity = 146;
  }

  return setTelemetryData(
    (prev) => ({
      ...prev,
      hoThuong: {
        ...prev.hoThuong,
        elevation: roundedElev,
        riseRate,
        discharge,
        capacity,
      },
    }),
    {
      broadcast: true,
      scenarioId: mappedScenario,
      scenarioName: `Đồng bộ Mực nước Hồ Thượng ${roundedElev}m`,
      triggerDominoAudio: roundedElev > 207.5,
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
    elev >= 210 || riseRate > 30 || (scenarioId !== 'NONE' && scenarioId !== 'KB4_1');
  const isFloodWarning =
    !isFloodCritical && (elev >= 208.0 || riseRate >= 15 || scenarioId === 'KB4_1');
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
      `Mực nước Hồ Ea Súp Thượng hiện đang ở cao trình ${elev} mét (biến thiên +${riseRate} cm/giờ, lưu lượng vận hành ${discharge} m³/s, mực nước Mốc báo lũ Ea Súp ${hydraulic.mblEaSup} mét - dưới Báo động 1, trạng thái an toàn).`
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
      ? `Bản tin Báo động Khẩn cấp: Hồ Ea Súp Thượng (${elev}m) & Cảnh báo Trực chiến Toàn Xã`
      : alertLevel === 'WARNING'
      ? `Bản tin Cảnh báo Cấp độ 2: Mực nước Hồ Ea Súp Thượng (${elev}m) và An toàn Hạ du`
      : `Bản tin Trực chiến Thời gian thực: Hồ Ea Súp Thượng (${elev}m) & Hệ thống Quan trắc An toàn`;

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

  const hydraulicModel = computeActiveHydraulicModel(iotData, scenarioId);
  const bulletin = villageOverride ?? buildDynamicBulletin(iotData, scenarioId);

  return {
    iotData,
    scenarioId,
    hydraulicModel,
    dominoAutoPlayTs,
    setIotData: setTelemetryData,
    applyMikeFloodScenario,
    updateHoThuongElevation,
    triggerVillageBroadcast,
    bulletin,
  };
}
