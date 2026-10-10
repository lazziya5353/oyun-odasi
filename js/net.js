// Bağlantılar: odaya katılma, kişiler arası veri/ses bağlantıları, kanal yönlendirmesi, oda sahibi devri.
//
// Nasıl çalışır: Oda sahibi PeerJS sunucusuna "oyunodasi-v1-KOD" adıyla kayıt olur. Katılan kişi
// bu adrese bağlanır, oda sahibi ona odadaki diğer herkesin listesini verir ve herkes herkese
// doğrudan bağlanır. Ses, ekran ve müzik bu doğrudan bağlantılardan akar (araya sunucu girmez).
const PREFIX = 'oyunodasi-v1-';
let peer = null, lobbyPeer = null;
let myName = '', roomCode = '', isHost = false, joined = false, customCode = false, rejoining = false;
let currentHostId = '';
const peers = new Map();
const blocked = new Set();
const me = { channel: 'genel' };

// Modem/NAT engeli olanlar için aktarma (TURN) sunucusu: Open Relay'in herkese açık "static auth" girişi.
async function iceServers(){
  const list = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  try {
    const enc = s => new TextEncoder().encode(s);
    const username = (Math.floor(Date.now() / 1000) + 24 * 3600) + ':oyunodasi';
    const key = await crypto.subtle.importKey('raw', enc('openrelayprojectsecret'), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc(username)));
    list.push({
      urls: ['turn:staticauth.openrelay.metered.ca:80', 'turn:staticauth.openrelay.metered.ca:443',
             'turn:staticauth.openrelay.metered.ca:443?transport=tcp'],
      username, credential: btoa(String.fromCharCode(...sig))
    });
  } catch(e){ console.warn('TURN ayarlanamadı', e); }
  return list;
}
// ---------- eşleştirme sunucuları ----------
// Önce kendi sunucumuz (config.js'te yazılıysa), cevap vermezse herkese açık PeerJS sunucusu.
// Bir odadaki herkes aynı sunucuda olmalı; bu yüzden herkes aynı sırayla dener ve misafir odayı
// bir sunucuda bulamazsa diğerinde de arar.
function signalServers(){
  if (Array.isArray(window.OYUNODASI_TEST_SERVERS)) return window.OYUNODASI_TEST_SERVERS;
  const list = [];
  const own = String((window.OYUNODASI_CONFIG || {}).sunucu || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (own) list.push({ label: 'kendi sunucun', own: true, host: own, port: 443, secure: true, path: '/' });
  list.push({ label: 'herkese açık sunucu', host: '0.peerjs.com', port: 443, secure: true, path: '/' });
  return list;
}
let serverInUse = null;
const peerOpts = async srv => {
  const s = srv || serverInUse || signalServers()[0];
  return { debug: 1, host: s.host, port: s.port, secure: s.secure, path: s.path, config: { iceServers: await iceServers() } };
};
// Render'daki ücretsiz sunucu boştayken uyur; sayfa açılır açılmaz uyandırmaya başla ki "Oda oluştur"a basıldığında hazır olsun
function wakeServers(){
  signalServers().forEach(s => {
    if (!s.own) return;
    const url = (s.secure ? 'https://' : 'http://') + s.host + (s.port && s.port !== 443 && s.port !== 80 ? ':' + s.port : '') + '/saglik';
    fetch(url, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
  });
}
wakeServers();

// Müzik/film/ekran için SDP ayarı: stereo ve yüksek kaliteli ses, görüntü ilk andan itibaren iyi kalitede başlasın
function setFmtp(sdp, pt, add){
  const re = new RegExp('a=fmtp:' + pt + ' ([^\\r\\n]*)');
  if (re.test(sdp)){
    return sdp.replace(re, (all, params) => {
      const o = {};
      params.split(';').forEach(kv => { const i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i).trim()] = kv.slice(i + 1); });
      Object.assign(o, add);
      return 'a=fmtp:' + pt + ' ' + Object.entries(o).map(([k, v]) => k + '=' + v).join(';');
    });
  }
  const rtp = new RegExp('(a=rtpmap:' + pt + ' [^\\r\\n]*)');
  return sdp.replace(rtp, '$1\r\na=fmtp:' + pt + ' ' + Object.entries(add).map(([k, v]) => k + '=' + v).join(';'));
}
function sdpHiFi(sdp){
  try {
    const opus = sdp.match(/a=rtpmap:(\d+) opus\/48000/i);
    if (opus) sdp = setFmtp(sdp, opus[1], { stereo: 1, 'sprop-stereo': 1, maxaveragebitrate: 256000, usedtx: 0 });
    const vids = [...sdp.matchAll(/a=rtpmap:(\d+) (VP8|VP9|H264|AV1)\/90000/gi)].map(m => m[1]);
    vids.forEach(pt => { sdp = setFmtp(sdp, pt, { 'x-google-start-bitrate': 2000 }); });
  } catch(e){}
  return sdp;
}

function send(conn, msg){ try { if (conn && conn.open) conn.send(msg); } catch(e){} }
function broadcast(msg){ peers.forEach(p => { if (p.linked) send(p.conn, msg); }); }
function lobbyError(msg){ $('lobbyStatus').hidden = true; $('lobbyErr').textContent = msg; setBusy(false); }
function setBusy(b){ $('createBtn').disabled = b; $('joinBtn').disabled = b; }

// ---------- odaya giriş ----------
async function start(code, asHost){
  $('lobbyErr').textContent = '';
  setBusy(true);
  if (typeof Peer === 'undefined'){ lobbyError('Bağlantı kitaplığı yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.'); return; }
  ensureCtx();
  // Mikrofon odaya girmeyi ASLA engellemez: 3 sn içinde hazır değilse (izin penceresi cevaplanmadı,
  // mikrofon yok, izin verilmedi) dinleyici olarak girilir; mikrofon sonradan hazır olursa ses kendiliğinden açılır.
  if (!localStream){
    const micP = (async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no-media');
      await openMic(store.get('oyunodasi-mic') || undefined).catch(() => openMic());
    })();
    const r = await Promise.race([
      micP.then(() => 'ok', () => 'fail'),
      new Promise(res => setTimeout(() => res('wait'), 3000))
    ]);
    if (r !== 'ok' && !rawStream){
      useSilentMic();
      if (r === 'fail') toast('Mikrofon açılamadı: dinleyici olarak katılıyorsun. Sonra mikrofon düğmesinden izin verebilirsin.');
      else {
        toast('Mikrofon izni bekleniyor. Odaya giriyorsun; izin verince sesin kendiliğinden açılır.');
        micP.then(() => toast('🎙 Mikrofonun açıldı'), () => {});
      }
    }
  }
  if (peer){ try { peer.destroy(); } catch(e){} peer = null; }
  roomCode = code;
  try {
    if (asHost){
      await hostFlow(code);
      if (joined && typeof notifyRoomOpened === 'function') notifyRoomOpened();   // yeni oda: arkadaşlara bildirim
    }
    else await guestFlow(code);
  } catch(e){
    lobbyStatus('');
    lobbyError(typeof e === 'string' ? e : 'Odaya bağlanılamadı. Biraz sonra tekrar dene.');
  }
}

// Giriş ekranında ne olduğunu göster (hatadan ayrı, sakin bir durum satırı)
function lobbyStatus(text){ $('lobbyErr').textContent = ''; const s = $('lobbyStatus'); s.textContent = text; s.hidden = !text; }

// Bir sunucuda verilen adla kayıt olmayı dener. Sonuç: açık Peer ya da hata türü ('unavailable-id', 'network', 'timeout'…)
function openPeer(id, srv, timeoutMs){
  return new Promise(async (res, rej) => {
    let pr;
    try { pr = new Peer(id, await peerOpts(srv)); } catch(e){ rej('network'); return; }
    let done = false;
    const fail = t => { if (done) return; done = true; clearTimeout(tm); try { pr.destroy(); } catch(e){} rej(t); };
    const tm = setTimeout(() => fail('timeout'), timeoutMs);
    pr.on('open', () => { if (done) return; done = true; clearTimeout(tm); res(pr); });
    pr.on('error', e => fail((e && e.type) || 'network'));
  });
}
// Bir sunucuya, belirli bir süre boyunca aralıklarla tekrar deneyerek bağlan.
// Kendi sunucumuz uykudaysa uyanması ~1 dakika sürebilir, bu yüzden ona daha uzun süre tanınır.
async function openPeerRetry(id, srv, onTry){
  const budget = (srv.own ? 80000 : 25000) * (window.OYUNODASI_TEST_FAST || 1);
  const t0 = Date.now();
  let n = 0, last = 'network';
  const tickMsg = () => onTry && onTry(Math.max(1, n), Date.now() - t0);
  const iv = setInterval(tickMsg, 1000);    // geçen süreyi her saniye göster
  try {
    while (Date.now() - t0 < budget){
      n++;
      tickMsg();
      try { return await openPeer(id, srv, 9000); }
      catch(t){
        last = t;
        if (t === 'unavailable-id' || t === 'invalid-id' || t === 'browser-incompatible') throw t;   // tekrar denemek işe yaramaz
      }
      await new Promise(r => setTimeout(r, Math.min(6000, 1500 * n)));
    }
    throw last;
  } finally { clearInterval(iv); }
}
function tryMessage(srv, n, elapsed, many){
  if (srv.own && elapsed > 6000) return 'Sunucu uyanıyor… İlk açılışta 1 dakika kadar sürebilir (' + Math.round(elapsed / 1000) + ' sn)';
  if (n === 1) return many && !srv.own ? 'Yedek sunucu deneniyor…' : 'Sunucuya bağlanılıyor…';
  return (many && !srv.own ? 'Yedek sunucu deneniyor' : 'Sunucuya bağlanılıyor') + ' (deneme ' + n + ')…';
}

async function hostFlow(code){
  const list = signalServers();
  for (let i = 0; i < list.length; i++){
    const srv = list[i];
    try {
      const pr = await openPeerRetry(PREFIX + code, srv, (n, el) => lobbyStatus(tryMessage(srv, n, el, list.length > 1)));
      peer = pr; serverInUse = srv;
      setupPeer(pr);
      isHost = true; currentHostId = pr.id;
      lobbyStatus('');
      enterRoom();
      return;
    } catch(t){
      if (t === 'unavailable-id'){
        if (customCode) throw '“' + code + '” adında bir oda zaten açık. Ona katılmak için “Odaya katıl”a bas ya da başka bir kod yaz.';
        roomCode = code = genCode(); i--; continue;     // rastgele kod çakıştı: yenisiyle aynı sunucuda tekrar dene
      }
    }
  }
  throw noServerMessage();
}

async function guestFlow(code){
  const list = signalServers();
  let unreachable = 0;
  for (const srv of list){
    let pr;
    try { pr = await openPeerRetry(PREFIX + code + '-' + rid(), srv, (n, el) => lobbyStatus(tryMessage(srv, n, el, list.length > 1))); }
    catch(t){ unreachable++; continue; }
    lobbyStatus('Odaya bağlanılıyor…');
    const r = await joinVia(pr, srv, code);
    if (r === 'ok') return;
    if (r === 'no-room') continue;                       // oda bu sunucuda değil: diğerinde ara
    throw 'Oda bulundu ama bağlanılamadı. Senin ya da oda sahibinin ağı doğrudan bağlantıyı engelliyor olabilir. Giriş ekranındaki “Ağ testi”ni dene.';
  }
  if (unreachable === list.length) throw noServerMessage();
  if (rejoining){
    // "Son odana dön": herkes çıktıysa oda kapanmıştır; yeniden açılmaz
    forgetRoom(); $('rejoin').hidden = true; $('createBtn').classList.add('primary');
    throw 'Son odan kapanmış: herkes çıktığı için oda kapandı. “Oda oluştur” ile yeni bir oda kurabilirsin.';
  }
  throw 'Bu kodla açık bir oda bulunamadı. Kodu kontrol et; oda sahibinin odası açık olmalı.';
}
// Sunucuya kayıt olduk; şimdi oda sahibine bağlan. Sonuç: 'ok' | 'no-room' | 'timeout'
function joinVia(pr, srv, code){
  return new Promise(res => {
    peer = pr; serverInUse = srv;
    setupPeer(pr);
    currentHostId = PREFIX + code;
    let done = false;
    const finish = r => {
      if (done) return; done = true;
      clearInterval(iv); clearTimeout(tm); pr.off('error', onErr);
      if (r !== 'ok'){
        removePeer(currentHostId, { silent: true });
        try { pr.destroy(); } catch(e){}
        if (peer === pr) peer = null;
      }
      res(r);
    };
    const onErr = e => { if (e && e.type === 'peer-unavailable' && !joined) finish('no-room'); };
    pr.on('error', onErr);
    const iv = setInterval(() => { if (joined) finish('ok'); }, 150);
    const tm = setTimeout(() => finish(joined ? 'ok' : 'timeout'), 20000);
    connectTo(currentHostId);
  });
}
function noServerMessage(){
  const own = signalServers().some(s => s.own);
  return own
    ? 'Eşleştirme sunucularının hiçbirine ulaşılamadı. İnternet bağlantını kontrol edip biraz sonra tekrar dene.'
    : 'Eşleştirme sunucusuna ulaşılamıyor. Bu, herkese açık ücretsiz sunucunun geçici bir sorunu olabilir. Birkaç dakika sonra tekrar dene; kalıcı çözüm için kendi sunucunu kur (README’de anlatılıyor).';
}

// ---------- eşleştirme sunucusuyla bağlantı ----------
// Sunucu sadece kişilerin birbirini bulması için gerekir; ses, görüntü ve mesajlar kişiler arasında doğrudan
// gider. Bu yüzden sunucuyla bağlantı koparsa odadaki konuşma DEVAM EDER. Yeniden bağlanırken:
//  - hemen değil, artan aralıklarla denenir (2 sn, 3 sn, 5 sn … en fazla 30 sn); sık denemek sunucunun engellemesine yol açar
//  - sunucu eski bağlantıyı henüz kapatmadıysa "bu ad kullanımda" der; bu da geçici sayılır, beklenip tekrar denenir
//  - kullanıcıya tek seferlik sakin bir bilgi verilir, üst şeritte küçük bir gösterge yanar
const sig = { down: false, since: 0, tries: 0, timer: null, told: false };
function sigDown(){
  if (!sig.down){ sig.down = true; sig.since = Date.now(); }
  renderSigStatus();
  // kısa kopmaları kullanıcıya hiç gösterme; 8 sn'yi geçerse bir kez bilgi ver
  clearTimeout(sig.tellTimer);
  sig.tellTimer = setTimeout(() => {
    if (sig.down && !sig.told && joined){
      sig.told = true;
      toast('Sunucuyla bağlantı koptu, arka planda tekrar bağlanılıyor. Odadaki konuşma devam ediyor.');
    }
  }, 8000);
}
function sigUp(){
  const wasTold = sig.told;
  sig.down = false; sig.tries = 0; sig.told = false;
  clearTimeout(sig.timer); clearTimeout(sig.tellTimer);
  renderSigStatus();
  if (wasTold && joined) toast('✓ Sunucuya yeniden bağlanıldı');
}
function scheduleReconnect(pr, now){
  if (!pr || pr.destroyed) return;
  if (pr !== peer && pr !== lobbyPeer) return;
  if (pr === peer) sigDown();
  clearTimeout(pr._reTimer);
  const n = pr._tries = (pr._tries || 0) + 1;
  const delay = now ? 300 : Math.min(30000, Math.round(2000 * Math.pow(1.5, n - 1)));
  pr._reTimer = setTimeout(() => {
    if (pr.destroyed || !pr.disconnected) return;
    try { pr.reconnect(); } catch(e){ scheduleReconnect(pr); }
  }, delay);
}
function renderSigStatus(){
  const el = $('sigStatus'); if (!el) return;
  el.hidden = !sig.down;
}
// internet geri gelince ya da sekmeye dönülünce beklemeden dene
window.addEventListener('online', () => { [peer, lobbyPeer].forEach(pr => { if (pr && pr.disconnected && !pr.destroyed){ pr._tries = 0; scheduleReconnect(pr, true); } }); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  [peer, lobbyPeer].forEach(pr => { if (pr && pr.disconnected && !pr.destroyed) scheduleReconnect(pr, true); });
});

// Sunucuya kayıt olmuş bir Peer'e oda olaylarını bağla. (Giriş sırasındaki hatalar hostFlow/guestFlow'da ele alınır.)
function setupPeer(pr){
  pr.on('connection', conn => handleConn(conn));
  pr.on('call', call => handleCall(call));
  pr.on('open', () => { pr._tries = 0; if (pr === peer) sigUp(); });
  pr.on('disconnected', () => scheduleReconnect(pr));
  pr.on('error', err => {
    const t = err && err.type;
    if (pr !== peer) return;
    // sunucu hataları geçicidir: bağlantılar asla kapatılmaz, yeniden bağlanma 'disconnected' ile sürer
    if (t === 'peer-unavailable') return;
    if (['network', 'server-error', 'socket-error', 'socket-closed', 'unavailable-id'].includes(t)){ sigDown(); return; }
    console.warn(err);
  });
}

function enterRoom(){
  if (joined) return;
  joined = true;
  $('lobby').hidden = true; $('room').hidden = false;
  $('roomCode').textContent = roomCode;
  $('micDlgBody').append($('micPanel'));
  $('testBtn').hidden = true;
  $('testBtn').disabled = true;
  if (!heardVoice) quietSince = performance.now();
  $('recBtn').disabled = false;
  setHint('Konuşunca çubuk dolmalı. Kaydedip kendi sesini dinleyebilirsin.', '');
  if (isHost) colorMap[peer.id] = 0;
  loadSavedChat();            // bu odanın daha önce kaydedilmiş sohbeti
  rememberRoom();             // "Son odana dön" için
  updateMicButton();
  renderSelf();
  renderChannels();
  setRoomChannelClass();
  renderDeck();
  refreshHostUI();
  playRadio(); renderRadioChip();   // girerken çalan bir radyo varsa hemen başlasın
  startMeters();
  addSys('Odaya girdin. Kod: ' + roomCode);
}

// ---------- kişiler ----------
function getPeer(id){
  if (!peers.has(id)) peers.set(id, { id, name: 'Bağlanıyor…', conn: null, micCall: null, audio: null,
    micStream: null, screenStream: null, screenCall: null, musicCall: null, musicAudio: null, musicAnalyser: null,
    vol: 1, screenVol: 1, localMuted: false, muted: false, noMic: false, sharing: false, channel: 'genel',
    analyser: null, card: null, tile: null, linked: false, helloed: false, outgoing: false });
  return peers.get(id);
}
const sameChan = p => p.channel === me.channel;
const isPresent = id => id === (peer && peer.id) || !!(peers.get(id) && peers.get(id).linked);

function connectTo(id){
  if (!peer || id === peer.id || blocked.has(id)) return;
  const ex = peers.get(id);
  if (ex && ex.conn) return;
  const p = getPeer(id);
  p.outgoing = true;
  const conn = peer.connect(id, { reliable: true, metadata: { name: myName } });
  p.conn = conn;
  handleConn(conn);
}

function handleConn(conn){
  // giriş ekranından "oda hâlâ açık mı?" yoklaması: kişi sayılmaz, hemen kapatılır
  if (conn.metadata && conn.metadata.probe){ conn.on('open', () => setTimeout(() => { try { conn.close(); } catch(e){} }, 300)); return; }
  if (blocked.has(conn.peer)){ try { conn.close(); } catch(e){} return; }
  const p = getPeer(conn.peer);
  p.conn = conn;
  // gelen bağlantıda karşı tarafın adı hemen bellidir; giden bağlantıda adı "hello" ile öğreniriz
  if (!p.outgoing && conn.metadata && conn.metadata.name) p.name = clip(conn.metadata.name, 20);
  if (!p.outgoing) renderPeer(p);
  else setTimeout(() => { if (peers.get(conn.peer) === p && !p.helloed && !p.lobby) renderPeer(p); }, 4000);

  clearTimeout(p.linkTimer);
  p.linkTimer = setTimeout(() => {
    if (!p.linked && peers.get(conn.peer) === p){
      p.failed = true; renderPeer(p);
      toast((p.helloed ? p.name : 'Bir kişi') + ' ile bağlantı kurulamadı (ağ engeli olabilir)');
    }
  }, 20000);

  conn.on('open', () => {
    p.linked = true; p.failed = false; p.lastSeen = Date.now(); clearTimeout(p.linkTimer);
    if (!joined) enterRoom();
    send(conn, { t: 'hello', name: myName, muted: micMuted, noMic, sharing: !!screenStream, channel: me.channel });
    if (isHost){
      send(conn, { t: 'peers', ids: [...peers.values()].filter(o => o.linked && o.id !== conn.peer).map(o => o.id) });
      send(conn, Object.assign({ t: 'sync' }, makeSync()));
      assignColor(conn.peer); shareColors();
    }
    // her çift için tek ses çağrısı: kimliği küçük olan arar. 8 sn'de gelmezse tekrar, 15 sn'de diğer taraf dener.
    if (peer.id < conn.peer && !p.micCall) callMic(conn.peer);
    setTimeout(() => {
      if (!peers.has(conn.peer) || p.micStream || p.lobby) return;
      if (peer.id < conn.peer){ try { p.micCall && p.micCall.close(); } catch(e){} p.micCall = null; callMic(conn.peer); }
    }, 8000);
    setTimeout(() => {
      if (!peers.has(conn.peer) || p.micStream || p.lobby) return;
      if (peer.id > conn.peer){ try { p.micCall && p.micCall.close(); } catch(e){} p.micCall = null; callMic(conn.peer); }
    }, 15000);
    setTimeout(() => { if (peers.has(conn.peer) && !p.micStream && !p.lobby){ p.micFailed = true; renderPeer(p); } }, 22000);
    renderPeer(p);
  });
  conn.on('data', d => onData(conn.peer, d));
  conn.on('close', () => removePeer(conn.peer));
  conn.on('error', () => {});
}

// ---------- yaşam sinyali ----------
// Sekmesi çöken ya da interneti giden kişiyi hızlı fark etmek için bağlantının kendi durumuna bakılır:
// 8 sn boyunca "koptu" kalırsa odadan düşer (oda sahibiyse sahiplik hemen devredilir).
// Yedek olarak herkes 5 sn'de bir "buradayım" der; 90 sn hiçbir şey gelmezse de düşer.
// (Oyun oynarken arka plandaki sekmeyi tarayıcı yavaşlatabildiği için bu süre bilerek uzun.)
setInterval(() => {
  if (!joined) return;
  broadcast({ t: 'ping' });
  const now = Date.now();
  peers.forEach(p => {
    if (!p.linked) return;
    const pc = p.conn && p.conn.peerConnection;
    const st = pc ? (pc.connectionState || pc.iceConnectionState) : '';
    if (st === 'disconnected' || st === 'failed' || st === 'closed'){ p.badSince = p.badSince || now; }
    else p.badSince = 0;
    const dead = (p.badSince && now - p.badSince > 8000) || (p.lastSeen && now - p.lastSeen > 90000);
    if (dead){ try { p.conn && p.conn.close(); } catch(e){} removePeer(p.id); }
  });
}, 2000);

function onData(id, d){
  if (!d || typeof d !== 'object' || typeof d.t !== 'string') return;
  const p = peers.get(id); if (!p) return;
  p.lastSeen = Date.now();
  switch (d.t){
    case 'ping': return;
    case 'hello': {
      p.name = clip(d.name || 'Oyuncu', 20) || 'Oyuncu';
      p.muted = !!d.muted; p.noMic = !!d.noMic; p.sharing = !!d.sharing;
      p.channel = chanById(d.channel) ? d.channel : 'genel';
      if (!p.helloed){
        p.helloed = true;
        gamesOnHello(p);
        toast(p.name + ' odaya katıldı'); chime(true);
        addSys(p.name + ' odaya katıldı');
      }
      afterPeerStateChange(p);
      return;
    }
    case 'state': {
      if ('muted' in d) p.muted = !!d.muted;
      if ('noMic' in d) p.noMic = !!d.noMic;
      if ('sharing' in d){ p.sharing = !!d.sharing; if (!p.sharing) dropScreen(p); }
      if ('channel' in d){
        const old = p.channel;
        p.channel = chanById(d.channel) ? d.channel : 'genel';
        if (old !== p.channel && p.helloed){
          if (p.channel === me.channel) toast(p.name + ' bu kanala geldi');
          if (!sameChan(p)) dropScreen(p);
        }
      }
      afterPeerStateChange(p);
      return;
    }
    case 'peers':
      if (Array.isArray(d.ids)) d.ids.forEach(i => typeof i === 'string' && i.startsWith(PREFIX) && connectTo(i));
      return;
    case 'redirect': {
      // eski oda sahibi çıkmış; yeni oda sahibinin kapıcısı bizi odadakilere yönlendiriyor
      if (!Array.isArray(d.ids) || !d.ids.length) return;
      p.lobby = true;
      currentHostId = typeof d.ids[0] === 'string' ? d.ids[0] : currentHostId;
      if (d.sync) applySync(d.sync);
      d.ids.forEach(i => typeof i === 'string' && i.startsWith(PREFIX) && connectTo(i));
      try { p.conn.close(); } catch(e){}
      removePeer(id, { silent: true });
      return;
    }
    case 'sync':
      if (id === currentHostId) applySync(d);
      return;
    case 'channels':
      if (id === currentHostId) setChannels(d.list);
      return;
    case 'colors':
      if (id === currentHostId) applyColorMap(d.map);
      return;
    case 'react': {
      const now = Date.now();
      if (EMOJIS.includes(d.e) && now - (p.lastReact || 0) > 300){ p.lastReact = now; if (sameChan(p)) showReaction(d.e, p.name, p.card); }
      return;
    }
    case 'kick':
      if (id === currentHostId && !isHost) kickedOut();
      return;
    case 'kicked':
      if (id === currentHostId && typeof d.id === 'string' && d.id !== peer.id){
        blocked.add(d.id);
        const k = peers.get(d.id);
        if (k){ k.kicked = true; try { k.conn && k.conn.close(); } catch(e){} removePeer(d.id); }
      }
      return;
  }
  if (gamesOnData(id, d)) return;
  if (typeof soloOnData === 'function' && soloOnData(id, d)) return;
  if (ikramOnData(id, d)) return;
  if (chatOnData(id, d)) return;
  if (musicOnData(id, d)) return;
  if (filmOnData(id, d)) return;
}

function afterPeerStateChange(p){
  updateRouting();
  renderPeer(p);
  renderChannels();
}

// ---------- ses çağrıları ----------
function callMic(id){
  const call = peer.call(id, localStream, { metadata: { kind: 'mic' } });
  if (call) attachCall(id, call, 'mic');
}

function handleCall(call){
  if (blocked.has(call.peer)){ try { call.close(); } catch(e){} return; }
  const kind = call.metadata && call.metadata.kind;
  const p = getPeer(call.peer);
  if (kind === 'screen'){
    call.answer(undefined, { sdpTransform: sdpHiFi });
    attachCall(call.peer, call, 'screen');
  } else if (kind === 'music'){
    call.answer(undefined, { sdpTransform: sdpHiFi });
    attachCall(call.peer, call, 'music');
  } else {
    const old = p.micCall;
    call.answer(localStream); attachCall(call.peer, call, 'mic');
    if (old && old !== call) try { old.close(); } catch(e){}
  }
}

function attachCall(id, call, kind){
  const p = getPeer(id);
  if (kind === 'mic') p.micCall = call;
  else if (kind === 'music') p.musicCall = call;
  else p.screenCall = call;
  call.on('stream', s => {
    if (kind === 'mic'){
      if (p.micStream === s) return;
      p.micStream = s; p.micFailed = false;
      if (!p.audio){ p.audio = new Audio(); p.audio.autoplay = true; }
      p.audio.srcObject = s;
      applyVolume(p);
      p.audio.play().catch(() => toast('Sesi duymak için sayfaya bir kez tıkla.'));
      p.analyser = makeAnalyser(s);
      updateMicRouting(p);
    } else if (kind === 'music'){
      onMusicStream(p, s);
    } else {
      if (p.screenStream === s) return;
      if (!sameChan(p)){ try { call.close(); } catch(e){} return; }
      p.screenStream = s; p.sharing = true;
      p.screenMode = (call.metadata && call.metadata.mode) || 'balanced';
      p.screenTitle = clip(call.metadata && call.metadata.title, 80);
      // görüntüye tampon: ağdaki anlık dalgalanmalar donma yerine yumuşak geçsin (filmde daha büyük)
      try {
        call.peerConnection.getReceivers().forEach(r => {
          if (r.track && 'jitterBufferTarget' in r) r.jitterBufferTarget = p.screenMode === 'film' ? 400 : 150;
        });
      } catch(e){}
      showScreen(p);
    }
    renderPeer(p);
  });
  call.on('close', () => {
    if (kind === 'mic'){ if (p.micCall === call) p.micCall = null; }
    else if (kind === 'music'){ if (p.musicCall === call) onMusicClosed(p); }
    else if (p.screenCall === call) dropScreen(p);
  });
  call.on('error', () => {});
}

// ---------- kanal yönlendirmesi ----------
// Mikrofonun sadece aynı kanaldakilere gider, sadece aynı kanaldakileri duyarsın.
function micSender(p){
  const pc = p.micCall && p.micCall.peerConnection;
  if (!pc || !pc.getTransceivers) return null;
  const tr = pc.getTransceivers().find(t => t.receiver && t.receiver.track && t.receiver.track.kind === 'audio');
  return tr ? tr.sender : null;
}
function updateMicRouting(p){
  const s = micSender(p); if (!s) return;
  const want = sameChan(p) && localStream ? (localStream.getAudioTracks()[0] || null) : null;
  if (s.track !== want) s.replaceTrack(want).catch(() => {});
}
function updateRouting(){
  peers.forEach(p => { applyVolume(p); updateMicRouting(p); });
  syncScreenOut();
  syncMusicOut();
  applyMusicVolume();
}

// ---------- ayrılma ----------
function removePeer(id, opts = {}){
  const p = peers.get(id); if (!p) return;
  clearTimeout(p.linkTimer);
  ['micCall', 'screenCall', 'musicCall'].forEach(k => { try { p[k] && p[k].close(); } catch(e){} });
  if (outScreen.has(id)){ try { outScreen.get(id).close(); } catch(e){} outScreen.delete(id); }
  if (outMusic.has(id)){ try { outMusic.get(id).close(); } catch(e){} outMusic.delete(id); }
  if (p.audio) p.audio.srcObject = null;
  onMusicClosed(p);
  dropScreen(p);
  const card = p.card; p.card = null;
  peers.delete(id);
  if (isHost) delete colorMap[id];
  leaveTile(card);
  const wasHost = id === currentHostId && !p.lobby;
  if (!opts.silent && p.helloed){
    toast(p.name + (p.kicked ? ' odadan çıkarıldı' : ' ayrıldı')); chime(false);
    addSys(p.name + (p.kicked ? ' odadan çıkarıldı' : ' ayrıldı'));
  }
  musicPeerLeft(id);
  chatPeerLeft(id);
  gamesPeerLeft(id);
  updateCount(); renderMixer(); renderChannels();
  if (wasHost && joined && !p.kicked) migrateHost(p.name);
}

// ---------- oda sahibi devri ----------
// Oda sahibi çıkınca kalanlar arasında kimliği en küçük olan yeni oda sahibi olur (herkes aynı sonucu bulur).
// Yeni oda sahibi oda kodunu yeniden alır ve yeni gelenleri odadakilere yönlendiren bir "kapıcı" açar.
function migrateHost(oldName){
  const ids = [peer.id, ...[...peers.values()].filter(o => o.linked).map(o => o.id)].sort();
  currentHostId = ids[0];
  if (currentHostId === peer.id){
    isHost = true;
    toast((oldName || 'Oda sahibi') + ' ayrıldı. Artık oda sahibi sensin 👑');
    addSys('Artık oda sahibi sensin');
    Object.keys(colorMap).forEach(k => { if (!isPresent(k)) delete colorMap[k]; });
    shareColors();
    claimLobby();
  } else {
    const np = peers.get(currentHostId);
    if (np) addSys(np.name + ' artık oda sahibi');
  }
  refreshHostUI();
  peers.forEach(o => renderPeer(o));
  renderSelf();
}
async function claimLobby(tries = 0){
  if (!isHost || !joined || !peer || peer.id === PREFIX + roomCode) return;
  if (lobbyPeer && !lobbyPeer.destroyed) return;
  const lp = new Peer(PREFIX + roomCode, await peerOpts());
  lobbyPeer = lp;
  lp.on('open', () => { lp._tries = 0; });
  lp.on('error', err => {
    // oda kodu henüz boşalmadıysa (sunucu eski sahibi düşürmediyse) biraz bekleyip yeniden dene
    if (err && err.type === 'unavailable-id' && !lp.open && !lp._lastServerId){
      try { lp.destroy(); } catch(e){}
      if (lobbyPeer === lp) lobbyPeer = null;
      if (tries < 30) setTimeout(() => claimLobby(tries + 1), Math.min(15000, 3000 + tries * 1000));
    }
  });
  lp.on('disconnected', () => scheduleReconnect(lp));
  lp.on('connection', conn => {
    conn.on('open', () => {
      if (blocked.has(conn.peer)){ conn.close(); return; }
      send(conn, { t: 'redirect', ids: [peer.id, ...[...peers.values()].filter(o => o.linked).map(o => o.id)], sync: makeSync() });
      setTimeout(() => { try { conn.close(); } catch(e){} }, 4000);
    });
  });
}

// ---------- sonradan gelene odanın durumu ----------
function makeSync(){
  return {
    channels, colorMap, blocked: [...blocked],
    chat: chatHistoryForSync(), chatClearedAt, music: musicStateForSync(), yt: ytStateForSync()
  };
}
function applySync(s){
  if (!s || typeof s !== 'object') return;
  if (Array.isArray(s.channels)) setChannels(s.channels);
  if (s.colorMap) applyColorMap(s.colorMap);
  if (Array.isArray(s.blocked)) s.blocked.forEach(b => typeof b === 'string' && blocked.add(b));
  if (Array.isArray(s.chat)) applyChatHistory(s.chat, s.chatClearedAt);
  if (s.music) applyMusicState(s.music);
  if (s.yt) applyYT(s.yt, currentHostId, true);
}

// ---------- odadan atma ----------
function kick(p){
  blocked.add(p.id);
  p.kicked = true;
  send(p.conn, { t: 'kick' });
  peers.forEach(o => { if (o.id !== p.id) send(o.conn, { t: 'kicked', id: p.id }); });
  setTimeout(() => { try { p.conn && p.conn.close(); } catch(e){} removePeer(p.id); }, 300);
}
function kickedOut(){
  try { sessionStorage.setItem('oyunodasi-kicked', '1'); } catch(e){}
  forgetRoom();   // atılan kişiye "Son odana dön" gösterme
  leaveRoom();
}
// Odada benden başka kimse yoksa çıkınca oda kapanır: "Son odana dön" ve kayıtlı sohbet silinir
let leaveChecked = false;
function closeIfAlone(){
  if (leaveChecked) return;          // çıkarken bağlantılar kapanır; karar bir kez, kapanmadan önce verilir
  leaveChecked = true;
  if (!joined || [...peers.values()].some(o => o.linked && !o.lobby)) return;
  forgetRoom();
  try { localStorage.removeItem('oyunodasi-chat-' + roomCode); localStorage.removeItem('oyunodasi-chatclr-' + roomCode); } catch(e){}
}
function leaveRoom(){
  closeIfAlone();
  try { lobbyPeer && lobbyPeer.destroy(); } catch(e){}
  try { peer && peer.destroy(); } catch(e){}
  location.reload();
}
window.addEventListener('beforeunload', () => {
  closeIfAlone();
  try { lobbyPeer && lobbyPeer.destroy(); } catch(e){}
  try { peer && peer.destroy(); } catch(e){}
});
