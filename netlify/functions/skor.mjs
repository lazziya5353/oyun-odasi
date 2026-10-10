// Tekli oyunların skor tabloları (Netlify Function). Kalıcıdır, oda kapansa da durur.
//   GET  /api/skor/tablo?game=sudoku&level=orta   → { donem: 'gun'|'hafta', key, top: [...], tum: [...] }
//   POST /api/skor/gonder { game, level, name, score, day }  → { rank: {donem, tum}, best, record, ... }
// Her tabloda her isim için yalnız en iyi sonuç tutulur (ilk 100).
import { getStore } from '../lib/blobs.mjs';

const store = name => (globalThis.__oyunOdasiTestStore ? globalThis.__oyunOdasiTestStore(name) : getStore({ name, consistency: 'strong' }));
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clip = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

// oyunlar: hangi yön iyi, günlük mü, seviyeler, makul skor aralığı (hile/yanlışlık koruması)
const GAMES = {
  sudoku: { better: 'low', daily: true, levels: ['kolay', 'orta', 'zor'], min: 25, max: 36000 },
  kelime: { better: 'low', daily: true, levels: [''], min: 1003, max: 6999 },
  yapboz: { better: 'low', daily: false, levels: ['kolay', 'orta', 'zor'], min: 6, max: 36000 },
  kosu: { better: 'high', daily: false, levels: [''], min: 1, max: 5000000 }
};
const TOP = 100;

function istanbulDay(d = new Date()){ return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(d); }
function isoWeek(day){
  const d = new Date(day + 'T12:00:00Z');
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const wd = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - wd);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return t.getUTCFullYear() + '-H' + String(Math.ceil(((t - y0) / 864e5 + 1) / 7)).padStart(2, '0');
}
const better = (g, a, b) => g.better === 'low' ? a < b : a > b;
const sortBoard = (g, list) => list.sort((a, b) => (g.better === 'low' ? a.score - b.score : b.score - a.score) || a.ts - b.ts);
const nameKey = n => n.toLocaleLowerCase('tr-TR');

async function readBoard(key){
  const r = await store('oyunodasi-skor').getWithMetadata(key, { type: 'json' });
  return { list: (r && r.data && r.data.list) || [], etag: r && r.etag };
}
// tabloya sonucu işle; çakışırsa yeniden dene
async function submit(g, key, entry){
  const st = store('oyunodasi-skor');
  for (let i = 0; i < 6; i++){
    const { list, etag } = await readBoard(key);
    const k = nameKey(entry.name);
    const cur = list.find(e => nameKey(e.name) === k);
    let improved = false;
    if (!cur){ list.push(entry); improved = true; }
    else if (better(g, entry.score, cur.score)){ Object.assign(cur, entry); improved = true; }
    sortBoard(g, list);
    const trimmed = list.slice(0, TOP);
    const rank = trimmed.findIndex(e => nameKey(e.name) === k);
    const best = (cur && !improved) ? cur.score : entry.score;
    if (!improved) return { rank: rank >= 0 ? rank + 1 : null, best, improved };
    const w = await st.setJSON(key, { list: trimmed }, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    if (!w || w.modified !== false) return { rank: rank >= 0 ? rank + 1 : null, best, improved };
    await new Promise(r => setTimeout(r, 60 + Math.random() * 160));
  }
  throw new Error('meşgul');
}
function keysFor(g, game, level, day){
  const lv = level || '-';
  return { donem: g.daily ? 'gun' : 'hafta', pkey: game + '/' + lv + '/' + (g.daily ? 'gun-' + day : 'hafta-' + isoWeek(day)), tkey: game + '/' + lv + '/tum' };
}
const pub = l => l.slice(0, 20).map(e => ({ name: e.name, score: e.score, ts: e.ts }));

export default async (req, context) => {
  const url = new URL(req.url);
  const islem = (context && context.params && context.params.islem) || url.pathname.split('/').pop();
  try {
    if (req.method === 'GET' && islem === 'tablo'){
      const game = url.searchParams.get('game') || '', level = url.searchParams.get('level') || '';
      const g = GAMES[game];
      if (!g || !g.levels.includes(level)) return json({ hata: 'oyun' }, 400);
      const day = istanbulDay();
      const k = keysFor(g, game, level, day);
      const [p, t] = await Promise.all([readBoard(k.pkey), readBoard(k.tkey)]);
      return json({ donem: k.donem, day, top: pub(p.list), tum: pub(t.list) });
    }
    if (req.method === 'POST' && islem === 'gonder'){
      const b = await req.json().catch(() => ({}));
      const g = GAMES[b.game];
      const level = String(b.level || '');
      if (!g || !g.levels.includes(level)) return json({ hata: 'oyun' }, 400);
      const name = clip(b.name, 20);
      if (!name) return json({ hata: 'isim' }, 400);
      const score = Math.round(Number(b.score));
      if (!Number.isFinite(score) || score < g.min || score > g.max) return json({ hata: 'skor geçersiz' }, 400);
      // günlük oyunlarda gün, sunucunun bugünü (ya da gece yarısı geçişi için dün) olmalı
      const today = istanbulDay(), yday = istanbulDay(new Date(Date.now() - 864e5));
      const day = g.daily ? (b.day === today || b.day === yday ? b.day : null) : today;
      if (!day) return json({ hata: 'gün eski' }, 400);
      const k = keysFor(g, b.game, level, day);
      const entry = { name, score, ts: Date.now() };
      const tumPrev = (await readBoard(k.tkey)).list;
      const prevTop = tumPrev.length ? tumPrev[0] : null;
      const rp = await submit(g, k.pkey, entry);
      const rt = await submit(g, k.tkey, entry);
      const record = rt.improved && rt.rank === 1 && (!prevTop || better(g, score, prevTop.score));
      return json({ ok: true, donem: k.donem, rank: { donem: rp.rank, tum: rt.rank }, best: rt.best, improved: rt.improved, record });
    }
    return json({ hata: 'bilinmeyen işlem' }, 404);
  } catch(e){
    return json({ hata: 'sunucu', detay: String(e && e.message || e).slice(0, 200) }, 500);
  }
};

export const config = { path: '/api/skor/:islem' };
