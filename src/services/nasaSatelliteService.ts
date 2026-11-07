/**
 * DỊCH VỤ ĐỒNG BỘ VIỄN THÁM NASA (FIRMS & GIBS WMTS)
 * Quét Bounding Box [107.55, 13.00, 108.10, 13.50]
 */

export interface GibsLayerDefinition {
  id: string;
  name: string;
  layerTag: string;
  format: string;
  timeRange: string;
  wmtsTemplate: string;
  description: string;
}

/**
 * Danh sách 6 lớp bản đồ NASA GIBS OGC WMTS chính thức phục vụ giám sát Ea Súp
 */
export const NASA_GIBS_LAYERS: Record<string, GibsLayerDefinition> = {
  THERMAL_ANOMALIES: {
    id: 'VIIRS_SNPP_Thermal_Anomalies_375m_All',
    name: 'Điểm ảnh nhiệt',
    layerTag: 'VIIRS_SNPP_Thermal_Anomalies_375m_All',
    format: 'image/png',
    timeRange: '2012-nay',
    wmtsTemplate:
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_Thermal_Anomalies_375m_All/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
    description: 'Ảnh vệ tinh phát hiện điểm cháy rừng và bất thường nhiệt độ mặt đất',
  },
  TRUE_COLOR: {
    id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    name: 'Ảnh vệ tinh tự nhiên',
    layerTag: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    format: 'image/jpeg',
    timeRange: '2012-nay',
    wmtsTemplate:
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpeg',
    description: 'Ảnh vệ tinh quang học màu tự nhiên độ nét cao',
  },
  NDVI_VEGETATION: {
    id: 'MODIS_Terra_NDVI_8Day',
    name: 'Độ che phủ rừng',
    layerTag: 'MODIS_Terra_NDVI_8Day',
    format: 'image/png',
    timeRange: '2000-nay',
    wmtsTemplate:
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
    description: 'Mức độ tươi tốt và độ che phủ rừng trên địa bàn xã Ea Súp',
  },
  SOIL_MOISTURE: {
    id: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture',
    name: 'Độ ẩm đất',
    layerTag: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture',
    format: 'image/png',
    timeRange: '2015-nay',
    wmtsTemplate:
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SMAP_L4_Analyzed_Root_Zone_Soil_Moisture/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
    description: 'Quan sát độ ẩm tầng rễ đất phục vụ phân vùng hạn hán',
  },
  FLOOD_SURFACE: {
    id: 'MODIS_Combined_Flood_250m',
    name: 'Bản đồ ngập lụt',
    layerTag: 'MODIS_Combined_Flood_250m',
    format: 'image/png',
    timeRange: '2011-nay',
    wmtsTemplate:
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Combined_Flood_250m/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
    description: 'Mặt nước dâng ngập vùng hạ du và các vùng trũng ven sông',
  },
  LAND_COVER: {
    id: 'MODIS_Terra_CorrectedReflectance_Bands721',
    name: 'Mặt phủ đất & Rừng',
    layerTag: 'MODIS_Terra_CorrectedReflectance_Bands721',
    format: 'image/jpeg',
    timeRange: '2000-nay',
    wmtsTemplate:
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_Bands721/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpeg',
    description: 'Ảnh viễn thám hồng ngoại sóng ngắn SWIR phân biệt thảm rừng, đất sản xuất và mặt nước',
  },
};

/**
 * Cấu hình so sánh lịch sử 25 năm (Swipe Compare 2000 - 2026) cho Tiểu khu 277
 */
export interface SwipeCompareConfig {
  compartmentCode: string; // 'TK-277'
  leftDate: string; // '2001-03-15'
  rightDate: string; // '2026-03-15'
  layer: string;
}

export function buildNasaGibsTileUrl(
  layerId: keyof typeof NASA_GIBS_LAYERS,
  dateIso: string,
  tileMatrix: number,
  row: number,
  col: number
): string {
  const layer = NASA_GIBS_LAYERS[layerId];
  if (!layer) throw new Error(`Lớp NASA GIBS không tồn tại: ${String(layerId)}`);

  return layer.wmtsTemplate
    .replace('{Time}', dateIso)
    .replace('{TileMatrixSet}', 'GoogleMapsCompatible_Level8')
    .replace('{TileMatrix}', String(tileMatrix))
    .replace('{TileRow}', String(row))
    .replace('{TileCol}', String(col));
}
