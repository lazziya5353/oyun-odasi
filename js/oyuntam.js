// Oyunu tam ekran yap: oyun açıkken üst çubuktaki "⛶ Tam ekran" düğmesi.
// Bilgisayarda ve Android'de tarayıcı gerçekten tam ekrana geçer; iPhone Safari buna izin vermediği için orada
// üst menü ve kanallar gizlenip oyun ekranı kaplar (aynı düğme). Alttaki mikrofon/ses düğmeleri her zaman görünür kalır.
// Esc, düğmeye tekrar basmak ya da oyundan çıkmak tam ekranı kapatır. Sesli sohbet hiç kesilmez.
(function(){
  const oda = document.getElementById('room'); if (!oda) return;
  const tamMi = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const destek = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  const acik = () => oda.classList.contains('oyun-tam');
  const boyutBildir = () => { try { window.dispatchEvent(new Event('resize')); } catch(e){} };
  function etiket(){
    const on = acik();
    document.querySelectorAll('[data-tam]').forEach(b => {
      b.innerHTML = on ? '🗗 <span class="lbl">Küçült</span>' : '⛶ <span class="lbl">Tam ekran</span>';
      b.title = on ? 'Tam ekrandan çık (Esc)' : 'Oyunu tam ekran yap';
      b.classList.toggle('on', on);
    });
  }
  function ac(){
    oda.classList.add('oyun-tam');
    const el = document.documentElement;
    if (destek() && !tamMi()){
      try {
        const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen();
        if (p && p.catch) p.catch(() => {});             // izin vermezse ekranı kaplama hâli yine de kalır
      } catch(e){}
    }
    etiket(); setTimeout(boyutBildir, 60);
  }
  function kapat(){
    oda.classList.remove('oyun-tam');
    if (tamMi()){
      try { const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen(); if (p && p.catch) p.catch(() => {}); } catch(e){}
    }
    etiket(); setTimeout(boyutBildir, 60);
  }
  window.oyunTamDegistir = () => (acik() ? kapat() : ac());
  window.oyunTamEtiket = etiket;
  // tarayıcının kendi Esc'i ya da F11 ile çıkılırsa
  const degisti = () => { if (!tamMi() && acik() && destek()){ oda.classList.remove('oyun-tam'); etiket(); boyutBildir(); } };
  document.addEventListener('fullscreenchange', degisti);
  document.addEventListener('webkitfullscreenchange', degisti);
  // gerçek tam ekran yoksa (iPhone) Esc ile çık
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !acik() || tamMi()) return;
    if (document.querySelector('dialog[open]')) return;
    kapat();
  });
  // oyundan çıkınca (salona dönünce / odadan ayrılınca) tam ekran kapanır
  new MutationObserver(() => { if (acik() && (!oda.classList.contains('gaming') || oda.hidden)) kapat(); })
    .observe(oda, { attributes: true, attributeFilter: ['class', 'hidden'] });
})();
