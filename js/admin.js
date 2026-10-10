// Yönetim paneli: genel bakış, üyelik başvuruları, üyeler (ad, şifre, durdur, çıkış yaptır, sil),
// bildirimler + duyuru, skor tabloları, müzik kütüphanesi, ayarlar (yönetici şifresi, işlem geçmişi).
// Liste 6 saniyede bir arka planda kontrol edilir; ekran SADECE bir şey değiştiyse yeniden çizilir.
const $ = id => document.getElementById(id);
const API = '/api/uye/';
let tok = sessionStorage.getItem('oyunodasi-admin') || '';
let users = [], tab = '', known = null, push = null, gunluk = null, muzik = null, adminBildirim = 0;
let sig = '', tabSig = '', editing = null;
const tmpPw = {}, fresh = new Set();
const skor = { game: 'sudoku', level: 'kolay', data: null };
const baseTitle = document.title;
const USER_TABS = ['bekliyor', 'onayli', 'askida', 'red'];
const GAMES = {
  sudoku: ['Sudoku', ['kolay', 'orta', 'zor'], 'sure'], kelime: ['Kelime Bul', [''], 'kelime'], yapboz: ['Yapboz', ['kolay', 'orta', 'zor'], 'sure'],
  kosu: ['Koşu', [''], 'puan'], ordek: ['Ördek Avı', [''], 'puan'], yilan: ['Yılan', [''], 'puan'], mayin: ['Mayın Tarlası', ['kolay', 'orta', 'zor'], 'sure'],
  adam: ['Adam Asmaca', [''], 'puan'], ikibin: ['2048', [''], 'puan'], hafiza: ['Hafıza', ['kolay', 'orta', 'zor'], 'sure']
};

function toast(m){ const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3500); }
async function req(url, body){
  const r = await fetch(url, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', 'x-admin': tok }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && !/admin-giris/.test(url)){ logout(); throw new Error('Oturum bitti, tekrar giriş yap.'); }
  if (!r.ok) throw new Error(d.hata || 'Sunucuya ulaşılamadı');
  return d;
}
const api = (path, body) => req(API + path, body);
function logout(){ tok = ''; sessionStorage.removeItem('oyunodasi-admin'); clearInterval(start.t); $('panel').hidden = true; $('loginCard').hidden = false; }
const fmt = ts => ts ? new Date(ts).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
function ago(ts){
  if (!ts) return 'hiç';
  const m = Math.round((Date.now() - ts) / 60e3);
  if (m < 2) return 'şimdi'; if (m < 60) return m + ' dk önce';
  const h = Math.round(m / 60); if (h < 24) return h + ' saat önce';
  const d = Math.round(h / 24); return d < 30 ? d + ' gün önce' : fmt(ts);
}
const initial = n => (n || '?').trim().charAt(0).toLocaleUpperCase('tr-TR');
const mb = b => (b / 1048576).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' MB';
const trLow = s => String(s || '').toLocaleLowerCase('tr-TR');
function el(tag, cls, text){ const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function note(text, cls){ return el('p', 'note' + (cls ? ' ' + cls : ''), text); }
function button(text, cls, fn){ const b = el('button', 'btn small ' + (cls || ''), text); b.type = 'button'; b.onclick = fn; return b; }
// tehlikeli işlemler iki tıklama ister: önce "Emin misin?" (4 sn)
function dangerBtn(text, fn){
  const b = button(text, 'kick-btn', () => {
    if (!b.dataset.armed){ b.dataset.armed = '1'; b.textContent = 'Emin misin?'; b.style.background = 'var(--danger)'; b.style.color = '#fff';
      setTimeout(() => { if (b.isConnected){ delete b.dataset.armed; b.textContent = text; b.style.background = ''; b.style.color = ''; } }, 4000); return; }
    delete b.dataset.armed; fn(b);
  });
  return b;
}
function ding(){
  try { const a = new (window.AudioContext || window.webkitAudioContext)(); [880, 1175].forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.12, a.currentTime + i * .12); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + i * .12 + .25); o.connect(g); g.connect(a.destination); o.start(a.currentTime + i * .12); o.stop(a.currentTime + i * .12 + .3); }); } catch(e){}
}

// ---------- veri ----------
async function loadUsers(quiet){
  const d = await api('admin-liste');
  adminBildirim = d.adminBildirim;
  $('pushBtn').textContent = adminBildirim ? '🔔 Bildirim açık' : '🔔 Başvuru bildirimi al';
  const next = d.uyeler;
  const pend = next.filter(u => u.durum === 'bekliyor');
  if (known){
    const nw = pend.filter(u => !known.has(u.id));
    if (nw.length){ ding(); toast('🆕 Yeni başvuru: ' + nw.map(u => u.adSoyad).join(', ')); nw.forEach(u => fresh.add(u.id)); if (quiet && tab === 'genel' && !editing) tab = 'bekliyor'; }
  }
  known = new Set(next.map(u => u.id));
  document.title = (pend.length ? '(' + pend.length + ') ' : '') + baseTitle;
  const s = JSON.stringify(next);
  const changed = s !== sig; sig = s; users = next;
  return changed;
}
async function loadPush(){ try { push = await req('/api/bildirim/admin-durum'); } catch(e){ push = null; } }
async function loadGunluk(){ try { gunluk = await api('admin-gunluk'); } catch(e){ gunluk = null; } }
async function loadMuzik(){ try { const r = await fetch('/api/muzik/liste'); muzik = r.ok ? await r.json() : null; } catch(e){ muzik = null; } }
async function loadSkor(){
  skor.data = null;
  try { skor.data = await req('/api/skor/admin-tablo?game=' + skor.game + '&level=' + encodeURIComponent(skor.level)); } catch(e){ skor.data = { hata: e.message }; }
}
// sekmeye girerken gereken veriyi çek
async function loadTab(){
  if (tab === 'genel' || USER_TABS.includes(tab)) { try { await loadUsers(); } catch(e){} }
  if (tab === 'genel') await Promise.all([loadPush(), loadMuzik(), loadGunluk()]);
  if (tab === 'bildirim' || (tab === 'saka' && !SK.conn)) await loadPush();
  if (tab === 'muzik') await loadMuzik();
  if (tab === 'skor') await loadSkor();
  if (tab === 'ayar') await loadGunluk();
}
// arka plan kontrolü: sadece değişiklik varsa çiz; yazı yazarken / düzenlerken asla
async function poll(){
  try {
    const changed = await loadUsers(true);
    renderTabs();
    const busy = editing || (document.activeElement && document.activeElement.matches('#list input, #list textarea, #list select'));
    if (changed && !busy && (tab === 'genel' || USER_TABS.includes(tab))) renderList();
  } catch(e){}
}

// ---------- sekmeler ----------
function counts(){ const c = { bekliyor: 0, onayli: 0, askida: 0, red: 0 }; users.forEach(u => { c[u.durum] = (c[u.durum] || 0) + 1; }); return c; }
function renderTabs(){
  const c = counts();
  const defs = [['genel', '📊 Genel'], ['bekliyor', '⏳ Onay bekleyen (' + c.bekliyor + ')'], ['onayli', '✅ Üyeler (' + c.onayli + ')']];
  if (c.askida || tab === 'askida') defs.push(['askida', '⏸ Durdurulan (' + c.askida + ')']);
  defs.push(['red', '✗ Reddedilen (' + c.red + ')'], ['saka', '🎭 Şaka'], ['bildirim', '🔔 Bildirimler'], ['skor', '🏆 Skorlar'], ['muzik', '🎵 Müzik'], ['ayar', '⚙️ Ayarlar']);
  const s = JSON.stringify(defs) + tab;
  if (s === tabSig) return; tabSig = s;
  const tabs = $('tabs'); tabs.innerHTML = '';
  defs.forEach(([k, n]) => {
    const b = el('button', tab === k ? 'on' : '', n); b.type = 'button';
    b.onclick = () => go(k);
    tabs.append(b);
  });
}
async function go(k){
  tab = k; editing = null; renderTabs();
  $('q').hidden = !(USER_TABS.includes(k) || k === 'muzik');
  $('q').placeholder = k === 'muzik' ? '🔎 Şarkı ya da yükleyen ara' : '🔎 İsim ya da kullanıcı adı ara';
  const list = $('list'); list.innerHTML = ''; list.append(note('Yükleniyor…'));
  await loadTab(); renderList();
}
function renderList(){
  const list = $('list'); list.innerHTML = '';
  if (tab === 'genel') renderGenel(list);
  else if (USER_TABS.includes(tab)) renderUsers(list);
  else if (tab === 'bildirim') renderPush(list);
  else if (tab === 'saka') renderSaka(list);
  else if (tab === 'skor') renderSkor(list);
  else if (tab === 'muzik') renderMuzik(list);
  else if (tab === 'ayar') renderAyar(list);
  fresh.clear();
}

// ---------- genel bakış ----------
function stat(n, label, k){
  const b = el('button', 'ad-stat'); b.type = 'button';
  b.append(el('b', '', String(n)), el('span', '', label));
  if (k) b.onclick = () => go(k); else b.disabled = true;
  return b;
}
function renderGenel(list){
  const c = counts();
  const songs = muzik ? muzik.songs : [];
  const weekAgo = Date.now() - 7 * 864e5;
  const rooms = push ? push.gecmis.filter(g => !g.duyuru) : [];
  const grid = el('div', 'ad-stats');
  grid.append(
    stat(c.onayli, 'üye', 'onayli'),
    stat(c.bekliyor, 'onay bekleyen', 'bekliyor'),
    stat(users.filter(u => u.lastSeen && u.lastSeen > Date.now() - 864e5).length, 'son 24 saatte giren', 'onayli'),
    stat(push ? push.cihazlar.length : '–', 'bildirimi açık cihaz', 'bildirim'),
    stat(rooms.filter(g => g.at > weekAgo).length, 'son 7 günde açılan oda', 'bildirim'),
    stat(songs.length, 'şarkı · ' + mb(songs.reduce((a, s) => a + (s.size || 0), 0)), 'muzik'),
    stat(muzik ? muzik.playlists.length : '–', 'playlist', 'muzik')
  );
  list.append(grid);
  if (c.bekliyor){
    const w = el('div', 'ad-banner');
    w.append(el('span', '', '⏳ ' + c.bekliyor + ' başvuru onayını bekliyor'), button('Göster', 'primary', () => go('bekliyor')));
    list.append(w);
  }
  const cols = el('div', 'ad-cols');
  const seen = el('div', 'ad-box'); seen.append(el('h3', '', '👀 Son girenler'));
  const sl = users.filter(u => u.lastSeen).sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 8);
  if (!sl.length) seen.append(note('Henüz kayıt yok (üyeler bir sonraki girişlerinde görünür).'));
  sl.forEach(u => { const r = el('div', 'ad-mini'); r.append(el('span', '', u.name + ' (@' + u.kadi + ')'), el('span', 'ad-muted', ago(u.lastSeen))); seen.append(r); });
  const rm = el('div', 'ad-box'); rm.append(el('h3', '', '🎮 Son açılan odalar'));
  if (!rooms.length) rm.append(note('Henüz kayıt yok.'));
  rooms.slice(0, 8).forEach(g => { const r = el('div', 'ad-mini'); r.append(el('span', '', g.by + ' · ' + g.code), el('span', 'ad-muted', ago(g.at) + ' · ' + g.sent + '/' + g.total + ' bildirim')); rm.append(r); });
  cols.append(seen, rm);
  list.append(cols);
  if (gunluk && gunluk.hataliDeneme >= 3) list.append(note('⚠️ Son 24 saatte ' + gunluk.hataliDeneme + ' kez yanlış yönetici şifresi denendi.', 'err'));
}

// ---------- üyeler ----------
function renderUsers(list){
  const q = trLow($('q').value.trim());
  const shown = users.filter(u => u.durum === tab && (!q || trLow(u.adSoyad + ' ' + u.kadi + ' ' + u.name).includes(q)));
  if (tab === 'onayli') shown.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0) || b.created - a.created);
  if (tab === 'bekliyor' && shown.length > 1){
    const bar = el('div', 'u-acts start');
    bar.append(button('✓ Hepsini onayla (' + shown.length + ')', 'primary', async e => {
      e.target.disabled = true;
      for (const u of shown){ try { await api('admin-onay', { id: u.id, onay: true }); } catch(err){ toast(err.message); } }
      toast(shown.length + ' kişi onaylandı'); await refresh();
    }));
    list.append(bar);
  }
  if (!shown.length){ list.append(note(tab === 'bekliyor' ? 'Onay bekleyen başvuru yok.' : 'Kimse yok.')); return; }
  shown.forEach(u => list.append(userRow(u)));
}
function userRow(u){
  const row = el('div', 'u ' + u.durum + (fresh.has(u.id) ? ' yeni' : ''));
  const av = el('div', 'u-av');
  if (u.foto) av.style.backgroundImage = 'url("' + u.foto + '")'; else av.textContent = initial(u.name);
  const info = el('div', 'u-info');
  const b = el('b', '', u.adSoyad);
  const P = { onayli: ['ok', 'üye'], bekliyor: ['wait', 'onay bekliyor'], red: ['no', 'reddedildi'], askida: ['no', 'durduruldu'] }[u.durum] || ['', u.durum];
  b.append(el('span', 'pill ' + P[0], P[1]));
  const s1 = el('span', '', '@' + u.kadi + ' · görünen ad: ' + u.name);
  const s2 = el('span', '', 'Başvuru: ' + fmt(u.created) + (u.approvedAt ? ' · Onay: ' + fmt(u.approvedAt) : '') + (u.durum !== 'bekliyor' ? ' · Son giriş: ' + ago(u.lastSeen) : '') + (u.bildirim ? ' · 🔔' : ''));
  info.append(b, s1, s2);
  if (tmpPw[u.id]){
    const s3 = el('span'); s3.append('Yeni geçici şifre: ', el('span', 'tmp', tmpPw[u.id]), ' — bunu ' + u.name + '’a ilet, girince profilinden değiştirsin.');
    const x = button('Tamam', '', () => { delete tmpPw[u.id]; s3.remove(); }); s3.append(' ', x);
    info.append(s3);
  }
  const acts = el('div', 'u-acts');
  const A = (t, cls, fn) => acts.append(button(t, cls, fn));
  if (u.durum === 'bekliyor' || u.durum === 'red') A('✓ Onayla', 'primary', () => act('admin-onay', { id: u.id, onay: true }, u.adSoyad + ' onaylandı' + (u.bildirim ? ', bildirim gönderildi' : '')));
  if (u.durum === 'bekliyor') A('✗ Reddet', '', () => act('admin-onay', { id: u.id, onay: false }, 'Başvuru reddedildi'));
  if (u.durum === 'onayli'){
    A('✏️ Ad', '', () => {
      editing = u.id;
      const inp = el('input'); inp.type = 'text'; inp.value = u.name; inp.maxLength = 20; inp.className = 'inp'; inp.style.width = '140px';
      const save = () => { editing = null; act('admin-ad', { id: u.id, name: inp.value }, 'Ad değişti'); };
      inp.onkeydown = e => { if (e.key === 'Enter') save(); if (e.key === 'Escape'){ editing = null; renderList(); } };
      acts.innerHTML = ''; acts.append(inp, button('Kaydet', 'primary', save), button('Vazgeç', '', () => { editing = null; renderList(); })); inp.focus();
    });
    A('🔑 Şifre sıfırla', '', async () => {
      try { const d = await api('admin-sifre', { id: u.id }); tmpPw[u.id] = d.yeni; renderList(); }
      catch(e){ toast(e.message); }
    });
    acts.append(dangerBtn('🚪 Çıkış yaptır', () => act('admin-oturum-kapat', { id: u.id }, u.name + ' tüm cihazlardan çıkarıldı')));
    acts.append(dangerBtn('⏸ Durdur', () => act('admin-askiya', { id: u.id, askida: true }, u.name + ' durduruldu, giriş yapamaz')));
  }
  if (u.durum === 'askida') A('▶ Yeniden aç', 'primary', () => act('admin-askiya', { id: u.id, askida: false }, u.name + ' yeniden açıldı'));
  acts.append(dangerBtn('🗑 Sil', () => act('admin-sil', { id: u.id }, 'Silindi')));
  row.append(av, info, acts);
  return row;
}
async function act(path, body, msg){
  try { await api(path, body); toast(msg); await refresh(); } catch(e){ toast(e.message); }
}
async function refresh(){ editing = null; await loadUsers(); renderTabs(); renderList(); }

// ---------- bildirimler ----------
function renderPush(list){
  if (!push){ list.append(note('Bildirim bilgisi alınamadı.')); return; }
  // duyuru
  const box = el('div', 'ad-box');
  box.append(el('h3', '', '📢 Herkese duyuru gönder'), note('Bildirimi açık olan ' + push.cihazlar.length + ' cihaza gider (ör. “Bu akşam 21:00’de turnuva var”).'));
  const t = el('input'); t.className = 'inp'; t.maxLength = 60; t.placeholder = 'Başlık (ör. Turnuva akşamı)';
  const m = el('textarea'); m.className = 'inp'; m.maxLength = 200; m.rows = 2; m.placeholder = 'Mesaj';
  const send = button('📢 Gönder', 'primary', async () => {
    if (!t.value.trim() && !m.value.trim()){ toast('Duyuru metnini yaz.'); return; }
    send.disabled = true;
    try { const d = await req('/api/bildirim/admin-duyuru', { title: t.value, body: m.value }); toast('Duyuru ' + d.sent + '/' + d.total + ' cihaza ulaştı'); t.value = ''; m.value = ''; await loadPush(); renderList(); }
    catch(e){ toast(e.message); send.disabled = false; }
  });
  box.append(t, m, send);
  list.append(box);
  const head = el('div', 'u-acts start');
  const tb = button('🧪 Hepsine deneme bildirimi gönder', '', async () => {
    tb.disabled = true;
    try { const d = await req('/api/bildirim/admin-test', {}); toast('Deneme: ' + d.sent + '/' + d.total + ' cihaza ulaştı' + (d.gone ? ' · ' + d.gone + ' eski kayıt silindi' : '')); await loadPush(); renderList(); }
    catch(e){ toast('Gönderilemedi'); tb.disabled = false; }
  });
  head.append(tb, button('🔄 Yenile', '', async () => { await loadPush(); renderList(); }), el('span', 'note', push.cihazlar.length + ' cihazda bildirim açık. Oda açanın kendi cihazına bildirim gitmez.'));
  list.append(head);
  push.cihazlar.slice().sort((a, b) => (b.last ? b.last.at : 0) - (a.last ? a.last.at : 0)).forEach(c => {
    const row = el('div', 'u');
    const av = el('div', 'u-av', /Apple/.test(c.platform) ? '🍎' : /Android|Chrome/.test(c.platform) ? '🤖' : '💻');
    const info = el('div', 'u-info');
    const ok = c.last && c.last.st >= 200 && c.last.st < 300;
    const s2 = el('span', '', !c.last ? 'Henüz bildirim gönderilmedi' : (ok ? '✅ Son bildirim ulaştı · ' : '❌ Son bildirim ulaşmadı (kod ' + (c.last.st || c.last.err || '?') + ') · ') + fmt(c.last.at));
    if (c.last && !ok) s2.style.color = 'var(--danger)';
    info.append(el('b', '', c.name || '—'), el('span', '', c.platform + ' · kayıt: ' + fmt(c.ts)), s2);
    const acts = el('div', 'u-acts');
    if (c.key) acts.append(dangerBtn('🗑 Kaldır', async () => {
      try { await req('/api/bildirim/admin-cihaz-sil', { key: c.key }); toast('Cihaz listeden çıkarıldı'); await loadPush(); renderList(); } catch(e){ toast(e.message); }
    }));
    row.append(av, info, acts);
    list.append(row);
  });
  if (push.gecmis.length){
    list.append(el('h3', '', 'Son gönderimler'));
    push.gecmis.slice(0, 15).forEach(g => {
      const p = note(fmt(g.at) + ' · ' + (g.duyuru ? '📢 Duyuru: “' + (g.text || '') + '”' : g.by + ' “' + g.code + '” odasını açtı') + ' → ' + g.sent + '/' + g.total + ' cihaza ulaştı' + (g.fails && g.fails.length ? ' · ulaşmayan: ' + g.fails.map(f => f.name + ' (' + (f.st || f.err || '?') + ')').join(', ') : ''));
      p.style.margin = '0'; list.append(p);
    });
  }
}

// ---------- skorlar ----------
function fmtScore(game, s){
  const kind = GAMES[game][2];
  const t = sec => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  if (kind === 'sure') return t(s);
  if (kind === 'kelime') return Math.floor(s / 1000) + '/6 · ' + t(s % 1000);
  return Number(s).toLocaleString('tr-TR') + ' puan';
}
function renderSkor(list){
  const bar = el('div', 'u-acts start');
  const gs = el('select'); gs.className = 'inp';
  Object.entries(GAMES).forEach(([k, g]) => { const o = el('option', '', g[0]); o.value = k; o.selected = k === skor.game; gs.append(o); });
  gs.onchange = async () => { skor.game = gs.value; skor.level = GAMES[skor.game][1][0]; await loadSkor(); renderList(); };
  bar.append(gs);
  const lv = GAMES[skor.game][1];
  if (lv[0]){
    const ls = el('div', 'seg');
    lv.forEach(l => { const b = el('button', l === skor.level ? 'on' : '', l.charAt(0).toLocaleUpperCase('tr-TR') + l.slice(1)); b.type = 'button'; b.onclick = async () => { skor.level = l; await loadSkor(); renderList(); }; ls.append(b); });
    bar.append(ls);
  }
  list.append(bar);
  const d = skor.data;
  if (!d){ list.append(note('Yükleniyor…')); return; }
  if (d.hata){ list.append(note(d.hata, 'err')); return; }
  list.append(note('Hileli ya da hatalı bir skoru 🗑 ile silebilirsin (o kişi iki tablodan da çıkar).'));
  const cols = el('div', 'ad-cols');
  [['donem', d.donem === 'gun' ? '📅 Bugün' : '📅 Bu hafta', d.top], ['tum', '🏆 Tüm zamanlar', d.tum]].forEach(([which, title, rows]) => {
    const box = el('div', 'ad-box');
    const h = el('h3', '', title + ' (' + rows.length + ')');
    box.append(h);
    if (!rows.length) box.append(note('Henüz skor yok.'));
    rows.forEach((e, i) => {
      const r = el('div', 'ad-mini');
      r.append(el('span', '', (i + 1) + '. ' + e.name + (e.uye ? ' ✓' : '')), el('span', 'ad-muted', fmtScore(skor.game, e.score) + ' · ' + fmt(e.ts)));
      r.append(dangerBtn('🗑', async () => {
        try { await req('/api/skor/admin-sil', { game: skor.game, level: skor.level, k: e.k, name: e.name }); toast(e.name + ' tablodan silindi'); await loadSkor(); renderList(); } catch(err){ toast(err.message); }
      }));
      box.append(r);
    });
    if (rows.length) box.append(dangerBtn('♻️ Bu tabloyu sıfırla', async () => {
      try { await req('/api/skor/admin-sifirla', { game: skor.game, level: skor.level, tablo: which }); toast('Tablo sıfırlandı'); await loadSkor(); renderList(); } catch(err){ toast(err.message); }
    }));
    cols.append(box);
  });
  list.append(cols);
}

// ---------- müzik ----------
function renderMuzik(list){
  if (!muzik){ list.append(note('Kütüphane alınamadı.')); return; }
  const q = trLow($('q').value.trim());
  const songs = muzik.songs.filter(s => !q || trLow(s.title + ' ' + s.by).includes(q)).sort((a, b) => b.ts - a.ts);
  list.append(note(muzik.songs.length + ' şarkı · ' + mb(muzik.songs.reduce((a, s) => a + (s.size || 0), 0)) + ' / 3 GB kullanılıyor. Kullanıcılar şarkı silemez; buradan sadece sen silebilirsin.'));
  if (muzik.playlists.length){
    const box = el('div', 'ad-box'); box.append(el('h3', '', '📃 Playlistler (' + muzik.playlists.length + ')'));
    muzik.playlists.forEach(p => {
      const r = el('div', 'ad-mini');
      r.append(el('span', '', p.name + ' · ' + p.by), el('span', 'ad-muted', p.songs.length + ' şarkı'));
      r.append(dangerBtn('🗑', async () => { try { await req('/api/muzik/admin-playlist-sil', { pid: p.id }); toast('Playlist silindi (şarkılar duruyor)'); await loadMuzik(); renderList(); } catch(e){ toast(e.message); } }));
      box.append(r);
    });
    list.append(box);
  }
  const box = el('div', 'ad-box'); box.append(el('h3', '', '🎵 Şarkılar (' + songs.length + ')'));
  if (!songs.length) box.append(note(q ? 'Aramaya uyan şarkı yok.' : 'Henüz şarkı yüklenmemiş.'));
  songs.forEach(s => {
    const r = el('div', 'ad-mini');
    const name = el('span', '', s.title);
    r.append(name, el('span', 'ad-muted', s.by + ' · ' + mb(s.size || 0) + ' · ' + fmt(s.ts)));
    const ren = button('✏️', '', () => {
      editing = s.id;
      const inp = el('input'); inp.className = 'inp'; inp.value = s.title; inp.maxLength = 100;
      const save = async () => { editing = null; try { await req('/api/muzik/admin-sarki-ad', { id: s.id, title: inp.value }); toast('Şarkı adı değişti'); } catch(e){ toast(e.message); } await loadMuzik(); renderList(); };
      inp.onkeydown = e => { if (e.key === 'Enter') save(); if (e.key === 'Escape'){ editing = null; renderList(); } };
      name.replaceWith(inp); ren.replaceWith(button('Kaydet', 'primary', save)); inp.focus();
    });
    r.append(ren, dangerBtn('🗑', async () => { try { await req('/api/muzik/admin-sarki-sil', { id: s.id }); toast('Şarkı silindi'); await loadMuzik(); renderList(); } catch(e){ toast(e.message); } }));
    box.append(r);
  });
  list.append(box);
}

// ---------- ayarlar ----------
function renderAyar(list){
  const box = el('div', 'ad-box');
  box.append(el('h3', '', '🔑 Yönetici şifresini değiştir'));
  if (gunluk && gunluk.sifreKaynak === 'env') box.append(note('Şifre Netlify’daki ADMIN_SIFRE ayarından geliyor; değiştirmek için oradan değiştir.'));
  else {
    const f = el('form', 'stack');
    const o = el('input'); o.type = 'password'; o.className = 'inp'; o.placeholder = 'Mevcut şifre'; o.autocomplete = 'current-password';
    const n1 = el('input'); n1.type = 'password'; n1.className = 'inp'; n1.placeholder = 'Yeni şifre (en az 8 karakter)'; n1.autocomplete = 'new-password';
    const n2 = el('input'); n2.type = 'password'; n2.className = 'inp'; n2.placeholder = 'Yeni şifre tekrar'; n2.autocomplete = 'new-password';
    const sb = el('button', 'btn primary', 'Şifreyi değiştir'); sb.type = 'submit';
    f.append(o, n1, n2, sb, note('Değişince diğer cihazlardaki yönetici oturumları kapanır.'));
    f.onsubmit = async e => {
      e.preventDefault();
      if (n1.value !== n2.value){ toast('Yeni şifreler aynı değil'); return; }
      try { await api('admin-sifre-degis', { eski: o.value, yeni: n1.value }); toast('✅ Yönetici şifresi değişti'); f.reset(); await loadGunluk(); renderList(); } catch(err){ toast(err.message); }
    };
    box.append(f);
  }
  list.append(box);
  const lg = el('div', 'ad-box');
  lg.append(el('h3', '', '📜 İşlem geçmişi'));
  if (gunluk && gunluk.hataliDeneme) lg.append(note('Son 24 saatte ' + gunluk.hataliDeneme + ' yanlış yönetici şifresi denemesi.', gunluk.hataliDeneme >= 3 ? 'err' : ''));
  const l = gunluk ? gunluk.log : [];
  if (!l.length) lg.append(note('Henüz kayıt yok.'));
  l.slice(0, 60).forEach(x => { const r = el('div', 'ad-mini'); r.append(el('span', '', x.t), el('span', 'ad-muted', fmt(x.at))); lg.append(r); });
  list.append(lg);
}

// ---------- giriş / başlat ----------
$('admForm').onsubmit = async e => {
  e.preventDefault(); $('admErr').textContent = '';
  try {
    const d = await api('admin-giris', { sifre: $('admPw').value });
    tok = d.token; sessionStorage.setItem('oyunodasi-admin', tok); $('admPw').value = '';
    start();
  } catch(err){ $('admErr').textContent = err.message; }
};
$('outBtn').onclick = logout;
$('q').oninput = () => renderList();
$('pushBtn').onclick = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Bu tarayıcı bildirimleri desteklemiyor (iPhone’da önce siteyi Ana Ekrana ekle).');
    if (await Notification.requestPermission() !== 'granted') throw new Error('Bildirim izni verilmedi.');
    const reg = await navigator.serviceWorker.register('sw.js');
    const { key } = await (await fetch('/api/bildirim/anahtar')).json();
    const raw = atob(key.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((key.length + 3) % 4));
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, c => c.charCodeAt(0)) });
    await api('admin-bildirim', { push: sub.toJSON() });
    toast('🔔 Yeni başvuru gelince bu cihaza bildirim gelecek'); loadUsers();
  } catch(e){ toast(e.message); }
};
async function start(){
  $('loginCard').hidden = true; $('panel').hidden = false;
  try { await loadUsers(); } catch(e){ toast(e.message); return; }
  go(users.some(u => u.durum === 'bekliyor') ? 'bekliyor' : 'genel');
  clearInterval(start.t);
  // sayfa açıkken 6 saniyede bir yeni başvuruya bak; ekran sadece değişiklik olursa yenilenir
  start.t = setInterval(() => { if (tok && !document.hidden) poll(); }, 6000);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && tok) poll(); });
if (tok) start();
