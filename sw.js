/* Service worker — المقارن الفقهي المالكي. Full offline: app shell + all texts precached. */
const VER = '3.0';
const V = 'mfq-v' + VER;
const CORE = ['./', 'index.html', 'styles.css?v=' + VER, 'app.js?v=' + VER, 'data/fiqh.json?v=' + VER, 'data/library.json?v=' + VER, 'manifest.json',
  'assets/icon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/maskable-512.png', 'assets/icons/apple-touch-icon.png', 'assets/icons/favicon-32.png'];
self.addEventListener('install', e => {
  // upgrading from v1/v2 (whose pages have no update prompt): activate right away; from v3+ wait for the user's «حدِّث الآن»
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => caches.keys()).then(ks => { if (ks.some(k => /^mfq-v[12]/.test(k))) return self.skipWaiting(); }));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('mfq-') && k !== V && k !== 'mfq-fonts').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); if (e.data === 'VERSION') e.source && e.source.postMessage({ ver: VER }); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (/fonts\.(googleapis|gstatic)\.com/.test(u.host)) {   // fonts: cache-first, long lived
    e.respondWith(caches.open('mfq-fonts').then(c => c.match(req).then(m => m || fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }))));
    return;
  }
  if (u.origin !== location.origin) return;
  if (req.mode === 'navigate') {   // pages: network-first, fall back to cached shell (offline)
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(V).then(x => x.put('./', c)); return r; })
      .catch(() => caches.match('./').then(m => m || caches.match('index.html'))));
    return;
  }
  // everything else: cache-first (versioned URLs), then network and store
  e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); } return r; })
    .catch(() => u.pathname.endsWith('.json') ? caches.match(u.pathname.replace(/^.*\/data\//, 'data/') + '?v=' + VER) : undefined)));
});
