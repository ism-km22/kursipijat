/* views-admin.js — Dashboard Admin, Manajemen Reservasi, Manajemen Pengguna */
(function () {
  const { h, icon, toast, busy, skel, statusBadge, modal, konfirmasi } = UI;
  const V = window.Views = window.Views || {};
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms || 300); }; };
  const stat = (l, v, sub) => h('div.card.stat', h('div.l', l), h('div.v', v === undefined ? '…' : v), sub ? h('div.sm.muted', sub) : null);
  const sel = (id, label, opts, val, on) => h('select.inp', { id, 'aria-label': label, onchange: e => on(e.target.value), style: 'min-width:150px' }, h('option', { value: '' }, label), opts.map(o => h('option', { value: o, selected: o === val }, o)));
  // Pager server-side
  const pager = (d, go) => h('div.pg', h('span.sm.muted', `Menampilkan halaman ${d.page} dari ${d.pages} (${d.total} data)`), h('div.row',
    h('button.btn.sm', { disabled: d.page <= 1, onclick: () => go(d.page - 1) }, 'Sebelumnya'), h('button.btn.sm', { disabled: d.page >= d.pages, onclick: () => go(d.page + 1) }, 'Berikutnya')));
  window.AdminUI = { debounce, stat, sel, pager };

  V.adash = () => {
    const root = h('div.page'), box = h('div.stack', skel(3, 100));
    root.append(h('div.ph', h('span.eyebrow', 'Portal Admin'), h('h1', 'Dashboard Admin'), h('p.muted', 'Ringkasan pemakaian hari ini.')), box);
    API.swr('dashboardAdmin', null, d => { if (!d) return box.replaceChildren(h('div.err-msg', 'Gagal memuat dashboard.'));
      box.replaceChildren(h('div.g4', stat('Total reservasi hari ini', d.hariIni.total), stat('Terjadwal aktif', d.hariIni.terjadwal, 'Menunggu sesi'), stat('Selesai sesi', d.hariIni.selesai), stat('Dibatalkan', d.hariIni.dibatalkan)),
        h('div.g4', { style: 'margin-top:14px' }, stat('Total karyawan', d.pengguna.total), stat('Menunggu verifikasi', d.pengguna.menunggu, d.pengguna.menunggu ? 'Perlu tindakan' : 'Semua terverifikasi'), stat('Unit 1 (Section Head–Manager)', d.pengguna.unit1), stat('Unit 2 (Supervisor ke bawah)', d.pengguna.unit2)),
        h('div.g4', { style: 'margin-top:14px' }, stat('Sisa slot hari ini — Unit 1', d.sisaSlot['Unit 1']), stat('Sisa slot hari ini — Unit 2', d.sisaSlot['Unit 2'])),
        h('div.row.wrap', { style: 'margin-top:18px' }, h('a.btn.pri', { href: '#/a/pengguna' }, 'Kelola Pengguna'), h('a.btn', { href: '#/a/reservasi' }, 'Kelola Reservasi'), h('a.btn', { href: '#/a/laporan' }, 'Laporan'))); });
    return root;
  };

  V.ares = () => {
    const F = { page: 1 }, root = h('div.page'), tb = h('div.tw'), foot = h('div'), info = h('span.sm.muted'), stats = h('div.g4');
    const load = () => { tb.replaceChildren(skel(5, 48)); API.swr('daftarReservasiAdmin', F, d => { if (d) draw(d); }, { persist: false }); };
    const set = (k, v) => { F[k] = v || undefined; F.page = 1; load(); };
    const batal = async r => { if (!await konfirmasi('Batalkan reservasi ini?', `${r.nama} — ${r.tanggalLabel} ${r.jamMulai}. Tercatat di audit log.`, 'Batalkan', true)) return;
      const x = await API.call('batal', { id: r.id }); if (!x.success) return toast(x.message, 'err'); toast('Dibatalkan', 'ok'); API.invalidate('daftarReservasiAdmin', 'dashboardAdmin', 'jadwal'); load(); };
    function draw(d) {
      stats.replaceChildren(stat('Total', d.ringkas.total), stat('Terjadwal', d.ringkas.terjadwal), stat('Selesai', d.ringkas.selesai), stat('Dibatalkan', d.ringkas.dibatalkan));
      tb.replaceChildren(d.items.length ? h('table', h('thead', h('tr', ['Karyawan / NIK', 'Departemen', 'Unit', 'Tanggal & Waktu', 'Status', 'Aksi'].map(c => h('th', c)))),
        h('tbody', d.items.map(r => h('tr', h('td', h('div.row', h('div.avatar', { style: 'width:34px;height:34px;font-size:.8rem' }, UI.initials(r.nama)), h('div', h('b', r.nama), h('div.sm.muted', r.nik)))),
          h('td', r.departemen), h('td', r.unit), h('td', h('b', r.tanggalLabel), h('div.sm.muted', `Shift ${r.shift} · ${r.jamMulai}–${r.jamSelesai}`)), h('td', statusBadge(r.status)),
          h('td', r.bisaUbah ? h('button.btn.sm.dng', { 'aria-label': 'Batalkan reservasi ' + r.nama, onclick: () => batal(r) }, 'Batalkan') : h('span.sm.muted', r.status === 'Dibatalkan' ? 'Audit log' : '—')))))) : h('div.empty', 'Tidak ada reservasi sesuai filter.'));
      foot.replaceChildren(pager(d, p => { F.page = p; load(); }));
      const dep = document.getElementById('f-dep'); if (dep && dep.options.length <= 1) d.departemen.forEach(x => dep.append(h('option', { value: x }, x)));
    }
    const buat = () => {
      let target = null, jad = null; const out = h('div.stack'), q = h('input.inp', { placeholder: 'Cari NIK / nama…', 'aria-label': 'Cari karyawan' }), hasil = h('div.stack'), tgl = h('input.inp', { type: 'date', 'aria-label': 'Tanggal' });
      const muat = async () => { if (!target || !tgl.value) return; out.replaceChildren(skel(2, 60)); const r = await API.call('jadwal', { userId: target.UserID, hari: 45 }); if (!r.success) return out.replaceChildren(h('div.err-msg', r.message));
        const d = r.data.hari.find(x => x.tanggal === tgl.value); if (!d || !d.sesi.length) return out.replaceChildren(h('div.empty', 'Tidak ada sesi pada tanggal itu untuk shift ' + target.Shift + '.'));
        out.replaceChildren(d.sesi.map(s => h('div.win', h('b', s.jendela), h('div.chips', s.sub.map(x => h('button.chip', { disabled: x.status !== 'tersedia', onclick: async e => { await busy(e.currentTarget, async () => { const z = await API.call('buat', { userId: target.UserID, tanggal: tgl.value, slotId: s.slotId, jamMulai: x.mulai }); if (!z.success) return toast(z.message, 'err'); toast('Reservasi dibuat atas nama ' + target.Nama, 'ok'); m.close(); API.invalidate('daftarReservasiAdmin', 'dashboardAdmin', 'jadwal'); load(); }); } }, x.mulai + '–' + x.selesai)))))); };
      q.oninput = debounce(async () => { if (q.value.length < 2) return; const r = await API.call('daftarUser', { q: q.value, status: 'Aktif', size: 5 }); if (r.success) hasil.replaceChildren(r.data.items.map(u => h('button.btn.blk', { style: 'justify-content:flex-start', onclick: () => { target = u; hasil.replaceChildren(h('div.badge.ok', `${u.Nama} · ${u.UnitAkses} · Shift ${u.Shift}`)); muat(); } }, `${u.Nama} (${u.NIK}) — ${u.UnitAkses}, ${u.Shift}`))); });
      tgl.onchange = muat; const m = modal('Buat Reservasi Karyawan', h('div.stack', h('div.fg', h('label.f', 'Karyawan'), q), hasil, h('div.fg', h('label.f', 'Tanggal'), tgl), out));
    };
    root.append(h('div.row.between.wrap.ph', h('div', h('span.eyebrow', 'Modul Admin'), h('h1', 'Manajemen Reservasi'), h('p.muted', 'Pantau dan kelola pemesanan lintas departemen dengan log audit.')),
      h('div.row', h('button.btn.pri', { onclick: buat }, icon('plus', 18), 'Buat Reservasi Karyawan'), h('a.btn', { href: '#/a/laporan' }, icon('down', 18), 'Ekspor Laporan'))), stats,
      h('div.card', { style: 'margin-top:16px' }, h('div.row.wrap', h('input.inp.grow', { placeholder: 'Cari nama / NIK…', 'aria-label': 'Cari', style: 'min-width:180px', oninput: debounce(e => set('q', e.target.value)) }),
        h('input.inp', { type: 'date', 'aria-label': 'Tanggal', style: 'width:auto', onchange: e => set('tanggal', e.target.value) }), sel('f-unit', 'Semua Unit', ['Unit 1', 'Unit 2'], '', v => set('unit', v)),
        h('select.inp', { id: 'f-dep', 'aria-label': 'Departemen', style: 'min-width:150px', onchange: e => set('departemen', e.target.value) }, h('option', { value: '' }, 'Semua Departemen')), sel('f-st', 'Semua Status', ['Terjadwal', 'Selesai', 'Dibatalkan'], '', v => set('status', v))), tb, foot));
    load(); return root;
  };

  V.apengguna = () => {
    const F = { page: 1 }, root = h('div.page'), tb = h('div.tw'), foot = h('div'), top = h('div.g4'); let levels = [];
    const load = () => { tb.replaceChildren(skel(5, 54)); API.swr('daftarUser', F, d => { if (d) draw(d); }, { persist: false }); };
    const set = (k, v) => { F[k] = v || undefined; F.page = 1; load(); };
    const segarkan = () => { API.invalidate('daftarUser', 'dashboardAdmin', 'kuotaAdmin'); load(); };
    const verif = async u => { const r = await API.call('ubahUser', { userId: u.UserID, status: 'Aktif' }); r.success ? (toast(u.Nama + ' diverifikasi', 'ok'), segarkan()) : toast(r.message, 'err'); };
    const reset = async u => { if (!await konfirmasi('Reset kata sandi?', `${u.Nama} akan memperoleh sandi sementara dan wajib menggantinya.`, 'Reset')) return;
      const r = await API.call('resetSandiUser', { userId: u.UserID }); if (!r.success) return toast(r.message, 'err');
      modal('Sandi Sementara', h('div.stack', h('p', 'Sampaikan ke ' + u.Nama + '. Sandi ini hanya tampil sekali.'), h('div.card', { style: 'background:var(--cont);font-size:1.4rem;font-weight:800;text-align:center;letter-spacing:.08em;user-select:all' }, r.data.sandiSementara))); };
    const edit = u => {
      const lv = h('select.inp', levels.map(l => h('option', { value: l, selected: l === u.LevelJabatan }, l))), sh = h('select.inp', ['Siang', 'Malam'].map(s => h('option', { value: s, selected: s === u.Shift }, s))),
        st = h('select.inp', ['Aktif', 'Nonaktif', 'Menunggu Verifikasi'].map(s => h('option', { value: s, selected: s === u.StatusAkun }, s))), dp = h('input.inp', { value: u.Departemen }),
        rl = h('select.inp', ['Karyawan', 'Admin'].map(s => h('option', { value: s, selected: s === u.Role }, s))), b = h('button.btn.pri.blk', { onclick: e => busy(e.currentTarget, async () => {
          const r = await API.call('ubahUser', { userId: u.UserID, level: lv.value, shift: sh.value, status: st.value, departemen: dp.value, role: rl.value }); if (!r.success) return toast(r.message, 'err');
          toast(r.data.dibatalkan ? `Disimpan. ${r.data.dibatalkan} reservasi dibatalkan otomatis.` : 'Disimpan ✓', 'ok'); m.close(); segarkan(); }) }, 'Simpan');
      const m = modal('Ubah Pengguna — ' + u.Nama, h('div.stack', h('div.fg', h('label.f', 'Departemen'), dp), h('div.grid2', h('div.fg', h('label.f', 'Level Jabatan'), lv), h('div.fg', h('label.f', 'Shift'), sh)), h('div.grid2', h('div.fg', h('label.f', 'Status Akun'), st), h('div.fg', h('label.f', 'Role'), rl)),
        h('p.sm.muted', 'Unit akses otomatis mengikuti level jabatan. Mengubah shift/unit membatalkan reservasi mendatang yang tidak sesuai.'), b)); };
    const tambah = () => { const f = (id, l, a) => h('div.fg', h('label.f', l), h('input.inp', Object.assign({ id: 'ta-' + id }, a))), lv = h('select.inp', { id: 'ta-level' }, levels.map(l => h('option', l))), sh = h('select.inp', { id: 'ta-shift' }, ['Siang', 'Malam'].map(s => h('option', s)));
      const b = h('button.btn.pri.blk', { onclick: e => busy(e.currentTarget, async () => { const v = id => document.getElementById('ta-' + id).value.trim();
        const r = await API.call('tambahUser', { nik: v('nik'), nama: v('nama'), departemen: v('dept'), level: v('level'), shift: v('shift'), noWA: v('wa'), email: v('email') }); if (!r.success) return toast(r.message, 'err'); m.close(); segarkan();
        modal('Pengguna Dibuat', h('div.stack', h('p', 'Sandi sementara (tampil sekali):'), h('div.card', { style: 'background:var(--cont);font-size:1.4rem;font-weight:800;text-align:center;user-select:all' }, r.data.sandiSementara))); }) }, 'Buat Akun');
      const m = modal('Tambah Pengguna', h('div.stack', f('nik', 'NIK'), f('nama', 'Nama'), f('dept', 'Departemen'), h('div.grid2', h('div.fg', h('label.f', 'Level'), lv), h('div.fg', h('label.f', 'Shift'), sh)), h('div.grid2', f('wa', 'No. WA', { type: 'tel' }), f('email', 'Email', { type: 'email' })), b)); };
    function draw(d) {
      tb.replaceChildren(d.items.length ? h('table', h('thead', h('tr', ['NIK', 'Nama Karyawan', 'Departemen', 'Level & Unit', 'Shift', 'Status', 'Aksi'].map(c => h('th', c)))),
        h('tbody', d.items.map(u => h('tr', h('td', { style: 'font-family:monospace' }, u.NIK), h('td', h('div.row', h('div.avatar', { style: 'width:34px;height:34px;font-size:.8rem' }, UI.initials(u.Nama)), h('div', h('b', u.Nama), h('div.sm.muted', u.Email || u.NoWA || '')))),
          h('td', u.Departemen), h('td', h('div', u.LevelJabatan), h('span.tag', 'Otomatis ' + u.UnitAkses)), h('td', h('span.tag', u.Shift)), h('td', statusBadge(u.StatusAkun)),
          h('td', h('div.row', u.StatusAkun === 'Menunggu Verifikasi' ? h('button.btn.pri.sm', { onclick: () => verif(u) }, 'Verifikasi') : null, h('button.btn.sm', { 'aria-label': 'Ubah ' + u.Nama, title: 'Ubah', onclick: () => edit(u) }, icon('edit', 16)), h('button.btn.sm', { 'aria-label': 'Reset sandi ' + u.Nama, title: 'Reset sandi', onclick: () => reset(u) }, icon('key', 16)))))))) : h('div.empty', 'Tidak ada pengguna.'));
      foot.replaceChildren(pager(d, p => { F.page = p; load(); }));
    }
    API.swr('dashboardAdmin', null, d => { if (d) top.replaceChildren(stat('Total karyawan', d.pengguna.total), stat('Menunggu verifikasi', d.pengguna.menunggu), stat('Unit 1', d.pengguna.unit1), stat('Unit 2', d.pengguna.unit2)); });
    API.swr('cmsAdmin', null, d => { if (d) levels = d.level.map(l => l.Level); });
    root.append(h('div.row.between.wrap.ph', h('div', h('span.eyebrow', 'Portal Admin'), h('h1', 'Kelola Pengguna'), h('p.muted', 'Verifikasi akun, atur shift, level jabatan, dan unit akses.')), h('button.btn.pri', { onclick: tambah }, icon('plus', 18), 'Tambah Pengguna')), top,
      h('div.card', { style: 'margin-top:16px' }, h('div.row.wrap', h('input.inp.grow', { placeholder: 'Cari NIK, nama, atau departemen…', 'aria-label': 'Cari', style: 'min-width:200px', oninput: debounce(e => set('q', e.target.value)) }),
        sel('f-s', 'Semua Status', ['Aktif', 'Menunggu Verifikasi', 'Nonaktif'], '', v => set('status', v))), tb, foot));
    load(); return root;
  };
})();
