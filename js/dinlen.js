// Dinlenme modu: ekranda sadece seçili arka plan (tema) kalır; arayüz gizlenir.
// Sesli sohbet, radyo, müzik aynen devam eder (sadece görünüm gizlenir, hiçbir bağlantıya dokunulmaz).
// Çıkmak: ESC (bilgisayar) ya da ekrana dokunup "✕ Çık" (telefon). Çıkınca kaldığın oda/ekran aynen durur.
(function(){
  let acik = false, geciciTema = false, eskiDim = null, ipucuT = 0, tamEkran = false;
  const ui = document.createElement('div');
  ui.id = 'dinlenUI';
  ui.innerHTML = '<div class="dinlen-ipucu">🌙 Dinlenme modu · çıkmak için <b>ESC</b></div><button type="button" class="dinlen-cik">✕ Çık</button>';
  ui.querySelector('.dinlen-cik').onclick = e => { e.stopPropagation(); kapat(); };
  const dokunmatik = () => { try { return matchMedia('(pointer:coarse)').matches; } catch(e){ return false; } };
  function goster(){
    ui.classList.remove('gizli');
    clearTimeout(ipucuT); ipucuT = setTimeout(() => ui.classList.add('gizli'), 3500);
  }
  function ac(){
    if (acik) return;
    acik = true;
    document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch(e){} });
    if (typeof OyunBG !== 'undefined'){
      // arka plan seçili değilse dinlenme süresince gece sakurası
      if (!OyunBG.current){ geciciTema = true; OyunBG.set('gecesakura', { dim: 0, animate: true, save: false }); }
      OyunBG.pause(false);
    }
    const dim = document.getElementById('bgdim');
    if (dim){ eskiDim = dim.style.opacity; dim.style.opacity = '0'; }
    document.documentElement.classList.add('dinlen');
    ui.querySelector('.dinlen-ipucu').innerHTML = dokunmatik() ? '🌙 Dinlenme modu · çıkmak için ekrana dokun' : '🌙 Dinlenme modu · çıkmak için <b>ESC</b>';
    document.body.append(ui);
    goster();
    tamEkran = false;
    if (!dokunmatik() && document.documentElement.requestFullscreen && !document.fullscreenElement){
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => { tamEkran = true; }).catch(() => {});
    }
    if (typeof hareket === 'function') hareket('ses', '🌙 dinlenme moduna geçti');
  }
  function kapat(){
    if (!acik) return;
    acik = false;
    clearTimeout(ipucuT);
    document.documentElement.classList.remove('dinlen');
    ui.remove();
    const dim = document.getElementById('bgdim');
    if (dim && eskiDim !== null) dim.style.opacity = eskiDim;
    eskiDim = null;
    if (geciciTema && typeof OyunBG !== 'undefined'){ geciciTema = false; const s = OyunBG.saved(); if (s && s.id && s.id !== 'yok') OyunBG.restore(); else OyunBG.set(null, { save: false }); }
    if (document.fullscreenElement && tamEkran) document.exitFullscreen().catch(() => {});
    tamEkran = false;
  }
  document.addEventListener('keydown', e => {
    if (!acik) return;
    if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); kapat(); }
  }, true);
  // tam ekrandayken ESC'yi tarayıcı yakalar: tam ekrandan çıkınca dinlenme modundan da çık
  document.addEventListener('fullscreenchange', () => { if (acik && tamEkran && !document.fullscreenElement) kapat(); });
  // ekrana dokununca / fare oynayınca çıkış düğmesi görünür
  document.addEventListener('pointerdown', () => { if (acik) goster(); }, true);
  document.addEventListener('pointermove', e => { if (acik && e.pointerType === 'mouse') goster(); }, true);
  window.dinlenmeModu = { ac, kapat, get acik(){ return acik; } };
  const b1 = document.getElementById('dinlenBtn'); if (b1) b1.onclick = ac;
  const b2 = document.getElementById('dinlenBtn2'); if (b2) b2.onclick = ac;
  const b3 = document.getElementById('dinlenBtn3'); if (b3) b3.onclick = ac;
})();
