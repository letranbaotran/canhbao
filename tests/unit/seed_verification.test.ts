import { describe, it, expect } from 'vitest';
import { generateSeedData } from '../../prisma/seed';

describe('KIỂM CHỨNG DỮ LIỆU KHỞI TẠO (SEED DATA VERIFICATION)', () => {
  const seed = generateSeedData();

  it('phải có đúng 01 xã trọng điểm là Xã Ea Súp (mô hình 2 cấp)', () => {
    expect(seed.coreCommune.name).toBe('Xã Ea Súp');
    expect(seed.coreCommune.unitType).toBe('COMMUNE_CORE');
  });

  it('phải nạp đủ chính xác 20 thôn, buôn chuẩn trực thuộc xã Ea Súp', () => {
    expect(seed.villages).toHaveLength(20);

    const villageNames = seed.villages.map((v) => v.name);
    const expected = [
      'Thôn 1', 'Thôn 2', 'Thôn 3', 'Thôn 4', 'Thôn 5',
      'Thôn 6', 'Thôn 7', 'Thôn 8', 'Thôn 9', 'Thôn 10',
      'Thôn 11', 'Thôn 12', 'Thôn 13', 'Thôn Thắng Lợi',
      'Thôn Đoàn Kết', 'Thôn Hòa Bình', 'Thôn Bình Lợi',
      'Buôn A', 'Buôn B', 'Buôn C',
    ];

    expected.forEach((name) => {
      expect(villageNames).toContain(name);
    });
  });

  it('phải nạp đủ 04 xã lân cận vùng đệm biên giới', () => {
    expect(seed.neighborCommunes).toHaveLength(4);
    const names = seed.neighborCommunes.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining(['Xã Ea Bung', 'Xã Ea Rốk', 'Xã Ia Lốp', 'Xã Ia Rvê'])
    );
  });

  it('phải nạp lâm phần Tiểu khu 277 với mức bảo vệ nghiêm ngặt', () => {
    const tk277 = seed.forestCompartments.find((f) => f.code === 'TK-277');
    expect(tk277).toBeDefined();
    expect(tk277?.protectionLevel).toBe('NGHIEM_NGAT');
  });

  it('phải có 4 trọng điểm thủy văn, trong đó Hồ Ea Súp Hạ CẤM NUÔI CÁ', () => {
    expect(seed.hydroStations).toHaveLength(4);

    const hoHa = seed.hydroStations.find((h) => h.code === 'HO_EASUP_HA');
    expect(hoHa).toBeDefined();
    expect(hoHa?.isStrictProtected).toBe(true); // QUY TẮC BẤT BIẾN

    const hoThuong = seed.hydroStations.find((h) => h.code === 'HO_EASUP_THUONG');
    expect(hoThuong).toBeDefined();

    const doanKet = seed.hydroStations.find((h) => h.code === 'HO_CA_THON_DOAN_KET');
    expect(doanKet).toBeDefined();
    expect(doanKet?.isStrictProtected).toBe(false);

    const songEaSup = seed.hydroStations.find((h) => h.code === 'SONG_EASUP');
    expect(songEaSup).toBeDefined();
  });
});
