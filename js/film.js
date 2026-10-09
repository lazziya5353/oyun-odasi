// Film Odası: bilgisayardan film yayını, YouTube'u birlikte senkron izleme, ekran paylaşımı (Film modu).
let yt = null;   // { vid, time, playing, recvAt, by }  – herkeste aynı tutulan YouTube durumu
let ytPlayer = null, ytTile = null, ytSuppressUntil = 0, ytApi = null;
const canCapture = () => { const v = HTMLVideoElement.prototype; return !!(v.captureStream || v.mozCaptureStream); };

// ---------- başlangıç ekranı ----------
function renderFilmDeck(d){
  d.innerHTML = '';
  const h = document.createElement('h2'); h.className = 'deck-title'; h.textContent = '🎬 Film Odası';
  const p = document.createElement('p'); p.className = 'note';
  p.textContent = 'Birlikte ne izleyeceksiniz? Seçtiğin yöntem bu kanaldaki herkese açılır.';
  const grid = document.createElement('div'); grid.className = 'film-start';
  const card = (big, title, desc, fn, disabled) => {
    const b = document.createElement('button'); b.className = 'film-card'; b.disabled = !!disabled;
    b.innerHTML = '<span class="big"></span><b></b><span class="d"></span>';
    b.querySelector('.big').textContent = big; b.querySelector('b').textContent = title; b.querySelector('.d').textContent = desc;
    b.onclick = fn; grid.append(b);
  };
  card('🎞', 'Bilgisayardan film aç', canCapture()
      ? 'Filmi kendi bilgisayarından herkese yayınlarsın. Durdurup ileri sarabilirsin. Ekran paylaşımından daha temiz ve akıcıdır.'
      : 'Bu tarayıcı desteklemiyor. Chrome ya da Edge ile aç.', () => $('filmInput').click(), !canCapture());
  card('▶️', 'YouTube\'dan birlikte izle', 'Video herkesin bilgisayarında YouTube\'dan açılır ve senkron oynar. Kimse yayın yapmadığı için donma olmaz.', () => { $('ytErr').textContent = ''; $('ytUrl').value = ''; $('ytDlg').showModal(); $('ytUrl').focus(); });
  card('🖥', 'Ekran paylaş (Film modu)', 'Tarayıcıda açtığın bir videoyu paylaş. Netflix gibi korumalı sitelerde görüntü siyah görünebilir.', () => { shareQ = 'film'; openShareDialog(); });
  const tip = document.createElement('p'); tip.className = 'note';
  tip.textContent = 'En akıcı sonuç için: yayın yapan kablolu internet kullansın, kalite menüsünde “Film” seçili olsun. Görüntünün sol üstündeki gösterge donma olursa nedenini yazar.';
  d.append(h, p, grid, tip);
}

// ---------- bilgisayardan film ----------
$('filmInput').onchange = e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) startFilmFile(f); };
function waitForVideoTrack(cap, ms){
  return new Promise(res => {
    const t0 = performance.now();
    const chk = () => {
      const tr = cap.getVideoTracks()[0];
      if (tr) return res(tr);
      if (performance.now() - t0 > ms) return res(null);
      setTimeout(chk, 150);
    };
    chk();
  });
}
async function startFilmFile(file){
  if (!canCapture()){ toast('Bu tarayıcı dosyadan yayını desteklemiyor. Chrome ya da Edge kullan.'); return; }
  ensureCtx();
  toast('🎬 Film hazırlanıyor…');
  const v = document.createElement('video');
  v.playsInline = true; v.preload = 'auto';
  const url = URL.createObjectURL(file);
  v.src = url;
  // ses: kendi hoparlörüne + yayına (stereo, yüksek kalite)
  let src = null, mon = null, dst = null;
  try {
    src = audioCtx.createMediaElementSource(v);
    mon = audioCtx.createGain(); mon.gain.value = masterVol;
    dst = audioCtx.createMediaStreamDestination();
    src.connect(mon); mon.connect(audioCtx.destination); src.connect(dst);
  } catch(e){}
  const cap = v.captureStream ? v.captureStream() : v.mozCaptureStream();
  try { await v.play(); } catch(e){}
  const track = await waitForVideoTrack(cap, 8000);
  const cleanup = () => {
    v.pause();
    try { src && src.disconnect(); mon && mon.disconnect(); } catch(e){}
    URL.revokeObjectURL(url);
    broadcast({ t: 'film-state', paused: false });
  };
  if (!track){ cleanup(); toast('Bu video açılamadı. MP4 (H.264) ya da WebM dosyası dene.'); return; }
  const audio = dst ? dst.stream.getAudioTracks() : cap.getAudioTracks();
  const stream = new MediaStream([track, ...audio]);
  shareQ = 'film';
  v.addEventListener('pause', () => broadcast({ t: 'film-state', paused: true }));
  v.addEventListener('play', () => broadcast({ t: 'film-state', paused: false }));
  v.addEventListener('ended', () => toast('🎬 Film bitti. Yayını “Durdur” ile kapatabilirsin.'));
  startShareWithStream(stream, {
    mode: 'film', title: clip(file.name.replace(/\.[^.]+$/, ''), 80), localEl: v, fromFile: true, onStop: cleanup,
    setVol: val => { if (mon) mon.gain.value = val; }
  });
}

// ---------- YouTube'u birlikte izleme ----------
function parseYT(url){
  const s = String(url || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const h = u.hostname.replace(/^(www|m|music)\./, '');
    if (h === 'youtu.be'){ const id = u.pathname.slice(1, 12); return /^[\w-]{11}$/.test(id) ? id : null; }
    if (h === 'youtube.com' || h === 'youtube-nocookie.com'){
      const v = u.searchParams.get('v'); if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/\/(shorts|embed|live|v)\/([\w-]{11})/); if (m) return m[2];
    }
  } catch(e){}
  return null;
}
$('ytForm').onsubmit = e => {
  e.preventDefault();
  const vid = parseYT($('ytUrl').value);
  if (!vid){ $('ytErr').textContent = 'Bu bir YouTube bağlantısına benzemiyor. Videonun adresini kopyalayıp yapıştır.'; return; }
  $('ytDlg').close();
  startYT(vid);
};
function startYT(vid){
  const st = { vid, time: 0, playing: true };
  broadcast(Object.assign({ t: 'yt' }, st));
  applyYT(st, peer.id);
}
function stopYT(){ broadcast({ t: 'yt', vid: null }); applyYT(null, peer.id); }
const ytExpected = () => yt ? yt.time + (yt.playing ? (performance.now() - yt.recvAt) / 1000 : 0) : 0;

function applyYT(st, by, fromSync){
  if (!st || !st.vid){
    if (yt){ yt = null; destroyYT(); renderChannels(); }
    return;
  }
  if (typeof st.vid !== 'string' || !/^[\w-]{11}$/.test(st.vid)) return;
  const newVideo = !yt || yt.vid !== st.vid;
  yt = { vid: st.vid, time: Math.max(0, Number(st.time) || 0), playing: !!st.playing, recvAt: performance.now(), by };
  if (newVideo && !fromSync && peer && by !== peer.id){
    const n = (peers.get(by) || {}).name;
    if (n){ toast('▶️ ' + n + ' Film Odası\'nda YouTube açtı'); addSys(n + ' Film Odası\'nda YouTube açtı'); }
  }
  if (me.channel === 'film') ensureYTTile(newVideo);
  renderChannels();
}
function loadYTApi(){
  if (ytApi) return ytApi;
  ytApi = new Promise((res, rej) => {
    if (window.YT && window.YT.Player) return res();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { ytApi = null; rej(new Error('YouTube yüklenemedi')); };
    document.head.append(s);
  });
  return ytApi;
}
async function ensureYTTile(newVideo){
  if (!yt) return;
  if (ytTile && ytPlayer && ytPlayer.loadVideoById){
    if (newVideo){ ytSuppressUntil = performance.now() + 1500; ytPlayer.loadVideoById(yt.vid, ytExpected()); }
    else syncYT(false);
    return;
  }
  if (ytTile) return;     // oynatıcı hâlâ yükleniyor
  const host = document.createElement('div'); host.className = 'yt-host';
  const inner = document.createElement('div'); host.append(inner);
  const stopB = document.createElement('button'); stopB.textContent = '⏹ Bitir'; stopB.title = 'Herkes için kapat';
  stopB.onclick = stopYT;
  ytTile = makeTile('▶️ YouTube – herkes senkron izliyor', host, { extraTools: [stopB], stats: false });
  ytTile.classList.add('yt');
  $('screens').prepend(ytTile);
  updateStage();
  try { await loadYTApi(); } catch(e){ toast('YouTube yüklenemedi. İnternet bağlantını kontrol et.'); return; }
  if (!ytTile || !yt || !inner.isConnected) return;
  ytPlayer = new YT.Player(inner, {
    videoId: yt.vid, width: '100%', height: '100%',
    playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, start: Math.floor(ytExpected()) },
    events: { onReady: () => syncYT(true), onStateChange: onYTState }
  });
}
// herkesin videosu aynı saniyede kalsın
function syncYT(force){
  if (!yt || !ytPlayer || !ytPlayer.getPlayerState) return;
  const exp = ytExpected();
  const cur = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0;
  const st = ytPlayer.getPlayerState();
  const needSeek = force || Math.abs(cur - exp) > 2;
  const needPlay = yt.playing && st !== 1 && st !== 3;
  const needPause = !yt.playing && st === 1;
  if (!needSeek && !needPlay && !needPause) return;
  ytSuppressUntil = performance.now() + 1200;
  if (needSeek) ytPlayer.seekTo(exp, true);
  if (needPlay) ytPlayer.playVideo();
  if (needPause) ytPlayer.pauseVideo();
}
// biri durdurur, oynatır ya da ileri sararsa herkese bildir
function onYTState(e){
  if (performance.now() < ytSuppressUntil || !yt || !ytPlayer) return;
  if (e.data !== 1 && e.data !== 2) return;
  const st = { vid: yt.vid, time: ytPlayer.getCurrentTime(), playing: e.data === 1 };
  if (st.playing === yt.playing && Math.abs(st.time - ytExpected()) < 1.5) return;
  broadcast(Object.assign({ t: 'yt' }, st));
  yt = Object.assign({}, st, { recvAt: performance.now(), by: peer.id });
}
setInterval(() => { if (yt && ytPlayer && me.channel === 'film') syncYT(false); }, 3000);
function destroyYT(){
  try { ytPlayer && ytPlayer.destroy(); } catch(e){}
  ytPlayer = null;
  if (ytTile){ removeTile(ytTile); ytTile = null; updateStage(); }
}
function onChannelEnterFilm(){
  if (me.channel === 'film'){ if (yt) ensureYTTile(false); }
  else destroyYT();
}
const ytStateForSync = () => yt ? { vid: yt.vid, time: ytExpected(), playing: yt.playing } : null;

// ---------- gelen mesajlar ----------
function filmOnData(id, d){
  if (d.t === 'yt'){ applyYT(d.vid ? d : null, id); return true; }
  if (d.t === 'film-state'){ const p = peers.get(id); if (p) p.filmPaused = !!d.paused; return true; }
  return false;
}
