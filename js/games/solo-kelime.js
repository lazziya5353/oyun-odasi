// Kelime Bul: Türkçe Wordle. Herkese aynı günlük 5 harfli kelime, 6 hak. Skor = tahmin × 1000 + saniye (az olan iyi).
// KelimeCore DOM'suzdur (Node'da test edilir). Sözlük (kelime-sozluk.js) gerekirse ilk açılışta yüklenir.
(function(root){
  const ALFABE = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
  const trUpper = s => String(s || '').toLocaleUpperCase('tr-TR');
  // harfe böl (Türkçe harfler tek kod noktası)
  const letters = s => Array.from(trUpper(s));
  const isWord = s => { const l = letters(s); return l.length === 5 && l.every(ch => ALFABE.includes(ch)); };

  // İki geçişli değerlendirme: 'c' doğru yer, 'p' kelimede var, 'a' yok. Tekrarlı harfler doğru sayılır.
  function score(guess, answer){
    const g = letters(guess), a = letters(answer);
    const res = new Array(g.length).fill('a');
    const left = {};
    for (let i = 0; i < g.length; i++){
      if (g[i] === a[i]) res[i] = 'c';
      else left[a[i]] = (left[a[i]] || 0) + 1;
    }
    for (let i = 0; i < g.length; i++){
      if (res[i] === 'c') continue;
      if (left[g[i]] > 0){ res[i] = 'p'; left[g[i]]--; }
    }
    return res;
  }
  // klavye: her harf için en iyi bilinen durum (c > p > a)
  const RANK = { a: 1, p: 2, c: 3 };
  function keyStates(guesses, answer){
    const st = {};
    for (const gs of guesses){
      const r = score(gs, answer), l = letters(gs);
      l.forEach((ch, i) => { if (!st[ch] || RANK[r[i]] > RANK[st[ch]]) st[ch] = r[i]; });
    }
    return st;
  }
  function dailyAnswer(list, seed){ return list[(seed >>> 0) % list.length]; }
  const makeScore = (nGuess, secs) => nGuess * 1000 + Math.min(999, Math.max(0, Math.floor(secs)));

  const Core = { ALFABE, trUpper, letters, isWord, score, keyStates, dailyAnswer, makeScore };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  root.KelimeCore = Core;
})(typeof window !== 'undefined' ? window : globalThis);

// ---------- Arayüz ----------
(function(){
  if (typeof registerSolo !== 'function') return;
  const Core = window.KelimeCore;
  const ROWS = 6, LEN = 5;
  const KB = [['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'], ['ENTER', 'Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', 'BACK']];
  // sözlük dosyasının yeri: bu betikle aynı klasör
  const me = document.currentScript && document.currentScript.src;
  const SOZLUK_URL = me ? me.replace(/solo-kelime\.js(\?.*)?$/, 'kelime-sozluk.js') : 'js/games/kelime-sozluk.js';
  let sozlukP = null;
  function loadSozluk(){
    if (typeof KELIME_SOZLUK !== 'undefined') return Promise.resolve(KELIME_SOZLUK);
    if (!sozlukP) sozlukP = new Promise((ok, fail) => {
      const s = document.createElement('script'); s.src = SOZLUK_URL;
      s.onload = () => (typeof KELIME_SOZLUK !== 'undefined' ? ok(KELIME_SOZLUK) : fail(new Error('sözlük yok')));
      s.onerror = () => { sozlukP = null; fail(new Error('sözlük yüklenemedi')); };
      document.head.append(s);
    });
    return sozlukP;
  }
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const fmtScore = s => Math.floor(s / 1000) + '/6 · ' + fmtTime(s % 1000);
  const store = {
    get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } },
    set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  };

  registerSolo({
    id: 'kelime', name: 'Kelime Bul', icon: '🔤',
    desc: 'Günün 5 harfli kelimesini 6 tahminde bul.',
    levels: [], daily: true, better: 'low',
    format: fmtScore,
    mount(root, ctx){
      // günlük kelime + istenirse "serbest" mod: sınırsız yeni kelime (sıralamaya girmez, aynı kelime tekrar gelmez)
      let cur = null;
      const restart = ans => { if (cur) cur.destroy(); cur = mountK(root, ctx, ans, restart); };
      restart(null);
      return { destroy(){ if (cur) cur.destroy(); } };
    }
  });
  const FREE_KEY = 'oyunodasi-kelime-serbest', HIST_KEY = 'oyunodasi-kelime-serbest-gecmis';
  function pickFree(S, daily){
    let hist = store.get(HIST_KEY) || [];
    let pool = S.cevaplar.filter(w => w !== daily && !hist.includes(w));
    if (!pool.length){ hist = []; store.set(HIST_KEY, hist); pool = S.cevaplar.filter(w => w !== daily); }
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function mountK(root, ctx, free, restart){
      const rm = ctx.reducedMotion;
      const key = free ? FREE_KEY : 'oyunodasi-kelime-' + ctx.dayKey;
      const timers = new Set();
      const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
      let alive = true, iv = 0, onKey = null, saveNow = null;

      const wrap = el('div', 'kelime-wrap');
      const bar = el('div', 'kelime-bar');
      const info = el('span', 'kelime-info', 'Tahmin 0/6');
      if (free) bar.append(el('span', 'kelime-mode', '🔀 Serbest'));
      const timerEl = el('span', 'kelime-timer', '⏱ 0:00');
      bar.append(info, timerEl);
      const boardWrap = el('div', 'kelime-boardwrap');
      const board = el('div', 'kelime-board');
      const tiles = [];
      for (let r = 0; r < ROWS; r++){
        const row = el('div', 'kelime-row'); tiles[r] = [];
        for (let c = 0; c < LEN; c++){ const t = el('div', 'kelime-tile'); tiles[r][c] = t; row.append(t); }
        board.append(row);
      }
      boardWrap.append(board);
      const bottom = el('div', 'kelime-bottom');
      const msg = el('div', 'kelime-msg');
      const kb = el('div', 'kelime-kb');
      const keyEls = {};
      for (const row of KB){
        const r = el('div', 'kelime-kbrow');
        for (const k of row){
          const b = el('button', 'kelime-key' + (k.length > 1 ? ' wide' : ''));
          b.type = 'button'; b.dataset.k = k;
          b.textContent = k === 'BACK' ? '⌫' : k === 'ENTER' ? 'GİR' : k;
          if (k === 'BACK') b.setAttribute('aria-label', 'Sil');
          if (k === 'ENTER') b.setAttribute('aria-label', 'Tahmin et');
          keyEls[k] = b; r.append(b);
        }
        kb.append(r);
      }
      bottom.append(kb, msg);
      wrap.append(bar, boardWrap, bottom);
      if (ctx.alreadyPlayed && !free) wrap.append(el('p', 'kelime-note', 'Bugünkü sonucun zaten tabloda; bu oyun sıralamaya girmez.'));
      root.append(wrap);
      board.classList.add('is-loading');
      msg.textContent = 'Sözlük yükleniyor…';

      loadSozluk().then(S => { if (alive) start(S); }).catch(() => { if (alive) msg.textContent = 'Sözlük yüklenemedi. Sayfayı yenileyip tekrar dene.'; });

      function start(S){
        board.classList.remove('is-loading'); msg.textContent = '';
        const daily = Core.dailyAnswer(S.cevaplar, ctx.seed);
        const answer = free === true ? ((store.get(FREE_KEY) || {}).answer || pickFree(S, daily)) : free || daily;
        const valid = new Set(S.gecerli); S.cevaplar.forEach(w => valid.add(w));
        const saved = store.get(key);
        const st = saved && saved.answer === answer ? saved : { answer, guesses: [], secs: 0, done: false, won: false };
        if (free) store.set(FREE_KEY, st);
        let cur = [], busy = false;
        let t0 = performance.now() - st.secs * 1000;
        const secs = () => (st.done ? st.secs : (performance.now() - t0) / 1000);
        const save = () => { if (!st.done) st.secs = secs(); store.set(key, st); };
        saveNow = save;
        function tick(){ timerEl.textContent = '⏱ ' + fmtTime(Math.floor(secs())); }
        tick(); iv = setInterval(tick, 500);

        function paintRow(r, word, res){
          const l = Core.letters(word);
          for (let c = 0; c < LEN; c++){
            const t = tiles[r][c]; t.textContent = l[c] || '';
            t.classList.toggle('filled', !!l[c]);
            if (res) t.dataset.s = res[c]; else delete t.dataset.s;
          }
        }
        function paintKeys(){
          const ks = Core.keyStates(st.guesses, answer);
          for (const k in keyEls){ if (ks[k]) keyEls[k].dataset.s = ks[k]; else delete keyEls[k].dataset.s; }
        }
        function paintInfo(){ info.textContent = 'Tahmin ' + st.guesses.length + '/6'; }
        // kayıtlı ilerlemeyi geri yükle
        st.guesses.forEach((g, r) => paintRow(r, g, Core.score(g, answer)));
        paintKeys(); paintInfo();
        if (st.done){
          showEnd(true);
        }

        function shake(text){
          if (text) ctx.toast(text);
          ctx.sound('err');
          const row = board.children[st.guesses.length];
          if (!row || rm) return;
          row.classList.remove('kelime-shake'); void row.offsetWidth; row.classList.add('kelime-shake');
        }
        function type(ch){
          if (busy || st.done || cur.length >= LEN) return;
          cur.push(ch);
          const t = tiles[st.guesses.length][cur.length - 1];
          t.textContent = ch; t.classList.add('filled');
          if (!rm){ t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
        }
        function back(){
          if (busy || st.done || !cur.length) return;
          const t = tiles[st.guesses.length][cur.length - 1];
          cur.pop(); t.textContent = ''; t.classList.remove('filled', 'pop');
        }
        function submit(){
          if (busy || st.done) return;
          if (cur.length < LEN) return shake('Harf eksik');
          const word = cur.join('');
          if (!valid.has(word)) return shake('Sözlükte yok');
          const r = st.guesses.length;
          const res = Core.score(word, answer);
          st.guesses.push(word); cur = [];
          const won = word === answer, lost = !won && st.guesses.length >= ROWS;
          if (won || lost){ st.secs = secs(); st.done = true; st.won = won; }
          save();
          busy = true;
          const step = rm ? 0 : 280;
          tiles[r].forEach((t, c) => {
            if (rm){ t.dataset.s = res[c]; return; }
            t.style.animationDelay = (c * step) + 'ms';
            t.classList.add('flip');
            later(() => { t.dataset.s = res[c]; }, c * step + 250);
          });
          ctx.sound('tile');
          later(() => {
            tiles[r].forEach(t => { t.classList.remove('flip'); t.style.animationDelay = ''; });
            busy = false; paintKeys(); paintInfo();
            if (won || lost) finishGame(won, r);
          }, rm ? 50 : (LEN - 1) * step + 520);
        }
        function finishGame(won, r){
          tick(); clearInterval(iv);
          if (won){
            if (!rm) tiles[r].forEach((t, c) => { t.style.animationDelay = (c * 90) + 'ms'; t.classList.add('dance'); });
            ctx.sound('win');
            if (typeof confetti === 'function') confetti(boardWrap);
          } else ctx.sound('err');
          showEnd(false);
          const n = st.guesses.length;
          if (free){
            const h = store.get(HIST_KEY) || []; if (!h.includes(answer)) h.push(answer); store.set(HIST_KEY, h.slice(-2000));
            return;
          }
          later(() => {
            if (won) ctx.finish({ score: Core.makeScore(n, st.secs), detail: { guesses: n, ms: Math.round(st.secs * 1000) } });
            else ctx.finish({ score: Core.makeScore(7, st.secs), ranked: false, detail: { failed: true, answer } });
          }, rm ? 400 : 1600);
        }
        function showEnd(restored){
          msg.textContent = ''; kb.classList.add('is-off');
          const n = st.guesses.length;
          const box = el('div', 'kelime-end' + (st.won ? ' won' : ' lost'));
          if (st.won){
            box.append(el('b', '', ['Dahice! 🤯', 'Müthiş! 🎉', 'Harika! 🎉', 'Güzel! 👏', 'İyi iş! 👍', 'Kıl payı! 😅'][n - 1] || 'Bravo!'));
            box.append(el('span', '', n + '/6 tahmin · ' + fmtTime(Math.floor(st.secs))));
          } else {
            box.append(el('span', '', free ? 'Kelime:' : 'Günün kelimesi:'), el('b', 'kelime-answer', answer));
          }
          if (restored && !free) box.append(el('small', '', 'Bugünkü kelimeyi zaten oynadın. Yeni günlük kelime yarın; istersen serbest modda devam et!'));
          const nb = el('button', 'btn primary small kelime-yeni', free ? '🔀 Yeni kelime' : '🔀 Serbest oyna (sınırsız kelime)');
          nb.type = 'button';
          nb.onclick = () => { store.set(FREE_KEY, null); restart(pickFree(S, daily)); };
          box.append(nb);
          if (free){ const bk = el('button', 'btn small', '📅 Günlük kelimeye dön'); bk.type = 'button'; bk.onclick = () => restart(null); box.append(bk); }
          msg.append(box);
        }

        kb.addEventListener('click', e => {
          const b = e.target.closest('.kelime-key'); if (!b) return;
          const k = b.dataset.k;
          if (k === 'ENTER') submit(); else if (k === 'BACK') back(); else type(k);
        });
        onKey = e => {
          if (!root.isConnected) return;
          const t = e.target;
          if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (e.key === 'Enter'){ submit(); e.preventDefault(); return; }
          if (e.key === 'Backspace' || e.key === 'Delete'){ back(); e.preventDefault(); return; }
          if (e.key.length !== 1) return;
          const ch = Core.trUpper(e.key);
          if (Core.ALFABE.includes(ch)){ type(ch); e.preventDefault(); }
        };
        document.addEventListener('keydown', onKey);
        // sekme değişirken süreyi kaydet
        later(function autosave(){ if (alive && !st.done){ save(); later(autosave, 5000); } }, 5000);
      }

      return {
        destroy(){
          if (saveNow && alive) saveNow();
          alive = false;
          if (onKey) document.removeEventListener('keydown', onKey);
          clearInterval(iv);
          timers.forEach(clearTimeout); timers.clear();
          wrap.remove();
        }
      };
  }
})();
