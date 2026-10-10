// Yönetim paneli: üyelik başvurularını onayla/reddet, üyeleri yönet (ad değiştir, şifre sıfırla, sil).
const $ = id => document.getElementById(id);
const API = '/api/uye/';
let tok = sessionStorage.getItem('oyunodasi-admin') || '';
let users = [], tab = 'bekliyor', armed = null, known = null, push = null;
const baseTitle = document.title;

function toast(m){ const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3500); }
async function api(path, body){
  const r = await fetch(API + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', 'x-admin': tok }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== 'admin-giris'){ logout(); throw new Error('Oturum bitti, tekrar giriş yap.'); }
  if (!r.ok) throw new Error(d.hata || 'Sunucuya ulaşılamadı');
  return d;
}
function logout(){ tok = ''; sessionStorage.removeItem('oyunodasi-admin'); $('panel').hidden = true; $('loginCard').hidden = false; }
const fmt = ts => ts ? new Date(ts).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const initial = n => (n || '?').trim().charAt(0).toLocaleUpperCase('tr-TR');

// yeni başvuru gelince sayfayı yenilemeden listeye düşer; ses + başlıkta sayı
function ding(){
  try { const a = new (window.AudioContext || window.webkitAudioContext)(); [880, 1175].forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.12, a.currentTime + i * .12); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + i * .12 + .25); o.connect(g); g.connect(a.destination); o.start(a.currentTime + i * .12); o.stop(a.currentTime + i * .12 + .3); }); } catch(e){}
}
async function load(quiet){
  try {
    const d = await api('admin-liste'); users = d.uyeler;
    $('pushBtn').textContent = d.adminBildirim ? '🔔 Bildirim açık' : '🔔 Başvuru bildirimi al';
    const pend = users.filter(u => u.durum === 'bekliyor');
    if (known){
      const fresh = pend.filter(u => !known.has(u.id));
      if (fresh.length){ ding(); toast('🆕 Yeni başvuru: ' + fresh.map(u => u.adSoyad).join(', ')); if (tab !== 'bildirim') tab = 'bekliyor'; }
    }
    known = new Set(users.map(u => u.id));
    document.title = (pend.length ? '(' + pend.length + ') ' : '') + baseTitle;
    if (tab === 'bildirim') await loadPush();
    // yönetici bir üyenin adını yazarken liste altından değişmesin
    const typing = document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.closest('.u-acts');
    if (!quiet || !typing) render();
  } catch(e){ if (!quiet) toast(e.message); }
}
async function loadPush(){
  try {
    const r = await fetch('/api/bildirim/admin-durum', { headers: { 'x-admin': tok } });
    push = r.ok ? await r.json() : null;
  } catch(e){ push = null; }
}
function render(){
  const counts = { bekliyor: 0, onayli: 0, red: 0 };
  users.forEach(u => { counts[u.durum] = (counts[u.durum] || 0) + 1; });
  const tabs = $('tabs'); tabs.innerHTML = '';
  [['bekliyor', '⏳ Onay bekleyen'], ['onayli', '✅ Üyeler'], ['red', '✗ Reddedilen'], ['bildirim', '🔔 Bildirimler']].forEach(([k, n]) => {
    const b = document.createElement('button'); b.textContent = n + (k === 'bildirim' ? (push ? ' (' + push.cihazlar.length + ')' : '') : ' (' + (counts[k] || 0) + ')'); b.classList.toggle('on', tab === k);
    b.onclick = async () => { tab = k; if (k === 'bildirim') await loadPush(); render(); }; tabs.append(b);
  });
  $('q').hidden = tab === 'bildirim';
  if (tab === 'bildirim'){ renderPush(); return; }
  const q = $('q').value.trim().toLocaleLowerCase('tr-TR');
  const list = $('list'); list.innerHTML = '';
  const shown = users.filter(u => u.durum === tab && (!q || (u.adSoyad + ' ' + u.kadi + ' ' + u.name).toLocaleLowerCase('tr-TR').includes(q)));
  if (!shown.length){ const p = document.createElement('p'); p.className = 'note'; p.textContent = tab === 'bekliyor' ? 'Onay bekleyen başvuru yok.' : 'Kimse yok.'; list.append(p); return; }
  shown.forEach(u => {
    const row = document.createElement('div'); row.className = 'u ' + u.durum;
    const av = document.createElement('div'); av.className = 'u-av';
    if (u.foto){ av.style.backgroundImage = 'url("' + u.foto + '")'; } else av.textContent = initial(u.name);
    const info = document.createElement('div'); info.className = 'u-info';
    const b = document.createElement('b'); b.textContent = u.adSoyad;
    const pill = document.createElement('span'); pill.className = 'pill ' + (u.durum === 'onayli' ? 'ok' : u.durum === 'bekliyor' ? 'wait' : 'no');
    pill.textContent = u.durum === 'onayli' ? 'üye' : u.durum === 'bekliyor' ? 'onay bekliyor' : 'reddedildi'; b.append(pill);
    const s1 = document.createElement('span'); s1.textContent = '@' + u.kadi + ' · görünen ad: ' + u.name;
    const s2 = document.createElement('span'); s2.textContent = 'Başvuru: ' + fmt(u.created) + (u.approvedAt ? ' · Onay: ' + fmt(u.approvedAt) : '') + (u.bildirim ? ' · 🔔 bildirim açık' : '');
    info.append(b, s1, s2);
    const acts = document.createElement('div'); acts.className = 'u-acts';
    const btn = (t, cls, fn) => { const x = document.createElement('button'); x.className = 'btn small ' + (cls || ''); x.textContent = t; x.onclick = fn; acts.append(x); return x; };
    if (u.durum !== 'onayli') btn('✓ Onayla', 'primary', () => act('admin-onay', { id: u.id, onay: true }, u.adSoyad + ' onaylandı' + (u.bildirim ? ', bildirim gönderildi' : '')));
    if (u.durum === 'bekliyor') btn('✗ Reddet', '', () => act('admin-onay', { id: u.id, onay: false }, 'Başvuru reddedildi'));
    if (u.durum === 'onayli'){
      btn('✏️ Ad', '', () => {
        const inp = document.createElement('input'); inp.type = 'text'; inp.value = u.name; inp.maxLength = 20;
        inp.style.cssText = 'background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 8px;width:140px';
        const ok = document.createElement('button'); ok.className = 'btn small primary'; ok.textContent = 'Kaydet';
        ok.onclick = () => act('admin-ad', { id: u.id, name: inp.value }, 'Ad değişti');
        acts.innerHTML = ''; acts.append(inp, ok); inp.focus();
      });
      btn('🔑 Şifre sıfırla', '', async () => {
        try { const d = await api('admin-sifre', { id: u.id }); s2.innerHTML = ''; s2.append('Yeni geçici şifre: '); const t = document.createElement('span'); t.className = 'tmp'; t.textContent = d.yeni; s2.append(t, ' — bunu ' + u.name + '’a ilet, girince profilinden değiştirsin.'); }
        catch(e){ toast(e.message); }
      });
    }
    const del = btn(armed === u.id ? 'Emin misin? Sil' : '🗑 Sil', 'kick-btn', () => {
      if (armed !== u.id){ armed = u.id; render(); setTimeout(() => { if (armed === u.id){ armed = null; render(); } }, 4000); return; }
      armed = null; act('admin-sil', { id: u.id }, 'Silindi');
    });
    if (armed === u.id) del.style.background = 'var(--danger)';
    row.append(av, info, acts);
    list.append(row);
  });
}
// bildirim durumu: hangi cihazlar kayıtlı, son gönderimler başarılı mı
function renderPush(){
  const list = $('list'); list.innerHTML = '';
  if (!push){ const p = document.createElement('p'); p.className = 'note'; p.textContent = 'Bildirim bilgisi alınamadı.'; list.append(p); return; }
  const head = document.createElement('div'); head.className = 'u-acts'; head.style.justifyContent = 'flex-start';
  const t = document.createElement('button'); t.className = 'btn small primary'; t.textContent = '🧪 Hepsine deneme bildirimi gönder';
  t.onclick = async () => {
    t.disabled = true;
    try { const r = await fetch('/api/bildirim/admin-test', { method: 'POST', headers: { 'x-admin': tok } }); const d = await r.json(); toast('Deneme: ' + d.sent + '/' + d.total + ' cihaza ulaştı' + (d.gone ? ' · ' + d.gone + ' eski kayıt silindi' : '')); await loadPush(); render(); }
    catch(e){ toast('Gönderilemedi'); }
    t.disabled = false;
  };
  const n = document.createElement('span'); n.className = 'note'; n.textContent = push.cihazlar.length + ' cihazda bildirim açık. Oda açanın kendi cihazına bildirim gitmez.';
  head.append(t, n); list.append(head);
  push.cihazlar.slice().sort((a, b) => (b.last ? b.last.at : 0) - (a.last ? a.last.at : 0)).forEach(c => {
    const row = document.createElement('div'); row.className = 'u';
    const av = document.createElement('div'); av.className = 'u-av'; av.textContent = /Apple/.test(c.platform) ? '🍎' : /Android|Chrome/.test(c.platform) ? '🤖' : '💻';
    const info = document.createElement('div'); info.className = 'u-info';
    const b = document.createElement('b'); b.textContent = c.name || '—';
    const s1 = document.createElement('span'); s1.textContent = c.platform + ' · kayıt: ' + fmt(c.ts);
    const s2 = document.createElement('span');
    const ok = c.last && c.last.st >= 200 && c.last.st < 300;
    s2.textContent = !c.last ? 'Henüz bildirim gönderilmedi' : (ok ? '✅ Son bildirim ulaştı · ' : '❌ Son bildirim ulaşmadı (kod ' + (c.last.st || c.last.err || '?') + ') · ') + fmt(c.last.at);
    if (c.last && !ok) s2.style.color = 'var(--danger)';
    info.append(b, s1, s2);
    row.append(av, info);
    list.append(row);
  });
  if (push.gecmis.length){
    const h = document.createElement('p'); h.className = 'note'; h.style.marginTop = '8px'; h.textContent = 'Son “oda açıldı” bildirimleri:'; list.append(h);
    push.gecmis.slice(0, 10).forEach(g => {
      const p = document.createElement('p'); p.className = 'note'; p.style.margin = '0';
      p.textContent = fmt(g.at) + ' · ' + g.by + ' “' + g.code + '” açtı → ' + g.sent + '/' + g.total + ' cihaza ulaştı' + (g.fails && g.fails.length ? ' · ulaşmayan: ' + g.fails.map(f => f.name + ' (' + (f.st || f.err || '?') + ')').join(', ') : '');
      list.append(p);
    });
  }
}
async function act(path, body, msg){
  try { await api(path, body); toast(msg); await load(); } catch(e){ toast(e.message); }
}
$('admForm').onsubmit = async e => {
  e.preventDefault(); $('admErr').textContent = '';
  try {
    const d = await api('admin-giris', { sifre: $('admPw').value });
    tok = d.token; sessionStorage.setItem('oyunodasi-admin', tok); $('admPw').value = '';
    start();
  } catch(err){ $('admErr').textContent = err.message; }
};
$('outBtn').onclick = logout;
$('q').oninput = render;
$('pushBtn').onclick = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Bu tarayıcı bildirimleri desteklemiyor (iPhone’da önce siteyi Ana Ekrana ekle).');
    if (await Notification.requestPermission() !== 'granted') throw new Error('Bildirim izni verilmedi.');
    const reg = await navigator.serviceWorker.register('sw.js');
    const { key } = await (await fetch('/api/bildirim/anahtar')).json();
    const raw = atob(key.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((key.length + 3) % 4));
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, c => c.charCodeAt(0)) });
    await api('admin-bildirim', { push: sub.toJSON() });
    toast('🔔 Yeni başvuru gelince bu cihaza bildirim gelecek'); load();
  } catch(e){ toast(e.message); }
};
function start(){
  $('loginCard').hidden = true; $('panel').hidden = false; load();
  clearInterval(start.t);
  // sayfa açıkken 5 saniyede bir yeni başvuruya bak (yenilemeye gerek yok)
  start.t = setInterval(() => { if (tok && !document.hidden) load(true); }, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && tok) load(true); });
}
if (tok) start();
