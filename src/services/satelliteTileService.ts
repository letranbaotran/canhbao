/**
 * DỊCH VỤ CUNG CẤP NGUỒN GẠCH ẢNH VỆ TINH LỊCH SỬ (2001 - 2026)
 * - 2014 - 2026: Tích hợp Esri World Imagery Wayback API (ảnh siêu nét theo từng năm)
 * - 2001 - 2013: NASA GIBS MODIS TrueColor mùa khô cố định (${year}-02-15)
 */

export interface SatelliteTileSource {
  year: number;
  provider: 'ESRI_WAYBACK' | 'NASA_GIBS';
  url: string;
  attribution: string;
  maxZoom: number;
  maxNativeZoom: number;
  dateLabel: string;
}

/**
 * Danh mục Release ID chính thức của Esri Wayback tương ứng từng năm mùa khô (tháng 2 - 3)
 */
export const ESRI_WAYBACK_YEAR_MAP: Record<number, { releaseNum: number; date: string }> = {
  2014: { releaseNum: 10, date: '2014-02-20' },
  2015: { releaseNum: 10443, date: '2015-02-18' },
  2016: { releaseNum: 6354, date: '2016-02-04' },
  2017: { releaseNum: 27946, date: '2017-02-08' },
  2018: { releaseNum: 13067, date: '2018-02-23' },
  2019: { releaseNum: 17677, date: '2019-02-21' },
  2020: { releaseNum: 8495, date: '2020-02-20' },
  2021: { releaseNum: 9812, date: '2021-02-24' },
  2022: { releaseNum: 26083, date: '2022-02-02' },
  2023: { releaseNum: 57965, date: '2023-02-23' },
  2024: { releaseNum: 37965, date: '2024-02-08' },
  2025: { releaseNum: 34007, date: '2025-02-27' },
  2026: { releaseNum: 64001, date: '2026-02-26' },
};

/**
 * Chuyển đổi URL gạch ảnh vệ tinh linh hoạt theo năm (2001 - 2026)
 */
export function getSatelliteTileUrl(year: number): SatelliteTileSource {
  const safeYear = Math.max(2001, Math.min(2026, Math.round(year)));

  // Giai đoạn 2014 - 2026: Dùng Esri World Imagery Wayback độ phân giải cao
  if (safeYear >= 2014) {
    const wayback = ESRI_WAYBACK_YEAR_MAP[safeYear] || ESRI_WAYBACK_YEAR_MAP[2024];
    return {
      year: safeYear,
      provider: 'ESRI_WAYBACK',
      url: `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${wayback.releaseNum}/{z}/{y}/{x}`,
      attribution: `Esri (${safeYear})`,
      maxZoom: 19,
      maxNativeZoom: 18,
      dateLabel: wayback.date,
    };
  }

  // Giai đoạn 2001 - 2013: Dùng NASA GIBS MODIS TrueColor mùa khô (${year}-02-15)
  // Lưu ý: MODIS Level9 chỉ hỗ trợ zoom tới mức 9. maxNativeZoom: 9 để Leaflet tự phóng đại lên zoom 12-19
  const dateStr = `${safeYear}-02-15`;
  return {
    year: safeYear,
    provider: 'NASA_GIBS',
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${dateStr}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    attribution: `NASA MODIS (${safeYear})`,
    maxZoom: 19,
    maxNativeZoom: 9,
    dateLabel: dateStr,
  };
}
