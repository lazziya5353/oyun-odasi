/* Oyun Odası – hareketli sayfa arka planları (Galaksi, Samanyolu, Kayan yıldızlar, İstanbul gecesi,
   Cyberpunk şehir, Kuzey ışıkları, Gece okyanusu). Hepsi canvas'a kodla çizilir; dış görsel yok.
   Sabit katmanlar (gökyüzü, siluetler, dağlar, yıldızlar) bir kez ekran dışı canvas'a çizilir; her karede
   yalnız ucuz parçalar güncellenir. En çok 30 fps (telefonda 24), iç çözünürlük ≤ 1, sekme gizliyken durur.
   API: OyunBG.list · OyunBG.set(id|null, {animate, dim}) · OyunBG.thumb(id, canvas) · OyunBG.pause(bool) · OyunBG.info() */
(function(){
'use strict';
const TAU = Math.PI * 2, R = Math.random;
const rnd = (a, b) => a + (b - a) * R();
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function gauss(){ let a = 0, b = 0; while (!a) a = R(); while (!b) b = R(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(TAU * b); }
function mk(w, h){ const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
const c2 = c => c.getContext('2d');
const pick = a => a[(R() * a.length) | 0];

/* ---------- ortak yardımcılar ---------- */
const SPR = new Map();
// yumuşak ışık lekesi (s), yıldız (h) ya da ışık çizgili yıldız (x); renk 'r,g,b'
function glow(rgb, kind){
  const key = rgb + kind; let c = SPR.get(key); if (c) return c;
  const n = 64, r = n / 2; c = mk(n, n); const g = c2(c);
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  const st = kind === 's' ? [[0, 1], [.2, .62], [.45, .24], [.7, .07], [1, 0]]
    : [[0, 1], [.1, .9], [.22, .35], [.45, .08], [1, 0]];
  st.forEach(([p, a]) => gr.addColorStop(p, 'rgba(' + rgb + ',' + a + ')'));
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  if (kind === 'x'){
    for (const v of [0, 1]){
      const lg = v ? g.createLinearGradient(r, 0, r, n) : g.createLinearGradient(0, r, n, r);
      lg.addColorStop(0, 'rgba(' + rgb + ',0)'); lg.addColorStop(.5, 'rgba(' + rgb + ',.8)'); lg.addColorStop(1, 'rgba(' + rgb + ',0)');
      g.fillStyle = lg; if (v) g.fillRect(r - .7, 0, 1.4, n); else g.fillRect(0, r - .7, n, 1.4);
    }
  }
  SPR.set(key, c); return c;
}
function sprite(g, s, x, y, rx, ry, a){ g.globalAlpha = a; g.drawImage(s, x - rx, y - ry, rx * 2, ry * 2); }
function hsl(h, s, l){
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return f(0) + ',' + f(8) + ',' + f(4);
}
let NOISE = null;
// koyu degradelerde bantlaşmayı kırmak için hafif gren
function dither(g, w, h, a){
  if (!NOISE){
    NOISE = mk(128, 128); const q = c2(NOISE), d = q.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4){ const v = R() < .5 ? 0 : 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = R() * 255; }
    q.putImageData(d, 0, 0);
  }
  g.save(); g.globalAlpha = a; g.fillStyle = g.createPattern(NOISE, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
}
function vgrad(g, y0, y1, stops){ const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(s => gr.addColorStop(s[0], s[1])); return gr; }
const STAR_COLS = ['255,255,255', '210,225,255', '255,242,225', '185,205,255', '255,225,195', '235,240,255'];
// statik yıldız alanı; o: {u, max, filter(x,y), big}
function stars(g, n, x0, y0, w, h, o){
  o = o || {}; const u = o.u || 1, mx = o.max || 1;
  const buckets = STAR_COLS.map(() => []);
  for (let i = 0; i < n; i++){
    const x = x0 + R() * w, y = y0 + R() * h;
    if (o.filter && !o.filter(x, y)) continue;
    const m = Math.pow(R(), 3.2), ci = (R() * STAR_COLS.length) | 0;
    if (m > .55 && R() < (o.big == null ? .6 : o.big)){ const r = (1.6 + 4.5 * m) * Math.max(.7, u); sprite(g, glow(STAR_COLS[ci], 'h'), x, y, r, r, (.35 + .65 * m) * mx); }
    else buckets[ci].push(x, y, (.12 + .9 * m) * mx, m > .3 ? 1.4 : 1);
  }
  buckets.forEach((b, ci) => {
    g.fillStyle = 'rgb(' + STAR_COLS[ci] + ')';
    for (let k = 0; k < b.length; k += 4){ g.globalAlpha = b[k + 2]; const s = Math.max(.8, b[k + 3] * Math.min(1.3, u)); g.fillRect(b[k], b[k + 1], s, s); }
  });
  g.globalAlpha = 1;
}
// parıldayan yıldızlar (her karede çizilir, az sayıda)
function twinkles(n, x0, y0, w, h, u, filter){
  const a = [];
  for (let i = 0; i < n * 3 && a.length < n; i++){
    const x = x0 + R() * w, y = y0 + R() * h;
    if (filter && !filter(x, y)) continue;
    const big = R() < .14, col = pick(STAR_COLS);
    a.push({ x, y, r: (big ? rnd(5, 9) : rnd(1.6, 3.4)) * Math.max(.6, u), a: big ? rnd(.6, 1) : rnd(.4, .95), sp: rnd(.5, 2.6), ph: R() * TAU, s: glow(col, big ? 'x' : 'h') });
  }
  return a;
}
function drawTw(g, arr, t){
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < arr.length; i++){
    const s = arr[i], k = .5 + .5 * Math.sin(t * s.sp + s.ph);
    g.globalAlpha = s.a * (.18 + .82 * k * k);
    g.drawImage(s.s, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
// kayan yıldız: incelen, parlayan kuyruk
function meteorNew(W, H, u, o){
  const ang = o.ang + rnd(-o.spread, o.spread), sp = rnd(.8, 1.4) * o.speed * u;
  return { x: rnd(o.x0, o.x1) * W, y: rnd(o.y0, o.y1) * H, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
    len: rnd(.6, 1.25) * o.len * u, life: rnd(.55, 1.25) * (o.life || 1), age: 0, w: rnd(.8, 1.4) * o.w * Math.max(.7, u), b: rnd(.65, 1) };
}
function meteorDraw(g, m){
  const p = m.age / m.life; if (p >= 1) return;
  const fade = p < .1 ? p / .1 : Math.pow(1 - (p - .1) / .9, 1.4);
  const sp = Math.hypot(m.vx, m.vy), dx = m.vx / sp, dy = m.vy / sp;
  const L = m.len * Math.min(1, .15 + m.age / .2), hx = m.x, hy = m.y, tx = hx - dx * L, ty = hy - dy * L, nx = -dy, ny = dx;
  g.globalCompositeOperation = 'lighter';
  for (const [wm, am] of [[3.4, .16], [1, .95]]){
    const w = m.w * wm, a = fade * m.b * am, gr = g.createLinearGradient(hx, hy, tx, ty);
    gr.addColorStop(0, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(.18, 'rgba(200,222,255,' + a * .6 + ')');
    gr.addColorStop(.6, 'rgba(140,175,255,' + a * .18 + ')'); gr.addColorStop(1, 'rgba(120,160,255,0)');
    g.fillStyle = gr; g.beginPath();
    g.moveTo(hx + dx * w, hy + dy * w); g.lineTo(hx + nx * w, hy + ny * w); g.lineTo(tx, ty); g.lineTo(hx - nx * w, hy - ny * w); g.closePath(); g.fill();
  }
  const r = m.w * 6; sprite(g, glow('225,238,255', 'h'), hx, hy, r, r, fade * m.b);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function meteorsStep(list, dt, W){
  for (let i = list.length - 1; i >= 0; i--){ const m = list[i]; m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; if (m.age >= m.life || m.x < -W * .3 || m.x > W * 1.3) list.splice(i, 1); }
}
// ay: hale + yumuşak ışık + kraterli disk
function moon(g, x, y, r){
  g.save(); g.globalCompositeOperation = 'lighter';
  sprite(g, glow('110,140,235', 's'), x, y, r * 13, r * 13, .17);
  sprite(g, glow('190,208,255', 's'), x, y, r * 5, r * 5, .3);
  sprite(g, glow('235,240,255', 's'), x, y, r * 2.2, r * 2.2, .35);
  const rg = g.createRadialGradient(x, y, r * 5.6, x, y, r * 6.8);
  rg.addColorStop(0, 'rgba(200,220,255,0)'); rg.addColorStop(.5, 'rgba(205,222,255,.014)'); rg.addColorStop(1, 'rgba(200,220,255,0)');
  g.fillStyle = rg; g.globalAlpha = 1; g.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
  g.restore(); g.save();
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
  const dg = g.createRadialGradient(x - r * .25, y - r * .25, r * .1, x, y, r);
  dg.addColorStop(0, '#fffffa'); dg.addColorStop(.75, '#f4f2ea'); dg.addColorStop(1, '#dcdcd6');
  g.fillStyle = dg; g.fillRect(x - r, y - r, r * 2, r * 2);
  // denizler (maria): geniş, yumuşak ve soluk
  for (const [dx, dy, rx, ry, a] of [[-.28, -.18, .42, .3, .26], [.12, -.34, .3, .2, .22], [.28, .1, .34, .28, .24], [-.08, .3, .26, .2, .2], [.44, -.08, .16, .2, .16], [-.5, .18, .2, .26, .14]])
    sprite(g, glow('150,152,165', 's'), x + dx * r, y + dy * r, rx * r * 1.5, ry * r * 1.5, a);
  for (let i = 0; i < 7; i++){ const a = R() * TAU, d = R() * .8 * r, cr = r * rnd(.04, .09); sprite(g, glow('170,170,180', 's'), x + Math.cos(a) * d, y + Math.sin(a) * d, cr, cr, .35); }
  const lg = g.createRadialGradient(x, y, r * .6, x, y, r);
  lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(60,60,80,.22)');
  g.globalAlpha = 1; g.fillStyle = lg; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; sprite(g, glow('255,255,245', 's'), x, y, r * 1.45, r * 1.45, .28); g.restore();
}
// yumuşak sırt hattı (tepeler): [x0,y0,x1,y1,…]
function ridge(W, y0, amp, rough, step){
  const ph = [R() * TAU, R() * TAU, R() * TAU, R() * TAU], f = [rnd(1, 2), rnd(2.5, 4), rnd(6, 9), rnd(15, 22)], pts = [];
  for (let x = -step; x <= W + step; x += step){
    const k = x / W * Math.PI;
    const y = Math.sin(k * f[0] + ph[0]) * .5 + Math.sin(k * f[1] + ph[1]) * .28 + rough * (Math.sin(k * f[2] + ph[2]) * .14 + Math.sin(k * f[3] + ph[3]) * .06 + (R() - .5) * .04);
    pts.push(x, y0 - (y * .5 + .5) * amp);
  }
  return pts;
}
// sivri dağ sırtı (orta nokta kaydırma)
function peaks(W, yb, hMax, rough, lv){
  const N = (1 << lv) + 1, y = new Float32Array(N);
  y[0] = R() * .5; y[N - 1] = R() * .5;
  for (let step = N - 1, sc = 1; step > 1; step >>= 1, sc *= rough){ const h = step >> 1; for (let i = h; i < N; i += step) y[i] = (y[i - h] + y[i + h]) / 2 + (R() - .5) * sc; }
  let mn = Infinity, mx = -Infinity; for (const v of y){ mn = Math.min(mn, v); mx = Math.max(mx, v); }
  const pts = []; for (let i = 0; i < N; i++) pts.push(i / (N - 1) * W, yb - (y[i] - mn) / (mx - mn || 1) * hMax);
  return pts;
}
function fillPts(g, pts, bottom){
  g.beginPath(); g.moveTo(pts[0], bottom);
  for (let i = 0; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.lineTo(pts[pts.length - 2], bottom); g.closePath(); g.fill();
}
function yAt(pts, x){
  for (let i = 2; i < pts.length; i += 2) if (pts[i] >= x){ const k = (x - pts[i - 2]) / (pts[i] - pts[i - 2] || 1); return pts[i - 1] + (pts[i + 1] - pts[i - 1]) * k; }
  return pts[pts.length - 1];
}
// ladin ağacı silueti
function spruce(g, x, y, h, w){
  const n = 7, rs = [];
  for (let i = 1; i <= n; i++){ const k = i / n, yy = y - h + h * k * .9; rs.push(x + w * .5 * k, yy); if (i < n) rs.push(x + w * .5 * k * .45, yy + h * .03); }
  g.beginPath(); g.moveTo(x, y - h);
  for (let i = 0; i < rs.length; i += 2) g.lineTo(rs[i], rs[i + 1]);
  g.lineTo(x + w * .06, y - h * .1); g.lineTo(x + w * .06, y); g.lineTo(x - w * .06, y); g.lineTo(x - w * .06, y - h * .1);
  for (let i = rs.length - 2; i >= 0; i -= 2) g.lineTo(2 * x - rs[i], rs[i + 1]);
  g.closePath(); g.fill();
}
// değer gürültüsü (2B) ve çok oktavlı fBm — yükleme anında ekran dışı dokular için
function noise2(){
  const P = new Uint16Array(512), V = new Float32Array(256), p = [];
  for (let i = 0; i < 256; i++){ p.push(i); V[i] = R(); }
  for (let i = 255; i > 0; i--){ const j = (R() * (i + 1)) | 0, t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = V[P[X + P[Y]]], b = V[P[X + 1 + P[Y]]], c = V[P[X + P[Y + 1]]], d = V[P[X + 1 + P[Y + 1]]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function fbm(n, x, y, oct){ let s = 0, a = .5, f = 1, nm = 0; for (let i = 0; i < oct; i++){ s += a * n(x * f + i * 17.3, y * f - i * 9.1); nm += a; a *= .5; f *= 2.03; } return s / nm; }
// gerçekçi yıldız renkleri (sıcaklığa göre: mavi-beyazdan kırmızıya) ve parlaklık dağılımı (çoğu sönük, azı parlak)
const STAR_PAL = [['168,190,255', .09], ['212,224,255', .17], ['250,250,255', .25], ['255,244,228', .23], ['255,228,190', .14], ['255,206,156', .08], ['255,182,138', .04]];
function starCol(){ let r = R(); for (const s of STAR_PAL){ if ((r -= s[1]) <= 0) return s[0]; } return STAR_PAL[2][0]; }
function photoStars(g, n, x0, y0, w, h, u, dens, gain){
  const U = Math.max(.6, u), bk = new Map(); gain = gain || 1;
  for (let i = 0; i < n; i++){
    const x = x0 + R() * w, y = y0 + R() * h;
    if (dens && R() > dens(x, y)) continue;
    const m = Math.min(1, .012 / (R() + .012)) * gain, c = starCol();
    if (m > .5){
      const r = (1.6 + 4 * m) * U;
      sprite(g, glow(c, 's'), x, y, r * 3.4, r * 3.4, .08 + .16 * m);
      if (m > .93){ sprite(g, glow(c, 'x'), x, y, r * 2.6, r * 2.6, .7); }
      sprite(g, glow(c, 'h'), x, y, r, r, .6 + .4 * m);
    } else if (m > .08){ const r = (1 + 2.6 * m) * U; sprite(g, glow(c, 'h'), x, y, r, r, .3 + 1.1 * m); }
    else { let b = bk.get(c); if (!b) bk.set(c, b = []); b.push(x, y, .1 + 7 * m); }
  }
  for (const [c, b] of bk){ g.fillStyle = 'rgb(' + c + ')'; for (let k = 0; k < b.length; k += 3){ g.globalAlpha = Math.min(1, b[k + 2]); g.fillRect(Math.round(b[k]), Math.round(b[k + 1]), 1, 1); } }
  g.globalAlpha = 1;
}
// gerçekçi parıltı: yalnız gerçek renkler, az ışınlı yıldız
function photoTwinkles(n, x0, y0, w, h, u, filter){
  const a = [];
  for (let i = 0; i < n * 3 && a.length < n; i++){
    const x = x0 + R() * w, y = y0 + R() * h; if (filter && !filter(x, y)) continue;
    const big = R() < .06, c = starCol();
    a.push({ x, y, r: (big ? rnd(4, 7) : rnd(1.3, 2.8)) * Math.max(.6, u), a: big ? rnd(.5, .8) : rnd(.3, .75), sp: rnd(1.5, 4), ph: R() * TAU, s: glow(c, big ? 'x' : 'h') });
  }
  return a;
}

/* =================== SAHNELER =================== */
// Her sahne: make(W, H, o) → { draw(g, t, dt, still) }   o: {u: ölçek birimi, q: yoğunluk, mobile}

/* ---------- Galaksi (fotoğrafik) ---------- */
function sceneGalaksi(W, H, o){
  const u = o.u, A = W * H / 1.04e6 * o.q, M = Math.max(W, H), m = Math.min(W, H), land = W >= H, U = Math.max(.6, u);
  const bg = mk(W, H), g = c2(bg);
  let gr = g.createRadialGradient(W * .55, H * .5, 0, W * .55, H * .5, Math.hypot(W, H) * .65);
  gr.addColorStop(0, '#07081a'); gr.addColorStop(.5, '#04050f'); gr.addColorStop(1, '#010106');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // çok soluk bulutsu: düşük çözünürlüklü fBm
  { const nb = noise2(), k = Math.min(.25, Math.sqrt(6e4 / (W * H))), nw = Math.ceil(W * k), nh = Math.ceil(H * k), im = new ImageData(nw, nh), D = im.data;
    for (let j = 0; j < nh; j++) for (let i = 0; i < nw; i++){
      const v = fbm(nb, i / k / M * 3.2, j / k / M * 3.2, 5), w = Math.max(0, v - .5) * 2.2, q = (j * nw + i) * 4, hue = fbm(nb, i / k / M * 1.3 + 40, j / k / M * 1.3, 2);
      D[q] = 255 * w * (.35 + .4 * hue) * .45; D[q + 1] = 255 * w * .16; D[q + 2] = 255 * w * (.7 - .3 * hue) * .45; D[q + 3] = 255;
    }
    const nc = mk(nw, nh); c2(nc).putImageData(im, 0, 0); g.globalCompositeOperation = 'lighter'; g.drawImage(nc, 0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
  photoStars(g, 6500 * A, 0, 0, W, H, u);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++){
    const r = rnd(4, 11) * U; g.save(); g.translate(R() * W, R() * H); g.rotate(R() * TAU);
    sprite(g, glow('225,210,255', 's'), 0, 0, r, r * rnd(.25, .5), .35); sprite(g, glow('255,240,220', 'h'), 0, 0, r * .22, r * .13, .55); g.restore();
  }
  g.globalCompositeOperation = 'source-over';

  // disk dokusu: yüzden bakış (logaritmik sarmal kollar + fBm topaklanma + toz şeritleri), sonra eğilip döndürülür
  const Rg = Math.min(M * .44, m * .8), tilt = .42, orient = land ? -.32 : Math.PI / 2 - .32;
  const cx = W * (land ? .57 : .5), cy = H * .5, S = Math.ceil(Rg * 2.1), hS = S / 2;
  const TS = Math.min(S, o.mobile ? 300 : 440), nA = noise2(), nB = noise2(), COT = 2.7, R0 = .05;
  const armPh = (x, y, r, c) => 2 * (Math.atan2(y, x) - COT * Math.log(Math.max(r, .02) / R0)) + (c - .5) * 1.7;
  const tim = new ImageData(TS, TS), T = tim.data;
  for (let j = 0; j < TS; j++) for (let i = 0; i < TS; i++){
    const x = ((i + .5) / TS * 2 - 1) * 1.05, y = ((j + .5) / TS * 2 - 1) * 1.05, r = Math.hypot(x, y), q = (j * TS + i) * 4;
    T[q + 3] = 255; if (r > 1.05) continue;
    const c = fbm(nA, x * 6 + 3, y * 6, 4), c3 = fbm(nB, x * 15, y * 15, 3), ph = armPh(x, y, r, c);
    const arm = Math.pow(.5 + .5 * Math.cos(ph), 2.4), armB = arm * (.3 + 1.4 * c3);
    const dust = Math.pow(.5 + .5 * Math.cos(ph + .6), 7) * clamp((r - .05) * 8, 0, 1) * (.45 + .9 * c3);
    const fade = clamp((1.05 - r) / .3, 0, 1);
    const Ld = Math.exp(-r / .27) * (.16 + 1.6 * armB) * (1 - .82 * dust) * fade;
    const Lb = (1.7 * Math.exp(-Math.pow(r / .05, .85)) + .55 * Math.exp(-r / .11)) * (1 - .45 * dust * clamp((r - .03) * 10, 0, 1));
    const L = Ld + Lb, wa = clamp(armB, 0, 1), tm = 1 - Math.exp(-L * 1.3);
    const cr = (Lb * 255 + Ld * (wa * 150 + (1 - wa) * 238)) / (L || 1), cg = (Lb * 216 + Ld * (wa * 182 + (1 - wa) * 222)) / (L || 1), cb = (Lb * 165 + Ld * (wa * 255 + (1 - wa) * 205)) / (L || 1);
    T[q] = cr * tm; T[q + 1] = cg * tm; T[q + 2] = cb * tm;
  }
  const tc = mk(TS, TS); c2(tc).putImageData(tim, 0, 0);
  const disc = mk(S, S), q = c2(disc);
  q.imageSmoothingQuality = 'high'; q.drawImage(tc, 0, 0, S, S);
  // çözünmüş yıldızlar (kollarda mavi-beyaz), HII bölgeleri (pembe), genç küme parlamaları
  q.translate(hS, hS); q.globalCompositeOperation = 'lighter';
  const NP = Math.round(9000 * clamp(A, .35, 1.4)), cols = ['200,215,255', '235,240,255', '255,245,230', '170,195,255'], bk = cols.map(() => []);
  for (let i = 0, got = 0; i < NP * 6 && got < NP; i++){
    const r = Math.pow(R(), .75), th = R() * TAU, x = Math.cos(th) * r, y = Math.sin(th) * r;
    const arm = Math.pow(.5 + .5 * Math.cos(armPh(x, y, r, fbm(nA, x * 6 + 3, y * 6, 4))), 2.4);
    if (R() > arm * (r > .12 ? 1 : .3)) continue; got++;
    bk[(R() * cols.length) | 0].push(x * Rg / 1.05 * 1.05, y * Rg, rnd(.25, .9));
  }
  bk.forEach((b, k) => { q.fillStyle = 'rgb(' + cols[k] + ')'; for (let i = 0; i < b.length; i += 3){ q.globalAlpha = b[i + 2]; q.fillRect(b[i], b[i + 1], 1.1 * U, 1.1 * U); } });
  for (let i = 0, got = 0; i < 4000 && got < 110 * clamp(A, .4, 1.3); i++){
    const r = rnd(.2, .9), th = R() * TAU, x = Math.cos(th) * r, y = Math.sin(th) * r;
    const arm = Math.pow(.5 + .5 * Math.cos(armPh(x, y, r, fbm(nA, x * 6 + 3, y * 6, 4))), 3); if (arm < .75) continue; got++;
    if (R() < .6){ const rr = rnd(1.5, 4.5) * U; sprite(q, glow('255,90,165', 's'), x * Rg, y * Rg, rr * 1.8, rr * 1.8, .45); sprite(q, glow('255,160,200', 'h'), x * Rg, y * Rg, rr * .5, rr * .5, .6); }
    else { const rr = rnd(1.2, 2.6) * U; sprite(q, glow('175,200,255', 'h'), x * Rg, y * Rg, rr, rr, .8); }
  }
  q.globalAlpha = 1;
  // çekirdek parlaması ve ince ışın çizgileri (ekran düzleminde, dönmez)
  const coreR = Rg * .3;
  g.save(); g.translate(cx, cy); g.rotate(orient); g.globalCompositeOperation = 'lighter';
  sprite(g, glow('255,200,140', 's'), 0, 0, coreR * 2.2, coreR * 1.1, .28);
  sprite(g, glow('255,226,180', 's'), 0, 0, coreR * .8, coreR * .55, .45);
  g.restore();
  g.save(); g.translate(cx, cy); g.globalCompositeOperation = 'lighter';
  for (const a of [0, Math.PI / 2]){ g.save(); g.rotate(a + .2); const lg = g.createLinearGradient(-coreR * .8, 0, coreR * .8, 0); lg.addColorStop(0, 'rgba(255,240,220,0)'); lg.addColorStop(.5, 'rgba(255,240,220,.14)'); lg.addColorStop(1, 'rgba(255,240,220,0)'); g.fillStyle = lg; g.fillRect(-coreR * .8, -.5 * U, coreR * 1.6, 1 * U); g.restore(); }
  g.restore();
  dither(g, W, H, .03);
  const tw = photoTwinkles(110 * clamp(A, .25, 1.5), 0, 0, W, H, u);
  const cache = mk(W, H), cg = c2(cache); let lastA = NaN; const thr = 1 / Rg;
  function compose(c, a){
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.drawImage(bg, 0, 0);
    c.save(); c.translate(cx, cy); c.rotate(orient); c.scale(1, tilt); c.globalCompositeOperation = 'lighter';
    c.rotate(a); c.drawImage(disc, -hS, -hS);
    c.restore();
    c.save(); c.translate(cx, cy); c.rotate(orient); c.globalCompositeOperation = 'lighter';
    sprite(c, glow('255,250,238', 'h'), 0, 0, coreR * .26, coreR * .2, .95);
    c.restore();
  }
  return { draw(c, t){
    const a = -t * .01;
    if (!(Math.abs(a - lastA) < thr)){ lastA = a; compose(cg, a); }
    c.drawImage(cache, 0, 0);
    drawTw(c, tw, t);
  } };
}

/* ---------- Samanyolu (fotoğrafik) ---------- */
function sceneSamanyolu(W, H, o){
  const u = o.u, A = W * H / 1.04e6 * o.q, land = W >= H, m = Math.min(W, H), U = Math.max(.6, u);
  const MG = .12, SW = Math.ceil(W * (1 + 2 * MG)), SH = Math.ceil(H * (1 + 2 * MG)), ox = W * MG, oy = H * MG;
  const yh = H * (land ? .8 : .84);
  const sky = mk(SW, SH), g = c2(sky);
  g.fillStyle = vgrad(g, 0, SH, [[0, '#010207'], [.45, '#02050d'], [.72, '#050a17'], [.86, '#0a1220'], [1, '#121a26']]);
  g.fillRect(0, 0, SW, SH);
  // galaktik kuşak: düşük çözünürlükte, piksel piksel (bulut yapısı + toz şeritleri + Büyük Yarık)
  const P0 = land ? [-.05 * SW, .98 * SH] : [-.25 * SW, .86 * SH], P1 = land ? [1.05 * SW, -.04 * SH] : [1.25 * SW, .08 * SH];
  const dx = P1[0] - P0[0], dy = P1[1] - P0[1], Lb = Math.hypot(dx, dy), ux = dx / Lb, uy = dy / Lb, M2 = Math.max(SW, SH) * (land ? 1 : .8);
  const n1 = noise2(), n2 = noise2(), n3 = noise2(), sc = 1 / (m * .085);
  const k = Math.min(.5, Math.sqrt((o.mobile ? 1.2e5 : 2.4e5) / (SW * SH))), nw = Math.ceil(SW * k), nh = Math.ceil(SH * k);
  const BR = new Float32Array(nw * nh), DU = new Float32Array(nw * nh), im = new ImageData(nw, nh), D = im.data;
  for (let j = 0; j < nh; j++) for (let i = 0; i < nw; i++){
    const idx = j * nw + i; D[idx * 4 + 3] = 255;
    const X = i / k, Y = j / k, rx = X - P0[0], ry = Y - P0[1], t = (rx * ux + ry * uy) / Lb, d = -rx * uy + ry * ux;
    const core = Math.exp(-Math.pow((t - .36) / .12, 2)), w = (.042 + .05 * core) * M2;
    const dd = (d - (n3(t * 6, .5) - .5) * w * .8) / w, prof = Math.exp(-dd * dd * 1.4);
    if (prof < .003) continue;
    const nx = X * sc, ny = Y * sc, cl = fbm(n1, nx, ny, 6), gr = n1(nx * 9 + 50, ny * 9);
    let b = prof * (.25 + 1.3 * Math.pow(cl, 1.6)) * (.7 + .55 * gr) * (.45 + 1.15 * core) * (.35 + .65 * Math.pow(Math.sin(Math.PI * clamp(t, 0, 1)), .5));
    // toz: bulut kümeleri (fBm eşiği) + merkez çizgisi boyunca kırık kenarlı Büyük Yarık
    const rn = fbm(n2, nx * 2.3 + 7, ny * 2.3, 6), rf = 1 - Math.abs(fbm(n3, nx * 3 + 2, ny * 3, 5) * 2 - 1), clump = clamp((rn - .53) / .1, 0, 1) * .8 + Math.pow(rf, 9) * .5;
    const rift = Math.exp(-Math.pow((dd - .15 * Math.sin(t * 7) + (rn - .5) * 1.4) / .26, 2)) * clamp((t - .12) * 5, 0, 1) * clamp((.72 - t) * 5, 0, 1);
    const du = clamp(clump * clump * Math.exp(-dd * dd * .9) * .9 + rift * (.55 + .5 * clump), 0, 1) * .92;
    b *= 1 - du * .9; BR[idx] = b; DU[idx] = du;
    const wm = clamp(core * 1.15 * prof + du * .35, 0, 1), tb = 1 - Math.exp(-b * 1.5);
    D[idx * 4] = (188 + 67 * wm) * tb; D[idx * 4 + 1] = (198 + 6 * wm - 30 * wm * wm) * tb; D[idx * 4 + 2] = (235 - 110 * wm) * tb;
  }
  const bc = mk(nw, nh); c2(bc).putImageData(im, 0, 0);
  g.globalCompositeOperation = 'lighter'; g.imageSmoothingQuality = 'high';
  g.drawImage(bc, 0, 0, SW, SH);
  const bl = mk(nw / 5, nh / 5); c2(bl).drawImage(bc, 0, 0, bl.width, bl.height);
  g.globalAlpha = .28; g.drawImage(bl, 0, 0, SW, SH); g.globalAlpha = 1;
  // çekirdek çevresinde pembe bulutsular (Lagün, Trifid benzeri)
  for (let i = 0; i < 9; i++){ const t = rnd(.3, .44), off = gauss() * .25 * (.042 + .05) * M2, x = P0[0] + dx * t - uy * off, y = P0[1] + dy * t + ux * off, r = rnd(3, 8) * U; sprite(g, glow('255,95,140', 's'), x, y, r * 2, r * 2, .35); }
  g.globalCompositeOperation = 'source-over';
  // yıldızlar: genel alan + kuşakta yoğun (tozda gizlenir)
  const dens = (x, y) => { const q = clamp((y * k) | 0, 0, nh - 1) * nw + clamp((x * k) | 0, 0, nw - 1); return clamp(BR[q] * 1.3, 0, 1) * (1 - DU[q] * .85); };
  photoStars(g, 7000 * A, 0, 0, SW, SH, u);
  photoStars(g, 90000 * A, 0, 0, SW, SH, u, dens, .7);
  dither(g, SW, SH, .028);
  // ufuk: hava ışıması (airglow), uzak ışık kubbesi, tepeler ve ağaçlar
  const hz = mk(W, H), h = c2(hz);
  h.fillStyle = vgrad(h, yh - H * .3, yh + 2, [[0, 'rgba(70,150,100,0)'], [.6, 'rgba(80,160,110,.05)'], [.9, 'rgba(120,170,120,.1)'], [1, 'rgba(170,170,130,.16)']]);
  h.fillRect(0, yh - H * .3, W, H * .3 + 4);
  h.globalCompositeOperation = 'lighter'; sprite(h, glow('255,150,80', 's'), W * .78, yh, W * .3, H * .1, .1); h.globalCompositeOperation = 'source-over'; h.globalAlpha = 1;
  const far = ridge(W, yh - H * .015, H * .07, .7, 6 * U);
  h.fillStyle = vgrad(h, yh - H * .09, H, [[0, '#0d1220'], [1, '#05070d']]); fillPts(h, far, H);
  const near = ridge(W, yh + H * .05, H * .07, 1, 5 * U);
  h.fillStyle = '#010205'; fillPts(h, near, H);
  for (let x = 0; x < W; x += rnd(3, 16) * U){
    if (R() < .35) continue; const y = yAt(near, x) + 2, th = rnd(14, 38) * Math.max(.45, u) * (R() < .1 ? 1.6 : 1);
    spruce(h, x, y, th, th * rnd(.32, .42));
  }
  const tw = photoTwinkles(160 * clamp(A, .25, 1.5), 0, 0, SW, SH * .85, u);
  const met = []; let next = 6;
  const mo = { ang: land ? .55 : 1.0, spread: .3, speed: 700, len: 150, w: .9, x0: .1, x1: .8, y0: .02, y1: .4 };
  const px = W * .5, py = H * 1.35, hzTop = Math.max(0, Math.floor(yh - H * .3));
  const cache = mk(W, H), cg = c2(cache); let lastAng = NaN;
  const thr = .3 / Math.hypot(W, H * 1.35);
  return { draw(c, t, dt, still){
    const ang = Math.sin(t * .012) * .03;
    if (!(Math.abs(ang - lastAng) < thr)){ lastAng = ang; cg.setTransform(1, 0, 0, 1, 0, 0); cg.translate(px, py); cg.rotate(ang); cg.translate(-px - ox, -py - oy); cg.drawImage(sky, 0, 0); }
    c.drawImage(cache, 0, 0);
    c.save(); c.translate(px, py); c.rotate(lastAng); c.translate(-px - ox, -py - oy); drawTw(c, tw, t); c.restore();
    if (still){ if (!met.length){ const s = meteorNew(W, H, u, mo); s.age = s.life * .3; s.b = .6; met.push(s); } }
    else { next -= dt; if (next <= 0){ met.push(meteorNew(W, H, u, mo)); next = rnd(8, 20); } meteorsStep(met, dt, W); }
    met.forEach(mm => meteorDraw(c, mm));
    c.drawImage(hz, 0, hzTop, W, H - hzTop, 0, hzTop, W, H - hzTop);
  } };
}

/* ---------- Kayan yıldızlar ---------- */
function sceneKayan(W, H, o){
  const u = o.u, A = W * H / 1.04e6 * o.q, land = W >= H, m = Math.min(W, H);
  const bg = mk(W, H), g = c2(bg);
  g.fillStyle = vgrad(g, 0, H, [[0, '#01030f'], [.45, '#05113a'], [.8, '#0b2160'], [1, '#132f70']]); g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 24; i++){ const r = rnd(.12, .35) * Math.max(W, H); sprite(g, glow(pick(['50,80,200', '80,60,190', '40,110,200']), 's'), R() * W, R() * H * .8, r, r * .5, rnd(.02, .045)); }
  g.globalCompositeOperation = 'source-over';
  stars(g, 1700 * A, 0, 0, W, H * .92, { u, max: .75 });
  stars(g, 420 * A, 0, 0, W, H * .85, { u, big: .9 });
  const mx = W * (land ? .8 : .72), my = H * (land ? .2 : .13), mr = Math.max(7, m * .045);
  moon(g, mx, my, mr);
  // uzak tepeler
  g.fillStyle = vgrad(g, H * .82, H, [[0, '#071339'], [1, '#030818']]);
  fillPts(g, ridge(W, H * .93, H * .09, .6, 6 * Math.max(.5, u)), H);
  g.fillStyle = '#02040d'; fillPts(g, ridge(W, H * .99, H * .06, .9, 5 * Math.max(.5, u)), H);
  dither(g, W, H, .035);
  // ince bulutlar (yavaşça kayar, sarmalı)
  const cy0 = H * (land ? .28 : .2), ch = H * .38, cl = mk(W, ch), q = c2(cl);
  for (let i = 0; i < 60; i++){
    const x = R() * W, y = ch * (.2 + .6 * R()), rx = W * rnd(.05, .14), ry = rx * rnd(.06, .14), a = rnd(.05, .11);
    for (const xx of [x - W, x, x + W]) sprite(q, glow(pick(['130,150,205', '150,165,215', '110,130,190']), 's'), xx, y, rx, ry, a);
  }
  q.globalAlpha = 1;
  const tw = twinkles(200 * clamp(A, .25, 1.5), 0, 0, W, H * .85, u);
  const met = []; let next = 1;
  const mo = { ang: land ? .5 : .9, spread: .22, speed: 950, len: 260, w: 1.35, x0: -.1, x1: .75, y0: -.02, y1: .45 };
  return { draw(c, t, dt, still){
    c.drawImage(bg, 0, 0);
    const off = Math.round(t * W * .006) % W;
    c.drawImage(cl, 0, 0, W - off, ch, off, cy0, W - off, ch);
    if (off > 0) c.drawImage(cl, W - off, 0, off, ch, 0, cy0, off, ch);
    drawTw(c, tw, t);
    if (still){ if (!met.length) for (const p of [.35, .55]){ const s = meteorNew(W, H, u, mo); s.age = s.life * p; met.push(s); } }
    else {
      next -= dt;
      if (next <= 0 && met.length < 4){ met.push(meteorNew(W, H, u, mo)); next = R() < .2 ? rnd(.15, .4) : rnd(.7, 2.6); }
      meteorsStep(met, dt, W);
    }
    met.forEach(mm => meteorDraw(c, mm));
  } };
}

/* ---------- İstanbul gecesi ---------- */
function minaret(g, x, by, h, s, lights){
  const w = 3.2 * s;
  g.fillRect(x - w / 2, by - h, w, h);
  g.fillRect(x - w * .9, by - h * .6, w * 1.8, 1.6 * s);
  g.fillRect(x - w * .9, by - h * .8, w * 1.8, 1.6 * s);
  g.beginPath(); g.moveTo(x - w * .55, by - h); g.lineTo(x, by - h - 15 * s); g.lineTo(x + w * .55, by - h); g.fill();
  lights.push(x - w * .9, by - h * .6 + .8 * s, x + w * .9, by - h * .6 + .8 * s, x - w * .9, by - h * .8 + .8 * s, x + w * .9, by - h * .8 + .8 * s);
}
function mosque(g, cx, by, s, nMin, lights){
  g.save(); g.globalCompositeOperation = 'lighter'; sprite(g, glow('255,160,80', 's'), cx, by - 45 * s, 130 * s, 85 * s, .3); g.restore();
  g.fillStyle = vgrad(g, by - 115 * s, by, [[0, '#6a5a72'], [.45, '#8c7270'], [1, '#b48a62']]);
  const D = (x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, Math.PI, 0); g.closePath(); g.fill(); };
  g.fillRect(cx - 64 * s, by - 22 * s, 128 * s, 22 * s);
  for (const d of [-54, -42, -30, 30, 42, 54]) D(cx + d * s, by - 22 * s, 5 * s, 5 * s);
  g.fillRect(cx - 44 * s, by - 40 * s, 88 * s, 18 * s);
  D(cx - 31 * s, by - 40 * s, 15 * s, 13 * s); D(cx + 31 * s, by - 40 * s, 15 * s, 13 * s);
  D(cx - 18 * s, by - 52 * s, 9 * s, 8 * s); D(cx + 18 * s, by - 52 * s, 9 * s, 8 * s);
  g.fillRect(cx - 22 * s, by - 58 * s, 44 * s, 18 * s);
  D(cx, by - 58 * s, 26 * s, 23 * s);
  g.fillRect(cx - .8 * s, by - 89 * s, 1.6 * s, 9 * s);
  const mp = nMin === 6 ? [[-74, 104], [-60, 112], [60, 112], [74, 104], [-90, 86], [90, 86]] : nMin === 4 ? [[-70, 108], [-56, 100], [56, 100], [70, 108]] : [[-62, 96], [62, 96]];
  mp.forEach(([p, h]) => minaret(g, cx + p * s, by, h * s, s, lights));
  // pencere sıraları ve kubbe gölgesi
  g.fillStyle = 'rgba(45,30,34,.55)';
  for (let x = cx - 58 * s; x < cx + 57 * s; x += 6 * s) g.fillRect(x, by - 15 * s, 2.2 * s, 6 * s);
  for (let x = cx - 40 * s; x < cx + 39 * s; x += 7 * s) g.fillRect(x, by - 35 * s, 2.4 * s, 7 * s);
  for (let x = cx - 19 * s; x < cx + 18 * s; x += 5 * s) g.fillRect(x, by - 55 * s, 1.8 * s, 5 * s);
  const dsh = g.createLinearGradient(cx - 26 * s, 0, cx + 26 * s, 0);
  dsh.addColorStop(0, 'rgba(30,20,40,.45)'); dsh.addColorStop(.55, 'rgba(30,20,40,0)'); dsh.addColorStop(1, 'rgba(30,20,40,.2)');
  g.fillStyle = dsh; D(cx, by - 58 * s, 26 * s, 23 * s); D(cx - 31 * s, by - 40 * s, 15 * s, 13 * s); D(cx + 31 * s, by - 40 * s, 15 * s, 13 * s);
  // kubbe kenarı ışığı
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,200,140,.35)'; g.lineWidth = 1.4 * s;
  g.beginPath(); g.ellipse(cx, by - 58 * s, 26 * s, 23 * s, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.restore();
}
function sceneIstanbul(W, H, o){
  const u = o.u, A = W * H / 1.04e6 * o.q, land = W >= H, U = Math.max(.35, u);
  const yw = Math.round(H * (land ? .7 : .64)), hw = H - yw;
  const top = mk(W, yw), g = c2(top);
  g.fillStyle = vgrad(g, 0, yw, [[0, '#030716'], [.45, '#0a1533'], [.8, '#1d2049'], [1, '#43304f']]); g.fillRect(0, 0, W, yw);
  g.globalCompositeOperation = 'lighter';
  sprite(g, glow('255,130,80', 's'), W * .35, yw, W * .55, H * .2, .18);
  sprite(g, glow('140,90,210', 's'), W * .8, yw, W * .45, H * .18, .14);
  g.globalCompositeOperation = 'source-over';
  stars(g, 520 * A, 0, 0, W, yw * .75, { u, max: .65, big: .3 });
  const mx = W * (land ? .8 : .74), my = H * (land ? .17 : .12), mr = Math.max(7, 24 * U);
  moon(g, mx, my, mr);
  // uzak kıyı (Anadolu yakası) ve ışıkları
  const far = ridge(W, yw - 3 * U, 22 * U, .6, 6 * U);
  g.fillStyle = vgrad(g, yw - 30 * U, yw, [[0, '#151a35'], [1, '#1c1f3a']]); fillPts(g, far, yw);
  for (let i = 0; i < 520 * clamp(A, .3, 1.4); i++){
    const x = R() * W, y0 = yAt(far, x), y = y0 + R() * (yw - y0);
    g.globalAlpha = rnd(.35, .95); g.fillStyle = R() < .75 ? '#ffcf8a' : '#e8f0ff'; const s = Math.max(.8, U * rnd(.8, 1.5)); g.fillRect(x, y, s, s);
  }
  g.globalAlpha = 1;
  // tarihi yarımada: tepeler, evler, camiler
  const pe = land ? .62 : .7, hillY = x => yw - 8 * U - 30 * U * Math.pow(Math.sin(Math.PI * clamp(x / (W * pe), 0, 1)), .7);
  g.fillStyle = '#181c37';
  g.beginPath(); g.moveTo(0, yw); for (let x = 0; x <= W * pe; x += 4) g.lineTo(x, hillY(x)); g.lineTo(W * pe, yw); g.fill();
  for (let x = 0; x < W * pe; x += rnd(4, 9) * U){
    const w = rnd(4, 10) * U, h = rnd(4, 13) * U, y = hillY(x) - h + 2 * U;
    g.fillStyle = '#171b36'; g.fillRect(x, y, w, yw - y);
    if (R() < .5){ g.fillStyle = R() < .8 ? 'rgba(255,200,130,.75)' : 'rgba(220,235,255,.6)'; g.fillRect(x + w * .3, y + h * .3, Math.max(1, 1.3 * U), Math.max(1, 1.3 * U)); }
  }
  const ml = [];
  mosque(g, W * (land ? .29 : .3), hillY(W * (land ? .29 : .3)) + 4 * U, 1.2 * U, 6, ml);
  mosque(g, W * (land ? .47 : .55), hillY(W * (land ? .47 : .55)) + 6 * U, .9 * U, 4, ml);
  g.fillStyle = 'rgba(255,214,150,.9)';
  for (let i = 0; i < ml.length; i += 2) g.fillRect(ml[i] - .6 * U, ml[i + 1] - .6 * U, 1.2 * U, 1.2 * U);
  // köprü (asma köprü, ışıklar renk değiştirir)
  const xA = W * (land ? .66 : .62), xB = W * (land ? 1.02 : 1.18), anc = xA - (xB - xA) * .4;
  const yT = yw - 125 * U, yD = yw - 34 * U, cableL = [], deckL = [], red = [];
  const cab = x => { if (x < xA){ const k = (x - anc) / (xA - anc); return yD - 4 * U - (yD - 4 * U - yT) * k * k; } if (x <= xB){ const k = (x - (xA + xB) / 2) / ((xB - xA) / 2); return yT + (yD - 8 * U - yT) * (1 - k * k); } const k = (x - xB) / (xA - anc); return yT + (yD - yT) * k * k; };
  g.fillStyle = '#10142a'; g.strokeStyle = '#151a33';
  g.fillRect(anc - 10 * U, yD, W * 2, 3.5 * U);
  g.lineWidth = Math.max(.6, .8 * U); g.beginPath();
  for (let x = anc + 6 * U; x < W + 10; x += 7 * U){ if (Math.abs(x - xA) < 4 * U || Math.abs(x - xB) < 4 * U) continue; g.moveTo(x, cab(x)); g.lineTo(x, yD); }
  g.stroke();
  g.lineWidth = Math.max(1, 1.6 * U); g.beginPath(); g.moveTo(anc, cab(anc)); for (let x = anc; x < W + 10; x += 3) g.lineTo(x, cab(x)); g.stroke();
  for (const tx of [xA, xB]){
    g.fillRect(tx - 5 * U, yT, 2.6 * U, yw - yT); g.fillRect(tx + 2.4 * U, yT, 2.6 * U, yw - yT);
    for (const k of [.05, .45, .8]) g.fillRect(tx - 5 * U, yT + (yw - yT) * k, 10 * U, 2 * U);
    red.push(tx - 3.7 * U, yT - 1.5 * U, tx + 3.7 * U, yT - 1.5 * U);
  }
  for (let x = anc; x < W + 10; x += 9 * U){ deckL.push(x, yD + 1.6 * U); }
  for (let x = anc + 4 * U, i = 0; x < W + 10; x += 11 * U, i++) cableL.push(x, cab(x), i);
  g.fillStyle = 'rgba(255,190,110,.9)';
  for (let i = 0; i < deckL.length; i += 2) g.fillRect(deckL[i] - .7 * U, deckL[i + 1] - .7 * U, 1.4 * U, 1.4 * U);
  // Galata tepesi: binalar, pencereler, kule
  const ge = W * (land ? .3 : .42), gx = ge * .5;
  const gH = x => yw - 6 * U - 62 * U * Math.pow(Math.max(0, Math.sin(Math.PI * clamp(x / ge, 0, 1) * .5 + Math.PI * .25)), 3);
  g.fillStyle = '#0a0d1b'; g.beginPath(); g.moveTo(0, yw); for (let x = 0; x <= ge + 20 * U; x += 4) g.lineTo(x, Math.min(yw, gH(x) + Math.max(0, x - ge) * 2)); g.lineTo(ge + 20 * U, yw); g.fill();
  const wins = [];
  function building(x, w, h, col){
    const base = gH(x + w / 2), y = base - h;
    g.fillStyle = col; g.fillRect(x, y, w, yw - y);
    if (R() < .45){ g.beginPath(); g.moveTo(x - 1, y); g.lineTo(x + w / 2, y - w * .28); g.lineTo(x + w + 1, y); g.fill(); }
    const cw = 4.6 * U, rh = 6 * U, ww = Math.max(1, 2 * U), wh = Math.max(1, 2.8 * U);
    for (let yy = y + 3 * U; yy < yw - 5 * U; yy += rh) for (let xx = x + 2 * U; xx < x + w - ww - 1 * U; xx += cw){
      const on = R() < .38; const wcol = R() < .8 ? pick(['#ffcf86', '#ffd99c', '#ffbf6b']) : '#cfe0ff';
      wins.push({ x: xx, y: yy, w: ww, h: wh, on, wcol, col });
      if (on){ g.fillStyle = wcol; g.fillRect(xx, yy, ww, wh); }
    }
  }
  for (let x = -6 * U; x < ge; x += rnd(9, 17) * U){ if (Math.abs(x - gx) < 16 * U) continue; building(x, rnd(10, 20) * U, rnd(10, 28) * U, pick(['#0b0e1c', '#0d1020', '#090b17'])); }
  // Galata kulesi
  const tb = gH(gx) - 4 * U, tw2 = 11 * U;
  g.save(); g.globalCompositeOperation = 'lighter'; sprite(g, glow('255,170,90', 's'), gx, tb - 70 * U, 55 * U, 90 * U, .3); g.restore();
  const tg = g.createLinearGradient(gx - tw2, 0, gx + tw2, 0);
  tg.addColorStop(0, '#2c2224'); tg.addColorStop(.45, '#a07a58'); tg.addColorStop(.6, '#8b6a4f'); tg.addColorStop(1, '#2a2124');
  g.fillStyle = tg; g.fillRect(gx - tw2, tb - 92 * U, tw2 * 2, 92 * U + 6 * U);
  g.fillStyle = 'rgba(30,20,22,.75)';
  for (const k of [.25, .45, .65]) for (const dxx of [-5, 0, 5]) g.fillRect(gx + dxx * U - 1 * U, tb - 92 * U * k - 4 * U, 2 * U, 4 * U);
  g.fillStyle = tg; g.fillRect(gx - tw2 * 1.15, tb - 104 * U, tw2 * 2.3, 12 * U);
  g.fillStyle = '#ffd38f'; for (let k = -3; k <= 3; k++) g.fillRect(gx + k * 2.9 * U - .8 * U, tb - 101 * U, 1.6 * U, 6 * U);
  g.fillStyle = '#1f2233'; g.fillRect(gx - tw2 * 1.25, tb - 104.5 * U, tw2 * 2.5, 1.5 * U);
  const rg = g.createLinearGradient(gx - tw2, 0, gx + tw2, 0); rg.addColorStop(0, '#1a1c2a'); rg.addColorStop(.5, '#4a4656'); rg.addColorStop(1, '#171926');
  g.fillStyle = rg; g.beginPath(); g.moveTo(gx - tw2 * 1.15, tb - 104 * U); g.lineTo(gx, tb - 140 * U); g.lineTo(gx + tw2 * 1.15, tb - 104 * U); g.fill();
  g.fillRect(gx - .6 * U, tb - 147 * U, 1.2 * U, 8 * U);
  for (let x = gx - 30 * U; x < gx + 30 * U; x += rnd(10, 15) * U) if (Math.abs(x - gx) > 10 * U) building(x, rnd(9, 14) * U, rnd(6, 12) * U, '#090b16');
  // sahil ışıkları ve su seviyesi pusu
  g.fillStyle = '#ffcf86'; for (let x = 2 * U; x < ge; x += 12 * U) g.fillRect(x, yw - 3 * U, 1.5 * U, 1.5 * U);
  g.fillStyle = vgrad(g, yw - 30 * U, yw, [[0, 'rgba(120,100,150,0)'], [1, 'rgba(120,100,150,.12)']]); g.fillRect(0, yw - 30 * U, W, 30 * U);
  // su: yansıma tuvali
  const MGW = Math.ceil(14 * U), refl = mk(W + MGW * 2, hw), r = c2(refl);
  r.fillStyle = vgrad(r, 0, hw, [[0, '#1a1a3a'], [.3, '#0b1029'], [1, '#03060f']]); r.fillRect(0, 0, refl.width, hw);
  const sm = mk(W / 3, yw / 5), smg = c2(sm); smg.drawImage(top, 0, 0, sm.width, sm.height);
  r.save(); r.translate(MGW, 0); r.scale(1, -1); r.globalAlpha = .55; r.drawImage(sm, 0, 0, sm.width, sm.height, 0, -yw, W, yw); r.restore();
  r.globalCompositeOperation = 'lighter';
  const streak = glow('255,190,110', 's');
  for (let i = 0; i < deckL.length; i += 6) sprite(r, streak, MGW + deckL[i], (yw - deckL[i + 1]) * 1.1 + 6 * U, 1.6 * U, rnd(12, 26) * U, .35);
  for (const wnd of wins) if (wnd.on && R() < .25) sprite(r, streak, MGW + wnd.x, (yw - wnd.y) * 1.05 + 4 * U, 1.3 * U, rnd(5, 12) * U, .25);
  for (let i = 0; i < ml.length; i += 8) sprite(r, streak, MGW + ml[i], (yw - ml[i + 1]) * .9, 1.2 * U, 10 * U, .25);
  sprite(r, glow('255,236,200', 's'), MGW + mx, hw * .4, mr * 2.4, hw * .65, .22);
  r.globalCompositeOperation = 'source-over';
  r.fillStyle = vgrad(r, 0, hw, [[0, 'rgba(3,6,18,.1)'], [1, 'rgba(2,4,10,.55)']]); r.fillRect(0, 0, refl.width, hw);
  dither(r, refl.width, hw, .03);
  // simli parıltı (ay yolu)
  const glit = [];
  for (let i = 0; i < 110 * clamp(A, .4, 1.4); i++){ const k = Math.pow(R(), 1.3); glit.push({ x: mx + gauss() * (mr * .6 + k * mr * 2.2), y: yw + 2 + k * (hw - 4), w: (2 + 9 * k) * U, sp: rnd(1, 3), ph: R() * TAU }); }
  // vapur
  const fw = 112 * U, fh = 36 * U, fer = mk(fw + 8 * U, fh + 4 * U), f = c2(fer);
  f.translate(4 * U, 2 * U);
  f.fillStyle = '#121420'; f.beginPath(); f.moveTo(0, fh * .6); f.lineTo(fw, fh * .6); f.lineTo(fw - 6 * U, fh); f.lineTo(6 * U, fh); f.closePath(); f.fill();
  f.fillStyle = '#b9b4a6'; f.fillRect(2 * U, fh * .4, fw - 4 * U, fh * .21);
  f.fillStyle = '#a7a296'; f.fillRect(fw * .2, fh * .22, fw * .6, fh * .19);
  f.fillStyle = '#ffd48a'; for (let x = 5 * U; x < fw - 7 * U; x += 5 * U) f.fillRect(x, fh * .45, 2.6 * U, 2.6 * U);
  for (let x = fw * .23; x < fw * .78; x += 6 * U) f.fillRect(x, fh * .27, 3 * U, 2.6 * U);
  f.fillStyle = '#d6d0bf'; f.fillRect(fw * .47, fh * .02, 7 * U, fh * .21); f.fillStyle = '#1a1a1f'; f.fillRect(fw * .47, fh * .02, 7 * U, 3 * U);
  f.fillStyle = '#ffffff'; f.fillRect(fw * .3, 0, 1, fh * .22); f.fillRect(fw * .7, 0, 1, fh * .22);
  const fer2 = { x: -fw, dir: 1, wait: 0, y: yw + hw * .3 };
  // martılar
  const gulls = Array.from({ length: land ? 5 : 3 }, () => ({ x: R() * W, y: rnd(.12, .45) * yw, s: rnd(5, 9) * U, v: rnd(10, 22) * U * (R() < .5 ? -1 : 1), ph: R() * TAU, fl: rnd(4, 7) }));
  const tw = twinkles(70 * clamp(A, .3, 1.4), 0, 0, W, yw * .6, u);
  const hueS = Array.from({ length: 16 }, (_, i) => glow(hsl(i * 22.5, .9, .62), 'h'));
  const redS = glow('255,60,60', 'h'), wl = glow('255,240,210', 'h'), gl = glow('255,240,215', 'h');
  const sh = Math.max(2, Math.round(2.5 * U));
  return { draw(c, t, dt, still){
    if (!still){
      let n = wins.length * dt * .01;
      while (n > 0){ if (R() < n){ const w = wins[(R() * wins.length) | 0]; w.on = !w.on; g.fillStyle = w.on ? w.wcol : w.col; g.fillRect(w.x, w.y, w.w, w.h); } n -= 1; }
    }
    c.drawImage(top, 0, 0);
    drawTw(c, tw, t);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < cableL.length; i += 3){
      const hI = ((((t * .09 + cableL[i + 2] * .022) % 1) + 1) % 1) * 16 | 0;
      sprite(c, hueS[hI], cableL[i], cableL[i + 1], 3 * U, 3 * U, .95);
    }
    if ((t % 1.6) < .8) for (let i = 0; i < red.length; i += 2) sprite(c, redS, red[i], red[i + 1], 4 * U, 4 * U, .9);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    // dalgalı yansıma: ince şeritler yana kayar
    for (let y = 0; y < hw; y += sh){
      const k = y / hw, off = (Math.sin(y * .33 / U + t * 1.7) * (.5 + 2 * k) + Math.sin(y * .085 / U - t * .8) * (.8 + 2.4 * k)) * U;
      c.drawImage(refl, MGW + off, y, W, sh, 0, yw + y, W, sh);
    }
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgb(255,242,215)';
    for (const p of glit){ const a = Math.sin(t * p.sp + p.ph); if (a <= 0) continue; c.globalAlpha = a * a * .85; c.fillRect(p.x - p.w / 2 + Math.sin(t + p.ph) * 2 * U, p.y, p.w, Math.max(1, U)); }
    // vapur
    if (!still){ if (fer2.wait > 0) fer2.wait -= dt; else { fer2.x += fer2.dir * W / 75 * dt; if (fer2.x > W + fw || fer2.x < -fw * 2){ fer2.dir *= -1; fer2.wait = rnd(4, 12); } } }
    const fx = still ? W * .42 : fer2.x, fy = fer2.y - fh;
    if (still || fer2.wait <= 0){
      c.globalAlpha = .18; c.strokeStyle = 'rgb(200,220,255)'; c.lineWidth = Math.max(1, U);
      const sx = fer2.dir > 0 ? fx : fx + fw;
      c.beginPath(); c.moveTo(sx, fer2.y); c.lineTo(sx - fer2.dir * 60 * U, fer2.y + 5 * U); c.moveTo(sx, fer2.y + 1); c.lineTo(sx - fer2.dir * 50 * U, fer2.y - 1 * U); c.stroke();
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = .28; c.save(); c.translate(fx, fer2.y * 2 + 2 * U); c.scale(1, -1); c.drawImage(fer, -4 * U, 0); c.restore();
      c.globalAlpha = 1; c.drawImage(fer, fx - 4 * U, fy - 2 * U);
      c.globalCompositeOperation = 'lighter';
      sprite(c, wl, fx + fw * .3, fy, 3 * U, 3 * U, .9); sprite(c, wl, fx + fw * .7, fy, 3 * U, 3 * U, .9);
      sprite(c, gl, fx + fw * .5, fy + fh * .5, 30 * U, 10 * U, .12);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    // martılar
    c.strokeStyle = 'rgba(228,230,240,.85)'; c.lineWidth = Math.max(1, 1.3 * U); c.lineCap = 'round'; c.beginPath();
    for (const b of gulls){
      if (!still){ b.x += b.v * dt; if (b.x < -20 * U) b.x = W + 20 * U; if (b.x > W + 20 * U) b.x = -20 * U; }
      const y = b.y + Math.sin(t * .6 + b.ph) * 6 * U, fl = Math.sin(t * b.fl + b.ph), s = b.s;
      c.moveTo(b.x - s, y - s * .35 * fl); c.quadraticCurveTo(b.x - s * .45, y - s * .55 * fl - s * .1, b.x, y);
      c.quadraticCurveTo(b.x + s * .45, y - s * .55 * fl - s * .1, b.x + s, y - s * .35 * fl);
    }
    c.stroke(); c.lineCap = 'butt';
  } };
}

/* ---------- Cyberpunk şehir ---------- */
const NEON = ['255,42,140', '0,240,255', '255,230,0', '190,80,255', '60,255,170', '255,120,40'];
// tabela ve hologram yazıları: kullanıcının istediği ifadeler (sırayla dağıtılır)
const PHRASES = ['Kim attı o flaşı ?', 'Adam burda…', 'A bastılar', 'B bastılar', 'Amk hepsi mid', 'Açık büfe', '7/24 Açığız', 'Drop pls'];
const PH_SHORT = ['Drop pls', 'A bastılar', 'B bastılar', 'Açık büfe', '7/24 Açığız'];
let phI = 0, phS = 0;
const signFont = f => '700 ' + f + 'px "Segoe UI",system-ui,sans-serif';
// neon tabela; yatay ya da dikey (yazı 90° döner). Genişliğe/boya sığmazsa küçülür, çok küçülürse null
function neonSign(u, vertical, maxW, maxLen){
  const col = pick(NEON), word = vertical ? PH_SHORT[phS++ % PH_SHORT.length] : PHRASES[phI++ % PHRASES.length];
  const pad = 5 * u, gm = 10 * u, meas = c2(mk(1, 1));
  let fs = (vertical ? rnd(12, 15) : rnd(13, 20)) * u; meas.font = signFont(fs); let tw = meas.measureText(word).width;
  const k = vertical ? Math.min(1, (maxLen - pad * 2 - gm * 2) / tw, (maxW - gm * 2 - pad * 2) / (fs * 1.15)) : Math.min(1, (maxW - gm * 2 - pad * 2) / tw);
  fs *= k; tw *= k; if (fs < 7 * u) return null;
  const bw = (vertical ? fs * 1.15 : tw) + pad * 2, bh = (vertical ? tw : fs * 1.15) + pad * 2, c = mk(bw + gm * 2, bh + gm * 2), g = c2(c);
  g.translate(gm, gm);
  g.fillStyle = 'rgba(8,4,18,.92)'; g.fillRect(0, 0, bw, bh);
  g.shadowColor = 'rgb(' + col + ')'; g.shadowBlur = 8 * u;
  g.strokeStyle = 'rgba(' + col + ',.95)'; g.lineWidth = Math.max(1, 1.4 * u); g.strokeRect(1.5 * u, 1.5 * u, bw - 3 * u, bh - 3 * u);
  g.font = signFont(fs); g.textAlign = 'center'; g.textBaseline = 'middle';
  const txt = (style, blur) => { g.save(); g.translate(bw / 2, bh / 2); if (vertical) g.rotate(-Math.PI / 2); g.fillStyle = style; g.shadowBlur = blur; g.fillText(word, 0, fs * .04); g.restore(); };
  txt('rgb(' + col + ')', 8 * u); txt('rgba(255,255,255,.55)', 0);
  return { c, w: c.width, h: c.height, gm };
}
// bina katmanı: her bina kendi küçük tuvalinde (yalnız binanın pikselleri çizilir, gökyüzü boşluğu kopyalanmaz)
function cityLayer(TW, H, u, o){
  const list = [], signs = [], blink = [], P = Math.ceil(12 * u);
  for (let x = rnd(0, 20) * u; x < TW;){ const w = rnd(o.wMin, o.wMax) * u, h = rnd(o.hMin, o.hMax) * H; list.push({ x, w, h, t: R() }); x += w * rnd(o.gapMin, o.gapMax); }
  for (const b of list){
    const x = b.x, y = H - b.h, top = Math.max(0, Math.floor(y - b.h * .08 - 26 * u - P)), sx = Math.floor(x - P);
    const c = mk(b.w + P * 2 + 2, H - top), g = c2(c);
    g.translate(-sx, -top);
    g.fillStyle = vgrad(g, H * (1 - o.hMax), H, o.body);
    g.fillRect(x, y, b.w, b.h);
    if (b.t < .4){ g.fillRect(x + b.w * .15, y - b.h * .08, b.w * .7, b.h * .08 + 1); g.fillRect(x + b.w * .45, y - b.h * .08 - 26 * u, Math.max(1, 1.2 * u), 26 * u); }
    else if (b.t < .6){ g.beginPath(); g.moveTo(x, y); g.lineTo(x + b.w * .5, y - b.w * .4); g.lineTo(x + b.w, y); g.fill(); }
    // pencereler / şerit ışıklar
    if (b.t > .75){
      g.fillStyle = 'rgba(' + pick(NEON) + ',' + o.win * .35 + ')';
      for (let yy = y + 8 * u; yy < H - 4 * u; yy += rnd(7, 12) * u) g.fillRect(x + 2 * u, yy, b.w - 4 * u, Math.max(1, .9 * u));
    } else {
      const cw = rnd(4, 6) * u, rh = rnd(5, 8) * u, ww = Math.max(1, 1.8 * u), wh = Math.max(1, 2.4 * u), wc = pick(['255,200,120', '0,230,255', '255,80,180', '190,170,255', '255,240,200']);
      for (let yy = y + 5 * u; yy < H - 3 * u; yy += rh) for (let xx = x + 3 * u; xx < x + b.w - 3 * u; xx += cw)
        if (R() < o.winP){ g.fillStyle = 'rgba(' + (R() < .8 ? wc : pick(NEON)) + ',' + o.win * rnd(.35, 1) + ')'; g.fillRect(xx, yy, ww, wh); }
    }
    // sis: binanın alt kısmı pembe/mor puslu
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = vgrad(g, H * .35, H, o.fog); g.fillRect(sx, top, c.width, H - top);
    g.globalCompositeOperation = 'source-over';
    // çatı neon çizgisi ve kenar ışığı
    if (R() < o.edge * .6){
      const col = pick(NEON); g.save(); g.shadowColor = 'rgb(' + col + ')'; g.shadowBlur = 10 * u; g.fillStyle = 'rgba(' + col + ',.9)';
      g.fillRect(x, y, b.w, Math.max(1, 1.4 * u)); if (R() < .5) g.fillRect(x, y + b.h * rnd(.08, .2), b.w, Math.max(1, 1.2 * u)); g.restore();
    }
    if (R() < o.edge){
      const col = pick(NEON); g.save(); g.shadowColor = 'rgb(' + col + ')'; g.shadowBlur = 8 * u; g.fillStyle = 'rgba(' + col + ',.85)';
      g.fillRect(R() < .5 ? x : x + b.w - 1.5 * u, y + b.h * rnd(0, .3), 1.5 * u, b.h * rnd(.3, .7)); g.restore();
    }
    b.c = c; b.sx = sx; b.top = top;
    blink.push(x + b.w * .5, y - (b.t < .4 ? b.h * .08 + 26 * u : 2 * u));
    // tabelalar binaya basılır; her karede yalnız "sönen" tabelanın üstü karartılır
    const ns = Math.round(o.signs * rnd(.4, 1.6));
    const placed = [];
    for (let k = 0; k < ns; k++){
      const sg = neonSign(u * o.signScale, R() < .35, c.width, b.h * .55); if (!sg || sg.w > c.width) continue;
      const gx = clamp(x + rnd(-.15, .9) * b.w - sg.gm, sx, sx + c.width - sg.w), gy = Math.min(y + rnd(.05, .55) * b.h, H - sg.h);
      const bx0 = gx + sg.gm, by0 = gy + sg.gm, bx1 = gx + sg.w - sg.gm, by1 = gy + sg.h - sg.gm;
      if (placed.some(q => bx0 < q[2] + 4 * u && bx1 > q[0] - 4 * u && by0 < q[3] + 4 * u && by1 > q[1] - 4 * u)) continue;
      placed.push([bx0, by0, bx1, by1]);
      g.drawImage(sg.c, gx, gy);
      signs.push({ x: gx + sg.gm, y: gy + sg.gm, w: sg.w - sg.gm * 2, h: sg.h - sg.gm * 2, ph: R() * 50, rate: rnd(.03, .25) });
    }
  }
  return { list, signs, blink, TW };
}
// sık katman: binalar yatayda sarmalı tek şerit tuvale basılır (kare başına 2 kopya)
function cityStrip(L, H){
  let top = H; for (const b of L.list) top = Math.min(top, b.top);
  const c = mk(L.TW, H - top), g = c2(c);
  for (const b of L.list) for (const ox of [-L.TW, 0, L.TW]){ const x = b.sx + ox; if (x < L.TW && x + b.c.width > 0) g.drawImage(b.c, x, b.top - top); }
  for (const b of L.list) b.c = null;
  return { c, top };
}
function drawStrip(c, S, off, W){
  const TW = S.c.width, h = S.c.height; off = ((off % TW) + TW) % TW;
  const w1 = Math.min(W, TW - off);
  c.drawImage(S.c, off, 0, w1, h, 0, S.top, w1, h);
  if (w1 < W) c.drawImage(S.c, 0, 0, W - w1, h, w1, S.top, W - w1, h);
}
function drawCity(c, L, off, W){
  const TW = L.TW;
  for (const b of L.list){
    let x = b.sx - off; x = ((x % TW) + TW) % TW; if (x > W) x -= TW;
    if (x > W || x + b.c.width < 0) continue;
    c.drawImage(b.c, x, b.top);
  }
}
function sceneCyber(W, H, o){
  const u = o.u, A = W * H / 1.04e6 * o.q, land = W >= H, U = Math.max(.4, u);
  const sky = mk(W, H), g = c2(sky);
  g.fillStyle = vgrad(g, 0, H, [[0, '#05020f'], [.35, '#12052a'], [.65, '#3a0c4a'], [.85, '#6a1656'], [1, '#2a0a30']]); g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  sprite(g, glow('255,60,150', 's'), W * .3, H * .72, W * .6, H * .3, .22);
  sprite(g, glow('0,200,255', 's'), W * .8, H * .65, W * .45, H * .25, .14);
  g.globalCompositeOperation = 'source-over';
  stars(g, 140 * A, 0, 0, W, H * .4, { u, max: .4, big: 0 });
  // dumanın ardında büyük, soluk ay
  const smx = W * (land ? .3 : .3), smy = H * (land ? .3 : .25), smr = Math.min(W, H) * .17;
  g.globalCompositeOperation = 'lighter'; sprite(g, glow('255,80,150', 's'), smx, smy, smr * 3, smr * 3, .2); g.globalCompositeOperation = 'source-over';
  g.save(); g.beginPath(); g.arc(smx, smy, smr, 0, TAU); g.clip();
  g.fillStyle = vgrad(g, smy - smr, smy + smr, [[0, 'rgba(255,200,120,.55)'], [.55, 'rgba(255,90,140,.45)'], [1, 'rgba(160,40,140,.2)']]); g.fillRect(smx - smr, smy - smr, smr * 2, smr * 2);
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
  for (let k = 0; k < 7; k++){ const yy = smy + smr * (.15 + k * .13), hh0 = smr * (.02 + k * .012); g.fillRect(smx - smr, yy, smr * 2, hh0); }
  g.restore();
  // uzak kuleler (sabit)
  const L0 = cityLayer(W, H, U, { wMin: 14, wMax: 34, hMin: .3, hMax: .72, gapMin: .5, gapMax: 1, body: [[0, '#1d1240'], [1, '#2a1448']], fog: [[0, 'rgba(120,30,110,0)'], [1, 'rgba(160,40,120,.75)']], winP: .2, win: .45, edge: .15, signs: 0, signScale: .6 });
  drawCity(g, L0, 0, W);
  g.globalCompositeOperation = 'lighter';
  sprite(g, glow('255,70,170', 's'), W * .5, H * .95, W * .7, H * .22, .25);
  g.globalCompositeOperation = 'source-over';
  dither(g, W, H, .03);
  const TW1 = Math.ceil(Math.max(W * 1.6, 600 * U)), TW2 = Math.ceil(Math.max(W * 1.8, 700 * U));
  const L1 = cityLayer(TW1, H, U, { wMin: 26, wMax: 60, hMin: .25, hMax: .62, gapMin: .75, gapMax: 1.15, body: [[0, '#0e0822'], [1, '#170a2a']], fog: [[0, 'rgba(90,20,90,0)'], [1, 'rgba(150,30,110,.55)']], winP: .3, win: .8, edge: .35, signs: .6, signScale: .8 }), L1s = cityStrip(L1, H);
  const L2 = cityLayer(TW2, H, U, { wMin: 70, wMax: 150, hMin: .45, hMax: 1.05, gapMin: 1.5, gapMax: 3.2, body: [[0, '#06030d'], [1, '#0b0516']], fog: [[0, 'rgba(60,10,70,0)'], [1, 'rgba(110,20,90,.45)']], winP: .12, win: 1, edge: .7, signs: 1.6, signScale: 1.25 });
  // hologram pano
  const hw2 = 236 * U, hh = 96 * U;
  const HOLO = [['Kim attı o flaşı ?', 'Açık büfe'], ['Amk hepsi mid', 'Drop pls'], ['7/24 Açığız', 'A bastılar'], ['Adam burda…', 'B bastılar']];
  const holos = HOLO.map(([big, small]) => {
    const c = mk(hw2, hh), hg = c2(c);
    hg.fillStyle = vgrad(hg, 0, hh, [[0, 'rgba(0,240,255,.16)'], [1, 'rgba(255,42,140,.08)']]); hg.fillRect(0, 0, hw2, hh);
    hg.strokeStyle = 'rgba(0,240,255,.8)'; hg.lineWidth = Math.max(1, 1.2 * U); hg.strokeRect(1, 1, hw2 - 2, hh - 2);
    hg.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < hh; y += 3) hg.fillRect(0, y, hw2, 1);
    hg.textAlign = 'center'; hg.textBaseline = 'middle';
    let fs = 34 * U; hg.font = '800 ' + fs + 'px "Segoe UI",system-ui,sans-serif'; const tw = hg.measureText(big).width, avail = hw2 * .68;
    if (tw > avail){ fs *= avail / tw; hg.font = '800 ' + fs + 'px "Segoe UI",system-ui,sans-serif'; }
    hg.shadowColor = '#00f0ff'; hg.shadowBlur = 12 * U; hg.fillStyle = 'rgba(160,250,255,.95)'; hg.fillText(big, hw2 * .62, hh * .42);
    hg.font = '700 ' + (13 * U) + 'px "Segoe UI",system-ui,sans-serif'; hg.shadowColor = '#ff2a8c'; hg.fillStyle = 'rgba(255,150,210,.95)'; hg.fillText(small, hw2 * .62, hh * .78);
    return c;
  });
  const hx = W * (land ? .8 : .5) - hw2 / 2, hy = H * (land ? .15 : .12);
  const cube = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  // uçan arabalar
  const trail = {}; for (const col of ['255,40,60', '0,220,255', '255,220,140']){ for (const d of [1, -1]){ const tc = mk(64, 4), tg = c2(tc), gr = tg.createLinearGradient(0, 0, 64, 0); gr.addColorStop(d > 0 ? 0 : 1, 'rgba(' + col + ',0)'); gr.addColorStop(d > 0 ? 1 : 0, 'rgba(' + col + ',.9)'); tg.fillStyle = gr; tg.fillRect(0, 0, 64, 4); trail[col + d] = tc; } }
  const cars = Array.from({ length: Math.round(16 * clamp(A, .4, 1.3)) }, () => { const d = rnd(.35, 1); return { d, x: R() * W, y: H * rnd(.12, .6), v: rnd(40, 120) * U * d * (R() < .5 ? -1 : 1), col: pick(['255,40,60', '255,40,60', '0,220,255', '255,220,140']), ph: R() * TAU }; });
  cars.sort((a, b) => a.d - b.d);
  // yağmur
  const NR = Math.round(180 * clamp(A, .35, 1.4)), rx = new Float32Array(NR), ry = new Float32Array(NR), rl = new Float32Array(NR), rv = new Float32Array(NR);
  for (let i = 0; i < NR; i++){ rx[i] = R() * W * 1.2; ry[i] = R() * H; const near = i < NR * .25; rl[i] = (near ? rnd(20, 34) : rnd(9, 18)) * U; rv[i] = (near ? rnd(900, 1200) : rnd(550, 800)) * U; }
  const wl = glow('255,250,235', 'h'), redS = glow('255,40,60', 'h');
  const holoGlow = glow('0,220,255', 's'), beamOK = !o.mobile;
  // titreyen tabela: kısa süre sönük görünür (üstüne koyu, yarı saydam kutu)
  function signsDraw(c, Ly, off, t){
    c.fillStyle = 'rgb(8,4,18)';
    for (const s of Ly.signs){
      const ft = (t * s.rate + s.ph) % 1; let a = 0;
      if (ft < .04) a = Math.sin(t * 90) > 0 ? .75 : 0; else if (ft > .97) a = .8;
      if (!a) continue;
      let x = s.x - off; x = ((x % Ly.TW) + Ly.TW) % Ly.TW; if (x > W) x -= Ly.TW;
      if (x > W || x + s.w < 0) continue;
      c.globalAlpha = a; c.fillRect(x - 2, s.y - 2, s.w + 4, s.h + 4);
    }
    c.globalAlpha = 1;
  }
  function carsDraw(c, t, dt, still, near){
    c.globalCompositeOperation = 'lighter';
    for (const k of cars){
      if ((k.d > .7) !== near) continue;
      if (!still){ k.x += k.v * dt; if (k.v > 0 && k.x > W + 160 * U) k.x = -60 * U; if (k.v < 0 && k.x < -160 * U) k.x = W + 60 * U; }
      const dir = k.v > 0 ? 1 : -1, y = k.y + Math.sin(t * 1.3 + k.ph) * 2 * U, s = k.d * U * 1.4, len = 120 * s;
      c.globalAlpha = .55 * k.d + .2;
      c.drawImage(trail[k.col + dir], dir > 0 ? k.x - len : k.x, y - 1.2 * s, len, 2.4 * s);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.fillStyle = '#0d0a18'; c.fillRect(k.x - 6 * s, y - 2 * s, 12 * s, 4 * s);
      c.globalCompositeOperation = 'lighter';
      sprite(c, wl, k.x + dir * 6 * s, y, 5 * s, 3.5 * s, .95);
      sprite(c, redS, k.x - dir * 6 * s, y, 3.5 * s, 3 * s, .9);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  return { draw(c, t, dt, still){
    c.drawImage(sky, 0, 0);
    // projektör ışıkları
    if (beamOK){
      c.globalCompositeOperation = 'lighter';
      for (const [bx, sp, ph, col] of [[W * .22, .23, 0, '120,200,255'], [W * .84, .17, 2, '255,120,200']]){
        const a = -Math.PI / 2 + Math.sin(t * sp + ph) * .45, L = H * 1.1, wdt = .05;
        const gr = c.createLinearGradient(bx, H, bx + Math.cos(a) * L, H + Math.sin(a) * L);
        gr.addColorStop(0, 'rgba(' + col + ',.16)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
        c.fillStyle = gr; c.beginPath(); c.moveTo(bx, H); c.lineTo(bx + Math.cos(a - wdt) * L, H + Math.sin(a - wdt) * L); c.lineTo(bx + Math.cos(a + wdt) * L, H + Math.sin(a + wdt) * L); c.fill();
      }
      c.globalCompositeOperation = 'source-over';
    }
    // orta katman
    const o1 = Math.round(t * 6 * U), o2 = Math.round(t * 16 * U);   // tam piksel: kopyalama filtresiz ve ucuz
    drawStrip(c, L1s, o1, W); signsDraw(c, L1, o1, t);
    carsDraw(c, t, dt, still, false);
    drawCity(c, L2, o2, W); signsDraw(c, L2, o2, t);
    if ((t % 2) < 1){ c.globalCompositeOperation = 'lighter'; for (let i = 0; i < L2.blink.length; i += 2){ let x = L2.blink[i] - o2; x = ((x % TW2) + TW2) % TW2; if (x < W) sprite(c, redS, x, L2.blink[i + 1], 4 * U, 4 * U, .8); } c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    // hologram
    const hi = Math.floor(t / 6) % holos.length, holo = holos[hi], gl = (t % 6) < .22 || (t % 6) > 5.9, fl = .72 + .14 * Math.sin(t * 3.1) + (Math.sin(t * 37) > .96 ? -.3 : 0);
    c.globalCompositeOperation = 'lighter';
    sprite(c, holoGlow, hx + hw2 / 2, hy + hh / 2, hw2 * .8, hh * .9, .12);
    c.globalAlpha = .06; c.fillStyle = 'rgb(0,240,255)'; c.beginPath(); c.moveTo(hx + hw2 * .2, hy + hh); c.lineTo(hx + hw2 * .8, hy + hh); c.lineTo(hx + hw2 * .52, hy + hh + H * .2); c.fill();
    c.globalAlpha = fl;
    if (gl){ for (let k = 0; k < 4; k++){ const sy = hh * k / 4; c.drawImage(holo, 0, sy, hw2, hh / 4, hx + rnd(-8, 8) * U, hy + sy, hw2, hh / 4); } }
    else c.drawImage(holo, hx, hy);
    // dönen tel kafes küp
    const ca = t * .7, cb = t * .45, cs = hh * .2, ccx = hx + hw2 * .15, ccy = hy + hh * .5;
    const P = cube.map(([x, y, z]) => { const x1 = x * Math.cos(ca) - z * Math.sin(ca), z1 = x * Math.sin(ca) + z * Math.cos(ca), y1 = y * Math.cos(cb) - z1 * Math.sin(cb); return [ccx + x1 * cs, ccy + y1 * cs]; });
    c.strokeStyle = 'rgba(120,250,255,.9)'; c.lineWidth = Math.max(1, 1.2 * U); c.beginPath();
    for (const [a, b] of edges){ c.moveTo(P[a][0], P[a][1]); c.lineTo(P[b][0], P[b][1]); } c.stroke();
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    carsDraw(c, t, dt, still, true);
    // yağmur
    const slant = -.18;
    for (const [i0, i1, a, lw] of [[Math.floor(NR * .25), NR, .2, Math.max(.7, .8 * U)], [0, Math.floor(NR * .25), .3, Math.max(1, 1.3 * U)]]){
      c.strokeStyle = 'rgba(175,195,255,' + a + ')'; c.lineWidth = lw; c.beginPath();
      for (let i = i0; i < i1; i++){
        if (!still){ ry[i] += rv[i] * dt; rx[i] += rv[i] * slant * dt; if (ry[i] > H){ ry[i] = -rl[i]; rx[i] = R() * W * 1.2; } }
        c.moveTo(rx[i], ry[i]); c.lineTo(rx[i] + slant * rl[i], ry[i] + rl[i]);
      }
      c.stroke();
    }
  } };
}

/* ---------- Kuzey ışıkları ---------- */
// perde dokusu: 512 genişliğinde, kendini tekrar eden ışın çizgileri; kaydırırken taşmasın diye iki kopya yan yana
function auroraTex(stops){
  const TWX = 512, c = mk(TWX * 2, 128), g = c2(c), gr = g.createLinearGradient(0, 128, 0, 0);
  stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, TWX * 2, 128);
  const mask = mk(TWX * 2, 1), mg = c2(mask), d = mg.createImageData(TWX * 2, 1), p = [R() * TAU, R() * TAU, R() * TAU];
  let nz = 0;
  for (let x = 0; x < TWX; x++){
    nz = nz * .6 + R() * .4;
    const v = .5 + .5 * Math.sin(x * TAU * 5 / TWX + p[0]) * Math.sin(x * TAU * 13 / TWX + p[1]) + .25 * Math.sin(x * TAU * 37 / TWX + p[2]);
    d.data[x * 4 + 3] = d.data[(x + TWX) * 4 + 3] = 255 * clamp(.25 + .75 * clamp(v, 0, 1) * (.55 + .45 * nz), 0, 1);
  }
  mg.putImageData(d, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(mask, 0, 0, TWX * 2, 128);
  return c;
}
function sceneAurora(W, H, o){
  const u = o.u, A = W * H / 1.04e6 * o.q, land = W >= H, U = Math.max(.4, u);
  const yh = Math.round(H * (land ? .64 : .6));
  const bg = mk(W, H), g = c2(bg);
  g.fillStyle = vgrad(g, 0, yh, [[0, '#010209'], [.5, '#030e26'], [.85, '#05223a'], [1, '#0a3344']]); g.fillRect(0, 0, W, yh);
  g.fillStyle = vgrad(g, yh, H, [[0, '#072233'], [.4, '#03111d'], [1, '#01050a']]); g.fillRect(0, yh, W, H - yh);
  stars(g, 2000 * A, 0, 0, W, yh, { u, max: .9 });
  dither(g, W, H, .035);
  const tex1 = auroraTex([[0, 'rgba(120,255,190,0)'], [.06, 'rgba(120,255,190,.3)'], [.1, 'rgba(225,255,235,1)'], [.15, 'rgba(80,255,165,1)'], [.34, 'rgba(30,235,150,.72)'], [.55, 'rgba(40,190,175,.42)'], [.78, 'rgba(140,80,220,.28)'], [1, 'rgba(190,60,210,0)']]);
  const tex2 = auroraTex([[0, 'rgba(120,255,220,0)'], [.06, 'rgba(120,255,220,.25)'], [.1, 'rgba(190,255,240,.95)'], [.17, 'rgba(50,235,205,.85)'], [.4, 'rgba(70,150,235,.5)'], [.68, 'rgba(175,85,235,.35)'], [1, 'rgba(230,70,200,0)']]);
  const aw = Math.ceil(W / 3), ah = Math.ceil(yh / 3), AC = mk(aw, ah), ag = c2(AC);
  const curt = (base, amp, hb, al, tex) => ({ base, amp, hb, al, tex, k: [rnd(4, 7), rnd(9, 14), rnd(3, 6), rnd(5, 9), rnd(2, 4)], w: [rnd(.22, .35), rnd(.35, .55), rnd(.4, .7), rnd(.9, 1.4), rnd(.3, .5)], p: Array.from({ length: 5 }, () => R() * TAU), ts: rnd(1.2, 2), tv: rnd(28, 45) * (R() < .5 ? -1 : 1) });
  const tex3 = auroraTex([[0, 'rgba(255,90,170,0)'], [.05, 'rgba(255,90,170,.5)'], [.1, 'rgba(255,170,220,.95)'], [.16, 'rgba(110,255,170,1)'], [.36, 'rgba(40,235,150,.7)'], [.6, 'rgba(60,170,200,.35)'], [1, 'rgba(160,70,220,0)']]);
  const curts = [curt(.46, .09, .42, .75, tex2), curt(.64, .12, .56, 1.15, tex1), curt(.8, .07, .42, .9, tex3)];
  const NS = 52;
  // perde = dikeyde kaydırılmış (eğilmiş) doku dilimleri; dilim başına tek drawImage
  function drawAurora(t){
    ag.setTransform(1, 0, 0, 1, 0, 0); ag.clearRect(0, 0, aw, ah);
    ag.globalCompositeOperation = 'lighter';
    for (const cu of curts){
      const k = cu.k, w = cu.w, p = cu.p, sw = aw / NS, srcW = sw * cu.ts;
      const base = xn => ah * (cu.base + cu.amp * Math.sin(xn * k[0] + t * w[0] + p[0]) + cu.amp * .5 * Math.sin(xn * k[1] - t * w[1] + p[1]));
      let yb0 = base(0);
      for (let i = 0; i < NS; i++){
        const x0 = i * sw, xm = (i + .5) / NS, yb1 = base((i + 1) / NS);
        let I = (.5 + .5 * Math.sin(xm * k[3] - t * w[3] + p[3])) * (.5 + .5 * Math.sin(xm * k[4] + t * w[4] + p[4]));
        I = cu.al * (.18 + .82 * Math.pow(I, .8)) * (.65 + .35 * Math.sin(xm * 3.1 + p[2])) * (.82 + .18 * Math.sin(t * 6.5 + i * 1.7 + p[4]));   // akan parlaklık dalgası + titreşim
        if (I > .02){
          const hh = ah * cu.hb * (.72 + .28 * Math.sin(xm * k[2] + t * w[2] + p[2]));
          const sx = ((x0 * cu.ts + t * cu.tv + p[1] * 40) % 512 + 512) % 512;
          ag.globalAlpha = I;
          ag.setTransform(sw / srcW, (yb1 - yb0) / srcW, 0, hh / 128, x0, yb0 - hh * .9);
          ag.drawImage(cu.tex, sx, 0, srcW, 128, 0, 0, srcW, 128);
        }
        yb0 = yb1;
      }
    }
    ag.setTransform(1, 0, 0, 1, 0, 0); ag.globalAlpha = 1; ag.globalCompositeOperation = 'source-over';
  }
  // dağlar, göl yansıması, karlı kıyı
  const mt = mk(W, H), q = c2(mt), hMax = H * (land ? .26 : .2);
  const far = peaks(W, yh, hMax, .55, 8);
  q.fillStyle = vgrad(q, yh - hMax, yh, [[0, '#4a5d75'], [.4, '#2b3a4e'], [1, '#111a27']]); fillPts(q, far, yh);
  q.globalCompositeOperation = 'source-atop';
  // kar örtüsü: sırt boyunca, alt kenarı tırtıklı; zirvelerde kalın, eteklerde ince
  const NP = far.length / 2, xs = i => far[i * 2], ys = i => far[i * 2 + 1], sp1 = R() * TAU, sp2 = R() * TAU;
  q.fillStyle = vgrad(q, yh - hMax, yh, [[0, 'rgba(225,236,248,.95)'], [.6, 'rgba(160,180,205,.75)'], [1, 'rgba(120,140,170,.5)']]);
  q.beginPath(); q.moveTo(xs(0), ys(0));
  for (let i = 1; i < NP; i++) q.lineTo(xs(i), ys(i));
  for (let i = NP - 1; i >= 0; i--){ const hgt = yh - ys(i), dep = hgt * clamp((hgt / hMax - .25) * 1.1, 0, .6) * (.6 + .25 * Math.sin(i * .13 + sp1) + .15 * Math.sin(i * .41 + sp2)); q.lineTo(xs(i), ys(i) + Math.max(0, dep) + R() * 4 * U); }
  q.closePath(); q.fill();
  const pk = []; for (let i = 1; i < NP - 1; i++){ let top = true; for (let j = Math.max(0, i - 10); j <= Math.min(NP - 1, i + 10); j++) if (ys(j) < ys(i)){ top = false; break; } if (top) pk.push(i); }
  q.lineCap = 'round';
  for (let i = 0; i < NP; i += 1){
    if (R() < .35) continue;
    let near = pk[0] || 0; for (const pi of pk) if (Math.abs(pi - i) < Math.abs(near - i)) near = pi;
    const dir = i < near ? -1 : 1, x = xs(i), y = ys(i) + 1, len = (yh - y) * rnd(.15, .55);
    q.strokeStyle = 'rgba(14,22,38,' + rnd(.12, .3) + ')'; q.lineWidth = rnd(.6, 1.6) * U;
    q.beginPath(); q.moveTo(x, y); q.quadraticCurveTo(x + dir * len * .12, y + len * .5, x + dir * len * rnd(.15, .35), y + len); q.stroke();
  }
  q.lineCap = 'butt';
  q.fillStyle = vgrad(q, yh - hMax, yh, [[0, 'rgba(90,255,180,.10)'], [1, 'rgba(90,255,180,0)']]); q.fillRect(0, 0, W, yh);
  q.globalCompositeOperation = 'source-over';
  const near = ridge(W, yh + 2 * U, H * .05, 1, 5 * U);
  q.fillStyle = '#060c14'; fillPts(q, near, yh + 1);
  q.fillStyle = '#03070c';
  for (let x = 0; x < W; x += rnd(2, 7) * U){ if (R() < .25) continue; const th = rnd(8, 20) * U; spruce(q, x, Math.min(yh + 1, yAt(near, x) + 3), th, th * .38); }
  q.fillRect(0, yh - 1, W, 2);
  // yansıma
  const tmp = mk(W, yh); c2(tmp).drawImage(mt, 0, 0);
  q.save(); q.translate(0, yh * 2); q.scale(1, -1); q.globalAlpha = .5; q.drawImage(tmp, 0, 0); q.restore();
  q.globalCompositeOperation = 'source-atop'; q.fillStyle = 'rgba(2,8,16,.45)'; q.fillRect(0, yh + 1, W, H - yh); q.globalCompositeOperation = 'source-over';
  // ön plan karlı kıyılar
  const bank = (x0, x1, yTop) => {
    q.fillStyle = vgrad(q, yTop, H, [[0, '#8ea3b8'], [.4, '#4b5d72'], [1, '#1e2836']]);
    q.beginPath(); q.moveTo(x0, H);
    for (let i = 0; i <= 30; i++){ const k = i / 30, x = x0 + (x1 - x0) * k; q.lineTo(x, H - (H - yTop) * Math.pow(Math.sin(Math.PI * (x0 < W / 2 ? (1 - k) * .5 : k * .5)), 1.4) + Math.sin(k * 20) * U); }
    q.lineTo(x1, H); q.fill();
    q.fillStyle = '#020509';
    for (let i = 0; i < 9; i++){ const k = rnd(.05, .7), x = x0 < W / 2 ? x0 + (x1 - x0) * k * .7 : x1 - (x1 - x0) * k * .7, th = rnd(40, 95) * U * (1 - k * .5); spruce(q, x, H - (H - yTop) * (1 - k) * .9 + 4 * U, th, th * .36); }
  };
  bank(-W * .02, W * (land ? .3 : .55), H * (land ? .86 : .88)); bank(W * (land ? .78 : .62), W * 1.02, H * (land ? .9 : .92));
  const tw = twinkles(120 * clamp(A, .25, 1.5), 0, 0, W, yh * .8, u);
  g.globalCompositeOperation = 'lighter'; sprite(g, glow('40,255,160', 's'), W * .5, yh * .62, W * .7, yh * .4, .11); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const mTop = Math.max(0, Math.floor(yh - hMax - 4));
  const rip = Array.from({ length: Math.round(34 * clamp(A, .4, 1.3)) }, () => ({ x: R() * W, y: yh + rnd(.04, .75) * (H - yh), w: rnd(20, 90) * U, ph: R() * TAU, sp: rnd(.3, .9), c: R() < .6 ? 'rgb(120,255,200)' : 'rgb(220,235,255)' }));
  // aurora sahnesi 15 Hz'de birleştirilir, aradaki karelerde önbellek kopyalanır
  const cache = mk(W, H), cg = c2(cache), RL = mk(W, H - yh), rg2 = c2(RL); let fr = 0, nc = 0;
  return { draw(c0, t, dt, still){
    if (!still && (fr++ & 1)){ c0.drawImage(cache, 0, 0); return; }
    const c = cg; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.drawImage(bg, 0, 0);
    drawTw(c, tw, t);
    drawAurora(t);
    c.globalCompositeOperation = 'lighter';
    c.drawImage(AC, 0, 0, aw, ah, 0, 0, W, ah * 3);
    // göl yansıması ayrı tuvalde, iki birleştirmede bir güncellenir
    if (!(nc++ & 1) || still){ rg2.setTransform(1, 0, 0, -1, 0, yh); rg2.clearRect(0, -H, W, H * 3); rg2.drawImage(AC, 0, 0, aw, ah, 0, 0, W, ah * 3); }
    c.globalAlpha = .32; c.drawImage(RL, 0, yh); c.globalAlpha = 1;
    for (const r of rip){ const a = Math.sin(t * r.sp + r.ph); if (a <= 0) continue; c.globalAlpha = a * .12; c.fillStyle = r.c; c.fillRect(r.x + Math.sin(t * .3 + r.ph) * 10 * U, r.y, r.w, Math.max(1, U)); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.drawImage(mt, 0, mTop, W, H - mTop, 0, mTop, W, H - mTop);
    c0.drawImage(cache, 0, 0);
  } };
}

/* ---------- Gece okyanusu ---------- */
function sceneOkyanus(W, H, o){
  const u = o.u, A = W * H / 1.04e6 * o.q, land = W >= H, U = Math.max(.4, u), m = Math.min(W, H);
  const yh = Math.round(H * (land ? .5 : .52));
  const bg = mk(W, H), g = c2(bg);
  g.fillStyle = vgrad(g, 0, yh, [[0, '#02040f'], [.55, '#08163a'], [1, '#1d3463']]); g.fillRect(0, 0, W, yh);
  g.fillStyle = vgrad(g, yh, H, [[0, '#122650'], [.25, '#0a1838'], [1, '#02050e']]); g.fillRect(0, yh, W, H - yh);
  stars(g, 1300 * A, 0, 0, W, yh * .9, { u, max: .85 });
  const mx = W * (land ? .62 : .6), my = H * (land ? .2 : .16), mr = Math.max(8, m * .055);
  moon(g, mx, my, mr);
  // ince bulut çizgileri
  for (let i = 0; i < 26; i++){ const rx = W * rnd(.06, .18), y = yh * rnd(.35, .85); sprite(g, glow('120,140,200', 's'), R() * W, y, rx, rx * rnd(.04, .09), rnd(.05, .1)); }
  // uzak burun + deniz feneri
  const lx = W * (land ? .12 : .16), ly = yh - 14 * U;
  g.globalAlpha = 1; g.fillStyle = '#050a18'; g.beginPath(); g.moveTo(0, yh); g.lineTo(0, yh - 22 * U); g.quadraticCurveTo(lx - 20 * U, yh - 26 * U, lx, yh - 10 * U); g.quadraticCurveTo(lx + 30 * U, yh - 2 * U, lx + 60 * U, yh); g.fill();
  g.fillRect(lx - 2 * U, ly - 16 * U, 4 * U, 16 * U); g.fillRect(lx - 3 * U, ly - 20 * U, 6 * U, 4 * U);
  g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(lx - 1.5 * U, ly - 14 * U, 3 * U, 1.2 * U); g.fillRect(lx - 1.5 * U, ly - 8 * U, 3 * U, 1.2 * U);
  g.globalCompositeOperation = 'lighter'; sprite(g, glow('255,236,200', 's'), mx, yh + (H - yh) * .4, mr * 2.2, (H - yh) * .55, .18);
  sprite(g, glow('120,160,255', 's'), W * .5, yh, W * .6, H * .05, .12);
  g.globalCompositeOperation = 'source-over';
  dither(g, W, H, .035);
  const crest = (() => { const gr = g.createLinearGradient(0, 0, W, 0); const k = mx / W; gr.addColorStop(0, 'rgba(90,120,190,.22)'); gr.addColorStop(clamp(k - .3, 0, 1), 'rgba(110,140,205,.3)'); gr.addColorStop(clamp(k - .1, 0, 1), 'rgba(170,190,240,.6)'); gr.addColorStop(k, 'rgba(255,246,228,1)'); gr.addColorStop(clamp(k + .1, 0, 1), 'rgba(170,190,240,.6)'); gr.addColorStop(clamp(k + .3, 0, 1), 'rgba(110,140,205,.3)'); gr.addColorStop(1, 'rgba(90,120,190,.22)'); return gr; })();
  const NR = Math.round(clamp(36 * Math.sqrt(A), 16, 40)), rows = [];
  for (let k = 0; k < NR; k++){ const p = (k + 1) / NR; rows.push({ p, y: yh + (H - yh) * Math.pow(p, 1.8), amp: (.5 + 8 * Math.pow(p, 1.6)) * U, lam: (24 + 240 * p) * U, sp: rnd(.6, 1.2), ph: R() * TAU, ph2: R() * TAU }); }
  const glit = []; for (let i = 0; i < 160 * clamp(A, .4, 1.3); i++){ const k = Math.pow(R(), 1.2); glit.push({ x: mx + gauss() * (mr * .4 + k * mr * 2.6), y: yh + 2 + Math.pow(k, 1.6) * (H - yh - 4), w: (1.5 + 10 * k) * U, sp: rnd(1, 3.2), ph: R() * TAU }); }
  const tw = twinkles(120 * clamp(A, .25, 1.5), 0, 0, W, yh * .8, u), beam = glow('255,245,200', 's');
  return { draw(c, t){
    c.drawImage(bg, 0, 0);
    drawTw(c, tw, t);
    // fener ışını (dönerken uzayıp kısalır)
    const ba = Math.cos(t * .9), bl = Math.abs(ba) * W * .3;
    c.globalCompositeOperation = 'lighter';
    sprite(c, beam, lx, ly - 11 * U, 7 * U, 7 * U, .5 + .5 * Math.max(0, Math.sin(t * .9)));
    if (bl > 4){ const gr = c.createLinearGradient(lx, 0, lx + Math.sign(ba) * bl, 0); gr.addColorStop(0, 'rgba(255,245,200,.25)'); gr.addColorStop(1, 'rgba(255,245,200,0)'); c.fillStyle = gr; c.beginPath(); c.moveTo(lx, ly - 11 * U); c.lineTo(lx + Math.sign(ba) * bl, ly - 11 * U - bl * .05); c.lineTo(lx + Math.sign(ba) * bl, ly - 11 * U + bl * .05); c.fill(); }
    c.globalCompositeOperation = 'source-over';
    // dalgalar: çukurlar koyu, tepeler aya bakan yerde aydınlık; çizgiler kesik kesik (yalnız tepe kısımları)
    // satırlar 6'lı bantlar halinde tek yol olarak çizilir (az çağrı)
    for (let b0 = 0; b0 < rows.length; b0 += 6){
      const band = rows.slice(b0, b0 + 6), pm = band[band.length >> 1].p;
      for (const crestPass of pm > .55 ? [false, true] : [true]){
        c.beginPath();
        for (const r of band){
          const sp = t * r.sp, k1 = TAU / r.lam, k2 = TAU / (r.lam * .53), stepX = Math.max(4 * U, r.lam / 7);
          let on = false;
          for (let x = -stepX; x <= W + stepX; x += stepX){
            const val = Math.sin(x * k1 + sp + r.ph) * .7 + Math.sin(x * k2 - sp * 1.3 + r.ph2) * .3 + .25 * Math.sin(x * .004 / U + r.ph2 + t * .1);
            const ok = crestPass ? val > .3 : val < -.15, y = r.y - r.amp * val + (crestPass ? 0 : r.amp * .5);
            if (ok){ if (on) c.lineTo(x, y); else c.moveTo(x, y); on = true; } else on = false;
          }
        }
        if (crestPass){ c.globalAlpha = .3 + .55 * pm; c.strokeStyle = crest; c.lineWidth = (.7 + 1.5 * pm) * U; }
        else { c.globalAlpha = .15 + .25 * pm; c.strokeStyle = 'rgb(1,4,12)'; c.lineWidth = (1.2 + 4 * pm) * U; }
        c.stroke();
      }
    }
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgb(255,244,220)';
    for (const p of glit){ const a = Math.sin(t * p.sp + p.ph); if (a <= .2) continue; c.globalAlpha = Math.pow(a, 3) * .9; c.fillRect(p.x - p.w / 2 + Math.sin(t * .7 + p.ph) * 3 * U, p.y, p.w, Math.max(1, U)); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  } };
}

/* ---------- Neon sokak (kullanıcının fotoğrafı üstünde animasyon) ---------- */
// görsel yalnız bu sahne seçilince yüklenir
const IMGS = {};
function loadImg(src){
  if (!IMGS[src]){
    const im = new Image(), rec = { im, ok: false, done: false, p: null };
    rec.p = new Promise(res => { im.onload = () => { rec.ok = rec.done = true; res(im); }; im.onerror = () => { rec.done = true; res(null); }; });
    im.decoding = 'async'; im.src = src; IMGS[src] = rec;
  }
  return IMGS[src];
}
// görseldeki neon pikselleri: parlak ve doygun olanlar → ekleme (parlatma) ve karartma tuvalleri + titreşim bölgeleri
function neonAnalyze(im){
  const iw = im.naturalWidth, ih = im.naturalHeight, src = mk(iw, ih), sg = c2(src); sg.drawImage(im, 0, 0);
  const d = sg.getImageData(0, 0, iw, ih), p = d.data, add = new ImageData(iw, ih), dim = new ImageData(iw, ih), A = add.data, Dm = dim.data;
  const GX = 32, GY = 18, cw = iw / GX, chh = ih / GY, cell = new Float32Array(GX * GY * 4), sparks = [];
  for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++){
    const q = (y * iw + x) * 4, r = p[q], g = p[q + 1], b = p[q + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx ? (mx - mn) / mx : 0, v = mx / 255;
    const a = clamp((v - .55) / .3, 0, 1) * clamp((sat - .3) / .3, 0, 1);
    if (a > 0){
      A[q] = r; A[q + 1] = g; A[q + 2] = b; A[q + 3] = a * 255;
      Dm[q] = r * .25; Dm[q + 1] = g * .25; Dm[q + 2] = b * .25; Dm[q + 3] = a * 255;
      const ci = (((y / chh) | 0) * GX + ((x / cw) | 0)) * 4; cell[ci] += a; cell[ci + 1] += r * a; cell[ci + 2] += g * a; cell[ci + 3] += b * a;
    }
    // ıslak zemin parıltıları (alt bölge, parlak noktalar)
    if (y > ih * .78 && v > .62 && (x + y * 7) % 23 === 0) sparks.push(x, y, r, g, b);
  }
  const addC = mk(iw, ih), dimC = mk(iw, ih); c2(addC).putImageData(add, 0, 0); c2(dimC).putImageData(dim, 0, 0);
  const bloom = mk(iw / 8, ih / 8), bg2 = c2(bloom); bg2.drawImage(addC, 0, 0, bloom.width, bloom.height);
  const cells = [];
  for (let i = 0; i < GX * GY; i++){ const s = cell[i * 4]; if (s > cw * chh * .05) cells.push({ i, s, col: [cell[i * 4 + 1] / s, cell[i * 4 + 2] / s, cell[i * 4 + 3] / s].map(Math.round).join(',') }); }
  cells.sort((a, b) => b.s - a.s);
  const regions = cells.slice(0, 18).map(c => {
    const r = { x: Math.floor((c.i % GX) * cw), y: Math.floor(Math.floor(c.i / GX) * chh), w: Math.ceil(cw), h: Math.ceil(chh), col: c.col, rate: rnd(.03, .12), ph: R() * 40, hard: R() < .35, sp: rnd(1.5, 3.5) };
    r.add = mk(r.w, r.h); c2(r.add).drawImage(addC, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    r.dim = mk(r.w, r.h); c2(r.dim).drawImage(dimC, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    return r;
  });
  // taban: görsel + yumuşak neon parıltısı tek tuvalde (Ken Burns yeniden çiziminde tek kopya)
  const base = mk(iw, ih), bb = c2(base); bb.drawImage(src, 0, 0); bb.globalCompositeOperation = 'lighter'; bb.globalAlpha = .55; bb.imageSmoothingQuality = 'high'; bb.drawImage(bloom, 0, 0, iw, ih);
  const sp = []; for (let i = 0; i < sparks.length && sp.length < 170 * 5; i += 5 * Math.max(1, Math.floor(sparks.length / 5 / 170))) sp.push(sparks.slice(i, i + 5));
  return { iw, ih, base, regions, sparks: sp };
}
let NEON_INFO = null;
const NEON_URL = (() => { try { return new URL('../img/neon-sokak.webp', document.currentScript.src).href; } catch(e){ return 'img/neon-sokak.webp'; } })();
function sceneNeonSokak(W, H, o){
  const u = o.u, U = Math.max(.5, u), A = W * H / 1.04e6 * o.q;
  const L = loadImg(NEON_URL);
  let ready = false, N = null, cache = null, cg = null, lastKey = '', T = null;
  const ph = R() * 100;
  function init(){
    if (!L.ok) return;
    if (!NEON_INFO) NEON_INFO = neonAnalyze(L.im);
    N = NEON_INFO; cache = mk(W, H); cg = c2(cache); ready = true;
  }
  if (L.ok) init(); else L.p.then(() => { init(); if (o.redraw) o.redraw(); });
  // sis şeridi (yatayda sarmalı)
  const fh = Math.ceil(H * .5), fog = mk(W, fh), fg = c2(fog);
  for (let i = 0; i < 40; i++){ const x = R() * W, y = fh * rnd(.25, .8), rx = W * rnd(.08, .2), ry = rx * rnd(.12, .25), a = rnd(.05, .12), c = pick(['150,170,210', '170,150,210', '140,190,210']); for (const xx of [x - W, x, x + W]) sprite(fg, glow(c, 's'), xx, y, rx, ry, a); }
  fg.globalAlpha = 1;
  // yağmur: üç derinlik
  const NR = Math.round(300 * clamp(A, .35, 1.3)), rx = new Float32Array(NR), ry = new Float32Array(NR), rl = new Float32Array(NR), rv = new Float32Array(NR), rd = new Uint8Array(NR);
  for (let i = 0; i < NR; i++){ const d = i < NR * .15 ? 2 : i < NR * .5 ? 1 : 0; rd[i] = d; rx[i] = R() * W * 1.15; ry[i] = R() * H; rl[i] = [rnd(7, 12), rnd(14, 22), rnd(26, 40)][d] * U; rv[i] = [rnd(450, 600), rnd(700, 900), rnd(1000, 1300)][d] * U; }
  const rip = [];
  const cars = [{ p: R(), sp: rnd(.035, .05), y: rnd(.08, .16), dir: 1, s: rnd(.9, 1.2) }, { p: R(), sp: rnd(.025, .04), y: rnd(.2, .3), dir: -1, s: rnd(.6, .8) }];
  const wl = glow('255,250,240', 'h'), redS = glow('255,50,70', 'h'), cyS = glow('0,220,255', 's');
  function xf(t){
    const z = 1.03 + .03 * Math.sin(t * TAU / 100 + ph), s = Math.max(W / N.iw, H / N.ih) * z;
    let dx = (W - N.iw * s) / 2 + Math.sin(t * TAU / 120 + ph) * W * .015, dy = (H - N.ih * s) / 2 + Math.cos(t * TAU / 120 + ph) * H * .015;
    dx = clamp(dx, W - N.iw * s, 0); dy = clamp(dy, H - N.ih * s, 0);
    return { s, dx, dy };
  }
  return { draw(c, t, dt, still){
    if (!ready){
      c.fillStyle = vgrad(c, 0, H, [[0, '#0c0a1e'], [.6, '#1b0f2e'], [1, '#07060d']]); c.fillRect(0, 0, W, H);
    } else {
      // Ken Burns: dönüşüm ~0.6 px değişince önbellek yeniden çizilir
      const X = xf(t), key = Math.round(X.s * N.iw) + ',' + Math.round(X.dx) + ',' + Math.round(X.dy);
      if (key !== lastKey){
        lastKey = key; T = X;
        cg.setTransform(1, 0, 0, 1, 0, 0); cg.globalAlpha = 1; cg.globalCompositeOperation = 'source-over';
        cg.imageSmoothingQuality = 'high'; cg.drawImage(N.base, T.dx, T.dy, N.iw * T.s, N.ih * T.s);
      }
      c.drawImage(cache, 0, 0);
      // neon titreşimi: bölge bölge parlatma / kısa sönmeler
      for (const r of N.regions){
        const ft = (t * r.rate + r.ph) % 1; let mode = 0, a = 0;
        if (ft < .035){ mode = Math.sin(t * 60 * r.sp) > (r.hard ? -.2 : .3) ? -1 : 1; a = mode < 0 ? .9 : .5; }
        else { mode = 1; a = .14 + .12 * Math.sin(t * r.sp + r.ph); }
        const dx = T.dx + r.x * T.s, dy = T.dy + r.y * T.s, ww = r.w * T.s, hh = r.h * T.s;
        if (mode < 0){ c.globalAlpha = a; c.drawImage(r.dim, dx, dy, ww, hh); }
        else { c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.drawImage(r.add, dx, dy, ww, hh); c.globalCompositeOperation = 'source-over'; }
      }
      c.globalAlpha = 1;
      // ıslak zemin parıltıları
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < N.sparks.length; i++){
        const s = N.sparks[i], k = Math.sin(t * (1.3 + (i % 7) * .4) + i * 2.1); if (k < .55) continue;
        c.globalAlpha = (k - .55) * 1.6; c.fillStyle = 'rgb(' + s[2] + ',' + s[3] + ',' + s[4] + ')';
        c.fillRect(T.dx + s[0] * T.s - 2 * U, T.dy + s[1] * T.s, 4 * U, Math.max(1, .8 * U));
      }
      // uçan arabalar: görüntüdeki gökyüzü aralığında
      for (const k of cars){
        if (!still) k.p += k.sp * dt; if (k.p > 1.15){ k.p = -.15; k.y = rnd(.07, .3); }
        const pp = k.dir > 0 ? k.p : 1 - k.p, ix = N.iw * (.39 + .26 * pp), iy = N.ih * (k.y - .03 * pp);
        const x = T.dx + ix * T.s, y = T.dy + iy * T.s, fade = clamp(Math.min(k.p + .1, 1.1 - k.p) * 5, 0, 1), s = k.s * U;
        if (fade <= 0) continue;
        sprite(c, cyS, x, y + 2 * s, 9 * s, 3 * s, .5 * fade);
        sprite(c, wl, x + k.dir * 5 * s, y, 4 * s, 3 * s, .9 * fade);
        sprite(c, redS, x - k.dir * 5 * s, y, 3 * s, 2.5 * s, .8 * fade);
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      // su birikintisi halkaları (zemin bölgesinde, perspektifle basık)
      if (!still){ for (let n = dt * 22; n > 0; n--) if (R() < n){ const iy = rnd(.8, .99); rip.push({ ix: N.iw * (.5 + (R() - .5) * (.25 + (iy - .8) * 2.6)), iy: N.ih * iy, age: 0, life: rnd(.5, .9), r: rnd(5, 12) * (.6 + (iy - .8) * 3) }); } }
      c.strokeStyle = 'rgba(200,215,255,.5)'; c.lineWidth = Math.max(.8, .9 * U);
      for (let i = rip.length - 1; i >= 0; i--){
        const p = rip[i]; p.age += dt; if (p.age > p.life){ rip.splice(i, 1); continue; }
        const k = p.age / p.life, rr = p.r * U * (.3 + k);
        c.globalAlpha = (1 - k) * .55; c.beginPath(); c.ellipse(T.dx + p.ix * T.s, T.dy + p.iy * T.s, rr, rr * .28, 0, 0, TAU); c.stroke();
      }
      c.globalAlpha = 1;
    }
    // sürüklenen sis
    const fo = Math.round(t * 9 * U) % W, fy = Math.round(H * .3);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = .55;
    c.drawImage(fog, 0, 0, W - fo, fh, fo, fy, W - fo, fh); if (fo > 0) c.drawImage(fog, W - fo, 0, fo, fh, 0, fy, fo, fh);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    // yağmur
    for (let d = 0; d < 3; d++){
      c.strokeStyle = ['rgba(170,190,230,.16)', 'rgba(190,205,240,.22)', 'rgba(210,220,255,.3)'][d]; c.lineWidth = [.8, 1, 1.5][d] * Math.max(.8, U); c.beginPath();
      for (let i = 0; i < NR; i++){
        if (rd[i] !== d) continue;
        if (!still){ ry[i] += rv[i] * dt; rx[i] -= rv[i] * .12 * dt; if (ry[i] > H){ ry[i] = -rl[i]; rx[i] = R() * W * 1.15; } }
        c.moveTo(rx[i], ry[i]); c.lineTo(rx[i] - .12 * rl[i], ry[i] + rl[i]);
      }
      c.stroke();
    }
  }, thumbAsync: !L.done ? L.p : null };
}

/* ---------- Kapadokya (gün doğumu, balonlar, peri bacaları) ---------- */
const BALLOON_PAL = [['#e63946', '#f1faee', '#e63946', '#ffb703'], ['#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'], ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'],
  ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'], ['#d62828', '#f77f00', '#fcbf49', '#eae2b7'], ['#3a0ca3', '#f72585', '#4cc9f0', '#f72585'], ['#ffd60a', '#003566', '#ffd60a', '#ffc300']];
function balloonSprite(Rb, pal, haze, sunLeft){
  const w = Math.ceil(Rb * 2.4), h = Math.ceil(Rb * 3.4), c = mk(w, h), g = c2(c), cx = w / 2, cy = Rb * 1.1;
  g.save(); g.beginPath();
  g.moveTo(cx - Rb * .32, cy + Rb * 1.18);
  g.bezierCurveTo(cx - Rb * 1.1, cy + Rb * .55, cx - Rb * 1.12, cy - Rb * .2, cx - Rb, cy - Rb * .35);
  g.arc(cx, cy - Rb * .05, Rb * 1.04, Math.PI * 1.08, Math.PI * 1.92);
  g.bezierCurveTo(cx + Rb * 1.12, cy - Rb * .2, cx + Rb * 1.1, cy + Rb * .55, cx + Rb * .32, cy + Rb * 1.18);
  g.closePath(); g.clip();
  const n = 12;
  for (let i = 0; i < n; i++){ const a0 = -Math.PI / 2 + Math.PI * i / n, a1 = a0 + Math.PI / n; g.fillStyle = pal[i % pal.length]; g.fillRect(cx + Math.sin(a0) * Rb * 1.15, 0, (Math.sin(a1) - Math.sin(a0)) * Rb * 1.15 + .6, h); }
  const sx = sunLeft ? cx - Rb * .55 : cx + Rb * .55, rg = g.createRadialGradient(sx, cy - Rb * .4, Rb * .1, cx, cy, Rb * 1.4);
  rg.addColorStop(0, 'rgba(255,240,210,.45)'); rg.addColorStop(.45, 'rgba(255,200,150,0)'); rg.addColorStop(1, 'rgba(40,20,50,.55)');
  g.fillStyle = rg; g.fillRect(0, 0, w, h);
  if (haze > 0){ g.fillStyle = 'rgba(214,160,170,' + haze + ')'; g.fillRect(0, 0, w, h); }
  g.restore();
  g.strokeStyle = 'rgba(40,25,30,' + (.7 - haze * .5) + ')'; g.lineWidth = Math.max(.5, Rb * .03);
  g.beginPath(); g.moveTo(cx - Rb * .3, cy + Rb * 1.18); g.lineTo(cx - Rb * .16, cy + Rb * 1.55); g.moveTo(cx + Rb * .3, cy + Rb * 1.18); g.lineTo(cx + Rb * .16, cy + Rb * 1.55); g.stroke();
  g.fillStyle = haze > .3 ? '#7a5a5a' : '#4a3226'; g.fillRect(cx - Rb * .17, cy + Rb * 1.52, Rb * .34, Rb * .25);
  return { c, w, h, mouthY: cy + Rb * 1.2 };
}
function chimney(g, x, base, h, w, sunLeft, lit, shade, cap){
  const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0), L = sunLeft ? lit : shade, Rr = sunLeft ? shade : lit;
  gr.addColorStop(0, L); gr.addColorStop(.42, L); gr.addColorStop(.62, Rr); gr.addColorStop(1, Rr);
  g.fillStyle = gr; g.beginPath();
  g.moveTo(x - w / 2, base); g.bezierCurveTo(x - w * .32, base - h * .35, x - w * .1, base - h * .7, x - w * .08, base - h * .86);
  g.lineTo(x + w * .08, base - h * .86); g.bezierCurveTo(x + w * .1, base - h * .7, x + w * .32, base - h * .35, x + w / 2, base); g.closePath(); g.fill();
  g.save(); g.clip(); g.strokeStyle = 'rgba(60,30,40,.12)'; g.lineWidth = Math.max(.5, h * .006);
  g.beginPath(); for (let k = 1; k < 7; k++){ const yy = base - h * k / 8; g.moveTo(x - w, yy); g.lineTo(x + w, yy + h * .01); } g.stroke(); g.restore();
  g.fillStyle = cap; g.beginPath(); g.ellipse(x, base - h * .885, w * .2, h * .045, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(x, base - h * .9, w * .17, h * .08, 0, Math.PI, 0); g.fill();
}
function sceneKapadokya(W, H, o){
  const u = o.u, U = Math.max(.5, u), A = W * H / 1.04e6 * o.q, land = W >= H, m = Math.min(W, H);
  const yh = H * (land ? .7 : .68), sunX = W * (land ? .74 : .66), sunY = yh - H * .02, sunLeft = sunX < W / 2;
  const bg = mk(W, H), g = c2(bg);
  g.fillStyle = vgrad(g, 0, yh, [[0, '#1f2d5c'], [.35, '#53598f'], [.6, '#b98199'], [.8, '#f0a07a'], [.93, '#ffcf96'], [1, '#ffe2b0']]); g.fillRect(0, 0, W, yh + 2);
  g.fillStyle = '#8a5f6a'; g.fillRect(0, yh, W, H - yh);
  g.globalCompositeOperation = 'lighter';
  sprite(g, glow('255,180,110', 's'), sunX, sunY, m * .9, m * .5, .4);
  sprite(g, glow('255,225,170', 's'), sunX, sunY, m * .22, m * .22, .6);
  sprite(g, glow('255,250,225', 'h'), sunX, sunY, m * .05, m * .05, 1);
  // ışık huzmeleri
  for (let i = 0; i < 7; i++){ const a = -Math.PI + rnd(.15, Math.PI - .15), L = Math.hypot(W, H); g.globalAlpha = 1; g.fillStyle = 'rgba(255,220,170,.022)'; g.beginPath(); g.moveTo(sunX, sunY); g.lineTo(sunX + Math.cos(a - .03) * L, sunY + Math.sin(a - .03) * L); g.lineTo(sunX + Math.cos(a + .03) * L, sunY + Math.sin(a + .03) * L); g.fill(); }
  // pembe-turuncu ince bulutlar
  for (let i = 0; i < 26; i++){ const rx = W * rnd(.05, .15), y = yh * rnd(.15, .7); sprite(g, glow(pick(['255,170,150', '255,190,160', '220,150,180']), 's'), R() * W, y, rx, rx * rnd(.05, .1), rnd(.06, .14)); }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  // uzak düz tepeli platolar (pus)
  const mesa = ridge(W, yh, H * .07, .3, 10 * U); for (let i = 1; i < mesa.length; i += 2) mesa[i] = yh - Math.round((yh - mesa[i]) / (H * .018)) * H * .018;
  g.fillStyle = vgrad(g, yh - H * .08, yh, [[0, '#b98593'], [1, '#c4929a']]); fillPts(g, mesa, yh + 2);
  // vadi zemini ve katmanlı peri bacaları
  const layers = [{ y: yh + H * .03, n: 26, hm: [24, 46], wm: [10, 18], lit: '#d8a690', shade: '#a77b88', cap: '#8f6672', ground: '#b88a8c' },
    { y: yh + H * .11, n: 16, hm: [48, 90], wm: [18, 32], lit: '#efb98e', shade: '#a26a6e', cap: '#6f4a52', ground: '#a87674' }];
  layers.forEach((Ly, li) => {
    g.fillStyle = vgrad(g, Ly.y - H * .04, H, [[0, Ly.ground], [1, '#5e3e48']]);
    fillPts(g, ridge(W, Ly.y, H * .035, .8, 8 * U), H);
    for (let i = 0; i < Ly.n * clamp(W / 1366 * 1.4, .5, 1.3); i++){
      const x = R() * W, hh = rnd(Ly.hm[0], Ly.hm[1]) * U, ww = hh * rnd(.38, .55);
      chimney(g, x, Ly.y + rnd(-4, 6) * U, hh, ww, sunLeft, Ly.lit, Ly.shade, Ly.cap);
    }
    g.globalCompositeOperation = 'lighter'; sprite(g, glow('255,200,170', 's'), W * .5, Ly.y - H * .01, W * .8, H * .03, li ? .08 : .14); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  });
  dither(g, W, H, .03);
  // ön plan: büyük peri bacaları kenarlarda
  const fgTop = Math.floor(H * .5), fg = mk(W, H - fgTop), f = c2(fg); f.translate(0, -fgTop);
  f.fillStyle = vgrad(f, H * .82, H, [[0, '#8e5e5e'], [1, '#43262e']]); fillPts(f, ridge(W, H * .93, H * .06, .7, 8 * U), H);
  for (const [x, hh] of [[W * .04, H * .38], [W * .14, H * .27], [W * .9, H * .33], [W * .99, H * .42], [W * .8, H * .21]])
    chimney(f, x, H * 1.01, hh, hh * .42, sunLeft, '#f2b98a', '#8a5860', '#4a2e36');
  // balonlar
  const NB = Math.round(clamp(14 * Math.sqrt(A), 6, 18)), balloons = [];
  for (let i = 0; i < NB; i++){
    const z = i / (NB - 1 || 1), Rb = (5 + 26 * Math.pow(z, 1.6)) * U * (land ? 1 : .9);
    const sp = balloonSprite(Rb, BALLOON_PAL[i % BALLOON_PAL.length], (1 - z) * .45, sunLeft);
    balloons.push({ z, sp, x: R() * W, y: yh * rnd(z < .4 ? .55 : .1, z < .4 ? .95 : .8), vx: (1.5 + 6 * z) * U, vy: -(.6 + 2.2 * z) * U, ph: R() * TAU, burn: rnd(2, 10), on: 0 });
  }
  const fire = glow('255,170,60', 's');
  return { draw(c, t, dt, still){
    c.drawImage(bg, 0, 0);
    const drawB = near => { for (const b of balloons){
      if ((b.z > .55) !== near) continue;
      if (!still){
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x - b.sp.w > W || b.y < -b.sp.h){ b.x = -b.sp.w * .6; b.y = yh * rnd(b.z < .4 ? .6 : .3, .95); }
        b.burn -= dt; if (b.burn < 0){ b.on = rnd(.6, 1.6); b.burn = rnd(5, 12); } if (b.on > 0) b.on -= dt;
      }
      const x = b.x + Math.sin(t * .3 + b.ph) * 4 * U, y = b.y + Math.sin(t * .5 + b.ph) * 3 * U;
      c.drawImage(b.sp.c, x - b.sp.w / 2, y - b.sp.h / 2);
      if (b.on > 0 || (still && b.z > .8)){ c.globalCompositeOperation = 'lighter'; const r = b.sp.w * .22 * (.8 + .4 * Math.sin(t * 40 + b.ph)); sprite(c, fire, x, y - b.sp.h / 2 + b.sp.mouthY, r, r * 1.3, .8); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    } };
    drawB(false);
    c.drawImage(fg, 0, fgTop);
    drawB(true);
  } };
}

/* ---------- Ateşböcekleri (gece ormanı) ---------- */
function sceneAtes(W, H, o){
  const u = o.u, U = Math.max(.5, u), A = W * H / 1.04e6 * o.q, land = W >= H, m = Math.min(W, H);
  const bg = mk(W, H), g = c2(bg);
  g.fillStyle = vgrad(g, 0, H, [[0, '#01040a'], [.35, '#041019'], [.6, '#082028'], [.75, '#0b2a31'], [1, '#03090c']]); g.fillRect(0, 0, W, H);
  stars(g, 380 * A, 0, 0, W, H * .4, { u, max: .7, big: .2 });
  const mx = W * (land ? .78 : .7), my = H * .14, mr = Math.max(6, m * .03);
  g.globalCompositeOperation = 'lighter'; sprite(g, glow('150,200,220', 's'), mx, my, mr * 14, mr * 14, .18); sprite(g, glow('220,240,240', 's'), mx, my, mr * 3, mr * 3, .4); sprite(g, glow('245,250,240', 'h'), mx, my, mr * 1.2, mr * 1.2, 1); g.globalAlpha = 1;
  // ay huzmeleri
  for (let i = 0; i < 6; i++){ const x0 = mx + rnd(-W * .3, W * .1), gr = g.createLinearGradient(x0, my, x0 - W * .25, H); gr.addColorStop(0, 'rgba(160,210,220,.03)'); gr.addColorStop(1, 'rgba(160,210,220,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x0, my); g.lineTo(x0 - W * .3 - rnd(0, 60) * U, H); g.lineTo(x0 - W * .2 + rnd(0, 60) * U, H); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  // ağaç katmanları: uzak (puslu) → yakın (koyu)
  const rows = [{ y: .5, h: [40, 90], col: '#123540', fog: .55 }, { y: .62, h: [70, 150], col: '#0a1e25', fog: .35 }, { y: .76, h: [110, 220], col: '#050f13', fog: 0 }];
  rows.forEach(r => {
    const yb = H * r.y;
    g.fillStyle = r.col; g.fillRect(0, yb, W, H - yb);
    for (let x = -10 * U; x < W + 20 * U; x += rnd(6, 16) * U){ const th = rnd(r.h[0], r.h[1]) * U * (land ? 1 : .8); spruce(g, x, yb + 4 * U, th, th * rnd(.3, .42)); }
    g.fillStyle = vgrad(g, yb - H * .12, yb + H * .05, [[0, 'rgba(110,170,175,0)'], [1, 'rgba(110,170,175,' + r.fog * .35 + ')']]); g.fillRect(0, yb - H * .12, W, H * .17);
  });
  dither(g, W, H, .03);
  // ön plan: kenarlarda kalın gövdeler, altta çimen
  const fgTop = 0, fg = mk(W, H), f = c2(fg);
  f.fillStyle = '#010304';
  for (const [x, w] of [[W * .03, 46], [W * .11, 22], [W * .93, 52], [W * .85, 18]]){ const ww = w * U; f.fillRect(x - ww / 2, 0, ww, H); f.beginPath(); f.moveTo(x - ww * 1.6, H); f.quadraticCurveTo(x - ww * .5, H * .9, x - ww / 2, H * .75); f.lineTo(x + ww / 2, H * .75); f.quadraticCurveTo(x + ww * .5, H * .9, x + ww * 1.6, H); f.fill(); }
  f.fillStyle = '#020607'; fillPts(f, ridge(W, H * .97, H * .05, 1, 6 * U), H);
  f.strokeStyle = '#020607'; f.lineWidth = Math.max(1, 1.4 * U); f.beginPath();
  for (let x = 0; x < W; x += rnd(2, 5) * U){ const hh = rnd(10, 34) * U, y0 = H * .97 + rnd(-6, 10) * U, bend = rnd(-8, 8) * U; f.moveTo(x, y0); f.quadraticCurveTo(x + bend * .3, y0 - hh * .6, x + bend, y0 - hh); }
  f.stroke();
  // ateşböcekleri
  const NF = Math.round(90 * clamp(A, .35, 1.3)), ff = [];
  for (let i = 0; i < NF; i++){ const z = Math.pow(R(), 1.4); ff.push({ z, bx: R() * W, by: H * rnd(.45, .97), ax: rnd(20, 70) * U, ay: rnd(10, 35) * U, fx: rnd(.05, .18), fy: rnd(.08, .25), p1: R() * TAU, p2: R() * TAU, P: rnd(2.2, 6), on: rnd(.5, 1.3), ph: R() * 10, dr: rnd(-6, 6) * U }); }
  const halo = glow('180,255,90', 's'), core = glow('240,255,190', 'h');
  const drawF = (c, t, front, still) => {
    c.globalCompositeOperation = 'lighter';
    for (const f2 of ff){
      if ((f2.z > .8) !== front) continue;
      const q = (t + f2.ph) % f2.P, b = q < f2.on ? Math.pow(Math.sin(Math.PI * q / f2.on), 1.6) : still && f2.z > .3 ? .7 : 0, br = .06 + .94 * b;
      const x = ((f2.bx + f2.dr * t + f2.ax * Math.sin(t * f2.fx + f2.p1) + f2.ax * .4 * Math.sin(t * f2.fx * 2.7 + f2.p2)) % (W + 40 * U) + W + 40 * U) % (W + 40 * U) - 20 * U;
      const y = f2.by + f2.ay * Math.sin(t * f2.fy + f2.p2) + f2.ay * .5 * Math.sin(t * f2.fy * 2.3 + f2.p1);
      const s = (.5 + f2.z) * U;
      sprite(c, halo, x, y, 22 * s, 22 * s, .45 * br);
      sprite(c, core, x, y, 4 * s, 4 * s, br);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  };
  return { draw(c, t, dt, still){
    c.drawImage(bg, 0, 0);
    drawF(c, t, false, still);
    c.drawImage(fg, 0, fgTop);
    drawF(c, t, true, still);
  } };
}

/* ---------- Neon dalgalar (soyut) ---------- */
function sceneDalga(W, H, o){
  const u = o.u, U = Math.max(.5, u), A = W * H / 1.04e6 * o.q;
  const bg = mk(W, H), g = c2(bg);
  const gr = g.createRadialGradient(W * .5, H * .55, 0, W * .5, H * .55, Math.hypot(W, H) * .6);
  gr.addColorStop(0, '#1a0b33'); gr.addColorStop(.55, '#0b0620'); gr.addColorStop(1, '#03020a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++){ const r = rnd(.2, .45) * Math.max(W, H); sprite(g, glow(pick(['120,40,200', '40,90,220', '200,40,150']), 's'), R() * W, R() * H, r, r * .6, rnd(.04, .08)); }
  g.globalCompositeOperation = 'source-over';
  stars(g, 300 * A, 0, 0, W, H, { u, max: .5, big: .1 });
  dither(g, W, H, .035);
  const ribs = [[290, 190], [200, 320], [170, 60], [320, 210]].slice(0, W < 700 ? 3 : 4).map((hs, i) => ({
    y: H * (.28 + i * .13 + rnd(-.03, .03)), a1: rnd(.05, .1) * H, a2: rnd(.02, .05) * H, k1: TAU / (W * rnd(.7, 1.3)), k2: TAU / (W * rnd(.3, .5)),
    s1: rnd(.25, .45) * (R() < .5 ? -1 : 1), s2: rnd(.4, .7), n: W < 700 ? 5 : 6, spread: rnd(2.5, 5) * U, h: hs }));
  const grads = ribs.map(r => { const lg = g.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, 'hsla(' + r.h[0] + ',100%,62%,0)'); lg.addColorStop(.2, 'hsla(' + r.h[0] + ',100%,62%,.9)'); lg.addColorStop(.6, 'hsla(' + r.h[1] + ',100%,62%,.9)'); lg.addColorStop(1, 'hsla(' + r.h[1] + ',100%,62%,0)'); return lg; });
  const step = Math.max(16, W / 36);
  const dust = Array.from({ length: Math.round(50 * clamp(A, .3, 1.3)) }, () => ({ x: R() * W, y: R() * H, v: rnd(4, 14) * U, r: rnd(1, 2.6) * U, ph: R() * TAU, c: glow(pick(['255,120,220', '120,200,255', '200,150,255']), 'h') }));
  // dalgalar 15 Hz'de önbelleğe çizilir; tozlar her karede
  const cache = mk(W, H), cg = c2(cache); let fr = 0;
  return { draw(c0, t, dt, still){
    if (still || !(fr++ & 1)){
    const c = cg; c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.drawImage(bg, 0, 0);
    c.globalCompositeOperation = 'lighter';
    ribs.forEach((r, ri) => {
      const yAtX = (x, ph) => r.y + r.a1 * Math.sin(x * r.k1 + t * r.s1 + ph) + r.a2 * Math.sin(x * r.k2 - t * r.s2 + ph * 1.7);
      // geniş, soluk parıltı
      c.strokeStyle = grads[ri]; c.globalAlpha = .1; c.lineWidth = 26 * U; c.beginPath();
      for (let x = 0; x <= W + step; x += step){ const y = yAtX(x, 0); if (x) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke();
      // ince ipek çizgiler (tek yolda)
      c.globalAlpha = .7; c.lineWidth = Math.max(.9, 1.3 * U); c.beginPath();
      for (let i = 0; i < r.n; i++){
        const ph = i * .14, off = (i - r.n / 2) * r.spread * (1 + .6 * Math.sin(t * .5 + i));
        for (let x = 0; x <= W + step; x += step){ const y = yAtX(x, ph) + off; if (x) c.lineTo(x, y); else c.moveTo(x, y); }
      }
      c.stroke();
    });
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    const c = c0; c.drawImage(cache, 0, 0); c.globalCompositeOperation = 'lighter';
    for (const d of dust){
      if (!still){ d.y -= d.v * dt; if (d.y < -10) { d.y = H + 10; d.x = R() * W; } }
      sprite(c, d.c, d.x + Math.sin(t * .4 + d.ph) * 8 * U, d.y, d.r * 2.5, d.r * 2.5, .5 + .4 * Math.sin(t * 2 + d.ph));
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  } };
}

/* =================== FANTASTİK PAKET (özgün tasarımlar) =================== */
// sarmalı bulut şeridi
function cloudBand(W, ch, n, cols, aMin, aMax, flat){
  const c = mk(W, ch), g = c2(c);
  for (let i = 0; i < n; i++){
    const x = R() * W, y = ch * rnd(.2, .8), rx = W * rnd(.05, .14), ry = rx * rnd(flat || .1, (flat || .1) * 2), a = rnd(aMin, aMax), col = pick(cols);
    for (const xx of [x - W, x, x + W]) sprite(g, glow(col, 's'), xx, y, rx, ry, a);
  }
  g.globalAlpha = 1; return c;
}
function wrapBlit(c, cv, off, y, W){
  const w = cv.width, h = cv.height; off = ((Math.round(off) % w) + w) % w;
  c.drawImage(cv, 0, 0, w - off, h, off, y, w - off, h); if (off > 0) c.drawImage(cv, w - off, 0, off, h, 0, y, off, h);
}
// basit parçacık sistemi (yükselen kıvılcım / toz)
function sparkNew(o){ return { x: o.x + gauss() * o.sx, y: o.y + gauss() * o.sy, vx: rnd(-o.vx, o.vx), vy: -rnd(o.vy * .5, o.vy), age: 0, life: rnd(o.life * .5, o.life), r: rnd(o.r * .5, o.r) }; }

/* ---------- Ejderha Vadisi ---------- */
// özgün ejderha silueti: f = kanat konumu (-1 aşağı … 1 yukarı)
function dragonWing(c, f, back){
  const tip = [-.55 + .12 * f, -1.15 * f - .05], wr = [.22, -.62 * f - .12], rb = back ? [-.18, -.02] : [-.24, -.04];
  const f1 = [tip[0] * .62 + rb[0] * .38, tip[1] * .55 + rb[1] * .45], f2 = [tip[0] * .3 + rb[0] * .7, tip[1] * .28 + rb[1] * .72];
  c.beginPath(); c.moveTo(.2, -.08); c.quadraticCurveTo(.3, wr[1] * .5 - .05, wr[0], wr[1]); c.lineTo(tip[0], tip[1]);
  const pull = (a, b) => [(a[0] + b[0]) / 2 + .08, (a[1] + b[1]) / 2 + .1 * Math.sign(f || 1) * .6];
  let p = pull(tip, f1); c.quadraticCurveTo(p[0], p[1], f1[0], f1[1]);
  p = pull(f1, f2); c.quadraticCurveTo(p[0], p[1], f2[0], f2[1]);
  p = pull(f2, rb); c.quadraticCurveTo(p[0], p[1], rb[0], rb[1]);
  c.closePath(); c.fill();
  c.beginPath(); c.moveTo(wr[0], wr[1]); c.lineTo(f1[0], f1[1]); c.moveTo(wr[0], wr[1]); c.lineTo(f2[0], f2[1]); c.stroke();
}
function drawDragon(c, x, y, s, flap, bank, dir, body, far){
  c.save(); c.translate(x, y); c.rotate(bank); c.scale(dir * s, s);
  const f = Math.sin(flap);
  c.lineWidth = .025; c.strokeStyle = far; c.fillStyle = far;
  dragonWing(c, Math.sin(flap - .35) * .9 - .05, true);
  c.fillStyle = body; c.strokeStyle = body;
  // gövde, boyun, baş, kuyruk
  c.beginPath(); c.ellipse(0, 0, .52, .13, -.05, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(.38, -.1); c.quadraticCurveTo(.72, -.34, .98, -.37); c.lineTo(1, -.28); c.quadraticCurveTo(.74, -.2, .44, .06); c.fill();
  c.beginPath(); c.moveTo(.96, -.41); c.lineTo(1.2, -.35); c.lineTo(1.29, -.3); c.lineTo(1.17, -.26); c.lineTo(1.0, -.25); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(1.0, -.39); c.lineTo(.9, -.53); c.lineTo(1.04, -.41); c.moveTo(1.06, -.4); c.lineTo(1.0, -.56); c.lineTo(1.1, -.39); c.fill();
  c.beginPath(); c.moveTo(-.42, -.07); c.quadraticCurveTo(-1, -.14, -1.58, .1); c.lineTo(-1.6, .15); c.quadraticCurveTo(-1, .02, -.42, .08); c.fill();
  c.beginPath(); c.moveTo(-1.56, .07); c.lineTo(-1.76, .18); c.lineTo(-1.55, .21); c.fill();
  c.beginPath(); c.moveTo(.2, .08); c.lineTo(.28, .22); c.lineTo(.18, .24); c.lineTo(.12, .1); c.moveTo(-.22, .09); c.lineTo(-.16, .23); c.lineTo(-.27, .24); c.lineTo(-.32, .1); c.fill();
  // sırt dikenleri
  c.beginPath(); for (let k = 0; k < 6; k++){ const xx = .3 - k * .14; c.moveTo(xx, -.11); c.lineTo(xx - .04, -.17); c.lineTo(xx - .07, -.1); } c.fill();
  dragonWing(c, f, false);
  c.restore();
}
function sceneEjderha(W, H, o){
  const u = o.u, U = Math.max(.5, u), A = W * H / 1.04e6 * o.q, land = W >= H, m = Math.min(W, H);
  const yh = H * (land ? .62 : .6), sunX = W * (land ? .3 : .4), vx = W * (land ? .74 : .68);
  const bg = mk(W, H), g = c2(bg);
  g.fillStyle = vgrad(g, 0, H, [[0, '#120f33'], [.25, '#2e2252'], [.45, '#6a3560'], [.58, '#c25a5e'], [.66, '#f0915a'], [.75, '#5b3b55'], [1, '#1a1426']]); g.fillRect(0, 0, W, H);
  stars(g, 260 * A, 0, 0, W, H * .3, { u, max: .6, big: .2 });
  g.globalCompositeOperation = 'lighter';
  sprite(g, glow('255,170,100', 's'), sunX, yh, m * 1.1, m * .45, .35); sprite(g, glow('255,215,160', 's'), sunX, yh, m * .2, m * .16, .6);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  // sıradağlar: uzaktan yakına, puslu
  const ranges = [[yh - H * .02, H * .2, '#6e4664', '#8a5068'], [yh + H * .06, H * .2, '#4a3150', '#5b3656'], [yh + H * .16, H * .2, '#2c1f38', '#33223d'], [yh + H * .28, H * .18, '#160f1f', '#1b1224']];
  ranges.forEach(([yb, hm, c1, c3], i) => {
    if (i === 1){
      // yanardağ (uzak katmanın arkasında)
      g.fillStyle = vgrad(g, yb - H * .3, yb, [[0, '#3b2638'], [1, '#55344d']]);
      g.beginPath(); g.moveTo(vx - W * .2, yb); g.quadraticCurveTo(vx - W * .05, yb - H * .2, vx - W * .028, yb - H * .29); g.lineTo(vx + W * .028, yb - H * .29); g.quadraticCurveTo(vx + W * .05, yb - H * .2, vx + W * .2, yb); g.fill();
      g.strokeStyle = 'rgba(255,110,40,.35)'; g.lineWidth = 1.6 * U; g.beginPath();
      for (let k = 0; k < 4; k++){ let x = vx + rnd(-.02, .02) * W, y = yb - H * .29; g.moveTo(x, y); for (let j = 0; j < 8; j++){ x += rnd(-6, 6) * U + (x - vx) * .1; y += H * .025; g.lineTo(x, y); } }
      g.stroke();
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 18; k++){ const yy = yb - H * .32 - k * H * .025, rr = (20 + k * 7) * U; sprite(g, glow('120,90,110', 's'), vx + k * k * .9 * U, yy, rr, rr * .7, .05); }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
    const pts = peaks(W, yb, hm, .5 + i * .05, 7);
    g.fillStyle = vgrad(g, yb - hm, yb + H * .1, [[0, c1], [1, c3]]); fillPts(g, pts, H);
    g.fillStyle = vgrad(g, yb - H * .1, yb + H * .06, [[0, 'rgba(240,160,140,0)'], [.6, 'rgba(240,160,140,' + (.2 - i * .045) + ')'], [1, 'rgba(240,160,140,0)']]); g.fillRect(0, yb - H * .1, W, H * .16);
  });
  dither(g, W, H, .03);
  // en yakın sırt ön planda (ejderhanın önünden geçebilir)
  const fTop = Math.floor(yh + H * .18), fg = mk(W, H - fTop), f = c2(fg); f.translate(0, -fTop);
  f.fillStyle = '#0c0812'; fillPts(f, peaks(W, H * 1.01, H * .16, .55, 7), H);
  const clouds = cloudBand(W, Math.ceil(H * .3), 34, ['255,150,140', '210,120,150', '255,190,160', '150,100,150'], .06, .14, .12);
  const lava = glow('255,110,40', 's'), ember = glow('255,150,60', 'h');
  const embers = []; const eo = { x: vx, y: yh + H * .06 - H * .29, sx: 6 * U, sy: 2 * U, vx: 8 * U, vy: 30 * U, life: 5, r: 2.4 * U };
  for (let i = 0; i < 40; i++){ const e = sparkNew(eo); e.age = R() * e.life; embers.push(e); }
  const dr = { x: -W * .2, y0: H * .3, dir: 1, s: 50 * U, sp: 60 * U, wait: 0, ph: 0, glide: 0, bankT: 0 };
  const spawn = () => { dr.dir = R() < .5 ? 1 : -1; dr.s = rnd(55, 105) * U * (land ? 1 : .75); dr.x = dr.dir > 0 ? -dr.s * 2.2 : W + dr.s * 2.2; dr.y0 = H * rnd(.16, .42); dr.sp = rnd(50, 85) * U * (dr.s / (50 * U)); };
  spawn(); dr.x = W * .35;
  return { draw(c, t, dt, still){
    c.drawImage(bg, 0, 0);
    // yanardağ ağzı nabız gibi parlar, kıvılcımlar yükselir
    c.globalCompositeOperation = 'lighter';
    sprite(c, lava, eo.x, eo.y + 4 * U, 60 * U, 30 * U, .45 + .2 * Math.sin(t * 1.7) + .1 * Math.sin(t * 5.3));
    for (const e of embers){
      if (!still){ e.age += dt; e.x += (e.vx + Math.sin(t + e.y * .05) * 6 * U) * dt; e.y += e.vy * dt; if (e.age > e.life) Object.assign(e, sparkNew(eo)); }
      const k = e.age / e.life; sprite(c, ember, e.x, e.y, e.r * 2, e.r * 2, (1 - k) * .9);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    wrapBlit(c, clouds, t * 5 * U, H * .08, W);
    // ejderha
    if (!still){
      if (dr.wait > 0){ dr.wait -= dt; if (dr.wait <= 0) spawn(); }
      else { dr.x += dr.dir * dr.sp * dt; if (dr.x < -dr.s * 3 || dr.x > W + dr.s * 3){ dr.wait = rnd(3, 9); } }
      dr.glide -= dt; if (dr.glide < -rnd(3, 6)) dr.glide = rnd(1.5, 3);
      dr.ph += dt * (dr.glide > 0 ? .6 : 3.2);
      dr.bankT -= dt; if (dr.bankT < -rnd(6, 10)) dr.bankT = rnd(1.5, 2.5);
    }
    if (dr.wait <= 0 || still){
      const y = dr.y0 + Math.sin(dr.x / W * TAU * .8) * H * .05 + Math.sin(dr.ph) * dr.s * .06;
      const bank = Math.cos(dr.x / W * TAU * .8) * .08 * dr.dir + (dr.bankT > 0 ? Math.sin(dr.bankT / 2 * Math.PI) * .25 * dr.dir : 0);
      const fl = dr.glide > 0 ? .35 + Math.sin(dr.ph) * .15 : dr.ph;
      drawDragon(c, dr.x, y, dr.s, dr.glide > 0 ? Math.asin(clamp(fl, -1, 1)) : fl, bank, dr.dir, '#140c18', '#2a1a2c');
    }
    c.drawImage(fg, 0, fTop);
  } };
}

/* ---------- Büyülü Orman ---------- */
function sceneBuyuluOrman(W, H, o){
  const u = o.u, U = Math.max(.5, u), A = W * H / 1.04e6 * o.q;
  const bg = mk(W, H), g = c2(bg);
  g.fillStyle = vgrad(g, 0, H, [[0, '#061a1f'], [.4, '#0b2b33'], [.7, '#0a222a'], [1, '#03090c']]); g.fillRect(0, 0, W, H);
  // ışık huzmeleri (yukarıdan, sisli)
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++){
    const x0 = W * rnd(.15, .85), wdt = W * rnd(.02, .06), sk = W * rnd(.1, .2), gr = g.createLinearGradient(x0, 0, x0 - sk, H);
    gr.addColorStop(0, 'rgba(170,240,210,.11)'); gr.addColorStop(.7, 'rgba(150,220,200,.03)'); gr.addColorStop(1, 'rgba(150,220,200,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - wdt, 0); g.lineTo(x0 + wdt, 0); g.lineTo(x0 - sk + wdt * 2.2, H); g.lineTo(x0 - sk - wdt * 2.2, H); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  // gövde katmanları: uzak (puslu mavi) → yakın (koyu)
  const trunk = (x, w, col, lean, li) => {
    const tg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    tg.addColorStop(0, col); tg.addColorStop(.35, col); tg.addColorStop(.7, li ? 'rgba(120,200,190,' + (.12 * li) + ')' : col); tg.addColorStop(1, col);
    g.fillStyle = col; g.beginPath(); g.moveTo(x - w * .5, H); g.bezierCurveTo(x - w * .45, H * .6, x - w * .5 + lean, H * .3, x - w * .42 + lean, -10);
    g.lineTo(x + w * .42 + lean, -10); g.bezierCurveTo(x + w * .5 + lean, H * .3, x + w * .45, H * .6, x + w * .5, H);
    g.lineTo(x + w * 1.1, H); g.quadraticCurveTo(x + w * .55, H * .92, x + w * .5, H * .85); g.lineTo(x - w * .5, H * .85); g.quadraticCurveTo(x - w * .55, H * .92, x - w * 1.1, H); g.fill();
    if (li){ g.save(); g.clip(); g.globalCompositeOperation = 'lighter'; g.fillStyle = tg; g.fillRect(x - w, 0, w * 2.2, H);
      g.globalCompositeOperation = 'source-over'; g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = Math.max(1, w * .03); g.beginPath();
      for (let k = 0; k < w / 6; k++){ const bx = x + rnd(-.4, .4) * w; g.moveTo(bx, H); g.bezierCurveTo(bx + rnd(-4, 4) * U, H * .6, bx + lean * .8, H * .3, bx + lean, 0); } g.stroke(); g.restore(); }
  };
  const layers = [['#1a4a52', 9, [14, 30]], ['#10333b', 7, [26, 52]], ['#081d23', 4, [50, 100]]];
  layers.forEach(([col, n, ws], li) => {
    for (let i = 0; i < n * clamp(W / 1366 * 1.3, .5, 1.2); i++) trunk(R() * W, rnd(ws[0], ws[1]) * U, col, rnd(-20, 20) * U, li);
    g.fillStyle = vgrad(g, H * .55, H, [[0, 'rgba(90,190,180,0)'], [1, 'rgba(90,190,180,' + (.14 - li * .04) + ')']]); g.fillRect(0, H * .55, W, H * .45);
  });
  // tepe yaprak örtüsü
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 70; i++){ const r = rnd(30, 90) * U; sprite(g, glow(pick(['4,18,22', '6,24,26', '3,12,16']), 's'), R() * W, rnd(-.05, .14) * H, r, r * .6, .9); }
  g.globalAlpha = 1;
  // zemin, kökler, mantar sapları
  g.fillStyle = vgrad(g, H * .85, H, [[0, '#06161a'], [1, '#020708']]); fillPts(g, ridge(W, H * .9, H * .06, 1, 6 * U), H);
  const shrooms = [];
  const NM = Math.round(60 * clamp(A, .4, 1.3));
  let gx0 = R() * W, gy0 = H * .92;
  for (let i = 0; i < NM; i++){
    if (i % 5 === 0){ gx0 = R() * W; gy0 = H * rnd(.88, .98); }
    const cl = false, x = gx0 + rnd(-30, 30) * U, y = gy0 + rnd(-6, 6) * U, sz = rnd(7, 20) * U * (i % 5 === 0 ? 1.3 : .8);
    const col = pick(['80,255,230', '120,200,255', '200,120,255', '120,255,160']);
    g.fillStyle = '#c9d8d2'; g.fillRect(x - sz * .12, y - sz * .9, sz * .24, sz * .9);
    g.fillStyle = 'rgb(' + col + ')'; g.globalAlpha = .75; g.beginPath(); g.ellipse(x, y - sz * .9, sz * .6, sz * .38, 0, Math.PI, 0); g.fill();
    g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,.6)'; for (let k = 0; k < 3; k++) g.fillRect(x + rnd(-.35, .3) * sz, y - sz * rnd(1, 1.2), Math.max(1, sz * .08), Math.max(1, sz * .08));
    shrooms.push({ x, y: y - sz * .95, r: sz * 3.6, col, ph: R() * TAU, sp: rnd(.6, 1.6) });
    if (cl) continue;
  }
  dither(g, W, H, .03);
  // sallanan dallar (önceden çizilmiş, kökünden döner)
  const branches = [];
  for (const [ax, ay, ang, len] of [[0, H * .05, .5, W * .32], [W, H * .02, Math.PI - .55, W * .3], [W * .55, -2, 1.45, H * .3]]){
    const L2 = Math.max(80, len), bc = mk(L2 + 40 * U, 120 * U), bg2 = c2(bc), cy = bc.height / 2;
    bg2.strokeStyle = '#020a0c'; bg2.lineWidth = 5 * U; bg2.beginPath(); bg2.moveTo(0, cy); bg2.quadraticCurveTo(L2 * .5, cy - 10 * U, L2, cy + 6 * U); bg2.stroke();
    bg2.fillStyle = '#031014';
    for (let k = 0; k < 110; k++){ const p = Math.sqrt(R()), x = p * L2, y = cy - 4 * U * p + rnd(-40, 40) * U * p; bg2.beginPath(); bg2.ellipse(x, y, rnd(6, 13) * U, rnd(3, 6) * U, R() * TAU, 0, TAU); bg2.fill(); }
    branches.push({ c: bc, ax, ay, ang, cy, ph: R() * TAU });
  }
  const wisps = Array.from({ length: Math.round(26 * clamp(A, .4, 1.3)) }, () => ({ cx: R() * W, cy: H * rnd(.25, .85), ax: rnd(40, 160) * U, ay: rnd(20, 70) * U, fx: rnd(.08, .2), fy: rnd(.1, .3), p: R() * TAU, z: rnd(.5, 1.2), col: R() < .6 ? '255,230,150' : '140,255,230' }));
  const halo = {}, core = {};
  const sh = glow('255,255,255', 's');
  return { draw(c, t){
    c.drawImage(bg, 0, 0);
    c.globalCompositeOperation = 'lighter';
    for (const s of shrooms){ sprite(c, glow(s.col, 's'), s.x, s.y, s.r, s.r * .6, .22 + .18 * Math.sin(t * s.sp + s.ph)); }
    for (const w of wisps){
      const hs = halo[w.col] || (halo[w.col] = glow(w.col, 's')), cs = core[w.col] || (core[w.col] = glow(w.col, 'h'));
      for (let k = 3; k >= 0; k--){
        const tt = t - k * .12, x = w.cx + w.ax * Math.sin(tt * w.fx + w.p) + w.ax * .4 * Math.sin(tt * w.fx * 2.3 + w.p * 2), y = w.cy + w.ay * Math.sin(tt * w.fy + w.p * 1.3);
        const s = w.z * U, pulse = .75 + .25 * Math.sin(t * 2.2 + w.p);
        if (k === 0){ sprite(c, hs, x, y, 28 * s, 28 * s, .4 * pulse); sprite(c, cs, x, y, 5 * s, 5 * s, pulse); }
        else sprite(c, cs, x, y, (4 - k) * 1.1 * s, (4 - k) * 1.1 * s, .25 * pulse * (1 - k / 4));
      }
    }
    sprite(c, sh, W * .5, H * .2, W * .35, H * .25, .03 + .015 * Math.sin(t * .4));
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    for (const b of branches){ c.save(); c.translate(b.ax, b.ay); c.rotate(b.ang + Math.sin(t * .6 + b.ph) * .025 + Math.sin(t * 1.7 + b.ph) * .008); c.drawImage(b.c, 0, -b.cy); c.restore(); }
  } };
}

/* ---------- Gece Şatosu ---------- */
function sceneGeceSato(W, H, o){
  const u = o.u, U = Math.max(.5, u), A = W * H / 1.04e6 * o.q, land = W >= H, m = Math.min(W, H);
  const yw = Math.round(H * (land ? .72 : .7)), mx = W * (land ? .72 : .66), my = H * (land ? .2 : .16), mr = Math.max(9, m * .065);
  const bg = mk(W, H), g = c2(bg);
  g.fillStyle = vgrad(g, 0, yw, [[0, '#040716'], [.5, '#0b1634'], [1, '#22305a']]); g.fillRect(0, 0, W, yw);
  stars(g, 900 * A, 0, 0, W, yw * .8, { u, max: .8 });
  moon(g, mx, my, mr);
  g.globalAlpha = 1;
  // deniz
  g.fillStyle = vgrad(g, yw, H, [[0, '#1a2a50'], [.3, '#0c1630'], [1, '#03060f']]); g.fillRect(0, yw, W, H - yw);
  g.globalCompositeOperation = 'lighter'; sprite(g, glow('230,235,255', 's'), mx, yw + (H - yw) * .4, mr * 2, (H - yw) * .6, .2); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  // uçurum
  const cx0 = W * (land ? .3 : .4), top = H * (land ? .47 : .5), cw = W * (land ? .4 : .7);
  // durgun deniz dokusu: ince dalga çizgileri
  g.strokeStyle = 'rgba(150,170,230,.07)'; g.lineWidth = 1 * U; g.beginPath();
  for (let k = 0; k < 60; k++){ const y = yw + Math.pow(R(), 1.6) * (H - yw), x = R() * W, l = (20 + (y - yw) / (H - yw) * 120) * U; g.moveTo(x, y); g.lineTo(x + l, y); } g.stroke();
  g.fillStyle = vgrad(g, top, H, [[0, '#161c33'], [.3, '#0c1020'], [1, '#05060c']]);
  g.beginPath(); g.moveTo(-10, H); g.lineTo(-10, top + H * .04);
  const cliff = [];
  for (let i = 0; i <= 24; i++){ const k = i / 24, x = cx0 - cw / 2 + cw * k * 1.15, y = top + Math.sin(k * 9) * 3 * U + (k > .8 ? (k - .8) * H * 1.3 : 0) + rnd(0, 4) * U; cliff.push(x, y); g.lineTo(x, y); }
  g.lineTo(cx0 + cw * .7, yw + 4); g.lineTo(cx0 + cw * .8, H); g.closePath(); g.fill();
  g.save(); g.clip(); g.strokeStyle = 'rgba(150,170,230,.07)'; g.lineWidth = 1.4 * U; g.beginPath();
  for (let k = 0; k < 70; k++){ const x = cx0 + rnd(-.7, .7) * cw, y = rnd(top, H), l = rnd(20, 80) * U; g.moveTo(x, y); g.lineTo(x + l * .8, y + l * .35); } g.stroke();
  g.fillStyle = 'rgba(160,180,240,.06)'; g.beginPath(); g.moveTo(cx0 + cw * .66, top); g.lineTo(cx0 + cw * .8, H); g.lineTo(cx0 + cw * .6, H); g.closePath(); g.fill(); g.restore();
  g.strokeStyle = 'rgba(160,180,235,.28)'; g.lineWidth = 1.4 * U; g.beginPath(); for (let i = 0; i < cliff.length; i += 2) i ? g.lineTo(cliff[i], cliff[i + 1]) : g.moveTo(cliff[i], cliff[i + 1]); g.stroke();
  const footX = cx0 + cw * .74;
  // şato: özgün tasarım (kare ana kule, köşe kuleleri, kapı kuleleri, ince yüksek gözcü kulesi, surlar)
  const s = (land ? 1.75 : 1.2) * U, base = top + 3 * U, wins = [];
  const castC = mk(W, H), col = '#0b0e1c', rim = 'rgba(170,185,230,.22)', kx = cx0;
  { const g = c2(castC);
  const merlons = (x, y, w) => { for (let xx = x; xx < x + w - 2 * s; xx += 6 * s) g.fillRect(xx, y - 4 * s, 3.5 * s, 4 * s); };
  const tower = (x, w, h, roof, flag) => {
    g.fillStyle = col; g.fillRect(x - w / 2, base - h, w, h);
    if (roof){ g.beginPath(); g.moveTo(x - w * .62, base - h); g.lineTo(x, base - h - w * 1.3); g.lineTo(x + w * .62, base - h); g.fill(); if (flag){ g.fillRect(x - .6 * s, base - h - w * 1.3 - 14 * s, 1.2 * s, 14 * s); g.beginPath(); g.moveTo(x + .6 * s, base - h - w * 1.3 - 14 * s); g.lineTo(x + 11 * s, base - h - w * 1.3 - 11 * s); g.lineTo(x + .6 * s, base - h - w * 1.3 - 8 * s); g.fill(); } }
    else merlons(x - w / 2, base - h, w);
    for (let yy = base - h + 10 * s; yy < base - 8 * s; yy += rnd(14, 22) * s) if (R() < .7) wins.push([x + rnd(-.25, .25) * w, yy, R() < .55]);
  };
  g.fillStyle = col; g.fillRect(kx - 95 * s, base - 30 * s, 190 * s, 30 * s); merlons(kx - 95 * s, base - 30 * s, 190 * s);
  tower(kx - 98 * s, 16 * s, 46 * s, true); tower(kx + 98 * s, 16 * s, 50 * s, true);
  tower(kx - 26 * s, 14 * s, 44 * s, false); tower(kx + 2 * s, 14 * s, 44 * s, false);
  g.fillStyle = col; g.beginPath(); g.moveTo(kx - 22 * s, base); g.lineTo(kx - 22 * s, base - 22 * s); g.quadraticCurveTo(kx - 12 * s, base - 32 * s, kx - 2 * s, base - 22 * s); g.lineTo(kx - 2 * s, base); g.fill();
  g.fillRect(kx + 22 * s, base - 92 * s, 52 * s, 92 * s); merlons(kx + 22 * s, base - 92 * s, 52 * s);
  for (const dx of [22, 74]) tower(kx + dx * s, 11 * s, 102 * s, true);
  for (let yy = base - 80 * s; yy < base - 10 * s; yy += 16 * s) for (let xx = kx + 30 * s; xx < kx + 70 * s; xx += 12 * s) if (R() < .5) wins.push([xx, yy, R() < .6]);
  tower(kx - 60 * s, 13 * s, 128 * s, true, true);
  g.strokeStyle = rim; g.lineWidth = 1 * U; g.beginPath(); g.moveTo(kx + 74 * s + 5.5 * s, base); g.lineTo(kx + 74 * s + 5.5 * s, base - 102 * s); g.moveTo(kx - 60 * s + 6.5 * s, base); g.lineTo(kx - 60 * s + 6.5 * s, base - 128 * s); g.stroke();
  // pencereler: koyu çerçeve (yananlar her karede titreşir)
  g.fillStyle = '#05060c'; for (const [x, y] of wins){ g.fillRect(x - 1.6 * s, y - 3 * s, 3.2 * s, 5 * s); }
  }
  // ay tarafında ince ışık kenarı
  { const litC = mk(W, H), lq = c2(litC); lq.drawImage(castC, 0, 0); lq.globalCompositeOperation = 'source-in'; lq.fillStyle = 'rgba(165,185,240,.75)'; lq.fillRect(0, 0, W, H);
    g.drawImage(litC, 1.4 * U, -.8 * U); g.drawImage(castC, 0, 0); }
  const lit = wins.filter(w => w[2]).map(w => ({ x: w[0], y: w[1], ph: R() * TAU, sp: rnd(3, 8) }));
  dither(g, W, H, .03);
  // ay önünden geçen bulutlar
  const ch = Math.ceil(mr * 6), cl = cloudBand(W, ch, 26, ['70,80,120', '90,100,140', '60,70,110'], .2, .45, .14);
  const glit = []; for (let i = 0; i < 120 * clamp(A, .4, 1.3); i++){ const k = Math.pow(R(), 1.3); glit.push({ x: mx + gauss() * (mr * .5 + k * mr * 2.2), y: yw + 2 + k * (H - yw - 4), w: (2 + 9 * k) * U, sp: rnd(1, 3), ph: R() * TAU }); }
  const bats = Array.from({ length: land ? 8 : 5 }, () => ({ cx: kx + rnd(-90, 160) * s, cy: base - rnd(110, 220) * s, ax: rnd(60, 160) * U, ay: rnd(20, 60) * U, f: rnd(.25, .5), p: R() * TAU, s: rnd(6, 11) * U, fl: rnd(10, 14) }));
  const warm = glow('255,190,110', 's'), wcore = glow('255,214,150', 'h');
  return { draw(c, t){
    c.drawImage(bg, 0, 0);
    c.globalAlpha = .85; wrapBlit(c, cl, t * 6 * U, my - ch * .55, W); c.globalAlpha = 1;
    c.globalCompositeOperation = 'lighter';
    for (const w of lit){ const f = .7 + .2 * Math.sin(t * w.sp + w.ph) + .1 * Math.sin(t * w.sp * 2.7); sprite(c, warm, w.x, w.y - .5 * s, 7 * s, 7 * s, .35 * f); sprite(c, wcore, w.x, w.y - .5 * s, 2.2 * s, 3 * s, f); }
    c.fillStyle = 'rgb(240,242,255)';
    for (const p of glit){ const a = Math.sin(t * p.sp + p.ph); if (a <= .2) continue; c.globalAlpha = Math.pow(a, 3) * .8; c.fillRect(p.x - p.w / 2 + Math.sin(t * .7 + p.ph) * 2 * U, p.y, p.w, Math.max(1, U)); }
    // uçurum dibinde köpük
    c.strokeStyle = 'rgb(200,215,255)'; c.lineWidth = 1.2 * U;
    for (let k = 0; k < 3; k++){ const p = (t * .25 + k / 3) % 1; c.globalAlpha = Math.sin(p * Math.PI) * .35; c.beginPath(); c.moveTo(footX - 30 * U - p * 20 * U, yw + 4 * U + p * 10 * U); c.quadraticCurveTo(footX + 40 * U, yw + 2 * U + p * 6 * U, footX + 120 * U + p * 40 * U, yw + 6 * U + p * 14 * U); c.stroke(); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    // yarasalar
    c.fillStyle = '#05060c';
    for (const b of bats){
      const x = b.cx + b.ax * Math.sin(t * b.f + b.p) + 8 * U * Math.sin(t * 3.1 + b.p), y = b.cy + b.ay * Math.sin(t * b.f * 1.7 + b.p) + 5 * U * Math.sin(t * 4.3 + b.p * 2);
      const fl = Math.sin(t * b.fl + b.p), s2 = b.s;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - s2 * .5, y - s2 * .5 * fl - s2 * .1); c.lineTo(x - s2, y - s2 * .2 * fl); c.lineTo(x - s2 * .55, y + s2 * .05); c.lineTo(x, y + s2 * .25);
      c.lineTo(x + s2 * .55, y + s2 * .05); c.lineTo(x + s2, y - s2 * .2 * fl); c.lineTo(x + s2 * .5, y - s2 * .5 * fl - s2 * .1); c.closePath(); c.fill();
    }
  } };
}

/* ---------- Büyücü Kulesi (iç mekân) ---------- */
// uydurma rün: 3x3 ızgarada 3-5 çizgi
function glyph(g, x, y, s){
  const P = []; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) P.push([x + (i - 1) * s, y + (j - 1) * s]);
  g.beginPath(); let a = (R() * 9) | 0; g.moveTo(P[a][0], P[a][1]);
  for (let k = 0, n = 2 + ((R() * 3) | 0); k < n; k++){ a = (a + 1 + ((R() * 7) | 0)) % 9; g.lineTo(P[a][0], P[a][1]); }
  if (R() < .5){ g.moveTo(x + s * .4, y); g.arc(x, y, s * .4, 0, TAU); }
  g.stroke();
}
function runeRing(Rr, U, col, inner){
  const n = Math.ceil(Rr * 2 + 16 * U), c = mk(n, n), g = c2(c), o = n / 2;
  g.strokeStyle = 'rgba(' + col + ',.95)'; g.shadowColor = 'rgb(' + col + ')'; g.shadowBlur = 8 * U; g.lineCap = 'round';
  g.lineWidth = Math.max(1, 1.6 * U); g.beginPath(); g.arc(o, o, Rr, 0, TAU); g.stroke();
  g.lineWidth = Math.max(1, 1 * U); g.beginPath(); g.arc(o, o, Rr * .82, 0, TAU); g.stroke();
  const k = inner ? 7 : 16, gs = Rr * (inner ? .07 : .045);
  for (let i = 0; i < k; i++){ const a = i / k * TAU; glyph(g, o + Math.cos(a) * Rr * .91, o + Math.sin(a) * Rr * .91, gs); }
  if (inner){
    g.beginPath(); for (let i = 0; i <= 7; i++){ const a = i * 3 / 7 * TAU - Math.PI / 2; const x = o + Math.cos(a) * Rr * .78, y = o + Math.sin(a) * Rr * .78; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.beginPath(); g.arc(o, o, Rr * .3, 0, TAU); g.stroke();
  } else { for (let i = 0; i < 48; i++){ const a = i / 48 * TAU; g.beginPath(); g.moveTo(o + Math.cos(a) * Rr * .82, o + Math.sin(a) * Rr * .82); g.lineTo(o + Math.cos(a) * Rr * (i % 4 ? .79 : .74), o + Math.sin(a) * Rr * (i % 4 ? .79 : .74)); g.stroke(); } }
  return c;
}
function sceneBuyucuKule(W, H, o){
  const u = o.u, U = Math.max(.5, u), A = W * H / 1.04e6 * o.q, land = W >= H, m = Math.min(W, H);
  const bg = mk(W, H), g = c2(bg);
  // taş duvar
  g.fillStyle = vgrad(g, 0, H, [[0, '#1a1220'], [.6, '#2a1c27'], [1, '#140d12']]); g.fillRect(0, 0, W, H);
  const bw = 46 * U, bh = 24 * U;
  for (let y = 0, r = 0; y < H; y += bh, r++) for (let x = (r % 2) * -bw / 2; x < W; x += bw){
    g.fillStyle = 'rgba(' + pick(['70,50,60', '60,44,56', '80,58,66', '55,40,52']) + ',' + rnd(.35, .6) + ')'; g.fillRect(x + 1.5 * U, y + 1.5 * U, bw - 3 * U, bh - 3 * U);
  }
  // pencere (yıldızlı gece)
  const wx = W * (land ? .5 : .5), wy = H * .1, ww = Math.min(W * .2, 240 * U), wh = H * .42;
  g.save(); g.beginPath(); g.moveTo(wx - ww / 2, wy + wh); g.lineTo(wx - ww / 2, wy + ww / 2); g.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww / 2, wy + wh); g.closePath(); g.clip();
  g.fillStyle = vgrad(g, wy, wy + wh, [[0, '#081028'], [1, '#1b2550']]); g.fillRect(wx - ww, wy, ww * 2, wh);
  stars(g, 160 * A, wx - ww / 2, wy, ww, wh, { u, max: 1 });
  g.globalCompositeOperation = 'lighter'; sprite(g, glow('220,230,255', 'h'), wx + ww * .2, wy + wh * .25, 6 * U, 6 * U, 1); sprite(g, glow('180,200,255', 's'), wx + ww * .2, wy + wh * .25, 30 * U, 30 * U, .3); g.globalCompositeOperation = 'source-over';
  g.restore(); g.globalAlpha = 1;
  g.strokeStyle = '#0d0910'; g.lineWidth = 9 * U; g.beginPath(); g.moveTo(wx - ww / 2, wy + wh); g.lineTo(wx - ww / 2, wy + ww / 2); g.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww / 2, wy + wh); g.stroke();
  g.lineWidth = 3 * U; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx, wy + wh); g.moveTo(wx - ww / 2, wy + wh * .55); g.lineTo(wx + ww / 2, wy + wh * .55); g.stroke();
  g.fillStyle = '#120b10'; g.fillRect(wx - ww / 2 - 14 * U, wy + wh, ww + 28 * U, 10 * U);
  // raflar ve kitaplar (yazısız)
  const shelf = (x0, x1, y) => {
    for (let x = x0; x < x1 - 6 * U;){
      const bw2 = rnd(5, 12) * U, bh2 = rnd(24, 44) * U, col = pick(['#5a1f2a', '#1f3a5a', '#3a5a2a', '#6a4a1f', '#3f2350', '#2a4a4a', '#7a2f2f', '#4a3a2a']);
      if (R() < .1){ g.fillStyle = 'rgba(160,200,255,.25)'; g.beginPath(); g.ellipse(x + 7 * U, y - 9 * U, 7 * U, 9 * U, 0, 0, TAU); g.fill(); g.fillStyle = '#2a1c18'; g.fillRect(x + 4 * U, y - 21 * U, 6 * U, 4 * U); x += 16 * U; continue; }
      g.save(); g.translate(x, y); if (R() < .12) g.rotate(-.18);
      g.fillStyle = col; g.fillRect(0, -bh2, bw2, bh2);
      g.fillStyle = 'rgba(230,190,110,.45)'; g.fillRect(0, -bh2 + 4 * U, bw2, 1.2 * U); g.fillRect(0, -6 * U, bw2, 1.2 * U);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(bw2 - 1.5 * U, -bh2, 1.5 * U, bh2);
      g.restore(); x += bw2 + rnd(.3, 1.5) * U;
    }
    g.fillStyle = '#3a2418'; g.fillRect(x0 - 6 * U, y, x1 - x0 + 12 * U, 6 * U); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x0 - 6 * U, y + 6 * U, x1 - x0 + 12 * U, 4 * U);
  };
  const sw = Math.min(W * .26, 340 * U);
  for (let k = 0; k < 5; k++){ const y = H * .16 + k * H * .14; shelf(10 * U, sw, y); shelf(W - sw, W - 10 * U, y); }
  // masa
  const ty = H * .8;
  g.fillStyle = vgrad(g, ty, H, [[0, '#4a2d1c'], [.15, '#2e1b12'], [1, '#150c08']]); g.fillRect(W * .2, ty, W * .6, H - ty);
  g.fillStyle = '#5c3a24'; g.fillRect(W * .2, ty, W * .6, 5 * U);
  // açık kitap ve parşömen (yazısız çizgiler)
  const bx = W * .36, by = ty - 2 * U; g.fillStyle = '#d9c9a0'; g.beginPath(); g.moveTo(bx - 40 * U, by); g.quadraticCurveTo(bx - 20 * U, by - 10 * U, bx, by - 4 * U); g.quadraticCurveTo(bx + 20 * U, by - 10 * U, bx + 40 * U, by); g.lineTo(bx, by + 3 * U); g.fill();
  g.strokeStyle = 'rgba(80,60,40,.5)'; g.lineWidth = 1 * U; g.beginPath(); for (let k = 0; k < 4; k++){ g.moveTo(bx - 34 * U, by - 3 * U - k * 2 * U + 2 * U); g.lineTo(bx - 6 * U, by - 4 * U - k * 2 * U + 2 * U); g.moveTo(bx + 6 * U, by - 4 * U - k * 2 * U + 2 * U); g.lineTo(bx + 34 * U, by - 3 * U - k * 2 * U + 2 * U); } g.stroke();
  // iksir şişeleri
  const flasks = [], FC = ['80,255,140', '190,90,255', '70,200,255', '255,170,60', '255,80,150'];
  const nF = land ? 5 : 4;
  for (let i = 0; i < nF; i++){
    const fx = W * (.5 + (i - (nF - 1) / 2) * .075) + (i === 0 ? 0 : 0), r = rnd(13, 20) * U, type = i % 3, col = FC[i % FC.length];
    const fyb = ty; let ly = 0, lr = r;
    g.save();
    g.beginPath();
    if (type === 0){ g.arc(fx, fyb - r, r, -Math.PI / 2 + .26, -Math.PI / 2 - .26 + TAU, false); g.lineTo(fx - r * .25, fyb - r * 2.9); g.lineTo(fx + r * .25, fyb - r * 2.9); g.closePath(); ly = fyb - r * 1.05; }
    else if (type === 1){ g.moveTo(fx - r * 1.1, fyb); g.lineTo(fx - r * .25, fyb - r * 1.9); g.lineTo(fx - r * .25, fyb - r * 2.8); g.lineTo(fx + r * .25, fyb - r * 2.8); g.lineTo(fx + r * .25, fyb - r * 1.9); g.lineTo(fx + r * 1.1, fyb); g.closePath(); ly = fyb - r * .9; lr = r; }
    else { g.rect(fx - r * .45, fyb - r * 3.2, r * .9, r * 3.2); ly = fyb - r * 2; lr = r * .45; }
    g.fillStyle = 'rgba(180,210,230,.12)'; g.fill(); g.clip();
    g.fillStyle = 'rgba(' + col + ',.75)'; g.fillRect(fx - r * 1.2, ly, r * 2.4, fyb - ly);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(fx - r * 1.2, ly, r * 2.4, 1.5 * U);
    g.restore();
    g.strokeStyle = 'rgba(210,230,240,.55)'; g.lineWidth = 1.2 * U; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(fx - lr * .55, ly - r * .2, 1.6 * U, r * .9);
    g.fillStyle = '#5a3a24'; g.fillRect(fx - r * .3, fyb - r * (type === 2 ? 3.4 : 3.05), r * .6, r * .35);
    flasks.push({ x: fx, ly, bot: fyb - 2 * U, w: lr * .8, col, r, top: fyb - r * (type === 2 ? 3.2 : 2.8), ph: R() * TAU });
  }
  // mumlar
  const candles = [[W * .26, ty], [W * .73, ty], [sw * .55, H * .16 + 2 * H * .14 - 30 * U]];
  for (const [x, y] of candles){ g.fillStyle = '#e8dcc0'; g.fillRect(x - 4 * U, y - 26 * U, 8 * U, 26 * U); g.fillStyle = 'rgba(255,240,200,.5)'; g.fillRect(x - 4 * U, y - 26 * U, 2 * U, 24 * U); }
  dither(g, W, H, .035);
  // rün halkaları
  const RR = Math.min(m * .2, 160 * U), rcx = wx, rcy = wy + wh * .6;
  const ring1 = runeRing(RR, U, '255,180,90', false), ring2 = runeRing(RR * .6, U, '140,220,255', true);
  const bub = []; for (const f of flasks) for (let k = 0; k < 6; k++) bub.push({ f, x: rnd(-1, 1), y: R(), sp: rnd(.25, .6), r: rnd(1, 2.6) * U });
  const sparks = Array.from({ length: Math.round(45 * clamp(A, .4, 1.3)) }, () => ({ x: R() * W, y: R() * H, v: rnd(8, 22) * U, r: rnd(1.2, 3) * U, ph: R() * TAU, col: R() < .6 ? '255,190,90' : '170,140,255' }));
  const fl = glow('255,190,90', 's'), flc = glow('255,240,200', 'h');
  return { draw(c, t, dt, still){
    c.drawImage(bg, 0, 0);
    c.globalCompositeOperation = 'lighter';
    // mum ışığı titrer
    for (const [x, y] of candles){ const f = .8 + .12 * Math.sin(t * 9 + x) + .08 * Math.sin(t * 23 + y); sprite(c, fl, x, y - 34 * U, 90 * U * f, 90 * U * f, .18); sprite(c, flc, x, y - 31 * U, 3 * U, 6 * U * f, .95); }
    // rün halkası
    const pulse = .7 + .3 * Math.sin(t * 1.3);
    sprite(c, glow('255,170,80', 's'), rcx, rcy, RR * 1.5, RR * 1.5, .1 * pulse);
    c.globalAlpha = .55 * pulse; c.save(); c.translate(rcx, rcy); c.rotate(t * .12); c.drawImage(ring1, -ring1.width / 2, -ring1.height / 2); c.restore();
    c.globalAlpha = .7 * pulse; c.save(); c.translate(rcx, rcy); c.rotate(-t * .22); c.drawImage(ring2, -ring2.width / 2, -ring2.height / 2); c.restore();
    // iksir ışıltısı ve kabarcıklar
    for (const f of flasks){ sprite(c, glow(f.col, 's'), f.x, (f.ly + f.bot) / 2, f.r * 3.2, f.r * 2.6, .28 + .1 * Math.sin(t * 2 + f.ph)); }
    c.fillStyle = 'rgb(255,255,255)';
    for (const b of bub){
      if (!still){ b.y += b.sp * dt; if (b.y > 1){ b.y = 0; b.x = rnd(-1, 1); } }
      const f = b.f, y = f.bot - (f.bot - f.ly) * b.y, x = f.x + b.x * f.w + Math.sin(t * 6 + b.y * 9) * U;
      c.globalAlpha = .55 * (1 - b.y * .5); c.beginPath(); c.arc(x, y, b.r, 0, TAU); c.fill();
    }
    // şişelerden yükselen buhar
    for (const f of flasks){ for (let k = 0; k < 3; k++){ const p = ((t * .25 + k / 3 + f.ph) % 1); sprite(c, glow(f.col, 's'), f.x + Math.sin(t + k * 2 + f.ph) * 6 * U, f.top - p * 50 * U, (6 + p * 14) * U, (6 + p * 14) * U, .14 * (1 - p)); } }
    // uçuşan kıvılcımlar
    for (const s of sparks){
      if (!still){ s.y -= s.v * dt; if (s.y < -10){ s.y = H + 10; s.x = R() * W; } }
      sprite(c, glow(s.col, 'h'), s.x + Math.sin(t * .7 + s.ph) * 12 * U, s.y, s.r * 2, s.r * 2, .35 + .35 * Math.sin(t * 3 + s.ph));
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  } };
}

/* ---------- Kristal Mağara ---------- */
function crystal(g, x, y, h, w, ang, c1, c2c, c3){
  g.save(); g.translate(x, y); g.rotate(ang);
  const tip = -h, sh = -h * .78;
  g.fillStyle = c1; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2, sh); g.lineTo(0, tip); g.lineTo(0, 0); g.fill();
  g.fillStyle = c2c; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, tip); g.lineTo(w / 2, sh); g.lineTo(w / 2, 0); g.fill();
  g.strokeStyle = c3; g.lineWidth = Math.max(.8, w * .06); g.beginPath(); g.moveTo(-w / 2, sh); g.lineTo(0, tip); g.lineTo(w / 2, sh); g.moveTo(0, tip); g.lineTo(0, 0); g.stroke();
  g.restore();
}
function sceneKristal(W, H, o){
  const u = o.u, U = Math.max(.5, u), A = W * H / 1.04e6 * o.q, land = W >= H;
  const yl = Math.round(H * (land ? .68 : .66));
  const top = mk(W, yl), g = c2(top);
  g.fillStyle = vgrad(g, 0, yl, [[0, '#04030c'], [.5, '#0b0a24'], [1, '#141a3a']]); g.fillRect(0, 0, W, yl);
  // uzak mağara katmanları ve sis
  for (const [yy, hm, col] of [[yl, H * .3, '#0e1030'], [yl, H * .2, '#090a20']]){ g.fillStyle = col; fillPts(g, peaks(W, yy, hm, .6, 7), yl); }
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++){ const r = W * rnd(.1, .25); sprite(g, glow(pick(['60,90,200', '110,60,200', '40,140,200']), 's'), R() * W, yl * rnd(.4, .95), r, r * .3, .08); }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  // kristal kümeleri
  const CC = [['#2fd3ff', '#127ba8', 'rgba(220,250,255,.9)', '80,220,255'], ['#b77bff', '#5b2fa8', 'rgba(240,220,255,.9)', '180,110,255'], ['#5ff5e0', '#1d8f8a', 'rgba(220,255,250,.9)', '90,255,220']];
  const clusters = [];
  const nC = Math.round(9 * clamp(W / 1366, .5, 1.2));
  for (let i = 0; i < nC; i++){
    const cc = pick(CC), x = W * (i + .5) / nC + rnd(-30, 30) * U, y = yl - rnd(0, H * .05), sz = rnd(.6, 1.4) * U * (land ? 1 : .8);
    for (let k = 0; k < 7; k++) crystal(g, x + rnd(-22, 22) * sz, y + rnd(0, 6) * sz, rnd(30, 90) * sz, rnd(9, 16) * sz, rnd(-.5, .5), cc[0], cc[1], cc[2]);
    clusters.push({ x, y: y - 30 * sz, r: 70 * sz, col: cc[3], ph: R() * TAU, sp: rnd(.5, 1.3) });
  }
  // tavan sarkıtları
  const tips = [];
  g.fillStyle = '#050410'; g.beginPath(); g.moveTo(0, 0);
  for (let x = 0; x <= W; x += rnd(14, 34) * U){ const len = rnd(20, 110) * U * (R() < .2 ? 1.8 : 1); g.lineTo(x, rnd(10, 30) * U); g.lineTo(x + 7 * U, len); tips.push([x + 7 * U, len]); g.lineTo(x + 14 * U, rnd(10, 30) * U); }
  g.lineTo(W, 0); g.fill();
  // kenar kayalar
  g.beginPath(); g.moveTo(0, 0); for (let y = 0; y <= yl; y += 20 * U) g.lineTo(W * .06 + Math.sin(y * .03) * 18 * U + rnd(0, 10) * U, y); g.lineTo(0, yl); g.fill();
  g.beginPath(); g.moveTo(W, 0); for (let y = 0; y <= yl; y += 20 * U) g.lineTo(W * .94 - Math.sin(y * .025) * 20 * U - rnd(0, 10) * U, y); g.lineTo(W, yl); g.fill();
  // göl: yansıma
  const hw = H - yl, lake = mk(W, hw), lg = c2(lake);
  lg.fillStyle = vgrad(lg, 0, hw, [[0, '#0c1230'], [1, '#03040c']]); lg.fillRect(0, 0, W, hw);
  lg.save(); lg.translate(0, yl); lg.scale(1, -1); lg.globalAlpha = .45; lg.drawImage(top, 0, 0); lg.restore();
  lg.fillStyle = vgrad(lg, 0, hw, [[0, 'rgba(3,5,15,.15)'], [1, 'rgba(2,3,8,.7)']]); lg.fillRect(0, 0, W, hw);
  dither(g, W, yl, .03); dither(lg, W, hw, .03);
  const MGW = Math.ceil(8 * U), lakeW = mk(W + MGW * 2, hw); { const q = c2(lakeW); q.drawImage(lake, MGW, 0); q.drawImage(lake, 0, 0, MGW, hw, 0, 0, MGW, hw); q.drawImage(lake, W - MGW, 0, MGW, hw, W + MGW, 0, MGW, hw); }
  const drops = [], rip = [], dust = Array.from({ length: Math.round(60 * clamp(A, .4, 1.3)) }, () => ({ x: R() * W, y: R() * yl, vx: rnd(-4, 4) * U, vy: rnd(-3, 3) * U, r: rnd(1, 2.4) * U, ph: R() * TAU }));
  let nextDrop = 1;
  const dustS = glow('190,220,255', 'h'), dropS = glow('200,240,255', 'h');
  const sh = Math.max(2, Math.round(3 * U));
  return { draw(c, t, dt, still){
    c.drawImage(top, 0, 0);
    // göl yüzeyi: hafif dalgalı şeritler
    for (let y = 0; y < hw; y += sh){ const off = Math.sin(y * .25 / U + t * 1.2) * (.4 + y / hw) * 1.6 * U; c.drawImage(lakeW, MGW + off, y, W, sh, 0, yl + y, W, sh); }
    c.globalCompositeOperation = 'lighter';
    for (const k of clusters){
      const p = .5 + .5 * Math.sin(t * k.sp + k.ph), gs = glow(k.col, 's');
      sprite(c, gs, k.x, k.y, k.r * (1.6 + .3 * p), k.r * (1.6 + .3 * p), .16 + .22 * p);
      sprite(c, gs, k.x, yl + (yl - k.y) * .5 + 6 * U, k.r * 1.4, k.r * .5, .07 + .1 * p);
    }
    // damlalar → halkalar
    if (!still){ nextDrop -= dt; if (nextDrop <= 0 && tips.length){ const tp = pick(tips); drops.push({ x: tp[0], y: tp[1], v: 0, ty: yl + hw * rnd(.05, .6) }); nextDrop = rnd(.4, 1.4); } }
    for (let i = drops.length - 1; i >= 0; i--){
      const d = drops[i]; if (!still){ d.v += 900 * U * dt; d.y += d.v * dt; }
      if (d.y >= d.ty){ rip.push({ x: d.x, y: d.ty, age: 0 }); drops.splice(i, 1); continue; }
      sprite(c, dropS, d.x, d.y, 2 * U, 4 * U, .8);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.strokeStyle = 'rgba(170,220,255,.6)'; c.lineWidth = Math.max(.8, U);
    for (let i = rip.length - 1; i >= 0; i--){
      const r = rip[i]; if (!still) r.age += dt; if (r.age > 1.8){ rip.splice(i, 1); continue; }
      const k = r.age / 1.8, persp = .4 + (r.y - yl) / hw;
      for (const s of [1, .6]){ const rr = (6 + 70 * k) * U * s * persp; c.globalAlpha = (1 - k) * .6 * s; c.beginPath(); c.ellipse(r.x, r.y, rr, rr * .25, 0, 0, TAU); c.stroke(); }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'lighter';
    for (const d of dust){
      if (!still){ d.x += (d.vx + Math.sin(t * .3 + d.ph) * 3 * U) * dt; d.y += (d.vy + Math.cos(t * .25 + d.ph) * 2 * U) * dt; if (d.x < 0) d.x += W; if (d.x > W) d.x -= W; if (d.y < 0) d.y += yl; if (d.y > yl) d.y -= yl; }
      sprite(c, dustS, d.x, d.y, d.r * 2, d.r * 2, .25 + .3 * Math.sin(t * 1.5 + d.ph));
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  } };
}

/* =================== MOTOR =================== */

// ---------- Kendi görselin: kişinin seçtiği resim (sadece bu cihazda, IndexedDB'de saklanır) ----------
const CUSTOM = { im: null, loading: null };
function idb(){
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open('oyunodasi', 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('bg')) r.result.createObjectStore('bg'); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch(e){ rej(e); }
  });
}
async function idbDo(mode, fn){
  const db = await idb();
  return new Promise((res, rej) => { const tx = db.transaction('bg', mode), q = fn(tx.objectStore('bg')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); });
}
function blobToCanvas(blob, maxEdge){
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(blob), im = new Image();
    im.onload = () => {
      const k = Math.min(1, maxEdge / Math.max(im.naturalWidth, im.naturalHeight));
      const c = mk(Math.round(im.naturalWidth * k), Math.round(im.naturalHeight * k)), g = c2(c);
      g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u); res(c);
    };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Bu dosya açılamadı. JPG, PNG ya da WEBP bir görsel seç.')); };
    im.src = u;
  });
}
function loadCustom(){
  if (CUSTOM.im) return Promise.resolve(CUSTOM.im);
  if (!CUSTOM.loading) CUSTOM.loading = idbDo('readonly', os => os.get('ozel')).then(b => b ? blobToCanvas(b, 2560) : null).then(c => { CUSTOM.im = c; return c; }).catch(() => null);
  return CUSTOM.loading;
}
async function setCustomImage(file){
  if (!file || !/^image\/(jpeg|png|webp|gif|avif)$/i.test(file.type || '')) throw new Error('Lütfen bir görsel seç (JPG, PNG, WEBP).');
  if (file.size > 15 * 1024 * 1024) throw new Error('Görsel çok büyük (en fazla 15 MB).');
  const c = await blobToCanvas(file, 2560);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .88));
  try { await idbDo('readwrite', os => os.put(blob, 'ozel')); } catch(e){ /* saklanamazsa bu oturumda yine görünür */ }
  CUSTOM.im = c; CUSTOM.loading = Promise.resolve(c);
  if (st.id === 'ozel') st.id = null;          // aynı sahne de olsa yeniden kurulsun
  set('ozel', { animate: true });
  return true;
}
async function removeCustom(){
  try { await idbDo('readwrite', os => os.delete('ozel')); } catch(e){}
  CUSTOM.im = null; CUSTOM.loading = null;
  if (st.id === 'ozel') set(null);
}
function sceneOzel(W, H, o){
  const ef = o.thumb ? 'sabit' : (st.efekt || 'kenburns');
  let ready = !!CUSTOM.im, cache = null, cg = null, lastKey = '';
  if (!ready && !o.thumb) loadCustom().then(c => { if (c && o.redraw) o.redraw(); });
  const ph = R() * 100;
  // parıltı: yumuşak bokeh ışıkları
  const NB = Math.round(46 * o.q), bx = new Float32Array(NB), by = new Float32Array(NB), br = new Float32Array(NB), bs = new Float32Array(NB), bp = new Float32Array(NB);
  for (let i = 0; i < NB; i++){ bx[i] = R() * W; by[i] = R() * H; br[i] = rnd(6, 26) * Math.max(.5, o.u); bs[i] = rnd(6, 18) * Math.max(.5, o.u); bp[i] = R() * TAU; }
  const bk = glow('255,240,210', 's');
  function xf(t){
    const im = CUSTOM.im, base = Math.max(W / im.width, H / im.height);
    const z = ef === 'sabit' ? 1 : 1.04 + .035 * Math.sin(t * TAU / 90 + ph), s = base * z;
    let dx = (W - im.width * s) / 2, dy = (H - im.height * s) / 2;
    if (ef !== 'sabit'){ dx += Math.sin(t * TAU / 110 + ph) * W * .018; dy += Math.cos(t * TAU / 110 + ph) * H * .018; }
    return { s, dx: clamp(dx, W - im.width * s, 0), dy: clamp(dy, H - im.height * s, 0) };
  }
  return { draw(c, t, dt){
    if (!CUSTOM.im){
      c.fillStyle = vgrad(c, 0, H, [[0, '#1a1f2b'], [1, '#0d1016']]); c.fillRect(0, 0, W, H);
      if (o.thumb){ c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '600 ' + Math.round(H * .16) + 'px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('📷 Görsel seç', W / 2, H / 2); }
      return;
    }
    if (!cache){ cache = mk(W, H); cg = c2(cache); }
    const X = xf(t), key = Math.round(X.s * 1000) + ',' + Math.round(X.dx) + ',' + Math.round(X.dy);
    if (key !== lastKey){ lastKey = key; cg.imageSmoothingQuality = 'high'; cg.drawImage(CUSTOM.im, X.dx, X.dy, CUSTOM.im.width * X.s, CUSTOM.im.height * X.s); }
    c.drawImage(cache, 0, 0);
    if (ef === 'parilti'){
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < NB; i++){
        by[i] -= bs[i] * (dt || 0); if (by[i] < -40){ by[i] = H + 40; bx[i] = R() * W; }
        const a = .10 + .10 * Math.sin(t * 1.3 + bp[i]);
        sprite(c, bk, bx[i] + Math.sin(t * .6 + bp[i]) * 12, by[i], br[i], br[i], a);
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
  } };
}

const SCENES = {
  galaksi: { grup: 'Uzay', name: 'Galaksi', icon: '🌌', desc: 'Fotoğraf gibi sarmal galaksi: parlak çekirdek, toz şeritleri, pembe bulutsular.', make: sceneGalaksi },
  samanyolu: { grup: 'Uzay', name: 'Samanyolu', icon: '✨', desc: 'Altın çekirdekli Samanyolu, karanlık toz yarıkları, ufukta hava ışıması.', make: sceneSamanyolu },
  kayanyildiz: { grup: 'Uzay', name: 'Kayan yıldızlar', icon: '🌠', desc: 'Lacivert gece, ay ışığı ve sık sık kayan yıldızlar.', make: sceneKayan },
  aurora: { grup: 'Doğa', name: 'Kuzey ışıkları', icon: '🏔️', desc: 'Karlı dağlar ve göl üstünde akan, titreşen aurora perdeleri.', make: sceneAurora },
  okyanus: { grup: 'Doğa', name: 'Gece okyanusu', icon: '🌊', desc: 'Ay ışığında yuvarlanan dalgalar ve parıltılar.', make: sceneOkyanus },
  istanbul: { grup: 'Şehir', name: 'İstanbul gecesi', icon: '🌉', desc: 'Galata, camiler, ışıklı köprü; Boğaz’da vapur ve martılar.', make: sceneIstanbul },
  kapadokya: { grup: 'Doğa', name: 'Kapadokya', icon: '🎈', desc: 'Gün doğumunda peri bacalarının üstünde süzülen balonlar.', make: sceneKapadokya },
  atesbocekleri: { grup: 'Doğa', name: 'Ateşböcekleri', icon: '🌲', desc: 'Puslu gece ormanında yanıp sönen ateşböcekleri.', make: sceneAtes },
  cyberpunk: { grup: 'Şehir', name: 'Cyberpunk şehir', icon: '🌆', desc: 'Neon tabelalar, uçan arabalar, yağmur ve hologram.', make: sceneCyber },
  neonsokak: { grup: 'Şehir', name: 'Neon sokak', icon: '🌃', desc: 'Yağmurlu neon ara sokak: titreyen neonlar, sis, su birikintileri.', make: sceneNeonSokak },
  neondalga: { grup: 'Soyut', name: 'Neon dalgalar', icon: '💫', desc: 'Soyut, akan neon ipek dalgalar.', make: sceneDalga },
  ejderha: { grup: 'Fantastik', name: 'Ejderha Vadisi', icon: '🐉', desc: 'Alacakaranlıkta sisli sıradağlar, süzülen ejderha, kıvılcım saçan yanardağ.', make: sceneEjderha },
  buyuluorman: { grup: 'Fantastik', name: 'Büyülü Orman', icon: '🍄', desc: 'Işıldayan mantarlar, gezinen ışık perileri, sisli ışık huzmeleri.', make: sceneBuyuluOrman },
  gecesato: { grup: 'Fantastik', name: 'Gece Şatosu', icon: '🏰', desc: 'Deniz kıyısında uçurumdaki şato, dolunay, yarasalar ve bulutlar.', make: sceneGeceSato },
  buyucukule: { grup: 'Fantastik', name: 'Büyücü Kulesi', icon: '🔮', desc: 'Kitap rafları, fokurdayan iksirler, dönen rün halkası.', make: sceneBuyucuKule },
  kristal: { grup: 'Fantastik', name: 'Kristal Mağara', icon: '💎', desc: 'Işıldayan kristaller, damlalarla halkalanan yeraltı gölü.', make: sceneKristal },
  ozel: { grup: 'Kişisel', name: 'Kendi görselin', icon: '📷', desc: 'İstediğin resmi arka plan yap. Resim sadece bu cihazda saklanır, kimseye gönderilmez.', make: sceneOzel }
};
const LS_KEY = 'oyunodasi-bg';
const st = { id: null, efekt: 'kenburns', animate: true, dim: .25, cv: null, g: null, dimEl: null, scene: null, raf: 0, last: 0, time: 40, paused: false,
  cssW: 0, cssH: 0, s: 1, fps: 30, ms: [], frames: 0, buildMs: 0, drawn: false, q: 1, slow: 0, win: { t0: 0, n: 0 } };
const isMobile = () => Math.min(innerWidth, innerHeight) < 600 || !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){ return false; } };

function ensureDom(){
  if (st.cv && st.cv.isConnected) return;
  const cv = document.createElement('canvas'); cv.id = 'bgfx'; cv.setAttribute('aria-hidden', 'true');
  // z-index:-1 → sayfanın tüm içeriği (konumlu olsun olmasın) tuvalin üstünde kalır; tıklamaları asla yakalamaz
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block';
  const dim = document.createElement('div'); dim.id = 'bgdim'; dim.setAttribute('aria-hidden', 'true');
  dim.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;background:#000;opacity:0';
  document.body.prepend(cv, dim);
  st.cv = cv; st.g = cv.getContext('2d', { alpha: false }); st.dimEl = dim;
}
function build(){
  const cw = Math.max(1, innerWidth), ch = Math.max(1, innerHeight), mob = isMobile();
  let s = Math.min(1, Math.sqrt(1.3e6 / (cw * ch)));
  if (mob) s = Math.min(s, .7);
  s *= st.q;   // cihaz yetişemiyorsa kendiliğinden düşer (bkz. frame)
  const W = Math.round(cw * s), H = Math.round(ch * s);
  st.cv.width = W; st.cv.height = H; st.cssW = cw; st.cssH = ch; st.s = s; st.fps = mob ? 24 : 30;
  const a = performance.now();
  const tok = {}; st.tok = tok;
  // görsel gibi sonradan yüklenen parçalar hazır olunca sahne yeniden çizilsin
  const redraw = () => { if (st.tok !== tok || !st.scene) return; st.drawn = false; if (!st.raf && !document.hidden) render(0, true); };
  st.scene = SCENES[st.id].make(W, H, { u: Math.sqrt(W * H) / 1019, q: mob ? .6 : 1, mobile: mob, redraw });
  st.buildMs = performance.now() - a; st.ms = []; st.drawn = false;
}
function render(dt, still){
  const g = st.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const a = performance.now();
  st.scene.draw(g, st.time, dt, still);
  const ms = performance.now() - a; st.ms.push(ms); if (st.ms.length > 120) st.ms.shift();
  st.frames++; st.drawn = true;
}
function frame(now){
  st.raf = 0;
  if (!st.scene || !st.animate || st.paused || document.hidden) return;
  st.raf = requestAnimationFrame(frame);
  if (st.last && now - st.last < 1000 / st.fps - 4) return;
  const dt = st.last ? Math.min(.1, (now - st.last) / 1000) : 1 / st.fps;
  st.last = now; st.time += dt; render(dt, false);
  // uyarlamalı kalite: 2 sn'lik pencerelerde hedefin %60'ının altında kalırsak iç çözünürlüğü düşür
  const w = st.win; if (!w.t0){ w.t0 = now; w.n = 0; } w.n++;
  if (now - w.t0 > 2000){
    const got = w.n * 1000 / (now - w.t0); w.t0 = now; w.n = 0;
    st.slow = got < st.fps * .6 ? st.slow + 1 : 0;
    if (st.slow >= 2 && st.q > .56){ st.q = Math.max(.55, st.q * .8); st.slow = 0; build(); }
  }
}
function schedule(){
  if (st.raf){ cancelAnimationFrame(st.raf); st.raf = 0; }
  if (!st.scene) return;
  st.win.t0 = 0; st.slow = 0;
  if (st.animate && !st.paused && !document.hidden){ st.last = 0; st.raf = requestAnimationFrame(frame); }
  else if (!st.drawn || !st.animate) { if (!document.hidden || !st.drawn) render(0, true); }
}
function off(){
  if (st.raf){ cancelAnimationFrame(st.raf); st.raf = 0; }
  st.scene = null; st.id = null;
  if (st.cv){ st.cv.width = st.cv.height = 1; st.cv.remove(); st.dimEl.remove(); st.cv = st.g = st.dimEl = null; }
  delete document.documentElement.dataset.bg;
}
function save(){ try { localStorage.setItem(LS_KEY, JSON.stringify({ id: st.id, animate: st.animate, dim: st.dim, efekt: st.efekt })); } catch(e){} }
function saved(){ try { const p = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); return p && typeof p === 'object' ? p : null; } catch(e){ return null; } }

function set(id, opts){
  opts = opts || {};
  if (opts.dim !== undefined) st.dim = clamp(+opts.dim || 0, 0, .8);
  if (opts.efekt && ['kenburns', 'parilti', 'sabit'].includes(opts.efekt) && opts.efekt !== st.efekt){ st.efekt = opts.efekt; if (st.id === 'ozel') st.id = null; }
  if (!id || id === 'yok' || !SCENES[id]){
    if (opts.animate !== undefined) st.animate = !!opts.animate;
    off(); if (opts.save !== false) save(); return false;
  }
  // animate verilmezse: önceki seçim, yoksa sistemin "hareketi azalt" ayarı (yalnız varsayılan öneri)
  st.animate = opts.animate !== undefined ? !!opts.animate : (st.id ? st.animate : !reduced());
  ensureDom();
  document.documentElement.dataset.bg = id;
  st.dimEl.style.opacity = st.dim; st.dimEl.hidden = st.dim <= 0;
  if (id !== st.id || !st.scene){ st.id = id; build(); }
  if (opts.save !== false) save();
  st.drawn = st.drawn && st.animate;
  schedule();
  return true;
}
function thumb(id, cv){
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (!SCENES[id]){ g.fillStyle = vgrad(g, 0, H, [[0, '#1a1f2b'], [1, '#0d1016']]); g.fillRect(0, 0, W, H); return false; }
  const sc = SCENES[id].make(W, H, { u: Math.sqrt(W * H) / 1019, q: .7, mobile: false, thumb: true });
  sc.draw(g, 40, 0, true);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (sc.thumbAsync) sc.thumbAsync.then(() => { if (cv.isConnected !== false) thumb(id, cv); });
  if (id === 'ozel' && !CUSTOM.im) loadCustom().then(c => { if (c) thumb(id, cv); });
  return true;
}
let rzT = 0;
addEventListener('resize', () => {
  clearTimeout(rzT);
  rzT = setTimeout(() => {
    if (!st.scene) return;
    // telefonda adres çubuğu açılıp kapanınca yeniden kurma: tuval CSS ile esner
    if (Math.abs(innerWidth - st.cssW) < 2 && Math.abs(innerHeight - st.cssH) / st.cssH < .15) return;
    build(); schedule();
  }, 250);
});
document.addEventListener('visibilitychange', schedule);

window.OyunBG = {
  list: [{ id: 'yok', grup: 'Genel', name: 'Yok', icon: '⬛', desc: 'Hareketli arka plan kapalı.' }]
    .concat(Object.keys(SCENES).map(id => ({ id, grup: SCENES[id].grup, name: SCENES[id].name, icon: SCENES[id].icon, desc: SCENES[id].desc }))),
  set, thumb, saved, setCustomImage, removeCustom,
  hasCustom(){ return loadCustom().then(c => !!c); },
  get efekt(){ return st.efekt; },
  get current(){ return st.id; },
  pause(v){ st.paused = !!v; schedule(); },
  restore(){ const p = saved(); if (p && p.efekt) st.efekt = p.efekt; if (p && p.id && SCENES[p.id]) set(p.id, { animate: p.animate, dim: p.dim, save: false }); else if (p){ if (p.dim !== undefined) st.dim = clamp(+p.dim || 0, 0, .8); if (p.animate !== undefined) st.animate = !!p.animate; } },
  info(){
    const a = st.ms, avg = a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    return { id: st.id, animate: st.animate, paused: st.paused, running: !!st.raf, fps: st.fps, scale: +st.s.toFixed(3), quality: +st.q.toFixed(2),
      w: st.cv ? st.cv.width : 0, h: st.cv ? st.cv.height : 0, avgMs: +avg.toFixed(3), maxMs: +(a.length ? Math.max(...a) : 0).toFixed(3), frames: st.frames, buildMs: +st.buildMs.toFixed(1) };
  },
  // test/ölçüm: n kareyi eşzamanlı çizer; flush=true ise her karede 1 piksel okuyarak GPU işini de bekler
  _bench(n, flush){
    if (!st.scene) return null;
    const out = []; for (let i = 0; i < (n || 120); i++){ const a = performance.now(); st.time += 1 / 30; render(1 / 30, false); if (flush) st.g.getImageData(0, 0, 1, 1); out.push(performance.now() - a); }
    out.sort((x, y) => x - y);
    return { avg: +(out.reduce((x, y) => x + y, 0) / out.length).toFixed(3), p95: +out[Math.floor(out.length * .95)].toFixed(3), max: +out[out.length - 1].toFixed(3) };
  }
};
if (document.body) window.OyunBG.restore(); else document.addEventListener('DOMContentLoaded', () => window.OyunBG.restore());
})();
