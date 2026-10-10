// Batak'ı Oyun Salonu masalarına bağlar (kurallar batak-core.js, çizim batak-ui.js).
registerTableGame('batak', {
  name: 'Batak', icon: '🃏', seats: 4,
  cleanOpts: o => ({ variant: ['ihaleli', 'esli', 'kozmaca'].includes(o.variant) ? o.variant : 'ihaleli', hands: [5, 7, 11, 13].includes(+o.hands) ? +o.hands : 7 }),
  variantName: s => BatakCore.VARIANTS[s.opts.variant] + ' · ' + s.opts.hands + ' el',
  seatLabel: (s, k) => s.opts.variant === 'esli' ? (k % 2 ? '🔵 Takım B' : '🟠 Takım A') : 'Koltuk ' + (k + 1),
  makeCard: {
    desc: '4 kişi, 52 kart. İhale, koz, büyük atma zorunluluğu.',
    opts: '<label>Çeşit<select data-o="variant"><option value="ihaleli">İhaleli Batak (tekli)</option><option value="esli">Eşli İhaleli Batak (karşılıklı takım)</option><option value="kozmaca">Koz Maça (koz hep maça)</option></select></label>' +
      '<label>Kaç el?<select data-o="hands"><option value="5">5 el</option><option value="7" selected>7 el</option><option value="11">11 el</option><option value="13">13 el</option></select></label>',
    read: c => ({ variant: c.querySelector('[data-o=variant]').value, hands: c.querySelector('[data-o=hands]').value })
  },
  start: o => BatakCore.newMatch(o.sum.opts),
  act(o, seat, a, who){
    const g = o.state;
    if (a.type === 'newMatch'){
      if (g.phase !== 'gameover' || who !== o.sum.owner) return;
      o.state = BatakCore.newMatch(o.sum.opts); sendViews(o); pump(o); return;
    }
    if (seat < 0) return;
    const r = BatakCore.act(g, seat, a);
    if (!r.ok){ sendTo(who, { t: 'tb-err', id: o.sum.id, err: r.err }); return; }
    sendViews(o); pump(o);
  },
  pump(o){
    const s = o.sum, g = o.state;
    if (g.phase === 'handover'){ later(o, 9000, () => { if (g.phase === 'handover'){ BatakCore.act(g, 0, { type: 'nextHand' }); sendViews(o); pump(o); } }); return; }
    if (!['bid', 'trump', 'play'].includes(g.phase)) return;
    const x = s.seats[g.turn];
    if (!x || !x.bot) return;
    later(o, BatakCore.suggestDelay(g), () => {
      const a = BatakCore.botAction(g, g.turn);
      if (a) BatakCore.act(g, g.turn, a);
      sendViews(o); pump(o);
    });
  },
  view: (o, seat) => BatakCore.view(o.state, seat >= 0 ? seat : null),
  render: (body, s, lv) => renderBatak(body, s, lv),
  isMyTurn: (v, seat) => ['bid', 'trump', 'play'].includes(v.phase) && v.turn === seat,
  turnKey: v => v.handNo + ':' + v.seq
});
