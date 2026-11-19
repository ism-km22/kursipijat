/* views-user2.js — Reservasi Saya & Profil */
(function () {
  const { h, icon, toast, busy, skel, statusBadge, modal, konfirmasi } = UI;
  const V = window.Views = window.Views || {};

  V.ures = () => {
    const root = h('div.page'), list = h('div.g3', skel(3, 200)), tabs = h('div.tabs', { role: 'tablist' }), head = h('div.row.between.wrap');
    let data = null, tab = 'Terjadwal';
    const TAB = [['Terjadwal', 'Akan Datang'], ['Selesai', 'Selesai'], ['Dibatalkan', 'Dibatalkan']];
    root.append(h('div.ph', h('span.eyebrow', 'Manajemen jadwal & pemulihan kuota'), h('h1', 'Reservasi Saya')), head, tabs, list);
    const detail = r => modal('Detail Reservasi', h('dl.sum', h('dt', 'Kode'), h('dd', r.id), h('dt', 'Tanggal'), h('dd', r.tanggalLabel), h('dt', 'Waktu'), h('dd', r.jamMulai + '–' + r.jamSelesai + ' WITA'), h('dt', 'Unit'), h('dd', r.unit),
      h('dt', 'Shift'), h('dd', r.shift), h('dt', 'Status'), h('dd', statusBadge(r.status)), h('dt', 'Dibuat oleh'), h('dd', r.dibuatOleh === 'User' ? 'Anda' : 'Admin HRGAIT')));
    async function batal(r) {
      if (!await konfirmasi('Batalkan reservasi?', `${r.tanggalLabel}, ${r.jamMulai}–${r.jamSelesai}. Kuota Anda akan dikembalikan.`, 'Ya, batalkan', true)) return;
      const snap = JSON.parse(JSON.stringify(data)); // optimistic
      const x = data.daftar.find(z => z.id === r.id); x.status = 'Dibatalkan'; x.bisaUbah = false; data.kuota.terpakai = Math.max(0, data.kuota.terpakai - 1); draw();
      const res = await API.call('batal', { id: r.id }).catch(e => ({ success: false, message: e.message }));
      API.invalidate('jadwal', 'riwayat', 'boot');
      if (!res.success) { data = snap; draw(); toast(res.message, 'err'); } else toast('Reservasi dibatalkan. Kuota dikembalikan.', 'ok');
    }
    function draw() {
      if (!data) return; const n = s => data.daftar.filter(r => r.status === s).length;
      tabs.replaceChildren(TAB.map(t => h('button', { role: 'tab', class: tab === t[0] ? 'on' : '', 'aria-selected': tab === t[0], onclick: () => { tab = t[0]; draw(); } }, `${t[1]} (${n(t[0])})`)));
      head.replaceChildren(window.kuotaBox(data.kuota));
      const items = data.daftar.filter(r => r.status === tab).sort((a, b) => tab === 'Terjadwal' ? (a.tanggal + a.jamMulai).localeCompare(b.tanggal + b.jamMulai) : 0);
      list.replaceChildren(items.length ? items.map(r => h('div.card.stack', h('div.row.between', h('span.tag', '#' + r.id), statusBadge(r.status)), h('h3', r.unit),
        h('div.row', icon('cal', 18), r.tanggalLabel), h('div.row', icon('clock', 18), r.jamMulai + '–' + r.jamSelesai + ' WITA'), h('div.row.muted', 'Shift ' + r.shift),
        h('div.row', h('button.btn.grow', { onclick: () => detail(r) }, 'Detail'),
          r.bisaUbah ? [h('a.btn', { href: '#/u/pesan?ubah=' + r.id, 'aria-label': 'Ubah jadwal', title: 'Ubah jadwal' }, icon('edit', 18)), h('button.btn.dng', { 'aria-label': 'Batalkan', title: 'Batalkan', onclick: () => batal(r) }, icon('x', 18))] : null)))
        : h('div.empty', { style: 'grid-column:1/-1' }, 'Belum ada reservasi pada kategori ini.'));
    }
    API.swr('riwayat', null, d => { if (d) { data = d; draw(); } else list.replaceChildren(h('div.err-msg', 'Gagal memuat riwayat.')); });
    return root;
  };

  V.uprofil = () => {
    const u0 = API.user, root = h('div.page'); let shift = u0.Shift;
    const wa = h('input.inp', { value: u0.NoWA ? '0' + String(u0.NoWA).replace(/^62/, '') : '', type: 'tel', placeholder: '08xxxxxxxxxx', id: 'wa' }), em = h('input.inp', { value: u0.Email || '', type: 'email', id: 'em' });
    const opt = (v, jam) => { const b = h('button.card', { type: 'button', style: 'text-align:left;border:2px solid ' + (shift === v ? 'var(--primary)' : 'transparent') + ';background:' + (shift === v ? 'var(--primary-l)' : 'var(--cont)') + ';box-shadow:none', 'aria-pressed': shift === v,
      onclick: () => { shift = v; opts.replaceChildren(opt('Siang', '18.00 – 21.00'), opt('Malam', '12.00–13.00 & 17.00–18.00')); } }, h('div.eyebrow', 'Shift ' + v), h('b', jam)); return b; };
    const opts = h('div.grid2', opt('Siang', '18.00 – 21.00'), opt('Malam', '12.00–13.00 & 17.00–18.00'));
    const simpan = h('button.btn.pri', { onclick: e => busy(e.currentTarget, async () => {
      if (shift !== u0.Shift && !await konfirmasi('Ubah shift?', 'Reservasi mendatang yang tidak sesuai shift baru akan dibatalkan otomatis dan kuota dikembalikan. Perubahan tidak berlaku mundur.', 'Ya, ubah')) return;
      const r = await API.call('updateProfil', { shift, noWA: wa.value, email: em.value }); if (!r.success) return toast(r.message, 'err');
      API.setUser(r.data.user); API.invalidate('jadwal', 'riwayat', 'boot'); toast(r.data.dibatalkan ? `Profil disimpan. ${r.data.dibatalkan} reservasi dibatalkan karena perubahan shift.` : 'Profil disimpan ✓', 'ok'); location.hash = '#/u/profil?' + Date.now(); window.App && App.render();
    }) }, 'Simpan Perubahan');
    const pw = id => h('input.inp', { type: 'password', id, autocomplete: id === 'p0' ? 'current-password' : 'new-password' });
    const p0 = pw('p0'), p1 = pw('p1'), p2 = pw('p2');
    const gs = h('button.btn', { onclick: e => busy(e.currentTarget, async () => {
      if (p1.value !== p2.value) return toast('Konfirmasi sandi tidak sama.', 'err');
      const r = await API.call('gantiSandi', { lama: p0.value, baru: p1.value }); if (!r.success) return toast(r.message, 'err'); toast('Sandi diperbarui. Silakan masuk kembali.', 'ok'); API.logout(true); location.hash = '#/masuk';
    }) }, 'Perbarui Sandi');
    const info = (l, v) => h('div.fg', h('div.sm.muted', l), h('b', v || '—'));
    const tema = h('button.btn.sm', { onclick: () => { const d = document.documentElement, g = d.getAttribute('data-theme') === 'dark'; d.setAttribute('data-theme', g ? 'light' : 'dark'); API.pref.set('tema', g ? 'light' : 'dark'); } }, 'Ganti tema terang/gelap');
    root.append(h('div.ph.row', h('div.avatar', { style: 'width:64px;height:64px;font-size:1.4rem' }, UI.initials(u0.Nama)), h('div', h('span.badge.info', u0.LevelJabatan), h('h1', u0.Nama), h('div.muted', u0.Departemen + ' · NIK ' + u0.NIK))),
      h('div.split', h('div.stack', h('div.card', h('h2', { style: 'margin-bottom:12px' }, 'Pengaturan Shift Kerja'), h('p.sm.muted', { style: 'margin-bottom:12px' }, 'Anda hanya dapat memesan sesi sesuai shift Anda.'), opts,
        h('div.err-msg', { style: 'margin-top:14px;margin-bottom:0' }, h('b', 'Peringatan: '), 'mengubah shift membatalkan otomatis reservasi mendatang yang tidak sesuai (kuota dikembalikan).')),
        h('div.card', h('h2', { style: 'margin-bottom:12px' }, 'Informasi Kontak'), h('div.grid2', h('div.fg', h('label.f', { for: 'wa' }, 'Nomor WhatsApp'), wa), h('div.fg', h('label.f', { for: 'em' }, 'Email'), em)), simpan),
        h('div.card', h('h2', { style: 'margin-bottom:12px' }, 'Ubah Kata Sandi'), h('div.grid2', h('div.fg', h('label.f', { for: 'p0' }, 'Sandi Saat Ini'), p0), h('div.fg', h('label.f', { for: 'p1' }, 'Sandi Baru (min. 8)'), p1)), h('div.fg', h('label.f', { for: 'p2' }, 'Konfirmasi Sandi Baru'), p2), gs)),
        h('div.stack', h('div.card', h('div.eyebrow', { style: 'margin-bottom:12px' }, 'Kartu Identitas Karyawan'), info('Nama Lengkap', u0.Nama), info('NIK', u0.NIK), info('Level Jabatan', u0.LevelJabatan), info('Departemen', u0.Departemen),
          h('div.card', { style: 'background:var(--cont);box-shadow:none' }, h('div.eyebrow', 'Unit akses otomatis'), h('div.row', icon('chair', 22), h('b', u0.UnitAkses)), h('div.sm.muted', 'Level jabatan hanya dapat diubah oleh admin HRGAIT.'))),
          h('div.card', h('div.sm.muted', { style: 'margin-bottom:8px' }, 'Tampilan'), tema))));
    return root;
  };
})();
