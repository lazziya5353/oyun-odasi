// Canlı durum: siteyi açanlar ve odadakiler dakikada bir sunucuya "buradayım" der (yönetim paneli: kişiler, son görülme, açık odalar).
// Girişte (lobide) şu an açık odalar listelenir; oda kodu gösterilmez, girmek için kodu yazmak gerekir.
(function(){
  let cid = '';
  try { cid = sessionStorage.getItem('oyunodasi-cid') || ''; } catch(e){}
  if (!cid){ cid = Math.random().toString(36).slice(2) + Date.now().toString(36); try { sessionStorage.setItem('oyunodasi-cid', cid); } catch(e){} }
  let son = 0, gonderdi = false, zaman = null, odalar = [];
  const acikMi = () => location.protocol !== 'file:' && (window.isSecureContext || location.hostname === 'localhost');
  const katildi = () => typeof joined !== 'undefined' && joined;
  function veri(){
    const acc = typeof account !== 'undefined' && account && account.uye;
    let ad = katildi() ? myName : (acc ? acc.name : '');
    if (!ad){ const i = document.getElementById('nameInput'); ad = i ? i.value.trim() : ''; }
    return { cid, ad, uye: acc ? acc.kadi : '', cihaz: typeof cihazTuru === 'function' ? cihazTuru() : 'pc', kod: katildi() ? roomCode : '', gizli: katildi() && typeof gizliOdaMi === 'function' && gizliOdaMi() };
  }
  async function nabiz(){
    clearTimeout(zaman); zaman = setTimeout(nabiz, 60e3);
    if (!acikMi() || (document.hidden && !katildi())) return;
    son = Date.now();
    const v = veri();
    try {
      const r = v.ad ? await fetch('/api/oda/nabiz', { method: 'POST', headers: Object.assign({ 'content-type': 'text/plain' }, v.gizli && account ? { authorization: 'Bearer ' + account.token } : {}), body: JSON.stringify(v) })
                     : await fetch('/api/oda/acik', { cache: 'no-store' });
      if (v.ad) gonderdi = true;
      if (r.ok){ const d = await r.json(); odalar = d.odalar || []; ciz(); }
    } catch(e){}
  }
  // ---------- lobideki "Açık odalar" kutusu ----------
  const sure = ms => { const m = Math.max(1, Math.round(ms / 60e3)), h = Math.floor(m / 60), d = m % 60; return m < 60 ? m + ' dakika' : d ? h + ' saat ' + d + ' dakika' : h + ' saat'; };
  const acikSure = ms => { const s = sure(ms); return s + (/saat$/.test(s) ? 'tir' : 'dır') + ' açık'; };
  let acikForm = '';
  function ciz(){
    const kutu = document.getElementById('acikOdalar'); if (!kutu) return;
    if (katildi() || !odalar.length){ kutu.hidden = true; kutu.innerHTML = ''; return; }
    if (kutu.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;   // kod yazarken bozma
    kutu.hidden = false; kutu.innerHTML = '';
    const h = document.createElement('div'); h.className = 'ao-baslik';
    h.innerHTML = '<span class="ao-nokta"></span> Şu an açık ' + (odalar.length > 1 ? odalar.length + ' oda' : 'oda') + ' var';
    kutu.append(h);
    for (const o of odalar){
      const k = document.createElement('div'); k.className = 'ao-kart';
      const bilgi = document.createElement('div'); bilgi.className = 'ao-bilgi';
      const b = document.createElement('b'); b.textContent = '👥 ' + o.kisi + ' kişi';
      const ad = document.createElement('span'); ad.className = 'ao-adlar'; ad.textContent = o.adlar.slice(0, 5).join(', ') + (o.adlar.length > 5 ? ' +' + (o.adlar.length - 5) : '');
      const s = document.createElement('small'); s.textContent = '⏱ ' + acikSure(o.sure);
      bilgi.append(b, ad, s);
      const form = document.createElement('form'); form.className = 'ao-form';
      const inp = document.createElement('input'); inp.className = 'code'; inp.placeholder = 'Oda kodu'; inp.maxLength = 12; inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('autocapitalize', 'characters');
      const btn = document.createElement('button'); btn.className = 'btn primary small'; btn.type = 'submit'; btn.textContent = 'Gir';
      const hata = document.createElement('small'); hata.className = 'ao-hata';
      form.append(inp, btn, hata);
      if (acikForm !== o.id) form.hidden = true;
      const ac = document.createElement('button'); ac.type = 'button'; ac.className = 'btn small'; ac.textContent = '🔑 Kodu yazıp gir';
      ac.hidden = acikForm === o.id;
      ac.onclick = () => { acikForm = o.id; ac.hidden = true; form.hidden = false; inp.focus(); };
      form.onsubmit = async e => {
        e.preventDefault();
        const kod = typeof cleanCode === 'function' ? cleanCode(inp.value) : inp.value.trim().toUpperCase();
        if (kod.length < 3){ hata.textContent = 'Odanın kodunu yaz.'; inp.focus(); return; }
        btn.disabled = true; hata.textContent = '';
        let ok = true;
        try { const r = await fetch('/api/oda/dogrula', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: o.id, kod }) }); if (r.ok) ok = (await r.json()).ok; } catch(err){}
        btn.disabled = false;
        if (!ok){ hata.textContent = 'Kod yanlış. Odadakilere sor.'; inp.select(); return; }
        acikForm = '';
        document.getElementById('codeInput').value = kod;
        document.getElementById('joinBtn').click();
      };
      k.append(bilgi, ac, form);
      kutu.append(k);
    }
  }
  setInterval(() => { odalar.forEach(o => { o.sure += 30e3; }); ciz(); }, 30e3);
  // görünür olunca (ya da odaya girip çıkınca) hemen yenile
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - son > 15e3) nabiz(); });
  // sayfa kapanınca "çıktı" (ikisi birden: biri tarayıcıda kaybolursa diğeri ulaşır; sunucu ikinciyi yok sayar)
  window.addEventListener('pagehide', () => {
    if (!gonderdi || !acikMi()) return;
    const body = JSON.stringify({ cid });
    try { if (navigator.sendBeacon) navigator.sendBeacon('/api/oda/cik', new Blob([body], { type: 'text/plain' })); } catch(e){}
    try { fetch('/api/oda/cik', { method: 'POST', headers: { 'content-type': 'text/plain' }, body, keepalive: true }).catch(() => {}); } catch(e){}
  });
  // ad yazılınca lobide de "sitede" görünsün
  const ni = document.getElementById('nameInput'); if (ni) ni.addEventListener('change', () => { if (ni.value.trim()) nabiz(); });
  window.varlikNabiz = () => setTimeout(nabiz, 400);
  setTimeout(nabiz, 800);
})();
