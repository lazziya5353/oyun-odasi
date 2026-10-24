// İsim-Şehir: masa sahibinin bilgisayarı harf zarını atar (bir oyunda aynı harf iki kez gelmez), herkes kategorileri o harfle doldurur.
// İlk bitiren "Bitirdim!" der, diğerlerine 5 saniye kalır. Sonra cevaplar herkese açılır ve SIKI denetlenir:
//  • harf: cevap tam o harfle başlamalı (Ç yerine C, Ş yerine S kabul edilmez; sözlükte varsa doğru yazımına bakılır)
//  • sözlük: her kategorinin listesinde (isimsehir-sozluk.js) olan cevap geçerlidir; diğer oyuncuların çoğunluğu itiraz ederse sayılmaz
//  • sözlükte olmayan cevap ancak diğer oyuncuların çoğunluğu "kabul" derse sayılır ve yarım puan alır
//  • aynı kelimeyi birden çok kategoriye yazan o kelimeden hiç puan alamaz; anlamsız harf yığınları otomatik geçersiz
// Puan: kategoride geçerli cevabı olan TEK kişi 20, kimseyle aynı olmayan 10, başkasıyla aynı 5; onaylı (sözlük dışı) cevap bunun yarısı.
const IsimSehirCore = (() => {
  const LETTERS = 'ABCÇDEFGHIİKLMNOÖPRSŞTUÜVYZ'.split('');
  const CATS = {
    isim: { name: 'İsim', icon: '👤' }, sehir: { name: 'Şehir', icon: '🏙️' }, hayvan: { name: 'Hayvan', icon: '🐾' },
    bitki: { name: 'Bitki', icon: '🌿' }, esya: { name: 'Eşya', icon: '🧸' }, ulke: { name: 'Ülke', icon: '🌍' },
    meslek: { name: 'Meslek', icon: '👷' }, yemek: { name: 'Yemek', icon: '🍲' }
  };
  const SETS = { klasik: ['isim', 'sehir', 'hayvan', 'bitki', 'esya'], genis: ['isim', 'sehir', 'hayvan', 'bitki', 'esya', 'ulke', 'meslek', 'yemek'] };
  const lower = t => String(t || '').toLocaleLowerCase('tr-TR');
  const upper = t => String(t || '').toLocaleUpperCase('tr-TR');
  // karşılaştırma için: küçük harf, Türkçe harfler ve aksanlar sadeleşir, harf dışı her şey atılır
  const fold = t => lower(t).replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const clean = t => String(t || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  const ilkHarf = t => { const m = clean(t).match(/[A-Za-zÇĞİIÖŞÜçğıiöşüÂÎÛâîû]/); return m ? upper(m[0]).replace('Â', 'A').replace('Î', 'İ').replace('Û', 'U') : ''; };
  // sözlük: kategori → (sadeleşmiş → doğru yazım)
  const SOZ = {};
  function sozluk(cat){
    if (SOZ[cat]) return SOZ[cat];
    const m = new Map(), src = (typeof ISIMSEHIR_SOZLUK !== 'undefined' && ISIMSEHIR_SOZLUK[cat]) || '';
    src.split('|').forEach(w => { if (w){ const f = fold(w); if (!m.has(f)) m.set(f, w); } });
    return (SOZ[cat] = m);
  }
  // anlamsız yazı: sesli harf yok, 4 sessiz üst üste ya da aynı harf 3 kez yan yana
  const anlamsiz = t => { const f = fold(t); return !/[aeiou]/.test(f) || /[^aeiou0-9]{4}/.test(f) || /(.)\1\1/.test(f) || /[0-9]/.test(f); };
  // tek cevabın otomatik denetimi → { durum, kanon }
  //  durum: 'bos' | 'harf' | 'kisa' | 'anlamsiz' | 'sozluk' (listede var) | 'bilinmiyor' (listede yok, oyla karar)
  function denetle(cat, text, letter){
    const t = clean(text);
    if (!t) return { durum: 'bos' };
    const f = fold(t);
    if (f.length < 2) return { durum: 'kisa' };
    const k = sozluk(cat).get(f);
    if (k) return ilkHarf(k) === letter ? { durum: 'sozluk', kanon: k } : { durum: 'harf', kanon: k };
    if (ilkHarf(t) !== letter) return { durum: 'harf' };
    if (anlamsiz(t)) return { durum: 'anlamsiz' };
    return { durum: 'bilinmiyor' };
  }
  // yazarken gösterilen basit ipucu (sözlüğü ele vermez): harf tutuyor mu
  const harfTutar = (t, letter) => { const c = clean(t); if (!c) return null; const k = sozluk('isim').get(fold(c)); return ilkHarf(c) === letter || (fold(c)[0] === fold(letter)[0] && !!k && ilkHarf(k) === letter); };
  // bir oyunda aynı harf iki kez gelmez
  function pickLetter(used, rng){
    const pool = LETTERS.filter(l => !used.includes(l));
    const src = pool.length ? pool : LETTERS;
    return src[Math.floor((rng || Math.random)() * src.length)];
  }
  const cogunluk = (n, digerleri) => n * 2 > Math.max(1, digerleri);
  // aynı oyuncunun birden çok kategoride yazdığı kelimeler (sadeleşmiş)
  function tekrarlar(ans, cats){
    const say = {};
    cats.forEach(c => { const f = fold(ans && ans[c]); if (f) say[f] = (say[f] || 0) + 1; });
    return new Set(Object.keys(say).filter(f => say[f] > 1));
  }
  // hücrenin son hali (oylar dahil). oy: { itiraz: [ids], kabul: [ids] }
  function hucre(cat, text, letter, tekrar, oy, digerleri){
    const t = clean(text), d = denetle(cat, t, letter);
    const it = (oy && oy.itiraz) || [], ka = (oy && oy.kabul) || [];
    let ok = false, yarim = false, neden = '';
    if (d.durum === 'sozluk' || d.durum === 'bilinmiyor'){
      if (tekrar.has(fold(t))) neden = 'tekrar';
      else if (d.durum === 'sozluk'){ ok = !cogunluk(it.length, digerleri); neden = ok ? '' : 'itiraz'; }
      else { ok = cogunluk(ka.length, digerleri); yarim = ok; neden = ok ? '' : 'onaysiz'; }
    } else neden = d.durum;
    return { t, durum: d.durum, kanon: d.kanon || '', ok, yarim, neden, itiraz: it.length, kabul: ka.length };
  }
  // bir turun puanları. answers: { pid: { cat: text } }, oylar: { 'pid|cat': { itiraz, kabul } }
  function scoreRound(players, cats, letter, answers, oylar){
    const res = {}, digerleri = Math.max(1, players.length - 1);
    players.forEach(p => { res[p] = { total: 0, cells: {} }; });
    const tek = {}; players.forEach(p => { tek[p] = tekrarlar(answers[p], cats); });
    cats.forEach(cat => {
      const valid = [];
      players.forEach(p => {
        const h = hucre(cat, answers[p] && answers[p][cat], letter, tek[p], oylar[p + '|' + cat], digerleri);
        h.pts = 0; res[p].cells[cat] = h;
        if (h.ok) valid.push(p);
      });
      const counts = {};
      valid.forEach(p => { const k = fold(res[p].cells[cat].t); counts[k] = (counts[k] || 0) + 1; });
      valid.forEach(p => {
        const c = res[p].cells[cat];
        let pts = valid.length === 1 ? 20 : counts[fold(c.t)] > 1 ? 5 : 10;
        if (valid.length > 1 && counts[fold(c.t)] > 1) c.same = true;
        if (c.yarim) pts = Math.ceil(pts / 2);
        c.pts = pts; res[p].total += pts;
      });
    });
    return res;
  }
  const NEDEN = { bos: 'boş', harf: 'harf tutmuyor', kisa: 'çok kısa', anlamsiz: 'anlamsız', tekrar: 'başka kategoride de yazılmış', itiraz: 'itirazla düştü', onaysiz: 'sözlükte yok, onay almadı' };
  return { LETTERS, CATS, SETS, fold, clean, ilkHarf, denetle, hucre, tekrarlar, harfTutar, pickLetter, scoreRound, sozluk, cogunluk, NEDEN };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IsimSehirCore;

if (typeof registerTableGame === 'function') (function(){
  const C = IsimSehirCore;
  const T_READY = 4200, T_GRACE = 5000, T_VOTE = 45000, T_RESULT = 10000;
  const seated = o => o.sum.seats.filter(x => x && !x.bot);
  const nameOf = (st, id) => st.names[id] || 'Oyuncu';

  function newRound(o){
    const st = o.state;
    st.round++;
    st.letter = C.pickLetter(st.used); st.used.push(st.letter);
    st.phase = 'hazir'; st.endsAt = Date.now() + T_READY;
    st.drafts = {}; st.stopBy = null; st.oylar = {}; st.ready = []; st.result = null;
    st.players = seated(o).map(x => x.id);
    seated(o).forEach(x => { st.names[x.id] = x.name; if (st.scores[x.id] == null) st.scores[x.id] = 0; });
    st.seq++;
  }
  function startVote(o){
    const st = o.state;
    st.players = st.players.filter(id => st.drafts[id] || o.sum.seats.some(x => x && x.id === id));
    st.phase = 'oylama'; st.endsAt = Date.now() + T_VOTE; st.ready = []; st.seq++;
  }
  function finishRound(o){
    const st = o.state;
    st.result = C.scoreRound(st.players, st.cats, st.letter, st.drafts, st.oylar);
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
    cleanOpts: o => ({ rounds: [3, 5, 10, 15, 20].includes(+o.rounds) ? +o.rounds : 10, sure: [60, 90, 120].includes(+o.sure) ? +o.sure : 90, set: o.set === 'genis' ? 'genis' : 'klasik' }),
    variantName: s => s.opts.rounds + ' tur · ' + s.opts.sure + ' sn · ' + (s.opts.set === 'genis' ? '8 kategori' : '5 kategori'),
    seatLabel: () => 'Oyuncu',
    waitText: (s, own) => own ? 'En az 2 kişi oturunca “Oyunu başlat”a bas. Oyun sırasında gelenler de oturup katılabilir.' : 'Bir koltuğa otur; masa sahibi başlatınca oyun burada açılır.',
    makeCard: {
      desc: '2-8 kişi. Harf zarı atılır, isim, şehir, hayvan, bitki, eşya… Cevaplar sözlükle sıkı denetlenir, ilk bitiren “Dur!” der.',
      opts: '<label>Tur<select data-o="rounds"><option value="3">3 tur</option><option value="5">5 tur</option><option value="10" selected>10 tur</option><option value="15">15 tur</option><option value="20">20 tur</option></select></label>' +
        '<label>Süre<select data-o="sure"><option value="60">60 sn</option><option value="90" selected>90 sn</option><option value="120">120 sn</option></select></label>' +
        '<label>Kategoriler<select data-o="set"><option value="klasik">Klasik: İsim, Şehir, Hayvan, Bitki, Eşya</option><option value="genis">Geniş: + Ülke, Meslek, Yemek</option></select></label>',
      read: c => ({ rounds: c.querySelector('[data-o=rounds]').value, sure: c.querySelector('[data-o=sure]').value, set: c.querySelector('[data-o=set]').value })
    },
    start(o){
      o.state = { phase: 'hazir', round: 0, rounds: o.sum.opts.rounds, sure: o.sum.opts.sure, cats: C.SETS[o.sum.opts.set], used: [], scores: {}, names: {}, seq: 0, oylar: {} };
      newRound(o);
      return o.state;
    },
    onSeat(o){ sendViews(o); },
    onLeave(o){ sendViews(o); },
    // en çok puanı alan(lar) kazanır
    kazanan(o){
      const st = o.state; if (!st || st.phase !== 'bitti') return null;
      const ids = Object.keys(st.scores); if (!ids.length) return null;
      const en = Math.max(...ids.map(id => st.scores[id]));
      return ids.filter(id => st.scores[id] === en);
    },
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
      // oy: sözlükteki cevaba itiraz, sözlükte olmayana kabul (kendi cevabına oy verilmez)
      if (a.type === 'oy' && st.phase === 'oylama' && typeof a.pid === 'string' && st.cats.includes(a.cat) && a.pid !== who && st.players.includes(who) && st.players.includes(a.pid) && (a.tur === 'itiraz' || a.tur === 'kabul')){
        const k = a.pid + '|' + a.cat, oy = st.oylar[k] || (st.oylar[k] = { itiraz: [], kabul: [] });
        const l = oy[a.tur], i = l.indexOf(who);
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
        stopBy: st.stopBy ? nameOf(st, st.stopBy) : null, used: st.phase === 'hazir' ? st.used.slice(0, -1) : st.used.slice() };
      const ids = [...new Set([...st.players, ...Object.keys(st.scores)])];
      v.players = ids.map(id => ({ id, name: nameOf(st, id), score: st.scores[id] || 0, here: o.sum.seats.some(x => x && x.id === id),
        filled: st.drafts[id] ? st.cats.filter(c => st.drafts[id][c]).length : 0, ready: st.ready.includes(id), inRound: st.players.includes(id) }));
      if (me_ && st.drafts[me_]) v.myDraft = st.drafts[me_];
      if (st.phase === 'oylama' || st.phase === 'sonuc' || st.phase === 'bitti'){
        const dig = Math.max(1, st.players.length - 1);
        v.table = st.players.map(id => {
          const tek = C.tekrarlar(st.drafts[id], st.cats);
          return { id, name: nameOf(st, id), cells: st.cats.map(c => {
            const oy = st.oylar[id + '|' + c] || { itiraz: [], kabul: [] };
            const r = st.result && st.result[id] && st.result[id].cells[c];
            const h = r || C.hucre(c, st.drafts[id] && st.drafts[id][c], st.letter, tek, oy, dig);
            return { t: h.t, durum: h.durum, kanon: h.kanon, ok: h.ok, yarim: h.yarim, neden: h.neden, itiraz: oy.itiraz.length, kabul: oy.kabul.length,
              benIt: !!(me_ && oy.itiraz.includes(me_)), benKa: !!(me_ && oy.kabul.includes(me_)), pts: r ? r.pts : null, same: r ? !!r.same : false };
          }), total: st.result && st.result[id] ? st.result[id].total : null };
        });
        v.others = dig;
      }
      return v;
    },
    render: (body, s, lv) => renderIsimSehir(body, s, lv),
    isMyTurn: (v, seat) => seat >= 0 && v.phase === 'yaz',
    turnKey: v => 'r' + v.round
  });
})();

// ---------- arayüz ----------
const isUI = { key: '', deadline: 0, timer: null, draftT: null, phase: '' };
function isDeadline(v){ return Date.now() + (v.endsIn || 0); }
// harf zarı: 6 yüzlü küp, yüzlerinde alfabeden harfler; atılırken döner, durunca çekilen harf öne gelir
function isZar(){
  const z = document.createElement('div'); z.className = 'is-zar';
  z.innerHTML = '<div class="is-kup">' + [1, 2, 3, 4, 5, 6].map(n => '<b class="y y' + n + '"></b>').join('') + '</div>';
  return z;
}
function isZarYuzler(z, harf, kullanilan){
  const L = IsimSehirCore.LETTERS.filter(l => l !== harf && !(kullanilan || []).includes(l));
  const rast = () => (L.length ? L : IsimSehirCore.LETTERS)[Math.floor(Math.random() * (L.length || 27))];
  z.querySelectorAll('.y').forEach((y, i) => { y.textContent = i === 0 && harf ? harf : rast(); });
}
function isZarAt(z, kullanilan){
  // atılırken yüzlerdeki harfler sürekli değişir
  z.classList.remove('dur'); z.classList.add('atiliyor');
  isZarYuzler(z, '', kullanilan);
  clearInterval(z._t);
  if (!reducedMotion()) z._t = setInterval(() => { if (!z.isConnected){ clearInterval(z._t); return; } isZarYuzler(z, '', kullanilan); }, 140);
}
function isZarDur(z, harf, kullanilan, anim){
  clearInterval(z._t);
  isZarYuzler(z, harf, kullanilan);
  z.classList.remove('atiliyor');
  if (anim && !reducedMotion()){ z.classList.remove('dur'); void z.offsetWidth; z.classList.add('dur'); }
}
function renderIsimSehir(body, s, lv){
  const v = lv.v, playing = lv.seat >= 0;
  let root = body.querySelector('.is');
  const key = v.phase + ':' + v.round + ':' + (playing ? 'p' : 'w') + ':' + v.cats.length;
  const prevPhase = isUI.phase; isUI.phase = v.phase + ':' + v.round;
  if (!root || isUI.key !== key){
    // aynı turda ekran yenilenirken yazılanlar kaybolmasın (ör. biri "Bitirdim" dedi)
    const prev = {}, sameRound = root && isUI.key.split(':')[1] === String(v.round);
    if (sameRound) root.querySelectorAll('input[data-cat]').forEach(i => { prev[i.dataset.cat] = i.value; });
    const focusCat = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.cat : null;
    isUI.key = key;
    body.innerHTML = '';
    root = document.createElement('div'); root.className = 'is is-' + v.phase;
    root.innerHTML = '<div class="is-top"><div class="is-zaryer"></div><div class="is-info"><b class="is-title"></b><span class="note is-sub"></span><div class="is-bar"><i></i></div><div class="is-used"></div></div><div class="is-time"></div></div>' +
      '<div class="is-main"></div><div class="is-side"><h4>Puanlar</h4><ol class="is-scores"></ol></div>';
    body.append(root);
    const z = isZar(); root.querySelector('.is-zaryer').append(z);
    if (v.phase === 'hazir'){ gameSound('dice'); isZarAt(z, v.used); }
    else isZarDur(z, v.letter, v.used, prevPhase === 'hazir:' + v.round);
    if (v.phase === 'yaz' && prevPhase === 'hazir:' + v.round) gameSound('turn');
    buildIsMain(root.querySelector('.is-main'), s, lv);
    if (Object.keys(prev).length){
      root.querySelectorAll('input[data-cat]').forEach(i => { if (prev[i.dataset.cat] != null){ i.value = prev[i.dataset.cat]; i.dispatchEvent(new Event('input')); } });
      if (playing && (v.phase === 'yaz' || v.phase === 'kapanis')){ clearTimeout(isUI.draftT); isSendDraft(root.querySelector('.is-main')); }
      const f = focusCat && root.querySelector('input[data-cat="' + focusCat + '"]'); if (f) f.focus();
    }
    if (v.phase === 'bitti') setTimeout(() => confetti(root), 300);
  }
  isUI.deadline = isDeadline(v); isUI.total = v.phase === 'yaz' ? v.sure * 1000 : v.phase === 'kapanis' ? 5000 : v.phase === 'oylama' ? 45000 : v.phase === 'sonuc' ? 10000 : 4200;
  root.querySelector('.is-title').textContent = { hazir: '🎲 Harf zarı atılıyor…', yaz: 'Harf: ' + (v.letter || '') + ' · yaz bakalım!', kapanis: v.stopBy ? '🛑 ' + v.stopBy + ' bitirdi! Son saniyeler…' : '⏰ Süre doldu!', oylama: 'Cevapları denetle', sonuc: 'Tur sonucu', bitti: '🏆 Oyun bitti' }[v.phase];
  root.querySelector('.is-sub').textContent = 'Tur ' + v.round + '/' + v.rounds + (v.phase === 'oylama' ? ' · sözlükteki cevaba 👎 itiraz, sözlükte olmayana 👍 kabul; çoğunluk karar verir' : v.phase === 'yaz' ? ' · hepsini doldurunca “Bitirdim!”' : '');
  const used = root.querySelector('.is-used');
  const gecen = (v.used || []).filter(l => l !== v.letter || v.phase === 'hazir');
  used.textContent = gecen.length ? 'Çıkan harfler: ' + gecen.join(' ') : '';
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
function isSendDraft(main, stop){
  const ans = {};
  main.querySelectorAll('input[data-cat]').forEach(i => { ans[i.dataset.cat] = i.value; });
  tableAct({ type: 'draft', answers: ans, stop: !!stop });
}
function isTekrarIsaretle(main, letter){
  const say = {};
  const ins = [...main.querySelectorAll('input[data-cat]')];
  ins.forEach(i => { const f = IsimSehirCore.fold(i.value); if (f) say[f] = (say[f] || 0) + 1; });
  ins.forEach(i => isMark(i.closest('.is-field'), i.value, letter, say[IsimSehirCore.fold(i.value)] > 1));
}
function buildIsMain(main, s, lv){
  const C = IsimSehirCore, v = lv.v, playing = lv.seat >= 0;
  main.innerHTML = '';
  if (v.phase === 'hazir'){
    const p = document.createElement('p'); p.className = 'is-big'; p.textContent = 'Hazır ol! Harf zarı dönüyor…'; main.append(p); return;
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
        isTekrarIsaretle(main, v.letter);
        main.querySelector('.is-stop').disabled = ![...main.querySelectorAll('input[data-cat]')].every(x => x.value.trim());
      };
      inp.onkeydown = e => { if (e.key === 'Enter'){ e.preventDefault(); const all = [...main.querySelectorAll('input[data-cat]')]; const nx = all[i + 1]; if (nx) nx.focus(); else if (!main.querySelector('.is-stop').disabled) main.querySelector('.is-stop').click(); } };
      form.append(lab);
    });
    const stop = document.createElement('button'); stop.type = 'button'; stop.className = 'btn primary is-stop'; stop.textContent = '🛑 Bitirdim!';
    stop.disabled = !v.cats.every(c => v.myDraft && v.myDraft[c]);
    stop.onclick = () => { clearTimeout(isUI.draftT); isSendDraft(main, true); gameSound('turn'); };
    form.onsubmit = e => e.preventDefault();
    const not = document.createElement('p'); not.className = 'note is-kural';
    not.textContent = 'Cevaplar sözlükle denetlenir. Tam “' + (v.letter || '') + '” harfiyle başlamalı; aynı kelimeyi iki kategoriye yazarsan ikisi de sayılmaz. Sözlükte olmayan cevap ancak diğerleri onaylarsa yarım puan alır.';
    main.append(not, form, stop);
    isTekrarIsaretle(main, v.letter);
    if (v.phase === 'yaz') setTimeout(() => { const f = form.querySelector('input'); if (f && !document.activeElement.closest('.is-form') && !matchMedia('(max-width:860px)').matches) f.focus(); }, 50);
    return;
  }
  // oylama / sonuç / bitti: cevap tablosu
  const wrap = document.createElement('div'); wrap.className = 'is-tablewrap';
  const tb = document.createElement('table'); tb.className = 'is-table';
  const hr = document.createElement('tr'); hr.innerHTML = '<th>Oyuncu</th>' + v.cats.map(c => '<th>' + C.CATS[c].icon + ' ' + C.CATS[c].name + '</th>').join('') + (v.phase !== 'oylama' ? '<th>Tur</th>' : '');
  const th = document.createElement('thead'); th.append(hr); tb.append(th);
  tb.append(document.createElement('tbody'));
  wrap.append(tb);
  const lej = document.createElement('div'); lej.className = 'is-lejant';
  lej.innerHTML = '<span><i class="k ok"></i>sözlükte var</span><span><i class="k soru"></i>sözlükte yok: onay gerekir (yarım puan)</span><span><i class="k no"></i>geçersiz</span>';
  main.append(lej, wrap);
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
function isMark(lab, val, letter, tekrar){
  const t = val.trim(), ok = lab.querySelector('.ok');
  const harf = t ? IsimSehirCore.ilkHarf(t) === letter : null;
  const bad = !!t && (!harf || tekrar);
  lab.classList.toggle('good', !!t && !bad); lab.classList.toggle('bad', bad);
  ok.textContent = !t ? '' : tekrar ? '⚠ tekrar' : harf ? '✓' : '✗';
  ok.title = !t ? '' : tekrar ? 'Aynı kelimeyi başka kategoriye de yazdın: ikisi de sayılmaz' : !harf ? letter + ' harfiyle başlamalı' : 'Harf tutuyor (sözlük denetimi tur sonunda)';
}
function updateIsMain(main, s, lv){
  const v = lv.v, C = IsimSehirCore;
  if (v.phase === 'yaz' || v.phase === 'kapanis'){
    const st = main.querySelector('.is-stop');
    if (st && v.phase === 'kapanis'){ st.disabled = true; st.textContent = v.stopBy ? '⏳ ' + v.stopBy + ' bitirdi' : '⏳ Süre doldu'; }
    return;
  }
  const tbody = main.querySelector('.is-table tbody'); if (!tbody) return;
  tbody.innerHTML = '';
  const oylama = v.phase === 'oylama';
  v.table.forEach(row => {
    const tr = document.createElement('tr'); if (row.id === v.me) tr.className = 'me';
    const n = document.createElement('td'); n.className = 'pn'; n.textContent = row.name; tr.append(n);
    row.cells.forEach((c, i) => {
      const td = document.createElement('td');
      const sozde = c.durum === 'sozluk', bilinmez = c.durum === 'bilinmiyor';
      const otomatikRed = !sozde && !bilinmez;
      td.className = 'cell ' + (c.ok ? 'good' : otomatikRed || c.neden === 'tekrar' || !oylama ? 'bad' : 'wait') + (bilinmez ? ' soru' : '') + (c.same ? ' same' : '');
      td.innerHTML = '<span class="t"></span><span class="m"></span><span class="oy"></span>';
      td.querySelector('.t').textContent = (c.t || '—') + (c.kanon && C.fold(c.kanon) === C.fold(c.t) && c.kanon !== c.t ? ' (' + c.kanon + ')' : '');
      const m = td.querySelector('.m');
      if (c.pts != null) m.textContent = (c.pts ? '+' + c.pts : '0') + (c.ok ? (c.yarim ? ' · onaylı, yarım' : '') : c.neden ? ' · ' + (C.NEDEN[c.neden] || c.neden) : '');
      else if (otomatikRed || c.neden === 'tekrar') m.textContent = '✗ ' + (C.NEDEN[c.neden] || '');
      else if (sozde) m.textContent = c.itiraz ? '👎 ' + c.itiraz + '/' + v.others + ' itiraz' : '✓ sözlükte';
      else m.textContent = '👍 ' + c.kabul + '/' + v.others + ' kabul gerekli: ' + (Math.floor(v.others / 2) + 1);
      if (c.pts != null) td.classList.add('p' + c.pts);
      // oy düğmesi: başkasının cevabına
      if (oylama && lv.seat >= 0 && row.id !== v.me && c.t && c.neden !== 'tekrar' && (sozde || bilinmez)){
        const b = document.createElement('button'); b.type = 'button';
        if (sozde){ b.className = 'is-oy it' + (c.benIt ? ' on' : ''); b.textContent = c.benIt ? '👎 İtirazı geri al' : '👎 İtiraz'; b.onclick = () => tableAct({ type: 'oy', tur: 'itiraz', pid: row.id, cat: v.cats[i], on: !c.benIt }); }
        else { b.className = 'is-oy ka' + (c.benKa ? ' on' : ''); b.textContent = c.benKa ? '👍 Kabulü geri al' : '👍 Kabul'; b.onclick = () => tableAct({ type: 'oy', tur: 'kabul', pid: row.id, cat: v.cats[i], on: !c.benKa }); }
        td.querySelector('.oy').append(b);
      }
      tr.append(td);
    });
    if (!oylama){ const t = document.createElement('td'); t.className = 'tot'; t.textContent = row.total != null ? '+' + row.total : ''; tr.append(t); }
    tbody.append(tr);
  });
  const ok = main.querySelector('.is-ok');
  if (ok){ const meP = v.players.find(p => p.id === v.me); if (meP && meP.ready){ ok.disabled = true; ok.textContent = '✓ Diğerleri bekleniyor'; } }
}
