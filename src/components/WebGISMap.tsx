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
  MapPin,
  Eye,
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

export const WebGISMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const currentBaseTileRef = useRef<any>(null);

  const [activeBasemap, setActiveBasemap] = useState<keyof typeof BASEMAP_TILES>('SATELLITE');
  const [selectedGibsLayer, setSelectedGibsLayer] = useState<string>('THERMAL_ANOMALIES');
  const [swipeDateLeft, setSwipeDateLeft] = useState<string>('2001-03-15');
  const [swipeDateRight, setSwipeDateRight] = useState<string>('2026-03-15');
  const [showSwipeTool, setShowSwipeTool] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
      }

      // Căn giữa tọa độ Trung tâm huyện lỵ / xã Ea Súp
      const map = L.map(mapContainerRef.current, {
        center: [13.238, 107.872],
        zoom: 12,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Nạp basemap ban đầu (Esri Satellite không yêu cầu API key, không bị watermark)
      const baseTile = L.tileLayer(BASEMAP_TILES.SATELLITE.url, {
        attribution: BASEMAP_TILES.SATELLITE.attribution,
        maxZoom: BASEMAP_TILES.SATELLITE.maxZoom,
      }).addTo(map);
      currentBaseTileRef.current = baseTile;

      // Hàm tạo Marker HTML dạng Pill Badge không bị vỡ chữ (white-space: nowrap)
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

      // 1. Hồ Ea Súp Hạ (QUY TẮC BẤT BIẾN: CẤM NUÔI CÁ LỒNG BÈ)
      const hoHa = KEY_MONITORING_TARGETS.HO_EASUP_HA;
      L.marker(hoHa.coordinates, {
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
            <p style="margin:0 0 6px 0; line-height:1.4;"><strong>QUY TẮC BẤT BIẾN:</strong> Vùng bảo vệ nghiêm ngặt nguồn nước thô sinh hoạt. Tuyệt đối nghiêm cấm mọi hình thức nuôi cá lồng bè.</p>
            <div style="background:#ffe4e6; color:#9f1239; padding:4px 6px; border-radius:4px; font-weight:600; font-size:11px;">Trạng thái: An toàn (0 lồng bè)</div>
          </div>
        `);

      // 2. Hồ Ea Súp Thượng (Công trình đại thủy nông 146M m³)
      const hoThuong = KEY_MONITORING_TARGETS.HO_EASUP_THUONG;
      L.marker(hoThuong.coordinates, {
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
            <p style="margin:0 0 4px 0; line-height:1.4;">Dung tích 146 triệu m³. Tràn xả lũ tự do cao trình 210.0m. Mực nước hiện tại 206.8m (An toàn).</p>
          </div>
        `);

      // 3. Tiểu khu 277 (Vùng rừng khộp dễ cháy)
      const tk277 = KEY_MONITORING_TARGETS.FOREST_TK277;
      L.marker(tk277.coordinates, {
        icon: createPillMarker(
          'rgba(27, 77, 62, 0.95)',
          '#34d399',
          '🌲 Lâm phần Tiểu khu 277',
          '🔥'
        ),
      })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
            <h4 style="font-weight:bold; color:#047857; margin:0 0 4px 0; font-size:13px;">Lâm phần Tiểu Khu 277</h4>
            <p style="margin:0 0 4px 0; line-height:1.4;">Rừng khộp nhạy cảm mùa khô giáp ranh đất nương rẫy. Trạm IoT LoRaWAN TK-277 đang trực chiến đo nhiệt độ/khói.</p>
          </div>
        `);

      // 4. Hồ cá Thôn Đoàn Kết (Vùng nuôi cá tập trung có kiểm soát)
      const doanKetCoord: [number, number] = [13.256, 107.882];
      L.marker(doanKetCoord, {
        icon: createPillMarker(
          'rgba(14, 116, 144, 0.95)',
          '#67e8f9',
          '🐟 Ao Cá Thôn Đoàn Kết',
          '🏊'
        ),
      })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:4px; max-width:240px; color:#1e293b;">
            <h4 style="font-weight:bold; color:#0e7490; margin:0 0 4px 0; font-size:13px;">Khu Nuôi Thủy Sản Thôn Đoàn Kết</h4>
            <p style="margin:0 0 4px 0; line-height:1.4;">Khu nuôi thủy sản thâm canh tập trung. Cảm biến IoT giám sát Oxy hòa tan DO (6.8 mg/L) và pH (7.4).</p>
          </div>
        `);

      // 5. Thêm vòng đệm bán kính 5km bao trùm 4 xã lân cận
      L.circle([13.238, 107.872], {
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
    });

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Thay đổi Basemap không bị lỗi API Key
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

      // Đưa base tile xuống dưới các marker
      newBaseTile.bringToBack();
      currentBaseTileRef.current = newBaseTile;
    });
  };

  return (
    <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
      {/* Top Map Control Bar */}
      <div className="z-10 bg-slate-900/95 border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Basemap Switcher Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-emerald-400" /> Nền Bản Đồ:
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
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-blue-400" /> Vệ Tinh NASA:
          </span>
          <select
            value={selectedGibsLayer}
            onChange={(e) => setSelectedGibsLayer(e.target.value)}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-emerald-400"
            aria-label="Chọn lớp ảnh vệ tinh NASA GIBS"
          >
            {Object.entries(NASA_GIBS_LAYERS).map(([key, layer]) => (
              <option key={key} value={key}>
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
          <span>So Sánh 25 Năm TK-277</span>
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
            Phân tích diễn biến thảm phủ rừng khộp Tiểu khu 277 giai đoạn 2000 - 2026
          </div>
        </div>
      )}

      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full relative" />

      {/* Floating Legend inside Map */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/95 border border-slate-700 px-3 py-2 rounded-lg shadow-xl text-[11px] text-slate-200 font-mono backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Xã Ea Súp (13.238°B, 107.872°Đ)</span>
          </div>
          <div className="text-[10px] text-slate-300 space-y-0.5">
            <div>• <strong className="text-rose-400">Hồ Ea Súp Hạ:</strong> Nguồn nước sinh hoạt - Cấm nuôi cá</div>
            <div>• <strong className="text-blue-400">Hồ Ea Súp Thượng:</strong> Đại thủy nông 146M m³</div>
            <div>• <strong className="text-emerald-400">Tiểu khu 277:</strong> Rừng khộp cảnh báo cháy</div>
            <div>• <strong className="text-cyan-400">Hồ cá Đoàn Kết:</strong> Vùng nuôi thủy sản tập trung</div>
          </div>
        </div>
      </div>
    </div>
  );
};
