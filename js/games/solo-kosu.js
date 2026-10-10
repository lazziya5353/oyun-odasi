// Engel Koşusu: sonsuz koşu. Zıpla (basılı tut = daha yüksek, havada bir kez daha), eğil, simit topla.
// KosuCore saf fizik + engel üretici (tohumlu, DOM'suz, Node'da adillik testi var); altta canvas arayüzü.
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

const K = {
  G: 2600, V0: 820, CUT: 0.42, MINHOLD: 0.07, DJ: 0.8, FALLG: 2.4, BUFFER: 0.12, COYOTE: 0.08,
  PX: 90, PW: 32, PH: 40, DUCKH: 22, INSET: 5,
  SPEED0: 360, SPEEDMAX: 760, ACC: 5,
  STEP: 1 / 120
};
// engel türleri: [ad, genişlik, yükseklik, yerden yükseklik]
const KINDS = [
  ['koni', 28, 40, 0], ['zar', 34, 34, 0], ['zar2', 34, 66, 0], ['cay', 24, 46, 0],
  ['tezgah', 80, 52, 0], ['kedi', 44, 32, 0], ['marti', 44, 22, 30]
];
const KI = {}; KINDS.forEach((k, i) => { KI[k[0]] = i; });
const EV = { JUMP: 1, DJ: 2, SIMIT: 4, CAY: 8, HIT: 16, SHIELD: 32, LAND: 64 };
const NOBS = 16, NITEM = 16;

// tam zıplamada (V0) h yüksekliğinin üstünde geçen süre
function airAbove(h){
  const d = K.V0 * K.V0 - 2 * K.G * h;
  return d <= 0 ? 0 : 2 * Math.sqrt(d) / K.G;
}
// bir grup (genişlik w, en yüksek nokta h) bu hızda tek zıplamayla aşılabilir mi
function clearable(v, w, h){
  return v * airAbove(h + 6) >= w + K.PW - 2 * K.INSET + 20;
}
function minGap(v){ return v * (2 * K.V0 / K.G) + K.PW + 50; }

function newState(seed, viewW){
  const s = {
    seed: seed >>> 0, rng: mulberry32(seed >>> 0), viewW: viewW || 800,
    t: 0, speed: K.SPEED0, dist: 0, score: 0, simit: 0, shield: 0, dead: false, ev: 0,
    y: 0, vy: 0, onGround: true, jumps: 0, holdT: 0, cut: true, bufT: 0, coyT: 0, duck: false, fast: false,
    obs: [], items: [], nextX: (viewW || 800) + 200, grp: 0, cayT: 18, groups: 0, unfair: 0
  };
  for (let i = 0; i < NOBS; i++) s.obs.push({ on: false, k: 0, x: 0, y: 0, w: 0, h: 0, grp: 0, f: 0 });
  for (let i = 0; i < NITEM; i++) s.items.push({ on: false, k: 0, x: 0, y: 0, r: 12, f: 0 });
  return s;
}

function addObs(s, kind, x){
  for (let i = 0; i < NOBS; i++){
    const o = s.obs[i];
    if (o.on) continue;
    const d = KINDS[kind];
    o.on = true; o.k = kind; o.x = x; o.w = d[1]; o.h = d[2]; o.y = d[3]; o.grp = s.grp; o.f = Math.floor(s.rng() * 6);
    return o;
  }
  return null;
}
function addItem(s, kind, x, y){
  for (let i = 0; i < NITEM; i++){
    const it = s.items[i];
    if (it.on) continue;
    it.on = true; it.k = kind; it.x = x; it.y = y; it.r = kind === 1 ? 13 : 12; it.f = s.rng() * 6;
    return it;
  }
  return null;
}

// bir engel grubu üret, genişliğini döndür
function spawnGroup(s, x){
  const r = s.rng, t = s.t, v = s.speed;
  s.grp++;
  let pool = [0, 0, 1, 1, 3, 5];
  if (t > 8) pool.push(4, 2, 6);
  if (t > 14) pool.push(6, 7, 2);
  if (t > 25) pool.push(8, 7, 4);
  let pat = pool[Math.floor(r() * pool.length)];
  let w = 0, h = 0, duck = false;
  const put = (kind, dx) => { const o = addObs(s, kind, x + dx); if (o){ w = Math.max(w, dx + o.w); h = Math.max(h, o.y + o.h); } return o; };
  if (pat === 0) put(KI.koni, 0);
  else if (pat === 1) put(KI.zar, 0);
  else if (pat === 2) put(KI.zar2, 0);
  else if (pat === 3) put(KI.cay, 0);
  else if (pat === 4) put(KI.tezgah, 0);
  else if (pat === 5) put(KI.kedi, 0);
  else if (pat === 6){ put(KI.marti, 0); duck = true; }
  else if (pat === 7){ put(KI.koni, 0); put(KI.koni, 42); }
  else { put(KI.zar, 0); put(KI.koni, 44); }
  // adillik: tek zıplamayla aşılamıyorsa tek koniye düş
  if (!duck && !clearable(v, w, h)){
    s.unfair++;
    for (let i = 0; i < NOBS; i++) if (s.obs[i].on && s.obs[i].grp === s.grp) s.obs[i].on = false;
    w = 0; h = 0; put(KI.koni, 0);
  }
  s.groups++;
  // simit dizileri
  const q = r();
  if (!duck && q < 0.4){
    const cx = x + w / 2, dx = v * 0.11;
    addItem(s, 0, cx - dx, 118); addItem(s, 0, cx, 140); addItem(s, 0, cx + dx, 118);
  }
  return { w, h, duck };
}

function step(s, dt, inp){
  if (s.dead) return;
  s.ev = 0;
  s.t += dt;
  s.speed = Math.min(K.SPEEDMAX, K.SPEED0 + K.ACC * s.t);
  const v = s.speed, dx = v * dt;
  s.dist += dx;

  // --- zıplama ---
  if (inp.press){
    if (!s.onGround && s.coyT <= 0 && s.jumps < 2 && s.jumps > 0){
      s.vy = K.V0 * K.DJ; s.jumps = 2; s.holdT = 0; s.cut = false; s.fast = false; s.ev |= EV.DJ; s.bufT = 0;
    } else s.bufT = K.BUFFER;
  } else if (s.bufT > 0) s.bufT -= dt;
  if (s.bufT > 0 && (s.onGround || s.coyT > 0)){
    s.vy = K.V0; s.onGround = false; s.jumps = 1; s.holdT = 0; s.cut = false; s.bufT = 0; s.coyT = 0; s.fast = false; s.duck = false;
    s.ev |= EV.JUMP;
  }
  if (!s.onGround){
    s.holdT += dt;
    if (!inp.held && !s.cut && s.vy > 0 && s.holdT >= K.MINHOLD){ if (s.vy > K.V0 * K.CUT) s.vy = K.V0 * K.CUT; s.cut = true; }
    if (inp.down && !s.fast){ s.fast = true; if (s.vy > -200) s.vy = -200; }
    s.vy -= K.G * (s.fast ? K.FALLG : 1) * dt;
    s.y += s.vy * dt;
    if (s.y <= 0){ s.y = 0; s.vy = 0; s.onGround = true; s.jumps = 0; s.fast = false; s.ev |= EV.LAND; }
  }
  s.duck = s.onGround && !!inp.down;
  if (s.shield > 0) s.shield = Math.max(0, s.shield - dt);

  // --- dünya ---
  s.nextX -= dx;
  while (s.nextX < s.viewW + 80){
    const g = spawnGroup(s, s.nextX);
    let gap = minGap(v + 20) + s.rng() * v * 0.7;
    s.cayT -= 1;
    // boşlukta simit sırası ya da çay
    if (s.cayT <= 0 && s.shield <= 0 && s.t > 6){ addItem(s, 1, s.nextX + g.w + gap * 0.5, 60); s.cayT = 14 + Math.floor(s.rng() * 10); }
    else if (s.rng() < 0.35){ const sx = s.nextX + g.w + gap * 0.35; for (let k = 0; k < 3; k++) addItem(s, 0, sx + k * 34, 22); }
    s.nextX += g.w + gap;
  }
  const h = s.duck ? K.DUCKH : K.PH;
  const px1 = K.PX + K.INSET, px2 = K.PX + K.PW - K.INSET, py1 = s.y + 3, py2 = s.y + h - K.INSET;
  for (let i = 0; i < NOBS; i++){
    const o = s.obs[i];
    if (!o.on) continue;
    o.x -= dx;
    if (o.x + o.w < -60){ o.on = false; continue; }
    if (o.x + 3 < px2 && o.x + o.w - 3 > px1 && o.y + 2 < py2 && o.y + o.h - 3 > py1){
      if (s.shield > 0){ s.shield = 0; o.on = false; s.ev |= EV.SHIELD; }
      else { s.dead = true; s.ev |= EV.HIT; return; }
    }
  }
  const cxp = K.PX + K.PW / 2, cyp = s.y + h / 2;
  for (let i = 0; i < NITEM; i++){
    const it = s.items[i];
    if (!it.on) continue;
    it.x -= dx;
    if (it.x < -40){ it.on = false; continue; }
    const ddx = Math.max(Math.abs(it.x - cxp) - K.PW / 2, 0), ddy = Math.max(Math.abs(it.y - cyp) - h / 2, 0);
    if (ddx * ddx + ddy * ddy < it.r * it.r){
      it.on = false;
      if (it.k === 0){ s.simit++; s.ev |= EV.SIMIT; } else { s.shield = 6; s.ev |= EV.CAY; }
    }
  }
  s.score = Math.floor(s.dist / 8) + s.simit * 50;
}

const KosuCore = { K, KINDS, KI, EV, mulberry32, newState, step, airAbove, clearable, minGap };
if (typeof module !== 'undefined' && module.exports){ module.exports = KosuCore; return; }
if (typeof window !== 'undefined') window.KosuCore = KosuCore;

// ---------------- Arayüz ----------------
const SKY = [ // [faz, üst, alt]
  [0.00, [94, 179, 240], [205, 238, 255]],
  [0.24, [94, 179, 240], [205, 238, 255]],
  [0.34, [72, 52, 128], [255, 150, 98]],
  [0.44, [14, 18, 40], [40, 46, 92]],
  [0.80, [14, 18, 40], [40, 46, 92]],
  [0.90, [98, 102, 176], [255, 190, 150]],
  [1.00, [94, 179, 240], [205, 238, 255]]
];
const DAYLEN = 6000 * 8; // gün döngüsü (mesafe birimi)
function skyAt(ph, out){
  let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= ph) i++;
  const a = SKY[i], b = SKY[i + 1], t = (ph - a[0]) / Math.max(1e-6, b[0] - a[0]);
  for (let k = 0; k < 3; k++){ out[k] = a[1][k] + (b[1][k] - a[1][k]) * t; out[k + 3] = a[2][k] + (b[2][k] - a[2][k]) * t; }
  return out;
}
function nightness(ph){
  if (ph < 0.26) return 0; if (ph < 0.42) return (ph - 0.26) / 0.16; if (ph < 0.82) return 1; if (ph < 0.92) return 1 - (ph - 0.82) / 0.1; return 0;
}
function rr(g, x, y, w, h, r){
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function snd(kind){
  try {
    if (typeof tone !== 'function') return;
    if (kind === 'jump') tone([520, 780], 0.05, 0.12, 0.05);
    else if (kind === 'dj') tone([700, 1050], 0.04, 0.12, 0.05);
    else if (kind === 'simit') tone([988, 1319], 0.07, 0.16, 0.07);
    else if (kind === 'cay') tone([660, 880, 1175], 0.08, 0.22, 0.08);
    else if (kind === 'shield') tone([440, 330], 0.06, 0.2, 0.08);
    else if (kind === 'hit') tone([196, 131, 98], 0.09, 0.32, 0.12);
  } catch(e){}
}

function mount(root, ctx){
  const wrap = document.createElement('div'); wrap.className = 'kosu';
  const cv = document.createElement('canvas'); cv.className = 'kosu-cv'; cv.setAttribute('aria-label', 'Engel Koşusu oyun alanı');
  const ov = document.createElement('div'); ov.className = 'kosu-ov';
  const duckBtn = document.createElement('button'); duckBtn.className = 'kosu-duck'; duckBtn.type = 'button'; duckBtn.textContent = '⬇'; duckBtn.setAttribute('aria-label', 'Eğil');
  const pauseBtn = document.createElement('button'); pauseBtn.className = 'kosu-pausebtn'; pauseBtn.type = 'button'; pauseBtn.textContent = '⏸'; pauseBtn.setAttribute('aria-label', 'Duraklat');
  const help = document.createElement('div'); help.className = 'kosu-help';
  help.innerHTML = '<span><kbd>Boşluk</kbd>/<kbd>↑</kbd>/dokun: zıpla · basılı tut: yüksek</span><span>havada tekrar: çift zıplama</span><span><kbd>↓</kbd>/aşağı kaydır: eğil</span><span><kbd>P</kbd>: duraklat</span>';
  wrap.append(cv, ov, duckBtn, pauseBtn);
  root.append(wrap, help);
  const g = cv.getContext('2d');

  let W = 800, H = 300, scale = 1, dpr = 1, GY = 250;
  let state = 'ready', s = newState((Math.random() * 4294967296) >>> 0, 800), finished = false, overAt = 0;
  const inp = { press: false, held: false, down: false };
  let keyDown = false, keyHeld = false, ptrDown = false, swipeDown = false, duckHeld = false, ptrY = 0, ptrId = -1;
  let raf = 0, last = 0, acc = 0, frame = 0, destroyed = false;
  let theme = {};
  const skyBuf = new Float32Array(6);
  let skyGrad = null, skyPh = -1;
  // parçacıklar (sabit havuz)
  const NP = 60, P = { x: new Float32Array(NP), y: new Float32Array(NP), vx: new Float32Array(NP), vy: new Float32Array(NP), life: new Float32Array(NP), t: new Uint8Array(NP) };
  let pi = 0;
  const emit = (x, y, vx, vy, life, t) => { P.x[pi] = x; P.y[pi] = y; P.vx[pi] = vx; P.vy[pi] = vy; P.life[pi] = life; P.t[pi] = t; pi = (pi + 1) % NP; };
  const rnd = mulberry32(99);
  // yıldızlar ve bulutlar
  const NS = 70, stars = new Float32Array(NS * 3);
  for (let i = 0; i < NS; i++){ stars[i * 3] = rnd(); stars[i * 3 + 1] = rnd() * 0.62; stars[i * 3 + 2] = rnd() * 6.28; }
  const NC = 6, clouds = new Float32Array(NC * 3);
  for (let i = 0; i < NC; i++){ clouds[i * 3] = rnd() * 1400; clouds[i * 3 + 1] = 20 + rnd() * 90; clouds[i * 3 + 2] = 0.6 + rnd() * 0.7; }
  let city = null, cloudSpr = null, moonSpr = null, groundOff = 0, cityOff = 0, midOff = 0, cloudOff = 0;
  let scoreStr = '0', scoreVal = -1, hiStr = '';

  function readTheme(){
    const cs = getComputedStyle(document.body);
    const v = n => cs.getPropertyValue(n).trim();
    theme = { accent: v('--accent') || '#5ee0b5', ink: v('--accent-ink') || '#06261b', fg: v('--fg') || '#e6e9f0', bg: v('--bg') || '#0f1218',
      panel2: v('--panel-2') || '#1f2430', line: v('--line') || '#2a3040', warn: v('--warn') || '#ffc35c', danger: v('--danger') || '#ff6b6b',
      display: v('--display') || 'sans-serif' };
    city = null;
  }

  function resize(){
    const cw = Math.max(260, Math.min(900, wrap.clientWidth || root.clientWidth || 800));
    const ch = cw >= 640 ? Math.round(Math.min(360, Math.max(300, cw * 0.4))) : Math.round(Math.max(240, cw * 0.72));
    dpr = Math.min(2.5, window.devicePixelRatio || 1);
    scale = Math.min(ch / 300, cw / 560);
    W = cw / scale; H = ch / scale; GY = H - 52;
    cv.style.height = ch + 'px';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    s.viewW = W;
    skyGrad = null; city = null;
    if (state !== 'run') draw();
  }

  // uzak şehir silueti (gündüz + gece) bir kez çizilir
  function buildCity(){
    const cw = 1200, chh = 170, k = scale * dpr;
    const mk = night => {
      const c = document.createElement('canvas'); c.width = Math.ceil(cw * k); c.height = Math.ceil(chh * k);
      const x = c.getContext('2d'); x.scale(k, k);
      const r = mulberry32(7);
      x.fillStyle = night ? '#1b2142' : '#8fb0d4';
      x.beginPath(); x.moveTo(0, chh);
      for (let i = 0; i <= 12; i++) x.quadraticCurveTo(i * 100 + 50, chh - 60 - r() * 30, i * 100 + 100, chh - 40);
      x.lineTo(cw, chh); x.fill();
      const col = night ? '#141936' : '#7397c0';
      x.fillStyle = col;
      for (let bx = 0; bx < cw; ){
        const w = 26 + r() * 40, h = 30 + r() * 70;
        x.fillRect(bx, chh - h, w, h);
        if (night) { x.fillStyle = '#ffd37a'; for (let wy = chh - h + 8; wy < chh - 6; wy += 11) for (let wx = bx + 5; wx < bx + w - 6; wx += 9) if (r() < 0.3) x.fillRect(wx, wy, 3.5, 5); x.fillStyle = col; }
        bx += w + 4 + r() * 18;
      }
      // camiler ve Galata
      const mosque = (mx, s2) => {
        x.beginPath(); x.ellipse(mx, chh - 70 * s2, 34 * s2, 30 * s2, 0, Math.PI, 0); x.fill();
        x.fillRect(mx - 46 * s2, chh - 72 * s2, 92 * s2, 72 * s2);
        [-58, 58].forEach(d => { x.fillRect(mx + d * s2 - 3 * s2, chh - 130 * s2, 6 * s2, 130 * s2); x.beginPath(); x.moveTo(mx + d * s2 - 3.5 * s2, chh - 130 * s2); x.lineTo(mx + d * s2, chh - 150 * s2); x.lineTo(mx + d * s2 + 3.5 * s2, chh - 130 * s2); x.fill(); });
      };
      x.fillStyle = col; mosque(220, 0.95); mosque(760, 0.7);
      x.fillRect(1000, chh - 120, 26, 120); x.beginPath(); x.moveTo(996, chh - 118); x.lineTo(1013, chh - 162); x.lineTo(1030, chh - 118); x.fill();
      if (night){ x.fillStyle = '#ffd37a'; x.fillRect(1006, chh - 110, 4, 8); x.fillRect(1016, chh - 110, 4, 8); }
      return c;
    };
    city = { day: mk(false), night: mk(true), w: cw, h: chh };
    const c = document.createElement('canvas'); c.width = Math.ceil(120 * k); c.height = Math.ceil(50 * k);
    const x = c.getContext('2d'); x.scale(k, k); x.fillStyle = '#fff';
    [[30, 32, 18], [55, 24, 22], [82, 30, 18], [60, 36, 20]].forEach(a => { x.beginPath(); x.arc(a[0], a[1], a[2], 0, 6.283); x.fill(); });
    cloudSpr = c;
    // hilal: dairenin bir kısmını sil
    const m = document.createElement('canvas'); m.width = m.height = Math.ceil(34 * k);
    const mg = m.getContext('2d'); mg.scale(k, k);
    mg.fillStyle = '#f4f1dc'; mg.beginPath(); mg.arc(17, 17, 15, 0, 6.283); mg.fill();
    mg.globalCompositeOperation = 'destination-out'; mg.beginPath(); mg.arc(24, 13, 13, 0, 6.283); mg.fill();
    moonSpr = m;
  }

  // ----- çizim -----
  function draw(){
    const k = scale * dpr;
    g.setTransform(k, 0, 0, k, 0, 0);
    if (!city) buildCity();
    const ph = ((s.dist / DAYLEN) % 1 + 1) % 1, night = nightness(ph);
    if (!skyGrad || Math.abs(ph - skyPh) > 0.002){
      skyAt(ph, skyBuf); skyPh = ph;
      skyGrad = g.createLinearGradient(0, 0, 0, GY);
      skyGrad.addColorStop(0, `rgb(${skyBuf[0] | 0},${skyBuf[1] | 0},${skyBuf[2] | 0})`);
      skyGrad.addColorStop(1, `rgb(${skyBuf[3] | 0},${skyBuf[4] | 0},${skyBuf[5] | 0})`);
    }
    g.fillStyle = skyGrad; g.fillRect(0, 0, W, GY + 1);
    // yıldızlar
    if (night > 0.02){
      g.fillStyle = '#fff';
      for (let i = 0; i < NS; i++){
        g.globalAlpha = night * (0.45 + 0.4 * Math.sin(stars[i * 3 + 2] + frame * 0.03));
        g.fillRect(stars[i * 3] * W, stars[i * 3 + 1] * GY, 1.6, 1.6);
      }
      g.globalAlpha = 1;
    }
    // güneş / ay
    const sunT = ph < 0.4 ? ph / 0.4 : -1, moonT = ph > 0.38 && ph < 0.9 ? (ph - 0.38) / 0.52 : -1;
    if (sunT >= 0){ const sx = W * (0.15 + sunT * 0.7), sy = GY - 40 - Math.sin(sunT * Math.PI) * (GY - 90); g.fillStyle = 'rgba(255,230,150,.25)'; g.beginPath(); g.arc(sx, sy, 34, 0, 6.283); g.fill(); g.fillStyle = '#ffe9a6'; g.beginPath(); g.arc(sx, sy, 20, 0, 6.283); g.fill(); }
    if (moonT >= 0){ const mx = W * (0.15 + moonT * 0.7), my = GY - 40 - Math.sin(moonT * Math.PI) * (GY - 90); g.drawImage(moonSpr, mx - 17, my - 17, 34, 34); }
    // bulutlar
    g.globalAlpha = 0.85 - night * 0.65;
    for (let i = 0; i < NC; i++){
      const sc = clouds[i * 3 + 2], cw = 120 * sc;
      let x = ((clouds[i * 3] - cloudOff * sc) % (W + 300) + W + 300) % (W + 300) - 150;
      g.drawImage(cloudSpr, x, clouds[i * 3 + 1], cw, 50 * sc);
    }
    g.globalAlpha = 1;
    // şehir silueti
    const cy = GY - city.h + 10, cwid = city.w;
    let cx0 = -(cityOff % cwid);
    for (let x = cx0; x < W; x += cwid){
      if (night < 0.98){ g.globalAlpha = 1; g.drawImage(city.day, x, cy, cwid, city.h); }
      if (night > 0.02){ g.globalAlpha = night; g.drawImage(city.night, x, cy, cwid, city.h); }
    }
    g.globalAlpha = 1;
    // orta katman: sokak lambaları
    const lampGap = 230;
    for (let x = -(midOff % lampGap); x < W + 20; x += lampGap){
      g.fillStyle = night > 0.5 ? '#2a3150' : '#4f6b8c';
      g.fillRect(x, GY - 92, 4, 92); g.fillRect(x, GY - 92, 18, 4);
      if (night > 0.1){ g.globalAlpha = night * 0.35; g.fillStyle = '#ffe28a'; g.beginPath(); g.moveTo(x + 12, GY - 86); g.lineTo(x - 14, GY); g.lineTo(x + 40, GY); g.closePath(); g.fill(); g.globalAlpha = 1; }
      g.fillStyle = night > 0.1 ? '#ffe28a' : '#d7dee8'; g.fillRect(x + 10, GY - 88, 10, 5);
    }
    // zemin
    g.fillStyle = theme.panel2; g.fillRect(0, GY, W, H - GY);
    g.fillStyle = theme.line; g.fillRect(0, GY + 14, W, 2);
    g.fillStyle = 'rgba(255,255,255,.06)';
    for (let x = -(groundOff % 48); x < W; x += 48) g.fillRect(x, GY + 18, 30, H - GY - 18);
    g.fillStyle = theme.line;
    for (let x = -(groundOff % 48); x < W; x += 48) g.fillRect(x + 36, GY + 3, 2, 10);
    g.globalAlpha = 0.25; g.fillStyle = theme.accent; g.fillRect(0, GY - 1, W, 6); g.globalAlpha = 1;
    g.fillStyle = theme.accent; g.fillRect(0, GY, W, 2);

    // nesneler
    for (let i = 0; i < s.items.length; i++){ const it = s.items[i]; if (it.on) drawItem(it); }
    for (let i = 0; i < s.obs.length; i++){ const o = s.obs[i]; if (o.on) drawObs(o); }
    drawPlayer();
    // parçacıklar
    for (let i = 0; i < NP; i++){
      if (P.life[i] <= 0) continue;
      g.globalAlpha = Math.min(1, P.life[i] * 2.5);
      g.fillStyle = P.t[i] === 0 ? 'rgba(200,200,210,.8)' : P.t[i] === 1 ? '#ffd166' : theme.accent;
      const sz = P.t[i] === 0 ? 3 : 2.5;
      g.fillRect(P.x[i], P.y[i], sz, sz);
    }
    g.globalAlpha = 1;
    // HUD
    if (s.score !== scoreVal){ scoreVal = s.score; scoreStr = s.score.toLocaleString('tr-TR'); }
    g.font = `700 22px ${theme.display}`; g.textAlign = 'right'; g.textBaseline = 'top';
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillText(scoreStr, W - 13, 13);
    g.fillStyle = night > 0.4 ? theme.fg : '#13202e'; g.fillText(scoreStr, W - 14, 12);
    g.font = `600 13px ${theme.display}`; g.fillStyle = night > 0.4 ? 'rgba(230,233,240,.75)' : 'rgba(19,32,46,.7)';
    g.fillText('PUAN', W - 14, 36);
    g.textAlign = 'left';
    drawSimit(24, 24, 9, 0); g.font = `700 16px ${theme.display}`; g.fillStyle = night > 0.4 ? theme.fg : '#13202e'; g.textBaseline = 'middle';
    g.fillText('× ' + s.simit, 38, 25);
    if (hiStr){ g.font = `600 12px ${theme.display}`; g.fillStyle = night > 0.4 ? 'rgba(230,233,240,.7)' : 'rgba(19,32,46,.65)'; g.fillText(hiStr, 16, 46); }
    if (s.shield > 0){
      g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, W / 2 - 60, 14, 120, 8, 4); g.fill();
      g.fillStyle = theme.accent; rr(g, W / 2 - 60, 14, 120 * (s.shield / 6), 8, 4); g.fill();
      g.font = `600 11px ${theme.display}`; g.textAlign = 'center'; g.fillStyle = night > 0.4 ? theme.fg : '#13202e'; g.fillText('ÇAY KALKANI', W / 2, 32); g.textAlign = 'left';
    }
  }

  function drawSimit(x, y, r, rot){
    g.lineWidth = r * 0.62; g.strokeStyle = '#b8682a'; g.beginPath(); g.arc(x, y, r * 0.72, 0, 6.283); g.stroke();
    g.lineWidth = r * 0.22; g.strokeStyle = '#d98a3a'; g.beginPath(); g.arc(x, y, r * 0.78, 3.6 + rot, 5.6 + rot); g.stroke();
    g.fillStyle = '#fff3d6';
    for (let k = 0; k < 6; k++){ const a = rot + k * 1.047; g.fillRect(x + Math.cos(a) * r * 0.72 - 0.8, y + Math.sin(a) * r * 0.72 - 0.8, 1.6, 1.6); }
  }
  function drawGlass(x, y, sc){
    // ince belli çay bardağı (x: orta, y: taban)
    g.fillStyle = '#c8102e'; g.beginPath(); g.ellipse(x, y - 2, 16 * sc, 4 * sc, 0, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.beginPath(); g.moveTo(x - 10 * sc, y - 42 * sc); g.quadraticCurveTo(x - 11 * sc, y - 28 * sc, x - 6 * sc, y - 22 * sc); g.quadraticCurveTo(x - 9 * sc, y - 10 * sc, x - 7 * sc, y - 4 * sc);
    g.lineTo(x + 7 * sc, y - 4 * sc); g.quadraticCurveTo(x + 9 * sc, y - 10 * sc, x + 6 * sc, y - 22 * sc); g.quadraticCurveTo(x + 11 * sc, y - 28 * sc, x + 10 * sc, y - 42 * sc); g.closePath(); g.fill();
    g.fillStyle = '#b3260f';
    g.beginPath(); g.moveTo(x - 9.5 * sc, y - 34 * sc); g.quadraticCurveTo(x - 10 * sc, y - 27 * sc, x - 5.5 * sc, y - 22 * sc); g.quadraticCurveTo(x - 8 * sc, y - 10 * sc, x - 6.5 * sc, y - 5 * sc);
    g.lineTo(x + 6.5 * sc, y - 5 * sc); g.quadraticCurveTo(x + 8 * sc, y - 10 * sc, x + 5.5 * sc, y - 22 * sc); g.quadraticCurveTo(x + 10 * sc, y - 27 * sc, x + 9.5 * sc, y - 34 * sc); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x - 7 * sc, y - 38 * sc, 2 * sc, 12 * sc);
  }

  function drawObs(o){
    const x = o.x, base = GY - o.y, top = base - o.h, n = KINDS[o.k][0];
    if (n === 'koni'){
      g.fillStyle = '#ff7a1a'; g.beginPath(); g.moveTo(x + 10, top); g.lineTo(x + 18, top); g.lineTo(x + 26, base - 4); g.lineTo(x + 2, base - 4); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x + 7.6, top + 12); g.lineTo(x + 20.4, top + 12); g.lineTo(x + 22, top + 18); g.lineTo(x + 6, top + 18); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x + 4.8, top + 24); g.lineTo(x + 23.2, top + 24); g.lineTo(x + 24.6, top + 29); g.lineTo(x + 3.4, top + 29); g.closePath(); g.fill();
      g.fillStyle = '#c4520c'; g.fillRect(x - 1, base - 5, 30, 5);
    } else if (n === 'zar' || n === 'zar2'){
      const cnt = n === 'zar2' ? 2 : 1;
      for (let k = 0; k < cnt; k++){
        const yy = base - 34 - k * 32, xx = x + (k ? 2 : 0);
        g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, xx + 2, yy + 3, 32, 32, 7); g.fill();
        g.fillStyle = '#fbf7ee'; rr(g, xx, yy, 32, 32, 7); g.fill();
        g.fillStyle = '#e4dccb'; g.fillRect(xx + 3, yy + 26, 26, 4);
        g.fillStyle = k ? '#c0392b' : '#1d1f27';
        const f = (o.f + k * 3) % 6 + 1, P2 = [[16, 16]], c = 8, d = 24;
        const pts = f === 1 ? P2 : f === 2 ? [[c, c], [d, d]] : f === 3 ? [[c, c], [16, 16], [d, d]] : f === 4 ? [[c, c], [d, c], [c, d], [d, d]] : f === 5 ? [[c, c], [d, c], [16, 16], [c, d], [d, d]] : [[c, c], [d, c], [c, 16], [d, 16], [c, d], [d, d]];
        for (let q = 0; q < pts.length; q++){ g.beginPath(); g.arc(xx + pts[q][0], yy + pts[q][1], 3.2, 0, 6.283); g.fill(); }
      }
    } else if (n === 'cay'){
      g.fillStyle = '#e6e2da'; g.beginPath(); g.ellipse(x + 12, base - 3, 18, 4, 0, 0, 6.283); g.fill();
      drawGlass(x + 12, base - 2, 1.05);
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; g.beginPath();
      const w = Math.sin(frame * 0.08) * 3; g.moveTo(x + 9, top - 2); g.quadraticCurveTo(x + 5 + w, top - 10, x + 10, top - 18); g.stroke();
    } else if (n === 'tezgah'){
      g.fillStyle = '#c0392b'; rr(g, x, top + 16, 80, 26, 4); g.fill();
      g.fillStyle = '#e74c3c'; g.fillRect(x, top + 16, 80, 6);
      g.fillStyle = 'rgba(200,235,255,.5)'; g.fillRect(x + 6, top + 2, 68, 16);
      g.strokeStyle = '#7f8c8d'; g.lineWidth = 2; g.strokeRect(x + 6, top + 2, 68, 16);
      drawSimit(x + 20, top + 10, 6, 0); drawSimit(x + 40, top + 10, 6, 1); drawSimit(x + 60, top + 10, 6, 2);
      g.fillStyle = '#2c3e50'; g.beginPath(); g.arc(x + 16, base - 6, 6, 0, 6.283); g.arc(x + 64, base - 6, 6, 0, 6.283); g.fill();
      g.fillStyle = '#95a5a6'; g.beginPath(); g.arc(x + 16, base - 6, 2, 0, 6.283); g.arc(x + 64, base - 6, 2, 0, 6.283); g.fill();
      g.fillStyle = '#fff'; g.font = `700 8px ${theme.display}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SİMİT', x + 40, top + 31); g.textAlign = 'left';
    } else if (n === 'kedi'){
      const tw = Math.sin(frame * 0.12 + o.f) * 5;
      g.strokeStyle = '#e08a3c'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x + 36, base - 6); g.quadraticCurveTo(x + 48, base - 12, x + 44 + tw, base - 26); g.stroke(); g.lineCap = 'butt';
      g.fillStyle = '#f0a04b'; g.beginPath(); g.ellipse(x + 24, base - 11, 15, 12, 0, 0, 6.283); g.fill();
      g.beginPath(); g.arc(x + 12, base - 22, 10, 0, 6.283); g.fill();
      g.beginPath(); g.moveTo(x + 3, base - 26); g.lineTo(x + 5, base - 36); g.lineTo(x + 11, base - 30); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x + 13, base - 31); g.lineTo(x + 20, base - 36); g.lineTo(x + 21, base - 26); g.closePath(); g.fill();
      g.fillStyle = '#c86b22'; g.fillRect(x + 22, base - 20, 3, 8); g.fillRect(x + 28, base - 21, 3, 9);
      g.fillStyle = '#1d1f27'; g.fillRect(x + 7, base - 24, 2.4, 3.4); g.fillRect(x + 13, base - 24, 2.4, 3.4);
      g.fillStyle = '#ff8fa3'; g.fillRect(x + 10, base - 20, 2.4, 1.6);
    } else if (n === 'marti'){
      const fl = Math.sin(frame * 0.35 + o.f) * 9, cy = base - 11;
      g.fillStyle = '#c9d1db'; g.beginPath(); g.moveTo(x + 14, cy - 2); g.quadraticCurveTo(x + 22, cy - 14 - fl, x + 36, cy - 10 - fl * 1.4); g.lineTo(x + 26, cy); g.closePath(); g.fill();
      g.fillStyle = '#f7f8fa'; g.beginPath(); g.ellipse(x + 22, cy, 18, 7, 0, 0, 6.283); g.fill();
      g.beginPath(); g.arc(x + 7, cy - 3, 6, 0, 6.283); g.fill();
      g.fillStyle = '#f0a830'; g.beginPath(); g.moveTo(x + 1, cy - 4); g.lineTo(x - 7, cy - 2); g.lineTo(x + 1, cy - 1); g.closePath(); g.fill();
      g.fillStyle = '#1d1f27'; g.fillRect(x + 4, cy - 6, 2, 2);
      g.fillStyle = '#2a2d36'; g.beginPath(); g.moveTo(x + 38, cy - 3); g.lineTo(x + 46, cy - 1); g.lineTo(x + 38, cy + 3); g.closePath(); g.fill();
      g.fillStyle = '#b5bdc8'; g.beginPath(); g.moveTo(x + 16, cy + 1); g.quadraticCurveTo(x + 24, cy + 10 + fl * 0.6, x + 34, cy + 8 + fl); g.lineTo(x + 28, cy + 2); g.closePath(); g.fill();
    }
  }

  function drawItem(it){
    const bob = Math.sin(frame * 0.08 + it.f) * 3, x = it.x, y = GY - it.y + bob;
    if (it.k === 0){ drawSimit(x, y, 11, frame * 0.04 + it.f); }
    else {
      g.globalAlpha = 0.35 + 0.15 * Math.sin(frame * 0.15); g.fillStyle = theme.accent; g.beginPath(); g.arc(x, y - 4, 18, 0, 6.283); g.fill(); g.globalAlpha = 1;
      drawGlass(x, y + 14, 0.8);
    }
  }

  function drawPlayer(){
    const h = s.duck ? K.DUCKH : K.PH, w = s.duck ? K.PW + 8 : K.PW;
    const x = K.PX - (w - K.PW) / 2, base = GY - s.y;
    const run = s.onGround && state === 'run' ? s.dist * 0.045 : 0;
    const bounce = s.onGround && !s.duck ? Math.abs(Math.sin(run)) * 2.5 : 0;
    const top = base - h - bounce - 5;
    // gölge
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(K.PX + K.PW / 2, GY + 2, Math.max(6, 16 - s.y * 0.06), 3.5, 0, 0, 6.283); g.fill();
    // bacaklar
    g.strokeStyle = '#1d1f27'; g.lineWidth = 4; g.lineCap = 'round';
    if (s.onGround){
      const a = Math.sin(run) * 6, b = -a;
      g.beginPath(); g.moveTo(x + w * 0.35, base - 6 - bounce); g.lineTo(x + w * 0.35 + a, base - 1); g.moveTo(x + w * 0.65, base - 6 - bounce); g.lineTo(x + w * 0.65 + b, base - 1); g.stroke();
    } else {
      g.beginPath(); g.moveTo(x + w * 0.35, base - 6); g.lineTo(x + w * 0.28, base - 2); g.moveTo(x + w * 0.65, base - 6); g.lineTo(x + w * 0.74, base - 3); g.stroke();
    }
    g.lineCap = 'butt';
    // gövde (oyun kolu maskotu)
    const bh = h - 2;
    g.fillStyle = theme.accent; rr(g, x, top, w, bh, Math.min(14, bh / 2)); g.fill();
    g.fillStyle = 'rgba(255,255,255,.28)'; rr(g, x + 3, top + 2, w - 6, Math.max(4, bh * 0.28), 6); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 4, top + bh - 5, w - 8, 3);
    // kulaklar/kollar (tutamaklar)
    g.fillStyle = theme.accent; g.beginPath(); g.arc(x + 2, top + bh * 0.7, 5, 0, 6.283); g.arc(x + w - 2, top + bh * 0.7, 5, 0, 6.283); g.fill();
    // yüz
    const ey = top + (s.duck ? bh * 0.42 : bh * 0.36), blink = (frame % 200) < 6;
    g.fillStyle = '#fff';
    if (!blink){ g.beginPath(); g.arc(x + w * 0.36, ey, 4.2, 0, 6.283); g.arc(x + w * 0.7, ey, 4.2, 0, 6.283); g.fill(); g.fillStyle = '#10141c'; g.beginPath(); g.arc(x + w * 0.39, ey + 0.5, 2.1, 0, 6.283); g.arc(x + w * 0.73, ey + 0.5, 2.1, 0, 6.283); g.fill(); }
    else { g.fillRect(x + w * 0.28, ey, 7, 1.6); g.fillRect(x + w * 0.62, ey, 7, 1.6); }
    // d-pad ve düğme
    if (!s.duck){
      const dy = top + bh * 0.68;
      g.fillStyle = theme.ink; g.fillRect(x + w * 0.2, dy - 1.2, 8, 2.4); g.fillRect(x + w * 0.2 + 2.8, dy - 4, 2.4, 8);
      g.fillStyle = '#ff6b8a'; g.beginPath(); g.arc(x + w * 0.74, dy - 1, 2.2, 0, 6.283); g.fill();
      g.fillStyle = '#ffd166'; g.beginPath(); g.arc(x + w * 0.62, dy + 2, 2.2, 0, 6.283); g.fill();
    }
    // anten dalgaları
    g.strokeStyle = theme.accent; g.lineWidth = 2; g.beginPath(); g.arc(x + w * 0.7, top + 2, 6, -1.2, -0.2); g.stroke();
    if (s.shield > 0){
      const a = s.shield < 1.5 ? (frame % 10 < 5 ? 0.25 : 0.6) : 0.55;
      g.globalAlpha = a; g.strokeStyle = theme.accent; g.lineWidth = 2.5; g.beginPath(); g.arc(K.PX + K.PW / 2, base - h / 2 - 4, 30, 0, 6.283); g.stroke();
      g.globalAlpha = a * 0.25; g.fillStyle = theme.accent; g.fill(); g.globalAlpha = 1;
    }
  }

  // ----- döngü -----
  function tick(now){
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now;
    frame++;
    if (state === 'run'){
      acc += dt;
      while (acc >= K.STEP && state === 'run'){
        inp.held = keyHeld || ptrDown;
        inp.down = keyDown || swipeDown || duckHeld;
        step(s, K.STEP, inp);
        inp.press = false;
        acc -= K.STEP;
        const pxm = s.speed * K.STEP;
        groundOff += pxm; midOff += pxm * 0.55; cityOff += pxm * 0.18; cloudOff += pxm * 0.06;
        handleEvents();
        if (s.dead) gameOver();
      }
      if (s.onGround && !s.duck && frame % 6 === 0) emit(K.PX + 4, GY - 3, -40 - Math.random() * 40, -20 - Math.random() * 20, 0.35, 0);
    } else if (state === 'ready'){
      groundOff += 1.2; midOff += 0.6; cityOff += 0.2; cloudOff += 0.1;
    }
    for (let i = 0; i < NP; i++){
      if (P.life[i] <= 0) continue;
      P.life[i] -= dt; P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.vy[i] += 300 * dt;
    }
    draw();
  }

  function handleEvents(){
    const e = s.ev; if (!e) return;
    if (e & EV.JUMP) snd('jump');
    if (e & EV.DJ){ snd('dj'); for (let i = 0; i < 6; i++) emit(K.PX + K.PW / 2, GY - s.y, (Math.random() - 0.5) * 160, 40 + Math.random() * 60, 0.4, 2); }
    if (e & EV.LAND) for (let i = 0; i < 5; i++) emit(K.PX + K.PW / 2, GY - 2, (Math.random() - 0.5) * 140, -40 - Math.random() * 60, 0.35, 0);
    if (e & EV.SIMIT){ snd('simit'); for (let i = 0; i < 8; i++) emit(K.PX + K.PW, GY - s.y - 20, (Math.random() - 0.3) * 200, (Math.random() - 0.7) * 200, 0.5, 1); }
    if (e & EV.CAY){ snd('cay'); for (let i = 0; i < 12; i++) emit(K.PX + K.PW / 2, GY - s.y - 20, (Math.random() - 0.5) * 240, (Math.random() - 0.7) * 220, 0.6, 2); }
    if (e & EV.SHIELD){ snd('shield'); for (let i = 0; i < 16; i++) emit(K.PX + K.PW, GY - s.y - 20, Math.random() * 260, (Math.random() - 0.6) * 260, 0.6, 2); }
  }

  function showOv(html){ ov.innerHTML = html; ov.hidden = !html; }
  function startRun(){
    readTheme(); skyGrad = null;
    s = newState((Math.random() * 4294967296) >>> 0, W);
    finished = false; acc = 0; inp.press = false; scoreVal = -1;
    state = 'run'; showOv('');
    wrap.classList.add('playing');
  }
  function gameOver(){
    state = 'over'; overAt = performance.now();
    wrap.classList.remove('playing');
    snd('hit');
    for (let i = 0; i < 18; i++) emit(K.PX + K.PW / 2, GY - s.y - 20, (Math.random() - 0.5) * 300, (Math.random() - 0.8) * 300, 0.7, 2);
    showOv(`<div class="kosu-card kosu-over"><b>Çarptın!</b><span class="kosu-big">${s.score.toLocaleString('tr-TR')} puan</span><small>${s.simit} simit · ${Math.round(s.dist / 10).toLocaleString('tr-TR')} m</small><button type="button" class="btn small primary kosu-again">Tekrar (Boşluk)</button></div>`);
    const b = ov.querySelector('.kosu-again'); if (b) b.onclick = ev => { ev.stopPropagation(); if (canRestart()) startRun(); };
    if (!finished){
      finished = true;
      const best = Math.max(s.score, parseInt(hiStr.replace(/\D/g, ''), 10) || 0);
      hiStr = 'EN İYİ ' + best.toLocaleString('tr-TR');
      try { ctx.finish({ score: s.score, detail: { ms: Math.round(s.t * 1000), distance: Math.round(s.dist), simit: s.simit } }); } catch(e){}
    }
  }
  const canRestart = () => performance.now() - overAt > 600;
  function pause(){
    if (state !== 'run') return;
    state = 'pause'; wrap.classList.remove('playing');
    showOv('<div class="kosu-card"><b>Duraklatıldı</b><small>Devam için <kbd>P</kbd> / boşluk ya da dokun</small></div>');
  }
  function resume(){ if (state !== 'pause') return; state = 'run'; acc = 0; last = performance.now(); showOv(''); wrap.classList.add('playing'); }
  function ready(){
    state = 'ready';
    showOv('<div class="kosu-card kosu-start"><b>Engel Koşusu</b><small>Konilerin, zarların, çay bardaklarının üstünden atla; martıların altından eğil. Simitleri topla, çay kalkan verir.</small><span class="kosu-go">Başlamak için <kbd>Boşluk</kbd> / dokun</span></div>');
  }

  // ----- girdi -----
  const typing = e => { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
  const visible = () => wrap.isConnected && wrap.offsetParent !== null;
  function onKey(e){
    if (typing(e) || !visible()) return;
    const c = e.code, jumpKey = c === 'Space' || c === 'ArrowUp' || c === 'KeyW', downKey = c === 'ArrowDown' || c === 'KeyS';
    if (!jumpKey && !downKey && c !== 'KeyP' && c !== 'Escape') return;
    if (jumpKey || downKey) e.preventDefault();
    if (e.repeat) return;
    if (c === 'KeyP' || (c === 'Escape' && state === 'run')){ if (state === 'run') pause(); else if (state === 'pause') resume(); return; }
    if (state === 'ready' && jumpKey){ startRun(); return; }
    if (state === 'pause' && jumpKey){ resume(); return; }
    if (state === 'over' && jumpKey){ if (canRestart()) startRun(); return; }
    if (state !== 'run') return;
    if (jumpKey){ inp.press = true; keyHeld = true; }
    if (downKey) keyDown = true;
  }
  function onKeyUp(e){
    const c = e.code;
    if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') keyHeld = false;
    if (c === 'ArrowDown' || c === 'KeyS') keyDown = false;
  }
  function onPDown(e){
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    if (state === 'ready'){ startRun(); return; }
    if (state === 'pause'){ resume(); return; }
    if (state === 'over'){ if (canRestart()) startRun(); return; }
    if (state !== 'run') return;
    ptrId = e.pointerId; ptrDown = true; ptrY = e.clientY; swipeDown = false;
    try { wrap.setPointerCapture(e.pointerId); } catch(err){}
    inp.press = true;
  }
  function onPMove(e){
    if (!ptrDown || e.pointerId !== ptrId) return;
    if (e.clientY - ptrY > 28){ swipeDown = true; ptrDown = false; }
  }
  function onPUp(e){
    if (e.pointerId !== ptrId) return;
    ptrDown = false; swipeDown = false; ptrId = -1;
  }
  duckBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (state === 'run'){ duckHeld = true; try { duckBtn.setPointerCapture(e.pointerId); } catch(err){} } });
  const duckUp = () => { duckHeld = false; };
  duckBtn.addEventListener('pointerup', duckUp); duckBtn.addEventListener('pointercancel', duckUp);
  pauseBtn.addEventListener('pointerdown', e => { e.stopPropagation(); });
  pauseBtn.addEventListener('click', e => { e.stopPropagation(); if (state === 'run') pause(); else if (state === 'pause') resume(); });
  wrap.addEventListener('pointerdown', onPDown);
  wrap.addEventListener('pointermove', onPMove);
  wrap.addEventListener('pointerup', onPUp);
  wrap.addEventListener('pointercancel', onPUp);
  wrap.addEventListener('contextmenu', e => e.preventDefault());
  const onVis = () => { if (document.hidden) pause(); };
  const onBlur = () => pause();
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('blur', onBlur);
  const ro = window.ResizeObserver ? new ResizeObserver(() => resize()) : null;
  if (ro) ro.observe(wrap); else window.addEventListener('resize', resize);

  readTheme(); resize(); ready();
  last = performance.now(); raf = requestAnimationFrame(tick);
  // test kancası
  wrap._kosu = { get state(){ return state; }, get s(){ return s; }, press(){ inp.press = true; }, setHeld(v){ keyHeld = v; }, setDown(v){ keyDown = v; } };

  return {
    destroy(){
      if (destroyed) return; destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      wrap.remove(); help.remove();
    }
  };
}

const def = {
  id: 'kosu', name: 'Engel Koşusu', icon: '🏃',
  desc: 'Zıpla, eğil, simitleri topla. Ne kadar uzağa koşabilirsin?',
  levels: [], daily: false, better: 'high',
  format: v => Number(v).toLocaleString('tr-TR') + ' puan',
  mount
};
if (typeof registerSolo === 'function') registerSolo(def);
else (window.SOLO_PENDING = window.SOLO_PENDING || []).push(def);
})();
