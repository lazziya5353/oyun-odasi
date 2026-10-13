// Kelime yönetimi: Tabu kartları ve Çiz kelimeleri panelden eklenir / silinir / düzenlenir.
// Yerleşik listeler sitede (js/games/tabu-kartlar.js, js/games/ciz.js) durur; burada sadece DEĞİŞİKLİKLER tutulur
// ve site açılırken yerleşik listeye uygulanır (js/kelime.js).
//   GET  /api/kelime/liste                         → { tabu: { ekle: [{w, y}], sil: [w] }, ciz: { ekle: [w], sil: [w] }, ts }
//   POST /api/kelime/admin-tabu   { w, y: [5] }     (x-admin)  kart ekle ya da yerleşik kartın yasaklılarını değiştir
//   POST /api/kelime/admin-tabu-sil { w } · admin-tabu-geri { w }
//   POST /api/kelime/admin-ciz    { kelimeler: [..] } · admin-ciz-sil { w } · admin-ciz-geri { w }
import { getStore } from '../lib/blobs.mjs';

const store = name => (globalThis.__oyunOdasiTestStore ? globalThis.__oyunOdasiTestStore(name) : getStore({ name, consistency: 'strong' }));
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const temiz = (s, n) => String(s || '').replace(/[\u0000-\u001f<>:,#]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const kucuk = s => s.toLocaleLowerCase('tr-TR');
const bos = () => ({ tabu: { ekle: [], sil: [] }, ciz: { ekle: [], sil: [] }, ts: 0 });

async function isAdmin(req){
  const t = req.headers.get('x-admin') || '';
  if (!t || t.length > 100) return false;
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)));
  const h = [...d].map(x => x.toString(16).padStart(2, '0')).join('');
  const s = await store('oyunodasi-uye').get('a/' + h, { type: 'json' });
  return !!(s && s.exp > Date.now());
}
async function oku(){ const r = await store('oyunodasi-kelime').getWithMetadata('degisiklik', { type: 'json' }); return { d: Object.assign(bos(), (r && r.data) || {}), etag: r && r.etag }; }
async function guncelle(fn){
  const st = store('oyunodasi-kelime');
  for (let i = 0; i < 6; i++){
    const { d, etag } = await oku();
    const r = fn(d);
    if (r && r.hata) return r;
    d.ts = Date.now();
    const w = await st.setJSON('degisiklik', d, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    if (!w || w.modified !== false) return Object.assign({ ok: true }, r || {}, { liste: d });
    await new Promise(res => setTimeout(res, 80 + Math.random() * 200));
  }
  return { hata: 'meşgul, tekrar dene', status: 503 };
}

export default async (req, context) => {
  const url = new URL(req.url);
  const islem = (context && context.params && context.params.islem) || url.pathname.split('/').pop();
  try {
    if (req.method === 'GET' && islem === 'liste'){ const { d } = await oku(); return json(d); }
    if (req.method !== 'POST' || !islem.startsWith('admin-')) return json({ hata: 'bilinmeyen işlem' }, 404);
    if (!(await isAdmin(req))) return json({ hata: 'yetki' }, 401);
    const b = await req.json().catch(() => ({}));
    let r;
    if (islem === 'admin-tabu'){
      const w = temiz(b.w, 40), y = (Array.isArray(b.y) ? b.y : []).map(x => temiz(x, 30)).filter(Boolean);
      if (!w) return json({ hata: 'Kelime gerekli' }, 400);
      if (y.length < 3) return json({ hata: 'En az 3 yasaklı kelime yaz' }, 400);
      r = await guncelle(d => {
        const k = kucuk(w);
        d.tabu.ekle = d.tabu.ekle.filter(c => kucuk(c.w) !== k); d.tabu.ekle.push({ w, y: y.slice(0, 5) });
        d.tabu.sil = d.tabu.sil.filter(x => x !== k);
        if (d.tabu.ekle.length > 3000) return { hata: 'Çok fazla kart', status: 507 };
      });
    } else if (islem === 'admin-tabu-sil' || islem === 'admin-tabu-geri'){
      const k = kucuk(temiz(b.w, 40)); if (!k) return json({ hata: 'Kelime gerekli' }, 400);
      r = await guncelle(d => {
        if (islem === 'admin-tabu-sil'){ if (!d.tabu.sil.includes(k)) d.tabu.sil.push(k); }
        else d.tabu.sil = d.tabu.sil.filter(x => x !== k);
      });
    } else if (islem === 'admin-ciz'){
      const kel = [...new Set((Array.isArray(b.kelimeler) ? b.kelimeler : []).map(x => temiz(x, 30)).filter(x => x.length >= 2))];
      if (!kel.length) return json({ hata: 'Kelime yaz' }, 400);
      r = await guncelle(d => {
        for (const w of kel){ const k = kucuk(w); if (!d.ciz.ekle.some(x => kucuk(x) === k)) d.ciz.ekle.push(w); d.ciz.sil = d.ciz.sil.filter(x => x !== k); }
        if (d.ciz.ekle.length > 5000) return { hata: 'Çok fazla kelime', status: 507 };
        return { eklenen: kel.length };
      });
    } else if (islem === 'admin-ciz-sil' || islem === 'admin-ciz-geri'){
      const k = kucuk(temiz(b.w, 30)); if (!k) return json({ hata: 'Kelime gerekli' }, 400);
      r = await guncelle(d => {
        if (islem === 'admin-ciz-sil'){ if (!d.ciz.sil.includes(k)) d.ciz.sil.push(k); }
        else d.ciz.sil = d.ciz.sil.filter(x => x !== k);
      });
    } else return json({ hata: 'bilinmeyen işlem' }, 404);
    return r.hata ? json({ hata: r.hata }, r.status || 400) : json(r);
  } catch(e){
    return json({ hata: 'sunucu', detay: String(e && e.message || e).slice(0, 200) }, 500);
  }
};

export const config = { path: '/api/kelime/:islem' };
