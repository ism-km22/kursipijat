/* views-admin2.js — Pengaturan Kuota, Sesi, Laporan & Analitik */
(function () {
  const { h, icon, toast, busy, skel, statusBadge, modal, konfirmasi } = UI;
  const V = window.Views = window.Views || {};
  const { debounce, stat, sel, pager } = window.AdminUI;
  const bln = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' }).slice(0, 7);
  const barRow = (label, val, max, teks) => h('div', { style: 'margin-bottom:12px' }, h('div.row.between.sm', h('span', label), h('b', teks || String(val))), h('div.bar', { role: 'img', 'aria-label': `${label}: ${teks || val}` }, h('i', { style: `width:${max ? Math.min(100, val / max * 100) : 0}%` })));

  V.akuota = () => {
    const F = { page: 1, periode: bln() }, root = h('div.page'), tb = h('div.tw'), foot = h('div'), defEl = h('span.badge.info');
    const load = () => { tb.replaceChildren(skel(5, 48)); API.swr('kuotaAdmin', F, d => { if (d) draw(d); }, { persist: false }); };
    const refresh = () => { API.invalidate('kuotaAdmin', 'jadwal', 'boot', 'riwayat'); load(); };
    const ubahBatas = (u, per) => { const inp = h('input.inp', { type: 'number', min: 0, max: 31, value: u.batas });
      const m = modal('Atur Kuota — ' + u.nama, h('div.stack', h('div.fg', h('label.f', 'Batas pemakaian per bulan (' + per + ')'), inp), h('button.btn.pri.blk', { onclick: e => busy(e.currentTarget, async () => { const r = await API.call('setKuota', { userId: u.userId, batas: inp.value, periode: per }); if (!r.success) return toast(r.message, 'err'); toast('Kuota diperbarui', 'ok'); m.close(); refresh(); }) }, 'Simpan'))); };
    const reset = async (u, per) => { if (!await konfirmasi('Reset pemakaian?', `Pemakaian ${u.nama} bulan ${per} menjadi 0.`, 'Reset')) return; const r = await API.call('setKuota', { userId: u.userId, reset: true, periode: per }); r.success ? (toast('Direset', 'ok'), refresh()) : toast(r.message, 'err'); };
    const defGlobal = d => { const inp = h('input.inp', { type: 'number', min: 0, max: 31, value: d.defaultBatas }); const m = modal('Batas Bulanan Default', h('div.stack', h('p.sm.muted', 'Berlaku untuk semua karyawan yang belum diatur khusus.'), inp, h('button.btn.pri.blk', { onclick: e => busy(e.currentTarget, async () => { const r = await API.call('simpanCms', { settings: { kuota_bulanan_default: inp.value } }); if (!r.success) return toast(r.message, 'err'); m.close(); API.invalidate('cmsAdmin'); refresh(); toast('Default diperbarui', 'ok'); }) }, 'Simpan'))); };
    function draw(d) {
      defEl.replaceChildren(`Default: ${d.defaultBatas}x / bulan`);
      tb.replaceChildren(d.items.length ? h('table', h('thead', h('tr', ['Karyawan', 'Departemen', 'Unit', 'Pemakaian', 'Aksi'].map(c => h('th', c)))), h('tbody', d.items.map(u => h('tr', h('td', h('b', u.nama), h('div.sm.muted', u.nik)), h('td', u.departemen), h('td', u.unit),
        h('td', h('span.badge', { class: u.terpakai >= u.batas ? 'err' : 'ok' }, `${u.terpakai} / ${u.batas}`)), h('td', h('div.row', h('button.btn.sm', { onclick: () => ubahBatas(u, d.periode) }, 'Atur'), h('button.btn.sm', { onclick: () => reset(u, d.periode) }, 'Reset'))))))) : h('div.empty', 'Tidak ada data.'));
      foot.replaceChildren(pager(d, p => { F.page = p; load(); })); root._d = d;
    }
    root.append(h('div.row.between.wrap.ph', h('div', h('span.eyebrow', 'Portal Admin'), h('h1', 'Pengaturan Kuota'), h('p.muted', 'Atur batas bulanan global atau per karyawan, dan reset pemakaian.')), h('div.row', defEl, h('button.btn.pri', { onclick: () => root._d && defGlobal(root._d) }, 'Ubah Default'))),
      h('div.card', h('div.row.wrap', h('input.inp.grow', { placeholder: 'Cari NIK / nama…', 'aria-label': 'Cari', style: 'min-width:180px', oninput: debounce(e => { F.q = e.target.value; F.page = 1; load(); }) }),
        h('input.inp', { type: 'month', value: F.periode, 'aria-label': 'Periode', style: 'width:auto', onchange: e => { F.periode = e.target.value; F.page = 1; load(); } })), tb, foot));
    load(); return root;
  };

  V.asesi = () => {
    const root = h('div.page'), box = h('div.tw', skel(4, 52));
    const edit = s => { const du = h('input.inp', { type: 'number', min: 5, max: 120, value: s.DurasiSesiMenit }), kp = h('input.inp', { type: 'number', min: 1, max: 20, value: s.Kapasitas }), ak = h('input', { type: 'checkbox', checked: s.Aktif === true || s.Aktif === 'TRUE' || s.Aktif === 'YA' });
      const jendela = (String(s.JamSelesai).slice(0, 5) + '').split(':').map(Number), mulai = String(s.JamMulai).slice(0, 5).split(':').map(Number), w = (jendela[0] * 60 + jendela[1]) - (mulai[0] * 60 + mulai[1]), pre = h('p.sm.muted');
      const hitung = () => { const pakai = (+du.value) * (+kp.value); pre.textContent = pakai > w ? `⚠ Total sesi ${pakai} menit melebihi jendela ${w} menit — sesi berlebih tidak ditampilkan.` : `Jendela ${w} menit: ${pakai} menit untuk sesi, ${w - pakai} menit menjadi jeda.`; }; du.oninput = kp.oninput = hitung; hitung();
      const m = modal(`Ubah Sesi ${s.Unit} · ${s.Shift}`, h('div.stack', h('div.grid2', h('div.fg', h('label.f', 'Durasi sesi (menit)'), du), h('div.fg', h('label.f', 'Kapasitas (jumlah sesi)'), kp)), pre, h('label.row', ak, 'Aktif'),
        h('button.btn.pri.blk', { onclick: e => busy(e.currentTarget, async () => { const r = await API.call('simpanSlot', { slotId: s.SlotID, durasi: du.value, kapasitas: kp.value, aktif: ak.checked }); if (!r.success) return toast(r.message, 'err'); API.invalidate('slotAdmin', 'jadwal'); toast('Sesi diperbarui', 'ok'); m.close(); load(); }) }, 'Simpan'))); };
    const load = () => API.swr('slotAdmin', null, d => { if (!d) return; box.replaceChildren(h('table', h('thead', h('tr', ['Shift', 'Unit', 'Jendela', 'Durasi', 'Kapasitas', 'Aktif', 'Aksi'].map(c => h('th', c)))),
      h('tbody', d.slots.map(s => h('tr', h('td', s.Shift), h('td', s.Unit), h('td', `${String(s.JamMulai).slice(0, 5)}–${String(s.JamSelesai).slice(0, 5)}`), h('td', s.DurasiSesiMenit + ' mnt'), h('td', s.Kapasitas), h('td', statusBadge(s.Aktif === 'YA' || s.Aktif === true || s.Aktif === 'TRUE' ? 'Aktif' : 'Nonaktif')), h('td', h('button.btn.sm', { onclick: () => edit(s) }, icon('edit', 16))))))));
    }, { persist: false });
    root.append(h('div.ph', h('span.eyebrow', 'Portal Admin'), h('h1', 'Sesi'), h('p.muted', 'Master jendela waktu. Sisa waktu jendela otomatis menjadi jeda persiapan/pergantian.')), h('div.card', box)); load(); return root;
  };

  V.alaporan = () => {
    const F = { page: 1, dari: bln() + '-01', sampai: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Makassar' }) }, root = h('div.page'), charts = h('div.g3'), tb = h('div.tw'), foot = h('div');
    const load = () => { tb.replaceChildren(skel(4, 48)); API.swr('laporan', F, d => { if (d) draw(d); }, { persist: false }); };
    const set = (k, v) => { F[k] = v || undefined; F.page = 1; load(); };
    const unduh = (fmt, btn) => busy(btn, async () => { toast('Menyiapkan berkas…'); const r = await API.call('ekspor', Object.assign({}, F, { format: fmt })); if (!r.success) return toast(r.message, 'err'); UI.downloadB64(r.data.nama, r.data.mime, r.data.base64); toast('Berkas terunduh', 'ok'); });
    function draw(d) {
      const s = d.statistik, mx = Math.max(1, ...s.tren.map(t => t.jumlah));
      charts.replaceChildren(h('div.card', h('h3', { style: 'margin-bottom:12px' }, 'Utilisasi Sesi per Unit'), s.utilisasi.map(u => barRow(u.unit, u.terpakai, u.kapasitas, `${u.persen}% (${u.terpakai}/${u.kapasitas})`))),
        h('div.card', h('h3', { style: 'margin-bottom:12px' }, 'Tren Pemakaian Bulanan'), s.tren.length ? s.tren.map(t => barRow(t.bulan, t.jumlah, mx)) : h('div.muted', 'Belum ada data')),
        h('div.card', h('h3', { style: 'margin-bottom:12px' }, 'Kepatuhan Kuota'), barRow('Memakai kuota penuh', s.kepatuhan.penuh, s.kepatuhan.penuh + s.kepatuhan.patuh), barRow('Di bawah batas', s.kepatuhan.patuh, s.kepatuhan.penuh + s.kepatuhan.patuh),
          h('div.sm.muted', `Total ${s.ringkas.total} · Selesai ${s.ringkas.selesai} · Terjadwal ${s.ringkas.terjadwal} · Batal ${s.ringkas.dibatalkan}`)));
      tb.replaceChildren(d.items.length ? h('table', h('thead', h('tr', ['Tanggal', 'Jam', 'NIK', 'Nama', 'Departemen', 'Unit', 'Shift', 'Status'].map(c => h('th', c)))), h('tbody', d.items.map(r => h('tr', h('td', r.tanggal), h('td', r.jamMulai + '–' + r.jamSelesai), h('td', r.nik), h('td', r.nama), h('td', r.departemen), h('td', r.unit), h('td', r.shift), h('td', statusBadge(r.status)))))) : h('div.empty', 'Tidak ada data pada rentang ini.'));
      foot.replaceChildren(pager(d, p => { F.page = p; load(); }));
    }
    root.append(h('div.row.between.wrap.ph', h('div', h('span.eyebrow', 'Portal Admin'), h('h1', 'Laporan & Analitik'), h('p.muted', 'Riwayat pemakaian dengan filter dan ekspor.')),
      h('div.row', h('button.btn.pri', { onclick: e => unduh('xlsx', e.currentTarget) }, icon('down', 18), 'Excel'), h('button.btn', { onclick: e => unduh('pdf', e.currentTarget) }, icon('down', 18), 'PDF'))),
      h('div.card.row.wrap', h('div.fg', { style: 'margin:0' }, h('label.f', 'Dari'), h('input.inp', { type: 'date', value: F.dari, onchange: e => set('dari', e.target.value) })), h('div.fg', { style: 'margin:0' }, h('label.f', 'Sampai'), h('input.inp', { type: 'date', value: F.sampai, onchange: e => set('sampai', e.target.value) })),
        sel('l-u', 'Semua Unit', ['Unit 1', 'Unit 2'], '', v => set('unit', v)), sel('l-s', 'Semua Status', ['Terjadwal', 'Selesai', 'Dibatalkan'], '', v => set('status', v)),
        h('input.inp.grow', { placeholder: 'Cari nama / NIK…', 'aria-label': 'Cari', style: 'min-width:160px', oninput: debounce(e => set('q', e.target.value)) })), h('div', { style: 'margin-top:16px' }, charts), h('div.card', { style: 'margin-top:16px' }, tb, foot));
    load(); return root;
  };
})();
