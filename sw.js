// Service worker Ludoaventura.
// Stratégie « réseau d'abord » : en ligne, on sert toujours la dernière version publiée
// (mise à jour automatique, sans bouton) ; hors ligne, on sert la copie en cache.
const CACHE = 'ludoaventura-v2.0';
const PRECACHE = ['./', 'index.html', 'css/site.css', 'multiplication/', 'js/multiplication.js', 'js/version.js', 'js/pwa.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting(); // le nouveau service worker prend la main sans attendre
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./')))
  );
});
