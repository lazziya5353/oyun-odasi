// Okey masası: ıstaka (sürükle-bırak), ortadaki taşlar, atılan taşlar, 101 perleri, animasyonlar.
// Yerleşim: ben alttayım; sağımda sıradaki oyuncu, karşımda bir sonraki, solumda benden önceki.
// Herkes attığı taşı sağına koyar; ben solumdaki (benden önceki oyuncunun attığı) taşı alabilirim.
const okRacks = new Map();     // masa id → { slots:[26], sig }
const okUI = new Map();        // masa id → { sel:Set, stage:[[ids]], lastSeq, lastResult }
const CORNER = ['br', 'tr', 'tl', 'bl'];      // göreli koltuk → atılan taşlarının durduğu köşe
const COLOR_CLS = ['c0', 'c1', 'c2', 'c3'];

function okState(tid){ if (!okUI.has(tid)) okUI.set(tid, { sel: new Set(), stage: [], lastSeq: 0 }); return okUI.get(tid); }
function tileEl(id, ctx, opts){
  opts = opts || {};
  const t = document.createElement('div');
  if (id === null || id === undefined || opts.back){ t.className = 'tile back'; return t; }
  const fake = OkeyCore.isFake(id);
  t.className = 'tile ' + (fake ? 'fake' : COLOR_CLS[OkeyCore.colorOf(id)]);
  t.dataset.id = id;
  const n = document.createElement('b');
  n.textContent = fake ? '✿' : OkeyCore.numOf(id);
  t.append(n);
  const dot = document.createElement('i'); t.append(dot);
  if (ctx && OkeyCore.isWild(id, ctx)){ t.classList.add('wild'); t.title = 'Okey (joker)'; }
  if (fake) t.title = 'Sahte okey: okeyin yerine geçer';
  return t;
}
// ıstakadaki diziliş: kişi taşlarını kendi düzenler, yeni gelen taş sağ alta yerleşir
function syncRack(tid, hand){
  let r = okRacks.get(tid);
  if (!r){ r = { slots: new Array(26).fill(null) }; okRacks.set(tid, r); hand.forEach((id, i) => r.slots[i < 13 ? i : i] = id); return r; }
  const inHand = new Set(hand);
  r.slots = r.slots.map(id => id !== null && inHand.has(id) ? id : null);
  const placed = new Set(r.slots.filter(x => x !== null));
  hand.forEach(id => {
    if (placed.has(id)) return;
    let k = -1;
    for (let i = 25; i >= 0; i--) if (r.slots[i] === null && (i === 25 || r.slots[i + 1] !== null || i === 12)) { k = i; break; }
    if (k < 0) k = r.slots.lastIndexOf(null);
    r.slots[k] = id; placed.add(id);
  });
  return r;
}
function autoSort(tid, ctx, mode){
  const r = okRacks.get(tid); if (!r) return;
  const hand = r.slots.filter(x => x !== null);
  const key = id => { const t = OkeyCore.ident(id, ctx); return t ? t : { c: 9, n: 99 }; };
  let groups = [];
  if (mode === 'pairs'){
    const m = new Map();
    hand.forEach(id => { const t = key(id); const k = t.c + ':' + t.n; if (!m.has(k)) m.set(k, []); m.get(k).push(id); });
    const pairs = [], singles = [];
    m.forEach(l => (l.length >= 2 ? pairs : singles).push(l));
    pairs.sort((a, b) => key(a[0]).n - key(b[0]).n);
    singles.sort((a, b) => key(a[0]).c - key(b[0]).c || key(a[0]).n - key(b[0]).n);
    groups = pairs.concat([[].concat(...singles)]);
  } else {
    // renge göre, her renkte sayıya göre; ardışık olmayanlar arasında boşluk
    const byC = [[], [], [], [], []];
    hand.forEach(id => { const t = key(id); byC[t.c === 9 ? 4 : t.c].push(id); });
    byC.forEach(l => l.sort((a, b) => key(a).n - key(b).n));
    groups = byC.filter(l => l.length);
  }
  const slots = new Array(26).fill(null);
  let pos = 0;
  groups.forEach(g => {
    if (pos % 13 + g.length > 13 && pos % 13 !== 0 && g.length <= 13) pos = Math.ceil(pos / 13) * 13;
    g.forEach(id => { if (pos < 26) slots[pos++] = id; });
    if (pos % 13 !== 0) pos++;
  });
  // sığmayanları boşluklara koy
  const left = hand.filter(id => !slots.includes(id));
  left.forEach(id => { const k = slots.indexOf(null); slots[k] = id; });
  r.slots = slots;
}

function renderOkey(body, s, lv){
  const v = lv.v, seat = lv.seat, me_ = seat >= 0 ? seat : 0;
  const ctx = OkeyCore.makeCtx(v.indicator);
  const ui = okState(s.id);
  const rel = k => (k - me_ + 4) % 4;
  const abs = r => (r + me_) % 4;
  const is101 = v.variant === '101';
  const myTurn = seat >= 0 && v.turn === seat && v.phase === 'play';
  let root = body.querySelector('.okey');
  if (!root){
    body.innerHTML = '';
    root = document.createElement('div'); root.className = 'okey';
    root.innerHTML =
      '<div class="ok-table">' +
        '<div class="ok-seat r2"></div><div class="ok-seat r1"></div><div class="ok-seat r3"></div>' +
        '<div class="ok-disc tl"></div><div class="ok-disc tr"></div><div class="ok-disc bl"></div><div class="ok-disc br"></div>' +
        '<div class="ok-center"><div class="ok-pile"></div><div class="ok-ind"></div><div class="ok-finish" title="Bitirmek için atacağın taşı buraya bırak">Bitir</div><div class="ok-melds"></div></div>' +
        '<div class="ok-overlay" hidden></div>' +
      '</div>' +
      '<div class="ok-me"></div>' +
      '<div class="ok-stage" hidden></div>' +
      '<div class="ok-rack"></div>' +
      '<div class="ok-controls"></div>' +
      '<div class="ok-scores"></div>';
    body.append(root);
  }
  root.classList.toggle('v101', is101);
  root.classList.toggle('spect', seat < 0);
  const names = s.seats.map(x => x ? x.name : '—');

  // oyuncular
  [1, 2, 3].forEach(r => {
    const k = abs(r);
    okSeatBox(root.querySelector('.ok-seat.r' + r), s, v, k, names, ctx);
  });
  okSeatBox(root.querySelector('.ok-me'), s, v, me_, names, ctx, true);

  // atılan taşlar (her oyuncunun sağında)
  for (let k = 0; k < 4; k++){
    const box = root.querySelector('.ok-disc.' + CORNER[rel(k)]);
    box.innerHTML = '';
    const pileTop = v.discards[k].slice(-1)[0];
    const stack = document.createElement('div'); stack.className = 'disc-stack';
    if (v.discardCounts[k] > 1){ const b = tileEl(v.discards[k].slice(-2)[0], ctx); b.classList.add('under'); stack.append(b); }
    if (pileTop !== undefined) stack.append(tileEl(pileTop, ctx));
    else { const e = document.createElement('div'); e.className = 'tile empty'; stack.append(e); }
    box.append(stack);
    box.dataset.seat = k;
    // solumdaki taşı alabilirim
    const canTake = myTurn && !v.drew && rel(k) === 3 && pileTop !== undefined;
    box.classList.toggle('can', canTake);
    box.onclick = canTake ? () => { tableAct({ type: 'draw', from: 'left' }); } : null;
    box.title = rel(k) === 0 ? 'Senin attığın taşlar' : rel(k) === 3 ? 'Solundaki oyuncunun attığı: alabilirsin' : names[k] + ' attı';
    if (rel(k) === 0) box.classList.add('mine'); else box.classList.remove('mine');
  }

  // orta: deste + gösterge
  const pile = root.querySelector('.ok-pile');
  pile.innerHTML = '';
  const stack = document.createElement('div'); stack.className = 'pile-stack';
  for (let i = 0; i < Math.min(4, Math.ceil(v.pileCount / 6)); i++){ const b = tileEl(null, ctx, { back: true }); b.style.transform = `translate(${i * 2}px,${-i * 2}px)`; stack.append(b); }
  const cnt = document.createElement('span'); cnt.className = 'pile-count'; cnt.textContent = v.pileCount;
  pile.append(stack, cnt);
  const canDraw = myTurn && !v.drew && v.pileCount > 0;
  pile.classList.toggle('can', canDraw);
  pile.onclick = canDraw ? () => tableAct({ type: 'draw', from: 'pile' }) : null;
  pile.title = canDraw ? 'Ortadan taş çek' : 'Ortadaki taşlar';
  const ind = root.querySelector('.ok-ind');
  ind.innerHTML = '';
  const it = tileEl(v.indicator, null); it.classList.add('indicator');
  const il = document.createElement('span'); il.className = 'note';
  const okeyName = OkeyCore.COLORS[v.okey.c] + ' ' + v.okey.n;
  il.textContent = 'Gösterge · Okey: ' + okeyName;
  ind.append(it, il);
  const fin = root.querySelector('.ok-finish');
  fin.hidden = is101 || !(myTurn && v.drew);

  // 101: masadaki perler
  const melds = root.querySelector('.ok-melds');
  melds.innerHTML = '';
  if (is101) okRenderMelds(melds, s, v, seat, ctx, ui, names);

  // ıstaka
  okRenderRack(root, s, v, seat, ctx, ui);
  // 101 hazırlık alanı
  okRenderStage(root.querySelector('.ok-stage'), s, v, seat, ctx, ui);
  // düğmeler
  okControls(root.querySelector('.ok-controls'), s, v, seat, ctx, ui, names);
  // puanlar
  okScores(root.querySelector('.ok-scores'), s, v, names);
  // el sonu
  okOverlay(root.querySelector('.ok-overlay'), s, v, seat, ctx, names);
  // animasyon
  okAnimate(root, s, v, lv, me_, ctx, names);
}

function okSeatBox(el, s, v, k, names, ctx, isMe){
  const x = s.seats[k];
  el.innerHTML = '';
  el.classList.toggle('turn', v.phase === 'play' && v.turn === k);
  el.dataset.seat = k;
  const av = document.createElement('div'); av.className = 'ok-av';
  av.textContent = x && x.bot ? '🤖' : initial(names[k]);
  if (x && !x.bot){ av.style.setProperty('--c', colorFor(x.id)); av.dataset.treatFor = x.id; }
  const info = document.createElement('div'); info.className = 'ok-info';
  const nm = document.createElement('b'); nm.textContent = names[k] + (isMe && s.seats[k] && s.seats[k].id === (peer && peer.id) ? ' (sen)' : '');
  const sub = document.createElement('span'); sub.className = 'note';
  const parts = [];
  if (v.variant === '101'){ parts.push('Toplam ' + v.scores[k]); if (v.opened && v.opened[k]) parts.push(v.opened[k] === 'pairs' ? 'çiftle açtı' : 'açtı'); }
  else if (v.team){ parts.push((k % 2 ? 'Takım B' : 'Takım A') + ' · ' + v.scores[k % 2] + ' puan'); }
  else parts.push(v.scores[k] + ' puan');
  if (v.dealer === k) parts.push('dağıttı');
  sub.textContent = parts.join(' · ');
  info.append(nm, sub);
  el.append(av, info);
  if (!isMe){
    const backs = document.createElement('div'); backs.className = 'ok-backs';
    const n = v.counts[k];
    for (let i = 0; i < Math.min(n, 15); i++){ const b = document.createElement('i'); backs.append(b); }
    const c = document.createElement('span'); c.textContent = n; backs.append(c);
    el.append(backs);
  }
  if (v.phase === 'play' && v.turn === k){ const t = document.createElement('span'); t.className = 'ok-turn'; t.textContent = isMe ? 'Sıra sende' : 'Sırada'; el.append(t); }
  if (v.shown && v.shown[k]){ const g = document.createElement('span'); g.className = 'pill'; g.textContent = 'gösterge'; el.append(g); }
}

function okRenderRack(root, s, v, seat, ctx, ui){
  const rack = root.querySelector('.ok-rack');
  rack.innerHTML = '';
  if (seat < 0){ rack.innerHTML = '<p class="note">Seyirci olarak izliyorsun. Taşları sadece oyuncular görür.</p>'; return; }
  // yeni el: ıstakayı sıfırla ve renklere göre diz
  const old = okRacks.get(s.id);
  if (old && old.handNo !== v.handNo){ okRacks.delete(s.id); ui.stage = []; ui.sel.clear(); }
  const fresh = !okRacks.get(s.id);
  const r = syncRack(s.id, v.hand || []);
  r.handNo = v.handNo;
  if (fresh) autoSort(s.id, ctx, 'runs');
  const staged = new Set([].concat(...ui.stage));
  ui.sel.forEach(id => { if (!(v.hand || []).includes(id)) ui.sel.delete(id); });
  const myTurn = v.turn === seat && v.phase === 'play';
  r.slots.forEach((id, k) => {
    const slot = document.createElement('div'); slot.className = 'slot'; slot.dataset.slot = k;
    if (id !== null){
      const t = tileEl(id, ctx);
      if (ui.sel.has(id)) t.classList.add('sel');
      if (staged.has(id)){ t.classList.add('staged'); t.dataset.g = ui.stage.findIndex(m => m.includes(id)) + 1; }
      okDraggable(t, s, v, seat, ctx, ui, myTurn);
      slot.append(t);
    }
    rack.append(slot);
  });
}
// taş: tıkla = seç, çift tıkla = at, sürükle = ıstakada yer değiştir / atma alanına bırak
function okDraggable(t, s, v, seat, ctx, ui, myTurn){
  const id = +t.dataset.id;
  let sx = 0, sy = 0, drag = null, moved = false;
  t.onpointerdown = e => {
    if (e.button !== 0) return;
    sx = e.clientX; sy = e.clientY; moved = false;
    t.setPointerCapture(e.pointerId);
    const move = ev => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      if (!moved){
        moved = true;
        holdRender(true);
        const rc = t.getBoundingClientRect();
        drag = t.cloneNode(true); drag.classList.add('dragging');
        drag.style.width = rc.width + 'px'; drag.style.height = rc.height + 'px';
        document.body.append(drag);
        t.classList.add('ghost');
      }
      drag.style.left = (ev.clientX - drag.offsetWidth / 2) + 'px';
      drag.style.top = (ev.clientY - drag.offsetHeight / 2) + 'px';
      okDropHint(ev.clientX, ev.clientY);
    };
    const up = ev => {
      t.removeEventListener('pointermove', move); t.removeEventListener('pointerup', up); t.removeEventListener('pointercancel', up);
      okDropHint(-1, -1);
      if (!moved){ okClickTile(id, s, v, seat, ctx, ui, myTurn); return; }
      drag.remove(); t.classList.remove('ghost');
      // bırakırken en güncel görünümü kullan (sürükleme sırasında sıra değişmiş olabilir)
      const lv2 = lastViews.get(s.id);
      const v2 = lv2 ? lv2.v : v;
      const myTurn2 = seat >= 0 && v2.turn === seat && v2.phase === 'play';
      okDrop(id, ev.clientX, ev.clientY, s, v2, seat, ctx, ui, myTurn2);
      holdRender(false);
    };
    t.addEventListener('pointermove', move); t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up);
  };
  t.ondblclick = () => { if (myTurn && v.drew) okDiscard(id, false, s, v, ctx, ui); };
}
function okElAt(x, y, sel){ const els = document.elementsFromPoint(x, y); return els.find(e => e.matches && e.matches(sel)) || null; }
function okDropHint(x, y){
  document.querySelectorAll('.drop-hot').forEach(e => e.classList.remove('drop-hot'));
  if (x < 0) return;
  const z = okElAt(x, y, '.ok-disc.br, .ok-finish:not([hidden]), .meld.can, .slot');
  if (z) z.classList.add('drop-hot');
}
function okDrop(id, x, y, s, v, seat, ctx, ui, myTurn){
  const slot = okElAt(x, y, '.slot');
  if (slot){
    const r = okRacks.get(s.id); const to = +slot.dataset.slot, from = r.slots.indexOf(id);
    if (from >= 0 && to !== from){ const other = r.slots[to]; r.slots[to] = id; r.slots[from] = other; renderOpenTable(); }
    return;
  }
  if (okElAt(x, y, '.ok-disc.br')){ if (myTurn && v.drew) okDiscard(id, false, s, v, ctx, ui); else toast('Önce taş çekmelisin'); return; }
  if (okElAt(x, y, '.ok-finish:not([hidden])')){ okDiscard(id, true, s, v, ctx, ui); return; }
  const m = okElAt(x, y, '.meld');
  if (m && v.variant === '101'){ tableAct({ type: 'layoff', tile: id, mid: m.dataset.mid }); ui.sel.clear(); }
}
function okClickTile(id, s, v, seat, ctx, ui, myTurn){
  if (v.variant === '101'){ if (ui.sel.has(id)) ui.sel.delete(id); else ui.sel.add(id); }
  else { const had = ui.sel.has(id); ui.sel.clear(); if (!had) ui.sel.add(id); }
  gameSound('tile');
  renderOpenTable();
}
function okDiscard(id, finish, s, v, ctx, ui){
  if (finish && !v.drew){ toast('Bitirmek için önce taş çekmelisin'); return; }
  if (finish){
    const r = OkeyCore.checkFinish(v.hand, id, ctx);
    if (!r.ok){ toast('Elin henüz bitmedi: kalan 14 taşın hepsi per ya da 7 çift olmalı'); gameSound('err'); return; }
  }
  ui.sel.delete(id);
  tableAct({ type: 'discard', tile: id, finish });
}

function okRenderMelds(box, s, v, seat, ctx, ui, names){
  if (!v.table.length){ box.innerHTML = '<p class="note">Henüz kimse açmadı. Açmak için perlerinin toplamı en az 101 olmalı (ya da 5 çift).</p>'; return; }
  const byOwner = new Map();
  v.table.forEach(m => { if (!byOwner.has(m.owner)) byOwner.set(m.owner, []); byOwner.get(m.owner).push(m); });
  const canLay = seat >= 0 && v.turn === seat && v.drew && v.opened[seat] && v.phase === 'play';
  const selOne = ui.sel.size === 1 ? [...ui.sel][0] : null;
  byOwner.forEach((list, owner) => {
    const row = document.createElement('div'); row.className = 'meld-row';
    const nm = document.createElement('span'); nm.className = 'meld-owner'; nm.textContent = names[owner];
    row.append(nm);
    list.forEach(m => {
      const el = document.createElement('div'); el.className = 'meld ' + m.type; el.dataset.mid = m.mid;
      m.ids.forEach(id => el.append(tileEl(id, ctx)));
      if (m.type !== 'pair'){ const val = document.createElement('span'); val.className = 'meld-val'; val.textContent = m.value; el.append(val); }
      const ok = canLay && selOne !== null && OkeyCore.canLayOff(m, selOne, ctx);
      if (ok){ el.classList.add('can'); el.onclick = () => { tableAct({ type: 'layoff', tile: selOne, mid: m.mid }); ui.sel.clear(); }; el.title = 'Seçili taşı bu pere işle'; }
      row.append(el);
    });
    box.append(row);
  });
}
function okRenderStage(el, s, v, seat, ctx, ui){
  if (v.variant !== '101' || seat < 0 || !ui.stage.length){ el.hidden = true; return; }
  el.hidden = false; el.innerHTML = '';
  ui.stage = ui.stage.filter(m => m.every(id => (v.hand || []).includes(id)));
  let total = 0, pairs = 0;
  const head = document.createElement('div'); head.className = 'stage-head';
  ui.stage.forEach((m, i) => {
    const r = OkeyCore.validateMeld(m, ctx);
    const g = document.createElement('div'); g.className = 'meld staged' + (r.ok ? '' : ' bad');
    m.forEach(id => g.append(tileEl(id, ctx)));
    const val = document.createElement('span'); val.className = 'meld-val';
    val.textContent = !r.ok ? 'geçersiz' : r.type === 'pair' ? 'çift' : r.value;
    g.append(val);
    const x = document.createElement('button'); x.className = 'rc-btn'; x.textContent = '✕'; x.title = 'Bu peri çıkar';
    x.onclick = () => { ui.stage.splice(i, 1); renderOpenTable(); };
    g.append(x);
    el.append(g);
    if (r.ok){ if (r.type === 'pair') pairs++; else total += r.value; }
  });
  head.textContent = pairs ? 'Çiftler: ' + pairs + ' / 5' : 'Açış toplamı: ' + total + ' / 101';
  head.classList.toggle('ready', pairs >= 5 || total >= 101);
  el.prepend(head);
}

function okControls(ctl, s, v, seat, ctx, ui, names){
  ctl.innerHTML = '';
  const B = (label, fn, cls, title) => { const b = document.createElement('button'); b.className = 'btn ' + (cls || ''); b.textContent = label; b.onclick = fn; if (title) b.title = title; ctl.append(b); return b; };
  const note = t => ctl.append(Object.assign(document.createElement('span'), { className: 'note', textContent: t }));
  if (seat < 0){ note('Seyircisin · ' + (v.phase === 'play' ? names[v.turn] + ' oynuyor' : '')); return; }
  const myTurn = v.turn === seat && v.phase === 'play';
  const is101 = v.variant === '101';
  B('Seri diz', () => { autoSort(s.id, ctx, 'runs'); renderOpenTable(); }, 'small');
  B('Çift diz', () => { autoSort(s.id, ctx, 'pairs'); renderOpenTable(); }, 'small');
  // gösterge
  if (!is101 && v.firstMove && v.firstMove[seat] && !v.shown[seat] && (v.hand || []).some(id => !OkeyCore.isFake(id) && OkeyCore.colorOf(id) === OkeyCore.colorOf(v.indicator) && OkeyCore.numOf(id) === OkeyCore.numOf(v.indicator)))
    B('⭐ Göstergeyi göster (+1)', () => tableAct({ type: 'show' }), 'primary', 'Elindeki gösterge taşını göster; diğerleri 1 puan kaybeder');
  const sel = [...ui.sel];
  if (v.phase !== 'play') return;
  if (!myTurn){ note(names[v.turn] + ' oynuyor…'); }
  else if (!v.drew){
    if (v.pileCount > 0) note('Ortadan taş çek ya da solundaki taşı al');
    else {
      note('Ortada taş kalmadı');
      B('Pas geç (el berabere biter)', () => tableAct({ type: 'pass' }), 'small');
    }
  } else {
    if (!is101){
      const one = sel.length === 1 ? sel[0] : null;
      B('⬇ At', () => one !== null ? okDiscard(one, false, s, v, ctx, ui) : toast('Atacağın taşı seç (ya da sağ alttaki alana sürükle)'), one !== null ? 'primary' : '');
      B('✓ Bitir', () => one !== null ? okDiscard(one, true, s, v, ctx, ui) : toast('Bitirirken atacağın taşı seç'), '', 'Seçili taşı atıp elini aç');
      note('Taşı seçip “At”a bas, çift tıkla ya da sağ alttaki alana sürükle');
    } else {
      const opened = v.opened[seat];
      if (v.tookTile !== null && v.tookTile !== undefined && (v.hand || []).includes(v.tookTile)) B('↩ Yandan aldığımı geri ver', () => tableAct({ type: 'giveBack' }), 'small');
      if (!opened){
        B('➕ Seçileni pere ekle', () => {
          if (sel.length < 2) { toast('Per için en az 2 taş seç (çift için 2, seri/per için 3+)'); return; }
          const r = OkeyCore.validateMeld(sel, ctx);
          if (!r.ok){ toast('Bu taşlar geçerli bir per değil'); gameSound('err'); return; }
          ui.stage.push(sel); ui.sel.clear(); renderOpenTable();
        }, 'small');
        B('💡 Per öner', () => {
          const best = OkeyCore.bestMelds(v.hand, ctx, 120);
          const pr = OkeyCore.pairsIn(v.hand, ctx);
          if (best.value >= 101 || pr.pairs.length < 5) ui.stage = best.melds.map(m => m.ids);
          else ui.stage = pr.pairs.slice(0, Math.max(5, pr.pairs.length));
          ui.sel.clear(); renderOpenTable();
          if (!ui.stage.length) toast('Elinde per bulamadım');
        }, 'small', 'Elindeki en yüksek perleri hazırlar');
        if (ui.stage.length) B('🃏 Aç', () => { tableAct({ type: 'open', melds: ui.stage }); ui.stage = []; }, 'primary');
      } else {
        B('⬆ Seçileni per indir', () => {
          if (sel.length < 2) { toast('İndireceğin perin taşlarını seç'); return; }
          tableAct({ type: 'meld', ids: sel }); ui.sel.clear();
        }, 'small');
        note('İşlemek için taşı seç, sonra masadaki parlayan pere tıkla');
      }
      const one = sel.length === 1 ? sel[0] : null;
      B('⬇ At', () => one !== null ? okDiscard(one, false, s, v, ctx, ui) : toast('Atacağın tek taşı seç'), one !== null ? 'primary' : '');
    }
  }
}

function okScores(el, s, v, names){
  el.innerHTML = '';
  const t = document.createElement('div'); t.className = 'score-line';
  if (v.variant === '101'){
    t.textContent = 'El ' + v.handNo + ' / ' + v.hands101 + ' · Toplam ceza puanları (düşük olan kazanır): ' + names.map((n, k) => n + ' ' + v.scores[k]).join(' · ');
  } else if (v.team){
    t.textContent = 'Takım A (' + names[0] + ', ' + names[2] + '): ' + v.scores[0] + ' · Takım B (' + names[1] + ', ' + names[3] + '): ' + v.scores[1] + ' · 0\'a düşen kaybeder';
  } else t.textContent = 'Puanlar (20\'den düşer, 0\'a inen oyunu bitirir): ' + names.map((n, k) => n + ' ' + v.scores[k]).join(' · ');
  el.append(t);
}

function okOverlay(el, s, v, seat, ctx, names){
  if (v.phase === 'play' || !v.result){ el.hidden = true; return; }
  el.hidden = false; el.innerHTML = '';
  const r = v.result;
  const card = document.createElement('div'); card.className = 'ok-result';
  const h = document.createElement('h3');
  if (r.type === 'win'){
    const why = [];
    if (r.pairs) why.push(v.variant === '101' ? 'çiftle' : '7 çift');
    if (r.okeyDiscard) why.push('okey atarak');
    h.textContent = (r.winner === seat ? '🎉 Elini bitirdin' : '🏁 ' + names[r.winner] + ' elini bitirdi') + (why.length ? ' · ' + why.join(', ') : '');
    card.append(h);
    const hand = document.createElement('div'); hand.className = 'res-hand';
    const winHand = v.hands ? v.hands[r.winner] : r.hand;
    (winHand || []).forEach(id => hand.append(tileEl(id, ctx)));
    if (v.variant !== '101') card.append(hand);
    const p = document.createElement('p');
    if (v.variant === '101'){
      p.textContent = 'Bu elin puanları: ' + names.map((n, k) => n + ' ' + (r.hand[k] > 0 ? '+' : '') + r.hand[k] + (r.penalty && r.penalty[k] ? ' (ceza ' + r.penalty[k] + ')' : '')).join(' · ');
    } else p.textContent = (v.team ? 'Rakip takım' : 'Diğer herkes') + ' ' + r.points + ' puan kaybetti';
    card.append(p);
  } else {
    h.textContent = '🤝 Ortada taş bitti, el berabere';
    card.append(h);
    if (v.variant === '101' && r.hand && r.hand.some(x => x)) card.append(Object.assign(document.createElement('p'), { textContent: 'Elinde okey kalanlara 101 ceza: ' + names.map((n, k) => r.hand[k] ? n + ' +' + r.hand[k] : '').filter(Boolean).join(', ') }));
  }
  if (v.phase === 'gameover'){
    const fin = document.createElement('h3'); fin.className = 'gold';
    if (v.variant === '101'){
      const order = [0, 1, 2, 3].sort((a, b) => v.scores[a] - v.scores[b]);
      fin.textContent = '🏆 Oyunu ' + names[order[0]] + ' kazandı (' + v.scores[order[0]] + ' puan)';
    } else if (v.team){
      const w = v.scores[0] > v.scores[1] ? 0 : 1;
      fin.textContent = '🏆 Takım ' + (w ? 'B' : 'A') + ' kazandı: ' + (w ? names[1] + ' & ' + names[3] : names[0] + ' & ' + names[2]);
    } else {
      const order = [0, 1, 2, 3].sort((a, b) => v.scores[b] - v.scores[a]);
      fin.textContent = '🏆 Kazananlar: ' + names[order[0]] + ' ve ' + names[order[1]];
    }
    card.append(fin);
    if (s.owner === peer.id){ const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = '↻ Yeni oyun'; b.onclick = () => tableAct({ type: 'newMatch' }); card.append(b); }
  } else {
    const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = 'Sonraki el ▶';
    b.onclick = () => tableAct({ type: 'nextHand' });
    if (seat >= 0) card.append(b);
    card.append(Object.assign(document.createElement('p'), { className: 'note', textContent: 'Sonraki el birkaç saniye içinde kendiliğinden başlar' }));
  }
  el.append(card);
}

// son olayı animasyonla göster (taş çekme/atma, gösterge, bitiş)
function okAnimate(root, s, v, lv, me_, ctx, names){
  const ui = okState(s.id);
  const L = v.last;
  if (!L || L.at === ui.lastSeq) return;
  const first = ui.lastSeq === 0;
  ui.lastSeq = L.at;
  if (first) return;
  const rel = k => (k - me_ + 4) % 4;
  const seatEl = k => rel(k) === 0 ? root.querySelector('.ok-me') : root.querySelector('.ok-seat.r' + rel(k));
  const tbl = root.querySelector('.ok-table');
  if (L.type === 'draw'){
    gameSound('tile');
    const from = L.from === 'pile' ? root.querySelector('.ok-pile') : root.querySelector('.ok-disc.' + CORNER[rel((L.p + 3) % 4)]);
    let to = seatEl(L.p), tileId = null;
    if (rel(L.p) === 0 && lv.seat >= 0){
      const r = okRacks.get(s.id);
      const newest = (v.hand || []).find(id => !(lv.prev && lv.prev.hand || []).includes(id));
      if (newest !== undefined && r){ const k = r.slots.indexOf(newest); const slot = root.querySelectorAll('.ok-rack .slot')[k]; if (slot) to = slot; tileId = newest; }
    }
    okFly(from, to, tileId !== null ? tileEl(tileId, ctx) : tileEl(L.tile !== undefined ? L.tile : null, ctx, { back: L.from === 'pile' }), to.querySelector && to.querySelector('.tile'));
  } else if (L.type === 'discard'){
    gameSound('tile');
    const from = seatEl(L.p), to = root.querySelector('.ok-disc.' + CORNER[rel(L.p)]);
    okFly(from, to, tileEl(L.tile, ctx), to.querySelector('.disc-stack .tile:last-child'));
    if (L.penalty) toast('⚠ ' + names[L.p] + ' ' + L.why + ': +' + L.penalty + ' ceza');
  } else if (L.type === 'show'){
    const pop = document.createElement('div'); pop.className = 'ok-pop';
    pop.append(tileEl(L.tile, ctx), Object.assign(document.createElement('b'), { textContent: names[L.p] + ' göstergeyi gösterdi!' }));
    tbl.append(pop); setTimeout(() => pop.remove(), 2600);
    gameSound('turn');
  } else if (L.type === 'finish'){
    gameSound('win'); confetti(tbl);
  } else if (L.type === 'open' || L.type === 'meld' || L.type === 'layoff'){
    gameSound('tile');
    const ids = L.mids || [L.mid];
    ids.forEach(mid => { const m = root.querySelector('.meld[data-mid="' + mid + '"]'); if (m){ m.classList.add('pop'); } });
    if (L.type === 'open') toast('🃏 ' + names[L.p] + (L.kind === 'pairs' ? ' ' + L.value + ' çiftle açtı' : ' ' + L.value + ' ile açtı'));
  } else if (L.type === 'deal'){
    root.querySelectorAll('.ok-rack .tile').forEach((t, i) => { t.style.animation = `deal .35s ${i * 25}ms both cubic-bezier(.2,.8,.3,1.2)`; });
  }
}
function okFly(fromEl, toEl, tile, hideEl){
  if (!fromEl || !toEl || reducedMotion()) return;
  const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  tile.classList.add('flying');
  document.body.append(tile);
  const w = tile.offsetWidth, h = tile.offsetHeight;
  const x0 = a.left + a.width / 2 - w / 2, y0 = a.top + a.height / 2 - h / 2;
  const x1 = b.left + b.width / 2 - w / 2, y1 = b.top + b.height / 2 - h / 2;
  tile.style.left = x0 + 'px'; tile.style.top = y0 + 'px';
  if (hideEl) hideEl.style.visibility = 'hidden';
  const an = tile.animate([
    { transform: 'translate(0,0) rotate(0) scale(1)' },
    { transform: `translate(${(x1 - x0) / 2}px, ${(y1 - y0) / 2 - 40}px) rotate(${(x1 > x0 ? 8 : -8)}deg) scale(1.12)`, offset: 0.5 },
    { transform: `translate(${x1 - x0}px, ${y1 - y0}px) rotate(0) scale(1)` }
  ], { duration: 460, easing: 'cubic-bezier(.3,.7,.3,1)' });
  an.onfinish = () => { tile.remove(); if (hideEl) hideEl.style.visibility = ''; };
}
