// Kişisel stil: kartının rengi (fosforlu renkler, özel renk) + hareketli renk (gökkuşağı, cyberpunk, LED, nabız)
// + isim efekti (gökkuşağı, neon, ateş, altın, glitch, buz). Herkes kendi stilini seçer, odadaki herkes onu öyle görür.
const STIL_KEY = 'oyunodasi-stil';
const STIL_RENK = [
  ['#39ff14', 'Fosforlu yeşil'], ['#ccff00', 'Limon'], ['#ffff00', 'Fosforlu sarı'], ['#ff9900', 'Fosforlu turuncu'], ['#ff073a', 'Neon kırmızı'],
  ['#ff6ec7', 'Neon pembe'], ['#ff00ff', 'Fuşya'], ['#bc13fe', 'Neon mor'], ['#1f51ff', 'Neon mavi'], ['#00ffff', 'Camgöbeği'], ['#0aff99', 'Nane'], ['#ffffff', 'Beyaz']
];
const STIL_ANIM = [['', 'Yok'], ['gokkusagi', '🌈 Gökkuşağı'], ['cyber', '🌆 Cyberpunk'], ['led', '💡 LED'], ['nabiz', '💓 Nabız']];
const STIL_ISIM = [['', 'Yok'], ['gokkusagi', '🌈 Gökkuşağı'], ['neon', '✨ Neon'], ['ates', '🔥 Ateş'], ['altin', '👑 Altın'], ['glitch', '📺 Glitch'], ['buz', '🧊 Buz']];
const cleanStil = s => {
  if (!s || typeof s !== 'object') return null;
  const o = {
    renk: typeof s.renk === 'string' && /^#[0-9a-f]{6}$/i.test(s.renk) ? s.renk.toLowerCase() : '',
    anim: STIL_ANIM.some(a => a[0] === s.anim) ? s.anim : '',
    isim: STIL_ISIM.some(a => a[0] === s.isim) ? s.isim : ''
  };
  return o.renk || o.anim || o.isim ? o : null;
};
let myStil = (() => { try { return cleanStil(JSON.parse(localStorage.getItem(STIL_KEY))); } catch(e){ return null; } })();
function stilOf(id){
  if (typeof peer !== 'undefined' && peer && id === peer.id) return myStil;
  const p = typeof peers !== 'undefined' && peers.get(id);
  return p ? p.stil || null : null;
}
// kartın / ismin üstüne stil sınıflarını uygula
function applyStil(card, st){
  if (!card) return;
  if (st && st.anim){ card.dataset.stil = st.anim; card.style.setProperty('--stil-r', st.renk || '#ff073a'); } else delete card.dataset.stil;
  const n = card.querySelector('.pname');
  if (n){ if (st && st.isim){ n.dataset.isim = st.isim; n.dataset.text = n.textContent; } else { delete n.dataset.isim; delete n.dataset.text; } }
}
function setMyStil(st){
  myStil = cleanStil(st);
  try { localStorage.setItem(STIL_KEY, JSON.stringify(myStil)); } catch(e){}
  if (typeof joined !== 'undefined' && joined){ broadcast({ t: 'stil', stil: myStil }); renderSelf(); applyColors(); }
  renderStilPicker();
}
function stilOnData(id, d){
  if (d.t !== 'stil') return false;
  const p = peers.get(id); if (!p) return true;
  p.stil = cleanStil(d.stil);
  applyColors(); renderPeer(p);
  return true;
}

// ---------- seçici (Görünüm penceresinde “✨ Kartım”) ----------
function renderStilPicker(){
  const box = document.getElementById('stilPicker'); if (!box) return;
  const st = myStil || { renk: '', anim: '', isim: '' };
  box.innerHTML = '';
  const row = (label, el) => { const r = document.createElement('div'); r.className = 'tema-row'; const s = document.createElement('span'); s.textContent = label; r.append(s, el); box.append(r); };
  // renkler
  const sw = document.createElement('div'); sw.className = 'stil-renkler';
  const oto = document.createElement('button'); oto.type = 'button'; oto.className = 'stil-sw oto' + (!st.renk ? ' on' : ''); oto.title = 'Otomatik (oda verir)'; oto.textContent = 'A';
  oto.onclick = () => setMyStil(Object.assign({}, st, { renk: '' }));
  sw.append(oto);
  STIL_RENK.forEach(([c, ad]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'stil-sw' + (st.renk === c ? ' on' : ''); b.style.setProperty('--sw', c); b.title = ad; b.setAttribute('aria-label', ad);
    b.onclick = () => setMyStil(Object.assign({}, st, { renk: c }));
    sw.append(b);
  });
  const ozel = document.createElement('input'); ozel.type = 'color'; ozel.className = 'stil-ozel'; ozel.value = st.renk || '#39ff14'; ozel.title = 'İstediğin renk';
  ozel.onchange = () => setMyStil(Object.assign({}, st, { renk: ozel.value }));
  sw.append(ozel);
  row('Kart rengi', sw);
  const seg = (list, key) => {
    const g = document.createElement('div'); g.className = 'seg stil-seg';
    list.forEach(([v, ad]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = ad; b.classList.toggle('on', (st[key] || '') === v); b.onclick = () => setMyStil(Object.assign({}, st, { [key]: v })); g.append(b); });
    return g;
  };
  row('Hareketli renk', seg(STIL_ANIM, 'anim'));
  row('İsim efekti', seg(STIL_ISIM, 'isim'));
  // önizleme
  const pv = document.createElement('div'); pv.className = 'stil-onizle person';
  pv.style.setProperty('--c', st.renk || (typeof colorFor === 'function' && typeof peer !== 'undefined' && peer ? colorFor(peer.id) : 'var(--accent)'));
  pv.innerHTML = '<span class="stil-nokta"></span><span class="pname"></span>';
  pv.querySelector('.pname').textContent = (typeof myName !== 'undefined' && myName) || 'Adın';
  applyStil(pv, st);
  row('Önizleme', pv);
}

renderStilPicker();
