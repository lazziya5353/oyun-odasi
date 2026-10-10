// Yılan: klasik yılan, yumuşak (ara karelere enterpolasyonlu) hareketle. Duvarlar ölümcül (sarmal geçiş yok).
// Yem 10 puan (+1 boy), her 5 yemde bir süreli altın yıldız çıkar: 50 puan (+2 boy). Boy uzadıkça hız artar.
// Tahta 22×14 kare; dar (telefon) ekranda aynı tahta dikey (14×22) kurulur, zorluk değişmez. YilanCore saf ve Node'da testli.
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
const YC = { LONG: 22, SHORT: 14, START: 4, T0: 0.15, TMIN: 0.065, TSTEP: 0.0022, BONUS_EVERY: 5, BONUS_LIFE: 42, FOOD: 10, BONUS: 50 };
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function newState(seed, cols, rows){
  cols = cols || YC.LONG; rows = rows || YC.SHORT;
  const s = {
    rng: mulberry32(seed >>> 0), cols, rows, snake: [], dir: 'right', queue: [], food: null, bonus: null,
    score: 0, foods: 0, bonuses: 0, grow: 0, ticks: 0, dead: false, won: false, reason: '', prevTail: null, ev: []
  };
  const hy = Math.floor(rows / 2), hx = Math.max(YC.START, Math.floor(cols / 2) - 1);
  for (let i = 0; i < YC.START; i++) s.snake.push({ x: hx - i, y: hy });
  s.food = place(s, s.rng() < 0.5 ? 'elma' : 'simit');
  return s;
}
const occupied = (s, x, y) => s.snake.some(c => c.x === x && c.y === y);
function place(s, k){
  const free = [];
  for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++){
    if (occupied(s, x, y)) continue;
    if (s.food && s.food.x === x && s.food.y === y) continue;
    if (s.bonus && s.bonus.x === x && s.bonus.y === y) continue;
    free.push([x, y]);
  }
  if (!free.length) return null;
  const c = free[Math.floor(s.rng() * free.length)];
  return { x: c[0], y: c[1], k };
}
const interval = s => Math.max(YC.TMIN, YC.T0 - (s.snake.length - YC.START) * YC.TSTEP);
const opposite = (a, b) => DIRS[a][0] === -DIRS[b][0] && DIRS[a][1] === -DIRS[b][1];

// yön isteği (en çok 3 tanesi sıraya alınır; ters yön ve aynı yön yok sayılır)
function turn(s, d){
  if (!DIRS[d] || s.dead) return false;
  const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
  if (d === last || opposite(d, last) || s.queue.length >= 3) return false;
  s.queue.push(d);
  return true;
}

function tick(s){
  if (s.dead) return;
  s.ev = [];
  if (s.queue.length) s.dir = s.queue.shift();
  const h = s.snake[0], v = DIRS[s.dir];
  const nx = h.x + v[0], ny = h.y + v[1];
  if (nx < 0 || ny < 0 || nx >= s.cols || ny >= s.rows){ s.dead = true; s.reason = 'duvar'; s.ev.push('die'); return; }
  const growing = s.grow > 0;
  const n = s.snake.length - (growing ? 0 : 1);   // kuyruk bu adımda boşalacaksa ona çarpmak ölüm değil
  for (let i = 0; i < n; i++) if (s.snake[i].x === nx && s.snake[i].y === ny){ s.dead = true; s.reason = 'kendi'; s.ev.push('die'); return; }
  s.snake.unshift({ x: nx, y: ny });
  if (growing){ s.grow--; s.prevTail = null; } else s.prevTail = s.snake.pop();
  s.ticks++;
  if (s.food && s.food.x === nx && s.food.y === ny){
    s.score += YC.FOOD; s.foods++; s.grow += 1; s.ev.push('eat');
    s.food = null;
    if (s.foods % YC.BONUS_EVERY === 0 && !s.bonus){ s.bonus = place(s, 'yildiz'); if (s.bonus){ s.bonus.life = YC.BONUS_LIFE; s.ev.push('bonus'); } }
    s.food = place(s, s.rng() < 0.5 ? 'elma' : 'simit');
  } else if (s.bonus && s.bonus.x === nx && s.bonus.y === ny){
    s.score += YC.BONUS; s.bonuses++; s.grow += 2; s.bonus = null; s.ev.push('star');
  }
  if (s.bonus && s.ev.indexOf('bonus') < 0 && --s.bonus.life <= 0){ s.bonus = null; s.ev.push('bonusgone'); }
  if (s.snake.length + s.grow >= s.cols * s.rows || (!s.food && !s.bonus)){ s.dead = true; s.won = true; s.reason = 'dolu'; s.ev.push('win'); }
}

const YilanCore = { YC, DIRS, mulberry32, newState, turn, tick, interval, place, opposite };
if (typeof module !== 'undefined' && module.exports){ module.exports = YilanCore; return; }
if (typeof window !== 'undefined') window.YilanCore = YilanCore;

// ---------------- Arayüz ----------------
function snd(kind){
  try {
    if (typeof tone !== 'function') return;
    if (kind === 'eat') tone([660, 990], 0.05, 0.12, 0.06);
    else if (kind === 'star') tone([784, 1047, 1319, 1568], 0.06, 0.16, 0.07);
    else if (kind === 'bonus') tone([1319, 1568], 0.08, 0.1, 0.04);
    else if (kind === 'die') tone([330, 247, 165], 0.1, 0.3, 0.09);
    else if (kind === 'turn') tone([1200], 0, 0.025, 0.015);
  } catch(e){}
}
function toRgb(col){
  try {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillStyle = col; x.fillRect(0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]];
  } catch(e){ return [94, 224, 181]; }
}
const mixRgb = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
const rgbStr = (c, a) => a === undefined ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };

function mount(root, ctx){
  const wrap = document.createElement('div'); wrap.className = 'yilan';
  wrap.innerHTML =
    '<div class="yilan-hud"><span class="yilan-stat yilan-score"><i>🍎</i><b>0</b><small>puan</small></span>' +
    '<span class="yilan-stat yilan-len"><i>🐍</i><b>4</b><small>boy</small></span>' +
    '<span class="yilan-stat yilan-spd"><i>⚡</i><b>1</b><small>hız</small></span>' +
    '<button type="button" class="yilan-pausebtn" aria-label="Duraklat">⏸</button></div>' +
    '<div class="yilan-area"><div class="yilan-stage"><canvas class="yilan-cv" aria-label="Yılan oyun alanı"></canvas><div class="yilan-ov"></div></div></div>' +
    '<div class="yilan-pad" aria-label="Yön tuşları"><button type="button" data-d="up" aria-label="Yukarı">▲</button><button type="button" data-d="left" aria-label="Sola">◀</button>' +
    '<button type="button" data-d="right" aria-label="Sağa">▶</button><button type="button" data-d="down" aria-label="Aşağı">▼</button></div>' +
    '<div class="yilan-help"><span><kbd>←↑↓→</kbd> / <kbd>WASD</kbd>: yön</span><span>Duvara ve kendine çarpma</span><span>⭐ süreli bonus: 50 puan</span><span><kbd>P</kbd>: duraklat</span></div>';
  root.append(wrap);
  const q = sel => wrap.querySelector(sel);
  const area = q('.yilan-area'), stage = q('.yilan-stage'), cv = q('.yilan-cv'), ov = q('.yilan-ov'), pad = q('.yilan-pad');
  const scoreEl = q('.yilan-score b'), lenEl = q('.yilan-len b'), spdEl = q('.yilan-spd b');
  const g = cv.getContext('2d');
  const reduced = !!ctx.reducedMotion;

  let state = 'ready', s = null, finished = false, destroyed = false, overAt = 0, portrait = false;
  let cell = 24, dpr = 1, BW = 0, BH = 0, raf = 0, last = 0, acc = 0, now = 0, runMs = 0;
  let theme = {}, acc3 = [94, 224, 181], tail3 = [40, 90, 80], boardBuf = null;
  let foodBorn = 0, foodKey = '', bonusBorn = 0, bonusKey = '', deathT = 0, flash = 0, lastScore = -1;
  const NP = 80, P = { x: new Float32Array(NP), y: new Float32Array(NP), vx: new Float32Array(NP), vy: new Float32Array(NP), life: new Float32Array(NP), c: new Uint8Array(NP) };
  let pi = 0;
  const PC = ['#ff5a5f', '#e0a050', '#ffd84d', '#ffffff'];
  const emit = (x, y, vx, vy, life, c) => { P.x[pi] = x; P.y[pi] = y; P.vx[pi] = vx; P.vy[pi] = vy; P.life[pi] = life; P.c[pi] = c; pi = (pi + 1) % NP; };
  const pops = [];

  function readTheme(){
    const cs = getComputedStyle(document.body);
    const v = n => cs.getPropertyValue(n).trim();
    theme = { accent: v('--accent') || '#5ee0b5', ink: v('--accent-ink') || '#06261b', fg: v('--fg') || '#e6e9f0', panel: v('--panel') || '#171b24',
      panel2: v('--panel-2') || '#1f2430', line: v('--line') || '#2a3040', danger: v('--danger') || '#ff6b6b', display: v('--display') || 'sans-serif' };
    acc3 = toRgb(theme.accent); tail3 = mixRgb(acc3, toRgb(theme.panel), 0.55);
    boardBuf = null;
  }
  const dims = () => portrait ? [YC.SHORT, YC.LONG] : [YC.LONG, YC.SHORT];
  function resize(){
    const aw = Math.max(200, area.clientWidth || 600), ah = area.clientHeight;
    if (!s) portrait = aw < 560;
    const [cols, rows] = s ? [s.cols, s.rows] : dims();
    let c = Math.floor(aw / cols);
    if (ah > 120) c = Math.min(c, Math.floor(ah / rows));
    cell = Math.max(10, Math.min(44, c));
    BW = cols * cell; BH = rows * cell;
    dpr = Math.min(2.5, window.devicePixelRatio || 1);
    stage.style.width = BW + 'px'; stage.style.height = BH + 'px';
    cv.width = Math.round(BW * dpr); cv.height = Math.round(BH * dpr);
    boardBuf = null;
    draw(0);
  }
  function buildBoard(){
    const [cols, rows] = s ? [s.cols, s.rows] : dims();
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    x.fillStyle = theme.panel; x.fillRect(0, 0, BW, BH);
    x.fillStyle = theme.panel2;
    for (let yy = 0; yy < rows; yy++) for (let xx = 0; xx < cols; xx++) if ((xx + yy) % 2) x.fillRect(xx * cell, yy * cell, cell, cell);
    x.fillStyle = rgbStr(acc3, 0.05); x.fillRect(0, 0, BW, BH);
    boardBuf = c;
  }

  // ----- çizim -----
  const cx = i => (i + 0.5) * cell;
  function drawApple(x, y, r){
    g.fillStyle = '#e8384f'; g.beginPath(); g.arc(x - r * 0.3, y + r * 0.1, r * 0.72, 0, 6.283); g.arc(x + r * 0.3, y + r * 0.1, r * 0.72, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x - r * 0.42, y - r * 0.15, r * 0.18, r * 0.3, 0.4, 0, 6.283); g.fill();
    g.strokeStyle = '#6b3f22'; g.lineWidth = Math.max(1.5, r * 0.14); g.beginPath(); g.moveTo(x, y - r * 0.45); g.quadraticCurveTo(x + r * 0.05, y - r * 0.8, x + r * 0.2, y - r * 0.95); g.stroke();
    g.fillStyle = '#4caf50'; g.beginPath(); g.ellipse(x + r * 0.42, y - r * 0.78, r * 0.34, r * 0.16, -0.5, 0, 6.283); g.fill();
  }
  function drawSimit(x, y, r){
    g.lineWidth = r * 0.5; g.strokeStyle = '#b8682a'; g.beginPath(); g.arc(x, y, r * 0.66, 0, 6.283); g.stroke();
    g.lineWidth = r * 0.18; g.strokeStyle = '#e09a4a'; g.beginPath(); g.arc(x, y, r * 0.72, 3.6, 5.6); g.stroke();
    g.fillStyle = '#fff3d6';
    for (let k = 0; k < 7; k++){ const a = k * 0.9; g.fillRect(x + Math.cos(a) * r * 0.66 - 0.9, y + Math.sin(a) * r * 0.66 - 0.9, 1.8, 1.8); }
  }
  function drawStar(x, y, r, rot){
    g.beginPath();
    for (let i = 0; i < 10; i++){ const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath();
    g.fillStyle = '#ffd84d'; g.fill(); g.strokeStyle = '#e8a10c'; g.lineWidth = Math.max(1, r * 0.1); g.stroke();
  }
  const easeBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  function snakePath(a){
    const sn = s.snake, n = sn.length, pts = [];
    const h0 = sn[1] || sn[0];
    if (state === 'run' && n > 1) pts.push([cx(h0.x + (sn[0].x - h0.x) * a), cx(h0.y + (sn[0].y - h0.y) * a)]);
    else pts.push([cx(sn[0].x), cx(sn[0].y)]);
    for (let i = 1; i < n; i++) pts.push([cx(sn[i].x), cx(sn[i].y)]);
    if (state === 'run' && s.prevTail){ const t = sn[n - 1], p = s.prevTail; pts.push([cx(p.x + (t.x - p.x) * a), cx(p.y + (t.y - p.y) * a)]); }
    return pts;
  }

  function draw(dt){
    const k = dpr;
    g.setTransform(k, 0, 0, k, 0, 0);
    if (!boardBuf) buildBoard();
    let sx = 0, sy = 0;
    if (deathT > 0 && !reduced){ sx = (Math.random() - 0.5) * deathT * 14; sy = (Math.random() - 0.5) * deathT * 14; }
    g.translate(sx, sy);
    g.drawImage(boardBuf, 0, 0, BW, BH);
    if (!s){ return; }
    const a = state === 'run' ? Math.min(1, acc / interval(s)) : 1;
    // yem
    if (s.food){
      const key = s.food.x + ',' + s.food.y; if (key !== foodKey){ foodKey = key; foodBorn = now; }
      const t = Math.min(1, (now - foodBorn) / 320), sc = reduced ? 1 : Math.max(0, easeBack(t));
      const bob = reduced ? 0 : Math.sin(now * 0.005) * cell * 0.04;
      const x = cx(s.food.x), y = cx(s.food.y) + bob, r = cell * 0.4 * sc;
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x, cx(s.food.y) + cell * 0.36, cell * 0.28 * sc, cell * 0.08, 0, 0, 6.283); g.fill();
      if (r > 0.5){ if (s.food.k === 'elma') drawApple(x, y, r); else drawSimit(x, y, r); }
    }
    if (s.bonus){
      const key = s.bonus.x + ',' + s.bonus.y; if (key !== bonusKey){ bonusKey = key; bonusBorn = now; }
      const t = Math.min(1, (now - bonusBorn) / 380), sc = reduced ? 1 : Math.max(0, easeBack(t));
      const frac = Math.max(0, (s.bonus.life - a) / YC.BONUS_LIFE);
      const x = cx(s.bonus.x), y = cx(s.bonus.y);
      const blink = frac < 0.28 && Math.floor(now / 120) % 2;
      g.fillStyle = 'rgba(255,216,77,.18)'; g.beginPath(); g.arc(x, y, cell * (0.62 + 0.06 * Math.sin(now * 0.01)), 0, 6.283); g.fill();
      g.strokeStyle = '#ffd84d'; g.lineWidth = Math.max(2, cell * 0.08); g.lineCap = 'round';
      g.beginPath(); g.arc(x, y, cell * 0.56, -Math.PI / 2, -Math.PI / 2 + frac * 6.283); g.stroke(); g.lineCap = 'butt';
      if (!blink) drawStar(x, y, cell * 0.42 * sc, reduced ? 0 : now * 0.002);
    }
    drawSnake(a);
    // parçacıklar
    for (let i = 0; i < NP; i++){
      if (P.life[i] <= 0) continue;
      P.life[i] -= dt; P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.vx[i] *= 1 - 3 * dt; P.vy[i] *= 1 - 3 * dt;
      g.globalAlpha = Math.min(1, P.life[i] * 2.5); g.fillStyle = PC[P.c[i]];
      g.beginPath(); g.arc(P.x[i], P.y[i], Math.max(1.2, cell * 0.08), 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
    for (let i = pops.length - 1; i >= 0; i--){
      const p = pops[i]; p.t += dt; if (p.t > 0.9){ pops.splice(i, 1); continue; }
      g.globalAlpha = Math.min(1, (0.9 - p.t) * 3);
      g.font = `700 ${Math.max(12, cell * 0.6)}px ${theme.display}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillText(p.txt, p.x + 1, p.y - p.t * cell * 1.4 + 1.5);
      g.fillStyle = p.col; g.fillText(p.txt, p.x, p.y - p.t * cell * 1.4);
    }
    g.globalAlpha = 1;
    if (flash > 0){ g.fillStyle = `rgba(255,80,90,${flash * 0.5})`; g.fillRect(-20, -20, BW + 40, BH + 40); }
  }

  function drawSnake(a){
    const pts = snakePath(a), n = pts.length;
    const dead = s.dead && !s.won;
    const head3 = dead ? mixRgb(acc3, [140, 140, 150], 0.6) : acc3, tl3 = dead ? mixRgb(tail3, [90, 90, 100], 0.5) : tail3;
    g.lineCap = 'round'; g.lineJoin = 'round';
    // parıltı
    g.save();
    if (!dead){ g.shadowColor = rgbStr(acc3, 0.8); g.shadowBlur = cell * 0.6; }
    g.strokeStyle = rgbStr(head3, 0.35); g.lineWidth = cell * 0.86;
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
    g.restore();
    // gövde: kuyruktan başa incelen, renk geçişli parçalar
    for (let i = n - 1; i > 0; i--){
      const t = 1 - i / n, w = cell * (0.48 + 0.3 * t);
      g.strokeStyle = rgbStr(mixRgb(tl3, head3, t)); g.lineWidth = w;
      g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i - 1][0], pts[i - 1][1]); g.stroke();
    }
    // pul benekleri
    g.fillStyle = 'rgba(0,0,0,.14)';
    for (let i = 2; i < n - 1; i += 1){ const t = 1 - i / n; g.beginPath(); g.arc(pts[i][0] + cell * 0.08, pts[i][1] + cell * 0.1, cell * (0.09 + 0.06 * t), 0, 6.283); g.fill(); }
    // sırt parlaklığı
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = cell * 0.14;
    g.beginPath(); pts.slice(0, Math.max(2, n - 1)).forEach((p, i) => i ? g.lineTo(p[0] - cell * 0.08, p[1] - cell * 0.1) : g.moveTo(p[0] - cell * 0.08, p[1] - cell * 0.1)); g.stroke();
    g.lineCap = 'butt'; g.lineJoin = 'miter';
    // baş
    const hx = pts[0][0], hy = pts[0][1];
    const dir = YilanCore.DIRS[state === 'ready' && s.queue.length ? s.queue[0] : s.dir], fx = dir[0], fy = dir[1];
    g.fillStyle = rgbStr(head3); g.beginPath(); g.arc(hx, hy, cell * 0.47, 0, 6.283); g.fill();
    // dil
    if (!dead && state === 'run' && (s.ticks % 14) < 3){
      const tx = hx + fx * cell * 0.45, ty = hy + fy * cell * 0.45;
      g.strokeStyle = '#ff4d6d'; g.lineWidth = Math.max(1.4, cell * 0.07); g.lineCap = 'round';
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + fx * cell * 0.3, ty + fy * cell * 0.3);
      g.lineTo(tx + fx * cell * 0.42 - fy * cell * 0.1, ty + fy * cell * 0.42 + fx * cell * 0.1);
      g.moveTo(tx + fx * cell * 0.3, ty + fy * cell * 0.3); g.lineTo(tx + fx * cell * 0.42 + fy * cell * 0.1, ty + fy * cell * 0.42 - fx * cell * 0.1); g.stroke(); g.lineCap = 'butt';
    }
    // gözler
    const px = -fy, py = fx, er = cell * 0.15;
    const blink = !dead && (now % 3200) < 120;
    for (const sgn of [-1, 1]){
      const ex = hx + fx * cell * 0.14 + px * sgn * cell * 0.22, ey = hy + fy * cell * 0.14 + py * sgn * cell * 0.22;
      if (dead){
        g.strokeStyle = '#1b1b26'; g.lineWidth = Math.max(1.4, cell * 0.07);
        g.beginPath(); g.moveTo(ex - er, ey - er); g.lineTo(ex + er, ey + er); g.moveTo(ex + er, ey - er); g.lineTo(ex - er, ey + er); g.stroke();
      } else if (blink){
        g.fillStyle = '#1b1b26'; g.fillRect(ex - er, ey - 1, er * 2, 2);
      } else {
        g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, er, 0, 6.283); g.fill();
        g.fillStyle = '#1b1b26'; g.beginPath(); g.arc(ex + fx * er * 0.4, ey + fy * er * 0.4, er * 0.55, 0, 6.283); g.fill();
      }
    }
    // yanaklar
    g.fillStyle = 'rgba(255,120,140,.35)';
    for (const sgn of [-1, 1]){ g.beginPath(); g.arc(hx - fx * cell * 0.08 + px * sgn * cell * 0.3, hy - fy * cell * 0.08 + py * sgn * cell * 0.3, cell * 0.08, 0, 6.283); g.fill(); }
  }

  function updateHud(){
    if (!s) return;
    if (s.score !== lastScore){
      lastScore = s.score; scoreEl.textContent = s.score.toLocaleString('tr-TR');
      if (!reduced && s.score){ scoreEl.parentNode.classList.remove('bump'); void scoreEl.parentNode.offsetWidth; scoreEl.parentNode.classList.add('bump'); }
    }
    lenEl.textContent = s.snake.length;
    spdEl.textContent = 1 + Math.round((YC.T0 - interval(s)) / (YC.T0 - YC.TMIN) * 9);
  }

  function handleEvents(){
    for (const e of s.ev){
      const h = s.snake[0];
      if (e === 'eat' || e === 'star'){
        const n = reduced ? 4 : e === 'star' ? 16 : 9;
        for (let i = 0; i < n; i++){ const an = Math.random() * 6.283, v = cell * (2 + Math.random() * 4); emit(cx(h.x), cx(h.y), Math.cos(an) * v, Math.sin(an) * v, 0.5, e === 'star' ? 2 : Math.random() < 0.5 ? 0 : 1); }
        pops.push({ x: cx(h.x), y: cx(h.y) - cell * 0.6, txt: '+' + (e === 'star' ? YC.BONUS : YC.FOOD), t: 0, col: e === 'star' ? '#ffd84d' : theme.fg });
        snd(e);
      } else if (e === 'bonus') snd('bonus');
      else if (e === 'die' || e === 'win') over();
    }
    s.ev = [];
    updateHud();
  }

  function tickLoop(t){
    raf = requestAnimationFrame(tickLoop);
    const dt = Math.min(0.1, (t - last) / 1000 || 0); last = t; now = t;
    if (state === 'run'){
      acc += dt; runMs += dt * 1000;
      let guard = 0;
      while (state === 'run' && acc >= interval(s) && guard++ < 5){
        acc -= interval(s);
        tick(s);
        handleEvents();
      }
    }
    deathT = Math.max(0, deathT - dt * 2.5); flash = Math.max(0, flash - dt * 2);
    if (state === 'pause') return;
    draw(dt);
  }

  function showOv(html){ ov.innerHTML = html; ov.hidden = !html; }
  function newGame(){
    portrait = (area.clientWidth || 600) < 560;
    const [cols, rows] = dims();
    s = newState((Math.random() * 4294967296) >>> 0, cols, rows);
    resize(); updateHud();
  }
  function start(d){
    if (state !== 'ready') return;
    if (d) turn(s, d);
    state = 'run'; acc = 0; runMs = 0; showOv(''); wrap.classList.add('playing');
  }
  function over(){
    state = 'over'; overAt = performance.now(); wrap.classList.remove('playing');
    if (!s.won){ deathT = 1; flash = 1; snd('die'); } else { snd('star'); try { if (typeof confetti === 'function') confetti(stage); } catch(e){} }
    const why = s.won ? 'Tahtayı doldurdun!' : s.reason === 'duvar' ? 'Duvara çarptın!' : 'Kendine çarptın!';
    setTimeout(() => {
      if (destroyed) return;
      showOv(`<div class="yilan-card yilan-over"><b>${why}</b><span class="yilan-big">${s.score.toLocaleString('tr-TR')} puan</span>` +
        `<small>${s.foods} yem · ${s.bonuses} yıldız · ${s.snake.length} boy</small><button type="button" class="btn small primary yilan-again">↻ Tekrar oyna</button></div>`);
      const b = ov.querySelector('.yilan-again'); if (b) b.onclick = ev => { ev.stopPropagation(); again(); };
    }, reduced ? 0 : 450);
    if (!finished){
      finished = true;
      try { ctx.finish({ score: s.score, detail: { ms: Math.round(runMs), ticks: s.ticks, length: s.snake.length, foods: s.foods, bonuses: s.bonuses, won: s.won } }); } catch(e){}
    }
  }
  function again(){ if (performance.now() - overAt > 500) ctx.restart(); }
  function pause(){
    if (state !== 'run') return;
    state = 'pause'; wrap.classList.remove('playing');
    showOv('<div class="yilan-card"><b>Duraklatıldı</b><small>Devam için <kbd>P</kbd> / boşluk ya da dokun</small></div>');
  }
  function resume(){ if (state !== 'pause') return; state = 'run'; last = performance.now(); showOv(''); wrap.classList.add('playing'); }
  function ready(){
    state = 'ready';
    showOv('<div class="yilan-card yilan-start"><b>🐍 Yılan</b><small>Elma ve simitleri ye, uza. Her 5 yemde bir süreli ⭐ çıkar. Duvara ya da kendine çarpınca oyun biter.</small>' +
      '<span class="yilan-go">Başlamak için bir yön tuşuna bas / kaydır</span></div>');
  }

  function dirInput(d){
    if (state === 'ready'){ start(d === 'left' ? null : d); return; }
    if (state === 'pause'){ resume(); }
    if (state === 'run' && turn(s, d)) snd('turn');
  }

  // ----- girdi -----
  const typing = e => { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
  const visible = () => wrap.isConnected && wrap.offsetParent !== null;
  function onKey(e){
    if (typing(e) || !visible()) return;
    const c = e.code, d = KEYS[c];
    if (d){ e.preventDefault(); if (!e.repeat || state === 'run') dirInput(d); return; }
    if (c === 'KeyP' || c === 'Escape'){ if (state === 'run'){ e.preventDefault(); pause(); } else if (state === 'pause' && c === 'KeyP') resume(); return; }
    if (c === 'Space' || c === 'Enter'){
      if (state === 'pause'){ e.preventDefault(); resume(); } else if (state === 'over'){ e.preventDefault(); again(); } else if (state === 'ready'){ e.preventDefault(); start(null); }
    }
  }
  let sw = null;
  function onDown(e){
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    if (state === 'pause'){ resume(); return; }
    sw = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    try { stage.setPointerCapture(e.pointerId); } catch(err){}
  }
  function onMove(e){
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    dirInput(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    sw.x = e.clientX; sw.y = e.clientY; sw.moved = true;
  }
  function onUp(e){
    if (!sw || e.pointerId !== sw.id) return;
    if (!sw.moved && state === 'ready') start(null);
    sw = null;
  }
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('contextmenu', e => e.preventDefault());
  pad.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    e.preventDefault(); dirInput(b.dataset.d);
    b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 120);
  });
  pad.addEventListener('contextmenu', e => e.preventDefault());
  q('.yilan-pausebtn').addEventListener('click', e => { e.stopPropagation(); if (state === 'run') pause(); else if (state === 'pause') resume(); });
  const onVis = () => { if (document.hidden) pause(); };
  const onBlur = () => pause();
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('blur', onBlur);
  const ro = window.ResizeObserver ? new ResizeObserver(() => resize()) : null;
  if (ro) ro.observe(area); else window.addEventListener('resize', resize);

  readTheme(); newGame(); ready();
  last = performance.now(); raf = requestAnimationFrame(tickLoop);
  wrap._yilan = { get state(){ return state; }, get s(){ return s; }, dir: d => dirInput(d), get cell(){ return cell; } };

  return {
    destroy(){
      if (destroyed) return; destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      wrap.remove();
    }
  };
}

const def = {
  id: 'yilan', name: 'Yılan', icon: '🐍',
  desc: 'Klasik yılan: elmaları ye, uza, duvara ve kendine çarpma.',
  levels: [], daily: false, better: 'high',
  format: v => Number(v).toLocaleString('tr-TR') + ' puan',
  mount
};
if (typeof registerSolo === 'function') registerSolo(def);
else (window.SOLO_PENDING = window.SOLO_PENDING || []).push(def);
})();
