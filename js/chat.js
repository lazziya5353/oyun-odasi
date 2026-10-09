// Sohbet: herkese açık sohbet, kişiye özel mesaj, fotoğraf, yazıyor göstergesi, okunmamış sayacı.
// Mesajlar sunucuya gitmez: herkese açık mesaj odadaki herkese, özel mesaj sadece alıcıya doğrudan gider.
const convos = new Map();     // 'all' ya da kişi id -> { msgs: [], unread: 0 }
let activeConvo = 'all', chatOpen = false;
const typingFrom = new Map(); // id -> { to, until }
const IMG_RE = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMG = 1600000;      // ~1.2 MB fotoğraf

function convo(key){ if (!convos.has(key)) convos.set(key, { msgs: [], unread: 0 }); return convos.get(key); }
convo('all');

// ---------- açma / kapama ----------
function setChatOpen(on){
  chatOpen = on;
  $('chat').hidden = !on;
  $('chatBtn').classList.toggle('on', on);
  if (on){
    convo(activeConvo).unread = 0;
    renderConvos(); renderMsgs(); updateChatBadge();
    if (!isMobile()) $('msgInput').focus();
  }
}
$('chatBtn').onclick = () => setChatOpen(!chatOpen);
$('chatClose').onclick = () => setChatOpen(false);
function openChat(key){
  activeConvo = key || 'all';
  setChatOpen(true);
  renderConvos(); renderMsgs();
}

// ---------- gönderme ----------
function sendChat(text, img){
  text = clip(text, 2000).trim();
  if (!text && !img) return;
  const key = activeConvo;
  if (key !== 'all'){
    const p = peers.get(key);
    if (!p || !p.linked){ toast('Bu kişi odada değil, mesaj gönderilemedi.'); return; }
  }
  const m = { t: 'chat', mid: rid() + rid(), to: key === 'all' ? 'all' : 'dm', text, img: img || null };
  if (key === 'all') broadcast(m); else send(peers.get(key).conn, m);
  addMsg(key, { mid: m.mid, from: peer.id, name: myName, text, img: m.img, ts: Date.now(), mine: true });
}

$('composer').onsubmit = e => {
  e.preventDefault();
  const v = $('msgInput').value;
  if (!v.trim()) return;
  sendChat(v);
  $('msgInput').value = ''; autoGrow();
};
$('msgInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); $('composer').requestSubmit(); }
});
function autoGrow(){ const t = $('msgInput'); t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; }
let lastTypingSent = 0;
$('msgInput').addEventListener('input', () => {
  autoGrow();
  const now = Date.now();
  if (now - lastTypingSent < 2000) return;
  lastTypingSent = now;
  if (activeConvo === 'all') broadcast({ t: 'typing', to: 'all' });
  else { const p = peers.get(activeConvo); if (p) send(p.conn, { t: 'typing', to: 'dm' }); }
});

// ---------- fotoğraf ----------
$('imgBtn').onclick = () => $('imgInput').click();
$('imgInput').onchange = async e => {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (f) await sendImageFile(f);
};
$('msgInput').addEventListener('paste', async e => {
  const items = [...(e.clipboardData ? e.clipboardData.items : [])];
  const it = items.find(i => i.type.startsWith('image/'));
  if (it){ e.preventDefault(); await sendImageFile(it.getAsFile()); }
});
const chatEl = $('chat');
chatEl.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')){ e.preventDefault(); chatEl.classList.add('drop'); } });
chatEl.addEventListener('dragleave', e => { if (!chatEl.contains(e.relatedTarget)) chatEl.classList.remove('drop'); });
chatEl.addEventListener('drop', async e => {
  chatEl.classList.remove('drop');
  const f = [...e.dataTransfer.files].find(x => x.type.startsWith('image/'));
  if (f){ e.preventDefault(); await sendImageFile(f); }
});

async function sendImageFile(file){
  if (!file || !file.type.startsWith('image/')){ toast('Sadece fotoğraf gönderebilirsin.'); return; }
  try {
    toast('Fotoğraf hazırlanıyor…');
    const url = await compressImage(file);
    if (!url || url.length > MAX_IMG || !IMG_RE.test(url)){ toast('Fotoğraf çok büyük, gönderilemedi.'); return; }
    sendChat('', url);
  } catch(e){ toast('Bu fotoğraf açılamadı.'); }
}
const readAsDataURL = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
// Fotoğrafı küçült: en fazla 1280 px, JPEG. Küçük hareketli GIF'ler olduğu gibi gider.
async function compressImage(file){
  if (file.type === 'image/gif' && file.size < 1000000) return readAsDataURL(file);
  const src = await readAsDataURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const make = (max, q) => {
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  };
  let out = make(1280, 0.82);
  if (out.length > MAX_IMG) out = make(960, 0.7);
  if (out.length > MAX_IMG) out = make(720, 0.6);
  return out;
}

// ---------- alma ----------
function chatOnData(id, d){
  const p = peers.get(id);
  if (d.t === 'chat'){
    const text = typeof d.text === 'string' ? clip(d.text, 2000) : '';
    const img = typeof d.img === 'string' && d.img.length <= MAX_IMG && IMG_RE.test(d.img) ? d.img : null;
    if (!text && !img) return true;
    const key = d.to === 'dm' ? id : 'all';
    addMsg(key, { mid: clip(d.mid, 40), from: id, name: p ? p.name : 'Biri', text, img, ts: Date.now() });
    typingFrom.delete(id); renderTyping();
    return true;
  }
  if (d.t === 'typing'){
    typingFrom.set(id, { to: d.to === 'dm' ? id : 'all', until: Date.now() + 3500 });
    renderTyping();
    setTimeout(renderTyping, 3600);
    return true;
  }
  return false;
}

function addMsg(key, m){
  const c = convo(key);
  if (m.mid && c.msgs.some(x => x.mid === m.mid)) return;
  c.msgs.push(m);
  if (c.msgs.length > 300) c.msgs.splice(0, c.msgs.length - 300);
  const visible = chatOpen && activeConvo === key;
  if (!m.mine && !m.sys && !visible){
    c.unread++;
    if (key !== 'all' || !chatOpen) tick();
    if (key !== 'all' && !chatOpen) toast('💬 ' + m.name + ': ' + (m.text ? clip(m.text, 60) : 'fotoğraf gönderdi'));
  }
  renderConvos(); updateChatBadge();
  if (visible) appendMsgEl(m, c.msgs[c.msgs.length - 2], true);
}
function addSys(text){ addMsg('all', { sys: true, text, ts: Date.now() }); }

function chatPeerLeft(id){
  typingFrom.delete(id); renderTyping();
  renderConvos();
  if (activeConvo === id) renderMsgs();
}

// ---------- çizim ----------
function renderConvos(){
  const box = $('convos'); if (!box) return;
  box.innerHTML = '';
  const chip = (key, label, color) => {
    const b = document.createElement('button');
    b.className = 'convo' + (key === activeConvo ? ' here' : '');
    b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', key === activeConvo);
    if (color) b.style.setProperty('--c', color);
    const dot = document.createElement('span'); dot.className = 'dot';
    const t = document.createElement('span'); t.textContent = label;
    b.append(dot, t);
    const u = convo(key).unread;
    if (u){ const n = document.createElement('span'); n.className = 'unread'; n.textContent = u; b.append(n); }
    b.onclick = () => { activeConvo = key; convo(key).unread = 0; renderConvos(); renderMsgs(); updateChatBadge(); $('msgInput').focus(); };
    box.append(b);
  };
  chip('all', 'Herkes', null);
  const keys = new Set();
  peers.forEach(p => { if (p.helloed && p.linked) keys.add(p.id); });
  convos.forEach((c, k) => { if (k !== 'all' && c.msgs.length) keys.add(k); });
  keys.forEach(k => {
    const p = peers.get(k);
    const name = p ? p.name : ((convo(k).msgs.find(m => !m.mine) || {}).name || 'Ayrıldı');
    chip(k, '🔒 ' + name, colorFor(k));
  });
}
function renderMsgs(){
  const box = $('msgs'); box.innerHTML = '';
  const c = convo(activeConvo);
  const p = activeConvo !== 'all' ? peers.get(activeConvo) : null;
  $('msgInput').placeholder = activeConvo === 'all' ? 'Herkese mesaj yaz…' : '🔒 ' + (p ? p.name : 'Kişi') + ' adlı kişiye özel mesaj…';
  const gone = activeConvo !== 'all' && !(p && p.linked);
  $('msgInput').disabled = gone; $('imgBtn').disabled = gone;
  if (!c.msgs.length){
    const e = document.createElement('p'); e.className = 'chat-empty';
    e.textContent = activeConvo === 'all' ? 'Henüz mesaj yok. Fotoğraf göndermek için 🖼 düğmesini kullan ya da fotoğrafı buraya sürükle.' : 'Bu konuşmayı sadece ikiniz görürsünüz.';
    box.append(e);
  }
  c.msgs.forEach((m, i) => appendMsgEl(m, c.msgs[i - 1], false));
  box.scrollTop = box.scrollHeight;
  renderTyping();
}
function appendMsgEl(m, prev, animate){
  const box = $('msgs');
  const empty = box.querySelector('.chat-empty'); if (empty) empty.remove();
  if (m.sys){
    const s = document.createElement('div'); s.className = 'sys'; s.textContent = m.text + ' · ' + hhmm(m.ts);
    box.append(s);
  } else {
    const el = document.createElement('div');
    const cont = prev && !prev.sys && prev.from === m.from && m.ts - prev.ts < 120000;
    el.className = 'msg' + (m.mine ? ' mine' : '') + (cont ? ' cont' : '');
    el.dataset.from = m.from;
    el.style.setProperty('--c', colorFor(m.from));
    if (!animate) el.style.animation = 'none';
    const who = document.createElement('div'); who.className = 'who';
    who.textContent = m.mine ? 'Sen' : m.name;
    const t = document.createElement('time'); t.textContent = hhmm(m.ts); who.append(t);
    el.append(who);
    if (m.img){
      const b = document.createElement('div'); b.className = 'body img';
      const im = document.createElement('img'); im.src = m.img; im.alt = 'Fotoğraf'; im.loading = 'lazy';
      im.onclick = () => { $('lightboxImg').src = m.img; $('lightbox').showModal(); };
      b.append(im); el.append(b);
    }
    if (m.text){
      const b = document.createElement('div'); b.className = 'body';
      linkify(m.text, b); el.append(b);
    }
    box.append(el);
  }
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 160;
  if (nearBottom || m.mine) box.scrollTop = box.scrollHeight;
}
// bağlantıları tıklanabilir yap (metin her zaman düz metin olarak eklenir)
function linkify(text, into){
  const re = /(https?:\/\/[^\s<]+)/g;
  let last = 0, m;
  while ((m = re.exec(text))){
    if (m.index > last) into.append(document.createTextNode(text.slice(last, m.index)));
    const a = document.createElement('a'); a.href = m[1]; a.textContent = m[1]; a.target = '_blank'; a.rel = 'noopener noreferrer';
    into.append(a);
    last = m.index + m[1].length;
  }
  if (last < text.length) into.append(document.createTextNode(text.slice(last)));
}
function renderTyping(){
  const now = Date.now();
  const names = [];
  typingFrom.forEach((v, id) => {
    if (v.until < now){ typingFrom.delete(id); return; }
    if (v.to === activeConvo || (activeConvo === 'all' && v.to === 'all')){ const p = peers.get(id); if (p) names.push(p.name); }
  });
  $('typing').textContent = names.length ? names.join(', ') + (names.length > 1 ? ' yazıyor…' : ' yazıyor…') : '';
}
function updateChatBadge(){
  let n = 0; convos.forEach(c => n += c.unread);
  const b = $('chatBadge');
  b.hidden = !n; b.textContent = n > 99 ? '99+' : n;
}
function refreshChatColors(){
  document.querySelectorAll('#msgs .msg').forEach(el => el.style.setProperty('--c', colorFor(el.dataset.from)));
  renderConvos();
}

// ---------- sonradan gelene geçmiş ----------
function chatHistoryForSync(){
  const msgs = convo('all').msgs.filter(m => !m.sys).slice(-60);
  const imgIdx = msgs.map((m, i) => m.img ? i : -1).filter(i => i >= 0).slice(-8);
  return msgs.map((m, i) => ({
    mid: m.mid, from: m.from, name: m.mine ? myName : m.name, ts: m.ts,
    text: m.text || (m.img && !imgIdx.includes(i) ? '[fotoğraf]' : ''),
    img: imgIdx.includes(i) ? m.img : null
  }));
}
function applyChatHistory(list){
  const c = convo('all');
  if (c.historyApplied) return;      // geçmiş hem kapıcıdan hem oda sahibinden gelebilir; bir kez yeter
  c.historyApplied = true;
  const clean = list.filter(m => m && typeof m === 'object').map(m => ({
    mid: clip(m.mid, 40), from: clip(m.from, 80), name: clip(m.name, 20) || 'Biri', ts: Number(m.ts) || Date.now(),
    text: typeof m.text === 'string' ? clip(m.text, 2000) : '',
    img: typeof m.img === 'string' && m.img.length <= MAX_IMG && IMG_RE.test(m.img) ? m.img : null
  })).filter(m => m.text || m.img);
  if (!clean.length) return;
  c.msgs = clean.concat([{ sys: true, text: '↑ Sen gelmeden önceki mesajlar', ts: Date.now() }], c.msgs.filter(m => m.sys));
  if (chatOpen && activeConvo === 'all') renderMsgs();
}
