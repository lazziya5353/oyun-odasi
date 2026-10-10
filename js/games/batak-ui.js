// Batak masası: yeşil çuha, ben alttayım; sağımda sıradaki oyuncu, karşımda bir sonraki, solumda benden önceki.
// Ortada yerdeki kartlar (her kart atanın tarafına yakın durur), ihale / koz seçme panelleri, puan tablosu, el sonu.
// Görünümü BatakCore.view üretir; hamleler tableAct({type:...}) ile masa sahibine gider.
const btUI = new Map();        // masa id → { lastSeq, collected, pending, pendingAt, showScores, clickRect, bubbles }
const BT_POS = ['me', 'r1', 'r2', 'r3'];          // göreli koltuk → yer (alt, sağ, üst, sol)

function btState(tid){ if (!btUI.has(tid)) btUI.set(tid, { lastSeq: 0, collected: 0, pending: 0, pendingAt: 0, showScores: false }); return btUI.get(tid); }
function btCardEl(c, opts){
  opts = opts || {};
  const el = document.createElement('div');
  if (c === null || c === undefined || opts.back){ el.className = 'bt-card back'; return el; }
  const su = BatakCore.suitOf(c), rk = BatakCore.RANKS[BatakCore.rankOf(c)];
  el.className = 'bt-card ' + (BatakCore.isRed(c) ? 'red' : 'blk');
  el.dataset.c = c;
  const sym = BatakCore.SUITS[su];
  const face = ['J', 'Q', 'K'].includes(rk);
  el.innerHTML = '<span class="bt-ix"><b>' + rk + '</b><i>' + sym + '</i></span>' +
    '<span class="bt-pip' + (face ? ' face' : '') + '">' + (face ? rk + '<small>' + sym + '</small>' : sym) + '</span>' +
    '<span class="bt-ix bt-ix2"><b>' + rk + '</b><i>' + sym + '</i></span>';
  el.title = BatakCore.SUIT_NAMES[su] + ' ' + rk;
  return el;
}

function renderBatak(body, s, lv){
  const v = lv.v, seat = lv.seat, me_ = seat >= 0 ? seat : 0;
  const ui = btState(s.id);
  const rel = k => (k - me_ + 4) % 4;
  let root = body.querySelector('.bt');
  if (!root){
    body.innerHTML = '';
    root = document.createElement('div'); root.className = 'bt';
    root.innerHTML =
      '<div class="bt-felt">' +
        '<div class="bt-koz"></div>' +
        '<div class="bt-seat r2"></div>' +
        '<div class="bt-tools"></div>' +
        '<div class="bt-seat r3"></div>' +
        '<div class="bt-center"><div class="bt-trick"></div><div class="bt-panel" hidden></div></div>' +
        '<div class="bt-seat r1"></div>' +
        '<div class="bt-bar"><div class="bt-seat me"></div><div class="bt-status"></div></div>' +
        '<div class="bt-hand"></div>' +
        '<div class="bt-scores" hidden></div>' +
        '<div class="bt-overlay" hidden></div>' +
      '</div>';
    body.append(root);
    // genişlik değişince eldeki kartları yeniden diz
    if (typeof ResizeObserver === 'function'){
      let lastW = 0, tm = null;
      new ResizeObserver(es => {
        const w = Math.round(es[0].contentRect.width);
        if (!lastW){ lastW = w; return; }
        if (Math.abs(w - lastW) < 4) return;
        lastW = w; clearTimeout(tm); tm = setTimeout(() => { if (root.isConnected) btRerender(s.id); }, 120);
      }).observe(root.querySelector('.bt-hand'));
    }
  }
  root.classList.toggle('spect', seat < 0);
  root.classList.toggle('team', !!v.team);
  const names = s.seats.map(x => x ? x.name : '—');
  const ctx = { s, v, seat, me_, rel, names, ui, root, lv };
  // son kart atılıp el bitti: sonuç penceresi, son el görülsün diye biraz sonra açılır
  if (v.last && v.last.handEnd && v.last.at !== ui.lastSeq && ui.lastSeq && v.last.type === 'play') ui.holdUntil = Date.now() + (reducedMotion() ? 900 : 1700);

  for (let k = 0; k < 4; k++) btSeatBox(root.querySelector('.bt-seat.' + BT_POS[rel(k)]), ctx, k);
  btKoz(root.querySelector('.bt-koz'), ctx);
  btTools(root.querySelector('.bt-tools'), ctx);
  btStatus(root.querySelector('.bt-status'), ctx);
  btTrick(root.querySelector('.bt-trick'), ctx);
  btPanel(root.querySelector('.bt-panel'), ctx);
  btHand(root.querySelector('.bt-hand'), ctx);
  btScoreTable(root.querySelector('.bt-scores'), ctx);
  btOverlay(root.querySelector('.bt-overlay'), ctx);
  btAnimate(ctx);
}

const btTeamName = k => k % 2 ? 'Takım B' : 'Takım A';
function btSeatBox(el, ctx, k){
  const { s, v, seat, rel, names } = ctx;
  const x = s.seats[k];
  const isMe = rel(k) === 0;
  el.innerHTML = '';
  el.dataset.seat = k;
  const active = (v.phase === 'bid' || v.phase === 'trump' || v.phase === 'play') && v.turn === k;
  el.classList.toggle('turn', active);
  el.classList.toggle('teamA', !!v.team && k % 2 === 0);
  el.classList.toggle('teamB', !!v.team && k % 2 === 1);
  const av = document.createElement('div'); av.className = 'bt-av';
  av.textContent = x && x.bot ? '🤖' : initial(names[k]);
  if (x && !x.bot){ av.style.setProperty('--c', colorFor(x.id)); av.dataset.treatFor = x.id; }
  if (v.dealer === k){ const d = document.createElement('i'); d.className = 'bt-dealer'; d.textContent = 'D'; d.title = 'Dağıtan'; av.append(d); }
  const info = document.createElement('div'); info.className = 'bt-info';
  const nm = document.createElement('b'); nm.textContent = names[k] + (isMe && seat >= 0 ? ' (sen)' : '');
  const sub = document.createElement('span'); sub.className = 'bt-sub';
  sub.textContent = (v.team ? btTeamName(k) + ' · ' : '') + v.scores[k] + ' puan';
  info.append(nm, sub);
  const chips = document.createElement('div'); chips.className = 'bt-chips';
  const chip = (t, cls, title) => { const c = document.createElement('span'); c.className = 'bt-chip ' + (cls || ''); c.textContent = t; if (title) c.title = title; chips.append(c); };
  const b = v.bids[k];
  if (v.variant === 'kozmaca'){
    if (b !== null) chip('Söz ' + b, 'bid');
  } else if (v.phase === 'bid'){
    if (b === 'pas') chip('Pas', 'pas'); else if (b !== null) chip('İhale ' + b, 'bid');
  } else if (v.bidder === k) chip('★ İhale ' + v.bid, 'bid hi', v.forced ? 'Herkes pas dedi, dağıtan zorunlu aldı' : 'İhaleyi aldı');
  if (v.phase === 'play' || v.phase === 'handover' || v.phase === 'gameover'){
    const won = v.tricksWon[k];
    chip('El ' + won, 'won', 'Aldığı el sayısı');
  }
  el.append(av, info, chips);
  if (!isMe || seat < 0){
    const backs = document.createElement('div'); backs.className = 'bt-backs';
    const n = v.counts[k];
    for (let i = 0; i < n; i++) backs.append(document.createElement('i'));
    const c = document.createElement('span'); c.textContent = n; backs.append(c);
    el.append(backs);
  }
  if (active){ const t = document.createElement('span'); t.className = 'bt-turn'; t.textContent = isMe && seat >= 0 ? 'Sıra sende' : 'Sırada'; el.append(t); }
}

function btKoz(el, ctx){
  const { v, names } = ctx;
  el.innerHTML = '';
  const big = document.createElement('div'); big.className = 'bt-koz-suit';
  if (v.trump !== null && v.trump !== undefined){
    big.textContent = BatakCore.SUITS[v.trump];
    big.classList.toggle('red', v.trump === 1 || v.trump === 2);
    big.title = 'Koz: ' + BatakCore.SUIT_NAMES[v.trump];
  } else { big.textContent = '?'; big.classList.add('unk'); big.title = 'Koz henüz seçilmedi'; }
  const txt = document.createElement('div'); txt.className = 'bt-koz-txt';
  const l1 = document.createElement('b'); l1.textContent = v.trump !== null && v.trump !== undefined ? 'Koz ' + BatakCore.SUIT_NAMES[v.trump] : 'Koz ?';
  const l2 = document.createElement('span');
  if (v.variant === 'kozmaca') l2.textContent = v.trumpBroken ? 'Maça kırıldı' : 'Maça kırılmadı';
  else if (v.bidder !== null && v.bidder !== undefined) l2.textContent = names[v.bidder] + ' · ' + v.bid + (v.team ? ' (' + btTeamName(v.bidder) + ')' : '');
  else l2.textContent = 'İhale sürüyor';
  txt.append(l1, l2);
  if (v.variant !== 'kozmaca' && v.trump !== null && v.phase === 'play'){ const l3 = document.createElement('span'); l3.textContent = v.trumpBroken ? 'Koz kırıldı' : 'Koz kırılmadı'; txt.append(l3); }
  el.append(big, txt);
}

function btTools(el, ctx){
  const { s, v, ui } = ctx;
  el.innerHTML = '';
  const hn = document.createElement('span'); hn.className = 'bt-handno';
  hn.textContent = 'El ' + v.handNo + '/' + v.hands;
  const b = document.createElement('button'); b.className = 'btn small bt-sbtn' + (ui.showScores ? ' on' : ''); b.textContent = '📋 Puanlar';
  b.onclick = () => { ui.showScores = !ui.showScores; btRerender(s.id); };
  el.append(hn, b);
}
function btRerender(tid){
  if (typeof renderOpenTable === 'function' && typeof openTable !== 'undefined' && openTable === tid) renderOpenTable();
  else if (typeof btRerender.fallback === 'function') btRerender.fallback(tid);
}

function btStatus(el, ctx){
  const { v, seat, names } = ctx;
  const mine = seat >= 0 && v.turn === seat;
  let t = '';
  if (v.phase === 'bid') t = mine ? (v.variant === 'kozmaca' ? 'Kaç el alacağını söyle' : 'İhale sırası sende') : names[v.turn] + (v.variant === 'kozmaca' ? ' sözünü düşünüyor…' : ' ihale düşünüyor…');
  else if (v.phase === 'trump') t = mine ? 'İhale senin! Kozu seç' : names[v.turn] + ' kozu seçiyor…';
  else if (v.phase === 'play'){
    if (mine) t = v.trick.length ? 'Sıra sende · parlayan kartlardan birini at' : 'Sıra sende · eli sen aç';
    else t = names[v.turn] + ' oynuyor…';
  } else if (v.phase === 'handover') t = 'El bitti';
  else if (v.phase === 'gameover') t = 'Oyun bitti';
  if (seat < 0) t = '👀 Seyircisin · ' + t;
  el.textContent = t;
  el.classList.toggle('mine', mine && v.phase !== 'handover' && v.phase !== 'gameover');
}

// yerdeki kartlar: her kart atanın tarafına doğru
function btTrick(el, ctx){
  const { v, rel, ui } = ctx;
  el.innerHTML = '';
  let cards = v.trick, done = false;
  if (!cards.length && v.lastTrick && ui.collected !== v.lastTrick.no + ':' + v.handNo && v.phase !== 'bid' && v.phase !== 'trump'){
    cards = v.lastTrick.cards; done = true;
  }
  const winSeat = done ? v.lastTrick.winner : (cards.length ? BatakCore.trickWinner(cards, v.trump) : -1);
  cards.forEach((x, i) => {
    const c = btCardEl(x.card);
    c.classList.add('p' + rel(x.seat));
    c.style.zIndex = i + 1;
    c.dataset.seat = x.seat;
    if (done) c.classList.add('done');
    if (x.seat === winSeat && cards.length > 1) c.classList.add('win');
    el.append(c);
  });
  el.classList.toggle('done', done);
  el.dataset.no = done ? v.lastTrick.no : '';
}

function btPanel(el, ctx){
  const { v, seat, names } = ctx;
  el.innerHTML = '';
  const mine = seat >= 0 && v.turn === seat;
  if (v.phase === 'bid'){
    el.hidden = false;
    const h = document.createElement('h4');
    const p = document.createElement('p'); p.className = 'bt-pnote';
    if (v.variant === 'kozmaca'){
      h.textContent = mine ? 'Kaç el alacaksın?' : '🗣 Sözler';
      p.textContent = 'Koz maça. Tutturursan 10×söz + fazla el, tutturamazsan −10×söz.';
    } else {
      h.textContent = mine ? 'İhale ver' : '🗣 İhale';
      p.textContent = v.high ? 'En yüksek: ' + names[v.high.seat] + ' · ' + v.high.value : 'Henüz teklif yok · en az ' + v.minBid + (v.team ? ' (takım adına)' : '');
    }
    el.append(h, p);
    if (mine){
      const g = document.createElement('div'); g.className = 'bt-bids';
      (v.allowedBids || []).forEach(n => {
        const b = document.createElement('button'); b.className = 'btn bt-bidbtn'; b.textContent = n;
        b.onclick = () => btSend(ctx, { type: 'bid', value: n });
        g.append(b);
      });
      if (v.variant !== 'kozmaca'){
        const b = document.createElement('button'); b.className = 'btn bt-bidbtn pas'; b.textContent = 'Pas';
        b.onclick = () => btSend(ctx, { type: 'pass' });
        g.append(b);
      }
      el.append(g);
      if (v.variant !== 'kozmaca' && v.dealer === seat && !v.high){
        el.append(Object.assign(document.createElement('p'), { className: 'bt-pnote warn', textContent: 'Herkes pas dedi: sen de pas dersen ihale ' + v.minBid + '\'ten sana kalır.' }));
      }
    } else {
      el.append(Object.assign(document.createElement('p'), { className: 'bt-wait', textContent: names[v.turn] + ' düşünüyor…' }));
    }
    return;
  }
  if (v.phase === 'trump'){
    el.hidden = false;
    const h = document.createElement('h4');
    h.textContent = mine ? 'Kozu seç' : names[v.turn] + ' kozu seçiyor…';
    el.append(h);
    const p = document.createElement('p'); p.className = 'bt-pnote';
    p.textContent = (v.forced ? 'Herkes pas dedi, ihale dağıtana kaldı · ' : '') + names[v.bidder] + ' ' + v.bid + ' el alacak' + (v.team ? ' (' + btTeamName(v.bidder) + ')' : '');
    el.append(p);
    if (mine){
      const g = document.createElement('div'); g.className = 'bt-suits';
      for (let su = 0; su < 4; su++){
        const n = (v.hand || []).filter(c => BatakCore.suitOf(c) === su).length;
        const b = document.createElement('button'); b.className = 'bt-suitbtn' + (su === 1 || su === 2 ? ' red' : '');
        b.innerHTML = '<span>' + BatakCore.SUITS[su] + '</span><small>' + BatakCore.SUIT_NAMES[su] + ' · ' + n + ' kart</small>';
        b.onclick = () => btSend(ctx, { type: 'trump', suit: su });
        g.append(b);
      }
      el.append(g);
    }
    return;
  }
  el.hidden = true;
}

// hamle gönder (çift dokunmaya karşı: aynı görünümde ikinci kez göndermez)
function btSend(ctx, a){
  const { ui, v } = ctx;
  const now = Date.now();
  if (ui.pending === v.seq && now - ui.pendingAt < 1500) return false;
  ui.pending = v.seq; ui.pendingAt = now;
  tableAct(a);
  return true;
}

function btHand(el, ctx){
  const { v, seat, ui, s } = ctx;
  el.innerHTML = '';
  if (seat < 0){
    const n = document.createElement('p'); n.className = 'bt-spectnote';
    n.textContent = 'Seyirci olarak izliyorsun. Kartları sadece oyuncular görür.';
    el.append(n);
    return;
  }
  const hand = v.hand || [];
  const legal = new Set(v.legal || []);
  const myPlay = v.phase === 'play' && v.turn === seat;
  const W = el.clientWidth || 600;
  const small = W < 560;
  const cw = small ? 52 : 66, ch = Math.round(cw * 1.42);
  const n = hand.length;
  const pad = small ? 12 : 16;          // döndürülen uç kartlar taşmasın
  const step = n > 1 ? Math.min(cw * (small ? 0.7 : 0.66), (W - 2 * pad - cw) / (n - 1)) : 0;
  const total = cw + step * Math.max(0, n - 1);
  const x0 = (W - total) / 2;
  const mid = (n - 1) / 2;
  el.style.setProperty('--cw', cw + 'px');
  el.style.setProperty('--ch', ch + 'px');
  hand.forEach((c, i) => {
    const card = btCardEl(c);
    card.classList.add('inhand');
    const d = i - mid;
    const rot = n > 1 ? d * (small ? 1 : 1.5) : 0;
    const y = d * d * (small ? 0.2 : 0.3);
    card.style.left = (x0 + i * step) + 'px';
    card.style.setProperty('--y', y + 'px');
    card.style.setProperty('--rot', rot + 'deg');
    card.style.zIndex = i + 1;
    if (myPlay){
      if (legal.has(c)){
        card.classList.add('legal');
        card.tabIndex = 0;
        const play = () => {
          ui.clickRect = card.getBoundingClientRect();
          if (btSend(ctx, { type: 'play', card: c })) card.classList.add('sent');
        };
        card.onclick = play;
        card.onkeydown = e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); play(); } };
      } else {
        card.classList.add('illegal');
        card.onclick = () => { toast(btWhy(v, c)); gameSound('err'); };
      }
    }
    el.append(card);
  });
  // yeni el: kartlar dağıtılıyor
  if (v.handNo !== ui.dealtHand){
    const first = ui.dealtHand === undefined && v.phase !== 'bid';
    ui.dealtHand = v.handNo;
    if (!first && !reducedMotion()){
      el.querySelectorAll('.bt-card').forEach((cd, i) => {
        cd.animate([{ opacity: 0, transform: 'translate(0,-160px) rotate(-20deg) scale(.6)' }, { opacity: 1 }], { duration: 380, delay: i * 45, easing: 'cubic-bezier(.2,.8,.3,1.1)', fill: 'backwards' });
      });
    }
  }
  el.dataset.tid = s.id;
}
function btWhy(v, c){
  const su = BatakCore.suitOf(c);
  if (!v.trick.length) return 'Koz kırılmadan koz ile el açamazsın';
  const led = BatakCore.suitOf(v.trick[0].card);
  const h = v.hand || [];
  if (su !== led && h.some(x => BatakCore.suitOf(x) === led)) return 'Yerdeki renge (' + BatakCore.SUIT_NAMES[led] + ') uymalısın';
  if (su === led) return 'Büyük atmak zorundasın: yerdeki kartı geçen kartını at';
  if (su !== v.trump && h.some(x => BatakCore.suitOf(x) === v.trump)) return 'Rengin yoksa koz atmak zorundasın';
  return 'Yerdeki kozu geçen bir koz atmalısın';
}

function btScoreTable(el, ctx){
  const { s, v, names, ui } = ctx;
  if (!ui.showScores){ el.hidden = true; return; }
  el.hidden = false; el.innerHTML = '';
  const head = document.createElement('div'); head.className = 'bt-sc-head';
  head.innerHTML = '<b>Puan tablosu</b>';
  const x = document.createElement('button'); x.className = 'btn small'; x.textContent = '✕'; x.title = 'Kapat';
  x.onclick = () => { ui.showScores = false; btRerender(s.id); };
  head.append(x);
  el.append(head);
  el.append(btHistoryTable(v, names));
  const note = document.createElement('p'); note.className = 'bt-pnote';
  note.textContent = v.variant === 'kozmaca' ? 'Sözünü tutturan 10×söz + fazla el; tutturamayan −10×söz.'
    : 'İhaleyi tutturan aldığı el kadar, batan ihale kadar eksi; diğerleri aldığı el kadar yazar. ★ ihaleyi alan.';
  el.append(note);
}
function btHistoryTable(v, names){
  const wrap = document.createElement('div'); wrap.className = 'bt-sc-wrap';
  const t = document.createElement('table'); t.className = 'bt-sc';
  const cols = v.team ? [0, 1] : [0, 1, 2, 3];
  const colName = k => v.team ? btTeamName(k) + ' (' + names[k] + ', ' + names[k + 2] + ')' : names[k];
  let html = '<thead><tr><th>El</th>' + cols.map(() => '<th></th>').join('') + '</tr></thead><tbody>';
  html += '</tbody><tfoot><tr><th>Toplam</th>' + cols.map(() => '<td></td>').join('') + '</tr></tfoot>';
  t.innerHTML = html;
  t.querySelectorAll('thead th').forEach((th, i) => { if (i) th.textContent = colName(cols[i - 1]); });
  const tb = t.querySelector('tbody');
  v.history.forEach(h => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = h.handNo + (h.trump !== null && h.trump !== undefined ? ' ' + BatakCore.SUITS[h.trump] : '');
    tr.append(th);
    cols.forEach(k => {
      const td = document.createElement('td');
      const d = h.delta[k];
      let txt = (d > 0 ? '+' : '') + d;
      if (v.variant === 'kozmaca') txt += ' (' + h.tricks[k] + '/' + h.bids[k] + ')';
      else if (v.team){ txt += ' (' + h.teamTricks[k] + ')'; if (BatakCore.teamOf(h.bidder) === k) txt = '★' + h.bid + ' ' + txt; }
      else if (h.bidder === k) txt = '★' + h.bid + ' ' + txt;
      td.textContent = txt;
      if (d < 0) td.className = 'neg';
      tr.append(td);
    });
    tb.append(tr);
  });
  if (!v.history.length){ const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = cols.length + 1; td.className = 'muted'; td.textContent = 'Henüz biten el yok'; tr.append(td); tb.append(tr); }
  t.querySelectorAll('tfoot td').forEach((td, i) => { td.textContent = v.scores[cols[i]]; });
  wrap.append(t);
  return wrap;
}

function btOverlay(el, ctx){
  const { s, v, seat, names } = ctx;
  if ((v.phase !== 'handover' && v.phase !== 'gameover') || !v.result){ el.hidden = true; el.innerHTML = ''; el.dataset.k = ''; return; }
  const wait = (ctx.ui.holdUntil || 0) - Date.now();
  if (wait > 0){
    el.hidden = true; el.dataset.k = '';
    clearTimeout(ctx.ui.holdTimer);
    ctx.ui.holdTimer = setTimeout(() => btRerender(s.id), wait + 30);
    return;
  }
  const key = v.handNo + ':' + v.phase;
  if (el.dataset.k === key && !el.hidden) return;     // aynı sonucu yeniden çizme (düğme titremesin)
  el.dataset.k = key;
  el.hidden = false; el.innerHTML = '';
  const r = v.result;
  const card = document.createElement('div'); card.className = 'bt-result';
  const h = document.createElement('h3');
  const myTeamSide = k => seat >= 0 && (k === seat || (v.team && BatakCore.teamOf(k) === BatakCore.teamOf(seat)));
  if (v.variant === 'kozmaca'){
    const madeN = r.made.filter(Boolean).length;
    h.textContent = seat >= 0 ? (r.made[seat] ? '✅ Sözünü tutturdun!' : '💥 Battın!') : '🏁 El bitti · ' + madeN + ' kişi tutturdu';
  } else {
    const who = v.team ? btTeamName(r.bidder) + ' (' + names[r.bidder] + ')' : names[r.bidder];
    const took = v.team ? r.teamTricks[BatakCore.teamOf(r.bidder)] : r.tricks[r.bidder];
    h.textContent = r.made ? '✅ ' + who + ' ' + r.bid + ' dedi, ' + took + ' aldı' : '💥 ' + who + ' battı! ' + r.bid + ' dedi, ' + took + ' aldı';
  }
  card.append(h);
  if (r.forced) card.append(Object.assign(document.createElement('p'), { className: 'bt-pnote', textContent: 'Herkes pas dediği için ihale dağıtana kaldı.' }));
  // bu elin satırları
  const t = document.createElement('table'); t.className = 'bt-sc res';
  const over = v.phase === 'gameover';
  const rows = v.team ? [0, 1] : [0, 1, 2, 3];
  if (over) rows.sort((a, b) => r.totals[b] - r.totals[a]);
  const medal = i => over ? ['🥇 ', '🥈 ', '🥉 ', ''][i] || '' : '';
  const hdr = v.variant === 'kozmaca' ? ['', 'Söz', 'Aldı', 'Bu el', 'Toplam'] : ['', 'Aldı', 'Bu el', 'Toplam'];
  t.innerHTML = '<thead><tr>' + hdr.map(x => '<th>' + x + '</th>').join('') + '</tr></thead><tbody></tbody>';
  const tb = t.querySelector('tbody');
  rows.forEach((k, ri) => {
    const tr = document.createElement('tr');
    if (myTeamSide(k)) tr.className = 'me';
    const cells = [];
    cells.push(medal(v.team ? (ri ? 9 : 0) : ri) + (v.team ? btTeamName(k) + ' · ' + names[k] + ' & ' + names[k + 2] : names[k] + (v.variant !== 'kozmaca' && r.bidder === k ? ' ★' : '')));
    if (v.variant === 'kozmaca') cells.push(r.bids[k]);
    cells.push(v.team ? r.teamTricks[k] : r.tricks[k]);
    cells.push((r.delta[k] > 0 ? '+' : '') + r.delta[k]);
    cells.push(r.totals[k]);
    cells.forEach((c, i) => { const td = document.createElement(i ? 'td' : 'th'); td.textContent = c; if (i === cells.length - 2 && r.delta[k] < 0) td.className = 'neg'; tr.append(td); });
    tb.append(tr);
  });
  card.append(t);
  const acts = document.createElement('div'); acts.className = 'bt-res-acts';
  const sb = document.createElement('button'); sb.className = 'btn'; sb.textContent = '📋 Puan tablosu';
  sb.onclick = () => { ctx.ui.showScores = true; btRerender(s.id); };
  if (v.phase === 'gameover'){
    const fin = document.createElement('h3'); fin.className = 'gold';
    const w = v.winners || [];
    if (v.team) fin.textContent = '🏆 ' + btTeamName(w[0]) + ' kazandı: ' + names[w[0] % 2] + ' & ' + names[w[0] % 2 + 2];
    else fin.textContent = '🏆 Oyunu ' + w.map(k => names[k]).join(' ve ') + ' kazandı (' + v.scores[w[0]] + ' puan)';
    card.append(fin);
    if (typeof peer !== 'undefined' && peer && s.owner === peer.id){
      const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = '↻ Yeni oyun';
      b.onclick = () => tableAct({ type: 'newMatch' });
      acts.append(b, sb); card.append(acts);
    } else { acts.append(sb); card.append(acts, Object.assign(document.createElement('p'), { className: 'bt-pnote', textContent: 'Masa sahibi yeni oyunu başlatabilir.' })); }
  } else {
    if (seat >= 0){
      const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = 'Sonraki el ▶';
      b.onclick = () => { b.disabled = true; tableAct({ type: 'nextHand' }); };
      acts.append(b);
    }
    acts.append(sb); card.append(acts);
    card.append(Object.assign(document.createElement('p'), { className: 'bt-pnote', textContent: 'Sonraki el birkaç saniye içinde kendiliğinden başlar · El ' + v.handNo + '/' + v.hands }));
  }
  el.append(card);
}

// son olayı canlandır: kart uçuşu, el toplama, ihale balonu, sıra sesi
function btAnimate(ctx){
  const { v, lv, seat, ui, root, rel, names } = ctx;
  const prev = lv.prev;
  const mineNow = seat >= 0 && v.turn === seat && ['bid', 'trump', 'play'].includes(v.phase);
  const minePrev = prev && seat >= 0 && prev.turn === seat && ['bid', 'trump', 'play'].includes(prev.phase) && prev.handNo === v.handNo;
  const L = v.last;
  const fresh = L && L.at !== ui.lastSeq;
  const first = ui.lastSeq === 0;
  if (L) ui.lastSeq = L.at;
  if (!fresh || first) return;          // aynı görünüm yeniden çizildi: ses/animasyon yok
  if (mineNow && !minePrev) gameSound('turn');
  const seatEl = k => root.querySelector('.bt-seat.' + BT_POS[rel(k)]);
  const rm = reducedMotion();
  if (L.type === 'play'){
    gameSound('tile');
    const tc = root.querySelector('.bt-trick .bt-card[data-c="' + L.card + '"]');
    if (tc && !rm){
      let from = null;
      if (L.p === seat && ui.clickRect) from = ui.clickRect;
      else { const se = seatEl(L.p); if (se) from = se.getBoundingClientRect(); }
      ui.clickRect = null;
      if (from){
        const to = tc.getBoundingClientRect();
        const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
        tc.animate([{ transform: `translate(${dx}px,${dy}px) rotate(${dx > 0 ? 25 : -25}deg) scale(.8)`, opacity: 0.4 }, { transform: getComputedStyle(tc).transform === 'none' ? 'none' : getComputedStyle(tc).transform, opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.25,.8,.3,1)' });
      }
    }
    if (L.trickDone){
      const key = v.lastTrick.no + ':' + v.handNo;
      const winnerEl = seatEl(L.winner);
      setTimeout(() => btCollect(root, key, winnerEl, ui), rm ? 1300 : 1100);
    }
  } else if (L.type === 'bid' || L.type === 'pass' || L.type === 'forced'){
    const se = seatEl(L.p);
    if (se){
      const bub = document.createElement('div'); bub.className = 'bt-bubble';
      bub.textContent = L.type === 'pass' ? 'Pas' : L.type === 'forced' ? 'Mecburen ' + L.value : (v.variant === 'kozmaca' ? 'Söz: ' + L.value : L.value + '!');
      se.append(bub);
      setTimeout(() => bub.remove(), 1800);
    }
    gameSound('tile');
  } else if (L.type === 'trump'){
    const k = root.querySelector('.bt-koz');
    if (k && !rm) k.animate([{ transform: 'scale(1.5)', filter: 'brightness(1.8)' }, { transform: 'none', filter: 'none' }], { duration: 600, easing: 'cubic-bezier(.3,1.5,.5,1)' });
    if (L.p !== seat) toast('Koz ' + BatakCore.SUIT_NAMES[L.suit] + ' ' + BatakCore.SUITS[L.suit] + ' · ' + names[L.p]);
    gameSound('turn');
  }
  if (L.handEnd){
    const r = v.result;
    const ov = root.querySelector('.bt-overlay');
    let good = false;
    if (seat >= 0){
      if (v.variant === 'kozmaca') good = r.made[seat];
      else good = r.delta[seat] > 0 && (r.bidder === seat || (v.team && BatakCore.teamOf(r.bidder) === BatakCore.teamOf(seat)) ? r.made : true);
    }
    setTimeout(() => {
      gameSound('win');
      if (L.gameEnd && seat >= 0 && (v.winners || []).some(k => k === seat || (v.team && BatakCore.teamOf(k) === BatakCore.teamOf(seat)))) confetti(ov || root);
      else if (good && seat >= 0 && (v.variant === 'kozmaca' || (r.made && (r.bidder === seat || (v.team && BatakCore.teamOf(r.bidder) === BatakCore.teamOf(seat)))))) confetti(ov || root);
    }, Math.max(300, (ui.holdUntil || 0) - Date.now() + 100));
  }
}
// tamamlanan eli kazananın önüne topla
function btCollect(root, key, winnerEl, ui){
  const tr = root.querySelector('.bt-trick.done');
  if (!tr || ui.collected === key) return;
  const cards = [...tr.querySelectorAll('.bt-card')];
  ui.collected = key;
  if (!cards.length) return;
  if (reducedMotion() || !winnerEl){ cards.forEach(c => c.remove()); return; }
  const to = winnerEl.getBoundingClientRect();
  cards.forEach((c, i) => {
    const a = c.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (a.left + a.width / 2), dy = to.top + to.height / 2 - (a.top + a.height / 2);
    const an = c.animate([{ transform: getComputedStyle(c).transform, opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.35) rotate(${i * 8 - 12}deg)`, opacity: 0 }], { duration: 480, delay: i * 40, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' });
    an.onfinish = () => c.remove();
  });
  winnerEl.classList.remove('took'); void winnerEl.offsetWidth; winnerEl.classList.add('took');
}
