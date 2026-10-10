// İsim-Şehir: masa sahibi rastgele bir harf seçer, herkes kategorileri o harfle doldurur.
// İlk bitiren "Bitirdim!" der, diğerlerine 5 saniye kalır. Sonra cevaplar herkese açılır, uymayan cevaplara
// itiraz edilir (diğer oyuncuların çoğunluğu itiraz ederse cevap sayılmaz).
// Puan: kategoride geçerli cevabı olan TEK kişi 20, kimseyle aynı olmayan 10, başkasıyla aynı 5, boş/geçersiz 0.
const IsimSehirCore = (() => {
  const LETTERS = 'ABCÇDEFGHIİKLMNOÖPRSŞTUÜVYZ'.split('');
  const CATS = {
    isim: { name: 'İsim', icon: '👤' }, sehir: { name: 'Şehir', icon: '🏙️' }, hayvan: { name: 'Hayvan', icon: '🐾' },
    bitki: { name: 'Bitki', icon: '🌿' }, esya: { name: 'Eşya', icon: '🧸' }, ulke: { name: 'Ülke', icon: '🌍' },
    meslek: { name: 'Meslek', icon: '👷' }, yemek: { name: 'Yemek', icon: '🍲' }, unlu: { name: 'Ünlü', icon: '⭐' }
  };
  const SETS = { klasik: ['isim', 'sehir', 'hayvan', 'bitki', 'esya'], genis: ['isim', 'sehir', 'hayvan', 'bitki', 'esya', 'ulke', 'meslek', 'yemek'] };
  const FOLD = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  const lower = t => String(t || '').toLocaleLowerCase('tr-TR');
  // karşılaştırma için: küçük harf, Türkçe harfler sadeleşir, harf dışı her şey atılır
  const fold = t => lower(t).replace(/[çğıiöşüâîû]/g, c => FOLD[c]).replace(/[^a-z0-9]/g, '');
  const clean = t => String(t || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  // harfle başlıyor mu (Türkçe klavyesi olmayan için hoşgörülü: Ç yerine C de kabul edilir, oylamada itiraz edilebilir)
  const startsOk = (t, letter) => { const f = fold(t); return f.length >= 2 && f[0] === fold(letter)[0]; };
  function pickLetter(used, rng){
    const pool = LETTERS.filter(l => !used.includes(l));
    const src = pool.length ? pool : LETTERS;
    return src[Math.floor((rng || Math.random)() * src.length)];
  }
  // bir turun puanları. answers: { pid: { cat: text } }, rejected: Set('pid|cat')
  function scoreRound(players, cats, letter, answers, rejected){
    const res = {};
    players.forEach(p => { res[p] = { total: 0, cells: {} }; });
    cats.forEach(cat => {
      const valid = [];
      players.forEach(p => {
        const t = clean(answers[p] && answers[p][cat]);
        let ok = !!t && startsOk(t, letter), why = !t ? 'boş' : !ok ? 'harf' : '';
        if (ok && rejected.has(p + '|' + cat)){ ok = false; why = 'itiraz'; }
        res[p].cells[cat] = { t, ok, why, pts: 0 };
        if (ok) valid.push(p);
      });
      const counts = {};
      valid.forEach(p => { const k = fold(res[p].cells[cat].t); counts[k] = (counts[k] || 0) + 1; });
      valid.forEach(p => {
        const c = res[p].cells[cat];
        c.pts = valid.length === 1 ? 20 : counts[fold(c.t)] > 1 ? 5 : 10;
        if (valid.length > 1 && counts[fold(c.t)] > 1) c.same = true;
        res[p].total += c.pts;
      });
    });
    return res;
  }
  return { LETTERS, CATS, SETS, fold, clean, startsOk, pickLetter, scoreRound };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IsimSehirCore;

if (typeof registerTableGame === 'function') (function(){
  const C = IsimSehirCore;
  const T_READY = 3500, T_GRACE = 5000, T_VOTE = 35000, T_RESULT = 9000;
  const seated = o => o.sum.seats.filter(x => x && !x.bot);
  const nameOf = (st, id) => st.names[id] || 'Oyuncu';

  function newRound(o){
    const st = o.state;
    st.round++;
    st.letter = C.pickLetter(st.used); st.used.push(st.letter);
    st.phase = 'hazir'; st.endsAt = Date.now() + T_READY;
    st.drafts = {}; st.stopBy = null; st.objections = {}; st.ready = []; st.result = null;
    st.players = seated(o).map(x => x.id);
    seated(o).forEach(x => { st.names[x.id] = x.name; if (st.scores[x.id] == null) st.scores[x.id] = 0; });
    st.seq++;
  }
  function startVote(o){
    const st = o.state;
    st.players = st.players.filter(id => st.drafts[id] || o.sum.seats.some(x => x && x.id === id));
    st.phase = 'oylama'; st.endsAt = Date.now() + T_VOTE; st.ready = []; st.seq++;
  }
  function rejectedSet(st){
    const rej = new Set();
    const others = Math.max(1, st.players.length - 1);
    Object.keys(st.objections).forEach(k => { if (st.objections[k].length * 2 > others) rej.add(k); });
    return rej;
  }
  function finishRound(o){
    const st = o.state;
    st.result = C.scoreRound(st.players, st.cats, st.letter, st.drafts, rejectedSet(st));
    Object.keys(st.result).forEach(id => { st.scores[id] = (st.scores[id] || 0) + st.result[id].total; });
    st.phase = st.round >= st.rounds ? 'bitti' : 'sonuc';
    st.endsAt = st.phase === 'sonuc' ? Date.now() + T_RESULT : 0;
    st.seq++;
    if (st.phase === 'bitti'){
      const top = Object.keys(st.scores).sort((a, b) => st.scores[b] - st.scores[a])[0];
      if (top) addSys('🏆 İsim-Şehir bitti! Kazanan: ' + nameOf(st, top) + ' (' + st.scores[top] + ' puan)');
    }
  }
  function progressSoon(o){
    if (o.progT) return;
    o.progT = setTimeout(() => { o.progT = null; if (owned.get(o.sum.id) === o) sendViews(o); }, 700);
  }

  registerTableGame('isimsehir', {
    name: 'İsim-Şehir', icon: '📝', seats: 8, minPlayers: 2, bots: false, joinMidGame: true,
    cleanOpts: o => ({ rounds: [3, 5, 8, 10].includes(+o.rounds) ? +o.rounds : 5, sure: [60, 90, 120].includes(+o.sure) ? +o.sure : 90, set: o.set === 'genis' ? 'genis' : 'klasik' }),
    variantName: s => s.opts.rounds + ' tur · ' + s.opts.sure + ' sn · ' + (s.opts.set === 'genis' ? '8 kategori' : '5 kategori'),
    seatLabel: () => 'Oyuncu',
    waitText: (s, own) => own ? 'En az 2 kişi oturunca “Oyunu başlat”a bas. Oyun sırasında gelenler de oturup katılabilir.' : 'Bir koltuğa otur; masa sahibi başlatınca oyun burada açılır.',
    makeCard: {
      desc: '2-8 kişi. Harf çıkar, isim, şehir, hayvan, bitki, eşya… İlk bitiren “Dur!” der.',
      opts: '<label>Tur<select data-o="rounds"><option value="3">3 tur</option><option value="5" selected>5 tur</option><option value="8">8 tur</option><option value="10">10 tur</option></select></label>' +
        '<label>Süre<select data-o="sure"><option value="60">60 sn</option><option value="90" selected>90 sn</option><option value="120">120 sn</option></select></label>' +
        '<label>Kategoriler<select data-o="set"><option value="klasik">Klasik: İsim, Şehir, Hayvan, Bitki, Eşya</option><option value="genis">Geniş: + Ülke, Meslek, Yemek</option></select></label>',
      read: c => ({ rounds: c.querySelector('[data-o=rounds]').value, sure: c.querySelector('[data-o=sure]').value, set: c.querySelector('[data-o=set]').value })
    },
    start(o){
      o.state = { phase: 'hazir', round: 0, rounds: o.sum.opts.rounds, sure: o.sum.opts.sure, cats: C.SETS[o.sum.opts.set], used: [], scores: {}, names: {}, seq: 0 };
      newRound(o);
      return o.state;
    },
    onSeat(o){ sendViews(o); },
    onLeave(o){ sendViews(o); },
    act(o, seat, a, who){
      const st = o.state; if (!st) return;
      if (a.type === 'newMatch'){ if (st.phase !== 'bitti' || who !== o.sum.owner) return; this.start(o); sendViews(o); pump(o); return; }
      if (a.type === 'devam' && who === o.sum.owner){
        if (st.phase === 'oylama'){ finishRound(o); sendViews(o); pump(o); }
        else if (st.phase === 'sonuc'){ newRound(o); sendViews(o); pump(o); }
        return;
      }
      if (seat < 0) return;
      if (a.type === 'draft' && (st.phase === 'yaz' || st.phase === 'kapanis') && a.answers && typeof a.answers === 'object'){
        const d = {};
        st.cats.forEach(c => { d[c] = C.clean(a.answers[c]); });
        st.drafts[who] = d;
        if (!st.players.includes(who)) st.players.push(who);
        st.names[who] = o.sum.seats[seat].name;
        if (st.scores[who] == null) st.scores[who] = 0;
        if (a.stop && st.phase === 'yaz' && st.cats.every(c => d[c])){
          st.phase = 'kapanis'; st.stopBy = who; st.endsAt = Date.now() + T_GRACE; st.seq++;
          sendViews(o); pump(o); return;
        }
        progressSoon(o); return;
      }
      if (a.type === 'itiraz' && st.phase === 'oylama' && typeof a.pid === 'string' && st.cats.includes(a.cat) && a.pid !== who && st.players.includes(who)){
        const k = a.pid + '|' + a.cat, l = st.objections[k] || (st.objections[k] = []);
        const i = l.indexOf(who);
        if (a.on && i < 0) l.push(who); else if (!a.on && i >= 0) l.splice(i, 1);
        st.seq++; sendViews(o); return;
      }
      if (a.type === 'tamam' && st.phase === 'oylama' && st.players.includes(who)){
        if (!st.ready.includes(who)) st.ready.push(who);
        const active = st.players.filter(id => o.sum.seats.some(x => x && x.id === id));
        if (active.every(id => st.ready.includes(id))){ finishRound(o); sendViews(o); pump(o); return; }
        st.seq++; sendViews(o);
      }
    },
    pump(o){
      const st = o.state;
      const wait = Math.max(0, st.endsAt - Date.now());
      if (st.phase === 'hazir') later(o, wait, () => { st.phase = 'yaz'; st.endsAt = Date.now() + st.sure * 1000; st.seq++; sendViews(o); pump(o); });
      else if (st.phase === 'yaz') later(o, wait, () => { st.phase = 'kapanis'; st.stopBy = null; st.endsAt = Date.now() + 1500; st.seq++; sendViews(o); pump(o); });
      else if (st.phase === 'kapanis') later(o, wait + 600, () => { startVote(o); sendViews(o); pump(o); });
      else if (st.phase === 'oylama') later(o, wait, () => { finishRound(o); sendViews(o); pump(o); });
      else if (st.phase === 'sonuc') later(o, wait, () => { newRound(o); sendViews(o); pump(o); });
    },
    view(o, seat){
      const st = o.state, me_ = seat >= 0 && o.sum.seats[seat] ? o.sum.seats[seat].id : null;
      const v = { phase: st.phase, round: st.round, rounds: st.rounds, letter: st.phase === 'hazir' ? null : st.letter, cats: st.cats, sure: st.sure,
        endsIn: st.endsAt ? Math.max(0, st.endsAt - Date.now()) : 0, seq: st.seq, me: me_,
        stopBy: st.stopBy ? nameOf(st, st.stopBy) : null, used: st.used.slice(0, -1) };
      const ids = [...new Set([...st.players, ...Object.keys(st.scores)])];
      v.players = ids.map(id => ({ id, name: nameOf(st, id), score: st.scores[id] || 0, here: o.sum.seats.some(x => x && x.id === id),
        filled: st.drafts[id] ? st.cats.filter(c => st.drafts[id][c]).length : 0, ready: st.ready.includes(id), inRound: st.players.includes(id) }));
      if (me_ && st.drafts[me_]) v.myDraft = st.drafts[me_];
      if (st.phase === 'oylama' || st.phase === 'sonuc' || st.phase === 'bitti'){
        const rej = rejectedSet(st);
        v.table = st.players.map(id => ({ id, name: nameOf(st, id), cells: st.cats.map(c => {
          const t = C.clean(st.drafts[id] && st.drafts[id][c]);
          const obj = st.objections[id + '|' + c] || [];
          const r = st.result && st.result[id] && st.result[id].cells[c];
          return { t, auto: !!t && C.startsOk(t, st.letter), obj: obj.length, mine: !!(me_ && obj.includes(me_)), rej: rej.has(id + '|' + c), pts: r ? r.pts : null, same: r ? !!r.same : false };
        }), total: st.result && st.result[id] ? st.result[id].total : null }));
        v.others = Math.max(1, st.players.length - 1);
      }
      return v;
    },
    render: (body, s, lv) => renderIsimSehir(body, s, lv),
    isMyTurn: (v, seat) => seat >= 0 && v.phase === 'yaz',
    turnKey: v => 'r' + v.round
  });
})();

// ---------- arayüz ----------
const isUI = { key: '', deadline: 0, timer: null, draftT: null };
function isDeadline(v){ return Date.now() + (v.endsIn || 0); }
function renderIsimSehir(body, s, lv){
  const v = lv.v, playing = lv.seat >= 0;
  let root = body.querySelector('.is');
  const key = v.phase + ':' + v.round + ':' + (playing ? 'p' : 'w') + ':' + v.cats.length;
  if (!root || isUI.key !== key){
    // aynı turda ekran yenilenirken yazılanlar kaybolmasın (ör. biri "Bitirdim" dedi)
    const prev = {}, sameRound = root && isUI.key.split(':')[1] === String(v.round);
    if (sameRound) root.querySelectorAll('input[data-cat]').forEach(i => { prev[i.dataset.cat] = i.value; });
    const focusCat = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.cat : null;
    isUI.key = key;
    body.innerHTML = '';
    root = document.createElement('div'); root.className = 'is is-' + v.phase;
    root.innerHTML = '<div class="is-top"><div class="is-letter"><span></span></div><div class="is-info"><b class="is-title"></b><span class="note is-sub"></span><div class="is-bar"><i></i></div></div><div class="is-time"></div></div>' +
      '<div class="is-main"></div><div class="is-side"><h4>Puanlar</h4><ol class="is-scores"></ol></div>';
    body.append(root);
    buildIsMain(root.querySelector('.is-main'), s, lv);
    if (Object.keys(prev).length){
      root.querySelectorAll('input[data-cat]').forEach(i => { if (prev[i.dataset.cat] != null){ i.value = prev[i.dataset.cat]; i.dispatchEvent(new Event('input')); } });
      if (playing && (v.phase === 'yaz' || v.phase === 'kapanis')){ clearTimeout(isUI.draftT); isSendDraft(root.querySelector('.is-main')); }
      const f = focusCat && root.querySelector('input[data-cat="' + focusCat + '"]'); if (f) f.focus();
    }
    if (v.phase === 'hazir'){ gameSound('dice'); spinLetter(root.querySelector('.is-letter span'), v); }
    if (v.phase === 'bitti') setTimeout(() => confetti(root), 300);
  }
  isUI.deadline = isDeadline(v); isUI.total = v.phase === 'yaz' ? v.sure * 1000 : v.phase === 'kapanis' ? 5000 : v.phase === 'oylama' ? 35000 : v.phase === 'sonuc' ? 9000 : 3500;
  const L = root.querySelector('.is-letter span');
  if (v.letter && !L.dataset.spinning) L.textContent = v.letter;
  root.querySelector('.is-title').textContent = { hazir: 'Harf çekiliyor…', yaz: 'Yaz bakalım!', kapanis: v.stopBy ? '🛑 ' + v.stopBy + ' bitirdi! Son saniyeler…' : '⏰ Süre doldu!', oylama: 'Cevaplar: itiraz var mı?', sonuc: 'Tur sonucu', bitti: '🏆 Oyun bitti' }[v.phase];
  root.querySelector('.is-sub').textContent = 'Tur ' + v.round + '/' + v.rounds + (v.phase === 'oylama' ? ' · uymayan cevaba tıkla (👎), çoğunluk itiraz ederse sayılmaz' : v.phase === 'yaz' ? ' · hepsini doldurunca “Bitirdim!”' : '');
  root.classList.toggle('stop', v.phase === 'kapanis');
  updateIsMain(root.querySelector('.is-main'), s, lv);
  const sc = root.querySelector('.is-scores'); sc.innerHTML = '';
  v.players.slice().sort((a, b) => b.score - a.score).forEach((p, i) => {
    const li = document.createElement('li'); li.className = (p.id === v.me ? 'me ' : '') + (p.here ? '' : 'gone');
    li.innerHTML = '<span class="n"></span><span class="nm"></span><span class="st"></span><b></b>';
    li.querySelector('.n').textContent = ['🥇', '🥈', '🥉'][i] && v.phase === 'bitti' ? ['🥇', '🥈', '🥉'][i] : i + 1;
    li.querySelector('.nm').textContent = p.name;
    li.querySelector('.st').textContent = v.phase === 'yaz' || v.phase === 'kapanis' ? '✏️ ' + p.filled + '/' + v.cats.length : v.phase === 'oylama' && p.ready ? '✓' : '';
    li.querySelector('b').textContent = p.score;
    sc.append(li);
  });
  clearInterval(isUI.timer);
  const tick = () => {
    if (!root.isConnected){ clearInterval(isUI.timer); return; }
    const left = Math.max(0, isUI.deadline - Date.now());
    const tm = root.querySelector('.is-time');
    tm.textContent = v.phase === 'bitti' ? '' : Math.ceil(left / 1000);
    tm.classList.toggle('low', left < 10000 && (v.phase === 'yaz' || v.phase === 'kapanis'));
    root.querySelector('.is-bar i').style.width = (v.phase === 'bitti' ? 0 : Math.min(100, left / isUI.total * 100)) + '%';
  };
  tick(); isUI.timer = setInterval(tick, 250);
}
function spinLetter(el, v){
  if (reducedMotion()) return;
  el.dataset.spinning = '1';
  const L = IsimSehirCore.LETTERS; let n = 0;
  const t = setInterval(() => {
    el.textContent = L[Math.floor(Math.random() * L.length)];
    if (++n > 16 || !el.isConnected){ clearInterval(t); delete el.dataset.spinning; const lv2 = lastViews.get(openTable); if (lv2 && lv2.v.letter) el.textContent = lv2.v.letter; else el.textContent = '?'; }
  }, 90);
}
function isSendDraft(main, stop){
  const ans = {};
  main.querySelectorAll('input[data-cat]').forEach(i => { ans[i.dataset.cat] = i.value; });
  tableAct({ type: 'draft', answers: ans, stop: !!stop });
}
function buildIsMain(main, s, lv){
  const C = IsimSehirCore, v = lv.v, playing = lv.seat >= 0;
  main.innerHTML = '';
  if (v.phase === 'hazir'){
    const p = document.createElement('p'); p.className = 'is-big'; p.textContent = 'Hazır ol! Harf geliyor…'; main.append(p); return;
  }
  if (v.phase === 'yaz' || v.phase === 'kapanis'){
    if (!playing){ const p = document.createElement('p'); p.className = 'note'; p.textContent = 'İzliyorsun. Katılmak için masadan bir koltuğa otur; bir sonraki harfte sen de yazarsın.'; main.append(p); return; }
    const form = document.createElement('form'); form.className = 'is-form'; form.autocomplete = 'off';
    v.cats.forEach((c, i) => {
      const lab = document.createElement('label'); lab.className = 'is-field';
      lab.innerHTML = '<span class="ic"></span><span class="nm"></span><input type="text" maxlength="40" spellcheck="false" autocomplete="off"><span class="ok"></span>';
      lab.querySelector('.ic').textContent = C.CATS[c].icon;
      lab.querySelector('.nm').textContent = C.CATS[c].name;
      const inp = lab.querySelector('input'); inp.dataset.cat = c;
      inp.placeholder = (v.letter || '') + '…';
      if (v.myDraft && v.myDraft[c]) inp.value = v.myDraft[c];
      inp.oninput = () => {
        clearTimeout(isUI.draftT); isUI.draftT = setTimeout(() => isSendDraft(main), 350);
        isMark(lab, inp.value, v.letter);
        main.querySelector('.is-stop').disabled = ![...main.querySelectorAll('input[data-cat]')].every(x => x.value.trim());
      };
      inp.onkeydown = e => { if (e.key === 'Enter'){ e.preventDefault(); const all = [...main.querySelectorAll('input[data-cat]')]; const nx = all[i + 1]; if (nx) nx.focus(); else if (!main.querySelector('.is-stop').disabled) main.querySelector('.is-stop').click(); } };
      isMark(lab, inp.value, v.letter);
      form.append(lab);
    });
    const stop = document.createElement('button'); stop.type = 'button'; stop.className = 'btn primary is-stop'; stop.textContent = '🛑 Bitirdim!';
    stop.disabled = !v.cats.every(c => v.myDraft && v.myDraft[c]);
    stop.onclick = () => { clearTimeout(isUI.draftT); isSendDraft(main, true); gameSound('turn'); };
    form.onsubmit = e => e.preventDefault();
    main.append(form, stop);
    if (v.phase === 'yaz') setTimeout(() => { const f = form.querySelector('input'); if (f && !document.activeElement.closest('.is-form') && !matchMedia('(max-width:860px)').matches) f.focus(); }, 50);
    return;
  }
  // oylama / sonuç / bitti: cevap tablosu
  const wrap = document.createElement('div'); wrap.className = 'is-tablewrap';
  const tb = document.createElement('table'); tb.className = 'is-table';
  const hr = document.createElement('tr'); hr.innerHTML = '<th>Oyuncu</th>' + v.cats.map(c => '<th>' + C.CATS[c].icon + ' ' + C.CATS[c].name + '</th>').join('') + (v.phase !== 'oylama' ? '<th>Tur</th>' : '');
  const th = document.createElement('thead'); th.append(hr); tb.append(th);
  tb.append(document.createElement('tbody'));
  wrap.append(tb); main.append(wrap);
  const acts = document.createElement('div'); acts.className = 'is-acts';
  if (v.phase === 'oylama' && playing){
    const ok = document.createElement('button'); ok.className = 'btn primary is-ok'; ok.textContent = '✓ Tamam, devam';
    ok.onclick = () => { ok.disabled = true; tableAct({ type: 'tamam' }); };
    acts.append(ok);
  }
  if (s.owner === peer.id && (v.phase === 'oylama' || v.phase === 'sonuc')){
    const n = document.createElement('button'); n.className = 'btn'; n.textContent = v.phase === 'oylama' ? '⏭ Oylamayı bitir' : '⏭ Sonraki harf';
    n.onclick = () => tableAct({ type: 'devam' }); acts.append(n);
  }
  if (v.phase === 'bitti' && s.owner === peer.id){
    const n = document.createElement('button'); n.className = 'btn primary'; n.textContent = '🔁 Yeni oyun';
    n.onclick = () => tableAct({ type: 'newMatch' }); acts.append(n);
  }
  main.append(acts);
}
function isMark(lab, val, letter){
  const t = val.trim(), ok = lab.querySelector('.ok');
  const good = t && IsimSehirCore.startsOk(t, letter);
  lab.classList.toggle('good', !!good); lab.classList.toggle('bad', !!t && !good);
  ok.textContent = !t ? '' : good ? '✓' : '✗';
  ok.title = t && !good ? letter + ' harfiyle başlamalı' : '';
}
function updateIsMain(main, s, lv){
  const v = lv.v;
  if (v.phase === 'yaz' || v.phase === 'kapanis'){
    const st = main.querySelector('.is-stop');
    if (st && v.phase === 'kapanis'){ st.disabled = true; st.textContent = v.stopBy ? '⏳ ' + v.stopBy + ' bitirdi' : '⏳ Süre doldu'; }
    return;
  }
  const tbody = main.querySelector('.is-table tbody'); if (!tbody) return;
  tbody.innerHTML = '';
  v.table.forEach(row => {
    const tr = document.createElement('tr'); if (row.id === v.me) tr.className = 'me';
    const n = document.createElement('td'); n.className = 'pn'; n.textContent = row.name; tr.append(n);
    row.cells.forEach((c, i) => {
      const td = document.createElement('td');
      const bad = !c.t || !c.auto || c.rej;
      td.className = 'cell' + (bad ? ' bad' : ' good') + (c.mine ? ' mine' : '') + (c.same ? ' same' : '');
      td.innerHTML = '<span class="t"></span><span class="m"></span>';
      td.querySelector('.t').textContent = c.t || '—';
      const m = td.querySelector('.m');
      if (c.pts != null) m.textContent = c.pts ? '+' + c.pts : '0';
      else if (c.obj) m.textContent = '👎 ' + c.obj + '/' + v.others;
      if (c.pts != null) td.classList.add('p' + c.pts);
      if (v.phase === 'oylama' && lv.seat >= 0 && row.id !== v.me && c.t && c.auto){
        td.classList.add('can'); td.title = c.mine ? 'İtirazını geri al' : 'Bu cevaba itiraz et';
        td.onclick = () => tableAct({ type: 'itiraz', pid: row.id, cat: v.cats[i], on: !c.mine });
      } else if (c.t && !c.auto) td.title = 'Harfle başlamıyor';
      tr.append(td);
    });
    if (v.phase !== 'oylama'){ const t = document.createElement('td'); t.className = 'tot'; t.textContent = row.total != null ? '+' + row.total : ''; tr.append(t); }
    tbody.append(tr);
  });
  const ok = main.querySelector('.is-ok');
  if (ok){ const meP = v.players.find(p => p.id === v.me); if (meP && meP.ready){ ok.disabled = true; ok.textContent = '✓ Diğerleri bekleniyor'; } }
}
