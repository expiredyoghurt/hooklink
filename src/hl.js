// Hook & Link API (v0.1). Scoring is server-side; roles, ranks and reasons are sent only after a check.
import S from './scenes.json';
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json' } });
const RE = /\[(\w+)\|([^\]]+)\]/g, KINDS = ['object', 'action', 'feeling', 'words'];
const ids = st => { const a = []; st.text.replace(RE, (_, i) => a.push(i)); return a; };
const pub = st => { let n = 0; return st.text.replace(RE, (_, i, t) => `[t${++n}|${t}]`); };
const tid = (st, t) => ids(st)[parseInt(String(t).slice(1), 10) - 1];
const tk = (st, id) => 't' + (ids(st).indexOf(id) + 1);
const save = (DB, p, mode, story, stars) => DB.prepare('INSERT INTO hl_stars VALUES(?,?,?,?) ON CONFLICT(pupil_id,mode,story) DO UPDATE SET stars=MAX(stars,excluded.stars)').bind(p, mode, story, stars).run();
const log = (DB, p, mode, story, area, tap, r) => DB.prepare('INSERT INTO hl_log(pupil_id,mode,story,area,tap,r) VALUES(?,?,?,?,?,?)').bind(p, mode, story, area, tap, r).run();
export async function hl(m, path, b, DB, pid) {
  const find = id => S.stories.find(s => s.id === id);
  if (m === 'GET' && path === '/api/hl/stories') {
    const r = (await DB.prepare('SELECT mode,story,stars FROM hl_stars WHERE pupil_id=?').bind(pid).all()).results;
    return J({ stories: S.stories.map(s => ({ id: s.id, title: s.title })), stars: r });
  }
  if (m === 'GET' && path.startsWith('/api/hl/story/')) {
    const st = find(path.split('/')[4]); if (!st) return J({ error: 'No such story' }, 404);
    const o = { id: st.id, title: st.title, text: pub(st) };
    if (path.endsWith('/link')) o.areas = st.areas.map(a => ({ area: a.area, hook: tk(st, a.hook), memory: a.memory }));
    return J(o);
  }
  if (m === 'POST' && path === '/api/hl/check-hook') {
    const st = find(b.story); if (!st) return J({ error: 'No such story' }, 404);
    const ix = ids(st), taps = [...new Set(Array.isArray(b.taps) ? b.taps.slice(0, 3) : [])];
    const res = taps.map((t, i) => {
      const id = tid(st, t), a = st.areas.find(x => x.hook === id);
      if (a) return { t, r: 'hook', rank: a.rank, mine: i + 1, why: a.wh, wr: a.wr };
      if (st.areas.some(x => x.link === id)) return { t, r: 'link', why: 'This is a link, not a hook. A link comes later, where the memory ties back to the story.' };
      return { t, r: 'no', why: st.decoys[id] || 'Nothing in the memories connects to this.' };
    });
    const found = res.filter(x => x.r === 'hook'), ideal = found.some(x => x.rank === 1), wrong = res.length - found.length;
    const stars = found.length === 3 && !wrong && res[0].rank === 1 ? 3 : ideal && found.length >= 2 && wrong <= 1 ? 2 : 1;
    for (const x of res) await log(DB, pid, 'hook', st.id, x.rank ? String(x.rank) : '-', x.t, x.r);
    await save(DB, pid, 'hook', st.id, stars);
    const areas = st.areas.map(a => ({ t: tk(st, a.hook), rank: a.rank, why: a.wh, wr: a.wr })).sort((a, b) => a.rank - b.rank);
    return J({ res, areas, stars });
  }
  if (m === 'POST' && path === '/api/hl/check-link') {
    const st = find(b.story), a = st && st.areas.find(x => x.area === b.area); if (!a) return J({ error: 'No such area' }, 404);
    const id = tid(st, b.tap), kind = KINDS.includes(b.kind) ? b.kind : '';
    let r = 'no', why = st.decoys[id] || 'This detail does not connect to the memory.';
    if (id === a.link) { r = kind === a.kind ? 'ok' : 'kind'; why = a.wl + (r === 'kind' ? ` It is a "same ${a.kind}" link.` : ''); }
    await log(DB, pid, 'link', st.id, a.area, String(b.tap).slice(0, 4), r);
    return J({ r, why, rank: a.rank, wr: a.wr, ans: tk(st, a.link), kind: a.kind });
  }
  if (m === 'POST' && path === '/api/hl/link-finish') {
    const st = find(b.story); if (!st) return J({ error: 'No such story' }, 404);
    const rows = (await DB.prepare("SELECT area,r FROM hl_log WHERE pupil_id=? AND mode='link' AND story=? AND id IN (SELECT MAX(id) FROM hl_log WHERE pupil_id=? AND mode='link' AND story=? GROUP BY area)").bind(pid, st.id, pid, st.id).all()).results;
    if (rows.length < 3) return J({ error: 'Finish all three links first' }, 400);
    const stars = rows.every(x => x.r === 'ok') ? 3 : rows.every(x => x.r !== 'no') ? 2 : 1;
    await save(DB, pid, 'link', st.id, stars);
    return J({ stars, areas: st.areas.map(a => ({ rank: a.rank, hook: st.text.match(new RegExp('\\[' + a.hook + '\\|([^\\]]+)\\]'))[1], wr: a.wr })).sort((a, b) => a.rank - b.rank) });
  }
  return J({ error: 'Not found' }, 404);
}
// Teacher results (v0.2). sc = {q,b}: a WHERE fragment on alias p (pupils) that is already limited to the teacher's classes.
export async function results(DB, sc) {
  const get = async (q, ...a) => (await DB.prepare(q).bind(...a).all()).results;
  const pupils = await get(`SELECT p.id,p.username,p.class FROM pupils p WHERE ${sc.q} ORDER BY p.class,p.username`, ...sc.b);
  const stars = await get(`SELECT s.pupil_id,s.mode,s.story,s.stars FROM hl_stars s JOIN pupils p ON p.id=s.pupil_id WHERE ${sc.q}`, ...sc.b);
  const logs = await get(`SELECT l.mode,l.story,l.tap,l.r,COUNT(*) n,COUNT(DISTINCT l.pupil_id) pupils FROM hl_log l JOIN pupils p ON p.id=l.pupil_id WHERE ${sc.q} AND l.r IN ('no','link','kind') GROUP BY l.mode,l.story,l.tap,l.r ORDER BY n DESC LIMIT 40`, ...sc.b);
  const label = (sid, t) => { const st = S.stories.find(s => s.id === sid); let n = 0, out = '?'; if (st) st.text.replace(RE, (_, i, x) => { if (++n === parseInt(String(t).slice(1), 10)) out = x; }); return out; };
  return {
    stories: S.stories.map(s => ({ id: s.id, title: s.title })),
    pupils: pupils.map(p => ({ username: p.username, class: p.class, hook: Object.fromEntries(stars.filter(x => x.pupil_id === p.id && x.mode === 'hook').map(x => [x.story, x.stars])), link: Object.fromEntries(stars.filter(x => x.pupil_id === p.id && x.mode === 'link').map(x => [x.story, x.stars])) })),
    mistakes: logs.filter(l => l.r !== 'kind').slice(0, 15).map(l => ({ mode: l.mode, story: l.story, text: label(l.story, l.tap), kind: l.r === 'link' ? 'a link tapped as a hook' : 'not a ' + l.mode, n: l.n, pupils: l.pupils })),
    kinds: logs.filter(l => l.r === 'kind').slice(0, 10).map(l => ({ story: l.story, text: label(l.story, l.tap), n: l.n, pupils: l.pupils }))
  };
}
