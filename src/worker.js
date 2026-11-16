// Hook & Link v0.7 worker: pupil login, game API (hl.js), teacher dashboard API.
import { hl, results as hlResults, adminStories } from './hl.js';
import PLAN from './plan.json';
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json' } });
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const same = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const cl = (s, n) => String(s ?? '').trim().slice(0, n);
async function auth(req, env, role) {
  const t = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!t) return null;
  return env.DB.prepare("SELECT * FROM sessions WHERE token=? AND role=? AND created>datetime('now',?)").bind(t, role, role === 'admin' ? '-4 hours' : '-12 hours').first();
}
async function mk(env, role, pid) {
  await env.DB.prepare("DELETE FROM sessions WHERE created<datetime('now','-1 day')").run();
  const token = crypto.randomUUID() + crypto.randomUUID();
  await env.DB.prepare('INSERT INTO sessions(token,role,pupil_id) VALUES(?,?,?)').bind(token, role, pid).run();
  return token;
}
// Rate limiting: 5 bad logins per username, 40 per IP, 8 per IP for teacher login, in 10 minutes
async function blocked(env, k, max) { const r = await env.DB.prepare('SELECT * FROM fails WHERE k=?').bind(k).first(); return !!r && Date.now() - r.ts < 6e5 && r.n >= max; }
async function fail(env, k) { const r = await env.DB.prepare('SELECT * FROM fails WHERE k=?').bind(k).first(); const n = r && Date.now() - r.ts < 6e5 ? r.n + 1 : 1; await env.DB.prepare('INSERT OR REPLACE INTO fails(k,n,ts) VALUES(?,?,?)').bind(k, n, Date.now()).run(); }
const clear = (env, k) => env.DB.prepare('DELETE FROM fails WHERE k=?').bind(k).run();
const hx = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function pw(p, salt) { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(p), 'PBKDF2', false, ['deriveBits']); return hx(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, k, 256)); }
const staff = async (req, env) => { const t = (req.headers.get('authorization') || '').replace('Bearer ', ''); return t ? env.DB.prepare("SELECT * FROM sessions WHERE token=? AND role IN ('admin','teacher') AND created>datetime('now','-4 hours')").bind(t).first() : null; };
export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname, m = req.method, ip = req.headers.get('cf-connecting-ip') || 'x';
    if (!path.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(req) : new Response('Not found', { status: 404 });
    const b = m === 'POST' ? await req.json().catch(() => ({})) : {};
    const DB = env.DB;
    try {
      if (m === 'POST' && path === '/api/register') {
        const u = cl(b.username, 20).toLowerCase(), pin = cl(b.pin, 8);
        if (!/^[a-z0-9_.-]{3,20}$/.test(u)) return J({ error: 'Username: 3-20 letters or numbers' }, 400);
        if (!/^\d{4,8}$/.test(pin)) return J({ error: 'PIN must be 4-8 digits' }, 400);
        if (await DB.prepare('SELECT 1 FROM pupils WHERE username=?').bind(u).first()) return J({ error: 'That name is taken' }, 409);
        const r = await DB.prepare('INSERT INTO pupils(username,class,pin_hash) VALUES(?,?,?)').bind(u, cl(b.class, 20), await sha(u + ':' + pin)).run();
        return J({ token: await mk(env, 'pupil', r.meta.last_row_id), username: u });
      }
      if (m === 'POST' && path === '/api/login') {
        const u = cl(b.username, 20).toLowerCase();
        if (await blocked(env, 'u:' + u, 5) || await blocked(env, 'i:' + ip, 40)) return J({ error: 'Too many tries. Wait 10 minutes.' }, 429);
        const p = await DB.prepare('SELECT * FROM pupils WHERE username=?').bind(u).first();
        if (!p || !same(p.pin_hash, await sha(u + ':' + cl(b.pin, 8)))) { await fail(env, 'u:' + u); await fail(env, 'i:' + ip); return J({ error: 'Wrong name or PIN' }, 401); }
        await clear(env, 'u:' + u);
        return J({ token: await mk(env, 'pupil', p.id), username: u });
      }
      if (m === 'POST' && path === '/api/admin/login') {
        const un = cl(b.user, 30).toLowerCase();
        if (await blocked(env, 'a:' + ip, 20) || await blocked(env, 'ua:' + un, 5)) return J({ error: 'Too many tries. Wait 10 minutes.' }, 429);
        const au = env.admin_user || 'admin123', ap = env.admin_password || 'password123';
        if (same(await sha(cl(b.user, 100)), await sha(au)) && same(await sha(cl(b.password, 100)), await sha(ap))) {
          await clear(env, 'ua:' + un); return J({ token: await mk(env, 'admin', null), role: 'admin', name: cl(b.user, 100) });
        }
        const t = await DB.prepare('SELECT * FROM teachers WHERE username=?').bind(un).first();
        if (t && same(t.hash, await pw(cl(b.password, 100), t.salt))) { await clear(env, 'ua:' + un); return J({ token: await mk(env, 'teacher', t.id), role: 'teacher', name: t.username }); }
        await fail(env, 'a:' + ip); await fail(env, 'ua:' + un);
        return J({ error: 'Wrong teacher login' }, 401);
      }
      /* ---------- pupil ---------- */
      /* ---------- pupil ---------- */
      if (!path.startsWith('/api/admin/')) {
        const s = await auth(req, env, 'pupil');
        if (!s) return J({ error: 'Please log in' }, 401);
        return hl(m, path, b, DB, s.pupil_id);
      }
      /* ---------- teacher ---------- */
      const sa = await staff(req, env);
      if (!sa) return J({ error: 'Teacher login required' }, 401);
      const su = sa.role === 'admin';
      // Teachers only see the classes the super admin assigned to them (none by default)
      let cls = null;
      if (!su) cls = (await DB.prepare('SELECT class FROM teacher_classes WHERE teacher_id=?').bind(sa.pupil_id).all()).results.map(x => x.class);
      const sc = al => cls === null ? { q: '1', b: [] } : cls.length ? { q: `UPPER(TRIM(${al}.class)) IN (${cls.map(() => '?').join(',')})`, b: cls } : { q: '0', b: [] };
      const okC = c => cls === null || cls.includes(String(c || '').trim().toUpperCase());
      const pupilOf = async u => { const p = await DB.prepare('SELECT id,username,class,created FROM pupils WHERE username=?').bind(cl(u, 20).toLowerCase()).first(); return p && okC(p.class) ? p : null; };
      if (m === 'GET' && path === '/api/admin/hl-results') return J(await hlResults(DB, sc('p')));
      if (m === 'GET' && path === '/api/admin/plan-defaults') {
        const def = (await DB.prepare('SELECT class,shape FROM plan_default').all()).results, mp = new Map(def.map(r => [r.class, r.shape]));
        const seen = su ? (await DB.prepare("SELECT DISTINCT UPPER(TRIM(class)) c FROM pupils WHERE TRIM(class)<>''").all()).results.map(r => r.c).concat(def.map(r => r.class).filter(c => c !== '*')) : cls;
        return J({ school: mp.get('*') || '', canSchool: su, classes: [...new Set(seen)].sort().map(c => ({ class: c, shape: mp.get(c) || '' })), shapes: PLAN.shapes });
      }
      if (m === 'POST' && path === '/api/admin/plan-default') {
        const c = cl(b.class, 20).toUpperCase(), s = cl(b.shape, 10);
        if (!c) return J({ error: 'Choose a class' }, 400);
        if (s && !PLAN.shapes[s]) return J({ error: 'Choose the story mountain or the 8-point arc' }, 400);
        if (c === '*' ? !su : !okC(c)) return J({ error: c === '*' ? 'Super admin only' : 'No such class in your classes' }, 403);
        if (s) await DB.prepare('INSERT INTO plan_default(class,shape) VALUES(?,?) ON CONFLICT(class) DO UPDATE SET shape=excluded.shape').bind(c, s).run();
        else await DB.prepare('DELETE FROM plan_default WHERE class=?').bind(c).run();
        return J({ ok: 1 });
      }
      if (path.startsWith('/api/admin/hl-stor')) return adminStories(m, path, b, DB, sa, su);
      if (m === 'POST' && path === '/api/admin/reset-pin') {
        const p = await pupilOf(b.username), pin = cl(b.pin, 8);
        if (!p) return J({ error: 'No such pupil in your classes' }, 404);
        if (!/^\d{4,8}$/.test(pin)) return J({ error: 'PIN must be 4-8 digits' }, 400);
        await DB.prepare('UPDATE pupils SET pin_hash=? WHERE id=?').bind(await sha(p.username + ':' + pin), p.id).run();
        return J({ ok: 1 });
      }
      if (m === 'POST' && path === '/api/admin/delete-pupil') {
        const p = await pupilOf(b.username); if (!p) return J({ error: 'No such pupil in your classes' }, 404);
        for (const t of ['hl_log', 'hl_stars', 'sessions']) await DB.prepare(`DELETE FROM ${t} WHERE ${t === 'sessions' ? "role='pupil' AND " : ''}${t === 'sessions' ? 'pupil_id' : 'pupil_id'}=?`).bind(p.id).run();
        await DB.prepare('DELETE FROM plan_pref WHERE pupil_id=?').bind(p.id).run();
        await DB.prepare('DELETE FROM pupils WHERE id=?').bind(p.id).run();
        return J({ ok: 1 });
      }
      if (m === 'GET' && path === '/api/admin/teachers') { if (!su) return J({ error: 'Super admin only' }, 403); return J({ teachers: (await DB.prepare('SELECT t.username,t.created,GROUP_CONCAT(c.class) classes FROM teachers t LEFT JOIN teacher_classes c ON c.teacher_id=t.id GROUP BY t.id ORDER BY t.username').all()).results.map(t => ({ ...t, classes: t.classes ? t.classes.split(',') : [] })) }); }
      if (m === 'POST' && path === '/api/admin/teacher-classes') {
        if (!su) return J({ error: 'Super admin only' }, 403);
        const t = await DB.prepare('SELECT id FROM teachers WHERE username=?').bind(cl(b.username, 30).toLowerCase()).first(); if (!t) return J({ error: 'No such teacher' }, 404);
        const list = [...new Set((Array.isArray(b.classes) ? b.classes : []).map(x => cl(x, 20).replace(/,/g, '').toUpperCase()).filter(Boolean))].slice(0, 30);
        await DB.prepare('DELETE FROM teacher_classes WHERE teacher_id=?').bind(t.id).run();
        for (const c of list) await DB.prepare('INSERT INTO teacher_classes(teacher_id,class) VALUES(?,?)').bind(t.id, c).run();
        return J({ ok: 1, classes: list });
      }
      if (m === 'POST' && path === '/api/admin/teacher-create') {
        if (!su) return J({ error: 'Super admin only' }, 403);
        const u = cl(b.username, 30).toLowerCase(), p = cl(b.password, 100);
        if (!/^[a-z0-9_.-]{3,30}$/.test(u) || u === String(env.admin_user || 'admin123').toLowerCase()) return J({ error: 'Username: 3-30 letters or numbers (not the super admin name)' }, 400);
        if (p.length < 8) return J({ error: 'Password needs at least 8 characters' }, 400);
        if (await DB.prepare('SELECT 1 FROM teachers WHERE username=?').bind(u).first()) return J({ error: 'That teacher already exists' }, 409);
        const salt = hx(crypto.getRandomValues(new Uint8Array(16)));
        await DB.prepare('INSERT INTO teachers(username,salt,hash) VALUES(?,?,?)').bind(u, salt, await pw(p, salt)).run();
        return J({ ok: 1 });
      }
      if (m === 'POST' && path === '/api/admin/teacher-reset') {
        if (!su) return J({ error: 'Super admin only' }, 403);
        const u = cl(b.username, 30).toLowerCase(), p = cl(b.password, 100);
        if (p.length < 8) return J({ error: 'Password needs at least 8 characters' }, 400);
        const t = await DB.prepare('SELECT id FROM teachers WHERE username=?').bind(u).first(); if (!t) return J({ error: 'No such teacher' }, 404);
        const salt = hx(crypto.getRandomValues(new Uint8Array(16)));
        await DB.prepare('UPDATE teachers SET salt=?,hash=? WHERE id=?').bind(salt, await pw(p, salt), t.id).run();
        await DB.prepare("DELETE FROM sessions WHERE role='teacher' AND pupil_id=?").bind(t.id).run();
        return J({ ok: 1 });
      }
      if (m === 'POST' && path === '/api/admin/teacher-delete') {
        if (!su) return J({ error: 'Super admin only' }, 403);
        const t = await DB.prepare('SELECT id FROM teachers WHERE username=?').bind(cl(b.username, 30).toLowerCase()).first(); if (!t) return J({ error: 'No such teacher' }, 404);
        await DB.prepare("DELETE FROM sessions WHERE role='teacher' AND pupil_id=?").bind(t.id).run();
        await DB.prepare('DELETE FROM teacher_classes WHERE teacher_id=?').bind(t.id).run();
        await DB.prepare('DELETE FROM teachers WHERE id=?').bind(t.id).run();
        return J({ ok: 1 });
      }
      if (m === 'POST' && path === '/api/admin/change-password') {
        if (su) return J({ error: 'The super admin password is a Cloudflare secret' }, 400);
        const t = await DB.prepare('SELECT * FROM teachers WHERE id=?').bind(sa.pupil_id).first(), p = cl(b.password, 100);
        if (!t || !same(t.hash, await pw(cl(b.old, 100), t.salt))) return J({ error: 'Current password is wrong' }, 401);
        if (p.length < 8) return J({ error: 'Password needs at least 8 characters' }, 400);
        const salt = hx(crypto.getRandomValues(new Uint8Array(16)));
        await DB.prepare('UPDATE teachers SET salt=?,hash=? WHERE id=?').bind(salt, await pw(p, salt), t.id).run();
        return J({ ok: 1 });
      }
      return J({ error: 'Not found' }, 404);
    } catch (e) { return J({ error: 'Server error' }, 500); }
  }
};
