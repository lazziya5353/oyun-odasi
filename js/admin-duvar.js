// Yönetim paneli sol sütun: 🖼 Duvar kağıtları. Sitedeki tüm arka planlardan (video duvar kağıtları dahil) seç,
// karartmayı ayarla, 🌙 Dinlen ile ekranda sadece arka plan kalsın (ESC ile çık). Seçim bu tarayıcıda saklanır
// (sitedeki Görünüm ayarıyla aynı kayıt: aynı tarayıcıda sitede de aynı arka plan olur).
(function(){
  const kutu = document.getElementById('yanDuvar');
  if (!kutu || typeof OyunBG === 'undefined') return;
  let acik = false, kuruldu = false;
  const durum = () => { const p = OyunBG.saved ? OyunBG.saved() : null; return { id: OyunBG.current || 'yok', animate: p && p.animate !== undefined ? !!p.animate : true, dim: p && p.dim !== undefined ? +p.dim : .25 }; };
  const adi = id => { const x = OyunBG.list.find(s => s.id === id); return x ? (x.icon ? x.icon + ' ' : '') + x.name : 'Yok'; };
  function ciz(){
    const s = durum();
    kutu.innerHTML = '';
    const bas = el('div', 'yd-bas');
    bas.append(el('h3', '', '🖼 Duvar kağıtları'));
    const dn = button('🌙 Dinlen', 'primary', () => { if (window.dinlenmeModu) dinlenmeModu.ac(); });
    dn.title = 'Ekranda sadece arka plan kalır (ESC ile çık)';
    bas.append(dn);
    kutu.append(bas);
    const su = el('div', 'yd-su');
    su.append(el('span', 'ad-muted', 'Şu an:'), el('b', '', adi(s.id)));
    const deg = button(acik ? 'Kapat ▴' : 'Değiştir ▾', '', () => { acik = !acik; ciz(); });
    su.append(deg);
    kutu.append(su);
    const kar = el('label', 'yd-kar'); kar.append(el('span', 'ad-muted', '🌗 Karartma'));
    const r = el('input'); r.type = 'range'; r.min = 0; r.max = 80; r.step = 5; r.value = Math.round(s.dim * 100);
    r.oninput = () => { const d = durum(); if (d.id !== 'yok') OyunBG.set(d.id, { animate: d.animate, dim: r.value / 100 }); };
    kar.append(r); kutu.append(kar);
    const izg = el('div', 'yd-izgara'); izg.hidden = !acik;
    kutu.append(izg);
    if (acik) izgaraKur(izg, s.id);
  }
  function izgaraKur(izg, aktif){
    let son = null;
    const liste = OyunBG.list.filter(x => x.id !== 'ozel');
    liste.forEach(x => {
      if (x.id !== 'yok' && x.grup !== son){ son = x.grup; izg.append(el('div', 'yd-grup', x.grup)); }
      const b = el('button', 'yd-sec' + (x.id === aktif ? ' on' : '')); b.type = 'button'; b.title = x.desc || x.name; b.dataset.bg = x.id;
      const cv = el('canvas'); cv.width = 240; cv.height = 150;
      b.append(cv, el('span', '', (x.icon ? x.icon + ' ' : '') + x.name));
      b.onclick = () => { const d = durum(); OyunBG.set(x.id === 'yok' ? null : x.id, { animate: d.animate, dim: d.dim }); izg.querySelectorAll('.yd-sec').forEach(q => q.classList.toggle('on', q === b)); kutu.querySelector('.yd-su b').textContent = adi(x.id); };
      izg.append(b);
    });
    // önizlemeler sırayla (panel takılmasın)
    [...izg.querySelectorAll('.yd-sec')].forEach((b, i) => setTimeout(() => { if (!b.isConnected) return; try { OyunBG.thumb(b.dataset.bg, b.querySelector('canvas')); } catch(e){} }, 80 + i * 60));
  }
  ciz();
  // video duvar kağıtları sonradan gelir
  addEventListener('oyunbg-liste', () => ciz());
  addEventListener('oyunbg-degisti', () => { const b = kutu.querySelector('.yd-su b'); if (b) b.textContent = adi(OyunBG.current || 'yok'); });
})();
