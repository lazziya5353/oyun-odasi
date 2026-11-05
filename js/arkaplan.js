// Telefonda siteden çıkınca / ekran kilitlenince mikrofon.
//  - Android: tarayıcı arka planda ses işlemeyi (güçlü gürültü azaltma, ses efekti) yavaşlatır ve ses kesilir.
//    Arka plana geçince karşıya işlenmemiş mikrofon gider (ses akmaya devam eder), dönünce efekt geri gelir.
//  - iPhone: Apple, arka plandaki sayfanın mikrofonunu sistemden susturur (site olarak aşılamaz).
//    Dönünce mikrofon ölü kaldıysa sessizce yeniden açılır.
//  - Odadakiler kartında "📵 Arka planda" görür.
(() => {
  const dokunmatik = () => window.matchMedia && matchMedia('(pointer:coarse)').matches;
  let asil = null, arkada = false;
  const iz = t => t && t.getAudioTracks ? t.getAudioTracks()[0] : null;

  function gizlen(){
    if (typeof joined === 'undefined' || !joined || !dokunmatik() || arkada) return;
    arkada = true;
    try { broadcast({ t: 'state', arka: true }); } catch(e){}
    // işlenmiş ses yolu varsa arka planda doğrudan mikrofona geç
    if (typeof rawStream !== 'undefined' && rawStream && localStream && localStream !== rawStream && iz(rawStream)){
      asil = localStream;
      iz(rawStream).enabled = !micMuted;
      localStream = rawStream;
      peers.forEach(p => updateMicRouting(p));
    }
  }
  async function mikrofonuToparla(){
    if (typeof noMic !== 'undefined' && noMic) return;
    const t = iz(rawStream);
    if (t && t.readyState === 'live' && !t.muted) return;
    try {
      const id = typeof store !== 'undefined' ? store.get('oyunodasi-mic') : '';
      try { await openMic(id || undefined); } catch(e){ await openMic(); }
      if (typeof joined !== 'undefined' && joined) toast('🎙 Mikrofon yeniden açıldı');
    } catch(e){ toast('Mikrofon geri açılamadı. 🎙 düğmesine bas ya da sayfayı yenile.'); }
  }
  function don(){
    if (!arkada) return;
    arkada = false;
    if (typeof joined === 'undefined' || !joined) { asil = null; return; }
    try { broadcast({ t: 'state', arka: false }); } catch(e){}
    if (asil){
      const a = iz(asil), r = iz(rawStream);
      if (a && a.readyState === 'live' && localStream === rawStream){
        a.enabled = !micMuted;
        if (r) r.enabled = true;          // işleme zinciri ham mikrofonu dinlemeye devam etsin
        localStream = asil;
        peers.forEach(p => updateMicRouting(p));
      }
      asil = null;
    }
    if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state !== 'running') audioCtx.resume().catch(() => {});
    // iPhone'da sistem susturması dönüşte genelde kendiliğinden kalkar; kalkmadıysa mikrofonu yeniden aç
    setTimeout(mikrofonuToparla, 1200);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') gizlen(); else don(); });
  window.addEventListener('pagehide', gizlen);
  window.addEventListener('pageshow', () => { if (document.visibilityState === 'visible') don(); });
  window.ARKAPLAN = { gizlen, don, durum: () => ({ arkada, islenmis: !!asil }) };
})();
