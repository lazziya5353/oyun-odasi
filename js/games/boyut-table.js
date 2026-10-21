// Boyut Bilmece masası: "toplu" (herkes aynı soruyu aynı anda tahmin eder) ve "sıralı" (sırayla, herkes izler).
// Ev sahibi hakemdir: soruları seçer, tahminleri toplar, puanlar. Çizim boyut-ui.js'teki boyutSahne() ile.
(function(){
  if (typeof registerTableGame !== 'function') return;
  const TOPLU_MS = 40000, SIRALI_MS = 45000, ACIK_MS = 7000;
  const syncNames = (o, g) => { g.names = o.sum.seats.map(x => x ? x.name : ''); };

  function yeniOyun(opts, active, gameNo){
    const mode = opts.mode === 'sirali' ? 'sirali' : 'toplu';
    const order = active.map((a, k) => a ? k : -1).filter(k => k >= 0);
    const n = mode === 'sirali' ? opts.tur * order.length : opts.tur;
    const seed = (Math.random() * 4294967296) >>> 0;
    return {
      uid: seed, mode, tur: opts.tur, kat: opts.kat, order, gameNo: gameNo || 1,
      qs: BoyutCore.sorular(n, seed, opts.kat), qi: 0,
      phase: 'guess', guesses: {}, taslak: 0, last: [],
      pts: active.map(() => 0), dogru: active.map(() => 0),
      eid: 1, ms: 0, names: []
    };
  }
  const aktor = g => g.mode === 'sirali' ? g.order[g.qi % g.order.length] : -1;
  const gercek = g => BOYUT_VERI[g.qs[g.qi].hedef].m;
  const herkesKilitli = g => g.mode === 'sirali' ? g.guesses[aktor(g)] != null : g.order.every(k => g.guesses[k] != null);

  function ac(g){                       // tahminleri puanla, gerçeği göster
    if (g.phase !== 'guess') return;
    const m = gercek(g);
    const kim = g.mode === 'sirali' ? [aktor(g)] : g.order;
    g.last = kim.map(k => {
      const t = g.guesses[k];
      const p = t > 0 ? BoyutCore.puan(t, m) : 0;
      g.pts[k] += p; if (p >= 85) g.dogru[k]++;
      return { seat: k, m: t > 0 ? t : 0, p };
    }).sort((a, b) => b.p - a.p);
    g.phase = 'reveal'; g.eid++; g.ms = 1000;
  }
  function ileri(g){
    if (g.phase !== 'reveal') return;
    if (g.qi + 1 >= g.qs.length){ g.phase = 'over'; g.eid++; return; }
    g.qi++; g.phase = 'guess'; g.guesses = {}; g.taslak = 0; g.last = []; g.eid++; g.ms = 0;
  }
  function tahminEt(g, seat, m){
    if (g.phase !== 'guess' || !(m > 0) || !isFinite(m)) return false;
    if (g.mode === 'sirali' && seat !== aktor(g)) return false;
    if (g.mode === 'toplu' && !g.order.includes(seat)) return false;
    if (g.guesses[seat] != null) return false;
    const gm = gercek(g);
    g.guesses[seat] = Math.max(gm / 100, Math.min(gm * 100, m));
    return true;
  }

  registerTableGame('boyut', {
    name: 'Boyut Bilmece', icon: '📏', seats: 8, minPlayers: 1, yeni: true,
    cleanOpts: o => ({
      mode: o.mode === 'sirali' ? 'sirali' : 'toplu',
      tur: [1, 2, 3, 5, 8, 10].includes(+o.tur) ? +o.tur : 5,
      kat: o.kat === 'karisik' || (typeof BOYUT_KAT !== 'undefined' && BOYUT_KAT[o.kat]) ? o.kat : 'karisik'
    }),
    variantName: s => (s.opts.mode === 'sirali' ? 'Sıralı' : 'Toplu') + ' · ' + s.opts.tur + (s.opts.mode === 'sirali' ? ' tur' : ' soru') +
      (s.opts.kat && s.opts.kat !== 'karisik' && typeof BOYUT_KAT !== 'undefined' ? ' · ' + BOYUT_KAT[s.opts.kat] : ''),
    seatLabel: (s, k) => 'Oyuncu ' + (k + 1),
    waitText: (s, mine) => mine ? 'Oturan herkes oynar (1-8 kişi). Hazır olunca “Oyunu başlat”a bas; boş koltuklara bot da ekleyebilirsin.' : 'Masa sahibi oyunu başlatınca burada görünecek. Boş bir koltuğa oturabilirsin.',
    makeCard: {
      desc: '1-8 kişi. Size It Up tarzı: siyah silüetin gerçek boyu belli, beyazı ona göre büyüt-küçült. Toplu (herkes aynı anda) ya da sıralı oyna.',
      opts: '<label>Oyun şekli<select data-o="mode"><option value="toplu">Toplu: herkes aynı anda</option><option value="sirali">Sıralı: sırayla, herkes izler</option></select></label>' +
        '<label>Uzunluk (toplu: soru, sıralı: kişi başı tur)<select data-o="tur"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="5" selected>5</option><option value="8">8</option><option value="10">10</option></select></label>' +
        '<label>Konu<select data-o="kat"><option value="karisik">🎲 Karışık</option>' +
        (typeof BOYUT_KAT !== 'undefined' ? Object.entries(BOYUT_KAT).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') : '') + '</select></label>',
      read: c => ({ mode: c.querySelector('[data-o=mode]').value, tur: c.querySelector('[data-o=tur]').value, kat: c.querySelector('[data-o=kat]').value })
    },
    start(o){
      const g = yeniOyun(o.sum.opts, o.sum.seats.map(x => !!x));
      syncNames(o, g);
      return g;
    },
    act(o, seat, a, who){
      const g = o.state;
      if (a.type === 'newMatch'){
        if (g.phase !== 'over' || who !== o.sum.owner) return;
        o.state = yeniOyun(o.sum.opts, o.sum.seats.map(x => !!x), (g.gameNo || 1) + 1);
        syncNames(o, o.state); o.bp = null; pump(o); sendViews(o); return;
      }
      if (a.type === 'devam'){
        if (g.phase !== 'reveal' || who !== o.sum.owner) return;
        ileri(g); pump(o); sendViews(o); return;
      }
      if (seat < 0) return;
      if (a.type === 'taslak'){
        if (g.phase !== 'guess' || g.mode !== 'sirali' || seat !== aktor(g) || !(a.m > 0)) return;
        g.taslak = +a.m; sendViews(o); return;
      }
      if (a.type === 'kilit'){
        if (!tahminEt(g, seat, +a.m)){ sendTo(who, { t: 'tb-err', id: o.sum.id, err: 'Tahmin alınamadı' }); return; }
        if (herkesKilitli(g)) ac(g);
        pump(o); sendViews(o);
      }
    },
    // tables.js her pump'ta zamanlayıcıları siler; bu yüzden aşamanın planı (mutlak zamanlarla) saklanır, her pump'ta kalanlar yeniden kurulur
    pump(o){
      const s = o.sum, g = o.state;
      if (g.phase === 'over'){ o.deadline = 0; o.bp = null; return; }
      const key = g.uid + ':' + g.qi + ':' + g.phase;
      const ayni = () => o.state === g && g.uid + ':' + g.qi + ':' + g.phase === key;
      const adim = fn => { if (!ayni()) return; fn(); pump(o); sendViews(o); };
      const now = Date.now();
      if (!o.bp || o.bp.key !== key){
        const plan = { key, isler: [] };
        const ekle = (ms, ad, veri) => plan.isler.push({ at: now + ms, ad, veri, bitti: false });
        if (g.phase === 'reveal'){ plan.son = now + ACIK_MS + 1000; ekle(ACIK_MS + 1000, 'ileri'); }
        else {
          const gm = gercek(g);
          if (g.mode === 'toplu'){
            g.order.forEach(k => { if (s.seats[k] && s.seats[k].bot) ekle(3500 + Math.random() * 14000, 'botKilit', { k, m: BoyutCore.botTahmin(gm, Math.random) }); });
            plan.son = now + TOPLU_MS; ekle(TOPLU_MS + 1500, 'ac');
          } else {
            const k = aktor(g), x = s.seats[k];
            if (x && x.bot){
              // bot, izleyenler görsün diye silüeti birkaç adımda büyütüp küçültür
              const hedef = BoyutCore.botTahmin(gm, Math.random), r0 = BOYUT_VERI[g.qs[g.qi].ref].m;
              [0.35, 0.75, 1.15, 0.95, 1].forEach((f, i) => ekle(1200 + i * 700, 'taslak', { m: r0 * Math.pow(hedef / r0, f) }));
              ekle(1200 + 5 * 700 + 500, 'botKilit', { k, m: hedef });
              plan.son = 0;
            } else { plan.son = now + SIRALI_MS; ekle(SIRALI_MS + 1500, 'sureBitti', { k }); }
          }
        }
        o.bp = plan;
      }
      // oyun sırasında masadan kalkanın yerine geçen bot da tahminini yapsın (yoksa herkes süre bitimini beklerdi)
      if (g.phase === 'guess'){
        const gm = gercek(g), botMu = k => s.seats[k] && s.seats[k].bot;
        const kimler = g.mode === 'toplu' ? g.order : [aktor(g)];
        kimler.forEach(k => {
          if (!botMu(k) || g.guesses[k] != null || o.bp.isler.some(is => is.ad === 'botKilit' && is.veri.k === k && !is.bitti)) return;
          o.bp.isler.push({ at: Date.now() + 2000 + Math.random() * 4000, ad: 'botKilit', veri: { k, m: BoyutCore.botTahmin(gm, Math.random) }, bitti: false });
        });
      }
      o.deadline = o.bp.son || 0;
      o.bp.isler.forEach(is => {
        if (is.bitti) return;
        later(o, Math.max(0, is.at - Date.now()), () => {
          if (is.bitti || !ayni()) return;
          is.bitti = true;
          if (is.ad === 'taslak'){ g.taslak = is.veri.m; sendViews(o); return; }
          adim(() => {
            if (is.ad === 'ileri') ileri(g);
            else if (is.ad === 'ac') ac(g);
            else if (is.ad === 'botKilit'){
              const x = s.seats[is.veri.k];
              if (x && x.bot && tahminEt(g, is.veri.k, is.veri.m) && herkesKilitli(g)) ac(g);   // bot yerine insan oturduysa onun yerine tahmin etme
            }
            else if (is.ad === 'sureBitti'){ if (g.taslak > 0) tahminEt(g, is.veri.k, g.taslak); ac(g); }
          });
        });
      });
    },
    view(o, seat){
      const g = o.state;
      syncNames(o, g);
      const v = JSON.parse(JSON.stringify(g));
      // toplu modda açılmadan önce kimsenin tahmini görünmez, yalnızca kilitlediği bilinir
      if (g.phase === 'guess' && g.mode === 'toplu') Object.keys(v.guesses).forEach(k => { if (+k !== seat) v.guesses[k] = -1; });
      v.left = o.deadline ? Math.max(0, o.deadline - Date.now()) : 0;
      v.aktor = aktor(g);
      return v;
    },
    render: (body, s, lv) => renderBoyut(body, s, lv),
    isMyTurn: (v, seat) => v.phase === 'guess' && (v.mode === 'sirali' ? v.aktor === seat : v.order.includes(seat) && v.guesses[seat] == null),
    turnKey: v => v.gameNo + ':' + v.qi + ':' + v.phase
  });
})();
