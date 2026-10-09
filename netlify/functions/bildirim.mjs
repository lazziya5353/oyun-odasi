// Oyun Odası bildirimleri (Netlify Function).
//   GET  /api/bildirim/anahtar  → tarayıcının abone olması için açık anahtar
//   POST /api/bildirim/abone    → { sub, name }   bu cihazı bildirim listesine ekle
//   POST /api/bildirim/iptal    → { endpoint }    listeden çıkar
//   POST /api/bildirim/oda      → { code, name, endpoint }  "oda açıldı" bildirimini herkese gönder (gönderen hariç)
// Abonelikler ve anahtar Netlify Blobs'ta saklanır; hiçbir ayar yapmak gerekmez (anahtar ilk çağrıda kendiliğinden üretilir).
import { getStore } from '../lib/blobs.mjs';
import { makeVapidKeys, sendPush } from '../lib/webpush.mjs';

const store = name => (globalThis.__oyunOdasiTestStore ? globalThis.__oyunOdasiTestStore(name) : getStore({ name, consistency: 'strong' }));
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clip = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);
const MAX_SUBS = 500;

async function hash(s){
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}
async function vapidKeys(){
  const st = store('oyunodasi-ayar');
  let v = await st.get('vapid', { type: 'json' });
  if (v) return v;
  await st.setJSON('vapid', makeVapidKeys(), { onlyIfNew: true });      // aynı anda iki çağrı gelirse ilk yazan kazanır
  return st.get('vapid', { type: 'json' });
}
function validSub(sub){
  if (!sub || typeof sub !== 'object' || !sub.keys) return false;
  let u; try { u = new URL(sub.endpoint); } catch(e){ return false; }
  const local = globalThis.__oyunOdasiTestStore && u.hostname === '127.0.0.1';
  return (u.protocol === 'https:' || local) && sub.endpoint.length < 1000 &&
    typeof sub.keys.p256dh === 'string' && sub.keys.p256dh.length < 200 && typeof sub.keys.auth === 'string' && sub.keys.auth.length < 100;
}
async function allSubs(){
  const st = store('oyunodasi-abone');
  const { blobs } = await st.list();
  const out = [];
  for (const b of blobs){ const v = await st.get(b.key, { type: 'json' }); if (v) out.push({ key: b.key, ...v }); }
  return out;
}
// Kötüye kullanıma karşı: aynı oda için 3 dakikada bir, toplamda saatte en fazla 20 "oda açıldı" bildirimi
async function allowed(code){
  const st = store('oyunodasi-ayar');
  const now = Date.now();
  const r = (await st.get('sinir', { type: 'json' })) || { codes: {}, times: [] };
  r.times = r.times.filter(t => now - t < 3600e3);
  for (const c in r.codes) if (now - r.codes[c] > 180e3) delete r.codes[c];
  if (r.codes[code] || r.times.length >= 20) return false;
  r.codes[code] = now; r.times.push(now);
  await st.setJSON('sinir', r);
  return true;
}

export default async (req, context) => {
  const islem = (context && context.params && context.params.islem) || new URL(req.url).pathname.split('/').pop();
  try {
    if (req.method === 'GET' && islem === 'anahtar'){
      const v = await vapidKeys();
      return json({ key: v.publicKey });
    }
    if (req.method !== 'POST') return json({ hata: 'yöntem' }, 405);
    const b = await req.json().catch(() => ({}));
    const subs = store('oyunodasi-abone');

    if (islem === 'abone'){
      if (!validSub(b.sub)) return json({ hata: 'abonelik geçersiz' }, 400);
      const key = await hash(b.sub.endpoint);
      if (!(await subs.get(key))){
        const { blobs } = await subs.list();
        if (blobs.length >= MAX_SUBS) return json({ hata: 'liste dolu' }, 429);
      }
      await subs.setJSON(key, { sub: { endpoint: b.sub.endpoint, keys: { p256dh: b.sub.keys.p256dh, auth: b.sub.keys.auth } }, name: clip(b.name, 20), ts: Date.now() });
      return json({ ok: true });
    }
    if (islem === 'iptal'){
      if (typeof b.endpoint === 'string') await subs.delete(await hash(b.endpoint));
      return json({ ok: true });
    }
    if (islem === 'oda'){
      const code = String(b.code || '');
      if (!/^[A-Z0-9]{3,12}$/.test(code)) return json({ hata: 'kod' }, 400);
      if (!(await allowed(code))) return json({ ok: true, sent: 0, sinir: true });
      const v = await vapidKeys();
      const origin = new URL(req.url).origin;
      const name = clip(b.name, 20) || 'Biri';
      const payload = {
        title: '🎮 ' + name + ' oda açtı',
        body: 'Oyun Odası açık (kod: ' + code + '). Dokun, hemen katıl!',
        url: '/?oda=' + code,
        tag: 'oda-' + code
      };
      const me = typeof b.endpoint === 'string' ? await hash(b.endpoint) : '';
      const list = (await allSubs()).filter(s => s.key !== me);
      let sent = 0, gone = 0;
      await Promise.all(list.map(async s => {
        try {
          const st = await sendPush(s.sub, payload, v, origin, { ttl: 1800, topic: 'oda' + code });
          if (st >= 200 && st < 300) sent++;
          else if (st === 404 || st === 410){ gone++; await subs.delete(s.key); }
        } catch(e){ /* tek kişiye gidemezse diğerleri etkilenmesin */ }
      }));
      return json({ ok: true, sent, gone, total: list.length });
    }
    return json({ hata: 'bilinmeyen işlem' }, 404);
  } catch(e){
    return json({ hata: 'sunucu', detay: String(e && e.message || e).slice(0, 200) }, 500);
  }
};

export const config = { path: '/api/bildirim/:islem' };
