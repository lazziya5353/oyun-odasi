// Ehliyet Sınav Kampı - internetsiz çalışma
const CACHE = "ehliyet-43330334";
const FILES = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("ehliyet-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Sayfa: önce internetten güncelini dene, yoksa kayıtlı olanı aç
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put("/index.html", copy)); return r; })
      .catch(() => caches.match("/index.html")));
    return;
  }
  // Yazı tipleri ve ikonlar: kayıtlıysa oradan, değilse indirip kaydet
  if (url.origin === location.origin || url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })));
  }
});
