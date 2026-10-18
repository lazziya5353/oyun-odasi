// Tek Kart çizimi: yeşil çuha masa, rakipler masanın çevresinde, ortada deste ve yerdeki kartlar, altta yelpaze el.
// Kart dağıtma / atma / çekme animasyonları, renk seçici, Joker +4 itirazı, TEK! ve Yakala! düğmeleri, el sonu tablosu.
// Kurallar tekkart-core.js'te; burası yalnızca gelen görünümü çizer ve hamleleri tableAct ile gönderir.
const TK_COL = { r: '#e0262f', y: '#f2bd00', g: '#2b9f48', b: '#1d6bd1', w: '#16181d' };
const TK_COL_AD = { r: 'Kırmızı', y: 'Sarı', g: 'Yeşil', b: 'Mavi' };
const tkUIs = new Map();
const tkEl = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const tkEsc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tkSleep = ms => new Promise(r => setTimeout(r, ms));
const tkName = (ui, k) => (ui.v.names && ui.v.names[k]) || ('Oyuncu ' + (k + 1));
const tkSeatCol = k => ['#ff8f6b', '#7aa2ff', '#5ee0b5', '#f7d36a', '#d38cff', '#ff7ab6'][k % 6];

// ---------- kart yüzleri ----------
const TK_SVG = {
  skip: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-width="6"/><path d="M10 30 L30 10" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>',
  rev: '<svg viewBox="0 0 40 40"><path d="M9 22 V16 Q9 10 15 10 H25 V5 L34 13 L25 21 V16 H15 V22 Z" fill="currentColor"/><path d="M31 18 V24 Q31 30 25 30 H15 V35 L6 27 L15 19 V24 H25 V18 Z" fill="currentColor"/></svg>',
  d2: '<svg viewBox="0 0 40 40"><rect x="7" y="5" width="16" height="23" rx="3" fill="currentColor" stroke="#fff" stroke-width="2"/><rect x="17" y="12" width="16" height="23" rx="3" fill="currentColor" stroke="#fff" stroke-width="2"/></svg>',
  wd4: '<svg viewBox="0 0 40 40"><rect x="4" y="13" width="11" height="16" rx="2" fill="' + TK_COL.b + '" stroke="#fff" stroke-width="1.5"/><rect x="11" y="6" width="11" height="16" rx="2" fill="' + TK_COL.y + '" stroke="#fff" stroke-width="1.5"/><rect x="18" y="18" width="11" height="16" rx="2" fill="' + TK_COL.g + '" stroke="#fff" stroke-width="1.5"/><rect x="25" y="11" width="11" height="16" rx="2" fill="' + TK_COL.r + '" stroke="#fff" stroke-width="1.5"/></svg>'
};
function tkFace(id){
  const k = TekKartCore.DECK[id];
  const col = TK_COL[k.c];
  let big, corner;
  if (k.v === 'skip'){ big = TK_SVG.skip; corner = TK_SVG.skip; }
  else if (k.v === 'rev'){ big = TK_SVG.rev; corner = TK_SVG.rev; }
  else if (k.v === 'd2'){ big = TK_SVG.d2; corner = '+2'; }
  else if (k.v === 'wild'){ big = ''; corner = '<i class="tk-wdot"></i>'; }
  else if (k.v === 'wd4'){ big = TK_SVG.wd4; corner = '+4'; }
  else { big = k.v; corner = k.v; }
  const num = /^\d$/.test(k.v);
  const ul = num && (k.v === '6' || k.v === '9') ? ' ul' : '';
  return '<div class="tk-in" style="--kc:' + col + '">' +
    '<span class="tk-ov' + (k.c === 'w' ? ' wild' : '') + '"></span>' +
    '<span class="tk-big' + (num ? ' num' : ' sym') + ul + (k.v === 'wd4' ? ' wd4' : '') + '">' + big + '</span>' +
    '<span class="tk-cn tl' + (num ? ' num' : '') + ul + '">' + corner + '</span><span class="tk-cn br' + (num ? ' num' : '') + ul + '">' + corner + '</span></div>';
}
const TK_BACK = '<div class="tk-in back"><span class="tk-ov back"></span><span class="tk-logo"><b>TEK</b><i>KART</i></span></div>';
function tkCard(id, cls){
  const e = tkEl('div', 'tkc' + (cls ? ' ' + cls : ''));
  if (id === null || id === undefined || id < 0){ e.classList.add('back'); e.innerHTML = TK_BACK; return e; }
  e.dataset.id = id;
  e.innerHTML = tkFace(id);
  e.title = TekKartCore.cardName(id);
  return e;
}
// her kartın yerdeki eğikliği sabit olsun (aynı kart hep aynı açıyla durur)
const tkTilt = id => ((id * 7919) % 31) - 15;
const tkOff = id => [((id * 131) % 13) - 6, ((id * 71) % 11) - 5];

function tkState(id){
  let u = tkUIs.get(id);
  if (!u){ u = { id, vis: null, eid: -1, gameNo: 0, evq: [], running: false, busy: false, deadline: 0, pick: null, logOpen: false, roundShown: 0 }; tkUIs.set(id, u); }
  return u;
}
const tkVisFrom = v => ({ n: v.P.map(p => p.n), hand: v.P[v.me] && v.P[v.me].hand ? v.P[v.me].hand.slice() : [], disc: v.discTop.slice(), col: v.col, dir: v.dir, turn: v.turn, drawN: v.drawN, said: v.P.map(p => p.said), score: v.P.map(p => p.score) });

// ================== kurulum ==================
function renderTekKart(body, s, lv){
  const v = lv.v, seat = lv.seat;
  const ui = tkState(s.id);
  ui.s = s; ui.v = v; ui.seat = seat; ui.me = seat >= 0 ? seat : (v.P.findIndex(p => p.on));
  let root = body.querySelector('.tk');
  if (!root || root.dataset.tid !== s.id){
    body.innerHTML = '';
    root = tkBuild(ui); body.append(root);
    ui.root = root; ui.vis = null; ui.eid = -1;
  }
  ui.root = root;
  ui.deadline = v.left ? Date.now() + v.left : 0;
  if (ui.gameNo !== (v.gameNo || 1)){ ui.vis = null; ui.eid = -1; ui.evq = []; ui.gameNo = v.gameNo || 1; ui.roundShown = 0; }
  if (!ui.vis){
    ui.vis = tkVisFrom(v); ui.eid = v.eid;
    const deal = v.ev.find(e => e.t === 'deal');
    if (deal && v.eid <= 2 && !reducedMotion()){ ui.eid = v.eid; tkDealStart(ui, v, deal); }
  }
  if (v.eid > ui.eid){
    const gap = v.eid - ui.eid;
    if (gap > 3 || reducedMotion() || !v.ev.length){ ui.eid = v.eid; if (!ui.running) ui.vis = tkVisFrom(v); }
    else { ui.eid = v.eid; ui.evq.push(...v.ev.map(e => Object.assign({}, e))); if (!ui.running) tkRun(ui); }
  } else if (!ui.running && !ui.evq.length) ui.vis = tkVisFrom(v);
  tkFit(ui);
  tkPaint(ui);
}
function tkDealStart(ui, v, deal){
  // dağıtımdan önceki hâl: eller boş, yerde kart yok
  ui.vis.n = v.P.map(() => 0); ui.vis.hand = []; ui.vis.disc = [];
  ui.evq.push(Object.assign({}, deal));
  setTimeout(() => tkRun(ui), 200);
}

function tkBuild(ui){
  const root = tkEl('div', 'tk');
  root.dataset.tid = ui.s.id;
  root.innerHTML =
    '<div class="tk-top"><span class="tk-turn"></span><span class="tk-timer"></span><span class="tk-sp"></span><span class="tk-target"></span><button type="button" class="btn small tk-logbtn" title="Oyun günlüğü">📜 <span class="lbl">Günlük</span></button></div>' +
    '<div class="tk-felt">' +
      '<div class="tk-opps"></div>' +
      '<div class="tk-mid">' +
        '<div class="tk-dirring"><svg viewBox="0 0 200 200"><defs><marker id="tkar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>' +
          '<path d="M 100 12 A 88 88 0 0 1 188 100" fill="none" stroke="currentColor" stroke-width="7" marker-end="url(#tkar)" stroke-linecap="round"/>' +
          '<path d="M 100 188 A 88 88 0 0 1 12 100" fill="none" stroke="currentColor" stroke-width="7" marker-end="url(#tkar)" stroke-linecap="round"/></svg></div>' +
        '<div class="tk-deck" title="Kart çek"><div class="tk-deckstack"></div><span class="tk-deckn"></span></div>' +
        '<div class="tk-pile"><div class="tk-pilecards"></div><span class="tk-colname"></span></div>' +
      '</div>' +
      '<div class="tk-me"><div class="tk-mebar"></div><div class="tk-hand"></div><div class="tk-actions"></div></div>' +
      '<div class="tk-modal" hidden></div>' +
      '<div class="tk-log" hidden></div>' +
    '</div><div class="tk-fx"></div>';
  root.querySelector('.tk-deck').onclick = () => { const v = ui.v; if (!ui.busy && v.turn === ui.seat && v.phase === 'play') tableAct({ type: 'draw' }); };
  root.querySelector('.tk-logbtn').onclick = () => { ui.logOpen = !ui.logOpen; tkPaintLog(ui); };
  if (typeof ResizeObserver === 'function'){
    const ro = new ResizeObserver(() => requestAnimationFrame(() => { if (root.isConnected && ui.vis){ tkFit(ui); tkPaintOpps(ui); tkPaintHand(ui, true); } }));
    ro.observe(root);
  }
  ui.timerIv = setInterval(() => { if (!root.isConnected){ clearInterval(ui.timerIv); return; } tkTick(ui); }, 500);
  return root;
}

// yüksekliği ekrana sığdır, kart boyunu ve masadaki yerleri hesapla
function tkFit(ui){
  const root = ui.root; if (!root || !root.isConnected) return;
  const deck = root.closest('.deck') || root.parentElement;
  const shell = root.closest('.game-shell');
  // üst çubuk (Masadan kalk vb. düğmeler sonradan eklenince) boyu değişirse yeniden sığdır
  const gbar = shell && shell.querySelector('.gs-bar');
  if (gbar && ui.barEl !== gbar && typeof ResizeObserver === 'function'){ ui.barEl = gbar; new ResizeObserver(() => requestAnimationFrame(() => { if (root.isConnected) tkFit(ui); })).observe(gbar); }
  const narrow = window.matchMedia('(max-width:760px)').matches;
  const dh = deck ? deck.clientHeight : 800;
  const barH = shell && shell.querySelector('.gs-bar') ? shell.querySelector('.gs-bar').offsetHeight + 10 : 0;
  // telefonda sayfa kayar: oyun alanı ekran boyunda olsun (alttaki çubuk ve başlık payı düşülür)
  const h = narrow ? Math.max(560, window.innerHeight - 130) : Math.max(480, dh - barH - 4);
  root.style.setProperty('--tkh', h + 'px');
  const w = root.clientWidth || 900;
  root.classList.toggle('cmp', w < 1100);
  const topH = (root.querySelector('.tk-top') || {}).offsetHeight || 44;
  const H = h - topH - 8;                              // masa yüksekliği
  const m = ui.v ? ui.v.P.filter(p => p.on).length - 1 : 3;
  const rows = narrow && m >= 4 ? 2 : 1;
  const oppH = rows * 92;                               // üstteki rakip sırası(ları)
  // dikey bütçe: rakipler + orta (deste ~1.75 kart) + benim tarafım (~1.5 kart + 112px)
  const cwH = (H - oppH - 112 - 46) / 3.7;
  const cw = Math.round(Math.max(44, Math.min(96, cwH, w / (narrow ? 6.2 : 10.5))));
  root.style.setProperty('--cw', cw + 'px');
  ui.cw = cw;
  const meH = cw * 1.5 + 112;
  const A = H - meH;                                    // rakipler + ortanın alanı
  const midH = cw * 1.75 + 24;
  const midY = Math.round(Math.min(A - midH / 2 - 6, Math.max(oppH + 6 + cw * 0.45 + midH / 2, (oppH + A) / 2)));
  ui.lay = { A, midY, topY: 46, row2Y: 46 + 92, narrow, oppH };
  root.style.setProperty('--midy', midY + 'px');
  root.style.setProperty('--oppa', A + 'px');
}

// ================== çizim ==================
function tkPaint(ui){
  const root = ui.root, v = ui.v, vis = ui.vis;
  if (!root || !v || !vis) return;
  root.classList.toggle('busy', ui.busy);
  root.classList.toggle('spect', ui.seat < 0);
  tkPaintTop(ui);
  tkPaintOpps(ui);
  tkPaintMid(ui);
  tkPaintMeBar(ui);
  tkPaintHand(ui);
  tkPaintActions(ui);
  tkPaintModal(ui);
  tkPaintLog(ui);
}
function tkTxt(ui, tx){ return tkEsc(tx).replace(/@(\d)/g, (m, d) => '<b style="color:' + tkSeatCol(+d) + '">' + tkEsc(tkName(ui, +d)) + '</b>'); }
function tkTick(ui){
  const el = ui.root.querySelector('.tk-timer'); if (!el) return;
  if (!ui.deadline || ui.busy || ui.v.phase === 'over'){ el.textContent = ''; return; }
  const left = Math.max(0, Math.round((ui.deadline - Date.now()) / 1000));
  el.textContent = (ui.v.phase === 'roundover' ? '⏭ Yeni el ' : '⏱ ') + String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
  el.classList.toggle('warn', left <= 10 && ui.v.phase !== 'roundover');
  const rc = ui.root.querySelector('.tk-rcount'); if (rc) rc.textContent = left ? left + ' sn sonra yeni el' : 'Yeni el başlıyor…';
}
function tkPaintTop(ui){
  const v = ui.v, el = ui.root.querySelector('.tk-turn');
  const t = ui.busy ? ui.vis.turn : v.turn;
  let h;
  if (v.phase === 'over') h = '🏆 Oyun bitti';
  else if (v.phase === 'roundover') h = '🏁 El bitti';
  else {
    const mine = t === ui.seat;
    const ph = { play: mine ? 'kart at ya da çek' : 'oynuyor', drawn: mine ? 'çektiğin kartı oyna ya da tut' : 'çektiği kartı düşünüyor', color: mine ? 'renk seç' : 'renk seçiyor', challenge: mine ? 'Joker +4: itiraz et ya da kabul et' : '+4 kararını veriyor' }[v.phase] || '';
    h = (mine ? '<b class="me">Sıra sende</b>' : 'Sıra <b style="color:' + tkSeatCol(t) + '">' + tkEsc(tkName(ui, t)) + '</b>\'de') + (ph ? ' · <span class="note">' + ph + '</span>' : '');
  }
  if (el._h !== h){ el._h = h; el.innerHTML = h; }
  const tg = ui.root.querySelector('.tk-target');
  const tt = v.opts.target ? '🎯 ' + v.opts.target + ' puana kadar · ' + v.round + '. el' : 'Tek el';
  if (tg.textContent !== tt) tg.textContent = tt;
  tkTick(ui);
}
// rakiplerin masadaki yerleri (ben alttayım; sıradaki solumda, sonra üstten sağa)
// x yüzde, y piksel (masanın üstünden)
function tkOppPos(m, i, L){
  if (L.narrow && m >= 3){
    // telefonda: rakipler üstte bir ya da iki sıra
    const r1 = m <= 3 ? m : Math.ceil(m / 2);
    if (i < r1) return { x: (i + 0.5) * 100 / r1, y: L.topY };
    const r2 = m - r1, j = i - r1;
    return { x: (j + 0.5) * 100 / r2, y: L.row2Y };
  }
  // masanın çevresinde yay: yanlardakiler ortanın hizasında, üsttekiler en üstte
  // 4 ve daha fazla rakipte yay daha yayvan: komşular farklı yükseklikte durur, üst üste binmez
  const th = m >= 4 ? Math.PI * (1 + (0.085 + 0.83 * i / (m - 1))) : Math.PI + (i + 1) * Math.PI / (m + 1);
  const up = -Math.sin(th);
  const rx = L.narrow ? 34 : 41;
  return { x: 50 + rx * Math.cos(th), y: L.midY - (L.midY - L.topY) * up };
}
function tkOrder(ui){
  const v = ui.v, list = [];
  for (let q = 1; q < 6; q++){ const k = (ui.me + q) % 6; if (v.P[k].on) list.push(k); }
  return list;
}
function tkPaintOpps(ui){
  const v = ui.v, vis = ui.vis, box = ui.root.querySelector('.tk-opps');
  const ord = tkOrder(ui), m = ord.length;
  const t = ui.busy ? vis.turn : v.turn;
  const live = !['over', 'roundover'].includes(v.phase);
  ord.forEach((k, i) => {
    let el = box.querySelector('.tk-opp[data-s="' + k + '"]');
    if (!el){
      el = tkEl('div', 'tk-opp'); el.dataset.s = k;
      el.innerHTML = '<div class="tk-ofan"></div><div class="tk-oinfo"><span class="tk-av"></span><span class="tk-onm"></span><span class="tk-ocnt"></span></div><span class="tk-obadge"></span>';
      box.append(el);
    }
    const p = tkOppPos(m, i, ui.lay || { narrow: false, topY: 46, midY: 200, row2Y: 138 });
    el.style.left = p.x + '%'; el.style.top = p.y + 'px';
    el.classList.toggle('turn', live && t === k);
    el.classList.toggle('next', live && v.turn !== k && TekKartCore.nextOf({ P: v.P.map(x => ({ on: x.on })), dir: v.dir }, t, v.dir) === k);
    const n = vis.n[k];
    const fan = el.querySelector('.tk-ofan');
    fan.dataset.n = n;
    const show = Math.min(n, 12);
    if (fan._n !== show){
      fan._n = show; fan.innerHTML = '';
      for (let q = 0; q < show; q++){
        const c = tkCard(-1, 'mini');
        const a = (q - (show - 1) / 2) * Math.min(8, 60 / Math.max(show, 1));
        c.style.transform = 'translateX(' + ((q - (show - 1) / 2) * Math.min(10, 80 / Math.max(show, 1))) + 'px) rotate(' + a + 'deg)';
        fan.append(c);
      }
    }
    const av = el.querySelector('.tk-av');
    const nm = tkName(ui, k);
    av.textContent = (nm.replace(/^Bot /, '')[0] || '?').toLocaleUpperCase('tr-TR'); av.style.background = tkSeatCol(k);
    const bot = ui.s.seats[k] && ui.s.seats[k].bot;
    el.querySelector('.tk-onm').textContent = nm + (bot ? ' 🤖' : '');
    el.querySelector('.tk-ocnt').textContent = n + ' kart' + (v.opts.target ? ' · ' + vis.score[k] + ' puan' : '');
    const bd = el.querySelector('.tk-obadge');
    const b = n === 1 && vis.said[k] ? 'TEK!' : '';
    if (bd.textContent !== b){ bd.textContent = b; bd.classList.toggle('on', !!b); }
  });
  box.querySelectorAll('.tk-opp').forEach(e => { if (!ord.includes(+e.dataset.s)) e.remove(); });
}
function tkPaintMid(ui){
  const vis = ui.vis, v = ui.v, root = ui.root;
  root.style.setProperty('--cur', TK_COL[vis.col] || '#888');
  const ring = root.querySelector('.tk-dirring');
  ring.classList.toggle('ccw', vis.dir < 0);
  // deste
  const st = root.querySelector('.tk-deckstack');
  const dn = Math.min(6, Math.ceil(vis.drawN / 18));
  if (st._n !== dn){ st._n = dn; st.innerHTML = ''; for (let q = 0; q < Math.max(1, dn); q++){ const c = tkCard(-1); c.style.transform = 'translate(' + (-q * 1.5) + 'px,' + (-q * 2) + 'px)'; st.append(c); } }
  root.querySelector('.tk-deckn').textContent = vis.drawN;
  const myDraw = !ui.busy && v.turn === ui.seat && v.phase === 'play';
  root.querySelector('.tk-deck').classList.toggle('can', myDraw);
  // yerdeki kartlar
  const pc = root.querySelector('.tk-pilecards');
  const key = vis.disc.join(',');
  if (pc._k !== key){
    pc._k = key; pc.innerHTML = '';
    vis.disc.slice(-5).forEach(id => {
      const c = tkCard(id);
      const o = tkOff(id);
      c.style.transform = 'translate(' + o[0] + 'px,' + o[1] + 'px) rotate(' + tkTilt(id) + 'deg)';
      pc.append(c);
    });
  }
  const top = vis.disc[vis.disc.length - 1];
  const wildTop = top !== undefined && TekKartCore.DECK[top].c === 'w';
  const cn = root.querySelector('.tk-colname');
  const t = vis.col ? (wildTop ? 'Renk: ' : '') + TK_COL_AD[vis.col] : '';
  if (cn.textContent !== t) cn.textContent = t;
  cn.classList.toggle('wild', wildTop);
}
function tkPaintMeBar(ui){
  const v = ui.v, vis = ui.vis, bar = ui.root.querySelector('.tk-mebar');
  if (ui.seat < 0){ bar.innerHTML = '<span class="note">Oyunu izliyorsun.</span>'; return; }
  const live = !['over', 'roundover'].includes(v.phase);
  const t = ui.busy ? vis.turn : v.turn;
  const h = '<span class="tk-av" style="background:' + tkSeatCol(ui.seat) + '">' + tkEsc((tkName(ui, ui.seat).replace(/^Bot /, '')[0] || '?').toLocaleUpperCase('tr-TR')) + '</span><b>' + tkEsc(tkName(ui, ui.seat)) + ' (sen)</b>' +
    '<span class="note">' + vis.hand.length + ' kart' + (v.opts.target ? ' · ' + vis.score[ui.seat] + ' puan' : '') + '</span>' +
    (live && t === ui.seat ? '<span class="tk-myturn">Sıra sende</span>' : '') + (vis.hand.length === 1 && vis.said[ui.seat] ? '<span class="tk-obadge on">TEK!</span>' : '');
  if (bar._h !== h){ bar._h = h; bar.innerHTML = h; }
  bar.parentElement.classList.toggle('turn', live && t === ui.seat);
}
// eldeki kartlar: yelpaze
function tkPaintHand(ui, force){
  const v = ui.v, vis = ui.vis, box = ui.root.querySelector('.tk-hand');
  if (!box) return;
  if (ui.seat < 0){ box.innerHTML = ''; return; }
  // kartları renge ve sayıya göre sırala
  const D = TekKartCore.DECK, ordC = { r: 0, y: 1, g: 2, b: 3, w: 4 }, ordV = v2 => /^\d$/.test(v2) ? +v2 : { skip: 10, rev: 11, d2: 12, wild: 13, wd4: 14 }[v2];
  const hand = vis.hand.slice().sort((a, b) => (ordC[D[a].c] - ordC[D[b].c]) || (ordV(D[a].v) - ordV(D[b].v)) || a - b);
  const can = new Set(!ui.busy && v.turn === ui.seat ? (v.playable || []) : []);
  const key = hand.join(',') + '|' + [...can].join(',') + '|' + ui.cw + '|' + box.clientWidth + '|' + (ui.pick || '');
  if (box._k === key && !force) return;
  box._k = key;
  const W = box.clientWidth || 600, cw = ui.cw || 80, n = hand.length;
  const step = n > 1 ? Math.max(cw * 0.18, Math.min(cw * 0.72, (W - cw * 1.85) / (n - 1))) : 0;
  const total = cw + step * Math.max(0, n - 1);
  const x0 = (W - total) / 2;
  const have = new Map(); box.querySelectorAll('.tkc').forEach(e => have.set(+e.dataset.id, e));
  hand.forEach((id, i) => {
    let c = have.get(id);
    if (!c){ c = tkCard(id, 'hand'); c.onclick = () => tkClickCard(ui, id); box.append(c); }
    have.delete(id);
    const mid = (n - 1) / 2, off = i - mid;
    const rot = n > 1 ? off * Math.min(4, 40 / n) : 0;
    const y = Math.abs(off) * Math.abs(off) * Math.min(1.6, 22 / Math.max(n, 1));
    c.style.left = (x0 + i * step) + 'px';
    c.style.setProperty('--r', rot + 'deg'); c.style.setProperty('--y', y + 'px');
    c.style.zIndex = 10 + i;
    c.classList.toggle('can', can.has(id));
    c.classList.toggle('dim', !ui.busy && v.turn === ui.seat && (v.phase === 'play' || v.phase === 'drawn') && !can.has(id));
    c.classList.toggle('pick', ui.pick === id);
  });
  have.forEach(e => e.remove());
}
function tkClickCard(ui, id){
  const v = ui.v;
  if (ui.busy || v.turn !== ui.seat || !(v.playable || []).includes(id)) return;
  const k = TekKartCore.DECK[id];
  if (k.c === 'w'){ ui.pick = id; ui.modal = 'color'; tkPaint(ui); return; }
  tkSend(ui, { type: 'play', card: id });
}
function tkSend(ui, a){
  if (a.type === 'play' && ui.tekArm && ui.vis.hand.length === 2) a.tek = true;
  ui.tekArm = false; ui.pick = null; ui.modal = null;
  tableAct(a);
}
function tkPaintActions(ui){
  const v = ui.v, vis = ui.vis, box = ui.root.querySelector('.tk-actions');
  const mine = ui.seat >= 0 && v.turn === ui.seat && !ui.busy;
  const sig = [v.eid, v.phase, mine, ui.busy, v.tek, vis.hand.length, ui.tekArm, vis.said[ui.seat]].join('|');
  if (box._sig === sig) return;
  box._sig = sig; box.innerHTML = '';
  if (ui.seat < 0 || ['over', 'roundover'].includes(v.phase)) return;
  const add = (label, cls, fn, title) => { const b = tkEl('button', 'btn ' + (cls || ''), label); b.type = 'button'; if (title) b.title = title; b.onclick = fn; box.append(b); return b; };
  // TEK! düğmesi: 2 kartla sıran gelince (atmadan önce bas) ya da tek kart kalıp söylemediysen
  const vulnerable = v.tek === ui.seat && vis.hand.length === 1;
  if (!ui.busy && (vulnerable || (mine && vis.hand.length === 2 && (v.phase === 'play' || v.phase === 'drawn') && (v.playable || []).length))){
    const b = add('📣 TEK!', 'tk-tekbtn' + (ui.tekArm || vis.said[ui.seat] ? ' armed' : ''), () => {
      if (vulnerable){ tableAct({ type: 'tek' }); return; }
      ui.tekArm = !ui.tekArm; tkPaint(ui);
    }, 'Sondan bir önceki kartını atarken TEK! demelisin; yoksa yakalanırsan 2 kart çekersin.');
    if (ui.tekArm) b.textContent = '📣 TEK! hazır';
  }
  // yakala: TEK demeyen rakip
  if (!ui.busy && v.tek >= 0 && v.tek !== ui.seat){
    add('🚨 Yakala: ' + tkName(ui, v.tek) + ' TEK demedi!', 'tk-catch', () => tableAct({ type: 'catch' }));
  }
  if (!mine) return;
  if (v.phase === 'play'){
    add('🂠 Kart çek', 'tk-draw', () => tableAct({ type: 'draw' }));
  } else if (v.phase === 'drawn'){
    const id = v.drawn;
    if (id >= 0){
      add('▶ Çektiğini oyna', 'primary', () => tkClickCard(ui, id));
      add('✋ Elde tut', '', () => tableAct({ type: 'keep' }));
    }
  }
}
function tkPaintModal(ui){
  const v = ui.v, box = ui.root.querySelector('.tk-modal');
  let key = '', html = '';
  const mine = ui.seat >= 0 && v.turn === ui.seat && !ui.busy;
  if (mine && ui.modal === 'color' && ui.pick !== null && (v.playable || []).includes(ui.pick)) key = 'color:' + ui.pick;
  else if (mine && v.phase === 'color') key = 'color0';
  else if (mine && v.phase === 'challenge') key = 'chal:' + v.eid;
  else if (!ui.busy && v.phase === 'roundover') key = 'round:' + v.round + ':' + v.eid;
  else if (!ui.busy && v.phase === 'over' && !ui.overClosed) key = 'over:' + v.eid + ':' + (ui.s.owner === peer.id);
  if (key !== 'color:' + ui.pick && ui.modal === 'color' && !key.startsWith('color')) ui.modal = null;
  if (box._k === key) return;
  box._k = key;
  if (!key){ box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  if (key.startsWith('color')){
    html = '<div class="tk-sheet"><h3>🎨 Renk seç</h3><p class="note">' + (key === 'color0' ? 'Yerdeki ilk kart Joker: oyun hangi renkle başlasın?' : 'Jokerden sonra oyun hangi renkle devam etsin?') + '</p><div class="tk-cols">' +
      ['r', 'y', 'g', 'b'].map(c => '<button type="button" class="tk-colbtn" data-c="' + c + '" style="--kc:' + TK_COL[c] + '">' + TK_COL_AD[c] + '</button>').join('') + '</div>' +
      (key === 'color0' ? '' : '<button type="button" class="btn small" data-x>Vazgeç</button>') + '</div>';
    box.innerHTML = html;
    box.querySelectorAll('.tk-colbtn').forEach(b => b.onclick = () => {
      if (key === 'color0'){ ui.modal = null; tableAct({ type: 'color', col: b.dataset.c }); return; }
      tkSend(ui, { type: 'play', card: ui.pick, col: b.dataset.c });
    });
    const x = box.querySelector('[data-x]'); if (x) x.onclick = () => { ui.modal = null; ui.pick = null; box._k = ''; tkPaint(ui); };
    return;
  }
  if (key.startsWith('chal')){
    const by = v.pend ? v.pend.by : -1;
    box.innerHTML = '<div class="tk-sheet"><h3>Joker +4 sana geldi</h3><p>' + tkTxt(ui, '@' + by) + ' sana Joker +4 attı ve rengi <b style="color:' + TK_COL[v.col] + '">' + TK_COL_AD[v.col] + '</b> yaptı.</p>' +
      '<p class="note">Joker +4 yalnızca elinde yerdeki renkten kart yokken atılabilir. Kuralsız attığını düşünüyorsan itiraz et: haklıysan 4 kartı o çeker ve sen oynarsın; haksızsan sen 6 kart çekersin.</p>' +
      '<div class="tk-sbtns"><button type="button" class="btn" data-a="no">Kabul et (4 kart çek)</button><button type="button" class="btn primary" data-a="yes">⚖️ İtiraz et</button></div></div>';
    box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => tableAct({ type: 'challenge', yes: b.dataset.a === 'yes' }));
    return;
  }
  if (key.startsWith('round') || key.startsWith('over')){
    const over = v.phase === 'over', w = over ? v.win : v.rwin;
    const rows = v.P.map((p, k) => p.on ? { k, sc: p.score } : null).filter(Boolean).sort((a, b) => b.sc - a.sc);
    const hands = v.rhands || ui.lastHands || [];
    html = '<div class="tk-sheet wide"><h3>' + (over ? '🏆 ' + (w === ui.seat ? 'Kazandın!' : tkEsc(tkName(ui, w)) + ' kazandı!') : '🏁 ' + tkEsc(tkName(ui, w)) + ' elini bitirdi') + '</h3>' +
      '<p>' + (v.rpts ? 'Rakiplerin elinde kalan kartlardan <b>' + v.rpts + ' puan</b> aldı.' : 'Herkesin elindeki kartlar sayıldı.') + '</p>' +
      '<div class="tk-rtable">' + rows.map(r => '<div class="tk-rrow' + (r.k === w ? ' win' : '') + '"><span class="tk-av" style="background:' + tkSeatCol(r.k) + '">' + tkEsc((tkName(ui, r.k).replace(/^Bot /, '')[0] || '?').toLocaleUpperCase('tr-TR')) + '</span><b>' + tkEsc(tkName(ui, r.k)) + '</b>' +
        '<span class="tk-rhand">' + (hands[r.k] || []).map(id => '<i class="tk-chip" style="--kc:' + TK_COL[TekKartCore.DECK[id].c] + '">' + tkEsc(tkShort(id)) + '</i>').join('') + '</span>' +
        (v.opts.target ? '<span class="tk-rsc">' + r.sc + '</span>' : '') + '</div>').join('') + '</div>' +
      (over ? '<div class="tk-sbtns"><button type="button" class="btn" data-x>Kapat</button>' + (ui.s.owner === peer.id ? '<button type="button" class="btn primary" data-new>↻ Yeni oyun</button>' : '<span class="note">Yeni oyunu masa sahibi başlatır.</span>') + '</div>'
        : '<p class="note tk-rcount"></p><p class="note">Puanlar: sayılar kendi değeri, Pas · Yön · +2 = 20, Joker · Joker +4 = 50. ' + v.opts.target + ' puana ilk ulaşan kazanır.</p>') + '</div>';
    box.innerHTML = html;
    const x = box.querySelector('[data-x]'); if (x) x.onclick = () => { ui.overClosed = true; box._k = ''; tkPaint(ui); };
    const nw = box.querySelector('[data-new]'); if (nw) nw.onclick = () => { ui.overClosed = false; tableAct({ type: 'newMatch' }); };
    tkTick(ui);
  }
}
const tkShort = id => { const k = TekKartCore.DECK[id]; return { skip: '⊘', rev: '⇄', d2: '+2', wild: 'J', wd4: '+4' }[k.v] || k.v; };
function tkPaintLog(ui){
  const box = ui.root.querySelector('.tk-log'), v = ui.v;
  box.hidden = !ui.logOpen;
  if (!ui.logOpen) return;
  const lines = v.log.slice(-40).reverse();
  const k = lines.length + ':' + (lines[0] ? lines[0].id : 0);
  if (box._k === k) return;
  box._k = k;
  box.innerHTML = '<div class="tk-logh">Oyun günlüğü <button type="button" class="btn small" data-x>✕</button></div>' + lines.map(l => '<div class="tk-ll">' + tkTxt(ui, l.tx) + '</div>').join('');
  box.querySelector('[data-x]').onclick = () => { ui.logOpen = false; tkPaintLog(ui); };
}

// ================== animasyonlar ==================
function tkSeatRect(ui, k){
  if (k === ui.seat){ const h = ui.root.querySelector('.tk-hand'); return h.getBoundingClientRect(); }
  const o = ui.root.querySelector('.tk-opp[data-s="' + k + '"] .tk-ofan') || ui.root.querySelector('.tk-opp[data-s="' + k + '"]');
  return o ? o.getBoundingClientRect() : ui.root.getBoundingClientRect();
}
function tkFly(ui, id, from, to, opt){
  opt = opt || {};
  return new Promise(res => {
    if (reducedMotion() || !ui.root.isConnected){ res(); return; }
    const fx = ui.root.querySelector('.tk-fx');
    const c = tkCard(opt.back ? -1 : id, 'fly');
    fx.append(c);
    const cw = ui.cw || 80, ch = cw * 1.5;
    const fx0 = from.left + from.width / 2 - cw / 2, fy0 = from.top + from.height / 2 - ch / 2;
    const tx = to.left + to.width / 2 - cw / 2 + (opt.dx || 0), ty = to.top + to.height / 2 - ch / 2 + (opt.dy || 0);
    const r0 = opt.r0 || 0, r1 = opt.r1 || 0, s0 = opt.s0 || 1, s1 = opt.s1 || 1;
    const kf = [
      { transform: 'translate(' + fx0 + 'px,' + fy0 + 'px) rotate(' + r0 + 'deg) scale(' + s0 + ')' },
      { transform: 'translate(' + ((fx0 + tx) / 2) + 'px,' + (Math.min(fy0, ty) - 30) + 'px) rotate(' + ((r0 + r1) / 2 + (opt.spin || 0)) + 'deg) scale(' + (Math.max(s0, s1) * 1.08) + ')', offset: 0.5 },
      { transform: 'translate(' + tx + 'px,' + ty + 'px) rotate(' + r1 + 'deg) scale(' + s1 + ')' }
    ];
    const an = c.animate(kf, { duration: opt.ms || 420, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
    an.onfinish = () => { c.remove(); res(); };
  });
}
function tkFloat(ui, k, text, cls){
  if (reducedMotion()) return;
  const fx = ui.root.querySelector('.tk-fx');
  const r = k === null ? ui.root.querySelector('.tk-pile').getBoundingClientRect() : tkSeatRect(ui, k);
  const e = tkEl('div', 'tk-float ' + (cls || ''), tkEsc(text));
  e.style.left = (r.left + r.width / 2) + 'px'; e.style.top = (r.top + Math.min(r.height / 2, 40)) + 'px';
  fx.append(e);
  e.animate([{ opacity: 0, transform: 'translate(-50%,0) scale(.7)' }, { opacity: 1, transform: 'translate(-50%,-14px) scale(1.05)', offset: 0.2 }, { opacity: 1, transform: 'translate(-50%,-22px)', offset: 0.8 }, { opacity: 0, transform: 'translate(-50%,-40px)' }], { duration: 1500 }).onfinish = () => e.remove();
}
async function tkRun(ui){
  if (ui.running) return;
  ui.running = true; ui.busy = true;
  const root = ui.root;
  try { while (ui.evq.length){ if (!root.isConnected) break; await tkPlay(ui, ui.evq.shift()); } } catch(err){ console.error(err); }
  ui.running = false; ui.busy = false;
  if (root.isConnected){ ui.vis = tkVisFrom(ui.v); tkPaint(ui); }
}
async function tkPlay(ui, e){
  const vis = ui.vis, root = ui.root;
  const deckR = () => root.querySelector('.tk-deck').getBoundingClientRect();
  const pileR = () => root.querySelector('.tk-pilecards').getBoundingClientRect();
  switch (e.t){
    case 'deal': {
      ui.lastHands = null;
      vis.n = vis.n.map(() => 0); vis.hand = []; vis.disc = []; vis.said = vis.said.map(() => false);
      tkPaint(ui);
      const mine = (e.mine || []).slice();
      for (let q = 0; q < e.order.length; q++){
        const k = e.order[q];
        gameSound('tile');
        const p = tkFly(ui, -1, deckR(), tkSeatRect(ui, k), { back: true, ms: 260, s0: 1, s1: k === ui.seat ? 1 : 0.6 });
        if (q % 2 === 1 || q === e.order.length - 1) await p; else await tkSleep(60);
        vis.n[k]++;
        if (k === ui.seat && mine.length) vis.hand.push(mine.shift());
        tkPaintOpps(ui); tkPaintMeBar(ui); tkPaintHand(ui);
      }
      await tkSleep(150);
      await tkFly(ui, e.first, deckR(), pileR(), { ms: 450, r1: tkTilt(e.first), spin: 180 });
      vis.disc = [e.first];
      tkPaintMid(ui); gameSound('checker');
      await tkSleep(250);
      return;
    }
    case 'play': {
      vis.turn = e.s;
      let from;
      const hc = e.s === ui.seat ? root.querySelector('.tk-hand .tkc[data-id="' + e.card + '"]') : null;
      if (hc){ from = hc.getBoundingClientRect(); hc.style.visibility = 'hidden'; }
      else from = tkSeatRect(ui, e.s);
      gameSound('checker');
      await tkFly(ui, e.card, from, pileR(), { ms: 430, r0: e.s === ui.seat ? 0 : 180, r1: tkTilt(e.card), spin: 90, s0: e.s === ui.seat ? 1 : 0.6 });
      if (e.s === ui.seat){ const i = vis.hand.indexOf(e.card); if (i >= 0) vis.hand.splice(i, 1); }
      vis.n[e.s] = Math.max(0, vis.n[e.s] - 1);
      vis.disc.push(e.card); vis.col = e.col;
      vis.said[e.s] = !!e.tek;
      tkPaintMid(ui); tkPaintOpps(ui); tkPaintMeBar(ui); tkPaintHand(ui);
      const k = TekKartCore.DECK[e.card];
      if (k.c === 'w'){ tkFloat(ui, null, '🎨 ' + TK_COL_AD[e.col], 'col'); await tkSleep(450); }
      if (e.tek){ tkFloat(ui, e.s, '📣 TEK!', 'tek'); gameSound('turn'); await tkSleep(350); }
      await tkSleep(120);
      return;
    }
    case 'draw': {
      gameSound('tile');
      for (let q = 0; q < e.cards.length; q++){
        const id = e.cards[q];
        const p = tkFly(ui, id, deckR(), tkSeatRect(ui, e.s), { back: e.s !== ui.seat || id < 0, ms: 330, s1: e.s === ui.seat ? 1 : 0.6 });
        if (q === e.cards.length - 1) await p; else await tkSleep(110);
        vis.n[e.s]++; vis.drawN = Math.max(0, vis.drawN - 1);
        if (e.s === ui.seat && id >= 0) vis.hand.push(id);
        vis.said[e.s] = false;
        tkPaintOpps(ui); tkPaintMeBar(ui); tkPaintHand(ui); tkPaintMid(ui);
      }
      if (e.cards.length > 1) tkFloat(ui, e.s, '+' + e.cards.length + ' kart', 'bad');
      await tkSleep(120);
      return;
    }
    case 'skip': tkFloat(ui, e.s, '⊘ Pas geçti', 'bad'); await tkSleep(550); return;
    case 'rev': {
      vis.dir = e.dir; tkPaintMid(ui);
      const ring = root.querySelector('.tk-dirring');
      if (ring && !reducedMotion()) ring.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(' + (e.dir > 0 ? 360 : -360) + 'deg)' }], { duration: 650, easing: 'ease-in-out' });
      tkFloat(ui, null, '⇄ Yön değişti', 'col');
      await tkSleep(550); return;
    }
    case 'color': vis.col = e.col; tkPaintMid(ui); tkFloat(ui, null, '🎨 ' + TK_COL_AD[e.col], 'col'); await tkSleep(500); return;
    case 'tek': vis.said[e.s] = true; tkFloat(ui, e.s, '📣 TEK!', 'tek'); gameSound('turn'); tkPaintOpps(ui); tkPaintMeBar(ui); await tkSleep(500); return;
    case 'catch': tkFloat(ui, e.s, '🚨 Yakalandı! +2', 'bad'); gameSound('err'); await tkSleep(500); return;
    case 'chal': {
      tkFloat(ui, e.s, '⚖️ İtiraz!', 'col'); await tkSleep(700);
      tkFloat(ui, e.ok ? e.by : e.s, e.ok ? 'Kuralsız +4! Ceza onda' : 'İtiraz haksız: +6', 'bad');
      if (e.hand && ui.seat === e.s){ ui.chalHand = e.hand; }
      await tkSleep(900); return;
    }
    case 'shuffle': {
      tkFloat(ui, null, '🔀 Deste karıştırıldı', 'col');
      vis.drawN = ui.v.drawN; vis.disc = vis.disc.slice(-1); tkPaintMid(ui);
      await tkSleep(600); return;
    }
    case 'round': {
      ui.lastHands = e.hands;
      vis.score[e.s] = (vis.score[e.s] || 0) + e.pts;
      gameSound('win');
      if (typeof confetti === 'function' && e.s === ui.seat) confetti(root.querySelector('.tk-felt'));
      tkFloat(ui, e.s, '🏁 El bitti!', 'tek');
      await tkSleep(900); return;
    }
  }
}
