// Tabu: anlatıcı kartı yasaklı kelimeleri kullanmadan SESLİ anlatır, diğerleri sesli tahmin eder.
// 4+ kişide iki takım (Kırmızı / Mavi): anlatıcının takımı tahmin eder, rakip takım kartı görür ve
// yasaklı kelime söylenirse "TABU!" der. 2-3 kişide herkes kendi için oynar: anlatıcı, bileni seçer.
// Doğru +1, Tabu −1, Pas cezasız (tur başına 3). Kartlar js/games/tabu-kartlar.js'te (550+).
const TabuCore = (() => {
  const raw = typeof TABU_KARTLAR === 'string' ? TABU_KARTLAR : (typeof require === 'function' ? require('./tabu-kartlar.js') : '');
  const CARDS = [];
  const seen = new Set();
  raw.split('\n').forEach(l => {
    l = l.trim(); if (!l || l.startsWith('#')) return;
    const i = l.indexOf(':'); if (i < 1) return;
    const w = l.slice(0, i).trim(), y = l.slice(i + 1).split(',').map(x => x.trim()).filter(Boolean);
    const k = w.toLocaleLowerCase('tr-TR');
    if (y.length < 3 || seen.has(k)) return;
    seen.add(k); CARDS.push({ w, y: y.slice(0, 5) });
  });
  return { CARDS };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TabuCore;

if (typeof registerTableGame === 'function') (function(){
  const T = TabuCore;
  const T_READY = 20000, T_GAP = 7000, PASS = 3;
  const TEAM = { A: { ad: 'Kırmızı', ico: '🔴' }, B: { ad: 'Mavi', ico: '🔵' } };
  const seatedIds = o => o.sum.seats.filter(x => x && !x.bot).map(x => x.id);
  const nameOf = (st, id) => st.names[id] || 'Oyuncu';
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // önceki oyunlarda çıkan kartlar (masa sahibinin cihazında) bir süre tekrar gelmez
  const HK = 'oyunodasi-tabu-gecmis';
  const hist = () => { try { return JSON.parse(localStorage.getItem(HK)) || []; } catch(e){ return []; } };
  function remember(w){ const h = hist(); h.push(w); try { localStorage.setItem(HK, JSON.stringify(h.slice(-Math.floor(T.CARDS.length * 0.8)))); } catch(e){} }
  function freshDeck(st){
    const h = new Set(hist());
    const ok = i => !T.CARDS[i].silindi;    // panelden silinen kartlar desteye girmez
    let idx = T.CARDS.map((c, i) => i).filter(i => ok(i) && !st.used.includes(i) && !h.has(T.CARDS[i].w));
    if (idx.length < 20) idx = T.CARDS.map((c, i) => i).filter(i => ok(i) && !st.used.includes(i));
    if (!idx.length){ st.used = []; idx = T.CARDS.map((c, i) => i).filter(ok); }
    return shuffle(idx);
  }
  function drawCard(st){
    if (!st.deck.length) st.deck = freshDeck(st);
    st.card = st.deck.pop(); st.used.push(st.card); remember(T.CARDS[st.card].w);
  }
  const teamOf = (st, id) => st.teams.A.includes(id) ? 'A' : st.teams.B.includes(id) ? 'B' : null;
  function buildOrder(st, here){
    if (st.mode === 'takim'){
      const A = st.teams.A.filter(id => here.includes(id)), B = st.teams.B.filter(id => here.includes(id));
      const out = [], n = Math.max(A.length, B.length);
      for (let i = 0; i < n; i++){ if (A.length) out.push(A[i % A.length]); if (B.length) out.push(B[i % B.length]); }
      return out;
    }
    return here.slice();
  }
  function beginTurn(o){
    const st = o.state, here = seatedIds(o);
    while (st.turnIdx < st.order.length && !here.includes(st.order[st.turnIdx])) st.turnIdx++;
    if (st.turnIdx >= st.order.length){
      st.round++; st.turnIdx = 0;
      st.order = buildOrder(st, here);
      if (st.round > st.rounds || here.length < 2){ endGame(o); return; }
    }
    st.narrator = st.order[st.turnIdx];
    st.phase = 'hazir'; st.endsAt = Date.now() + T_READY; st.card = null; st.log = []; st.passes = PASS; st.seq++;
  }
  function startNarrating(o){
    const st = o.state;
    st.phase = 'anlat'; st.endsAt = Date.now() + st.sure * 1000; st.total = st.sure * 1000;
    drawCard(st); st.seq++;
    sendEvent(o, { k: 'sys', text: '🗣 ' + nameOf(st, st.narrator) + ' anlatıyor!' });
  }
  function addPoint(st, who, n){ st.scores[who] = (st.scores[who] || 0) + n; }
  function mark(o, r, by, kim){
    const st = o.state, c = T.CARDS[st.card];
    st.log.push({ w: c.w, r, kim: kim || null, by: by || null });
    if (r === 'dogru'){
      if (st.mode === 'takim') st.tscores[teamOf(st, st.narrator)]++;
      addPoint(st, st.narrator, 1);
      if (kim) addPoint(st, kim, 1);
    } else if (r === 'tabu'){
      if (st.mode === 'takim') st.tscores[teamOf(st, st.narrator)]--;
      else addPoint(st, st.narrator, -1);
    }
    sendEvent(o, { k: r, w: c.w, kim: kim ? nameOf(st, kim) : '', by: by && by !== st.narrator ? nameOf(st, by) : '' });
    drawCard(st); st.seq++;
  }
  function endTurn(o, why){
    const st = o.state;
    if (st.phase !== 'anlat' && st.phase !== 'hazir') return;
    st.phase = 'ara'; st.why = why || ''; st.endsAt = Date.now() + T_GAP; st.seq++;
  }
  function endGame(o){
    const st = o.state;
    st.phase = 'bitti'; st.endsAt = 0; st.seq++;
    if (st.mode === 'takim'){
      const w = st.tscores.A === st.tscores.B ? null : st.tscores.A > st.tscores.B ? 'A' : 'B';
      addSys('🏆 Tabu bitti! ' + (w ? TEAM[w].ico + ' ' + TEAM[w].ad + ' takım kazandı (' + st.tscores.A + ' - ' + st.tscores.B + ')' : 'Berabere! (' + st.tscores.A + ' - ' + st.tscores.B + ')'));
    } else {
      const top = Object.keys(st.scores).sort((a, b) => st.scores[b] - st.scores[a])[0];
      if (top) addSys('🏆 Tabu bitti! Kazanan: ' + nameOf(st, top) + ' (' + st.scores[top] + ' puan)');
    }
  }

  registerTableGame('tabu', {
    name: 'Tabu', icon: '🤐', seats: 10, minPlayers: 2, bots: false, joinMidGame: true,
    cleanOpts: o => ({ mod: ['auto', 'takim', 'tek'].includes(o.mod) ? o.mod : 'auto', sure: [45, 60, 90].includes(+o.sure) ? +o.sure : 60, rounds: [1, 2, 3].includes(+o.rounds) ? +o.rounds : 2 }),
    variantName: s => (s.opts.mod === 'takim' ? 'Takımlı' : s.opts.mod === 'tek' ? 'Herkes tek' : '4+ kişide takımlı') + ' · ' + s.opts.sure + ' sn · ' + s.opts.rounds + ' tur',
    seatLabel: () => 'Oyuncu',
    waitText: (s, own) => own ? 'En az 2 kişi oturunca “Oyunu başlat”a bas. 4+ kişide iki takım olur. Sesli anlatılır, mikrofonlar açık olsun!' : 'Bir koltuğa otur; masa sahibi başlatınca oyun burada açılır.',
    makeCard: {
      desc: '2-10 kişi. Kartı yasaklı kelimeleri söylemeden sesli anlat! ' + T.CARDS.length + ' kart.',
      opts: '<label>Oyun<select data-o="mod"><option value="auto" selected>4+ kişide takımlı</option><option value="takim">Takımlı (Kırmızı - Mavi)</option><option value="tek">Herkes kendi için</option></select></label>' +
        '<label>Anlatma süresi<select data-o="sure"><option value="45">45 sn</option><option value="60" selected>60 sn</option><option value="90">90 sn</option></select></label>' +
        '<label>Tur (herkes her turda bir kez anlatır)<select data-o="rounds"><option value="1">1 tur</option><option value="2" selected>2 tur</option><option value="3">3 tur</option></select></label>',
      read: c => ({ mod: c.querySelector('[data-o=mod]').value, sure: c.querySelector('[data-o=sure]').value, rounds: c.querySelector('[data-o=rounds]').value })
    },
    start(o){
      const ids = shuffle(seatedIds(o)), op = o.sum.opts;
      const mode = op.mod === 'tek' ? 'tek' : op.mod === 'takim' ? (ids.length >= 4 ? 'takim' : 'tek') : (ids.length >= 4 ? 'takim' : 'tek');
      const teams = { A: [], B: [] };
      if (mode === 'takim') ids.forEach((id, i) => teams[i % 2 ? 'B' : 'A'].push(id));
      o.state = { mode, phase: 'hazir', round: 1, rounds: op.rounds, sure: op.sure, teams, tscores: { A: 0, B: 0 }, order: [], turnIdx: 0,
        narrator: null, card: null, deck: [], used: [], log: [], passes: PASS, scores: {}, names: {}, seq: 0, why: '' };
      o.sum.seats.forEach(x => { if (x && !x.bot){ o.state.names[x.id] = x.name; o.state.scores[x.id] = 0; } });
      o.state.order = buildOrder(o.state, ids);
      beginTurn(o);
      return o.state;
    },
    onSeat(o, seat){
      const st = o.state, x = o.sum.seats[seat];
      st.names[x.id] = x.name; if (st.scores[x.id] == null) st.scores[x.id] = 0;
      if (st.mode === 'takim' && !teamOf(st, x.id)){
        const here = seatedIds(o);
        const nA = st.teams.A.filter(id => here.includes(id)).length, nB = st.teams.B.filter(id => here.includes(id)).length;
        st.teams[nA <= nB ? 'A' : 'B'].push(x.id);
      }
      if (!st.order.includes(x.id)) st.order.push(x.id);
      sendViews(o);
    },
    onLeave(o){
      const st = o.state;
      if ((st.phase === 'anlat' || st.phase === 'hazir') && !seatedIds(o).includes(st.narrator)){ endTurn(o, 'Anlatıcı ayrıldı'); sendViews(o); pump(o); return; }
      if (seatedIds(o).length < 2 && st.phase !== 'bitti'){ endGame(o); sendViews(o); return; }
      sendViews(o);
    },
    act(o, seat, a, who){
      const st = o.state; if (!st) return;
      if (a.type === 'newMatch'){ if (st.phase !== 'bitti' || who !== o.sum.owner) return; this.start(o); sendViews(o); pump(o); return; }
      if (a.type === 'gec' && who === o.sum.owner && (st.phase === 'anlat' || st.phase === 'hazir')){ endTurn(o, 'Masa sahibi turu geçti'); sendViews(o); pump(o); return; }
      if (seat < 0) return;
      const narr = who === st.narrator;
      if (a.type === 'basla' && narr && st.phase === 'hazir'){ startNarrating(o); sendViews(o); pump(o); return; }
      if (st.phase !== 'anlat' || st.card == null) return;
      // aynı karta iki kez basılmasın
      if (a.card !== st.card) return;
      if (a.type === 'dogru' && narr){
        let kim = null;
        if (st.mode === 'tek' && typeof a.kim === 'string' && a.kim !== who && seatedIds(o).includes(a.kim)) kim = a.kim;
        mark(o, 'dogru', who, kim); sendViews(o); return;
      }
      if (a.type === 'pas' && narr && st.passes > 0){ st.passes--; mark(o, 'pas', who); sendViews(o); return; }
      if (a.type === 'tabu'){
        const watcher = st.mode === 'takim' && teamOf(st, who) && teamOf(st, who) !== teamOf(st, st.narrator);
        if (!narr && !watcher) return;
        mark(o, 'tabu', who); sendViews(o); return;
      }
    },
    pump(o){
      const st = o.state, now = Date.now();
      if (st.phase === 'hazir') later(o, Math.max(0, st.endsAt - now), () => { startNarrating(o); sendViews(o); pump(o); });
      else if (st.phase === 'anlat') later(o, Math.max(0, st.endsAt - now), () => { endTurn(o, 'Süre doldu'); sendViews(o); pump(o); });
      else if (st.phase === 'ara') later(o, Math.max(0, st.endsAt - now), () => { st.turnIdx++; beginTurn(o); sendViews(o); pump(o); });
    },
    view(o, seat){
      const st = o.state, me_ = seat >= 0 && o.sum.seats[seat] ? o.sum.seats[seat].id : null;
      const narr = !!me_ && me_ === st.narrator;
      const myTeam = me_ ? teamOf(st, me_) : null, nTeam = st.narrator ? teamOf(st, st.narrator) : null;
      const role = !me_ ? 'izleyici' : narr ? 'anlatici' : st.mode === 'takim' ? (myTeam && myTeam !== nTeam ? 'gozcu' : 'tahminci') : 'tahminci';
      const showCard = st.phase === 'anlat' && (role === 'anlatici' || role === 'gozcu');
      const here = seatedIds(o);
      const ids = [...new Set([...st.order, ...Object.keys(st.scores)])];
      // tahmin edenler sadece bilinen kelimeleri görür; anlatıcı ve gözcü her şeyi
      const log = st.phase === 'anlat' && !showCard ? st.log.filter(x => x.r === 'dogru') : st.log;
      return {
        phase: st.phase, mode: st.mode, round: st.round, rounds: st.rounds, seq: st.seq, me: me_, role,
        narrator: st.narrator, narratorName: st.narrator ? nameOf(st, st.narrator) : '', nTeam, myTeam,
        endsIn: st.endsAt ? Math.max(0, st.endsAt - Date.now()) : 0, total: st.phase === 'hazir' ? T_READY : st.phase === 'ara' ? T_GAP : st.sure * 1000,
        card: showCard ? Object.assign({ id: st.card }, T.CARDS[st.card]) : null, cardId: st.phase === 'anlat' ? st.card : null,
        passes: st.passes, why: st.why || '',
        counts: { dogru: st.log.filter(x => x.r === 'dogru').length, tabu: st.log.filter(x => x.r === 'tabu').length, pas: st.log.filter(x => x.r === 'pas').length },
        log: log.map(x => ({ w: x.w, r: x.r, kim: x.kim ? nameOf(st, x.kim) : '' })),
        tscores: st.tscores,
        teams: st.mode === 'takim' ? { A: st.teams.A.map(id => ({ id, name: nameOf(st, id), here: here.includes(id) })), B: st.teams.B.map(id => ({ id, name: nameOf(st, id), here: here.includes(id) })) } : null,
        players: ids.map(id => ({ id, name: nameOf(st, id), score: st.scores[id] || 0, here: here.includes(id), team: teamOf(st, id) }))
      };
    },
    render: (body, s, lv) => renderTabu(body, s, lv),
    onEvent: (ev, s) => tabuEvent(ev, s),
    isMyTurn: (v, seat) => seat >= 0 && v.role === 'anlatici' && v.phase === 'hazir',
    turnKey: v => v.round + ':' + v.narrator
  });
})();

// ---------- arayüz ----------
const tb = { key: '', timer: null, deadline: 0, feed: [] };
const TABU_TEAM = { A: { ad: 'Kırmızı', ico: '🔴' }, B: { ad: 'Mavi', ico: '🔵' } };
function tabuEl(tag, cls, text){ const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function renderTabu(body, s, lv){
  const v = lv.v;
  let root = body.querySelector('.tabu');
  const key = v.round + ':' + v.narrator + ':' + v.phase + ':' + v.role;
  if (!root || tb.key !== key){
    const prev = tb.key.split(':')[2];
    const sameTurn = root && tb.key.split(':').slice(0, 2).join(':') === key.split(':').slice(0, 2).join(':');
    tb.key = key;
    if (!sameTurn) tb.feed = [];
    body.innerHTML = '';
    root = tabuEl('div', 'tabu tabu-' + v.phase + ' rol-' + v.role);
    root.innerHTML = '<div class="tabu-top"><span class="tabu-round"></span><span class="tabu-mode"></span><span class="tabu-time"></span></div>' +
      '<div class="tabu-score"></div><div class="tabu-stage"></div><div class="tabu-feed"></div>';
    body.append(root);
    tb.feed.forEach(f => addTabuFeed(root, f, true));
    if (v.phase === 'hazir' && v.role === 'anlatici') gameSound('turn');
    if (v.phase === 'ara' && prev === 'anlat') gameSound(v.counts.dogru > v.counts.tabu ? 'win' : 'err');
    if (v.phase === 'bitti') setTimeout(() => confetti(root), 300);
  }
  tb.deadline = Date.now() + (v.endsIn || 0);
  root.querySelector('.tabu-round').textContent = v.phase === 'bitti' ? 'Oyun bitti' : 'Tur ' + Math.min(v.round, v.rounds) + '/' + v.rounds;
  root.querySelector('.tabu-mode').textContent = v.mode === 'takim' ? (v.myTeam ? 'Takımın: ' + TABU_TEAM[v.myTeam].ico + ' ' + TABU_TEAM[v.myTeam].ad : 'Takımlı') : 'Herkes kendi için';
  // puanlar
  const sc = root.querySelector('.tabu-score'); sc.innerHTML = '';
  if (v.mode === 'takim'){
    ['A', 'B'].forEach(t => {
      const box = tabuEl('div', 'tabu-team t' + t + (v.nTeam === t && v.phase !== 'bitti' ? ' sirada' : ''));
      box.append(tabuEl('b', '', TABU_TEAM[t].ico + ' ' + TABU_TEAM[t].ad), tabuEl('strong', '', String(v.tscores[t])));
      const ul = tabuEl('div', 'tabu-members');
      v.teams[t].filter(p => p.here).forEach(p => ul.append(tabuEl('span', (p.id === v.narrator ? 'anl ' : '') + (p.id === v.me ? 'me' : ''), (p.id === v.narrator ? '🗣 ' : '') + p.name)));
      box.append(ul); sc.append(box);
    });
  } else {
    const ol = tabuEl('ol', 'tabu-players');
    v.players.filter(p => p.here || p.score).sort((a, b) => b.score - a.score).forEach((p, i) => {
      const li = tabuEl('li', (p.id === v.me ? 'me ' : '') + (p.id === v.narrator ? 'anl' : ''));
      li.append(tabuEl('span', 'n', v.phase === 'bitti' && i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1)), tabuEl('span', 'nm', (p.id === v.narrator && v.phase !== 'bitti' ? '🗣 ' : '') + p.name), tabuEl('b', '', String(p.score)));
      ol.append(li);
    });
    sc.append(ol);
  }
  // sahne
  const st = root.querySelector('.tabu-stage'); st.innerHTML = '';
  const who = v.narratorName + (v.mode === 'takim' && v.nTeam ? ' (' + TABU_TEAM[v.nTeam].ico + ' ' + TABU_TEAM[v.nTeam].ad + ')' : '');
  if (v.phase === 'hazir'){
    if (v.role === 'anlatici'){
      st.append(tabuEl('h3', '', '🗣 Sıra sende!'),
        tabuEl('p', 'note', v.mode === 'takim' ? 'Takım arkadaşların tahmin edecek, rakip takım kartını görüp yasaklı kelimeleri kontrol edecek.' : 'Herkes sesli tahmin edecek; bilen olunca onun adına bas.'),
        tabuEl('p', 'note', 'Yasaklı kelimeleri ve kelimenin kendisini söyleme. Mikrofonun açık olsun!'));
      const b = tabuEl('button', 'btn primary tabu-big', '▶ Hazırım, başla'); b.onclick = () => tableAct({ type: 'basla' }); st.append(b);
    } else {
      st.append(tabuEl('h3', '', '⏳ ' + who + ' anlatmaya hazırlanıyor…'),
        tabuEl('p', 'note', v.role === 'gozcu' ? 'Rakip takım anlatacak. Kartı sen de göreceksin: yasaklı kelime söylerse “TABU!”ya bas.' : v.role === 'tahminci' ? 'Dinle ve sesli tahmin et!' : 'Oynamak için masaya otur.'));
    }
  } else if (v.phase === 'anlat'){
    if (v.card){
      const card = tabuEl('div', 'tabu-card');
      card.append(tabuEl('div', 'tabu-word', v.card.w.toLocaleUpperCase('tr-TR')));
      const ul = tabuEl('ul', 'tabu-yasak');
      v.card.y.forEach(y => ul.append(tabuEl('li', '', y.toLocaleUpperCase('tr-TR'))));
      card.append(ul); st.append(card);
      const acts = tabuEl('div', 'tabu-acts');
      if (v.role === 'anlatici'){
        if (v.mode === 'tek'){
          const others = v.players.filter(p => p.here && p.id !== v.me);
          others.forEach(p => { const b = tabuEl('button', 'btn primary', '✓ ' + p.name + ' bildi'); b.onclick = () => tableAct({ type: 'dogru', card: v.card.id, kim: p.id }); acts.append(b); });
          if (!others.length){ const b = tabuEl('button', 'btn primary', '✓ Doğru'); b.onclick = () => tableAct({ type: 'dogru', card: v.card.id }); acts.append(b); }
        } else { const b = tabuEl('button', 'btn primary tabu-ok', '✓ Doğru'); b.onclick = () => tableAct({ type: 'dogru', card: v.card.id }); acts.append(b); }
        const t = tabuEl('button', 'btn tabu-no', '🚫 Tabu'); t.title = 'Yasaklı kelime söyledim (−1)'; t.onclick = () => tableAct({ type: 'tabu', card: v.card.id }); acts.append(t);
        const p = tabuEl('button', 'btn', '⏭ Pas (' + v.passes + ')'); p.disabled = v.passes <= 0; p.onclick = () => tableAct({ type: 'pas', card: v.card.id }); acts.append(p);
      } else if (v.role === 'gozcu'){
        st.prepend(tabuEl('p', 'note tabu-rol', '👀 ' + who + ' anlatıyor. Yasaklı kelime söylerse bas!'));
        const t = tabuEl('button', 'btn tabu-no tabu-big', '🚫 TABU!'); t.onclick = () => tableAct({ type: 'tabu', card: v.card.id }); acts.append(t);
      }
      st.append(acts);
    } else {
      const box = tabuEl('div', 'tabu-guess');
      box.append(tabuEl('div', 'tabu-ear', '👂'), tabuEl('h3', '', who + ' anlatıyor'),
        tabuEl('p', 'note', v.role === 'tahminci' ? 'Sesli tahmin et! Bildiğinde anlatıcı “doğru”ya basar.' : 'İzliyorsun.'));
      st.append(box);
    }
    const cnt = tabuEl('div', 'tabu-counts');
    cnt.append(tabuEl('span', 'ok', '✓ ' + v.counts.dogru), tabuEl('span', 'no', '🚫 ' + v.counts.tabu), tabuEl('span', '', '⏭ ' + v.counts.pas));
    st.append(cnt);
    if (v.log.length){
      const ul = tabuEl('div', 'tabu-log');
      v.log.slice().reverse().forEach(x => ul.append(tabuEl('span', 'r-' + x.r, (x.r === 'dogru' ? '✓ ' : x.r === 'tabu' ? '🚫 ' : '⏭ ') + x.w + (x.kim ? ' · ' + x.kim : ''))));
      st.append(ul);
    }
  } else if (v.phase === 'ara'){
    st.append(tabuEl('h3', '', who + ': ' + v.counts.dogru + ' doğru, ' + v.counts.tabu + ' tabu'), tabuEl('p', 'note', v.why));
    const ul = tabuEl('div', 'tabu-log big');
    v.log.forEach(x => ul.append(tabuEl('span', 'r-' + x.r, (x.r === 'dogru' ? '✓ ' : x.r === 'tabu' ? '🚫 ' : '⏭ ') + x.w + (x.kim ? ' · ' + x.kim : ''))));
    if (!v.log.length) ul.append(tabuEl('span', '', 'Bu turda kart açılmadı.'));
    st.append(ul);
  } else if (v.phase === 'bitti'){
    let title = '🏆 Oyun bitti';
    if (v.mode === 'takim'){ const A = v.tscores.A, B = v.tscores.B; title = A === B ? '🤝 Berabere! ' + A + ' - ' + B : '🏆 ' + TABU_TEAM[A > B ? 'A' : 'B'].ico + ' ' + TABU_TEAM[A > B ? 'A' : 'B'].ad + ' takım kazandı! ' + A + ' - ' + B; }
    else { const top = v.players.slice().sort((a, b) => b.score - a.score)[0]; if (top) title = '🏆 Kazanan: ' + top.name + ' (' + top.score + ')'; }
    st.append(tabuEl('h3', '', title));
    if (s.owner === peer.id){ const b = tabuEl('button', 'btn primary', '🔁 Yeni oyun'); b.onclick = () => tableAct({ type: 'newMatch' }); st.append(b); }
  }
  if (s.owner === peer.id && (v.phase === 'anlat' || v.phase === 'hazir')){
    if (!root.querySelector('.tabu-skip')){ const g = tabuEl('button', 'btn small tabu-skip', '⏭ Turu geç'); g.onclick = () => tableAct({ type: 'gec' }); root.querySelector('.tabu-top').append(g); }
  }
  clearInterval(tb.timer);
  const tick = () => {
    if (!root.isConnected){ clearInterval(tb.timer); return; }
    const left = Math.max(0, tb.deadline - Date.now()), t = root.querySelector('.tabu-time');
    t.textContent = v.phase === 'bitti' ? '' : '⏱ ' + Math.ceil(left / 1000);
    t.classList.toggle('low', v.phase === 'anlat' && left < 10000);
  };
  tick(); tb.timer = setInterval(tick, 250);
}
function addTabuFeed(root, f, old){
  const box = root.querySelector('.tabu-feed'); if (!box) return;
  box.append(tabuEl('p', 'tabu-f ' + f.k + (old ? '' : ' new'), f.text));
  while (box.children.length > 40) box.firstChild.remove();
  box.scrollTop = box.scrollHeight;
}
function tabuEvent(ev, s){
  const root = $('deck').querySelector('.tabu'); if (!root || !ev) return;
  const W = w => (w || '').toLocaleUpperCase('tr-TR');
  const f = ev.k === 'dogru' ? { k: 'dogru', text: '✓ Doğru: ' + W(ev.w) + (ev.kim ? ' (' + ev.kim + ' bildi)' : '') }
    : ev.k === 'tabu' ? { k: 'tabu', text: '🚫 TABU! ' + W(ev.w) + (ev.by ? ' (' + ev.by + ' yakaladı)' : '') }
    : ev.k === 'pas' ? { k: 'pas', text: '⏭ Pas' }
    : { k: 'sys', text: ev.text };
  tb.feed.push(f); if (tb.feed.length > 40) tb.feed.shift();
  addTabuFeed(root, f);
  if (ev.k === 'dogru') gameSound('turn');
  else if (ev.k === 'tabu'){ gameSound('err'); root.classList.remove('buzz'); void root.offsetWidth; root.classList.add('buzz'); }
}
