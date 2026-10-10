// Üyelik: üye ol (ad soyad, kullanıcı adı, şifre) → yönetici onaylar → giriş yap.
// Giriş yapan her seferinde adını yazmaz, sadece oda koduyla girer; profilinden adını ve fotoğrafını değiştirebilir.
// Üye olmayan yine eskisi gibi adını yazarak girer.
const UYE_API = (window.OYUNODASI_PUSH_API || '') + '/api/uye/';
const UYE_KEY = 'oyunodasi-uye', BEKLEYEN_KEY = 'oyunodasi-bekleyen';
let account = (() => { try { const a = JSON.parse(localStorage.getItem(UYE_KEY) || 'null'); return a && a.token && a.uye ? a : null; } catch(e){ return null; } })();
let myFoto = account && account.uye.foto || null;
const uyeOK = () => location.protocol === 'https:' || location.protocol === 'http:';

async function uyeApi(path, body, opts){
  const h = { 'content-type': 'application/json' };
  if (account) h.authorization = 'Bearer ' + account.token;
  const r = await fetch(UYE_API + path, Object.assign({ method: body === undefined ? 'GET' : 'POST', headers: h, body: body === undefined ? undefined : JSON.stringify(body) }, opts || {}));
  const d = await r.json().catch(() => ({}));
  if (!r.ok){ const e = new Error(d.hata || 'Sunucuya ulaşılamadı'); e.status = r.status; e.durum = d.durum; throw e; }
  return d;
}
function saveAccount(){
  try { if (account) localStorage.setItem(UYE_KEY, JSON.stringify(account)); else localStorage.removeItem(UYE_KEY); } catch(e){}
  myFoto = account && account.uye.foto || null;
  renderAccountBox();
}
// oda içindeyken ad/fotoğraf değişirse herkese duyur
function announceProfile(){
  if (!joined || !account) return;
  myName = account.uye.name;
  broadcast({ t: 'profil', name: myName, foto: myFoto });
  renderSelf(); renderChannels();
}
const safeFoto = f => typeof f === 'string' && /^\/api\/uye\/foto\?id=[a-z0-9]{8,24}&v=\d{1,6}$/.test(f) ? f : null;
function fotoOf(id){
  if (peer && id === peer.id) return myFoto;
  const p = typeof peers !== 'undefined' && peers.get(id);
  return p && p.foto || null;
}
// avatar kutusuna fotoğraf ya da baş harf koy
function paintAvatar(el, name, foto){
  if (!el) return;
  if (foto){ el.style.backgroundImage = 'url("' + foto + '")'; el.classList.add('has-foto'); el.textContent = ''; }
  else { el.style.backgroundImage = ''; el.classList.remove('has-foto'); el.textContent = initial(name); }
}

// ---------- giriş ekranındaki hesap kutusu ----------
function renderAccountBox(){
  const box = $('acctBox'); if (!box) return;
  const on = !!account;
  $('acctIn').hidden = !on; $('acctOut').hidden = on;
  $('nameLabel').hidden = on;
  if (on){
    paintAvatar($('acctAv'), account.uye.name, myFoto);
    $('acctName').textContent = account.uye.name;
    $('acctUser').textContent = '@' + account.uye.kadi;
  }
  $('acctOut').hidden = on || !uyeOK();
}
async function refreshAccount(){
  if (!account || !uyeOK()) return;
  try { const d = await uyeApi('ben'); account.uye = d.uye; saveAccount(); }
  catch(e){ if (e.status === 401){ account = null; saveAccount(); toast('Oturumun sona erdi, yeniden giriş yap.'); } }
}

// ---------- giriş / üye ol penceresi ----------
function openUyeDlg(tab, msg){
  $('uyeDlg').showModal();
  uyeTab(tab || 'giris');
  $('uyeMsg').textContent = msg || ''; $('uyeMsg').className = 'uye-msg' + (msg ? ' ok' : '');
}
function uyeTab(t){
  document.querySelectorAll('#uyeDlg [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $('girisForm').hidden = t !== 'giris'; $('kayitForm').hidden = t !== 'kayit';
  $('uyeMsg').textContent = '';
  setTimeout(() => { const f = (t === 'giris' ? $('girisForm') : $('kayitForm')).querySelector('input'); if (f) f.focus(); }, 30);
}
async function currentPushSub(ask){
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    if (ask && Notification.permission !== 'granted'){
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return null;
    }
    if (Notification.permission !== 'granted') return null;
    if (typeof subscribePush === 'function'){ const s = await subscribePush(); store.set('oyunodasi-bildirim', '1'); if (typeof renderNotifUI === 'function') renderNotifUI(); return s.toJSON(); }
  } catch(e){}
  return null;
}
function uyeMsg(t, ok){ $('uyeMsg').textContent = t; $('uyeMsg').className = 'uye-msg ' + (ok ? 'ok' : 'err'); }
async function doLogin(e){
  e.preventDefault();
  const kadi = $('gKadi').value.trim(), sifre = $('gSifre').value;
  if (!kadi || !sifre){ uyeMsg('Kullanıcı adını ve şifreni yaz.'); return; }
  const btn = e.submitter || $('girisForm').querySelector('button[type=submit]'); btn.disabled = true;
  try {
    const d = await uyeApi('giris', { kadi, sifre, push: await currentPushSub(false) });
    account = { token: d.token, uye: d.uye }; saveAccount();
    try { localStorage.removeItem(BEKLEYEN_KEY); } catch(e2){}
    store.set('oyunodasi-name', d.uye.name);
    $('uyeDlg').close(); $('gSifre').value = '';
    toast('👋 Hoş geldin ' + d.uye.name + '! Artık sadece oda koduyla girebilirsin.');
    $('codeInput').focus();
  } catch(err){ uyeMsg(err.message); }
  btn.disabled = false;
}
async function doSignup(e){
  e.preventDefault();
  const adSoyad = $('kAd').value.trim(), kadi = $('kKadi').value.trim(), sifre = $('kSifre').value;
  if (sifre !== $('kSifre2').value){ uyeMsg('Şifreler aynı değil.'); return; }
  const btn = e.submitter || $('kayitForm').querySelector('button[type=submit]'); btn.disabled = true;
  try {
    const push = $('kBildir').checked ? await currentPushSub(true) : null;
    await uyeApi('kayit', { adSoyad, kadi, sifre, push });
    store.set(BEKLEYEN_KEY, kadi);
    $('kayitForm').reset();
    uyeTab('giris'); $('gKadi').value = kadi;
    uyeMsg('✅ Başvurun alındı! Yönetici onaylayınca ' + (push ? 'sana bildirim gelecek' : 'giriş yapabilirsin') + '. O zamana kadar adını yazarak misafir olarak girebilirsin.', true);
    renderUyePending();
  } catch(err){ uyeMsg(err.message); }
  btn.disabled = false;
}
// onay bekleyen başvuru: giriş ekranında küçük bir not; onaylanınca haber ver
async function renderUyePending(){
  const k = store.get(BEKLEYEN_KEY), el = $('acctPending');
  if (!k || account || !uyeOK()){ el.hidden = true; return; }
  el.hidden = false; el.textContent = '⏳ @' + k + ' üyeliğin onay bekliyor.';
  try {
    const d = await uyeApi('durum', { kadi: k });
    if (d.durum === 'onayli'){
      el.innerHTML = ''; const b = document.createElement('button'); b.className = 'linkbtn'; b.textContent = '✅ Üyeliğin onaylandı! Giriş yap';
      b.onclick = () => { openUyeDlg('giris'); $('gKadi').value = k; $('gSifre').focus(); };
      el.append(b);
    } else if (d.durum === 'red' || d.durum === 'yok'){
      el.textContent = d.durum === 'red' ? 'Üyelik başvurun onaylanmadı.' : ''; el.hidden = d.durum === 'yok';
      try { localStorage.removeItem(BEKLEYEN_KEY); } catch(e){}
    }
  } catch(e){}
}

// ---------- profil ----------
function openProfil(){
  if (!account) return;
  paintAvatar($('pAv'), account.uye.name, myFoto);
  $('pName').value = account.uye.name;
  $('pInfo').textContent = account.uye.adSoyad + ' · @' + account.uye.kadi;
  $('pFotoSil').hidden = !myFoto;
  $('pMsg').textContent = '';
  $('profilDlg').showModal();
}
function pMsg(t, ok){ $('pMsg').textContent = t; $('pMsg').className = 'uye-msg ' + (ok ? 'ok' : 'err'); }
// fotoğrafı kare kırp, 256 px JPEG'e küçült
function squareJpeg(file){
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas');
      c.width = c.height = 256;
      c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 256, 256);
      URL.revokeObjectURL(u);
      c.toBlob(b => b ? res(b) : rej(new Error('fotoğraf işlenemedi')), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Bu dosya açılamadı. JPG ya da PNG seç.')); };
    img.src = u;
  });
}
(function initAccount(){
  if (!$('acctBox')) return;
  $('loginBtn').onclick = () => openUyeDlg('giris');
  $('signupBtn').onclick = () => openUyeDlg('kayit');
  document.querySelectorAll('#uyeDlg [data-tab]').forEach(b => { b.onclick = () => uyeTab(b.dataset.tab); });
  $('girisForm').onsubmit = doLogin;
  $('kayitForm').onsubmit = doSignup;
  $('profilBtn').onclick = openProfil;
  $('profilBtn2').onclick = () => account ? openProfil() : openUyeDlg('giris');
  $('logoutBtn').onclick = async () => {
    try { await uyeApi('cikis', {}); } catch(e){}
    account = null; saveAccount(); toast('Çıkış yaptın.');
  };
  $('pNameSave').onclick = async () => {
    try { const d = await uyeApi('profil', { name: $('pName').value.trim() }); account.uye = d.uye; saveAccount(); store.set('oyunodasi-name', d.uye.name); announceProfile(); pMsg('✓ Adın güncellendi', true); paintAvatar($('pAv'), account.uye.name, myFoto); }
    catch(e){ pMsg(e.message); }
  };
  $('pFotoBtn').onclick = () => $('pFoto').click();
  $('pFoto').onchange = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    pMsg('Yükleniyor…', true);
    try {
      const blob = await squareJpeg(f);
      const r = await fetch(UYE_API + 'foto-yukle', { method: 'POST', headers: { authorization: 'Bearer ' + account.token, 'content-type': 'image/jpeg' }, body: blob });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.hata || 'yüklenemedi');
      account.uye = d.uye; saveAccount(); announceProfile();
      paintAvatar($('pAv'), account.uye.name, myFoto); $('pFotoSil').hidden = false;
      pMsg('✓ Profil fotoğrafın güncellendi', true);
    } catch(err){ pMsg(err.message); }
  };
  $('pFotoSil').onclick = async () => {
    try { const d = await uyeApi('profil', { fotoSil: true }); account.uye = d.uye; saveAccount(); announceProfile(); paintAvatar($('pAv'), account.uye.name, null); $('pFotoSil').hidden = true; pMsg('Fotoğraf kaldırıldı', true); }
    catch(e){ pMsg(e.message); }
  };
  $('pSifreSave').onclick = async () => {
    try { await uyeApi('sifre', { eski: $('pEski').value, yeni: $('pYeni').value }); $('pEski').value = $('pYeni').value = ''; pMsg('✓ Şifren değişti', true); }
    catch(e){ pMsg(e.message); }
  };
  renderAccountBox();
  refreshAccount();
  renderUyePending();
  if (new URLSearchParams(location.search).get('uye') === 'onay' && !account){ openUyeDlg('giris', '✅ Üyeliğin onaylandı! Kullanıcı adın ve şifrenle giriş yap.'); const k = store.get(BEKLEYEN_KEY); if (k) $('gKadi').value = k; }
})();
