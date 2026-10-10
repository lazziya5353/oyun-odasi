// Hafıza Kartları: kartları çevir, eşleri bul. Skor = saniye + 2 × (hamle − çift sayısı) (az olan iyi; gereksiz her hamle 2 sn ceza).
// Kart yüzleri özgün SVG çizimler (çay, simit, nazar boncuğu, lale…). HafizaCore DOM'suzdur (Node'da test edilir).
(function(root){
  // c×r: masaüstü düzeni, mc×mr: telefon düzeni
  const LEVELS = {
    kolay: { pairs: 6, c: 4, r: 3, mc: 3, mr: 4 },
    orta: { pairs: 8, c: 4, r: 4, mc: 4, mr: 4 },
    zor: { pairs: 15, c: 6, r: 5, mc: 5, mr: 6 }
  };
  const FACE_COUNT = 15;
  const MAX_SCORE = 5999;
  function shuffle(a, rnd){
    for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)) % (i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  // deste: rastgele seçilmiş `pairs` yüzün ikişer kopyası, karışık
  function makeDeck(pairs, rnd){
    rnd = rnd || Math.random;
    const faces = shuffle(Array.from({ length: FACE_COUNT }, (_, i) => i), rnd).slice(0, pairs);
    return shuffle(faces.concat(faces), rnd);
  }
  const score = (secs, moves, pairs) => Math.min(MAX_SCORE, Math.max(0, Math.floor(secs) + 2 * Math.max(0, moves - pairs)));
  // oyun durumu: open = açık (eşleşmemiş) kartlar, done = eşleşenler
  function newGame(deck){ return { deck, open: [], done: deck.map(() => false), moves: 0, found: 0 }; }
  // kart seç: 'ignore' | 'first' | 'match' | 'miss' (miss'te iki kart açık kalır, closeOpen ile kapanır)
  function pick(g, i){
    if (i < 0 || i >= g.deck.length || g.done[i] || g.open.includes(i)) return 'ignore';
    if (g.open.length >= 2) closeOpen(g);
    g.open.push(i);
    if (g.open.length === 1) return 'first';
    g.moves++;
    const [a, b] = g.open;
    if (g.deck[a] === g.deck[b]){ g.done[a] = g.done[b] = true; g.open = []; g.found++; return 'match'; }
    return 'miss';
  }
  function closeOpen(g){ const o = g.open; g.open = []; return o; }
  const isWon = g => g.found * 2 === g.deck.length;

  const Core = { LEVELS, FACE_COUNT, MAX_SCORE, shuffle, makeDeck, score, newGame, pick, closeOpen, isWon };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  root.HafizaCore = Core;
})(typeof window !== 'undefined' ? window : globalThis);

// ---------- Arayüz ----------
(function(){
  if (typeof registerSolo !== 'function') return;
  const Core = window.HafizaCore;
  // özgün kart yüzleri (viewBox 0 0 64 64)
  const FACES = [
    ['Çay', '<ellipse cx="32" cy="54" rx="21" ry="5" fill="#e9e2d3" stroke="#c0392b" stroke-width="2"/><path d="M21 14h22c0 7-5.5 10-5.5 18 0 7 5.5 10 5.5 18H21c0-8 5.5-11 5.5-18 0-8-5.5-11-5.5-18z" fill="#dff3f7" stroke="#9cc9d4" stroke-width="1.5"/><path d="M23 21h18c-1.2 4-3.5 6.5-3.5 11 0 7 5.4 10 5.4 17H21.1c0-7 5.4-10 5.4-17 0-4.5-2.3-7-3.5-11z" fill="#c2410c"/><path d="M25 23c0 3 2 5 2 9" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M28 10c-2-2 2-4 0-6M35 10c-2-2 2-4 0-6" stroke="#9aa3b5" stroke-width="2" fill="none" stroke-linecap="round"/>'],
    ['Simit', '<circle cx="32" cy="33" r="18" fill="none" stroke="#a75d22" stroke-width="13"/><circle cx="32" cy="33" r="18" fill="none" stroke="#d48a3c" stroke-width="9"/><path d="M19 22a18 18 0 0 1 12-7" stroke="#f0b26a" stroke-width="3" fill="none" stroke-linecap="round"/><g fill="#fff4dc"><ellipse cx="20" cy="30" rx="1.6" ry="1"/><ellipse cx="25" cy="19" rx="1.6" ry="1" transform="rotate(30 25 19)"/><ellipse cx="38" cy="18" rx="1.6" ry="1"/><ellipse cx="46" cy="27" rx="1.6" ry="1" transform="rotate(60 46 27)"/><ellipse cx="46" cy="40" rx="1.6" ry="1"/><ellipse cx="38" cy="49" rx="1.6" ry="1" transform="rotate(-30 38 49)"/><ellipse cx="25" cy="48" rx="1.6" ry="1"/><ellipse cx="18" cy="39" rx="1.6" ry="1" transform="rotate(50 18 39)"/><ellipse cx="31" cy="15" rx="1.4" ry=".9"/><ellipse cx="49" cy="33" rx="1.4" ry=".9"/><ellipse cx="31" cy="51" rx="1.4" ry=".9"/></g>'],
    ['Nazar boncuğu', '<circle cx="32" cy="32" r="24" fill="#1e4fd6"/><circle cx="32" cy="32" r="15.5" fill="#fff"/><circle cx="32" cy="32" r="10" fill="#5fb0f5"/><circle cx="32" cy="32" r="5" fill="#0b1020"/><ellipse cx="22" cy="18" rx="5" ry="2.6" fill="#fff" opacity=".45" transform="rotate(-35 22 18)"/><circle cx="34" cy="30" r="1.4" fill="#fff"/>'],
    ['Lale', '<path d="M32 36v22" stroke="#2f8a3e" stroke-width="3.5" stroke-linecap="round"/><path d="M32 54c-6-2-12-9-12-19 6 2 11 8 12 19z" fill="#3fa34d"/><path d="M33 58c4-6 10-9 15-9-2 6-8 9-15 9z" fill="#2f8a3e"/><path d="M20 14c3 2 5 6 6 9 2-6 4-11 6-14 2 3 4 8 6 14 1-3 3-7 6-9 2 9 0 22-12 24-12-2-14-15-12-24z" fill="#e23b4a"/><path d="M32 9c2 3 4 8 6 14-1 6-3 12-6 15-3-3-5-9-6-15 2-6 4-11 6-14z" fill="#ff6b78"/>'],
    ['Tavla zarı', '<rect x="10" y="12" width="40" height="40" rx="9" fill="#fffaf0" stroke="#d8cdb6" stroke-width="2" transform="rotate(-10 30 32)"/><g fill="#1a1d29" transform="rotate(-10 30 32)"><circle cx="20" cy="22" r="4"/><circle cx="40" cy="22" r="4"/><circle cx="30" cy="32" r="4"/><circle cx="20" cy="42" r="4"/><circle cx="40" cy="42" r="4"/></g><rect x="40" y="38" width="16" height="16" rx="4" fill="#c2410c" transform="rotate(14 48 46)"/><circle cx="48" cy="46" r="2.4" fill="#fff"/>'],
    ['Kedi', '<path d="M14 22 16 6l12 10M50 22 48 6 36 16" fill="#f39a3d"/><path d="M17 10l2 8 5-3zM47 10l-2 8-5-3z" fill="#ffc4a8"/><ellipse cx="32" cy="34" rx="20" ry="18" fill="#f39a3d"/><path d="M26 18q6-4 12 0M24 22q8-5 16 0" stroke="#c96a1c" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="24" cy="32" rx="3.4" ry="4.4" fill="#1a3a1f"/><ellipse cx="40" cy="32" rx="3.4" ry="4.4" fill="#1a3a1f"/><circle cx="25" cy="30.5" r="1.2" fill="#fff"/><circle cx="41" cy="30.5" r="1.2" fill="#fff"/><path d="M30 39h4l-2 2.4z" fill="#e85d75"/><path d="M32 41.5q-2 3-5 2M32 41.5q2 3 5 2" stroke="#7a3b10" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M10 37l10 1M10 42l10-1M54 37l-10 1M54 42l-10-1" stroke="#7a3b10" stroke-width="1.2" stroke-linecap="round"/>'],
    ['Martı', '<path d="M4 52q7-5 14 0t14 0 14 0 14 0v8H4z" fill="#3d8fd1"/><path d="M4 55q7-4 14 0t14 0 14 0 14 0" stroke="#bfe2ff" stroke-width="1.5" fill="none"/><path d="M14 30q10-12 18 0 8-12 18 0" stroke="#5d6577" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/><ellipse cx="32" cy="38" rx="12" ry="7" fill="#fff" stroke="#cdd3dc" stroke-width="1"/><circle cx="42" cy="33" r="5.5" fill="#fff" stroke="#cdd3dc" stroke-width="1"/><path d="M46.5 33.5l7 1.2-7 1.8z" fill="#f2b120"/><circle cx="43.5" cy="32" r="1.2" fill="#111"/><path d="M22 36q8-12 18-2-9 5-18 2z" fill="#8f99aa"/><path d="M20 38l-6 2 6 1z" fill="#cdd3dc"/>'],
    ['Dondurma', '<path d="M21 34h22L32 60z" fill="#e2a65a"/><path d="M24 38l14 10M28 36l11 6M22 40l12 10M40 38l-14 12M36 36l-12 8" stroke="#b47a35" stroke-width="1.2"/><circle cx="25" cy="30" r="8" fill="#ffb3c7"/><circle cx="39" cy="30" r="8" fill="#fff8ec"/><circle cx="32" cy="19" r="8.5" fill="#8a5233"/><circle cx="29" cy="16" r="2" fill="#a86b47"/><path d="M33 10.5l2-4" stroke="#d6283b" stroke-width="2.5" stroke-linecap="round"/><circle cx="35.5" cy="6" r="2.6" fill="#d6283b"/>'],
    ['Lokum', '<path d="M10 34l14-6 14 6-14 6z" fill="#ffd1dc"/><path d="M10 34v12l14 6V40z" fill="#f48fb1"/><path d="M24 40v12l14-6V34z" fill="#e57399"/><path d="M28 22l14-6 14 6-14 6z" fill="#fff1c9"/><path d="M28 22v12l14 6V28z" fill="#ffd36e"/><path d="M42 28v12l14-6V22z" fill="#f2bb45"/><g fill="#fff"><circle cx="18" cy="33" r="1"/><circle cx="24" cy="31" r="1.2"/><circle cx="30" cy="34" r="1"/><circle cx="22" cy="36" r="1"/><circle cx="36" cy="21" r="1"/><circle cx="42" cy="19" r="1.2"/><circle cx="48" cy="22" r="1"/><circle cx="42" cy="24" r="1"/><circle cx="14" cy="44" r=".9"/><circle cx="34" cy="44" r=".9"/></g>'],
    ['Türk kahvesi', '<ellipse cx="32" cy="50" rx="22" ry="6" fill="#f3efe6" stroke="#2f6fbf" stroke-width="2"/><path d="M18 26h28l-3 18c-1 4-5 6-11 6s-10-2-11-6z" fill="#fff" stroke="#2f6fbf" stroke-width="2"/><path d="M46 30c6 0 6 9 0 9" stroke="#2f6fbf" stroke-width="3" fill="none"/><path d="M21 34h22" stroke="#d4a017" stroke-width="2"/><path d="M25 38l2 3 2-3 2 3 2-3 2 3 2-3" stroke="#2f6fbf" stroke-width="1.4" fill="none"/><ellipse cx="32" cy="26" rx="14" ry="3.5" fill="#5a3418"/><ellipse cx="30" cy="25.5" rx="8" ry="1.8" fill="#c8a27a"/><path d="M27 20c-2-3 2-5 0-8M34 20c-2-3 2-5 0-8" stroke="#9aa3b5" stroke-width="2" fill="none" stroke-linecap="round"/>'],
    ['Balon', '<path d="M32 46q-3 6 2 9t0 7" stroke="#8a93a6" stroke-width="1.5" fill="none"/><ellipse cx="32" cy="26" rx="16" ry="19" fill="#e5384f"/><path d="M29 44.5h6l-3 3z" fill="#b8243a"/><ellipse cx="25" cy="18" rx="4" ry="7" fill="#fff" opacity=".4" transform="rotate(20 25 18)"/>'],
    ['Top', '<circle cx="32" cy="32" r="22" fill="#fff"/><path d="M32 10a22 22 0 0 1 19 11L32 32z" fill="#e5384f"/><path d="M51 21a22 22 0 0 1 0 22L32 32z" fill="#ffffff"/><path d="M51 43a22 22 0 0 1-19 11V32z" fill="#2f7fd6"/><path d="M32 54a22 22 0 0 1-19-11l19-11z" fill="#fff"/><path d="M13 43a22 22 0 0 1 0-22l19 11z" fill="#f2b120"/><path d="M13 21a22 22 0 0 1 19-11v22z" fill="#fff"/><circle cx="32" cy="32" r="22" fill="none" stroke="#cdd3dc" stroke-width="1.5"/><circle cx="32" cy="32" r="4" fill="#3fa34d"/><ellipse cx="22" cy="17" rx="5" ry="2.5" fill="#fff" opacity=".6" transform="rotate(-35 22 17)"/>'],
    ['Nar', '<path d="M26 14l2-7 4 5 4-5 2 7z" fill="#a81d2f"/><circle cx="32" cy="36" r="21" fill="#c81e3a"/><path d="M18 26a18 18 0 0 1 10-8" stroke="#ff7a8c" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M38 44q6-2 8-8" stroke="#8f1426" stroke-width="2" fill="none" stroke-linecap="round"/><g fill="#ffd3da"><circle cx="24" cy="38" r="1.4"/><circle cx="27" cy="44" r="1.2"/><circle cx="21" cy="44" r="1"/></g>'],
    ['Vapur', '<path d="M4 50q7-4 14 0t14 0 14 0 14 0v10H4z" fill="#2f7fd6"/><path d="M10 40h44l-6 10H15z" fill="#fff" stroke="#c7cfdb" stroke-width="1"/><path d="M10 44h44" stroke="#c81e3a" stroke-width="2.5"/><rect x="18" y="31" width="26" height="9" rx="1.5" fill="#f3efe6"/><g fill="#5fb0f5"><rect x="21" y="33.5" width="3.5" height="3" rx=".6"/><rect x="27" y="33.5" width="3.5" height="3" rx=".6"/><rect x="33" y="33.5" width="3.5" height="3" rx=".6"/><rect x="39" y="33.5" width="3" height="3" rx=".6"/></g><rect x="29" y="20" width="6" height="11" fill="#1a1d29"/><rect x="29" y="23" width="6" height="2.5" fill="#f2b120"/><path d="M34 16c3-3 7-2 9-5" stroke="#b5bdc9" stroke-width="2.5" fill="none" stroke-linecap="round"/>'],
    ['Karpuz', '<path d="M6 26a26 26 0 0 0 52 0z" fill="#2f8a3e"/><path d="M9.5 26a22.5 22.5 0 0 0 45 0z" fill="#e8f5d0"/><path d="M12.5 26a19.5 19.5 0 0 0 39 0z" fill="#ec3f52"/><g fill="#1a1d29"><ellipse cx="22" cy="32" rx="1.3" ry="2.2" transform="rotate(-20 22 32)"/><ellipse cx="32" cy="35" rx="1.3" ry="2.2"/><ellipse cx="42" cy="32" rx="1.3" ry="2.2" transform="rotate(20 42 32)"/><ellipse cx="27" cy="40" rx="1.3" ry="2.2" transform="rotate(-10 27 40)"/><ellipse cx="37" cy="40" rx="1.3" ry="2.2" transform="rotate(10 37 40)"/></g>']
  ];
  // kart arkası: sekiz köşeli yıldız motifi (tema vurgusu)
  const BACK = '<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="18" y="18" width="28" height="28" rx="2"/><rect x="18" y="18" width="28" height="28" rx="2" transform="rotate(45 32 32)"/><circle cx="32" cy="32" r="6"/></g><circle cx="32" cy="32" r="2.4" fill="currentColor"/></svg>';
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  registerSolo({
    id: 'hafiza', name: 'Hafıza Kartları', icon: '🃏',
    desc: 'Kartları çevir, eşlerini bul. Hem hızlı hem az hamleyle!',
    levels: [{ id: 'kolay', name: 'Kolay' }, { id: 'orta', name: 'Orta' }, { id: 'zor', name: 'Zor' }],
    daily: false, better: 'low',
    format: s => fmtTime(s),
    mount(root, ctx){
      const rm = ctx.reducedMotion;
      const L = Core.LEVELS[ctx.level] || Core.LEVELS.kolay;
      const g = Core.newGame(Core.makeDeck(L.pairs, Math.random));
      const timers = new Set();
      const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
      let t0 = 0, iv = 0, missT = 0, state = 'ready', secs = 0;

      const wrap = el('div', 'hafiza-wrap' + (rm ? ' rm' : ''));
      const bar = el('div', 'hafiza-bar');
      const timerEl = el('span', 'hafiza-chip hafiza-timer', '⏱ 0:00');
      const movesEl = el('span', 'hafiza-chip', 'Hamle 0');
      const prog = el('div', 'hafiza-prog'); const progFill = el('i'); const progTxt = el('span', '', '0/' + L.pairs);
      prog.append(progFill, progTxt); prog.title = 'Bulunan çiftler';
      bar.append(timerEl, prog, movesEl);
      const area = el('div', 'hafiza-area');
      const grid = el('div', 'hafiza-grid');
      grid.style.setProperty('--dc', L.c); grid.style.setProperty('--dr', L.r);
      grid.style.setProperty('--mc', L.mc); grid.style.setProperty('--mr', L.mr);
      const cards = g.deck.map((f, i) => {
        const b = el('button', 'hafiza-card'); b.type = 'button'; b.dataset.i = i;
        b.setAttribute('aria-label', 'Kapalı kart');
        b.innerHTML = '<span class="hafiza-flip"><span class="hafiza-back">' + BACK + '</span><span class="hafiza-face"><svg viewBox="0 0 64 64" aria-hidden="true">' + FACES[f][1] + '</svg></span></span>';
        if (!rm) b.style.animationDelay = (i * 18) + 'ms';
        grid.append(b);
        return b;
      });
      area.append(grid);
      const hint = el('p', 'hafiza-hint', 'Bir karta dokun, süre başlasın. Her gereksiz hamle +2 sn ceza.');
      wrap.append(bar, area, hint);
      root.append(wrap);

      const elapsed = () => (state === 'play' ? (performance.now() - t0) / 1000 : secs);
      function tick(){ timerEl.textContent = '⏱ ' + fmtTime(Math.floor(elapsed())); }
      function paint(){
        movesEl.textContent = 'Hamle ' + g.moves;
        progTxt.textContent = g.found + '/' + L.pairs;
        progFill.style.transform = 'scaleX(' + (g.found / L.pairs) + ')';
      }
      function setOpen(i, on){
        cards[i].classList.toggle('open', on);
        cards[i].setAttribute('aria-label', on ? FACES[g.deck[i]][0] : 'Kapalı kart');
      }
      function closeMiss(){
        clearTimeout(missT); timers.delete(missT); missT = 0;
        Core.closeOpen(g).forEach(i => { setOpen(i, false); cards[i].classList.remove('bad'); });
      }
      function click(i){
        if (state === 'done') return;
        if (state === 'ready'){ state = 'play'; t0 = performance.now(); iv = setInterval(tick, 250); hint.classList.add('off'); }
        if (g.open.length === 2) closeMiss();
        const res = Core.pick(g, i);
        if (res === 'ignore') return;
        setOpen(i, true);
        ctx.sound('tile');
        if (res === 'match'){
          const pair = g.deck.reduce((a, f, k) => (f === g.deck[i] && g.done[k] ? a.concat(k) : a), []);
          later(() => pair.forEach(k => { cards[k].classList.add('done'); cards[k].disabled = true; }), rm ? 0 : 380);
          later(() => ctx.sound('checker'), rm ? 0 : 380);
          if (Core.isWon(g)) win();
        } else if (res === 'miss'){
          const o = g.open.slice();
          later(() => o.forEach(k => { if (g.open.includes(k)) cards[k].classList.add('bad'); }), rm ? 0 : 420);
          missT = later(closeMiss, rm ? 700 : 1100);
        }
        paint();
      }
      function win(){
        secs = (performance.now() - t0) / 1000;
        state = 'done'; clearInterval(iv); tick();
        const sc = Core.score(secs, g.moves, L.pairs);
        later(() => {
          wrap.classList.add('is-won');
          ctx.sound('win');
          if (typeof confetti === 'function' && !rm) confetti(area);
          const box = el('div', 'hafiza-win');
          box.append(el('b', '', 'Tebrikler! 🎉'), el('span', '', fmtTime(Math.floor(secs)) + ' · ' + g.moves + ' hamle'),
            el('small', '', g.moves > L.pairs ? 'Ceza: +' + (2 * (g.moves - L.pairs)) + ' sn → ' + fmtTime(sc) : 'Kusursuz! Hiç gereksiz hamle yok.'));
          area.append(box);
        }, rm ? 100 : 650);
        later(() => ctx.finish({ score: sc, detail: { secs: Math.round(secs * 10) / 10, moves: g.moves, pairs: L.pairs } }), rm ? 600 : 1800);
      }
      grid.addEventListener('click', e => { const b = e.target.closest('.hafiza-card'); if (b) click(Number(b.dataset.i)); });
      paint();
      Object.defineProperty(wrap, '_hafiza', { value: { g, click, get state(){ return state; } } });

      return {
        destroy(){
          clearInterval(iv);
          timers.forEach(clearTimeout); timers.clear();
          wrap.remove();
        }
      };
    }
  });
})();
