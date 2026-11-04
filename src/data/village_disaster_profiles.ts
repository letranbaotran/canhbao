export interface VillageHydraulicContext {
  code: string;
  totalFloodedAreaHa: number;
  affectedHouseholds: number;
  criticalVillages: readonly string[] | string[];
  affectedVillages: readonly string[] | string[];
}

export interface VillageDisasterProfile {
  name: string;
  groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)' | '04 Thôn tên' | '03 Buôn đồng bào';
  avgElevationM: number; // Cao độ địa hình trung bình (+172m đến +185m)
  terrainNote: string;
  totalHouseholds: number;
  baseAffectedWeight: number; // Tỷ trọng hộ ngập trong kịch bản chuẩn KB1.1 (tổng 533 hộ)
  evacuationPoint: string;
  evacuationElevationM: number;
  evacuationDistanceKm: number;
  leaderUnit: string;
}

export const VILLAGE_DISASTER_PROFILES: Record<string, VillageDisasterProfile> = {
  'Thôn Đoàn Kết': {
    name: 'Thôn Đoàn Kết',
    groupLabel: '04 Thôn tên',
    avgElevationM: 172.4,
    terrainNote: 'Vùng trũng thấp giáp Hồ Trung Chuyển và hành lang thoát lũ suối Ea Súp',
    totalHouseholds: 245,
    baseAffectedWeight: 0.165, // ~88 hộ ở KB1.1
    evacuationPoint: 'Trường THPT Ea Súp & Nhà văn hóa trung tâm xã (+188.5m)',
    evacuationElevationM: 188.5,
    evacuationDistanceKm: 1.1,
    leaderUnit: 'Tổ xung kích PCTT Thôn Đoàn Kết',
  },
  'Thôn Bình Lợi': {
    name: 'Thôn Bình Lợi',
    groupLabel: '04 Thôn tên',
    avgElevationM: 172.9,
    terrainNote: 'Bãi bồi ven suối Ea Súp, nhạy cảm ngập sâu khi xả tràn Hồ Thượng',
    totalHouseholds: 210,
    baseAffectedWeight: 0.125, // ~67 hộ ở KB1.1
    evacuationPoint: 'Khuôn viên cao Trường THCS Lê Quý Đôn (+187.2m)',
    evacuationElevationM: 187.2,
    evacuationDistanceKm: 1.3,
    leaderUnit: 'Tổ xung kích PCTT Thôn Bình Lợi',
  },
  'Thôn Thắng Lợi': {
    name: 'Thôn Thắng Lợi',
    groupLabel: '04 Thôn tên',
    avgElevationM: 177.6,
    terrainNote: 'Địa hình thoải dần về phía kênh chính Tây, ngập cục bộ khi vỡ đập',
    totalHouseholds: 195,
    baseAffectedWeight: 0.03,
    evacuationPoint: 'Trụ sở UBND & UBMTTQ xã Ea Súp (+189.5m)',
    evacuationElevationM: 189.5,
    evacuationDistanceKm: 1.4,
    leaderUnit: 'Tổ xung kích PCTT Thôn Thắng Lợi',
  },
  'Thôn Hòa Bình': {
    name: 'Thôn Hòa Bình',
    groupLabel: '04 Thôn tên',
    avgElevationM: 178.4,
    terrainNote: 'Thềm địa hình trung bình cao, an toàn trong xả lũ thường xuyên',
    totalHouseholds: 188,
    baseAffectedWeight: 0.025,
    evacuationPoint: 'Nhà văn hóa đa năng Thôn Hòa Bình (+186.8m)',
    evacuationElevationM: 186.8,
    evacuationDistanceKm: 0.8,
    leaderUnit: 'Tổ xung kích PCTT Thôn Hòa Bình',
  },
  'Thôn 1': {
    name: 'Thôn 1',
    groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)',
    avgElevationM: 176.2,
    terrainNote: 'Khu vực trung tâm hành chính - thương mại, ven trục thoát nước chính',
    totalHouseholds: 260,
    baseAffectedWeight: 0.045,
    evacuationPoint: 'Trụ sở HĐND - UBND xã Ea Súp (+189.5m)',
    evacuationElevationM: 189.5,
    evacuationDistanceKm: 0.6,
    leaderUnit: 'Tổ xung kích PCTT Thôn 1',
  },
  'Thôn 2': {
    name: 'Thôn 2',
    groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)',
    avgElevationM: 176.8,
    terrainNote: 'Giáp trục giao thông Tỉnh lộ 681, có nguy cơ ngập đoạn trũng',
    totalHouseholds: 230,
    baseAffectedWeight: 0.04,
    evacuationPoint: 'Trường THPT Ea Súp (+188.5m)',
    evacuationElevationM: 188.5,
    evacuationDistanceKm: 0.9,
    leaderUnit: 'Tổ xung kích PCTT Thôn 2',
  },
  'Thôn 3': {
    name: 'Thôn 3',
    groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)',
    avgElevationM: 178.9,
    terrainNote: 'Vùng gò đồi thoải phía Đông Bắc trung tâm xã',
    totalHouseholds: 205,
    baseAffectedWeight: 0.02,
    evacuationPoint: 'Điểm cao Doanh trại Trung đoàn 736 (+187.8m)',
    evacuationElevationM: 187.8,
    evacuationDistanceKm: 1.2,
    leaderUnit: 'Tổ xung kích PCTT Thôn 3',
  },
  'Thôn 4': {
    name: 'Thôn 4',
    groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)',
    avgElevationM: 179.5,
    terrainNote: 'Khu dân cư ổn định dọc tuyến kênh chính Đông',
    totalHouseholds: 198,
    baseAffectedWeight: 0.015,
    evacuationPoint: 'Nhà văn hóa liên thôn 3 - 4 (+187.0m)',
    evacuationElevationM: 187.0,
    evacuationDistanceKm: 0.7,
    leaderUnit: 'Tổ xung kích PCTT Thôn 4',
  },
  'Thôn 5': {
    name: 'Thôn 5',
    groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)',
    avgElevationM: 173.8,
    terrainNote: 'Vùng trũng ven suối Ea Súp, chịu ảnh hưởng trực tiếp khi xả lũ > BĐ III',
    totalHouseholds: 215,
    baseAffectedWeight: 0.085, // ~45 hộ ở KB1.1
    evacuationPoint: 'Khuôn viên cao Trường TH Nguyễn Viết Xuân (+185.8m)',
    evacuationElevationM: 185.8,
    evacuationDistanceKm: 1.0,
    leaderUnit: 'Tổ xung kích PCTT Thôn 5',
  },
  'Thôn 6': {
    name: 'Thôn 6',
    groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)',
    avgElevationM: 173.5,
    terrainNote: 'Hành lang ngập hạ du suối Ea Súp và cánh đồng lúa 2 vụ',
    totalHouseholds: 224,
    baseAffectedWeight: 0.09, // ~48 hộ ở KB1.1
    evacuationPoint: 'Trường THCS Lê Quý Đôn (+187.2m)',
    evacuationElevationM: 187.2,
    evacuationDistanceKm: 1.1,
    leaderUnit: 'Tổ xung kích PCTT Thôn 6',
  },
  'Thôn 7': {
    name: 'Thôn 7',
    groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)',
    avgElevationM: 173.2,
    terrainNote: 'Khu dân cư ven suối Ea Súp (gần Vết lũ kiểm định số 14)',
    totalHouseholds: 218,
    baseAffectedWeight: 0.095, // ~51 hộ ở KB1.1
    evacuationPoint: 'Tầng 2 Trường TH Nguyễn Bá Ngọc & Đồi cao Thôn 3 (+186.5m)',
    evacuationElevationM: 186.5,
    evacuationDistanceKm: 1.2,
    leaderUnit: 'Tổ xung kích PCTT Thôn 7',
  },
  'Thôn 8': {
    name: 'Thôn 8',
    groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)',
    avgElevationM: 172.6,
    terrainNote: 'Trọng điểm trũng thấp hạ lưu đập Hồ Hạ và ngầm tràn liên thôn',
    totalHouseholds: 236,
    baseAffectedWeight: 0.135, // ~72 hộ ở KB1.1
    evacuationPoint: 'Trường THPT Quang Trung (+186.5m)',
    evacuationElevationM: 186.5,
    evacuationDistanceKm: 1.4,
    leaderUnit: 'Tổ xung kích PCTT Thôn 8',
  },
  'Thôn 9': {
    name: 'Thôn 9',
    groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)',
    avgElevationM: 174.1,
    terrainNote: 'Vùng bãi bồi tả ngạn suối Ea Súp, dễ chia cắt giao thông nội đồng',
    totalHouseholds: 192,
    baseAffectedWeight: 0.075, // ~40 hộ ở KB1.1
    evacuationPoint: 'Trường THPT Quang Trung (+186.5m)',
    evacuationElevationM: 186.5,
    evacuationDistanceKm: 1.5,
    leaderUnit: 'Tổ xung kích PCTT Thôn 9',
  },
  'Thôn 10': {
    name: 'Thôn 10',
    groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)',
    avgElevationM: 174.6,
    terrainNote: 'Vùng trũng hạ du cánh đồng Ea Súp giáp tuyến QL14C',
    totalHouseholds: 185,
    baseAffectedWeight: 0.068, // ~36 hộ ở KB1.1
    evacuationPoint: 'Chốt cao Đồn Biên phòng 735 (+185.6m)',
    evacuationElevationM: 185.6,
    evacuationDistanceKm: 1.6,
    leaderUnit: 'Tổ xung kích PCTT Thôn 10',
  },
  'Thôn 11': {
    name: 'Thôn 11',
    groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)',
    avgElevationM: 175.0,
    terrainNote: 'Khu vực hạ lưu suối Ea Súp hướng về vùng giáp ranh Ea Rốk',
    totalHouseholds: 178,
    baseAffectedWeight: 0.062, // ~33 hộ ở KB1.1
    evacuationPoint: 'Cụm trường cao ráo & Nhà văn hóa Thôn 12 (+186.0m)',
    evacuationElevationM: 186.0,
    evacuationDistanceKm: 1.3,
    leaderUnit: 'Tổ xung kích PCTT Thôn 11',
  },
  'Thôn 12': {
    name: 'Thôn 12',
    groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)',
    avgElevationM: 180.8,
    terrainNote: 'Địa hình đồi thoải ổn định, ít chịu tác động ngập lụt',
    totalHouseholds: 170,
    baseAffectedWeight: 0.01,
    evacuationPoint: 'Nhà văn hóa cộng đồng Thôn 12 (+186.0m)',
    evacuationElevationM: 186.0,
    evacuationDistanceKm: 0.5,
    leaderUnit: 'Tổ xung kích PCTT Thôn 12',
  },
  'Thôn 13': {
    name: 'Thôn 13',
    groupLabel: '13 Thôn số (Thôn 1 - Thôn 13)',
    avgElevationM: 181.6,
    terrainNote: 'Khu vực địa hình cao giáp ranh vùng đệm lâm nghiệp Tiểu khu 293',
    totalHouseholds: 165,
    baseAffectedWeight: 0.01,
    evacuationPoint: 'Trạm Kiểm lâm & Nhà văn hóa Thôn 13 (+187.4m)',
    evacuationElevationM: 187.4,
    evacuationDistanceKm: 0.6,
    leaderUnit: 'Tổ xung kích PCTT Thôn 13',
  },
  'Buôn A': {
    name: 'Buôn A',
    groupLabel: '03 Buôn đồng bào',
    avgElevationM: 182.5,
    terrainNote: 'Buôn đồng bào dân tộc thiểu số trên thềm địa hình cao ráo',
    totalHouseholds: 156,
    baseAffectedWeight: 0.008,
    evacuationPoint: 'Nhà sinh hoạt cộng đồng Buôn A (+186.2m)',
    evacuationElevationM: 186.2,
    evacuationDistanceKm: 0.4,
    leaderUnit: 'Tổ xung kích PCTT Buôn A',
  },
  'Buôn B': {
    name: 'Buôn B',
    groupLabel: '03 Buôn đồng bào',
    avgElevationM: 183.8,
    terrainNote: 'Địa hình cao ổn định, cần chú ý phòng chống khô hạn & cháy rừng mùa khô',
    totalHouseholds: 148,
    baseAffectedWeight: 0.006,
    evacuationPoint: 'Nhà sinh hoạt cộng đồng Buôn B (+187.0m)',
    evacuationElevationM: 187.0,
    evacuationDistanceKm: 0.4,
    leaderUnit: 'Tổ xung kích PCTT Buôn B',
  },
  'Buôn C': {
    name: 'Buôn C',
    groupLabel: '03 Buôn đồng bào',
    avgElevationM: 184.6,
    terrainNote: 'Vùng địa hình cao (+184.6m) giáp hành lang rừng khộp',
    totalHouseholds: 142,
    baseAffectedWeight: 0.006,
    evacuationPoint: 'Nhà sinh hoạt cộng đồng Buôn C (+188.0m)',
    evacuationElevationM: 188.0,
    evacuationDistanceKm: 0.5,
    leaderUnit: 'Tổ xung kích PCTT Buôn C',
  },
};

export interface CommunityDisasterReport {
  id: string;
  villageName: string;
  incidentType: 'FLOOD' | 'LANDSLIDE' | 'FOREST_FIRE' | 'CAGE_VIOLATION';
  incidentLabel: string;
  description: string;
  reporterName?: string;
  senderName?: string;
  lat: number;
  lng: number;
  imageUrl?: string | null;
  createdAt?: string;
  timestamp?: string;
}

/**
 * Tính toán dự báo số hộ & nhân khẩu bị ảnh hưởng của từng thôn theo kịch bản MIKE FLOOD hiện tại
 */
export function getVillageScenarioImpact(
  villageName: string,
  hydraulicModel: VillageHydraulicContext
) {
  const profile =
    VILLAGE_DISASTER_PROFILES[villageName] || VILLAGE_DISASTER_PROFILES['Thôn Đoàn Kết'];
  const isCritical = hydraulicModel.criticalVillages.includes(villageName);
  const isAffected = hydraulicModel.affectedVillages.includes(villageName);

  let affectedHouseholds = 0;
  if (hydraulicModel.totalFloodedAreaHa > 0 && isAffected) {
    affectedHouseholds = Math.max(
      4,
      Math.min(
        profile.totalHouseholds,
        Math.round(hydraulicModel.affectedHouseholds * profile.baseAffectedWeight)
      )
    );
  }

  // Số hộ dự phòng nếu kích hoạt KB1.1 (P=1% - 533 hộ) để hiển thị thông tin tham chiếu ngay cả khi đang ở trạng thái an toàn
  const referenceKb11Households = Math.max(
    5,
    Math.round(533 * profile.baseAffectedWeight)
  );

  const affectedPeople = affectedHouseholds * 4;

  const statusLabel = isCritical
    ? '🚨 BÁO ĐỘNG ĐỎ: Ngập sâu - Cần sơ tán khẩn cấp'
    : isAffected
    ? '⚠️ CẢNH BÁO CAM: Nguy cơ ngập vùng trũng'
    : '✓ AN TOÀN: Địa hình ổn định, trực chiến 24/24';

  const statusBadgeClass = isCritical
    ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
    : isAffected
    ? 'bg-amber-500 text-white border-amber-600'
    : 'bg-emerald-600 text-white border-emerald-700';

  const statusLevel: 'CRITICAL' | 'WARNING' | 'SAFE' = isCritical
    ? 'CRITICAL'
    : isAffected
    ? 'WARNING'
    : 'SAFE';

  return {
    profile,
    isCritical,
    isAffected,
    statusLevel,
    affectedHouseholds,
    affectedPeople,
    referenceKb11Households,
    statusLabel,
    statusBadgeClass,
  };
}

