import { describe, it, expect } from 'vitest';
import {
  canAccessResource,
  type AuthUser,
  type ResourceAccessContext,
} from '@/security/abac_policy';

describe('PHẦN 7: Ma trận Phân quyền 5 Tầng Zero-Trust (RBAC + ABAC)', () => {
  const publicUser: AuthUser = {
    id: 'user-01',
    role: 'PUBLIC',
    fullName: 'Người dân Ea Súp',
  };

  const villageLeader: AuthUser = {
    id: 'user-02',
    role: 'VILLAGE_LEADER',
    fullName: 'Trưởng Thôn Đoàn Kết',
    villageCode: 'Thôn Đoàn Kết',
    communeCode: 'EASUP',
  };

  const neighborLeader: AuthUser = {
    id: 'user-03',
    role: 'NEIGHBOR_COMMUNE',
    fullName: 'Chủ tịch UBND Xã Ea Bung',
    communeCode: 'Xã Ea Bung',
  };

  const specialistForce: AuthUser = {
    id: 'user-04',
    role: 'SPECIALIST_FORCE',
    fullName: 'Hạt Kiểm lâm Ea Súp',
    organization: 'KIEM_LAM',
    communeCode: 'EASUP',
  };

  const executiveCommand: AuthUser = {
    id: 'user-05',
    role: 'EXECUTIVE_COMMAND',
    fullName: 'Chủ tịch UBND Xã Ea Súp',
    communeCode: 'EASUP',
  };

  it('Tầng 1 (PUBLIC) chỉ được xem dữ liệu công khai, không được xem hồ sơ mật', () => {
    expect(canAccessResource(publicUser, { resource: 'PUBLIC_MAP' })).toBe(true);
    expect(canAccessResource(publicUser, { resource: 'PUBLIC_TTS_BROADCAST' })).toBe(true);
    expect(canAccessResource(publicUser, { resource: 'CLASSIFIED_INVESTIGATION_TK277' })).toBe(false);
    expect(canAccessResource(publicUser, { resource: 'APPROVE_EMERGENCY_ALARM' })).toBe(false);
  });

  it('Tầng 2 (VILLAGE_LEADER) chỉ quản lý phạm vi thôn của mình, không truy cập thôn khác', () => {
    const myVillageCtx: ResourceAccessContext = {
      resource: 'VILLAGE_HOUSEHOLDS',
      targetVillage: 'Thôn Đoàn Kết',
    };
    const otherVillageCtx: ResourceAccessContext = {
      resource: 'VILLAGE_HOUSEHOLDS',
      targetVillage: 'Thôn 1',
    };

    expect(canAccessResource(villageLeader, myVillageCtx)).toBe(true);
    expect(canAccessResource(villageLeader, otherVillageCtx)).toBe(false);
  });

  it('Tầng 3 (NEIGHBOR_COMMUNE) chỉ xem dữ liệu chia sẻ liên xã, bị cô lập hồ sơ Ea Súp', () => {
    expect(canAccessResource(neighborLeader, { resource: 'INTER_COMMUNE_RADAR_MAP' })).toBe(true);
    expect(canAccessResource(neighborLeader, { resource: 'EASUP_INTERNAL_CIVILIAN_RECORDS' })).toBe(false);
  });

  it('Tầng 4 (SPECIALIST_FORCE) được xem hồ sơ điều tra lâm phần Tiểu khu 277', () => {
    expect(canAccessResource(specialistForce, { resource: 'CLASSIFIED_INVESTIGATION_TK277' })).toBe(true);
    expect(canAccessResource(specialistForce, { resource: 'IOT_THRESHOLD_CONFIG' })).toBe(true);
  });

  it('Tầng 5 (EXECUTIVE_COMMAND) có toàn quyền chỉ huy và phê duyệt lệnh báo động', () => {
    expect(canAccessResource(executiveCommand, { resource: 'APPROVE_EMERGENCY_ALARM' })).toBe(true);
    expect(canAccessResource(executiveCommand, { resource: 'LOCK_COMMAND_LOGS' })).toBe(true);
  });
});
