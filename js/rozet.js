// Seviye ve rozetler (sadece üyeler). Puan: odada geçen her dakika 1, oynanan oyun 3, kazanılan oyun +15,
// açılan oda 5, ekran paylaşımı 5, ikram 2. Sayaçlar burada biriktirilir, birkaç dakikada bir ve sayfa kapanırken
// sunucuya (/api/uye/ilerleme) tek seferde gider; rozetler sunucudaki toplamlardan hesaplanır.
const ROZETLER = [
  { id: 'ilk', e: '👋', ad: 'İlk Adım', ac: 'İlk kez bir odada sohbet et', k: g => g.dk >= 1 },
  { id: 'sohbet', e: '🎙️', ad: 'Sohbet Kuşu', ac: 'Odalarda toplam 10 saat geçir', k: g => g.dk >= 600, p: g => g.dk / 600 },
  { id: 'mudavim', e: '📅', ad: 'Müdavim', ac: '7 farklı gün gel', k: g => g.gunler >= 7, p: g => g.gunler / 7 },
  { id: 'gece', e: '🦉', ad: 'Gece Kuşu', ac: 'Gece 00:00–05:00 arası 1 saat sohbet et', k: g => g.gece >= 60, p: g => g.gece / 60 },
  { id: 'maraton', e: '⏱️', ad: 'Maratoncu', ac: 'Tek seferde 3 saat odada kal', k: g => g.enUzun >= 180, p: g => g.enUzun / 180 },
  { id: 'evsahibi', e: '🏠', ad: 'Ev Sahibi', ac: '10 oda aç', k: g => g.oda >= 10, p: g => g.oda / 10 },
  { id: 'oyunsever', e: '🎲', ad: 'Oyunsever', ac: '5 farklı oyunda oyna', k: g => oyunCesit(g) >= 5, p: g => oyunCesit(g) / 5 },
  { id: 'zafer', e: '🥇', ad: 'İlk Zafer', ac: 'Bir oyun kazan', k: g => galibiyet(g) >= 1 },
  { id: 'sampiyon', e: '🏆', ad: 'Şampiyon', ac: '25 oyun kazan', k: g => galibiyet(g) >= 25, p: g => galibiyet(g) / 25 },
  { id: 'efsane', e: '👑', ad: 'Efsane', ac: '100 oyun kazan', k: g => galibiyet(g) >= 100, p: g => galibiyet(g) / 100 },
  { id: 'okey', e: '🀄', ad: 'Okey Ustası', ac: '10 okey oyunu kazan', k: g => oyunK(g, 'okey') >= 10, p: g => oyunK(g, 'okey') / 10 },
  { id: 'tavla', e: '🎯', ad: 'Tavla Ustası', ac: '10 tavla oyunu kazan', k: g => oyunK(g, 'tavla') >= 10, p: g => oyunK(g, 'tavla') / 10 },
  { id: 'yayinci', e: '🖥️', ad: 'Yayıncı', ac: '10 kez ekran paylaş', k: g => g.ekran >= 10, p: g => g.ekran / 10 },
  { id: 'comert', e: '🍵', ad: 'Cömert', ac: '25 ikram ısmarla', k: g => g.ikram >= 25, p: g => g.ikram / 25 },
  { id: 'sosyal', e: '🤝', ad: 'Sosyal', ac: '5 arkadaş edin', k: g => g.arkadas >= 5, p: g => g.arkadas / 5 }
];
// kartta gösterilecek sıra: en zor kazanılanlar önce
const ROZET_ONCELIK = ['efsane', 'sampiyon', 'maraton', 'okey', 'tavla', 'sohbet', 'gece', 'mudavim', 'evsahibi', 'yayinci', 'comert', 'sosyal', 'oyunsever', 'zafer', 'ilk'];
const oyunCesit = g => Object.values(g.oyun || {}).filter(x => x[0] > 0).length;
const galibiyet = g => Object.values(g.oyun || {}).reduce((a, x) => a + (x[1] || 0), 0);
const oyunK = (g, k) => ((g.oyun || {})[k] || [0, 0])[1];
function seviyeBilgi(xp){
  let l = 1; while (25 * (l + 1) * l <= xp && l < 99) l++;
  const alt = 25 * l * (l - 1), ust = 25 * (l + 1) * l;
  return { lv: l, xp, alt, ust, yuzde: Math.max(0, Math.min(100, Math.round((xp - alt) / (ust - alt) * 100))) };
}
// kartta: "Lv 7" + en fazla 3 rozet
const rozetTemiz = r => {
  if (!r || typeof r !== 'object') return null;
  const lv = Math.max(1, Math.min(99, Math.floor(+r.lv || 1)));
  const ids = Array.isArray(r.r) ? r.r.filter(x => ROZETLER.some(z => z.id === x)).slice(0, 3) : [];
  return { lv, r: ids };
};

const ROZET = (() => {
  const BOS = () => ({ dk: 0, gece: 0, oda: 0, ekran: 0, ikram: 0, oyun: {} });
  const KEY = 'oyunodasi-ilerleme-bekleyen';
  let g = null;                    // sunucudaki toplamlar (+ bekleyenler eklenmiş hali gösterilir)
  let bek = (() => { try { return Object.assign(BOS(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch(e){ return BOS(); } })();
  let oturum = 0, sonGonder = Date.now(), gorulen = new Set(), kazanilan = null;
  const uye = () => typeof account !== 'undefined' && account && account.uye;
  const kaydet = () => { try { localStorage.setItem(KEY, JSON.stringify(bek)); } catch(e){} };
  const bosMu = () => !bek.dk && !bek.oda && !bek.ekran && !bek.ikram && !Object.keys(bek.oyun).length;
  // sunucu + bekleyen = ekranda görünen
  function toplam(){
    const t = Object.assign({ xp: 0, dk: 0, gece: 0, oda: 0, ekran: 0, ikram: 0, oyun: {}, gunler: 0, enUzun: 0, arkadas: 0 }, JSON.parse(JSON.stringify(g || {})));
    t.oyun = t.oyun || {};
    t.dk += bek.dk; t.gece += bek.gece; t.oda += bek.oda; t.ekran += bek.ekran; t.ikram += bek.ikram;
    t.xp = (t.xp || 0) + bek.dk + bek.oda * 5 + bek.ekran * 5 + bek.ikram * 2;
    for (const [k, v] of Object.entries(bek.oyun)){ const x = t.oyun[k] = t.oyun[k] || [0, 0]; x[0] += v[0]; x[1] += v[1]; t.xp += v[0] * 3 + v[1] * 15; }
    t.enUzun = Math.max(t.enUzun || 0, oturum);
    if (!t.gunler && t.dk) t.gunler = 1;
    return t;
  }
  const kazanilanlar = t => ROZETLER.filter(r => r.k(t)).map(r => r.id);
  function ben(){
    if (!uye()) return null;
    const t = toplam(), k = kazanilanlar(t);
    return { lv: seviyeBilgi(t.xp).lv, r: ROZET_ONCELIK.filter(id => k.includes(id)).slice(0, 3) };
  }
  // yeni rozet kazanınca kutla ve odadakilere duyur
  function kontrol(){
    if (!uye()) return;
    const t = toplam(), k = kazanilanlar(t), lv = seviyeBilgi(t.xp).lv;
    if (g){
      if (kazanilan){
        k.filter(id => !kazanilan.includes(id)).forEach(id => { const r = ROZETLER.find(z => z.id === id); toast('🏅 Yeni rozet: ' + r.e + ' ' + r.ad + '!'); });
        if (kontrol.lv && lv > kontrol.lv) toast('⬆️ Seviye atladın: Lv ' + lv + '!');
      }
      kazanilan = k; kontrol.lv = lv;
    }
    // kartta görünen değiştiyse odadakilere duyur
    const imza = JSON.stringify(ben());
    if (imza !== kontrol.imza){ kontrol.imza = imza; duyur(); }
  }
  function duyur(){
    if (typeof joined === 'undefined' || !joined) return;
    try { broadcast({ t: 'rozet', rozet: ben() }); renderSelf(); } catch(e){}
  }
  function ekle(alan, n){ if (!uye()) return; bek[alan] = (bek[alan] || 0) + (n || 1); kaydet(); kontrol(); }
  function oyun(k, kazandi){
    if (!uye() || !/^[a-z0-9]{2,16}$/.test(k)) return;
    const x = bek.oyun[k] = bek.oyun[k] || [0, 0]; x[0]++; if (kazandi) x[1]++;
    kaydet(); kontrol(); gonder();
  }
  async function gonder(kapanis){
    if (!uye() || bosMu() && !(kapanis && oturum)) return;
    const body = Object.assign({}, bek, { oturum });
    if (kapanis){
      // sayfa kapanırken: başlık gönderilemediği için anahtar gövdede
      try { navigator.sendBeacon(UYE_API + 'ilerleme', new Blob([JSON.stringify(Object.assign(body, { token: account.token }))], { type: 'text/plain' })); bek = BOS(); kaydet(); } catch(e){}
      return;
    }
    const giden = bek; bek = BOS(); kaydet(); sonGonder = Date.now();
    try { const d = await uyeApi('ilerleme', body); g = d.ilerleme; kontrol(); }
    catch(e){
      // gitmediyse geri koy
      bek.dk += giden.dk; bek.gece += giden.gece; bek.oda += giden.oda; bek.ekran += giden.ekran; bek.ikram += giden.ikram;
      for (const [k, v] of Object.entries(giden.oyun)){ const x = bek.oyun[k] = bek.oyun[k] || [0, 0]; x[0] += v[0]; x[1] += v[1]; }
      kaydet();
    }
  }
  // dakika sayacı: odada en az bir kişiyle bağlıyken
  setInterval(() => {
    if (!uye() || typeof joined === 'undefined' || !joined) { oturum = 0; return; }
    const biri = [...peers.values()].some(p => p.linked && !p.lobby);
    if (!biri) return;
    bek.dk++; oturum++;
    const saat = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: 'numeric', hourCycle: 'h23' }).format(new Date());
    if (saat < 5) bek.gece++;
    kaydet(); kontrol();
    if (Date.now() - sonGonder > 5 * 60e3) gonder();
  }, 60e3);
  window.addEventListener('pagehide', () => gonder(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden && !bosMu()) gonder(); });

  // ---------- olaylara bağlan ----------
  if (typeof enterRoom === 'function'){ const e0 = enterRoom; enterRoom = function(){ const ilk = !joined; const r = e0.apply(this, arguments); if (ilk && isHost && !rejoining) ekle('oda'); return r; }; }
  if (typeof startShareWithStream === 'function'){ const s0 = startShareWithStream; startShareWithStream = function(){ const r = s0.apply(this, arguments); ekle('ekran'); return r; }; }
  if (typeof sendIkram === 'function'){ const i0 = sendIkram; sendIkram = function(){ const r = i0.apply(this, arguments); ekle('ikram'); return r; }; }
  // masa oyunu bitti: kazananın hakkı kutusu gelince (oyuncu isem) sayılır
  if (typeof onView === 'function'){
    const v0 = onView;
    onView = function(d){
      try {
        if (d && d.ceza && d.ceza.gid && d.seat >= 0 && !gorulen.has(d.ceza.gid)){
          gorulen.add(d.ceza.gid);
          const s = tables.get(d.id);
          if (s) oyun(s.game, d.ceza.kaz.some(x => x.id === peer.id));
        }
      } catch(e){}
      return v0.apply(this, arguments);
    };
  }
  document.addEventListener('uye-ben', e => { if (e.detail && e.detail.ilerleme){ g = e.detail.ilerleme; kontrol(); } });

  // ---------- profil penceresinde rozetler ----------
  function profilCiz(kutu){
    if (!kutu) return;
    const t = toplam(), s = seviyeBilgi(t.xp), k = kazanilanlar(t);
    kutu.innerHTML = '';
    const ust = document.createElement('div'); ust.className = 'rz-ust';
    ust.innerHTML = '<b class="rz-lv"></b><div class="rz-bar"><i></i></div><small></small>';
    ust.querySelector('.rz-lv').textContent = 'Lv ' + s.lv;
    ust.querySelector('i').style.width = s.yuzde + '%';
    ust.querySelector('small').textContent = (t.xp - s.alt) + ' / ' + (s.ust - s.alt) + ' puan · sonraki seviye Lv ' + (s.lv + 1) + ' · ' + k.length + '/' + ROZETLER.length + ' rozet';
    const grid = document.createElement('div'); grid.className = 'rz-grid';
    ROZETLER.forEach(r => {
      const on = k.includes(r.id);
      const c = document.createElement('div'); c.className = 'rz' + (on ? ' on' : '');
      c.title = r.ac;
      c.innerHTML = '<span></span><b></b><small></small>' + (!on && r.p ? '<i><u></u></i>' : '');
      c.querySelector('span').textContent = r.e; c.querySelector('b').textContent = r.ad; c.querySelector('small').textContent = r.ac;
      if (!on && r.p) c.querySelector('u').style.width = Math.min(100, Math.round(r.p(t) * 100)) + '%';
      grid.append(c);
    });
    kutu.append(ust, grid);
  }
  return { ben, ekle, oyun, gonder, profilCiz, toplam, kontrol };
})();
function rozetBen(){ return ROZET.ben(); }
// kişi kartında seviye ve rozetler
function rozetEtiket(r){
  r = rozetTemiz(r); if (!r) return '';
  const e = r.r.map(id => (ROZETLER.find(z => z.id === id) || {}).e || '').join('');
  return '<span class="pill rz-pill" title="Seviye ' + r.lv + '">Lv ' + r.lv + (e ? ' ' + e : '') + '</span>';
}
