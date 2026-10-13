// Vampir Köy ekranı: harita (canvas), karakterler, sis, butonlar, joystick, toplantı/oylama ekranları, görev mini oyunları
const VM = {
  root: null, cv: null, ctx: null, harita: null, sis: null, v: null, s: null, aktif: false,
  me: { x: 1200, y: 800, yon: 1 }, tpN: -1, others: new Map(), keys: new Set(), joy: { x: 0, y: 0, on: false },
  lastSend: 0, sentX: 0, sentY: 0, raf: 0, last: 0, gorev: null, ovKey: '', at: {}, sesT: 0, btnT: 0, hudKey: '', faz: ''
};
const VMR = c => (VampirCore.RENK[c] || VampirCore.RENK[0])[1];
const VMRad = c => (VampirCore.RENK[c] || VampirCore.RENK[0])[0];
function vmEl(tag, cls, text){ const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

// ---------- haritayı bir kez çiz (statik katman) ----------
function vmHarita(){
  if (VM.harita) return VM.harita;
  const V = VampirCore, S = 0.8;
  const c = document.createElement('canvas'); c.width = V.W * S; c.height = V.H * S;
  const g = c.getContext('2d'); g.scale(S, S);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#17241a'; g.fillRect(0, 0, V.W, V.H);
  for (let i = 0; i < 900; i++){ g.fillStyle = rnd() < 0.5 ? 'rgba(80,120,60,.18)' : 'rgba(20,40,20,.35)'; g.fillRect(rnd() * V.W, rnd() * V.H, 3 + rnd() * 6, 2 + rnd() * 3); }
  // yollar
  V.YOLLAR.forEach(a => { g.fillStyle = '#5a4630'; g.fillRect(a.x, a.y, a.w, a.h); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 4; g.strokeRect(a.x + 2, a.y + 2, a.w - 4, a.h - 4); });
  V.YOLLAR.forEach(a => { for (let i = 0; i < a.w * a.h / 900; i++){ g.fillStyle = 'rgba(30,20,10,.25)'; g.fillRect(a.x + rnd() * a.w, a.y + rnd() * a.h, 4, 3); } });
  // odalar
  V.ODALAR.forEach(a => {
    g.fillStyle = a.zemin; g.fillRect(a.x, a.y, a.w, a.h);
    for (let i = 0; i < a.w * a.h / 1400; i++){ g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(a.x + rnd() * a.w, a.y + rnd() * a.h, 6, 4); }
    g.strokeStyle = 'rgba(10,6,4,.7)'; g.lineWidth = 10; g.strokeRect(a.x - 3, a.y - 3, a.w + 6, a.h + 6);
  });
  // yollar odaların duvarını keser
  V.YOLLAR.forEach(a => { g.fillStyle = '#5a4630'; g.fillRect(a.x + 8, a.y + 8, a.w - 16, a.h - 16); });
  const emo = (t, x, y, px, al) => { g.globalAlpha = al == null ? 1 : al; g.font = px + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y); g.globalAlpha = 1; };
  // süsler
  const sus = {
    meydan: [['⛲', 1200, 830, 70]],
    degirmen: [['🏚️', 230, 180, 64], ['🌾', 380, 300, 34], ['🌾', 420, 330, 34], ['🌾', 350, 350, 34], ['🌾', 520, 380, 30]],
    kuyu: [['🪨', 1060, 160, 30], ['🌻', 1370, 140, 28]],
    ahir: [['🐖', 1850, 400, 40], ['🐓', 2050, 330, 32], ['🌾', 2210, 280, 30]],
    firin: [['🔥', 180, 880, 36], ['🧺', 470, 660, 30]],
    demirci: [['🔥', 2230, 880, 40], ['⛓️', 1920, 660, 28], ['🛡️', 2240, 670, 30]],
    kilise: [['⛪', 470, 1230, 80], ['🕯️', 200, 1210, 26], ['🕯️', 560, 1440, 26]],
    mezarlik: [['⚰️', 1060, 1260, 34], ['🪦', 1120, 1350, 28], ['🪦', 1300, 1380, 28], ['🌫️', 1380, 1470, 40, 0.5]],
    orman: [['🌲', 1850, 1180, 50], ['🌲', 2240, 1300, 50], ['🌲', 2100, 1480, 46], ['🍄', 2050, 1250, 26], ['🦉', 1840, 1460, 30]]
  };
  Object.values(sus).forEach(l => l.forEach(([t, x, y, px, al]) => emo(t, x, y, px, al)));
  // dışarıdaki ağaçlar
  for (let i = 0; i < 260; i++){
    const x = rnd() * V.W, y = rnd() * V.H;
    if (V.icinde(x, y, -40)) continue;
    emo(rnd() < 0.8 ? '🌲' : '🌳', x, y, 36 + rnd() * 26, 0.85);
  }
  // mezarlar (vampir geçitleri)
  V.MEZARLAR.forEach(m => { g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(m.x, m.y + 14, 30, 12, 0, 0, Math.PI * 2); g.fill(); emo('🪦', m.x, m.y, 40); });
  // çan ve şalter
  emo('🔔', V.CAN.x, V.CAN.y, 44); emo('🔌', V.SALTER.x, V.SALTER.y, 34);
  // oda adları
  V.ODALAR.forEach(a => {
    g.font = 'bold 26px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillText(a.ico + ' ' + a.ad, a.x + a.w / 2 + 2, a.y + 14 + 2);
    g.fillStyle = 'rgba(255,240,210,.82)'; g.fillText(a.ico + ' ' + a.ad, a.x + a.w / 2, a.y + 14);
  });
  VM.harita = { c, S };
  return VM.harita;
}

// ---------- karakter ----------
function vmFasulye(g, x, y, renk, yon, opt){
  opt = opt || {};
  g.save(); g.translate(x, y); if (yon < 0) g.scale(-1, 1);
  if (opt.hayalet) g.globalAlpha = 0.45;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 20, 18, 6, 0, 0, Math.PI * 2); g.fill();
  const koyu = 'rgba(0,0,0,.45)';
  g.fillStyle = renk; g.strokeStyle = '#111'; g.lineWidth = 3;
  // sırt çantası
  g.beginPath(); g.roundRect(-22, -12, 10, 22, 4); g.fill(); g.stroke();
  // gövde
  g.beginPath(); g.roundRect(-15, -30, 31, 44, 15); g.fill(); g.stroke();
  // bacaklar
  const ad = opt.adim || 0;
  g.beginPath(); g.roundRect(-13, 8 + Math.max(0, ad) * 3, 11, 12, 4); g.fill(); g.stroke();
  g.beginPath(); g.roundRect(3, 8 + Math.max(0, -ad) * 3, 11, 12, 4); g.fill(); g.stroke();
  g.fillStyle = koyu; g.fillRect(-14, 6, 29, 3);
  // vizör
  g.fillStyle = '#9fd6ee'; g.beginPath(); g.ellipse(6, -16, 11, 7.5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(9, -18.5, 4.5, 2.4, 0, 0, Math.PI * 2); g.fill();
  if (opt.vampir){ g.fillStyle = '#fff'; g.beginPath(); g.moveTo(2, -9); g.lineTo(4, -4); g.lineTo(6, -9); g.moveTo(8, -9); g.lineTo(10, -4); g.lineTo(12, -9); g.fill(); }
  g.restore();
}
function vmCeset(g, x, y, renk){
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(120,0,0,.55)'; g.beginPath(); g.ellipse(0, 12, 30, 10, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = renk; g.strokeStyle = '#111'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(-15, -6, 31, 20, [0, 0, 12, 12]); g.fill(); g.stroke();
  g.fillStyle = '#eee'; g.fillRect(-3, -14, 6, 10); g.beginPath(); g.arc(-3, -15, 4, 0, Math.PI * 2); g.arc(3, -15, 4, 0, Math.PI * 2); g.fill();
  g.restore();
}

// ---------- ekran ----------
function renderVampir(body, s, lv){
  const v = lv.v;
  VM.s = s;
  if (!VM.root || !body.contains(VM.root)){
    body.innerHTML = '';
    const r = vmEl('div', 'vmp');
    r.innerHTML = '<canvas class="vmp-cv"></canvas>' +
      '<div class="vmp-top"><div class="vmp-bar" title="Köyün görevleri"><i></i><span></span></div><span class="vmp-sure"></span><span class="vmp-rol"></span></div>' +
      '<div class="vmp-sol"><button class="vmp-lbtn" type="button">📋 Görevler</button><div class="vmp-liste"></div></div>' +
      '<div class="vmp-uyari" hidden></div>' +
      '<div class="vmp-joy"><i></i></div>' +
      '<div class="vmp-btns">' +
      '<button type="button" class="vmp-b b-isir" data-a="isir"><b>🩸</b><span>Isır</span><em></em></button>' +
      '<button type="button" class="vmp-b b-sab" data-a="sabotaj"><b>🌑</b><span>Söndür</span><em></em></button>' +
      '<button type="button" class="vmp-b b-mezar" data-a="mezar"><b>🪦</b><span>Mezar</span><em></em></button>' +
      '<button type="button" class="vmp-b b-bildir" data-a="bildir"><b>📢</b><span>Bildir</span><em></em></button>' +
      '<button type="button" class="vmp-b b-kullan" data-a="kullan"><b>🖐</b><span>Kullan</span><em></em></button>' +
      '</div><div class="vmp-ov" hidden></div><div class="vmp-gorev" hidden></div><div class="vmp-flash" hidden></div>';
    body.append(r);
    VM.root = r; VM.cv = r.querySelector('.vmp-cv'); VM.ctx = VM.cv.getContext('2d');
    VM.ovKey = ''; VM.hudKey = ''; VM.others.clear(); VM.gorev = null;
    r.querySelectorAll('.vmp-b').forEach(b => { b.onclick = () => vmEylem(b.dataset.a); b.append(vmEl('kbd', 'vmp-tus')); });
    vmTusEtiket();
    r.querySelector('.vmp-lbtn').onclick = () => r.querySelector('.vmp-sol').classList.toggle('acik');
    vmJoystick(r.querySelector('.vmp-joy'));
    vmHarita();
  }
  const once = VM.v;
  VM.v = v;
  const now = Date.now();
  VM.at = { cd: now + v.cdIn, vent: now + v.ventIn, sab: now + v.sab, sabCd: now + v.sabCdIn, acil: now + v.acilIn, sure: v.kalanSure ? now + v.kalanSure : 0, faz: now + v.phaseIn };
  if (v.tp && v.tp.n !== VM.tpN){ VM.tpN = v.tp.n; VM.me.x = v.tp.x; VM.me.y = v.tp.y; VM.sentX = v.tp.x; VM.sentY = v.tp.y; }
  if (VM.faz !== v.phase){
    const eski = VM.faz; VM.faz = v.phase;
    if (v.phase !== 'oyun') vmGorevKapat();
    if (v.phase === 'oyun' && eski && eski !== 'giris') VM.others.clear();
    if (v.phase === 'bitti') setTimeout(() => { try { gameSound('win'); } catch(e){} }, 400);
  }
  if (once && v.me && once.biten < v.biten && once.gorevler.filter(t => t.done).length < v.gorevler.filter(t => t.done).length) vmSes('gorev');
  vmHud();
  vmOverlay();
  VM.aktif = true;
  if (!VM.raf){ VM.last = performance.now(); VM.raf = requestAnimationFrame(vmDongu); }
}

function vmHud(){
  const v = VM.v, r = VM.root, V = VampirCore;
  const bar = r.querySelector('.vmp-bar');
  const oran = v.toplam ? v.biten / v.toplam : 0;
  bar.querySelector('i').style.width = Math.round(oran * 100) + '%';
  bar.querySelector('span').textContent = '🌾 Köyün görevleri ' + Math.round(oran * 100) + '%';
  const rol = r.querySelector('.vmp-rol');
  rol.className = 'vmp-rol ' + (v.rol === 'v' ? 'v' : v.rol === 'k' ? 'k' : '');
  rol.textContent = !v.me ? '👀 İzliyorsun' : (v.rol === 'v' ? '🧛 Vampir' : '🧑‍🌾 Köylü') + (v.yasar ? '' : ' · 👻 Hayalet');
  // görev listesi
  const key = JSON.stringify([v.gorevler, v.rol, v.yasar, v.vampirler]);
  if (key !== VM.hudKey){
    VM.hudKey = key;
    const l = r.querySelector('.vmp-liste'); l.innerHTML = '';
    if (v.me){
      if (v.rol === 'v'){
        l.append(vmEl('p', 'vmp-not v', '🧛 Görevin: köylüleri ısır. Bu liste sahte, görev yapıyormuş gibi dolaş!'));
        const dost = v.vampirler.filter(id => id !== v.me).map(id => (v.players.find(p => p.id === id) || {}).name).filter(Boolean);
        if (dost.length) l.append(vmEl('p', 'vmp-not v', '🦇 Vampir arkadaşın: ' + dost.join(', ')));
      } else if (!v.yasar) l.append(vmEl('p', 'vmp-not', '👻 Hayaletsin: görevlerini bitirerek köylülere hâlâ yardım edebilirsin.'));
      v.gorevler.forEach(t => {
        const s = V.ISTASYON[t.s], gt = V.GOREV_TUR[s.tur];
        const li = vmEl('div', 'vmp-g' + (t.done ? ' ok' : ''), (t.done ? '✓ ' : gt.ico + ' ') + gt.ad);
        li.append(vmEl('small', '', ' · ' + s.oda));
        l.append(li);
      });
    } else l.append(vmEl('p', 'vmp-not', 'Oyunu izliyorsun.'));
  }
  // sabotaj / hayalet uyarısı
  const u = r.querySelector('.vmp-uyari');
  if (v.phase === 'oyun' && v.sab){ u.hidden = false; u.textContent = v.rol === 'v' ? '🌑 Fenerler söndü! Köylüler göremiyor.' : '🌑 Fenerler söndü! Meydandaki 🔌 şaltere git ve onar!'; u.className = 'vmp-uyari kirmizi'; }
  else u.hidden = true;
  r.classList.toggle('olu', !!v.me && !v.yasar);
  r.classList.toggle('vampir', v.rol === 'v');
  r.classList.toggle('izleyici', !v.me);
  r.querySelector('.b-isir').hidden = v.rol !== 'v' || !v.yasar;
  r.querySelector('.b-sab').hidden = v.rol !== 'v' || !v.yasar || !v.opts.sabotaj;
  r.querySelector('.b-mezar').hidden = v.rol !== 'v' || !v.yasar;
  r.querySelector('.b-bildir').hidden = !v.yasar;
  r.querySelector('.b-kullan').hidden = !v.me;
}

// ---------- eylem butonları ----------
function vmYakin(){
  const v = VM.v, V = VampirCore, me = [VM.me.x, VM.me.y], now = Date.now();
  const out = { kullan: null, bildir: false, isir: null, mezar: false };
  if (!v || !v.me || v.phase !== 'oyun') return out;
  // kullan: görev > çan > şalter
  if (v.rol !== 'v'){
    let en = null, ed = 1e9;
    v.gorevler.forEach((t, i) => { if (t.done) return; const s = V.ISTASYON[t.s]; const d = V.dist(me, [s.x, s.y]); if (d <= V.KULLAN_R && d < ed){ ed = d; en = i; } });
    if (en != null) out.kullan = { tur: 'gorev', i: en };
  }
  if (!out.kullan && v.yasar && v.sab && V.dist(me, [V.SALTER.x, V.SALTER.y]) <= V.KULLAN_R) out.kullan = { tur: 'onar' };
  if (!out.kullan && v.yasar && V.dist(me, [V.CAN.x, V.CAN.y]) <= V.KULLAN_R) out.kullan = { tur: 'acil', ok: v.acilKaldi > 0 && now >= VM.at.acil && !v.sab };
  if (v.yasar) out.bildir = v.bodies.some(b => V.dist(me, [b.x, b.y]) <= V.BILDIR_R);
  if (v.rol === 'v' && v.yasar){
    let en = null, ed = 1e9;
    VM.others.forEach((o, id) => { if (!o.yasar || v.vampirler.includes(id)) return; const d = V.dist(me, [o.x, o.y]); if (d <= V.ISIR_R && d < ed){ ed = d; en = id; } });
    out.isir = en;
    out.mezar = V.MEZARLAR.some(m => V.dist(me, [m.x, m.y]) <= V.MEZAR_R);
  }
  return out;
}
function vmButonlar(){
  const r = VM.root, v = VM.v; if (!r || !v) return;
  const y = vmYakin(), now = Date.now();
  const set = (cls, on, alt, label) => { const b = r.querySelector(cls); if (!b) return; b.disabled = !on; b.classList.toggle('hazir', !!on); b.querySelector('em').textContent = alt || ''; if (label) b.querySelector('span').textContent = label; };
  const cd = Math.ceil(Math.max(0, VM.at.cd - now) / 1000);
  set('.b-isir', y.isir && !cd && v.kurbanKaldi !== 0, v.kurbanKaldi === 0 ? 'bitti' : cd ? cd + ' sn' : '');
  const sc = Math.ceil(Math.max(0, VM.at.sabCd - now) / 1000);
  set('.b-sab', !v.sab && !sc, v.sab ? 'karanlık' : sc ? sc + ' sn' : '');
  const vc = Math.ceil(Math.max(0, VM.at.vent - now) / 1000);
  set('.b-mezar', y.mezar && !vc, vc ? vc + ' sn' : '');
  set('.b-bildir', y.bildir);
  const k = y.kullan;
  set('.b-kullan', k && (k.tur !== 'acil' || k.ok), k && k.tur === 'acil' ? (v.acilKaldi > 0 ? v.acilKaldi + ' hak' : 'hak yok') : '',
    !k ? 'Kullan' : k.tur === 'gorev' ? 'Görev' : k.tur === 'onar' ? 'Onar' : 'Çan çal');
  r.querySelector('.b-kullan b').textContent = !k ? '🖐' : k.tur === 'gorev' ? VampirCore.GOREV_TUR[VampirCore.ISTASYON[v.gorevler[k.i].s].tur].ico : k.tur === 'onar' ? '🔌' : '🔔';
}
function vmEylem(a){
  const v = VM.v; if (!v || !v.me || v.phase !== 'oyun' || VM.gorev) return;
  const y = vmYakin();
  if (a === 'kullan' && y.kullan){
    if (y.kullan.tur === 'gorev') vmGorevAc(y.kullan.i);
    else if (y.kullan.tur === 'onar') tableAct({ type: 'onar' });
    else if (y.kullan.ok) tableAct({ type: 'acil' });
  } else if (a === 'bildir' && y.bildir){ vmPos(true); tableAct({ type: 'bildir' }); }
  else if (a === 'isir' && y.isir){ vmPos(true); tableAct({ type: 'isir', hedef: y.isir }); }
  else if (a === 'sabotaj') tableAct({ type: 'sabotaj' });
  else if (a === 'mezar' && y.mezar){ vmPos(true); tableAct({ type: 'mezar' }); }
}
function vmPos(zorla){
  const now = performance.now();
  if (!zorla && now - VM.lastSend < 80) return;
  if (!zorla && Math.abs(VM.me.x - VM.sentX) < 1 && Math.abs(VM.me.y - VM.sentY) < 1 && now - VM.lastSend < 600) return;
  VM.lastSend = now; VM.sentX = VM.me.x; VM.sentY = VM.me.y;
  tableAct({ type: 'm', x: Math.round(VM.me.x), y: Math.round(VM.me.y) });
}

// ---------- klavye ve joystick ----------
// tuşlar oyuncunun kendi ayarından gelir (⌨️ Tuşlar, js/tuslar.js); yoksa ok tuşları/WASD, E/Boşluk, Q, R, F, V
const VM_YON = { u: 1, d: 1, l: 1, r: 1 };
const vmTus = kod => (typeof TUS !== 'undefined' ? TUS.eylem('vampir', kod)
  : ({ ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', KeyE: 'kullan', Space: 'kullan', KeyR: 'bildir', KeyQ: 'isir', KeyF: 'sabotaj', KeyV: 'mezar' })[kod] || null);
window.addEventListener('keydown', e => {
  if (!VM.aktif || !VM.root || !VM.root.isConnected) return;
  if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
  if (typeof TUS !== 'undefined' && TUS.acikMi()) return;
  if (e.code === 'Escape' && VM.gorev){ vmGorevKapat(); return; }
  const m = vmTus(e.code); if (!m) return;
  e.preventDefault();
  if (VM_YON[m]){ VM.keys.add(m); return; }
  if (!e.repeat) vmEylem(m);
});
window.addEventListener('keyup', e => { const m = vmTus(e.code); if (m && VM_YON[m]) VM.keys.delete(m); });
// ekrandaki düğmelerin köşesinde hangi tuş olduğu yazar (bilgisayarda)
function vmTusEtiket(){
  if (!VM.root || typeof TUS === 'undefined') return;
  VM.root.querySelectorAll('.vmp-b').forEach(b => {
    const k = b.querySelector('.vmp-tus'); if (!k) return;
    const kod = TUS.kodlar('vampir', b.dataset.a)[0];
    k.textContent = kod ? TUS.ad(kod) : '';
    b.title = b.querySelector('span').textContent + (kod ? ' (' + TUS.ad(kod) + ')' : '');
  });
}
window.addEventListener('tuslar-degisti', () => { VM.keys.clear(); vmTusEtiket(); });
window.addEventListener('blur', () => VM.keys.clear());
function vmJoystick(el){
  const knob = el.querySelector('i');
  let id = null, cx = 0, cy = 0;
  const bit = () => { id = null; VM.joy = { x: 0, y: 0, on: false }; knob.style.transform = ''; };
  el.addEventListener('pointerdown', e => { id = e.pointerId; el.setPointerCapture(id); const b = el.getBoundingClientRect(); cx = b.left + b.width / 2; cy = b.top + b.height / 2; hareket(e); e.preventDefault(); });
  const hareket = e => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), m = 46;
    if (d > m){ dx = dx / d * m; dy = dy / d * m; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    VM.joy = { x: dx / m, y: dy / m, on: true };
  };
  el.addEventListener('pointermove', hareket);
  el.addEventListener('pointerup', bit); el.addEventListener('pointercancel', bit);
}

// ---------- ana döngü ----------
function vmDongu(t){
  VM.raf = 0;
  if (!VM.root || !VM.root.isConnected){ vmKapat(); return; }
  const dt = Math.min(0.12, (t - VM.last) / 1000); VM.last = t;
  const v = VM.v, V = VampirCore;
  if (v && v.me && v.phase === 'oyun' && !VM.gorev){
    let dx = 0, dy = 0;
    if (VM.keys.has('l')) dx -= 1; if (VM.keys.has('r')) dx += 1; if (VM.keys.has('u')) dy -= 1; if (VM.keys.has('d')) dy += 1;
    if (VM.joy.on){ dx += VM.joy.x; dy += VM.joy.y; }
    const n = Math.hypot(dx, dy);
    if (n > 0.08){
      const sp = V.HIZ[v.opts.hiz] * (v.yasar ? 1 : 1.15) * Math.min(1, n);
      const mx = dx / Math.max(1, n) * sp * dt, my = dy / Math.max(1, n) * sp * dt;
      const ok = (x, y) => !v.yasar ? (x > 0 && y > 0 && x < V.W && y < V.H) : V.icinde(x, y, V.R);
      const x = VM.me.x, y = VM.me.y;
      if (ok(x + mx, y + my)){ VM.me.x += mx; VM.me.y += my; }
      else if (ok(x + mx, y)) VM.me.x += mx;
      else if (ok(x, y + my)) VM.me.y += my;
      if (Math.abs(mx) > 0.01) VM.me.yon = mx > 0 ? 1 : -1;
      VM.me.adim = (VM.me.adim || 0) + dt * 10;
    } else VM.me.adim = 0;
    vmPos(false);
  }
  vmCiz();
  if (t - VM.btnT > 120){ VM.btnT = t; vmButonlar(); vmZaman(); }
  if (t - VM.sesT > 300){ VM.sesT = t; vmSesYonlendir(); }
  VM.raf = requestAnimationFrame(vmDongu);
}
function vmZaman(){
  const r = VM.root, v = VM.v, now = Date.now(); if (!r || !v) return;
  const s = r.querySelector('.vmp-sure');
  if (VM.at.sure && v.phase !== 'bitti'){ const k = Math.max(0, VM.at.sure - now) / 1000; s.textContent = '⏳ ' + Math.floor(k / 60) + ':' + String(Math.floor(k % 60)).padStart(2, '0'); s.classList.toggle('az', k < 60); }
  else s.textContent = '';
  const f = r.querySelector('.vmp-ov [data-sayac]');
  if (f) f.textContent = Math.ceil(Math.max(0, VM.at.faz - now) / 1000);
}
function vmKapat(){
  if (VM.raf) cancelAnimationFrame(VM.raf); VM.raf = 0;
  VM.aktif = false; VM.root = null; VM.keys.clear(); VM.gorev = null;
  try { applyAll(); } catch(e){}
}

// ---------- çizim ----------
function vmCiz(){
  const cv = VM.cv, v = VM.v, V = VampirCore; if (!cv || !v) return;
  const dpr = Math.min(cv.clientWidth < 700 ? 1.5 : 2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)){ cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = VM.ctx, now = performance.now();
  const izle = !v.me;
  let zoom = izle ? Math.min(w / V.W, h / V.H) : Math.min(w / (w < 700 ? 640 : 1050), h / 470);
  zoom = Math.max(izle ? 0.05 : 0.38, zoom);
  const cx = izle ? V.W / 2 : VM.me.x, cy = izle ? V.H / 2 : VM.me.y;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#0b120c'; g.fillRect(0, 0, cv.width, cv.height);
  const sx = dpr * zoom;
  g.setTransform(sx, 0, 0, sx, cv.width / 2 - cx * sx, cv.height / 2 - cy * sx);
  const H_ = vmHarita();
  g.imageSmoothingEnabled = true;
  // sadece ekranda görünen parçayı çiz
  const gw = cv.width / sx, gh = cv.height / sx;
  const x0 = Math.max(0, cx - gw / 2), y0 = Math.max(0, cy - gh / 2), x1 = Math.min(V.W, cx + gw / 2), y1 = Math.min(V.H, cy + gh / 2);
  if (x1 > x0 && y1 > y0) g.drawImage(H_.c, x0 * H_.S, y0 * H_.S, (x1 - x0) * H_.S, (y1 - y0) * H_.S, x0, y0, x1 - x0, y1 - y0);
  // istasyonlar: benim görevlerim parlar
  const puls = 0.55 + 0.45 * Math.sin(now / 280);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const benimGorev = new Set(v.rol === 'k' || (v.rol && v.rol !== 'v') ? v.gorevler.filter(t => !t.done).map(t => t.s) : []);
  V.ISTASYON.forEach(s => {
    const mine = benimGorev.has(s.i);
    if (mine){ g.fillStyle = 'rgba(255,214,64,' + (0.25 + 0.3 * puls) + ')'; g.beginPath(); g.arc(s.x, s.y, 34 + 6 * puls, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = mine ? 1 : 0.55;
    g.font = '34px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    g.fillText(V.GOREV_TUR[s.tur].ico, s.x, s.y);
    g.globalAlpha = 1;
  });
  if (v.sab && v.phase === 'oyun'){ g.strokeStyle = 'rgba(255,60,60,' + puls + ')'; g.lineWidth = 6; g.beginPath(); g.arc(V.SALTER.x, V.SALTER.y, 40, 0, Math.PI * 2); g.stroke(); }
  if (v.rol === 'v' && v.yasar) V.MEZARLAR.forEach(m => { g.strokeStyle = 'rgba(200,40,60,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(m.x, m.y, 36, 0, Math.PI * 2); g.stroke(); });
  // cesetler
  v.bodies.forEach(b => vmCeset(g, b.x, b.y, VMR(b.c)));
  // diğerleri (araları yumuşatılır)
  const ad = id => v.players.find(p => p.id === id);
  const etiket = (x, y, txt, renk) => {
    g.font = 'bold ' + Math.round(15 / Math.max(0.6, zoom)) + 'px system-ui,sans-serif';
    g.lineWidth = 4 / Math.max(0.6, zoom); g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(txt, x, y - 44); g.fillStyle = renk; g.fillText(txt, x, y - 44);
  };
  VM.others.forEach((o, id) => {
    const k = Math.min(1, (now - o.t) / 110);
    o.x = o.fx + (o.tx - o.fx) * k; o.y = o.fy + (o.ty - o.fy) * k;
    const p = ad(id); if (!p) return;
    const yuru = Math.hypot(o.tx - o.fx, o.ty - o.fy) > 1;
    vmFasulye(g, o.x, o.y, VMR(p.c), o.yon, { hayalet: !o.yasar, adim: yuru ? Math.sin(now / 70) : 0, vampir: false });
    etiket(o.x, o.y, p.name, v.vampirler.includes(id) && v.rol === 'v' ? '#ff5a6a' : '#fff');
  });
  // ben
  if (v.me){
    vmFasulye(g, VM.me.x, VM.me.y, VMR(v.renk), VM.me.yon, { hayalet: !v.yasar, adim: VM.me.adim ? Math.sin(VM.me.adim * 1.6) : 0 });
    etiket(VM.me.x, VM.me.y, myName, v.rol === 'v' ? '#ff5a6a' : '#fff');
  }
  // sis (görüş alanı)
  if (v.me && v.yasar && v.phase !== 'bitti'){
    let rad = V.GORUS[v.opts.gorus] * (v.rol === 'v' ? 1.25 : 1);
    if (v.sab && v.rol !== 'v') rad *= 0.45;
    const px = cv.width / 2, py = cv.height / 2, rr = rad * sx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const gr = g.createRadialGradient(px, py, rr * 0.55, px, py, rr);
    gr.addColorStop(0, 'rgba(6,4,18,0)'); gr.addColorStop(1, 'rgba(6,4,18,.94)');
    g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
  } else g.setTransform(1, 0, 0, 1, 0, 0);
  if (v.me && !v.yasar){ g.fillStyle = 'rgba(80,90,140,.12)'; g.fillRect(0, 0, cv.width, cv.height); }
}

// ---------- konum olayları ----------
function vampirEvent(ev){
  if (!ev || !VM.v) return;
  if (ev.k === 'p'){
    const now = performance.now(), gel = new Set();
    (ev.p || []).forEach(([id, x, y, yasar]) => {
      gel.add(id);
      const o = VM.others.get(id);
      if (!o){ VM.others.set(id, { x, y, fx: x, fy: y, tx: x, ty: y, t: now, yon: 1, yasar: !!yasar }); return; }
      const sicra = Math.hypot(x - o.tx, y - o.ty) > 400;
      if (x !== o.tx) o.yon = x > o.tx ? 1 : -1;
      o.fx = sicra ? x : o.x; o.fy = sicra ? y : o.y; o.tx = x; o.ty = y; o.t = now; o.yasar = !!yasar;
    });
    [...VM.others.keys()].forEach(id => { if (!gel.has(id)) VM.others.delete(id); });
  } else if (ev.k === 'isirildin'){
    vmSes('isir');
    vmFlash('🩸', 'Isırıldın!', 'Artık bir hayaletsin 👻 Duvarlardan geçebilirsin. Yaşayanlar seni duyamaz, ama görevlerini bitirerek köylülere yardım edebilirsin.', VMR(ev.by));
  } else if (ev.k === 'ses'){
    if (ev.s === 'isir' && VM.v.me && Math.hypot(ev.x - VM.me.x, ev.y - VM.me.y) < 450) vmSes('isir');
    if (ev.s === 'sabotaj') vmSes('sabotaj');
    if (ev.s === 'onar'){ vmSes('gorev'); toast('💡 ' + ev.by + ' fenerleri onardı'); }
  } else if (ev.k === 'toplanti'){
    vmSes('toplanti');
    vmGorevKapat();
  }
}

// ---------- sesler ----------
function vmSes(k){
  try {
    if (k === 'gorev') tone([784, 1047, 1319], 0.08, 0.16, 0.08);
    else if (k === 'isir') tone([180, 120, 70], 0.09, 0.3, 0.16);
    else if (k === 'sabotaj') tone([600, 400, 250, 150], 0.12, 0.25, 0.1);
    else if (k === 'toplanti') tone([988, 740, 988, 740, 988], 0.14, 0.14, 0.12);
    else if (k === 'kovma') tone([400, 300, 200, 120], 0.16, 0.35, 0.1);
  } catch(e){}
}
function vmFlash(ico, baslik, metin, renk){
  const f = VM.root && VM.root.querySelector('.vmp-flash'); if (!f) return;
  f.innerHTML = ''; f.hidden = false; f.style.setProperty('--fc', renk || '#c00');
  f.append(vmEl('div', 'fi', ico), vmEl('h2', '', baslik), vmEl('p', '', metin));
  clearTimeout(vmFlash.t); vmFlash.t = setTimeout(() => { f.hidden = true; }, 4200);
  f.onclick = () => { f.hidden = true; };
}

// ---------- ses kuralları (yaşayanlar ölüleri duymaz, yakınlık / sadece toplantı modları) ----------
function oyunSesCarpani(pid){
  const v = VM.v, s = VM.s;
  if (!VM.aktif || !v || !v.me || !s || s.status !== 'playing' || v.phase === 'bitti') return 1;
  if (!v.players.some(p => p.id === pid)) return 1;
  const oOlu = v.sus.includes(pid);
  if (!v.yasar) return 1;
  if (oOlu) return 0;
  if (v.phase !== 'oyun') return 1;
  if (v.opts.ses === 'toplanti') return 0;
  if (v.opts.ses === 'yakin'){
    const o = VM.others.get(pid); if (!o) return 0;
    const d = Math.hypot(o.x - VM.me.x, o.y - VM.me.y);
    return d <= 260 ? 1 : d >= 700 ? 0 : 1 - (d - 260) / 440;
  }
  return 1;
}
function vmSesYonlendir(){ try { peers.forEach(p => applyVolume(p)); } catch(e){} }

// ---------- üst katman ekranları (giriş, toplantı, oylama, kovma, bitiş) ----------
function vmOverlay(){
  const v = VM.v, ov = VM.root.querySelector('.vmp-ov');
  const key = v.phase + ':' + v.seq + ':' + (v.meet ? v.meet.oyVerenler.length + (v.meet.benimOy || '') : '');
  if (key === VM.ovKey) return;
  VM.ovKey = key;
  ov.innerHTML = ''; ov.className = 'vmp-ov faz-' + v.phase;
  if (v.phase === 'oyun'){ ov.hidden = true; return; }
  ov.hidden = false;
  const sayac = () => { const s = vmEl('span', 'vmp-sayac'); s.dataset.sayac = '1'; return s; };
  if (v.phase === 'giris'){
    if (!v.me){ ov.append(vmEl('h2', '', '🧛 Vampir Köy başlıyor…')); return; }
    const vamp = v.rol === 'v';
    ov.classList.add(vamp ? 'kirmizi' : 'mavi');
    ov.append(vmEl('p', 'vmp-kucuk', 'Sen bir…'), vmEl('div', 'vmp-dev', vamp ? '🧛' : '🧑‍🌾'), vmEl('h1', '', vamp ? 'VAMPİRSİN' : 'KÖYLÜSÜN'));
    if (vamp){
      const dost = v.vampirler.filter(id => id !== v.me).map(id => (v.players.find(p => p.id === id) || {}).name);
      ov.append(vmEl('p', '', dost.length ? '🦇 Vampir arkadaşın: ' + dost.join(', ') : 'Köylüleri tek tek yakala, ama kimseye yakalanma!'));
      ov.append(vmEl('p', 'vmp-kucuk', 'Yalnız birini bulunca 🩸 Isır (' + (typeof TUS !== 'undefined' ? TUS.etiket('vampir', 'isir') : 'Q') + '). Mezarlardan 🪦 gizlice geçebilir, fenerleri 🌑 söndürebilirsin.'));
    } else {
      const nv = v.players.length <= 6 && v.opts.vampir === 'auto' ? 1 : v.opts.vampir === 'auto' ? 2 : +v.opts.vampir;
      ov.append(vmEl('p', '', 'Aranızda ' + (v.opts.vampir === 'auto' ? 'en az ' : '') + nv + ' vampir var 😨'), vmEl('p', 'vmp-kucuk', 'Görevlerini yap (sarı parlayan yerler), ceset görürsen 📢 Bildir. Şüphelenirsen meydandaki 🔔 çanı çal.'));
    }
    const yer = vmEl('div', 'vmp-ekip');
    v.players.forEach(p => { const c = vmEl('span', 'vmp-kisi'); c.append(vmEl('i', '', '')); c.querySelector('i').style.background = VMR(p.c); c.append(document.createTextNode(p.name)); yer.append(c); });
    ov.append(yer);
    return;
  }
  if (v.phase === 'toplanti' || v.phase === 'oylama'){
    const m = v.meet || {};
    const h = vmEl('div', 'vmp-mbas');
    h.append(vmEl('div', 'vmp-mico', m.acil ? '🔔' : '💀'), vmEl('div', '', ''));
    const t = h.lastChild;
    t.append(vmEl('h2', '', m.acil ? 'ACİL TOPLANTI!' : 'CESET BULUNDU!'),
      vmEl('p', '', m.acil ? m.by + ' çanı çaldı.' : m.by + ', ' + m.ceset + ' adlı köylünün cesedini buldu.'));
    const z = vmEl('div', 'vmp-mzaman'); z.append(vmEl('small', '', v.phase === 'toplanti' ? '🎙 Konuşma' : '🗳 Oylama'), sayac());
    h.append(z);
    ov.append(h);
    ov.append(vmEl('p', 'vmp-kucuk', v.phase === 'toplanti' ? 'Konuşun! Nerede ne gördünüz? Oylama ' + v.opts.oy + ' sn sonra açılacak.' : (v.yasar ? (m.benimOy ? 'Oyunu verdin, diğerleri bekleniyor…' : 'Kimi köyden kovalım? Bir kişiye bas ya da pas geç.') : '👻 Hayaletsin, oy veremezsin.')));
    const grid = vmEl('div', 'vmp-grid');
    v.players.forEach(p => {
      const c = vmEl('button', 'vmp-oy' + (p.olu || p.left ? ' olu' : '') + (m.benimOy === p.id ? ' secili' : ''));
      c.type = 'button';
      const dot = vmEl('i'); dot.style.background = VMR(p.c); c.append(dot);
      c.append(vmEl('b', '', p.name + (p.id === v.me ? ' (sen)' : '')));
      if (p.vampir && v.rol === 'v') c.append(vmEl('em', 'vv', '🧛'));
      if (p.olu || p.left) c.append(vmEl('em', '', p.left ? 'ayrıldı' : '☠️'));
      if (m.oyVerenler && m.oyVerenler.includes(p.id)) c.append(vmEl('span', 'vmp-verdi', '✋ oy verdi'));
      const oyAcik = v.phase === 'oylama' && v.yasar && !m.benimOy && !p.olu && !p.left;
      c.disabled = !oyAcik;
      if (oyAcik) c.onclick = () => {
        grid.querySelectorAll('.vmp-ony').forEach(x => x.remove());
        const ony = vmEl('span', 'vmp-ony');
        const e = vmEl('button', 'btn small primary', '✓ Oyla'); e.type = 'button'; e.onclick = ev => { ev.stopPropagation(); tableAct({ type: 'oy', hedef: p.id }); };
        const h2 = vmEl('button', 'btn small', '✕'); h2.type = 'button'; h2.onclick = ev => { ev.stopPropagation(); ony.remove(); };
        ony.append(e, h2); c.append(ony);
      };
      grid.append(c);
    });
    ov.append(grid);
    if (v.phase === 'oylama' && v.yasar && !m.benimOy){
      const pas = vmEl('button', 'btn vmp-pas', '⏭ Pas geç'); pas.type = 'button'; pas.onclick = () => tableAct({ type: 'oy', hedef: 'pas' });
      ov.append(pas);
    }
    return;
  }
  if (v.phase === 'kovma'){
    vmSes('kovma');
    const e = v.eject || {};
    ov.classList.add('uzay');
    if (e.kim){
      const k = vmEl('div', 'vmp-ucan'); const kc = document.createElement('canvas'); kc.width = 120; kc.height = 120;
      const g = kc.getContext('2d'); g.translate(60, 66); g.scale(1.6, 1.6); vmFasulye(g, 0, 0, VMR(e.c), 1, {});
      k.append(kc); ov.append(k);
      const yazi = e.ad + ' köyden kovuldu.';
      const h = vmEl('h2', 'vmp-daktilo', ''); ov.append(h);
      let i = 0; const tik = setInterval(() => { if (!h.isConnected){ clearInterval(tik); return; } h.textContent = yazi.slice(0, ++i); if (i >= yazi.length) clearInterval(tik); }, 55);
      if (e.rol) ov.append(vmEl('p', 'vmp-rolac ' + e.rol, e.rol === 'v' ? '🧛 ' + e.ad + ' bir VAMPİRDİ!' : '😢 ' + e.ad + ' bir vampir DEĞİLDİ.'));
    } else ov.append(vmEl('h2', '', e.berabere ? '⚖️ Oylar eşit çıktı, kimse kovulmadı.' : '⏭ Kimse kovulmadı.'));
    if (e.kalan != null) ov.append(vmEl('p', 'vmp-kucuk', e.kalan + ' vampir kaldı.'));
    const oy = vmEl('div', 'vmp-oylar');
    Object.entries(e.oylar || {}).forEach(([kim, hedef]) => {
      const a = v.players.find(p => p.id === kim), b = v.players.find(p => p.id === hedef);
      oy.append(vmEl('span', '', (a ? a.name : '?') + ' → ' + (hedef === 'pas' ? 'pas' : b ? b.name : '?')));
    });
    if (oy.children.length) ov.append(oy);
    return;
  }
  if (v.phase === 'bitti'){
    const w = v.winner || {};
    ov.classList.add(w.taraf === 'v' ? 'kirmizi' : 'mavi');
    const kazandim = v.me && ((w.taraf === 'v') === (v.rol === 'v'));
    ov.append(vmEl('div', 'vmp-dev', w.taraf === 'v' ? '🧛' : '🧑‍🌾'), vmEl('h1', '', w.taraf === 'v' ? 'VAMPİRLER KAZANDI' : 'KÖYLÜLER KAZANDI'),
      vmEl('p', '', w.neden || ''));
    if (v.me) ov.append(vmEl('p', 'vmp-sonuc ' + (kazandim ? 'kaz' : 'kay'), kazandim ? '🎉 Kazandın!' : '💀 Kaybettin'));
    const l = vmEl('div', 'vmp-grid son');
    v.players.forEach(p => {
      const c = vmEl('div', 'vmp-oy son' + (p.vampir ? ' vamp' : ''));
      const dot = vmEl('i'); dot.style.background = VMR(p.c); c.append(dot);
      c.append(vmEl('b', '', p.name), vmEl('em', '', (p.vampir ? '🧛 Vampir · ' + (p.kurban || 0) + ' kurban' : '🧑‍🌾 Köylü · görev ' + p.gorev) + (p.olu ? ' · ☠️' : '')));
      l.append(c);
    });
    ov.append(l);
    if (VM.s && VM.s.owner === peer.id){ const b = vmEl('button', 'btn primary', '🔁 Yeni oyun'); b.type = 'button'; b.onclick = () => tableAct({ type: 'yeni' }); ov.append(b); }
    setTimeout(() => { if (ov.isConnected && typeof confetti === 'function') confetti(ov); }, 300);
  }
}

// ---------- görev mini oyunları ----------
function vmGorevKapat(){
  const g = VM.root && VM.root.querySelector('.vmp-gorev');
  if (VM.gorev && VM.gorev.dur) VM.gorev.dur();
  VM.gorev = null;
  if (g){ g.hidden = true; g.innerHTML = ''; }
}
function vmGorevAc(i){
  const v = VM.v, V = VampirCore;
  const t = v.gorevler[i]; if (!t || t.done) return;
  const s = V.ISTASYON[t.s], gt = V.GOREV_TUR[s.tur];
  const kutu = VM.root.querySelector('.vmp-gorev');
  kutu.innerHTML = ''; kutu.hidden = false;
  const p = vmEl('div', 'vg-panel g-' + s.tur);
  const bas = vmEl('div', 'vg-bas'); bas.append(vmEl('b', '', gt.ico + ' ' + gt.ad), vmEl('small', '', s.oda));
  const x = vmEl('button', 'btn small', '✕'); x.type = 'button'; x.onclick = vmGorevKapat; bas.append(x);
  const ic = vmEl('div', 'vg-ic'), msg = vmEl('p', 'vg-msg', '');
  p.append(bas, ic, msg); kutu.append(p);
  const durlar = [];
  VM.gorev = { i, dur: () => durlar.forEach(f => f()) };
  const bitti = () => {
    msg.textContent = '✓ Tamam!'; msg.className = 'vg-msg ok'; p.classList.add('bitti');
    vmSes('gorev'); tableAct({ type: 'gorev', i });
    setTimeout(() => { if (VM.gorev && VM.gorev.i === i) vmGorevKapat(); }, 700);
  };
  const salla = (t) => { msg.textContent = t || ''; msg.className = 'vg-msg hata'; p.classList.remove('salla'); void p.offsetWidth; p.classList.add('salla'); };
  const dongu = fn => { let id = 0, son = performance.now(); const f = t => { const dt = Math.min(0.5, (t - son) / 1000); son = t; if (fn(dt, t) !== false) id = requestAnimationFrame(f); }; id = requestAnimationFrame(f); durlar.push(() => cancelAnimationFrame(id)); };
  const btn = (txt, cls) => { const b = vmEl('button', 'btn ' + (cls || ''), txt); b.type = 'button'; return b; };
  const cubuk = () => { const c = vmEl('div', 'vg-cubuk'); c.append(vmEl('i')); return c; };

  if (s.tur === 'kuyu'){
    ic.append(vmEl('p', 'note', 'Düğmeyi basılı tut, kovayı yukarı çek. Bırakırsan geri kayar!'));
    const kuyu = vmEl('div', 'vg-kuyu'); const kova = vmEl('span', 'vg-kova', '🪣'); kuyu.append(kova); ic.append(kuyu);
    const c = cubuk(); ic.append(c);
    const b = btn('⬆ Basılı tut ve çek', 'primary vg-buyuk'); ic.append(b);
    let tut = false, d = 0;
    const on = e => { tut = true; e.preventDefault(); }, off = () => { tut = false; };
    b.addEventListener('pointerdown', on); window.addEventListener('pointerup', off); durlar.push(() => window.removeEventListener('pointerup', off));
    dongu(dt => { d = Math.max(0, Math.min(1, d + (tut ? dt / 2.2 : -dt / 3.5))); c.firstChild.style.width = d * 100 + '%'; kova.style.bottom = (8 + d * 78) + '%'; if (d >= 1){ bitti(); return false; } });
  } else if (s.tur === 'odun'){
    ic.append(vmEl('p', 'note', 'İşaret yeşil bölgedeyken balta vur! 3 isabet lazım.'));
    const bar = vmEl('div', 'vg-zaman'); const zone = vmEl('b'); const isr = vmEl('i'); bar.append(zone, isr); ic.append(bar);
    const say = vmEl('div', 'vg-say', '🪵 🪵 🪵'); ic.append(say);
    const b = btn('🪓 Vur!', 'primary vg-buyuk'); ic.append(b);
    let pos = 0, yon = 1, isabet = 0, z0 = 0;
    const yeniZon = () => { z0 = 0.15 + Math.random() * 0.6; zone.style.left = z0 * 100 + '%'; zone.style.width = '18%'; };
    yeniZon();
    dongu(dt => { pos += yon * dt * (1.1 + isabet * 0.25); if (pos > 1){ pos = 1; yon = -1; } if (pos < 0){ pos = 0; yon = 1; } isr.style.left = pos * 100 + '%'; });
    b.onclick = () => {
      if (pos >= z0 && pos <= z0 + 0.18){ isabet++; say.textContent = '🪓'.repeat(isabet) + ' ' + '🪵'.repeat(3 - isabet); msg.textContent = 'Çat!'; msg.className = 'vg-msg'; if (isabet >= 3) bitti(); else yeniZon(); }
      else salla('Iska!');
    };
  } else if (s.tur === 'inek'){
    ic.append(vmEl('p', 'note', 'Sırayla sol – sağ – sol – sağ… Kova dolana kadar sağ!'));
    ic.append(vmEl('div', 'vg-inek', '🐄'));
    const c = cubuk(); ic.append(c);
    const row = vmEl('div', 'vg-row'); const L = btn('👈 Sol', 'vg-buyuk'), R_ = btn('Sağ 👉', 'vg-buyuk'); row.append(L, R_); ic.append(row);
    let son = null, n = 0; const N = 12;
    const bas_ = k => { if (son === k){ salla('Sırayla bas!'); return; } son = k; n++; c.firstChild.style.width = (n / N * 100) + '%'; msg.textContent = '🥛'; msg.className = 'vg-msg'; if (n >= N) bitti(); };
    L.onclick = () => bas_('l'); R_.onclick = () => bas_('r');
  } else if (s.tur === 'fener'){
    ic.append(vmEl('p', 'note', 'Soldaki kabloyu seç, sağda aynı rengi bul. 4 kabloyu da bağla!'));
    const RK = [['#e53935', 'k'], ['#1e66f5', 'm'], ['#fdd835', 's'], ['#ec4fa0', 'p']];
    const alan = vmEl('div', 'vg-kablo'); const sol = vmEl('div', 'vg-k sol'), sag = vmEl('div', 'vg-k sag');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'vg-svg');
    alan.append(sol, svg, sag); ic.append(alan);
    const sagSira = RK.slice().sort(() => Math.random() - 0.5);
    let secili = null; const bagli = new Set();
    const mk = (r, yer) => { const b = vmEl('button', 'vg-tel'); b.type = 'button'; b.style.background = r[0]; b.dataset.r = r[1]; yer.append(b); return b; };
    const solB = RK.map(r => mk(r, sol)), sagB = sagSira.map(r => mk(r, sag));
    const ciz = (a, b, renk) => {
      const A = alan.getBoundingClientRect(), x1 = a.getBoundingClientRect(), x2 = b.getBoundingClientRect();
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', x1.right - A.left); l.setAttribute('y1', x1.top + x1.height / 2 - A.top); l.setAttribute('x2', x2.left - A.left); l.setAttribute('y2', x2.top + x2.height / 2 - A.top);
      l.setAttribute('stroke', renk); l.setAttribute('stroke-width', '10'); l.setAttribute('stroke-linecap', 'round'); svg.append(l);
    };
    solB.forEach(b => b.onclick = () => { if (bagli.has(b.dataset.r)) return; solB.forEach(x => x.classList.remove('sec')); b.classList.add('sec'); secili = b; });
    sagB.forEach(b => b.onclick = () => {
      if (!secili || bagli.has(b.dataset.r)) return;
      if (b.dataset.r !== secili.dataset.r){ salla('Yanlış renk!'); return; }
      bagli.add(b.dataset.r); ciz(secili, b, b.style.background); secili.classList.remove('sec'); secili.classList.add('ok'); b.classList.add('ok'); secili = null;
      if (bagli.size >= 4) bitti();
    });
  } else if (s.tur === 'ekmek'){
    ic.append(vmEl('p', 'note', 'Ekmek pişiyor… Altın sarısı olunca (yeşil bölge) “Çıkar”a bas. Erken çiğ, geç yanık!'));
    ic.append(vmEl('div', 'vg-firin', '🍞'));
    const bar = vmEl('div', 'vg-zaman ekmek'); const zone = vmEl('b'); const isr = vmEl('i'); zone.style.left = '62%'; zone.style.width = '20%'; bar.append(zone, isr); ic.append(bar);
    const b = btn('🧤 Çıkar!', 'primary vg-buyuk'); ic.append(b);
    let d = 0, yandi = false;
    const ekm = ic.querySelector('.vg-firin');
    dongu(dt => { if (yandi) return; d += dt / 4; isr.style.left = Math.min(100, d * 100) + '%'; ekm.style.filter = 'brightness(' + (1.3 - d * 0.9) + ') sepia(' + d + ')'; if (d >= 1){ yandi = true; salla('🔥 Yandı! Yenisi fırında…'); setTimeout(() => { d = 0; yandi = false; }, 900); } });
    b.onclick = () => { if (d >= 0.62 && d <= 0.82){ bitti(); d = 2; } else if (d < 0.62){ salla('Daha çiğ! Yenisi…'); d = 0; } };
  } else if (s.tur === 'kilic'){
    ic.append(vmEl('p', 'note', 'Daire küçülüp çizgiye oturunca vur! 4 isabet.'));
    const cv = document.createElement('canvas'); cv.width = 220; cv.height = 220; cv.className = 'vg-cv'; ic.append(cv);
    const say = vmEl('div', 'vg-say', '⚔️ 0/4'); ic.append(say);
    const b = btn('🔨 Vur!', 'primary vg-buyuk'); ic.append(b);
    const g = cv.getContext('2d'); let r = 110, isabet = 0;
    dongu(dt => {
      r -= dt * (95 + isabet * 12); if (r < 8) r = 110;
      g.clearRect(0, 0, 220, 220);
      g.fillStyle = '#2b2b30'; g.beginPath(); g.arc(110, 110, 100, 0, Math.PI * 2); g.fill();
      g.font = '54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🗡️', 110, 112);
      g.strokeStyle = '#ffd740'; g.lineWidth = 6; g.beginPath(); g.arc(110, 110, 40, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#ff5722'; g.lineWidth = 4; g.beginPath(); g.arc(110, 110, Math.max(1, r), 0, Math.PI * 2); g.stroke();
    });
    b.onclick = () => { if (Math.abs(r - 40) < 13){ isabet++; say.textContent = '⚔️ ' + isabet + '/4'; msg.textContent = 'Çınnn!'; msg.className = 'vg-msg'; r = 110; if (isabet >= 4) bitti(); } else salla('Kaçtı!'); };
  } else if (s.tur === 'tohum'){
    ic.append(vmEl('p', 'note', 'Çukurlara 1’den 6’ya sırayla tohum ek!'));
    const grid = vmEl('div', 'vg-tohum');
    const sira = [1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5);
    let bekl = 1;
    const kutular = sira.map(n => { const b = vmEl('button', 'vg-cukur', String(n)); b.type = 'button'; b.onclick = () => {
      if (n !== bekl){ salla('Sırayla!'); bekl = 1; kutular.forEach(k => { k.textContent = k.dataset.n; k.classList.remove('ok'); }); return; }
      b.textContent = '🌱'; b.classList.add('ok'); bekl++; if (bekl > 6) bitti();
    }; b.dataset.n = n; grid.append(b); return b; });
    ic.append(grid);
  } else if (s.tur === 'sifre'){
    ic.append(vmEl('p', 'note', 'Yanan sembolleri izle, sonra aynı sırayla bas.'));
    const SM = ['🔺', '🔵', '⭐', '🌙'];
    const grid = vmEl('div', 'vg-simon'); const bs = SM.map((t, k) => { const b = vmEl('button', 'vg-sm', t); b.type = 'button'; b.dataset.k = k; grid.append(b); return b; });
    ic.append(grid);
    const seq = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
    let girdi = [], oynuyor = true, zam = [];
    durlar.push(() => zam.forEach(clearTimeout));
    const goster = () => {
      oynuyor = true; girdi = []; msg.textContent = '👀 İzle…'; msg.className = 'vg-msg';
      seq.forEach((k, j) => {
        zam.push(setTimeout(() => { bs[k].classList.add('yan'); try { tone([392 + k * 130], 0.05, 0.25, 0.06); } catch(e){} }, 500 + j * 650));
        zam.push(setTimeout(() => bs[k].classList.remove('yan'), 500 + j * 650 + 420));
      });
      zam.push(setTimeout(() => { oynuyor = false; msg.textContent = 'Şimdi sen!'; }, 500 + seq.length * 650));
    };
    bs.forEach(b => b.onclick = () => {
      if (oynuyor) return;
      const k = +b.dataset.k; girdi.push(k);
      b.classList.add('yan'); setTimeout(() => b.classList.remove('yan'), 180);
      if (seq[girdi.length - 1] !== k){ salla('Yanlış! Tekrar izle.'); oynuyor = true; zam.push(setTimeout(goster, 900)); return; }
      if (girdi.length === seq.length) bitti();
    });
    goster();
  }
}
