// Taş Futbolu: 5'e 5, sıra tabanlı. Sırası gelen kendi taşını seçer, geriye çekip bırakır; taş fırlar,
// bütün taşlar ve top durunca sıra rakibe geçer. Tek oyunculu (bota karşı) ya da iki kişi.
// Atışı masa sahibi uygular ve sonucu hesaplar; herkes aynı atışı aynı fizikle kendi ekranında oynatır,
// sonunda masa sahibinin kesin konumlarına oturur. Saha 1000x620; Kırmızı solda, Mavi sağda.
(function(){
  const W = 1000, H = 620, KALE = [250, 370], DERIN = 42, R_T = 26, R_B = 13, M_T = 1, M_B = 0.45;
  const SUR_T = 0.982, SUR_B = 0.986, SEK_T = 0.86, SEK_D = 0.78, VMAX = 19, ALT = 3, MAXTIK = 2400;
  const DIZILIS = [[70, 310], [215, 190], [215, 430], [395, 235], [395, 385]];
  const ZOR = { kolay: { gurultu: 0.16, sec: 8 }, orta: { gurultu: 0.05, sec: 3 }, zor: { gurultu: 0.012, sec: 1 } };
  const kis = (v, a, b) => Math.max(a, Math.min(b, v));
  const uz = (x, y) => Math.sqrt(x * x + y * y);

  // ---------- fizik (herkeste aynı) ----------
  function dizilis(){
    const b = [];
    DIZILIS.forEach(([x, y]) => b.push({ x, y, vx: 0, vy: 0, r: R_T, m: M_T }));
    DIZILIS.forEach(([x, y]) => b.push({ x: W - x, y, vx: 0, vy: 0, r: R_T, m: M_T }));
    b.push({ x: W / 2, y: H / 2, vx: 0, vy: 0, r: R_B, m: M_B });
    return b;
  }
  const kopya = P => P.map((p, i) => ({ x: p[0], y: p[1], vx: 0, vy: 0, r: i === 10 ? R_B : R_T, m: i === 10 ? M_B : M_T }));
  const konum = B => B.map(b => [b.x, b.y]);
  function duvar(b, olay){
    const r = b.r, ic = b.y > KALE[0] && b.y < KALE[1];
    if (b.y < r){ b.y = r; if (b.vy < 0){ b.vy = -b.vy * SEK_D; olay.d = 1; } }
    if (b.y > H - r){ b.y = H - r; if (b.vy > 0){ b.vy = -b.vy * SEK_D; olay.d = 1; } }
    for (const yan of [0, 1]){
      const disari = yan ? b.x > W - r : b.x < r;
      if (!disari) continue;
      const kx = yan ? W : 0;
      if (!ic && Math.abs(b.x - kx) < r){ b.x = yan ? W - r : r; if (yan ? b.vx > 0 : b.vx < 0){ b.vx = -b.vx * SEK_D; olay.d = 1; } continue; }
      // kalenin içi: arka ağ ve yan direkler
      const arka = yan ? W + DERIN - r : -DERIN + r;
      if (yan ? b.x > arka : b.x < arka){ b.x = arka; if (yan ? b.vx > 0 : b.vx < 0){ b.vx = -b.vx * 0.3; olay.ag = 1; } }
      if (yan ? b.x > W : b.x < 0){
        if (b.y < KALE[0] + r){ b.y = KALE[0] + r; if (b.vy < 0) b.vy = -b.vy * 0.5; }
        if (b.y > KALE[1] - r){ b.y = KALE[1] - r; if (b.vy > 0) b.vy = -b.vy * 0.5; }
      }
    }
    // direkler
    for (const [cx, cy] of [[0, KALE[0]], [0, KALE[1]], [W, KALE[0]], [W, KALE[1]]]){
      const dx = b.x - cx, dy = b.y - cy, d = uz(dx, dy);
      if (d < r && d > 1e-6){ const nx = dx / d, ny = dy / d; b.x = cx + nx * r; b.y = cy + ny * r; const vn = b.vx * nx + b.vy * ny; if (vn < 0){ b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; olay.d = 1; } }
    }
  }
  // bir adım; dönüş: hepsi durdu mu
  function adim(B, olay){
    for (let a = 0; a < ALT; a++){
      for (const b of B){ b.x += b.vx / ALT; b.y += b.vy / ALT; }
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++){
        const p = B[i], q = B[j], dx = q.x - p.x, dy = q.y - p.y, R = p.r + q.r;
        if (Math.abs(dx) >= R || Math.abs(dy) >= R) continue;
        const d = uz(dx, dy); if (d >= R || d < 1e-6) continue;
        const nx = dx / d, ny = dy / d, ort = R - d, top = p.m + q.m;
        p.x -= nx * ort * q.m / top; p.y -= ny * ort * q.m / top; q.x += nx * ort * p.m / top; q.y += ny * ort * p.m / top;
        const vn = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
        if (vn < 0){ const j2 = -(1 + SEK_T) * vn / (1 / p.m + 1 / q.m); p.vx -= j2 / p.m * nx; p.vy -= j2 / p.m * ny; q.vx += j2 / q.m * nx; q.vy += j2 / q.m * ny; if (-vn > 1) olay[j === 10 || i === 10 ? 'top' : 'tas'] = 1; }
      }
      for (const b of B) duvar(b, olay);
    }
    let dur = true;
    B.forEach((b, i) => {
      const f = i === 10 ? SUR_B : SUR_T; b.vx *= f; b.vy *= f;
      if (uz(b.vx, b.vy) < 0.045){ b.vx = 0; b.vy = 0; } else dur = false;
    });
    const t = B[10];
    if (olay.gol == null){ if (t.x < -t.r) olay.gol = 1; else if (t.x > W + t.r) olay.gol = 0; }
    return dur;
  }
  function sim(P, i, vx, vy, max){
    const B = kopya(P); B[i].vx = vx; B[i].vy = vy;
    const olay = {}; let n = 0;
    while (n < (max || MAXTIK)){ n++; if (adim(B, olay)) break; }
    return { son: konum(B), gol: olay.gol == null ? -1 : olay.gol, tik: n };
  }

  // ---------- bot: birkaç atışı kafasında dener ----------
  function botAtis(P, takim, zor){
    const z = ZOR[zor] || ZOR.orta, top = P[10], hx = takim === 0 ? W + 20 : -20, bizX = takim === 0 ? -20 : W + 20;
    let gx = hx - top[0], gy = H / 2 - top[1]; const gd = uz(gx, gy) || 1; gx /= gd; gy /= gd;
    const aday = [];
    for (let k = 0; k < 5; k++){
      const i = takim * 5 + k, t = P[i];
      const vurX = top[0] - gx * (R_T + R_B - 3), vurY = top[1] - gy * (R_T + R_B - 3);
      const tam = Math.atan2(vurY - t[1], vurX - t[0]), dogru = Math.atan2(top[1] - t[1], top[0] - t[0]);
      [tam, dogru].forEach((a0, w) => [-0.12, -0.05, 0, 0.05, 0.12].forEach(da => [0.55, 0.8, 1].forEach(g => {
        if (w && da) return;
        const a = a0 + da, r = sim(P, i, Math.cos(a) * VMAX * g, Math.sin(a) * VMAX * g, 1100);
        const b = r.son[10];
        let puan = r.gol === takim ? 10000 : r.gol === 1 - takim ? -10000 : 0;
        const tehlike = uz(bizX - top[0], H / 2 - top[1]) < 300;   // top bizim kaleye yakınsa önce uzaklaştır
        puan += -uz(hx - b[0], H / 2 - b[1]) * (tehlike ? 0.5 : 1) + (tehlike ? 1.3 : 0.45) * uz(bizX - b[0], H / 2 - b[1]);
        // topa en yakın rakip taş bizim kaleye yakınsa tehlike
        let enR = 1e9; for (let q = 0; q < 5; q++){ const o = r.son[(1 - takim) * 5 + q]; enR = Math.min(enR, uz(o[0] - b[0], o[1] - b[1])); }
        if (enR < 90 && uz(bizX - b[0], H / 2 - b[1]) < 420) puan -= 180;
        aday.push({ i, a, g, puan });
      })));
    }
    aday.sort((x, y) => y.puan - x.puan);
    const s = aday[Math.floor(Math.random() * Math.min(z.sec, aday.length))];
    return { i: s.i, a: s.a + (Math.random() - 0.5) * 2 * z.gurultu, p: kis(s.g + (Math.random() - 0.5) * z.gurultu, 0.2, 1) };
  }

  // ---------- masa sahibi ----------
  function yeniDurum(op, basla){
    return { ph: 'oyna', sira: basla || 0, skor: [0, 0], pos: konum(dizilis()), hedef: op.gol, hs: op.hamle, bitis: Date.now() + op.hamle * 1000,
      atis: 0, son: -1, kazanan: -1, sut: null, mesaj: '' };
  }
  function sutUygula(o, i, a, p){
    const g = o.state;
    p = kis(+p, 0, 1); a = +a;
    if (!Number.isFinite(a) || !Number.isFinite(p) || p < 0.04) return;
    const vx = Math.cos(a) * VMAX * p, vy = Math.sin(a) * VMAX * p;
    const r = sim(g.pos, i, vx, vy);
    g.atis++;
    const ev = { k: 'sut', n: g.atis, bas: g.pos, i, vx, vy };
    g.sut = { n: g.atis, i };
    g.ph = 'hareket';
    g._sonuc = r;
    sendEvent(o, ev, peer.id); yerelSut(o.sum.id, ev);
    sendViews(o);
    later(o, Math.round(r.tik / 120 * 1000) + 350, () => hareketBitti(o));
  }
  function hareketBitti(o){
    const g = o.state, r = g._sonuc; if (!r) return;
    g._sonuc = null; g.pos = r.son;
    if (r.gol >= 0){
      g.skor[r.gol]++; g.son = r.gol; g.ph = 'gol';
      const s = o.sum, ad = k => s.seats[k] ? s.seats[k].name : (k ? 'Mavi' : 'Kırmızı');
      g.mesaj = ad(r.gol) + ' gol attı!';
      if (g.skor[r.gol] >= g.hedef){
        g.ph = 'bitti'; g.kazanan = r.gol;
        addSys('⚽ Taş Futbolu bitti: ' + ad(0) + ' ' + g.skor[0] + ' - ' + g.skor[1] + ' ' + ad(1));
        sendViews(o); return;
      }
      sendViews(o);
      later(o, 2200, () => { g.pos = konum(dizilis()); g.sira = 1 - r.gol; g.ph = 'oyna'; g.mesaj = ''; g.bitis = Date.now() + g.hs * 1000; sendViews(o); pump(o); });
      return;
    }
    g.sira = 1 - g.sira; g.ph = 'oyna'; g.bitis = Date.now() + g.hs * 1000;
    sendViews(o); pump(o);
  }

  registerTableGame('futbol', {
    name: 'Taş Futbolu', icon: '⚽', seats: 2, joinMidGame: true, yeni: true,
    cleanOpts: o => ({ gol: [1, 3, 5, 7].includes(+o.gol) ? +o.gol : 3, hamle: [15, 30, 45, 60].includes(+o.hamle) ? +o.hamle : 30, zor: ZOR[o.zor] ? o.zor : 'orta', mod: o.mod === 'tek' ? 'tek' : 'cok' }),
    variantName: s => (s.seats[1] && s.seats[1].bot ? 'Bota karşı (' + s.opts.zor + ')' : 'İki kişi') + ' · ' + s.opts.gol + ' golde biter · hamle ' + s.opts.hamle + ' sn',
    seatLabel: k => k ? '🔵 Mavi' : '🔴 Kırmızı',
    waitText: (s, own) => own ? 'Arkadaşın boş koltuğa otursun ya da koltuğa bot ekle, sonra “Oyunu başlat”a bas.' : 'Boş koltuğa otur; masayı açan başlatınca oyun burada açılır.',
    makeCard: {
      desc: '5\'e 5 sıra tabanlı. Taşını geriye çek, bırak, topu rakip kaleye sok! Bota karşı ya da arkadaşınla.',
      opts: '<label>Mod<select data-o="mod"><option value="tek">Tek oyunculu (bota karşı)</option><option value="cok" selected>İki kişi</option></select></label>' +
        '<label>Kaç golde biter?<select data-o="gol"><option value="1">1 gol</option><option value="3" selected>3 gol</option><option value="5">5 gol</option><option value="7">7 gol</option></select></label>' +
        '<label>Hamle süresi<select data-o="hamle"><option value="15">15 sn</option><option value="30" selected>30 sn</option><option value="45">45 sn</option><option value="60">60 sn</option></select></label>' +
        '<label>Bot zorluğu<select data-o="zor"><option value="kolay">Kolay</option><option value="orta" selected>Orta</option><option value="zor">Zor</option></select></label>',
      read: c => {
        const mod = c.querySelector('[data-o=mod]').value;
        if (mod === 'tek') setTimeout(tekBaslat, 0);
        return { mod, gol: c.querySelector('[data-o=gol]').value, hamle: c.querySelector('[data-o=hamle]').value, zor: c.querySelector('[data-o=zor]').value };
      }
    },
    start(o){ return yeniDurum(o.sum.opts, 0); },
    act(o, seat, a, who){
      const g = o.state;
      if (a.type === 'sut'){
        if (g.ph !== 'oyna' || seat !== g.sira) return;
        const i = +a.i; if (!(i >= seat * 5 && i < seat * 5 + 5)) return;
        clearTimers(o); sutUygula(o, i, a.a, a.p); return;
      }
      if (who !== o.sum.owner) return;
      if (a.type === 'yeni' && g.ph === 'bitti'){ clearTimers(o); o.state = yeniDurum(o.sum.opts, Math.random() < 0.5 ? 0 : 1); sendViews(o); pump(o); }
    },
    pump(o){
      const g = o.state, s = o.sum;
      if (!g || g.ph !== 'oyna') return;
      const x = s.seats[g.sira];
      if (x && x.bot){ later(o, 1100, () => { if (g.ph !== 'oyna') return; const b = botAtis(g.pos, g.sira, s.opts.zor); sutUygula(o, b.i, b.a, b.p); }); return; }
      // süre dolarsa sıra geçer
      later(o, Math.max(0, g.bitis - Date.now()), () => {
        if (g.ph !== 'oyna') return;
        g.sira = 1 - g.sira; g.bitis = Date.now() + g.hs * 1000; g.mesaj = '⏱ Süre doldu, sıra geçti';
        sendViews(o); pump(o);
        later(o, 1800, () => { if (g.mesaj.startsWith('⏱')){ g.mesaj = ''; sendViews(o); } });
      });
    },
    view(o){
      const g = o.state;
      return { ph: g.ph, sira: g.sira, skor: g.skor.slice(), pos: g.pos, kalan: Math.max(0, g.bitis - Date.now()), hs: g.hs, atis: g.atis, sut: g.sut,
        son: g.son, kazanan: g.kazanan, mesaj: g.mesaj, hedef: g.hedef };
    },
    render: (body, s, lv) => ciz(body, s, lv),
    onEvent: (ev, s) => { if (ev && ev.k === 'sut') yerelSut(s.id, ev); },
    kazanan: o => o.state && o.state.ph === 'bitti' && o.sum.seats[o.state.kazanan] ? [o.sum.seats[o.state.kazanan].id] : null,
    isMyTurn: (v, seat) => v.ph === 'oyna' && v.sira === seat,
    turnKey: v => v.atis + ':' + v.sira + ':' + v.skor.join('-')
  });
  function tekBaslat(){
    const o = [...owned.values()].reverse().find(x => x.sum.game === 'futbol' && x.sum.status === 'waiting' && x.sum.opts.mod === 'tek');
    if (!o) return;
    if (!o.sum.seats[1]) ownerBot(o, 1, true);
    ownerStart(o);
  }

  // ---------- istemci ----------
  const K = { id: null, anim: null, sec: null, el: null, ses: (() => { try { return localStorage.getItem('oyunodasi-futbol-ses') !== '0'; } catch(e){ return true; } })() };
  function yerelSut(id, ev){
    if (K.id !== id || !Array.isArray(ev.bas) || ev.bas.length !== 11) return;
    const B = kopya(ev.bas); B[ev.i].vx = ev.vx; B[ev.i].vy = ev.vy;
    K.anim = { n: ev.n, B, olay: {}, t0: performance.now(), tik: 0, bitti: false, i: ev.i };
    K.sec = null;
    sesCal('vur');
  }
  function ciz(body, s, lv){
    const v = lv.v, seat = lv.seat;
    if (!K.el || K.el.dataset.tid !== s.id || !body.contains(K.el)){
      body.innerHTML = '';
      K.id = s.id; K.anim = null; K.sec = null; K.olcu = null;
      const el = document.createElement('div'); el.className = 'tf'; el.dataset.tid = s.id;
      el.innerHTML = '<div class="tf-tabela"><div class="tf-skor"><span class="tf-k">KIRMIZI</span><b class="tf-s">0 - 0</b><span class="tf-m">MAVİ</span></div>'
        + '<div class="tf-sira"><b></b><i><u></u></i></div><div class="tf-sure">⏱ <b>0:00</b></div><button type="button" class="tf-ses" title="Ses aç / kapat"></button></div>'
        + '<div class="tf-saha"><canvas></canvas><div class="tf-yazi"></div></div><div class="tf-alt"></div>';
      body.append(el); K.el = el; K.cv = el.querySelector('canvas'); K.saha = el.querySelector('.tf-saha');
      el.querySelector('.tf-ses').onclick = () => { K.ses = !K.ses; try { localStorage.setItem('oyunodasi-futbol-ses', K.ses ? '1' : '0'); } catch(e){} sesDug(); };
      girisKur(); sesDug();
      new ResizeObserver(() => { K.olcu = null; }).observe(K.saha);
      if (window.innerWidth < 700) setTimeout(() => el.scrollIntoView({ block: 'start', behavior: 'smooth' }), 300);
      if (!K.dongu){ K.dongu = true; requestAnimationFrame(cizDongu); }
    }
    const eskiSira = K.v && K.v.sira, eskiPh = K.v && K.v.ph;
    K.seat = seat; K.v = v; K.s = s; K.vT = performance.now();
    if (v.ph !== 'oyna' || v.sira !== seat) K.sec = null;
    if (v.ph === 'gol' && eskiPh !== 'gol') sesCal('gol');
    if (v.ph === 'oyna' && v.sira === seat && seat >= 0 && (eskiSira !== v.sira || eskiPh !== 'oyna')) sesCal('sira');
    // animasyon gelmediyse (geç kalan) doğrudan son konuma geç
    if (K.anim && v.atis !== K.anim.n && v.ph !== 'hareket') K.anim = null;
    const ad = k => s.seats[k] ? s.seats[k].name : (k ? 'Mavi' : 'Kırmızı');
    K.el.querySelector('.tf-k').textContent = ad(0).toLocaleUpperCase('tr');
    K.el.querySelector('.tf-m').textContent = ad(1).toLocaleUpperCase('tr');
    K.el.querySelector('.tf-s').textContent = v.skor[0] + ' - ' + v.skor[1];
    const sr = K.el.querySelector('.tf-sira');
    sr.className = 'tf-sira ' + (v.sira ? 'm' : 'k');
    sr.querySelector('b').textContent = v.ph === 'bitti' ? 'MAÇ BİTTİ' : v.ph === 'gol' ? 'GOL!' : v.ph === 'hareket' ? 'TOP OYUNDA…' : v.sira === seat ? 'SIRA SENDE' : 'SIRA: ' + ad(v.sira).toLocaleUpperCase('tr');
    altCiz(s, v, seat);
  }
  function sesDug(){ if (K.el) K.el.querySelector('.tf-ses').textContent = K.ses ? '🔊' : '🔇'; }
  function altCiz(s, v, seat){
    const alt = K.el.querySelector('.tf-alt'); alt.innerHTML = '';
    const not = t => { const n = document.createElement('span'); n.className = 'note'; n.textContent = t; alt.append(n); };
    if (v.ph === 'bitti'){
      const ad = k => s.seats[k] ? s.seats[k].name : '';
      const p = document.createElement('div'); p.className = 'tf-bitti';
      const b = document.createElement('b'); b.textContent = '🏆 ' + ad(v.kazanan) + ' kazandı! ' + v.skor[0] + ' - ' + v.skor[1]; p.append(b);
      if (s.owner === peer.id){ const x = document.createElement('button'); x.type = 'button'; x.className = 'btn primary'; x.textContent = '▶ Yeni maç'; x.onclick = () => tableAct({ type: 'yeni' }); p.append(x); }
      else not('Masayı açan yeni maçı başlatabilir.');
      alt.append(p);
      if (v.kazanan === seat && typeof confetti === 'function' && K.konfeti !== v.atis){ K.konfeti = v.atis; confetti(K.saha); }
    } else if (v.mesaj) not(v.mesaj);
    else if (seat < 0) not('👀 İzliyorsun. Koltuk boşalırsa oturabilirsin.');
    else if (v.ph === 'oyna' && v.sira === seat) not((matchMedia('(pointer:coarse)').matches ? '👆' : '🖱') + ' Taşına bas, geriye doğru çek ve bırak. Ne kadar çekersen o kadar sert gider.');
    else not('Rakibin hamlesini bekliyorsun…');
  }

  // ekran ↔ saha: herkes kendi kalesini solda (telefon dik tutulunca altta) görür
  function olcuAl(){
    const sh = K.saha, cv = K.cv, dpr = Math.min(2, window.devicePixelRatio || 1);
    const bw = sh.clientWidth; if (!bw) return null;
    const dik = window.innerHeight > window.innerWidth * 1.15 && bw < 700;
    const pay = 60, dw = dik ? H + 2 * 24 : W + 2 * pay, dh = dik ? W + 2 * pay : H + 2 * 24;
    const ust = sh.getBoundingClientRect().top;
    const maxH = Math.max(240, dik ? window.innerHeight - 200 : window.innerHeight - Math.max(60, ust) - 92);
    const k = Math.min(bw / dw, maxH / dh);
    const cw = Math.round(dw * k), ch = Math.round(dh * k);
    cv.style.width = cw + 'px'; cv.style.aspectRatio = cw + ' / ' + ch; cv.style.height = 'auto';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const kk = k * dpr, ters = K.seat === 1;
    const ox = (dik ? 24 : pay) * kk, oy = (dik ? pay : 24) * kk;
    let m;
    if (!dik) m = ters ? new DOMMatrix([-kk, 0, 0, -kk, ox + W * kk, oy + H * kk]) : new DOMMatrix([kk, 0, 0, kk, ox, oy]);
    else m = ters ? new DOMMatrix([0, kk, -kk, 0, ox + H * kk, oy]) : new DOMMatrix([0, -kk, kk, 0, ox, oy + W * kk]);
    K.olcu = { m, inv: m.inverse(), kk, dik, seat: K.seat, zemin: null, rot: Math.atan2(m.b, m.a) };
    return K.olcu;
  }
  function dunya(e){
    const r = K.cv.getBoundingClientRect();
    return K.olcu.inv.transformPoint(new DOMPoint((e.clientX - r.left) * K.cv.width / r.width, (e.clientY - r.top) * K.cv.height / r.height));
  }
  const MAXCEK = 170;
  function girisKur(){
    const cv = K.cv;
    const benimSira = () => K.v && K.v.ph === 'oyna' && K.v.sira === K.seat && K.seat >= 0 && !K.anim;
    cv.addEventListener('pointerdown', e => {
      if (!benimSira() || !K.olcu) return;
      const p = dunya(e), P = K.v.pos;
      let en = -1, ed = 1e9;
      for (let k = 0; k < 5; k++){ const i = K.seat * 5 + k, d = uz(P[i][0] - p.x, P[i][1] - p.y); if (d < ed){ ed = d; en = i; } }
      if (en < 0 || ed > R_T + 22) return;
      K.sec = { i: en, cx: P[en][0], cy: P[en][1], dx: 0, dy: 0 };
      cv.setPointerCapture(e.pointerId); e.preventDefault();
    });
    cv.addEventListener('pointermove', e => {
      if (!K.sec || !cv.hasPointerCapture(e.pointerId)) return;
      const p = dunya(e); let dx = K.sec.cx - p.x, dy = K.sec.cy - p.y; const d = uz(dx, dy);
      if (d > MAXCEK){ dx *= MAXCEK / d; dy *= MAXCEK / d; }
      K.sec.dx = dx; K.sec.dy = dy;
    });
    const birak = e => {
      if (!K.sec) return;
      const s = K.sec, g = uz(s.dx, s.dy) / MAXCEK;
      if (cv.hasPointerCapture(e.pointerId)) cv.releasePointerCapture(e.pointerId);
      if (g < 0.08 || !benimSira()){ s.dx = s.dy = 0; return; }   // az çekildiyse seçili kalsın, atış olmasın
      tableAct({ type: 'sut', i: s.i, a: Math.atan2(s.dy, s.dx), p: g });
      K.sec = null;
    };
    cv.addEventListener('pointerup', birak); cv.addEventListener('pointercancel', e => { if (K.sec){ K.sec.dx = K.sec.dy = 0; } });
  }

  // ---------- ses ----------
  function sesCal(f){
    if (!K.ses || typeof audioCtx === 'undefined' || !audioCtx || (typeof deafened !== 'undefined' && deafened) || audioCtx.state !== 'running') return;
    const ac = audioCtx, t = ac.currentTime;
    try {
      if (f === 'vur' || f === 'top' || f === 'tas' || f === 'd'){
        const L = Math.floor(ac.sampleRate * 0.06), b = ac.createBuffer(1, L, ac.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 3);
        const s = ac.createBufferSource(); s.buffer = b; const bp = ac.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.value = { vur: 900, top: 1600, tas: 600, d: 350 }[f]; bp.Q.value = 2.5;
        const g = ac.createGain(); g.gain.value = f === 'd' ? 0.25 : 0.5; s.connect(bp); bp.connect(g); g.connect(ac.destination); s.start(t);
      } else if (f === 'gol'){
        // tribün uğultusu + düdük
        const L = Math.floor(ac.sampleRate * 1.6), b = ac.createBuffer(1, L, ac.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < L; i++){ const u = i / L; d[i] = (Math.random() * 2 - 1) * Math.min(1, u * 8) * (1 - u); }
        const s = ac.createBufferSource(); s.buffer = b; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
        const g = ac.createGain(); g.gain.value = 0.35; s.connect(bp); bp.connect(g); g.connect(ac.destination); s.start(t);
        const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = 2900; og.gain.setValueAtTime(0.07, t); og.gain.setValueAtTime(0.07, t + 0.35); og.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + 0.55);
      } else if (f === 'sira'){
        const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.3);
      }
    } catch(e){}
  }

  // ---------- çizim ----------
  const TAKIM = [{ ana: '#e8273b', acik: '#ff6b78', koyu: '#8e0f1c' }, { ana: '#1f6fe0', acik: '#62a4ff', koyu: '#0b357a' }];
  function zeminCiz(ol){
    const z = document.createElement('canvas'); z.width = K.cv.width; z.height = K.cv.height;
    const x = z.getContext('2d'); x.setTransform(ol.m);
    x.fillStyle = '#2f8f2a'; x.fillRect(-70, -30, W + 140, H + 60);
    for (let i = 0; i < 10; i++){ x.fillStyle = i % 2 ? '#3a9e33' : '#33962d'; x.fillRect(i * W / 10, -30, W / 10, H + 60); }
    x.strokeStyle = 'rgba(255,255,255,0.92)'; x.lineWidth = 4; x.lineJoin = 'round';
    x.strokeRect(0, 0, W, H);
    x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.stroke();
    x.beginPath(); x.arc(W / 2, H / 2, 85, 0, 6.283); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(W / 2, H / 2, 5, 0, 6.283); x.fill();
    [0, 1].forEach(yan => {
      const sx = yan ? -1 : 1, bx = yan ? W : 0;
      x.strokeRect(yan ? W - 150 : 0, 150, 150, 320);
      x.strokeRect(yan ? W - 55 : 0, 225, 55, 170);
      x.beginPath(); x.arc(bx + sx * 110, H / 2, 4.5, 0, 6.283); x.fill();
      x.beginPath(); x.arc(bx + sx * 110, H / 2, 72, yan ? Math.PI - 0.93 : -0.93, yan ? Math.PI + 0.93 : 0.93); x.save(); x.beginPath(); x.rect(yan ? W - 220 : 150, 0, 70, H); x.clip(); x.beginPath(); x.arc(bx + sx * 110, H / 2, 72, 0, 6.283); x.stroke(); x.restore();
      [[bx, 0], [bx, H]].forEach(([cx, cy]) => { x.beginPath(); x.arc(cx, cy, 14, cy ? (yan ? Math.PI : -Math.PI / 2) : (yan ? Math.PI / 2 : 0), cy ? (yan ? Math.PI * 1.5 : 0) : (yan ? Math.PI : Math.PI / 2)); x.stroke(); });
      // kale ve file
      const gx = yan ? W : -DERIN;
      x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(gx, KALE[0], DERIN, KALE[1] - KALE[0]);
      x.save(); x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 1.2;
      for (let q = 0; q <= DERIN; q += 7){ x.beginPath(); x.moveTo(gx + q, KALE[0]); x.lineTo(gx + q, KALE[1]); x.stroke(); }
      for (let q = KALE[0]; q <= KALE[1]; q += 7){ x.beginPath(); x.moveTo(gx, q); x.lineTo(gx + DERIN, q); x.stroke(); }
      x.restore();
      x.save(); x.strokeStyle = '#fff'; x.lineWidth = 6; x.beginPath(); x.moveTo(bx, KALE[0]); x.lineTo(yan ? W + DERIN : -DERIN, KALE[0]); x.lineTo(yan ? W + DERIN : -DERIN, KALE[1]); x.lineTo(bx, KALE[1]); x.stroke(); x.restore();
    });
    return z;
  }
  function tas(x, b0, i, kk, secili, sirada){
    const tk = TAKIM[i < 5 ? 0 : 1], no = i % 5 === 0 ? 1 : (i % 5) + 1;
    x.save();
    // ekran dönükse (telefon dik / mavi taraf) yüzler dik dursun
    x.translate(b0.x, b0.y); x.rotate(-(K.olcu ? K.olcu.rot : 0)); const b = { x: 0, y: 0 };
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(b.x + 4, b.y + 6, R_T, R_T * 0.92, 0, 0, 6.283); x.fill();
    if (secili){ x.shadowColor = '#3ef0ff'; x.shadowBlur = 22 * kk; x.strokeStyle = '#3ef0ff'; x.lineWidth = 5; x.beginPath(); x.arc(b.x, b.y, R_T + 7, 0, 6.283); x.stroke(); x.shadowBlur = 0; }
    else if (sirada){ x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 2; x.setLineDash([5, 5]); x.beginPath(); x.arc(b.x, b.y, R_T + 5, 0, 6.283); x.stroke(); x.setLineDash([]); }
    let g = x.createRadialGradient(b.x - 8, b.y - 10, 3, b.x, b.y, R_T); g.addColorStop(0, tk.acik); g.addColorStop(0.75, tk.ana); g.addColorStop(1, tk.koyu);
    x.fillStyle = g; x.beginPath(); x.arc(b.x, b.y, R_T, 0, 6.283); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(b.x, b.y, R_T * 0.7, 0, 6.283); x.fill();
    // forma: omuzlar + baş
    x.save(); x.beginPath(); x.arc(b.x, b.y, R_T * 0.66, 0, 6.283); x.clip();
    x.fillStyle = tk.ana; x.beginPath(); x.ellipse(b.x, b.y + R_T * 0.62, R_T * 0.55, R_T * 0.42, 0, 0, 6.283); x.fill();
    x.fillStyle = ['#f1c7a3', '#c98d5f', '#8b5a3c', '#e9b892', '#6b4128'][i % 5]; x.beginPath(); x.arc(b.x, b.y - R_T * 0.12, R_T * 0.26, 0, 6.283); x.fill();
    x.fillStyle = ['#3b2414', '#1c1209', '#0e0905', '#7a4a1f', '#151010'][(i + 2) % 5]; x.beginPath(); x.arc(b.x, b.y - R_T * 0.2, R_T * 0.27, Math.PI, 0); x.fill();
    x.restore();
    x.fillStyle = '#fff'; x.font = '900 ' + Math.round(R_T * 0.42) + 'px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(String(no), b.x, b.y + R_T * 0.42);
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 2; x.beginPath(); x.arc(b.x, b.y, R_T - 1.5, 3.6, 5.6); x.stroke();
    x.restore();
  }
  function top(x, b){
    x.save();
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(b.x + 3, b.y + 4, R_B, R_B * 0.9, 0, 0, 6.283); x.fill();
    const g = x.createRadialGradient(b.x - 4, b.y - 5, 1, b.x, b.y, R_B); g.addColorStop(0, '#fff'); g.addColorStop(1, '#cfd3d8');
    x.fillStyle = g; x.beginPath(); x.arc(b.x, b.y, R_B, 0, 6.283); x.fill();
    x.fillStyle = '#1a1a1a';
    const besgen = (cx, cy, r, a0) => { x.beginPath(); for (let k = 0; k < 5; k++){ const a = a0 + k * 1.2566; x[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.fill(); };
    const don = (b.x + b.y) / 9;
    besgen(b.x, b.y, R_B * 0.36, don);
    x.save(); x.beginPath(); x.arc(b.x, b.y, R_B, 0, 6.283); x.clip();
    for (let k = 0; k < 5; k++){ const a = don + k * 1.2566 + 0.63; besgen(b.x + Math.cos(a) * R_B * 0.95, b.y + Math.sin(a) * R_B * 0.95, R_B * 0.3, a); }
    x.restore();
    x.restore();
  }
  function cizDongu(now){
    requestAnimationFrame(cizDongu);
    if (!K.el || !document.body.contains(K.el)){ K.el = null; return; }
    if (K.el.offsetParent === null || !K.v) return;
    if (!K.olcu || K.olcu.seat !== K.seat) olcuAl();
    const ol = K.olcu; if (!ol) return;
    if (!ol.zemin) ol.zemin = zeminCiz(ol);
    // animasyon: saniyede 120 adım
    let B;
    if (K.anim){
      const a = K.anim, hedef = Math.min(MAXTIK, Math.floor((now - a.t0) / 1000 * 120));
      while (!a.bitti && a.tik < hedef){ a.tik++; const ol2 = {}; a.bitti = adim(a.B, ol2); if (ol2.top) sesCal('top'); else if (ol2.tas) sesCal('tas'); else if (ol2.d) sesCal('d'); }
      B = a.B;
      if (a.bitti && K.v.atis === a.n && K.v.ph !== 'hareket') K.anim = null;
    }
    if (!B) B = K.v.pos.map(p => ({ x: p[0], y: p[1] }));
    const c = K.cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, K.cv.width, K.cv.height); c.drawImage(ol.zemin, 0, 0);
    c.setTransform(ol.m);
    const v = K.v, benimSira = v.ph === 'oyna' && v.sira === K.seat && K.seat >= 0 && !K.anim;
    // nişan: geri çekme oku, noktalı yön çizgisi, şiddet barı
    const s = K.sec;
    if (s && benimSira){
      const g = uz(s.dx, s.dy) / MAXCEK;
      if (g > 0.02){
        const nx = s.dx / (g * MAXCEK), ny = s.dy / (g * MAXCEK);
        c.save();
        c.strokeStyle = 'rgba(220,255,220,0.55)'; c.lineWidth = 10; c.lineCap = 'round';
        c.beginPath(); c.moveTo(s.cx - nx * (R_T + 6), s.cy - ny * (R_T + 6)); c.lineTo(s.cx - s.dx - nx * R_T * 0.2, s.cy - s.dy - ny * R_T * 0.2); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.9)';
        const L = 60 + g * 340;
        for (let d = R_T + 12; d < L; d += 16){ c.globalAlpha = 1 - d / (L + 40) * 0.6; c.beginPath(); c.arc(s.cx + nx * d, s.cy + ny * d, 4, 0, 6.283); c.fill(); }
        c.globalAlpha = 1;
        const ux = s.cx + nx * (L + 10), uy = s.cy + ny * (L + 10);
        c.beginPath(); c.moveTo(ux + nx * 14, uy + ny * 14); c.lineTo(ux - ny * 11, uy + nx * 11); c.lineTo(ux + ny * 11, uy - nx * 11); c.closePath(); c.fill();
        // şiddet barı: taşın yanında yay, yeşilden kırmızıya
        const a0 = Math.atan2(ny, nx) + Math.PI / 2 + 0.35, yay = 1.9;
        c.lineWidth = 11; c.lineCap = 'butt'; c.strokeStyle = 'rgba(0,0,0,0.35)';
        c.beginPath(); c.arc(s.cx, s.cy, R_T + 22, a0, a0 + yay); c.stroke();
        const n = 24;
        for (let k = 0; k < n * g; k++){
          const u = k / n, renk = 'hsl(' + Math.round(120 - 120 * u) + ',90%,52%)';
          c.strokeStyle = renk; c.beginPath(); c.arc(s.cx, s.cy, R_T + 22, a0 + u * yay, a0 + (u + 1 / n) * yay + 0.01); c.stroke();
        }
        c.restore();
      }
    }
    for (let i = 0; i < 10; i++) tas(c, B[i], i, ol.kk, s && s.i === i, benimSira && Math.floor(i / 5) === K.seat && !s);
    top(c, B[10]);
    // seçili yazısı
    if (s && benimSira){
      const p = ol.m.transformPoint(new DOMPoint(s.cx, s.cy)), d = Math.min(2, window.devicePixelRatio || 1);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.font = '800 ' + Math.round(12 * d) + 'px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const ty = p.y + (R_T + 30) * ol.kk, w = c.measureText('SEÇİLİ').width + 14 * d;
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(p.x - w / 2, ty - 10 * d, w, 20 * d);
      c.fillStyle = '#fff'; c.fillText('SEÇİLİ', p.x, ty);
    }
    // sayaç
    const kal = v.ph === 'oyna' ? Math.max(0, v.kalan - (now - K.vT)) : v.ph === 'hareket' ? v.hs * 1000 : 0;
    const sn = Math.ceil(kal / 1000);
    const sb = K.el.querySelector('.tf-sure b'); const yz = Math.floor(sn / 60) + ':' + String(sn % 60).padStart(2, '0');
    if (sb.textContent !== yz) sb.textContent = yz;
    K.el.querySelector('.tf-sure').classList.toggle('az', v.ph === 'oyna' && sn <= 5);
    K.el.querySelector('.tf-sira u').style.width = (v.ph === 'oyna' ? kal / (v.hs * 1000) * 100 : 0) + '%';
    const yazi = K.el.querySelector('.tf-yazi'), t = v.ph === 'gol' ? 'GOL!' : '';
    if (yazi.textContent !== t){ yazi.textContent = t; yazi.classList.toggle('acik', !!t); yazi.dataset.renk = v.son === 1 ? 'm' : 'k'; }
  }
})();
