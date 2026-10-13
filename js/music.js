// Müzik Odası: herkes bilgisayarından müzik yükleyebilir (ortak sıra); yüklenen şarkı yükleyenin bilgisayarından
// Müzik Odası'ndakilere stereo ve yüksek kalitede canlı aktarılır.
// Radyo ise ODADAKİ HERKES içindir (hangi kanalda olursa olsun): herkes kendi bilgisayarında doğrudan dinler,
// kimsenin internetini yormaz. Herkes kendi radyo sesini ayarlayabilir ya da sadece kendisi için susturabilir.
let queue = [];            // { id, owner, ownerName, title, ts }
let current = null;        // { id, owner, ownerName, title, pos, dur, paused, at }
let radio = null;          // { name, url, favicon, tags, by, byName }
const localFiles = new Map();
const outMusic = new Map();
let musicVol = Math.min(1, Math.max(0, parseFloat(store.get('oyunodasi-mv') || '0.7')));
let musicEl = null, musicSrc = null, musicMon = null, musicDest = null, musicLocalAn = null, musicOutStream = null;
let radioEl = null, lastPosSent = 0;
let radioVol = Math.min(1, Math.max(0, parseFloat(store.get('oyunodasi-rv') || '0.5')));
let radioMuted = store.get('oyunodasi-rmute') === '1';    // sadece benim için sustur

const musicCurrentTitle = () => current ? current.title : '';
const sortQueue = () => queue.sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1));
const estPos = () => current ? Math.min(current.dur || Infinity, current.pos + (current.paused ? 0 : (performance.now() - current.at) / 1000)) : 0;
function validItem(it, from){
  return it && typeof it === 'object' && typeof it.id === 'string' && it.id.length <= 40 &&
    typeof it.owner === 'string' && (!from || it.owner === from) && typeof it.title === 'string';
}
const cleanItem = it => ({ id: it.id, owner: it.owner, ownerName: clip(it.ownerName, 20), title: clip(it.title, 100) || 'Şarkı', ts: Number(it.ts) || Date.now(),
  lib: typeof it.lib === 'string' && /^[a-f0-9]{32}$/.test(it.lib) ? it.lib : undefined });

// ---------- ses seviyesi ----------
function applyMusicVolume(){
  const here = me.channel === 'muzik';
  const v = Math.min(1, musicVol * masterVol);
  if (musicMon) musicMon.gain.value = (here && !deafened) ? v : 0;
  if (typeof peers !== 'undefined') peers.forEach(p => { if (p.musicAudio){ p.musicAudio.volume = v; p.musicAudio.muted = deafened || !here; } });
  if (radioEl){ radioEl.volume = Math.min(1, radioVol * masterVol); radioEl.muted = deafened || radioMuted; }
}
function setMusicVol(v){
  musicVol = v; store.set('oyunodasi-mv', String(v));
  const pct = Math.round(v * 100);
  ['musicVol', 'musicVol2'].forEach(id => { const r = $(id); if (r && +r.value !== pct) r.value = pct; });
  ['musicOut', 'musicOut2'].forEach(id => { const o = $(id); if (o) o.textContent = pct + '%'; });
  applyMusicVolume();
}
function setRadioVol(v){
  radioVol = v; store.set('oyunodasi-rv', String(v));
  const pct = Math.round(v * 100);
  document.querySelectorAll('[data-radiovol]').forEach(r => { if (+r.value !== pct) r.value = pct; });
  document.querySelectorAll('[data-radioout]').forEach(o => o.textContent = pct + '%');
  if (radioMuted && v > 0) setRadioMuted(false);
  applyMusicVolume();
}
function setRadioMuted(on){
  radioMuted = on; store.set('oyunodasi-rmute', on ? '1' : '0');
  playRadio(); renderRadioChip();
}
$('musicVol2').value = Math.round(musicVol * 100); $('musicOut2').textContent = Math.round(musicVol * 100) + '%';
$('musicVol2').oninput = e => setMusicVol(e.target.value / 100);
$('radioVol2').value = Math.round(radioVol * 100); $('radioOut2').textContent = Math.round(radioVol * 100) + '%';
$('radioVol2').oninput = e => setRadioVol(e.target.value / 100);

// ---------- yükleyenin bilgisayarındaki çalar ----------
function ensureMusicGraph(){
  if (musicEl) return;
  ensureCtx();
  musicEl = new Audio(); musicEl.preload = 'auto';
  musicSrc = audioCtx.createMediaElementSource(musicEl);
  musicMon = audioCtx.createGain();
  musicDest = audioCtx.createMediaStreamDestination();
  musicLocalAn = audioCtx.createAnalyser(); musicLocalAn.fftSize = 256; musicLocalAn.smoothingTimeConstant = 0.8;
  musicSrc.connect(musicMon); musicMon.connect(audioCtx.destination);
  musicSrc.connect(musicDest); musicSrc.connect(musicLocalAn);
  musicOutStream = musicDest.stream;
  musicEl.addEventListener('ended', () => {
    if (current && current.owner === peer.id){ const id = current.id; broadcast({ t: 'q-ended', id }); advance(id); }
  });
  const sendPos = force => {
    if (!current || current.owner !== peer.id) return;
    current.pos = musicEl.currentTime; current.dur = musicEl.duration || 0; current.paused = musicEl.paused; current.at = performance.now();
    const now = Date.now();
    if (force || now - lastPosSent > 3000){ lastPosSent = now; broadcast({ t: 'q-pos', id: current.id, pos: current.pos, dur: current.dur, paused: current.paused }); }
  };
  musicEl.addEventListener('timeupdate', () => sendPos(false));
  musicEl.addEventListener('loadedmetadata', () => sendPos(true));
  musicEl.addEventListener('seeked', () => sendPos(true));
  musicEl.addEventListener('pause', () => { sendPos(true); refreshMusicUI(); });
  musicEl.addEventListener('play', () => { sendPos(true); refreshMusicUI(); });
  musicEl.addEventListener('error', () => {
    if (current && current.owner === peer.id && musicEl.getAttribute('src')){ toast('Bu müzik dosyası çalınamadı, sıradakine geçiliyor.'); skipItem(current.id); }
  });
}
function playLocal(id){
  const f = localFiles.get(id);
  if (!f){
    // kütüphane şarkısı: önce sunucudan indir (bir kez; sonra tarayıcıda saklanır)
    const it = queue.find(x => x.id === id);
    if (it && it.lib && typeof ensureLibFile === 'function'){
      if (current && current.id === id) current.loading = true;
      refreshMusicUI();
      ensureLibFile(it).then(() => {
        if (current && current.id === id){ current.loading = false; playLocal(id); prefetchNextLib(); }
      }, () => { toast('“' + clip(it.title, 40) + '” indirilemedi, sıradakine geçiliyor.'); if (current && current.id === id) skipItem(id); });
      return;
    }
    skipItem(id); return;
  }
  ensureMusicGraph();
  if (musicEl._url) URL.revokeObjectURL(musicEl._url);
  musicEl._url = URL.createObjectURL(f);
  musicEl.src = musicEl._url;
  musicEl.play().catch(() => toast('Müziği başlatmak için sayfaya bir kez tıkla.'));
  applyMusicVolume();
}
function stopLocal(){ if (musicEl) musicEl.pause(); }

// müziği sadece Müzik Odası'ndakilere aktar
function syncMusicOut(){
  if (!peer) return;
  const dj = !!(current && current.owner === peer.id && musicOutStream && !radio);
  peers.forEach(p => {
    const want = dj && p.linked && p.channel === 'muzik';
    if (want && !outMusic.has(p.id)){
      const call = peer.call(p.id, musicOutStream, { metadata: { kind: 'music' }, sdpTransform: sdpHiFi });
      if (call){
        outMusic.set(p.id, call);
        call.on('close', () => { if (outMusic.get(p.id) === call) outMusic.delete(p.id); });
        [0, 1500, 4000].forEach(ms => setTimeout(() => tuneMusicSender(call), ms));
      }
    }
    if (!want && outMusic.has(p.id)){ try { outMusic.get(p.id).close(); } catch(e){} outMusic.delete(p.id); }
  });
}
function tuneMusicSender(call){
  const pc = call.peerConnection; if (!pc) return;
  pc.getSenders().forEach(s => {
    if (!s.track) return;
    try {
      const prm = s.getParameters();
      if (!prm.encodings || !prm.encodings.length) prm.encodings = [{}];
      prm.encodings[0].maxBitrate = 256000;
      s.setParameters(prm).catch(() => {});
    } catch(e){}
  });
}
// dinleyen taraf
function onMusicStream(p, s){
  if (p.musicStream === s) return;
  p.musicStream = s;
  if (!p.musicAudio){ p.musicAudio = new Audio(); p.musicAudio.autoplay = true; }
  p.musicAudio.srcObject = s;
  p.musicAnalyser = makeAnalyser(s);
  applyMusicVolume();
  p.musicAudio.play().catch(() => {});
}
function onMusicClosed(p){
  if (p.musicAudio) p.musicAudio.srcObject = null;
  p.musicStream = null; p.musicAnalyser = null; p.musicCall = null;
}

// ---------- ortak sıra ----------
function addFiles(files){
  const list = [...files].filter(f => f.type.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|opus|wav|flac|webm)$/i.test(f.name));
  if (!list.length){ toast('Müzik dosyası seç (mp3, m4a, ogg, wav…)'); return; }
  ensureCtx(); ensureMusicGraph();
  const base = Date.now();
  list.forEach((f, i) => {
    const it = { id: rid() + rid(), owner: peer.id, ownerName: myName, title: clip(f.name.replace(/\.[^.]+$/, ''), 80), ts: base + i };
    localFiles.set(it.id, f);
    queue.push(it);
    broadcast({ t: 'q-add', item: it });
  });
  sortQueue();
  toast(list.length === 1 ? '🎵 Sıraya eklendi' : '🎵 ' + list.length + ' şarkı sıraya eklendi');
  if (typeof hareket === 'function') hareket('muzik', list.length + ' şarkı yükledi: ' + list.slice(0, 3).map(f => f.name.replace(/\.[^.]+$/, '')).join(', '));
  if (!current && !radio) startItem(queue[0].id);
  refreshMusicUI();
  if (typeof uploadMany === 'function') uploadMany(list);   // kütüphaneye de kaydet (kalıcı)
}
$('musicInput').onchange = e => { const f = e.target.files; if (f && f.length) addFiles(f); e.target.value = ''; };

function startItem(id){ broadcast({ t: 'q-start', id }); applyStart(id); }
function applyStart(id){
  const it = queue.find(x => x.id === id); if (!it) return;
  if (radio){ radio = null; playRadio(); renderRadioChip(); }
  if (current && current.owner === peer.id && current.id !== id) stopLocal();
  current = { id, owner: it.owner, ownerName: it.ownerName, title: it.title, lib: it.lib, pos: 0, dur: 0, paused: false, at: performance.now() };
  if (it.owner === peer.id) playLocal(id);
  syncMusicOut(); refreshMusicUI();
}
// şarkı bitti ya da geçildi: sıradakine geç. Herkes aynı hesabı yapar; sıradaki şarkının sahibi çalmaya başlar.
function advance(fromId){
  if (!current || current.id !== fromId) return;
  queue = queue.filter(x => x.id !== fromId && isPresent(x.owner));
  current = null;
  const next = queue[0];
  if (next && next.owner === peer.id) startItem(next.id);
  syncMusicOut(); refreshMusicUI();
}
function skipItem(id){ broadcast({ t: 'q-skip', id }); skipItemLocal(id); }
function skipItemLocal(id){
  if (!current || current.id !== id) return;
  if (current.owner === peer.id) stopLocal();
  advance(id);
}
function togglePause(){
  if (!current) return;
  const paused = !current.paused;
  broadcast({ t: 'q-pause', paused });
  applyPause(paused);
}
function applyPause(paused){
  if (!current) return;
  current.pos = estPos(); current.at = performance.now(); current.paused = paused;
  if (current.owner === peer.id && musicEl){ if (paused) musicEl.pause(); else musicEl.play().catch(() => {}); }
  refreshMusicUI();
}
// ileri / geri sarma: herkes yapabilir; şarkıyı çalan kişi (sahibi) yeni konuma atlar, diğerleri onu duyar
function seekTo(pos){
  if (!current || radio) return;
  const dur = current.dur || 0;
  pos = Math.max(0, dur ? Math.min(dur - 0.5, pos) : pos);
  broadcast({ t: 'q-seek', id: current.id, pos });
  applySeek(current.id, pos);
}
function applySeek(id, pos){
  if (!current || current.id !== id || !Number.isFinite(pos)) return;
  current.pos = pos; current.at = performance.now();
  if (current.owner === peer.id && musicEl && musicEl.getAttribute('src')){ try { musicEl.currentTime = pos; } catch(e){} }
  updateMusicProgress();
}
const seekBy = d => seekTo(estPos() + d);
function removeItem(id){ broadcast({ t: 'q-remove', id }); removeItemLocal(id); }
function removeItemLocal(id){
  if (current && current.id === id){ skipItemLocal(id); return; }
  queue = queue.filter(x => x.id !== id);
  localFiles.delete(id);
  refreshMusicUI();
}
function musicPeerLeft(id){
  const wasCur = current && current.owner === id;
  queue = queue.filter(x => x.owner !== id);
  if (wasCur) advance(current.id);
  refreshMusicUI();
}

// ---------- radyo ----------
// Duraklat / devam: herkes için. Canlı yayın olduğu için devam edince yayın kaldığı yerden değil, şu andan başlar.
function setRadioPaused(paused){
  if (!radio) return;
  broadcast({ t: 'radio-pause', paused: !!paused });
  applyRadioPause(paused, peer.id);
}
function applyRadioPause(paused, by, quiet){
  if (!radio || radio.paused === !!paused) return;
  radio.paused = !!paused;
  if (joined && peer && by !== peer.id && !quiet){
    const n = (peers.get(by) || {}).name || 'Biri';
    addSys('📻 ' + n + (paused ? ' radyoyu durdurdu' : ' radyoyu devam ettirdi'));
  }
  playRadio(); renderRadioChip(); refreshMusicUI();
}
function setRadio(st){
  const station = st ? { name: clip(st.name, 80), url: st.url, favicon: st.favicon || '', tags: clip(st.tags, 80) } : null;
  if (typeof hareket === 'function') hareket('radyo', station ? 'radyo açtı: ' + station.name : 'radyoyu kapattı');
  broadcast({ t: 'radio', station });
  applyRadio(station, peer.id);
}
function applyRadio(st, by, quiet){
  if (st){
    if (typeof st.url !== 'string' || !/^https:\/\//i.test(st.url) || st.url.length > 500) return;
    const byName = by === (peer && peer.id) ? myName : ((peers.get(by) || {}).name || '');
    radio = { name: clip(st.name, 80) || 'Radyo', url: st.url, by, byName, paused: false,
      favicon: typeof st.favicon === 'string' && /^https:\/\//i.test(st.favicon) ? st.favicon : '', tags: clip(st.tags, 80) };
    if (current){ if (current.owner === peer.id) stopLocal(); current = null; }
  } else radio = null;
  if (joined && peer && by !== peer.id && !quiet){
    const n = (peers.get(by) || {}).name || 'Biri';
    if (st) addSys('📻 ' + n + ' radyoyu açtı: ' + radio.name);
    else addSys('📻 ' + n + ' radyoyu kapattı');
  }
  playRadio(); syncMusicOut(); refreshMusicUI(); renderRadioChip();
}
// Radyo odadaki herkes için çalar; sadece "benim için sustur" diyen ya da sesleri kapatan duymaz
function playRadio(){
  const on = !!radio && !radio.paused && !radioMuted && joined;
  if (!on){
    if (radioEl && radioEl._url){ radioEl._url = ''; if (radioEl._hls){ try { radioEl._hls.destroy(); } catch(e){} radioEl._hls = null; } radioEl.pause(); radioEl.removeAttribute('src'); radioEl.load(); }
    return;
  }
  if (!radioEl){
    radioEl = new Audio(); radioEl.preload = 'none';
    radioEl.addEventListener('error', () => { if (radioEl._url) toast('Bu radyo şu an açılamadı, başka bir istasyon dene.'); });
    radioEl.addEventListener('playing', renderRadioChip);
    radioEl.addEventListener('waiting', renderRadioChip);
  }
  if (radioEl._url !== radio.url){
    radioEl._url = radio.url;
    if (radioEl._hls){ try { radioEl._hls.destroy(); } catch(e){} radioEl._hls = null; }
    if (/\.m3u8(\?|$)/i.test(radio.url) && !radioEl.canPlayType('application/vnd.apple.mpegurl')){
      // HLS yayını (ör. Kral FM): Chrome kendi çalamıyor, hls.js ile çalınır (ilk seferde yüklenir)
      const url = radio.url;
      hlsYukle().then(() => {
        if (radioEl._url !== url || !window.Hls || !Hls.isSupported()) return;
        const h = new Hls({ lowLatencyMode: false }); radioEl._hls = h;
        h.on(Hls.Events.ERROR, (e, d) => { if (d.fatal && radioEl._url === url) toast('Bu radyo şu an açılamadı, başka bir istasyon dene.'); });
        h.loadSource(url); h.attachMedia(radioEl);
        applyMusicVolume();
        radioEl.play().catch(() => toast('Radyoyu başlatmak için sayfaya bir kez tıkla.'));
      }).catch(() => toast('Bu radyo şu an açılamadı, başka bir istasyon dene.'));
      return;
    }
    radioEl.src = radio.url;
  }
  applyMusicVolume();
  radioEl.play().catch(() => toast('Radyoyu başlatmak için sayfaya bir kez tıkla.'));
}
let hlsSoz = null;
function hlsYukle(){
  if (window.Hls) return Promise.resolve();
  return hlsSoz || (hlsSoz = new Promise((ok, no) => {
    const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.15/hls.min.js';
    sc.onload = ok; sc.onerror = () => { hlsSoz = null; no(); }; document.head.append(sc);
  }));
}
// eski adı: kanal değiştirirken çağrılıyor (artık kanaldan bağımsız)
const playRadioIfHere = playRadio;

// ---------- üst şeritteki mini radyo çalar ----------
function renderRadioChip(){
  const chip = $('radioChip'), open = $('radioOpenBtn');
  if (!chip) return;
  chip.hidden = !radio || !joined;
  const fb = $('radioFavBtn'); if (fb) fb.hidden = !joined;
  open.hidden = !!radio || !joined;
  if (!radio) return;
  chip.style.setProperty('--c', colorFor(radio.by));
  $('rcName').textContent = radio.name;
  chip.title = radio.name + (radio.byName ? ' · ' + radio.byName + ' açtı' : '');
  const playing = radioEl && !radioEl.paused && radioEl.readyState >= 3 && !radioMuted;
  chip.classList.toggle('playing', !!playing);
  chip.classList.toggle('muted', radioMuted);
  $('rcMute').textContent = radioMuted ? '🔇' : '🔊';
  $('rcMute').title = radioMuted ? 'Radyoyu benim için aç' : 'Radyoyu sadece benim için sustur';
  $('rcMute').setAttribute('aria-pressed', radioMuted);
  chip.classList.toggle('paused', !!radio.paused);
  $('rcPause').textContent = radio.paused ? '▶' : '⏸';
  $('rcPause').title = radio.paused ? 'Radyoyu herkes için devam ettir' : 'Radyoyu herkes için durdur';
  $('rcPause').setAttribute('aria-pressed', !!radio.paused);
  renderFavCount();
}
$('rcPause').onclick = () => { if (radio) setRadioPaused(!radio.paused); };
$('radioOpenBtn').onclick = () => openRadioDialog('ara');
$('rcChange').onclick = () => openRadioDialog();
$('rcMute').onclick = () => setRadioMuted(!radioMuted);
$('rcStop').onclick = () => { setRadio(null); toast('📻 Radyo herkes için kapatıldı'); };
document.querySelectorAll('[data-radiovol]').forEach(r => { r.value = Math.round(radioVol * 100); r.oninput = () => setRadioVol(r.value / 100); });
document.querySelectorAll('[data-radioout]').forEach(o => o.textContent = Math.round(radioVol * 100) + '%');

// Radio Browser: ücretsiz, açık radyo dizini. Birkaç sunucusu var, biri cevap vermezse diğeri denenir.
const RB_HOSTS = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info', 'https://fi1.api.radio-browser.info', 'https://at1.api.radio-browser.info', 'https://nl1.api.radio-browser.info'];
const RB_CACHE = 'oyunodasi-radyo-onbellek';
// Yerleşik Türk radyoları: dizin (Radio Browser) çökükken de liste boş kalmasın. Hepsi denendi, çalıyor (Ekim 2026).
const STW = 'https://playerservices.streamtheworld.com/api/livestream-redirect/';
const YERLESIK_RADYO = [
  ['Power FM', 'https://listen.powerapp.com.tr/powerfm/mpeg/icecast.audio', 'yabancı pop, hit'],
  ['Power Türk', 'https://listen.powerapp.com.tr/powerturk/mpeg/icecast.audio', 'türkçe pop'],
  ['Power Türk Taptaze', 'https://listen.powerapp.com.tr/powerturktaptaze/mpeg/icecast.audio', 'yeni türkçe pop'],
  ['Power Türk Akustik', 'https://listen.powerapp.com.tr/powerturkakustik/mpeg/icecast.audio', 'akustik'],
  ['Power Türk Slow', 'https://listen.powerapp.com.tr/powerturkslow/mpeg/icecast.audio', 'slow'],
  ['Power Türk Rap', 'https://listen.powerapp.com.tr/powerturkrap/mpeg/icecast.audio', 'türkçe rap'],
  ['Power Türk Rock', 'https://listen.powerapp.com.tr/powerturkrock/mpeg/icecast.audio', 'türkçe rock'],
  ['Power Pop', 'https://listen.powerapp.com.tr/powerpop/mpeg/icecast.audio', 'pop'],
  ['Power Love', 'https://listen.powerapp.com.tr/powerlove/mpeg/icecast.audio', 'aşk şarkıları'],
  ['Power Dance', 'https://listen.powerapp.com.tr/powerdance/mpeg/icecast.audio', 'dance, elektronik'],
  ['Kral FM', 'https://dygedge2.radyotvonline.net/kralfm/playlist.m3u8', 'arabesk, fantezi'],
  ['Joy FM', STW + 'JOY_FM.mp3', 'yabancı slow'],
  ['Joy Türk', STW + 'JOY_TURK.mp3', 'türkçe slow'],
  ['Joy Türk (2)', STW + 'JOY_TURK_SC', 'türkçe slow'],
  ['Joy Jazz', STW + 'JOY_JAZZ.mp3', 'caz'],
  ['Metro FM', STW + 'METRO_FM.mp3', 'yabancı hit'],
  ['Süper FM', STW + 'SUPER_FM.mp3', 'türkçe pop'],
  ['Virgin Radio', STW + 'VIRGIN_RADIO.mp3', 'yabancı pop, hit'],
  ['Virgin Radio Türkiye', STW + 'VIRGIN_RADIO_SC', 'yabancı pop'],
  ['Radyo Fenomen', 'https://live.radyofenomen.com/fenomen/128/icecast.audio', 'hit'],
  ['Fenomen Türk', 'https://live.radyofenomen.com/fenomenturk/128/icecast.audio', 'türkçe pop'],
  ['Fenomen Pop', 'https://live.radyofenomen.com/fenomenpop/128/icecast.audio', 'pop'],
  ['Fenomen Akustik', 'https://live.radyofenomen.com/fenomenakustik/128/icecast.audio', 'akustik'],
  ['Slow Türk', 'https://radyo.duhnet.tv/ak_dtvh_slowturk', 'türkçe slow'],
  ['Radyo D', 'https://radyo.duhnet.tv/radyod', 'türkçe pop'],
  ['Alem FM', 'https://turkmedya.radyotvonline.net/alemfmaac', 'türkçe pop'],
  ['Radyo Viva', 'https://radyoviva.radyotvonline.net/radyoviva', 'türkçe pop'],
  ['Show Radyo', 'https://showradyo.radyotvonline.net/showradyo', 'türkçe pop']
].map(([name, url, tags]) => ({ name, url_resolved: url, favicon: '', tags, bitrate: 0, country: 'Türkiye', yerlesik: true }));
// Yerleşik yabancı radyolar (hepsi denendi, çalıyor)
const MR = 'https://media-ssl.musicradio.com/';
const DUNYA_RADYO = [
  ['Radio Paradise', 'https://stream.radioparadise.com/mp3-192', 'rock, pop, eklektik', 'ABD'],
  ['Radio Paradise Mellow', 'https://stream.radioparadise.com/mellow-192', 'sakin, chill', 'ABD'],
  ['Radio Paradise Rock', 'https://stream.radioparadise.com/rock-192', 'rock', 'ABD'],
  ['Radio Paradise Global', 'https://stream.radioparadise.com/global-192', 'dünya müziği', 'ABD'],
  ['KEXP', 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3', 'indie, alternatif', 'ABD'],
  ['NTS 1', 'https://stream-relay-geo.ntslive.net/stream', 'underground, elektronik', 'İngiltere'],
  ['NTS 2', 'https://stream-relay-geo.ntslive.net/stream2', 'underground, elektronik', 'İngiltere'],
  ['BBC Radio 1', 'https://as-hls-ww-live.akamaized.net/pool_01505109/live/ww/bbc_radio_one/bbc_radio_one.isml/bbc_radio_one-audio%3d96000.norewind.m3u8', 'pop, hit', 'İngiltere'],
  ['BBC World Service', 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service', 'haber (İngilizce)', 'İngiltere'],
  ['Capital FM', MR + 'CapitalMP3', 'pop, hit', 'İngiltere'],
  ['Capital XTRA', MR + 'CapitalXTRANationalMP3', 'hip hop, r&b', 'İngiltere'],
  ['Heart', MR + 'HeartLondonMP3', 'pop', 'İngiltere'],
  ['Radio X', MR + 'RadioXUKMP3', 'rock, indie', 'İngiltere'],
  ['Smooth Radio', MR + 'SmoothUKMP3', 'slow, soft', 'İngiltere'],
  ['Gold', MR + 'GoldMP3', 'eski hitler', 'İngiltere'],
  ['Classic FM', MR + 'ClassicFMMP3', 'klasik müzik', 'İngiltere'],
  ['Virgin Radio UK', 'https://radio.virginradio.co.uk/stream', 'pop, rock', 'İngiltere'],
  ['FIP', 'https://icecast.radiofrance.fr/fip-hifi.aac', 'eklektik', 'Fransa'],
  ['FIP Rock', 'https://icecast.radiofrance.fr/fiprock-hifi.aac', 'rock', 'Fransa'],
  ['FIP Jazz', 'https://icecast.radiofrance.fr/fipjazz-hifi.aac', 'caz, jazz', 'Fransa'],
  ['FIP Electro', 'https://icecast.radiofrance.fr/fipelectro-hifi.aac', 'elektronik', 'Fransa'],
  ['FIP Groove', 'https://icecast.radiofrance.fr/fipgroove-hifi.aac', 'funk, soul', 'Fransa'],
  ['NRJ', 'https://scdn.nrjaudio.fm/adwz2/fr/30001/mp3_128.mp3', 'pop, dance', 'Fransa'],
  ['Skyrock', 'https://icecast.skyrock.net/s/natio_mp3_128k', 'rap, hip hop', 'Fransa'],
  ['Radio 538', STW + 'RADIO538.mp3', 'pop, dance', 'Hollanda'],
  ['Sky Radio', STW + 'SKYRADIO.mp3', 'pop', 'Hollanda'],
  ['Qmusic', 'https://stream.qmusic.nl/qmusic/mp3', 'pop', 'Hollanda'],
  ['Los 40', STW + 'LOS40.mp3', 'pop, latin', 'İspanya'],
  ['Kiss FM España', 'https://kissfm.kissfmradio.cires21.com/kissfm.mp3', 'pop', 'İspanya'],
  ['Radio Deejay', 'https://streamcdnm4-4c4b867c89244861ac216426883d1ad0.msvdn.net/radiodeejay/radiodeejay/master_ma.m3u8', 'pop, dance', 'İtalya'],
  ['Radio Monte Carlo', 'https://icy.unitedradio.it/RMC.mp3', 'soft pop', 'İtalya'],
  ['Antenne Bayern', 'https://stream.antenne.de/antenne', 'pop', 'Almanya'],
  ['1LIVE', 'https://wdr-1live-live.icecastssl.wdr.de/wdr/1live/live/mp3/128/stream.mp3', 'pop, hit', 'Almanya'],
  ['Rock Antenne', 'https://stream.rockantenne.de/rockantenne/stream/mp3', 'rock', 'Almanya'],
  ['Chillhop (FluxFM)', 'https://streams.fluxfm.de/Chillhop/mp3-128/streams.fluxfm.de/', 'lofi, chill', 'Almanya'],
  ['Radio Swiss Jazz', 'https://stream.srg-ssr.ch/m/rsj/mp3_128', 'caz, jazz', 'İsviçre'],
  ['Radio Swiss Pop', 'https://stream.srg-ssr.ch/m/rsp/mp3_128', 'pop', 'İsviçre'],
  ['Radio Swiss Classic', 'https://stream.srg-ssr.ch/m/rsc_de/mp3_128', 'klasik müzik', 'İsviçre'],
  ['Europa Plus', 'https://ep256.hostingradio.ru:8052/europaplus256.mp3', 'pop, dance', 'Rusya'],
  ['Radio Record', 'https://radiorecord.hostingradio.ru/rr_main96.aacp', 'elektronik, dance', 'Rusya'],
  ['181.fm 90s Alternative', 'https://listen.181fm.com/181-90salt_128k.mp3', '90lar, alternatif', 'ABD'],
  ['181.fm Awesome 80s', 'https://listen.181fm.com/181-awesome80s_128k.mp3', '80ler', 'ABD'],
  ['LISTEN.moe J-pop', 'https://listen.moe/stream', 'j-pop, anime', 'Japonya'],
  ['LISTEN.moe K-pop', 'https://listen.moe/kpop/stream', 'k-pop', 'Kore']
].map(([name, url, tags, country]) => ({ name, url_resolved: url, favicon: '', tags, bitrate: 0, country, yerlesik: true }));
function yerlesikAra(q, cc){
  const k = String(q || '').toLocaleLowerCase('tr-TR');
  const havuz = cc === 'TR' ? YERLESIK_RADYO : DUNYA_RADYO.concat(YERLESIK_RADYO);
  return havuz.filter(s => !k || (s.name + ' ' + s.tags + ' ' + s.country).toLocaleLowerCase('tr-TR').includes(k));
}
// TuneIn: dünya radyoları, bizim sunucu üzerinden aranır
async function tuneinAra(q){
  const r = await fetch('/api/radyo/tunein?' + new URLSearchParams({ q }));
  if (!r.ok) throw new Error('tunein');
  const j = await r.json();
  return (Array.isArray(j) ? j : []).filter(x => x && /^s\d+$/.test(x.tid)).map(x => ({ name: x.name, tid: x.tid, url_resolved: '', favicon: x.favicon || '', tags: x.tags || '', country: '', bitrate: 0 }));
}
// bir yayın adresi bu tarayıcıda çalıyor mu? (sessizce dener)
function radyoDene(url, ms){
  return new Promise(async res => {
    const a = new Audio(); a.muted = true; a.preload = 'auto'; let h = null, bitti = false;
    const son = v => { if (bitti) return; bitti = true; clearTimeout(t); try { h && h.destroy(); } catch(e){} a.removeAttribute('src'); try { a.load(); } catch(e){} res(v); };
    const t = setTimeout(() => son(false), ms || 7000);
    a.oncanplay = () => son(true); a.onerror = () => son(false);
    if (/\.m3u8(\?|$)/i.test(url) && !a.canPlayType('application/vnd.apple.mpegurl')){
      try { await hlsYukle(); } catch(e){ return son(false); }
      if (!window.Hls || !Hls.isSupported()) return son(false);
      h = new Hls(); h.on(Hls.Events.ERROR, (e, d) => { if (d.fatal) son(false); }); h.loadSource(url); h.attachMedia(a);
    } else { a.src = url; a.load(); }
  });
}
// TuneIn istasyonunun çalışan yayın adresini bul (bir kez bulunur, sonra hatırlanır)
async function tuneinAdres(st){
  if (st.url) return st.url;
  const r = await fetch('/api/radyo/cal?' + new URLSearchParams({ id: st.tid }));
  const j = r.ok ? await r.json() : {};
  for (const u of (Array.isArray(j.adaylar) ? j.adaylar : []).filter(x => /^https:\/\//i.test(x)).slice(0, 6)){
    if (await radyoDene(u, 7000)){ st.url = u; return u; }
  }
  throw new Error('çalan adres yok');
}
function rbZamanli(url, ms){
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), ms);
  return fetch(url, { signal: ctl.signal }).then(r => { if (!r.ok) throw new Error('durum ' + r.status); return r.json(); })
    .then(j => { if (!Array.isArray(j)) throw new Error('liste değil'); return j; })
    .finally(() => clearTimeout(tm));
}
// Tüm sunucular aynı anda denenir, ilk cevap veren kazanır. 2,5 sn içinde cevap yoksa bizim sunucu (Netlify) üzerinden de denenir.
// Hepsi başarısız olursa bu cihazda en son alınan liste gösterilir.
async function rbSearch(q, cc){
  const params = new URLSearchParams({ limit: '150', hidebroken: 'true', order: 'clickcount', reverse: 'true' });
  if (q) params.set('name', q);
  if (cc) params.set('countrycode', cc);
  const key = (cc || '*') + '|' + q.toLocaleLowerCase('tr-TR');
  const dogrudan = Promise.any(RB_HOSTS.map(h => rbZamanli(h + '/json/stations/search?' + params, 8000)));
  const yedek = new Promise(r => setTimeout(r, 2500)).then(() => rbZamanli('/api/radyo/ara?' + new URLSearchParams({ name: q, cc }), 12000));
  try {
    const res = await Promise.any([dogrudan, yedek]);
    try { const c = JSON.parse(localStorage.getItem(RB_CACHE) || '{}'); c[key] = res.slice(0, 150); const ks = Object.keys(c); while (ks.length > 12) delete c[ks.shift()]; localStorage.setItem(RB_CACHE, JSON.stringify(c)); } catch(e){}
    return res;
  } catch(e){
    let onbellek = null;
    try { const c = JSON.parse(localStorage.getItem(RB_CACHE) || '{}'); onbellek = c[key] || null; } catch(e2){}
    if (onbellek && !q){ rbSearch.eski = true; return onbellek; }
    // dizin kapalı: yerleşik liste + (arama yazıldıysa) TuneIn
    const y = yerlesikAra(q, cc);
    const t = q ? await tuneinAra(q).catch(() => []) : [];
    if (y.length || t.length){ rbSearch.eski = 'yerlesik'; return y.concat(t); }
    if (onbellek){ rbSearch.eski = true; return onbellek; }
    throw new Error('radyo listesi alınamadı');
  }
}
// ---------- favori radyolar (bu cihazda saklanır) ----------
const FAV_KEY = 'oyunodasi-radyo-fav';
function radioFavs(){ try { const l = JSON.parse(localStorage.getItem(FAV_KEY)); return Array.isArray(l) ? l : []; } catch(e){ return []; } }
function saveFavs(l){ try { localStorage.setItem(FAV_KEY, JSON.stringify(l.slice(0, 80))); } catch(e){} renderFavCount(); }
const isFav = url => radioFavs().some(f => f.url === url);
function toggleFav(st){
  const l = radioFavs();
  const i = l.findIndex(f => f.url === st.url);
  if (i >= 0){ l.splice(i, 1); saveFavs(l); toast('☆ Favorilerden çıkarıldı'); return false; }
  l.unshift({ name: clip(st.name, 80), url: st.url, favicon: st.favicon || '', tags: clip(st.tags || '', 80) });
  saveFavs(l); toast('⭐ ' + clip(st.name, 40) + ' favorilere eklendi'); return true;
}
function renderFavCount(){
  const n = radioFavs().length;
  const t = $('radioTabFav'); if (t) t.textContent = '⭐ Favorilerim' + (n ? ' (' + n + ')' : '');
  const fb = $('radioFavBtn'); if (fb) fb.hidden = !joined;
  const rs = $('rcFav'); if (rs && radio){ const on = isFav(radio.url); rs.textContent = on ? '★' : '☆'; rs.classList.toggle('on', on); rs.title = on ? 'Favorilerden çıkar' : 'Favorilere ekle'; }
}
function stationRow(st, sub){
  const b = document.createElement('div'); b.className = 'station'; b.tabIndex = 0; b.setAttribute('role', 'button');
  const ph = document.createElement('span'); ph.className = 'ph'; ph.textContent = '📻';
  if (st.favicon){
    const im = document.createElement('img'); im.src = st.favicon; im.alt = ''; im.loading = 'lazy';
    im.onerror = () => im.replaceWith(ph);
    b.append(im);
  } else b.append(ph);
  const t = document.createElement('span'); t.className = 't';
  const nm = document.createElement('b'); nm.textContent = st.name;
  const sb = document.createElement('span'); sb.textContent = sub;
  t.append(nm, sb); b.append(t);
  const fav = document.createElement('button'); fav.type = 'button'; fav.className = 'st-fav' + (isFav(st.url) ? ' on' : '');
  fav.textContent = isFav(st.url) ? '★' : '☆'; fav.title = 'Favorilere ekle / çıkar';
  fav.onclick = async e => {
    e.stopPropagation();
    if (!st.url && st.tid){
      fav.disabled = true; fav.textContent = '…';
      try { await tuneinAdres(st); } catch(er){ fav.disabled = false; fav.textContent = '☆'; toast('Bu radyo şu an açılamadı, başka bir istasyon dene.'); return; }
      fav.disabled = false;
    }
    const on = toggleFav(st); fav.textContent = on ? '★' : '☆'; fav.classList.toggle('on', on);
    if (!on && radioTab === 'fav') b.remove();
  };
  b.append(fav);
  const play = async () => {
    if (!st.url && st.tid){
      if (b.classList.contains('yukleniyor')) return;
      b.classList.add('yukleniyor'); sb.textContent = '⏳ Bağlanıyor…';
      try { await tuneinAdres(st); }
      catch(er){ b.classList.remove('yukleniyor'); sb.textContent = '❌ Bu radyo şu an açılamıyor'; return; }
      b.classList.remove('yukleniyor'); sb.textContent = sub;
    }
    setRadio({ name: st.name, url: st.url, favicon: st.favicon || '', tags: st.tags || '' }); $('radioDlg').close(); toast('📻 ' + st.name + ' çalıyor');
  };
  b.onclick = play;
  b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); play(); } };
  return b;
}
let radioTab = 'ara';
function setRadioTab(t){
  radioTab = t;
  $('radioTabAra').classList.toggle('on', t === 'ara'); $('radioTabFav').classList.toggle('on', t === 'fav');
  $('radioForm').hidden = t !== 'ara';
  if (t === 'fav') renderFavList(); else doRadioSearch();
}
function renderFavList(){
  const list = $('radioList'); list.innerHTML = '';
  const l = radioFavs();
  if (!l.length){ list.innerHTML = '<p class="note">Henüz favorin yok. “Ara” sekmesinde beğendiğin istasyonun yanındaki ☆ yıldıza bas.</p>'; return; }
  l.forEach(st => list.append(stationRow(st, st.tags || '')));
}
let rbSira = 0;
async function doRadioSearch(){
  const list = $('radioList'), sira = ++rbSira;
  list.innerHTML = '<p class="note">Aranıyor…</p>';
  try {
    rbSearch.eski = false;
    const res = await rbSearch($('radioQuery').value.trim(), $('radioScope').value);
    if (radioTab !== 'ara' || sira !== rbSira) return;
    const seen = new Set();
    const items = (Array.isArray(res) ? res : [])
      .filter(s => s && ((typeof s.url_resolved === 'string' && /^https:\/\//i.test(s.url_resolved)) || (typeof s.tid === 'string' && /^s\d+$/.test(s.tid))))
      .filter(s => { const k = String(s.name || '').trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 60);
    list.innerHTML = '';
    if (rbSearch.eski === 'yerlesik') list.innerHTML = '<p class="note">⚠️ Radyo dizini şu an kapalı, yerleşik liste' + ($('radioQuery').value.trim() ? ' ve TuneIn sonuçları' : '') + ' gösteriliyor. Yabancı radyolar için “Tüm dünya”yı seç ya da isim yazıp ara (ör. jazz, BBC, rock).</p>';
    else if (rbSearch.eski) list.innerHTML = '<p class="note">⚠️ Radyo dizinine şu an ulaşılamadı, en son kaydedilen liste gösteriliyor.</p>';
    if (!items.length){ list.innerHTML = '<p class="note">Sonuç bulunamadı. Başka bir isim dene ya da “Tüm dünya”yı seç.</p>'; return; }
    items.forEach(s => {
      const fav = typeof s.favicon === 'string' && /^https:\/\//i.test(s.favicon) ? s.favicon : '';
      const tags = String(s.tags || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 3).join(', ');
      const sub = [tags, s.bitrate ? s.bitrate + ' kbps' : '', s.country || ''].filter(Boolean).join(' · ');
      list.append(stationRow({ name: String(s.name).trim(), url: s.url_resolved || '', tid: s.tid || '', favicon: fav, tags }, s.tid ? [tags, 'TuneIn'].filter(Boolean).join(' · ') : sub));
    });
  } catch(e){
    if (radioTab !== 'ara' || sira !== rbSira) return;
    list.innerHTML = '<p class="note">Radyo listesi şu an alınamadı. İnternet bağlantını kontrol edip tekrar dene.</p>';
    const tb = document.createElement('button'); tb.type = 'button'; tb.className = 'btn'; tb.textContent = '🔄 Tekrar dene'; tb.onclick = doRadioSearch;
    list.append(tb);
  }
}
$('radioForm').onsubmit = e => { e.preventDefault(); doRadioSearch(); };
$('radioScope').onchange = doRadioSearch;
function openRadioDialog(tab){
  $('radioDlg').showModal(); renderFavCount();
  if (tab === 'fav' || (!tab && radioTab === 'fav')){ setRadioTab('fav'); return; }
  if (radioTab !== 'ara') setRadioTab('ara');
  else if (!$('radioList')._loaded){ $('radioList')._loaded = true; doRadioSearch(); }
}
$('radioTabAra').onclick = () => setRadioTab('ara');
$('radioTabFav').onclick = () => setRadioTab('fav');
{ const fb = $('radioFavBtn'); if (fb) fb.onclick = () => openRadioDialog('fav'); }
$('rcFav').onclick = () => { if (radio){ toggleFav(radio); renderFavCount(); } };

// ---------- gelen mesajlar ----------
function musicOnData(id, d){
  switch (d.t){
    case 'q-add':
      if (validItem(d.item, id) && !queue.some(x => x.id === d.item.id)){ queue.push(cleanItem(d.item)); sortQueue(); refreshMusicUI(); }
      return true;
    case 'q-start': if (typeof d.id === 'string') applyStart(d.id); return true;
    case 'q-ended': if (current && current.id === d.id && current.owner === id) advance(d.id); return true;
    case 'q-skip': if (typeof d.id === 'string') skipItemLocal(d.id); return true;
    case 'q-pause': applyPause(!!d.paused); return true;
    case 'q-seek': if (typeof d.id === 'string') applySeek(d.id, Number(d.pos)); return true;
    case 'q-pos':
      if (current && current.id === d.id && id === current.owner){
        current.pos = Number(d.pos) || 0; current.dur = Number(d.dur) || 0; current.paused = !!d.paused; current.at = performance.now();
        updateMusicProgress();
      }
      return true;
    case 'q-remove': {
      const it = queue.find(x => x.id === d.id);
      if (it && (id === it.owner || id === currentHostId)) removeItemLocal(d.id);
      return true;
    }
    case 'radio': applyRadio(d.station, id); return true;
    case 'radio-pause': applyRadioPause(!!d.paused, id); return true;
    case 'lib-changed': if (typeof loadLibrary === 'function') loadLibrary(); return true;
  }
  return false;
}
function musicStateForSync(){
  return {
    queue, radio: radio && { name: radio.name, url: radio.url, favicon: radio.favicon, tags: radio.tags, by: radio.by, paused: !!radio.paused },
    current: current && { id: current.id, pos: estPos(), dur: current.dur, paused: current.paused }
  };
}
function applyMusicState(s){
  if (Array.isArray(s.queue)) queue = s.queue.filter(it => validItem(it)).map(cleanItem);
  sortQueue();
  if (s.current && queue.some(x => x.id === s.current.id)){
    const it = queue.find(x => x.id === s.current.id);
    current = { id: it.id, owner: it.owner, ownerName: it.ownerName, title: it.title, lib: it.lib, pos: Number(s.current.pos) || 0, dur: Number(s.current.dur) || 0, paused: !!s.current.paused, at: performance.now() };
  }
  if (s.radio){ applyRadio(s.radio, s.radio.by, true); if (s.radio.paused) applyRadioPause(true, s.radio.by, true); }
  refreshMusicUI();
}

// ---------- görünüm ----------
function refreshMusicUI(){
  if (!joined) return;
  if (myChan().type === 'music') renderMusicDeck($('deck'));
  renderChannels();
}
function renderMusicDeck(d){
  d.innerHTML = '';
  const color = radio ? colorFor(radio.by) : current ? colorFor(current.owner) : '#ff7ab6';
  const np = document.createElement('div');
  np.className = 'np' + (((radio && !radio.paused) || (current && !current.paused)) ? ' playing' : '');
  np.style.setProperty('--c', color);
  const vinyl = document.createElement('div'); vinyl.className = 'vinyl';
  if (radio){ const r = document.createElement('span'); r.className = 'radio-ico'; r.textContent = '📻'; vinyl.append(r); }
  const info = document.createElement('div'); info.className = 'np-info';
  const tag = document.createElement('span'); tag.className = 'tag';
  const title = document.createElement('h2'); title.className = 'np-title';
  const sub = document.createElement('p'); sub.className = 'np-sub';
  if (radio){
    tag.textContent = radio.paused ? '⏸ Radyo duraklatıldı' : '📻 Radyo';
    title.textContent = radio.name;
    sub.textContent = [radio.tags, radio.byName ? radio.byName + ' açtı' : '', 'odadaki herkes dinliyor'].filter(Boolean).join(' · ');
  } else if (current){
    tag.textContent = current.loading ? '⏳ İndiriliyor…' : current.paused ? '⏸ Duraklatıldı' : '🎵 Şimdi çalıyor';
    title.textContent = current.title;
    const ls = current.lib && typeof songById === 'function' && songById(current.lib);
    const who = current.owner === peer.id ? 'sen' : (current.ownerName || 'biri');
    sub.textContent = (ls ? ls.by + ' yükledi · ' + who + ' çalıyor' : current.owner === peer.id ? 'Sen yükledin' : (current.ownerName || 'Biri') + ' yükledi') + (queue.length > 1 ? ' · Sırada ' + (queue.length - 1) + ' şarkı' : '');
  } else {
    tag.textContent = '🎵 Müzik Odası';
    title.textContent = 'Henüz bir şey çalmıyor';
    sub.textContent = 'Kütüphaneden bir şarkı ya da playlist seç, müzik yükle ya da radyo aç. Bu kanaldaki herkes aynı anda dinler.';
  }
  const viz = document.createElement('canvas'); viz.className = 'np-viz'; viz.id = 'npViz'; viz._c = color;
  info.append(tag, title, sub, viz);
  if (current && !radio){
    const prog = document.createElement('div'); prog.className = 'np-progress seekable';
    prog.title = 'İleri / geri sarmak için tıkla ya da sürükle';
    const bar = document.createElement('i'); bar.id = 'npProg'; prog.append(bar);
    const knob = document.createElement('b'); knob.className = 'np-knob'; prog.append(knob);
    // tıkla / sürükle: bırakınca herkes için o noktaya atlar
    const frac = e => { const r = prog.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
    prog.onpointerdown = e => {
      if (!current || !current.dur) return;
      e.preventDefault(); prog.setPointerCapture(e.pointerId); prog.classList.add('drag');
      const show = ev => { const f = frac(ev); bar.style.width = knob.style.left = f * 100 + '%'; const p = $('npPos'); if (p) p.textContent = fmtTime(f * current.dur); };
      show(e);
      prog.onpointermove = show;
      prog.onpointerup = ev => { prog.onpointermove = null; prog.onpointerup = null; prog.classList.remove('drag'); if (current && current.dur) seekTo(frac(ev) * current.dur); };
    };
    const tm = document.createElement('div'); tm.className = 'np-time';
    tm.innerHTML = '<span id="npPos">0:00</span><span id="npDur"></span>';
    info.append(prog, tm);
  }
  const ctl = document.createElement('div'); ctl.className = 'np-ctl';
  const btn = (label, fn, cls) => { const b = document.createElement('button'); b.className = 'btn ' + (cls || ''); b.textContent = label; b.onclick = fn; ctl.append(b); return b; };
  btn('🎵 Müzik yükle', () => $('musicInput').click(), 'primary');
  btn('📻 Radyo', () => openRadioDialog());
  btn('⭐ Favori radyolar', () => openRadioDialog('fav'));
  if (current && !radio){
    btn('⏪ 10 sn', () => seekBy(-10)).title = '10 saniye geri';
    btn(current.paused ? '▶ Devam' : '⏸ Duraklat', togglePause);
    btn('10 sn ⏩', () => seekBy(10)).title = '10 saniye ileri';
    btn('⏭ Geç', () => skipItem(current.id));
  }
  if (radio){
    btn(radio.paused ? '▶ Devam et' : '⏸ Durdur', () => setRadioPaused(!radio.paused), radio.paused ? 'primary' : '');
    btn('⏹ Radyoyu kapat', () => setRadio(null));
  }
  if (!current && !radio && queue.length) btn('▶ Sırayı başlat', () => startItem(queue[0].id));
  const vol = document.createElement('div'); vol.className = 'vol';
  if (radio){
    // radyo çalarken bu kaydırıcı radyonun sesini ayarlar (üst şeritteki radyo sesiyle aynı)
    vol.innerHTML = '<span>📻</span><input type="range" data-radiovol min="0" max="100" aria-label="Radyo sesi"><output data-radioout></output>';
  } else {
    vol.innerHTML = '<span>🔊</span><input type="range" id="musicVol" min="0" max="100" aria-label="Müzik sesi"><output id="musicOut"></output>';
  }
  ctl.append(vol);
  info.append(ctl);
  np.append(vinyl, info);
  d.append(np);
  const r = vol.querySelector('input'), o = vol.querySelector('output');
  if (radio){ r.value = Math.round(radioVol * 100); o.textContent = r.value + '%'; r.oninput = () => setRadioVol(r.value / 100); }
  else { r.value = Math.round(musicVol * 100); o.textContent = r.value + '%'; r.oninput = () => setMusicVol(r.value / 100); }

  const upcoming = queue.filter(x => !current || x.id !== current.id);
  if (upcoming.length){
    const q = document.createElement('div'); q.className = 'queue';
    const h = document.createElement('h4'); h.textContent = 'Sırada (' + upcoming.length + ')';
    q.append(h);
    upcoming.forEach((it, i) => {
      const row = document.createElement('div'); row.className = 'q-item';
      const n = document.createElement('span'); n.className = 'n'; n.textContent = i + 1;
      const t = document.createElement('span'); t.className = 't'; t.textContent = it.title;
      const o = document.createElement('span'); o.className = 'o'; o.textContent = it.owner === peer.id ? 'sen' : it.ownerName;
      row.append(n, t, o);
      if (it.owner === peer.id || isHost){
        const x = document.createElement('button'); x.textContent = '✕'; x.title = 'Sıradan çıkar'; x.onclick = () => removeItem(it.id);
        row.append(x);
      }
      q.append(row);
    });
    const note = document.createElement('p'); note.className = 'note'; note.textContent = 'Şarkıyı sıraya ekleyen kişi odadan çıkarsa onun eklediği şarkılar sıradan düşer (kütüphanede kalır).';
    q.append(note);
    d.append(q);
  }
  if (typeof libSection === 'function') d.append(libSection());
  updateMusicProgress();
}
function updateMusicProgress(){
  const bar = $('npProg'); if (!bar || !current) return;
  if (bar.parentNode.classList.contains('drag')) return;
  const pos = estPos(), dur = current.dur || 0;
  bar.style.width = dur ? Math.min(100, pos / dur * 100) + '%' : '0';
  const kn = bar.parentNode.querySelector('.np-knob'); if (kn) kn.style.left = bar.style.width;
  const p = $('npPos'), q = $('npDur');
  if (p) p.textContent = fmtTime(pos);
  if (q) q.textContent = dur ? fmtTime(dur) : '';
}
setInterval(updateMusicProgress, 500);

// müzik görselleştirici: çalan şarkının frekanslarına göre zıplayan çubuklar (radyoda yumuşak bir dalga)
const mbuf = new Uint8Array(256);
function drawMusicViz(){
  const cv = $('npViz'); if (!cv) return;
  const w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(w * dpr)){ cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  let an = null;
  if (current && !current.paused && !radio){
    if (current.owner === peer.id) an = musicLocalAn;
    else { const p = peers.get(current.owner); an = p && p.musicAnalyser; }
  }
  const n = 56, hs = cv._h || (cv._h = new Float32Array(n));
  const t = performance.now() / 1000;
  if (an) an.getByteFrequencyData(mbuf);
  for (let i = 0; i < n; i++){
    let v;
    if (an){
      const k = i < n / 2 ? n / 2 - 1 - i : i - n / 2;      // ortadan dışa doğru ayna
      v = mbuf[Math.floor(k * (an.frequencyBinCount * 0.6) / (n / 2))] / 255;
    } else if (radio && !radio.paused) v = 0.18 + 0.22 * Math.abs(Math.sin(t * 2.1 + i * 0.45) * Math.sin(t * 1.3 + i * 0.13));
    else v = 0.03;
    hs[i] = v > hs[i] ? v : hs[i] * 0.88 + v * 0.12;
  }
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = cv._c || '#ff7ab6';
  const step = cv.width / n, bw = Math.max(2, step * 0.62);
  for (let i = 0; i < n; i++){
    const bh = Math.max(3 * dpr, hs[i] * cv.height);
    ctx.globalAlpha = 0.45 + 0.55 * hs[i];
    const x = i * step + (step - bw) / 2, y = (cv.height - bh) / 2;
    if (ctx.roundRect){ ctx.beginPath(); ctx.roundRect(x, y, bw, bh, bw / 2); ctx.fill(); }
    else ctx.fillRect(x, y, bw, bh);
  }
  ctx.globalAlpha = 1;
}
