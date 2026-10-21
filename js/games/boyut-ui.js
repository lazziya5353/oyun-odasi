// Boyut Bilmece arayüzü: kâğıt zeminli sahne, siyah referans silüeti, boyutlandırılan beyaz silüet, kırmızı gerçek boy.
// boyutSahne() hem tek kişilik oyunda hem masada (boyut-table.js) kullanılır.
const BY_RENK = ['#d6402b', '#2b6fd6', '#1f9d55', '#c78a00', '#8e44ad', '#e0569b', '#16a2b8', '#6d4c41'];
const byEl = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const byEsc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const byOge = i => BOYUT_VERI[i];
const byEtiket = o => o.ad + ' · ' + BOYUT_OLC[o.olc];

// Silüet şekli: emoji bir kez tuvale çizilir, gerçekten boyalı kısmı kırpılır ve maske olarak kullanılır.
// Böylece her şeklin gerçek eni/boyu bilinir: ölçü "boy" ise şeklin yüksekliği, diğerlerinde (uzunluk, kanat, çap…) genişliği ölçüye eşitlenir
// ve hepsi zemine tam oturur (emoji kutusundaki boşluklar yüzünden havada durma / zemine gömülme olmaz).
const BY_SEKIL = new Map();
let byTofu = null;
function bySekil(e){
  if (BY_SEKIL.has(e)) return BY_SEKIL.get(e);
  let s = { url: '', w: 0.8, h: 1 };
  try {
    const N = 160, P = 24, c = document.createElement('canvas'); c.width = c.height = N + 2 * P;
    const x = c.getContext('2d');
    x.font = N + 'px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol",sans-serif';
    x.textBaseline = 'middle'; x.textAlign = 'center';
    x.fillText(e, c.width / 2, c.height / 2);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    // cihazın emoji yazı tipinde bu emoji yoksa (eski Windows gibi) kare "□" çizilir: tanı ve düz yuvarlak köşeli şekle düş
    if (byTofu === null){
      const t = document.createElement('canvas'); t.width = t.height = c.width; const tx = t.getContext('2d');
      tx.font = x.font; tx.textBaseline = 'middle'; tx.textAlign = 'center'; tx.fillText('\u{10FFFD}', t.width / 2, t.height / 2);
      byTofu = tx.getImageData(0, 0, t.width, t.height).data.join(',');
    }
    if (byTofu && d.join(',') === byTofu) throw new Error('emoji yok');
    // bağlı parçalar: şeklin etrafındaki küçük süsler (yıldız, toz, su damlası) ölçüye ve maskeye katılmasın
    const Wc = c.width, Hc = c.height, etk = new Int32Array(Wc * Hc), alan = [0];
    for (let p0 = 0; p0 < Wc * Hc; p0++){
      if (etk[p0] || d[p0 * 4 + 3] <= 24) continue;
      const id = alan.length; let n = 0; const yig = [p0]; etk[p0] = id;
      while (yig.length){
        const p = yig.pop(); n++;
        const px = p % Wc, py = (p / Wc) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
          const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= Wc || qy >= Hc) continue;
          const q = qy * Wc + qx; if (!etk[q] && d[q * 4 + 3] > 24){ etk[q] = id; yig.push(q); }
        }
      }
      alan.push(n);
    }
    const enCok = Math.max(0, ...alan.slice(1));
    const tut = alan.map(n => n >= enCok * 0.04);
    let x0 = Wc, y0 = Hc, x1 = -1, y1 = -1;
    for (let p = 0; p < Wc * Hc; p++){
      const id = etk[p]; if (!id) continue;
      if (!tut[id]){ d[p * 4 + 3] = 0; continue; }
      const px = p % Wc, py = (p / Wc) | 0;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
    x.putImageData(new ImageData(d, Wc, Hc), 0, 0);
    if (x1 > x0 && y1 > y0){
      const w = x1 - x0 + 1, h = y1 - y0 + 1, k = document.createElement('canvas'); k.width = w; k.height = h;
      k.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, w, h);
      s = { url: k.toDataURL('image/png'), w: w / N, h: h / N };
    }
  } catch(err){}
  BY_SEKIL.set(e, s);
  return s;
}
// ölçülen kenar (px) → ekrandaki en ve boy
function byBoyut(o, sk, px){
  return o.olc === 'boy' ? { w: px * sk.w / sk.h, h: px } : { w: px, h: px * sk.h / sk.w };
}

// soru: { ref, hedef, olcek }  ayar: { kilitli, izleyici, onDegis(m), onKilit(m) }
function boyutSahne(host, soru, ayar){
  ayar = ayar || {};
  const ref = byOge(soru.ref), hed = byOge(soru.hedef);
  const skR = bySekil(ref.e), skH = bySekil(hed.e);
  const sahne = byEl('div', 'by-sahne');
  const silHtml = cls => '<span class="by-cer ' + cls + '"><span class="by-sil"></span></span>';
  sahne.innerHTML =
    '<div class="by-zemin"></div>' +
    '<div class="by-kutu by-ref">' + silHtml('siyah') + '</div>' +
    '<div class="by-kutu by-hedef">' + silHtml('beyaz') + '<i class="by-tut" title="Sürükleyerek boyutlandır"></i></div>' +
    '<div class="by-katman"></div>' +
    '<div class="by-etiket by-et-ref"></div><div class="by-etiket by-et-hedef"></div>' +
    '<div class="by-ipucu">Beyaz silüeti büyüt/küçült: alttaki kaydırıcı, fare tekerleği ya da köşedeki tutamak. Sürükleyip referansın yanına koyabilirsin.</div>';
  host.append(sahne);
  const refK = sahne.querySelector('.by-ref'), hedK = sahne.querySelector('.by-hedef');
  const silKur = (k, o, sk) => {
    const s = k.querySelector('.by-sil');
    if (sk.url){ s.style.setProperty('--m', 'url("' + sk.url + '")'); }
    else s.classList.add('yok');          // emoji çizilemedi: yuvarlak köşeli düz şekil
  };
  silKur(refK, ref, skR); silKur(hedK, hed, skH);
  const etR = sahne.querySelector('.by-et-ref'), etH = sahne.querySelector('.by-et-hedef');
  etR.innerHTML = '<b>' + byEsc(ref.ad) + '</b><span>' + byEsc(BOYUT_OLC[ref.olc]) + ': ' + BoyutCore.birim(ref.m) + '</span>';
  const oran = hed.m / ref.m;
  // ölçülen 1 px başına ekrandaki en/boy (şekle göre)
  const fR = byBoyut(ref, skR, 1), fH = byBoyut(hed, skH, 1);
  let bekleyen = 0, oncekiW = 0, bekleyenGoster = null, W = 0, H = 0, refPx = 0, tahPx = 0, zemin = 0, ust = 0, hx = 0, hy = 0, kilitli = !!ayar.kilitli, ilk = true, eskiRef = 0;
  // tahminin alabileceği en küçük / en büyük ölçü (gerçeğe bağlı değil, yalnızca sahneye sığma)
  const minPx = () => Math.max(4, ust * 0.04) / Math.max(fH.w, fH.h);
  const maxPx = () => Math.min((zemin - 8) / fH.h, (W - 16) / fH.w);
  function yerles(){
    W = sahne.clientWidth || 600; H = sahne.clientHeight || 400;
    zemin = H - 44; ust = zemin - 30;            // üstte ipucu yazısı payı
    // referansın ölçeği: ikisi de (hedef gerçek boyunda) sahneye sığsın ve çok küçük kalmasın; soru tohumuyla aralıkta bir yer seçilir
    const hi = Math.min(ust * 0.92 / fR.h, W * 0.40 / fR.w, ust * 0.92 / (fH.h * oran), W * 0.46 / (fH.w * oran));
    const lo = Math.min(hi, Math.max(ust * 0.10 / Math.max(fR.h, fR.w), ust * 0.10 / (Math.max(fH.h, fH.w) * oran)));
    refPx = lo + (hi - lo) * (soru.olcek == null ? 0.5 : soru.olcek);
    if (ilk){
      ilk = false; hx = W * 0.64; hy = 0;
      // başlangıçta beyaz, referansla aynı "ölçü pikselinde" durur (gerçek boyu ele vermez)
      tahPx = Math.max(minPx(), Math.min(maxPx(), bekleyen > 0 ? refPx * bekleyen / ref.m : refPx));
    } else if (eskiRef){ tahPx = Math.max(minPx(), Math.min(maxPx(), tahPx * refPx / eskiRef)); hx = hx * W / (oncekiW || W); }
    eskiRef = refPx; oncekiW = W;
    ciz();
    if (bekleyenGoster){ const b = bekleyenGoster; bekleyenGoster = null; goster(b[0], b[1]); }
  }
  // kutuyu ölçüye göre boyutlandır; alt kenarı zemine (dy kadar yukarı) ve ortası cx'e
  function kutuYerles(k, o, sk, px, cx, alt){
    const b = byBoyut(o, sk, px);
    k.style.width = b.w + 'px'; k.style.height = b.h + 'px';
    k.style.left = (cx - b.w / 2) + 'px'; k.style.top = (alt - b.h) + 'px';
    return b;
  }
  const hedBoy = () => byBoyut(hed, skH, tahPx);
  function ciz(){
    const rb = kutuYerles(refK, ref, skR, refPx, Math.max(W * 0.24, byBoyut(ref, skR, refPx).w / 2 + 8), zemin);
    const hb = hedBoy();
    hx = Math.max(hb.w / 2 + 2, Math.min(W - hb.w / 2 - 2, hx));
    hy = Math.max(-(zemin - hb.h) + 4, Math.min(0, hy));
    kutuYerles(hedK, hed, skH, tahPx, hx, zemin + hy);
    // etiketler sabit genişlikte; üst üste binerlerse beyazınki yana kayar (yazılar birbirine girmesin)
    const ew = etR.offsetWidth || 180, sinir = x => Math.max(ew / 2 + 4, Math.min(W - ew / 2 - 4, x));
    const cR = sinir(parseFloat(refK.style.left) + rb.w / 2);
    let cH = sinir(hx);
    if (hy > -40 && Math.abs(cH - cR) < ew + 6){
      const sag = cR + ew + 6, sol = cR - ew - 6;
      cH = sag <= W - ew / 2 - 4 ? sag : sol >= ew / 2 + 4 ? sol : cH;
    }
    etR.style.left = cR + 'px'; etR.style.top = (zemin + 4) + 'px';
    etH.style.left = cH + 'px'; etH.style.top = (zemin + 4 + hy) + 'px';
    if (!sahne.classList.contains('acildi')) etH.innerHTML = '<b>' + byEsc(hed.ad) + '</b><span>' + byEsc(BOYUT_OLC[hed.olc]) + ': <em>' + (ayar.izleyici ? '?' : BoyutCore.birim(tahminM()) + ' ?') + '</em></span>';
    sahne.querySelectorAll('.by-iz, .by-gercek').forEach(z => z._yer && z._yer());
    adlariAyir();
  }
  // açılışta diğer oyuncuların ad etiketleri: silüetlerin yanında bir sütunda, her biri kendi silüetinin tepe hizasında;
  // çakışan aşağı itilir, zemine taşarsa yukarı kaydırılır; sağda yer yoksa sahnenin tepesine dizilir (yazılar üst üste binmez)
  function adlariAyir(){
    const zs = [...sahne.querySelectorAll('.by-iz')];
    if (!zs.length) return;
    const ETH = 20;
    const cx = hx;
    const enGenis = Math.max(hedBoy().w, ...zs.map(z => parseFloat(z.style.width) || 0));
    const l = zs.map(z => ({ t: z._ad, y: parseFloat(z.style.top) })).sort((a, b) => a.y - b.y);
    l.forEach(o => { o.t.style.width = ''; });
    const gW = Math.max(...l.map(o => o.t.offsetWidth || 90));
    const sat = Math.max(1, Math.floor((zemin - 6) / (ETH + 2)));
    const sut = Math.ceil(l.length / sat), blokW = sut * (gW + 6) - 6;
    const x = cx + enGenis * 0.5 + 8;
    if (x + blokW > W - 6){
      let lx = 6, ly = 6;
      l.forEach(o => {
        const w = o.t.offsetWidth || 90;
        if (lx + w > W - 6 && lx > 6){ lx = 6; ly += ETH + 4; }
        o.t.style.left = lx + 'px'; o.t.style.top = ly + 'px';
        lx += w + 6;
      });
      return;
    }
    for (let c = 0; c < sut; c++){
      const grup = l.slice(c * sat, (c + 1) * sat);
      let son = -1e9;
      grup.forEach(o => { o.y = Math.max(4, o.y, son + ETH + 2); son = o.y; });
      for (let i = grup.length - 1, alt = zemin - ETH - 2; i >= 0; i--){ if (grup[i].y > alt) grup[i].y = alt; alt = grup[i].y - ETH - 2; }
      grup.forEach(o => { o.t.style.left = (x + c * (gW + 6)) + 'px'; o.t.style.top = Math.max(2, o.y) + 'px'; o.t.style.width = sut > 1 ? gW + 'px' : ''; });
    }
  }
  const tahminM = () => ref.m * tahPx / refPx;
  function ayarla(px){
    if (kilitli) return;
    tahPx = Math.max(minPx(), Math.min(maxPx(), px));
    sahne.classList.add('oynadi');
    ciz(); kaydDeger();
    if (ayar.onDegis) ayar.onDegis(tahminM());
  }
  // tekerlek
  sahne.addEventListener('wheel', e => { if (kilitli) return; e.preventDefault(); ayarla(tahPx * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  // sürükleme (taşı) ve tutamak (boyutlandır)
  let surukle = null;
  hedK.addEventListener('pointerdown', e => {
    if (kilitli) return;
    e.preventDefault(); hedK.setPointerCapture(e.pointerId);
    const tut = e.target.classList.contains('by-tut');
    const b = hedBoy();
    surukle = { tut, x: e.clientX, y: e.clientY, px: tahPx, oz: Math.max(b.w, b.h), hx, hy };
  });
  hedK.addEventListener('pointermove', e => {
    if (!surukle) return;
    const dx = e.clientX - surukle.x, dy = e.clientY - surukle.y;
    // tutamak: sağa/yukarı çekmek büyütür; şeklin büyük kenarı fare kadar uzar
    if (surukle.tut){ const d = Math.max(dx, -dy); ayarla(surukle.px * Math.max(0.05, (surukle.oz + d) / surukle.oz)); }
    else { hx = surukle.hx + dx; hy = surukle.hy + dy; sahne.classList.add('oynadi'); ciz(); }
  });
  const birak = () => { surukle = null; };
  hedK.addEventListener('pointerup', birak); hedK.addEventListener('pointercancel', birak);
  // klavye
  const tus = e => {
    if (kilitli || !sahne.isConnected || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) return;
    if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp'){ ayarla(tahPx * 1.04); e.preventDefault(); }
    else if (e.key === '-' || e.key === 'ArrowDown'){ ayarla(tahPx / 1.04); e.preventDefault(); }
    else if (e.key === 'ArrowLeft'){ hx -= 12; ciz(); e.preventDefault(); }
    else if (e.key === 'ArrowRight'){ hx += 12; ciz(); e.preventDefault(); }
    else if (e.key === 'Enter' && ayar.onKilit){ ayar.onKilit(tahminM()); e.preventDefault(); }
  };
  document.addEventListener('keydown', tus);
  // kaydırıcı (logaritmik)
  const kayd = byEl('input', 'by-kaydir'); kayd.type = 'range'; kayd.min = '0'; kayd.max = '1000'; kayd.step = '1';
  kayd.setAttribute('aria-label', 'Tahmin boyutu');
  const kaydDeger = () => { if (W) kayd.value = String(Math.round(1000 * Math.log(tahPx / minPx()) / Math.log(maxPx() / minPx()))); };
  kayd.oninput = () => { ayarla(minPx() * Math.pow(maxPx() / minPx(), +kayd.value / 1000)); };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (sahne.isConnected) { yerles(); kaydDeger(); } }) : null;
  if (ro) ro.observe(sahne);
  requestAnimationFrame(() => { yerles(); kaydDeger(); });

  // gerçek boyu ve (varsa) diğer tahminleri göster
  function goster(gercekM, tahminler){
    kilitli = true; sahne.classList.add('kilitli', 'acildi'); kayd.disabled = true;
    if (!refPx){ bekleyenGoster = [gercekM, tahminler]; return; }
    if (sahne.querySelector('.by-gercek')) return;
    const koy = (k, px) => kutuYerles(k, hed, skH, px, hx, zemin + hy);
    const yeniKutu = (cls, renk) => { const z = byEl('div', 'by-kutu ' + cls); z.innerHTML = silHtml(renk); silKur(z, hed, skH); return z; };
    (tahminler || []).forEach((t, n) => {
      const z = yeniKutu('by-iz', 'cizgi');
      const renk = t.renk || BY_RENK[n % BY_RENK.length];
      z.style.setProperty('--r', renk);
      z._ad = byEl('i', 'by-iz-ad', t.ad); z._ad.style.setProperty('--r', renk);
      sahne.querySelector('.by-katman').append(z._ad);
      z._yer = () => koy(z, Math.max(minPx() * 0.5, Math.min(maxPx() * 1.15, refPx * t.m / ref.m)));
      z._yer();
      sahne.querySelector('.by-katman').append(z);
    });
    adlariAyir();
    const g = yeniKutu('by-gercek', 'kirmizi');
    sahne.querySelector('.by-katman').prepend(g);       // diğer oyuncuların çizgileri kırmızının üstünde görünsün
    const hedefPx = () => refPx * gercekM / ref.m;
    let bitti = false;
    g._yer = () => { if (bitti) koy(g, hedefPx()); };
    if (reducedMotion()) { bitti = true; g._yer(); }
    else {
      const t0 = performance.now(), bas = tahPx;
      const adim = t => { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3); koy(g, bas * Math.pow(hedefPx() / bas, e)); if (k < 1 && g.isConnected) requestAnimationFrame(adim); else bitti = true; };
      requestAnimationFrame(adim);
    }
    etH.innerHTML = '<b>' + byEsc(hed.ad) + '</b><span>' + byEsc(BOYUT_OLC[hed.olc]) + ': <strong>' + BoyutCore.birim(gercekM) + '</strong></span>';
  }
  if (kilitli){ sahne.classList.add('kilitli'); kayd.disabled = true; }
  if (ayar.izleyici) sahne.classList.add('izleyici');
  return {
    kaydirici: kayd, tahminM, goster, sahne,
    // başkasının tahminini izlerken (sıralı mod): boyutu dışarıdan ayarla
    izle(m){ if (!(m > 0) || !refPx){ bekleyen = m; return; } tahPx = Math.max(minPx(), Math.min(maxPx(), refPx * m / ref.m)); ciz(); },
    acik(){ return !kilitli; },
    kilitle(){ kilitli = true; sahne.classList.add('kilitli'); kayd.disabled = true; return tahminM(); },
    yokEt(){ document.removeEventListener('keydown', tus); if (ro) ro.disconnect(); }
  };
}

// ================== tek kişilik ==================
(function(){
  if (typeof registerSolo !== 'function') return;
  registerSolo({
    id: 'boyut', name: 'Boyut Bilmece', icon: '📏',
    desc: 'Fil mi büyük zürafa mı? Siluetini boyutlandır, gerçek boyuna en yakın tahmini yap.',
    levels: [{ id: 'gunluk', name: 'Günlük (5 soru)' }, { id: 'uzun', name: 'Uzun (10 soru)' }],
    daily: true, better: 'high',
    format: s => s + ' puan',
    mount(root, ctx){
      const n = ctx.level === 'uzun' ? 10 : 5;
      let serbest = !!ctx.alreadyPlayed, kat = 'karisik';
      const wrap = byEl('div', 'by-wrap');
      root.append(wrap);
      let sahne = null, toplam = 0, tur = 0, liste = [], sonuclar = [];
      function giris(){
        wrap.innerHTML = '';
        const k = byEl('div', 'by-giris');
        k.innerHTML = '<div class="by-logo"><span>📏</span><b>BOYUT</b><i>BİLMECE</i></div>' +
          '<p>Siyah silüetin gerçek boyu verilir. Beyaz silüeti, ona göre gerçek boyu kadar olacak şekilde büyüt ya da küçült ve kilitle. Ne kadar yakınsan o kadar puan: her soru en fazla 100 puan.</p>';
        if (!serbest){
          k.append(byEl('p', 'by-gunluk', '📅 Bugünün ' + n + ' sorusu herkes için aynı. Skorun tabloya yazılır.'));
          const b = byEl('button', 'btn primary by-basla', '▶ Başla'); b.type = 'button'; b.onclick = () => basla(ctx.seed >>> 0); k.append(b);
        } else {
          k.append(byEl('p', 'by-gunluk', 'Bugünün sorularını çözdün. İstediğin kadar serbest oynayabilirsin (tabloya yazılmaz).'));
        }
        const s = byEl('div', 'by-kat');
        [['karisik', '🎲 Karışık']].concat(Object.entries(BOYUT_KAT)).forEach(([id, ad]) => {
          const b = byEl('button', 'by-kat-b' + (kat === id ? ' on' : ''), ad); b.type = 'button';
          b.onclick = () => { kat = id; serbestBasla(); };
          s.append(b);
        });
        k.append(byEl('h4', '', serbest ? 'Kategori seç ve başla' : 'Ya da serbest oyna:'), s);
        wrap.append(k);
      }
      function serbestBasla(){ serbest = true; basla((Math.random() * 4294967296) >>> 0); }
      function basla(seed){
        liste = BoyutCore.sorular(n, seed, serbest ? kat : 'karisik');
        tur = 0; toplam = 0; sonuclar = [];
        soru();
      }
      function soru(){
        if (sahne) sahne.yokEt();
        wrap.innerHTML = '';
        const q = liste[tur];
        const ust = byEl('div', 'by-ust');
        ust.innerHTML = '<span class="by-tur">Soru ' + (tur + 1) + '/' + liste.length + '</span><span class="by-noktalar">' +
          liste.map((x, i) => '<i class="' + (i < tur ? (sonuclar[i] >= 85 ? 'iyi' : sonuclar[i] >= 50 ? 'orta' : 'kotu') : i === tur ? 'simdi' : '') + '"></i>').join('') +
          '</span><span class="by-puan">' + toplam + ' puan</span>';
        const soruYazi = byEl('div', 'by-soru');
        const h = byOge(q.hedef), r = byOge(q.ref);
        soruYazi.innerHTML = '<b>' + byEsc(h.ad) + '</b>, <b>' + byEsc(r.ad) + '</b> yanında ne kadar? <span>(' + byEsc(BOYUT_OLC[h.olc]) + ')</span>';
        const alan = byEl('div', 'by-alan');
        const alt = byEl('div', 'by-alt');
        wrap.append(ust, soruYazi, alan, alt);
        sahne = boyutSahne(alan, q, { onKilit: () => kilit() });
        const kb = byEl('button', 'btn primary by-kilit', '🔒 Kilitle'); kb.type = 'button'; kb.onclick = kilit;
        alt.append(byEl('span', 'by-k-ikon', '🔍'), sahne.kaydirici, byEl('span', 'by-k-ikon buyuk', '🔍'), kb);
        function kilit(){
          if (!sahne || alt.dataset.bitti) return;
          alt.dataset.bitti = '1';
          const m = sahne.kilitle(), p = BoyutCore.puan(m, h.m), sp = BoyutCore.sapma(m, h.m);
          toplam += p; sonuclar.push(p);
          sahne.goster(h.m);
          ctx.sound && ctx.sound(p >= 85 ? 'win' : p >= 50 ? 'turn' : 'err');
          alt.innerHTML = '';
          const sonuc = byEl('div', 'by-sonuc');
          sonuc.innerHTML = '<div class="by-s-puan"><b>' + p + '</b><small>puan</small></div>' +
            '<div class="by-s-yazi"><b>' + BoyutCore.yorum(p) + '</b><span>Tahminin ' + BoyutCore.birim(m) + ' · gerçek ' + BoyutCore.birim(h.m) + ' · ' + (sp === 0 ? 'tam isabet' : '%' + Math.abs(sp) + (sp > 0 ? ' büyük' : ' küçük')) + '</span>' +
            (h.bilgi ? '<em>💡 ' + byEsc(h.bilgi) + '</em>' : '') + '</div>';
          const ileri = byEl('button', 'btn primary', tur + 1 < liste.length ? 'Sonraki ▶' : '🏁 Sonuç'); ileri.type = 'button';
          ileri.onclick = () => { tur++; if (tur < liste.length) soru(); else bitir(); };
          sonuc.append(ileri);
          alt.append(sonuc);
          ust.querySelector('.by-puan').textContent = toplam + ' puan';
          setTimeout(() => ileri.focus({ preventScroll: true }), 50);
        }
      }
      function bitir(){
        if (sahne){ sahne.yokEt(); sahne = null; }
        if (!serbest){ ctx.finish({ score: toplam, detail: { sorular: sonuclar } }); return; }
        wrap.innerHTML = '';
        const k = byEl('div', 'by-giris');
        k.innerHTML = '<div class="by-logo"><span>🏁</span><b>' + toplam + '</b><i>/ ' + (liste.length * 100) + ' PUAN</i></div><p>' + sonuclar.map(p => (p >= 85 ? '🟩' : p >= 50 ? '🟨' : '🟥')).join('') + '</p>';
        const b = byEl('button', 'btn primary', '↻ Yeni tur'); b.type = 'button'; b.onclick = serbestBasla;
        const g = byEl('button', 'btn', 'Kategori değiştir'); g.type = 'button'; g.onclick = giris;
        k.append(b, g); wrap.append(k);
      }
      giris();
      return { destroy(){ if (sahne) sahne.yokEt(); } };
    }
  });
})();

// ================== masa (toplu / sıralı) ==================
const BY_MASA = new Map();
function renderBoyut(body, s, lv){
  const v = lv.v, seat = lv.seat;
  let ui = BY_MASA.get(s.id);
  if (!ui){ ui = {}; BY_MASA.set(s.id, ui); }
  let root = body.querySelector('.by-masa');
  if (!root || root.dataset.tid !== s.id){
    if (ui.sahne){ ui.sahne.yokEt(); ui.sahne = null; }
    body.innerHTML = '';
    root = byEl('div', 'by-masa'); root.dataset.tid = s.id;
    root.innerHTML = '<div class="by-ust by-m-ust"></div><div class="by-m-oyuncular"></div><div class="by-soru"></div><div class="by-alan"></div><div class="by-alt"></div>';
    body.append(root);
    ui.key = '';
  }
  ui.v = v; ui.seat = seat; ui.root = root;
  byMasaSigdir(ui);
  ui.deadline = v.left ? Date.now() + v.left : 0;
  const ad = k => (v.names[k] || ('Oyuncu ' + (k + 1)));
  const renk = k => BY_RENK[k % BY_RENK.length];
  const ust = root.querySelector('.by-m-ust'), oy = root.querySelector('.by-m-oyuncular');
  const soruEl = root.querySelector('.by-soru'), alan = root.querySelector('.by-alan'), alt = root.querySelector('.by-alt');
  const ben = v.order.includes(seat);
  const q = v.qs[Math.min(v.qi, v.qs.length - 1)];
  const h = byOge(q.hedef), r = byOge(q.ref);

  // üst şerit
  const benimSiram = v.phase === 'guess' && (v.mode === 'sirali' ? v.aktor === seat : ben && v.guesses[seat] == null);
  ust.innerHTML = '<span class="by-mod">' + (v.mode === 'sirali' ? '🔁 Sıralı' : '👥 Toplu') + '</span>' +
    '<span class="by-tur">Soru ' + (v.qi + 1) + '/' + v.qs.length + '</span>' +
    '<span class="by-kim"></span><span class="by-sure"></span>';
  const kim = ust.querySelector('.by-kim');
  if (v.phase === 'over') kim.textContent = '🏁 Oyun bitti';
  else if (v.mode === 'sirali') kim.innerHTML = v.phase === 'guess' ? (v.aktor === seat ? '<b class="sen">Sıra sende!</b>' : 'Sıra: <b style="color:' + renk(v.aktor) + '">' + byEsc(ad(v.aktor)) + '</b> tahmin ediyor') : 'Sonuç';
  else kim.innerHTML = v.phase === 'guess' ? (benimSiram ? '<b class="sen">Tahminini yap ve kilitle!</b>' : ben ? 'Kilitledin, diğerleri bekleniyor…' : 'Oyuncular tahmin ediyor…') : 'Sonuçlar';

  // oyuncular
  const sira = v.order.slice().sort((a, b) => v.pts[b] - v.pts[a]);
  oy.innerHTML = '';
  sira.forEach(k => {
    const c = byEl('span', 'by-oyuncu' + (k === seat ? ' ben' : '') + (v.mode === 'sirali' && v.aktor === k && v.phase === 'guess' ? ' aktif' : ''));
    c.style.setProperty('--r', renk(k));
    let durum = '';
    if (v.phase === 'guess' && v.mode === 'toplu') durum = v.guesses[k] != null ? '🔒' : '⏳';
    if (v.phase === 'reveal'){ const l = v.last.find(x => x.seat === k); if (l) durum = '+' + l.p; }
    c.innerHTML = '<i></i><b>' + byEsc(ad(k)) + '</b><em>' + v.pts[k] + '</em>' + (durum ? '<small>' + durum + '</small>' : '');
    oy.append(c);
  });

  if (v.phase === 'over'){ byMasaSon(ui, root, s, v, seat, ad, renk); return; }
  root.classList.remove('bitti');
  const eskiSon = root.querySelector('.by-m-son'); if (eskiSon) eskiSon.remove();

  soruEl.innerHTML = '<b>' + byEsc(h.ad) + '</b>, <b>' + byEsc(r.ad) + '</b> yanında ne kadar? <span>(' + byEsc(BOYUT_OLC[h.olc]) + ')</span>';

  // sahne: soru değişince yeniden kurulur
  const key = v.gameNo + ':' + v.uid + ':' + v.qi;
  if (ui.key !== key){
    if (ui.sahne) ui.sahne.yokEt();
    alan.innerHTML = ''; alt.innerHTML = '';
    ui.key = key; ui.acildi = false; ui.alt = '';
    const etkin = v.phase === 'guess' && benimSiram;
    let son = 0;
    ui.sahne = boyutSahne(alan, q, {
      kilitli: !etkin,
      izleyici: v.mode === 'sirali' ? false : !ben,
      onDegis: m => {
        if (ui.v.mode !== 'sirali') return;
        const t = Date.now();
        clearTimeout(ui.tasT);
        if (t - son > 180){ son = t; tableAct({ type: 'taslak', m }); }
        else ui.tasT = setTimeout(() => { son = Date.now(); tableAct({ type: 'taslak', m }); }, 180);
      },
      onKilit: () => byMasaKilit(ui)
    });
  }
  const sh = ui.sahne;
  if (v.mode === 'sirali' && v.phase === 'guess' && v.aktor !== seat && v.taslak > 0) sh.izle(v.taslak);
  if (v.mode === 'toplu' && v.phase === 'guess' && v.guesses[seat] > 0) { if (sh.acik()) sh.kilitle(); sh.izle(v.guesses[seat]); }

  if (v.phase === 'reveal' && !ui.acildi){
    ui.acildi = true;
    if (v.mode === 'sirali'){ const l = v.last[0]; if (l && l.m > 0) sh.izle(l.m); sh.goster(h.m, []); }
    else {
      const mine = v.last.find(x => x.seat === seat);
      if (mine && mine.m > 0) sh.izle(mine.m);
      sh.goster(h.m, v.last.filter(x => x.seat !== seat && x.m > 0).map(x => ({ ad: ad(x.seat), renk: renk(x.seat), m: x.m })));
    }
    const benimki = v.last.find(x => x.seat === seat);
    if (typeof gameSound === 'function') gameSound(benimki ? (benimki.p >= 85 ? 'win' : benimki.p >= 50 ? 'turn' : 'err') : 'turn');
  }

  // alt kısım
  const altKey = v.phase + ':' + (benimSiram ? 1 : 0) + ':' + (v.guesses[seat] != null ? 1 : 0);
  if (ui.alt !== altKey){
    ui.alt = altKey; alt.innerHTML = '';
    if (v.phase === 'guess' && benimSiram){
      const kb = byEl('button', 'btn primary by-kilit', '🔒 Kilitle'); kb.type = 'button'; kb.onclick = () => byMasaKilit(ui);
      alt.append(byEl('span', 'by-k-ikon', '🔍'), sh.kaydirici, byEl('span', 'by-k-ikon buyuk', '🔍'), kb);
    } else if (v.phase === 'guess'){
      alt.append(byEl('p', 'by-bekle', v.mode === 'sirali' ? (byEsc(ad(v.aktor)) + ' silüeti boyutlandırıyor, izle 👀') : ben ? '🔒 Tahminin kilitlendi. Herkes kilitleyince ya da süre bitince sonuç açılır.' : '👀 İzliyorsun'));
    } else {
      const box = byEl('div', 'by-sonuc by-m-sonuc');
      const liste = byEl('div', 'by-m-liste');
      v.last.forEach(l => {
        const sp = l.m > 0 ? BoyutCore.sapma(l.m, h.m) : null;
        const row = byEl('div', 'by-m-satir' + (l.seat === seat ? ' ben' : ''));
        row.style.setProperty('--r', renk(l.seat));
        row.innerHTML = '<i></i><b>' + byEsc(ad(l.seat)) + '</b><span>' + (l.m > 0 ? BoyutCore.birim(l.m) + ' · ' + (sp === 0 ? 'tam' : '%' + Math.abs(sp) + (sp > 0 ? ' büyük' : ' küçük')) : 'süre doldu') + '</span><em>+' + l.p + '</em>';
        liste.append(row);
      });
      box.append(liste);
      const yan = byEl('div', 'by-s-yazi');
      yan.innerHTML = '<b>Gerçek: ' + BoyutCore.birim(h.m) + '</b>' + (h.bilgi ? '<em>💡 ' + byEsc(h.bilgi) + '</em>' : '');
      if (s.owner === peer.id){ const d = byEl('button', 'btn', v.qi + 1 >= v.qs.length ? '🏁 Sonuç' : 'Devam ▶'); d.type = 'button'; d.onclick = () => tableAct({ type: 'devam' }); yan.append(d); }
      box.append(yan);
      alt.append(box);
    }
  }
  byMasaSaat(ui, ust.querySelector('.by-sure'));
}
// masa yüksekliği: masaüstünde salon alanına tam sığar; telefonda ekran boyu kadar olur (sayfa yalnızca üst düğmeler kadar kayar)
function byMasaSigdir(ui){
  const root = ui.root; if (!root || !root.isConnected) return;
  const deck = root.closest('.deck'), shell = root.closest('.game-shell');
  const bar = shell && shell.querySelector('.gs-bar');
  if (bar && ui.barEl !== bar && typeof ResizeObserver === 'function'){ ui.barEl = bar; new ResizeObserver(() => requestAnimationFrame(() => byMasaSigdir(ui))).observe(bar); }
  if (!ui.pencere){ ui.pencere = () => byMasaSigdir(ui); window.addEventListener('resize', ui.pencere); }
  const dar = window.matchMedia('(max-width:760px)').matches;
  // ekranda oyunun başladığı yer (kaydırma hesaba katılmadan) ile alttaki mikrofon çubuğu arasında kalan alan
  const ustY = root.getBoundingClientRect().top + (deck ? deck.scrollTop : 0) + window.scrollY;
  const alt = document.querySelector('.room footer.bar');
  const altH = alt ? alt.offsetHeight : 0;
  const h = dar ? Math.max(460, window.innerHeight - 24) : Math.max(380, Math.floor(window.innerHeight - ustY - altH - 12));
  root.style.setProperty('--byh', h + 'px');
}
function byMasaKilit(ui){
  if (!ui.sahne || !ui.sahne.acik()) return;
  const m = ui.sahne.kilitle();
  clearTimeout(ui.tasT);
  tableAct({ type: 'kilit', m });
  if (typeof gameSound === 'function') gameSound('tile');
}
function byMasaSaat(ui, el){
  clearInterval(ui.saat);
  const yaz = () => {
    if (!el.isConnected){ clearInterval(ui.saat); return; }
    const kalan = ui.deadline ? Math.max(0, ui.deadline - Date.now()) : 0;
    el.textContent = kalan ? '⏱ ' + Math.ceil(kalan / 1000) : '';
    el.classList.toggle('az', kalan > 0 && kalan < 8000);
    // süre biterken kendi tahminini otomatik kilitle (boşa gitmesin)
    const v = ui.v;
    if (kalan > 0 && kalan < 600 && v.phase === 'guess' && ui.sahne && ui.sahne.acik() &&
        (v.mode === 'sirali' ? v.aktor === ui.seat : v.order.includes(ui.seat))) byMasaKilit(ui);
  };
  yaz(); ui.saat = setInterval(yaz, 250);
}
function byMasaSon(ui, root, s, v, seat, ad, renk){
  if (ui.sahne){ ui.sahne.yokEt(); ui.sahne = null; }
  ui.key = ''; clearInterval(ui.saat);
  root.classList.add('bitti');
  root.querySelector('.by-alan').innerHTML = ''; root.querySelector('.by-alt').innerHTML = ''; root.querySelector('.by-soru').innerHTML = '';
  let son = root.querySelector('.by-m-son');
  if (son && son.dataset.g === String(v.uid)) return;
  if (son) son.remove();
  son = byEl('div', 'by-m-son'); son.dataset.g = String(v.uid);
  const sira = v.order.slice().sort((a, b) => v.pts[b] - v.pts[a]);
  const enCok = (v.mode === 'sirali' ? v.tur : v.qs.length) * 100;
  son.innerHTML = '<div class="by-logo"><span>🏆</span><b>' + byEsc(ad(sira[0])) + '</b><i>KAZANDI</i></div>';
  const ol = byEl('ol', 'by-m-podyum');
  sira.forEach((k, n) => {
    const li = byEl('li', k === seat ? 'ben' : '');
    li.style.setProperty('--r', renk(k));
    li.innerHTML = '<span>' + (['🥇', '🥈', '🥉'][n] || (n + 1) + '.') + '</span><b>' + byEsc(ad(k)) + '</b><em>' + v.pts[k] + ' / ' + enCok + '</em><small>' + v.dogru[k] + ' çok yakın</small>';
    ol.append(li);
  });
  son.append(ol);
  if (s.owner === peer.id){ const b = byEl('button', 'btn primary', '↻ Yeni oyun'); b.type = 'button'; b.onclick = () => tableAct({ type: 'newMatch' }); son.append(b); }
  else son.append(byEl('p', 'note', 'Masa sahibi yeni oyun başlatabilir.'));
  root.append(son);
  if (sira[0] === seat && typeof confetti === 'function') confetti(son);
  if (typeof gameSound === 'function') gameSound(sira[0] === seat ? 'win' : 'turn');
}
