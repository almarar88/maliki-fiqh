const V='mfq-v2';
const CORE=['./','index.html','styles.css?v=2.0','app.js?v=2.0','data/fiqh.json?v=2.0','manifest.json','assets/icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url); if(e.request.method!=='GET')return;
  const isFont=/fonts\.(googleapis|gstatic)\.com/.test(u.host);
  if(u.origin!==location.origin && !isFont) return;
  // network-first for data & html (to get updates), cache-first for the rest
  const nf = u.pathname.endsWith('.json')||u.pathname.endsWith('/')||u.pathname.endsWith('.html');
  e.respondWith(nf
    ? fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request))
    : caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r})));
});
