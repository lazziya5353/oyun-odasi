// Giriş ekranı: ad, oda kodu, oda oluştur / katıl.
$('nameInput').value = store.get('oyunodasi-name') || '';
const urlCode = new URLSearchParams(location.search).get('oda');
if (urlCode) $('codeInput').value = cleanCode(urlCode);
$('codeInput').addEventListener('input', e => {
  const c = cleanCode(e.target.value);
  if (e.target.value !== c) e.target.value = c;
});

function readName(){
  const n = $('nameInput').value.trim();
  if (!n){ lobbyError('Önce adını yaz.'); $('nameInput').focus(); return null; }
  store.set('oyunodasi-name', n);
  return clip(n, 20);
}

$('createBtn').onclick = async () => {
  ensureCtx();
  const n = readName(); if (!n) return;
  const c = cleanCode($('codeInput').value);
  if (c && c.length < 3){ lobbyError('Kendi kodunu yazacaksan en az 3 karakter olmalı.'); return; }
  customCode = !!c;
  myName = n; await start(c || genCode(), true);
};
$('joinBtn').onclick = async () => {
  ensureCtx();
  const n = readName(); if (!n) return;
  const c = cleanCode($('codeInput').value);
  if (c.length < 3){ lobbyError('Katılmak için arkadaşının verdiği oda kodunu yaz.'); $('codeInput').focus(); return; }
  myName = n; await start(c, false);
};
$('codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('joinBtn').click(); });
$('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') (urlCode ? $('joinBtn') : $('createBtn')).click(); });

// davet bağlantısıyla gelene katıl düğmesini öne çıkar
if (urlCode){ $('joinBtn').classList.add('primary'); $('createBtn').classList.remove('primary'); }

// ---------- son odaya kodsuz geri dönüş ----------
// Girilen son oda bu tarayıcıda hatırlanır (7 gün). "Odaya dön" önce odaya katılmayı dener;
// oda kapanmışsa aynı kodla yeniden açar. "Oda oluştur" ise her zaman yeni bir kodla yeni oda kurar.
const LAST_KEY = 'oyunodasi-last';
function rememberRoom(){ store.set(LAST_KEY, JSON.stringify({ code: roomCode, ts: Date.now() })); }
function forgetRoom(){ try { localStorage.removeItem(LAST_KEY); } catch(e){} }
function lastRoom(){
  try {
    const r = JSON.parse(store.get(LAST_KEY) || 'null');
    if (r && typeof r.code === 'string' && r.code.length >= 3 && cleanCode(r.code) === r.code && Date.now() - r.ts < 7 * 864e5) return r;
  } catch(e){}
  return null;
}
function agoText(ts){
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'az önce';
  if (m < 60) return m + ' dk önce';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' saat önce';
  return Math.round(h / 24) + ' gün önce';
}
(function showRejoin(){
  const r = lastRoom();
  if (!r || urlCode) return;
  $('rejoin').hidden = false;
  $('rejoinCode').textContent = r.code;
  $('rejoinWhen').textContent = agoText(r.ts);
  $('createBtn').classList.remove('primary');
})();
$('rejoinBtn').onclick = async () => {
  ensureCtx();
  const n = readName(); if (!n) return;
  const r = lastRoom(); if (!r) return;
  myName = n; rejoining = true;
  $('rejoinBtn').disabled = true;
  await start(r.code, false);
  if (!joined) $('rejoinBtn').disabled = false;
};

try {
  if (sessionStorage.getItem('oyunodasi-kicked')){
    sessionStorage.removeItem('oyunodasi-kicked');
    $('lobbyErr').textContent = 'Oda sahibi seni odadan çıkardı.';
  }
} catch(e){}
