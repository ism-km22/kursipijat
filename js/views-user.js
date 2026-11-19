/* views-user.js — Dashboard Karyawan & Pesan Kursi */
(function () {
  const { h, icon, toast, busy, skel, statusBadge } = UI;
  const V = window.Views = window.Views || {};
  const TZ = 'Asia/Makassar';
  const tglLong = t => new Date(t + 'T12:00:00+08:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
  const tglPendek = t => new Date(t + 'T12:00:00+08:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
  window.Fmt = { tglLong, tglPendek };
  const ring = k => { const p = k.batas ? Math.min(100, k.terpakai / k.batas * 100) : 0; return h('div.quota-ring', { style: `--p:${p}`, role: 'img', 'aria-label': `${k.terpakai} dari ${k.batas} terpakai` }, h('b', `${k.terpakai}/${k.batas}`)); };
  const kuotaBox = k => h('div.card.row', ring(k), h('div', h('div.sm.muted', 'Kuota bulan ini'), h('div', { style: 'font-weight:700;font-size:1.1rem' }, `${Math.max(0, k.batas - k.terpakai)} sesi tersisa`), h('div.sm.muted', 'Reset otomatis awal bulan')));
  window.kuotaBox = kuotaBox;

  V.udash = ctx => {
    const u = API.user, root = h('div.page'), slot = h('div.stack', skel(3, 90));
    root.append(h('div.ph', h('span.eyebrow', 'Dashboard Karyawan'), h('h1', 'Halo, ' + String(u.Nama).split(' ')[0] + ' 👋'), h('p.muted', 'Pesan sesi relaksasi Anda hari ini.')), slot);
    let jad = null, rw = null, pub = API.cachedPublik() || {};
    const draw = () => {
      if (!jad && !rw) return;
      const k = (jad && jad.kuota) || (rw && rw.kuota) || { terpakai: 0, batas: 2 };
      const hari = jad && jad.hari.find(d => d.buka && d.sesi.some(s => s.tersedia > 0));
      const adaToday = jad && jad.hari[0] && jad.hari[0].buka && jad.hari[0].sesi.some(s => s.tersedia > 0);
      const next = rw && rw.daftar.filter(r => r.status === 'Terjadwal').sort((a, b) => (a.tanggal + a.jamMulai).localeCompare(b.tanggal + b.jamMulai))[0];
      slot.replaceChildren(
        h('div.g4', kuotaBox(k),
          h('div.card', h('div.sm.muted', 'Unit Anda (otomatis dari jabatan)'), h('div.row.between', h('b', { style: 'font-size:1.2rem' }, u.UnitAkses), jad ? h('span.badge', { class: adaToday ? 'ok' : 'err' }, adaToday ? 'Tersedia' : 'Penuh / Tutup') : null), h('div.sm.muted', 'Shift ' + u.Shift + ' · ' + u.LevelJabatan)),
          h('div.card', h('div.sm.muted', 'Sesi terdekat'), next ? [h('b', { style: 'display:block;font-size:1.05rem' }, tglPendek(next.tanggal)), h('div.sm', next.jamMulai + '–' + next.jamSelesai + ' WITA · ' + next.unit)] : h('div.muted', 'Belum ada reservasi'))),
        h('div.row.wrap', { style: 'margin-top:16px' }, h('a.btn.pri', { href: '#/u/pesan' }, 'Pesan Kursi', icon('arrow', 18)), h('a.btn', { href: '#/u/reservasi' }, 'Reservasi Saya'),
          hari ? h('span.sm.muted', 'Slot terdekat tersedia: ' + tglPendek(hari.tanggal)) : null),
        pub.pengumuman && pub.pengumuman.length ? h('div', { style: 'margin-top:22px' }, h('h2', { style: 'margin-bottom:10px' }, 'Pengumuman'), h('div.stack', pub.pengumuman.map(a => h('div.card', h('h3', a.judul), h('p.muted', { style: 'white-space:pre-line' }, a.isi))))) : null,
        pub.cms && pub.cms.teks_kebijakan ? h('div.card', { style: 'margin-top:22px' }, h('h2', { style: 'margin-bottom:8px' }, 'Kebijakan & Aturan Pemakaian'), h('p', { style: 'white-space:pre-line' }, pub.cms.teks_kebijakan)) : null);
    };
    API.swr('jadwal', { hari: 21 }, d => { if (d) { jad = d; draw(); } }); API.swr('riwayat', null, d => { if (d) { rw = d; draw(); } });
    API.publik(p => { pub = p; draw(); });
    return root;
  };

  V.pesan = () => {
    const ubahId = (location.hash.split('?ubah=')[1] || '').replace(/[^A-Za-z0-9-]/g, ''), u = API.user;
    const S = { step: 1, tgl: null, sel: null, data: null, saving: false };
    const root = h('div.page'), body = h('div'), side = h('div.card');
    root.append(h('div.ph', h('span.eyebrow', 'Wellness Chair Reservation System'), h('h1', ubahId ? 'Ubah Jadwal Reservasi' : 'Pesan Kursi Pijat')), h('div#steps'), h('div.split', body, side));
    const selDay = () => S.data && S.data.hari.find(d => d.tanggal === S.tgl);
    const selSlot = () => { const d = selDay(); return d && S.sel && d.sesi.find(s => s.slotId === S.sel.slotId); };

    const stepsEl = () => h('div.steps', [['Pilih Tanggal', 'Langkah 1'], ['Penugasan Unit', 'Langkah 2'], ['Sesi & Konfirmasi', 'Langkah 3']].map((s, i) =>
      h('div.step', { class: S.step === i + 1 ? 'on' : '' }, h('i', i + 1), h('span', h('small', s[1].toUpperCase()), h('b', s[0])))));

    function kalender() {
      const hari = S.data.hari, first = new Date(hari[0].tanggal + 'T12:00:00+08:00'), lead = (first.getUTCDay() + 6) % 7; // Senin = 0
      const cells = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(n => h('div.hd', n));
      for (let i = 0; i < lead; i++) cells.push(h('div'));
      hari.forEach(d => {
        const ada = d.buka && d.sesi.some(s => s.tersedia > 0), penuh = d.buka && !ada, pas = d.tanggal.slice(8);
        cells.push(h('button.day', { class: (S.tgl === d.tanggal ? 'on ' : '') + (!d.buka ? 'off ' : '') + (ada ? 'ada ' : '') + (penuh ? 'full' : ''), disabled: !d.buka, 'aria-label': tglLong(d.tanggal) + (ada ? ', tersedia' : penuh ? ', penuh' : ', tutup'),
          onclick: () => { S.tgl = d.tanggal; S.sel = null; draw(); } }, pas, h('small', new Date(d.tanggal + 'T12:00:00+08:00').toLocaleDateString('id-ID', { month: 'short', timeZone: TZ }))));
      });
      return h('div.cal', cells);
    }

    function sesiList() {
      const d = selDay(); if (!d || !d.sesi.length) return h('div.empty', 'Tidak ada sesi untuk shift Anda pada tanggal ini.');
      return h('div', d.sesi.map(s => h('div.win', h('div.row.between', h('b', 'Jendela ' + s.jendela + ' WITA'), h('span.badge', { class: s.tersedia ? 'ok' : 'err' }, s.tersedia ? `${s.tersedia} dari ${s.kapasitas} tersedia` : 'Penuh')),
        h('div.sm.muted', `Sisa waktu ${s.jedaMenit} menit menjadi jeda persiapan`),
        h('div.chips', s.sub.map(x => h('button.chip', { class: (S.sel && S.sel.slotId === s.slotId && S.sel.mulai === x.mulai ? 'on ' : '') + (x.status === 'milikmu' ? 'mine' : ''), disabled: x.status !== 'tersedia',
          title: x.status === 'penuh' ? 'Sudah dipesan' : x.status === 'lewat' ? 'Waktu sudah lewat' : x.status === 'milikmu' ? 'Reservasi Anda' : '', onclick: () => { S.sel = { slotId: s.slotId, mulai: x.mulai, selesai: x.selesai }; draw(); } },
          x.mulai + '–' + x.selesai + (x.status === 'milikmu' ? ' ✓' : '')))))));
    }

    function konfirmasi(btn) {
      if (!S.sel || !S.tgl) return;
      busy(btn, async () => {
        const slotLama = JSON.parse(JSON.stringify(S.data)); // optimistic: tandai milikmu & naikkan kuota seketika
        const s = selSlot(); const sub = s.sub.find(x => x.mulai === S.sel.mulai); sub.status = 'milikmu'; s.tersedia = Math.max(0, s.tersedia - 1); if (!ubahId) S.data.kuota.terpakai++; draw();
        const r = await API.call(ubahId ? 'ubah' : 'buat', { id: ubahId || undefined, tanggal: S.tgl, slotId: S.sel.slotId, jamMulai: S.sel.mulai }).catch(e => ({ success: false, message: e.message }));
        API.invalidate('jadwal', 'riwayat', 'boot');
        if (!r.success) { S.data = slotLama; S.sel = null; draw(); toast(r.message, 'err'); API.swr('jadwal', { hari: 21 }, d => { if (d) { S.data = d; draw(); } }, { fresh: 0 }); return; }
        toast(ubahId ? 'Jadwal berhasil diubah ✓' : 'Reservasi berhasil! Konfirmasi dikirim ke notifikasi Anda.', 'ok'); location.hash = '#/u/reservasi';
      });
    }

    function ringkasan() {
      const d = selDay(), s = selSlot();
      return [h('div.row.between', h('h2', 'Ringkasan Pemesanan'), icon('doc', 22)),
        h('dl.sum', { style: 'margin-top:14px' }, h('dt', 'Tanggal Terpilih'), h('dd', S.tgl ? tglLong(S.tgl) : '—'), h('dt', 'Unit Ditugaskan'), h('dd', (S.data ? S.data.unit : u.UnitAkses) + ' (' + u.LevelJabatan + ')'),
          h('dt', 'Shift & Waktu'), h('dd', S.sel ? `Shift ${u.Shift} (${S.sel.mulai} – ${S.sel.selesai} WITA)` : 'Shift ' + u.Shift), h('dt', 'Ketersediaan Slot'), h('dd', s ? `${s.tersedia} dari ${s.kapasitas} tersedia` : '—'),
          S.data ? [h('dt', 'Kuota bulan ini'), h('dd', `${S.data.kuota.terpakai} dari ${S.data.kuota.batas} terpakai`)] : null),
        h('div.card', { style: 'background:var(--cont);box-shadow:none' }, h('b.sm', 'Catatan Penting:'), h('p.sm.muted', 'Hadir 5 menit sebelum sesi dimulai. Perubahan atau pembatalan hanya bisa dilakukan sebelum sesi dimulai; pembatalan mengembalikan kuota.'))];
    }

    function draw() {
      root.querySelector('#steps').replaceWith(Object.assign(stepsEl(), { id: 'steps' }));
      if (!S.data) { body.replaceChildren(skel(3, 80)); side.replaceChildren(...ringkasan()); return; }
      let isi;
      if (S.step === 1) isi = [h('h2', 'Pilih Tanggal Reservasi'), h('p.muted.sm', { style: 'margin:6px 0 14px' }, 'Hanya sesi untuk shift ' + u.Shift + ' yang ditampilkan. Titik hijau = masih ada slot, merah = penuh.'), kalender(),
        h('div.row', { style: 'justify-content:flex-end;margin-top:16px' }, h('button.btn.pri', { disabled: !S.tgl, onclick: () => { S.step = 2; draw(); } }, 'Lanjut ke Penugasan Unit', icon('arrow', 18)))];
      else if (S.step === 2) isi = [h('h2', 'Penugasan Unit Otomatis'), h('div.card', { style: 'background:var(--cont);box-shadow:none;margin:14px 0' }, h('div.row', icon('chair', 28), h('div', h('b', { style: 'font-size:1.2rem' }, S.data.unit), h('div.sm.muted', `Ditentukan otomatis dari level jabatan Anda (${u.LevelJabatan}). Unit tidak dapat diganti.`)))),
        h('div.row.between', h('button.btn', { onclick: () => { S.step = 1; draw(); } }, 'Kembali'), h('button.btn.pri', { onclick: () => { S.step = 3; draw(); } }, 'Pilih Sesi', icon('arrow', 18)))];
      else { const b = h('button.btn.pri', { disabled: !S.sel, onclick: e => konfirmasi(e.currentTarget) }, ubahId ? 'Simpan Perubahan' : 'Konfirmasi Reservasi');
        isi = [h('h2', 'Sesi pada ' + tglLong(S.tgl)), h('div', { style: 'margin-top:12px' }, sesiList()), h('div.row.between', h('button.btn', { onclick: () => { S.step = 2; draw(); } }, 'Kembali'), b)]; }
      body.replaceChildren(h('div.card', isi)); side.replaceChildren(...ringkasan());
    }
    draw();
    API.swr('jadwal', { hari: 21 }, d => { if (d) { S.data = d; if (!S.tgl) { const f = d.hari.find(x => x.buka && x.sesi.some(s => s.tersedia > 0)); if (f) S.tgl = f.tanggal; } draw(); } else draw(); }, { fresh: 0 });
    return root;
  };
})();
