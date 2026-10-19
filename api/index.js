const crypto = require('crypto');
const { q } = require('./db');

const MAX_FAILS = 5, LOCK_MS = 15 * 60 * 1000;
const PIN_RE = /^(\d{4}|\d{8})$/;
const RESET_HASH = process.env.RESET_HASH || '0657c6e4f060862222274b2392d95968aa7a724792bc90d93093c0d5577318db'; // sha256 of the one-time reset key (key itself never stored)
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
// Owner login: session cookie, no Max-Age - ends when the tab/app is closed.
function setSessionCookie(res, name, val) {
  const c = `${name}=${val}; Path=/; HttpOnly; SameSite=Strict${process.env.LOCAL_DB ? '' : '; Secure'}`;
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
async function fail(key, maxFails = MAX_FAILS, lockMs = LOCK_MS) {
  const r = await q('SELECT n FROM diary_attempts WHERE k = ?', [key]);
  const n = (r.length ? Number(r[0].n) : 0) + 1;
  const until = n >= maxFails ? now() + lockMs : 0;
  await q('DELETE FROM diary_attempts WHERE k = ?', [key]);
  await q('INSERT INTO diary_attempts (k, n, until_at) VALUES (?, ?, ?)', [key, n >= maxFails ? 0 : n, until]);
}
const okReset = (key) => q('DELETE FROM diary_attempts WHERE k = ?', [key]);

async function isOwner(req) {
  const p = await verify(cookies(req).od);
  return !!(p && p.role === 'owner');
}
const entryOut = (e) => ({ id: e.id, title: e.title, body: e.body, mood: e.mood, font: e.font, shared: !!Number(e.shared), at: Number(e.entry_at), updated: Number(e.updated_at) });
const linkOut = (l, origin) => ({ id: l.id, label: l.label, url: `${origin}/r/${l.token}`, revoked: !!Number(l.revoked), created: Number(l.created_at), lastOpened: Number(l.last_opened) });

async function getSet(k) { const r = await q('SELECT v FROM diary_settings WHERE k = ?', [k]); return r.length ? r[0].v : null; }
async function setSet(k, v) { await q('DELETE FROM diary_settings WHERE k = ?', [k]); await q('INSERT INTO diary_settings (k, v) VALUES (?, ?)', [k, String(v)]); }
async function checkOwnerPassword(pw) {
  const salt = await getSet('pw_salt'), hash = await getSet('pw_hash');
  if (salt && hash) return safeEq(scrypt(pw, salt), hash);
  const expected = process.env.OWNER_PASSWORD || '';
  return !!expected && safeEq(sha(pw), sha(expected));
}
const MIMES = { 'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/gif': 'image', 'video/mp4': 'video', 'video/webm': 'video', 'audio/mpeg': 'audio', 'audio/mp4': 'audio', 'audio/aac': 'audio', 'audio/ogg': 'audio', 'audio/wav': 'audio', 'audio/webm': 'audio', 'audio/x-m4a': 'audio' };
const MAX_MEDIA = 14 * 1024 * 1024;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const PAPERS = ['lined', 'dots', 'grid', 'plain'];
const parseTags = (t) => { try { const a = JSON.parse(t || '[]'); return Array.isArray(a) ? a.filter((x) => typeof x === 'string').slice(0, 12) : []; } catch { return []; } };
const pageOut = (p) => { let items = []; try { items = JSON.parse(p.items); } catch {} return { id: p.id, day: p.day, title: p.title, paper: p.paper, h: Number(p.h), items, shared: !!Number(p.shared), mood: p.mood || '', tags: parseTags(p.tags), updated: Number(p.updated_at) }; };
function mediaIds(items) { const o = []; for (const it of items || []) { for (const k of ['mid', 'cover']) if (it && typeof it[k] === 'string') o.push(it[k]); } return o; }
async function serveMedia(req, res, id, allowed) {
  const m = await q('SELECT * FROM diary_media WHERE id = ?', [clean(id, 24)]);
  if (!m.length || !allowed(m[0])) { res.statusCode = 404; return res.end('not found'); }
  const rows = await q('SELECT data FROM diary_chunks WHERE media_id = ? ORDER BY n', [m[0].id]);
  const buf = Buffer.concat(rows.map((r) => Buffer.from(r.data)));
  const total = buf.length;
  res.setHeader('Content-Type', m[0].mime);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const rg = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (rg && (rg[1] || rg[2])) {
    let a = rg[1] ? Number(rg[1]) : Math.max(0, total - Number(rg[2])), b = rg[1] && rg[2] ? Number(rg[2]) : total - 1;
    b = Math.min(b, total - 1);
    if (a > b) { res.statusCode = 416; res.setHeader('Content-Range', `bytes */${total}`); return res.end(); }
    res.statusCode = 206; res.setHeader('Content-Range', `bytes ${a}-${b}/${total}`); res.setHeader('Content-Length', b - a + 1);
    return res.end(buf.subarray(a, b + 1));
  }
  res.statusCode = 200; res.setHeader('Content-Length', total);
  return res.end(buf);
}
async function viewerLink(req) {
  const c = cookies(req);
  for (const name of Object.keys(c)) {
    if (!name.startsWith('v_')) continue;
    const p = await verify(c[name]);
    if (!p || p.role !== 'viewer') continue;
    const r = await q('SELECT * FROM diary_links WHERE id = ?', [p.l]);
    if (r.length && !Number(r[0].revoked) && Number(r[0].ver) === p.v) return r[0];
  }
  return null;
}
function clean(s, n) { return String(s ?? '').slice(0, n); }


async function vapidKeys() {
  let j = await getSet('vapid');
  if (j) { try { return JSON.parse(j); } catch {} }
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pub = publicKey.export({ format: 'jwk' }), prv = privateKey.export({ format: 'jwk' });
  // JWK export gives x/y/d base64url; VAPID public key is the uncompressed point (0x04 || x || y)
  const pair = { publicKey: Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]).toString('base64url'), privateKey: prv.d };
  await setSet('vapid', JSON.stringify(pair));
  return pair;
}

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

    // ---------- media (served at /m/:id) ----------
    if (url.pathname.startsWith('/m/')) {
      const id = url.pathname.slice(3);
      if (await isOwner(req)) return serveMedia(req, res, id, () => true);
      const link = await viewerLink(req);
      if (!link) { res.statusCode = 401; return res.end('locked'); }
      const shared = await q('SELECT items FROM diary_pages WHERE shared = 1');
      return serveMedia(req, res, id, (m) => shared.some((p) => p.items.includes(m.id)));
    }
    // ---------- owner ----------
    if (parts[0] === 'owner') {
      if (parts[1] === 'login' && method === 'POST') {
        const key = 'owner:' + ip(req), gkey = 'owner:global';
        const w = Math.max(await guard(key), await guard(gkey));
        if (w) return send(res, 429, { error: `Bahut galat try. ${w} min baad try karo.` });
        const okPw = await checkOwnerPassword(String(body.password || ''));
        if (!okPw) { await fail(key); await fail(gkey, 25, 30 * 60000); return send(res, 401, { error: 'PIN galat hai.' }); }
        await okReset(key); await okReset(gkey);
        setSessionCookie(res, 'od', await sign({ role: 'owner', exp: now() + COOKIE_DAYS_OWNER * 86400000 }));
        return send(res, 200, { ok: true });
      }
      if (parts[1] === 'logout') { clearCookie(res, 'od'); return send(res, 200, { ok: true }); }
      // One-time PIN reset: needs the secret key (only its sha256 lives here). Self-disables after one success.
      if (parts[1] === 'reset' && method === 'POST') {
        if (await getSet('reset_done')) return send(res, 410, { error: 'Reset pehle hi ho chuka hai. Naye PIN se login karo.' });
        const key = 'reset:' + ip(req), gkey = 'reset:global';
        const w = Math.max(await guard(key), await guard(gkey));
        if (w) return send(res, 429, { error: `Bahut galat try. ${w} min baad try karo.` });
        if (!safeEq(sha(String(body.key || '').replace(/\s+/g, '')), RESET_HASH)) { await fail(key); await fail(gkey, 10, 60 * 60000); return send(res, 403, { error: 'Reset key galat hai.' }); }
        const np = String(body.pin || '');
        if (!PIN_RE.test(np)) return send(res, 400, { error: 'PIN 4 ya 8 digits ka hona chahiye.' });
        const salt = rid(12);
        await setSet('pw_salt', salt); await setSet('pw_hash', scrypt(np, salt));
        await setSet('reset_done', '1');
        await setSet('session_secret', crypto.randomBytes(32).toString('hex')); // purane saare sessions khatam
        await okReset(key); await okReset(gkey);
        setSessionCookie(res, 'od', await sign({ role: 'owner', exp: now() + COOKIE_DAYS_OWNER * 86400000 }));
        return send(res, 200, { ok: true });
      }
      if (parts[1] === 'me') return send(res, 200, { owner: await isOwner(req) });
      if (!(await isOwner(req))) return send(res, 401, { error: 'login karo' });

      if (parts[1] === 'settings') {
        if (method === 'GET') return send(res, 200, { name: (await getSet('name')) || 'Meri Dayri', theme: (await getSet('theme')) || 'auto', paper: (await getSet('paper')) || 'lined' });
        if (method === 'POST') {
          if (body.name !== undefined) await setSet('name', clean(body.name, 40) || 'Meri Dayri');
          if (['auto', 'light', 'dark'].includes(body.theme)) await setSet('theme', body.theme);
          if (PAPERS.includes(body.paper)) await setSet('paper', body.paper);
          return send(res, 200, { ok: true });
        }
      }
      if (parts[1] === 'password' && method === 'POST') {
        const key = 'pw:' + ip(req);
        const wait = await guard(key);
        if (wait) return send(res, 429, { error: `Bahut galat try. ${wait} min baad try karo.` });
        if (!(await checkOwnerPassword(String(body.current || '')))) { await fail(key); return send(res, 401, { error: 'Purana PIN galat hai.' }); }
        const np = String(body.next || '');
        if (!PIN_RE.test(np)) return send(res, 400, { error: 'Naya PIN 4 ya 8 digits ka hona chahiye.' });
        await okReset(key);
        const salt = rid(12);
        await setSet('pw_salt', salt); await setSet('pw_hash', scrypt(np, salt));
        await setSet('session_secret', crypto.randomBytes(32).toString('hex')); // logs out every device, including viewers
        setSessionCookie(res, 'od', await sign({ role: 'owner', exp: now() + COOKIE_DAYS_OWNER * 86400000 }));
        return send(res, 200, { ok: true });
      }
      if (parts[1] === 'pages') {
        if (method === 'GET' && !parts[2]) {
          const r = await q('SELECT * FROM diary_pages ORDER BY day DESC, created_at DESC');
          return send(res, 200, { pages: r.map(pageOut) });
        }
        if (method === 'POST' && !parts[2]) {
          const id = body.id && /^[\w-]{6,24}$/.test(body.id) ? body.id : rid();
          const items = Array.isArray(body.items) ? body.items.slice(0, 300) : [];
          const json = JSON.stringify(items);
          if (json.length > 600000) return send(res, 413, { error: 'Page bahut bhari ho gayi.' });
          const day = DAY.test(body.day || '') ? body.day : new Date().toISOString().slice(0, 10);
          const mood = MOODS.includes(body.mood) ? body.mood : '';
          const tags = JSON.stringify((Array.isArray(body.tags) ? body.tags : []).map((t) => clean(String(t).replace(/^#+/, '').trim(), 24)).filter(Boolean).slice(0, 12));
          const rec = [day, clean(body.title, 200), PAPERS.includes(body.paper) ? body.paper : 'lined', Math.min(6000, Math.max(700, Number(body.h) || 844)), json, body.shared ? 1 : 0, mood, tags, now()];
          const ex = await q('SELECT id FROM diary_pages WHERE id = ?', [id]);
          if (ex.length) await q('UPDATE diary_pages SET day=?, title=?, paper=?, h=?, items=?, shared=?, mood=?, tags=?, updated_at=? WHERE id=?', [...rec, id]);
          else await q('INSERT INTO diary_pages (day, title, paper, h, items, shared, mood, tags, updated_at, created_at, id) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [...rec, now(), id]);
          return send(res, 200, { ok: true, id });
        }
        if (method === 'DELETE' && parts[2]) { await q('DELETE FROM diary_pages WHERE id = ?', [parts[2]]); return send(res, 200, { ok: true }); }
      }
      if (parts[1] === 'media') {
        if (method === 'POST' && !parts[2]) {
          const mime = String(body.mime || '').split(';')[0].toLowerCase();
          if (!MIMES[mime]) return send(res, 400, { error: 'Ye file type allowed nahi hai.' });
          if (!(Number(body.size) > 0) || Number(body.size) > MAX_MEDIA) return send(res, 413, { error: 'File 14 MB se chhoti honi chahiye.' });
          const id = rid();
          await q('INSERT INTO diary_media (id, kind, mime, name, size, chunks, created_at) VALUES (?,?,?,?,?,?,?)', [id, MIMES[mime], mime, clean(body.name, 120), Number(body.size), 0, now()]);
          return send(res, 200, { ok: true, id });
        }
        if (method === 'POST' && parts[2] && parts[3] === 'chunk') {
          const m = await q('SELECT * FROM diary_media WHERE id = ?', [parts[2]]);
          if (!m.length) return send(res, 404, { error: 'not found' });
          const n = Number(body.n), data = Buffer.from(String(body.b64 || ''), 'base64');
          if (!(n >= 0 && n < 8) || !data.length || data.length > 3 * 1024 * 1024) return send(res, 400, { error: 'bad chunk' });
          await q('DELETE FROM diary_chunks WHERE media_id = ? AND n = ?', [parts[2], n]);
          await q('INSERT INTO diary_chunks (media_id, n, data) VALUES (?,?,?)', [parts[2], n, data]);
          await q('UPDATE diary_media SET chunks = ? WHERE id = ?', [Math.max(Number(m[0].chunks), n + 1), parts[2]]);
          return send(res, 200, { ok: true });
        }
        if (method === 'DELETE' && parts[2]) { await q('DELETE FROM diary_chunks WHERE media_id = ?', [parts[2]]); await q('DELETE FROM diary_media WHERE id = ?', [parts[2]]); return send(res, 200, { ok: true }); }
      }
      if (parts[1] === 'storage') {
        if (method === 'GET') { const r = await q('SELECT COALESCE(SUM(size),0) AS s, COUNT(*) AS c FROM diary_media'); return send(res, 200, { bytes: Number(r[0].s), files: Number(r[0].c) }); }
        if (method === 'POST') { // remove files no page uses
          const pg = await q('SELECT items FROM diary_pages'); const used = pg.map((p) => p.items).join('');
          const all = await q('SELECT id FROM diary_media'); let n = 0;
          for (const m of all) if (!used.includes(m.id)) { await q('DELETE FROM diary_chunks WHERE media_id = ?', [m.id]); await q('DELETE FROM diary_media WHERE id = ?', [m.id]); n++; }
          return send(res, 200, { ok: true, removed: n });
        }
      }
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
      if (parts[1] === 'export' && method === 'GET') {
        const pg = await q('SELECT * FROM diary_pages ORDER BY day ASC, created_at ASC');
        return send(res, 200, { name: (await getSet('name')) || 'Meri Dayri', exportedAt: now(), settings: { theme: (await getSet('theme')) || 'auto', paper: (await getSet('paper')) || 'lined' }, pages: pg.map(pageOut) });
      }
      if (parts[1] === 'vapid' && method === 'GET') { const vk = await vapidKeys(); return send(res, 200, { key: vk.publicKey }); }
      if (parts[1] === 'push') {
        if (method === 'GET') { const r = await q('SELECT COUNT(*) AS c FROM diary_push'); return send(res, 200, { on: Number(r[0].c) > 0 }); }
        if (method === 'POST') {
          const sub = body.sub || {};
          const ep = clean(sub.endpoint, 700), auth = clean(sub.keys && sub.keys.auth, 100), p256 = clean(sub.keys && sub.keys.p256dh, 200);
          if (!ep.startsWith('https://') || !auth || !p256) return send(res, 400, { error: 'Subscription sahi nahi hai.' });
          await q('DELETE FROM diary_push WHERE endpoint = ?', [ep]);
          await q('INSERT INTO diary_push (endpoint, p256dh, auth, created_at) VALUES (?,?,?,?)', [ep, p256, auth, now()]);
          return send(res, 200, { ok: true });
        }
        if (method === 'DELETE') { await q('DELETE FROM diary_push WHERE endpoint = ?', [clean(body.endpoint, 700)]); return send(res, 200, { ok: true }); }
      }
      return send(res, 404, { error: 'not found' });
    }

    // ---------- nightly reminder cron (Vercel, once a day) ----------
    if (parts[0] === 'cron' && parts[1] === 'remind') {
      const last = Number(await getSet('last_remind') || 0);
      if (now() - last < 20 * 3600 * 1000) return send(res, 200, { ok: true, skipped: 'recent' });
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      const wrote = await q('SELECT id FROM diary_pages WHERE day = ? LIMIT 1', [today]);
      const subs = await q('SELECT * FROM diary_push');
      if (!subs.length) return send(res, 200, { ok: true, skipped: 'no-subscription' });
      if (wrote.length) { await setSet('last_remind', now()); return send(res, 200, { ok: true, skipped: 'written-today' }); }
      let wp;
      try { wp = require('web-push'); } catch (e) { return send(res, 500, { error: 'web-push not installed' }); }
      const vk = await vapidKeys();
      wp.setVapidDetails('mailto:diary@localhost', vk.publicKey, vk.privateKey);
      let sent = 0;
      for (const sub of subs) {
        try {
          await wp.sendNotification({ endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } }, JSON.stringify({ title: 'Meri Dayri', body: 'Aaj ka page likhna baaki hai', url: '/owner' }));
          sent++;
        } catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await q('DELETE FROM diary_push WHERE endpoint = ?', [sub.endpoint]); }
      }
      await setSet('last_remind', now());
      return send(res, 200, { ok: true, sent });
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
      if (parts[2] === 'pages') {
        const r = await q('SELECT * FROM diary_pages WHERE shared = 1 ORDER BY day ASC, created_at ASC');
        const s2 = await getSet('name');
        return send(res, 200, { name: s2 || 'Meri Dayri', pages: r.map(pageOut).map(({ shared, ...p }) => p) });
      }
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
