// Yönetim paneli sol sütun: şu an açık odalar (kaç dakikadır açık, kimler var) ve kişiler
// (çevrimiçi mi, hangi odada, son görülme, ne zaman girdi/çıktı geçmişi). 6 sn'de bir yenilenir, değişmediyse çizilmez.
(function(){
  const Y = { veri: null, sig: '', acik: new Set(), filtre: 'hepsi', q: '' };
  const CIHAZ = { mobil: '📱', tablet: '📱', pc: '💻' };
  const saat = ts => {
    const d = new Date(ts), bugun = new Date().toDateString() === d.toDateString();
    const dun = new Date(Date.now() - 864e5).toDateString() === d.toDateString();
    const s = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return bugun ? s : dun ? 'dün ' + s : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' ' + s;
  };
  const sure = ms => { const m = Math.max(1, Math.round(ms / 60e3)), h = Math.floor(m / 60), d = m % 60; return m < 60 ? m + ' dakika' : d ? h + ' saat ' + d + ' dakika' : h + ' saat'; };
  const acikSure = ms => { const s = sure(ms); return s + (/saat$/.test(s) ? 'tir' : 'dır') + ' açık'; };
  async function yukle(){
    const yan = $('yan'); if (!yan || !tok || $('panel').hidden) return;
    try { Y.veri = await req('/api/oda/admin'); Y.fark = Date.now() - Y.veri.simdi; } catch(e){ if (!Y.veri){ yan.innerHTML = ''; yan.append(note('Canlı durum alınamadı: ' + e.message)); } return; }
    const s = JSON.stringify([Y.veri.odalar.map(o => [o.kod, o.kisi, Math.floor(o.sure / 60e3), o.adlar]), Y.veri.kisiler.map(k => [k.anahtar, k.cevrimici, k.oda, Math.floor((Y.veri.simdi - k.son) / 60e3), k.gecmis.length])]);
    if (s === Y.sig) return; Y.sig = s;
    if (yan.contains(document.activeElement) && document.activeElement.tagName === 'INPUT'){ Y.sig = ''; listeCiz(); return; }
    ciz();
  }
  function ciz(){
    const yan = $('yan'); yan.innerHTML = '';
    const d = Y.veri; if (!d) return;
    // ---- açık odalar
    const ob = el('div', 'yan-kutu');
    ob.append(el('h3', '', '🟢 Açık odalar' + (d.odalar.length ? ' (' + d.odalar.length + ')' : '')));
    if (!d.odalar.length) ob.append(el('p', 'ad-muted', 'Şu an açık oda yok.'));
    for (const o of d.odalar){
      const k = el('div', 'yan-oda' + (o.gizli ? ' gizli' : ''));
      const ust = el('div', 'yan-oda-ust');
      const kb = el('b', 'yan-kod', o.kod); if (o.gizli) kb.append(el('span', 'pill gizli', '🔒 gizli'));
      ust.append(kb, el('span', 'yan-sure', '⏱ ' + acikSure(o.sure)));
      const kodu = o.kod;
      const katil = button('👋 Yönetici olarak katıl', '', async () => {
        try {
          const t = await api('admin-saka-bilet', {});
          window.open('./?oda=' + encodeURIComponent(kodu) + '#yonetici=' + t.exp + '.' + t.sig, '_blank', 'noopener');
        } catch(e){ toast(e.message); }
      });
      k.append(ust, el('div', 'ad-muted', 'Açılış ' + saat(o.acilis) + (o.acan ? ' · açan: ' + o.acan : '') + ' · ' + o.kisi + ' kişi'));
      const ch = el('div', 'yan-chips');
      o.kisiler.forEach(p => ch.append(el('span', 'hk-chip', (CIHAZ[p.cihaz] || '') + ' ' + p.ad)));
      k.append(ch, katil); ob.append(k);
    }
    yan.append(ob);
    // ---- kişiler
    const kb = el('div', 'yan-kutu');
    const on = d.kisiler.filter(k => k.cevrimici).length;
    kb.append(el('h3', '', '👥 Kişiler · ' + on + ' çevrimiçi'));
    const ara = el('input', 'inp'); ara.placeholder = '🔎 Kişi ara'; ara.value = Y.q;
    ara.oninput = () => { Y.q = ara.value; listeCiz(); };
    const seg = el('div', 'seg yan-seg');
    [['hepsi', 'Hepsi (' + d.kisiler.length + ')'], ['on', 'Çevrimiçi (' + on + ')']].forEach(([k, n]) => {
      const b = el('button', Y.filtre === k ? 'on' : '', n); b.type = 'button';
      b.onclick = () => { Y.filtre = k; ciz(); }; seg.append(b);
    });
    kb.append(seg, ara, el('div', 'yan-kisiler'));
    yan.append(kb);
    listeCiz();
  }
  function listeCiz(){
    const d = Y.veri, liste = document.querySelector('#yan .yan-kisiler'); if (!d || !liste) return;
    liste.innerHTML = '';
    const q = trLow(Y.q.trim());
    const ks = d.kisiler.filter(k => (Y.filtre !== 'on' || k.cevrimici) && (!q || trLow(k.ad + ' ' + (k.uye || '')).includes(q)));
    if (!ks.length) liste.append(el('p', 'ad-muted', d.kisiler.length ? 'Kimse yok.' : 'Henüz kayıt yok. Siteyi açanlar burada görünecek.'));
    for (const k of ks){
      const r = el('div', 'yan-kisi' + (k.cevrimici ? ' on' : '') + (Y.acik.has(k.anahtar) ? ' acik' : ''));
      const bas = el('button', 'yan-kisi-bas'); bas.type = 'button';
      const av = el('span', 'yan-av', initial(k.ad)); av.append(el('i', 'yan-durum'));
      const bilgi = el('span', 'yan-bilgi');
      const ad = el('b', 'ad-ad', k.ad); ad.title = 'Profilini aç'; ad.onclick = e => { e.stopPropagation(); kisiProfil(k.uye ? { kadi: k.uye } : { misafir: k.ad }); }; ad.append(el('span', 'pill' + (k.uye ? ' ok' : ''), k.uye ? '@' + k.uye : 'misafir'));
      let durum;
      if (k.cevrimici) durum = k.oda ? '🎮 ' + k.oda + ' odasında · ' + sure(Date.now() - Y.fark - k.odaGiris) : '🟢 Sitede (lobide)';
      else durum = 'Son görülme: ' + ago(k.son) + ' · ' + saat(k.son);
      bilgi.append(ad, el('small', '', (CIHAZ[k.cihaz] || '') + ' ' + durum));
      bas.append(av, bilgi, el('span', 'yan-ok', '▾'));
      bas.onclick = () => { if (Y.acik.has(k.anahtar)) Y.acik.delete(k.anahtar); else Y.acik.add(k.anahtar); listeCiz(); };
      r.append(bas);
      if (Y.acik.has(k.anahtar)){
        const g = el('div', 'yan-gecmis');
        g.append(el('div', 'ad-muted', 'İlk görülme: ' + saat(k.ilk)));
        if (!k.gecmis.length) g.append(el('div', 'ad-muted', 'Geçmiş yok.'));
        const bt = el('div', 'yan-btnler');
        bt.append(button('👤 Profil', '', () => kisiProfil(k.uye ? { kadi: k.uye } : { misafir: k.ad })));
        if (k.cevrimici && k.oda) bt.append(dangerBtn('🚪 Odadan at', async () => { try { await req('/api/oda/admin-at', { anahtar: k.anahtar }); toast(k.ad + ' odadan atılacak (en geç 1 dakika içinde)'); } catch(e){ toast(e.message); } }));
        if (k.uye){
          const u = (typeof users !== 'undefined' ? users : []).find(x => x.kadi.toLocaleLowerCase('tr-TR') === k.uye);
          if (u) bt.append(dangerBtn('🗑 Üyeliği kaldır', () => act('admin-sil', { id: u.id }, k.ad + ' üyelikten kaldırıldı').then(() => window.yanYenile())));
        } else bt.append(dangerBtn('🗑 Listeden kaldır', async () => { try { await req('/api/oda/admin-kisi-sil', { anahtar: k.anahtar }); toast(k.ad + ' listeden kaldırıldı'); window.yanYenile(); } catch(e){ toast(e.message); } }));
        g.append(bt);
        k.gecmis.forEach(x => {
          const t = x.tur === 'site' ? '🌐 Siteyi açtı' + (x.cihaz ? ' (' + (x.cihaz === 'pc' ? 'bilgisayar' : 'telefon') + ')' : '')
            : x.tur === 'oda' ? '🎮 ' + x.kod + ' odasına girdi' : '🚪 ' + x.kod + ' odasından çıktı';
          const s = el('div', 'yan-olay'); s.append(el('span', '', t), el('span', 'ad-muted', saat(x.ts))); g.append(s);
        });
        r.append(g);
      }
      liste.append(r);
    }
  }
  setInterval(() => { if (tok && !document.hidden) yukle(); }, 6000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) yukle(); });
  // giriş yapılınca panel görünür olur: hemen yükle
  new MutationObserver(() => { if (!$('panel').hidden){ Y.sig = ''; yukle(); } }).observe($('panel'), { attributes: true, attributeFilter: ['hidden'] });
  if (tok) setTimeout(yukle, 300);
  window.yanYenile = () => { Y.sig = ''; yukle(); };
})();
