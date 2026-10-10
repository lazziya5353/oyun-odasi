// 2048: aynı sayıları kaydırıp birleştir. Skor = birleşen taşların toplamı (klasik 2048 puanı, çok olan iyi).
// 2048'e ulaşınca "Devam?" sorulur; hamle kalmayınca oyun biter. Geri alma yok (sıralı oyun).
// Ikibin2048Core DOM'suzdur (Node'da test edilir).
(function(root){
  const N = 4;
  const DIRS = ['left', 'right', 'up', 'down'];
  // yöne göre satır/sütun hücre indeksleri (ilk eleman, taşların toplandığı uç)
  function lines(dir){
    const out = [];
    for (let i = 0; i < N; i++){
      const l = [];
      for (let j = 0; j < N; j++){
        if (dir === 'left') l.push(i * N + j);
        else if (dir === 'right') l.push(i * N + (N - 1 - j));
        else if (dir === 'up') l.push(j * N + i);
        else l.push((N - 1 - j) * N + i);
      }
      out.push(l);
    }
    return out;
  }
  // cells: 16 elemanlı dizi, her biri null ya da { id, v }
  // dönüş: { cells, moved, gained, slides:[{id,to,gone}], merges:[{tile,at,from:[id,id]}], nextId }
  function move(cells, dir, nextId){
    nextId = nextId || 1;
    const res = new Array(N * N).fill(null);
    const slides = [], merges = [];
    let gained = 0, moved = false;
    for (const l of lines(dir)){
      const ts = l.map(i => cells[i]).filter(Boolean);
      let k = 0;
      for (let a = 0; a < ts.length; a++){
        const t = ts[a], dest = l[k];
        const n = ts[a + 1];
        if (n && n.v === t.v){
          const nt = { id: nextId++, v: t.v * 2 };
          res[dest] = nt; gained += nt.v;
          slides.push({ id: t.id, to: dest, gone: true }, { id: n.id, to: dest, gone: true });
          merges.push({ tile: nt, at: dest, from: [t.id, n.id] });
          moved = true; a++;
        } else {
          res[dest] = t;
          if (cells[dest] !== t) moved = true;
          slides.push({ id: t.id, to: dest, gone: false });
        }
        k++;
      }
    }
    return { cells: moved ? res : cells.slice(), moved, gained, slides, merges, nextId };
  }
  // sayılarla kısa yol (testler için): [2,2,2,2] → [4,4,0,0]
  function slideRow(row){
    const cells = new Array(N * N).fill(null);
    let id = 1;
    row.forEach((v, i) => { if (v) cells[i] = { id: id++, v }; });
    const r = move(cells, 'left', 100);
    return { row: r.cells.slice(0, N).map(t => (t ? t.v : 0)), gained: r.gained, moved: r.moved };
  }
  const empties = cells => cells.reduce((a, t, i) => (t ? a : (a.push(i), a)), []);
  // boş bir hücreye %90 2, %10 4
  function spawn(cells, rnd, nextId){
    const e = empties(cells);
    if (!e.length) return null;
    const at = e[Math.floor(rnd() * e.length) % e.length];
    const tile = { id: nextId, v: rnd() < 0.9 ? 2 : 4 };
    cells[at] = tile;
    return { at, tile };
  }
  function canMove(cells){
    for (let i = 0; i < N * N; i++){
      const t = cells[i];
      if (!t) return true;
      const r = Math.floor(i / N), c = i % N;
      if (c < N - 1 && cells[i + 1] && cells[i + 1].v === t.v) return true;
      if (r < N - 1 && cells[i + N] && cells[i + N].v === t.v) return true;
    }
    return false;
  }
  const maxTile = cells => cells.reduce((m, t) => (t && t.v > m ? t.v : m), 0);
  function fromNumbers(nums){ let id = 1; return nums.map(v => (v ? { id: id++, v } : null)); }
  function newGame(rnd){
    const cells = new Array(N * N).fill(null);
    spawn(cells, rnd, 1); spawn(cells, rnd, 2);
    return { cells, nextId: 3, score: 0, moves: 0 };
  }
  // ortak adım: hareket + yeni taş. Kıpırdamadıysa null.
  function step(g, dir, rnd){
    const r = move(g.cells, dir, g.nextId);
    if (!r.moved) return null;
    g.cells = r.cells; g.nextId = r.nextId; g.score += r.gained; g.moves++;
    const sp = spawn(g.cells, rnd, g.nextId++);
    return { slides: r.slides, merges: r.merges, gained: r.gained, spawn: sp, over: !canMove(g.cells) };
  }

  const Core = { N, DIRS, lines, move, slideRow, spawn, canMove, maxTile, fromNumbers, newGame, step, empties };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  root.Ikibin2048Core = Core;
})(typeof window !== 'undefined' ? window : globalThis);

// ---------- Arayüz ----------
(function(){
  if (typeof registerSolo !== 'function') return;
  const Core = window.Ikibin2048Core;
  const N = Core.N, ANIM = 110;
  const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down' };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const fmt = n => Number(n).toLocaleString('tr-TR');
  const store = {
    get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  };

  registerSolo({
    id: 'ikibin', name: '2048', icon: '🧮',
    desc: 'Aynı sayıları kaydırıp birleştir, 2048 taşına ulaş!',
    levels: [], daily: false, better: 'high',
    format: s => fmt(s),
    mount(root, ctx){
      const rm = ctx.reducedMotion;
      const anim = rm ? 0 : ANIM;
      const g = Core.newGame(Math.random);
      let state = 'play', won = false, pend = null, t0 = performance.now();
      let best = Number(store.get('oyunodasi-2048-best')) || 0;
      const timers = new Set();
      const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

      const wrap = el('div', 'ikibin-wrap' + (rm ? ' rm' : ''));
      const side = el('div', 'ikibin-side');
      const logo = el('div', 'ikibin-logo', '2048');
      const boxes = el('div', 'ikibin-boxes');
      const mkBox = (lbl) => { const b = el('div', 'ikibin-box'); const v = el('b', '', '0'); b.append(el('small', '', lbl), v); boxes.append(b); return v; };
      const scoreV = mkBox('Puan'), bestV = mkBox('Rekor'), tileV = mkBox('En büyük'), movesV = mkBox('Hamle');
      const scoreBox = scoreV.parentNode;
      const help = el('p', 'ikibin-help', 'Ok tuşları ya da W A S D ile kaydır; telefonda parmağınla çek. Aynı sayılar çarpışınca birleşir.');
      side.append(logo, boxes, help);
      const boardWrap = el('div', 'ikibin-boardwrap');
      const board = el('div', 'ikibin-board');
      board.setAttribute('aria-label', '2048 tahtası');
      for (let i = 0; i < N * N; i++){ const c = el('div', 'ikibin-cell'); c.style.setProperty('--r', Math.floor(i / N)); c.style.setProperty('--c', i % N); board.append(c); }
      const layer = el('div', 'ikibin-layer');
      board.append(layer);
      boardWrap.append(board);
      wrap.append(side, boardWrap);
      root.append(wrap);

      const els = new Map();   // id → eleman
      function place(e, at){ e.style.setProperty('--r', Math.floor(at / N)); e.style.setProperty('--c', at % N); }
      function mkTile(t, at, cls){
        const e = el('div', 'ikibin-tile');
        const inn = el('div', 'ikibin-in' + (cls ? ' ' + cls : ''), String(t.v));
        e.dataset.v = t.v > 4096 ? 'big' : t.v;
        e.dataset.len = String(t.v).length;
        e.append(inn); place(e, at);
        layer.append(e); els.set(t.id, e);
        return e;
      }
      g.cells.forEach((t, i) => { if (t) mkTile(t, i, 'new'); });

      function paintStats(){
        scoreV.textContent = fmt(g.score);
        if (g.score > best){ best = g.score; store.set('oyunodasi-2048-best', best); }
        bestV.textContent = fmt(best);
        tileV.textContent = Core.maxTile(g.cells);
        movesV.textContent = g.moves;
      }
      paintStats();
      function floatGain(n){
        if (!n || rm) return;
        const f = el('span', 'ikibin-float', '+' + n);
        scoreBox.append(f);
        later(() => f.remove(), 900);
      }
      // bekleyen animasyon sonu işlerini hemen bitir (hızlı art arda hamlelerde)
      function flush(){ if (pend){ const p = pend; pend = null; clearTimeout(p.t); timers.delete(p.t); p.fn(); } }

      function go(dir){
        if (state !== 'play') return;
        flush();
        const r = Core.step(g, dir, Math.random);
        if (!r){ if (!rm){ board.classList.remove('bump-' + dir); void board.offsetWidth; board.classList.add('bump-' + dir); } return; }
        ctx.sound(r.merges.length ? 'tile' : 'checker');
        // kayma
        for (const s of r.slides){ const e = els.get(s.id); if (e){ place(e, s.to); if (s.gone) e.classList.add('gone'); } }
        floatGain(r.gained);
        paintStats();
        const fin = () => {
          for (const s of r.slides) if (s.gone){ const e = els.get(s.id); if (e) e.remove(); els.delete(s.id); }
          for (const m of r.merges) mkTile(m.tile, m.at, 'merged');
          if (r.spawn) mkTile(r.spawn.tile, r.spawn.at, 'new');
          const mx = Core.maxTile(g.cells);
          if (!won && mx >= 2048){ won = true; showWin(); }
          else if (r.over) gameOver();
        };
        if (anim){ const t = setTimeout(() => { timers.delete(t); if (pend && pend.t === t){ pend = null; fin(); } }, anim); timers.add(t); pend = { t, fn: fin }; }
        else fin();
      }

      function overlay(cls, title, sub, btns){
        const ov = el('div', 'ikibin-ov ' + cls);
        const card = el('div', 'ikibin-ovcard');
        card.append(el('b', '', title), el('span', '', sub));
        if (btns){ const a = el('div', 'ikibin-acts'); btns.forEach(b => a.append(b)); card.append(a); }
        ov.append(card); board.append(ov);
        return ov;
      }
      function showWin(){
        state = 'won';
        ctx.sound('win');
        if (typeof confetti === 'function' && !rm) confetti(boardWrap);
        const cont = el('button', 'btn primary', 'Devam et'); cont.type = 'button';
        const stop = el('button', 'btn', 'Bitir'); stop.type = 'button';
        const ov = overlay('win', 'Kazandın! 🎉', '2048 taşına ulaştın. Devam edip daha büyük taşlar yapabilirsin.', [cont, stop]);
        cont.onclick = () => { ov.remove(); state = 'play'; if (!Core.canMove(g.cells)) gameOver(); };
        stop.onclick = () => { ov.remove(); end(); };
        later(() => cont.focus({ preventScroll: true }), 50);
      }
      function gameOver(){
        state = 'over';
        ctx.sound('err');
        wrap.classList.add('is-over');
        overlay('over', 'Hamle kalmadı!', 'Puan: ' + fmt(g.score) + ' · En büyük taş: ' + Core.maxTile(g.cells));
        later(end, rm ? 500 : 1300);
      }
      function end(){
        if (state === 'end') return;
        state = 'end';
        ctx.finish({ score: g.score, detail: { moves: g.moves, max: Core.maxTile(g.cells), ms: Math.round(performance.now() - t0) } });
      }

      const onKey = e => {
        if (!root.isConnected) return;
        const t = e.target;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const d = KEYS[e.key];
        if (!d) return;
        e.preventDefault();
        go(d);
      };
      document.addEventListener('keydown', onKey);
      // kaydırma (dokunmatik + fare)
      let sx = 0, sy = 0, sid = null;
      board.addEventListener('pointerdown', e => { if (e.target.closest('.ikibin-ov')) return; sid = e.pointerId; sx = e.clientX; sy = e.clientY; });
      const up = e => {
        if (sid !== e.pointerId) return;
        sid = null;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      };
      board.addEventListener('pointerup', up);
      board.addEventListener('pointercancel', () => { sid = null; });
      // test kancası: durumu oku / hazır tahta yükle
      Object.defineProperty(wrap, '_ikibin', { value: { g, go, get state(){ return state; },
        load(nums){ flush(); layer.innerHTML = ''; els.clear(); g.cells = Core.fromNumbers(nums).map(t => (t ? { id: g.nextId++, v: t.v } : null)); g.cells.forEach((t, i) => { if (t) mkTile(t, i, ''); }); paintStats(); } } });

      return {
        destroy(){
          document.removeEventListener('keydown', onKey);
          timers.forEach(clearTimeout); timers.clear();
          pend = null;
          wrap.remove();
        }
      };
    }
  });
})();
