/**
 * DỮ LIỆU ĐỊA CHÍNH VÀ RANH GIỚI BẤT BIẾN XÃ EA SÚP VÀ VÙNG LIÊN XÃ
 * Theo mô hình chính quyền 2 cấp: Cấp xã trực thuộc tỉnh Đắk Lắk.
 */

export const EASUP_VILLAGES: readonly string[] = [
  'Thôn 1',
  'Thôn 2',
  'Thôn 3',
  'Thôn 4',
  'Thôn 5',
  'Thôn 6',
  'Thôn 7',
  'Thôn 8',
  'Thôn 9',
  'Thôn 10',
  'Thôn 11',
  'Thôn 12',
  'Thôn 13',
  'Thôn Thắng Lợi',
  'Thôn Đoàn Kết',
  'Thôn Hòa Bình',
  'Thôn Bình Lợi',
  'Buôn A',
  'Buôn B',
  'Buôn C',
] as const;

export const NEIGHBOR_COMMUNES: readonly string[] = [
  'Xã Ea Bung',
  'Xã Ea Rốk',
  'Xã Ia Lốp',
  'Xã Ia Rvê',
] as const;

export interface MonitoringTarget {
  name: string;
  type: 'FOREST' | 'HYDRO_LAKE' | 'HYDRO_RIVER' | 'AQUACULTURE_ZONE';
  description: string;
  coordinates: [number, number]; // [lat, lng]
  isStrictAquacultureProhibited: boolean;
}

export const KEY_MONITORING_TARGETS: Record<string, MonitoringTarget> = {
  FOREST_TK277: {
    name: 'Lâm phần Tiểu khu 277',
    type: 'FOREST',
    description: 'Vùng rừng khộp tự nhiên dễ cháy mùa khô giáp ranh nương rẫy',
    coordinates: [13.255, 107.822],
    isStrictAquacultureProhibited: false,
  },
  HO_EASUP_THUONG: {
    name: 'Hồ Ea Súp Thượng',
    type: 'HYDRO_LAKE',
    description: 'Công trình đại thủy nông, dung tích 146 triệu m3, đập chính và tràn xả lũ',
    coordinates: [13.218, 107.915],
    isStrictAquacultureProhibited: false,
  },
  HO_EASUP_HA: {
    name: 'Hồ Ea Súp Hạ',
    type: 'HYDRO_LAKE',
    description: 'Vùng bảo vệ nghiêm ngặt nguồn nước thô sinh hoạt - TUYỆT ĐỐI CẤM NUÔI THỦY SẢN',
    coordinates: [13.235, 107.876],
    isStrictAquacultureProhibited: true,
  },
  SONG_EASUP: {
    name: 'Toàn tuyến Sông Ea Súp',
    type: 'HYDRO_RIVER',
    description: 'Trục tiêu thoát lũ chính đi qua các thôn trũng',
    coordinates: [13.242, 107.854],
    isStrictAquacultureProhibited: false,
  },
  HO_CA_THON_DOAN_KET: {
    name: 'Hồ cá Thôn Đoàn Kết',
    type: 'AQUACULTURE_ZONE',
    description: 'Khu nuôi trồng thủy sản tập trung có cảm biến IoT giám sát Oxy hòa tan DO và pH',
    coordinates: [13.248, 107.868],
    isStrictAquacultureProhibited: false,
  },
};

export function isEaSupVillage(name: string): boolean {
  return EASUP_VILLAGES.includes(name);
}

export function isNeighborCommune(name: string): boolean {
  return NEIGHBOR_COMMUNES.includes(name);
}

export function isStrictAquacultureProhibited(locationName: string): boolean {
  return locationName.trim().toLowerCase() === 'hồ ea súp hạ';
}
