import { describe, it, expect } from 'vitest';
import {
  calculateDeltaNdvi,
  evaluateForestCoverChange,
} from '@/services/ndvi_service';

describe('PHẦN 4 & 5: Biến động Mặt Phủ Rừng (Delta-NDVI & Diện tích >= 500m2)', () => {
  it('phải tính toán chính xác giá trị Delta-NDVI (ndviBefore - ndviAfter)', () => {
    const ndviBefore = 0.75;
    const ndviAfter = 0.35;
    const delta = calculateDeltaNdvi(ndviBefore, ndviAfter);
    expect(delta).toBeCloseTo(0.40, 2);
  });

  it('phải kích hoạt FLAGGED_RED khi độ suy giảm Delta-NDVI >= 0.25 và diện tích >= 500m2', () => {
    const result = evaluateForestCoverChange({
      compartmentCode: 'TK-277',
      ndviBefore: 0.72,
      ndviAfter: 0.40, // delta = 0.32
      affectedAreaM2: 1200, // >= 500m2
    });

    expect(result.status).toBe('FLAGGED_RED');
    expect(result.requiresInspection).toBe(true);
    expect(result.alertMessage).toContain('Phát hiện suy giảm mặt phủ rừng');
  });

  it('không gắn cờ FLAGGED_RED nếu diện tích nhỏ hơn 500m2 (bỏ qua biến động vi mô do bóng mây)', () => {
    const result = evaluateForestCoverChange({
      compartmentCode: 'TK-277',
      ndviBefore: 0.72,
      ndviAfter: 0.35,
      affectedAreaM2: 350, // < 500m2
    });

    expect(result.status).toBe('INSPECTED_LEGAL');
    expect(result.requiresInspection).toBe(false);
  });
});
