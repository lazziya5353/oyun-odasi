// Yönetim paneli · 🎭 Şaka sekmesi: açık bir odaya görünmez bağlantıyla bağlan, kişiyi seç, efekti gönder.
// Bağlantı oda sahibine yapılır ve sunucunun imzaladığı biletle doğrulanır (bkz. js/games/saka.js).
const SAKA_PREFIX = 'oyunodasi-v1-';
const SAKA_LIST = [
  ['domates', '🍅', 'Domates'], ['yumurta', '🥚', 'Yumurta'], ['pasta', '🥧', 'Pasta'], ['hamsi', '🐟', 'Hamsi tokadı'],
  ['korku', '👻', 'Korku'], ['orumcek', '🕷️', 'Örümcek'], ['cam', '💥', 'Ekran kırıldı'], ['sarhos', '🌀', 'Baş dönmesi'],
  ['donma', '🥶', 'Dondur'], ['osuruk', '💨', 'Pırrt'], ['korna', '📯', 'Korna'], ['tavuk', '🐔', 'Tavuklar'], ['konfeti', '🎉', 'Konfeti']
];
const SK = { peer: null, conn: null, code: '', list: [], to: '*', status: '', busy: false, ticket: null, listSig: '' };

function sakaServers(){
  if (Array.isArray(window.OYUNODASI_TEST_SERVERS)) return window.OYUNODASI_TEST_SERVERS;
  const list = [];
  const own = String((window.OYUNODASI_CONFIG || {}).sunucu || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (own) list.push({ host: own, port: 443, secure: true, path: '/' });
  list.push({ host: '0.peerjs.com', port: 443, secure: true, path: '/' });
  return list;
}
async function sakaIce(){
  const list = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  try {
    const enc = s => new TextEncoder().encode(s);
    const username = (Math.floor(Date.now() / 1000) + 24 * 3600) + ':oyunodasi';
    const key = await crypto.subtle.importKey('raw', enc('openrelayprojectsecret'), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc(username)));
    list.push({ urls: ['turn:staticauth.openrelay.metered.ca:80', 'turn:staticauth.openrelay.metered.ca:443', 'turn:staticauth.openrelay.metered.ca:443?transport=tcp'], username, credential: btoa(String.fromCharCode(...sig)) });
  } catch(e){}
  return list;
}
function sakaDisconnect(){
  const p = SK.peer; SK.peer = null; SK.conn = null; SK.list = []; SK.listSig = '';
  try { p && p.destroy(); } catch(e){}
}
// Bir sunucuda dene: önce oda kodunun adresine (oda sahibi), o eski sürümse odadaki diğer kişilere.
// Sonuç: bağlanınca resolve; reject: 'yok' (oda bu sunucuda yok) | 'eski' (odadakilerin sayfası eski) | 'red' | 'timeout'
function sakaTry(srv, code){
  return new Promise(async (res, rej) => {
    let pr;
    try { pr = new Peer({ debug: 0, host: srv.host, port: srv.port, secure: srv.secure, path: srv.path, config: { iceServers: await sakaIce() } }); }
    catch(e){ rej('network'); return; }
    let done = false, cur = null, stepT = null, old = false, found = false;
    const queue = [SAKA_PREFIX + code], tried = new Set();
    const fail = t => { if (done) return; done = true; clearTimeout(allT); clearTimeout(stepT); try { pr.destroy(); } catch(e){} rej(t); };
    const allT = setTimeout(() => fail(old ? 'eski' : found ? 'timeout' : 'timeout'), 40000);
    const next = () => {
      if (done) return;
      clearTimeout(stepT);
      if (cur){ const c = cur; cur = null; try { c.close(); } catch(e){} }
      const id = queue.shift();
      if (!id){ fail(old ? 'eski' : found ? 'timeout' : 'yok'); return; }
      tried.add(id);
      const c = pr.connect(id, { reliable: true, metadata: { saka: SK.ticket } });
      cur = c;
      stepT = setTimeout(() => { if (cur === c) next(); }, 9000);
      c.on('open', () => { if (cur === c) found = true; });
      c.on('data', d => {
        if (!d || typeof d !== 'object') return;
        if (d.t === 'saka-liste'){
          if (!done && cur === c){ done = true; clearTimeout(allT); clearTimeout(stepT); SK.peer = pr; SK.conn = c; res(true); }
          if (SK.conn !== c) return;
          SK.list = Array.isArray(d.list) ? d.list : [];
          if (SK.to !== '*' && !SK.list.some(x => x.id === SK.to)) SK.to = '*';
          const s = JSON.stringify(SK.list);
          if (s !== SK.listSig){ SK.listSig = s; if (tab === 'saka' && !document.activeElement.matches('#list input')) renderList(); }
          return;
        }
        if (d.t === 'saka-ok' && SK.conn === c){
          const e = SAKA_LIST.find(x => x[0] === d.e) || ['mesaj', '📣', 'Mesaj'];
          const who = d.to === '*' ? 'herkese' : ((SK.list.find(x => x.id === d.to) || {}).name || 'kişiye');
          toast(e[1] + ' ' + e[2] + ' → ' + who + ' gönderildi');
          return;
        }
        if (cur !== c || done) return;
        if (d.t === 'saka-red'){ if (d.joined === false) next(); else fail('red'); return; }
        // eski sürüm bizi normal bir kişi sanıp odaya alıyor: içerideki kişileri öğren, onlardan birini dene
        if (d.t === 'peers' || d.t === 'redirect'){
          old = true;
          (Array.isArray(d.ids) ? d.ids : []).forEach(i => { if (typeof i === 'string' && i.startsWith(SAKA_PREFIX) && !tried.has(i) && !queue.includes(i)) queue.push(i); });
          next(); return;
        }
        if (d.t === 'hello' || d.t === 'sync'){ old = true; clearTimeout(stepT); stepT = setTimeout(() => { if (cur === c) next(); }, 1500); }
      });
      c.on('close', () => {
        if (SK.conn === c){
          sakaDisconnect(); SK.status = 'Bağlantı koptu (bağlandığın kişi odadan çıkmış olabilir). Tekrar bağlan.';
          if (tab === 'saka') renderList();
        }
      });
      c.on('error', () => {});
    };
    pr.on('error', e => {
      const t = e && e.type;
      if (t === 'peer-unavailable'){ next(); return; }      // denenen adres yok: sıradakine geç
      if (!SK.conn || SK.peer !== pr) fail(t || 'network');
    });
    pr.on('open', next);
  });
}
async function sakaConnect(code){
  code = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{3,12}$/.test(code)){ toast('Geçerli bir oda kodu yaz'); return; }
  if (typeof Peer === 'undefined'){ toast('Bağlantı kitaplığı yüklenemedi, sayfayı yenile'); return; }
  sakaDisconnect();
  SK.busy = true; SK.code = code; SK.status = '⏳ ' + code + ' odasına bağlanılıyor…'; renderList();
  try {
    if (!SK.ticket || SK.ticket.exp < Date.now() + 60e3){ const t = await api('admin-saka-bilet', {}); SK.ticket = { exp: t.exp, sig: t.sig }; }
    let last = '';
    for (const srv of sakaServers()){
      try { await sakaTry(srv, code); SK.status = ''; last = ''; break; }
      catch(e){ last = e; if (e === 'red' || e === 'eski') break; }
    }
    if (last) SK.status = {
      red: 'Oda, yönetici biletini kabul etmedi. Sayfayı yenileyip tekrar dene.',
      eski: 'Oda açık ama odadakilerin sayfası eski sürümde kalmış. Odadakiler sayfayı bir kez yenilesin (telefonda uygulamayı kapatıp açsın), sonra tekrar bağlan.',
      timeout: 'Oda bulundu ama bağlantı kurulamadı (ağ engeli olabilir). Biraz sonra tekrar dene.'
    }[last] || '“' + code + '” kodlu açık oda bulunamadı. Kod doğru mu, odada biri var mı?';
  } catch(e){ SK.status = e.message; }
  SK.busy = false;
  if (tab === 'saka') renderList();
}
// açıkken kişi listesini tazele
setInterval(() => { if (SK.conn && SK.conn.open && tab === 'saka' && !document.hidden) try { SK.conn.send({ t: 'saka-liste' }); } catch(e){} }, 5000);

function sakaSend(e, m){
  if (!SK.conn || !SK.conn.open){ toast('Önce bir odaya bağlan'); return; }
  try { SK.conn.send({ t: 'saka', e, to: SK.to, m: m || '' }); } catch(err){ toast('Gönderilemedi'); }
}
function renderSaka(list){
  if (!SK.conn){
    const box = el('div', 'ad-box');
    box.append(el('h3', '', '🎭 Odadakilere şaka yap'), note('Açık bir odaya bağlan; domates, yumurta, korku… seçtiğin kişinin ekranında birden çıksın. Odadakiler seni kişi listesinde görmez, sohbette “Yönetici …” yazar.'));
    const recent = [];
    if (push) push.gecmis.forEach(g => { if (!g.duyuru && g.code && Date.now() - g.at < 12 * 3600e3 && !recent.includes(g.code)) recent.push(g.code); });
    if (recent.length){
      const r = el('div', 'u-acts start'); r.append(el('span', 'note', 'Son açılan odalar:'));
      recent.slice(0, 6).forEach(c => r.append(button(c, '', () => sakaConnect(c))));
      box.append(r);
    }
    const row = el('div', 'u-acts start');
    const inp = el('input'); inp.className = 'inp'; inp.placeholder = 'Oda kodu'; inp.maxLength = 12; inp.style.textTransform = 'uppercase'; inp.style.width = '160px';
    inp.value = SK.code;
    inp.onkeydown = e => { if (e.key === 'Enter') sakaConnect(inp.value); };
    const go = button(SK.busy ? 'Bağlanıyor…' : '🔌 Bağlan', 'primary', () => sakaConnect(inp.value)); go.disabled = SK.busy;
    row.append(inp, go);
    box.append(row);
    if (SK.status) box.append(note(SK.status, /bulunamadı|kabul|koptu|eski|kurulamadı/.test(SK.status) ? 'err' : ''));
    list.append(box);
    return;
  }
  const head = el('div', 'ad-banner ok');
  head.append(el('span', '', '🟢 ' + SK.code + ' odasına bağlısın · ' + SK.list.length + ' kişi'), button('Bağlantıyı kes', '', () => { sakaDisconnect(); SK.status = ''; renderList(); }));
  list.append(head);
  const tg = el('div', 'ad-box'); tg.append(el('h3', '', '🎯 Kime?'));
  const chips = el('div', 'u-acts start');
  [{ id: '*', name: '👥 Herkes' }].concat(SK.list).forEach(p => {
    const b = button(p.name, SK.to === p.id ? 'primary' : '', () => { SK.to = p.id; renderList(); });
    chips.append(b);
  });
  tg.append(chips);
  list.append(tg);
  const fx = el('div', 'ad-box'); fx.append(el('h3', '', '🎭 Efekt'));
  const grid = el('div', 'saka-grid');
  SAKA_LIST.forEach(([id, ikon, ad]) => {
    const b = el('button', 'saka-btn'); b.type = 'button';
    b.append(el('b', '', ikon), el('span', '', ad));
    b.onclick = () => sakaSend(id);
    grid.append(b);
  });
  fx.append(grid, note('👻 Korku efekti ani ve sesli bir “korkutma”dır. Herkes Görünüm penceresinden şakaları kapatabilir.'));
  list.append(fx);
  const mb = el('div', 'ad-box'); mb.append(el('h3', '', '📣 Ekrana mesaj yaz'));
  const r = el('div', 'u-acts start');
  const m = el('input'); m.className = 'inp'; m.maxLength = 90; m.placeholder = 'ör. Sıra sende, uyuma!'; m.style.flex = '1';
  const sendM = () => { if (!m.value.trim()){ toast('Mesajı yaz'); return; } sakaSend('mesaj', m.value.trim()); m.value = ''; };
  m.onkeydown = e => { if (e.key === 'Enter') sendM(); };
  r.append(m, button('Gönder', 'primary', sendM));
  mb.append(r);
  list.append(mb);
}
