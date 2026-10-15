// Aktarma (TURN) sunucusu bilgisi. İki bilgisayar internet üzerinden doğrudan bağlanamazsa (operatör/modem engeli)
// ses ve görüntü bu sunucudan geçer. Anahtarlar Netlify ortam değişkenlerinde durur, siteye/GitHub'a yazılmaz.
// Hangisi tanımlıysa o kullanılır (ikisi de tanımlıysa ikisi birden; biri çökerse diğeri çalışır):
//   Cloudflare Realtime TURN (ayda 1.000 GB ücretsiz, kart ister):  CF_TURN_ID + CF_TURN_TOKEN
//   Metered / Open Relay (ayda 20 GB ücretsiz):                       METERED_APP (ör. "oyunodasi") + METERED_KEY
//   GET /api/turn → { iceServers: [...], kaynak: 'cloudflare,metered' | 'yok' }
let onbellek = null;            // { veri, bitis }  (sıcak fonksiyonda aynı bilgiyi 6 saat tekrar kullan)
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const sure = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('zaman aşımı')), ms))]);
// 53. port adresleri tarayıcıda zaman aşımına düşer: çıkar
const temizle = list => [].concat(list || []).map(s => Object.assign({}, s, { urls: [].concat(s.urls || []).filter(u => !/:53(\?|$)/.test(u)) })).filter(s => s.urls.length);

async function cloudflare(){
  const id = (process.env.CF_TURN_ID || '').trim(), token = (process.env.CF_TURN_TOKEN || '').trim();
  if (!id || !token) return null;
  const r = await sure(fetch('https://rtc.live.cloudflare.com/v1/turn/keys/' + encodeURIComponent(id) + '/credentials/generate-ice-servers', {
    method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ ttl: 86400 })
  }), 4000);
  if (!r.ok) return null;
  const d = await r.json();
  return temizle(d.iceServers);
}
async function metered(){
  const app = (process.env.METERED_APP || '').trim().replace(/\.metered\.live.*$/, '').replace(/^https?:\/\//, ''), key = (process.env.METERED_KEY || '').trim();
  if (!app || !key || !/^[a-z0-9-]+$/i.test(app)) return null;
  const r = await sure(fetch('https://' + app + '.metered.live/api/v1/turn/credentials?apiKey=' + encodeURIComponent(key)), 4000);
  if (!r.ok) return null;
  const d = await r.json();
  return temizle(Array.isArray(d) ? d : d.iceServers);
}

export default async () => {
  if (onbellek && onbellek.bitis > Date.now()) return json(onbellek.veri);
  const [cf, mt] = await Promise.all([cloudflare().catch(() => null), metered().catch(() => null)]);
  const iceServers = [].concat(cf || [], mt || []), kaynak = [cf && cf.length ? 'cloudflare' : '', mt && mt.length ? 'metered' : ''].filter(Boolean).join(',') || 'yok';
  const veri = { iceServers, kaynak };
  if (iceServers.length) onbellek = { veri, bitis: Date.now() + 6 * 3600e3 };
  return json(veri);
};

export const config = { path: '/api/turn' };
