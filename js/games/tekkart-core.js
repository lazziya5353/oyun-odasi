// Tek Kart kuralları (renk eşleştirmeli kart oyunu; resmi kurallarla oynanır). DOM'a dokunmaz; durum düz JSON'dur.
// 108 kart: 4 renk × (bir 0, ikişer 1-9, ikişer Pas, Yön, +2) + 4 Joker + 4 Joker +4. Herkese 7 kart.
// Ortadaki kartla aynı renk, aynı sayı ya da aynı sembol oynanır; Joker her zaman oynanır.
// Joker +4 yalnızca elinde o anki renkten kart yokken oynanabilir; sıradaki oyuncu itiraz edebilir.
// Sondan bir önceki kartını atarken "TEK!" demezsen ve sıradaki oyuncu oynamadan biri yakalarsa 2 kart çekersin.
(function(root){
'use strict';

const COLS = ['r', 'y', 'g', 'b'];
const COL_AD = { r: 'Kırmızı', y: 'Sarı', g: 'Yeşil', b: 'Mavi' };
const MAXP = 6, HAND = 7;
// deste: id → { c, v }
const DECK = [];
COLS.forEach(c => {
  DECK.push({ c, v: '0' });
  for (let n = 1; n <= 9; n++){ DECK.push({ c, v: String(n) }); DECK.push({ c, v: String(n) }); }
  ['skip', 'rev', 'd2'].forEach(v => { DECK.push({ c, v }); DECK.push({ c, v }); });
});
for (let i = 0; i < 4; i++) DECK.push({ c: 'w', v: 'wild' });
for (let i = 0; i < 4; i++) DECK.push({ c: 'w', v: 'wd4' });
const V_AD = { skip: 'Pas', rev: 'Yön değiştir', d2: '+2', wild: 'Joker', wd4: 'Joker +4' };
const cardName = id => { const k = DECK[id]; return k.c === 'w' ? V_AD[k.v] : COL_AD[k.c] + ' ' + (V_AD[k.v] || k.v); };
const points = id => { const k = DECK[id]; if (k.c === 'w') return 50; if (V_AD[k.v]) return 20; return +k.v; };

function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rnd(s){ const f = mulberry32(s.rs); const x = f(); s.rs = (s.rs + 0x9E3779B1) | 0; return x; }
function shuffle(s, a){ for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd(s) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const lg = (s, tx) => { s.log.push({ id: ++s.lid, tx }); if (s.log.length > 60) s.log.shift(); };
const ev = (s, e) => s.ev.push(e);
const alive = s => s.P.map((p, i) => p.on ? i : -1).filter(i => i >= 0);
function nextOf(s, k, dir){
  dir = dir || s.dir;
  for (let q = 1; q <= MAXP; q++){ const i = ((k + dir * q) % MAXP + MAXP) % MAXP; if (s.P[i].on) return i; }
  return k;
}
const top = s => s.disc[s.disc.length - 1];
function canPlay(s, id){
  const k = DECK[id], t = DECK[top(s)];
  if (k.c === 'w') return true;
  if (k.c === s.col) return true;
  return t.c !== 'w' && k.v === t.v;
}
// Joker +4 kurala uygun mu: elinde o anki renkten kart olmamalı
const wd4Legal = (s, seat, except) => !s.P[seat].hand.some(id => id !== except && DECK[id].c === s.col);

function newGame(opts, active, seed){
  opts = opts || {};
  const target = [0, 250, 500].includes(+opts.target) ? +opts.target : 0;
  const s = {
    v: 1, opts: { target }, rs: (seed === undefined ? (Math.random() * 4294967296) : seed) | 0,
    gameNo: opts.gameNo || 1, round: 0,
    P: [], names: [], draw: [], disc: [], col: 'r', dir: 1, turn: 0, dealer: -1,
    phase: 'play', drawn: -1, pend: null, tek: -1, win: -1, rwin: -1, rpts: 0,
    log: [], lid: 0, ev: [], eid: 0, ms: 0, n: 0
  };
  for (let i = 0; i < MAXP; i++) s.P.push({ on: !!(active && active[i]), hand: [], said: false, score: 0 });
  const act = alive(s);
  s.dealer = act[Math.floor(rnd(s) * act.length)];
  newRound(s);
  s.eid = 1;
  return s;
}

function refill(s){
  if (s.draw.length) return true;
  if (s.disc.length <= 1) return false;
  const t = s.disc.pop();
  s.draw = shuffle(s, s.disc);
  s.disc = [t];
  ev(s, { t: 'shuffle' }); s.ms += 700;
  lg(s, 'Çekme destesi bitti; yerdeki kartlar karıştırılıp yeni deste yapıldı.');
  return true;
}
function drawCards(s, seat, n){
  const got = [];
  for (let i = 0; i < n; i++){ if (!refill(s)) break; got.push(s.draw.pop()); }
  s.P[seat].hand.push(...got);
  s.P[seat].said = false;
  if (got.length){ ev(s, { t: 'draw', s: seat, cards: got }); s.ms += 250 + got.length * 170; }
  return got;
}

function newRound(s){
  s.round++;
  s.dealer = s.round === 1 ? s.dealer : nextOf(s, s.dealer, 1);
  s.draw = shuffle(s, [...Array(DECK.length).keys()]);
  s.disc = []; s.dir = 1; s.drawn = -1; s.pend = null; s.tek = -1; s.rwin = -1; s.rpts = 0; s.rhands = null;
  s.P.forEach(p => { p.hand = []; p.said = false; });
  const act = alive(s);
  const deal = [];
  for (let r = 0; r < HAND; r++){ let k = s.dealer; act.forEach(() => { k = nextOf(s, k, 1); s.P[k].hand.push(s.draw.pop()); deal.push(k); }); }
  // ilk kart: Joker +4 çıkarsa desteye geri konup yeniden karıştırılır
  let first = s.draw.pop();
  while (DECK[first].v === 'wd4'){ s.draw.push(first); shuffle(s, s.draw); first = s.draw.pop(); }
  s.disc.push(first);
  const k = DECK[first];
  s.col = k.c === 'w' ? 'r' : k.c;
  ev(s, { t: 'deal', order: deal, first, dealer: s.dealer, round: s.round });
  s.ms = 900 + deal.length * 70 + 600;
  lg(s, (s.round > 1 ? s.round + '. el · ' : '') + 'Kartları @' + s.dealer + ' dağıttı. Yerdeki ilk kart: ' + cardName(first) + '.');
  s.phase = 'play';
  let t = nextOf(s, s.dealer, 1);
  if (k.v === 'wild'){ s.turn = t; s.phase = 'color'; lg(s, 'İlk kart Joker: @' + t + ' rengi seçecek.'); }
  else if (k.v === 'skip'){ lg(s, 'İlk kart Pas: @' + t + ' sırasını kaybetti.'); ev(s, { t: 'skip', s: t }); s.turn = nextOf(s, t, 1); }
  else if (k.v === 'rev'){
    s.dir = -1;
    ev(s, { t: 'rev', dir: -1 });
    if (act.length === 2){ s.turn = nextOf(s, s.dealer, 1); s.turn = nextOf(s, s.turn, -1); }
    else s.turn = s.dealer;
    lg(s, 'İlk kart Yön değiştir: oyun ters yönde, ' + (s.turn === s.dealer ? 'dağıtan @' + s.dealer : '@' + s.turn) + ' başlıyor.');
  } else if (k.v === 'd2'){
    drawCards(s, t, 2); ev(s, { t: 'skip', s: t });
    lg(s, 'İlk kart +2: @' + t + ' 2 kart çekti ve sırasını kaybetti.');
    s.turn = nextOf(s, t, 1);
  } else s.turn = t;
  s.n++;
}

function advance(s, from, skip){
  let t = nextOf(s, from);
  if (skip){ ev(s, { t: 'skip', s: t }); t = nextOf(s, t); }
  s.turn = t; s.phase = 'play'; s.drawn = -1; s.n++;
}

function endRound(s, w){
  let pts = 0;
  s.P.forEach((p, i) => { if (i !== w && p.on) p.hand.forEach(id => { pts += points(id); }); });
  s.P[w].score += pts;
  s.rwin = w; s.rpts = pts; s.rhands = s.P.map(p => p.hand.slice());
  ev(s, { t: 'round', s: w, pts, hands: s.P.map(p => p.hand.slice()) }); s.ms += 1800;
  lg(s, '🏁 @' + w + ' elini bitirdi ve ' + pts + ' puan aldı.');
  if (!s.opts.target || s.P[w].score >= s.opts.target){
    s.phase = 'over'; s.win = w;
    lg(s, '🏆 @' + w + ' oyunu kazandı!');
  } else s.phase = 'roundover';
}

// kart oynandıktan sonra etkisi
function afterPlay(s, seat, id){
  const k = DECK[id], P = s.P[seat];
  const two = alive(s).length === 2;
  // son kart: etkisi uygulanır (+2 / +4 çekilir), sonra el biter
  if (!P.hand.length){
    if (k.v === 'd2'){ const n = nextOf(s, seat); drawCards(s, n, 2); }
    if (k.v === 'wd4'){ const n = nextOf(s, seat); drawCards(s, n, 4); }
    endRound(s, seat); return;
  }
  if (k.v === 'skip'){ lg(s, '@' + nextOf(s, seat) + ' pas geçildi.'); advance(s, seat, true); return; }
  if (k.v === 'rev'){
    s.dir = -s.dir; ev(s, { t: 'rev', dir: s.dir }); s.ms += 500;
    if (two){ lg(s, 'Yön değişti (iki kişide Pas gibi): @' + seat + ' tekrar oynuyor.'); advance(s, seat, true); return; }
    lg(s, 'Yön değişti.');
    advance(s, seat, false); return;
  }
  if (k.v === 'd2'){
    const n = nextOf(s, seat);
    drawCards(s, n, 2);
    lg(s, '@' + n + ' 2 kart çekti ve pas geçti.');
    advance(s, seat, true); return;
  }
  if (k.v === 'wd4'){
    const n = nextOf(s, seat);
    s.turn = n; s.phase = 'challenge'; s.drawn = -1; s.n++;
    return;
  }
  advance(s, seat, false);
}

function doPlay(s, seat, a){
  const P = s.P[seat], id = a.card | 0;
  if (!P.hand.includes(id)) return { ok: false, err: 'Bu kart elinde yok.' };
  if (s.phase === 'drawn' && id !== s.drawn) return { ok: false, err: 'Çektiğin kartı oynayabilir ya da elinde tutabilirsin.' };
  if (!canPlay(s, id)) return { ok: false, err: 'Bu kart oynanamaz: renk, sayı ya da sembol uymalı.' };
  const k = DECK[id];
  let col = k.c;
  if (k.c === 'w'){ if (!COLS.includes(a.col)) return { ok: false, err: 'Bir renk seç.' }; col = a.col; }
  const legal4 = k.v === 'wd4' ? wd4Legal(s, seat, id) : true;
  const prevCol = s.col;
  P.hand.splice(P.hand.indexOf(id), 1);
  s.disc.push(id); s.col = col;
  if (a.tek && P.hand.length === 1) P.said = true;
  ev(s, { t: 'play', s: seat, card: id, col, tek: P.hand.length === 1 && P.said });
  s.ms += 650;
  lg(s, '@' + seat + ' ' + cardName(id) + (k.c === 'w' ? ' attı ve rengi ' + COL_AD[col] + ' yaptı.' : ' attı.'));
  if (P.hand.length === 1){
    if (P.said){ lg(s, '📣 @' + seat + ': TEK!'); s.tek = -1; }
    else s.tek = seat;                       // TEK demedi: sıradaki oyuncu oynayana kadar yakalanabilir
  } else if (s.tek === seat) s.tek = -1;
  if (k.v === 'wd4') s.pend = { by: seat, legal: legal4, prevCol };
  afterPlay(s, seat, id);
  return { ok: true };
}

function act(s, seat, a){
  if (s.phase === 'over') return { ok: false, err: 'Oyun bitti.' };
  s.ev = []; s.ms = 0;
  const tekBefore = s.tek, turnBefore = s.turn;
  const r = act2(s, seat, a);
  // sıradaki oyuncu bir hamle yapınca TEK demeyeni yakalama hakkı biter
  if (r.ok && !['tek', 'catch', 'next'].includes(a.type) && seat === turnBefore && tekBefore >= 0 && tekBefore !== seat && s.tek === tekBefore) s.tek = -1;
  if (r.ok && s.ev.length) s.eid++;
  return r;
}
function act2(s, seat, a){
  const P = s.P[seat];
  if (!P || !P.on) return { ok: false, err: 'Masada değilsin.' };
  // TEK! demek: elinde tek kart kalmışken, yakalanmadan önce
  if (a.type === 'tek'){
    if (P.hand.length === 1 && !P.said && s.tek === seat){
      P.said = true; s.tek = -1;
      ev(s, { t: 'tek', s: seat }); s.ms += 600;
      lg(s, '📣 @' + seat + ': TEK!');
      return { ok: true };
    }
    if (P.hand.length === 2 && s.turn === seat && (s.phase === 'play' || s.phase === 'drawn')){ P.said = true; ev(s, { t: 'tek', s: seat }); s.ms += 400; return { ok: true }; }
    return { ok: false, err: 'Şu an TEK diyemezsin.' };
  }
  // yakalama: TEK demeyeni sıradaki oyuncu oynamadan yakala
  if (a.type === 'catch'){
    const v = s.tek;
    if (v < 0 || v === seat || s.P[v].hand.length !== 1 || s.P[v].said) return { ok: false, err: 'Yakalanacak kimse yok.' };
    s.tek = -1;
    ev(s, { t: 'catch', s: v, by: seat }); s.ms += 700;
    lg(s, '🚨 @' + seat + ', TEK demeyen @' + v + '\'yi yakaladı: 2 kart ceza!');
    drawCards(s, v, 2);
    return { ok: true };
  }
  if (a.type === 'next'){
    if (s.phase !== 'roundover') return { ok: false, err: 'El bitmedi.' };
    newRound(s); return { ok: true };
  }
  if (seat !== s.turn) return { ok: false, err: 'Sıra sende değil.' };
  if (a.type === 'color'){
    if (s.phase !== 'color' || !COLS.includes(a.col)) return { ok: false, err: 'Renk seçimi beklenmiyor.' };
    s.col = a.col; s.phase = 'play';
    ev(s, { t: 'color', s: seat, col: a.col }); s.ms += 500;
    lg(s, '@' + seat + ' rengi ' + COL_AD[a.col] + ' seçti.');
    return { ok: true };
  }
  if (a.type === 'challenge'){
    if (s.phase !== 'challenge' || !s.pend) return { ok: false, err: 'İtiraz edilecek bir şey yok.' };
    const p = s.pend; s.pend = null;
    if (!a.yes){
      lg(s, '@' + seat + ' Joker +4\'ü kabul etti: 4 kart çekti, sırası geçti.');
      drawCards(s, seat, 4);
      advance(s, seat, false);
      return { ok: true };
    }
    ev(s, { t: 'chal', s: seat, by: p.by, ok: !p.legal, hand: s.P[p.by].hand.slice() }); s.ms += 2200;
    if (!p.legal){
      lg(s, '⚖️ @' + seat + ' itiraz etti ve haklı çıktı: @' + p.by + ' kuralsız +4 attı, 4 kartı o çekiyor.');
      drawCards(s, p.by, 4);
      s.phase = 'play'; s.drawn = -1;          // itiraz eden normal oynar
      return { ok: true };
    }
    lg(s, '⚖️ @' + seat + ' itiraz etti ama haksız çıktı: 6 kart çekti, sırası geçti.');
    drawCards(s, seat, 6);
    advance(s, seat, false);
    return { ok: true };
  }
  if (a.type === 'play'){
    if (s.phase !== 'play' && s.phase !== 'drawn') return { ok: false, err: 'Şimdi kart atamazsın.' };
    return doPlay(s, seat, a);
  }
  if (a.type === 'draw'){
    if (s.phase !== 'play') return { ok: false, err: 'Şimdi kart çekemezsin.' };
    const got = drawCards(s, seat, 1);
    if (!got.length){ lg(s, '@' + seat + ' çekecek kart yok, pas geçti.'); advance(s, seat, false); return { ok: true }; }
    lg(s, '@' + seat + ' bir kart çekti.');
    if (canPlay(s, got[0])){ s.phase = 'drawn'; s.drawn = got[0]; return { ok: true }; }
    advance(s, seat, false);
    return { ok: true };
  }
  if (a.type === 'keep'){
    if (s.phase !== 'drawn') return { ok: false, err: 'Önce kart çek.' };
    lg(s, '@' + seat + ' çektiği kartı elinde tuttu.');
    advance(s, seat, false);
    return { ok: true };
  }
  return { ok: false, err: 'Geçersiz hamle.' };
}

// ---------- bot ----------
function bestColor(s, seat, except){
  const cnt = { r: 0, y: 0, g: 0, b: 0 };
  s.P[seat].hand.forEach(id => { if (id !== except && DECK[id].c !== 'w') cnt[DECK[id].c] += 1 + (V_AD[DECK[id].v] ? 0.5 : 0); });
  let b = COLS[Math.floor(rnd(s) * 4)], bv = -1;
  COLS.forEach(c => { if (cnt[c] > bv){ bv = cnt[c]; b = c; } });
  return b;
}
function botPick(s, seat, ids){
  const nx = nextOf(s, seat), nxN = s.P[nx].hand.length;
  let best = null, bs = -1e9;
  ids.forEach(id => {
    const k = DECK[id];
    if (k.v === 'wd4' && !wd4Legal(s, seat, id)) return;           // bot kural dışı +4 atmaz
    let sc = 10;
    if (k.c === 'w') sc -= 20 - (s.P[seat].hand.length <= 2 ? 25 : 0);  // jokerleri sona sakla
    if (V_AD[k.v] && k.c !== 'w') sc += nxN <= 2 ? 30 : 4;
    if (k.v === 'wd4' && nxN <= 2) sc += 40;
    if (k.c !== 'w' && k.c === s.col) sc += 3;
    if (k.c !== 'w') sc += +k.v || 0;
    sc += rnd(s) * 2;
    if (sc > bs){ bs = sc; best = id; }
  });
  return best;
}
function botAction(s, seat){
  if (s.phase === 'over' || s.phase === 'roundover' || s.turn !== seat) return null;
  if (s.phase === 'color') return { type: 'color', col: bestColor(s, seat, -1) };
  if (s.phase === 'challenge') return { type: 'challenge', yes: rnd(s) < 0.25 };
  const P = s.P[seat];
  const ids = s.phase === 'drawn' ? [s.drawn] : P.hand.filter(id => canPlay(s, id));
  const pick = ids.length ? botPick(s, seat, ids) : null;
  if (pick === null) return s.phase === 'drawn' ? { type: 'keep' } : { type: 'draw' };
  const a = { type: 'play', card: pick };
  if (DECK[pick].c === 'w') a.col = bestColor(s, seat, pick);
  if (P.hand.length === 2) a.tek = rnd(s) < 0.92;           // botlar da bazen unutur
  return a;
}
function suggestDelay(s){ return 900 + Math.min(4500, s.ms || 0); }

// ---------- görünüm: başkalarının eli ve deste gizli ----------
function view(s, seat){
  const me = seat === null || seat === undefined ? -1 : seat;
  const v = JSON.parse(JSON.stringify(s));
  delete v.rs;
  v.me = me;
  v.drawN = s.draw.length; delete v.draw;
  v.discTop = s.disc.slice(-6); v.discN = s.disc.length; delete v.disc;
  v.P = s.P.map((p, i) => ({ on: p.on, n: p.hand.length, said: p.said, score: p.score, hand: i === me ? p.hand.slice() : null }));
  if (v.pend) v.pend = { by: v.pend.by };
  if (v.phase !== 'drawn' || s.turn !== me) v.drawn = s.phase === 'drawn' ? -2 : -1;
  v.ev = s.ev.map(e => {
    const x = Object.assign({}, e);
    if (x.t === 'draw' && x.s !== me) x.cards = x.cards.map(() => -1);
    if (x.t === 'chal' && x.s !== me && x.by !== me) delete x.hand;
    if (x.t === 'deal') x.mine = s.P[me] ? s.P[me].hand.slice(0, HAND) : null;
    return x;
  });
  v.playable = me >= 0 && s.turn === me && (s.phase === 'play' || s.phase === 'drawn')
    ? (s.phase === 'drawn' ? [s.drawn] : s.P[me].hand.filter(id => canPlay(s, id))) : [];
  return v;
}

const API = { DECK, COLS, COL_AD, V_AD, MAXP, HAND, newGame, act, view, botAction, suggestDelay, canPlay, cardName, points, nextOf, wd4Legal };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.TekKartCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
