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
  // her görünüşte başın üstü ve ağız (kesilmiş resim içinde, piksel); arkadan görünüşlerde ağız yok
  const BAS = [[80, 4], [80, 4], [70, 4], [85, 4], [90, 4], [115, 4], [95, 4], [90, 6], [95, 6], [100, 6]];
  const AGIZ = [[88, 47], [80, 48], [68, 47], [86, 48], [93, 47], [100, 47], null, null, null, null];
  // oda eşyaları: lambalar (x, y, ışık yarıçapı, renk), ip ışıklar, hoparlörler
  const LAMBA = [[93, 75, 60, '255,190,110'], [185, 207, 55, '220,120,255'], [115, 232, 55, '255,180,100'], [330, 118, 90, '190,90,255']];
  const IP = [];
  for (let i = 0; i < 26; i++) IP.push([205 + i * 12.5, 22 + Math.sin(i * 0.9) * 10 + i * 0.9]);
  for (let i = 0; i < 14; i++) IP.push([460 + i * 14, 6 + Math.sin(i) * 6]);
  const HOP = [[558, 72], [993, 104], [943, 84]];
  // eklenen ip ışık: sağ çalışma masasının üstündeki duvar, iki kavisle sarkar
  const IP2 = (() => { const p = [], N = [[845, 36], [912, 40], [992, 34]]; for (let k = 1; k < N.length; k++) for (let i = k > 1 ? 1 : 0; i <= 20; i++){ const u = i / 20; p.push([N[k - 1][0] + (N[k][0] - N[k - 1][0]) * u, N[k - 1][1] + (N[k][1] - N[k - 1][1]) * u + Math.sin(u * Math.PI) * 15]); } return p; })();
  const LAMBA_YAMA = [[41, 0], [137, 135], [67, 160], [120, 38]], LAMBA_CAM = [[56, 19], [151, 156], [81, 181], [183, 62]];
  const hexRgb = h => { const n = parseInt(String(h).slice(1), 16); return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); };
  const FIRLAT = [['🍅', 'Domates at'], ['📄', 'Kağıt top at'], ['🛏️', 'Yastık at'], ['🧦', 'Çorap at']];
  // seçilebilir karakterler (her biri img/masa/av/<id>/0..9.webp)
  const AVATARLAR = [{ id: 'turuncu', ad: 'Turuncu' }];
  const KEY = 'oyunodasi-gorunum-modu', KEYAV = 'oyunodasi-masa-avatar';
  const al = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch(e){ return d; } };
  const yaz = (k, v) => { try { localStorage.setItem(k, v); } catch(e){} };
  const avTemiz = v => AVATARLAR.some(a => a.id === v) ? v : null;
  // eski oturma görünümünü seçmiş olan masa ile açılır
  let ilk = al(KEY, null);
  if (ilk == null){ const eski = al('oyunodasi-oturma', 'kart'); ilk = eski && eski !== 'kart' ? 'masa' : 'standart'; }
  const A0 = { isik: true, ates: true, ipGece: false, atesSes: 0, lamba: [1, 1, 1, 1], ipRenk: 'sicak', ipMod: 'sabit', lambaRenk: '' };
  const A = (() => { try { const o = JSON.parse(localStorage.getItem('oyunodasi-masa-oda') || '{}'); if (o.ates === undefined || typeof o.ates === 'number'){ o.atesSes = typeof o.ates === 'number' ? o.ates : 0; o.ates = true; } if ('karanlik' in o){ o.isik = !o.karanlik; delete o.karanlik; } return Object.assign({}, A0, o); } catch(e){ return Object.assign({}, A0); } })();
  const aYaz = () => { try { localStorage.setItem('oyunodasi-masa-oda', JSON.stringify(A)); } catch(e){} };
  const FX = [];   // kısa ömürlü efektler (ikram, fırlatma)
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
    // dört oda hâli üst üste: ışık açık/kapalı × ateş yanıyor/sönük (Gemini görselleri); geçişler yumuşak
    const ODA = [['ac', 'oda'], ['kc', 'oda-karanlik'], ['as', 'oda-atessiz'], ['ks', 'oda-sonuk']];
    kok.innerHTML = '<div class="masa-ic">' + ODA.map(([k, f], i) => '<img class="masa-oda' + (i ? ' kat' : '') + '" data-h="' + k + '" src="img/masa/' + f + '.webp" alt="" draggable="false"' + (i ? ' loading="lazy"' : '') + '>').join('')
      + '<i class="masa-isik"></i><i class="masa-isik iki"></i>'
      + '<canvas class="masa-cv alt" width="1376" height="768"></canvas><div class="masa-kivilcim"></div>'
      + ODA.map(([k, f]) => '<img class="masa-on' + (k === 'ac' ? '' : ' kat') + '" data-h="' + k + '" src="img/masa/' + f.replace('oda', 'masa-on') + '.webp" alt="" draggable="false">').join('')
      + '<video class="masa-ates-v" muted loop playsinline autoplay preload="auto" aria-hidden="true"><source src="img/masa/ates.webm" type="video/webm"><source src="img/masa/ates.mp4" type="video/mp4"></video><video class="masa-ates-v ust" muted loop playsinline autoplay preload="auto" aria-hidden="true"><source src="img/masa/ates.webm" type="video/webm"><source src="img/masa/ates.mp4" type="video/mp4"></video>'
      + '<canvas class="masa-cv ust" width="1376" height="768"></canvas>'
      + LAMBA.map((l, i) => '<button type="button" class="masa-lamba" data-l="' + i + '" style="left:' + (l[0] - 18) + 'px;top:' + (l[1] - 26) + 'px" title="Lambayı aç / kapat"></button>').join('') + '</div>'
      + '<div class="masa-oda-ayar"><button type="button" class="masa-ab2" data-kum title="Işıklar ve ateş">💡</button><button type="button" class="masa-ab2" data-isik title="Oda ışıkları">🌙</button><button type="button" class="masa-ab2" data-atesb title="Ateşi söndür / yak">🔥</button></div><div class="masa-kum" hidden></div>'
      + '<div class="masa-cevir">📱↻ Daha büyük görmek için telefonu yan çevir</div><div class="masa-arac"><button type="button" class="masa-ab" data-mik title="Mikrofon">🎙</button><button type="button" class="masa-ab" data-ses title="Sesler">🔊</button><button type="button" class="masa-ab" data-tam title="Tam ekran">⛶</button></div>';
    alan.prepend(kok);
    S.cvA = kok.querySelector('.masa-cv.alt').getContext('2d'); S.cvU = kok.querySelector('.masa-cv.ust').getContext('2d');
    kok.querySelectorAll('.masa-lamba').forEach(b => b.onclick = e => { e.stopPropagation(); const i = +b.dataset.l; A.lamba[i] = A.lamba[i] ? 0 : 1; aYaz(); odaFiltre(); tikSes(); b.blur(); });
    kok.querySelector('[data-isik]').onclick = e => { e.currentTarget.blur(); isikDegis(!A.isik); };
    kok.querySelector('[data-atesb]').onclick = e => { e.currentTarget.blur(); atesDegis(!A.ates); };
    kok.querySelector('[data-kum]').onclick = e => { e.currentTarget.blur(); const k2 = kok.querySelector('.masa-kum'); k2.hidden = !k2.hidden; if (!k2.hidden) kumandaCiz(); };
    S.vid = [...kok.querySelectorAll('.masa-ates-v')];
    setInterval(() => { const [v1, v2] = S.vid; if (v1 && v2 && !v1.paused && Math.abs(v1.currentTime - v2.currentTime) > 0.08) v2.currentTime = v1.currentTime; }, 2000);
    S.lambaImg = [0, 1, 2, 3].map(i => { const im = new Image(); im.src = 'img/masa/lamba' + i + '.webp'; return im; });
    S.camImg = [0, 1, 2, 3].map(i => { const im = new Image(); im.src = 'img/masa/lamba-cam' + i + '.webp'; return im; });
    odaFiltre();
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
    const tam = S.kok.classList.contains('tam') || S.kok.classList.contains('dolu'), kw = S.kok.clientWidth, kh = S.kok.clientHeight;
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
    if (!k.ben){ el.title = 'Tıklayarak bir şey fırlatabilir ya da sesini ayarlayabilirsiniz'; el.onclick = ev => { const o2 = S.kisi.get(k.id); if (o2) kisiMenu(o2, ev); }; }
    S.ic.append(el);
    const o = { id: k.id, el, img: el.querySelector('.masa-av'), plaka: el.querySelector('.masa-plaka'), ad: el.querySelector('.pname'), t: null, sonKonus: performance.now(), hedef: 90, r: gelis ? 1.45 : 1, op: gelis ? 0 : 1, g: null, gidiyor: false };
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
    // sohbet kanalında (bilgisayarda) masa orta alanın tamamını kaplar; müzik / film / ders kanalında oynatıcının altında kalır
    const dolu = goster && window.innerWidth >= 700 && typeof myChan === 'function' && myChan().type === 'voice';
    if (kok.classList.contains('dolu') !== dolu){ kok.classList.toggle('dolu', dolu); document.getElementById('room').classList.toggle('masa-dolu', dolu); setTimeout(olcekle, 30); }
    if (S._acikti !== goster){ S._acikti = goster; setTimeout(atesSes, 50); }
    if (!goster){ kapatMenu(); S.kisi.forEach(o => o.el.remove()); S.kisi.clear(); const ok = document.getElementById('masaKart'); if (ok) ok._geri(); return; }
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
  // ---------- oda: karanlık mod, lambalar ----------
  function odaFiltre(){
    if (!S.kok) return;
    const h = (A.isik ? 'a' : 'k') + (A.ates ? 'c' : 's');
    S.kok.dataset.h = h;
    S.kok.querySelectorAll('.masa-oda.kat,.masa-on.kat').forEach(x => x.classList.toggle('on', x.dataset.h === h));
    S.kok.classList.toggle('isiksiz', !A.isik); S.kok.classList.toggle('atessiz', !A.ates);
    const ib = S.kok.querySelector('[data-isik]'); ib.classList.toggle('on', !A.isik); ib.textContent = A.isik ? '🌙' : '💡'; ib.title = A.isik ? 'Oda ışıklarını kapat' : 'Oda ışıklarını aç';
    const ab = S.kok.querySelector('[data-atesb]'); ab.classList.toggle('on', !A.ates); ab.title = A.ates ? 'Ateşi söndür' : 'Ateşi yak';
    S.kok.querySelectorAll('.masa-lamba').forEach(x => { x.classList.toggle('sonuk', !A.lamba[+x.dataset.l]); x.hidden = !A.isik; });
    (S.vid || []).forEach(v => { if (A.ates){ const p = v.play(); if (p && p.catch) p.catch(() => {}); } });
    const k = S.kok.querySelector('.masa-kum'); if (k && !k.hidden) kumandaCiz();
  }
  function isikDegis(ac){ A.isik = ac; aYaz(); odaFiltre(); tikSes(); }
  function atesDegis(yan){
    A.ates = yan; aYaz(); odaFiltre(); atesSes();
    if (typeof audioCtx === 'undefined' || !audioCtx || audioCtx.state !== 'running' || deafened) return;
    try { // söndürürken su fısıltısı, yakarken kibrit
      const ac = audioCtx, t = ac.currentTime, L = Math.floor(ac.sampleRate * (yan ? 0.5 : 1.2)), b = ac.createBuffer(1, L, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < L; i++){ const u = i / L; d[i] = (Math.random() * 2 - 1) * (yan ? (u < 0.08 ? u / 0.08 : Math.pow(1 - u, 2)) : Math.sin(Math.PI * u) * (1 - u)); }
      const s2 = ac.createBufferSource(); s2.buffer = b; const f = ac.createBiquadFilter(); f.type = yan ? 'bandpass' : 'highpass'; f.frequency.value = yan ? 1800 : 2500;
      const g = ac.createGain(); g.gain.value = yan ? 0.35 : 0.25; s2.connect(f); f.connect(g); g.connect(ac.destination); s2.start(t);
    } catch(e){}
  }
  // kumanda: oda ışıkları, ateş, ip ışıklar, lambalar
  const IP_RENK = [['sicak', 'Sıcak', '#ffd28c'], ['renkli', 'Renkli', 'linear-gradient(90deg,#ff4d4d,#ffd84a,#4dff88,#4da6ff,#d24dff)'], ['#ff4d6d', '', '#ff4d6d'], ['#ff9a3c', '', '#ff9a3c'], ['#4dff88', '', '#4dff88'], ['#2ff3ff', '', '#2ff3ff'], ['#5a7dff', '', '#5a7dff'], ['#c04dff', '', '#c04dff']];
  const IP_MOD = [['sabit', 'Sabit'], ['yanip', 'Yanıp sönen'], ['kayan', 'Kayan'], ['nefes', 'Nefes'], ['muzik', 'Müziğe göre']];
  const LAMBA_RENK = [['', 'Orijinal'], ['#ffb46a', ''], ['#ff4d6d', ''], ['#4dff88', ''], ['#2ff3ff', ''], ['#5a7dff', ''], ['#c04dff', ''], ['#ffffff', '']];
  function kumandaCiz(){
    const k = S.kok.querySelector('.masa-kum');
    const sw = (ls, sec, attr) => ls.map(([v, ad, bg]) => '<button type="button" class="masa-sw' + (v === sec ? ' on' : '') + (ad ? ' yazi' : '') + '" data-' + attr + '="' + v + '" style="--sw:' + (bg || v || '#ffd28c') + '" title="' + (ad || v) + '">' + (ad || '') + '</button>').join('');
    k.innerHTML = '<div class="masa-kum-bas"><b>💡 Işıklar ve ateş</b><button type="button" class="masa-kum-x" aria-label="Kapat">✕</button></div>'
      + '<div class="masa-kum-ikili"><button type="button" data-k-isik class="' + (A.isik ? 'on' : 'kapali') + '">' + (A.isik ? '💡 Oda ışıkları açık' : '🌑 Oda ışıkları kapalı') + '</button><button type="button" data-k-ates class="' + (A.ates ? 'on' : 'kapali') + '">' + (A.ates ? '🔥 Ateşi söndür' : '🔥 Ateşi yak') + '</button></div>'
      + '<label class="masa-kum-kay">🔥 Ateş sesi <input type="range" min="0" max="100" value="' + A.atesSes + '"></label>'
      + '<div class="masa-kum-lbl">İP IŞIKLAR</div><div class="masa-sws">' + sw(IP_RENK, A.ipRenk, 'ip') + '</div>'
      + '<label class="masa-kum-cb"><input type="checkbox" data-ipg' + (A.ipGece ? ' checked' : '') + '> Işıklar kapalıyken ip ışıklar yanık kalsın</label>'
      + '<div class="masa-kum-mod">' + IP_MOD.map(([v, ad]) => '<button type="button" data-ipm="' + v + '" class="' + (v === A.ipMod ? 'on' : '') + '">' + ad + '</button>').join('') + '</div>'
      + '<div class="masa-kum-lbl">LAMBALAR VE NEON</div><div class="masa-sws">' + sw(LAMBA_RENK, A.lambaRenk, 'lr') + '</div>'
      + '<p class="masa-kum-not">Lambalara tıklayıp tek tek açıp kapatabilirsin. Ayarlar sadece senin ekranında.</p>';
    k.querySelector('.masa-kum-x').onclick = () => { k.hidden = true; };
    k.querySelector('[data-k-isik]').onclick = () => isikDegis(!A.isik);
    k.querySelector('[data-k-ates]').onclick = () => atesDegis(!A.ates);
    k.querySelector('.masa-kum-kay input').oninput = e => { A.atesSes = +e.target.value; aYaz(); atesSes(); };
    k.querySelectorAll('[data-ip]').forEach(b => b.onclick = () => { A.ipRenk = b.dataset.ip; aYaz(); kumandaCiz(); });
    k.querySelectorAll('[data-ipm]').forEach(b => b.onclick = () => { A.ipMod = b.dataset.ipm; aYaz(); kumandaCiz(); });
    k.querySelector('[data-ipg]').onchange = e => { A.ipGece = e.target.checked; aYaz(); };
    k.querySelectorAll('[data-lr]').forEach(b => b.onclick = () => { A.lambaRenk = b.dataset.lr; aYaz(); kumandaCiz(); });
  }
  function tikSes(){
    if (typeof audioCtx === 'undefined' || !audioCtx || audioCtx.state !== 'running' || deafened) return;
    try { const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'square'; o.frequency.value = 2200; g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03); o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.04); } catch(e){}
  }
  // ateş çıtırtısı: sadece isteyen açar (masa görünümündeyken)
  function atesSes(){
    const ac = typeof audioCtx !== 'undefined' && audioCtx;
    const ac2 = ac && ac.state === 'running';
    const acik = ac2 && A.atesSes > 0 && A.ates && S.kok && !S.kok.hidden && !deafened;
    if (!acik){ if (S.ates){ S.ates.acik = false; S.ates.g.gain.setTargetAtTime(0, ac.currentTime, 0.3); } return; }
    const v = A.atesSes / 100;
    if (!S.ates){
      const ana = ac.createGain(); ana.gain.value = 0; ana.connect(ac.destination);
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); let b = 0;
      for (let i = 0; i < len; i++){ b = 0.985 * b + 0.015 * (Math.random() * 2 - 1); d[i] = b * 3; }
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
      src.connect(lp); lp.connect(ana); src.start();
      S.ates = { g: ana, src, t: setInterval(() => {
        if (!S.ates || !S.ates.acik || Math.random() > 0.6) return;
        const t = ac.currentTime;
        for (let k = 0, n = 1 + Math.floor(Math.random() * 3); k < n; k++){
          const L = 250 + Math.floor(Math.random() * 900), b2 = ac.createBuffer(1, L, ac.sampleRate), dd = b2.getChannelData(0);
          for (let i = 0; i < L; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 4);
          const bs = ac.createBufferSource(); bs.buffer = b2; const hf = ac.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 900 + Math.random() * 2500;
          const g = ac.createGain(); g.gain.value = 0.2 + Math.random() * 0.5; bs.connect(hf); hf.connect(g); g.connect(ana); bs.start(t + Math.random() * 0.25);
        }
      }, 230) };
    }
    S.ates.acik = true;
    S.ates.g.gain.setTargetAtTime(v * 0.5 * (typeof masterVol !== 'undefined' ? Math.min(1, masterVol) : 1), ac.currentTime, 0.3);
  }
  // müzik / radyo çalıyor mu
  const muzikVar = () => !!((typeof radio !== 'undefined' && radio && !radio.paused && !(typeof radioMuted !== 'undefined' && radioMuted)) || (typeof musicEl !== 'undefined' && musicEl && !musicEl.paused));
  // kişinin baş / ağız noktası (sahne koordinatında)
  function nokta(o, ne){
    if (!o.g) return null;
    const i = GORUNUS.indexOf(o.g), g = o.g, t = o.t * Math.PI / 180, x = C[0] + RX * o.r * Math.cos(t), y = C[1] + RY * o.r * Math.sin(t);
    const s = (1 + (y - g.cy) / 900) * (S.kisi.size > 10 ? Math.sqrt(10 / S.kisi.size) : 1);
    const q = ne === 'agiz' ? AGIZ[i] : BAS[i]; if (!q) return null;
    return { x: x + (g.bb[0] + q[0] - g.cx) * s, y: y + (g.bb[1] + q[1] - g.cy) * s, s, x0: x, y0: y };
  }
  // lamba camının şekli seçilen renge boyanır (önbellekli)
  const camOn = {};
  function camBoya(i, renk){
    const im = S.camImg && S.camImg[i]; if (!im || !im.complete || !im.naturalWidth) return null;
    const k = i + renk; if (camOn[k]) return camOn[k];
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = renk; x.fillRect(0, 0, c.width, c.height);
    return (camOn[k] = c);
  }
  function ipDeger(i, now){
    const t2 = now / 1000, mz = A.ipMod === 'muzik' && muzikVar();
    let v;
    if (A.ipMod === 'yanip') v = (Math.floor(t2 * 2) + i) % 2 ? 1 : 0.15;
    else if (A.ipMod === 'kayan') v = 0.2 + 0.8 * Math.pow(Math.max(0, Math.sin(i * 0.45 - t2 * 3)), 3);
    else if (A.ipMod === 'nefes') v = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t2 * 1.8));
    else if (A.ipMod === 'muzik') v = mz ? 0.2 + 0.8 * Math.abs(Math.sin(t2 * 7 + i * 0.6)) * Math.abs(Math.sin(t2 * 2.3 + i)) : 0.35;
    else v = 0.75 + 0.25 * Math.abs(Math.sin(t2 * 2 + i * 1.7));
    const rc = A.ipRenk === 'renkli' ? ['255,70,70', '255,216,74', '77,255,136', '77,166,255', '210,77,255'][i % 5] : A.ipRenk === 'sicak' ? '255,215,140' : hexRgb(A.ipRenk);
    return [rc, v];
  }
  // ip ışık: kablo (eklenen için) ve ampul parıltıları; karanlıkta biraz daha belirgin
  function ipCiz(a, now, yol, kablo, karanlik){
    if (kablo){ a.save(); a.strokeStyle = 'rgba(25,18,12,.85)'; a.lineWidth = 1.3; a.beginPath(); yol.forEach((p, i) => i ? a.lineTo(p[0], p[1]) : a.moveTo(p[0], p[1])); a.stroke(); a.restore(); }
    let acc = 99, n = 0;
    for (let i = 0; i < yol.length; i++){
      if (kablo){ if (i) acc += Math.hypot(yol[i][0] - yol[i - 1][0], yol[i][1] - yol[i - 1][1]); if (acc < 12) continue; acc = 0; }
      const [x, y] = yol[i], [rc, v] = ipDeger(kablo ? n + 40 : i, now); n++;
      a.save(); a.globalCompositeOperation = 'screen';
      const r = karanlik ? 14 : 11, g = a.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + rc + ',' + ((karanlik ? 0.6 : 0.95) * v) + ')'); g.addColorStop(0.35, 'rgba(' + rc + ',' + (0.4 * v) + ')'); g.addColorStop(1, 'rgba(' + rc + ',0)');
      a.fillStyle = g; a.fillRect(x - r, y - r, r * 2, r * 2); a.restore();
      if (kablo){ a.fillStyle = 'rgba(' + rc + ',' + (0.5 + 0.5 * v) + ')'; a.beginPath(); a.arc(x, y + 1.5, 2.1, 0, 6.283); a.fill(); a.fillStyle = 'rgba(255,250,235,' + (0.4 + 0.55 * v) + ')'; a.beginPath(); a.arc(x, y + 1.2, 1.1, 0, 6.283); a.fill(); }
    }
  }
  function odaCiz(now){
    const a = S.cvA, u = S.cvU; if (!a) return;
    a.clearRect(0, 0, W, H); u.clearRect(0, 0, W, H);
    // lambalar: kapalı olanın yerine gerçek sönük hâli (Gemini karanlık görselinden), açık olanlara renkli parıltı
    if (A.isik){
      LAMBA.forEach(([x, y, r, c], i) => {
        if (!A.lamba[i]){ const im = S.lambaImg && S.lambaImg[i]; if (im && im.complete && im.naturalWidth) a.drawImage(im, LAMBA_YAMA[i][0], LAMBA_YAMA[i][1]); return; }
        const rc = A.lambaRenk ? hexRgb(A.lambaRenk) : c, al = (0.22 + 0.05 * Math.sin(now / 900 + i)) * (A.lambaRenk ? 1.25 : 1);
        a.save();
        if (A.lambaRenk){ const t = camBoya(i, A.lambaRenk); if (t){ a.globalCompositeOperation = 'color'; a.drawImage(t, LAMBA_CAM[i][0], LAMBA_CAM[i][1]); a.drawImage(t, LAMBA_CAM[i][0], LAMBA_CAM[i][1]); } }
        a.globalCompositeOperation = 'screen';
        const g = a.createRadialGradient(x, y, 2, x, y, r * 1.1); g.addColorStop(0, 'rgba(' + rc + ',' + al + ')'); g.addColorStop(1, 'rgba(' + rc + ',0)'); a.fillStyle = g; a.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
        a.restore();
      });
      ipCiz(a, now, IP, false);
    }
    if (A.isik || A.ipGece) ipCiz(a, now, IP2, true, !A.isik);
    if (!A.isik && A.ipGece) ipCiz(a, now, IP, false, true);
    // ışıklar kapalıyken: odayı ateş aydınlatır (titreyen sıcak ışık)
    if (!A.isik && A.ates){
      const f = 0.86 + 0.09 * Math.sin(now / 83) * Math.sin(now / 37) + 0.05 * Math.sin(now / 13);
      a.save(); a.globalCompositeOperation = 'screen';
      const g = a.createRadialGradient(690, 395, 10, 690, 430, 520 * f); g.addColorStop(0, 'rgba(255,150,60,' + (0.28 * f) + ')'); g.addColorStop(0.4, 'rgba(255,110,40,' + (0.1 * f) + ')'); g.addColorStop(1, 'rgba(255,80,20,0)');
      a.fillStyle = g; a.fillRect(0, 0, W, H); a.restore();
      S.kok.style.setProperty('--titre', f.toFixed(3));
    }
    // ateş sönükken közler kızarır
    if (!A.ates){
      u.save(); u.globalCompositeOperation = 'screen';
      for (let i = 0; i < 16; i++){ const x = 640 + ((i * 53) % 100), y = 392 + ((i * 29) % 16), v = 0.3 + 0.5 * Math.abs(Math.sin(now / (500 + i * 41) + i)); const g = u.createRadialGradient(x, y, 0, x, y, 5); g.addColorStop(0, 'rgba(255,' + (70 + (i % 3) * 25) + ',20,' + v + ')'); g.addColorStop(1, 'rgba(255,60,10,0)'); u.fillStyle = g; u.fillRect(x - 5, y - 5, 10, 10); }
      u.restore();
      for (let i = 0; i < 6; i++){ const n = ((now / 5000) + i / 6) % 1, x = 690 + Math.sin(now / 1100 + i * 2) * 10 + n * 16, y = 386 - n * 90, r = 8 + n * 24; const g = u.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(190,195,205,' + ((1 - n) * 0.13) + ')'); g.addColorStop(1, 'rgba(190,195,205,0)'); u.fillStyle = g; u.fillRect(x - r, y - r, r * 2, r * 2); }
    }
    // hoparlörler müzikle
    if (muzikVar()) HOP.forEach(([x, y], i) => {
      const v = Math.abs(Math.sin(now / 230 + i));
      a.save(); a.strokeStyle = 'rgba(120,200,255,' + (0.55 * v) + ')'; a.lineWidth = 1.6; for (let q = 0; q < 2; q++){ a.beginPath(); a.arc(x, y, 6 + q * 6 + v * 4, 0, 6.283); a.stroke(); } a.restore();
      const n = (now / 1400 + i * 0.37) % 1; a.save(); a.globalAlpha = 1 - n; a.font = '16px system-ui'; a.fillStyle = '#bfe0ff'; a.fillText(['♪', '♫', '♪'][i], x + 8 + n * 14, y - 8 - n * 40); a.restore();
    });
    // kişiler: uyuklama (z z z) ve ağızda bant
    S.kisi.forEach(o => {
      if (o.op < 0.5 || !o.k) return;
      const sessiz = o.k.ben ? !!micMuted : !!(o.k.p && o.k.p.muted);
      if (sessiz){ const m = nokta(o, 'agiz'); if (m){ u.save(); u.translate(m.x, m.y); u.globalAlpha = o.op; const w = 20 * m.s, h = 7 * m.s;
        [-0.26, 0.26].forEach(r => { u.save(); u.rotate(r); u.fillStyle = '#ece0c3'; u.shadowColor = 'rgba(0,0,0,.45)'; u.shadowBlur = 2; u.fillRect(-w / 2, -h / 2, w, h); u.shadowBlur = 0; u.strokeStyle = 'rgba(150,130,90,.6)'; u.lineWidth = 0.6; u.strokeRect(-w / 2, -h / 2, w, h); u.restore(); }); u.restore(); } }
      if (now - (o.sonKonus || now) > 180000){ const b = nokta(o, 'bas'); if (b){ u.save(); u.globalAlpha = o.op; u.textAlign = 'center';
        for (let q = 0; q < 3; q++){ const n = ((now / 2400) + q / 3) % 1; u.globalAlpha = o.op * (n < 0.2 ? n / 0.2 : 1 - (n - 0.2) / 0.8); u.font = '900 ' + Math.round((16 + q * 5) * (0.8 + n * 0.5) * b.s) + 'px system-ui'; u.fillStyle = '#d6e6ff'; u.shadowColor = '#6fa8ff'; u.shadowBlur = 8; u.fillText('z', b.x + 26 * b.s + n * 34 * b.s, b.y + 22 * b.s - n * 30 * b.s); }
        u.restore(); } }
    });
    // ikram fincanları ve fırlatılanlar
    for (let i = FX.length - 1; i >= 0; i--){ if (FX[i](u, now) === false) FX.splice(i, 1); }
  }
  // ikram: fincan masanın ortasından kişinin önüne kayar, buharı tüter
  function ikramMasa(to, it){
    const o = S.kisi.get(to); if (!o || !S.kok || S.kok.hidden) return;
    const t0 = performance.now(), sure = 25000, e = it.svg ? '🍵' : it.emoji, sicak = it.hot;
    FX.push((u, now) => {
      const d = now - t0; if (d > sure || !S.kisi.has(to)) return false;
      const p = S.kisi.get(to), t = p.t * Math.PI / 180;
      const hx = C[0] + (RX * 0.55) * Math.cos(t), hy = C[1] - 30 + (RY * 0.62) * Math.sin(t);
      const v = Math.min(1, d / 1500), e2 = 1 - Math.pow(1 - v, 3), x = C[0] + (hx - C[0]) * e2, y = C[1] - 30 + (hy - C[1] + 30) * e2;
      u.save(); u.globalAlpha = d > sure - 1500 ? (sure - d) / 1500 : 1;
      u.fillStyle = 'rgba(0,0,0,.35)'; u.beginPath(); u.ellipse(x + 2, y + 4, 15, 5, 0, 0, 6.283); u.fill();
      u.font = '30px system-ui'; u.textAlign = 'center'; u.textBaseline = 'bottom'; u.fillText(e, x, y + 6);
      if (sicak) for (let q = 0; q < 3; q++){ const n = ((now / 1100) + q / 3) % 1; u.globalAlpha *= 1; u.strokeStyle = 'rgba(255,255,255,' + ((1 - n) * 0.5 * e2) + ')'; u.lineWidth = 2.4; u.beginPath(); u.moveTo(x - 6 + q * 6, y - 24); u.bezierCurveTo(x - 12 + q * 6, y - 34 - n * 12, x + q * 6, y - 42 - n * 18, x - 6 + q * 6 + Math.sin(now / 300 + q) * 4, y - 52 - n * 22); u.stroke(); }
      u.restore();
    });
  }
  // fırlatma: gönderenden hedefin başına kavisli uçuş, başta patlar
  function firlatCiz(from, to, e){
    const A1 = S.kisi.get(from), B1 = S.kisi.get(to); if (!A1 || !B1 || !S.kok || S.kok.hidden) return;
    const t0 = performance.now(), sure = 1300;
    setTimeout(() => firlatSes(false), 0); setTimeout(() => firlatSes(true, e), sure);
    FX.push((u, now) => {
      const a = nokta(A1, 'bas'), b = nokta(B1, 'bas'); if (!a || !b) return false;
      const v = (now - t0) / sure;
      if (v <= 1){
        const x = a.x + (b.x - a.x) * v, y = a.y + (b.y - a.y) * v - Math.sin(v * Math.PI) * 170;
        u.save(); u.translate(x, y); u.rotate(v * 12); u.font = '36px system-ui'; u.textAlign = 'center'; u.textBaseline = 'middle'; u.shadowColor = 'rgba(0,0,0,.5)'; u.shadowBlur = 6; u.fillText(e, 0, 0); u.restore();
        return;
      }
      const w = (now - t0 - sure) / 1400; if (w > 1) return false;
      u.save(); u.globalAlpha = 1 - w; u.translate(b.x, b.y + 16 * b.s);
      const renk = e === '🍅' ? '#e8321e' : e === '🛏️' ? '#f4f1ea' : e === '🧦' ? '#7aa2ff' : '#f5f2e8';
      u.fillStyle = renk; for (let i = 0; i < 10; i++){ const a2 = i * 0.63, d = 12 + w * 34; u.beginPath(); u.arc(Math.cos(a2) * d, Math.sin(a2) * d * 0.6, (e === '🛏️' ? 2 : 4) + (i * 7) % 4, 0, 6.283); u.fill(); }
      u.font = '40px system-ui'; u.textAlign = 'center'; u.textBaseline = 'middle'; u.fillText(e === '🛏️' ? '💨' : '💥', 0, 0); u.restore();
    });
  }
  function firlatSes(carp, e){
    if (typeof audioCtx === 'undefined' || !audioCtx || audioCtx.state !== 'running' || deafened) return;
    try {
      const ac = audioCtx, t = ac.currentTime;
      if (!carp){ const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(500, t); o.frequency.exponentialRampToValueAtTime(1300, t + 0.25); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.32); return; }
      const L = Math.floor(ac.sampleRate * 0.18), b = ac.createBuffer(1, L, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 2);
      const s = ac.createBufferSource(); s.buffer = b; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = e === '🛏️' ? 500 : 1400;
      const g = ac.createGain(); g.gain.value = 0.5; s.connect(lp); lp.connect(g); g.connect(ac.destination); s.start(t);
    } catch(x){}
  }
  // kişiye tıklayınca küçük menü: fırlat ya da kartını aç
  function kisiMenu(o, ev){
    kapatMenu();
    const m = document.createElement('div'); m.className = 'masa-menu'; S.menu = m;
    const ad = o.k && o.k.p ? o.k.p.name : '';
    m.innerHTML = '<b></b>'; m.querySelector('b').textContent = ad;
    FIRLAT.forEach(([e, t]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = e + ' ' + t; b.onclick = () => { kapatMenu(); firlatGonder(o.id, e); }; m.append(b); });
    const k = document.createElement('button'); k.type = 'button'; k.textContent = '🎚 Ses ve mesaj'; k.onclick = () => { kapatMenu(); kartGoster(o.k.p); }; m.append(k);
    S.kok.append(m);
    const r = S.kok.getBoundingClientRect();
    m.style.left = Math.min(r.width - 190, Math.max(8, ev.clientX - r.left + 8)) + 'px'; m.style.top = Math.min(r.height - m.offsetHeight - 8, Math.max(8, ev.clientY - r.top - 10)) + 'px';
    setTimeout(() => document.addEventListener('pointerdown', disTik, true), 0);
  }
  function disTik(e){ if (S.menu && !S.menu.contains(e.target)) kapatMenu(); }
  function kapatMenu(){ if (S.menu){ S.menu.remove(); S.menu = null; document.removeEventListener('pointerdown', disTik, true); } }
  let sonAt = 0;
  function firlatGonder(to, e){
    const now = Date.now(); if (now - sonAt < 1500){ toast('Biraz nişan al, hemen atma 😄'); return; } sonAt = now;
    if (typeof broadcast === 'function') broadcast({ t: 'masaAt', to, e });
    firlatGoster(benId(), to, e);
  }
  function firlatGoster(from, to, e){
    if (!FIRLAT.some(x => x[0] === e)) return;
    firlatCiz(from, to, e);
    const ad = id => id === benId() ? 'Sen' : ((peers.get(id) || {}).name || 'Biri');
    if (to === benId() && typeof toast === 'function') toast(e + ' ' + ad(from) + ' sana ' + { '🍅': 'domates', '📄': 'kağıt top', '🛏️': 'yastık', '🧦': 'çorap' }[e] + ' attı!');
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
      o.el.classList.toggle('konusuyor', kon); if (kon) o.sonKonus = now;
      if (kon){ const a = kart.querySelector('.avatar'); o.el.style.setProperty('--lv', a ? (+a.style.getPropertyValue('--lv') || 0.3) : 0.3); }
      else o.el.style.setProperty('--lv', 0);
    });
    S.kisi.forEach((o, id) => { if (o.gidiyor && o.op < 0.03){ o.el.remove(); S.kisi.delete(id); } });
    odaCiz(now);
  }
  requestAnimationFrame(dongu);
  setInterval(() => { if (typeof joined !== 'undefined' && joined) guncelle(); else if (S.kok && !S.kok.hidden) guncelle(); }, 400);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kur); else kur();

  // tepki emojileri masada da başın üstünde çıksın
  if (typeof showReaction === 'function'){
    const asil = showReaction;
    showReaction = function(e, name, card){ asil(e, name, card); tepki(e, card); };
  }
  if (typeof showIkram === 'function'){
    const asilI = showIkram;
    showIkram = function(from, to, item, line){ asilI(from, to, item, line); try { const it = IKRAM_BY[item]; if (it) ikramMasa(to, it); } catch(e){} };
  }
  setInterval(() => { if (S._sagir !== deafened){ S._sagir = deafened; atesSes(); } }, 700);
  // ağdan gelen karakter seçimi ve fırlatma
  function onData(id, d){
    if (d.t === 'masaAt'){
      const p = peers.get(id); if (!p || typeof d.to !== 'string') return true;
      const now = Date.now(); if (now - (p._masaAt || 0) < 1000) return true; p._masaAt = now;
      firlatGoster(id, d.to, d.e); return true;
    }
    if (d.t !== 'masaAv') return false;
    const p = peers.get(id); if (p) p.mav = avTemiz(d.av);
    return true;
  }
  return { S, guncelle, benAv, avTemiz, onData, modSec };
})();
