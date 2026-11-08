// Service Worker hỗ trợ Network-First khi Online & Offline-first cho Lực lượng Tuần tra Rừng Tiểu khu 293 khi mất sóng 4G
const CACHE_NAME = 'canhbao-easup-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/globals.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Không can thiệp vào các luồng phát thanh trực tuyến (HLS .m3u8, .aac, .ts, .mp3), request khác tên miền hoặc API động
  try {
    const reqUrl = new URL(event.request.url);
    if (
      reqUrl.origin !== self.location.origin ||
      reqUrl.pathname.startsWith('/api/') ||
      reqUrl.pathname.endsWith('.m3u8') ||
      reqUrl.pathname.endsWith('.aac') ||
      reqUrl.pathname.endsWith('.ts') ||
      reqUrl.pathname.endsWith('.mp3')
    ) {
      return;
    }
  } catch {
    return;
  }

  // Với yêu cầu chuyển trang HTML (navigation): Network-First để luôn cập nhật giao diện mới nhất
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // Với các tài nguyên tĩnh nội bộ: Thử mạng trước, nếu mất mạng chuyển sang dùng cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached || Response.error();
      })
  );
});
