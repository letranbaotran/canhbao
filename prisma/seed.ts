/**
 * SCRIPT KHỞI TẠO DỮ LIỆU ĐỊA CHÍNH, RỪNG VÀ HỒ ĐẬP XÃ EA SÚP (PRISMA POSTGIS SEED)
 */
import {
  EASUP_VILLAGES,
  NEIGHBOR_COMMUNES,
  KEY_MONITORING_TARGETS,
} from '../src/data/administrative_boundaries';

export interface SeedDataset {
  coreCommune: { code: string; name: string; unitType: string };
  villages: Array<{ code: string; name: string; unitType: string; parentCode: string }>;
  neighborCommunes: Array<{ code: string; name: string; unitType: string }>;
  forestCompartments: Array<{ code: string; name: string; protectionLevel: string; coordinates: [number, number] }>;
  hydroStations: Array<{ code: string; name: string; isStrictProtected: boolean; coordinates: [number, number] }>;
}

export function generateSeedData(): SeedDataset {
  const coreCommune = {
    code: 'EASUP',
    name: 'Xã Ea Súp',
    unitType: 'COMMUNE_CORE',
  };

  const villages = EASUP_VILLAGES.map((vName, idx) => ({
    code: `EASUP-VILLAGE-${String(idx + 1).padStart(2, '0')}`,
    name: vName,
    unitType: 'VILLAGE',
    parentCode: 'EASUP',
  }));

  const neighborCommunes = NEIGHBOR_COMMUNES.map((cName, idx) => ({
    code: `COMMUNE-NEIGHBOR-${String(idx + 1).padStart(2, '0')}`,
    name: cName,
    unitType: 'COMMUNE_NEIGHBOR',
  }));

  const forestCompartments = [
    {
      code: 'TK-277',
      name: KEY_MONITORING_TARGETS.FOREST_TK277.name,
      protectionLevel: 'NGHIEM_NGAT',
      coordinates: KEY_MONITORING_TARGETS.FOREST_TK277.coordinates,
    },
  ];

  const hydroStations = [
    {
      code: 'HO_EASUP_THUONG',
      name: KEY_MONITORING_TARGETS.HO_EASUP_THUONG.name,
      isStrictProtected: KEY_MONITORING_TARGETS.HO_EASUP_THUONG.isStrictAquacultureProhibited,
      coordinates: KEY_MONITORING_TARGETS.HO_EASUP_THUONG.coordinates,
    },
    {
      code: 'HO_EASUP_HA',
      name: KEY_MONITORING_TARGETS.HO_EASUP_HA.name,
      isStrictProtected: KEY_MONITORING_TARGETS.HO_EASUP_HA.isStrictAquacultureProhibited, // TRUE (CẤM NUÔI CÁ)
      coordinates: KEY_MONITORING_TARGETS.HO_EASUP_HA.coordinates,
    },
    {
      code: 'SONG_EASUP',
      name: KEY_MONITORING_TARGETS.SONG_EASUP.name,
      isStrictProtected: KEY_MONITORING_TARGETS.SONG_EASUP.isStrictAquacultureProhibited,
      coordinates: KEY_MONITORING_TARGETS.SONG_EASUP.coordinates,
    },
    {
      code: 'HO_CA_THON_DOAN_KET',
      name: KEY_MONITORING_TARGETS.HO_CA_THON_DOAN_KET.name,
      isStrictProtected: KEY_MONITORING_TARGETS.HO_CA_THON_DOAN_KET.isStrictAquacultureProhibited,
      coordinates: KEY_MONITORING_TARGETS.HO_CA_THON_DOAN_KET.coordinates,
    },
  ];

  return {
    coreCommune,
    villages,
    neighborCommunes,
    forestCompartments,
    hydroStations,
  };
}

export async function runSeed(): Promise<SeedDataset> {
  const data = generateSeedData();
  console.log(`[SEED] Đã chuẩn bị dữ liệu:`);
  console.log(`- 01 Xã trung tâm: ${data.coreCommune.name}`);
  console.log(`- ${data.villages.length} Thôn, buôn trực thuộc xã Ea Súp`);
  console.log(`- ${data.neighborCommunes.length} Xã vùng đệm liên kết`);
  console.log(`- ${data.forestCompartments.length} Lâm phần trọng điểm (Tiểu khu 277)`);
  console.log(`- ${data.hydroStations.length} Trọng điểm thủy hệ (Hồ Thượng, Hồ Hạ cấm nuôi cá, Sông Ea Súp, Hồ cá Đoàn Kết)`);
  return data;
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  runSeed().then(() => {
    console.log('[SEED] Hoàn tất nạp dữ liệu địa bàn Ea Súp.');
  });
}
