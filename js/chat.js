// Sohbet: herkese açık sohbet, kişiye özel mesaj, fotoğraf, yazıyor göstergesi, okunmamış sayacı.
// Mesajlar sunucuya gitmez: herkese açık mesaj odadaki herkese, özel mesaj sadece alıcıya doğrudan gider.
const convos = new Map();     // 'all' ya da kişi id -> { msgs: [], unread: 0 }
let activeConvo = 'all', chatOpen = false;
const typingFrom = new Map(); // id -> { to, until }
const IMG_RE = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMG = 8000000;      // ~6 MB fotoğraf (hareketli GIF'ler dahil)

// yanıt, tepki, düzenleme, silme, sabitleme
const REAKS = ['👍', '😂', '❤️', '😮', '😢', '🔥', '🎉', '👎'];
let yanitla = null, duzenle = null, sabit = null;
const temizRe = r => r && typeof r === 'object' && typeof r.mid === 'string'
  ? { mid: clip(r.mid, 40), from: clip(r.from, 80), name: clip(r.name, 20) || 'Biri', text: typeof r.text === 'string' ? clip(r.text, 120) : '' } : null;
function temizRx(rx){
  if (!rx || typeof rx !== 'object') return null;
  const o = {};
  REAKS.forEach(e => { if (Array.isArray(rx[e])){ const l = [...new Set(rx[e].filter(x => typeof x === 'string').map(x => clip(x, 80)))].slice(0, 40); if (l.length) o[e] = l; } });
  return Object.keys(o).length ? o : null;
}
const bulMsg = (key, mid) => convo(key).msgs.find(m => m.mid === mid);
// alıntı / sabit şeridi için düz özet: biçim işaretleri kalkar, spoiler gizli kalır
const duzYazi = t => t.replace(/\|\|[\s\S]+?\|\|/g, '▒▒▒').replace(/\*\*([\s\S]+?)\*\*/g, '$1').replace(/~~([\s\S]+?)~~/g, '$1').replace(/(^|[^\w*])\*([^*\n]+?)\*(?![\w*])/g, '$1$2');
const ozetYazi = m => m.del ? 'silinen mesaj' : m.text ? clip(duzYazi(m.text).replace(/\s+/g, ' '), 120) : m.img ? '📷 fotoğraf' : '';
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

// ---------- kalıcı sohbet ----------
// "Herkes" sohbeti bu tarayıcıda oda koduna göre saklanır: odadan çıkıp dönünce, sayfa kapansa bile durur.
// Biri "Sohbeti temizle" derse herkesin ekranından ve kaydından silinir; temizlenme anı da saklanır ki
// o andan önceki mesajlar sonradan gelen birinin kaydından geri dönmesin.
let chatClearedAt = 0, saveTimer = null;
const chatKey = () => 'oyunodasi-chat-' + roomCode;
const clearKey = () => 'oyunodasi-chatclr-' + roomCode;
function loadSavedChat(){
  chatClearedAt = Math.max(chatClearedAt, Number(store.get(clearKey())) || 0);
  let saved = [];
  try { saved = JSON.parse(store.get(chatKey()) || '[]'); } catch(e){}
  if (Array.isArray(saved)) mergeChat(saved, true);
}
// en yeni fotoğraflardan başlayarak adet ve toplam boyut sınırına kadar olanların sırası
function imgBudget(msgs, maxN, maxBytes){
  const out = []; let total = 0;
  for (let i = msgs.length - 1; i >= 0 && out.length < maxN; i--){
    const m = msgs[i]; if (!m.img) continue;
    if (total + m.img.length > maxBytes) continue;
    total += m.img.length; out.push(i);
  }
  return out;
}
function saveChatSoon(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveChat, 600);
}
function saveChat(){
  if (!roomCode) return;
  const msgs = convo('all').msgs.filter(m => !m.sys).slice(-150);
  // fotoğraflar yer kaplar: en yenilerden toplam ~3 MB'lık kısmı sakla, eskilerini "[fotoğraf]" yap
  const imgIdx = imgBudget(msgs, 6, 3000000);
  const pack = keepImgs => msgs.map((m, i) => ({
    mid: m.mid, from: m.from, name: m.mine ? myName : m.name, ts: m.ts, mine: !!m.mine,
    text: m.text || (m.img && !(keepImgs && imgIdx.includes(i)) ? '[fotoğraf]' : ''),
    img: keepImgs && imgIdx.includes(i) ? m.img : null,
    re: m.re || null, rx: m.rx || null, ed: !!m.ed, del: !!m.del
  }));
  try { localStorage.setItem(chatKey(), JSON.stringify(pack(true))); }
  catch(e){ try { localStorage.setItem(chatKey(), JSON.stringify(pack(false))); } catch(_){} }
}
// Mesaj listesini mevcut sohbete ekle: aynı mesaj iki kez girmez, temizlenmeden önceki mesajlar alınmaz, sıra zamana göre
function mergeChat(list, fromDisk){
  const c = convo('all');
  const have = new Set(c.msgs.map(m => m.mid).filter(Boolean));
  let added = 0;
  list.forEach(m => {
    if (!m || typeof m !== 'object') return;
    const x = {
      mid: clip(m.mid, 40), from: clip(m.from, 80), name: clip(m.name, 20) || 'Biri', ts: Number(m.ts) || 0,
      text: typeof m.text === 'string' ? clip(m.text, 2000) : '',
      img: typeof m.img === 'string' && m.img.length <= MAX_IMG && IMG_RE.test(m.img) ? m.img : null,
      mine: fromDisk && !!m.mine,
      re: temizRe(m.re), rx: temizRx(m.rx), ed: !!m.ed, del: !!m.del
    };
    if (x.del){ x.text = ''; x.img = null; }
    if (!x.mid || have.has(x.mid) || (!x.text && !x.img && !x.del) || x.ts <= chatClearedAt) return;
    have.add(x.mid); c.msgs.push(x); added++;
  });
  if (!added) return;
  c.msgs.sort((a, b) => a.ts - b.ts);
  if (c.msgs.length > 300) c.msgs.splice(0, c.msgs.length - 300);
  if (!fromDisk) saveChatSoon();
  if (chatOpen && activeConvo === 'all') renderMsgs();
}

// ---------- sohbeti temizle ----------
$('chatClear').onclick = () => {
  const dm = activeConvo !== 'all';
  const p = dm ? peers.get(activeConvo) : null;
  $('clearText').textContent = dm
    ? (p ? p.name : 'Bu kişi') + ' ile özel konuşman sadece senin ekranından temizlensin mi?'
    : 'Sohbet odadaki herkes için temizlensin mi? Bu geri alınamaz.';
  $('clearConfirm').hidden = false;
};
$('clearNo').onclick = () => { $('clearConfirm').hidden = true; };
$('clearYes').onclick = () => {
  $('clearConfirm').hidden = true;
  if (activeConvo !== 'all'){ convo(activeConvo).msgs = []; renderMsgs(); toast('Özel konuşma temizlendi'); return; }
  broadcast({ t: 'chat-clear' });
  clearAllChat(myName);
};
function clearAllChat(byName){
  chatClearedAt = Date.now();
  store.set(clearKey(), String(chatClearedAt));
  const c = convo('all');
  c.msgs = []; c.unread = 0;
  saveChat();
  addSys('🧹 ' + (byName === myName ? 'Sohbeti temizledin' : byName + ' sohbeti temizledi'));
  updateChatBadge(); renderConvos();
  if (chatOpen && activeConvo === 'all') renderMsgs();
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
  // düzenleme modundaysa yeni mesaj yerine eskisini güncelle
  if (duzenle && !img){
    const hedef = bulMsg(duzenle.key, duzenle.mid);
    const k = duzenle.key; duzenleBitir();
    if (hedef && hedef.mine && !hedef.del && hedef.text !== text){ hedef.text = text; hedef.ed = true; ilet(k, { t: 'chat-ed', mid: hedef.mid, text }); msgYenile(k, hedef.mid); if (k === 'all') saveChatSoon(); }
    return;
  }
  const re = yanitla && yanitla.key === key ? { mid: yanitla.mid, from: yanitla.from, name: yanitla.name, text: yanitla.text } : null;
  yanitBitir();
  const m = { t: 'chat', mid: rid() + rid(), to: key === 'all' ? 'all' : 'dm', text, img: img || null, re };
  if (key === 'all') broadcast(m); else send(peers.get(key).conn, m);
  if (typeof etiketBul === 'function' && typeof hareket === 'function'){ const tg = etiketBul(text); if (tg.length) hareket('etiket', 'sohbette ' + [...new Set(tg.map(t => '@' + t.ad))].join(', ') + ' etiketledi' + (key !== 'all' ? ' (özel mesaj)' : '')); }
  addMsg(key, { mid: m.mid, from: peer.id, name: myName, text, img: m.img, ts: Date.now(), mine: true, re });
}
// konuşmaya göre gönder: herkese ya da özelden karşı tarafa
function ilet(key, d){
  if (key === 'all') broadcast(d);
  else { const p = peers.get(key); if (p && p.linked) send(p.conn, Object.assign({ to: 'dm' }, d)); }
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
  const fs = [...(e.target.files || [])];
  e.target.value = '';
  for (const f of fs.slice(0, 20)) await sendImageFile(f);
};
$('msgInput').addEventListener('paste', async e => {
  const items = [...(e.clipboardData ? e.clipboardData.items : [])];
  const its = items.filter(i => i.type.startsWith('image/'));
  if (its.length){ e.preventDefault(); for (const it of its.slice(0, 20)) await sendImageFile(it.getAsFile()); }
});
const chatEl = $('chat');
chatEl.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')){ e.preventDefault(); chatEl.classList.add('drop'); } });
chatEl.addEventListener('dragleave', e => { if (!chatEl.contains(e.relatedTarget)) chatEl.classList.remove('drop'); });
chatEl.addEventListener('drop', async e => {
  chatEl.classList.remove('drop');
  const fs = [...e.dataTransfer.files].filter(x => x.type.startsWith('image/'));
  if (fs.length){ e.preventDefault(); for (const f of fs.slice(0, 20)) await sendImageFile(f); }
});

async function sendImageFile(file){
  if (!file || !file.type.startsWith('image/')){ toast('Sadece fotoğraf gönderebilirsin.'); return; }
  try {
    toast('Fotoğraf hazırlanıyor…');
    const url = await compressImage(file);
    if (!url || url.length > MAX_IMG || !IMG_RE.test(url)){ toast('Bu fotoğraf gönderilemedi.'); return; }
    sendChat('', url);
  } catch(e){ toast('Bu fotoğraf açılamadı.'); }
}
const readAsDataURL = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
// Fotoğrafı gerekirse küçült (en fazla 2048 px, JPEG). Hareketli GIF'ler 5.5 MB'a kadar olduğu gibi gider.
// Ne kadar büyük olursa olsun gönderilir: sığmazsa adım adım küçültülür.
async function compressImage(file){
  if (file.type === 'image/gif' && file.size < 5800000) return readAsDataURL(file);
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
  let out = make(2048, 0.86);
  for (const [m, q] of [[1600, 0.8], [1280, 0.75], [960, 0.7], [720, 0.6], [520, 0.5]]){ if (out.length <= MAX_IMG) break; out = make(m, q); }
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
    addMsg(key, { mid: clip(d.mid, 40), from: id, name: p ? p.name : 'Biri', text, img, ts: Date.now(), re: temizRe(d.re) });
    if (typeof etiketGeldi === 'function') etiketGeldi(id, p ? p.name : 'Biri', text, key !== 'all');
    typingFrom.delete(id); renderTyping();
    return true;
  }
  if (d.t === 'chat-rx' || d.t === 'chat-ed' || d.t === 'chat-del'){
    const key = d.to === 'dm' ? id : 'all';
    const m = bulMsg(key, clip(d.mid, 40)); if (!m) return true;
    if (d.t === 'chat-rx'){
      if (!REAKS.includes(d.e)) return true;
      m.rx = m.rx || {}; const l = m.rx[d.e] = (m.rx[d.e] || []).filter(x => x !== id);
      if (d.on) l.push(id);
      if (!l.length) delete m.rx[d.e];
      if (!Object.keys(m.rx).length) m.rx = null;
    } else if (d.t === 'chat-ed'){
      if (m.from !== id || m.del || typeof d.text !== 'string') return true;
      m.text = clip(d.text, 2000).trim(); m.ed = true;
    } else {
      // kendi mesajını herkes, herkesinkini oda sahibi silebilir
      if (m.from !== id && id !== currentHostId) return true;
      m.del = true; m.text = ''; m.img = null; m.rx = null;
      if (sabit && sabit.mid === m.mid) sabitle(null, true);
    }
    msgYenile(key, m.mid);
    if (key === 'all') saveChatSoon();
    return true;
  }
  if (d.t === 'chat-pin'){
    if (id !== currentHostId) return true;
    sabitle(d.pin ? temizPin(d.pin) : null, true);
    return true;
  }
  if (d.t === 'chat-clear'){
    clearAllChat(p ? p.name : 'Biri');
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
  if (key === 'all' && !m.sys) saveChatSoon();
  const visible = chatOpen && activeConvo === key;
  if (!m.mine && !m.sys && !visible){
    c.unread++;
    if (key !== 'all' || !chatOpen) tick();
  }
  if (!m.mine && !m.sys) sohbetBildir(key, m, visible);
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
    b.onclick = () => { activeConvo = key; convo(key).unread = 0; yanitBitir(); duzenleBitir(); renderConvos(); renderMsgs(); updateChatBadge(); $('msgInput').focus(); };
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
    e.textContent = activeConvo === 'all' ? 'Henüz mesaj yok. Fotoğraf göndermek için 🖼 düğmesini kullanabilir ya da fotoğrafı buraya sürükleyebilirsiniz.' : 'Bu konuşmayı sadece ikiniz görürsünüz.';
    box.append(e);
  }
  c.msgs.forEach((m, i) => box.append(msgEl(m, c.msgs[i - 1], false)));
  box.scrollTop = box.scrollHeight;
  sabitCiz();
  renderTyping();
}
function appendMsgEl(m, prev, animate){
  const box = $('msgs');
  const empty = box.querySelector('.chat-empty'); if (empty) empty.remove();
  box.append(msgEl(m, prev, animate));
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 160;
  if (nearBottom || m.mine) box.scrollTop = box.scrollHeight;
}
function msgEl(m, prev, animate){
  if (m.sys){
    const s = document.createElement('div'); s.className = 'sys'; s.textContent = m.text + ' · ' + hhmm(m.ts);
    return s;
  }
  const key = activeConvo;
  const el = document.createElement('div');
  const cont = prev && !prev.sys && prev.from === m.from && m.ts - prev.ts < 120000 && !m.re;
  el.className = 'msg' + (m.mine ? ' mine' : '') + (cont ? ' cont' : '') + (m.del ? ' silindi' : '');
  el.dataset.from = m.from; el.dataset.mid = m.mid || '';
  el.style.setProperty('--c', colorFor(m.from));
  if (!animate) el.style.animation = 'none';
  const who = document.createElement('div'); who.className = 'who';
  who.textContent = m.mine ? 'Sen' : m.name;
  { const st = typeof stilOf === 'function' && peer ? stilOf(m.mine ? peer.id : m.from) : null; if (st && st.isim){ who.dataset.isim = st.isim; who.dataset.text = who.textContent; } }
  const t = document.createElement('time'); t.textContent = hhmm(m.ts); who.append(t);
  el.append(who);
  // yanıtlanan mesaj
  if (m.re){
    const q = document.createElement('button'); q.type = 'button'; q.className = 'msg-alinti';
    q.style.setProperty('--qc', colorFor(m.re.from));
    q.innerHTML = '<b></b><span></span>';
    q.querySelector('b').textContent = '↩ ' + (peer && m.re.from === peer.id ? 'Sen' : m.re.name);
    q.querySelector('span').textContent = m.re.text || '…';
    q.onclick = e => { e.stopPropagation(); msgeGit(m.re.mid); };
    el.append(q);
  }
  if (m.del){
    const b = document.createElement('div'); b.className = 'body'; b.textContent = '🗑 Bu mesaj silindi';
    el.append(b);
    return el;
  }
  if (m.img){
    const b = document.createElement('div'); b.className = 'body img';
    const im = document.createElement('img'); im.src = m.img; im.alt = 'Fotoğraf'; im.loading = 'lazy';
    im.onclick = e => { e.stopPropagation(); $('lightboxImg').src = m.img; $('lightbox').showModal(); };
    b.append(im); el.append(b);
  }
  if (m.text){
    const b = document.createElement('div'); b.className = 'body';
    bicimliYaz(m.text, b);
    if (m.ed){ const e2 = document.createElement('small'); e2.className = 'duzenlendi'; e2.textContent = ' (düzenlendi)'; b.append(e2); }
    if (!m.mine && ((typeof etiketBeni === 'function' && etiketBeni(m.text)) || (m.re && peer && m.re.from === peer.id))) el.classList.add('etiketli');
    el.append(b);
  }
  // tepkiler
  if (m.rx){
    const r = document.createElement('div'); r.className = 'msg-tepkiler';
    REAKS.forEach(e => {
      const l = m.rx[e]; if (!l || !l.length) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tepki-cip' + (peer && l.includes(peer.id) ? ' benim' : '');
      b.textContent = e + ' ' + l.length;
      b.title = l.map(id => id === (peer && peer.id) ? 'Sen' : (peers.get(id) || {}).name || '?').join(', ');
      b.onclick = ev => { ev.stopPropagation(); tepkiVer(key, m, e); };
      r.append(b);
    });
    el.append(r);
  }
  // işlemler (bilgisayarda üstüne gelince, telefonda dokununca)
  const ac = document.createElement('div'); ac.className = 'msg-islem';
  const btn = (txt, ad, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.title = ad; b.setAttribute('aria-label', ad); if (cls) b.className = cls; b.onclick = ev => { ev.stopPropagation(); fn(b); }; ac.append(b); return b; };
  btn('😀', 'Tepki ver', b => tepkiSecici(b, key, m));
  btn('↩', 'Yanıtla', () => yanitBasla(key, m));
  if (m.mine && m.text) btn('✏️', 'Düzenle', () => duzenleBasla(key, m));
  if (m.mine || (typeof isHost !== 'undefined' && isHost)) btn('🗑', 'Sil', b => {
    if (!b.classList.contains('emin')){ b.classList.add('emin'); b.textContent = 'Sil?'; setTimeout(() => { if (b.isConnected){ b.classList.remove('emin'); b.textContent = '🗑'; } }, 3000); return; }
    msgSil(key, m);
  });
  if (key === 'all' && typeof isHost !== 'undefined' && isHost) btn(sabit && sabit.mid === m.mid ? '📍' : '📌', sabit && sabit.mid === m.mid ? 'Sabitlemeyi kaldır' : 'Sabitle', () => {
    if (sabit && sabit.mid === m.mid) sabitle(null); else sabitle({ mid: m.mid, from: m.from, name: m.mine ? myName : m.name, text: ozetYazi(m), ts: Date.now() });
  });
  el.append(ac);
  el.addEventListener('click', e => {
    if (e.target.closest('a, button, img, .spoiler:not(.acik)')) return;
    const acik = el.classList.contains('islem-acik');
    document.querySelectorAll('#msgs .msg.islem-acik').forEach(x => x.classList.remove('islem-acik'));
    if (!acik) el.classList.add('islem-acik');
  });
  return el;
}
// mesaj değişti (tepki, düzenleme, silme): görünüyorsa yerinde yeniden çiz
function msgYenile(key, mid){
  if (!chatOpen || activeConvo !== key) return;
  const old = document.querySelector('#msgs .msg[data-mid="' + CSS.escape(mid) + '"]'); if (!old) return;
  const c = convo(key), i = c.msgs.findIndex(x => x.mid === mid); if (i < 0) return;
  const n = msgEl(c.msgs[i], c.msgs[i - 1], false);
  if (old.classList.contains('islem-acik')) n.classList.add('islem-acik');
  old.replaceWith(n);
}
function msgeGit(mid){
  const el = document.querySelector('#msgs .msg[data-mid="' + CSS.escape(mid) + '"]');
  if (!el){ toast('Bu mesaj artık sohbette yok.'); return; }
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('vurgu'); void el.offsetWidth; el.classList.add('vurgu');
}
// ---------- tepki ----------
function tepkiVer(key, m, e){
  if (!peer) return;
  m.rx = m.rx || {};
  const l = m.rx[e] = m.rx[e] || [];
  const on = !l.includes(peer.id);
  if (on) l.push(peer.id); else l.splice(l.indexOf(peer.id), 1);
  if (!l.length) delete m.rx[e];
  if (!Object.keys(m.rx).length) m.rx = null;
  ilet(key, { t: 'chat-rx', mid: m.mid, e, on });
  msgYenile(key, m.mid);
  if (key === 'all') saveChatSoon();
}
function tepkiSecici(anchor, key, m){
  document.querySelectorAll('.tepki-secici').forEach(x => x.remove());
  const p = document.createElement('div'); p.className = 'tepki-secici';
  REAKS.forEach(e => { const b = document.createElement('button'); b.type = 'button'; b.textContent = e; b.onclick = ev => { ev.stopPropagation(); p.remove(); tepkiVer(key, m, e); }; p.append(b); });
  anchor.closest('.msg').append(p);
  setTimeout(() => document.addEventListener('click', function k(ev){ if (!p.contains(ev.target)){ p.remove(); document.removeEventListener('click', k); } }), 0);
}
// ---------- yanıt / düzenleme şeridi (yazı kutusunun üstünde) ----------
function serit(){
  let s = $('composerSerit');
  if (!s){ s = document.createElement('div'); s.id = 'composerSerit'; s.className = 'composer-serit'; s.hidden = true; $('composer').before(s); }
  return s;
}
function seritCiz(){
  const s = serit();
  const d = duzenle || yanitla;
  s.hidden = !d;
  if (!d) return;
  s.innerHTML = '<div><b></b><span></span></div><button type="button" aria-label="Vazgeç">✕</button>';
  s.querySelector('b').textContent = duzenle ? '✏️ Mesajını düzenliyorsun' : '↩ ' + (yanitla.from === (peer && peer.id) ? 'Kendine' : yanitla.name + '’a') + ' yanıt';
  s.querySelector('span').textContent = d.text || '';
  s.querySelector('button').onclick = () => { if (duzenle){ duzenleBitir(); $('msgInput').value = ''; autoGrow(); } else yanitBitir(); };
}
function yanitBasla(key, m){
  duzenle = null;
  yanitla = { key, mid: m.mid, from: m.mine ? peer.id : m.from, name: m.mine ? myName : m.name, text: ozetYazi(m) };
  seritCiz(); $('msgInput').focus();
}
function yanitBitir(){ yanitla = null; seritCiz(); }
function duzenleBasla(key, m){
  yanitla = null;
  duzenle = { key, mid: m.mid, text: ozetYazi(m) };
  $('msgInput').value = m.text; autoGrow(); seritCiz(); $('msgInput').focus();
}
function duzenleBitir(){ duzenle = null; seritCiz(); }
function msgSil(key, m){
  m.del = true; m.text = ''; m.img = null; m.rx = null;
  ilet(key, { t: 'chat-del', mid: m.mid });
  if (sabit && sabit.mid === m.mid) sabitle(null);
  msgYenile(key, m.mid);
  if (key === 'all') saveChatSoon();
}
// ---------- sabitlenmiş mesaj ----------
const pinKey = () => 'oyunodasi-chatpin-' + roomCode;
const temizPin = x => x && typeof x === 'object' && typeof x.mid === 'string' ? { mid: clip(x.mid, 40), from: clip(x.from, 80), name: clip(x.name, 20) || 'Biri', text: typeof x.text === 'string' ? clip(x.text, 160) : '', ts: Number(x.ts) || Date.now() } : null;
function sabitle(pin, gelen){
  sabit = pin;
  try { if (pin) localStorage.setItem(pinKey(), JSON.stringify(pin)); else localStorage.removeItem(pinKey()); } catch(e){}
  if (!gelen) broadcast({ t: 'chat-pin', pin });
  sabitCiz();
  if (chatOpen && activeConvo === 'all') renderMsgs();
}
function sabitCiz(){
  let b = $('chatPin');
  if (!b){ b = document.createElement('div'); b.id = 'chatPin'; b.className = 'chat-pin'; $('msgs').before(b); }
  b.hidden = !sabit || activeConvo !== 'all';
  if (b.hidden) return;
  b.innerHTML = '<button type="button" class="pin-git"><b>📌 </b><span></span></button>';
  b.querySelector('b').textContent = '📌 ' + sabit.name + ': ';
  b.querySelector('span').textContent = sabit.text;
  b.querySelector('.pin-git').onclick = () => msgeGit(sabit.mid);
  if (typeof isHost !== 'undefined' && isHost){ const x = document.createElement('button'); x.type = 'button'; x.className = 'pin-x'; x.textContent = '✕'; x.title = 'Sabitlemeyi kaldır'; x.onclick = () => sabitle(null); b.append(x); }
}
function sabitYukle(){ try { sabit = temizPin(JSON.parse(localStorage.getItem(pinKey()) || 'null')); } catch(e){ sabit = null; } sabitCiz(); }
// ---------- yazı biçimi: **kalın**, *italik*, ~~üstü çizili~~, ||spoiler|| ----------
const BICIM_RE = /\|\|([\s\S]+?)\|\||\*\*([\s\S]+?)\*\*|~~([\s\S]+?)~~|(?<![\w*])\*(?!\s)([^*\n]+?)\*(?![\w*])/;
function bicimliYaz(text, into){
  const duz = (t, el) => { if (typeof etiketliYaz === 'function') etiketliYaz(t, el); else linkify(t, el); };
  let rest = text, guard = 0;
  while (rest && guard++ < 200){
    const m = BICIM_RE.exec(rest);
    if (!m){ duz(rest, into); break; }
    if (m.index) { const sp = document.createElement('span'); duz(rest.slice(0, m.index), sp); into.append(...sp.childNodes); }
    let el;
    if (m[1] != null){
      el = document.createElement('span'); el.className = 'spoiler'; el.title = 'Görmek için dokunabilirsiniz'; el.tabIndex = 0;
      el.onclick = ev => { if (!el.classList.contains('acik')){ ev.stopPropagation(); el.classList.add('acik'); } };
      el.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') el.classList.add('acik'); };
      bicimliYaz(m[1], el);
    } else if (m[2] != null){ el = document.createElement('strong'); bicimliYaz(m[2], el); }
    else if (m[3] != null){ el = document.createElement('s'); bicimliYaz(m[3], el); }
    else { el = document.createElement('em'); bicimliYaz(m[4], el); }
    into.append(el);
    rest = rest.slice(m.index + m[0].length);
  }
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
  const imgIdx = imgBudget(msgs, 8, 6000000);
  return msgs.map((m, i) => ({
    mid: m.mid, from: m.from, name: m.mine ? myName : m.name, ts: m.ts,
    text: m.text || (m.img && !imgIdx.includes(i) ? '[fotoğraf]' : ''),
    img: imgIdx.includes(i) ? m.img : null,
    re: m.re || null, rx: m.rx || null, ed: !!m.ed, del: !!m.del
  }));
}
function applyChatHistory(list, clearedAt){
  // oda sahibinin temizleme anı bizimkinden yeniyse (biz yokken temizlenmiş) eski mesajlarımızı da sil
  const ca = Number(clearedAt) || 0;
  if (ca > chatClearedAt){
    chatClearedAt = ca; store.set(clearKey(), String(ca));
    const c = convo('all');
    c.msgs = c.msgs.filter(m => m.sys || m.ts > ca);
    saveChat();
  }
  mergeChat(list, false);
}

// ---------- sohbet bildirimleri ----------
// Ayar: "hepsi" (her mesaj), "bana" (özel mesaj, etiketlenme, bana yanıt — varsayılan), "kapali".
// Sohbet kapalıyken ekranın köşesinde kısa bir önizleme çıkar; sekme arka plandaysa cihazın kendi bildirimi gelir.
const SB_KEY = 'oyunodasi-sohbet-bildirim';
const sbMod = () => { try { return localStorage.getItem(SB_KEY) || 'bana'; } catch(e){ return 'bana'; } };
const banaMi = (key, m) => key !== 'all' || !!(m.text && typeof etiketBeni === 'function' && etiketBeni(m.text)) || !!(m.re && peer && m.re.from === peer.id);
function sohbetBildir(key, m, visible){
  const mod = sbMod(); if (mod === 'kapali') return;
  const bana = banaMi(key, m);
  if (!bana && mod !== 'hepsi') return;
  const yanit = m.re && peer && m.re.from === peer.id;
  const baslik = key !== 'all' ? '🔒 ' + m.name + ' · özel mesaj' : yanit ? '↩ ' + m.name + ' sana yanıt verdi' : bana ? '📣 ' + m.name + ' seni etiketledi' : '💬 ' + m.name;
  const govde = m.text ? clip(duzYazi(m.text), 140) : '📷 fotoğraf gönderdi';
  if (document.hidden) sistemBildirimi(baslik, govde, key, m.from);
  else if (!visible) onizleme(baslik, govde, key, m.from);
}
function sistemBildirimi(baslik, govde, key, from){
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const url = location.pathname + '?oda=' + encodeURIComponent(roomCode) + '&sohbet=' + encodeURIComponent(key);
  const ops = { body: govde, tag: 'sohbet-' + key, renotify: true, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { url } };
  const yedek = () => { try { const n = new Notification(baslik, ops); n.onclick = () => { window.focus(); openChat(key); n.close(); }; } catch(e){} };
  if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(baslik, ops)).catch(yedek);
  else yedek();
}
// bildirime dokununca: aynı odadaysak ilgili konuşmayı aç
if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => {
  const d = e.data; if (!d || d.t !== 'bildirim-tik' || !d.url) return;
  try {
    const u = new URL(d.url, location.href), k = u.searchParams.get('sohbet');
    if (k && joined && u.searchParams.get('oda') === roomCode) openChat(k === 'all' || peers.has(k) ? k : 'all');
  } catch(err){}
});
let onzTimer = 0;
function onizleme(baslik, govde, key, from){
  let k = $('sohbetOnizleme');
  if (!k){ k = document.createElement('button'); k.type = 'button'; k.id = 'sohbetOnizleme'; k.className = 'sohbet-onizleme'; k.innerHTML = '<b></b><span></span>'; document.body.append(k); }
  k.style.setProperty('--c', colorFor(from));
  k.querySelector('b').textContent = baslik; k.querySelector('span').textContent = govde;
  k.onclick = () => { k.classList.remove('acik'); openChat(key); };
  k.classList.remove('acik'); void k.offsetWidth; k.classList.add('acik');
  clearTimeout(onzTimer); onzTimer = setTimeout(() => k.classList.remove('acik'), 4500);
}
// sohbet başlığında 🔔 ayar düğmesi
(() => {
  const araclar = document.querySelector('#chat .chat-tools'); if (!araclar) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.id = 'sohbetBildirimBtn'; b.title = 'Sohbet bildirimleri';
  araclar.prepend(b);
  const menu = document.createElement('div'); menu.className = 'sb-menu'; menu.hidden = true;
  const SECENEK = [['bana', '📣 Sadece bana gelenler', 'Özel mesaj, etiketlenme ve sana yanıt'], ['hepsi', '💬 Her mesaj', 'Sohbete yazılan her şey'], ['kapali', '🔕 Kapalı', 'Sadece sohbet düğmesindeki sayı']];
  const ciz = () => {
    const m = sbMod();
    b.textContent = m === 'kapali' ? '🔕' : '🔔';
    menu.innerHTML = '';
    SECENEK.forEach(([v, ad, ac]) => {
      const o = document.createElement('button'); o.type = 'button'; o.className = 'sb-sec' + (m === v ? ' on' : '');
      o.innerHTML = '<b></b><small></small>'; o.querySelector('b').textContent = ad; o.querySelector('small').textContent = ac;
      o.onclick = () => {
        try { localStorage.setItem(SB_KEY, v); } catch(e){}
        if (v !== 'kapali' && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().then(ciz).catch(() => {});
        ciz(); menu.hidden = true;
      };
      menu.append(o);
    });
    if ('Notification' in window && Notification.permission === 'denied' && m !== 'kapali'){
      const n = document.createElement('p'); n.className = 'note'; n.textContent = 'Cihaz bildirimleri bu sitede engellenmiş; sekme arka plandayken bildirim gelmez. Adres çubuğundaki kilit simgesinden izin verebilirsiniz.'; menu.append(n);
    }
  };
  b.onclick = e => { e.stopPropagation(); ciz(); menu.hidden = !menu.hidden; };
  document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true; });
  document.querySelector('#chat .panel-head').append(menu);
  ciz();
})();
$('msgInput').addEventListener('keydown', e => { if (e.key === 'Escape' && (yanitla || duzenle)){ e.preventDefault(); if (duzenle){ duzenleBitir(); $('msgInput').value = ''; autoGrow(); } else yanitBitir(); } });
