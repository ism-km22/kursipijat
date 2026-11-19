/* ui.js — pembuat DOM aman (tanpa innerHTML untuk data), ikon, modal, toast */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  // Penambal: replaceChildren/append membongkar array & melewati null/false (bawaan browser menjadikannya teks)
  ['replaceChildren', 'append'].forEach(fn => {
    const asli = Element.prototype[fn];
    Element.prototype[fn] = function (...a) {
      const rata = [], ratakan = l => l.forEach(c => { if (Array.isArray(c)) ratakan(c); else if (c !== null && c !== undefined && c !== false) rata.push(c); });
      ratakan(a); return asli.apply(this, rata);
    };
  });
  // h('div.kelas#id', {atribut, onclick}, ...anak) — string anak selalu menjadi teks (aman XSS)
  function h(tag, attrs, ...kids) {
    const m = /^([a-z0-9]+)((?:[.#][\w-]+)*)$/i.exec(tag) || [0, 'div', ''], el = document.createElement(m[1]);
    (m[2].match(/[.#][\w-]+/g) || []).forEach(t => t[0] === '.' ? el.classList.add(t.slice(1)) : (el.id = t.slice(1)));
    if (attrs !== null && attrs !== undefined && (typeof attrs !== 'object' || attrs.nodeType || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; } // termasuk 0 / '' sebagai anak
    Object.keys(attrs || {}).forEach(k => {
      const v = attrs[k]; if (v === null || v === undefined || v === false) return;
      if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className += ' ' + v; else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    (function add(list) { list.forEach(c => { if (Array.isArray(c)) add(c); else if (c === null || c === undefined || c === false) return; else el.append(c.nodeType ? c : document.createTextNode(String(c))); }); })(kids);
    return el;
  }
  const P = { // path ikon (24x24, stroke)
    dash: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z', chair: 'M6 11V7a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v4M4 11h16v5H4zM7 16v4M17 16v4',
    book: 'M6 3h12v18l-6-4-6 4z', gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-1V5H9v2L7 8 5 7l-2 4 2 1v2l-2 1 2 4 2-1 2 1v2h6v-2l2-1 2 1 2-4-2-1z',
    users: 'M16 11a3 3 0 1 0 0-6M8 11a3 3 0 1 0 0-6M2 20c0-3 3-5 6-5s6 2 6 5M16 15c3 0 6 2 6 5', cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2', sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
    chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3', doc: 'M6 3h9l4 4v14H6zM9 12h7M9 16h7', bell: 'M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6', x: 'M6 6l12 12M18 6L6 18', check: 'M5 12l5 5 9-10',
    arrow: 'M5 12h14M13 6l6 6-6 6', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3', key: 'M14 10a4 4 0 1 0-3 3.9L12 15h2v2h2v2h3v-3z', plus: 'M12 5v14M5 12h14', down: 'M12 4v12M6 10l6 6 6-6M4 20h16',
    out: 'M10 4H5v16h5M14 8l5 4-5 4M19 12H9', trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13', lotus: 'M12 20c-4 0-7-3-7-7 3 0 5 1 7 3 2-2 4-3 7-3 0 4-3 7-7 7zM12 4c2 2 3 4 3 7-1 1-2 1.5-3 2-1-.5-2-1-3-2 0-3 1-5 3-7z', refresh: 'M20 12a8 8 0 1 1-3-6.2M20 4v5h-5'
  };
  function icon(n, size) {
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size || 20); s.setAttribute('height', size || 20);
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', P[n] || P.dash); s.appendChild(p); return s;
  }
  function toast(msg, tipe) {
    const box = document.getElementById('toasts'); if (!box) return;
    const t = h('div.toast', { class: tipe || '', role: 'status' }, msg); box.appendChild(t); setTimeout(() => t.remove(), tipe === 'err' ? 5000 : 3000);
  }
  // Modal: isi = elemen; kembalikan {close}
  function modal(judul, isi) {
    const prev = document.activeElement;
    const close = () => { ov.remove(); document.removeEventListener('keydown', esc); prev && prev.focus && prev.focus(); };
    const esc = e => { if (e.key === 'Escape') close(); };
    const ov = h('div.ov', { onclick: e => { if (e.target === ov) close(); } },
      h('div.modal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': judul },
        h('div.row.between', { style: 'margin-bottom:14px' }, h('h2', judul), h('button.btn.sm', { 'aria-label': 'Tutup', onclick: close }, icon('x', 16))), isi));
    document.body.appendChild(ov); document.addEventListener('keydown', esc);
    const f = ov.querySelector('input,select,textarea,button.pri'); f && f.focus(); return { close };
  }
  function konfirmasi(judul, teks, labelYa, bahaya) {
    return new Promise(res => {
      const m = modal(judul, h('div', h('p', { style: 'margin-bottom:18px' }, teks), h('div.row', { style: 'justify-content:flex-end' },
        h('button.btn', { onclick: () => { m.close(); res(false); } }, 'Batal'), h('button.btn', { class: bahaya ? 'dng' : 'pri', onclick: () => { m.close(); res(true); } }, labelYa || 'Ya'))));
    });
  }
  const skel = (n, t) => h('div.stack', Array.from({ length: n || 3 }, () => h('div.sk', { style: 'height:' + (t || 56) + 'px' })));
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const statusBadge = s => h('span.badge', { class: { Terjadwal: 'warn', Selesai: 'ok', Dibatalkan: 'err', Aktif: 'ok', Nonaktif: 'err', 'Menunggu Verifikasi': 'warn' }[s] || '' }, s);
  // tombol dengan status "memproses" agar klik terasa responsif & tidak ganda
  async function busy(btn, fn) { if (btn.disabled) return; btn.disabled = true; btn.setAttribute('aria-busy', 'true'); try { return await fn(); } finally { btn.disabled = false; btn.removeAttribute('aria-busy'); } }
  function downloadB64(nama, mime, b64) {
    const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const a = h('a', { href: URL.createObjectURL(new Blob([u], { type: mime })), download: nama }); document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function setTema(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return;
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, d = c => Math.round(c * .75), l = c => Math.round(c + (255 - c) * .85);
    const R = document.documentElement.style; R.setProperty('--primary', hex); R.setProperty('--primary-d', `rgb(${d(r)},${d(g)},${d(b)})`); R.setProperty('--primary-l', `rgb(${l(r)},${l(g)},${l(b)})`);
    const m = document.querySelector('meta[name=theme-color]'); m && m.setAttribute('content', hex);
  }
  window.UI = { h, icon, toast, modal, konfirmasi, skel, initials, statusBadge, busy, downloadB64, setTema };
})();
