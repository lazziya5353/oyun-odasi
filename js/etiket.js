// Sohbette @etiketleme: "@" yazınca odadakilerin listesi açılır; etiketlenen kişinin mesajı vurgulu görünür,
// ona ses + bildirim + (telefonda) titreşim gider. "@herkes" herkesi etiketler.
const etiketLow = s => String(s || '').toLocaleLowerCase('tr-TR');
function etiketAdlari(){
  const list = [];
  if (typeof peers !== 'undefined') peers.forEach(p => { if (p.linked && p.helloed) list.push(p.name); });
  return list;
}
// metindeki @etiketler: [{i, len, ad, ben, herkes}]
function etiketBul(text){
  const out = [], adlar = etiketAdlari().concat(typeof myName !== 'undefined' ? [myName] : []).sort((a, b) => b.length - a.length);
  const low = etiketLow(text);
  for (let i = 0; i < text.length; i++){
    if (text[i] !== '@' || (i > 0 && /[\wçğıöşüÇĞİÖŞÜ]/.test(text[i - 1]))) continue;
    const rest = low.slice(i + 1);
    if (rest.startsWith('herkes')){ out.push({ i, len: 7, ad: 'herkes', herkes: true }); i += 6; continue; }
    const ad = adlar.find(a => rest.startsWith(etiketLow(a)) && !/[\wçğıöşü]/i.test(rest.charAt(a.length)));
    if (ad){ out.push({ i, len: ad.length + 1, ad, ben: etiketLow(ad) === etiketLow(myName) }); i += ad.length; }
  }
  return out;
}
const etiketBeni = text => etiketBul(text).some(e => e.ben || e.herkes);
// mesaj gövdesini yaz: bağlantılar + etiketler (her şey düz metin olarak eklenir)
function etiketliYaz(text, into){
  const tags = etiketBul(text);
  if (!tags.length){ linkify(text, into); return; }
  let last = 0;
  tags.forEach(t => {
    if (t.i > last) linkify(text.slice(last, t.i), into);
    const s = document.createElement('span'); s.className = 'etiket' + (t.ben || t.herkes ? ' ben' : '');
    s.textContent = text.slice(t.i, t.i + t.len);
    into.append(s);
    last = t.i + t.len;
  });
  if (last < text.length) linkify(text.slice(last), into);
}
// gelen mesaj beni etiketlediyse haber ver
function etiketGeldi(from, name, text, dm){
  if (!text || !etiketBeni(text)) return;
  toast('📣 ' + name + ' seni etiketledi: “' + clip(text, 70) + '”');
  try { tone([880, 1320, 1760], 0.09, 0.25, 0.14); } catch(e){}
  try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch(e){}
  if (!chatOpen){ const b = $('chatBtn'); b.classList.remove('etiketlendi'); void b.offsetWidth; b.classList.add('etiketlendi'); }
}

// ---------- @ yazınca öneri listesi ----------
const ek = { acik: false, sec: 0, list: [], bas: -1 };
function etiketKutu(){
  let k = document.getElementById('etiketOneri');
  if (!k){ k = document.createElement('div'); k.id = 'etiketOneri'; k.className = 'etiket-oneri'; k.hidden = true; $('composer').append(k); }
  return k;
}
function etiketKapat(){ ek.acik = false; etiketKutu().hidden = true; }
function etiketGuncelle(){
  const inp = $('msgInput'), v = inp.value, pos = inp.selectionStart;
  const m = /(^|[\s(])@([\wçğıöşüÇĞİÖŞÜ ]{0,20})$/.exec(v.slice(0, pos));
  if (!m){ etiketKapat(); return; }
  const q = etiketLow(m[2]).trimStart();
  const adlar = etiketAdlari().map(a => ({ ad: a })).concat([{ ad: 'herkes', herkes: true }]);
  ek.list = adlar.filter(x => etiketLow(x.ad).startsWith(q)).slice(0, 8);
  if (!ek.list.length){ etiketKapat(); return; }
  ek.bas = pos - m[2].length - 1; ek.sec = Math.min(ek.sec, ek.list.length - 1); ek.acik = true;
  const k = etiketKutu(); k.innerHTML = ''; k.hidden = false;
  ek.list.forEach((x, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = i === ek.sec ? 'on' : '';
    b.textContent = x.herkes ? '📣 @herkes' : '@' + x.ad;
    b.onmousedown = e => { e.preventDefault(); etiketSec(i); };
    k.append(b);
  });
}
function etiketSec(i){
  const x = ek.list[i]; if (!x) return;
  const inp = $('msgInput'), pos = inp.selectionStart, v = inp.value;
  const ins = '@' + x.ad + ' ';
  inp.value = v.slice(0, ek.bas) + ins + v.slice(pos);
  const np = ek.bas + ins.length; inp.setSelectionRange(np, np);
  etiketKapat(); inp.focus();
}
$('msgInput').addEventListener('input', etiketGuncelle);
$('msgInput').addEventListener('click', etiketGuncelle);
$('msgInput').addEventListener('blur', () => setTimeout(etiketKapat, 150));
// Enter/Tab ile seç, oklarla gez (Enter gönderme işleminden önce yakalanır)
$('msgInput').addEventListener('keydown', e => {
  if (!ek.acik) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); ek.sec = (ek.sec + (e.key === 'ArrowDown' ? 1 : ek.list.length - 1)) % ek.list.length; etiketGuncelle(); }
  else if (e.key === 'Enter' || e.key === 'Tab'){ e.preventDefault(); e.stopImmediatePropagation(); etiketSec(ek.sec); }
  else if (e.key === 'Escape'){ etiketKapat(); }
}, true);
// @ düğmesi (telefonda @ yazmak zahmetli)
(function(){
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn icon-btn etiket-btn'; b.textContent = '@'; b.title = 'Birini etiketle'; b.setAttribute('aria-label', 'Birini etiketle');
  b.onclick = () => { const inp = $('msgInput'), p = inp.selectionStart ?? inp.value.length, v = inp.value; const pre = p > 0 && !/\s/.test(v[p - 1]) ? ' @' : '@'; inp.value = v.slice(0, p) + pre + v.slice(p); inp.focus(); inp.setSelectionRange(p + pre.length, p + pre.length); etiketGuncelle(); };
  $('imgBtn').after(b);
})();

$('chatBtn').addEventListener('click', () => $('chatBtn').classList.remove('etiketlendi'));
