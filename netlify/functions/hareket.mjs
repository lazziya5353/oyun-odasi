// Kullanıcı hareketleri (yönetim paneli için): kim hangi odaya girdi/çıktı (telefon mu bilgisayar mı),
// kimi etiketledi, şaka/replik attı, oyun masası açtı, şarkı yükledi, radyo açtı…
//   POST /api/hareket/ekle         { ad, cihaz, uye, olaylar: [{ ts, tur, metin, oda }] }   (tarayıcı toplu gönderir)
//   GET  /api/hareket/admin-liste   (x-admin)  → { liste: [...] }  en yeni önce, son 500
import crypto from 'node:crypto';
import { getStore } from '../lib/blobs.mjs';

const store = name => (globalThis.__oyunOdasiTestStore ? globalThis.__oyunOdasiTestStore(name) : getStore({ name, consistency: 'strong' }));
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clip = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const TURLER = ['giris', 'cikis', 'oda', 'etiket', 'saka', 'replik', 'oyun', 'muzik', 'radyo', 'ses', 'film', 'ekran', 'hata', 'kopma'];
const MAX = 500;

async function isAdmin(req){
  const t = req.headers.get('x-admin') || '';
  if (!t || t.length > 100) return false;
  const s = await store('oyunodasi-uye').get('a/' + crypto.createHash('sha256').update(t).digest('hex'), { type: 'json' });
  return !!(s && s.exp > Date.now());
}
async function ekle(items){
  const st = store('oyunodasi-hareket');
  for (let i = 0; i < 6; i++){
    const r = await st.getWithMetadata('son', { type: 'json' });
    const list = (r && r.data && r.data.liste) || [];
    const next = items.concat(list).slice(0, MAX);
    const w = await st.setJSON('son', { liste: next }, r && r.etag ? { onlyIfMatch: r.etag } : { onlyIfNew: true });
    if (!w || w.modified !== false) return true;
    await new Promise(res => setTimeout(res, 60 + Math.random() * 200));
  }
  return false;
}

export default async (req, context) => {
  const url = new URL(req.url);
  const islem = (context && context.params && context.params.islem) || url.pathname.split('/').pop();
  try {
    if (req.method === 'GET' && islem === 'admin-liste'){
      if (!(await isAdmin(req))) return json({ hata: 'yetki' }, 401);
      const r = await store('oyunodasi-hareket').get('son', { type: 'json' });
      return json({ liste: (r && r.liste) || [] });
    }
    if (req.method === 'POST' && islem === 'admin-temizle'){
      if (!(await isAdmin(req))) return json({ hata: 'yetki' }, 401);
      await store('oyunodasi-hareket').setJSON('son', { liste: [] });
      return json({ ok: true });
    }
    if (req.method === 'POST' && islem === 'ekle'){
      const text = await req.text();
      if (text.length > 20000) return json({ hata: 'büyük' }, 413);
      let b; try { b = JSON.parse(text); } catch(e){ return json({ hata: 'json' }, 400); }
      const ad = clip(b.ad, 20) || 'Biri', cihaz = ['mobil', 'tablet', 'pc'].includes(b.cihaz) ? b.cihaz : 'pc', uye = !!b.uye;
      const now = Date.now();
      const items = (Array.isArray(b.olaylar) ? b.olaylar : []).slice(0, 30)
        .filter(o => o && TURLER.includes(o.tur))
        .map(o => ({ ts: Math.min(now, Math.max(now - 3600e3, Number(o.ts) || now)), ad, cihaz, uye, tur: o.tur, metin: clip(o.metin, o.tur === 'hata' || o.tur === 'kopma' ? 220 : 120), oda: clip(o.oda, 12) }))
        .sort((x, y) => y.ts - x.ts);
      if (!items.length) return json({ ok: true, n: 0 });
      await ekle(items);
      return json({ ok: true, n: items.length });
    }
    return json({ hata: 'bilinmeyen işlem' }, 404);
  } catch(e){
    return json({ hata: 'sunucu', detay: String(e && e.message || e).slice(0, 200) }, 500);
  }
};

export const config = { path: '/api/hareket/:islem' };
