// Müzik Kütüphanesi (Müzik Odası'nın içinde): yüklenen her şarkı sunucuda (Netlify) kalıcı olarak durur,
// yükleyenin adı yazar ve silinmez. Herkes kendi adına playlist oluşturabilir; tüm şarkılar ya da bir playlist
// tek tuşla sıraya eklenir. Sıraya ekleyen kişi şarkıyı sunucudan bir kez indirir (sonra tarayıcıda saklanır)
// ve Müzik Odası'ndakilere her zamanki gibi canlı aktarır; dinleyenler ayrıca bir şey indirmez.
const LIB_API = (window.OYUNODASI_PUSH_API || '') + '/api/muzik/';
const LIB_CHUNK = 2.5 * 1024 * 1024;
const LIB_SONG_MAX = 30 * 1024 * 1024;
const libOK = () => location.protocol === 'https:' || location.protocol === 'http:';
let lib = { songs: [], playlists: [] }, libLoadedAt = 0, libLoading = null, libErr = '';
const libUI = { view: 'all', who: '', q: '', menuFor: null, newList: false };
const libUploads = new Map();      // id → { title, pct, err }
const libFetches = new Map();      // şarkı id → Promise<Blob>
let libEl = null;

const songById = id => lib.songs.find(s => s.id === id);
async function libApi(path, opts){
  const r = await fetch(LIB_API + path, opts);
  const d = r.headers.get('content-type') && r.headers.get('content-type').includes('json') ? await r.json() : null;
  if (!r.ok) throw new Error((d && d.hata) || ('HTTP ' + r.status));
  return d;
}
const libPost = (path, body) => libApi(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

async function loadLibrary(){
  if (!libOK()) return;
  if (libLoading) return libLoading;
  libLoading = (async () => {
    try {
      const d = await libApi('liste');
      lib = { songs: Array.isArray(d.songs) ? d.songs : [], playlists: Array.isArray(d.playlists) ? d.playlists : [] };
      libErr = ''; libLoadedAt = Date.now();
    } catch(e){ libErr = 'Kütüphaneye ulaşılamadı. Biraz sonra tekrar dene.'; }
    libLoading = null;
    renderLibrary();
    if (current && current.lib) refreshMusicUI();     // şimdi çalanın "kim yükledi" bilgisi
  })();
  return libLoading;
}
function libChanged(){ broadcast({ t: 'lib-changed' }); loadLibrary(); }

// ---------- yükleme ----------
async function sha32(file){
  const d = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(d)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}
function audioDuration(file){
  return new Promise(res => {
    const a = new Audio(), u = URL.createObjectURL(file);
    const done = v => { URL.revokeObjectURL(u); res(v); };
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(isFinite(a.duration) ? a.duration : 0);
    a.onerror = () => done(0);
    setTimeout(() => done(0), 5000);
    a.src = u;
  });
}
async function uploadToLibrary(file){
  if (!libOK()) return null;
  if (file.size > LIB_SONG_MAX){ toast('“' + clip(file.name, 40) + '” 30 MB’tan büyük: çalındı ama kütüphaneye eklenmedi.'); return null; }
  const title = clip(file.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' '), 100) || 'Şarkı';
  let id;
  try { id = await sha32(file); } catch(e){ return null; }
  if (!libLoadedAt) await loadLibrary();
  if (songById(id)) return id;                         // aynı şarkı zaten kütüphanede
  if (libUploads.has(id)) return id;
  const up = { title, pct: 0, err: '' };
  libUploads.set(id, up); renderLibrary();
  try {
    const dur = await audioDuration(file);
    const chunks = Math.ceil(file.size / LIB_CHUNK);
    for (let n = 0; n < chunks; n++){
      const part = file.slice(n * LIB_CHUNK, Math.min(file.size, (n + 1) * LIB_CHUNK));
      let tries = 0;
      for (;;){
        try {
          const r = await libApi('parca?id=' + id + '&n=' + n, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: part });
          if (r && r.zatenVar) n = chunks;
          break;
        } catch(e){ if (++tries >= 3) throw e; await new Promise(r => setTimeout(r, 1500 * tries)); }
      }
      up.pct = Math.round(Math.min(n + 1, chunks) / chunks * 100); renderLibrary();
    }
    await libPost('bitir', { id, title, by: myName, size: file.size, type: file.type || 'audio/mpeg', dur, chunks });
    libUploads.delete(id);
    // bu dosya bende zaten var: sunucudan tekrar indirmeye gerek yok
    libFetches.set(id, Promise.resolve(file));
    libChanged();
    toast('☁️ “' + clip(title, 40) + '” kütüphaneye eklendi');
    return id;
  } catch(e){
    up.err = String(e.message || e); renderLibrary();
    setTimeout(() => { libUploads.delete(id); renderLibrary(); }, 8000);
    toast('“' + clip(title, 40) + '” kütüphaneye yüklenemedi: ' + up.err);
    return null;
  }
}
async function uploadMany(files){
  for (const f of files) await uploadToLibrary(f);      // sırayla: interneti boğmasın
}

// ---------- indirme (sıraya ekleyen kişi için) ----------
function fetchSong(sid){
  if (libFetches.has(sid)) return libFetches.get(sid);
  const p = (async () => {
    const s = songById(sid) || (await loadLibrary(), songById(sid));
    if (!s) throw new Error('şarkı bulunamadı');
    const key = location.origin + LIB_API + 'sarki/' + sid;
    let cache = null;
    try { cache = await caches.open('oyunodasi-muzik'); const hit = await cache.match(key); if (hit) return await hit.blob(); } catch(e){}
    const parts = [];
    for (let n = 0; n < s.chunks; n++){
      const r = await fetch(LIB_API + 'parca?id=' + sid + '&n=' + n);
      if (!r.ok) throw new Error('indirilemedi');
      parts.push(await r.arrayBuffer());
    }
    const blob = new Blob(parts, { type: s.type || 'audio/mpeg' });
    try { if (cache) await cache.put(key, new Response(blob, { headers: { 'content-type': blob.type } })); } catch(e){}
    return blob;
  })();
  libFetches.set(sid, p);
  p.catch(() => libFetches.delete(sid));
  return p;
}
// music.js çalarken çağırır: sıradaki kütüphane şarkısı bende yoksa indir
function ensureLibFile(item){
  if (!item || !item.lib || localFiles.has(item.id)) return Promise.resolve(localFiles.get(item && item.id));
  return fetchSong(item.lib).then(b => { localFiles.set(item.id, b); return b; });
}
function prefetchNextLib(){
  const next = queue.find(x => x.owner === peer.id && x.lib && (!current || x.id !== current.id) && !localFiles.has(x.id));
  if (next) ensureLibFile(next).catch(() => {});
}

// ---------- sıraya ekleme ----------
function queueSongs(ids, shuffle){
  let list = ids.map(songById).filter(Boolean);
  if (!list.length){ toast('Çalınacak şarkı yok'); return; }
  if (shuffle) list = list.map(s => [Math.random(), s]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  ensureCtx(); ensureMusicGraph();
  const base = Date.now();
  list.forEach((s, i) => {
    const it = { id: rid() + rid(), owner: peer.id, ownerName: myName, title: s.title, ts: base + i, lib: s.id };
    queue.push(it);
    broadcast({ t: 'q-add', item: it });
  });
  sortQueue();
  toast(list.length === 1 ? '🎵 “' + clip(list[0].title, 40) + '” sıraya eklendi' : '🎵 ' + list.length + ' şarkı sıraya eklendi');
  if (!current && !radio) startItem(queue[0].id);
  prefetchNextLib();
  refreshMusicUI();
}

// ---------- playlist ----------
async function createPlaylist(name, addSid){
  try {
    const r = await libPost('playlist', { name, by: myName });
    if (addSid) await libPost('playlist-sarki', { pid: r.playlist.id, sid: addSid, add: true });
    libUI.view = r.playlist.id;
    libChanged();
    toast('📃 “' + name + '” playlist’i oluşturuldu');
  } catch(e){ toast('Playlist oluşturulamadı: ' + e.message); }
}
async function playlistSong(pid, sid, add){
  try {
    await libPost('playlist-sarki', { pid, sid, add });
    const pl = lib.playlists.find(p => p.id === pid);
    if (pl){ if (add && !pl.songs.includes(sid)) pl.songs.push(sid); if (!add) pl.songs = pl.songs.filter(x => x !== sid); }
    renderLibrary();
    libChanged();
    if (add && pl) toast('➕ “' + pl.name + '” listesine eklendi');
  } catch(e){ toast('Olmadı: ' + e.message); }
}

// ---------- görünüm ----------
function libSection(){
  if (!libOK()) return document.createComment('kütüphane yok');
  if (!libEl){
    libEl = document.createElement('section'); libEl.className = 'lib';
    libEl.innerHTML =
      '<div class="lib-head"><div><h4>📚 Müzik Kütüphanesi</h4><p class="note">Yüklenen her şarkı burada kalır, yükleyenin adı yazar. Herkes çalabilir, playlist yapabilir.</p></div>' +
      '<div class="lib-acts"><button class="btn small primary" data-a="up">☁️ Şarkı yükle</button><button class="btn small" data-a="newlist">＋ Playlist</button></div></div>' +
      '<form class="lib-newlist" hidden><input maxlength="40" placeholder="Playlist adı (örn. Kaan’ın oyun müzikleri)"><button class="btn small primary">Oluştur</button><button type="button" class="btn small" data-a="cancel">Vazgeç</button></form>' +
      '<div class="lib-tabs"></div>' +
      '<div class="lib-tools"><input type="search" class="lib-q" placeholder="🔎 Şarkı ara…"><select class="lib-who" aria-label="Yükleyen"></select></div>' +
      '<div class="lib-ups"></div><div class="lib-viewhead"></div><div class="lib-list"></div><div class="lib-menu" hidden></div>';
    libEl.querySelector('[data-a="up"]').onclick = () => $('libInput').click();
    const form = libEl.querySelector('.lib-newlist');
    libEl.querySelector('[data-a="newlist"]').onclick = () => { form.hidden = false; form.querySelector('input').focus(); };
    libEl.querySelector('[data-a="cancel"]').onclick = () => { form.hidden = true; form._addSid = null; };
    form.onsubmit = e => {
      e.preventDefault();
      const v = clip(form.querySelector('input').value, 40); if (!v) return;
      createPlaylist(v, form._addSid); form.querySelector('input').value = ''; form.hidden = true; form._addSid = null;
    };
    const q = libEl.querySelector('.lib-q');
    q.oninput = () => { libUI.q = libNorm(q.value.trim()); renderLibrary(); };
    libEl.querySelector('.lib-who').onchange = e => { libUI.who = e.target.value; renderLibrary(); };
    document.addEventListener('pointerdown', e => {
      const m = libEl && libEl.querySelector('.lib-menu');
      if (m && !m.hidden && !m.contains(e.target) && !e.target.closest('[data-menu]')){ m.hidden = true; libUI.menuFor = null; }
    });
    renderLibrary();
  }
  if (!libLoadedAt || Date.now() - libLoadedAt > 60000) loadLibrary();
  return libEl;
}
const fmtDur = s => s ? fmtTime(s) : '';
// arama Türkçe harflere duyarsız: "gülpembe" yazınca "Gulpembe" de bulunur
const libNorm = t => String(t).toLocaleLowerCase('tr-TR').replace(/[çğıöşü]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c]);
function renderLibrary(){
  if (!libEl) return;
  const tabs = libEl.querySelector('.lib-tabs');
  tabs.innerHTML = '';
  const tab = (id, label, title) => {
    const b = document.createElement('button'); b.className = 'lib-tab' + (libUI.view === id ? ' on' : ''); b.textContent = label;
    if (title) b.title = title;
    b.onclick = () => { libUI.view = id; renderLibrary(); };
    tabs.append(b);
  };
  tab('all', '🎵 Tüm şarkılar (' + lib.songs.length + ')');
  lib.playlists.slice().sort((a, b) => a.ts - b.ts).forEach(p => tab(p.id, '📃 ' + p.name + ' (' + p.songs.length + ')', p.by + ' oluşturdu'));
  if (libUI.view !== 'all' && !lib.playlists.some(p => p.id === libUI.view)) libUI.view = 'all';

  // yükleyen filtresi
  const who = libEl.querySelector('.lib-who');
  const names = [...new Set(lib.songs.map(s => s.by))].sort((a, b) => a.localeCompare(b, 'tr'));
  who.innerHTML = '<option value="">Herkesin yükledikleri</option>' + names.map(n => '<option></option>').join('');
  names.forEach((n, i) => { who.options[i + 1].value = n; who.options[i + 1].textContent = n + ' (' + lib.songs.filter(s => s.by === n).length + ')'; });
  if (!names.includes(libUI.who)) libUI.who = '';
  who.value = libUI.who;

  // yüklenenler
  const ups = libEl.querySelector('.lib-ups'); ups.innerHTML = '';
  libUploads.forEach(u => {
    const r = document.createElement('div'); r.className = 'lib-up' + (u.err ? ' err' : '');
    r.innerHTML = '<span class="t"></span><span class="bar"><i></i></span><span class="p"></span>';
    r.querySelector('.t').textContent = '☁️ ' + u.title;
    r.querySelector('i').style.width = u.pct + '%';
    r.querySelector('.p').textContent = u.err ? 'olmadı' : u.pct + '%';
    ups.append(r);
  });

  // görünüm başlığı
  const pl = libUI.view === 'all' ? null : lib.playlists.find(p => p.id === libUI.view);
  let ids = pl ? pl.songs.filter(songById) : lib.songs.slice().sort((a, b) => b.ts - a.ts).map(s => s.id);
  let shown = ids.map(songById);
  if (libUI.who) shown = shown.filter(s => s.by === libUI.who);
  if (libUI.q) shown = shown.filter(s => libNorm(s.title + ' ' + s.by).includes(libUI.q));
  const vh = libEl.querySelector('.lib-viewhead'); vh.innerHTML = '';
  const info = document.createElement('span'); info.className = 'note';
  info.textContent = pl ? '📃 ' + pl.name + ' · ' + pl.by + ' oluşturdu · ' + pl.songs.length + ' şarkı'
    : (libUI.who ? libUI.who + ' yükledi · ' : '') + shown.length + ' şarkı';
  vh.append(info);
  const play = (label, shuffle) => {
    const b = document.createElement('button'); b.className = 'btn small' + (shuffle ? '' : ' primary'); b.textContent = label;
    b.disabled = !shown.length; b.onclick = () => queueSongs(shown.map(s => s.id), shuffle);
    vh.append(b);
  };
  play(pl ? '▶ Playlist’i çal' : libUI.who || libUI.q ? '▶ Bunları çal' : '▶ Tümünü çal', false);
  play('🔀 Karışık', true);

  // liste
  const list = libEl.querySelector('.lib-list'); list.innerHTML = '';
  if (libErr && !lib.songs.length){ const p = document.createElement('p'); p.className = 'note'; p.textContent = libErr; list.append(p); }
  else if (!shown.length){
    const p = document.createElement('p'); p.className = 'note lib-empty';
    p.textContent = pl ? 'Bu playlist boş. Şarkıların yanındaki ➕ ile ekleyebilirsin.' : lib.songs.length ? 'Aramana uyan şarkı yok.' : 'Kütüphane boş. “☁️ Şarkı yükle” ile ilk şarkıyı sen ekle!';
    list.append(p);
  }
  const playingLib = current && current.lib;
  shown.forEach((s, i) => {
    const row = document.createElement('div'); row.className = 'lib-row' + (playingLib === s.id ? ' now' : '');
    row.innerHTML = '<span class="n"></span><span class="t"><b></b><small></small></span><span class="d"></span>';
    row.querySelector('.n').textContent = playingLib === s.id ? '♪' : i + 1;
    row.querySelector('b').textContent = s.title;
    row.querySelector('small').textContent = s.by + ' yükledi';
    row.querySelector('small').style.color = 'var(--muted)';
    row.querySelector('.d').textContent = fmtDur(s.dur);
    const btn = (txt, title, fn, attr) => { const b = document.createElement('button'); b.className = 'lib-b'; b.textContent = txt; b.title = title; if (attr) b.setAttribute(attr, ''); b.onclick = fn; row.append(b); return b; };
    btn('▶', 'Sıraya ekle', () => queueSongs([s.id]));
    btn('➕', 'Playlist’e ekle', e => openLibMenu(e.currentTarget, s.id), 'data-menu');
    if (pl) btn('✕', 'Bu playlist’ten çıkar (şarkı kütüphanede kalır)', () => playlistSong(pl.id, s.id, false));
    row.ondblclick = () => queueSongs([s.id]);
    list.append(row);
  });
}
function openLibMenu(anchor, sid){
  const m = libEl.querySelector('.lib-menu');
  if (!m.hidden && libUI.menuFor === sid){ m.hidden = true; libUI.menuFor = null; return; }
  libUI.menuFor = sid;
  m.innerHTML = '<b>Playlist’e ekle</b>';
  lib.playlists.forEach(p => {
    const b = document.createElement('button'); const has = p.songs.includes(sid);
    b.textContent = (has ? '✓ ' : '') + p.name; b.disabled = has;
    b.onclick = () => { m.hidden = true; playlistSong(p.id, sid, true); };
    m.append(b);
  });
  const nb = document.createElement('button'); nb.className = 'new'; nb.textContent = '＋ Yeni playlist…';
  nb.onclick = () => { m.hidden = true; const f = libEl.querySelector('.lib-newlist'); f.hidden = false; f._addSid = sid; f.querySelector('input').focus(); };
  m.append(nb);
  m.hidden = false;
  const r = anchor.getBoundingClientRect(), base = libEl.getBoundingClientRect();
  m.style.top = (r.bottom - base.top + 4) + 'px';
  m.style.right = Math.max(8, base.right - r.right) + 'px';
}

$('libInput').onchange = e => {
  const files = [...(e.target.files || [])].filter(f => f.type.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|opus|wav|flac|webm)$/i.test(f.name));
  e.target.value = '';
  if (!files.length){ toast('Müzik dosyası seç (mp3, m4a, ogg, wav…)'); return; }
  uploadMany(files);
};
