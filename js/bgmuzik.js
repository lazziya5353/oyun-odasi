// Arka plan müziği: seçili video duvar kağıdının yanında aynı adlı bir müzik varsa (duvar-kagitlari/…/Tek Yüzük.mp3)
// "Daveti kopyala"nın altında "🎵 Müziği çal" çıkar. Müzik sadece basan kişide çalar (odaya gitmez), döngüde çalar.
// Arka plan değişince müzik durur. Ses düzeyi: Sesleri ayarla → 🎬 Arka plan müziği.
(function(){
  const btn = document.getElementById('bgMuzikBtn'); if (!btn) return;
  const btnM = document.getElementById('bgMuzikBtnM');          // telefonda üst sıradaki düğme
  const hepsi = [btn, btnM].filter(Boolean);
  const KEY = 'oyunodasi-bgmuzik-ses';
  let ses = .5; try { const v = parseFloat(localStorage.getItem(KEY)); if (v >= 0 && v <= 1) ses = v; } catch(e){}
  let ses0 = null, url = null, ad = '';
  const durum = () => {
    const calar = !!(ses0 && !ses0.paused);
    btn.textContent = calar ? '⏸ Müziği durdur' : '🎵 Müziği çal';
    if (btnM){ btnM.dataset.k = calar ? 'Durdur' : 'Müzik'; btnM.firstChild.textContent = calar ? '⏸ ' : '🎵 '; btnM.querySelector('.lbl').textContent = calar ? 'Müziği durdur' : 'Müziği çal'; }
    hepsi.forEach(b => { b.classList.toggle('on', calar); b.title = (calar ? 'Durdur: ' : 'Çal: ') + ad + ' (sadece sen duyarsın)'; });
  };
  function durdur(){ if (ses0){ ses0.pause(); } durum(); }
  function guncelle(d){
    const yeni = d && d.muzik || null;
    if (yeni !== url){ if (ses0){ ses0.pause(); ses0.removeAttribute('src'); ses0.load(); ses0 = null; } url = yeni; }
    ad = d && d.ad || '';
    hepsi.forEach(b => { b.hidden = !url; });
    const mix = document.getElementById('bgMuzikMix'); if (mix) mix.hidden = !url;
    durum();
  }
  const tik = () => {
    if (!url) return;
    if (!ses0){ ses0 = new Audio(url); ses0.loop = true; ses0.preload = 'auto'; ses0.addEventListener('pause', durum); ses0.addEventListener('play', durum); }
    ses0.volume = ses;
    if (ses0.paused) ses0.play().then(durum).catch(() => { if (typeof toast === 'function') toast('Müzik çalınamadı'); durum(); });
    else durdur();
  };
  hepsi.forEach(b => { b.onclick = tik; });
  const r = document.getElementById('bgMuzikVol'), o = document.getElementById('bgMuzikOut');
  if (r){ r.value = Math.round(ses * 100); if (o) o.textContent = r.value + '%';
    r.oninput = () => { ses = r.value / 100; if (o) o.textContent = r.value + '%'; if (ses0) ses0.volume = ses; try { localStorage.setItem(KEY, ses); } catch(e){} }; }
  addEventListener('oyunbg-degisti', e => guncelle(e.detail));
  if (typeof OyunBG !== 'undefined') guncelle({ muzik: OyunBG.muzik, ad: '' });
  window.bgMuzik = { durdur, get caliyor(){ return !!(ses0 && !ses0.paused); } };
})();
