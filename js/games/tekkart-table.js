// Tek Kart'ı Oyun Salonu masalarına bağlar (kurallar tekkart-core.js, çizim tekkart-ui.js).
(function(){
  const IDLE_MS = 45000, ROUND_MS = 10000;
  const syncNames = (o, g) => { g.names = o.sum.seats.map(x => x ? x.name : ''); };
  const botName = (o, k) => { const x = o.sum.seats[k]; return x ? x.name : 'Oyuncu'; };
  function doAct(o, seat, a){ const g = o.state; syncNames(o, g); return TekKartCore.act(g, seat, a); }
  const step = (o, fn) => { fn(); pump(o); sendViews(o); };
  registerTableGame('tekkart', {
    name: 'Tek Kart', icon: '🟥', seats: 6, minPlayers: 2, yeni: true,
    cleanOpts: o => ({ target: [0, 250, 500].includes(+o.target) ? +o.target : 0 }),
    variantName: s => s.opts.target ? s.opts.target + ' puana kadar' : 'Tek el',
    seatLabel: (s, k) => 'Koltuk ' + (k + 1),
    waitText: (s, mine) => mine ? 'En az 2 oyuncu oturunca “Oyunu başlat”a bas (en çok 6). Boş koltuklara bot ekleyebilirsin.' : 'Masa sahibi oyunu başlatınca burada görünecek. Boş bir koltuğa oturabilirsin.',
    makeCard: {
      desc: '2-6 kişi, 108 kart. Rengi ya da sayıyı eşle, Pas · Yön · +2 · Joker · +4 kartlarıyla rakibini durdur; tek kart kalınca “TEK!” de.',
      opts: '<label>Oyun süresi<select data-o="target"><option value="0">Tek el (ilk bitiren kazanır)</option><option value="250">250 puana kadar</option><option value="500">500 puana kadar (resmî)</option></select></label>',
      read: c => ({ target: c.querySelector('[data-o=target]').value })
    },
    start(o){
      const active = o.sum.seats.map(x => !!x);
      const g = TekKartCore.newGame(o.sum.opts, active);
      syncNames(o, g);
      return g;
    },
    act(o, seat, a, who){
      const g = o.state;
      if (a.type === 'newMatch'){
        if (g.phase !== 'over' || who !== o.sum.owner) return;
        const active = o.sum.seats.map(x => !!x);
        o.state = TekKartCore.newGame(Object.assign({}, o.sum.opts, { gameNo: (g.gameNo || 1) + 1 }), active);
        syncNames(o, o.state); pump(o); sendViews(o); return;
      }
      if (seat < 0 || a.type === 'next') return;
      const r = doAct(o, seat, a);
      if (!r.ok){ sendTo(who, { t: 'tb-err', id: o.sum.id, err: r.err }); return; }
      pump(o); sendViews(o);
    },
    pump(o){
      const s = o.sum, g = o.state;
      o.deadline = 0;
      if (g.phase === 'over') return;
      if (g.phase === 'roundover'){
        o.deadline = Date.now() + ROUND_MS + (g.ms || 0);
        later(o, ROUND_MS + (g.ms || 0), () => { if (g.phase === 'roundover') step(o, () => doAct(o, g.rwin, { type: 'next' })); });
        return;
      }
      const key = g.eid + ':' + g.phase + ':' + g.turn;
      const same = () => g.eid + ':' + g.phase + ':' + g.turn === key;
      // TEK demeyen var: botlar yakalamaya çalışır, unutan bot da sonradan söyler
      if (g.tek >= 0){
        const v = g.tek, vx = s.seats[v];
        s.seats.forEach((x, k) => {
          if (!x || !x.bot || k === v) return;
          later(o, 1300 + Math.random() * 2600, () => { if (g.tek === v) step(o, () => doAct(o, k, { type: 'catch' })); });
        });
        if (vx && vx.bot) later(o, 900 + Math.random() * 2400, () => { if (g.tek === v) step(o, () => doAct(o, v, { type: 'tek' })); });
      }
      const seat = g.turn, x = s.seats[seat];
      if (!x) return;
      if (x.bot){
        later(o, TekKartCore.suggestDelay(g), () => {
          if (!same() || g.phase === 'over' || g.phase === 'roundover') return;
          const a = TekKartCore.botAction(g, seat);
          if (a) step(o, () => doAct(o, seat, a));
        });
        return;
      }
      const ms = IDLE_MS + (g.ms || 0);
      o.deadline = Date.now() + ms;
      later(o, ms, () => {
        if (!same() || g.phase === 'over' || g.phase === 'roundover') return;
        let a = TekKartCore.botAction(g, seat);
        if (!a) return;
        if (a.type === 'challenge') a = { type: 'challenge', yes: false };
        if (a.type === 'play') a.tek = false;
        step(o, () => {
          const r = doAct(o, seat, a);
          if (r.ok) g.log.push({ id: ++g.lid, tx: '⏱ ' + botName(o, seat) + ' süreyi doldurdu, hamle otomatik yapıldı.' });
        });
      });
    },
    view(o, seat){
      const g = o.state;
      syncNames(o, g);
      const v = TekKartCore.view(g, seat >= 0 ? seat : null);
      v.left = o.deadline ? Math.max(0, o.deadline - Date.now()) : 0;
      return v;
    },
    render: (body, s, lv) => renderTekKart(body, s, lv),
    isMyTurn: (v, seat) => !['over', 'roundover'].includes(v.phase) && v.turn === seat,
    turnKey: v => v.eid + ':' + v.phase + ':' + v.turn
  });
})();
