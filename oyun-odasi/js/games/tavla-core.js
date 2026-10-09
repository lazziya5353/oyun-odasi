// Tavla (erkek tavla / klasik) kural motoru. Arayüzden bağımsızdır; masayı yöneten kişinin bilgisayarında çalışır.
//
// Tahta: board[0..23]. Pozitif sayı = 0. oyuncunun (beyaz) pulları, negatif = 1. oyuncunun (siyah) pulları.
// Beyaz 24→1 yönünde ilerler (indeks 23→0), evi 1-6 (indeks 0-5).
// Siyah 1→24 yönünde ilerler (indeks 0→23), evi 19-24 (indeks 18-23).
// Kırılan pul "bar"a gider; kırık pulu olan önce onu rakibin evinden içeri sokmak zorundadır.
// Bir hane 2 ve daha fazla rakip pulu varsa "kapı"dır, oraya konulamaz.
// Mars: rakip hiç pul toplamadan bitirirsen 2 puan. Maç, belirlenen puana (3/5/7) ilk ulaşanın.
(function(root){
  const SIGN = p => p === 0 ? 1 : -1;
  const HOME = p => p === 0 ? [0, 5] : [18, 23];

  function initialBoard(){
    const b = new Array(24).fill(0);
    b[23] = 2; b[12] = 5; b[7] = 3; b[5] = 5;           // beyaz
    b[0] = -2; b[11] = -5; b[16] = -3; b[18] = -5;       // siyah
    return b;
  }
  function newGame(opts){
    return {
      board: initialBoard(), bar: [0, 0], off: [0, 0],
      turn: 0, dice: [], rolled: [], phase: 'opening', openRoll: null,
      turnMoves: [], turnStart: null, winner: null, winType: null,
      score: (opts && opts.score) || [0, 0], target: (opts && opts.target) || 5, gameNo: (opts && opts.gameNo) || 1
    };
  }
  const clone = s => JSON.parse(JSON.stringify(s));
  const owns = (b, i, p) => b[i] * SIGN(p) > 0;
  const oppCount = (b, i, p) => Math.max(0, -b[i] * SIGN(p));

  function allHome(s, p){
    if (s.bar[p] > 0) return false;
    const [lo, hi] = HOME(p);
    for (let i = 0; i < 24; i++) if (owns(s.board, i, p) && (i < lo || i > hi)) return false;
    return true;
  }
  // tek bir zarla yapılabilecek hamleler
  function singleMoves(s, p, d){
    const res = [], b = s.board;
    if (s.bar[p] > 0){
      const to = p === 0 ? 24 - d : d - 1;
      if (oppCount(b, to, p) < 2) res.push({ from: 'bar', to, die: d });
      return res;
    }
    const home = allHome(s, p);
    for (let i = 0; i < 24; i++){
      if (!owns(b, i, p)) continue;
      const to = p === 0 ? i - d : i + d;
      if (to >= 0 && to <= 23){
        if (oppCount(b, to, p) < 2) res.push({ from: i, to, die: d });
      } else if (home){
        const exact = p === 0 ? i === d - 1 : i === 24 - d;
        let farther = false;    // evde bu puldan daha geride pul var mı?
        if (p === 0){ for (let j = i + 1; j <= 5; j++) if (owns(b, j, p)) { farther = true; break; } }
        else { for (let j = 18; j < i; j++) if (owns(b, j, p)) { farther = true; break; } }
        if (exact || !farther) res.push({ from: i, to: 'off', die: d });
      }
    }
    return res;
  }
  // hamleyi uygula (yerinde değiştirir), kırma olduysa true döner
  function applyMove(s, p, m){
    const b = s.board, sg = SIGN(p);
    let hit = false;
    if (m.from === 'bar') s.bar[p]--; else b[m.from] -= sg;
    if (m.to === 'off') s.off[p]++;
    else {
      if (oppCount(b, m.to, p) === 1){ b[m.to] = 0; s.bar[1 - p]++; hit = true; }
      b[m.to] += sg;
    }
    const k = s.dice.indexOf(m.die);
    if (k >= 0) s.dice.splice(k, 1);
    return hit;
  }
  const key = s => s.board.join(',') + '|' + s.bar.join(',') + '|' + s.off.join(',') + '|' + s.dice.slice().sort().join('');

  // kalan zarlarla en fazla kaç zar kullanılabilir
  function maxUse(s, p, memo){
    const k = key(s);
    if (memo.has(k)) return memo.get(k);
    let best = 0;
    if (s.off[p] < 15){
      for (const d of [...new Set(s.dice)]){
        for (const m of singleMoves(s, p, d)){
          const t = clone(s); applyMove(t, p, m);
          best = Math.max(best, 1 + maxUse(t, p, memo));
          if (best === s.dice.length) break;
        }
        if (best === s.dice.length) break;
      }
    }
    memo.set(k, best);
    return best;
  }
  // şu an oynanabilecek kurallı tek hamleler (zarların en fazla kullanımı ve "büyük zar" kuralı dahil)
  function nextMoves(s){
    const p = s.turn;
    if (s.phase !== 'move' || !s.dice.length) return [];
    const memo = new Map();
    const target = maxUse(s, p, memo);
    if (target === 0) return [];
    let res = [];
    for (const d of [...new Set(s.dice)]){
      for (const m of singleMoves(s, p, d)){
        const t = clone(s); applyMove(t, p, m);
        if (1 + maxUse(t, p, memo) === target) res.push(m);
      }
    }
    // iki farklı zardan sadece biri oynanabiliyorsa büyük olan oynanmalı
    if (target === 1 && s.dice.length === 2 && s.dice[0] !== s.dice[1]){
      const big = Math.max(...s.dice);
      if (res.some(m => m.die === big)) res = res.filter(m => m.die === big);
    }
    // aynı hamle farklı zarla iki kez çıkabilir (ör. pul toplarken); tekilleştir
    const seen = new Set();
    return res.filter(m => { const k2 = m.from + '>' + m.to + ':' + m.die; if (seen.has(k2)) return false; seen.add(k2); return true; });
  }

  function pip(s, p){
    let t = s.bar[p] * 25;
    for (let i = 0; i < 24; i++) if (owns(s.board, i, p)) t += Math.abs(s.board[i]) * (p === 0 ? i + 1 : 24 - i);
    return t;
  }

  // ---- akış ----
  const rollDie = rng => 1 + Math.floor((rng || Math.random)() * 6);
  function doOpening(s, rng){
    let a, b;
    do { a = rollDie(rng); b = rollDie(rng); } while (a === b);
    s.openRoll = [a, b];
    s.turn = a > b ? 0 : 1;
    s.phase = 'roll';      // Türk usulü: büyük atan başlar ve zarlarını kendisi atar
  }
  function doRoll(s, rng, forced){
    const a = forced ? forced[0] : rollDie(rng), b = forced ? forced[1] : rollDie(rng);
    s.rolled = [a, b];
    s.dice = a === b ? [a, a, a, a] : [a, b];
    s.phase = 'move';
    s.turnMoves = [];
    s.turnStart = { board: s.board.slice(), bar: s.bar.slice(), off: s.off.slice(), dice: s.dice.slice() };
    s.noMoves = nextMoves(s).length === 0;
  }
  function doMove(s, m){
    const legal = nextMoves(s);
    const ok = legal.find(x => x.from === m.from && x.to === m.to && x.die === m.die);
    if (!ok) return false;
    const hit = applyMove(s, s.turn, ok);
    s.turnMoves.push(Object.assign({ hit }, ok));
    if (s.off[s.turn] === 15) finishGame(s, s.turn);
    return true;
  }
  function doUndo(s){
    if (!s.turnStart || s.phase !== 'move') return false;
    s.board = s.turnStart.board.slice(); s.bar = s.turnStart.bar.slice(); s.off = s.turnStart.off.slice();
    s.dice = s.turnStart.dice.slice(); s.turnMoves = [];
    return true;
  }
  const turnDone = s => s.phase === 'move' && nextMoves(s).length === 0;
  function endTurn(s){
    if (s.phase !== 'move') return false;
    s.turn = 1 - s.turn; s.dice = []; s.rolled = []; s.phase = 'roll'; s.turnStart = null; s.turnMoves = []; s.noMoves = false;
    return true;
  }
  function finishGame(s, w){
    const mars = s.off[1 - w] === 0;
    s.winner = w; s.winType = mars ? 'mars' : 'normal';
    s.score[w] += mars ? 2 : 1;
    s.phase = s.score[w] >= s.target ? 'matchover' : 'over';
    s.dice = [];
  }
  function nextGame(s){
    const n = newGame({ score: s.score, target: s.target, gameNo: s.gameNo + 1 });
    return n;
  }

  // ---- bot: tüm hamle dizilerini dener, ortaya çıkan pozisyonu puanlar ----
  function allSequences(s, p){
    const out = new Map();
    const memo = new Map();
    const target = maxUse(s, p, memo);
    (function rec(st, seq){
      if (seq.length === target){ out.set(key(st), seq); return; }
      for (const d of [...new Set(st.dice)]){
        for (const m of singleMoves(st, p, d)){
          const t = clone(st); applyMove(t, p, m);
          if (1 + maxUse(t, p, memo) !== target - seq.length) continue;
          rec(t, seq.concat([m]));
        }
      }
    })(clone(s), []);
    let seqs = [...out.values()];
    if (target === 1 && s.dice.length === 2 && s.dice[0] !== s.dice[1]){
      const big = Math.max(...s.dice);
      if (seqs.some(q => q[0].die === big)) seqs = seqs.filter(q => q[0].die === big);
    }
    return seqs;
  }
  function evaluate(s, p){
    const o = 1 - p, b = s.board;
    let v = (pip(s, o) - pip(s, p)) + s.off[p] * 8 - s.off[o] * 8;
    v += s.bar[o] * 12 - s.bar[p] * 12;
    // açıkta kalan tek pullar (rakibin vurabileceği mesafede) ceza
    const oppPos = [];
    for (let i = 0; i < 24; i++) if (owns(b, i, o)) oppPos.push(i);
    if (s.bar[o]) oppPos.push(o === 0 ? 24 : -1);
    for (let i = 0; i < 24; i++){
      if (b[i] * SIGN(p) === 1){
        let danger = 0;
        for (const j of oppPos){
          const dist = o === 0 ? j - i : i - j;   // rakip i'ye kaç adımda gelir
          if (dist > 0 && dist <= 12) danger += dist <= 6 ? 3 : 1;
        }
        if (danger) v -= 4 + danger * 1.5;
      }
      if (b[i] * SIGN(p) >= 2){
        const [lo, hi] = HOME(p);
        v += (i >= lo && i <= hi) ? 4 : 2;     // kapı: evde daha değerli
      }
    }
    return v;
  }
  function botTurn(s){
    const p = s.turn;
    const seqs = allSequences(s, p);
    let best = null, bestV = -Infinity;
    for (const q of seqs){
      const t = clone(s);
      q.forEach(m => applyMove(t, p, m));
      const v = evaluate(t, p) + Math.random() * 0.5;
      if (v > bestV){ bestV = v; best = q; }
    }
    return best || [];
  }

  const api = { newGame, initialBoard, singleMoves, nextMoves, applyMove, pip, allHome, doOpening, doRoll, doMove, doUndo,
    turnDone, endTurn, finishGame, nextGame, botTurn, allSequences, clone };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TavlaCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
