/* views-admin3.js — CMS: tampilan, kebijakan, pengumuman, sistem & notifikasi */
(function () {
  const { h, icon, toast, busy, skel, modal, konfirmasi } = UI;
  const V = window.Views = window.Views || {};
  const HARI = [['1', 'Sen'], ['2', 'Sel'], ['3', 'Rab'], ['4', 'Kam'], ['5', 'Jum'], ['6', 'Sab'], ['7', 'Min']];

  V.acms = () => {
    const root = h('div.page'), box = h('div.stack', skel(4, 120)); let D = null;
    root.append(h('div.ph', h('span.eyebrow', 'Portal Admin'), h('h1', 'CMS Tampilan & Kebijakan'), h('p.muted', 'Perubahan langsung tampil di halaman utama tanpa deploy ulang.')), box);

    const field = (k, label, el) => h('div.fg', h('label.f', { for: 'c-' + k }, label), el);
    const text = (k, v, a) => h('input.inp', Object.assign({ id: 'c-' + k, value: v || '' }, a));
    const area = (k, v, rows) => h('textarea.inp', { id: 'c-' + k, rows: rows || 5 }, v || '');

    const upload = (kunci, label) => { const f = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', 'aria-label': label, onchange: e => {
      const file = e.target.files[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) return toast('Maksimal 2 MB', 'err');
      const rd = new FileReader(); rd.onload = async () => { toast('Mengunggah…'); const r = await API.call('unggahAset', { kunci, mime: file.type, base64: String(rd.result).split(',')[1] }); if (!r.success) return toast(r.message, 'err'); toast(label + ' diperbarui', 'ok'); API.invalidate('cmsAdmin'); API.publik(() => {}); load(); }; rd.readAsDataURL(file); } });
      return h('div.fg', h('label.f', label), D.cms[kunci] ? h('img', { src: D.cms[kunci], alt: label, style: 'max-height:80px;border-radius:10px;display:block;margin-bottom:8px', referrerpolicy: 'no-referrer' }) : h('p.sm.muted', 'Belum ada gambar'), f); };

    const simpan = (keys, btn, extra) => busy(btn, async () => {
      const s = {}; keys.forEach(k => { const el = document.getElementById('c-' + k); if (el) s[k] = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value; }); Object.assign(s, extra || {});
      const r = await API.call('simpanCms', { settings: s }); if (!r.success) return toast(r.message, 'err'); D = r.data; API.invalidate('cmsAdmin'); API.publik(p => { if (p && p.cms) UI.setTema(p.cms.warna_utama); }); toast('Tersimpan — langsung tampil di halaman utama ✓', 'ok'); });

    const pratinjau = () => { const v = k => (document.getElementById('c-' + k) || {}).value || '';
      modal('Pratinjau Halaman Utama', h('div.stack', { style: '--primary:' + (/^#[0-9a-f]{6}$/i.test(v('warna_utama')) ? v('warna_utama') : '#4f378b') }, h('div.banner', { style: D.cms.banner_url ? `background-image:url("${encodeURI(D.cms.banner_url)}")` : '' }), h('h1', v('judul_sambutan')), h('p.muted', { style: 'white-space:pre-line' }, v('teks_sambutan')), h('div.card', { style: 'background:var(--cont);box-shadow:none' }, h('b', 'Kebijakan'), h('p.sm', { style: 'white-space:pre-line' }, v('teks_kebijakan'))), h('span.btn.pri', 'Masuk'))); };

    const ann = a => { const j = h('input.inp', { value: a ? a.judul : '' }), i = h('textarea.inp', a ? a.isi : ''), m1 = h('input.inp', { type: 'date', value: a ? a.mulai : '' }), m2 = h('input.inp', { type: 'date', value: a ? a.selesai : '' }), ak = h('input', { type: 'checkbox', checked: a ? a.aktif : true });
      const m = modal(a ? 'Ubah Pengumuman' : 'Pengumuman Baru', h('div.stack', h('div.fg', h('label.f', 'Judul'), j), h('div.fg', h('label.f', 'Isi'), i), h('div.grid2', h('div.fg', h('label.f', 'Mulai tampil'), m1), h('div.fg', h('label.f', 'Selesai tampil'), m2)), h('label.row', ak, 'Aktif'),
        h('button.btn.pri.blk', { onclick: e => busy(e.currentTarget, async () => { const r = await API.call('simpanPengumuman', { id: a && a.id, judul: j.value, isi: i.value, mulai: m1.value, selesai: m2.value, aktif: ak.checked }); if (!r.success) return toast(r.message, 'err'); D = r.data; m.close(); API.publik(() => {}); draw(); toast('Pengumuman disimpan', 'ok'); }) }, 'Simpan'))); };
    const hapus = async a => { if (!await konfirmasi('Hapus pengumuman?', a.judul, 'Hapus', true)) return; const r = await API.call('hapusPengumuman', { id: a.id }); if (r.success) { D = r.data; API.publik(() => {}); draw(); toast('Dihapus', 'ok'); } else toast(r.message, 'err'); };

    function draw() {
      const c = D.cms, ops = (c.hari_operasional || '1,2,3,4,5').split(',');
      const hariBox = h('div.row.wrap', { id: 'hari-box' }, HARI.map(x => h('label.row', h('input', { type: 'checkbox', value: x[0], checked: ops.indexOf(x[0]) > -1 }), x[1])));
      const tokenEl = h('input.inp', { id: 'tok', type: 'password', placeholder: D.rahasia.FONNTE_TOKEN.ada ? 'Tersimpan: ' + D.rahasia.FONNTE_TOKEN.tersamar + ' (kosongkan = tidak berubah)' : 'Tempel token Fonnte', autocomplete: 'off' });
      box.replaceChildren(
        h('div.card', h('h2', { style: 'margin-bottom:12px' }, 'Tampilan & Sambutan'), h('div.grid2', field('nama_instansi', 'Nama instansi', text('nama_instansi', c.nama_instansi)), field('warna_utama', 'Warna utama', text('warna_utama', c.warna_utama, { type: 'color', style: 'padding:4px;height:44px' }))),
          field('judul_sambutan', 'Judul sambutan', text('judul_sambutan', c.judul_sambutan)), field('teks_sambutan', 'Teks sambutan', area('teks_sambutan', c.teks_sambutan, 3)), h('div.grid2', upload('logo_url', 'Logo perusahaan'), upload('banner_url', 'Banner utama')),
          h('div.row', h('button.btn.pri', { onclick: e => simpan(['nama_instansi', 'warna_utama', 'judul_sambutan', 'teks_sambutan'], e.currentTarget) }, 'Simpan'), h('button.btn', { onclick: pratinjau }, icon('eye', 18), 'Pratinjau'))),
        h('div.card', h('h2', { style: 'margin-bottom:12px' }, 'Kebijakan & Aturan Pemakaian'), field('teks_kebijakan', 'Teks kebijakan', area('teks_kebijakan', c.teks_kebijakan, 7)), h('div.row', h('button.btn.pri', { onclick: e => simpan(['teks_kebijakan'], e.currentTarget) }, 'Simpan'), h('button.btn', { onclick: pratinjau }, icon('eye', 18), 'Pratinjau'))),
        h('div.card', h('div.row.between', h('h2', 'Pengumuman'), h('button.btn.sm.pri', { onclick: () => ann(null) }, icon('plus', 16), 'Baru')), h('div.stack', { style: 'margin-top:12px' }, D.pengumuman.length ? D.pengumuman.map(a => h('div.row.between', { style: 'padding:10px;background:var(--cont);border-radius:10px' }, h('div', h('b', a.judul), h('div.sm.muted', (a.aktif ? 'Aktif' : 'Nonaktif') + (a.mulai ? ' · ' + a.mulai : '') + (a.selesai ? ' s.d. ' + a.selesai : ''))),
          h('div.row', h('button.btn.sm', { 'aria-label': 'Ubah', onclick: () => ann(a) }, icon('edit', 16)), h('button.btn.sm.dng', { 'aria-label': 'Hapus', onclick: () => hapus(a) }, icon('trash', 16))))) : h('div.muted', 'Belum ada pengumuman.'))),
        h('div.card', h('h2', { style: 'margin-bottom:12px' }, 'Pengaturan Sistem'), h('div.grid2', field('kuota_bulanan_default', 'Kuota bulanan default', text('kuota_bulanan_default', c.kuota_bulanan_default, { type: 'number', min: 0 })), field('pengingat_menit', 'Pengingat sebelum sesi (menit)', text('pengingat_menit', c.pengingat_menit, { type: 'number', min: 5 }))),
          field('app_url', 'URL aplikasi (untuk tautan di notifikasi)', text('app_url', c.app_url, { placeholder: 'https://username.github.io/repo/' })), h('div.fg', h('label.f', 'Hari operasional'), hariBox),
          h('div.row.wrap', h('label.row', h('input', { type: 'checkbox', id: 'c-notif_email_aktif', checked: c.notif_email_aktif === '1' }), 'Notifikasi Email'), h('label.row', h('input', { type: 'checkbox', id: 'c-notif_wa_aktif', checked: c.notif_wa_aktif === '1' }), 'Notifikasi WhatsApp')),
          h('button.btn.pri', { style: 'margin-top:14px', onclick: e => simpan(['kuota_bulanan_default', 'pengingat_menit', 'app_url', 'notif_email_aktif', 'notif_wa_aktif'], e.currentTarget, { hari_operasional: [...hariBox.querySelectorAll('input:checked')].map(x => x.value).join(',') || '1,2,3,4,5' }) }, 'Simpan Pengaturan')),
        h('div.card', h('h2', { style: 'margin-bottom:6px' }, 'Token WhatsApp (Fonnte)'), h('p.sm.muted', { style: 'margin-bottom:12px' }, 'Disimpan aman di Script Properties — tidak pernah ditampilkan utuh atau disimpan di Sheet.'), h('div.fg', tokenEl),
          h('div.row.wrap', h('button.btn.pri', { onclick: e => busy(e.currentTarget, async () => { if (!tokenEl.value.trim()) return toast('Isi token terlebih dahulu', 'err'); const r = await API.call('simpanRahasia', { FONNTE_TOKEN: tokenEl.value }); if (!r.success) return toast(r.message, 'err'); toast('Token tersimpan', 'ok'); API.invalidate('cmsAdmin'); load(); }) }, 'Simpan Token'),
            h('button.btn', { onclick: e => busy(e.currentTarget, async () => { const r = await API.call('ujiWA', { noWA: API.user.NoWA }); r.success ? toast(r.data.pesan, 'ok') : toast(r.message, 'err'); }) }, 'Kirim Tes ke WA Saya'),
            D.rahasia.FONNTE_TOKEN.ada ? h('button.btn.dng', { onclick: async e => { if (await konfirmasi('Hapus token?', 'Notifikasi WA berhenti.', 'Hapus', true)) { await API.call('simpanRahasia', { FONNTE_TOKEN: '__HAPUS__' }); API.invalidate('cmsAdmin'); load(); } } }, 'Hapus Token') : null)));
    }
    const load = () => API.swr('cmsAdmin', null, d => { if (d) { D = d; draw(); } else if (!D) box.replaceChildren(h('div.err-msg', 'Gagal memuat CMS.')); }, { persist: false });
    load(); return root;
  };
})();
