// Oyun Odası servis çalışanı: sadece bildirimler için. Sayfaları önbelleğe ALMAZ,
// böylece her güncelleme herkese hemen gelir.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch(err){ d = { title: 'Oyun Odası', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Oyun Odası', {
    body: d.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/badge-96.png',
    tag: d.tag || 'oyunodasi',
    renotify: true,
    vibrate: [120, 60, 120],
    data: { url: d.url || '/' }
  }));
});

// Bildirime dokununca: açık bir Oyun Odası penceresi varsa onu öne getir ve odaya yönlendir, yoksa yeni aç
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/', self.registration.scope).href;
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list){
      if (new URL(c.url).origin !== self.location.origin) continue;
      try {
        await c.focus();
        // odadaysa mevcut konuşmayı bozma: sayfaya haber ver, kendisi sorsun
        c.postMessage({ t: 'bildirim-tik', url });
        return;
      } catch(err){}
    }
    await self.clients.openWindow(url);
  })());
});
