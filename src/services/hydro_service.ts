/**
 * DỊCH VỤ GIÁM SÁT THỦY VĂN, LŨ LỤT VÀ BẢO VỆ NGUỒN NƯỚC HỒ EA SÚP HẠ
 */

export interface HydroAlarmResult {
  stationCode: string;
  waterLevelM: number;
  alertLevel: 'NORMAL' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3_CRITICAL';
  rapidRiseAlarm: boolean;
  reason?: string;
}

export interface AquacultureCheckInput {
  locationName: string;
  hasFishCages: boolean;
  turbidityDoAnomaly?: boolean;
}

export interface AquacultureCheckResult {
  isViolation: boolean;
  alertCode?: string;
  severity?: 'INFO' | 'WARNING' | 'EMERGENCY_SOS';
  message?: string;
}

/**
 * Đánh giá mực nước hồ đập và tốc độ dâng nước
 */
export function evaluateHydroStationAlarm(
  stationCode: string,
  waterLevelM: number,
  riseRateCmPerHour: number = 0
): HydroAlarmResult {
  // 1. Kiểm tra tốc độ nước dâng nhanh (> 30 cm/giờ là tình huống lũ ống/xả lũ khẩn cấp)
  if (riseRateCmPerHour > 30.0) {
    return {
      stationCode,
      waterLevelM,
      alertLevel: 'LEVEL_3_CRITICAL',
      rapidRiseAlarm: true,
      reason: `Tốc độ nước dâng vượt 30cm/giờ (${riseRateCmPerHour} cm/h) - Nguy cơ lũ dồn dập!`,
    };
  }

  // 2. Ngưỡng cao trình Hồ Ea Súp Thượng (Mực nước dâng bình thường 210.0m)
  if (stationCode === 'HO_EASUP_THUONG') {
    if (waterLevelM >= 210.0) {
      return {
        stationCode,
        waterLevelM,
        alertLevel: 'LEVEL_3_CRITICAL',
        rapidRiseAlarm: false,
        reason: `Mực nước hồ Ea Súp Thượng đạt ${waterLevelM}m - Đang tràn xả lũ tự do`,
      };
    }
    if (waterLevelM >= 209.5) {
      return {
        stationCode,
        waterLevelM,
        alertLevel: 'LEVEL_2',
        rapidRiseAlarm: false,
        reason: `Mực nước hồ Ea Súp Thượng đạt ${waterLevelM}m - Báo động II chuẩn bị xả tràn`,
      };
    }
    if (waterLevelM >= 208.5) {
      return {
        stationCode,
        waterLevelM,
        alertLevel: 'LEVEL_1',
        rapidRiseAlarm: false,
        reason: `Mực nước hồ Ea Súp Thượng đạt ${waterLevelM}m - Báo động I đón lũ`,
      };
    }
  }

  return {
    stationCode,
    waterLevelM,
    alertLevel: 'NORMAL',
    rapidRiseAlarm: false,
  };
}

/**
 * Xác định danh sách các thôn buôn hạ du cần kích hoạt sơ tán khẩn cấp
 */
export function calculateFloodEvacuationVillages(alertLevel: string): string[] {
  if (alertLevel === 'LEVEL_3_CRITICAL') {
    // Các thôn trũng thấp ven sông Ea Súp và hạ lưu đập tràn
    return ['Thôn 1', 'Thôn 2', 'Thôn 7', 'Thôn 8', 'Thôn Đoàn Kết', 'Buôn A'];
  }
  if (alertLevel === 'LEVEL_2') {
    return ['Thôn 1', 'Thôn Đoàn Kết'];
  }
  return [];
}

/**
 * Kiểm tra vi phạm an toàn nguồn nước sinh hoạt Hồ Ea Súp Hạ
 * QUY TẮC BẤT DI BẤT DỊCH: TUYỆT ĐỐI CẤM NUÔI CÁ LỒNG BÈ TẠI HỒ HẠ
 */
export function checkAquacultureViolation(input: AquacultureCheckInput): AquacultureCheckResult {
  const isHoHa = input.locationName.trim().toLowerCase() === 'hồ ea súp hạ';

  if (isHoHa && input.hasFishCages) {
    return {
      isViolation: true,
      alertCode: 'STRICT_AQUACULTURE_PROHIBITED_BREACH',
      severity: 'EMERGENCY_SOS',
      message: 'Báo động: Phát hiện hành vi nuôi cá lồng bè trái phép đe dọa ô nhiễm nguồn nước thô sinh hoạt tại Hồ Ea Súp Hạ!',
    };
  }

  return {
    isViolation: false,
    message: 'Hoạt động thủy sản hợp lệ hoặc tại phân vùng cho phép (ví dụ Hồ cá Thôn Đoàn Kết)',
  };
}
