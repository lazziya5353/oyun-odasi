// Emlak Oyunu kuralları. DOM'a dokunmaz; bütün durum düz JSON'dur (ağdan geçer, Node'da test edilir).
// Klasik emlak-ticaret oyununun kuralları: 40 kare, satın alma, kira, ev/otel, ipotek, cezaevi, kartlar, takas, açık artırma.
// Fiyatlar ve kiralar klasik oyundaki değerlerin aynısıdır (₺ ile).
(function(root){
'use strict';

const GRP = {
  brown:  { n: 'Kahverengi',  c: '#8a5a3b', h: 50 },
  lblue:  { n: 'Açık mavi',   c: '#9bd7f2', h: 50 },
  pink:   { n: 'Pembe',       c: '#d9529a', h: 100 },
  orange: { n: 'Turuncu',     c: '#f2903a', h: 100 },
  red:    { n: 'Kırmızı',     c: '#d6372f', h: 150 },
  yellow: { n: 'Sarı',        c: '#f3d03e', h: 150 },
  green:  { n: 'Yeşil',       c: '#2f9e5b', h: 200 },
  dblue:  { n: 'Koyu mavi',   c: '#2a4fa6', h: 200 }
};
const P_ = (n, g, price, rent) => ({ n, k: 'p', g, price, rent, h: GRP[g].h });
const RAIL = n => ({ n, k: 'rail', price: 200 });
const UTIL = n => ({ n, k: 'util', price: 150 });
const TILES = [
  { n: 'Başla', k: 'go' },
  P_('Fatih', 'brown', 60, [2, 10, 30, 90, 160, 250]),
  { n: 'Kamu Fonu', k: 'chest' },
  P_('Üsküdar', 'brown', 60, [4, 20, 60, 180, 320, 450]),
  { n: 'Gelir Vergisi', k: 'tax', amt: 200 },
  RAIL('Haydarpaşa Garı'),
  P_('Kadıköy', 'lblue', 100, [6, 30, 90, 270, 400, 550]),
  { n: 'Şans', k: 'chance' },
  P_('Moda', 'lblue', 100, [6, 30, 90, 270, 400, 550]),
  P_('Caddebostan', 'lblue', 120, [8, 40, 100, 300, 450, 600]),
  { n: 'Cezaevi', k: 'jail' },
  P_('Beşiktaş', 'pink', 140, [10, 50, 150, 450, 625, 750]),
  UTIL('Elektrik İdaresi'),
  P_('Ortaköy', 'pink', 140, [10, 50, 150, 450, 625, 750]),
  P_('Bebek', 'pink', 160, [12, 60, 180, 500, 700, 900]),
  RAIL('Sirkeci Garı'),
  P_('Kızılay', 'orange', 180, [14, 70, 200, 550, 750, 950]),
  { n: 'Kamu Fonu', k: 'chest' },
  P_('Çankaya', 'orange', 180, [14, 70, 200, 550, 750, 950]),
  P_('Tunalı', 'orange', 200, [16, 80, 220, 600, 800, 1000]),
  { n: 'Bedava Park', k: 'park' },
  P_('Alsancak', 'red', 220, [18, 90, 250, 700, 875, 1050]),
  { n: 'Şans', k: 'chance' },
  P_('Karşıyaka', 'red', 220, [18, 90, 250, 700, 875, 1050]),
  P_('Bornova', 'red', 240, [20, 100, 300, 750, 925, 1100]),
  RAIL('Ankara Garı'),
  P_('Kordon', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
  P_('Konak', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
  UTIL('Su İdaresi'),
  P_('Çeşme', 'yellow', 280, [24, 120, 360, 850, 1025, 1200]),
  { n: 'Hapse Git', k: 'gojail' },
  P_('Bodrum', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
  P_('Marmaris', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
  { n: 'Kamu Fonu', k: 'chest' },
  P_('Fethiye', 'green', 320, [28, 150, 450, 1000, 1200, 1400]),
  RAIL('Basmane Garı'),
  { n: 'Şans', k: 'chance' },
  P_('Nişantaşı', 'dblue', 350, [35, 175, 500, 1100, 1300, 1500]),
  { n: 'Lüks Vergi', k: 'tax', amt: 100 },
  P_('Bağdat Caddesi', 'dblue', 400, [50, 200, 600, 1400, 1700, 2000])
];
const GROUPS = {};            // grup → [kare indeksleri]
TILES.forEach((t, i) => { if (t.g) (GROUPS[t.g] = GROUPS[t.g] || []).push(i); });
const RAILS = [5, 15, 25, 35], UTILS = [12, 28];
const OWNABLE = TILES.map((t, i) => (t.k === 'p' || t.k === 'rail' || t.k === 'util') ? i : -1).filter(i => i >= 0);
const JAIL = 10, GO_PAY = 200, JAIL_FINE = 50, MAX_H = 32, MAX_HOTEL = 12;

// kartlar: a = eylem türü
const CARDS = {
  sans: [
    { tx: 'Başlangıca ilerle. ₺200 al.', a: 'go', to: 0 },
    { tx: 'Bornova\'ya ilerle. Başlangıçtan geçersen ₺200 al.', a: 'go', to: 24 },
    { tx: 'Beşiktaş\'a ilerle. Başlangıçtan geçersen ₺200 al.', a: 'go', to: 11 },
    { tx: 'En yakın şirkete (Elektrik/Su) ilerle. Sahipsizse alabilirsin; sahibi varsa zarı at, zarın 10 katını öde.', a: 'util' },
    { tx: 'En yakın istasyona ilerle. Sahibi varsa normal kiranın 2 katını öde.', a: 'rail' },
    { tx: 'En yakın istasyona ilerle. Sahibi varsa normal kiranın 2 katını öde.', a: 'rail' },
    { tx: 'Banka sana ₺50 temettü ödüyor.', a: 'money', v: 50 },
    { tx: 'Cezadan Çık kartı. İstediğin zaman kullan ya da sakla.', a: 'jc' },
    { tx: '3 kare geri git.', a: 'back', v: 3 },
    { tx: 'Doğrudan Cezaevi\'ne git. Başlangıçtan geçme, ₺200 alma.', a: 'jail' },
    { tx: 'Evlerini onar: her ev için ₺25, her otel için ₺100 öde.', a: 'repair', h: 25, H: 100 },
    { tx: 'Hız cezası: ₺15 öde.', a: 'money', v: -15 },
    { tx: 'Haydarpaşa Garı\'na yolculuk. Başlangıçtan geçersen ₺200 al.', a: 'go', to: 5 },
    { tx: 'Bağdat Caddesi\'ne ilerle.', a: 'go', to: 39 },
    { tx: 'Belediye başkanı seçildin: her oyuncuya ₺50 öde.', a: 'each', v: -50 },
    { tx: 'Bina kredin vadesi geldi: ₺150 al.', a: 'money', v: 150 }
  ],
  kamu: [
    { tx: 'Başlangıca ilerle. ₺200 al.', a: 'go', to: 0 },
    { tx: 'Banka hatası senin lehine: ₺200 al.', a: 'money', v: 200 },
    { tx: 'Doktor ücreti: ₺50 öde.', a: 'money', v: -50 },
    { tx: 'Hisse senedi sattın: ₺50 al.', a: 'money', v: 50 },
    { tx: 'Cezadan Çık kartı. İstediğin zaman kullan ya da sakla.', a: 'jc' },
    { tx: 'Doğrudan Cezaevi\'ne git. Başlangıçtan geçme, ₺200 alma.', a: 'jail' },
    { tx: 'Tatil fonu vadesi geldi: ₺100 al.', a: 'money', v: 100 },
    { tx: 'Gelir vergisi iadesi: ₺20 al.', a: 'money', v: 20 },
    { tx: 'Doğum günün! Her oyuncudan ₺10 al.', a: 'each', v: 10 },
    { tx: 'Hayat sigortası vadesi geldi: ₺100 al.', a: 'money', v: 100 },
    { tx: 'Hastane masrafı: ₺100 öde.', a: 'money', v: -100 },
    { tx: 'Okul harcı: ₺50 öde.', a: 'money', v: -50 },
    { tx: 'Danışmanlık ücreti: ₺25 al.', a: 'money', v: 25 },
    { tx: 'Sokak onarımı: her ev için ₺40, her otel için ₺115 öde.', a: 'repair', h: 40, H: 115 },
    { tx: 'Güzellik yarışmasında ikinci oldun: ₺10 al.', a: 'money', v: 10 },
    { tx: 'Miras kaldı: ₺100 al.', a: 'money', v: 100 }
  ]
};

// ---------- yardımcılar ----------
function rnd(s){
  s.rs = (s.rs + 0x6D2B79F5) | 0;
  let t = Math.imul(s.rs ^ (s.rs >>> 15), 1 | s.rs);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffle(s, a){ for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd(s) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const no = err => ({ ok: false, err });
const OK = { ok: true };
function lg(s, tx){ s.log.push({ id: ++s.lid, tx }); if (s.log.length > 60) s.log.shift(); }
function ev(s, e){ s.ev.push(e); }
const money = n => '₺' + n;
function alive(s){ const r = []; for (let i = 0; i < 6; i++) if (s.P[i].on && !s.P[i].bk) r.push(i); return r; }
function nextAlive(s, from){ for (let k = 1; k <= 6; k++){ const i = (from + k) % 6; if (s.P[i].on && !s.P[i].bk) return i; } return from; }
const own = (s, seat) => OWNABLE.filter(i => s.pr[i].o === seat);
function lvl(s, i){ return s.pr[i].h; }
function groupOf(i){ return TILES[i].g ? GROUPS[TILES[i].g] : null; }
function countOwned(s, seat, list){ return list.filter(i => s.pr[i].o === seat).length; }

function netWorth(s, seat){
  let w = s.P[seat].m;
  own(s, seat).forEach(i => {
    const t = TILES[i], p = s.pr[i];
    w += p.mo ? t.price / 2 : t.price;
    if (p.h) w += p.h * (t.h || 0);
  });
  return w;
}

// ---------- yeni oyun ----------
// opts: { mode: 'klasik' | 'kisa', cash }, active: 6'lık boolean listesi
function newGame(opts, active, seed){
  opts = opts || {};
  const s = {
    v: 1, opts: { mode: opts.mode === 'kisa' ? 'kisa' : 'klasik', cash: [1000, 1500, 2000].includes(+opts.cash) ? +opts.cash : 1500 },
    rs: (seed === undefined ? (Math.random() * 4294967296) : seed) | 0,
    gameNo: opts.gameNo || 1,
    P: [], pr: [], bank: { h: MAX_H, H: MAX_HOTEL }, names: [],
    turn: 0, n: 0, phase: 'roll', d: [0, 0], dbl: 0, again: false,
    debt: null, au: null, tr: null, dk: { sans: [], kamu: [] },
    log: [], lid: 0, ev: [], eid: 0, ms: 0, win: -1, winWhy: '', last: null
  };
  for (let i = 0; i < 6; i++) s.P.push({ on: !!(active && active[i]), m: s.opts.cash, pos: 0, j: 0, jcs: [], bk: false });
  for (let i = 0; i < 40; i++) s.pr.push({ o: -1, h: 0, mo: 0 });
  s.dk.sans = shuffle(s, [...Array(16).keys()]);
  s.dk.kamu = shuffle(s, [...Array(16).keys()]);
  const act = alive(s);
  s.turn = act[Math.floor(rnd(s) * act.length)];
  const deals = [];
  if (s.opts.mode === 'kisa'){
    const pool = shuffle(s, OWNABLE.slice());
    for (let r = 0; r < 2; r++) act.forEach(p => { const i = pool.pop(); s.pr[i].o = p; deals.push([p, i]); });
  }
  ev(s, { t: 'start', deals });
  lg(s, 'Oyun başladı. Kura ile @' + s.turn + ' başlıyor.');
  if (deals.length) lg(s, 'Kısa oyun: herkese 2 tapu dağıtıldı.');
  s.ms = 1800 + deals.length * 260;
  s.eid = 1;
  return s;
}

// ---------- para ----------
function transfer(s, f, to, amt){
  if (amt <= 0) return;
  if (f >= 0) s.P[f].m -= amt;
  if (to >= 0) s.P[to].m += amt;
  ev(s, { t: 'pay', f, to, a: amt });
  s.ms += 650;
}
// seat, amt kadar borçlanır (to: -1 banka). Parası yetmezse borç aşamasına geçilir; true = ödendi
function owe(s, seat, amt, to, why, then){
  if (s.P[seat].m >= amt){ transfer(s, seat, to, amt); return true; }
  s.debt = { f: seat, to, a: amt, why: why || '', then: then || null };
  s.phase = 'debt';
  lg(s, '@' + seat + ' ' + money(amt) + ' borçlandı ama nakdi yetmiyor (ipotek/satış gerekli).');
  return false;
}
function checkDebt(s){
  if (s.phase !== 'debt' || !s.debt) return;
  if (s.P[s.debt.f].m >= s.debt.a){
    const d = s.debt; s.debt = null;
    if (d.to === -2) alive(s).filter(x => x !== d.f).forEach(o => transfer(s, d.f, o, d.per));
    else transfer(s, d.f, d.to, d.a);
    lg(s, '@' + d.f + ' borcunu ödedi (' + money(d.a) + ').');
    s.phase = 'move';
    resume(s, d);
  }
}
function resume(s, d){
  if (d && d.then && d.then.t === 'move'){ moveBy(s, s.turn, d.then.n); return; }
  if (s.phase === 'move') settle(s);
}

// ---------- tur akışı ----------
function settle(s){
  const p = s.P[s.turn];
  if (p.bk){ nextTurn(s); return; }
  s.phase = (s.again && !p.j) ? 'roll' : 'end';
}
function nextTurn(s){
  if (checkEnd(s)) return;
  s.turn = nextAlive(s, s.turn);
  s.dbl = 0; s.again = false; s.phase = 'roll'; s.n++;
  s.au = null;
}
function checkEnd(s){
  const a = alive(s);
  if (a.length <= 1){
    s.phase = 'over'; s.win = a.length ? a[0] : -1; s.winWhy = 'Son ayakta kalan';
    ev(s, { t: 'win', s: s.win });
    if (s.win >= 0) lg(s, '🏆 @' + s.win + ' kazandı! Herkesi iflas ettirdi.');
    return true;
  }
  return false;
}
function endByBankruptcy(s){
  // kısa oyun: ilk iflasta en zengin kazanır
  const a = alive(s).sort((x, y) => netWorth(s, y) - netWorth(s, x));
  s.phase = 'over'; s.win = a[0]; s.winWhy = 'İlk iflastan sonra en zengin';
  ev(s, { t: 'win', s: s.win });
  lg(s, '🏆 Kısa oyun bitti: @' + s.win + ' en zengin oyuncu (' + money(netWorth(s, s.win)) + ') ve kazandı!');
}

function rollDice(s){
  const a = 1 + Math.floor(rnd(s) * 6), b = 1 + Math.floor(rnd(s) * 6);
  s.d = [a, b];
  return a + b;
}

function aRoll(s, seat){
  if (s.phase !== 'roll') return no('Şu an zar atamazsın');
  if (seat !== s.turn) return no('Sıra sende değil');
  const P = s.P[seat];
  const tot = rollDice(s), dbl = s.d[0] === s.d[1];
  ev(s, { t: 'dice', s: seat, d: s.d.slice() });
  s.ms += 1250;
  s.phase = 'move';
  if (P.j){
    if (dbl){
      lg(s, '@' + seat + ' çift attı (' + s.d[0] + '+' + s.d[1] + ') ve cezaevinden çıktı.');
      P.j = 0; s.again = false; s.dbl = 0;
      ev(s, { t: 'free', s: seat });
      moveBy(s, seat, tot);
    } else if (P.j >= 3){
      lg(s, '@' + seat + ' üçüncü denemede de çift atamadı, ₺' + JAIL_FINE + ' ceza ödeyip çıkıyor.');
      P.j = 0; s.again = false;
      ev(s, { t: 'free', s: seat });
      if (owe(s, seat, JAIL_FINE, -1, 'Cezaevi cezası', { t: 'move', n: tot })) moveBy(s, seat, tot);
    } else {
      P.j++;
      lg(s, '@' + seat + ' ' + s.d[0] + '+' + s.d[1] + ' attı, çift gelmedi. Cezaevinde kalıyor.');
      s.again = false; settle(s);
    }
    return OK;
  }
  if (dbl){
    s.dbl++;
    if (s.dbl >= 3){
      lg(s, '@' + seat + ' üst üste 3 kez çift attı, cezaevine gidiyor!');
      sendJail(s, seat); settle(s); return OK;
    }
    s.again = true;
  } else s.again = false;
  lg(s, '@' + seat + ' ' + s.d[0] + ' + ' + s.d[1] + ' = ' + tot + ' attı' + (dbl ? ' (çift!)' : '') + '.');
  moveBy(s, seat, tot);
  return OK;
}

function sendJail(s, seat){
  const P = s.P[seat];
  ev(s, { t: 'move', s: seat, f: P.pos, to: JAIL, fw: 0, jail: true });
  P.pos = JAIL; P.j = 1; s.again = false;
  ev(s, { t: 'jail', s: seat });
  s.ms += 900;
}

function moveBy(s, seat, n){
  const P = s.P[seat], from = P.pos, raw = from + n;
  const to = ((raw % 40) + 40) % 40;
  const passed = n > 0 && raw >= 40;
  ev(s, { t: 'move', s: seat, f: from, to, fw: n, go: passed });
  s.ms += 220 + Math.abs(n) * 175;
  P.pos = to;
  if (passed){ transfer(s, -1, seat, GO_PAY); lg(s, '@' + seat + ' Başla\'dan geçti, ' + money(GO_PAY) + ' aldı.'); }
  land(s, seat);
}
// kira
function rentOf(s, i, mult){
  const t = TILES[i], p = s.pr[i];
  if (p.o < 0 || p.mo) return 0;
  if (t.k === 'p'){
    if (p.h > 0) return t.rent[p.h];
    const g = GROUPS[t.g];
    return countOwned(s, p.o, g) === g.length ? t.rent[0] * 2 : t.rent[0];
  }
  if (t.k === 'rail'){
    const n = countOwned(s, p.o, RAILS);
    return 25 * Math.pow(2, n - 1) * (mult && mult.rail ? 2 : 1);
  }
  if (t.k === 'util'){
    const n = countOwned(s, p.o, UTILS);
    const m = mult && mult.util ? 10 : (n >= 2 ? 10 : 4);
    return m * (s.d[0] + s.d[1]);
  }
  return 0;
}

function land(s, seat, mult){
  const P = s.P[seat], i = P.pos, T = TILES[i];
  s.last = { s: seat, i };
  if (T.k === 'p' || T.k === 'rail' || T.k === 'util'){
    const pr = s.pr[i];
    if (pr.o < 0){ s.phase = 'buy'; lg(s, '@' + seat + ' ' + T.n + ' karesine geldi (' + money(T.price) + ', sahibi yok).'); return; }
    if (pr.o === seat){ lg(s, '@' + seat + ' kendi mülkü ' + T.n + '\'ye geldi.'); settle(s); return; }
    if (pr.mo){ lg(s, '@' + seat + ' ' + T.n + '\'ye geldi, mülk ipotekli: kira yok.'); settle(s); return; }
    if (mult && mult.util){ rollDice(s); ev(s, { t: 'dice', s: seat, d: s.d.slice() }); s.ms += 1250; }
    const r = rentOf(s, i, mult);
    lg(s, '@' + seat + ' ' + T.n + '\'ye geldi ve @' + pr.o + '\'a ' + money(r) + ' kira ödüyor.');
    if (owe(s, seat, r, pr.o, 'Kira')) settle(s);
    return;
  }
  if (T.k === 'tax'){
    lg(s, '@' + seat + ' ' + T.n + ' ödüyor: ' + money(T.amt) + '.');
    if (owe(s, seat, T.amt, -1, T.n)) settle(s);
    return;
  }
  if (T.k === 'gojail'){ lg(s, '@' + seat + ' "Hapse Git" karesine geldi!'); sendJail(s, seat); settle(s); return; }
  if (T.k === 'chance' || T.k === 'chest'){ drawCard(s, seat, T.k === 'chance' ? 'sans' : 'kamu'); return; }
  if (T.k === 'park') lg(s, '@' + seat + ' Bedava Park\'ta dinleniyor.');
  settle(s);
}

function drawCard(s, seat, deck){
  const id = s.dk[deck].shift();
  const c = CARDS[deck][id];
  ev(s, { t: 'card', s: seat, deck, id, tx: c.tx });
  s.ms += 2300;
  lg(s, '@' + seat + ' ' + (deck === 'sans' ? 'Şans' : 'Kamu Fonu') + ' kartı çekti: ' + c.tx);
  if (c.a === 'jc'){ s.P[seat].jcs.push(deck + ':' + id); }
  else s.dk[deck].push(id);
  const P = s.P[seat];
  switch (c.a){
    case 'go': moveTo(s, seat, c.to, true); return;
    case 'rail': {
      const nx = RAILS.find(x => x > P.pos) || RAILS[0];
      moveTo(s, seat, nx, true, { rail: true }); return;
    }
    case 'util': {
      const nx = UTILS.find(x => x > P.pos) || UTILS[0];
      moveTo(s, seat, nx, true, { util: true }); return;
    }
    case 'back': {
      const to = (P.pos - c.v + 40) % 40;
      ev(s, { t: 'move', s: seat, f: P.pos, to, fw: -c.v });
      s.ms += 220 + c.v * 175;
      P.pos = to; land(s, seat); return;
    }
    case 'jail': sendJail(s, seat); settle(s); return;
    case 'jc': settle(s); return;
    case 'money':
      if (c.v >= 0){ transfer(s, -1, seat, c.v); settle(s); }
      else if (owe(s, seat, -c.v, -1, 'Kart')) settle(s);
      return;
    case 'repair': {
      let h = 0, H = 0;
      own(s, seat).forEach(i => { const l = s.pr[i].h; if (l === 5) H++; else h += l; });
      const tot = h * c.h + H * c.H;
      if (!tot){ lg(s, '@' + seat + '\'in evi/oteli yok, ödeme yok.'); settle(s); return; }
      if (owe(s, seat, tot, -1, 'Onarım')) settle(s);
      return;
    }
    case 'each': {
      const others = alive(s).filter(x => x !== seat);
      if (c.v > 0){
        others.forEach(o => { const a = Math.min(c.v, s.P[o].m); transfer(s, o, seat, a); });
        settle(s);
      } else {
        const tot = -c.v * others.length;
        if (s.P[seat].m >= tot){ others.forEach(o => transfer(s, seat, o, -c.v)); settle(s); }
        else {
          // borç: tamamı bankaya değil oyunculara; basit tutmak için toplam tutar önce bankada toplanır ve eşit paylaştırılır
          s.debt = { f: seat, to: -2, a: tot, per: -c.v, why: 'Kart', then: null };
          s.phase = 'debt';
          lg(s, '@' + seat + ' ' + money(tot) + ' borçlandı ama nakdi yetmiyor.');
        }
      }
      return;
    }
  }
  settle(s);
}
function moveTo(s, seat, idx, collect, mult){
  const P = s.P[seat], from = P.pos;
  const steps = (idx - from + 40) % 40;
  ev(s, { t: 'move', s: seat, f: from, to: idx, fw: steps, go: collect && idx < from });
  s.ms += 220 + steps * 175;
  P.pos = idx;
  if (collect && idx < from){ transfer(s, -1, seat, GO_PAY); lg(s, '@' + seat + ' Başla\'dan geçti, ' + money(GO_PAY) + ' aldı.'); }
  land(s, seat, mult);
}

// ---------- satın alma ----------
function aBuy(s, seat){
  if (s.phase !== 'buy' || seat !== s.turn) return no('Şu an satın alamazsın');
  const i = s.P[seat].pos, T = TILES[i];
  if (s.P[seat].m < T.price) return no('Yeterli paran yok');
  transfer(s, seat, -1, T.price);
  s.pr[i].o = seat;
  ev(s, { t: 'buy', s: seat, i });
  lg(s, '@' + seat + ' ' + T.n + ' mülkünü ' + money(T.price) + ' karşılığında satın aldı.');
  settle(s);
  return OK;
}
function aAuctionStart(s, seat){
  if (s.phase !== 'buy' || seat !== s.turn) return no('Şu an açık artırma başlatamazsın');
  const i = s.P[seat].pos;
  s.au = { i, bid: 0, who: -1, cur: -1, out: [], min: 10 };
  s.phase = 'auction';
  lg(s, '🔨 ' + TILES[i].n + ' için açık artırma başladı.');
  ev(s, { t: 'auction', i });
  s.au.cur = nextAlive(s, seat);
  // başlayan, tekrar sıraya girer; sıra: seat'ten sonraki
  auctionAdvance(s, true);
  return OK;
}
// sıradaki teklif verecek oyuncuyu bul; kimse kalmadıysa bitir
function auctionAdvance(s, first){
  const au = s.au;
  const elig = alive(s).filter(p => !au.out.includes(p) && (p === au.who ? false : s.P[p].m > au.bid));
  alive(s).forEach(p => { if (!au.out.includes(p) && p !== au.who && s.P[p].m <= au.bid) au.out.push(p); });
  const remaining = alive(s).filter(p => !au.out.includes(p));
  if (au.who >= 0 && remaining.length <= 1){ auctionEnd(s); return; }
  if (au.who < 0 && remaining.length === 0){ auctionEnd(s); return; }
  void elig;
  // sıradaki: cur'dan başla (first ise cur zaten ilk kişi), out olmayan ve yüksek teklifçi olmayan
  let c = au.cur;
  if (!first || au.out.includes(c) || c === au.who){
    for (let k = 1; k <= 6; k++){ const x = (c + k) % 6; if (s.P[x].on && !s.P[x].bk && !au.out.includes(x) && x !== au.who){ c = x; break; } }
  }
  au.cur = c;
}
function auctionEnd(s){
  const au = s.au, T = TILES[au.i];
  if (au.who >= 0){
    transfer(s, au.who, -1, au.bid);
    s.pr[au.i].o = au.who;
    ev(s, { t: 'buy', s: au.who, i: au.i });
    lg(s, '🔨 ' + T.n + ' mülkü ' + money(au.bid) + ' ile @' + au.who + '\'ye satıldı.');
  } else lg(s, '🔨 ' + T.n + ' için teklif çıkmadı, mülk bankada kaldı.');
  s.au = null;
  s.phase = 'move';
  settle(s);
}
function aBid(s, seat, a){
  if (s.phase !== 'auction' || !s.au) return no('Açık artırma yok');
  if (seat !== s.au.cur) return no('Teklif sırası sende değil');
  const amt = Math.floor(+a.amt);
  if (!(amt > s.au.bid)) return no('Teklifin mevcut tekliften yüksek olmalı');
  if (amt > s.P[seat].m) return no('Nakdin bu teklife yetmiyor');
  s.au.bid = amt; s.au.who = seat;
  lg(s, '@' + seat + ' ' + money(amt) + ' teklif etti.');
  ev(s, { t: 'bid', s: seat, a: amt });
  s.ms += 500;
  auctionAdvance(s, false);
  return OK;
}
function aPass(s, seat){
  if (s.phase !== 'auction' || !s.au) return no('Açık artırma yok');
  if (seat !== s.au.cur) return no('Teklif sırası sende değil');
  s.au.out.push(seat);
  lg(s, '@' + seat + ' pas geçti.');
  s.ms += 300;
  auctionAdvance(s, false);
  return OK;
}

// ---------- cezaevi ----------
function aPayJail(s, seat){
  if (s.phase !== 'roll' || seat !== s.turn || !s.P[seat].j) return no('Cezaevinde değilsin');
  if (s.P[seat].m < JAIL_FINE) return no('₺' + JAIL_FINE + ' paran yok');
  transfer(s, seat, -1, JAIL_FINE);
  s.P[seat].j = 0;
  ev(s, { t: 'free', s: seat });
  lg(s, '@' + seat + ' ₺' + JAIL_FINE + ' ödeyip cezaevinden çıktı.');
  return OK;
}
function aUseCard(s, seat){
  const P = s.P[seat];
  if (s.phase !== 'roll' || seat !== s.turn || !P.j || !P.jcs.length) return no('Kullanabileceğin kart yok');
  const c = P.jcs.shift(); const [deck, id] = c.split(':');
  s.dk[deck].push(+id);
  P.j = 0;
  ev(s, { t: 'free', s: seat });
  lg(s, '@' + seat + ' "Cezadan Çık" kartını kullandı.');
  return OK;
}

// ---------- ev / otel / ipotek ----------
function needSet(s, g){ const n = GROUPS[g].length; return s.opts.mode === 'kisa' && n === 3 ? 2 : n; }
function canBuild(s, seat, i){
  const T = TILES[i], p = s.pr[i];
  if (T.k !== 'p' || p.o !== seat) return 'Bu mülk senin değil';
  const g = GROUPS[T.g];
  if (countOwned(s, seat, g) < needSet(s, T.g)) return 'Önce renk setini tamamlamalısın';
  if (g.some(x => s.pr[x].o === seat && s.pr[x].mo)) return 'Setteki ipotekli mülk var';
  if (p.h >= 5) return 'Zaten otel var';
  const mine = g.filter(x => s.pr[x].o === seat);
  const min = Math.min(...mine.map(x => s.pr[x].h));
  if (p.h > min) return 'Önce setteki diğer mülklere de ev yap (eşit yapılaşma)';
  if (p.h === 4 ? s.bank.H < 1 : s.bank.h < 1) return p.h === 4 ? 'Bankada otel kalmadı' : 'Bankada ev kalmadı';
  if (s.P[seat].m < T.h) return 'Paran yetmiyor (' + money(T.h) + ')';
  return '';
}
function canSell(s, seat, i){
  const T = TILES[i], p = s.pr[i];
  if (T.k !== 'p' || p.o !== seat || p.h < 1) return 'Satılacak ev yok';
  const g = GROUPS[T.g];
  const mine = g.filter(x => s.pr[x].o === seat);
  const max = Math.max(...mine.map(x => s.pr[x].h));
  if (p.h < max) return 'Önce en çok evi olan mülkten sat (eşit yapılaşma)';
  if (p.h === 5 && s.bank.h < 4) return 'Bankada 4 ev yok, oteli satamazsın';
  return '';
}
function canMortgage(s, seat, i){
  const T = TILES[i], p = s.pr[i];
  if (!T.price || p.o !== seat) return 'Bu mülk senin değil';
  if (p.mo) return 'Zaten ipotekli';
  if (T.g && GROUPS[T.g].some(x => s.pr[x].o === seat && s.pr[x].h > 0)) return 'Setteki evleri önce sat';
  return '';
}
function unmortgageCost(i){ return Math.ceil(TILES[i].price / 2 * 1.1); }
function canUnmortgage(s, seat, i){
  const T = TILES[i], p = s.pr[i];
  if (!T.price || p.o !== seat || !p.mo) return 'İpotekli değil';
  if (s.P[seat].m < unmortgageCost(i)) return 'Paran yetmiyor (' + money(unmortgageCost(i)) + ')';
  return '';
}
function mgmtOk(s, seat){
  if (seat !== s.turn) return 'Sıra sende değil';
  if (!['roll', 'end', 'debt'].includes(s.phase)) return 'Şu an yapılamaz';
  return '';
}
function aBuild(s, seat, a){
  const e = mgmtOk(s, seat) || (s.phase === 'debt' ? 'Borç varken ev yapamazsın' : '') || canBuild(s, seat, +a.i);
  if (e) return no(e);
  const i = +a.i, T = TILES[i], p = s.pr[i];
  transfer(s, seat, -1, T.h);
  if (p.h === 4){ s.bank.h += 4; s.bank.H--; } else s.bank.h--;
  p.h++;
  ev(s, { t: 'build', s: seat, i, lv: p.h });
  lg(s, '@' + seat + ' ' + T.n + '\'ye ' + (p.h === 5 ? 'OTEL' : p.h + '. evi') + ' yaptı (' + money(T.h) + ').');
  return OK;
}
function aSell(s, seat, a){
  const e = mgmtOk(s, seat) || canSell(s, seat, +a.i);
  if (e) return no(e);
  const i = +a.i, T = TILES[i], p = s.pr[i];
  if (p.h === 5){ s.bank.H++; s.bank.h -= 4; } else s.bank.h++;
  p.h--;
  transfer(s, -1, seat, T.h / 2);
  ev(s, { t: 'build', s: seat, i, lv: p.h });
  lg(s, '@' + seat + ' ' + T.n + '\'den bir yapı sattı (' + money(T.h / 2) + ').');
  checkDebt(s);
  return OK;
}
function aMortgage(s, seat, a){
  const e = mgmtOk(s, seat) || canMortgage(s, seat, +a.i);
  if (e) return no(e);
  const i = +a.i, T = TILES[i];
  s.pr[i].mo = 1;
  transfer(s, -1, seat, T.price / 2);
  ev(s, { t: 'mort', s: seat, i, on: 1 });
  lg(s, '@' + seat + ' ' + T.n + ' mülkünü ipotek etti (+' + money(T.price / 2) + ').');
  checkDebt(s);
  return OK;
}
function aUnmortgage(s, seat, a){
  const e = mgmtOk(s, seat) || (s.phase === 'debt' ? 'Borç varken ipotek kaldıramazsın' : '') || canUnmortgage(s, seat, +a.i);
  if (e) return no(e);
  const i = +a.i;
  transfer(s, seat, -1, unmortgageCost(i));
  s.pr[i].mo = 0;
  ev(s, { t: 'mort', s: seat, i, on: 0 });
  lg(s, '@' + seat + ' ' + TILES[i].n + ' ipoteğini kaldırdı (' + money(unmortgageCost(i)) + ').');
  return OK;
}
function aEnd(s, seat){
  if (s.phase !== 'end' || seat !== s.turn) return no('Turu şimdi bitiremezsin');
  lg(s, '@' + seat + ' turunu bitirdi.');
  nextTurn(s);
  return OK;
}
function aPayDebt(s, seat){
  if (s.phase !== 'debt' || seat !== s.turn || !s.debt) return no('Borç yok');
  if (s.P[seat].m < s.debt.a) return no('Nakdin borca yetmiyor; mülk sat/ipotek et');
  checkDebt(s);
  return OK;
}
function aBankrupt(s, seat){
  if (s.phase !== 'debt' || seat !== s.turn || !s.debt) return no('İflas etmek için borçlu olmalısın');
  const d = s.debt;
  goBankrupt(s, seat, d.to >= 0 ? d.to : -1);
  return OK;
}
function goBankrupt(s, seat, cred){
  const P = s.P[seat];
  lg(s, '💥 @' + seat + ' iflas etti' + (cred >= 0 ? '; varlıkları @' + cred + '\'e geçti.' : '; mülkleri bankaya döndü.'));
  ev(s, { t: 'bankrupt', s: seat, to: cred });
  s.ms += 1500;
  own(s, seat).forEach(i => {
    const p = s.pr[i];
    if (p.h === 5){ s.bank.H++; } else s.bank.h += p.h;
    p.h = 0;
    if (cred >= 0){
      p.o = cred;
      if (p.mo){ const fee = Math.min(s.P[cred].m, Math.ceil(TILES[i].price / 20)); if (fee > 0) transfer(s, cred, -1, fee); }
    } else { p.o = -1; p.mo = 0; }
  });
  if (cred >= 0){ transfer(s, seat, cred, P.m); s.P[cred].jcs.push(...P.jcs); }
  else { P.jcs.forEach(c => { const [d, id] = c.split(':'); s.dk[d].push(+id); }); }
  P.m = 0; P.jcs = []; P.bk = true; P.j = 0;
  s.debt = null; s.tr = null; s.au = null;
  if (s.opts.mode === 'kisa' && alive(s).length >= 1){ endByBankruptcy(s); return; }
  if (checkEnd(s)) return;
  nextTurn(s);
}

// ---------- takas ----------
function cleanList(a){ return Array.isArray(a) ? [...new Set(a.map(Number).filter(i => OWNABLE.includes(i)))] : []; }
function tradeCheck(s, t){
  const A = s.P[t.f], B = s.P[t.to];
  if (!A || !B || A.bk || B.bk || !A.on || !B.on || t.f === t.to) return 'Geçersiz oyuncular';
  if (t.gc < 0 || t.wc < 0) return 'Geçersiz tutar';
  if (A.m < t.gc) return 'Teklif edenin nakdi yetmiyor';
  if (B.m < t.wc) return 'Karşı tarafın nakdi yetmiyor';
  if (A.jcs.length < t.gj || B.jcs.length < t.wj) return 'Cezadan Çık kartı eksik';
  for (const i of t.gp) if (s.pr[i].o !== t.f) return TILES[i].n + ' artık teklif edenin değil';
  for (const i of t.wp) if (s.pr[i].o !== t.to) return TILES[i].n + ' artık karşı tarafın değil';
  for (const i of t.gp.concat(t.wp)){
    const g = groupOf(i);
    if (g && g.some(x => s.pr[x].h > 0)) return TILES[i].n + ' setinde ev/otel var; önce yapıları sat';
  }
  if (!t.gc && !t.wc && !t.gp.length && !t.wp.length && !t.gj && !t.wj) return 'Boş teklif';
  return '';
}
function aTrade(s, seat, a){
  if (!['roll', 'end', 'buy'].includes(s.phase) && s.phase !== 'debt') return no('Şu an takas yapılamaz');
  if (s.tr && s.tr.f !== seat) return no('Başka bir takas teklifi bekliyor');
  const t = {
    f: seat, to: +a.to, gc: Math.max(0, Math.floor(+a.gc || 0)), wc: Math.max(0, Math.floor(+a.wc || 0)),
    gp: cleanList(a.gp), wp: cleanList(a.wp), gj: Math.max(0, Math.min(2, Math.floor(+a.gj || 0))), wj: Math.max(0, Math.min(2, Math.floor(+a.wj || 0)))
  };
  const e = tradeCheck(s, t);
  if (e) return no(e);
  s.tr = t;
  lg(s, '🤝 @' + seat + ', @' + t.to + '\'e takas teklif etti.');
  ev(s, { t: 'trade', f: seat, to: t.to });
  return OK;
}
function aTradeAccept(s, seat){
  const t = s.tr;
  if (!t || t.to !== seat) return no('Sana gelen takas yok');
  const e = tradeCheck(s, t);
  if (e){ s.tr = null; return no('Takas geçersiz oldu: ' + e); }
  if (t.gc) transfer(s, t.f, t.to, t.gc);
  if (t.wc) transfer(s, t.to, t.f, t.wc);
  t.gp.forEach(i => { s.pr[i].o = t.to; });
  t.wp.forEach(i => { s.pr[i].o = t.f; });
  for (let k = 0; k < t.gj; k++) s.P[t.to].jcs.push(s.P[t.f].jcs.shift());
  for (let k = 0; k < t.wj; k++) s.P[t.f].jcs.push(s.P[t.to].jcs.shift());
  s.tr = null;
  lg(s, '🤝 @' + t.f + ' ile @' + t.to + ' takas yaptı.');
  ev(s, { t: 'traded', f: t.f, to: t.to, gp: t.gp, wp: t.wp });
  s.ms += 900;
  checkDebt(s);
  return OK;
}
function aTradeNo(s, seat){
  const t = s.tr;
  if (!t || (t.to !== seat && t.f !== seat)) return no('Takas yok');
  lg(s, t.f === seat ? '@' + seat + ' takas teklifini geri çekti.' : '@' + seat + ' takas teklifini reddetti.');
  s.tr = null;
  return OK;
}

// ---------- ana giriş ----------
function act(s, seat, a){
  if (!a || typeof a.type !== 'string') return no('Geçersiz hamle');
  if (s.phase === 'over') return no('Oyun bitti');
  if (seat < 0 || seat > 5 || !s.P[seat].on || s.P[seat].bk) return no('Oyunda değilsin');
  s.ev = []; s.ms = 0;
  let r;
  switch (a.type){
    case 'roll': r = aRoll(s, seat); break;
    case 'buy': r = aBuy(s, seat); break;
    case 'auction': r = aAuctionStart(s, seat); break;
    case 'bid': r = aBid(s, seat, a); break;
    case 'pass': r = aPass(s, seat); break;
    case 'payjail': r = aPayJail(s, seat); break;
    case 'usecard': r = aUseCard(s, seat); break;
    case 'build': r = aBuild(s, seat, a); break;
    case 'sell': r = aSell(s, seat, a); break;
    case 'mortgage': r = aMortgage(s, seat, a); break;
    case 'unmortgage': r = aUnmortgage(s, seat, a); break;
    case 'end': r = aEnd(s, seat); break;
    case 'paydebt': r = aPayDebt(s, seat); break;
    case 'bankrupt': r = aBankrupt(s, seat); break;
    case 'trade': r = aTrade(s, seat, a); break;
    case 'tradeyes': r = aTradeAccept(s, seat); break;
    case 'tradeno': r = aTradeNo(s, seat); break;
    default: r = no('Bilinmeyen hamle');
  }
  if (r.ok && s.ev.length){ s.eid++; }
  return r;
}
// şu an hamle yapması beklenen oyuncu (zaman aşımı ve bot için)
function actor(s){
  if (s.phase === 'over') return -1;
  if (s.phase === 'auction' && s.au) return s.au.cur;
  return s.turn;
}

// ---------- bot ----------
function setVal(s, seat, i){
  // i mülkünü almak o oyuncu için ne kadar değerli (fiyata çarpan)
  const T = TILES[i];
  let m = 1;
  if (T.k === 'rail') m = 1 + 0.25 * countOwned(s, seat, RAILS);
  else if (T.k === 'util') m = 0.9 + 0.15 * countOwned(s, seat, UTILS);
  else {
    const g = GROUPS[T.g], mine = countOwned(s, seat, g);
    const others = g.filter(x => s.pr[x].o >= 0 && s.pr[x].o !== seat).length;
    m = 1 + 0.3 * mine - (others ? 0.25 : 0);
    if (mine + 1 === g.length) m += 0.5;
    if (others && mine === 0 && g.length === 2) m -= 0.1;
  }
  return Math.round(T.price * m);
}
function botAction(s, seat){
  const P = s.P[seat];
  if (s.phase === 'over' || P.bk) return null;
  // bekleyen takas bana mı?
  if (s.tr && s.tr.to === seat){
    const t = s.tr;
    const e = tradeCheck(s, t);
    if (e) return { type: 'tradeno' };
    let got = t.gc + 20 * t.gj, give = t.wc + 20 * t.wj;
    t.gp.forEach(i => { got += setVal(s, seat, i) * 1.1; });
    t.wp.forEach(i => {
      const g = groupOf(i);
      let v = TILES[i].price;
      if (g && countOwned(s, seat, g) >= g.length - 1) v *= 1.8;
      give += v;
    });
    const keepCash = P.m - t.wc + t.gc >= 100;
    return got >= give * 1.15 && keepCash ? { type: 'tradeyes' } : { type: 'tradeno' };
  }
  if (s.phase === 'auction' && s.au){
    if (s.au.cur !== seat) return null;
    const i = s.au.i;
    const val = Math.min(P.m - 20, Math.round(setVal(s, seat, i) * (0.85 + 0.2 * (seat % 3) / 2)));
    const nb = s.au.bid + (s.au.bid < 100 ? 10 : 20);
    return nb <= val && nb <= P.m ? { type: 'bid', amt: nb } : { type: 'pass' };
  }
  if (seat !== s.turn) return null;
  if (s.phase === 'roll'){
    if (P.j){
      if (P.jcs.length) return { type: 'usecard' };
      if (P.m > 450 && own(s, -1).length === 0 && !(s.n % 2)) return { type: 'payjail' };
      if (P.m > 700) return { type: 'payjail' };
    }
    const bu = botBuild(s, seat);
    if (bu) return bu;
    return { type: 'roll' };
  }
  if (s.phase === 'buy'){
    const i = P.pos, T = TILES[i];
    const need = T.k === 'p' && countOwned(s, seat, GROUPS[T.g]) + 1 === GROUPS[T.g].length ? 20 : 120;
    return P.m - T.price >= need ? { type: 'buy' } : { type: 'auction' };
  }
  if (s.phase === 'end'){
    const b = botBuild(s, seat); if (b) return b;
    const t = botTrade(s, seat); if (t) return t;
    return { type: 'end' };
  }
  if (s.phase === 'debt'){
    const need = s.debt.a - P.m;
    void need;
    // önce yapı sat (en çok evli set), sonra ipotek
    let best = -1, bl = 0;
    own(s, seat).forEach(i => { if (s.pr[i].h > bl && !canSell(s, seat, i)){ bl = s.pr[i].h; best = i; } });
    if (best >= 0) return { type: 'sell', i: best };
    const cand = own(s, seat).filter(i => !canMortgage(s, seat, i)).sort((a, b) => TILES[a].price - TILES[b].price);
    if (cand.length) return { type: 'mortgage', i: cand[0] };
    return { type: 'bankrupt' };
  }
  return null;
}
// bot: bir renk setini tamamlamak için eksik mülkü pahalıya satın almayı dener (turda bir kez)
function botTrade(s, seat){
  if (s.tr || s.botT === s.n + ':' + seat) return null;
  s.botT = s.n + ':' + seat;
  const P = s.P[seat];
  for (const g of Object.keys(GROUPS)){
    const L = GROUPS[g], mine = countOwned(s, seat, L);
    if (mine !== L.length - 1) continue;
    const miss = L.find(i => s.pr[i].o !== seat);
    const o = s.pr[miss].o;
    if (o < 0 || s.P[o].bk || L.some(i => s.pr[i].h > 0)) continue;
    const gc = Math.ceil(TILES[miss].price * 2.3 / 10) * 10;
    if (P.m - gc < 100) continue;
    return { type: 'trade', to: o, gc, wc: 0, gp: [], wp: [miss] };
  }
  return null;
}
function botBuild(s, seat){
  const P = s.P[seat];
  // ipoteği kaldır (rahat para varsa)
  const mort = own(s, seat).filter(i => s.pr[i].mo && P.m - unmortgageCost(i) > 500).sort((a, b) => TILES[b].price - TILES[a].price);
  if (mort.length && s.phase !== 'debt') return { type: 'unmortgage', i: mort[0] };
  const opts = own(s, seat).filter(i => TILES[i].k === 'p' && !canBuild(s, seat, i) && P.m - TILES[i].h >= 200);
  if (opts.length){
    opts.sort((a, b) => (TILES[b].rent[s.pr[b].h + 1] - TILES[b].rent[s.pr[b].h]) / TILES[b].h - (TILES[a].rent[s.pr[a].h + 1] - TILES[a].rent[s.pr[a].h]) / TILES[a].h);
    return { type: 'build', i: opts[0] };
  }
  return null;
}
function suggestDelay(s){ return 900 + Math.min(6500, s.ms || 0); }

// ---------- görünüm ----------
function view(s, seat){
  const v = JSON.parse(JSON.stringify(s));
  delete v.dk; delete v.rs;
  v.me = seat === null || seat === undefined ? -1 : seat;
  return v;
}

const API = {
  TILES, GRP, GROUPS, RAILS, UTILS, OWNABLE, CARDS, JAIL, JAIL_FINE, GO_PAY,
  newGame, act, view, actor, botAction, suggestDelay,
  rentOf, netWorth, own, alive, unmortgageCost, tradeCheck,
  canBuild, canSell, canMortgage, canUnmortgage, countOwned, setVal
};
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.EmlakCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
