/* CCNA Quest service worker — offline support (network-first per l'HTML) */
const CACHE = 'ccna-quest-v2';
const ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isDoc = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isDoc) {
    // network-first: online sempre aggiornato, offline dalla cache
    e.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', clone));
        return res;
      }).catch(() => caches.match('./index.html') || caches.match('./'))
    );
  } else {
    // cache-first per gli altri asset (font, icona, ecc.)
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        try {
          const u = new URL(req.url);
          if (u.origin === location.origin) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
        } catch (_) {}
        return res;
      }))
    );
  }
});
