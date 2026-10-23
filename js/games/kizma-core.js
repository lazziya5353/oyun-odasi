// Kızma Panpi kuralları. DOM'a dokunmaz; durum düz JSON'dur. İki tahta var:
//  • "ludo" (varsayılan, ahşap Ludo tahtası): 52 karelik yol, 5 karelik renkli ev yolu, ortada ortak BİTİŞ.
//    6 atmadan taş çıkmaz, 6 atan bir daha atar, yıldızlı ve başlangıç kareleri güvenlidir (orada taş yenmez),
//    kendi taşların aynı karede üst üste durabilir, bitişe tam zarla girilir. Başlayan herkesin attığı zarla belirlenir.
//    Seçenekler: blok (aynı renkten iki taş rakibin geçişini keser), üç 6 (üst üste üçüncü 6'da sıra yanar).
//  • "klasik" (kızma birader): 40 karelik halka, 4 karelik ev, taş üst üste konamaz, hiç taşı yokken 3 deneme.
// Taşın "ilerleme" değeri p: -1 kapıda (yuva); 0..YOL-1 ortak yolda; YOL..BITIS ev yolunda (BITIS = ortaya varmış).
(function(root){
'use strict';

const SEATS = 4, PAWNS = 4;
const NAMES = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı'];
// tahta tanımları
const TAHTA = {
  klasik: { ring: 40, yol: 40, bitis: 43, ust: false, deneme: true, guvenli: [] },
  // ludo: her taş 51 kare ortak yolda (0..50), 5 kare ev yolunda (51..55) yürür, 56 = ortadaki BİTİŞ
  ludo: { ring: 52, yol: 51, bitis: 56, ust: true, deneme: false, guvenli: [0, 8, 13, 21, 26, 34, 39, 47] }
};
const tahtaOf = s => TAHTA[s.tahta] || TAHTA.klasik;
// koltuğun ortak yoldaki başlangıç karesi. Ludo'da sıra saat yönünde gitsin diye: 0 sol alt (kırmızı), 1 sol üst (yeşil), 2 sağ üst (sarı), 3 sağ alt (mavi)
const startOf = (s, seat) => s.tahta === 'ludo' ? ((seat + 3) % 4) * 13 : 10 * seat;
// koltuğun rengi (NAMES / renk dizisindeki sıra)
const LUDO_RENK = [0, 2, 3, 1];
const renkOf = (s, seat) => s.tahta === 'ludo' ? LUDO_RENK[seat] : seat;

function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rnd(s){ const f = mulberry32(s.rs); const x = f(); s.rs = (s.rs + 0x9E3779B1) | 0; return x; }
const lg = (s, tx) => { s.log.push({ id: ++s.lid, tx }); if (s.log.length > 60) s.log.shift(); };
const ev = (s, e) => s.ev.push(e);

// ortak yol karesi (yalnızca 0 <= p < yol)
const sq = (s, seat, p) => { const T = tahtaOf(s); return (startOf(s, seat) + p) % T.ring; };
const onRing = (s, p) => p >= 0 && p < tahtaOf(s).yol;
const alive = s => s.P.map((p, i) => p.on ? i : -1).filter(i => i >= 0);
const actor = s => s.turn;
const isSafe = (s, cell) => tahtaOf(s).guvenli.includes(cell);
// oyundaki (ortak yolda) taş sayısı
const onBoard = (s, seat) => s.P[seat].pw.filter(p => onRing(s, p)).length;

function newGame(opts, active, seed){
  opts = opts || {};
  const tahta = opts.tahta === 'klasik' ? 'klasik' : 'ludo';
  const s = {
    v: 2, tahta, opts: { tahta, blok: !!opts.blok, uc6: opts.uc6 !== false }, rs: (seed === undefined ? (Math.random() * 4294967296) : seed) | 0,
    gameNo: opts.gameNo || 1,
    P: [], names: [], turn: 0, n: 1, phase: 'roll', d: 0, tries: 1, six: false, sixRun: 0, legal: [],
    log: [], lid: 0, ev: [], eid: 0, ms: 0, win: -1, last: null, rolls: 0,
    T: { yol: TAHTA[tahta].yol, bitis: TAHTA[tahta].bitis }
  };
  for (let i = 0; i < SEATS; i++) s.P.push({ on: !!(active && active[i]), pw: [-1, -1, -1, -1], rank: 0 });
  const act = alive(s);
  ev(s, { t: 'start' });
  if (tahta === 'ludo'){
    // sıra belirleme: herkes zar atar, en yüksek atan başlar; eşitlikte eşitler yeniden atar
    let aday = act.slice(), tur = 0;
    while (aday.length > 1 && tur < 20){
      tur++;
      const at = aday.map(k => ({ k, d: 1 + Math.floor(rnd(s) * 6) }));
      lg(s, (tur > 1 ? 'Eşitlik, yeniden: ' : 'Sıra için zarlar: ') + at.map(x => '@' + x.k + ' ' + x.d).join(', '));
      ev(s, { t: 'order', r: at });
      const en = Math.max(...at.map(x => x.d));
      aday = at.filter(x => x.d === en).map(x => x.k);
    }
    s.turn = aday[0];
    lg(s, 'En yüksek zarı atan @' + s.turn + ' başlıyor.');
  } else {
    s.turn = act[Math.floor(rnd(s) * act.length)];
    lg(s, 'Oyun başladı. Kura ile @' + s.turn + ' başlıyor.');
  }
  s.tries = triesFor(s, s.turn);
  s.ms = 900; s.eid = 1;
  return s;
}

// rakiplerden birinin bu karede bloğu (aynı renkten 2+ taş) var mı
function blokVar(s, seat, cell){
  for (let o = 0; o < SEATS; o++){
    if (o === seat || !s.P[o].on) continue;
    let n = 0;
    s.P[o].pw.forEach(q => { if (onRing(s, q) && sq(s, o, q) === cell) n++; });
    if (n >= 2) return true;
  }
  return false;
}
// bu zar değeriyle hangi taşlar oynayabilir (hangisini oynayacağını oyuncu seçer)
function movesFor(s, seat, d){
  const T = tahtaOf(s), pw = s.P[seat].pw;
  const out = [];
  for (let i = 0; i < PAWNS; i++){
    const p = pw[i];
    let np;
    if (p === -1){ if (d !== 6) continue; np = 0; }
    else { if (p >= T.bitis) continue; np = p + d; if (np > T.bitis) continue; }   // bitişe tam zarla
    if (!T.ust && pw.some((q, j) => j !== i && q === np)) continue;                // klasik: kendi taşının üstüne konamaz
    if (s.tahta === 'ludo' && s.opts.blok){
      // blok kuralı: rakibin iki taşlık bloğunun üstünden geçilemez, üstüne de konulamaz
      let kapali = false;
      const a = p === -1 ? 0 : p + 1;
      for (let x = a; x <= Math.min(np, T.yol - 1); x++) if (blokVar(s, seat, sq(s, seat, x))){ kapali = true; break; }
      if (kapali) continue;
    }
    out.push(i);
  }
  return out;
}
// klasik: zar ne olursa olsun 1-5 ile hiç hareket edemiyorsa 3 deneme hakkı. Ludo: her zaman tek atış
function triesFor(s, seat){
  if (!tahtaOf(s).deneme) return 1;
  for (let d = 1; d <= 5; d++) if (movesFor(s, seat, d).length) return 1;
  return 3;
}
const finished = (s, seat) => { const T = tahtaOf(s); return s.P[seat].pw.every(p => s.tahta === 'ludo' ? p === T.bitis : p >= T.yol); };

function nextSeat(s, from){
  const act = alive(s).filter(i => !finished(s, i));
  if (!act.length) return from;
  for (let k = 1; k <= SEATS; k++){ const i = (from + k) % SEATS; if (act.includes(i)) return i; }
  return from;
}

function endTurn(s, seat){
  s.turn = nextSeat(s, seat); s.n++; s.phase = 'roll'; s.d = 0; s.six = false; s.sixRun = 0; s.legal = [];
  s.tries = triesFor(s, s.turn);
}

function rollDie(s){ return 1 + Math.floor(rnd(s) * 6); }

function doRoll(s, seat){
  const d = rollDie(s);
  s.d = d; s.rolls++;
  ev(s, { t: 'dice', s: seat, d });
  s.ms += 1500;
  lg(s, '@' + seat + ' ' + d + ' attı.');
  if (d === 6) s.sixRun = (s.sixRun || 0) + 1;
  // üst üste üçüncü 6: o hamle yanar, sıra geçer
  if (s.tahta === 'ludo' && s.opts.uc6 && d === 6 && s.sixRun >= 3){
    ev(s, { t: 'uc6', s: seat }); s.ms += 700;
    lg(s, '@' + seat + ' üst üste üç kez 6 attı: bu hamle yandı, sıra geçti. 🔥');
    endTurn(s, seat);
    return { ok: true };
  }
  const L = movesFor(s, seat, d);
  if (!L.length){
    if (s.tries > 1){
      s.tries--;
      lg(s, '@' + seat + ' taş çıkaramadı, tekrar deneyecek (' + s.tries + ' hak kaldı).');
      s.phase = 'roll'; s.six = false; s.legal = [];
      ev(s, { t: 'again', s: seat }); s.ms += 400;
    } else {
      ev(s, { t: 'pass', s: seat }); s.ms += 500;
      lg(s, '@' + seat + ' oynayamadı, sıra geçti.');
      endTurn(s, seat);
    }
    return { ok: true };
  }
  s.phase = 'move'; s.legal = L;
  return { ok: true };
}

function doMove(s, seat, i){
  const T = tahtaOf(s), P = s.P[seat];
  const d = s.d, from = P.pw[i], to = from === -1 ? 0 : from + d;
  P.pw[i] = to;
  s.legal = [];
  s.ms += from === -1 ? 700 : 260 + d * 230;
  ev(s, { t: 'move', s: seat, pw: i, f: from, to, d });
  if (from === -1) lg(s, '@' + seat + ' bir taşını çıkardı.');
  s.last = { s: seat, pw: i, to };
  if (to < T.yol){
    // vurma: güvenli karede (yıldız / başlangıç) taş yenmez
    const cell = sq(s, seat, to);
    if (isSafe(s, cell)){
      let orada = false;
      for (let o = 0; o < SEATS; o++) if (o !== seat && s.P[o].on && s.P[o].pw.some(q => onRing(s, q) && sq(s, o, q) === cell)) orada = true;
      if (orada) lg(s, '⭐ Güvenli kare: kimse yenmedi.');
    } else {
      for (let o = 0; o < SEATS; o++){
        if (o === seat || !s.P[o].on) continue;
        s.P[o].pw.forEach((q, j) => {
          if (onRing(s, q) && sq(s, o, q) === cell){
            s.P[o].pw[j] = -1;
            ev(s, { t: 'cap', s: o, pw: j, by: seat, cell, f: q });
            lg(s, '@' + seat + ' @' + o + '\'in taşını yedi! 💥 Taş yuvasına döndü.');
            s.ms += 900;
          }
        });
      }
    }
  } else {
    ev(s, { t: 'home', s: seat, pw: i, to });
    s.ms += 300;
    if (s.tahta === 'ludo'){
      if (to === T.bitis) lg(s, '@' + seat + ' bir taşını BİTİŞ\'e ulaştırdı. 🏁');
      else if (from < T.yol) lg(s, '@' + seat + ' bir taşını ev yoluna soktu.');
    } else if (from < T.yol) lg(s, '@' + seat + ' bir taşını evine soktu. 🏠');
  }
  if (finished(s, seat)){
    s.phase = 'over'; s.win = seat; s.legal = [];
    ev(s, { t: 'win', s: seat }); s.ms += 1500;
    lg(s, '🏆 @' + seat + ' dört taşını da bitirdi ve kazandı!');
    return { ok: true };
  }
  if (d === 6){
    s.phase = 'roll'; s.six = true; s.d = 0; s.tries = 1;
    lg(s, '@' + seat + ' 6 attığı için bir daha atacak.');
    ev(s, { t: 'again', s: seat }); s.ms += 300;
    return { ok: true };
  }
  endTurn(s, seat);
  return { ok: true };
}

function act(s, seat, a){
  if (s.phase === 'over') return { ok: false, err: 'Oyun bitti.' };
  s.ev = []; s.ms = 0;
  let r;
  if (seat !== s.turn) return { ok: false, err: 'Sıra sende değil.' };
  if (a.type === 'roll'){
    if (s.phase !== 'roll') return { ok: false, err: 'Şimdi taş oynatmalısın.' };
    r = doRoll(s, seat);
  } else if (a.type === 'move'){
    if (s.phase !== 'move') return { ok: false, err: 'Önce zar at.' };
    const i = a.pw | 0;
    if (!s.legal.includes(i)) return { ok: false, err: 'Bu taş oynatılamaz.' };
    r = doMove(s, seat, i);
  } else return { ok: false, err: 'Geçersiz hamle.' };
  if (r.ok && s.ev.length) s.eid++;
  return r;
}

// ---------- bot ----------
function scoreMove(s, seat, i){
  const T = tahtaOf(s), R = T.ring;
  const pw = s.P[seat].pw, d = s.d, from = pw[i], to = from === -1 ? 0 : from + d;
  let sc = 0;
  if (to >= T.yol) sc += from < T.yol ? 60 : 8 + to - T.yol;          // ev yoluna girmek / ilerlemek
  if (s.tahta === 'ludo' && to === T.bitis) sc += 40;                  // bitişe varmak
  if (from === -1) sc += 55;                                            // taş çıkarmak
  // tehlike: arkasında 1-6 kare uzakta rakip var mı (güvenli karede tehlike yok)
  const danger = c => {
    if (isSafe(s, c)) return 0;
    let n = 0;
    for (let o = 0; o < SEATS; o++){
      if (o === seat || !s.P[o].on) continue;
      s.P[o].pw.forEach(q => { if (onRing(s, q)){ const dist = (c - sq(s, o, q) + R) % R; if (dist >= 1 && dist <= 6) n++; } });
    }
    return n;
  };
  if (to < T.yol){
    const cell = sq(s, seat, to);
    if (!isSafe(s, cell)){
      for (let o = 0; o < SEATS; o++){
        if (o === seat || !s.P[o].on) continue;
        s.P[o].pw.forEach(q => { if (onRing(s, q) && sq(s, o, q) === cell) sc += 80 + q; });
      }
    } else if (s.tahta === 'ludo') sc += 14;                            // güvenli kareye kaç
    if (from >= 0 && from < T.yol) sc += 6 * danger(sq(s, seat, from)); // şu an tehlikedeyse kaç
    sc -= 9 * danger(cell);                                             // gideceği yer tehlikeliyse çekin
  } else if (from >= 0 && from < T.yol) sc += 6 * danger(sq(s, seat, from));
  sc += to * 0.25;                                                      // öndekini bitir
  return sc + rnd(s) * 3;
}
function botAction(s, seat){
  if (s.phase === 'over' || s.turn !== seat) return null;
  if (s.phase === 'roll') return { type: 'roll' };
  let best = s.legal[0], bs = -1e9;
  s.legal.forEach(i => { const v = scoreMove(s, seat, i); if (v > bs){ bs = v; best = i; } });
  return { type: 'move', pw: best };
}
function suggestDelay(s){ return 700 + Math.min(5000, s.ms || 0); }

function view(s, seat){
  const v = JSON.parse(JSON.stringify(s));
  delete v.rs;
  v.me = seat === null || seat === undefined ? -1 : seat;
  return v;
}

const API = { SEATS, PAWNS, NAMES, TAHTA, LUDO_RENK, newGame, act, view, actor, botAction, suggestDelay, movesFor, sq, alive, finished, onBoard, startOf, renkOf, isSafe };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.KizmaCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
