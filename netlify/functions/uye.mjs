// Üyelik ve yönetici (admin) paneli (Netlify Function, /api/uye/:islem).
// Üye olmak için: ad soyad, kullanıcı adı, şifre. Başvuru yöneticinin onayına düşer; onaylanınca üyeye bildirim gider.
// Şifreler PBKDF2 ile saklanır (düz metin tutulmaz). Oturum anahtarları rastgele, 180 gün geçerli.
//
// Yönetici şifresi: Netlify'da ADMIN_SIFRE ortam değişkeni varsa o, yoksa varsayılan şifre (aşağıdaki özet).
import crypto from 'node:crypto';
import { getStore } from '../lib/blobs.mjs';
import { sendPush } from '../lib/webpush.mjs';

const store = () => (globalThis.__oyunOdasiTestStore ? globalThis.__oyunOdasiTestStore('oyunodasi-uye') : getStore({ name: 'oyunodasi-uye', consistency: 'strong' }));
const vstore = () => (globalThis.__oyunOdasiTestStore ? globalThis.__oyunOdasiTestStore('oyunodasi-ayar') : getStore({ name: 'oyunodasi-ayar', consistency: 'strong' }));
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clip = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const lowerKey = s => String(s).toLocaleLowerCase('tr-TR');
const ADMIN_SALT = 'oyunodasi-admin-v1';
const SESSION_DAYS = 180, ADMIN_HOURS = 12;
const FOTO_MAX = 220 * 1024;

const hashPw = (pw, salt) => crypto.pbkdf2Sync(String(pw), salt, 120000, 32, 'sha256').toString('hex');
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const token = () => crypto.randomBytes(32).toString('base64url');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
// varsayılan yönetici şifresinin özeti (şifrenin kendisi kodda yazılmaz)
const DEFAULT_ADMIN = 'c884240bc2367d1eaae80e94dbc4486b663184137bed5899d0a53e6102d526da';

function pub(u){
  return { id: u.id, kadi: u.kadi, adSoyad: u.adSoyad, name: u.name, durum: u.durum, created: u.created, approvedAt: u.approvedAt || null,
    foto: u.foto ? '/api/uye/foto?id=' + u.id + '&v=' + u.foto : null };
}
async function getUser(id){ return id ? store().get('u/' + id, { type: 'json' }) : null; }
async function putUser(u){ await store().setJSON('u/' + u.id, u); }
async function authUser(req){
  const h = req.headers.get('authorization') || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t || t.length > 100) return null;
  const s = await store().get('s/' + sha(t), { type: 'json' });
  if (!s || s.exp < Date.now()) return null;
  const u = await getUser(s.id);
  return u && u.durum === 'onayli' ? u : null;
}
async function authAdmin(req){
  const t = req.headers.get('x-admin') || '';
  if (!t || t.length > 100) return false;
  const s = await store().get('a/' + sha(t), { type: 'json' });
  return !!(s && s.exp > Date.now());
}
async function allUsers(){
  const { blobs } = await store().list({ prefix: 'u/' });
  const out = [];
  for (const b of blobs){ const u = await store().get(b.key, { type: 'json' }); if (u) out.push(u); }
  return out.sort((a, b) => b.created - a.created);
}
const validSub = s => s && typeof s === 'object' && typeof s.endpoint === 'string' && s.endpoint.length < 1000 && (/^https:\/\//.test(s.endpoint) || (!!globalThis.__oyunOdasiTestStore && /^http:\/\/127\.0\.0\.1/.test(s.endpoint))) &&
  s.keys && typeof s.keys.p256dh === 'string' && s.keys.p256dh.length < 200 && typeof s.keys.auth === 'string' && s.keys.auth.length < 100;
const cleanSub = s => ({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } });

async function vapid(){ return vstore().get('vapid', { type: 'json' }); }
async function pushTo(subs, payload, origin){
  const v = await vapid(); if (!v || !subs || !subs.length) return [];
  const gone = [];
  await Promise.all(subs.map(async s => {
    try { const st = await sendPush(s, payload, v, origin, { ttl: 86400 }); if (st === 404 || st === 410) gone.push(s.endpoint); } catch(e){}
  }));
  return gone;
}
// çok sayıda yanlış yönetici şifresi denemesine karşı: 15 dakikada en fazla 8 hatalı deneme
async function adminLimit(ok){
  const st = store(), now = Date.now();
  const r = (await st.get('rl/admin', { type: 'json' })) || { f: [] };
  r.f = r.f.filter(t => now - t < 15 * 60e3);
  if (ok === undefined) return r.f.length < 8;
  if (!ok){ r.f.push(now); await st.setJSON('rl/admin', r); }
  return true;
}

export default async (req, context) => {
  const url = new URL(req.url);
  const islem = (context && context.params && context.params.islem) || url.pathname.split('/').pop();
  const origin = url.origin;
  try {
    // ---------- profil fotoğrafı (herkese açık) ----------
    if (req.method === 'GET' && islem === 'foto'){
      const id = url.searchParams.get('id') || '';
      if (!/^[a-z0-9]{8,24}$/.test(id)) return json({ hata: 'id' }, 400);
      const buf = await store().get('f/' + id, { type: 'arrayBuffer' });
      if (!buf) return json({ hata: 'yok' }, 404);
      return new Response(buf, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
    }
    if (req.method === 'GET' && islem === 'ben'){
      const u = await authUser(req);
      return u ? json({ uye: pub(u) }) : json({ hata: 'oturum yok' }, 401);
    }
    if (req.method === 'GET' && islem === 'admin-liste'){
      if (!(await authAdmin(req))) return json({ hata: 'yetki' }, 401);
      const us = await allUsers();
      const ap = (await store().get('adminpush', { type: 'json' })) || [];
      return json({ uyeler: us.map(u => Object.assign(pub(u), { bildirim: (u.push || []).length > 0 })), adminBildirim: ap.length });
    }
    if (req.method !== 'POST') return json({ hata: 'yöntem' }, 405);

    if (islem === 'foto-yukle'){
      const u = await authUser(req); if (!u) return json({ hata: 'oturum yok' }, 401);
      const buf = await req.arrayBuffer();
      const b = new Uint8Array(buf);
      if (!b.length || b.length > FOTO_MAX || b[0] !== 0xff || b[1] !== 0xd8) return json({ hata: 'fotoğraf geçersiz' }, 400);
      await store().set('f/' + u.id, buf);
      u.foto = (u.foto || 0) + 1; await putUser(u);
      return json({ ok: true, uye: pub(u) });
    }
    const b = await req.json().catch(() => ({}));

    // ---------- üyelik ----------
    if (islem === 'kayit'){
      const adSoyad = clip(b.adSoyad, 40), kadi = clip(b.kadi, 20), sifre = String(b.sifre || '');
      if (adSoyad.length < 3) return json({ hata: 'Adını ve soyadını yaz.' }, 400);
      if (!/^[a-zA-Z0-9çğıöşüÇĞİÖŞÜ._-]{3,20}$/.test(kadi)) return json({ hata: 'Kullanıcı adı 3-20 karakter olmalı; harf, rakam, nokta, alt çizgi kullanabilirsin (boşluk olmaz).' }, 400);
      if (sifre.length < 4 || sifre.length > 100) return json({ hata: 'Şifre en az 4 karakter olmalı.' }, 400);
      const st = store(), key = lowerKey(kadi);
      const id = crypto.randomBytes(8).toString('hex').slice(0, 12);
      const w = await st.setJSON('k/' + key, { id }, { onlyIfNew: true });
      if (w && w.modified === false){
        const ex = await st.get('k/' + key, { type: 'json' });
        const exu = ex && await getUser(ex.id);
        if (exu && exu.durum !== 'red') return json({ hata: 'Bu kullanıcı adı alınmış, başka bir tane dene.' }, 409);
        await st.setJSON('k/' + key, { id });       // reddedilen başvurunun adı yeniden kullanılabilir
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const u = { id, kadi, adSoyad, name: clip(b.name, 20) || adSoyad.split(' ')[0].slice(0, 20), salt, hash: hashPw(sifre, salt),
        durum: 'bekliyor', created: Date.now(), foto: 0, push: validSub(b.push) ? [cleanSub(b.push)] : [] };
      await putUser(u);
      // yöneticiye haber ver
      const ap = (await st.get('adminpush', { type: 'json' })) || [];
      const gone = await pushTo(ap, { title: '🆕 Yeni üyelik başvurusu', body: adSoyad + ' (@' + kadi + ') onay bekliyor', url: '/admin', tag: 'basvuru-' + Date.now() }, origin);
      if (gone.length) await st.setJSON('adminpush', ap.filter(s => !gone.includes(s.endpoint)));
      return json({ ok: true, durum: 'bekliyor' });
    }
    if (islem === 'durum'){
      const ex = await store().get('k/' + lowerKey(clip(b.kadi, 20)), { type: 'json' });
      const u = ex && await getUser(ex.id);
      return json({ durum: u ? u.durum : 'yok' });
    }
    if (islem === 'giris'){
      const ex = await store().get('k/' + lowerKey(clip(b.kadi, 20)), { type: 'json' });
      const u = ex && await getUser(ex.id);
      if (!u || !same(hashPw(b.sifre || '', u.salt), u.hash)) return json({ hata: 'Kullanıcı adı ya da şifre yanlış.' }, 401);
      if (u.durum === 'bekliyor') return json({ hata: 'Üyeliğin henüz onaylanmadı. Onaylanınca haber vereceğiz.', durum: 'bekliyor' }, 403);
      if (u.durum === 'red') return json({ hata: 'Üyelik başvurun onaylanmadı.', durum: 'red' }, 403);
      const t = token();
      await store().setJSON('s/' + sha(t), { id: u.id, exp: Date.now() + SESSION_DAYS * 864e5 });
      if (validSub(b.push) && !(u.push || []).some(s => s.endpoint === b.push.endpoint)){ u.push = (u.push || []).concat(cleanSub(b.push)).slice(-5); await putUser(u); }
      return json({ ok: true, token: t, uye: pub(u) });
    }
    if (islem === 'cikis'){
      const h = req.headers.get('authorization') || '';
      if (h.startsWith('Bearer ')) await store().delete('s/' + sha(h.slice(7)));
      return json({ ok: true });
    }
    if (islem === 'profil'){
      const u = await authUser(req); if (!u) return json({ hata: 'oturum yok' }, 401);
      if (b.name !== undefined){ const n = clip(b.name, 20); if (n.length < 2) return json({ hata: 'Görünen ad en az 2 harf olmalı.' }, 400); u.name = n; }
      if (b.fotoSil){ u.foto = 0; await store().delete('f/' + u.id); }
      if (validSub(b.push) && !(u.push || []).some(s => s.endpoint === b.push.endpoint)) u.push = (u.push || []).concat(cleanSub(b.push)).slice(-5);
      await putUser(u);
      return json({ ok: true, uye: pub(u) });
    }
    if (islem === 'sifre'){
      const u = await authUser(req); if (!u) return json({ hata: 'oturum yok' }, 401);
      if (!same(hashPw(b.eski || '', u.salt), u.hash)) return json({ hata: 'Eski şifre yanlış.' }, 400);
      if (String(b.yeni || '').length < 4) return json({ hata: 'Yeni şifre en az 4 karakter olmalı.' }, 400);
      u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(b.yeni, u.salt); await putUser(u);
      return json({ ok: true });
    }

    // ---------- yönetici ----------
    if (islem === 'admin-giris'){
      if (!(await adminLimit())) return json({ hata: 'Çok fazla yanlış deneme. 15 dakika sonra tekrar dene.' }, 429);
      const want = process.env.ADMIN_SIFRE ? hashPw(process.env.ADMIN_SIFRE.trim(), ADMIN_SALT) : DEFAULT_ADMIN;
      const ok = same(hashPw(String(b.sifre || '').trim(), ADMIN_SALT), want);   // baştaki/sondaki boşluk önemsiz
      await adminLimit(ok);
      if (!ok) return json({ hata: 'Şifre yanlış.' }, 401);
      const t = token();
      await store().setJSON('a/' + sha(t), { exp: Date.now() + ADMIN_HOURS * 3600e3 });
      return json({ ok: true, token: t });
    }
    if (!islem.startsWith('admin-')) return json({ hata: 'bilinmeyen işlem' }, 404);
    if (!(await authAdmin(req))) return json({ hata: 'yetki' }, 401);
    if (islem === 'admin-bildirim'){
      if (!validSub(b.push)) return json({ hata: 'bildirim aboneliği yok' }, 400);
      const ap = (await store().get('adminpush', { type: 'json' })) || [];
      if (!ap.some(s => s.endpoint === b.push.endpoint)) ap.push(cleanSub(b.push));
      await store().setJSON('adminpush', ap.slice(-10));
      return json({ ok: true });
    }
    const u = await getUser(String(b.id || ''));
    if (!u) return json({ hata: 'üye bulunamadı' }, 404);
    if (islem === 'admin-onay'){
      const was = u.durum;
      u.durum = b.onay ? 'onayli' : 'red';
      if (b.onay) u.approvedAt = Date.now();
      await putUser(u);
      if (b.onay && was !== 'onayli'){
        const gone = await pushTo(u.push, { title: '✅ Üyeliğin onaylandı!', body: 'Merhaba ' + u.name + '! Artık giriş yapıp sadece oda koduyla girebilirsin.', url: '/?uye=onay', tag: 'uyelik-' + Date.now() }, origin);
        if (gone.length){ u.push = u.push.filter(s => !gone.includes(s.endpoint)); await putUser(u); }
      }
      return json({ ok: true, uye: pub(u) });
    }
    if (islem === 'admin-sil'){
      await store().delete('u/' + u.id); await store().delete('f/' + u.id);
      const k = await store().get('k/' + lowerKey(u.kadi), { type: 'json' });
      if (k && k.id === u.id) await store().delete('k/' + lowerKey(u.kadi));
      return json({ ok: true });
    }
    if (islem === 'admin-sifre'){
      // şifresini unutan üyeye yeni geçici şifre
      const yeni = String(Math.floor(100000 + Math.random() * 900000));
      u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(yeni, u.salt); await putUser(u);
      return json({ ok: true, yeni });
    }
    if (islem === 'admin-ad'){
      const n = clip(b.name, 20); if (n.length < 2) return json({ hata: 'ad kısa' }, 400);
      u.name = n; await putUser(u); return json({ ok: true, uye: pub(u) });
    }
    return json({ hata: 'bilinmeyen işlem' }, 404);
  } catch(e){
    return json({ hata: 'sunucu', detay: String(e && e.message || e).slice(0, 200) }, 500);
  }
};

export const config = { path: '/api/uye/:islem' };
