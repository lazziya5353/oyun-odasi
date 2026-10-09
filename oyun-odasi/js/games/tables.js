// Oyun Salonu: masalar, koltuklar, seyirciler. Oyunu masayı açan kişi yönetir (kuralları onun bilgisayarı denetler).
//
// Mesajlar:
//  tb-sum   masa sahibi → herkes   : masanın özeti (oyun, koltuklar, durum)
//  tb-del   masa sahibi → herkes   : masa kapandı
//  tb-sit / tb-stand  oyuncu → sahip : oturmak / kalkmak
//  tb-watch oyuncu → sahip         : masayı izlemeye başla/bırak
//  tb-act   oyuncu → sahip         : oyun hamlesi
//  tb-view  sahip → oyuncu/seyirci : oyunun o kişiye özel görünümü (okeyde sadece kendi taşların)
const tables = new Map();       // id → özet
const owned = new Map();        // benim yönettiğim masalar: id → { sum, state, watchers:Set, timer }
const lastViews = new Map();    // id → bana gelen son görünüm
let openTable = null;           // şu an ekranda açık masa
const BOT_NAMES = ['Hüseyin Amca', 'Fadime Teyze', 'Kahveci Rıza', 'Okeyci Cemal', 'Zarcı Nuri', 'Saadet Hanım'];
const GAME_INFO = {
  tavla: { name: 'Tavla', icon: '🎲', seats: 2 },
  okey: { name: 'Okey', icon: '🀄', seats: 4 }
};
const variantName = s => s.game === 'tavla' ? 'Klasik tavla · ' + (s.opts.target || 5) + ' puan'
  : s.opts.variant === '101' ? '101 Okey · ' + (s.opts.hands101 || 5) + ' el' : 'Klasik Okey' + (s.opts.team ? ' · Eşli' : '');
const mySeat = sum => sum ? sum.seats.findIndex(x => x && !x.bot && x.id === (peer && peer.id)) : -1;

// ---------- masa aç ----------
function createTable(game, opts){
  if (!GAME_INFO[game]) return;
  const id = 't' + rid() + rid();
  const sum = {
    id, game, opts: cleanOpts(game, opts), owner: peer.id, ownerName: myName,
    seats: new Array(GAME_INFO[game].seats).fill(null), status: 'waiting', created: Date.now()
  };
  sum.seats[0] = { id: peer.id, name: myName };
  owned.set(id, { sum, state: null, watchers: new Set(), timers: [] });
  tables.set(id, sum);
  broadcast({ t: 'tb-sum', sum });
  addSys('🎲 ' + myName + ' bir ' + GAME_INFO[game].name + ' masası açtı');
  openTableView(id);
}
function cleanOpts(game, o){
  o = o || {};
  if (game === 'tavla') return { target: [1, 3, 5, 7].includes(+o.target) ? +o.target : 5 };
  return { variant: o.variant === '101' ? '101' : 'klasik', team: !!o.team && o.variant !== '101', hands101: [3, 5, 7, 11].includes(+o.hands101) ? +o.hands101 : 5 };
}
function validSum(s){
  return s && typeof s === 'object' && typeof s.id === 'string' && s.id.length < 40 && GAME_INFO[s.game] &&
    Array.isArray(s.seats) && s.seats.length === GAME_INFO[s.game].seats && typeof s.owner === 'string';
}
function cleanSum(s, from){
  return {
    id: s.id, game: s.game, opts: cleanOpts(s.game, s.opts), owner: from, ownerName: clip(s.ownerName, 20),
    status: s.status === 'playing' ? 'playing' : s.status === 'over' ? 'over' : 'waiting', created: Number(s.created) || Date.now(),
    seats: s.seats.map(x => x && typeof x === 'object' ? { id: clip(x.id, 80), name: clip(x.name, 24) || 'Oyuncu', bot: !!x.bot } : null)
  };
}

// ---------- masa sahibinin işleri ----------
function pushSum(o){ tables.set(o.sum.id, o.sum); broadcast({ t: 'tb-sum', sum: o.sum }); refreshGameDeck(); renderChannels(); if (openTable === o.sum.id) renderOpenTable(); }
function ownerSit(o, who, name, seat){
  const s = o.sum;
  if (seat < 0 || seat >= s.seats.length) return;
  const cur = s.seats[seat];
  if (cur && !cur.bot) return;                                     // dolu koltuk
  if (s.status === 'playing' && !cur) return;
  const already = s.seats.findIndex(x => x && !x.bot && x.id === who);
  if (s.status === 'playing' && already >= 0) return;             // oyun sırasında koltuk değiştirilmez
  if (already >= 0) s.seats[already] = null;
  s.seats[seat] = { id: who, name };
  if (cur && cur.bot && s.status === 'playing') addSys('🎲 ' + name + ', ' + cur.name + ' botunun yerine oturdu');
  pushSum(o); sendViews(o); pump(o);
}
function ownerStand(o, who){
  const s = o.sum;
  const k = s.seats.findIndex(x => x && !x.bot && x.id === who);
  if (k < 0) return;
  if (s.status === 'playing'){
    const leaver = s.seats[k].name;
    s.seats[k] = { id: 'bot' + k, name: 'Bot ' + BOT_NAMES[k % BOT_NAMES.length], bot: true };
    addSys('🤖 ' + leaver + ' masadan kalktı, yerine ' + s.seats[k].name + ' oynuyor');
  } else s.seats[k] = null;
  pushSum(o); sendViews(o); pump(o);
}
function ownerBot(o, seat, add){
  const s = o.sum;
  if (s.status === 'playing') return;
  if (add && !s.seats[seat]) s.seats[seat] = { id: 'bot' + seat, name: 'Bot ' + BOT_NAMES[(seat + s.id.length) % BOT_NAMES.length], bot: true };
  if (!add && s.seats[seat] && s.seats[seat].bot) s.seats[seat] = null;
  pushSum(o);
}
function ownerStart(o){
  const s = o.sum;
  if (s.seats.some(x => !x)) { toast('Önce bütün koltuklar dolmalı (boş koltuğa bot ekleyebilirsin)'); return; }
  s.status = 'playing';
  if (s.game === 'tavla') o.state = TavlaCore.newGame({ target: s.opts.target });
  else o.state = OkeyGame.newMatch(s.opts);
  o.events = [];
  addSys('🎲 ' + GAME_INFO[s.game].name + ' başladı: ' + s.seats.map(x => x.name).join(', '));
  pushSum(o); sendViews(o); pump(o);
}
function ownerClose(o){
  clearTimers(o);
  owned.delete(o.sum.id); tables.delete(o.sum.id); lastViews.delete(o.sum.id);
  broadcast({ t: 'tb-del', id: o.sum.id });
  if (openTable === o.sum.id) closeTableView();
  refreshGameDeck(); renderChannels();
}
function clearTimers(o){ (o.timers || []).forEach(clearTimeout); o.timers = []; }
function later(o, ms, fn){ const t = setTimeout(() => { o.timers = o.timers.filter(x => x !== t); if (owned.get(o.sum.id) === o) fn(); }, ms); o.timers.push(t); }

// bir oyuncunun hamlesi (masa sahibi uygular)
function ownerAct(o, who, a){
  const s = o.sum;
  if (!o.state || !a || typeof a !== 'object') return;
  const seat = s.seats.findIndex(x => x && !x.bot && x.id === who);
  if (s.game === 'tavla') tavlaOwnerAct(o, seat, a, who);
  else okeyOwnerAct(o, seat, a, who);
}
function tavlaOwnerAct(o, seat, a, who){
  const g = o.state;
  if (a.type === 'nextGame'){
    if (g.phase !== 'over') return;
    o.state = TavlaCore.nextGame(g); sendViews(o); pump(o); return;
  }
  if (a.type === 'newMatch'){
    if (g.phase !== 'matchover' || who !== o.sum.owner) return;
    o.state = TavlaCore.newGame({ target: o.sum.opts.target }); sendViews(o); pump(o); return;
  }
  if (seat < 0 || seat !== g.turn) return;
  let changed = false;
  if (a.type === 'roll' && g.phase === 'roll'){ TavlaCore.doRoll(g); changed = true; }
  else if (a.type === 'move' && g.phase === 'move'){ changed = TavlaCore.doMove(g, { from: a.from === 'bar' ? 'bar' : +a.from, to: a.to === 'off' ? 'off' : +a.to, die: +a.die }); }
  else if (a.type === 'undo' && g.phase === 'move'){ changed = TavlaCore.doUndo(g); }
  else if (a.type === 'end' && g.phase === 'move' && TavlaCore.turnDone(g)){ TavlaCore.endTurn(g); changed = true; }
  if (changed){ sendViews(o); pump(o); }
}
function okeyOwnerAct(o, seat, a, who){
  const g = o.state;
  if (a.type === 'newMatch'){
    if (g.phase !== 'gameover' || who !== o.sum.owner) return;
    o.state = OkeyGame.newMatch(o.sum.opts); sendViews(o); pump(o); return;
  }
  if (a.type === 'nextHand'){ if (g.phase === 'handover'){ OkeyGame.act(g, seat, { type: 'nextHand' }); sendViews(o); pump(o); } return; }
  if (seat < 0) return;
  const r = OkeyGame.act(g, seat, a);
  if (!r.ok){ sendTo(who, { t: 'tb-err', id: o.sum.id, err: r.err }); return; }
  sendViews(o); pump(o);
}

// botların sırası, otomatik geçişler
function pump(o){
  clearTimers(o);
  const s = o.sum, g = o.state;
  if (!g || s.status !== 'playing') return;
  if (s.game === 'tavla'){
    if (g.phase === 'opening'){ later(o, 900, () => { TavlaCore.doOpening(g); sendViews(o); pump(o); }); return; }
    if (g.phase === 'over'){ later(o, 6000, () => { o.state = TavlaCore.nextGame(g); sendViews(o); pump(o); }); return; }
    if (g.phase === 'matchover') return;
    const cur = s.seats[g.turn];
    if (g.phase === 'roll' && cur && cur.bot){ later(o, 900, () => { TavlaCore.doRoll(g); sendViews(o); pump(o); }); return; }
    if (g.phase === 'move'){
      if (TavlaCore.turnDone(g)){
        later(o, g.noMoves ? 2200 : cur && cur.bot ? 700 : 2600, () => { if (TavlaCore.turnDone(g)){ TavlaCore.endTurn(g); sendViews(o); pump(o); } });
        return;
      }
      if (cur && cur.bot){
        const seq = TavlaCore.botTurn(g);
        if (seq.length) later(o, 650, () => { TavlaCore.doMove(g, seq[0]); sendViews(o); pump(o); });
      }
    }
    return;
  }
  // okey
  if (g.phase === 'handover'){ later(o, 9000, () => { if (g.phase === 'handover'){ OkeyGame.act(g, 0, { type: 'nextHand' }); sendViews(o); pump(o); } }); return; }
  if (g.phase !== 'play') return;
  for (let q = 0; q < 4; q++){
    const x = s.seats[q];
    if (!x || !x.bot) continue;
    const a = OkeyGame.botAction(g, q);
    if (!a) continue;
    if (a.type !== 'show' && q !== g.turn) continue;
    later(o, a.type === 'draw' ? 800 : a.type === 'show' ? 1200 : 700 + Math.random() * 500, () => {
      const r = OkeyGame.act(g, q, a);
      if (!r.ok && a.type === 'discard'){ const t = g.hands[q].find(id => id !== a.tile); if (t !== undefined) OkeyGame.act(g, q, { type: 'discard', tile: t }); }
      sendViews(o); pump(o);
    });
    return;
  }
}

// herkese kendi görünümünü gönder
function viewFor(o, seat){
  const s = o.sum, g = o.state;
  if (s.game === 'tavla'){
    const v = TavlaCore.clone(g);
    delete v.turnStart;
    v.legal = g.phase === 'move' ? TavlaCore.nextMoves(g) : [];
    v.done = g.phase === 'move' && TavlaCore.turnDone(g);
    v.pips = [TavlaCore.pip(g, 0), TavlaCore.pip(g, 1)];
    return v;
  }
  return OkeyGame.view(g, seat >= 0 ? seat : null);
}
function sendViews(o){
  const s = o.sum;
  if (!o.state) return;
  o.vseq = (o.vseq || 0) + 1;
  const sent = new Set();
  s.seats.forEach((x, k) => {
    if (!x || x.bot) return;
    sent.add(x.id);
    deliverView(x.id, { t: 'tb-view', id: s.id, seat: k, vseq: o.vseq, v: viewFor(o, k) });
  });
  o.watchers.forEach(w => { if (!sent.has(w)) deliverView(w, { t: 'tb-view', id: s.id, seat: -1, vseq: o.vseq, v: viewFor(o, -1) }); });
  if (!sent.has(peer.id) && openTable === s.id) deliverView(peer.id, { t: 'tb-view', id: s.id, seat: -1, vseq: o.vseq, v: viewFor(o, -1) });
}
function deliverView(who, msg){
  if (who === peer.id){ onView(msg); return; }
  sendTo(who, msg);
}
function sendTo(who, msg){
  if (who === peer.id){ gamesOnData(peer.id, msg); return; }
  const p = peers.get(who); if (p && p.linked) send(p.conn, msg);
}
// masa sahibine istek gönder (sahip bensem doğrudan uygula)
function toOwner(id, msg){
  const s = tables.get(id); if (!s) return;
  msg.id = id;
  if (s.owner === peer.id) ownerHandle(peer.id, myName, msg);
  else sendTo(s.owner, msg);
}
function ownerHandle(from, fromName, d){
  const o = owned.get(d.id); if (!o) return;
  if (d.t === 'tb-sit') ownerSit(o, from, fromName, +d.seat);
  else if (d.t === 'tb-stand') ownerStand(o, from);
  else if (d.t === 'tb-watch'){ if (d.on) { o.watchers.add(from); sendViews(o); } else o.watchers.delete(from); }
  else if (d.t === 'tb-act') ownerAct(o, from, d.a);
}

// ---------- gelen mesajlar ----------
function gamesOnData(id, d){
  switch (d.t){
    case 'tb-sum':
      if (validSum(d.sum) && d.sum.owner === id){ const s = cleanSum(d.sum, id); tables.set(s.id, s); refreshGameDeck(); renderChannels(); if (openTable === s.id) renderOpenTable(); }
      return true;
    case 'tb-del': {
      const s = tables.get(d.id);
      if (s && s.owner === id){ tables.delete(d.id); lastViews.delete(d.id); if (openTable === d.id){ closeTableView(); toast('Masa kapandı'); } refreshGameDeck(); renderChannels(); }
      return true;
    }
    case 'tb-sit': case 'tb-stand': case 'tb-watch': case 'tb-act': {
      const p = peers.get(id);
      ownerHandle(id, p ? p.name : 'Oyuncu', d);
      return true;
    }
    case 'tb-view': {
      const s = tables.get(d.id);
      if (s && s.owner === id) onView(d);
      return true;
    }
    case 'tb-err': if (tables.get(d.id) && tables.get(d.id).owner === id){ toast('⚠ ' + clip(d.err, 120)); gameSound('err'); } return true;
  }
  return false;
}
function onView(d){
  const prevV = lastViews.get(d.id);
  if (prevV && d.vseq && prevV.vseq && d.vseq < prevV.vseq && prevV.owner === tables.get(d.id).owner) return;
  lastViews.set(d.id, { v: d.v, seat: d.seat, vseq: d.vseq, owner: tables.get(d.id) && tables.get(d.id).owner, prev: prevV && prevV.v });
  if (openTable === d.id) renderOpenTable();
  notifyTurn(d);
}
// sıra bana gelince (başka kanaldaysam ya da masaya bakmıyorsam) haber ver
function notifyTurn(d){
  const v = d.v, s = tables.get(d.id);
  if (!s || d.seat < 0) return;
  const mine = s.game === 'tavla' ? (v.turn === d.seat && (v.phase === 'roll' || v.phase === 'move')) : (v.phase === 'play' && v.turn === d.seat);
  const key = d.id + ':' + (v.gameNo || v.handNo) + ':' + (s.game === 'tavla' ? (v.phase === 'roll' ? 'r' + JSON.stringify(v.board) : '') : v.pileCount + ':' + v.counts.join(','));
  if (mine && notifyTurn.last !== key && (openTable !== d.id || document.hidden || me.channel !== 'oyun')){
    notifyTurn.last = key;
    if (s.game === 'tavla' && v.phase !== 'roll') return;
    if (s.game === 'okey' && v.drew) return;
    toast('🎲 ' + GAME_INFO[s.game].name + ': sıra sende!'); gameSound('turn');
  }
}
// yeni gelen birine benim masalarımın özetini gönder
function gamesOnHello(p){ owned.forEach(o => send(p.conn, { t: 'tb-sum', sum: o.sum })); }
// biri ayrıldı: sahibi olduğu masalar kapanır; oturduğu koltuğa bot geçer
function gamesPeerLeft(id){
  tables.forEach((s, tid) => {
    if (s.owner === id){
      tables.delete(tid); lastViews.delete(tid);
      if (openTable === tid){ closeTableView(); toast('Masa sahibi ayrıldı, masa kapandı'); }
    }
  });
  owned.forEach(o => { o.watchers.delete(id); if (o.sum.seats.some(x => x && !x.bot && x.id === id)) ownerStand(o, id); });
  refreshGameDeck(); renderChannels();
}

// ---------- masa görünümünü aç/kapat ----------
function openTableView(id){
  if (!tables.has(id)) return;
  if (openTable && openTable !== id) closeTableView(true);
  openTable = id;
  if (me.channel !== 'oyun') switchChannel('oyun', true);
  toOwner(id, { t: 'tb-watch', on: true });
  $('room').classList.add('gaming');
  updateStage();
  renderDeck();
}
function closeTableView(quiet){
  if (!openTable) return;
  const id = openTable;
  openTable = null;
  if (tables.has(id)) toOwner(id, { t: 'tb-watch', on: false });
  $('room').classList.remove('gaming');
  updateStage();
  if (!quiet) renderDeck();
}
function refreshGameDeck(){ if (joined && myChan().type === 'game' && !openTable) renderDeck(); }

// ---------- Oyun Salonu ekranı ----------
function renderGameDeck(d){
  if (openTable && tables.has(openTable)) { renderTableShell(d); return; }
  if (openTable && !tables.has(openTable)) closeTableView(true);
  $('room').classList.remove('gaming');
  d.innerHTML = '';
  const head = document.createElement('div'); head.className = 'salon-head';
  head.innerHTML = '<h2 class="deck-title">🎲 Oyun Salonu</h2><p class="note">Masa aç, arkadaşların boş koltuklara otursun. 4 kişi yoksa boş koltuklara bot oturtabilirsin. Oyun sırasında konuşmaya ve radyoya devam edebilirsiniz.</p>';
  d.append(head);
  const make = document.createElement('div'); make.className = 'make-tables';
  const card = (icon, title, desc, optsHtml, onCreate) => {
    const c = document.createElement('div'); c.className = 'make-card';
    c.innerHTML = '<div class="mc-top"><span class="mc-ico">' + icon + '</span><div><b>' + title + '</b><span>' + desc + '</span></div></div><div class="mc-opts">' + optsHtml + '</div>';
    const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = 'Masa aç';
    b.onclick = () => onCreate(c);
    c.append(b); make.append(c);
  };
  card('🎲', 'Tavla', '2 kişi, karşılıklı. Klasik (erkek) tavla: kırma, kapı, mars.',
    '<label>Maç kaç puan?<select data-o="target"><option value="3">3 puan</option><option value="5" selected>5 puan</option><option value="7">7 puan</option><option value="1">Tek oyun</option></select></label>',
    c => createTable('tavla', { target: c.querySelector('[data-o=target]').value }));
  card('🀄', 'Okey', '4 kişi. Gösterge, okey, sahte okey, çift bitiş.',
    '<label>Çeşit<select data-o="variant"><option value="klasik">Klasik Okey (20 puandan düşme)</option><option value="eşli">Klasik Okey · Eşli (karşılıklı takım)</option><option value="101">101 Okey</option></select></label>' +
    '<label data-h101 hidden>Kaç el?<select data-o="hands101"><option value="3">3 el</option><option value="5" selected>5 el</option><option value="7">7 el</option><option value="11">11 el</option></select></label>',
    c => { const v = c.querySelector('[data-o=variant]').value; createTable('okey', { variant: v === '101' ? '101' : 'klasik', team: v === 'eşli', hands101: c.querySelector('[data-o=hands101]').value }); });
  d.append(make);
  const vsel = make.querySelector('[data-o=variant]');
  vsel.onchange = () => { make.querySelector('[data-h101]').hidden = vsel.value !== '101'; };

  const list = [...tables.values()].sort((a, b) => b.created - a.created);
  const box = document.createElement('div'); box.className = 'table-list';
  if (!list.length){ const e = document.createElement('p'); e.className = 'note'; e.textContent = 'Henüz açık masa yok. Yukarıdan bir masa aç.'; box.append(e); }
  list.forEach(s => box.append(tableCard(s)));
  d.append(box);
}
function tableCard(s){
  const c = document.createElement('div'); c.className = 'tcard ' + s.game;
  const info = GAME_INFO[s.game];
  const top = document.createElement('div'); top.className = 'tc-top';
  top.innerHTML = '<span class="mc-ico">' + info.icon + '</span><div><b></b><span></span></div><span class="pill"></span>';
  top.querySelector('b').textContent = info.name + ' masası';
  top.querySelector('div span').textContent = variantName(s) + ' · açan: ' + s.ownerName;
  top.querySelector('.pill').textContent = s.status === 'playing' ? '▶ Oynanıyor' : '⏳ Oyuncu bekleniyor';
  if (s.status === 'playing') top.querySelector('.pill').classList.add('live');
  c.append(top);
  c.append(seatRow(s));
  const acts = document.createElement('div'); acts.className = 'tc-acts';
  const open = document.createElement('button'); open.className = 'btn'; open.textContent = mySeat(s) >= 0 ? 'Masaya git' : s.status === 'playing' ? '👀 İzle' : 'Masaya bak';
  open.onclick = () => openTableView(s.id);
  acts.append(open);
  if (s.owner === peer.id){
    const x = document.createElement('button'); x.className = 'btn kick-btn'; x.textContent = 'Masayı kapat';
    x.onclick = () => { const o = owned.get(s.id); if (o) ownerClose(o); };
    acts.append(x);
  }
  c.append(acts);
  return c;
}
// koltuklar: boşsa "Otur", bot eklenebilir; doluysa oyuncu
function seatRow(s){
  const row = document.createElement('div'); row.className = 'seats';
  const me_ = mySeat(s);
  s.seats.forEach((x, k) => {
    const st = document.createElement('div'); st.className = 'seat' + (x ? ' full' : '') + (x && x.bot ? ' bot' : '') + (k === me_ ? ' me' : '');
    const label = s.game === 'tavla' ? (k === 0 ? '⚪ Beyaz' : '⚫ Siyah') : (s.opts.team ? (k % 2 ? '🔵 Takım B' : '🟠 Takım A') : 'Koltuk ' + (k + 1));
    const av = document.createElement('div'); av.className = 'seat-av';
    if (x){
      av.textContent = x.bot ? '🤖' : initial(x.name);
      if (!x.bot) av.style.setProperty('--c', colorFor(x.id));
      av.dataset.treatFor = x.bot ? '' : x.id;
    } else av.textContent = '+';
    const nm = document.createElement('span'); nm.className = 'seat-name'; nm.textContent = x ? x.name : 'Boş';
    const lb = document.createElement('span'); lb.className = 'seat-lbl'; lb.textContent = label;
    st.append(av, nm, lb);
    const canSit = (!x && s.status !== 'playing') || (x && x.bot && s.status === 'playing' && me_ < 0);
    if (canSit && me_ !== k){
      const b = document.createElement('button'); b.className = 'btn small primary'; b.textContent = x ? 'Botun yerine otur' : 'Otur';
      b.onclick = e => { e.stopPropagation(); toOwner(s.id, { t: 'tb-sit', seat: k }); };
      st.append(b);
    }
    if (s.owner === peer.id && s.status !== 'playing' && (!x || x.bot)){
      const b = document.createElement('button'); b.className = 'btn small'; b.textContent = x ? 'Botu kaldır' : '🤖 Bot ekle';
      b.onclick = e => { e.stopPropagation(); const o = owned.get(s.id); if (o) ownerBot(o, k, !x); };
      st.append(b);
    }
    if (k === me_ && s.status !== 'playing'){
      const b = document.createElement('button'); b.className = 'btn small'; b.textContent = 'Kalk';
      b.onclick = e => { e.stopPropagation(); toOwner(s.id, { t: 'tb-stand' }); };
      st.append(b);
    }
    row.append(st);
  });
  return row;
}

// masa ekranı (oyunun kendisi tavla-ui / okey-ui tarafından çizilir)
function renderTableShell(d){
  const s = tables.get(openTable);
  if (!d.querySelector('.game-shell') || d.querySelector('.game-shell').dataset.tid !== s.id){
    d.innerHTML = '';
    const sh = document.createElement('div'); sh.className = 'game-shell game-' + s.game; sh.dataset.tid = s.id;
    sh.innerHTML = '<div class="gs-bar"><button class="btn small" data-back>← Salona dön</button><b class="gs-title"></b><span class="gs-sub note"></span><span class="gs-space"></span><div class="gs-acts"></div></div><div class="gs-body"></div>';
    sh.querySelector('[data-back]').onclick = () => closeTableView();
    d.append(sh);
  }
  renderOpenTable();
}
// taş sürüklenirken masa yeniden çizilmez (yoksa taş elin altından kaçar); bırakınca çizilir
let renderHeld = false, renderPending = false;
function holdRender(on){
  renderHeld = on;
  if (!on && renderPending){ renderPending = false; renderOpenTable(); }
}
function renderOpenTable(){
  if (renderHeld){ renderPending = true; return; }
  const s = tables.get(openTable); if (!s) return;
  const sh = $('deck').querySelector('.game-shell'); if (!sh) return;
  sh.querySelector('.gs-title').textContent = GAME_INFO[s.game].icon + ' ' + GAME_INFO[s.game].name;
  sh.querySelector('.gs-sub').textContent = variantName(s);
  const acts = sh.querySelector('.gs-acts'); acts.innerHTML = '';
  const k = mySeat(s);
  if (k >= 0 && s.status === 'playing'){
    const b = document.createElement('button'); b.className = 'btn small'; b.textContent = 'Masadan kalk';
    b.onclick = () => { toOwner(s.id, { t: 'tb-stand' }); toast('Yerine bot oturdu'); };
    acts.append(b);
  }
  if (s.owner === peer.id){
    if (s.status !== 'playing'){
      const b = document.createElement('button'); b.className = 'btn small primary'; b.textContent = '▶ Oyunu başlat';
      b.onclick = () => { const o = owned.get(s.id); if (o) ownerStart(o); };
      acts.append(b);
    }
    const x = document.createElement('button'); x.className = 'btn small kick-btn'; x.textContent = 'Masayı kapat';
    x.onclick = () => { const o = owned.get(s.id); if (o) ownerClose(o); };
    acts.append(x);
  }
  const body = sh.querySelector('.gs-body');
  const lv = lastViews.get(s.id);
  if (s.status !== 'playing' || !lv){
    body.innerHTML = '';
    const w = document.createElement('div'); w.className = 'waiting-room';
    const h = document.createElement('p'); h.className = 'note';
    h.textContent = s.status === 'playing' ? 'Oyun yükleniyor…' : s.owner === peer.id ? 'Koltuklar dolunca “Oyunu başlat”a bas. Boş koltuklara bot ekleyebilirsin.' : 'Masa sahibi oyunu başlatınca burada görünecek. Boş koltuğa oturabilirsin.';
    w.append(seatRow(s), h);
    body.append(w);
    return;
  }
  if (s.game === 'tavla') renderTavla(body, s, lv);
  else renderOkey(body, s, lv);
}
function tableAct(a){ if (openTable) toOwner(openTable, { t: 'tb-act', a }); }

// ---------- oyun sesleri (kısa, sentezlenmiş) ----------
function gameSound(kind){
  if (!audioCtx || deafened) return;
  try {
    const t0 = audioCtx.currentTime, vol = 0.12 * Math.max(masterVol, 0.2);
    const noise = (dur, freq, q, gain, at) => {
      const len = Math.floor(audioCtx.sampleRate * dur), buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const src = audioCtx.createBufferSource(); src.buffer = buf;
      const f = audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      const g = audioCtx.createGain(); g.gain.value = gain;
      src.connect(f); f.connect(g); g.connect(audioCtx.destination); src.start(t0 + (at || 0));
    };
    if (kind === 'dice'){ for (let i = 0; i < 6; i++) noise(0.05, 2200 + Math.random() * 1500, 2, vol * 2.4, i * 0.07 + Math.random() * 0.03); }
    else if (kind === 'checker'){ noise(0.08, 900, 3, vol * 3); }
    else if (kind === 'tile'){ noise(0.06, 1800, 4, vol * 3); }
    else if (kind === 'turn'){ tone([880, 1175], 0.1, 0.18, 0.08); }
    else if (kind === 'err'){ tone([300, 220], 0.09, 0.18, 0.08); }
    else if (kind === 'win'){ tone([523, 659, 784, 1047], 0.12, 0.35, 0.12); }
  } catch(e){}
}
// kutlama konfetisi
function confetti(el){
  if (reducedMotion() || !el) return;
  const box = document.createElement('div'); box.className = 'confetti';
  const cols = ['#5ee0b5', '#ffb454', '#ff7ab6', '#7aa2ff', '#f7d36a'];
  for (let i = 0; i < 70; i++){
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%'; p.style.background = cols[i % cols.length];
    p.style.animationDelay = Math.random() * 0.6 + 's'; p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    p.style.setProperty('--x', (Math.random() * 160 - 80) + 'px');
    box.append(p);
  }
  el.append(box); setTimeout(() => box.remove(), 3500);
}
