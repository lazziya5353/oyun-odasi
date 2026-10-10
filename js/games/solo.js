// Tekli oyunlar çerçevesi: oyun kaydı (registerSolo), Oyun Salonu'nda açma/kapama, skor tablosu, rekor duyurusu.
// Oyunun kendisi kendi dosyasında (solo-sudoku.js, solo-kelime.js, solo-yapboz.js, solo-kosu.js).
const SOLO = new Map();
const SKOR_API = (window.OYUNODASI_PUSH_API || '') + '/api/skor/';
let soloOpen = null;           // { id, level, inst, root }
const soloBoards = new Map();  // 'oyun/seviye' → { data, at }
let soloBoardTimer = null;

function registerSolo(def){
  if (!def || !def.id || typeof def.mount !== 'function') return;
  def.levels = Array.isArray(def.levels) ? def.levels : [];
  SOLO.set(def.id, def);
}
(window.SOLO_PENDING || []).forEach(registerSolo);
window.SOLO_PENDING = { push: registerSolo };      // sonradan yüklenen oyunlar da doğrudan kaydolsun

const soloDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
function soloHash(s){ let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0; return h >>> 0; }
function mulberry32(a){
  return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const soloApiOK = () => location.protocol === 'https:' || location.protocol === 'http:';
const soloLevelName = (def, lv) => (def.levels.find(l => l.id === lv) || {}).name || '';
const soloDoneKey = (def, lv, day) => 'oyunodasi-solo-' + def.id + '-' + (lv || '-') + '-' + day;
const soloLastLevel = def => store.get('oyunodasi-solo-lv-' + def.id) || (def.levels[0] ? def.levels[0].id : '');

// ---------- skor tablosu verisi ----------
async function loadBoard(def, lv, force){
  const key = def.id + '/' + lv;
  const c = soloBoards.get(key);
  if (!force && c && Date.now() - c.at < 20000) return c.data;
  if (!soloApiOK()) return null;
  try {
    const r = await fetch(SKOR_API + 'tablo?game=' + encodeURIComponent(def.id) + '&level=' + encodeURIComponent(lv));
    if (!r.ok) throw new Error();
    const data = await r.json();
    soloBoards.set(key, { data, at: Date.now() });
    return data;
  } catch(e){ return c ? c.data : null; }
}
async function sendScore(def, lv, score, day){
  if (!soloApiOK()) throw new Error('yerel');
  const hd = { 'content-type': 'application/json' };
  if (typeof account !== 'undefined' && account) hd.authorization = 'Bearer ' + account.token;     // üye: tabloda ✓ ile, adı korunur
  const r = await fetch(SKOR_API + 'gonder', { method: 'POST', headers: hd,
    body: JSON.stringify({ game: def.id, level: lv, name: myName || store.get('oyunodasi-name') || 'Oyuncu', score, day }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.hata || 'HTTP ' + r.status);
  soloBoards.delete(def.id + '/' + lv);
  return d;
}

// ---------- Oyun Salonu'ndaki kartlar ----------
function renderSoloCards(d){
  if (!SOLO.size) return;
  const h = document.createElement('p'); h.className = 'note salon-sub';
  h.textContent = 'Tek başına oyna, skor tablosunda arkadaşlarınla yarış. Tablolar kalıcıdır; rekor kırınca odaya duyurulur.';
  d.append(h);
  const grid = document.createElement('div'); grid.className = 'solo-grid';
  SOLO.forEach(def => {
    const c = document.createElement('button'); c.className = 'solo-card'; c.type = 'button';
    c.innerHTML = '<span class="sc-ico"></span><span class="sc-txt"><b></b><small></small></span><span class="sc-top"></span>';
    c.querySelector('.sc-ico').textContent = def.icon || '🎮';
    c.querySelector('b').textContent = def.name;
    c.querySelector('small').textContent = def.desc || '';
    const lv = soloLastLevel(def);
    const top = c.querySelector('.sc-top');
    const fill = data => {
      const list = data && (data.top.length ? data.top : data.tum);
      if (!list || !list.length){ top.textContent = def.daily ? 'Bugün henüz kimse oynamadı' : 'İlk rekoru sen kır!'; return; }
      top.textContent = '👑 ' + list[0].name + ' · ' + def.format(list[0].score) + (data.top.length ? (def.daily ? ' (bugün)' : ' (bu hafta)') : '');
    };
    const c0 = soloBoards.get(def.id + '/' + lv);
    if (c0) fill(c0.data); else top.textContent = '';
    loadBoard(def, lv).then(data => { if (top.isConnected) fill(data); });
    c.onclick = () => openSolo(def.id, lv);
    grid.append(c);
  });
  d.append(grid);
}

// ---------- oyunu aç / kapat ----------
function openSolo(id, lv){
  const def = SOLO.get(id); if (!def) return;
  if (typeof openTable !== 'undefined' && openTable) closeTableView(true);
  closeSolo(true);
  if (!def.levels.some(l => l.id === lv)) lv = def.levels[0] ? def.levels[0].id : '';
  store.set('oyunodasi-solo-lv-' + id, lv);
  soloOpen = { id, level: lv };
  if (me.channel !== 'oyun') switchChannel('oyun', true);
  $('room').classList.add('gaming');
  updateStage();
  renderDeck();
}
function closeSolo(quiet){
  if (!soloOpen) return;
  try { soloOpen.inst && soloOpen.inst.destroy && soloOpen.inst.destroy(); } catch(e){}
  soloOpen = null;
  clearInterval(soloBoardTimer);
  $('room').classList.remove('gaming');
  updateStage();
  if (!quiet) renderDeck();
}
// renderGameDeck çağırır: kabuk zaten varsa dokunmaz (oyun sürerken ekranı bozmamak için)
function renderSoloShell(d){
  const def = SOLO.get(soloOpen.id);
  const sh0 = d.querySelector('.solo-shell');
  if (sh0 && sh0.dataset.sid === soloOpen.id + '/' + soloOpen.level) return;
  d.innerHTML = '';
  const sh = document.createElement('div'); sh.className = 'game-shell solo-shell solo-' + def.id; sh.dataset.sid = soloOpen.id + '/' + soloOpen.level;
  sh.innerHTML = '<div class="gs-bar"><button class="btn small" data-back>← Salona dön</button><b class="gs-title"></b><span class="gs-space"></span>' +
    '<div class="seg solo-lv"></div><button class="btn small" data-restart title="Baştan başla">↻</button><button class="btn small solo-lbbtn" data-lb>🏆 <span class="lbl">Tablo</span></button></div>' +
    '<div class="solo-body"><div class="solo-game"></div><aside class="lb"></aside></div>';
  sh.querySelector('.gs-title').textContent = (def.icon || '') + ' ' + def.name;
  sh.querySelector('[data-back]').onclick = () => closeSolo();
  sh.querySelector('[data-restart]').onclick = () => mountSolo();
  sh.querySelector('[data-lb]').onclick = () => sh.classList.toggle('lb-open');
  const seg = sh.querySelector('.solo-lv');
  if (def.levels.length > 1){
    def.levels.forEach(l => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = l.name; b.classList.toggle('on', l.id === soloOpen.level);
      b.onclick = () => { if (l.id !== soloOpen.level) openSolo(def.id, l.id); };
      seg.append(b);
    });
  } else seg.remove();
  d.append(sh);
  mountSolo();
  renderLeaderboard();
  clearInterval(soloBoardTimer);
  soloBoardTimer = setInterval(() => { if (soloOpen && !document.hidden) renderLeaderboard(true); }, 30000);
}
function mountSolo(){
  if (!soloOpen) return;
  const def = SOLO.get(soloOpen.id);
  const sh = $('deck').querySelector('.solo-shell'); if (!sh) return;
  try { soloOpen.inst && soloOpen.inst.destroy && soloOpen.inst.destroy(); } catch(e){}
  const host = sh.querySelector('.solo-game');
  host.innerHTML = '';
  const root = document.createElement('div'); root.className = 'solo-root'; host.append(root);
  const lv = soloOpen.level, day = soloDay();
  const seed = soloHash(def.id + '|' + lv + '|' + day);
  let finished = false;
  const ctx = {
    level: lv, dayKey: day, seed, rng: s => mulberry32(s >>> 0), playerName: myName,
    alreadyPlayed: !!(def.daily && store.get(soloDoneKey(def, lv, day))),
    sound: k => gameSound(k), toast, reducedMotion: reducedMotion(),
    restart: () => mountSolo(),
    finish: res => {
      if (finished) return Promise.resolve(null);
      finished = true;
      return soloFinished(def, lv, day, res || {}, host, ctx.alreadyPlayed);
    }
  };
  soloOpen.root = root;
  try { soloOpen.inst = def.mount(root, ctx) || null; }
  catch(e){ root.innerHTML = '<p class="note">Oyun açılamadı: ' + String(e.message || e).replace(/</g, '&lt;') + '</p>'; }
}

// ---------- oyun bitti ----------
async function soloFinished(def, lv, day, res, host, already){
  const score = Math.round(Number(res.score));
  const ranked = res.ranked !== false && !already && Number.isFinite(score);
  const ov = document.createElement('div'); ov.className = 'solo-result';
  ov.innerHTML = '<div class="sr-card"><span class="sr-tag"></span><b class="sr-score"></b><p class="sr-info note">Skor tablosuna gönderiliyor…</p><div class="sr-acts"></div></div>';
  ov.querySelector('.sr-tag').textContent = def.name + (soloLevelName(def, lv) ? ' · ' + soloLevelName(def, lv) : '');
  ov.querySelector('.sr-score').textContent = Number.isFinite(score) ? def.format(score) : '';
  const acts = ov.querySelector('.sr-acts');
  const again = document.createElement('button'); again.className = 'btn primary'; again.textContent = '↻ Tekrar oyna';
  again.onclick = () => mountSolo();
  const close = document.createElement('button'); close.className = 'btn'; close.textContent = 'Kapat';
  close.onclick = () => ov.remove();
  const lb = document.createElement('button'); lb.className = 'btn only-narrow'; lb.textContent = '🏆 Tablo';
  lb.onclick = () => { const sh = host.closest('.solo-shell'); if (sh) sh.classList.add('lb-open'); ov.remove(); };
  acts.append(again, lb, close);
  // oyunun kendi bitiş animasyonu görünsün diye kısa bir bekleme
  setTimeout(() => { if (host.isConnected) host.append(ov); }, res.ranked === false ? 300 : 900);
  const info = ov.querySelector('.sr-info');
  if (!ranked){
    info.textContent = already ? 'Bugünkü sonucun zaten tabloda; bu oyun sıralamaya girmedi.' : 'Bu oyun sıralamaya girmez.';
    return null;
  }
  // yerel en iyi (sunucuya ulaşılamazsa da görünsün)
  const lbKey = 'oyunodasi-solo-best-' + def.id + '-' + (lv || '-');
  const prevBest = Number(store.get(lbKey));
  if (!prevBest || (def.better === 'low' ? score < prevBest : score > prevBest)) store.set(lbKey, String(score));
  if (def.daily) store.set(soloDoneKey(def, lv, day), '1');
  try {
    const r = await sendScore(def, lv, score, day);
    const per = def.daily ? 'Bugün' : 'Bu hafta';
    const parts = [];
    if (r.rank.donem) parts.push(per + ' ' + r.rank.donem + '. sıradasın');
    if (r.rank.tum) parts.push('tüm zamanlarda ' + r.rank.tum + '.');
    if (!r.improved) parts.push('en iyin: ' + def.format(r.best));
    info.textContent = parts.join(' · ') || 'Tabloya yazıldı.';
    if (r.record){
      ov.querySelector('.sr-card').classList.add('record');
      ov.querySelector('.sr-tag').textContent = '🏆 YENİ REKOR!';
      confetti(host); gameSound('win');
    }
    // odaya duyur: rekor ya da ilk 3
    const top3 = r.rank.donem && r.rank.donem <= 3 && r.improved;
    if (r.record || top3){
      const msg = { t: 'solo-skor', game: def.id, level: lv, score, record: !!r.record, rank: r.rank.donem, name: myName };
      broadcast(msg); showSoloAnnounce(peer.id, msg);
    }
    renderLeaderboard(true);
    return r;
  } catch(e){
    info.textContent = 'Skor tablosuna ulaşılamadı; sonucun bu cihazda saklandı.';
    return null;
  }
}
function showSoloAnnounce(from, d){
  const def = SOLO.get(d.game); if (!def) return;
  const who = from === peer.id ? myName : clip(d.name, 20) || 'Biri';
  const lvn = soloLevelName(def, d.level);
  const what = def.name + (lvn ? ' (' + lvn + ')' : '');
  if (d.record) addSys('🏆 ' + who + ' ' + what + ' rekorunu kırdı: ' + def.format(d.score));
  else addSys('🥇 ' + who + ' ' + what + ' tablosunda ' + d.rank + '. sıraya yerleşti: ' + def.format(d.score));
  soloBoards.delete(d.game + '/' + d.level);
  if (soloOpen && soloOpen.id === d.game && soloOpen.level === d.level) renderLeaderboard(true);
}
function soloOnData(id, d){
  if (d.t !== 'solo-skor') return false;
  if (typeof d.game === 'string' && SOLO.has(d.game) && Number.isFinite(+d.score)) showSoloAnnounce(id, d);
  return true;
}

// ---------- skor tablosu paneli ----------
let lbTab = 'donem';
async function renderLeaderboard(force){
  if (!soloOpen) return;
  const def = SOLO.get(soloOpen.id), lv = soloOpen.level;
  const el = $('deck').querySelector('.solo-shell .lb'); if (!el) return;
  const draw = data => {
    if (!el.isConnected) return;
    el.innerHTML = '';
    const head = document.createElement('div'); head.className = 'lb-head';
    head.innerHTML = '<b>🏆 Skor tablosu</b>';
    const x = document.createElement('button'); x.className = 'btn small only-narrow'; x.textContent = '✕';
    x.onclick = () => el.closest('.solo-shell').classList.remove('lb-open');
    head.append(x);
    el.append(head);
    const tabs = document.createElement('div'); tabs.className = 'seg lb-tabs';
    [['donem', def.daily ? 'Bugün' : 'Bu hafta'], ['tum', 'Tüm zamanlar']].forEach(([k, n]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.classList.toggle('on', lbTab === k);
      b.onclick = () => { lbTab = k; draw(data); };
      tabs.append(b);
    });
    el.append(tabs);
    if (soloLevelName(def, lv)){ const s = document.createElement('p'); s.className = 'note lb-lv'; s.textContent = soloLevelName(def, lv) + ' seviyesi'; el.append(s); }
    const list = document.createElement('ol'); list.className = 'lb-list';
    const rows = data && data !== 'loading' ? (lbTab === 'tum' ? data.tum : data.top) : null;
    if (data === 'loading'){
      const p = document.createElement('p'); p.className = 'note lb-empty'; p.textContent = 'Yükleniyor…'; el.append(p);
    } else if (!data){
      const p = document.createElement('p'); p.className = 'note';
      p.textContent = soloApiOK() ? 'Tablo yüklenemedi.' : 'Skor tablosu yayındaki sitede çalışır.';
      el.append(p);
    } else if (!rows.length){
      const p = document.createElement('p'); p.className = 'note lb-empty';
      p.textContent = lbTab === 'tum' ? 'Henüz kimse yok. İlk sen ol!' : def.daily ? 'Bugün henüz kimse bitirmedi. İlk sen ol!' : 'Bu hafta henüz kimse oynamadı.';
      el.append(p);
    } else {
      const meKey = (myName || '').toLocaleLowerCase('tr-TR');
      rows.slice(0, 10).forEach((r, i) => {
        const li = document.createElement('li');
        if (r.name.toLocaleLowerCase('tr-TR') === meKey) li.classList.add('me');
        li.innerHTML = '<span class="lb-n"></span><span class="lb-name"></span><span class="lb-score"></span>';
        li.querySelector('.lb-n').textContent = ['🥇', '🥈', '🥉'][i] || (i + 1);
        li.querySelector('.lb-name').textContent = r.name;
        if (r.uye){ const v = document.createElement('span'); v.className = 'lb-uye'; v.textContent = '✓'; v.title = 'Üye'; li.querySelector('.lb-name').append(v); }
        li.querySelector('.lb-score').textContent = def.format(r.score);
        list.append(li);
      });
      el.append(list);
      const mine = rows.findIndex(r => r.name.toLocaleLowerCase('tr-TR') === meKey);
      if (mine >= 10){
        const p = document.createElement('p'); p.className = 'note lb-mine';
        p.textContent = 'Sen: ' + (mine + 1) + '. · ' + def.format(rows[mine].score);
        el.append(p);
      }
    }
    const best = Number(store.get('oyunodasi-solo-best-' + def.id + '-' + (lv || '-')));
    if (best){ const p = document.createElement('p'); p.className = 'note lb-best'; p.textContent = 'Senin en iyin: ' + def.format(best); el.append(p); }
  };
  const c = soloBoards.get(def.id + '/' + lv);
  draw(c ? c.data : (soloApiOK() ? 'loading' : null));
  const data = await loadBoard(def, lv, force);
  if (soloOpen && soloOpen.id === def.id && soloOpen.level === lv) draw(data);
}
