import { describe, it, expect } from 'vitest';
import {
  calculateDakLakLandMetrics,
  calculatePointDistanceMeters,
  buildParcelGeoJSONString,
  buildParcelKMLString,
} from '@/utils/landMeasurementMath';

describe('Công cụ Đo diện tích đất & Khoanh ranh thửa thực địa (Chuẩn Đắk Lắk & Tây Nguyên)', () => {
  it('Quy đổi chính xác diện tích m², Sào Tây Nguyên (1.000m²), Hecta (10.000m²) và Chu vi bờ rào', () => {
    // Thửa đất hình chữ nhật ~100m x 100m (~10.000 m² = 10 Sào = 1 Ha) tại xã Ea Súp
    const sampleParcel: [number, number][] = [
      [13.065, 107.885],
      [13.065, 107.885923],
      [13.0659, 107.885923],
      [13.0659, 107.885],
    ];

    const metrics = calculateDakLakLandMetrics(sampleParcel);

    expect(metrics.vertexCount).toBe(4);
    expect(metrics.areaSqm).toBeGreaterThan(9500);
    expect(metrics.areaSqm).toBeLessThan(10500);

    // 1 Sào Tây Nguyên = 1.000 m², 1 Ha = 10.000 m²
    expect(metrics.areaSaoTayNguyen).toBeCloseTo(metrics.areaSqm / 1000, 5);
    expect(metrics.areaHectare).toBeCloseTo(metrics.areaSqm / 10000, 5);
    expect(metrics.perimeterMeters).toBeGreaterThan(380);
    expect(metrics.perimeterMeters).toBeLessThan(420);
    expect(metrics.formatted.sao).toContain('Sào');
    expect(metrics.formatted.hectare).toContain('Ha');
  });

  it('Bộ lọc khử nhiễu khoảng cách GPS thực địa tính đúng ngưỡng di chuyển >= 2.5m', () => {
    const ptA: [number, number] = [13.065, 107.885];
    const ptNear: [number, number] = [13.06501, 107.885]; // ~1.1m (< 2.5m)
    const ptValidStep: [number, number] = [13.06503, 107.885]; // ~3.3m (>= 2.5m)

    expect(calculatePointDistanceMeters(ptA, ptNear)).toBeLessThan(2.5);
    expect(calculatePointDistanceMeters(ptA, ptValidStep)).toBeGreaterThanOrEqual(2.5);
  });

  it('Xuất định dạng file GeoJSON và KML hợp lệ kèm thông số Sào Tây Nguyên & Hecta', () => {
    const coords: [number, number][] = [
      [13.065, 107.885],
      [13.065, 107.886],
      [13.066, 107.886],
    ];
    const metrics = calculateDakLakLandMetrics(coords);

    const geojsonStr = buildParcelGeoJSONString('Rẫy điều Thôn 8', coords, metrics, 'MANUAL');
    const parsedGeo = JSON.parse(geojsonStr);
    expect(parsedGeo.type).toBe('FeatureCollection');
    expect(parsedGeo.features[0].properties.name).toBe('Rẫy điều Thôn 8');
    expect(parsedGeo.features[0].geometry.type).toBe('Polygon');

    const kmlStr = buildParcelKMLString('Vườn sầu riêng Thôn Đoàn Kết', coords, metrics, 'GPS_WALK');
    expect(kmlStr).toContain('<kml');
    expect(kmlStr).toContain('Vườn sầu riêng Thôn Đoàn Kết');
    expect(kmlStr).toContain('<Polygon>');
  });
});

