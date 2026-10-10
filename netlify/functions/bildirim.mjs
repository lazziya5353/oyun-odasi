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
// Kötüye kullanıma karşı: aynı oda kodu için dakikada bir, toplamda saatte en fazla 30 "oda açıldı" bildirimi
async function allowed(code){
  const st = store('oyunodasi-ayar');
  const now = Date.now();
  const r = (await st.get('sinir', { type: 'json' })) || { codes: {}, times: [] };
  r.times = r.times.filter(t => now - t < 3600e3);
  for (const c in r.codes) if (now - r.codes[c] > 60e3) delete r.codes[c];
  if (r.codes[code]) return 'kod';
  if (r.times.length >= 30) return 'saat';
  r.codes[code] = now; r.times.push(now);
  await st.setJSON('sinir', r);
  return '';
}
const platformOf = ep => /apple\.com/.test(ep) ? 'iPhone/Mac (Apple)' : /fcm\.googleapis|android\.googleapis/.test(ep) ? 'Chrome / Android' : /mozilla/.test(ep) ? 'Firefox' : /notify\.windows|wns/.test(ep) ? 'Edge (Windows)' : 'Diğer';
// bir aboneye gönder; sonucu abonelik kaydına yaz (yönetim panelinde görünür)
async function sendAndRecord(s, payload, v, origin, opts){
  const subs = store('oyunodasi-abone');
  let st = 0, err = '';
  try { st = await sendPush(s.sub, payload, v, origin, opts); } catch(e){ err = String(e && e.message || e).slice(0, 80); }
  if (st === 404 || st === 410){ await subs.delete(s.key); return { st, gone: true }; }
  const rec = { sub: s.sub, name: s.name, ts: s.ts, lastTest: s.lastTest, last: { at: Date.now(), st, err } };
  try { await subs.setJSON(s.key, rec); } catch(e){}
  return { st, err };
}
async function isAdmin(req){
  const t = req.headers.get('x-admin') || '';
  if (!t || t.length > 100) return false;
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)));
  const h = [...d].map(x => x.toString(16).padStart(2, '0')).join('');
  const s = await store('oyunodasi-uye').get('a/' + h, { type: 'json' });
  return !!(s && s.exp > Date.now());
}
async function logSend(entry){
  const st = store('oyunodasi-ayar');
  const l = (await st.get('gecmis', { type: 'json' })) || [];
  l.unshift(entry);
  await st.setJSON('gecmis', l.slice(0, 30));
}

export default async (req, context) => {
  const islem = (context && context.params && context.params.islem) || new URL(req.url).pathname.split('/').pop();
  try {
    if (req.method === 'GET' && islem === 'anahtar'){
      const v = await vapidKeys();
      return json({ key: v.publicKey });
    }
    if (req.method === 'GET' && islem === 'admin-durum'){
      if (!(await isAdmin(req))) return json({ hata: 'yetki' }, 401);
      const list = await allSubs();
      const gecmis = (await store('oyunodasi-ayar').get('gecmis', { type: 'json' })) || [];
      return json({ cihazlar: list.map(s => ({ name: s.name || '—', platform: platformOf(s.sub.endpoint), ts: s.ts, last: s.last || null })), gecmis });
    }
    if (req.method === 'POST' && islem === 'admin-test'){
      if (!(await isAdmin(req))) return json({ hata: 'yetki' }, 401);
      const v = await vapidKeys(), origin = new URL(req.url).origin;
      const list = await allSubs();
      const res = await Promise.all(list.map(s => sendAndRecord(s, { title: '🧪 Yöneticiden deneme bildirimi', body: 'Bu cihaza bildirimler ulaşıyor 👍', url: '/', tag: 'test-' + Date.now() }, v, origin, { ttl: 600 })));
      return json({ ok: true, total: list.length, sent: res.filter(r => r.st >= 200 && r.st < 300).length, gone: res.filter(r => r.gone).length });
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
      const old = (await subs.get(key, { type: 'json' })) || {};
      await subs.setJSON(key, { sub: { endpoint: b.sub.endpoint, keys: { p256dh: b.sub.keys.p256dh, auth: b.sub.keys.auth } }, name: clip(b.name, 20) || old.name || '', ts: old.ts || Date.now(), last: old.last, lastTest: old.lastTest });
      return json({ ok: true });
    }
    if (islem === 'iptal'){
      if (typeof b.endpoint === 'string') await subs.delete(await hash(b.endpoint));
      return json({ ok: true });
    }
    if (islem === 'test'){
      // sadece isteyen cihaza deneme bildirimi (30 sn'de bir)
      if (typeof b.endpoint !== 'string') return json({ ok: true, sent: 0 });
      const key = await hash(b.endpoint);
      const rec = await subs.get(key, { type: 'json' });
      if (!rec) return json({ ok: true, sent: 0 });
      if (rec.lastTest && Date.now() - rec.lastTest < 30000) return json({ ok: true, sent: 1, bekle: true });
      rec.lastTest = Date.now(); await subs.setJSON(key, rec);
      const v = await vapidKeys();
      const r = await sendAndRecord(Object.assign({ key }, rec), { title: '🧪 Deneme bildirimi', body: 'Bildirimler bu cihazda çalışıyor! Arkadaşın oda açınca böyle haber gelecek.', url: '/', tag: 'test-' + Date.now() }, v, new URL(req.url).origin, { ttl: 600 });
      if (r.gone) return json({ ok: true, sent: 0 });
      return json({ ok: true, sent: r.st >= 200 && r.st < 300 ? 1 : 0, status: r.st, err: r.err });
    }
    if (islem === 'oda'){
      const code = String(b.code || '');
      if (!/^[A-Z0-9]{3,12}$/.test(code)) return json({ hata: 'kod' }, 400);
      const lim = await allowed(code);
      if (lim) return json({ ok: true, sent: 0, sinir: lim });
      const v = await vapidKeys();
      const origin = new URL(req.url).origin;
      const name = clip(b.name, 20) || 'Biri';
      const payload = {
        title: '🎮 ' + name + ' oda açtı',
        body: 'Oyun Odası açık (kod: ' + code + '). Dokun, hemen katıl!',
        url: '/?oda=' + code,
        tag: 'oda-' + code + '-' + Date.now()      // her bildirim ayrı: aynı etiket iPhone'da sessizce üstüne yazılıyordu
      };
      const me = typeof b.endpoint === 'string' ? await hash(b.endpoint) : '';
      const list = (await allSubs()).filter(s => s.key !== me);
      const res = await Promise.all(list.map(s => sendAndRecord(s, payload, v, origin, { ttl: 1800 })));
      const sent = res.filter(r => r.st >= 200 && r.st < 300).length, gone = res.filter(r => r.gone).length;
      const fails = list.map((s, i) => ({ name: s.name || '—', platform: platformOf(s.sub.endpoint), st: res[i].st, err: res[i].err })).filter((x, i) => !(res[i].st >= 200 && res[i].st < 300));
      await logSend({ at: Date.now(), code, by: name, total: list.length, sent, gone, fails: fails.slice(0, 10) });
      return json({ ok: true, sent, gone, failed: list.length - sent - gone, total: list.length });
    }
    return json({ hata: 'bilinmeyen işlem' }, 404);
  } catch(e){
    return json({ hata: 'sunucu', detay: String(e && e.message || e).slice(0, 200) }, 500);
  }
};

export const config = { path: '/api/bildirim/:islem' };
