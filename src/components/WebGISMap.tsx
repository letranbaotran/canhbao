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
  AlertTriangle,
  Compass,
  SlidersHorizontal,
  ShieldAlert,
} from 'lucide-react';

export const WebGISMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const [selectedGibsLayer, setSelectedGibsLayer] = useState<string>('THERMAL_ANOMALIES');
  const [swipeDateLeft, setSwipeDateLeft] = useState<string>('2001-03-15');
  const [swipeDateRight, setSwipeDateRight] = useState<string>('2026-03-15');
  const [showSwipeTool, setShowSwipeTool] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'FOREST' | 'HYDRO'>('ALL');
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // Load Leaflet dynamically on client-side
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
      }

      // Initialize map centered on Ea Súp
      const map = L.map(mapContainerRef.current, {
        center: [13.235, 107.876],
        zoom: 12,
        zoomControl: false,
      });
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Base vector tile (CartoDB Dark Matter for command center theme)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO | Ea Súp WebGIS',
        maxZoom: 19,
      }).addTo(map);

      // Create Custom Marker Icons
      const createDivIcon = (bgClass: string, text: string, iconHtml: string) => {
        return L.divIcon({
          className: 'custom-map-marker',
          html: `
            <div class="flex items-center gap-1.5 px-2 py-1 rounded-md shadow-lg border border-slate-700/80 ${bgClass} text-white font-mono text-[11px] transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110">
              ${iconHtml}
              <span class="font-bold">${text}</span>
            </div>
          `,
          iconSize: [120, 30],
        });
      };

      // 1. Hồ Ea Súp Hạ (CẤM NUÔI CÁ)
      const hoHa = KEY_MONITORING_TARGETS.HO_EASUP_HA;
      L.marker(hoHa.coordinates, {
        icon: createDivIcon(
          'bg-rose-900/90 border-rose-500 animate-pulse',
          'Hồ Ea Súp Hạ',
          '<span class="text-rose-400 font-bold">🚫 CẤM NUÔI CÁ</span>'
        ),
      })
        .addTo(map)
        .bindPopup(`
          <div class="p-2 font-sans text-xs">
            <h4 class="font-bold text-rose-700 text-sm">Hồ Ea Súp Hạ - Nguồn Nước Sinh Hoạt</h4>
            <p class="text-slate-700 mt-1"><strong>QUY CHẾ BẤT BIẾN:</strong> Tuyệt đối cấm nuôi trồng thủy sản lồng bè để bảo vệ nguồn cấp nước sinh hoạt cho thị trấn và các xã lân cận.</p>
            <div class="mt-2 p-1 bg-rose-50 text-rose-800 rounded text-[11px]">Trạng thái: An toàn / Cảm biến radar siêu âm hoạt động</div>
          </div>
        `);

      // 2. Hồ Ea Súp Thượng
      const hoThuong = KEY_MONITORING_TARGETS.HO_EASUP_THUONG;
      L.marker(hoThuong.coordinates, {
        icon: createDivIcon(
          'bg-blue-900/90 border-blue-500',
          'Hồ Ea Súp Thượng',
          '🌊 146M m³'
        ),
      })
        .addTo(map)
        .bindPopup(`
          <div class="p-2 font-sans text-xs">
            <h4 class="font-bold text-blue-700 text-sm">Đập & Tràn Xả Lũ Hồ Ea Súp Thượng</h4>
            <p class="text-slate-700 mt-1">Dung tích thiết kế: 146 triệu m³. Mực nước hiện tại: 206.8m (Mức bình thường đón lũ).</p>
          </div>
        `);

      // 3. Tiểu khu 277 (Lâm phần trọng điểm)
      const tk277 = KEY_MONITORING_TARGETS.FOREST_TK277;
      L.marker(tk277.coordinates, {
        icon: createDivIcon(
          'bg-emerald-900/90 border-emerald-500',
          'Tiểu khu 277',
          '🌲 Rừng khộp'
        ),
      })
        .addTo(map)
        .bindPopup(`
          <div class="p-2 font-sans text-xs">
            <h4 class="font-bold text-emerald-800 text-sm">Lâm Phần Tiểu Khu 277</h4>
            <p class="text-slate-700 mt-1">Khu vực rừng khộp nhạy cảm cháy mùa khô giáp ranh nương rẫy. Trạm LoRaWAN TK277-01 đang trực chiến.</p>
          </div>
        `);

      // 4. Hồ cá Thôn Đoàn Kết
      const doanKet = KEY_MONITORING_TARGETS.HO_CA_THON_DOAN_KET;
      L.marker(doanKet.coordinates, {
        icon: createDivIcon(
          'bg-cyan-900/90 border-cyan-500',
          'Ao Cá Thôn Đoàn Kết',
          '🐟 Nuôi cá tập trung'
        ),
      })
        .addTo(map)
        .bindPopup(`
          <div class="p-2 font-sans text-xs">
            <h4 class="font-bold text-cyan-800 text-sm">Khu Nuôi Thủy Sản Thôn Đoàn Kết</h4>
            <p class="text-slate-700 mt-1">Vùng nuôi cá được quy hoạch cấp phép. Cảm biến IoT theo dõi chỉ số DO và cảnh báo ngập bờ.</p>
          </div>
        `);

      // 5. Thêm vòng đệm bán kính 5km bao trùm 4 xã lân cận
      L.circle([13.235, 107.876], {
        color: '#E67700',
        weight: 1.5,
        dashArray: '6, 6',
        fillColor: '#E67700',
        fillOpacity: 0.05,
        radius: 12000,
      })
        .addTo(map)
        .bindTooltip('Vùng đệm quan sát liên xã 5km (Ea Bung, Ea Rốk, Ia Lốp, Ia Rvê)');

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

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
      {/* Top Map Control Bar */}
      <div className="z-10 bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Layer Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="flex items-center gap-1 font-semibold text-slate-300">
            <Layers className="w-3.5 h-3.5 text-emerald-400" /> Lớp Vệ Tinh NASA GIBS:
          </span>
          <select
            value={selectedGibsLayer}
            onChange={(e) => setSelectedGibsLayer(e.target.value)}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-400"
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSwipeTool(!showSwipeTool)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
              showSwipeTool
                ? 'bg-amber-600 text-white font-medium'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>So sánh 25 năm Tiểu khu 277 (2000 - 2026)</span>
          </button>
        </div>
      </div>

      {/* Swipe comparison tool floating bar */}
      {showSwipeTool && (
        <div className="z-10 bg-slate-900/95 border-b border-amber-500/50 p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-semibold">Mốc quá khứ:</span>
              <input
                type="date"
                value={swipeDateLeft}
                onChange={(e) => setSwipeDateLeft(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
              />
            </div>
            <span className="text-slate-500">↔</span>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold">Hiện trạng 2026:</span>
              <input
                type="date"
                value={swipeDateRight}
                onChange={(e) => setSwipeDateRight(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
              />
            </div>
          </div>
          <div className="text-[11px] text-amber-300 font-mono">
            Kéo con trỏ để xem biến động thảm thực bì Tiểu khu 277 qua ảnh viễn thám MODIS/Landsat
          </div>
        </div>
      )}

      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full relative" />

      {/* Floating Status Badges inside Map */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 border border-slate-700 px-2.5 py-1.5 rounded-lg shadow-lg text-[11px] text-slate-300 font-mono backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Tọa độ trung tâm: 13.235°B, 107.876°Đ (Xã Ea Súp)</span>
          </div>
          <div>Bán kính giám sát liên xã: Ea Bung, Ea Rốk, Ia Lốp, Ia Rvê</div>
        </div>
      </div>
    </div>
  );
};
