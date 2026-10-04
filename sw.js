/* Service worker: ให้เปิดแอปได้แม้ไม่มีเน็ต และอัปเดตไฟล์เองเมื่อมีเน็ต
   เปลี่ยนเลขเวอร์ชันนี้ทุกครั้งที่อัปโหลด index.html ใหม่ เพื่อบังคับล้างแคชเก่า */
const VERSION = 'perio-v2';
const APP_FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ไฟล์ของแอปเอง: ลองโหลดจากเน็ตก่อน ถ้าไม่ได้ใช้ของที่แคชไว้
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // ไลบรารี Firebase (ระบุเวอร์ชันในลิงก์ จึงแคชไว้ใช้ต่อได้): ใช้ของแคชก่อน
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
  // คำขออื่น (ข้อมูล Firestore, ล็อกอิน Google) ปล่อยผ่านตามปกติ
});
