// Okey masası akışı (Klasik ve 101). Masayı yöneten kişinin bilgisayarında çalışır; her hamle burada denetlenir.
// Oyuncular sadece kendi taşlarını görür (view), diğerlerinin sadece taş sayısı gönderilir.
//
// Oturma ve sıra: koltuklar 0-3, sıra 0→1→2→3 (saat yönünün tersi). Herkes taşını sağına atar;
// bir sonraki oyuncu bu taşı "solundan" alabilir. Dağıtan kişinin sağındaki (sıradaki) oyuncu
// 15 (101'de 22) taş alır ve oyuna taş atarak başlar.
(function(root){
  const OC = typeof module !== 'undefined' && module.exports ? require('./okey-core.js') : root.OkeyCore;
  const N = 4;
  const prev = p => (p + N - 1) % N;
  const next = p => (p + 1) % N;

  function newMatch(opts){
    opts = opts || {};
    const variant = opts.variant === '101' ? '101' : 'klasik';
    const s = {
      variant, team: !!opts.team, hands101: opts.hands101 || 5,
      dealer: Math.floor(Math.random() * N), handNo: 0,
      scores: variant === '101' ? [0, 0, 0, 0] : (opts.team ? [20, 20] : [20, 20, 20, 20]),
      phase: 'idle', log: [], seq: 0
    };
    startHand(s, true);
    return s;
  }
  function startHand(s, first){
    if (!first) s.dealer = next(s.dealer);
    s.handNo++;
    const d = OC.deal(s.dealer, s.variant === '101' ? '101' : 'klasik');
    s.hands = d.hands; s.pile = d.pile; s.indicator = d.indicator;
    s.ctx = OC.makeCtx(d.indicator);
    s.discards = [[], [], [], []];
    s.turn = d.first;
    s.drew = true;                 // ilk oyuncu 15 taşla başlar, çekmeden atar
    s.firstMove = [true, true, true, true];
    s.shown = [false, false, false, false];
    s.result = null;
    s.phase = 'play';
    if (s.variant === '101'){
      s.opened = [null, null, null, null];
      s.table = [];              // masadaki perler: {mid, owner, ids, type, ...}
      s.penalty = [0, 0, 0, 0];
      s.tookTile = null;         // yandan alınıp bu el kullanılması gereken taş
      s.turnActs = 0;
    }
    s.last = { type: 'deal', dealer: s.dealer, first: d.first, at: ++s.seq };
  }
  const teamOf = p => p % 2;    // eşli oyunda karşılıklı oturanlar (0-2, 1-3) takım

  // ---------- hamleler ----------
  // dönüş: { ok:true } ya da { ok:false, err:'...' }
  function act(s, p, a){
    if (!a || typeof a.type !== 'string') return fail('Geçersiz hamle');
    if (a.type === 'nextHand') return nextHand(s);
    if (s.phase !== 'play') return fail('El bitti');
    if (a.type === 'show') return show(s, p);
    if (p !== s.turn) return fail('Sıra sende değil');
    const h = s.hands[p];
    switch (a.type){
      case 'draw': {
        if (s.drew) return fail('Zaten taş aldın, şimdi bir taş at');
        if (a.from === 'left'){
          const lp = s.discards[prev(p)];
          if (!lp.length) return fail('Solunda alınacak taş yok');
          const t = lp.pop(); h.push(t);
          if (s.variant === '101'){ s.tookTile = t; }
          s.last = { type: 'draw', from: 'left', p, tile: t, at: ++s.seq };
        } else {
          if (!s.pile.length) return fail('Ortada taş kalmadı');
          const t = s.pile.shift(); h.push(t);
          s.last = { type: 'draw', from: 'pile', p, at: ++s.seq };
        }
        s.drew = true;
        s.firstMove[p] = false;      // taş çektikten sonra gösterge gösterilemez
        return ok();
      }
      case 'pass': {     // ortada taş bitti, yandaki taşı da istemiyor → el berabere biter
        if (s.drew || s.pile.length) return fail('Henüz pas geçemezsin');
        endHandDraw(s); return ok();
      }
      case 'discard': {
        if (!s.drew) return fail('Önce taş çek');
        const i = h.indexOf(a.tile);
        if (i < 0) return fail('Bu taş sende değil');
        if (s.variant === '101') return discard101(s, p, a.tile);
        if (a.finish){
          const r = OC.checkFinish(h, a.tile, s.ctx);
          if (!r.ok) return fail('Elin henüz bitmedi: bütün taşlar per ya da 7 çift olmalı');
          h.splice(i, 1); s.discards[p].push(a.tile);
          finishClassic(s, p, r);
          return ok();
        }
        h.splice(i, 1); s.discards[p].push(a.tile);
        s.firstMove[p] = false;
        s.last = { type: 'discard', p, tile: a.tile, at: ++s.seq };
        passTurn(s);
        return ok();
      }
      case 'open': return s.variant === '101' ? open101(s, p, a.melds) : fail('Geçersiz');
      case 'meld': return s.variant === '101' ? meld101(s, p, a.ids) : fail('Geçersiz');
      case 'layoff': return s.variant === '101' ? layoff101(s, p, a.tile, a.mid) : fail('Geçersiz');
      case 'giveBack': return s.variant === '101' ? giveBack101(s, p) : fail('Geçersiz');
    }
    return fail('Bilinmeyen hamle');
  }
  const ok = () => ({ ok: true });
  const fail = err => ({ ok: false, err });

  function passTurn(s){
    s.turn = next(s.turn);
    s.drew = false;
    if (s.variant === '101'){ s.tookTile = null; s.turnActs = 0; }
  }
  // gösterge: ilk hamlesini yapmadan önce, göstergenin aynısını elinde tutan gösterir → diğerleri 1 puan kaybeder
  function show(s, p){
    if (s.variant === '101') return fail('101\'de gösterge puanı yok');
    if (s.shown[p]) return fail('Göstergeyi zaten gösterdin');
    if (!s.firstMove[p]) return fail('Gösterge sadece ilk taşını çekmeden (ya da atmadan) önce gösterilir');
    const ind = s.indicator;
    const twin = s.hands[p].find(id => !OC.isFake(id) && OC.colorOf(id) === OC.colorOf(ind) && OC.numOf(id) === OC.numOf(ind));
    if (twin === undefined) return fail('Elinde gösterge taşı yok');
    s.shown[p] = true;
    penalize(s, p, 1);
    s.last = { type: 'show', p, tile: twin, at: ++s.seq };
    // oyun el ortasında bitmez: puanı sıfıra inen olursa el bitince kontrol edilir
    return ok();
  }
  function penalize(s, winner, pts){
    if (s.team){ s.scores[1 - teamOf(winner)] -= pts; }
    else for (let q = 0; q < N; q++) if (q !== winner) s.scores[q] -= pts;
  }
  function finishClassic(s, p, r){
    let pts = 2;
    if (r.okeyDiscard) pts *= 2;
    if (r.pairs) pts *= 2;
    penalize(s, p, pts);
    s.result = { type: 'win', winner: p, pairs: r.pairs, okeyDiscard: r.okeyDiscard, points: pts, hand: s.hands[p].slice() };
    s.last = { type: 'finish', p, at: ++s.seq };
    s.phase = 'handover';
    checkGameOverClassic(s);
  }
  function checkGameOverClassic(s){
    if (s.variant === '101') return;
    if (s.scores.some(x => x <= 0)){ s.phase = 'gameover'; }
  }
  function endHandDraw(s){
    if (s.variant === '101'){
      // ortada taş bitti: elinde okey olan herkese 101 ceza
      const pen = [0, 0, 0, 0];
      for (let q = 0; q < N; q++) pen[q] = s.hands[q].filter(id => OC.isWild(id, s.ctx)).length * 101;
      pen.forEach((v, q) => s.scores[q] += v);
      s.result = { type: 'draw', hand: pen };
      s.phase = s.handNo >= s.hands101 ? 'gameover' : 'handover';
    } else {
      s.result = { type: 'draw' };
      s.phase = 'handover';
      checkGameOverClassic(s);
    }
    s.last = { type: 'handdraw', at: ++s.seq };
  }
  function nextHand(s){
    if (s.phase !== 'handover') return fail('El daha bitmedi');
    startHand(s, false);
    return ok();
  }

  // ---------- 101 ----------
  function meldFrom(s, p, ids){
    const v = OC.validateMeld(ids, s.ctx);
    if (!v.ok) return null;
    return Object.assign({ mid: 'm' + (++s.seq), owner: p, ids: ids.slice() }, v);
  }
  function takeFromHand(h, ids){
    const set = new Set(ids);
    if (set.size !== ids.length || ids.some(id => !h.includes(id))) return false;
    ids.forEach(id => h.splice(h.indexOf(id), 1));
    return true;
  }
  function open101(s, p, melds){
    if (!s.drew) return fail('Önce taş çek');
    if (s.opened[p]) return fail('Zaten açtın');
    if (!Array.isArray(melds) || !melds.length) return fail('Per seçmedin');
    const h = s.hands[p];
    const all = [].concat(...melds);
    if (new Set(all).size !== all.length || all.some(id => !h.includes(id))) return fail('Seçilen taşlar elinde değil');
    if (h.length - all.length < 1) return fail('Atmak için en az bir taş kalmalı');
    const ms = melds.map(ids => meldFrom(s, p, ids));
    if (ms.some(m => !m)) return fail('Seçtiğin perlerden biri geçerli değil');
    const pairs = ms.filter(m => m.type === 'pair').length;
    let kind;
    if (pairs === ms.length){
      if (pairs < 5) return fail('Çiftle açmak için en az 5 çift gerekir (' + pairs + ' çift)');
      kind = 'pairs';
    } else if (pairs){
      return fail('Çift ile seri/per aynı anda açılamaz');
    } else {
      const sum = ms.reduce((a, m) => a + m.value, 0);
      if (sum < 101) return fail('Açmak için en az 101 gerekir (şu an ' + sum + ')');
      kind = 'melds';
    }
    takeFromHand(h, all);
    ms.forEach(m => s.table.push(m));
    s.opened[p] = kind;
    s.turnActs++;
    s.last = { type: 'open', p, kind, value: kind === 'melds' ? ms.reduce((a, m) => a + m.value, 0) : pairs, mids: ms.map(m => m.mid), at: ++s.seq };
    if (s.tookTile !== null && all.includes(s.tookTile)) s.tookTile = null;
    return ok();
  }
  function meld101(s, p, ids){
    if (!s.drew) return fail('Önce taş çek');
    if (!s.opened[p]) return fail('Önce 101 ya da 5 çiftle açmalısın');
    const h = s.hands[p];
    if (!Array.isArray(ids) || ids.some(id => !h.includes(id))) return fail('Seçilen taşlar elinde değil');
    if (h.length - ids.length < 1) return fail('Atmak için en az bir taş kalmalı');
    const m = meldFrom(s, p, ids);
    if (!m) return fail('Bu geçerli bir per değil');
    if (s.opened[p] === 'pairs' && m.type !== 'pair') return fail('Çiftle açtığın için yeni seri/per açamazsın, sadece işleyebilirsin');
    if (s.opened[p] === 'melds' && m.type === 'pair') return fail('Seri/per ile açtın; çift açamazsın');
    takeFromHand(h, ids);
    s.table.push(m);
    s.turnActs++;
    if (s.tookTile !== null && ids.includes(s.tookTile)) s.tookTile = null;
    s.last = { type: 'meld', p, mid: m.mid, at: ++s.seq };
    return ok();
  }
  function layoff101(s, p, tile, mid){
    if (!s.drew) return fail('Önce taş çek');
    if (!s.opened[p]) return fail('İşlemek için önce açmalısın');
    const h = s.hands[p];
    if (!h.includes(tile)) return fail('Bu taş sende değil');
    if (h.length < 2) return fail('Atmak için en az bir taş kalmalı');
    const m = s.table.find(x => x.mid === mid);
    if (!m) return fail('Per bulunamadı');
    if (!OC.layOff(m, tile, s.ctx)) return fail('Bu taş bu pere işlenmez');
    h.splice(h.indexOf(tile), 1);
    s.turnActs++;
    if (s.tookTile === tile) s.tookTile = null;
    s.last = { type: 'layoff', p, mid, tile, at: ++s.seq };
    return ok();
  }
  function giveBack101(s, p){
    // yandan aldığı taşı kullanamayan, taşı geri koyup ortadan çekebilir
    // aldığı taşı kullanamayan oyuncu takılı kalmasın: taş hâlâ elindeyse her zaman geri verebilir
    if (s.tookTile === null || !s.hands[p].includes(s.tookTile)) return fail('Geri verilecek taş yok');
    const h = s.hands[p];
    h.splice(h.indexOf(s.tookTile), 1);
    s.discards[prev(p)].push(s.tookTile);
    s.tookTile = null; s.drew = false;
    s.last = { type: 'giveback', p, at: ++s.seq };
    return ok();
  }
  const layable = (s, id) => s.table.some(m => OC.canLayOff(m, id, s.ctx));
  function discard101(s, p, tile){
    const h = s.hands[p];
    if (s.tookTile !== null && h.includes(s.tookTile)) return fail('Yandan aldığın taşı bu el bir perde kullanmalısın (ya da geri ver)');
    h.splice(h.indexOf(tile), 1);
    s.discards[p].push(tile);
    const finishing = h.length === 0;
    let pen = 0, why = '';
    if (OC.isWild(tile, s.ctx)){ pen += 101; why = 'okey attı'; }
    else if (!finishing && layable(s, tile)){ pen += 101; why = 'işlenebilir taş attı'; }
    if (pen) s.penalty[p] += pen;
    s.last = { type: 'discard', p, tile, penalty: pen, why, at: ++s.seq };
    if (finishing){
      if (!s.opened[p]){ /* açmadan elin bitmesi teorik olarak mümkün değil */ }
      finish101(s, p, tile);
      return ok();
    }
    s.firstMove[p] = false;
    passTurn(s);
    return ok();
  }
  function finish101(s, p, lastTile){
    const pairsFin = s.opened[p] === 'pairs';
    const okeyFin = OC.isWild(lastTile, s.ctx);
    const mult = (pairsFin ? 2 : 1) * (okeyFin ? 2 : 1);
    const hand = [0, 0, 0, 0];
    for (let q = 0; q < N; q++){
      if (q === p){ hand[q] = -101 * mult; continue; }
      const tot = OC.handValue101(s.hands[q], s.ctx);
      if (!s.opened[q]) hand[q] = mult === 1 ? 202 : 404;
      else if (s.opened[q] === 'pairs') hand[q] = tot * 2 * mult;
      else hand[q] = tot * mult;
    }
    for (let q = 0; q < N; q++){ hand[q] += s.penalty[q]; s.scores[q] += hand[q]; }
    s.result = { type: 'win', winner: p, pairs: pairsFin, okeyDiscard: okeyFin, hand, penalty: s.penalty.slice() };
    s.last = { type: 'finish', p, at: ++s.seq };
    s.phase = s.handNo >= s.hands101 ? 'gameover' : 'handover';
  }

  // ---------- görünüm: her oyuncu sadece kendi elini görür ----------
  function view(s, p){
    const v = {
      variant: s.variant, team: s.team, hands101: s.hands101, handNo: s.handNo, dealer: s.dealer, turn: s.turn, drew: s.drew,
      phase: s.phase, scores: s.scores.slice(), indicator: s.indicator, okey: s.ctx.okey,
      pileCount: s.pile.length, counts: s.hands.map(h => h.length),
      discards: s.discards.map(d => d.slice(-6)), discardCounts: s.discards.map(d => d.length),
      last: s.last, result: s.result, shown: s.shown.slice(), firstMove: s.firstMove.slice()
    };
    if (p !== null && p >= 0) v.hand = s.hands[p].slice();
    if (s.result && s.phase !== 'play') v.hands = s.hands.map(h => h.slice());   // el bitince herkesin eli açılır
    if (s.variant === '101'){
      v.opened = s.opened.slice(); v.table = s.table.map(m => Object.assign({}, m, { ids: m.ids.slice() }));
      v.penalty = s.penalty.slice(); v.tookTile = p === s.turn ? s.tookTile : null; v.turnActs = s.turnActs;
    }
    return v;
  }

  // ---------- botlar: sırası gelen bot için bir sonraki hamle ----------
  function botAction(s, p){
    if (s.phase !== 'play') return null;
    const h = s.hands[p];
    // gösterge
    if (s.variant !== '101' && s.firstMove[p] && !s.shown[p]){
      const ind = s.indicator;
      if (h.some(id => !OC.isFake(id) && OC.colorOf(id) === OC.colorOf(ind) && OC.numOf(id) === OC.numOf(ind))) return { type: 'show' };
    }
    if (p !== s.turn) return null;
    if (!s.drew){
      if (!s.pile.length){
        const lt = s.discards[prev(p)].slice(-1)[0];
        if (s.variant !== '101' && lt !== undefined && OC.botWantsDiscard(h, lt, s.ctx)) return { type: 'draw', from: 'left' };
        if (s.variant !== '101' || lt === undefined) return { type: 'pass' };
        return { type: 'pass' };
      }
      const lt = s.discards[prev(p)].slice(-1)[0];
      if (s.variant !== '101'){
        if (lt !== undefined && OC.botWantsDiscard(h, lt, s.ctx)) return { type: 'draw', from: 'left' };
      } else if (lt !== undefined && s.opened[p] && !OC.isWild(lt, s.ctx)){
        // açmışsa: yandaki taş hemen işlenebiliyor ya da elle yeni per yapıyorsa al
        if (layable(s, lt)) return { type: 'draw', from: 'left' };
        if (s.opened[p] === 'melds'){
          const bm = OC.bestMelds(h.concat([lt]), s.ctx, 30);
          if (bm.melds.some(m => m.ids.includes(lt))) return { type: 'draw', from: 'left' };
        }
      }
      return { type: 'draw', from: 'pile' };
    }
    if (s.variant !== '101'){
      const d = OC.botDiscard(h, s.ctx);
      return { type: 'discard', tile: d.id, finish: d.finish };
    }
    // 101 botu
    if (!s.opened[p]){
      const best = OC.bestMelds(h, s.ctx, 80);
      if (best.value >= 101 && h.length - best.melds.reduce((a, m) => a + m.ids.length, 0) >= 1)
        return { type: 'open', melds: best.melds.map(m => m.ids) };
      const pr = OC.pairsIn(h, s.ctx);
      const pairs = pr.pairs.slice();
      const wl = pr.wilds.slice(), sg = pr.singles.slice();
      while (pairs.length < 5 && wl.length && sg.length) pairs.push([sg.shift(), wl.shift()]);
      if (pairs.length >= 5 && h.length - pairs.length * 2 >= 1) return { type: 'open', melds: pairs };
    } else {
      // yandan alınan taş önce kullanılmalı: işle, içeren peri indir ya da geri ver
      if (s.tookTile !== null && h.includes(s.tookTile)){
        const mt = s.table.find(x => OC.canLayOff(x, s.tookTile, s.ctx));
        if (mt && h.length >= 2) return { type: 'layoff', tile: s.tookTile, mid: mt.mid };
        if (s.opened[p] === 'melds'){
          const bt = OC.bestMelds(h, s.ctx, 40).melds.find(x => x.ids.includes(s.tookTile));
          if (bt && h.length - bt.ids.length >= 1) return { type: 'meld', ids: bt.ids };
        } else {
          const pt = OC.pairsIn(h, s.ctx).pairs.find(x => x.includes(s.tookTile));
          if (pt && h.length - 2 >= 1) return { type: 'meld', ids: pt };
        }
        return { type: 'giveBack' };
      }
      // işle
      for (const id of h){
        if (h.length < 2) break;
        const m = s.table.find(x => OC.canLayOff(x, id, s.ctx));
        if (m) return { type: 'layoff', tile: id, mid: m.mid };
      }
      if (s.opened[p] === 'melds'){
        const best = OC.bestMelds(h, s.ctx, 40);
        // yandan alınan taş varsa önce onu içeren peri indir
        const m = (s.tookTile !== null && best.melds.find(x => x.ids.includes(s.tookTile))) || best.melds[0];
        if (m && h.length - m.ids.length >= 1) return { type: 'meld', ids: m.ids };
        if (s.tookTile !== null && h.includes(s.tookTile) && !s.turnActs) return { type: 'giveBack' };
      } else {
        const pr = OC.pairsIn(h, s.ctx);
        if (pr.pairs.length && h.length - 2 >= 1) return { type: 'meld', ids: pr.pairs[0] };
      }
    }
    // at: okey ve işlenebilir taşları atma, en az işe yarayanı at
    let cand = h.filter(id => !OC.isWild(id, s.ctx) && !(h.length > 1 && layable(s, id)));
    if (!cand.length) cand = h.filter(id => !OC.isWild(id, s.ctx));
    if (!cand.length) cand = h.slice();
    let best = cand[0], bv = Infinity;
    for (const id of cand){
      const t = OC.ident(id, s.ctx);
      const v = OC.usefulness(id, h, s.ctx) - (t ? t.n / 30 : 0) + Math.random() * 0.2;   // eşitlikte büyük sayıyı at (ceza puanı az kalsın)
      if (v < bv){ bv = v; best = id; }
    }
    return { type: 'discard', tile: best };
  }

  const api = { newMatch, startHand, act, view, botAction, teamOf, next, prev };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.OkeyGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
