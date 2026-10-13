// Panelden yapılan kelime değişiklikleri (Tabu kartları, Çiz kelimeleri) site açılınca yerleşik listelere uygulanır.
// Tabu: yeni kart eklenir, aynı kelime varsa yasaklıları değişir, silinenler desteden çıkar (dizinler kaymasın diye işaretlenir).
// Çiz: yeni kelimeler eklenir, silinenler listeden çıkar.
(function(){
  if (location.protocol === 'file:') return;
  const kucuk = s => String(s).toLocaleLowerCase('tr-TR');
  function uygula(d){
    if (!d) return;
    if (typeof TabuCore !== 'undefined' && d.tabu){
      const C = TabuCore.CARDS, sil = new Set(d.tabu.sil || []);
      for (const k of (d.tabu.ekle || [])){
        const c = C.find(x => kucuk(x.w) === kucuk(k.w));
        if (c) c.y = k.y.slice(0, 5); else C.push({ w: k.w, y: k.y.slice(0, 5) });
      }
      C.forEach(c => { c.silindi = sil.has(kucuk(c.w)); });
    }
    if (typeof CizCore !== 'undefined' && d.ciz){
      const W = CizCore.WORDS, sil = new Set(d.ciz.sil || []), var_ = new Set(W.map(kucuk));
      for (const w of (d.ciz.ekle || [])) if (!var_.has(kucuk(w))){ W.push(w); var_.add(kucuk(w)); }
      for (let i = W.length - 1; i >= 0; i--) if (sil.has(kucuk(W[i]))) W.splice(i, 1);
    }
  }
  fetch('/api/kelime/liste', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(uygula).catch(() => {});
})();
