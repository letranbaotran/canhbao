import type { KmzLayerManifestItem } from '@/components/WebGISMap';

const DB_NAME = 'easup_kml_storage_db';
const DB_VERSION = 1;
const STORE_NAME = 'custom_kml_layers';

export interface StoredKmlRecord {
  id: string;
  item: KmzLayerManifestItem;
  layerData: any;
  updatedAt: number;
}

function openKmlIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveKmlToIndexedDB(
  item: KmzLayerManifestItem,
  layerData: any
): Promise<void> {
  const db = await openKmlIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredKmlRecord = {
        id: item.id,
        item,
        layerData,
        updatedAt: Date.now(),
      };
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getAllKmlFromIndexedDB(): Promise<StoredKmlRecord[]> {
  const db = await openKmlIndexedDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function updateKmlMetaInIndexedDB(
  id: string,
  updates: { label?: string; defaultOn?: boolean }
): Promise<void> {
  const db = await openKmlIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing: StoredKmlRecord | undefined = getReq.result;
        if (existing) {
          if (typeof updates.label === 'string') {
            existing.item.label = updates.label;
            if (existing.layerData) existing.layerData.label = updates.label;
          }
          if (typeof updates.defaultOn === 'boolean') {
            existing.item.defaultOn = updates.defaultOn;
          }
          existing.updatedAt = Date.now();
          store.put(existing);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function deleteKmlFromIndexedDB(id: string): Promise<void> {
  const db = await openKmlIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function isStaticGithubPages(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.endsWith('github.io') ||
    window.location.pathname.startsWith('/canhbao')
  );
}

export async function persistNewKmlLayer(
  item: KmzLayerManifestItem,
  layerData: any
): Promise<KmzLayerManifestItem> {
  // 1. Lưu bền vững vào IndexedDB trình duyệt (không giới hạn dung lượng, hoạt động cả trên GitHub Pages & VPS)
  await saveKmlToIndexedDB(item, layerData);

  // 2. Lưu trạng thái bật mặc định vào localStorage
  try {
    const rawEnabled = localStorage.getItem('easup_kml_enabled_states');
    const enabledMap = rawEnabled ? JSON.parse(rawEnabled) : {};
    enabledMap[item.id] = true;
    localStorage.setItem('easup_kml_enabled_states', JSON.stringify(enabledMap));
  } catch {}

  // 3. Đồng bộ lưu xuống ổ cứng máy chủ VPS (/var/www/canhbao/public/storage/kml) nếu có API backend
  if (!isStaticGithubPages()) {
    try {
      const res = await fetch('/api/kml/layers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, layerData }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.item) {
          await saveKmlToIndexedDB(data.item, { ...layerData, file: data.item.file });
          return data.item;
        }
      }
    } catch {
      // Nếu chạy ở chế độ tĩnh không có backend thì bản lưu IndexedDB vẫn đảm bảo bền vững 100%
    }
  }

  return item;
}

export async function persistKmlLayerUpdate(
  id: string,
  updates: { label?: string; enabled?: boolean }
): Promise<void> {
  if (typeof updates.label === 'string') {
    try {
      const rawSaved = localStorage.getItem('easup_kml_custom_names');
      const savedNames = rawSaved ? JSON.parse(rawSaved) : {};
      savedNames[id] = updates.label;
      localStorage.setItem('easup_kml_custom_names', JSON.stringify(savedNames));
    } catch {}
  }

  if (typeof updates.enabled === 'boolean') {
    try {
      const rawEnabled = localStorage.getItem('easup_kml_enabled_states');
      const enabledMap = rawEnabled ? JSON.parse(rawEnabled) : {};
      enabledMap[id] = updates.enabled;
      localStorage.setItem('easup_kml_enabled_states', JSON.stringify(enabledMap));
    } catch {}
  }

  await updateKmlMetaInIndexedDB(id, {
    label: updates.label,
    defaultOn: updates.enabled,
  });

  if (!isStaticGithubPages()) {
    try {
      await fetch('/api/kml/layers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
    } catch {}
  }
}

export async function removePersistedKmlLayer(id: string): Promise<void> {
  await deleteKmlFromIndexedDB(id);
  try {
    const rawSaved = localStorage.getItem('easup_kml_custom_names');
    if (rawSaved) {
      const savedNames = JSON.parse(rawSaved);
      delete savedNames[id];
      localStorage.setItem('easup_kml_custom_names', JSON.stringify(savedNames));
    }
    const rawEnabled = localStorage.getItem('easup_kml_enabled_states');
    if (rawEnabled) {
      const enabledMap = JSON.parse(rawEnabled);
      delete enabledMap[id];
      localStorage.setItem('easup_kml_enabled_states', JSON.stringify(enabledMap));
    }
  } catch {}

  if (!isStaticGithubPages()) {
    try {
      await fetch(`/api/kml/layers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch {}
  }
}

export async function loadAllPersistedKmlState(): Promise<{
  customItems: KmzLayerManifestItem[];
  cachedDataMap: Record<string, any>;
  customNames: Record<string, string>;
  enabledStates: Record<string, boolean>;
}> {
  let customNames: Record<string, string> = {};
  let enabledStates: Record<string, boolean> = {};
  const cachedDataMap: Record<string, any> = {};
  const itemMap = new Map<string, KmzLayerManifestItem>();

  try {
    const rawNames = localStorage.getItem('easup_kml_custom_names');
    if (rawNames) customNames = JSON.parse(rawNames);
  } catch {}

  try {
    const rawEnabled = localStorage.getItem('easup_kml_enabled_states');
    if (rawEnabled) enabledStates = JSON.parse(rawEnabled);
  } catch {}

  // 1. Đọc từ IndexedDB trước (tức thì, hỗ trợ cả Offline & GitHub Pages)
  const idbRecords = await getAllKmlFromIndexedDB();
  for (const rec of idbRecords) {
    if (rec?.item?.id) {
      itemMap.set(rec.item.id, rec.item);
      if (rec.layerData) {
        cachedDataMap[rec.item.id] = rec.layerData;
      }
    }
  }

  // 2. Đọc từ Server API (/api/kml/layers) nếu đang chạy trên VPS canhbao.easupso.com hoặc localhost
  if (!isStaticGithubPages()) {
    try {
      const res = await fetch('/api/kml/layers', { cache: 'no-store' });
      if (res.ok) {
        const serverIndex = await res.json();
        if (serverIndex?.customNames) {
          customNames = { ...serverIndex.customNames, ...customNames };
        }
        if (serverIndex?.enabledStates) {
          enabledStates = { ...serverIndex.enabledStates, ...enabledStates };
        }
        if (Array.isArray(serverIndex?.layers)) {
          for (const srvItem of serverIndex.layers) {
            if (srvItem?.id) {
              itemMap.set(srvItem.id, srvItem);
            }
          }
        }
      }
    } catch {}
  }

  return {
    customItems: Array.from(itemMap.values()),
    cachedDataMap,
    customNames,
    enabledStates,
  };
}

