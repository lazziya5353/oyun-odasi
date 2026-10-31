// Hava Hokeyi: 2 kişilik, gerçek zamanlı. Tek oyunculu (bota karşı) ya da çok oyunculu.
// Fiziği masayı açan kişinin bilgisayarı hesaplar (saniyede 60 adım) ve saniyede ~30 kez herkese gönderir;
// oyuncular sadece tokmaklarının yerini yollar. Kendi tokmağın ekranda gecikmesiz çizilir.
// Saha 1000x500 birim; 0. koltuk solda (kırmızı), 1. koltuk sağda (mavi). Herkes kendi yarı sahasında kalır.
(function(){
  const W = 1000, H = 500, R_P = 18, R_T = 34, KALE = [188, 312], ORTA = W / 2;
  const SURTUNME = 0.9965, SEKME = 0.88, VMAX = 30, TMAX = 42, ALT = 4;
  const ZORLUK = { kolay: { hiz: 5.5, tepki: 0.55 }, orta: { hiz: 8.5, tepki: 0.8 }, zor: { hiz: 13, tepki: 1 } };
  const sn = ms => Math.max(0, Math.ceil(ms / 1000));
  const saat = ms => { const s = sn(ms); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const kis = (v, a, b) => Math.max(a, Math.min(b, v));
  const yari = (k, x) => k === 0 ? kis(x, R_T, ORTA - R_T) : kis(x, ORTA + R_T, W - R_T);

  // ---------- fizik (masa sahibinde) ----------
  function yeniDurum(op){
    return { ph: 'geri', until: Date.now() + 3000, skor: [0, 0], kalan: op.sure * 1000, altin: false, kazanan: -1, son: -1,
      puk: { x: ORTA, y: H / 2, vx: 0, vy: 0 }, tok: [{ x: 120, y: H / 2, vx: 0, vy: 0, tx: 120, ty: H / 2 }, { x: W - 120, y: H / 2, vx: 0, vy: 0, tx: W - 120, ty: H / 2 }],
      fx: [], seq: 0 };
  }
  function pukYerlestir(g, kim){   // gol yiyenin sahasına
    g.puk = { x: kim === 0 ? ORTA - 160 : ORTA + 160, y: H / 2, vx: 0, vy: 0 };
  }
  function botDusun(g, k, zor){
    const t = g.tok[k], p = g.puk, z = ZORLUK[zor] || ZORLUK.orta;
    const benim = k === 0 ? p.x < ORTA + 40 : p.x > ORTA - 40, kaleX = k === 0 ? 0 : W, ev = k === 0 ? 70 : W - 70;
    let tx, ty;
    // puka yapışıp kaldıysa (duvara / rakibe sıkışma) biraz geri çekil, sonra başka açıdan gel
    const yakin = Math.hypot(p.x - t.x, p.y - t.y) < R_P + R_T + 5, yavas = Math.hypot(p.vx, p.vy) < 1.2;
    t._yap = yakin && yavas ? (t._yap || 0) + 1 : 0;
    if (t._yap > 35){ t._geri = 30; t._yap = 0; }
    const koseX = p.x < 75 || p.x > W - 75, koseY = p.y < 75 || p.y > H - 75;
    if (benim && koseX && koseY && yavas){ t._geri = Math.max(t._geri || 0, 20); }   // köşedeki puka bastırma, kayıp çıkmasını bekle
    if (t._geri > 0){ t._geri--; tx = ev; ty = H / 2 + (p.y < H / 2 ? 90 : -90); }
    else if (benim && g.ph === 'oyun'){
      // pukun arkasına geç, rakip kaleye doğru vur
      const hx = k === 0 ? W : 0, hy = H / 2 + (Math.random() - 0.5) * 60;
      let dx = p.x - hx, dy = p.y - hy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const arkada = k === 0 ? t.x < p.x - 6 : t.x > p.x + 6;
      if (arkada){ tx = p.x - dx * 6; ty = p.y - dy * 6; }
      else { tx = p.x + dx * (R_P + R_T + 14); ty = p.y + dy * (R_P + R_T + 14) + (t.y < p.y ? -30 : 30); }
    } else {
      tx = ev + (k === 0 ? 40 : -40) * (1 - z.tepki); ty = H / 2 + (p.y - H / 2) * 0.55 * z.tepki;
      tx = k === 0 ? Math.min(tx, kaleX + 110) : Math.max(tx, kaleX - 110);
    }
    const dx = tx - t.x, dy = ty - t.y, d = Math.hypot(dx, dy), m = Math.min(d, z.hiz);
    t.tx = t.x + (d ? dx / d * m : 0); t.ty = t.y + (d ? dy / d * m : 0);
  }
  function adim(o){
    const g = o.state, s = o.sum, now = Date.now();
    if (g.ph === 'geri' || g.ph === 'gol'){ if (now >= g.until){ g.ph = 'oyun'; sendViews(o); } }
    if (g.ph === 'bitti') return;
    s.seats.forEach((x, k) => { if (x && x.bot) botDusun(g, k, s.opts.zor); });
    // tokmaklar hedefe (en fazla TMAX birim/adım), alt adımlarda puk ile çarpışma
    const hedef = g.tok.map((t, k) => { let dx = yari(k, t.tx) - t.x, dy = kis(t.ty, R_T, H - R_T) - t.y; const d = Math.hypot(dx, dy); if (d > TMAX){ dx *= TMAX / d; dy *= TMAX / d; } return { dx, dy }; });
    const oyunda = g.ph === 'oyun';
    for (let a = 0; a < ALT; a++){
      g.tok.forEach((t, k) => { t.x += hedef[k].dx / ALT; t.y += hedef[k].dy / ALT; t.vx = hedef[k].dx; t.vy = hedef[k].dy; });
      if (!oyunda) continue;
      const p = g.puk;
      p.x += p.vx / ALT; p.y += p.vy / ALT;
      g.tok.forEach(t => {
        let dx = p.x - t.x, dy = p.y - t.y; const d = Math.hypot(dx, dy), R = R_P + R_T;
        if (d < R && d > 0.0001){
          const nx = dx / d, ny = dy / d;
          p.x = t.x + nx * R; p.y = t.y + ny * R;
          const rvx = p.vx - t.vx, rvy = p.vy - t.vy, vn = rvx * nx + rvy * ny;
          if (vn < 0){ p.vx -= (1 + SEKME) * vn * nx; p.vy -= (1 + SEKME) * vn * ny; if (-vn > 2) g.fx.push('v'); }
        }
      });
      duvar(g);
      if (g.ph !== 'oyun') break;
    }
    if (oyunda && g.ph === 'oyun'){
      const p = g.puk; p.vx *= SURTUNME; p.vy *= SURTUNME;
      // orta çizgide iki tokmak arasında sıkışan puk kendiliğinden kurtulsun
      g.dur = Math.hypot(p.vx, p.vy) < 0.8 ? (g.dur || 0) + 1 : 0;
      if (g.dur > 75 && Math.abs(p.x - ORTA) < R_P + R_T){ g.dur = 0; p.vx = (Math.random() < 0.5 ? -1 : 1) * 4; p.vy = p.y < H / 2 ? 3 : -3; g.fx.push('d'); }
      // köşeye / duvara sıkışıp uzun süre kıpırdamazsa ortaya doğru hafifçe kayar (hava masası gibi)
      const duvarda = p.x < R_P + 6 || p.x > W - R_P - 6 || p.y < R_P + 6 || p.y > H - R_P - 6;
      const kose = (p.x < 75 || p.x > W - 75) && (p.y < 75 || p.y > H - 75);
      if (g.dur > (kose ? 70 : 120) && duvarda){ g.dur = 0; const dx = ORTA - p.x, dy = H / 2 - p.y, d = Math.hypot(dx, dy) || 1; p.vx = dx / d * 6; p.vy = dy / d * 6; }
      const v = Math.hypot(p.vx, p.vy); if (v > VMAX){ p.vx *= VMAX / v; p.vy *= VMAX / v; }
      g.kalan -= 1000 / 60;
      if (g.kalan <= 0 && !g.altin){
        g.kalan = 0;
        if (g.skor[0] === g.skor[1]){ g.altin = true; g.fx.push('a'); sendViews(o); }
        else bitir(o);
      }
    }
  }
  function duvar(g){
    const p = g.puk;
    const agiz = p.y > KALE[0] + 2 && p.y < KALE[1] - 2;
    if (p.y < R_P){ p.y = R_P; if (p.vy < 0){ p.vy = -p.vy * SEKME; g.fx.push('d'); } }
    if (p.y > H - R_P){ p.y = H - R_P; if (p.vy > 0){ p.vy = -p.vy * SEKME; g.fx.push('d'); } }
    if (!agiz){
      if (p.x < R_P){ p.x = R_P; if (p.vx < 0){ p.vx = -p.vx * SEKME; g.fx.push('d'); } }
      if (p.x > W - R_P){ p.x = W - R_P; if (p.vx > 0){ p.vx = -p.vx * SEKME; g.fx.push('d'); } }
    }
    // kale direkleri
    [[0, KALE[0]], [0, KALE[1]], [W, KALE[0]], [W, KALE[1]]].forEach(([cx, cy]) => {
      const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
      if (d < R_P && d > 0.001){ const nx = dx / d, ny = dy / d; p.x = cx + nx * R_P; p.y = cy + ny * R_P; const vn = p.vx * nx + p.vy * ny; if (vn < 0){ p.vx -= (1 + SEKME) * vn * nx; p.vy -= (1 + SEKME) * vn * ny; g.fx.push('d'); } }
    });
    if (p.x < -R_P) gol(g, 1);
    else if (p.x > W + R_P) gol(g, 0);
  }
  function gol(g, atan){
    g.skor[atan]++; g.son = atan; g.fx.push('g' + atan);
    g._gol = true;
    pukYerlestir(g, 1 - atan);
    g.ph = 'gol'; g.until = Date.now() + 1600;
    if (g.altin) g._bitir = true;
  }
  function bitir(o){
    const g = o.state; g.ph = 'bitti';
    g.kazanan = g.skor[0] > g.skor[1] ? 0 : g.skor[1] > g.skor[0] ? 1 : -1;
    const s = o.sum, ad = k => s.seats[k] ? s.seats[k].name : (k ? 'Mavi' : 'Kırmızı');
    addSys('🏒 Hava Hokeyi bitti: ' + ad(0) + ' ' + g.skor[0] + ' - ' + g.skor[1] + ' ' + ad(1));
    sendViews(o);
  }
  function dongu(o){
    if (o.hk) return;
    let son = performance.now(), birikim = 0, gonder = 0;
    o.hk = setInterval(() => {
      if (owned.get(o.sum.id) !== o || !o.state || o.sum.status !== 'playing'){ clearInterval(o.hk); o.hk = null; return; }
      const g = o.state, now = performance.now();
      birikim = Math.min(birikim + now - son, 140); son = now;
      while (birikim >= 1000 / 60){ birikim -= 1000 / 60; adim(o); if (g._gol){ g._gol = false; if (g._bitir){ g._bitir = false; bitir(o); } else sendViews(o); } if (g.ph === 'bitti') break; }
      if (++gonder % 2 === 0 || g.fx.length) kare(o);
      if (g.ph === 'bitti'){ kare(o); clearInterval(o.hk); o.hk = null; }
    }, 16);
  }
  const yuv = v => Math.round(v * 10) / 10;
  function kare(o){
    const g = o.state;
    g.seq++;
    const ev = { k: 'f', q: g.seq, p: [yuv(g.puk.x), yuv(g.puk.y), yuv(g.puk.vx), yuv(g.puk.vy)], a: [yuv(g.tok[0].x), yuv(g.tok[0].y)], b: [yuv(g.tok[1].x), yuv(g.tok[1].y)],
      t: Math.round(g.kalan), s: g.skor, ph: g.ph, al: g.altin ? 1 : 0, fx: g.fx.length ? [...new Set(g.fx)] : 0, u: g.ph === 'geri' || g.ph === 'gol' ? Math.max(0, g.until - Date.now()) : 0 };
    g.fx = [];
    sendEvent(o, ev, peer.id);
    yerelKare(o.sum.id, ev);
  }

  // ---------- kayıt ----------
  registerTableGame('hokey', {
    name: 'Hava Hokeyi', icon: '🏒', seats: 2, joinMidGame: true, yeni: true,
    cleanOpts: o => ({
      sure: kis(Math.round(+o.sure) || 180, 30, 1800),
      zor: ZORLUK[o.zor] ? o.zor : 'orta',
      mod: o.mod === 'tek' ? 'tek' : 'cok'
    }),
    variantName: s => (s.seats[1] && s.seats[1].bot ? 'Tek oyunculu (' + { kolay: 'kolay', orta: 'orta', zor: 'zor' }[s.opts.zor] + ' bot)' : 'Çok oyunculu') + ' · ' + saat(s.opts.sure * 1000),
    seatLabel: k => k ? '🔵 Mavi' : '🔴 Kırmızı',
    waitText: (s, own) => own ? 'Arkadaşın boş koltuğa otursun ya da bota karşı oynamak için koltuğa bot ekle, sonra “Oyunu başlat”a bas.' : 'Boş koltuğa otur; masayı açan başlatınca oyun burada açılır.',
    makeCard: {
      desc: '2 kişi ya da bota karşı. Fareyle / parmağınla tokmağı sür, pukı rakip kaleye sok!',
      opts: '<label>Mod<select data-o="mod"><option value="tek">Tek oyunculu (bota karşı)</option><option value="cok" selected>Çok oyunculu (arkadaşınla)</option></select></label>' +
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
      if (a.type === 'p' && seat >= 0 && Number.isFinite(+a.x) && Number.isFinite(+a.y)){ g.tok[seat].tx = +a.x; g.tok[seat].ty = +a.y; return; }
      if (who !== o.sum.owner) return;
      if (a.type === 'yeni' && g.ph === 'bitti'){
        if (a.sure) o.sum.opts.sure = kis(Math.round(+a.sure) || o.sum.opts.sure, 30, 1800);
        o.state = yeniDurum(o.sum.opts); pushSum(o); sendViews(o); pump(o); return;
      }
      if (a.type === 'mod' && g.ph === 'bitti'){
        const x = o.sum.seats[1];
        if (a.tek && (!x || x.bot)){ o.sum.seats[1] = { id: 'bot1', name: botAdi(o.sum, 3), bot: true }; o.sum.opts.mod = 'tek'; }
        else if (!a.tek && x && x.bot){ o.sum.seats[1] = null; o.sum.opts.mod = 'cok'; }
        pushSum(o); sendViews(o); return;
      }
    },
    pump(o){ if (o.state && o.state.ph !== 'bitti') dongu(o); },
    view(o, seat){
      const g = o.state, s = o.sum;
      return { ph: g.ph, skor: g.skor.slice(), kalan: Math.round(g.kalan), altin: g.altin, kazanan: g.kazanan, son: g.son,
        u: Math.max(0, g.until - Date.now()), sure: s.opts.sure, zor: s.opts.zor, bot: s.seats.map(x => !!(x && x.bot)), seq: g.seq };
    },
    render: (body, s, lv) => ciz(body, s, lv),
    onEvent: (ev, s) => { if (ev && ev.k === 'f') yerelKare(s.id, ev); },
    kazanan: o => o.state && o.state.ph === 'bitti' && o.state.kazanan >= 0 && o.sum.seats[o.state.kazanan] ? [o.sum.seats[o.state.kazanan].id] : null,
    isMyTurn: () => false
  });
  // tek oyunculu: masa açılınca karşıya bot oturt ve hemen başlat
  function tekBaslat(){
    const o = [...owned.values()].reverse().find(x => x.sum.game === 'hokey' && x.sum.status === 'waiting' && x.sum.opts.mod === 'tek');
    if (!o) return;
    if (!o.sum.seats[1]) ownerBot(o, 1, true);
    ownerStart(o);
  }
  // makeCard'da "kendim belirleyeyim" seçilince dakika kutusu açılsın
  document.addEventListener('change', e => {
    const t = e.target; if (!t.matches || !t.matches('.make-card [data-o=sure]')) return;
    const l = t.closest('.make-card').querySelector('[data-ozel]'); if (l) l.hidden = t.value !== 'ozel';
  });

  // ---------- istemci: çizim ve giriş ----------
  const K = { id: null, kare: null, kareT: 0, onceki: null, gir: null, gonderT: 0, el: null, ses: (() => { try { return localStorage.getItem('oyunodasi-hokey-ses') !== '0'; } catch(e){ return true; } })() };
  function yerelKare(id, ev){
    if (K.id !== id) return;
    K.onceki = K.kare; K.kare = ev; K.kareT = performance.now();
    if (ev.fx) ev.fx.forEach(sesCal);
    if (K.el) tabela(ev.s, ev.t, ev.ph, ev.al);
  }
  function ciz(body, s, lv){
    const v = lv.v, seat = lv.seat;
    if (!K.el || K.el.dataset.tid !== s.id || !body.contains(K.el)){
      body.innerHTML = '';
      K.id = s.id; K.kare = null; K.gir = null;
      const el = document.createElement('div'); el.className = 'hk'; el.dataset.tid = s.id;
      el.innerHTML = '<div class="hk-ust">'
        + '<div class="hk-mod" role="group" aria-label="Oyun modu"><button type="button" data-mod="tek">Tek<span class="hk-uz"> oyunculu</span></button><span class="hk-anahtar"><i></i></span><button type="button" data-mod="cok">Çok<span class="hk-uz"> oyunculu</span></button></div>'
        + '<div class="hk-tabela"><div class="hk-o hk-k"><span class="hk-av"></span><b class="hk-ad"></b><span class="hk-skor">0</span></div>'
        + '<div class="hk-orta"><span class="hk-sure">00:00</span><span class="hk-vs">VS</span></div>'
        + '<div class="hk-o hk-m"><span class="hk-skor">0</span><b class="hk-ad"></b><span class="hk-av"></span></div></div>'
        + '<div class="hk-dug"><button type="button" data-ses title="Ses aç / kapat"></button><button type="button" data-yardim title="Nasıl oynanır?">❓</button><button type="button" data-cik title="Salona dön">⏏</button></div></div>'
        + '<div class="hk-saha"><canvas></canvas><div class="hk-yazi"></div></div><div class="hk-alt"></div>';
      body.append(el); K.el = el; K.cv = el.querySelector('canvas'); K.saha = el.querySelector('.hk-saha');
      el.querySelector('[data-ses]').onclick = () => { K.ses = !K.ses; try { localStorage.setItem('oyunodasi-hokey-ses', K.ses ? '1' : '0'); } catch(e){} sesDug(); };
      el.querySelector('[data-yardim]').onclick = () => { if (typeof nasilAc === 'function') nasilAc('hokey'); };
      el.querySelector('[data-cik]').onclick = () => closeTableView();
      el.querySelectorAll('[data-mod]').forEach(b => b.onclick = () => modDegis(b.dataset.mod === 'tek'));
      el.querySelector('.hk-anahtar').onclick = () => { const t = tables.get(K.id); modDegis(!(t && t.seats[1] && t.seats[1].bot)); };
      girisKur();
      new ResizeObserver(() => { K.olcu = null; }).observe(K.saha);
      sesDug();
      if (window.innerWidth < 700) setTimeout(() => el.scrollIntoView({ block: 'start', behavior: 'smooth' }), 300);
      if (!K.dongu){ K.dongu = true; requestAnimationFrame(cizDongu); }
    }
    K.seat = seat; K.v = v; K.s = s;
    // tabela
    const ad = k => s.seats[k] ? s.seats[k].name : '—';
    const o = K.el;
    [['.hk-k', 0], ['.hk-m', 1]].forEach(([q, k]) => {
      const b = o.querySelector(q);
      b.querySelector('.hk-ad').textContent = ad(k) + (seat === k ? ' (sen)' : '');
      const av = b.querySelector('.hk-av'), x = s.seats[k];
      const anahtar = x ? (x.bot ? 'bot' : x.id) : '';
      if (av._k !== anahtar){ av._k = anahtar; av.innerHTML = ''; if (x && x.bot) av.textContent = '🤖'; else if (x){ const p = x.id === peer.id ? null : peers.get(x.id); if (typeof paintAvatar === 'function') paintAvatar(av, x.name, x.id === peer.id ? myFoto : p && p.foto); } }
    });
    const tek = !!(s.seats[1] && s.seats[1].bot);
    o.querySelector('.hk-mod').classList.toggle('tek', tek);
    o.querySelectorAll('[data-mod]').forEach(b => b.classList.toggle('on', (b.dataset.mod === 'tek') === tek));
    o.querySelector('.hk-mod').title = s.owner === peer.id ? (v.ph === 'bitti' ? 'Modu değiştir' : 'Modu maç bitince değiştirebilirsin') : 'Modu masayı açan seçer';
    tabela(v.skor, v.kalan, v.ph, v.altin);
    altCiz(s, v, seat);
  }
  function modDegis(tek){
    const s = tables.get(K.id); if (!s) return;
    if (s.owner !== peer.id){ toast('Modu masayı açan değiştirebilir'); return; }
    const v = K.v;
    if (v && v.ph !== 'bitti'){ toast('Modu maç bitince değiştirebilirsin'); return; }
    if (!tek && s.seats[1] && !s.seats[1].bot) return;
    if (tek && s.seats[1] && !s.seats[1].bot){ toast('Mavi koltukta bir arkadaşın oturuyor'); return; }
    tableAct({ type: 'mod', tek });
  }
  function tabela(skor, kalan, ph, altin){
    if (!K.el) return;
    const sk = K.el.querySelectorAll('.hk-skor');
    if (sk[0].textContent != skor[0]){ sk[0].textContent = skor[0]; sk[0].classList.remove('vur'); void sk[0].offsetWidth; sk[0].classList.add('vur'); }
    if (sk[1].textContent != skor[1]){ sk[1].textContent = skor[1]; sk[1].classList.remove('vur'); void sk[1].offsetWidth; sk[1].classList.add('vur'); }
    const su = K.el.querySelector('.hk-sure');
    su.textContent = altin ? 'ALTIN GOL' : saat(kalan);
    su.classList.toggle('az', !altin && kalan <= 10000 && ph === 'oyun');
    su.classList.toggle('altin', !!altin);
  }
  function sesDug(){ if (K.el) K.el.querySelector('[data-ses]').textContent = K.ses ? '🔊' : '🔇'; }
  function altCiz(s, v, seat){
    const alt = K.el.querySelector('.hk-alt'); alt.innerHTML = '';
    if (v.ph === 'bitti'){
      const ad = k => s.seats[k] ? s.seats[k].name : '';
      const p = document.createElement('div'); p.className = 'hk-bitti';
      p.innerHTML = '<b></b>';
      p.querySelector('b').textContent = v.kazanan < 0 ? '🤝 Berabere! ' + v.skor[0] + ' - ' + v.skor[1] : '🏆 ' + ad(v.kazanan) + ' kazandı! ' + v.skor[0] + ' - ' + v.skor[1];
      if (s.owner === peer.id){
        const r = document.createElement('div'); r.className = 'hk-yeni';
        r.innerHTML = '<label>Süre <select><option value="60">1 dk</option><option value="120">2 dk</option><option value="180">3 dk</option><option value="300">5 dk</option><option value="600">10 dk</option><option value="ozel">Kendim belirleyeyim…</option></select></label><input type="number" min="0.5" max="30" step="0.5" hidden aria-label="Dakika"><button type="button" class="btn primary">▶ Yeni maç</button>';
        const sel = r.querySelector('select'), inp = r.querySelector('input');
        sel.value = [60, 120, 180, 300, 600].includes(v.sure) ? String(v.sure) : 'ozel';
        inp.value = String(Math.round(v.sure / 30) / 2); inp.hidden = sel.value !== 'ozel';
        sel.onchange = () => { inp.hidden = sel.value !== 'ozel'; };
        r.querySelector('button').onclick = () => { const sure = sel.value === 'ozel' ? Math.round((parseFloat(String(inp.value).replace(',', '.')) || 3) * 60) : +sel.value; tableAct({ type: 'yeni', sure }); };
        p.append(r);
      } else { const n = document.createElement('span'); n.className = 'note'; n.textContent = 'Masayı açan yeni maçı başlatabilir.'; p.append(n); }
      alt.append(p);
      if (v.kazanan === seat && typeof confetti === 'function' && K.konfeti !== v.seq){ K.konfeti = v.seq; confetti(K.saha); }
    } else if (seat < 0){
      const n = document.createElement('span'); n.className = 'note'; n.textContent = '👀 İzliyorsun. Koltuk boşalırsa oturabilirsin.'; alt.append(n);
    } else {
      const n = document.createElement('span'); n.className = 'note'; n.textContent = (matchMedia('(pointer:coarse)').matches ? '👆 Parmağınla tokmağını sürükle.' : '🖱 Fareyi oynat, tokmak peşinden gelir.') + ' Kendi yarı sahandan çıkamazsın.'; alt.append(n);
    }
  }

  // ekran ↔ saha dönüşümü: herkes kendi kalesini solda (telefon dik tutulunca altta) görür
  function olcuAl(){
    const sh = K.saha, cv = K.cv, dpr = Math.min(2, window.devicePixelRatio || 1);
    const bw = sh.clientWidth; if (!bw) return null;
    const dik = window.innerHeight > window.innerWidth * 1.15 && bw < 700;
    const dw = dik ? H + 80 : W + 80, dh = dik ? W + 80 : H + 80;
    const ust = sh.getBoundingClientRect().top, maxH = Math.max(240, dik ? window.innerHeight - 240 : window.innerHeight - Math.max(60, ust) - 92);
    const k = Math.min(bw / dw, maxH / dh);
    const cw = Math.round(dw * k), ch = Math.round(dh * k);
    cv.style.width = cw + 'px'; cv.style.aspectRatio = cw + ' / ' + ch; cv.style.height = 'auto';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const kk = k * dpr, ox = 40 * kk, oy = 40 * kk, ters = K.seat === 1;
    let m;
    if (!dik) m = ters ? new DOMMatrix([-kk, 0, 0, -kk, ox + W * kk, oy + H * kk]) : new DOMMatrix([kk, 0, 0, kk, ox, oy]);
    else m = ters ? new DOMMatrix([0, kk, -kk, 0, ox + H * kk, oy]) : new DOMMatrix([0, -kk, kk, 0, ox, oy + W * kk]);
    K.olcu = { m, inv: m.inverse(), dpr, kk, dik, ters, cw, ch, seat: K.seat, zemin: null };
    return K.olcu;
  }
  function girisKur(){
    const cv = K.cv;
    const al = e => {
      if (!K.olcu || K.seat == null || K.seat < 0) return;
      const r = cv.getBoundingClientRect(), dx = cv.width / r.width, dy = cv.height / r.height;
      const pt = K.olcu.inv.transformPoint(new DOMPoint((e.clientX - r.left) * dx, (e.clientY - r.top) * dy));
      K.gir = { x: yari(K.seat, pt.x), y: kis(pt.y, R_T, H - R_T) };
      const now = performance.now();
      if (now - K.gonderT > 22){ K.gonderT = now; tableAct({ type: 'p', x: Math.round(K.gir.x), y: Math.round(K.gir.y) }); }
    };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); al(e); e.preventDefault(); });
    cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons || cv.hasPointerCapture(e.pointerId)) al(e); });
  }

  // ---------- sesler (tarayıcıda üretilir) ----------
  function sesCal(f){
    if (!K.ses || typeof audioCtx === 'undefined' || !audioCtx || (typeof deafened !== 'undefined' && deafened) || audioCtx.state !== 'running') return;
    const ac = audioCtx, t = ac.currentTime;
    try {
      if (f === 'v' || f === 'd'){
        const L = Math.floor(ac.sampleRate * (f === 'v' ? 0.05 : 0.07)), b = ac.createBuffer(1, L, ac.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 3);
        const s = ac.createBufferSource(); s.buffer = b; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f === 'v' ? 2200 : 700; bp.Q.value = 2;
        const g = ac.createGain(); g.gain.value = f === 'v' ? 0.5 : 0.35; s.connect(bp); bp.connect(g); g.connect(ac.destination); s.start(t);
        const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = f === 'v' ? 900 : 220; og.gain.setValueAtTime(0.12, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + 0.09);
      } else if (f[0] === 'g' || f === 'a'){
        [0, 0.18, 0.36].forEach((dt, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = f === 'a' ? 660 + i * 110 : [392, 523, 659][i];
          const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
          g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(0.13, t + dt + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.45);
          o.connect(lp); lp.connect(g); g.connect(ac.destination); o.start(t + dt); o.stop(t + dt + 0.5); });
      } else if (f === 'bip' || f === 'bip2'){
        const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f === 'bip' ? 660 : 990;
        g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + (f === 'bip' ? 0.15 : 0.35)); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.4);
      }
    } catch(e){}
  }

  // ---------- çizim döngüsü ----------
  const RENK = [{ ana: '#ff2d55', acik: '#ff7a8f', koyu: '#8a0f25', isik: 'rgba(255,45,85,' }, { ana: '#1e7bff', acik: '#6fb0ff', koyu: '#0a3a8a', isik: 'rgba(30,123,255,' }];
  const CYAN = '#2ff3ff', MOR = '#ff3df5';
  function zeminCiz(c, ol){
    // sabit saha bir kez çizilir
    const z = document.createElement('canvas'); z.width = K.cv.width; z.height = K.cv.height;
    const x = z.getContext('2d');
    x.setTransform(ol.m);
    // çerçeve
    yuvarlak(x, -34, -34, W + 68, H + 68, 60); x.fillStyle = '#1c2236'; x.fill();
    yuvarlak(x, -22, -22, W + 44, H + 44, 50); x.fillStyle = '#121726'; x.fill();
    // buz
    yuvarlak(x, 0, 0, W, H, 40);
    const gr = x.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#2b3b55'); gr.addColorStop(0.5, '#364766'); gr.addColorStop(1, '#3a3260');
    x.fillStyle = gr; x.fill();
    x.save(); yuvarlak(x, 0, 0, W, H, 40); x.clip();
    const mg = x.createLinearGradient(ORTA, 0, W, 0); mg.addColorStop(0, 'rgba(255,61,245,0.10)'); mg.addColorStop(1, 'rgba(255,61,245,0.22)'); x.fillStyle = mg; x.fillRect(ORTA, 0, ORTA, H);
    // hava delikleri
    x.fillStyle = 'rgba(0,0,0,0.28)';
    for (let i = 20; i < W; i += 22) for (let j = 18; j < H; j += 22) { x.beginPath(); x.arc(i, j, 1.4, 0, 6.283); x.fill(); }
    x.restore();
    const neon = (renk, f) => { x.save(); x.strokeStyle = renk; x.shadowColor = renk; x.shadowBlur = 14 * ol.kk; x.lineWidth = 4; f(); x.stroke(); x.shadowBlur = 0; x.lineWidth = 1.6; x.strokeStyle = 'rgba(255,255,255,0.8)'; f(); x.stroke(); x.restore(); };
    // kenar: sol yarı camgöbeği, sağ yarı mor
    x.save(); x.beginPath(); x.rect(-50, -50, ORTA + 50, H + 100); x.clip(); neon(CYAN, () => { x.beginPath(); yuvarlak(x, 3, 3, W - 6, H - 6, 38); }); x.restore();
    x.save(); x.beginPath(); x.rect(ORTA, -50, ORTA + 50, H + 100); x.clip(); neon(MOR, () => { x.beginPath(); yuvarlak(x, 3, 3, W - 6, H - 6, 38); }); x.restore();
    neon(CYAN, () => { x.beginPath(); x.moveTo(320, 3); x.lineTo(320, H - 3); });
    neon(MOR, () => { x.beginPath(); x.moveTo(ORTA, 3); x.lineTo(ORTA, H - 3); });
    neon(CYAN, () => { x.beginPath(); x.moveTo(W - 320, 3); x.lineTo(W - 320, H - 3); });
    neon(CYAN, () => { x.beginPath(); x.arc(ORTA, H / 2, 82, 0, 6.283); });
    x.fillStyle = CYAN; x.beginPath(); x.arc(ORTA, H / 2, 6, 0, 6.283); x.fill();
    neon(CYAN, () => { x.beginPath(); x.moveTo(3, KALE[0] - 40); x.lineTo(60, KALE[0] - 40); x.lineTo(60, KALE[1] + 40); x.lineTo(3, KALE[1] + 40); });
    neon(MOR, () => { x.beginPath(); x.moveTo(W - 3, KALE[0] - 40); x.lineTo(W - 60, KALE[0] - 40); x.lineTo(W - 60, KALE[1] + 40); x.lineTo(W - 3, KALE[1] + 40); });
    // kale ağızları
    [[0, CYAN], [W, MOR]].forEach(([kx, r]) => {
      x.fillStyle = '#05070d'; x.fillRect(kx === 0 ? -22 : W, KALE[0], 22, KALE[1] - KALE[0]);
      x.save(); x.strokeStyle = r; x.shadowColor = r; x.shadowBlur = 16 * ol.kk; x.lineWidth = 6; x.beginPath(); x.moveTo(kx, KALE[0]); x.lineTo(kx, KALE[1]); x.globalAlpha = 0.55; x.stroke(); x.restore();
    });
    // dış neon şeritler
    [[CYAN, 30, ORTA - 6], [MOR, ORTA + 6, W - 30]].forEach(([r, a, b]) => { x.save(); x.strokeStyle = r; x.shadowColor = r; x.shadowBlur = 12 * ol.kk; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, -28); x.lineTo(b, -28); x.moveTo(a, H + 28); x.lineTo(b, H + 28); x.stroke(); x.restore(); });
    return z;
  }
  function yuvarlak(x, a, b, w, h, r){ x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function tokmak(x, t, renk, kk){
    x.save();
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(t.x + 9, t.y + 11, R_T, R_T * 0.95, 0, 0, 6.283); x.fill();
    x.shadowColor = renk.ana; x.shadowBlur = 22 * kk;
    let g = x.createRadialGradient(t.x - 10, t.y - 12, 4, t.x, t.y, R_T); g.addColorStop(0, renk.acik); g.addColorStop(0.7, renk.ana); g.addColorStop(1, renk.koyu);
    x.fillStyle = g; x.beginPath(); x.arc(t.x, t.y, R_T, 0, 6.283); x.fill(); x.shadowBlur = 0;
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 3; x.beginPath(); x.arc(t.x, t.y, R_T * 0.62, 0, 6.283); x.stroke();
    g = x.createRadialGradient(t.x - 5, t.y - 6, 2, t.x, t.y, R_T * 0.45); g.addColorStop(0, renk.acik); g.addColorStop(1, renk.ana);
    x.fillStyle = g; x.beginPath(); x.arc(t.x, t.y, R_T * 0.42, 0, 6.283); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.55)'; x.beginPath(); x.ellipse(t.x - 8, t.y - 10, 7, 4, -0.6, 0, 6.283); x.fill();
    x.restore();
  }
  let iz = [];
  function cizDongu(){
    requestAnimationFrame(cizDongu);
    if (!K.el || !document.body.contains(K.el)){ K.el = null; return; }
    if (K.el.offsetParent === null) return;
    if (!K.olcu || K.olcu.seat !== K.seat) olcuAl();
    const ol = K.olcu; if (!ol) return;
    if (!ol.zemin) ol.zemin = zeminCiz(null, ol);
    const c = K.cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, K.cv.width, K.cv.height); c.drawImage(ol.zemin, 0, 0);
    // durum: masa sahibiysem canlı, değilsem son kare (+ kısa tahmin)
    const o = owned.get(K.id), g = o && o.state;
    let puk, a, b, ph, u;
    if (g){ puk = g.puk; a = g.tok[0]; b = g.tok[1]; ph = g.ph; u = Math.max(0, g.until - Date.now()); }
    else if (K.kare){
      const f = K.kare, dt = Math.min(0.12, (performance.now() - K.kareT) / 1000) * 60;
      ph = f.ph; u = Math.max(0, f.u - (performance.now() - K.kareT));
      puk = f.ph === 'oyun' ? { x: f.p[0] + f.p[2] * dt * 0.9, y: f.p[1] + f.p[3] * dt * 0.9 } : { x: f.p[0], y: f.p[1] };
      puk.y = kis(puk.y, R_P, H - R_P);
      a = { x: f.a[0], y: f.a[1] }; b = { x: f.b[0], y: f.b[1] };
    } else return;
    // kendi tokmağım: gecikmesiz
    if (!g && K.gir && K.seat >= 0){ if (K.seat === 0) a = K.gir; else b = K.gir; }
    c.setTransform(ol.m);
    // puk izi
    if (ph === 'oyun'){ iz.push({ x: puk.x, y: puk.y }); if (iz.length > 9) iz.shift(); } else iz = [];
    iz.forEach((p, i) => { c.fillStyle = 'rgba(160,250,255,' + (i / iz.length * 0.14) + ')'; c.beginPath(); c.arc(p.x, p.y, R_P * (0.5 + i / iz.length * 0.5), 0, 6.283); c.fill(); });
    tokmak(c, a, RENK[0], ol.kk); tokmak(c, b, RENK[1], ol.kk);
    if (ph !== 'gol'){
      c.save(); c.shadowColor = '#7ff8ff'; c.shadowBlur = 24 * ol.kk;
      c.fillStyle = '#e9feff'; c.beginPath(); c.arc(puk.x, puk.y, R_P, 0, 6.283); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#9ef2ff'; c.beginPath(); c.arc(puk.x, puk.y, R_P * 0.62, 0, 6.283); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.beginPath(); c.arc(puk.x, puk.y, R_P - 2, 0, 6.283); c.stroke(); c.restore();
    }
    // yazılar (ekran düzleminde)
    const yazi = K.el.querySelector('.hk-yazi');
    let t = '';
    if (ph === 'geri'){ const n = Math.ceil(u / 1000); t = n > 0 ? String(n) : 'BAŞLA!'; if (K.geri !== n){ K.geri = n; sesCal(n > 0 ? 'bip' : 'bip2'); } }
    else if (ph === 'gol'){ const son = g ? g.son : (K.v ? K.v.son : -1); t = 'GOL!'; yazi.dataset.renk = son === 1 ? 'm' : 'k'; K.geri = null; }
    else K.geri = null;
    if (yazi.textContent !== t){ yazi.textContent = t; yazi.classList.toggle('acik', !!t); }
  }
})();
