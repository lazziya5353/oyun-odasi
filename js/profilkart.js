// Profil kartı: odada birine dokununca / tıklayınca kapak rengi, avatar (çerçevesiyle), ad, seviye ve rozetler,
// hakkında yazısı, istatistik ve "ne zamandan beri arkadaşsınız". Bilgisayarda kartın yanında açılır,
// telefonda alttan açılan kişi panelinin üstünde durur.
const PROFIL = (() => {
  const mob = () => window.matchMedia('(max-width: 860px)').matches;
  const onbellek = new Map();   // kadi → { ts, d }
  async function getir(kadi){
    const k = String(kadi).toLocaleLowerCase('tr-TR'), c = onbellek.get(k);
    if (c && Date.now() - c.ts < 120e3) return c.d;
    const h = {}; if (typeof account !== 'undefined' && account) h.authorization = 'Bearer ' + account.token;
    const r = await fetch('/api/uye/profil-kart?kadi=' + encodeURIComponent(kadi), { headers: h });
    if (!r.ok) throw new Error('yok');
    const d = await r.json(); onbellek.set(k, { ts: Date.now(), d }); return d;
  }
  const sure = ms => { const g = Math.floor(ms / 864e5); if (g < 1) return 'bugün'; if (g < 7) return g + ' gündür'; if (g < 31) return Math.floor(g / 7) + ' haftadır'; if (g < 365) return Math.floor(g / 30) + ' aydır'; return Math.floor(g / 365) + ' yıldır'; };
  const ay = ts => new Date(ts).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  function el(p){
    const ben = typeof peer !== 'undefined' && peer && p.id === peer.id;
    const st = typeof stilOf === 'function' ? stilOf(p.id) : null;
    const renk = (st && st.renk) || p.color || (typeof colorFor === 'function' ? colorFor(p.id) : '#5ee0b5');
    const k = document.createElement('div'); k.className = 'pk'; k.style.setProperty('--pk', renk);
    k.innerHTML = '<div class="pk-kapak"></div><div class="pk-ust"><div class="pk-av"><div class="avatar"></div></div></div>' +
      '<div class="pk-govde"><b class="pk-ad"></b><small class="pk-alt"></small><div class="pk-rozet"></div><p class="pk-bio" hidden></p><div class="pk-bilgi"></div></div>';
    const av = k.querySelector('.pk-av');
    if (st && st.cerceve) av.dataset.cerceve = st.cerceve;
    const a = k.querySelector('.avatar'); a.style.setProperty('--c', renk);
    const ad = ben ? (typeof myName !== 'undefined' ? myName : '') : p.name;
    if (typeof paintAvatar === 'function') paintAvatar(a, ad, ben ? (typeof account !== 'undefined' && account && account.uye.foto) : p.foto);
    const n = k.querySelector('.pk-ad'); n.textContent = ad + (ben ? ' (sen)' : '');
    if (st && st.isim){ n.dataset.isim = st.isim; n.dataset.text = n.textContent; }
    const kadi = ben ? (typeof account !== 'undefined' && account ? account.uye.kadi : null) : p.uye;
    k.querySelector('.pk-alt').textContent = kadi ? '@' + kadi : 'Misafir';
    const rz = ben ? (typeof rozetBen === 'function' ? rozetBen() : null) : p.rozet;
    const rzKutu = k.querySelector('.pk-rozet');
    if (rz && typeof rozetEtiket === 'function') rzKutu.innerHTML = rozetEtiket(rz);
    if (kadi){
      const bilgi = k.querySelector('.pk-bilgi'); bilgi.textContent = 'Yükleniyor…';
      getir(kadi).then(d => {
        if (d.bio){ const b = k.querySelector('.pk-bio'); b.textContent = d.bio; b.hidden = false; }
        const g = Object.assign({ oyun: {} }, d.ilerleme || {});
        const kaz = typeof ROZETLER !== 'undefined' ? ROZETLER.filter(r => { try { return r.k(Object.assign({ dk: 0, gece: 0, oda: 0, ekran: 0, ikram: 0, gunler: 0, enUzun: 0, arkadas: 0 }, g)); } catch(e){ return false; } }) : [];
        const gal = Object.values(g.oyun || {}).reduce((s, x) => s + (x[1] || 0), 0);
        // tüm rozetler küçük simgelerle
        if (kaz.length){ rzKutu.innerHTML = '<span class="pill rz-pill">Lv ' + (g.lv || 1) + '</span>'; const r = document.createElement('span'); r.className = 'pk-rozetler'; r.textContent = kaz.map(x => x.e).join(' '); r.title = kaz.map(x => x.ad).join(', '); rzKutu.append(r); }
        const satir = [];
        satir.push('🏅 ' + kaz.length + ' rozet', '🎮 ' + gal + ' galibiyet', '⏱ ' + Math.floor((g.dk || 0) / 60) + ' saat sohbet');
        bilgi.innerHTML = '';
        const s1 = document.createElement('span'); s1.textContent = satir.join(' · '); bilgi.append(s1);
        const s2 = document.createElement('span');
        if (!ben && d.arkadas) s2.textContent = '🤝 ' + (d.arkadasTs ? sure(Date.now() - d.arkadasTs) + ' arkadaşsınız' : 'Arkadaşsınız');
        else if (d.uyelik) s2.textContent = '📅 ' + ay(d.uyelik) + ' tarihinden beri üye';
        if (s2.textContent) bilgi.append(s2);
      }).catch(() => { k.querySelector('.pk-bilgi').textContent = ''; });
    } else k.querySelector('.pk-bilgi').textContent = 'Üye olmadığı için seviye ve rozet yok.';
    return k;
  }
  // bilgisayar: kartın yanında açılan kutu
  let acik = null;
  function kapat(){ if (acik){ acik.remove(); acik = null; } }
  function ac(p, anchor){
    kapat();
    const kutu = document.createElement('div'); kutu.className = 'pk-pop'; kutu.setAttribute('role', 'dialog'); kutu.setAttribute('aria-label', 'Profil');
    kutu.append(el(p));
    document.body.append(kutu); acik = kutu;
    const r = anchor.getBoundingClientRect(), w = kutu.offsetWidth, h = kutu.offsetHeight;
    let x = r.right + 10, y = r.top;
    if (x + w > innerWidth - 10) x = Math.max(10, r.left - w - 10);
    if (y + h > innerHeight - 10) y = Math.max(10, innerHeight - h - 10);
    kutu.style.left = x + 'px'; kutu.style.top = y + 'px';
  }
  document.addEventListener('click', e => {
    if (acik && !acik.contains(e.target) && !e.target.closest('#people .person')) kapat();
    if (mob()) return;
    const card = e.target.closest('#people .person');
    if (!card || e.target.closest('button, input, a, video, .tile-ctl, select')) return;
    let p = null;
    if (card.id === 'selfCard') p = { id: peer && peer.id };
    else peers.forEach(x => { if (x.card === card) p = x; });
    if (!p || !p.id) return;
    if (acik && acik._id === p.id){ kapat(); return; }
    ac(p, card); acik._id = p.id;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') kapat(); });
  window.addEventListener('resize', kapat);
  return { el, ac, kapat };
})();
