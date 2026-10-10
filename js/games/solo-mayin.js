// Mayın Tarlası: Kolay 9×9/10, Orta 16×16/40, Zor 16×22/70 (dar ekranda Zor dikey kurulur: 22×16).
// İlk açılan kare ve komşuları hep güvenli (bir alan açılır). Sol tık aç, sağ tık / uzun bas bayrak, açık sayıya tık = akor.
// Skor = kazanınca geçen süre (tam saniye, yukarı yuvarlanır; az olan iyi). Kaybedince sıralamaya girmez.
// MayinCore saf (DOM'suz, Node'da testli).
(function(){
'use strict';

// ---------------- Saf çekirdek ----------------
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const LEVELS = { kolay: { rows: 9, cols: 9, mines: 10 }, orta: { rows: 16, cols: 16, mines: 40 }, zor: { rows: 16, cols: 22, mines: 70 } };

function newBoard(rows, cols, mines){
  const n = rows * cols;
  return { rows, cols, n, mines, mine: new Uint8Array(n), adj: new Uint8Array(n), open: new Uint8Array(n), flag: new Uint8Array(n),
    placed: false, state: 'ready', opened: 0, flags: 0, boom: -1 };
}
function neighbors(b, i){
  const r = Math.floor(i / b.cols), c = i % b.cols, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++){
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && cc >= 0 && rr < b.rows && cc < b.cols) out.push(rr * b.cols + cc);
  }
  return out;
}
// mayınları ilk tıklamadan sonra yerleştir: tıklanan kare (yer varsa komşuları da) güvenli
function place(b, safe, rng){
  const excl = new Set([safe]);
  if (b.n - 9 >= b.mines) neighbors(b, safe).forEach(j => excl.add(j));
  const cand = [];
  for (let i = 0; i < b.n; i++) if (!excl.has(i)) cand.push(i);
  for (let k = 0; k < b.mines; k++){
    const j = k + Math.floor(rng() * (cand.length - k));
    const t = cand[k]; cand[k] = cand[j]; cand[j] = t;
    b.mine[cand[k]] = 1;
  }
  for (let i = 0; i < b.n; i++){ let a = 0; for (const j of neighbors(b, i)) a += b.mine[j]; b.adj[i] = a; }
  b.placed = true; b.state = 'play';
}
// aç: açılan kareleri BFS sırasıyla { i, d } (d = başlangıca uzaklık, dalga animasyonu için) döndürür
function reveal(b, i, rng){
  if (b.state === 'won' || b.state === 'lost') return [];
  if (b.open[i] || b.flag[i]) return [];
  if (!b.placed) place(b, i, rng || Math.random);
  if (b.mine[i]){ b.open[i] = 1; b.state = 'lost'; b.boom = i; return [{ i, d: 0 }]; }
  const out = [], q = [i], dist = new Map([[i, 0]]);
  while (q.length){
    const x = q.shift();
    if (b.open[x]) continue;
    b.open[x] = 1; b.opened++;
    const d = dist.get(x); out.push({ i: x, d });
    if (b.adj[x] === 0) for (const j of neighbors(b, x)){
      if (b.open[j] || b.flag[j] || b.mine[j] || dist.has(j)) continue;
      dist.set(j, d + 1); q.push(j);
    }
  }
  checkWin(b);
  return out;
}
// akor: açık sayının çevresindeki bayrak sayısı sayıya eşitse kalan kapalı komşuları aç
function chord(b, i){
  if (b.state !== 'play' || !b.open[i] || b.mine[i] || !b.adj[i]) return [];
  const nb = neighbors(b, i);
  let f = 0; for (const j of nb) f += b.flag[j];
  if (f !== b.adj[i]) return [];
  let out = [];
  for (const j of nb){
    if (b.open[j] || b.flag[j]) continue;
    if (b.mine[j]){ b.open[j] = 1; if (b.boom < 0) b.boom = j; b.state = 'lost'; out.push({ i: j, d: 1 }); continue; }
    const st = b.state; b.state = 'play';
    out = out.concat(reveal(b, j).map(o => ({ i: o.i, d: o.d + 1 })));
    if (st === 'lost') b.state = 'lost';
  }
  if (b.state !== 'lost') checkWin(b);
  return out;
}
function toggleFlag(b, i){
  if (b.state === 'won' || b.state === 'lost' || b.open[i]) return false;
  b.flag[i] ^= 1; b.flags += b.flag[i] ? 1 : -1;
  return true;
}
function checkWin(b){
  if (b.state === 'play' && b.opened === b.n - b.mines){ b.state = 'won'; return true; }
  return false;
}
const scoreOf = ms => Math.max(1, Math.ceil(ms / 1000));

const MayinCore = { LEVELS, mulberry32, newBoard, neighbors, place, reveal, chord, toggleFlag, checkWin, scoreOf };
if (typeof module !== 'undefined' && module.exports){ module.exports = MayinCore; return; }
if (typeof window !== 'undefined') window.MayinCore = MayinCore;

// ---------------- Arayüz ----------------
const SVG_MINE = '<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="#eceef4" stroke-width="3.2" stroke-linecap="round"><path d="M16 3v26M3 16h26M6.8 6.8l18.4 18.4M25.2 6.8L6.8 25.2"/></g>' +
  '<circle cx="16" cy="16" r="9.5" fill="#eceef4"/><circle cx="17.5" cy="17.5" r="7" fill="#b9bdca"/><circle cx="13" cy="13" r="2.8" fill="#fff"/></svg>';
const SVG_FLAG = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 5v20" stroke="#e8e8ee" stroke-width="2.6" stroke-linecap="round"/>' +
  '<path d="M12 5.5l13 5.2-13 5.3z" fill="#ff4d5e"/><path d="M12 5.5l13 5.2-13 1.8z" fill="#ff7a86"/><rect x="6" y="24" width="12" height="3.5" rx="1.6" fill="#e8e8ee"/></svg>';
function snd(kind){
  try {
    if (typeof tone !== 'function') return;
    if (kind === 'open') tone([880], 0, 0.05, 0.03);
    else if (kind === 'wave') tone([660, 880, 1100], 0.04, 0.08, 0.035);
    else if (kind === 'flag') tone([1200, 1500], 0.04, 0.06, 0.03);
    else if (kind === 'unflag') tone([1000, 800], 0.04, 0.06, 0.025);
    else if (kind === 'boom') tone([180, 120, 80], 0.08, 0.4, 0.12);
    else if (kind === 'tick') tone([300], 0, 0.06, 0.03);
  } catch(e){}
}
const fmt = sec => { sec = Math.max(0, Math.floor(sec)); const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + String(s).padStart(2, '0'); };

function mount(root, ctx){
  const L = LEVELS[ctx.level] || LEVELS.kolay;
  const wrap = document.createElement('div'); wrap.className = 'mayin';
  wrap.innerHTML =
    '<div class="mayin-bar"><span class="mayin-pill mayin-left" title="Kalan mayın"><i>💣</i><b>0</b></span>' +
    '<button type="button" class="mayin-face" aria-label="Yeni oyun" title="Yeni oyun">🙂</button>' +
    '<span class="mayin-pill mayin-time" title="Süre"><i>⏱</i><b>0:00</b></span>' +
    '<span class="mayin-tools"><button type="button" class="mayin-tool mayin-flagmode" aria-pressed="false" title="Bayrak modu (F)">🚩 <span>Bayrak modu</span></button>' +
    '<button type="button" class="mayin-tool mayin-zoom" aria-pressed="false" title="Yakınlaştır">🔍</button></span></div>' +
    '<div class="mayin-scroll"><div class="mayin-board" role="grid" aria-label="Mayın tarlası"></div></div>' +
    '<div class="mayin-help"><span>Sol tık: aç</span><span>Sağ tık: bayrak</span><span>Açık sayıya tık: çevresini aç (bayraklar tamamsa)</span><span><kbd>F</kbd>: bayrak modu</span></div>';
  root.append(wrap);
  const q = s => wrap.querySelector(s);
  const scroll = q('.mayin-scroll'), boardEl = q('.mayin-board'), face = q('.mayin-face');
  const leftEl = q('.mayin-left b'), timeEl = q('.mayin-time b'), flagBtn = q('.mayin-flagmode'), zoomBtn = q('.mayin-zoom');
  const reduced = !!ctx.reducedMotion;

  // dar ekranda geniş tahtayı dikey kur
  const narrow = (wrap.clientWidth || root.clientWidth || 800) < 520;
  const rows = narrow && L.cols > L.rows ? L.cols : L.rows, cols = narrow && L.cols > L.rows ? L.rows : L.cols;
  const b = newBoard(rows, cols, L.mines);
  const rng = mulberry32((Math.random() * 4294967296) >>> 0);
  let t0 = 0, endMs = 0, timer = 0, flagMode = false, zoom = false, finished = false, destroyed = false, clicks = 0;
  const timeouts = [];
  const later = (fn, ms) => { const id = setTimeout(() => { if (!destroyed) fn(); }, ms); timeouts.push(id); return id; };

  // hücreler
  const cells = [];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < b.n; i++){
    const c = document.createElement('div'); c.className = 'mayin-c'; c.dataset.i = i; c.setAttribute('role', 'gridcell');
    cells.push(c); frag.append(c);
  }
  boardEl.append(frag);
  boardEl.style.setProperty('--cols', cols);

  function paint(i, delay){
    const c = cells[i];
    if (b.open[i]){
      if (c.classList.contains('open')) return;
      c.classList.remove('flag');
      c.classList.add('open');
      if (delay && !reduced) c.style.setProperty('--d', delay + 'ms');
      if (b.mine[i]){ c.classList.add('mine'); c.innerHTML = SVG_MINE; }
      else if (b.adj[i]){ c.textContent = b.adj[i]; c.classList.add('n' + b.adj[i]); }
    } else {
      const f = !!b.flag[i];
      if (f !== c.classList.contains('flag')){ c.classList.toggle('flag', f); c.innerHTML = f ? SVG_FLAG : ''; }
    }
  }
  function updateBar(){
    leftEl.textContent = b.mines - b.flags;
    const ms = b.state === 'won' || b.state === 'lost' ? endMs : t0 ? performance.now() - t0 : 0;
    timeEl.textContent = fmt(ms / 1000);
  }
  function resize(){
    const pad = 12 + 2 * (parseFloat(getComputedStyle(boardEl).paddingLeft) || 0);
    const aw = scroll.clientWidth - pad, ah = scroll.clientHeight - pad;
    let c = Math.floor(aw / cols);
    if (ah > 100) c = Math.min(c, Math.floor(ah / rows));
    c = Math.max(22, Math.min(46, c));
    if (zoom) c = Math.max(c, 36);
    boardEl.style.setProperty('--mc', c + 'px');
    wrap.classList.toggle('mayin-scrolls', cols * c > aw + 2 || rows * c > ah + 2);
  }

  function startTimer(){
    if (t0) return;
    t0 = performance.now();
    timer = setInterval(updateBar, 250);
  }
  function stopTimer(){ endMs = t0 ? performance.now() - t0 : 0; clearInterval(timer); timer = 0; }

  function applyOpened(list){
    list.forEach(o => paint(o.i, Math.min(o.d * 28, 700)));
    if (list.length > 1) snd('wave'); else if (list.length === 1) snd('open');
  }
  function act(i, alt){
    if (b.state === 'won' || b.state === 'lost') return;
    const wantFlag = flagMode !== !!alt;
    if (b.open[i]){
      const res = chord(b, i);
      if (res.length){ clicks++; applyOpened(res); }
      else if (b.adj[i] && !reduced){ // akor yapılamadı: komşuları kısa vurgula
        neighbors(b, i).forEach(j => { if (!b.open[j] && !b.flag[j]){ cells[j].classList.remove('hint'); void cells[j].offsetWidth; cells[j].classList.add('hint'); } });
      }
    } else if (wantFlag){
      if (toggleFlag(b, i)){ paint(i); snd(b.flag[i] ? 'flag' : 'unflag'); try { if (navigator.vibrate) navigator.vibrate(15); } catch(e){} }
    } else {
      if (b.flag[i]) return;
      const first = !b.placed;
      const res = reveal(b, i, rng);
      if (!res.length) return;
      clicks++;
      if (first) startTimer();
      applyOpened(res);
    }
    after();
  }
  function after(){
    updateBar();
    if (b.state === 'lost') lose();
    else if (b.state === 'won') win();
  }

  function lose(){
    stopTimer(); updateBar();
    face.textContent = '😵'; wrap.classList.add('lost');
    snd('boom');
    const boom = b.boom;
    cells[boom].classList.add('boom');
    if (!reduced){ wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake'); }
    const br = Math.floor(boom / cols), bc = boom % cols;
    const rest = [];
    for (let i = 0; i < b.n; i++){
      if (b.mine[i] && i !== boom && !b.flag[i]) rest.push(i);
      if (b.flag[i] && !b.mine[i]) cells[i].classList.add('wrong');
    }
    rest.sort((x, y) => Math.hypot(Math.floor(x / cols) - br, x % cols - bc) - Math.hypot(Math.floor(y / cols) - br, y % cols - bc));
    const step = reduced ? 0 : Math.min(70, 1400 / Math.max(1, rest.length));
    rest.forEach((i, k) => later(() => { b.open[i] = 1; paint(i); cells[i].classList.add('late'); }, 250 + k * step));
    const total = reduced ? 50 : 250 + rest.length * step + 500;
    later(() => {
      if (finished) return; finished = true;
      const secs = Math.max(0, Math.round(endMs / 1000));
      try { ctx.finish({ score: secs, ranked: false, detail: { lost: true, ms: Math.round(endMs), opened: b.opened, clicks, rows, cols, mines: b.mines } }); } catch(e){}
    }, total);
  }
  function win(){
    stopTimer(); updateBar();
    face.textContent = '😎'; wrap.classList.add('won');
    const mines = [];
    for (let i = 0; i < b.n; i++) if (b.mine[i] && !b.flag[i]) mines.push(i);
    mines.forEach((i, k) => later(() => { b.flag[i] = 1; b.flags++; paint(i); cells[i].classList.add('pop'); updateBar(); }, reduced ? 0 : 200 + k * 25));
    try { ctx.sound('win'); } catch(e){}
    later(() => { try { if (typeof confetti === 'function') confetti(wrap); } catch(e){} }, reduced ? 0 : 250);
    if (!finished){
      finished = true;
      try { ctx.finish({ score: scoreOf(endMs), detail: { ms: Math.round(endMs), clicks, rows, cols, mines: b.mines } }); } catch(e){}
    }
  }

  // ----- girdi -----
  let press = null; // { i, id, timer, long, type }
  const cellOf = e => { const t = e.target.closest && e.target.closest('.mayin-c'); return t ? +t.dataset.i : -1; };
  function setPressed(i, on){ if (i >= 0) cells[i].classList.toggle('press', on); if (b.state === 'play' || b.state === 'ready') face.textContent = on ? '😮' : '🙂'; }
  boardEl.addEventListener('pointerdown', e => {
    const i = cellOf(e); if (i < 0 || b.state === 'won' || b.state === 'lost') return;
    if (e.pointerType === 'mouse'){
      if (e.button === 2){ e.preventDefault(); act(i, true); return; }
      if (e.button === 1){ e.preventDefault(); if (b.open[i]) act(i, false); return; }
      if (e.button !== 0) return;
    }
    press = { i, id: e.pointerId, long: false, type: e.pointerType, x: e.clientX, y: e.clientY, timer: 0 };
    setPressed(i, true);
    if (e.pointerType !== 'mouse' && !b.open[i]){
      press.timer = setTimeout(() => { if (!press) return; press.long = true; setPressed(press.i, false); act(press.i, true); }, 380);
    }
  });
  boardEl.addEventListener('pointermove', e => {
    if (!press || e.pointerId !== press.id) return;
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 12){ clearTimeout(press.timer); setPressed(press.i, false); press = null; } // kaydırma
  });
  const up = e => {
    if (!press || e.pointerId !== press.id) return;
    const p = press; press = null;
    clearTimeout(p.timer); setPressed(p.i, false);
    if (e.type === 'pointercancel' || p.long) return;
    if (cellOf(e) !== p.i && p.type === 'mouse') return;
    act(p.i, false);
  };
  boardEl.addEventListener('pointerup', up);
  boardEl.addEventListener('pointercancel', up);
  boardEl.addEventListener('contextmenu', e => e.preventDefault());
  face.addEventListener('click', () => ctx.restart());
  const setFlagMode = v => { flagMode = v; flagBtn.classList.toggle('on', v); flagBtn.setAttribute('aria-pressed', String(v)); wrap.classList.toggle('flagging', v); };
  flagBtn.addEventListener('click', () => setFlagMode(!flagMode));
  zoomBtn.addEventListener('click', () => { zoom = !zoom; zoomBtn.classList.toggle('on', zoom); zoomBtn.setAttribute('aria-pressed', String(zoom)); resize(); });
  const typing = e => { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
  const onKey = e => { if (typing(e) || !wrap.isConnected || wrap.offsetParent === null) return; if (e.code === 'KeyF' && !e.repeat){ setFlagMode(!flagMode); } };
  window.addEventListener('keydown', onKey);
  const ro = window.ResizeObserver ? new ResizeObserver(() => resize()) : null;
  if (ro) ro.observe(scroll); else window.addEventListener('resize', resize);

  resize(); updateBar();
  wrap._mayin = { b, cells, act, get flagMode(){ return flagMode; }, setFlagMode };

  return {
    destroy(){
      if (destroyed) return; destroyed = true;
      clearInterval(timer); timeouts.forEach(clearTimeout); if (press) clearTimeout(press.timer);
      window.removeEventListener('keydown', onKey);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      wrap.remove();
    }
  };
}

const def = {
  id: 'mayin', name: 'Mayın Tarlası', icon: '💣',
  desc: 'Sayılara bak, mayınları bul. En hızlı temizleyen kazanır.',
  levels: [{ id: 'kolay', name: 'Kolay' }, { id: 'orta', name: 'Orta' }, { id: 'zor', name: 'Zor' }],
  daily: false, better: 'low',
  format: s => fmt(s),
  mount
};
if (typeof registerSolo === 'function') registerSolo(def);
else (window.SOLO_PENDING = window.SOLO_PENDING || []).push(def);
})();
