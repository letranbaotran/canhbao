import { describe, it, expect } from 'vitest';
import {
  interpolateHydroByZ,
  interpolateHydroByQ,
  computeActiveHydraulicModel,
  HYDRO_PIECEWISE_BENCHMARKS,
  DEFAULT_IOT_DATA,
} from '@/services/telemetryStore';

describe('PHẦN 10: Kiểm định Nội suy Thủy văn 2 Chiều & Chuẩn hóa Vận hành Thực tế', () => {
  it('phải khớp thông số mặc định Hồ Thượng (216.30m, 45 m³/s, 120.5M m³) và Hồ Hạ (196.35m, 15 m³/s, 8.85M m³)', () => {
    expect(DEFAULT_IOT_DATA.hoThuong.elevation).toBe(216.30);
    expect(DEFAULT_IOT_DATA.hoThuong.discharge).toBe(45);
    expect(DEFAULT_IOT_DATA.hoThuong.capacity).toBe(120.5);
    expect(DEFAULT_IOT_DATA.hoThuong.riseRate).toBe(2);

    expect(DEFAULT_IOT_DATA.hoHa.elevation).toBe(196.35);
    expect(DEFAULT_IOT_DATA.hoHa.discharge).toBe(15);
    expect(DEFAULT_IOT_DATA.hoHa.capacityM).toBe(8.85);
    expect(DEFAULT_IOT_DATA.hoHa.capacityPct).toBe(95.7);
    expect(DEFAULT_IOT_DATA.hoHa.illegalCages).toBe(0);
  });

  it('phải nội suy chính xác tại các mốc chuẩn thực tế 0, 45, 100, 600, 766, 1075 m³/s', () => {
    // Mốc 3: Q = 45 m³/s
    const m45 = interpolateHydroByQ(45);
    expect(m45.z).toBeCloseTo(216.30, 2);
    expect(m45.w).toBeCloseTo(120.5, 1);
    expect(m45.hoHaZ).toBeCloseTo(196.35, 2);
    expect(m45.hoHaQ).toBe(15);

    // Mốc 4: Q = 100 m³/s (Bắt đầu Cảnh báo - TB 135/TB-TL)
    const m100 = interpolateHydroByQ(100);
    expect(m100.z).toBeCloseTo(217.54, 2);
    expect(m100.w).toBeCloseTo(142.5, 1);
    expect(m100.hoHaQ).toBe(25);

    // Mốc 6: Q = 600 m³/s (Mở 03 cửa tràn - BC 1775/BC-CTTL)
    const m600 = interpolateHydroByQ(600);
    expect(m600.z).toBeCloseTo(217.85, 2);
    expect(m600.w).toBeCloseTo(151.5, 1);

    // Mốc 7: Q = 766 m³/s (KB4.1 - P=10%)
    const m766 = interpolateHydroByQ(766);
    expect(m766.z).toBeCloseTo(217.95, 2);
    expect(m766.w).toBeCloseTo(153.0, 1);

    // Mốc 9: Q = 1075 m³/s (KB1.1 - P=1%)
    const m1075 = interpolateHydroByQ(1075);
    expect(m1075.z).toBeCloseTo(218.46, 2);
    expect(m1075.w).toBeCloseTo(158.51, 1);
  });

  it('phải đảm bảo tính nhất quán 2 chiều Z <-> Q', () => {
    // Từ Z = 217.54m nội suy ra Q = 100 m³/s
    const fromZ = interpolateHydroByZ(217.54);
    expect(fromZ.q).toBe(100);

    // Từ Q = 100 m³/s nội suy ngược lại ra Z = 217.54m
    const fromQ = interpolateHydroByQ(fromZ.q);
    expect(fromQ.z).toBeCloseTo(217.54, 2);
  });

  it('phải trả về trạng thái An toàn (ngập 0 ha, 0 hộ, MBL < 185m) khi Q < 100 m³/s', () => {
    const safeModel = computeActiveHydraulicModel(DEFAULT_IOT_DATA, 'NONE');
    expect(safeModel.totalFloodedAreaHa).toBe(0);
    expect(safeModel.affectedHouseholds).toBe(0);
    expect(safeModel.affectedPeople).toBe(0);
    expect(safeModel.ql14cFloodedKm).toBe(0);
    expect(safeModel.tl681FloodedKm).toBe(0);
    expect(safeModel.mblEaSup).toBeLessThan(185.0);
    expect(safeModel.affectedVillages).toHaveLength(0);
    expect(safeModel.infrastructureNotes[0]).toContain('an toàn');
  });

  it('phải kích hoạt Cảnh báo Trực chiến và nội suy phân bổ ngập khi Q >= 100 m³/s', () => {
    const warningData = {
      ...DEFAULT_IOT_DATA,
      hoThuong: {
        ...DEFAULT_IOT_DATA.hoThuong,
        elevation: 217.54,
        discharge: 100,
      },
    };
    const warningModel = computeActiveHydraulicModel(warningData, 'CUSTOM_SLIDER');
    expect(warningModel.totalFloodedAreaHa).toBeGreaterThan(0);
    expect(warningModel.affectedHouseholds).toBeGreaterThan(0);
    expect(warningModel.mblEaSup).toBeGreaterThanOrEqual(185.0);
    expect(warningModel.affectedVillages).toContain('Thôn Đoàn Kết');
  });
});

