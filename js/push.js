// Ana ekrana ekleme (uygulama gibi yükleme) ve "oda açıldı" bildirimleri.
// Bildirimler Netlify'daki /api/bildirim fonksiyonu üzerinden gider; site kapalıyken de gelir.
// iPhone/iPad: bildirim için site önce Ana Ekrana eklenmeli ve oradan açılmalı (Apple kuralı, iOS 16.4+).
const PUSH_API = (window.OYUNODASI_PUSH_API || '') + '/api/bildirim/';
const PUSH_KEY = 'oyunodasi-bildirim';
let swReg = null, installEvt = null;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;

function b64uToBytes(s){
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, c => c.charCodeAt(0));
}
async function pushApi(path, body){
  const r = await fetch(PUSH_API + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  if (!r.ok) throw new Error('api ' + r.status);
  return r.json();
}

// durum: 'on' | 'off' | 'denied' | 'ios-install' | 'unsupported'
function notifState(){
  if (isIOS && !isStandalone() && !('PushManager' in window)) return 'ios-install';
  if (!pushSupported() || !swReg) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.permission === 'granted' && store.get(PUSH_KEY) === '1' ? 'on' : 'off';
}

async function enableNotifs(){
  try {
    if (!swReg) swReg = await navigator.serviceWorker.register('sw.js');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted'){ renderNotifUI(); toast(perm === 'denied' ? 'Bildirim izni verilmedi.' : 'Bildirim izni bekleniyor.'); return; }
    await subscribePush();
    store.set(PUSH_KEY, '1');
    toast('🔔 Bildirimler açık: arkadaşların oda açınca haber vereceğim');
  } catch(e){
    toast('Bildirimler açılamadı. Biraz sonra tekrar dene.');
  }
  renderNotifUI();
}
async function disableNotifs(){
  store.set(PUSH_KEY, '0');
  try {
    const sub = swReg && await swReg.pushManager.getSubscription();
    if (sub){ pushApi('iptal', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
  } catch(e){}
  toast('🔕 Bildirimler kapatıldı');
  renderNotifUI();
}
// Aboneliği kur ya da tazele (sunucu anahtarı değiştiyse yeniden abone ol)
async function subscribePush(){
  const { key } = await pushApi('anahtar');
  let sub = await swReg.pushManager.getSubscription();
  if (sub && store.get('oyunodasi-bildirim-anahtar') !== key){ try { await sub.unsubscribe(); } catch(e){} sub = null; }
  if (!sub) sub = await swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(key) });
  store.set('oyunodasi-bildirim-anahtar', key);
  await pushApi('abone', { sub: sub.toJSON(), name: ($('nameInput').value || '').trim() || store.get('oyunodasi-name') || '' });
  return sub;
}

// Oda kurulunca diğerlerine haber ver (kendine gelmez)
async function notifyRoomOpened(){
  if (!window.isSecureContext || location.protocol === 'file:') return;
  try {
    let endpoint = '';
    try { const sub = swReg && await swReg.pushManager.getSubscription(); endpoint = sub ? sub.endpoint : ''; } catch(e){}
    const r = await pushApi('oda', { code: roomCode, name: myName, endpoint });
    // oda açana kısa bilgi: kaç kişiye gitti
    if (r.sinir === 'kod') toast('🔔 Bu oda için 1 dakika içinde zaten bildirim gönderildi');
    else if (r.sinir) toast('🔔 Son bir saatte çok fazla oda açıldı; bildirim gönderilmedi');
    else if (r.total === 0) toast('🔔 Bildirim gidecek kimse yok: arkadaşların önce “Bildirimleri aç” demeli (senin cihazına kendi odanın bildirimi gelmez)');
    else toast('🔔 ' + r.sent + ' cihaza “oda açıldı” bildirimi gitti' + (r.failed ? ' · ' + r.failed + ' cihaza ulaşılamadı' : ''));
  } catch(e){ /* bildirim gitmezse oda yine de açık */ }
}

function renderNotifUI(){
  const st = notifState();
  const card = $('notifCard'), btn = $('notifBtn'), note = $('notifNote'), b2 = $('notifBtn2');
  card.hidden = st === 'unsupported' && !installEvt;
  card.dataset.state = st;
  btn.hidden = st === 'unsupported' || st === 'ios-install';
  const tb = $('notifTest'); if (tb) tb.hidden = st !== 'on';
  btn.textContent = st === 'on' ? 'Kapat' : '🔔 Bildirimleri aç';
  btn.classList.toggle('primary', st === 'off');
  $('notifTitle').textContent = st === 'on' ? '🔔 Bildirimler açık' : '🔔 Oda açılınca haber al';
  note.textContent = {
    on: 'Arkadaşların oda açınca bu cihaza bildirim gelir, site kapalı olsa bile.',
    off: 'Biri oda açınca telefonuna ya da bilgisayarına bildirim gelsin.',
    denied: 'Bildirimler bu sitede engellenmiş. Adres çubuğundaki kilit/ayar simgesinden “Bildirimler: İzin ver” yapıp sayfayı yenile.',
    'ios-install': 'iPhone’da bildirim için: alttaki Paylaş ⬆ düğmesine dokun → “Ana Ekrana Ekle”. Sonra ana ekrandaki Oyun Odası simgesinden açıp buradan bildirimleri aç.',
    unsupported: 'Uygulama gibi yükleyip ana ekrandan/masaüstünden tek dokunuşla açabilirsin.'
  }[st];
  $('installBtn').hidden = !installEvt;
  if (b2){
    b2.hidden = st === 'unsupported' || st === 'ios-install';
    b2.innerHTML = (st === 'on' ? '🔔' : '🔕') + ' <span class="lbl">' + (st === 'on' ? 'Bildirim açık' : 'Bildirim') + '</span>';
    b2.title = st === 'on' ? 'Oda açılınca bildirim geliyor. Kapatmak için tıkla.' : 'Biri oda açınca bildirim al';
    b2.classList.toggle('on', st === 'on');
  }
}
const toggleNotifs = () => (notifState() === 'on' ? disableNotifs() : notifState() === 'denied' ? toast('Bildirimler engellenmiş: adres çubuğundaki kilit simgesinden izin ver.') : enableNotifs());

(async function initPush(){
  $('notifBtn').onclick = toggleNotifs;
  $('notifTest').onclick = async () => {
    try {
      const sub = swReg && await swReg.pushManager.getSubscription();
      if (!sub){ await subscribePush(); }
      const s2 = await swReg.pushManager.getSubscription();
      const r = await pushApi('test', { endpoint: s2 && s2.endpoint });
      toast(r.sent ? '🧪 Deneme bildirimi gönderildi; birkaç saniye içinde gelmeli' : '⚠ Bu cihaz kayıtlı görünmüyor, bildirimleri kapatıp yeniden aç');
    } catch(e){ toast('Deneme bildirimi gönderilemedi: ' + e.message); }
  };
  $('notifBtn2').onclick = toggleNotifs;
  $('installBtn').onclick = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch(e){}
    installEvt = null; renderNotifUI();
  };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; renderNotifUI(); });
  window.addEventListener('appinstalled', () => { installEvt = null; renderNotifUI(); toast('📲 Oyun Odası yüklendi'); });
  if ('serviceWorker' in navigator && window.isSecureContext){
    try { swReg = await navigator.serviceWorker.register('sw.js'); } catch(e){}
    navigator.serviceWorker.addEventListener('message', ev => {
      const d = ev.data || {};
      if (d.t !== 'bildirim-tik' || !d.url) return;
      const code = new URL(d.url, location.href).searchParams.get('oda');
      if (!joined) location.href = d.url;
      else if (code && code !== roomCode) toast('“' + code + '” odası açık. Katılmak için önce bu odadan çık.');
    });
  }
  renderNotifUI();
  // izin daha önce verildiyse aboneliği sessizce tazele (sunucu listesi ve adın güncel kalsın)
  if (notifState() === 'on') subscribePush().catch(() => {});
})();
