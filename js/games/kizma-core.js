// Kızma Panpi kuralları (kızma birader / Mensch ärgere dich nicht türü). DOM'a dokunmaz; durum düz JSON'dur.
// 2-4 oyuncu, herkesin 4 taşı. 6 atınca taş çıkar, 6 atan bir daha atar, rakibin taşının üstüne gelirsen onu eve yollarsın.
// 40 karelik halka: her oyuncunun başlangıç karesi 10*koltuk. Taşın "ilerleme" değeri p: -1 ev, 0..39 halka, 40..43 kendi evi.
(function(root){
'use strict';

const SEATS = 4, PAWNS = 4, RING = 40;
const NAMES = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı'];

function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rnd(s){ const f = mulberry32(s.rs); const x = f(); s.rs = (s.rs + 0x9E3779B1) | 0; return x; }
const lg = (s, tx) => { s.log.push({ id: ++s.lid, tx }); if (s.log.length > 60) s.log.shift(); };
const ev = (s, e) => s.ev.push(e);

const sq = (seat, p) => (10 * seat + p) % RING;           // halka karesi (yalnızca 0<=p<40)
const alive = s => s.P.map((p, i) => p.on ? i : -1).filter(i => i >= 0);
const actor = s => s.turn;

function newGame(opts, active, seed){
  opts = opts || {};
  const s = {
    v: 1, opts: {}, rs: (seed === undefined ? (Math.random() * 4294967296) : seed) | 0,
    gameNo: opts.gameNo || 1,
    P: [], names: [], turn: 0, n: 1, phase: 'roll', d: 0, tries: 1, six: false, legal: [],
    log: [], lid: 0, ev: [], eid: 0, ms: 0, win: -1, last: null, rolls: 0
  };
  for (let i = 0; i < SEATS; i++) s.P.push({ on: !!(active && active[i]), pw: [-1, -1, -1, -1], rank: 0 });
  const act = alive(s);
  s.turn = act[Math.floor(rnd(s) * act.length)];
  s.tries = triesFor(s, s.turn);
  ev(s, { t: 'start' });
  lg(s, 'Oyun başladı. Kura ile @' + s.turn + ' başlıyor.');
  s.ms = 900; s.eid = 1;
  return s;
}

// bu zar değeriyle hangi taşlar oynayabilir (zorunlu kurallar dahil)
function movesFor(s, seat, d){
  const P = s.P[seat], pw = P.pw;
  const out = [];
  for (let i = 0; i < PAWNS; i++){
    const p = pw[i];
    let np;
    if (p === -1){ if (d !== 6) continue; np = 0; }
    else { np = p + d; if (np > 43) continue; }
    if (pw.some((q, j) => j !== i && q === np)) continue;   // kendi taşının üstüne konamaz
    out.push(i);
  }
  if (!out.length) return out;
  const hasBase = pw.some(p => p === -1);
  const startI = pw.indexOf(0);
  // başlangıç karesi dolu ve evde taş varsa önce o taş yürür
  if (hasBase && startI >= 0 && out.includes(startI)) return [startI];
  // 6 atınca ve evde taş varsa taş çıkarmak zorunlu
  if (d === 6 && hasBase){
    const outs = out.filter(i => pw[i] === -1);
    if (outs.length) return [outs[0]];
  }
  return out;
}
// zar değeri ne olursa olsun 1-5 ile hiç hareket edemiyorsa (hepsi evde ya da en dipte) 3 deneme hakkı
function triesFor(s, seat){
  for (let d = 1; d <= 5; d++) if (movesFor(s, seat, d).length) return 1;
  return 3;
}
const finished = (s, seat) => s.P[seat].pw.every(p => p >= 40);

function nextSeat(s, from){
  const act = alive(s).filter(i => !finished(s, i));
  if (!act.length) return from;
  for (let k = 1; k <= SEATS; k++){ const i = (from + k) % SEATS; if (act.includes(i)) return i; }
  return from;
}

function endTurn(s, seat){
  s.turn = nextSeat(s, seat); s.n++; s.phase = 'roll'; s.d = 0; s.six = false; s.legal = [];
  s.tries = triesFor(s, s.turn);
}

function rollDie(s){ return 1 + Math.floor(rnd(s) * 6); }

function doRoll(s, seat){
  const d = rollDie(s);
  s.d = d; s.rolls++;
  ev(s, { t: 'dice', s: seat, d });
  s.ms += 1500;
  lg(s, '@' + seat + ' ' + d + ' attı.');
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
  const P = s.P[seat];
  const d = s.d, from = P.pw[i], to = from === -1 ? 0 : from + d;
  P.pw[i] = to;
  s.legal = [];
  s.ms += from === -1 ? 700 : 260 + d * 230;
  ev(s, { t: 'move', s: seat, pw: i, f: from, to, d });
  if (from === -1) lg(s, '@' + seat + ' bir taşını çıkardı.');
  s.last = { s: seat, pw: i, to };
  // vurma
  if (to < 40){
    const cell = sq(seat, to);
    for (let o = 0; o < SEATS; o++){
      if (o === seat || !s.P[o].on) continue;
      s.P[o].pw.forEach((q, j) => {
        if (q >= 0 && q < 40 && sq(o, q) === cell){
          s.P[o].pw[j] = -1;
          ev(s, { t: 'cap', s: o, pw: j, by: seat, cell, f: q });
          lg(s, '@' + seat + ' @' + o + '\'in taşını vurdu! 💥');
          s.ms += 900;
        }
      });
    }
  } else {
    ev(s, { t: 'home', s: seat, pw: i, to });
    s.ms += 300;
    if (to >= 40 && from < 40) lg(s, '@' + seat + ' bir taşını evine soktu. 🏠');
  }
  if (finished(s, seat)){
    s.phase = 'over'; s.win = seat; s.legal = [];
    ev(s, { t: 'win', s: seat }); s.ms += 1500;
    lg(s, '🏆 @' + seat + ' tüm taşlarını eve soktu ve kazandı!');
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
  const pw = s.P[seat].pw, d = s.d, from = pw[i], to = from === -1 ? 0 : from + d;
  let sc = 0;
  if (to >= 40) sc += from < 40 ? 60 : 8 + to;          // eve girmek / evin içinde ilerlemek
  if (from === -1) sc += 55;                              // taş çıkarmak
  if (to < 40){
    const cell = sq(seat, to);
    for (let o = 0; o < SEATS; o++){
      if (o === seat || !s.P[o].on) continue;
      s.P[o].pw.forEach(q => { if (q >= 0 && q < 40 && sq(o, q) === cell) sc += 80 + q; });
    }
    // tehlike: arkasında 1-6 kare uzakta rakip var mı
    const danger = c => {
      let n = 0;
      for (let o = 0; o < SEATS; o++){
        if (o === seat || !s.P[o].on) continue;
        s.P[o].pw.forEach(q => { if (q >= 0 && q < 40){ const dist = (c - sq(o, q) + RING) % RING; if (dist >= 1 && dist <= 6) n++; } });
      }
      return n;
    };
    if (from >= 0 && from < 40) sc += 6 * danger(sq(seat, from));   // şu an tehlikedeyse kaç
    sc -= 9 * danger(cell);                                          // gideceği yer tehlikeliyse çekin
  }
  sc += to * 0.25;                                                   // geride kalanı değil öndekini bitir
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

const API = { SEATS, PAWNS, RING, NAMES, newGame, act, view, actor, botAction, suggestDelay, movesFor, sq, alive, finished };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.KizmaCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
