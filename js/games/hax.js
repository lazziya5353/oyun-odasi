// Canlı Futbol 1v1 (HaxBall tarzı): gerçek zamanlı. Bilgisayarda WASD / yön tuşları + Space (şut),
// telefonda sol altta sanal joystick, sağ altta ŞUT düğmesi. Sağda hızlı sohbet mesajları.
// Fiziği masa sahibi hesaplar (60 adım/sn), ~30 kez/sn herkese gönderir; oyuncular sadece tuş durumunu yollar.
// Saha 1000x560; 0. koltuk Kırmızı (solda), 1. koltuk Mavi (sağda).
(function(){
  const W = 1000, H = 560, R_O = 24, R_T = 12, KALE = [215, 345], DERIN = 36;
  const IVME = 0.5, HMAX = 5.1, HMAX_SUT = 4.3, SON_O = 0.9, SON_T = 0.989, SEK_T = 0.72, SUT = 11.5, SUT_ARA = 260;
  const MESAJ = ['gg', 'Güzel şut! 🔥', 'Savunmadayım 🛡️', 'Hadi! 💪', 'Şanslıydı 😅', '😂'];
  const ZORLUK = { kolay: { hiz: 0.6, sut: 0.55, sap: 0.5 }, orta: { hiz: 0.82, sut: 0.85, sap: 0.22 }, zor: { hiz: 1, sut: 1, sap: 0.06 } };
  const kis = (v, a, b) => Math.max(a, Math.min(b, v));
  const uz = (x, y) => Math.sqrt(x * x + y * y);
  const saat = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  // ---------- fizik (masa sahibinde) ----------
  function santra(g, baslayan){
    g.o = [{ x: 260, y: H / 2, vx: 0, vy: 0 }, { x: W - 260, y: H / 2, vx: 0, vy: 0 }];
    g.top = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    void baslayan;
  }
  function yeniDurum(op){
    const g = { ph: 'geri', until: Date.now() + 3000, skor: [0, 0], kalan: op.sure * 1000, altin: false, kazanan: -1, son: -1,
      gir: [{ x: 0, y: 0, k: 0 }, { x: 0, y: 0, k: 0 }], sutT: [0, 0], fx: [], seq: 0, sohbet: [] };
    santra(g, 0); return g;
  }
  function botDusun(g, k, zor){
    const z = ZORLUK[zor] || ZORLUK.orta, o = g.o[k], t = g.top;
    const hx = k === 0 ? W + 10 : -10, ev = k === 0 ? -10 : W + 10;
    let gx = hx - t.x, gy = H / 2 - t.y + (g._bs || 0); const gd = uz(gx, gy) || 1; gx /= gd; gy /= gd;
    if (!g._bsT || Date.now() > g._bsT){ g._bsT = Date.now() + 1200; g._bs = (Math.random() - 0.5) * 2 * z.sap * 200; }
    // topun arkasındaki vuruş noktası
    const px = t.x - gx * (R_O + R_T + 2), py = t.y - gy * (R_O + R_T + 2);
    const onde = k === 0 ? o.x > t.x + 4 : o.x < t.x - 4;
    let tx, ty;
    const tehlike = (k === 0 ? t.x < W * 0.38 : t.x > W * 0.62) && (k === 0 ? t.vx < -1 : t.vx > 1);
    if (tehlike && onde){ tx = ev + (k === 0 ? 70 : -70); ty = H / 2 + (t.y - H / 2) * 0.6; }
    else if (onde){ tx = px - gx * 40; ty = t.y + (o.y < t.y ? -1 : 1) * (R_O + R_T + 26); }   // topun etrafından dolaş
    else { tx = px + gx * 6; ty = py + gy * 6; }
    let dx = tx - o.x, dy = ty - o.y; const d = uz(dx, dy);
    if (d > 6){ dx /= d; dy /= d; } else { dx = 0; dy = 0; }
    const yakin = uz(t.x - o.x, t.y - o.y) < R_O + R_T + 7;
    const hiza = (t.x - o.x) * gx + (t.y - o.y) * gy > 0.8 * uz(t.x - o.x, t.y - o.y);
    g.gir[k] = { x: dx * z.hiz, y: dy * z.hiz, k: yakin && hiza && Math.random() < z.sut ? 1 : 0 };
  }
  function carp(a, b, ra, rb, ma, mb, sek){
    const dx = b.x - a.x, dy = b.y - a.y, d = uz(dx, dy), R = ra + rb;
    if (d >= R || d < 1e-6) return false;
    const nx = dx / d, ny = dy / d, ort = R - d, top = ma + mb;
    a.x -= nx * ort * mb / top; a.y -= ny * ort * mb / top; b.x += nx * ort * ma / top; b.y += ny * ort * ma / top;
    const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vn < 0){ const j = -(1 + sek) * vn / (1 / ma + 1 / mb); a.vx -= j / ma * nx; a.vy -= j / ma * ny; b.vx += j / mb * nx; b.vy += j / mb * ny; }
    return true;
  }
  function adim(o){
    const g = o.state, s = o.sum, now = Date.now();
    if (g.ph === 'geri' || g.ph === 'gol'){ if (now >= g.until){ if (g.ph === 'gol') santra(g); g.ph = g.ph === 'gol' ? 'geri' : 'oyun'; if (g.ph === 'geri') g.until = now + 1200; sendViews(o); } }
    if (g.ph === 'bitti') return;
    s.seats.forEach((x, k) => { if (x && x.bot) botDusun(g, k, s.opts.zor); });
    const oyunda = g.ph === 'oyun' || g.ph === 'gol';
    g.o.forEach((p, k) => {
      const gi = g.gir[k]; let ix = +gi.x || 0, iy = +gi.y || 0; const il = uz(ix, iy); if (il > 1){ ix /= il; iy /= il; }
      if (g.ph === 'geri'){ ix = 0; iy = 0; }
      p.vx = (p.vx + ix * IVME) * SON_O; p.vy = (p.vy + iy * IVME) * SON_O;
      const mx = gi.k ? HMAX_SUT : HMAX, v = uz(p.vx, p.vy); if (v > mx){ p.vx *= mx / v; p.vy *= mx / v; }
      p.x += p.vx; p.y += p.vy;
      // kendi yarısında başla: santrada rakip yarıya geçilmez
      p.x = kis(p.x, R_O - 18, W - R_O + 18); p.y = kis(p.y, R_O - 18, H - R_O + 18);
      if (g.ph === 'geri') p.x = k === 0 ? Math.min(p.x, W / 2 - R_O) : Math.max(p.x, W / 2 + R_O);
    });
    if (carp(g.o[0], g.o[1], R_O, R_O, 1, 1, 0.3)) {}
    if (!oyunda) return;
    const t = g.top;
    // şut
    g.o.forEach((p, k) => {
      if (!g.gir[k].k || now - g.sutT[k] < SUT_ARA) return;
      const dx = t.x - p.x, dy = t.y - p.y, d = uz(dx, dy);
      if (d < R_O + R_T + 6 && d > 0.01){ g.sutT[k] = now; t.vx += dx / d * SUT; t.vy += dy / d * SUT; g.fx.push('s'); g._sut = k; }
    });
    t.x += t.vx; t.y += t.vy;
    g.o.forEach(p => { if (carp(p, t, R_O, R_T, 1, 0.4, 0.5)) g.fx.push('v'); });
    duvar(g);
    t.vx *= SON_T; t.vy *= SON_T;
    const v = uz(t.vx, t.vy); if (v > 16){ t.vx *= 16 / v; t.vy *= 16 / v; }
    if (g.ph === 'oyun'){
      g.kalan -= 1000 / 60;
      if (g.kalan <= 0 && !g.altin){
        g.kalan = 0;
        if (g.skor[0] === g.skor[1]){ g.altin = true; g.fx.push('a'); sendViews(o); }
        else bitir(o);
      }
    }
  }
  function duvar(g){
    const t = g.top, ic = t.y > KALE[0] && t.y < KALE[1];
    if (t.y < R_T){ t.y = R_T; if (t.vy < 0){ t.vy = -t.vy * SEK_T; g.fx.push('d'); } }
    if (t.y > H - R_T){ t.y = H - R_T; if (t.vy > 0){ t.vy = -t.vy * SEK_T; g.fx.push('d'); } }
    if (!ic){
      if (t.x < R_T){ t.x = R_T; if (t.vx < 0){ t.vx = -t.vx * SEK_T; g.fx.push('d'); } }
      if (t.x > W - R_T){ t.x = W - R_T; if (t.vx > 0){ t.vx = -t.vx * SEK_T; g.fx.push('d'); } }
    } else {
      if (t.x < -DERIN + R_T){ t.x = -DERIN + R_T; t.vx = Math.abs(t.vx) * 0.2; }
      if (t.x > W + DERIN - R_T){ t.x = W + DERIN - R_T; t.vx = -Math.abs(t.vx) * 0.2; }
    }
    for (const [cx, cy] of [[0, KALE[0]], [0, KALE[1]], [W, KALE[0]], [W, KALE[1]]]){
      const dx = t.x - cx, dy = t.y - cy, d = uz(dx, dy), r = R_T + 4;
      if (d < r && d > 1e-6){ const nx = dx / d, ny = dy / d; t.x = cx + nx * r; t.y = cy + ny * r; const vn = t.vx * nx + t.vy * ny; if (vn < 0){ t.vx -= 1.7 * vn * nx; t.vy -= 1.7 * vn * ny; g.fx.push('d'); } }
    }
    if (g.ph === 'oyun'){
      if (t.x < -R_T) gol(g, 1); else if (t.x > W + R_T) gol(g, 0);
    }
  }
  function gol(g, atan){
    g.skor[atan]++; g.son = atan; g.fx.push('g' + atan);
    g._gol = true; g.ph = 'gol'; g.until = Date.now() + 1800;
    if (g.altin) g._bitir = true;
  }
  function bitir(o){
    const g = o.state; g.ph = 'bitti';
    g.kazanan = g.skor[0] > g.skor[1] ? 0 : g.skor[1] > g.skor[0] ? 1 : -1;
    const s = o.sum, ad = k => s.seats[k] ? s.seats[k].name : (k ? 'Mavi' : 'Kırmızı');
    addSys('⚽ Canlı Futbol bitti: ' + ad(0) + ' ' + g.skor[0] + ' - ' + g.skor[1] + ' ' + ad(1));
    sendViews(o);
  }
  function dongu(o){
    if (o.hx) return;
    let son = performance.now(), birikim = 0, n = 0;
    o.hx = setInterval(() => {
      if (owned.get(o.sum.id) !== o || !o.state || o.sum.status !== 'playing'){ clearInterval(o.hx); o.hx = null; return; }
      const g = o.state, now = performance.now();
      birikim = Math.min(birikim + now - son, 140); son = now;
      while (birikim >= 1000 / 60){
        birikim -= 1000 / 60; adim(o);
        if (g._gol){ g._gol = false; if (g._bitir){ g._bitir = false; bitir(o); } else sendViews(o); }
        if (g.ph === 'bitti') break;
      }
      if (++n % 2 === 0 || g.fx.length) kare(o);
      if (g.ph === 'bitti'){ kare(o); clearInterval(o.hx); o.hx = null; }
    }, 16);
  }
  const y1 = v => Math.round(v * 10) / 10;
  function kare(o){
    const g = o.state; g.seq++;
    const ev = { k: 'f', q: g.seq, p: [y1(g.top.x), y1(g.top.y), y1(g.top.vx), y1(g.top.vy)],
      a: [y1(g.o[0].x), y1(g.o[0].y), y1(g.o[0].vx), y1(g.o[0].vy), g.gir[0].k ? 1 : 0], b: [y1(g.o[1].x), y1(g.o[1].y), y1(g.o[1].vx), y1(g.o[1].vy), g.gir[1].k ? 1 : 0],
      t: Math.round(g.kalan), s: g.skor, ph: g.ph, al: g.altin ? 1 : 0, fx: g.fx.length ? [...new Set(g.fx)] : 0, u: g.ph === 'geri' || g.ph === 'gol' ? Math.max(0, g.until - Date.now()) : 0, son: g.son };
    g.fx = [];
    sendEvent(o, ev, peer.id); yerelKare(o.sum.id, ev);
  }

  // ---------- kayıt ----------
  registerTableGame('hax', {
    name: 'Canlı Futbol 1v1', icon: '🥅', seats: 2, joinMidGame: true, yeni: true,
    cleanOpts: o => ({ sure: kis(Math.round(+o.sure) || 180, 30, 1800), zor: ZORLUK[o.zor] ? o.zor : 'orta', mod: o.mod === 'tek' ? 'tek' : 'cok' }),
    variantName: s => (s.seats[1] && s.seats[1].bot ? 'Bota karşı (' + s.opts.zor + ')' : 'İki kişi') + ' · ' + saat(s.opts.sure * 1000),
    seatLabel: k => k ? '🔵 Mavi' : '🔴 Kırmızı',
    waitText: (s, own) => own ? 'Arkadaşınız boş koltuğa oturabilir ya da koltuğa bot ekleyebilirsiniz, sonra “Oyunu başlat”a basabilirsiniz.' : 'Boş koltuğa otur; masayı açan başlatınca oyun burada açılır.',
    makeCard: {
      desc: 'HaxBall tarzı canlı futbol: WASD / oklar + Space ile şut, telefonda joystick. 1v1 ya da bota karşı.',
      opts: '<label>Mod<select data-o="mod"><option value="tek">Tek oyunculu (bota karşı)</option><option value="cok" selected>İki kişi</option></select></label>' +
        '<label>Süre<select data-o="sure"><option value="60">1 dakika</option><option value="120">2 dakika</option><option value="180" selected>3 dakika</option><option value="300">5 dakika</option><option value="600">10 dakika</option><option value="ozel">Kendim belirleyeyim…</option></select></label>' +
        '<label data-ozel hidden>Kaç dakika? (0,5 - 30)<input type="number" data-o="dk" min="0.5" max="30" step="0.5" value="4"></label>' +
        '<label>Bot zorluğu<select data-o="zor"><option value="kolay">Kolay</option><option value="orta" selected>Orta</option><option value="zor">Zor</option></select></label>',
      read: c => {
        const sel = c.querySelector('[data-o=sure]').value;
        const sure = sel === 'ozel' ? Math.round((parseFloat(String(c.querySelector('[data-o=dk]').value).replace(',', '.')) || 3) * 60) : +sel;
        const mod = c.querySelector('[data-o=mod]').value;
        if (mod === 'tek') setTimeout(tekBaslat, 0);
        return { sure, zor: c.querySelector('[data-o=zor]').value, mod };
      }
    },
    start(o){ return yeniDurum(o.sum.opts); },
    act(o, seat, a, who){
      const g = o.state;
      if (a.type === 'i' && seat >= 0){ g.gir[seat] = { x: kis(+a.x || 0, -1, 1), y: kis(+a.y || 0, -1, 1), k: a.k ? 1 : 0 }; return; }
      if (a.type === 'c' && Number.isInteger(+a.m) && MESAJ[+a.m] && (seat >= 0 || who)){
        const now = Date.now(); o._cT = o._cT || {}; if (now - (o._cT[who] || 0) < 900) return; o._cT[who] = now;
        const ad = seat >= 0 && o.sum.seats[seat] ? o.sum.seats[seat].name : (who === peer.id ? myName : (peers.get(who) || {}).name || 'İzleyici');
        const ev = { k: 'c', s: seat, m: +a.m, ad: clip(ad, 20) };
        sendEvent(o, ev, peer.id); yerelSohbet(o.sum.id, ev); return;
      }
      if (who !== o.sum.owner) return;
      if (a.type === 'yeni' && g.ph === 'bitti'){
        if (a.sure) o.sum.opts.sure = kis(Math.round(+a.sure) || o.sum.opts.sure, 30, 1800);
        o.state = yeniDurum(o.sum.opts); pushSum(o); sendViews(o); pump(o);
      }
    },
    pump(o){ if (o.state && o.state.ph !== 'bitti') dongu(o); },
    view(o){
      const g = o.state, s = o.sum;
      return { ph: g.ph, skor: g.skor.slice(), kalan: Math.round(g.kalan), altin: g.altin, kazanan: g.kazanan, son: g.son, sure: s.opts.sure, seq: g.seq };
    },
    render: (body, s, lv) => ciz(body, s, lv),
    onEvent: (ev, s) => { if (!ev) return; if (ev.k === 'f') yerelKare(s.id, ev); else if (ev.k === 'c') yerelSohbet(s.id, ev); },
    kazanan: o => o.state && o.state.ph === 'bitti' && o.state.kazanan >= 0 && o.sum.seats[o.state.kazanan] ? [o.sum.seats[o.state.kazanan].id] : null,
    isMyTurn: () => false
  });
  function tekBaslat(){
    const o = [...owned.values()].reverse().find(x => x.sum.game === 'hax' && x.sum.status === 'waiting' && x.sum.opts.mod === 'tek');
    if (!o) return;
    if (!o.sum.seats[1]) ownerBot(o, 1, true);
    ownerStart(o);
  }
  document.addEventListener('change', e => {
    const t = e.target; if (!t.matches || !t.matches('.make-card [data-o=sure]')) return;
    const l = t.closest('.make-card').querySelector('[data-ozel]'); if (l) l.hidden = t.value !== 'ozel';
  });

  // ---------- istemci ----------
  const K = { id: null, kare: null, kareT: 0, el: null, tus: new Set(), joy: { x: 0, y: 0 }, kick: false, gonder: null, gT: 0, balon: [{}, {}],
    ses: (() => { try { return localStorage.getItem('oyunodasi-hax-ses') !== '0'; } catch(e){ return true; } })() };
  const dokunmatik = () => matchMedia('(pointer:coarse)').matches;
  function yerelKare(id, ev){
    if (K.id !== id) return;
    K.kare = ev; K.kareT = performance.now();
    if (ev.fx) ev.fx.forEach(sesCal);
    tabela(ev.s, ev.t, ev.al);
  }
  function yerelSohbet(id, ev){
    if (K.id !== id || !K.el || !MESAJ[ev.m]) return;
    if (ev.s === 0 || ev.s === 1) K.balon[ev.s] = { m: MESAJ[ev.m], t: performance.now() };
    const l = K.el.querySelector('.hx-log'), p = document.createElement('p');
    p.className = ev.s === 1 ? 'm' : ev.s === 0 ? 'k' : '';
    const b = document.createElement('b'); b.textContent = ev.ad + ': '; p.append(b, document.createTextNode(MESAJ[ev.m]));
    l.append(p); while (l.children.length > 4) l.firstChild.remove();
    setTimeout(() => p.classList.add('sil'), 6000); setTimeout(() => p.remove(), 6600);
    sesCal('c');
  }
  function ciz(body, s, lv){
    const v = lv.v, seat = lv.seat;
    if (!K.el || K.el.dataset.tid !== s.id || !body.contains(K.el)){
      body.innerHTML = '';
      K.id = s.id; K.kare = null; K.olcu = null;
      const el = document.createElement('div'); el.className = 'hx'; el.dataset.tid = s.id;
      el.innerHTML = '<div class="hx-tabela"><div class="hx-t k"><span class="hx-ad"></span><b class="hx-sk">0</b></div><div class="hx-sure">0:00</div><div class="hx-t m"><b class="hx-sk">0</b><span class="hx-ad"></span></div><button type="button" class="hx-ses" title="Ses aç / kapat"></button></div>'
        + '<div class="hx-alan"><div class="hx-saha"><canvas></canvas><div class="hx-yazi"></div>'
        + '<div class="hx-sohbet"><button type="button" class="hx-msj" title="Hızlı mesajlar">💬</button><div class="hx-hizli" hidden></div><div class="hx-log"></div></div>'
        + '<div class="hx-kont"><div class="hx-joy"><i></i></div><button type="button" class="hx-kick">ŞUT</button></div>'
        + '<div class="hx-ipucu"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> hareket</span><span><kbd class="uzun">SPACE</kbd> şut</span><span><kbd>1</kbd>-<kbd>6</kbd> hızlı mesaj</span></div>'
        + '</div></div><div class="hx-alt"></div>';
      body.append(el); K.el = el; K.cv = el.querySelector('canvas'); K.saha = el.querySelector('.hx-saha');
      const hz = el.querySelector('.hx-hizli');
      MESAJ.forEach((m, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = m; b.title = (i + 1) + ' tuşu'; b.onclick = () => { tableAct({ type: 'c', m: i }); b.blur(); hz.hidden = true; }; hz.append(b); });
      el.querySelector('.hx-msj').onclick = e => { hz.hidden = !hz.hidden; e.currentTarget.blur(); };
      el.querySelector('.hx-ses').onclick = e => { K.ses = !K.ses; try { localStorage.setItem('oyunodasi-hax-ses', K.ses ? '1' : '0'); } catch(x){} sesDug(); e.currentTarget.blur(); };
      el.classList.toggle('dokun', dokunmatik());
      joyKur(); sesDug();
      new ResizeObserver(() => { K.olcu = null; }).observe(el.querySelector('.hx-alan'));
      if (window.innerWidth < 700) setTimeout(() => el.scrollIntoView({ block: 'start', behavior: 'smooth' }), 300);
      if (!K.dongu){ K.dongu = true; requestAnimationFrame(cizDongu); setInterval(girisGonder, 100); }
    }
    K.seat = seat; K.v = v; K.s = s;
    const ad = k => s.seats[k] ? s.seats[k].name : '—';
    const ads = K.el.querySelectorAll('.hx-ad'); ads[0].textContent = ad(0); ads[1].textContent = ad(1);
    K.el.classList.toggle('oyuncu', seat >= 0);
    tabela(v.skor, v.kalan, v.altin);
    const alt = K.el.querySelector('.hx-alt'); alt.innerHTML = '';
    if (v.ph === 'bitti'){
      const p = document.createElement('div'); p.className = 'hx-bitti';
      const b = document.createElement('b'); b.textContent = v.kazanan < 0 ? '🤝 Berabere! ' + v.skor[0] + ' - ' + v.skor[1] : '🏆 ' + ad(v.kazanan) + ' kazandı! ' + v.skor[0] + ' - ' + v.skor[1]; p.append(b);
      if (s.owner === peer.id){
        const r = document.createElement('div'); r.className = 'hx-yeni';
        r.innerHTML = '<label>Süre <select><option value="60">1 dk</option><option value="120">2 dk</option><option value="180">3 dk</option><option value="300">5 dk</option><option value="600">10 dk</option><option value="ozel">Kendim belirleyeyim…</option></select></label><input type="number" min="0.5" max="30" step="0.5" hidden aria-label="Dakika"><button type="button" class="btn primary">▶ Yeni maç</button>';
        const sel = r.querySelector('select'), inp = r.querySelector('input');
        sel.value = [60, 120, 180, 300, 600].includes(v.sure) ? String(v.sure) : 'ozel'; inp.value = String(Math.round(v.sure / 30) / 2); inp.hidden = sel.value !== 'ozel';
        sel.onchange = () => { inp.hidden = sel.value !== 'ozel'; };
        r.querySelector('button').onclick = () => tableAct({ type: 'yeni', sure: sel.value === 'ozel' ? Math.round((parseFloat(String(inp.value).replace(',', '.')) || 3) * 60) : +sel.value });
        p.append(r);
      } else { const n = document.createElement('span'); n.className = 'note'; n.textContent = 'Masayı açan yeni maçı başlatabilir.'; p.append(n); }
      alt.append(p);
      if (v.kazanan === seat && typeof confetti === 'function' && K.konfeti !== v.seq){ K.konfeti = v.seq; confetti(K.saha); }
    } else if (seat < 0){ const n = document.createElement('span'); n.className = 'note'; n.textContent = '👀 İzliyorsun. Koltuk boşalırsa oturabilirsin.'; alt.append(n); }
  }
  function tabela(skor, kalan, altin){
    if (!K.el) return;
    const sk = K.el.querySelectorAll('.hx-sk');
    [0, 1].forEach(i => { if (sk[i].textContent != skor[i]){ sk[i].textContent = skor[i]; sk[i].classList.remove('vur'); void sk[i].offsetWidth; sk[i].classList.add('vur'); } });
    const su = K.el.querySelector('.hx-sure'); const t = altin ? 'ALTIN GOL' : saat(kalan);
    if (su.textContent !== t) su.textContent = t;
    su.classList.toggle('altin', !!altin); su.classList.toggle('az', !altin && kalan <= 10000);
  }
  function sesDug(){ if (K.el) K.el.querySelector('.hx-ses').textContent = K.ses ? '🔊' : '🔇'; }

  // ---------- giriş ----------
  const TUS = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
  const aktif = () => K.el && document.body.contains(K.el) && K.el.offsetParent !== null && K.seat >= 0 && openTable === K.id;
  const yaziAlani = e => { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
  document.addEventListener('keydown', e => {
    if (!aktif() || yaziAlani(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    if (TUS[e.code] || e.code === 'Space'){ e.preventDefault(); if (!K.tus.has(e.code)){ K.tus.add(e.code); girisGonder(true); } return; }
    const n = /^Digit([1-6])$/.exec(e.code); if (n && !e.repeat){ tableAct({ type: 'c', m: +n[1] - 1 }); e.preventDefault(); }
  });
  document.addEventListener('keyup', e => { if (K.tus.delete(e.code)) girisGonder(true); });
  window.addEventListener('blur', () => { K.tus.clear(); K.kick = false; K.joy = { x: 0, y: 0 }; girisGonder(true); });
  // ekran yönündeki hareketi saha yönüne çevir (mavi taraf ve dik telefon döndürülmüş görür)
  function sahaYonu(sx, sy){
    if (!K.olcu) return [sx, sy];
    const inv = K.olcu.inv, a = inv.transformPoint(new DOMPoint(0, 0)), b = inv.transformPoint(new DOMPoint(sx, sy));
    let x = b.x - a.x, y = b.y - a.y; const d = uz(x, y); return d ? [x / d * Math.min(1, uz(sx, sy)), y / d * Math.min(1, uz(sx, sy))] : [0, 0];
  }
  function girisGonder(hemen){
    if (!aktif()) return;
    let sx = 0, sy = 0; K.tus.forEach(c => { if (TUS[c]){ sx += TUS[c][0]; sy += TUS[c][1]; } });
    if (K.joy.x || K.joy.y){ sx = K.joy.x; sy = K.joy.y; }
    const [x, y] = sahaYonu(sx, sy), k = K.tus.has('Space') || K.kick ? 1 : 0;
    const g = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, k };
    const ayni = K.gonder && K.gonder.x === g.x && K.gonder.y === g.y && K.gonder.k === g.k;
    const now = performance.now(), hareketli = g.x || g.y || g.k;
    // değişince hemen; aynıysa hareket varken 150 ms'de bir, dururken saniyede bir (kaybolan mesaja karşı)
    if (ayni && now - K.gT < (hareketli ? 150 : 1000)) return;
    void hemen;
    K.gonder = g; K.gT = now; K.yerel = g;
    tableAct(Object.assign({ type: 'i' }, g));
  }
  function joyKur(){
    const j = K.el.querySelector('.hx-joy'), top = j.querySelector('i'), kick = K.el.querySelector('.hx-kick');
    let id = null;
    const ayarla = e => {
      const r = j.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
      let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const d = uz(dx, dy); if (d > 1){ dx /= d; dy /= d; }
      if (d < 0.15){ dx = 0; dy = 0; }
      K.joy = { x: dx, y: dy }; top.style.transform = 'translate(' + dx * R * 0.55 + 'px,' + dy * R * 0.55 + 'px)';
      girisGonder(true);
    };
    j.addEventListener('pointerdown', e => { id = e.pointerId; j.setPointerCapture(id); ayarla(e); e.preventDefault(); });
    j.addEventListener('pointermove', e => { if (e.pointerId === id) ayarla(e); });
    const bit = e => { if (e.pointerId !== id) return; id = null; K.joy = { x: 0, y: 0 }; top.style.transform = ''; girisGonder(true); };
    j.addEventListener('pointerup', bit); j.addEventListener('pointercancel', bit);
    kick.addEventListener('pointerdown', e => { K.kick = true; kick.classList.add('bas'); girisGonder(true); e.preventDefault(); });
    const kb = () => { K.kick = false; kick.classList.remove('bas'); girisGonder(true); };
    kick.addEventListener('pointerup', kb); kick.addEventListener('pointercancel', kb); kick.addEventListener('pointerleave', kb);
  }

  // ---------- ses ----------
  function sesCal(f){
    if (!K.ses || typeof audioCtx === 'undefined' || !audioCtx || (typeof deafened !== 'undefined' && deafened) || audioCtx.state !== 'running') return;
    const ac = audioCtx, t = ac.currentTime;
    try {
      if (f === 's' || f === 'v' || f === 'd'){
        const L = Math.floor(ac.sampleRate * 0.07), b = ac.createBuffer(1, L, ac.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 3);
        const s = ac.createBufferSource(); s.buffer = b; const bp = ac.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = f === 's' ? 900 : f === 'v' ? 600 : 400;
        const g = ac.createGain(); g.gain.value = f === 's' ? 0.9 : 0.35; s.connect(bp); bp.connect(g); g.connect(ac.destination); s.start(t);
        if (f === 's'){ const o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.12); og.gain.setValueAtTime(0.35, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + 0.16); }
      } else if (f[0] === 'g' || f === 'a'){
        const L = Math.floor(ac.sampleRate * 1.6), b = ac.createBuffer(1, L, ac.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < L; i++){ const u = i / L; d[i] = (Math.random() * 2 - 1) * Math.min(1, u * 8) * (1 - u); }
        const s = ac.createBufferSource(); s.buffer = b; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
        const g = ac.createGain(); g.gain.value = 0.35; s.connect(bp); bp.connect(g); g.connect(ac.destination); s.start(t);
        const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = 2900; og.gain.setValueAtTime(0.06, t); og.gain.setValueAtTime(0.06, t + 0.35); og.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + 0.55);
      } else if (f === 'c' || f === 'bip' || f === 'bip2'){
        const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f === 'c' ? 1200 : f === 'bip' ? 660 : 990;
        g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.2);
      }
    } catch(e){}
  }

  // ---------- çizim ----------
  function olcuAl(){
    const sh = K.saha, alan = K.el.querySelector('.hx-alan'), cv = K.cv, dpr = Math.min(2, window.devicePixelRatio || 1);
    const bw = alan.clientWidth; if (!bw) return null;
    const dik = window.innerHeight > window.innerWidth * 1.15 && bw < 700;
    const P = 40, dw = dik ? H + 2 * P : W + 2 * (P + 20), dh = dik ? W + 2 * (P + 20) : H + 2 * P;
    const ust = sh.getBoundingClientRect().top;
    const maxH = Math.max(240, dik ? window.innerHeight - 170 : window.innerHeight - Math.max(60, ust) - 112);
    const k = Math.min(bw / dw, maxH / dh);
    const cw = Math.round(dw * k), ch = Math.round(dh * k);
    sh.style.width = cw + 'px';
    cv.style.width = cw + 'px'; cv.style.aspectRatio = cw + ' / ' + ch; cv.style.height = 'auto';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const kk = k * dpr, ters = K.seat === 1, ox = (dik ? P : P + 20) * kk, oy = (dik ? P + 20 : P) * kk;
    let m;
    if (!dik) m = ters ? new DOMMatrix([-kk, 0, 0, -kk, ox + W * kk, oy + H * kk]) : new DOMMatrix([kk, 0, 0, kk, ox, oy]);
    else m = ters ? new DOMMatrix([0, kk, -kk, 0, ox + H * kk, oy]) : new DOMMatrix([0, -kk, kk, 0, ox, oy + W * kk]);
    K.olcu = { m, inv: m.inverse(), kk, dik, seat: K.seat, zemin: null, rot: Math.atan2(m.b, m.a) };
    return K.olcu;
  }
  function zeminCiz(ol){
    const z = document.createElement('canvas'); z.width = K.cv.width; z.height = K.cv.height;
    const x = z.getContext('2d');
    // stadyum çerçevesi
    const gr = x.createLinearGradient(0, 0, 0, z.height); gr.addColorStop(0, '#1a2233'); gr.addColorStop(1, '#0f1522'); x.fillStyle = gr; x.fillRect(0, 0, z.width, z.height);
    x.setTransform(ol.m);
    yuvarlak(x, -60, -40, W + 120, H + 80, 70); x.fillStyle = '#2c3a52'; x.fill();
    yuvarlak(x, -48, -30, W + 96, H + 60, 60);
    const cim = x.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7); cim.addColorStop(0, '#3f7a35'); cim.addColorStop(1, '#244a20');
    x.fillStyle = cim; x.fill();
    x.save(); yuvarlak(x, -48, -30, W + 96, H + 60, 60); x.clip();
    for (let i = 0; i < 12; i++){ if (i % 2) continue; x.fillStyle = 'rgba(255,255,255,0.035)'; x.fillRect(-48 + i * (W + 96) / 12, -30, (W + 96) / 12, H + 60); }
    x.restore();
    x.strokeStyle = 'rgba(235,245,230,0.75)'; x.lineWidth = 3;
    x.strokeRect(0, 0, W, H);
    x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.stroke();
    x.beginPath(); x.arc(W / 2, H / 2, 80, 0, 6.283); x.stroke();
    x.fillStyle = 'rgba(235,245,230,0.8)'; x.beginPath(); x.arc(W / 2, H / 2, 5, 0, 6.283); x.fill();
    [0, 1].forEach(yan => {
      const bx = yan ? W : 0, sx = yan ? -1 : 1;
      x.strokeRect(yan ? W - 130 : 0, 105, 130, 350); x.strokeRect(yan ? W - 48 : 0, 185, 48, 190);
      x.beginPath(); x.arc(bx + sx * 92, H / 2, 4.5, 0, 6.283); x.fill();
      x.save(); x.beginPath(); x.rect(yan ? W - 190 : 130, 0, 60, H); x.clip(); x.beginPath(); x.arc(bx + sx * 92, H / 2, 70, 0, 6.283); x.stroke(); x.restore();
      [[bx, 0], [bx, H]].forEach(([cx, cy]) => { x.beginPath(); x.arc(cx, cy, 13, 0, 6.283); x.save(); x.clip(); x.restore(); });
      const gx = yan ? W : -DERIN;
      x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(gx, KALE[0], DERIN, KALE[1] - KALE[0]);
      x.save(); x.strokeStyle = 'rgba(255,255,255,0.45)'; x.lineWidth = 1;
      for (let q = 0; q <= DERIN; q += 6){ x.beginPath(); x.moveTo(gx + q, KALE[0]); x.lineTo(gx + q, KALE[1]); x.stroke(); }
      for (let q = KALE[0]; q <= KALE[1]; q += 6){ x.beginPath(); x.moveTo(gx, q); x.lineTo(gx + DERIN, q); x.stroke(); }
      x.restore();
      x.save(); x.strokeStyle = '#e8edf3'; x.lineWidth = 6; x.lineJoin = 'round'; x.beginPath(); x.moveTo(bx, KALE[0]); x.lineTo(yan ? W + DERIN : -DERIN, KALE[0]); x.lineTo(yan ? W + DERIN : -DERIN, KALE[1]); x.lineTo(bx, KALE[1]); x.stroke();
      x.fillStyle = '#fff'; [KALE[0], KALE[1]].forEach(cy => { x.beginPath(); x.arc(bx, cy, 5, 0, 6.283); x.fill(); }); x.restore();
    });
    return z;
  }
  function yuvarlak(x, a, b, w, h, r){ x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  const RENK = [{ ana: '#ff3347', acik: '#ff8a96', koyu: '#a5101f' }, { ana: '#1f74ff', acik: '#7ab3ff', koyu: '#0b3fa0' }];
  function oyuncu(c, p, k, kk, sut, ben){
    const r = RENK[k], v = uz(p.vx || 0, p.vy || 0);
    c.save();
    if (v > 1){ // hareket izi
      const dx = -(p.vx || 0) / v, dy = -(p.vy || 0) / v, L = Math.min(70, v * 12);
      const g = c.createLinearGradient(p.x, p.y, p.x + dx * L, p.y + dy * L); g.addColorStop(0, r.ana + '88'); g.addColorStop(1, r.ana + '00');
      c.strokeStyle = g; c.lineWidth = R_O * 1.7; c.lineCap = 'round'; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + dx * L, p.y + dy * L); c.stroke();
    }
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(p.x + 5, p.y + 8, R_O, R_O * 0.9, 0, 0, 6.283); c.fill();
    if (ben){ c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2; c.setLineDash([4, 5]); c.beginPath(); c.arc(p.x, p.y, R_O + 9, 0, 6.283); c.stroke(); c.setLineDash([]); }
    c.shadowColor = r.ana; c.shadowBlur = 14 * kk;
    const g = c.createRadialGradient(p.x - 7, p.y - 9, 3, p.x, p.y, R_O); g.addColorStop(0, r.acik); g.addColorStop(0.7, r.ana); g.addColorStop(1, r.koyu);
    c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, R_O, 0, 6.283); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = sut ? '#ffffff' : 'rgba(0,0,0,0.45)'; c.lineWidth = sut ? 4 : 2.5; c.beginPath(); c.arc(p.x, p.y, R_O - 1, 0, 6.283); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2.5; c.beginPath(); c.arc(p.x, p.y, R_O * 0.7, 0, 6.283); c.stroke();
    c.restore();
  }
  function topCiz(c, t, vx, vy){
    const v = uz(vx, vy);
    c.save();
    if (v > 2){ const dx = -vx / v, dy = -vy / v, L = Math.min(110, v * 9);
      const g = c.createLinearGradient(t.x, t.y, t.x + dx * L, t.y + dy * L); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = g; c.lineWidth = R_T * 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(t.x, t.y); c.lineTo(t.x + dx * L, t.y + dy * L); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(t.x + 3, t.y + 5, R_T, R_T * 0.9, 0, 0, 6.283); c.fill();
    const g = c.createRadialGradient(t.x - 4, t.y - 5, 1, t.x, t.y, R_T); g.addColorStop(0, '#fff'); g.addColorStop(1, '#cdd2d8');
    c.fillStyle = g; c.beginPath(); c.arc(t.x, t.y, R_T, 0, 6.283); c.fill();
    c.fillStyle = '#161616';
    const bg = (cx, cy, r, a0) => { c.beginPath(); for (let k = 0; k < 5; k++){ const a = a0 + k * 1.2566; c[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.closePath(); c.fill(); };
    const don = (t.x + t.y) / 8; bg(t.x, t.y, R_T * 0.36, don);
    c.save(); c.beginPath(); c.arc(t.x, t.y, R_T, 0, 6.283); c.clip();
    for (let k = 0; k < 5; k++){ const a = don + k * 1.2566 + 0.63; bg(t.x + Math.cos(a) * R_T * 0.95, t.y + Math.sin(a) * R_T * 0.95, R_T * 0.3, a); }
    c.restore(); c.restore();
  }
  function cizDongu(now){
    requestAnimationFrame(cizDongu);
    if (!K.el || !document.body.contains(K.el)){ K.el = null; return; }
    if (K.el.offsetParent === null) return;
    if (!K.olcu || K.olcu.seat !== K.seat) olcuAl();
    const ol = K.olcu; if (!ol) return;
    if (!ol.zemin) ol.zemin = zeminCiz(ol);
    const o = owned.get(K.id), g = o && o.state;
    let t, P, ph, u, sut;
    if (g){ t = g.top; P = g.o; ph = g.ph; u = Math.max(0, g.until - Date.now()); sut = [g.gir[0].k, g.gir[1].k]; }
    else if (K.kare){
      const f = K.kare, dt = Math.min(0.1, (now - K.kareT) / 1000) * 60;
      ph = f.ph; u = Math.max(0, f.u - (now - K.kareT));
      const ileri = f.ph === 'oyun' || f.ph === 'gol' ? dt : 0;
      t = { x: f.p[0] + f.p[2] * ileri, y: f.p[1] + f.p[3] * ileri, vx: f.p[2], vy: f.p[3] };
      P = [f.a, f.b].map(q => ({ x: q[0] + q[2] * dt, y: q[1] + q[3] * dt, vx: q[2], vy: q[3] }));
      sut = [f.a[4], f.b[4]];
      if (K.yerel && K.seat >= 0) sut[K.seat] = K.yerel.k;
    } else return;
    const c = K.cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(ol.zemin, 0, 0);
    c.setTransform(ol.m);
    topCiz(c, t, t.vx || 0, t.vy || 0);
    P.forEach((p, k) => oyuncu(c, p, k, ol.kk, sut[k], k === K.seat));
    // isimler ve sohbet balonları (ekran düzleminde)
    c.setTransform(1, 0, 0, 1, 0, 0);
    const d = Math.min(2, window.devicePixelRatio || 1), s = K.s;
    P.forEach((p, k) => {
      const q = ol.m.transformPoint(new DOMPoint(p.x, p.y)), ust = q.y - (R_O + 14) * ol.kk;
      const ad = s && s.seats[k] ? s.seats[k].name : '';
      c.font = '800 ' + Math.round(13 * d) + 'px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillText(ad, q.x + d, ust + d);
      c.fillStyle = k ? '#7ab3ff' : '#ff7d8a'; c.fillText(ad, q.x, ust);
      const b = K.balon[k];
      if (b.m && now - b.t < 2600){
        c.globalAlpha = Math.min(1, (2600 - (now - b.t)) / 400);
        c.font = '700 ' + Math.round(13 * d) + 'px system-ui,sans-serif';
        const w = c.measureText(b.m).width + 18 * d, h = 24 * d, by = ust - 18 * d - h;
        c.fillStyle = 'rgba(255,255,255,0.95)'; yuvarlak(c, q.x - w / 2, by, w, h, 10 * d); c.fill();
        c.beginPath(); c.moveTo(q.x - 6 * d, by + h); c.lineTo(q.x + 6 * d, by + h); c.lineTo(q.x, by + h + 7 * d); c.fill();
        c.fillStyle = '#111'; c.textBaseline = 'middle'; c.fillText(b.m, q.x, by + h / 2);
        c.globalAlpha = 1;
      }
    });
    const yazi = K.el.querySelector('.hx-yazi');
    let tx = '';
    if (ph === 'geri'){ const n = Math.ceil(u / 1000); tx = n > 0 ? String(n) : 'BAŞLA!'; if (K.geri !== n){ K.geri = n; sesCal(n > 0 ? 'bip' : 'bip2'); } }
    else if (ph === 'gol'){ tx = 'GOL!'; const son = g ? g.son : K.kare ? K.kare.son : -1; yazi.dataset.renk = son === 1 ? 'm' : 'k'; K.geri = null; }
    else K.geri = null;
    if (yazi.textContent !== tx){ yazi.textContent = tx; yazi.classList.toggle('acik', !!tx); }
  }
})();
