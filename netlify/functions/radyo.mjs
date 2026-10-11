// Radyo arama yedeği: tarayıcı Radio Browser sunucularına doğrudan ulaşamazsa (sunucu çökük, ağ engeli, CORS)
// bu fonksiyon aynı aramayı Netlify üzerinden yapar. Sonuç 10 dk önbellekte tutulur.
//   GET /api/radyo/ara?name=kral&cc=TR
const SABIT = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info', 'https://fi1.api.radio-browser.info', 'https://at1.api.radio-browser.info', 'https://nl1.api.radio-browser.info'];
let bulunan = null, bulunmaZamani = 0;

async function zamanli(url, ms){
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal, headers: { 'user-agent': 'OyunOdasi/1.0' } }); if (!r.ok) throw new Error('durum ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function sunucular(){
  if (bulunan && Date.now() - bulunmaZamani < 3600e3) return bulunan;
  try {
    const l = await zamanli('https://all.api.radio-browser.info/json/servers', 4000);
    const adlar = [...new Set((Array.isArray(l) ? l : []).map(s => s && s.name).filter(n => typeof n === 'string' && /^[a-z0-9.-]+\.radio-browser\.info$/i.test(n)))];
    if (adlar.length){ bulunan = [...new Set(adlar.map(n => 'https://' + n).concat(SABIT))]; bulunmaZamani = Date.now(); return bulunan; }
  } catch(e){}
  return SABIT;
}

export default async (req) => {
  const u = new URL(req.url);
  const name = (u.searchParams.get('name') || '').slice(0, 60);
  const cc = (u.searchParams.get('cc') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  const p = new URLSearchParams({ limit: '150', hidebroken: 'true', order: 'clickcount', reverse: 'true' });
  if (name) p.set('name', name);
  if (cc) p.set('countrycode', cc);
  const hosts = await sunucular();
  try {
    const res = await Promise.any(hosts.map(h => zamanli(h + '/json/stations/search?' + p, 6000)));
    const liste = (Array.isArray(res) ? res : []).map(s => ({
      name: s.name, url_resolved: s.url_resolved, favicon: s.favicon, tags: s.tags, bitrate: s.bitrate, country: s.country
    }));
    return new Response(JSON.stringify(liste), { headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'netlify-cdn-cache-control': 'public, s-maxage=600, stale-while-revalidate=3600'
    } });
  } catch(e){
    return new Response(JSON.stringify({ hata: 'radyo dizinine ulaşılamadı' }), { status: 502, headers: { 'content-type': 'application/json' } });
  }
};

export const config = { path: '/api/radyo/:islem' };
