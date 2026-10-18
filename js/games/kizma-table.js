// Kızma Panpi'yi Oyun Salonu masalarına bağlar (kurallar kizma-core.js, çizim kizma-ui.js).
(function(){
  const COLORS = ['🔴 Kırmızı', '🔵 Mavi', '🟢 Yeşil', '🟡 Sarı'];
  const IDLE_MS = 60000;
  const syncNames = (o, g) => { g.names = o.sum.seats.map(x => x ? x.name : ''); };
  const botName = (o, k) => { const x = o.sum.seats[k]; return x ? x.name : 'Oyuncu'; };
  function doAct(o, seat, a){ const g = o.state; syncNames(o, g); return KizmaCore.act(g, seat, a); }
  registerTableGame('kizma', {
    name: 'Kızma Panpi', icon: '🎲', seats: 4, minPlayers: 2, yeni: true,
    cleanOpts: () => ({}),
    variantName: () => '2-4 kişi · 6 at, taşını çıkar',
    seatLabel: (s, k) => COLORS[k],
    waitText: (s, mine) => mine ? 'En az 2 oyuncu oturunca “Oyunu başlat”a bas (en çok 4). Boş koltuklara bot ekleyebilirsin.' : 'Masa sahibi oyunu başlatınca burada görünecek. Boş bir koltuğa oturabilirsin.',
    makeCard: {
      desc: '2-4 kişi. Zar at, 6 gelince taşını çıkar, rakibini vur, dört taşını da evine sok. Klasik “kızma birader”.',
      opts: '',
      read: () => ({})
    },
    start(o){
      const active = o.sum.seats.map(x => !!x);
      const g = KizmaCore.newGame(o.sum.opts, active);
      syncNames(o, g);
      return g;
    },
    act(o, seat, a, who){
      const g = o.state;
      if (a.type === 'newMatch'){
        if (g.phase !== 'over' || who !== o.sum.owner) return;
        const active = o.sum.seats.map(x => !!x);
        o.state = KizmaCore.newGame(Object.assign({}, o.sum.opts, { gameNo: (g.gameNo || 1) + 1 }), active);
        syncNames(o, o.state); pump(o); sendViews(o); return;
      }
      if (seat < 0) return;
      const r = doAct(o, seat, a);
      if (!r.ok){ sendTo(who, { t: 'tb-err', id: o.sum.id, err: r.err }); return; }
      pump(o); sendViews(o);
    },
    pump(o){
      const s = o.sum, g = o.state;
      o.deadline = 0;
      if (g.phase === 'over') return;
      const seat = KizmaCore.actor(g);
      const x = s.seats[seat];
      if (!x) return;
      const key = g.eid + ':' + g.phase;
      if (x.bot){
        later(o, KizmaCore.suggestDelay(g), () => {
          if (g.eid + ':' + g.phase !== key || g.phase === 'over') return;
          const a = KizmaCore.botAction(g, seat);
          if (a) doAct(o, seat, a);
          pump(o); sendViews(o);
        });
        return;
      }
      // insan: tek hamle varsa kendiliğinden oynanır (animasyon bitince)
      if (g.phase === 'move' && g.legal.length === 1){
        later(o, 700 + Math.min(4000, g.ms || 0), () => {
          if (g.eid + ':' + g.phase !== key || g.phase === 'over') return;
          doAct(o, seat, { type: 'move', pw: g.legal[0] });
          pump(o); sendViews(o);
        });
        return;
      }
      // süre dolarsa otomatik oynanır (masa kilitlenmesin)
      const ms = IDLE_MS + (g.ms || 0);
      o.deadline = Date.now() + ms;
      later(o, ms, () => {
        if (g.eid + ':' + g.phase !== key || g.phase === 'over') return;
        const a = KizmaCore.botAction(g, seat);
        if (!a) return;
        const r = doAct(o, seat, a);
        if (r.ok) g.log.push({ id: ++g.lid, tx: '⏱ ' + botName(o, seat) + ' süreyi doldurdu, hamle otomatik yapıldı.' });
        pump(o); sendViews(o);
      });
    },
    view(o, seat){
      const g = o.state;
      syncNames(o, g);
      const v = KizmaCore.view(g, seat >= 0 ? seat : null);
      v.left = o.deadline ? Math.max(0, o.deadline - Date.now()) : 0;
      return v;
    },
    render: (body, s, lv) => renderKizma(body, s, lv),
    isMyTurn: (v, seat) => v.phase !== 'over' && KizmaCore.actor(v) === seat,
    turnKey: v => v.eid + ':' + v.phase
  });
})();
