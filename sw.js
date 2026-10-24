const CACHE = 'catatan-keuangan-v9';
const CACHE_PREFIX = 'catatan-keuangan-';
const APP_PAGES = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Simpan halaman utama yang tersedia tanpa menggagalkan pemasangan.
    await Promise.all(APP_PAGES.map(async path => {
      try {
        const request = new Request(new URL(path, self.registration.scope), { cache: 'reload' });
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') await cache.put(request, response);
      } catch (_) {
        // Offline saat memasang: halaman akan dicache pada kunjungan berikutnya.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const aktif = pages.find(client => new URL(client.url).origin === self.location.origin);
    if (aktif) {
      await aktif.focus();
      return;
    }
    await self.clients.openWindow('./');
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
      }
      return response;
    } catch (_) {
      const exact = await cache.match(request);
      if (exact) return exact;
      if (request.mode === 'navigate') {
        for (const path of APP_PAGES) {
          const page = await cache.match(new URL(path, self.registration.scope));
          if (page) return page;
        }
      }
      return Response.error();
    }
  })());
});
