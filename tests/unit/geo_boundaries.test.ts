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

  it('phải định nghĩa đúng 4 trọng điểm giám sát đặc biệt', () => {
    expect(KEY_MONITORING_TARGETS.FOREST_TK277).toBeDefined();
    expect(KEY_MONITORING_TARGETS.HO_EASUP_THUONG).toBeDefined();
    expect(KEY_MONITORING_TARGETS.HO_EASUP_HA).toBeDefined();
    expect(KEY_MONITORING_TARGETS.SONG_EASUP).toBeDefined();
    expect(KEY_MONITORING_TARGETS.HO_CA_THON_DOAN_KET).toBeDefined();
  });

  it('phải có luật bất di bất dịch: TUYỆT ĐỐI CẤM NUÔI CÁ LỒNG BÈ TẠI HỒ EA SÚP HẠ', () => {
    expect(isStrictAquacultureProhibited('Hồ Ea Súp Hạ')).toBe(true);
    expect(isStrictAquacultureProhibited('Hồ cá Thôn Đoàn Kết')).toBe(false);
  });
});
