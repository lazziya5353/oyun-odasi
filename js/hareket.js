// Kullanıcı hareketleri → yönetim paneli ("📋 Hareketler"). Olaylar toplanır ve toplu gönderilir
// (giriş/çıkış hemen, diğerleri en geç 45 sn içinde) ki sunucuya gereksiz istek gitmesin.
const hk = { kuyruk: [], zaman: null };
function cihazTuru(){
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet';
  if (/Android|iPhone|iPod|Mobile/i.test(ua)) return 'mobil';
  return 'pc';
}
function hareket(tur, metin, hemen){
  try {
    hk.kuyruk.push({ ts: Date.now(), tur, metin: String(metin || '').slice(0, 220), oda: typeof roomCode !== 'undefined' ? roomCode : '' });
    if (hk.kuyruk.length > 30) hk.kuyruk.splice(0, hk.kuyruk.length - 30);
    if (hemen) hareketGonder();
    else if (!hk.zaman) hk.zaman = setTimeout(hareketGonder, 45000);
  } catch(e){}
}
function hareketVeri(){
  return JSON.stringify({ ad: typeof myName !== 'undefined' ? myName : '', cihaz: cihazTuru(), uye: !!(typeof account !== 'undefined' && account), olaylar: hk.kuyruk.splice(0) });
}
function hareketGonder(beacon){
  clearTimeout(hk.zaman); hk.zaman = null;
  if (!hk.kuyruk.length || !window.isSecureContext) return;
  const body = hareketVeri();
  try {
    if (beacon && navigator.sendBeacon){ navigator.sendBeacon('/api/hareket/ekle', new Blob([body], { type: 'text/plain' })); return; }
    fetch('/api/hareket/ekle', { method: 'POST', headers: { 'content-type': 'text/plain' }, body, keepalive: true }).catch(() => {});
  } catch(e){}
}
// sayfa kapanırken / arka plana geçerken bekleyenleri gönder
window.addEventListener('pagehide', () => hareketGonder(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) hareketGonder(true); });
