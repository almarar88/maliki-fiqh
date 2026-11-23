/* المقارِن الفقهي المالكي v2 — كل النصوص من data/fiqh.json (منقولة آليًا من مصادرها) */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LS = {
  get(k, d) { try { const v = localStorage.getItem('mfq.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mfq.' + k, JSON.stringify(v)); } catch {} }
};
const AI_URL = 'https://maliki-fiqh-ai.amlab-q7.workers.dev';
const ST_LABEL = { verified: 'موثّق من المصدر', partial: 'موثّق ومقابَل جزئيًا', absent: 'ليس في المتن', unverified: 'لم يُتحقق من النص بعد' };
const ST_SHORT = { verified: '✓', partial: '◐', absent: '—', unverified: '✗' };
const I = {
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M7 8l5-5 5 5"/></svg>',
  print: '<svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6h-2M7 14h10v7H7z"/></svg>',
  cols: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="16" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>',
  rows: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  cmp: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/></svg>',
};
let DB, T = {}, ORDER = [], CH = {};
const S = Object.assign({ view: 'home', ch: 'miyah', on: null, layout: innerWidth < 700 ? 'stack' : 'side', font: 'amiri', size: 19,
  theme: matchMedia('(prefers-color-scheme: light)').matches ? 'parchment' : 'ink', motion: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'full',
  showSrc: false, goal: 20, cmp: false, mem: 'off' }, LS.get('settings', {}));
if (!['ink', 'parchment', 'sepia'].includes(S.theme)) S.theme = S.theme === 'dark' ? 'ink' : 'parchment';
let bm = new Set(LS.get('bm', [])), done = new Set(LS.get('done', []));
let HL = '', FOCUS = '';
const G = Object.assign({ xp: 0, streak: 0, best: 0, ok: 0, all: 0, day: '', today: 0, days: 0, lastDay: '', ach: [], goalHit: '' }, LS.get('game', {}));
const save = () => {
  LS.set('settings', { ch: S.ch, on: S.on, layout: S.layout, font: S.font, size: S.size, theme: S.theme, motion: S.motion, showSrc: S.showSrc, goal: S.goal, cmp: S.cmp, mem: S.mem });
  LS.set('bm', [...bm]); LS.set('done', [...done]); LS.set('game', G);
};

/* ---------- Arabic helpers ---------- */
const HAR = '[\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640]*';
const norm = s => (s || '').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
  .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[^\u0621-\u064A0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const CLS = { 'ا': '[اإأآٱ]', 'ي': '[يىئ]', 'ه': '[هة]', 'و': '[وؤ]' };
function makeRx(q) {
  const n = norm(q); if (!n) return null;
  const tok = w => { let body = w, pre = '';
    if (w.length > 3 && w.startsWith('ال')) { body = w.slice(2); pre = '(?:' + CLS['ا'] + HAR + 'ل' + HAR + ')?'; }
    let out = pre; for (const c of body) out += (CLS[c] || c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) + HAR; return out; };
  const p = n.split(' ').map(tok).join('[\\s\\u060C.،:؛]+' + HAR);
  try { return new RegExp(p, 'g'); } catch { return null; }
}
const STOP = new Set('في من على الى عن او ثم ان اذا ما لا هل لم لن قد كل بعض هو هي ذلك ذا هذا هذه التي الذي الذين مع بعد قبل كان كانت عند غير الا كذا كذاك وهو وهي فيه فيها منه منها عليه عليها به بها له لها ولا وان فان واما اما ايضا حتى بين يكون تكون ليس لنا عنه علي ومن ولو احد لهما فلا وما ولم انه انها فقد'.split(' '));
function stem(w) {
  w = norm(w); if (!w) return '';
  w = w.replace(/^(و|ف)(?=.{3})/, '').replace(/^(ب|ك|ل)(?=ال)/, '').replace(/^لل(?=.{2})/, '').replace(/^ال(?=.{2})/, '');
  if (w.length > 4) w = w.replace(/(ات|ان|ين|ون|ها|هم|هما|يه)$/, '');
  if (w.length > 3) w = w.replace(/(ه|ي)$/, '');
  return w;
}
const esc = s => (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let CMP = null;
let MEMSEQ = 0;
function wordsHTML(text) {
  const parts = text.split(/(\s+)/);
  let wi = 0;
  return parts.map(p => {
    if (!p.trim()) return p;
    const e = esc(p); wi++;
    if (S.mem === 'words' && wi % 2 === 0) return `<span class="mw" data-m="${MEMSEQ++}">${e}</span>`;
    if (S.cmp && CMP) { const st = stem(p); const set = st && st.length > 2 && !STOP.has(st) ? CMP.shared.get(st) : null;
      if (set && set.size >= 2) return `<span class="sw k${set.size}${FOCUS === st ? ' focus' : ''}" data-w="${esc(st)}" title="مشترك بين ${set.size} متون">${e}</span>`; }
    return e;
  }).join('');
}
function fmt(text) {
  if ((S.cmp && CMP) || S.mem === 'words') return wordsHTML(text);
  let html;
  const rx = HL && makeRx(HL);
  if (rx) { let out = '', last = 0; text.replace(rx, (m, i) => { out += esc(text.slice(last, i)) + '<mark>' + esc(m) + '</mark>'; last = i + m.length; return m; }); html = out + esc(text.slice(last)); }
  else html = esc(text);
  return html.replace(/\(\(([^()<>]{1,60})\)\)|\(([^()<>]{1,45})\)/g, (m) => `<span class="kw">${m}</span>`);
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2100); }
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('نُسخ النص ✓'); }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('نُسخ النص ✓'); }
}
async function share(title, text) {
  if (navigator.share) { try { await navigator.share({ title, text, url: location.href }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  copy(text + '\n' + location.href);
}
const ar = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const todayStr = () => new Date().toLocaleDateString('en-CA');

/* ---------- data ---------- */
const chap = id => CH[id] || DB.chapters[0];
const items = p => p.sections.flatMap(s => s.items);
const hasText = p => p && (p.status === 'verified' || p.status === 'partial');
function plain(it) { return it.kind === 'v' ? (it.n ? it.n + ' - ' : '') + it.a + (it.b ? '   ***   ' + it.b : '') : it.t; }
function passageText(c, tid, withSrc) {
  const p = c.passages[tid], t = T[tid];
  let s = `【${t.sym}】 ${t.name} — ${t.book}\n`;
  if (!hasText(p)) return s + `(${p.note || ST_LABEL[p.status]})\n`;
  for (const sec of p.sections) { if (sec.title) s += `• ${sec.title}\n`; for (const it of sec.items) s += (it.kind === 'h' ? `— ${it.t} —` : plain(it)) + '\n'; }
  if (withSrc) s += 'المصدر: ' + p.sources.slice(0, 4).join(' ، ') + (p.sources.length > 4 ? ' …' : '') + '\n';
  return s;
}
const chapterText = (c, tids, withSrc) => `﴿ ${c.title} ﴾\n${c.sub}\n\n` + tids.map(t => passageText(c, t, withSrc)).join('\n') + '\n';
function chProgress(c) { const av = ORDER.filter(t => hasText(c.passages[t])); const d = av.filter(t => done.has(c.id + ':' + t)).length; return { av: av.length, d, pct: av.length ? Math.round(100 * d / av.length) : 0 }; }
function progressPct() { let total = 0, d = 0; for (const c of DB.chapters) { const p = chProgress(c); total += p.av; d += p.d; } return { total, d, pct: total ? Math.round(100 * d / total) : 0 }; }
const ring = (pct, c = 'var(--gold)', label = '', s = 52) => `<span class="ring" style="--p:0;--c:${c};--s:${s}px" data-p="${pct}"><svg viewBox="0 0 36 36"><circle class="bgc" cx="18" cy="18" r="15.9" pathLength="100"/><circle class="fg" cx="18" cy="18" r="15.9" pathLength="100"/></svg>${label !== null ? `<b>${label}</b>` : ''}</span>`;
function animateRings(root = document) { requestAnimationFrame(() => requestAnimationFrame(() => $$('.ring[data-p]', root).forEach(r => r.style.setProperty('--p', r.dataset.p)))); }
const badge = (tid, cls = '') => `<span class="badge ${cls}" style="--c:var(--c-${tid})">${T[tid].sym}</span>`;

/* ---------- look, ambient, motion ---------- */
function applyLook() {
  const de = document.documentElement;
  de.dataset.theme = S.theme; de.dataset.font = S.font; de.dataset.motion = S.motion;
  de.style.setProperty('--fs', S.size + 'px');
  document.body.classList.toggle('show-src', !!S.showSrc);
  $('meta[name=theme-color]').content = S.theme === 'ink' ? '#0b1416' : '#efe4c8';
  requestAnimationFrame(() => de.style.setProperty('--hh', $('.top').offsetHeight + 'px'));
  Ambient.reset();
}
const Ambient = (() => {
  const cv = $('#ambient'), cx = cv.getContext('2d'); let P = [], raf = 0, last = 0, W = 0, H = 0, dpr = 1;
  function size() { dpr = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function reset() {
    cancelAnimationFrame(raf); size();
    if (S.motion === 'off') { cx.clearRect(0, 0, W, H); return; }
    const n = Math.round(Math.min(64, W * H / 22000) * (S.motion === 'soft' ? .45 : 1));
    P = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.8 + .4, v: Math.random() * .25 + .06, t: Math.random() * 6.28, s: Math.random() * .02 + .005, d: (Math.random() - .5) * .2 }));
    raf = requestAnimationFrame(loop);
  }
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (ts - last < 33 || document.hidden) return; last = ts;
    cx.clearRect(0, 0, W, H);
    const gold = S.theme === 'ink' ? '243,220,149' : '160,120,40';
    for (const p of P) {
      p.y -= p.v; p.x += p.d; p.t += p.s;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      const a = (Math.sin(p.t) * .5 + .5) * (S.theme === 'ink' ? .7 : .45);
      cx.beginPath(); cx.fillStyle = `rgba(${gold},${a})`; cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
      if (p.r > 1.7) { cx.fillStyle = `rgba(${gold},${a * .15})`; cx.beginPath(); cx.arc(p.x, p.y, p.r * 4, 0, 6.283); cx.fill(); }
    }
  }
  addEventListener('resize', () => { clearTimeout(size._t); size._t = setTimeout(reset, 200); });
  return { reset };
})();
let scrollRaf = 0;
addEventListener('scroll', () => { if (scrollRaf) return; scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; $('.pattern').style.setProperty('--sy', scrollY); }); }, { passive: true });
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' }) : null;
function observe(root = document) { $$('.reveal', root).forEach((el, i) => { if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', Math.min(i, 12)); io ? io.observe(el) : el.classList.add('in'); }); }
const Confetti = (() => {
  const cv = $('#confetti'), cx = cv.getContext('2d'); let parts = [], raf = 0;
  function burst(n = 120) {
    if (S.motion === 'off') return;
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ['#f3dc95', '#d8b25a', '#3fb68b', '#e0a43a', '#e05a74', '#5b8fe6', '#a57de8'];
    for (let i = 0; i < n; i++) parts.push({ x: innerWidth / 2, y: innerHeight * .35, vx: (Math.random() - .5) * 14, vy: Math.random() * -12 - 3, g: .32, r: Math.random() * 6 + 3, c: pick(cols), a: Math.random() * 6.28, va: (Math.random() - .5) * .3, life: 120 + Math.random() * 60, star: Math.random() < .35 });
    if (!raf) raf = requestAnimationFrame(step);
  }
  function step() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => p.life-- > 0);
    for (const p of parts) {
      p.vy += p.g; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.globalAlpha = Math.min(1, p.life / 40); cx.fillStyle = p.c;
      if (p.star) { cx.beginPath(); for (let k = 0; k < 8; k++) { const R = k % 2 ? p.r * .45 : p.r; cx.lineTo(Math.cos(k * Math.PI / 4) * R, Math.sin(k * Math.PI / 4) * R); } cx.fill(); }
      else cx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      cx.restore();
    }
    raf = parts.length ? requestAnimationFrame(step) : 0;
  }
  return { burst };
})();
function xpFloat(el, txt) {
  if (S.motion === 'off' || !el) return;
  const r = el.getBoundingClientRect(); const f = document.createElement('div'); f.className = 'xpfloat'; f.textContent = txt;
  f.style.left = (r.left + r.width / 2 - 20) + 'px'; f.style.top = (r.top - 10) + 'px'; document.body.appendChild(f); setTimeout(() => f.remove(), 1300);
}

/* ---------- gamification ---------- */
const LEVELS = [[0, 'مبتدئ'], [60, 'مستفتح'], [160, 'طالب علم'], [320, 'مُجِدّ'], [550, 'مثابر'], [850, 'متمكّن'], [1250, 'مُتقِن'], [1750, 'ضابط'], [2400, 'حافظ'], [3200, 'فقيه المتون']];
function level(xp = G.xp) { let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++; const cur = LEVELS[i][0], nxt = LEVELS[i + 1] ? LEVELS[i + 1][0] : cur + 1000; return { i, name: LEVELS[i][1], cur, nxt, pct: Math.round(100 * (xp - cur) / (nxt - cur)) }; }
const ACH = [
  ['first', 'أول إجابة صحيحة', '🌱'], ['streak5', '٥ إجابات متتالية', '🔥'], ['streak15', '١٥ متتالية', '⚡'], ['goal', 'أتممت الهدف اليومي', '🎯'],
  ['days3', '٣ أيام متتابعة', '📿'], ['ch1', 'أنهيت أول باب', '📖'], ['book', 'أنهيت كتابًا كاملًا', '🏛️'], ['lvl5', 'بلغت مرتبة «مثابر»', '⭐'], ['memo', 'جرّبت وضع الحفظ', '🧠'], ['ai', 'سألت المساعد', '✦']];
function award(id) { if (G.ach.includes(id)) return; G.ach.push(id); const a = ACH.find(x => x[0] === id); if (a) { toast(`${a[2]} إنجاز جديد: ${a[1]}`); Confetti.burst(70); } save(); }
function touchDay() {
  const t = todayStr();
  if (G.day !== t) { G.today = 0; G.day = t; }
  if (G.lastDay !== t) { const y = new Date(Date.now() - 864e5).toLocaleDateString('en-CA'); G.days = G.lastDay === y ? G.days + 1 : 1; G.lastDay = t; if (G.days >= 3) award('days3'); }
}
function gain(xp, el) {
  const before = level().i; G.xp += xp; xpFloat(el, '+' + ar(xp));
  const after = level().i; if (after > before) { toast(`ارتقيت إلى مرتبة «${level().name}» 🎉`); Confetti.burst(160); if (after >= 4) award('lvl5'); }
  save();
}
function checkGoal() { if (G.today >= S.goal && G.goalHit !== G.day) { G.goalHit = G.day; award('goal'); Confetti.burst(200); toast('أتممت هدف اليوم — بارك الله فيك 🎯'); } }
function answered(ok, el) {
  touchDay(); G.all++; G.today++;
  if (ok) { G.ok++; G.streak++; G.best = Math.max(G.best, G.streak); gain(10 + Math.min(10, G.streak - 1), el); award('first'); if (G.streak === 5) award('streak5'); if (G.streak === 15) award('streak15'); }
  else G.streak = 0;
  checkGoal(); save(); updateRvTop();
}

/* ---------- router & views ---------- */
const VIEWS = ['home', 'map', 'read', 'review', 'ai', 'message', 'coverage', 'about'];
function setView(v, push = true) {
  S.view = v; $$('#views button, #tabbar button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  if (push) updateHash();
  const doit = () => { render(); scrollTo(0, 0); };
  if (document.startViewTransition && S.motion === 'full') { const vt = document.startViewTransition(doit); vt.ready.catch(() => {}); vt.finished.catch(() => {}); vt.updateCallbackDone && vt.updateCallbackDone.catch(() => {}); } else doit();
}
function updateHash() { const h = S.view === 'read' ? `#read/${S.ch}` : `#${S.view}`; if (location.hash !== h) history.replaceState(null, '', h); }
function render() {
  const app = $('#app'); app.onclick = null; app.onpointermove = null; app.className = ''; Speech.stop();
  ({ home: renderHome, map: renderMap, read: renderRead, review: renderReview, ai: renderAI, message: renderMessage, coverage: renderCoverage, about: renderAbout }[S.view] || renderHome)(app);
  if (!document.startViewTransition || S.motion !== 'full') { app.classList.remove('view-enter'); void app.offsetWidth; app.classList.add('view-enter'); }
  observe(app); animateRings(app);
}
function goChapter(id, hl) { S.ch = id; HL = hl || ''; FOCUS = ''; save(); if (S.view !== 'read') setView('read'); else { updateHash(); render(); scrollTo(0, 0); } }

/* ---------- HOME ---------- */
function countAll() { let n = 0; const src = new Set(); for (const c of DB.chapters) for (const t of ORDER) { const p = c.passages[t]; if (hasText(p)) { n += items(p).filter(x => x.kind !== 'h').length; p.sources.forEach(s => src.add(s)); } } return { n, src: src.size }; }
function renderHome(app) {
  touchDay(); const pr = progressPct(); const cnt = countAll(); const lv = level();
  const last = CH[S.ch];
  const ver = DB.chapters.reduce((a, c) => a + ORDER.filter(t => hasText(c.passages[t])).length, 0);
  app.innerHTML = `
  <section class="hero">
    <div>
      <div class="rosette" aria-hidden="true">
        <svg class="r ring1" viewBox="0 0 200 200"><g fill="none" stroke="currentColor" stroke-width=".6" opacity=".55">${Array.from({ length: 16 }, (_, k) => `<ellipse cx="100" cy="100" rx="96" ry="38" transform="rotate(${k * 11.25} 100 100)"/>`).join('')}</g></svg>
        <svg class="r ring2 draw" viewBox="0 0 200 200"><path d="M100 14l22 44 47-18-18 47 44 22-44 22 18 47-47-18-22 44-22-44-47 18 18-47-44-22 44-22-18-47 47 18z" fill="none" stroke="url(#gold)" stroke-width="1.4"/><path d="M100 44l13 26 28-10-10 28 26 13-26 13 10 28-28-10-13 26-13-26-28 10 10-28-26-13 26-13-10-28 28 10z" fill="none" stroke="url(#gold)" stroke-width="1"/><path d="M100 2v196M2 100h196M31 31l138 138M169 31L31 169" stroke="currentColor" stroke-width=".3" opacity=".5"/><circle cx="100" cy="100" r="62" fill="none" stroke="url(#gold)" stroke-width=".8"/></svg>
        <div class="orbit">${ORDER.map((t, k) => `<span class="ob" style="--k:${k}"><span class="counter">${badge(t)}</span></span>`).join('')}</div>
        <div class="hero-core"><div class="big">المقارِن<br>الفقهي</div><div class="small">خمسة متون · ${ar(DB.chapters.length)} بابًا</div></div>
      </div>
      <div class="hero-text">
        <h2 class="title">الأخضري · ابن عاشر · البشار · خليل · الرسالة</h2>
        <p>كل باب من أبواب العبادات جنبًا إلى جنب، بنصوصها الأصلية منقولة من مصادرها، مع رابط المصدر لكل فقرة.</p>
        <div class="cta">
          <button class="btn primary" data-go="read">${I.play} ابدأ القراءة</button>
          <button class="btn" data-go="map">✧ خريطة الأبواب</button>
          <button class="btn" data-go="review">★ راجع الآن</button>
          <button class="btn" data-go="ai">${I.spark} اسأل المساعد</button>
        </div>
      </div>
    </div>
  </section>
  <div class="stats">
    <div class="stat panel reveal"><b data-count="${DB.chapters.length}">٠</b><span>بابًا في ٥ كتب</span></div>
    <div class="stat panel reveal"><b data-count="${cnt.n}">٠</b><span>فقرة وبيتًا منقولة</span></div>
    <div class="stat panel reveal"><b data-count="${ver}">٠</b><span>خانة موثّقة (باب × متن)</span></div>
    <div class="stat panel reveal"><b data-count="${cnt.src}">٠</b><span>صفحة مصدر مرتبطة</span></div>
  </div>
  <div class="continue panel reveal">
    ${ring(pr.pct, 'var(--gold)', ar(pr.pct) + '٪', 60)}
    <div style="flex:1;min-width:0"><b>تابع من حيث توقفت: ${esc(last.title)}</b><div class="hint">أنهيت ${ar(pr.d)} من ${ar(pr.total)} نصًّا · مرتبتك: ${lv.name} · ${ar(G.xp)} نقطة · اليوم ${ar(G.today)}/${ar(S.goal)}</div></div>
    <button class="btn primary" data-ch="${last.id}">متابعة</button>
  </div>
  <div class="sec-h">المتون الخمسة</div>
  <div class="textcards">${ORDER.map(t => `<div class="tcard panel reveal" style="--c:var(--c-${t})" data-t="${t}">${badge(t)}<div><h4>${T[t].name}</h4><p>${esc(T[t].book)}</p><p>${esc(T[t].author)}</p></div></div>`).join('')}</div>
  <div class="divider"></div>
  <p class="hint" style="text-align:center">تعليمي للمراجعة — ليس فتوى. ارجع إلى أهل العلم في النوازل.</p>`;
  app.onclick = e => {
    const g = e.target.closest('[data-go]'); if (g) return setView(g.dataset.go);
    const c = e.target.closest('[data-ch]'); if (c) return goChapter(c.dataset.ch);
    const t = e.target.closest('.tcard'); if (t) { setView('about'); setTimeout(() => { const el = $('#bio-' + t.dataset.t); el && el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 450); }
  };
  countUp(app);
}
function countUp(root) {
  $$('[data-count]', root).forEach(el => {
    const target = +el.dataset.count;
    if (S.motion === 'off') { el.textContent = ar(target); return; }
    const t0 = performance.now(), dur = 1600;
    const step = now => { const k = Math.min(1, (now - t0) / dur); el.textContent = ar(Math.round(target * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

/* ---------- MAP ---------- */
function renderMap(app) {
  app.innerHTML = `<div class="mapwrap">
    <div class="chaphead"><div class="ttl"><div><div class="crumb">خريطة الأبواب</div><h2 class="title">كوكبة الأبواب</h2><p class="sub">كل نجمة باب، وحلقتها تقدّم مراجعتك، والنقاط الخمس توفّر المتون فيه (ي ع ش خ س).</p></div></div></div>
    <div class="legend">${ORDER.map(t => `<span><i style="background:var(--c-${t})"></i>${T[t].sym} ${T[t].name}</span>`).join('')}<span><i style="background:transparent;border:1px solid var(--muted)"></i>ليس في المتن</span></div>
    ${DB.meta.books.map(b => { const chs = DB.chapters.filter(c => c.book === b.id); return `<section class="book">
      <h3><svg width="22" height="22" style="color:var(--gold)"><use href="#star8"/></svg>${b.title} <i>${ar(chs.length)} أبواب</i></h3>
      <div class="constel" data-b="${b.id}"><svg class="links"></svg>${chs.map(c => { const p = chProgress(c); return `<button class="node reveal ${c.id === S.ch ? 'cur' : ''} ${p.av && p.d === p.av ? 'done' : ''}" data-ch="${c.id}">
        <span class="star"><svg class="s8"><use href="#star8"/></svg>${ring(p.pct, 'var(--gold)', null, 42)}</span>
        <span class="nm">${esc(c.title.replace(/^باب /, ''))}</span>
        <span class="dots">${ORDER.map(t => `<i class="${c.passages[t].status}" style="--c:var(--c-${t})" title="${T[t].name}: ${ST_LABEL[c.passages[t].status]}"></i>`).join('')}</span></button>`; }).join('')}</div></section>`; }).join('')}
  </div>`;
  app.onclick = e => { const n = e.target.closest('[data-ch]'); if (n) goChapter(n.dataset.ch); };
  setTimeout(drawLinks, 60);
}
function drawLinks() {
  $$('.constel').forEach(box => {
    const svg = $('svg.links', box), br = box.getBoundingClientRect(); const ns = $$('.node', box).map(n => [n.offsetLeft + n.offsetWidth / 2, n.offsetTop + 36]);
    let d = ''; ns.forEach((p, i) => { if (i) { const q = ns[i - 1]; const mx = (p[0] + q[0]) / 2, my = Math.min(p[1], q[1]) - 18; d += `M${q[0]},${q[1]} Q${mx},${my} ${p[0]},${p[1]} `; } });
    svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`); svg.innerHTML = `<path d="${d}"/>`;
  });
}
addEventListener('resize', () => { if (S.view === 'map') drawLinks(); });

/* ---------- READ ---------- */
function buildCompare(c) {
  const shared = new Map(), freq = new Map();
  for (const t of S.on) { const p = c.passages[t]; if (!hasText(p)) continue; const seen = new Set();
    for (const it of items(p)) { if (it.kind === 'h') continue; const s = it.kind === 'v' ? it.a + ' ' + (it.b || '') : it.t;
      for (const w of s.split(/\s+/)) { const st = stem(w); if (!st || st.length < 3 || STOP.has(st) || /^\d+$/.test(st)) continue; seen.add(st); freq.set(st, (freq.get(st) || 0) + 1); } }
    for (const st of seen) { if (!shared.has(st)) shared.set(st, new Set()); shared.get(st).add(t); } }
  for (const [k, v] of shared) if (v.size < 2) shared.delete(k);
  const top = [...shared.entries()].sort((a, b) => b[1].size - a[1].size || freq.get(b[0]) - freq.get(a[0])).slice(0, 28);
  return { shared, top };
}
function renderRead(app) {
  const c = chap(S.ch); const pr = chProgress(c); MEMSEQ = 0;
  CMP = S.cmp ? buildCompare(c) : null;
  app.className = 'layout-' + S.layout;
  const bk = DB.meta.books.find(b => b.id === c.book);
  let lastBook = '';
  app.innerHTML = `
  <div class="chapnav" id="chapnav">${DB.chapters.map(x => { const b = x.book !== lastBook ? (lastBook = x.book, `<span class="bk">${DB.meta.books.find(y => y.id === x.book).title.replace('كتاب ', '')}</span>`) : ''; const p = chProgress(x);
    return `${b}<button data-ch="${x.id}" class="${x.id === c.id ? 'on' : ''}">${esc(x.title.replace(/^باب /, ''))}${p.av && p.d === p.av ? '<i class="dot"></i>' : ''}</button>`; }).join('')}</div>
  <div class="panel frame reveal" style="margin-bottom:12px">
    <svg class="cn a"><use href="#corner"/></svg><svg class="cn b"><use href="#corner"/></svg><svg class="cn c"><use href="#corner"/></svg><svg class="cn d"><use href="#corner"/></svg>
    <div class="chaphead">
      <div class="ttl">${ring(pr.pct, 'var(--gold)', ar(pr.d) + '/' + ar(pr.av), 58)}<div><div class="crumb">${bk ? bk.title : ''}</div><h2 class="title">${esc(c.title)}</h2><p class="sub">${esc(c.sub)}</p></div></div>
      <div class="actions"><button class="btn primary" data-act="doneall">${I.check} أنهيت مراجعة الباب</button></div>
    </div>
    <div class="symbols" id="symbols">${ORDER.map(id => `<button class="sym ${S.on.includes(id) ? '' : 'off'}" data-t="${id}" style="--c:var(--c-${id})" title="${esc(T[id].book)}">${badge(id)}<span>${T[id].name}</span></button>`).join('')}</div>
    <div class="toolbar">
      <button class="btn sm" data-act="layout">${S.layout === 'side' ? I.rows + ' مكدّس' : I.cols + ' جنبًا إلى جنب'}</button>
      <button class="btn sm ${S.cmp ? 'on' : ''}" data-act="cmp">${I.cmp} وضع المقارنة</button>
      <select class="btn sm" id="memSel" title="وضع الحفظ"><option value="off">وضع الحفظ: إيقاف</option><option value="words">حفظ: إخفاء كلمة وكلمة</option><option value="half">حفظ: إخفاء الشطر الثاني</option><option value="all">حفظ: إخفاء النص كاملًا</option></select>
      <button class="btn sm" data-act="speakall">${I.play} استماع</button>
      <button class="btn sm" data-act="aicmp">${I.spark} ملخّص مقارن آلي</button>
      <span class="sep"></span>
      <button class="btn sm" data-act="copy">${I.copy} نسخ</button>
      <button class="btn sm" data-act="share">${I.share} مشاركة</button>
      <button class="btn sm" data-act="print">${I.print} طباعة</button>
    </div>
  </div>
  ${HL ? `<div class="note">تمييز الكلمة: <mark>${esc(HL)}</mark> <button class="btn sm ghost" data-act="clearhl">إلغاء التمييز</button></div>` : ''}
  ${S.cmp && CMP ? `<div class="cmpbar panel"><span class="hint">ألفاظ مشتركة بين المتون (اضغط لتتبعها):</span>${CMP.top.map(([w, set]) => `<button class="chip ${FOCUS === w ? 'on' : ''}" data-w="${esc(w)}">${esc(w)}<b>${ar(set.size)}</b></button>`).join('') || '<span class="hint">لا توجد ألفاظ مشتركة كافية.</span>'}</div>` : ''}
  ${S.mem !== 'off' ? `<div class="note">وضع الحفظ: اضغط على المخفي لإظهاره. <button class="btn sm ghost" data-act="revealall">${I.eye} إظهار الكل</button></div>` : ''}
  <div class="grid" style="--n:${S.on.length}">${S.on.map((t, i) => card(c, t, i)).join('')}</div>
  <div class="pn">${prevNext(c)}</div>`;
  $('#memSel').value = S.mem;
  $('#memSel').onchange = e => { S.mem = e.target.value; save(); if (S.mem !== 'off') award('memo'); render(); };
  $('#chapnav').onclick = e => { const b = e.target.closest('[data-ch]'); if (b) goChapter(b.dataset.ch); };
  requestAnimationFrame(() => { const on = $('#chapnav .on'), nav = $('#chapnav'); if (on && nav) nav.scrollLeft = on.offsetLeft - nav.clientWidth / 2 + on.offsetWidth / 2; });
  $('#symbols').onclick = e => {
    const b = e.target.closest('.sym'); if (!b) return; const id = b.dataset.t;
    if (S.on.includes(id)) { if (S.on.length > 1) S.on = S.on.filter(x => x !== id); else return toast('لابد من متن واحد على الأقل'); }
    else S.on = ORDER.filter(x => x === id || S.on.includes(x));
    save(); render();
  };
  app.onclick = e => readClick(e, c);
  app.onpointermove = e => { const cd = e.target.closest && e.target.closest('.card'); if (!cd) return; const r = cd.getBoundingClientRect(); cd.style.setProperty('--mx', (e.clientX - r.left) + 'px'); cd.style.setProperty('--my', (e.clientY - r.top) + 'px'); };
}
function pop(a) { a.classList.add('pop'); setTimeout(() => a.classList.remove('pop'), 500); }
function readClick(e, c) {
  const sw = e.target.closest('.sw,.cmpbar .chip[data-w]');
  if (sw) { FOCUS = FOCUS === sw.dataset.w ? '' : sw.dataset.w; $$('.sw').forEach(x => x.classList.toggle('focus', x.dataset.w === FOCUS)); $$('.cmpbar .chip').forEach(x => x.classList.toggle('on', x.dataset.w === FOCUS)); const f = $('.sw.focus'); if (f && sw.classList.contains('chip')) f.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); return; }
  const mw = e.target.closest('.mw,.mh'); if (mw) { mw.classList.toggle('shown'); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act, tid = a.dataset.t;
  if (act === 'layout') { S.layout = S.layout === 'side' ? 'stack' : 'side'; save(); render(); }
  else if (act === 'cmp') { S.cmp = !S.cmp; FOCUS = ''; save(); render(); if (S.cmp) toast('الألفاظ المشتركة مسطّرة بالذهبي — كلما اشتد اللون زاد عدد المتون'); }
  else if (act === 'revealall') $$('.mw,.mh').forEach(x => x.classList.add('shown'));
  else if (act === 'copy') copy(chapterText(c, S.on, true));
  else if (act === 'share') share(c.title, chapterText(c, S.on, false));
  else if (act === 'print') printNow();
  else if (act === 'speakall') Speech.toggle(S.on.flatMap(t => $$(`#card-${t} [data-say]`)), a);
  else if (act === 'speak') Speech.toggle($$(`#card-${tid} [data-say]`), a);
  else if (act === 'aicmp') aiCompare(c);
  else if (act === 'explain') aiExplain(c, a.dataset.t, +a.dataset.si, +a.dataset.ii);
  else if (act === 'doneall') { const before = chProgress(c); S.on.forEach(t => { if (hasText(c.passages[t])) done.add(c.id + ':' + t); }); save(); if (before.d < before.av) { gain(25, a); Confetti.burst(90); award('ch1'); checkBook(c.book); } toast('بارك الله فيك — سُجّلت مراجعة الباب'); render(); }
  else if (act === 'clearhl') { HL = ''; render(); }
  else if (act === 'bm') { const k = c.id + ':' + tid; bm.has(k) ? bm.delete(k) : bm.add(k); save(); a.classList.toggle('on', bm.has(k)); pop(a); toast(bm.has(k) ? 'أُضيف إلى المحفوظات' : 'أُزيل من المحفوظات'); }
  else if (act === 'done') { const k = c.id + ':' + tid; const was = done.has(k); was ? done.delete(k) : done.add(k); save(); if (!was) { gain(5, a); award('ch1'); checkBook(c.book); } a.classList.toggle('on', !was); pop(a);
    const p = chProgress(c); const r = $('.chaphead .ring'); if (r) { r.style.setProperty('--p', p.pct); $('b', r).textContent = ar(p.d) + '/' + ar(p.av); } }
  else if (act === 'copyone') copy(passageText(c, tid, true));
  else if (act === 'more') a.closest('.card').classList.toggle('collapsed');
  else if (act === 'go') goChapter(a.dataset.ch);
}
function checkBook(b) { const chs = DB.chapters.filter(c => c.book === b); if (chs.every(c => { const p = chProgress(c); return p.d === p.av; })) award('book'); }
function srcLabel(u, i) { return /shamela/.test(u) ? 'ص' + ar(u.split('/').pop()) : /ma7dhara/.test(u) ? 'محظرة' : /tijaniyya/.test(u) ? 'المتن' : 'رابط ' + ar(i + 1); }
function card(c, tid, idx) {
  const p = c.passages[tid], t = T[tid], k = c.id + ':' + tid;
  const head = `<div class="chead">${badge(tid)}<div class="meta"><h3>${t.name}</h3><div class="bk">${esc(t.book)}</div><span class="pill ${p.status}">${ST_SHORT[p.status]} ${ST_LABEL[p.status]}</span></div>
    <div class="cacts">${hasText(p) ? `<button class="ib ${bm.has(k) ? 'on' : ''}" data-act="bm" data-t="${tid}" title="حفظ" aria-label="حفظ">${I.star}</button><button class="ib ${done.has(k) ? 'on' : ''}" data-act="done" data-t="${tid}" title="تمت مراجعته" aria-label="تمت مراجعته">${I.check}</button><button class="ib" data-act="speak" data-t="${tid}" title="استماع" aria-label="استماع">${I.play}</button><button class="ib" data-act="copyone" data-t="${tid}" title="نسخ" aria-label="نسخ">${I.copy}</button>` : ''}</div></div>`;
  if (!hasText(p)) return `<article class="card flip-in" id="card-${tid}" style="--c:var(--c-${tid});--i:${idx}">${head}<div class="absent-box"><span class="glyph">۞</span>${esc(p.note || ST_LABEL[p.status])}</div><div class="cfoot">${p.sources.map(u => `<a href="${u}" target="_blank" rel="noopener">فهرس المصدر ↗</a>`).join(' ')}</div></article>`;
  let body = p.note ? `<div class="cnote">${esc(p.note)}</div>` : '';
  let total = 0;
  p.sections.forEach((sec, si) => {
    if (sec.title) body += `<div class="stitle">${esc(sec.title)}</div>`;
    body += '<div class="txt">';
    sec.items.forEach((it, ii) => {
      total += (it.t || it.a || '').length + (it.b || '').length;
      const ex = `<button class="vt" data-act="explain" data-t="${tid}" data-si="${si}" data-ii="${ii}" title="شرح آلي مبسّط">✦ اشرح</button>`;
      const src = `<a class="psrc vt" href="${it.src}" target="_blank" rel="noopener">المصدر ↗</a>`;
      if (it.kind === 'h') body += `<div class="h">${esc(it.t)}</div>`;
      else if (it.kind === 'v') {
        const tags = [];
        if (it.check === '2') tags.push(`<a class="vt ok" href="${it.cross || it.cross2}" target="_blank" rel="noopener" title="وُجد البيت في مصدر ثانٍ">مقابَل ✓</a>`);
        else if (it.check === '1') tags.push(`<span class="vt one" title="لم يُطابَق آليًا على مصدر ثانٍ">مصدر واحد</span>`);
        if (it.cross2 && it.cross) tags.push(`<a class="vt ok" href="${it.cross2}" target="_blank" rel="noopener">محظرة ✓</a>`);
        if (it.patch) tags.push(`<a class="vt patch" href="${it.patch.src}" target="_blank" rel="noopener">شطر من شرح ميارة</a>`);
        const hideB = S.mem === 'half' || S.mem === 'all', hideA = S.mem === 'all';
        body += `<div class="verse" data-say="${esc(it.a + '، ' + (it.b || ''))}"><span class="n">${it.n ? ar(it.n) : ''}</span><span class="a ${hideA ? 'mh' : ''}">${fmt(it.a)}</span><span class="b ${hideB ? 'mh' : ''}">${fmt(it.b || '')}</span><span class="tags">${tags.join('')}${ex}${src}</span></div>`;
      } else {
        let inner;
        if (S.mem === 'half') { const w = it.t.split(/\s+/); const h = Math.ceil(w.length / 2); inner = esc(w.slice(0, h).join(' ')) + ' <span class="mh">' + esc(w.slice(h).join(' ')) + '</span>'; }
        else if (S.mem === 'all') inner = `<span class="mh">${esc(it.t)}</span>`;
        else inner = fmt(it.t);
        body += `<p data-say="${esc(it.t)}">${inner} ${ex}${src}</p>`;
      }
    });
    body += '</div>';
  });
  const long = total > 2600 && S.layout !== 'compact' && !HL && !S.cmp;
  const nsrc = p.sources.length;
  return `<article class="card flip-in ${long ? 'collapsed' : ''}" id="card-${tid}" style="--c:var(--c-${tid});--i:${idx}">${head}<div class="cbody">${body}</div>${long ? `<button class="more" data-act="more">إظهار / طي النص كاملًا ▾</button>` : ''}
    <div class="cfoot"><b>الطبعة/المصدر:</b> ${esc(t.edition)}<br><b>صفحات المصدر (${ar(nsrc)}):</b> ${p.sources.slice(0, 12).map((u, i) => `<a href="${u}" target="_blank" rel="noopener">${srcLabel(u, i)}</a>`).join(' · ')}${nsrc > 12 ? ' …' : ''}</div></article>`;
}
function prevNext(c) {
  const i = DB.chapters.indexOf(c), a = DB.chapters[i - 1], b = DB.chapters[i + 1];
  return `${a ? `<button class="btn" data-act="go" data-ch="${a.id}">→ ${esc(a.title)}</button>` : '<span></span>'}${b ? `<button class="btn" data-act="go" data-ch="${b.id}">${esc(b.title)} ←</button>` : ''}`;
}
function printNow() { $$('.card.collapsed').forEach(x => x.classList.remove('collapsed')); setTimeout(() => print(), 60); }

/* ---------- Speech (TTS) ---------- */
const Speech = (() => {
  let queue = [], cur = null, btn = null, on = false;
  const ok = 'speechSynthesis' in window;
  function voice() { const vs = speechSynthesis.getVoices(); return vs.find(v => /^ar/i.test(v.lang) && /google|natural|online/i.test(v.name)) || vs.find(v => /^ar/i.test(v.lang)); }
  function next() {
    if (cur) cur.classList.remove('speaking');
    if (!on || !queue.length) return stop();
    cur = queue.shift(); cur.classList.add('speaking'); cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const u = new SpeechSynthesisUtterance(cur.dataset.say.replace(/[()]/g, '')); const v = voice(); if (v) u.voice = v; u.lang = v ? v.lang : 'ar-SA'; u.rate = .88;
    u.onend = next; u.onerror = next; speechSynthesis.speak(u);
  }
  function stop() { on = false; queue = []; if (ok) speechSynthesis.cancel(); if (cur) cur.classList.remove('speaking'); cur = null; if (btn) { btn.innerHTML = btn._html; btn = null; } }
  function toggle(els, b) {
    if (!ok) return toast('المتصفح لا يدعم القراءة الصوتية');
    if (on) { stop(); return; }
    if (!els.length) return toast('لا نص للاستماع');
    if (!voice()) toast('لم يُعثر على صوت عربي في جهازك — سيُستخدم الصوت الافتراضي');
    on = true; queue = [...els]; btn = b; b._html = b.innerHTML; b.innerHTML = I.stop + (b.classList.contains('ib') ? '' : ' إيقاف'); next();
  }
  if (ok) speechSynthesis.getVoices();
  return { toggle, stop };
})();

/* ---------- AI client ---------- */
async function ai(mode, body) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 45000);
  try {
    const r = await fetch(AI_URL + '/' + mode, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || (r.status === 429 ? 'تجاوزت حدّ الطلبات المؤقت، حاول بعد دقيقة.' : 'الخدمة الذكية غير متاحة الآن.'));
    return j;
  } catch (e) { throw new Error(e.name === 'AbortError' ? 'انتهت مهلة الاتصال بالمساعد.' : (e.message && /[\u0600-\u06FF]/.test(e.message) ? e.message : 'تعذّر الاتصال بالمساعد الذكي الآن — بقية الموقع يعمل كالمعتاد.')); }
  finally { clearTimeout(tm); }
}
const DISC = 'إجابة آلية مساعدة للمراجعة، وليست فتوى ولا بديلًا عن العلماء. للفتوى في الإمارات: المركز الرسمي للإفتاء 800 22 24.';
function aiSheet(html) { $('#aiSheetBody').innerHTML = html; $('#aiSheet').hidden = false; }
const thinking = txt => `<div class="ai-hero"><div class="ai-orb think"></div><span>${txt || ''}</span><span class="typing"><span></span><span></span><span></span></span></div>`;
function citesHTML(srcs) {
  return `<div class="cites">${(srcs || []).map(s => `<div class="cite" style="--c:var(--c-${s.tid})">${badge(s.tid, 'sm')}<div class="x"><b>[${ar(s.n)}] ${esc(s.name)} — ${esc(s.chTitle)}</b><small>${esc(s.excerpt)}…</small><a href="#read/${s.ch}" data-goch="${s.ch}">افتح الباب</a> · <a href="${s.src}" target="_blank" rel="noopener">المصدر ↗</a></div></div>`).join('')}</div>`;
}
async function aiExplain(c, tid, si, ii) {
  const it = c.passages[tid].sections[si].items[ii];
  aiSheet(`<h3>${I.spark} شرح آلي مبسّط <span class="ailabel">ليس من المتن</span></h3><div class="qtext txt">${esc(it.kind === 'v' ? it.a + ' … ' + (it.b || '') : it.t)}</div><div class="hint">${T[tid].sym} ${T[tid].name} — ${esc(c.title)} — <a href="${it.src}" target="_blank" rel="noopener">المصدر ↗</a></div><div id="aiOut">${thinking('يشرح…')}</div>`);
  try { const j = await ai('explain', { ch: c.id, t: tid, si, ii }); $('#aiOut').innerHTML = `<div class="msg bot"><span class="lab">شرح آلي (ليس من المتن)</span><div class="body">${esc(j.answer)}</div></div><div class="disc">${esc(j.disclaimer || DISC)}</div>`; award('ai'); }
  catch (e) { $('#aiOut').innerHTML = `<div class="note">${esc(e.message)}</div>`; }
}
async function aiCompare(c) {
  aiSheet(`<h3>${I.spark} ملخّص مقارن آلي — ${esc(c.title)} <span class="ailabel">ليس من المتون</span></h3><div id="aiOut">${thinking('يقارن نصوص الباب…')}</div>`);
  try { const j = await ai('compare', { ch: c.id }); $('#aiOut').innerHTML = `<div class="msg bot"><span class="lab">ملخّص آلي مبني على نصوص الباب</span><div class="body">${esc(j.answer)}</div>${citesHTML(j.sources)}</div><div class="disc">${esc(j.disclaimer || DISC)}</div>`; award('ai'); }
  catch (e) { $('#aiOut').innerHTML = `<div class="note">${esc(e.message)}</div>`; }
}

/* ---------- AI view ---------- */
let CHAT = LS.get('chat', []);
function renderAI(app) {
  const sug = ['ما فرائض الوضوء؟', 'متى يكون سجود السهو قبل السلام؟', 'ما شروط وجوب الجمعة؟', 'كم نصاب زكاة الغنم؟', 'ما أركان الحج؟', 'ما مبطلات التيمم؟'];
  app.innerHTML = `<div class="ai-wrap">
    <div class="panel ai-hero reveal"><div class="ai-orb"></div><div><h2 class="title" style="font-size:clamp(22px,4vw,30px)">المساعد ✦</h2><p class="sub">يجيب من نصوص المتون الخمسة في هذا الموقع فقط، ويذكر لكل معلومة رمز المتن ورابط مصدرها، ويصرّح إذا لم تغطِّ المتون السؤال.</p></div></div>
    <div class="disc reveal">⚠️ ${DISC}</div>
    <div class="sugg">${sug.map(s => `<button class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <div class="chat" id="chat">${CHAT.map(m => msgHTML(m)).join('')}</div>
    <div class="askbar panel"><textarea id="askq" rows="1" maxlength="300" placeholder="اكتب سؤالك عن العبادات في هذه المتون…"></textarea><button class="btn primary" id="askbtn">${I.spark} اسأل</button></div>
    ${CHAT.length ? '<p style="text-align:center"><button class="btn sm ghost" id="clearchat">مسح المحادثة</button></p>' : ''}
  </div>`;
  const ta = $('#askq'); ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(ta.value); } };
  $('#askbtn').onclick = () => ask(ta.value);
  app.onclick = e => { const q = e.target.closest('[data-q]'); if (q) ask(q.dataset.q); const g = e.target.closest('[data-goch]'); if (g) { e.preventDefault(); goChapter(g.dataset.goch); } if (e.target.id === 'clearchat') { CHAT = []; LS.set('chat', CHAT); render(); } };
}
function msgHTML(m) {
  if (m.me) return `<div class="msg me">${esc(m.q)}</div>`;
  if (m.err) return `<div class="msg bot"><span class="lab">المساعد</span><div class="body">${esc(m.err)}</div></div>`;
  return `<div class="msg bot"><span class="lab">${m.covered === false ? 'غير مغطّى في المتون' : 'إجابة آلية مبنية على نصوص الموقع — ليست فتوى'}</span><div class="body">${esc(m.answer)}</div>${m.sources && m.sources.length ? citesHTML(m.sources) : ''}</div>`;
}
let asking = false;
async function ask(q) {
  q = (q || '').trim(); if (q.length < 3 || asking) return; asking = true;
  const chat = $('#chat'); $('#askq').value = '';
  CHAT.push({ me: 1, q }); chat.insertAdjacentHTML('beforeend', msgHTML({ me: 1, q }));
  chat.insertAdjacentHTML('beforeend', `<div class="msg bot" id="pending"><span class="lab">يبحث في المتون…</span><span class="typing"><span></span><span></span><span></span></span></div>`);
  $('.ai-orb').classList.add('think'); $('#pending').scrollIntoView({ behavior: 'smooth', block: 'center' });
  let m;
  try { const j = await ai('ask', { q }); m = { answer: j.answer, sources: j.sources, covered: j.covered }; award('ai'); }
  catch (e) { m = { err: e.message }; }
  asking = false;
  if (!$('#pending')) { CHAT.push(m); LS.set('chat', CHAT.slice(-20)); return; }
  $('#pending').remove(); $('.ai-orb').classList.remove('think');
  CHAT.push(m); CHAT = CHAT.slice(-20); LS.set('chat', CHAT);
  chat.insertAdjacentHTML('beforeend', msgHTML(m)); chat.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- REVIEW (gamified) ---------- */
let RV = { mode: 'who', scope: 'all', q: null, answered: false };
function pool() {
  const out = [];
  for (const c of DB.chapters) { if (RV.scope !== 'all' && RV.scope !== c.book && RV.scope !== c.id) continue;
    for (const t of ORDER) { const p = c.passages[t]; if (!hasText(p)) continue;
      p.sections.forEach((s) => s.items.forEach((it) => { if (it.kind === 'h') return; const txt = it.kind === 'v' ? it.a + ' … ' + (it.b || '') : it.t; if (txt.length < 30) return; out.push({ c, t, it, txt }); })); } }
  return out;
}
function newQ() {
  const P = pool(); if (!P.length) return null;
  const x = pick(P); RV.answered = false;
  if (RV.mode === 'who') { const txt = x.txt.length > 260 ? x.txt.slice(0, 260) + '…' : x.txt; return { type: 'who', x, txt, opts: ORDER.filter(t => hasText(x.c.passages[t])).length > 1 ? ORDER : ORDER, ans: x.t }; }
  if (RV.mode === 'chapter') { const others = shuffle(DB.chapters.filter(c => c.id !== x.c.id && c.book === x.c.book)).slice(0, 3); while (others.length < 3) { const o = pick(DB.chapters); if (o.id !== x.c.id && !others.includes(o)) others.push(o); }
    return { type: 'chapter', x, txt: x.txt.length > 260 ? x.txt.slice(0, 260) + '…' : x.txt, opts: shuffle([x.c, ...others]).map(c => c.id), ans: x.c.id }; }
  if (RV.mode === 'complete') {
    const base = x.it.kind === 'v' ? x.it.a + ' ' + (x.it.b || '') : x.it.t.slice(0, 220);
    const words = base.split(/\s+/).filter(Boolean); const cands = words.map((w, i) => [w, i]).filter(([w]) => norm(w).length >= 4 && !STOP.has(stem(w)));
    if (!cands.length) return newQ();
    const [w, wi] = pick(cands);
    const all = pool().flatMap(p => (p.it.kind === 'v' ? p.it.a + ' ' + (p.it.b || '') : p.it.t).split(/\s+/)).filter(z => norm(z).length >= 4 && norm(z) !== norm(w));
    const ds = []; for (let k = 0; k < 40 && ds.length < 3; k++) { const z = pick(all).replace(/[.،:؛,()«»"]/g, ''); if (z && !ds.some(d => norm(d) === norm(z))) ds.push(z); }
    const clean = w.replace(/[.،:؛,()«»"]/g, '');
    return { type: 'complete', x, txt: words.map((z, i) => i === wi ? '<span class="blank">______</span>' : esc(z)).join(' '), raw: true, opts: shuffle([clean, ...ds]), ans: clean };
  }
  if (RV.mode === 'flash') return { type: 'flash', x };
}
function updateRvTop() {
  const el = $('.rv-top'); if (!el) return; const lv = level();
  el.outerHTML = rvTopHTML(lv); animateRings($('.rv-top'));
}
function rvTopHTML(lv = level()) {
  const gp = Math.min(100, Math.round(100 * G.today / S.goal));
  return `<div class="rv-top panel">
    <div class="lvl"><span class="lv-badge"><svg><use href="#star8"/></svg><b>${ar(lv.i + 1)}</b></span><div><b>${lv.name}</b><div class="xpbar"><i style="width:${lv.pct}%"></i></div><small>${ar(G.xp)} / ${ar(lv.nxt)} نقطة</small></div></div>
    <div class="kpi"><b class="${G.streak >= 3 ? 'fire' : ''}">🔥 ${ar(G.streak)}</b><small>متتالية (أفضل ${ar(G.best)})</small></div>
    <div class="kpi"><b>${ar(G.days)}</b><small>أيام متتابعة</small></div>
    <div class="kpi">${ring(gp, 'var(--ok)', ar(G.today) + '/' + ar(S.goal), 54)}<small>هدف اليوم</small></div>
    <div class="kpi"><b>${G.all ? ar(Math.round(100 * G.ok / G.all)) + '٪' : '—'}</b><small>الدقة</small></div>
  </div>`;
}
function renderReview(app) {
  touchDay();
  const modes = [['who', 'لمن هذا النص؟'], ['complete', 'أكمل الكلمة'], ['chapter', 'من أي باب؟'], ['flash', 'بطاقات'], ['ai', '✦ أسئلة آلية']];
  app.innerHTML = `<div class="review">
    ${rvTopHTML()}
    <div class="modes">${modes.map(([m, l]) => `<button class="chip ${RV.mode === m ? 'on' : ''}" data-mode="${m}">${l}</button>`).join('')}
      <select class="btn sm" id="scope"><option value="all">كل الأبواب</option>${DB.meta.books.map(b => `<optgroup label="${b.title}"><option value="${b.id}">${b.title} كله</option>${DB.chapters.filter(c => c.book === b.id).map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('')}</optgroup>`).join('')}</select></div>
    <div id="qbox"></div>
    <div class="sec-h">الإنجازات</div>
    <div class="achs">${ACH.map(([id, l, e]) => `<div class="ach ${G.ach.includes(id) ? 'got' : ''}" title="${l}"><span>${e}</span><small>${l}</small></div>`).join('')}</div>
  </div>`;
  $('#scope').value = RV.scope;
  $('#scope').onchange = e => { RV.scope = e.target.value; showQ(); };
  app.onclick = e => {
    const m = e.target.closest('[data-mode]'); if (m) { RV.mode = m.dataset.mode; $$('[data-mode]').forEach(b => b.classList.toggle('on', b === m)); showQ(); return; }
    const o = e.target.closest('.opt'); if (o && !RV.answered) return choose(o);
    if (e.target.closest('[data-act=next]')) return showQ();
    const f = e.target.closest('.fc'); if (f && !e.target.closest('a')) { f.classList.toggle('flipped'); return; }
    const fk = e.target.closest('[data-fk]'); if (fk) { answered(fk.dataset.fk === '1', fk); showQ(); return; }
    const g = e.target.closest('[data-goch]'); if (g) { goChapter(g.dataset.goch); }
  };
  showQ();
}
function showQ() {
  const box = $('#qbox'); if (!box) return;
  if (RV.mode === 'ai') return aiQuiz(box);
  const q = RV.q = newQ(); if (!q) { box.innerHTML = '<div class="note">لا نصوص في هذا النطاق.</div>'; return; }
  const where = `<div class="hint">${q.type === 'chapter' ? '' : esc(q.x.c.title) + ' · '}<a href="${q.x.it.src}" target="_blank" rel="noopener">المصدر ↗</a></div>`;
  if (q.type === 'flash') {
    box.innerHTML = `<div class="fc reveal"><div class="fc-in"><div class="fc-face"><div class="hint">اضغط لقلب البطاقة — من القائل وفي أي باب؟</div><div class="qtext txt">${esc(q.x.txt.length > 320 ? q.x.txt.slice(0, 320) + '…' : q.x.txt)}</div></div><div class="fc-face fc-back" style="align-items:center;text-align:center">${badge(q.x.t)}<div class="fq">${T[q.x.t].name}</div><p>${esc(q.x.c.title)}</p>${where}</div></div></div>
      <div class="fk"><button class="btn" data-fk="0">لم أعرفها</button><button class="btn primary" data-fk="1">عرفتها ✓</button></div>`;
  } else {
    const lab = { who: 'لأيّ المتون الخمسة هذا النص؟', chapter: 'من أي باب هذا النص؟', complete: 'اختر الكلمة الناقصة' }[q.type];
    box.innerHTML = `<div class="qbox panel reveal"><div class="hint">${lab}</div><div class="qtext txt">${q.raw ? q.txt : esc(q.txt)}</div>
      <div class="opts">${q.opts.map(o => q.type === 'who' ? `<button class="opt" data-v="${o}" style="--c:var(--c-${o})">${badge(o, 'sm')} ${T[o].name}</button>` : q.type === 'chapter' ? `<button class="opt" data-v="${o}">${esc(CH[o].title)}</button>` : `<button class="opt" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div id="fb"></div></div>`;
  }
  observe(box);
}
function choose(o) {
  const q = RV.q; RV.answered = true; const ok = o.dataset.v === q.ans;
  $$('.opt').forEach(b => { b.disabled = true; if (b.dataset.v === q.ans) b.classList.add('right'); });
  if (!ok) o.classList.add('wrong');
  answered(ok, o);
  $('#fb').innerHTML = `<div class="fbk ${ok ? 'ok' : 'no'}">${ok ? 'أحسنت! ✓' : 'الصواب: ' + (q.type === 'who' ? T[q.ans].name : q.type === 'chapter' ? CH[q.ans].title : q.ans)} — ${T[q.x.t].sym} ${T[q.x.t].name}، ${esc(q.x.c.title)} · <a href="#read/${q.x.c.id}" data-goch="${q.x.c.id}">افتح الباب</a> · <a href="${q.x.it.src}" target="_blank" rel="noopener">المصدر ↗</a></div><button class="btn primary" data-act="next">السؤال التالي ←</button>`;
}
async function aiQuiz(box) {
  const ch = CH[RV.scope] ? RV.scope : pick(DB.chapters.filter(c => ORDER.filter(t => hasText(c.passages[t])).length >= 3)).id;
  box.innerHTML = `<div class="qbox panel"><div class="hint">أسئلة يولّدها المساعد آليًا من نصوص «${esc(CH[ch].title)}» — <span class="ailabel">آلي</span></div>${thinking('يولّد الأسئلة…')}</div>`;
  try {
    const j = await ai('quiz', { ch }); const qs = j.questions || []; if (!qs.length) throw new Error('لم يُولَّد أي سؤال صالح، جرّب مرة أخرى.');
    let k = 0;
    const show = () => { const q = qs[k]; if (!q) { box.innerHTML = `<div class="qbox panel"><p>انتهت الأسئلة الآلية لهذا الباب.</p><button class="btn primary" data-act="next">أسئلة جديدة</button></div>`; return; }
      box.innerHTML = `<div class="qbox panel reveal in"><div class="hint">سؤال آلي ${ar(k + 1)}/${ar(qs.length)} — «${esc(CH[ch].title)}» <span class="ailabel">آلي — راجع النص</span></div><div class="qtext">${esc(q.q)}</div>
        <div class="opts">${q.options.map((o, i) => `<button class="opt ai" data-i="${i}">${esc(o)}</button>`).join('')}</div><div id="fb"></div></div>`;
      $$('.opt.ai', box).forEach(b => b.onclick = () => { const ok = +b.dataset.i === q.answer; $$('.opt.ai', box).forEach(x => { x.disabled = true; if (+x.dataset.i === q.answer) x.classList.add('right'); }); if (!ok) b.classList.add('wrong'); answered(ok, b);
        const t = q.tid && T[q.tid] ? `${T[q.tid].sym} ${T[q.tid].name}` : '';
        $('#fb', box).innerHTML = `<div class="fbk ${ok ? 'ok' : 'no'}">${ok ? 'أحسنت ✓' : 'الصواب: ' + esc(q.options[q.answer])}${q.quote ? `<div class="qtext txt" style="font-size:.9em">«${esc(q.quote)}» ${t}</div>` : ''} <a href="#read/${ch}" data-goch="${ch}">افتح الباب للتحقق</a></div><button class="btn primary" id="aiNext">التالي ←</button>`;
        $('#aiNext').onclick = e => { e.stopPropagation(); k++; show(); }; }); };
    show();
  } catch (e) { box.innerHTML = `<div class="note">${esc(e.message)} <button class="btn sm" data-mode="who">العودة للأسئلة العادية</button></div>`; }
}

/* ---------- MESSAGE builder (v1 feature) ---------- */
let MSG = { ch: null, order: [], src: true };
function renderMessage(app) {
  if (!MSG.ch) MSG.ch = S.ch;
  const c = chap(MSG.ch);
  app.innerHTML = `<div class="mb panel reveal">
    <h2 class="title" style="font-size:clamp(20px,4vw,28px)">صانع الرسالة</h2>
    <p class="sub">اكتب أمرًا سريعًا مثل «وضوء ي ع ش» أو اختر الباب والمتون بالترتيب الذي تريده، ثم انسخ أو شارك.</p>
    <div class="cmd"><input id="quick" placeholder="مثال: الصلاة خ س ي" autocomplete="off"><button class="btn" id="qgo">تطبيق</button></div>
    <label class="field"><span>الباب</span><select id="mch">${DB.meta.books.map(b => `<optgroup label="${b.title}">${DB.chapters.filter(x => x.book === b.id).map(x => `<option value="${x.id}">${esc(x.title)}</option>`).join('')}</optgroup>`).join('')}</select></label>
    <div class="field"><span>المتون (اضغط بالترتيب)</span><div class="pickers">${ORDER.map(t => { const i = MSG.order.indexOf(t); return `<button class="sym ${i < 0 ? 'off' : ''}" data-t="${t}" style="--c:var(--c-${t})">${badge(t)}<span>${T[t].name}</span>${i >= 0 ? `<i class="ord">${ar(i + 1)}</i>` : ''}</button>`; }).join('')}</div></div>
    <label class="chk"><input type="checkbox" id="msrc" ${MSG.src ? 'checked' : ''}> إرفاق روابط المصادر</label>
    <textarea id="mout" class="out" readonly rows="12"></textarea>
    <div class="actions"><button class="btn primary" id="mcopy">${I.copy} نسخ</button><button class="btn" id="mshare">${I.share} مشاركة</button><a class="btn" id="mwa" target="_blank" rel="noopener">واتساب</a></div>
  </div>`;
  $('#mch').value = MSG.ch;
  const upd = () => { const txt = MSG.order.length ? chapterText(chap(MSG.ch), MSG.order, MSG.src) : 'اختر متنًا واحدًا على الأقل.'; $('#mout').value = txt; $('#mwa').href = 'https://wa.me/?text=' + encodeURIComponent(txt.slice(0, 3500)); };
  upd();
  $('#mch').onchange = e => { MSG.ch = e.target.value; upd(); };
  $('#msrc').onchange = e => { MSG.src = e.target.checked; upd(); };
  $('.pickers').onclick = e => { const b = e.target.closest('.sym'); if (!b) return; const t = b.dataset.t; const i = MSG.order.indexOf(t); i >= 0 ? MSG.order.splice(i, 1) : MSG.order.push(t); renderMessage(app); observe(app); };
  $('#mcopy').onclick = () => copy($('#mout').value);
  $('#mshare').onclick = () => share(chap(MSG.ch).title, $('#mout').value);
  const quick = () => { const v = $('#quick').value.trim(); if (!v) return; const parts = v.split(/\s+/); const syms = []; const words = [];
    for (const p of parts) { const t = ORDER.find(x => T[x].sym === p); t ? syms.push(t) : words.push(p); }
    const w = norm(words.join(' ')); if (w) { const hit = DB.chapters.find(x => norm(x.title).includes(w) || norm(x.sub).includes(w)) || DB.chapters.find(x => w.split(' ').some(z => z.length > 2 && norm(x.title).includes(stem(z)))); if (hit) MSG.ch = hit.id; else toast('لم أجد بابًا بهذا الاسم'); }
    if (syms.length) MSG.order = syms; renderMessage(app); observe(app); };
  $('#qgo').onclick = quick; $('#quick').onkeydown = e => { if (e.key === 'Enter') quick(); };
}

/* ---------- COVERAGE ---------- */
function renderCoverage(app) {
  const cnt = (p) => hasText(p) ? items(p).filter(x => x.kind !== 'h').length : 0;
  app.innerHTML = `<div class="panel reveal" style="padding:16px"><h2 class="title" style="font-size:clamp(20px,4vw,28px)">جدول التغطية والتوثيق</h2>
    <p class="sub">✓ منقول من المصدر · ◐ منقول وبعض أبياته لم تُقابَل على مصدر ثانٍ · — المتن لا يُفرد هذا الباب. الرقم = عدد الفقرات/الأبيات المنقولة.</p>
    <div class="covwrap"><table class="cov"><thead><tr><th>الباب</th>${ORDER.map(t => `<th style="color:var(--c-${t})">${T[t].sym}<small>${T[t].name}</small></th>`).join('')}</tr></thead>
    <tbody>${DB.meta.books.map(b => `<tr class="bk"><td colspan="6">${b.title}</td></tr>` + DB.chapters.filter(c => c.book === b.id).map(c => `<tr><td><a href="#read/${c.id}" data-goch="${c.id}">${esc(c.title)}</a></td>${ORDER.map(t => { const p = c.passages[t]; return `<td class="${p.status}" title="${esc(p.note || ST_LABEL[p.status])}">${ST_SHORT[p.status]}${cnt(p) ? `<small>${ar(cnt(p))}</small>` : ''}</td>`; }).join('')}</tr>`).join('')).join('')}</tbody></table></div></div>
    <div class="sec-h">المصادر</div>
    <div class="srcs">${ORDER.map(t => `<div class="panel reveal src-card" style="--c:var(--c-${t})">${badge(t)}<div><b>${T[t].name} — ${esc(T[t].book)}</b><p>${esc(T[t].edition)}</p>${T[t].note ? `<p class="hint">${esc(T[t].note)}</p>` : ''}<p>${T[t].home ? `<a href="${T[t].home}" target="_blank" rel="noopener">المصدر الرئيس ↗</a>` : ''}</p></div></div>`).join('')}</div>`;
  app.onclick = e => { const g = e.target.closest('[data-goch]'); if (g) { e.preventDefault(); goChapter(g.dataset.goch); } };
}

/* ---------- ABOUT ---------- */
function renderAbout(app) {
  const saved = [...bm].map(k => { const [c, t] = k.split(':'); return CH[c] && T[t] ? { c: CH[c], t } : null; }).filter(Boolean);
  app.innerHTML = `<div class="about">
    <div class="panel reveal" style="padding:18px"><h2 class="title" style="font-size:clamp(20px,4vw,28px)">عن الموقع ومنهجه</h2>
    <ul class="method"><li>كل نص في الموقع منقول آليًا من صفحة مصدر منشورة، ويظهر رابطها بجوار كل فقرة. لا إعادة صياغة ولا كتابة من الذاكرة.</li>
    <li>ما لم يُتحقق منه يُعلَّم «لم يُتحقق من النص بعد»، وما لا يُفرده المتن يُعلَّم «ليس في المتن».</li>
    <li>منظومة ابن عاشر منقولة من نسخة رقمية واحدة، ثم قوبل كل بيت آليًا على شرح ميارة (الشاملة) وعلى موقع المحظرة؛ وتظهر علامة «مقابَل ✓» أو «مصدر واحد» على كل بيت.</li>
    <li>ما يكتبه المساعد ✦ موسوم دائمًا بأنه شرح آلي وليس من المتن، وليس فتوى.</li></ul></div>
    <div class="sec-h">تراجم المؤلفين</div>
    <div class="bios">${ORDER.map(t => { const b = T[t].bio; return `<div class="bio panel reveal" id="bio-${t}" style="--c:var(--c-${t})"><div class="bh">${badge(t)}<div><h3>${T[t].name}</h3><p>${esc(T[t].author)}</p></div></div>${b ? `<blockquote>${esc(b.text)}</blockquote><div class="hint">مقتبس حرفيًا من ويكيبيديا العربية (${esc(b.title)}) — <a href="${b.perma || b.url}" target="_blank" rel="noopener">المصدر ↗</a></div>` : '<p class="hint">لم يُتحقق من النص بعد</p>'}</div>`; }).join('')}</div>
    <div class="sec-h">المحفوظات (${ar(saved.length)})</div>
    <div class="saved">${saved.length ? saved.map(s => `<button class="chip" data-goch="${s.c.id}">${T[s.t].sym} ${esc(s.c.title)}</button>`).join('') : '<p class="hint">اضغط النجمة على أي نص لحفظه هنا.</p>'}</div>
    <div class="panel reveal" style="padding:16px;margin-top:16px"><b>الخصوصية</b><p class="hint">التقدم والإعدادات محفوظة في متصفحك فقط. أسئلة المساعد تُرسل إلى خادم Cloudflare Workers AI لتوليد الإجابة دون حفظ هويتك، والموقع يعمل كاملًا بدونه.</p><p class="hint">تعليمي للمراجعة — ليس فتوى. للفتوى في الإمارات: 800 22 24.</p></div>
  </div>`;
  app.onclick = e => { const g = e.target.closest('[data-goch]'); if (g) goChapter(g.dataset.goch); };
}

/* ---------- SEARCH ---------- */
function doSearch(q) {
  const out = $('#results'); const rx = makeRx(q); if (!rx || norm(q).length < 2) { out.innerHTML = '<p class="hint">اكتب كلمتين أو أكثر من الحروف.</p>'; return; }
  const res = [];
  for (const c of DB.chapters) for (const t of ORDER) { const p = c.passages[t]; if (!hasText(p)) continue;
    for (const it of items(p)) { const s = it.kind === 'v' ? it.a + ' … ' + (it.b || '') : it.t; rx.lastIndex = 0; const m = rx.exec(s); if (m) { res.push({ c, t, s, i: m.index, l: m[0].length }); if (res.length > 120) break; } } }
  out.innerHTML = res.length ? `<p class="hint">${ar(res.length)}${res.length > 120 ? '+' : ''} نتيجة</p>` + res.map(r => { const a = Math.max(0, r.i - 60); return `<button class="res" data-ch="${r.c.id}" style="--c:var(--c-${r.t})"><span class="meta"><b>${T[r.t].sym}</b>${T[r.t].name} · ${esc(r.c.title)}</span><span>${a ? '…' : ''}${esc(r.s.slice(a, r.i))}<mark>${esc(r.s.substr(r.i, r.l))}</mark>${esc(r.s.slice(r.i + r.l, r.i + r.l + 80))}…</span></button>`; }).join('') : '<p class="hint">لا نتائج.</p>';
}

/* ---------- chrome / boot ---------- */
function bindChrome() {
  const sheet = id => { $$('.sheet').forEach(s => s.hidden = s.id !== id || !s.hidden); };
  $('#views').onclick = e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); };
  $('#tabbar').onclick = e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); };
  $('.brand').onclick = e => { e.preventDefault(); setView('home'); };
  $('#btnMenu').onclick = () => sheet('menuSheet');
  $('#btnSearch').onclick = () => { sheet('searchSheet'); setTimeout(() => $('#q').focus(), 60); };
  $('#btnTheme').onclick = () => { S.theme = { ink: 'parchment', parchment: 'sepia', sepia: 'ink' }[S.theme]; save(); applyLook(); $('#selTheme').value = S.theme; };
  $$('.sheet').forEach(s => s.addEventListener('click', e => { if (e.target === s || e.target.closest('[data-close]')) s.hidden = true; }));
  addEventListener('keydown', e => {
    if (e.key === 'Escape') $$('.sheet').forEach(s => s.hidden = true);
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === '/') { e.preventDefault(); $('#btnSearch').click(); }
    if (S.view === 'read' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { const i = DB.chapters.findIndex(c => c.id === S.ch); const n = DB.chapters[i + (e.key === 'ArrowLeft' ? 1 : -1)]; if (n) goChapter(n.id); }
  });
  let q0; $('#q').oninput = e => { clearTimeout(q0); q0 = setTimeout(() => doSearch(e.target.value), 180); };
  $('#results').onclick = e => { const r = e.target.closest('[data-ch]'); if (r) { $('#searchSheet').hidden = true; goChapter(r.dataset.ch, $('#q').value.trim()); } };
  const bindSel = (id, key, after) => { const el = $(id); el.value = S[key]; el.onchange = () => { S[key] = isNaN(+el.value) || el.value === '' ? el.value : +el.value; save(); after && after(); }; };
  bindSel('#selLayout', 'layout', render); bindSel('#selFont', 'font', applyLook); bindSel('#selTheme', 'theme', applyLook); bindSel('#selMotion', 'motion', () => { applyLook(); render(); }); bindSel('#selGoal', 'goal');
  const sz = $('#rngSize'); sz.value = S.size; $('#sizeOut').textContent = ar(S.size); sz.oninput = () => { S.size = +sz.value; $('#sizeOut').textContent = ar(S.size); save(); applyLook(); };
  const cs = $('#chkSrc'); cs.checked = !!S.showSrc; cs.onchange = () => { S.showSrc = cs.checked; save(); applyLook(); };
  $('#btnPrint').onclick = () => { $('#menuSheet').hidden = true; if (S.view !== 'read') setView('read'); setTimeout(printNow, 400); };
  $('#btnReset').onclick = () => { if (!confirm('مسح التقدم والمحفوظات والنقاط؟')) return; bm.clear(); done.clear(); Object.assign(G, { xp: 0, streak: 0, best: 0, ok: 0, all: 0, today: 0, days: 0, lastDay: '', ach: [], goalHit: '' }); CHAT = []; LS.set('chat', []); save(); toast('تم المسح'); render(); };
  let sx = 0, sy = 0; addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', e => { if (S.view !== 'read' || e.target.closest('.chapnav,.cmpbar,.covwrap,.sheet,.toolbar')) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 90 && Math.abs(dy) < 40) { const i = DB.chapters.findIndex(c => c.id === S.ch); const n = DB.chapters[i + (dx < 0 ? -1 : 1)]; if (n) goChapter(n.id); } }, { passive: true });
  addEventListener('hashchange', route);
}
function route() {
  const h = decodeURIComponent(location.hash.slice(1)); const [v, a] = h.split('/');
  if (v === 'read' && a && CH[a]) { S.ch = a; save(); }
  const nv = VIEWS.includes(v) ? v : 'home';
  if (nv !== S.view || nv === 'read') setView(nv, false); else render();
}
async function boot() {
  applyLook(); bindChrome();
  try { const r = await fetch('data/fiqh.json?v=2.0'); DB = await r.json(); }
  catch { $('#app').innerHTML = '<div class="note">تعذّر تحميل البيانات. تحقّق من الاتصال ثم أعد التحميل.</div>'; return; }
  for (const t of DB.texts) T[t.id] = t; ORDER = DB.meta.order || DB.texts.map(t => t.id);
  for (const c of DB.chapters) CH[c.id] = c;
  if (!S.on || !S.on.length || S.on.some(t => !T[t])) S.on = [...ORDER];
  if (!CH[S.ch]) S.ch = DB.chapters[0].id;
  $('#loader') && $('#loader').classList.add('gone');
  S.view = ''; route();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
})();
