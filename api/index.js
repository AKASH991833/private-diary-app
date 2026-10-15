const crypto = require('crypto');
const { q } = require('./db');

const MAX_FAILS = 6, LOCK_MS = 15 * 60 * 1000;
const COOKIE_DAYS_OWNER = 14, COOKIE_DAYS_VIEWER = 30;
const MOODS = ['khush', 'udaas', 'shaant', 'gussa', 'pyaar', 'thakaan', 'umeed', 'yaad'];
const FONTS = ['kalam', 'caveat', 'yatra'];

const now = () => Date.now();
const rid = (n = 9) => crypto.randomBytes(n).toString('base64url');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const scrypt = (pw, salt) => crypto.scryptSync(String(pw), salt, 48).toString('hex');

async function secret() {
  const r = await q('SELECT v FROM diary_settings WHERE k = ?', ['session_secret']);
  if (r.length) return r[0].v;
  const s = crypto.randomBytes(32).toString('hex');
  try { await q('INSERT INTO diary_settings (k, v) VALUES (?, ?)', ['session_secret', s]); } catch (e) {}
  const r2 = await q('SELECT v FROM diary_settings WHERE k = ?', ['session_secret']);
  return r2[0].v;
}
async function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', await secret()).update(body).digest('base64url');
  return body + '.' + mac;
}
async function verify(tok) {
  if (!tok || typeof tok !== 'string' || !tok.includes('.')) return null;
  const [body, mac] = tok.split('.');
  const good = crypto.createHmac('sha256', await secret()).update(body).digest('base64url');
  if (!safeEq(mac, good)) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > now() ? p : null; } catch { return null; }
}
function cookies(req) {
  const o = {};
  (req.headers.cookie || '').split(';').forEach((c) => { const i = c.indexOf('='); if (i > 0) o[c.slice(0, i).trim()] = c.slice(i + 1).trim(); });
  return o;
}
function setCookie(res, name, val, days) {
  const c = `${name}=${val}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${days * 86400}${process.env.LOCAL_DB ? '' : '; Secure'}`;
  const prev = res.getHeader('Set-Cookie') || [];
  res.setHeader('Set-Cookie', [].concat(prev, c));
}
const clearCookie = (res, name) => setCookie(res, name, '', 0);
function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
const ip = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();

async function guard(key) {
  const r = await q('SELECT n, until_at FROM diary_attempts WHERE k = ?', [key]);
  if (r.length && Number(r[0].until_at) > now()) return Math.ceil((Number(r[0].until_at) - now()) / 60000);
  return 0;
}
async function fail(key) {
  const r = await q('SELECT n FROM diary_attempts WHERE k = ?', [key]);
  const n = (r.length ? Number(r[0].n) : 0) + 1;
  const until = n >= MAX_FAILS ? now() + LOCK_MS : 0;
  await q('DELETE FROM diary_attempts WHERE k = ?', [key]);
  await q('INSERT INTO diary_attempts (k, n, until_at) VALUES (?, ?, ?)', [key, n >= MAX_FAILS ? 0 : n, until]);
}
const okReset = (key) => q('DELETE FROM diary_attempts WHERE k = ?', [key]);

async function isOwner(req) {
  const p = await verify(cookies(req).od);
  return !!(p && p.role === 'owner');
}
const entryOut = (e) => ({ id: e.id, title: e.title, body: e.body, mood: e.mood, font: e.font, shared: !!Number(e.shared), at: Number(e.entry_at), updated: Number(e.updated_at) });
const linkOut = (l, origin) => ({ id: l.id, label: l.label, url: `${origin}/r/${l.token}`, revoked: !!Number(l.revoked), created: Number(l.created_at), lastOpened: Number(l.last_opened) });

function clean(s, n) { return String(s ?? '').slice(0, n); }

module.exports = async (req, res) => {
  try {
    // CSRF guard: state-changing requests must come from our own origin
    const method = req.method;
    const host = req.headers.host;
    if (method !== 'GET' && method !== 'HEAD') {
      const o = req.headers.origin;
      if (o && new URL(o).host !== host) return send(res, 403, { error: 'forbidden' });
    }
    const url = new URL(req.url, 'http://x');
    const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
    const parts = path.split('/');
    const body = (typeof req.body === 'object' && req.body) || {};
    const proto = process.env.LOCAL_DB ? 'http' : 'https';
    const origin = `${proto}://${host}`;

    // ---------- owner ----------
    if (parts[0] === 'owner') {
      if (parts[1] === 'login' && method === 'POST') {
        const key = 'owner:' + ip(req);
        const wait = await guard(key);
        if (wait) return send(res, 429, { error: `Bahut galat try. ${wait} min baad try karo.` });
        const expected = process.env.OWNER_PASSWORD || '';
        if (!expected || !safeEq(sha(String(body.password || '')), sha(expected))) { await fail(key); return send(res, 401, { error: 'Password galat hai.' }); }
        await okReset(key);
        setCookie(res, 'od', await sign({ role: 'owner', exp: now() + COOKIE_DAYS_OWNER * 86400000 }), COOKIE_DAYS_OWNER);
        return send(res, 200, { ok: true });
      }
      if (parts[1] === 'logout') { clearCookie(res, 'od'); return send(res, 200, { ok: true }); }
      if (parts[1] === 'me') return send(res, 200, { owner: await isOwner(req) });
      if (!(await isOwner(req))) return send(res, 401, { error: 'login karo' });

      if (parts[1] === 'entries') {
        if (method === 'GET' && !parts[2]) {
          const r = await q('SELECT * FROM diary_entries ORDER BY entry_at DESC');
          return send(res, 200, { entries: r.map(entryOut) });
        }
        if (method === 'POST' && !parts[2]) {
          const id = body.id && /^[\w-]{6,24}$/.test(body.id) ? body.id : rid();
          const rec = [clean(body.title, 200), clean(body.body, 200000), MOODS.includes(body.mood) ? body.mood : '', FONTS.includes(body.font) ? body.font : 'kalam', body.shared ? 1 : 0, Number(body.at) || now(), now()];
          const ex = await q('SELECT id FROM diary_entries WHERE id = ?', [id]);
          if (ex.length) await q('UPDATE diary_entries SET title=?, body=?, mood=?, font=?, shared=?, entry_at=?, updated_at=? WHERE id=?', [...rec, id]);
          else await q('INSERT INTO diary_entries (title, body, mood, font, shared, entry_at, updated_at, id) VALUES (?,?,?,?,?,?,?,?)', [...rec, id]);
          return send(res, 200, { ok: true, id });
        }
        if (method === 'DELETE' && parts[2]) { await q('DELETE FROM diary_entries WHERE id = ?', [parts[2]]); return send(res, 200, { ok: true }); }
      }
      if (parts[1] === 'links') {
        if (method === 'GET' && !parts[2]) {
          const r = await q('SELECT * FROM diary_links ORDER BY created_at DESC');
          return send(res, 200, { links: r.map((l) => linkOut(l, origin)) });
        }
        if (method === 'POST' && !parts[2]) {
          const pass = String(body.passcode || '');
          if (pass.length < 4 || pass.length > 32) return send(res, 400, { error: 'Passcode 4 se 32 akshar ka rakho.' });
          const salt = rid(12), id = rid();
          await q('INSERT INTO diary_links (id, label, token, salt, hash, ver, revoked, created_at, last_opened) VALUES (?,?,?,?,?,?,?,?,?)', [id, clean(body.label, 80) || 'Kisi ke liye', rid(24), salt, scrypt(pass, salt), 1, 0, now(), 0]);
          return send(res, 200, { ok: true, id });
        }
        if (parts[2] && parts[3] === 'passcode' && method === 'POST') {
          const pass = String(body.passcode || '');
          if (pass.length < 4 || pass.length > 32) return send(res, 400, { error: 'Passcode 4 se 32 akshar ka rakho.' });
          const salt = rid(12);
          await q('UPDATE diary_links SET salt=?, hash=?, ver=ver+1 WHERE id=?', [salt, scrypt(pass, salt), parts[2]]);
          return send(res, 200, { ok: true });
        }
        if (parts[2] && parts[3] === 'revoke' && method === 'POST') { await q('UPDATE diary_links SET revoked=?, ver=ver+1 WHERE id=?', [body.revoked === false ? 0 : 1, parts[2]]); return send(res, 200, { ok: true }); }
        if (parts[2] && parts[3] === 'regenerate' && method === 'POST') { await q('UPDATE diary_links SET token=?, ver=ver+1, revoked=0 WHERE id=?', [rid(24), parts[2]]); return send(res, 200, { ok: true }); }
        if (parts[2] && method === 'DELETE') { await q('DELETE FROM diary_links WHERE id=?', [parts[2]]); return send(res, 200, { ok: true }); }
      }
      return send(res, 404, { error: 'not found' });
    }

    // ---------- viewer ----------
    if (parts[0] === 'view' && parts[1]) {
      const token = parts[1];
      const gate = async () => {
        const r = await q('SELECT * FROM diary_links WHERE token = ?', [clean(token, 64)]);
        return r.length && !Number(r[0].revoked) ? r[0] : null;
      };
      const link = await gate();
      if (parts[2] === 'info') return send(res, 200, { ok: !!link }); // does not reveal anything else
      if (!link) return send(res, 404, { error: 'Ye link band ho chuka hai ya galat hai.' });
      const cname = 'v_' + link.id.slice(0, 8).replace(/[^\w]/g, 'x');
      if (parts[2] === 'unlock' && method === 'POST') {
        const key = 'view:' + link.id + ':' + ip(req);
        const wait = await guard(key);
        if (wait) return send(res, 429, { error: `Bahut galat try. ${wait} min baad try karo.` });
        if (!safeEq(scrypt(body.passcode || '', link.salt), link.hash)) { await fail(key); return send(res, 401, { error: 'Passcode galat hai.' }); }
        await okReset(key);
        await q('UPDATE diary_links SET last_opened=? WHERE id=?', [now(), link.id]);
        setCookie(res, cname, await sign({ role: 'viewer', l: link.id, v: Number(link.ver), exp: now() + COOKIE_DAYS_VIEWER * 86400000 }), COOKIE_DAYS_VIEWER);
        return send(res, 200, { ok: true });
      }
      const p = await verify(cookies(req)[cname]);
      if (!p || p.role !== 'viewer' || p.l !== link.id || p.v !== Number(link.ver)) return send(res, 401, { error: 'locked' });
      if (parts[2] === 'entries') {
        const r = await q('SELECT * FROM diary_entries WHERE shared = 1 ORDER BY entry_at ASC');
        return send(res, 200, { entries: r.map(entryOut).map(({ shared, ...e }) => e) });
      }
      return send(res, 404, { error: 'not found' });
    }
    return send(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'Kuch gadbad hui. Thodi der baad try karo.' });
  }
};
