// Masa görünümü: sohbet kanalında katılımcılar kart yerine ateşli yuvarlak masanın etrafındaki koltuklarda oturur.
// İsteğe bağlıdır (🪑 Masa / 🪪 Standart), seçim sadece bu cihazı etkiler ve hatırlanır. Ses bağlantılarına dokunmaz:
// kartlar arka planda aynen çalışmaya devam eder, masa sadece onların durumunu (konuşuyor, sessiz, tepki) okur.
// Koltuk sayısı kişi sayısı kadardır: biri gelince yeni koltuk kayarak gelir, gidince koltuğu kalkar, kalanlar aralığı kapatır.
// Herkes kendi ekranında en önde (saat 6 yönünde) oturur; sıra herkeste aynıdır (kimliğe göre).
const MASA = (() => {
  // sahne 1376x768 ölçeğinde çizildi; karakterin 10 açıdan görünüşü (koltukla birlikte, Gemini görselinden kesildi)
  const W = 1376, H = 768, C = [697.1, 436.3], RX = 405.4 * 1.04, RY = 177.8 * 1.08;
  const GORUNUS = [
    { a: -166.8, bb: [208, 271, 397, 493], w: 189, cx: 294.3, cy: 395.0 }, { a: -130.1, bb: [365, 189, 528, 407], w: 163, cx: 441.9, cy: 303.6 },
    { a: -101.3, bb: [547, 152, 690, 370], w: 143, cx: 618.2, cy: 263.7 }, { a: -75.2, bb: [718, 162, 871, 380], w: 153, cx: 794.9, cy: 273.5 },
    { a: -43.5, bb: [877, 206, 1047, 427], w: 170, cx: 965.9, cy: 324.4 }, { a: -1.5, bb: [998, 304, 1196, 527], w: 198, cx: 1105.1, cy: 431.7 },
    { a: 48.5, bb: [881, 434, 1080, 686], w: 199, cx: 981.1, cy: 576.8 }, { a: 76.8, bb: [698, 474, 894, 727], w: 196, cx: 795.2, cy: 619.3 },
    { a: 106.8, bb: [483, 469, 673, 722], w: 190, cx: 575.7, cy: 612.6 }, { a: 136.1, bb: [302, 423, 497, 671], w: 195, cx: 399.0, cy: 562.2 }
  ];
  // seçilebilir karakterler (her biri img/masa/av/<id>/0..9.webp)
  const AVATARLAR = [{ id: 'turuncu', ad: 'Turuncu' }];
  const KEY = 'oyunodasi-gorunum-modu', KEYAV = 'oyunodasi-masa-avatar';
  const al = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch(e){ return d; } };
  const yaz = (k, v) => { try { localStorage.setItem(k, v); } catch(e){} };
  const avTemiz = v => AVATARLAR.some(a => a.id === v) ? v : null;
  // eski oturma görünümünü seçmiş olan masa ile açılır
  let ilk = al(KEY, null);
  if (ilk == null){ const eski = al('oyunodasi-oturma', 'kart'); ilk = eski && eski !== 'kart' ? 'masa' : 'standart'; }
  const S = { mod: ilk === 'masa' ? 'masa' : 'standart', av: avTemiz(al(KEYAV, '')), kok: null, kisi: new Map(), hazir: false };
  const benAv = () => S.av || AVATARLAR[0].id;
  const avOf = p => avTemiz(p && p.mav) || AVATARLAR[Math.abs([...String(p && p.id || '')].reduce((h, c) => h * 31 + c.charCodeAt(0) | 0, 7)) % AVATARLAR.length].id;

  const benId = () => (typeof peer !== 'undefined' && peer && peer.id) || 'ben';
  const uygunKanal = () => typeof joined !== 'undefined' && joined && typeof myChan === 'function' && myChan().type !== 'game';
  const paylasim = () => { const r = document.getElementById('room'); return r && r.classList.contains('sharing'); };
  const acik = () => S.mod === 'masa' && uygunKanal() && !paylasim();

  function kisiler(){
    const ls = [{ id: benId(), ben: true }];
    if (typeof peers !== 'undefined') peers.forEach(p => { if (p.helloed && p.linked && !p.lobby && sameChan(p) && p.card) ls.push({ id: p.id, p }); });
    ls.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const i = ls.findIndex(x => x.ben);
    return ls.slice(i).concat(ls.slice(0, i));
  }
  const gorunus = t => { let en = GORUNUS[0], ed = 999; for (const g of GORUNUS){ const d = Math.abs(((t - g.a) % 360 + 540) % 360 - 180); if (d < ed){ ed = d; en = g; } } return en; };
  const enYakin = (a, b) => a + (((b - a) % 360 + 540) % 360 - 180);

  // ---------- arayüz ----------
  function kur(){
    if (S.kok) return S.kok;
    const alan = document.querySelector('.people-area'); if (!alan) return null;
    const kok = document.createElement('div'); kok.className = 'masa-sahne'; kok.id = 'masaSahne'; kok.hidden = true;
    kok.innerHTML = '<div class="masa-ic"><img class="masa-oda" src="img/masa/oda.webp" alt="" draggable="false"><i class="masa-isik"></i><i class="masa-isik iki"></i>'
      + '<div class="masa-kivilcim"></div><img class="masa-on" src="img/masa/masa-on.webp" alt="" draggable="false"></div>'
      + '<div class="masa-cevir">📱↻ Daha büyük görmek için telefonu yan çevir</div><div class="masa-arac"><button type="button" class="masa-ab" data-mik title="Mikrofon">🎙</button><button type="button" class="masa-ab" data-ses title="Sesler">🔊</button><button type="button" class="masa-ab" data-tam title="Tam ekran">⛶</button></div>';
    alan.prepend(kok);
    kok.querySelector('[data-tam]').onclick = e => { e.currentTarget.blur(); tamEkran(!kok.classList.contains('tam')); };
    kok.querySelector('[data-mik]').onclick = e => { e.currentTarget.blur(); const b = document.getElementById('micBtn'); if (b) b.click(); };
    kok.querySelector('[data-ses]').onclick = e => { e.currentTarget.blur(); const b = document.getElementById('deafBtn'); if (b) b.click(); };
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && kok.classList.contains('tam')) tamEkran(false, true); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && kok.classList.contains('tam') && !document.fullscreenElement) tamEkran(false); });
    S.kok = kok; S.ic = kok.querySelector('.masa-ic');
    const kv = kok.querySelector('.masa-kivilcim');
    for (let i = 0; i < 9; i++){ const e = document.createElement('i'); e.style.left = (46 + Math.random() * 8) + '%'; e.style.animationDelay = (Math.random() * 3).toFixed(2) + 's'; e.style.animationDuration = (2 + Math.random() * 1.6).toFixed(2) + 's'; kv.append(e); }
    new ResizeObserver(olcekle).observe(kok);
    dugmeler();
    return kok;
  }
  // görsel sahne kutuya sığdırılır; telefonda yanlar kırpılır, isimler okunur boyda kalır
  // tam ekran: tarayıcı destekliyorsa gerçek tam ekran, değilse (iPhone) sayfayı kaplayan katman
  function tamEkran(ac, disaridan){
    const kok = S.kok; if (!kok) return;
    kok.classList.toggle('tam', ac); document.documentElement.classList.toggle('masa-tam-acik', ac);
    try {
      if (ac && kok.requestFullscreen && !document.fullscreenElement) kok.requestFullscreen().catch(() => {});
      if (!ac && !disaridan && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch(e){}
    const b = kok.querySelector('[data-tam]'); b.textContent = ac ? '✕' : '⛶'; b.title = ac ? 'Tam ekrandan çık' : 'Tam ekran';
    setTimeout(olcekle, 60); setTimeout(olcekle, 400);
  }
  function olcekle(){
    if (!S.kok || S.kok.hidden) return;
    const tam = S.kok.classList.contains('tam'), kw = S.kok.clientWidth, kh = S.kok.clientHeight;
    const dikEkran = tam && kh > kw * 1.1, dar = (window.innerWidth < 700 && !tam) || dikEkran;
    const pen = dar ? [150, 50, 1230, 768] : [0, 0, W, H];
    const pw = pen[2] - pen[0], ph = pen[3] - pen[1];
    S.kok.style.aspectRatio = tam ? 'auto' : pw + ' / ' + ph;
    // tam ekranda sahne ekranı kaplar (az taşan kenar kırpılır); telefon dikse sığdırılır, yan çevirme önerilir
    const kap = Math.max(kw / pw, kh / ph), sig = Math.min(kw / pw, kh / ph);
    const s = tam ? (kap / sig > 1.25 ? sig : kap) : kw / pw; S.olc = s;
    S.kok.classList.toggle('dik', dikEkran);
    const ox = tam ? (kw - pw * s) / 2 : 0, oy = tam ? (kh - ph * s) / 2 : 0;
    S.ic.style.transform = 'translate(' + (ox - pen[0] * s) + 'px,' + (oy - pen[1] * s) + 'px) scale(' + s + ')';
    S.kok.style.setProperty('--ters', (1 / s).toFixed(4));
    S.kok.style.setProperty('--yazi', Math.max(11, Math.min(16, 15 * s)) + 'px');
  }
  function dugmeler(){
    // üst barda hızlı geçiş
    const mid = document.querySelector('.top-mid');
    if (mid && !document.getElementById('masaToggle')){
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small masa-toggle'; b.id = 'masaToggle';
      b.onclick = () => modSec(S.mod === 'masa' ? 'standart' : 'masa');
      const ref = document.getElementById('mixerBtn2'); mid.insertBefore(b, ref || null);
    }
    // Görünüm penceresi > Kartım: sahne düzeni
    const pk = document.getElementById('stilPicker');
    if (pk && !document.getElementById('masaDuzen')){
      const r = document.createElement('div'); r.className = 'tema-row'; r.id = 'masaDuzen';
      r.innerHTML = '<span>Sahne düzeni</span><div class="seg"><button type="button" data-masa="standart">🪪 Standart kartlar</button><button type="button" data-masa="masa">🪑 Yuvarlak masa</button></div>';
      r.querySelectorAll('[data-masa]').forEach(x => x.onclick = () => modSec(x.dataset.masa));
      pk.parentNode.insertBefore(r, pk);
      const r2 = document.createElement('div'); r2.className = 'tema-row masa-av-row'; r2.innerHTML = '<span>Masa karakterin</span><div class="masa-av-sec"></div>';
      pk.parentNode.insertBefore(r2, pk);
    }
    // Profil penceresi: karakter seçimi
    const pn = document.getElementById('pName');
    if (pn && !document.getElementById('masaAvProfil')){
      const lab = pn.closest('label');
      const d = document.createElement('div'); d.id = 'masaAvProfil'; d.className = 'masa-av-profil';
      d.innerHTML = '<span>🪑 Masa karakterin <small class="note">masa görünümünde koltukta böyle oturursun</small></span><div class="masa-av-sec"></div>';
      lab.parentNode.insertBefore(d, lab.nextSibling);
    }
    dugmeGuncelle();
  }
  function dugmeGuncelle(){
    if (S.kok){
      const m = S.kok.querySelector('[data-mik]'), d = S.kok.querySelector('[data-ses]');
      const mk = typeof micMuted !== 'undefined' && micMuted, dk = typeof deafened !== 'undefined' && deafened;
      m.textContent = mk ? '🔇' : '🎙'; m.classList.toggle('kapali', mk); d.textContent = dk ? '🔈' : '🔊'; d.classList.toggle('kapali', dk);
    }
    const b = document.getElementById('masaToggle');
    if (b){
      b.innerHTML = S.mod === 'masa' ? '🪪 <span class="lbl">Standart</span>' : '🪑 <span class="lbl">Masa</span>';
      b.title = S.mod === 'masa' ? 'Standart kart görünümüne geç' : 'Yuvarlak masa görünümüne geç';
      b.hidden = !uygunKanal() || paylasim();
    }
    document.querySelectorAll('[data-masa]').forEach(x => x.classList.toggle('on', x.dataset.masa === S.mod));
    document.querySelectorAll('.masa-av-sec').forEach(kut => {
      if (kut._k === benAv()) return; kut._k = benAv(); kut.innerHTML = '';
      AVATARLAR.forEach(a => {
        const x = document.createElement('button'); x.type = 'button'; x.className = 'masa-av-btn' + (a.id === benAv() ? ' on' : ''); x.title = a.ad;
        x.innerHTML = '<img src="img/masa/av/' + a.id + '/3.webp" alt=""><small>' + a.ad + '</small>';
        x.onclick = () => avSec(a.id);
        kut.append(x);
      });
      if (AVATARLAR.length < 4){ const n = document.createElement('small'); n.className = 'note masa-av-not'; n.textContent = 'Yeni karakterler yakında eklenecek.'; kut.append(n); }
    });
  }
  function modSec(m){
    S.mod = m === 'masa' ? 'masa' : 'standart'; yaz(KEY, S.mod);
    dugmeGuncelle(); guncelle();
    if (S.mod === 'masa' && !uygunKanal() && typeof toast === 'function') toast('🪑 Masa görünümü sohbet kanallarında açılır');
  }
  function avSec(id){
    S.av = avTemiz(id); yaz(KEYAV, benAv());
    if (typeof broadcast === 'function' && typeof joined !== 'undefined' && joined) broadcast({ t: 'masaAv', av: benAv() });
    const k = S.kisi.get(benId()); if (k) k.g = null;
    dugmeGuncelle();
  }

  // ---------- kişiler ----------
  function yeniKisi(k, gelis){
    const el = document.createElement('div'); el.className = 'masa-kisi' + (k.ben ? ' ben' : ''); el.dataset.id = k.id;
    el.innerHTML = '<i class="masa-halka"></i><img class="masa-av" alt="" draggable="false"><div class="masa-plaka"><span class="masa-ik sus" title="Mikrofonu kapalı">🎙️</span><span class="masa-ik sagir" title="Sesleri kapalı">🔇</span><span class="pname"></span></div>';
    if (!k.ben){ el.title = 'Ses seviyesi ve mesaj için tıkla'; el.onclick = () => kartGoster(k.p); }
    S.ic.append(el);
    const o = { id: k.id, el, img: el.querySelector('.masa-av'), plaka: el.querySelector('.masa-plaka'), ad: el.querySelector('.pname'), t: null, hedef: 90, r: gelis ? 1.45 : 1, op: gelis ? 0 : 1, g: null, gidiyor: false };
    S.kisi.set(k.id, o);
    if (gelis){ el.classList.add('gelis'); setTimeout(() => { parilti(o); koltukSesi(); }, 380); setTimeout(() => el.classList.remove('gelis'), 2200); }
    return o;
  }
  function guncelle(){
    const kok = kur(); if (!kok) return;
    dugmeGuncelle();
    const goster = acik();
    document.getElementById('room').classList.toggle('masa-modu', goster);
    if (kok.hidden === goster){ kok.hidden = !goster; if (goster){ olcekle(); S.hazir = false; } }
    if (!goster && kok.classList.contains('tam')) tamEkran(false);
    if (!goster){ S.kisi.forEach(o => o.el.remove()); S.kisi.clear(); const ok = document.getElementById('masaKart'); if (ok) ok._geri(); return; }
    const ls = kisiler(), n = ls.length, var_ = new Set();
    ls.forEach((k, i) => {
      var_.add(k.id);
      let o = S.kisi.get(k.id);
      if (!o) o = yeniKisi(k, S.hazir && !k.ben);
      o.gidiyor = false; o.hedef = 90 + i * 360 / n; o.k = k;
      if (o.t == null) o.t = o.hedef;
      const p = k.p, ad = k.ben ? myName : p.name;
      const renk = k.ben ? ($('selfCard') ? $('selfCard').style.getPropertyValue('--c') : '') || '#5ee0b5' : (p.color || '#5ee0b5');
      o.el.style.setProperty('--c', renk);
      const yazi = (k.ben ? 'Sen' : ad) + ((k.ben ? isHost : p.id === currentHostId) ? ' 👑' : '');
      if (o.ad.textContent !== yazi) o.ad.textContent = yazi;
      const st = typeof stilOf === 'function' ? stilOf(k.id) : null;
      if (st && st.isim){ o.ad.dataset.isim = st.isim; o.ad.dataset.text = yazi; } else { delete o.ad.dataset.isim; delete o.ad.dataset.text; }
      o.el.classList.toggle('sessiz', k.ben ? !!micMuted : !!p.muted);
      o.el.classList.toggle('sagir', k.ben ? !!deafened : !!p.deaf);
      const av = k.ben ? benAv() : avOf(p);
      if (o.avId !== av){ o.avId = av; o.g = null; }
    });
    S.kisi.forEach(o => { if (!var_.has(o.id) && !o.gidiyor){ o.gidiyor = true; o.el.classList.add('gidis'); if (S.hazir) koltukSesi(true); } });
    S.hazir = true;
  }
  function ciz(o){
    const t = o.t * Math.PI / 180, x = C[0] + RX * o.r * Math.cos(t), y = C[1] + RY * o.r * Math.sin(t);
    const g = gorunus(o.t);
    if (o.g !== g){ o.g = g; o.img.src = 'img/masa/av/' + (o.avId || AVATARLAR[0].id) + '/' + GORUNUS.indexOf(g) + '.webp'; }
    const n = S.kisi.size, s = (1 + (y - g.cy) / 900) * (n > 10 ? Math.sqrt(10 / n) : 1);
    const L = (g.bb[0] - g.cx) * s, T = (g.bb[1] - g.cy) * s;
    o.img.style.cssText = 'left:' + L + 'px;top:' + T + 'px;width:' + g.w * s + 'px';
    o.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    o.el.style.zIndex = Math.round(y); o.el.style.opacity = o.op;
    const alt = (g.bb[3] - g.cy) * s;
    o.el.style.setProperty('--ha', alt + 'px'); o.el.style.setProperty('--hw', g.w * 1.05 * s + 'px');
    const arkadan = Math.sin(t) > 0.7 && Math.sin(t) < 0.97;   // en öndeki (ben) başının üstünde
    o.plaka.classList.toggle('alt', arkadan);
    o.plaka.style.top = (arkadan ? alt + 10 : T - 8) + 'px';
  }
  // ---------- efektler ----------
  function parilti(o){
    if (!S.ic) return;
    const t = o.hedef * Math.PI / 180, x = C[0] + RX * Math.cos(t), y = C[1] + RY * Math.sin(t) - 40;
    const k = document.createElement('div'); k.className = 'masa-parilti'; k.style.left = x + 'px'; k.style.top = y + 'px'; k.style.zIndex = 2000;
    for (let i = 0; i < 26; i++){ const e = document.createElement('i'), a = Math.random() * 6.283, d = 40 + Math.random() * 90; e.style.setProperty('--x', Math.cos(a) * d + 'px'); e.style.setProperty('--y', Math.sin(a) * d - 40 + 'px'); e.style.animationDelay = (Math.random() * 0.4).toFixed(2) + 's'; k.append(e); }
    S.ic.append(k); setTimeout(() => k.remove(), 2400);
  }
  // ahşap zeminde sürtünen koltuk sesi (tarayıcıda üretilir)
  function koltukSesi(geri){
    if (typeof audioCtx === 'undefined' || !audioCtx || (typeof deafened !== 'undefined' && deafened) || audioCtx.state !== 'running') return;
    try {
      const ac = audioCtx, t = ac.currentTime, L = Math.floor(ac.sampleRate * 0.5), b = ac.createBuffer(1, L, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < L; i++){ const u = i / L, zarf = Math.sin(Math.PI * u) ** 0.7, tit = 0.55 + 0.45 * Math.abs(Math.sin(u * (geri ? 70 : 90))); d[i] = (Math.random() * 2 - 1) * zarf * tit; }
      const src = ac.createBufferSource(); src.buffer = b;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(geri ? 700 : 420, t); bp.frequency.linearRampToValueAtTime(geri ? 380 : 760, t + 0.5); bp.Q.value = 1.6;
      const g = ac.createGain(); g.gain.value = 0.32 * (typeof masterVol !== 'undefined' ? Math.min(1, masterVol) : 1);
      src.connect(bp); bp.connect(g); g.connect(ac.destination); src.start(t);
      // yerine oturunca hafif tok ses
      const o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(140, t + 0.48); o.frequency.exponentialRampToValueAtTime(60, t + 0.62);
      og.gain.setValueAtTime(0, t + 0.47); og.gain.linearRampToValueAtTime(0.18, t + 0.49); og.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      o.connect(og); og.connect(ac.destination); o.start(t + 0.47); o.stop(t + 0.72);
    } catch(e){}
  }
  function tepki(e, kart){
    if (!S.kok || S.kok.hidden) return;
    let o = null;
    if (kart && kart === document.getElementById('selfCard')) o = S.kisi.get(benId());
    else S.kisi.forEach(x => { if (x.k && x.k.p && x.k.p.card === kart) o = x; });
    if (!o) return;
    const b = document.createElement('span'); b.className = 'masa-balon'; b.textContent = e;
    o.plaka.append(b); setTimeout(() => b.remove(), 2400);
  }
  // bir kişiye tıklanınca: kart görünümündeki kutucuğu (ses seviyesi, mesaj, ikram) yanında göster
  function kartGoster(p){
    if (!p || !p.card) return;
    const eski = document.getElementById('masaKart'); if (eski){ const ayni = eski.dataset.id === p.id; eski._geri(); if (ayni) return; }
    const kab = document.createElement('div'); kab.className = 'masa-kart'; kab.id = 'masaKart'; kab.dataset.id = p.id;
    const yer = p.card.parentNode, sonraki = p.card.nextSibling;
    kab._geri = () => { if (yer) yer.insertBefore(p.card, sonraki && sonraki.parentNode === yer ? sonraki : null); kab.remove(); };
    const x = document.createElement('button'); x.type = 'button'; x.className = 'btn small masa-kart-x'; x.textContent = '✕'; x.onclick = () => kab._geri();
    kab.append(x, p.card);
    S.kok.append(kab);
  }

  // ---------- döngü: kayma, konuşma halkası ----------
  let son = performance.now();
  function dongu(now){
    requestAnimationFrame(dongu);
    const dt = Math.min(60, now - son); son = now;
    if (!S.kok || S.kok.hidden) return;
    const f = 1 - Math.pow(0.004, dt / 1000 * 1.65);
    S.kisi.forEach(o => {
      o.t = o.t + (enYakin(o.t, o.hedef) - o.t) * f;
      const hr = o.gidiyor ? 1.45 : 1, ho = o.gidiyor ? 0 : 1;
      o.r += (hr - o.r) * f; o.op += (ho - o.op) * Math.min(1, f * 1.3);
      ciz(o);
      // konuşma: kartın ses ölçerinden
      const kart = o.k && (o.k.ben ? document.getElementById('selfCard') : o.k.p && o.k.p.card);
      const kon = !!(kart && kart.classList.contains('speaking'));
      o.el.classList.toggle('konusuyor', kon);
      if (kon){ const a = kart.querySelector('.avatar'); o.el.style.setProperty('--lv', a ? (+a.style.getPropertyValue('--lv') || 0.3) : 0.3); }
      else o.el.style.setProperty('--lv', 0);
    });
    S.kisi.forEach((o, id) => { if (o.gidiyor && o.op < 0.03){ o.el.remove(); S.kisi.delete(id); } });
  }
  requestAnimationFrame(dongu);
  setInterval(() => { if (typeof joined !== 'undefined' && joined) guncelle(); else if (S.kok && !S.kok.hidden) guncelle(); }, 400);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kur); else kur();

  // tepki emojileri masada da başın üstünde çıksın
  if (typeof showReaction === 'function'){
    const asil = showReaction;
    showReaction = function(e, name, card){ asil(e, name, card); tepki(e, card); };
  }
  // ağdan gelen karakter seçimi
  function onData(id, d){
    if (d.t !== 'masaAv') return false;
    const p = peers.get(id); if (p) p.mav = avTemiz(d.av);
    return true;
  }
  return { S, guncelle, benAv, avTemiz, onData, modSec };
})();
