// Panelden yüklenen video duvar kağıtları (GitHub'a gerek yok, yayın gerekmez → Netlify kredisi harcamaz).
// Dosyalar 3 MB'lık parçalar hâlinde Netlify Blobs'ta durur; site parçaları indirip birleştirir.
//   GET  /api/duvar/liste                                  → { videolar: [...] }   (herkese açık)
//   GET  /api/duvar/parca?id=..&tur=v|m|p&n=..            → parça (herkese açık, değişmez → uzun önbellek)
//   POST /api/duvar/parca?id=..&tur=v|m|p&n=..   (x-admin) → parça yükle (ham bayt, en fazla 3 MB)
//   POST /api/duvar/admin-ekle   { id, ad, kategori, video:{parca,boyut,tip}, poster?, muzik? }   (x-admin)
//   POST /api/duvar/admin-duzenle { id, ad?, kategori? } · admin-muzik { id, muzik|null } · admin-sil { id }   (x-admin)
// Replikler (film replik videoları) de burada:
//   GET  /api/duvar/replikler → { replikler: [{ id, ad, video, ts }] } · parçalar tur=r
//   POST /api/duvar/admin-replik-ekle { id, ad, video } · admin-replik-ad { id, ad } · admin-replik-sil { id }   (x-admin)
// tur: v = video, m = müzik, p = önizleme resmi, r = replik videosu
import { getStore } from '../lib/blobs.mjs';

const store = name => (globalThis.__oyunOdasiTestStore ? globalThis.__oyunOdasiTestStore(name) : getStore({ name, consistency: 'strong' }));
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clip = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const PARCA = 3 * 1024 * 1024 + 1024;
const SINIR = { v: 60 * 1024 * 1024, m: 30 * 1024 * 1024, p: 3 * 1024 * 1024, r: 40 * 1024 * 1024 };
const TIP = { v: /^video\/(mp4|webm|quicktime|x-m4v)$/, m: /^audio\/[\w.+-]{1,40}$/, p: /^image\/(jpeg|png|webp)$/, r: /^video\/(mp4|webm|quicktime|x-m4v)$/ };
const TOPLAM = 4 * 1024 * 1024 * 1024, ADET = 300;
const ID = /^[a-f0-9]{32}$/;

async function isAdmin(req){
  const t = req.headers.get('x-admin') || '';
  if (!t || t.length > 100) return false;
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)));
  const h = [...d].map(x => x.toString(16).padStart(2, '0')).join('');
  const s = await store('oyunodasi-uye').get('a/' + h, { type: 'json' });
  return !!(s && s.exp > Date.now());
}
async function adminLog(text){
  try { const st = store('oyunodasi-uye'); const l = (await st.get('log', { type: 'json' })) || []; l.unshift({ at: Date.now(), t: clip(text, 160) }); await st.setJSON('log', l.slice(0, 150)); } catch(e){}
}
async function oku(anahtar){ anahtar = anahtar || 'dizin'; const r = await store('oyunodasi-duvar').getWithMetadata(anahtar, { type: 'json' }); return { d: (r && r.data) || (anahtar === 'dizin' ? { videolar: [] } : { replikler: [] }), etag: r && r.etag }; }
async function guncelle(fn, anahtar){
  anahtar = anahtar || 'dizin';
  const st = store('oyunodasi-duvar');
  for (let i = 0; i < 6; i++){
    const { d, etag } = await oku(anahtar);
    const r = fn(d);
    if (r && r.hata) return r;
    const w = await st.setJSON(anahtar, d, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    if (!w || w.modified !== false) return r || { ok: true };
    await new Promise(res => setTimeout(res, 80 + Math.random() * 200));
  }
  return { hata: 'meşgul, tekrar dene', status: 503 };
}
// yüklenen dosyanın parçaları tam mı?
async function parcalarTam(id, tur, n){
  const { blobs } = await store('oyunodasi-duvar-parca').list({ prefix: id + '/' + tur + '/' });
  const var_ = new Set(blobs.map(x => x.key));
  for (let i = 0; i < n; i++) if (!var_.has(id + '/' + tur + '/' + i)) return false;
  return true;
}
async function parcalariSil(id, tur){
  const st = store('oyunodasi-duvar-parca');
  const { blobs } = await st.list({ prefix: id + '/' + (tur ? tur + '/' : '') });
  for (const x of blobs) await st.delete(x.key);
}
// dosya bilgisi { parca, boyut, tip } doğrula
function dosya(x, tur){
  if (!x) return null;
  const parca = Number(x.parca), boyut = Number(x.boyut), tip = String(x.tip || '');
  if (!Number.isInteger(parca) || parca < 1 || parca > 25 || !(boyut > 0) || boyut > SINIR[tur] || !TIP[tur].test(tip)) return false;
  return { parca, boyut, tip };
}

export default async (req, context) => {
  const url = new URL(req.url);
  const islem = (context && context.params && context.params.islem) || url.pathname.split('/').pop();
  try {
    if (req.method === 'GET' && islem === 'replikler'){
      const { d } = await oku('replik');
      return json({ replikler: d.replikler });
    }
    if (req.method === 'GET' && islem === 'liste'){
      const { d } = await oku();
      return json({ videolar: d.videolar });
    }
    if (islem === 'parca'){
      const id = url.searchParams.get('id') || '', tur = url.searchParams.get('tur') || '', n = Number(url.searchParams.get('n'));
      if (!ID.test(id) || !SINIR[tur] || !Number.isInteger(n) || n < 0 || n > 24) return json({ hata: 'parça' }, 400);
      const st = store('oyunodasi-duvar-parca'), key = id + '/' + tur + '/' + n;
      if (req.method === 'GET'){
        const buf = await st.get(key, { type: 'arrayBuffer' });
        if (!buf) return json({ hata: 'yok' }, 404);
        return new Response(buf, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' } });
      }
      if (req.method === 'POST'){
        if (!(await isAdmin(req))) return json({ hata: 'yetki' }, 401);
        const buf = await req.arrayBuffer();
        if (!buf.byteLength || buf.byteLength > PARCA) return json({ hata: 'parça boyutu' }, 413);
        await st.set(key, buf);
        return json({ ok: true });
      }
    }
    if (req.method !== 'POST' || !islem.startsWith('admin-')) return json({ hata: 'bilinmeyen işlem' }, 404);
    if (!(await isAdmin(req))) return json({ hata: 'yetki' }, 401);
    const b = await req.json().catch(() => ({}));
    const id = String(b.id || '');
    if (!ID.test(id)) return json({ hata: 'id' }, 400);

    if (islem === 'admin-replik-ekle'){
      const ad = clip(b.ad, 100), video = dosya(b.video, 'r');
      if (!ad) return json({ hata: 'Ad gerekli' }, 400);
      if (!video) return json({ hata: 'Video bilgisi hatalı (en fazla 40 MB, mp4/webm)' }, 400);
      if (!(await parcalarTam(id, 'r', video.parca))) return json({ hata: 'Video parçaları eksik, tekrar yükle' }, 409);
      const kayit = { id, ad, video, ts: Date.now() };
      const r = await guncelle(d => {
        if (d.replikler.some(x => x.id === id)) return { ok: true, zatenVar: true };
        if (d.replikler.length >= 500) return { hata: 'Çok fazla replik (en fazla 500)', status: 507 };
        d.replikler.push(kayit);
        return { ok: true, replik: kayit };
      }, 'replik');
      if (r.hata) return json({ hata: r.hata }, r.status || 400);
      await adminLog('Replik eklendi: ' + ad);
      return json(r);
    }
    if (islem === 'admin-replik-ad'){
      const ad = clip(b.ad, 100); if (!ad) return json({ hata: 'Ad gerekli' }, 400);
      const r = await guncelle(d => { const x = d.replikler.find(v => v.id === id); if (!x) return { hata: 'bulunamadı', status: 404 }; x.ad = ad; return { ok: true }; }, 'replik');
      return r.hata ? json({ hata: r.hata }, r.status || 400) : json(r);
    }
    if (islem === 'admin-replik-sil'){
      let ad = '';
      const r = await guncelle(d => { const x = d.replikler.find(v => v.id === id); if (!x) return { hata: 'bulunamadı', status: 404 }; ad = x.ad; d.replikler = d.replikler.filter(v => v.id !== id); return { ok: true }; }, 'replik');
      if (r.hata) return json({ hata: r.hata }, r.status || 400);
      await parcalariSil(id, 'r');
      await adminLog('Replik silindi: ' + ad);
      return json({ ok: true });
    }
    if (islem === 'admin-ekle'){
      const ad = clip(b.ad, 60), kategori = clip(b.kategori, 30) || 'Diğer';
      const video = dosya(b.video, 'v'), poster = dosya(b.poster, 'p'), muzik = dosya(b.muzik, 'm');
      if (!ad) return json({ hata: 'Ad gerekli' }, 400);
      if (!video) return json({ hata: 'Video bilgisi hatalı (en fazla 60 MB, mp4/webm)' }, 400);
      if (poster === false || muzik === false) return json({ hata: 'Dosya bilgisi hatalı' }, 400);
      if (!(await parcalarTam(id, 'v', video.parca))) return json({ hata: 'Video parçaları eksik, tekrar yükle' }, 409);
      if (poster && !(await parcalarTam(id, 'p', poster.parca))) return json({ hata: 'Önizleme parçaları eksik' }, 409);
      if (muzik && !(await parcalarTam(id, 'm', muzik.parca))) return json({ hata: 'Müzik parçaları eksik' }, 409);
      const kayit = { id, ad, kategori, video, poster: poster || null, muzik: muzik || null, ts: Date.now() };
      const r = await guncelle(d => {
        if (d.videolar.some(x => x.id === id)) return { ok: true, zatenVar: true };
        if (d.videolar.length >= ADET) return { hata: 'Çok fazla video (en fazla ' + ADET + ')', status: 507 };
        const top = d.videolar.reduce((a, x) => a + x.video.boyut + (x.muzik ? x.muzik.boyut : 0), 0);
        if (top + video.boyut + (muzik ? muzik.boyut : 0) > TOPLAM) return { hata: 'Depolama dolu', status: 507 };
        d.videolar.push(kayit);
        return { ok: true, video: kayit };
      });
      if (r.hata) return json({ hata: r.hata }, r.status || 400);
      await adminLog('Duvar kağıdı eklendi: ' + kategori + ' / ' + ad);
      return json(r);
    }
    if (islem === 'admin-duzenle'){
      const ad = b.ad !== undefined ? clip(b.ad, 60) : null, kategori = b.kategori !== undefined ? clip(b.kategori, 30) : null;
      if (ad === '' || kategori === '') return json({ hata: 'Boş olamaz' }, 400);
      const r = await guncelle(d => { const x = d.videolar.find(v => v.id === id); if (!x) return { hata: 'bulunamadı', status: 404 }; if (ad) x.ad = ad; if (kategori) x.kategori = kategori; return { ok: true, video: x }; });
      return r.hata ? json({ hata: r.hata }, r.status || 400) : json(r);
    }
    if (islem === 'admin-muzik'){
      const muzik = b.muzik ? dosya(b.muzik, 'm') : null;
      if (muzik === false) return json({ hata: 'Müzik bilgisi hatalı (en fazla 30 MB)' }, 400);
      if (muzik && !(await parcalarTam(id, 'm', muzik.parca))) return json({ hata: 'Müzik parçaları eksik' }, 409);
      let eski = null;
      const r = await guncelle(d => { const x = d.videolar.find(v => v.id === id); if (!x) return { hata: 'bulunamadı', status: 404 }; eski = x.muzik; x.muzik = muzik ? Object.assign(muzik, { s: Date.now() }) : null; return { ok: true, video: x }; });
      if (r.hata) return json({ hata: r.hata }, r.status || 400);
      // müzik kaldırıldıysa parçalarını da sil (yenisi aynı yere yazıldıysa dokunma)
      if (!muzik && eski) await parcalariSil(id, 'm');
      return json(r);
    }
    if (islem === 'admin-sil'){
      let ad = '';
      const r = await guncelle(d => { const x = d.videolar.find(v => v.id === id); if (!x) return { hata: 'bulunamadı', status: 404 }; ad = x.kategori + ' / ' + x.ad; d.videolar = d.videolar.filter(v => v.id !== id); return { ok: true }; });
      if (r.hata) return json({ hata: r.hata }, r.status || 400);
      await parcalariSil(id);
      await adminLog('Duvar kağıdı silindi: ' + ad);
      return json({ ok: true });
    }
    return json({ hata: 'bilinmeyen işlem' }, 404);
  } catch(e){
    return json({ hata: 'sunucu', detay: String(e && e.message || e).slice(0, 200) }, 500);
  }
};

export const config = { path: '/api/duvar/:islem' };
