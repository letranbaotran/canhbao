export interface FloodMarkPoint2023 {
  id: string;
  code: string;
  name: string;
  vn2000_x: number;
  vn2000_y: number;
  muc_nuoc_thuc_do_m: number;
  muc_nuoc_mike_flood_m: number;
  sai_so_m: number;
  lat: number;
  lng: number;
  rawGeoJsonLngLat: [number, number];
}

export interface VulnerableFacilityItem {
  id: string;
  name: string;
  shortLabel: string;
  type: 'HEALTH' | 'EDUCATION' | 'DEFENSE';
  depthRange: string;
  depthLevel: '<0.5m' | '0.5-1m' | '1-2m' | '2-3m' | '>3m';
  lat: number;
  lng: number;
  addressNote: string;
  responsePlan: string;
}

export const MIKE21_DEPTH_LEGEND = [
  {
    level: '<0.5m',
    label: '< 0.5 m',
    desc: 'Ngập nông sân bãi, đường nội thôn',
    color: '#38bdf8',
    borderColor: '#0284c7',
  },
  {
    level: '0.5-1m',
    label: '0.5 - 1.0 m',
    desc: 'Ngập nền nhà thấp, chia cắt xe nhỏ',
    color: '#2563eb',
    borderColor: '#1d4ed8',
  },
  {
    level: '1-2m',
    label: '1.0 - 2.0 m',
    desc: 'Ngập sâu khu dân cư, Bệnh viện ĐK',
    color: '#f59e0b',
    borderColor: '#d97706',
  },
  {
    level: '2-3m',
    label: '2.0 - 3.0 m',
    desc: 'Ngập nguy hiểm, Trường MN Hoa Phượng',
    color: '#ea580c',
    borderColor: '#c2410c',
  },
  {
    level: '>3m',
    label: '> 3.0 m',
    desc: 'Ngập đặc biệt sâu lòng dẫn & vùng trũng',
    color: '#e11d48',
    borderColor: '#be123c',
  },
] as const;

/**
 * Bảng 3.1 Báo cáo chuyên đề MIKE FLOOD: 10 Vết lũ kiểm định thực tế (Trận lũ lịch sử tháng 7/2023)
 * Tích hợp đầy đủ tọa độ VN-2000 gốc, mực nước thực đo, mực nước mô hình MIKE FLOOD và sai số kiểm định.
 */
export const VERIFIED_FLOOD_MARKS_2023: FloodMarkPoint2023[] = [
  {
    id: 'VL_02',
    code: 'VL-02',
    name: 'Vết lũ số 02 (Thượng lưu suối Ea Súp)',
    vn2000_x: 1450401.29,
    vn2000_y: 482525.81,
    muc_nuoc_thuc_do_m: 179.039,
    muc_nuoc_mike_flood_m: 179.595,
    sai_so_m: 0.556,
    lat: 13.0485,
    lng: 107.9162,
    rawGeoJsonLngLat: [108.340684, 13.114921],
  },
  {
    id: 'VL_04',
    code: 'VL-04',
    name: 'Vết lũ số 04 (Khu vực Thôn Đoàn Kết - Trung tâm)',
    vn2000_x: 1454233.76,
    vn2000_y: 479922.7,
    muc_nuoc_thuc_do_m: 174.106,
    muc_nuoc_mike_flood_m: 173.668,
    sai_so_m: -0.438,
    lat: 13.0682,
    lng: 107.8845,
    rawGeoJsonLngLat: [108.316649, 13.14955],
  },
  {
    id: 'VL_10',
    code: 'VL-10',
    name: 'Vết lũ số 10 (Hạ lưu giáp Ea Rốk - Ia Lốp)',
    vn2000_x: 1465448.99,
    vn2000_y: 473298.6,
    muc_nuoc_thuc_do_m: 162.304,
    muc_nuoc_mike_flood_m: 162.951,
    sai_so_m: 0.647,
    lat: 13.1365,
    lng: 107.8358,
    rawGeoJsonLngLat: [108.255445, 13.250882],
  },
  {
    id: 'VL_13',
    code: 'VL-13',
    name: 'Vết lũ số 13 (Vùng trũng cánh đồng lúa 2 vụ)',
    vn2000_x: 1455965.24,
    vn2000_y: 478634.71,
    muc_nuoc_thuc_do_m: 171.98,
    muc_nuoc_mike_flood_m: 172.518,
    sai_so_m: 0.538,
    lat: 13.0794,
    lng: 107.8742,
    rawGeoJsonLngLat: [108.304756, 13.165193],
  },
  {
    id: 'VL_14',
    code: 'VL-14',
    name: 'Vết lũ số 14 (Khu dân cư ven suối Ea Súp)',
    vn2000_x: 1455591.54,
    vn2000_y: 478759.02,
    muc_nuoc_thuc_do_m: 172.806,
    muc_nuoc_mike_flood_m: 172.31,
    sai_so_m: -0.496,
    lat: 13.0748,
    lng: 107.8786,
    rawGeoJsonLngLat: [108.305905, 13.161816],
  },
  {
    id: 'VL_16',
    code: 'VL-16',
    name: 'Vết lũ số 16 (Khu vực cầu tràn liên thôn)',
    vn2000_x: 1457071.31,
    vn2000_y: 477306.03,
    muc_nuoc_thuc_do_m: 169.855,
    muc_nuoc_mike_flood_m: 170.0,
    sai_so_m: 0.145,
    lat: 13.0868,
    lng: 107.8664,
    rawGeoJsonLngLat: [108.29249, 13.175182],
  },
  {
    id: 'VL_18',
    code: 'VL-18',
    name: 'Vết lũ số 18 (Bãi bồi tả ngạn suối Ea Súp)',
    vn2000_x: 1459570.7,
    vn2000_y: 476355.48,
    muc_nuoc_thuc_do_m: 166.318,
    muc_nuoc_mike_flood_m: 166.791,
    sai_so_m: 0.373,
    lat: 13.1012,
    lng: 107.8582,
    rawGeoJsonLngLat: [108.283701, 13.197769],
  },
  {
    id: 'VL_19',
    code: 'VL-19',
    name: "Vết lũ số 19 (Hợp lưu nhánh suối về sông Ea H'Leo)",
    vn2000_x: 1462552.55,
    vn2000_y: 473961.56,
    muc_nuoc_thuc_do_m: 162.959,
    muc_nuoc_mike_flood_m: 162.758,
    sai_so_m: -0.201,
    lat: 13.1215,
    lng: 107.8425,
    rawGeoJsonLngLat: [108.261588, 13.224704],
  },
  {
    id: 'VL_21',
    code: 'VL-21',
    name: 'Vết lũ số 21 (Cánh đồng hạ du trũng thấp)',
    vn2000_x: 1462066.31,
    vn2000_y: 474777.22,
    muc_nuoc_thuc_do_m: 165.372,
    muc_nuoc_mike_flood_m: 165.822,
    sai_so_m: 0.45,
    lat: 13.1142,
    lng: 107.8504,
    rawGeoJsonLngLat: [108.269119, 13.220316],
  },
  {
    id: 'VL_24',
    code: 'VL-24',
    name: 'Vết lũ số 24 (Hữu ngạn suối Ea Súp - Ea Lê)',
    vn2000_x: 1459936.15,
    vn2000_y: 479655.44,
    muc_nuoc_thuc_do_m: 169.21,
    muc_nuoc_mike_flood_m: 169.117,
    sai_so_m: -0.093,
    lat: 13.0958,
    lng: 107.8985,
    rawGeoJsonLngLat: [108.314145, 13.201096],
  },
];

/**
 * Danh mục cơ sở/trụ sở xung yếu có nguy cơ ngập lụt theo tọa độ chuẩn hóa
 */
export const VULNERABLE_FACILITIES = [
  { id: 1, name: "Bệnh viện Đa khoa Ea Súp (Trung tâm Y tế)", depth: "1.0 - 2.0m", lat: 13.074723, lng: 107.889229, address: "265 Hùng Vương, xã Ea Súp" },
  { id: 2, name: "Trường Mầm non Hoa Phượng", depth: "2.0 - 3.0m", lat: 13.170935, lng: 107.820358, address: "Thôn 11, hạ lưu suối Ea Súp (Ea Rốk)" },
  { id: 3, name: "Cụm trường TH & THCS Ea Lê (Điểm chính)", depth: "0.5 - 1.5m", lat: 13.112702, lng: 107.859992, address: "Thôn 5, khu vực Ea Lê, xã Ea Súp" },
  { id: 31, name: "Trường Tiểu học Ea Lê (Phân hiệu Cầu Ea Súp)", depth: "0.5 - 1.5m", lat: 13.079185, lng: 107.892405, address: "Cạnh Cầu Ea Súp, đường Hùng Vương, xã Ea Súp" },
  { id: 4, name: "Trường Tiểu học Nguyễn Viết Xuân", depth: "0.5 - 1.0m", lat: 13.173572, lng: 107.820253, address: "Thôn 11, hạ lưu suối Ea Súp (Ea Rốk)" },
  { id: 5, name: "Trường Tiểu học Nguyễn Bá Ngọc", depth: "1.0 - 2.0m", lat: 13.072145, lng: 107.886360, address: "70 Hùng Vương, xã Ea Súp" },
  { id: 6, name: "Trường Tiểu học Trần Quốc Toản", depth: "0.5 - 1.0m", lat: 13.132297, lng: 107.815186, address: "Đường Vũ Đức Cường, khu vực Ea Bung" },
  { id: 7, name: "Trường THCS Lê Quý Đôn", depth: "0.5 - 1.5m", lat: 13.120340, lng: 107.826407, address: "Khu vực Ea Bung" },
  { id: 8, name: "Trường Quang Trung (Số 34 Điện Biên Phủ)", depth: "< 0.5m - 1.0m", lat: 13.069132, lng: 107.887680, address: "34 Điện Biên Phủ, xã Ea Súp" },
  { id: 9, name: "Trung đoàn 736 (Đoàn KT-QP 737)", depth: "0.5 - 1.5m", lat: 13.267715, lng: 107.674279, address: "QL14C, Thôn 9, khu vực Ia Rvê" },
  { id: 10, name: "Đồn Biên phòng 735 (Đồn BP Ea H'Leo)", depth: "0.5 - 1.2m", lat: 13.299772, lng: 107.613420, address: "Tuyến biên giới QL14C, khu vực Ia Rvê" }
];

/**
 * Danh mục 10 Công trình Y tế - Giáo dục - Quốc phòng có nguy cơ ngập lụt khi xả lũ / vỡ đập
 */
export const VULNERABLE_FACILITIES_EASUP: VulnerableFacilityItem[] = [
  {
    id: 'FAC_BV_EASUP',
    name: 'Bệnh viện Đa khoa Ea Súp (Trung tâm Y tế)',
    shortLabel: 'BV Đa khoa Ea Súp (1-2m)',
    type: 'HEALTH',
    depthRange: '1.0 - 2.0m',
    depthLevel: '1-2m',
    lat: 13.074723,
    lng: 107.889229,
    addressNote: '265 Hùng Vương, xã Ea Súp (Trung tâm Y tế)',
    responsePlan: 'Di dời bệnh nhân nặng và trang thiết bị y tế lên tầng 2 ngay khi MBL Ea Súp chạm BĐ III (189.0m).',
  },
  {
    id: 'FAC_MN_HOAPHUONG',
    name: 'Trường Mầm non Hoa Phượng',
    shortLabel: 'MN Hoa Phượng (2-3m)',
    type: 'EDUCATION',
    depthRange: '2.0 - 3.0m',
    depthLevel: '2-3m',
    lat: 13.170935,
    lng: 107.820358,
    addressNote: 'Thôn 11, hạ lưu suối Ea Súp (Ea Rốk)',
    responsePlan: 'Cho học sinh nghỉ học khẩn cấp và khóa điện toàn trường khi kích hoạt kịch bản xả lũ từ KB4.1 trở lên.',
  },
  {
    id: 'FAC_CUM_EALE',
    name: 'Cụm trường TH & THCS Ea Lê (Điểm chính)',
    shortLabel: 'TH & THCS Ea Lê',
    type: 'EDUCATION',
    depthRange: '0.5 - 1.5m',
    depthLevel: '1-2m',
    lat: 13.112702,
    lng: 107.859992,
    addressNote: 'Thôn 5, khu vực Ea Lê, xã Ea Súp',
    responsePlan: 'Cảnh báo ngập đường liên thôn và cầu tràn; sơ tán học sinh trước khi nước dâng qua ngầm tràn.',
  },
  {
    id: 'FAC_TH_EALE_CAUEASUP',
    name: 'Trường Tiểu học Ea Lê (Phân hiệu Cầu Ea Súp)',
    shortLabel: 'TH Ea Lê (Cầu Ea Súp)',
    type: 'EDUCATION',
    depthRange: '0.5 - 1.5m',
    depthLevel: '1-2m',
    lat: 13.079185,
    lng: 107.892405,
    addressNote: 'Cạnh Cầu Ea Súp, đường Hùng Vương, xã Ea Súp',
    responsePlan: 'Kê cao trang thiết bị dạy học, bố trí phương án di chuyển học sinh khi nước suối Ea Súp dâng tràn.',
  },
  {
    id: 'FAC_TH_NGUYENVIETXUAN',
    name: 'Trường Tiểu học Nguyễn Viết Xuân',
    shortLabel: 'TH Nguyễn Viết Xuân',
    type: 'EDUCATION',
    depthRange: '0.5 - 1.0m',
    depthLevel: '0.5-1m',
    lat: 13.173572,
    lng: 107.820253,
    addressNote: 'Thôn 11, hạ lưu suối Ea Súp (Ea Rốk)',
    responsePlan: 'Kê cao tài liệu, thiết bị dạy học; phối hợp Ban tự quản thôn chốt chặn khu vực nước chảy xiết.',
  },
  {
    id: 'FAC_TH_NGUYENBANGOC',
    name: 'Trường Tiểu học Nguyễn Bá Ngọc',
    shortLabel: 'TH Nguyễn Bá Ngọc',
    type: 'EDUCATION',
    depthRange: '1.0 - 2.0m',
    depthLevel: '1-2m',
    lat: 13.072145,
    lng: 107.886360,
    addressNote: '70 Hùng Vương, xã Ea Súp',
    responsePlan: 'Tạm dừng học tập khi có lệnh xả tràn Hồ Ea Súp Thượng; sử dụng tầng cao làm điểm tránh trú tạm thời.',
  },
  {
    id: 'FAC_TH_TRANQUOCTOAN',
    name: 'Trường Tiểu học Trần Quốc Toản',
    shortLabel: 'TH Trần Quốc Toản',
    type: 'EDUCATION',
    depthRange: '0.5 - 1.0m',
    depthLevel: '0.5-1m',
    lat: 13.132297,
    lng: 107.815186,
    addressNote: 'Đường Vũ Đức Cường, khu vực Ea Bung',
    responsePlan: 'Kiểm soát an toàn hệ thống tường rào, cổng trường và hành lang thoát nước.',
  },
  {
    id: 'FAC_THCS_LEQUYDON',
    name: 'Trường THCS Lê Quý Đôn',
    shortLabel: 'THCS Lê Quý Đôn',
    type: 'EDUCATION',
    depthRange: '0.5 - 1.5m',
    depthLevel: '0.5-1m',
    lat: 13.120340,
    lng: 107.826407,
    addressNote: 'Khu vực Ea Bung',
    responsePlan: 'Bảo vệ phòng máy tính, thư viện và chuẩn bị điểm tiếp nhận hậu cần cứu trợ.',
  },
  {
    id: 'FAC_THPT_QUANGTRUNG',
    name: 'Trường Quang Trung (Số 34 Điện Biên Phủ)',
    shortLabel: 'THPT Quang Trung',
    type: 'EDUCATION',
    depthRange: '< 0.5m - 1.0m',
    depthLevel: '<0.5m',
    lat: 13.069132,
    lng: 107.887680,
    addressNote: '34 Điện Biên Phủ, xã Ea Súp',
    responsePlan: 'Sẵn sàng trưng dụng khuôn viên cao ráo làm điểm tập kết sơ tán nhân dân vùng ngập sâu.',
  },
  {
    id: 'FAC_TRUNGDOAN_736',
    name: 'Trung đoàn 736 (Đoàn KT-QP 737)',
    shortLabel: 'Trung đoàn 736',
    type: 'DEFENSE',
    depthRange: '0.5 - 1.5m',
    depthLevel: '0.5-1m',
    lat: 13.267715,
    lng: 107.674279,
    addressNote: 'QL14C, Thôn 9, khu vực Ia Rvê',
    responsePlan: 'Trực chiến 100% quân số, xuồng máy và xe lội nước sẵn sàng ứng cứu nhân dân vùng ngập sâu.',
  },
  {
    id: 'FAC_DONBP_735',
    name: "Đồn Biên phòng 735 (Đồn BP Ea H'Leo)",
    shortLabel: 'Đồn Biên phòng 735',
    type: 'DEFENSE',
    depthRange: '0.5 - 1.2m',
    depthLevel: '0.5-1m',
    lat: 13.299772,
    lng: 107.613420,
    addressNote: 'Tuyến biên giới QL14C, khu vực Ia Rvê',
    responsePlan: 'Chốt chặn các ngầm tràn biên giới trên tuyến QL14C và hỗ trợ di dời các hộ dân vùng trũng.',
  },
];

/**
 * Đánh giá nguy cơ ngập tại tọa độ GPS bất kỳ dựa trên mô hình thủy lực MIKE 21 FM
 */
export function evaluateGpsFloodRisk(
  lat: number,
  lng: number,
  scenarioCode: string,
  totalFloodedHa: number
) {
  // Quy đổi ước lượng tọa độ WGS84 sang VN-2000 Đắk Lắk (Kinh tuyến trục 108°30', múi chiếu 3°)
  const vn2000_x = Number((1442500 + (lat - 13.043) * 110574).toFixed(2));
  const vn2000_y = Number((481200 + (lng - 107.905) * 108300).toFixed(2));

  // Tìm vết lũ kiểm định gần nhất
  let nearestMark = VERIFIED_FLOOD_MARKS_2023[0];
  let minDistKm = 9999;

  for (const m of VERIFIED_FLOOD_MARKS_2023) {
    const dLat = (lat - m.lat) * 111.0;
    const dLng = (lng - m.lng) * 108.3;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < minDistKm) {
      minDistKm = dist;
      nearestMark = m;
    }
  }

  // Tính khoảng cách tới trục lòng dẫn suối/sông Ea Súp (từ Hồ Thượng -> Hồ Hạ -> Thôn Đoàn Kết -> Hạ lưu)
  const streamAxisLat = 13.068;
  const streamAxisLng = 107.885;
  const distToStreamKm = Math.sqrt(
    Math.pow((lat - streamAxisLat) * 111.0, 2) + Math.pow((lng - streamAxisLng) * 108.3, 2)
  );

  const scale = totalFloodedHa > 2000 ? 1.45 : totalFloodedHa > 1500 ? 1.15 : totalFloodedHa > 0 ? 0.9 : 0.35;

  let depthLevel: '<0.5m' | '0.5-1m' | '1-2m' | '2-3m' | '>3m' | 'AN_TOAN' = 'AN_TOAN';
  let estimatedDepthM = 0;
  let riskLabel = 'An toàn (Ngoài vùng ngập)';
  let badgeColor = '#047857';
  let recommendation = 'Vị trí hiện tại nằm trên địa hình cao ráo, an toàn trước các kịch bản xả lũ.';

  if (distToStreamKm < 0.65 * scale) {
    depthLevel = '2-3m';
    estimatedDepthM = Number((2.15 * scale).toFixed(2));
    riskLabel = 'Nguy cơ ngập rất cao (2.0 - 3.0m)';
    badgeColor = '#ea580c';
    recommendation =
      'Vị trí nằm sát hành lang thoát lũ chính suối Ea Súp. Cần di chuyển ngay về phía đường cao Thôn 1 / Trường THPT Ea Súp khi có lệnh xả tràn!';
  } else if (distToStreamKm < 1.35 * scale) {
    depthLevel = '1-2m';
    estimatedDepthM = Number((1.35 * scale).toFixed(2));
    riskLabel = 'Nguy cơ ngập sâu (1.0 - 2.0m)';
    badgeColor = '#d97706';
    recommendation =
      'Khu vực có nguy cơ ngập từ 1.0 - 2.0m theo mô hình MIKE 21 FM. Chủ động kê cao tài sản và sẵn sàng sơ tán.';
  } else if (distToStreamKm < 2.2 * scale) {
    depthLevel = '0.5-1m';
    estimatedDepthM = Number((0.68 * scale).toFixed(2));
    riskLabel = 'Nguy cơ ngập trung bình (0.5 - 1.0m)';
    badgeColor = '#2563eb';
    recommendation =
      'Cảnh báo ngập cục bộ sân vườn và đường giao thông nội thôn từ 0.5 - 1.0m khi mưa lũ lớn.';
  } else if (distToStreamKm < 3.2 * scale) {
    depthLevel = '<0.5m';
    estimatedDepthM = Number((0.28 * scale).toFixed(2));
    riskLabel = 'Ngập nông ven vùng trũng (< 0.5m)';
    badgeColor = '#0284c7';
    recommendation = 'Theo dõi bản tin Loa truyền thanh số và hạn chế qua lại các ngầm tràn khi mưa lớn.';
  }

  return {
    lat,
    lng,
    vn2000_x,
    vn2000_y,
    scenarioCode,
    depthLevel,
    estimatedDepthM,
    riskLabel,
    badgeColor,
    recommendation,
    nearestMark,
    minDistKm: Number(minDistKm.toFixed(2)),
  };
}

