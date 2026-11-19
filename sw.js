/* Service Worker — shell aplikasi instan & tetap terbuka saat offline.
   Panggilan ke Google Apps Script TIDAK pernah di-cache oleh SW (data dikelola cache aplikasi). */
const VERSI = 'rkp-v1.0.0';
const SHELL = ['./', './index.html', './css/style.css', './js/config.js', './js/api.js', './js/ui.js', './js/views-public.js', './js/views-user.js', './js/views-user2.js',
  './js/views-admin.js', './js/views-admin2.js', './js/views-admin3.js', './js/app.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSI).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSI).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // GAS & domain lain: langsung ke jaringan
  // Stale-while-revalidate: tampil dari cache seketika, perbarui di latar
  e.respondWith(caches.open(VERSI).then(async c => {
    const hit = await c.match(r, { ignoreSearch: r.mode === 'navigate' });
    const net = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net; return res || (r.mode === 'navigate' ? c.match('./index.html') : Response.error());
  }));
});
