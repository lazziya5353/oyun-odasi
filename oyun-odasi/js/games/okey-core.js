// Okey kural motoru: Klasik Okey ve 101 Okey. Arayüzden bağımsızdır; masayı yöneten kişinin bilgisayarında çalışır.
//
// Taşlar: 4 renk (kırmızı, sarı, mavi, siyah) × 1-13 × 2 = 104 taş + 2 sahte okey = 106 taş.
// Taş kimliği: id = renk*26 + (sayı-1)*2 + kopya   (0..103), 104 ve 105 sahte okey.
// Gösterge: açılan taş. Okey: göstergenin aynı renkte bir fazlası (13'ün okeyi 1'dir). Okey her taşın yerine geçer.
// Sahte okey joker değildir: okey taşının kendisi yerine geçer (ör. okey sarı 8 ise sahte okey = sarı 8).
(function(root){
  const COLORS = ['kırmızı', 'sarı', 'mavi', 'siyah'];
  const isFake = id => id >= 104;
  const colorOf = id => Math.floor(id / 26);
  const numOf = id => Math.floor((id % 26) / 2) + 1;

  function makeCtx(indicator){
    const c = colorOf(indicator), n = numOf(indicator);
    return { indicator, okey: { c, n: n === 13 ? 1 : n + 1 } };
  }
  const isWild = (id, ctx) => !isFake(id) && colorOf(id) === ctx.okey.c && numOf(id) === ctx.okey.n;
  // taşın oyundaki kimliği (sahte okey → okey taşının kimliği). Okeyin kendisi için null (joker).
  function ident(id, ctx){
    if (isFake(id)) return { c: ctx.okey.c, n: ctx.okey.n };
    if (isWild(id, ctx)) return null;
    return { c: colorOf(id), n: numOf(id) };
  }
  function shuffle(a, rng){
    rng = rng || Math.random;
    for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  // dağıtım: dealer'ın sağındaki (sıradaki) oyuncu bir fazla alır ve oyuna taş atarak başlar
  function deal(dealer, variant, rng, nPlayers){
    nPlayers = nPlayers || 4;
    const deck = shuffle(Array.from({ length: 106 }, (_, i) => i), rng);
    let gi = deck.findIndex(id => !isFake(id));
    const indicator = deck.splice(gi, 1)[0];
    const per = variant === '101' ? 21 : 14;
    const first = (dealer + 1) % nPlayers;
    const hands = [];
    for (let p = 0; p < nPlayers; p++) hands.push([]);
    for (let k = 0; k < nPlayers; k++){
      const p = (first + k) % nPlayers;
      hands[p] = deck.splice(0, per + (p === first ? 1 : 0));
    }
    return { hands, pile: deck, indicator, first };
  }

  // ---------- Klasik Okey: el bitti mi? ----------
  // 14 taş: hepsi perlerde (aynı sayı farklı renk 3-4 taş / aynı renk ardışık en az 3 taş, 12-13-1 geçerli) ya da 7 çift.
  function toCounts(ids, ctx){
    const counts = Array.from({ length: 4 }, () => new Array(15).fill(0));
    let w = 0;
    for (const id of ids){ const t = ident(id, ctx); if (!t) w++; else counts[t.c][t.n]++; }
    return { counts, w };
  }
  function pairsOk(ids, ctx){
    if (ids.length !== 14) return false;
    const { counts, w } = toCounts(ids, ctx);
    let pairs = 0, singles = 0;
    for (let c = 0; c < 4; c++) for (let n = 1; n <= 13; n++){ pairs += Math.floor(counts[c][n] / 2); singles += counts[c][n] % 2; }
    if (singles > w) return false;
    return pairs + singles + Math.floor((w - singles) / 2) >= 7;
  }
  function meldsOk(ids, ctx){
    const { counts, w } = toCounts(ids, ctx);
    const memo = new Map();
    const keyOf = (w2) => counts.map(r => r.slice(1, 14).join('')).join('|') + '#' + w2;
    function solve(w){
      let fc = -1, fn = -1;
      outer: for (let n = 1; n <= 13; n++) for (let c = 0; c < 4; c++) if (counts[c][n] > 0){ fc = c; fn = n; break outer; }
      if (fc < 0) return w === 0;
      const k = keyOf(w);
      if (memo.has(k)) return memo.get(k);
      let ok = false;
      counts[fc][fn]--;
      // A) aynı sayı farklı renk (3 ya da 4 taş)
      const others = [0, 1, 2, 3].filter(c => c !== fc && counts[c][fn] > 0);
      for (let mask = 0; mask < (1 << others.length) && !ok; mask++){
        const pick = others.filter((_, i) => mask & (1 << i));
        for (let kw = 0; kw <= w && !ok; kw++){
          const size = 1 + pick.length + kw;
          if (size < 3 || size > 4) continue;
          pick.forEach(c => counts[c][fn]--);
          ok = solve(w - kw);
          pick.forEach(c => counts[c][fn]++);
        }
      }
      // B) aynı renk ardışık: bu taş serinin en küçük gerçek taşı (öncesinde sadece okey olabilir)
      for (let pre = 0; pre <= w && !ok; pre++){
        const s = fn - pre;
        if (s < 1) break;
        let used = []; let wUsed = pre; let v = fn + 1;
        // serinin uzunluğunu adım adım büyüt; her uzunlukta geri kalanı çözmeyi dene
        const maxV = s === 1 ? 13 : 14;
        let valid = true;
        while (valid && !ok){
          const len = v - s;   // şu anki seri uzunluğu (s..v-1)
          if (len >= 3) ok = solve(w - wUsed);
          if (ok || v > maxV) break;
          const realN = v === 14 ? 1 : v;
          if (counts[fc][realN] > 0){ counts[fc][realN]--; used.push(realN); }
          else if (wUsed < w){ wUsed++; used.push(0); }
          else valid = false;
          v++;
        }
        used.forEach(rn => { if (rn) counts[fc][rn]++; });
      }
      // C) 1 taşı yukarıda (12-13-1, 11-12-13-1 ...)
      if (!ok && fn === 1){
        for (let s = 12; s >= 1 && !ok; s--){
          // s..13 + 1(=14)
          const taken = []; let wUsed = 0, valid = true;
          for (let v = s; v <= 13; v++){
            if (counts[fc][v] > 0){ counts[fc][v]--; taken.push(v); }
            else if (wUsed < w){ wUsed++; }
            else { valid = false; break; }
          }
          if (valid) ok = solve(w - wUsed);
          taken.forEach(v => counts[fc][v]++);
          if (!valid) break;      // daha uzun seri de olmaz
        }
      }
      counts[fc][fn]++;
      memo.set(k, ok);
      return ok;
    }
    return solve(w);
  }
  // 15 taştan birini atıp bitirme kontrolü
  function checkFinish(hand15, discardId, ctx){
    const rest = hand15.slice();
    const i = rest.indexOf(discardId);
    if (i < 0 || rest.length !== 15) return { ok: false };
    rest.splice(i, 1);
    if (pairsOk(rest, ctx)) return { ok: true, pairs: true, okeyDiscard: isWild(discardId, ctx) };
    if (meldsOk(rest, ctx)) return { ok: true, pairs: false, okeyDiscard: isWild(discardId, ctx) };
    return { ok: false };
  }

  // ---------- 101 Okey: per doğrulama ----------
  // ids: per taşları. Sonuç: { ok, type: 'set'|'run'|'pair', value, color, num, lo, hi, colors }
  function validateMeld(ids, ctx){
    const tiles = ids.map(id => ident(id, ctx));
    const reals = tiles.filter(Boolean), w = tiles.length - reals.length, L = ids.length;
    if (L === 2){
      if (reals.length === 2 && (reals[0].c !== reals[1].c || reals[0].n !== reals[1].n)) return { ok: false };
      const r = reals[0] || { n: 0 };
      return { ok: true, type: 'pair', value: 0, num: r.n, color: reals[0] ? reals[0].c : -1 };
    }
    if (L < 3) return { ok: false };
    const cands = [];
    // set
    if (L <= 4 && reals.length){
      const n = reals[0].n;
      const cols = reals.map(t => t.c);
      if (reals.every(t => t.n === n) && new Set(cols).size === cols.length)
        cands.push({ ok: true, type: 'set', num: n, colors: cols, value: n * L, size: L });
    }
    if (!reals.length && L <= 4) cands.push({ ok: true, type: 'set', num: 13, colors: [], value: 13 * L, size: L });
    // seri (101'de 1 sadece başta olabilir, 12-13-1 geçersiz)
    if (L <= 13){
      const c = reals.length ? reals[0].c : 0;
      const nums = reals.map(t => t.n);
      if (reals.every(t => t.c === c) && new Set(nums).size === nums.length){
        const mn = reals.length ? Math.min(...nums) : 13, mx = reals.length ? Math.max(...nums) : 1;
        if (mx - mn + 1 <= L){
          // en yüksek değeri verecek başlangıç
          let s = Math.min(mn, 13 - L + 1);
          if (s + L - 1 >= mx && s >= 1){
            let val = 0; for (let v = s; v < s + L; v++) val += v;
            cands.push({ ok: true, type: 'run', color: c, lo: s, hi: s + L - 1, value: val });
          }
        }
      }
    }
    if (!cands.length) return { ok: false };
    cands.sort((a, b) => b.value - a.value);
    return cands[0];
  }
  // masadaki bir pere taş işlenebilir mi? (meld: validateMeld sonucu + ids)
  function canLayOff(meld, id, ctx){
    if (meld.type === 'pair') return null;
    const t = ident(id, ctx);
    if (meld.type === 'set'){
      if (meld.ids.length >= 4) return null;
      if (!t) return 'set';
      return t.n === meld.num && !meld.colors.includes(t.c) ? 'set' : null;
    }
    if (meld.type === 'run'){
      if (!t){ if (meld.hi < 13) return 'hi'; if (meld.lo > 1) return 'lo'; return null; }
      if (t.c !== meld.color) return null;
      if (t.n === meld.hi + 1 && t.n <= 13) return 'hi';
      if (t.n === meld.lo - 1 && t.n >= 1) return 'lo';
    }
    return null;
  }
  function layOff(meld, id, ctx){
    const where = canLayOff(meld, id, ctx);
    if (!where) return false;
    const t = ident(id, ctx);
    if (where === 'set'){ meld.ids.push(id); if (t) meld.colors.push(t.c); meld.value += meld.num; }
    else if (where === 'hi'){ meld.ids.push(id); meld.hi++; meld.value += meld.hi; }
    else { meld.ids.unshift(id); meld.lo--; meld.value += meld.lo; }
    return true;
  }
  // 101'de eldeki taşın ceza değeri: okey 101, diğerleri sayı değeri (sahte okey okeyin sayısı)
  function handValue101(ids, ctx){
    let t = 0;
    for (const id of ids){ const x = ident(id, ctx); t += x ? x.n : 101; }
    return t;
  }

  // ---------- per bulucu (bot için ve "per önerisi" için) ----------
  // eldeki taşlardan olası tüm perleri çıkarır
  function meldCandidates(ids, ctx, opts){
    opts = opts || {};
    const wilds = ids.filter(id => isWild(id, ctx));
    const byCN = new Map();
    ids.forEach(id => { const t = ident(id, ctx); if (!t) return; const k = t.c + ':' + t.n; if (!byCN.has(k)) byCN.set(k, []); byCN.get(k).push(id); });
    const get = (c, n) => (byCN.get(c + ':' + n) || [])[0];
    const out = [];
    // setler
    for (let n = 1; n <= 13; n++){
      const avail = [0, 1, 2, 3].map(c => get(c, n)).map((id, c) => ({ id, c })).filter(x => x.id !== undefined);
      for (let mask = 1; mask < 16; mask++){
        const pick = avail.filter(x => mask & (1 << x.c));
        if (pick.length !== [0,1,2,3].filter(c => mask & (1 << c)).length) continue;
        for (let kw = 0; kw <= Math.min(2, wilds.length); kw++){
          const size = pick.length + kw;
          if (size < 3 || size > 4 || pick.length < 1) continue;
          out.push({ ids: pick.map(x => x.id).concat(wilds.slice(0, kw)), type: 'set', value: n * size });
        }
      }
    }
    // seriler (1 sadece başta)
    for (let c = 0; c < 4; c++){
      for (let s = 1; s <= 11; s++){
        let used = [], wU = 0;
        for (let v = s; v <= 13; v++){
          const id = get(c, v);
          if (id !== undefined) used.push(id);
          else if (wU < wilds.length){ used.push(wilds[wU]); wU++; }
          else break;
          if (used.length >= 3 && used.some(x => !isWild(x, ctx))){
            let val = 0; for (let k = s; k <= v; k++) val += k;
            out.push({ ids: used.slice(), type: 'run', value: val });
          }
        }
      }
    }
    return out;
  }
  // birbiriyle çakışmayan perlerden en yüksek toplamı bul
  function bestMelds(ids, ctx, limitMs){
    const cands = meldCandidates(ids, ctx).sort((a, b) => b.value - a.value);
    let best = { value: 0, melds: [] };
    const t0 = Date.now(), lim = limitMs || 60;
    const used = new Set();
    (function rec(i, cur, val){
      if (val > best.value) best = { value: val, melds: cur.slice() };
      if (Date.now() - t0 > lim) return;
      for (let k = i; k < cands.length; k++){
        const m = cands[k];
        if (m.ids.some(id => used.has(id))) continue;
        m.ids.forEach(id => used.add(id)); cur.push(m);
        rec(k + 1, cur, val + m.value);
        cur.pop(); m.ids.forEach(id => used.delete(id));
      }
    })(0, [], 0);
    return best;
  }
  function pairsIn(ids, ctx){
    const map = new Map(); const wilds = [];
    ids.forEach(id => { const t = ident(id, ctx); if (!t){ wilds.push(id); return; } const k = t.c + ':' + t.n; if (!map.has(k)) map.set(k, []); map.get(k).push(id); });
    const pairs = [], singles = [];
    map.forEach(list => { for (let i = 0; i + 1 < list.length; i += 2) pairs.push([list[i], list[i + 1]]); if (list.length % 2) singles.push(list[list.length - 1]); });
    return { pairs, singles, wilds };
  }

  // ---------- botlar ----------
  // elin "kullanışlılık" puanı: taşların per ihtimali (komşu, aynı sayı, çift)
  function usefulness(id, ids, ctx){
    const t = ident(id, ctx);
    if (!t) return 100;
    let u = 0;
    for (const o of ids){
      if (o === id) continue;
      const s = ident(o, ctx);
      if (!s){ u += 1; continue; }
      if (s.c === t.c && s.n === t.n) u += 1.2;                        // çift ihtimali
      else if (s.n === t.n) u += 2;                                     // aynı sayı farklı renk
      else if (s.c === t.c){
        const d = Math.abs(s.n - t.n);
        const dh = Math.min(d, Math.abs((s.n === 1 ? 14 : s.n) - (t.n === 1 ? 14 : t.n)));
        if (dh === 1) u += 2.4; else if (dh === 2) u += 1.1;
      }
    }
    return u;
  }
  function handScore(ids, ctx){ return ids.reduce((a, id) => a + Math.min(6, usefulness(id, ids, ctx)), 0); }
  // klasik okey botu: 15 taşla ne atmalı / bitirebilir mi
  function botDiscard(hand, ctx){
    // önce bitirmeyi dene; okey atarak bitirmek iki kat puan
    const wildsH = hand.filter(id => isWild(id, ctx));
    for (const w of wildsH){ const r = checkFinish(hand, w, ctx); if (r.ok) return { id: w, finish: true }; }
    for (const id of hand){ if (isWild(id, ctx)) continue; const r = checkFinish(hand, id, ctx); if (r.ok) return { id, finish: true }; }
    let best = null, bv = Infinity;
    for (const id of hand){
      if (isWild(id, ctx)) continue;
      const v = usefulness(id, hand, ctx) + Math.random() * 0.3;
      if (v < bv){ bv = v; best = id; }
    }
    return { id: best === null ? hand[0] : best, finish: false };
  }
  // yandaki taşı almalı mı?
  function botWantsDiscard(hand14, tile, ctx){
    if (tile === undefined || tile === null) return false;
    if (isWild(tile, ctx)) return true;
    const with15 = hand14.concat([tile]);
    for (const id of with15){ if (checkFinish(with15, id, ctx).ok) return true; }
    const u = usefulness(tile, with15, ctx);
    return u >= 4.2;
  }

  const api = { COLORS, isFake, colorOf, numOf, makeCtx, isWild, ident, deal, shuffle, pairsOk, meldsOk, checkFinish,
    validateMeld, canLayOff, layOff, handValue101, meldCandidates, bestMelds, pairsIn, usefulness, handScore, botDiscard, botWantsDiscard };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.OkeyCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
