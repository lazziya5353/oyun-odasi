// Tavla tahtası: çizim, zar animasyonu, pul hareketi, tıklayarak oynama.
// Tahta her oyuncuya kendi evi sağ altta olacak şekilde döndürülür.
// Koordinatlar "birim" cinsinden: genişlik 15, yükseklik 11.
const TV = { W: 15, H: 11, CK: 0.88 };
let tvSel = null;                 // seçili pulun yeri (indeks ya da 'bar')
const tvAnim = new Map();         // masa id → son çizilen görünüm bilgisi (animasyon için)

function tvFlip(seat){ return seat === 1; }
// tahtadaki bir hanenin ekrandaki sütun merkezi ve satırı
function tvPointPos(idx, flip){
  const v = flip ? 23 - idx : idx;
  if (v <= 11){ const x = v <= 5 ? 12.8 - v : 5.8 - (v - 6); return { x, bottom: true }; }
  const x = v <= 17 ? 0.8 + (v - 12) : 7.8 + (v - 18);
  return { x, bottom: false };
}
function tvStackY(k, count, bottom){
  const step = count <= 5 ? TV.CK : Math.min(TV.CK, 4.1 / (count - 1));
  return bottom ? 10.7 - TV.CK / 2 - k * step : 0.3 + TV.CK / 2 + k * step;
}
// bir yerdeki k. pulun koordinatı (yer: indeks | 'bar' | 'off'), p: pulun sahibi
function tvLocPos(v, loc, p, k, flip, mySide){
  if (loc === 'bar'){
    const mine = p === mySide;
    return { x: 6.8, y: mine ? 6.4 + k * 0.7 : 4.6 - k * 0.7 };
  }
  if (loc === 'off'){
    const mine = p === mySide;
    return { x: 14.25, y: mine ? 10.6 - k * 0.27 : 0.4 + k * 0.27, off: true };
  }
  const pp = tvPointPos(loc, flip);
  const cnt = Math.abs(v.board[loc]);
  return { x: pp.x, y: tvStackY(k, Math.max(cnt, k + 1), pp.bottom) };
}
const pct = (u, tot) => (u / tot * 100) + '%';

function renderTavla(body, s, lv){
  const v = lv.v, seat = lv.seat, flip = tvFlip(seat), mySide = seat >= 0 ? seat : 0;
  const myTurn = seat >= 0 && v.turn === seat;
  let root = body.querySelector('.tavla');
  if (!root){
    body.innerHTML = '';
    root = document.createElement('div'); root.className = 'tavla';
    root.innerHTML =
      '<div class="tv-player top"></div>' +
      '<div class="tv-board-wrap"><div class="tv-board">' + tvBoardSvg() + '<div class="tv-hl"></div><div class="tv-pieces"></div><div class="tv-dice"></div><div class="tv-msg" hidden></div></div></div>' +
      '<div class="tv-player bottom"></div>' +
      '<div class="tv-controls"></div>';
    body.append(root);
  }
  const names = s.seats.map(x => x ? x.name : '—');
  const opp = 1 - mySide;
  tvPlayerBar(root.querySelector('.tv-player.top'), s, v, opp, names);
  tvPlayerBar(root.querySelector('.tv-player.bottom'), s, v, mySide, names);

  const board = root.querySelector('.tv-board');
  const pieces = root.querySelector('.tv-pieces');
  pieces.innerHTML = '';
  // pulları çiz
  const els = {};      // 'loc:p' → [elementler]
  const addChecker = (loc, p, k, total) => {
    const pos = tvLocPos(v, loc, p, k, flip, mySide);
    const c = document.createElement('div');
    c.className = 'ck ' + (p === 0 ? 'w' : 'b') + (pos.off ? ' off' : '');
    c.style.left = pct(pos.x, TV.W); c.style.top = pct(pos.y, TV.H);
    c.dataset.loc = loc; c.dataset.p = p;
    if (k === total - 1 && total > 5 && !pos.off && loc !== 'bar'){ c.dataset.n = total; c.classList.add('count'); }
    pieces.append(c);
    (els[loc + ':' + p] = els[loc + ':' + p] || []).push(c);
    return c;
  };
  for (let i = 0; i < 24; i++){
    const n = v.board[i]; if (!n) continue;
    const p = n > 0 ? 0 : 1;
    for (let k = 0; k < Math.abs(n); k++) addChecker(i, p, k, Math.abs(n));
  }
  [0, 1].forEach(p => { for (let k = 0; k < v.bar[p]; k++) addChecker('bar', p, k, v.bar[p]); });
  [0, 1].forEach(p => { for (let k = 0; k < v.off[p]; k++) addChecker('off', p, k, v.off[p]); });

  // seçim ve hedefler
  const hl = root.querySelector('.tv-hl'); hl.innerHTML = '';
  const legal = myTurn && v.phase === 'move' ? v.legal : [];
  const froms = new Set(legal.map(m => String(m.from)));
  if (tvSel !== null && !froms.has(String(tvSel))) tvSel = null;
  if (myTurn && v.bar[seat] > 0 && froms.has('bar')) tvSel = 'bar';
  pieces.querySelectorAll('.ck').forEach(c => {
    const loc = c.dataset.loc, p = +c.dataset.p;
    if (p !== seat || !froms.has(loc)) return;
    const top = els[loc + ':' + p]; if (top[top.length - 1] !== c) return;
    c.classList.add('can');
    if (String(tvSel) === loc) c.classList.add('sel');
    c.onclick = e => { e.stopPropagation(); tvSel = String(tvSel) === loc ? null : (loc === 'bar' ? 'bar' : +loc); renderOpenTable(); };
    c.ondblclick = e => {
      e.stopPropagation();
      const ms = legal.filter(m => String(m.from) === loc).sort((a, b) => b.die - a.die);
      if (ms.length){ tvSel = null; tableAct({ type: 'move', from: ms[0].from, to: ms[0].to, die: ms[0].die }); }
    };
  });
  if (tvSel !== null){
    const targets = legal.filter(m => String(m.from) === String(tvSel));
    const seen = new Set();
    targets.forEach(m => {
      if (seen.has(String(m.to))) return; seen.add(String(m.to));
      const t = document.createElement('div');
      if (m.to === 'off'){ t.className = 'tgt off'; t.style.left = pct(13.6, TV.W); t.style.width = pct(1.3, TV.W); t.style.top = mySide === seat ? '52%' : '3%'; t.style.height = '45%'; }
      else {
        const pp = tvPointPos(m.to, flip);
        t.className = 'tgt' + (pp.bottom ? ' bottom' : ' top');
        t.style.left = pct(pp.x - 0.5, TV.W); t.style.width = pct(1, TV.W);
      }
      t.onclick = e => { e.stopPropagation(); const mv = targets.filter(x => String(x.to) === String(m.to)).sort((a, b) => a.die - b.die)[0]; tvSel = null; tableAct({ type: 'move', from: mv.from, to: mv.to, die: mv.die }); };
      hl.append(t);
    });
  }
  board.onclick = () => { if (tvSel !== null && !(myTurn && v.bar[seat] > 0)){ tvSel = null; renderOpenTable(); } };

  // zarlar
  tvRenderDice(root.querySelector('.tv-dice'), s, v, seat, mySide);
  // animasyonlar: yeni oynanan hamleler
  tvAnimate(s, v, lv, els, pieces, flip, mySide);
  // mesaj ve kontroller
  tvControls(root.querySelector('.tv-controls'), root.querySelector('.tv-msg'), s, v, seat, names, board);
}
function tvBoardSvg(){
  // üçgenler: üst sıra aşağı, alt sıra yukarı bakar; renkler sırayla
  let tri = '';
  const col = (k) => k % 2 ? 'var(--tv-p2)' : 'var(--tv-p1)';
  for (let k = 0; k < 12; k++){
    const x = k < 6 ? 0.3 + k : 7.3 + (k - 6);
    tri += `<polygon points="${x},0.3 ${x + 1},0.3 ${x + 0.5},4.9" fill="${col(k)}"/>`;
    tri += `<polygon points="${x},10.7 ${x + 1},10.7 ${x + 0.5},6.1" fill="${col(k + 1)}"/>`;
  }
  return `<svg class="tv-bg" viewBox="0 0 15 11" preserveAspectRatio="none" aria-hidden="true">
    <rect x="0" y="0" width="15" height="11" rx="0.35" fill="var(--tv-frame)"/>
    <rect x="0.3" y="0.3" width="6" height="10.4" fill="var(--tv-felt)"/>
    <rect x="7.3" y="0.3" width="6" height="10.4" fill="var(--tv-felt)"/>
    <rect x="6.3" y="0" width="1" height="11" fill="var(--tv-bar)"/>
    <rect x="13.6" y="0.3" width="1.3" height="10.4" rx="0.15" fill="var(--tv-tray)"/>
    ${tri}
    <line x1="13.6" y1="5.5" x2="14.9" y2="5.5" stroke="var(--tv-frame)" stroke-width="0.08"/>
  </svg>`;
}
function tvPlayerBar(el, s, v, p, names){
  const x = s.seats[p];
  const isTurn = v.turn === p && (v.phase === 'roll' || v.phase === 'move');
  el.className = 'tv-player ' + (el.classList.contains('top') ? 'top' : 'bottom') + (isTurn ? ' turn' : '');
  el.innerHTML = '';
  const chip = document.createElement('span'); chip.className = 'tv-chip ' + (p === 0 ? 'w' : 'b');
  const nm = document.createElement('b'); nm.textContent = names[p] + (x && x.bot ? ' 🤖' : '');
  if (x && !x.bot) nm.dataset.treatFor = x.id;
  const info = document.createElement('span'); info.className = 'note';
  info.textContent = 'Pip ' + (v.pips ? v.pips[p] : '') + ' · Topladı ' + v.off[p] + '/15';
  const sc = document.createElement('span'); sc.className = 'tv-score'; sc.textContent = v.score[p];
  const turn = document.createElement('span'); turn.className = 'tv-turn'; turn.textContent = isTurn ? (v.phase === 'roll' ? 'zar atacak' : 'oynuyor…') : '';
  el.append(chip, nm, info, turn, sc);
}
function tvDieFace(n){
  const d = document.createElement('div'); d.className = 'die f' + n;
  for (let i = 0; i < 9; i++){ const pip = document.createElement('i'); d.append(pip); }
  return d;
}
function tvRenderDice(box, s, v, seat, mySide){
  const st = tvAnim.get(s.id) || {};
  box.innerHTML = '';
  let cls = '';
  if (v.phase === 'move' && v.rolled && v.rolled.length){
    const faces = v.rolled.slice();
    const isDouble = faces[0] === faces[1];
    const shown = isDouble ? [faces[0], faces[0], faces[0], faces[0]] : faces;
    const left = v.dice.slice();               // kalan zarlar; kullanılanlar soluk görünür
    shown.forEach(n => {
      const d = tvDieFace(n);
      const k = left.indexOf(n);
      if (k >= 0) left.splice(k, 1); else d.classList.add('used');
      if (isDouble) d.classList.add('small');
      box.append(d);
    });
    cls = v.turn === mySide ? 'me' : 'them';
  } else if (v.phase === 'roll' && v.openRoll && isFirstRollOfGame(v)){
    // açılış: iki oyuncu birer zar atar, büyük atan başlar
    const a = tvDieFace(v.openRoll[0]); a.classList.add('w-die');
    const b = tvDieFace(v.openRoll[1]); b.classList.add('b-die');
    box.append(a, b); cls = 'opening';
  }
  box.className = 'tv-dice ' + cls;
  // yeni atışta zarlar yuvarlanır
  let sig = '';
  if (v.phase === 'move' && v.turnMoves.length === 0 && v.dice.length === (v.rolled[0] === v.rolled[1] ? 4 : 2))
    sig = 'r:' + v.gameNo + ':' + v.turn + ':' + v.rolled.join('') + ':' + v.board.join(',');
  if (cls === 'opening') sig = 'o:' + v.gameNo + ':' + v.openRoll.join('');
  if (sig && st.rollSig !== sig){
    st.rollSig = sig; tvAnim.set(s.id, st);
    gameSound('dice');
    if (!reducedMotion()){
      box.querySelectorAll('.die').forEach((d, i) => {
        const real = d.className;
        d.classList.add('rolling'); d.style.animationDelay = (i * 60) + 'ms';
        let n = 0;
        const iv = setInterval(() => {
          d.className = 'die rolling f' + (1 + Math.floor(Math.random() * 6)) + (real.includes('small') ? ' small' : '') + (real.includes('w-die') ? ' w-die' : '') + (real.includes('b-die') ? ' b-die' : '');
          if (++n > 7){ clearInterval(iv); d.className = real; }
        }, 75);
      });
    }
  }
}
// yeni hamleleri animasyonla göster
function tvAnimate(s, v, lv, els, pieces, flip, mySide){
  const st = tvAnim.get(s.id) || {};
  const turnSig = v.gameNo + ':' + v.turn + ':' + (v.rolled || []).join('');
  const done = st.turnSig === turnSig ? (st.moves || 0) : 0;
  const prev = lv.prev;
  const moves = v.turnMoves || [];
  tvAnim.set(s.id, Object.assign(st, { turnSig, moves: moves.length }));
  if (!prev || moves.length <= done || reducedMotion()) return;
  if (moves.length - done > 2) return;     // çok gerideyse (geç bağlanan) animasyonsuz göster
  moves.slice(done).forEach((m, i) => {
    const p = v.turn;
    // nereden: önceki görünümdeki en üst pulun yeri
    const fromCount = m.from === 'bar' ? prev.bar[p] : Math.abs(prev.board[m.from]);
    const a = tvLocPos(prev, m.from, p, Math.max(0, fromCount - 1), flip, mySide);
    const list = els[m.to + ':' + p] || [];
    const target = list[list.length - 1];
    if (!target) return;
    const b = { x: parseFloat(target.style.left) / 100 * TV.W, y: parseFloat(target.style.top) / 100 * TV.H };
    target.style.visibility = 'hidden';
    const fly = document.createElement('div'); fly.className = 'ck fly ' + (p === 0 ? 'w' : 'b');
    fly.style.left = pct(a.x, TV.W); fly.style.top = pct(a.y, TV.H);
    pieces.append(fly);
    const dx = (b.x - a.x) / TV.W * 100, dy = (b.y - a.y) / TV.H * 100;
    const W = pieces.clientWidth, H = pieces.clientHeight;
    const anim = fly.animate([
      { transform: 'translate(-50%,-50%) scale(1)' },
      { transform: `translate(calc(-50% + ${dx / 2 * W / 100}px), calc(-50% + ${dy / 2 * H / 100 - 30}px)) scale(1.18)`, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx * W / 100}px), calc(-50% + ${dy * H / 100}px)) scale(1)` }
    ], { duration: 420, delay: i * 120, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
    anim.onfinish = () => { fly.remove(); target.style.visibility = ''; gameSound('checker'); if (m.hit) tvHitFlash(pieces, b); };
  });
}
function tvHitFlash(pieces, pos){
  const f = document.createElement('div'); f.className = 'tv-hit';
  f.style.left = pct(pos.x, TV.W); f.style.top = pct(pos.y, TV.H); f.textContent = 'KIRDI!';
  pieces.append(f); setTimeout(() => f.remove(), 1000);
}
function tvControls(ctl, msg, s, v, seat, names, board){
  ctl.innerHTML = '';
  msg.hidden = true;
  const myTurn = seat >= 0 && v.turn === seat;
  const say = (t, cls) => { msg.hidden = false; msg.className = 'tv-msg ' + (cls || ''); msg.textContent = t; };
  if (v.phase === 'opening') say('Açılış zarları atılıyor…');
  else if (v.phase === 'roll'){
    if (v.openRoll && isFirstRollOfGame(v))
      say(names[0] + ' ' + v.openRoll[0] + ' · ' + names[1] + ' ' + v.openRoll[1] + ' → ' + names[v.turn] + ' başlıyor');
    if (myTurn){
      const b = document.createElement('button'); b.className = 'btn primary big-roll'; b.innerHTML = '🎲 Zar at';
      b.onclick = () => { b.disabled = true; tableAct({ type: 'roll' }); };
      ctl.append(b);
    } else ctl.append(Object.assign(document.createElement('span'), { className: 'note', textContent: names[v.turn] + ' zar atacak…' }));
  } else if (v.phase === 'move'){
    if (v.noMoves) say((myTurn ? 'Oynayacak hamlen yok' : names[v.turn] + ' oynayamıyor') + ' · sıra geçiyor', 'warn');
    if (myTurn){
      if (v.turnMoves.length){
        const u = document.createElement('button'); u.className = 'btn'; u.textContent = '↶ Geri al';
        u.onclick = () => tableAct({ type: 'undo' }); ctl.append(u);
      }
      if (v.done && !v.noMoves){
        const e = document.createElement('button'); e.className = 'btn primary'; e.textContent = '✓ Bitir';
        e.onclick = () => tableAct({ type: 'end' }); ctl.append(e);
        ctl.append(Object.assign(document.createElement('span'), { className: 'note', textContent: 'Birkaç saniye içinde sıra kendiliğinden geçer' }));
      } else if (!v.noMoves){
        ctl.append(Object.assign(document.createElement('span'), { className: 'note', textContent: v.bar[seat] ? 'Kırık pulunu içeri sok: parlayan haneye tıkla' : 'Bir pula tıkla, sonra parlayan haneye tıkla (çift tıklama: büyük zarla oyna)' }));
      }
    } else ctl.append(Object.assign(document.createElement('span'), { className: 'note', textContent: names[v.turn] + ' oynuyor…' }));
  } else if (v.phase === 'over' || v.phase === 'matchover'){
    const w = v.winner;
    const pts = v.winType === 'mars' ? 2 : 1;
    say((w === seat ? '🎉 Kazandın' : names[w] + ' kazandı') + (v.winType === 'mars' ? ' · MARS! (+2)' : ' (+1)') + ' · ' + v.score[0] + '–' + v.score[1], 'win');
    const st = tvAnim.get(s.id) || {};
    const sig = 'win:' + v.gameNo;
    if (st.winSig !== sig){ st.winSig = sig; tvAnim.set(s.id, st); gameSound('win'); confetti(board); }
    if (v.phase === 'matchover'){
      say('🏆 Maçı ' + (w === seat ? 'sen' : names[w]) + ' kazandı · ' + v.score[0] + '–' + v.score[1], 'win');
      if (s.owner === peer.id){
        const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = '↻ Yeni maç';
        b.onclick = () => tableAct({ type: 'newMatch' }); ctl.append(b);
      }
    } else ctl.append(Object.assign(document.createElement('span'), { className: 'note', textContent: 'Sonraki oyun birkaç saniye içinde başlıyor…' }));
    void pts;
  }
  const tgt = document.createElement('span'); tgt.className = 'note tv-target'; tgt.textContent = v.target === 1 ? 'Tek oyun' : v.target + ' puanlık maç';
  ctl.append(tgt);
}
function isFirstRollOfGame(v){
  // oyunun ilk atışı: tahta başlangıç dizilişinde ve kimse oynamadı
  return JSON.stringify(v.board) === JSON.stringify(TavlaCore.initialBoard()) && v.off[0] + v.off[1] === 0 && v.bar[0] + v.bar[1] === 0;
}
