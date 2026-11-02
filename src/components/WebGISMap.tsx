'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  KEY_MONITORING_TARGETS,
  EASUP_VILLAGES,
  NEIGHBOR_COMMUNES,
} from '@/data/administrative_boundaries';
import { NASA_GIBS_LAYERS } from '@/services/nasaSatelliteService';
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
} from 'lucide-react';

const BASEMAP_TILES = {
  SATELLITE: {
    name: 'Vệ tinh Esri',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; World Imagery | Ea Súp WebGIS',
    maxZoom: 18,
  },
  STREETS: {
    name: 'Bản đồ OSM',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors | Ea Súp WebGIS',
    maxZoom: 19,
  },
  TOPO: {
    name: 'Địa hình Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri Topo | Ea Súp WebGIS',
    maxZoom: 18,
  },
};

// Thông số phân tích vệ tinh NASA GIBS tương ứng cho từng lớp
const GIBS_META: Record<
  string,
  {
    title: string;
    satellite: string;
    resolution: string;
    liveMetric: string;
    status: string;
    statusColor: string;
  }
> = {
  THERMAL_ANOMALIES: {
    title: 'Điểm Nhiệt Bất Thường VIIRS 375m',
    satellite: 'Suomi NPP / NOAA-20 (VIIRS 375m)',
    resolution: '375m / pixel',
    liveMetric: '02 Điểm nhiệt phát hiện gần TK-293 (FRP: 8.6 MW & 14.2 MW)',
    status: 'CẢNH BÁO NGUY CƠ CHÁY',
    statusColor: 'text-rose-400 bg-rose-950/80 border-rose-800',
  },
  TRUE_COLOR: {
    title: 'Ảnh Thực Quang Học Màu Tự Nhiên',
    satellite: 'VIIRS Suomi NPP Corrected Reflectance',
    resolution: '250m - 375m',
    liveMetric: 'Bầu trời quang 85%, thảm phủ rừng khộp chuyển sắc mùa khô',
    status: 'QUAN SÁT THỰC ĐỊA TỰ NHIÊN',
    statusColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
  },
  NDVI_VEGETATION: {
    title: 'Chỉ Số Sức Khỏe Thảm Phủ Thực Vật NDVI',
    satellite: 'Terra / MODIS 8-Day Composite',
    resolution: '250m / pixel',
    liveMetric: 'NDVI trung bình Tiểu khu 293: 0.68 (Ổn định, không sụt giảm >=500m²)',
    status: 'MẶT PHỦ RỪNG ỔN ĐỊNH',
    statusColor: 'text-green-400 bg-green-950/80 border-green-800',
  },
  SOIL_MOISTURE: {
    title: 'Độ Ẩm Tầng Rễ Đất SMAP NASA',
    satellite: 'SMAP L4 Radiometer',
    resolution: '9 km / grid',
    liveMetric: 'Độ ẩm tầng rễ: 31.4% (Mức cận khô hạn, cần điều tiết nước Kênh Tây)',
    status: 'CẢNH BÁO KHÔ HẠN CỤC BỘ',
    statusColor: 'text-amber-400 bg-amber-950/80 border-amber-800',
  },
  FLOOD_SURFACE: {
    title: 'Bản Đồ Phân Vùng Ngập Lụt MODIS',
    satellite: 'Terra + Aqua MODIS NRT Flood 250m',
    resolution: '250m / pixel',
    liveMetric: 'Hạ du Hồ Thượng & Sông Ea Súp: Mực nước nằm trong lòng dẫn',
    status: 'KHÔNG NGẬP LỤT DIỆN RỘNG',
    statusColor: 'text-cyan-400 bg-cyan-950/80 border-cyan-800',
  },
};

export const WebGISMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const currentBaseTileRef = useRef<any>(null);
  const gibsTileLayerRef = useRef<any>(null);
  const gibsFeatureGroupRef = useRef<any>(null);

  const [activeBasemap, setActiveBasemap] = useState<keyof typeof BASEMAP_TILES>('SATELLITE');
  const [selectedGibsLayer, setSelectedGibsLayer] = useState<string>('THERMAL_ANOMALIES');
  const [gibsOpacity, setGibsOpacity] = useState<number>(0.75);
  const [swipeDateLeft, setSwipeDateLeft] = useState<string>('2001-03-15');
  const [swipeDateRight, setSwipeDateRight] = useState<string>('2026-03-15');
  const [showSwipeTool, setShowSwipeTool] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  // Hàm cập nhật lớp ảnh vệ tinh NASA GIBS và các vector trực quan
  const updateGibsOverlay = (layerKey: string, opacity: number) => {
    const map = leafletMapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      // 1. Xóa tile layer GIBS cũ nếu có
      if (gibsTileLayerRef.current) {
        map.removeLayer(gibsTileLayerRef.current);
        gibsTileLayerRef.current = null;
      }

      // 2. Xóa feature group cũ nếu có
      if (gibsFeatureGroupRef.current) {
        map.removeLayer(gibsFeatureGroupRef.current);
        gibsFeatureGroupRef.current = null;
      }

      // 3. Khởi tạo FeatureGroup mới để chứa vector overlay chuyên đề
      const featureGroup = L.featureGroup().addTo(map);
      gibsFeatureGroupRef.current = featureGroup;

      const dateStr = '2024-05-15'; // Mốc ngày vệ tinh NASA GIBS độ phủ quang mây tối ưu

      // 4. Nạp tile tương ứng từ NASA GIBS
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

        // Đảm bảo tile GIBS nằm trên Basemap nhưng dưới các marker
        if (currentBaseTileRef.current) {
          currentBaseTileRef.current.bringToBack();
        }
        gibsTileLayerRef.current = gibsTile;
      }

      // 5. Thêm các đối tượng hiển thị trực quan sinh động theo từng chế độ
      if (layerKey === 'THERMAL_ANOMALIES') {
        // Điểm nhiệt phát hiện bởi VIIRS kèm hiệu ứng sóng nhiệt
        const fireCoords: [number, number, number, string][] = [
          [12.9865, 107.8821, 8.6, 'Điểm Cháy Rừng Rẫy (Tiểu khu 293)'],
          [13.0012, 107.8654, 14.2, 'Vệt Bức Xạ Nhiệt Cao (Giáp Ea Bung)'],
        ];

        fireCoords.forEach(([lat, lng, frp, label]) => {
          // Vòng tỏa nhiệt
          L.circle([lat, lng], {
            radius: 800,
            color: '#dc2626',
            fillColor: '#ef4444',
            fillOpacity: 0.35,
            weight: 2,
            dashArray: '4, 4',
          }).addTo(featureGroup);

          // Marker đốm lửa nhấp nháy
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
      } else if (layerKey === 'NDVI_VEGETATION') {
        // Đa giác chỉ số thực vật quanh Tiểu khu 293
        const ndviPolygon: [number, number][] = [
          [12.975, 107.875],
          [12.992, 107.878],
          [12.989, 107.898],
          [12.972, 107.892],
        ];

        L.polygon(ndviPolygon, {
          color: '#15803d',
          fillColor: '#22c55e',
          fillOpacity: 0.45,
          weight: 2,
        })
          .addTo(featureGroup)
          .bindPopup(`
            <div style="font-size:12px; padding:4px;">
              <strong style="color:#15803d;">Thảm Phủ Rừng Khộp Tiểu Khu 293</strong><br/>
              - Chỉ số NDVI trung bình: <strong>0.72 (Rừng tốt)</strong><br/>
              - Biến động Delta-NDVI: <strong>-0.04 (Ổn định bình thường)</strong>
            </div>
          `);
      } else if (layerKey === 'SOIL_MOISTURE') {
        // Vùng độ ẩm tầng rễ SMAP
        L.circle([13.05, 107.91], {
          radius: 3500,
          color: '#d97706',
          fillColor: '#f59e0b',
          fillOpacity: 0.28,
          weight: 1.5,
        })
          .addTo(featureGroup)
          .bindPopup(`
            <div style="font-size:12px; padding:4px;">
              <strong style="color:#b45309;">Vùng Đất Nông Nghiệp & Rừng Khộp</strong><br/>
              - Độ ẩm tầng rễ SMAP: <strong>31.4%</strong><br/>
              - Phân loại: <strong>Vùng cảnh báo hạn hán độ ẩm thấp</strong>
            </div>
          `);
      } else if (layerKey === 'FLOOD_SURFACE') {
        // Vùng ngập lụt ven sông Ea Súp
        const floodPoly: [number, number][] = [
          [13.045, 107.905],
          [13.058, 107.895],
          [13.065, 107.885],
          [13.060, 107.880],
          [13.048, 107.898],
        ];

        L.polygon(floodPoly, {
          color: '#0284c7',
          fillColor: '#38bdf8',
          fillOpacity: 0.4,
          weight: 2,
        })
          .addTo(featureGroup)
          .bindPopup(`
            <div style="font-size:12px; padding:4px;">
              <strong style="color:#0369a1;">Hành Lang Tiêu Thoát Lũ Sông Ea Súp</strong><br/>
              - Mức nước: <strong>Dưới báo động I</strong><br/>
              - Nguy cơ ngập tràn: <strong>An toàn</strong>
            </div>
          `);
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

      // Căn giữa tọa độ bao quát 4 trọng điểm xã Ea Súp
      const map = L.map(mapContainerRef.current, {
        center: [13.045, 107.905],
        zoom: 12,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Nạp basemap ban đầu
      const baseTile = L.tileLayer(BASEMAP_TILES.SATELLITE.url, {
        attribution: BASEMAP_TILES.SATELLITE.attribution,
        maxZoom: BASEMAP_TILES.SATELLITE.maxZoom,
      }).addTo(map);
      currentBaseTileRef.current = baseTile;

      // Hàm tạo Marker HTML dạng Pill Badge
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

      // 1. Hồ Ea Súp Hạ: (13.056850, 107.894562) - QUY TẮC BẤT BIẾN: CẤM NUÔI CÁ LỒNG BÈ
      L.marker([13.05685, 107.894562], {
        icon: createPillMarker(
          'rgba(190, 18, 60, 0.95)',
          '#fda4af',
          '🚫 Hồ Ea Súp Hạ (CẤM NUÔI CÁ)',
          '🛡️'
        ),
      })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
            <h4 style="font-weight:bold; color:#be123c; margin:0 0 4px 0; font-size:13px;">Hồ Ea Súp Hạ - Nguồn Cấp Nước Sinh Hoạt</h4>
            <p style="margin:0 0 4px 0; font-size:11px; color:#64748b;">Tọa độ: 13.056850°B, 107.894562°Đ</p>
            <p style="margin:0 0 6px 0; line-height:1.4;"><strong>QUY TẮC BẤT BIẾN:</strong> Vùng bảo vệ nghiêm ngặt nguồn nước thô sinh hoạt. Tuyệt đối nghiêm cấm mọi hình thức nuôi cá lồng bè.</p>
            <div style="background:#ffe4e6; color:#9f1239; padding:4px 6px; border-radius:4px; font-weight:600; font-size:11px;">Trạng thái: An toàn (0 lồng bè)</div>
          </div>
        `);

      // 2. Hồ Ea Súp Thượng: (13.043116, 107.937218)
      L.marker([13.043116, 107.937218], {
        icon: createPillMarker(
          'rgba(15, 76, 129, 0.95)',
          '#60a5fa',
          '🌊 Hồ Ea Súp Thượng (146M m³)',
          '💧'
        ),
      })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
            <h4 style="font-weight:bold; color:#1d4ed8; margin:0 0 4px 0; font-size:13px;">Hồ Ea Súp Thượng (Đại thủy nông)</h4>
            <p style="margin:0 0 4px 0; font-size:11px; color:#64748b;">Tọa độ: 13.043116°B, 107.937218°Đ</p>
            <p style="margin:0 0 6px 0; line-height:1.4;">Dung tích 146 triệu m³. Tràn xả lũ tự do cao trình 210.0m. Mực nước hiện tại 206.8m (An toàn).</p>
          </div>
        `);

      // 3. Tiểu khu 293: (12.982216, 107.886961)
      L.marker([12.982216, 107.886961], {
        icon: createPillMarker(
          'rgba(27, 77, 62, 0.95)',
          '#34d399',
          '🌲 Lâm phần Tiểu khu 293',
          '🔥'
        ),
      })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
            <h4 style="font-weight:bold; color:#047857; margin:0 0 4px 0; font-size:13px;">Lâm phần Tiểu Khu 293</h4>
            <p style="margin:0 0 4px 0; font-size:11px; color:#64748b;">Tọa độ: 12.982216°B, 107.886961°Đ</p>
            <p style="margin:0 0 4px 0; line-height:1.4;">Rừng khộp nhạy cảm mùa khô giáp ranh nương rẫy. Trạm IoT LoRaWAN TK-293 đang trực chiến đo nhiệt độ/khói.</p>
          </div>
        `);

      // 4. Hồ Trung Chuyển: (13.069298, 107.881527)
      L.marker([13.069298, 107.881527], {
        icon: createPillMarker(
          'rgba(14, 116, 144, 0.95)',
          '#67e8f9',
          '🐟 Hồ Trung Chuyển',
          '🏊'
        ),
      })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
            <h4 style="font-weight:bold; color:#0e7490; margin:0 0 4px 0; font-size:13px;">Hồ Trung Chuyển</h4>
            <p style="margin:0 0 4px 0; font-size:11px; color:#64748b;">Tọa độ: 13.069298°B, 107.881527°Đ</p>
            <p style="margin:0 0 4px 0; line-height:1.4;">Hồ điều tiết nguồn nước và vùng nuôi thủy sản thâm canh. Cảm biến IoT giám sát Oxy hòa tan DO (6.8 mg/L) và pH (7.4).</p>
          </div>
        `);

      // 5. Vòng đệm 5km liên xã
      L.circle([13.045, 107.905], {
        color: '#E67700',
        weight: 1.5,
        dashArray: '5, 5',
        fillColor: '#E67700',
        fillOpacity: 0.04,
        radius: 12000,
      })
        .addTo(map)
        .bindTooltip('Vùng đệm liên xã bán kính 5km (Ea Bung, Ea Rốk, Ia Lốp, Ia Rvê)');

      leafletMapRef.current = map;
      setMapLoaded(true);

      // Kích hoạt nạp lớp ảnh vệ tinh NASA GIBS mặc định
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

      newBaseTile.bringToBack();
      currentBaseTileRef.current = newBaseTile;
    });
  };

  // Xử lý khi người dùng chọn lớp Vệ Tinh NASA GIBS
  const handleGibsChange = (layerKey: string) => {
    setSelectedGibsLayer(layerKey);
    updateGibsOverlay(layerKey, gibsOpacity);
  };

  // Điều chỉnh độ mờ (Opacity) của lớp vệ tinh NASA
  const handleOpacityChange = (newOpacity: number) => {
    setGibsOpacity(newOpacity);
    if (gibsTileLayerRef.current) {
      gibsTileLayerRef.current.setOpacity(newOpacity);
    }
  };

  const activeMeta = GIBS_META[selectedGibsLayer] || GIBS_META.THERMAL_ANOMALIES;

  return (
    <div className="relative w-full h-[560px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
      {/* Top Map Control Bar */}
      <div className="z-10 bg-slate-900/95 border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Basemap Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-emerald-400" /> Nền:
          </span>
          {(Object.keys(BASEMAP_TILES) as Array<keyof typeof BASEMAP_TILES>).map((key) => (
            <button
              key={key}
              onClick={() => handleBasemapChange(key)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                activeBasemap === key
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {BASEMAP_TILES[key].name}
            </button>
          ))}
        </div>

        {/* NASA GIBS Layer Selector */}
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" /> Lớp Vệ Tinh NASA:
          </span>
          <select
            value={selectedGibsLayer}
            onChange={(e) => handleGibsChange(e.target.value)}
            className="bg-slate-800 text-amber-300 font-semibold border border-amber-500/60 rounded px-2.5 py-1 text-xs focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-sm"
            aria-label="Chọn lớp ảnh vệ tinh NASA GIBS"
          >
            {Object.entries(NASA_GIBS_LAYERS).map(([key, layer]) => (
              <option key={key} value={key} className="bg-slate-900 text-white">
                {layer.name} ({layer.timeRange})
              </option>
            ))}
          </select>
        </div>

        {/* 25-Year Swipe Compare Toggle */}
        <button
          onClick={() => setShowSwipeTool(!showSwipeTool)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
            showSwipeTool
              ? 'bg-amber-600 text-white font-semibold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>So Sánh 25 Năm TK-293</span>
        </button>
      </div>

      {/* Swipe comparison tool floating bar */}
      {showSwipeTool && (
        <div className="z-10 bg-slate-900/95 border-b border-amber-500/50 p-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-semibold text-[11px]">Mốc 2001:</span>
            <input
              type="date"
              value={swipeDateLeft}
              onChange={(e) => setSwipeDateLeft(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
            />
            <span className="text-slate-500">↔</span>
            <span className="text-emerald-400 font-semibold text-[11px]">Mốc 2026:</span>
            <input
              type="date"
              value={swipeDateRight}
              onChange={(e) => setSwipeDateRight(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
            />
          </div>
          <div className="text-[11px] text-amber-300 font-mono">
            Phân tích diễn biến thảm phủ rừng khộp Tiểu khu 293 giai đoạn 2000 - 2026
          </div>
        </div>
      )}

      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full relative" />

      {/* FLOATING NASA LIVE ANALYSIS CARD (Hiện thông tin chi tiết thay đổi ngay khi chọn) */}
      <div className="absolute top-12 right-3 z-10 w-80 max-w-[calc(100%-24px)] pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/95 border border-slate-700 rounded-lg p-2.5 shadow-2xl backdrop-blur-md text-xs font-sans">
          <div className="flex items-center justify-between gap-1 mb-1 pb-1 border-b border-slate-800">
            <span className="font-bold text-white flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              {activeMeta.title}
            </span>
            <span
              className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded border ${activeMeta.statusColor}`}
            >
              {activeMeta.status}
            </span>
          </div>

          <div className="space-y-1 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Vệ tinh / Cảm biến:</span>
              <strong className="text-white font-mono">{activeMeta.satellite}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Độ phân giải mặt đất:</span>
              <strong className="text-emerald-400 font-mono">{activeMeta.resolution}</strong>
            </div>
            <div className="mt-1 p-1.5 rounded bg-slate-800/80 border border-slate-700/80 text-[11px] text-amber-200 font-medium">
              📊 {activeMeta.liveMetric}
            </div>

            {/* Slider điều chỉnh độ rõ nét của lớp vệ tinh */}
            <div className="pt-1 flex items-center justify-between gap-2 text-[10px] text-slate-400">
              <span>Độ phủ lớp vệ tinh:</span>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={gibsOpacity}
                onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="font-mono text-white">{Math.round(gibsOpacity * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Legend inside Map */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/95 border border-slate-700 px-3 py-2 rounded-lg shadow-xl text-[11px] text-slate-200 font-mono backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Tọa Độ Trọng Điểm Ea Súp</span>
          </div>
          <div className="text-[10px] text-slate-300 space-y-0.5">
            <div>• <strong className="text-rose-400">Hồ Ea Súp Hạ:</strong> (13.056850, 107.894562) Cấm nuôi cá</div>
            <div>• <strong className="text-blue-400">Hồ Ea Súp Thượng:</strong> (13.043116, 107.937218) Đại thủy nông</div>
            <div>• <strong className="text-emerald-400">Tiểu khu 293:</strong> (12.982216, 107.886961) Rừng khộp</div>
            <div>• <strong className="text-cyan-400">Hồ Trung Chuyển:</strong> (13.069298, 107.881527) Điều tiết & Thủy sản</div>
          </div>
        </div>
      </div>
    </div>
  );
};
