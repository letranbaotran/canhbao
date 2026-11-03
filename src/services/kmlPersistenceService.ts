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
  const safeId = String(item.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const itemWithUrl: KmzLayerManifestItem = {
    ...item,
    file: item.file || `/api/kml/layers?id=${encodeURIComponent(safeId)}`,
  };

  // 1. Lưu bền vững vào IndexedDB trình duyệt
  await saveKmlToIndexedDB(itemWithUrl, layerData);

  // 2. Lưu trạng thái bật mặc định vào localStorage
  try {
    const rawEnabled = localStorage.getItem('easup_kml_enabled_states');
    const enabledMap = rawEnabled ? JSON.parse(rawEnabled) : {};
    enabledMap[itemWithUrl.id] = true;
    localStorage.setItem('easup_kml_enabled_states', JSON.stringify(enabledMap));
  } catch {}

  // 3. Đồng bộ lưu xuống ổ cứng máy chủ VPS (/var/www/canhbao/public/storage/kml) để điện thoại & thiết bị khác nhìn thấy ngay
  if (!isStaticGithubPages()) {
    try {
      const res = await fetch('/api/kml/layers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: itemWithUrl, layerData }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.item) {
          await saveKmlToIndexedDB(data.item, { ...layerData, file: data.item.file });
          return data.item;
        }
      }
    } catch {
      // Nếu chạy ở chế độ tĩnh không có backend thì bản lưu IndexedDB vẫn đảm bảo bền vững
    }
  }

  return itemWithUrl;
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
  let localCustomNames: Record<string, string> = {};
  let localEnabledStates: Record<string, boolean> = {};
  const cachedDataMap: Record<string, any> = {};
  const itemMap = new Map<string, KmzLayerManifestItem>();

  try {
    const rawNames = localStorage.getItem('easup_kml_custom_names');
    if (rawNames) localCustomNames = JSON.parse(rawNames);
  } catch {}

  try {
    const rawEnabled = localStorage.getItem('easup_kml_enabled_states');
    if (rawEnabled) localEnabledStates = JSON.parse(rawEnabled);
  } catch {}

  // 1. Đọc từ IndexedDB trên trình duyệt hiện tại
  const idbRecords = await getAllKmlFromIndexedDB();
  for (const rec of idbRecords) {
    if (rec?.item?.id) {
      const safeId = String(rec.item.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      const normalizedItem: KmzLayerManifestItem = {
        ...rec.item,
        label: localCustomNames[rec.item.id] || rec.item.label,
        file: rec.item.file || `/api/kml/layers?id=${encodeURIComponent(safeId)}`,
      };
      itemMap.set(rec.item.id, normalizedItem);
      if (rec.layerData) {
        cachedDataMap[rec.item.id] = {
          ...rec.layerData,
          label: normalizedItem.label,
        };
      }
    }
  }

  let customNames = { ...localCustomNames };
  let enabledStates = { ...localEnabledStates };

  // 2. Đọc & Đồng bộ 2 chiều với Server API (/api/kml/layers) để mọi thiết bị (máy tính & điện thoại) luôn có đủ các lớp bản đồ
  if (!isStaticGithubPages()) {
    try {
      const res = await fetch(`/api/kml/layers?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const serverIndex = await res.json();
        const serverCustomNames: Record<string, string> = serverIndex?.customNames || {};
        const serverEnabledStates: Record<string, boolean> = serverIndex?.enabledStates || {};
        const serverLayers: KmzLayerManifestItem[] = Array.isArray(serverIndex?.layers)
          ? serverIndex.layers
          : [];

        // Gộp tên lớp và trạng thái bật/tắt giữa Server và máy hiện tại
        customNames = { ...serverCustomNames, ...localCustomNames };
        enabledStates = { ...serverEnabledStates, ...localEnabledStates };

        const serverLayerIdSet = new Set<string>();
        for (const srvItem of serverLayers) {
          if (srvItem?.id) {
            const safeId = String(srvItem.id).replace(/[^a-zA-Z0-9_-]/g, '_');
            serverLayerIdSet.add(srvItem.id);
            itemMap.set(srvItem.id, {
              ...srvItem,
              label: customNames[srvItem.id] || srvItem.label,
              file: srvItem.file || `/api/kml/layers?id=${encodeURIComponent(safeId)}`,
            });
          }
        }

        // TỰ ĐỘNG ĐỒNG BỘ LÊN SERVER: Nếu trình duyệt máy tính có các lớp trong IndexedDB mà trên Server chưa có, tự động đẩy lên Server ngay!
        for (const rec of idbRecords) {
          if (rec?.item?.id && rec.layerData && !serverLayerIdSet.has(rec.item.id)) {
            const itemToSync: KmzLayerManifestItem = {
              ...rec.item,
              label: customNames[rec.item.id] || rec.item.label,
            };
            fetch('/api/kml/layers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                item: itemToSync,
                layerData: { ...rec.layerData, label: itemToSync.label },
              }),
            }).catch(() => {});
          }
        }

        // Đồng bộ các tên lớp đã đổi trên máy tính lên Server nếu Server chưa có
        for (const [layerId, customLabel] of Object.entries(localCustomNames)) {
          if (customLabel && serverCustomNames[layerId] !== customLabel) {
            fetch('/api/kml/layers', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: layerId, label: customLabel }),
            }).catch(() => {});
          }
        }
      }
    } catch {
      // ignore network error
    }
  }

  return {
    customItems: Array.from(itemMap.values()),
    cachedDataMap,
    customNames,
    enabledStates,
  };
}
