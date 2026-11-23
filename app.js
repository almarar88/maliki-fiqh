/* المقارِن الفقهي المالكي — كل النصوص تأتي من data/fiqh.json (منقولة آليًا من مصادرها) */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LS = {
  get(k, d) { try { const v = localStorage.getItem('mfq.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mfq.' + k, JSON.stringify(v)); } catch {} }
};
const ST_LABEL = { verified: 'موثّق من المصدر', partial: 'منقول ومقابَل جزئيًا', absent: 'لم يُفرد له المتن بابًا', unverified: 'لم يُتحقق من النص بعد' };
const IC_COPY = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';
const ST_SHORT = { verified: '✓', partial: '◐', absent: '—', unverified: '✗' };
let DB, T = {}, ORDER = [];
const S = Object.assign({ view: 'read', ch: 'tahara', on: null, layout: innerWidth < 700 ? 'stack' : 'side', font: 'amiri', size: 19, theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', showSrc: false }, LS.get('settings', {}));
let bm = new Set(LS.get('bm', [])), done = new Set(LS.get('done', []));
let HL = '';
const save = () => { LS.set('settings', { ch: S.ch, on: S.on, layout: S.layout, font: S.font, size: S.size, theme: S.theme, showSrc: S.showSrc }); LS.set('bm', [...bm]); LS.set('done', [...done]); };

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
const esc = s => (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function fmt(text) {
  let html;
  const rx = HL && makeRx(HL);
  if (rx) { let out = '', last = 0; text.replace(rx, (m, i) => { out += esc(text.slice(last, i)) + '<mark>' + esc(m) + '</mark>'; last = i + m.length; return m; }); html = out + esc(text.slice(last)); }
  else html = esc(text);
  return html.replace(/\(\(([^()<>]{1,60})\)\)|\(([^()<>]{1,45})\)/g, (m) => `<span class="kw">${m}</span>`);
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 1900); }
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('نُسخ النص ✓'); }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('نُسخ النص ✓'); }
}
async function share(title, text) {
  if (navigator.share) { try { await navigator.share({ title, text, url: location.href }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  copy(text + '\n' + location.href);
}

/* ---------- data ---------- */
const chap = id => DB.chapters.find(c => c.id === id) || DB.chapters[0];
const items = p => p.sections.flatMap(s => s.items);
function plain(it) { return it.kind === 'v' ? (it.n ? it.n + ' - ' : '') + it.a + (it.b ? '   ***   ' + it.b : '') : it.t; }
function passageText(c, tid, withSrc) {
  const p = c.passages[tid], t = T[tid];
  let s = `【${t.sym}】 ${t.name} — ${t.book}\n`;
  if (p.status === 'absent' || p.status === 'unverified') return s + `(${p.note || ST_LABEL[p.status]})\n`;
  for (const sec of p.sections) { if (sec.title) s += `• ${sec.title}\n`; for (const it of sec.items) s += (it.kind === 'h' ? `— ${it.t} —` : plain(it)) + '\n'; }
  if (withSrc) s += 'المصدر: ' + p.sources.slice(0, 4).join(' ، ') + (p.sources.length > 4 ? ' …' : '') + '\n';
  return s;
}
function chapterText(c, tids, withSrc) {
  return `﴿ ${c.title} ﴾\n${c.sub}\n\n` + tids.map(t => passageText(c, t, withSrc)).join('\n') + '\n';
}

/* ---------- top bar & symbols ---------- */
function applyLook() {
  requestAnimationFrame(() => document.documentElement.style.setProperty('--hh', $('.top').offsetHeight + 'px'));
  document.documentElement.dataset.theme = S.theme;
  document.documentElement.dataset.font = S.font;
  document.documentElement.style.setProperty('--fs', S.size + 'px');
  document.body.classList.toggle('show-src', !!S.showSrc);
  document.querySelector('meta[name=theme-color]').content = S.theme === 'dark' ? '#0f1513' : '#1f4d43';
}
function renderSymbols() {
  const box = $('#symbols');
  box.innerHTML = ORDER.map(id => { const t = T[id]; return `<button class="sym ${S.on.includes(id) ? '' : 'off'}" data-t="${id}" style="--c:${`var(--c-${id})`}" title="${esc(t.book)}"><b>${t.sym}</b><span>${t.name}</span></button>`; }).join('');
  box.onclick = e => {
    const b = e.target.closest('.sym'); if (!b) return;
    const id = b.dataset.t;
    if (S.on.includes(id)) { if (S.on.length > 1) S.on = S.on.filter(x => x !== id); else toast('لابد من متن واحد على الأقل'); }
    else S.on = ORDER.filter(x => x === id || S.on.includes(x));
    save(); renderSymbols(); render();
  };
}

/* ---------- views ---------- */
function setView(v, push = true) {
  S.view = v; $$('#views button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  $('#symbols').style.display = (v === 'read' || v === 'review') ? '' : 'none';
  if (push) updateHash();
  render(); scrollTo({ top: 0 });
}
function updateHash() {
  const h = S.view === 'read' ? `#read/${S.ch}` : `#${S.view}`;
  if (location.hash !== h) history.replaceState(null, '', h);
}
function render() {
  const app = $('#app'); app.onclick = null;
  ({ read: renderRead, message: renderMessage, review: renderReview, coverage: renderCoverage, about: renderAbout }[S.view] || renderRead)(app);
}

function progressPct() {
  let total = 0, d = 0;
  for (const c of DB.chapters) for (const t of ORDER) { const p = c.passages[t]; if (p.status === 'verified' || p.status === 'partial') { total++; if (done.has(c.id + ':' + t)) d++; } }
  return { total, d, pct: total ? Math.round(100 * d / total) : 0 };
}

function renderRead(app) {
  const c = chap(S.ch);
  const pr = progressPct();
  app.className = 'layout-' + S.layout;
  app.innerHTML = `
  <div class="chapnav" id="chapnav">${DB.chapters.map(x => `<button data-ch="${x.id}" class="${x.id === c.id ? 'on' : ''}">${x.title.replace('باب ', '')}${ORDER.every(t => !['verified','partial'].includes(x.passages[t].status) || done.has(x.id + ':' + t)) ? '<i class="dot" title="تمت مراجعته"></i>' : ''}</button>`).join('')}</div>
  <div class="chaphead">
    <div><h2>${c.title}</h2><p class="sub">${esc(c.sub)}${c.extra ? ' · <b>باب أضفناه للتوسعة</b>' : ''}</p></div>
    <div class="actions">
      <button class="btn" data-act="layout">${S.layout === 'side' ? '☰ مكدّس' : '▥ جنبًا إلى جنب'}</button>
      <button class="btn" data-act="copy">${IC_COPY} نسخ الباب</button>
      <button class="btn" data-act="share">↗ مشاركة</button>
      <button class="btn" data-act="print">⎙ طباعة</button>
      <button class="btn primary" data-act="doneall">✓ أنهيت مراجعة الباب</button>
    </div>
  </div>
  <div class="progress" title="تقدّم المراجعة: ${pr.d}/${pr.total}"><i style="width:${pr.pct}%"></i></div>
  ${HL ? `<div class="note">تمييز الكلمة: <mark>${esc(HL)}</mark> <button class="btn ghost" data-act="clearhl">إلغاء التمييز</button></div>` : ''}
  <div class="grid" style="--n:${S.on.length}">${S.on.map(t => card(c, t)).join('')}</div>
  <div class="actions" style="justify-content:center;margin-top:14px">
    ${prevNext(c)}
  </div>`;
  $('#chapnav').onclick = e => { const b = e.target.closest('[data-ch]'); if (b) goChapter(b.dataset.ch); };
  app.onclick = e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act, tid = a.dataset.t;
    if (act === 'layout') { S.layout = S.layout === 'side' ? 'stack' : 'side'; save(); render(); }
    else if (act === 'copy') copy(chapterText(c, S.on, true));
    else if (act === 'share') share(c.title, chapterText(c, S.on, false));
    else if (act === 'print') printNow();
    else if (act === 'doneall') { S.on.forEach(t => done.add(c.id + ':' + t)); save(); toast('بارك الله فيك — سُجّلت مراجعة الباب'); render(); }
    else if (act === 'clearhl') { HL = ''; render(); }
    else if (act === 'bm') { const k = c.id + ':' + tid; bm.has(k) ? bm.delete(k) : bm.add(k); save(); render(); toast(bm.has(k) ? 'أُضيف إلى المحفوظات' : 'أُزيل من المحفوظات'); }
    else if (act === 'done') { const k = c.id + ':' + tid; done.has(k) ? done.delete(k) : done.add(k); save(); render(); }
    else if (act === 'copyone') copy(passageText(c, tid, true));
    else if (act === 'more') a.closest('.card').classList.toggle('collapsed') ;
    else if (act === 'go') goChapter(a.dataset.ch);
  };
}
function prevNext(c) {
  const i = DB.chapters.indexOf(c), p = DB.chapters[i - 1], n = DB.chapters[i + 1];
  return (n ? `<button class="btn" data-act="go" data-ch="${n.id}">→ ${n.title}</button>` : '') + (p ? `<button class="btn" data-act="go" data-ch="${p.id}">${p.title} ←</button>` : '');
}
function card(c, tid) {
  const t = T[tid], p = c.passages[tid], k = c.id + ':' + tid;
  let body = '';
  if (p.status === 'absent' || p.status === 'unverified') body = `<div class="empty">${esc(p.note || ST_LABEL[p.status])}</div>`;
  else for (const sec of p.sections) {
    if (sec.title) body += `<h4>${esc(sec.title)}</h4>`;
    for (const it of sec.items) {
      const src = `<a class="src inline" href="${it.src}" target="_blank" rel="noopener" title="فتح الصفحة في المصدر">↗</a>`;
      if (it.kind === 'h') body += `<h4 class="ed">${fmt(it.t)}</h4>`;
      else if (it.kind === 'v') {
        const chk = it.check ? `<span class="chk2 ${it.check === '2' ? 'two' : 'one'}" title="${it.check === '2' ? 'البيت مطابق لما في شرح ميارة (الشاملة)' : 'منقول من مصدر واحد؛ لم تتم مطابقته آليًا'}">${it.check === '2' ? 'مقابَل' : 'مصدر واحد'}</span>` : '';
        body += `<div class="verse"><span class="n">${it.n || ''}</span><span class="a">${fmt(it.a)}</span><span class="b">${fmt(it.b)}${chk}${src}${it.cross ? `<a class="src inline" href="${it.cross}" target="_blank" rel="noopener" title="موضعه في شرح ميارة">◈</a>` : ''}</span></div>`;
      } else body += `<p>${fmt(it.t)}${src}</p>`;
    }
  }
  const long = S.layout !== 'side' && items(p).reduce((a, i) => a + (i.t || i.a || '').length, 0) > 2200;
  return `<article class="card ${long && !HL ? 'collapsed' : ''}" id="card-${tid}" style="--c:var(--c-${tid})">
    <header><div class="badge">${t.sym}</div>
      <div><h3>${t.name}</h3><small>${esc(t.book)}</small><span class="status st-${p.status}">${ST_SHORT[p.status]} ${ST_LABEL[p.status]}</span></div>
      <div class="mini">
        <button data-act="bm" data-t="${tid}" class="${bm.has(k) ? 'on' : ''}" title="حفظ">★</button>
        <button data-act="done" data-t="${tid}" class="${done.has(k) ? 'on' : ''}" title="تمت المراجعة">✓</button>
        <button data-act="copyone" data-t="${tid}" title="نسخ نص هذا المتن">${IC_COPY}</button>
      </div></header>
    <div class="body">${p.note && p.status !== 'absent' && p.status !== 'unverified' ? `<div class="note">${esc(p.note)}</div>` : ''}${body}</div>
    ${long ? `<button class="more" data-act="more">إظهار / طيّ النص كاملًا</button>` : ''}
    <footer><b>الطبعة/المصدر:</b> ${esc(t.edition)}<br>${p.sources.length ? `<b>صفحات المصدر (${p.sources.length}):</b> ${p.sources.map((u, i) => `<a href="${u}" target="_blank" rel="noopener">${srcLabel(u, i)}</a>`).join(' · ')}` : ''}</footer>
  </article>`;
}
function srcLabel(u, i) {
  let m = u.match(/book\/(\d+)\/(\d+)/); if (m) return (m[1] === '14249' ? 'ميارة ص' : 'ص') + m[2];
  if (/ma7dhara/.test(u)) return 'درس ' + (i + 1);
  return 'رابط';
}
function goChapter(id, hl) { S.ch = id; if (hl !== undefined) HL = hl; S.view = 'read'; save(); setView('read'); }
function printNow() { const old = S.layout; S.layout = 'stack'; render(); $$('.card.collapsed').forEach(c => c.classList.remove('collapsed')); setTimeout(() => { print(); S.layout = old; render(); }, 150); }

/* ---------- message builder (فكرة أحمد: رسالة فقهية تجمع كلام كل متن) ---------- */
let MSG = LS.get('msg', { chs: ['tahara'], ts: null, src: true });
function parseCmd(q) {
  const n = norm(q); const chs = [], ts = [];
  for (const c of DB.chapters) { const key = norm(c.title.replace('باب ', '')).split(' ').pop(); if (n.includes(key) || n.includes(norm(c.title.replace('باب ', '')))) chs.push(c.id); }
  if (/\bالسهو\b|سهو/.test(n) && !chs.includes('sahw')) chs.push('sahw');
  for (const tok of q.split(/[\s،,]+/)) for (const id of ORDER) if (tok === T[id].sym || norm(tok) === norm(T[id].name)) ts.push(id);
  return { chs, ts };
}
function renderMessage(app) {
  app.className = '';
  const ts = MSG.ts || ORDER;
  app.innerHTML = `<section class="panel">
    <h2>الرسالة الفقهية</h2>
    <p>اختر الأبواب والمتون بالترتيب الذي تريده، فتتكوّن رسالة واحدة تجمع كلام كل متن في الباب — جاهزة للنسخ أو الإرسال.</p>
    <div class="cmd"><input id="cmd" placeholder="أمر سريع: مثلًا «الطهارة ي ع ش خ س» أو «الجمعة السهو خ س»"><button class="btn primary" id="runCmd">تنفيذ</button></div>
    <h3 style="font-family:var(--kufi);font-size:16px;margin:10px 0 0">الأبواب</h3>
    <div class="chips" id="mChs">${DB.chapters.map(c => `<button class="chip ${MSG.chs.includes(c.id) ? 'on' : ''}" data-c="${c.id}">${c.title}</button>`).join('')}</div>
    <h3 style="font-family:var(--kufi);font-size:16px;margin:10px 0 0">المتون (بترتيب الضغط)</h3>
    <div class="chips" id="mTs">${ORDER.map(id => `<button class="chip ${ts.includes(id) ? 'on' : ''}" data-t="${id}"><b style="font-family:Amiri">${T[id].sym}</b> ${T[id].name}${ts.includes(id) ? ` <small>(${ts.indexOf(id) + 1})</small>` : ''}</button>`).join('')}</div>
    <label class="row chk"><input type="checkbox" id="mSrc" ${MSG.src ? 'checked' : ''}> إرفاق روابط المصادر</label>
    <div class="actions" style="margin:10px 0"><button class="btn primary" id="mCopy">${IC_COPY} نسخ الرسالة</button><button class="btn" id="mShare">↗ مشاركة</button><a class="btn" id="mWa" target="_blank" rel="noopener">واتساب</a><button class="btn ghost" id="mOrder">الترتيب الأصلي (ي ع ش خ س)</button></div>
    <div class="out" id="mOut"></div>
  </section>`;
  const build = () => {
    const tsel = MSG.ts || ORDER;
    const txt = `بسم الله الرحمن الرحيم\nرسالة فقهية على مذهب الإمام مالك\nالرموز: ${ORDER.map(i => T[i].sym + ' = ' + T[i].name).join('، ')}\n\n` +
      DB.chapters.filter(c => MSG.chs.includes(c.id)).map(c => chapterText(c, tsel, MSG.src)).join('\n────────\n\n');
    $('#mOut').textContent = txt; LS.set('msg', MSG); return txt;
  };
  let txt = build();
  $('#mWa').href = 'https://wa.me/?text=' + encodeURIComponent(txt.slice(0, 6000));
  $('#mChs').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; const id = b.dataset.c; MSG.chs = MSG.chs.includes(id) ? MSG.chs.filter(x => x !== id) : DB.chapters.map(c => c.id).filter(x => x === id || MSG.chs.includes(x)); render(); };
  $('#mTs').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; const id = b.dataset.t; let cur = MSG.ts || [...ORDER]; cur = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]; if (!cur.length) return toast('اختر متنًا واحدًا على الأقل'); MSG.ts = cur; render(); };
  $('#mSrc').onchange = e => { MSG.src = e.target.checked; render(); };
  $('#mOrder').onclick = () => { MSG.ts = null; render(); };
  $('#mCopy').onclick = () => copy(build());
  $('#mShare').onclick = () => share('رسالة فقهية', build());
  const run = () => { const r = parseCmd($('#cmd').value); if (!r.chs.length && !r.ts.length) return toast('لم أفهم الأمر — اذكر اسم الباب والرموز'); if (r.chs.length) MSG.chs = r.chs; if (r.ts.length) MSG.ts = r.ts; render(); toast('تم ✓'); };
  $('#runCmd').onclick = run; $('#cmd').onkeydown = e => { if (e.key === 'Enter') run(); };
}

/* ---------- review: من القائل؟ + بطاقات ---------- */
let RV = { mode: 'who', ch: 'all', cur: null, revealed: false, stats: LS.get('quiz', { ok: 0, all: 0, streak: 0, best: 0 }) };
function pool() {
  const out = [];
  for (const c of DB.chapters) { if (RV.ch !== 'all' && c.id !== RV.ch) continue;
    for (const t of S.on) { const p = c.passages[t]; if (!['verified', 'partial'].includes(p.status)) continue;
      for (const it of items(p)) { if (it.kind === 'h') continue; const s = plain(it); if (s.length < 40) continue; out.push({ c, t, it }); } } }
  return out;
}
function nextQ() { const P = pool(); RV.cur = P.length ? P[Math.floor(Math.random() * P.length)] : null; RV.revealed = false; RV.picked = null; }
function snippet(it) { const s = it.kind === 'v' ? it.a + ' ... ' + it.b : it.t; return s.length > 420 ? s.slice(0, 420).replace(/\s\S*$/, '') + ' …' : s; }
function renderReview(app) {
  app.className = '';
  if (!RV.cur) nextQ();
  const q = RV.cur, st = RV.stats;
  const chOpts = `<option value="all">كل الأبواب</option>` + DB.chapters.map(c => `<option value="${c.id}" ${RV.ch === c.id ? 'selected' : ''}>${c.title}</option>`).join('');
  let inner = '';
  if (!q) inner = `<div class="empty">لا توجد نصوص في هذا الاختيار.</div>`;
  else if (RV.mode === 'who') {
    inner = `<p class="hint">اقرأ النص ثم اختر: من أيّ متن هو؟ (${esc(q.c.title)})</p>
      <div class="q">${fmt(snippet(q.it))}</div>
      <div class="answers">${S.on.map(t => `<button data-ans="${t}" style="--c:var(--c-${t})" class="${RV.picked ? (t === q.t ? 'ok' : (t === RV.picked ? 'no' : '')) : ''}"><b>${T[t].sym}</b>${T[t].name}</button>`).join('')}</div>
      ${RV.picked ? `<div class="note">${RV.picked === q.t ? 'أحسنت ✓' : 'الجواب الصحيح: ' + T[q.t].sym + ' — ' + T[q.t].name} · <a href="${q.it.src}" target="_blank" rel="noopener">المصدر</a></div><button class="btn primary" data-rv="next">التالي ←</button>` : ''}`;
  } else {
    inner = `<p class="hint">تذكّر ما قاله <b>${T[q.t].sym} ${T[q.t].name}</b> في <b>${esc(q.c.title)}</b>… ثم اكشف.</p>
      <div class="q">${RV.revealed ? fmt(snippet(q.it)) : '<span style="color:var(--muted)">• • •</span>'}</div>
      ${RV.revealed ? `<div class="actions"><button class="btn primary" data-rv="next">عرفتها ✓</button><button class="btn" data-rv="next">أحتاج مراجعة ↻</button><a class="btn ghost" href="${q.it.src}" target="_blank" rel="noopener">المصدر</a></div>` : `<button class="btn primary" data-rv="reveal">اكشف النص</button>`}`;
  }
  app.innerHTML = `<section class="panel flash">
    <h2>المراجعة</h2>
    <div class="chips"><button class="chip ${RV.mode === 'who' ? 'on' : ''}" data-mode="who">من القائل؟</button><button class="chip ${RV.mode === 'card' ? 'on' : ''}" data-mode="card">بطاقات التذكّر</button>
      <select id="rvCh" class="chip">${chOpts}</select></div>
    ${RV.mode === 'who' ? `<div class="score"><span>الصواب: ${st.ok}/${st.all}</span><span>المتتالية: ${st.streak}</span><span>الأفضل: ${st.best}</span></div>` : ''}
    ${inner}
  </section>`;
  app.onclick = e => {
    const m = e.target.closest('[data-mode]'); if (m) { RV.mode = m.dataset.mode; nextQ(); return render(); }
    const a = e.target.closest('[data-ans]');
    if (a && !RV.picked) { RV.picked = a.dataset.ans; st.all++; if (RV.picked === q.t) { st.ok++; st.streak++; st.best = Math.max(st.best, st.streak); } else st.streak = 0; LS.set('quiz', st); return render(); }
    const r = e.target.closest('[data-rv]'); if (r) { if (r.dataset.rv === 'reveal') RV.revealed = true; else nextQ(); render(); }
  };
  $('#rvCh').onchange = e => { RV.ch = e.target.value; nextQ(); render(); };
}

/* ---------- coverage ---------- */
function renderCoverage(app) {
  app.className = '';
  const rows = DB.chapters.map(c => `<tr><td>${c.title}</td>${ORDER.map(t => { const p = c.passages[t]; const n = items(p).filter(i => i.kind !== 'h').length;
    return `<td><span class="pill status st-${p.status}" title="${esc(p.note || ST_LABEL[p.status])}">${ST_SHORT[p.status]} ${p.status === 'verified' || p.status === 'partial' ? n : ''}</span><br><small>${p.sources.length ? p.sources.length + ' صفحة' : ''}</small></td>`; }).join('')}</tr>`).join('');
  app.innerHTML = `<section class="panel"><h2>جدول التوثيق</h2>
  <p>كل خانة: حالة النص في ذلك الباب، وعدد الفقرات/الأبيات المنقولة، وعدد صفحات المصدر المربوطة بها. اضغط على أي باب في «القراءة» لترى الروابط تحت كل متن.</p>
  <div class="covwrap"><table class="cov"><thead><tr><th>الباب</th>${ORDER.map(t => `<th><span style="font-family:Amiri;font-size:20px;color:var(--c-${t})">${T[t].sym}</span><br><small>${T[t].name}</small></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
  <ul>
    <li><span class="status st-verified">✓ موثّق من المصدر</span> النص منقول آليًا من صفحات الطبعة المذكورة كما هو، دون إعادة صياغة.</li>
    <li><span class="status st-partial">◐ منقول ومقابَل جزئيًا</span> (ابن عاشر): الأبيات منقولة من مصدر رقمي، وكل بيت عليه علامة «مقابَل» إذا طابق النظم في شرح ميارة على الشاملة، أو «مصدر واحد» إذا لم تتم مطابقته. قد لا يحوي الباب كل أبياته.</li>
    <li><span class="status st-absent">— لم يُفرد له المتن بابًا</span> المتن لم يعقد لهذا الموضوع بابًا (بحسب فهرسه).</li>
    <li><span class="status st-unverified">✗ لم يُتحقق من النص بعد</span> لم نجد النص في مصدر موثوق فلم نضعه.</li>
  </ul></section>`;
}

/* ---------- about ---------- */
function renderAbout(app) {
  app.className = '';
  app.innerHTML = `<section class="panel"><h2>عن الموقع</h2>
  <p>فكرة الموقع: أن ترى في الباب الواحد ما قاله كل متن من المتون المالكية المشهورة، جنبًا إلى جنب، بالرموز:
  ${ORDER.map(t => `<b style="font-family:Amiri;color:var(--c-${t})">${T[t].sym}</b> ${T[t].name}`).join('، ')}.</p>
  <p><b>المنهج:</b> لم يُكتب أي نص من الذاكرة. كل فقرة أو بيت منقول برمجيًا من صفحة مصدره، وتحت كل متن روابط الصفحات التي نُقل منها، ويمكن إظهار رابط عند كل فقرة من الإعدادات. ما لم نجده في مصدر موثوق نكتب عليه «لم يُتحقق من النص بعد» بدل أن نضع نصًا غير موثّق.</p>
  <h3 style="font-family:var(--kufi)">المتون والطبعات</h3>
  <ul>${ORDER.map(t => `<li><b style="font-family:Amiri;color:var(--c-${t})">${T[t].sym}</b> <b>${T[t].name}</b>: ${esc(T[t].book)} — ${esc(T[t].author)}<br><small>${esc(T[t].edition)}${T[t].note ? '<br>' + esc(T[t].note) : ''}</small> <a href="${T[t].home}" target="_blank" rel="noopener">صفحة الكتاب</a></li>`).join('')}</ul>
  <h3 style="font-family:var(--kufi)">طريقة الاستعمال</h3>
  <ul><li>اضغط رمز المتن في الأعلى لإخفائه أو إظهاره.</li><li>«الرسالة الفقهية»: تجمع الأبواب والمتون التي تختارها في رسالة واحدة للنسخ أو الإرسال، مع أمر سريع مثل «الطهارة ي ع ش خ س».</li>
  <li>«المراجعة»: اختبار «من القائل؟» وبطاقات التذكّر.</li><li>⌕ البحث في كل المتون دون اعتبار للتشكيل، ثم يُميَّز اللفظ داخل الباب.</li><li>★ للحفظ و ✓ لتسجيل المراجعة — تُحفظ في جهازك.</li><li>يعمل الموقع دون إنترنت بعد أول فتح، ويمكن إضافته للشاشة الرئيسية.</li></ul>
  <p class="hint">آخر بناء للبيانات: ${esc(DB.meta.generated)} · البيانات في ملف <code>data/fiqh.json</code> ويمكن إضافة أبواب ومتون جديدة إليه.</p>
  <h3 style="font-family:var(--kufi)">محفوظاتك</h3>
  <div>${[...bm].length ? [...bm].map(k => { const [c, t] = k.split(':'); const ch = chap(c); return `<button class="chip" data-go="${c}"><b style="font-family:Amiri">${T[t]?.sym || ''}</b> ${ch.title}</button>`; }).join(' ') : '<span class="hint">لا شيء بعد — اضغط ★ على أي متن.</span>'}</div>
  </section>`;
  app.onclick = e => { const b = e.target.closest('[data-go]'); if (b) goChapter(b.dataset.go); };
}

/* ---------- search ---------- */
let INDEX = [];
function buildIndex() {
  INDEX = [];
  for (const c of DB.chapters) for (const t of ORDER) for (const it of items(c.passages[t])) INDEX.push({ c, t, it, n: norm(plain(it)) });
}
function doSearch(q) {
  const box = $('#results'); const nq = norm(q);
  if (nq.length < 2) { box.innerHTML = ''; return; }
  const rx = makeRx(q); const hits = INDEX.filter(x => { rx.lastIndex = 0; return rx.test(plain(x.it)); }).slice(0, 80);
  box.innerHTML = `<p class="hint">${hits.length >= 80 ? 'أكثر من ٨٠ نتيجة — أول ٨٠:' : hits.length + ' نتيجة'}</p>` + hits.map((h, i) => {
    const s = plain(h.it); rx.lastIndex = 0; const m = rx.exec(s); const at = m ? m.index : 0;
    const start = Math.max(0, at - 70), piece = (start ? '… ' : '') + s.slice(start, at + 150) + (at + 150 < s.length ? ' …' : '');
    HL = q; const html = fmt(piece); HL = '';
    return `<button class="res" data-i="${i}" style="--c:var(--c-${h.t})"><span class="meta"><b>${T[h.t].sym}</b>${T[h.t].name} · ${h.c.title}</span>${html}</button>`;
  }).join('');
  box.onclick = e => { const b = e.target.closest('.res'); if (!b) return; const h = hits[+b.dataset.i]; closeSheets();
    if (!S.on.includes(h.t)) { S.on = ORDER.filter(x => x === h.t || S.on.includes(x)); renderSymbols(); }
    goChapter(h.c.id, q); setTimeout(() => { const el = $('#card-' + h.t); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'center' }); const mk = el.querySelector('mark'); if (mk) setTimeout(() => mk.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }), 350); } }, 60); };
}

/* ---------- sheets & settings ---------- */
function closeSheets() { $$('.sheet').forEach(s => s.hidden = true); }
function initUI() {
  $('#btnTheme').onclick = () => { S.theme = { light: 'sepia', sepia: 'dark', dark: 'light' }[S.theme]; save(); applyLook(); toast({ light: 'نهاري', sepia: 'ورقي', dark: 'ليلي' }[S.theme]); };
  $('#btnMenu').onclick = () => { $('#selLayout').value = S.layout; $('#selFont').value = S.font; $('#rngSize').value = S.size; $('#selTheme').value = S.theme; $('#chkSrc').checked = !!S.showSrc; $('#menuSheet').hidden = false; };
  $('#btnSearch').onclick = () => { $('#searchSheet').hidden = false; setTimeout(() => $('#q').focus(), 50); };
  $$('.sheet').forEach(s => s.addEventListener('click', e => { if (e.target === s || e.target.closest('[data-close]')) closeSheets(); }));
  $('#selLayout').onchange = e => { S.layout = e.target.value; save(); render(); };
  $('#selFont').onchange = e => { S.font = e.target.value; save(); applyLook(); };
  $('#rngSize').oninput = e => { S.size = +e.target.value; save(); applyLook(); };
  $('#selTheme').onchange = e => { S.theme = e.target.value; save(); applyLook(); };
  $('#chkSrc').onchange = e => { S.showSrc = e.target.checked; save(); applyLook(); };
  $('#btnPrint').onclick = () => { closeSheets(); if (S.view !== 'read') setView('read'); printNow(); };
  $('#btnReset').onclick = () => { if (confirm('مسح التقدّم والمحفوظات ونتائج الاختبار؟')) { bm.clear(); done.clear(); RV.stats = { ok: 0, all: 0, streak: 0, best: 0 }; LS.set('quiz', RV.stats); save(); render(); toast('تم المسح'); } };
  let tm; $('#q').oninput = e => { clearTimeout(tm); tm = setTimeout(() => doSearch(e.target.value), 160); };
  $('#views').onclick = e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); };
  addEventListener('keydown', e => { if (e.key === 'Escape') closeSheets(); if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); $('#btnSearch').click(); } });
  addEventListener('hashchange', route);
  // swipe between chapters on touch
  let sx = 0, sy = 0; addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', e => { if (S.view !== 'read' || S.layout === 'side') return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 90 && Math.abs(dy) < 40) { const i = DB.chapters.findIndex(c => c.id === S.ch); const n = DB.chapters[i + (dx > 0 ? 1 : -1)]; if (n) goChapter(n.id); } }, { passive: true });
}
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h) return setView(S.view === 'read' ? 'read' : 'read', false);
  const [v, ch] = h.split('/');
  if (v === 'read' && ch && DB.chapters.some(c => c.id === ch)) S.ch = ch;
  setView(['read', 'message', 'review', 'coverage', 'about'].includes(v) ? v : 'read', false);
}

/* ---------- boot ---------- */
fetch('data/fiqh.json').then(r => r.json()).then(d => {
  DB = d; ORDER = d.meta.order; d.texts.forEach(t => T[t.id] = t);
  if (!Array.isArray(S.on) || !S.on.length) S.on = [...ORDER];
  S.on = ORDER.filter(x => S.on.includes(x));
  applyLook(); renderSymbols(); initUI(); buildIndex(); route();
}).catch(err => { $('#app').innerHTML = `<div class="empty">تعذّر تحميل البيانات: ${esc(String(err))}</div>`; });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
