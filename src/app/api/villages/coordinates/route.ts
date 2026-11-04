import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STORAGE_DIR = path.join(process.cwd(), 'public', 'storage');
const COORDS_FILE = path.join(STORAGE_DIR, 'village_coordinates.json');

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

function ensureStorage(): Record<string, [number, number]> {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (fs.existsSync(COORDS_FILE)) {
    try {
      const raw = fs.readFileSync(COORDS_FILE, 'utf8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

export async function GET() {
  try {
    const data = ensureStorage();
    return NextResponse.json({ ok: true, coordinates: data }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Read error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { villageName, lat, lng, coordinates } = body;

    const current = ensureStorage();

    if (coordinates && typeof coordinates === 'object') {
      Object.assign(current, coordinates);
    } else if (villageName && typeof lat === 'number' && typeof lng === 'number') {
      current[villageName] = [lat, lng];
    } else {
      return NextResponse.json(
        { ok: false, error: 'Thiếu thông tin tọa độ thôn/buôn' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    fs.writeFileSync(COORDS_FILE, JSON.stringify(current, null, 2), 'utf8');

    return NextResponse.json(
      { ok: true, coordinates: current },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Save error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
