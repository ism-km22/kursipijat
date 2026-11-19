/* app.js — router hash, shell (sidebar/bottom-nav), PWA, status jaringan */
(function () {
  const { h, icon, toast, modal } = UI, V = window.Views;
  const NAV_U = [['udash', '/u/dashboard', 'Dashboard Karyawan', 'dash'], ['pesan', '/u/pesan', 'Pesan Kursi', 'chair'], ['ures', '/u/reservasi', 'Reservasi Saya', 'book'], ['uprofil', '/u/profil', 'Profil & Pengaturan', 'gear']];
  const NAV_A = [['adash', '/a/dashboard', 'Dashboard Admin', 'dash'], ['ares', '/a/reservasi', 'Manajemen Reservasi', 'chair'], ['apengguna', '/a/pengguna', 'Manajemen Pengguna', 'users'], ['akuota', '/a/kuota', 'Pengaturan Kuota', 'sliders'], ['asesi', '/a/sesi', 'Sesi', 'clock'], ['alaporan', '/a/laporan', 'Laporan & Analitik', 'chart'], ['acms', '/a/cms', 'CMS', 'doc']];
  const PUBLIK = { '/': 'landing', '/masuk': 'masuk', '/daftar': 'daftar' };
  const app = document.getElementById('app'); let shell = null, installEvt = null;
  const home = u => u.Role === 'Admin' ? '#/a/dashboard' : '#/u/dashboard';
  const label = n => n.replace('Dashboard ', '').replace('Manajemen ', '').replace('Pengaturan ', '').replace('& Pengaturan', '').replace('& Analitik', '').trim();

  function buatShell(user) {
    const nav = user.Role === 'Admin' ? NAV_A : NAV_U, cms = (API.cachedPublik() || {}).cms || {};
    const link = (n, cls) => h('a', { href: '#' + n[1], 'data-p': n[1], class: cls || '' }, icon(n[3], 20), cls === 'b' ? label(n[2]) : n[2]);
    const content = h('main#content', { tabindex: '-1' }), pasang = h('button.btn.sm.hide', { id: 'pasang', onclick: onPasang }, icon('down', 16), 'Pasang');
    const side = h('aside.side', h('div.brand', cms.logo_url ? h('img', { src: cms.logo_url, alt: '', referrerpolicy: 'no-referrer' }) : icon('lotus', 26), cms.nama_instansi || 'WellnessChair'),
      h('nav.nav', { 'aria-label': 'Menu utama' }, user.Role === 'Admin' ? h('div.grp', 'Portal Admin') : null, nav.map(n => link(n))));
    const bnav = h('nav.bnav', { 'aria-label': 'Menu bawah', style: user.Role === 'Admin' ? 'overflow-x:auto' : '' }, nav.map(n => { const a = link(n, 'b'); if (user.Role === 'Admin') a.style.minWidth = '78px'; return a; }));
    const top = h('header.top', h('strong', { id: 'judul', class: 'brand', style: 'padding:0;font-size:1rem' }, ''), h('div.row', pasang,
      h('button.btn.sm', { 'aria-label': 'Pengumuman', onclick: () => { const p = (API.cachedPublik() || {}).pengumuman || []; modal('Pengumuman', p.length ? h('div.stack', p.map(a => h('div', h('b', a.judul), h('p.muted.sm', { style: 'white-space:pre-line' }, a.isi)))) : h('p.muted', 'Tidak ada pengumuman.')); } }, icon('bell', 18)),
      h('button.avatar', { 'aria-label': 'Menu akun', onclick: akun }, UI.initials(user.Nama))));
    app.replaceChildren(h('div.app', side, h('div.main', top, content), bnav)); shell = { role: user.Role, content, side, bnav, top };
    if (installEvt || iosPerlu()) pasang.classList.remove('hide');
  }
  function akun() { const u = API.user; const m = modal('Akun', h('div.stack', h('div.row', h('div.avatar', UI.initials(u.Nama)), h('div', h('b', u.Nama), h('div.sm.muted', u.LevelJabatan + ' · ' + (u.Role === 'Admin' ? 'Administrator' : u.UnitAkses)))),
    u.Role !== 'Admin' ? h('a.btn.blk', { href: '#/u/profil', onclick: () => m.close() }, 'Profil & Pengaturan') : null, h('button.btn.dng.blk', { onclick: () => { m.close(); API.logout(); location.hash = '#/masuk'; } }, icon('out', 18), 'Keluar'))); }
  const iosPerlu = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone && !matchMedia('(display-mode: standalone)').matches;
  async function onPasang() { if (installEvt) { installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; document.getElementById('pasang').classList.add('hide'); } else modal('Pasang di iPhone/iPad', h('p', 'Buka menu Bagikan di Safari, lalu pilih “Tambah ke Layar Utama”.')); }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; const b = document.getElementById('pasang'); b && b.classList.remove('hide'); });

  function render() {
    const raw = (location.hash || '#/').slice(1), path = raw.split('?')[0] || '/', tok = API.token, user = API.user;
    if (!tok || !user) { shell = null; const nama = PUBLIK[path]; if (!nama) { location.replace('#/masuk'); return; } app.replaceChildren(V[nama]()); window.scrollTo(0, 0); return; }
    if (user.WajibGantiSandi) { shell = null; app.replaceChildren(V.ganti()); return; }
    if (PUBLIK[path]) { location.replace(home(user)); return; }
    const nav = user.Role === 'Admin' ? NAV_A : NAV_U, rt = nav.find(n => n[1] === path);
    if (!rt) { location.replace(home(user)); return; }
    if (!shell || shell.role !== user.Role) buatShell(user);
    shell.side.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.p === path)); shell.bnav.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.p === path));
    shell.top.querySelector('#judul').textContent = rt[2]; document.title = rt[2] + ' — Reservasi Kursi Pijat';
    let el; try { el = V[rt[0]](); } catch (e) { console.error(e); el = h('div.page', h('div.err-msg', 'Terjadi kesalahan menampilkan halaman.')); }
    shell.content.replaceChildren(el); window.scrollTo(0, 0);
    const a = shell.bnav.querySelector('a.on'); a && a.scrollIntoView && a.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  window.App = { render };

  API.onAuthLost(silent => { shell = null; if (silent !== true || location.hash.indexOf('/masuk') < 0) { if (silent) toast('Sesi berakhir. Silakan masuk kembali.', 'err'); } if (!/#\/(masuk|daftar)?$/.test(location.hash)) location.hash = '#/masuk'; });
  window.addEventListener('hashchange', render);
  const net = () => document.getElementById('netbar').classList.toggle('hide', navigator.onLine); window.addEventListener('online', net); window.addEventListener('offline', net); net();

  // Tema tersimpan & warna CMS
  const t = API.pref.get('tema'); if (t) document.documentElement.setAttribute('data-theme', t);
  const pc = API.cachedPublik(); if (pc && pc.cms) UI.setTema(pc.cms.warna_utama);
  if (API.token && API.user && !API.user.WajibGantiSandi) {
    API.publik(p => { if (p && p.cms) UI.setTema(p.cms.warna_utama); });
    if (API.user.Role === 'Admin') { API.swr('dashboardAdmin', null, () => {}); API.swr('daftarReservasiAdmin', { page: 1 }, () => {}, { persist: false }); API.swr('daftarUser', { page: 1 }, () => {}, { persist: false }); } else API.prefetch();
  }
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:' || location.hostname === 'localhost') navigator.serviceWorker && navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
