// Yönetim paneli telefonda: yan bölüm (duvar kağıdı, açık odalar, kişiler) tek satırlık açılır düğmeye katlanır,
// sekmeler yatay kayar ve üstte yapışık durur. Bilgisayarda hiçbir şey değişmez (CSS 700px altı).
(() => {
  const $ = id => document.getElementById(id);
  const govde = document.querySelector('.adm-govde'), yan = document.querySelector('.adm-yan');
  if (!govde || !yan) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'yan-ac'; b.setAttribute('aria-expanded', 'false');
  b.innerHTML = '<span>👥 Canlı <small></small></span><i aria-hidden="true">▾</i>';
  b.onclick = () => { const ac = !yan.classList.contains('acik'); yan.classList.toggle('acik', ac); b.setAttribute('aria-expanded', ac); };
  govde.insertBefore(b, yan);
  // özet: açık oda ve çevrimiçi kişi sayısı
  const ozet = () => {
    const t = ($('yan') && $('yan').textContent) || '';
    const kisi = (t.match(/(\d+)\s*çevrimiçi/) || [])[1];
    const odaYok = /açık oda yok/i.test(t);
    const odalar = $('yan') ? $('yan').querySelectorAll('.yan-oda').length : 0;
    const parca = [];
    parca.push(odaYok ? 'açık oda yok' : (odalar ? odalar + ' açık oda' : 'odalar'));
    if (kisi != null) parca.push(kisi + ' çevrimiçi');
    parca.push('duvar kağıdı');
    b.querySelector('small').textContent = '· ' + parca.join(' · ');
  };
  new MutationObserver(ozet).observe(yan, { childList: true, subtree: true, characterData: true });
  ozet();
  // seçili sekme görünür kalsın
  const tabs = $('tabs');
  if (tabs) new MutationObserver(() => { const on = tabs.querySelector('.on'); if (on && matchMedia('(max-width:700px)').matches) on.scrollIntoView({ block: 'nearest', inline: 'center' }); }).observe(tabs, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  // bildirim düğmesinin durumu (telefonda sadece simge görünür)
  const pb = $('pushBtn');
  if (pb){ const d = () => pb.classList.toggle('acik', /açık/.test(pb.textContent)); new MutationObserver(d).observe(pb, { childList: true, characterData: true, subtree: true }); d(); }
})();
