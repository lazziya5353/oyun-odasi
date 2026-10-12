// Yönetici duyurusu: bildirime sadece başı sığar; tam metin siteye girince (ya da bildirime dokununca) bir pencerede açılır.
// Bildirimi açık olmayanlar da siteye girince son duyuruyu bir kez görür.
(function(){
  const KEY = 'oyunodasi-duyuru-gordu';
  const gordu = id => { try { return localStorage.getItem(KEY) === id; } catch(e){ return false; } };
  const isaretle = id => { try { localStorage.setItem(KEY, id); } catch(e){} };
  let acik = null;
  function goster(d){
    if (!d || !d.id || acik === d.id) return;
    acik = d.id;
    let dlg = document.getElementById('duyuruDlg');
    if (!dlg){
      dlg = document.createElement('dialog'); dlg.id = 'duyuruDlg'; dlg.className = 'duyuru-dlg';
      dlg.innerHTML = '<div class="dlg-head"><h3>📢 <span class="dy-baslik"></span></h3></div><div class="dlg-body"><div class="dy-metin"></div><p class="note dy-zaman"></p></div>' +
        '<div class="dlg-foot"><button type="button" class="btn primary dy-tamam">Tamam</button></div>';
      document.body.append(dlg);
    }
    dlg.querySelector('.dy-baslik').textContent = d.title || 'Duyuru';
    const m = dlg.querySelector('.dy-metin'); m.textContent = '';
    if (typeof linkify === 'function') linkify(d.body || '', m); else m.textContent = d.body || '';
    try { dlg.querySelector('.dy-zaman').textContent = new Date(d.at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); } catch(e){}
    const kapat = () => { isaretle(d.id); acik = null; try { dlg.close(); } catch(e){} };
    dlg.querySelector('.dy-tamam').onclick = kapat;
    dlg.onclose = () => { isaretle(d.id); acik = null; };
    if (window.dinlenmeModu && dinlenmeModu.acik) dinlenmeModu.kapat();
    try { dlg.showModal(); } catch(e){ dlg.setAttribute('open', ''); }
  }
  async function kontrol(zorla){
    if (location.protocol === 'file:' || (!window.isSecureContext && location.hostname !== 'localhost')) return;
    try {
      const r = await fetch('/api/bildirim/duyuru', { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      if (d && d.id && (zorla === d.id || !gordu(d.id))) goster(d);
    } catch(e){}
  }
  const urlId = new URLSearchParams(location.search).get('duyuru');
  setTimeout(() => kontrol(urlId || null), 1500);
  setInterval(() => { if (!document.hidden) kontrol(null); }, 10 * 60e3);
  // bildirime dokununca açık sayfaya mesaj gelir
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => {
    const d = e.data; if (!d || d.t !== 'bildirim-tik' || !d.url) return;
    try { const id = new URL(d.url, location.href).searchParams.get('duyuru'); if (id) kontrol(id); } catch(err){}
  });
  window.duyuruKontrol = kontrol;
})();
