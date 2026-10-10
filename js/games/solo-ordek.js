// Ördek Avı: gün batımında göl kıyısında atış oyunu. 10 dalga; her dalgada 2-3 ördek, ördek sayısı + 1 fişek.
// Normal ördek 100, küçük yeşilbaş 150, altın ördek 300 puan; art arda vuruşlar çarpanı büyütür (en çok ×5).
// Balon vurmak 200 puan götürür. 6 ördek kaçarsa oyun erken biter. OrdekCore saf (DOM'suz, Node'da testli).
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

const OD = {
  H: 450, HORIZON: 300, BANK: 392, TOP: 42, LOW: 266, SPAWNY: 440, SIDE: 30,
  WAVES: 10, LIVES: 6, INTRO: 1.4, CLEAR: 1.7, END: 1.4,
  MULTMAX: 5, BALLOON_PEN: 200, PERFECT: 500, SHELL_BONUS: 100, DOUBLE: 200, GRAV: 1100
};
const TYPES = {
  normal: { pts: 100, sp: 1, r: 27, size: 1 },
  teal: { pts: 150, sp: 1.25, r: 21, size: 0.78 },
  gold: { pts: 300, sp: 1.45, r: 25, size: 0.95 }
};
// en yüksek kuramsal skor: her ördek altın, hepsi art arda, her dalga kusursuz ve en çok fişek artığıyla
const MAX_SCORE = 60000;

function waveCfg(n, rng){
  const ducks = n <= 3 ? 2 : 3;
  return {
    ducks, shells: ducks + 1,
    speed: 150 + 19 * (n - 1),
    escape: Math.max(3.6, 6.6 - 0.32 * (n - 1)),
    balloon: n >= 3 && rng() < 0.5
  };
}
const multOf = combo => Math.min(OD.MULTMAX, 1 + Math.floor(Math.max(0, combo - 1) / 3));

function newState(seed, W){
  const s = {
    rng: mulberry32(seed >>> 0), W: Math.max(300, W || 800),
    wave: 0, phase: 'intro', pt: 0, t: 0, score: 0, combo: 0, maxCombo: 0, lives: OD.LIVES,
    shells: 0, shellsMax: 0, hits: 0, shots: 0, escaped: 0, ducksTotal: 0, pops: 0, perfects: 0,
    ducks: [], tally: [], queue: [], balloon: null, balloonAt: -1, over: false, ev: [], cfg: null, nid: 1
  };
  nextWave(s);
  return s;
}

function nextWave(s){
  const r = s.rng;
  s.wave++; s.cfg = waveCfg(s.wave, r);
  s.phase = 'intro'; s.pt = 0;
  s.shells = s.shellsMax = s.cfg.shells;
  s.ducks = []; s.tally = new Array(s.cfg.ducks).fill(0); s.queue = [];
  for (let k = 0; k < s.cfg.ducks; k++){
    const q = r();
    const type = s.wave >= 2 && q < 0.09 ? 'gold' : s.wave >= 2 && q < 0.34 ? 'teal' : 'normal';
    s.queue.push({ at: 0.15 + k * 0.85 + r() * 0.3, type, slot: k, done: false });
  }
  s.balloonAt = s.cfg.balloon && !s.balloon ? 0.3 + r() * 1.6 : -1;
  s.ev.push({ k: 'wave', n: s.wave });
}

function spawnDuck(s, q){
  const r = s.rng, T = TYPES[q.type];
  const d = {
    id: s.nid++, type: q.type, slot: q.slot,
    x: s.W * (0.18 + r() * 0.64), y: OD.SPAWNY, ang: -Math.PI / 2 + (r() - 0.5) * 1.2,
    sp: s.cfg.speed * T.sp, age: 0, st: 'fly', stT: 0, risen: false,
    wf: 1.5 + r() * 2, ph: r() * 6.283, curv: 0.8 + r() * 1.2, kick: 0.5 + r(),
    vx: 0, vy: 0, face: 1, esc: s.cfg.escape, splashY: 0
  };
  d.face = Math.cos(d.ang) >= 0 ? 1 : -1;
  s.ducks.push(d); s.ducksTotal++;
  s.ev.push({ k: 'spawn', d });
  return d;
}

function flee(d){ if (d.st === 'fly'){ d.st = 'flee'; d.stT = 0; } }

function updateDuck(s, d, dt){
  d.age += dt; d.stT += dt;
  if (d.st === 'fly'){
    d.kick -= dt;
    if (d.kick <= 0){ d.ang += (s.rng() - 0.5) * 1.4; d.kick = 0.5 + s.rng() * 0.9; }
    d.ang += Math.sin(d.age * d.wf + d.ph) * d.curv * dt;
    d.ang = Math.atan2(Math.sin(d.ang), Math.cos(d.ang));
    d.vx = Math.cos(d.ang) * d.sp; d.vy = Math.sin(d.ang) * d.sp;
    if (!d.risen && d.vy > 0){ d.ang = -d.ang; d.vy = -d.vy; }
    d.x += d.vx * dt; d.y += d.vy * dt;
    if (d.y < OD.LOW) d.risen = true;
    const L = OD.SIDE, R = s.W - OD.SIDE;
    if (d.x < L){ d.x = L; if (d.vx < 0) d.ang = Math.PI - d.ang; }
    else if (d.x > R){ d.x = R; if (d.vx > 0) d.ang = Math.PI - d.ang; }
    if (d.y < OD.TOP){ d.y = OD.TOP; if (d.vy < 0) d.ang = -d.ang; }
    if (d.risen && d.y > OD.LOW){ d.y = OD.LOW; if (d.vy > 0) d.ang = -d.ang; }
    if (Math.abs(d.vx) > 25) d.face = d.vx > 0 ? 1 : -1;
    if (d.age >= d.esc) flee(d);
  } else if (d.st === 'flee'){
    d.vx *= Math.max(0, 1 - 2 * dt);
    d.vy = -d.sp * 1.5;
    d.x += d.vx * dt; d.y += d.vy * dt;
    if (d.y < -70){
      d.st = 'gone'; s.escaped++; s.lives = Math.max(0, s.lives - 1); s.combo = 0;
      s.tally[d.slot] = 2;
      s.ev.push({ k: 'escape', d });
      if (s.lives <= 0 && (s.phase === 'play' || s.phase === 'intro')){
        s.phase = 'end'; s.pt = 0;
        s.ducks.forEach(flee);
        s.ev.push({ k: 'nolives' });
      }
    }
  } else if (d.st === 'hit'){
    if (d.stT >= 0.4){ d.st = 'fall'; d.stT = 0; d.vy = -60; }
  } else if (d.st === 'fall'){
    d.vy += OD.GRAV * dt; d.y += d.vy * dt;
    if (d.y >= d.splashY){ d.y = d.splashY; d.st = 'down'; s.ev.push({ k: 'splash', x: d.x, y: d.splashY }); }
  }
}

const resolved = d => d.st === 'gone' || d.st === 'down';

function step(s, dt){
  if (s.over) return;
  s.t += dt; s.pt += dt;
  if (s.phase === 'intro' && s.pt >= OD.INTRO){ s.phase = 'play'; s.pt = 0; }
  if (s.phase === 'play'){
    for (const q of s.queue) if (!q.done && s.pt >= q.at){ q.done = true; spawnDuck(s, q); }
    if (s.balloonAt >= 0 && s.pt >= s.balloonAt){
      s.balloonAt = -1;
      s.balloon = { x: s.W * (0.2 + s.rng() * 0.6), y: OD.SPAWNY + 20, x0: 0, vy: -46, t: 0, ph: s.rng() * 6.283, st: 'float' };
      s.balloon.x0 = s.balloon.x;
      s.ev.push({ k: 'balloon' });
    }
  }
  for (const d of s.ducks) if (!resolved(d)) updateDuck(s, d, dt);
  const b = s.balloon;
  if (b){
    b.t += dt;
    if (b.st === 'float'){
      b.y += b.vy * dt; b.x = Math.min(s.W - 30, Math.max(30, b.x0 + Math.sin(b.t * 1.3 + b.ph) * 26));
      if (b.y < -90) s.balloon = null;
    } else if (b.t > 0.6) s.balloon = null;
  }
  if (s.phase === 'play' && s.queue.every(q => q.done) && s.ducks.every(resolved)) enterClear(s);
  else if (s.phase === 'clear' && s.pt >= OD.CLEAR){
    if (s.lives <= 0 || s.wave >= OD.WAVES) endGame(s); else nextWave(s);
  } else if (s.phase === 'end' && s.pt >= OD.END) endGame(s);
}

function enterClear(s){
  s.phase = 'clear'; s.pt = 0;
  const got = s.tally.filter(v => v === 1).length;
  let bonus = 0;
  if (got === s.tally.length){ bonus = OD.PERFECT + s.shells * OD.SHELL_BONUS; s.score += bonus; s.perfects++; }
  s.ev.push({ k: 'clear', got, of: s.tally.length, bonus });
}
function endGame(s){
  s.over = true; s.phase = 'over';
  s.score = Math.max(0, Math.min(MAX_SCORE, Math.round(s.score)));
  s.ev.push({ k: 'over', score: s.score });
}

// isabet yarıçapı (tol: dokunmatikte daha cömert)
function hitDuck(d, x, y, tol){
  const T = TYPES[d.type];
  const cx = d.x + d.face * 4 * T.size, cy = d.y - 4 * T.size;
  const dx = x - cx, dy = y - cy, r = T.r + (tol || 0);
  return dx * dx + dy * dy <= r * r;
}

// ateş: { hits:[...], pop, miss, empty } ya da oyun uygun değilse null
function shoot(s, x, y, tol){
  if (s.over || s.phase !== 'play') return null;
  if (s.shells <= 0){ s.ev.push({ k: 'empty' }); return { empty: true, hits: [] }; }
  s.shells--; s.shots++;
  const hits = [];
  for (const d of s.ducks) if ((d.st === 'fly' || d.st === 'flee') && hitDuck(d, x, y, tol)) hits.push(d);
  let pop = false;
  const b = s.balloon;
  if (!hits.length && b && b.st === 'float'){
    const dx = x - b.x, dy = y - b.y;
    if (dx * dx / 26 / 26 + dy * dy / 31 / 31 <= Math.pow(1 + (tol || 0) / 28, 2)) pop = true;
  }
  hits.forEach((d, i) => {
    const T = TYPES[d.type];
    s.combo++; s.maxCombo = Math.max(s.maxCombo, s.combo); s.hits++;
    const mult = multOf(s.combo);
    const pts = T.pts * mult + (i > 0 ? OD.DOUBLE : 0);
    s.score += pts;
    d.st = 'hit'; d.stT = 0; d.splashY = OD.HORIZON + 22 + s.rng() * 52;
    s.tally[d.slot] = 1;
    s.ev.push({ k: 'hit', d, pts, mult, dbl: i > 0 });
  });
  if (pop){
    b.st = 'pop'; b.t = 0; s.pops++; s.combo = 0;
    s.score = Math.max(0, s.score - OD.BALLOON_PEN);
    s.ev.push({ k: 'pop', x: b.x, y: b.y });
  }
  const miss = !hits.length && !pop;
  if (miss){ s.combo = 0; s.ev.push({ k: 'miss', x, y }); }
  s.ev.push({ k: 'shot', x, y });
  if (s.shells <= 0) s.ducks.forEach(flee);
  return { hits, pop, miss, empty: false };
}

const OrdekCore = { OD, TYPES, MAX_SCORE, mulberry32, waveCfg, multOf, newState, step, shoot, hitDuck, resolved };
if (typeof module !== 'undefined' && module.exports){ module.exports = OrdekCore; return; }
if (typeof window !== 'undefined') window.OrdekCore = OrdekCore;

// ---------------- Ses ----------------
let noiseBuf = null;
function noise(dur, vol, lp){
  try {
    if (typeof audioCtx === 'undefined' || !audioCtx || audioCtx.state !== 'running') return;
    if (typeof deafened !== 'undefined' && deafened) return;
    const ac = audioCtx, mv = typeof masterVol === 'number' ? Math.max(masterVol, 0.2) : 1;
    if (!noiseBuf){
      noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.6), ac.sampleRate);
      const ch = noiseBuf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    const gn = ac.createGain(), t = ac.currentTime;
    gn.gain.setValueAtTime(vol * mv, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(gn); gn.connect(ac.destination);
    src.start(t); src.stop(t + dur + 0.05);
  } catch(e){}
}
function snd(kind){
  try {
    const T = typeof tone === 'function' ? tone : null;
    if (kind === 'shot'){ noise(0.26, 0.42, 1700); if (T) T([95], 0, 0.14, 0.07); }
    else if (kind === 'quack'){ if (T) T([640, 540], 0.07, 0.09, 0.045); }
    else if (kind === 'hit'){ if (T) T([880, 1175], 0.05, 0.13, 0.06); }
    else if (kind === 'gold'){ if (T) T([988, 1319, 1760], 0.05, 0.16, 0.07); }
    else if (kind === 'empty'){ if (T) T([1900], 0, 0.03, 0.04); }
    else if (kind === 'reload'){ if (T) T([1400], 0, 0.035, 0.03); }
    else if (kind === 'pop'){ noise(0.09, 0.4, 5000); if (T) T([300, 200], 0.05, 0.15, 0.06); }
    else if (kind === 'splash'){ noise(0.35, 0.12, 900); }
    else if (kind === 'escape'){ if (T) T([520, 440, 370], 0.06, 0.12, 0.04); }
    else if (kind === 'perfect'){ if (T) T([784, 988, 1319], 0.08, 0.2, 0.07); }
    else if (kind === 'over'){ if (T) T([523, 392, 330, 262], 0.12, 0.3, 0.07); }
  } catch(e){}
}

// ---------------- Arayüz ----------------
const COL = {
  normal: { body: '#9a6440', belly: '#d9b48a', head: '#2f8f5b', wing: '#7a4c2f', wing2: '#5f3a24', ring: '#ffffff' },
  teal: { body: '#45b9c7', belly: '#bfeef0', head: '#1f6f8b', wing: '#2f97a8', wing2: '#227989', ring: null },
  gold: { body: '#ffcc33', belly: '#fff0b0', head: '#ffb300', wing: '#f5a623', wing2: '#d98a12', ring: null }
};
const PCOL = ['#9a6440', '#d9b48a', '#ffd84d', '#ff4d6d', '#cfe9ff', '#45b9c7', '#ffffff', '#2f8f5b'];
const fmtN = n => Math.round(n).toLocaleString('tr-TR');

function mount(root, ctx){
  const H = OD.H;
  const wrap = document.createElement('div'); wrap.className = 'ordek';
  const stage = document.createElement('div'); stage.className = 'ordek-stage';
  const cv = document.createElement('canvas'); cv.className = 'ordek-cv'; cv.setAttribute('aria-label', 'Ördek Avı oyun alanı');
  const ov = document.createElement('div'); ov.className = 'ordek-ov';
  const pauseBtn = document.createElement('button'); pauseBtn.type = 'button'; pauseBtn.className = 'ordek-pausebtn'; pauseBtn.textContent = '⏸'; pauseBtn.setAttribute('aria-label', 'Duraklat');
  const help = document.createElement('div'); help.className = 'ordek-help';
  help.innerHTML = '<span>Fareyle nişan al, <kbd>tıkla</kbd>: ateş</span><span>Art arda vuruş = çarpan</span><span>🎈 Balonları vurma!</span><span><kbd>P</kbd>: duraklat</span>';
  stage.append(cv, ov, pauseBtn); wrap.append(stage); root.append(wrap, help);
  const g = cv.getContext('2d');

  let W = 800, scale = 1, dpr = 1;
  let state = 'ready', s = null, finished = false, destroyed = false, overAt = 0;
  let raf = 0, last = 0, now = 0;
  let theme = {}, bg = null, fg = null;
  let mx = -100, my = -100, aimShow = 0, coarse = false, recoil = 0, flash = 0, flashX = 0, flashY = 0, shake = 0;
  const reduced = !!ctx.reducedMotion;
  const rnd = mulberry32(1234);
  // parçacıklar
  const NP = 160, P = { x: new Float32Array(NP), y: new Float32Array(NP), vx: new Float32Array(NP), vy: new Float32Array(NP), life: new Float32Array(NP), max: new Float32Array(NP), rot: new Float32Array(NP), c: new Uint8Array(NP), t: new Uint8Array(NP) };
  let pi = 0;
  const emit = (x, y, vx, vy, life, c, t) => { P.x[pi] = x; P.y[pi] = y; P.vx[pi] = vx; P.vy[pi] = vy; P.life[pi] = P.max[pi] = life; P.rot[pi] = Math.random() * 6.28; P.c[pi] = c; P.t[pi] = t; pi = (pi + 1) % NP; };
  const pops = [], ripples = [];
  let banner = null; // { big, small, t, dur }
  // bulutlar ve sazlar
  const clouds = []; for (let i = 0; i < 5; i++) clouds.push({ x: i * 300 + rnd() * 200, y: 46 + rnd() * 120, s: 0.45 + rnd() * 0.45, v: 4 + rnd() * 6 });
  let reeds = [];
  function buildReeds(){
    reeds = []; const r = mulberry32(77);
    for (let x = -10; x < W + 20; x += 9 + r() * 16){
      const edge = x < W * 0.18 || x > W * 0.82;
      if (!edge && r() < 0.55) continue;
      reeds.push({ x, h: (edge ? 70 : 34) + r() * (edge ? 70 : 34), ph: r() * 6.28, cat: r() < (edge ? 0.45 : 0.25), w: 2 + r() * 1.6, c: r() < 0.5 ? '#3d6b3f' : '#4f7f45' });
    }
  }
  let scoreShow = 0;

  function readTheme(){
    const cs = getComputedStyle(document.body);
    const v = n => cs.getPropertyValue(n).trim();
    theme = { accent: v('--accent') || '#5ee0b5', ink: v('--accent-ink') || '#06261b', fg: v('--fg') || '#e6e9f0', danger: v('--danger') || '#ff6b6b',
      warn: v('--warn') || '#ffc35c', display: v('--display') || 'sans-serif', panel: v('--panel') || '#171b24' };
  }

  function resize(){
    const aw = Math.max(260, wrap.clientWidth || root.clientWidth || 800), ah = wrap.clientHeight;
    coarse = matchMedia('(pointer:coarse)').matches;
    let cw = Math.min(aw, 980), ch;
    const asp = cw < 600 ? 1.45 : 0.62;
    if (ah >= 200) ch = Math.min(ah, cw * asp); else ch = cw * (cw < 600 ? 1.1 : 0.56);
    ch = Math.max(240, Math.round(ch));
    if (cw / ch > 2.2) cw = Math.round(ch * 2.2);
    dpr = Math.min(2.5, window.devicePixelRatio || 1);
    scale = ch / H; W = cw / scale;
    stage.style.width = cw + 'px'; stage.style.height = ch + 'px';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    if (s) s.W = W;
    bg = null; buildReeds();
    if (state !== 'run') draw(0);
  }

  // ----- sabit sahne (gökyüzü, güneş, tepeler, göl) -----
  function hillPath(x, base, amp, f1, f2, ph){
    x.beginPath(); x.moveTo(0, H);
    for (let px = 0; px <= W + 10; px += 10) x.lineTo(px, base - amp * (0.55 + 0.3 * Math.sin(px * f1 + ph) + 0.15 * Math.sin(px * f2 + ph * 2)));
    x.lineTo(W + 10, H); x.closePath();
  }
  function buildScene(){
    const k = scale * dpr;
    const mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(W * k); c.height = Math.ceil(H * k); const x = c.getContext('2d'); x.scale(k, k); return [c, x]; };
    const [c, x] = mk();
    const HZ = OD.HORIZON;
    let gr = x.createLinearGradient(0, 0, 0, HZ);
    gr.addColorStop(0, '#24224f'); gr.addColorStop(0.42, '#6b3c78'); gr.addColorStop(0.75, '#d76f7a'); gr.addColorStop(1, '#ffb76e');
    x.fillStyle = gr; x.fillRect(0, 0, W, HZ + 2);
    // yıldızcıklar (üst kısım)
    const r = mulberry32(5); x.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 26; i++) x.fillRect(r() * W, r() * 90, 1.4, 1.4);
    // güneş
    const sx = W * 0.68, sy = HZ - 62;
    gr = x.createRadialGradient(sx, sy, 10, sx, sy, 190); gr.addColorStop(0, 'rgba(255,214,140,.55)'); gr.addColorStop(1, 'rgba(255,170,110,0)');
    x.fillStyle = gr; x.fillRect(sx - 200, sy - 200, 400, 400);
    gr = x.createLinearGradient(0, sy - 46, 0, sy + 46); gr.addColorStop(0, '#fff3c4'); gr.addColorStop(1, '#ffb45e');
    x.fillStyle = gr; x.beginPath(); x.arc(sx, sy, 46, 0, 6.283); x.fill();
    // tepeler
    x.fillStyle = '#9a5a86'; hillPath(x, HZ - 6, 110, 0.006, 0.017, 1.2); x.fill();
    x.fillStyle = '#6e3f70'; hillPath(x, HZ - 2, 72, 0.009, 0.023, 3.1); x.fill();
    // ağaç sırası
    x.fillStyle = '#3b2850';
    x.beginPath(); x.moveTo(0, HZ + 1);
    for (let px = 0; px <= W + 14; px += 14){ const h = 10 + r() * 16; x.lineTo(px, HZ - 6); x.quadraticCurveTo(px + 7, HZ - 6 - h * 1.6, px + 14, HZ - 6); }
    x.lineTo(W + 14, HZ + 1); x.closePath(); x.fill();
    for (let i = 0; i < 5; i++){ // seyrek uzun kavaklar
      const px = r() * W, h = 30 + r() * 26;
      x.beginPath(); x.ellipse(px, HZ - 6 - h / 2, 6, h / 2, 0, 0, 6.283); x.fill();
    }
    // göl
    gr = x.createLinearGradient(0, HZ, 0, H);
    gr.addColorStop(0, '#f2a06c'); gr.addColorStop(0.18, '#c8687a'); gr.addColorStop(0.55, '#5b3a72'); gr.addColorStop(1, '#2b2550');
    x.fillStyle = gr; x.fillRect(0, HZ, W, H - HZ);
    x.fillStyle = 'rgba(30,20,50,.45)'; x.fillRect(0, HZ, W, 3);
    // tepelerin göldeki yansıması
    x.save(); x.beginPath(); x.rect(0, HZ, W, H - HZ); x.clip(); x.globalAlpha = 0.18; x.translate(0, HZ * 2); x.scale(1, -1);
    x.fillStyle = '#3b2850'; hillPath(x, HZ - 2, 72, 0.009, 0.023, 3.1); x.fill(); x.restore();
    x.fillStyle = 'rgba(0,0,0,0)';
    // nilüferler
    for (let i = 0; i < 7; i++){
      const px = r() * W, py = HZ + 30 + r() * 55, rw = 9 + r() * 9;
      x.fillStyle = '#3f7a52'; x.beginPath(); x.ellipse(px, py, rw, rw * 0.36, 0, 0.3, 6.0); x.lineTo(px, py); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.ellipse(px - rw * 0.2, py - 1, rw * 0.5, rw * 0.12, 0, 0, 6.283); x.fill();
      if (r() < 0.4){ x.fillStyle = '#ffd1e0'; x.beginPath(); x.arc(px + rw * 0.3, py - 2, 2.6, 0, 6.283); x.fill(); }
    }
    bg = c;
    // ön plan kıyı (ördekler bunun arkasından çıkar)
    const [c2, y] = mk();
    const B = OD.BANK;
    gr = y.createLinearGradient(0, B - 10, 0, H); gr.addColorStop(0, '#355a34'); gr.addColorStop(1, '#1a2e1d');
    y.fillStyle = gr; y.beginPath(); y.moveTo(0, H);
    y.lineTo(0, B - 18);
    for (let px = 0; px <= W + 20; px += 20) y.quadraticCurveTo(px + 10, B - 10 + Math.sin(px * 0.05) * 6, px + 20, B + Math.sin(px * 0.031) * 8 + (px < W * 0.2 || px > W * 0.8 ? -10 : 0));
    y.lineTo(W + 20, H); y.closePath(); y.fill();
    y.strokeStyle = 'rgba(160,210,120,.25)'; y.lineWidth = 1.2;
    for (let i = 0; i < W / 3; i++){
      const px = r() * W, py = B + r() * (H - B), h = 4 + r() * 7;
      y.beginPath(); y.moveTo(px, py); y.lineTo(px + (r() - 0.5) * 4, py - h); y.stroke();
    }
    fg = c2;
  }

  // ----- çizim -----
  function rr(x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function drawCloud(cx, cy, sc){
    g.fillStyle = 'rgba(246,186,200,.72)';
    [[0, 0, 22], [24, -8, 26], [50, 0, 20], [26, 6, 22]].forEach(a => { g.beginPath(); g.arc(cx + a[0] * sc, cy + a[1] * sc, a[2] * sc, 0, 6.283); g.fill(); });
    g.fillStyle = 'rgba(255,232,226,.7)';
    [[6, -6, 14], [26, -16, 16]].forEach(a => { g.beginPath(); g.arc(cx + a[0] * sc, cy + a[1] * sc, a[2] * sc, 0, 6.283); g.fill(); });
  }
  function drawDuck(d){
    const T = TYPES[d.type], C = COL[d.type];
    const st = d.st;
    g.save(); g.translate(d.x, d.y);
    if (st === 'fall') g.rotate(Math.min(2.6, d.stT * 7) * d.face);
    g.scale(d.face * T.size, T.size);
    if (d.type === 'gold' && (st === 'fly' || st === 'flee')){
      g.fillStyle = 'rgba(255,214,80,.22)'; g.beginPath(); g.arc(0, -4, 36 + Math.sin(now * 0.008) * 4, 0, 6.283); g.fill();
    }
    const flying = st === 'fly' || st === 'flee';
    const flap = flying ? Math.sin(now * (st === 'flee' ? 0.034 : 0.024) + d.ph) : st === 'hit' ? 1 : 0.4;
    const wing = (back) => {
      g.save(); g.translate(-3, -5); g.rotate(0.15 + flap * 0.95 + (back ? 0.25 : 0));
      g.fillStyle = back ? C.wing2 : C.wing;
      g.beginPath(); g.ellipse(-10, 0, 15, 6.5, 0, 0, 6.283); g.fill();
      if (!back){ g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-20, 1); g.lineTo(-6, 1); g.stroke(); }
      g.restore();
    };
    wing(true);
    // kuyruk
    g.fillStyle = C.body; g.beginPath(); g.moveTo(-17, -3); g.lineTo(-31, -11); g.lineTo(-27, 3); g.closePath(); g.fill();
    // gövde
    g.beginPath(); g.ellipse(0, 0, 22, 14, -0.08, 0, 6.283); g.fill();
    g.fillStyle = C.belly; g.beginPath(); g.ellipse(3, 5, 15, 7.5, -0.05, 0, 6.283); g.fill();
    // ayaklar (düşerken)
    if (st === 'hit' || st === 'fall'){
      g.strokeStyle = '#ff9a2b'; g.lineWidth = 2.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-2, 12); g.lineTo(-6, 20); g.moveTo(5, 12); g.lineTo(3, 21); g.stroke(); g.lineCap = 'butt';
    }
    // baş
    g.fillStyle = C.head; g.beginPath(); g.arc(17, -13, 10.5, 0, 6.283); g.fill();
    if (C.ring){ g.strokeStyle = C.ring; g.lineWidth = 2.2; g.beginPath(); g.arc(17, -13, 10, 1.1, 2.3); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(14, -18, 4.5, 2.4, -0.5, 0, 6.283); g.fill();
    // gaga
    const open = st === 'hit' ? 3 : (flying && Math.sin(now * 0.006 + d.ph * 3) > 0.93 ? 2.2 : 0);
    g.fillStyle = '#ff9f1c'; g.beginPath(); g.ellipse(28, -12 - open * 0.3, 7.5, 3.4, 0.08, 0, 6.283); g.fill();
    if (open){ g.fillStyle = '#e07b0c'; g.beginPath(); g.ellipse(27, -8 + open * 0.4, 6.4, 2.6, 0.2, 0, 6.283); g.fill(); }
    // göz
    if (st === 'hit' || st === 'fall'){
      g.strokeStyle = '#1b1b26'; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(17.5, -19.5); g.lineTo(22.5, -14.5); g.moveTo(22.5, -19.5); g.lineTo(17.5, -14.5); g.stroke();
    } else {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(20, -16, 4, 0, 6.283); g.fill();
      g.fillStyle = '#1b1b26'; g.beginPath(); g.arc(21.3, -16, 2.1, 0, 6.283); g.fill();
      g.fillStyle = '#fff'; g.fillRect(21.6, -17.6, 1, 1);
    }
    g.fillStyle = 'rgba(255,120,140,.45)'; g.beginPath(); g.ellipse(21, -9.5, 3, 1.6, 0, 0, 6.283); g.fill();
    wing(false);
    g.restore();
  }
  function drawBalloon(b){
    if (b.st !== 'float') return;
    const x = b.x, y = b.y;
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x, y + 31);
    for (let i = 1; i <= 6; i++) g.lineTo(x + Math.sin(b.t * 4 + i) * 3, y + 31 + i * 6);
    g.stroke();
    // etiket
    g.fillStyle = '#fff'; rr(x - 20, y + 66, 40, 15, 4); g.fill();
    g.fillStyle = '#d6284b'; g.font = `700 9px ${theme.display}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('VURMA!', x, y + 74);
    g.fillStyle = '#ff4d6d'; g.beginPath(); g.ellipse(x, y, 25, 30, 0, 0, 6.283); g.fill();
    g.beginPath(); g.moveTo(x - 4, y + 32); g.lineTo(x + 4, y + 32); g.lineTo(x, y + 27); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x - 9, y - 12, 6, 10, 0.5, 0, 6.283); g.fill();
    g.fillStyle = '#5a0f22'; g.beginPath(); g.arc(x - 7, y - 2, 2.4, 0, 6.283); g.arc(x + 7, y - 2, 2.4, 0, 6.283); g.fill();
    g.strokeStyle = '#5a0f22'; g.lineWidth = 1.8; g.beginPath(); g.arc(x, y + 4, 6, 0.3, 2.84); g.stroke();
  }
  function drawShell(x, y, on){
    g.globalAlpha = on ? 1 : 0.25;
    g.fillStyle = '#c9302c'; rr(x, y, 9, 20, 2.5); g.fill();
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x + 1.5, y + 2, 2, 11);
    g.fillStyle = '#e0b04a'; g.fillRect(x - 0.5, y + 14, 10, 6.5);
    g.fillStyle = '#b8862c'; g.fillRect(x - 0.5, y + 18.5, 10, 2);
    g.globalAlpha = 1;
  }
  function drawMiniDuck(x, y, st){
    g.save(); g.translate(x, y);
    g.fillStyle = st === 1 ? theme.accent : st === 2 ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.55)';
    g.beginPath(); g.ellipse(0, 2, 8, 5, 0, 0, 6.283); g.arc(6, -4, 4, 0, 6.283); g.fill();
    g.beginPath(); g.moveTo(9, -5); g.lineTo(14, -4); g.lineTo(9, -2); g.fill();
    g.beginPath(); g.moveTo(-7, 0); g.lineTo(-12, -3); g.lineTo(-9, 4); g.fill();
    if (st === 2){ g.strokeStyle = theme.danger; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -7); g.lineTo(10, 8); g.stroke(); }
    g.restore();
  }
  function heart(x, y, r, full){
    g.beginPath(); g.moveTo(x, y + r * 0.9);
    g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.45);
    g.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
    if (full){ g.fillStyle = theme.danger; g.fill(); } else { g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1.5; g.stroke(); }
  }
  function txt(t, x, y, size, col, align){
    g.font = `700 ${size}px ${theme.display}`; g.textAlign = align || 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillText(t, x + 1.5, y + 2);
    g.fillStyle = col; g.fillText(t, x, y);
  }

  function draw(dt){
    const k = scale * dpr;
    if (!bg) buildScene();
    g.setTransform(k, 0, 0, k, 0, 0);
    if (shake > 0 && !reduced){ g.translate((Math.random() - 0.5) * shake * 10, (Math.random() - 0.5) * shake * 10); }
    g.drawImage(bg, 0, 0, W, H);
    // bulutlar
    for (const c of clouds){
      c.x += c.v * dt; const span = W + 200;
      drawCloud(((c.x % span) + span) % span - 100, c.y, c.s);
    }
    // güneş yansıması (parıltı çizgileri)
    const sx = W * 0.68;
    for (let i = 0; i < 9; i++){
      const yy = OD.HORIZON + 6 + i * 9, w = (46 - i * 3.2) * (0.7 + 0.3 * Math.sin(now * 0.003 + i * 1.7));
      g.fillStyle = `rgba(255,226,160,${0.55 - i * 0.05})`;
      g.fillRect(sx - w / 2 + Math.sin(now * 0.002 + i) * 4, yy, w, 2);
    }
    // halkalar
    for (let i = ripples.length - 1; i >= 0; i--){
      const r = ripples[i]; r.t += dt;
      if (r.t > 1.2){ ripples.splice(i, 1); continue; }
      g.strokeStyle = `rgba(255,255,255,${0.6 * (1 - r.t / 1.2)})`; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(r.x, r.y, 8 + r.t * 40, 3 + r.t * 10, 0, 0, 6.283); g.stroke();
      if (r.t < 0.5){ g.beginPath(); g.ellipse(r.x, r.y, 4 + r.t * 20, 1.5 + r.t * 5, 0, 0, 6.283); g.stroke(); }
    }
    if (s){
      // düşen ördekler kıyının önünde, uçanlar arkasında: önce uçanlar
      for (const d of s.ducks) if (d.st === 'fly' || d.st === 'flee') drawDuck(d);
      if (s.balloon) drawBalloon(s.balloon);
    }
    g.drawImage(fg, 0, 0, W, H);
    // sazlar
    for (const r of reeds){
      const sw = Math.sin(now * 0.0013 + r.ph) * (3 + r.h * 0.04);
      g.strokeStyle = r.c; g.lineWidth = r.w; g.beginPath(); g.moveTo(r.x, H + 2); g.quadraticCurveTo(r.x + sw * 0.3, H - r.h * 0.5, r.x + sw, H - r.h); g.stroke();
      if (r.cat){ g.fillStyle = '#6b3f22'; g.beginPath(); g.ellipse(r.x + sw, H - r.h + 9, 3.6, 10, sw * 0.02, 0, 6.283); g.fill(); }
    }
    if (s) for (const d of s.ducks) if (d.st === 'hit' || d.st === 'fall') drawDuck(d);
    // parçacıklar
    for (let i = 0; i < NP; i++){
      if (P.life[i] <= 0) continue;
      P.life[i] -= dt;
      const t = P.t[i];
      if (t === 0){ P.vy[i] = P.vy[i] * (1 - 2 * dt) + 120 * dt; P.vx[i] *= 1 - 1.5 * dt; P.rot[i] += dt * 5; P.x[i] += (P.vx[i] + Math.sin(P.rot[i]) * 30) * dt; }
      else { P.vy[i] += 500 * dt; P.x[i] += P.vx[i] * dt; }
      P.y[i] += P.vy[i] * dt;
      g.globalAlpha = Math.min(1, P.life[i] / P.max[i] * 2);
      g.fillStyle = PCOL[P.c[i]];
      if (t === 0){ g.beginPath(); g.ellipse(P.x[i], P.y[i], 5, 2, P.rot[i], 0, 6.283); g.fill(); }
      else g.fillRect(P.x[i] - 1.5, P.y[i] - 1.5, 3, 3);
    }
    g.globalAlpha = 1;
    // namlu alevi
    if (flash > 0){
      g.globalAlpha = flash / 0.12;
      const gr = g.createRadialGradient(flashX, flashY, 0, flashX, flashY, 40);
      gr.addColorStop(0, 'rgba(255,250,210,.95)'); gr.addColorStop(0.4, 'rgba(255,190,80,.5)'); gr.addColorStop(1, 'rgba(255,150,50,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(flashX, flashY, 40, 0, 6.283); g.fill();
      g.globalAlpha = 1;
    }
    // puan yazıları
    for (let i = pops.length - 1; i >= 0; i--){
      const p = pops[i]; p.t += dt;
      if (p.t > 1.1){ pops.splice(i, 1); continue; }
      g.globalAlpha = Math.min(1, (1.1 - p.t) * 3);
      txt(p.txt, p.x, p.y - p.t * 46, p.size, p.col);
      if (p.sub) txt(p.sub, p.x, p.y - p.t * 46 + p.size * 0.85, 11, p.col);
    }
    g.globalAlpha = 1;
    drawHud(dt);
    // nişangâh
    if (state === 'run' && (!coarse || aimShow > 0)){
      if (coarse) aimShow -= dt;
      const r = 17 + recoil * 14;
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.45)';
      g.beginPath(); g.arc(mx, my, r, 0, 6.283); g.stroke();
      g.lineWidth = 2; g.strokeStyle = theme.accent;
      g.beginPath(); g.arc(mx, my, r, 0, 6.283); g.stroke();
      g.beginPath();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(a => { g.moveTo(mx + a[0] * (r - 6), my + a[1] * (r - 6)); g.lineTo(mx + a[0] * (r + 7), my + a[1] * (r + 7)); });
      g.stroke();
      g.fillStyle = theme.accent; g.fillRect(mx - 1.5, my - 1.5, 3, 3);
    }
  }

  function drawHud(dt){
    if (!s) return;
    // üst sol: haklar
    for (let i = 0; i < OD.LIVES; i++) heart(20 + i * 20, 22, 7, i < s.lives);
    // üst sağ: puan
    scoreShow += (s.score - scoreShow) * Math.min(1, dt * 10);
    if (Math.abs(s.score - scoreShow) < 1) scoreShow = s.score;
    txt(fmtN(scoreShow), W - 14, 24, 26, '#fff', 'right');
    g.font = `600 11px ${theme.display}`; g.fillStyle = 'rgba(255,255,255,.75)'; g.textAlign = 'right'; g.fillText('PUAN', W - 14, 44);
    const mult = multOf(s.combo + 1);
    if (s.combo >= 3){
      const t = '×' + mult + ' KOMBO', w = t.length * 8 + 14;
      g.fillStyle = theme.accent; rr(W - 14 - w, 54, w, 20, 10); g.fill();
      g.fillStyle = theme.ink; g.font = `700 12px ${theme.display}`; g.textAlign = 'center'; g.fillText(t, W - 14 - w / 2, 64.5);
    }
    // alt şerit
    const by = H - 40, bw = Math.min(W - 16, 520), bx = (W - bw) / 2;
    g.fillStyle = 'rgba(12,10,24,.6)'; rr(bx, by, bw, 32, 12); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.stroke();
    // fişekler (giriş sırasında tek tek dolar)
    let shown = s.shells;
    if (s.phase === 'intro') shown = Math.min(s.shellsMax, Math.floor(s.pt / 0.18));
    for (let i = 0; i < s.shellsMax; i++) drawShell(bx + 12 + i * 14, by + 6, i < shown);
    // dalgadaki ördekler
    const n = s.tally.length, tx = W / 2 - (n - 1) * 15;
    for (let i = 0; i < n; i++) drawMiniDuck(tx + i * 30, by + 17, s.tally[i]);
    g.font = `700 13px ${theme.display}`; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    g.fillText((W < 420 ? 'D ' : 'DALGA ') + s.wave + '/' + OD.WAVES, bx + bw - 12, by + 17);
    // afiş
    if (banner){
      banner.t += dt;
      if (banner.t > banner.dur) banner = null;
      else {
        const a = Math.min(1, banner.t * 5, (banner.dur - banner.t) * 4);
        const sc = reduced ? 1 : 1 + Math.max(0, 0.25 - banner.t) * 1.2;
        g.globalAlpha = a; g.save(); g.translate(W / 2, H * 0.36); g.scale(sc, sc);
        txt(banner.big, 0, 0, W < 420 ? 30 : 38, banner.col || '#fff');
        if (banner.small) txt(banner.small, 0, 32, 15, 'rgba(255,255,255,.92)');
        g.restore(); g.globalAlpha = 1;
      }
    }
  }

  // ----- olaylar -----
  function handleEvents(){
    const evs = s.ev; s.ev = [];
    for (const e of evs){
      if (e.k === 'wave'){ banner = { big: 'DALGA ' + e.n, small: s.cfg.ducks + ' ördek · ' + s.cfg.shells + ' fişek', t: 0, dur: 1.4 }; for (let i = 0; i < s.cfg.shells; i++) setTimeout(() => { if (!destroyed && state === 'run') snd('reload'); }, 180 * (i + 1)); }
      else if (e.k === 'spawn'){ snd('quack'); for (let i = 0; i < 5; i++) emit(e.d.x + (Math.random() - 0.5) * 30, OD.BANK + 4, (Math.random() - 0.5) * 60, -80 - Math.random() * 80, 0.6, 7, 1); }
      else if (e.k === 'hit'){
        const d = e.d, n = reduced ? 6 : 14, cIdx = d.type === 'gold' ? 2 : d.type === 'teal' ? 5 : 0;
        for (let i = 0; i < n; i++){ const a = Math.random() * 6.28, v = 60 + Math.random() * 160; emit(d.x, d.y, Math.cos(a) * v, Math.sin(a) * v - 40, 1.2 + Math.random() * 0.6, i % 3 === 0 ? 1 : cIdx, 0); }
        if (d.type === 'gold') for (let i = 0; i < 12; i++){ const a = Math.random() * 6.28; emit(d.x, d.y, Math.cos(a) * 200, Math.sin(a) * 200, 0.7, 2, 1); }
        pops.push({ x: d.x, y: d.y - 30, txt: '+' + fmtN(e.pts), sub: e.dbl ? 'ÇİFT VURUŞ!' : e.mult > 1 ? '×' + e.mult : '', t: 0, size: d.type === 'gold' ? 24 : 20, col: d.type === 'gold' ? '#ffd84d' : '#fff' });
        shake = 0.35; snd(d.type === 'gold' ? 'gold' : 'hit');
      }
      else if (e.k === 'pop'){
        for (let i = 0; i < 14; i++){ const a = Math.random() * 6.28, v = 80 + Math.random() * 140; emit(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, 0.6, 3, 1); }
        pops.push({ x: e.x, y: e.y - 20, txt: '−' + OD.BALLOON_PEN, sub: 'Balon vurulmaz!', t: 0, size: 22, col: theme.danger });
        snd('pop'); shake = 0.25;
      }
      else if (e.k === 'miss'){ for (let i = 0; i < 4; i++) emit(e.x, e.y, (Math.random() - 0.5) * 80, -Math.random() * 60, 0.3, 6, 1); }
      else if (e.k === 'empty'){ snd('empty'); pops.push({ x: mx, y: my - 24, txt: 'Fişek bitti', t: 0.3, size: 13, col: 'rgba(255,255,255,.8)' }); }
      else if (e.k === 'splash'){ ripples.push({ x: e.x, y: e.y, t: 0 }); for (let i = 0; i < 10; i++) emit(e.x + (Math.random() - 0.5) * 16, e.y, (Math.random() - 0.5) * 120, -120 - Math.random() * 140, 0.7, 4, 1); snd('splash'); }
      else if (e.k === 'escape'){ snd('escape'); pops.push({ x: Math.min(W - 60, Math.max(60, e.d.x)), y: 70, txt: 'Kaçtı!', t: 0, size: 16, col: theme.danger }); }
      else if (e.k === 'clear'){
        if (e.bonus){ banner = { big: 'KUSURSUZ!', small: '+' + fmtN(e.bonus) + ' bonus', t: 0, dur: 1.6, col: theme.accent }; snd('perfect'); }
        else banner = { big: e.got + '/' + e.of + ' vuruldu', small: s.lives > 0 && s.wave < OD.WAVES ? 'Sıradaki dalga geliyor…' : '', t: 0, dur: 1.5 };
      }
      else if (e.k === 'nolives'){ banner = { big: 'Çok ördek kaçtı!', small: '', t: 0, dur: 1.4, col: theme.danger }; }
      else if (e.k === 'over') gameOver();
    }
  }

  // ----- döngü -----
  function tick(t){
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; now = t;
    if (state === 'run'){
      let left = dt;
      while (left > 1e-6){ const h = Math.min(left, 1 / 120); step(s, h); left -= h; }
      handleEvents();
    }
    recoil = Math.max(0, recoil - dt * 6); flash = Math.max(0, flash - dt); shake = Math.max(0, shake - dt * 1.6);
    if (state === 'pause') return;
    draw(dt);
  }

  function showOv(html){ ov.innerHTML = html; ov.hidden = !html; }
  function start(){
    readTheme(); bg = null;
    s = newState((Math.random() * 4294967296) >>> 0, W);
    state = 'run'; showOv(''); scoreShow = 0; pops.length = 0; ripples.length = 0;
    wrap.classList.add('playing');
    handleEvents();
  }
  function gameOver(){
    if (state === 'over') return;
    state = 'over'; overAt = performance.now();
    wrap.classList.remove('playing');
    snd('over');
    const acc = s.shots ? Math.round(s.hits / s.shots * 100) : 0;
    showOv(`<div class="ordek-card ordek-over"><b>${s.lives > 0 ? 'Av bitti!' : 'Ördekler kaçtı!'}</b><span class="ordek-big">${fmtN(s.score)} puan</span>` +
      `<small>${s.hits}/${s.ducksTotal} ördek · isabet %${acc} · en uzun seri ${s.maxCombo} · ${s.wave}. dalga</small>` +
      `<button type="button" class="btn small primary ordek-again">↻ Tekrar oyna</button></div>`);
    const b = ov.querySelector('.ordek-again'); if (b) b.onclick = ev => { ev.stopPropagation(); again(); };
    if (!finished){
      finished = true;
      try { ctx.finish({ score: s.score, detail: { ms: Math.round(s.t * 1000), waves: s.wave, hits: s.hits, shots: s.shots, ducks: s.ducksTotal, pops: s.pops, maxCombo: s.maxCombo } }); } catch(e){}
    }
  }
  function again(){ if (performance.now() - overAt > 500) ctx.restart(); }
  function pause(){
    if (state !== 'run') return;
    state = 'pause'; wrap.classList.remove('playing');
    showOv('<div class="ordek-card"><b>Duraklatıldı</b><small>Devam için <kbd>P</kbd> / tıkla</small></div>');
  }
  function resume(){ if (state !== 'pause') return; state = 'run'; last = performance.now(); showOv(''); wrap.classList.add('playing'); }
  function ready(){
    state = 'ready';
    showOv('<div class="ordek-card ordek-start"><b>🦆 Ördek Avı</b><small>10 dalga, her dalgada 2-3 ördek ve sınırlı fişek. Altın ördek 300 puan, art arda vuruşlar çarpanı büyütür. ' +
      '<span class="ordek-warn">🎈 Balonu vurma, puan kaybettirir.</span> 6 ördek kaçarsa av biter.</small><span class="ordek-go">Başlamak için tıkla / dokun</span></div>');
  }

  // ----- girdi -----
  const typing = e => { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
  const visible = () => wrap.isConnected && wrap.offsetParent !== null;
  function toLocal(e){ const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale]; }
  function fire(x, y, touch){
    mx = x; my = y; aimShow = 0.8;
    if (s.phase !== 'play') return;
    const res = shoot(s, x, y, touch ? 12 : 4);
    if (res && !res.empty){ snd('shot'); recoil = 1; flash = 0.12; flashX = x; flashY = y; }
    handleEvents();
  }
  function onDown(e){
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    if (state === 'ready'){ start(); return; }
    if (state === 'pause'){ resume(); return; }
    if (state === 'over'){ return; }
    const [x, y] = toLocal(e);
    fire(x, y, e.pointerType !== 'mouse');
  }
  function onMove(e){ const [x, y] = toLocal(e); mx = x; my = y; if (e.pointerType !== 'mouse') aimShow = 0.8; }
  function onKey(e){
    if (typing(e) || !visible()) return;
    const c = e.code;
    if (c === 'KeyP' || c === 'Escape'){ if (state === 'run'){ pause(); e.preventDefault(); } else if (state === 'pause' && c === 'KeyP') resume(); return; }
    if ((c === 'Space' || c === 'Enter') && !e.repeat){
      if (state === 'ready'){ e.preventDefault(); start(); } else if (state === 'pause'){ e.preventDefault(); resume(); } else if (state === 'over'){ e.preventDefault(); again(); }
    }
  }
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('contextmenu', e => e.preventDefault());
  pauseBtn.addEventListener('pointerdown', e => e.stopPropagation());
  pauseBtn.addEventListener('click', e => { e.stopPropagation(); if (state === 'run') pause(); else if (state === 'pause') resume(); });
  const onVis = () => { if (document.hidden) pause(); };
  const onBlur = () => pause();
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('blur', onBlur);
  const ro = window.ResizeObserver ? new ResizeObserver(() => resize()) : null;
  if (ro) ro.observe(wrap); else window.addEventListener('resize', resize);

  readTheme(); resize(); ready();
  last = performance.now(); raf = requestAnimationFrame(tick);
  // test kancası
  wrap._ordek = {
    get state(){ return state; }, get s(){ return s; }, get W(){ return W; },
    start(){ if (state === 'ready') start(); },
    // mantıksal koordinatı ekran koordinatına çevir
    toClient(x, y){ const r = cv.getBoundingClientRect(); return [r.left + x * scale, r.top + y * scale]; }
  };

  return {
    destroy(){
      if (destroyed) return; destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      wrap.remove(); help.remove();
    }
  };
}

const def = {
  id: 'ordek', name: 'Ördek Avı', icon: '🦆',
  desc: 'Gün batımında göl kıyısı: ördekleri vur, balonlara dikkat et!',
  levels: [], daily: false, better: 'high',
  format: v => Number(v).toLocaleString('tr-TR') + ' puan',
  mount
};
if (typeof registerSolo === 'function') registerSolo(def);
else (window.SOLO_PENDING = window.SOLO_PENDING || []).push(def);
})();
