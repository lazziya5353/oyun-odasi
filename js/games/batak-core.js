// Batak kural motoru: İhaleli (tekli), Eşli İhaleli ve Koz Maça. Arayüzden bağımsızdır (DOM yok);
// masayı yöneten kişinin bilgisayarında çalışır, Node'da test edilebilir.
//
// ---------------- KURAL KARARLARI (kaynaklar aşağıda) ----------------
// Genel
//  - 52 kart, herkese 13. Sıra 0→1→2→3 (Türkiye'deki gibi saat yönünün tersi; arayüzde sıradaki oyuncu sağda).
//    Her el dağıtan bir sonraki koltuğa geçer; ilk dağıtan rastgele.
//  - Renge uymak zorunlu. Uyarken yerdeki en büyük kartı geçebiliyorsan büyük atmak zorundasın (yükseltme
//    zorunluluğu). Yere koz düşmüşse (ve açılan renk koz değilse) uyduğun renkten istediğini atarsın.
//  - Renk yoksa koz atmak zorunlu; yerde koz varsa ve geçebiliyorsan daha büyük koz atmak zorunlu, geçemiyorsan
//    herhangi bir koz. Koz da yoksa istediğin kartı (çöp) atarsın.
//  - Koz kırılmadan (biri koz atmadan) koz ile el açılamaz; elinde sadece koz kalmışsa açılabilir.
//  - Eli, yere atılan en büyük koz; koz yoksa açılan rengin en büyüğü alır. Eli alan sonraki eli açar.
// İhaleli (tekli)
//  - İhale dağıtanın sağındaki (sıradaki) oyuncudan başlar, tek tur döner: herkes bir kez ya önceki en yüksek
//    teklifi geçer ya da "pas" der. En az 4, en çok 13.
//  - Herkes pas derse ihale dağıtana 4'ten kalır (dağıtan zorunlu alır).
//  - İhaleyi alan kozu seçer ve ilk eli açar.
//  - Puan: ihaleyi alan, dediği kadar ya da fazla el alırsa aldığı el sayısı kadar artı; alamazsa ihale kadar eksi
//    ("battı"). Diğer oyuncular aldıkları el kadar artı yazar. Belirlenen el sayısı (5/7/11/13) bitince en yüksek
//    puan kazanır.
// Eşli İhaleli
//  - Karşılıklı oturanlar takımdır (0-2 = Takım A, 1-3 = Takım B). İhale takım adına verilir, en az 7.
//    Herkes pas derse dağıtanın takımına 7'den kalır. Takımın elleri toplanır; puan takım için yukarıdaki gibi.
//  - Bazı uygulamalardaki "ihaleyi alanın eşi kartlarını açar, ihaleci iki eli de oynar" kuralı uygulanmadı:
//    herkes kendi kartını oynar (sesli sohbette daha eğlenceli).
// Koz Maça (ihalesiz)
//  - Koz her zaman maça; ihale yok. Dağıtanın sağından başlayarak herkes kaç el alacağını söyler (1-13, pas yok).
//    İlk eli dağıtanın sağındaki açar. Maça kırılmadan maça ile el açılamaz.
//  - Puan: sözünü tutturan 10 × söz + fazla her el için 1; tutturamayan −10 × söz ("battı").
//
// Kaynaklar:
//  - Gamyun "Batak: Eşli ve İhaleli" kuralları (tekli en az 4, eşli en az 7; ilk kart koz olamaz; renk yoksa koz):
//    https://www.bluestacks.com/campaign/net.gamyun.android.ihale/tr
//  - Tamindir Batak: "Eşsiz oynanıyorsa taban rakam 4, eşli oynanıyorsa taban rakam 7'dir":
//    https://www.tamindir.com/indir/batak/
//  - App Store "Batak" (büyük atma zorunluluğu, koz üstüne büyük koz, herkes pas → dağıtan alır, koz kırılması):
//    https://apps.apple.com/us/app/id1548307007
//  - Bilgizma "Batak nasıl oynanır" (koz maça: herkes el sayısını söyler, 10 puan/el, batan eksi):
//    https://bilgizma.com/batak-nasil-oynanir/
//  - Rekoroyun Koz Maça (maça kırılmadan maça açılmaz; 10×söz + fazla el, batan −10×söz):
//    https://www.rekoroyun.com/batak.html
//
// Kart kimliği: id = renk*13 + değer, renk: 0 maça ♠, 1 kupa ♥, 2 karo ♦, 3 sinek ♣; değer 0..12 = 2,3,…,10,J,Q,K,A.
// Durum (s) düz JSON'dur (rastgelelik s.seed ile ilerler), kopyalanabilir/kaydedilebilir.
(function(root){
  const N = 4;
  const SUITS = ['♠', '♥', '♦', '♣'];
  const SUIT_NAMES = ['Maça', 'Kupa', 'Karo', 'Sinek'];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const VARIANTS = { ihaleli: 'İhaleli Batak', esli: 'Eşli İhaleli Batak', kozmaca: 'Koz Maça' };
  const HAND_OPTS = [5, 7, 11, 13];
  const suitOf = c => Math.floor(c / 13);
  const rankOf = c => c % 13;
  const cardName = c => SUITS[suitOf(c)] + RANKS[rankOf(c)];
  const next = p => (p + 1) % N;
  const teamOf = p => p % 2;
  const isRed = c => suitOf(c) === 1 || suitOf(c) === 2;
  // görünüm sırası: ♠ ♥ ♣ ♦ (renkler karışık dursun), renk içinde büyükten küçüğe
  const SUIT_ORDER = [0, 1, 3, 2];
  const sortHand = h => h.slice().sort((a, b) => SUIT_ORDER.indexOf(suitOf(a)) - SUIT_ORDER.indexOf(suitOf(b)) || rankOf(b) - rankOf(a));

  // mulberry32: durum içinde tutulan tohumla ilerler
  function rand(s){
    s.seed = (s.seed + 0x6D2B79F5) >>> 0;
    let t = s.seed;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  const ok = () => ({ ok: true });
  const fail = err => ({ ok: false, err });

  function newMatch(opts, rng){
    opts = opts || {};
    const variant = VARIANTS[opts.variant] ? opts.variant : 'ihaleli';
    const hands = HAND_OPTS.includes(+opts.hands) ? +opts.hands : 7;
    const r = typeof rng === 'function' ? rng : Math.random;
    const s = {
      variant, team: variant === 'esli', handsTotal: hands, handNo: 0,
      seed: Math.floor(r() * 4294967296) >>> 0,
      scores: [0, 0, 0, 0], history: [], phase: 'idle', seq: 0, last: null, winners: null
    };
    s.dealer = Math.floor(rand(s) * N);
    startHand(s, true);
    return s;
  }
  const minBidOf = s => s.variant === 'esli' ? 7 : s.variant === 'kozmaca' ? 1 : 4;

  function startHand(s, first){
    if (!first) s.dealer = next(s.dealer);
    s.handNo++;
    const deck = Array.from({ length: 52 }, (_, i) => i);
    for (let i = deck.length - 1; i > 0; i--){ const j = Math.floor(rand(s) * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    s.hands = [[], [], [], []];
    for (let i = 0; i < 52; i++) s.hands[(s.dealer + 1 + i) % N].push(deck[i]);
    s.bids = [null, null, null, null];     // sayı ya da 'pas'
    s.high = null;                         // { seat, value } en yüksek teklif
    s.bidder = null; s.bid = null; s.forced = false;
    s.trump = s.variant === 'kozmaca' ? 0 : null;
    s.trumpBroken = false;
    s.trick = []; s.lastTrick = null; s.trickNo = 0; s.leader = null;
    s.tricksWon = [0, 0, 0, 0];
    s.played = [];                         // bu el oynanmış kartlar (herkesin gördüğü bilgi)
    s.result = null;
    s.phase = 'bid';
    s.turn = next(s.dealer);
    s.last = { type: 'deal', dealer: s.dealer, at: ++s.seq };
  }

  // ---------- kurallar ----------
  function trickWinner(trick, trump){
    const led = suitOf(trick[0].card);
    let best = trick[0];
    for (const x of trick.slice(1)){
      const c = x.card, b = best.card;
      if (suitOf(c) === suitOf(b)){ if (rankOf(c) > rankOf(b)) best = x; }
      else if (suitOf(c) === trump) best = x;
      else if (suitOf(b) !== trump && suitOf(b) !== led && suitOf(c) === led) best = x;
    }
    return best.seat;
  }
  // bir oyuncunun yerdeki ele göre oynayabileceği kartlar
  function legalCards(hand, trick, trump, trumpBroken){
    if (!trick.length){
      if (trumpBroken || trump === null) return hand.slice();
      const nt = hand.filter(c => suitOf(c) !== trump);
      return nt.length ? nt : hand.slice();
    }
    const led = suitOf(trick[0].card);
    const wSeat = trickWinner(trick, trump);
    const w = trick.find(x => x.seat === wSeat).card;
    const follow = hand.filter(c => suitOf(c) === led);
    if (follow.length){
      if (suitOf(w) !== led) return follow;                   // yere koz düşmüş: uyması yeter
      const higher = follow.filter(c => rankOf(c) > rankOf(w));
      return higher.length ? higher : follow;
    }
    const trumps = trump === null ? [] : hand.filter(c => suitOf(c) === trump);
    if (trumps.length){
      if (suitOf(w) === trump){
        const higher = trumps.filter(c => rankOf(c) > rankOf(w));
        return higher.length ? higher : trumps;
      }
      return trumps;
    }
    return hand.slice();
  }
  function legal(s, seat){
    if (s.phase !== 'play' || seat !== s.turn) return [];
    return legalCards(s.hands[seat], s.trick, s.trump, s.trumpBroken);
  }
  function allowedBids(s, seat){
    if (s.phase !== 'bid' || seat !== s.turn) return [];
    const lo = s.variant === 'kozmaca' ? 1 : Math.max(minBidOf(s), s.high ? s.high.value + 1 : 0);
    const out = [];
    for (let b = lo; b <= 13; b++) out.push(b);
    return out;
  }

  // ---------- hamleler ----------
  function act(s, seat, a){
    if (!a || typeof a.type !== 'string') return fail('Geçersiz hamle');
    if (a.type === 'nextHand'){
      if (s.phase !== 'handover') return fail('El daha bitmedi');
      startHand(s, false);
      return ok();
    }
    if (s.phase === 'gameover') return fail('Oyun bitti');
    if (s.phase === 'handover') return fail('El bitti');
    if (typeof seat !== 'number' || seat < 0 || seat >= N) return fail('Masada oturmuyorsun');
    if (seat !== s.turn) return fail('Sıra sende değil');
    switch (a.type){
      case 'bid': return doBid(s, seat, a.value);
      case 'pass': return doPass(s, seat);
      case 'trump': return doTrump(s, seat, a.suit);
      case 'play': return doPlay(s, seat, a.card);
    }
    return fail('Bilinmeyen hamle');
  }
  function doBid(s, seat, value){
    if (s.phase !== 'bid') return fail('Şu an ihale zamanı değil');
    value = +value;
    if (!Number.isInteger(value)) return fail('Geçersiz teklif');
    if (!allowedBids(s, seat).includes(value)){
      if (s.variant === 'kozmaca') return fail('1 ile 13 arasında bir sayı söylemelisin');
      if (value < minBidOf(s)) return fail('En az ' + minBidOf(s) + ' demelisin');
      if (value > 13) return fail('En fazla 13 el olabilir');
      return fail('Teklifin ' + s.high.value + '\'den büyük olmalı');
    }
    s.bids[seat] = value;
    if (s.variant !== 'kozmaca') s.high = { seat, value };
    s.last = { type: 'bid', p: seat, value, at: ++s.seq };
    afterBid(s);
    return ok();
  }
  function doPass(s, seat){
    if (s.phase !== 'bid') return fail('Şu an ihale zamanı değil');
    if (s.variant === 'kozmaca') return fail('Koz maçada pas yok, kaç el alacağını söyle');
    s.bids[seat] = 'pas';
    s.last = { type: 'pass', p: seat, at: ++s.seq };
    afterBid(s);
    return ok();
  }
  function afterBid(s){
    if (s.bids.some(b => b === null)){ s.turn = next(s.turn); return; }
    if (s.variant === 'kozmaca'){
      s.phase = 'play'; s.leader = s.turn = next(s.dealer);
      return;
    }
    if (!s.high){       // herkes pas: dağıtan zorunlu alır
      s.high = { seat: s.dealer, value: minBidOf(s) };
      s.forced = true;
      s.last = { type: 'forced', p: s.dealer, value: s.high.value, at: ++s.seq };
    }
    s.bidder = s.high.seat; s.bid = s.high.value;
    s.phase = 'trump'; s.turn = s.bidder;
  }
  function doTrump(s, seat, suit){
    if (s.phase !== 'trump') return fail('Şu an koz seçilmiyor');
    suit = +suit;
    if (![0, 1, 2, 3].includes(suit)) return fail('Geçersiz koz');
    s.trump = suit;
    s.phase = 'play'; s.leader = s.turn = s.bidder;
    s.last = { type: 'trump', p: seat, suit, at: ++s.seq };
    return ok();
  }
  function doPlay(s, seat, card){
    if (s.phase !== 'play') return fail('Şu an kart atılmıyor');
    card = +card;
    const h = s.hands[seat];
    const i = h.indexOf(card);
    if (i < 0) return fail('Bu kart sende değil');
    const lg = legalCards(h, s.trick, s.trump, s.trumpBroken);
    if (!lg.includes(card)) return fail(whyIllegal(h, s, card));
    h.splice(i, 1);
    s.trick.push({ seat, card });
    s.played.push(card);
    if (suitOf(card) === s.trump) s.trumpBroken = true;
    const L = { type: 'play', p: seat, card, at: ++s.seq };
    s.last = L;
    if (s.trick.length < N){ s.turn = next(seat); return ok(); }
    // el (löve) tamamlandı: hemen çözülür, arayüz lastTrick'i gösterir
    const w = trickWinner(s.trick, s.trump);
    s.trickNo++;
    s.tricksWon[w]++;
    s.lastTrick = { no: s.trickNo, cards: s.trick, winner: w, leader: s.trick[0].seat };
    s.trick = [];
    L.trickDone = true; L.winner = w;
    s.leader = s.turn = w;
    if (s.trickNo === 13) endHand(s);
    return ok();
  }
  function whyIllegal(h, s, card){
    if (!s.trick.length) return 'Koz kırılmadan koz ile el açamazsın';
    const led = suitOf(s.trick[0].card);
    if (suitOf(card) !== led && h.some(c => suitOf(c) === led)) return 'Yerdeki renge (' + SUIT_NAMES[led] + ') uymalısın';
    if (suitOf(card) === led) return 'Büyük atmak zorundasın: yerdeki kartı geçen kartını atmalısın';
    if (suitOf(card) !== s.trump && h.some(c => suitOf(c) === s.trump)) return 'Rengin yoksa koz atmak zorundasın';
    return 'Yerdeki kozu geçen bir koz atmak zorundasın';
  }

  // ---------- puanlama ----------
  function endHand(s){
    const tw = s.tricksWon.slice();
    const delta = [0, 0, 0, 0];
    const res = { handNo: s.handNo, variant: s.variant, dealer: s.dealer, tricks: tw, bids: s.bids.slice(), trump: s.trump };
    if (s.variant === 'kozmaca'){
      const made = [false, false, false, false];
      for (let p = 0; p < N; p++){
        const b = s.bids[p];
        made[p] = tw[p] >= b;
        delta[p] = made[p] ? 10 * b + (tw[p] - b) : -10 * b;
      }
      res.made = made;
    } else if (s.variant === 'esli'){
      const bt = teamOf(s.bidder);
      const teamTricks = [tw[0] + tw[2], tw[1] + tw[3]];
      const made = teamTricks[bt] >= s.bid;
      const td = [0, 0];
      td[bt] = made ? teamTricks[bt] : -s.bid;
      td[1 - bt] = teamTricks[1 - bt];
      for (let p = 0; p < N; p++) delta[p] = td[teamOf(p)];
      Object.assign(res, { bidder: s.bidder, bid: s.bid, forced: s.forced, made, teamTricks, teamDelta: td });
    } else {
      const made = tw[s.bidder] >= s.bid;
      for (let p = 0; p < N; p++) delta[p] = p === s.bidder ? (made ? tw[p] : -s.bid) : tw[p];
      Object.assign(res, { bidder: s.bidder, bid: s.bid, forced: s.forced, made });
    }
    for (let p = 0; p < N; p++) s.scores[p] += delta[p];
    res.delta = delta;
    res.totals = s.scores.slice();
    s.history.push(res);
    s.result = res;
    // son kartın olayı korunur (arayüz son eli gösterip sonra sonucu açar); el/oyun sonu bayrakla bildirilir
    if (s.last && s.last.type === 'play') s.last.handEnd = true; else s.last = { type: 'handEnd', handEnd: true, at: ++s.seq };
    if (s.handNo >= s.handsTotal){
      s.phase = 'gameover';
      const best = Math.max(...s.scores);
      s.winners = [0, 1, 2, 3].filter(p => s.scores[p] === best);
      s.last.gameEnd = true;
    } else s.phase = 'handover';
  }
  const teamScores = s => [s.scores[0], s.scores[1]];   // eşlide iki takım arkadaşının puanı hep aynıdır

  // ---------- görünüm ----------
  function view(s, seat){
    const me = typeof seat === 'number' && seat >= 0 && seat < N ? seat : null;
    const v = {
      variant: s.variant, team: s.team, hands: s.handsTotal, handNo: s.handNo, dealer: s.dealer,
      phase: s.phase, turn: s.turn, minBid: minBidOf(s),
      bids: s.bids.slice(), high: s.high ? Object.assign({}, s.high) : null,
      bidder: s.bidder, bid: s.bid, forced: s.forced, trump: s.trump, trumpBroken: s.trumpBroken,
      trick: s.trick.map(x => ({ seat: x.seat, card: x.card })),
      lastTrick: s.lastTrick ? { no: s.lastTrick.no, winner: s.lastTrick.winner, leader: s.lastTrick.leader, cards: s.lastTrick.cards.map(x => ({ seat: x.seat, card: x.card })) } : null,
      trickNo: s.trickNo, leader: s.leader,
      tricksWon: s.tricksWon.slice(), scores: s.scores.slice(),
      counts: s.hands.map(h => h.length),
      history: s.history.map(h => JSON.parse(JSON.stringify(h))),
      result: s.result ? JSON.parse(JSON.stringify(s.result)) : null,
      winners: s.winners ? s.winners.slice() : null,
      last: s.last ? Object.assign({}, s.last) : null, seq: s.seq,
      hand: null, legal: [], allowedBids: []
    };
    if (s.team){ v.teamTricks = [s.tricksWon[0] + s.tricksWon[2], s.tricksWon[1] + s.tricksWon[3]]; v.teamScores = teamScores(s); }
    if (me !== null){
      v.hand = sortHand(s.hands[me]);
      v.legal = legal(s, me);
      v.allowedBids = allowedBids(s, me);
    }
    return v;
  }

  // ---------- botlar ----------
  // elin gücü: verilen koza göre kabaca kaç el alınır
  function estimate(hand, trump){
    const by = [[], [], [], []];
    hand.forEach(c => by[suitOf(c)].push(rankOf(c)));
    by.forEach(l => l.sort((a, b) => b - a));
    let est = 0;
    for (let su = 0; su < 4; su++){
      const l = by[su], L = l.length;
      if (!L) continue;
      const has = r => l.includes(r);
      let w = 0;
      if (has(12)) w += 1;
      if (has(11)) w += L >= 2 ? (has(12) ? 1 : 0.7) : 0.2;
      if (has(10)) w += L >= 3 ? (has(12) && has(11) ? 0.9 : has(12) || has(11) ? 0.5 : 0.25) : 0;
      if (su === trump){
        w += has(9) && L >= 4 ? 0.4 : 0;
        w += Math.max(0, L - 3) * 0.9;            // uzun koz
        w = Math.max(w, L * 0.55);
      } else if (L >= 6 && w >= 1.5) w += (L - 5) * 0.5;   // uzun güçlü renk
      est += w;
    }
    if (trump !== null){
      const T = by[trump].length;
      // kısa renklerde koz ile kesme
      let ruff = 0;
      for (let su = 0; su < 4; su++) if (su !== trump){ const L = by[su].length; ruff += L === 0 ? 1.2 : L === 1 ? 0.6 : 0; }
      est += Math.min(ruff, Math.max(0, T - 2) * 0.8);
    }
    return est;
  }
  function bestTrump(hand){
    let best = 0, bv = -1;
    for (let su = 0; su < 4; su++){
      const n = hand.filter(c => suitOf(c) === su).length;
      const v = estimate(hand, su) + n * 0.05;
      if (v > bv){ bv = v; best = su; }
    }
    return { suit: best, est: bv };
  }
  function botAction(s, seat){
    if (seat !== s.turn) return null;
    const h = s.hands[seat];
    if (s.phase === 'bid'){
      if (s.variant === 'kozmaca'){
        const e = estimate(h, 0);
        return { type: 'bid', value: Math.max(1, Math.min(13, Math.round(e - 0.3))) };
      }
      const bt = bestTrump(h);
      let e = bt.est;
      if (s.variant === 'esli'){
        const pb = s.bids[(seat + 2) % N];
        if (s.high && s.high.seat === (seat + 2) % N){
          // eş zaten ihalede: ancak çok güçlüysek yükselt
          if (e < 5.5) return { type: 'pass' };
          e = Math.min(13, s.high.value + Math.floor((e - 4) / 2));
        } else e += pb === 'pas' ? 2 : 2.8;      // eşten beklenen el
      }
      const want = Math.floor(e + 0.15);
      const allowed = allowedBids(s, seat);
      if (allowed.length && want >= allowed[0]) return { type: 'bid', value: allowed[0] === want ? want : allowed[0] };
      return { type: 'pass' };
    }
    if (s.phase === 'trump') return { type: 'trump', suit: bestTrump(h).suit };
    if (s.phase === 'play') return { type: 'play', card: botCard(s, seat) };
    return null;
  }
  // kartın, oynanmış kartlar düşünüldüğünde kendi renginin en büyüğü olup olmadığı
  function isMaster(s, card, hand){
    const su = suitOf(card);
    for (let r = rankOf(card) + 1; r < 13; r++){
      const c = su * 13 + r;
      if (!s.played.includes(c) && !hand.includes(c)) return false;
    }
    return true;
  }
  const lowest = cs => cs.reduce((a, c) => rankOf(c) < rankOf(a) ? c : a, cs[0]);
  const highest = cs => cs.reduce((a, c) => rankOf(c) > rankOf(a) ? c : a, cs[0]);
  function onMySide(s, seat, other){ return other === seat || (s.team && teamOf(other) === teamOf(seat)); }
  function botCard(s, seat){
    const h = s.hands[seat], T = s.trump;
    const lg = legalCards(h, s.trick, T, s.trumpBroken);
    if (lg.length === 1) return lg[0];
    const outTrumps = 13 - h.filter(c => suitOf(c) === T).length - s.played.filter(c => suitOf(c) === T).length;
    // kendine yetecek kadar aldıysa (koz maçada fazla el az puan) yine de almaya çalışır; batırmak da bir hedef
    if (!s.trick.length){
      const declSide = s.variant === 'kozmaca' ? true : onMySide(s, seat, s.bidder);
      // koz çekme: ihaleci tarafı, en büyük koz bendeyse ve dışarıda koz varsa
      const myT = lg.filter(c => suitOf(c) === T);
      if (declSide && myT.length && outTrumps > 0){
        const top = highest(myT);
        if (isMaster(s, top, h)) return top;
      }
      // renginin en büyüğü olan kozsuz kart
      const masters = lg.filter(c => suitOf(c) !== T && isMaster(s, c, h));
      if (masters.length && (outTrumps === 0 || masters.some(c => s.played.filter(x => suitOf(x) === suitOf(c)).length < 6))){
        // erken dönemde, rengin çok oynanmadığı master kartı tercih et
        const fresh = masters.filter(c => s.played.filter(x => suitOf(x) === suitOf(c)).length < 6);
        return highest(fresh.length ? fresh : masters);
      }
      // kısa yan renkten küçük aç (sonra koz ile kesmek için)
      const side = lg.filter(c => suitOf(c) !== T);
      if (side.length){
        const cnt = su => h.filter(c => suitOf(c) === su).length;
        const hasT = h.some(c => suitOf(c) === T);
        const pick = side.slice().sort((a, b) => (hasT ? cnt(suitOf(a)) - cnt(suitOf(b)) : cnt(suitOf(b)) - cnt(suitOf(a))) || rankOf(a) - rankOf(b));
        // tek kalan büyük kartı (ör. tek K) boşa açma
        const safe = pick.filter(c => !(rankOf(c) >= 10 && !isMaster(s, c, h)));
        return (safe.length ? safe : pick)[0];
      }
      return lowest(lg);
    }
    const wSeat = trickWinner(s.trick, T);
    const wCard = s.trick.find(x => x.seat === wSeat).card;
    const last = s.trick.length === N - 1;
    const beats = c => trickWinner(s.trick.concat([{ seat, card: c }]), T) === seat;
    const winners = lg.filter(beats);
    const partnerWinning = s.team && teamOf(wSeat) === teamOf(seat);
    if (partnerWinning){
      // eş alıyor: güvenliyse küçük at
      const safe = last || (suitOf(wCard) === T ? isMaster(s, wCard, h) : isMaster(s, wCard, h) && outTrumps === 0) || rankOf(wCard) >= 11;
      if (safe || !winners.length) return discardChoice(s, seat, lg, h);
    }
    if (!winners.length) return discardChoice(s, seat, lg, h);
    if (last) return lowest(winners);
    // daha sonra oynayacaklar geçebilir mi? kendi rengin master ise ya da koz ile kesiyorsan en küçük kazananı at
    const masterWin = winners.filter(c => isMaster(s, c, h) && (suitOf(c) === T || outTrumps === 0 || suitOf(c) === suitOf(s.trick[0].card)));
    if (masterWin.length) return lowest(masterWin);
    const tw = winners.filter(c => suitOf(c) === T);
    if (tw.length) return lowest(tw);
    // master değil: ikinci sıradaysan küçük oyna (zorunluysa en küçük kazanan)
    const lw = lowest(winners);
    if (lg.every(beats)) return lw;
    return rankOf(lw) >= 9 && s.trick.length === 1 ? lowest(lg) : lw;
  }
  function discardChoice(s, seat, lg, h){
    const T = s.trump;
    const led = s.trick.length ? suitOf(s.trick[0].card) : null;
    if (lg.every(c => suitOf(c) === led) || lg.every(c => suitOf(c) === T)) return lowest(lg);
    // çöp: kozu harcama, master kartları tut, kısa renkten küçük at
    const nonT = lg.filter(c => suitOf(c) !== T);
    const pool = nonT.length ? nonT : lg;
    const cnt = su => h.filter(c => suitOf(c) === su).length;
    const scored = pool.map(c => ({ c, v: rankOf(c) + (isMaster(s, c, h) ? 20 : 0) + cnt(suitOf(c)) * 0.5 }));
    scored.sort((a, b) => a.v - b.v);
    return scored[0].c;
  }
  // bot hamlesi için önerilen bekleme (ms): yeni el açılırken ortadaki kartlar görülsün diye daha uzun
  function suggestDelay(s){
    if (s.phase === 'handover') return 9000;
    if (s.phase === 'play' && !s.trick.length && s.lastTrick && s.last && s.last.trickDone) return 1500;
    if (s.phase === 'bid' || s.phase === 'trump') return 900;
    return 650;
  }

  const api = {
    N, SUITS, SUIT_NAMES, RANKS, VARIANTS, HAND_OPTS,
    suitOf, rankOf, cardName, isRed, sortHand, teamOf, next,
    newMatch, startHand, act, view, legal, legalCards, allowedBids, trickWinner, minBidOf,
    botAction, estimate, bestTrump, suggestDelay
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BatakCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
