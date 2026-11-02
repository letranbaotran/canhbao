import { describe, it, expect } from 'vitest';
import {
  isWithinEaSupBoundingBox,
  filterFirmsHotspots,
  evaluateForestFireAlert,
  type FirmsHotspotRaw,
  type ForestTelemetry,
} from '@/services/forest_fire_service';

describe('PHẦN 5: Động cơ Phát hiện & Cảnh báo Cháy Rừng (FIRMS + IoT)', () => {
  it('phải kiểm tra tọa độ nằm trong Bounding Box [107.55, 13.00, 108.10, 13.50]', () => {
    // Tọa độ Tiểu khu 293: 12.982216, 107.886961
    expect(isWithinEaSupBoundingBox(12.982216, 107.886961)).toBe(true);

    // Tọa độ Tiểu khu 277: 13.25, 107.82
    expect(isWithinEaSupBoundingBox(13.25, 107.82)).toBe(true);

    // Tọa độ ngoài vùng (Gia Lai: 13.98, 108.05)
    expect(isWithinEaSupBoundingBox(13.98, 108.05)).toBe(false);
  });

  it('phải lọc điểm nhiệt FIRMS: loại bỏ confidence low và FRP < 5MW', () => {
    const hotspots: FirmsHotspotRaw[] = [
      {
        id: 'FIRMS-01',
        latitude: 13.25,
        longitude: 107.82,
        brightnessTempK: 340.5,
        frpMW: 6.2,
        confidenceLevel: 'nominal',
        acqDateTime: '2026-11-02T04:30:00Z',
        satelliteSource: 'VIIRS_SNPP',
      },
      {
        id: 'FIRMS-02',
        latitude: 13.22,
        longitude: 107.85,
        brightnessTempK: 305.0,
        frpMW: 2.1, // FRP < 5.0
        confidenceLevel: 'low',
        acqDateTime: '2026-11-02T04:30:00Z',
        satelliteSource: 'VIIRS_SNPP',
      },
      {
        id: 'FIRMS-03',
        latitude: 13.30,
        longitude: 107.75, // Khu vực Ea Bung
        brightnessTempK: 355.0,
        frpMW: 12.5,
        confidenceLevel: 'high',
        acqDateTime: '2026-11-02T04:30:00Z',
        satelliteSource: 'VIIRS_NOAA20',
      },
    ];

    const filtered = filterFirmsHotspots(hotspots);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((h) => h.id)).toEqual(['FIRMS-01', 'FIRMS-03']);
  });

  it('phải kích hoạt BÁO ĐỘNG ĐỎ nếu trạm rừng có nhiệt độ > 45°C hoặc khói vượt ngưỡng', () => {
    const normalTelemetry: ForestTelemetry = {
      stationId: 'IOT-TK277',
      airTempC: 34.0,
      smokePpm: 15.0,
      airHumidityPct: 60.0,
    };
    expect(evaluateForestFireAlert(normalTelemetry).level).toBe('NORMAL');

    const highTempTelemetry: ForestTelemetry = {
      stationId: 'IOT-TK277',
      airTempC: 48.5, // > 45C
      smokePpm: 20.0,
      airHumidityPct: 25.0,
    };
    const alert1 = evaluateForestFireAlert(highTempTelemetry);
    expect(alert1.level).toBe('LEVEL_3_CRITICAL');
    expect(alert1.requiresImmediateBroadcast).toBe(true);
    expect(alert1.reason).toContain('Nhiệt độ vượt 45°C');

    const smokeTelemetry: ForestTelemetry = {
      stationId: 'IOT-TK277',
      airTempC: 38.0,
      smokePpm: 85.0, // > 50 ppm ngưỡng khói
      airHumidityPct: 30.0,
    };
    const alert2 = evaluateForestFireAlert(smokeTelemetry);
    expect(alert2.level).toBe('LEVEL_3_CRITICAL');
    expect(alert2.reason).toContain('Nồng độ khói vượt ngưỡng');
  });
});
