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
  chart: svg('<path d="M5 20v-6M10 20V6M15 20v-9M20 20v-4"/><path d="M3 20h18"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  bell: svg('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
  card: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10M7 14h6"/>'),
  finger: svg('<path d="M12 11a3 3 0 0 0-3 3c0 2.5.8 4.7 1.7 6.5M12 11a3 3 0 0 1 3 3c0 1.5-.2 3-.6 4.4M12 11V9a5 5 0 0 1 10 0v4c0 2-.3 4-.9 5.8M7 9a5 5 0 0 1 5-4.5M4.5 12.5c.3 3 1.2 5.6 2.4 7.7"/>'),
  download: svg('<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'),
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
const MOODMAP = { khush: ['\u{1F60A}', 'Happy', 5], pyaar: ['\u2764\uFE0F', 'Love', 5], umeed: ['\u{1F308}', 'Hopeful', 4], shaant: ['\u{1F60C}', 'Calm', 4], yaad: ['\u{1F940}', 'Nostalgic', 3], thakaan: ['\u{1F634}', 'Tired', 2], gussa: ['\u{1F620}', 'Angry', 1], udaas: ['\u{1F622}', 'Sad', 1] };
const todayStrLocal = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const b64ToU8 = (b) => { const p = '='.repeat((4 - b.length % 4) % 4), x = atob((b + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(x, (c) => c.charCodeAt(0)); };

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
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('Could not open the video')); });
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
  const act = (fn) => (e) => { if (ctx.edit) return; e.stopPropagation(); if (!it.mid) return toast('No audio file is attached to this song, only the name'); const c = audioFor(it.mid, state); fn(c.a); state(); };
  play.onclick = act((a) => (a.paused ? a.play().catch(() => toast('Could not play')) : a.pause()));
  const art = it.cover ? h('img', { class: 'art', src: mediaUrl(it.cover), alt: '' }) : h('div', { class: 'art' });
  setTimeout(state);
  return h('div', { class: 'mp' }, art, h('div', { class: 'mi' }, h('small', {}, 'currently listening'), h('div', { class: 'mt' }, it.title || 'Song'), h('div', { class: 'ma' }, it.artist || '')),
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
  const wc = () => { let n = 0; for (const it of page.items || []) { if (it.t === 'text' && it.text) n += it.text.trim().split(/\s+/).filter(Boolean).length; } return n; };
  const save = async () => {
    status.textContent = 'Saving…';
    try { await api('owner/pages', 'POST', page); status.textContent = 'Saved ✓ · ' + wc() + ' words'; }
    catch (e) { status.textContent = 'Save failed, retrying…'; clearTimeout(saveT); saveT = setTimeout(save, 4000); }
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
        btn('text', 'Text', () => { const n = ed.add({ t: 'text', text: '', font: 'kalam', size: 20, w: 220, color: 'auto', align: 'left', r: 0 }); textModal(n, ed); }),
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
      btn('trash', 'Delete', () => { if (!confirm('Remove this?')) return; page.items = page.items.filter((i) => i.id !== it.id); el(it.id).remove(); sheet._els.delete(it.id); ed.sel = null; drawBar(); ed.changed(); }, 'danger'),
      h('button', { class: 'tb done', onclick: () => ed.select(null) }, 'Done'));
    bar.append(...b);
  }
  drawBar();
  const grow = h('button', { class: 'grow', onclick: () => { page.h = Math.min(6000, page.h + 320); sheet.style.height = page.h + 'px'; sheet._fit(); ed.changed(); } }, '+ Make page longer');
  ed.status = status; ed.node = h('div', { class: 'editor' }, sheetWrap, grow); ed.bar = bar; ed.sheet = sheet;
  ed.flush = () => { clearTimeout(saveT); return save(); };
  return ed;
}
async function addPhotos(ed) {
  const files = await pick('image/*', true); if (!files.length) return;
  for (const f of files) {
    try {
      toast('Adding photo…', 8000);
      const { blob, ar } = await shrinkImage(f); const mid = await upload(blob, f.name, 'image/jpeg');
      ed.add({ t: 'photo', mid, ar, w: 160, frame: 'polaroid', filter: 'none', cap: '' });
    } catch (e) { toast('Could not add photo: ' + e.message); }
  }
  toast('Photo added');
}
async function addVideo(ed) {
  const [f] = await pick('video/*', false); if (!f) return;
  try {
    toast('Turning the video into a short loop clip…', 60000);
    let r = await toLoop(f, (p) => toast(`Making loop clip ${Math.round(p * 100)}%`, 60000));
    if (!r) { if (f.size > 12 * 1024 * 1024) throw new Error('This phone cannot convert the video. Choose a video under 12 MB'); r = { blob: f, ar: 0.75 }; }
    toast('Uploading…', 60000);
    const mid = await upload(r.blob, 'clip', (r.blob.type || 'video/mp4').split(';')[0]);
    ed.add({ t: 'video', mid, ar: r.ar, w: 170, frame: 'polaroid', filter: 'none', cap: '' });
    toast('Clip added (' + (r.blob.size / 1024 / 1024).toFixed(1) + ' MB)');
  } catch (e) { toast('Could not add video: ' + e.message, 4000); }
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
  const m = modal('Frame and filter', h('div', {},
    h('p', { class: 'sub' }, 'Frame'), chips(FRAMES, it.frame || 'polaroid', (k) => { it.frame = k; ed.redraw(it); ed.changed(); }),
    h('p', { class: 'sub' }, 'Filter'), chips({ none: 'Original', warm: 'Warm', bw: 'B&W', vintage: 'Vintage', cool: 'Cool', fade: 'Fade' }, it.filter || 'none', (k) => { it.filter = k; ed.redraw(it); ed.changed(); }),
    h('p', { class: 'sub' }, 'Caption'), h('input', { class: 'field', value: it.cap || '', maxlength: 60, placeholder: 'Short caption (optional)', oninput: (e) => { it.cap = e.target.value; ed.redraw(it); ed.changed(); } }),
    h('button', { class: 'btn', onclick: () => m.close() }, 'Done')));
}
function textModal(it, ed) {
  const isLabel = it.t === 'label';
  const ta = h('textarea', { class: 'field', rows: isLabel ? 1 : 5, placeholder: 'Write here…' }, it.text || '');
  ta.oninput = () => { it.text = ta.value; ed.redraw(it); ed.changed(); };
  const body = h('div', {}, ta);
  if (!isLabel) {
    body.append(h('p', { class: 'sub' }, 'Font'), chips(Object.fromEntries(Object.entries(FONTSET).map(([k, v]) => [k, v[0]])), it.font || 'kalam', (k) => { it.font = k; ed.redraw(it); ed.changed(); }),
      h('p', { class: 'sub' }, 'Size'), h('input', { type: 'range', min: 12, max: 44, value: it.size || 18, oninput: (e) => { it.size = Number(e.target.value); ed.redraw(it); ed.changed(); } }),
      h('p', { class: 'sub' }, 'Alignment'), chips({ left: 'Left', center: 'Center', right: 'Right' }, it.align || 'left', (k) => { it.align = k; ed.redraw(it); ed.changed(); }),
      h('p', { class: 'sub' }, 'Colour'), h('div', { class: 'row' }, COLORS.map((c) => h('button', { class: 'cc' + ((it.color || 'auto') === c ? ' on' : ''), style: { background: c === 'auto' ? 'linear-gradient(135deg,#222 50%,#eee 50%)' : c }, onclick: (e) => { it.color = c; ed.redraw(it); ed.changed(); [...e.target.parentNode.children].forEach((x) => x.classList.remove('on')); e.target.classList.add('on'); } }))));
  }
  body.append(h('button', { class: 'btn', onclick: () => m.close() }, 'Done'));
  const m = modal(isLabel ? 'Label' : 'Text', body);
  setTimeout(() => ta.focus(), 250);
}
function noteModal(it, ed) {
  const t = h('input', { class: 'field', value: it.title || '', maxlength: 30, oninput: (e) => { it.title = e.target.value; ed.redraw(it); ed.changed(); } });
  const ta = h('textarea', { class: 'field', rows: 6, placeholder: 'Each line is a separate item' }, it.lines || '');
  ta.oninput = () => { it.lines = ta.value; ed.redraw(it); ed.changed(); };
  const m = modal('Torn note', h('div', {}, h('p', { class: 'sub' }, 'Title'), t, h('p', { class: 'sub' }, 'Lines'), ta, h('button', { class: 'btn', onclick: () => m.close() }, 'Done')));
}
function musicModal(it, ed) {
  const isNew = !it; const d = it || { t: 'music', title: '', artist: '', w: 190 };
  const title = h('input', { class: 'field', value: d.title, placeholder: 'Song name', maxlength: 60 }), artist = h('input', { class: 'field', value: d.artist, placeholder: 'Artist', maxlength: 60 });
  const info = h('p', { class: 'sub' }, d.mid ? 'Audio file attached' : 'Name only for now (it will not play)');
  let busy = false;
  const file = h('button', { class: 'btn sec', onclick: async () => {
    const [f] = await pick('audio/*,.mp3,.m4a,.aac,.wav,.ogg', false); if (!f) return;
    const mime = guessMime(f); if (!/^audio\//.test(mime)) return toast('Choose an audio file only (MP3/M4A)');
    if (f.size > 14 * 1024 * 1024) return toast('The song must be under 14 MB');
    busy = true; info.textContent = 'Uploading…';
    try { d.mid = await upload(f, f.name, mime); if (!title.value) title.value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '); info.textContent = 'Audio file added: ' + f.name; } catch (e) { info.textContent = 'Upload failed: ' + e.message; }
    busy = false;
  } }, 'Choose an audio file (MP3 / M4A)');
  const cover = h('button', { class: 'btn sec', onclick: async () => { const [f] = await pick('image/*', false); if (!f) return; try { const { blob } = await shrinkImage(f, 300); d.cover = await upload(blob, 'cover', 'image/jpeg'); toast('Cover added'); } catch (e) { toast('Could not add cover'); } } }, 'Cover photo (optional)');
  const m = modal('Add a song', h('div', {}, h('p', { class: 'sub' }, 'Title'), title, h('p', { class: 'sub' }, 'Artist'), artist, h('div', { class: 'gap' }), file, info, cover,
    h('p', { class: 'hint' }, 'You need to provide the song file yourself. Free storage is small, up to 14 MB.'),
    h('button', { class: 'btn', onclick: () => { if (busy) return toast('Wait for the upload to finish'); d.title = title.value.trim() || 'Song'; d.artist = artist.value.trim(); if (isNew) ed.add(d); else { ed.redraw(d); ed.changed(); } m.close(); } }, isNew ? 'Add to page' : 'Save')));
}

/* ---------- screens ---------- */

/* ---- PWA install ---- */
let deferredInstall = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if (S.mode === 'owner' && !cur) { const b = $('.instbar'); if (!b && !$('.settings')) home(); } });
window.addEventListener('appinstalled', () => { deferredInstall = null; localStorage.setItem('pwaDone', '1'); toast('App installed'); if (S.mode === 'owner' && !cur) home(); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
async function doInstall() {
  if (deferredInstall) { deferredInstall.prompt(); const c = await deferredInstall.userChoice.catch(() => ({})); deferredInstall = null; if (c.outcome !== 'accepted') toast('You can also install later from Settings'); return; }
  if (isIOS()) return iosHint();
  modal('Install the app', h('div', {}, h('p', { class: 'sub' }, 'In your browser menu (⋮), tap "Install app" or "Add to Home screen". This option appears in Chrome.')));
}
function iosHint() {
  modal('Install on iPhone', h('div', {}, h('p', { class: 'sub' }, 'Open this page in Safari. Tap Share (⬆︎) at the bottom, then "Add to Home Screen", then "Add".')));
}
function canOfferInstall() { return !S.readonly && !isStandalone(); }
function installBar() {
  if (!canOfferInstall() || localStorage.getItem('pwaHide') === '1' || (!deferredInstall && !isIOS())) return null;
  return h('div', { class: 'instbar' }, h('span', {}, 'Install the diary like an app'),
    h('button', { class: 'btn sm', onclick: doInstall }, 'Install'),
    h('button', { class: 'ib', 'aria-label': 'hide', onclick: (e) => { localStorage.setItem('pwaHide', '1'); e.currentTarget.parentNode.remove(); } }, '×'));
}
function installSection() {
  if (S.readonly) return [];
  if (isStandalone()) return [h('h3', {}, 'App'), h('p', { class: 'sub' }, 'The app is installed.')];
  return [h('h3', {}, 'App'), h('p', { class: 'sub' }, 'Run it from your home screen like an app, in full screen.'), h('button', { class: 'btn sec', onclick: doInstall }, 'Install app')];
}

let S = { mode: 'gate', pages: [], name: 'My Diary', token: null, readonly: false, year: new Date().getFullYear(), month: null, settings: { paper: 'lined', theme: 'auto' } };
let cur = null; // active editor, if any

function topbar(left, mid, right) { return h('div', { class: 'top' }, h('div', { class: 'l' }, left), h('div', { class: 'm' }, mid), h('div', { class: 'r' }, right)); }
const iconBtn = (name, fn, label) => h('button', { class: 'ib', onclick: fn, 'aria-label': label || name }, ico(name));
function themeBtn() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return iconBtn(dark ? 'sun' : 'moon', (e) => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; applyTheme(n); if (!S.readonly) api('owner/settings', 'POST', { theme: n }).catch(() => {}); e.currentTarget.replaceWith(themeBtn()); }, 'theme');
}
const lockSeal = () => h('div', { class: 'seal', html: IC.lock });

const PINRE = /^(\d{4}|\d{8})$/;
/* PIN helpers: manual Backspace (some numeric keypads don't send it through), plus on-screen backspace/clear keys. */
const pinKeys = (i, onEnter) => { i.onkeydown = (e) => { if (e.key === 'Backspace') { e.preventDefault(); i.value = i.value.slice(0, -1); } else if (e.key === 'Enter' && onEnter) onEnter(); }; };
const pinCtl = (get) => h('div', { class: 'pinctl' },
  h('button', { class: 'pkey', onpointerdown: (e) => { e.preventDefault(); const i = get(); i.value = i.value.slice(0, -1); i.focus(); }, 'aria-label': 'Backspace' }, '\u232B'),
  h('button', { class: 'pkey', onpointerdown: (e) => { e.preventDefault(); const i = get(); i.value = ''; i.focus(); }, 'aria-label': 'Clear' }, 'Clear'));
function gateOwner() {
  S.mode = 'gate'; document.title = 'Diary';
  const pw = h('input', { class: 'field pinin', type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '8', placeholder: '\u2022\u2022\u2022\u2022', autocomplete: 'current-password', 'aria-label': 'PIN' }), err = h('div', { class: 'err' });
  const go = async () => {
    err.textContent = '';
    if (!PINRE.test(pw.value)) { err.textContent = 'PIN must be 4 or 8 digits.'; return; }
    try {
      await api('owner/login', 'POST', { password: pw.value });
      sessionStorage.setItem('d_alive', '1');
      const bk = document.querySelector('.book');
      if (bk && !matchMedia('(prefers-reduced-motion: reduce)').matches) { bk.classList.add('open'); await new Promise((r) => setTimeout(r, 600)); }
      startOwner();
    }
    catch (e) { err.textContent = e.message; pw.value = ''; }
  };
  pinKeys(pw, go);
  root.replaceChildren(h('div', { class: 'gate' },
    h('div', { class: 'book' }, h('div', { class: 'bookin' },
      h('div', { class: 'btitle' }, 'My Diary'),
      h('div', { class: 'bsub' }, 'For the owner only'),
      lockSeal(), pw, pinCtl(() => pw), err,
      h('button', { class: 'btn', onclick: go }, 'Open'))),
    h('button', { class: 'linklike', onclick: () => resetModal() }, 'Forgot PIN? Reset it')));
  const rl = /^#reset=([A-Za-z0-9]+)$/.exec(location.hash);
  if (rl) { history.replaceState(null, '', location.pathname); setTimeout(() => resetModal(rl[1]), 250); }
}
function resetModal(prefill = '') {
  const key = h('input', { class: 'field', placeholder: 'Reset key (received on WhatsApp)', autocomplete: 'off', value: prefill });
  const p1 = h('input', { class: 'field', type: 'password', inputmode: 'numeric', maxlength: '8', placeholder: 'New PIN (4 or 8 digits)', autocomplete: 'off' });
  const p2 = h('input', { class: 'field', type: 'password', inputmode: 'numeric', maxlength: '8', placeholder: 'Repeat new PIN', autocomplete: 'off' });
  const err = h('div', { class: 'err' });
  let lastP = p1; p1.onfocus = () => { lastP = p1; }; p2.onfocus = () => { lastP = p2; };
  pinKeys(p1); pinKeys(p2, () => m.el.querySelector('.btn').click());
  const btn = h('button', { class: 'btn', onclick: async () => {
    err.textContent = '';
    const k = key.value.replace(/\s+/g, '');
    if (!k) { err.textContent = 'Enter the reset key.'; return; }
    if (!PINRE.test(p1.value)) { err.textContent = 'PIN must be 4 or 8 digits.'; return; }
    if (p1.value !== p2.value) { err.textContent = 'The two PINs do not match.'; return; }
    btn.disabled = true; btn.textContent = 'One second\u2026';
    try {
      await api('owner/reset', 'POST', { key: k, pin: p1.value });
      sessionStorage.setItem('d_alive', '1'); m.close(); toast('New PIN set'); startOwner();
    } catch (e) { err.textContent = e.message; btn.disabled = false; btn.textContent = 'Set a new PIN'; }
  } }, 'Set a new PIN');
  const m = modal('PIN reset', h('div', {},
    h('p', { class: 'hint' }, 'The reset key works only once. Setting a new PIN signs out all old logins.'),
    key, p1, p2, pinCtl(() => lastP), err, btn));
}
async function startOwner() {
  if (!sessionStorage.getItem('d_alive')) { try { await api('owner/logout', 'POST'); } catch {} return gateOwner(); }
  const me = await api('owner/me').catch(() => ({ owner: false }));
  if (!me.owner) return gateOwner();
  if (lockGet() && sessionStorage.getItem('d_unlock') !== '1') return lockScreen();
  const [pg, st] = await Promise.all([api('owner/pages'), api('owner/settings')]);
  S = { ...S, mode: 'owner', pages: pg.pages, name: st.name, readonly: false, settings: st };
  if (!localStorage.getItem('theme_synced')) { applyTheme(st.theme || 'auto'); localStorage.setItem('theme_synced', '1'); }
  home(true);
  setTimeout(localRemindCheck, 1500);
}
async function startViewer(token) {
  S.token = token; S.readonly = true; S.mode = 'viewer';
  const ok = await fetch(`/api/view/${token}/info`).then((r) => r.json()).then((j) => j.ok).catch(() => false);
  if (!ok) return root.replaceChildren(h('div', { class: 'gate' }, lockSeal(), h('h1', {}, 'Link is disabled'), h('p', { class: 'muted' }, 'This link has been disabled or is wrong.')));
  try { const j = await api(`view/${token}/pages`); S.pages = j.pages; S.name = j.name; return home(true); } catch (e) { if (e.status !== 401) throw e; }
  const pin = h('input', { class: 'field', type: 'password', placeholder: 'Passcode', autocomplete: 'off' }), err = h('div', { class: 'err' });
  const go = async () => { err.textContent = ''; try { await api(`view/${token}/unlock`, 'POST', { passcode: pin.value }); const j = await api(`view/${token}/pages`); S.pages = j.pages; S.name = j.name; home(true); } catch (e) { err.textContent = e.message; } };
  pin.onkeydown = (e) => e.key === 'Enter' && go();
  root.replaceChildren(h('div', { class: 'gate' }, lockSeal(), h('h1', {}, 'A private diary'), h('p', { class: 'muted' }, 'Enter the passcode you were given.'), pin, err, h('button', { class: 'btn', onclick: go }, 'Open')));
}

function push(state) { history.pushState(state, ''); window.scrollTo(0, 0); }
function otdSection() {
  const t = new Date(), m = t.getMonth(), dd = t.getDate(), y = t.getFullYear();
  const old = S.pages.filter((p) => { const d = parseDay(p.day); return d.getMonth() === m && d.getDate() === dd && d.getFullYear() < y; }).sort((a, b) => (a.day < b.day ? 1 : -1));
  if (!old.length) return null;
  return h('div', { class: 'otd' }, h('p', { class: 'sub' }, '\u2728 On this day, in earlier years'), h('div', { class: 'cards' }, old.map(card)));
}
const fmtDay = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
function streakInfo() {
  const days = new Set(S.pages.map((p) => p.day));
  let streak = 0; const t = new Date();
  if (!days.has(fmtDay(t))) t.setDate(t.getDate() - 1);
  while (days.has(fmtDay(t))) { streak++; t.setDate(t.getDate() - 1); }
  return streak;
}
const PROMPTS = ['What was the most beautiful moment today?', 'What are you truly thankful for today?', 'Who made you laugh today, and why?', 'What was the biggest lesson this week?', 'If today were a colour, which would it be?', 'What news or what someone said stuck with you today?', 'Write one sweet memory from your childhood.', 'Did you learn or feel something new today?', 'Which song is stuck in your head today?', 'Something someone said today that touched you.', 'Today\u2019s weather and your mood - how was it?', 'A wish that woke up again today.', 'Did you share something from the heart with someone today?', 'What did you do for yourself today?', 'Did you think of an old friend today? What was the memory?', 'The hardest and the easiest thing you did today.', 'One habit to drop, one habit to build.', 'Write down one small win from today.', 'One hope for tomorrow.', 'Did you burst out laughing around someone today? Write that moment.', 'A smell or taste from home that you remembered.', 'Today in two lines of shayari.', 'What are you waiting for the most?', 'Did you make a decision today? The thinking behind it.', 'Which place did you feel like going to today?', 'Money, time or love - which one made you think today?', 'An old photo or message you came across today.', 'What are you thinking about before sleep tonight?', 'The best day of this month so far?', 'What made you angry today, and what happened next?', 'Make one promise to yourself and write it down.'];
function promptBar() {
  if (S.readonly) return null;
  const now = new Date(), start = new Date(now.getFullYear(), 0, 0);
  const q = PROMPTS[Math.floor((now - start) / 86400000) % PROMPTS.length];
  const today = S.pages.find((p) => p.day === todayStr());
  return h('button', { class: 'prompt', onclick: () => (today ? openPage(today.id) : newPage()) },
    h('span', { class: 'pl' }, 'Question of the day'), h('span', { class: 'pq' }, q));
}
function home(first) {
  if (first) history.replaceState({ v: 'home' }, '');
  if (curAudio) curAudio.a.pause();
  cur = null; document.title = S.name;
  const y = S.year, byM = (m) => S.pages.filter((p) => { const d = parseDay(p.day); return d.getFullYear() === y && d.getMonth() === m; });
  const shown = S.pages.filter((p) => { const d = parseDay(p.day); return d.getFullYear() === y && (S.month == null || d.getMonth() === S.month); }).sort((a, b) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  const stats = (!S.readonly && S.pages.length) ? h('div', { class: 'stats' }, [streakInfo() > 1 ? streakInfo() + ' day streak' : '', S.pages.length + ' page' + (S.pages.length > 1 ? 's' : '')].filter(Boolean).join(' \u00b7 ')) : null;
  const tabs = h('div', { class: 'mtabs big' }, h('b', { class: S.month == null ? 'on' : '', onclick: () => { S.month = null; home(); } }, 'ALL'),
    MONTHS.map((n, i) => h('b', { class: (S.month === i ? 'on ' : '') + (byM(i).length ? 'has' : ''), onclick: () => { S.month = i; home(); } }, n)));
  const list = shown.length ? shown.map(card) : [h('div', { class: 'empty' }, h('div', { class: 'big', html: STK.sprig }), h('p', {}, S.readonly ? 'No pages shared this month.' : 'No pages yet. Tap + below and write a page for today.'))];
  root.replaceChildren(h('div', { class: 'home' },
    topbar(null, h('div', { class: 'ttl' }, S.name), [iconBtn('search', searchScreen, 'khojo'), S.readonly ? null : iconBtn('chart', () => moodScreen(), 'mood'), themeBtn(), S.readonly ? null : iconBtn('gear', openSettings, 'settings')]),
    h('div', { class: 'yr' }, iconBtn('back', () => { S.year--; home(); }), h('b', {}, y), h('button', { class: 'ib flip', onclick: () => { S.year++; home(); }, html: IC.back })),
    installBar(), shayariBtn(), tabs, stats, promptBar(), otdSection(), h('div', { class: 'cards' }, list),
    S.readonly ? null : h('button', { class: 'fab', onclick: newPage, 'aria-label': 'new page' }, ico('plus'))));
}

/* ---------- Saari Shayari: one scrolling list of all shayari pages ---------- */
const isShayari = (p) => (p.tags || []).includes('shayari');
function shayariBtn() {
  const n = S.pages.filter(isShayari).length;
  if (!n) return null;
  return h('button', { class: 'shbtn', onclick: () => shayariScreen() }, h('span', {}, '\ud83d\udcd6 All Shayari'), h('small', {}, n + ' shayari'));
}
function shayariScreen(noPush) {
  if (!noPush) push({ v: 'shayari' });
  if (curAudio) curAudio.a.pause();
  cur = null;
  const list = S.pages.filter(isShayari).sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const cards = list.map((p) => {
    const d = parseDay(p.day), first = p.items.find((i) => i.t === 'photo');
    const txs = p.items.filter((i) => i.t === 'text' && i.text).sort((a, b) => b.text.length - a.text.length);
    const body = txs[0] ? txs[0].text : (p.title || '');
    return h('button', { class: 'shcard', onclick: () => openPage(p.id) },
      first ? h('img', { class: 'shth', src: mediaUrl(first.mid), alt: '', loading: 'lazy' }) : h('div', { class: 'shth empty-th', html: STK.flower }),
      h('div', { class: 'shm' }, h('div', { class: 'sht' }, body), h('div', { class: 'shd' }, d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear())));
  });
  root.replaceChildren(h('div', { class: 'home' },
    topbar(iconBtn('back', () => history.back(), 'back'), h('div', { class: 'ttl' }, 'All Shayari'), null),
    h('div', { class: 'stats' }, list.length + ' shayari'),
    h('div', { class: 'shlist' }, cards.length ? cards : [h('p', { class: 'muted', style: { padding: '26px', textAlign: 'center' } }, 'No shayari yet.')])));
  window.scrollTo(0, 0);
}
function card(p) {
  const d = parseDay(p.day), first = p.items.find((i) => i.t === 'photo'), txt = p.items.find((i) => i.t === 'text');
  return h('button', { class: 'card' + (p.pinned ? ' pinned' : ''), onclick: () => openPage(p.id) },
    h('div', { class: 'cd' }, h('b', {}, d.getDate()), h('small', {}, MONTHS[d.getMonth()]), p.mood && MOODMAP[p.mood] ? h('i', { class: 'cmood' }, MOODMAP[p.mood][0]) : null),
    h('div', { class: 'cm' }, h('div', { class: 'ct' }, p.title || (txt ? txt.text.split('\n')[0].slice(0, 40) : WD[d.getDay()] + ' page')), h('div', { class: 'cs' }, WD[d.getDay()] + ' · ' + p.items.length + ' items' + (!S.readonly && p.shared ? ' · shared' : '') + ((p.tags || []).length ? ' · ' + p.tags.map((t) => '#' + t).join(' ') : ''))),
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
  if (fresh) toast('New page. Add anything from the bar below.');
}
function viewPage(p) {
  const list = S.pages.slice().sort((a, b) => (a.day < b.day ? -1 : 1)), i = list.findIndex((x) => x.id === p.id);
  const go = (n) => { const q = list[n]; if (q) { history.replaceState({ v: 'page', id: q.id }, ''); viewPage(q); window.scrollTo(0, 0); } };
  const sw = renderSheet(p, { onTab: (m) => { S.month = m; S.year = parseDay(p.day).getFullYear(); history.back(); } });
  let sx = null;
  root.replaceChildren(h('div', { class: 'page-screen read', ontouchstart: (e) => (sx = e.touches[0].clientX), ontouchend: (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (dx > 90) go(i - 1); else if (dx < -90) go(i + 1); } },
    topbar(iconBtn('back', () => history.back(), 'back'), h('div', { class: 'ttl sm' }, p.title || ''), themeBtn()), h('div', { class: 'editor' }, sw),
    h('div', { class: 'nav' }, h('button', { class: 'btn sec sm', disabled: i <= 0, onclick: () => go(i - 1) }, '‹ Previous'), h('span', { class: 'muted' }, `${i + 1} / ${list.length}`), h('button', { class: 'btn sec sm', disabled: i >= list.length - 1, onclick: () => go(i + 1) }, 'Next ›'))));
}
window.addEventListener('popstate', async () => {
  if (S.mode === 'gate') return;
  if (cur) { try { await cur.flush(); } catch {} }
  const st = history.state || { v: 'home' };
  if (st.v === 'page') return openPage(st.id, false, true);
  if (st.v === 'settings') return openSettings(true);
  if (st.v === 'shayari') return shayariScreen(true);
  home();
});

function pageMenu(p, ed) {
  const m = modal('Page settings', h('div', {},
    h('p', { class: 'sub' }, 'Date'), h('input', { class: 'field', type: 'date', value: p.day, onchange: (e) => { if (e.target.value) { p.day = e.target.value; ed.sheet.querySelector('.phead').replaceWith(pageHeader(p)); ed.changed(); } } }),
    h('p', { class: 'sub' }, 'Title (shown in the list)'), h('input', { class: 'field', value: p.title, maxlength: 60, placeholder: 'Optional', oninput: (e) => { p.title = e.target.value; ed.changed(); } }),
    h('p', { class: 'sub' }, 'Paper'), chips({ lined: 'Lined', dots: 'Dotted', grid: 'Grid', plain: 'Plain' }, p.paper, (k) => { p.paper = k; ed.sheet.className = 'sheet editing paper-' + k; ed.changed(); }),
    h('p', { class: 'sub' }, 'Mood'), h('div', { class: 'chips' }, h('button', { class: 'chip' + (!p.mood ? ' on' : ''), onclick: (e) => { p.mood = ''; [...e.target.parentNode.children].forEach((c) => c.classList.remove('on')); e.target.classList.add('on'); ed.changed(); } }, '\u2014'), Object.entries(MOODMAP).map(([k, v]) => h('button', { class: 'chip' + (p.mood === k ? ' on' : ''), onclick: (e) => { p.mood = k; [...e.target.parentNode.children].forEach((c) => c.classList.remove('on')); e.target.classList.add('on'); ed.changed(); } }, v[0] + ' ' + v[1]))),
    h('p', { class: 'sub' }, 'Tags (separated by commas, e.g. shayari, friends)'), h('input', { class: 'field', value: (p.tags || []).join(', '), maxlength: 200, placeholder: '#shayari #memories', onchange: (e) => { p.tags = e.target.value.split(',').map((t) => t.replace(/^#+/, '').trim()).filter(Boolean).slice(0, 12); e.target.value = p.tags.join(', '); ed.changed(); } }),
    h('button', { class: 'btn sec', style: { marginTop: '14px' }, onclick: () => { m.close(); cardModal(p); } }, '\u{1F3B4} Make a shayari card (image)'),
    h('label', { class: 'sw' }, h('input', { type: 'checkbox', checked: p.shared, onchange: (e) => { p.shared = e.target.checked; ed.changed(); } }), h('span', {}, 'Show this page to people with share links')),
    h('button', { class: 'btn sec', onclick: async (e) => { try { const r = await api('owner/pin', 'POST', { id: p.id }); p.pinned = r.pinned; e.target.textContent = p.pinned ? '\u2605 Unpin' : '\u2606 Pin (keep at the top of the list)'; toast(p.pinned ? 'Page pinned' : 'Pin removed'); } catch (er) { toast(er.message); } } }, (p.pinned ? '\u2605 Unpin' : '\u2606 Pin (keep at the top of the list)')),
    h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Delete this page permanently?')) return; await api('owner/pages/' + p.id, 'DELETE'); S.pages = S.pages.filter((x) => x.id !== p.id); cur = null; m.close(); history.back(); } }, 'Delete page'),
    h('button', { class: 'btn', onclick: () => m.close() }, 'Done')));
}

async function openSettings(noPush) {
  if (!noPush) push({ v: 'settings' });
  const [lk, st, sg] = await Promise.all([api('owner/links'), api('owner/settings'), api('owner/storage')]);
  let links = lk.links; S.settings = st; cur = null;
  const box = h('div', { class: 'set' });
  const draw = () => {
    const nm = h('input', { class: 'field', value: S.name, maxlength: 40, onchange: async (e) => { S.name = e.target.value || 'My Diary'; await api('owner/settings', 'POST', { name: S.name }); toast('Save name'); } });
    const cp = h('input', { class: 'field', type: 'password', inputmode: 'numeric', maxlength: '8', placeholder: 'Current PIN', autocomplete: 'current-password' }), np = h('input', { class: 'field', type: 'password', inputmode: 'numeric', maxlength: '8', placeholder: 'New PIN (4 or 8 digits)', autocomplete: 'new-password' });
    const reload = async () => { links = (await api('owner/links')).links; draw(); };
    const llist = links.map((l) => h('div', { class: 'lk' + (l.revoked ? ' off' : '') }, h('b', {}, l.label), h('small', {}, l.revoked ? 'disabled' : l.lastOpened ? 'last opened: ' + new Date(l.lastOpened).toLocaleDateString() : 'not opened yet'),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn sm sec', onclick: async () => { try { await navigator.clipboard.writeText(l.url); toast('Link copied'); } catch { prompt('Copy link', l.url); } } }, 'Copy link'),
        h('button', { class: 'btn sm sec', onclick: async () => { const p = prompt('New passcode (4+ characters). People with the old one will need the new passcode.'); if (!p) return; try { await api(`owner/links/${l.id}/passcode`, 'POST', { passcode: p }); toast('Passcode changed'); } catch (e) { toast(e.message); } } }, 'Passcode'),
        h('button', { class: 'btn sm sec', onclick: async () => { if (!confirm('A new link will be created and the old one will stop working.')) return; await api(`owner/links/${l.id}/regenerate`, 'POST'); reload(); } }, 'New link'),
        h('button', { class: 'btn sm sec', onclick: async () => { await api(`owner/links/${l.id}/revoke`, 'POST', { revoked: !l.revoked }); reload(); } }, l.revoked ? 'Enable' : 'Disable'),
        h('button', { class: 'btn sm danger', onclick: async () => { if (!confirm('Delete this link permanently?')) return; await api('owner/links/' + l.id, 'DELETE'); reload(); } }, 'Delete'))));
    const ll = h('input', { class: 'field', placeholder: 'Who is it for (name)' }), lp = h('input', { class: 'field', placeholder: 'Passcode (4+ characters)' });
    box.replaceChildren(
      ...installSection(), h("h3", {}, "Dikhawa"), h('p', { class: 'sub' }, 'Theme'), chips({ auto: 'Auto', light: 'Light', dark: 'Dark' }, localStorage.getItem('theme') || 'auto', (k) => { applyTheme(k); api('owner/settings', 'POST', { theme: k }); }),
      h('p', { class: 'sub' }, 'Paper for new pages'), chips({ lined: 'Lined', dots: 'Dotted', grid: 'Grid', plain: 'Plain' }, st.paper, (k) => { S.settings.paper = k; api('owner/settings', 'POST', { paper: k }); }),
      h('p', { class: 'sub' }, 'Diary name'), nm,
      h('h3', {}, 'PIN'), h('p', { class: 'hint' }, 'Changing the PIN makes all devices and share-link viewers sign in again. PIN must be 4 or 8 digits.'), cp, np,
      h('button', { class: 'btn', onclick: async () => { try { await api('owner/password', 'POST', { current: cp.value, next: np.value }); cp.value = np.value = ''; toast('PIN changed'); } catch (e) { toast(e.message, 3500); } } }, 'Change PIN'),
      h('h3', {}, 'Share links'), h('p', { class: 'hint' }, 'Each person gets a separate link + passcode. They can only read the pages you have shared and cannot change anything.'),
      ...(llist.length ? llist : [h('p', { class: 'muted' }, 'No links yet.')]),
      h('div', { class: 'newlink' }, ll, lp, h('button', { class: 'btn', onclick: async () => { try { await api('owner/links', 'POST', { label: ll.value, passcode: lp.value }); toast('New link created'); reload(); } catch (e) { toast(e.message); } } }, 'Create a new share link')),
      h('h3', {}, 'App lock'), ...lockSection(),
      h('h3', {}, 'Nightly reminder'), ...remindSection(),
      h('h3', {}, 'Backup / Export'), ...backupSection(),
      h('h3', {}, 'Storage'), h('p', { class: 'muted' }, `${(sg.bytes / 1024 / 1024).toFixed(1)} MB used, ${sg.files} files (free limit is about 1 GB).`),
      h('button', { class: 'btn sec', onclick: async () => { const r = await api('owner/storage', 'POST'); toast(`${r.removed} unused files removed`); } }, 'Clean up unused files'),
      h('h3', {}, 'Account'), h('button', { class: 'btn sec', onclick: async () => { sessionStorage.removeItem('d_alive'); await api('owner/logout', 'POST'); gateOwner(); } }, 'Logout'));
  };
  draw();
  root.replaceChildren(h('div', { class: 'home settings' }, topbar(iconBtn('back', () => history.back(), 'back'), h('div', { class: 'ttl' }, 'Settings'), null), box));
}


/* ---------- new screens: search, mood, card, lock, reminder, backup ---------- */

function searchScreen() {
  push({ v: 'search' });
  let tag = null, query = '';
  const allTags = [...new Set(S.pages.flatMap((p) => p.tags || []))];
  const res = h('div', { class: 'cards' });
  const draw = () => {
    const ql = query.trim().toLowerCase();
    const hits = S.pages.filter((p) => {
      if (tag && !(p.tags || []).includes(tag)) return false;
      if (!ql) return true;
      const hay = [p.title, p.day, ...(p.tags || []).map((t) => '#' + t), ...p.items.filter((i) => ['text', 'label', 'note'].includes(i.t)).map((i) => (i.text || '') + '\n' + (i.lines || ''))].join('\n').toLowerCase();
      return ql.split(/\s+/).every((w) => hay.includes(w));
    }).sort((a, b) => (a.day < b.day ? 1 : -1));
    res.replaceChildren(...(hits.length ? hits.map(card) : [h('p', { class: 'muted', style: { padding: '26px', textAlign: 'center' } }, 'Nothing found.')]));
  };
  const inp = h('input', { class: 'field', placeholder: 'Search by word, #tag or date…', oninput: (e) => { query = e.target.value; draw(); } });
  const chipsRow = allTags.length ? h('div', { class: 'chips', style: { margin: '10px 16px' } }, allTags.map((t) => h('button', { class: 'chip', onclick: (e) => { tag = tag === t ? null : t; [...e.target.parentNode.children].forEach((c) => c.classList.remove('on')); if (tag) e.target.classList.add('on'); draw(); } }, '#' + t))) : null;
  draw();
  root.replaceChildren(h('div', { class: 'home' }, topbar(iconBtn('back', () => history.back(), 'back'), h('div', { class: 'ttl' }, 'Khojo'), null), h('div', { style: { padding: '6px 16px 0' } }, inp), chipsRow, res));
  setTimeout(() => inp.focus(), 250);
}

function moodScreen(noPush) {
  if (!noPush) push({ v: 'mood' });
  const nowD = new Date();
  if (S.moodY == null) { S.moodY = nowD.getFullYear(); S.moodM = nowD.getMonth(); }
  const y = S.moodY, m = S.moodM;
  const daysIn = new Date(y, m + 1, 0).getDate();
  const byDay = {};
  S.pages.forEach((p) => { const d = parseDay(p.day); if (d.getFullYear() === y && d.getMonth() === m && p.mood && MOODMAP[p.mood]) byDay[d.getDate()] = p.mood; });
  const firstWd = new Date(y, m, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstWd; i++) cells.push(h('span', { class: 'mc-e' }));
  for (let d = 1; d <= daysIn; d++) { const md = byDay[d]; cells.push(h('span', { class: 'mc-d' + (md ? ' on' : '') }, md ? MOODMAP[md][0] : String(d))); }
  const W2 = 520, H2 = 130, pd = 26;
  const pts = Object.entries(byDay).map(([d, md]) => [Number(d), MOODMAP[md][2]]).sort((a, b) => a[0] - b[0]);
  const X = (d) => pd + (d - 1) / (daysIn - 1 || 1) * (W2 - 2 * pd), Y = (sc) => H2 - pd - (sc - 1) / 4 * (H2 - 2 * pd);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
  const svgEl = pts.length > 1
    ? `<svg viewBox="0 0 ${W2} ${H2}" class="mgraph">${[1, 2, 3, 4, 5].map((sc) => `<line x1="${pd}" y1="${Y(sc)}" x2="${W2 - pd}" y2="${Y(sc)}" class="gl"/>`).join('')}<path d="${path}" class="ml"/>${pts.map((p) => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="4.5" class="md"/>`).join('')}</svg>`
    : '<p class="muted">You need moods from at least 2 days for the graph. Choose a mood in page settings.</p>';
  const counts = {};
  Object.values(byDay).forEach((md) => (counts[md] = (counts[md] || 0) + 1));
  const cnt = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([md, n]) => h('span', { class: 'chip' }, MOODMAP[md][0] + ' ' + MOODMAP[md][1] + ' × ' + n));
  const prevM = () => { S.moodM--; if (S.moodM < 0) { S.moodM = 11; S.moodY--; } moodScreen(true); };
  const nextM = () => { S.moodM++; if (S.moodM > 11) { S.moodM = 0; S.moodY++; } moodScreen(true); };
  root.replaceChildren(h('div', { class: 'home settings' },
    topbar(iconBtn('back', () => history.back(), 'back'), h('div', { class: 'ttl' }, 'Mood'), null),
    h('div', { class: 'yr' }, iconBtn('back', prevM), h('b', {}, MFULL[m] + ' ' + y), h('button', { class: 'ib flip', html: IC.back, onclick: nextM })),
    h('div', { class: 'mcal' }, ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => h('span', { class: 'mc-h' }, d)), cells),
    h('div', { class: 'set' }, h('h3', {}, 'Mood graph'), h('div', { html: svgEl }), h('h3', {}, 'This month'), cnt.length ? h('div', { class: 'chips' }, cnt) : h('p', { class: 'muted' }, 'No moods this month.'))));
}

/* ---- shayari card ---- */
const CARDSTYLES = {
  parchment: { bg: '#f6eeda', bg2: '#eee0c2', ink: '#4a3626', accent: '#7a3e2b', name: 'Parchment' },
  midnight: { bg: '#141c33', bg2: '#1e2a4a', ink: '#e6c27a', accent: '#e6c27a', name: 'Midnight Gold' },
  rose: { bg: '#f9e8ec', bg2: '#f2d4dc', ink: '#7b2d4a', accent: '#a04a68', name: 'Gulabi' },
};
async function drawCard(cv, text, st, meta) {
  try { await Promise.all([document.fonts.load('76px Yatra'), document.fonts.load('34px Kalam')]); } catch {}
  const x = cv.getContext('2d'), W2 = cv.width, H2 = cv.height;
  const g = x.createLinearGradient(0, 0, 0, H2); g.addColorStop(0, st.bg); g.addColorStop(1, st.bg2);
  x.fillStyle = g; x.fillRect(0, 0, W2, H2);
  x.strokeStyle = st.accent; x.lineWidth = 5; x.strokeRect(36, 36, W2 - 72, H2 - 72);
  x.lineWidth = 1.5; x.strokeRect(56, 56, W2 - 112, H2 - 112);
  x.fillStyle = st.accent;
  for (const [cx, cy] of [[36, 36], [W2 - 36, 36], [36, H2 - 36], [W2 - 36, H2 - 36]]) { x.beginPath(); x.arc(cx, cy, 10, 0, 7); x.fill(); }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const lines = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) { lines.push(''); continue; }
    let line = '';
    for (const w of para.trim().split(/\s+/)) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > W2 - 280 && line) { lines.push(line); line = w; } else line = t; }
    lines.push(line);
  }
  let fs = 80;
  while (fs > 28) { x.font = fs + 'px Yatra, serif'; if (!lines.some((l) => x.measureText(l).width > W2 - 240) && lines.length * fs * 1.55 < H2 - 480) break; fs -= 4; }
  x.font = fs + 'px Yatra, serif'; x.fillStyle = st.ink;
  const lh = fs * 1.55, y0 = H2 / 2 - (lines.length - 1) * lh / 2 - 40;
  lines.forEach((l, i) => x.fillText(l, W2 / 2, y0 + i * lh));
  x.font = '34px Kalam, cursive'; x.fillStyle = st.accent;
  x.fillText('~ ' + (meta.name || 'My Diary'), W2 / 2, H2 - 150);
  if (meta.date) { x.font = '28px Kalam, cursive'; x.fillText(meta.date, W2 / 2, H2 - 104); }
}
function cardModal(p) {
  const cv = h('canvas', { class: 'cardcv', width: 1080, height: 1350 });
  const texts = p.items.filter((i) => i.t === 'text' && (i.text || '').trim());
  let style = 'parchment';
  const ta = h('textarea', { class: 'field', rows: 6, placeholder: 'Write your shayari here…' }, texts.length ? texts[0].text : '');
  const d = parseDay(p.day);
  const redraw = () => drawCard(cv, ta.value.trim() || 'Write your shayari here…', CARDSTYLES[style], { name: S.name, date: d.getDate() + ' ' + MFULL[d.getMonth()] + ' ' + d.getFullYear() });
  ta.oninput = redraw;
  const pickRow = texts.length > 1 ? h('div', {}, h('p', { class: 'sub' }, 'Choose text from the page'), h('div', { class: 'chips' }, texts.map((t, i) => h('button', { class: 'chip', onclick: () => { ta.value = t.text; redraw(); } }, 'Text ' + (i + 1))))) : null;
  const m = modal('Shayari card', h('div', {},
    pickRow, ta,
    h('p', { class: 'sub' }, 'Style'), chips(Object.fromEntries(Object.entries(CARDSTYLES).map(([k, v]) => [k, v.name])), style, (k) => { style = k; redraw(); }),
    h('div', { class: 'cardprev' }, cv),
    h('div', { class: 'row', style: { marginTop: '12px', gap: '10px' } },
      h('button', { class: 'btn', onclick: () => cv.toBlob((b) => { const a = h('a', { href: URL.createObjectURL(b), download: 'shayari-card.png' }); document.body.append(a); a.click(); a.remove(); toast('Image downloaded'); }, 'image/png') }, 'Download'),
      h('button', { class: 'btn sec', onclick: () => cv.toBlob(async (b) => { const f = new File([b], 'shayari-card.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f] }); } catch {} } else toast('Sharing is not available in this browser, please download instead', 3500); }, 'image/png') }, 'Share'))));
  setTimeout(redraw, 80);
}

/* ---- app lock ---- */
const lockGet = () => { try { return JSON.parse(localStorage.getItem('applock') || 'null'); } catch { return null; } };
async function sha256hex(str) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); return [...new Uint8Array(b)].map((v) => v.toString(16).padStart(2, '0')).join(''); }
const bioAvailable = async () => { try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; } };
function lockScreen() {
  const lk = lockGet();
  const pw = h('input', { class: 'field', type: 'password', inputmode: 'numeric', placeholder: 'PIN', autocomplete: 'off' }), err = h('div', { class: 'err' });
  const go = async () => { err.textContent = ''; if (await sha256hex(lk.s + pw.value) === lk.h) { sessionStorage.setItem('d_unlock', '1'); startOwner(); } else err.textContent = 'Wrong PIN.'; };
  pinKeys(pw, go);
  const bioBtn = localStorage.getItem('applockCred') ? h('button', { class: 'btn sec', onclick: async () => {
    try {
      const id = b64ToU8(localStorage.getItem('applockCred'));
      await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ id, type: 'public-key' }], userVerification: 'required', timeout: 60000 } });
      sessionStorage.setItem('d_unlock', '1'); startOwner();
    } catch (e) { err.textContent = 'Fingerprint did not work, unlock with your PIN.'; }
  } }, 'Unlock with fingerprint / face') : null;
  root.replaceChildren(h('div', { class: 'gate' }, lockSeal(), h('h1', {}, 'My Diary'), h('p', { class: 'muted' }, 'App lock is on'), pw, pinCtl(() => pw), err, h('button', { class: 'btn', onclick: go }, 'Open'), bioBtn));
  if (bioBtn && localStorage.getItem('applockAuto') === '1') setTimeout(() => bioBtn.click(), 350);
}
function setPinModal() {
  const p1 = h('input', { class: 'field', type: 'password', inputmode: 'numeric', placeholder: 'New PIN (4-6 digits)' }), p2 = h('input', { class: 'field', type: 'password', inputmode: 'numeric', placeholder: 'Repeat PIN' }), err = h('div', { class: 'err' });
  let lastL = p1; p1.onfocus = () => { lastL = p1; }; p2.onfocus = () => { lastL = p2; };
  pinKeys(p1); pinKeys(p2);
  const m = modal('PIN lock', h('div', {}, p1, p2, pinCtl(() => lastL), err, h('button', { class: 'btn', onclick: async () => {
    if (!/^\d{4,6}$/.test(p1.value)) return err.textContent = 'PIN must be 4 to 6 digits.';
    if (p1.value !== p2.value) return err.textContent = 'The two PINs do not match.';
    const salt = Math.random().toString(36).slice(2);
    localStorage.setItem('applock', JSON.stringify({ s: salt, h: await sha256hex(salt + p1.value) }));
    m.close(); toast('App lock turned on');
    if (await bioAvailable()) addBio(); else openSettings(true);
  } }, 'Set')));
}
async function addBio() {
  if (!await bioAvailable()) { toast('Fingerprint lock is not available in this browser, PIN only', 4000); return openSettings(true); }
  try {
    const cred = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'My Diary' }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'owner', displayName: 'Owner' }, pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000 } });
    localStorage.setItem('applockCred', btoa(String.fromCharCode(...new Uint8Array(cred.rawId))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
    localStorage.setItem('applockAuto', '1');
    toast('Fingerprint lock added');
  } catch (e) { toast('Could not add fingerprint'); }
  openSettings(true);
}
function lockSection() {
  const lk = lockGet();
  if (!lk) return [h('p', { class: 'hint' }, 'Keeps the diary closed if someone else picks up your phone. PIN every time you open it, with optional fingerprint/face.'), h('button', { class: 'btn sec', onclick: setPinModal }, 'Turn on PIN lock')];
  return [h('p', { class: 'hint' }, 'App lock is on. It asks for the PIN every time you open the app (in addition to the owner password).'),
    h('div', { class: 'row wrap' },
      localStorage.getItem('applockCred') ? h('button', { class: 'btn sm sec', disabled: true }, 'Fingerprint added ✓') : h('button', { class: 'btn sm sec', onclick: addBio }, 'Add fingerprint'),
      h('button', { class: 'btn sm sec', onclick: () => { sessionStorage.removeItem('d_unlock'); lockScreen(); } }, 'Lock now'),
      h('button', { class: 'btn sm danger', onclick: async () => { const p = prompt('Enter your PIN to remove the lock'); if (!p) return; if (await sha256hex(lk.s + p) !== lk.h) return toast('Wrong PIN'); localStorage.removeItem('applock'); localStorage.removeItem('applockCred'); localStorage.removeItem('applockAuto'); toast('App lock removed'); openSettings(true); } }, 'Remove lock'))];
}

/* ---- reminder ---- */
function remindSection() {
  const st = h('p', { class: 'muted' }, '…');
  api('owner/push').then((r) => { st.textContent = r.on ? 'On: you will get a notification every night at 9 PM, even when the app is closed.' : (localStorage.getItem('remindLocal') === '1' ? 'On: the app will remind you in the evening when you open it (push is not available in this browser).' : 'Off.'); }).catch(() => { st.textContent = ''; });
  return [h('p', { class: 'hint' }, 'Reminds you at 9 PM if you have not written a page today.'), st,
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn sm sec', onclick: enableReminder }, 'Turn on reminder'),
      h('button', { class: 'btn sm sec', onclick: disableReminder }, 'Turn off'))];
}
async function enableReminder() {
  try {
    if (!('Notification' in window)) throw new Error('x');
    if (await Notification.requestPermission() !== 'granted') throw new Error('x');
    if (!navigator.serviceWorker) throw new Error('x');
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) throw new Error('x');
    const { key } = await api('owner/vapid');
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) });
    await api('owner/push', 'POST', { sub: sub.toJSON() });
    toast('9 PM reminder turned on');
  } catch (e) {
    localStorage.setItem('remindLocal', '1');
    toast('Push is not supported in this browser; the app will remind you in the evening when you open it', 4500);
  }
  openSettings(true);
}
async function disableReminder() {
  localStorage.removeItem('remindLocal');
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) { await api('owner/push', 'DELETE', { endpoint: sub.endpoint }); await sub.unsubscribe(); } } catch {}
  toast('Reminder turned off'); openSettings(true);
}
function localRemindCheck() {
  if (S.readonly || localStorage.getItem('remindLocal') !== '1') return;
  const today = todayStrLocal();
  if (new Date().getHours() < 19) return;
  if (S.pages.some((p) => p.day === today)) return;
  if (localStorage.getItem('remindDone') === today) return;
  localStorage.setItem('remindDone', today);
  if ('Notification' in window && Notification.permission === 'granted') new Notification('My Diary', { body: 'Your page for today is still unwritten' });
  else toast('Your page for today is still unwritten ✍️', 5000);
}

/* ---- backup / export ---- */
const mediaIds = (items) => { const o = []; for (const it of items || []) for (const k of ['mid', 'cover']) if (it && typeof it[k] === 'string') o.push(it[k]); return o; };
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (u8) => { let c = ~0; for (let i = 0; i < u8.length; i++) c = crcTable[(c ^ u8[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };
function zipStore(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, name.length, true);
    parts.push(new Uint8Array(lh.buffer), name, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(6, 20, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), name);
    off += 30 + name.length + sz;
  }
  const cSize = central.reduce((a, c) => a + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cSize, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
function backupSection() {
  return [h('p', { class: 'hint' }, 'Download all pages + photos/videos/songs as one ZIP file, or make a PDF. Keep it somewhere safe.'),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn sm sec', onclick: doBackup }, 'Backup download (ZIP)'),
      h('button', { class: 'btn sm sec', onclick: () => exportScreen() }, 'PDF / Print'))];
}
async function doBackup() {
  try {
    toast('Making backup…', 60000);
    const data = await api('owner/export');
    const files = [{ name: 'dayri-data.json', data: new TextEncoder().encode(JSON.stringify(data, null, 2)) }];
    const ids = [...new Set(data.pages.flatMap((p) => mediaIds(p.items)))];
    let n = 0;
    for (const id of ids) {
      try {
        const r = await fetch('/m/' + id, { credentials: 'same-origin' });
        if (!r.ok) continue;
        const mime = r.headers.get('content-type') || '';
        const ext = mime.includes('png') ? '.png' : mime.includes('webm') ? '.webm' : mime.includes('mp4') ? '.mp4' : mime.startsWith('audio') ? '.mp3' : '.jpg';
        files.push({ name: 'media/' + id + ext, data: new Uint8Array(await r.arrayBuffer()) });
        toast(`Backup: ${++n}/${ids.length} files`, 60000);
      } catch {}
    }
    const blob = zipStore(files);
    const a = h('a', { href: URL.createObjectURL(blob), download: 'dayri-backup-' + todayStrLocal() + '.zip' }); document.body.append(a); a.click(); a.remove();
    toast(`Backup ready (${(blob.size / 1024 / 1024).toFixed(1)} MB, ${files.length - 1} media files)`, 5000);
  } catch (e) { toast('Backup failed: ' + e.message, 4000); }
}
function exportScreen() {
  push({ v: 'export' });
  const nowD = new Date();
  const ranges = { all: 'All pages', year: 'This year (' + nowD.getFullYear() + ')', month: 'This month' };
  let range = 'all';
  const box = h('div', { class: 'printpages' });
  const draw = () => {
    const ps = S.pages.filter((p) => { const d = parseDay(p.day); if (range === 'year') return d.getFullYear() === nowD.getFullYear(); if (range === 'month') return d.getFullYear() === nowD.getFullYear() && d.getMonth() === nowD.getMonth(); return true; }).sort((a, b) => (a.day < b.day ? -1 : 1));
    box.replaceChildren(...(ps.length ? ps.map((p) => h('div', { class: 'printpage' }, renderSheet(p, {}))) : [h('p', { class: 'muted', style: { padding: '30px', textAlign: 'center' } }, 'No pages in this range.')]));
  };
  draw();
  root.replaceChildren(h('div', { class: 'home exportscreen' },
    topbar(iconBtn('back', () => history.back(), 'back'), h('div', { class: 'ttl' }, 'PDF / Print'), null),
    h('div', { class: 'set noprint' }, h('p', { class: 'hint' }, 'Pages are ready below. Tap "Print" and choose "Save as PDF" as the destination.'), chips(ranges, range, (k) => { range = k; draw(); }), h('button', { class: 'btn printbtn', onclick: () => window.print() }, 'Print / Save as PDF')),
    box));
}

(function boot() {
  const p = location.pathname;
  const mm = /^\/r\/([\w-]{8,64})/.exec(p);
  if (mm) return startViewer(mm[1]).catch(() => toast('Something went wrong'));
  if (p === '/owner') return startOwner().catch(() => gateOwner());
  root.replaceChildren(h('div', { class: 'gate' }, lockSeal(), h('h1', {}, 'Private diary'), h('p', { class: 'muted' }, 'This is a private diary. There is nothing here without the link.')));
})();
