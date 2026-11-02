import { describe, it, expect } from 'vitest';
import {
  EASUP_VILLAGES,
  NEIGHBOR_COMMUNES,
  KEY_MONITORING_TARGETS,
  isEaSupVillage,
  isNeighborCommune,
  isStrictAquacultureProhibited,
} from '@/data/administrative_boundaries';

describe('PHẦN 1: Bối cảnh Hành chính & Địa bàn Ea Súp', () => {
  it('phải có chính xác 20 thôn, buôn thuộc xã Ea Súp', () => {
    expect(EASUP_VILLAGES).toHaveLength(20);

    const expectedVillages = [
      'Thôn 1', 'Thôn 2', 'Thôn 3', 'Thôn 4', 'Thôn 5',
      'Thôn 6', 'Thôn 7', 'Thôn 8', 'Thôn 9', 'Thôn 10',
      'Thôn 11', 'Thôn 12', 'Thôn 13', 'Thôn Thắng Lợi',
      'Thôn Đoàn Kết', 'Thôn Hòa Bình', 'Thôn Bình Lợi',
      'Buôn A', 'Buôn B', 'Buôn C',
    ];

    expectedVillages.forEach((v) => {
      expect(EASUP_VILLAGES).toContain(v);
      expect(isEaSupVillage(v)).toBe(true);
    });

    expect(isEaSupVillage('Thôn Không Tồn Tại')).toBe(false);
  });

  it('phải có chính xác 4 xã liên kết sinh thái vùng biên giới', () => {
    expect(NEIGHBOR_COMMUNES).toHaveLength(4);
    expect(NEIGHBOR_COMMUNES).toEqual(
      expect.arrayContaining(['Xã Ea Bung', 'Xã Ea Rốk', 'Xã Ia Lốp', 'Xã Ia Rvê'])
    );

    expect(isNeighborCommune('Xã Ea Bung')).toBe(true);
    expect(isNeighborCommune('Xã Cư M\'gar')).toBe(false);
  });

  it('phải định nghĩa đúng 4 trọng điểm giám sát với tọa độ cập nhật', () => {
    // Tiểu khu 293 (12.982216, 107.886961)
    expect(KEY_MONITORING_TARGETS.FOREST_TK293).toBeDefined();
    expect(KEY_MONITORING_TARGETS.FOREST_TK293.coordinates).toEqual([12.982216, 107.886961]);

    // Hồ Ea Súp Thượng (13.043116, 107.937218)
    expect(KEY_MONITORING_TARGETS.HO_EASUP_THUONG).toBeDefined();
    expect(KEY_MONITORING_TARGETS.HO_EASUP_THUONG.coordinates).toEqual([13.043116, 107.937218]);

    // Hồ Ea Súp Hạ (13.056850, 107.894562)
    expect(KEY_MONITORING_TARGETS.HO_EASUP_HA).toBeDefined();
    expect(KEY_MONITORING_TARGETS.HO_EASUP_HA.coordinates).toEqual([13.05685, 107.894562]);

    // Hồ Trung Chuyển (13.069298, 107.881527)
    expect(KEY_MONITORING_TARGETS.HO_TRUNG_CHUYEN).toBeDefined();
    expect(KEY_MONITORING_TARGETS.HO_TRUNG_CHUYEN.coordinates).toEqual([13.069298, 107.881527]);
  });

  it('phải có luật bất di bất dịch: TUYỆT ĐỐI CẤM NUÔI CÁ LỒNG BÈ TẠI HỒ EA SÚP HẠ', () => {
    expect(isStrictAquacultureProhibited('Hồ Ea Súp Hạ')).toBe(true);
    expect(isStrictAquacultureProhibited('Hồ Trung Chuyển')).toBe(false);
  });
});
