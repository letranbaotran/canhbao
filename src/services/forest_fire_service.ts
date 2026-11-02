/**
 * DỊCH VỤ PHÁT HIỆN & CẢNH BÁO CHÁY RỪNG (NASA FIRMS & TRẠM IOT LÂM NGHIỆP)
 */

export interface FirmsHotspotRaw {
  id: string;
  latitude: number;
  longitude: number;
  brightnessTempK: number;
  frpMW: number; // Công suất bức xạ ngọn lửa (MW)
  confidenceLevel: string; // 'low', 'nominal', 'high'
  acqDateTime: string;
  satelliteSource: string;
}

export interface ForestTelemetry {
  stationId: string;
  airTempC: number;
  smokePpm: number;
  airHumidityPct?: number;
}

export interface FireAlertResult {
  level: 'NORMAL' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3_CRITICAL';
  requiresImmediateBroadcast: boolean;
  reason?: string;
}

// Bounding Box [107.55, 13.00, 108.10, 13.50]
export const EASUP_BOUNDING_BOX = {
  minLng: 107.55,
  minLat: 13.0,
  maxLng: 108.1,
  maxLat: 13.5,
};

/**
 * Kiểm tra tọa độ có nằm trong vùng bao quát xã Ea Súp và 4 xã vùng đệm không
 */
export function isWithinEaSupBoundingBox(lat: number, lng: number): boolean {
  return (
    lat >= EASUP_BOUNDING_BOX.minLat &&
    lat <= EASUP_BOUNDING_BOX.maxLat &&
    lng >= EASUP_BOUNDING_BOX.minLng &&
    lng <= EASUP_BOUNDING_BOX.maxLng
  );
}

/**
 * Bộ lọc đa tầng NASA FIRMS: Lọc bỏ nhiễu, điểm tin cậy thấp và FRP yếu
 */
export function filterFirmsHotspots(hotspots: FirmsHotspotRaw[]): FirmsHotspotRaw[] {
  return hotspots.filter((h) => {
    // 1. Phải nằm trong Bounding Box
    if (!isWithinEaSupBoundingBox(h.latitude, h.longitude)) return false;

    // 2. Loại bỏ điểm có confidence = low VÀ frp < 5.0
    if (h.confidenceLevel.toLowerCase() === 'low' && h.frpMW < 5.0) {
      return false;
    }

    return true;
  });
}

/**
 * Đánh giá telemetry trạm quan trắc rừng Tiểu khu 277
 * Báo động cháy rừng trong < 30 giây khi nhiệt độ > 45°C hoặc khói vượt ngưỡng
 */
export function evaluateForestFireAlert(telemetry: ForestTelemetry): FireAlertResult {
  // Ngưỡng nhiệt độ > 45°C
  if (telemetry.airTempC > 45.0) {
    return {
      level: 'LEVEL_3_CRITICAL',
      requiresImmediateBroadcast: true,
      reason: `Nhiệt độ vượt 45°C (Đo được: ${telemetry.airTempC}°C) tại trạm ${telemetry.stationId}`,
    };
  }

  // Ngưỡng khói > 50 ppm
  if (telemetry.smokePpm > 50.0) {
    return {
      level: 'LEVEL_3_CRITICAL',
      requiresImmediateBroadcast: true,
      reason: `Nồng độ khói vượt ngưỡng (Đo được: ${telemetry.smokePpm} ppm) tại trạm ${telemetry.stationId}`,
    };
  }

  // Cảnh báo sớm nếu nhiệt độ từ 40°C - 45°C và độ ẩm < 30%
  if (telemetry.airTempC >= 40.0 && (telemetry.airHumidityPct ?? 100) < 30) {
    return {
      level: 'LEVEL_2',
      requiresImmediateBroadcast: false,
      reason: `Thời tiết khô hạn cao độ (Nhiệt độ ${telemetry.airTempC}°C, độ ẩm ${telemetry.airHumidityPct}%)`,
    };
  }

  return {
    level: 'NORMAL',
    requiresImmediateBroadcast: false,
  };
}
