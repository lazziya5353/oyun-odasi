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
/* =================== SAHNELER =================== */
// Her sahne: make(W, H, o) → { draw(g, t, dt, still) }   o: {u: ölçek birimi, q: yoğunluk, mobile}

/* ---------- Galaksi ---------- */
function sceneGalaksi(W, H, o){
  const u = o.u, A = W * H / 1.04e6 * o.q, M = Math.max(W, H), m = Math.min(W, H), land = W >= H;
  const bg = mk(W, H), g = c2(bg);
  let gr = g.createRadialGradient(W * .55, H * .5, 0, W * .55, H * .5, Math.hypot(W, H) * .65);
  gr.addColorStop(0, '#0d0b24'); gr.addColorStop(.45, '#070818'); gr.addColorStop(1, '#020207');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  const neb = [['110,45,190', '70,40,170', '190,60,150'], ['30,85,185', '40,150,190', '60,60,180'], ['190,50,120', '140,40,170', '230,110,90']];
  neb.forEach((cs, i) => {
    const cx = (i === 0 ? rnd(.05, .3) : i === 1 ? rnd(.7, .95) : rnd(.3, .7)) * W, cy = (i === 2 ? rnd(.75, .95) : rnd(.1, .45)) * H;
    for (let k = 0; k < 18; k++){ const r = M * rnd(.05, .2); sprite(g, glow(pick(cs), 's'), cx + gauss() * M * .12, cy + gauss() * M * .07, r, r * rnd(.45, .9), rnd(.035, .085)); }
  });
  g.globalCompositeOperation = 'source-over';
  stars(g, 2400 * A, 0, 0, W, H, { u });
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++){
    const r = rnd(5, 13) * Math.max(.6, u); g.save(); g.translate(R() * W, R() * H); g.rotate(R() * TAU);
    sprite(g, glow('215,200,255', 's'), 0, 0, r, r * rnd(.22, .45), .4); sprite(g, glow('255,240,220', 'h'), 0, 0, r * .25, r * .14, .6); g.restore();
  }
  g.globalCompositeOperation = 'source-over';
  dither(g, W, H, .035);

  // sarmal galaksi: tek disk katmanı (parçacıklar + kol ışığı + toz şeritleri), eğik düzlemde yavaşça döner
  const Rg = Math.min(M * .44, m * .8), tilt = .42, orient = land ? -.32 : Math.PI / 2 - .32;
  const cx = W * (land ? .57 : .5), cy = H * .5, S = Math.ceil(Rg * 2.1), hS = S / 2, r0 = Rg * .07;
  const armAng = (r, arm) => arm * Math.PI + Math.log(Math.max(r, r0) / r0) * 2.1;
  const COL = [[0, [255, 222, 170]], [.16, [255, 236, 214]], [.38, [214, 220, 255]], [.7, [160, 186, 255]], [1, [128, 158, 255]]];
  const colAt = f => { for (let i = 1; i < COL.length; i++) if (f <= COL[i][0]){ const [p0, a] = COL[i - 1], [p1, b] = COL[i], k = (f - p0) / (p1 - p0); return a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(','); } return COL[COL.length - 1][1].join(','); };
  const NP = 13000 * clamp(A, .3, 1.5);
  function layer(rIn, rOut, fIn, fOut, n){
    const c = mk(S, S), q = c2(c); q.translate(hS, hS);
    const win = r => (fIn ? clamp((r - rIn) / fIn, 0, 1) : 1) * (fOut ? clamp((rOut - r) / fOut, 0, 1) : 1);
    const lo = Math.max(0, rIn - fIn * .2), rr0 = () => lo + (rOut - lo) * Math.pow(R(), 1.5);
    q.globalCompositeOperation = 'lighter';
    // disk ışığı
    for (let i = 0; i < 40; i++){ const r = R() * rOut, a = R() * TAU, w = win(r); if (w <= 0) continue; const br = Rg * rnd(.15, .3); sprite(q, glow(colAt(r / Rg), 's'), Math.cos(a) * r, Math.sin(a) * r, br, br, .05 * w); }
    // kol parıltısı
    for (let i = 0; i < n * .06; i++){
      const arm = i % 2, r = rr0(), w = win(r); if (w <= 0) continue;
      const a = armAng(r, arm) + gauss() * .16, rr = r + gauss() * Rg * .02, br = Rg * rnd(.03, .075);
      sprite(q, glow(colAt(r / Rg), 's'), Math.cos(a) * rr, Math.sin(a) * rr, br, br, .11 * w);
    }
    // toz şeritleri
    q.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < n * .05; i++){
      const arm = i % 2, r = Rg * rnd(.1, .95), a = armAng(r, arm) - .26 + gauss() * .05, br = Rg * rnd(.012, .03);
      sprite(q, glow('0,0,0', 's'), Math.cos(a) * r, Math.sin(a) * r, br, br, .5 * win(r));
    }
    // yıldız parçacıkları (renk kovalarında)
    q.globalCompositeOperation = 'lighter';
    const B = 14, bk = Array.from({ length: B }, () => []);
    for (let i = 0; i < n; i++){
      let r, a;
      if (R() < .25){ r = -Math.log(1 - R() * .985) * Rg * .2; a = R() * TAU; }
      else { r = rr0(); a = armAng(r, i % 2) + gauss() * (.34 - .16 * r / Rg); r += gauss() * Rg * .028; }
      if (r < 0 || R() > win(r)) continue;
      bk[Math.min(B - 1, (r / Rg * B) | 0)].push(Math.cos(a) * r, Math.sin(a) * r);
    }
    const ps = Math.max(1, 1.1 * u);
    bk.forEach((arr, b) => { q.fillStyle = 'rgb(' + colAt((b + .5) / B) + ')'; for (let k = 0; k < arr.length; k += 2){ q.globalAlpha = rnd(.3, 1); const s = R() < .12 ? ps * 1.7 : ps; q.fillRect(arr[k], arr[k + 1], s, s); } });
    // genç mavi yıldızlar ve pembe bulutsular
    for (let i = 0; i < n * .02; i++){
      const r = Rg * rnd(.22, .95), w = win(r); if (w <= 0) continue; const a = armAng(r, i % 2) + gauss() * .12;
      if (R() < .55){ const rr = rnd(1.5, 3.6) * Math.max(.6, u); sprite(q, glow(R() < .7 ? '190,215,255' : '255,255,255', 'h'), Math.cos(a) * r, Math.sin(a) * r, rr, rr, .75 * w); }
      else { const rr = rnd(2, 6) * Math.max(.6, u); sprite(q, glow('255,105,170', 's'), Math.cos(a) * r, Math.sin(a) * r, rr, rr, .55 * w); }
    }
    q.globalAlpha = 1;
    return c;
  }
  const disc = layer(0, Rg * 1.02, 0, Rg * .32, NP * 1.25);
  const tw = twinkles(120 * clamp(A, .25, 1.5), 0, 0, W, H, u);
  // dönen disk pahalı (büyük, döndürülmüş kopya): en dış kol ~0.7 px kayınca yeniden birleştirilir
  const coreR = Rg * .33, cache = mk(W, H), cg = c2(cache); let lastA = NaN; const thr = 1 / Rg;
  // çekirdek simetrik: dönmesine gerek yok, zemine bir kez basılır
  g.save(); g.translate(cx, cy); g.rotate(orient); g.globalCompositeOperation = 'lighter';
  sprite(g, glow('255,190,130', 's'), 0, 0, coreR * 1.9, coreR * .95, .4);
  sprite(g, glow('255,222,175', 's'), 0, 0, coreR * .75, coreR * .5, .6);
  g.restore();
  function compose(c, a, t){
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.drawImage(bg, 0, 0);
    c.save(); c.translate(cx, cy); c.rotate(orient); c.scale(1, tilt); c.globalCompositeOperation = 'lighter';
    c.rotate(a); c.drawImage(disc, -hS, -hS);
    c.restore();
    c.save(); c.translate(cx, cy); c.rotate(orient); c.globalCompositeOperation = 'lighter';
    sprite(c, glow('255,250,238', 'h'), 0, 0, coreR * .3, coreR * .22, .95);
    c.restore();
  }
  return { draw(c, t){
    const a = -t * .012;
    if (!(Math.abs(a - lastA) < thr)){ lastA = a; compose(cg, a, t); }
    c.drawImage(cache, 0, 0);
    drawTw(c, tw, t);
  } };
}

/* ---------- Samanyolu ---------- */
function sceneSamanyolu(W, H, o){
  const u = o.u, A = W * H / 1.04e6 * o.q, land = W >= H, m = Math.min(W, H);
  const MG = .12, SW = Math.ceil(W * (1 + 2 * MG)), SH = Math.ceil(H * (1 + 2 * MG)), ox = W * MG, oy = H * MG;
  const yh = H * (land ? .8 : .84);
  const sky = mk(SW, SH), g = c2(sky);
  g.fillStyle = vgrad(g, 0, SH, [[0, '#020309'], [.45, '#060a1b'], [.75, '#0c1430'], [.9, '#1a1d38'], [1, '#2a2440']]);
  g.fillRect(0, 0, SW, SH);
  stars(g, 2800 * A, 0, 0, SW, SH, { u, max: .9 });
  // galaktik bant (çapraz)
  const P0 = land ? [-.05 * SW, .95 * SH] : [-.2 * SW, .8 * SH], P1 = land ? [1.05 * SW, .02 * SH] : [1.2 * SW, .12 * SH];
  const dx = P1[0] - P0[0], dy = P1[1] - P0[1], Lb = Math.hypot(dx, dy), ux = dx / Lb, uy = dy / Lb, nx = -uy, ny = ux;
  const bw = t => (.085 + .075 * Math.exp(-Math.pow((t - .36) / .14, 2))) * Math.max(SW, SH) * (land ? 1 : .75);
  const wob = t => (Math.sin(t * 7.3) * .018 + Math.sin(t * 15 + 1) * .008) * m;
  const at = (t, off) => [P0[0] + dx * t + nx * (off + wob(t)), P0[1] + dy * t + ny * (off + wob(t))];
  const coreK = t => Math.exp(-Math.pow((t - .36) / .12, 2)), edge = t => .35 + .65 * Math.pow(Math.sin(Math.PI * clamp(t, 0, 1)), .6);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 560; i++){
    const t = R(), k = coreK(t), [x, y] = at(t, gauss() * bw(t) * .5);
    const col = k > .45 ? pick(['255,196,150', '255,170,120', '255,226,190', '240,180,200']) : pick(['115,125,225', '150,115,215', '105,150,235', '175,140,225', '200,190,240']);
    const r = rnd(.04, .11) * m * (1 + k * .7);
    sprite(g, glow(col, 's'), x, y, r, r * rnd(.6, 1), rnd(.045, .085) * (.6 + k * .9) * edge(t));
  }
  // yoğun yıldız bulutu
  const nC = 22000 * A, sc = ['255,250,240', '255,236,214', '225,232,255'];
  for (let ci = 0; ci < 3; ci++){
    g.fillStyle = 'rgb(' + sc[ci] + ')';
    for (let i = 0; i < nC / 3; i++){ const t = R(), [x, y] = at(t, gauss() * bw(t) * .42); g.globalAlpha = rnd(.08, .55) * (.7 + coreK(t) * .5); const s = Math.max(.8, u * (R() < .1 ? 1.5 : 1)); g.fillRect(x, y, s, s); }
  }
  for (let i = 0; i < 14; i++){ const t = rnd(.28, .45), [x, y] = at(t, gauss() * bw(t) * .3), r = rnd(4, 10) * Math.max(.6, u); sprite(g, glow('255,105,150', 's'), x, y, r, r, .45); }
  // karanlık yarık (Büyük Yarık iki kola ayrılır)
  g.globalCompositeOperation = 'source-over';
  const dark = glow('5,5,13', 's');
  for (let i = 0; i < 1300; i++){
    const t = rnd(.05, .95), split = t > .2 && t < .62 ? Math.sin((t - .2) / .42 * Math.PI) : 0;
    const side = R() < .5 ? -1 : 1, off = bw(t) * (side * split * .16 + Math.sin(t * 11) * .05 + gauss() * .04);
    const [x, y] = at(t, off), r = rnd(.01, .03) * m * (1 + coreK(t) * .9);
    sprite(g, dark, x, y, r, r * rnd(.6, 1), rnd(.1, .26) * (.3 + .7 * coreK(t) + .25) * edge(t));
  }
  stars(g, 700 * A, 0, 0, SW, SH, { u, big: .8 });
  g.globalAlpha = 1;
  dither(g, SW, SH, .03);
  // ufuk: tepeler ve ağaçlar
  const hz = mk(W, H), h = c2(hz);
  h.fillStyle = vgrad(h, yh - H * .25, yh + 2, [[0, 'rgba(255,150,90,0)'], [.7, 'rgba(255,140,90,.06)'], [1, 'rgba(255,150,100,.16)']]);
  h.fillRect(0, yh - H * .25, W, H * .25 + 4);
  const far = ridge(W, yh - H * .015, H * .07, .7, 6 * Math.max(.5, u));
  h.fillStyle = vgrad(h, yh - H * .09, H, [[0, '#121831'], [1, '#080b18']]); fillPts(h, far, H);
  const near = ridge(W, yh + H * .05, H * .07, 1, 5 * Math.max(.5, u));
  h.fillStyle = '#020308'; fillPts(h, near, H);
  for (let x = 0; x < W; x += rnd(3, 16) * Math.max(.5, u)){
    if (R() < .35) continue; const y = yAt(near, x) + 2, th = rnd(14, 38) * Math.max(.45, u) * (R() < .1 ? 1.6 : 1);
    spruce(h, x, y, th, th * rnd(.32, .42));
  }
  const tw = twinkles(170 * clamp(A, .25, 1.5), 0, 0, SW, SH * .85, u);
  const met = []; let next = 4;
  const mo = { ang: land ? .55 : 1.0, spread: .3, speed: 700, len: 170, w: 1.1, x0: .1, x1: .8, y0: .02, y1: .4 };
  const px = W * .5, py = H * 1.35, hzTop = Math.max(0, Math.floor(yh - H * .25));
  // gök çok yavaş döner: döndürülmüş gökyüzü önbelleğe alınır, yalnız ~0.3 px kayınca yeniden çizilir
  const cache = mk(W, H), cg = c2(cache); let lastAng = NaN;
  const thr = .3 / Math.hypot(W, H * 1.35);
  return { draw(c, t, dt, still){
    const ang = Math.sin(t * .012) * .03;
    if (!(Math.abs(ang - lastAng) < thr)){ lastAng = ang; cg.setTransform(1, 0, 0, 1, 0, 0); cg.translate(px, py); cg.rotate(ang); cg.translate(-px - ox, -py - oy); cg.drawImage(sky, 0, 0); }
    c.drawImage(cache, 0, 0);
    c.save(); c.translate(px, py); c.rotate(lastAng); c.translate(-px - ox, -py - oy); drawTw(c, tw, t); c.restore();
    if (still){ if (!met.length){ const s = meteorNew(W, H, u, mo); s.age = s.life * .3; met.push(s); } }
    else { next -= dt; if (next <= 0){ met.push(meteorNew(W, H, u, mo)); next = rnd(5, 14); } meteorsStep(met, dt, W); }
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
const WORDS = ['ÇAY', 'OYUN', '24/7', 'DÖNER', 'OTEL', 'KAFE', 'SİBER', 'BAR', 'NEON', 'ŞANS', 'SİNEMA', 'SİMİT', 'AÇIK', 'ARCADE', 'KEBAP', 'LOKANTA'];
function neonSign(u, vertical){
  const col = pick(NEON), word = pick(vertical ? ['OYUN', 'OTEL', 'ÇAY', 'BAR', 'SİBER', 'KAFE', 'NEON'] : WORDS);
  const fs = (vertical ? rnd(12, 16) : rnd(13, 22)) * u, pad = 5 * u, gm = 10 * u, font = '700 ' + fs + 'px "Segoe UI",system-ui,sans-serif';
  const meas = c2(mk(1, 1)); meas.font = font;
  const lw = vertical ? fs * 1.05 : meas.measureText(word).width, lh = vertical ? fs * 1.12 * [...word].length : fs * 1.1;
  const bw = lw + pad * 2, bh = lh + pad * 2, c = mk(bw + gm * 2, bh + gm * 2), g = c2(c);
  g.translate(gm, gm);
  g.fillStyle = 'rgba(8,4,18,.92)'; g.fillRect(0, 0, bw, bh);
  g.shadowColor = 'rgb(' + col + ')'; g.shadowBlur = 8 * u;
  g.strokeStyle = 'rgba(' + col + ',.95)'; g.lineWidth = Math.max(1, 1.4 * u); g.strokeRect(1.5 * u, 1.5 * u, bw - 3 * u, bh - 3 * u);
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgb(' + col + ')';
  if (vertical) [...word].forEach((ch, i) => g.fillText(ch, bw / 2, pad + fs * 1.12 * (i + .5)));
  else g.fillText(word, bw / 2, bh / 2 + fs * .04);
  g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.55)';
  if (vertical) [...word].forEach((ch, i) => g.fillText(ch, bw / 2, pad + fs * 1.12 * (i + .5)));
  else g.fillText(word, bw / 2, bh / 2 + fs * .04);
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
    for (let k = 0; k < ns; k++){
      const sg = neonSign(u * o.signScale, R() < .4); if (sg.w > c.width) continue;
      const gx = clamp(x + rnd(-.15, .9) * b.w - sg.gm, sx, sx + c.width - sg.w), gy = y + rnd(.05, .55) * b.h;
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
  const hw2 = 220 * U, hh = 96 * U, holo = mk(hw2, hh), hg = c2(holo);
  hg.fillStyle = vgrad(hg, 0, hh, [[0, 'rgba(0,240,255,.16)'], [1, 'rgba(255,42,140,.08)']]); hg.fillRect(0, 0, hw2, hh);
  hg.strokeStyle = 'rgba(0,240,255,.8)'; hg.lineWidth = Math.max(1, 1.2 * U); hg.strokeRect(1, 1, hw2 - 2, hh - 2);
  hg.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < hh; y += 3) hg.fillRect(0, y, hw2, 1);
  hg.font = '800 ' + (40 * U) + 'px "Segoe UI",system-ui,sans-serif'; hg.textAlign = 'center'; hg.textBaseline = 'middle';
  hg.shadowColor = '#00f0ff'; hg.shadowBlur = 12 * U; hg.fillStyle = 'rgba(160,250,255,.92)'; hg.fillText('OYUN', hw2 * .63, hh * .42);
  hg.font = '700 ' + (13 * U) + 'px "Segoe UI",system-ui,sans-serif'; hg.shadowColor = '#ff2a8c'; hg.fillStyle = 'rgba(255,150,210,.95)'; hg.fillText('ODASI · 24/7 AÇIK', hw2 * .63, hh * .78);
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
    // hologram
    const gl = (t % 7) < .18, fl = .72 + .14 * Math.sin(t * 3.1) + (Math.sin(t * 37) > .96 ? -.3 : 0);
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
    // orta katman
    const o1 = Math.round(t * 6 * U), o2 = Math.round(t * 16 * U);   // tam piksel: kopyalama filtresiz ve ucuz
    drawStrip(c, L1s, o1, W); signsDraw(c, L1, o1, t);
    carsDraw(c, t, dt, still, false);
    drawCity(c, L2, o2, W); signsDraw(c, L2, o2, t);
    if ((t % 2) < 1){ c.globalCompositeOperation = 'lighter'; for (let i = 0; i < L2.blink.length; i += 2){ let x = L2.blink[i] - o2; x = ((x % TW2) + TW2) % TW2; if (x < W) sprite(c, redS, x, L2.blink[i + 1], 4 * U, 4 * U, .8); } c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
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
  const curt = (base, amp, hb, al, tex) => ({ base, amp, hb, al, tex, k: [rnd(4, 7), rnd(9, 14), rnd(3, 6), rnd(5, 9), rnd(2, 4)], w: [rnd(.05, .1), rnd(.08, .15), rnd(.1, .2), rnd(.2, .35), rnd(.06, .12)], p: Array.from({ length: 5 }, () => R() * TAU), ts: rnd(1.2, 2), tv: rnd(5, 10) });
  const curts = [curt(.46, .08, .4, .6, tex2), curt(.64, .11, .55, 1, tex1), curt(.8, .06, .4, .7, tex1)];
  const NS = 44;
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
        I = cu.al * (.22 + .78 * Math.pow(I, .75)) * (.65 + .35 * Math.sin(xm * 3.1 + p[2]));
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
  // aurora yavaş akar: sahne 10 Hz'de birleştirilir, aradaki karelerde önbellek kopyalanır
  const cache = mk(W, H), cg = c2(cache); let fr = 0;
  return { draw(c0, t, dt, still){
    if (!still && (fr++ % 3)){ c0.drawImage(cache, 0, 0); return; }
    const c = cg; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.drawImage(bg, 0, 0);
    drawTw(c, tw, t);
    drawAurora(t);
    c.globalCompositeOperation = 'lighter';
    c.drawImage(AC, 0, 0, aw, ah, 0, 0, W, ah * 3);
    c.save(); c.beginPath(); c.rect(0, yh, W, H - yh); c.clip(); c.translate(0, yh * 2); c.scale(1, -1); c.globalAlpha = .32;
    c.drawImage(AC, 0, 0, aw, ah, 0, 0, W, ah * 3); c.restore();
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

/* =================== MOTOR =================== */
const SCENES = {
  galaksi: { name: 'Galaksi', icon: '🌌', desc: 'Yavaşça dönen sarmal galaksi, bulutsular ve parıldayan yıldızlar.', make: sceneGalaksi },
  samanyolu: { name: 'Samanyolu', icon: '✨', desc: 'Tepelerin üstünde çapraz Samanyolu kuşağı, ara sıra bir göktaşı.', make: sceneSamanyolu },
  kayanyildiz: { name: 'Kayan yıldızlar', icon: '🌠', desc: 'Lacivert gece, ay ışığı ve sık sık kayan yıldızlar.', make: sceneKayan },
  istanbul: { name: 'İstanbul gecesi', icon: '🌉', desc: 'Galata, camiler, ışıklı köprü; Boğaz’da vapur ve martılar.', make: sceneIstanbul },
  cyberpunk: { name: 'Cyberpunk şehir', icon: '🌆', desc: 'Neon tabelalar, uçan arabalar, yağmur ve hologram.', make: sceneCyber },
  aurora: { name: 'Kuzey ışıkları', icon: '🏔️', desc: 'Karlı dağlar ve göl üstünde dalgalanan aurora perdeleri.', make: sceneAurora },
  okyanus: { name: 'Gece okyanusu', icon: '🌊', desc: 'Ay ışığında yuvarlanan dalgalar ve parıltılar.', make: sceneOkyanus }
};
const LS_KEY = 'oyunodasi-bg';
const st = { id: null, animate: true, dim: .25, cv: null, g: null, dimEl: null, scene: null, raf: 0, last: 0, time: 40, paused: false,
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
  st.scene = SCENES[st.id].make(W, H, { u: Math.sqrt(W * H) / 1019, q: mob ? .6 : 1, mobile: mob });
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
function save(){ try { localStorage.setItem(LS_KEY, JSON.stringify({ id: st.id, animate: st.animate, dim: st.dim })); } catch(e){} }
function saved(){ try { const p = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); return p && typeof p === 'object' ? p : null; } catch(e){ return null; } }

function set(id, opts){
  opts = opts || {};
  if (opts.dim !== undefined) st.dim = clamp(+opts.dim || 0, 0, .8);
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
  list: [{ id: 'yok', name: 'Yok', icon: '⬛', desc: 'Hareketli arka plan kapalı.' }]
    .concat(Object.keys(SCENES).map(id => ({ id, name: SCENES[id].name, icon: SCENES[id].icon, desc: SCENES[id].desc }))),
  set, thumb, saved,
  get current(){ return st.id; },
  pause(v){ st.paused = !!v; schedule(); },
  restore(){ const p = saved(); if (p && p.id && SCENES[p.id]) set(p.id, { animate: p.animate, dim: p.dim, save: false }); else if (p){ if (p.dim !== undefined) st.dim = clamp(+p.dim || 0, 0, .8); if (p.animate !== undefined) st.animate = !!p.animate; } },
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
