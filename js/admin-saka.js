// Yönetim paneli · 🎭 Şaka sekmesi: açık bir odaya görünmez bağlantıyla bağlan, kişiyi seç, efekti gönder.
// Bağlantı oda sahibine yapılır ve sunucunun imzaladığı biletle doğrulanır (bkz. js/games/saka.js).
const SAKA_PREFIX = 'oyunodasi-v1-';
const SAKA_LIST = [
  ['domates', '🍅', 'Domates'], ['yumurta', '🥚', 'Yumurta'], ['pasta', '🥧', 'Pasta'], ['hamsi', '🐟', 'Hamsi tokadı'],
  ['korku', '👻', 'Korku'], ['orumcek', '🕷️', 'Örümcek'], ['cam', '💥', 'Ekran kırıldı'], ['sarhos', '🌀', 'Baş dönmesi'],
  ['donma', '🥶', 'Dondur'], ['osuruk', '💨', 'Pırrt'], ['korna', '📯', 'Korna'], ['tavuk', '🐔', 'Tavuklar'], ['konfeti', '🎉', 'Konfeti']
];
// komik sesler (odada herkes duyar, ekranda küçük balon çıkar)
const SAKA_SES = [
  ['pirtuzun', '💨', 'Uzun pırrt'], ['badumtss', '🥁', 'Ba dum tss'], ['huzun', '🎺', 'Hüzünlü trompet'], ['kriket', '🦗', 'Cır cır'],
  ['alkis', '👏', 'Alkış'], ['yuh', '👎', 'Yuhalama'], ['dramatik', '😱', 'Dramatik'], ['boing', '🌀', 'Boing'], ['kaydirak', '🎢', 'Kaydırak düdüğü'],
  ['zil', '🔔', 'Ring zili'], ['vak', '🦆', 'Vak vak'], ['opucuk', '😘', 'Öpücük'], ['yanlis', '❌', 'Yanlış cevap'], ['dogru', '✅', 'Doğru cevap'], ['davul', '🥁', 'Davul gerilimi']
];
const SAKA_TUM = SAKA_LIST.concat([['mesaj', '📣', 'Ekrana mesaj']], SAKA_SES, [['replik', '🎬', 'Replikler']]);
// replik videoları: sitedeki "replikler" klasörü (liste Netlify yayınında otomatik çıkar)
let REPLIKLER = null;
async function replikYukle(){
  const al = u => fetch(u, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const [d, p] = await Promise.all([al('replikler/liste.json'), al('/api/duvar/replikler')]);
  const a = d && Array.isArray(d.klipler) ? d.klipler.map(k => Object.assign({ kaynak: 'github' }, k)) : [];
  const b = p && Array.isArray(p.replikler) ? p.replikler.map(x => ({ kaynak: 'panel', dosya: 'p_' + x.id + (/webm/.test(x.video.tip) ? '.webm' : '.mp4'), ad: x.ad, boyut: x.video.boyut, panel: x })) : [];
  REPLIKLER = a.concat(b).sort((x, y) => String(x.ad).localeCompare(String(y.ad), 'tr'));
}
// panelden yüklenen replik: parçaları birleştirip önizle
async function replikSrc(k){
  if (k.kaynak !== 'panel') return 'replikler/' + encodeURIComponent(k.dosya);
  const x = k.panel;
  const parts = await Promise.all(Array.from({ length: x.video.parca }, (_, i) => fetch('/api/duvar/parca?id=' + x.id + '&tur=r&n=' + i).then(r => r.arrayBuffer())));
  return URL.createObjectURL(new Blob(parts, { type: x.video.tip }));
}
function replikYuklemeFormu(box){
  const f = el('div', 'replik-yukle');
  const inp = el('input'); inp.type = 'file'; inp.accept = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v'; inp.multiple = true;
  const ad = el('input', 'inp'); ad.placeholder = 'Replik adı (tek video seçince)'; ad.maxLength = 100;
  const bil = note('');
  const cubuk = el('div', 'dv-cubuk'); const ic = el('i'); cubuk.append(ic); cubuk.hidden = true;
  inp.onchange = () => {
    const fs = [...inp.files];
    if (fs.length === 1 && !ad.value) ad.value = fs[0].name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim().slice(0, 100);
    ad.hidden = fs.length > 1;
    bil.textContent = fs.length ? fs.length + ' video · ' + (fs.reduce((t, f) => t + f.size, 0) / 1048576).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' MB' + (fs.length > 1 ? ' (adlar dosya adından alınır)' : '') : '';
  };
  const yukle = button('⬆️ Replik yükle', 'primary', async () => {
    const fs = [...inp.files];
    if (!fs.length){ toast('Önce video seç'); return; }
    const buyuk = fs.find(f => f.size > 40 * 1048576); if (buyuk){ toast(buyuk.name + ' 40 MB’tan büyük'); return; }
    yukle.disabled = true; cubuk.hidden = false; ic.style.width = '0%';
    const top = fs.reduce((t, f) => t + f.size, 0); let biten = 0, n = 0;
    try {
      for (const f of fs){
        const id = yeniId(), adi = fs.length === 1 && ad.value.trim() ? ad.value.trim() : f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim().slice(0, 100);
        bil.textContent = '⬆️ ' + adi + '…';
        const video = await parcaYukle(id, 'r', f, p => { ic.style.width = Math.round((biten + p * f.size) / top * 100) + '%'; });
        await req('/api/duvar/admin-replik-ekle', { id, ad: adi, video });
        biten += f.size; n++;
      }
      toast('✅ ' + n + ' replik yüklendi; herkesin Şaka panelinde hemen çıkar');
      await replikYukle(); renderList();
    } catch(e){ toast('Yüklenemedi: ' + (e.message || e)); yukle.disabled = false; cubuk.hidden = true; await replikYukle(); }
  });
  f.append(el('b', '', '⬆️ Panelden replik yükle'), note('GitHub’a ve yayına gerek yok. mp4/webm, video başına en fazla 40 MB (kısa replikler genelde 1–5 MB). Birden fazla video seçebilirsin.'), inp, ad, bil, cubuk, yukle);
  box.append(f);
}
function replikKutusu(list, gonderilebilir){
  const box = el('div', 'ad-box'); box.id = 'sakaReplik';
  box.append(el('h3', '', '🎬 Replikler (' + (REPLIKLER ? REPLIKLER.length : '…') + ')'));
  if (!REPLIKLER){ box.append(note('Yükleniyor…')); list.append(box); replikYukle().then(() => { if (tab === 'saka') renderList(); }); return; }
  replikYuklemeFormu(box);
  if (!REPLIKLER.length) box.append(note('Henüz replik yok. Yukarıdan video yükle.'));
  const g = el('div', 'replik-liste');
  REPLIKLER.forEach(k => {
    const row = el('div', 'replik-satir');
    const ad = el('span', 'replik-ad', '🎬 ' + k.ad);
    if (k.kaynak === 'github') ad.append(el('span', 'pill', 'GitHub'));
    const mb = el('span', 'note', (k.boyut / 1048576).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' MB');
    row.append(ad, mb);
    row.append(button('👁 Önizle', '', async () => {
      const ex = row.querySelector('video'); if (ex){ if (ex.src.startsWith('blob:')) URL.revokeObjectURL(ex.src); ex.remove(); return; }
      const v = el('video'); v.controls = true; v.autoplay = true; v.className = 'replik-onizle'; row.append(v);
      try { v.src = await replikSrc(k); } catch(e){ toast('Önizleme açılamadı'); v.remove(); }
    }));
    if (gonderilebilir){ const b = button('📤 Gönder', 'primary', () => sakaSend('replik', '', k.dosya)); row.append(b); }
    if (k.kaynak === 'panel'){
      row.append(button('✏️', '', () => {
        const a = el('input', 'inp'); a.value = k.ad; a.maxLength = 100; a.style.flex = '1';
        row.innerHTML = ''; row.append(a, button('Kaydet', 'primary', async () => { try { await req('/api/duvar/admin-replik-ad', { id: k.panel.id, ad: a.value }); toast('Kaydedildi'); await replikYukle(); renderList(); } catch(e){ toast(e.message); } }), button('Vazgeç', '', () => renderList()));
        a.focus();
      }));
      row.append(dangerBtn('🗑', async () => { try { await req('/api/duvar/admin-replik-sil', { id: k.panel.id }); toast('Replik silindi'); await replikYukle(); renderList(); } catch(e){ toast(e.message); } }));
    }
    g.append(row);
  });
  box.append(g);
  if (REPLIKLER.length && !gonderilebilir) box.append(note('Göndermek için yukarıdan odaya bağlan.'));
  box.append(note('GitHub’daki “replikler” klasöründen eklenenler de burada görünür; onları silmek için dosyayı GitHub’dan sil.'));
  list.append(box);
}
// kullanıcıların birbirine şaka yapma ayarları
const SA = { ayar: null, kayit: false };
async function sakaAyarYukle(){
  try { const r = await fetch('/api/uye/saka-ayar', { cache: 'no-store' }); SA.ayar = r.ok ? await r.json() : null; } catch(e){ SA.ayar = null; }
}
async function sakaAyarKaydet(patch, msg){
  const a = Object.assign({}, SA.ayar || { acik: true, kapali: [], engel: [], bekleme: 5 }, patch);
  SA.kayit = true;
  try {
    const d = await api('admin-saka-ayar', a); SA.ayar = d.ayar;
    // odaya bağlıysan ayar herkese anında ulaşsın (bağlı değilsen en geç birkaç dakika içinde)
    if (SK.conn && SK.conn.open) try { SK.conn.send({ t: 'saka-ayar' }); } catch(e){}
    toast(msg || 'Kaydedildi');
  } catch(e){ toast(e.message); }
  SA.kayit = false;
  if (tab === 'saka') renderList();
}
function renderKullaniciSaka(list){
  const box = el('div', 'ad-box'); box.id = 'sakaKullanici';
  box.append(el('h3', '', '👥 Kullanıcıların birbirine şaka yapması'));
  if (!SA.ayar){ box.append(note('Ayarlar yükleniyor…')); list.append(box); sakaAyarYukle().then(() => { if (tab === 'saka' && SA.ayar) renderList(); }); return; }
  const a = SA.ayar;
  const top = el('div', 'u-acts start');
  top.append(button(a.acik ? '🟢 Açık · kapat' : '🔴 Kapalı · aç', a.acik ? '' : 'primary', () => sakaAyarKaydet({ acik: !a.acik }, a.acik ? '🔒 Kullanıcı şakaları kapatıldı' : '🎭 Kullanıcı şakaları açıldı')));
  const sel = el('select'); sel.className = 'inp';
  [[0, 'Bekleme yok'], [3, '3 sn'], [5, '5 sn'], [10, '10 sn'], [30, '30 sn'], [60, '1 dk'], [300, '5 dk']].forEach(([v, t]) => { const o = el('option', '', 'İki şaka arası: ' + t); o.value = v; o.selected = +a.bekleme === v; sel.append(o); });
  sel.onchange = () => sakaAyarKaydet({ bekleme: +sel.value }, 'Bekleme süresi kaydedildi');
  top.append(sel);
  box.append(top, note(a.acik ? 'Odadakiler alt şeritteki 🎭 Şaka düğmesinden birbirine atabiliyor. Sürekli atan olursa aşağıdan onu engelle ya da efekti kapat.' : 'Şu an kimse şaka yapamıyor (senin panelden attıkların hariç).'));
  // engellenen kişiler
  const eb = el('div', 'saka-engel');
  eb.append(el('b', '', '🚫 Şaka yapması engellenenler'));
  const chips = el('div', 'u-acts start');
  if (!a.engel.length) chips.append(el('span', 'note', 'Kimse engelli değil.'));
  a.engel.forEach(n => chips.append(button(n + ' ✕', 'kick-btn', () => sakaAyarKaydet({ engel: a.engel.filter(x => x !== n) }, n + ' artık şaka yapabilir'))));
  eb.append(chips);
  const addRow = el('div', 'u-acts start');
  const inp = el('input'); inp.className = 'inp'; inp.placeholder = 'Engellenecek kişinin adı'; inp.maxLength = 20; inp.setAttribute('list', 'sakaAdlar');
  const dl = el('datalist'); dl.id = 'sakaAdlar';
  const adlar = new Set();
  (SK.list || []).forEach(p => adlar.add(p.name));
  (users || []).filter(u => u.durum === 'onayli').forEach(u => adlar.add(u.name));
  adlar.forEach(n => { const o = el('option'); o.value = n; dl.append(o); });
  const ekle = () => { const n = inp.value.trim().toLocaleLowerCase('tr-TR'); if (!n) return; if (a.engel.includes(n)){ toast('Zaten engelli'); return; } sakaAyarKaydet({ engel: a.engel.concat(n) }, '🚫 ' + inp.value.trim() + ' artık şaka yapamaz'); };
  inp.onkeydown = e => { if (e.key === 'Enter') ekle(); };
  addRow.append(inp, dl, button('🚫 Engelle', 'kick-btn', ekle));
  eb.append(addRow);
  if (SK.list && SK.list.length){
    const hz = el('div', 'u-acts start'); hz.append(el('span', 'note', 'Odadakiler:'));
    SK.list.filter(p => !a.engel.includes(p.name.toLocaleLowerCase('tr-TR'))).forEach(p => hz.append(button('🚫 ' + p.name, '', () => sakaAyarKaydet({ engel: a.engel.concat(p.name.toLocaleLowerCase('tr-TR')) }, '🚫 ' + p.name + ' artık şaka yapamaz'))));
    eb.append(hz);
  }
  box.append(eb);
  // efektler: tıklayınca aç / kapat
  const fb = el('div', 'saka-engel');
  fb.append(el('b', '', 'Efektler (üstü çizili olanlar kullanıcılara kapalı)'));
  const g = el('div', 'saka-grid kucuk');
  SAKA_TUM.forEach(([id, ikon, ad]) => {
    const off = a.kapali.includes(id);
    const b = el('button', 'saka-btn' + (off ? ' kapali' : '')); b.type = 'button';
    b.append(el('b', '', ikon), el('span', '', ad));
    b.title = off ? 'Kapalı · açmak için tıkla' : 'Açık · kapatmak için tıkla';
    b.onclick = () => sakaAyarKaydet({ kapali: off ? a.kapali.filter(x => x !== id) : a.kapali.concat(id) }, ikon + ' ' + ad + (off ? ' açıldı' : ' kapatıldı'));
    g.append(b);
  });
  fb.append(g);
  box.append(fb);
  list.append(box);
}
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
    let done = false, cur = null, stepT = null, old = false, found = false, redCount = 0;
    const queue = [SAKA_PREFIX + code], tried = new Set();
    const fail = t => { if (done) return; done = true; clearTimeout(allT); clearTimeout(stepT); try { pr.destroy(); } catch(e){} rej(t); };
    const allT = setTimeout(() => fail(old ? 'eski' : found ? 'timeout' : 'timeout'), 40000);
    const next = () => {
      if (done) return;
      clearTimeout(stepT);
      if (cur){ const c = cur; cur = null; try { c.close(); } catch(e){} }
      const id = queue.shift();
      if (!id){ fail(old || redCount ? 'eski' : found ? 'timeout' : 'yok'); return; }
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
          const e = SAKA_TUM.find(x => x[0] === d.e) || ['mesaj', '📣', 'Mesaj'];
          const who = d.to === '*' ? 'herkese' : ((SK.list.find(x => x.id === d.to) || {}).name || 'kişiye');
          toast(e[1] + ' ' + e[2] + ' → ' + who + ' gönderildi');
          return;
        }
        if (cur !== c || done) return;
        // reddeden kişi: ilk şaka sürümündeki oda sahibi olmayan biri (host:false) ya da odaya girmemiş biri → sıradakini dene
        if (d.t === 'saka-red'){ redCount++; if (d.joined === false || d.host === false || queue.length) next(); else fail('red'); return; }
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

function sakaSend(e, m, r){
  if (!SK.conn || !SK.conn.open){ toast('Önce bir odaya bağlan'); return; }
  const msg = { t: 'saka', e, to: SK.to, m: m || '' };
  if (r) msg.r = r;
  try { SK.conn.send(msg); } catch(err){ toast('Gönderilemedi'); }
}
function renderSaka(list){
  if (!SK.conn){
    const box = el('div', 'ad-box');
    box.append(el('h3', '', '🎭 Yönetici olarak şaka yap'), note('Açık bir odaya bağlan; domates, yumurta, korku… seçtiğin kişinin ekranında birden çıksın. Odadakiler seni kişi listesinde görmez, sohbette “Yönetici …” yazar.'));
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
    replikKutusu(list, false);
    renderKullaniciSaka(list);
    return;
  }
  const head = el('div', 'ad-banner ok');
  head.append(el('span', '', '🟢 ' + SK.code + ' odasına bağlısın · ' + SK.list.length + ' kişi'), button('Bağlantıyı kes', '', () => { sakaDisconnect(); SK.status = ''; renderList(); }));
  list.append(head);
  const tg = el('div', 'ad-box'); tg.id = 'sakaKime'; tg.append(el('h3', '', '🎯 Kime?'));
  const chips = el('div', 'u-acts start');
  [{ id: '*', name: '👥 Herkes' }].concat(SK.list).forEach(p => {
    const b = button(p.name, SK.to === p.id ? 'primary' : '', () => { SK.to = p.id; renderList(); });
    chips.append(b);
  });
  tg.append(chips);
  list.append(tg);
  const fx = el('div', 'ad-box'); fx.id = 'sakaEfekt'; fx.append(el('h3', '', '🎭 Efekt'));
  const grid = el('div', 'saka-grid');
  SAKA_LIST.forEach(([id, ikon, ad]) => {
    const b = el('button', 'saka-btn'); b.type = 'button';
    b.append(el('b', '', ikon), el('span', '', ad));
    b.onclick = () => sakaSend(id);
    grid.append(b);
  });
  const sg = el('div', 'saka-grid');
  SAKA_SES.forEach(([id, ikon, ad]) => {
    const b = el('button', 'saka-btn'); b.type = 'button';
    b.append(el('b', '', ikon), el('span', '', ad));
    b.onclick = () => sakaSend(id);
    sg.append(b);
  });
  fx.append(grid, el('h3', '', '🔊 Komik sesler'), sg, note('👻 Korku efekti ani ve sesli bir “korkutma”dır. Herkes Görünüm penceresinden şakaları kapatabilir.'), note('Kendine gönderirsen: oda sekmesine geçince efekt oynar. Efekti görmek için kişinin sayfasının güncel olması gerekir (güncellemeden sonra bir kez yenilemiş olmalı).'));
  list.append(fx);
  const mb = el('div', 'ad-box'); mb.append(el('h3', '', '📣 Ekrana mesaj yaz'));
  const r = el('div', 'u-acts start');
  const m = el('input'); m.className = 'inp'; m.maxLength = 90; m.placeholder = 'ör. Sıra sende, uyuma!'; m.style.flex = '1';
  const sendM = () => { if (!m.value.trim()){ toast('Mesajı yaz'); return; } sakaSend('mesaj', m.value.trim()); m.value = ''; };
  m.onkeydown = e => { if (e.key === 'Enter') sendM(); };
  r.append(m, button('Gönder', 'primary', sendM));
  mb.append(r);
  list.append(mb);
  replikKutusu(list, true);
  renderKullaniciSaka(list);
}
