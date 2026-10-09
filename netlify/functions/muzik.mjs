// Müzik Odası kütüphanesi (Netlify Function): yüklenen şarkılar ve playlistler kalıcı olarak burada durur.
//   GET  /api/muzik/liste                    → { songs, playlists }
//   POST /api/muzik/parca?id=..&n=..         → şarkının n. parçası (ham bayt, en fazla 3 MB)
//   GET  /api/muzik/parca?id=..&n=..         → parçayı geri ver
//   POST /api/muzik/bitir   { id, title, by, size, type, dur, chunks }   → parçalar tamamsa kütüphaneye ekle
//   POST /api/muzik/playlist { name, by }    → yeni playlist
//   POST /api/muzik/playlist-sarki { pid, sid, add }  → playlist'e şarkı ekle / çıkar
// Şarkılar silinmez (istenen bu). Kötüye kullanıma karşı sınırlar: şarkı başına 30 MB, toplam 600 şarkı / 3 GB.
import { getStore } from '../lib/blobs.mjs';

const store = name => (globalThis.__oyunOdasiTestStore ? globalThis.__oyunOdasiTestStore(name) : getStore({ name, consistency: 'strong' }));
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clip = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const CHUNK_MAX = 3 * 1024 * 1024 + 1024;
const SONG_MAX = 30 * 1024 * 1024;
const MAX_SONGS = 600, MAX_TOTAL = 3 * 1024 * 1024 * 1024, MAX_LISTS = 200, MAX_IN_LIST = 400;
const ID = /^[a-f0-9]{32}$/;

// Dizin tek bir JSON'da durur; aynı anda iki kişi yazarsa "etag" ile çakışma yakalanır ve tekrar denenir
async function readIndex(){
  const r = await store('oyunodasi-kutuphane').getWithMetadata('dizin', { type: 'json' });
  return { data: (r && r.data) || { songs: [], playlists: [] }, etag: r && r.etag };
}
async function updateIndex(fn){
  const st = store('oyunodasi-kutuphane');
  for (let i = 0; i < 6; i++){
    const { data, etag } = await readIndex();
    const res = fn(data);
    if (res && res.error) return res;
    const w = await st.setJSON('dizin', data, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    if (!w || w.modified !== false) return res || { ok: true };
    await new Promise(r => setTimeout(r, 80 + Math.random() * 200));
  }
  return { error: 'meşgul, tekrar dene', status: 503 };
}

export default async (req, context) => {
  const url = new URL(req.url);
  const islem = (context && context.params && context.params.islem) || url.pathname.split('/').pop();
  try {
    if (req.method === 'GET' && islem === 'liste'){
      const { data } = await readIndex();
      return json(data);
    }
    if (islem === 'parca'){
      const id = url.searchParams.get('id') || '', n = Number(url.searchParams.get('n'));
      if (!ID.test(id) || !Number.isInteger(n) || n < 0 || n > 20) return json({ hata: 'parça' }, 400);
      const st = store('oyunodasi-sarki');
      if (req.method === 'GET'){
        const buf = await st.get(id + '/' + n, { type: 'arrayBuffer' });
        if (!buf) return json({ hata: 'yok' }, 404);
        return new Response(buf, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' } });
      }
      if (req.method === 'POST'){
        const buf = await req.arrayBuffer();
        if (!buf.byteLength || buf.byteLength > CHUNK_MAX) return json({ hata: 'parça boyutu' }, 413);
        const { data } = await readIndex();
        if (data.songs.some(s => s.id === id)) return json({ ok: true, zatenVar: true });
        if (data.songs.length >= MAX_SONGS) return json({ hata: 'kütüphane dolu' }, 507);
        await st.set(id + '/' + n, buf);
        return json({ ok: true });
      }
    }
    if (req.method !== 'POST') return json({ hata: 'yöntem' }, 405);
    const b = await req.json().catch(() => ({}));

    if (islem === 'bitir'){
      const id = String(b.id || ''), chunks = Number(b.chunks), size = Number(b.size);
      if (!ID.test(id) || !Number.isInteger(chunks) || chunks < 1 || chunks > 20 || !(size > 0) || size > SONG_MAX) return json({ hata: 'bilgi eksik' }, 400);
      const st = store('oyunodasi-sarki');
      const { blobs } = await st.list({ prefix: id + '/' });
      const have = new Set(blobs.map(x => x.key));
      for (let i = 0; i < chunks; i++) if (!have.has(id + '/' + i)) return json({ hata: 'parça eksik: ' + i }, 409);
      const song = {
        id, title: clip(b.title, 100) || 'Şarkı', by: clip(b.by, 20) || 'Biri', size, chunks,
        type: /^audio\/[\w.+-]{1,40}$/.test(b.type || '') ? b.type : 'audio/mpeg',
        dur: Math.max(0, Math.min(36000, Number(b.dur) || 0)), ts: Date.now()
      };
      const r = await updateIndex(d => {
        if (d.songs.some(s => s.id === id)) return { ok: true, zatenVar: true };
        if (d.songs.length >= MAX_SONGS) return { error: 'kütüphane dolu', status: 507 };
        if (d.songs.reduce((a, s) => a + (s.size || 0), 0) + size > MAX_TOTAL) return { error: 'kütüphane dolu', status: 507 };
        d.songs.push(song);
        return { ok: true, song };
      });
      return r.error ? json({ hata: r.error }, r.status || 400) : json(r);
    }
    if (islem === 'playlist'){
      const name = clip(b.name, 40);
      if (!name) return json({ hata: 'ad gerekli' }, 400);
      const pl = { id: [...crypto.getRandomValues(new Uint8Array(8))].map(x => x.toString(16).padStart(2, '0')).join(''), name, by: clip(b.by, 20) || 'Biri', songs: [], ts: Date.now() };
      const r = await updateIndex(d => {
        if (d.playlists.length >= MAX_LISTS) return { error: 'çok fazla playlist', status: 507 };
        d.playlists.push(pl);
        return { ok: true, playlist: pl };
      });
      return r.error ? json({ hata: r.error }, r.status || 400) : json(r);
    }
    if (islem === 'playlist-sarki'){
      const pid = String(b.pid || ''), sid = String(b.sid || '');
      const r = await updateIndex(d => {
        const pl = d.playlists.find(p => p.id === pid);
        if (!pl || !d.songs.some(s => s.id === sid)) return { error: 'bulunamadı', status: 404 };
        if (b.add){
          if (!pl.songs.includes(sid)){ if (pl.songs.length >= MAX_IN_LIST) return { error: 'playlist dolu', status: 507 }; pl.songs.push(sid); }
        } else pl.songs = pl.songs.filter(x => x !== sid);
        return { ok: true, playlist: pl };
      });
      return r.error ? json({ hata: r.error }, r.status || 400) : json(r);
    }
    return json({ hata: 'bilinmeyen işlem' }, 404);
  } catch(e){
    return json({ hata: 'sunucu', detay: String(e && e.message || e).slice(0, 200) }, 500);
  }
};

export const config = { path: '/api/muzik/:islem' };
