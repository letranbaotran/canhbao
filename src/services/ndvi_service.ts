/**
 * DỊCH VỤ PHÂN TÍCH BIẾN ĐỘNG MẶT PHỦ RỪNG (DELTA-NDVI TỪ ẢNH VỆ TINH MODIS/SENTINEL)
 */

export interface NdviEvaluationInput {
  compartmentCode: string;
  ndviBefore: number;
  ndviAfter: number;
  affectedAreaM2: number;
}

export interface NdviEvaluationResult {
  status: 'FLAGGED_RED' | 'ASSIGNED' | 'INSPECTED_VIOLATION' | 'INSPECTED_LEGAL';
  deltaNdvi: number;
  affectedAreaM2: number;
  requiresInspection: boolean;
  alertMessage?: string;
}

/**
 * Tính mức độ suy giảm chỉ số thực vật NDVI
 */
export function calculateDeltaNdvi(ndviBefore: number, ndviAfter: number): number {
  return Number((ndviBefore - ndviAfter).toFixed(4));
}

/**
 * Đánh giá biến động mặt phủ rừng
 * Báo động đỏ khi suy giảm Delta-NDVI >= 0.25 và diện tích suy giảm >= 500m2
 */
export function evaluateForestCoverChange(input: NdviEvaluationInput): NdviEvaluationResult {
  const deltaNdvi = calculateDeltaNdvi(input.ndviBefore, input.ndviAfter);

  // Quy tắc lọc nhiễu bóng mây: Bỏ qua nếu diện tích < 500m2
  if (input.affectedAreaM2 < 500) {
    return {
      status: 'INSPECTED_LEGAL',
      deltaNdvi,
      affectedAreaM2: input.affectedAreaM2,
      requiresInspection: false,
    };
  }

  // Phát hiện suy giảm rừng thực tế (phá rừng, khai thác lấn chiếm)
  if (deltaNdvi >= 0.25 && input.affectedAreaM2 >= 500) {
    return {
      status: 'FLAGGED_RED',
      deltaNdvi,
      affectedAreaM2: input.affectedAreaM2,
      requiresInspection: true,
      alertMessage: `Phát hiện suy giảm mặt phủ rừng bất thường tại ${input.compartmentCode} (Delta-NDVI: ${deltaNdvi}, Diện tích: ${input.affectedAreaM2.toLocaleString()} m²)`,
    };
  }

  return {
    status: 'INSPECTED_LEGAL',
    deltaNdvi,
    affectedAreaM2: input.affectedAreaM2,
    requiresInspection: false,
  };
}
