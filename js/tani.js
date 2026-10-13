// Tanılama ve telefon dayanıklılığı:
//  • Sayfada bir hata olursa (özellikle iPhone Safari) yönetim panelindeki Hareketler'e "🐞 Hata" olarak düşer.
//  • Odadayken sayfa kendiliğinden yenilenirse (iPhone'da bellek dolunca Safari sekmeyi yeniden başlatır) bu fark edilir,
//    "📶 Kopma" olarak kaydedilir ve kişi KENDİLİĞİNDEN aynı odaya geri girer.
//  • Telefonda oyun masası açıkken hareketli arka plan durur (bellek ve işlemci oyuna kalsın); oyun bitince devam eder.
(function(){
  const ua = navigator.userAgent || '';
  const cihaz = (() => {
    let m = ua.match(/(?:iPhone|iPad|CPU) OS (\d+)_(\d+)/); if (m) return (/iPad/.test(ua) ? 'iPad' : 'iPhone') + ' iOS ' + m[1] + '.' + m[2] + (/CriOS/.test(ua) ? ' Chrome' : /FxiOS/.test(ua) ? ' Firefox' : ' Safari');
    m = ua.match(/Android (\d+)/); if (m) return 'Android ' + m[1] + (/SamsungBrowser/.test(ua) ? ' Samsung' : / Chrome\/(\d+)/.test(ua) ? ' Chrome ' + ua.match(/ Chrome\/(\d+)/)[1] : '');
    m = ua.match(/(Edg|Chrome|Firefox|Version)\/(\d+)/); return (/Mac OS/.test(ua) ? 'Mac ' : /Windows/.test(ua) ? 'Windows ' : '') + (m ? (m[1] === 'Version' ? 'Safari ' : m[1] + ' ') + m[2] : '');
  })();
  const durum = () => {
    const t = typeof openTable !== 'undefined' && openTable && typeof tables !== 'undefined' ? tables.get(openTable) : null;
    const o = t ? t.game : (typeof soloOpen !== 'undefined' && soloOpen ? 'tek kişilik' : '');
    const bg = typeof OyunBG !== 'undefined' && OyunBG.current ? OyunBG.current : 'yok';
    return cihaz + (o ? ' · oyun: ' + o : '') + ' · arka plan: ' + bg;
  };
  const kaydet = (tur, metin) => { try { if (typeof hareket === 'function') hareket(tur, String(metin).slice(0, 200)); } catch(e){} };
  window.taniDurum = durum;

  // ---------- hatalar ----------
  const gorulen = new Set(); let hataSay = 0;
  function hata(msg, yer){
    msg = String(msg || 'bilinmeyen hata').replace(/\s+/g, ' ').slice(0, 110);
    const k = msg + yer; if (gorulen.has(k) || hataSay >= 6) return; gorulen.add(k); hataSay++;
    kaydet('hata', msg + (yer ? ' @' + yer : '') + ' | ' + durum());
  }
  addEventListener('error', e => {
    if (!e || (!e.message && e.target && e.target !== window)) return;   // resim/video yükleme hataları değil
    const f = String(e.filename || '').split('/').pop();
    hata(e.message, f ? f + ':' + e.lineno : '');
  });
  addEventListener('unhandledrejection', e => { const r = e && e.reason; if (r && /AbortError|NotAllowedError/.test(r.name || '')) return; hata('promise: ' + (r && (r.message || r)), ''); });

  // ---------- odadayken sayfa kendiliğinden yenilendi mi? ----------
  const KEY = 'oyunodasi-oturum';
  try {
    const o = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    sessionStorage.removeItem(KEY);
    if (o && !o.temiz && o.kod && Date.now() - o.ts < 3 * 60e3){
      kaydet('kopma', 'Sayfa kendiliğinden yenilendi (büyük ihtimalle tarayıcı belleği doldu) · oda ' + o.kod + ' · ' + o.durum);
      // main.js açılışta bu işareti görür ve aynı odaya geri girer
      sessionStorage.setItem('oyunodasi-otodon', o.kod);
      sessionStorage.setItem('oyunodasi-cokme', '1');
    }
  } catch(e){}
  setInterval(() => {
    if (typeof joined === 'undefined' || !joined) return;
    try { sessionStorage.setItem(KEY, JSON.stringify({ kod: roomCode, ts: Date.now(), temiz: false, durum: durum() })); } catch(e){}
  }, 4000);
  // düzgün kapanış/yenileme/çıkış: işaretle (çökmede bu olaylar gelmez)
  const temiz = () => { try { const o = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (o){ o.temiz = true; sessionStorage.setItem(KEY, JSON.stringify(o)); } } catch(e){} };
  addEventListener('pagehide', temiz); addEventListener('beforeunload', temiz);

  // çökmeden sonra odaya geri girilince kısa bilgi
  try { if (sessionStorage.getItem('oyunodasi-cokme')){ sessionStorage.removeItem('oyunodasi-cokme');
    const t = setInterval(() => { if (typeof joined !== 'undefined' && joined){ clearInterval(t); if (typeof toast === 'function') toast('🔄 Sayfa yenilendi, odaya kendiliğinden geri döndün'); } }, 1000);
    setTimeout(() => clearInterval(t), 60000); } } catch(e){}

  // ---------- telefonda oyun açıkken arka planı durdur ----------
  const dokunmatik = (() => { try { return matchMedia('(pointer:coarse)').matches; } catch(e){ return false; } })();
  const oda = document.getElementById('room');
  if (dokunmatik && oda && typeof OyunBG !== 'undefined'){
    let durdurdu = false;
    new MutationObserver(() => {
      const oyunda = oda.classList.contains('gaming');
      if (oyunda && !durdurdu && OyunBG.current){ durdurdu = true; OyunBG.pause(true); }
      else if (!oyunda && durdurdu){ durdurdu = false; OyunBG.pause(false); }
    }).observe(oda, { attributes: true, attributeFilter: ['class'] });
  }
})();
