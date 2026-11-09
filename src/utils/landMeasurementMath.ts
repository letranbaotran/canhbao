import area from '@turf/area';
import length from '@turf/length';
import { polygon, lineString } from '@turf/helpers';

export interface LandMeasurementMetrics {
  /** Diện tích Geodesic tính bằng mét vuông (m²) */
  areaSqm: number;
  /** Diện tích quy đổi Sào Tây Nguyên (1 Sào = 1.000 m²) */
  areaSaoTayNguyen: number;
  /** Diện tích quy đổi Hecta (1 Ha = 10.000 m²) */
  areaHectare: number;
  /** Chu vi bờ rào tính bằng mét (m) */
  perimeterMeters: number;
  /** Quãng đường đi bộ liên tiếp qua các đỉnh (m) */
  walkedDistanceMeters: number;
  /** Số đỉnh ranh thửa hiện tại */
  vertexCount: number;
  /** Chuỗi định dạng hiển thị chuẩn Việt Nam */
  formatted: {
    sqm: string;
    sao: string;
    hectare: string;
    perimeter: string;
    walkedDistance: string;
  };
}

/**
 * Tính khoảng cách Geodesic (Haversine) giữa 2 điểm GPS [lat, lng] theo mét (m).
 * Dùng cho bộ lọc khử nhiễu GPS thực địa (chỉ ghi nhận đỉnh khi di chuyển >= 2.5m).
 */
export function calculatePointDistanceMeters(
  pt1: [number, number],
  pt2: [number, number]
): number {
  const R = 6371000; // Bán kính Trái Đất (m)
  const dLat = ((pt2[0] - pt1[0]) * Math.PI) / 180;
  const dLng = ((pt2[1] - pt1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pt1[0] * Math.PI) / 180) *
      Math.cos((pt2[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Thuật toán quy đổi đơn vị chuẩn Đắk Lắk & Tây Nguyên:
 * - Sử dụng @turf/area để tính diện tích Geodesic (m²)
 * - Sử dụng @turf/length để tính chu vi bờ rào (m)
 * - Quy đổi chuẩn: 1 Sào Tây Nguyên = 1.000 m², 1 Hecta = 10.000 m²
 * @param latLngs Danh sách tọa độ [lat, lng] của các góc ranh thửa đất
 */
export function calculateDakLakLandMetrics(
  latLngs: [number, number][]
): LandMeasurementMetrics {
  const vertexCount = latLngs.length;

  if (vertexCount < 2) {
    return {
      areaSqm: 0,
      areaSaoTayNguyen: 0,
      areaHectare: 0,
      perimeterMeters: 0,
      walkedDistanceMeters: 0,
      vertexCount,
      formatted: {
        sqm: '0 m²',
        sao: '0.00 Sào',
        hectare: '0.000 Ha',
        perimeter: '0.0 m',
        walkedDistance: '0.0 m',
      },
    };
  }

  // Chuyển [lat, lng] sang chuẩn GeoJSON [lng, lat] cho Turf.js
  const lngLatCoords: [number, number][] = latLngs.map(([lat, lng]) => [lng, lat]);

  // 1. Tính quãng đường đã đi qua các điểm liên tiếp (m)
  const openLine = lineString(lngLatCoords);
  const walkedDistanceMeters = length(openLine, { units: 'meters' });

  // 2. Nếu mới có 2 điểm: chỉ có chiều dài cạnh, chưa tạo thành đa giác khép kín
  if (vertexCount === 2) {
    return {
      areaSqm: 0,
      areaSaoTayNguyen: 0,
      areaHectare: 0,
      perimeterMeters: walkedDistanceMeters,
      walkedDistanceMeters,
      vertexCount,
      formatted: {
        sqm: '0 m²',
        sao: '0.00 Sào',
        hectare: '0.000 Ha',
        perimeter: `${walkedDistanceMeters.toFixed(1)} m`,
        walkedDistance: `${walkedDistanceMeters.toFixed(1)} m`,
      },
    };
  }

  // 3. Từ 3 điểm trở lên: Đóng vòng đa giác để tính diện tích Geodesic & chu vi bờ rào
  const firstPt = lngLatCoords[0];
  const lastPt = lngLatCoords[lngLatCoords.length - 1];
  const closedRing: [number, number][] =
    firstPt[0] === lastPt[0] && firstPt[1] === lastPt[1]
      ? lngLatCoords
      : [...lngLatCoords, [firstPt[0], firstPt[1]]];

  const polyFeature = polygon([closedRing]);
  const closedLineFeature = lineString(closedRing);

  const areaSqm = Math.max(0, area(polyFeature));
  const perimeterMeters = Math.max(0, length(closedLineFeature, { units: 'meters' }));

  const areaSaoTayNguyen = areaSqm / 1000;
  const areaHectare = areaSqm / 10000;

  return {
    areaSqm,
    areaSaoTayNguyen,
    areaHectare,
    perimeterMeters,
    walkedDistanceMeters,
    vertexCount,
    formatted: {
      sqm: `${Math.round(areaSqm).toLocaleString('vi-VN')} m²`,
      sao: `${areaSaoTayNguyen.toFixed(2)} Sào`,
      hectare: `${areaHectare.toFixed(3)} Ha`,
      perimeter: `${perimeterMeters.toFixed(1)} m`,
      walkedDistance: `${walkedDistanceMeters.toFixed(1)} m`,
    },
  };
}

/**
 * Tạo chuỗi nội dung GeoJSON chuẩn từ ranh thửa đất vừa đo
 */
export function buildParcelGeoJSONString(
  parcelName: string,
  latLngs: [number, number][],
  metrics: LandMeasurementMetrics,
  mode: 'MANUAL' | 'GPS_WALK'
): string {
  const lngLatCoords: [number, number][] = latLngs.map(([lat, lng]) => [lng, lat]);
  const closedRing: [number, number][] =
    lngLatCoords.length >= 3
      ? [...lngLatCoords, [lngLatCoords[0][0], lngLatCoords[0][1]]]
      : lngLatCoords;

  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: parcelName || 'Thửa đất thực địa xã Ea Súp',
          commune: 'Xã Ea Súp, Tỉnh Đắk Lắk',
          measurementMode: mode === 'MANUAL' ? 'Chấm điểm vệ tinh' : 'Đi bộ GPS thực địa',
          area_m2: Number(metrics.areaSqm.toFixed(2)),
          area_sao_tay_nguyen: Number(metrics.areaSaoTayNguyen.toFixed(2)),
          area_ha: Number(metrics.areaHectare.toFixed(3)),
          perimeter_m: Number(metrics.perimeterMeters.toFixed(1)),
          vertex_count: metrics.vertexCount,
          measured_at: new Date().toISOString(),
        },
        geometry: {
          type: 'Polygon',
          coordinates: [closedRing],
        },
      },
    ],
  };

  return JSON.stringify(geojson, null, 2);
}

/**
 * Tạo chuỗi nội dung KML chuẩn Google Earth từ ranh thửa đất vừa đo
 */
export function buildParcelKMLString(
  parcelName: string,
  latLngs: [number, number][],
  metrics: LandMeasurementMetrics,
  mode: 'MANUAL' | 'GPS_WALK'
): string {
  const safeName = (parcelName || 'Thửa đất thực địa xã Ea Súp')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const closedPts =
    latLngs.length >= 3 ? [...latLngs, latLngs[0]] : latLngs;
  const kmlCoords = closedPts
    .map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)},0`)
    .join(' ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${safeName}</name>
    <description>Đo đạc trên Hệ thống canhbao.easupso.com (Xã Ea Súp, Tỉnh Đắk Lắk)</description>
    <Style id="easupParcelStyle">
      <LineStyle>
        <color>ff0073f9</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>661673f9</color>
      </PolyStyle>
    </Style>
    <Placemark>
      <name>${safeName}</name>
      <description><![CDATA[
        <b>Tên thửa đất:</b> ${safeName}<br/>
        <b>Phương thức đo:</b> ${mode === 'MANUAL' ? 'Chấm điểm vệ tinh' : 'Đi bộ GPS thực địa'}<br/>
        <b>Diện tích (m²):</b> ${metrics.formatted.sqm}<br/>
        <b>Sào Tây Nguyên:</b> ${metrics.formatted.sao}<br/>
        <b>Hecta (Ha):</b> ${metrics.formatted.hectare}<br/>
        <b>Chu vi bờ rào:</b> ${metrics.formatted.perimeter}
      ]]></description>
      <styleUrl>#easupParcelStyle</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${kmlCoords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;
}

