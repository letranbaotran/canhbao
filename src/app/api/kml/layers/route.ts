import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
  if (!fs.existsSync(INDEX_FILE)) {
    const initial: StoredKmlIndex = { layers: [], customNames: {}, enabledStates: {} };
    fs.writeFileSync(INDEX_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      layers: Array.isArray(parsed.layers) ? parsed.layers : [],
      customNames: parsed.customNames || {},
      enabledStates: parsed.enabledStates || {},
    };
  } catch {
    return { layers: [], customNames: {}, enabledStates: {} };
  }
}

function saveIndex(data: StoredKmlIndex) {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  fs.writeFileSync(INDEX_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const layerId = searchParams.get('id');

    if (layerId) {
      const safeId = layerId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const dataPath = path.join(STORAGE_DIR, `${safeId}.json`);
      if (!fs.existsSync(dataPath)) {
        return NextResponse.json({ error: 'Layer not found' }, { status: 404 });
      }
      const content = fs.readFileSync(dataPath, 'utf8');
      return new NextResponse(content, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const indexData = ensureStorage();
    return NextResponse.json(indexData, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Read error' }, { status: 500 });
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

    const storedItem = {
      ...item,
      file: `/api/kml/layers?id=${encodeURIComponent(safeId)}`,
    };

    fs.writeFileSync(
      dataPath,
      JSON.stringify({ ...layerData, file: storedItem.file }),
      'utf8'
    );

    const existingIdx = indexData.layers.findIndex((l) => l.id === item.id);
    if (existingIdx >= 0) {
      indexData.layers[existingIdx] = storedItem;
    } else {
      indexData.layers.push(storedItem);
    }
    indexData.enabledStates[item.id] = true;
    saveIndex(indexData);

    return NextResponse.json({ ok: true, item: storedItem }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Save error' }, { status: 500 });
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
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Update error' }, { status: 500 });
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

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Delete error' }, { status: 500 });
  }
}

