// 📷 Kamera (Toplantı & Ders kanalında): isteyen kamerasını açar, görüntüsü kanaldaki herkesin ekranında
// kendi kutucuğunda (avatarın yerinde) görünür. Ses mikrofondan ayrı gider; kamera sadece görüntüdür.
//  • Görüntü kameranın kendi şeklinde görünür (dizüstü 4:3 / 16:9, telefon dik); kırpılmaz, uzatılmaz.
//  • Akıcı: 30 fps. Herkes herkese gönderdiği için (sunucu yok) kalite izleyen sayısına göre kendiliğinden ayarlanır:
//    az kişide net (≈1 Mbps), kalabalıkta hafif (≈300 kbps, 20 fps).
//  • Başka kanala geçince kamera kendiliğinden kapanır (cihazın ışığı da söner).
//  • Eski sürümdeki biriyle karışmasın diye sadece "kamerayı tanıyan" kişilere gönderilir (hello'daki kam:1).
(function(){
  let kamAkis = null;                  // benim kameram
  const giden = new Map();             // kişi id → giden çağrı
  const KAM = { w: 960, fps: 30 };
  // izleyen sayısına göre gönderim ayarı
  function ayar(n){
    if (n <= 3) return { br: 1000000, fps: 30, kucult: 1 };
    if (n <= 6) return { br: 650000, fps: 30, kucult: 1 };
    if (n <= 10) return { br: 420000, fps: 24, kucult: 1.25 };
    return { br: 300000, fps: 20, kucult: 1.5 };
  }
  const kanalUygun = () => typeof joined !== 'undefined' && joined && myChan().type === 'ders';

  // ---------- aç / kapat ----------
  async function ac(){
    if (kamAkis) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ toast('Bu cihazda kamera kullanılamıyor.'); return; }
    try {
      // sadece genişlik istenir: kamera kendi en-boy oranında verir (kırpma/uzatma yok)
      kamAkis = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: KAM.w }, frameRate: { ideal: KAM.fps, max: 30 }, facingMode: 'user', resizeMode: 'none' }, audio: false });
    } catch(e){
      kamAkis = null;
      toast(e && e.name === 'NotAllowedError' ? 'Kamera izni verilmedi. Adres çubuğundaki kilit simgesinden izin verebilirsin.' : 'Kamera açılamadı' + (e && e.name === 'NotFoundError' ? ': kamera bulunamadı.' : '.'));
      ciz(); return;
    }
    const t = kamAkis.getVideoTracks()[0];
    if (t){ try { t.contentHint = 'motion'; } catch(e){} t.addEventListener('ended', kapat); }
    if (typeof hareket === 'function') hareket('ekran', 'kamerasını açtı');
    if (typeof broadcast === 'function') broadcast({ t: 'kam', on: true });
    esitle(); ciz(); renderSelf();
  }
  function kapat(){
    if (!kamAkis) return;
    kamAkis.getTracks().forEach(t => { try { t.stop(); } catch(e){} });
    kamAkis = null;
    giden.forEach(c => { try { c.close(); } catch(e){} }); giden.clear(); sonAyar = '';
    if (typeof broadcast === 'function') broadcast({ t: 'kam', on: false });
    ciz(); renderSelf();
  }
  window.kameraAcKapat = () => (kamAkis ? kapat() : ac());
  window.kameraAcik = () => !!kamAkis;

  // ---------- gönder: aynı kanaldaki (ve kamerayı tanıyan) herkese ----------
  let sonAyar = '';
  function hizAyarla(call){
    const pc = call && call.peerConnection; if (!pc) return;
    const a = ayar(giden.size);
    pc.getSenders().forEach(s => {
      if (!s.track || s.track.kind !== 'video') return;
      try { const p = s.getParameters(); if (!p.encodings || !p.encodings.length) p.encodings = [{}];
        p.encodings[0].maxBitrate = a.br; p.encodings[0].maxFramerate = a.fps; p.encodings[0].scaleResolutionDownBy = a.kucult;
        p.degradationPreference = 'balanced'; s.setParameters(p).catch(() => {}); } catch(e){}
    });
  }
  // izleyen sayısı değişince hepsini yeniden ayarla
  function hepsiniAyarla(){ const k = JSON.stringify(ayar(giden.size)); if (k === sonAyar) return; sonAyar = k; giden.forEach(c => hizAyarla(c)); }
  function esitle(){
    if (typeof peers === 'undefined') return;
    peers.forEach(p => {
      const iste = !!kamAkis && kanalUygun() && p.linked && p.kamDestek && sameChan(p);
      if (iste && !giden.has(p.id)){
        let call = null;
        try { call = peer.call(p.id, kamAkis, { metadata: { kind: 'kamera' } }); } catch(e){}
        if (!call) return;
        giden.set(p.id, call);
        call.on('close', () => { if (giden.get(p.id) === call) giden.delete(p.id); });
        call.on('error', () => {});
        [300, 1500, 4000].forEach(ms => setTimeout(() => hizAyarla(call), ms));
      }
      if (!iste && giden.has(p.id)){ try { giden.get(p.id).close(); } catch(e){} giden.delete(p.id); }
    });
    hepsiniAyarla();
  }
  window.kameraEsitle = esitle;
  setInterval(() => { if (kamAkis && !kanalUygun()){ kapat(); return; } esitle(); }, 3000);

  // ---------- gelen kamera ----------
  window.kameraGelen = (call, p) => {
    call.answer(undefined);
    if (p.kamCall && p.kamCall !== call) try { p.kamCall.close(); } catch(e){}
    p.kamCall = call;
    call.on('stream', s => { if (p.kamCall !== call) return; p.kamAkis = s; kartCiz(p.card, s, false); });
    const bitti = () => { if (p.kamCall === call){ p.kamCall = null; p.kamAkis = null; kartCiz(p.card, null, false); } };
    call.on('close', bitti); call.on('error', bitti);
  };
  // karşı taraf kamerayı kapattı (çağrı kapanmasa bile görüntüyü hemen kaldır)
  window.kameraOnData = (id, d) => {
    if (d.t !== 'kam') return false;
    const p = peers.get(id);
    if (p && !d.on){ if (p.kamCall) try { p.kamCall.close(); } catch(e){} p.kamCall = null; p.kamAkis = null; kartCiz(p.card, null, false); }
    return true;
  };

  // ---------- kutucukta görüntü ----------
  function kartCiz(card, akis, ben){
    if (!card) return;
    let v = card.querySelector('video.kam-v');
    if (!akis){ if (v){ v.srcObject = null; v.remove(); } card.classList.remove('kamerali', 'kam-dik'); return; }
    if (!v){
      v = document.createElement('video'); v.className = 'kam-v'; v.autoplay = true; v.muted = true; v.playsInline = true;
      v.setAttribute('playsinline', '');
      const bas = card.querySelector('.person-head'); (bas || card).prepend(v);
    }
    if (v.srcObject !== akis){
      v.srcObject = akis; v.play().catch(() => {});
      // kutu, kameranın kendi şeklini alsın (dik telefon kamerası dik, dizüstü yatay)
      const bicim = () => { if (v.videoWidth && v.videoHeight){ v.style.aspectRatio = v.videoWidth + ' / ' + v.videoHeight; card.classList.toggle('kam-dik', v.videoHeight > v.videoWidth); } };
      v.onloadedmetadata = bicim; v.onresize = bicim; bicim();
    }
    v.classList.toggle('ayna', !!ben);
    card.classList.add('kamerali');
  }
  // renderSelf / renderPeer sonrası çağrılır (kutucuk yeniden çizilince görüntü kaybolmasın)
  window.kameraKart = (card, p) => {
    if (!p) kartCiz(card, kamAkis && kanalUygun() ? kamAkis : null, true);
    else kartCiz(card, p.kamAkis && sameChan(p) ? p.kamAkis : null, false);
  };

  // ---------- şeritteki düğme ----------
  function ciz(){
    const b = document.getElementById('kamBtn'); if (!b) return;
    b.textContent = kamAkis ? '📷 Kamerayı kapat' : '📷 Kamerayı aç';
    b.classList.toggle('on', !!kamAkis);
  }
  window.kameraDugmeCiz = ciz;
})();
