// Service worker de Radio Lugano 1y2
// Alcance: cachear assets estáticos propios para que carguen más rápido
// en visitas repetidas. NO implementa funcionalidad offline completa
// (decisión de proyecto: no tiene sentido para una radio online).
const CACHE_NAME = 'radio-lugano-v5';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/ruta.json',
  '/ads.json',
  '/manifest.json',
  '/images/logo-emblem.webp',
  '/images/monoblocks-skyline.webp',
  '/images/icon-192.png',
  '/images/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // ruta.json y ads.json cambian seguido (mantenimiento mensual, nuevos
  // anuncios) — acá priorizamos la red para que las ediciones se vean
  // al instante, y el cache queda solo como respaldo si no hay conexión.
  const isFrequentlyUpdated = url.pathname === '/ruta.json' || url.pathname === '/ads.json';
  if (isFrequentlyUpdated) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Todo lo demás (HTML, imágenes, íconos): cache-first, como antes.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return undefined;
        });
    })
  );
});
