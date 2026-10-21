// Boyut Bilmece kuralları: soru çiftleri (referans + tahmin edilecek), puanlama, birim yazımı. DOM'a dokunmaz.
// Puan: tahmin ile gerçek arasındaki oran üzerinden; yarısı da iki katı da aynı ceza (45 puan). %5'e kadar sapma tam puan.
(function(root){
'use strict';
const V = () => root.BOYUT_VERI || [];
const MIN_ORAN = 1.25, MAX_ORAN = 8, UZAY_MAX = 12;

function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(s){ let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0; return h >>> 0; }

// kategoriler: 'karisik' ya da tek kategori (uzay yalnızca kendi içinde)
function havuz(kat){
  const l = V();
  if (!kat || kat === 'karisik') return l.filter(x => x.kat !== 'uzay');
  return l.filter(x => x.kat === kat);
}
// n soruluk set: her soruda referans ve hedef farklı, aynı hedef iki kez gelmez
function sorular(n, seed, kat){
  const r = mulberry32(seed >>> 0);
  const h = havuz(kat), out = [], kullanilan = new Set();
  const uzay = kat === 'uzay';
  for (let deneme = 0; out.length < n && deneme < 4000; deneme++){
    const t = h[Math.floor(r() * h.length)];
    if (kullanilan.has(t.i)) continue;
    const adaylar = h.filter(x => {
      if (x.i === t.i || x.e === t.e && x.ad === t.ad) return false;
      const o = Math.max(x.m / t.m, t.m / x.m);
      return o >= MIN_ORAN && o <= (uzay ? UZAY_MAX : MAX_ORAN) && x.e !== t.e;
    });
    if (!adaylar.length) continue;
    // farklı kategoriden referans biraz daha sık gelsin (fil ile otobüs gibi)
    const farkli = adaylar.filter(x => x.kat !== t.kat);
    const secim = (farkli.length && r() < 0.6) ? farkli : adaylar;
    const ref = secim[Math.floor(r() * secim.length)];
    kullanilan.add(t.i);
    out.push({ ref: ref.i, hedef: t.i, olcek: r() });
    // küçük kategoride sorular biterse yeniden kullanılabilsin (son birkaçı hariç)
    if (kullanilan.size >= h.length - 1){ kullanilan.clear(); out.slice(-3).forEach(q => kullanilan.add(q.hedef)); }
  }
  return out;
}
const gunlukTohum = (gun, seviye) => hash('boyut|' + seviye + '|' + gun);

function puan(tahmin, gercek){
  if (!(tahmin > 0) || !(gercek > 0)) return 0;
  const h = Math.abs(Math.log(tahmin / gercek));
  if (h <= Math.log(1.05)) return 100;
  return Math.max(0, Math.round(100 * Math.exp(-1.152 * h)));
}
const sapma = (tahmin, gercek) => Math.round((tahmin / gercek - 1) * 100);
function birim(m){
  const f = (x, d) => Number(x.toFixed(d)).toLocaleString('tr-TR', { maximumFractionDigits: d });
  if (m >= 1e6) return f(m / 1000, 0) + ' km';
  if (m >= 1000) return f(m / 1000, m >= 10000 ? 1 : 2) + ' km';
  if (m >= 10) return f(m, m >= 100 ? 0 : 1) + ' m';
  if (m >= 1) return f(m, 2) + ' m';
  if (m >= 0.01) return f(m * 100, m >= 0.1 ? 0 : 1) + ' cm';
  return f(m * 1000, 1) + ' mm';
}
function yorum(p){
  if (p >= 100) return 'Kusursuz! 🎯';
  if (p >= 85) return 'Çok yakın!';
  if (p >= 65) return 'Fena değil';
  if (p >= 40) return 'Biraz uzak';
  return 'Epey uzak 😅';
}
// bot tahmini: gerçek değerin etrafında, zorluğa göre sapmalı
function botTahmin(gercek, r){
  const g = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) / 1.0; };
  return gercek * Math.exp(g() * 0.33);
}
const API = { sorular, gunlukTohum, puan, sapma, birim, yorum, botTahmin, havuz, mulberry32, hash, MIN_ORAN, MAX_ORAN };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.BoyutCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
