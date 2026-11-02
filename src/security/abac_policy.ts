/**
 * MA TRẬN PHÂN QUYỀN 5 TẦNG ZERO-TRUST (HYBRID RBAC + ABAC + POSTGIS RLS)
 */

export type UserRole =
  | 'PUBLIC'
  | 'VILLAGE_LEADER'
  | 'NEIGHBOR_COMMUNE'
  | 'SPECIALIST_FORCE'
  | 'EXECUTIVE_COMMAND';

export interface AuthUser {
  id: string;
  fullName: string;
  role: UserRole;
  communeCode?: string;
  villageCode?: string;
  organization?: string; // KIEM_LAM, CONG_AN, BCHQS, UBND...
}

export interface ResourceAccessContext {
  resource:
    | 'PUBLIC_MAP'
    | 'PUBLIC_TTS_BROADCAST'
    | 'VILLAGE_HOUSEHOLDS'
    | 'INTER_COMMUNE_RADAR_MAP'
    | 'EASUP_INTERNAL_CIVILIAN_RECORDS'
    | 'CLASSIFIED_INVESTIGATION_TK277'
    | 'IOT_THRESHOLD_CONFIG'
    | 'APPROVE_EMERGENCY_ALARM'
    | 'LOCK_COMMAND_LOGS';
  targetVillage?: string;
  targetCommune?: string;
}

/**
 * Kiểm tra quyền truy cập tài nguyên theo bối cảnh thuộc tính (ABAC)
 */
export function canAccessResource(user: AuthUser, context: ResourceAccessContext): boolean {
  // 1. Tầng 5: EXECUTIVE_COMMAND có toàn quyền
  if (user.role === 'EXECUTIVE_COMMAND') {
    return true;
  }

  // 2. Tài nguyên công khai (Tầng 1)
  if (context.resource === 'PUBLIC_MAP' || context.resource === 'PUBLIC_TTS_BROADCAST') {
    return true;
  }

  // 3. Tầng 1 (PUBLIC) không được truy cập các tài nguyên nghiệp vụ nội bộ
  if (user.role === 'PUBLIC') {
    return false;
  }

  // 4. Tầng 2: VILLAGE_LEADER chỉ được truy cập thôn của chính mình
  if (user.role === 'VILLAGE_LEADER') {
    if (context.resource === 'VILLAGE_HOUSEHOLDS') {
      return Boolean(user.villageCode && user.villageCode === context.targetVillage);
    }
    return false;
  }

  // 5. Tầng 3: NEIGHBOR_COMMUNE chỉ xem bản đồ radar chia sẻ liên xã
  if (user.role === 'NEIGHBOR_COMMUNE') {
    if (context.resource === 'INTER_COMMUNE_RADAR_MAP') {
      return true;
    }
    // Cô lập hoàn toàn không xem dữ liệu nội bộ Ea Súp
    return false;
  }

  // 6. Tầng 4: SPECIALIST_FORCE (Kiểm lâm, Thủy nông, Quân sự, Công an)
  if (user.role === 'SPECIALIST_FORCE') {
    if (
      context.resource === 'CLASSIFIED_INVESTIGATION_TK277' ||
      context.resource === 'IOT_THRESHOLD_CONFIG' ||
      context.resource === 'INTER_COMMUNE_RADAR_MAP' ||
      context.resource === 'VILLAGE_HOUSEHOLDS'
    ) {
      return true;
    }
    // Không có quyền phát lệnh báo động tối cấp hoặc khóa sổ nhật ký chỉ huy
    return false;
  }

  return false;
}
