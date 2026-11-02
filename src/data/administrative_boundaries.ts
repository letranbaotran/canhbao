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

const TK293_TARGET: MonitoringTarget = {
  name: 'Lâm phần Tiểu khu 293',
  type: 'FOREST',
  description: 'Vùng rừng khộp tự nhiên dễ cháy mùa khô giáp ranh nương rẫy',
  coordinates: [12.982216, 107.886961],
  isStrictAquacultureProhibited: false,
};

const HO_TRUNG_CHUYEN_TARGET: MonitoringTarget = {
  name: 'Hồ Trung Chuyển',
  type: 'AQUACULTURE_ZONE',
  description: 'Khu vực hồ trung chuyển điều tiết nước và nuôi trồng thủy sản có cảm biến IoT giám sát DO và pH',
  coordinates: [13.069298, 107.881527],
  isStrictAquacultureProhibited: false,
};

export const KEY_MONITORING_TARGETS: Record<string, MonitoringTarget> = {
  FOREST_TK293: TK293_TARGET,
  FOREST_TK277: TK293_TARGET, // Alias tương thích
  HO_EASUP_THUONG: {
    name: 'Hồ Ea Súp Thượng',
    type: 'HYDRO_LAKE',
    description: 'Công trình đại thủy nông, dung tích 146 triệu m3, đập chính và tràn xả lũ',
    coordinates: [13.043116, 107.937218],
    isStrictAquacultureProhibited: false,
  },
  HO_EASUP_HA: {
    name: 'Hồ Ea Súp Hạ',
    type: 'HYDRO_LAKE',
    description: 'Vùng bảo vệ nghiêm ngặt nguồn nước thô sinh hoạt - TUYỆT ĐỐI CẤM NUÔI THỦY SẢN',
    coordinates: [13.05685, 107.894562],
    isStrictAquacultureProhibited: true,
  },
  SONG_EASUP: {
    name: 'Toàn tuyến Sông Ea Súp',
    type: 'HYDRO_RIVER',
    description: 'Trục tiêu thoát lũ chính đi qua các thôn trũng',
    coordinates: [13.0512, 107.9105],
    isStrictAquacultureProhibited: false,
  },
  HO_TRUNG_CHUYEN: HO_TRUNG_CHUYEN_TARGET,
  HO_CA_THON_DOAN_KET: HO_TRUNG_CHUYEN_TARGET, // Alias tương thích
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
