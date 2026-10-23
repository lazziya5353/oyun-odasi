// Kızma Panpi'yi Oyun Salonu masalarına bağlar (kurallar kizma-core.js, çizim kizma-ui.js).
(function(){
  const COLORS = ['🔴 Kırmızı', '🔵 Mavi', '🟢 Yeşil', '🟡 Sarı'];
  // Ludo tahtasında sıra saat yönünde döner: koltuklar kırmızı, yeşil, sarı, mavi
  const LUDO_COLORS = ['🔴 Kırmızı', '🟢 Yeşil', '🟡 Sarı', '🔵 Mavi'];
  const IDLE_MS = 60000;
  const syncNames = (o, g) => { g.names = o.sum.seats.map(x => x ? x.name : ''); };
  const botName = (o, k) => { const x = o.sum.seats[k]; return x ? x.name : 'Oyuncu'; };
  function doAct(o, seat, a){ const g = o.state; syncNames(o, g); return KizmaCore.act(g, seat, a); }
  registerTableGame('kizma', {
    name: 'Kızma Panpi', icon: '🎲', seats: 4, minPlayers: 2, yeni: true,
    cleanOpts: o => ({ tahta: o.tahta === 'klasik' ? 'klasik' : 'ludo', blok: o.blok === true || o.blok === '1', uc6: !(o.uc6 === false || o.uc6 === '0') }),
    variantName: s => (s.opts.tahta === 'klasik' ? 'Klasik tahta' : 'Ludo tahtası' + (s.opts.blok ? ' · blok' : '') + (s.opts.uc6 === false ? '' : ' · üç 6 yanar')),
    seatLabel: (s, k) => (s.opts && s.opts.tahta === 'klasik' ? COLORS : LUDO_COLORS)[k],
    waitText: (s, mine) => mine ? 'En az 2 oyuncu oturunca “Oyunu başlat”a bas (en çok 4). Boş koltuklara bot ekleyebilirsin.' : 'Masa sahibi oyunu başlatınca burada görünecek. Boş bir koltuğa oturabilirsin.',
    makeCard: {
      desc: '2-4 kişi. Zar at, 6 gelince taşını çıkar, rakibini ye, dört taşını da ortadaki bitişe ulaştır. Ahşap Ludo tahtası ya da klasik kızma birader.',
      opts: '<label>Tahta<select data-o="tahta"><option value="ludo">Ludo (ahşap, yıldızlı güvenli kareler)</option><option value="klasik">Klasik kızma birader</option></select></label>' +
        '<label>Üst üste üç 6<select data-o="uc6"><option value="1">Üçüncü 6 yanar, sıra geçer</option><option value="0">Ceza yok</option></select></label>' +
        '<label>Blok kuralı<select data-o="blok"><option value="0">Kapalı</option><option value="1">Açık: aynı renkten 2 taş yolu keser</option></select></label>',
      read: c => ({ tahta: c.querySelector('[data-o=tahta]').value, uc6: c.querySelector('[data-o=uc6]').value, blok: c.querySelector('[data-o=blok]').value })
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
      // insan: yalnızca oyunda tek taşı varken ve tek hamle varken kendiliğinden oynanır;
      // iki ya da daha fazla taşı oyundayken hangisini oynayacağını kendisi seçer
      const onBoard = KizmaCore.onBoard(g, seat);
      if (g.phase === 'move' && g.legal.length === 1 && onBoard <= 1){
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
