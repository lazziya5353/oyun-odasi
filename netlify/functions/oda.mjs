// Canlı durum: kim sitede / hangi odada, hangi oda ne zamandır açık, kişilerin son görülme ve giriş geçmişi.
//   POST /api/oda/nabiz  { cid, ad, uye, cihaz, kod }  → { odalar: [...] }   (tarayıcı ~60 sn'de bir; odaya girip çıkınca hemen)
//   POST /api/oda/cik    { cid }                                             (sayfa kapanırken, sendBeacon)
//   POST /api/oda/dogrula { id, kod }  → { ok }   listedeki odanın kodu doğru mu
//   GET  /api/oda/acik                                                       → { odalar: [...] }  herkese açık: kod GÖSTERİLMEZ
//   GET  /api/oda/admin  (x-admin)                                           → { odalar, kisiler, simdi }  kodlar ve geçmiş dahil
// Hepsi tek bir kayıtta ('durum') tutulur; yazarken etag ile çakışma kontrolü yapılır.
import crypto from 'node:crypto';
import { getStore } from '../lib/blobs.mjs';

const store = name => (globalThis.__oyunOdasiTestStore ? globalThis.__oyunOdasiTestStore(name) : getStore({ name, consistency: 'strong' }));
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clip = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const CANLI = 150e3;          // bu kadar süre nabız gelmezse çevrimdışı sayılır
const ODA_KOPUK = 4 * 60e3;   // oda bu kadar boş kaldıysa sonraki girişte "yeni açıldı" sayılır
const GECMIS = 25, KISI_MAX = 400;

async function isAdmin(req){
  const t = req.headers.get('x-admin') || '';
  if (!t || t.length > 100) return false;
  const s = await store('oyunodasi-uye').get('a/' + crypto.createHash('sha256').update(t).digest('hex'), { type: 'json' });
  return !!(s && s.exp > Date.now());
}
// gizli oda: sadece yetkili üye açabilir (oturum anahtarı ile doğrulanır)
async function gizliYetkili(req){
  const h = req.headers.get('authorization') || '', t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t || t.length > 100) return false;
  const us = store('oyunodasi-uye');
  const s = await us.get('s/' + crypto.createHash('sha256').update(t).digest('hex'), { type: 'json' });
  if (!s || s.exp < Date.now()) return false;
  const u = await us.get('u/' + s.id, { type: 'json' });
  return !!(u && u.durum === 'onayli' && u.gizliOda && (s.sv || 0) === (u.sv || 0));
}
const bos = () => ({ canli: {}, kisiler: {}, odalar: {} });
async function oku(){ const r = await store('oyunodasi-varlik').getWithMetadata('durum', { type: 'json' }); return { d: (r && r.data) || bos(), etag: r && r.etag }; }
// oku → değiştir → yaz (başka biri araya girdiyse tekrar dene)
async function guncelle(fn){
  const st = store('oyunodasi-varlik');
  let d;
  for (let i = 0; i < 8; i++){
    const r = await oku(); d = r.d; d.canli = d.canli || {}; d.kisiler = d.kisiler || {}; d.odalar = d.odalar || {};
    fn(d, Date.now());
    const w = await st.setJSON('durum', d, r.etag ? { onlyIfMatch: r.etag } : { onlyIfNew: true });
    if (!w || w.modified !== false) return d;
    await new Promise(res => setTimeout(res, 40 + Math.random() * 160));
  }
  return d;
}
const cevrimici = (c, now) => c && !c.kapali && now - c.son < CANLI;
function gecmisEkle(k, olay){ k.gecmis = [olay].concat(k.gecmis || []).slice(0, GECMIS); }
// açık odalar: içinde çevrimiçi biri olan kodlar
function odaListesi(d, now, admin){
  const g = {};
  for (const [cid, c] of Object.entries(d.canli)){
    if (!c.kod || !cevrimici(c, now)) continue;
    (g[c.kod] = g[c.kod] || []).push({ ad: c.ad, cihaz: c.cihaz, uye: c.uye, giris: c.giris });
  }
  // gizli odalar herkese açık listede hiç görünmez; yönetici görür
  return Object.entries(g).filter(([kod]) => admin || !(d.odalar[kod] && d.odalar[kod].gizli)).map(([kod, kisiler]) => {
    const o = d.odalar[kod] || {};
    const acilis = Math.min(o.acilis || now, ...kisiler.map(k => k.giris || now));
    kisiler.sort((a, b) => (a.giris || 0) - (b.giris || 0));
    const r = { acilis, sure: now - acilis, kisi: kisiler.length, adlar: kisiler.map(k => k.ad) };
    if (admin){ r.kod = kod; r.kisiler = kisiler; r.acan = o.acan || ''; r.gizli = !!o.gizli; }
    else r.id = odaId(d, kod);
    return r;
  }).sort((a, b) => b.kisi - a.kisi || a.acilis - b.acilis);
}
// herkese açık listede kod yerine tuzlu kısa kimlik: kodu bilmeyen listeden kodu çıkaramaz
const odaId = (d, kod) => crypto.createHash('sha256').update((d.tuz || '') + ':' + kod).digest('hex').slice(0, 10);
function temizle(d, now){
  if (!d.tuz) d.tuz = crypto.randomBytes(16).toString('hex');
  for (const [cid, c] of Object.entries(d.canli)) if (now - c.son > 30 * 60e3) delete d.canli[cid];
  for (const [kod, o] of Object.entries(d.odalar)) if (now - (o.son || 0) > 864e5) delete d.odalar[kod];
  const ks = Object.entries(d.kisiler);
  if (ks.length > KISI_MAX){ ks.sort((a, b) => (b[1].son || 0) - (a[1].son || 0)); for (const [k] of ks.slice(KISI_MAX)) delete d.kisiler[k]; }
}

export default async (req, context) => {
  const url = new URL(req.url);
  const islem = (context && context.params && context.params.islem) || url.pathname.split('/').pop();
  try {
    if (req.method === 'GET' && islem === 'acik'){
      const { d } = await oku(); d.canli = d.canli || {}; d.odalar = d.odalar || {};
      return json({ odalar: odaListesi(d, Date.now(), false) });
    }
    if (req.method === 'GET' && islem === 'admin'){
      if (!(await isAdmin(req))) return json({ hata: 'yetki' }, 401);
      const { d } = await oku(); const now = Date.now(); d.canli = d.canli || {}; d.odalar = d.odalar || {}; d.kisiler = d.kisiler || {};
      // kişinin şu anki durumu: açık sekmelerinden en güncel olanı
      const simdi = {};
      for (const c of Object.values(d.canli)){ if (!cevrimici(c, now)) continue; const s = simdi[c.anahtar]; if (!s || (c.kod && !s.kod) || c.son > s.son) simdi[c.anahtar] = c; }
      const kisiler = Object.entries(d.kisiler).map(([k, p]) => {
        const c = simdi[k];
        return { anahtar: k, ad: p.ad, uye: p.uye, cihaz: c ? c.cihaz : p.cihaz, ilk: p.ilk, son: c ? now : p.son, cevrimici: !!c, oda: c ? c.kod : '', odaGiris: c ? c.giris : 0, gecmis: p.gecmis || [],
          siteMs: p.siteMs || 0, odaMs: p.odaMs || 0, girisler: p.girisler || 0 };
      }).sort((a, b) => (b.cevrimici - a.cevrimici) || (b.son || 0) - (a.son || 0));
      return json({ simdi: now, odalar: odaListesi(d, now, true), kisiler });
    }
    if (req.method === 'POST' && (islem === 'admin-at' || islem === 'admin-kisi-sil')){
      if (!(await isAdmin(req))) return json({ hata: 'yetki' }, 401);
      const b = await req.json().catch(() => ({}));
      const anahtar = clip(b.anahtar, 40);
      if (!/^[um]:/.test(anahtar)) return json({ hata: 'kişi' }, 400);
      await guncelle((d, now) => {
        if (islem === 'admin-at'){ d.at = d.at || {}; d.at[anahtar] = now; }
        else {
          delete d.kisiler[anahtar];
          for (const [cid, c] of Object.entries(d.canli)) if (c.anahtar === anahtar) delete d.canli[cid];
        }
      });
      return json({ ok: true });
    }
    if (req.method === 'POST' && islem === 'dogrula'){
      // listedeki odaya girmek için yazılan kod o odanın kodu mu?
      const b = await req.json().catch(() => ({}));
      const kod = clip(b.kod, 12).toUpperCase(), { d } = await oku();
      return json({ ok: !!kod && !!d.tuz && odaId(d, kod) === String(b.id || '') });
    }
    if (req.method === 'POST' && (islem === 'nabiz' || islem === 'cik')){
      const text = await req.text();
      if (text.length > 2000) return json({ hata: 'büyük' }, 413);
      let b; try { b = JSON.parse(text); } catch(e){ return json({ hata: 'json' }, 400); }
      const cid = clip(b.cid, 40).replace(/[^\w-]/g, '');
      if (cid.length < 8) return json({ hata: 'cid' }, 400);
      if (islem === 'cik'){
        await guncelle((d, now) => {
          const c = d.canli[cid]; if (!c || c.kapali) return;
          c.kapali = true; c.son = now;
          const k = d.kisiler[c.anahtar];
          if (k){ k.son = now; if (c.kod) gecmisEkle(k, { ts: now, tur: 'cikis', kod: c.kod }); }
          if (c.kod && d.odalar[c.kod]) d.odalar[c.kod].son = now;
        });
        return json({ ok: true });
      }
      const ad = clip(b.ad, 20), uye = clip(b.uye, 24).toLocaleLowerCase('tr'), cihaz = ['mobil', 'tablet', 'pc'].includes(b.cihaz) ? b.cihaz : 'pc';
      const kod = clip(b.kod, 12).toUpperCase().replace(/[^A-Z0-9ÇĞİÖŞÜ-]/g, '');
      const gizli = !!b.gizli && !!kod && await gizliYetkili(req);
      let atildi = false;
      const d = await guncelle((d, now) => {
        temizle(d, now);
        const onceki = d.canli[cid];
        if (!ad){ if (onceki) delete d.canli[cid]; return; }   // adı olmayan (henüz yazmamış) ziyaretçi sayılmaz
        const anahtar = uye ? 'u:' + uye : 'm:' + ad.toLocaleLowerCase('tr');
        let k = d.kisiler[anahtar];
        if (!k) k = d.kisiler[anahtar] = { ad, uye, cihaz, ilk: now, son: now, gecmis: [] };
        k.ad = ad; k.uye = uye; k.cihaz = cihaz;
        const devam = onceki && onceki.anahtar === anahtar && now - onceki.son < (onceki.kapali ? 90e3 : CANLI + 60e3);
        if (!devam){ gecmisEkle(k, { ts: now, tur: 'site', cihaz }); k.girisler = (k.girisler || 0) + 1; }
        // süre sayacı: iki nabız arası (en fazla 2,5 dk) sitede / odada geçen süre olarak eklenir
        if (devam && !onceki.kapali){
          const dt = Math.max(0, Math.min(now - onceki.son, CANLI));
          k.siteMs = (k.siteMs || 0) + dt;
          if (kod && onceki.kod === kod){
            k.odaMs = (k.odaMs || 0) + dt;
            k.odalar = k.odalar || {};
            k.odalar[kod] = (k.odalar[kod] || 0) + dt;
            const ks = Object.keys(k.odalar);
            if (ks.length > 30){ ks.sort((a, b) => k.odalar[a] - k.odalar[b]); delete k.odalar[ks[0]]; }
          }
        }
        let giris = devam && onceki.kod === kod ? onceki.giris : now;
        if (devam && onceki.kapali && onceki.kod === kod && kod){
          // sayfa yenilendi / kısa kopma: az önce yazılan "çıktı" kaydını geri al
          const g = k.gecmis && k.gecmis[0]; if (g && g.tur === 'cikis' && g.kod === kod) k.gecmis.shift();
        } else if (onceki && devam && onceki.kod && onceki.kod !== kod && !onceki.kapali){
          gecmisEkle(k, { ts: now, tur: 'cikis', kod: onceki.kod });
        }
        if (kod && !(devam && onceki.kod === kod)) gecmisEkle(k, { ts: now, tur: 'oda', kod, cihaz });
        if (kod){
          const o = d.odalar[kod];
          // oda bir süredir boşsa (herkes çıkmış) yeniden açılmış sayılır
          const bosmu = !o || (now - (o.son || 0) > ODA_KOPUK && !Object.entries(d.canli).some(([x, c]) => x !== cid && c.kod === kod && cevrimici(c, now)));
          // gizlilik kalıcı: oda bir süre boş kalıp yeniden açılsa da (24 saat içinde) gizli kalır
          if (bosmu) d.odalar[kod] = { acilis: now, son: now, acan: ad, gizli: !!(gizli || (o && o.gizli && now - (o.son || 0) < 864e5)) };
          else { o.son = now; if (gizli) o.gizli = true; }
        }
        k.son = now;
        d.canli[cid] = { anahtar, ad, uye, cihaz, kod, giris: kod ? giris : 0, son: now };
        // yönetici "odadan at" dediyse: bu kişinin odadaki sekmesine haber ver (bir kez)
        d.at = d.at || {};
        const atTs = d.at[anahtar];
        if (atTs && now - atTs < 10 * 60e3){ if (kod) { atildi = true; delete d.at[anahtar]; } }
        else if (atTs) delete d.at[anahtar];
      });
      return json({ odalar: odaListesi(d, Date.now(), false), at: atildi });
    }
    return json({ hata: 'bilinmeyen işlem' }, 404);
  } catch(e){
    return json({ hata: 'sunucu', detay: String(e && e.message || e).slice(0, 200) }, 500);
  }
};

export const config = { path: '/api/oda/:islem' };
