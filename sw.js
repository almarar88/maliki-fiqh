/* Service worker — المقارن الفقهي المالكي. Full offline: app shell + all texts precached.
   Update policy (v3.2+): a new version installs, activates at once (skipWaiting + clients.claim),
   removes every older cache, and reloads any open page so nobody keeps seeing an old build. */
const VER = '3.2.2';
const V = 'mfq-v' + VER;
const q = u => u + (u.includes('?') ? '&' : '?') + 'v=' + VER;
const CORE = ['./', 'index.html', 'version.json', 'styles.css', 'app.js', 'data/fiqh.json', 'data/library.json', 'manifest.json',
  'assets/icon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/maskable-512.png', 'assets/icons/apple-touch-icon.png', 'assets/icons/favicon-32.png',
  'assets/fonts/Amiri-Regular.woff2', 'assets/fonts/Amiri-Bold.woff2', 'assets/fonts/FiqhSansArabic-Regular.woff2', 'assets/fonts/FiqhSansArabic-SemiBold.woff2', 'assets/fonts/FiqhSansArabic-Bold.woff2']
  .map(u => u === './' || u === 'index.html' ? u : q(u));
self.addEventListener('install', e => {
  // bypass the HTTP cache so a fresh install never stores stale files
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  let upgraded = false;
  const done = (async () => {
    const ks = await caches.keys();
    const old = ks.filter(k => k.startsWith('mfq-') && k !== V);
    upgraded = old.length > 0;
    await Promise.all(old.map(k => caches.delete(k)));
    await self.clients.claim();
  })();
  e.waitUntil(done);
  // after activation (NOT inside waitUntil: a navigation awaited there would deadlock), move open pages onto the new build
  done.then(() => { if (!upgraded) return; setTimeout(() => self.clients.matchAll({ type: 'window' }).then(cs => cs.forEach(c => {
    try { c.postMessage({ type: 'UPDATED', ver: VER }); if ('navigate' in c) c.navigate(c.url).catch(() => {}); } catch (_) {}
  })), 50); });
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); if (e.data === 'VERSION') e.source && e.source.postMessage({ ver: VER }); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== location.origin) return;
  if (req.mode === 'navigate') {   // pages: always from the network (no HTTP cache), cached shell only when offline
    e.respondWith(fetch(req, { cache: 'no-store' }).then(r => { const c = r.clone(); caches.open(V).then(x => x.put('./', c)); return r; })
      .catch(() => caches.match('./').then(m => m || caches.match('index.html'))));
    return;
  }
  if (u.pathname.endsWith('/version.json') || u.pathname.endsWith('/sw.js')) {   // update checks: network only
    e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(q('version.json'))));
    return;
  }
  // everything else: cache-first (all URLs carry ?v=), then network and store
  e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); } return r; })
    .catch(() => u.pathname.endsWith('.json') ? caches.match(q(u.pathname.replace(/^.*\/data\//, 'data/'))) : undefined)));
});
