// Toplantı / ders kaydı: paylaşılan ekranın üstündeki "⏺ Kaydet" düğmesi o ekranı ve odada duyduğun bütün sesleri
// (kendi mikrofonun, kanaldakiler, ekranın kendi sesi) tek dosyaya kaydeder. "⏹ Bitir" deyince dosya bilgisayarına iner.
//  • Kayıt sırasında dosya tarayıcının kendi diskine (OPFS) parça parça yazılır: saatlerce sürse de bellek dolmaz.
//    Tarayıcı desteklemiyorsa bellekte tutulur.
//  • Sayfa kayıt sırasında kapanırsa (çökme, pil) sonraki açılışta "yarım kalan kaydı indir" çıkar.
//  • Kayıt alan kişi odadaki herkese duyurulur: herkesin ekranında "🔴 Kaan kayıt alıyor" yazar.
//  • Dosya biçimi: tarayıcı destekliyorsa mp4 (her yerde açılır), yoksa webm.
(function(){
  const K = { rec: null, akis: null, video: null, kaynak: '', t0: 0, saat: null, parcalar: [], yazici: null, dosyaAdi: '', opfs: null,
              zincir: Promise.resolve(), sesler: new Map(), hedef: null, sesTimer: null, duyuru: null, bitiyor: false, ext: 'webm', tip: '' };
  const kaydedenler = new Map();             // id → { ad, son }
  const ACIK_KEY = 'oyunodasi-kayit-acik';
  const destek = () => typeof MediaRecorder !== 'undefined';

  function tipSec(){
    const adaylar = [
      ['video/mp4;codecs=avc1.42E01F,mp4a.40.2', 'mp4'], ['video/mp4;codecs=avc1,mp4a', 'mp4'],
      ['video/webm;codecs=vp9,opus', 'webm'], ['video/webm;codecs=vp8,opus', 'webm'], ['video/webm', 'webm'], ['video/mp4', 'mp4']
    ];
    for (const [t, e] of adaylar) try { if (MediaRecorder.isTypeSupported(t)) return [t, e]; } catch(err){}
    return ['', 'webm'];
  }
  const iki = n => String(n).padStart(2, '0');
  const sure = ms => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600); return (h ? h + ':' + iki(Math.floor(s / 60) % 60) : Math.floor(s / 60)) + ':' + iki(s % 60); };
  const temizAd = s => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  function tarih(){ const d = new Date(); return d.getFullYear() + '-' + iki(d.getMonth() + 1) + '-' + iki(d.getDate()) + ' ' + iki(d.getHours()) + '.' + iki(d.getMinutes()); }

  // ---------- tarayıcının diski (OPFS) ----------
  async function opfsDizin(){ try { return navigator.storage && navigator.storage.getDirectory ? await navigator.storage.getDirectory() : null; } catch(e){ return null; } }
  // her 2 sn'lik parça ayrı küçük dosya olarak yazılıp hemen kapatılır: sayfa çökerse bile o ana kadarki kısım diskte kalır
  // (tek dosyaya yazılsa tarayıcı onu ancak kapatınca kaydeder, çökmede hepsi gider)
  async function opfsAc(kok){
    const d = await opfsDizin(); if (!d) return null;
    try {
      const fh = await d.getFileHandle(kok + '-000000.part', { create: true });
      if (!fh.createWritable) return null;
      const w = await fh.createWritable(); await w.close();
      return { d, kok, n: 0 };
    } catch(e){ return null; }
  }
  async function parcaYaz(o, blob){
    const fh = await o.d.getFileHandle(o.kok + '-' + String(++o.n).padStart(6, '0') + '.part', { create: true });
    const w = await fh.createWritable(); await w.write(blob); await w.close();
  }
  // kaydın parçalarını sırayla birleştir (diskteki dosyalar belleğe kopyalanmadan tek dosya gibi indirilir)
  async function parcalariTopla(d, kok, tip){
    const adlar = [];
    try { for await (const h of d.values()) if (h.kind === 'file' && h.name.startsWith(kok + '-') && h.name.endsWith('.part')) adlar.push(h.name); } catch(e){}
    adlar.sort();
    const dosyalar = [];
    for (const n of adlar) try { const f = await (await d.getFileHandle(n)).getFile(); if (f.size) dosyalar.push(f); } catch(e){}
    return new Blob(dosyalar, { type: tip });
  }
  function indir(blob, ad){
    const u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = ad; a.rel = 'noopener'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 120000);
  }

  // ---------- ses karışımı: kanalda duyduğun herkes + benim mikrofonum + ekranın sesi ----------
  function sesBagla(stream){
    if (!stream || K.sesler.has(stream) || !stream.getAudioTracks().length || !audioCtx) return;
    try { const s = audioCtx.createMediaStreamSource(stream); s.connect(K.hedef); K.sesler.set(stream, s); } catch(e){}
  }
  function sesleriTazele(ekranAkisi){
    if (!K.hedef) return;
    if (typeof localStream !== 'undefined') sesBagla(localStream);
    if (ekranAkisi) sesBagla(ekranAkisi);
    if (typeof peers !== 'undefined') peers.forEach(p => { if (p.micStream && (typeof sameChan !== 'function' || sameChan(p))) sesBagla(p.micStream); });
    // ayrılanların bağlantısını kopar
    K.sesler.forEach((s, st) => { if (!st.getAudioTracks().some(t => t.readyState === 'live')){ try { s.disconnect(); } catch(e){} K.sesler.delete(st); } });
  }

  // ---------- kaydı başlat / bitir ----------
  async function baslat(kaynak){
    if (K.rec) return;
    if (!destek()){ toast('Bu tarayıcı kayıt almayı desteklemiyor. Chrome ya da Edge ile dene.'); return; }
    const vt = kaynak.stream && kaynak.stream.getVideoTracks().find(t => t.readyState === 'live');
    if (!vt){ toast('Kaydedilecek görüntü yok.'); return; }
    if (typeof ensureCtx === 'function') ensureCtx();
    try { K.hedef = audioCtx.createMediaStreamDestination(); } catch(e){ K.hedef = null; }
    K.sesler.clear();
    sesleriTazele(kaynak.stream);
    const izler = [vt].concat(K.hedef ? K.hedef.stream.getAudioTracks() : []);
    K.akis = new MediaStream(izler); K.video = vt; K.kaynak = kaynak.ad;
    const [tip, ext] = tipSec(); K.tip = tip; K.ext = ext;
    K.dosyaAdi = temizAd('Oyun Odası kaydı - ' + kaynak.ad + ' - ' + tarih()) + '.' + ext;
    K.parcalar = []; K.yazici = null; K.opfs = null; K.yedek = false; K.zincir = Promise.resolve(); K.bitiyor = false;
    const o = await opfsAc('kayit-' + Date.now());
    // kayıt sürdükçe kilit tutulur: aynı anda açık başka bir sekme bunu "yarım kalan kayıt" sanıp silmesin
    if (o && navigator.locks) try { navigator.locks.request(o.kok, () => new Promise(r => { K.kilitBirak = r; })); } catch(e){}
    if (o){ K.opfs = o; try { localStorage.setItem(ACIK_KEY, JSON.stringify({ kok: o.kok, ad: K.dosyaAdi, tip: (tip || 'video/webm').split(';')[0], ts: Date.now() })); } catch(e){} }
    let rec;
    try { rec = new MediaRecorder(K.akis, Object.assign({ videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000 }, tip ? { mimeType: tip } : {})); }
    catch(e){ try { rec = new MediaRecorder(K.akis); } catch(e2){ toast('Kayıt başlatılamadı: ' + (e2.message || e2)); return temizle(); } }
    K.rec = rec;
    rec.ondataavailable = e => {
      if (!e.data || !e.data.size) return;
      if (K.opfs && K.yedek){ K.parcalar.push(e.data); return; }
      if (K.opfs){ const o = K.opfs; K.zincir = K.zincir.then(() => parcaYaz(o, e.data)).catch(() => { K.yedek = true; K.parcalar.push(e.data); }); }
      else K.parcalar.push(e.data);
    };
    rec.onstop = () => kaydet();
    rec.onerror = () => { toast('Kayıt hatası, şimdiye kadarki kısım kaydediliyor'); bitir(); };
    vt.addEventListener('ended', K.bitti = () => { if (K.rec){ toast('Ekran paylaşımı bitti, kayıt kaydediliyor'); bitir(); } });
    rec.start(2000);
    K.t0 = Date.now();
    K.sesTimer = setInterval(() => sesleriTazele(kaynak.stream), 2000);
    K.saat = setInterval(ciz, 1000);
    duyur(true); K.duyuru = setInterval(() => duyur(true), 10000);
    if (typeof hareket === 'function') hareket('ekran', 'kayıt başlattı: ' + kaynak.ad);
    toast('🔴 Kayıt başladı. Bitince dosya bilgisayarına inecek.');
    ciz();
  }
  function bitir(){
    if (!K.rec || K.bitiyor) return;
    K.bitiyor = true;
    try { if (K.rec.state !== 'inactive') K.rec.stop(); else kaydet(); } catch(e){ kaydet(); }
  }
  async function kaydet(){
    const sureMs = Date.now() - K.t0, ad = K.dosyaAdi;
    try {
      let dosya = null;
      if (K.opfs){
        await K.zincir;
        try { dosya = await parcalariTopla(K.opfs.d, K.opfs.kok, (K.tip || 'video/webm').split(';')[0]); } catch(e){ dosya = null; }
        if (dosya && K.yedek) dosya = new Blob([dosya].concat(K.parcalar), { type: dosya.type });   // disk dolduysa kalan kısım bellekte
        if (!dosya || !dosya.size) dosya = null;
      }
      if (!dosya) dosya = new Blob(K.parcalar, { type: (K.tip || 'video/webm').split(';')[0] });
      if (dosya.size){
        indir(dosya, ad);
        toast('💾 Kayıt indirildi: ' + ad + ' (' + sure(sureMs) + ', ' + (dosya.size / 1048576).toFixed(1) + ' MB)');
        // Toplantı & Ders kanalında: herkesle paylaşma yolunu hatırlat
        if (typeof myChan === 'function' && myChan().type === 'ders') setTimeout(() => toast('Herkesle paylaşmak için Google Drive’a yükle, linkini üstteki 🔗 Kayıt linki’ne yapıştır.'), 4500);
      } else toast('Kayıt boş kaldı.');
      try { localStorage.removeItem(ACIK_KEY); } catch(e){}
    } catch(e){ toast('Kayıt kaydedilemedi: ' + (e.message || e)); }
    temizle();
    const sonra = K.sonra; K.sonra = null;
    if (sonra) setTimeout(sonra, 1500);              // indirme başlasın, sonra sayfa yenilensin
  }
  function temizle(){
    clearInterval(K.saat); clearInterval(K.sesTimer); clearInterval(K.duyuru);
    if (K.video && K.bitti) K.video.removeEventListener('ended', K.bitti);
    K.sesler.forEach(s => { try { s.disconnect(); } catch(e){} }); K.sesler.clear();
    if (K.rec) duyur(false);
    if (K.kilitBirak){ K.kilitBirak(); K.kilitBirak = null; }
    K.rec = null; K.akis = null; K.video = null; K.hedef = null; K.parcalar = []; K.opfs = null; K.bitiyor = false;
    ciz();
  }
  function duyur(on){ try { if (typeof broadcast === 'function' && typeof joined !== 'undefined' && joined) broadcast({ t: 'kayit', on: !!on }); } catch(e){} }

  // ---------- ekran kutularına düğme ----------
  function kaynakBul(tile){
    if (typeof localScreenTile !== 'undefined' && tile === localScreenTile && typeof screenStream !== 'undefined' && screenStream)
      return { ad: (shareInfo && shareInfo.fromFile ? shareInfo.title || 'film' : 'Benim ekranım'), stream: screenStream };
    if (typeof peers !== 'undefined') for (const p of peers.values()) if (p.tile === tile && p.screenStream) return { ad: p.name + ' ekranı', stream: p.screenStream };
    return null;
  }
  function dugmeEkle(tile){
    const tools = tile.querySelector('.screen-tools'); if (!tools || tools.querySelector('.kayit-btn')) return;
    const b = document.createElement('button'); b.className = 'kayit-btn'; b.type = 'button';
    b.onclick = () => {
      if (K.rec){ if (K.tile === tile) bitir(); else toast('Zaten başka bir ekranı kaydediyorsun. Önce onu bitir.'); return; }
      const k = kaynakBul(tile); if (!k){ toast('Bu ekran şu an kaydedilemiyor.'); return; }
      K.tile = tile; baslat(k);
    };
    tools.prepend(b); ciz();
  }
  function ciz(){
    const on = !!K.rec, t = on ? sure(Date.now() - K.t0) : '';
    document.querySelectorAll('#screens .kayit-btn').forEach(b => {
      const bu = on && b.closest('.screen') === K.tile;
      b.textContent = bu ? '⏹ Kaydı bitir · ' + t : '⏺ Kaydet';
      b.title = bu ? 'Kaydı bitir ve bilgisayarına indir' : 'Bu ekranı ve odadaki sesleri kaydet (bilgisayarına iner)';
      b.classList.toggle('kayitta', bu);
      b.disabled = on && !bu;
    });
    pill();
  }
  // üstte kırmızı şerit: kendim kaydediyorsam süre, başkası kaydediyorsa adı (kayıt alındığını herkes bilsin)
  function pill(){
    let el = document.getElementById('kayitPill');
    const simdi = Date.now();
    kaydedenler.forEach((v, id) => { if (simdi - v.son > 25000) kaydedenler.delete(id); });
    const adlar = [...kaydedenler.values()].map(v => v.ad);
    const metin = K.rec ? '🔴 Kayıt alıyorsun · ' + sure(simdi - K.t0) + (adlar.length ? ' · ' + adlar.join(', ') + ' de kaydediyor' : '')
      : adlar.length ? '🔴 ' + adlar.join(', ') + ' kayıt alıyor' : '';
    if (!metin || typeof joined === 'undefined' || !joined){ if (el) el.hidden = true; return; }
    if (!el){
      el = document.createElement('button'); el.id = 'kayitPill'; el.type = 'button';
      el.onclick = () => { if (K.rec) bitir(); };
      document.body.append(el);
    }
    el.hidden = false; el.textContent = metin + (K.rec ? '  ⏹' : ''); el.classList.toggle('benim', !!K.rec);
    el.title = K.rec ? 'Kaydı bitir ve indir' : 'Bu odada kayıt alınıyor';
  }
  setInterval(() => { if (kaydedenler.size) pill(); }, 5000);

  // gelen mesaj: başkası kayıt başlattı / bitirdi
  window.kayitOnData = (id, d) => {
    if (d.t !== 'kayit') return false;
    const p = typeof peers !== 'undefined' && peers.get(id);
    if (d.on){
      const yeni = !kaydedenler.has(id);
      kaydedenler.set(id, { ad: p ? p.name : 'Biri', son: Date.now() });
      if (yeni) toast('🔴 ' + (p ? p.name : 'Biri') + ' kayıt almaya başladı');
    } else if (kaydedenler.delete(id)) toast('⏹ ' + (p ? p.name : 'Biri') + ' kaydı bitirdi');
    pill();
    return true;
  };
  // odadan çıkarken: kayıt varsa önce kaydedip indir, sonra çık (sonra) — kayıt yoksa false döner
  window.kayitBitir = sonra => { if (!K.rec) return false; K.sonra = sonra || null; bitir(); return true; };
  window.kayitDurum = () => ({ aktif: !!K.rec, sure: K.rec ? Date.now() - K.t0 : 0, dosya: K.dosyaAdi, opfs: !!K.opfs, tip: K.tip, sesler: K.sesler.size });

  const ekranlar = document.getElementById('screens');
  if (ekranlar){
    new MutationObserver(() => ekranlar.querySelectorAll('.screen').forEach(dugmeEkle)).observe(ekranlar, { childList: true });
    ekranlar.querySelectorAll('.screen').forEach(dugmeEkle);
  }
  // kaydettiğim ekran kaldırılırsa (paylaşım bitti) kaydı bitir
  if (ekranlar) new MutationObserver(() => { if (K.rec && K.tile && !K.tile.isConnected){ toast('Ekran kapandı, kayıt kaydediliyor'); bitir(); } }).observe(ekranlar, { childList: true });
  // sayfa kapanırken: OPFS'teki yarım dosya bir sonraki açılışta indirilebilir
  addEventListener('pagehide', () => { if (K.rec){ try { K.rec.requestData(); } catch(e){} } });
  // kayıt sürerken sekme kapatılmak istenirse tarayıcı "Siteden ayrılsın mı?" diye sorar
  addEventListener('beforeunload', e => { if (K.rec && !K.sonra){ e.preventDefault(); e.returnValue = ''; } });

  // ---------- açılışta: yarım kalan kayıt var mı? Eski (indirilmiş) parçaları temizle ----------
  (async () => {
    const d = await opfsDizin(); if (!d || !d.values) return;
    let acik = null; try { acik = JSON.parse(localStorage.getItem(ACIK_KEY) || 'null'); } catch(e){}
    if (acik && !acik.kok) acik = null;
    // başka sekmede süren kayıtların parçalarına dokunma
    let suren = [];
    try { if (navigator.locks && navigator.locks.query) suren = ((await navigator.locks.query()).held || []).map(l => l.name).filter(n => /^kayit-\d+$/.test(n)); } catch(e){}
    if (acik && suren.includes(acik.kok)) acik = null;
    const silinecek = [];
    try { for await (const h of d.values()) if (h.kind === 'file' && /^kayit-\d+/.test(h.name) && !(acik && h.name.startsWith(acik.kok + '-')) && !suren.some(k => h.name.startsWith(k + '-'))) silinecek.push(h.name); } catch(e){}
    for (const n of silinecek) try { await d.removeEntry(n); } catch(e){}
    if (!acik) return;
    const dosya = await parcalariTopla(d, acik.kok, acik.tip || 'video/webm');
    const parcaSil = async () => { const adlar = []; try { for await (const h of d.values()) if (h.name.startsWith(acik.kok + '-')) adlar.push(h.name); } catch(e){} for (const n of adlar) try { await d.removeEntry(n); } catch(e){} };
    if (!dosya.size){ try { localStorage.removeItem(ACIK_KEY); } catch(e){} parcaSil(); return; }
    const kutu = document.createElement('div'); kutu.className = 'kayit-yarim';
    kutu.innerHTML = '<b>💾 Yarım kalan bir kaydın var</b><span></span><div class="row"></div>';
    kutu.querySelector('span').textContent = acik.ad + ' · ' + (dosya.size / 1048576).toFixed(1) + ' MB (sayfa kayıt sırasında kapanmış)';
    const ind = document.createElement('button'); ind.className = 'btn primary small'; ind.textContent = 'İndir';
    const sil = document.createElement('button'); sil.className = 'btn small'; sil.textContent = 'Sil';
    const kapat = () => { kutu.remove(); try { localStorage.removeItem(ACIK_KEY); } catch(e){} };
    ind.onclick = () => { indir(dosya, acik.ad.replace(/(\.\w+)$/, ' (yarım)$1')); kapat(); };   // parçalar bir sonraki açılışta silinir
    sil.onclick = () => { kapat(); parcaSil(); };
    kutu.querySelector('.row').append(ind, sil);
    document.body.append(kutu);
  })();
})();
