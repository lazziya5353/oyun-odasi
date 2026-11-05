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
    foto: u.foto ? '/api/uye/foto?id=' + u.id + '&v=' + u.foto : null, lastSeen: u.lastSeen || null, gizliOda: !!u.gizliOda, kodsuz: !!u.kodsuz,
    bio: u.bio || '', bildirim: bildirimAyar(u) };
}
// bildirim ayarı: gonder (oda açınca başkalarına bildirim gitsin mi), kime (herkes | secili), secili (kullanıcı adları), al (başkalarının oda bildirimini alayım mı)
function bildirimAyar(u){
  const a = u.bildirimAyar || {};
  return { gonder: a.gonder !== false, kime: a.kime === 'secili' ? 'secili' : 'herkes', secili: Array.isArray(a.secili) ? a.secili : [], al: a.al !== false };
}
const ostore = name => (globalThis.__oyunOdasiTestStore ? globalThis.__oyunOdasiTestStore(name) : getStore({ name, consistency: 'strong' }));
async function getUser(id){ return id ? store().get('u/' + id, { type: 'json' }) : null; }
async function putUser(u){ await store().setJSON('u/' + u.id, u); }
async function authUser(req){
  const h = req.headers.get('authorization') || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t || t.length > 100) return null;
  const s = await store().get('s/' + sha(t), { type: 'json' });
  if (!s || s.exp < Date.now()) return null;
  const u = await getUser(s.id);
  // sv: yönetici "oturumlarını kapat" deyince artar, eski oturumlar geçersiz olur
  return u && u.durum === 'onayli' && (s.sv || 0) === (u.sv || 0) ? u : null;
}
// yönetici işlem geçmişi (son 150 kayıt)
async function logAdmin(text){
  try {
    const st = store();
    const l = (await st.get('log', { type: 'json' })) || [];
    l.unshift({ at: Date.now(), t: clip(text, 160) });
    await st.setJSON('log', l.slice(0, 150));
  } catch(e){}
}
// yönetici şifresi: ortam değişkeni > panelden değiştirilen > varsayılan
async function adminHash(){
  if (process.env.ADMIN_SIFRE) return { kaynak: 'env', hash: hashPw(process.env.ADMIN_SIFRE.trim(), ADMIN_SALT) };
  const o = await store().get('adminpw', { type: 'json' });
  if (o && o.hash) return { kaynak: 'panel', hash: o.hash, salt: o.salt };
  return { kaynak: 'varsayilan', hash: DEFAULT_ADMIN };
}
// şaka efektleri: yönetici paneline imzalı "bilet" verilir, odadaki oda sahibi bunu açık anahtarla doğrular
async function sakaKey(){
  const st = vstore();
  let k = await st.get('sakakey', { type: 'json' });
  if (k) return k;
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  await st.setJSON('sakakey', { pub: publicKey.export({ format: 'jwk' }), priv: privateKey.export({ format: 'jwk' }) }, { onlyIfNew: true });
  return st.get('sakakey', { type: 'json' });
}
async function checkAdminPw(pw){
  const h = await adminHash();
  return same(hashPw(String(pw || '').trim(), h.salt || ADMIN_SALT), h.hash);
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


// ---------- arkadaşlar, davetler, ilerleme (seviye/rozet) ----------
const ark = u => { u.arkadas = u.arkadas || []; u.istekGelen = u.istekGelen || []; u.istekGiden = u.istekGiden || []; return u; };
async function userByKadi(k){ const ex = await store().get('k/' + lowerKey(clip(k, 20)), { type: 'json' }); const u = ex && await getUser(ex.id); return u && u.durum === 'onayli' ? u : null; }
const kisa = u => ({ kadi: u.kadi, name: u.name, foto: u.foto ? '/api/uye/foto?id=' + u.id + '&v=' + u.foto : null, lv: seviye((u.ilerleme || {}).xp || 0) });
// çevrimiçi durumu: canlı durum kaydından (oda.mjs) okunur; oda kodu gösterilmez
async function canliDurum(){
  try {
    const d = await ostore('oyunodasi-varlik').get('durum', { type: 'json' });
    const now = Date.now(), m = {};
    for (const c of Object.values((d && d.canli) || {})){
      if (!c.uye || c.kapali || now - c.son > 150e3) continue;
      const k = lowerKey(c.uye), o = m[k] || (m[k] = { cevrimici: true, odada: false });
      if (c.kod && !(d.odalar && d.odalar[c.kod] && d.odalar[c.kod].gizli)) o.odada = true;
    }
    return m;
  } catch(e){ return {}; }
}
// seviye: L seviyesine çıkmak için toplam 25·L·(L-1) puan
const seviye = xp => { let l = 1; while (25 * (l + 1) * l <= xp && l < 99) l++; return l; };
function ilerlemeEkle(u, b){
  const g = u.ilerleme = u.ilerleme || { xp: 0, dk: 0, gece: 0, oda: 0, ekran: 0, ikram: 0, oyun: {}, gunler: 0, sonGun: '', enUzun: 0 };
  const now = Date.now(), gecen = Math.max(1, Math.ceil((now - (g.sonRapor || 0)) / 60e3) + 1);
  const n = (v, max) => Math.max(0, Math.min(max, Math.floor(+v || 0)));
  const dk = n(b.dk, Math.min(gecen, 30)), gece = n(b.gece, dk), oda = n(b.oda, 3), ekran = n(b.ekran, 5), ikram = n(b.ikram, 20);
  g.sonRapor = now;
  let xp = dk;
  g.dk += dk; g.gece += gece; g.oda += oda; g.ekran += ekran; g.ikram += ikram;
  xp += oda * 5 + ekran * 5 + ikram * 2;
  if (b.oyun && typeof b.oyun === 'object'){
    for (const [k, v] of Object.entries(b.oyun).slice(0, 20)){
      if (!/^[a-z0-9]{2,16}$/.test(k) || !Array.isArray(v)) continue;
      const o = n(v[0], 10), w = n(v[1], Math.min(o, 10));
      const x = g.oyun[k] = g.oyun[k] || [0, 0];
      x[0] += o; x[1] += w; xp += o * 3 + w * 15;
    }
  }
  if (dk){
    const gun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date(now));
    if (g.sonGun !== gun){ g.sonGun = gun; g.gunler++; }
  }
  g.enUzun = Math.max(g.enUzun || 0, n(b.oturum, 24 * 60));
  g.xp += xp;
  return g;
}
const ilerlemePub = u => { const g = Object.assign({ xp: 0, dk: 0, gece: 0, oda: 0, ekran: 0, ikram: 0, oyun: {}, gunler: 0, enUzun: 0 }, u.ilerleme || {}); return Object.assign({}, g, { sonRapor: undefined, lv: seviye(g.xp || 0), arkadas: (u.arkadas || []).length }); };

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
      if (u && Date.now() - (u.lastSeen || 0) > 10 * 60e3){ u.lastSeen = Date.now(); await putUser(u); }
      if (!u) return json({ hata: 'oturum yok' }, 401);
      const dv = (u.davetler || []).filter(x => Date.now() - x.ts < 30 * 60e3);
      return json({ uye: pub(u), ilerleme: ilerlemePub(u), davetler: dv, istekSayisi: (u.istekGelen || []).length });
    }
    if (req.method === 'GET' && islem === 'arkadaslar'){
      const u = await authUser(req); if (!u) return json({ hata: 'oturum yok' }, 401);
      ark(u);
      const canli = await canliDurum();
      const liste = async ids => (await Promise.all(ids.map(getUser))).filter(x => x && x.durum === 'onayli').map(x => Object.assign(kisa(x), canli[lowerKey(x.kadi)] || { cevrimici: false, odada: false }));
      const arkadaslar = (await liste(u.arkadas)).sort((a, b) => (b.odada - a.odada) || (b.cevrimici - a.cevrimici) || a.name.localeCompare(b.name, 'tr'));
      return json({ arkadaslar, gelen: await liste(u.istekGelen), giden: await liste(u.istekGiden) });
    }
    if (req.method === 'GET' && islem === 'uye-listesi'){
      // bildirim gönderilecek kişileri seçmek için: onaylı üyelerin kullanıcı adı ve görünen adı
      const u = await authUser(req); if (!u) return json({ hata: 'oturum yok' }, 401);
      const us = await allUsers();
      return json({ uyeler: us.filter(x => x.durum === 'onayli' && x.id !== u.id).map(x => ({ kadi: x.kadi, name: x.name })).sort((a, b) => a.name.localeCompare(b.name, 'tr')) });
    }
    if (req.method === 'GET' && islem === 'admin-detay'){
      // bir kişinin profili: üyelik bilgisi, sitede/odalarda geçirdiği süre, giriş-çıkış geçmişi, hareketleri
      if (!(await authAdmin(req))) return json({ hata: 'yetki' }, 401);
      const kadi = clip(url.searchParams.get('kadi'), 20), misafir = clip(url.searchParams.get('misafir'), 20);
      let u = null, anahtar = '';
      if (kadi){
        const ex = await store().get('k/' + lowerKey(kadi), { type: 'json' });
        u = ex && await getUser(ex.id);
        if (!u) return json({ hata: 'üye bulunamadı' }, 404);
        anahtar = 'u:' + lowerKey(u.kadi);
      } else if (misafir) anahtar = 'm:' + lowerKey(misafir);
      else return json({ hata: 'kişi yok' }, 400);
      const vr = await ostore('oyunodasi-varlik').get('durum', { type: 'json' });
      const kisi = vr && vr.kisiler && vr.kisiler[anahtar] || null;
      const canli = vr && vr.canli ? Object.values(vr.canli).filter(c => c.anahtar === anahtar && !c.kapali && Date.now() - c.son < 150e3).sort((a, b) => b.son - a.son)[0] : null;
      const hr = await ostore('oyunodasi-hareket').get('son', { type: 'json' });
      const ad = u ? u.name : misafir;
      const hareket = ((hr && hr.liste) || []).filter(x => u ? (x.kadi ? x.kadi === lowerKey(u.kadi) : (x.uye && x.ad === u.name)) : (!x.uye && x.ad === misafir)).slice(0, 120);
      return json({
        uye: u ? Object.assign(pub(u), { bildirimCihaz: (u.push || []).length }) : null, ad, anahtar,
        kisi: kisi ? { ilk: kisi.ilk, son: kisi.son, cihaz: kisi.cihaz, siteMs: kisi.siteMs || 0, odaMs: kisi.odaMs || 0, girisler: kisi.girisler || 0, odalar: kisi.odalar || {}, gecmis: kisi.gecmis || [] } : null,
        canli: canli ? { kod: canli.kod, giris: canli.giris, cihaz: canli.cihaz } : null, simdi: Date.now(), hareket
      });
    }
    if (req.method === 'GET' && islem === 'admin-liste'){
      if (!(await authAdmin(req))) return json({ hata: 'yetki' }, 401);
      const us = await allUsers();
      const ap = (await store().get('adminpush', { type: 'json' })) || [];
      return json({ uyeler: us.map(u => Object.assign(pub(u), { bildirim: (u.push || []).length > 0 })), adminBildirim: ap.length });
    }
    if (req.method === 'GET' && islem === 'saka-anahtar'){
      const k = await sakaKey();
      return json({ jwk: { kty: k.pub.kty, crv: k.pub.crv, x: k.pub.x, y: k.pub.y } });
    }
    if (req.method === 'GET' && islem === 'saka-ayar'){
      // herkesin birbirine şaka yapma ayarları (yönetim panelinden değişir)
      const a = (await store().get('sakaayar', { type: 'json' })) || {};
      return json({ acik: a.acik !== false, kapali: a.kapali || [], engel: a.engel || [], bekleme: a.bekleme == null ? 5 : a.bekleme });
    }
    if (req.method === 'POST' && islem === 'saka-dogrula'){
      // yedek doğrulama: tarayıcı imzayı kendisi doğrulayamazsa sunucuya sorar
      const b = await req.json().catch(() => ({}));
      const exp = Number(b.exp), sig = String(b.sig || '');
      if (!(exp > Date.now()) || sig.length > 200) return json({ ok: false });
      const k = await sakaKey();
      let ok = false;
      try { ok = crypto.verify('sha256', Buffer.from('oyunodasi-saka-v1|' + exp), { key: crypto.createPublicKey({ key: k.pub, format: 'jwk' }), dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url')); } catch(e){}
      return json({ ok });
    }
    if (req.method === 'GET' && islem === 'admin-gunluk'){
      if (!(await authAdmin(req))) return json({ hata: 'yetki' }, 401);
      const rl = (await store().get('rl/admin', { type: 'json' })) || { f: [] };
      return json({ log: (await store().get('log', { type: 'json' })) || [], hataliDeneme: rl.f.filter(t => Date.now() - t < 864e5).length, sifreKaynak: (await adminHash()).kaynak });
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
      if (u.durum === 'askida') return json({ hata: 'Hesabın yönetici tarafından geçici olarak durduruldu.', durum: 'askida' }, 403);
      const t = token();
      await store().setJSON('s/' + sha(t), { id: u.id, sv: u.sv || 0, exp: Date.now() + SESSION_DAYS * 864e5 });
      u.lastSeen = Date.now(); await putUser(u);
      if (validSub(b.push) && !(u.push || []).some(s => s.endpoint === b.push.endpoint)){ u.push = (u.push || []).concat(cleanSub(b.push)).slice(-5); await putUser(u); }
      return json({ ok: true, token: t, uye: pub(u) });
    }
    if (islem === 'cikis'){
      const h = req.headers.get('authorization') || '';
      if (h.startsWith('Bearer ')) await store().delete('s/' + sha(h.slice(7)));
      return json({ ok: true });
    }
    // ---------- arkadaşlık ----------
    if (islem === 'arkadas-ekle' || islem === 'arkadas-cevap' || islem === 'arkadas-sil'){
      const u = await authUser(req); if (!u) return json({ hata: 'Arkadaş eklemek için giriş yapmalısın.' }, 401);
      const o = await userByKadi(b.kadi);
      if (!o) return json({ hata: 'Bu kullanıcı adıyla bir üye bulunamadı.' }, 404);
      if (o.id === u.id) return json({ hata: 'Kendini ekleyemezsin 🙂' }, 400);
      ark(u); ark(o);
      const cik = (l, id) => l.filter(x => x !== id);
      let durum = '';
      if (islem === 'arkadas-sil'){
        u.arkadas = cik(u.arkadas, o.id); o.arkadas = cik(o.arkadas, u.id);
        u.istekGiden = cik(u.istekGiden, o.id); o.istekGelen = cik(o.istekGelen, u.id);
        u.istekGelen = cik(u.istekGelen, o.id); o.istekGiden = cik(o.istekGiden, u.id);
        durum = 'silindi';
      } else if (u.arkadas.includes(o.id)) durum = 'zaten';
      else if (islem === 'arkadas-cevap' || u.istekGelen.includes(o.id)){
        // gelen isteğe cevap (ya da karşı taraf zaten istek göndermiş: ekleyince kabul sayılır)
        if (!u.istekGelen.includes(o.id)) return json({ hata: 'Bu kişiden gelen bir istek yok.' }, 400);
        u.istekGelen = cik(u.istekGelen, o.id); o.istekGiden = cik(o.istekGiden, u.id);
        if (islem === 'arkadas-cevap' && !b.kabul) durum = 'reddedildi';
        else {
          u.arkadas = [...new Set(u.arkadas.concat(o.id))].slice(-300); o.arkadas = [...new Set(o.arkadas.concat(u.id))].slice(-300);
          durum = 'arkadas';
          const gone = await pushTo(o.push, { title: '🤝 ' + u.name + ' arkadaşlık isteğini kabul etti', body: 'Artık arkadaşsınız. Oda açınca birbirinizi davet edebilirsiniz.', url: '/?arkadas=1', tag: 'ark-' + u.id }, origin);
          if (gone.length) o.push = o.push.filter(s => !gone.includes(s.endpoint));
        }
      } else {
        if (u.istekGiden.includes(o.id)) durum = 'bekliyor';
        else {
          if (u.istekGiden.length >= 100) return json({ hata: 'Çok fazla bekleyen isteğin var.' }, 429);
          u.istekGiden.push(o.id); o.istekGelen = [...new Set(o.istekGelen.concat(u.id))].slice(-100);
          durum = 'gonderildi';
          const gone = await pushTo(o.push, { title: '👥 Arkadaşlık isteği', body: u.name + ' (@' + u.kadi + ') seni arkadaş olarak eklemek istiyor.', url: '/?arkadas=1', tag: 'ark-' + u.id }, origin);
          if (gone.length) o.push = o.push.filter(s => !gone.includes(s.endpoint));
        }
      }
      await putUser(u); await putUser(o);
      return json({ ok: true, durum, kisi: kisa(o) });
    }
    if (islem === 'davet'){
      const u = await authUser(req); if (!u) return json({ hata: 'oturum yok' }, 401);
      const kod = clip(b.kod, 12).toUpperCase().replace(/[^A-Z0-9ÇĞİÖŞÜ-]/g, '');
      if (kod.length < 3) return json({ hata: 'oda kodu' }, 400);
      ark(u);
      const hedef = Array.isArray(b.kadiler) ? b.kadiler.slice(0, 50) : [];
      let n = 0;
      for (const k of hedef){
        const o = await userByKadi(k);
        if (!o || !u.arkadas.includes(o.id)) continue;
        o.davetler = (o.davetler || []).filter(x => Date.now() - x.ts < 30 * 60e3 && !(x.kadi === u.kadi && x.kod === kod)).concat({ kadi: u.kadi, name: u.name, kod, ts: Date.now() }).slice(-5);
        const gone = await pushTo(o.push, { title: '📨 ' + u.name + ' seni odaya çağırıyor', body: 'Dokun, doğrudan ' + kod + ' odasına gir.', url: '/?oda=' + encodeURIComponent(kod) + '&davet=1', tag: 'davet-' + u.id }, origin);
        if (gone.length) o.push = o.push.filter(s => !gone.includes(s.endpoint));
        await putUser(o); n++;
      }
      return json({ ok: true, gonderilen: n });
    }
    if (islem === 'davet-sil'){
      const u = await authUser(req); if (!u) return json({ hata: 'oturum yok' }, 401);
      u.davetler = (u.davetler || []).filter(x => !(x.kadi === b.kadi && x.kod === b.kod)); await putUser(u);
      return json({ ok: true });
    }
    if (islem === 'ilerleme'){
      // sendBeacon başlık gönderemez: oturum anahtarı gövdede de gelebilir
      let u = await authUser(req);
      if (!u && typeof b.token === 'string' && b.token.length < 100){
        const s2 = await store().get('s/' + sha(b.token), { type: 'json' });
        const u2 = s2 && s2.exp > Date.now() && await getUser(s2.id);
        if (u2 && u2.durum === 'onayli' && (s2.sv || 0) === (u2.sv || 0)) u = u2;
      }
      if (!u) return json({ hata: 'oturum yok' }, 401);
      ilerlemeEkle(u, b); await putUser(u);
      return json({ ok: true, ilerleme: ilerlemePub(u) });
    }
    if (islem === 'profil'){
      const u = await authUser(req); if (!u) return json({ hata: 'oturum yok' }, 401);
      if (b.name !== undefined){ const n = clip(b.name, 20); if (n.length < 2) return json({ hata: 'Görünen ad en az 2 harf olmalı.' }, 400); u.name = n; }
      if (b.bio !== undefined) u.bio = clip(b.bio, 200);
      if (b.bildirim && typeof b.bildirim === 'object'){
        const x = b.bildirim;
        u.bildirimAyar = {
          gonder: x.gonder !== false, kime: x.kime === 'secili' ? 'secili' : 'herkes', al: x.al !== false,
          secili: Array.isArray(x.secili) ? [...new Set(x.secili.map(k => lowerKey(clip(k, 20))).filter(Boolean))].slice(0, 100) : []
        };
      }
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
      const ok = await checkAdminPw(b.sifre);   // baştaki/sondaki boşluk önemsiz
      await adminLimit(ok);
      if (!ok) return json({ hata: 'Şifre yanlış.' }, 401);
      const t = token();
      await store().setJSON('a/' + sha(t), { exp: Date.now() + ADMIN_HOURS * 3600e3 });
      await logAdmin('Yönetici girişi yapıldı');
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
    if (islem === 'admin-saka-bilet'){
      const k = await sakaKey();
      const exp = Date.now() + ADMIN_HOURS * 3600e3;
      const key = crypto.createPrivateKey({ key: k.priv, format: 'jwk' });
      const sig = crypto.sign('sha256', Buffer.from('oyunodasi-saka-v1|' + exp), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
      return json({ ok: true, exp, sig });
    }
    if (islem === 'admin-saka-ayar'){
      const a = {
        acik: b.acik !== false,
        kapali: Array.isArray(b.kapali) ? b.kapali.filter(x => typeof x === 'string' && /^[a-z]{2,12}$/.test(x)).slice(0, 60) : [],
        engel: Array.isArray(b.engel) ? [...new Set(b.engel.map(x => clip(x, 20).toLocaleLowerCase('tr-TR')).filter(Boolean))].slice(0, 100) : [],
        bekleme: [0, 3, 5, 10, 30, 60, 300].includes(Number(b.bekleme)) ? Number(b.bekleme) : 5
      };
      const old = (await store().get('sakaayar', { type: 'json' })) || {};
      await store().setJSON('sakaayar', a);
      const notes = [];
      if ((old.acik !== false) !== a.acik) notes.push(a.acik ? 'şakalar açıldı' : 'şakalar kapatıldı');
      const ne = a.engel.filter(x => !(old.engel || []).includes(x)), ce = (old.engel || []).filter(x => !a.engel.includes(x));
      if (ne.length) notes.push('engellendi: ' + ne.join(', '));
      if (ce.length) notes.push('engel kalktı: ' + ce.join(', '));
      if ((old.bekleme == null ? 5 : old.bekleme) !== a.bekleme) notes.push('bekleme ' + a.bekleme + ' sn');
      if (JSON.stringify(old.kapali || []) !== JSON.stringify(a.kapali)) notes.push('kapalı efektler: ' + (a.kapali.join(', ') || 'yok'));
      await logAdmin('Kullanıcı şakaları: ' + (notes.join(' · ') || 'kaydedildi'));
      return json({ ok: true, ayar: a });
    }
    if (islem === 'admin-sifre-degis'){
      if (process.env.ADMIN_SIFRE) return json({ hata: 'Şifre Netlify ayarlarından (ADMIN_SIFRE) belirlenmiş; oradan değiştir.' }, 400);
      if (!(await checkAdminPw(b.eski))) return json({ hata: 'Mevcut şifre yanlış.' }, 400);
      const yeni = String(b.yeni || '').trim();
      if (yeni.length < 8 || yeni.length > 100) return json({ hata: 'Yeni şifre en az 8 karakter olmalı.' }, 400);
      const salt = crypto.randomBytes(16).toString('hex');
      await store().setJSON('adminpw', { salt, hash: hashPw(yeni, salt), at: Date.now() });
      // bu cihaz hariç diğer yönetici oturumlarını kapat
      const mine = 'a/' + sha(req.headers.get('x-admin') || '');
      const { blobs } = await store().list({ prefix: 'a/' });
      for (const x of blobs) if (x.key !== mine) await store().delete(x.key);
      await logAdmin('Yönetici şifresi değiştirildi (diğer yönetici oturumları kapatıldı)');
      return json({ ok: true });
    }
    const u = await getUser(String(b.id || ''));
    if (!u) return json({ hata: 'üye bulunamadı' }, 404);
    if (islem === 'admin-onay'){
      const was = u.durum;
      u.durum = b.onay ? 'onayli' : 'red';
      if (b.onay && was !== 'askida') u.approvedAt = Date.now();
      await putUser(u);
      await logAdmin((b.onay ? (was === 'askida' ? 'Hesap yeniden açıldı: ' : 'Onaylandı: ') : 'Reddedildi: ') + u.adSoyad + ' (@' + u.kadi + ')');
      if (b.onay && (was === 'bekliyor' || was === 'red')){
        const gone = await pushTo(u.push, { title: '✅ Üyeliğin onaylandı!', body: 'Merhaba ' + u.name + '! Artık giriş yapıp sadece oda koduyla girebilirsin.', url: '/?uye=onay', tag: 'uyelik-' + Date.now() }, origin);
        if (gone.length){ u.push = u.push.filter(s => !gone.includes(s.endpoint)); await putUser(u); }
      }
      return json({ ok: true, uye: pub(u) });
    }
    if (islem === 'admin-sil'){
      await store().delete('u/' + u.id); await store().delete('f/' + u.id);
      const k = await store().get('k/' + lowerKey(u.kadi), { type: 'json' });
      if (k && k.id === u.id) await store().delete('k/' + lowerKey(u.kadi));
      await logAdmin('Silindi: ' + u.adSoyad + ' (@' + u.kadi + ')');
      return json({ ok: true });
    }
    if (islem === 'admin-sifre'){
      // şifresini unutan üyeye yeni geçici şifre
      const yeni = String(Math.floor(100000 + Math.random() * 900000));
      u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(yeni, u.salt); u.sv = (u.sv || 0) + 1; await putUser(u);
      await logAdmin('Şifre sıfırlandı: ' + u.adSoyad + ' (@' + u.kadi + ')');
      return json({ ok: true, yeni });
    }
    if (islem === 'admin-ad'){
      const n = clip(b.name, 20); if (n.length < 2) return json({ hata: 'ad kısa' }, 400);
      const old = u.name; u.name = n; await putUser(u);
      await logAdmin('Ad değişti: ' + old + ' → ' + n + ' (@' + u.kadi + ')');
      return json({ ok: true, uye: pub(u) });
    }
    if (islem === 'admin-gizli'){
      // gizli oda açma yetkisi: açtığı oda bildirim göndermez, açık odalar listesinde görünmez
      if (u.durum !== 'onayli') return json({ hata: 'sadece üyelere verilebilir' }, 400);
      u.gizliOda = !!b.acik; await putUser(u);
      await logAdmin((b.acik ? 'Gizli oda yetkisi verildi: ' : 'Gizli oda yetkisi kaldırıldı: ') + u.adSoyad + ' (@' + u.kadi + ')');
      return json({ ok: true, uye: pub(u) });
    }
    if (islem === 'admin-kodsuz'){
      // açık odalara kod sormadan ve onay beklemeden girme yetkisi (yöneticinin kendi üyeliği için)
      if (u.durum !== 'onayli') return json({ hata: 'sadece üyelere verilebilir' }, 400);
      u.kodsuz = !!b.acik; await putUser(u);
      await logAdmin((b.acik ? 'Kodsuz giriş yetkisi verildi: ' : 'Kodsuz giriş yetkisi kaldırıldı: ') + u.adSoyad + ' (@' + u.kadi + ')');
      return json({ ok: true, uye: pub(u) });
    }
    if (islem === 'admin-askiya'){
      // hesabı geçici durdur (giriş yapamaz, açık oturumları kapanır) ya da geri aç
      if (b.askida){ if (u.durum !== 'onayli') return json({ hata: 'sadece üyeler durdurulabilir' }, 400); u.durum = 'askida'; u.sv = (u.sv || 0) + 1; }
      else { if (u.durum !== 'askida') return json({ hata: 'hesap durdurulmamış' }, 400); u.durum = 'onayli'; }
      await putUser(u);
      await logAdmin((b.askida ? 'Hesap durduruldu: ' : 'Hesap yeniden açıldı: ') + u.adSoyad + ' (@' + u.kadi + ')');
      return json({ ok: true, uye: pub(u) });
    }
    if (islem === 'admin-oturum-kapat'){
      u.sv = (u.sv || 0) + 1; await putUser(u);
      await logAdmin('Tüm cihazlardan çıkış yaptırıldı: ' + u.adSoyad + ' (@' + u.kadi + ')');
      return json({ ok: true });
    }
    return json({ hata: 'bilinmeyen işlem' }, 404);
  } catch(e){
    return json({ hata: 'sunucu', detay: String(e && e.message || e).slice(0, 200) }, 500);
  }
};

export const config = { path: '/api/uye/:islem' };
