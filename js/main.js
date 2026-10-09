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

try {
  if (sessionStorage.getItem('oyunodasi-kicked')){
    sessionStorage.removeItem('oyunodasi-kicked');
    $('lobbyErr').textContent = 'Oda sahibi seni odadan çıkardı.';
  }
} catch(e){}
