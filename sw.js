/* PROOF service worker — cache-first shell for instant offline open */
/* Bump on every shell change. Fetch is cache-first with no revalidation, so an unchanged
   CACHE name means installed devices keep running the old bundle forever. */
const CACHE = 'proof-v5';
const SHELL = [
  './', 'index.html', 'css/style.css',
  'js/taxonomy.js', 'js/engine.js', 'js/ui.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit ||
      fetch(e.request).then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const cp = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, cp));
        }
        return res;
      /* Only fall back to the shell for navigations — handing index.html to a failed
         script/style request yields a syntax error instead of a clean offline failure. */
      }).catch(() => (e.request.mode === 'navigate' ? caches.match('index.html') : Promise.reject(new Error('offline'))))
    )
  );
});
