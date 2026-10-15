(() => {
const $app = document.getElementById('app');
const $toast = document.getElementById('toast');

/* ---------- helpers ---------- */
const ICONS = {
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M9 8h6M9 12h4"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  check: '<path d="m5 12 5 5L20 7"/>', share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
};
const icon = (n) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.innerHTML = ICONS[n]; return s; };
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'value') e.value = v; else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(c)); }
  return e;
}
const toast = (m) => { $toast.textContent = m; $toast.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => $toast.classList.remove('show'), 2200); };
const api = async (path, method = 'GET', body) => {
  const r = await fetch('/api/' + path, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) { const e = new Error(j.error || 'Error'); e.status = r.status; throw e; }
  return j;
};
const MOODS = { khush: ['Khush', '#f2b134'], udaas: ['Udaas', '#6b8bd6'], shaant: ['Shaant', '#5fbf9c'], gussa: ['Gussa', '#e0533d'], pyaar: ['Pyaar', '#e86a9a'], thakaan: ['Thakaan', '#9a8f86'], umeed: ['Umeed', '#78c95f'], yaad: ['Yaad', '#b58ae6'] };
const FONTS = { kalam: 'Kalam', caveat: 'Caveat', yatra: 'Yatra' };
const fmtDate = (t) => new Date(t).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
const toLocalInput = (t) => { const d = new Date(t - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };

/* theme */
function setTheme(t) { document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); document.querySelector('meta[name=theme-color]').content = t === 'dark' ? '#0b0d1f' : '#e9d3b0'; }
setTheme(localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
const themeBtn = () => h('button', { class: 'ib', 'aria-label': 'Dark / Light', onclick: (e) => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); e.currentTarget.replaceChildren(icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')); } }, icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon'));
const mount = (...n) => { $app.replaceChildren(...n.flat().filter(Boolean)); window.scrollTo(0, 0); };
const moodChip = (m) => m && MOODS[m] ? h('span', { class: 'badge' }, h('span', { class: 'dot', style: `--mc:${MOODS[m][1]}` }), MOODS[m][0]) : null;

/* ---------- landing ---------- */
function landing() {
  document.title = 'Diary';
  mount(h('div', { class: 'gate fade' }, h('div', { class: 'cover' }, icon('lock')), h('h1', { class: 'hd' }, 'Private Diary'), h('p', { class: 'muted' }, 'Yahan sirf invite wale aa sakte hain.')));
}

/* ---------- viewer ---------- */
async function viewer(token) {
  document.title = 'Diary';
  const ok = await api(`view/${token}/info`).then((j) => j.ok).catch(() => false);
  if (!ok) return mount(h('div', { class: 'gate fade' }, h('div', { class: 'cover' }, icon('lock')), h('h1', { class: 'hd' }, 'Link band hai'), h('p', { class: 'muted' }, 'Ye link ab kaam nahi karta. Jisne bheja usse naya link maango.')));
  try { const j = await api(`view/${token}/entries`); return book(token, j.entries); } catch (e) { if (e.status !== 401) throw e; }
  unlock(token);
}
function unlock(token) {
  const err = h('div', { class: 'err' });
  const pin = h('input', { class: 'pin', type: 'password', inputmode: 'text', autocomplete: 'off', maxlength: 32, placeholder: '••••', 'aria-label': 'Passcode' });
  const go = async () => {
    if (pin.value.length < 4) { err.textContent = 'Passcode kam se kam 4 akshar ka hai.'; return; }
    err.textContent = ''; btn.disabled = true;
    try { await api(`view/${token}/unlock`, 'POST', { passcode: pin.value }); const j = await api(`view/${token}/entries`); book(token, j.entries); }
    catch (e) { err.textContent = e.message; pin.value = ''; pin.focus(); } finally { btn.disabled = false; }
  };
  const btn = h('button', { class: 'btn', onclick: go }, icon('book'), 'Diary kholo');
  pin.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  mount(h('div', { class: 'gate fade' }, h('div', { class: 'cover' }, icon('book')), h('h1', { class: 'hd' }, 'Meri Diary'), h('p', { class: 'muted' }, 'Ye diary sirf tumhare liye hai.'),
    h('div', { class: 'glass card' }, h('div', { style: 'text-align:center;font-weight:500;margin-bottom:12px' }, 'Passcode daalo'), pin, err, h('div', { style: 'margin-top:14px' }, btn)),
    h('div', { class: 'lock' }, icon('lock'), 'Private. Tum sirf padh sakte ho.'), h('div', { style: 'margin-top:18px;display:flex;justify-content:center' }, themeBtn())));
  setTimeout(() => pin.focus(), 50);
}
function book(token, entries) {
  let i = Math.max(0, entries.length - 1), dir = 'fwd';
  const draw = () => {
    if (!entries.length) return mount(h('div', { class: 'top' }, h('div', { class: 't' }, 'Meri Diary'), themeBtn()), h('div', { class: 'empty glass' }, h('div', { class: 'hd' }, 'Abhi koi page nahi'), 'Jab naya page share hoga, yahan dikhega.'));
    const e = entries[i];
    const page = h('div', { class: 'page ' + (dir === 'back' ? 'back' : '') },
      h('div', { class: 'pgmeta' }, h('div', { class: 'd' }, fmtDate(e.at) + ' \u2022 ' + fmtTime(e.at)), e.title ? h('div', { class: 'hd' }, e.title) : null, h('div', { style: 'margin-top:6px' }, moodChip(e.mood))),
      h('div', { class: 'paper f-' + e.font }, h('div', { class: 'txt' }, e.body)));
    let sx = 0; page.addEventListener('touchstart', (ev) => (sx = ev.touches[0].clientX), { passive: true });
    page.addEventListener('touchend', (ev) => { const dx = ev.changedTouches[0].clientX - sx; if (Math.abs(dx) > 70) go(dx < 0 ? 1 : -1); });
    mount(h('div', { class: 'top' }, h('div', { class: 't' }, 'Meri Diary'), h('div', { class: 'row' }, h('button', { class: 'ib', 'aria-label': 'Saare pages', onclick: sheet }, icon('list')), themeBtn())),
      h('div', { class: 'book fade' }, h('div', { class: 'page-wrap' }, page),
        h('div', { class: 'pn' }, h('button', { class: 'btn sec sm', disabled: i === 0, onclick: () => go(-1) }, icon('left'), 'Pichla'), h('div', { class: 'mid' }, `Page ${i + 1} / ${entries.length}`), h('button', { class: 'btn sec sm', disabled: i === entries.length - 1, onclick: () => go(1) }, 'Agla', icon('right')))),
      h('div', { class: 'fine' }, 'Read-only \u2022 private diary'));
  };
  const go = (d) => { const n = i + d; if (n < 0 || n >= entries.length) return; dir = d > 0 ? 'fwd' : 'back'; i = n; draw(); };
  const sheet = () => {
    const box = h('div', {}, h('div', { class: 'hd', style: 'font-size:22px;margin-bottom:10px' }, 'Saare pages'), ...entries.map((e, k) => h('div', { class: 'entry glass', style: `--mc:${MOODS[e.mood]?.[1] || 'var(--margin)'}`, onclick: () => { s.remove(); dir = k < i ? 'back' : 'fwd'; i = k; draw(); } }, h('div', { class: 'd' }, fmtDate(e.at)), h('div', { class: 'ti' }, e.title || 'Bina title')))).reverse();
    const s = h('div', { class: 'sheet', onclick: (ev) => ev.target === s && s.remove() }, h('div', {}, ...[box].flat()));
    document.body.append(s);
  };
  draw();
}

/* ---------- owner ---------- */
let entries = [], links = [], tab = 'pages', alertPass = null;
async function owner() {
  document.title = 'Diary \u2022 Owner';
  const me = await api('owner/me').catch(() => ({ owner: false }));
  if (!me.owner) return ownerLogin();
  await refresh(); showTab(tab);
}
async function refresh() { const [a, b] = await Promise.all([api('owner/entries'), api('owner/links')]); entries = a.entries; links = b.links; }
function ownerLogin() {
  const err = h('div', { class: 'err' });
  const pw = h('input', { class: 'field', type: 'password', placeholder: 'Password', autocomplete: 'current-password', 'aria-label': 'Password' });
  const go = async () => { err.textContent = ''; try { await api('owner/login', 'POST', { password: pw.value }); owner(); } catch (e) { err.textContent = e.message; pw.value = ''; } };
  pw.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  mount(h('div', { class: 'gate fade' }, h('div', { class: 'cover' }, icon('pen')), h('h1', { class: 'hd' }, 'Meri Diary'), h('p', { class: 'muted' }, 'Sirf likhne wale ke liye'),
    h('div', { class: 'glass card' }, h('label', { class: 'l' }, 'Owner password'), pw, err, h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: go }, icon('lock'), 'Andar aao'))), h('div', { style: 'margin-top:18px;display:flex;justify-content:center' }, themeBtn())));
}
function tabbar() {
  const t = (id, ic, label) => h('button', { class: 'tab' + (tab === id ? ' on' : ''), onclick: () => showTab(id) }, icon(ic), label);
  return h('nav', { class: 'tabs glass' }, t('pages', 'book', 'Pages'), h('button', { class: 'tab fab', 'aria-label': 'Naya page', onclick: () => editor(null) }, icon('pen')), t('share', 'share', 'Share'));
}
function showTab(id) { tab = id; id === 'pages' ? pagesView() : shareView(); }
function topbar(title) { return h('div', { class: 'top' }, h('div', { class: 't' }, title), h('div', { class: 'row' }, themeBtn(), h('button', { class: 'ib', 'aria-label': 'Logout', onclick: async () => { await api('owner/logout', 'POST', {}); owner(); } }, icon('out')))); }
function pagesView(q = '') {
  const list = h('div', {});
  const draw = (term) => {
    const t = term.toLowerCase();
    const f = entries.filter((e) => !t || (e.title + ' ' + e.body).toLowerCase().includes(t));
    list.replaceChildren(...(f.length ? f.map(card) : [h('div', { class: 'empty glass' }, h('div', { class: 'hd' }, entries.length ? 'Kuch nahi mila' : 'Pehla page likho'), entries.length ? '' : 'Neeche pen button dabao aur jo dil me hai likh do.')]));
  };
  const card = (e) => h('div', { class: 'entry glass fade', style: `--mc:${MOODS[e.mood]?.[1] || 'var(--margin)'}`, onclick: () => editor(e) },
    h('div', { class: 'd' }, fmtDate(e.at), moodChip(e.mood), e.shared ? h('span', { class: 'badge' }, icon('eye'), 'Shared') : h('span', { class: 'badge' }, icon('lock'), 'Private')),
    h('div', { class: 'ti' }, e.title || 'Bina title'), h('div', { class: 'pv' }, e.body));
  const s = h('input', { class: 'field', placeholder: 'Pages me dhundo', value: q });
  s.addEventListener('input', () => draw(s.value));
  draw(q);
  mount(topbar('Meri Diary'), h('div', { class: 'search' }, icon('search'), s), list, tabbar());
}
function editor(e) {
  const isNew = !e;
  const st = e ? { ...e } : { id: null, title: '', body: '', mood: '', font: 'kalam', shared: false, at: Date.now() };
  const draftKey = 'draft:' + (st.id || 'new');
  const dr = !e && localStorage.getItem(draftKey); if (dr) { try { Object.assign(st, JSON.parse(dr)); } catch {} }
  let dirty = false;
  const title = h('input', { class: 'titlein', placeholder: 'Aaj ka title (optional)', value: st.title, maxlength: 200 });
  const ta = h('textarea', { placeholder: 'Yahan likho...', spellcheck: 'false', 'aria-label': 'Diary page' }); ta.value = st.body;
  const paper = h('div', { class: 'paper f-' + st.font }, ta);
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight, 340) + 'px'; };
  const changed = () => { dirty = true; st.title = title.value; st.body = ta.value; localStorage.setItem(draftKey, JSON.stringify({ title: st.title, body: st.body, mood: st.mood, font: st.font, shared: st.shared })); wc.textContent = (ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0) + ' shabd'; };
  ta.addEventListener('input', () => { grow(); changed(); }); title.addEventListener('input', changed);
  const wc = h('span', { class: 'muted' }, '');
  const date = h('input', { class: 'field', type: 'datetime-local', value: toLocalInput(st.at), style: 'font-size:14px;padding:10px 12px' }); date.addEventListener('change', () => { st.at = new Date(date.value).getTime() || st.at; dirty = true; });
  const chips = h('div', { class: 'chips' }); const drawChips = () => chips.replaceChildren(...Object.entries(MOODS).map(([k, [l, c]]) => h('button', { class: 'chip' + (st.mood === k ? ' on' : ''), onclick: () => { st.mood = st.mood === k ? '' : k; dirty = true; changed(); drawChips(); } }, h('span', { class: 'dot', style: `--mc:${c}` }), l)));
  drawChips();
  const fonts = h('div', { class: 'chips' }); const drawFonts = () => fonts.replaceChildren(...Object.entries({ kalam: 'Handwriting', caveat: 'Slim pen', yatra: 'Brush' }).map(([k, l]) => h('button', { class: 'chip' + (st.font === k ? ' on' : ''), style: `font-family:${FONTS[k]},Poppins`, onclick: () => { st.font = k; paper.className = 'paper f-' + k; drawFonts(); changed(); grow(); } }, l)));
  drawFonts();
  const tg = h('button', { class: 'tg' + (st.shared ? ' on' : ''), role: 'switch', 'aria-checked': String(st.shared), onclick: () => { st.shared = !st.shared; tg.classList.toggle('on', st.shared); tg.setAttribute('aria-checked', String(st.shared)); changed(); } });
  const save = async () => {
    if (!ta.value.trim() && !title.value.trim()) return toast('Pehle kuch likho');
    st.title = title.value; st.body = ta.value;
    try { const r = await api('owner/entries', 'POST', st); localStorage.removeItem(draftKey); localStorage.removeItem('draft:' + r.id); toast('Save ho gaya'); await refresh(); dirty = false; tab = 'pages'; pagesView(); } catch (er) { toast(er.message); }
  };
  const del = async () => { if (!confirm('Ye page hamesha ke liye delete karna hai?')) return; await api('owner/entries/' + st.id, 'DELETE'); await refresh(); toast('Delete ho gaya'); pagesView(); };
  const back = () => { if (dirty && !confirm('Save nahi kiya. Bina save kiye wapas jaaun? (Draft is phone me bacha rahega)')) return; pagesView(); };
  mount(h('div', { class: 'top' }, h('button', { class: 'ib', 'aria-label': 'Wapas', onclick: back }, icon('back')), h('div', { class: 't', style: 'font-size:22px' }, isNew ? 'Naya page' : 'Page badlo'), themeBtn()),
    h('div', { class: 'fade' }, h('div', { class: 'glass', style: 'padding:6px 14px 10px;margin-bottom:12px' }, title, date), chips, paper, h('div', { class: 'row', style: 'justify-content:space-between;margin:8px 4px' }, wc, fonts),
      h('div', { class: 'glass switch' }, h('div', {}, h('b', {}, 'Share ke liye mark karo'), h('span', { class: 'muted' }, 'Sirf shared pages link wale ko dikhenge')), tg),
      h('div', { style: 'margin-top:14px;display:grid;gap:10px' }, h('button', { class: 'btn', onclick: save }, icon('check'), 'Save karo'), !isNew ? h('button', { class: 'btn danger', onclick: del }, icon('trash'), 'Page delete karo') : null)));
  grow(); changed(); dirty = false; if (isNew) ta.focus();
}
function shareView() {
  const label = h('input', { class: 'field', placeholder: 'Kiske liye? (jaise: Riya)', maxlength: 80 });
  const pass = h('input', { class: 'field', placeholder: 'Passcode (4+ akshar)', maxlength: 32, value: String(Math.floor(100000 + Math.random() * 900000)) });
  const mk = async () => { try { await api('owner/links', 'POST', { label: label.value, passcode: pass.value }); toast('Naya link ban gaya'); alertPass = pass.value; await refresh(); shareView(); alertPass = null; } catch (e) { toast(e.message); } };
  const cards = links.map((l) => h('div', { class: 'lk glass fade' + (l.revoked ? ' off' : '') },
    h('div', { class: 'n' }, l.label, l.revoked ? h('span', { class: 'badge' }, 'Band') : h('span', { class: 'badge' }, icon('eye'), 'Chalu')),
    h('div', { class: 'u' }, l.url), h('div', { class: 'muted' }, l.lastOpened ? 'Aakhri baar khula: ' + fmtDate(l.lastOpened) + ' ' + fmtTime(l.lastOpened) : 'Abhi tak nahi khula'),
    h('div', { class: 'acts', style: 'margin-top:12px' },
      h('button', { class: 'btn sm', onclick: async () => { try { await navigator.clipboard.writeText(l.url); toast('Link copy ho gaya'); } catch { prompt('Link copy karo', l.url); } } }, icon('copy'), 'Copy link'),
      h('button', { class: 'btn sm sec', onclick: async () => { const p = prompt('Naya passcode (4+ akshar). Purane log dobara passcode daalenge.'); if (!p) return; try { await api(`owner/links/${l.id}/passcode`, 'POST', { passcode: p }); toast('Passcode badal gaya'); } catch (e) { toast(e.message); } } }, 'Passcode badlo'),
      h('button', { class: 'btn sm sec', onclick: async () => { if (!confirm('Naya link banega, purana band ho jayega. Theek hai?')) return; await api(`owner/links/${l.id}/regenerate`, 'POST', {}); await refresh(); shareView(); } }, 'Naya link'),
      h('button', { class: 'btn sm sec', onclick: async () => { await api(`owner/links/${l.id}/revoke`, 'POST', { revoked: !l.revoked }); await refresh(); shareView(); } }, l.revoked ? 'Wapas chalu' : 'Band karo'),
      h('button', { class: 'btn sm danger', onclick: async () => { if (!confirm('Ye link hamesha ke liye delete?')) return; await api('owner/links/' + l.id, 'DELETE'); await refresh(); shareView(); } }, icon('trash')))));
  const hint = alertPass ? h('div', { class: 'glass', style: 'padding:12px;margin-bottom:12px' }, 'Passcode: ', h('b', {}, alertPass), ' (ye sirf abhi dikh raha hai, kahin likh lo)') : null;
  mount(topbar('Share'), h('div', { class: 'glass', style: 'padding:16px;margin-bottom:16px' }, h('div', { style: 'font-weight:600' }, 'Naya private link'), h('div', { class: 'muted' }, 'Link + passcode dono chahiye. Wo sirf "shared" pages padh payega, kuch likh ya badal nahi sakta.'), h('label', { class: 'l' }, 'Naam'), label, h('label', { class: 'l' }, 'Passcode'), pass, h('div', { style: 'margin-top:14px' }, h('button', { class: 'btn', onclick: mk }, icon('link'), 'Link banao'))),
    hint, ...cards, !links.length ? h('div', { class: 'muted', style: 'text-align:center' }, 'Abhi koi link nahi hai.') : null, tabbar());
}

/* ---------- route ---------- */
const p = location.pathname;
(async () => {
  try {
    if (p === '/owner') await owner();
    else if (p.startsWith('/r/')) await viewer(p.slice(3).replace(/\/$/, ''));
    else landing();
  } catch (e) { mount(h('div', { class: 'empty' }, 'Kuch gadbad hui. Page dobara kholo.')); console.error(e); }
})();
})();
