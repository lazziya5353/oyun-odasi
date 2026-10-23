// Kızma Panpi çizimi: 3 boyutlu tahta, ayakta duran taşlar, zar tepsisi, taş zıplama / vurma animasyonları.
// Kurallar kizma-core.js'te; burası yalnızca gelen görünümü (view) çizer ve hamleleri tableAct ile gönderir.
const KZB = 704, KZC = 64;                         // tahta 11x11 kare, kare 64px
const KZ_COL = [['#e5484d', '#ff8f93', '#8f1f24'], ['#3e8cf0', '#8cbcff', '#1a4a96'], ['#34b36a', '#7fe0a6', '#17693a'], ['#f2c230', '#ffe58a', '#9a7208']];
const KZ_NAME = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı'];
// 40 karelik halka (sütun, satır); 0. kare kırmızının başlangıcı, saat yönünde
const KZ_RING = [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [5, 0],
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [10, 5],
  [10, 6], [9, 6], [8, 6], [7, 6], [6, 6], [6, 7], [6, 8], [6, 9], [6, 10], [5, 10],
  [4, 10], [4, 9], [4, 8], [4, 7], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 5]];
const KZ_LANE = [[[1, 5], [2, 5], [3, 5], [4, 5]], [[5, 1], [5, 2], [5, 3], [5, 4]], [[9, 5], [8, 5], [7, 5], [6, 5]], [[5, 9], [5, 8], [5, 7], [5, 6]]];
const KZ_BASE = [[[0.5, 0.5], [1.5, 0.5], [0.5, 1.5], [1.5, 1.5]], [[8.5, 0.5], [9.5, 0.5], [8.5, 1.5], [9.5, 1.5]],
  [[8.5, 8.5], [9.5, 8.5], [8.5, 9.5], [9.5, 9.5]], [[0.5, 8.5], [1.5, 8.5], [0.5, 9.5], [1.5, 9.5]]];
const KZ_PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const KZ_FACE = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
const kzUIs = new Map();
const kzEl = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const kzEsc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kzSleep = ms => new Promise(r => setTimeout(r, ms));
const kzCell = (c, r) => ({ x: (c + 0.5) * KZC, y: (r + 0.5) * KZC });
// koltuk → renk (Ludo tahtasında sıra saat yönünde: kırmızı, yeşil, sarı, mavi)
const kzLudo = ui => !!(ui && ui.v && ui.v.tahta === 'ludo');
const kzRk = (ui, k) => kzLudo(ui) ? KizmaCore.LUDO_RENK[k] : k;
const kzC = (ui, k) => KZ_COL[kzRk(ui, k)];

// ---- Ludo tahtası: 15x15 kare, kare 48px ----
const LD_C = 48, LD_B = 15 * LD_C;
// 52 karelik ortak yol (sütun, satır); 0 = sol üstteki (yeşil) oyuncunun başlangıcı, saat yönünde
const LD_RING = (() => {
  const r = [];
  for (let c = 1; c <= 5; c++) r.push([c, 6]);
  for (let y = 5; y >= 0; y--) r.push([6, y]);
  r.push([7, 0], [8, 0]);
  for (let y = 1; y <= 5; y++) r.push([8, y]);
  for (let c = 9; c <= 14; c++) r.push([c, 6]);
  r.push([14, 7], [14, 8]);
  for (let c = 13; c >= 9; c--) r.push([c, 8]);
  for (let y = 9; y <= 14; y++) r.push([8, y]);
  r.push([7, 14], [6, 14]);
  for (let y = 13; y >= 9; y--) r.push([6, y]);
  for (let c = 5; c >= 0; c--) r.push([c, 8]);
  r.push([0, 7], [0, 6]);
  return r;
})();
// köşe (yuva) sol üst köşesi; koltuk 0 sol alt, 1 sol üst, 2 sağ üst, 3 sağ alt
const LD_YARD = [[0, 9], [0, 0], [9, 0], [9, 9]];
// ev yolu (dıştan içe 5 kare)
const LD_LANE = [
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
];
// ortadaki bitiş üçgeninde taşların yeri (px): koltuğun geldiği yöndeki üçgen
function ldFinish(seat, i){
  const C = LD_C, o = (i - 1.5) * 0.3 * C;
  if (seat === 0) return { x: 7.5 * C + o, y: 8.45 * C };
  if (seat === 1) return { x: 6.55 * C, y: 7.5 * C + o };
  if (seat === 2) return { x: 7.5 * C + o, y: 6.55 * C };
  return { x: 8.45 * C, y: 7.5 * C + o };
}
const ldCell = (c, r) => ({ x: (c + 0.5) * LD_C, y: (r + 0.5) * LD_C });

// taşın ilerleme değerinden (p) tahta üstündeki yeri
function kzXY(ui, seat, p, i){
  if (kzLudo(ui)){
    if (p === -1){ const y = LD_YARD[seat], d = [[-1, -1], [1, -1], [-1, 1], [1, 1]][i]; return { x: (y[0] + 3 + d[0] * 0.8) * LD_C, y: (y[1] + 3 + d[1] * 0.8) * LD_C }; }
    if (p < 51){ const c = LD_RING[(KizmaCore.startOf(ui.v, seat) + p) % 52]; return ldCell(c[0], c[1]); }
    if (p < 56){ const c = LD_LANE[seat][p - 51]; return ldCell(c[0], c[1]); }
    return ldFinish(seat, i);
  }
  if (p === -1){ const b = KZ_BASE[seat][i]; return { x: (b[0] + 0.5) * KZC, y: (b[1] + 0.5) * KZC }; }
  if (p < 40){ const c = KZ_RING[(10 * seat + p) % 40]; return kzCell(c[0], c[1]); }
  const c = KZ_LANE[seat][p - 40]; return kzCell(c[0], c[1]);
}
function kzPawnSvg(k){
  const c = KZ_COL[k];
  return '<svg viewBox="0 0 40 58" class="kz-svg"><defs>' +
    '<radialGradient id="kzh' + k + '" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="' + c[1] + '"/><stop offset=".55" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[2] + '"/></radialGradient>' +
    '<linearGradient id="kzb' + k + '" x1="0" x2="1"><stop offset="0" stop-color="' + c[2] + '"/><stop offset=".35" stop-color="' + c[0] + '"/><stop offset=".6" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient></defs>' +
    '<ellipse cx="20" cy="54" rx="16" ry="4" fill="rgb(0 0 0 / .35)"/>' +
    '<path d="M5 54 Q5 49 10 46 Q14 30 16 27 H24 Q26 30 30 46 Q35 49 35 54 Z" fill="url(#kzb' + k + ')" stroke="' + c[2] + '" stroke-width="1"/>' +
    '<circle cx="20" cy="16" r="12" fill="url(#kzh' + k + ')" stroke="' + c[2] + '" stroke-width="1"/>' +
    '<ellipse cx="15.5" cy="11.5" rx="4" ry="2.6" fill="rgb(255 255 255 / .55)" transform="rotate(-30 15.5 11.5)"/></svg>';
}

function kzState(id){
  let u = kzUIs.get(id);
  if (!u){
    u = { id, vis: null, eid: -1, gameNo: 0, evq: [], running: false, busy: false, lite: false, seen: {}, logLid: 0, deadline: 0, tilt: 40 };
    let lite = null; try { lite = store.get('oyunodasi-kizma-lite'); } catch(e){}
    u.lite = lite === '1' || (lite === null && window.matchMedia('(max-width:700px)').matches && (navigator.hardwareConcurrency || 8) <= 4);
    kzUIs.set(id, u);
  }
  return u;
}
const kzVisFrom = v => ({ pw: v.P.map(p => p.pw.slice()), d: v.d || 0, act: v.turn, over: v.phase === 'over' });

// ================== kurulum ==================
function renderKizma(body, s, lv){
  const v = lv.v, seat = lv.seat;
  const ui = kzState(s.id);
  ui.s = s; ui.v = v; ui.seat = seat;
  let root = body.querySelector('.kz');
  if (!root || root.dataset.tid !== s.id || root.dataset.tahta !== (v.tahta || 'klasik')){
    body.innerHTML = '';
    root = kzBuild(ui); body.append(root);
    ui.root = root; ui.vis = null; ui.eid = -1;
  }
  ui.root = root;
  ui.deadline = v.left ? Date.now() + v.left : 0;
  if (ui.gameNo !== (v.gameNo || 1)){ ui.vis = null; ui.eid = -1; ui.evq = []; ui.gameNo = v.gameNo || 1; root.querySelectorAll('.kz-pawn').forEach(p => p.remove()); }
  if (!ui.vis){
    ui.vis = kzVisFrom(v); ui.logLid = v.lid; ui.eid = v.eid; ui.dieShown = v.d || 0;
  }
  if (v.eid > ui.eid){
    const gap = v.eid - ui.eid;
    if (gap > 4 || reducedMotion() || !v.ev.length){ ui.eid = v.eid; if (!ui.running){ ui.vis = kzVisFrom(v); ui.logLid = v.lid; } }
    else { ui.eid = v.eid; ui.evq.push(...v.ev.map(e => Object.assign({}, e))); if (!ui.running) kzRun(ui); }
  } else if (!ui.running && !ui.evq.length){ ui.vis = kzVisFrom(v); ui.logLid = v.lid; }
  kzFit(ui);
  kzPaint(ui);
}

function kzBuild(ui){
  const root = kzEl('div', 'kz');
  root.dataset.tid = ui.s.id;
  const ld = kzLudo(ui);
  root.dataset.tahta = ld ? 'ludo' : 'klasik';
  root.classList.toggle('ludo', ld);
  ui.B = ld ? LD_B : KZB;
  root.style.setProperty('--kzb', ui.B + 'px');
  root.innerHTML =
    '<div class="kz-left"><div class="kz-players"></div><div class="kz-log"></div></div>' +
    '<div class="kz-center">' +
      '<div class="kz-banner"></div>' +
      '<div class="kz-fit"><div class="kz-scaler"><div class="kz-stage"><div class="kz-board">' +
        '<div class="kz-slab"></div><div class="kz-cells"></div><div class="kz-stand"></div>' +
      '</div></div></div></div>' +
      '<div class="kz-actions"><div class="kz-tray"><div class="kz-shadow"></div><div class="kz-die"></div></div><div class="kz-ctl"><div class="kz-msg"></div><div class="kz-btns"></div></div></div>' +
    '</div><div class="kz-over" hidden></div><div class="kz-fx"></div>';
  if (ld) ldBuildBoard(root, ui); else kzBuildBoard(root);
  const die = root.querySelector('.kz-die');
  let f = '';
  for (let n = 1; n <= 6; n++) f += '<div class="f f' + n + '">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(q => '<i class="' + (KZ_PIPS[n].includes(q) ? 'on' : '') + '"></i>').join('') + '</div>';
  die.innerHTML = f;
  if (typeof ResizeObserver === 'function'){
    const ro = new ResizeObserver(() => requestAnimationFrame(() => { if (root.isConnected) kzFit(ui); }));
    ro.observe(root);
  }
  ui.timerIv = setInterval(() => { if (!root.isConnected){ clearInterval(ui.timerIv); return; } kzTick(ui); }, 500);
  return root;
}

function kzBuildBoard(root){
  const box = root.querySelector('.kz-cells');
  const put = (c, r, cls, col) => {
    const e = kzEl('i', 'kc ' + cls); e.style.cssText = 'left:' + c * KZC + 'px;top:' + r * KZC + 'px;' + (col ? '--cc:' + col : '');
    box.append(e); return e;
  };
  // taş evleri (köşelerde renkli daire + 4 oyuk)
  [[0, 0], [8, 0], [8, 8], [0, 8]].forEach((o, k) => {
    const h = kzEl('i', 'kz-house'); h.style.cssText = 'left:' + (o[0] + 0.1) * KZC + 'px;top:' + (o[1] + 0.1) * KZC + 'px;width:' + 2.8 * KZC + 'px;height:' + 2.8 * KZC + 'px;--cc:' + KZ_COL[k][0] + ';--cd:' + KZ_COL[k][2];
    box.append(h);
    KZ_BASE[k].forEach(b => { const n = kzEl('i', 'kz-nest'); n.style.cssText = 'left:' + (b[0] + 0.14) * KZC + 'px;top:' + (b[1] + 0.14) * KZC + 'px;width:' + 0.72 * KZC + 'px;height:' + 0.72 * KZC + 'px;--cd:' + KZ_COL[k][2]; box.append(n); });
  });
  KZ_RING.forEach((c, i) => { const k = i % 10 === 0 ? i / 10 : -1; put(c[0], c[1], 'ring' + (k >= 0 ? ' start' : ''), k >= 0 ? KZ_COL[k][0] : ''); });
  KZ_LANE.forEach((l, k) => l.forEach(c => put(c[0], c[1], 'lane', KZ_COL[k][0])));
  // ok işaretleri: başlangıç karelerinin yönü
  // orta göbek: yalnızca ortadaki tek kare (çevresindeki oynanan karelerin üstünü kapatmaz)
  const hub = kzEl('div', 'kz-hub'); hub.style.cssText = 'left:' + 5 * KZC + 'px;top:' + 5 * KZC + 'px;width:' + KZC + 'px;height:' + KZC + 'px';
  hub.innerHTML = '<svg viewBox="0 0 3 3"><polygon points="0,0 3,0 1.5,1.5" fill="' + KZ_COL[1][0] + '"/><polygon points="3,0 3,3 1.5,1.5" fill="' + KZ_COL[2][0] + '"/><polygon points="0,3 3,3 1.5,1.5" fill="' + KZ_COL[3][0] + '"/><polygon points="0,0 0,3 1.5,1.5" fill="' + KZ_COL[0][0] + '"/>' +
    '<polygon points="0,0 3,0 3,3 0,3" fill="none" stroke="rgb(0 0 0 / .25)" stroke-width=".06"/></svg><b class="kz-hubd"></b>';
  box.prepend(hub);
}

// Ahşap Ludo tahtası: köşelerde renkli yuva daireleri, haç biçiminde yol, renkli ev yolları, yıldızlı güvenli kareler, ortada BİTİŞ
function ldBuildBoard(root, ui){
  const box = root.querySelector('.kz-cells'), C = LD_C;
  const at = (e, c, r, w, h) => { e.style.cssText += ';left:' + c * C + 'px;top:' + r * C + 'px;width:' + (w || 1) * C + 'px;height:' + (h || 1) * C + 'px'; return e; };
  const col = k => kzC(ui, k);
  // yuvalar
  LD_YARD.forEach((y, k) => {
    const c = col(k);
    const yard = at(kzEl('i', 'ld-yard'), y[0] + 0.75, y[1] + 0.75, 4.5, 4.5); yard.style.setProperty('--cc', c[0]); yard.style.setProperty('--cd', c[2]); box.append(yard);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(d => { const h = at(kzEl('i', 'ld-hole'), y[0] + 3 + d[0] * 0.8 - 0.36, y[1] + 3 + d[1] * 0.8 - 0.36, 0.72, 0.72); box.append(h); });
    // köşedeki yıldız rozet (fotoğraftaki gibi)
    const cx = k === 1 || k === 0 ? y[0] + 0.12 : y[0] + 5.08, cy = k === 1 || k === 2 ? y[1] + 0.12 : y[1] + 5.08;
    const st = at(kzEl('i', 'ld-badge', '★'), cx, cy, 0.8, 0.8); st.style.setProperty('--cc', c[0]); box.append(st);
  });
  const yazi = at(kzEl('b', 'ld-logo', 'LUDO'), 3.95, 0.1, 2, 0.62); box.append(yazi);
  // ortak yol
  const starts = [0, 1, 2, 3].map(k => KizmaCore.startOf(ui.v, k));
  LD_RING.forEach((c, i) => {
    const k = starts.indexOf(i);
    const e = at(kzEl('i', 'ld-sq' + (k >= 0 ? ' start' : '')), c[0], c[1]);
    if (k >= 0){ e.style.setProperty('--cc', col(k)[0]); e.textContent = '★'; }
    else if (KizmaCore.isSafe(ui.v, i)){ e.classList.add('star'); e.textContent = '★'; }
    box.append(e);
  });
  // ev yolları
  LD_LANE.forEach((l, k) => l.forEach(c => { const e = at(kzEl('i', 'ld-sq lane'), c[0], c[1]); e.style.setProperty('--cc', col(k)[0]); box.append(e); }));
  // giriş okları: her rengin ev yoluna döndüğü yer
  const oklar = [[7, 14, '▲'], [0, 7, '▶'], [7, 0, '▼'], [14, 7, '◀']];
  oklar.forEach((o, k) => { const e = at(kzEl('i', 'ld-sq ok', o[2]), o[0], o[1]); e.style.setProperty('--cc', col(k)[0]); box.append(e); });
  // orta: dört renkli üçgen, BİTİŞ
  const mid = at(kzEl('div', 'ld-mid'), 6, 6, 3, 3);
  const f = k => col(k)[0];
  mid.innerHTML = '<svg viewBox="0 0 300 300">' +
    '<polygon points="0,0 0,300 150,150" fill="' + f(1) + '"/><polygon points="0,0 300,0 150,150" fill="' + f(2) + '"/>' +
    '<polygon points="300,0 300,300 150,150" fill="' + f(3) + '"/><polygon points="0,300 300,300 150,150" fill="' + f(0) + '"/>' +
    '<g fill="none" stroke="#2b1a0c" stroke-width="3"><rect x="1.5" y="1.5" width="297" height="297"/><path d="M0 0L300 300M300 0L0 300"/></g>' +
    '<g font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="26" fill="rgb(0 0 0 / .55)" text-anchor="middle">' +
    '<text x="150" y="272">BİTİŞ</text><text x="150" y="48" transform="rotate(180 150 40)">BİTİŞ</text>' +
    '<text x="150" y="272" transform="rotate(90 150 150)">BİTİŞ</text><text x="150" y="272" transform="rotate(-90 150 150)">BİTİŞ</text></g></svg>';
  box.append(mid);
  const hub = at(kzEl('div', 'kz-hub ld-hub'), 7, 7, 1, 1); hub.innerHTML = '<b class="kz-hubd"></b>'; box.append(hub);
}

// aynı karede birden çok taş varsa (Ludo'da kendi taşların üst üste, güvenli karede farklı renkler) hafifçe ayır
function kzYerler(ui){
  const v = ui.v, vis = ui.vis, out = {}, gr = {};
  for (let k = 0; k < 4; k++){
    if (!v.P[k].on) continue;
    for (let i = 0; i < 4; i++){
      const p = vis.pw[k][i], t = kzXY(ui, k, p, i);
      out[k + '-' + i] = { x: t.x, y: t.y };
      if (kzLudo(ui) && p >= 0 && p < 56){ const key = Math.round(t.x) + ',' + Math.round(t.y); (gr[key] = gr[key] || []).push(k + '-' + i); }
    }
  }
  Object.values(gr).forEach(l => {
    if (l.length < 2) return;
    const r = l.length === 2 ? 8 : 10;
    l.forEach((id, n) => { const a = (n / l.length) * Math.PI * 2 + Math.PI / 4; out[id].x += Math.cos(a) * r; out[id].y += Math.sin(a) * r * 0.8; });
  });
  return out;
}

// ================== sığdırma ==================
function kzFit(ui){
  const root = ui.root; if (!root || !root.isConnected) return;
  const fit = root.querySelector('.kz-fit'), sc = root.querySelector('.kz-scaler');
  root.classList.toggle('lite', ui.lite);
  const narrow = window.matchMedia('(max-width:900px)').matches;
  root.classList.toggle('cmp', !narrow && root.clientWidth < 1060);
  const tilt = ui.lite ? 0 : (narrow ? 34 : 40);
  ui.tilt = tilt;
  root.style.setProperty('--tilt', tilt + 'deg');
  const center = root.querySelector('.kz-center');
  const w = center.clientWidth || 600;
  const deck = root.closest('.deck') || root.parentElement;
  const shell = root.closest('.game-shell');
  // üst çubuk (Masadan kalk vb. düğmeler sonradan eklenince) boyu değişirse yeniden sığdır
  const gbar = shell && shell.querySelector('.gs-bar');
  if (gbar && ui.barEl !== gbar && typeof ResizeObserver === 'function'){ ui.barEl = gbar; new ResizeObserver(() => requestAnimationFrame(() => { if (root.isConnected) kzFit(ui); })).observe(gbar); }
  const dh = deck ? deck.clientHeight : 800;
  const barH = shell && shell.querySelector('.gs-bar') ? shell.querySelector('.gs-bar').offsetHeight + 10 : 0;
  const emh = Math.max(420, dh - barH - 4);
  root.style.setProperty('--kzh', narrow ? 'auto' : emh + 'px');
  const banner = root.querySelector('.kz-banner').offsetHeight;
  const actNow = root.querySelector('.kz-actions').offsetHeight;
  if (!ui.actMax || ui.actW !== w) ui.actMax = 0;
  ui.actW = w; ui.actMax = Math.min(220, Math.max(ui.actMax, actNow, 110));
  const KB = ui.B || KZB;
  const rad = tilt * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad), PP = 2400, H = KB / 2;
  const far = H * cs * (PP / (PP + H * sn)), near = H * cs * (PP / (PP - H * sn));
  const topV = ui.lite ? -46 : H - far - 70, botV = ui.lite ? KB : H + near + 34;
  const extX = ui.lite ? KB + 24 : KB * (PP / (PP - H * sn)) + 24;
  let availH = narrow ? 99999 : emh - banner - ui.actMax - 30;
  availH = Math.max(200, availH);
  const s = Math.max(0.28, Math.min(w / extX, availH / (botV - topV), 1.4));
  fit.style.height = Math.round((botV - topV) * s) + 'px';
  sc.style.cssText = 'width:' + KB + 'px;height:' + KB + 'px;transform:translate(' + Math.round((w - KB * s) / 2) + 'px,' + Math.round(-topV * s) + 'px) scale(' + s + ');';
  ui.scale = s;
}

// ================== çizim ==================
function kzPaint(ui){
  const root = ui.root, v = ui.v, vis = ui.vis;
  if (!root || !v || !vis) return;
  root.classList.toggle('busy', ui.busy);
  kzPaintPawns(ui);
  kzPaintDie(ui);
  kzPaintPlayers(ui);
  kzPaintBanner(ui);
  kzPaintActions(ui);
  kzPaintLog(ui);
  kzPaintOver(ui);
}
const kzName = (ui, k) => (ui.v.names && ui.v.names[k]) || ('Oyuncu ' + (k + 1));
function kzTxt(ui, tx){
  return kzEsc(tx).replace(/@(\d)/g, (m, d) => '<b style="color:' + kzC(ui, +d)[0] + '">' + kzEsc(kzName(ui, +d)) + '</b>');
}
const kzTf = (x, y) => 'translate3d(' + x + 'px,' + y + 'px,0)';
function kzPawnEl(ui, k, i, create){
  const stand = ui.root.querySelector('.kz-stand');
  let el = stand.querySelector('.kz-pawn[data-k="' + k + '-' + i + '"]');
  if (!el && create){
    el = kzEl('div', 'kz-pawn'); el.dataset.k = k + '-' + i; el.dataset.s = k; el.dataset.i = i;
    el.innerHTML = '<div class="kz-lift"><div class="kz-in">' + kzPawnSvg(kzRk(ui, k)) + '</div></div><i class="kz-ring"></i>';
    el.onclick = () => kzPawnClick(ui, k, i);
    el.onmouseenter = () => { if (el.classList.contains('can')) kzShowDest(ui, k, i); };
    el.onmouseleave = () => { if (ui.pick !== i) kzShowDest(ui, -1); };
    stand.append(el); el._fresh = true;
  }
  return el;
}
function kzPawnClick(ui, k, i){
  const v = ui.v;
  if (ui.busy || ui.seat !== k || v.turn !== k || v.phase !== 'move' || !v.legal.includes(i)) return;
  // dokunmatik ekranda ilk dokunuş nereye gideceğini gösterir, ikinci dokunuş oynatır
  const touch = window.matchMedia('(hover:none)').matches;
  if (touch && ui.pick !== i){ ui.pick = i; kzShowDest(ui, k, i); return; }
  ui.pick = null; kzShowDest(ui, -1);
  tableAct({ type: 'move', pw: i });
}
// seçilen taşın zarla gideceği kareyi işaretle
function kzShowDest(ui, k, i){
  const stand = ui.root.querySelector('.kz-stand');
  let m = stand.querySelector('.kz-dest');
  if (k < 0 || ui.v.phase !== 'move' || ui.v.turn !== k){ if (m) m.remove(); stand.querySelectorAll('.kz-pawn.pick').forEach(e => e.classList.remove('pick')); return; }
  const p = ui.v.P[k].pw[i], d = ui.v.d, to = p === -1 ? 0 : p + d;
  const t = kzXY(ui, k, to, i);
  if (!m){ m = kzEl('div', 'kz-dest'); stand.append(m); }
  m.style.transform = 'translate3d(' + t.x + 'px,' + t.y + 'px,3px)';
  m.style.setProperty('--dc', kzC(ui, k)[0]);
  const bitis = kzLudo(ui) ? to === 56 : to >= 40;
  m.innerHTML = '<i></i><b>' + (bitis ? (kzLudo(ui) ? '🏁' : '🏠') : p === -1 ? '▶' : '+' + d) + '</b>';
  stand.querySelectorAll('.kz-pawn.pick').forEach(e => e.classList.remove('pick'));
  const el = kzPawnEl(ui, k, i); if (el) el.classList.add('pick');
}
function kzPaintPawns(ui){
  const v = ui.v, vis = ui.vis;
  const myMove = !ui.busy && ui.seat >= 0 && v.turn === ui.seat && v.phase === 'move';
  if (!myMove && (ui.pick != null || ui.root.querySelector('.kz-dest'))){ ui.pick = null; kzShowDest(ui, -1); }
  const yer = kzYerler(ui);
  for (let k = 0; k < 4; k++){
    if (!v.P[k].on){ ui.root.querySelectorAll('.kz-pawn[data-s="' + k + '"]').forEach(e => e.remove()); continue; }
    for (let i = 0; i < 4; i++){
      const el = kzPawnEl(ui, k, i, true);
      const can = myMove && k === ui.seat && v.legal.includes(i);
      el.classList.toggle('can', can);
      el.classList.toggle('mine', k === ui.seat);
      if (el._hop) continue;
      const t = yer[k + '-' + i];
      if (el._fresh || el._tilt !== ui.tilt || el._x === undefined){ el.style.transform = kzTf(t.x, t.y); el._x = t.x; el._y = t.y; el._fresh = false; el._tilt = ui.tilt; }
      else if (Math.abs(el._x - t.x) > 0.5 || Math.abs(el._y - t.y) > 0.5){
        const a = kzTf(el._x, el._y), b = kzTf(t.x, t.y);
        el.style.transform = b; el._x = t.x; el._y = t.y;
        if (!reducedMotion()) el.animate([{ transform: a }, { transform: b }], { duration: 200, easing: 'ease-out' });
      }
      el.style.zIndex = Math.round(el._y) + (can ? 500 : 0);
    }
  }
}
// bir adım zıplama (zemin düzleminde x,y; havada z)
function kzHop(el, x1, y1, ms, lift){
  return new Promise(res => {
    const x0 = el._x, y0 = el._y;
    el.style.transform = kzTf(x1, y1); el._x = x1; el._y = y1;
    if (reducedMotion()){ res(); return; }
    const a = el.animate([{ transform: kzTf(x0, y0) }, { transform: kzTf(x1, y1) }], { duration: ms, easing: 'ease-in-out' });
    const l = el.querySelector('.kz-lift');
    if (l) l.animate([{ transform: 'translateZ(0)' }, { transform: 'translateZ(' + lift + 'px)', offset: 0.5 }, { transform: 'translateZ(0)' }], { duration: ms, easing: 'ease-out' });
    a.onfinish = () => res(); a.oncancel = () => res();
  });
}
async function kzMovePawn(ui, k, i, from, to){
  const el = kzPawnEl(ui, k, i, true);
  el._hop = true; el.style.zIndex = 900;
  if (from === -1){
    const t = kzXY(ui, k, 0, i);
    await kzHop(el, t.x, t.y, 560, 46);
    gameSound('tile');
  } else {
    for (let p = from + 1; p <= to; p++){
      const t = kzXY(ui, k, p, i);
      ui.vis.pw[k][i] = p;
      await kzHop(el, t.x, t.y, 230, 24);
      gameSound('tile');
    }
  }
  ui.vis.pw[k][i] = to;
  el._hop = false;
}

// zar tepsisi
function kzDieTf(n, rz, x, y, z){ const f = KZ_FACE[n]; return 'translate3d(' + x + 'px,' + y + 'px,' + (z || 0) + 'px) rotateZ(' + rz + 'deg) rotateX(' + f[0] + 'deg) rotateY(' + f[1] + 'deg)'; }
function kzPaintDie(ui){
  const die = ui.root.querySelector('.kz-die');
  const n = ui.vis.d || 0;
  if (die._rolling) return;
  const hub = ui.root.querySelector('.kz-hubd'); if (hub) hub.textContent = n ? String(n) : '';
  if (!n){ die.style.opacity = '0.35'; die.style.transform = kzDieTf(1, -12, 0, 0, 0); die._n = 0; return; }
  die.style.opacity = '1';
  if (die._n !== n || die._rz === undefined){
    if (die._rz === undefined) die._rz = -12;
    if (!die._pos) die._pos = [0, 0];
    die.style.transform = kzDieTf(n, die._rz, die._pos[0], die._pos[1], 0); die._n = n;
  }
}
function kzRollDie(ui, n){
  gameSound('dice');
  const die = ui.root.querySelector('.kz-die'), tray = ui.root.querySelector('.kz-tray'), sh = ui.root.querySelector('.kz-shadow');
  die._rolling = true; die.style.opacity = '1';
  const W = tray.clientWidth || 200, H = tray.clientHeight || 110;
  const fx = (Math.random() * 2 - 1) * Math.max(10, W / 2 - 46), fy = (Math.random() * 2 - 1) * Math.max(6, H / 2 - 40);
  const rz = Math.round(Math.random() * 360 - 180) % 360;
  const side = Math.random() < .5 ? -1 : 1, sy = Math.random() * H - H / 2;
  const ex = side * (W / 2 + 30), ey = sy;
  const f = KZ_FACE[n], sx = Math.random() < .5 ? 1 : -1, sy2 = Math.random() < .5 ? 1 : -1;
  const at = (t, z, nx, ny, nz) => 'translate3d(' + (ex + (fx - ex) * t) + 'px,' + (ey + (fy - ey) * t) + 'px,' + z + 'px) rotateZ(' + (rz + 360 * nz * sx) + 'deg) rotateX(' + (f[0] + 360 * nx * sy2) + 'deg) rotateY(' + (f[1] + 360 * ny * sx) + 'deg)';
  const kf = [
    { transform: at(0, 120, 3.6, 3.2, 1.2), offset: 0 },
    { transform: at(0.42, 0, 2.1, 1.9, 0.7), offset: 0.36 },
    { transform: at(0.62, 70, 1.3, 1.2, 0.4), offset: 0.54 },
    { transform: at(0.8, 0, 0.55, 0.5, 0.15), offset: 0.72 },
    { transform: at(0.93, 18, 0.18, 0.15, 0.05), offset: 0.85 },
    { transform: at(1, 0, 0, 0, 0), offset: 1 }
  ];
  die._rz = rz; die._n = n; die._pos = [fx, fy];
  if (sh) sh.animate([{ opacity: 0.2, transform: 'translate(' + ex + 'px,' + ey + 'px) scale(.5)' }, { opacity: 0.55, transform: 'translate(' + fx + 'px,' + fy + 'px) scale(1)', offset: 0.75 }, { opacity: 0.55, transform: 'translate(' + fx + 'px,' + fy + 'px) scale(1)' }], { duration: 1350, fill: 'forwards' }).onfinish = e => { if (sh) { sh.style.transform = 'translate(' + fx + 'px,' + fy + 'px)'; sh.style.opacity = .55; } };
  const an = die.animate(kf, { duration: 1350, easing: 'cubic-bezier(.3,.55,.4,1)', fill: 'forwards' });
  return new Promise(res => { an.onfinish = () => { die.style.transform = kzDieTf(n, rz, fx, fy, 0); an.cancel(); die._rolling = false; res(); }; });
}

// ================== olaylar ==================
async function kzRun(ui){
  if (ui.running) return;
  ui.running = true; ui.busy = true;
  const root = ui.root;
  try {
    while (ui.evq.length){
      if (!root.isConnected) break;
      await kzPlay(ui, ui.evq.shift());
    }
  } catch(err){ console.error(err); }
  ui.running = false; ui.busy = false;
  if (root.isConnected){ ui.vis = kzVisFrom(ui.v); ui.logLid = ui.v.lid; kzPaint(ui); }
}
function kzFloat(ui, k, text, cls){
  const fx = ui.root.querySelector('.kz-fx'); if (!fx || reducedMotion()) return;
  const e = kzEl('div', 'kz-float ' + (cls || ''), kzEsc(text));
  e.style.setProperty('--pc', kzC(ui, k)[0]);
  fx.append(e);
  e.animate([{ opacity: 0, transform: 'translate(-50%,10px) scale(.8)' }, { opacity: 1, transform: 'translate(-50%,-6px) scale(1)', offset: 0.2 }, { opacity: 1, transform: 'translate(-50%,-14px)', offset: 0.8 }, { opacity: 0, transform: 'translate(-50%,-30px)' }], { duration: 1400 }).onfinish = () => e.remove();
}
async function kzPlay(ui, e){
  const vis = ui.vis;
  switch (e.t){
    case 'start': ui.logLid = 0; await kzSleep(200); return;
    case 'dice':
      vis.act = e.s;
      await kzRollDie(ui, e.d);
      vis.d = e.d; kzPaintDie(ui);
      await kzSleep(260); return;
    case 'move':
      await kzMovePawn(ui, e.s, e.pw, e.f, e.to);
      kzPaintPlayers(ui);
      if (kzLudo(ui) ? e.to === 56 : (e.to >= 40 && e.f < 40)){ kzFloat(ui, e.s, kzLudo(ui) ? '🏁 Bitişe ulaştı' : '🏠 Eve girdi', 'good'); await kzSleep(260); }
      await kzSleep(90); return;
    case 'cap': {
      const el = kzPawnEl(ui, e.s, e.pw, true);
      kzFloat(ui, e.by, '💥 Kızma birader!', 'bad');
      gameSound('err');
      el._hop = true;
      const t = kzXY(ui, e.s, -1, e.pw);
      if (!reducedMotion()){
        await kzHop(el, t.x, t.y, 650, 120);
      } else { el.style.transform = kzTf(t.x, t.y); el._x = t.x; el._y = t.y; }
      vis.pw[e.s][e.pw] = -1; el._hop = false;
      kzPaintPlayers(ui);
      await kzSleep(200); return;
    }
    case 'again': kzFloat(ui, e.s, e.s === ui.seat ? 'Tekrar at!' : 'Tekrar atacak', 'good'); vis.act = e.s; await kzSleep(500); return;
    case 'pass': kzFloat(ui, e.s, 'Oynayamadı', 'bad'); await kzSleep(650); return;
    case 'uc6': kzFloat(ui, e.s, '🔥 Üç kez 6: hamle yandı', 'bad'); gameSound('err'); await kzSleep(900); return;
    case 'order': return;
    case 'win': {
      gameSound('win'); const c = ui.root.querySelector('.kz-center'); if (typeof confetti === 'function') confetti(c);
      ui.vis.over = true; await kzSleep(900); return;
    }
  }
}

// ================== paneller ==================
function kzPaintPlayers(ui){
  const v = ui.v, vis = ui.vis, box = ui.root.querySelector('.kz-players');
  const act = ui.busy ? vis.act : v.turn;
  const html = [0, 1, 2, 3].filter(k => v.P[k].on).map(k => {
    const pw = vis.pw[k];
    const ld = kzLudo(ui), bitti = p => ld ? p === 56 : p >= 40;
    const home = pw.filter(bitti).length, base = pw.filter(p => p === -1).length;
    const dots = pw.map(p => '<i class="' + (bitti(p) ? 'h' : p === -1 ? 'b' : 'r') + '" style="--cc:' + kzC(ui, k)[0] + '"></i>').join('');
    const st = vis.over && v.win === k ? '🏆 Kazandı' : (act === k && !vis.over) ? '🎯 Sırada' : KZ_NAME[kzRk(ui, k)];
    return '<div class="kz-pl' + (act === k && !vis.over ? ' turn' : '') + (k === ui.seat ? ' me' : '') + '" style="--pc:' + kzC(ui, k)[0] + '">' +
      '<div class="kz-pl-av">' + kzPawnSvg(kzRk(ui, k)) + '</div>' +
      '<div class="kz-pl-nm"><b>' + kzEsc(kzName(ui, k)) + (k === ui.seat ? ' (sen)' : '') + (ui.s.seats[k] && ui.s.seats[k].bot ? ' 🤖' : '') + '</b><small>' + st + '</small></div>' +
      '<div class="kz-pl-st"><span class="dots">' + dots + '</span><small>' + home + (ld ? '/4 bitişte · ' : '/4 evde · ') + base + (ld ? ' yuvada' : ' kapıda') + '</small></div></div>';
  }).join('');
  if (box._html !== html){ box._html = html; box.innerHTML = html; }
}
function kzTick(ui){
  const el = ui.root.querySelector('.kz-timer'); if (!el) return;
  if (!ui.deadline || ui.busy || ui.v.phase === 'over'){ el.textContent = ''; return; }
  const left = Math.max(0, Math.round((ui.deadline - Date.now()) / 1000));
  el.textContent = '⏱ ' + String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
  el.classList.toggle('warn', left <= 15);
}
function kzPaintBanner(ui){
  const v = ui.v, b = ui.root.querySelector('.kz-banner');
  const act = ui.busy ? ui.vis.act : v.turn;
  let t;
  if (v.phase === 'over') t = '🏆 Oyun bitti';
  else {
    const mine = act === ui.seat;
    const who = mine ? 'Sıra sende' : 'Sıra <b style="color:' + kzC(ui, act)[0] + '">' + kzEsc(kzName(ui, act)) + '</b>\'de';
    const ph = v.phase === 'move' ? (mine ? 'taşını seç' : 'taş oynatıyor') : (mine ? 'zar at' : 'zar atacak');
    t = (mine ? '<b style="color:' + kzC(ui, act)[0] + '">Sıra sende</b>' : who) + ' · <span class="note">' + ph + '</span>';
  }
  const sig = t + '|' + ui.lite;
  if (b._sig !== sig){
    b._sig = sig;
    b.innerHTML = '<span class="kz-turn">' + t + '</span><span class="kz-timer"></span><span class="kz-bsp"></span>' +
      '<button type="button" class="kz-lite-btn" title="Hafif görünüm">' + (ui.lite ? '🧊 3D aç' : '⚡ Hafif mod') + '</button>';
    b.querySelector('.kz-lite-btn').onclick = () => {
      ui.lite = !ui.lite; try { store.set('oyunodasi-kizma-lite', ui.lite ? '1' : '0'); } catch(e){}
      b._sig = ''; kzFit(ui); kzPaint(ui);
    };
  }
  kzTick(ui);
}
function kzPaintActions(ui){
  const v = ui.v, seat = ui.seat, box = ui.root.querySelector('.kz-ctl');
  const act = v.turn, mine = seat >= 0 && act === seat;
  const canRoll = !ui.busy && mine && v.phase === 'roll' && !ui.vis.over;
  const sig = [v.eid, v.phase, ui.busy, seat, act, v.tries, v.d, ui.s.owner === peer.id].join('|');
  if (box._sig === sig) return;
  box._sig = sig;
  const msg = box.querySelector('.kz-msg'), btns = box.querySelector('.kz-btns');
  btns.innerHTML = '';
  if (v.phase === 'over'){
    msg.innerHTML = '🏆 ' + kzTxt(ui, '@' + v.win) + ' kazandı!';
    return;
  }
  if (ui.busy){ msg.innerHTML = '<span class="note">…</span>'; return; }
  if (seat < 0){ msg.innerHTML = '<span class="note">Oyunu izliyorsun.</span>'; return; }
  if (!mine){ msg.innerHTML = kzTxt(ui, '@' + act) + (v.phase === 'move' ? ' taş oynatıyor…' : ' zar atacak…'); return; }
  if (v.phase === 'roll'){
    const extra = v.six ? '<b>6 attın, bir daha at!</b> ' : '';
    const tr = v.tries > 1 ? '<br><span class="note">Taş çıkana kadar ' + v.tries + ' deneme hakkın var.</span>' : '';
    msg.innerHTML = extra + 'Zarı at' + tr;
    const b = kzEl('button', 'kz-roll', '🎲 ZAR AT'); b.type = 'button';
    b.onclick = () => { if (ui.busy) return; tableAct({ type: 'roll' }); };
    btns.append(b);
  } else {
    msg.innerHTML = '<b>' + v.d + '</b> attın. Hangi taşı oynatacağını sen seç: parlayan bir taşın üstüne gel (telefonda bir kez dokun), gideceği kare görünür; oynatmak için tıkla' + (window.matchMedia('(hover:none)').matches ? ' (ikinci dokunuş)' : '') + '.';
  }
  void canRoll;
}
function kzPaintLog(ui){
  const v = ui.v, box = ui.root.querySelector('.kz-log');
  const lines = v.log.filter(l => l.id <= ui.logLid).slice(-30).reverse();
  const key = lines.length + ':' + (lines[0] ? lines[0].id : 0);
  if (box._k === key) return;
  box._k = key;
  box.innerHTML = '<div class="kz-log-h">Oyun günlüğü</div>' + lines.map(l => '<div class="kz-ll">' + kzTxt(ui, l.tx) + '</div>').join('');
}
function kzPaintOver(ui){
  const v = ui.v, box = ui.root.querySelector('.kz-over');
  if (v.phase !== 'over' || ui.busy){ box.hidden = true; box._k = ''; return; }
  const key = 'o' + v.win + ':' + v.eid + ':' + (ui.s.owner === peer.id);
  if (box._k === key) return;
  box._k = key; box.hidden = false;
  const me = ui.seat === v.win;
  box.innerHTML = '<div class="kz-over-card" style="--pc:' + kzC(ui, v.win)[0] + '"><div class="kz-over-av">' + kzPawnSvg(kzRk(ui, v.win)) + '</div><h3>' + (me ? '🏆 Kazandın!' : '🏆 ' + kzEsc(kzName(ui, v.win)) + ' kazandı') + '</h3><p>' + (kzLudo(ui) ? 'Dört taş da bitişe ulaştı.' : 'Tüm taşlar eve girdi.') + '</p><div class="kz-over-b"></div></div>';
  const b = box.querySelector('.kz-over-b');
  const close = kzEl('button', 'btn', 'Kapat'); close.type = 'button'; close.onclick = () => { box.hidden = true; };
  b.append(close);
  if (ui.s.owner === peer.id){ const n = kzEl('button', 'btn primary', '↻ Yeni oyun'); n.type = 'button'; n.onclick = () => tableAct({ type: 'newMatch' }); b.append(n); }
  else b.append(kzEl('span', 'note', 'Yeni oyunu masa sahibi başlatır.'));
}
