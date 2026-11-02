import { describe, it, expect } from 'vitest';
import {
  evaluateHydroStationAlarm,
  calculateFloodEvacuationVillages,
  checkAquacultureViolation,
} from '@/services/hydro_service';

describe('PHẦN 5: Động cơ Giám sát Thủy văn, Lũ lụt & Hồ Ea Súp Hạ', () => {
  it('phải phân loại đúng Báo động I, II, III cho Hồ Ea Súp Thượng', () => {
    // Ngưỡng Hồ Ea Súp Thượng:
    // Cấp 1 (Cảnh báo): 208.5m
    // Cấp 2 (Báo động): 209.5m
    // Cấp 3 (Khẩn cấp / Tràn): 210.0m

    expect(evaluateHydroStationAlarm('HO_EASUP_THUONG', 205.0).alertLevel).toBe('NORMAL');
    expect(evaluateHydroStationAlarm('HO_EASUP_THUONG', 208.6).alertLevel).toBe('LEVEL_1');
    expect(evaluateHydroStationAlarm('HO_EASUP_THUONG', 209.6).alertLevel).toBe('LEVEL_2');
    expect(evaluateHydroStationAlarm('HO_EASUP_THUONG', 210.2).alertLevel).toBe('LEVEL_3_CRITICAL');
  });

  it('phải kích hoạt cảnh báo khẩn cấp khi tốc độ nước dâng > 30cm/giờ', () => {
    const result = evaluateHydroStationAlarm('SONG_EASUP', 15.2, 35.0); // tốc độ dâng 35cm/h
    expect(result.rapidRiseAlarm).toBe(true);
    expect(result.alertLevel).toBe('LEVEL_3_CRITICAL');
    expect(result.reason).toContain('Tốc độ nước dâng vượt 30cm/giờ');
  });

  it('phải tự động khoanh vùng các thôn buôn hạ du cần sơ tán khi Hồ Thượng xả lũ Cấp 3', () => {
    const impactedVillages = calculateFloodEvacuationVillages('LEVEL_3_CRITICAL');
    expect(impactedVillages).toContain('Thôn 1');
    expect(impactedVillages).toContain('Thôn Đoàn Kết'); // Vùng nuôi cá trũng
    expect(impactedVillages.length).toBeGreaterThan(0);
  });

  it('phải kích hoạt vi phạm nghiêm trọng khi phát hiện nuôi cá tại Hồ Ea Súp Hạ', () => {
    const violationReport = checkAquacultureViolation({
      locationName: 'Hồ Ea Súp Hạ',
      hasFishCages: true,
      turbidityDoAnomaly: true,
    });

    expect(violationReport.isViolation).toBe(true);
    expect(violationReport.alertCode).toBe('STRICT_AQUACULTURE_PROHIBITED_BREACH');
    expect(violationReport.severity).toBe('EMERGENCY_SOS');
  });

  it('không báo vi phạm khi hoạt động nuôi cá ở đúng khu vực được quy hoạch là Thôn Đoàn Kết', () => {
    const normalReport = checkAquacultureViolation({
      locationName: 'Hồ cá Thôn Đoàn Kết',
      hasFishCages: true,
      turbidityDoAnomaly: false,
    });

    expect(normalReport.isViolation).toBe(false);
  });
});
