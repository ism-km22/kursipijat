/* api.js — klien REST GAS: POST text/plain (tanpa preflight), cache SWR, dedup in-flight, batch */
(function () {
  const LS = (function () { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return localStorage; } catch (e) { return null; } })();
  const lsGet = k => { try { return LS ? JSON.parse(LS.getItem(k)) : null; } catch (e) { return null; } };
  const lsSet = (k, v) => { try { LS && LS.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const lsDel = k => { try { LS && LS.removeItem(k); } catch (e) {} };

  const S = { token: lsGet('rkp:token'), user: lsGet('rkp:user'), mem: {}, inflight: {}, epoch: 0, onAuthLost: null };
  const WRITE = /^(buat|ubah|batal|update|ganti|simpan|hapus|reset|tambah|set|unggah|keluar|register|login|uji|ekspor)/i;

  async function raw(body, tries) {
    if (!/^https:\/\/script\.google\.com\//.test(window.GAS_URL || '')) throw new Error('GAS_URL belum diisi di js/config.js');
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 30000);
    try {
      const r = await fetch(window.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl.signal, redirect: 'follow' });
      return await r.json();
    } catch (e) {
      if (tries > 0 && !WRITE.test(body.action || '')) return raw(body, tries - 1); // ulang hanya untuk baca
      throw new Error(navigator.onLine ? 'Server tidak merespons. Coba lagi.' : 'Tidak ada koneksi internet.');
    } finally { clearTimeout(tm); }
  }

  function authCheck(res) { if (res && res.code === 'AUTH') { API.logout(true); } return res; }
  const ckey = (a, d) => a + '|' + JSON.stringify(d || {});
  const ukey = k => 'rkp:' + (S.user ? S.user.UserID : '-') + ':' + k;

  const API = {
    get token() { return S.token; }, get user() { return S.user; },
    setSession(token, user) { S.token = token; S.user = user; lsSet('rkp:token', token); lsSet('rkp:user', user); },
    setUser(u) { S.user = u; lsSet('rkp:user', u); },
    logout(silent) {
      const t = S.token; S.token = null; S.user = null; S.mem = {}; lsDel('rkp:token'); lsDel('rkp:user');
      if (t && !silent) raw({ action: 'keluar', token: t }, 0).catch(() => {});
      if (S.onAuthLost) S.onAuthLost(silent);
    },
    onAuthLost(fn) { S.onAuthLost = fn; },

    // Panggilan langsung (tulis tidak di-cache; baca di-dedup)
    async call(action, data) {
      const body = { action, data, token: S.token };
      if (WRITE.test(action)) { S.epoch++; return authCheck(await raw(body, 0)); }
      const k = S.epoch + '|' + ckey(action, data);
      if (S.inflight[k]) return S.inflight[k];
      const p = raw(body, 1).then(authCheck); S.inflight[k] = p; p.finally(() => delete S.inflight[k]); return p;
    },

    // Stale-while-revalidate: cb(data, dariCache). Mengembalikan promise segar.
    swr(action, data, cb, opt) {
      opt = opt || {}; const k = ckey(action, data), m = S.mem[k] || (opt.persist !== false && lsGet(ukey(k)));
      if (m && m.d !== undefined) { S.mem[k] = m; cb(m.d, true); if (Date.now() - m.t < (opt.fresh || 0)) return Promise.resolve(m.d); }
      return this.call(action, data).then(res => {
        if (res.success) { const e = { d: res.data, t: Date.now() }; S.mem[k] = e; if (opt.persist !== false) lsSet(ukey(k), e); cb(res.data, false); return res.data; }
        if (!m) cb(null, false, res.message); return null;
      }).catch(err => { if (!m) cb(null, false, err.message); else if (opt.onOffline) opt.onOffline(); return null; });
    },
    // Hapus cache awalan tertentu setelah operasi tulis
    invalidate(...prefix) {
      Object.keys(S.mem).forEach(k => { if (prefix.some(p => k.indexOf(p + '|') === 0)) delete S.mem[k]; });
      if (LS) try { Object.keys(LS).forEach(k => { if (k.indexOf('rkp:' + (S.user ? S.user.UserID : '-') + ':') === 0 && prefix.some(p => k.indexOf(':' + p + '|') > 0)) LS.removeItem(k); }); } catch (e) {}
    },
    // Prefetch: boot + jadwal + riwayat dalam 1 RTT lalu isi cache
    async prefetch() {
      const calls = [{ action: 'boot' }, { action: 'jadwal', data: { hari: 21 } }, { action: 'riwayat' }];
      try {
        const r = await raw({ action: 'batch', token: S.token, calls }, 1); authCheck(r); if (!r.success) return;
        r.data.forEach((x, i) => { if (x && x.success) { const k = ckey(calls[i].action, calls[i].data), e = { d: x.data, t: Date.now() }; S.mem[k] = e; lsSet(ukey(k), e); } });
        const b = r.data[0]; if (b && b.success) this.setUser(b.data.user);
      } catch (e) {}
    },
    // Publik (landing/CMS) — cache lokal agar halaman utama instan
    publik(cb) {
      const c = lsGet('rkp:publik'); if (c) cb(c, true);
      return this.call('publik').then(r => { if (r.success) { lsSet('rkp:publik', r.data); cb(r.data, false); } }).catch(() => {});
    },
    cachedPublik() { return lsGet('rkp:publik'); },
    pref: { get: k => lsGet('rkp:pref:' + k), set: (k, v) => lsSet('rkp:pref:' + k, v) }
  };
  window.API = API;
})();
