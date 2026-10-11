// Vampir Köy: Among Us tarzı sesli gizli rol oyunu.
// Köylüler köyde dolaşıp görev yapar; vampirler aralarına karışıp yalnız yakaladığını ısırır.
// Ceset bulunca ya da meydandaki çan çalınınca toplantı olur: herkes konuşur, oylar, biri köyden kovulur.
// Köylüler: bütün görevler biterse ya da bütün vampirler kovulursa kazanır.
// Vampirler: sayıları köylülere eşitlenirse ya da (ayarlıysa) süre dolarsa kazanır.
// Hakem masayı açanın bilgisayarıdır: hareket, ısırma mesafesi, bekleme süresi, görevler orada denetlenir;
// herkes yalnızca kendi rolünü görür.
const VampirCore = (() => {
  const W = 2400, H = 1600, R = 22;
  // odalar (yürünebilir dikdörtgenler)
  const ODALAR = [
    { id: 'meydan', ad: 'Meydan', ico: '⛲', x: 950, y: 600, w: 500, h: 400, zemin: '#5b5148' },
    { id: 'degirmen', ad: 'Değirmen', ico: '🌾', x: 150, y: 110, w: 420, h: 340, zemin: '#6b5a3a' },
    { id: 'kuyu', ad: 'Kuyu', ico: '🪣', x: 1000, y: 100, w: 400, h: 300, zemin: '#4f5a4a' },
    { id: 'ahir', ad: 'Ahır', ico: '🐄', x: 1800, y: 110, w: 450, h: 350, zemin: '#6a4a32' },
    { id: 'firin', ad: 'Fırın', ico: '🍞', x: 120, y: 620, w: 400, h: 320, zemin: '#6e4e3e' },
    { id: 'demirci', ad: 'Demirci', ico: '⚒️', x: 1880, y: 620, w: 400, h: 320, zemin: '#4a4a52' },
    { id: 'kilise', ad: 'Kilise', ico: '⛪', x: 150, y: 1150, w: 450, h: 350, zemin: '#55505e' },
    { id: 'mezarlik', ad: 'Mezarlık', ico: '🪦', x: 1000, y: 1200, w: 420, h: 330, zemin: '#3a463a' },
    { id: 'orman', ad: 'Orman', ico: '🌲', x: 1800, y: 1150, w: 480, h: 370, zemin: '#2f4a2f' }
  ];
  // yollar (odaların içine biraz taşar ki birleşsin)
  const YOLLAR = [
    { x: 510, y: 230, w: 550, h: 120 }, { x: 1340, y: 200, w: 520, h: 120 },
    { x: 1140, y: 340, w: 120, h: 320 }, { x: 460, y: 740, w: 550, h: 120 },
    { x: 1390, y: 740, w: 550, h: 120 }, { x: 1140, y: 940, w: 120, h: 320 },
    { x: 540, y: 1300, w: 520, h: 120 }, { x: 1360, y: 1300, w: 500, h: 120 },
    { x: 300, y: 390, w: 120, h: 290 }, { x: 1990, y: 400, w: 120, h: 280 },
    { x: 260, y: 880, w: 120, h: 330 }, { x: 2000, y: 880, w: 120, h: 330 }
  ];
  const ALAN = ODALAR.concat(YOLLAR);
  const icinde = (x, y, r) => ALAN.some(a => x >= a.x + r && x <= a.x + a.w - r && y >= a.y + r && y <= a.y + a.h - r);
  const odaOf = (x, y) => { const o = ODALAR.find(a => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h); return o ? o.ad : 'Yol'; };
  // görev türleri ve yerleri
  const GOREV_TUR = {
    kuyu: { ad: 'Kuyudan su çek', ico: '🪣' }, odun: { ad: 'Odun kes', ico: '🪓' }, inek: { ad: 'İnek sağ', ico: '🥛' },
    fener: { ad: 'Fenerleri yak', ico: '🏮' }, ekmek: { ad: 'Ekmek pişir', ico: '🍞' }, kilic: { ad: 'Kılıç döv', ico: '⚒️' },
    tohum: { ad: 'Tohum ek', ico: '🌱' }, sifre: { ad: 'Sandığın şifresini çöz', ico: '🔐' }
  };
  const ISTASYON = [
    { tur: 'kuyu', x: 1200, y: 230 }, { tur: 'inek', x: 1960, y: 260 }, { tur: 'tohum', x: 2150, y: 400 },
    { tur: 'tohum', x: 260, y: 390 }, { tur: 'sifre', x: 470, y: 190 }, { tur: 'ekmek', x: 290, y: 720 },
    { tur: 'kilic', x: 2090, y: 720 }, { tur: 'odun', x: 1950, y: 1260 }, { tur: 'odun', x: 2190, y: 1430 },
    { tur: 'fener', x: 1020, y: 950 }, { tur: 'sifre', x: 390, y: 1250 }, { tur: 'fener', x: 1340, y: 1260 },
    { tur: 'kilic', x: 1960, y: 880 }, { tur: 'kuyu', x: 1330, y: 330 }, { tur: 'ekmek', x: 450, y: 880 }, { tur: 'inek', x: 2180, y: 200 }
  ].map((s, i) => Object.assign({ i, oda: odaOf(s.x, s.y) }, s));
  const CAN = { x: 1200, y: 690 };          // acil toplantı çanı
  const SALTER = { x: 1390, y: 950 };       // fener şalteri (sabotaj onarımı)
  const MEZARLAR = [{ x: 190, y: 160 }, { x: 200, y: 1460 }, { x: 1210, y: 1480 }, { x: 2240, y: 1200 }, { x: 2210, y: 160 }];
  const RENK = [
    ['Kırmızı', '#e53935'], ['Mavi', '#1e66f5'], ['Yeşil', '#2e9d43'], ['Pembe', '#ec4fa0'], ['Turuncu', '#fb8c00'],
    ['Sarı', '#fdd835'], ['Siyah', '#3b3b3b'], ['Beyaz', '#eeeeee'], ['Mor', '#8e24aa'], ['Kahverengi', '#7a4f3a'],
    ['Camgöbeği', '#00bcd4'], ['Limon', '#b5d334']
  ];
  const ISIR_R = 105, KULLAN_R = 115, BILDIR_R = 150, MEZAR_R = 95;
  const HIZ = { yavas: 210, normal: 260, hizli: 320 };
  const GORUS = { dar: 240, normal: 330, genis: 460 };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  function dogumYeri(k, n){
    const a = (k / Math.max(1, n)) * Math.PI * 2;
    return [Math.round(1200 + Math.cos(a) * 140), Math.round(800 + Math.sin(a) * 110)];
  }
  return { W, H, R, ODALAR, YOLLAR, icinde, odaOf, GOREV_TUR, ISTASYON, CAN, SALTER, MEZARLAR, RENK, ISIR_R, KULLAN_R, BILDIR_R, MEZAR_R, HIZ, GORUS, dist, dogumYeri };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = VampirCore;

if (typeof registerTableGame === 'function') (function(){
  const V = VampirCore;
  const T_GIRIS = 5500, T_KOVMA = 7000;
  const seated = o => o.sum.seats.filter(x => x && !x.bot).map(x => x.id);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (arr, v, d) => arr.includes(v) ? v : d;
  const ad = (st, id) => st.names[id] || 'Oyuncu';
  const canli = (st, rol) => st.order.filter(id => st.alive[id] && !st.left[id] && (!rol || st.roles[id] === rol));

  function vampirSayisi(n, ayar){
    let v = ayar === 'auto' ? (n <= 6 ? 1 : 2) : +ayar;
    while (v > 1 && v >= n / 2) v--;
    return Math.max(1, v);
  }
  function gorevDagit(st, id, n){
    // farklı istasyonlardan n görev; mümkünse farklı türler
    const turler = shuffle(Object.keys(V.GOREV_TUR));
    const out = [], kullan = new Set();
    for (const t of turler){
      if (out.length >= n) break;
      const s = shuffle(V.ISTASYON.filter(x => x.tur === t && !kullan.has(x.i)))[0];
      if (s){ out.push({ s: s.i, done: false }); kullan.add(s.i); }
    }
    while (out.length < n){
      const s = shuffle(V.ISTASYON.filter(x => !kullan.has(x.i)))[0]; if (!s) break;
      out.push({ s: s.i, done: false }); kullan.add(s.i);
    }
    return out;
  }
  function yerlestir(st){
    st.order.forEach((id, k) => { st.pos[id] = V.dogumYeri(k, st.order.length); st.tp[id] = (st.tp[id] || 0) + 1; });
  }
  function baslat(o){
    const op = o.sum.opts, ids = shuffle(seated(o));
    const st = {
      phase: 'giris', order: ids, names: {}, color: {}, roles: {}, alive: {}, left: {}, known: {}, pos: {}, tp: {}, last: {},
      tasks: {}, toplamGorev: 0, bitenGorev: 0, bodies: [], kills: {}, cd: {}, ventCd: {}, acil: {},
      sab: { until: 0, cd: 0 }, meeting: null, eject: null, winner: null, seq: 0,
      startedAt: Date.now(), endsAt: 0, phaseEnds: Date.now() + T_GIRIS, acilHazir: 0
    };
    o.sum.seats.forEach(x => { if (x && !x.bot) st.names[x.id] = x.name; });
    const nv = vampirSayisi(ids.length, op.vampir);
    const vamp = new Set(shuffle(ids.slice()).slice(0, nv));
    ids.forEach((id, k) => {
      st.color[id] = k % V.RENK.length;
      st.roles[id] = vamp.has(id) ? 'v' : 'k';
      st.alive[id] = true; st.kills[id] = 0; st.acil[id] = op.acil;
      st.tasks[id] = gorevDagit(st, id, op.gorev);   // vampirler için sahte liste (sayılmaz)
      if (!vamp.has(id)) st.toplamGorev += st.tasks[id].length;
    });
    yerlestir(st);
    o.state = st;
    return st;
  }
  function oyunaGec(o){
    const st = o.state, op = o.sum.opts, now = Date.now();
    st.phase = 'oyun'; st.phaseEnds = 0; st.meeting = null; st.eject = null; st.seq++;
    if (!st.endsAt && op.sure) st.endsAt = now + op.sure * 60000;
    st.order.forEach(id => { if (st.roles[id] === 'v') st.cd[id] = now + op.bekleme * 1000; });
    st.acilHazir = now + 15000;
    st.sab.until = 0; st.sab.cd = now + 30000;
  }
  function kontrol(o){
    const st = o.state;
    if (st.phase === 'bitti') return true;
    const v = canli(st, 'v').length, k = canli(st, 'k').length;
    let w = null;
    if (v === 0) w = { taraf: 'k', neden: 'Bütün vampirler yakalandı!' };
    else if (st.toplamGorev && st.bitenGorev >= st.toplamGorev) w = { taraf: 'k', neden: 'Köylüler bütün görevleri bitirdi!' };
    else if (v >= k) w = { taraf: 'v', neden: 'Vampirler köyü ele geçirdi!' };
    else if (st.endsAt && Date.now() >= st.endsAt && st.phase === 'oyun') w = { taraf: 'v', neden: 'Süre doldu, köylüler görevleri yetiştiremedi!' };
    if (!w) return false;
    st.winner = w; st.phase = 'bitti'; st.phaseEnds = 0; st.seq++;
    addSys('🧛 Vampir Köy bitti: ' + (w.taraf === 'k' ? 'Köylüler' : 'Vampirler') + ' kazandı. ' + w.neden);
    return true;
  }
  function toplantiBaslat(o, by, ceset){
    const st = o.state, op = o.sum.opts, now = Date.now();
    st.order.forEach(id => { if (!st.alive[id]) st.known[id] = true; });
    st.bodies = [];
    st.meeting = { by, ceset: ceset || null, votes: {}, acil: !ceset };
    st.phase = 'toplanti'; st.phaseEnds = now + op.tartisma * 1000; st.seq++;
    st.sab.until = 0;
    yerlestir(st);
    sendEvent(o, { k: 'toplanti', by: ad(st, by), ceset: ceset ? ad(st, ceset) : '', acil: !ceset });
  }
  function oylamaBitir(o){
    const st = o.state, m = st.meeting; if (!m) return;
    const sayi = {};
    Object.values(m.votes).forEach(h => { sayi[h] = (sayi[h] || 0) + 1; });
    let en = null, enS = 0, berabere = false;
    Object.keys(sayi).forEach(h => { if (sayi[h] > enS){ en = h; enS = sayi[h]; berabere = false; } else if (sayi[h] === enS) berabere = true; });
    let kim = null;
    if (en && en !== 'pas' && !berabere && st.alive[en]){ kim = en; st.alive[kim] = false; st.known[kim] = true; }
    st.eject = { kim, ad: kim ? ad(st, kim) : '', rol: kim && o.sum.opts.rolAc ? st.roles[kim] : null, berabere, pas: en === 'pas' && !berabere,
      kalan: o.sum.opts.rolAc ? canli(st, 'v').length : null, sayi, oylar: m.votes };
    st.phase = 'kovma'; st.phaseEnds = Date.now() + T_KOVMA; st.seq++;
  }
  function yakindakiCeset(st, id){
    const p = st.pos[id]; let best = null, bd = 1e9;
    st.bodies.forEach(b => { const d = V.dist(p, [b.x, b.y]); if (d < bd){ bd = d; best = b; } });
    return bd <= V.BILDIR_R ? best : null;
  }
  function konumYayini(o){
    const st = o.state; if (!st || (st.phase !== 'oyun' && st.phase !== 'giris')) return;
    const now = Date.now();
    const herkes = st.order.filter(id => !st.left[id]);
    const alici = new Set(herkes); o.watchers.forEach(w => alici.add(w)); if (openTable === o.sum.id) alici.add(peer.id);
    alici.forEach(w => {
      const benOlu = !st.order.includes(w) || !st.alive[w];
      const p = [];
      herkes.forEach(id => { if (id === w) return; if (!st.alive[id] && !benOlu) return; const q = st.pos[id]; p.push([id, q[0], q[1], st.alive[id] ? 1 : 0]); });
      sendTo(w, { t: 'tb-ev', id: o.sum.id, ev: { k: 'p', p, t: now } });
    });
  }
  function tikBaslat(o){
    if (o.vmpTik) return;
    o.vmpTik = setInterval(() => {
      if (owned.get(o.sum.id) !== o || !o.state || o.sum.status !== 'playing' || o.state.phase === 'bitti'){ clearInterval(o.vmpTik); o.vmpTik = null; return; }
      konumYayini(o);
      const st = o.state, now = Date.now();
      if (st.phase === 'oyun'){
        let deg = false;
        if (st.sab.until && now >= st.sab.until){ st.sab.until = 0; deg = true; }
        if (st.endsAt && now >= st.endsAt && kontrol(o)) deg = true;
        if (deg){ sendViews(o); pump(o); }
      }
    }, 100);
  }

  registerTableGame('vampir', {
    name: 'Vampir Köy', icon: '🧛', seats: 10, minPlayers: 3, bots: false, joinMidGame: false, yeni: true,
    cleanOpts: o => ({
      vampir: pick(['auto', '1', '2', '3'], String(o.vampir), 'auto'),
      gorev: pick([3, 4, 5, 6, 7, 8], +o.gorev, 5),
      bekleme: pick([15, 20, 30, 45, 60], +o.bekleme, 30),
      limit: pick([0, 1, 2, 3, 5], +o.limit, 0),
      sure: pick([0, 5, 10, 15, 20], +o.sure, 0),
      tartisma: pick([30, 60, 90, 120], +o.tartisma, 60),
      oy: pick([20, 30, 45, 60], +o.oy, 30),
      acil: pick([0, 1, 2, 3], +o.acil, 1),
      hiz: pick(['yavas', 'normal', 'hizli'], o.hiz, 'normal'),
      gorus: pick(['dar', 'normal', 'genis'], o.gorus, 'normal'),
      ses: pick(['acik', 'yakin', 'toplanti'], o.ses, 'acik'),
      rolAc: o.rolAc === undefined ? true : !!o.rolAc && o.rolAc !== '0',
      sabotaj: o.sabotaj === undefined ? true : !!o.sabotaj && o.sabotaj !== '0'
    }),
    variantName: s => (s.opts.vampir === 'auto' ? 'Otomatik' : s.opts.vampir) + ' vampir · ' + s.opts.gorev + ' görev · ısırma ' + s.opts.bekleme + ' sn' +
      (s.opts.limit ? ' · en fazla ' + s.opts.limit + ' kurban' : '') + (s.opts.sure ? ' · ' + s.opts.sure + ' dk' : ''),
    seatLabel: () => 'Köylü',
    waitText: (s, own) => own ? 'En az 3 kişi (en güzeli 5-10) oturunca “Oyunu başlat”a bas. Roller gizlice dağıtılır. Mikrofonlar açık olsun!' : 'Bir koltuğa otur; masa sahibi başlatınca köye ineceksin.',
    makeCard: {
      desc: '3-10 kişi. Among Us gibi: köylüler görev yapar, vampir aralarına karışıp ısırır. Ceset bulunca toplantı, konuşun ve oylayın!',
      opts: '<label>Vampir sayısı<select data-o="vampir"><option value="auto" selected>Otomatik (≤6 kişi: 1, 7+: 2)</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>' +
        '<label>Kişi başı görev<select data-o="gorev"><option>3</option><option>4</option><option selected>5</option><option>6</option><option>7</option><option>8</option></select></label>' +
        '<label>Oyun sırasında ses<select data-o="ses"><option value="acik" selected>Herkes konuşur</option><option value="yakin">Yakınlık sesi (yanındakini duyarsın)</option><option value="toplanti">Sadece toplantıda (Among Us kuralı)</option></select></label>' +
        '<details class="mc-detay"><summary>⚙️ Diğer ayarlar (süreler, kurban sınırı, hız…)</summary>' +
        '<label>Isırma bekleme süresi<select data-o="bekleme"><option value="15">15 sn</option><option value="20">20 sn</option><option value="30" selected>30 sn</option><option value="45">45 sn</option><option value="60">60 sn</option></select></label>' +
        '<label>Vampir başı en fazla kurban<select data-o="limit"><option value="0" selected>Sınırsız</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="5">5</option></select></label>' +
        '<label>Oyun süresi (dolarsa vampirler kazanır)<select data-o="sure"><option value="0" selected>Sınırsız</option><option value="5">5 dk</option><option value="10">10 dk</option><option value="15">15 dk</option><option value="20">20 dk</option></select></label>' +
        '<label>Toplantıda konuşma süresi<select data-o="tartisma"><option value="30">30 sn</option><option value="60" selected>60 sn</option><option value="90">90 sn</option><option value="120">2 dk</option></select></label>' +
        '<label>Oylama süresi<select data-o="oy"><option value="20">20 sn</option><option value="30" selected>30 sn</option><option value="45">45 sn</option><option value="60">60 sn</option></select></label>' +
        '<label>Kişi başı acil çan hakkı<select data-o="acil"><option value="0">Yok</option><option value="1" selected>1</option><option value="2">2</option><option value="3">3</option></select></label>' +
        '<label>Yürüme hızı<select data-o="hiz"><option value="yavas">Yavaş</option><option value="normal" selected>Normal</option><option value="hizli">Hızlı</option></select></label>' +
        '<label>Görüş mesafesi<select data-o="gorus"><option value="dar">Dar (korkunç)</option><option value="normal" selected>Normal</option><option value="genis">Geniş</option></select></label>' +
        '<label>Kovulanın rolü açıklansın<select data-o="rolAc"><option value="1" selected>Evet</option><option value="0">Hayır (daha gizemli)</option></select></label>' +
        '<label>Vampir sabotajı (fenerleri söndür)<select data-o="sabotaj"><option value="1" selected>Açık</option><option value="0">Kapalı</option></select></label></details>',
      read: c => { const o = {}; c.querySelectorAll('[data-o]').forEach(e => o[e.dataset.o] = e.value); return o; }
    },
    start(o){ const st = baslat(o); tikBaslat(o); return st; },
    onLeave(o, k){
      const st = o.state; if (!st) return;
      const here = new Set(seated(o));
      st.order.forEach(id => { if (!here.has(id) && !st.left[id]){ st.left[id] = true; st.alive[id] = false; st.known[id] = true; addSys('🧛 ' + ad(st, id) + ' köyden ayrıldı'); } });
      if (st.meeting && st.phase === 'oylama' && canli(st).every(id => st.meeting.votes[id])) oylamaBitir(o);
      kontrol(o); sendViews(o); pump(o);
    },
    act(o, seat, a, who){
      const st = o.state; if (!st) return;
      const op = o.sum.opts, now = Date.now();
      if (a.type === 'yeni'){ if (st.phase !== 'bitti' || who !== o.sum.owner) return; baslat(o); tikBaslat(o); sendViews(o); pump(o); return; }
      if (!st.order.includes(who) || st.left[who]) return;
      const benim = st.pos[who], yasar = st.alive[who], vampir = st.roles[who] === 'v';
      if (a.type === 'm'){
        if (st.phase !== 'oyun' && st.phase !== 'giris') return;
        if (st.phase === 'giris') return;
        const x = +a.x, y = +a.y; if (!isFinite(x) || !isFinite(y)) return;
        const gecen = Math.max(0.05, (now - (st.last[who] || now - 100)) / 1000);
        const max = V.HIZ[op.hiz] * Math.min(gecen, 0.6) * 1.6 + 25;
        let nx = x, ny = y;
        const d = Math.hypot(x - benim[0], y - benim[1]);
        if (d > max){ nx = benim[0] + (x - benim[0]) / d * max; ny = benim[1] + (y - benim[1]) / d * max; }
        nx = Math.max(0, Math.min(V.W, nx)); ny = Math.max(0, Math.min(V.H, ny));
        if (yasar && !V.icinde(nx, ny, V.R - 2)) return;
        st.pos[who] = [Math.round(nx), Math.round(ny)]; st.last[who] = now;
        return;
      }
      if (st.phase === 'oyun'){
        if (a.type === 'gorev'){
          const t = st.tasks[who] && st.tasks[who][+a.i];
          if (!t || t.done) return;
          const s = V.ISTASYON[t.s];
          if (V.dist(benim, [s.x, s.y]) > V.KULLAN_R + 40) return;
          t.done = true;
          if (!vampir){ st.bitenGorev++; kontrol(o); }
          sendViews(o); pump(o); return;
        }
        if (a.type === 'isir' && vampir && yasar){
          const h = a.hedef;
          if (!st.alive[h] || st.roles[h] === 'v' || st.left[h]) return;
          if (now < (st.cd[who] || 0)) return;
          if (op.limit && st.kills[who] >= op.limit) return;
          if (V.dist(benim, st.pos[h]) > V.ISIR_R + 35) return;
          st.alive[h] = false; st.kills[who]++; st.cd[who] = now + op.bekleme * 1000;
          st.bodies.push({ id: h, x: st.pos[h][0], y: st.pos[h][1] });
          st.pos[who] = st.pos[h].slice(); st.tp[who]++;
          sendTo(h, { t: 'tb-ev', id: o.sum.id, ev: { k: 'isirildin', by: st.color[who] } });
          sendEvent(o, { k: 'ses', s: 'isir', x: st.pos[h][0], y: st.pos[h][1] });
          kontrol(o); sendViews(o); pump(o); return;
        }
        if (a.type === 'bildir' && yasar){
          const b = yakindakiCeset(st, who); if (!b) return;
          toplantiBaslat(o, who, b.id); sendViews(o); pump(o); return;
        }
        if (a.type === 'acil' && yasar){
          if (!(st.acil[who] > 0) || now < st.acilHazir || st.sab.until) return;
          if (V.dist(benim, [V.CAN.x, V.CAN.y]) > V.KULLAN_R + 40) return;
          st.acil[who]--;
          toplantiBaslat(o, who, null); sendViews(o); pump(o); return;
        }
        if (a.type === 'sabotaj' && vampir && yasar && op.sabotaj){
          if (st.sab.until || now < st.sab.cd) return;
          st.sab.until = now + 45000; st.sab.cd = now + 90000; st.seq++;
          sendEvent(o, { k: 'ses', s: 'sabotaj' });
          sendViews(o); pump(o); return;
        }
        if (a.type === 'onar' && yasar && st.sab.until){
          if (V.dist(benim, [V.SALTER.x, V.SALTER.y]) > V.KULLAN_R + 40) return;
          st.sab.until = 0; st.seq++;
          sendEvent(o, { k: 'ses', s: 'onar', by: ad(st, who) });
          sendViews(o); pump(o); return;
        }
        if (a.type === 'mezar' && vampir && yasar){
          if (now < (st.ventCd[who] || 0)) return;
          const k = V.MEZARLAR.findIndex(m => V.dist(benim, [m.x, m.y]) <= V.MEZAR_R + 35); if (k < 0) return;
          const n = V.MEZARLAR[(k + 1) % V.MEZARLAR.length];
          st.pos[who] = [n.x, n.y]; st.tp[who]++; st.ventCd[who] = now + 2500;
          sendViews(o); return;
        }
      }
      if (a.type === 'oy' && st.phase === 'oylama' && yasar && st.meeting && !st.meeting.votes[who]){
        const h = a.hedef === 'pas' ? 'pas' : (st.alive[a.hedef] && !st.left[a.hedef] ? a.hedef : null);
        if (!h) return;
        st.meeting.votes[who] = h; st.seq++;
        if (canli(st).every(id => st.meeting.votes[id])) oylamaBitir(o);
        sendViews(o); pump(o); return;
      }
    },
    pump(o){
      const st = o.state, now = Date.now();
      if (!st) return;
      tikBaslat(o);
      if (st.phase === 'giris') later(o, Math.max(0, st.phaseEnds - now), () => { oyunaGec(o); sendViews(o); pump(o); });
      else if (st.phase === 'toplanti') later(o, Math.max(0, st.phaseEnds - now), () => { st.phase = 'oylama'; st.phaseEnds = Date.now() + o.sum.opts.oy * 1000; st.seq++; sendViews(o); pump(o); });
      else if (st.phase === 'oylama') later(o, Math.max(0, st.phaseEnds - now), () => { oylamaBitir(o); sendViews(o); pump(o); });
      else if (st.phase === 'kovma') later(o, Math.max(0, st.phaseEnds - now), () => { if (!kontrol(o)) oyunaGec(o); sendViews(o); pump(o); });
      else if (st.phase === 'oyun' && st.sab.until) later(o, Math.max(0, st.sab.until - now) + 50, () => { st.sab.until = 0; sendViews(o); pump(o); });
    },
    view(o, seat){
      const st = o.state, op = o.sum.opts, now = Date.now();
      const me_ = seat >= 0 && o.sum.seats[seat] ? o.sum.seats[seat].id : null;
      const oyuncu = me_ && st.order.includes(me_);
      const benYasar = oyuncu && st.alive[me_];
      const bitti = st.phase === 'bitti';
      const rolum = oyuncu ? st.roles[me_] : null;
      const herSeyi = bitti;
      const players = st.order.map(id => ({
        id, name: ad(st, id), c: st.color[id],
        olu: (herSeyi || !benYasar || st.known[id]) ? !st.alive[id] : false,
        left: !!st.left[id],
        vampir: (herSeyi || (rolum === 'v' && st.roles[id] === 'v')) ? st.roles[id] === 'v' : undefined,
        gorev: herSeyi ? st.tasks[id].filter(t => t.done).length + '/' + st.tasks[id].length : undefined,
        kurban: herSeyi && st.roles[id] === 'v' ? st.kills[id] : undefined
      }));
      const m = st.meeting;
      const meet = m ? {
        by: ad(st, m.by), byC: st.color[m.by], ceset: m.ceset ? ad(st, m.ceset) : '', cesetC: m.ceset ? st.color[m.ceset] : null, acil: m.acil,
        oyVerenler: Object.keys(m.votes), benimOy: me_ ? m.votes[me_] || null : null
      } : null;
      const v = {
        phase: st.phase, seq: st.seq, me: oyuncu ? me_ : null, rol: rolum, yasar: !!benYasar, owner: o.sum.owner,
        renk: oyuncu ? st.color[me_] : null, players, opts: op,
        tp: oyuncu ? { n: st.tp[me_] || 0, x: st.pos[me_][0], y: st.pos[me_][1] } : null,
        gorevler: oyuncu ? st.tasks[me_].map(t => ({ s: t.s, done: t.done })) : [],
        toplam: st.toplamGorev, biten: st.bitenGorev,
        bodies: st.bodies.map(b => ({ x: b.x, y: b.y, c: st.color[b.id] })),
        cdIn: rolum === 'v' ? Math.max(0, (st.cd[me_] || 0) - now) : 0,
        kurbanKaldi: rolum === 'v' ? (op.limit ? Math.max(0, op.limit - st.kills[me_]) : -1) : null,
        ventIn: rolum === 'v' ? Math.max(0, (st.ventCd[me_] || 0) - now) : 0,
        sab: st.sab.until ? Math.max(0, st.sab.until - now) : 0, sabCdIn: rolum === 'v' ? Math.max(0, st.sab.cd - now) : 0,
        acilKaldi: oyuncu ? st.acil[me_] : 0, acilIn: Math.max(0, st.acilHazir - now),
        kalanSure: st.endsAt ? Math.max(0, st.endsAt - now) : 0,
        phaseIn: st.phaseEnds ? Math.max(0, st.phaseEnds - now) : 0,
        meet, eject: st.eject ? Object.assign({}, st.eject, { c: st.eject.kim ? st.color[st.eject.kim] : null,
          oylar: st.eject.oylar ? Object.fromEntries(Object.entries(st.eject.oylar).map(([k, h]) => [k, h])) : {} }) : null,
        winner: st.winner,
        // ses kuralı için: kimin öldüğünü sadece ses yönlendirmesi kullanır (ekranda gösterilmez)
        sus: st.order.filter(id => !st.alive[id]),
        vampirler: rolum === 'v' || bitti ? st.order.filter(id => st.roles[id] === 'v') : []
      };
      return v;
    },
    render: (body, s, lv) => { if (typeof renderVampir === 'function') renderVampir(body, s, lv); },
    onEvent: (ev, s) => { if (typeof vampirEvent === 'function') vampirEvent(ev, s); },
    isMyTurn: () => false
  });
})();
