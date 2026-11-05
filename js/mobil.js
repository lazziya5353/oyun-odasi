// Telefon düzeni: kanal sekmeleri, ortada büyük mikrofonlu alt çubuk, "Daha" menüsü,
// kişiye dokununca alttan açılan panel, sade giriş ekranı. Bilgisayar görünümüne dokunmaz (hepsi 860px altı CSS'te).
(() => {
  const mob = () => window.matchMedia('(max-width: 860px)').matches;
  const $$ = id => document.getElementById(id);

  // ---------- alttan açılan panel ----------
  const dim = document.createElement('div'); dim.className = 'mob-dim'; dim.hidden = true;
  const sheet = document.createElement('div'); sheet.className = 'mob-sheet'; sheet.hidden = true;
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
  document.body.append(dim, sheet);
  let onClose = null, nobet = 0;
  function sheetAc(fill, kapaninca){
    sheetKapat();
    sheet.innerHTML = '<div class="mob-grab" aria-hidden="true"></div>';
    fill(sheet);
    onClose = kapaninca || null;
    dim.hidden = false; sheet.hidden = false;
    requestAnimationFrame(() => { dim.classList.add('acik'); sheet.classList.add('acik'); });
  }
  function sheetKapat(){
    if (sheet.hidden) return;
    clearInterval(nobet);
    const f = onClose; onClose = null; if (f) f();
    dim.classList.remove('acik'); sheet.classList.remove('acik');
    dim.hidden = true; sheet.hidden = true; sheet.innerHTML = '';
  }
  dim.addEventListener('click', sheetKapat);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) sheetKapat(); });
  // aşağı kaydırınca kapanır
  let y0 = null;
  sheet.addEventListener('touchstart', e => { y0 = sheet.scrollTop <= 0 && !e.target.closest('input') ? e.touches[0].clientY : null; }, { passive: true });
  sheet.addEventListener('touchmove', e => { if (y0 != null && e.touches[0].clientY - y0 > 70){ y0 = null; sheetKapat(); } }, { passive: true });
  window.addEventListener('resize', () => { if (!mob()) sheetKapat(); });

  const ilkSimge = s => {
    s = (s || '').trim();
    if (window.Intl && Intl.Segmenter){ const it = new Intl.Segmenter('tr', { granularity: 'grapheme' }).segment(s)[Symbol.iterator]().next(); return it.done ? '' : it.value.segment; }
    return Array.from(s)[0] || '';
  };
  const gorunur = b => b && !b.hidden && !b.closest('[hidden]');

  // ---------- ⋯ Daha menüsü ----------
  const DAHA = [
    ['Odada', [
      ['shareBtn'], ['sakaBtn'], ['arkBtn', '👥', 'Arkadaşlar'], ['masaToggle'],
      ['_kanal', '🗂', 'Kanallar']
    ]],
    ['Ayarlar', [
      ['mixerBtn2', null, 'Ses ayarı'], ['temaBtn2'], ['radioOpenBtn'], ['notifBtn2'],
      ['profilBtn2'], ['micTestBtn', null, 'Mik. test'], ['leaveBtn', '🚪', 'Ayrıl', 'kirmizi']
    ]]
  ];
  function dahaAc(){
    sheetAc(s => {
      DAHA.forEach(([baslik, list]) => {
        const g = document.createElement('div'); g.className = 'mob-grid';
        list.forEach(([id, simge, ad, cls]) => {
          let hedef = null;
          if (id === '_kanal') hedef = null;
          else { hedef = $$(id); if (!hedef || hedef.hidden) return; }
          const b = document.createElement('button'); b.type = 'button'; b.className = 'mob-g' + (cls ? ' ' + cls : '');
          if (hedef && hedef.classList.contains('on') && id !== 'micTestBtn') b.classList.add('on');
          const lbl = hedef && hedef.querySelector('.lbl');
          const yazi = ad || (hedef && (hedef.dataset.k || (lbl && lbl.textContent))) || '';
          b.dataset.hedef = id;
          b.innerHTML = '<span></span><small></small>';
          b.firstChild.textContent = simge || ilkSimge(hedef ? hedef.textContent : '');
          b.lastChild.textContent = id === 'shareBtn' && lbl && /durdur/i.test(lbl.textContent) ? 'Durdur' : yazi;
          b.onclick = () => {
            sheetKapat();
            // belgeye düşen bu tıklama çekmeceyi hemen kapatmasın diye bir sonraki turda
            setTimeout(() => {
              if (id === '_kanal') $$('chanPanel').classList.add('open');
              else { const h = $$(id); if (h) h.click(); }
            }, 0);
          };
          g.append(b);
        });
        if (!g.children.length) return;
        const h = document.createElement('div'); h.className = 'mob-ttl'; h.textContent = baslik;
        s.append(h, g);
      });
    });
  }

  // ---------- kişiye dokununca ----------
  function kisiAc(card){
    const ctl = card.querySelector(':scope > .tile-ctl');
    if (!ctl) return;
    let p = null; peers.forEach(x => { if (x.card === card) p = x; });
    if (!p) return;
    sheetAc(s => {
      const bas = document.createElement('div'); bas.className = 'mob-kisi';
      const av = card.querySelector('.avatar');
      const a = av ? av.cloneNode(true) : document.createElement('div');
      a.className = 'avatar mob-av'; a.style.setProperty('--c', p.color || colorFor(p.id));
      const bil = document.createElement('div');
      const ad = document.createElement('b'); ad.textContent = p.name;
      const dr = document.createElement('small');
      const sn = card.querySelector('.sinyal');
      const durum = () => {
        const parca = [];
        parca.push(card.classList.contains('speaking') ? '🔊 konuşuyor' : p.muted ? '🔇 mikrofonu kapalı' : '🎙 mikrofonu açık');
        if (sn && !sn.hidden && sn.title) parca.push(sn.title.replace(/^Bağlantı:\s*/, 'bağlantı ').split(' · ')[0]);
        dr.textContent = parca.join(' · ');
      };
      durum();
      bil.append(ad, dr); bas.append(a, bil);
      s.append(bas, ctl);
      ctl.classList.add('mob-ctl');
      // Mesaja basınca panel kapanır, sohbet açılır
      ctl.querySelectorAll('.dm-btn').forEach(b => { if (/Mesaj/.test(b.textContent)) b.addEventListener('click', sheetKapat, { once: true }); });
      nobet = setInterval(() => { if (!card.isConnected || card.hidden) sheetKapat(); else durum(); }, 500);
    }, () => {
      ctl.classList.remove('mob-ctl');
      if (card.isConnected) card.append(ctl); else ctl.remove();
      if (typeof ensureKickControl === 'function' && p) ensureKickControl(p);
    });
  }
  document.addEventListener('click', e => {
    if (!mob()) return;
    const card = e.target.closest('#people .person');
    if (!card || card.id === 'selfCard' || e.target.closest('button, input, a, video, .tile-ctl')) return;
    kisiAc(card);
  });

  // ---------- kanal sekmeleri ----------
  const KISA = { genel: 'Sohbet', muzik: 'Müzik', film: 'Film', oyun: 'Oyun', ders: 'Toplantı' };
  const tabs = document.createElement('nav'); tabs.className = 'mob-tabs'; tabs.id = 'mobTabs'; tabs.setAttribute('aria-label', 'Kanallar');
  const top = document.querySelector('#room > header.top');
  if (top) top.after(tabs);
  function sekmeler(){
    if (typeof joined === 'undefined' || !joined || typeof channels === 'undefined') return;
    const sayi = {};
    channels.forEach(c => sayi[c.id] = 0);
    if (me && sayi[me.channel] != null) sayi[me.channel]++;
    peers.forEach(p => { if (p.helloed && p.linked && sayi[p.channel] != null) sayi[p.channel]++; });
    const imza = JSON.stringify([me.channel, channels.map(c => [c.id, c.icon, c.name]), sayi, !$$('addChanBtn').hidden]);
    if (tabs._imza === imza) return; tabs._imza = imza;
    tabs.innerHTML = '';
    let aktif = null;
    channels.forEach(c => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mob-tab' + (c.id === me.channel ? ' on' : '');
      b.dataset.kanal = c.id; b.title = c.name;
      b.textContent = c.icon + ' ' + (KISA[c.id] || c.name);
      if (sayi[c.id]){ const i = document.createElement('i'); i.textContent = sayi[c.id]; b.append(i); }
      b.onclick = () => switchChannel(c.id);
      tabs.append(b);
      if (c.id === me.channel) aktif = b;
    });
    if (!$$('addChanBtn').hidden){
      const p = document.createElement('button'); p.type = 'button'; p.className = 'mob-tab arti'; p.textContent = '＋'; p.title = 'Yeni ses kanalı';
      p.onclick = () => $$('addChanBtn').click(); tabs.append(p);
    }
    if (aktif && mob()) aktif.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  if (typeof renderChannels === 'function'){
    const eskiR = renderChannels;
    renderChannels = function(){ const r = eskiR.apply(this, arguments); try { sekmeler(); } catch(e){} return r; };
  }
  if (typeof updateCount === 'function'){
    const eskiU = updateCount;
    updateCount = function(){ const r = eskiU.apply(this, arguments); try { sekmeler(); } catch(e){} return r; };
  }

  // ---------- üst satır ve alt çubuk düğmeleri ----------
  const tema = document.createElement('button'); tema.type = 'button'; tema.id = 'mobTemaBtn';
  tema.className = 'btn icon-btn only-mobile mob-ust'; tema.textContent = '🎨'; tema.title = 'Görünüm'; tema.setAttribute('aria-label', 'Görünüm');
  tema.onclick = () => { const t = $$('temaBtn2'); if (t) t.click(); };
  const cb = $$('copyBtn'); if (cb && cb.parentNode) cb.parentNode.append(tema);

  const daha = document.createElement('button'); daha.type = 'button'; daha.id = 'dahaBtn';
  daha.className = 'btn only-mobile'; daha.dataset.k = 'Daha'; daha.setAttribute('aria-label', 'Daha fazla');
  daha.innerHTML = '⋯ <span class="lbl">Daha</span>';
  daha.onclick = dahaAc;
  const leave = $$('leaveBtn'); if (leave) leave.before(daha);

  // ---------- giriş ekranı: mikrofon testi ve bildirim katlanır ----------
  function katla(hedefId, simge, ad){
    const h = $$(hedefId); if (!h) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mob-acc'; b.id = 'acc-' + hedefId;
    b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<span></span><i aria-hidden="true">›</i>'; b.firstChild.textContent = simge + ' ' + ad;
    b.onclick = () => { const ac = !h.classList.contains('mob-acik'); h.classList.toggle('mob-acik', ac); b.setAttribute('aria-expanded', ac); };
    h.before(b);
  }
  katla('micPanel', '🎙', 'Mikrofon testi');
  katla('notifCard', '🔔', 'Bildirimler');

  window.MOBIL = { sheetAc, sheetKapat, dahaAc, kisiAc, sekmeler };
})();
