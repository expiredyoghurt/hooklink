// Hook & Link API (v0.7). Scoring is server-side; roles, ranks and reasons are sent only after a check.
import B from './scenes.json';
import PLAN from './plan.json';
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json' } });
const RE = /\[(\w+)\|([^\]]+)\]/g, KINDS = ['object', 'action', 'feeling', 'words'];
const ids = st => { const a = []; st.text.replace(RE, (_, i) => a.push(i)); return a; };
const pub = st => { let n = 0; return st.text.replace(RE, (_, i, t) => `[t${++n}|${t}]`); };
const tid = (st, t) => ids(st)[parseInt(String(t).slice(1), 10) - 1];
const tk = (st, id) => 't' + (ids(st).indexOf(id) + 1);
const save = (DB, p, mode, story, stars) => DB.prepare('INSERT INTO hl_stars VALUES(?,?,?,?) ON CONFLICT(pupil_id,mode,story) DO UPDATE SET stars=MAX(stars,excluded.stars)').bind(p, mode, story, stars).run();
const log = (DB, p, mode, story, area, tap, r) => DB.prepare('INSERT INTO hl_log(pupil_id,mode,story,area,tap,r) VALUES(?,?,?,?,?,?)').bind(p, mode, story, area, tap, r).run();

// Built-in stories come from scenes.json. A row in hl_stories either adds a custom story, overrides a built-in one (data set), or hides one (active = 0).
export async function load(DB, all) {
  const rows = (await DB.prepare('SELECT id,data,active,author,author_name FROM hl_stories ORDER BY created,rowid').all()).results;
  const by = new Map(rows.map(r => [r.id, r])), out = [];
  const mk = (s, r, source) => ({ ...s, id: r ? r.id : s.id, source, active: !r || r.active !== 0, author: r ? r.author : '', author_name: r ? r.author_name : '' });
  for (const s of B.stories) { const r = by.get(s.id); by.delete(s.id); out.push(r && r.data ? mk({ ...JSON.parse(r.data) }, r, 'edited') : mk(s, r, 'builtin')); }
  for (const r of by.values()) if (r.data) out.push(mk(JSON.parse(r.data), r, 'custom'));
  return all ? out : out.filter(s => s.active);
}


// ---- Planning (v0.6): story mountain and 8-point arc. Shape = pupil's own choice, else class default, else school default, else mountain. ----
export async function shapeOf(DB, pid) {
  try {
    const me = await DB.prepare('SELECT shape FROM plan_pref WHERE pupil_id=?').bind(pid).first();
    if (me && PLAN.shapes[me.shape]) return { shape: me.shape, src: 'me' };
    const p = await DB.prepare('SELECT class FROM pupils WHERE id=?').bind(pid).first(), c = String((p && p.class) || '').trim().toUpperCase();
    for (const [k, src] of [[c, 'class'], ['*', 'school']]) {
      if (!k) continue;
      const r = await DB.prepare('SELECT shape FROM plan_default WHERE class=?').bind(k).first();
      if (r && PLAN.shapes[r.shape]) return { shape: r.shape, src };
    }
  } catch (e) { /* tables missing: run schema.sql */ }
  return { shape: 'mountain', src: 'built-in' };
}
const partAt = (sh, f) => { const c = PLAN.shapes[sh].cuts; let i = 0; while (i < c.length && f >= c[i]) i++; return i; };
const frac = (st, id) => { const m = st.text.match(new RegExp('\\[' + id + '\\|')); return m ? st.text.slice(0, m.index).replace(RE, '$2').length / st.text.replace(RE, '$2').length : null; };
// Where a story's hooks or links roughly sit on the pupil's shape, worked out from their place in the text.
const fit = (st, sh, kw, key) => {
  const S = PLAN.shapes[sh], RN = { 1: 'Ideal', 2: 'Good', 3: 'Workable' };
  return { name: S.name, icon: S.icon, items: [...st.areas].sort((a, b) => a.rank - b.rank).map(a => { const f = frac(st, a[key]); return f === null ? null : { what: `${RN[a.rank]} ${kw}`, n: partAt(sh, f) + 1, where: S.parts[partAt(sh, f)].n }; }).filter(Boolean) };
};
const rng = seed => { let h = 2166136261; for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const order = (n, seed) => { const r = rng(seed), a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } if (a.every((v, i) => v === i)) [a[0], a[1]] = [a[1], a[0]]; return a; };
async function plan(m, path, b, DB, pid) {
  const P = PLAN.practice, seg = path.split('/');
  if (m === 'GET' && path === '/api/hl/plan') return J({ ...(await shapeOf(DB, pid)), shapes: PLAN.shapes, stories: P.map(x => ({ id: x.id, title: x.title })) });
  if (m === 'POST' && path === '/api/hl/plan-shape') {
    if (!PLAN.shapes[b.shape]) return J({ error: 'Choose a shape' }, 400);
    await DB.prepare('INSERT INTO plan_pref(pupil_id,shape) VALUES(?,?) ON CONFLICT(pupil_id) DO UPDATE SET shape=excluded.shape').bind(pid, b.shape).run();
    return J({ shape: b.shape });
  }
  if (m === 'GET' && seg[3] === 'plan-story') {
    const ps = P.find(x => x.id === seg[4]); if (!ps || !PLAN.shapes[seg[5]]) return J({ error: 'No such story' }, 404);
    const round = Math.random().toString(36).slice(2, 10).padEnd(8, 'x'), ev = ps[seg[5]];
    return J({ round, title: ps.title, shape: seg[5], events: order(ev.length, round).map((i, k) => ({ k: k + 1, text: ev[i] })) });
  }
  if (m === 'POST' && path === '/api/hl/plan-check') {
    const ps = P.find(x => x.id === b.story), S = PLAN.shapes[b.shape], round = String(b.round || '');
    if (!ps || !S || !/^[a-z0-9]{8}$/.test(round)) return J({ error: 'No such story' }, 404);
    const n = ps[b.shape].length, o = order(n, round), A = b.answers || {};
    if (!o.every((_, k) => /^\d{1,2}$/.test(String(A[k + 1])) && A[k + 1] >= 1 && A[k + 1] <= n)) return J({ error: 'Choose a part for every event' }, 400);
    const res = o.map((i, k) => ({ k: k + 1, ok: +A[k + 1] === i + 1, part: i + 1, name: S.parts[i].n, why: S.parts[i].t }));
    return J({ got: res.filter(x => x.ok).length, n, res });
  }
  return J({ error: 'Not found' }, 404);
}

const NAMES = { ha: 'Hook A', hb: 'Hook B', hc: 'Hook C', la: 'Link A', lb: 'Link B', lc: 'Link C', x1: 'Decoy 1', x2: 'Decoy 2' };
const LAB = { memory: 'Memory', line: 'One-line memory', wh: 'Why it is a hook', wr: 'Why this rank', wl: 'Why it is a link' };
const WHOLE = { present: 'Present story', hook: 'Hook', flashback: 'Flashback', back: 'Link back' };
const wc = s => s.trim().split(/\s+/).filter(Boolean).length;
export function validate(r) {
  const e = []; r = r || {};
  const title = String(r.title || '').trim(); if (title.length < 3 || title.length > 40) e.push('The title needs 3 to 40 characters.');
  const text = String(r.text || '').replace(/\r/g, '').trim();
  if (text.length < 250 || text.length > 2400) e.push('The story needs 250 to 2400 characters (about 50 to 400 words).');
  const pos = {};
  text.replace(RE, (m0, id, t, off) => { if (pos[id] !== undefined) e.push(`${NAMES[id] || id} is marked twice.`); pos[id] = off; if (wc(t) > 16) e.push(`The phrase "${t.slice(0, 24)}..." is too long. Keep marked phrases to 16 words.`); });
  if (/[\[\]|]/.test(text.replace(RE, '$2'))) e.push('The story has a stray [ ] or | character.');
  for (const id of Object.keys(NAMES)) if (pos[id] === undefined) e.push(`Mark ${NAMES[id]} in the story.`);
  for (const id in pos) if (!NAMES[id]) e.push(`Unknown marker "${id}".`);
  const A = Array.isArray(r.areas) ? r.areas : [], areas = [], ranks = [];
  for (const l of ['a', 'b', 'c']) {
    const a = A.find(x => x && x.area === l) || {}, rank = +a.rank, kind = String(a.kind || ''), U = l.toUpperCase(), f = {};
    if (![1, 2, 3].includes(rank)) e.push(`Area ${U}: choose a rank.`); else ranks.push(rank);
    if (!KINDS.includes(kind)) e.push(`Area ${U}: choose the kind of link.`);
    for (const k of ['memory', 'line', 'wh', 'wr', 'wl']) { f[k] = String(a[k] || '').trim(); const max = k === 'line' ? 140 : 400; if (f[k].length < 8 || f[k].length > max) e.push(`Area ${U}: "${LAB[k]}" needs 8 to ${max} characters.`); }
    if (pos['h' + l] !== undefined && pos['l' + l] !== undefined && pos['h' + l] > pos['l' + l]) e.push(`Area ${U}: the hook must come before its link in the story.`);
    areas.push({ area: l, rank, hook: 'h' + l, link: 'l' + l, kind, ...f });
  }
  if (ranks.length === 3 && new Set(ranks).size !== 3) e.push('Use each rank once: 1 Ideal, 2 Good, 3 Workable.');
  const D = r.decoys || {}, decoys = {};
  for (const k of ['x1', 'x2']) { decoys[k] = String(D[k] || '').trim(); if (decoys[k].length < 8 || decoys[k].length > 200) e.push(`${NAMES[k]}: explain why it is not a hook (8 to 200 characters).`); }
  // Optional model story for the ideal area: present story, hook, flashback, link back. All four or none.
  const Wr = r.whole || {}, whole = {}, filled = Object.keys(WHOLE).filter(k => String(Wr[k] || '').trim());
  if (filled.length) for (const k of Object.keys(WHOLE)) { whole[k] = String(Wr[k] || '').trim(); if (whole[k].length < 20 || whole[k].length > 700) e.push(`Whole story: "${WHOLE[k]}" needs 20 to 700 characters (fill in all four parts, or leave all four empty).`); }
  const story = { title, text, areas, decoys }; if (filled.length) story.whole = whole;
  return { errors: e, story };
}

const txt = (st, id) => { const m = st.text.match(new RegExp('\\[' + id + '\\|([^\\]]+)\\]')); return m ? m[1] : ''; };
const shuf = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const BADGES = [
  ['first-hook', '🔍', 'First Hook', 'Finish Spot the Hook on any story.'],
  ['first-link', '🔗', 'First Link', 'Finish Make the Link on any story.'],
  ['triple-hook', '🎯', 'Triple Hook', 'Get 3 stars on a Spot the Hook story.'],
  ['perfect-link', '🧵', 'Perfect Link', 'Get 3 stars on a Make the Link story.'],
  ['ideal-eye', '🌟', 'Ideal Eye', 'Pick the ideal hook in 5 different stories.'],
  ['both-doors', '🚪', 'Both Doors', 'Play Spot the Hook and Make the Link on the same story.'],
  ['comeback', '💪', 'Comeback', 'Try a story again and win 3 stars.'],
  ['hook-master', '🏆', 'Hook Master', 'Get 3 stars on every Spot the Hook story.'],
  ['link-master', '🏅', 'Link Master', 'Get 3 stars on every Make the Link story.'],
  ['mixer', '🎲', 'Mix Master', 'Get 3 stars in a Mixed Round.']
];
export async function hl(m, path, b, DB, pid) {
  if (path.startsWith('/api/hl/plan')) return plan(m, path, b, DB, pid);
  const L = await load(DB), find = id => L.find(s => s.id === id);
  if (m === 'GET' && path === '/api/hl/stories') {
    const r = (await DB.prepare('SELECT mode,story,stars FROM hl_stars WHERE pupil_id=?').bind(pid).all()).results;
    return J({ stories: L.map(s => ({ id: s.id, title: s.title })), stars: r });
  }
  if (m === 'GET' && path.startsWith('/api/hl/story/')) {
    const st = find(path.split('/')[4]); if (!st) return J({ error: 'No such story' }, 404);
    const o = { id: st.id, title: st.title, text: pub(st) };
    // One line per memory, shuffled so the order does not give away which hook opens which memory.
    o.memories = shuf(st.areas.map(a => a.line || a.memory));
    if (path.endsWith('/link')) o.areas = st.areas.map(a => ({ area: a.area, hook: tk(st, a.hook), memory: a.memory }));
    return J(o);
  }
  if (m === 'GET' && path === '/api/hl/badges') {
    const st = (await DB.prepare('SELECT mode,story,stars FROM hl_stars WHERE pupil_id=?').bind(pid).all()).results;
    const fi = (await DB.prepare("SELECT story,COUNT(*) n,SUM(r='1') ideal FROM hl_log WHERE pupil_id=? AND mode='hook' AND area='first' GROUP BY story").bind(pid).all()).results;
    const lk = (await DB.prepare("SELECT story,COUNT(*) n FROM hl_log WHERE pupil_id=? AND mode='link' GROUP BY story").bind(pid).all()).results;
    const g = (mo, sid) => (st.find(x => x.mode === mo && x.story === sid) || { stars: 0 }).stars;
    const ideal = fi.filter(x => x.ideal > 0).length, hm = L.filter(s => g('hook', s.id) === 3).length, lm = L.filter(s => g('link', s.id) === 3).length;
    const ok = {
      'first-hook': st.some(x => x.mode === 'hook'), 'first-link': st.some(x => x.mode === 'link'),
      'triple-hook': st.some(x => x.mode === 'hook' && x.stars === 3), 'perfect-link': st.some(x => x.mode === 'link' && x.stars === 3),
      'ideal-eye': ideal >= 5, 'both-doors': L.some(s => g('hook', s.id) && g('link', s.id)),
      comeback: fi.some(x => x.n >= 2 && g('hook', x.story) === 3) || lk.some(x => x.n > 3 && g('link', x.story) === 3),
      'mixer': st.some(x => x.mode === 'mix' && x.stars === 3), 'hook-master': L.length > 0 && hm === L.length, 'link-master': L.length > 0 && lm === L.length
    };
    const prog = { 'ideal-eye': `${Math.min(ideal, 5)} of 5`, 'hook-master': `${hm} of ${L.length}`, 'link-master': `${lm} of ${L.length}` };
    return J({ badges: BADGES.map(([id, icon, name, desc]) => ({ id, icon, name, desc, earned: !!ok[id], prog: prog[id] || '' })) });
  }
  if (m === 'GET' && path === '/api/hl/mix') {
    const pick = shuf(L.filter(s => s.areas.length === 3)).slice(0, 6);
    if (pick.length < 2) return J({ error: 'Not enough stories for a Mixed Round yet' }, 400);
    const round = pick.length + Math.random().toString(36).slice(2, 9).padEnd(7, 'x');
    const cards = pick.map((st, i) => {
      if (i % 2 === 0) return { i, type: 'rank', story: st.id, title: st.title, opts: shuf(st.areas.map(a => ({ o: a.area, hook: txt(st, a.hook), memory: a.memory }))) };
      const a = st.areas[Math.floor(Math.random() * st.areas.length)];
      return { i, type: 'kind', story: st.id, title: st.title, area: a.area, memory: a.memory, hook: txt(st, a.hook), link: txt(st, a.link) };
    });
    return J({ round, cards });
  }
  if (m === 'POST' && path === '/api/hl/mix-check') {
    const st = find(b.story); if (!st || !/^[2-6][a-z0-9]{7}$/.test(String(b.round))) return J({ error: 'No such card' }, 404);
    let ok, why, extra = {};
    if (b.type === 'rank') {
      const ideal = st.areas.find(a => a.rank === 1); ok = b.choice === ideal.area; why = ideal.wr;
      extra.ranks = st.areas.map(a => ({ o: a.area, rank: a.rank, hook: txt(st, a.hook), why: a.wr })).sort((x, y) => x.rank - y.rank);
    } else if (b.type === 'kind') {
      const a = st.areas.find(x => x.area === b.area); if (!a) return J({ error: 'No such card' }, 404);
      ok = b.choice === a.kind; why = a.wl; extra.kind = a.kind;
    } else return J({ error: 'No such card' }, 400);
    await log(DB, pid, 'mix', st.id, b.type, b.round, ok ? 'ok' : 'no');
    return J({ ok, why, ...extra });
  }
  if (m === 'POST' && path === '/api/hl/mix-finish') {
    const round = String(b.round || ''); if (!/^[2-6][a-z0-9]{7}$/.test(round)) return J({ error: 'No such round' }, 404);
    const rows = (await DB.prepare("SELECT area,r FROM hl_log WHERE pupil_id=? AND mode='mix' AND tap=? AND id IN (SELECT MIN(id) FROM hl_log WHERE pupil_id=? AND mode='mix' AND tap=? GROUP BY story)").bind(pid, round, pid, round).all()).results;
    const n = parseInt(round[0], 10); if (rows.length < n) return J({ error: 'Answer all the cards first' }, 400);
    const got = rows.filter(r => r.r === 'ok').length, stars = got === n ? 3 : got >= Math.ceil(n * 2 / 3) ? 2 : 1;
    const by = t => ({ ok: rows.filter(r => r.area === t && r.r === 'ok').length, n: rows.filter(r => r.area === t).length });
    await save(DB, pid, 'mix', 'round', stars);
    return J({ stars, got, n, rank: by('rank'), kind: by('kind') });
  }
  if (m === 'POST' && path === '/api/hl/check-hook') {
    // v0.7: the pupil picks ONE hook, the one that opens the best memory. 3 stars = ideal, 2 = good, 1 = workable, 0 = not a hook (try again).
    const st = find(b.story); if (!st) return J({ error: 'No such story' }, 404);
    const tap = String(Array.isArray(b.taps) ? b.taps[0] : b.tap || ''), id = /^t\d{1,3}$/.test(tap) ? tid(st, tap) : undefined;
    if (!id) return J({ error: 'Tap one hook in the story first' }, 400);
    const a = st.areas.find(x => x.hook === id), best = st.areas.find(x => x.rank === 1), rank = a ? a.rank : 0;
    let r = 'no', why = st.decoys[id] || 'Nothing in the memories connects to this.';
    if (a) { r = 'hook'; why = a.wh; }
    else if (st.areas.some(x => x.link === id)) { r = 'link'; why = 'This is a link, not a hook. A link comes later, where the memory ties back to the story.'; }
    const stars = rank ? 4 - rank : 0;
    await log(DB, pid, 'hook', st.id, rank ? String(rank) : '-', tap, r);
    await log(DB, pid, 'hook', st.id, 'first', tap, rank ? String(rank) : 'x');
    if (stars) await save(DB, pid, 'hook', st.id, stars);
    const areas = st.areas.map(x => ({ t: tk(st, x.hook), rank: x.rank, hook: txt(st, x.hook), line: x.line || x.memory, why: x.wh, wr: x.wr })).sort((p, q) => p.rank - q.rank);
    const ideal = { t: tk(st, best.hook), hook: txt(st, best.hook), link: txt(st, best.link), line: best.line || best.memory, memory: best.memory, whole: st.whole || null };
    return J({ r, rank, why, wr: a ? a.wr : '', line: a ? (a.line || a.memory) : '', tap, stars, areas, ideal, fit: fit(st, (await shapeOf(DB, pid)).shape, 'hook', 'hook') });
  }
  if (m === 'POST' && path === '/api/hl/check-link') {
    const st = find(b.story), a = st && st.areas.find(x => x.area === b.area); if (!a) return J({ error: 'No such area' }, 404);
    const id = tid(st, b.tap), kind = KINDS.includes(b.kind) ? b.kind : '';
    let r = 'no', why = st.decoys[id] || 'This detail does not connect to the memory.';
    if (id === a.link) { r = kind === a.kind ? 'ok' : 'kind'; why = a.wl + (r === 'kind' ? ` What is the same here is the ${a.kind}.` : ''); }
    await log(DB, pid, 'link', st.id, a.area, String(b.tap).slice(0, 4), r);
    return J({ r, why, rank: a.rank, wr: a.wr, ans: tk(st, a.link), kind: a.kind });
  }
  if (m === 'POST' && path === '/api/hl/link-finish') {
    const st = find(b.story); if (!st) return J({ error: 'No such story' }, 404);
    const rows = (await DB.prepare("SELECT area,r FROM hl_log WHERE pupil_id=? AND mode='link' AND story=? AND id IN (SELECT MAX(id) FROM hl_log WHERE pupil_id=? AND mode='link' AND story=? GROUP BY area)").bind(pid, st.id, pid, st.id).all()).results;
    if (rows.length < 3) return J({ error: 'Finish all three links first' }, 400);
    const stars = rows.every(x => x.r === 'ok') ? 3 : rows.every(x => x.r !== 'no') ? 2 : 1;
    await save(DB, pid, 'link', st.id, stars);
    const sh = (await shapeOf(DB, pid)).shape;
    return J({ stars, fit: fit(st, sh, 'link', 'link'), areas: st.areas.map(a => ({ rank: a.rank, hook: st.text.match(new RegExp('\\[' + a.hook + '\\|([^\\]]+)\\]'))[1], wr: a.wr })).sort((a, b) => a.rank - b.rank) });
  }
  return J({ error: 'Not found' }, 404);
}

// ---- Teacher: story editor API (/api/admin/hl-story*) ----
export async function adminStories(m, path, b, DB, sa, su) {
  const who = su ? 'admin' : 't' + sa.pupil_id, L = await load(DB, true);
  const can = s => su || (s.source === 'custom' && s.author === who), find = id => L.find(s => s.id === String(id || ''));
  if (m === 'GET' && path === '/api/admin/hl-stories') return J({ stories: L.map(s => ({ ...s, canEdit: can(s), canHide: can(s) })) });
  if (m !== 'POST') return J({ error: 'Not found' }, 404);
  if (path === '/api/admin/hl-story-check') return J({ errors: validate(b.story).errors });
  if (path === '/api/admin/hl-story-save') {
    const v = validate(b.story); if (v.errors.length) return J({ error: v.errors[0], errors: v.errors }, 400);
    let id = String((b.story || {}).id || ''), cur = id ? find(id) : null;
    if (id && !cur) return J({ error: 'No such story' }, 404);
    if (cur && !can(cur)) return J({ error: 'You can only edit your own stories' }, 403);
    if (!cur) id = 'c' + crypto.randomUUID().slice(0, 8);
    const name = su ? 'Admin' : ((await DB.prepare('SELECT username FROM teachers WHERE id=?').bind(sa.pupil_id).first()) || {}).username || 'teacher';
    await DB.prepare('INSERT INTO hl_stories(id,data,active,author,author_name) VALUES(?,?,1,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').bind(id, JSON.stringify(v.story), who, name).run();
    return J({ ok: 1, id });
  }
  const cur = find(b.id); if (!cur) return J({ error: 'No such story' }, 404);
  if (path === '/api/admin/hl-story-active') {
    if (!can(cur)) return J({ error: 'You can only hide or show your own stories' }, 403);
    await DB.prepare("INSERT INTO hl_stories(id,data,active,author,author_name) VALUES(?,'',?,'','') ON CONFLICT(id) DO UPDATE SET active=excluded.active").bind(cur.id, b.active ? 1 : 0).run();
    return J({ ok: 1 });
  }
  if (path === '/api/admin/hl-story-delete') {
    if (!can(cur)) return J({ error: 'You can only delete your own stories' }, 403);
    if (cur.source === 'builtin') return J({ error: 'Built-in stories can be hidden, not deleted' }, 400);
    if (cur.source === 'edited') await DB.prepare("UPDATE hl_stories SET data='' WHERE id=?").bind(cur.id).run();
    else { await DB.prepare('DELETE FROM hl_stories WHERE id=?').bind(cur.id).run(); await DB.prepare('DELETE FROM hl_stars WHERE story=?').bind(cur.id).run(); await DB.prepare('DELETE FROM hl_log WHERE story=?').bind(cur.id).run(); }
    return J({ ok: 1 });
  }
  return J({ error: 'Not found' }, 404);
}

// ---- Teacher: results (v0.3). sc = {q,b}: WHERE fragment on alias p (pupils), already limited to the teacher's classes ----
const HINTS = {
  none: ['Not started yet', 'Ask them to try one story in each game.'],
  weak: ['Often picks a weak hook', 'Revisit why a personal object or a sense is a stronger hook than a place. Compare the memories: which one would help the character most with the problem in the story?'],
  mix: ['Mixes up hooks and links', 'Teach the order: a hook comes first and opens the memory; a link comes later and ties it back to the story.'],
  decoy: ['Taps scene details that are not triggers', 'Ask: does this detail remind the character of something that really happened to them?'],
  rankcard: ['Often misses the ideal hook in the Mixed Round', 'Put an Ideal and a Workable hook from one story side by side. Ask why a personal object or sense, noticed at the moment of choice, beats a place.'],
  kindcard: ['Often names the wrong kind of link in the Mixed Round', 'Practise the four kinds with one memory: what is repeated later, an object, an action, a feeling or words?'],
  kind: ['Finds the link but names the wrong kind', 'Practise the four kinds: same object, action, feeling, words.'],
  nolink: ['Struggles to find the link detail', 'Re-read the memory aloud, then hunt for the same object, action, feeling or words in the story.']
};
export async function results(DB, sc) {
  const get = async (q, ...a) => (await DB.prepare(q).bind(...a).all()).results;
  const L = await load(DB, true), act = L.filter(s => s.active);
  const pupils = await get(`SELECT p.id,p.username,p.class,p.created FROM pupils p WHERE ${sc.q} ORDER BY p.class,p.username`, ...sc.b);
  const stars = await get(`SELECT s.pupil_id,s.mode,s.story,s.stars FROM hl_stars s JOIN pupils p ON p.id=s.pupil_id WHERE ${sc.q}`, ...sc.b);
  const ev = await get(`SELECT l.pupil_id pid, SUM(l.mode='hook' AND l.r='no') hn, SUM(l.mode='hook' AND l.r='link') hk, SUM(l.mode='link' AND l.r='kind') lk, SUM(l.mode='link' AND l.r='no') ln, SUM(l.mode='hook' AND l.area='first' AND l.r='3') f3, SUM(l.mode='hook' AND l.area='first' AND l.r='1') f1, SUM(l.mode='mix' AND l.area='rank' AND l.r='ok') mro, SUM(l.mode='mix' AND l.area='rank') mrn, SUM(l.mode='mix' AND l.area='kind' AND l.r='ok') mko, SUM(l.mode='mix' AND l.area='kind') mkn, COUNT(*) tot, MAX(l.ts) last FROM hl_log l JOIN pupils p ON p.id=l.pupil_id WHERE ${sc.q} GROUP BY l.pupil_id`, ...sc.b);
  const logs = await get(`SELECT UPPER(TRIM(p.class)) cls,l.mode,l.story,l.tap,l.r,COUNT(*) n,COUNT(DISTINCT l.pupil_id) pupils FROM hl_log l JOIN pupils p ON p.id=l.pupil_id WHERE ${sc.q} AND l.r IN ('no','link','kind') GROUP BY cls,l.mode,l.story,l.tap,l.r ORDER BY n DESC LIMIT 400`, ...sc.b);
  const label = (sid, t) => { const st = L.find(s => s.id === sid); let n = 0, out = '?'; if (st) st.text.replace(RE, (_, i, x) => { if (++n === parseInt(String(t).slice(1), 10)) out = x; }); return out; };
  const hints = e => { if (!e) return ['none']; const h = []; if (e.f3 >= 2 && e.f3 > e.f1) h.push('weak'); if (e.hk >= 2) h.push('mix'); if (e.hn >= 3) h.push('decoy'); if (e.lk >= 2) h.push('kind'); if (e.ln >= 3) h.push('nolink'); if (e.mrn >= 4 && e.mro / e.mrn < 0.5) h.push('rankcard'); if (e.mkn >= 4 && e.mko / e.mkn < 0.5) h.push('kindcard'); return h.slice(0, 2); };
  const row = l => ({ cls: l.cls || '', mode: l.mode, story: l.story, text: label(l.story, l.tap), n: l.n, pupils: l.pupils, r: l.r });
  return {
    stories: act.map(s => ({ id: s.id, title: s.title })), hints: HINTS,
    pupils: pupils.map(p => { const e = ev.find(x => x.pid === p.id), mine = m => Object.fromEntries(stars.filter(x => x.pupil_id === p.id && x.mode === m).map(x => [x.story, x.stars])); return { username: p.username, class: p.class, created: p.created, last: e ? e.last : '', hook: mine('hook'), link: mine('link'), mix: mine('mix').round || 0, mr: e && e.mrn ? e.mro + '/' + e.mrn : '', mk: e && e.mkn ? e.mko + '/' + e.mkn : '', h: hints(e) }; }),
    mistakes: logs.filter(l => l.r !== 'kind').map(row), kinds: logs.filter(l => l.r === 'kind').map(row)
  };
}
