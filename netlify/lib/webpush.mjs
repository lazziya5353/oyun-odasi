// Web Push gönderimi (RFC 8291 şifreleme + RFC 8292 VAPID), sadece Node'un kendi crypto modülüyle.
// Ek paket gerektirmez; bu yüzden Netlify hiçbir kurulum yapmadan çalıştırır.
import crypto from 'node:crypto';

const b64u = buf => Buffer.from(buf).toString('base64url');
const fromB64u = s => Buffer.from(String(s), 'base64url');

// Yeni VAPID anahtar çifti: { publicKey: base64url (65 bayt, sıkıştırılmamış), privateJwk }
export function makeVapidKeys(){
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' });
  const raw = Buffer.concat([Buffer.from([4]), fromB64u(jwk.x), fromB64u(jwk.y)]);
  return { publicKey: b64u(raw), privateJwk: privateKey.export({ format: 'jwk' }) };
}

function vapidHeader(endpoint, vapid, subject){
  const aud = new URL(endpoint).origin;
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }));
  const key = crypto.createPrivateKey({ key: vapid.privateJwk, format: 'jwk' });
  const sig = crypto.sign('sha256', Buffer.from(head + '.' + body), { key, dsaEncoding: 'ieee-p1363' });
  return 'vapid t=' + head + '.' + body + '.' + b64u(sig) + ', k=' + vapid.publicKey;
}

// aes128gcm içerik şifrelemesi (tek kayıt)
export function encrypt(payload, keys){
  const uaPublic = fromB64u(keys.p256dh), authSecret = fromB64u(keys.auth);
  if (uaPublic.length !== 65 || authSecret.length < 16) throw new Error('geçersiz abonelik anahtarı');
  const ecdh = crypto.createECDH('prime256v1');
  const asPublic = ecdh.generateKeys();
  const shared = ecdh.computeSecret(uaPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, authSecret, keyInfo, 32));
  const salt = crypto.randomBytes(16);
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ct = Buffer.concat([c.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, ct]);
}

// Bir aboneye bildirim gönder. Sonuç: HTTP durum kodu (201 başarılı; 404/410 abonelik artık geçersiz)
export async function sendPush(sub, payload, vapid, subject, opts = {}){
  const body = encrypt(typeof payload === 'string' ? payload : JSON.stringify(payload), sub.keys);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(opts.ttl || 3600),
      Urgency: 'high',
      ...(opts.topic ? { Topic: opts.topic } : {}),
      Authorization: vapidHeader(sub.endpoint, vapid, subject)
    },
    body
  });
  return res.status;
}
