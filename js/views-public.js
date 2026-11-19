/* views-public.js — landing, login, registrasi, ganti sandi wajib */
(function () {
  const { h, icon, toast, busy, modal } = UI;
  const V = window.Views = window.Views || {};
  const kosongCms = { judul_sambutan: 'Reservasi Kursi Pijat', teks_sambutan: '', teks_kebijakan: '', nama_instansi: 'Dept HRGAIT', logo_url: '', banner_url: '' };
  const logoEl = cms => h('div.logo', cms.logo_url ? h('img', { src: cms.logo_url, alt: 'Logo', referrerpolicy: 'no-referrer' }) : h('span', { style: 'color:#fff' }, icon('lotus', 34)));
  const lanjutKeApp = u => { location.hash = u.Role === 'Admin' ? '#/a/dashboard' : '#/u/dashboard'; };

  V.landing = () => {
    const root = h('div.hero', { style: 'align-items:start' }), box = h('div.landing');
    root.appendChild(box);
    const render = d => {
      const cms = Object.assign({}, kosongCms, d && d.cms); UI.setTema(cms.warna_utama); box.replaceChildren(
        h('div.row.between', { style: 'margin-bottom:16px' }, h('div.brand', { style: 'padding:0' }, cms.logo_url ? h('img', { src: cms.logo_url, alt: '' }) : icon('lotus', 28), cms.nama_instansi || 'HRGAIT'),
          h('div.row', h('a.btn', { href: '#/masuk' }, 'Masuk'), h('a.btn.pri', { href: '#/daftar' }, 'Daftar'))),
        h('div.banner', { style: cms.banner_url ? `background-image:url("${encodeURI(cms.banner_url)}")` : '' }),
        h('div.stack', h('span.eyebrow', 'Fasilitas kesejahteraan karyawan'), h('h1', cms.judul_sambutan), h('p.muted', { style: 'white-space:pre-line' }, cms.teks_sambutan),
          h('div.row', h('a.btn.pri', { href: '#/masuk' }, 'Masuk ke Sesi', icon('arrow', 18)), h('a.btn', { href: '#/daftar' }, 'Daftar Akun'))),
        d && d.pengumuman && d.pengumuman.length ? h('div', { style: 'margin-top:26px' }, h('h2', { style: 'margin-bottom:10px' }, 'Pengumuman'),
          h('div.stack', d.pengumuman.map(a => h('div.card', h('h3', a.judul), h('p.muted', { style: 'white-space:pre-line' }, a.isi))))) : null,
        cms.teks_kebijakan ? h('div.card', { style: 'margin-top:26px' }, h('h2', { style: 'margin-bottom:8px' }, 'Kebijakan & Aturan Pemakaian'), h('p', { style: 'white-space:pre-line' }, cms.teks_kebijakan)) : null);
    };
    render(API.cachedPublik()); API.publik(render); return root;
  };

  V.masuk = () => {
    const cms = Object.assign({}, kosongCms, (API.cachedPublik() || {}).cms), err = h('div.err-msg.hide', { role: 'alert' });
    const nik = h('input.inp', { id: 'nik', placeholder: 'Contoh: HRG199204', autocomplete: 'username', autocapitalize: 'off', required: true });
    const pw = h('input.inp', { id: 'pw', type: 'password', placeholder: '••••••••', autocomplete: 'current-password', required: true });
    const eye = h('button', { type: 'button', 'aria-label': 'Tampilkan sandi', onclick: () => { pw.type = pw.type === 'password' ? 'text' : 'password'; } }, icon('eye', 18));
    const btn = h('button.btn.pri.blk', { type: 'submit', style: 'min-height:50px' }, 'Masuk ke Sesi ', icon('arrow', 18));
    const form = h('form', { onsubmit: e => {
      e.preventDefault(); err.classList.add('hide');
      busy(btn, async () => {
        const r = await API.call('login', { nik: nik.value, password: pw.value }).catch(x => ({ success: false, message: x.message }));
        if (!r.success) { err.textContent = r.message; err.classList.remove('hide'); return; }
        API.setSession(r.data.token, r.data.user);
        if (!r.data.user.WajibGantiSandi) API.prefetch(); // jangan menunggu: halaman langsung tampil
        lanjutKeApp(r.data.user);
      });
    } }, err, h('div.fg', h('label.f', { for: 'nik' }, 'Nomor Induk Karyawan (NIK) / Email'), nik),
      h('div.fg', h('div.row.between', h('label.f', { for: 'pw' }, 'Kata Sandi'), h('a.sm', { href: '#', style: 'color:var(--primary);font-weight:600', onclick: e => { e.preventDefault(); modal('Lupa Kata Sandi?', h('p', 'Reset kata sandi dilakukan oleh admin Dept HRGAIT. Hubungi admin; Anda akan menerima sandi sementara dan wajib menggantinya saat masuk.')); } }, 'Lupa Kata Sandi?')), h('div.pw', pw, eye)), btn);
    return h('div.hero', h('div.card.authc', h('div.stack', { style: 'text-align:center' }, logoEl(cms), h('div.eyebrow', 'Dept HRGAIT Wellness'), h('h1', cms.judul_sambutan || 'Reservasi Kursi Pijat'), h('p.muted', 'Masuk untuk memesan sesi relaksasi Anda.')),
      h('div', { style: 'margin-top:22px;text-align:left' }, form),
      h('div.sm.muted', { style: 'text-align:center;border-top:1px solid var(--line);margin-top:20px;padding-top:14px' }, 'Belum memiliki akun karyawan? ', h('a', { href: '#/daftar', style: 'color:var(--primary);font-weight:700' }, 'Daftar Akun'))));
  };

  V.daftar = () => {
    const err = h('div.err-msg.hide', { role: 'alert' }), pub = API.cachedPublik() || {}, levels = pub.level || ['Manager', 'Section Head', 'Supervisor', 'Staff', 'Operator'];
    const f = (id, label, attrs) => h('div.fg', h('label.f', { for: id }, label), h('input.inp', Object.assign({ id, required: true }, attrs)));
    const lvl = h('select.inp', { id: 'level', required: true }, h('option', { value: '' }, 'Pilih level…'), levels.map(l => h('option', { value: l }, l)));
    const shf = h('select.inp', { id: 'shift', required: true }, h('option', { value: '' }, 'Pilih shift…'), h('option', { value: 'Siang' }, 'Shift Siang (18.00–21.00)'), h('option', { value: 'Malam' }, 'Shift Malam (12.00–13.00 & 17.00–18.00)'));
    const btn = h('button.btn.pri.blk', { type: 'submit' }, 'Daftar');
    const el = h('form', { onsubmit: e => {
      e.preventDefault(); err.classList.add('hide'); const v = id => el.querySelector('#' + id).value.trim();
      if (v('password') !== v('password2')) { err.textContent = 'Konfirmasi password tidak sama.'; err.classList.remove('hide'); return; }
      busy(btn, async () => {
        const r = await API.call('register', { nik: v('rnik'), nama: v('nama'), departemen: v('dept'), level: v('level'), shift: v('shift'), noWA: v('wa'), email: v('email'), password: el.querySelector('#password').value }).catch(x => ({ success: false, message: x.message }));
        if (!r.success) { err.textContent = r.message; err.classList.remove('hide'); return; }
        modal('Pendaftaran Berhasil', h('div.stack', h('p', r.data.pesan), h('a.btn.pri.blk', { href: '#/masuk' }, 'Ke Halaman Masuk')));
      });
    } }, err, f('rnik', 'NIK', { autocomplete: 'username' }), f('nama', 'Nama Lengkap', { autocomplete: 'name' }), f('dept', 'Departemen'),
      h('div.grid2', h('div.fg', h('label.f', { for: 'level' }, 'Level Jabatan'), lvl), h('div.fg', h('label.f', { for: 'shift' }, 'Shift'), shf)),
      h('div.grid2', f('wa', 'No. WhatsApp', { type: 'tel', placeholder: '08xxxxxxxxxx', required: false }), f('email', 'Email', { type: 'email', required: false })),
      h('div.grid2', f('password', 'Password (min. 8 karakter)', { type: 'password', minlength: 8, autocomplete: 'new-password' }), f('password2', 'Ulangi Password', { type: 'password', autocomplete: 'new-password' })),
      h('p.sm.muted', { style: 'margin-bottom:12px' }, 'Isi minimal salah satu: No. WhatsApp atau Email. Akun aktif setelah diverifikasi admin HRGAIT.'), btn);
    return h('div.hero', h('div.card.authc', { style: 'max-width:620px' }, h('h1', { style: 'margin-bottom:4px' }, 'Daftar Akun'), h('p.muted', { style: 'margin-bottom:18px' }, 'Buat akun karyawan untuk memesan kursi pijat.'), el,
      h('p.sm.muted', { style: 'text-align:center;margin-top:14px' }, 'Sudah punya akun? ', h('a', { href: '#/masuk', style: 'color:var(--primary);font-weight:700' }, 'Masuk'))));
  };

  V.ganti = () => {
    const err = h('div.err-msg.hide'), btn = h('button.btn.pri.blk', { type: 'submit' }, 'Simpan Sandi Baru');
    const inp = (id, l) => h('div.fg', h('label.f', { for: id }, l), h('input.inp', { id, type: 'password', required: true, minlength: id === 'lama' ? 1 : 8, autocomplete: id === 'lama' ? 'current-password' : 'new-password' }));
    const form = h('form', { onsubmit: e => {
      e.preventDefault(); const v = id => form.querySelector('#' + id).value; err.classList.add('hide');
      if (v('baru') !== v('baru2')) { err.textContent = 'Konfirmasi sandi tidak sama.'; err.classList.remove('hide'); return; }
      busy(btn, async () => { const r = await API.call('gantiSandi', { lama: v('lama'), baru: v('baru') }); if (!r.success) { err.textContent = r.message; err.classList.remove('hide'); return; } toast('Sandi diperbarui. Silakan masuk kembali.', 'ok'); API.logout(true); location.hash = '#/masuk'; });
    } }, err, inp('lama', 'Sandi Sementara / Saat Ini'), inp('baru', 'Sandi Baru'), inp('baru2', 'Ulangi Sandi Baru'), btn);
    return h('div.hero', h('div.card.authc', h('h1', { style: 'margin-bottom:6px' }, 'Ganti Sandi'), h('p.muted', { style: 'margin-bottom:16px' }, 'Demi keamanan, Anda wajib mengganti sandi sementara sebelum melanjutkan.'), form));
  };
})();
