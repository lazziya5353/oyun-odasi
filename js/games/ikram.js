// İkramlar: arkadaşına çay, simit, kahve… ısmarla. İkram uçarak onun önüne konur, bir süre orada durur.
const IKRAM = [
  { id: 'cay', name: 'Çay', svg: true, hot: true, lines: ['Ocaktan taze demlendi, ince belli bardakta.', 'Demli mi olsun açık mı? Demli koydum.', 'Çaycı Hüseyin\'den selam var.', 'Şekeri iki, kaşığı şıngırdat.'] },
  { id: 'simit', name: 'Simit', emoji: '🥯', lines: ['Susamlı, fırından yeni çıktı.', 'Çayın yanına gider.', 'Martılara kaptırma!'] },
  { id: 'kahve', name: 'Türk kahvesi', emoji: '☕', hot: true, lines: ['Bir kahvenin kırk yıl hatırı vardır.', 'Orta şekerli, yanında lokum.', 'Bitince fala bakarız.'] },
  { id: 'ayran', name: 'Ayran', emoji: '🥛', lines: ['Köpüklü yayık ayranı.', 'Sinirler yatışsın diye.', 'Bıyıklar köpük oldu.'] },
  { id: 'cekirdek', name: 'Çekirdek', emoji: '🌻', lines: ['Kabukları yere atma!', 'Maç izlenir, çekirdek çitlenir.', 'Tuzlu mu tuzsuz mu? Tuzlu.'] },
  { id: 'dondurma', name: 'Maraş dondurması', emoji: '🍦', trick: true, lines: ['Dondurmacı bir kez kaçırdı, sonra verdi.', 'Önce oyaladı, sonra külahı uzattı.'] },
  { id: 'lokum', name: 'Lokum', emoji: '🍬', lines: ['Güllü lokum, ağzın tatlansın.', 'Kahvenin yanına.'] },
  { id: 'su', name: 'Bir bardak su', emoji: '🥤', lines: ['Kaybedenlere moral suyu.', 'Sakin ol, bu el senin.', 'Soğuk su, sinirlere iyi gelir.'] }
];
const IKRAM_BY = Object.fromEntries(IKRAM.map(x => [x.id, x]));
// ince belli çay bardağı (tabağıyla), buharı tüten
const TEA_SVG = '<svg class="tea" viewBox="0 0 40 48" aria-hidden="true"><g class="steam"><path d="M16 8c-3-3 3-5 0-8"/><path d="M22 9c-3-3 3-5 0-8"/></g>' +
  '<ellipse cx="20" cy="44" rx="15" ry="3.2" fill="#e9edf2"/><ellipse cx="20" cy="43" rx="10" ry="1.8" fill="#c9d1db"/>' +
  '<path d="M11 13h18c0 6-4 9-4 15s4 8 4 13H11c0-5 4-7 4-13s-4-9-4-15z" fill="rgba(255,255,255,.28)" stroke="rgba(255,255,255,.7)" stroke-width="1"/>' +
  '<path d="M12.2 17h15.6c-.6 4-3.8 6.3-3.8 11s3.4 6.6 3.8 11.6H12.2c.4-5 3.8-6.9 3.8-11.6s-3.2-7-3.8-11z" fill="#b5381b"/>' +
  '<path d="M12.2 17h15.6" stroke="#e46a3c" stroke-width="1.2"/></svg>';
function ikramVisual(item){
  const el = document.createElement('span'); el.className = 'ikram-v ' + item.id;
  if (item.svg) el.innerHTML = TEA_SVG; else el.textContent = item.emoji;
  if (item.hot && !item.svg) el.classList.add('hot');
  return el;
}

// ---------- menü ----------
let ikramMenu = null;
function openIkramMenu(targetId, anchor){
  closeIkramMenu();
  const p = peers.get(targetId);
  if (!p) return;
  const m = document.createElement('div'); m.className = 'ikram-menu';
  const h = document.createElement('div'); h.className = 'im-head'; h.textContent = p.name + '\'e ne ısmarlayalım?';
  m.append(h);
  const grid = document.createElement('div'); grid.className = 'im-grid';
  IKRAM.forEach(it => {
    const b = document.createElement('button'); b.className = 'im-item';
    b.append(ikramVisual(it), Object.assign(document.createElement('span'), { textContent: it.name }));
    b.onclick = () => { sendIkram(targetId, it.id); closeIkramMenu(); };
    grid.append(b);
  });
  m.append(grid);
  document.body.append(m);
  const r = anchor.getBoundingClientRect();
  const W = m.offsetWidth, H = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(window.innerWidth - W - 8, r.left + r.width / 2 - W / 2)) + 'px';
  m.style.top = (r.top - H - 8 > 8 ? r.top - H - 8 : r.bottom + 8) + 'px';
  ikramMenu = m;
  setTimeout(() => document.addEventListener('click', ikramOutside, true), 0);
}
function ikramOutside(e){ if (ikramMenu && !ikramMenu.contains(e.target)) closeIkramMenu(); }
function closeIkramMenu(){ if (ikramMenu){ ikramMenu.remove(); ikramMenu = null; document.removeEventListener('click', ikramOutside, true); } }

// ---------- gönder / al ----------
let lastIkram = 0;
function sendIkram(to, item){
  const now = Date.now();
  if (now - lastIkram < 1500){ toast('Ocak yetişemiyor, biraz bekle 😄'); return; }
  lastIkram = now;
  const it = IKRAM_BY[item]; if (!it) return;
  const line = Math.floor(Math.random() * it.lines.length);
  broadcast({ t: 'ikram', to, item, line });
  showIkram(peer.id, to, item, line);
}
function ikramOnData(from, d){
  if (d.t !== 'ikram') return false;
  const it = IKRAM_BY[d.item];
  if (!it || typeof d.to !== 'string' || !isPresent(d.to)) return true;
  const p = peers.get(from); if (!p) return true;
  const now = Date.now();
  if (now - (p.lastIkram || 0) < 1000) return true;   // art arda yağdırmayı engelle
  p.lastIkram = now;
  showIkram(from, d.to, d.item, Math.max(0, Math.min(it.lines.length - 1, d.line | 0)));
  return true;
}
const nameOf = id => id === (peer && peer.id) ? myName : ((peers.get(id) || {}).name || 'Biri');
function showIkram(from, to, item, line){
  const it = IKRAM_BY[item];
  const fromName = nameOf(from), toName = nameOf(to);
  const saying = it.lines[line] || it.lines[0];
  const toMe = to === (peer && peer.id);
  addSys((it.svg ? '🍵' : it.emoji) + ' ' + fromName + ', ' + (toMe ? 'sana' : toName + '\'e') + ' ' + it.name.toLocaleLowerCase('tr-TR') + ' ısmarladı · “' + saying + '”');
  if (toMe){ toast((it.svg ? '🍵' : it.emoji) + ' ' + fromName + ' sana ' + it.name.toLocaleLowerCase('tr-TR') + ' ısmarladı! “' + saying + '”'); }
  ikramSound(it);
  // görünür hedef: kişinin kutucuğu, masadaki koltuğu
  const targets = ikramTargets(to);
  const src = ikramTargets(from)[0] || null;
  targets.forEach((el, i) => ikramFly(src, el, it, i === 0));
}
function ikramTargets(id){
  const out = [];
  if (id === (peer && peer.id)){ const c = $('selfCard'); if (c && !c.hidden) out.push(c.querySelector('.av-wrap')); }
  else { const p = peers.get(id); if (p && p.card && !p.card.hidden) out.push(p.card.querySelector('.av-wrap')); }
  document.querySelectorAll('[data-treat-for="' + id + '"]').forEach(e => { if (e.offsetParent) out.push(e); });
  return out.filter(Boolean);
}
function ikramFly(srcEl, dstEl, it, withTrick){
  const b = dstEl.getBoundingClientRect();
  const a = srcEl ? srcEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight - 60, width: 0, height: 0 };
  const fly = ikramVisual(it); fly.classList.add('ikram-fly');
  document.body.append(fly);
  const x0 = a.left + a.width / 2 - 20, y0 = a.top + a.height / 2 - 20, x1 = b.left + b.width / 2 - 20, y1 = b.top + b.height / 2 - 20;
  fly.style.left = x0 + 'px'; fly.style.top = y0 + 'px';
  const dx = x1 - x0, dy = y1 - y0;
  const land = () => { fly.remove(); ikramLand(dstEl, it); };
  if (reducedMotion()){ land(); return; }
  const frames = it.trick && withTrick
    // Maraş dondurmacısı: yaklaştırır, geri çeker, sonra verir
    ? [{ transform: 'translate(0,0) scale(.8)' }, { transform: `translate(${dx * .85}px,${dy * .85 - 50}px) scale(1.1)`, offset: .35 },
       { transform: `translate(${dx * .3}px,${dy * .3 - 80}px) rotate(-20deg) scale(1)`, offset: .6 }, { transform: `translate(${dx}px,${dy}px) scale(1)` }]
    : [{ transform: 'translate(0,0) scale(.8)' }, { transform: `translate(${dx / 2}px,${dy / 2 - 70}px) scale(1.25) rotate(8deg)`, offset: .5 }, { transform: `translate(${dx}px,${dy}px) scale(1)` }];
  fly.animate(frames, { duration: it.trick && withTrick ? 1500 : 850, easing: 'cubic-bezier(.3,.7,.3,1)' }).onfinish = land;
}
// ikram kişinin önüne konur ve bir dakika durur
function ikramLand(el, it){
  if (!el || !el.isConnected) return;
  let tray = el.querySelector(':scope > .treats');
  if (!tray){ tray = document.createElement('div'); tray.className = 'treats'; el.append(tray); }
  const v = ikramVisual(it); v.classList.add('landed');
  tray.append(v);
  while (tray.children.length > 3) tray.firstChild.remove();
  setTimeout(() => { v.classList.add('gone'); setTimeout(() => { v.remove(); if (!tray.children.length) tray.remove(); }, 500); }, 60000);
}
function ikramSound(it){
  if (!audioCtx || deafened) return;
  if (it.id === 'cay') tone([2637, 3136], 0.07, 0.15, 0.05);        // kaşık bardağa vurur: şıng şıng
  else tone([784, 988], 0.08, 0.2, 0.06);
}
