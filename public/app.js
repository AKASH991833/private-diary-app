'use strict';
/* Private Diary - journal canvas. Free-form pages: photos, video loops, text, stickers, music, notes. */
const $ = (s, r = document) => r.querySelector(s);
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MFULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const W = 390; // design width of every page; scaled to the screen
const root = $('#app');

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
function toast(msg, ms = 2400) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), ms); }
async function api(path, method = 'GET', body) {
  const r = await fetch('/api/' + path, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) { const e = new Error(j.error || 'Error'); e.status = r.status; throw e; }
  return j;
}
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const ordinal = (n) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

function applyTheme(t) {
  localStorage.setItem('theme', t);
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]').content = dark ? '#15171d' : '#e3dfd8';
}
applyTheme(localStorage.getItem('theme') || 'auto');
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(localStorage.getItem('theme') || 'auto'));

const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const IC = {
  gear: svg('<path d="M10.3 3h3.4l.5 2.4a7 7 0 0 1 1.7 1l2.3-.8 1.7 2.9-1.8 1.6a7 7 0 0 1 0 2l1.8 1.6-1.7 2.9-2.3-.8a7 7 0 0 1-1.7 1l-.5 2.4h-3.4l-.5-2.4a7 7 0 0 1-1.7-1l-2.3.8-1.7-2.9 1.8-1.6a7 7 0 0 1 0-2L4.1 8.5l1.7-2.9 2.3.8a7 7 0 0 1 1.7-1z"/><circle cx="12" cy="12" r="2.6"/>'),
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  photo: svg('<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 9"/>'),
  text: svg('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'),
  sticker: svg('<path d="M20 12a8 8 0 1 1-8-8h1l7 7v1z"/><path d="M20 12h-5a2 2 0 0 1-2-2V4"/>'),
  music: svg('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  video: svg('<rect x="2" y="6" width="14" height="12" rx="2.5"/><path d="M22 8l-6 4 6 4z"/>'),
  note: svg('<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
  paper: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  label: svg('<path d="M3 12l9-9h8v8l-9 9z"/><circle cx="16" cy="8" r="1.3"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  up: svg('<path d="M12 19V5M5 12l7-7 7 7"/>'),
  down: svg('<path d="M12 5v14M5 12l7 7 7-7"/>'),
  frame: svg('<rect x="4" y="3" width="16" height="18" rx="1.5"/><rect x="7" y="6" width="10" height="9"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svg('<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
};
const ico = (n) => h('span', { class: 'ic', html: IC[n] });

const STK = {
  sprig: '<svg viewBox="0 0 80 110" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M40 108C38 80 42 50 36 10"/><path d="M38 72C25 67 17 57 19 46 30 49 36 59 38 72zM39 52C50 48 58 38 56 27 46 31 40 41 39 52zM37 32C28 28 24 20 27 11 34 15 38 23 37 32z"/><circle cx="36" cy="8" r="4"/><circle cx="56" cy="25" r="3.5"/><circle cx="19" cy="44" r="3"/></svg>',
  flower: '<svg viewBox="0 0 100 100"><g fill="#e9a9b9" stroke="#c97b93" stroke-width="1.5"><ellipse cx="50" cy="24" rx="14" ry="20"/><ellipse cx="50" cy="24" rx="14" ry="20" transform="rotate(72 50 50)"/><ellipse cx="50" cy="24" rx="14" ry="20" transform="rotate(144 50 50)"/><ellipse cx="50" cy="24" rx="14" ry="20" transform="rotate(216 50 50)"/><ellipse cx="50" cy="24" rx="14" ry="20" transform="rotate(288 50 50)"/></g><circle cx="50" cy="50" r="9" fill="#e6b84e" stroke="#b8923a" stroke-width="1.5"/></svg>',
  clover: '<svg viewBox="0 0 100 100"><defs><radialGradient id="g1" cx="40%" cy="35%"><stop offset="0" stop-color="#f0d27a"/><stop offset="1" stop-color="#a97b2c"/></radialGradient></defs><g fill="url(#g1)" stroke="#8d6a24" stroke-width="1.2"><ellipse cx="50" cy="27" rx="19" ry="23"/><ellipse cx="50" cy="73" rx="19" ry="23"/><ellipse cx="27" cy="50" rx="23" ry="19"/><ellipse cx="73" cy="50" rx="23" ry="19"/></g><circle cx="50" cy="50" r="5" fill="#8d6a24"/></svg>',
  moon: '<svg viewBox="0 0 100 100"><path d="M68 12a40 40 0 1 0 20 62A34 34 0 0 1 68 12z" fill="#efd27c" stroke="#b8923a" stroke-width="2"/></svg>',
  star: '<svg viewBox="0 0 100 100"><path d="M50 8l12 27 29 3-22 20 7 29-26-15-26 15 7-29L9 38l29-3z" fill="#efd27c" stroke="#b8923a" stroke-width="2" stroke-linejoin="round"/></svg>',
  sparkle: '<svg viewBox="0 0 100 100"><path d="M50 4C54 34 66 46 96 50 66 54 54 66 50 96 46 66 34 54 4 50 34 46 46 34 50 4z" fill="#f4e2a0" stroke="#c9a54a" stroke-width="2" stroke-linejoin="round"/></svg>',
  heart: '<svg viewBox="0 0 100 100"><path d="M50 88C16 62 8 40 18 24c10-14 28-9 32 4 4-13 22-18 32-4 10 16 2 38-32 64z" fill="#e0707f" stroke="#b34456" stroke-width="2"/></svg>',
  cloud: '<svg viewBox="0 0 120 80"><path d="M30 66a20 20 0 0 1-2-40 26 26 0 0 1 50-6 22 22 0 0 1 16 46z" fill="#fff" stroke="#b9c3d6" stroke-width="2"/></svg>',
  butterfly: '<svg viewBox="0 0 100 100"><g stroke="#6b4a8a" stroke-width="1.5"><path d="M50 50C30 10 6 20 12 44c4 16 22 14 38 6z" fill="#c9a6e8"/><path d="M50 50C70 10 94 20 88 44c-4 16-22 14-38 6z" fill="#c9a6e8"/><path d="M50 52C32 62 22 90 40 88c10-1 14-18 10-36z" fill="#e8b4d6"/><path d="M50 52c18 10 28 38 10 36-10-1-14-18-10-36z" fill="#e8b4d6"/></g><path d="M50 40v34M50 40q-6-12-12-14M50 40q6-12 12-14" stroke="#4a3358" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  leaf: '<svg viewBox="0 0 100 100"><path d="M12 88C8 40 40 10 90 10c0 50-30 82-78 78z" fill="#9db57e" stroke="#5f7a45" stroke-width="2"/><path d="M12 88C34 60 54 40 80 20" stroke="#5f7a45" stroke-width="2" fill="none"/></svg>',
  pin: '<svg viewBox="0 0 100 100"><circle cx="50" cy="38" r="22" fill="#d9534f" stroke="#a63a37" stroke-width="2"/><path d="M50 58v34" stroke="#555" stroke-width="4" stroke-linecap="round"/><circle cx="42" cy="30" r="6" fill="#fff" opacity=".5"/></svg>',
};
const EMOJI = ['🌸', '🌹', '🌙', '⭐', '✨', '💫', '🦋', '🍂', '🌿', '☕', '📖', '🎧', '💌', '🔒', '🕊️', '🌧️', '☀️', '🥀', '❤️', '🤍', '💭', '🎶', '📷', '🧿'];
const TAPES = ['#f1d98a', '#e9b9c9', '#b9d3e9', '#c9e0b8', '#d9c4a5'];
const FILTERS = { none: 'none', warm: 'sepia(.25) saturate(1.2) brightness(1.04)', bw: 'grayscale(1) contrast(1.05)', vintage: 'sepia(.55) contrast(.95) saturate(.9)', cool: 'saturate(.9) hue-rotate(12deg) brightness(1.03)', fade: 'contrast(.85) brightness(1.1) saturate(.8)' };
const FRAMES = { polaroid: 'Polaroid', tape: 'Tape', plain: 'Plain', round: 'Round', film: 'Film' };
const FONTSET = { kalam: ['Kalam', 'Kalam, "Noto Sans Devanagari", cursive'], caveat: ['Caveat', 'Caveat, Kalam, cursive'], yatra: ['Yatra One', 'Yatra, serif'], serif: ['Serif', '"Bodoni Moda", Georgia, serif'] };
const COLORS = ['auto', '#b24a6a', '#5b4a8a', '#2f5d8a', '#7a3e2b', '#b8923a', '#ffffff'];

/* ---------- media ---------- */
const mediaUrl = (id) => '/m/' + id;
const MIME_BY_EXT = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', wav: 'audio/wav', mp4: 'video/mp4', webm: 'video/webm', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
function guessMime(f) { const t = (f.type || '').split(';')[0]; if (t === 'audio/x-m4a') return 'audio/mp4'; if (t) return t; return MIME_BY_EXT[(f.name || '').split('.').pop().toLowerCase()] || ''; }
const b64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });
async function upload(blob, name, mime) {
  mime = mime || guessMime(blob);
  const { id } = await api('owner/media', 'POST', { mime, size: blob.size, name: name || 'file' });
  const CH = 2400 * 1024;
  for (let n = 0, off = 0; off < blob.size; n++, off += CH) await api(`owner/media/${id}/chunk`, 'POST', { n, b64: await b64(blob.slice(off, off + CH)) });
  return id;
}
async function loadImage(file) {
  if (window.createImageBitmap) { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {} }
  return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
}
async function shrinkImage(file, max = 1400) {
  const img = await loadImage(file);
  const w0 = img.width || img.naturalWidth, h0 = img.height || img.naturalHeight, k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.84));
  return { blob, ar: c.width / c.height };
}
/* video -> small muted looping clip (max 20 s, 480 px), encoded on the phone before upload */
async function toLoop(file, onProgress) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.style.cssText = 'position:fixed;left:-9999px;width:2px';
  const url = URL.createObjectURL(file); v.src = url; document.body.append(v);
  try {
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('video nahi khuli')); });
    const dur = Math.min(20, v.duration || 20), k = Math.min(1, 480 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(v.videoWidth * k / 2) * 2); c.height = Math.max(2, Math.round(v.videoHeight * k / 2) * 2);
    const x = c.getContext('2d');
    const mt = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    if (!mt) return null;
    const rec = new MediaRecorder(c.captureStream(24), { mimeType: mt, videoBitsPerSecond: 650000 }), parts = [];
    rec.ondataavailable = (e) => e.data && e.data.size && parts.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start(500); await v.play();
    await new Promise((res) => {
      const tick = () => { x.drawImage(v, 0, 0, c.width, c.height); onProgress && onProgress(Math.min(1, v.currentTime / dur)); if (v.ended || v.currentTime >= dur) return res(); requestAnimationFrame(tick); };
      tick();
    });
    v.pause(); rec.stop(); await done;
    return { blob: new Blob(parts, { type: mt.split(';')[0] }), ar: c.width / c.height };
  } finally { v.remove(); URL.revokeObjectURL(url); }
}
function pick(accept, multiple) {
  return new Promise((res) => { const i = h('input', { type: 'file', accept, multiple, style: { display: 'none' } }); i.onchange = () => res([...i.files]); document.body.append(i); i.click(); setTimeout(() => i.remove(), 60000); });
}

let curAudio = null;
function audioFor(mid, onUpdate) {
  if (curAudio && curAudio.mid === mid) { curAudio.onUpdate = onUpdate; return curAudio; }
  if (curAudio) { curAudio.a.pause(); curAudio.onUpdate && curAudio.onUpdate(); }
  const a = new Audio(mediaUrl(mid)); a.preload = 'metadata';
  const c = (curAudio = { mid, a, onUpdate });
  a.addEventListener('timeupdate', () => c.onUpdate && c.onUpdate());
  a.addEventListener('ended', () => c.onUpdate && c.onUpdate());
  a.addEventListener('pause', () => c.onUpdate && c.onUpdate());
  return c;
}

/* ---------- page canvas ---------- */
function monthTabs(day, onTab) {
  const m = parseDay(day).getMonth();
  return h('div', { class: 'mtabs' }, MONTHS.map((n, i) => h('b', { class: i === m ? 'on' : '', onclick: onTab ? (e) => { e.stopPropagation(); onTab(i); } : null }, n)));
}
function pageHeader(p, onTab) {
  const d = parseDay(p.day);
  return h('div', { class: 'phead' }, monthTabs(p.day, onTab), h('div', { class: 'pmonth' }, MFULL[d.getMonth()].toUpperCase()), h('div', { class: 'pscript' }, MFULL[d.getMonth()]), h('div', { class: 'pday' }, ordinal(d.getDate())), h('div', { class: 'ptag' }, WD[d.getDay()]), h('div', { class: 'pleaf', html: STK.clover }));
}
function itemBody(it, ctx) {
  const t = it.t;
  if (t === 'text') {
    const f = FONTSET[it.font] || FONTSET.kalam;
    return h('div', { class: 'tx', style: { fontFamily: f[1], fontSize: (it.size || 18) + 'px', color: !it.color || it.color === 'auto' ? '' : it.color, textAlign: it.align || 'left', fontWeight: it.bold ? 700 : 400, lineHeight: '1.5' } }, it.text || '');
  }
  if (t === 'label') return h('div', { class: 'lbl' }, it.text || '');
  if (t === 'sticker') return h('div', { class: 'stk', html: it.s && it.s.startsWith('emo:') ? `<span style="font-size:${Math.round(it.w * 0.8)}px;line-height:1">${it.s.slice(4).replace(/[<>&]/g, '')}</span>` : STK[it.s] || '' });
  if (t === 'tape') return h('div', { class: 'tape', style: { background: it.c || TAPES[0] } });
  if (t === 'photo' || t === 'video') {
    const fr = it.frame || 'polaroid', f = FILTERS[it.filter] || 'none';
    const media = t === 'photo'
      ? h('img', { src: mediaUrl(it.mid), alt: '', draggable: 'false', style: { filter: f } })
      : h('video', { src: mediaUrl(it.mid), loop: true, autoplay: true, playsinline: true, preload: 'auto', style: { filter: f }, onloadeddata: (e) => e.target.play().catch(() => {}) });
    if (t === 'video') { media.muted = true; media.setAttribute('muted', ''); }
    return h('div', { class: 'fr fr-' + fr, style: { '--ar': it.ar || 1 } }, fr === 'tape' ? h('i', { class: 'strip' }) : null, h('div', { class: 'imgw' }, media), it.cap ? h('div', { class: 'cap' }, it.cap) : fr === 'polaroid' ? h('div', { class: 'cap' }) : null);
  }
  if (t === 'note') {
    const lines = (it.lines || '').split('\n').filter((x) => x.trim());
    return h('div', { class: 'torn' }, h('div', { class: 'tt' }, it.title || 'To-do list'), lines.map((l) => h('div', { class: 'tl' }, h('i'), l)));
  }
  if (t === 'music') return musicBody(it, ctx);
  return h('div');
}
function musicBody(it, ctx) {
  const play = h('button', { class: 'pl', 'aria-label': 'play' }, '▶');
  const bar = h('i', { class: 'pb' }, h('u'));
  const state = () => {
    const mine = curAudio && curAudio.mid === it.mid ? curAudio.a : null;
    play.textContent = mine && !mine.paused ? '❚❚' : '▶';
    bar.firstChild.style.width = mine && mine.duration ? (mine.currentTime / mine.duration * 100) + '%' : '0%';
  };
  const act = (fn) => (e) => { if (ctx.edit) return; e.stopPropagation(); if (!it.mid) return toast('Is gaane ki file nahi lagi, sirf naam hai'); const c = audioFor(it.mid, state); fn(c.a); state(); };
  play.onclick = act((a) => (a.paused ? a.play().catch(() => toast('Play nahi hua')) : a.pause()));
  const art = it.cover ? h('img', { class: 'art', src: mediaUrl(it.cover), alt: '' }) : h('div', { class: 'art' });
  setTimeout(state);
  return h('div', { class: 'mp' }, art, h('div', { class: 'mi' }, h('small', {}, 'currently listening'), h('div', { class: 'mt' }, it.title || 'Gaana'), h('div', { class: 'ma' }, it.artist || '')),
    h('div', { class: 'mc' }, h('button', { onclick: act((a) => (a.currentTime = Math.max(0, a.currentTime - 10))) }, '◂◂'), play, h('button', { onclick: act((a) => (a.currentTime = Math.min(a.duration || 1e9, a.currentTime + 10))) }, '▸▸')), bar);
}
function applyBox(el, it) {
  const s = el.style;
  s.left = it.x + 'px'; s.top = it.y + 'px'; s.zIndex = it.z || 1;
  s.transform = `rotate(${it.r || 0}deg)`;
  if (it.t === 'label') s.width = 'auto'; else s.width = (it.w || 150) + 'px';
  if (it.t === 'sticker') s.height = (it.w || 80) + 'px';
  if (it.t === 'tape') s.height = (it.h || 24) + 'px';
}
function renderSheet(p, opts = {}) {
  const ed = opts.ed;
  const sheet = h('div', { class: 'sheet paper-' + p.paper + (ed ? ' editing' : ''), style: { width: W + 'px', height: p.h + 'px' } }, pageHeader(p, opts.onTab));
  const wrap = h('div', { class: 'sheetwrap' }, sheet);
  const fit = () => { const w = wrap.clientWidth || W, s = w / W; sheet.style.transform = `scale(${s})`; wrap.style.height = p.h * s + 'px'; wrap._s = s; };
  new ResizeObserver(fit).observe(wrap); setTimeout(fit);
  const els = new Map();
  const mount = (it) => {
    const el = h('div', { class: 'it it-' + it.t, 'data-id': it.id }, itemBody(it, { edit: !!ed }));
    applyBox(el, it); els.set(it.id, el); sheet.append(el);
    if (ed) bindItem(el, it, ed, wrap);
    return el;
  };
  p.items.slice().sort((a, b) => (a.z || 0) - (b.z || 0)).forEach(mount);
  sheet._mount = mount; sheet._els = els; sheet._fit = fit;
  if (ed) sheet.addEventListener('pointerdown', (e) => { if (e.target === sheet || e.target.closest('.phead')) ed.select(null); });
  return wrap;
}
function bindItem(el, it, ed, wrap) {
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.hd-h')) return;
    e.preventDefault();
    ed.select(it.id);
    const s = wrap._s || 1, sx = e.clientX, sy = e.clientY, ox = it.x, oy = it.y; let moved = false;
    try { el.setPointerCapture(e.pointerId); } catch {}
    const mv = (ev) => { const dx = (ev.clientX - sx) / s, dy = (ev.clientY - sy) / s; if (!moved && Math.hypot(dx, dy) < 3) return; moved = true; it.x = Math.round(ox + dx); it.y = Math.round(oy + dy); el.style.left = it.x + 'px'; el.style.top = it.y + 'px'; };
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); if (moved) ed.changed(); else if (ed.lastTapId === it.id && Date.now() - ed.lastTap < 350 && ['text', 'label', 'note', 'music'].includes(it.t)) ed.edit(it); ed.lastTap = Date.now(); ed.lastTapId = it.id; };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
}
function addHandles(el, it, ed) {
  const rot = h('div', { class: 'hd-h hd-rot', html: '⟳' }), rs = h('div', { class: 'hd-h hd-rs' });
  const cen = () => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  rs.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation(); try { rs.setPointerCapture(e.pointerId); } catch {}
    const [cx, cy] = cen(), d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1, w0 = it.w || 150, h0 = it.h || 24;
    const mv = (ev) => { const k = Math.hypot(ev.clientX - cx, ev.clientY - cy) / d0; it.w = Math.max(30, Math.min(W * 1.6, Math.round(w0 * k))); if (it.t === 'tape') it.h = Math.max(12, Math.round(h0 * k)); applyBox(el, it); if (it.t === 'sticker') { const b = el.querySelector('.stk span'); if (b) b.style.fontSize = Math.round(it.w * 0.8) + 'px'; } };
    const up = () => { rs.removeEventListener('pointermove', mv); rs.removeEventListener('pointerup', up); ed.changed(); };
    rs.addEventListener('pointermove', mv); rs.addEventListener('pointerup', up);
  });
  rot.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation(); try { rot.setPointerCapture(e.pointerId); } catch {}
    const [cx, cy] = cen(), a0 = Math.atan2(e.clientY - cy, e.clientX - cx), r0 = it.r || 0;
    const mv = (ev) => { let r = r0 + (Math.atan2(ev.clientY - cy, ev.clientX - cx) - a0) * 180 / Math.PI; r = Math.round(((r + 540) % 360) - 180); if (Math.abs(r) < 4) r = 0; it.r = r; applyBox(el, it); };
    const up = () => { rot.removeEventListener('pointermove', mv); rot.removeEventListener('pointerup', up); ed.changed(); };
    rot.addEventListener('pointermove', mv); rot.addEventListener('pointerup', up);
  });
  el.append(rot, rs);
}

function modal(title, content, opts = {}) {
  const close = () => { back.remove(); opts.onClose && opts.onClose(); };
  const back = h('div', { class: 'mback', onpointerdown: (e) => { if (e.target === back) close(); } },
    h('div', { class: 'msheet' }, h('div', { class: 'grab' }), h('div', { class: 'mh' }, h('b', {}, title), h('button', { class: 'x', onclick: close }, '✕')), content));
  document.body.append(back);
  return { close, el: back };
}
const chips = (opts, cur, fn) => h('div', { class: 'chips' }, Object.entries(opts).map(([k, v]) => h('button', { class: 'chip' + (k === cur ? ' on' : ''), onclick: (e) => { fn(k); [...e.target.parentNode.children].forEach((c) => c.classList.remove('on')); e.target.classList.add('on'); } }, v)));

/* ---------- editor ---------- */
function editor(page, ctx) {
  const ed = { sel: null, page };
  const status = h('span', { class: 'st' }, 'Saved ✓');
  let saveT;
  const save = async () => {
    status.textContent = 'Saving…';
    try { await api('owner/pages', 'POST', page); status.textContent = 'Saved ✓'; }
    catch (e) { status.textContent = 'Save nahi hua, retry…'; clearTimeout(saveT); saveT = setTimeout(save, 4000); }
  };
  ed.changed = () => { status.textContent = '…'; clearTimeout(saveT); saveT = setTimeout(save, 700); };
  const sheetWrap = renderSheet(page, { ed });
  const sheet = sheetWrap.firstChild;
  const bar = h('div', { class: 'tbar' });
  const maxZ = () => page.items.reduce((m, i) => Math.max(m, i.z || 0), 0);
  const centerPos = (w) => { const sc = sheetWrap._s || 1, top = Math.max(0, (-sheetWrap.getBoundingClientRect().top + innerHeight * 0.3) / sc); return { x: Math.round(Math.max(8, (W - w) / 2) + (Math.random() * 30 - 15)), y: Math.round(Math.max(120, Math.min(page.h - 200, top))) }; };
  const add = (it) => { const pos = centerPos(it.w || 150); Object.assign(it, { id: uid(), x: pos.x, y: pos.y, r: it.r != null ? it.r : Math.round(Math.random() * 6 - 3), z: maxZ() + 1 }); page.items.push(it); sheet._mount(it); ed.select(it.id); ed.changed(); return it; };
  ed.add = add;
  const el = (id) => sheet._els.get(id);
  ed.redraw = (it) => { const e = el(it.id); if (!e) return; const wasSel = ed.sel === it.id; e.replaceChildren(itemBody(it, { edit: true })); applyBox(e, it); if (wasSel) addHandles(e, it, ed); };
  const cur = () => page.items.find((i) => i.id === ed.sel);
  ed.select = (id) => {
    if (ed.sel && el(ed.sel)) { const o = el(ed.sel); o.classList.remove('sel'); o.querySelectorAll('.hd-h').forEach((n) => n.remove()); }
    ed.sel = id;
    if (id && el(id)) { const e = el(id); e.classList.add('sel'); addHandles(e, cur(), ed); }
    drawBar();
  };
  ed.edit = (it) => { if (it.t === 'text' || it.t === 'label') return textModal(it, ed); if (it.t === 'note') return noteModal(it, ed); if (it.t === 'music') return musicModal(it, ed); };
  const btn = (icon, label, fn, cls) => h('button', { class: 'tb ' + (cls || ''), onclick: fn }, ico(icon), h('span', {}, label));
  function drawBar() {
    const it = cur(); bar.replaceChildren();
    if (!it) {
      bar.append(
        btn('photo', 'Photo', () => addPhotos(ed)),
        btn('text', 'Text', () => { const n = ed.add({ t: 'text', text: 'Yahan likho…', font: 'kalam', size: 20, w: 220, color: 'auto', align: 'left', r: 0 }); textModal(n, ed); }),
        btn('sticker', 'Sticker', () => stickerModal(ed)), btn('video', 'Video', () => addVideo(ed)), btn('music', 'Music', () => musicModal(null, ed)),
        btn('note', 'Note', () => { const n = ed.add({ t: 'note', title: 'To-do list', lines: 'Pehli baat\nDusri baat', w: 170, r: -2 }); noteModal(n, ed); }),
        btn('label', 'Label', () => { const n = ed.add({ t: 'label', text: 'simplicity', r: -1 }); textModal(n, ed); }));
      return;
    }
    const b = [];
    if (['text', 'label', 'note', 'music'].includes(it.t)) b.push(btn('edit', 'Edit', () => ed.edit(it)));
    if (it.t === 'photo' || it.t === 'video') b.push(btn('frame', 'Frame', () => frameModal(it, ed)));
    if (it.t === 'tape') b.push(btn('paper', 'Colour', () => { it.c = TAPES[(TAPES.indexOf(it.c) + 1) % TAPES.length]; ed.redraw(it); ed.changed(); }));
    b.push(btn('up', 'Aage', () => { it.z = maxZ() + 1; applyBox(el(it.id), it); ed.changed(); }),
      btn('down', 'Peeche', () => { it.z = Math.max(1, Math.min(...page.items.map((i) => i.z || 1)) - 1); applyBox(el(it.id), it); ed.changed(); }),
      btn('copy', 'Copy', () => { const c = JSON.parse(JSON.stringify(it)); c.id = uid(); c.x += 18; c.y += 18; c.z = maxZ() + 1; page.items.push(c); sheet._mount(c); ed.select(c.id); ed.changed(); }),
      btn('trash', 'Delete', () => { if (!confirm('Ye hata dein?')) return; page.items = page.items.filter((i) => i.id !== it.id); el(it.id).remove(); sheet._els.delete(it.id); ed.sel = null; drawBar(); ed.changed(); }, 'danger'),
      h('button', { class: 'tb done', onclick: () => ed.select(null) }, 'Done'));
    bar.append(...b);
  }
  drawBar();
  const grow = h('button', { class: 'grow', onclick: () => { page.h = Math.min(6000, page.h + 320); sheet.style.height = page.h + 'px'; sheet._fit(); ed.changed(); } }, '+ Page lamba karo');
  ed.status = status; ed.node = h('div', { class: 'editor' }, sheetWrap, grow); ed.bar = bar; ed.sheet = sheet;
  ed.flush = () => { clearTimeout(saveT); return save(); };
  return ed;
}
async function addPhotos(ed) {
  const files = await pick('image/*', true); if (!files.length) return;
  for (const f of files) {
    try {
      toast('Photo lag rahi hai…', 8000);
      const { blob, ar } = await shrinkImage(f); const mid = await upload(blob, f.name, 'image/jpeg');
      ed.add({ t: 'photo', mid, ar, w: 160, frame: 'polaroid', filter: 'none', cap: '' });
    } catch (e) { toast('Photo nahi lagi: ' + e.message); }
  }
  toast('Photo lag gayi');
}
async function addVideo(ed) {
  const [f] = await pick('video/*', false); if (!f) return;
  try {
    toast('Video chhota loop clip ban raha hai…', 60000);
    let r = await toLoop(f, (p) => toast(`Loop clip ban rahi hai ${Math.round(p * 100)}%`, 60000));
    if (!r) { if (f.size > 12 * 1024 * 1024) throw new Error('Is phone me video convert nahi ho sakta, 12 MB se chhoti video chuno'); r = { blob: f, ar: 0.75 }; }
    toast('Upload ho raha hai…', 60000);
    const mid = await upload(r.blob, 'clip', (r.blob.type || 'video/mp4').split(';')[0]);
    ed.add({ t: 'video', mid, ar: r.ar, w: 170, frame: 'polaroid', filter: 'none', cap: '' });
    toast('Clip lag gayi (' + (r.blob.size / 1024 / 1024).toFixed(1) + ' MB)');
  } catch (e) { toast('Video nahi lagi: ' + e.message, 4000); }
}
function stickerModal(ed) {
  let m;
  const addS = (it) => { ed.add(it); m.close(); };
  const g = h('div', { class: 'grid' }, Object.keys(STK).map((k) => h('button', { class: 'sg', html: STK[k], onclick: () => addS({ t: 'sticker', s: k, w: k === 'sprig' ? 70 : 64 }) })));
  const e = h('div', { class: 'grid emo' }, EMOJI.map((x) => h('button', { class: 'sg', onclick: () => addS({ t: 'sticker', s: 'emo:' + x, w: 56 }) }, x)));
  const tp = h('div', { class: 'row' }, TAPES.map((c) => h('button', { class: 'tp', style: { background: c }, onclick: () => addS({ t: 'tape', c, w: 90, h: 24, r: -6 }) })));
  m = modal('Stickers', h('div', {}, h('p', { class: 'sub' }, 'Washi tape'), tp, h('p', { class: 'sub' }, 'Doodles'), g, h('p', { class: 'sub' }, 'Emoji'), e));
}
function frameModal(it, ed) {
  const m = modal('Frame aur filter', h('div', {},
    h('p', { class: 'sub' }, 'Frame'), chips(FRAMES, it.frame || 'polaroid', (k) => { it.frame = k; ed.redraw(it); ed.changed(); }),
    h('p', { class: 'sub' }, 'Filter'), chips({ none: 'Original', warm: 'Warm', bw: 'B&W', vintage: 'Vintage', cool: 'Cool', fade: 'Fade' }, it.filter || 'none', (k) => { it.filter = k; ed.redraw(it); ed.changed(); }),
    h('p', { class: 'sub' }, 'Caption'), h('input', { class: 'field', value: it.cap || '', maxlength: 60, placeholder: 'Chhota caption (optional)', oninput: (e) => { it.cap = e.target.value; ed.redraw(it); ed.changed(); } }),
    h('button', { class: 'btn', onclick: () => m.close() }, 'Ho gaya')));
}
function textModal(it, ed) {
  const isLabel = it.t === 'label';
  const ta = h('textarea', { class: 'field', rows: isLabel ? 1 : 5, placeholder: 'Yahan likho…' }, it.text || '');
  ta.oninput = () => { it.text = ta.value; ed.redraw(it); ed.changed(); };
  const body = h('div', {}, ta);
  if (!isLabel) {
    body.append(h('p', { class: 'sub' }, 'Font'), chips(Object.fromEntries(Object.entries(FONTSET).map(([k, v]) => [k, v[0]])), it.font || 'kalam', (k) => { it.font = k; ed.redraw(it); ed.changed(); }),
      h('p', { class: 'sub' }, 'Size'), h('input', { type: 'range', min: 12, max: 44, value: it.size || 18, oninput: (e) => { it.size = Number(e.target.value); ed.redraw(it); ed.changed(); } }),
      h('p', { class: 'sub' }, 'Alignment'), chips({ left: 'Left', center: 'Beech me', right: 'Right' }, it.align || 'left', (k) => { it.align = k; ed.redraw(it); ed.changed(); }),
      h('p', { class: 'sub' }, 'Colour'), h('div', { class: 'row' }, COLORS.map((c) => h('button', { class: 'cc' + ((it.color || 'auto') === c ? ' on' : ''), style: { background: c === 'auto' ? 'linear-gradient(135deg,#222 50%,#eee 50%)' : c }, onclick: (e) => { it.color = c; ed.redraw(it); ed.changed(); [...e.target.parentNode.children].forEach((x) => x.classList.remove('on')); e.target.classList.add('on'); } }))));
  }
  body.append(h('button', { class: 'btn', onclick: () => m.close() }, 'Ho gaya'));
  const m = modal(isLabel ? 'Label' : 'Text', body);
  setTimeout(() => ta.focus(), 250);
}
function noteModal(it, ed) {
  const t = h('input', { class: 'field', value: it.title || '', maxlength: 30, oninput: (e) => { it.title = e.target.value; ed.redraw(it); ed.changed(); } });
  const ta = h('textarea', { class: 'field', rows: 6, placeholder: 'Har line alag item' }, it.lines || '');
  ta.oninput = () => { it.lines = ta.value; ed.redraw(it); ed.changed(); };
  const m = modal('Torn note', h('div', {}, h('p', { class: 'sub' }, 'Title'), t, h('p', { class: 'sub' }, 'Lines'), ta, h('button', { class: 'btn', onclick: () => m.close() }, 'Ho gaya')));
}
function musicModal(it, ed) {
  const isNew = !it; const d = it || { t: 'music', title: '', artist: '', w: 190 };
  const title = h('input', { class: 'field', value: d.title, placeholder: 'Gaane ka naam', maxlength: 60 }), artist = h('input', { class: 'field', value: d.artist, placeholder: 'Artist', maxlength: 60 });
  const info = h('p', { class: 'sub' }, d.mid ? 'Audio file lagi hui hai' : 'Abhi sirf naam hai (play nahi hoga)');
  let busy = false;
  const file = h('button', { class: 'btn sec', onclick: async () => {
    const [f] = await pick('audio/*,.mp3,.m4a,.aac,.wav,.ogg', false); if (!f) return;
    const mime = guessMime(f); if (!/^audio\//.test(mime)) return toast('Sirf audio file (MP3/M4A) chuno');
    if (f.size > 14 * 1024 * 1024) return toast('Gaana 14 MB se chhota chahiye');
    busy = true; info.textContent = 'Upload ho raha hai…';
    try { d.mid = await upload(f, f.name, mime); if (!title.value) title.value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '); info.textContent = 'Audio file lag gayi: ' + f.name; } catch (e) { info.textContent = 'Upload nahi hua: ' + e.message; }
    busy = false;
  } }, 'Audio file chuno (MP3 / M4A)');
  const cover = h('button', { class: 'btn sec', onclick: async () => { const [f] = await pick('image/*', false); if (!f) return; try { const { blob } = await shrinkImage(f, 300); d.cover = await upload(blob, 'cover', 'image/jpeg'); toast('Cover lag gaya'); } catch (e) { toast('Cover nahi laga'); } } }, 'Cover photo (optional)');
  const m = modal('Gaana jodo', h('div', {}, h('p', { class: 'sub' }, 'Title'), title, h('p', { class: 'sub' }, 'Artist'), artist, h('div', { class: 'gap' }), file, info, cover,
    h('p', { class: 'hint' }, 'Gaana ki file tumhe khud deni hogi. Free storage chhoti hai, 14 MB tak.'),
    h('button', { class: 'btn', onclick: () => { if (busy) return toast('Upload khatam hone do'); d.title = title.value.trim() || 'Gaana'; d.artist = artist.value.trim(); if (isNew) ed.add(d); else { ed.redraw(d); ed.changed(); } m.close(); } }, isNew ? 'Page me lagao' : 'Save')));
}

/* ---------- screens ---------- */
let S = { mode: 'gate', pages: [], name: 'Meri Dayri', token: null, readonly: false, year: new Date().getFullYear(), month: null, settings: { paper: 'lined', theme: 'auto' } };
let cur = null; // active editor, if any

function topbar(left, mid, right) { return h('div', { class: 'top' }, h('div', { class: 'l' }, left), h('div', { class: 'm' }, mid), h('div', { class: 'r' }, right)); }
const iconBtn = (name, fn, label) => h('button', { class: 'ib', onclick: fn, 'aria-label': label || name }, ico(name));
function themeBtn() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return iconBtn(dark ? 'sun' : 'moon', (e) => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; applyTheme(n); if (!S.readonly) api('owner/settings', 'POST', { theme: n }).catch(() => {}); e.currentTarget.replaceWith(themeBtn()); }, 'theme');
}
const lockSeal = () => h('div', { class: 'seal', html: IC.lock });

function gateOwner() {
  S.mode = 'gate'; document.title = 'Diary';
  const pw = h('input', { class: 'field', type: 'password', placeholder: 'Password', autocomplete: 'current-password' }), err = h('div', { class: 'err' });
  const go = async () => { err.textContent = ''; try { await api('owner/login', 'POST', { password: pw.value }); startOwner(); } catch (e) { err.textContent = e.message; } };
  pw.onkeydown = (e) => e.key === 'Enter' && go();
  root.replaceChildren(h('div', { class: 'gate' }, lockSeal(), h('h1', {}, 'Meri Dayri'), h('p', { class: 'muted' }, 'Sirf owner ke liye'), pw, err, h('button', { class: 'btn', onclick: go }, 'Kholo')));
}
async function startOwner() {
  const me = await api('owner/me').catch(() => ({ owner: false }));
  if (!me.owner) return gateOwner();
  const [pg, st] = await Promise.all([api('owner/pages'), api('owner/settings')]);
  S = { ...S, mode: 'owner', pages: pg.pages, name: st.name, readonly: false, settings: st };
  if (!localStorage.getItem('theme_synced')) { applyTheme(st.theme || 'auto'); localStorage.setItem('theme_synced', '1'); }
  home(true);
}
async function startViewer(token) {
  S.token = token; S.readonly = true; S.mode = 'viewer';
  const ok = await fetch(`/api/view/${token}/info`).then((r) => r.json()).then((j) => j.ok).catch(() => false);
  if (!ok) return root.replaceChildren(h('div', { class: 'gate' }, lockSeal(), h('h1', {}, 'Link band hai'), h('p', { class: 'muted' }, 'Ye link band ho chuka hai ya galat hai.')));
  try { const j = await api(`view/${token}/pages`); S.pages = j.pages; S.name = j.name; return home(true); } catch (e) { if (e.status !== 401) throw e; }
  const pin = h('input', { class: 'field', type: 'password', placeholder: 'Passcode', autocomplete: 'off' }), err = h('div', { class: 'err' });
  const go = async () => { err.textContent = ''; try { await api(`view/${token}/unlock`, 'POST', { passcode: pin.value }); const j = await api(`view/${token}/pages`); S.pages = j.pages; S.name = j.name; home(true); } catch (e) { err.textContent = e.message; } };
  pin.onkeydown = (e) => e.key === 'Enter' && go();
  root.replaceChildren(h('div', { class: 'gate' }, lockSeal(), h('h1', {}, 'Ek private dayri'), h('p', { class: 'muted' }, 'Passcode daalo, jo tumhe diya gaya hai.'), pin, err, h('button', { class: 'btn', onclick: go }, 'Kholo')));
}

function push(state) { history.pushState(state, ''); window.scrollTo(0, 0); }
function home(first) {
  if (first) history.replaceState({ v: 'home' }, '');
  if (curAudio) curAudio.a.pause();
  cur = null; document.title = S.name;
  const y = S.year, byM = (m) => S.pages.filter((p) => { const d = parseDay(p.day); return d.getFullYear() === y && d.getMonth() === m; });
  const shown = S.pages.filter((p) => { const d = parseDay(p.day); return d.getFullYear() === y && (S.month == null || d.getMonth() === S.month); }).sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  const tabs = h('div', { class: 'mtabs big' }, h('b', { class: S.month == null ? 'on' : '', onclick: () => { S.month = null; home(); } }, 'ALL'),
    MONTHS.map((n, i) => h('b', { class: (S.month === i ? 'on ' : '') + (byM(i).length ? 'has' : ''), onclick: () => { S.month = i; home(); } }, n)));
  const list = shown.length ? shown.map(card) : [h('div', { class: 'empty' }, h('div', { class: 'big', html: STK.sprig }), h('p', {}, S.readonly ? 'Is mahine koi page share nahi hua.' : 'Abhi koi page nahi. Neeche + dabao aur aaj ka page likho.'))];
  root.replaceChildren(h('div', { class: 'home' },
    topbar(null, h('div', { class: 'ttl' }, S.name), [themeBtn(), S.readonly ? null : iconBtn('gear', openSettings, 'settings')]),
    h('div', { class: 'yr' }, iconBtn('back', () => { S.year--; home(); }), h('b', {}, y), h('button', { class: 'ib flip', onclick: () => { S.year++; home(); }, html: IC.back })),
    tabs, h('div', { class: 'cards' }, list),
    S.readonly ? null : h('button', { class: 'fab', onclick: newPage, 'aria-label': 'new page' }, ico('plus'))));
}
function card(p) {
  const d = parseDay(p.day), first = p.items.find((i) => i.t === 'photo'), txt = p.items.find((i) => i.t === 'text');
  return h('button', { class: 'card', onclick: () => openPage(p.id) },
    h('div', { class: 'cd' }, h('b', {}, d.getDate()), h('small', {}, MONTHS[d.getMonth()])),
    h('div', { class: 'cm' }, h('div', { class: 'ct' }, p.title || (txt ? txt.text.split('\n')[0].slice(0, 40) : WD[d.getDay()] + ' ka page')), h('div', { class: 'cs' }, WD[d.getDay()] + ' · ' + p.items.length + ' cheezein' + (!S.readonly && p.shared ? ' · shared' : ''))),
    first ? h('img', { class: 'cth', src: mediaUrl(first.mid), alt: '', loading: 'lazy' }) : h('div', { class: 'cth empty-th', html: STK.flower }));
}
async function newPage() {
  const dt = new Date(); const day = todayStr();
  const p = { id: uid(), day, title: '', paper: S.settings.paper || 'lined', h: 844, items: [], shared: false };
  S.pages.unshift(p); S.year = dt.getFullYear();
  await api('owner/pages', 'POST', p).catch(() => {});
  openPage(p.id, true);
}
function openPage(id, fresh, noPush) {
  const p = S.pages.find((x) => x.id === id); if (!p) return home();
  if (!noPush) push({ v: 'page', id });
  document.title = S.name;
  if (S.readonly) return viewPage(p);
  const ed = editor(p, {}); cur = ed;
  root.replaceChildren(h('div', { class: 'page-screen' },
    topbar(iconBtn('back', () => history.back(), 'back'), ed.status, [themeBtn(), iconBtn('more', () => pageMenu(p, ed), 'menu')]), ed.node, ed.bar));
  if (fresh) toast('Naya page. Neeche se kuch bhi jodo.');
}
function viewPage(p) {
  const list = S.pages.slice().sort((a, b) => (a.day < b.day ? -1 : 1)), i = list.findIndex((x) => x.id === p.id);
  const go = (n) => { const q = list[n]; if (q) { history.replaceState({ v: 'page', id: q.id }, ''); viewPage(q); window.scrollTo(0, 0); } };
  const sw = renderSheet(p, { onTab: (m) => { S.month = m; S.year = parseDay(p.day).getFullYear(); history.back(); } });
  let sx = null;
  root.replaceChildren(h('div', { class: 'page-screen read', ontouchstart: (e) => (sx = e.touches[0].clientX), ontouchend: (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (dx > 90) go(i - 1); else if (dx < -90) go(i + 1); } },
    topbar(iconBtn('back', () => history.back(), 'back'), h('div', { class: 'ttl sm' }, p.title || ''), themeBtn()), h('div', { class: 'editor' }, sw),
    h('div', { class: 'nav' }, h('button', { class: 'btn sec sm', disabled: i <= 0, onclick: () => go(i - 1) }, '‹ Pichla'), h('span', { class: 'muted' }, `${i + 1} / ${list.length}`), h('button', { class: 'btn sec sm', disabled: i >= list.length - 1, onclick: () => go(i + 1) }, 'Agla ›'))));
}
window.addEventListener('popstate', async () => {
  if (S.mode === 'gate') return;
  if (cur) { try { await cur.flush(); } catch {} }
  const st = history.state || { v: 'home' };
  if (st.v === 'page') return openPage(st.id, false, true);
  if (st.v === 'settings') return openSettings(true);
  home();
});

function pageMenu(p, ed) {
  const m = modal('Page ki settings', h('div', {},
    h('p', { class: 'sub' }, 'Date'), h('input', { class: 'field', type: 'date', value: p.day, onchange: (e) => { if (e.target.value) { p.day = e.target.value; ed.sheet.querySelector('.phead').replaceWith(pageHeader(p)); ed.changed(); } } }),
    h('p', { class: 'sub' }, 'Title (list me dikhega)'), h('input', { class: 'field', value: p.title, maxlength: 60, placeholder: 'Optional', oninput: (e) => { p.title = e.target.value; ed.changed(); } }),
    h('p', { class: 'sub' }, 'Paper'), chips({ lined: 'Lined', dots: 'Dotted', grid: 'Grid', plain: 'Plain' }, p.paper, (k) => { p.paper = k; ed.sheet.className = 'sheet editing paper-' + k; ed.changed(); }),
    h('label', { class: 'sw' }, h('input', { type: 'checkbox', checked: p.shared, onchange: (e) => { p.shared = e.target.checked; ed.changed(); } }), h('span', {}, 'Share links walon ko ye page dikhao')),
    h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Ye page hamesha ke liye delete karna hai?')) return; await api('owner/pages/' + p.id, 'DELETE'); S.pages = S.pages.filter((x) => x.id !== p.id); cur = null; m.close(); history.back(); } }, 'Page delete karo'),
    h('button', { class: 'btn', onclick: () => m.close() }, 'Ho gaya')));
}

async function openSettings(noPush) {
  if (!noPush) push({ v: 'settings' });
  const [lk, st, sg] = await Promise.all([api('owner/links'), api('owner/settings'), api('owner/storage')]);
  let links = lk.links; S.settings = st; cur = null;
  const box = h('div', { class: 'set' });
  const draw = () => {
    const nm = h('input', { class: 'field', value: S.name, maxlength: 40, onchange: async (e) => { S.name = e.target.value || 'Meri Dayri'; await api('owner/settings', 'POST', { name: S.name }); toast('Naam save'); } });
    const cp = h('input', { class: 'field', type: 'password', placeholder: 'Purana password', autocomplete: 'current-password' }), np = h('input', { class: 'field', type: 'password', placeholder: 'Naya password (8+ akshar)', autocomplete: 'new-password' });
    const reload = async () => { links = (await api('owner/links')).links; draw(); };
    const llist = links.map((l) => h('div', { class: 'lk' + (l.revoked ? ' off' : '') }, h('b', {}, l.label), h('small', {}, l.revoked ? 'band' : l.lastOpened ? 'last khola: ' + new Date(l.lastOpened).toLocaleDateString() : 'abhi khola nahi'),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn sm sec', onclick: async () => { try { await navigator.clipboard.writeText(l.url); toast('Link copy ho gaya'); } catch { prompt('Link copy karo', l.url); } } }, 'Copy link'),
        h('button', { class: 'btn sm sec', onclick: async () => { const p = prompt('Naya passcode (4+ akshar). Purane log dobara passcode daalenge.'); if (!p) return; try { await api(`owner/links/${l.id}/passcode`, 'POST', { passcode: p }); toast('Passcode badal gaya'); } catch (e) { toast(e.message); } } }, 'Passcode'),
        h('button', { class: 'btn sm sec', onclick: async () => { if (!confirm('Naya link banega, purana band ho jayega.')) return; await api(`owner/links/${l.id}/regenerate`, 'POST'); reload(); } }, 'Naya link'),
        h('button', { class: 'btn sm sec', onclick: async () => { await api(`owner/links/${l.id}/revoke`, 'POST', { revoked: !l.revoked }); reload(); } }, l.revoked ? 'Chalu' : 'Band'),
        h('button', { class: 'btn sm danger', onclick: async () => { if (!confirm('Ye link hamesha ke liye delete?')) return; await api('owner/links/' + l.id, 'DELETE'); reload(); } }, 'Delete'))));
    const ll = h('input', { class: 'field', placeholder: 'Kiske liye (naam)' }), lp = h('input', { class: 'field', placeholder: 'Passcode (4+ akshar)' });
    box.replaceChildren(
      h('h3', {}, 'Dikhawa'), h('p', { class: 'sub' }, 'Theme'), chips({ auto: 'Auto', light: 'Light', dark: 'Dark' }, localStorage.getItem('theme') || 'auto', (k) => { applyTheme(k); api('owner/settings', 'POST', { theme: k }); }),
      h('p', { class: 'sub' }, 'Naye page ka paper'), chips({ lined: 'Lined', dots: 'Dotted', grid: 'Grid', plain: 'Plain' }, st.paper, (k) => { S.settings.paper = k; api('owner/settings', 'POST', { paper: k }); }),
      h('p', { class: 'sub' }, 'Dayri ka naam'), nm,
      h('h3', {}, 'Password'), h('p', { class: 'hint' }, 'Password badalne par saare devices aur share links ke log dobara login karenge.'), cp, np,
      h('button', { class: 'btn', onclick: async () => { try { await api('owner/password', 'POST', { current: cp.value, next: np.value }); cp.value = np.value = ''; toast('Password badal gaya'); } catch (e) { toast(e.message, 3500); } } }, 'Password badlo'),
      h('h3', {}, 'Share links'), h('p', { class: 'hint' }, 'Har insaan ko alag link + passcode. Wo sirf wahi pages padh sakta hai jo tumne "share" kiye hain, kuch badal nahi sakta.'),
      ...(llist.length ? llist : [h('p', { class: 'muted' }, 'Abhi koi link nahi.')]),
      h('div', { class: 'newlink' }, ll, lp, h('button', { class: 'btn', onclick: async () => { try { await api('owner/links', 'POST', { label: ll.value, passcode: lp.value }); toast('Naya link ban gaya'); reload(); } catch (e) { toast(e.message); } } }, 'Naya share link banao')),
      h('h3', {}, 'Storage'), h('p', { class: 'muted' }, `${(sg.bytes / 1024 / 1024).toFixed(1)} MB use hua, ${sg.files} files (free limit lagbhag 1 GB).`),
      h('button', { class: 'btn sec', onclick: async () => { const r = await api('owner/storage', 'POST'); toast(`${r.removed} bekaar file hata di`); } }, 'Bekaar files saaf karo'),
      h('h3', {}, 'Account'), h('button', { class: 'btn sec', onclick: async () => { await api('owner/logout', 'POST'); gateOwner(); } }, 'Logout'));
  };
  draw();
  root.replaceChildren(h('div', { class: 'home settings' }, topbar(iconBtn('back', () => history.back(), 'back'), h('div', { class: 'ttl' }, 'Settings'), null), box));
}

(function boot() {
  const p = location.pathname;
  const mm = /^\/r\/([\w-]{8,64})/.exec(p);
  if (mm) return startViewer(mm[1]).catch(() => toast('Kuch gadbad hui'));
  if (p === '/owner') return startOwner().catch(() => gateOwner());
  root.replaceChildren(h('div', { class: 'gate' }, lockSeal(), h('h1', {}, 'Private dayri'), h('p', { class: 'muted' }, 'Ye ek niji dayri hai. Link ke bina yahan kuch nahi hai.')));
})();
