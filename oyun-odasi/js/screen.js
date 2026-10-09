// Ekran paylaşımı ve film yayını: kalite ayarları, canlı kalite değiştirme, FPS/hız/donma göstergesi,
// büyütme ve tam ekran.
let screenStream = null;          // paylaştığım görüntü (ekran ya da dosyadan film)
let shareInfo = null;             // { mode, title, localEl, onStop, fromFile }
const outScreen = new Map();      // izleyici id -> giden çağrı
let localScreenTile = null;

// Donmayı azaltmak için kodlayıcıya hedef bit hızı/kare hızı veriyoruz ve internet zayıflayınca
// neyi feda edeceğini söylüyoruz (oyunda netlik düşsün akıcılık kalsın; yazıda tersi).
const QUALITY = {
  motion:   { label: '🎮 Oyun – en akıcı',      desc: '720p, 60 fps. Hızlı oyunlar için; internet zayıflarsa önce netlik düşer.', w: 1280, h: 720,  fps: 60, br: 3500000, deg: 'maintain-framerate',  hint: 'motion' },
  balanced: { label: '⚖️ Dengeli – önerilen',   desc: '1080p, 30 fps. Çoğu oyun ve video için.',                                  w: 1920, h: 1080, fps: 30, br: 3000000, deg: 'balanced',            hint: 'motion' },
  film:     { label: '🎬 Film',                  desc: '1080p, 30 fps, yüksek bit hızı ve stereo ses. İzleyende yarım saniyelik tampon: takılma yerine akıcı oynar.', w: 1920, h: 1080, fps: 30, br: 5000000, deg: 'maintain-framerate', hint: 'motion' },
  detail:   { label: '📄 Yazı / net görüntü',    desc: '1080p, 15 fps. Kod, menü, belge gibi yazının okunması gereken şeyler için.', w: 1920, h: 1080, fps: 15, br: 2000000, deg: 'maintain-resolution', hint: 'detail' },
  low:      { label: '🐢 Zayıf internet',        desc: '720p, 30 fps, düşük bit hızı. Yükleme hızın düşükse donmayı en aza indirir.', w: 1280, h: 720, fps: 30, br: 1200000, deg: 'balanced', hint: 'motion' }
};
let shareQ = QUALITY[store.get('oyunodasi-q')] ? store.get('oyunodasi-q') : 'balanced';

function tuneSender(call){
  const pc = call && call.peerConnection; if (!pc) return;
  const q = QUALITY[shareQ];
  const viewers = Math.max(1, outScreen.size);
  // çok izleyici varsa yükleme hızın bölüşülür; her birine biraz daha az gönder
  const br = Math.round(q.br * (viewers >= 4 ? 0.6 : viewers === 3 ? 0.8 : 1));
  pc.getSenders().forEach(s => {
    if (!s.track) return;
    try {
      const prm = s.getParameters();
      if (!prm.encodings || !prm.encodings.length) prm.encodings = [{}];
      if (s.track.kind === 'video'){
        prm.encodings[0].maxBitrate = br;
        prm.encodings[0].maxFramerate = q.fps;
        prm.degradationPreference = q.deg;
      } else {
        prm.encodings[0].maxBitrate = 256000;   // oyun/film sesi: stereo, yüksek kalite
      }
      s.setParameters(prm).catch(() => {});
    } catch(e){}
  });
}
function tuneSenderSoon(call){ [0, 1500, 4000].forEach(ms => setTimeout(() => tuneSender(call), ms)); }

function callScreen(id){
  if (outScreen.has(id) || !screenStream) return;
  const call = peer.call(id, screenStream, { metadata: { kind: 'screen', mode: shareInfo ? shareInfo.mode : shareQ, title: shareInfo ? shareInfo.title : '' }, sdpTransform: sdpHiFi });
  if (!call) return;
  outScreen.set(id, call);
  call.on('close', () => { if (outScreen.get(id) === call) outScreen.delete(id); });
  tuneSenderSoon(call);
  outScreen.forEach(c => { if (c !== call) tuneSender(c); });
}
// görüntüyü sadece benimle aynı kanaldakilere gönder
function syncScreenOut(){
  peers.forEach(p => {
    const want = !!screenStream && p.linked && sameChan(p);
    if (want && !outScreen.has(p.id)) callScreen(p.id);
    if (!want && outScreen.has(p.id)){ try { outScreen.get(p.id).close(); } catch(e){} outScreen.delete(p.id); }
  });
}

// ---------- paylaşım seçenekleri ----------
function openShareDialog(){
  const box = $('shareOpts'); box.innerHTML = '';
  const order = myChan().type === 'film' ? ['film', 'balanced', 'motion', 'detail', 'low'] : ['balanced', 'motion', 'detail', 'film', 'low'];
  order.forEach(k => {
    const q = QUALITY[k];
    const b = document.createElement('button'); b.className = 'btn share-opt' + (k === shareQ ? ' on' : '');
    const t = document.createElement('b'); t.textContent = q.label;
    const d = document.createElement('span'); d.textContent = q.desc;
    b.append(t, d);
    b.onclick = () => { shareQ = k; store.set('oyunodasi-q', k); $('shareDlg').close(); startScreenShare(); };
    box.append(b);
  });
  const n = document.createElement('p'); n.className = 'note';
  n.textContent = 'Oyun/film sesini de paylaşmak için açılan pencerede “Ses paylaş” kutusunu işaretle. Netflix gibi korumalı sitelerde görüntü siyah görünebilir.';
  box.append(n);
  $('shareDlg').showModal();
}
$('shareBtn').onclick = () => { if (screenStream) stopShare(); else openShareDialog(); };

async function startScreenShare(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia){ toast('Bu cihaz ekran paylaşımını desteklemiyor.'); return; }
  const q = QUALITY[shareQ];
  let s;
  try {
    s = await navigator.mediaDevices.getDisplayMedia({
      video: { width: { ideal: q.w, max: q.w }, height: { ideal: q.h, max: q.h }, frameRate: { ideal: q.fps, max: q.fps } },
      audio: true, selfBrowserSurface: 'exclude', surfaceSwitching: 'include', systemAudio: 'include'
    });
  } catch(e){ return; }
  startShareWithStream(s, { mode: shareQ, title: '' });
}

// ortak başlangıç: ekran paylaşımı ve dosyadan film aynı yoldan geçer
function startShareWithStream(stream, info){
  if (screenStream) stopShare();
  screenStream = stream;
  shareInfo = info || { mode: shareQ };
  const vt = stream.getVideoTracks()[0];
  if (vt){
    try { vt.contentHint = QUALITY[shareQ].hint; } catch(e){}
    vt.addEventListener('ended', () => { if (screenStream === stream) stopShare(); });
  }
  syncScreenOut();
  broadcast({ t: 'state', sharing: true });
  $('shareBtn').className = 'btn on'; $('shareBtn').innerHTML = '🖥 <span class="lbl">Paylaşımı durdur</span>';
  showLocalScreen();
  renderSelf(); renderChannels(); renderDeck();
}
function stopShare(){
  if (!screenStream) return;
  const info = shareInfo;
  screenStream.getTracks().forEach(t => t.stop());
  screenStream = null; shareInfo = null;
  outScreen.forEach(c => { try { c.close(); } catch(e){} });
  outScreen.clear();
  broadcast({ t: 'state', sharing: false });
  $('shareBtn').className = 'btn'; $('shareBtn').innerHTML = '🖥 <span class="lbl">Ekran paylaş</span>';
  if (localScreenTile){ removeTile(localScreenTile); localScreenTile = null; }
  if (info && info.onStop) info.onStop();
  updateStage(); renderSelf(); renderChannels(); renderDeck();
}

// yayın sürerken kaliteyi değiştir
async function changeQuality(k){
  if (!QUALITY[k]) return;
  shareQ = k; store.set('oyunodasi-q', k);
  const q = QUALITY[k];
  const vt = screenStream && screenStream.getVideoTracks()[0];
  if (vt && !(shareInfo && shareInfo.fromFile)){
    try { await vt.applyConstraints({ width: { max: q.w }, height: { max: q.h }, frameRate: { max: q.fps } }); } catch(e){}
  }
  if (vt) try { vt.contentHint = q.hint; } catch(e){}
  outScreen.forEach(tuneSender);
  toast('Kalite: ' + q.label);
}

// ---------- büyüt (pencereyi kaplasın) ve tam ekran ----------
const isFull = () => document.fullscreenElement || document.webkitFullscreenElement;
function toggleFullscreen(tile){
  const v = tile.querySelector('video');
  if (isFull()){ (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  const req = tile.requestFullscreen || tile.webkitRequestFullscreen;
  if (req) Promise.resolve(req.call(tile)).catch(() => { if (v && v.webkitEnterFullscreen) v.webkitEnterFullscreen(); else toast('Tam ekran açılamadı.'); });
  else if (v && v.webkitEnterFullscreen) v.webkitEnterFullscreen();   // iPhone Safari
  else toast('Bu cihaz tam ekranı desteklemiyor.');
}
function setTheater(tile){
  const on = tile && !tile.classList.contains('focused');
  document.querySelectorAll('.screen.focused').forEach(t => t.classList.remove('focused'));
  $('room').classList.toggle('theater', !!on);
  if (on) tile.classList.add('focused');
  document.querySelectorAll('.screen').forEach(t => {
    const b = t.querySelector('[data-act="theater"]');
    if (b) b.textContent = t.classList.contains('focused') ? '⤡ Küçült' : '⤢ Büyüt';
  });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !isFull() && $('room').classList.contains('theater')) setTheater(null); });
const syncFsButtons = () => document.querySelectorAll('[data-act="full"]').forEach(b => b.textContent = isFull() === b.closest('.screen') ? '✕ Tam ekrandan çık' : '⛶ Tam ekran');
document.addEventListener('fullscreenchange', syncFsButtons);
document.addEventListener('webkitfullscreenchange', syncFsButtons);

let showStats = store.get('oyunodasi-stats') !== '0';
function setShowStats(on){
  showStats = on; store.set('oyunodasi-stats', on ? '1' : '0');
  document.querySelectorAll('.screen .stats').forEach(s => s.classList.toggle('hide', !on));
  document.querySelectorAll('[data-act="stats"]').forEach(b => b.textContent = on ? '📊 FPS gizle' : '📊 FPS göster');
}

// ortak kutucuk: görüntü + sağ üstte büyüt/tam ekran/FPS + altta isim şeridi
function makeTile(title, media, opts = {}){
  const tile = document.createElement('div'); tile.className = 'screen';
  if (media.tagName === 'VIDEO'){
    media.autoplay = true; media.playsInline = true;
    media.ondblclick = () => toggleFullscreen(tile);
  }
  const tools = document.createElement('div'); tools.className = 'screen-tools';
  if (opts.extraTools) opts.extraTools.forEach(t => tools.append(t));
  if (opts.stats !== false){
    const st = document.createElement('button'); st.dataset.act = 'stats'; st.textContent = showStats ? '📊 FPS gizle' : '📊 FPS göster';
    st.onclick = () => setShowStats(!showStats);
    tools.append(st);
  }
  const th = document.createElement('button'); th.dataset.act = 'theater'; th.textContent = '⤢ Büyüt'; th.title = 'Pencereyi kaplasın (Esc ile küçült)';
  th.onclick = () => setTheater(tile);
  const fs = document.createElement('button'); fs.dataset.act = 'full'; fs.textContent = '⛶ Tam ekran'; fs.title = 'Tam ekran (videoya çift tıklayarak da açılır)';
  fs.onclick = () => toggleFullscreen(tile);
  tools.append(th, fs);
  const bar = document.createElement('div'); bar.className = 'screen-bar';
  const who = document.createElement('span'); who.className = 'who'; who.textContent = title;
  bar.append(who);
  tile.append(media, tools, bar);
  if (opts.stats !== false){
    const s = document.createElement('div'); s.className = 'stats' + (showStats ? '' : ' hide'); s.textContent = '…';
    tile.append(s); tile._stats = s;
  }
  tile._bar = bar;
  if (media.tagName === 'VIDEO') media.play().catch(() => {});
  return tile;
}
function removeTile(tile){
  if (!tile) return;
  if (isFull() === tile) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  if (tile.classList.contains('focused')) setTheater(null);
  clearInterval(tile._statsTimer);
  tile.remove();
}
function screenTitleFor(p){
  if (p.screenMode === 'film') return '🎬 ' + p.name + (p.screenTitle ? ' – ' + p.screenTitle : ' film yayınlıyor');
  return p.name + ' ekranı';
}

function showLocalScreen(){
  removeTile(localScreenTile);
  // dosyadan filmde kendi oynatıcını görürsün (durdur/ileri sar), ekran paylaşımında önizleme
  let media;
  if (shareInfo && shareInfo.localEl) media = shareInfo.localEl;
  else { media = document.createElement('video'); media.muted = true; media.srcObject = screenStream; }
  const sel = document.createElement('select'); sel.title = 'Yayın kalitesi'; sel.setAttribute('aria-label', 'Yayın kalitesi');
  Object.entries(QUALITY).forEach(([k, q]) => { const o = document.createElement('option'); o.value = k; o.textContent = q.label; if (k === shareQ) o.selected = true; sel.append(o); });
  sel.onchange = () => changeQuality(sel.value);
  const stop = document.createElement('button'); stop.textContent = '⏹ Durdur'; stop.onclick = stopShare;
  const title = shareInfo && shareInfo.fromFile ? '🎬 Senin yayının – ' + (shareInfo.title || 'film') : 'Senin ekranın (önizleme)';
  localScreenTile = makeTile(title, media, { extraTools: [sel, stop] });
  if (shareInfo && shareInfo.fromFile) media.controls = true;
  if (shareInfo && shareInfo.setVol){
    // filmin sesi kendi hoparlörüne ayrı ayarlanır; izleyenler kendi seslerini kendileri ayarlar
    const vol = document.createElement('div'); vol.className = 'vol';
    vol.innerHTML = '<span>Sende ses</span><input type="range" min="0" max="100" value="100" aria-label="Filmin sende çalan sesi"><output>100%</output>';
    const r = vol.querySelector('input'), o = vol.querySelector('output');
    r.oninput = () => { o.textContent = r.value + '%'; shareInfo && shareInfo.setVol(r.value / 100 * masterVol); };
    localScreenTile._bar.append(vol);
  }
  $('screens').prepend(localScreenTile);
  watchSenderStats(localScreenTile);
  updateStage();
}
function showScreen(p){
  removeTile(p.tile);
  const v = document.createElement('video'); v.srcObject = p.screenStream;
  const tile = makeTile(screenTitleFor(p), v);
  const vol = screenVolControl(p);
  vol.prepend(Object.assign(document.createElement('span'), { textContent: 'Ses' }));
  tile._bar.append(vol);
  p.tile = tile;
  $('screens').append(tile);
  watchReceiverStats(tile, p);
  applyVolume(p); syncPeerUI(p);
  updateStage(); renderMixer();
}
function dropScreen(p){
  if (p.tile){ removeTile(p.tile); p.tile = null; }
  p.screenStream = null; p.screenCall = null;
  updateStage(); renderMixer();
}

// ---------- canlı kalite göstergesi ----------
// İzleyen: gelen çözünürlük, FPS, hız ve donma sayısı. Gönderen: giden kalite ve kodlayıcının neden kısıtladığı.
function watchReceiverStats(tile, p){
  let last = null;
  tile._statsTimer = setInterval(async () => {
    if (!tile.isConnected){ clearInterval(tile._statsTimer); return; }
    const pc = p.screenCall && p.screenCall.peerConnection; if (!pc) return;
    try {
      const rep = await pc.getStats();
      let v = null;
      rep.forEach(r => { if (r.type === 'inbound-rtp' && r.kind === 'video') v = r; });
      if (!v) return;
      const now = performance.now();
      let mbps = 0, freezes = 0, lossPct = 0;
      if (last){
        mbps = ((v.bytesReceived - last.bytes) * 8) / ((now - last.t) * 1000);
        freezes = (v.freezeCount || 0) - last.freezes;
        const lost = (v.packetsLost || 0) - last.lost, got = (v.packetsReceived || 0) - last.got;
        lossPct = got + lost > 0 ? (lost / (got + lost)) * 100 : 0;
      }
      last = { t: now, bytes: v.bytesReceived, freezes: v.freezeCount || 0, lost: v.packetsLost || 0, got: v.packetsReceived || 0 };
      const fps = Math.round(v.framesPerSecond || 0);
      if (p.filmPaused){ setStats(tile, ['⏸ Yayıncı filmi duraklattı'], ''); return; }
      const lines = [(v.frameHeight ? v.frameHeight + 'p · ' : '') + fps + ' fps · ' + mbps.toFixed(1) + ' Mbps'];
      let warn = '';
      if (freezes > 0) warn = '⚠ Görüntü dondu (' + freezes + ')';
      else if (fps > 0 && fps < 12) warn = '⚠ Takılıyor';
      if (warn) warn += lossPct > 3 ? ' – senin internetin dalgalanıyor' : ' – yayıncının yükleme hızı yetmiyor olabilir';
      setStats(tile, lines, warn);
    } catch(e){}
  }, 2000);
}
function watchSenderStats(tile){
  let last = new Map();
  tile._statsTimer = setInterval(async () => {
    if (!tile.isConnected){ clearInterval(tile._statsTimer); return; }
    let h = 0, fps = 0, bits = 0, n = 0, reason = '';
    const now = performance.now();
    for (const [id, call] of outScreen){
      const pc = call.peerConnection; if (!pc) continue;
      try {
        const rep = await pc.getStats();
        rep.forEach(r => {
          if (r.type !== 'outbound-rtp' || r.kind !== 'video') return;
          n++;
          h = Math.max(h, r.frameHeight || 0);
          fps = Math.max(fps, Math.round(r.framesPerSecond || 0));
          const l = last.get(id);
          if (l) bits += ((r.bytesSent - l.bytes) * 8) / ((now - l.t) * 1000);
          last.set(id, { bytes: r.bytesSent, t: now });
          if (r.qualityLimitationReason && r.qualityLimitationReason !== 'none') reason = r.qualityLimitationReason;
        });
      } catch(e){}
    }
    if (!n){ setStats(tile, ['İzleyen yok · ' + QUALITY[shareQ].label], ''); return; }
    const warn = reason === 'bandwidth' ? '⚠ Yükleme hızın yetmiyor: “Zayıf internet” ya da “Oyun” kalitesini seç'
      : reason === 'cpu' ? '⚠ Bilgisayarın zorlanıyor: kaliteyi düşür' : '';
    setStats(tile, ['Gönderiyor: ' + (h ? h + 'p · ' : '') + fps + ' fps · ' + n + ' izleyici · ' + bits.toFixed(1) + ' Mbps'], warn);
  }, 2000);
}
function setStats(tile, lines, warn){
  const s = tile._stats; if (!s) return;
  s.innerHTML = '';
  lines.forEach(l => { const d = document.createElement('span'); d.textContent = l; s.append(d); });
  if (warn){ const w = document.createElement('span'); w.className = 'warn'; w.textContent = warn; s.append(w); }
}
