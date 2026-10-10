// Adam Asmaca: kategorili Türkçe adam asmaca. Asılmadığın sürece kelimeler art arda gelir (seri);
// kelime başına 6 hata hakkı. Kelime puanı = harf × 10 + kalan can × 15 + hız bonusu (en çok 60). Seri puanı = toplam (çok olan iyi).
// AdamCore DOM'suzdur (Node'da test edilir); kelime listeleri de burada.
(function(root){
  const ALFABE = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
  const MAX = 6;
  const trUpper = s => String(s == null ? '' : s).toLocaleUpperCase('tr-TR');
  const norm = s => trUpper(s).trim().replace(/\s+/g, ' ');
  const letters = s => Array.from(norm(s));

  // Kelimeler küçük harfle yazıldı (Türkçe büyük harfe çevrilir: i→İ, ı→I). Yalnız aileye uygun, genel kelimeler.
  const HAM = {
    'Hayvanlar': 'aslan kaplan zürafa timsah kanguru penguen papağan kartal baykuş sincap kirpi kaplumbağa tavşan kelebek karınca örümcek yunus balina ahtapot denizatı flamingo leylek serçe güvercin martı horoz tavuk ördek hindi keçi koyun inek manda deve eşek katır kurt tilki çakal geyik ceylan zebra gergedan suaygırı goril şempanze maymun panda koala leopar jaguar çita yılan kertenkele kurbağa salyangoz ıstakoz yengeç köpek kedi hamster kunduz gelincik porsuk sansar kokarca',
    'Meyve & Sebze': 'elma armut kiraz vişne çilek karpuz kavun şeftali kayısı erik üzüm incir ayva mandalina portakal limon greyfurt ananas avokado kivi hurma böğürtlen ahududu kestane ceviz fındık badem domates salatalık biber patlıcan kabak havuç patates soğan sarımsak ıspanak pırasa lahana karnabahar brokoli marul maydanoz dereotu roka turp pancar bezelye fasulye bamya enginar kereviz mantar nane',
    'Şehirler': 'adana adıyaman afyonkarahisar ağrı amasya ankara antalya artvin aydın balıkesir bilecik bingöl bitlis bolu burdur bursa çanakkale çankırı çorum denizli diyarbakır edirne elazığ erzincan erzurum eskişehir gaziantep giresun gümüşhane hakkari hatay ısparta mersin istanbul izmir kars kastamonu kayseri kırklareli kırşehir kocaeli konya kütahya malatya manisa kahramanmaraş mardin muğla nevşehir niğde ordu rize sakarya samsun siirt sinop sivas tekirdağ tokat trabzon tunceli şanlıurfa uşak yozgat zonguldak aksaray bayburt karaman kırıkkale batman şırnak bartın ardahan ığdır yalova karabük kilis osmaniye düzce',
    'Ülkeler': 'türkiye almanya fransa italya ispanya portekiz yunanistan bulgaristan romanya macaristan polonya hollanda belçika isviçre avusturya norveç isveç finlandiya danimarka irlanda ingiltere rusya ukrayna gürcistan azerbaycan kazakistan özbekistan japonya hindistan pakistan endonezya malezya tayland vietnam mısır tunus cezayir nijerya kenya etiyopya kanada meksika brezilya arjantin şili peru kolombiya venezuela avustralya katar kuveyt ürdün lübnan ırak iran arnavutluk sırbistan hırvatistan moldova estonya letonya litvanya izlanda küba jamaika kamerun gana senegal somali sudan moğolistan nepal filipinler|bosna hersek|güney kore|yeni zelanda',
    'Meslekler': 'doktor hemşire öğretmen mühendis mimar avukat hakim polis itfaiyeci aşçı garson pilot kaptan denizci çiftçi bahçıvan berber kuaför terzi marangoz elektrikçi tesisatçı boyacı fırıncı kasap manav bakkal eczacı veteriner astronot gazeteci fotoğrafçı ressam heykeltıraş müzisyen şarkıcı oyuncu yazar şair çevirmen muhasebeci bankacı kurye şoför postacı tamirci kuyumcu saatçi çoban balıkçı arıcı madenci yazılımcı tasarımcı rehber kütüphaneci psikolog|diş hekimi',
    'Eşyalar': 'televizyon bilgisayar telefon şemsiye sandalye masa dolap kanepe yastık yorgan battaniye halı perde ayna saat lamba avize süpürge tencere tava çaydanlık bardak fincan tabak çatal kaşık bıçak makas kalem silgi defter cetvel çanta cüzdan anahtar gözlük şapka eldiven atkı terlik ayakkabı bavul fener vazo saksı kumanda kulaklık hoparlör tarak havlu sabun kova merdiven çekiç tornavida pense buzdolabı|diş fırçası|çamaşır makinesi',
    'Yemekler': 'lahmacun mantı karnıyarık imambayıldı pilav dolma sarma köfte kebap döner pide börek gözleme menemen ezogelin tarhana musakka türlü kumpir kokoreç simit poğaça baklava künefe sütlaç kazandibi aşure revani tulumba lokma helva kadayıf güllaç cacık haydari humus mücver şakşuka kısır ayran salep boza şalgam piyaz tantuni iskender|kuru fasulye|mercimek çorbası|hünkar beğendi|midye dolma|tavuk göğsü|çiğ köfte|içli köfte|hamsi tava|balık ekmek',
    'Spor': 'futbol basketbol voleybol hentbol tenis badminton yüzme atletizm maraton güreş boks judo karate tekvando eskrim okçuluk binicilik bisiklet kayak kürek yelken sörf dalış tırmanış jimnastik halter golf beyzbol ragbi hokey satranç bilardo bovling kaykay paraşüt triatlon cirit kaleci penaltı korner smaç ofsayt madalya kupa forvet antrenör stadyum|masa tenisi|buz pateni',
    'Müzik Aletleri': 'bağlama kemençe darbuka davul zurna kanun klarnet keman viyolonsel piyano gitar flüt trompet saksafon akordeon mandolin banjo armonika kontrbas trombon obua fagot ksilofon kaval tambur çello bendir kudüm santur mızıka tulum',
    'Doğa': 'şelale volkan okyanus gökkuşağı yıldırım kasırga orman vadi kanyon mağara buzul yarımada körfez nehir ırmak dere bulut yağmur dolu rüzgar fırtına şimşek güneş yıldız gezegen şafak çiçek papatya lale menekşe karanfil ayçiçeği sümbül nergis orkide kaktüs çınar meşe söğüt kavak zeytin palmiye yosun|gün batımı|kuyruklu yıldız'
  };
  // "a b c|iki kelime|..." → normalize, tekrarları at
  const KATEGORILER = {};
  for (const k in HAM){
    const [tek, ...cok] = HAM[k].split('|');
    const list = tek.split(/\s+/).filter(Boolean).concat(cok).map(norm);
    KATEGORILER[k] = Array.from(new Set(list));
  }

  function newRound(word, cat){ return { word: norm(word), cat: cat || '', guessed: [], wrong: [], hints: 0 }; }
  const chars = r => letters(r.word).filter(ch => ch !== ' ');
  const hidden = r => Array.from(new Set(chars(r))).filter(ch => !r.guessed.includes(ch));
  const isSolved = r => hidden(r).length === 0;
  const lives = r => Math.max(0, MAX - r.wrong.length - r.hints);
  const isHung = r => lives(r) === 0;
  // tahmin: 'hit' | 'miss' | 'dup' | 'invalid' | 'over'
  function guess(r, ch){
    ch = trUpper(ch);
    if (ch.length !== 1 || !ALFABE.includes(ch)) return 'invalid';
    if (isSolved(r) || isHung(r)) return 'over';
    if (r.guessed.includes(ch) || r.wrong.includes(ch)) return 'dup';
    if (chars(r).includes(ch)){ r.guessed.push(ch); return 'hit'; }
    r.wrong.push(ch); return 'miss';
  }
  // ipucu: rastgele gizli bir harfi açar, bir can götürür; son canla ya da tek harf kalmışken kullanılamaz
  const canHint = r => !isSolved(r) && lives(r) >= 2 && hidden(r).length >= 2;
  function hint(r, rnd){
    if (!canHint(r)) return null;
    const h = hidden(r), ch = h[Math.floor((rnd || Math.random)() * h.length) % h.length];
    r.guessed.push(ch); r.hints++;
    return ch;
  }
  // kelime puanı
  function wordScore(len, livesLeft, secs){
    const base = len * 10, life = livesLeft * 15;
    const speed = Math.max(0, Math.min(60, Math.round((40 - secs) * 1.5)));
    return { base, life, speed, total: base + life + speed };
  }
  const MAX_WORD = 16 * 10 + MAX * 15 + 60;   // sunucu sınırı için: kelime başına en çok
  // sıradaki kelime: son kategoriden farklı rastgele kategori, kullanılmamış kelime
  function pickNext(used, lastCat, rnd){
    rnd = rnd || Math.random;
    const cats = Object.keys(KATEGORILER).filter(c => c !== lastCat && KATEGORILER[c].some(w => !used.has(w)));
    const pool = cats.length ? cats : Object.keys(KATEGORILER).filter(c => KATEGORILER[c].some(w => !used.has(w)));
    if (!pool.length) return null;
    const cat = pool[Math.floor(rnd() * pool.length) % pool.length];
    const words = KATEGORILER[cat].filter(w => !used.has(w));
    return { cat, word: words[Math.floor(rnd() * words.length) % words.length] };
  }

  const Core = { ALFABE, MAX, MAX_WORD, trUpper, norm, letters, KATEGORILER, newRound, chars, hidden, isSolved, isHung, lives, guess, canHint, hint, wordScore, pickNext };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  root.AdamCore = Core;
})(typeof window !== 'undefined' ? window : globalThis);

// ---------- Arayüz ----------
(function(){
  if (typeof registerSolo !== 'function') return;
  const Core = window.AdamCore;
  const KB = [['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'], ['Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç']];
  const CAT_ICO = { 'Hayvanlar': '🐾', 'Meyve & Sebze': '🍎', 'Şehirler': '🏙️', 'Ülkeler': '🌍', 'Meslekler': '🧑‍🔧', 'Eşyalar': '🧺', 'Yemekler': '🍲', 'Spor': '⚽', 'Müzik Aletleri': '🎻', 'Doğa': '🌿' };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  // sahne: darağacı + adam (parçalar sırayla çizilir)
  const SAHNE = '<svg class="adam-svg" viewBox="0 0 220 240" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
    '<circle class="adam-sun" cx="186" cy="40" r="16"/>' +
    '<path class="adam-cloud" d="M150 82a9 9 0 0 1 17-4 7 7 0 0 1 12 5h-29z"/>' +
    '<path class="adam-cloud" d="M14 58a8 8 0 0 1 15-3 6 6 0 0 1 10 4H14z"/>' +
    '<path class="adam-hill" d="M-300 232Q-120 210 0 226Q60 206 120 220T220 214Q330 200 520 222V400H-300z"/>' +
    '<g class="adam-gal">' +
      '<path class="adam-wood" pathLength="1" d="M22 224H120"/>' +
      '<path class="adam-wood" pathLength="1" d="M52 224V20"/>' +
      '<path class="adam-wood" pathLength="1" d="M46 22H152"/>' +
      '<path class="adam-wood thin" pathLength="1" d="M52 62L92 22"/>' +
    '</g>' +
    '<g class="adam-man">' +
      '<path class="adam-rope" pathLength="1" d="M142 22V50"/>' +
      '<g class="adam-part" data-p="0"><circle class="adam-ln adam-head" pathLength="1" cx="142" cy="68" r="17"/>' +
        '<g class="adam-face"><g class="adam-eyes"><circle cx="136" cy="66" r="2.2"/><circle cx="148" cy="66" r="2.2"/></g>' +
        '<g class="adam-xeyes"><path d="M133 63l6 6M139 63l-6 6M145 63l6 6M151 63l-6 6"/></g>' +
        '<path class="adam-mouth" d="M136 76q6 4 12 0"/></g></g>' +
      '<path class="adam-ln adam-part" data-p="1" pathLength="1" d="M142 85V148"/>' +
      '<path class="adam-ln adam-part" data-p="2" pathLength="1" d="M142 100L118 128"/>' +
      '<path class="adam-ln adam-part" data-p="3" pathLength="1" d="M142 100L166 128"/>' +
      '<path class="adam-ln adam-part" data-p="4" pathLength="1" d="M142 148L124 190"/>' +
      '<path class="adam-ln adam-part" data-p="5" pathLength="1" d="M142 148L160 190"/>' +
    '</g></svg>';
  const MOUTH = ['M136 75q6 5 12 0', 'M136 76q6 4 12 0', 'M136 77q6 2 12 0', 'M136 77h12', 'M136 78q6-2 12 0', 'M136 79q6-4 12 0', 'M136 79q6-5 12 0'];

  registerSolo({
    id: 'adam', name: 'Adam Asmaca', icon: '🪢',
    desc: 'Kategorili kelimeler art arda: asılmadan kaç kelime bilebilirsin?',
    levels: [], daily: false, better: 'high',
    format: s => Number(s).toLocaleString('tr-TR') + ' puan',
    mount(root, ctx){
      const rm = ctx.reducedMotion;
      const timers = new Set();
      const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
      let alive = true, iv = 0, state = 'play', rnd = Math.random;
      const used = new Set();
      let run = { score: 0, words: 0, wrongs: 0, t0: performance.now() };
      let r = null, lastCat = '', wordT0 = 0, solvedSecs = 0, nextFn = null;

      const wrap = el('div', 'adam-wrap' + (rm ? ' rm' : ''));
      // üst çubuk
      const bar = el('div', 'adam-bar');
      const sWord = el('span', 'adam-chip', ''), sScore = el('span', 'adam-chip adam-score', '0');
      const livesEl = el('span', 'adam-lives');
      const hearts = [];
      for (let i = 0; i < Core.MAX; i++){ const h = el('i', 'adam-heart'); hearts.push(h); livesEl.append(h); }
      livesEl.setAttribute('aria-label', 'Kalan can');
      bar.append(sWord, livesEl, sScore);
      // sahne
      const stage = el('div', 'adam-stage');
      stage.innerHTML = SAHNE;
      const svg = stage.querySelector('svg');
      const parts = Array.from(svg.querySelectorAll('.adam-part')).sort((a, b) => a.dataset.p - b.dataset.p);
      const mouth = svg.querySelector('.adam-mouth');
      // oyun sütunu
      const play = el('div', 'adam-play');
      const cat = el('div', 'adam-cat');
      const wordEl = el('div', 'adam-word');
      const speed = el('div', 'adam-speed'); const speedFill = el('i'); speed.append(speedFill);
      speed.title = 'Hız bonusu';
      const row = el('div', 'adam-row');
      const wrongEl = el('div', 'adam-wrong');
      const hintBtn = el('button', 'adam-hint', '💡 İpucu'); hintBtn.type = 'button';
      hintBtn.title = 'Bir harfi açar, bir can götürür';
      row.append(wrongEl, hintBtn);
      const kb = el('div', 'adam-kb');
      const keyEls = {};
      for (const ks of KB){
        const rw = el('div', 'adam-kbrow');
        for (const k of ks){ const b = el('button', 'adam-key', k); b.type = 'button'; b.dataset.k = k; keyEls[k] = b; rw.append(b); }
        kb.append(rw);
      }
      const pop = el('div', 'adam-pop');
      play.append(cat, wordEl, speed, row, kb, pop);
      const main = el('div', 'adam-main');
      main.append(stage, play);
      wrap.append(bar, main);
      root.append(wrap);

      // ---- çizim ----
      let tiles = [];
      function buildWord(){
        wordEl.innerHTML = '';
        tiles = [];
        const parts2 = r.word.split(' ');
        const total = Core.letters(r.word).length;
        const n = total <= 12 ? total : Math.max(...parts2.map(p => Core.letters(p).length));
        wordEl.style.setProperty('--n', Math.max(n, 6));
        parts2.forEach((p, wi) => {
          const w = el('div', 'adam-wpart');
          Core.letters(p).forEach(ch => { const t = el('span', 'adam-tile'); t.dataset.ch = ch; tiles.push(t); w.append(t); });
          wordEl.append(w);
          if (wi < parts2.length - 1) wordEl.append(el('span', 'adam-gap'));
        });
      }
      function paint(anim){
        tiles.forEach((t, i) => {
          const ch = t.dataset.ch, open = r.guessed.includes(ch);
          if (open && !t.textContent){
            t.textContent = ch; t.classList.add('open');
            if (anim && !rm){ t.style.animationDelay = (i % 8) * 40 + 'ms'; t.classList.add('pop'); }
          }
        });
        const lv = Core.lives(r), lost = Core.MAX - lv;
        hearts.forEach((h, i) => h.classList.toggle('off', i >= lv));
        parts.forEach((p, i) => p.classList.toggle('on', i < lost));
        mouth.setAttribute('d', MOUTH[Math.min(lost, 6)]);
        wrongEl.innerHTML = '';
        if (!r.wrong.length) wrongEl.append(el('span', 'adam-wlbl', 'Yanlış harf yok'));
        else { wrongEl.append(el('span', 'adam-wlbl', 'Yanlış:')); r.wrong.forEach(ch => wrongEl.append(el('b', '', ch))); }
        for (const k in keyEls){
          const b = keyEls[k];
          b.dataset.s = r.wrong.includes(k) ? 'miss' : r.guessed.includes(k) ? (r.hinted.includes(k) ? 'hint' : 'hit') : '';
          b.disabled = !!b.dataset.s || state !== 'play';
        }
        hintBtn.disabled = state !== 'play' || !Core.canHint(r);
        sScore.textContent = run.score.toLocaleString('tr-TR') + ' puan';
        sWord.textContent = (run.words + 1) + '. kelime';
      }
      function newWord(){
        const nx = Core.pickNext(used, lastCat, rnd);
        if (!nx){ endRun(true); return; }
        used.add(nx.word); lastCat = nx.cat;
        r = Core.newRound(nx.word, nx.cat); r.hinted = [];
        state = 'play';
        cat.innerHTML = '';
        cat.append(el('span', 'adam-catico', CAT_ICO[nx.cat] || '❓'), el('span', '', nx.cat), el('small', '', Core.chars(r).length + ' harf'));
        if (!rm){ cat.classList.remove('in'); void cat.offsetWidth; cat.classList.add('in'); }
        wrap.classList.remove('is-won', 'is-hung');
        pop.className = 'adam-pop'; pop.innerHTML = '';
        buildWord();
        wordT0 = performance.now();
        paint(false);
      }
      function tick(){
        if (state !== 'play' || !r) return;
        const s = (performance.now() - wordT0) / 1000;
        const sp = Core.wordScore(0, 0, s).speed;
        speedFill.style.transform = 'scaleX(' + (sp / 60) + ')';
        speed.classList.toggle('low', sp < 20);
      }

      function press(ch){
        if (state !== 'play') return;
        const res = Core.guess(r, ch);
        if (res === 'invalid' || res === 'over') return;
        if (res === 'dup'){ const b = keyEls[Core.trUpper(ch)]; if (b && !rm){ b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); } return; }
        if (res === 'hit') ctx.sound('tile');
        else { ctx.sound('err'); run.wrongs++; if (!rm){ stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); } }
        after();
      }
      function after(){
        const win = Core.isSolved(r), dead = !win && Core.isHung(r);
        if (win) state = 'won'; else if (dead) state = 'hung';
        paint(true);
        if (win) solved(); else if (dead) hung();
      }
      function useHint(){
        if (state !== 'play') return;
        const ch = Core.hint(r, rnd);
        if (!ch) return;
        r.hinted.push(ch);
        ctx.sound('turn');
        after();
      }
      function solved(){
        solvedSecs = (performance.now() - wordT0) / 1000;
        const sc = Core.wordScore(Core.chars(r).length, Core.lives(r), solvedSecs);
        run.score += sc.total; run.words++;
        sScore.textContent = run.score.toLocaleString('tr-TR') + ' puan';
        if (!rm){ sScore.classList.remove('bump'); void sScore.offsetWidth; sScore.classList.add('bump'); }
        wrap.classList.add('is-won');
        ctx.sound('win');
        if (!rm) tiles.forEach((t, i) => { t.classList.remove('pop'); t.style.animationDelay = i * 55 + 'ms'; t.classList.add('dance'); });
        pop.innerHTML = '';
        const card = el('div', 'adam-popcard');
        card.append(el('b', 'adam-plus', '+' + sc.total));
        const br = el('div', 'adam-br');
        br.append(el('span', '', 'Kelime ' + sc.base), el('span', '', 'Can ' + sc.life), el('span', '', '⚡ Hız ' + sc.speed));
        const nb = el('button', 'btn primary small', 'Sonraki kelime ›'); nb.type = 'button';
        card.append(br, nb);
        pop.append(card);
        pop.classList.add('show');
        nextFn = () => { nextFn = null; newWord(); };
        nb.onclick = () => nextFn && nextFn();
        later(() => { if (state === 'won' && nextFn) nextFn(); }, rm ? 1800 : 2600);
      }
      function hung(){
        wrap.classList.add('is-hung');
        ctx.sound('err');
        // kalan harfleri kırmızıyla göster
        later(() => {
          tiles.forEach((t, i) => { if (!t.textContent){ t.textContent = t.dataset.ch; t.classList.add('miss'); if (!rm){ t.style.animationDelay = i * 40 + 'ms'; t.classList.add('pop'); } } });
        }, rm ? 0 : 500);
        pop.innerHTML = '';
        const card = el('div', 'adam-popcard lost');
        card.append(el('b', '', 'Asıldın! 😵'), el('span', '', run.words ? run.words + ' kelime bildin · ' + run.score.toLocaleString('tr-TR') + ' puan' : 'İlk kelimede takıldın.'));
        pop.append(card);
        later(() => pop.classList.add('show'), rm ? 0 : 900);
        later(() => endRun(false), rm ? 600 : 2000);
      }
      function endRun(allDone){
        if (!alive || state === 'end') return;
        state = 'end'; clearInterval(iv);
        paint(false);
        const ms = Math.round(performance.now() - run.t0);
        ctx.finish({ score: run.score, detail: { words: run.words, wrong: run.wrongs, ms, all: !!allDone } });
      }

      kb.addEventListener('click', e => { const b = e.target.closest('.adam-key'); if (b) press(b.dataset.k); });
      hintBtn.onclick = useHint;
      const onKey = e => {
        if (!root.isConnected) return;
        const t = e.target;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Enter' && state === 'won' && nextFn){ nextFn(); e.preventDefault(); return; }
        if (e.key.length !== 1) return;
        const ch = Core.trUpper(e.key);   // tr-TR: i → İ, ı → I
        if (Core.ALFABE.includes(ch)){ press(ch); e.preventDefault(); }
      };
      document.addEventListener('keydown', onKey);
      newWord();
      iv = setInterval(tick, 200); tick();
      // test kancası (oyunu etkilemez)
      Object.defineProperty(wrap, '_adam', { value: { get word(){ return r && r.word; }, get state(){ return state; }, press, useHint, run } });

      return {
        destroy(){
          alive = false;
          document.removeEventListener('keydown', onKey);
          clearInterval(iv);
          timers.forEach(clearTimeout); timers.clear();
          wrap.remove();
        }
      };
    }
  });
})();
