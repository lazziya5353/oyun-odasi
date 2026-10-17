// Emlak Oyunu'nu Oyun Salonu masalarına bağlar (kurallar emlak-core.js, çizim emlak-ui.js).
(function(){
  const PEONS = ['🥯 Simit', '⛴️ Vapur', '🕊️ Martı', '🍵 Çay bardağı', '🐱 Kedi', '🐟 Balık'];
  const IDLE_MS = 80000, AUCTION_MS = 35000;
  const syncNames = (o, g) => { g.names = o.sum.seats.map(x => x ? x.name : ''); };
  const botName = (o, k) => { const x = o.sum.seats[k]; return x ? x.name : 'Oyuncu'; };

  function doAct(o, seat, a){
    const g = o.state;
    syncNames(o, g);
    return EmlakCore.act(g, seat, a);
  }
  registerTableGame('emlak', {
    name: 'Emlak Oyunu', icon: '🏙️', seats: 6, minPlayers: 2, yeni: true,
    cleanOpts: o => ({ mode: o.mode === 'kisa' ? 'kisa' : 'klasik', cash: [1000, 1500, 2000].includes(+o.cash) ? +o.cash : 1500 }),
    variantName: s => (s.opts.mode === 'kisa' ? 'Kısa oyun' : 'Klasik oyun') + ' · ₺' + s.opts.cash + ' ile başla',
    seatLabel: (s, k) => PEONS[k],
    waitText: (s, mine) => mine ? 'En az 2 oyuncu oturunca “Oyunu başlat”a bas (en çok 6). Boş koltuklara bot ekleyebilirsin. Her koltuğun kendi piyonu var.' : 'Masa sahibi oyunu başlatınca burada görünecek. Boş bir koltuğa oturabilirsin.',
    makeCard: {
      desc: '2-6 kişi. Tapu al, kira topla, ev ve otel kur; herkesi iflas ettir. 3 boyutlu tahta, Türkiye temalı piyonlar.',
      opts: '<label>Oyun türü<select data-o="mode"><option value="klasik">Klasik (herkes kendi gücüyle)</option><option value="kisa">Kısa oyun (2 tapuyla başla, ilk iflasta biter)</option></select></label>' +
        '<label>Başlangıç parası<select data-o="cash"><option value="1000">₺1000</option><option value="1500" selected>₺1500 (klasik)</option><option value="2000">₺2000</option></select></label>',
      read: c => ({ mode: c.querySelector('[data-o=mode]').value, cash: c.querySelector('[data-o=cash]').value })
    },
    start(o){
      const active = o.sum.seats.map(x => !!x);
      const g = EmlakCore.newGame(o.sum.opts, active);
      syncNames(o, g);
      return g;
    },
    act(o, seat, a, who){
      const g = o.state;
      if (a.type === 'newMatch'){
        if (g.phase !== 'over' || who !== o.sum.owner) return;
        const active = o.sum.seats.map(x => !!x);
        o.state = EmlakCore.newGame(Object.assign({}, o.sum.opts, { gameNo: (g.gameNo || 1) + 1 }), active);
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
      // bota gelen takas teklifi
      if (g.tr && s.seats[g.tr.to] && s.seats[g.tr.to].bot){
        const to = g.tr.to;
        later(o, 1800, () => {
          if (!g.tr || g.tr.to !== to) return;
          const a = EmlakCore.botAction(g, to);
          if (a) doAct(o, to, a);
          pump(o); sendViews(o);
        });
        return;
      }
      const seat = EmlakCore.actor(g);
      const x = s.seats[seat];
      if (!x) return;
      if (x.bot){
        later(o, EmlakCore.suggestDelay(g), () => {
          const a = EmlakCore.botAction(g, seat);
          if (a) doAct(o, seat, a);
          pump(o); sendViews(o);
        });
        return;
      }
      // insan: süre dolarsa otomatik oynanır (masa kilitlenmesin)
      const ms = (g.phase === 'auction' ? AUCTION_MS : IDLE_MS) + (g.ms || 0);
      o.deadline = Date.now() + ms;
      const key = g.eid + ':' + g.phase;
      later(o, ms, () => {
        if (g.eid + ':' + g.phase !== key || g.phase === 'over') return;
        let a = EmlakCore.botAction(g, seat);
        if (a && a.type === 'trade') a = { type: 'end' };
        if (!a) return;
        const lastId = g.lid;
        const r = doAct(o, seat, a);
        if (r.ok){
          g.log.push({ id: ++g.lid, tx: '⏱ ' + botName(o, seat) + ' süreyi doldurdu, hamle otomatik yapıldı.' });
        }
        void lastId;
        pump(o); sendViews(o);
      });
    },
    view(o, seat){
      const g = o.state;
      syncNames(o, g);
      const v = EmlakCore.view(g, seat >= 0 ? seat : null);
      v.left = o.deadline ? Math.max(0, o.deadline - Date.now()) : 0;
      return v;
    },
    render: (body, s, lv) => renderEmlak(body, s, lv),
    isMyTurn: (v, seat) => v.phase !== 'over' && (EmlakCore.actor(v) === seat || (!!v.tr && v.tr.to === seat)),
    turnKey: v => v.eid + ':' + v.phase
  });
})();
