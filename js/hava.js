/* Oyun Odası – Hava durumu modu (Kar, Yağmur, Fırtına, Sonbahar).
   Arayüzün ÜSTÜNE saydam bir tuval (#havafx, z-index:55, pointer-events:none) koyar; tıklamaları asla yakalamaz.
   Kar: taneler yavaşça ekranın altında yığılır ve panellerin üst kenarında küçük kar şapkaları oluşturur.
   Yağmur: havada ince çizgiler + camda büyüyen, birleşen, iz bırakarak süzülen damlalar. Fırtına: daha yoğun, rüzgârlı, şimşekli.
   En çok 30 fps (telefonda 24), çözünürlük ≤ 1.5x, sekme gizliyken durur. Seçim localStorage'da saklanır, açılışta geri yüklenir.
   API: OyunHava.list · OyunHava.set(id, {yogunluk}) · OyunHava.current · OyunHava.yogunluk · OyunHava.saved()
        OyunHava.clear() · OyunHava.pause(bool) · OyunHava.info() */
(function(){
'use strict';
const TAU = Math.PI * 2, R = Math.random;
const rnd = (a, b) => a + (b - a) * R();
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function mk(w, h){ const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
const LS_KEY = 'oyunodasi-hava';
const isMobile = () => Math.min(innerWidth, innerHeight) < 600 || !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){ return false; } };
// yumuşak, tekrarlamayan 1B dalga (kar yığını için)
function waves(){
  const a = [];
  for (let i = 0; i < 4; i++) a.push([rnd(.004, .03) * (i + 1), R() * TAU, 1 / (i + 1.4)]);
  return x => { let v = 0, s = 0; for (const [f, p, m] of a){ v += Math.sin(x * f + p) * m; s += m; } return v / s; };
}
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* ---------- hazır görseller (bir kez çizilir) ---------- */
const SPR = {};
function flakeSprite(){
  if (SPR.flake) return SPR.flake;
  const n = 32, c = mk(n, n), g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.92)'); gr.addColorStop(.6, 'rgba(240,246,255,.42)'); gr.addColorStop(1, 'rgba(230,240,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  return (SPR.flake = c);
}
function bokehSprite(){
  if (SPR.bokeh) return SPR.bokeh;
  const n = 64, c = mk(n, n), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.45, 'rgba(250,252,255,.7)'); gr.addColorStop(.8, 'rgba(240,246,255,.25)'); gr.addColorStop(1, 'rgba(240,246,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  return (SPR.bokeh = c);
}
// altı kollu kar kristali (yakın, iri taneler için)
function crystalSprite(){
  if (SPR.crys) return SPR.crys;
  const n = 64, c = mk(n, n), g = c.getContext('2d'), m = 32;
  g.translate(m, m); g.lineCap = 'round';
  g.shadowColor = 'rgba(200,225,255,.9)'; g.shadowBlur = 4;
  g.strokeStyle = 'rgba(255,255,255,.95)';
  for (let k = 0; k < 6; k++){
    g.save(); g.rotate(k * TAU / 6);
    g.lineWidth = 3.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -26); g.stroke();
    g.lineWidth = 2.2;
    for (const [y, l] of [[-10, 8], [-17, 6.5], [-23, 4]]){ g.beginPath(); g.moveTo(0, y); g.lineTo(-l, y - l * .9); g.moveTo(0, y); g.lineTo(l, y - l * .9); g.stroke(); }
    g.restore();
  }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill();
  return (SPR.crys = c);
}
function glintSprite(){
  if (SPR.glint) return SPR.glint;
  const n = 24, c = mk(n, n), g = c.getContext('2d'), m = 12;
  let gr = g.createRadialGradient(m, m, 0, m, m, m);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(225,240,255,.6)'); gr.addColorStop(1, 'rgba(200,225,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  for (const v of [0, 1]){
    gr = v ? g.createLinearGradient(m, 0, m, n) : g.createLinearGradient(0, m, n, m);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; if (v) g.fillRect(m - .6, 0, 1.2, n); else g.fillRect(0, m - .6, n, 1.2);
  }
  return (SPR.glint = c);
}
// cam üstündeki su damlası: arkayı göremediğimiz için mercek etkisi degradelerle taklit edilir
// (koyu kenar = kırılma, altta parlak hilal = toplanan ışık, sol üstte parlama noktası)
function dropSprite(v){
  const key = 'drop' + v; if (SPR[key]) return SPR[key];
  const n = 72, c = mk(n, n), g = c.getContext('2d'), m = n / 2, r = 30;
  // camdaki temas gölgesi
  let gr = g.createRadialGradient(m + .5, m + 2.5, r * .55, m + .5, m + 2.5, r * 1.12);
  gr.addColorStop(0, 'rgba(0,0,0,.26)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(m + .5, m + 2.5, r * 1.12, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(m, m, r, 0, TAU); g.clip();
  // gövde: ortası hafif aydınlık, kenara doğru koyulaşır
  gr = g.createRadialGradient(m, m + r * .18, r * .05, m, m, r);
  gr.addColorStop(0, 'rgba(205,222,248,.16)'); gr.addColorStop(.55, 'rgba(160,182,220,.12)');
  gr.addColorStop(.8, 'rgba(40,52,78,.26)'); gr.addColorStop(.94, 'rgba(12,16,28,.5)'); gr.addColorStop(1, 'rgba(6,8,16,.62)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  // üst yarı: ters dönmüş koyu görüntü
  gr = g.createLinearGradient(0, m - r, 0, m + r * .2);
  gr.addColorStop(0, 'rgba(4,8,18,.34)'); gr.addColorStop(1, 'rgba(4,8,18,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  // alt hilal: ışığın toplandığı parlak bölge (kenara yapışık, aşağı doğru güçlenen halka)
  const t = mk(n, n), tg = t.getContext('2d');
  gr = tg.createRadialGradient(m, m - r * .22, 0, m, m - r * .22, r * 1.14);
  gr.addColorStop(0, 'rgba(235,245,255,0)'); gr.addColorStop(.62, 'rgba(235,245,255,0)'); gr.addColorStop(.8, 'rgba(238,246,255,.55)');
  gr.addColorStop(.9, 'rgba(250,252,255,.95)'); gr.addColorStop(1, 'rgba(240,248,255,.3)');
  tg.fillStyle = gr; tg.fillRect(0, 0, n, n);
  tg.globalCompositeOperation = 'destination-in';
  gr = tg.createLinearGradient(0, m - r * .1, 0, m + r); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.55, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  tg.fillStyle = gr; tg.fillRect(0, 0, n, n);
  g.globalAlpha = .9 - v * .08; g.drawImage(t, 0, 0); g.globalAlpha = 1;
  // içte yumuşak ışık
  g.save(); g.translate(m, m + r * .45); g.scale(1, .45);
  gr = g.createRadialGradient(0, 0, 0, 0, 0, r * .7);
  gr.addColorStop(0, 'rgba(225,238,255,.28)'); gr.addColorStop(1, 'rgba(225,238,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * .7, 0, TAU); g.fill(); g.restore();
  g.restore();
  // kenar: altta açık, üstte koyu ince çizgi
  g.lineWidth = 1.6;
  gr = g.createLinearGradient(0, m - r, 0, m + r);
  gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(.5, 'rgba(120,140,170,.15)'); gr.addColorStop(1, 'rgba(255,255,255,.4)');
  g.strokeStyle = gr; g.beginPath(); g.arc(m, m, r - .8, 0, TAU); g.stroke();
  // parlama noktası (ışık yukarıdan-soldan)
  g.save(); g.translate(m - r * (.36 + v * .05), m - r * (.42 - v * .04)); g.rotate(-.6);
  gr = g.createRadialGradient(0, 0, 0, 0, 0, r * .24);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.95)'); gr.addColorStop(.75, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.scale(1, .6); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * .24, 0, TAU); g.fill(); g.restore();
  // küçük ikinci yansıma
  g.globalAlpha = .55; g.fillStyle = '#fff'; g.beginPath(); g.arc(m + r * .32, m + r * .02, r * .06, 0, TAU); g.fill();
  return (SPR[key] = c);
}
// küçücük damlacık (2 px altı): sade koyu nokta + parlama
function dotSprite(){
  if (SPR.dot) return SPR.dot;
  const n = 16, c = mk(n, n), g = c.getContext('2d');
  let gr = g.createRadialGradient(8, 8.6, 0, 8, 8.6, 7.5);
  gr.addColorStop(0, 'rgba(210,225,250,.22)'); gr.addColorStop(.65, 'rgba(30,40,60,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  gr = g.createRadialGradient(6, 6, 0, 6, 6, 2.6);
  gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  return (SPR.dot = c);
}
const LEAF_COLS = [['#e2621d', '#a8350f'], ['#f0a12e', '#b8661a'], ['#f4c542', '#c48a1c'], ['#c2391f', '#7e1f12'], ['#9c6a33', '#5e3d1c'], ['#d98a27', '#94431a']];
function leafSprite(k){
  const key = 'leaf' + k; if (SPR[key]) return SPR[key];
  const n = 64, c = mk(n, n), g = c.getContext('2d'), [c1, c2] = LEAF_COLS[k % LEAF_COLS.length], shape = k % 3;
  g.translate(32, 32);
  g.beginPath();
  if (shape === 0){ // akçaağaç
    const P = [[0, -28], [6, -15], [16, -20], [13, -8], [26, -9], [20, 1], [25, 7], [10, 8], [12, 18], [2, 13], [0, 26], [-2, 13], [-12, 18], [-10, 8], [-25, 7], [-20, 1], [-26, -9], [-13, -8], [-16, -20], [-6, -15]];
    g.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i <= P.length; i++){ const a = P[i - 1], b = P[i % P.length]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  } else if (shape === 1){ // uzun yaprak
    g.moveTo(0, -28); g.bezierCurveTo(15, -18, 15, 12, 0, 24); g.bezierCurveTo(-15, 12, -15, -18, 0, -28);
  } else { // yuvarlak
    g.moveTo(0, -24); g.bezierCurveTo(20, -22, 22, 12, 0, 22); g.bezierCurveTo(-22, 12, -20, -22, 0, -24);
  }
  g.closePath();
  const gr = g.createLinearGradient(-20, -24, 20, 24); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(60,25,8,.45)'; g.lineWidth = 1.2; g.stroke();
  g.strokeStyle = 'rgba(255,225,170,.45)'; g.lineWidth = 1.3;
  g.beginPath(); g.moveTo(0, 28); g.lineTo(0, -22);
  for (const y of [-12, -2, 8]){ g.moveTo(0, y + 6); g.lineTo(9, y - 2); g.moveTo(0, y + 6); g.lineTo(-9, y - 2); }
  g.stroke();
  g.strokeStyle = 'rgba(80,40,10,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 22); g.lineTo(0, 31); g.stroke();
  return (SPR[key] = c);
}

/* ---------- kar şekli: üst profil + taban ---------- */
function snowPath(g, xs, ys, bx0, bx1, by){
  g.beginPath(); g.moveTo(bx0, by);
  g.lineTo(xs[0], ys[0]);
  for (let i = 1; i < xs.length; i++){ const mx = (xs[i - 1] + xs[i]) / 2, my = (ys[i - 1] + ys[i]) / 2; g.quadraticCurveTo(xs[i - 1], ys[i - 1], mx, my); }
  g.lineTo(xs[xs.length - 1], ys[ys.length - 1]); g.lineTo(bx1, by); g.closePath();
}
function surfPath(g, xs, ys){
  g.beginPath(); g.moveTo(xs[0], ys[0]);
  for (let i = 1; i < xs.length; i++){ const mx = (xs[i - 1] + xs[i]) / 2, my = (ys[i - 1] + ys[i]) / 2; g.quadraticCurveTo(xs[i - 1], ys[i - 1], mx, my); }
  g.lineTo(xs[xs.length - 1], ys[ys.length - 1]);
}
function paintSnow(g, xs, ys, bx0, bx1, by, top, seed, cap){
  const gr = g.createLinearGradient(0, top, 0, by);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, '#f4f8fd'); gr.addColorStop(.8, '#dbe4f1'); gr.addColorStop(1, cap ? '#c9d5e6' : '#c4d0e2');
  snowPath(g, xs, ys, bx0, bx1, by); g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  // yüzeyin hemen altında mavimsi gölge çizgisi → hacim
  g.translate(0, cap ? 1.6 : 2.6); surfPath(g, xs, ys);
  g.strokeStyle = 'rgba(150,172,208,.32)'; g.lineWidth = cap ? 1.6 : 3; g.stroke();
  g.translate(0, cap ? 1.4 : 3); surfPath(g, xs, ys);
  g.strokeStyle = 'rgba(160,182,215,.16)'; g.lineWidth = cap ? 1.4 : 4; g.stroke();
  g.restore();
  // parlak üst kenar
  surfPath(g, xs, ys); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 1.1; g.stroke();
  // ince taneler (her yeniden çizimde aynı yerde dursun diye sabit karma)
  for (let i = 0; i < xs.length; i++){
    const d = by - ys[i]; if (d < 2.5) continue;
    const h1 = hash(i + seed), h2 = hash(i * 3.1 + seed + 7);
    g.fillStyle = h1 < .55 ? 'rgba(255,255,255,.95)' : 'rgba(150,175,215,.4)';
    g.fillRect(xs[i] + h2 * 3, ys[i] + 1 + d * hash(i * 7.3 + seed) * .8, .9, .9);
  }
}

/* =================== KAR =================== */
const CAP_SEL = '.lobby-card, .person, .np, .lib, .make-card, .tcard, .solo-card, .chan-panel .chan.here, .top, footer.bar, .game-shell .gs-bar';
function makeSnow(W, H, o){
  const S = { W, H, yog: o.yog, mob: o.mob, s: o.s, flakes: [], caps: new Map(), chunks: [], glints: [], t: 0, fade: 0, relaxT: 0, dirtyB: true, drawBT: 0 };
  const CS = 4;
  let nb = 0, hb = null, mb = null, tmp = null, strip = null, sg = null, bankBase = 0, stripH = 0, K = 0;
  S.barTop = 0; S.barH = 0;
  function bankLimits(){
    bankBase = clamp(S.H * .052, 18, 46);
    let lim = bankBase;
    if (S.barH > 0) lim = Math.min(lim, Math.max(12, S.barH * .32));
    const wv = S.wv || (S.wv = waves());
    for (let i = 0; i < nb; i++){
      const x = i * CS, e = Math.exp(-x / (S.W * .07)) + Math.exp(-(S.W - x) / (S.W * .07));
      mb[i] = lim * (.7 + .26 * wv(x) + .4 * Math.min(1, e));
    }
    stripH = Math.ceil(bankBase * 1.5 + 6);
  }
  function setupBank(){
    const old = hb, oldN = nb;
    nb = Math.ceil(S.W / CS) + 2; hb = new Float32Array(nb); mb = new Float32Array(nb); tmp = new Float32Array(nb);
    if (old) for (let i = 0; i < nb; i++) hb[i] = old[Math.min(oldN - 1, Math.round(i * (oldN - 1) / (nb - 1)))];
    bankLimits();
    for (let i = 0; i < nb; i++) hb[i] = Math.min(hb[i], mb[i]);
    strip = mk(S.W * S.s, stripH * S.s); sg = strip.getContext('2d'); S.dirtyB = true;
    S.glints = [];
    for (let i = 0; i < Math.round(S.W / 70); i++) S.glints.push({ i: (R() * nb) | 0, ph: R() * TAU, sp: rnd(.6, 1.8), d: rnd(.5, 4) });
  }
  function newFlake(f, init){
    f = f || {};
    const z = R(); f.z = z;
    f.bokeh = z > .93 && R() < .25;
    f.r = f.bokeh ? rnd(6, 10) : .8 + z * z * 3.4 + R() * .5;
    f.crys = !f.bokeh && z > .78 && R() < .3; if (f.crys) f.r = rnd(3.2, 5.2);
    f.vy = (f.bokeh ? 55 : 16 + z * 46) + rnd(-4, 4);
    f.amp = rnd(5, 20) * (.4 + z); f.sw = rnd(.35, 1.2); f.ph = R() * TAU;
    f.a = f.bokeh ? rnd(.3, .5) : .5 + .5 * z;
    f.rot = R() * TAU; f.vr = rnd(-.8, .8);
    f.land = !f.bokeh && z > .42; f.capOk = undefined;
    f.x = R() * (S.W + 120) - 60; f.y = init ? R() * S.H : -f.r * 3 - R() * 60;
    return f;
  }
  function setCount(){
    const n = Math.round(clamp(S.W * S.H / 1e6 * 250 * S.yog * (S.mob ? .85 : 1), 36, 480));
    while (S.flakes.length < n) S.flakes.push(newFlake(null, true));
    S.flakes.length = n;
    // yığılma hızı: yoğunluk 0.6'da ~3 dakikada güzelce birikir; daha yoğun kar daha hızlı
    let lr = 0, r2 = 0, k = 0;
    for (const f of S.flakes) if (f.land){ lr += f.vy / (S.H + 40); r2 += f.r * f.r; k++; }
    r2 = k ? r2 / k : 1; lr = Math.max(.2, lr);
    const T = 150 * Math.pow(.6 / S.yog, .5);
    K = (nb * bankBase * .75 / T) / (lr * r2);
  }
  setupBank(); setCount();
  const KERN = [.05, .12, .2, .26, .2, .12, .05], KB = [];
  for (let k = -6; k <= 6; k++) KB.push(Math.exp(-k * k / 12) / 6.14);
  function depositBank(x, amt){
    const c = Math.round(x / CS);
    for (let k = 0; k < 13; k++){ const i = c + k - 6; if (i < 0 || i >= nb) continue; hb[i] = Math.min(mb[i], hb[i] + amt * KB[k] * rnd(.7, 1.3)); }
    S.dirtyB = true;
  }
  function relax(){
    const sl = 1.15;
    // yumuşatma (yayılma): sivri tepeler yuvarlansın
    for (let i = 1; i < nb - 1; i++) tmp[i] = hb[i] + .09 * (hb[i - 1] + hb[i + 1] - 2 * hb[i]);
    for (let i = 1; i < nb - 1; i++) hb[i] = Math.min(mb[i], tmp[i]);
    for (let p = 0; p < 2; p++){
      for (let j = 0; j < nb - 1; j++){
        const i = p ? nb - 2 - j : j, d = hb[i] - hb[i + 1];
        if (d > sl){ const m = (d - sl) * .35; hb[i] -= m; hb[i + 1] += m; } else if (d < -sl){ const m = (-d - sl) * .35; hb[i] += m; hb[i + 1] -= m; }
      }
    }
    for (const cap of S.caps.values()){
      const h = cap.h, n = h.length, q = cap.tmp || (cap.tmp = new Float32Array(n));
      for (let i = 1; i < n - 1; i++) q[i] = h[i] + .12 * (h[i - 1] + h[i + 1] - 2 * h[i]);
      for (let i = 1; i < n - 1; i++) h[i] = Math.min(cap.m[i], q[i]);
      for (let i = 0; i < n - 1; i++){ const d = h[i] - h[i + 1]; if (Math.abs(d) > .8){ const m = (Math.abs(d) - .8) * .4 * Math.sign(d); h[i] -= m; h[i + 1] += m; } }
      cap.dirty = true;
    }
  }
  /* ----- panel üstü kar şapkaları ----- */
  function capBase(cap, x){ // köşe yuvarlaklığını izleyen taban y'si
    const r = cap.rad, dl = x - cap.left, dr = cap.left + cap.w - x;
    const d = Math.min(dl, dr);
    if (d >= r || r <= 0) return cap.top;
    const q = r - Math.max(0, d); return cap.top + r - Math.sqrt(Math.max(0, r * r - q * q));
  }
  function newCap(el, rc){
    const cs = getComputedStyle(el);
    const rad = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, rc.height / 2, 24);
    const cap = { el, left: rc.left, top: rc.top, w: rc.width, rad, alpha: 0, gone: false, dirty: true, cv: null };
    cap.x0 = rc.left + rad * .42; cap.x1 = rc.left + rc.width - rad * .42;
    const cs3 = 3, n = Math.max(4, Math.ceil((cap.x1 - cap.x0) / cs3) + 1);
    cap.cs = (cap.x1 - cap.x0) / (n - 1); cap.h = new Float32Array(n); cap.m = new Float32Array(n);
    const hm = clamp(rc.width * .035, 4, 10), wv = waves();
    for (let i = 0; i < n; i++){
      const x = i * cap.cs, e = Math.min(x, cap.x1 - cap.x0 - x);
      const k = Math.min(1, e / 22);
      cap.m[i] = hm * (.74 + .26 * wv(x * 1.8)) * (.4 + .6 * Math.sqrt(k * (2 - k)));
    }
    cap.hm = hm;
    return cap;
  }
  function depositCap(cap, x, amt){
    const c = Math.round((x - cap.x0) / cap.cs), n = cap.h.length;
    for (let k = 0; k < 7; k++){ const i = c + k - 3; if (i < 0 || i >= n) continue; cap.h[i] = Math.min(cap.m[i], cap.h[i] + amt * KERN[k] * rnd(.8, 1.2)); }
    cap.dirty = true;
  }
  function dropCap(cap){ // panel kayınca/değişince kar parçalar halinde düşer
    let sum = 0; for (let i = 0; i < cap.h.length; i++) sum += cap.h[i];
    if (sum / cap.h.length > .8){
      const n = Math.min(24, Math.round(sum / 6));
      for (let k = 0; k < n; k++){
        const i = (R() * cap.h.length) | 0;
        S.chunks.push({ x: cap.x0 + i * cap.cs, y: cap.top - cap.h[i] * .5, vx: rnd(-25, 25), vy: rnd(-30, 10), r: rnd(1.2, 3.2), life: 2.5 });
      }
    }
  }
  S.syncCaps = function(list, layout){
    S.barTop = layout.barTop; const bh = layout.barH;
    if (Math.abs(bh - S.barH) > 2){ S.barH = bh; bankLimits(); for (let i = 0; i < nb; i++) hb[i] = Math.min(hb[i], mb[i]); S.dirtyB = true; strip = mk(S.W * S.s, stripH * S.s); sg = strip.getContext('2d'); }
    const seen = new Set();
    for (const { el, rc } of list){
      seen.add(el);
      let cap = S.caps.get(el);
      if (cap && !cap.gone){
        if (Math.abs(rc.width - cap.w) > 1.5){ dropCap(cap); S.caps.delete(el); cap = null; }
        else if (Math.abs(rc.top - cap.top) > .5 || Math.abs(rc.left - cap.left) > .5){
          if (Math.abs(rc.top - cap.top) > 80 || Math.abs(rc.left - cap.left) > 80){ dropCap(cap); S.caps.delete(el); cap = null; }
          else { const dx = rc.left - cap.left; cap.left = rc.left; cap.top = rc.top; cap.x0 += dx; cap.x1 += dx; }
        }
      } else if (cap && cap.gone){ S.caps.delete(el); cap = null; }
      if (!cap) S.caps.set(el, newCap(el, rc));
    }
    for (const [el, cap] of S.caps) if (!seen.has(el) && !cap.gone) cap.gone = true;
  };
  function capTop(cap, x){
    const i = Math.round((x - cap.x0) / cap.cs);
    return capBase(cap, x) - cap.h[clamp(i, 0, cap.h.length - 1)];
  }
  function drawCap(cap){
    const pad = 3, hm = cap.hm * 1.05 + pad, w = cap.x1 - cap.x0 + pad * 2, drop = cap.rad * .25;
    const hgt = hm + drop + 3;
    if (!cap.cv || cap.cv.width !== Math.ceil(w * S.s) || cap.cv.height !== Math.ceil(hgt * S.s)){ cap.cv = mk(w * S.s, hgt * S.s); }
    const g = cap.cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cap.cv.width, cap.cv.height);
    g.setTransform(S.s, 0, 0, S.s, 0, 0);
    const n = cap.h.length, xs = [], ys = [], baseY = hm; // yerel koordinat: x0-pad → 0, panel üstü → hm
    let any = false;
    for (let i = 0; i < n; i++){ const X = cap.x0 + i * cap.cs, by = capBase(cap, X) - cap.top + baseY; xs.push(X - cap.x0 + pad); ys.push(by - cap.h[i]); if (cap.h[i] > .4) any = true; }
    cap.any = any; cap.dirty = false;
    if (!any) return;
    // uçlarda yuvarlak taşma (dudak)
    const hl = cap.h[0], hr = cap.h[n - 1];
    const bl = capBase(cap, cap.x0) - cap.top + baseY, br = capBase(cap, cap.x1) - cap.top + baseY;
    xs.unshift(pad - hl * .35, pad - hl * .55); ys.unshift(bl - hl * .55, bl + hl * .15);
    xs.push(xs[xs.length - 1] + hr * .35, xs[xs.length - 1] + hr * .55); ys.push(br - hr * .55, br + hr * .15);
    // panel üstünde temas gölgesi
    g.save(); g.translate(0, 1.2); snowPath(g, xs, ys, xs[0], xs[xs.length - 1], baseY + 1); g.fillStyle = 'rgba(0,0,0,.22)'; g.fill(); g.restore();
    paintSnow(g, xs, ys, xs[0], xs[xs.length - 1], baseY + .8, baseY - cap.hm, cap.left | 0, true);
    cap.ox = cap.x0 - pad; cap.oy = cap.top - baseY; cap.cw = w; cap.chh = hgt;
  }
  function drawBank(){
    const g = sg; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, strip.width, strip.height);
    S.dirtyB = false;
    let any = false; for (let i = 0; i < nb; i++) if (hb[i] > .5){ any = true; break; }
    S.bankAny = any; if (!any) return;
    g.setTransform(S.s, 0, 0, S.s, 0, 0);
    const xs = new Array(nb), ys = new Array(nb);
    for (let i = 0; i < nb; i++){ xs[i] = i * CS; ys[i] = stripH - hb[i]; }
    // üst kenarda yumuşak hale
    g.save(); g.translate(0, -1.5); g.globalAlpha = .25; snowPath(g, xs, ys, 0, S.W, stripH); g.fillStyle = '#eaf2ff'; g.fill(); g.restore();
    paintSnow(g, xs, ys, 0, S.W, stripH + 1, stripH - bankBase * 1.3, 11, false);
  }
  S.update = function(dt, t){
    S.t = t;
    const W2 = S.W, H2 = S.H;
    const wind = 14 * Math.sin(t * .05) + 9 * Math.sin(t * .13 + 1.3) + 5 * Math.sin(t * .37);
    S.wind = wind;
    const capArr = [];
    for (const c of S.caps.values()) if (!c.gone) capArr.push(c);
    for (const f of S.flakes){
      const py = f.y;
      f.x += (wind * (.35 + .65 * f.z) + Math.cos(t * f.sw + f.ph) * f.amp * f.sw) * dt;
      f.y += f.vy * dt; f.rot += f.vr * dt;
      if (f.x < -80) f.x += W2 + 140; else if (f.x > W2 + 80) f.x -= W2 + 140;
      if (f.land && S.fade <= 0){
        let hit = false;
        for (const c of capArr){
          if (f.x < c.x0 || f.x > c.x1) continue;
          const yt = capTop(c, f.x);
          if (py <= yt && f.y + f.r * .3 >= yt && (f.capOk === undefined ? (f.capOk = R() < .45) : f.capOk)){ depositCap(c, f.x, K * f.r * f.r * (c.hm / bankBase) * 1.7); hit = true; break; }
        }
        if (!hit && f.x >= 0 && f.x < W2){
          const i = Math.round(f.x / CS);
          if (f.y + f.r * .3 >= H2 - hb[i]){ depositBank(f.x, K * f.r * f.r); hit = true; }
        }
        if (hit){ newFlake(f, false); continue; }
      }
      if (f.y - f.r > H2 + 4) newFlake(f, false);
    }
    for (let i = S.chunks.length - 1; i >= 0; i--){
      const c = S.chunks[i]; c.vy += 700 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.life -= dt;
      const bi = Math.round(c.x / CS);
      if (c.x >= 0 && c.x < W2 && c.y >= H2 - hb[bi]){ depositBank(c.x, c.r * c.r * 1.2); S.chunks.splice(i, 1); }
      else if (c.life <= 0 || c.y > H2 + 10) S.chunks.splice(i, 1);
    }
    for (const [el, c] of S.caps){
      if (c.gone){ c.alpha -= dt * 3; if (c.alpha <= 0) S.caps.delete(el); }
      else c.alpha = Math.min(1, c.alpha + dt * 3);
    }
    S.relaxT += dt; if (S.relaxT > .25){ S.relaxT = 0; relax(); S.dirtyB = true; }
    if (S.fade > 0){ S.fade -= dt / .7; if (S.fade <= 0){ S.fade = 0; hb.fill(0); for (const c of S.caps.values()){ c.h.fill(0); c.dirty = true; } S.chunks.length = 0; S.dirtyB = true; } }
  };
  S.draw = function(g, t){
    const s = S.s;
    // birikmiş kar (önbellekli; en çok ~3 kez/sn yeniden çizilir)
    S.drawBT -= 1;
    if (S.drawBT <= 0){
      if (S.dirtyB){ drawBank(); }
      for (const c of S.caps.values()) if (c.dirty) drawCap(c);
      S.drawBT = 8;
    }
    const fa = S.fade > 0 ? S.fade : 1;
    for (const c of S.caps.values()){
      if (!c.any || !c.cv) continue;
      g.globalAlpha = c.alpha * fa; g.drawImage(c.cv, c.ox, c.oy, c.cw, c.chh);
    }
    if (S.bankAny){
      // alt denetim çubuğunun düğmeleri görünür kalsın diye çubuk üstünde biraz saydam
      g.globalAlpha = (S.barH > 0 ? .82 : .97) * fa;
      g.drawImage(strip, 0, S.H - stripH, S.W, stripH);
      // pırıltılar
      const gs = glintSprite();
      for (const q of S.glints){
        const hv = hb[q.i]; if (hv < 3) continue;
        const k = Math.sin(t * q.sp + q.ph); if (k < .55) continue;
        const a = Math.pow((k - .55) / .45, 3) * fa, sz = 7 * a + 2;
        g.globalAlpha = a; g.drawImage(gs, q.i * CS - sz / 2, S.H - hv + q.d - sz / 2, sz, sz);
      }
    }
    // taneler
    const fs = flakeSprite(), bs = bokehSprite(), cs = crystalSprite();
    for (const f of S.flakes){
      if (f.y < -f.r * 2 || f.y > S.H + f.r * 2) continue;
      g.globalAlpha = f.a;
      if (f.crys){
        const c = Math.cos(f.rot), sn = Math.sin(f.rot), d = f.r;
        g.setTransform(c * s, sn * s, -sn * s, c * s, f.x * s, f.y * s); g.drawImage(cs, -d, -d, d * 2, d * 2); g.setTransform(s, 0, 0, s, 0, 0);
      } else { const d = f.bokeh ? f.r : f.r * 1.15; g.drawImage(f.bokeh ? bs : fs, f.x - d, f.y - d, d * 2, d * 2); }
    }
    g.globalAlpha = 1; g.fillStyle = '#f4f8ff';
    for (const c of S.chunks){ g.beginPath(); g.arc(c.x, c.y, c.r, 0, TAU); g.fill(); }
  };
  S.resize = function(W3, H3, s3){ S.W = W3; S.H = H3; S.s = s3; setupBank(); setCount(); for (const c of S.caps.values()) c.cv = null, c.dirty = true; };
  S.setYog = function(y){ S.yog = y; setCount(); };
  S.clear = function(){ S.fade = 1; };
  S.wantsCaps = true;
  S.stats = () => {
    let sum = 0, mx = 0; for (let i = 0; i < nb; i++){ sum += hb[i]; mx = Math.max(mx, hb[i]); }
    let cm = 0; for (const c of S.caps.values()) for (let i = 0; i < c.h.length; i++) cm = Math.max(cm, c.h[i]);
    return { flakes: S.flakes.length, bankAvg: +(sum / nb).toFixed(1), bankMax: +mx.toFixed(1), bankLimit: +bankBase.toFixed(1), caps: S.caps.size, capMax: +cm.toFixed(1) };
  };
  return S;
}

/* =================== YAĞMUR / FIRTINA =================== */
function makeRain(W, H, o){
  const storm = !!o.storm;
  const S = { W, H, yog: o.yog, mob: o.mob, s: o.s, streaks: [], drops: [], trails: [], spawnAcc: 0, flash: 0, flashT: rnd(5, 12), t: 0, fade: 0 };
  const GC = 26;
  let grid = new Map();
  const rMove = o.mob ? 4.6 : 5.4;
  function setCount(){
    const area = S.W * S.H / 1e6;
    const n = Math.round(clamp(area * (storm ? 230 : 95) * S.yog * (S.mob ? .6 : 1), 12, 520));
    while (S.streaks.length < n) S.streaks.push(newStreak({}, true));
    S.streaks.length = n;
    S.spawnRate = area * (storm ? 150 : 80) * S.yog * (S.mob ? .7 : 1);
    S.maxDrops = Math.round(area * (storm ? 520 : 400) * (.5 + .5 * S.yog) * (S.mob ? .7 : 1));
  }
  function newStreak(q, init){
    q.z = R(); q.v = 950 + 800 * q.z; q.len = (12 + 26 * q.z) * (storm ? 1.35 : 1);
    q.x = R() * (S.W + 400) - 200; q.y = init ? R() * S.H : -q.len - R() * 200;
    return q;
  }
  setCount();
  const key = (cx, cy) => cx * 4096 + cy;
  function rebuildGrid(){
    grid = new Map();
    for (const d of S.drops){ const k = key((d.x / GC) | 0, (d.y / GC) | 0); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(d); }
  }
  function near(x, y, fn){
    const cx = (x / GC) | 0, cy = (y / GC) | 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++){ const a = grid.get(key(cx + i, cy + j)); if (a) for (const d of a) if (fn(d) === false) return; }
  }
  const vol = r => r * r * r;
  function merge(a, b){ // b, a'ya katılır
    const va = vol(a.r), vb = vol(b.r), v = va + vb;
    a.x = (a.x * va + b.x * vb) / v; a.y = (a.y * va + b.y * vb) / v; a.r = Math.cbrt(v); b.dead = true;
    a.life = Math.max(a.life, b.life);
  }
  function newDrop(x, y, r){
    return { x, y, r, v: 0, vx: 0, stall: 0, mv: false, life: rnd(25, 70), trail: null, acc: 0, nextRes: rnd(6, 14), sv: (R() * 3) | 0, dead: false };
  }
  function spawn(){
    const big = R() < (storm ? .16 : .12);
    const r = big ? rnd(3.8, 6.4) : .8 + Math.pow(R(), 1.6) * 3.6;
    const d = newDrop(R() * S.W, R() * S.H * 1.02 - S.H * .02, r);
    let host = null;
    near(d.x, d.y, o2 => { if (!o2.dead && Math.hypot(o2.x - d.x, o2.y - d.y) < (o2.r + d.r) * .9){ host = o2; return false; } });
    if (host){ merge(host, d); return; }
    if (S.drops.length >= S.maxDrops){ // cam doluysa rastgele bir küçük damlayı buharlaştır
      const v = S.drops[(R() * S.drops.length) | 0]; if (!v.mv && v.r < 2.5) v.dead = true; else return;
    }
    S.drops.push(d);
    const k = key((d.x / GC) | 0, (d.y / GC) | 0); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(d);
  }
  S.update = function(dt, t){
    S.t = t;
    const wind = storm ? .3 + .1 * Math.sin(t * .4) + .06 * Math.sin(t * 1.7) : .1 + .04 * Math.sin(t * .3);
    S.ang = wind;
    const sx = Math.sin(wind), sy = Math.cos(wind);
    for (const q of S.streaks){
      q.x += sx * q.v * dt; q.y += sy * q.v * dt;
      if (q.y > S.H + q.len) newStreak(q, false);
      if (q.x > S.W + 200) q.x -= S.W + 400;
    }
    // camda yeni damlacıklar
    S.spawnAcc += S.spawnRate * dt * (S.fade > 0 ? 0 : 1);
    while (S.spawnAcc >= 1){ S.spawnAcc--; spawn(); }
    // süzülen damlalar
    const lateral = storm ? 9 : 0;
    for (const d of S.drops){
      if (d.dead) continue;
      if (!d.mv){
        d.life -= dt;
        if (d.life < 0){ d.r -= dt * .6; if (d.r < .4) d.dead = true; }
        if (d.r >= rMove){ d.mv = true; d.v = 8; d.trail = { pts: [d.x, d.y - d.r * .5, t, d.r * .55], end: 0 }; S.trails.push(d.trail); }
        continue;
      }
      if (d.stall > 0){ d.stall -= dt; d.v *= .5; }
      else {
        const target = 26 + (d.r - rMove * .7) * 34;
        d.v += (target - d.v) * Math.min(1, dt * 2.6);
        if (R() < dt * (1.4 - Math.min(1, d.r / 14))) d.stall = rnd(.06, .5) * rMove / d.r;
      }
      d.vx += (R() - .5) * 220 * dt; d.vx *= Math.pow(.05, dt);
      const vxx = clamp(d.vx, -.35 * d.v, .35 * d.v) + lateral * (d.v / 60);
      const ox = d.x, oy = d.y;
      d.x += vxx * dt; d.y += d.v * dt;
      const moved = Math.hypot(d.x - ox, d.y - oy);
      // yolundaki damlacıkları topla
      near(d.x, d.y, o2 => {
        if (o2 === d || o2.dead) return;
        if (Math.hypot(o2.x - d.x, o2.y - d.y) < (o2.r + d.r) * .82){
          const ix = d.x, iy = d.y; merge(d, o2);
          if (o2.mv && o2.trail) o2.trail.end = t;
          d.x = ix * .7 + d.x * .3; d.y = Math.max(iy, d.y);
        }
      });
      // geride minik damlacık bırak, biraz küçül
      d.acc += moved;
      if (d.acc > d.nextRes){
        d.acc = 0; d.nextRes = rnd(5, 16);
        if (R() < .55){
          const rr = rnd(.5, 1.25) * Math.min(1.3, d.r / 6), v = vol(d.r) - vol(rr);
          if (v > 0){ d.r = Math.cbrt(v); if (S.drops.length < S.maxDrops * 1.25){ const q = newDrop(d.x + rnd(-1, 1) * d.r * .3, d.y - d.r * 1.1, rr); q.life = rnd(5, 16); S.drops.push(q); } }
        } else d.r = Math.cbrt(Math.max(.1, vol(d.r) * .992));
      }
      const tr = d.trail;
      if (tr){
        const p = tr.pts, lx = p[p.length - 4], ly = p[p.length - 3];
        if (Math.hypot(d.x - lx, d.y - ly) > 4) p.push(d.x, d.y - d.r * .5, t, d.r * .55);
      }
      if (d.r < rMove * .62){ d.mv = false; d.v = 0; d.life = rnd(10, 30); if (tr) tr.end = t; d.trail = null; }
      if (d.y - d.r > S.H + 4){ d.dead = true; if (tr) tr.end = t; }
    }
    let j = 0;
    for (const d of S.drops){ if (!d.dead) S.drops[j++] = d; else if (d.drawn) S.erase.push(d); }
    S.drops.length = j;
    rebuildGrid();
    // izler zamanla kurur
    const TL = storm ? 5 : 7.5;
    for (let i = S.trails.length - 1; i >= 0; i--){
      const p = S.trails[i].pts;
      let k = 0; while (k < p.length - 4 && t - p[k + 2] > TL) k += 4;
      if (k){ p.splice(0, k); if (S.trails[i].dn) S.trails[i].dn = Math.max(0, S.trails[i].dn - k); }
      if (p.length <= 4 && t - p[2] > TL) S.trails.splice(i, 1);
    }
    // şimşek
    if (storm){
      S.flashT -= dt;
      if (S.flashT <= 0){ S.flashT = rnd(6, 16); if (!reduced() && S.fade <= 0) S.flash = 1e-6; }
      if (S.flash > 0){ S.flash += dt; if (S.flash > .9) S.flash = 0; }
    }
    if (S.fade > 0){ S.fade -= dt / .6; if (S.fade <= 0){ S.fade = 0; S.drops.length = 0; S.trails.length = 0; grid = new Map(); S.full = true; } }
  };
  // katmanlar: [0] ıslak izler (3 karede bir), [1] duran damlalar (yalnız değişenler), ana tuval: kayan damlalar + yağmur + şimşek
  S.extra = 2; S.fc = 0; S.full = true; S.erase = [];
  S.attach = function(cvs){ S.tc = cvs[0]; S.tg = S.tc.getContext('2d'); S.tc.style.opacity = '.2'; S.dc = cvs[1]; S.dg = S.dc.getContext('2d'); S.full = true; S.fc = 0; };
  const bb = d => (d.r < 1.7 ? d.r * 2.1 : d.r * 1.2) + 1.5;
  function drawStatic(g, d){
    if (d.r < 1.7){ const q = d.r * 2.1; g.drawImage(dotSprite(), d.x - q, d.y - q, q * 2, q * 2); }
    else { const q = d.r * 1.2; g.drawImage(dropSprite(d.sv), d.x - q, d.y - q, q * 2, q * 2); }
    d.drawn = true; d.dx = d.x; d.dy = d.y; d.db = bb(d); d.dr = d.r;
  }
  function eraseAt(g, x, y, b){
    g.clearRect(x - b, y - b, b * 2, b * 2);
    near(x, y, o2 => { if (o2.drawn && Math.abs(o2.dx - x) < b + o2.db && Math.abs(o2.dy - y) < b + o2.db) o2.drawn = false; });
  }
  // ıslak izler: her yeni parça bir kez, opak renkle çizilir (tuval CSS ile saydam → üst üste binmeler koyulaşmaz);
  // tüm tuval birkaç karede bir hafifçe silinerek kurur
  function drawTrails(g, t, fa){
    g.setTransform(S.s, 0, 0, S.s, 0, 0);
    if (S.full){ g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S.tc.width, S.tc.height); g.setTransform(S.s, 0, 0, S.s, 0, 0); for (const tr of S.trails) tr.dn = Math.max(0, tr.pts.length - 8); }
    if (S.fc % 6 === 0 || S.fade > 0){
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = 'rgba(0,0,0,' + (S.fade > 0 ? .3 : storm ? .1 : .07) + ')'; g.fillRect(0, 0, S.W, S.H);
      g.globalCompositeOperation = 'source-over';
    }
    if (S.fade > 0) return;
    g.lineCap = 'butt'; g.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++){
      g.strokeStyle = pass ? 'rgb(215,230,252)' : 'rgb(0,6,16)';
      for (const tr of S.trails){
        const p = tr.pts, from = Math.max(0, (tr.dn || 0) - 4);
        if (p.length - from < 8) continue;
        g.beginPath(); g.moveTo(p[from], p[from + 1]);
        for (let q = from + 4; q < p.length; q += 4) g.lineTo(p[q], p[q + 1]);
        const w = p[p.length - 1];
        g.lineWidth = pass ? w * .55 : w * 1.25 + .8; g.stroke();
      }
    }
    for (const tr of S.trails) tr.dn = tr.pts.length;
  }
  S.draw = function(g, t){
    const fa = S.fade > 0 ? S.fade : 1;
    S.fc++;
    if (S.tg) drawTrails(S.tg, t, fa);
    if (S.dg){
      const dg = S.dg;
      if (S.full || S.fc % 45 === 0 || S.fade > 0){
        dg.setTransform(1, 0, 0, 1, 0, 0); dg.clearRect(0, 0, S.dc.width, S.dc.height); dg.setTransform(S.s, 0, 0, S.s, 0, 0);
        dg.globalAlpha = fa;
        for (const d of S.drops) if (!d.mv) drawStatic(dg, d); else d.drawn = false;
        dg.globalAlpha = 1; S.erase.length = 0; S.full = false;
      } else {
        dg.setTransform(S.s, 0, 0, S.s, 0, 0);
        for (const e of S.erase) eraseAt(dg, e.dx, e.dy, e.db);
        S.erase.length = 0;
        for (const d of S.drops){
          if (d.mv){ if (d.drawn){ d.drawn = false; eraseAt(dg, d.dx, d.dy, d.db); } continue; }
          if (d.drawn && (Math.abs(d.dr - d.r) > .25 || d.dx !== d.x || d.dy !== d.y)) eraseAt(dg, d.dx, d.dy, d.db);
        }
        for (const d of S.drops) if (!d.mv && !d.drawn) drawStatic(dg, d);
      }
    }
    // havadaki yağmur: iki derinlik katmanı, tek yol çizimi
    const sx = Math.sin(S.ang || 0), sy = Math.cos(S.ang || 0);
    g.lineCap = 'butt';
    for (const [lo, hi, a, lw] of [[0, .6, storm ? .16 : .13, .8], [.6, 1.01, storm ? .26 : .2, 1.15]]){
      g.beginPath();
      for (const q of S.streaks){ if (q.z < lo || q.z >= hi) continue; g.moveTo(q.x, q.y); g.lineTo(q.x - sx * q.len, q.y - sy * q.len); }
      g.strokeStyle = 'rgba(200,214,235,' + a + ')'; g.lineWidth = lw; g.stroke();
    }
    // kayan damlalar (her karede)
    g.globalAlpha = fa;
    for (const d of S.drops){
      if (!d.mv && S.dg) continue;
      if (!d.mv){ drawStatic(g, d); continue; }
      const sp = dropSprite(d.sv), el = 1 + Math.min(.32, d.v / 260), wr = d.r / Math.sqrt(el) * 1.2;
      g.drawImage(sp, d.x - wr, d.y - d.r * el * 1.2 + (el - 1) * d.r * .3, wr * 2, d.r * el * 2.4);
    }
    g.globalAlpha = 1;
    if (S.flash > 0){
      const f = S.flash, a = f < .06 ? f / .06 * .5 : f < .14 ? .5 - (f - .06) / .08 * .42 : f < .22 ? .08 + (f - .14) / .08 * .3 : Math.max(0, .38 * (1 - (f - .22) / .6));
      g.fillStyle = 'rgba(225,232,255,' + (a * .55).toFixed(3) + ')'; g.fillRect(0, 0, S.W, S.H);
    }
  };
  S.resize = function(W3, H3, s3){ S.W = W3; S.H = H3; S.s = s3; setCount(); S.drops = S.drops.filter(d => d.x < W3 && d.y < H3); rebuildGrid(); S.full = true; };
  S.setYog = function(y){ S.yog = y; setCount(); };
  S.clear = function(){ S.fade = 1; };
  S.stats = () => ({ streaks: S.streaks.length, drops: S.drops.length, moving: S.drops.filter(d => d.mv).length, trails: S.trails.length });
  return S;
}

/* =================== SONBAHAR =================== */
function makeLeaves(W, H, o){
  const S = { W, H, yog: o.yog, mob: o.mob, s: o.s, leaves: [], landed: [], fade: 0 };
  function newLeaf(l, init){
    l.z = R(); l.k = (R() * 18) | 0; l.sz = (13 + R() * 11) * (.55 + .65 * l.z) * (S.mob ? .85 : 1);
    l.vy = rnd(28, 52) * (.6 + .5 * l.z); l.amp = rnd(20, 55); l.sw = rnd(.5, 1.3); l.ph = R() * TAU;
    l.rot = R() * TAU; l.vr = rnd(-1.6, 1.6); l.ff = rnd(1.2, 3.4); l.fp = R() * TAU; l.a = .55 + .45 * l.z;
    l.x = R() * (S.W + 100) - 50; l.y = init ? R() * S.H : -40 - R() * 120;
    return l;
  }
  function setCount(){
    const n = Math.round(clamp(S.W * S.H / 1e6 * 34 * S.yog * (S.mob ? .7 : 1), 5, 60));
    while (S.leaves.length < n) S.leaves.push(newLeaf({}, true));
    S.leaves.length = n;
  }
  setCount();
  S.update = function(dt, t){
    const wind = 18 * Math.sin(t * .09) + 10 * Math.sin(t * .23 + 2);
    for (const l of S.leaves){
      l.x += (wind * (.4 + .6 * l.z) + Math.cos(t * l.sw + l.ph) * l.amp * l.sw) * dt;
      l.y += l.vy * (.75 + .25 * Math.sin(t * l.sw * 2 + l.ph)) * dt; l.rot += l.vr * dt;
      if (l.x < -60) l.x += S.W + 120; else if (l.x > S.W + 60) l.x -= S.W + 120;
      if (l.z > .55 && S.fade <= 0 && l.y > S.H - l.sz * .3 && S.landed.length < 36){
        S.landed.push({ x: l.x, y: S.H - rnd(1, l.sz * .4), k: l.k, sz: l.sz, rot: rnd(-.6, .6) + (R() < .5 ? Math.PI / 2 : -Math.PI / 2), fx: rnd(.5, 1) * (R() < .5 ? -1 : 1), age: 0, life: rnd(20, 40) });
        newLeaf(l, false);
      } else if (l.y > S.H + 40) newLeaf(l, false);
    }
    for (let i = S.landed.length - 1; i >= 0; i--){ const q = S.landed[i]; q.age += dt; if (q.age > q.life) S.landed.splice(i, 1); }
    if (S.fade > 0){ S.fade -= dt / .6; if (S.fade <= 0){ S.fade = 0; S.landed.length = 0; } }
  };
  function leaf(g, x, y, sz, rot, fx, k){
    const s = S.s, c = Math.cos(rot), sn = Math.sin(rot);
    g.setTransform(c * fx * s, sn * fx * s, -sn * s, c * s, x * s, y * s);
    g.drawImage(leafSprite(k), -sz, -sz, sz * 2, sz * 2);
  }
  S.draw = function(g, t){
    const fa = S.fade > 0 ? S.fade : 1;
    for (const q of S.landed){ g.globalAlpha = Math.min(1, (q.life - q.age) / 3) * fa * .95; leaf(g, q.x, q.y, q.sz, q.rot, q.fx, q.k); }
    for (const l of S.leaves){
      if (l.y < -40 || l.y > S.H + 40) continue;
      let fx = Math.cos(t * l.ff + l.fp); if (Math.abs(fx) < .12) fx = fx < 0 ? -.12 : .12;
      g.globalAlpha = l.a; leaf(g, l.x, l.y, l.sz, l.rot, fx, l.k);
    }
    g.setTransform(S.s, 0, 0, S.s, 0, 0); g.globalAlpha = 1;
  };
  S.resize = function(W3, H3, s3){ S.W = W3; S.H = H3; S.s = s3; setCount(); };
  S.setYog = function(y){ S.yog = y; setCount(); };
  S.clear = function(){ S.fade = 1; };
  S.stats = () => ({ leaves: S.leaves.length, landed: S.landed.length });
  return S;
}

const MODES = {
  kar: { name: 'Kar', icon: '❄️', desc: 'Lapa lapa kar; yavaş yavaş ekranın altında ve panellerin üstünde birikir.', make: makeSnow },
  yagmur: { name: 'Yağmur', icon: '🌧️', desc: 'Ekran camında büyüyüp süzülen damlalar.', make: makeRain },
  firtina: { name: 'Fırtına', icon: '⛈️', desc: 'Rüzgârlı sağanak ve ara sıra şimşek.', make: (W, H, o) => makeRain(W, H, Object.assign({ storm: true }, o)) },
  yaprak: { name: 'Sonbahar', icon: '🍂', desc: 'Rüzgârda savrulan sonbahar yaprakları.', make: makeLeaves }
};

/* =================== çerçeve =================== */
const st = { id: null, yog: .6, layers: [], raf: 0, last: 0, time: 0, paused: false, fps: 30, s: 1, W: 0, H: 0, ms: [], frames: 0, qT: 0, qNeed: true };
function sizeInfo(){
  const W = Math.max(1, innerWidth), H = Math.max(1, innerHeight), mob = isMobile();
  let s = Math.min(window.devicePixelRatio || 1, mob ? 1.25 : 1.5);
  s = Math.min(s, Math.sqrt(2.4e6 / (W * H)));   // çok büyük ekranlarda piksel sayısını sınırla
  return { W, H, s: Math.max(.5, s), mob };
}
function newLayer(id){
  const z = sizeInfo();
  const cv = document.createElement('canvas'); cv.className = 'havafx'; cv.setAttribute('aria-hidden', 'true');
  cv.dataset.hava = id;
  cv.width = Math.round(z.W * z.s); cv.height = Math.round(z.H * z.s);
  // tıklamaları asla yakalamaz; açılır pencereler (top layer) ve bildirimler (z-index 60) bunun üstünde kalır
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:55;pointer-events:none;display:block';
  document.body.appendChild(cv);
  st.W = z.W; st.H = z.H; st.s = z.s; st.fps = z.mob ? 24 : 30; st.mob = z.mob;
  const mode = MODES[id].make(z.W, z.H, { yog: st.yog, mob: z.mob, s: z.s });
  // bazı havalar yavaş değişen kısımları alttaki ayrı tuvallere çizer (her karede yeniden çizilmesin diye)
  const all = [];
  for (let i = 0; i < (mode.extra || 0); i++){
    const c = document.createElement('canvas'); c.className = 'havafx'; c.setAttribute('aria-hidden', 'true'); c.dataset.hava = id;
    c.style.cssText = cv.style.cssText; c.width = cv.width; c.height = cv.height; cv.before(c); all.push(c);
  }
  if (all.length) mode.attach(all);
  all.push(cv);
  return { id, cv, all, g: cv.getContext('2d'), mode, out: 0 };
}
// kar şapkaları için görünür panelleri bul
function queryRects(){
  const W = st.W, H = st.H, out = [];
  let barTop = 0, barH = 0;
  const els = document.querySelectorAll(CAP_SEL);
  for (const el of els){
    if (el.closest('.havafx')) continue;
    const rc = el.getBoundingClientRect();
    if (el.matches('footer.bar') && rc.height > 0 && rc.bottom >= H - 4 && rc.top < H){ barTop = rc.top; barH = H - rc.top; }
    if (rc.width < 70 || rc.height < 26 || rc.top < 16 || rc.top > H - 24 || rc.right < 30 || rc.left > W - 30) continue;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    // üst kenarı başka bir şeyin altında mı? (açık pencere hariç)
    let ok = false;
    for (const fx of [.5, .2, .8]){
      const x = clamp(rc.left + rc.width * fx, 1, W - 1), hit = document.elementFromPoint(x, rc.top + 3);
      if (!hit || hit === el || el.contains(hit) || hit.closest('dialog[open]')){ ok = true; break; }
    }
    if (ok) out.push({ el, rc });
  }
  out.sort((a, b) => b.rc.width - a.rc.width);
  return { list: out.slice(0, 24), layout: { barTop, barH } };
}
function syncCaps(){
  st.qT = 0; st.qNeed = false;
  const L = st.layers.find(l => !l.out && l.mode.wantsCaps);
  if (!L) return;
  const q = queryRects(); L.mode.syncCaps(q.list, q.layout);
}
function step(dt){
  st.time += dt;
  st.qT += dt;
  if (st.qT > 1 || st.qNeed) syncCaps();
  for (let i = st.layers.length - 1; i >= 0; i--){
    const L = st.layers[i];
    L.mode.update(dt, st.time);
    if (L.out){ L.out -= dt; if (L.out <= 0){ for (const c of L.all){ c.width = c.height = 1; c.remove(); } st.layers.splice(i, 1); } }
  }
}
function render(){
  const a = performance.now();
  for (const L of st.layers){
    const g = L.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, L.cv.width, L.cv.height);
    g.setTransform(st.s, 0, 0, st.s, 0, 0);
    L.mode.draw(g, st.time);
  }
  const ms = performance.now() - a; st.ms.push(ms); if (st.ms.length > 120) st.ms.shift(); st.frames++;
}
function frame(now){
  st.raf = 0;
  if (!st.layers.length || st.paused || document.hidden) return;
  st.raf = requestAnimationFrame(frame);
  if (st.last && now - st.last < 1000 / st.fps - 4) return;
  const dt = st.last ? Math.min(.1, (now - st.last) / 1000) : 1 / st.fps;
  st.last = now; step(dt); render();
}
function schedule(){
  if (st.raf){ cancelAnimationFrame(st.raf); st.raf = 0; }
  if (st.layers.length && !st.paused && !document.hidden){ st.last = 0; st.raf = requestAnimationFrame(frame); }
}
function save(){ try { localStorage.setItem(LS_KEY, JSON.stringify({ id: st.id || 'yok', yogunluk: st.yog })); } catch(e){} }
function saved(){ try { const p = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); return p && typeof p === 'object' ? p : null; } catch(e){ return null; } }
function set(id, opts){
  opts = opts || {};
  if (opts.yogunluk !== undefined && isFinite(+opts.yogunluk)) st.yog = clamp(+opts.yogunluk, .2, 1);
  if (!id || !MODES[id]) id = null;
  const cur = st.layers.find(l => !l.out);
  if (cur && cur.id === id){ cur.mode.setYog(st.yog); if (opts.save !== false) save(); return true; }
  // eski hava 1.2 sn'de yumuşakça kaybolur
  if (cur){ cur.out = 1.2; for (const c of cur.all){ c.style.transition = 'opacity 1.2s ease'; c.style.opacity = '0'; } cur.mode.wantsCaps = false; }
  st.id = id;
  if (id){ document.body ? st.layers.push(newLayer(id)) : null; st.qNeed = true; }
  if (id) document.documentElement.dataset.hava = id; else delete document.documentElement.dataset.hava;
  if (opts.save !== false) save();
  schedule();
  return !!id;
}
let rzT = 0;
addEventListener('resize', () => {
  clearTimeout(rzT);
  rzT = setTimeout(() => {
    if (!st.layers.length) return;
    const z = sizeInfo();
    if (z.W === st.W && z.H === st.H && z.s === st.s) return;
    st.W = z.W; st.H = z.H; st.s = z.s; st.fps = z.mob ? 24 : 30; st.mob = z.mob;
    for (const L of st.layers){ for (const c of L.all){ c.width = Math.round(z.W * z.s); c.height = Math.round(z.H * z.s); } L.mode.resize(z.W, z.H, z.s); }
    st.qNeed = true;
  }, 150);
});
// kaydırınca kar şapkaları paneli izlesin
let scT = 0;
addEventListener('scroll', () => { if (scT) return; scT = setTimeout(() => { scT = 0; st.qNeed = true; }, 60); }, { capture: true, passive: true });
document.addEventListener('visibilitychange', schedule);

window.OyunHava = {
  list: [{ id: 'yok', name: 'Yok', icon: '☀️', desc: 'Hava efekti kapalı.' }]
    .concat(Object.keys(MODES).map(id => ({ id, name: MODES[id].name, icon: MODES[id].icon, desc: MODES[id].desc }))),
  set, saved,
  get current(){ return st.id || 'yok'; },
  get yogunluk(){ return st.yog; },
  // birikmiş karı / camdaki damlaları / yerdeki yaprakları temizler
  clear(){ for (const L of st.layers) if (!L.out) L.mode.clear(); },
  pause(v){ st.paused = !!v; schedule(); },
  restore(){
    const p = saved();
    if (p && p.yogunluk !== undefined) st.yog = clamp(+p.yogunluk || .6, .2, 1);
    if (p && p.id && MODES[p.id]) set(p.id, { save: false });
  },
  info(){
    const a = st.ms, avg = a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, L = st.layers.find(l => !l.out);
    return { id: st.id || 'yok', yogunluk: st.yog, running: !!st.raf, paused: st.paused, fps: st.fps, scale: +st.s.toFixed(2), w: L ? L.cv.width : 0, h: L ? L.cv.height : 0,
      avgMs: +avg.toFixed(3), maxMs: +(a.length ? Math.max(...a) : 0).toFixed(3), frames: st.frames, stats: L ? L.mode.stats() : null };
  },
  // test kancaları: zamanı ileri sar (çizmeden simüle et), kare süresi ölç
  _test: {
    fastForward(sec){
      const dt = 1 / 15; let q = 0;
      syncCaps();
      for (let t = 0; t < sec; t += dt){ step(dt); q += dt; if (q >= 1){ q = 0; syncCaps(); } }
      for (const L of st.layers){ if (L.mode.drawBT !== undefined) L.mode.drawBT = 0; }
      render();
      return window.OyunHava.info();
    },
    bench(n, flush){
      if (!st.layers.length) return null;
      const out = [];
      for (let i = 0; i < (n || 120); i++){
        const a = performance.now(); step(1 / 30); render();
        if (flush) for (const L of st.layers) for (const c of L.all) c.getContext('2d').getImageData(0, 0, 1, 1);
        out.push(performance.now() - a);
      }
      out.sort((x, y) => x - y);
      return { avg: +(out.reduce((x, y) => x + y, 0) / out.length).toFixed(3), p95: +out[Math.floor(out.length * .95)].toFixed(3), max: +out[out.length - 1].toFixed(3) };
    }
  }
};
if (document.body) window.OyunHava.restore(); else document.addEventListener('DOMContentLoaded', () => window.OyunHava.restore());
})();
