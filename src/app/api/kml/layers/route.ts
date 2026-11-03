import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STORAGE_DIR = path.join(process.cwd(), 'public', 'storage', 'kml');
const INDEX_FILE = path.join(STORAGE_DIR, 'index.json');

interface StoredKmlIndex {
  layers: any[];
  customNames: Record<string, string>;
  enabledStates: Record<string, boolean>;
}

function ensureStorage(): StoredKmlIndex {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  let indexData: StoredKmlIndex = {
    layers: [],
    customNames: {},
    enabledStates: {},
  };

  if (fs.existsSync(INDEX_FILE)) {
    try {
      const raw = fs.readFileSync(INDEX_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      indexData = {
        layers: Array.isArray(parsed.layers) ? parsed.layers : [],
        customNames: parsed.customNames || {},
        enabledStates: parsed.enabledStates || {},
      };
    } catch {
      // ignore corrupted index, will rebuild below
    }
  }

  // Tự động quét thư mục public/storage/kml để khôi phục mọi file KML_*.json trên ổ đĩa nếu chưa có trong index.json
  let changed = false;
  try {
    const files = fs.readdirSync(STORAGE_DIR);
    const knownIds = new Set(indexData.layers.map((l) => String(l.id)));

    for (const fileName of files) {
      if (
        !fileName.endsWith('.json') ||
        fileName === 'index.json' ||
        fileName.startsWith('.')
      ) {
        continue;
      }
      const fullPath = path.join(STORAGE_DIR, fileName);
      try {
        const rawLayer = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const layerId = rawLayer?.id || fileName.replace(/\.json$/i, '');
        const safeId = String(layerId).replace(/[^a-zA-Z0-9_-]/g, '_');

        if (!knownIds.has(layerId)) {
          const recoveredItem = {
            id: layerId,
            rawName: rawLayer.rawName || fileName,
            label:
              indexData.customNames[layerId] ||
              rawLayer.label ||
              fileName.replace(/\.json$/i, ''),
            category: rawLayer.category || 'Nhóm lớp thôn/buôn',
            defaultOn:
              typeof indexData.enabledStates[layerId] === 'boolean'
                ? indexData.enabledStates[layerId]
                : true,
            color: rawLayer.color || '#00e676',
            bounds: rawLayer.bounds || [
              [12.95, 107.8],
              [13.15, 108.0],
            ],
            geomCount: rawLayer.geomCount || 1,
            file: `/api/kml/layers?id=${encodeURIComponent(safeId)}`,
            sizeKb: rawLayer.sizeKb || 10,
          };
          indexData.layers.push(recoveredItem);
          knownIds.add(layerId);
          changed = true;
        }
      } catch {
        // ignore invalid json file
      }
    }
  } catch {
    // ignore readdir error
  }

  // Đảm bảo tất cả các lớp trong danh sách đều có đường dẫn tải dữ liệu chuẩn cho điện thoại & máy tính khác
  for (const l of indexData.layers) {
    if (l && l.id) {
      const safeId = String(l.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      const expectedFileUrl = `/api/kml/layers?id=${encodeURIComponent(safeId)}`;
      if (l.file !== expectedFileUrl) {
        l.file = expectedFileUrl;
        changed = true;
      }
      if (indexData.customNames[l.id] && l.label !== indexData.customNames[l.id]) {
        l.label = indexData.customNames[l.id];
        changed = true;
      }
    }
  }

  if (changed || !fs.existsSync(INDEX_FILE)) {
    saveIndex(indexData);
  }

  return indexData;
}

function saveIndex(data: StoredKmlIndex) {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  fs.writeFileSync(INDEX_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const layerId = searchParams.get('id');

    if (layerId) {
      const safeId = layerId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const dataPath = path.join(STORAGE_DIR, `${safeId}.json`);
      if (!fs.existsSync(dataPath)) {
        return NextResponse.json(
          { error: 'Layer not found' },
          { status: 404, headers: NO_CACHE_HEADERS }
        );
      }
      const content = fs.readFileSync(dataPath, 'utf8');
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...NO_CACHE_HEADERS,
        },
      });
    }

    const indexData = ensureStorage();
    return NextResponse.json(indexData, {
      status: 200,
      headers: NO_CACHE_HEADERS,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Read error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { item, layerData } = body;
    if (!item || !item.id || !layerData) {
      return NextResponse.json({ error: 'Invalid KML layer payload' }, { status: 400 });
    }

    const indexData = ensureStorage();
    const safeId = String(item.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const dataPath = path.join(STORAGE_DIR, `${safeId}.json`);

    const finalLabel = indexData.customNames[item.id] || item.label || layerData.label;
    const storedItem = {
      ...item,
      label: finalLabel,
      file: `/api/kml/layers?id=${encodeURIComponent(safeId)}`,
    };

    fs.writeFileSync(
      dataPath,
      JSON.stringify({ ...layerData, label: finalLabel, file: storedItem.file }),
      'utf8'
    );

    const existingIdx = indexData.layers.findIndex((l) => l.id === item.id);
    if (existingIdx >= 0) {
      indexData.layers[existingIdx] = storedItem;
    } else {
      indexData.layers.push(storedItem);
    }
    if (typeof indexData.enabledStates[item.id] !== 'boolean') {
      indexData.enabledStates[item.id] = true;
    }
    saveIndex(indexData);

    return NextResponse.json(
      { ok: true, item: storedItem },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Save error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, label, enabled } = body;
    if (!id) {
      return NextResponse.json({ error: 'Missing layer id' }, { status: 400 });
    }

    const indexData = ensureStorage();

    if (typeof label === 'string' && label.trim()) {
      const trimmed = label.trim();
      indexData.customNames[id] = trimmed;
      indexData.layers = indexData.layers.map((l) =>
        l.id === id ? { ...l, label: trimmed } : l
      );

      const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
      const dataPath = path.join(STORAGE_DIR, `${safeId}.json`);
      if (fs.existsSync(dataPath)) {
        try {
          const layerJson = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
          layerJson.label = trimmed;
          fs.writeFileSync(dataPath, JSON.stringify(layerJson), 'utf8');
        } catch {}
      }
    }

    if (typeof enabled === 'boolean') {
      indexData.enabledStates[id] = enabled;
      indexData.layers = indexData.layers.map((l) =>
        l.id === id ? { ...l, defaultOn: enabled } : l
      );
    }

    saveIndex(indexData);
    return NextResponse.json({ ok: true }, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Update error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const indexData = ensureStorage();
    indexData.layers = indexData.layers.filter((l) => l.id !== id);
    delete indexData.customNames[id];
    delete indexData.enabledStates[id];
    saveIndex(indexData);

    const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const dataPath = path.join(STORAGE_DIR, `${safeId}.json`);
    if (fs.existsSync(dataPath)) {
      fs.unlinkSync(dataPath);
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Delete error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
