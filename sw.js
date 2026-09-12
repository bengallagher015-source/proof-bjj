/* PROOF service worker.

   Network-first for the app shell, cache-first for artwork.

   It used to be cache-first for everything with no revalidation, which has one
   very bad failure mode: if the cache ever ends up holding a broken or
   half-updated shell, the device serves that forever and the app opens blank,
   with no way back short of clearing website data. Network-first means a device
   that can reach the internet always self-heals, and the cache is there purely
   so the gym with no signal still works. */
const CACHE = 'proof-v11';
const SHELL = [
  './', 'index.html', 'css/style.css',
  'js/taxonomy.js', 'js/engine.js', 'js/ui.js', 'js/cloud.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const put = (req, res) => {
  if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
  return res;
};

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  let url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;   /* fonts etc. — leave to the browser */

  const shell = e.request.mode === 'navigate' ||
                /\.(?:html|css|js|webmanifest)$/.test(url.pathname) ||
                url.pathname.endsWith('/');

  if (shell) {
    /* fresh when we can, cached when we can't */
    e.respondWith(
      fetch(e.request)
        .then(res => put(e.request, res))
        .catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit =>
          hit || (e.request.mode === 'navigate'
            ? caches.match('index.html')
            /* never hand index.html to a failed script request — that turns a clean
               offline failure into a syntax error */
            : Promise.reject(new Error('offline')))))
    );
    return;
  }

  /* icons, splashes: content-addressed in practice, so cache-first is right */
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true })
      .then(hit => hit || fetch(e.request).then(res => put(e.request, res)))
  );
});
