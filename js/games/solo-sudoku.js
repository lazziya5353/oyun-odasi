// Günün Sudokusu: herkese aynı (tarih + seviye tohumlu) tek çözümlü sudoku. Skor = süre (sn) + hata başına 30 sn ceza.
// SudokuCore DOM'suzdur (Node'da test edilir); arayüz registerSolo ile kaydolur.
(function(root){
  const LEVELS = { kolay: [38, 42], orta: [30, 34], zor: [24, 28] };
  const R = [], C = [], B = [];
  for (let i = 0; i < 81; i++){ R[i] = Math.floor(i / 9); C[i] = i % 9; B[i] = Math.floor(R[i] / 3) * 3 + Math.floor(C[i] / 3); }
  // her hücrenin akranları (aynı satır/sütun/kutu)
  const PEERS = [];
  for (let i = 0; i < 81; i++){
    PEERS[i] = [];
    for (let j = 0; j < 81; j++) if (j !== i && (R[j] === R[i] || C[j] === C[i] || B[j] === B[i])) PEERS[i].push(j);
  }
  const popcnt = m => { let n = 0; while (m){ m &= m - 1; n++; } return n; };

  function shuffle(a, rng){
    for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Çözüm sayar (limit'e ulaşınca durur). rng verilirse adayları karışık sırayla dener ve ilk çözümü grid'e yazar.
  // budget: en çok düğüm sayısı (deterministik sınır); aşılırsa -1 döner.
  function search(grid, limit, budget, rng, out){
    const g = grid.slice();
    const rows = new Int32Array(9), cols = new Int32Array(9), boxes = new Int32Array(9);
    for (let i = 0; i < 81; i++){
      const v = g[i]; if (!v) continue;
      const bit = 1 << v;
      if ((rows[R[i]] | cols[C[i]] | boxes[B[i]]) & bit){ search.nodes = 0; return 0; }
      rows[R[i]] |= bit; cols[C[i]] |= bit; boxes[B[i]] |= bit;
    }
    let count = 0, nodes = 0, over = false;
    function rec(){
      if (++nodes > budget){ over = true; return true; }
      let best = -1, bestMask = 0, bestN = 10;
      for (let i = 0; i < 81; i++){
        if (g[i]) continue;
        const m = ~(rows[R[i]] | cols[C[i]] | boxes[B[i]]) & 0x3FE;
        const n = popcnt(m);
        if (n < bestN){ best = i; bestMask = m; bestN = n; if (n <= 1) break; }
      }
      if (best < 0){
        count++;
        if (out && count === 1) for (let i = 0; i < 81; i++) out[i] = g[i];
        return count >= limit;
      }
      if (!bestMask) return false;
      const ds = [];
      for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) ds.push(d);
      if (rng) shuffle(ds, rng);
      const r = R[best], c = C[best], b = B[best];
      for (const d of ds){
        const bit = 1 << d;
        g[best] = d; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        if (rec()) return true;
        g[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      }
      return false;
    }
    rec();
    search.nodes = nodes;
    return over ? -1 : count;
  }

  const countSolutions = (grid, limit = 2, budget = 1e6) => search(grid, limit, budget, null, null);

  function solve(grid){
    const out = new Array(81).fill(0);
    return search(grid, 1, 1e7, null, out) >= 1 ? out : null;
  }

  // Tam ve geçerli bir 9×9 tablo mu?
  function isValidSolution(g){
    if (!g || g.length !== 81) return false;
    for (let k = 0; k < 9; k++){
      let r = 0, c = 0, b = 0;
      for (let t = 0; t < 9; t++){
        r |= 1 << g[k * 9 + t];
        c |= 1 << g[t * 9 + k];
        b |= 1 << g[(Math.floor(k / 3) * 3 + Math.floor(t / 3)) * 9 + (k % 3) * 3 + t % 3];
      }
      if (r !== 0x3FE || c !== 0x3FE || b !== 0x3FE) return false;
    }
    return true;
  }

  // Bulmaca üret: rng → tam tablo → tekliği koruyarak hücre sil. Tamamen deterministik (zaman değil düğüm sınırı).
  function generate(rng, level){
    const range = LEVELS[level] || LEVELS.orta;
    const solution = new Array(81).fill(0);
    search(new Array(81).fill(0), 1, 1e7, rng, solution);
    const target = range[0] + Math.floor(rng() * (range[1] - range[0] + 1));
    const puzzle = solution.slice();
    const order = shuffle([...Array(81).keys()], rng);
    let givens = 81, work = 0;
    const WORK_LIMIT = 300000;   // toplam düğüm bütçesi (deterministik; tarayıcıda < 400 ms)
    for (const i of order){
      if (givens <= target || work > WORK_LIMIT) break;
      const v = puzzle[i]; puzzle[i] = 0;
      const res = search(puzzle, 2, 50000, null, null);
      work += search.nodes;
      if (res !== 1) puzzle[i] = v;   // tek çözüm bozulduysa (veya bütçe aşıldıysa) geri koy
      else givens--;
    }
    return { puzzle, solution, givens, target, work };
  }

  const Core = { LEVELS, PEERS, R, C, B, generate, countSolutions, solve, isValidSolution, shuffle };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  root.SudokuCore = Core;
})(typeof window !== 'undefined' ? window : globalThis);

// ---------- Arayüz ----------
(function(){
  if (typeof registerSolo !== 'function') return;
  const Core = window.SudokuCore;
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const LEVEL_NAMES = { kolay: 'Kolay', orta: 'Orta', zor: 'Zor' };
  const PENALTY = 30;
  const fmtDay = k => { const p = String(k || '').split('-'); return p.length === 3 ? (+p[2]) + ' ' + AYLAR[+p[1] - 1] + ' ' + p[0] : ''; };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  registerSolo({
    id: 'sudoku', name: 'Günün Sudokusu', icon: '🔢',
    desc: 'Herkese aynı bulmaca, en hızlı çözen kazanır.',
    levels: [{ id: 'kolay', name: 'Kolay' }, { id: 'orta', name: 'Orta' }, { id: 'zor', name: 'Zor' }],
    daily: true, better: 'low',
    format: s => fmtTime(s),
    mount(root, ctx){
      const level = LEVEL_NAMES[ctx.level] ? ctx.level : 'orta';
      const gen = Core.generate(ctx.rng(ctx.seed), level);
      const sol = gen.solution;
      const given = gen.puzzle.map(v => v > 0);
      const val = gen.puzzle.slice();
      const notes = new Array(81).fill(0);   // bit d → aday d
      const undo = [];
      let sel = given.indexOf(false), noteMode = false, mistakes = 0, done = false;
      const t0 = performance.now(); let endMs = 0;
      const timers = new Set();
      const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
      const rm = ctx.reducedMotion;

      // --- iskelet ---
      const wrap = el('div', 'sudoku-wrap');
      const bar = el('div', 'sudoku-bar');
      const meta = el('div', 'sudoku-meta');
      meta.append(el('b', 'sudoku-level', LEVEL_NAMES[level]), el('span', 'sudoku-date', fmtDay(ctx.dayKey)));
      const stats = el('div', 'sudoku-stats');
      const timerEl = el('span', 'sudoku-timer', '0:00');
      const mistEl = el('span', 'sudoku-mist');
      stats.append(timerEl, mistEl);
      bar.append(meta, stats);

      const main = el('div', 'sudoku-main');
      const board = el('div', 'sudoku-board');
      const grid = el('div', 'sudoku-grid');
      grid.setAttribute('role', 'grid'); grid.setAttribute('aria-label', 'Sudoku tablosu'); grid.tabIndex = 0;
      const cells = [];
      for (let b = 0; b < 9; b++){
        const box = el('div', 'sudoku-box');
        for (let t = 0; t < 9; t++){
          const i = (Math.floor(b / 3) * 3 + Math.floor(t / 3)) * 9 + (b % 3) * 3 + t % 3;
          const c = el('div', 'sudoku-cell');
          c.dataset.i = i; c.setAttribute('role', 'gridcell');
          cells[i] = c; box.append(c);
        }
        grid.append(box);
      }
      board.append(grid);

      const side = el('div', 'sudoku-side');
      const pad = el('div', 'sudoku-pad');
      const padBtns = [];
      for (let d = 1; d <= 9; d++){
        const b = el('button', 'sudoku-num'); b.type = 'button'; b.dataset.d = d;
        b.append(el('b', '', d), el('small', '', ''));
        padBtns[d] = b; pad.append(b);
      }
      const acts = el('div', 'sudoku-acts');
      const mkAct = (cls, ico, txt, title) => { const b = el('button', 'sudoku-act ' + cls); b.type = 'button'; b.title = title; b.append(el('span', 'sudoku-ico', ico), el('span', '', txt)); acts.append(b); return b; };
      const undoBtn = mkAct('sudoku-undo', '↶', 'Geri al', 'Geri al (Ctrl+Z)');
      const eraseBtn = mkAct('sudoku-erase', '⌫', 'Sil', 'Sil (Backspace)');
      const noteBtn = mkAct('sudoku-notebtn', '✏️', 'Not', 'Not modu (N)');
      side.append(pad, acts);
      if (ctx.alreadyPlayed) side.append(el('p', 'sudoku-note', 'Bugünkü sonucun zaten tabloda; bu oyun sıralamaya girmez.'));
      side.append(el('p', 'sudoku-help', 'Klavye: oklar, 1–9, Sil/0, N = not modu. Her hata +30 sn ceza.'));
      main.append(board, side);
      wrap.append(bar, main);
      root.append(wrap);

      // --- çizim ---
      function drawCell(i){
        const c = cells[i];
        c.textContent = '';
        if (val[i]) c.textContent = val[i];
        else if (notes[i]){
          const n = el('div', 'sudoku-notes');
          for (let d = 1; d <= 9; d++) n.append(el('span', '', notes[i] & (1 << d) ? d : ''));
          c.append(n);
        }
      }
      function paint(){
        const sv = sel >= 0 ? val[sel] : 0;
        for (let i = 0; i < 81; i++){
          const c = cells[i];
          const peer = sel >= 0 && i !== sel && (Core.R[i] === Core.R[sel] || Core.C[i] === Core.C[sel] || Core.B[i] === Core.B[sel]);
          c.classList.toggle('is-sel', i === sel);
          c.classList.toggle('is-peer', peer);
          c.classList.toggle('is-same', !!sv && val[i] === sv && i !== sel);
          c.classList.toggle('is-given', given[i]);
          c.classList.toggle('is-user', !given[i] && !!val[i]);
          c.classList.toggle('has-note', !val[i] && !!(sv && notes[i] & (1 << sv)));
        }
        const cnt = new Array(10).fill(0);
        for (let i = 0; i < 81; i++) if (val[i]) cnt[val[i]]++;
        for (let d = 1; d <= 9; d++){
          const left = 9 - cnt[d];
          padBtns[d].querySelector('small').textContent = left;
          padBtns[d].classList.toggle('is-done', left <= 0);
          padBtns[d].disabled = left <= 0 || done;
        }
        noteBtn.classList.toggle('on', noteMode);
        noteBtn.setAttribute('aria-pressed', noteMode);
        undoBtn.disabled = !undo.length || done;
        eraseBtn.disabled = done; noteBtn.disabled = done;
        mistEl.textContent = mistakes ? '✖ ' + mistakes + ' hata · +' + fmtTime(mistakes * PENALTY) : '✖ 0 hata';
        mistEl.classList.toggle('bad', mistakes > 0);
      }
      for (let i = 0; i < 81; i++) drawCell(i);

      const elapsed = () => (done ? endMs : performance.now() - t0);
      function tick(){ timerEl.textContent = '⏱ ' + fmtTime(Math.floor(elapsed() / 1000)); }
      tick();
      const iv = setInterval(tick, 500);

      // --- hamleler ---
      function snapshot(i){
        // hücre + akranların notları (otomatik silinenler geri gelsin)
        return { i, v: val[i], n: notes[i], peers: Core.PEERS[i].map(j => notes[j]) };
      }
      function restore(s){
        val[s.i] = s.v; notes[s.i] = s.n; drawCell(s.i);
        Core.PEERS[s.i].forEach((j, k) => { if (notes[j] !== s.peers[k]){ notes[j] = s.peers[k]; drawCell(j); } });
      }
      function place(d){
        if (done || sel < 0 || given[sel]) return;
        const i = sel;
        if (noteMode){
          if (val[i]) return;
          undo.push(snapshot(i));
          notes[i] ^= 1 << d; drawCell(i); paint();
          ctx.sound('tile');
          return;
        }
        if (val[i] === d) return;
        if (sol[i] !== d){
          mistakes++;
          ctx.sound('err');
          const c = cells[i];
          c.classList.remove('is-bad'); void c.offsetWidth;
          c.textContent = d; c.classList.add('is-bad');
          later(() => { c.classList.remove('is-bad'); drawCell(i); }, 700);
          if (!rm){ grid.classList.remove('sudoku-shake'); void grid.offsetWidth; grid.classList.add('sudoku-shake'); }
          const pop = el('span', 'sudoku-pen', '+30 sn'); stats.append(pop); later(() => pop.remove(), 1200);
          paint();
          return;
        }
        undo.push(snapshot(i));
        val[i] = d; notes[i] = 0; drawCell(i);
        for (const j of Core.PEERS[i]) if (notes[j] & (1 << d)){ notes[j] &= ~(1 << d); drawCell(j); }
        ctx.sound('tile');
        if (!rm){ cells[i].classList.remove('pop'); void cells[i].offsetWidth; cells[i].classList.add('pop'); }
        paint();
        checkWin();
      }
      function erase(){
        if (done || sel < 0 || given[sel] || (!val[sel] && !notes[sel])) return;
        undo.push(snapshot(sel));
        val[sel] = 0; notes[sel] = 0; drawCell(sel); paint();
      }
      function doUndo(){
        if (done || !undo.length) return;
        const s = undo.pop(); restore(s); sel = s.i; paint();
      }
      function checkWin(){
        for (let i = 0; i < 81; i++) if (val[i] !== sol[i]) return;
        done = true; endMs = performance.now() - t0; tick(); clearInterval(iv);
        const ms = Math.round(endMs);
        const score = Math.floor(ms / 1000) + mistakes * PENALTY;
        sel = -1; paint();
        wrap.classList.add('is-won');
        ctx.sound('win');
        if (typeof confetti === 'function') confetti(board);
        const msg = el('div', 'sudoku-win');
        msg.append(el('b', '', 'Tebrikler! 🎉'), el('span', '', fmtTime(Math.floor(ms / 1000)) + (mistakes ? ' + ' + mistakes + ' hata cezası = ' + fmtTime(score) : '')));
        board.append(msg);
        later(() => ctx.finish({ score, detail: { mistakes, ms, level } }), rm ? 300 : 1400);
      }

      // --- olaylar ---
      grid.addEventListener('pointerdown', e => {
        const c = e.target.closest('.sudoku-cell'); if (!c || done) return;
        sel = +c.dataset.i; paint();
        e.preventDefault(); grid.focus({ preventScroll: true });
      });
      pad.addEventListener('click', e => { const b = e.target.closest('.sudoku-num'); if (b) place(+b.dataset.d); });
      eraseBtn.onclick = erase; undoBtn.onclick = doUndo;
      noteBtn.onclick = () => { noteMode = !noteMode; paint(); };

      function onKey(e){
        if (!root.isConnected || done) return;
        const t = e.target;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        if (e.altKey || e.metaKey) return;
        const k = e.key;
        if ((e.ctrlKey) && (k === 'z' || k === 'Z')){ doUndo(); e.preventDefault(); return; }
        if (e.ctrlKey) return;
        const mv = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[k];
        if (mv){
          if (sel < 0) sel = 0;
          else {
            let r = Core.R[sel], c = Core.C[sel];
            if (mv === -9) r = (r + 8) % 9; else if (mv === 9) r = (r + 1) % 9; else if (mv === -1) c = (c + 8) % 9; else c = (c + 1) % 9;
            sel = r * 9 + c;
          }
          paint(); e.preventDefault(); return;
        }
        if (/^[1-9]$/.test(k)){ place(+k); e.preventDefault(); return; }
        if (k === 'Backspace' || k === 'Delete' || k === '0'){ erase(); e.preventDefault(); return; }
        if (k === 'n' || k === 'N'){ noteMode = !noteMode; paint(); e.preventDefault(); }
      }
      document.addEventListener('keydown', onKey);
      paint();

      return {
        destroy(){
          document.removeEventListener('keydown', onKey);
          clearInterval(iv);
          timers.forEach(clearTimeout); timers.clear();
          wrap.remove();
        }
      };
    }
  });
})();
