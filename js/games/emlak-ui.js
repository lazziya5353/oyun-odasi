// Emlak Oyunu çizimi: 3 boyutlu tahta, piyonlar, zar/kart/para animasyonları, paneller, takas ve yönetim pencereleri.
// Kurallar emlak-core.js'te; burası yalnızca gelen görünümü (view) çizer ve hamleleri tableAct ile gönderir.
const EMB = 900, EMC = 126, EMW = (EMB - 2 * EMC) / 9;
const EM_TIP = ['', '', '', '', '', ''];
const emUIs = new Map();

function emRect(i){
  if (i === 0) return { x: EMB - EMC, y: EMB - EMC, w: EMC, h: EMC, side: 'c' };
  if (i < 10) return { x: EMB - EMC - i * EMW, y: EMB - EMC, w: EMW, h: EMC, side: 'b' };
  if (i === 10) return { x: 0, y: EMB - EMC, w: EMC, h: EMC, side: 'c' };
  if (i < 20) return { x: 0, y: EMB - EMC - (i - 10) * EMW, w: EMC, h: EMW, side: 'l' };
  if (i === 20) return { x: 0, y: 0, w: EMC, h: EMC, side: 'c' };
  if (i < 30) return { x: EMC + (i - 21) * EMW, y: 0, w: EMW, h: EMC, side: 't' };
  if (i === 30) return { x: EMB - EMC, y: 0, w: EMC, h: EMC, side: 'c' };
  return { x: EMB - EMC, y: EMC + (i - 31) * EMW, w: EMC, h: EMW, side: 'r' };
}
const emCenter = i => { const r = emRect(i); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };
const emMoney = n => '₺' + Math.round(n).toLocaleString('tr-TR');
const emEl = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const emEsc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const emSleep = ms => new Promise(r => setTimeout(r, ms));

function emState(id){
  let u = emUIs.get(id);
  if (!u){
    u = { id, vis: null, eid: -1, gameNo: 0, evq: [], running: false, busy: false, sel: null, modal: null, dice: [1, 1], logLid: 0,
      draft: null, lite: false, hop: {}, deadline: 0, seen: {} };
    let lite = null; try { lite = store.get('oyunodasi-emlak-lite'); } catch(e){}
    u.lite = lite === '1' || (lite === null && (window.matchMedia('(max-width:700px)').matches && (navigator.hardwareConcurrency || 8) <= 4));
    emUIs.set(id, u);
  }
  return u;
}
const emVisFrom = v => ({
  pos: v.P.map(p => p.pos), money: v.P.map(p => p.m), jail: v.P.map(p => p.j),
  own: v.pr.map(p => p.o), h: v.pr.map(p => p.h), mo: v.pr.map(p => p.mo), bk: v.P.map(p => p.bk),
  act: EmlakCore.actor(v), over: v.phase === 'over'
});

// ================== kurulum ==================
function renderEmlak(body, s, lv){
  const v = lv.v, seat = lv.seat;
  const ui = emState(s.id);
  EmPawns.ensureDefs();
  ui.s = s; ui.v = v; ui.seat = seat;
  let root = body.querySelector('.em');
  if (!root || root.dataset.tid !== s.id){
    body.innerHTML = '';
    root = emBuild(ui);
    body.append(root);
    ui.root = root;
    ui.vis = null; ui.eid = -1;
  }
  ui.root = root;
  ui.deadline = v.left ? Date.now() + v.left : 0;
  // yeni oyun (devam oyunu): her şey baştan
  if (ui.gameNo !== (v.gameNo || 1)){ ui.vis = null; ui.eid = -1; ui.evq = []; ui.gameNo = v.gameNo || 1; ui.seen = {}; }
  if (!ui.vis){
    ui.vis = emVisFrom(v); ui.logLid = v.lid; ui.dice = v.d[0] ? v.d.slice() : [1, 1];
    const first = v.eid === 1 && v.ev && v.ev.some(e => e.t === 'start');
    ui.eid = first ? 0 : v.eid;
    if (first && !reducedMotion()){ ui.logLid = 0; ui.vis = emVisFrom(v); emStartVis(ui, v); }
  }
  if (v.eid > ui.eid){
    const gap = v.eid - ui.eid;
    if (gap > 3 || reducedMotion() || !v.ev.length){ ui.eid = v.eid; if (!ui.running){ ui.vis = emVisFrom(v); ui.logLid = v.lid; } }
    else { ui.eid = v.eid; ui.evq.push(...v.ev.map(e => Object.assign({}, e))); ui.evLid = v.lid; if (!ui.running) emRun(ui); }
  } else if (!ui.running && !ui.evq.length){ ui.vis = emVisFrom(v); ui.logLid = v.lid; }
  emFit(ui);
  emPaint(ui);
}
// oyunun ilk görünümü: tapular/paralar dağıtılmadan önceki hâl (kısa oyunda tapular dağıtılır)
function emStartVis(ui, v){
  const e = v.ev.find(x => x.t === 'start');
  const vis = ui.vis;
  vis.money = v.P.map(p => p.on ? 0 : p.m);
  (e.deals || []).forEach(d => { vis.own[d[1]] = -1; });
  ui.evq.push(Object.assign({}, e)); ui.eid = v.eid; ui.evLid = v.lid;
  setTimeout(() => emRun(ui), 250);
}

function emBuild(ui){
  const root = emEl('div', 'em');
  root.dataset.tid = ui.s.id;
  root.innerHTML =
    '<div class="em-left"><div class="em-players"></div></div>' +
    '<div class="em-center">' +
      '<div class="em-banner"></div>' +
      '<div class="em-fit"><div class="em-scaler"><div class="em-stage"><div class="em-board">' +
        '<div class="em-slab"></div><div class="em-tiles"></div><div class="em-mid"></div><div class="em-stand"></div>' +
      '</div></div></div></div>' +
      '<div class="em-actions"></div>' +
    '</div>' +
    '<div class="em-right"><div class="em-tapu"></div><div class="em-log"></div></div>' +
    '<div class="em-modal" hidden></div><div class="em-fx"></div>';
  emBuildTiles(ui, root);
  emBuildMid(ui, root);
  if (typeof ResizeObserver === 'function'){
    const ro = new ResizeObserver(() => requestAnimationFrame(() => { if (root.isConnected) emFit(ui); }));
    ro.observe(root);
  }
  // tahtadaki bir kareye tıklayınca tapu kartı
  root.querySelector('.em-tiles').addEventListener('click', e => {
    const t = e.target.closest('.ti'); if (!t) return;
    ui.sel = +t.dataset.i;
    if (window.matchMedia('(max-width:1060px)').matches) ui.modal = { type: 'tile', i: ui.sel };
    emPaint(ui);
  });
  ui.timerIv = setInterval(() => { if (!root.isConnected){ clearInterval(ui.timerIv); return; } emTick(ui); }, 500);
  return root;
}
const EM_LM_SVG = {
  'Üsküdar': '<svg viewBox="0 0 40 40"><path d="M0 33q5-3 10 0t10 0 10 0 10 0v7H0z" fill="#3a8fd0"/><path d="M6 31q3-3 8 0l1 3H5z" fill="#8a6a4a"/><rect x="11" y="14" width="8" height="17" fill="#e9dcc0" stroke="#6b5a3e" stroke-width="1"/><path d="M9 14h12l-6-8z" fill="#c0392b"/><rect x="13.5" y="9" width="3" height="5" fill="#e9dcc0" stroke="#6b5a3e" stroke-width=".8"/><path d="M15 3v3M13.5 4.5h3" stroke="#6b5a3e" stroke-width="1.2"/><rect x="13.5" y="19" width="3" height="4" fill="#3a5a8a"/></svg>',
  'Kadıköy': '<svg viewBox="0 0 40 40"><path d="M0 30q5-3 10 0t10 0 10 0 10 0v10H0z" fill="#3a8fd0"/><rect x="2" y="22" width="36" height="4" fill="#9a7048"/><rect x="5" y="26" width="2.5" height="9" fill="#6b4a2a"/><rect x="16" y="26" width="2.5" height="9" fill="#6b4a2a"/><rect x="28" y="26" width="2.5" height="9" fill="#6b4a2a"/><path d="M9 22V12l11-5 11 5v10z" fill="#f1e6cc" stroke="#7a5a35" stroke-width="1.2"/><rect x="14" y="14" width="4" height="8" fill="#7a5a35"/><rect x="22" y="14" width="4" height="8" fill="#7a5a35"/></svg>',
  'Konak': '<svg viewBox="0 0 40 40"><rect x="14" y="10" width="12" height="26" fill="#e8d9b8" stroke="#6b5a3e" stroke-width="1.2"/><path d="M12 10h16l-8-8z" fill="#b8472f"/><circle cx="20" cy="19" r="4.6" fill="#fff" stroke="#3b2f1a" stroke-width="1.2"/><path d="M20 19v-3M20 19l2 1.4" stroke="#3b2f1a" stroke-width="1.2"/><path d="M17 28q3-4 6 0v8h-6z" fill="#8a6a3a"/><rect x="10" y="33" width="20" height="4" fill="#cdbb92"/></svg>'
};
const EM_LM = { 'Fatih': '🕌', 'Moda': '⛵', 'Caddebostan': '🏖️', 'Beşiktaş': '🦅', 'Ortaköy': '🌉', 'Bebek': '☕', 'Kızılay': '🏛️', 'Çankaya': '🏠', 'Tunalı': '🛍️', 'Alsancak': '🍻', 'Karşıyaka': '⛴️', 'Bornova': '🎓', 'Kordon': '🌅', 'Çeşme': '🏄', 'Bodrum': '🏰', 'Marmaris': '🚤', 'Fethiye': '🪂', 'Nişantaşı': '👜', 'Bağdat Caddesi': '🚗' };
const emLandmark = n => EM_LM_SVG[n] || '<b>' + (EM_LM[n] || '🏘️') + '</b>';
const EM_TILE_ICON = { chance: '❓', chest: '🎁', tax: '💸', rail: '🚂', jail: '⛓️', park: '🌳', gojail: '👮' };
function emBuildTiles(ui, root){
  const box = root.querySelector('.em-tiles');
  EmlakCore.TILES.forEach((T, i) => {
    const r = emRect(i);
    const t = emEl('div', 'ti k-' + T.k + ' s-' + r.side);
    t.dataset.i = i;
    t.style.cssText = 'left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px';
    const rot = { b: 0, l: 90, t: 180, r: -90, c: 0 }[r.side];
    const inW = r.side === 'c' ? EMC : EMW, inH = EMC;
    let inner = '';
    if (T.k === 'p') inner = '<i class="ti-band" style="background:' + EmlakCore.GRP[T.g].c + '"></i><span class="ti-lm">' + emLandmark(T.n) + '</span><span class="ti-name' + (T.n.length > 9 ? ' long' : '') + '">' + emEsc(T.n) + '</span><span class="ti-sub">' + emMoney(T.price) + '</span>';
    else if (T.k === 'rail') inner = '<span class="ti-ico">🚂</span><span class="ti-name">' + emEsc(T.n) + '</span><span class="ti-sub">' + emMoney(T.price) + '</span>';
    else if (T.k === 'util') inner = '<span class="ti-ico">' + (i === 12 ? '💡' : '🚰') + '</span><span class="ti-name">' + emEsc(T.n) + '</span><span class="ti-sub">' + emMoney(T.price) + '</span>';
    else if (T.k === 'tax') inner = '<span class="ti-ico">💸</span><span class="ti-name">' + emEsc(T.n) + '</span><span class="ti-sub">' + emMoney(T.amt) + ' öde</span>';
    else if (T.k === 'chance') inner = '<span class="ti-ico big q">?</span><span class="ti-name">Şans</span>';
    else if (T.k === 'chest') inner = '<span class="ti-ico big">🎁</span><span class="ti-name">Kamu Fonu</span>';
    else if (T.k === 'go') inner = '<span class="ti-corner">BAŞLA</span><span class="ti-arrow">➜</span><span class="ti-sub">Geçerken ₺200 al</span>';
    else if (T.k === 'jail') inner = '<span class="ti-cell"><b>⛓</b></span><span class="ti-corner sm">CEZAEVİ</span><span class="ti-sub vis">Sadece ziyaret</span>';
    else if (T.k === 'park') inner = '<span class="ti-ico big">🌳</span><span class="ti-corner sm">BEDAVA PARK</span><span class="ti-sub">Dinlen</span>';
    else if (T.k === 'gojail') inner = '<span class="ti-ico big">👮</span><span class="ti-corner sm">HAPSE GİT</span><span class="ti-sub">Başlamadan geç</span>';
    t.innerHTML = '<div class="ti-in" style="width:' + inW + 'px;height:' + inH + 'px;transform:translate(-50%,-50%) rotate(' + rot + 'deg)">' + inner + '</div><i class="ti-own"></i><i class="ti-mo">İPOTEKLİ</i>';
    box.append(t);
  });
}
function emBuildMid(ui, root){
  const mid = root.querySelector('.em-mid');
  const c = EMC + 14, size = EMB - 2 * c;
  mid.style.cssText = 'left:' + c + 'px;top:' + c + 'px;width:' + size + 'px;height:' + size + 'px';
  mid.innerHTML =
    '<div class="em-logo"><b>EMLAK</b><span>OYUNU</span><i>İstanbul · Ankara · İzmir</i></div>' +
    '<div class="em-deck sans"><i></i><i></i><i></i><b>ŞANS<br><big>?</big></b></div>' +
    '<div class="em-deck kamu"><i></i><i></i><i></i><b>KAMU<br>FONU</b></div>' +
    '<div class="em-dice"></div><div class="em-cturn"></div>';
  const dice = mid.querySelector('.em-dice');
  for (let k = 0; k < 2; k++){
    const cube = emEl('div', 'em-die'); cube.dataset.k = k;
    let f = '';
    for (let n = 1; n <= 6; n++){
      f += '<div class="f f' + n + '">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(q => '<i class="' + (EM_PIPS[n].includes(q) ? 'on' : '') + '"></i>').join('') + '</div>';
    }
    cube.innerHTML = f;
    dice.append(cube);
  }
}
const EM_PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
// bir yüzü ekrana (kameraya) çeviren dönüş
const EM_FACE = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };

// ================== ölçekleme ==================
function emFit(ui){
  const root = ui.root; if (!root || !root.isConnected) return;
  const fit = root.querySelector('.em-fit'), sc = root.querySelector('.em-scaler');
  root.classList.toggle('lite', ui.lite);
  const narrow = window.matchMedia('(max-width:1060px)').matches;
  const tilt = ui.lite ? 0 : (narrow ? 44 : 52);
  ui.tilt = tilt;
  root.style.setProperty('--tilt', tilt + 'deg');
  const center = root.querySelector('.em-center');
  const w = center.clientWidth || 600;
  const deck = root.closest('.deck') || root.parentElement;
  const dh = deck ? deck.clientHeight : 800;
  const banner = root.querySelector('.em-banner').offsetHeight, act = root.querySelector('.em-actions').offsetHeight;
  const rad = tilt * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad), PP = 2800;
  const far = 450 * cs * (PP / (PP + 450 * sn)), near = 450 * cs * (PP / (PP - 450 * sn));
  const topV = ui.lite ? 0 : 450 - far - 78, botV = ui.lite ? EMB : 450 + near + 46;
  const extX = ui.lite ? EMB + 30 : EMB * (PP / (PP - 450 * sn)) + 30;
  let availH = narrow ? 99999 : dh - banner - act - 44;
  availH = Math.max(300, availH);
  const s = Math.max(0.28, Math.min(w / extX, availH / (botV - topV), 1.3));
  fit.style.height = Math.round((botV - topV) * s) + 'px';
  fit.style.width = '100%';
  sc.style.cssText = 'width:' + EMB + 'px;height:' + EMB + 'px;transform:translate(' + Math.round((w - EMB * s) / 2) + 'px,' + Math.round(-topV * s) + 'px) scale(' + s + ');';
  ui.scale = s;
}

// ================== çizim ==================
function emPaint(ui){
  const root = ui.root, v = ui.v, vis = ui.vis;
  if (!root || !v || !vis) return;
  root.classList.toggle('busy', ui.busy);
  emPaintTiles(ui);
  emPaintPawns(ui);
  emPaintBuildings(ui);
  emPaintDice(ui);
  emPaintPlayers(ui);
  emPaintBanner(ui);
  emPaintCenter(ui);
  emPaintActions(ui);
  emPaintTapu(ui);
  emPaintLog(ui);
  emPaintModal(ui);
}
function emName(ui, k){ const n = ui.v.names && ui.v.names[k]; return n || ('Oyuncu ' + (k + 1)); }
const emColor = k => EmPawns.COL[k][0];
function emTxt(ui, tx){
  // @n → renkli oyuncu adı
  return emEsc(tx).replace(/@(\d)/g, (m, d) => '<b class="em-pn" style="color:' + emColor(+d) + '">' + emEsc(emName(ui, +d)) + '</b>');
}

function emPaintTiles(ui){
  const vis = ui.vis;
  ui.root.querySelectorAll('.ti').forEach(t => {
    const i = +t.dataset.i, T = EmlakCore.TILES[i];
    if (!T.price) return;
    const o = vis.own[i];
    t.classList.toggle('owned', o >= 0);
    t.classList.toggle('mort', !!vis.mo[i]);
    if (o >= 0) t.style.setProperty('--oc', emColor(o)); else t.style.removeProperty('--oc');
    const sub = t.querySelector('.ti-sub');
    if (sub) sub.innerHTML = o >= 0 ? '<span class="own-ico">' + EmPawns.ICON[o] + '</span>' + (vis.mo[i] ? '' : '') : emMoney(T.price);
    t.classList.toggle('sel', ui.sel === i);
  });
}

// piyonlar
const EM_PW = 44, EM_PH = 55;
const EM_SLOTS = [[-0.22, -0.12], [0.22, -0.12], [-0.22, 0.2], [0.22, 0.2], [0, -0.32], [0, 0.34]];
function emPawnTarget(ui, k){
  const vis = ui.vis, pos = vis.pos[k];
  const r = emRect(pos);
  const same = [0, 1, 2, 3, 4, 5].filter(q => ui.v.P[q].on && !vis.bk[q] && vis.pos[q] === pos && (pos !== EmlakCore.JAIL || !!vis.jail[q] === !!vis.jail[k]));
  const n = same.indexOf(k), m = same.length;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  let ox = 0, oy = 0;
  if (r.side === 'c'){
    if (pos === EmlakCore.JAIL){
      if (vis.jail[k]){ ox = -r.w * 0.2 + (n % 2) * 26 - 13; oy = -r.h * 0.2 + Math.floor(n / 2) * 20; }
      else { ox = r.w * 0.24 - (n % 2) * 10; oy = r.h * 0.24 + Math.floor(n / 2) * 10 - 6; }
    } else if (m > 1){ const sl = EM_SLOTS[n % 6]; ox = sl[0] * r.w * 1.25; oy = sl[1] * r.h * 1.25; }
  } else if (m > 1){ const sl = EM_SLOTS[n % 6]; ox = sl[0] * r.w; oy = sl[1] * r.h; }
  return { x: cx + ox, y: cy + oy };
}
const emPawnTf = (ui, x, y, z) => 'translate3d(' + x + 'px,' + y + 'px,' + (z || 0) + 'px) rotateX(' + (-(ui.tilt || 0)) + 'deg) translate(-50%,-86%)';
function emPaintPawns(ui){
  const stand = ui.root.querySelector('.em-stand'), v = ui.v;
  let any = false;
  for (let k = 0; k < 6; k++){
    const P = v.P[k];
    let el = stand.querySelector('.em-pawn[data-s="' + k + '"]');
    if (!P.on || ui.vis.bk[k]){ if (el) el.remove(); continue; }
    any = true;
    if (!el){
      el = emEl('div', 'em-pawn'); el.dataset.s = k;
      el.style.cssText = EmPawns.colorVars(k) + ';width:' + EM_PW + 'px;height:' + EM_PH + 'px';
      el.innerHTML = '<div class="em-pawn-in">' + EmPawns.pawn(k) + '</div><i class="em-pawn-me">sen</i>';
      stand.append(el);
      el._fresh = true;
    }
    el.classList.toggle('me', k === ui.seat);
    el.classList.toggle('active', ui.vis.act === k && !ui.vis.over);
    if (ui.hop[k]) continue;                  // zıplıyor: hareketi animasyon yönetir
    const t = emPawnTarget(ui, k);
    if (el._fresh || el._tilt !== ui.tilt){ el.style.transform = emPawnTf(ui, t.x, t.y); el._x = t.x; el._y = t.y; el._fresh = false; el._tilt = ui.tilt; }
    else if (Math.abs(el._x - t.x) > 0.5 || Math.abs(el._y - t.y) > 0.5){
      const a = emPawnTf(ui, el._x, el._y), b = emPawnTf(ui, t.x, t.y);
      el.style.transform = b; el._x = t.x; el._y = t.y;
      if (!reducedMotion()) el.animate([{ transform: a }, { transform: b }], { duration: 180, easing: 'ease-out' });
    }
    // ayakta duran piyonlar arkadan öne doğru sıralanır (derinlik)
    el.style.zIndex = Math.round(el._y);
  }
  void any;
}
function emHop(ui, k, x, y, ms, lift){
  const el = ui.root.querySelector('.em-pawn[data-s="' + k + '"]');
  if (!el) return Promise.resolve();
  ui.hop[k] = true;
  const a = emPawnTf(ui, el._x, el._y), b = emPawnTf(ui, x, y);
  const m = emPawnTf(ui, (el._x + x) / 2, (el._y + y) / 2, lift);
  el._x = x; el._y = y;
  el.style.transform = b;
  el.classList.add('hopping');
  const an = el.animate([{ transform: a }, { transform: m, offset: 0.5 }, { transform: b }], { duration: ms, easing: 'cubic-bezier(.35,.1,.4,1)' });
  return new Promise(res => { an.onfinish = an.oncancel = () => { el.classList.remove('hopping'); res(); }; });
}

// ev / otel
function emPaintBuildings(ui){
  const stand = ui.root.querySelector('.em-stand'), vis = ui.vis;
  EmlakCore.OWNABLE.forEach(i => {
    const L = vis.h[i], sig = L + ':' + ui.tilt;
    let g = stand.querySelector('.em-bld[data-i="' + i + '"]');
    if (!L){ if (g) g.remove(); return; }
    if (g && g._sig === sig) return;
    if (g) g.remove();
    g = emEl('div', 'em-bld'); g.dataset.i = i; g._sig = sig;
    const r = emRect(i), side = r.side;
    const inward = { b: [0, -1], l: [1, 0], t: [0, 1], r: [-1, 0] }[side];
    const along = { b: [1, 0], l: [0, 1], t: [1, 0], r: [0, 1] }[side];
    const half = (side === 'b' || side === 't') ? r.h : r.w;
    const c = emCenter(i);
    const bx = c.x + inward[0] * (half / 2 - 15), by = c.y + inward[1] * (half / 2 - 15);
    const items = L === 5 ? [0] : Array.from({ length: L }, (_, q) => q - (L - 1) / 2);
    items.forEach((off, q) => {
      const b = emEl('div', 'em-b' + (L === 5 ? ' hotel' : ''));
      const w = L === 5 ? 36 : 18, h = L === 5 ? 44 : 19;
      const sp = L === 5 ? 0 : 17;
      const x = bx + along[0] * off * sp, y = by + along[1] * off * sp;
      b.style.cssText = 'width:' + w + 'px;height:' + h + 'px;transform:translate3d(' + x + 'px,' + y + 'px,0) rotateX(' + (-(ui.tilt || 0)) + 'deg) translate(-50%,-90%);z-index:' + Math.round(y);
      b.innerHTML = L === 5 ? EmPawns.hotel() : EmPawns.house();
      g.append(b);
    });
    stand.append(g);
    if (!ui.noDrop && !reducedMotion() && ui.dropI === i){
      g.querySelectorAll('.em-b').forEach(b => { b.animate([{ opacity: 0, translate: '0 -60px' }, { opacity: 1, translate: '0 0' }], { duration: 380, easing: 'cubic-bezier(.3,1.4,.5,1)' }); });
      ui.dropI = null;
    }
  });
}

// zarlar
function emDiceTransform(n, rz){ const f = EM_FACE[n]; return 'rotateZ(' + rz + 'deg) rotateX(' + f[0] + 'deg) rotateY(' + f[1] + 'deg)'; }
function emDicePos(){
  // iki zar için keçenin üstünde rastgele, birbirine değmeyen iniş noktaları
  // alt orta bölge sıra yazısı / zar düğmesine ayrıldı
  for (let t = 0; t < 40; t++){
    const x0 = (Math.random() * 2 - 1) * 150, y0 = -150 + Math.random() * 175;
    const ang = Math.random() * Math.PI * 2, dist = 78 + Math.random() * 60;
    const x1 = x0 + Math.cos(ang) * dist, y1 = y0 + Math.sin(ang) * dist;
    if (Math.abs(x1) <= 175 && y1 >= -165 && y1 <= 40) return [[x0, y0], [x1, y1]];
  }
  return [[-60, -40], [50, -70]];
}
function emPaintDice(ui){
  const cubes = ui.root.querySelectorAll('.em-die');
  cubes.forEach((c, k) => {
    if (c._rolling) return;
    const n = ui.dice[k] || 1;
    if (c._n !== n || !c._pos){
      if (!c._pos) c._pos = k ? [50, -70] : [-55, -95];
      if (c._rz === undefined) c._rz = k ? 14 : -11;
      c.style.transform = 'translate3d(' + c._pos[0] + 'px,' + c._pos[1] + 'px,0) ' + emDiceTransform(n, c._rz); c._n = n;
    }
  });
}
function emRollDice(ui, d){
  gameSound('dice');
  const cubes = [...ui.root.querySelectorAll('.em-die')];
  ui.dice = d.slice();
  const land = emDicePos();
  const side = Math.floor(Math.random() * 4), sgn = side % 2 ? 1 : -1;
  return Promise.all(cubes.map((c, k) => {
    c._rolling = true;
    const rz = Math.round(Math.random() * 360 - 180);
    const [fx, fy] = land[k];
    // zar tahtanın bir kenarından fırlatılır, 2 kez sekip kayarak durur
    const ex = side < 2 ? sgn * 300 : (Math.random() * 2 - 1) * 240;
    const ey = side < 2 ? (Math.random() * 2 - 1) * 240 : sgn * 300;
    const dx = fx - ex, dy = fy - ey;
    const f = EM_FACE[d[k]];
    const rnd = () => Math.random() * 360;
    const at = (t, z, rx, ry, r) => 'translate3d(' + (ex + dx * t) + 'px,' + (ey + dy * t) + 'px,' + z + 'px) rotateZ(' + r + 'deg) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
    const kf = [
      { transform: at(0, 170, rnd(), rnd(), rnd()), offset: 0 },
      { transform: at(0.45, 0, rnd() + 360, rnd() + 360, rz + 200), offset: 0.38 },
      { transform: at(0.7, 62, rnd() + 720, rnd() + 360, rz + 120), offset: 0.55 },
      { transform: at(0.88, 0, f[0] + 720, f[1] + 720, rz + 40), offset: 0.74 },
      { transform: at(0.97, 16, f[0] + 720, f[1] + 720, rz + 10), offset: 0.88 },
      { transform: 'translate3d(' + fx + 'px,' + fy + 'px,0) ' + emDiceTransform(d[k], rz), offset: 1 }
    ];
    c._rz = rz; c._n = d[k]; c._pos = [fx, fy];
    const an = c.animate(kf, { duration: 1350 + k * 140, easing: 'cubic-bezier(.3,.55,.4,1)', fill: 'forwards' });
    return new Promise(res => { an.onfinish = () => { c.style.transform = kf[5].transform; an.cancel(); c._rolling = false; res(); }; });
  }));
}

// ================== olaylar (animasyon sırası) ==================
async function emRun(ui){
  if (ui.running) return;
  ui.running = true; ui.busy = true;
  const root = ui.root;
  try {
    while (ui.evq.length){
      if (!root.isConnected) break;
      const e = ui.evq.shift();
      await emPlay(ui, e);
    }
  } catch(err){ console.error(err); }
  ui.running = false; ui.busy = false;
  if (root.isConnected){
    ui.vis = emVisFrom(ui.v); ui.logLid = ui.v.lid;
    ui.root.querySelectorAll('.em-pawn').forEach(p => { p._fresh = false; });
    emPaint(ui);
  }
}
const emFlash = (ui, i) => { const t = ui.root.querySelector('.ti[data-i="' + i + '"]'); if (t && !reducedMotion()) t.animate([{ filter: 'brightness(1.9)' }, { filter: 'brightness(1)' }], { duration: 700 }); };
async function emPlay(ui, e){
  const v = ui.v, vis = ui.vis;
  switch (e.t){
    case 'start': {
      ui.logLid = 0;
      await emDealIntro(ui, e);
      return;
    }
    case 'dice':
      await emRollDice(ui, e.d);
      await emSleep(250);
      return;
    case 'move': {
      const k = e.s;
      if (e.jail || e.fw === 0){
        vis.pos[k] = e.to;
        if (e.jail) vis.jail[k] = 1;
        const t = emPawnTarget(ui, k);
        ui.hop[k] = true;
        await emHop(ui, k, t.x, t.y, 620, 150);
        ui.hop[k] = false; emPaintPawns(ui);
        return;
      }
      const dir = e.fw > 0 ? 1 : -1, n = Math.abs(e.fw);
      ui.hop[k] = true;
      let cur = e.f;
      for (let q = 0; q < n; q++){
        cur = (cur + dir + 40) % 40;
        const c = emCenter(cur);
        vis.pos[k] = cur;
        const last = q === n - 1;
        let tx = c.x, ty = c.y;
        if (last){ const t = emPawnTarget(ui, k); tx = t.x; ty = t.y; }
        await emHop(ui, k, tx, ty, n > 12 ? 120 : 160, 30);
        gameSound('tile');
      }
      ui.hop[k] = false;
      vis.pos[k] = e.to;
      emPaintPawns(ui);
      emFlash(ui, e.to);
      await emSleep(150);
      return;
    }
    case 'free': vis.jail[e.s] = 0; emPaintPawns(ui); emFloat(ui, e.s, 'Serbest!', 'good'); await emSleep(350); return;
    case 'jail': vis.jail[e.s] = 1; emPaintPawns(ui); emFloat(ui, e.s, '⛓ Cezaevi', 'bad'); gameSound('err'); await emSleep(500); return;
    case 'pay': await emPay(ui, e); return;
    case 'buy':
      vis.own[e.i] = e.s; emPaintTiles(ui); emPaintPlayers(ui); emFlash(ui, e.i); gameSound('checker');
      emFloat(ui, e.s, '🏷 ' + EmlakCore.TILES[e.i].n, 'good');
      await emSleep(550); return;
    case 'build': {
      const was = vis.h[e.i]; vis.h[e.i] = e.lv; ui.dropI = e.lv > was ? e.i : null;
      const g0 = ui.root.querySelector('.em-bld[data-i="' + e.i + '"]'); if (g0) g0.remove();
      emPaintBuildings(ui); emPaintPlayers(ui); gameSound('checker'); await emSleep(450); return;
    }
    case 'mort': vis.mo[e.i] = e.on; emPaintTiles(ui); gameSound('tile'); await emSleep(300); return;
    case 'card': await emCard(ui, e); return;
    case 'auction': emFlash(ui, e.i); await emSleep(300); return;
    case 'bid': gameSound('tile'); emFloat(ui, e.s, emMoney(e.a), 'good'); await emSleep(250); return;
    case 'trade': emFloat(ui, e.f, '🤝 Takas teklifi', 'good'); await emSleep(300); return;
    case 'traded': gameSound('win'); vis.own.forEach((o, i) => { if (e.gp.includes(i)) vis.own[i] = e.to; if (e.wp.includes(i)) vis.own[i] = e.f; }); emPaintTiles(ui); emPaintPlayers(ui); await emSleep(500); return;
    case 'bankrupt': emFloat(ui, e.s, '💥 İflas!', 'bad'); gameSound('err'); vis.bk[e.s] = true; emPaintPawns(ui); await emSleep(1200); return;
    case 'win': gameSound('win'); confetti(ui.root.querySelector('.em-fit')); await emSleep(900); return;
  }
}

// ------ para ------
function emPanelEl(ui, k){ return ui.root.querySelector('.em-pl[data-s="' + k + '"]'); }
function emPay(ui, e){
  const vis = ui.vis;
  const bank = ui.root.querySelector('.em-logo');
  const from = e.f >= 0 ? emPanelEl(ui, e.f) : bank, to = e.to >= 0 ? emPanelEl(ui, e.to) : bank;
  const n = e.a >= 400 ? 4 : e.a >= 100 ? 3 : e.a >= 40 ? 2 : 1;
  gameSound('tile');
  if (from && to && !reducedMotion()){
    for (let q = 0; q < n; q++) emBill(from, to, q * 90, e.a);
  }
  if (e.f >= 0) emTween(ui, e.f, vis.money[e.f] - e.a);
  if (e.to >= 0) emTween(ui, e.to, vis.money[e.to] + e.a);
  if (e.f >= 0) emFloat(ui, e.f, '−' + emMoney(e.a), 'bad');
  if (e.to >= 0) setTimeout(() => emFloat(ui, e.to, '+' + emMoney(e.a), 'good'), 420);
  return emSleep(n * 90 + 520).then(() => { tone([1568, 2093], 0.05, 0.08, 0.05); });
}
function emBill(fromEl, toEl, delay, amt){
  const fx = fromEl.closest('.em').querySelector('.em-fx');
  const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect(), fr = fx.getBoundingClientRect();
  const el = emEl('div', 'em-bill', '₺');
  fx.append(el);
  const sx = a.left + a.width / 2 - fr.left, sy = a.top + a.height / 2 - fr.top, ex = b.left + b.width / 2 - fr.left, ey = b.top + b.height / 2 - fr.top;
  const mx = (sx + ex) / 2 + (Math.random() * 60 - 30), my = Math.min(sy, ey) - 60 - Math.random() * 30;
  const an = el.animate([
    { transform: 'translate(' + sx + 'px,' + sy + 'px) translate(-50%,-50%) rotate(-10deg) scale(.6)', opacity: 0 },
    { transform: 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%) rotate(' + (Math.random() * 40 - 20) + 'deg) scale(1.1)', opacity: 1, offset: 0.45 },
    { transform: 'translate(' + ex + 'px,' + ey + 'px) translate(-50%,-50%) rotate(8deg) scale(.7)', opacity: 0.2 }
  ], { duration: 620, delay, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'both' });
  an.onfinish = () => el.remove();
}
function emFloat(ui, k, text, cls){
  const p = emPanelEl(ui, k); if (!p || reducedMotion()) return;
  const fx = ui.root.querySelector('.em-fx'), fr = fx.getBoundingClientRect(), r = p.getBoundingClientRect();
  const el = emEl('div', 'em-float ' + cls, emEsc(text));
  el.style.left = (r.left + r.width / 2 - fr.left) + 'px'; el.style.top = (r.top - fr.top + 6) + 'px';
  fx.append(el);
  el.animate([{ transform: 'translate(-50%,0)', opacity: 0 }, { transform: 'translate(-50%,-14px)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,-46px)', opacity: 0 }], { duration: 1500, easing: 'ease-out' }).onfinish = () => el.remove();
}
function emTween(ui, k, target){
  const from = ui.vis.money[k], t0 = performance.now(), dur = 600;
  const step = now => {
    if (!ui.root.isConnected) return;
    const f = Math.min(1, (now - t0) / dur), val = Math.round(from + (target - from) * f);
    ui.vis.money[k] = val;
    const m = ui.root.querySelector('.em-pl[data-s="' + k + '"] .pm'); if (m) m.textContent = emMoney(val);
    if (f < 1) requestAnimationFrame(step); else ui.vis.money[k] = target;
  };
  requestAnimationFrame(step);
}

// ------ kart çekme ------
async function emCard(ui, e){
  gameSound('tile');
  const fx = ui.root.querySelector('.em-fx'), fr = fx.getBoundingClientRect();
  const deck = ui.root.querySelector('.em-deck.' + e.deck), dr = deck.getBoundingClientRect();
  const sans = e.deck === 'sans';
  const card = emEl('div', 'em-card3d ' + e.deck);
  card.innerHTML = '<div class="cf back"><b>' + (sans ? 'ŞANS' : 'KAMU FONU') + '</b><span>' + (sans ? '?' : '🎁') + '</span></div>' +
    '<div class="cf front"><small>' + (sans ? 'ŞANS' : 'KAMU FONU') + '</small><p>' + emEsc(e.tx) + '</p><em>' + emEsc(emName(ui, e.s)) + '</em></div>';
  fx.append(card);
  const sx = dr.left + dr.width / 2 - fr.left, sy = dr.top + dr.height / 2 - fr.top;
  const ex = fr.width / 2, ey = Math.min(fr.height * 0.42, 280);
  const sc0 = Math.max(0.12, dr.width / 260);
  if (reducedMotion()){ card.style.transform = 'translate(' + ex + 'px,' + ey + 'px) translate(-50%,-50%) rotateY(180deg)'; await emSleep(1500); card.remove(); return; }
  const an = card.animate([
    { transform: 'translate(' + sx + 'px,' + sy + 'px) translate(-50%,-50%) scale(' + sc0 + ') rotateY(0deg) rotateZ(-8deg)', opacity: 0.9 },
    { transform: 'translate(' + ex + 'px,' + (ey - 70) + 'px) translate(-50%,-50%) scale(.9) rotateY(0deg) rotateZ(0deg)', opacity: 1, offset: 0.4 },
    { transform: 'translate(' + ex + 'px,' + ey + 'px) translate(-50%,-50%) scale(1) rotateY(180deg)', opacity: 1, offset: 0.62 },
    { transform: 'translate(' + ex + 'px,' + ey + 'px) translate(-50%,-50%) scale(1) rotateY(180deg)', opacity: 1, offset: 0.88 },
    { transform: 'translate(' + sx + 'px,' + sy + 'px) translate(-50%,-50%) scale(' + sc0 + ') rotateY(180deg)', opacity: 0 }
  ], { duration: 2500, easing: 'ease-in-out', fill: 'forwards' });
  await new Promise(r => { an.onfinish = r; });
  card.remove();
}

// ------ oyun başı: para ve tapu dağıtımı ------
async function emDealIntro(ui, e){
  const v = ui.v, vis = ui.vis;
  const bank = ui.root.querySelector('.em-logo');
  const act = [0, 1, 2, 3, 4, 5].filter(k => v.P[k].on);
  // paralar
  for (let r = 0; r < 3; r++){
    act.forEach((k, q) => { if (!reducedMotion()) emBill(bank, emPanelEl(ui, k), q * 70 + r * 40, 100); });
    await emSleep(act.length * 70 + 120);
    gameSound('tile');
  }
  act.forEach(k => emTween(ui, k, v.P[k].m));
  tone([660, 880, 1100], 0.07, 0.12, 0.06);
  await emSleep(700);
  // tapular
  for (const d of (e.deals || [])){
    const fx = ui.root.querySelector('.em-fx'), fr = fx.getBoundingClientRect();
    const a = bank.getBoundingClientRect(), b = emPanelEl(ui, d[0]).getBoundingClientRect();
    const T = EmlakCore.TILES[d[1]];
    const el = emEl('div', 'em-dealcard');
    el.style.setProperty('--gc', EmlakCore.GRP[T.g] ? EmlakCore.GRP[T.g].c : '#667');
    el.innerHTML = '<i></i><b>' + emEsc(T.n) + '</b>';
    fx.append(el);
    const sx = a.left + a.width / 2 - fr.left, sy = a.top + a.height / 2 - fr.top, ex = b.left + b.width / 2 - fr.left, ey = b.top + b.height / 2 - fr.top;
    const an = el.animate([
      { transform: 'translate(' + sx + 'px,' + sy + 'px) translate(-50%,-50%) scale(.4) rotate(-20deg)', opacity: 0 },
      { transform: 'translate(' + sx + 'px,' + (sy - 40) + 'px) translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1, offset: 0.25 },
      { transform: 'translate(' + ex + 'px,' + ey + 'px) translate(-50%,-50%) scale(.5) rotate(12deg)', opacity: 0.4 }
    ], { duration: 640, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' });
    an.onfinish = () => el.remove();
    gameSound('tile');
    vis.own[d[1]] = d[0];
    setTimeout(() => { emPaintTiles(ui); emPaintPlayers(ui); }, 520);
    await emSleep(300);
  }
  await emSleep(500);
}

// ================== paneller ==================
function emPaintPlayers(ui){
  const v = ui.v, vis = ui.vis, box = ui.root.querySelector('.em-players');
  const act = vis.act;
  const html = [0, 1, 2, 3, 4, 5].filter(k => v.P[k].on).map(k => {
    const P = v.P[k], bk = vis.bk[k];
    const props = EmlakCore.OWNABLE.filter(i => vis.own[i] === k);
    const chips = props.sort((a, b) => a - b).map(i => {
      const T = EmlakCore.TILES[i];
      const col = T.g ? EmlakCore.GRP[T.g].c : T.k === 'rail' ? '#69727d' : '#e2d27a';
      return '<i class="ch' + (vis.mo[i] ? ' mo' : '') + '" style="background:' + col + '" title="' + emEsc(T.n) + '">' + (vis.h[i] ? (vis.h[i] === 5 ? 'O' : vis.h[i]) : '') + '</i>';
    }).join('');
    const st = bk ? '💥 İflas etti' : vis.jail[k] ? '⛓ Cezaevinde' : (act === k && !vis.over) ? '🎯 Sırada' : '';
    return '<div class="em-pl' + (act === k && !bk && !vis.over ? ' turn' : '') + (bk ? ' bk' : '') + (k === ui.seat ? ' me' : '') + '" data-s="' + k + '" style="' + EmPawns.colorVars(k) + '">' +
      '<div class="em-pl-av">' + EmPawns.ICON[k] + '</div>' +
      '<div class="em-pl-nm"><b>' + emEsc(emName(ui, k)) + (k === ui.seat ? ' (sen)' : '') + (ui.s.seats[k] && ui.s.seats[k].bot ? ' 🤖' : '') + '</b><small>' + (st || EmPawns.NAMES[k]) + (P.jcs.length ? ' · 🔑×' + P.jcs.length : '') + '</small></div>' +
      '<div class="pm">' + emMoney(vis.money[k]) + '</div>' +
      '<div class="em-pl-ch">' + chips + '</div></div>';
  }).join('');
  if (box._html !== html){
    box.innerHTML = html; box._html = html;
    box.querySelectorAll('.em-pl').forEach(p => { p.onclick = () => { ui.modal = { type: 'player', s: +p.dataset.s }; emPaint(ui); }; });
  }
}
function emTick(ui){
  const el = ui.root.querySelector('.em-timer'); if (!el) return;
  if (!ui.deadline || ui.busy){ el.textContent = ''; return; }
  const left = Math.max(0, Math.round((ui.deadline - Date.now()) / 1000));
  el.textContent = '⏱ ' + String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
  el.classList.toggle('warn', left <= 15);
}
function emPaintBanner(ui){
  const v = ui.v, b = ui.root.querySelector('.em-banner');
  if (ui.busy && b._sig){ emTick(ui); return; }
  const act = EmlakCore.actor(v);
  let t = '';
  if (v.phase === 'over') t = '🏆 Oyun bitti';
  else {
    const who = act === ui.seat ? '<b class="em-pn" style="color:' + emColor(act) + '">Sıra sende</b>' : 'Sıra <b class="em-pn" style="color:' + emColor(act) + '">' + emEsc(emName(ui, act)) + '</b>\'de';
    const ph = { roll: 'zar atacak', buy: 'satın alma kararı', auction: 'açık artırma', debt: 'borç ödüyor', end: 'turunu tamamlıyor', move: '' }[v.phase] || '';
    t = who + (ph ? ' · <span class="note">' + ph + '</span>' : '');
  }
  const sig = t + '|' + (v.opts.mode);
  if (b._sig !== sig){
    b._sig = sig;
    b.innerHTML = '<span class="em-turn">' + t + '</span><span class="em-timer"></span><span class="em-bsp"></span>' +
      '<button type="button" class="em-lite-btn" title="Hafif görünüm (telefon pili / yavaş cihaz için)">' + (ui.lite ? '🧊 3D aç' : '⚡ Hafif mod') + '</button>';
    b.querySelector('.em-lite-btn').onclick = () => {
      ui.lite = !ui.lite; try { store.set('oyunodasi-emlak-lite', ui.lite ? '1' : '0'); } catch(e){}
      b._sig = ''; ui.root.querySelectorAll('.em-pawn,.em-bld').forEach(x => x.remove());
      emFit(ui); emPaint(ui);
    };
  }
  emTick(ui);
}

// tahtanın ortasındaki "sıra kimde" yazısı ve zar atma düğmesi
function emPaintCenter(ui){
  const v = ui.v, box = ui.root.querySelector('.em-cturn');
  if (!box) return;
  const act = EmlakCore.actor(v), mine = ui.seat >= 0 && act === ui.seat;
  const canRoll = !ui.busy && mine && v.phase === 'roll';
  const sig = [v.phase, act, canRoll, v.again, ui.busy, emName(ui, act)].join('|');
  if (box._sig === sig) return;
  box._sig = sig;
  if (v.phase === 'over'){ box.innerHTML = '<div class="ct-pill">🏆 Oyun bitti</div>'; return; }
  const col = emColor(act);
  const who = mine ? 'Sıra sende' : 'Sıra ' + emEsc(emName(ui, act)) + '\'de';
  box.innerHTML = '<div class="ct-pill" style="--pc:' + col + '"><i></i>' + who + '</div>' +
    (canRoll ? '<button type="button" class="ct-roll">🎲 ' + (v.again ? 'Tekrar at' : 'Zar at') + '</button>' : '');
  const b = box.querySelector('.ct-roll');
  if (b) b.onclick = () => { if (ui.busy) return; emAct({ type: 'roll' }); };
}

// tapu kartı
function emRentLines(i){
  const T = EmlakCore.TILES[i];
  if (T.k === 'p') return [['Kira', T.rent[0]], ['Setin tamamı (evsiz)', T.rent[0] * 2], ['1 ev ile', T.rent[1]], ['2 ev ile', T.rent[2]], ['3 ev ile', T.rent[3]], ['4 ev ile', T.rent[4]], ['Otel ile', T.rent[5]]];
  if (T.k === 'rail') return [['1 istasyon', 25], ['2 istasyon', 50], ['3 istasyon', 100], ['4 istasyon', 200]];
  return [];
}
function emTapuHtml(ui, i){
  const T = EmlakCore.TILES[i], v = ui.v, vis = ui.vis;
  if (!T.price){
    const note = { go: 'Her geçişte ₺200 alırsın.', chance: 'Bir Şans kartı çekersin.', chest: 'Bir Kamu Fonu kartı çekersin.', tax: T.amt ? 'Bankaya ' + emMoney(T.amt) + ' ödersin.' : '', jail: 'Sadece ziyaret edenler bir şey ödemez. Cezaevindeysen: çift at, ₺50 öde ya da kart kullan (3 turda çıkamazsan ₺50 zorunlu).', park: 'Dinlenme yeri; ödeme ya da ödül yok.', gojail: 'Buraya gelen doğrudan Cezaevi\'ne gider.' }[T.k] || '';
    return '<div class="tapu plain"><div class="tp-head"><small>KARE</small><b>' + emEsc(T.n) + '</b></div><p class="tp-note">' + note + '</p></div>';
  }
  const g = T.g ? EmlakCore.GRP[T.g] : null;
  const col = g ? g.c : T.k === 'rail' ? '#69727d' : '#d9c85e';
  const o = vis.own[i];
  let rows = '';
  if (T.k === 'p') rows = emRentLines(i).map((r, q) => '<div class="tp-row' + (vis.h[i] === q - 1 && q >= 2 ? ' now' : '') + '"><span>' + r[0] + '</span><b>' + emMoney(r[1]) + '</b></div>').join('');
  else if (T.k === 'rail') rows = emRentLines(i).map(r => '<div class="tp-row"><span>' + r[0] + '</span><b>' + emMoney(r[1]) + '</b></div>').join('');
  else rows = '<div class="tp-row"><span>Tek şirket sahibi</span><b>zar × 4</b></div><div class="tp-row"><span>İki şirket sahibi</span><b>zar × 10</b></div>';
  const foot = T.k === 'p' ? 'Ev / otel maliyeti ' + emMoney(T.h) + ' · İpotek ' + emMoney(T.price / 2) : 'Fiyat ' + emMoney(T.price) + ' · İpotek ' + emMoney(T.price / 2);
  return '<div class="tapu" style="--tc:' + col + '"><div class="tp-head"><small>TAPU' + (g ? ' · ' + g.n.toUpperCase() : '') + '</small><b>' + emEsc(T.n) + '</b></div>' +
    '<div class="tp-price">Fiyat ' + emMoney(T.price) + '</div>' + rows + '<div class="tp-foot">' + foot + '</div>' +
    '<div class="tp-own">' + (o >= 0 ? 'Sahibi: <b style="color:' + emColor(o) + '">' + emEsc(emName(ui, o)) + '</b>' + (vis.mo[i] ? ' · İPOTEKLİ' : '') + (vis.h[i] ? ' · ' + (vis.h[i] === 5 ? 'Otel' : vis.h[i] + ' ev') : '') : 'Sahibi yok') + '</div></div>';
}
function emPaintTapu(ui){
  const v = ui.v, box = ui.root.querySelector('.em-tapu');
  const i = ui.sel !== null && ui.sel !== undefined ? ui.sel : (v.last ? v.last.i : 0);
  const html = emTapuHtml(ui, i);
  const key = html + ui.vis.own[i] + ui.vis.h[i] + ui.vis.mo[i] + ui.v.names.join();
  if (box._k !== key){ box._k = key; box.innerHTML = html; }
}
function emPaintLog(ui){
  const v = ui.v, box = ui.root.querySelector('.em-log');
  const lines = v.log.filter(l => l.id <= ui.logLid).slice(-40).reverse();
  const key = lines.length + ':' + (lines[0] ? lines[0].id : 0);
  if (box._k === key) return;
  box._k = key;
  box.innerHTML = '<div class="em-log-h">Oyun günlüğü</div>' + lines.map(l => '<div class="em-ll">' + emTxt(ui, l.tx) + '</div>').join('');
}

// ================== hamle paneli ==================
function emBtn(label, cls, fn, dis, title){
  const b = emEl('button', 'btn' + (cls ? ' ' + cls.split(' ').map(c => c === 'big' ? 'em-b-big' : c === 'danger' ? 'em-b-danger' : c).join(' ') : ''), label); b.type = 'button';
  if (dis) b.disabled = true;
  if (title) b.title = title;
  if (fn) b.onclick = () => { if (ui_busy_guard()) return; fn(); };
  return b;
}
let EM_CUR = null;
function ui_busy_guard(){ return EM_CUR && EM_CUR.busy; }
function emAct(a){ tableAct(a); }
function emPaintActions(ui){
  EM_CUR = ui;
  const v = ui.v, box = ui.root.querySelector('.em-actions'), seat = ui.seat;
  const act = EmlakCore.actor(v), mine = seat >= 0 && act === seat;
  const T = EmlakCore.TILES;
  const sig = JSON.stringify([v.eid, v.phase, ui.busy, seat, v.tr, v.au && [v.au.bid, v.au.who, v.au.cur], v.P[seat] ? v.P[seat].m : 0, ui.modal && ui.modal.type, ui.draftSig]);
  if (box._sig === sig) return;
  box._sig = sig;
  box.innerHTML = '';
  const main = emEl('div', 'em-act-main'), sub = emEl('div', 'em-act-sub');
  const msg = emEl('div', 'em-act-msg');
  box.append(msg, main, sub);
  // gelen takas
  if (v.tr && v.tr.to === seat && !ui.busy){
    const t = v.tr;
    const desc = x => [...(x.cash ? [emMoney(x.cash)] : []), ...x.props.map(i => T[i].n), ...(x.jc ? ['🔑 Cezadan Çık ×' + x.jc] : [])].join(', ') || 'hiçbir şey';
    const card = emEl('div', 'em-tr-in', '<b>🤝 ' + emTxt(ui, '@' + t.f) + ' sana takas teklif ediyor</b><div>Sen verirsin: <em>' + emEsc(desc({ cash: t.wc, props: t.wp, jc: t.wj })) + '</em></div><div>Sen alırsın: <em>' + emEsc(desc({ cash: t.gc, props: t.gp, jc: t.gj })) + '</em></div>');
    const r = emEl('div', 'em-tr-btns');
    r.append(emBtn('✓ Kabul et', 'primary', () => emAct({ type: 'tradeyes' })), emBtn('✕ Reddet', '', () => emAct({ type: 'tradeno' })));
    card.append(r); box.prepend(card);
  } else if (v.tr && v.tr.f === seat){
    const card = emEl('div', 'em-tr-in out', '<b>🤝 Takas teklifin ' + emTxt(ui, '@' + v.tr.to) + ' cevabını bekliyor…</b>');
    card.append(emBtn('Geri çek', '', () => emAct({ type: 'tradeno' })));
    box.prepend(card);
  }
  if (v.phase === 'over'){ msg.innerHTML = emOverText(ui); main.append(emBtn('🏆 Sonuçlar', 'primary', () => { ui.modal = { type: 'over' }; emPaint(ui); })); if (ui.s.owner === peer.id) main.append(emBtn('↻ Yeni oyun', '', () => emAct({ type: 'newMatch' }))); emSubButtons(ui, sub); return; }
  if (ui.busy){ msg.innerHTML = '<span class="note">…</span>'; return; }
  if (seat < 0){ msg.innerHTML = '<span class="note">Oyunu izliyorsun. Koltuk boşalırsa oturabilirsin.</span>'; emSubButtons(ui, sub); return; }
  const P = v.P[seat];
  if (!mine){
    const a = EmlakCore.actor(v);
    msg.innerHTML = v.phase === 'auction' ? 'Açık artırma: ' + emTxt(ui, '@' + a) + ' teklif sırasında…' : emTxt(ui, '@' + a) + ' oynuyor…';
    if (v.phase === 'auction') emAuctionInfo(ui, msg);
    emSubButtons(ui, sub); return;
  }
  const pos = P.pos, t = T[pos];
  if (v.phase === 'roll'){
    if (P.j){
      msg.innerHTML = '⛓ Cezaevindesin (' + P.j + '/3). Çift at, ya da ' + emMoney(EmlakCore.JAIL_FINE) + ' öde' + (P.jcs.length ? ' / kartını kullan' : '') + '.';
      main.append(emBtn('🎲 Zar at', 'primary big', () => emAct({ type: 'roll' })));
      main.append(emBtn('₺' + EmlakCore.JAIL_FINE + ' öde', '', () => emAct({ type: 'payjail' }), P.m < EmlakCore.JAIL_FINE));
      if (P.jcs.length) main.append(emBtn('🔑 Kartı kullan', '', () => emAct({ type: 'usecard' })));
    } else {
      msg.innerHTML = v.again ? '<b>Çift attın!</b> Tekrar zar at.' : 'Sıra sende. Zar at!';
      main.append(emBtn('🎲 Zar at', 'primary big', () => emAct({ type: 'roll' })));
    }
  } else if (v.phase === 'buy'){
    msg.innerHTML = '<b>' + emEsc(t.n) + '</b> sahipsiz · ' + emMoney(t.price) + (T[pos].g ? ' · ' + EmlakCore.GRP[t.g].n + ' seri' : '');
    main.append(emBtn('Satın al · ' + emMoney(t.price), 'primary big', () => emAct({ type: 'buy' }), P.m < t.price));
    main.append(emBtn('🔨 Açık artırma', '', () => emAct({ type: 'auction' })));
    if (P.m < t.price) msg.innerHTML += '<br><span class="note">Paran yetmiyor: ipotek ederek para bulabilir ya da açık artırmaya çıkarabilirsin.</span>';
  } else if (v.phase === 'auction'){
    emAuctionInfo(ui, msg);
    emAuctionUI(ui, main);
  } else if (v.phase === 'debt'){
    const d = v.debt;
    msg.innerHTML = '<b>' + emMoney(d.a) + '</b> borcun var, nakdin ' + emMoney(P.m) + '. Mülk sat / ipotek et ya da iflas et.';
    main.append(emBtn('Borcu öde', 'primary big', () => emAct({ type: 'paydebt' }), P.m < d.a));
    main.append(emBtn('🏠 Yönet / ipotek', '', () => { ui.modal = { type: 'manage' }; emPaint(ui); }));
    main.append(emBtn('💥 İflas et', 'danger', () => { if (confirm('İflas edersen oyundan çıkarsın. Emin misin?')) emAct({ type: 'bankrupt' }); }));
  } else if (v.phase === 'end'){
    msg.innerHTML = 'Turun bitti. İstersen ev yap, ipotek et ya da takas teklif et.';
    main.append(emBtn('Turu bitir ➜', 'primary big', () => emAct({ type: 'end' })));
  }
  emSubButtons(ui, sub);
}
function emOverText(ui){
  const v = ui.v;
  return v.win >= 0 ? '🏆 <b style="color:' + emColor(v.win) + '">' + emEsc(emName(ui, v.win)) + '</b> kazandı! <span class="note">' + emEsc(v.winWhy) + '</span>' : 'Oyun bitti.';
}
function emAuctionInfo(ui, msg){
  const v = ui.v, au = v.au; if (!au) return;
  const T = EmlakCore.TILES[au.i];
  msg.innerHTML = '🔨 <b>' + emEsc(T.n) + '</b> açık artırmada · Etiket ' + emMoney(T.price) + '<br>' +
    (au.who >= 0 ? 'En yüksek teklif: <b>' + emMoney(au.bid) + '</b> (' + emTxt(ui, '@' + au.who) + ')' : 'Henüz teklif yok') +
    (au.cur === ui.seat ? '' : '<br><span class="note">Teklif sırası: ' + emTxt(ui, '@' + au.cur) + '</span>');
}
function emAuctionUI(ui, main){
  const v = ui.v, au = v.au, P = v.P[ui.seat];
  if (!au || au.cur !== ui.seat) return;
  [10, 50, 100].forEach(inc => {
    const amt = au.bid + inc;
    main.append(emBtn('+' + inc + ' → ' + emMoney(amt), inc === 10 ? 'primary' : '', () => emAct({ type: 'bid', amt }), amt > P.m));
  });
  const inp = emEl('input', 'em-bid-in'); inp.type = 'number'; inp.min = au.bid + 1; inp.placeholder = 'Kendi teklifin'; inp.inputMode = 'numeric';
  const go = emBtn('Teklif ver', '', () => { const a = Math.floor(+inp.value); if (a > au.bid) emAct({ type: 'bid', amt: a }); });
  main.append(inp, go, emBtn('Pas', 'danger', () => emAct({ type: 'pass' })));
}
function emSubButtons(ui, sub){
  const v = ui.v, seat = ui.seat;
  const mk = (l, m) => sub.append(emBtn(l, '', () => { ui.modal = m; emPaint(ui); }));
  if (seat >= 0) mk('🏠 Tapularım / Yönet', { type: 'manage' });
  if (seat >= 0 && v.phase !== 'over') mk('🤝 Takas', { type: 'tradepick' });
  mk('📜 Günlük', { type: 'log' });
  mk('📖 Kurallar', { type: 'rules' });
}

// ================== pencereler ==================
function emClose(ui){ ui.modal = null; ui.draft = null; ui.draftSig = ''; emPaint(ui); }
function emPaintModal(ui){
  const box = ui.root.querySelector('.em-modal'), m = ui.modal, v = ui.v;
  if (!m){ box.hidden = true; box.innerHTML = ''; box._k = ''; return; }
  box.hidden = false;
  if (m.type === 'rules'){ ui.modal = null; box.hidden = true; if (typeof nasilAc === 'function') nasilAc('emlak'); return; }
  const k = JSON.stringify([m, v.eid, ui.busy, ui.draftSig, ui.vis.own.join(''), ui.vis.h.join('')]);
  if (box._k === k) return;
  box._k = k;
  const keepScroll = box.querySelector('.em-sheet-b') ? box.querySelector('.em-sheet-b').scrollTop : 0;
  const sheet = emEl('div', 'em-sheet');
  const head = emEl('div', 'em-sheet-h');
  const body = emEl('div', 'em-sheet-b');
  const title = { manage: '🏠 Tapularım ve yapılaşma', player: '👤 Oyuncu', tradepick: '🤝 Kimle takas?', trade: '🤝 Takas teklifi', log: '📜 Oyun günlüğü', tile: '🏷 Tapu', over: '🏆 Oyun sonucu' }[m.type] || '';
  head.innerHTML = '<b>' + title + '</b>';
  const x = emBtn('Kapat', '', () => emClose(ui)); x.classList.add('em-x'); head.append(x);
  sheet.append(head, body);
  if (m.type === 'manage') emManage(ui, body);
  else if (m.type === 'player') emPlayerSheet(ui, body, m.s);
  else if (m.type === 'tradepick') emTradePick(ui, body);
  else if (m.type === 'trade') emTradeForm(ui, body, m.to);
  else if (m.type === 'log'){ body.innerHTML = v.log.filter(l => l.id <= ui.logLid).slice().reverse().map(l => '<div class="em-ll">' + emTxt(ui, l.tx) + '</div>').join(''); }
  else if (m.type === 'tile') body.innerHTML = emTapuHtml(ui, m.i);
  else if (m.type === 'over') emOverSheet(ui, body);
  box.innerHTML = ''; box.append(sheet);
  box.onclick = e => { if (e.target === box) emClose(ui); };
  body.scrollTop = keepScroll;
}
function emManage(ui, body){
  const v = ui.v, seat = ui.seat, my = EmlakCore.own(v, seat);
  const mgmt = seat === v.turn && ['roll', 'end', 'debt'].includes(v.phase) && !ui.busy;
  body.append(emEl('p', 'note', mgmt ? 'Ev ve otel yapabilirsin (renk setin tamsa; ev sırayla eşit yapılır). İpotekle nakit bulabilirsin.' : 'Ev, otel ve ipotek işlemleri sıra sendeyken yapılır. Şimdilik sadece görüntülüyorsun.'));
  if (!my.length){ body.append(emEl('p', 'note', 'Henüz hiç tapun yok.')); return; }
  const groups = {};
  my.forEach(i => { const T = EmlakCore.TILES[i]; const g = T.g || T.k; (groups[g] = groups[g] || []).push(i); });
  Object.keys(groups).forEach(g => {
    const col = EmlakCore.GRP[g] ? EmlakCore.GRP[g].c : g === 'rail' ? '#69727d' : '#d9c85e';
    const sec = emEl('div', 'em-mg'); sec.style.setProperty('--tc', col);
    const full = EmlakCore.GRP[g] && EmlakCore.countOwned(v, seat, EmlakCore.GROUPS[g]) === EmlakCore.GROUPS[g].length;
    sec.append(emEl('div', 'em-mg-h', '<i></i><b>' + (EmlakCore.GRP[g] ? EmlakCore.GRP[g].n : g === 'rail' ? 'İstasyonlar' : 'Şirketler') + '</b>' + (full ? '<span class="pill live">Set tamam</span>' : '')));
    groups[g].forEach(i => {
      const T = EmlakCore.TILES[i], p = v.pr[i];
      const row = emEl('div', 'em-mr');
      row.innerHTML = '<span class="n"><b>' + emEsc(T.n) + '</b><small>' + (p.mo ? 'İpotekli' : p.h ? (p.h === 5 ? 'Otel' : p.h + ' ev') : 'Boş') + ' · kira ' + emMoney(EmlakCore.rentOf(v, i)) + '</small></span>';
      const bx = emEl('span', 'bx');
      if (T.k === 'p'){
        const eb = EmlakCore.canBuild(v, seat, i), es = EmlakCore.canSell(v, seat, i);
        bx.append(emBtn('+ ' + (p.h === 4 ? 'Otel' : 'Ev'), 'primary', () => emAct({ type: 'build', i }), !mgmt || !!eb || v.phase === 'debt', eb || (emMoney(T.h))));
        bx.append(emBtn('− Sat', '', () => emAct({ type: 'sell', i }), !mgmt || !!es, es || ('+' + emMoney(T.h / 2))));
      }
      if (p.mo){ const e2 = EmlakCore.canUnmortgage(v, seat, i); bx.append(emBtn('İpotek kaldır ' + emMoney(EmlakCore.unmortgageCost(i)), '', () => emAct({ type: 'unmortgage', i }), !mgmt || !!e2 || v.phase === 'debt', e2)); }
      else { const e3 = EmlakCore.canMortgage(v, seat, i); bx.append(emBtn('İpotek +' + emMoney(T.price / 2), '', () => emAct({ type: 'mortgage', i }), !mgmt || !!e3, e3)); }
      row.append(bx); sec.append(row);
    });
    body.append(sec);
  });
  const j = v.P[seat].jcs.length;
  if (j) body.append(emEl('p', 'note', '🔑 Cezadan Çık kartın: ' + j));
}
function emPlayerSheet(ui, body, k){
  const v = ui.v, P = v.P[k];
  body.append(emEl('div', 'em-ps', '<div class="em-pl-av" style="' + EmPawns.colorVars(k) + '">' + EmPawns.ICON[k] + '</div><div><b>' + emEsc(emName(ui, k)) + '</b><br><span class="note">' + EmPawns.NAMES[k] + ' · nakit ' + emMoney(P.m) + ' · toplam servet ' + emMoney(EmlakCore.netWorth(v, k)) + '</span></div>'));
  const props = EmlakCore.own(v, k);
  const list = emEl('div', 'em-pp');
  list.innerHTML = props.length ? props.map(i => { const T = EmlakCore.TILES[i]; const col = T.g ? EmlakCore.GRP[T.g].c : T.k === 'rail' ? '#69727d' : '#d9c85e'; return '<span class="em-pc" style="--tc:' + col + '">' + emEsc(T.n) + (v.pr[i].h ? ' · ' + (v.pr[i].h === 5 ? 'otel' : v.pr[i].h + ' ev') : '') + (v.pr[i].mo ? ' · ipotekli' : '') + '</span>'; }).join('') : '<span class="note">Hiç tapusu yok.</span>';
  body.append(list);
  if (k !== ui.seat && ui.seat >= 0 && !P.bk && v.phase !== 'over') body.append(emBtn('🤝 Takas teklif et', 'primary', () => { ui.draft = { to: k, gc: 0, wc: 0, gp: [], wp: [], gj: 0, wj: 0 }; ui.modal = { type: 'trade', to: k }; emPaint(ui); }));
}
function emTradePick(ui, body){
  const v = ui.v;
  body.append(emEl('p', 'note', 'Takas yapmak istediğin oyuncuyu seç. (Evli setlerde önce yapılar satılmalı.)'));
  [0, 1, 2, 3, 4, 5].filter(k => v.P[k].on && !v.P[k].bk && k !== ui.seat).forEach(k => {
    const b = emBtn(EmPawns.ICON[k] + ' ' + emName(ui, k), '', () => { ui.draft = { to: k, gc: 0, wc: 0, gp: [], wp: [], gj: 0, wj: 0 }; ui.modal = { type: 'trade', to: k }; emPaint(ui); });
    b.classList.add('em-pick'); body.append(b);
  });
}
function emTradeForm(ui, body, to){
  const v = ui.v, me_ = ui.seat, d = ui.draft || (ui.draft = { to, gc: 0, wc: 0, gp: [], wp: [], gj: 0, wj: 0 });
  const col = (title, who, cashKey, propKey, jcKey) => {
    const c = emEl('div', 'em-tcol');
    c.append(emEl('b', '', title));
    const cash = emEl('input'); cash.type = 'number'; cash.min = 0; cash.inputMode = 'numeric'; cash.placeholder = '₺ nakit'; cash.value = d[cashKey] || '';
    cash.oninput = () => { d[cashKey] = Math.max(0, Math.floor(+cash.value || 0)); };
    c.append(cash);
    EmlakCore.own(v, who).forEach(i => {
      const T = EmlakCore.TILES[i];
      const col2 = T.g ? EmlakCore.GRP[T.g].c : T.k === 'rail' ? '#69727d' : '#d9c85e';
      const lab = emEl('label', 'em-tchk'); lab.style.setProperty('--tc', col2);
      const cb = emEl('input'); cb.type = 'checkbox'; cb.checked = d[propKey].includes(i);
      cb.onchange = () => { d[propKey] = cb.checked ? [...d[propKey], i] : d[propKey].filter(x => x !== i); };
      lab.append(cb, emEl('span', '', emEsc(T.n) + (v.pr[i].mo ? ' (ipotekli)' : '')));
      c.append(lab);
    });
    if (v.P[who].jcs.length){
      const lab = emEl('label', 'em-tchk'); const cb = emEl('input'); cb.type = 'checkbox'; cb.checked = d[jcKey] > 0;
      cb.onchange = () => { d[jcKey] = cb.checked ? 1 : 0; };
      lab.append(cb, emEl('span', '', '🔑 Cezadan Çık kartı')); c.append(lab);
    }
    return c;
  };
  const cols = emEl('div', 'em-tcols');
  cols.append(col('Sen verirsin', me_, 'gc', 'gp', 'gj'), col(emName(ui, to) + ' verir', to, 'wc', 'wp', 'wj'));
  body.append(cols);
  const err = emEl('p', 'em-terr');
  body.append(err);
  body.append(emBtn('Teklifi gönder', 'primary', () => {
    const t = { f: me_, to, gc: d.gc, wc: d.wc, gp: d.gp, wp: d.wp, gj: d.gj, wj: d.wj };
    const e = EmlakCore.tradeCheck(v, t);
    if (e){ err.textContent = e; return; }
    emAct({ type: 'trade', to, gc: d.gc, wc: d.wc, gp: d.gp, wp: d.wp, gj: d.gj, wj: d.wj });
    emClose(ui);
  }));
}
function emOverSheet(ui, body){
  const v = ui.v;
  const rank = EmlakCore.alive(v).concat([0, 1, 2, 3, 4, 5].filter(k => v.P[k].on && v.P[k].bk)).sort((a, b) => (v.P[a].bk - v.P[b].bk) || EmlakCore.netWorth(v, b) - EmlakCore.netWorth(v, a));
  body.append(emEl('div', 'em-win', emOverText(ui)));
  rank.forEach((k, q) => body.append(emEl('div', 'em-rk', '<span>' + (q + 1) + '.</span><b style="color:' + emColor(k) + '">' + emEsc(emName(ui, k)) + '</b><i>' + (v.P[k].bk ? 'İflas etti' : emMoney(EmlakCore.netWorth(v, k)) + ' servet') + '</i>')));
  if (ui.s.owner === peer.id) body.append(emBtn('↻ Yeni oyun', 'primary', () => { emClose(ui); emAct({ type: 'newMatch' }); }));
}
