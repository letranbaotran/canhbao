'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import {
  Ruler,
  X,
  Undo2,
  CheckCircle2,
  RotateCcw,
  Save,
  Navigation,
  Camera,
  Download,
  Send,
  MapPin,
  Footprints,
  MousePointerClick,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  calculateDakLakLandMetrics,
  calculatePointDistanceMeters,
  buildParcelGeoJSONString,
  buildParcelKMLString,
  type LandMeasurementMetrics,
} from '@/utils/landMeasurementMath';

export interface SavedLandParcel {
  id: string;
  name: string;
  mode: 'MANUAL' | 'GPS_WALK';
  latLngs: [number, number][];
  metrics: LandMeasurementMetrics;
  createdAt: string;
}

interface LandMeasureFloatingCardProps {
  isOpen: boolean;
  onClose: () => void;
  leafletMapRef: React.MutableRefObject<any>;
  mapWrapperRef: React.MutableRefObject<HTMLDivElement | null>;
}

const SAVED_PARCELS_STORAGE_KEY = 'easup_saved_land_parcels_v1';

export const LandMeasureFloatingCard: React.FC<LandMeasureFloatingCardProps> = ({
  isOpen,
  onClose,
  leafletMapRef,
  mapWrapperRef,
}) => {
  // 2 Chế độ đo: MANUAL (Chấm điểm trên bản đồ vệ tinh) | GPS_WALK (Đi bộ đo bằng GPS thực địa)
  const [measureMode, setMeasureMode] = useState<'MANUAL' | 'GPS_WALK'>('MANUAL');
  const [isPinningActive, setIsPinningActive] = useState<boolean>(true);
  const [vertices, setVertices] = useState<[number, number][]>([]);
  const [isPolygonClosed, setIsPolygonClosed] = useState<boolean>(false);
  const [parcelName, setParcelName] = useState<string>('');
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [isCapturingPng, setIsCapturingPng] = useState<boolean>(false);
  const [savedParcels, setSavedParcels] = useState<SavedLandParcel[]>([]);

  // Trạng thái GPS Thực địa (Chế độ 2)
  const [isGpsTracking, setIsGpsTracking] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsRejectedCount, setGpsRejectedCount] = useState<number>(0);

  // Refs quản lý Geoman, lớp vẽ Leaflet và watchId GPS
  const watchIdRef = useRef<number | null>(null);
  const measureLayerGroupRef = useRef<any>(null);
  const activePolygonLayerRef = useRef<any>(null);
  const savedParcelsGroupRef = useRef<any>(null);
  const geomanLoadedRef = useRef<boolean>(false);
  const verticesRef = useRef<[number, number][]>([]);
  verticesRef.current = vertices;

  // Tính toán thông số diện tích chuẩn Đắk Lắk & Tây Nguyên theo thời gian thực
  const metrics = calculateDakLakLandMetrics(vertices);

  const showToast = useCallback((msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Tải danh sách thửa đất đã lưu trong localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(SAVED_PARCELS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedParcels(parsed);
        }
      }
    } catch {}
  }, []);

  // Hàm giải phóng toàn bộ tài nguyên GPS & Geoman (Yêu cầu 5: Không làm nóng máy hay hao pin điện thoại)
  const releaseAllMeasurementResources = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {}
      watchIdRef.current = null;
    }
    setIsGpsTracking(false);

    const map = leafletMapRef.current;
    if (map) {
      try {
        const container = map.getContainer?.();
        if (container) {
          container.classList.remove('easup-pinning-cursor');
        }
        if (map.pm) {
          map.pm.disableDraw();
          map.pm.disableGlobalEditMode();
        }
      } catch {}
    }
  }, [leafletMapRef]);

  // Vẽ cập nhật đa giác & các đỉnh trên bản đồ Leaflet
  const syncPolygonOnMap = useCallback(
    (pts: [number, number][], closed: boolean, mode: 'MANUAL' | 'GPS_WALK') => {
      const map = leafletMapRef.current;
      if (!map) return;

      import('leaflet').then((L) => {
        if (!measureLayerGroupRef.current) {
          measureLayerGroupRef.current = L.featureGroup().addTo(map);
        }
        const group = measureLayerGroupRef.current;
        group.clearLayers();

        if (pts.length === 0) {
          activePolygonLayerRef.current = null;
          return;
        }

        const strokeColor = mode === 'GPS_WALK' ? '#ea580c' : '#f59e0b';
        const fillColor = mode === 'GPS_WALK' ? '#f97316' : '#fbbf24';

        // Vẽ đường nối hoặc đa giác màu cam mờ
        if (pts.length >= 3) {
          const poly = L.polygon(pts, {
            color: strokeColor,
            weight: 3,
            fillColor: fillColor,
            fillOpacity: 0.35,
            dashArray: closed ? undefined : '6, 4',
          }).addTo(group);
          activePolygonLayerRef.current = poly;
        } else if (pts.length === 2) {
          L.polyline(pts, {
            color: strokeColor,
            weight: 3,
            dashArray: '6, 4',
          }).addTo(group);
        }

        // Vẽ từng mốc đỉnh có đánh số thứ tự rõ nét trên ảnh vệ tinh
        pts.forEach(([lat, lng], idx) => {
          const isFirst = idx === 0;
          const vertexIcon = L.divIcon({
            className: 'easup-land-vertex-icon',
            html: `<div style="width:20px;height:20px;border-radius:9999px;background:${
              isFirst ? '#dc2626' : '#ea580c'
            };color:#fff;border:2px solid #fff;font-size:10px;font-weight:800;font-family:monospace;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.65);transform:translate(-10px,-10px);cursor:grab;">${
              idx + 1
            }</div>`,
            iconSize: [0, 0],
          });

          const marker = L.marker([lat, lng], {
            icon: vertexIcon,
            draggable: true,
          }).addTo(group);

          // Cho phép kéo sửa vị trí đỉnh trực tiếp và tính lại diện tích thời gian thực
          marker.on('drag', (e: any) => {
            const newLatLng = e.target.getLatLng();
            if (!newLatLng) return;
            setVertices((prev) => {
              const next = [...prev];
              next[idx] = [Number(newLatLng.lat.toFixed(6)), Number(newLatLng.lng.toFixed(6))];
              return next;
            });
          });
        });
      });
    },
    [leafletMapRef]
  );

  // Đồng bộ vẽ khi danh sách đỉnh thay đổi
  useEffect(() => {
    if (!isOpen) return;
    syncPolygonOnMap(vertices, isPolygonClosed, measureMode);
  }, [vertices, isPolygonClosed, measureMode, isOpen, syncPolygonOnMap]);

  // Kích hoạt Geoman & sự kiện chấm điểm trên bản đồ vệ tinh khi mở công cụ
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!isOpen || !map) {
      releaseAllMeasurementResources();
      if (measureLayerGroupRef.current && map) {
        try {
          measureLayerGroupRef.current.clearLayers();
        } catch {}
      }
      return;
    }

    let isCancelled = false;

    const isActivelyPinning = measureMode === 'MANUAL' && isPinningActive && !isPolygonClosed;

    // Đồng bộ con trỏ chuột dạng Ghim Chấm Điểm Vị Trí trên toàn vùng bản đồ vệ tinh
    try {
      const container = map.getContainer?.();
      if (container) {
        if (isActivelyPinning) {
          container.classList.add('easup-pinning-cursor');
        } else {
          container.classList.remove('easup-pinning-cursor');
        }
      }
    } catch {}

    const initGeomanAndListeners = async () => {
      await import('leaflet');
      await import('@geoman-io/leaflet-geoman-free');
      if (isCancelled || !leafletMapRef.current) return;

      const currentMap = leafletMapRef.current;
      geomanLoadedRef.current = true;

      if (currentMap.pm) {
        try {
          currentMap.pm.setGlobalOptions({
            snappable: true,
            snapDistance: 20,
            allowSelfIntersection: false,
            templineStyle: { color: '#f59e0b', weight: 2.5, dashArray: '5, 5' },
            hintlineStyle: { color: '#fbbf24', weight: 2, dashArray: '4, 4' },
            pathOptions: {
              color: '#ea580c',
              fillColor: '#f97316',
              fillOpacity: 0.35,
              weight: 3,
            },
          });

          if (isActivelyPinning) {
            currentMap.pm.enableDraw('Polygon', {
              snappable: true,
              snapDistance: 20,
              finishOn: 'dblclick',
            });
          } else {
            currentMap.pm.disableDraw();
          }
        } catch {}
      }
    };

    initGeomanAndListeners();

    // Lắng nghe sự kiện chấm điểm trực tiếp trên bản đồ ở Chế độ 1 (Thủ công)
    const handleMapClick = (e: any) => {
      if (!isActivelyPinning) return;
      if (!e?.latlng) return;
      const newPt: [number, number] = [
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6)),
      ];
      setVertices((prev) => [...prev, newPt]);
    };

    // Lắng nghe khi Geoman hoàn tất vẽ Polygon
    const handlePmCreate = (e: any) => {
      if (e?.layer) {
        try {
          const rawLatLngs = e.layer.getLatLngs?.();
          const ring = Array.isArray(rawLatLngs?.[0]) ? rawLatLngs[0] : rawLatLngs;
          if (Array.isArray(ring) && ring.length >= 3) {
            const pts: [number, number][] = ring.map((ll: any) => [
              Number(ll.lat.toFixed(6)),
              Number(ll.lng.toFixed(6)),
            ]);
            setVertices(pts);
            setIsPolygonClosed(true);
            setIsPinningActive(false);
          }
          // Xóa layer tạm của Geoman vì đã có measureLayerGroupRef quản lý đồng bộ
          map.removeLayer(e.layer);
          map.pm?.disableDraw();
        } catch {}
      }
    };

    map.on('click', handleMapClick);
    map.on('pm:create', handlePmCreate);

    return () => {
      isCancelled = true;
      map.off('click', handleMapClick);
      map.off('pm:create', handlePmCreate);
      try {
        map.getContainer?.()?.classList.remove('easup-pinning-cursor');
      } catch {}
    };
  }, [isOpen, measureMode, isPinningActive, isPolygonClosed, leafletMapRef, releaseAllMeasurementResources]);

  // Giải phóng toàn bộ tài nguyên khi unmount component
  useEffect(() => {
    return () => {
      releaseAllMeasurementResources();
    };
  }, [releaseAllMeasurementResources]);

  // Chuyển chế độ giữa Chấm điểm Thủ công & Đi bộ GPS (Bấm vào "1. Chấm điểm vệ tinh" sẽ lõm xuống & đổi con trỏ chuột sang dạng chấm điểm vị trí)
  const handleSwitchMode = (nextMode: 'MANUAL' | 'GPS_WALK') => {
    if (nextMode === 'MANUAL') {
      if (measureMode === 'MANUAL') {
        if (isPolygonClosed) {
          setIsPolygonClosed(false);
          setIsPinningActive(true);
          showToast('Đã bật chế độ chấm điểm vị trí trên bản đồ vệ tinh.');
        } else {
          const nextPinning = !isPinningActive;
          setIsPinningActive(nextPinning);
          showToast(
            nextPinning
              ? 'Đã bật chế độ chấm điểm vị trí trên bản đồ vệ tinh.'
              : 'Đã tạm tắt con trỏ chấm điểm.'
          );
        }
        return;
      }
      releaseAllMeasurementResources();
      setMeasureMode('MANUAL');
      setIsPolygonClosed(false);
      setIsPinningActive(true);
      showToast('Đã bật chế độ chấm điểm vị trí trên bản đồ vệ tinh.');
      return;
    }

    releaseAllMeasurementResources();
    setMeasureMode('GPS_WALK');
    setIsPolygonClosed(false);
    setIsPinningActive(false);
  };

  // CHẾ ĐỘ 1 - Nút 1: Hoàn tác 1 điểm
  const handleUndoVertex = () => {
    const map = leafletMapRef.current;
    if (map?.pm?.Draw?.Polygon?._removeLastVertex) {
      try {
        map.pm.Draw.Polygon._removeLastVertex();
      } catch {}
    }
    setVertices((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      if (next.length < 3) setIsPolygonClosed(false);
      return next;
    });
    showToast('Đã hoàn tác 1 điểm góc ranh.');
  };

  // CHẾ ĐỘ 1 - Nút 2: Đóng ranh thửa
  const handleClosePolygon = () => {
    if (vertices.length < 3) {
      showToast('Cần chấm ít nhất 3 góc ranh để đóng thửa đất!');
      return;
    }
    const map = leafletMapRef.current;
    if (map?.pm) {
      try {
        map.pm.disableDraw();
      } catch {}
    }
    setIsPolygonClosed(true);
    setIsPinningActive(false);
    showToast('Đã đóng ranh thửa đất! Bạn có thể kéo các đỉnh để tinh chỉnh.');
  };

  // CHẾ ĐỘ 1 & 2 - Nút 3: Xóa đo lại
  const handleClearMeasurement = () => {
    releaseAllMeasurementResources();
    setVertices([]);
    setIsPolygonClosed(false);
    if (measureMode === 'MANUAL') {
      setIsPinningActive(true);
    }
    setGpsAccuracy(null);
    setGpsRejectedCount(0);

    const map = leafletMapRef.current;
    if (measureLayerGroupRef.current) {
      try {
        measureLayerGroupRef.current.clearLayers();
      } catch {}
    }
    if (measureMode === 'MANUAL' && map?.pm) {
      try {
        map.pm.enableDraw('Polygon', { snappable: true, snapDistance: 20 });
      } catch {}
    }
    showToast('Đã xóa ranh cũ, sẵn sàng đo thửa mới.');
  };

  // CHẾ ĐỘ 1 & 2 - Nút 4: Lưu thửa đất
  const handleSaveParcel = () => {
    if (vertices.length < 3) {
      showToast('Vui lòng đo ít nhất 3 góc ranh trước khi lưu thửa đất!');
      return;
    }

    const finalName =
      parcelName.trim() || `Thửa đất xã Ea Súp #${savedParcels.length + 1}`;
    const newParcel: SavedLandParcel = {
      id: `PARCEL_${Date.now()}`,
      name: finalName,
      mode: measureMode,
      latLngs: vertices,
      metrics,
      createdAt: new Date().toLocaleString('vi-VN'),
    };

    const nextList = [newParcel, ...savedParcels];
    setSavedParcels(nextList);
    try {
      localStorage.setItem(SAVED_PARCELS_STORAGE_KEY, JSON.stringify(nextList));
    } catch {}

    // Hiển thị thửa đất đã lưu lên bản đồ kèm nhãn diện tích
    const map = leafletMapRef.current;
    if (map) {
      import('leaflet').then((L) => {
        if (!savedParcelsGroupRef.current) {
          savedParcelsGroupRef.current = L.featureGroup().addTo(map);
        }
        const poly = L.polygon(vertices, {
          color: '#ea580c',
          weight: 2.5,
          fillColor: '#f97316',
          fillOpacity: 0.3,
        }).addTo(savedParcelsGroupRef.current);

        poly.bindPopup(`
          <div style="font-family:sans-serif;font-size:12px;line-height:1.5;min-width:190px;">
            <div style="font-weight:800;color:#9a3412;border-bottom:1px solid #fed7aa;padding-bottom:3px;margin-bottom:4px;">
              📐 ${finalName}
            </div>
            <div>• <b>Mét vuông:</b> ${metrics.formatted.sqm}</div>
            <div>• <b>Sào Tây Nguyên:</b> <span style="color:#c2410c;font-weight:800;">${metrics.formatted.sao}</span></div>
            <div>• <b>Hecta:</b> ${metrics.formatted.hectare}</div>
            <div>• <b>Chu vi bờ rào:</b> ${metrics.formatted.perimeter}</div>
          </div>
        `);
      });
    }

    setIsPolygonClosed(true);
    showToast(`Đã lưu "${finalName}" (${metrics.formatted.sao})!`);
  };

  // Xóa 1 thửa đất đã lưu
  const handleDeleteSavedParcel = (id: string) => {
    const nextList = savedParcels.filter((p) => p.id !== id);
    setSavedParcels(nextList);
    try {
      localStorage.setItem(SAVED_PARCELS_STORAGE_KEY, JSON.stringify(nextList));
    } catch {}
    showToast('Đã xóa thửa đất khỏi danh sách lưu.');
  };

  // CHẾ ĐỘ 2: Bắt đầu / Kết thúc Đi bộ đo bằng GPS (Thực địa)
  const handleToggleGpsWalk = () => {
    if (isGpsTracking) {
      // KẾT THÚC & TÍNH DIỆN TÍCH
      releaseAllMeasurementResources();
      if (vertices.length >= 3) {
        setIsPolygonClosed(true);
        showToast(`Đã kết thúc đo GPS! Diện tích: ${metrics.formatted.sao}`);
      } else {
        showToast('Đã dừng thu nhận tín hiệu GPS thực địa.');
      }
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      showToast('Thiết bị hoặc trình duyệt không hỗ trợ định vị GPS!');
      return;
    }

    const map = leafletMapRef.current;
    if (map?.pm) {
      try {
        map.pm.disableDraw();
      } catch {}
    }

    setIsPolygonClosed(false);
    setIsGpsTracking(true);
    setGpsRejectedCount(0);
    showToast('Đang thu tín hiệu vệ tinh GPS thực địa (chỉ nhận sai số < 12m)...');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = Number(pos.coords.accuracy.toFixed(1));
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setGpsAccuracy(acc);

        // Bộ lọc khử nhiễu: Chỉ nhận tọa độ có accuracy < 12m
        if (acc >= 12) {
          setGpsRejectedCount((prev) => prev + 1);
          return;
        }

        const currentPts = verticesRef.current;
        if (currentPts.length === 0) {
          setVertices([[lat, lng]]);
          if (leafletMapRef.current) {
            leafletMapRef.current.flyTo([lat, lng], 18, { duration: 0.8 });
          }
          return;
        }

        // Chỉ ghi nhận đỉnh mới khi di chuyển cách điểm trước >= 2.5m
        const lastPt = currentPts[currentPts.length - 1];
        const dist = calculatePointDistanceMeters(lastPt, [lat, lng]);
        if (dist >= 2.5) {
          setVertices((prev) => [...prev, [lat, lng]]);
          if (leafletMapRef.current) {
            leafletMapRef.current.panTo([lat, lng]);
          }
        }
      },
      (err) => {
        showToast(`Cảnh báo tín hiệu GPS: ${err.message || 'Đang dò lại vệ tinh...'}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000,
      }
    );
  };

  // TIỆN ÍCH 1: Chụp ảnh kết quả (.png) bằng html2canvas kèm bảng thông số diện tích
  const handleCaptureResultImage = async () => {
    if (vertices.length < 3) {
      showToast('Vui lòng đo xong ranh thửa đất (ít nhất 3 điểm) trước khi chụp ảnh!');
      return;
    }
    if (!mapWrapperRef.current) return;

    try {
      setIsCapturingPng(true);
      showToast('Đang kết xuất ảnh vệ tinh kèm bảng diện tích thửa đất...');

      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;

      const rawCanvas = await html2canvas(mapWrapperRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0f172a',
        scale: 2,
        ignoreElements: (el) => el.id === 'land-measure-floating-card',
      });

      // Vẽ thêm khung thông tin kết quả đo đất sắc nét ở góc dưới ảnh PNG
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = rawCanvas.width;
      finalCanvas.height = rawCanvas.height;
      const ctx = finalCanvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(rawCanvas, 0, 0);

        const bannerH = Math.max(150, Math.round(finalCanvas.height * 0.18));
        const bannerY = finalCanvas.height - bannerH;

        ctx.fillStyle = 'rgba(10, 67, 147, 0.94)';
        ctx.fillRect(0, bannerY, finalCanvas.width, bannerH);

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, bannerY);
        ctx.lineTo(finalCanvas.width, bannerY);
        ctx.stroke();

        const titleText =
          (parcelName.trim() || 'THỬA ĐẤT ĐO ĐẠC THỰC ĐỊA - XÃ EA SÚP, TỈNH ĐẮK LẮK').toUpperCase();
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(`📐 ${titleText}`, 28, bannerY + 42);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(
          `Diện tích: ${metrics.formatted.sqm}  |  ${metrics.formatted.sao} (Tây Nguyên)  |  ${metrics.formatted.hectare}`,
          28,
          bannerY + 86
        );

        ctx.fillStyle = '#bae6fd';
        ctx.font = '20px monospace';
        ctx.fillText(
          `Chu vi bờ rào: ${metrics.formatted.perimeter} (${metrics.vertexCount} góc ranh) • Ngày đo: ${new Date().toLocaleString('vi-VN')} • canhbao.easupso.com`,
          28,
          bannerY + 124
        );
      }

      const dataUrl = (ctx ? finalCanvas : rawCanvas).toDataURL('image/png');
      const safeSlug = (parcelName.trim() || 'thua-dat-easup')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      const link = document.createElement('a');
      link.download = `do-dat-${safeSlug}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      showToast('Đã tải ảnh kết quả đo đất (.PNG) về máy!');
    } catch {
      showToast('Không thể chụp tự động, vui lòng thử lại.');
    } finally {
      setIsCapturingPng(false);
    }
  };

  // TIỆN ÍCH 2: Xuất file GeoJSON / KML
  const handleDownloadVectorFile = (format: 'GEOJSON' | 'KML') => {
    if (vertices.length < 3) {
      showToast('Cần ít nhất 3 góc ranh để xuất file tọa độ!');
      return;
    }

    const name = parcelName.trim() || 'Thua dat xa Ea Sup';
    const safeSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const content =
      format === 'GEOJSON'
        ? buildParcelGeoJSONString(name, vertices, metrics, measureMode)
        : buildParcelKMLString(name, vertices, metrics, measureMode);

    const mimeType =
      format === 'GEOJSON' ? 'application/geo+json;charset=utf-8' : 'application/vnd.google-earth.kml+xml;charset=utf-8';
    const ext = format === 'GEOJSON' ? 'geojson' : 'kml';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ranh-thua-${safeSlug}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`Đã tải xuống file tọa độ .${ext.toUpperCase()}!`);
  };

  // TIỆN ÍCH 3: Gửi phản ánh ranh đất về xã (ykien.easupso.com)
  const handleSendToCommunePortal = () => {
    if (vertices.length < 3) {
      showToast('Vui lòng đo ít nhất 3 góc ranh trước khi gửi phản ánh về xã!');
      return;
    }

    const title = parcelName.trim() || 'Phản ánh ranh thửa đất thực địa xã Ea Súp';
    const coordSummary = vertices
      .map(([lat, lng], idx) => `Mốc ${idx + 1}: (${lat.toFixed(6)}, ${lng.toFixed(6)})`)
      .join('; ');

    const fullReportText = [
      `[PHẢN ÁNH RANH ĐẤT THỰC ĐỊA - XÃ EA SÚP]`,
      `- Tên thửa đất/vườn cây: ${title}`,
      `- Diện tích: ${metrics.formatted.sqm} (${metrics.formatted.sao} / ${metrics.formatted.hectare})`,
      `- Chu vi bờ rào: ${metrics.formatted.perimeter} (${metrics.vertexCount} mốc góc ranh)`,
      `- Tọa độ các mốc ranh (WGS84): ${coordSummary}`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullReportText).catch(() => {});
    }

    const targetUrl = new URL('https://ykien.easupso.com');
    targetUrl.searchParams.set('source', 'canhbao.easupso.com');
    targetUrl.searchParams.set('type', 'ranh_dat_thuc_dia');
    targetUrl.searchParams.set('title', title);
    targetUrl.searchParams.set('area_m2', metrics.areaSqm.toFixed(1));
    targetUrl.searchParams.set('area_sao', metrics.areaSaoTayNguyen.toFixed(2));
    targetUrl.searchParams.set('area_ha', metrics.areaHectare.toFixed(3));
    targetUrl.searchParams.set('perimeter_m', metrics.perimeterMeters.toFixed(1));
    targetUrl.searchParams.set('coords', JSON.stringify(vertices));

    window.open(targetUrl.toString(), '_blank', 'noopener,noreferrer');
    showToast('Đã sao chép tọa độ & chuyển sang Cổng ý kiến cử tri ykien.easupso.com!');
  };

  // Nút đóng công cụ: tự động giải phóng GPS & Geoman
  const handleCloseTool = () => {
    releaseAllMeasurementResources();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="land-measure-floating-card"
      className="fixed sm:absolute bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:top-3 sm:right-3 z-[560] w-full sm:w-[370px] max-h-[80dvh] sm:max-h-[530px] bg-white/98 backdrop-blur-md border-t-2 sm:border-2 border-[#0A4393] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs font-sans animate-fadeIn"
      role="dialog"
      aria-label="Công cụ đo diện tích đất và khoanh ranh thửa thực địa"
    >
      {/* Thanh kéo trên Mobile Bottom Sheet */}
      <div className="sm:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mt-1.5 mb-0.5 shrink-0" />

      {/* Header Công cụ Đo Đất */}
      <div className="bg-gradient-to-r from-[#0A4393] via-[#0E56BD] to-[#0A4393] text-white px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 font-extrabold text-[11.5px] uppercase tracking-tight">
          <Ruler className="w-4 h-4 text-amber-300 shrink-0" />
          <span>Đo Diện Tích Đất &amp; Khoanh Ranh Thửa</span>
        </div>
        <button
          type="button"
          onClick={handleCloseTool}
          className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
          title="Đóng công cụ đo đất (Tự động ngắt GPS để tiết kiệm pin)"
          aria-label="Đóng công cụ đo đất"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bộ chuyển 2 Chế độ đo đất: Nút "1. Chấm điểm vệ tinh" có hiệu ứng lõm sâu 3D khi kích hoạt */}
      <div className="p-1.5 bg-[#F0F6FF] border-b border-[#0A4393]/20 grid grid-cols-2 gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => handleSwitchMode('MANUAL')}
          aria-pressed={measureMode === 'MANUAL' && isPinningActive && !isPolygonClosed}
          className={`py-1.5 px-2 rounded-lg font-bold text-[10.5px] flex items-center justify-center gap-1 transition-all duration-150 cursor-pointer select-none ${
            measureMode === 'MANUAL' && isPinningActive && !isPolygonClosed
              ? 'translate-y-[2px] scale-[0.97] bg-[#041E46] text-amber-300 border-t-2 border-l-2 border-[#010B1C] border-b border-r border-blue-400/50 shadow-[inset_0_4px_8px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(0,0,0,0.65)] ring-2 ring-amber-400/90'
              : measureMode === 'MANUAL'
                ? 'bg-gradient-to-b from-[#1659C2] to-[#0A4393] text-white border-b-[3px] border-[#052350] shadow-md hover:brightness-105'
                : 'bg-white text-[#0A4393] border border-b-[3px] border-[#0A4393]/30 hover:bg-blue-50 shadow-xs'
          }`}
          title={
            measureMode === 'MANUAL' && isPinningActive && !isPolygonClosed
              ? 'Đang bật chế độ chấm điểm vị trí (Nhấn để tạm tắt con trỏ chấm điểm)'
              : 'Nhấn để bật con trỏ chấm điểm vị trí trên bản đồ vệ tinh'
          }
        >
          {measureMode === 'MANUAL' && isPinningActive && !isPolygonClosed ? (
            <MapPin className="w-3.5 h-3.5 text-amber-300 animate-bounce shrink-0" />
          ) : (
            <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>1. Chấm điểm vệ tinh</span>
          {measureMode === 'MANUAL' && isPinningActive && !isPolygonClosed && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0 ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSwitchMode('GPS_WALK')}
          className={`py-1.5 px-2 rounded-lg font-bold text-[10.5px] flex items-center justify-center gap-1 transition-all duration-150 cursor-pointer select-none ${
            measureMode === 'GPS_WALK'
              ? 'translate-y-[2px] scale-[0.97] bg-[#9A3412] text-amber-200 border-t-2 border-l-2 border-[#431407] border-b border-r border-orange-300/50 shadow-[inset_0_4px_8px_rgba(0,0,0,0.75)] ring-2 ring-amber-400/80'
              : 'bg-white text-[#9A3412] border border-b-[3px] border-orange-300 hover:bg-orange-50 shadow-xs'
          }`}
        >
          <Footprints className="w-3.5 h-3.5 shrink-0" />
          <span>2. Đi bộ đo GPS</span>
        </button>
      </div>

      {/* Nội dung cuộn mượt */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {/* HƯỚNG DẪN & ĐIỀU KHIỂN THEO CHẾ ĐỘ */}
        {measureMode === 'MANUAL' ? (
          <div className="p-2 rounded-xl bg-amber-50/90 border border-amber-300 space-y-2">
            <p className="text-[11px] font-semibold text-amber-950 flex items-center gap-1.5 leading-snug">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Chạm lần lượt các góc bờ ranh thửa đất trên ảnh vệ tinh để đo.</span>
            </p>

            {/* 4 Nút điều khiển Chế độ 1 */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleUndoVertex}
                disabled={vertices.length === 0}
                className="px-2 py-1.5 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-45 text-slate-800 border border-slate-300 font-bold text-[10.5px] flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-all"
              >
                <Undo2 className="w-3.5 h-3.5 text-[#0A4393]" />
                <span>Hoàn tác 1 điểm</span>
              </button>

              <button
                type="button"
                onClick={handleClosePolygon}
                disabled={vertices.length < 3 || isPolygonClosed}
                className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white font-bold text-[10.5px] flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đóng ranh thửa</span>
              </button>

              <button
                type="button"
                onClick={handleClearMeasurement}
                className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-[10.5px] flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa đo lại</span>
              </button>

              <button
                type="button"
                onClick={handleSaveParcel}
                disabled={vertices.length < 3}
                className="px-2 py-1.5 rounded-lg bg-[#0A4393] hover:bg-[#083576] disabled:opacity-45 text-white font-bold text-[10.5px] flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu thửa đất</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-orange-50/90 border border-orange-300 space-y-2">
            <p className="text-[11px] font-semibold text-orange-950 flex items-center gap-1.5 leading-snug">
              <Navigation className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>Cầm điện thoại đi dọc theo hàng rào hoặc bờ ranh đất (Tự lọc sai số &lt; 12m, bước ghi &ge; 2.5m).</span>
            </p>

            {/* Nút lớn BẮT ĐẦU ĐO GPS -> KẾT THÚC & TÍNH DIỆN TÍCH */}
            <button
              type="button"
              onClick={handleToggleGpsWalk}
              className={`w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-98 ${
                isGpsTracking
                  ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white animate-pulse border-2 border-red-200'
                  : 'bg-gradient-to-r from-[#EA580C] to-[#C2410C] hover:brightness-110 text-white'
              }`}
            >
              <Footprints className="w-4 h-4 shrink-0" />
              <span>
                {isGpsTracking ? 'KẾT THÚC & TÍNH DIỆN TÍCH' : 'BẮT ĐẦU ĐO GPS'}
              </span>
            </button>

            {/* 3 Thông số trực tiếp của Chế độ Đi bộ GPS */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-center font-mono">
              <div className="bg-white p-1.5 rounded-lg border border-orange-200">
                <div className="text-[9px] text-slate-500 font-sans">Độ chính xác GPS</div>
                <div
                  className={`text-[11px] font-extrabold ${
                    gpsAccuracy !== null && gpsAccuracy < 12 ? 'text-emerald-700' : 'text-amber-600'
                  }`}
                >
                  {gpsAccuracy !== null ? `±${gpsAccuracy} m` : '±-- m'}
                </div>
              </div>

              <div className="bg-white p-1.5 rounded-lg border border-orange-200">
                <div className="text-[9px] text-slate-500 font-sans">Quãng đường đã đi</div>
                <div className="text-[11px] font-extrabold text-[#0A4393]">
                  {metrics.walkedDistanceMeters.toFixed(1)} m
                </div>
              </div>

              <div className="bg-white p-1.5 rounded-lg border border-orange-200">
                <div className="text-[9px] text-slate-500 font-sans">Diện tích hiện tại</div>
                <div className="text-[11px] font-extrabold text-orange-700">
                  {metrics.areaSaoTayNguyen.toFixed(2)} Sào
                </div>
              </div>
            </div>

            {gpsRejectedCount > 0 && (
              <div className="text-[10px] text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                Đã lọc bỏ {gpsRejectedCount} tín hiệu nhiễu GPS (sai số &ge; 12m).
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearMeasurement}
                className="flex-1 py-1 px-2 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Xóa đo lại</span>
              </button>
              <button
                type="button"
                onClick={handleSaveParcel}
                disabled={vertices.length < 3}
                className="flex-1 py-1 px-2 rounded-lg bg-[#0A4393] hover:bg-[#083576] disabled:opacity-45 text-white font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
              >
                <Save className="w-3 h-3" />
                <span>Lưu thửa đất</span>
              </button>
            </div>
          </div>
        )}

        {/* BẢNG QUY ĐỔI ĐƠN VỊ CHUẨN ĐẮK LẮK & TÂY NGUYÊN (3 Đơn vị diện tích + Chu vi bờ rào) */}
        <div className="p-2.5 rounded-xl bg-[#F4F8FD] border-2 border-[#0A4393]/25 space-y-2">
          <div className="flex items-center justify-between border-b border-[#0A4393]/15 pb-1">
            <span className="font-extrabold text-[11px] text-[#0A4393] uppercase">
              📊 Kết Quả Quy Đổi Chuẩn Tây Nguyên
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#0A4393]">
              {metrics.vertexCount} góc ranh
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 font-mono">
            {/* 1. Mét vuông */}
            <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
              <div className="text-[9.5px] text-slate-500 font-sans font-semibold">
                Mét vuông (Geodesic)
              </div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {metrics.formatted.sqm}
              </div>
            </div>

            {/* 2. Sào Tây Nguyên (1 Sào = 1.000 m²) */}
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 shadow-2xs">
              <div className="text-[9.5px] text-amber-900 font-sans font-semibold">
                Sào Tây Nguyên (1.000m²)
              </div>
              <div className="text-sm font-black text-orange-700 mt-0.5">
                {metrics.formatted.sao}
              </div>
            </div>

            {/* 3. Hecta (1 Ha = 10.000 m²) */}
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-300 shadow-2xs">
              <div className="text-[9.5px] text-emerald-900 font-sans font-semibold">
                Hecta (10.000m²)
              </div>
              <div className="text-sm font-black text-emerald-800 mt-0.5">
                {metrics.formatted.hectare}
              </div>
            </div>

            {/* 4. Chu vi bờ rào */}
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 shadow-2xs">
              <div className="text-[9.5px] text-[#0A4393] font-sans font-semibold">
                Chu vi bờ rào (Cọc/Kẽm)
              </div>
              <div className="text-sm font-black text-[#0A4393] mt-0.5">
                {metrics.formatted.perimeter}
              </div>
            </div>
          </div>
        </div>

        {/* TIỆN ÍCH SAU KHI ĐO: Tên thửa đất, Chụp ảnh PNG, Xuất GeoJSON/KML, Gửi phản ánh về xã */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2">
          <div>
            <label
              htmlFor="easup-parcel-name-input"
              className="block text-[10.5px] font-bold text-[#0A4393] mb-1"
            >
              🏷️ Tên thửa đất / vườn cây:
            </label>
            <input
              id="easup-parcel-name-input"
              type="text"
              value={parcelName}
              onChange={(e) => setParcelName(e.target.value)}
              placeholder="VD: Rẫy điều Thôn 8, Vườn sầu riêng Thôn Đoàn Kết, Ranh rừng TK 277..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#0A4393]/35 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A4393]"
            />
          </div>

          {/* Các nút xuất kết quả & gửi phản ánh */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleCaptureResultImage}
              disabled={isCapturingPng || vertices.length < 3}
              className="py-1.5 px-2 rounded-lg bg-[#0A4393] hover:bg-[#083576] disabled:opacity-45 text-white font-bold text-[10.5px] flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-all"
              title="Chụp lại vùng thửa đất vừa đo trên nền ảnh vệ tinh kèm bảng diện tích (.png)"
            >
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span>{isCapturingPng ? 'Đang chụp...' : 'Chụp ảnh kết quả'}</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleDownloadVectorFile('GEOJSON')}
                disabled={vertices.length < 3}
                className="flex-1 py-1.5 px-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-45 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-all"
                title="Tải file tọa độ chuẩn GeoJSON"
              >
                <Download className="w-3 h-3 shrink-0" />
                <span>GeoJSON</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadVectorFile('KML')}
                disabled={vertices.length < 3}
                className="flex-1 py-1.5 px-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-45 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-all"
                title="Tải file tọa độ chuẩn KML mở trên Google Earth"
              >
                <Download className="w-3 h-3 shrink-0" />
                <span>KML</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendToCommunePortal}
            disabled={vertices.length < 3}
            className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 disabled:opacity-45 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
            title="Chuyển tọa độ đa giác và diện tích sang Cổng ý kiến cử tri xã Ea Súp (ykien.easupso.com)"
          >
            <Send className="w-3.5 h-3.5 shrink-0" />
            <span>Gửi phản ánh ranh đất về xã (ykien.easupso.com)</span>
          </button>
        </div>

        {/* Danh sách các thửa đất đã lưu trên thiết bị */}
        {savedParcels.length > 0 && (
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="text-[10.5px] font-bold text-slate-700 flex items-center justify-between">
              <span>🗂️ Thửa đất đã lưu ({savedParcels.length})</span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1 pr-0.5">
              {savedParcels.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-200 text-[10.5px]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setParcelName(item.name);
                      setVertices(item.latLngs);
                      setIsPolygonClosed(true);
                      if (leafletMapRef.current && item.latLngs.length > 0) {
                        leafletMapRef.current.flyTo(item.latLngs[0], 17, { duration: 0.7 });
                      }
                    }}
                    className="flex-1 min-w-0 text-left truncate hover:text-[#0A4393] cursor-pointer"
                    title="Nhấn để xem lại thửa đất này trên bản đồ"
                  >
                    <span className="font-bold text-slate-800">{item.name}</span>{' '}
                    <span className="font-mono text-orange-700 font-bold">
                      ({item.metrics.formatted.sao})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSavedParcel(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                    title="Xóa thửa đất này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {statusToast && (
          <div className="p-2 rounded-lg bg-[#0A4393] text-white text-[11px] font-semibold text-center shadow-md animate-fadeIn">
            {statusToast}
          </div>
        )}
      </div>
    </div>
  );
};

