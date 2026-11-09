'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  KEY_MONITORING_TARGETS,
  EASUP_VILLAGES,
  NEIGHBOR_COMMUNES,
} from '@/data/administrative_boundaries';
import { NASA_GIBS_LAYERS } from '@/services/nasaSatelliteService';
import { SatelliteTimelineSlider } from './SatelliteTimelineSlider';
import { getSatelliteTileUrl } from '@/services/satelliteTileService';
import {
  loadAllPersistedKmlState,
  persistNewKmlLayer,
  persistKmlLayerUpdate,
  removePersistedKmlLayer,
  saveKmlToIndexedDB,
} from '@/services/kmlPersistenceService';
import {
  AUTH_CHANGED_EVENT,
  getCurrentSessionUser,
  isUserManagerOrAdmin,
  MapUserRole,
} from '@/services/authRoleService';
import {
  useTelemetryStore,
  applyMikeFloodScenario,
  stopAllAlertsSystemWide,
  stopAlertsLocallyForGuest,
  MIKE_FLOOD_SCENARIOS,
  type MikeFloodScenarioId,
} from '@/services/telemetryStore';
import { stopAllEmergencyAlerts } from '@/utils/alarmSound';
import {
  VERIFIED_FLOOD_MARKS_2023,
  VULNERABLE_FACILITIES_EASUP,
  MIKE21_DEPTH_LEGEND,
  evaluateGpsFloodRisk,
} from '@/data/mike_flood_verified_data';
import {
  VILLAGE_DISASTER_PROFILES,
  VillageDisasterProfile,
} from '@/data/village_disaster_profiles';
import {
  Layers,
  Flame,
  Droplets,
  Compass,
  SlidersHorizontal,
  Eye,
  Info,
  Activity,
  Trees,
  SunMedium,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  Pencil,
  Trash2,
  MapPin,
  Save,
  Check,
  Map as MapIcon,
  MousePointerClick,
  Crop,
  Sparkles,
  Calendar,
  LocateFixed,
  CheckSquare,
  Square,
  X,
  Upload,
  Loader2,
  Crosshair,
  GripHorizontal,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
  Waves,
  Camera,
  Ruler,
} from 'lucide-react';
import { LandMeasureFloatingCard } from './LandMeasureFloatingCard';

export interface KmzLayerManifestItem {
  id: string;
  rawName: string;
  label: string;
  category: string;
  defaultOn: boolean;
  color: string;
  bounds: [[number, number], [number, number]];
  geomCount: number;
  file: string;
  sizeKb: number;
  isUserUploaded?: boolean;
}

interface KmzGeometryGroup {
  color: string;
  fillColor: string | null;
  weight: number;
  outline: boolean;
  lines: [number, number][][];
  polys: [number, number][][];
}

interface KmzLayerData extends KmzLayerManifestItem {
  groups: KmzGeometryGroup[];
}

const BASEMAP_TILES = {
  SATELLITE: {
    name: 'Vệ tinh',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Ea Súp WebGIS',
    maxZoom: 18,
  },
  STREETS: {
    name: 'Bản đồ',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'OSM',
    maxZoom: 19,
  },
  TOPO: {
    name: 'Địa hình',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri Topo',
    maxZoom: 18,
  },
};

export interface AreaDefinition {
  name: string;
  center: [number, number];
  zoom: number;
  areaHa: number;
  ndvi2001: number;
  ndvi2026: number;
  cover2001: number;
  cover2026: number;
  coords: [number, number][];
  note: string;
}

const COMPARISON_AREAS: Record<string, AreaDefinition> = {
  TK_293: {
    name: 'Lâm phần Tiểu khu 293 (Rừng khộp)',
    center: [12.982216, 107.886961],
    zoom: 13,
    areaHa: 1480,
    ndvi2001: 0.78,
    ndvi2026: 0.68,
    cover2001: 86,
    cover2026: 74,
    coords: [
      [12.972, 107.872],
      [12.996, 107.875],
      [12.993, 107.902],
      [12.969, 107.896],
    ],
    note: 'Khu vực rừng khộp dễ cháy giáp ranh nương rẫy xã Ea Bung',
  },
  HO_THUONG: {
    name: 'Hồ Ea Súp Thượng (Đại thủy nông)',
    center: [13.043116, 107.937218],
    zoom: 13,
    areaHa: 1850,
    ndvi2001: 0.65,
    ndvi2026: 0.58,
    cover2001: 72,
    cover2026: 65,
    coords: [
      [13.030, 107.920],
      [13.058, 107.925],
      [13.055, 107.955],
      [13.028, 107.948],
    ],
    note: 'Lòng hồ đại thủy nông 146 triệu m³ và hành lang bán ngập',
  },
  HO_HA: {
    name: 'Hồ Ea Súp Hạ (Cấp nước sinh hoạt)',
    center: [13.05685, 107.894562],
    zoom: 14,
    areaHa: 420,
    ndvi2001: 0.62,
    ndvi2026: 0.52,
    cover2001: 68,
    cover2026: 55,
    coords: [
      [13.050, 107.886],
      [13.064, 107.888],
      [13.062, 107.902],
      [13.048, 107.899],
    ],
    note: 'Vùng bảo vệ nghiêm ngặt nguồn nước thô sinh hoạt',
  },
  HO_TRUNG_CHUYEN: {
    name: 'Hồ Trung Chuyển (Thôn Đoàn Kết)',
    center: [13.069298, 107.881527],
    zoom: 14,
    areaHa: 160,
    ndvi2001: 0.55,
    ndvi2026: 0.45,
    cover2001: 58,
    cover2026: 48,
    coords: [
      [13.064, 107.876],
      [13.075, 107.878],
      [13.073, 107.888],
      [13.062, 107.885],
    ],
    note: 'Khu vực điều tiết nước và nuôi trồng thủy sản tập trung',
  },
  SONG_EASUP: {
    name: 'Hành lang thoát lũ Sông Ea Súp',
    center: [13.052, 107.892],
    zoom: 13,
    areaHa: 980,
    ndvi2001: 0.70,
    ndvi2026: 0.59,
    cover2001: 75,
    cover2026: 62,
    coords: [
      [13.040, 107.890],
      [13.068, 107.880],
      [13.072, 107.886],
      [13.045, 107.902],
    ],
    note: 'Dải hành lang tiêu thoát lũ chính của toàn xã',
  },
  TOAN_XA: {
    name: 'Toàn cảnh Xã Ea Súp (20 Thôn Buôn)',
    center: [13.045, 107.905],
    zoom: 12,
    areaHa: 12400,
    ndvi2001: 0.74,
    ndvi2026: 0.64,
    cover2001: 80,
    cover2026: 68,
    coords: [
      [12.950, 107.830],
      [13.120, 107.840],
      [13.115, 107.980],
      [12.945, 107.970],
    ],
    note: 'Toàn bộ diện tích tự nhiên 20 thôn buôn xã Ea Súp',
  },
};

// Thông số theo dõi ảnh vệ tinh đã tinh giản, dễ hiểu
const GIBS_META: Record<
  string,
  {
    title: string;
    liveMetric: string;
    status: string;
    statusColor: string;
  }
> = {
  THERMAL_ANOMALIES: {
    title: 'Điểm Ảnh Nhiệt',
    liveMetric: '02 điểm nhiệt gần Tiểu khu 293 (đang kiểm tra)',
    status: 'NGUY CƠ CHÁY',
    statusColor: 'text-rose-700 bg-rose-50 border-rose-500',
  },
  TRUE_COLOR: {
    title: 'Ảnh Vệ Tinh Tự Nhiên',
    liveMetric: 'Trời quang, rừng khộp đang vào mùa khô',
    status: 'BÌNH THƯỜNG',
    statusColor: 'text-[#0A4393] bg-[#F0F6FF] border-[#0A4393]/40',
  },
  NDVI_VEGETATION: {
    title: 'Độ Che Phủ Rừng',
    liveMetric: 'Mặt phủ rừng Tiểu khu 293 ổn định',
    status: 'RỪNG ỔN ĐỊNH',
    statusColor: 'text-[#0A4393] bg-[#F0F6FF] border-[#0A4393]/40',
  },
  SOIL_MOISTURE: {
    title: 'Độ Ẩm Đất',
    liveMetric: 'Độ ẩm 31% (cận khô hạn, cần tưới tiêu)',
    status: 'CẢNH BÁO HẠN',
    statusColor: 'text-amber-800 bg-amber-50 border-amber-500',
  },
  FLOOD_SURFACE: {
    title: 'Bản Đồ Ngập Lụt',
    liveMetric: 'Nước nằm trong lòng dẫn, an toàn',
    status: 'AN TOÀN LŨ',
    statusColor: 'text-[#0A4393] bg-[#F0F6FF] border-[#0A4393]/40',
  },
  LAND_COVER: {
    title: 'Mặt Phủ Đất & Rừng',
    liveMetric: 'Ảnh vệ tinh hồng ngoại SWIR phân định thảm rừng và đất sản xuất',
    status: 'MẶT PHỦ ỔN ĐỊNH',
    statusColor: 'text-emerald-800 bg-emerald-50 border-emerald-500',
  },
};

const LAYER_PREFERENCES_STORAGE_KEY = 'easup_webgis_layer_preferences_v2';

export const normalizeVillageKey = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');

export const isVillageMatch = (villageName: string, layerLabel: string): boolean => {
  if (!villageName || !layerLabel) return false;
  const normV = normalizeVillageKey(villageName);
  const normL = normalizeVillageKey(layerLabel);

  // 1. Trường hợp Tiểu khu 249
  if (normV.includes('249')) {
    return normL.includes('249');
  }

  // 2. Trường hợp thôn số: Thôn 1 -> Thôn 13
  // Bắt số nguyên vẹn của thôn để tránh "thon1" khớp nhầm với "thon10", "thon11", "thon12", "thon13"
  const numMatchV = villageName.match(/\b(?:thôn|thon)\s*(\d+)\b/i) || normV.match(/^thon(\d+)$/);
  if (numMatchV) {
    const numV = numMatchV[1];
    const numMatchL = layerLabel.match(/\b(?:thôn|thon)\s*(\d+)\b/i) || normL.match(/^thon(\d+)$/);
    if (numMatchL) {
      return numMatchL[1] === numV;
    }
    const digitMatch = normL.match(/thon(\d+)/);
    if (digitMatch) {
      return digitMatch[1] === numV;
    }
    return false;
  }

  // 3. Trường hợp Buôn: Buôn A, Buôn B, Buôn C
  const buonMatchV = villageName.match(/\bbuon\s*([abc])\b/i) || normV.match(/^buon([abc])$/);
  if (buonMatchV) {
    const charV = buonMatchV[1].toLowerCase();
    const buonMatchL = layerLabel.match(/\bbuon\s*([abc])\b/i) || normL.match(/buon([abc])/);
    if (buonMatchL) {
      return buonMatchL[1].toLowerCase() === charV;
    }
    return normL === normV;
  }

  // 4. Trường hợp thôn có tên chữ: Thôn Đoàn Kết, Thôn Hòa Bình, Thôn Thắng Lợi, Thôn Bình Lợi
  return normL === normV || normL.includes(normV) || normV.includes(normL);
};

export const VILLAGE_LIST_21 = [
  {
    id: 'buon_a',
    name: 'Buôn A',
    shortName: 'Buôn A',
    elevation: 182.5,
    totalHouseholds: 156,
    evacuationPoint: 'Nhà sinh hoạt cộng đồng Buôn A (+186.2m)',
    coordinates: [13.0418, 107.8818] as [number, number],
  },
  {
    id: 'buon_b',
    name: 'Buôn B',
    shortName: 'Buôn B',
    elevation: 183.8,
    totalHouseholds: 148,
    evacuationPoint: 'Nhà sinh hoạt cộng đồng Buôn B (+187.0m)',
    coordinates: [13.0368, 107.8758] as [number, number],
  },
  {
    id: 'buon_c',
    name: 'Buôn C',
    shortName: 'Buôn C',
    elevation: 184.6,
    totalHouseholds: 142,
    evacuationPoint: 'Nhà sinh hoạt cộng đồng Buôn C (+188.0m)',
    coordinates: [13.0312, 107.8688] as [number, number],
  },
  {
    id: 'thon_doan_ket',
    name: 'Thôn Đoàn Kết',
    shortName: 'Đoàn Kết',
    elevation: 172.4,
    totalHouseholds: 245,
    evacuationPoint: 'Trường THPT Ea Súp & Nhà văn hóa xã (+188.5m)',
    coordinates: [13.069298, 107.881527] as [number, number],
  },
  {
    id: 'thon_hoa_binh',
    name: 'Thôn Hòa Bình',
    shortName: 'Hòa Bình',
    elevation: 178.4,
    totalHouseholds: 188,
    evacuationPoint: 'Nhà văn hóa đa năng Thôn Hòa Bình (+186.8m)',
    coordinates: [13.0525, 107.8865] as [number, number],
  },
  {
    id: 'thon_thang_loi',
    name: 'Thôn Thắng Lợi',
    shortName: 'Thắng Lợi',
    elevation: 177.6,
    totalHouseholds: 195,
    evacuationPoint: 'Trụ sở UBND & UBMTTQ xã Ea Súp (+189.5m)',
    coordinates: [13.0585, 107.8825] as [number, number],
  },
  {
    id: 'thon_binh_loi',
    name: 'Thôn Bình Lợi',
    shortName: 'Bình Lợi',
    elevation: 172.9,
    totalHouseholds: 210,
    evacuationPoint: 'Trường THCS Lê Quý Đôn (+187.2m)',
    coordinates: [13.0642, 107.8885] as [number, number],
  },
  {
    id: 'thon_1',
    name: 'Thôn 1',
    shortName: 'Thôn 1',
    elevation: 176.2,
    totalHouseholds: 260,
    evacuationPoint: 'Trụ sở HĐND - UBND xã Ea Súp (+189.5m)',
    coordinates: [13.0545, 107.8985] as [number, number],
  },
  {
    id: 'thon_2',
    name: 'Thôn 2',
    shortName: 'Thôn 2',
    elevation: 176.8,
    totalHouseholds: 230,
    evacuationPoint: 'Trường THPT Ea Súp (+188.5m)',
    coordinates: [13.0592, 107.9042] as [number, number],
  },
  {
    id: 'thon_3',
    name: 'Thôn 3',
    shortName: 'Thôn 3',
    elevation: 178.9,
    totalHouseholds: 205,
    evacuationPoint: 'Điểm cao Doanh trại Trung đoàn 736 (+187.8m)',
    coordinates: [13.0638, 107.9125] as [number, number],
  },
  {
    id: 'thon_4',
    name: 'Thôn 4',
    shortName: 'Thôn 4',
    elevation: 179.5,
    totalHouseholds: 198,
    evacuationPoint: 'Nhà văn hóa liên thôn 3 - 4 (+187.0m)',
    coordinates: [13.0682, 107.9182] as [number, number],
  },
  {
    id: 'thon_5',
    name: 'Thôn 5',
    shortName: 'Thôn 5',
    elevation: 173.8,
    totalHouseholds: 215,
    evacuationPoint: 'Trường TH Nguyễn Viết Xuân (+185.8m)',
    coordinates: [13.0725, 107.8918] as [number, number],
  },
  {
    id: 'thon_6',
    name: 'Thôn 6',
    shortName: 'Thôn 6',
    elevation: 173.5,
    totalHouseholds: 224,
    evacuationPoint: 'Trường THCS Lê Quý Đôn (+187.2m)',
    coordinates: [13.0778, 107.8855] as [number, number],
  },
  {
    id: 'thon_7',
    name: 'Thôn 7',
    shortName: 'Thôn 7',
    elevation: 173.2,
    totalHouseholds: 218,
    evacuationPoint: 'Trường TH Nguyễn Bá Ngọc (+186.5m)',
    coordinates: [13.0832, 107.8808] as [number, number],
  },
  {
    id: 'thon_8',
    name: 'Thôn 8',
    shortName: 'Thôn 8',
    elevation: 172.6,
    totalHouseholds: 236,
    evacuationPoint: 'Trường THPT Quang Trung (+186.5m)',
    coordinates: [13.0608, 107.8732] as [number, number],
  },
  {
    id: 'thon_9',
    name: 'Thôn 9',
    shortName: 'Thôn 9',
    elevation: 174.1,
    totalHouseholds: 192,
    evacuationPoint: 'Trường THPT Quang Trung (+186.5m)',
    coordinates: [13.0878, 107.8748] as [number, number],
  },
  {
    id: 'thon_10',
    name: 'Thôn 10',
    shortName: 'Thôn 10',
    elevation: 174.6,
    totalHouseholds: 185,
    evacuationPoint: 'Chốt cao Đồn Biên phòng 735 (+185.6m)',
    coordinates: [13.0945, 107.8685] as [number, number],
  },
  {
    id: 'thon_11',
    name: 'Thôn 11',
    shortName: 'Thôn 11',
    elevation: 175.0,
    totalHouseholds: 178,
    evacuationPoint: 'Cụm trường & Nhà văn hóa Thôn 12 (+186.0m)',
    coordinates: [13.1018, 107.8618] as [number, number],
  },
  {
    id: 'thon_12',
    name: 'Thôn 12',
    shortName: 'Thôn 12',
    elevation: 180.8,
    totalHouseholds: 170,
    evacuationPoint: 'Nhà văn hóa cộng đồng Thôn 12 (+186.0m)',
    coordinates: [13.0478, 107.9178] as [number, number],
  },
  {
    id: 'thon_13',
    name: 'Thôn 13',
    shortName: 'Thôn 13',
    elevation: 181.6,
    totalHouseholds: 165,
    evacuationPoint: 'Trạm Kiểm lâm & Nhà văn hóa Thôn 13 (+187.4m)',
    coordinates: [13.0255, 107.9145] as [number, number],
  },
  {
    id: 'kv_tk_249',
    name: 'KV TK 249',
    shortName: 'TK 249',
    elevation: 185.0,
    totalHouseholds: 0,
    evacuationPoint: 'Trạm Kiểm lâm Tiểu khu 249 / Ban Quản lý Rừng (+192.0m)',
    coordinates: [13.015, 107.865] as [number, number],
  },
];

const DEFAULT_SYSTEM_LAYERS: {
  markers: boolean;
  buffer: boolean;
  floodMarks2023: boolean;
  vulnerableFacilities: boolean;
  mikeKmlFile: boolean;
  villages: boolean;
} = {
  markers: true,
  buffer: true,
  mikeKmlFile: true,
  floodMarks2023: false,
  vulnerableFacilities: false,
  villages: false,
};

const getStoredLayerPreferences = () => {
  if (typeof window === 'undefined') {
    return {
      systemLayers: DEFAULT_SYSTEM_LAYERS,
      activeLayerTab: 'SYSTEM' as const,
      enabledKmzLayers: {} as Record<string, boolean>,
      villageVisibility: {} as Record<string, boolean>,
      villageSubTab: 'POINTS' as const,
    };
  }
  try {
    const raw = localStorage.getItem(LAYER_PREFERENCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        systemLayers: {
          markers: typeof parsed?.systemLayers?.markers === 'boolean' ? parsed.systemLayers.markers : DEFAULT_SYSTEM_LAYERS.markers,
          buffer: typeof parsed?.systemLayers?.buffer === 'boolean' ? parsed.systemLayers.buffer : DEFAULT_SYSTEM_LAYERS.buffer,
          mikeKmlFile: typeof parsed?.systemLayers?.mikeKmlFile === 'boolean' ? parsed.systemLayers.mikeKmlFile : DEFAULT_SYSTEM_LAYERS.mikeKmlFile,
          floodMarks2023: typeof parsed?.systemLayers?.floodMarks2023 === 'boolean' ? parsed.systemLayers.floodMarks2023 : DEFAULT_SYSTEM_LAYERS.floodMarks2023,
          vulnerableFacilities: typeof parsed?.systemLayers?.vulnerableFacilities === 'boolean' ? parsed.systemLayers.vulnerableFacilities : DEFAULT_SYSTEM_LAYERS.vulnerableFacilities,
          villages: typeof parsed?.systemLayers?.villages === 'boolean' ? parsed.systemLayers.villages : DEFAULT_SYSTEM_LAYERS.villages,
        },
        activeLayerTab: ['SYSTEM', 'FLOOD', 'VILLAGE'].includes(parsed?.activeLayerTab)
          ? (parsed.activeLayerTab as 'SYSTEM' | 'FLOOD' | 'VILLAGE')
          : ('SYSTEM' as const),
        enabledKmzLayers: (parsed?.enabledKmzLayers && typeof parsed.enabledKmzLayers === 'object') ? parsed.enabledKmzLayers : {},
        villageVisibility: (parsed?.villageVisibility && typeof parsed.villageVisibility === 'object') ? parsed.villageVisibility : {} as Record<string, boolean>,
        villageSubTab: parsed?.villageSubTab === 'BOUNDARIES' ? ('BOUNDARIES' as const) : ('POINTS' as const),
      };
    }
  } catch {}
  return {
    systemLayers: DEFAULT_SYSTEM_LAYERS,
    activeLayerTab: 'SYSTEM' as const,
    enabledKmzLayers: {} as Record<string, boolean>,
    villageVisibility: {} as Record<string, boolean>,
    villageSubTab: 'POINTS' as const,
  };
};

interface WebGISMapProps {
  onOpenCommunityReport?: () => void;
}

export const WebGISMap: React.FC<WebGISMapProps> = ({ onOpenCommunityReport }) => {
  const { iotData, scenarioId, hydraulicModel } = useTelemetryStore();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLandMeasureOpen, setIsLandMeasureOpen] = useState<boolean>(false);
  const leafletMapRef = useRef<any>(null);
  const hoThuongMarkerRef = useRef<any>(null);
  const mikeFloodOverlayRef = useRef<any>(null);
  const currentBaseTileRef = useRef<any>(null);
  const gibsTileLayerRef = useRef<any>(null);
  const gibsFeatureGroupRef = useRef<any>(null);
  const compareFeatureGroupRef = useRef<any>(null);
  const temporalTileLayerRef = useRef<any>(null);
  const drawingRectRef = useRef<any>(null);
  const isDrawingModeRef = useRef<boolean>(false);
  const startLatLngRef = useRef<any>(null);
  const autoPlayTimerRef = useRef<any>(null);

  const [activeBasemap, setActiveBasemap] = useState<keyof typeof BASEMAP_TILES>('SATELLITE');
  const [selectedGibsLayer, setSelectedGibsLayer] = useState<string>('TRUE_COLOR');
  const [gibsOpacity, setGibsOpacity] = useState<number>(0.2);
  const [swipeDateLeft, setSwipeDateLeft] = useState<string>('2001-03-15');
  const [swipeDateRight, setSwipeDateRight] = useState<string>('2026-03-15');
  const [showSwipeTool, setShowSwipeTool] = useState<boolean>(false);
  const [compareMode, setCompareMode] = useState<'2001' | '2026' | 'DELTA' | number>('DELTA');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isAutoPlayYear, setIsAutoPlayYear] = useState<boolean>(false);
  const [isTileLoading, setIsTileLoading] = useState<boolean>(false);
  const yearPlayTimerRef = useRef<any>(null);
  const [selectedAreaKey, setSelectedAreaKey] = useState<string>('TK_293');
  const [customArea, setCustomArea] = useState<AreaDefinition | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  // Refs & State cho Định vị GPS và Quản lý lớp bản đồ
  const canvasRendererRef = useRef<any>(null);
  const userLocationLayerRef = useRef<any>(null);
  const systemMarkersGroupRef = useRef<any>(null);
  const bufferCircleLayerRef = useRef<any>(null);
  const floodMarks2023LayerRef = useRef<any>(null);
  const facilitiesLayerRef = useRef<any>(null);
  const mikeKmlLayerRef = useRef<any>(null);
  const mikeGeojsonLayerRef = useRef<any>(null);
  const villagesLayerRef = useRef<any>(null);
  const villageMarkersMapRef = useRef<Record<string, any>>({});
  const kmzLayerGroupsRef = useRef<Record<string, any>>({});
  const kmzDataCacheRef = useRef<Record<string, KmzLayerData>>({});
  // Lưu trạng thái các lớp bản đồ trước khi xảy ra tình huống cảnh báo để phục hồi nguyên trạng khi Tắt Cảnh Báo
  const preAlertLayersSnapshotRef = useRef<{
    selectedGibsLayer: string;
    enabledKmzLayers: Record<string, boolean>;
    villageVisibility: Record<string, boolean>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const layerManagerPanelRef = useRef<HTMLDivElement | null>(null);
  const layerManagerBtnTopRef = useRef<HTMLButtonElement | null>(null);
  const layerManagerBtnFloatRef = useRef<HTMLButtonElement | null>(null);
  const legendBoxRef = useRef<HTMLDivElement | null>(null);
  const checkLocationBtnRef = useRef<HTMLButtonElement | null>(null);

  // Quản lý ghim định vị vị trí (khi bấm đè chuột trái / chạm giữ trên bản đồ)
  const pinnedMarkerRef = useRef<any>(null);
  const longPressTimerRef = useRef<any>(null);
  const pressStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const pinLocationRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const [pinnedCoord, setPinnedCoord] = useState<{ lat: number; lng: number } | null>(null);

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locateMessage, setLocateMessage] = useState<string | null>(null);
  const [gpsFloodRiskResult, setGpsFloodRiskResult] = useState<ReturnType<typeof evaluateGpsFloodRisk> | null>(null);
  const [showGpsFloodAssessment, setShowGpsFloodAssessment] = useState<boolean>(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState<boolean>(true);
  const [showLayerManager, setShowLayerManager] = useState<boolean>(false);
  const [layerPanelPosition, setLayerPanelPosition] = useState<'left' | 'right'>('left');
  const [panelCoords, setPanelCoords] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingPanel, setIsDraggingPanel] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 12,
    initY: 48,
  });
  const [kmzManifest, setKmzManifest] = useState<KmzLayerManifestItem[]>([]);
  const [activeLayerTab, setActiveLayerTab] = useState<'SYSTEM' | 'FLOOD' | 'VILLAGE'>(() => getStoredLayerPreferences().activeLayerTab);
  const [uploadTargetTab, setUploadTargetTab] = useState<'SYSTEM' | 'FLOOD' | 'VILLAGE'>(() => getStoredLayerPreferences().activeLayerTab);
  const [enabledKmzLayers, setEnabledKmzLayers] = useState<Record<string, boolean>>(() => getStoredLayerPreferences().enabledKmzLayers);
  const [loadingKmzLayers, setLoadingKmzLayers] = useState<Record<string, boolean>>({});
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState<string>('');
  const [userRole, setUserRole] = useState<MapUserRole>('GUEST');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  // Chỉ tài khoản Toàn quyền (Admin) mới được quyền sửa/xóa/nạp file KML, KMZ, GeoJSON
  const canEditMap = userRole === 'ADMIN';
  // Chỉ tài khoản Cán bộ quản lý hoặc Admin (đã đăng nhập) mới xem được nút Kịch bản lũ (Ảnh 1)
  const canViewFloodScenarios = Boolean(currentUserEmail && isUserManagerOrAdmin(userRole));

  // Quản lý tọa độ vị trí 20 thôn buôn tùy chỉnh do Admin nhập
  const [customVillageCoords, setCustomVillageCoords] = useState<Record<string, [number, number]>>({});
  const [editingVillageName, setEditingVillageName] = useState<string | null>(null);
  const [editLatInput, setEditLatInput] = useState<string>('');
  const [editLngInput, setEditLngInput] = useState<string>('');
  const [coordSaveMessage, setCoordSaveMessage] = useState<string | null>(null);
  const [systemLayers, setSystemLayers] = useState<{
    markers: boolean;
    buffer: boolean;
    floodMarks2023: boolean;
    vulnerableFacilities: boolean;
    mikeKmlFile: boolean;
    villages: boolean;
  }>(() => getStoredLayerPreferences().systemLayers);

  // Quản lý trạng thái hiển thị của từng thôn buôn (bật/tắt riêng lẻ)
  const [villageVisibility, setVillageVisibility] = useState<Record<string, boolean>>(
    () => getStoredLayerPreferences().villageVisibility
  );

  // 2 Tab lớn trong nhóm Thôn / Buôn: Điểm tập trung | Ranh thôn/buôn
  const [villageSubTab, setVillageSubTab] = useState<'POINTS' | 'BOUNDARIES'>(
    () => getStoredLayerPreferences().villageSubTab
  );

  // Tự động ghi nhớ cấu hình lớp bản đồ và tab vào localStorage khi có thay đổi
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const dataToSave = {
        systemLayers,
        enabledKmzLayers,
        activeLayerTab,
        villageSubTab,
        villageVisibility,
      };
      localStorage.setItem(LAYER_PREFERENCES_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (err) {
      console.error('Không thể lưu cấu hình lớp bản đồ:', err);
    }
  }, [systemLayers, enabledKmzLayers, activeLayerTab, villageSubTab, villageVisibility]);

  // Phân loại danh sách lớp ranh thôn buôn KML/GeoJSON (Memoize để tránh tạo mảng mới mỗi lần render làm gián đoạn lăn chuột bản đồ)
  const villageKmzItems = useMemo(
    () =>
      kmzManifest.filter(
        (m) =>
          m.id !== 'KMZ_BAN_VE_MAT_CAT' &&
          !m.label.toLowerCase().includes('ngập lụt') &&
          m.category !== 'Nhóm lớp hệ thống' &&
          m.category !== 'SYSTEM' &&
          m.category !== 'LỚP BẢN ĐỒ LŨ ĐÃ KIỂM CHỨNG' &&
          m.category !== 'FLOOD' &&
          !m.id.includes('MIKE_FLOOD')
      ),
    [kmzManifest]
  );

  // Thanh 21 Thôn / Buôn & TK 249 trượt bên trái bản đồ
  const [isVillageSidebarOpen, setIsVillageSidebarOpen] = useState<boolean>(false);
  const villageSidebarRef = useRef<HTMLDivElement | null>(null);
  const villageSpecificFileInputRef = useRef<HTMLInputElement | null>(null);
  const [targetUploadVillage, setTargetUploadVillage] = useState<string | null>(null);

  // Thanh thông tin hiển thị dưới cùng của khung bản đồ khi chọn thôn buôn
  const [selectedVillageBottomInfo, setSelectedVillageBottomInfo] = useState<{
    name: string;
    elevation: number;
    affectedHouseholds: number;
    evacuationPoint: string;
    coordinates: [number, number];
  } | null>(null);
  const villageBottomInfoRef = useRef<HTMLDivElement | null>(null);

  // Tự động ẩn khung thông tin thôn buôn khi bấm ra ngoài vùng
  useEffect(() => {
    if (!selectedVillageBottomInfo) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        villageBottomInfoRef.current &&
        !villageBottomInfoRef.current.contains(target) &&
        !target.closest('#village-sidebar-drawer') &&
        !target.closest('#village-sidebar-trigger') &&
        !target.closest('.village-toggle-trigger')
      ) {
        setSelectedVillageBottomInfo(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [selectedVillageBottomInfo]);

  useEffect(() => {
    if (!isVillageSidebarOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        villageSidebarRef.current &&
        !villageSidebarRef.current.contains(target) &&
        !target.closest('#village-sidebar-trigger')
      ) {
        setIsVillageSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isVillageSidebarOpen]);

  // Thanh trượt năm thời gian (2001 - 2026) thò thụt góc trên bên trái bản đồ (Ảnh 1)
  const [isTimelineSliderOpen, setIsTimelineSliderOpen] = useState<boolean>(false);
  const timelineSliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isTimelineSliderOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        timelineSliderRef.current &&
        !timelineSliderRef.current.contains(target) &&
        !target.closest('#timeline-slider-trigger')
      ) {
        setIsTimelineSliderOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isTimelineSliderOpen]);

  // Thanh 5 Kịch bản lũ MIKE FLOOD trượt bên trái bản đồ
  const [isFloodScenarioSidebarOpen, setIsFloodScenarioSidebarOpen] = useState<boolean>(false);
  const floodScenarioSidebarRef = useRef<HTMLDivElement | null>(null);

  // Lưu trữ các vector ranh thôn (Polygon/Polyline) để phục vụ kích hoạt hiệu ứng nhấp nháy theo kịch bản lũ
  const villageBoundaryPathsRef = useRef<
    Record<string, Array<{ path: any; originalStyle: any }>>
  >({});
  const lastHandledAlertSignatureRef = useRef<string>('SAFE');
  const lastFlownAlertCodeRef = useRef<string>('SAFE');
  const alertPulseTimeoutRef = useRef<any>(null);

  // Hàm dừng hiệu ứng nhấp nháy sau 5 giây nhưng vẫn giữ lớp vùng cảnh báo nổi bật trên bản đồ để lăn chuột, rà soát mượt mà
  const stopAllFloodPathBlinking = useCallback(() => {
    Object.values(villageBoundaryPathsRef.current).forEach((items) => {
      items.forEach(({ path }) => {
        try {
          if ((path as any)._path) {
            (path as any)._path.classList.remove('flood-warning-pulsing-path');
          }
        } catch {}
      });
    });
    if (mikeFloodOverlayRef.current && typeof mikeFloodOverlayRef.current.eachLayer === 'function') {
      try {
        mikeFloodOverlayRef.current.eachLayer((layer: any) => {
          if (layer?._path) {
            layer._path.classList.remove('flood-warning-pulsing-path');
          }
        });
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!isFloodScenarioSidebarOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        floodScenarioSidebarRef.current &&
        !floodScenarioSidebarRef.current.contains(target) &&
        !target.closest('#flood-scenario-sidebar-trigger')
      ) {
        setIsFloodScenarioSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isFloodScenarioSidebarOpen]);

  // Kích hoạt kịch bản lũ MIKE FLOOD từ bảng trượt trên bản đồ (Đồng bộ toàn bộ máy con khi Admin/Cán bộ bấm)
  const handleTriggerScenarioFromMap = (
    key: Exclude<MikeFloodScenarioId, 'NONE' | 'CUSTOM_SLIDER'> | 'NONE'
  ) => {
    const isManager = isUserManagerOrAdmin(userRole);
    if (key === 'NONE') {
      if (isManager) {
        stopAllAlertsSystemWide();
      } else {
        stopAlertsLocallyForGuest();
        applyMikeFloodScenario('NONE', { broadcast: false });
      }
      return;
    }

    applyMikeFloodScenario(key, { broadcast: isManager });
  };

  // Đồng bộ 2 chiều: Khi kịch bản lũ hoặc mực nước Hồ Thượng / tốc độ dâng thay đổi -> Bật lớp vùng cảnh báo, nhấp nháy đúng 5 giây rồi dừng để vẫn lăn chuột, rà soát, thao tác trên bản đồ
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!mapLoaded) return;

    const affectedVillages = hydraulicModel.affectedVillages || [];
    const isFloodAlertActive =
      affectedVillages.length > 0 &&
      (iotData.hoThuong.discharge >= 100 ||
        iotData.hoThuong.elevation >= 217.54 ||
        iotData.hoThuong.riseRate >= 15 ||
        hydraulicModel.totalFloodedAreaHa > 0 ||
        (scenarioId !== 'NONE' && scenarioId !== 'CUSTOM_SLIDER'));

    if (!isFloodAlertActive || affectedVillages.length === 0) {
      if (alertPulseTimeoutRef.current) {
        clearTimeout(alertPulseTimeoutRef.current);
        alertPulseTimeoutRef.current = null;
      }
      lastHandledAlertSignatureRef.current = 'SAFE';
      lastFlownAlertCodeRef.current = 'SAFE';

      // Khi không còn tình huống cảnh báo: Phục hồi toàn bộ các lớp bản đồ về nguyên trạng
      if (preAlertLayersSnapshotRef.current) {
        restoreMapToPreAlertState();
      } else {
        // Tắt nhấp nháy cho toàn bộ các ranh thôn
        Object.values(villageBoundaryPathsRef.current).forEach((items) => {
          items.forEach(({ path, originalStyle }) => {
            try {
              path.setStyle(originalStyle);
              if ((path as any)._path) {
                (path as any)._path.classList.remove('flood-warning-pulsing-path');
              }
            } catch {}
          });
        });
      }
      return;
    }

    const alertSignature = `${scenarioId}:${hydraulicModel.code}:${hydraulicModel.totalFloodedAreaHa}:${affectedVillages.join(',')}:${villageKmzItems.length > 0 ? 'LOADED' : 'INIT'}`;
    if (lastHandledAlertSignatureRef.current === alertSignature) {
      return;
    }
    lastHandledAlertSignatureRef.current = alertSignature;

    // Khi phát sinh tình huống cảnh báo: Ghi nhớ trạng thái các lớp trước cảnh báo
    if (!preAlertLayersSnapshotRef.current) {
      preAlertLayersSnapshotRef.current = {
        selectedGibsLayer,
        enabledKmzLayers: { ...enabledKmzLayers },
        villageVisibility: { ...villageVisibility },
      };
    }

    // 2. Kích hoạt đồng bộ 2 chiều: Tự động bật các thôn bị ngập lũ
    affectedVillages.forEach((vilName) => {
      // Bật marker điểm tập trung
      if (villagesLayerRef.current) {
        if (map && !map.hasLayer(villagesLayerRef.current)) {
          villagesLayerRef.current.addTo(map);
        }
        const marker = villageMarkersMapRef.current[vilName];
        if (marker && !villagesLayerRef.current.hasLayer(marker)) {
          villagesLayerRef.current.addLayer(marker);
        }
      }

      // Bật ranh KML tương ứng
      const matching = villageKmzItems.filter((kmz) => isVillageMatch(vilName, kmz.label));
      matching.forEach((m) => {
        if (!enabledKmzLayers[m.id]) {
          renderKmzLayerOnMap(m);
        }
      });
    });

    // Cập nhật state villageVisibility để tick xanh đồng bộ trong bảng 21 thôn (chỉ cập nhật khi có thay đổi)
    setVillageVisibility((prev) => {
      let changed = false;
      const next = { ...prev };
      affectedVillages.forEach((v) => {
        if (!next[v]) {
          next[v] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    // 3. Cho lớp ranh thôn vùng cảnh báo nổi lên & nhấp nháy trong 5 giây rồi dừng
    setTimeout(() => {
      Object.entries(villageBoundaryPathsRef.current).forEach(([vilName, items]) => {
        const isAffected = affectedVillages.includes(vilName);
        items.forEach(({ path, originalStyle }) => {
          try {
            if (isAffected) {
              path.setStyle({
                color: '#e11d48',
                fillColor: '#f43f5e',
                fillOpacity: 0.45,
                weight: 3.8,
              });
              if (typeof path.bringToFront === 'function') {
                path.bringToFront();
              }
              if ((path as any)._path) {
                (path as any)._path.classList.add('flood-warning-pulsing-path');
              }
            } else {
              path.setStyle(originalStyle);
              if ((path as any)._path) {
                (path as any)._path.classList.remove('flood-warning-pulsing-path');
              }
            }
          } catch {}
        });
      });
    }, 200);

    // Tự động dừng hiệu ứng nhấp nháy sau đúng 5 giây (5000ms) để người dùng thoải mái lăn chuột, rà soát và thao tác trên bản đồ
    if (alertPulseTimeoutRef.current) {
      clearTimeout(alertPulseTimeoutRef.current);
    }
    alertPulseTimeoutRef.current = setTimeout(() => {
      stopAllFloodPathBlinking();
      alertPulseTimeoutRef.current = null;
    }, 5000);

    // Chỉ bay camera bao quát vùng ngập đúng 1 lần khi kích hoạt kịch bản mới (không khóa camera để người dùng tự do lăn chuột zoom/pan)
    if (map && lastFlownAlertCodeRef.current !== hydraulicModel.code) {
      lastFlownAlertCodeRef.current = hydraulicModel.code;
      map.flyTo([13.072, 107.892], 13.5, { duration: 1.0 });
    }
  }, [scenarioId, hydraulicModel, iotData.hoThuong.elevation, iotData.hoThuong.riseRate, mapLoaded, villageKmzItems, stopAllFloodPathBlinking]);

  // Bật/tắt chế độ toàn màn hình bản đồ thuần CSS Viewport (Ảnh 2: Loại bỏ hoàn toàn browser toast hướng dẫn trên mobile)
  const handleToggleFullscreen = useCallback(() => {
    const nextFullscreen = !isFullscreen;
    setIsFullscreen(nextFullscreen);

    if (nextFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }

    setTimeout(() => {
      leafletMapRef.current?.invalidateSize();
    }, 100);
    setTimeout(() => {
      leafletMapRef.current?.invalidateSize();
    }, 300);
  }, [isFullscreen]);

  // Đồng bộ kích thước khung nhìn bản đồ (invalidateSize) và lắng nghe sự kiện thoát Fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      if (!isNativeFs && isFullscreen) {
        setIsFullscreen(false);
        document.body.style.overflow = '';
      }
      setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
      }, 100);
      setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
      }, 300);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitFullscreenElement) {
          (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
        document.body.style.overflow = '';
        setTimeout(() => {
          leafletMapRef.current?.invalidateSize();
        }, 100);
        setTimeout(() => {
          leafletMapRef.current?.invalidateSize();
        }, 300);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      leafletMapRef.current?.invalidateSize();
    }, 100);
    const timer2 = setTimeout(() => {
      leafletMapRef.current?.invalidateSize();
    }, 300);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isFullscreen]);

  // Lắng nghe quyền đăng nhập hiện tại (Toàn quyền / Sửa xóa bản đồ / Khách)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initialSession = getCurrentSessionUser();
    setUserRole(initialSession.role);
    setCurrentUserEmail(initialSession.email || '');
    if (initialSession.role !== 'ADMIN') {
      setActiveLayerTab((prev) => (prev === 'VILLAGE' ? 'SYSTEM' : prev));
    }
    if (!initialSession.email || !isUserManagerOrAdmin(initialSession.role)) {
      setIsFloodScenarioSidebarOpen(false);
    }
    const handleAuthChange = () => {
      const session = getCurrentSessionUser();
      setUserRole(session.role);
      setCurrentUserEmail(session.email || '');
      if (session.role !== 'ADMIN') {
        setEditingLayerId(null);
        setActiveLayerTab((prev) => (prev === 'VILLAGE' ? 'SYSTEM' : prev));
      }
      if (!session.email || !isUserManagerOrAdmin(session.role)) {
        setIsFloodScenarioSidebarOpen(false);
      }
    };
    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
    };
  }, []);

  // Tải tọa độ tùy chỉnh của 20 thôn buôn từ localStorage và máy chủ
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const local = localStorage.getItem('easup_custom_village_coords');
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === 'object') {
          setCustomVillageCoords(parsed);
        }
      }
    } catch {}

    fetch('/api/villages/coordinates')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.ok && data.coordinates && Object.keys(data.coordinates).length > 0) {
          setCustomVillageCoords((prev) => {
            const merged = { ...prev, ...data.coordinates };
            try {
              localStorage.setItem('easup_custom_village_coords', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Tự động cập nhật vị trí marker của các thôn buôn trên bản đồ Leaflet khi tọa độ thay đổi
  useEffect(() => {
    if (!villageMarkersMapRef.current) return;
    Object.entries(customVillageCoords).forEach(([vilName, coords]) => {
      const marker = villageMarkersMapRef.current[vilName];
      if (marker && Array.isArray(coords) && coords.length === 2) {
        marker.setLatLng(coords);
      }
    });
  }, [customVillageCoords]);

  // Xử lý kéo thả tự do bảng Quản lý lớp bản đồ khắp màn hình
  useEffect(() => {
    if (!isDraggingPanel) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const panelWidth = Math.min(375, window.innerWidth - 20);
      const maxX = Math.max(8, window.innerWidth - panelWidth - 8);
      const maxY = Math.max(8, window.innerHeight - 150);

      const nextX = Math.min(Math.max(8, dragStartRef.current.initX + dx), maxX);
      const nextY = Math.min(Math.max(8, dragStartRef.current.initY + dy), maxY);
      setPanelCoords({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      setIsDraggingPanel(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.startX;
      const dy = touch.clientY - dragStartRef.current.startY;
      const panelWidth = Math.min(375, window.innerWidth - 20);
      const maxX = Math.max(8, window.innerWidth - panelWidth - 8);
      const maxY = Math.max(8, window.innerHeight - 150);

      const nextX = Math.min(Math.max(8, dragStartRef.current.initX + dx), maxX);
      const nextY = Math.min(Math.max(8, dragStartRef.current.initY + dy), maxY);
      setPanelCoords({ x: nextX, y: nextY });
    };

    const handleTouchEnd = () => {
      setIsDraggingPanel(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingPanel]);

  const handlePanelDragStart = (clientX: number, clientY: number) => {
    let currentX = panelCoords?.x;
    let currentY = panelCoords?.y;

    if (currentX === undefined || currentY === undefined) {
      if (layerManagerPanelRef.current) {
        const rect = layerManagerPanelRef.current.getBoundingClientRect();
        currentX = rect.left;
        currentY = rect.top;
      } else {
        currentX = layerPanelPosition === 'left' ? 12 : Math.max(12, window.innerWidth - 385);
        currentY = 48;
      }
    }

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initX: currentX,
      initY: currentY,
    };
    setIsDraggingPanel(true);
  };

  // Tự động ẩn bảng Chú giải độ sâu ngập MIKE 21 FM khi nhấp chuột hoặc chạm ra ngoài
  useEffect(() => {
    if (!showGpsFloodAssessment) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        legendBoxRef.current &&
        !legendBoxRef.current.contains(target) &&
        checkLocationBtnRef.current &&
        !checkLocationBtnRef.current.contains(target)
      ) {
        setShowGpsFloodAssessment(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showGpsFloodAssessment]);

  // Đồng bộ popup Hồ Thượng & Hiệu ứng Domino tự động kích hoạt Bản đồ vùng ngập MIKE FLOOD
  useEffect(() => {
    if (!hoThuongMarkerRef.current) return;
    const elev = iotData.hoThuong.elevation;
    const discharge = iotData.hoThuong.discharge;
    const statusText =
      elev >= 217.85 || discharge >= 600
        ? 'Báo động Đỏ Cấp 3'
        : elev >= 217.54 || discharge >= 100
        ? 'Cảnh báo Cấp 1'
        : 'An toàn';
    hoThuongMarkerRef.current.setPopupContent(`
      <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
        <h4 style="font-weight:bold; color:#1d4ed8; margin:0 0 4px 0; font-size:13px;">Hồ Ea Súp Thượng (Đại thủy nông)</h4>
        <p style="margin:0 0 4px 0; font-size:11px; color:#64748b;">Tọa độ: 13.043116°B, 107.937218°Đ</p>
        <p style="margin:0 0 6px 0; line-height:1.4;">Dung tích 146.9 triệu m³. Ngưỡng tràn cửa van 209.58m, MNDBT 217.58m. Mực nước hiện tại: <strong>${elev}m (${statusText}, xả ${discharge} m³/s)</strong>.</p>
      </div>
    `);
  }, [iotData.hoThuong.elevation]);

  // Hiệu ứng Domino Bản đồ vùng ngập khi chọn kịch bản MIKE FLOOD hoặc kéo thanh trượt vượt ngưỡng lũ
  useEffect(() => {
    if (typeof window === 'undefined' || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    if (hydraulicModel.totalFloodedAreaHa > 0) {
      if (!preAlertLayersSnapshotRef.current) {
        preAlertLayersSnapshotRef.current = {
          selectedGibsLayer,
          enabledKmzLayers: { ...enabledKmzLayers },
          villageVisibility: { ...villageVisibility },
        };
      }

      // 1. Tự động bật lớp Bản đồ Ngập lụt vệ tinh
      setSelectedGibsLayer((prev) => (prev === 'FLOOD_SURFACE' ? prev : 'FLOOD_SURFACE'));

      // 2. Tự động bật các lớp KML vùng ngập lụt trong trình quản lý lớp (chỉ cập nhật khi có thay đổi)
      setEnabledKmzLayers((prev) => {
        let changed = false;
        const next = { ...prev };
        kmzManifest.forEach((item) => {
          if (
            item.label.toLowerCase().includes('ngập') ||
            item.rawName.toLowerCase().includes('ngap')
          ) {
            if (!next[item.id]) {
              next[item.id] = true;
              changed = true;
            }
          }
        });
        return changed ? next : prev;
      });

      // 3. Vẽ lớp phủ thủy lực MIKE FLOOD 2D trực quan trên hạ du sông Ea Súp & 9 thôn trọng điểm
      import('leaflet').then((L) => {
        if (!leafletMapRef.current) return;
        if (mikeFloodOverlayRef.current) {
          map.removeLayer(mikeFloodOverlayRef.current);
        }
        const floodGroup = L.layerGroup().addTo(map);
        mikeFloodOverlayRef.current = floodGroup;

        // Cấu hình màu sắc, độ tỏa (spread) và độ trong suốt riêng biệt cho từng kịch bản trong 5 kịch bản
        let polyColor = '#0284c7';
        let fillColor = '#38bdf8';
        let fillOpacity = 0.28;
        let spread = 0.008;

        if (scenarioId === 'KB4_1') {
          polyColor = '#0284c7';
          fillColor = '#38bdf8';
          fillOpacity = 0.28;
          spread = 0.007;
        } else if (scenarioId === 'KB1_1') {
          polyColor = '#d97706';
          fillColor = '#fbbf24';
          fillOpacity = 0.33;
          spread = 0.012;
        } else if (scenarioId === 'KB1_2') {
          polyColor = '#ea580c';
          fillColor = '#f97316';
          fillOpacity = 0.36;
          spread = 0.016;
        } else if (scenarioId === 'KB2_1') {
          polyColor = '#dc2626';
          fillColor = '#ef4444';
          fillOpacity = 0.42;
          spread = 0.024;
        } else if (scenarioId === 'KB5_2') {
          polyColor = '#be123c';
          fillColor = '#f43f5e';
          fillOpacity = 0.46;
          spread = 0.026;
        }

        const floodCorridorCoords: [number, number][] = [
          [13.043, 107.935],
          [13.058 + spread, 107.905],
          [13.076 + spread * 1.1, 107.888 + spread * 1.1],
          [13.084 + spread * 1.2, 107.872 - spread],
          [13.065 - spread, 107.868 - spread * 1.1],
          [13.046 - spread, 107.888],
          [13.036 - spread, 107.925],
        ];

        const floodPoly = L.polygon(floodCorridorCoords, {
          color: polyColor,
          weight: 2.5,
          dashArray: '6, 4',
          fillColor,
          fillOpacity,
        }).addTo(floodGroup);

        // Cho lớp bản đồ vùng cảnh báo nổi lên và nhấp nháy đúng 5 giây rồi dừng
        setTimeout(() => {
          try {
            if ((floodPoly as any)._path) {
              (floodPoly as any)._path.classList.add('flood-warning-pulsing-path');
            }
          } catch {}
        }, 50);

        setTimeout(() => {
          try {
            if ((floodPoly as any)._path) {
              (floodPoly as any)._path.classList.remove('flood-warning-pulsing-path');
            }
          } catch {}
        }, 5050);

        floodPoly.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:280px; color:#0f172a;">
            <div style="font-weight:800; color:${polyColor}; font-size:13px; margin-bottom:4px; border-bottom:1px solid #e2e8f0; padding-bottom:3px;">
              🌊 ${hydraulicModel.fullName} (${hydraulicModel.code})
            </div>
            <div style="font-size:11px; line-height:1.5;">
              <div>• <strong>Xác suất / Tần suất:</strong> <span style="color:${polyColor}; font-weight:bold;">${hydraulicModel.probabilityLabel}</span></div>
              <div>• <strong>MBL Ea Súp:</strong> ${hydraulicModel.mblEaSup}m (${hydraulicModel.diffBd3EaSup >= 0 ? '+' : ''}${hydraulicModel.diffBd3EaSup}m BĐ III)</div>
              <div>• <strong>Mực nước Hồ Thượng:</strong> ${hydraulicModel.hoThuongElevation}m (Xả ${hydraulicModel.hoThuongDischarge} m³/s)</div>
              <div>• <strong>Diện tích ngập:</strong> ${hydraulicModel.totalFloodedAreaHa.toLocaleString('en-US')} ha</div>
              <div>• <strong>Hộ dân bị ngập:</strong> ${hydraulicModel.affectedHouseholds.toLocaleString('en-US')} hộ (${hydraulicModel.affectedPeople.toLocaleString('en-US')} người)</div>
              <div>• <strong>Giao thông chia cắt:</strong> QL14C (${hydraulicModel.ql14cFloodedKm} km) • TL681 (${hydraulicModel.tl681FloodedKm} km)</div>
              <div>• <strong>Thôn ảnh hưởng (${hydraulicModel.affectedVillages.length} thôn):</strong> ${(hydraulicModel.affectedVillages || []).join(', ')}</div>
            </div>
          </div>
        `);
      });
    } else {
      if (mikeFloodOverlayRef.current) {
        map.removeLayer(mikeFloodOverlayRef.current);
        mikeFloodOverlayRef.current = null;
      }
    }
  }, [hydraulicModel, scenarioId, kmzManifest]);

  // Đóng khung "Quản lý lớp bản đồ" khi nhấp chuột ra ngoài
  useEffect(() => {
    if (!showLayerManager) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (layerManagerPanelRef.current?.contains(target)) return;
      if (layerManagerBtnTopRef.current?.contains(target)) return;
      if (layerManagerBtnFloatRef.current?.contains(target)) return;
      setShowLayerManager(false);
      setEditingLayerId(null);
    };
    document.addEventListener('mousedown', handleOutsideClick, true);
    document.addEventListener('touchstart', handleOutsideClick, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('touchstart', handleOutsideClick, true);
    };
  }, [showLayerManager]);

  // Cập nhật ref cho drawing mode
  isDrawingModeRef.current = isDrawingMode;

  // Hàm cập nhật lớp ảnh vệ tinh NASA GIBS mặc định với 6 chế độ & đồng bộ độ phủ (Ảnh 1 & 2)
  const updateGibsOverlay = (layerKey: string, opacity: number) => {
    const map = leafletMapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      if (gibsTileLayerRef.current) {
        map.removeLayer(gibsTileLayerRef.current);
        gibsTileLayerRef.current = null;
      }
      if (gibsFeatureGroupRef.current) {
        map.removeLayer(gibsFeatureGroupRef.current);
        gibsFeatureGroupRef.current = null;
      }

      const featureGroup = L.featureGroup().addTo(map);
      gibsFeatureGroupRef.current = featureGroup;

      let wmtsUrl = '';
      let maxNativeZoom = 8;

      if (layerKey === 'TRUE_COLOR') {
        wmtsUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg';
        maxNativeZoom = 9;
      } else if (layerKey === 'THERMAL_ANOMALIES') {
        wmtsUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_Thermal_Anomalies_375m_All/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png';
        maxNativeZoom = 8;
      } else if (layerKey === 'NDVI_VEGETATION') {
        wmtsUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png';
        maxNativeZoom = 8;
      } else if (layerKey === 'SOIL_MOISTURE') {
        wmtsUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SMAP_L4_Analyzed_Root_Zone_Soil_Moisture/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png';
        maxNativeZoom = 8;
      } else if (layerKey === 'FLOOD_SURFACE') {
        wmtsUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Combined_Flood_250m/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png';
        maxNativeZoom = 8;
      } else if (layerKey === 'LAND_COVER') {
        wmtsUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_Bands721/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg';
        maxNativeZoom = 9;
      }

      if (wmtsUrl) {
        const gibsTile = L.tileLayer(wmtsUrl, {
          attribution: 'NASA GIBS &copy; EOSDIS',
          opacity: opacity,
          maxZoom: 19,
          maxNativeZoom: maxNativeZoom,
          zIndex: 25,
        }).addTo(map);

        gibsTileLayerRef.current = gibsTile;
      }

      // Đối với lớp Điểm ảnh nhiệt: Kèm 2 điểm nhiệt NASA FIRMS trực chiến tại Tiểu khu 293
      if (layerKey === 'THERMAL_ANOMALIES') {
        const fireCoords: [number, number, number, string][] = [
          [12.9865, 107.8821, 8.6, 'Điểm Cháy Rừng Rẫy (Tiểu khu 293)'],
          [13.0012, 107.8654, 14.2, 'Vệt Bức Xạ Nhiệt Cao (Giáp Ea Bung)'],
        ];

        fireCoords.forEach(([lat, lng, frp, label]) => {
          L.circle([lat, lng], {
            radius: 800,
            color: '#dc2626',
            fillColor: '#ef4444',
            fillOpacity: Math.min(0.8, opacity * 0.5),
            weight: 2,
            dashArray: '4, 4',
          }).addTo(featureGroup);

          const fireMarker = L.divIcon({
            className: 'custom-map-marker',
            html: `
              <div style="display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:16px; background:#991b1b; color:#fff; border:1.5px solid #f87171; font-size:10px; font-weight:bold; font-family:monospace; box-shadow:0 0 14px rgba(239,68,68,0.9); animation:pulse 1.5s infinite; opacity:${Math.max(0.4, opacity)};">
                <span>🔥</span>
                <span>VIIRS: ${frp} MW</span>
              </div>
            `,
            iconSize: [0, 0],
            iconAnchor: [45, 12],
          });

          L.marker([lat, lng], { icon: fireMarker })
            .addTo(featureGroup)
            .bindPopup(`
              <div style="font-size:12px; padding:4px;">
                <strong style="color:#b91c1c;">${label}</strong><br/>
                - Vệ tinh: VIIRS SNPP 375m<br/>
                - Bức xạ lửa (FRP): <strong>${frp} MW</strong><br/>
                - Độ tin cậy: <strong>High Confidence</strong>
              </div>
            `);
        });
      }
    });
  };

  // PHỤC HỒI TOÀN BỘ CÁC LỚP BẢN ĐỒ VỀ NGUYÊN TRẠNG TRƯỚC KHI CÓ TÌNH HUỐNG CẢNH BÁO
  const restoreMapToPreAlertState = useCallback(() => {
    const map = leafletMapRef.current;
    const snapshot = preAlertLayersSnapshotRef.current;

    // 1. Phục hồi Lớp Vệ Tinh NASA về lớp trước cảnh báo (mặc định 'THERMAL_ANOMALIES')
    const targetGibs = snapshot?.selectedGibsLayer || 'TRUE_COLOR';
    setSelectedGibsLayer(targetGibs);
    updateGibsOverlay(targetGibs, gibsOpacity);

    // 2. Gỡ bỏ hoàn toàn lớp phủ đa giác MIKE FLOOD 2D
    if (mikeFloodOverlayRef.current && map) {
      try {
        map.removeLayer(mikeFloodOverlayRef.current);
      } catch {}
      mikeFloodOverlayRef.current = null;
    }

    // 3. Phục hồi danh sách các lớp KML: Tắt toàn bộ lớp KML ngập lụt và KML thôn tự động bật
    const targetEnabled = snapshot?.enabledKmzLayers || {};
    setEnabledKmzLayers(targetEnabled);
    if (map) {
      Object.entries(kmzLayerGroupsRef.current).forEach(([id, group]) => {
        if (!targetEnabled[id] && map.hasLayer(group)) {
          try {
            map.removeLayer(group);
          } catch {}
        }
      });
    }

    // 4. Phục hồi điểm tập trung thôn/buôn
    const targetVillageVis = snapshot?.villageVisibility || {};
    setVillageVisibility(targetVillageVis);

    if (villagesLayerRef.current && map) {
      try {
        villagesLayerRef.current.clearLayers();
        Object.entries(targetVillageVis).forEach(([vName, isVis]) => {
          if (isVis && villageMarkersMapRef.current[vName]) {
            villagesLayerRef.current.addLayer(villageMarkersMapRef.current[vName]);
          }
        });
        const hasAnyVillage = Object.values(targetVillageVis).some(Boolean);
        if (!hasAnyVillage && map.hasLayer(villagesLayerRef.current)) {
          map.removeLayer(villagesLayerRef.current);
        }
      } catch {}
    }

    // 5. Tắt nhấp nháy viền đỏ pulsing cho tất cả các đường ranh thôn và đưa về màu gốc
    Object.values(villageBoundaryPathsRef.current).forEach((items) => {
      items.forEach(({ path, originalStyle }) => {
        try {
          path.setStyle(originalStyle);
          if ((path as any)._path) {
            (path as any)._path.classList.remove('flood-warning-pulsing-path');
          }
        } catch {}
      });
    });

    // 6. Bay bản đồ về góc nhìn mặc định toàn xã Ea Súp
    if (map) {
      try {
        map.flyTo([13.045, 107.905], 12, { duration: 1.0 });
      } catch {}
    }

    // Xóa snapshot sau khi đã phục hồi xong
    if (alertPulseTimeoutRef.current) {
      clearTimeout(alertPulseTimeoutRef.current);
      alertPulseTimeoutRef.current = null;
    }
    lastHandledAlertSignatureRef.current = 'SAFE';
    lastFlownAlertCodeRef.current = 'SAFE';
    preAlertLayersSnapshotRef.current = null;
  }, [gibsOpacity]);

  // Lắng nghe sự kiện toàn cục khi người dùng bấm nút "TẮT CẢNH BÁO" -> Trả bản đồ về nguyên trạng
  useEffect(() => {
    const handleStopAlertsEvent = () => {
      restoreMapToPreAlertState();
    };
    window.addEventListener('MUTE_OR_STOP_ALL_ALERTS', handleStopAlertsEvent);
    return () => {
      window.removeEventListener('MUTE_OR_STOP_ALL_ALERTS', handleStopAlertsEvent);
    };
  }, [restoreMapToPreAlertState]);

  // HÀM THAY ĐỔI TOÀN BỘ ẢNH VỆ TINH BẢN ĐỒ THEO THỜI ĐIỂM HOẶC THEO NĂM (2001 - 2026)
  const updateTemporalFullMap = (mode: '2001' | '2026' | 'DELTA' | number, customDate?: string) => {
    const map = leafletMapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      let wmtsUrl = '';
      let attr = '';
      let maxZoom = 19;
      let maxNativeZoom = 18;
      const targetYear = typeof mode === 'number' ? mode : mode === '2001' ? 2001 : 2026;

      if (typeof mode === 'number' || mode === '2001' || mode === '2026') {
        const tileSource = getSatelliteTileUrl(targetYear);
        wmtsUrl = tileSource.url;
        attr = tileSource.attribution;
        maxZoom = tileSource.maxZoom;
        maxNativeZoom = tileSource.maxNativeZoom ?? 18;
      } else if (mode === 'DELTA') {
        wmtsUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/2024-05-15/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`;
        attr = 'NASA NDVI';
        maxZoom = 18;
        maxNativeZoom = 8;
      }

      if (wmtsUrl) {
        setIsTileLoading(true);

        // 1. Tạo TileLayer năm mới với key xác định và maxNativeZoom chuẩn
        const previousTileLayer = temporalTileLayerRef.current;
        const newTileLayer = L.tileLayer(wmtsUrl, {
          attribution: attr,
          opacity: 1.0,
          maxZoom: maxZoom,
          maxNativeZoom: maxNativeZoom,
          id: `timeline-tile-${targetYear}`,
        }).addTo(map);

        // Đưa lên đầu ngăn tilePane nhưng dưới vector/marker
        newTileLayer.bringToFront();
        temporalTileLayerRef.current = newTileLayer;

        const handleReady = () => {
          setIsTileLoading(false);
          // Khi gạch ảnh lịch sử sẵn sàng, ẩn basemap nền hiện trạng
          if (currentBaseTileRef.current) {
            currentBaseTileRef.current.setOpacity(0);
          }
        };

        newTileLayer.once('load', handleReady);
        setTimeout(handleReady, 350);

        // Nếu lỗi mạng hoặc không có tile, giữ lại basemap để bản đồ không bị đen
        newTileLayer.on('tileerror', () => {
          setIsTileLoading(false);
          if (currentBaseTileRef.current) {
            currentBaseTileRef.current.setOpacity(1.0);
          }
        });

        // 2. Dỡ bỏ layer cũ để tránh đè lớp và giải phóng bộ nhớ
        if (previousTileLayer && previousTileLayer !== newTileLayer && map.hasLayer(previousTileLayer)) {
          setTimeout(() => {
            if (map.hasLayer(previousTileLayer)) {
              map.removeLayer(previousTileLayer);
            }
          }, 200);
        }
      }
    });
  };

  // HÀM ĐỒNG BỘ ẢNH VỆ TINH TOÀN DIỆN CHO NĂM ĐƯỢC CHỌN (Ảnh 1: Đã bỏ toàn bộ các lớp vẽ đa giác rừng / nương rẫy đè lên bản đồ)
  const renderComparisonLayer = (
    mode: '2001' | '2026' | 'DELTA' | number,
    areaKey = selectedAreaKey,
    customObj = customArea,
    customDate?: string,
    shouldFlyTo: boolean = false
  ) => {
    const map = leafletMapRef.current;
    if (!map) return;

    // 1. Cập nhật thay đổi TOÀN BỘ ẢNH VỆ TINH của cả bản đồ theo năm
    updateTemporalFullMap(mode, customDate);

    // 2. Xóa sạch lớp phủ đa giác rừng cũ nếu có (Ảnh 1: Tuyệt đối không vẽ đa giác rừng đè lên bản đồ vệ tinh)
    if (compareFeatureGroupRef.current) {
      map.removeLayer(compareFeatureGroupRef.current);
      compareFeatureGroupRef.current = null;
    }

    // 3. Phóng tới tâm khu vực nếu có yêu cầu điều hướng
    if (shouldFlyTo) {
      const area: AreaDefinition =
        areaKey === 'CUSTOM' && (customObj || customArea)
          ? (customObj || customArea)!
          : COMPARISON_AREAS[areaKey] || COMPARISON_AREAS.TK_293;
      map.flyTo(area.center, area.zoom, { duration: 0.8 });
    }
  };

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
      }

      const map = L.map(mapContainerRef.current, {
        center: [13.045, 107.905],
        zoom: 12,
        zoomControl: false,
      });

      // Gỡ bỏ tiền tố link Leaflet dài dòng, giữ thanh chú thích nguồn ảnh siêu gọn
      map.attributionControl.setPrefix('');

      canvasRendererRef.current = L.canvas({ padding: 0.5, tolerance: 8 });

      // Lấy cấu hình lớp đã lưu hoặc mặc định (3 lớp hệ thống bật, các lớp khác tắt)
      const initialLayerPrefs = getStoredLayerPreferences();

      const markersGroup = L.featureGroup();
      if (initialLayerPrefs.systemLayers.markers) {
        markersGroup.addTo(map);
      }
      systemMarkersGroupRef.current = markersGroup;

      // Nạp basemap ban đầu
      const baseTile = L.tileLayer(BASEMAP_TILES.SATELLITE.url, {
        attribution: BASEMAP_TILES.SATELLITE.attribution,
        maxZoom: BASEMAP_TILES.SATELLITE.maxZoom,
      }).addTo(map);
      currentBaseTileRef.current = baseTile;

      /**
       * Tạo Pill Marker chống chồng lấp tuyệt đối (Zero-Overlap ở mọi mức zoom 11 -> 18)
       * bằng cách định hướng từng nhãn về 4 góc phần tư riêng biệt (NW, SW, E, S) kèm chấm neo tọa độ.
       */
      const createPillMarker = (
        badgeBg: string,
        badgeBorder: string,
        badgeText: string,
        iconSvg: string,
        direction: 'NW' | 'SW' | 'E' | 'S'
      ) => {
        let pillTransform = 'translate(-50%, 10px)';
        let leaderStyle = '';

        if (direction === 'NW') {
          // Hồ Trung Chuyển: Đẩy lên góc Tây-Bắc (trên-trái), tách hoàn toàn khỏi Hồ Hạ ở phía dưới
          pillTransform = 'translate(-102%, -30px)';
          leaderStyle =
            'position:absolute; left:-8px; top:-10px; width:10px; height:10px; border-right:2px solid ' +
            badgeBorder +
            '; border-bottom:2px solid ' +
            badgeBorder +
            '; pointer-events:none;';
        } else if (direction === 'SW') {
          // Hồ Hạ: Đẩy xuống góc Tây-Nam (dưới-trái), tách hoàn toàn khỏi Hồ Trung Chuyển (trên) và Hồ Thượng (phải)
          pillTransform = 'translate(-102%, 10px)';
          leaderStyle =
            'position:absolute; left:-8px; top:0px; width:10px; height:10px; border-right:2px solid ' +
            badgeBorder +
            '; border-top:2px solid ' +
            badgeBorder +
            '; pointer-events:none;';
        } else if (direction === 'E') {
          // Hồ Thượng: Đẩy sang hướng Đông (bên phải lòng hồ), không bao giờ chạm Hồ Hạ
          pillTransform = 'translate(14px, -50%)';
          leaderStyle =
            'position:absolute; left:4px; top:-1px; width:10px; height:2px; background:' +
            badgeBorder +
            '; pointer-events:none;';
        } else {
          // Tiểu khu 293: Đặt chính giữa phía Nam điểm tọa độ
          pillTransform = 'translate(-50%, 10px)';
          leaderStyle =
            'position:absolute; left:-1px; top:4px; width:2px; height:7px; background:' +
            badgeBorder +
            '; pointer-events:none;';
        }

        return L.divIcon({
          className: 'custom-map-marker',
          html: `
            <div style="position:relative; width:0; height:0; overflow:visible;">
              <span style="position:absolute; left:-4px; top:-4px; width:8px; height:8px; border-radius:9999px; background:${badgeBorder}; border:1.5px solid #ffffff; box-shadow:0 0 6px rgba(0,0,0,0.85); pointer-events:none;"></span>
              <span style="${leaderStyle}"></span>
              <div style="position:absolute; left:0; top:0; transform:${pillTransform}; display:inline-flex; align-items:center; gap:5px; white-space:nowrap; padding:3px 9px; border-radius:20px; font-weight:700; font-size:11px; font-family:monospace; box-shadow:0 4px 12px rgba(0,0,0,0.65); border:1.5px solid ${badgeBorder}; background:${badgeBg}; color:#ffffff; cursor:pointer;">
                <span style="display:inline-flex; align-items:center;">${iconSvg}</span>
                <span style="white-space:nowrap;">${badgeText}</span>
              </div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
      };

      // 1. Hồ Hạ (Góc phần tư Tây-Nam 'SW' - tách biệt hoàn toàn với Hồ Trung Chuyển & Hồ Thượng)
      L.marker([13.0558, 107.8938], {
        icon: createPillMarker('rgba(15, 118, 110, 0.95)', '#5eead4', 'Hồ Hạ', '💧', 'SW'),
      })
        .addTo(markersGroup)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
            <h4 style="font-weight:bold; color:#0f766e; margin:0 0 4px 0; font-size:13px;">Hồ Ea Súp Hạ - Nguồn Cấp Nước Sinh Hoạt</h4>
            <p style="margin:0 0 4px 0; font-size:11px; color:#64748b;">Tọa độ: 13.056850°B, 107.894562°Đ</p>
            <p style="margin:0 0 6px 0; line-height:1.4;"><strong>KHU VỰC BẢO VỆ:</strong> Vùng bảo vệ nghiêm ngặt nguồn nước thô sinh hoạt thị trấn và các xã lân cận.</p>
            <div style="background:#ccfbf1; color:#115e59; padding:4px 6px; border-radius:4px; font-weight:600; font-size:11px;">Trạng thái: An toàn (Nguồn nước đạt chuẩn)</div>
          </div>
        `);

      // 2. Hồ Thượng (Góc phần tư Đông 'E' - mở sang phải lòng hồ đại thủy nông)
      const hoThuongMarker = L.marker([13.043116, 107.937218], {
        icon: createPillMarker('rgba(15, 76, 129, 0.95)', '#60a5fa', 'Hồ Thượng', '🌊', 'E'),
      })
        .addTo(markersGroup)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
            <h4 style="font-weight:bold; color:#1d4ed8; margin:0 0 4px 0; font-size:13px;">Hồ Ea Súp Thượng (Đại thủy nông)</h4>
            <p style="margin:0 0 4px 0; font-size:11px; color:#64748b;">Tọa độ: 13.043116°B, 107.937218°Đ</p>
            <p style="margin:0 0 6px 0; line-height:1.4;">Dung tích 146.9 triệu m³. Ngưỡng tràn cửa van 209.58m, MNDBT 217.58m. Mực nước trực chiến: <strong>216.30m (45 m³/s)</strong>.</p>
          </div>
        `);
      hoThuongMarkerRef.current = hoThuongMarker;

      // 3. Tiểu khu 293 (Góc phần tư Nam 'S' - khu vực rừng khộp phía Nam)
      L.marker([12.982216, 107.886961], {
        icon: createPillMarker('rgba(27, 77, 62, 0.95)', '#34d399', 'Tiểu khu 293', '🌲', 'S'),
      })
        .addTo(markersGroup)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
            <h4 style="font-weight:bold; color:#047857; margin:0 0 4px 0; font-size:13px;">Lâm phần Tiểu Khu 293</h4>
            <p style="margin:0 0 4px 0; font-size:11px; color:#64748b;">Tọa độ: 12.982216°B, 107.886961°Đ</p>
            <p style="margin:0 0 4px 0; line-height:1.4;">Rừng khộp nhạy cảm mùa khô giáp ranh nương rẫy. Trạm IoT LoRaWAN TK-293 đang trực chiến đo nhiệt độ/khói.</p>
          </div>
        `);

      // 4. Hồ Trung Chuyển (Góc phần tư Tây-Bắc 'NW' - mở lên trên-trái về phía Thôn Đoàn Kết)
      L.marker([13.0708, 107.8805], {
        icon: createPillMarker('rgba(14, 116, 144, 0.95)', '#67e8f9', 'Hồ Trung Chuyển', '🐟', 'NW'),
      })
        .addTo(markersGroup)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
            <h4 style="font-weight:bold; color:#0e7490; margin:0 0 4px 0; font-size:13px;">Hồ Trung Chuyển</h4>
            <p style="margin:0 0 4px 0; font-size:11px; color:#64748b;">Tọa độ: 13.069298°B, 107.881527°Đ</p>
            <p style="margin:0 0 4px 0; line-height:1.4;">Hồ điều tiết nguồn nước và vùng nuôi thủy sản thâm canh. Cảm biến IoT giám sát Oxy hòa tan DO (6.8 mg/L) và pH (7.4).</p>
          </div>
        `);

      // 5. Vùng đệm 5km
      const bufferCircle = L.circle([13.045, 107.905], {
        color: '#E67700',
        weight: 1.5,
        dashArray: '5, 5',
        fillColor: '#E67700',
        fillOpacity: 0.04,
        radius: 12000,
        interactive: false,
      });
      if (initialLayerPrefs.systemLayers.buffer) {
        bufferCircle.addTo(map);
      }
      bufferCircleLayerRef.current = bufferCircle;

      // 6. Lớp file Mo_phong_Thuy_luc_MIKE_FLOOD_EaSup.kml (Bản đồ ngập lụt chuẩn MIKE 21 FM)
      const mikeKmlGroup = L.featureGroup();
      if (initialLayerPrefs.systemLayers.mikeKmlFile) {
        mikeKmlGroup.addTo(map);
      }
      mikeKmlLayerRef.current = mikeKmlGroup;

      const mikeBands: Array<{
        level: string;
        color: string;
        opacity: number;
        spread: number;
        desc: string;
      }> = [
        { level: '< 0.5m', color: '#38bdf8', opacity: 0.22, spread: 0.015, desc: 'Vùng ngập nông < 0.5m (583.07 ha - KB1.1)' },
        { level: '0.5 - 1.0m', color: '#2563eb', opacity: 0.26, spread: 0.010, desc: 'Vùng ngập 0.5 - 1.0m (433.36 ha - KB1.1)' },
        { level: '1.0 - 2.0m', color: '#f59e0b', opacity: 0.30, spread: 0.006, desc: 'Vùng ngập sâu 1.0 - 2.0m (426.02 ha - KB1.1)' },
        { level: '2.0 - 3.0m', color: '#ea580c', opacity: 0.35, spread: 0.003, desc: 'Vùng ngập nguy hiểm 2.0 - 3.0m (137.17 ha - KB1.1)' },
        { level: '> 3.0m', color: '#e11d48', opacity: 0.42, spread: 0.0012, desc: 'Lòng dẫn ngập đặc biệt sâu > 3.0m (34.14 ha - KB1.1)' },
      ];

      mikeBands.forEach((b) => {
        const poly = L.polygon(
          [
            [13.043 + b.spread * 0.4, 107.935],
            [13.058 + b.spread, 107.904 + b.spread * 0.5],
            [13.074 + b.spread, 107.884 + b.spread],
            [13.098 + b.spread, 107.862 + b.spread],
            [13.132 + b.spread, 107.838 + b.spread],
            [13.136 - b.spread, 107.831 - b.spread],
            [13.095 - b.spread, 107.854 - b.spread],
            [13.070 - b.spread, 107.876 - b.spread],
            [13.052 - b.spread, 107.896 - b.spread * 0.5],
            [13.040 - b.spread * 0.4, 107.928],
          ],
          {
            color: b.color,
            weight: 1.3,
            fillColor: b.color,
            fillOpacity: b.opacity,
          }
        )
          .bindTooltip(
            `<div style="font-family:sans-serif;font-size:11px;font-weight:700;color:#0A4393;">Mo_phong_Thuy_luc_MIKE_FLOOD_EaSup.kml • Cấp ngập ${b.level}</div>`,
            { sticky: true, direction: 'top' }
          )
          .bindPopup(
            `<div style="font-family:sans-serif;font-size:12px;color:#0f172a;padding:2px;">
              <div style="font-weight:800;color:#0A4393;margin-bottom:3px;">Mo_phong_Thuy_luc_MIKE_FLOOD_EaSup.kml</div>
              <div><strong>Cấp độ sâu MIKE 21 FM:</strong> <span style="color:${b.color};font-weight:700;">${b.level}</span></div>
              <div style="font-size:11px;color:#475569;margin-top:2px;">${b.desc}</div>
            </div>`
          );
        poly.addTo(mikeKmlGroup);
      });

      // 7. Lớp '10 Vết lũ kiểm định thực tế (7/2023)' - Bảng 3.1 báo cáo MIKE FLOOD
      const floodMarksGroup = L.featureGroup();
      if (initialLayerPrefs.systemLayers.floodMarks2023) {
        floodMarksGroup.addTo(map);
      }
      floodMarks2023LayerRef.current = floodMarksGroup;

      VERIFIED_FLOOD_MARKS_2023.forEach((mark, idx) => {
        const offsetDir = idx % 2 === 0 ? 'translate(10px, -50%)' : 'translate(-108%, -50%)';
        const diffSign = mark.sai_so_m >= 0 ? `+${mark.sai_so_m.toFixed(3)}` : mark.sai_so_m.toFixed(3);
        const absErr = Math.abs(mark.sai_so_m);
        const errBadgeBg = absErr <= 0.3 ? '#dcfce7' : '#fef3c7';
        const errBadgeColor = absErr <= 0.3 ? '#166534' : '#92400e';

        const markIcon = L.divIcon({
          className: 'custom-map-marker',
          html: `
            <div style="position:relative; width:0; height:0; overflow:visible;">
              <span style="position:absolute; left:-5px; top:-5px; width:10px; height:10px; border-radius:9999px; background:#7c3aed; border:2px solid #ffffff; box-shadow:0 0 6px rgba(0,0,0,0.85);"></span>
              <div style="position:absolute; left:0; top:0; transform:${offsetDir}; display:inline-flex; align-items:center; gap:4px; white-space:nowrap; padding:2px 7px; border-radius:12px; font-weight:700; font-size:10px; font-family:monospace; background:rgba(88, 28, 135, 0.94); color:#ffffff; border:1.5px solid #d8b4fe; box-shadow:0 3px 8px rgba(0,0,0,0.55); cursor:pointer;">
                <span>📐 ${mark.code}</span>
                <span style="color:#fde047;">${mark.muc_nuoc_thuc_do_m.toFixed(2)}m</span>
              </div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        L.marker([mark.lat, mark.lng], { icon: markIcon })
          .bindTooltip(
            `<div style="font-family:sans-serif;font-size:11px;font-weight:700;color:#581c87;">${mark.name} • Sai số: ${diffSign}m</div>`,
            { direction: 'top', offset: [0, -8] }
          )
          .bindPopup(`
            <div style="font-family:sans-serif; font-size:12px; padding:4px; min-width:255px; max-width:285px; color:#0f172a;">
              <div style="background:#581c87; color:#ffffff; padding:5px 8px; border-radius:6px; font-weight:700; font-size:12px; margin-bottom:6px;">
                📐 ${mark.name}
              </div>
              <div style="font-size:11px; color:#475569; margin-bottom:6px; font-family:monospace; background:#f8fafc; padding:4px 6px; border-radius:4px; border:1px solid #e2e8f0;">
                <div><strong>Tọa độ VN-2000 (Bảng 3.1):</strong></div>
                <div>• X: <strong>${mark.vn2000_x.toLocaleString('en-US')} m</strong></div>
                <div>• Y: <strong>${mark.vn2000_y.toLocaleString('en-US')} m</strong></div>
              </div>
              <table style="width:100%; border-collapse:collapse; font-size:11px; font-family:monospace;">
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:4px 2px; color:#475569;">Mực nước thực đo (7/2023):</td>
                  <td style="padding:4px 2px; text-align:right; font-weight:700; color:#0A4393;">${mark.muc_nuoc_thuc_do_m.toFixed(3)} m</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:4px 2px; color:#475569;">Mô hình MIKE FLOOD:</td>
                  <td style="padding:4px 2px; text-align:right; font-weight:700; color:#0284c7;">${mark.muc_nuoc_mike_flood_m.toFixed(3)} m</td>
                </tr>
                <tr>
                  <td style="padding:4px 2px; color:#475569;">Sai số kiểm định (ΔH):</td>
                  <td style="padding:4px 2px; text-align:right;">
                    <span style="background:${errBadgeBg}; color:${errBadgeColor}; padding:1px 6px; border-radius:4px; font-weight:800;">
                      ${diffSign} m
                    </span>
                  </td>
                </tr>
              </table>
            </div>
          `)
          .addTo(floodMarksGroup);
      });

      // 9. Lớp 'Công trình Y tế - Giáo dục có nguy cơ ngập' (10 công trình trọng điểm)
      const facilitiesGroup = L.featureGroup();
      if (initialLayerPrefs.systemLayers.vulnerableFacilities) {
        facilitiesGroup.addTo(map);
      }
      facilitiesLayerRef.current = facilitiesGroup;

      VULNERABLE_FACILITIES_EASUP.forEach((fac, idx) => {
        const iconEmoji = fac.type === 'HEALTH' ? '🏥' : fac.type === 'DEFENSE' ? '🛡️' : '🏫';
        const badgeBg =
          fac.depthLevel === '2-3m'
            ? 'rgba(194, 65, 12, 0.96)'
            : fac.depthLevel === '1-2m'
            ? 'rgba(180, 83, 9, 0.96)'
            : 'rgba(30, 64, 175, 0.94)';
        const badgeBorder =
          fac.depthLevel === '2-3m'
            ? '#fdba74'
            : fac.depthLevel === '1-2m'
            ? '#fde047'
            : '#93c5fd';
        const offsetDir = idx % 2 === 0 ? 'translate(-105%, -50%)' : 'translate(10px, -50%)';

        const facIcon = L.divIcon({
          className: 'custom-map-marker',
          html: `
            <div style="position:relative; width:0; height:0; overflow:visible;">
              <span style="position:absolute; left:-4px; top:-4px; width:9px; height:9px; border-radius:9999px; background:${badgeBorder}; border:1.5px solid #ffffff; box-shadow:0 0 6px rgba(0,0,0,0.85);"></span>
              <div style="position:absolute; left:0; top:0; transform:${offsetDir}; display:inline-flex; align-items:center; gap:4px; white-space:nowrap; padding:2px 7px; border-radius:14px; font-weight:700; font-size:10px; font-family:monospace; background:${badgeBg}; color:#ffffff; border:1.5px solid ${badgeBorder}; box-shadow:0 3px 9px rgba(0,0,0,0.6); cursor:pointer;">
                <span>${iconEmoji}</span>
                <span>${fac.shortLabel}</span>
              </div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        L.marker([fac.lat, fac.lng], { icon: facIcon })
          .bindTooltip(
            `<div style="font-family:sans-serif;font-size:11px;font-weight:700;color:#9a3412;">${iconEmoji} ${fac.name} • Ngập dự báo: ${fac.depthRange}</div>`,
            { direction: 'top', offset: [0, -8] }
          )
          .bindPopup(`
            <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:265px; color:#0f172a;">
              <div style="font-weight:800; color:#9a3412; font-size:13px; margin-bottom:4px;">
                ${iconEmoji} ${fac.name}
              </div>
              <div style="font-size:11px; color:#475569; margin-bottom:5px;">
                ${fac.addressNote}
              </div>
              <div style="background:#fff7ed; border:1px solid #fdba74; color:#9a3412; padding:4px 6px; border-radius:4px; font-weight:700; font-size:11px; margin-bottom:5px;">
                ⚠️ Cấp độ ngập MIKE FLOOD: ${fac.depthRange}
              </div>
              <div style="font-size:11px; line-height:1.4; color:#1e293b;">
                <strong>Phương án ứng phó:</strong> ${fac.responsePlan}
              </div>
            </div>
          `)
          .addTo(facilitiesGroup);
      });

      // 10. Lớp '20 Thôn, Buôn trực thuộc xã Ea Súp' (Trực chiến PCTT)
      const villagesGroup = L.featureGroup();
      if (initialLayerPrefs.systemLayers.villages) {
        villagesGroup.addTo(map);
      }
      villagesLayerRef.current = villagesGroup;
      villageMarkersMapRef.current = {};

      Object.values(VILLAGE_DISASTER_PROFILES).forEach((vil) => {
        const isBuon = vil.groupLabel === '03 Buôn đồng bào';
        const isThonTen = vil.groupLabel === '04 Thôn tên';
        const badgeBg = isBuon ? '#059669' : isThonTen ? '#0284c7' : '#0A4393';
        const badgeBorder = isBuon ? '#6ee7b7' : isThonTen ? '#7dd3fc' : '#93c5fd';
        const iconPrefix = isBuon ? '🛖' : isThonTen ? '🏘️' : '🏡';

        const villageIcon = L.divIcon({
          className: 'custom-map-marker',
          html: `
            <div style="position:relative; width:0; height:0; overflow:visible;">
              <span style="position:absolute; left:-4px; top:-4px; width:8px; height:8px; border-radius:9999px; background:${badgeBg}; border:1.5px solid #ffffff; box-shadow:0 0 5px rgba(0,0,0,0.8);"></span>
              <div style="position:absolute; left:0; top:0; transform:translate(-50%, -120%); display:inline-flex; align-items:center; gap:3px; white-space:nowrap; padding:1.5px 6px; border-radius:10px; font-weight:700; font-size:9.5px; font-family:sans-serif; background:${badgeBg}; color:#ffffff; border:1px solid ${badgeBorder}; box-shadow:0 2px 6px rgba(0,0,0,0.45); cursor:pointer;">
                <span>${iconPrefix}</span>
                <span>${vil.name}</span>
                <span style="color:#fde047; font-size:8.5px; opacity:0.9;">+${vil.avgElevationM}m</span>
              </div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const initCoords =
          (typeof window !== 'undefined' &&
            JSON.parse(localStorage.getItem('easup_custom_village_coords') || '{}')[vil.name]) ||
          vil.coordinates;
        const m = L.marker(initCoords, { icon: villageIcon })
          .bindTooltip(
            `<div style="font-family:sans-serif;font-size:11px;font-weight:700;color:${badgeBg};">${vil.name} • ${vil.totalHouseholds} hộ • Cao độ: +${vil.avgElevationM}m</div>`,
            { direction: 'top', offset: [0, -10] }
          )
          .bindPopup(`
            <div style="font-family:sans-serif; font-size:12px; padding:4px; min-width:260px; max-width:290px; color:#0f172a;">
              <div style="background:${badgeBg}; color:#ffffff; padding:5px 8px; border-radius:6px; font-weight:700; font-size:12px; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
                <span>${iconPrefix} ${vil.name}</span>
                <span style="background:rgba(255,255,255,0.25); padding:1px 5px; border-radius:4px; font-size:10px;">${vil.groupLabel}</span>
              </div>
              <div style="font-size:11px; color:#475569; margin-bottom:6px; background:#f8fafc; padding:5px 7px; border-radius:4px; border:1px solid #e2e8f0; line-height:1.4;">
                <div>• Quy mô: <strong>${vil.totalHouseholds} hộ dân</strong></div>
                <div>• Cao độ địa hình: <strong>+${vil.avgElevationM}m</strong></div>
                <div>• Đặc điểm: <em>${vil.terrainNote}</em></div>
              </div>
              <div style="font-size:11px; background:#eff6ff; padding:5px 7px; border-radius:4px; border:1px solid #bfdbfe; color:#1e40af; line-height:1.4;">
                <div style="font-weight:700;">📍 Điểm sơ tán an toàn:</div>
                <div>${vil.evacuationPoint} (Cự ly: ${vil.evacuationDistanceKm}km, Cao độ: +${vil.evacuationElevationM}m)</div>
                <div style="margin-top:3px; font-size:10px; color:#3b82f6;"><strong>Chỉ huy:</strong> ${vil.leaderUnit}</div>
              </div>
            </div>
          `);

        m.on('click', () => {
          syncToggleVillage(vil.name, true);
        });

        const isVilVisible = initialLayerPrefs.villageVisibility?.[vil.name] !== false;
        if (isVilVisible) {
          m.addTo(villagesGroup);
        }

        villageMarkersMapRef.current[vil.name] = m;
      });

      // LẮNG NGHE SỰ KIỆN BẤM ĐÈ CHUỘT TRÁI / CHUỘT PHẢI ĐỂ CẮM GHIM & VẼ KHU VỰC
      map.on('mousedown', (e: any) => {
        if (isDrawingModeRef.current) {
          startLatLngRef.current = e.latlng;
          if (drawingRectRef.current) {
            map.removeLayer(drawingRectRef.current);
            drawingRectRef.current = null;
          }
          drawingRectRef.current = L.rectangle([e.latlng, e.latlng], {
            color: '#f59e0b',
            weight: 2.5,
            dashArray: '5, 5',
            fillColor: '#fbbf24',
            fillOpacity: 0.25,
          }).addTo(map);
          return;
        }

        // Bấm đè chuột trái (Long-press ~450ms) để cắm ghim vị trí & xem số tọa độ
        const origEv = e.originalEvent;
        if (!origEv || origEv.button === 0) {
          pressStartPointRef.current = { x: e.containerPoint.x, y: e.containerPoint.y };
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          longPressTimerRef.current = setTimeout(() => {
            pinLocationRef.current?.(e.latlng.lat, e.latlng.lng);
            longPressTimerRef.current = null;
          }, 450);
        }
      });

      map.on('mousemove', (e: any) => {
        if (isDrawingModeRef.current) {
          if (!startLatLngRef.current || !drawingRectRef.current) return;
          drawingRectRef.current.setBounds(L.latLngBounds(startLatLngRef.current, e.latlng));
          return;
        }

        // Nếu di chuyển chuột vượt quá 6px thì hủy hẹn giờ bấm đè (người dùng đang kéo bản đồ)
        if (longPressTimerRef.current && pressStartPointRef.current) {
          const dx = e.containerPoint.x - pressStartPointRef.current.x;
          const dy = e.containerPoint.y - pressStartPointRef.current.y;
          if (Math.hypot(dx, dy) > 6) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      });

      map.on('mouseup', (e: any) => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }

        if (!isDrawingModeRef.current || !startLatLngRef.current) return;
        const bounds = L.latLngBounds(startLatLngRef.current, e.latlng);
        startLatLngRef.current = null;

        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const dLat = Math.abs(ne.lat - sw.lat) * 111320;
        const dLng = Math.abs(ne.lng - sw.lng) * 111320 * Math.cos(((ne.lat + sw.lat) / 2) * Math.PI / 180);
        const areaM2 = dLat * dLng;
        const areaHa = Number(Math.max(areaM2 / 10000, 1.0).toFixed(1));

        const newCustomArea: AreaDefinition = {
          name: `Vùng Người Dùng Vẽ (${areaHa} ha)`,
          center: [(sw.lat + ne.lat) / 2, (sw.lng + ne.lng) / 2],
          zoom: map.getZoom(),
          areaHa,
          ndvi2001: 0.75,
          ndvi2026: 0.62,
          cover2001: 83,
          cover2026: 69,
          coords: [
            [sw.lat, sw.lng],
            [ne.lat, sw.lng],
            [ne.lat, ne.lng],
            [sw.lat, ne.lng],
          ],
          note: `Khu vực khoanh vẽ đo đạc tự do tọa độ [${sw.lat.toFixed(4)}, ${sw.lng.toFixed(4)}]`,
        };

        setCustomArea(newCustomArea);
        setSelectedAreaKey('CUSTOM');
        setIsDrawingMode(false);
        isDrawingModeRef.current = false;
        map.dragging.enable();
        if (mapContainerRef.current) {
          mapContainerRef.current.style.cursor = '';
        }

        renderComparisonLayer(compareMode, 'CUSTOM', newCustomArea);
      });

      map.on('dragstart', () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      });

      map.on('zoomstart', () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      });

      map.on('contextmenu', (e: any) => {
        if (e.originalEvent) {
          e.originalEvent.preventDefault();
        }
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        pinLocationRef.current?.(e.latlng.lat, e.latlng.lng);
      });

      leafletMapRef.current = map;
      setMapLoaded(true);
      updateGibsOverlay(selectedGibsLayer, gibsOpacity);
    });

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Thay đổi Basemap
  const handleBasemapChange = (baseKey: keyof typeof BASEMAP_TILES) => {
    setActiveBasemap(baseKey);
    const map = leafletMapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      if (currentBaseTileRef.current) {
        map.removeLayer(currentBaseTileRef.current);
      }
      const newConfig = BASEMAP_TILES[baseKey];
      const newBaseTile = L.tileLayer(newConfig.url, {
        attribution: newConfig.attribution,
        maxZoom: newConfig.maxZoom,
      }).addTo(map);

      // Nếu đang trong chế độ so sánh theo năm thì để ẩn basemap để ảnh năm hiển thị rõ
      if (showSwipeTool) {
        newBaseTile.setOpacity(0);
      } else {
        newBaseTile.setOpacity(1);
      }

      newBaseTile.bringToBack();
      currentBaseTileRef.current = newBaseTile;
    });
  };

  // Xử lý khi người dùng chọn lớp Vệ Tinh NASA GIBS
  const handleGibsChange = (layerKey: string) => {
    setSelectedGibsLayer(layerKey);
    updateGibsOverlay(layerKey, gibsOpacity);
  };

  // Tự động chạy tua theo từng năm (2001 -> 2026)
  useEffect(() => {
    if (!isAutoPlayYear) {
      if (yearPlayTimerRef.current) clearInterval(yearPlayTimerRef.current);
      return;
    }

    yearPlayTimerRef.current = setInterval(() => {
      setSelectedYear((prev) => {
        const nextYear = prev >= 2026 ? 2001 : prev + 1;
        renderComparisonLayer(nextYear, selectedAreaKey, customArea);
        return nextYear;
      });
    }, 700);

    return () => {
      if (yearPlayTimerRef.current) clearInterval(yearPlayTimerRef.current);
    };
  }, [isAutoPlayYear, selectedAreaKey, customArea]);

  // Bật/tắt công cụ So Sánh 25 Năm
  const handleToggleSwipeTool = () => {
    const nextState = !showSwipeTool;
    setShowSwipeTool(nextState);
    const map = leafletMapRef.current;
    if (!map) return;

    if (nextState) {
      renderComparisonLayer(compareMode === 'DELTA' ? 'DELTA' : selectedYear, selectedAreaKey, customArea, undefined, false);
    } else {
      setIsAutoPlayYear(false);
      setIsAutoPlay(false);
      setIsDrawingMode(false);
      isDrawingModeRef.current = false;
      map.dragging.enable();
      if (mapContainerRef.current) mapContainerRef.current.style.cursor = '';
      if (temporalTileLayerRef.current) {
        map.removeLayer(temporalTileLayerRef.current);
        temporalTileLayerRef.current = null;
      }
      // Khôi phục hiển thị Basemap chuẩn khi đóng công cụ so sánh
      if (currentBaseTileRef.current) {
        currentBaseTileRef.current.setOpacity(1.0);
      }
      if (compareFeatureGroupRef.current) {
        map.removeLayer(compareFeatureGroupRef.current);
        compareFeatureGroupRef.current = null;
      }
      if (drawingRectRef.current) {
        map.removeLayer(drawingRectRef.current);
        drawingRectRef.current = null;
      }
    }
  };

  // Chọn năm cụ thể trên thanh trượt hoặc mốc nhanh (TUYỆT ĐỐI KHÔNG ZOOM / NO PAN)
  const handleSelectYear = (year: number) => {
    setSelectedYear(year);
    setCompareMode(year);
    renderComparisonLayer(year, selectedAreaKey, customArea, undefined, false);
  };

  // Chuyển đổi mốc so sánh trực tiếp
  const handleSelectCompareMode = (mode: '2001' | '2026' | 'DELTA') => {
    setIsAutoPlayYear(false);
    setIsAutoPlay(false);
    setCompareMode(mode);
    if (mode === '2001') {
      setSelectedYear(2001);
      renderComparisonLayer(2001, selectedAreaKey, customArea, undefined, false);
    } else if (mode === '2026') {
      setSelectedYear(2026);
      renderComparisonLayer(2026, selectedAreaKey, customArea, undefined, false);
    } else {
      renderComparisonLayer('DELTA', selectedAreaKey, customArea, undefined, false);
    }
  };

  // Chọn khu vực so sánh từ danh sách (chỉ bay camera khi đổi vùng)
  const handleSelectArea = (areaKey: string) => {
    setSelectedAreaKey(areaKey);
    renderComparisonLayer(compareMode === 'DELTA' ? 'DELTA' : selectedYear, areaKey, customArea, undefined, true);
  };

  // Bật / tắt chế độ vẽ vùng tự do
  const handleToggleDrawing = () => {
    const map = leafletMapRef.current;
    if (!map) return;
    const next = !isDrawingMode;
    setIsDrawingMode(next);
    isDrawingModeRef.current = next;

    if (next) {
      map.dragging.disable();
      if (mapContainerRef.current) {
        mapContainerRef.current.style.cursor = 'crosshair';
      }
    } else {
      map.dragging.enable();
      if (mapContainerRef.current) {
        mapContainerRef.current.style.cursor = '';
      }
    }
  };

  // Xóa vùng người dùng vẽ
  const handleClearCustomArea = () => {
    const map = leafletMapRef.current;
    setCustomArea(null);
    setSelectedAreaKey('TK_293');
    if (drawingRectRef.current && map) {
      map.removeLayer(drawingRectRef.current);
      drawingRectRef.current = null;
    }
    renderComparisonLayer(compareMode === 'DELTA' ? 'DELTA' : selectedYear, 'TK_293', null);
  };

  // Điều chỉnh độ mờ (Opacity) và đồng bộ trực tiếp với lớp vệ tinh NASA (Ảnh 2)
  const handleOpacityChange = (newOpacity: number) => {
    setGibsOpacity(newOpacity);
    if (gibsTileLayerRef.current) {
      gibsTileLayerRef.current.setOpacity(newOpacity);
    } else {
      updateGibsOverlay(selectedGibsLayer, newOpacity);
    }
  };

  // ================= ĐỊNH VỊ VỊ TRÍ ĐANG ĐỨNG & KIỂM TRA NGUY CƠ NGẬP TẠI TỌA ĐỘ GPS =================
  const renderUserLocationMarker = (
    lat: number,
    lng: number,
    withFloodAudit: boolean = false,
    accuracyMeters?: number
  ) => {
    const map = leafletMapRef.current;
    if (!map) return;

    const audit = evaluateGpsFloodRisk(
      lat,
      lng,
      hydraulicModel.code,
      hydraulicModel.totalFloodedAreaHa > 0 ? hydraulicModel.totalFloodedAreaHa : 1613.76
    );
    if (withFloodAudit) {
      setGpsFloodRiskResult(audit);
    }

    import('leaflet').then((L) => {
      if (userLocationLayerRef.current) {
        map.removeLayer(userLocationLayerRef.current);
        userLocationLayerRef.current = null;
      }

      const group = L.featureGroup().addTo(map);
      userLocationLayerRef.current = group;

      // Vòng tròn bán kính vị trí GPS trực quan
      L.circle([lat, lng], {
        radius: Math.max(12, Math.min(accuracyMeters || 25, 100)),
        color: '#2563eb',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
      }).addTo(group);

      const gpsIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="font-size:28px; line-height:1; filter:drop-shadow(0 3px 6px rgba(0,0,0,0.75)); cursor:pointer; user-select:none;">
            📍
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 26],
      });

      const marker = L.marker([lat, lng], { icon: gpsIcon }).addTo(group);

      if (withFloodAudit) {
        marker.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:3px; max-width:265px; color:#0f172a;">
            <div style="background:${audit.badgeColor}; color:#ffffff; padding:5px 8px; border-radius:6px; font-weight:800; font-size:11.5px; margin-bottom:6px; text-align:center;">
              📍 KIỂM TRA NGẬP TẠI VỊ TRÍ CỦA BẠN
            </div>
            <div style="font-size:11px; color:#0A4393; font-family:monospace; font-weight:700; margin-bottom:4px;">
              • Tọa độ GPS: ${lat.toFixed(6)}°B, ${lng.toFixed(6)}°Đ${
                accuracyMeters ? ` (±${Math.round(accuracyMeters)}m)` : ''
              }
            </div>
            <div style="font-size:11px; color:#475569; margin-bottom:5px;">
              • Vết lũ 7/2023 gần nhất: <strong>${audit.nearestMark.code} (${audit.minDistKm} km)</strong>
            </div>
            <div style="background:#f8fafc; border:1.5px solid ${audit.badgeColor}; color:${audit.badgeColor}; padding:5px 7px; border-radius:5px; font-weight:800; font-size:11.5px; margin-bottom:6px; text-align:center;">
              ${audit.riskLabel}
            </div>
            <div style="font-size:11px; color:#1e293b; line-height:1.4;">
              <strong>Khuyến nghị:</strong> ${audit.recommendation}
            </div>
          </div>
        `);
      } else {
        marker.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:3px; max-width:240px; color:#0f172a;">
            <div style="background:#0A4393; color:#ffffff; padding:4px 8px; border-radius:6px; font-weight:800; font-size:11.5px; margin-bottom:5px; text-align:center;">
              📍 VỊ TRÍ GPS ĐANG ĐỨNG
            </div>
            <div style="font-size:11px; color:#1e293b; font-family:monospace; line-height:1.5;">
              <div>• Vĩ độ: <strong>${lat.toFixed(6)}°B</strong></div>
              <div>• Kinh độ: <strong>${lng.toFixed(6)}°Đ</strong></div>
              ${
                accuracyMeters
                  ? `<div>• Độ chính xác: <strong>±${Math.round(accuracyMeters)}m</strong></div>`
                  : ''
              }
            </div>
          </div>
        `);
      }

      // Phóng bản đồ (Zoom cấp 17) về sát ngay vị trí tọa độ GPS vừa xác định
      map.flyTo([lat, lng], 17, { animate: true, duration: 1.0 });

      setTimeout(() => {
        try {
          marker.openPopup();
        } catch {}
      }, 450);
    });
  };

  const acquireGpsAndZoomToUser = (withFloodAudit: boolean) => {
    if (typeof window === 'undefined') return;
    setIsLocating(true);
    setLocateMessage('Đang xác định tọa độ GPS đang đứng...');

    const clearLocateNotice = (msg?: string) => {
      if (msg) {
        setLocateMessage(msg);
        setTimeout(() => setLocateMessage(null), 2800);
      } else {
        setLocateMessage(null);
      }
    };

    if (!('geolocation' in navigator)) {
      setIsLocating(false);
      clearLocateNotice('Thiết bị không hỗ trợ GPS, hiển thị tâm xã Ea Súp.');
      renderUserLocationMarker(13.0682, 107.8845, withFloodAudit);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        clearLocateNotice(
          `Đã định vị GPS: ${latitude.toFixed(5)}°B, ${longitude.toFixed(5)}°Đ`
        );
        renderUserLocationMarker(latitude, longitude, withFloodAudit, accuracy);
      },
      () => {
        // Thử lại nhanh với định vị hỗn hợp (Wi-Fi / Trạm phát sóng) nếu GPS phần cứng phản hồi chậm
        navigator.geolocation.getCurrentPosition(
          (posFallback) => {
            setIsLocating(false);
            const { latitude, longitude, accuracy } = posFallback.coords;
            clearLocateNotice(
              `Đã định vị GPS: ${latitude.toFixed(5)}°B, ${longitude.toFixed(5)}°Đ`
            );
            renderUserLocationMarker(latitude, longitude, withFloodAudit, accuracy);
          },
          () => {
            setIsLocating(false);
            clearLocateNotice('Vui lòng bật quyền vị trí GPS trên trình duyệt.');
            renderUserLocationMarker(13.0682, 107.8845, withFloodAudit);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 10000 }
    );
  };

  const handleLocateUser = () => {
    acquireGpsAndZoomToUser(false);
  };

  const handleCheckGpsFloodRisk = () => {
    acquireGpsAndZoomToUser(true);
  };

  // ================= QUẢN LÝ NHIỀU LỚP BẢN ĐỒ KMZ (ban_ve,_mat_cat.kmz) =================
  const resolveKmzUrl = (relPath: string) => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/canhbao')) {
      return `/canhbao${relPath}`;
    }
    return relPath;
  };

  const renderKmzLayerOnMap = async (item: KmzLayerManifestItem) => {
    const map = leafletMapRef.current;
    if (!map) return;

    const L = await import('leaflet');
    if (kmzLayerGroupsRef.current[item.id]) {
      if (!map.hasLayer(kmzLayerGroupsRef.current[item.id])) {
        kmzLayerGroupsRef.current[item.id].addTo(map);
      }
      return;
    }

    let layerData = kmzDataCacheRef.current[item.id];
    if (!layerData) {
      setLoadingKmzLayers((prev) => ({ ...prev, [item.id]: true }));
      try {
        const safeId = String(item.id).replace(/[^a-zA-Z0-9_-]/g, '_');
        const targetUrl =
          item.file || `/api/kml/layers?id=${encodeURIComponent(safeId)}`;
        const res = await fetch(resolveKmzUrl(targetUrl), { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        layerData = await res.json();
        kmzDataCacheRef.current[item.id] = layerData;
        saveKmlToIndexedDB(item, layerData).catch(() => {});
      } catch (e) {
        console.error('Failed to load KMZ layer:', item.id, e);
        setLoadingKmzLayers((prev) => ({ ...prev, [item.id]: false }));
        return;
      }
      setLoadingKmzLayers((prev) => ({ ...prev, [item.id]: false }));
    }

    if (!leafletMapRef.current || !layerData || !Array.isArray(layerData.groups)) return;
    const renderer = canvasRendererRef.current || L.canvas({ padding: 0.5, tolerance: 6 });
    const layerGroup = L.featureGroup();
    const displayLabel = item.label || layerData.label;

    const popupHtml = `
      <div style="font-family:sans-serif; font-size:12px; font-weight:700; color:#0A4393; padding:2px 4px; white-space:nowrap;">
        ${displayLabel}
      </div>
    `;

    const buildTooltipHtml = (name: string, dotColor: string) => `
      <div style="display:inline-flex; align-items:center; gap:5px; font-family:sans-serif; font-size:11px; font-weight:600; color:#0A4393; padding:1px 4px; white-space:nowrap;">
        <span style="width:8px; height:8px; border-radius:2px; background:${dotColor}; display:inline-block; border:1px solid rgba(0,0,0,0.25);"></span>
        <span>${name}</span>
      </div>
    `;

    // Nhận diện thôn buôn tương ứng với file KML/GeoJSON này để kích hoạt hiển thị thông tin và đồng bộ khi bấm vào ranh thôn
    const matchedVillageForKmz = VILLAGE_LIST_21.find((v) => isVillageMatch(v.name, displayLabel));

    for (const grp of layerData.groups) {
      const strokeColor = grp.color || item.color || '#38bdf8';
      const baseWeight = Math.max(2.2, grp.weight || 2.2);
      const tooltipHtml = buildTooltipHtml(displayLabel, strokeColor);

      if (grp.lines && grp.lines.length > 0) {
        const polyLine = L.polyline(grp.lines as any, {
          renderer,
          color: strokeColor,
          weight: baseWeight,
          opacity: 0.92,
        })
          .bindTooltip(tooltipHtml, {
            sticky: true,
            direction: 'top',
            offset: [0, -8],
            opacity: 0.96,
          })
          .bindPopup(popupHtml);

        if (matchedVillageForKmz) {
          polyLine.on('click', () => {
            syncToggleVillage(matchedVillageForKmz.name, true);
          });

          if (!villageBoundaryPathsRef.current[matchedVillageForKmz.name]) {
            villageBoundaryPathsRef.current[matchedVillageForKmz.name] = [];
          }
          villageBoundaryPathsRef.current[matchedVillageForKmz.name].push({
            path: polyLine,
            originalStyle: {
              color: strokeColor,
              weight: baseWeight,
              opacity: 0.92,
            },
          });

          if (scenarioId && scenarioId !== 'NONE' && scenarioId !== 'CUSTOM_SLIDER') {
            const scMeta = MIKE_FLOOD_SCENARIOS[scenarioId];
            if (scMeta?.affectedVillages?.includes(matchedVillageForKmz.name)) {
              polyLine.setStyle({
                color: '#e11d48',
                weight: 4.2,
                opacity: 1,
              });
              setTimeout(() => {
                if ((polyLine as any)._path) {
                  (polyLine as any)._path.classList.add('flood-warning-pulsing-path');
                }
              }, 60);
              setTimeout(() => {
                if ((polyLine as any)._path) {
                  (polyLine as any)._path.classList.remove('flood-warning-pulsing-path');
                }
              }, 5060);
            }
          }
        }

        polyLine.on('mouseover', () => {
          polyLine.setStyle({ weight: baseWeight + 1.8, opacity: 1 });
        });
        polyLine.on('mouseout', () => {
          polyLine.setStyle({ weight: baseWeight, opacity: 0.92 });
        });

        polyLine.addTo(layerGroup);
      }
      if (grp.polys && grp.polys.length > 0) {
        const polyWeight = grp.outline ? 2.0 : 1.5;
        const polygon = L.polygon(grp.polys as any, {
          renderer,
          color: strokeColor,
          fillColor: grp.fillColor || strokeColor,
          fillOpacity: grp.outline ? 0.35 : 0.55,
          weight: polyWeight,
        })
          .bindTooltip(tooltipHtml, {
            sticky: true,
            direction: 'top',
            offset: [0, -8],
            opacity: 0.96,
          })
          .bindPopup(popupHtml);

        if (matchedVillageForKmz) {
          polygon.on('click', () => {
            syncToggleVillage(matchedVillageForKmz.name, true);
          });

          if (!villageBoundaryPathsRef.current[matchedVillageForKmz.name]) {
            villageBoundaryPathsRef.current[matchedVillageForKmz.name] = [];
          }
          villageBoundaryPathsRef.current[matchedVillageForKmz.name].push({
            path: polygon,
            originalStyle: {
              color: strokeColor,
              weight: polyWeight,
              fillColor: grp.fillColor || strokeColor,
              fillOpacity: grp.outline ? 0.35 : 0.55,
            },
          });

          if (scenarioId && scenarioId !== 'NONE' && scenarioId !== 'CUSTOM_SLIDER') {
            const scMeta = MIKE_FLOOD_SCENARIOS[scenarioId];
            if (scMeta?.affectedVillages?.includes(matchedVillageForKmz.name)) {
              polygon.setStyle({
                color: '#e11d48',
                fillColor: '#f43f5e',
                fillOpacity: 0.52,
                weight: 4.2,
              });
              setTimeout(() => {
                if ((polygon as any)._path) {
                  (polygon as any)._path.classList.add('flood-warning-pulsing-path');
                }
              }, 60);
              setTimeout(() => {
                if ((polygon as any)._path) {
                  (polygon as any)._path.classList.remove('flood-warning-pulsing-path');
                }
              }, 5060);
            }
          }
        }

        polygon.on('mouseover', () => {
          polygon.setStyle({ weight: polyWeight + 1.5 });
        });
        polygon.on('mouseout', () => {
          polygon.setStyle({ weight: polyWeight });
        });

        polygon.addTo(layerGroup);
      }
    }

    kmzLayerGroupsRef.current[item.id] = layerGroup;
    layerGroup.addTo(map);
  };

  // Tự động nạp manifest.json + khôi phục toàn bộ các file .KML đã tải lên (từ Server & IndexedDB) khi bản đồ sẵn sàng
  useEffect(() => {
    if (!mapLoaded) return;
    let isSubscribed = true;

    Promise.all([
      fetch(resolveKmzUrl('/data/kmz/manifest.json'))
        .then((r) => r.json())
        .catch(() => []),
      loadAllPersistedKmlState(),
    ])
      .then(async ([manifestList, persisted]) => {
        if (!isSubscribed) return;

        const baseList: KmzLayerManifestItem[] = Array.isArray(manifestList) ? manifestList : [];
        const { customItems, cachedDataMap, customNames, enabledStates } = persisted;

        // Nạp trước dữ liệu hình học từ IndexedDB vào bộ nhớ đệm
        for (const [k, v] of Object.entries(cachedDataMap)) {
          kmzDataCacheRef.current[k] = v;
        }

        // Gộp danh sách lớp mặc định và các lớp file .KML người dùng đã tải lên
        const combinedMap = new Map<string, KmzLayerManifestItem>();
        for (const item of baseList) {
          combinedMap.set(item.id, {
            ...item,
            label: customNames[item.id] || item.label,
            isUserUploaded: false,
          });
        }
        for (const cItem of customItems) {
          combinedMap.set(cItem.id, {
            ...cItem,
            label: customNames[cItem.id] || cItem.label,
            isUserUploaded: true,
          });
        }

        const mergedList = Array.from(combinedMap.values());
        setKmzManifest(mergedList);

        const initialEnabled: Record<string, boolean> = {};
        const storedPrefs = getStoredLayerPreferences();
        const storedKmz = storedPrefs.enabledKmzLayers;

        for (const item of mergedList) {
          if (storedKmz && typeof storedKmz[item.id] === 'boolean') {
            initialEnabled[item.id] = storedKmz[item.id];
          } else if (typeof enabledStates[item.id] === 'boolean') {
            initialEnabled[item.id] = enabledStates[item.id];
          } else {
            // Mặc định bỏ chọn các file KML phụ theo đúng chuẩn Ảnh 2 (Lũ: 0/4, Thôn: 0/23)
            initialEnabled[item.id] = false;
          }
        }
        setEnabledKmzLayers(initialEnabled);

        for (const item of mergedList) {
          if (initialEnabled[item.id] && isSubscribed) {
            await renderKmzLayerOnMap(item);
          }
        }
      })
      .catch((err) => {
        console.error('Error loading KMZ & persisted KML layers:', err);
      });

    return () => {
      isSubscribed = false;
    };
  }, [mapLoaded]);

  // Phân biệt lớp do người dùng tải lên và lớp mặc định của hệ thống
  const isUserUploadLayer = (item: KmzLayerManifestItem) => {
    if (item.id === 'KMZ_BAN_VE_MAT_CAT') return false;
    return !!item.isUserUploaded || item.id.startsWith('KML_') || item.id.startsWith('CUSTOM_');
  };

  // Chỉnh sửa tên lớp bản đồ theo file .KML / .KMZ (chỉ áp dụng cho file do người dùng upload)
  const handleStartEditLayerName = (item: KmzLayerManifestItem) => {
    if (!isUserUploadLayer(item)) {
      alert('Đây là lớp dữ liệu gốc của hệ thống, không được phép chỉnh sửa tên!');
      return;
    }
    setEditingLayerId(item.id);
    setEditingLayerName(item.label);
  };

  const handleSaveLayerName = (id: string) => {
    const trimmed = editingLayerName.trim();
    if (trimmed) {
      const targetItem = kmzManifest.find((item) => item.id === id);
      const dotColor = targetItem?.color || '#38bdf8';

      setKmzManifest((prev) =>
        prev.map((item) => (item.id === id ? { ...item, label: trimmed } : item))
      );
      if (kmzDataCacheRef.current[id]) {
        kmzDataCacheRef.current[id].label = trimmed;
      }

      // Cập nhật ngay nhãn nổi (tooltip) & popup trên bản đồ khi đổi tên lớp
      const existingGroup = kmzLayerGroupsRef.current[id];
      if (existingGroup && typeof existingGroup.eachLayer === 'function') {
        const newTooltipHtml = `
          <div style="display:inline-flex; align-items:center; gap:5px; font-family:sans-serif; font-size:11px; font-weight:600; color:#0A4393; padding:1px 4px; white-space:nowrap;">
            <span style="width:8px; height:8px; border-radius:2px; background:${dotColor}; display:inline-block; border:1px solid rgba(0,0,0,0.25);"></span>
            <span>${trimmed}</span>
          </div>
        `;
        const newPopupHtml = `
          <div style="font-family:sans-serif; font-size:12px; font-weight:700; color:#0A4393; padding:2px 4px; white-space:nowrap;">
            ${trimmed}
          </div>
        `;
        existingGroup.eachLayer((subLayer: any) => {
          if (typeof subLayer.setTooltipContent === 'function') {
            subLayer.setTooltipContent(newTooltipHtml);
          }
          if (typeof subLayer.setPopupContent === 'function') {
            subLayer.setPopupContent(newPopupHtml);
          }
        });
      }

      persistKmlLayerUpdate(id, { label: trimmed });
    }
    setEditingLayerId(null);
  };

  const handleToggleKmzLayer = async (item: KmzLayerManifestItem) => {
    const map = leafletMapRef.current;
    if (!map) return;

    // Kiểm tra xem đây có phải là lớp ranh thôn không để đồng bộ 2 chiều toàn diện
    const matched = VILLAGE_LIST_21.find((v) => isVillageMatch(v.name, item.label));
    if (matched) {
      await syncToggleVillage(matched.name);
      return;
    }

    const nextState = !enabledKmzLayers[item.id];
    setEnabledKmzLayers((prev) => ({ ...prev, [item.id]: nextState }));
    persistKmlLayerUpdate(item.id, { enabled: nextState });

    if (nextState) {
      await renderKmzLayerOnMap(item);
    } else {
      const existing = kmzLayerGroupsRef.current[item.id];
      if (existing && map.hasLayer(existing)) {
        map.removeLayer(existing);
      }
    }
  };

  const handleDeleteKmzLayer = async (item: KmzLayerManifestItem) => {
    if (!isUserUploadLayer(item)) {
      alert('Đây là lớp dữ liệu gốc của hệ thống, không được phép xóa!');
      return;
    }
    const map = leafletMapRef.current;
    const existing = kmzLayerGroupsRef.current[item.id];
    if (existing && map && map.hasLayer(existing)) {
      map.removeLayer(existing);
    }
    delete kmzLayerGroupsRef.current[item.id];
    delete kmzDataCacheRef.current[item.id];

    setKmzManifest((prev) => prev.filter((m) => m.id !== item.id));
    setEnabledKmzLayers((prev) => {
      const copy = { ...prev };
      delete copy[item.id];
      return copy;
    });

    await removePersistedKmlLayer(item.id);
  };

  const handleFlyToKmzLayer = async (item: KmzLayerManifestItem) => {
    const map = leafletMapRef.current;
    if (!map) return;

    // Đồng bộ 2 chiều nếu là lớp ranh thôn
    const matched = VILLAGE_LIST_21.find((v) => isVillageMatch(v.name, item.label));
    if (matched) {
      await syncToggleVillage(matched.name, true);
      return;
    }

    if (!enabledKmzLayers[item.id]) {
      setEnabledKmzLayers((prev) => ({ ...prev, [item.id]: true }));
      persistKmlLayerUpdate(item.id, { enabled: true });
      await renderKmzLayerOnMap(item);
    }
    if (item.bounds && item.bounds.length === 2) {
      map.flyToBounds(item.bounds, { padding: [30, 30], maxZoom: 16, duration: 0.9 });
    }
  };

  const handleToggleSystemLayer = (
    key:
      | 'markers'
      | 'buffer'
      | 'floodMarks2023'
      | 'vulnerableFacilities'
      | 'mikeKmlFile'
      | 'villages'
  ) => {
    const map = leafletMapRef.current;
    if (!map) return;
    const nextVal = !systemLayers[key];
    setSystemLayers((prev) => ({ ...prev, [key]: nextVal }));

    const refMap: Record<typeof key, React.MutableRefObject<any>> = {
      markers: systemMarkersGroupRef,
      buffer: bufferCircleLayerRef,
      floodMarks2023: floodMarks2023LayerRef,
      vulnerableFacilities: facilitiesLayerRef,
      mikeKmlFile: mikeKmlLayerRef,
      villages: villagesLayerRef,
    };

    const targetRef = refMap[key];
    if (targetRef?.current) {
      if (nextVal) targetRef.current.addTo(map);
      else map.removeLayer(targetRef.current);
    }
  };

  const handleFlyToSystemLayer = (
    key: 'floodMarks2023' | 'vulnerableFacilities' | 'mikeKmlFile' | 'villages'
  ) => {
    const map = leafletMapRef.current;
    if (!map) return;
    if (!systemLayers[key]) {
      handleToggleSystemLayer(key);
    }
    if (key === 'floodMarks2023') {
      map.flyTo([13.084, 107.878], 13, { duration: 0.9 });
    } else if (key === 'vulnerableFacilities') {
      map.flyTo([13.072, 107.886], 13, { duration: 0.9 });
    } else if (key === 'villages') {
      map.flyTo([13.064, 107.888], 12.8, { duration: 0.9 });
    } else {
      map.flyTo([13.078, 107.882], 12, { duration: 0.9 });
    }
  };

  // Xử lý cắm ghim vị trí và hiển thị tọa độ chi tiết khi bấm đè chuột trái / chuột phải
  const handlePinMapLocation = useCallback(async (lat: number, lng: number) => {
    const map = leafletMapRef.current;
    if (!map) return;
    const L = await import('leaflet');

    // Xóa marker cũ nếu đang có
    if (pinnedMarkerRef.current) {
      try {
        map.removeLayer(pinnedMarkerRef.current);
      } catch {}
      pinnedMarkerRef.current = null;
    }

    setPinnedCoord({ lat, lng });

    // Icon SVG ghim định vị màu đỏ sắc nét có đổ bóng 3D
    const pinIcon = L.divIcon({
      className: 'custom-pinned-location-marker',
      html: `
        <div style="position:relative; width:34px; height:44px; transform:translate(-50%, -100%); cursor:grab;">
          <svg viewBox="0 0 384 512" width="34" height="44" style="filter:drop-shadow(0 4px 6px rgba(0,0,0,0.5));">
            <path fill="#dc2626" stroke="#ffffff" stroke-width="16" d="M384 192C384 279.4 267.4 435 215.7 499.2C207.8 509 192.2 509 184.3 499.2C132.6 435 16 279.4 16 192C16 86 101.9 0 208 0C314.1 0 384 86 384 192Z"/>
            <circle cx="192" cy="192" r="72" fill="#ffffff"/>
            <circle cx="192" cy="192" r="42" fill="#991b1b"/>
          </svg>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      popupAnchor: [0, -44],
    });

    const marker = L.marker([lat, lng], {
      icon: pinIcon,
      draggable: true,
      zIndexOffset: 12000,
    }).addTo(map);

    pinnedMarkerRef.current = marker;

    const buildPopupEl = (curLat: number, curLng: number) => {
      const box = document.createElement('div');
      box.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      box.style.minWidth = '230px';
      box.style.padding = '2px';

      box.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;">
          <span style="font-size:16px;">📍</span>
          <strong style="color:#0f172a; font-size:13px; text-transform:uppercase; letter-spacing:0.3px;">Điểm Ghim Tọa Độ</strong>
        </div>
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:7px 9px; margin-bottom:8px; font-size:11.5px; line-height:1.6;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#64748b; font-size:11px;">Vĩ độ (Lat / Y):</span>
            <strong style="color:#0f172a; font-family:monospace; font-size:13px;">${curLat.toFixed(6)}°</strong>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
            <span style="color:#64748b; font-size:11px;">Kinh độ (Lng / X):</span>
            <strong style="color:#0f172a; font-family:monospace; font-size:13px;">${curLng.toFixed(6)}°</strong>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          <button id="btn-copy-pin" style="width:100%; background:#0a4393; color:#fff; border:none; padding:7px 10px; border-radius:6px; font-weight:700; font-size:11.5px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; transition:0.15s;">
            📋 Sao chép tọa độ (${curLat.toFixed(4)}, ${curLng.toFixed(4)})
          </button>
          <button id="btn-remove-pin" style="width:100%; background:#fef2f2; color:#dc2626; border:1px solid #fecaca; padding:5px 10px; border-radius:6px; font-weight:600; font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
            ✕ Bỏ ghim vị trí này
          </button>
        </div>
        <div style="margin-top:6px; font-size:10px; color:#94a3b8; text-align:center;">
          💡 Giữ chuột kéo ghim để tinh chỉnh vị trí
        </div>
      `;

      const copyBtn = box.querySelector('#btn-copy-pin') as HTMLButtonElement | null;
      if (copyBtn) {
        copyBtn.onclick = (e) => {
          e.stopPropagation();
          navigator.clipboard?.writeText(`${curLat.toFixed(6)}, ${curLng.toFixed(6)}`);
          copyBtn.innerText = '✅ Đã chép tọa độ vào Clipboard!';
          copyBtn.style.background = '#16a34a';
          setTimeout(() => {
            if (copyBtn) {
              copyBtn.innerText = `📋 Sao chép tọa độ (${curLat.toFixed(4)}, ${curLng.toFixed(4)})`;
              copyBtn.style.background = '#0a4393';
            }
          }, 1600);
        };
      }

      const removeBtn = box.querySelector('#btn-remove-pin') as HTMLButtonElement | null;
      if (removeBtn) {
        removeBtn.onclick = (e) => {
          e.stopPropagation();
          if (pinnedMarkerRef.current && leafletMapRef.current) {
            try {
              leafletMapRef.current.removeLayer(pinnedMarkerRef.current);
            } catch {}
            pinnedMarkerRef.current = null;
          }
          setPinnedCoord(null);
        };
      }

      return box;
    };

    marker.bindPopup(buildPopupEl(lat, lng), {
      autoClose: false,
      closeOnClick: false,
      className: 'pinned-coord-popup',
    }).openPopup();

    marker.on('dragend', (ev: any) => {
      const pos = ev.target.getLatLng();
      setPinnedCoord({ lat: pos.lat, lng: pos.lng });
      marker.setPopupContent(buildPopupEl(pos.lat, pos.lng));
      marker.openPopup();
    });

    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch {}
  }, []);

  useEffect(() => {
    pinLocationRef.current = handlePinMapLocation;
  }, [handlePinMapLocation]);

  // ================= ĐỒNG BỘ 2 CHIỀU THÔN/BUÔN: ĐIỂM TẬP TRUNG + RANH THÔN KML + BẢNG THÔNG TIN ĐỘ CAO/HỘ/SƠ TÁN =================
  const syncToggleVillage = async (villageName: string, forceState?: boolean) => {
    const map = leafletMapRef.current;
    const vDef = VILLAGE_LIST_21.find((item) => item.name === villageName);
    if (!vDef) return;

    // Lọc chính xác 100% các file KML ranh giới thuộc thôn này (tránh Thôn 1 dính vào Thôn 10, 11, 12, 13)
    const matchingKmz = villageKmzItems.filter((kmz) => isVillageMatch(villageName, kmz.label));

    // Xác định trạng thái hiện tại (nếu đang active ở điểm hoặc ranh)
    const isCurrentlyActive =
      villageVisibility[villageName] === true ||
      (matchingKmz.length > 0 && matchingKmz.some((m) => !!enabledKmzLayers[m.id]));

    const nextVal = typeof forceState === 'boolean' ? forceState : !isCurrentlyActive;

    // 1. Cập nhật state hiển thị điểm thôn buôn
    setVillageVisibility((prev) => ({ ...prev, [villageName]: nextVal }));

    // 2. Cập nhật Marker điểm tập trung trên bản đồ Leaflet
    if (map) {
      if (!systemLayers.villages && nextVal) {
        setSystemLayers((prev) => ({ ...prev, villages: true }));
      }
      if (villagesLayerRef.current) {
        if (!map.hasLayer(villagesLayerRef.current)) {
          villagesLayerRef.current.addTo(map);
        }
        const marker = villageMarkersMapRef.current[villageName];
        if (marker) {
          if (nextVal) {
            if (!villagesLayerRef.current.hasLayer(marker)) {
              villagesLayerRef.current.addLayer(marker);
            }
          } else {
            if (villagesLayerRef.current.hasLayer(marker)) {
              villagesLayerRef.current.removeLayer(marker);
            }
          }
        }
      }
    }

    // 3. Cập nhật các file KML ranh thôn (vẽ/gỡ ranh giới polygon tương ứng)
    if (matchingKmz.length > 0) {
      const copy = { ...enabledKmzLayers };
      for (const m of matchingKmz) {
        copy[m.id] = nextVal;
        persistKmlLayerUpdate(m.id, { enabled: nextVal });
        if (nextVal) {
          await renderKmzLayerOnMap(m);
        } else {
          const g = kmzLayerGroupsRef.current[m.id];
          if (g && map && map.hasLayer(g)) {
            map.removeLayer(g);
          }
        }
      }
      setEnabledKmzLayers(copy);
    }

    // 4. Cập nhật thẻ thông tin Độ cao, Số hộ, Điểm sơ tán dưới đáy bản đồ
    if (nextVal) {
      setSelectedVillageBottomInfo({
        name: vDef.name,
        elevation: vDef.elevation,
        affectedHouseholds: vDef.totalHouseholds,
        evacuationPoint: vDef.evacuationPoint,
        coordinates: vDef.coordinates,
      });

      // Phóng khung nhìn tới phạm vi thôn
      if (map) {
        if (matchingKmz.length > 0 && matchingKmz[0].bounds && matchingKmz[0].bounds.length === 2) {
          map.flyToBounds(matchingKmz[0].bounds, { padding: [35, 35], maxZoom: 16, duration: 1.0 });
        } else if (vDef.coordinates) {
          map.flyTo(vDef.coordinates, 15, { duration: 1.0 });
        }
      }
    } else {
      setSelectedVillageBottomInfo((curr) => (curr?.name === villageName ? null : curr));
    }
  };

  // Bật/tắt hiển thị từng thôn/buôn riêng lẻ (đồng bộ 2 chiều toàn diện)
  const handleToggleVillageVisibility = (villageName: string) => {
    syncToggleVillage(villageName);
  };

  // Chọn hiển thị tất cả các thôn buôn (bật cả điểm tập trung và ranh thôn)
  const handleSelectAllVillages = async () => {
    const map = leafletMapRef.current;
    if (!systemLayers.villages) {
      setSystemLayers((prev) => ({ ...prev, villages: true }));
    }
    if (villagesLayerRef.current && map && !map.hasLayer(villagesLayerRef.current)) {
      villagesLayerRef.current.addTo(map);
    }
    const nextState: Record<string, boolean> = {};
    VILLAGE_LIST_21.forEach((vil) => {
      nextState[vil.name] = true;
      const marker = villageMarkersMapRef.current[vil.name];
      if (marker && villagesLayerRef.current && !villagesLayerRef.current.hasLayer(marker)) {
        villagesLayerRef.current.addLayer(marker);
      }
    });
    setVillageVisibility(nextState);

    // Bật tất cả các file ranh thôn KML
    const copy = { ...enabledKmzLayers };
    for (const m of villageKmzItems) {
      copy[m.id] = true;
      persistKmlLayerUpdate(m.id, { enabled: true });
      await renderKmzLayerOnMap(m);
    }
    setEnabledKmzLayers(copy);
  };

  // Bỏ chọn tất cả các thôn buôn (tắt cả điểm tập trung và ranh thôn)
  const handleDeselectAllVillages = () => {
    const map = leafletMapRef.current;
    const nextState: Record<string, boolean> = {};
    VILLAGE_LIST_21.forEach((vil) => {
      nextState[vil.name] = false;
      const marker = villageMarkersMapRef.current[vil.name];
      if (marker && villagesLayerRef.current && villagesLayerRef.current.hasLayer(marker)) {
        villagesLayerRef.current.removeLayer(marker);
      }
    });
    setVillageVisibility(nextState);

    // Tắt tất cả ranh thôn KML
    const copy = { ...enabledKmzLayers };
    for (const m of villageKmzItems) {
      copy[m.id] = false;
      persistKmlLayerUpdate(m.id, { enabled: false });
      const g = kmzLayerGroupsRef.current[m.id];
      if (g && map && map.hasLayer(g)) {
        map.removeLayer(g);
      }
    }
    setEnabledKmzLayers(copy);
    setSelectedVillageBottomInfo(null);
  };

  const handleFlyToVillage = (villageName: string) => {
    syncToggleVillage(villageName, true);
  };

  // Quản lý chỉnh sửa tọa độ thôn/buôn thủ công dành cho Admin
  const handleStartEditVillageCoords = (villageName: string) => {
    if (editingVillageName === villageName) {
      setEditingVillageName(null);
      setCoordSaveMessage(null);
      return;
    }
    setEditingVillageName(villageName);
    setCoordSaveMessage(null);
    const coords =
      customVillageCoords[villageName] ||
      VILLAGE_DISASTER_PROFILES[villageName]?.coordinates || [13.064, 107.888];
    setEditLatInput(String(coords[0]));
    setEditLngInput(String(coords[1]));
  };

  const handleGetMapCenterForVillage = () => {
    const center = leafletMapRef.current?.getCenter();
    if (center) {
      setEditLatInput(center.lat.toFixed(6));
      setEditLngInput(center.lng.toFixed(6));
    }
  };

  const handleSaveVillageCoords = async (villageName: string) => {
    const lat = parseFloat(editLatInput);
    const lng = parseFloat(editLngInput);

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < 12.0 ||
      lat > 14.5 ||
      lng < 106.5 ||
      lng > 109.5
    ) {
      alert(
        'Tọa độ không hợp lệ! Vui lòng nhập số hợp lệ trong phạm vi tỉnh Đắk Lắk (Vĩ độ Lat ~12.5-13.5, Kinh độ Lng ~107.5-108.5).'
      );
      return;
    }

    const nextCoords: Record<string, [number, number]> = {
      ...customVillageCoords,
      [villageName]: [lat, lng],
    };

    setCustomVillageCoords(nextCoords);
    try {
      localStorage.setItem('easup_custom_village_coords', JSON.stringify(nextCoords));
    } catch {}

    // Cập nhật marker trên bản đồ ngay lập tức
    const m = villageMarkersMapRef.current[villageName];
    if (m) {
      m.setLatLng([lat, lng]);
    }
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([lat, lng], 15, { duration: 0.8 });
      setTimeout(() => {
        m?.openPopup();
      }, 500);
    }

    setCoordSaveMessage('Đã lưu thành công!');

    // Gửi lên máy chủ để lưu vĩnh viễn
    try {
      await fetch('/api/villages/coordinates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ villageName, lat, lng }),
      });
    } catch (err) {
      console.error('Save village coords to server error:', err);
    }

    setTimeout(() => {
      setEditingVillageName(null);
      setCoordSaveMessage(null);
    }, 800);
  };

  const handleResetVillageCoords = async (villageName: string) => {
    const defaultCoords = VILLAGE_DISASTER_PROFILES[villageName]?.coordinates;
    if (!defaultCoords) return;

    setEditLatInput(String(defaultCoords[0]));
    setEditLngInput(String(defaultCoords[1]));

    const nextCoords = { ...customVillageCoords };
    delete nextCoords[villageName];
    setCustomVillageCoords(nextCoords);

    try {
      localStorage.setItem('easup_custom_village_coords', JSON.stringify(nextCoords));
    } catch {}

    const m = villageMarkersMapRef.current[villageName];
    if (m) {
      m.setLatLng(defaultCoords);
    }
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo(defaultCoords, 15, { duration: 0.8 });
    }

    try {
      await fetch('/api/villages/coordinates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          villageName,
          lat: defaultCoords[0],
          lng: defaultCoords[1],
        }),
      });
    } catch {}

    setCoordSaveMessage('Đã khôi phục mặc định!');
    setTimeout(() => {
      setEditingVillageName(null);
      setCoordSaveMessage(null);
    }, 700);
  };

  // Chọn tất cả / Bỏ chọn tất cả cho cả Nhóm lớp hệ thống, MIKE FLOOD & Nhóm lớp thôn/buôn
  const handleSelectAllLayers = async (selectAll: boolean) => {
    const map = leafletMapRef.current;
    if (!map) return;

    setSystemLayers({
      markers: selectAll,
      buffer: selectAll,
      floodMarks2023: selectAll,
      vulnerableFacilities: selectAll,
      mikeKmlFile: selectAll,
      villages: selectAll,
    });

    [
      systemMarkersGroupRef,
      bufferCircleLayerRef,
      floodMarks2023LayerRef,
      facilitiesLayerRef,
      mikeKmlLayerRef,
      villagesLayerRef,
    ].forEach((ref) => {
      if (ref.current) {
        if (selectAll) ref.current.addTo(map);
        else map.removeLayer(ref.current);
      }
    });

    const nextEnabled: Record<string, boolean> = {};
    for (const item of kmzManifest) {
      nextEnabled[item.id] = selectAll;
      persistKmlLayerUpdate(item.id, { enabled: selectAll });
    }
    setEnabledKmzLayers(nextEnabled);

    for (const item of kmzManifest) {
      if (selectAll) {
        await renderKmzLayerOnMap(item);
      } else {
        const existing = kmzLayerGroupsRef.current[item.id];
        if (existing && map.hasLayer(existing)) {
          map.removeLayer(existing);
        }
      }
    }
  };

  // Hỗ trợ nạp trực tiếp file .KML (Mo_phong_Thuy_luc_MIKE_FLOOD_EaSup.kml) & .GeoJSON (Du_lieu_Ban_do_MIKE_FLOOD_EaSup.geojson) - CHỈ ADMIN
  const handleUploadCustomKml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (userRole !== 'ADMIN') {
      alert('Chỉ tài khoản Toàn quyền (Admin) mới có quyền nạp hoặc thay đổi file KML/GeoJSON.');
      e.target.value = '';
      return;
    }
    try {
      const text = await file.text();
      const palette = ['#0284c7', '#ff1744', '#00e676', '#ff9100', '#d500f9', '#00b0ff'];
      const layerColor = palette[kmzManifest.length % palette.length];
      const isGeoJson =
        file.name.toLowerCase().endsWith('.geojson') ||
        file.name.toLowerCase().endsWith('.json') ||
        text.trim().startsWith('{');

      const lines: [number, number][][] = [];
      const polys: [number, number][][] = [];
      let minLat = 90,
        maxLat = -90,
        minLng = 180,
        maxLng = -180;

      const recordPt = (lat: number, lng: number) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      };

      if (isGeoJson) {
        const json = JSON.parse(text);
        const features = Array.isArray(json.features) ? json.features : [];
        let hasFloodMarks = false;

        for (const f of features) {
          if (f?.properties?.category === 'vet_lu_kiem_dinh_2023') {
            hasFloodMarks = true;
          }
          const geom = f?.geometry;
          if (!geom) continue;

          if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
            let lng = Number(geom.coordinates[0]);
            let lat = Number(geom.coordinates[1]);
            // Nếu điểm từ file GeoJSON gốc có kinh độ lệch múi ~108.25-108.34, chuẩn hóa về hành lang suối Ea Súp
            if (lng > 108.15 && lng < 108.45 && lat > 13.05 && lat < 13.3) {
              lng = Number((lng - 0.425).toFixed(5));
              lat = Number((lat - 0.068).toFixed(5));
            }
            recordPt(lat, lng);
            lines.push([
              [lat - 0.0008, lng - 0.0008],
              [lat + 0.0008, lng + 0.0008],
            ]);
          } else if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
            const pts: [number, number][] = [];
            for (const c of geom.coordinates) {
              if (Array.isArray(c) && c.length >= 2) {
                const lng = Number(c[0]);
                const lat = Number(c[1]);
                recordPt(lat, lng);
                pts.push([lat, lng]);
              }
            }
            if (pts.length >= 2) lines.push(pts);
          } else if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
            for (const ring of geom.coordinates) {
              const pts: [number, number][] = [];
              for (const c of ring) {
                if (Array.isArray(c) && c.length >= 2) {
                  const lng = Number(c[0]);
                  const lat = Number(c[1]);
                  recordPt(lat, lng);
                  pts.push([lat, lng]);
                }
              }
              if (pts.length >= 3) polys.push(pts);
            }
          }
        }

        if (hasFloodMarks) {
          setSystemLayers((prev) => ({
            ...prev,
            floodMarks2023: true,
          }));
          if (floodMarks2023LayerRef.current && leafletMapRef.current) {
            floodMarks2023LayerRef.current.addTo(leafletMapRef.current);
          }
        }
      } else {
        const coordRegex = /<coordinates>([\s\S]*?)<\/coordinates>/g;
        let m;
        while ((m = coordRegex.exec(text)) !== null) {
          const rawPts = m[1].trim().split(/\s+/);
          const pts: [number, number][] = [];
          for (const rp of rawPts) {
            const parts = rp.split(',');
            if (parts.length >= 2) {
              const lng = Number(parseFloat(parts[0]).toFixed(5));
              const lat = Number(parseFloat(parts[1]).toFixed(5));
              if (!isNaN(lat) && !isNaN(lng)) {
                if (
                  pts.length === 0 ||
                  Math.abs(pts[pts.length - 1][0] - lat) > 1e-5 ||
                  Math.abs(pts[pts.length - 1][1] - lng) > 1e-5
                ) {
                  pts.push([lat, lng]);
                }
                recordPt(lat, lng);
              }
            }
          }
          if (pts.length >= 2) lines.push(pts);
        }
      }

      if (lines.length > 0 || polys.length > 0) {
        const safeSlug = file.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 32);
        const customId = `KML_${safeSlug}_${Date.now()}`;
        const defaultLayerName =
          file.name.replace(/\.(kml|kmz|xml|geojson|json)$/i, '') || file.name;
        let targetCategory = 'Nhóm lớp thôn/buôn';
        if (uploadTargetTab === 'SYSTEM') targetCategory = 'Nhóm lớp hệ thống';
        else if (uploadTargetTab === 'FLOOD') targetCategory = 'LỚP BẢN ĐỒ LŨ ĐÃ KIỂM CHỨNG';

        const newItem: KmzLayerManifestItem = {
          id: customId,
          rawName: file.name,
          label: defaultLayerName,
          category: targetCategory,
          defaultOn: true,
          color: layerColor,
          bounds: [
            [minLat, minLng],
            [maxLat, maxLng],
          ],
          geomCount: lines.length + polys.length,
          file: '',
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          isUserUploaded: true,
        };

        const layerData: KmzLayerData = {
          ...newItem,
          groups: [
            {
              color: layerColor,
              fillColor: layerColor,
              weight: 2.2,
              outline: true,
              lines,
              polys,
            },
          ],
        };

        const savedItem = await persistNewKmlLayer(newItem, layerData);
        kmzDataCacheRef.current[savedItem.id] = {
          ...layerData,
          file: savedItem.file,
        };

        setKmzManifest((prev) => [...prev, savedItem]);
        setEnabledKmzLayers((prev) => ({ ...prev, [savedItem.id]: true }));
        await renderKmzLayerOnMap(savedItem);
        handleFlyToKmzLayer(savedItem);
        setActiveLayerTab(uploadTargetTab);
      }
    } catch (err) {
      console.error('Upload layer error:', err);
    }
    e.target.value = '';
  };

  // Nạp file KML/GeoJSON riêng cho từng Thôn/Buôn trong danh sách 21 nút - CHỈ ADMIN
  const handleVillageSpecificFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUploadVillage) return;
    if (userRole !== 'ADMIN') {
      alert('Chỉ tài khoản Toàn quyền (Admin) mới có quyền nạp hoặc thay đổi file KML/GeoJSON.');
      setTargetUploadVillage(null);
      e.target.value = '';
      return;
    }
    try {
      const textContent = await file.text();
      const isGeoJson =
        file.name.toLowerCase().endsWith('.geojson') ||
        file.name.toLowerCase().endsWith('.json') ||
        textContent.trim().startsWith('{');

      const lines: [number, number][][] = [];
      const polys: [number, number][][] = [];
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      const recordPt = (lat: number, lng: number) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      };

      const palette = ['#0284c7', '#ff1744', '#00e676', '#ff9100', '#d500f9', '#00b0ff'];
      const layerColor = palette[kmzManifest.length % palette.length] || '#10b981';

      if (isGeoJson) {
        const parsed = JSON.parse(textContent);
        const features = parsed.type === 'FeatureCollection' ? parsed.features : [parsed];
        for (const feat of features) {
          if (!feat.geometry) continue;
          const geom = feat.geometry;
          if (geom.type === 'Polygon') {
            for (const ring of geom.coordinates) {
              const ringPts: [number, number][] = [];
              for (const c of ring) {
                recordPt(c[1], c[0]);
                ringPts.push([c[1], c[0]]);
              }
              if (ringPts.length >= 3) polys.push(ringPts);
            }
          } else if (geom.type === 'MultiPolygon') {
            for (const poly of geom.coordinates) {
              for (const ring of poly) {
                const ringPts: [number, number][] = [];
                for (const c of ring) {
                  recordPt(c[1], c[0]);
                  ringPts.push([c[1], c[0]]);
                }
                if (ringPts.length >= 3) polys.push(ringPts);
              }
            }
          } else if (geom.type === 'LineString') {
            const linePts: [number, number][] = [];
            for (const c of geom.coordinates) {
              recordPt(c[1], c[0]);
              linePts.push([c[1], c[0]]);
            }
            if (linePts.length >= 2) lines.push(linePts);
          }
        }
      } else {
        const dom = new DOMParser().parseFromString(textContent, 'text/xml');
        const polyNodes = dom.querySelectorAll('Polygon coordinates, LinearRing coordinates');
        polyNodes.forEach((node) => {
          const raw = (node.textContent || '').trim();
          const pts: [number, number][] = [];
          raw.split(/\s+/).forEach((chunk) => {
            const parts = chunk.split(',');
            if (parts.length >= 2) {
              const lng = parseFloat(parts[0]);
              const lat = parseFloat(parts[1]);
              if (!isNaN(lat) && !isNaN(lng)) {
                recordPt(lat, lng);
                pts.push([lat, lng]);
              }
            }
          });
          if (pts.length >= 3) polys.push(pts);
        });

        const lineNodes = dom.querySelectorAll('LineString coordinates');
        lineNodes.forEach((node) => {
          const raw = (node.textContent || '').trim();
          const pts: [number, number][] = [];
          raw.split(/\s+/).forEach((chunk) => {
            const parts = chunk.split(',');
            if (parts.length >= 2) {
              const lng = parseFloat(parts[0]);
              const lat = parseFloat(parts[1]);
              if (!isNaN(lat) && !isNaN(lng)) {
                recordPt(lat, lng);
                pts.push([lat, lng]);
              }
            }
          });
          if (pts.length >= 2) lines.push(pts);
        });
      }

      if (lines.length > 0 || polys.length > 0) {
        const safeSlug = targetUploadVillage.replace(/[^a-zA-Z0-9]/g, '_');
        const customId = `KML_VIL_${safeSlug}_${Date.now()}`;
        const newItem: KmzLayerManifestItem = {
          id: customId,
          rawName: file.name,
          label: targetUploadVillage,
          category: 'Nhóm lớp thôn/buôn',
          defaultOn: true,
          color: layerColor,
          bounds: [
            [minLat, minLng],
            [maxLat, maxLng],
          ],
          geomCount: lines.length + polys.length,
          file: '',
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          isUserUploaded: true,
        };

        const layerData: KmzLayerData = {
          ...newItem,
          groups: [
            {
              color: layerColor,
              fillColor: layerColor,
              weight: 2.2,
              outline: true,
              lines,
              polys,
            },
          ],
        };

        const savedItem = await persistNewKmlLayer(newItem, layerData);
        kmzDataCacheRef.current[savedItem.id] = {
          ...layerData,
          file: savedItem.file,
        };

        setKmzManifest((prev) => [...prev, savedItem]);
        setEnabledKmzLayers((prev) => ({ ...prev, [savedItem.id]: true }));
        await renderKmzLayerOnMap(savedItem);
        handleFlyToKmzLayer(savedItem);

        const vilDef = VILLAGE_LIST_21.find((item) => item.name === targetUploadVillage);
        if (vilDef) {
          setSelectedVillageBottomInfo({
            name: vilDef.name,
            elevation: vilDef.elevation,
            affectedHouseholds: vilDef.totalHouseholds,
            evacuationPoint: vilDef.evacuationPoint,
            coordinates: vilDef.coordinates,
          });
        }
      }
    } catch (err) {
      console.error('Lỗi tải file thôn buôn:', err);
    }
    setTargetUploadVillage(null);
    e.target.value = '';
  };

  const handleToggleVillageFrom21List = (v: (typeof VILLAGE_LIST_21)[number]) => {
    syncToggleVillage(v.name);
  };

  const handleSelectVillageFrom21List = (v: (typeof VILLAGE_LIST_21)[number]) => {
    syncToggleVillage(v.name, true);
  };

  const handleTriggerTabUpload = (tab: 'SYSTEM' | 'FLOOD' | 'VILLAGE') => {
    setUploadTargetTab(tab);
    fileInputRef.current?.click();
  };

  // Phân loại các lớp KMZ/KML/GeoJSON theo 3 Tab
  // Lớp "bản đồ vùng ngập lụt" (KMZ_BAN_VE_MAT_CAT) được chuyển sang Tab Hệ thống
  const systemKmzItems = kmzManifest.filter(
    (m) =>
      m.category === 'Nhóm lớp hệ thống' ||
      m.category === 'SYSTEM' ||
      m.id === 'KMZ_BAN_VE_MAT_CAT' ||
      m.label.toLowerCase().includes('ngập lụt')
  );
  const floodKmzItems = kmzManifest.filter(
    (m) =>
      m.id !== 'KMZ_BAN_VE_MAT_CAT' &&
      !m.label.toLowerCase().includes('ngập lụt') &&
      (m.category === 'LỚP BẢN ĐỒ LŨ ĐÃ KIỂM CHỨNG' ||
        m.category === 'FLOOD' ||
        m.id.includes('MIKE_FLOOD'))
  );

  const systemTabActiveCount =
    (systemLayers.markers ? 1 : 0) +
    (systemLayers.buffer ? 1 : 0) +
    (systemLayers.mikeKmlFile ? 1 : 0) +
    systemKmzItems.filter((m) => !!enabledKmzLayers[m.id]).length;
  const systemTabTotalCount = 3 + systemKmzItems.length;
  const isAllSystemTabActive = systemTabActiveCount === systemTabTotalCount;

  const floodTabActiveCount =
    (systemLayers.floodMarks2023 ? 1 : 0) +
    (systemLayers.vulnerableFacilities ? 1 : 0) +
    floodKmzItems.filter((m) => !!enabledKmzLayers[m.id]).length;
  const floodTabTotalCount = 2 + floodKmzItems.length;
  const isAllFloodTabActive = floodTabActiveCount === floodTabTotalCount;

  const villageTabActiveCount =
    (systemLayers.villages ? 1 : 0) +
    villageKmzItems.filter((m) => !!enabledKmzLayers[m.id]).length;
  const villageTabTotalCount = 1 + villageKmzItems.length;
  const isAllVillageTabActive =
    villageTabTotalCount > 0 && villageTabActiveCount === villageTabTotalCount;

  // Tính tổng số lớp và số lớp active khớp 100% với các Tab hiển thị theo phân quyền người dùng
  const totalLayerCount =
    userRole === 'ADMIN'
      ? systemTabTotalCount + floodTabTotalCount + villageTabTotalCount
      : systemTabTotalCount + floodTabTotalCount;

  const activeLayerCount =
    userRole === 'ADMIN'
      ? systemTabActiveCount + floodTabActiveCount + villageTabActiveCount
      : systemTabActiveCount + floodTabActiveCount;

  // Thống kê riêng cho 2 sub-tab lớn trong Thôn/Buôn
  const villageBoundariesActiveCount = villageKmzItems.filter(
    (m) => !!enabledKmzLayers[m.id]
  ).length;
  const villageBoundariesTotalCount = villageKmzItems.length;
  const isAllVillageBoundariesActive =
    villageBoundariesTotalCount > 0 &&
    villageBoundariesActiveCount === villageBoundariesTotalCount;

  const totalVillagePointsCount = Object.keys(VILLAGE_DISASTER_PROFILES).length;
  const activeVillagePointsCount = Object.values(VILLAGE_DISASTER_PROFILES).filter((v) => {
    const matchingKmz = villageKmzItems.filter((kmz) => isVillageMatch(v.name, kmz.label));
    return (
      villageVisibility[v.name] === true ||
      (matchingKmz.length > 0 && matchingKmz.some((m) => !!enabledKmzLayers[m.id]))
    );
  }).length;

  const handleToggleAllVillageBoundaries = () => {
    const nextVal = !isAllVillageBoundariesActive;
    if (nextVal) {
      handleSelectAllVillages();
    } else {
      handleDeselectAllVillages();
    }
  };

  const handleToggleAllSystemTab = () => {
    const nextVal = !isAllSystemTabActive;
    setSystemLayers((prev) => ({
      ...prev,
      markers: nextVal,
      buffer: nextVal,
      mikeKmlFile: nextVal,
    }));
    if (leafletMapRef.current) {
      const map = leafletMapRef.current;
      const refList = [systemMarkersGroupRef, bufferCircleLayerRef, mikeKmlLayerRef];
      refList.forEach((ref) => {
        if (ref.current) {
          if (nextVal) ref.current.addTo(map);
          else if (map.hasLayer(ref.current)) map.removeLayer(ref.current);
        }
      });
    }
    if (systemKmzItems.length > 0) {
      const copy = { ...enabledKmzLayers };
      systemKmzItems.forEach((m) => {
        copy[m.id] = nextVal;
        persistKmlLayerUpdate(m.id, { enabled: nextVal });
        if (nextVal) renderKmzLayerOnMap(m);
        else {
          const g = kmzLayerGroupsRef.current[m.id];
          if (g && leafletMapRef.current?.hasLayer(g)) {
            leafletMapRef.current.removeLayer(g);
          }
        }
      });
      setEnabledKmzLayers(copy);
    }
  };

  const handleToggleAllFloodTab = () => {
    const nextVal = !isAllFloodTabActive;
    setSystemLayers((prev) => ({
      ...prev,
      floodMarks2023: nextVal,
      vulnerableFacilities: nextVal,
    }));
    if (leafletMapRef.current) {
      const map = leafletMapRef.current;
      const refList = [
        floodMarks2023LayerRef,
        facilitiesLayerRef,
      ];
      refList.forEach((ref) => {
        if (ref.current) {
          if (nextVal) ref.current.addTo(map);
          else if (map.hasLayer(ref.current)) map.removeLayer(ref.current);
        }
      });
    }
    if (floodKmzItems.length > 0) {
      const copy = { ...enabledKmzLayers };
      floodKmzItems.forEach((m) => {
        copy[m.id] = nextVal;
        persistKmlLayerUpdate(m.id, { enabled: nextVal });
        if (nextVal) renderKmzLayerOnMap(m);
        else {
          const g = kmzLayerGroupsRef.current[m.id];
          if (g && leafletMapRef.current?.hasLayer(g)) {
            leafletMapRef.current.removeLayer(g);
          }
        }
      });
      setEnabledKmzLayers(copy);
    }
  };

  const handleToggleAllVillageTab = () => {
    const nextVal = !isAllVillageTabActive;
    setSystemLayers((prev) => ({
      ...prev,
      villages: nextVal,
    }));
    if (leafletMapRef.current && villagesLayerRef.current) {
      if (nextVal) villagesLayerRef.current.addTo(leafletMapRef.current);
      else if (leafletMapRef.current.hasLayer(villagesLayerRef.current)) {
        leafletMapRef.current.removeLayer(villagesLayerRef.current);
      }
    }
    if (villageKmzItems.length > 0) {
      const copy = { ...enabledKmzLayers };
      villageKmzItems.forEach((m) => {
        copy[m.id] = nextVal;
        persistKmlLayerUpdate(m.id, { enabled: nextVal });
        if (nextVal) renderKmzLayerOnMap(m);
        else {
          const g = kmzLayerGroupsRef.current[m.id];
          if (g && leafletMapRef.current?.hasLayer(g)) {
            leafletMapRef.current.removeLayer(g);
          }
        }
      });
      setEnabledKmzLayers(copy);
    }
  };

  const activeMeta = GIBS_META[selectedGibsLayer] || GIBS_META.THERMAL_ANOMALIES;
  const currentAreaInfo: AreaDefinition =
    selectedAreaKey === 'CUSTOM' && customArea
      ? customArea
      : COMPARISON_AREAS[selectedAreaKey] || COMPARISON_AREAS.TK_293;

  const yearProgress = Math.max(0, Math.min(1, (selectedYear - 2001) / 25));
  const currentYearCover = Math.round(
    currentAreaInfo.cover2001 + (currentAreaInfo.cover2026 - currentAreaInfo.cover2001) * yearProgress
  );
  const currentYearLostHa = Number(
    ((currentAreaInfo.areaHa * (currentAreaInfo.cover2001 - currentYearCover)) / 100).toFixed(1)
  );
  const currentDeltaHa = Number(
    ((currentAreaInfo.areaHa * (currentAreaInfo.cover2001 - currentAreaInfo.cover2026)) / 100).toFixed(1)
  );
  const currentDeltaNdvi = Number((currentAreaInfo.ndvi2026 - currentAreaInfo.ndvi2001).toFixed(2));

  return (
    <div
      className={`relative w-full h-auto rounded-xl overflow-hidden border border-[#0A4393]/25 bg-white shadow-lg flex flex-col ${
        isFullscreen ? 'z-[9999]' : 'z-10 isolate'
      }`}
    >
      {/* Top Map Control Bar: Trên điện thoại thu gọn Nền dạng sổ xuống + Lớp Vệ Tinh nằm gọn trên 1 hàng */}
      <div className="z-10 bg-[#0A4393] border-b border-white/20 px-2 sm:px-3 py-1.5 sm:py-2 flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2 text-xs text-white">
        {/* Basemap Switcher */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span className="font-semibold text-white flex items-center gap-1 text-[11px] sm:text-xs whitespace-nowrap">
            <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white shrink-0" />
            <span>Nền:</span>
          </span>

          {/* Giao diện Điện thoại (< sm): Ô chọn lớp Nền ẩn sổ xuống tương tự Lớp Vệ Tinh */}
          <select
            value={activeBasemap}
            onChange={(e) => handleBasemapChange(e.target.value as keyof typeof BASEMAP_TILES)}
            className="sm:hidden bg-white text-[#0A4393] font-bold border border-white/40 rounded px-1.5 py-0.5 text-[11px] focus:ring-2 focus:ring-white cursor-pointer shadow-xs"
            aria-label="Chọn lớp nền bản đồ"
          >
            {(Object.keys(BASEMAP_TILES) as Array<keyof typeof BASEMAP_TILES>).map((key) => (
              <option key={key} value={key} className="bg-white text-[#0A4393]">
                {BASEMAP_TILES[key].name}
              </option>
            ))}
          </select>

          {/* Giao diện Máy tính (sm trở lên): Giữ 3 nút chọn trực tiếp */}
          <div className="hidden sm:flex items-center gap-1.5">
            {(Object.keys(BASEMAP_TILES) as Array<keyof typeof BASEMAP_TILES>).map((key) => (
              <button
                key={key}
                onClick={() => handleBasemapChange(key)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                  activeBasemap === key
                    ? 'bg-white text-[#0A4393] font-bold shadow-sm'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {BASEMAP_TILES[key].name}
              </button>
            ))}
          </div>
        </div>

        {/* NASA GIBS Layer Selector: Thu gọn trên điện thoại để trọn 2 nút nằm trên 1 hàng */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 sm:flex-initial justify-end">
          <span className="text-white font-bold flex items-center gap-1 text-[11px] sm:text-xs whitespace-nowrap shrink-0">
            <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white shrink-0" />
            <span>Lớp Vệ Tinh:</span>
          </span>
          <select
            value={selectedGibsLayer}
            onChange={(e) => handleGibsChange(e.target.value)}
            className="bg-white text-[#0A4393] font-semibold border border-white/40 rounded px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs max-w-[125px] xs:max-w-[148px] sm:max-w-none truncate focus:ring-2 focus:ring-white cursor-pointer shadow-xs"
            aria-label="Chọn lớp ảnh vệ tinh NASA GIBS"
          >
            {Object.entries(NASA_GIBS_LAYERS).map(([key, layer]) => (
              <option key={key} value={key} className="bg-white text-[#0A4393]">
                {layer.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Thanh Trạng Thái Phân Tích Điểm Ảnh Nhiệt: Hiển thị đầy đủ số điểm nhiệt + Tên Tiểu khu + Hiệu ứng chữ chạy ngang mượt mà (CSS Marquee / News Ticker, tuyệt đối không cắt chữ '...') */}
      <div className="z-10 bg-white border-b border-[#0A4393]/20 px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2 text-xs">
        {/* Nhóm Chữ bên trái: Title + Badge cố định đầy đủ số điểm nhiệt kèm tên tiểu khu + News Ticker mượt mà */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
          <span className="font-bold text-[#0A4393] flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Activity className="w-3.5 h-3.5 text-[#0A4393] animate-pulse shrink-0" />
            <span>{activeMeta.title}</span>
          </span>

          {selectedGibsLayer === 'THERMAL_ANOMALIES' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-300 text-rose-700 font-mono font-bold text-[10px] sm:text-[11px] shrink-0 whitespace-nowrap">
              🔥 {iotData.tk293.temperature > 45 || iotData.tk293.smokeCo > 50 ? '03 điểm cháy' : '02 điểm nhiệt'} • Tiểu khu 293
            </span>
          )}

          {/* Thanh chạy chữ ngang mượt mà (CSS Marquee / News Ticker) */}
          <div className="iot-news-ticker-mask flex-1 min-w-[70px]">
            <div className="iot-news-ticker-track text-[11px] text-slate-700 font-medium">
              <span className="pr-8">
                {selectedGibsLayer === 'THERMAL_ANOMALIES'
                  ? `Phát hiện 02 điểm nhiệt tại Lâm phần Tiểu khu 293 (Nhiệt độ ${iotData.tk293.temperature}°C • Khói CO ${iotData.tk293.smokeCo} ppm • Vệ tinh NASA FIRMS VIIRS/MODIS đang giám sát) • Hồ Thượng: ${iotData.hoThuong.elevation}m`
                  : `${activeMeta.liveMetric} • Mực nước Hồ Ea Súp Thượng: ${iotData.hoThuong.elevation}m • Tiểu khu 293: ${iotData.tk293.temperature}°C`}
              </span>
              <span className="pr-8" aria-hidden="true">
                {selectedGibsLayer === 'THERMAL_ANOMALIES'
                  ? `Phát hiện 02 điểm nhiệt tại Lâm phần Tiểu khu 293 (Nhiệt độ ${iotData.tk293.temperature}°C • Khói CO ${iotData.tk293.smokeCo} ppm • Vệ tinh NASA FIRMS VIIRS/MODIS đang giám sát) • Hồ Thượng: ${iotData.hoThuong.elevation}m`
                  : `${activeMeta.liveMetric} • Mực nước Hồ Ea Súp Thượng: ${iotData.hoThuong.elevation}m • Tiểu khu 293: ${iotData.tk293.temperature}°C`}
              </span>
            </div>
          </div>
        </div>

        {/* Nhóm Nút & Slider bên phải trên cùng 1 dòng (Ảnh 2: Đồng bộ độ phủ trực tiếp) */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Slider độ phủ vệ tinh */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-mono">
            <span>Độ phủ:</span>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={gibsOpacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              className="w-14 sm:w-16 h-1 bg-[#E6F0FA] rounded-lg appearance-none cursor-pointer accent-[#0A4393]"
              title="Độ phủ lớp vệ tinh"
            />
            <span className="text-[#0A4393] font-bold w-6 sm:w-7 text-right">{Math.round(gibsOpacity * 100)}%</span>
          </div>

          {/* Nút / Badge Trạng thái */}
          <span
            className={`hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded border whitespace-nowrap shadow-sm ${activeMeta.statusColor}`}
          >
            {activeMeta.status}
          </span>
        </div>
      </div>

      {/* Map Leaflet Container + Các nút nổi trên Bản Đồ (Hỗ trợ Fullscreen đa thiết bị chuẩn CSS Fallback) */}
      <div
        ref={mapWrapperRef}
        className={`relative overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'fixed inset-0 w-screen h-[100dvh] z-[9999] rounded-none m-0 p-0 shadow-none bg-slate-900'
            : 'w-full h-[350px] sm:h-[560px]'
        }`}
        style={
          isFullscreen
            ? {
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100dvh',
                zIndex: 9999,
                borderRadius: 0,
              }
            : undefined
        }
      >
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Input ẩn để nạp file KML/GeoJSON riêng cho từng thôn/buôn */}
        <input
          ref={villageSpecificFileInputRef}
          type="file"
          accept=".kml,.kmz,.geojson"
          onChange={handleVillageSpecificFileUpload}
          className="hidden"
        />

        {/* NÚT KÍCH HOẠT THANH TRƯỢT THỜI GIAN NĂM (Ảnh 4: Tinh gọn chỉ để ký hiệu >) */}
        {!isTimelineSliderOpen && (
          <button
            id="timeline-slider-trigger"
            type="button"
            onClick={() => {
              setIsTimelineSliderOpen(true);
              setIsVillageSidebarOpen(false);
              setIsFloodScenarioSidebarOpen(false);
            }}
            className="absolute top-2 left-0 z-[490] bg-[#0A4393] hover:bg-[#083576] active:bg-[#062859] text-white w-7 h-7 rounded-r-lg shadow-xl border-y border-r border-white/50 flex items-center justify-center transition-all cursor-pointer group hover:w-8 select-none"
            title={`Mở thanh trượt thời gian (Năm: ${selectedYear})`}
            aria-label="Mở thanh trượt thời gian"
          >
            <ChevronRight className="w-4 h-4 text-amber-300 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* BẢNG TRƯỢT THANH TRƯỢT THỜI GIAN NĂM (Thò ra từ bên trái - Ảnh 1) */}
        {isTimelineSliderOpen && (
          <div
            ref={timelineSliderRef}
            id="timeline-slider-drawer"
            className="absolute top-2 left-2 z-[530] w-[310px] sm:w-[460px] md:w-[520px] max-w-[95vw] bg-white/95 backdrop-blur-md shadow-2xl border-2 border-[#0A4393] rounded-xl p-2 sm:p-2.5 flex items-center gap-2 animate-slideInLeft text-xs select-none"
          >
            <div className="flex-1 min-w-0">
              <SatelliteTimelineSlider
                currentYear={selectedYear}
                minYear={2001}
                maxYear={2026}
                isLoading={isTileLoading}
                onYearChange={handleSelectYear}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsTimelineSliderOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title="Thu gọn thanh trượt năm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* NÚT KÍCH HOẠT THANH THÔN/BUÔN (Bên góc trái bản đồ, khi bấm thì thò ra) */}
        {!isVillageSidebarOpen && (
          <button
            id="village-sidebar-trigger"
            type="button"
            onClick={() => {
              setIsVillageSidebarOpen(true);
              setIsFloodScenarioSidebarOpen(false);
              setIsTimelineSliderOpen(false);
            }}
            className="absolute top-12 left-0 z-[490] bg-[#0A4393] hover:bg-[#083576] active:bg-[#062859] text-white px-2.5 py-2 rounded-r-lg shadow-xl border-y border-r border-white/50 flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer group hover:pl-3 select-none"
            title="Mở danh sách Thôn/buôn & Quản lý lớp"
          >
            <MapIcon className="w-3.5 h-3.5 text-emerald-300 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-[10.5px] font-bold tracking-tight">Thôn/buôn</span>
            <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* NÚT KÍCH HOẠT THANH KỊCH BẢN LŨ (Bên góc trái bản đồ, bên dưới thanh Thôn/buôn - CHỈ HIỆN VỚI CÁN BỘ & ADMIN - Ảnh 1) */}
        {canViewFloodScenarios && !isFloodScenarioSidebarOpen && (
          <button
            id="flood-scenario-sidebar-trigger"
            type="button"
            onClick={() => {
              setIsFloodScenarioSidebarOpen(true);
              setIsVillageSidebarOpen(false);
              setIsTimelineSliderOpen(false);
            }}
            className={`absolute top-[86px] left-0 z-[490] ${
              scenarioId && scenarioId !== 'NONE'
                ? 'bg-rose-700 hover:bg-rose-800 ring-2 ring-rose-400'
                : 'bg-[#0A4393] hover:bg-[#083576]'
            } active:bg-[#062859] text-white px-2.5 py-2 rounded-r-lg shadow-xl border-y border-r border-white/50 flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer group hover:pl-3 select-none`}
            title="Mở 5 kịch bản thủy lực MIKE FLOOD đã kiểm định"
          >
            <Waves className="w-3.5 h-3.5 text-cyan-300 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-[10.5px] font-bold tracking-tight">Kịch bản lũ</span>
            {scenarioId && scenarioId !== 'NONE' && (
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping shrink-0" />
            )}
            <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* BẢNG TRƯỢT 5 KỊCH BẢN LŨ MIKE FLOOD (CHỈ HIỆN VỚI CÁN BỘ & ADMIN) */}
        {canViewFloodScenarios && isFloodScenarioSidebarOpen && (
          <div
            ref={floodScenarioSidebarRef}
            id="flood-scenario-sidebar-drawer"
            className="absolute top-0 left-0 bottom-0 z-[530] w-[210px] sm:w-[225px] bg-white/95 backdrop-blur-md shadow-2xl border-r-2 border-[#0A4393] flex flex-col overflow-hidden text-xs font-sans animate-slideInLeft select-none"
          >
            {/* Header thanh trượt */}
            <div className="bg-[#0A4393] text-white px-2.5 py-1.5 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-1.5 font-bold min-w-0">
                <Waves className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span className="text-[11px] uppercase tracking-tight font-extrabold truncate">Kịch bản lũ</span>
              </div>
              <button
                type="button"
                onClick={() => setIsFloodScenarioSidebarOpen(false)}
                className="p-0.5 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer shrink-0"
                title="Thu hẹp bảng về bên trái"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Thanh tác vụ nhanh */}
            <div className="px-2 py-1 bg-[#F0F6FF] border-b border-[#0A4393]/20 flex items-center justify-between gap-1 shrink-0 text-[10px]">
              <span className="text-slate-600 font-bold truncate">5 kịch bản MIKE FM</span>
              <button
                type="button"
                onClick={() => {
                  handleTriggerScenarioFromMap('NONE');
                  stopAllEmergencyAlerts();
                }}
                className={`px-1.5 py-0.2 rounded font-bold text-[9px] transition-colors cursor-pointer ${
                  scenarioId === 'NONE'
                    ? 'bg-[#0A4393] text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                }`}
                title="Đặt lại kịch bản và đồng thời tắt toàn bộ cảnh báo"
              >
                Đặt lại
              </button>
            </div>

            {/* Danh sách 5 kịch bản thủy lực MIKE FLOOD (Ảnh 2) */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
              {(
                ['KB4_1', 'KB1_1', 'KB1_2', 'KB2_1', 'KB5_2'] as Array<
                  Exclude<MikeFloodScenarioId, 'NONE' | 'CUSTOM_SLIDER'>
                >
              ).map((key) => {
                const sc = MIKE_FLOOD_SCENARIOS[key];
                const isSelected = scenarioId === key;
                const isDamBreak = key === 'KB2_1' || key === 'KB5_2';

                return (
                  <div
                    key={key}
                    onClick={() => handleTriggerScenarioFromMap(isSelected ? 'NONE' : key)}
                    className={`p-2 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected
                        ? isDamBreak
                          ? 'bg-rose-50 border-rose-600 shadow-md ring-1 ring-rose-500'
                          : 'bg-[#F0F6FF] border-[#0A4393] shadow-md ring-1 ring-[#0A4393]'
                        : isDamBreak
                        ? 'bg-white hover:bg-rose-50/50 border-rose-300'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono mb-1">
                      <span
                        className={`text-xs font-black ${
                          isDamBreak ? 'text-rose-700' : 'text-[#0A4393]'
                        }`}
                      >
                        {sc.code}
                      </span>
                      <span
                        className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                          isSelected
                            ? isDamBreak
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-[#0A4393] text-white'
                            : isDamBreak
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-[#0A4393]'
                        }`}
                      >
                        {sc.probabilityLabel}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-600 leading-tight mb-1">
                      <span className="font-semibold text-slate-800">{sc.totalFloodedAreaHa.toLocaleString('en-US')} ha</span> ngập • <span className="font-bold text-amber-900">{sc.affectedHouseholds} hộ</span>
                    </div>

                    {/* Danh sách các thôn nhấp nháy cảnh báo theo kịch bản này */}
                    <div className="pt-1 border-t border-slate-200/60 text-[9.5px]">
                      <div className="text-slate-500 font-semibold mb-0.5">Thôn cảnh báo ngập:</div>
                      <div className="flex flex-wrap gap-1">
                        {sc.affectedVillages.slice(0, 4).map((v) => (
                          <span
                            key={v}
                            className={`px-1 py-0.2 rounded font-medium ${
                              isSelected
                                ? 'bg-rose-600 text-white font-bold animate-pulse'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {v.replace('Thôn ', 'T.')}
                          </span>
                        ))}
                        {sc.affectedVillages.length > 4 && (
                          <span className="text-[8.5px] text-slate-400 self-center">
                            +{sc.affectedVillages.length - 4} thôn
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BẢNG TRƯỢT THÔN/BUÔN & TK 249 (Thò ra từ bên trái, bấm ra ngoài thì thu hẹp ẩn vào) */}
        {isVillageSidebarOpen && (
          <div
            ref={villageSidebarRef}
            id="village-sidebar-drawer"
            className="absolute top-0 left-0 bottom-0 z-[530] w-[180px] sm:w-[195px] bg-white/95 backdrop-blur-md shadow-2xl border-r-2 border-[#0A4393] flex flex-col overflow-hidden text-xs font-sans animate-slideInLeft"
          >
            {/* Header thanh trượt */}
            <div className="bg-[#0A4393] text-white px-2.5 py-1.5 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-1 font-bold min-w-0">
                <MapIcon className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="text-[11px] uppercase tracking-tight font-extrabold truncate">Thôn/buôn</span>
              </div>
              <button
                type="button"
                onClick={() => setIsVillageSidebarOpen(false)}
                className="p-0.5 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer shrink-0"
                title="Thu hẹp bảng về bên trái"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Thanh tác vụ nhanh */}
            <div className="px-2 py-1 bg-[#F0F6FF] border-b border-[#0A4393]/20 flex items-center justify-between gap-1 shrink-0 text-[10px]">
              <span className="text-slate-600 font-bold truncate">21 thôn</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleSelectAllVillages}
                  className="px-1.5 py-0.2 rounded bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[9px] transition-colors cursor-pointer"
                  title="Chọn hiển thị tất cả"
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllVillages}
                  className="px-1.5 py-0.2 rounded bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 font-medium text-[9px] transition-colors cursor-pointer"
                  title="Bỏ chọn tất cả"
                >
                  Bỏ
                </button>
              </div>
            </div>

            {/* Danh sách 21 nút thôn buôn (Thứ tự đúng chuẩn) */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
              {VILLAGE_LIST_21.map((v) => {
                const matchingKmz = villageKmzItems.filter((kmz) => isVillageMatch(v.name, kmz.label));
                const isChecked =
                  villageVisibility[v.name] === true ||
                  (matchingKmz.length > 0 && matchingKmz.some((m) => !!enabledKmzLayers[m.id]));

                const isSelected = selectedVillageBottomInfo?.name === v.name;
                const isFloodAlert =
                  scenarioId &&
                  scenarioId !== 'NONE' &&
                  scenarioId !== 'CUSTOM_SLIDER' &&
                  MIKE_FLOOD_SCENARIOS[scenarioId]?.affectedVillages?.includes(v.name);

                return (
                  <div
                    key={v.id}
                    className={`flex items-center justify-between px-1.5 py-1 rounded-md border transition-all ${
                      isSelected
                        ? 'bg-[#EBF3FF] border-[#0A4393] ring-1 ring-[#0A4393]'
                        : isFloodAlert
                        ? 'bg-rose-50/90 border-rose-400 ring-1 ring-rose-300'
                        : isChecked
                        ? 'bg-emerald-50/70 border-emerald-300 hover:bg-emerald-100/50'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          syncToggleVillage(v.name);
                        }}
                        className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer shrink-0 village-toggle-trigger"
                        title={`Tích chọn để hiển thị lớp bản đồ ${v.name}`}
                      />
                      <div
                        onClick={() => syncToggleVillage(v.name, true)}
                        className="truncate cursor-pointer flex-1 min-w-0 flex items-center gap-1"
                        title={`Nhấp để xem thông tin ${v.name}`}
                      >
                        <span className={`font-bold truncate text-[11px] block ${
                          isFloodAlert ? 'text-rose-900' : isChecked ? 'text-slate-900' : 'text-slate-600'
                        }`}>
                          {v.name}
                        </span>
                        {isFloodAlert && (
                          <span className="text-[7.5px] bg-rose-600 text-white font-black px-1 py-0.2 rounded uppercase animate-pulse shrink-0">
                            Ngập
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 ml-1">
                      {/* Nút tải file bản đồ lên cho thôn/buôn này - CHỈ HIỂN THỊ KHI TÀI KHOẢN LÀ ADMIN */}
                      {userRole === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTargetUploadVillage(v.name);
                            villageSpecificFileInputRef.current?.click();
                          }}
                          className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/30 transition-colors cursor-pointer"
                          title={`Tải file KML/GeoJSON cho ${v.name}`}
                        >
                          <Upload className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </button>
                      )}

                      {/* Nút tâm ngắm phóng tới */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          syncToggleVillage(v.name, true);
                        }}
                        className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-slate-300 transition-colors cursor-pointer"
                        title={`Phóng tới vị trí ${v.name}`}
                      >
                        <Crosshair className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Thông báo trạng thái định vị GPS */}
        {locateMessage && (
          <div className="absolute top-3 left-3 z-[500] bg-[#0A4393] text-white px-3 py-1.5 rounded-lg shadow-lg border border-white/40 text-xs font-mono flex items-center gap-2">
            <LocateFixed className="w-3.5 h-3.5 text-white animate-pulse shrink-0" />
            <span>{locateMessage}</span>
          </div>
        )}

        {/* Nút nổi góc trên bên phải: Mở Bảng Quản lý Lớp Bản Đồ */}
        <div className="absolute top-3 right-3 z-[500] flex items-center gap-1.5">
          <button
            ref={layerManagerBtnFloatRef}
            onClick={() => {
              if (!showLayerManager) {
                // Thiết lập khi bấm lại nút "Lớp bản đồ" thì mặc định xuất hiện về vị trí mặc định
                setPanelCoords(null);
                setLayerPanelPosition('left');
              }
              setShowLayerManager(!showLayerManager);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono shadow-lg border transition-all ${
              showLayerManager
                ? 'bg-[#0A4393] text-white border-white ring-2 ring-[#0A4393]/40'
                : 'bg-white text-[#0A4393] border-[#0A4393]/40 hover:bg-[#F0F6FF]'
            }`}
            title="Bật/tắt quản lý lớp bản đồ (Trở về vị trí mặc định)"
          >
            <Layers className="w-4 h-4" />
            <span>Lớp Bản Đồ ({activeLayerCount}/{totalLayerCount})</span>
          </button>
        </div>

        {/* NÚT TOÀN MÀN HÌNH BẢN ĐỒ (NẰM NGAY TRÊN NÚT ĐỊNH VỊ GPS VÀ CỤM NÚT ZOOM) */}
        <button
          type="button"
          onClick={handleToggleFullscreen}
          className="absolute bottom-[132px] right-[10px] z-[500] w-[34px] h-[34px] rounded-md bg-white hover:bg-[#F0F6FF] active:bg-blue-100 text-[#0A4393] border-2 border-[#0A4393]/40 shadow-lg flex items-center justify-center transition-all cursor-pointer"
          title={isFullscreen ? 'Thu nhỏ bản đồ' : 'Toàn màn hình bản đồ'}
          aria-label="Toàn màn hình bản đồ"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-[#0A4393]" />
          ) : (
            <Maximize2 className="w-4 h-4 text-[#0A4393]" />
          )}
        </button>

        {/* Nút nổi góc dưới bên phải: ĐỊNH VỊ VỊ TRÍ ĐANG ĐỨNG */}
        <button
          onClick={handleLocateUser}
          disabled={isLocating}
          className="absolute bottom-[92px] right-[10px] z-[500] w-[34px] h-[34px] rounded-md bg-white hover:bg-[#F0F6FF] active:bg-blue-100 text-[#0A4393] border-2 border-[#0A4393]/40 shadow-lg flex items-center justify-center transition-all"
          title="Định vị vị trí đang đứng trên bản đồ (GPS)"
          aria-label="Định vị vị trí đang đứng trên bản đồ"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#0A4393]" />
          ) : (
            <LocateFixed className="w-4 h-4 text-[#0A4393]" />
          )}
        </button>

        {/* GÓC DƯỚI BÊN TRÁI: CỤM NÚT "KIỂM TRA VỊ TRÍ CỦA TÔI" (ĐỎ) VÀ "BÁO TIN" (XANH LÁ) + POPUP CHÚ GIẢI (ẢNH 2 & ẢNH 3) */}
        <div className="absolute bottom-2.5 left-2.5 z-[500] flex flex-col gap-1.5 font-sans items-start">
          <div className="flex items-center gap-2">
            {/* Nút 1: Kiểm tra vị trí của tôi (Hình tròn màu đỏ) */}
            <button
              ref={checkLocationBtnRef}
              type="button"
              onClick={() => {
                setShowGpsFloodAssessment(true);
                handleCheckGpsFloodRisk();
              }}
              disabled={isLocating}
              className="w-[46px] h-[46px] sm:w-[48px] sm:h-[48px] rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-2 border-white shadow-xl flex flex-col items-center justify-center text-center transition-all transform active:scale-95 cursor-pointer select-none shrink-0 p-0.5"
              title="Kiểm tra vị trí của tôi và đánh giá nguy cơ ngập"
            >
              <span
                className={`text-[7.5px] sm:text-[8px] font-black leading-[1.05] tracking-tighter text-white block ${
                  isLocating ? 'animate-pulse' : ''
                }`}
              >
                Kiểm tra
                <br />
                vị trí của tôi
              </span>
            </button>

            {/* Nút 1.5: Đo Đất (Nút tròn nổi bên cạnh nút "Kiểm tra vị trí của tôi" với biểu tượng cây thước đo và nhãn "Đo Đất") */}
            <button
              type="button"
              onClick={() => setIsLandMeasureOpen((prev) => !prev)}
              className={`w-[46px] h-[46px] sm:w-[48px] sm:h-[48px] rounded-full ${
                isLandMeasureOpen
                  ? 'bg-amber-600 ring-2 ring-amber-300'
                  : 'bg-[#0A4393] hover:bg-[#083576] active:bg-[#062859]'
              } text-white border-2 border-white shadow-xl flex flex-col items-center justify-center text-center transition-all transform active:scale-95 cursor-pointer select-none shrink-0 p-0.5`}
              title="Công cụ Đo diện tích đất & Khoanh ranh thửa thực địa (Sào Tây Nguyên, Ha, m², Chu vi)"
              aria-label="Đo Đất"
            >
              <Ruler className="w-4 h-4 text-amber-300 mb-0.5 shrink-0" />
              <span className="text-[8px] sm:text-[8.5px] font-black leading-none tracking-tighter text-white block">
                Đo Đất
              </span>
            </button>

            {/* Nút 2: Báo Tin / Gửi Tin hiện trường - BẤT KỲ TÀI KHOẢN NÀO ĐĂNG NHẬP ĐỀU HIỆN (ẢNH 1) */}
            {Boolean(currentUserEmail) && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenCommunityReport) {
                    onOpenCommunityReport();
                  } else {
                    window.dispatchEvent(new CustomEvent('open-community-report'));
                  }
                }}
                className="w-[46px] h-[46px] sm:w-[48px] sm:h-[48px] rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-2 border-white shadow-xl flex flex-col items-center justify-center text-center transition-all transform active:scale-95 cursor-pointer select-none shrink-0 p-0.5"
                title="Báo tin / Gửi tin hiện trường (Kèm ảnh & GPS)"
                aria-label="Báo Tin"
              >
                <Camera className="w-4 h-4 text-white mb-0.5 shrink-0" />
                <span className="text-[7.5px] sm:text-[8px] font-black leading-none tracking-tighter text-white block">
                  Báo tin
                </span>
              </button>
            )}
          </div>

          {/* Khối Chú giải độ sâu ngập MIKE 21 FM (Tự ẩn khi nhấp chuột ra ngoài) */}
          {showGpsFloodAssessment && (
            <div
              ref={legendBoxRef}
              className="absolute bottom-[54px] sm:bottom-[58px] left-0 z-[510] w-[275px] sm:w-[320px] flex flex-col gap-1.5 animate-fadeIn"
            >
              {/* Thanh chú giải (Legend) 5 cấp độ sâu ngập chuẩn MIKE 21 FM */}
              <div className="bg-white/95 backdrop-blur-xs border border-[#0A4393]/40 rounded-lg shadow-lg overflow-hidden text-[10px] font-mono">
                <div className="w-full px-2.5 py-1 bg-[#F0F6FF] text-[#0A4393] font-bold flex items-center justify-between gap-2 border-b border-[#0A4393]/15">
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-[#0A4393] shrink-0" />
                    <span>CHÚ GIẢI ĐỘ SÂU NGẬP MIKE 21 FM</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGpsFloodAssessment(false)}
                    className="text-slate-400 hover:text-rose-600 font-bold px-1.5 py-0.5 rounded hover:bg-slate-100"
                    title="Đóng bảng chú giải độ sâu ngập"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-2 space-y-1">
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {MIKE21_DEPTH_LEGEND.map((item) => (
                      <div
                        key={item.level}
                        className="flex flex-col items-center bg-slate-50 rounded p-1 border border-slate-200"
                        title={item.desc}
                      >
                        <span
                          className="w-full h-2 rounded-xs mb-0.5 border"
                          style={{
                            backgroundColor: item.color,
                            borderColor: item.borderColor,
                          }}
                        />
                        <span className="text-[9px] font-bold text-slate-800 whitespace-nowrap">
                          {item.level}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-600 pt-0.5 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-700 inline-block" />
                      10 Vết lũ 7/2023
                    </span>
                    <span className="flex items-center gap-1">
                      <span>🏥🏫</span>
                      Y tế - Giáo dục ngập
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CÔNG CỤ ĐO DIỆN TÍCH ĐẤT & KHOANH RANH THỬA THỰC ĐỊA (LandMeasureFloatingCard) */}
        <LandMeasureFloatingCard
          isOpen={isLandMeasureOpen}
          onClose={() => setIsLandMeasureOpen(false)}
          onOpen={() => setIsLandMeasureOpen(true)}
          leafletMapRef={leafletMapRef}
          mapWrapperRef={mapWrapperRef}
        />

        {/* KHUNG QUẢN LÝ LỚP BẢN ĐỒ (Hỗ trợ kéo thả tự do khắp bản đồ hoặc đổi bên nhanh) */}
        {showLayerManager && (
          <div
            ref={layerManagerPanelRef}
            style={
              panelCoords
                ? { left: `${panelCoords.x}px`, top: `${panelCoords.y}px` }
                : undefined
            }
            className={`absolute ${
              !panelCoords
                ? `top-12 ${layerPanelPosition === 'left' ? 'left-3' : 'right-3'}`
                : ''
            } z-[550] w-[330px] sm:w-[375px] ${
              isFullscreen ? 'max-h-[85vh]' : 'max-h-[290px] sm:max-h-[480px]'
            } bg-white border-2 border-[#0A4393] rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs font-sans ${
              isDraggingPanel ? 'select-none shadow-3xl opacity-95 transition-none' : 'transition-all duration-150'
            }`}
          >
            {/* Header Bảng Quản Lý Lớp - Hỗ trợ kéo thả di chuyển */}
            <div
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                handlePanelDragStart(e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                if ((e.target as HTMLElement).closest('button') || !e.touches[0]) return;
                handlePanelDragStart(e.touches[0].clientX, e.touches[0].clientY);
              }}
              className={`bg-[#0A4393] text-white px-3 py-2 flex items-center justify-between shrink-0 select-none ${
                isDraggingPanel ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              title="Nhấn giữ và kéo chuột / chạm vuốt để di chuyển bảng đến bất kỳ vị trí nào trên bản đồ"
            >
              <div className="flex items-center gap-1.5 font-bold">
                <GripHorizontal className="w-4 h-4 opacity-75 hover:opacity-100 cursor-grab" />
                <Layers className="w-4 h-4" />
                <span>QUẢN LÝ LỚP BẢN ĐỒ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowLayerManager(false)}
                  className="p-1 rounded hover:bg-white/20 text-white transition-colors"
                  title="Đóng bảng quản lý lớp"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Thanh điều hướng 3 Tab: Hệ Thống (Xanh dương) | Lũ Kiểm Chứng (Tím nhạt) | Thôn/Buôn (Xanh lá) */}
            <div className="flex border-b border-slate-200 text-[11px] font-bold shrink-0">
              {/* Tab 1: Hệ Thống (Tone Xanh dương) */}
              <button
                type="button"
                onClick={() => setActiveLayerTab('SYSTEM')}
                className={`flex-1 py-2 px-1 text-center transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                  activeLayerTab === 'SYSTEM'
                    ? 'bg-[#EBF3FF] text-[#0A4393] border-[#0A4393] shadow-xs font-extrabold'
                    : 'bg-[#F4F8FD] text-slate-600 hover:text-[#0A4393] border-transparent hover:bg-[#EBF3FF]/60'
                }`}
              >
                <span>Hệ Thống</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                    activeLayerTab === 'SYSTEM'
                      ? 'bg-[#0A4393] text-white'
                      : 'bg-blue-100 text-[#0A4393]'
                  }`}
                >
                  {systemTabActiveCount}/{systemTabTotalCount}
                </span>
              </button>

              {/* Tab 2: Lũ Kiểm Chứng (Tone Tím nhạt) */}
              <button
                type="button"
                onClick={() => setActiveLayerTab('FLOOD')}
                className={`flex-1 py-2 px-1 text-center transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                  activeLayerTab === 'FLOOD'
                    ? 'bg-[#F4EDFC] text-[#5B21B6] border-[#6D28D9] shadow-xs font-extrabold'
                    : 'bg-[#FAF5FD] text-slate-600 hover:text-[#5B21B6] border-transparent hover:bg-[#F4EDFC]/60'
                }`}
              >
                <span>Lũ Kiểm Chứng</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                    activeLayerTab === 'FLOOD'
                      ? 'bg-[#6D28D9] text-white'
                      : 'bg-purple-100 text-purple-900'
                  }`}
                >
                  {floodTabActiveCount}/{floodTabTotalCount}
                </span>
              </button>

              {/* Tab 3: Thôn / Buôn (Tone Xanh lá nhạt) - CHỈ ADMIN MỚI ĐƯỢC QUYỀN XEM */}
              {userRole === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => setActiveLayerTab('VILLAGE')}
                  className={`flex-1 py-2 px-1 text-center transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                    activeLayerTab === 'VILLAGE'
                      ? 'bg-[#EBF7EE] text-[#065F46] border-[#059669] shadow-xs font-extrabold'
                      : 'bg-[#F4FAF5] text-slate-600 hover:text-[#065F46] border-transparent hover:bg-[#EBF7EE]/60'
                  }`}
                >
                  <span>Thôn / Buôn</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                      activeLayerTab === 'VILLAGE'
                        ? 'bg-[#059669] text-white'
                        : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    {villageTabActiveCount}/{villageTabTotalCount}
                  </span>
                </button>
              )}
            </div>

            {/* Thanh tác vụ của Tab Hệ Thống & Lũ Kiểm Chứng (Chỉ ẩn khi là Admin và đang ở tab Thôn/Buôn) */}
            {(userRole !== 'ADMIN' || activeLayerTab !== 'VILLAGE') && (
              <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={
                      activeLayerTab === 'SYSTEM'
                        ? isAllSystemTabActive
                        : isAllFloodTabActive
                    }
                    onChange={() => {
                      if (activeLayerTab === 'SYSTEM') handleToggleAllSystemTab();
                      else if (activeLayerTab === 'FLOOD') handleToggleAllFloodTab();
                    }}
                    className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-[#0A4393]">
                    Chọn tất cả (
                    {activeLayerTab === 'SYSTEM'
                      ? `${systemTabActiveCount}/${systemTabTotalCount}`
                      : `${floodTabActiveCount}/${floodTabTotalCount}`}
                    )
                  </span>
                </label>

                {/* Quyền Admin / Map Editor nạp file KML / GeoJSON vào Tab này */}
                {canEditMap && (
                  <button
                    type="button"
                    onClick={() => handleTriggerTabUpload(activeLayerTab)}
                    className="px-2 py-0.5 rounded bg-[#0A4393] hover:bg-[#083576] text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    title={`Tải file KML / GeoJSON vào tab ${
                      activeLayerTab === 'SYSTEM'
                        ? 'Hệ Thống'
                        : 'Lũ Kiểm Chứng'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>+ Nạp KML/GeoJSON</span>
                  </button>
                )}
              </div>
            )}

            {/* 2 TAB LỚN TẠI TAB THÔN/BUÔN: 1. ĐIỂM TẬP TRUNG | 2. RANH THÔN/BUÔN - CHỈ ADMIN */}
            {userRole === 'ADMIN' && activeLayerTab === 'VILLAGE' && (
              <div className="p-2 bg-slate-100/90 border-b border-slate-200 shrink-0">
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/80 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setVillageSubTab('POINTS')}
                    className={`py-2 px-2 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold text-[11.5px] ${
                      villageSubTab === 'POINTS'
                        ? 'bg-[#0A4393] text-white shadow-sm ring-1 ring-[#0A4393]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Điểm tập trung</span>
                    <span
                      className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                        villageSubTab === 'POINTS'
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-slate-700'
                      }`}
                    >
                      {activeVillagePointsCount}/{totalVillagePointsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVillageSubTab('BOUNDARIES')}
                    className={`py-2 px-2 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold text-[11.5px] ${
                      villageSubTab === 'BOUNDARIES'
                        ? 'bg-[#0A4393] text-white shadow-sm ring-1 ring-[#0A4393]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Ranh thôn/buôn</span>
                    <span
                      className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                        villageSubTab === 'BOUNDARIES'
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-slate-700'
                      }`}
                    >
                      {villageBoundariesActiveCount}/{villageKmzItems.length}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Danh sách các lớp bản đồ của Tab đang chọn (Cuộn dọc gọn gàng) */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {/* TAB 1: NHÓM LỚP HỆ THỐNG */}
              {activeLayerTab === 'SYSTEM' && (
                <div className="space-y-1.5">
                  {/* 1. 4 Trạm & Hồ Đập Trọng Điểm (Hệ thống - Không sửa/xóa) */}
                  <div className="flex items-center justify-between p-1.5 rounded hover:bg-[#F4F8FD] border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={systemLayers.markers}
                        onChange={() => handleToggleSystemLayer('markers')}
                        className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer shrink-0"
                      />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0A4393] inline-block shrink-0" />
                      <span className="text-[11px] font-medium text-slate-800 truncate">
                        4 Trạm & Hồ Đập Trọng Điểm
                      </span>
                    </label>
                    <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                      Hệ thống
                    </span>
                  </div>

                  {/* 2. Vành Đai Sinh Thái Liên Xã 5km (Hệ thống - Không sửa/xóa) */}
                  <div className="flex items-center justify-between p-1.5 rounded hover:bg-[#F4F8FD] border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={systemLayers.buffer}
                        onChange={() => handleToggleSystemLayer('buffer')}
                        className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer shrink-0"
                      />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0" />
                      <span className="text-[11px] font-medium text-slate-800 truncate">
                        Vành Đai Sinh Thái Liên Xã 5km
                      </span>
                    </label>
                    <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                      Hệ thống
                    </span>
                  </div>

                  {/* 3. Bản đồ ngập lụt (Hệ thống - Không sửa/xóa) */}
                  <div className="flex items-center justify-between p-1.5 rounded hover:bg-[#F4F8FD] border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={systemLayers.mikeKmlFile}
                        onChange={() => handleToggleSystemLayer('mikeKmlFile')}
                        className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer shrink-0"
                      />
                      <span className="w-2.5 h-2.5 rounded-xs bg-cyan-400 inline-block shrink-0" />
                      <span className="text-[11px] font-medium text-slate-800 truncate">
                        Bản đồ ngập lụt
                      </span>
                    </label>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleFlyToSystemLayer('mikeKmlFile')}
                        className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors"
                        title="Phóng tới vùng Bản đồ ngập lụt"
                      >
                        <Crosshair className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Các file KML/GeoJSON do người dùng tải lên thuộc Tab Hệ Thống */}
                  {systemKmzItems.map((item) => {
                    const isChecked = !!enabledKmzLayers[item.id];
                    const isLoading = !!loadingKmzLayers[item.id];
                    const isEditing = canEditMap && editingLayerId === item.id;
                    const isCustom = isUserUploadLayer(item);

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                          isChecked
                            ? 'bg-[#F0F6FF]/90 border-[#0A4393]/30'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleKmzLayer(item)}
                            className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer shrink-0"
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0 border border-slate-400"
                            style={{ backgroundColor: item.color }}
                          />

                          {isEditing ? (
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <input
                                type="text"
                                value={editingLayerName}
                                onChange={(e) => setEditingLayerName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveLayerName(item.id);
                                  if (e.key === 'Escape') setEditingLayerId(null);
                                }}
                                autoFocus
                                className="flex-1 min-w-0 px-1.5 py-0.5 text-[11px] font-semibold text-[#0A4393] bg-white border border-[#0A4393] rounded focus:outline-none focus:ring-1 focus:ring-[#0A4393]"
                                placeholder="Nhập tên lớp bản đồ..."
                              />
                              <button
                                onClick={() => handleSaveLayerName(item.id)}
                                className="px-1.5 py-0.5 rounded bg-[#0A4393] text-white text-[10px] font-bold hover:bg-[#083576] shrink-0"
                              >
                                Lưu
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleToggleKmzLayer(item)}
                              className="truncate cursor-pointer flex-1 min-w-0"
                            >
                              <div className="text-[11px] font-bold text-slate-800 truncate">
                                {item.label}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-1.5">
                          {isLoading && (
                            <Loader2 className="w-3 h-3 animate-spin text-[#0A4393]" />
                          )}
                          {isCustom && canEditMap && !isEditing && (
                            <button
                              onClick={() => handleStartEditLayerName(item)}
                              className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors"
                              title="Chỉnh sửa tên lớp bản đồ"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleFlyToKmzLayer(item)}
                            className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors"
                            title={`Phóng bản đồ tới vị trí lớp ${item.label}`}
                          >
                            <Crosshair className="w-3 h-3" />
                          </button>
                          {isCustom && canEditMap && (
                            <button
                              onClick={() => handleDeleteKmzLayer(item)}
                              className="p-1 rounded bg-white hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition-colors"
                              title="Xóa lớp bản đồ này khỏi hệ thống"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: NHÓM LỚP LŨ KIỂM CHỨNG */}
              {activeLayerTab === 'FLOOD' && (
                <div className="space-y-1.5">
                  {/* 1. 10 Vết lũ kiểm định thực tế (7/2023) - Hệ thống không sửa/xóa */}
                  <div className="flex items-center justify-between p-1.5 rounded bg-purple-50/60 hover:bg-purple-50 border border-purple-200">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={systemLayers.floodMarks2023}
                        onChange={() => handleToggleSystemLayer('floodMarks2023')}
                        className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer shrink-0"
                      />
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-700 inline-block shrink-0" />
                      <span className="text-[11px] font-bold text-purple-950 truncate">
                        10 Vết lũ kiểm định thực tế (7/2023)
                      </span>
                    </label>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] font-semibold text-purple-700 bg-white px-1.5 py-0.5 rounded border border-purple-200">
                        Hệ thống
                      </span>
                      <button
                        type="button"
                        onClick={() => handleFlyToSystemLayer('floodMarks2023')}
                        className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors"
                        title="Phóng tới 10 Vết lũ kiểm định thực tế"
                      >
                        <Crosshair className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* 2. Công trình Y tế - Giáo dục có nguy cơ ngập - Hệ thống không sửa/xóa */}
                  <div className="flex items-center justify-between p-1.5 rounded bg-amber-50/70 hover:bg-amber-50 border border-amber-200">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={systemLayers.vulnerableFacilities}
                        onChange={() => handleToggleSystemLayer('vulnerableFacilities')}
                        className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer shrink-0"
                      />
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block shrink-0" />
                      <span className="text-[11px] font-bold text-amber-950 truncate">
                        Công trình Y tế – Giáo dục có nguy cơ ngập
                      </span>
                    </label>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] font-semibold text-amber-800 bg-white px-1.5 py-0.5 rounded border border-amber-200">
                        Hệ thống
                      </span>
                      <button
                        type="button"
                        onClick={() => handleFlyToSystemLayer('vulnerableFacilities')}
                        className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors"
                        title="Phóng tới các Công trình Y tế - Giáo dục có nguy cơ ngập"
                      >
                        <Crosshair className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Các file KML/GeoJSON do người dùng tải lên thuộc Tab Lũ */}
                  {floodKmzItems.map((item) => {
                    const isChecked = !!enabledKmzLayers[item.id];
                    const isLoading = !!loadingKmzLayers[item.id];
                    const isEditing = canEditMap && editingLayerId === item.id;
                    const isCustom = isUserUploadLayer(item);

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                          isChecked
                            ? 'bg-[#F0F6FF]/90 border-[#0A4393]/30'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleKmzLayer(item)}
                            className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer shrink-0"
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0 border border-slate-400"
                            style={{ backgroundColor: item.color }}
                          />

                          {isEditing ? (
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <input
                                type="text"
                                value={editingLayerName}
                                onChange={(e) => setEditingLayerName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveLayerName(item.id);
                                  if (e.key === 'Escape') setEditingLayerId(null);
                                }}
                                autoFocus
                                className="flex-1 min-w-0 px-1.5 py-0.5 text-[11px] font-semibold text-[#0A4393] bg-white border border-[#0A4393] rounded focus:outline-none focus:ring-1 focus:ring-[#0A4393]"
                                placeholder="Nhập tên lớp bản đồ..."
                              />
                              <button
                                onClick={() => handleSaveLayerName(item.id)}
                                className="px-1.5 py-0.5 rounded bg-[#0A4393] text-white text-[10px] font-bold hover:bg-[#083576] shrink-0"
                              >
                                Lưu
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleToggleKmzLayer(item)}
                              className="truncate cursor-pointer flex-1 min-w-0"
                            >
                              <div className="text-[11px] font-bold text-slate-800 truncate">
                                {item.label}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-1.5">
                          {isLoading && (
                            <Loader2 className="w-3 h-3 animate-spin text-[#0A4393]" />
                          )}
                          {isCustom && canEditMap && !isEditing && (
                            <button
                              onClick={() => handleStartEditLayerName(item)}
                              className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors"
                              title="Chỉnh sửa tên lớp bản đồ"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleFlyToKmzLayer(item)}
                            className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors"
                            title={`Phóng bản đồ tới vị trí lớp ${item.label}`}
                          >
                            <Crosshair className="w-3 h-3" />
                          </button>
                          {isCustom && canEditMap && (
                            <button
                              onClick={() => handleDeleteKmzLayer(item)}
                              className="p-1 rounded bg-white hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition-colors"
                              title="Xóa lớp bản đồ này khỏi hệ thống"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: NHÓM LỚP THÔN/BUÔN - TÁCH THÀNH 2 TAB LỚN: 1. ĐIỂM TẬP TRUNG | 2. RANH THÔN/BUÔN - CHỈ ADMIN */}
              {userRole === 'ADMIN' && activeLayerTab === 'VILLAGE' && (
                <div className="space-y-1.5">
                  {/* 1. TAB ĐIỂM TẬP TRUNG (Ảnh 2) */}
                  {villageSubTab === 'POINTS' && (
                    <div className="p-1.5 rounded-lg bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-200 transition-colors">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={systemLayers.villages}
                            onChange={() => handleToggleSystemLayer('villages')}
                            className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer shrink-0"
                          />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shrink-0" />
                          <span className="text-[11px] font-bold text-emerald-950 truncate">
                            Điểm tập trung 20 thôn/buôn
                          </span>
                        </label>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleFlyToSystemLayer('villages')}
                            className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors"
                            title="Phóng bản đồ bao quát 20 thôn buôn xã Ea Súp"
                          >
                            <Crosshair className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Danh sách 20 Thôn Buôn chi tiết để kiểm tra & cập nhật tọa độ vị trí */}
                      {systemLayers.villages && (
                        <div className="mt-2 pt-2 border-t border-emerald-200/60 max-h-[380px] overflow-y-auto space-y-1 pr-0.5">
                          {/* Thanh công cụ phụ: Chọn tất cả / Bỏ chọn tất cả từng điểm thôn buôn */}
                          <div className="flex items-center justify-between px-1.5 py-1 bg-emerald-100/70 rounded text-[9.5px] text-emerald-950 font-semibold mb-1 border border-emerald-200">
                            <span>
                              📍 Hiển thị: <strong>{activeVillagePointsCount}/{totalVillagePointsCount}</strong> điểm
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={handleSelectAllVillages}
                                className="px-1.5 py-0.5 rounded bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold transition-colors cursor-pointer"
                                title="Tích chọn hiển thị tất cả các điểm thôn/buôn trên bản đồ"
                              >
                                Tất cả
                              </button>
                              <button
                                type="button"
                                onClick={handleDeselectAllVillages}
                                className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 font-medium transition-colors cursor-pointer"
                                title="Bỏ chọn tất cả các điểm thôn/buôn trên bản đồ"
                              >
                                Bỏ chọn
                              </button>
                            </div>
                          </div>

                          {Object.values(VILLAGE_DISASTER_PROFILES).map((vil) => {
                            const isBuon = vil.groupLabel === '03 Buôn đồng bào';
                            const isThonTen = vil.groupLabel === '04 Thôn tên';
                            const tagBg = isBuon
                              ? 'bg-emerald-100 text-emerald-800'
                              : isThonTen
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-blue-100 text-[#0A4393]';
                            const isEditingThisVillage =
                              canEditMap && editingVillageName === vil.name;
                            const isCustomized = !!customVillageCoords[vil.name];
                            const matchingKmz = villageKmzItems.filter((kmz) => isVillageMatch(vil.name, kmz.label));
                            const isVilVisible =
                              villageVisibility[vil.name] === true ||
                              (matchingKmz.length > 0 && matchingKmz.some((m) => !!enabledKmzLayers[m.id]));

                            return (
                              <div key={vil.name} className="flex flex-col">
                                <div
                                  className={`flex items-center justify-between p-1 rounded border transition-colors ${
                                    isEditingThisVillage
                                      ? 'bg-[#E6F0FA] border-[#0A4393]'
                                      : isVilVisible
                                      ? 'bg-white hover:bg-emerald-100/50 border-slate-200'
                                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 opacity-60'
                                  } text-[10.5px]`}
                                >
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    {/* Dấu tích chọn từng điểm phía trước mỗi điểm */}
                                    <input
                                      type="checkbox"
                                      checked={isVilVisible}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        syncToggleVillage(vil.name);
                                      }}
                                      className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer shrink-0"
                                      title={`Tích chọn để hiển thị hoặc ẩn điểm ${vil.name} trên bản đồ`}
                                    />
                                    <div
                                      onClick={() => syncToggleVillage(vil.name, true)}
                                      className="flex items-center gap-1.5 truncate cursor-pointer flex-1 min-w-0"
                                      title={`Nhấn để phóng tới ${vil.name}`}
                                    >
                                      <span
                                        className={`font-semibold truncate ${
                                          isVilVisible ? 'text-slate-800' : 'text-slate-500'
                                        }`}
                                      >
                                        {vil.name}
                                      </span>
                                      <span
                                        className={`text-[8.5px] px-1 py-0.2 rounded font-mono font-bold ${tagBg} shrink-0`}
                                      >
                                        +{vil.avgElevationM}m
                                      </span>
                                      <span className="text-[8.5px] text-slate-500 font-mono shrink-0">
                                        ({vil.totalHouseholds} hộ)
                                      </span>
                                      {isCustomized && (
                                        <span
                                          className="text-[8px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-mono font-bold shrink-0"
                                          title="Tọa độ đã được Admin tinh chỉnh vị trí"
                                        >
                                          Đã sửa vị trí
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-1">
                                    {canEditMap && (
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditVillageCoords(vil.name)}
                                        className={`p-0.5 rounded border transition-colors ${
                                          isEditingThisVillage
                                            ? 'bg-[#0A4393] text-white border-[#0A4393]'
                                            : 'bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border-slate-300'
                                        }`}
                                        title="Admin: Nhập tọa độ vị trí (X, Y) cập nhật trực tiếp cho thôn này"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => syncToggleVillage(vil.name, true)}
                                      className="p-0.5 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-slate-300 transition-colors"
                                      title={`Phóng tới ${vil.name} trên bản đồ`}
                                    >
                                      <Crosshair className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Form Admin nhập tọa độ X, Y trực tiếp cho từng thôn */}
                                {isEditingThisVillage && (
                                  <div className="p-2 bg-[#F0F6FF] rounded-lg border border-[#0A4393]/35 mt-1 mb-1 space-y-1.5 shadow-xs">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-[#0A4393] flex-wrap gap-1">
                                      <span>📍 NHẬP TỌA ĐỘ VỊ TRÍ: {vil.name}</span>
                                      <div className="flex items-center gap-1">
                                        {pinnedCoord && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditLatInput(pinnedCoord.lat.toFixed(6));
                                              setEditLngInput(pinnedCoord.lng.toFixed(6));
                                            }}
                                            className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                            title={`Điền tọa độ điểm vừa ghim: ${pinnedCoord.lat.toFixed(6)}, ${pinnedCoord.lng.toFixed(6)}`}
                                          >
                                            <MapPin className="w-2.5 h-2.5 text-red-600" />
                                            <span>Lấy điểm ghim ({pinnedCoord.lat.toFixed(4)}, {pinnedCoord.lng.toFixed(4)})</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={handleGetMapCenterForVillage}
                                          className="text-[9px] px-1.5 py-0.5 rounded bg-white text-[#0A4393] hover:bg-blue-100 border border-[#0A4393]/30 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                          title="Lấy tọa độ tâm bản đồ Leaflet đang hiển thị"
                                        >
                                          <MapPin className="w-2.5 h-2.5" />
                                          <span>Lấy tâm bản đồ</span>
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5">
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-700 mb-0.5">
                                          Tọa độ Y / Vĩ độ (Lat):
                                        </label>
                                        <input
                                          type="number"
                                          step="any"
                                          value={editLatInput}
                                          onChange={(e) => setEditLatInput(e.target.value)}
                                          placeholder="Ví dụ: 13.069298"
                                          className="w-full px-1.5 py-0.5 text-[11px] font-mono bg-white border border-[#0A4393]/40 rounded focus:border-[#0A4393] focus:ring-1 focus:ring-[#0A4393] focus:outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-700 mb-0.5">
                                          Tọa độ X / Kinh độ (Lng):
                                        </label>
                                        <input
                                          type="number"
                                          step="any"
                                          value={editLngInput}
                                          onChange={(e) => setEditLngInput(e.target.value)}
                                          placeholder="Ví dụ: 107.881527"
                                          className="w-full px-1.5 py-0.5 text-[11px] font-mono bg-white border border-[#0A4393]/40 rounded focus:border-[#0A4393] focus:ring-1 focus:ring-[#0A4393] focus:outline-none"
                                        />
                                      </div>
                                    </div>

                                    {coordSaveMessage && (
                                      <div className="text-[9.5px] text-emerald-700 font-bold bg-emerald-50 p-1 rounded border border-emerald-200">
                                        ✓ {coordSaveMessage}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between gap-1 pt-0.5">
                                      {isCustomized ? (
                                        <button
                                          type="button"
                                          onClick={() => handleResetVillageCoords(vil.name)}
                                          className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9px] font-semibold cursor-pointer"
                                          title="Khôi phục lại tọa độ gốc ban đầu"
                                        >
                                          Đặt lại mặc định
                                        </button>
                                      ) : (
                                        <div />
                                      )}

                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => setEditingVillageName(null)}
                                          className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-600 text-[9.5px] font-semibold border border-slate-300 cursor-pointer"
                                        >
                                          Hủy
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveVillageCoords(vil.name)}
                                          className="px-2.5 py-0.5 rounded bg-[#0A4393] hover:bg-[#083576] text-white text-[10px] font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                          <Save className="w-3 h-3" />
                                          <span>Lưu tọa độ</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. TAB RANH THÔN/BUÔN (Ảnh 3) */}
                  {villageSubTab === 'BOUNDARIES' && (
                    <div className="space-y-1.5">
                      {/* Thanh tác vụ của Tab Ranh thôn/buôn */}
                      <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200 mb-1">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isAllVillageBoundariesActive}
                            onChange={handleToggleAllVillageBoundaries}
                            className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="text-[11px] font-bold text-[#0A4393]">
                            Chọn tất cả ({villageBoundariesActiveCount}/{villageKmzItems.length})
                          </span>
                        </label>

                        {canEditMap && (
                          <button
                            type="button"
                            onClick={() => handleTriggerTabUpload('VILLAGE')}
                            className="px-2 py-0.5 rounded bg-[#0A4393] hover:bg-[#083576] text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            title="Tải file KML / GeoJSON ranh giới thôn buôn"
                          >
                            <Upload className="w-3 h-3" />
                            <span>+ Nạp KML/GeoJSON</span>
                          </button>
                        )}
                      </div>

                      {/* Các file KML/GeoJSON do người dùng tải lên thuộc Tab Thôn/Buôn */}
                      {villageKmzItems.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-[11px] bg-slate-50 rounded-lg border border-dashed border-slate-300">
                          Chưa có file ranh giới KML/GeoJSON nào cho thôn/buôn.
                          {canEditMap && (
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() => handleTriggerTabUpload('VILLAGE')}
                                className="px-2.5 py-1 rounded bg-[#0A4393] text-white text-[10px] font-bold inline-flex items-center gap-1"
                              >
                                <Upload className="w-3 h-3" />
                                <span>+ Tải lên file KML/GeoJSON</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        villageKmzItems.map((item) => {
                          const matchedVillage = VILLAGE_LIST_21.find((v) => isVillageMatch(v.name, item.label));
                          const isChecked = matchedVillage
                            ? villageVisibility[matchedVillage.name] === true || !!enabledKmzLayers[item.id]
                            : !!enabledKmzLayers[item.id];
                          const isLoading = !!loadingKmzLayers[item.id];
                          const isEditing = canEditMap && editingLayerId === item.id;
                          const isCustom = isUserUploadLayer(item);

                          return (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                                isChecked
                                  ? 'bg-[#F0F6FF]/90 border-[#0A4393]/30'
                                  : 'bg-white border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (matchedVillage) {
                                      syncToggleVillage(matchedVillage.name);
                                    } else {
                                      handleToggleKmzLayer(item);
                                    }
                                  }}
                                  className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer shrink-0"
                                />
                                <span
                                  className="w-2.5 h-2.5 rounded-xs shrink-0 border border-slate-400"
                                  style={{ backgroundColor: item.color }}
                                />

                                {isEditing ? (
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <input
                                      type="text"
                                      value={editingLayerName}
                                      onChange={(e) => setEditingLayerName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveLayerName(item.id);
                                        if (e.key === 'Escape') setEditingLayerId(null);
                                      }}
                                      autoFocus
                                      className="flex-1 min-w-0 px-1.5 py-0.5 text-[11px] font-semibold text-[#0A4393] bg-white border border-[#0A4393] rounded focus:outline-none focus:ring-1 focus:ring-[#0A4393]"
                                      placeholder="Nhập tên lớp bản đồ..."
                                    />
                                    <button
                                      onClick={() => handleSaveLayerName(item.id)}
                                      className="px-1.5 py-0.5 rounded bg-[#0A4393] text-white text-[10px] font-bold hover:bg-[#083576] shrink-0"
                                    >
                                      Lưu
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => {
                                      if (matchedVillage) {
                                        syncToggleVillage(matchedVillage.name, true);
                                      } else {
                                        handleToggleKmzLayer(item);
                                      }
                                    }}
                                    className="truncate cursor-pointer flex-1 min-w-0"
                                  >
                                    <div className="text-[11px] font-bold text-slate-800 truncate">
                                      {item.label}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0 ml-1.5">
                                {isLoading && (
                                  <Loader2 className="w-3 h-3 animate-spin text-[#0A4393]" />
                                )}
                                {!isCustom && (
                                  <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    Hệ thống
                                  </span>
                                )}
                                {isCustom && canEditMap && !isEditing && (
                                  <button
                                    onClick={() => handleStartEditLayerName(item)}
                                    className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors"
                                    title="Chỉnh sửa tên lớp bản đồ"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (matchedVillage) {
                                      syncToggleVillage(matchedVillage.name, true);
                                    } else {
                                      handleFlyToKmzLayer(item);
                                    }
                                  }}
                                  className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors"
                                  title={`Phóng bản đồ tới vị trí lớp ${item.label}`}
                                >
                                  <Crosshair className="w-3 h-3" />
                                </button>
                                {isCustom && canEditMap && (
                                  <button
                                    onClick={() => handleDeleteKmzLayer(item)}
                                    className="p-1 rounded bg-white hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition-colors"
                                    title="Xóa lớp bản đồ này khỏi hệ thống"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input file ẩn dùng chung cho tính năng nạp file của các Tab */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".kml,.kmz,.xml,.geojson,.json"
              onChange={handleUploadCustomKml}
              className="hidden"
            />
          </div>
        )}

        {/* THÔNG TIN THÔN/BUÔN NẰM DƯỚI CÙNG KHUNG BẢN ĐỒ KHI NHẤP DẤU TÍCH HOẶC CHỌN TỪ 21 NÚT HOẶC RANH THÔN (ẢNH 1) */}
        {selectedVillageBottomInfo && (
          <div
            ref={villageBottomInfoRef}
            className={`absolute bottom-2.5 z-[540] bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-[#0A4393]/35 p-1.5 sm:p-2 animate-in fade-in slide-in-from-bottom-1 duration-150 select-none transition-all ${
              isVillageSidebarOpen || isFloodScenarioSidebarOpen
                ? 'left-[190px] sm:left-[230px] right-2 sm:right-auto sm:max-w-md'
                : 'left-[56px] sm:left-[60px] right-14 sm:right-auto sm:max-w-md md:max-w-lg'
            }`}
          >
            {/* Tiêu đề thu gọn sát nhau */}
            <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100">
              <div className="flex items-center gap-1 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[11px] sm:text-xs font-black uppercase text-[#0A4393] tracking-tight truncate">
                  📍 {selectedVillageBottomInfo.name}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedVillageBottomInfo.coordinates && leafletMapRef.current) {
                      leafletMapRef.current.flyTo(selectedVillageBottomInfo.coordinates, 15, { duration: 1.0 });
                    }
                  }}
                  className="px-1.5 py-0.5 rounded bg-[#0A4393] hover:bg-[#083576] text-white text-[9.5px] font-bold flex items-center gap-0.5 shadow-2xs transition-colors cursor-pointer"
                  title="Tập trung bản đồ về vị trí này"
                >
                  <Crosshair className="w-2.5 h-2.5" />
                  <span>Tâm điểm</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVillageBottomInfo(null)}
                  className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Đóng bảng thông tin"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Các thông số câu chữ thu gọn, nằm sát nhau */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1 text-[10px] sm:text-[10.5px] font-sans leading-tight">
              <span className="inline-flex items-center gap-0.5 text-slate-700">
                <span className="text-blue-700 font-semibold">Độ cao:</span>
                <b className="font-mono text-[#0A4393]">+{selectedVillageBottomInfo.elevation.toFixed(1)}m</b>
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-0.5 text-slate-700">
                <span className="text-amber-800 font-semibold">Ảnh hưởng:</span>
                <b className="font-mono text-amber-900">{selectedVillageBottomInfo.affectedHouseholds} hộ</b>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-0.5 text-slate-700 min-w-0 max-w-full">
                <span className="text-emerald-800 font-semibold shrink-0">Sơ tán:</span>
                <span className="text-emerald-950 font-bold truncate max-w-[160px] sm:max-w-[220px]" title={selectedVillageBottomInfo.evacuationPoint}>
                  {selectedVillageBottomInfo.evacuationPoint}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
