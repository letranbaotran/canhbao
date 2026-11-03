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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
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

  // Refs & State cho Định vị GPS và Quản lý nhiều lớp bản đồ KMZ (ban_ve,_mat_cat.kmz)
  const canvasRendererRef = useRef<any>(null);
  const userLocationLayerRef = useRef<any>(null);
  const systemMarkersGroupRef = useRef<any>(null);
  const bufferCircleLayerRef = useRef<any>(null);
  const kmzLayerGroupsRef = useRef<Record<string, any>>({});
  const kmzDataCacheRef = useRef<Record<string, KmzLayerData>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locateMessage, setLocateMessage] = useState<string | null>(null);
  const [showLayerManager, setShowLayerManager] = useState<boolean>(false);
  const [kmzManifest, setKmzManifest] = useState<KmzLayerManifestItem[]>([]);
  const [enabledKmzLayers, setEnabledKmzLayers] = useState<Record<string, boolean>>({});
  const [loadingKmzLayers, setLoadingKmzLayers] = useState<Record<string, boolean>>({});
  const [systemLayers, setSystemLayers] = useState<{
    markers: boolean;
    buffer: boolean;
    gibs: boolean;
  }>({
    markers: true,
    buffer: true,
    gibs: true,
  });

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

        // Marker thể hiện trực quan trên thực địa theo năm
        const badgeBg = progress < 0.25 ? '#14532d' : progress < 0.65 ? '#78350f' : '#7f1d1d';
        const badgeBorder = progress < 0.25 ? '#22c55e' : progress < 0.65 ? '#f59e0b' : '#ef4444';
        const badgeText = progress < 0.25 ? '#86efac' : progress < 0.65 ? '#fde68a' : '#fca5a5';

        const badgeYear = L.divIcon({
          className: 'custom-map-marker',
          html: `
            <div style="background:${badgeBg}; color:${badgeText}; border:2px solid ${badgeBorder}; padding:4px 10px; border-radius:16px; font-size:11px; font-weight:bold; font-family:monospace; box-shadow:0 4px 12px rgba(0,0,0,0.8); white-space:nowrap;">
              📅 Năm ${year}: ${area.name} (${cover}% che phủ ${lostHa > 0 ? `• Giảm ${lostHa} ha` : '• Nguyên trạng'})
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [120, 15],
        });
        L.marker(area.center, { icon: badgeYear }).addTo(group);
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

        const badgeDelta = L.divIcon({
          className: 'custom-map-marker',
          html: `
            <div style="background:#831843; color:#fbcfe8; border:2px solid #f472b6; padding:4px 10px; border-radius:16px; font-size:11px; font-weight:bold; font-family:monospace; box-shadow:0 0 14px rgba(244,114,182,0.9); white-space:nowrap;">
              📊 ĐỐI CHIẾU 25 NĂM: ${area.name} (${deltaHa > 0 ? `Giảm ${deltaHa} ha` : 'Ổn định'})
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [120, 15],
        });
        L.marker(area.center, { icon: badgeDelta }).addTo(group);
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
      canvasRendererRef.current = L.canvas({ padding: 0.5 });
      const markersGroup = L.featureGroup().addTo(map);
      systemMarkersGroupRef.current = markersGroup;

      // Nạp basemap ban đầu
      const baseTile = L.tileLayer(BASEMAP_TILES.SATELLITE.url, {
        attribution: BASEMAP_TILES.SATELLITE.attribution,
        maxZoom: BASEMAP_TILES.SATELLITE.maxZoom,
      }).addTo(map);
      currentBaseTileRef.current = baseTile;

      const createPillMarker = (
        badgeBg: string,
        badgeBorder: string,
        badgeText: string,
        iconSvg: string
      ) => {
        return L.divIcon({
          className: 'custom-map-marker',
          html: `
            <div style="display:inline-flex; align-items:center; gap:6px; white-space:nowrap; padding:4px 10px; border-radius:20px; font-weight:700; font-size:11px; font-family:monospace; box-shadow:0 4px 12px rgba(0,0,0,0.6); border:1.5px solid ${badgeBorder}; background:${badgeBg}; color:#ffffff; cursor:pointer;">
              <span style="display:inline-flex; align-items:center;">${iconSvg}</span>
              <span style="white-space:nowrap;">${badgeText}</span>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [60, 15],
        });
      };

      // 1. Hồ Ea Súp Hạ
      L.marker([13.05685, 107.894562], {
        icon: createPillMarker('rgba(15, 118, 110, 0.95)', '#5eead4', '💧 Hồ Ea Súp Hạ (Nguồn sinh hoạt)', '💧'),
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

      // 2. Hồ Ea Súp Thượng
      L.marker([13.043116, 107.937218], {
        icon: createPillMarker('rgba(15, 76, 129, 0.95)', '#60a5fa', '🌊 Hồ Ea Súp Thượng (146M m³)', '💧'),
      })
        .addTo(markersGroup)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
            <h4 style="font-weight:bold; color:#1d4ed8; margin:0 0 4px 0; font-size:13px;">Hồ Ea Súp Thượng (Đại thủy nông)</h4>
            <p style="margin:0 0 4px 0; font-size:11px; color:#64748b;">Tọa độ: 13.043116°B, 107.937218°Đ</p>
            <p style="margin:0 0 6px 0; line-height:1.4;">Dung tích 146 triệu m³. Tràn xả lũ tự do cao trình 210.0m. Mực nước hiện tại 206.8m (An toàn).</p>
          </div>
        `);

      // 3. Tiểu khu 293
      L.marker([12.982216, 107.886961], {
        icon: createPillMarker('rgba(27, 77, 62, 0.95)', '#34d399', '🌲 Lâm phần Tiểu khu 293', '🔥'),
      })
        .addTo(markersGroup)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
            <h4 style="font-weight:bold; color:#047857; margin:0 0 4px 0; font-size:13px;">Lâm phần Tiểu Khu 293</h4>
            <p style="margin:0 0 4px 0; font-size:11px; color:#64748b;">Tọa độ: 12.982216°B, 107.886961°Đ</p>
            <p style="margin:0 0 4px 0; line-height:1.4;">Rừng khộp nhạy cảm mùa khô giáp ranh nương rẫy. Trạm IoT LoRaWAN TK-293 đang trực chiến đo nhiệt độ/khói.</p>
          </div>
        `);

      // 4. Hồ Trung Chuyển
      L.marker([13.069298, 107.881527], {
        icon: createPillMarker('rgba(14, 116, 144, 0.95)', '#67e8f9', '🐟 Hồ Trung Chuyển', '🏊'),
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
      }).addTo(map);

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

      updateGibsOverlay('THERMAL_ANOMALIES', 0.75);
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

  // ================= ĐỊNH VỊ VỊ TRÍ ĐANG ĐỨNG (GPS) =================
  const renderUserLocationMarker = (lat: number, lng: number, accuracy: number, isFallback = false) => {
    const map = leafletMapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      if (userLocationLayerRef.current) {
        map.removeLayer(userLocationLayerRef.current);
        userLocationLayerRef.current = null;
      }

      const group = L.featureGroup().addTo(map);
      userLocationLayerRef.current = group;

      // Vòng tròn bán kính sai số GPS
      L.circle([lat, lng], {
        radius: Math.max(accuracy, 35),
        color: '#0A4393',
        weight: 1.5,
        fillColor: '#38bdf8',
        fillOpacity: 0.2,
      }).addTo(group);

      // Marker chấm xanh định vị phát sáng
      const gpsIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:20px; background:#0A4393; color:#ffffff; border:2px solid #ffffff; font-size:11px; font-weight:700; font-family:monospace; box-shadow:0 0 16px rgba(10,67,147,0.95);">
            <span style="width:10px; height:10px; border-radius:50%; background:#38bdf8; border:2px solid #ffffff; display:inline-block; box-shadow:0 0 8px #38bdf8;"></span>
            <span>📍 Vị trí đang đứng</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [70, 15],
      });

      const marker = L.marker([lat, lng], { icon: gpsIcon })
        .addTo(group)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; min-width:210px; color:#0f172a;">
            <h4 style="font-weight:bold; color:#0A4393; margin:0 0 4px 0; font-size:13px;">📍 Vị Trí Định Vị Hiện Tại</h4>
            <p style="margin:0 0 3px 0;">- Vĩ độ: <strong>${lat.toFixed(6)}°B</strong></p>
            <p style="margin:0 0 3px 0;">- Kinh độ: <strong>${lng.toFixed(6)}°Đ</strong></p>
            <p style="margin:0 0 4px 0;">- Độ chính xác: <strong>±${Math.round(accuracy)} m</strong></p>
            <div style="background:#F0F6FF; color:#0A4393; padding:4px 6px; border-radius:4px; font-weight:600; font-size:11px; border:1px solid rgba(10,67,147,0.25);">
              ${isFallback ? 'Tâm điểm hành chính xã Ea Súp (Mô phỏng GPS)' : 'Tín hiệu định vị GPS thiết bị trực tiếp'}
            </div>
          </div>
        `);

      map.flyTo([lat, lng], 15, { duration: 1.0 });
      setTimeout(() => {
        marker.openPopup();
      }, 600);
    });
  };

  const handleLocateUser = () => {
    if (typeof window === 'undefined') return;
    setIsLocating(true);
    setLocateMessage('Đang xác định tọa độ GPS thiết bị...');

    if (!('geolocation' in navigator)) {
      setIsLocating(false);
      renderUserLocationMarker(13.0635, 107.9049, 25, true);
      setLocateMessage('Thiết bị không hỗ trợ GPS, đã định vị tâm xã Ea Súp.');
      setTimeout(() => setLocateMessage(null), 4000);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        renderUserLocationMarker(latitude, longitude, accuracy || 20, false);
        setLocateMessage(`Đã định vị: ${latitude.toFixed(5)}°B, ${longitude.toFixed(5)}°Đ`);
        setTimeout(() => setLocateMessage(null), 4500);
      },
      () => {
        setIsLocating(false);
        // Fallback thông minh về tọa độ trung tâm thực địa Ea Súp nếu trình duyệt chặn quyền GPS
        renderUserLocationMarker(13.0635, 107.9049, 25, true);
        setLocateMessage('Đã định vị tại Trung tâm điều hành xã Ea Súp (13.0635°B, 107.9049°Đ)');
        setTimeout(() => setLocateMessage(null), 4500);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
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
        const res = await fetch(resolveKmzUrl(item.file));
        layerData = await res.json();
        kmzDataCacheRef.current[item.id] = layerData;
      } catch (e) {
        console.error('Failed to load KMZ layer:', item.id, e);
        setLoadingKmzLayers((prev) => ({ ...prev, [item.id]: false }));
        return;
      }
      setLoadingKmzLayers((prev) => ({ ...prev, [item.id]: false }));
    }

    if (!leafletMapRef.current) return;
    const renderer = canvasRendererRef.current || L.canvas({ padding: 0.5 });
    const layerGroup = L.featureGroup();

    const popupHtml = `
      <div style="font-family:sans-serif; font-size:12px; padding:4px; min-width:200px; color:#0f172a;">
        <h4 style="font-weight:bold; color:#0A4393; margin:0 0 4px 0; font-size:13px;">📐 ${layerData.label}</h4>
        <p style="margin:0 0 3px 0;">- Mã lớp KMZ: <strong>${layerData.rawName}</strong></p>
        <p style="margin:0 0 3px 0;">- Phân nhóm: <strong>${layerData.category}</strong></p>
        <p style="margin:0 0 4px 0;">- Số đối tượng: <strong>${layerData.geomCount.toLocaleString()} đối tượng</strong></p>
        <div style="background:#F0F6FF; color:#0A4393; padding:3px 6px; border-radius:4px; font-weight:600; font-size:11px; border:1px solid rgba(10,67,147,0.25);">
          Nguồn: ban_ve,_mat_cat.kmz (Tọa độ chuẩn Ea Súp)
        </div>
      </div>
    `;

    for (const grp of layerData.groups) {
      const strokeColor = item.color || grp.color || '#38bdf8';
      if (grp.lines && grp.lines.length > 0) {
        L.polyline(grp.lines as any, {
          renderer,
          color: strokeColor,
          weight: Math.max(1.8, grp.weight || 1.8),
          opacity: 0.92,
        })
          .bindPopup(popupHtml)
          .addTo(layerGroup);
      }
      if (grp.polys && grp.polys.length > 0) {
        L.polygon(grp.polys as any, {
          renderer,
          color: strokeColor,
          fillColor: grp.fillColor || strokeColor,
          fillOpacity: grp.outline ? 0.35 : 0.55,
          weight: grp.outline ? 1.8 : 1.2,
        })
          .bindPopup(popupHtml)
          .addTo(layerGroup);
      }
    }

    kmzLayerGroupsRef.current[item.id] = layerGroup;
    layerGroup.addTo(map);
  };

  // Tự động nạp manifest.json của file ban_ve,_mat_cat.kmz và hiển thị các lớp mặc định khi bản đồ sẵn sàng
  useEffect(() => {
    if (!mapLoaded) return;
    let isSubscribed = true;

    fetch(resolveKmzUrl('/data/kmz/manifest.json'))
      .then((r) => r.json())
      .then(async (manifestList: KmzLayerManifestItem[]) => {
        if (!isSubscribed || !Array.isArray(manifestList)) return;
        setKmzManifest(manifestList);

        const initialEnabled: Record<string, boolean> = {};
        for (const item of manifestList) {
          initialEnabled[item.id] = item.defaultOn;
        }
        setEnabledKmzLayers(initialEnabled);

        for (const item of manifestList) {
          if (item.defaultOn && isSubscribed) {
            await renderKmzLayerOnMap(item);
          }
        }
      })
      .catch((err) => {
        console.error('Error loading KMZ manifest:', err);
      });

    return () => {
      isSubscribed = false;
    };
  }, [mapLoaded]);

  const handleToggleKmzLayer = async (item: KmzLayerManifestItem) => {
    const map = leafletMapRef.current;
    if (!map) return;

    const nextState = !enabledKmzLayers[item.id];
    setEnabledKmzLayers((prev) => ({ ...prev, [item.id]: nextState }));

    if (nextState) {
      await renderKmzLayerOnMap(item);
    } else {
      const existing = kmzLayerGroupsRef.current[item.id];
      if (existing && map.hasLayer(existing)) {
        map.removeLayer(existing);
      }
    }
  };

  const handleBulkKmzLayers = async (mode: 'ALL' | 'DEFAULT' | 'NONE') => {
    const map = leafletMapRef.current;
    if (!map) return;

    const nextEnabled: Record<string, boolean> = {};
    for (const item of kmzManifest) {
      const shouldEnable =
        mode === 'ALL' ? true : mode === 'DEFAULT' ? item.defaultOn : false;
      nextEnabled[item.id] = shouldEnable;
    }
    setEnabledKmzLayers(nextEnabled);

    for (const item of kmzManifest) {
      if (nextEnabled[item.id]) {
        await renderKmzLayerOnMap(item);
      } else {
        const existing = kmzLayerGroupsRef.current[item.id];
        if (existing && map.hasLayer(existing)) {
          map.removeLayer(existing);
        }
      }
    }
  };

  const handleFlyToKmzLayer = async (item: KmzLayerManifestItem) => {
    const map = leafletMapRef.current;
    if (!map) return;
    if (!enabledKmzLayers[item.id]) {
      setEnabledKmzLayers((prev) => ({ ...prev, [item.id]: true }));
      await renderKmzLayerOnMap(item);
    }
    if (item.bounds && item.bounds.length === 2) {
      map.flyToBounds(item.bounds, { padding: [30, 30], maxZoom: 16, duration: 0.9 });
    }
  };

  const handleFlyToAllKmz = () => {
    const map = leafletMapRef.current;
    if (!map) return;
    // Khung tọa độ trung tâm bản vẽ kênh xây, thủy hệ, mặt cắt xã Ea Súp
    map.flyToBounds(
      [
        [13.023, 107.887],
        [13.085, 107.945],
      ],
      { padding: [25, 25], duration: 0.9 }
    );
  };

  const handleToggleSystemLayer = (key: 'markers' | 'buffer' | 'gibs') => {
    const map = leafletMapRef.current;
    if (!map) return;
    const nextVal = !systemLayers[key];
    setSystemLayers((prev) => ({ ...prev, [key]: nextVal }));

    if (key === 'markers' && systemMarkersGroupRef.current) {
      if (nextVal) systemMarkersGroupRef.current.addTo(map);
      else map.removeLayer(systemMarkersGroupRef.current);
    } else if (key === 'buffer' && bufferCircleLayerRef.current) {
      if (nextVal) bufferCircleLayerRef.current.addTo(map);
      else map.removeLayer(bufferCircleLayerRef.current);
    } else if (key === 'gibs') {
      if (nextVal) {
        updateGibsOverlay(selectedGibsLayer, gibsOpacity);
      } else {
        if (gibsTileLayerRef.current) map.removeLayer(gibsTileLayerRef.current);
        if (gibsFeatureGroupRef.current) map.removeLayer(gibsFeatureGroupRef.current);
      }
    }
  };

  // Cho phép người dùng tải thêm file .KML từ máy tính lồng vào bản đồ
  const handleUploadCustomKml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const coordRegex = /<coordinates>([\s\S]*?)<\/coordinates>/g;
      let m;
      const lines: [number, number][][] = [];
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      while ((m = coordRegex.exec(text)) !== null) {
        const rawPts = m[1].trim().split(/\s+/);
        const pts: [number, number][] = [];
        for (const rp of rawPts) {
          const parts = rp.split(',');
          if (parts.length >= 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              pts.push([lat, lng]);
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
              if (lng < minLng) minLng = lng;
              if (lng > maxLng) maxLng = lng;
            }
          }
        }
        if (pts.length >= 2) lines.push(pts);
      }
      if (lines.length > 0) {
        const customId = `USER_${Date.now()}`;
        const newItem: KmzLayerManifestItem = {
          id: customId,
          rawName: file.name,
          label: `Bản vẽ tải lên: ${file.name}`,
          category: 'Bản vẽ người dùng tải lên',
          defaultOn: true,
          color: '#ff1744',
          bounds: [[minLat, minLng], [maxLat, maxLng]],
          geomCount: lines.length,
          file: '',
          sizeKb: Math.round(file.size / 1024),
        };
        kmzDataCacheRef.current[customId] = {
          ...newItem,
          groups: [{ color: '#ff1744', fillColor: '#ff1744', weight: 2, outline: true, lines, polys: [] }],
        };
        setKmzManifest((prev) => [newItem, ...prev]);
        setEnabledKmzLayers((prev) => ({ ...prev, [customId]: true }));
        await renderKmzLayerOnMap(newItem);
        handleFlyToKmzLayer(newItem);
      }
    } catch (err) {
      console.error('Upload KML error:', err);
    }
    e.target.value = '';
  };

  const activeKmzCount = Object.values(enabledKmzLayers).filter(Boolean).length;
  const kmzCategories = Array.from(new Set(kmzManifest.map((m) => m.category)));

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
    <div className="relative w-full h-[580px] rounded-xl overflow-hidden border border-[#0A4393]/25 bg-white shadow-lg flex flex-col">
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

        {/* 25-Year Swipe Compare Toggle & Layer Manager + GPS */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowLayerManager(!showLayerManager)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
              showLayerManager
                ? 'bg-white text-[#0A4393] font-bold ring-2 ring-white shadow-md'
                : 'bg-white/15 text-white hover:bg-white/25 border border-white/25'
            }`}
            title="Quản lý bật/tắt các lớp bản đồ và lớp bản vẽ mặt cắt KMZ"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Quản Lý Lớp KMZ ({activeKmzCount}/{kmzManifest.length || 22})</span>
          </button>

          <button
            onClick={handleLocateUser}
            disabled={isLocating}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-white text-[#0A4393] font-bold hover:bg-blue-50 transition-colors shadow-sm"
            title="Định vị vị trí đang đứng trên bản đồ (GPS)"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0A4393]" />
            ) : (
              <LocateFixed className="w-3.5 h-3.5 text-[#0A4393]" />
            )}
            <span>Vị Trí Đang Đứng</span>
          </button>

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

      {/* Swipe comparison tool floating bar */}
      {showSwipeTool && (
        <div className="z-10 bg-[#F0F6FF] border-b border-[#0A4393]/25 p-2.5 flex flex-col gap-2 text-xs text-slate-800 shadow-md">
          {/* Hàng 1: Chọn khu vực (Dropdown + Nút Vẽ) & Chọn mốc thời gian */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Cụm 1: Chọn / Vẽ Khu Vực So Sánh */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[#0A4393] font-bold flex items-center gap-1 font-mono text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-[#0A4393]" /> Khu vực:
              </span>

              {/* Dropdown danh sách khu vực */}
              <select
                value={selectedAreaKey}
                onChange={(e) => handleSelectArea(e.target.value)}
                className="bg-white text-[#0A4393] font-semibold border border-[#0A4393]/30 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-[#0A4393] cursor-pointer shadow-sm"
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

              {/* Nút Vẽ vùng tùy chọn */}
              <button
                onClick={handleToggleDrawing}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                  isDrawingMode
                    ? 'bg-[#0A4393] text-white ring-2 ring-[#0A4393]/40 shadow-md animate-pulse'
                    : 'bg-white hover:bg-[#E6F0FA] border border-[#0A4393]/30 text-[#0A4393]'
                }`}
                title="Nhấp giữ và kéo chuột trên bản đồ để khoanh vùng diện tích cần so sánh"
              >
                <Pencil className="w-3 h-3" />
                <span>{isDrawingMode ? 'Đang Vẽ Chuột...' : '✏️ Vẽ Vùng Trên Bản Đồ'}</span>
              </button>

              {/* Nút Xóa vùng vẽ nếu có */}
              {customArea && (
                <button
                  onClick={handleClearCustomArea}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono bg-rose-50 hover:bg-rose-100 border border-rose-400 text-rose-700 transition-colors"
                  title="Xóa vùng người dùng tự vẽ và quay lại khu vực chuẩn"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa vùng vẽ</span>
                </button>
              )}
            </div>
          </div>

          {/* Cụm 2: Hàng nút mốc nhanh và Chạy tua */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[#0A4393] font-bold flex items-center gap-1 font-mono text-[11px]">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Mốc:
              </span>

              {/* Nút Mốc 2001 */}
              <button
                onClick={() => handleSelectYear(2001)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                  selectedYear === 2001 && compareMode !== 'DELTA'
                    ? 'bg-[#0A4393] text-white shadow-sm'
                    : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
              >
                🌿 Mốc 2001 (Ảnh Gốc)
              </button>

              {/* Nút Mốc 2026 */}
              <button
                onClick={() => handleSelectYear(2026)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                  selectedYear === 2026 && compareMode !== 'DELTA'
                    ? 'bg-[#0A4393] text-white shadow-sm'
                    : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
              >
                ⚠️ Mốc 2026 (Hiện Trạng)
              </button>

              {/* Nút Đối Chiếu Biến Động */}
              <button
                onClick={() => handleSelectCompareMode('DELTA')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                  compareMode === 'DELTA'
                    ? 'bg-[#0A4393] text-white shadow-sm'
                    : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
              >
                📊 Đối Chiếu Biến Động
              </button>

              {/* Nút Chạy tua theo năm */}
              <button
                onClick={() => setIsAutoPlayYear(!isAutoPlayYear)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all shadow-sm ${
                  isAutoPlayYear
                    ? 'bg-[#0A4393] text-white animate-pulse'
                    : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                }`}
                title="Tự động chạy tua theo từng năm từ 2001 -> 2026"
              >
                {isAutoPlayYear ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isAutoPlayYear ? 'Tạm Dừng Tua' : '▶️ Chạy Tua Theo Năm'}</span>
              </button>
            </div>

            {/* Mốc năm nhanh */}
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <span className="text-slate-600 hidden sm:inline mr-0.5">Chọn nhanh:</span>
              {[2001, 2005, 2010, 2015, 2020, 2026].map((yr) => (
                <button
                  key={yr}
                  onClick={() => handleSelectYear(yr)}
                  className={`px-1.5 py-0.5 rounded transition-all ${
                    selectedYear === yr && compareMode !== 'DELTA'
                      ? 'bg-[#0A4393] text-white font-black scale-105'
                      : 'bg-white text-[#0A4393] border border-[#0A4393]/25 hover:bg-[#E6F0FA]'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* SATELLITE TIMELINE SLIDER */}
          <SatelliteTimelineSlider
            currentYear={selectedYear}
            minYear={2001}
            maxYear={2026}
            isLoading={isTileLoading}
            onYearChange={handleSelectYear}
          />

          {/* Hàng 4: Thống kê số liệu biến động động cho đúng khu vực và năm được chọn */}
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] px-2.5 py-1 rounded bg-white border border-[#0A4393]/25 font-mono text-slate-800">
            <span className="text-[#0A4393] font-bold">
              📍 {currentAreaInfo.name} ({currentAreaInfo.areaHa.toLocaleString()} ha)
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="text-[#0A4393]">
              📅 Năm {selectedYear}: <strong>{currentYearCover}% che phủ</strong>
            </span>
            <span className="text-slate-400 hidden sm:inline">➔</span>
            <span className="text-rose-600 font-bold">
              📉 Biến động: <strong>{currentYearLostHa > 0 ? `-${currentYearLostHa} ha` : 'Nguyên trạng'}</strong>
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="text-slate-600 text-[10px]">
              (Mốc 2001: {currentAreaInfo.cover2001}% ➔ Năm 2026: {currentAreaInfo.cover2026}%)
            </span>
          </div>
        </div>
      )}

      {/* 2. Thanh Trạng Thái Phân Tích: Chữ và nút trên 1 dòng duy nhất, không bị bản đồ che */}
      <div className="z-10 bg-white border-b border-[#0A4393]/20 px-3 py-1.5 flex items-center justify-between gap-2 text-xs">
        {/* Nhóm Chữ bên trái: Title & Trạng thái tóm tắt gọn gàng */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-[#0A4393] flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <Activity className="w-3.5 h-3.5 text-[#0A4393] animate-pulse" />
            <span>{activeMeta.title}</span>
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-[11px] text-slate-700 font-medium truncate">
            {activeMeta.liveMetric}
          </span>
        </div>

        {/* Nhóm Nút & Slider bên phải trên cùng 1 dòng */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Slider độ phủ vệ tinh */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-600 font-mono">
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

      {/* Map Leaflet Container + Các nút nổi trên Bản Đồ (Định vị GPS & Quản lý lớp KMZ) */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Thông báo trạng thái định vị GPS */}
        {locateMessage && (
          <div className="absolute top-3 left-3 z-[500] bg-[#0A4393] text-white px-3 py-1.5 rounded-lg shadow-lg border border-white/40 text-xs font-mono flex items-center gap-2">
            <LocateFixed className="w-3.5 h-3.5 text-white animate-pulse shrink-0" />
            <span>{locateMessage}</span>
          </div>
        )}

        {/* Nút nổi góc trên bên phải: Mở Bảng Quản lý Nhiều Lớp Bản Đồ & KMZ */}
        <div className="absolute top-3 right-3 z-[500] flex items-center gap-1.5">
          <button
            onClick={() => setShowLayerManager(!showLayerManager)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono shadow-lg border transition-all ${
              showLayerManager
                ? 'bg-[#0A4393] text-white border-white ring-2 ring-[#0A4393]/40'
                : 'bg-white text-[#0A4393] border-[#0A4393]/40 hover:bg-[#F0F6FF]'
            }`}
            title="Bật/tắt quản lý nhiều lớp bản đồ và file ban_ve,_mat_cat.kmz"
          >
            <Layers className="w-4 h-4" />
            <span>Lớp Bản Đồ & KMZ ({activeKmzCount}/{kmzManifest.length || 22})</span>
          </button>
        </div>

        {/* Nút nổi góc dưới bên phải (Ngay phía trên nút + / - Zoom của Ảnh 1): ĐỊNH VỊ VỊ TRÍ ĐANG ĐỨNG */}
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

        {/* BẢNG QUẢN LÝ NHIỀU LỚP BẢN ĐỒ & FILE KMZ (ban_ve,_mat_cat.kmz) */}
        {showLayerManager && (
          <div className="absolute top-12 right-3 z-[550] w-[330px] sm:w-[370px] max-h-[430px] bg-white border-2 border-[#0A4393] rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs font-sans">
            {/* Header Bảng Quản Lý Lớp */}
            <div className="bg-[#0A4393] text-white px-3 py-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 font-bold">
                <Layers className="w-4 h-4" />
                <span>QUẢN LÝ LỚP BẢN ĐỒ & KMZ</span>
              </div>
              <button
                onClick={() => setShowLayerManager(false)}
                className="p-0.5 rounded hover:bg-white/20 text-white"
                title="Đóng bảng quản lý lớp"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thanh công cụ thao tác nhanh KMZ */}
            <div className="p-2 bg-[#F0F6FF] border-b border-[#0A4393]/20 space-y-1.5 shrink-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-[#0A4393] truncate">
                  📐 File: ban_ve,_mat_cat.kmz
                </span>
                <button
                  onClick={handleFlyToAllKmz}
                  className="px-2 py-0.5 rounded bg-[#0A4393] hover:bg-[#083576] text-white text-[10px] font-semibold flex items-center gap-1 shrink-0 shadow-xs"
                  title="Phóng bản đồ tới đúng vị trí lồng ghép bản vẽ KMZ"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Định vị vùng KMZ</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => handleBulkKmzLayers('ALL')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 border border-[#0A4393]/30 text-[#0A4393] text-[10px] font-semibold"
                >
                  ✓ Chọn tất cả
                </button>
                <button
                  onClick={() => handleBulkKmzLayers('DEFAULT')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 border border-[#0A4393]/30 text-[#0A4393] text-[10px] font-semibold"
                >
                  ↺ Lớp chính (Mặc định)
                </button>
                <button
                  onClick={() => handleBulkKmzLayers('NONE')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 text-[10px] font-semibold"
                >
                  ✕ Bỏ chọn hết
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="ml-auto px-2 py-0.5 rounded bg-white hover:bg-blue-50 border border-[#0A4393]/40 text-[#0A4393] text-[10px] font-bold flex items-center gap-1"
                  title="Tải thêm file .KML từ máy tính"
                >
                  <Upload className="w-2.5 h-2.5" />
                  <span>+ File KML</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".kml,.xml"
                  onChange={handleUploadCustomKml}
                  className="hidden"
                />
              </div>
            </div>

            {/* Danh sách các lớp bản đồ (Cuộn dọc) */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
              {/* Nhóm 0: Lớp Hệ Thống Trực Chiến */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#0A4393] bg-[#F0F6FF] px-2 py-1 rounded border border-[#0A4393]/15 mb-1.5">
                  Lớp Hệ Thống Trực Chiến Xã Ea Súp
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

                  <label className="flex items-center justify-between p-1.5 rounded hover:bg-[#F4F8FD] cursor-pointer border border-transparent hover:border-[#0A4393]/15">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={systemLayers.gibs}
                        onChange={() => handleToggleSystemLayer('gibs')}
                        className="rounded accent-[#0A4393] w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shrink-0" />
                      <span className="text-[11px] font-medium text-slate-800">
                        Lớp Ảnh Nhiệt / Vệ Tinh NASA GIBS
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Các nhóm lớp từ file ban_ve,_mat_cat.kmz */}
              {kmzCategories.map((cat) => {
                const items = kmzManifest.filter((m) => m.category === cat);
                return (
                  <div key={cat}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#0A4393] bg-[#F0F6FF] px-2 py-1 rounded border border-[#0A4393]/15 mb-1.5 flex items-center justify-between">
                      <span>{cat}</span>
                      <span className="font-mono text-[9px] text-[#0A4393]/80">
                        {items.filter((i) => enabledKmzLayers[i.id]).length}/{items.length} lớp
                      </span>
                    </div>
                    <div className="space-y-1">
                      {items.map((item) => {
                        const isChecked = !!enabledKmzLayers[item.id];
                        const isLoading = !!loadingKmzLayers[item.id];
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-1.5 rounded border transition-colors ${
                              isChecked
                                ? 'bg-[#F0F6FF]/80 border-[#0A4393]/25'
                                : 'bg-white border-transparent hover:bg-slate-50'
                            }`}
                          >
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
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
                              <div className="truncate">
                                <div className="text-[11px] font-semibold text-slate-800 truncate">
                                  {item.label}
                                </div>
                                <div className="text-[9px] font-mono text-slate-500">
                                  Mã KMZ: {item.rawName} • {item.geomCount.toLocaleString()} đối tượng
                                </div>
                              </div>
                            </label>

                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              {isLoading && (
                                <Loader2 className="w-3 h-3 animate-spin text-[#0A4393]" />
                              )}
                              <button
                                onClick={() => handleFlyToKmzLayer(item)}
                                className="p-1 rounded bg-white hover:bg-[#0A4393] text-[#0A4393] hover:text-white border border-[#0A4393]/25 transition-colors"
                                title={`Phóng tới vị trí lớp ${item.label} trên bản đồ`}
                              >
                                <Crosshair className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
