// Arayüz: kanallar, katılımcı kutucukları, renkler, ses ayarları, tepkiler ve alt çubuk düğmeleri.

// ---------- kanallar ----------
const DEFAULT_CHANNELS = [
  { id: 'genel', name: 'Genel Sohbet', icon: '🎮', type: 'voice' },
  { id: 'muzik', name: 'Müzik Odası',  icon: '🎵', type: 'music' },
  { id: 'film',  name: 'Film Odası',   icon: '🎬', type: 'film' },
  { id: 'oyun',  name: 'Oyun Salonu',  icon: '🎲', type: 'game' }
];
let channels = DEFAULT_CHANNELS.map(c => Object.assign({}, c));
const chanById = id => channels.find(c => c.id === id);
const myChan = () => chanById(me.channel) || channels[0];

function setChannels(list){
  if (!Array.isArray(list)) return;
  const clean = [];
  list.forEach(c => {
    if (!c || typeof c !== 'object') return;
    if (typeof c.id !== 'string' || !/^[a-z0-9-]{1,24}$/.test(c.id)) return;
    if (clean.some(x => x.id === c.id)) return;
    const type = ['voice', 'music', 'film', 'game'].includes(c.type) ? c.type : 'voice';
    clean.push({ id: c.id, name: clip(c.name, 24) || 'Kanal', icon: clip(c.icon, 4) || '🎮', type });
  });
  DEFAULT_CHANNELS.forEach(d => { if (!clean.some(c => c.id === d.id)) clean.unshift(Object.assign({}, d)); });
  channels = clean;
  peers.forEach(p => { if (!chanById(p.channel)) p.channel = 'genel'; });
  if (!chanById(me.channel)) switchChannel('genel', true);
  renderChannels();
}

function switchChannel(id, quiet){
  if (!chanById(id) || (id === me.channel && !quiet)) { closeChanDrawer(); return; }
  if (screenStream) stopShare();
  me.channel = id;
  broadcast({ t: 'state', channel: id });
  peers.forEach(p => { if (!sameChan(p) && p.tile) dropScreen(p); });
  flip(() => {
    setRoomChannelClass();
    renderDeck();
    peers.forEach(p => renderPeer(p));
    updateStage();
  });
  updateRouting();
  renderChannels();
  onChannelEnterFilm();
  playRadioIfHere();
  if (!quiet) tone([520, 780], 0.09, 0.25, 0.1);
  closeChanDrawer();
}
function setRoomChannelClass(){
  const r = $('room');
  r.classList.remove('ch-voice', 'ch-music', 'ch-film', 'ch-game');
  r.classList.add('ch-' + myChan().type);
}

function renderChannels(){
  if (!joined) return;
  const box = $('chanList');
  box.innerHTML = '';
  channels.forEach(c => {
    const b = document.createElement('div');
    b.className = 'chan' + (c.id === me.channel ? ' here' : '');
    b.setAttribute('role', 'button'); b.tabIndex = 0;
    b.onclick = () => switchChannel(c.id);
    b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); switchChannel(c.id); } };
    const top = document.createElement('div'); top.className = 'chan-top';
    const ico = document.createElement('span'); ico.className = 'ico'; ico.textContent = c.icon;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = c.name;
    top.append(ico, nm);
    const members = [];
    if (me.channel === c.id) members.push({ id: peer.id, name: myName, sharing: !!screenStream });
    peers.forEach(p => { if (p.helloed && p.linked && p.channel === c.id) members.push(p); });
    const live = [];
    if (members.some(m => m.sharing)) live.push('🔴');
    if (c.type === 'music' && musicCurrentTitle() && !radio) live.push('🎵');
    if (c.type === 'film' && yt) live.push('▶️');
    if (live.length){ const l = document.createElement('span'); l.className = 'live'; l.textContent = live.join(' '); top.append(l); }
    if (isHost && !DEFAULT_CHANNELS.some(d => d.id === c.id)){
      const del = document.createElement('button'); del.className = 'chan-del'; del.textContent = '✕'; del.title = 'Kanalı sil';
      del.onclick = e => { e.stopPropagation(); setChannels(channels.filter(x => x.id !== c.id)); broadcast({ t: 'channels', list: channels }); };
      top.append(del);
    }
    b.append(top);
    const sub = chanSubtitle(c);
    if (sub){ const s = document.createElement('div'); s.className = 'chan-sub'; s.textContent = sub; b.append(s); }
    if (members.length){
      const mm = document.createElement('div'); mm.className = 'chan-members';
      members.forEach(m => {
        const d = document.createElement('span'); d.className = 'mini'; d.dataset.mini = m.id;
        d.style.setProperty('--c', colorFor(m.id)); d.textContent = initial(m.name); d.title = m.name;
        mm.append(d);
      });
      b.append(mm);
    }
    box.append(b);
  });
}
function chanSubtitle(c){
  if (c.type === 'music' && !radio){
    const t = musicCurrentTitle(); if (t) return '🎵 ' + t;
  }
  if (c.type === 'film' && yt) return '▶️ YouTube birlikte izleniyor';
  if (c.type === 'game' && tables.size){
    const playing = [...tables.values()].filter(t => t.status === 'playing').length;
    return '🎲 ' + tables.size + ' masa' + (playing ? ' · ' + playing + ' oyunda' : '');
  }
  return '';
}
function setMiniSpeaking(id, on){
  const el = document.querySelector('.mini[data-mini="' + id + '"]');
  if (el && el._on !== on){ el._on = on; el.classList.toggle('speaking', on); }
}

// kanal ekleme (oda sahibi)
$('addChanBtn').onclick = () => { $('chanName').value = ''; $('chanDlg').showModal(); $('chanName').focus(); };
$('chanForm').onsubmit = e => {
  e.preventDefault();
  const name = $('chanName').value.trim();
  if (!name) return;
  channels.push({ id: 'k-' + rid().slice(0, 6), name: clip(name, 24), icon: $('chanIcon').value, type: 'voice' });
  broadcast({ t: 'channels', list: channels });
  renderChannels();
  $('chanDlg').close();
};
// telefonda kanal çekmecesi
$('chanToggle').onclick = () => $('chanPanel').classList.toggle('open');
function closeChanDrawer(){ $('chanPanel').classList.remove('open'); }
document.addEventListener('click', e => {
  if (isMobile() && $('chanPanel').classList.contains('open') && !e.target.closest('#chanPanel') && !e.target.closest('#chanToggle')) closeChanDrawer();
});

function renderDeck(){
  const d = $('deck');
  const t = myChan().type;
  if (t === 'music') renderMusicDeck(d);
  else if (t === 'film') renderFilmDeck(d);
  else if (t === 'game') renderGameDeck(d);
  else d.innerHTML = '';
}

// ---------- renkler ----------
// Renkleri oda sahibi dağıtır (boştaki ilk renk) ve herkese gönderir; iki kişi aynı renge düşmez.
const COLORS = ['#5ee0b5','#7aa2ff','#ff7ab6','#ffb454','#b18cff','#4fd1ff','#ff8a65','#c3e86b','#f7d36a','#9fb4ff','#ff9ed0','#6ee7d8'];
let colorMap = {};
function colorFor(id){
  if (colorMap[id] != null) return COLORS[colorMap[id] % COLORS.length];
  let h = 2166136261; for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return COLORS[h % COLORS.length];
}
function assignColor(id){
  if (colorMap[id] != null) return;
  const used = new Set(Object.values(colorMap));
  let i = 0; while (used.has(i) && i < COLORS.length) i++;
  colorMap[id] = i % COLORS.length;
}
function applyColorMap(map){
  if (!map || typeof map !== 'object') return;
  const m = {};
  Object.keys(map).forEach(k => { const v = map[k]; if (k.startsWith(PREFIX) && Number.isInteger(v) && v >= 0 && v < COLORS.length) m[k] = v; });
  colorMap = m;
  applyColors();
}
function applyColors(){
  const s = $('selfCard'); if (s && peer) s.style.setProperty('--c', colorFor(peer.id));
  peers.forEach(p => { p.color = colorFor(p.id); if (p.card) p.card.style.setProperty('--c', p.color); });
  renderChannels();
  if (typeof refreshChatColors === 'function') refreshChatColors();
}
function shareColors(){
  if (!isHost) return;
  peers.forEach(p => { if (p.linked) assignColor(p.id); });
  broadcast({ t: 'colors', map: colorMap });
  applyColors();
}

// ---------- yerleşim animasyonu (FLIP) ----------
function flip(change){
  const els = [...document.querySelectorAll('#people .person:not(.leaving)')];
  const first = new Map(els.map(e => [e, e.getBoundingClientRect()]));
  change();
  if (reducedMotion()) return;
  els.forEach(e => {
    if (!e.isConnected || e.hidden) return;
    const a = first.get(e), b = e.getBoundingClientRect();
    if (!a.width) return;
    const dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(a.width - b.width) < 1) return;
    const sx = a.width / (b.width || 1), sy = a.height / (b.height || 1);
    e.animate([
      { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, transformOrigin: 'top left' },
      { transform: 'none', transformOrigin: 'top left' }
    ], { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)' });
  });
}
// ekran paylaşımı başlayınca katılımcılar kenara kayar, bitince ortaya döner
const gamingActive = () => typeof openTable !== 'undefined' && !!openTable && myChan().type === 'game';
function updateStage(){
  const gaming = gamingActive();
  $('room').classList.toggle('gaming', gaming);
  const sharing = $('screens').children.length > 0 || gaming;
  if ($('room').classList.contains('sharing') !== sharing) flip(() => $('room').classList.toggle('sharing', sharing));
  updateCount();
}

// ---------- katılımcı kutucukları ----------
const WAVE = '<span class="wave" aria-label="konuşuyor"><i></i><i></i><i></i></span>';
const initial = n => (n || '?').trim().charAt(0).toLocaleUpperCase('tr-TR') || '?';

function buildTile(isSelf){
  const c = document.createElement('div'); c.className = 'person enter';
  c.innerHTML =
    '<div class="person-head">' +
      '<div class="av-wrap"><canvas class="viz"></canvas><div class="avatar"></div><span class="mic-off" title="Mikrofonu kapalı">🔇</span></div>' +
      '<div class="name-row"><span class="pname"></span>' + WAVE + (isSelf ? '<span class="tag">sen</span>' : '') + '</div>' +
    '</div>' +
    '<div class="icons"></div>';
  c.addEventListener('animationend', e => { if (e.animationName === 'tileIn') c.classList.remove('enter'); });
  return c;
}
function burst(card){
  if (reducedMotion()) return;
  const wrap = card.querySelector('.av-wrap'); if (!wrap) return;
  for (let i = 0; i < 14; i++){
    const s = document.createElement('span'); s.className = 'spark';
    const a = (i / 14) * Math.PI * 2 + Math.random() * .4, d = 55 + Math.random() * 45;
    s.style.setProperty('--x', Math.cos(a) * d + 'px'); s.style.setProperty('--y', Math.sin(a) * d + 'px');
    s.style.animationDelay = (Math.random() * 120) + 'ms';
    wrap.append(s); setTimeout(() => s.remove(), 1100);
  }
}
function leaveTile(card){
  if (!card) return;
  if (card.hidden){ card.remove(); return; }
  card.classList.add('leaving');
  setTimeout(() => flip(() => card.remove()), 330);
}

function renderSelf(){
  let c = $('selfCard');
  if (!c){
    c = buildTile(true); c.id = 'selfCard';
    $('people').prepend(c);
    burst(c);
  }
  c.style.setProperty('--c', colorFor(peer ? peer.id : myName));
  c.querySelector('.avatar').textContent = initial(myName);
  c.querySelector('.pname').textContent = myName;
  c.classList.toggle('muted', micMuted);
  const ic = c.querySelector('.icons'); ic.innerHTML = '';
  if (noMic) ic.insertAdjacentHTML('beforeend', '<span class="pill">🎧 Dinleyici</span>');
  if (screenStream) ic.insertAdjacentHTML('beforeend', '<span class="pill live">🖥 Yayında</span>');
  if (isHost) ic.insertAdjacentHTML('beforeend', '<span class="pill">👑 Oda sahibi</span>');
  updateCount();
}

function renderPeer(p){
  if (!joined || !peers.has(p.id) || p.lobby) return;
  if (!p.card){
    const c = buildTile(false);
    p.color = colorFor(p.id);
    c.style.setProperty('--c', p.color);
    const ctl = document.createElement('div'); ctl.className = 'tile-ctl';
    const meter = document.createElement('div'); meter.className = 'meter';
    const bar = document.createElement('i'); bar.dataset.meter = p.id; meter.append(bar);
    const row = document.createElement('div'); row.className = 'kick-row';
    const dm = document.createElement('button'); dm.className = 'btn dm-btn'; dm.textContent = '💬 Özel mesaj';
    dm.onclick = () => openChat(p.id);
    const ik = document.createElement('button'); ik.className = 'btn dm-btn'; ik.textContent = '🍵 İkram';
    ik.title = 'Çay, simit, kahve ısmarla';
    ik.onclick = e => { e.stopPropagation(); openIkramMenu(p.id, ik); };
    row.append(dm, ik);
    ctl.append(meter, volControl(p), row);
    c.append(ctl);
    p.card = c;
    c.hidden = !sameChan(p);
    flip(() => $('people').append(c));
    if (!c.hidden) burst(c);
  }
  const c = p.card;
  const wasHidden = c.hidden;
  if (wasHidden !== !sameChan(p)){
    flip(() => { c.hidden = !sameChan(p); });
    if (!c.hidden){ c.classList.add('enter'); burst(c); }
  }
  c.querySelector('.avatar').textContent = initial(p.name);
  c.querySelector('.pname').textContent = p.name;
  c.classList.toggle('muted', !!p.muted);
  c.querySelectorAll('[data-vol]').forEach(r => r.setAttribute('aria-label', p.name + ' ses seviyesi'));
  ensureKickControl(p);
  const ic = c.querySelector('.icons'); ic.innerHTML = '';
  if (!p.linked) ic.insertAdjacentHTML('beforeend', p.failed
    ? '<span class="pill red">Bağlantı kurulamadı</span>'
    : '<span class="pill wait">Bağlantı kuruluyor…</span>');
  else if (!p.micStream) ic.insertAdjacentHTML('beforeend', p.micFailed
    ? '<span class="pill red">Ses bağlanamadı</span>'
    : '<span class="pill wait">Ses bağlanıyor…</span>');
  if (p.noMic) ic.insertAdjacentHTML('beforeend', '<span class="pill">🎧 Dinleyici</span>');
  if (p.sharing) ic.insertAdjacentHTML('beforeend', '<span class="pill live">🖥 Yayında</span>');
  if (p.id === currentHostId) ic.insertAdjacentHTML('beforeend', '<span class="pill">👑 Oda sahibi</span>');
  if (p.tile){ const w = p.tile.querySelector('.who'); if (w) w.textContent = screenTitleFor(p); }
  syncPeerUI(p);
  updateCount();
  renderMixer();
}
function updateCount(){
  const here = [...peers.values()].filter(p => p.helloed && p.linked && sameChan(p)).length;
  const total = [...peers.values()].filter(p => p.helloed && p.linked).length + 1;
  $('peopleTitle').textContent = '👥 ' + total + ' kişi';
  const e = $('emptyStage');
  e.hidden = here > 0;
  e.textContent = total > 1 ? 'Bu kanalda şimdilik yalnızsın. Soldan diğer kanallara geçebilirsin.' : 'Odada şimdilik yalnızsın. Yukarıdan daveti kopyalayıp arkadaşlarına gönder.';
}
function refreshHostUI(){
  $('addChanBtn').hidden = !isHost;
  peers.forEach(p => ensureKickControl(p));
  renderChannels();
}

// ---------- ses ayarları ----------
function applyVolume(p){
  if (p.audio){ p.audio.volume = Math.min(1, p.vol * masterVol); p.audio.muted = deafened || p.localMuted || !sameChan(p); }
  if (p.tile){ const v = p.tile.querySelector('video'); if (v){ v.volume = Math.min(1, p.screenVol * masterVol); v.muted = deafened; } }
}
const applyAll = () => { peers.forEach(applyVolume); applyMusicVolume(); };

function syncPeerUI(p){
  const v = Math.round(p.vol * 100);
  document.querySelectorAll('[data-vol="' + p.id + '"]').forEach(r => { if (+r.value !== v) r.value = v; r.disabled = p.localMuted; });
  document.querySelectorAll('[data-volout="' + p.id + '"]').forEach(o => o.textContent = p.localMuted ? 'Sessiz' : v + '%');
  document.querySelectorAll('[data-mute="' + p.id + '"]').forEach(b => {
    b.textContent = p.localMuted ? '🔇 Susturuldu' : '🔈 Sustur';
    b.className = 'btn mute-btn' + (p.localMuted ? ' off' : '');
    b.setAttribute('aria-pressed', p.localMuted);
  });
  const sv = Math.round(p.screenVol * 100);
  document.querySelectorAll('[data-svol="' + p.id + '"]').forEach(r => { if (+r.value !== sv) r.value = sv; });
  document.querySelectorAll('[data-svolout="' + p.id + '"]').forEach(o => o.textContent = sv + '%');
}
function setVol(p, v){ p.vol = v; applyVolume(p); syncPeerUI(p); }
function setScreenVol(p, v){ p.screenVol = v; applyVolume(p); syncPeerUI(p); }
function toggleLocalMute(p){ p.localMuted = !p.localMuted; applyVolume(p); syncPeerUI(p); }

function volControl(p){
  const wrap = document.createElement('div'); wrap.className = 'vol';
  const r = document.createElement('input'); r.type = 'range'; r.min = 0; r.max = 100;
  r.dataset.vol = p.id; r.setAttribute('aria-label', p.name + ' ses seviyesi');
  r.oninput = () => setVol(p, r.value / 100);
  const o = document.createElement('output'); o.dataset.volout = p.id;
  const m = document.createElement('button'); m.dataset.mute = p.id;
  m.onclick = () => toggleLocalMute(p);
  wrap.append(r, o, m);
  return wrap;
}
function screenVolControl(p){
  const wrap = document.createElement('div'); wrap.className = 'vol';
  const r = document.createElement('input'); r.type = 'range'; r.min = 0; r.max = 100;
  r.dataset.svol = p.id; r.setAttribute('aria-label', p.name + ' ekran sesi');
  r.oninput = () => setScreenVol(p, r.value / 100);
  const o = document.createElement('output'); o.dataset.svolout = p.id;
  wrap.append(r, o);
  return wrap;
}

function setMaster(v){
  masterVol = v / 100;
  ['masterVol', 'masterVol2'].forEach(id => { if (+$(id).value !== +v) $(id).value = v; });
  ['masterOut', 'masterOut2'].forEach(id => $(id).textContent = v + '%');
  applyAll();
}
$('masterVol').oninput = e => setMaster(e.target.value);
$('masterVol2').oninput = e => setMaster(e.target.value);
$('allHalf').onclick = () => peers.forEach(p => setVol(p, 0.5));
$('allReset').onclick = () => peers.forEach(p => { p.localMuted = false; setVol(p, 1); });

function renderMixer(){
  if (!$('mixerDlg').open) return;
  const box = $('mixPeople'); box.innerHTML = '';
  const here = [...peers.values()].filter(p => p.helloed && sameChan(p));
  if (!here.length) box.innerHTML = '<p class="note">Bu kanalda başka kimse yok.</p>';
  here.forEach(p => {
    const row = document.createElement('div'); row.className = 'mix-row';
    const top = document.createElement('div'); top.className = 'mix-top';
    const nm = document.createElement('span'); nm.className = 'pname'; nm.textContent = p.name;
    top.append(nm);
    if (p.muted){ const s = document.createElement('span'); s.className = 'pill red'; s.textContent = 'Mikrofonu kapalı'; top.append(s); }
    const meter = document.createElement('div'); meter.className = 'meter';
    const bar = document.createElement('i'); bar.dataset.meter = p.id; meter.append(bar);
    const sub = document.createElement('span'); sub.className = 'mix-sub'; sub.textContent = 'Ne kadar yüksek geliyor';
    row.append(top, sub, meter, volControl(p));
    box.append(row);
    syncPeerUI(p);
  });
  const sbox = $('mixScreens'); sbox.innerHTML = '';
  const sharers = [...peers.values()].filter(p => p.tile);
  $('mixScreensTitle').hidden = !sharers.length;
  sharers.forEach(p => {
    const row = document.createElement('div'); row.className = 'mix-row';
    const nm = document.createElement('span'); nm.className = 'pname'; nm.textContent = p.name + ' yayını (oyun/film sesi)';
    row.append(nm, screenVolControl(p));
    sbox.append(row);
    syncPeerUI(p);
  });
}
const openMixer = () => { $('mixerDlg').showModal(); renderMixer(); };
$('mixerBtn').onclick = openMixer;
$('mixerBtn2').onclick = openMixer;
$('micTestBtn').onclick = () => { $('micDlg').showModal(); fillMicList(); };

// ---------- emoji tepkileri ----------
const EMOJIS = ['👍','😂','❤️','😮','👏','🎉','🔥','😢'];
let lastReact = 0;
EMOJIS.forEach(e => {
  const b = document.createElement('button'); b.textContent = e; b.setAttribute('aria-label', 'Tepki gönder ' + e);
  b.onclick = () => { sendReaction(e); toggleEmojiPop(false); };
  $('emojiPop').append(b);
});
function toggleEmojiPop(show){ $('emojiPop').hidden = !show; $('reactBtn').setAttribute('aria-expanded', show); }
$('reactBtn').onclick = e => { e.stopPropagation(); toggleEmojiPop($('emojiPop').hidden); };
document.addEventListener('click', e => { if (!e.target.closest('.react-wrap')) toggleEmojiPop(false); });
function sendReaction(e){
  const now = Date.now();
  if (now - lastReact < 350) return;
  lastReact = now;
  peers.forEach(p => { if (p.linked && sameChan(p)) send(p.conn, { t: 'react', e }); });
  showReaction(e, 'Sen', $('selfCard'));
}
function showReaction(e, name, card){
  const f = document.createElement('div'); f.className = 'float';
  f.style.setProperty('--x', Math.round(Math.random() * 60) + 'px');
  f.style.setProperty('--dx', Math.round(Math.random() * 80 - 40) + 'px');
  const em = document.createElement('span'); em.className = 'e'; em.textContent = e;
  const nm = document.createElement('span'); nm.className = 'n'; nm.textContent = name;
  f.append(em, nm);
  $('reactions').append(f);
  setTimeout(() => f.remove(), 3500);
  const head = card && !card.hidden && card.querySelector('.person-head');
  if (head){
    const b = document.createElement('span'); b.className = 'badge'; b.textContent = e;
    head.append(b); setTimeout(() => b.remove(), 2300);
  }
}

// ---------- odadan atma düğmesi (sadece oda sahibi görür) ----------
function ensureKickControl(p){
  if (!p.card) return;
  const row = p.card.querySelector('.kick-row'); if (!row) return;
  const ex = row.querySelector('.kick-btn');
  if (isHost && !ex) row.append(...kickButtons(p));
  if (!isHost && ex){ row.querySelectorAll('.kick-btn,.kick-cancel').forEach(x => x.remove()); }
}
function kickButtons(p){
  const b = document.createElement('button'); b.className = 'btn kick-btn'; b.textContent = 'Odadan at';
  const cancel = document.createElement('button'); cancel.className = 'btn mute-btn kick-cancel'; cancel.textContent = 'Vazgeç'; cancel.hidden = true;
  let armed = false, tm;
  const reset = () => { armed = false; b.className = 'btn kick-btn'; b.textContent = 'Odadan at'; cancel.hidden = true; clearTimeout(tm); };
  b.onclick = () => {
    if (!armed){ armed = true; b.className = 'btn kick-btn sure'; b.textContent = 'Evet, çıkarılsın'; cancel.hidden = false; tm = setTimeout(reset, 5000); return; }
    reset(); kick(p);
  };
  cancel.onclick = reset;
  return [b, cancel];
}

// ---------- alt çubuk ----------
function updateMicButton(){
  const b = $('micBtn');
  if (noMic){ b.className = 'btn off'; b.innerHTML = '🎙 <span class="lbl">Mikrofon yok</span>'; b.title = 'Mikrofon izni ver'; return; }
  b.className = 'btn ' + (micMuted ? 'off' : 'on');
  b.innerHTML = '🎙 <span class="lbl">' + (micMuted ? 'Mikrofon kapalı' : 'Mikrofon açık') + '</span>';
}
$('micBtn').onclick = async () => {
  if (noMic){
    try { await openMic(); toast('Mikrofon açıldı'); }
    catch(e){ toast('Mikrofon izni verilmedi. Adres çubuğundaki kilit simgesinden izin verebilirsin.'); }
    return;
  }
  micMuted = !micMuted;
  if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = !micMuted);
  updateMicButton();
  broadcast({ t: 'state', muted: micMuted });
  renderSelf();
};
$('deafBtn').onclick = () => {
  deafened = !deafened;
  $('deafBtn').className = 'btn ' + (deafened ? 'off' : '');
  $('deafBtn').innerHTML = (deafened ? '🔇' : '🔊') + ' <span class="lbl">' + (deafened ? 'Sesler kapalı' : 'Sesler açık') + '</span>';
  applyAll();
};
$('leaveBtn').onclick = leaveRoom;
$('copyBtn').onclick = async () => {
  const link = location.protocol.startsWith('http') ? location.origin + location.pathname + '?oda=' + roomCode : '';
  const text = 'Oyun Odası kodu: ' + roomCode + (link ? '\n' + link : '');
  try { await navigator.clipboard.writeText(text); toast('Davet kopyalandı'); }
  catch(e){ toast('Kod: ' + roomCode); }
};
