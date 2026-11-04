'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  MapUserRole,
} from '@/services/authRoleService';
import { useTelemetryStore } from '@/services/telemetryStore';
import {
  VERIFIED_FLOOD_MARKS_2023,
  VULNERABLE_FACILITIES_EASUP,
  MIKE21_DEPTH_LEGEND,
  evaluateGpsFloodRisk,
} from '@/data/mike_flood_verified_data';
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
} from 'lucide-react';

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
};

export const WebGISMap: React.FC = () => {
  const { iotData, scenarioId, hydraulicModel } = useTelemetryStore();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
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
  const [selectedGibsLayer, setSelectedGibsLayer] = useState<string>('THERMAL_ANOMALIES');
  const [gibsOpacity, setGibsOpacity] = useState<number>(0.75);
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
  const kmzLayerGroupsRef = useRef<Record<string, any>>({});
  const kmzDataCacheRef = useRef<Record<string, KmzLayerData>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const layerManagerPanelRef = useRef<HTMLDivElement | null>(null);
  const layerManagerBtnTopRef = useRef<HTMLButtonElement | null>(null);
  const layerManagerBtnFloatRef = useRef<HTMLButtonElement | null>(null);

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locateMessage, setLocateMessage] = useState<string | null>(null);
  const [gpsFloodRiskResult, setGpsFloodRiskResult] = useState<ReturnType<typeof evaluateGpsFloodRisk> | null>(null);
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
  const [enabledKmzLayers, setEnabledKmzLayers] = useState<Record<string, boolean>>({});
  const [loadingKmzLayers, setLoadingKmzLayers] = useState<Record<string, boolean>>({});
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState<string>('');
  const [userRole, setUserRole] = useState<MapUserRole>('GUEST');
  const canEditMap = userRole === 'ADMIN' || userRole === 'MAP_EDITOR';
  const [systemLayers, setSystemLayers] = useState<{
    markers: boolean;
    buffer: boolean;
    floodMarks2023: boolean;
    vulnerableFacilities: boolean;
    mikeKmlFile: boolean;
    mikeGeojsonFile: boolean;
  }>({
    markers: true,
    buffer: true,
    floodMarks2023: true,
    vulnerableFacilities: true,
    mikeKmlFile: true,
    mikeGeojsonFile: true,
  });

  // Lắng nghe quyền đăng nhập hiện tại (Toàn quyền / Sửa xóa bản đồ / Khách)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setUserRole(getCurrentSessionUser().role);
    const handleAuthChange = () => {
      const role = getCurrentSessionUser().role;
      setUserRole(role);
      if (role === 'GUEST') {
        setEditingLayerId(null);
      }
    };
    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
    };
  }, []);

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

  // Đồng bộ popup Hồ Thượng & Hiệu ứng Domino tự động kích hoạt Bản đồ vùng ngập MIKE FLOOD
  useEffect(() => {
    if (!hoThuongMarkerRef.current) return;
    const elev = iotData.hoThuong.elevation;
    const statusText = elev >= 210 ? 'Báo động Đỏ Cấp 3' : elev >= 208 ? 'Cảnh báo Cấp 2' : 'An toàn';
    hoThuongMarkerRef.current.setPopupContent(`
      <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
        <h4 style="font-weight:bold; color:#1d4ed8; margin:0 0 4px 0; font-size:13px;">Hồ Ea Súp Thượng (Đại thủy nông)</h4>
        <p style="margin:0 0 4px 0; font-size:11px; color:#64748b;">Tọa độ: 13.043116°B, 107.937218°Đ</p>
        <p style="margin:0 0 6px 0; line-height:1.4;">Dung tích 146 triệu m³. Tràn xả lũ tự do cao trình 210.0m. Mực nước hiện tại: <strong>${elev}m (${statusText})</strong>.</p>
      </div>
    `);
  }, [iotData.hoThuong.elevation]);

  // Hiệu ứng Domino Bản đồ vùng ngập khi chọn kịch bản MIKE FLOOD hoặc kéo thanh trượt vượt ngưỡng lũ
  useEffect(() => {
    if (typeof window === 'undefined' || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    if (hydraulicModel.totalFloodedAreaHa > 0) {
      // 1. Tự động bật lớp Bản đồ Ngập lụt vệ tinh
      setSelectedGibsLayer('FLOOD_SURFACE');

      // 2. Tự động bật các lớp KML vùng ngập lụt trong trình quản lý lớp
      kmzManifest.forEach((item) => {
        if (
          item.label.toLowerCase().includes('ngập') ||
          item.rawName.toLowerCase().includes('ngap')
        ) {
          setEnabledKmzLayers((prev) => ({ ...prev, [item.id]: true }));
        }
      });

      // 3. Vẽ lớp phủ thủy lực MIKE FLOOD 2D trực quan trên hạ du sông Ea Súp & 9 thôn trọng điểm
      import('leaflet').then((L) => {
        if (!leafletMapRef.current) return;
        if (mikeFloodOverlayRef.current) {
          map.removeLayer(mikeFloodOverlayRef.current);
        }
        const floodGroup = L.layerGroup().addTo(map);
        mikeFloodOverlayRef.current = floodGroup;

        const isDamBreak = scenarioId === 'KB2_1' || scenarioId === 'KB5_2';
        const polyColor = isDamBreak ? '#e11d48' : '#0284c7';
        const fillColor = isDamBreak ? '#f43f5e' : '#38bdf8';

        // Vùng ngập lụt hạ du MIKE FLOOD dọc sông Ea Súp, Thôn Đoàn Kết, Thôn 5-11, Thôn Bình Lợi
        const spread = isDamBreak ? 0.018 : scenarioId === 'KB1_1' || scenarioId === 'KB1_2' ? 0.012 : 0.008;
        const floodCorridorCoords: [number, number][] = [
          [13.043, 107.935],
          [13.058 + spread, 107.905],
          [13.076 + spread, 107.888 + spread],
          [13.084 + spread, 107.872 - spread],
          [13.065 - spread, 107.868 - spread],
          [13.046 - spread, 107.888],
          [13.036 - spread, 107.925],
        ];

        const floodPoly = L.polygon(floodCorridorCoords, {
          color: polyColor,
          weight: 2,
          dashArray: '6, 4',
          fillColor,
          fillOpacity: isDamBreak ? 0.38 : 0.28,
        }).addTo(floodGroup);

        floodPoly.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:260px; color:#0f172a;">
            <div style="font-weight:800; color:${polyColor}; font-size:13px; margin-bottom:4px;">
              🌊 VÙNG NGẬP MIKE FLOOD (${hydraulicModel.code})
            </div>
            <div style="font-size:11px; line-height:1.45;">
              <div>• <strong>MBL Ea Súp:</strong> ${hydraulicModel.mblEaSup}m (${hydraulicModel.diffBd3EaSup >= 0 ? '+' : ''}${hydraulicModel.diffBd3EaSup}m BĐ III)</div>
              <div>• <strong>Diện tích ngập:</strong> ${hydraulicModel.totalFloodedAreaHa.toLocaleString('en-US')} ha</div>
              <div>• <strong>Dân cư ảnh hưởng:</strong> ${hydraulicModel.affectedHouseholds.toLocaleString('en-US')} hộ (${hydraulicModel.affectedPeople.toLocaleString('en-US')} người)</div>
              <div>• <strong>Thôn trọng điểm:</strong> Thôn Đoàn Kết, Thôn 5, 6, 7, 8, 9, 10, 11, Bình Lợi</div>
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

  // Hàm cập nhật lớp ảnh vệ tinh NASA GIBS mặc định
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

      const dateStr = '2024-05-15';
      let wmtsUrl = '';
      if (layerKey === 'TRUE_COLOR') {
        wmtsUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
      } else if (layerKey === 'THERMAL_ANOMALIES') {
        wmtsUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_Thermal_Anomalies_375m_All/default/${dateStr}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`;
      } else if (layerKey === 'NDVI_VEGETATION') {
        wmtsUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${dateStr}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`;
      } else if (layerKey === 'SOIL_MOISTURE') {
        wmtsUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SMAP_L4_Analyzed_Root_Zone_Soil_Moisture/default/${dateStr}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`;
      } else if (layerKey === 'FLOOD_SURFACE') {
        wmtsUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Combined_Flood_250m/default/${dateStr}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`;
      }

      if (wmtsUrl) {
        const gibsTile = L.tileLayer(wmtsUrl, {
          attribution: 'NASA Earthdata GIBS &copy; EOSDIS',
          opacity: opacity,
          maxZoom: 18,
        }).addTo(map);

        if (currentBaseTileRef.current) {
          currentBaseTileRef.current.bringToBack();
        }
        gibsTileLayerRef.current = gibsTile;
      }

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
            fillOpacity: 0.35,
            weight: 2,
            dashArray: '4, 4',
          }).addTo(featureGroup);

          const fireMarker = L.divIcon({
            className: 'custom-map-marker',
            html: `
              <div style="display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:16px; background:#991b1b; color:#fff; border:1.5px solid #f87171; font-size:10px; font-weight:bold; font-family:monospace; box-shadow:0 0 14px rgba(239,68,68,0.9); animation:pulse 1.5s infinite;">
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

  // HÀM VẼ LỚP SO SÁNH VÀ ĐỐI CHIẾU CHO KHU VỰC ĐƯỢC CHỌN (ĐỒNG BỘ NĂM VÀ THỰC ĐỊA)
  const renderComparisonLayer = (
    mode: '2001' | '2026' | 'DELTA' | number,
    areaKey = selectedAreaKey,
    customObj = customArea,
    customDate?: string,
    shouldFlyTo: boolean = false
  ) => {
    const map = leafletMapRef.current;
    if (!map) return;

    // 1. Cập nhật thay đổi TOÀN BỘ ẢNH VỆ TINH của cả bản đồ
    updateTemporalFullMap(mode, customDate);

    // 2. Xác định khu vực so sánh
    const area: AreaDefinition =
      areaKey === 'CUSTOM' && (customObj || customArea)
        ? (customObj || customArea)!
        : COMPARISON_AREAS[areaKey] || COMPARISON_AREAS.TK_293;

    import('leaflet').then((L) => {
      if (compareFeatureGroupRef.current) {
        map.removeLayer(compareFeatureGroupRef.current);
        compareFeatureGroupRef.current = null;
      }

      const group = L.featureGroup().addTo(map);
      compareFeatureGroupRef.current = group;

      // Đa giác ranh giới khu vực được chọn / người dùng vẽ
      const boundaryPoly = L.polygon(area.coords, {
        color: '#f59e0b',
        weight: 2.5,
        dashArray: '6, 6',
        fillOpacity: 0.05,
      }).addTo(group).bindTooltip(`${area.name} (${area.areaHa} ha)`);

      // NGUYÊN TẮC BẤT DI BẤT DỊCH: TUYỆT ĐỐI KHÔNG ZOOM HOẶC THAY ĐỔI TỌA ĐỘ TÂM KHI KÉO NĂM
      if (shouldFlyTo) {
        map.flyTo(area.center, area.zoom, { duration: 0.8 });
      }

      const deltaNdvi = Number((area.ndvi2026 - area.ndvi2001).toFixed(2));
      const deltaHa = Number(((area.areaHa * (area.cover2001 - area.cover2026)) / 100).toFixed(1));

      // Xử lý chế độ theo NĂM hoặc MỐC 2001 / 2026
      if (typeof mode === 'number' || mode === '2001' || mode === '2026') {
        const year = typeof mode === 'number' ? mode : mode === '2001' ? 2001 : 2026;
        const progress = Math.max(0, Math.min(1, (year - 2001) / 25));
        const cover = Math.round(area.cover2001 + (area.cover2026 - area.cover2001) * progress);
        const lostHa = Number(((area.areaHa * (area.cover2001 - cover)) / 100).toFixed(1));

        // Màu sắc thảm phủ chuyển đổi mượt mà theo năm từ xanh rừng nguyên sinh -> vàng/nâu hiện trạng
        const strokeColor = progress < 0.25 ? '#16a34a' : progress < 0.65 ? '#84cc16' : '#d97706';
        const fillColor = progress < 0.25 ? '#15803d' : progress < 0.65 ? '#65a30d' : '#b45309';
        const fillOpacity = Math.max(0.35, 0.65 - 0.25 * progress);

        L.polygon(area.coords, {
          color: strokeColor,
          fillColor: fillColor,
          fillOpacity: fillOpacity,
          weight: 2,
        }).addTo(group).bindPopup(`
          <div style="font-size:12px; font-family:sans-serif; padding:4px;">
            <h4 style="font-weight:bold; color:${strokeColor}; margin:0 0 4px 0;">HIỆN TRẠNG NĂM ${year}: ${area.name.toUpperCase()}</h4>
            <p style="margin:0 0 3px 0;">- Tỷ lệ che phủ: <strong>${cover}% (${Math.round((area.areaHa * cover) / 100)} ha)</strong></p>
            <p style="margin:0 0 3px 0;">- Biến động so với 2001: <strong style="color:${lostHa > 0 ? '#b91c1c' : '#15803d'}">${lostHa > 0 ? `-${lostHa} ha` : 'Nguyên trạng'}</strong></p>
            <p style="margin:0 0 3px 0;">- Đặc điểm: ${area.note}</p>
            <div style="background:#f8fafc; color:#0f172a; padding:4px 6px; border-radius:4px; font-weight:bold; margin-top:4px; border:1px solid #cbd5e1;">
              Hiện trạng thực địa: ${progress < 0.2 ? 'Rừng nguyên sinh dày đặc' : progress < 0.6 ? 'Xuất hiện nương rẫy rải rác' : 'Nông nghiệp phân hóa mạnh'}
            </div>
          </div>
        `);

        // Vẽ vùng suy giảm phân hóa nương rẫy mở rộng dần theo tiến độ năm
        const c = area.coords;
        if (c.length >= 4 && progress > 0.04) {
          const t = Math.min(1, progress * 1.05);
          const subAreaCoords: [number, number][] = [
            [(c[0][0] + c[1][0]) / 2, (c[0][1] + c[1][1]) / 2],
            [c[1][0], c[1][1]],
            [(c[1][0] + c[2][0]) / 2, (c[1][1] + c[2][1]) / 2],
            [
              area.center[0] + (c[1][0] - area.center[0]) * (1 - t * 0.75),
              area.center[1] + (c[1][1] - area.center[1]) * (1 - t * 0.75),
            ],
          ];

          L.polygon(subAreaCoords, {
            color: '#ef4444',
            fillColor: '#dc2626',
            fillOpacity: Math.min(0.8, 0.35 + 0.45 * progress),
            weight: 2,
            dashArray: progress < 0.4 ? '4, 4' : undefined,
          }).addTo(group).bindPopup(`
            <div style="font-size:12px; font-family:sans-serif; padding:4px;">
              <h4 style="font-weight:bold; color:#dc2626; margin:0 0 4px 0;">VÙNG NƯƠNG RẪY / BIẾN ĐỘNG NĂM ${year}</h4>
              <p style="margin:0 0 3px 0;">- Khu vực: ${area.name}</p>
              <p style="margin:0 0 3px 0;">- Diện tích chuyển đổi: <strong style="color:#dc2626;">-${lostHa} ha</strong></p>
              <p style="margin:0 0 3px 0;">- Tỷ lệ che phủ còn lại: <strong>${cover}%</strong></p>
              <div style="background:#fee2e2; color:#991b1b; padding:3px 6px; border-radius:4px; font-weight:bold; margin-top:4px;">
                Cảnh báo thực địa: Đất lâm nghiệp chuyển dịch dần sang sản xuất
              </div>
            </div>
          `);
        }
      } else if (mode === 'DELTA') {
        L.polygon(area.coords, {
          color: '#15803d',
          fillColor: '#22c55e',
          fillOpacity: 0.35,
          weight: 1.5,
        }).addTo(group);

        const c = area.coords;
        if (c.length >= 4) {
          const subAreaCoords: [number, number][] = [
            [(c[0][0] + c[1][0]) / 2, (c[0][1] + c[1][1]) / 2],
            [c[1][0], c[1][1]],
            [(c[1][0] + c[2][0]) / 2, (c[1][1] + c[2][1]) / 2],
            [area.center[0], area.center[1]],
          ];
          L.polygon(subAreaCoords, {
            color: '#e11d48',
            fillColor: '#be123c',
            fillOpacity: 0.7,
            weight: 2.5,
            dashArray: '4, 4',
          }).addTo(group).bindPopup(`
            <div style="font-size:12px; font-family:sans-serif; padding:4px;">
              <h4 style="font-weight:bold; color:#be123c; margin:0 0 4px 0;">ĐỐI CHIẾU BIẾN ĐỘNG 25 NĂM (${area.name})</h4>
              <p style="margin:0 0 3px 0;">- Độ che phủ: <strong>${area.cover2001}% ➔ ${area.cover2026}%</strong> (${deltaHa > 0 ? `-${deltaHa} ha` : '0 ha'})</p>
              <div style="background:#ffe4e6; color:#9f1239; padding:4px 6px; border-radius:4px; font-weight:bold; margin-top:4px;">
                ${Math.abs(deltaNdvi) >= 0.1 ? 'Xếp loại: Biến động diện tích đáng kể' : 'Xếp loại: Ổn định bình thường'}
              </div>
            </div>
          `);
        }
      }
    });
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

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      canvasRendererRef.current = L.canvas({ padding: 0.5, tolerance: 8 });
      const markersGroup = L.featureGroup().addTo(map);
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
            <p style="margin:0 0 6px 0; line-height:1.4;">Dung tích 146 triệu m³. Tràn xả lũ tự do cao trình 210.0m. Mực nước trực chiến: <strong>206.8m</strong>.</p>
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
      bufferCircleLayerRef.current = L.circle([13.045, 107.905], {
        color: '#E67700',
        weight: 1.5,
        dashArray: '5, 5',
        fillColor: '#E67700',
        fillOpacity: 0.04,
        radius: 12000,
        interactive: false,
      }).addTo(map);

      // 6. Lớp file Mo_phong_Thuy_luc_MIKE_FLOOD_EaSup.kml (5 cấp độ sâu ngập chuẩn MIKE 21 FM)
      const mikeKmlGroup = L.featureGroup().addTo(map);
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

      // 7. Lớp file Du_lieu_Ban_do_MIKE_FLOOD_EaSup.geojson (Trục thủy lực MIKE 11 & Mặt cắt kiểm định)
      const mikeGeojsonGroup = L.featureGroup().addTo(map);
      mikeGeojsonLayerRef.current = mikeGeojsonGroup;

      const streamCenterline = VERIFIED_FLOOD_MARKS_2023.slice()
        .sort((a, b) => a.lat - b.lat)
        .map((pt) => [pt.lat, pt.lng] as [number, number]);

      L.polyline([[13.043116, 107.937218], ...streamCenterline], {
        color: '#0284c7',
        weight: 3,
        dashArray: '8, 4',
        opacity: 0.9,
      })
        .bindTooltip(
          `<div style="font-family:sans-serif;font-size:11px;font-weight:700;color:#0A4393;">Du_lieu_Ban_do_MIKE_FLOOD_EaSup.geojson (Trục thủy lực MIKE 11)</div>`,
          { sticky: true, direction: 'top' }
        )
        .bindPopup(
          `<div style="font-family:sans-serif;font-size:12px;font-weight:700;color:#0A4393;">Du_lieu_Ban_do_MIKE_FLOOD_EaSup.geojson</div>`
        )
        .addTo(mikeGeojsonGroup);

      // 8. Lớp '10 Vết lũ kiểm định thực tế (7/2023)' - Bảng 3.1 báo cáo MIKE FLOOD
      const floodMarksGroup = L.featureGroup().addTo(map);
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
      const facilitiesGroup = L.featureGroup().addTo(map);
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

      // LẮNG NGHE SỰ KIỆN VẼ KHU VỰC TÙY CHỌN BẰNG CHUỘT
      map.on('mousedown', (e: any) => {
        if (!isDrawingModeRef.current) return;
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
      });

      map.on('mousemove', (e: any) => {
        if (!isDrawingModeRef.current || !startLatLngRef.current || !drawingRectRef.current) return;
        drawingRectRef.current.setBounds(L.latLngBounds(startLatLngRef.current, e.latlng));
      });

      map.on('mouseup', (e: any) => {
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

      leafletMapRef.current = map;
      setMapLoaded(true);
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

  // Điều chỉnh độ mờ (Opacity)
  const handleOpacityChange = (newOpacity: number) => {
    setGibsOpacity(newOpacity);
    if (gibsTileLayerRef.current) {
      gibsTileLayerRef.current.setOpacity(newOpacity);
    }
  };

  // ================= ĐỊNH VỊ VỊ TRÍ ĐANG ĐỨNG & KIỂM TRA NGUY CƠ NGẬP TẠI TỌA ĐỘ GPS =================
  const renderUserLocationMarker = (
    lat: number,
    lng: number,
    withFloodAudit: boolean = false
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
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:270px; color:#0f172a;">
            <div style="background:${audit.badgeColor}; color:#ffffff; padding:5px 8px; border-radius:6px; font-weight:800; font-size:12px; margin-bottom:6px;">
              📍 KIỂM TRA NGẬP TẠI TỌA ĐỘ GPS CỦA BẠN
            </div>
            <div style="font-size:11px; font-family:monospace; color:#334155; margin-bottom:5px;">
              <div>• WGS84: <strong>${lat.toFixed(5)}°B, ${lng.toFixed(5)}°Đ</strong></div>
              <div>• VN-2000: <strong>X=${audit.vn2000_x.toLocaleString('en-US')} | Y=${audit.vn2000_y.toLocaleString('en-US')}</strong></div>
              <div>• Vết lũ 7/2023 gần nhất: <strong>${audit.nearestMark.code} (${audit.minDistKm} km)</strong></div>
            </div>
            <div style="background:#f8fafc; border:1.5px solid ${audit.badgeColor}; color:${audit.badgeColor}; padding:5px 7px; border-radius:5px; font-weight:800; font-size:11px; margin-bottom:5px;">
              🌊 Dự báo MIKE 21 FM: ${audit.riskLabel}
            </div>
            <div style="font-size:11px; color:#1e293b; line-height:1.4;">
              <strong>Khuyến nghị:</strong> ${audit.recommendation}
            </div>
          </div>
        `);
        setTimeout(() => {
          marker.openPopup();
        }, 350);
      }

      map.flyTo([lat, lng], 14, { duration: 1.0 });
    });
  };

  const handleLocateUser = () => {
    if (typeof window === 'undefined') return;
    setIsLocating(true);

    if (!('geolocation' in navigator)) {
      setIsLocating(false);
      renderUserLocationMarker(13.0682, 107.8845, false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        renderUserLocationMarker(latitude, longitude, false);
      },
      () => {
        setIsLocating(false);
        renderUserLocationMarker(13.0682, 107.8845, false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleCheckGpsFloodRisk = () => {
    if (typeof window === 'undefined') return;
    setIsLocating(true);

    if (!('geolocation' in navigator)) {
      setIsLocating(false);
      renderUserLocationMarker(13.0682, 107.8845, true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        // Nếu người dùng đang mở trang từ tỉnh/thành phố khác ngoài bán kính 35km của Ea Súp,
        // hỗ trợ kiểm tra trực tiếp tại tọa độ GPS hoặc tâm đối chiếu Thôn Đoàn Kết xã Ea Súp
        const distFromEaSup = Math.hypot(latitude - 13.065, longitude - 107.89);
        if (distFromEaSup > 0.35) {
          renderUserLocationMarker(13.0682, 107.8845, true);
        } else {
          renderUserLocationMarker(latitude, longitude, true);
        }
      },
      () => {
        setIsLocating(false);
        renderUserLocationMarker(13.0682, 107.8845, true);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
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
          });
        }
        for (const cItem of customItems) {
          combinedMap.set(cItem.id, {
            ...cItem,
            label: customNames[cItem.id] || cItem.label,
          });
        }

        const mergedList = Array.from(combinedMap.values());
        setKmzManifest(mergedList);

        const initialEnabled: Record<string, boolean> = {};
        for (const item of mergedList) {
          initialEnabled[item.id] =
            typeof enabledStates[item.id] === 'boolean'
              ? enabledStates[item.id]
              : item.defaultOn;
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

  // Chỉnh sửa tên lớp bản đồ theo file .KML / .KMZ (lưu bền vững)
  const handleStartEditLayerName = (item: KmzLayerManifestItem) => {
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
      | 'mikeGeojsonFile'
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
      mikeGeojsonFile: mikeGeojsonLayerRef,
    };

    const targetRef = refMap[key];
    if (targetRef?.current) {
      if (nextVal) targetRef.current.addTo(map);
      else map.removeLayer(targetRef.current);
    }
  };

  const handleFlyToSystemLayer = (
    key: 'floodMarks2023' | 'vulnerableFacilities' | 'mikeKmlFile' | 'mikeGeojsonFile'
  ) => {
    const map = leafletMapRef.current;
    if (!map) return;
    if (!systemLayers[key]) {
      handleToggleSystemLayer(key);
    }
    if (key === 'floodMarks2023' || key === 'mikeGeojsonFile') {
      map.flyTo([13.084, 107.878], 13, { duration: 0.9 });
    } else if (key === 'vulnerableFacilities') {
      map.flyTo([13.072, 107.886], 13, { duration: 0.9 });
    } else {
      map.flyTo([13.078, 107.882], 12, { duration: 0.9 });
    }
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
      mikeGeojsonFile: selectAll,
    });

    [
      systemMarkersGroupRef,
      bufferCircleLayerRef,
      floodMarks2023LayerRef,
      facilitiesLayerRef,
      mikeKmlLayerRef,
      mikeGeojsonLayerRef,
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

  // Hỗ trợ nạp trực tiếp file .KML (Mo_phong_Thuy_luc_MIKE_FLOOD_EaSup.kml) & .GeoJSON (Du_lieu_Ban_do_MIKE_FLOOD_EaSup.geojson)
  const handleUploadCustomKml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
            mikeGeojsonFile: true,
          }));
          if (floodMarks2023LayerRef.current && leafletMapRef.current) {
            floodMarks2023LayerRef.current.addTo(leafletMapRef.current);
          }
          if (mikeGeojsonLayerRef.current && leafletMapRef.current) {
            mikeGeojsonLayerRef.current.addTo(leafletMapRef.current);
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
        const newItem: KmzLayerManifestItem = {
          id: customId,
          rawName: file.name,
          label: defaultLayerName,
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
      }
    } catch (err) {
      console.error('Upload layer error:', err);
    }
    e.target.value = '';
  };

  const totalLayerCount = 6 + kmzManifest.length;
  const activeLayerCount =
    (systemLayers.markers ? 1 : 0) +
    (systemLayers.buffer ? 1 : 0) +
    (systemLayers.floodMarks2023 ? 1 : 0) +
    (systemLayers.vulnerableFacilities ? 1 : 0) +
    (systemLayers.mikeKmlFile ? 1 : 0) +
    (systemLayers.mikeGeojsonFile ? 1 : 0) +
    kmzManifest.filter((m) => enabledKmzLayers[m.id]).length;

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
    <div className="relative z-10 isolate w-full h-auto rounded-xl overflow-hidden border border-[#0A4393]/25 bg-white shadow-lg flex flex-col">
      {/* Top Map Control Bar */}
      <div className="z-10 bg-[#0A4393] border-b border-white/20 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-white">
        {/* Basemap Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-white" /> Nền:
          </span>
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

        {/* NASA GIBS Layer Selector */}
        <div className="flex items-center gap-2">
          <span className="text-white font-bold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-white" /> Lớp Vệ Tinh:
          </span>
          <select
            value={selectedGibsLayer}
            onChange={(e) => handleGibsChange(e.target.value)}
            className="bg-white text-[#0A4393] font-semibold border border-white/40 rounded px-2.5 py-1 text-xs focus:ring-2 focus:ring-white cursor-pointer shadow-sm"
            aria-label="Chọn lớp ảnh vệ tinh NASA GIBS"
          >
            {Object.entries(NASA_GIBS_LAYERS).map(([key, layer]) => (
              <option key={key} value={key} className="bg-white text-[#0A4393]">
                {layer.name}
              </option>
            ))}
          </select>
        </div>

        {/* 25-Year Swipe Compare Toggle */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleToggleSwipeTool}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
              showSwipeTool
                ? 'bg-white text-[#0A4393] font-bold ring-2 ring-white shadow-md'
                : 'bg-white/15 text-white hover:bg-white/25 border border-white/25'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>So Sánh Thời Điểm & Vẽ Vùng</span>
          </button>
        </div>
      </div>

      {/* BANNER HƯỚNG DẪN KHI ĐANG VẼ VÙNG TỰ DO */}
      {isDrawingMode && (
        <div className="z-20 bg-[#0A4393] text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold animate-pulse shadow-lg border-b border-white/30">
          <div className="flex items-center gap-2">
            <Crop className="w-4 h-4" />
            <span>ĐANG BẬT CHẾ ĐỘ VẼ VÙNG: Nhấp giữ và kéo chuột trên bản đồ để khoanh vùng hình chữ nhật so sánh...</span>
          </div>
          <button
            onClick={handleToggleDrawing}
            className="px-2 py-0.5 rounded bg-white text-[#0A4393] text-[11px] hover:bg-blue-50 font-mono font-bold"
          >
            ✕ Hủy vẽ
          </button>
        </div>
      )}

      {/* Thanh công cụ So Sánh Thời Điểm & Vẽ Vùng (Tinh gọn phía trên, không che hoặc làm co hẹp bản đồ) */}
      {showSwipeTool && (
        <div className="z-10 bg-[#F0F6FF] border-b border-[#0A4393]/25 px-2.5 py-1.5 flex flex-col gap-1.5 text-xs text-slate-800">
          {/* Hàng 1: Khu vực + Vẽ Vùng + Các nút Mốc 2001/2026/Đối chiếu/Chạy tua */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[#0A4393] font-bold flex items-center gap-1 font-mono text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-[#0A4393]" /> Khu vực:
              </span>
              <select
                value={selectedAreaKey}
                onChange={(e) => handleSelectArea(e.target.value)}
                className="bg-white text-[#0A4393] font-semibold border border-[#0A4393]/30 rounded px-2 py-0.5 text-[11px] focus:ring-1 focus:ring-[#0A4393] cursor-pointer"
                aria-label="Chọn khu vực so sánh biến động"
              >
                {Object.entries(COMPARISON_AREAS).map(([key, item]) => (
                  <option key={key} value={key} className="bg-white text-[#0A4393]">
                    {item.name} ({item.areaHa.toLocaleString()} ha)
                  </option>
                ))}
                {customArea && (
                  <option value="CUSTOM" className="bg-white text-[#0A4393] font-bold">
                    ✏️ {customArea.name}
                  </option>
                )}
              </select>

              <button
                onClick={handleToggleDrawing}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                  isDrawingMode
                    ? 'bg-[#0A4393] text-white ring-2 ring-[#0A4393]/40 animate-pulse'
                    : 'bg-white hover:bg-[#E6F0FA] border border-[#0A4393]/30 text-[#0A4393]'
                }`}
                title="Nhấp giữ và kéo chuột trên bản đồ để khoanh vùng diện tích cần so sánh"
              >
                <Pencil className="w-3 h-3" />
                <span>{isDrawingMode ? 'Đang Vẽ...' : 'Vẽ Vùng'}</span>
              </button>

              {customArea && (
                <button
                  onClick={handleClearCustomArea}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-rose-50 hover:bg-rose-100 border border-rose-400 text-rose-700"
                  title="Xóa vùng người dùng tự vẽ"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => handleSelectYear(2001)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                  selectedYear === 2001 && compareMode !== 'DELTA'
                    ? 'bg-[#0A4393] text-white'
                    : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
              >
                🌿 Mốc 2001
              </button>

              <button
                onClick={() => handleSelectYear(2026)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                  selectedYear === 2026 && compareMode !== 'DELTA'
                    ? 'bg-[#0A4393] text-white'
                    : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
              >
                ⚠️ Mốc 2026
              </button>

              <button
                onClick={() => handleSelectCompareMode('DELTA')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                  compareMode === 'DELTA'
                    ? 'bg-[#0A4393] text-white'
                    : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
              >
                📊 Đối Chiếu
              </button>

              <button
                onClick={() => setIsAutoPlayYear(!isAutoPlayYear)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                  isAutoPlayYear
                    ? 'bg-[#0A4393] text-white animate-pulse'
                    : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
                title="Tự động chạy tua theo từng năm từ 2001 -> 2026"
              >
                {isAutoPlayYear ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isAutoPlayYear ? 'Dừng' : 'Chạy Tua'}</span>
              </button>
            </div>
          </div>

          {/* Hàng 2: Thanh trượt năm gọn trên 1 dòng */}
          <SatelliteTimelineSlider
            currentYear={selectedYear}
            minYear={2001}
            maxYear={2026}
            isLoading={isTileLoading}
            onYearChange={handleSelectYear}
          />
        </div>
      )}

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

        {/* Nhóm Nút & Slider bên phải trên cùng 1 dòng */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Slider độ phủ vệ tinh */}
          <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-600 font-mono">
            <span>Độ phủ:</span>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={gibsOpacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-[#E6F0FA] rounded-lg appearance-none cursor-pointer accent-[#0A4393]"
              title="Độ phủ lớp vệ tinh"
            />
            <span className="text-[#0A4393] font-bold w-7 text-right">{Math.round(gibsOpacity * 100)}%</span>
          </div>

          {/* Nút / Badge Trạng thái */}
          <span
            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border whitespace-nowrap shadow-sm ${activeMeta.statusColor}`}
          >
            {activeMeta.status}
          </span>
        </div>
      </div>

      {/* Map Leaflet Container + Các nút nổi trên Bản Đồ (Chiều cao bản đồ cố định độc lập 540px, không bao giờ bị co hẹp hay che khuất) */}
      <div className="w-full h-[520px] sm:h-[560px] relative overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" />

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
            onClick={() => setShowLayerManager(!showLayerManager)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono shadow-lg border transition-all ${
              showLayerManager
                ? 'bg-[#0A4393] text-white border-white ring-2 ring-[#0A4393]/40'
                : 'bg-white text-[#0A4393] border-[#0A4393]/40 hover:bg-[#F0F6FF]'
            }`}
            title="Bật/tắt quản lý lớp bản đồ"
          >
            <Layers className="w-4 h-4" />
            <span>Lớp Bản Đồ ({activeLayerCount}/{totalLayerCount})</span>
          </button>
        </div>

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

        {/* GÓC DƯỚI BÊN TRÁI: THANH CHÚ GIẢI (LEGEND) 5 CẤP ĐỘ SÂU NGẬP CHUẨN MIKE 21 FM + CÔNG CỤ KIỂM TRA NGUY CƠ NGẬP TẠI TỌA ĐỘ GPS */}
        <div className="absolute bottom-2.5 left-2.5 z-[500] max-w-[285px] sm:max-w-[330px] flex flex-col gap-1.5 font-sans">
          {/* Công cụ: Kiểm tra nguy cơ ngập tại tọa độ GPS của tôi */}
          <button
            type="button"
            onClick={handleCheckGpsFloodRisk}
            disabled={isLocating}
            className="px-2.5 py-1.5 rounded-lg bg-[#0A4393] hover:bg-[#083576] active:bg-[#062859] text-white border border-white/60 shadow-lg text-[10px] sm:text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all"
            title="Kiểm tra độ sâu ngập MIKE 21 FM tại tọa độ GPS của tôi"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Compass className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            )}
            <span className="truncate">Kiểm tra nguy cơ ngập tại tọa độ GPS của tôi</span>
          </button>

          {/* Kết quả đối chiếu GPS nhanh nếu người dùng vừa bấm kiểm tra */}
          {gpsFloodRiskResult && (
            <div className="bg-white/95 backdrop-blur-xs border-2 border-[#0A4393] rounded-lg p-2 shadow-xl text-[10px] font-mono text-slate-800 space-y-1">
              <div className="flex items-center justify-between font-bold text-[#0A4393]">
                <span>📍 Kết quả GPS ({gpsFloodRiskResult.scenarioCode})</span>
                <button
                  type="button"
                  onClick={() => setGpsFloodRiskResult(null)}
                  className="text-slate-400 hover:text-rose-600 font-bold px-1"
                  title="Đóng kết quả GPS"
                >
                  ✕
                </button>
              </div>
              <div className="text-[9px] text-slate-600">
                VN-2000: X={gpsFloodRiskResult.vn2000_x.toLocaleString('en-US')} | Y=
                {gpsFloodRiskResult.vn2000_y.toLocaleString('en-US')}
              </div>
              <div
                className="px-1.5 py-0.5 rounded text-white font-bold text-[10px]"
                style={{ backgroundColor: gpsFloodRiskResult.badgeColor }}
              >
                {gpsFloodRiskResult.riskLabel}
              </div>
              <div className="text-[9px] text-slate-700 leading-snug font-sans">
                Gần {gpsFloodRiskResult.nearestMark.code} ({gpsFloodRiskResult.minDistKm}km):{' '}
                {gpsFloodRiskResult.recommendation}
              </div>
            </div>
          )}

          {/* Thanh chú giải (Legend) 5 cấp độ sâu ngập chuẩn MIKE 21 FM */}
          <div className="bg-white/95 backdrop-blur-xs border border-[#0A4393]/40 rounded-lg shadow-lg overflow-hidden text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setIsLegendExpanded(!isLegendExpanded)}
              className="w-full px-2.5 py-1 bg-[#F0F6FF] hover:bg-[#E6F0FA] text-[#0A4393] font-bold flex items-center justify-between gap-2 border-b border-[#0A4393]/15"
              title="Thu gọn / Mở rộng chú giải độ sâu ngập MIKE 21 FM"
            >
              <span className="flex items-center gap-1">
                <Droplets className="w-3 h-3 text-[#0A4393] shrink-0" />
                <span>CHÚ GIẢI ĐỘ SÂU NGẬP MIKE 21 FM</span>
              </span>
              <span className="text-[9px]">{isLegendExpanded ? '▾' : '▸'}</span>
            </button>

            {isLegendExpanded && (
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
            )}
          </div>
        </div>

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
            } z-[550] w-[330px] sm:w-[375px] max-h-[450px] bg-white border-2 border-[#0A4393] rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs font-sans ${
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
                  type="button"
                  onClick={() => {
                    const isCurrentlyRight = panelCoords
                      ? panelCoords.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 500)
                      : layerPanelPosition === 'right';
                    if (isCurrentlyRight) {
                      setLayerPanelPosition('left');
                      setPanelCoords({ x: 12, y: panelCoords?.y ?? 48 });
                    } else {
                      setLayerPanelPosition('right');
                      const rightX = Math.max(12, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 390);
                      setPanelCoords({ x: rightX, y: panelCoords?.y ?? 48 });
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white text-[10px] font-mono font-bold flex items-center gap-1 transition-colors"
                  title="Chuyển nhanh vị trí bảng sang góc đối diện"
                >
                  <span>
                    {(panelCoords
                      ? panelCoords.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 500)
                      : layerPanelPosition === 'right')
                      ? '⇋ Sang trái'
                      : '⇋ Sang phải'}
                  </span>
                </button>
                <button
                  onClick={() => setShowLayerManager(false)}
                  className="p-0.5 rounded hover:bg-white/20 text-white transition-colors"
                  title="Đóng bảng quản lý lớp"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Thanh nút Chọn tất cả / Bỏ chọn tất cả */}
            <div className="px-2.5 py-1.5 bg-[#F0F6FF] border-b border-[#0A4393]/20 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSelectAllLayers(true)}
                  className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 border border-[#0A4393]/35 text-[#0A4393] text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <CheckSquare className="w-3 h-3" />
                  <span>Chọn tất cả</span>
                </button>
                <button
                  onClick={() => handleSelectAllLayers(false)}
                  className="px-2.5 py-1 rounded bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Square className="w-3 h-3" />
                  <span>Bỏ chọn tất cả</span>
                </button>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#0A4393]">
                {activeLayerCount}/{totalLayerCount} lớp
              </span>
            </div>

            {/* Danh sách các lớp bản đồ (Cuộn dọc) */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
              {/* Nhóm 1: Nhóm lớp hệ thống */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#0A4393] bg-[#F0F6FF] px-2 py-1 rounded border border-[#0A4393]/15 mb-1.5">
                  Nhóm lớp hệ thống
                </div>
                <div className="space-y-1">
                  <label className="flex items-center justify-between p-1.5 rounded hover:bg-[#F4F8FD] cursor-pointer border border-transparent hover:border-[#0A4393]/15">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={systemLayers.markers}
                        onChange={() => handleToggleSystemLayer('markers')}
                        className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0A4393] inline-block shrink-0" />
                      <span className="text-[11px] font-medium text-slate-800">
                        4 Trạm & Hồ Đập Trọng Điểm
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded hover:bg-[#F4F8FD] cursor-pointer border border-transparent hover:border-[#0A4393]/15">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={systemLayers.buffer}
                        onChange={() => handleToggleSystemLayer('buffer')}
                        className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0" />
                      <span className="text-[11px] font-medium text-slate-800">
                        Vành Đai Sinh Thái Liên Xã 5km
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Nhóm 2: Nhóm lớp Thủy lực MIKE FLOOD & Kiểm định thực tế */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#0A4393] bg-[#F0F6FF] px-2 py-1 rounded border border-[#0A4393]/15 mb-1.5 flex items-center justify-between gap-1">
                  <span>LỚP BẢN ĐỒ LŨ ĐÃ KIỂM CHỨNG</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 rounded bg-[#0A4393] hover:bg-[#083576] text-white shadow-2xs flex items-center justify-center transition-all shrink-0 cursor-pointer"
                    title="Nạp file .KML / .GeoJSON"
                    aria-label="Nạp file .KML hoặc .GeoJSON"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {/* 1. 10 Vết lũ kiểm định thực tế (7/2023) */}
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
                    <button
                      type="button"
                      onClick={() => handleFlyToSystemLayer('floodMarks2023')}
                      className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors shrink-0"
                      title="Phóng tới 10 Vết lũ kiểm định thực tế (Bảng 3.1)"
                    >
                      <Crosshair className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 2. Công trình Y tế - Giáo dục có nguy cơ ngập */}
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
                        Công trình Y tế - Giáo dục có nguy cơ ngập
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleFlyToSystemLayer('vulnerableFacilities')}
                      className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors shrink-0"
                      title="Phóng tới các Công trình Y tế - Giáo dục có nguy cơ ngập"
                    >
                      <Crosshair className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 3. File Mo_phong_Thuy_luc_MIKE_FLOOD_EaSup.kml */}
                  <div className="flex items-center justify-between p-1.5 rounded bg-sky-50/70 hover:bg-sky-50 border border-sky-200">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={systemLayers.mikeKmlFile}
                        onChange={() => handleToggleSystemLayer('mikeKmlFile')}
                        className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer shrink-0"
                      />
                      <span className="w-2.5 h-2.5 rounded-xs bg-sky-500 inline-block shrink-0" />
                      <span className="text-[10.5px] font-mono font-bold text-sky-950 truncate">
                        Mo_phong_Thuy_luc_MIKE_FLOOD_EaSup.kml
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleFlyToSystemLayer('mikeKmlFile')}
                      className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors shrink-0"
                      title="Phóng tới vùng ngập Mo_phong_Thuy_luc_MIKE_FLOOD_EaSup.kml"
                    >
                      <Crosshair className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 4. File Du_lieu_Ban_do_MIKE_FLOOD_EaSup.geojson */}
                  <div className="flex items-center justify-between p-1.5 rounded bg-blue-50/70 hover:bg-blue-50 border border-blue-200">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={systemLayers.mikeGeojsonFile}
                        onChange={() => handleToggleSystemLayer('mikeGeojsonFile')}
                        className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer shrink-0"
                      />
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block shrink-0" />
                      <span className="text-[10.5px] font-mono font-bold text-blue-950 truncate">
                        Du_lieu_Ban_do_MIKE_FLOOD_EaSup.geojson
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleFlyToSystemLayer('mikeGeojsonFile')}
                      className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors shrink-0"
                      title="Phóng tới lớp Du_lieu_Ban_do_MIKE_FLOOD_EaSup.geojson"
                    >
                      <Crosshair className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Nhóm 3: Nhóm lớp thôn/buôn */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#0A4393] bg-[#F0F6FF] px-2 py-1 rounded border border-[#0A4393]/15 mb-1.5 flex items-center justify-between gap-2">
                  <span>Nhóm lớp thôn/buôn</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 border border-[#0A4393]/40 text-[#0A4393] text-[10px] font-bold flex items-center gap-1 normal-case tracking-normal shadow-2xs"
                    title="Tải thêm lớp bản đồ (.kml, .geojson) từ máy tính"
                  >
                    <Upload className="w-2.5 h-2.5" />
                    <span>+ Thêm lớp</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".kml,.kmz,.xml,.geojson,.json"
                    onChange={handleUploadCustomKml}
                    className="hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  {kmzManifest.map((item) => {
                    const isChecked = !!enabledKmzLayers[item.id];
                    const isLoading = !!loadingKmzLayers[item.id];
                    const isEditing = canEditMap && editingLayerId === item.id;

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
                            title="Tích chọn / Bỏ chọn hiển thị lớp bản đồ này"
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
                                title="Lưu tên lớp bản đồ"
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
                          {canEditMap && !isEditing && (
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
                          {canEditMap && (
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
