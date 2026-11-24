// Maliki Fiqh AI proxy — Cloudflare Worker (Workers AI binding; no API keys anywhere).
// Grounding: the worker itself loads the site's verified texts (data/fiqh.json) and retrieves
// passages server-side; the client only sends a question or passage ids, never raw context.
const DATA_URL = 'https://almarar88.github.io/maliki-fiqh/data/fiqh.json?v=3.2.2';
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const ORIGINS = ['https://almarar88.github.io', 'https://almarar707.gitlab.io', 'https://almarar707-group.gitlab.io', 'http://localhost:8765', 'http://127.0.0.1:8765'];
// GitLab Pages "unique domain" form: https://maliki-fiqh-<id>.gitlab.io
const GL_UNIQUE = /^https:\/\/(maliki-fiqh|malik)-[a-z0-9-]+\.gitlab\.io$/;
const allowed = o => ORIGINS.includes(o) || GL_UNIQUE.test(o);
const DISCLAIMER = 'هذا شرح آلي مساعد للمراجعة، وليس فتوى ولا بديلًا عن العلماء. للفتوى في الإمارات: المركز الرسمي للإفتاء 800 22 24.';
let DB = null, DBT = 0;

const HAR = /[\u064B-\u0652\u0670\u0640]/g;
function norm(t) {
  return (t || '').replace(HAR, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[ؤئ]/g, 'ء').replace(/[^\u0621-\u064A\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
const STOP = new Set('في من على الى عن او ثم ان اذا ما لا هل كم كيف متى اين هو هي ذلك هذا هذه التي الذي مع بعد قبل كان عند حكم ما هي ماهي اريد اعطني قال ابن'.split(' '));
function stem(w) {
  w = w.replace(/^(و|ف|ب|ك|ل)(?=ال)/, '').replace(/^ال/, '').replace(/^(و|ف)(?=..)/, '');
  if (w.length > 4) w = w.replace(/(ات|ان|ين|ون|ها|هم|ه)$/, '');
  return w;
}
function toks(t) { return norm(t).split(' ').filter(w => w.length > 1 && !STOP.has(w)).map(stem).filter(w => w.length > 1); }

async function load() {
  if (DB && Date.now() - DBT < 3600e3) return DB;
  const r = await fetch(DATA_URL, { cf: { cacheTtl: 3600 } });
  const d = await r.json();
  const T = Object.fromEntries(d.texts.map(t => [t.id, t]));
  const chunks = [];
  for (const c of d.chapters) for (const tid of d.meta.order) {
    const p = c.passages[tid]; if (!p || !p.sections) continue;
    p.sections.forEach((s, si) => s.items.forEach((it, ii) => {
      if (it.kind === 'h') return;
      const text = it.kind === 'v' ? (it.a + ' … ' + (it.b || '')) : it.t;
      // split long prose into windows
      const parts = text.length > 520 ? text.match(/[\s\S]{1,480}(?:[،.؛]|$)|[\s\S]{1,520}/g) : [text];
      parts.forEach((x, pi) => chunks.push({ id: `${c.id}|${tid}|${si}|${ii}|${pi}`, ch: c.id, chTitle: c.title, tid, sym: T[tid].sym, name: T[tid].name, src: it.src, text: x, toks: toks(x + ' ' + c.title) }));
    }));
  }
  const df = new Map();
  for (const k of chunks) for (const w of new Set(k.toks)) df.set(w, (df.get(w) || 0) + 1);
  DB = { d, T, chunks, df, N: chunks.length }; DBT = Date.now();
  return DB;
}
function retrieve(db, q, k = 10, onlyCh = null) {
  const qt = [...new Set(toks(q))];
  const scored = [];
  for (const c of db.chunks) {
    if (onlyCh && c.ch !== onlyCh) continue;
    let s = 0;
    for (const w of qt) {
      const idf = Math.log(1 + db.N / (1 + (db.df.get(w) || 0)));
      if (c.toks.includes(w)) s += idf; else if (w.length >= 3 && c.toks.some(x => x.startsWith(w) || w.startsWith(x) && x.length >= 3)) s += idf * 0.5;
    }
    if (s > 0) scored.push([s, c]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  const per = {}, out = [];
  for (const [s, c] of scored) { per[c.tid] = (per[c.tid] || 0) + 1; if (per[c.tid] > 3) continue; out.push({ ...c, score: s }); if (out.length >= k) break; }
  return { qt, out };
}
async function llm(env, system, user, max = 700) {
  const r = await env.AI.run(MODEL, { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: max, temperature: 0.2 });
  const v = r && (r.response ?? r.result?.response);
  return v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v);
}
const BASE_RULES = `أنت مساعد مراجعة لطلاب الفقه المالكي في موقع «المقارن الفقهي المالكي». قواعد صارمة:
- اعتمد فقط على النصوص المعطاة بين علامتي <نصوص>. لا تستعمل معلومات من خارجها، ولا تخترع نصًّا أو قولًا أو دليلًا.
- إذا نقلت لفظ المتن فانقله حرفيًّا بين «» مع رقم المقطع، وإلا فاشرح بعبارتك مع رقم المقطع مثل [٣].
- لا تُفتِ في نوازل شخصية؛ هذا عرض لما في المتون فقط.
- أجب بالعربية الفصحى الواضحة وباختصار.`;

function fmt(list) { return list.map((c, i) => `[${i + 1}] (${c.sym} ${c.name} — ${c.chTitle}): ${c.text}`).join('\n'); }
function srcs(list) { return list.map((c, i) => ({ n: i + 1, sym: c.sym, tid: c.tid, name: c.name, ch: c.ch, chTitle: c.chTitle, src: c.src, excerpt: c.text.slice(0, 220) })); }

function cors(origin) {
  const o = allowed(origin) ? origin : ORIGINS[0];
  return { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
}
function J(obj, status, origin) { return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(origin) } }); }

export default {
  async fetch(req, env, ctx) {
    const origin = req.headers.get('Origin') || '';
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });
    const url = new URL(req.url);
    if (url.pathname === '/health') return J({ ok: true, model: MODEL }, 200, origin);
    if (req.method !== 'POST') return J({ error: 'method' }, 405, origin);
    if (!allowed(origin)) return J({ error: 'origin not allowed' }, 403, origin);
    const ip = req.headers.get('CF-Connecting-IP') || 'x';
    const a = await env.RL_IP.limit({ key: ip }); const g = await env.RL_ALL.limit({ key: 'all' });
    if (!a.success || !g.success) return J({ error: 'rate', message: 'تجاوزت حدّ الطلبات المؤقت، حاول بعد دقيقة.' }, 429, origin);
    let body; try { body = await req.json(); } catch { return J({ error: 'json' }, 400, origin); }
    const mode = url.pathname.replace('/', '');
    const cacheKey = new Request('https://cache.local/v322/' + mode + '?' + encodeURIComponent(JSON.stringify(body).slice(0, 600)));
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) { const j = await hit.json(); return J({ ...j, cached: true }, 200, origin); }
    const db = await load();
    let res;
    try {
      if (mode === 'ask') {
        const q = String(body.q || '').slice(0, 300).trim();
        if (q.length < 3) return J({ error: 'q' }, 400, origin);
        const onlyCh = body.ch && db.d.chapters.some(c => c.id === body.ch) ? body.ch : null;
        let { out } = retrieve(db, q, 10, onlyCh);
        if (onlyCh && out.length < 6) {   // per-chapter mode: always ground in the chapter's own passages (first passages of each text)
          const per = {}; for (const c of db.chunks) { if (c.ch !== onlyCh || out.some(o => o.id === c.id)) continue; per[c.tid] = (per[c.tid] || 0) + 1; if (per[c.tid] > 2) continue; out.push({ ...c, score: 1.2 }); if (out.length >= 10) break; }
        }
        if (!out.length || (!onlyCh && out[0].score < 1.2)) { res = { covered: false, answer: 'لم أجد في نصوص المتون الخمسة المعروضة في الموقع ما يجيب عن هذا السؤال. اسأل أهل العلم.', sources: [], disclaimer: DISCLAIMER }; }
        else {
          const ans = await llm(env, BASE_RULES + `\n- إن لم تكف النصوص للإجابة فاكتب في أول سطر: «غير مغطّى» ثم بيّن ما وجدته فقط.\n- اذكر أيّ المتون (بالرمز: ي ع ش خ س) قال ماذا.`, `<نصوص>\n${fmt(out)}\n</نصوص>\nالسؤال: ${q}`);
          res = { covered: !/^\s*«?غير مغط/.test(ans), answer: ans, sources: srcs(out), disclaimer: DISCLAIMER };
        }
      } else if (mode === 'explain') {
        const c = db.d.chapters.find(x => x.id === body.ch); const p = c && c.passages[body.t];
        const it = p && p.sections[body.si] && p.sections[body.si].items[body.ii];
        if (!it) return J({ error: 'passage' }, 404, origin);
        const text = it.kind === 'v' ? it.a + ' … ' + (it.b || '') : it.t;
        const T = db.T[body.t];
        const ans = await llm(env, BASE_RULES + `\n- المطلوب: شرح مبسّط للنص المعطى فقط: معنى الكلمات الصعبة، ثم المعنى الإجمالي في نقاط قصيرة. لا تضف أحكامًا ليست في النص.`, `<نصوص>\n[1] (${T.sym} ${T.name} — ${c.title}): ${text.slice(0, 1400)}\n</نصوص>\nاشرح هذا النص شرحًا مبسّطًا لطالب مبتدئ.`, 600);
        res = { answer: ans, label: 'شرح آلي (ليس من المتن)', source: { sym: T.sym, name: T.name, src: it.src }, disclaimer: DISCLAIMER };
      } else if (mode === 'quiz') {
        const c = db.d.chapters.find(x => x.id === body.ch); if (!c) return J({ error: 'ch' }, 404, origin);
        const list = db.chunks.filter(k => k.ch === c.id);
        const pick = []; const per = {};
        for (const k of list) { per[k.tid] = (per[k.tid] || 0) + 1; if (per[k.tid] <= 3) pick.push(k); }
        const ans = await llm(env, BASE_RULES + `\n- المطلوب: أنشئ 4 أسئلة اختيار من متعدد من النصوص فقط. أخرج JSON فقط بلا أي كلام آخر، بالشكل: [{"q":"...","options":["...","...","...","..."],"answer":0,"ref":1}] حيث answer رقم الخيار الصحيح (من 0) وref رقم المقطع الذي يثبت الجواب.`, `<نصوص>\n${fmt(pick.slice(0, 14))}\n</نصوص>`, 900);
        const m = ans.match(/\[[\s\S]*\]/); let qs = [];
        try { qs = JSON.parse(m ? m[0] : '[]'); } catch { qs = []; }
        if (!Array.isArray(qs)) qs = Array.isArray(qs.questions) ? qs.questions : [];
        qs = qs.filter(x => x && x.q && Array.isArray(x.options) && x.options.length >= 2 && Number.isInteger(x.answer)).slice(0, 5)
          .filter(x => x.answer >= 0 && x.answer < x.options.length)
          .filter(x => !/[A-Za-z\u0400-\u04FF\u3040-\u9FFF]/.test(x.q + x.options.join(' ')))
          .map(x => { const r = srcs(pick)[(x.ref || 1) - 1] || null; return { q: String(x.q), options: x.options.map(String), answer: x.answer, tid: r ? r.tid : null, quote: r ? r.excerpt.slice(0, 180) : '', refSrc: r }; });
        res = { questions: qs, label: 'أسئلة مولّدة آليًا من نصوص الباب', disclaimer: DISCLAIMER };
      } else if (mode === 'compare') {
        const c = db.d.chapters.find(x => x.id === body.ch); if (!c) return J({ error: 'ch' }, 404, origin);
        const list = db.chunks.filter(k => k.ch === c.id);
        const pick = []; const per = {};
        for (const k of list) { per[k.tid] = (per[k.tid] || 0) + 1; if (per[k.tid] <= 4) pick.push(k); }
        const absent = db.d.meta.order.filter(t => c.passages[t].status === 'absent').map(t => db.T[t].sym + ' ' + db.T[t].name);
        const ans = await llm(env, BASE_RULES + `\n- المطلوب: ملخّص مقارن قصير لهذا الباب: (١) مواضع الاتفاق بين المتون، (٢) ما انفرد به كل متن أو اختلفت عبارته، (٣) ملاحظة للطالب. اذكر رموز المتون (ي ع ش خ س) وأرقام المقاطع. لا تحكم بالترجيح.`, `الباب: ${c.title}\nمتون ليس لها نص في هذا الباب: ${absent.join('، ') || 'لا يوجد'}\n<نصوص>\n${fmt(pick)}\n</نصوص>`, 900);
        res = { answer: ans, sources: srcs(pick), label: 'ملخّص مقارن آلي', disclaimer: DISCLAIMER };
      } else return J({ error: 'mode' }, 404, origin);
    } catch (e) { return J({ error: 'ai', message: 'الخدمة الذكية غير متاحة الآن.' }, 503, origin); }
    const resp = new Response(JSON.stringify(res), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=86400' } });
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return J(res, 200, origin);
  }
};
