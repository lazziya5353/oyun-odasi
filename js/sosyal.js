// Arkadaşlar (sadece üyeler): kullanıcı adıyla ya da odadayken kişinin kartından arkadaşlık isteği,
// gelen istekleri kabul / ret, arkadaşın çevrimiçi / odada durumu, açtığın odaya arkadaşlarını davet etme.
// Davet, arkadaşın telefonuna/bilgisayarına bildirim olarak gider; site açıksa girişte "📨 Davet" kutusu çıkar.
const ARK = (() => {
  const $$ = id => document.getElementById(id);
  const uye = () => typeof account !== 'undefined' && account && account.uye;
  const kk = s => String(s || '').toLocaleLowerCase('tr-TR');
  let veri = { arkadaslar: [], gelen: [], giden: [] }, yuklendi = 0, istekSayisi = 0, davetler = [];
  const arkadasMi = kadi => veri.arkadaslar.some(x => kk(x.kadi) === kk(kadi));
  const gidenMi = kadi => veri.giden.some(x => kk(x.kadi) === kk(kadi));

  // ---------- pencere ----------
  const dlg = document.createElement('dialog'); dlg.id = 'arkDlg'; dlg.className = 'ark-dlg';
  dlg.innerHTML = '<div class="dlg-head"><h3>👥 Arkadaşlar</h3><button class="btn small" type="button" data-close>Kapat</button></div>' +
    '<div class="dlg-body"><form class="ark-ekle" autocomplete="off"><input type="text" maxlength="20" placeholder="Kullanıcı adı (örn. kaan)" autocapitalize="off" spellcheck="false" aria-label="Arkadaşının kullanıcı adı"><button class="btn primary" type="submit">➕ Ekle</button></form>' +
    '<p class="uye-msg ark-msg" aria-live="polite"></p><div class="ark-icerik"></div></div>';
  document.body.append(dlg);
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  const msg = (t, ok) => { const m = dlg.querySelector('.ark-msg'); m.textContent = t || ''; m.className = 'uye-msg ark-msg ' + (t ? (ok ? 'ok' : 'err') : ''); };
  dlg.querySelector('.ark-ekle').onsubmit = async e => {
    e.preventDefault();
    const inp = dlg.querySelector('.ark-ekle input'), kadi = inp.value.trim().replace(/^@/, '');
    if (kadi.length < 3){ msg('Arkadaşınızın kullanıcı adını yazabilirsiniz.'); inp.focus(); return; }
    const d = await ekle(kadi, true);
    if (d) inp.value = '';
  };

  async function yukle(){
    if (!uye()) return veri;
    try { veri = await uyeApi('arkadaslar'); yuklendi = Date.now(); istekSayisi = veri.gelen.length; rozetSay(); kartlariGuncelle(); } catch(e){}
    return veri;
  }
  const DURUM = { gonderildi: '📨 İstek gönderildi. Kabul edince arkadaş olacaksınız.', bekliyor: 'İsteğin zaten gönderildi, cevabını bekliyorsun.', arkadas: '🤝 Artık arkadaşsınız!', zaten: 'Zaten arkadaşsınız.', reddedildi: 'İstek reddedildi.', silindi: 'Arkadaşlıktan çıkarıldı.' };
  async function ekle(kadi, pencere){
    try {
      const d = await uyeApi('arkadas-ekle', { kadi });
      const t = DURUM[d.durum] || 'Tamam';
      if (pencere) msg(t, true); else toast(t);
      await yukle(); if (dlg.open) ciz();
      return d;
    } catch(e){ if (pencere) msg(e.message); else toast(e.message); return null; }
  }
  async function cevap(kadi, kabul){
    try { const d = await uyeApi('arkadas-cevap', { kadi, kabul }); msg(DURUM[d.durum] || '', true); } catch(e){ msg(e.message); }
    await yukle(); ciz();
  }
  async function sil(kadi, ad){
    if (!confirm(ad + ' arkadaşlıktan çıkarılsın mı?')) return;
    try { await uyeApi('arkadas-sil', { kadi }); msg(DURUM.silindi, true); } catch(e){ msg(e.message); }
    await yukle(); ciz();
  }
  async function davetEt(list, btn){
    if (typeof joined === 'undefined' || !joined) return;
    if (btn) btn.disabled = true;
    try {
      const d = await uyeApi('davet', { kadiler: list, kod: roomCode });
      if (btn){ btn.textContent = '✓ Davet edildi'; btn.classList.add('on'); }
      toast(d.gonderilen ? '📨 ' + (d.gonderilen > 1 ? d.gonderilen + ' arkadaşına' : 'Arkadaşına') + ' davet gitti' : 'Davet gönderilemedi');
    } catch(e){ toast(e.message); if (btn) btn.disabled = false; }
  }

  function satir(x, tur){
    const r = document.createElement('div'); r.className = 'ark-satir';
    const av = document.createElement('span'); av.className = 'acct-av ark-av'; if (typeof paintAvatar === 'function') paintAvatar(av, x.name, x.foto);
    const bil = document.createElement('div'); bil.className = 'ark-bilgi';
    const ad = document.createElement('b'); ad.textContent = x.name;
    const alt = document.createElement('small');
    const durum = tur === 'arkadas' ? (x.odada ? '🟢 Odada' : x.cevrimici ? '🟢 Sitede' : '⚪ Çevrimdışı') : tur === 'gelen' ? 'seni eklemek istiyor' : 'cevap bekleniyor';
    alt.textContent = '@' + x.kadi + ' · Lv ' + (x.lv || 1) + ' · ' + durum;
    bil.append(ad, alt);
    if (tur === 'arkadas') r.classList.toggle('cevrimici', !!x.cevrimici);
    const ac = document.createElement('div'); ac.className = 'ark-ac';
    const b = (t, cls, fn) => { const x2 = document.createElement('button'); x2.type = 'button'; x2.className = 'btn small ' + (cls || ''); x2.textContent = t; x2.onclick = fn; ac.append(x2); return x2; };
    if (tur === 'gelen'){ b('✓ Kabul', 'primary', () => cevap(x.kadi, true)); b('✕', '', () => cevap(x.kadi, false)).title = 'Reddet'; }
    else if (tur === 'giden') b('İptal', '', () => sil(x.kadi, x.name));
    else {
      if (typeof joined !== 'undefined' && joined){ const d = b('📨 Davet et', 'primary', e => davetEt([x.kadi], e.currentTarget)); d.title = 'Bu odaya çağır (bildirim gider)'; }
      b('⋯', 'ark-sil', () => sil(x.kadi, x.name)).title = 'Arkadaşlıktan çıkar';
    }
    r.append(av, bil, ac);
    return r;
  }
  function bolum(baslik, list, tur, bos){
    const s = document.createElement('section'); s.className = 'ark-bolum ark-' + tur;
    const h = document.createElement('h4'); h.textContent = baslik + (list.length ? ' (' + list.length + ')' : ''); s.append(h);
    if (!list.length){ if (!bos) return null; const p = document.createElement('p'); p.className = 'note'; p.textContent = bos; s.append(p); }
    list.forEach(x => s.append(satir(x, tur)));
    return s;
  }
  function ciz(){
    const ic = dlg.querySelector('.ark-icerik'); ic.innerHTML = '';
    if (!uye()){
      ic.innerHTML = '<p class="note">Arkadaş eklemek için üye girişi yapmalısın.</p>';
      const g = document.createElement('button'); g.className = 'btn primary'; g.textContent = 'Giriş yap'; g.onclick = () => { dlg.close(); openUyeDlg('giris'); }; ic.append(g);
      dlg.querySelector('.ark-ekle').hidden = true; return;
    }
    dlg.querySelector('.ark-ekle').hidden = false;
    if (typeof joined !== 'undefined' && joined && veri.arkadaslar.length){
      const tum = document.createElement('button'); tum.type = 'button'; tum.className = 'btn ark-tum';
      const cevrim = veri.arkadaslar.filter(x => x.cevrimici && !x.odada);
      tum.textContent = '📨 Tüm arkadaşlarını bu odaya davet et (' + veri.arkadaslar.length + ')';
      tum.onclick = e => davetEt(veri.arkadaslar.map(x => x.kadi), e.currentTarget);
      ic.append(tum);
      if (cevrim.length){ const n = document.createElement('p'); n.className = 'note'; n.textContent = '🟢 ' + cevrim.map(x => x.name).join(', ') + ' şu an sitede.'; ic.append(n); }
    }
    [bolum('📥 Gelen istekler', veri.gelen, 'gelen'), bolum('🤝 Arkadaşların', veri.arkadaslar, 'arkadas', 'Henüz arkadaşınız yok. Yukarıya kullanıcı adını yazabilir ya da odada birinin kartındaki “➕ Arkadaş” düğmesine basabilirsiniz.'), bolum('⏳ Gönderdiğin istekler', veri.giden, 'giden')]
      .forEach(x => x && ic.append(x));
  }
  async function ac(){
    msg('');
    ciz(); dlg.showModal();
    if (uye()){ await yukle(); ciz(); }
  }

  // ---------- düğmeler: lobide hesap kutusu, odada üst çubuk (telefonda Daha menüsü) ----------
  const lobiBtn = document.createElement('button'); lobiBtn.type = 'button'; lobiBtn.className = 'btn small ark-btn'; lobiBtn.id = 'arkBtnLobi';
  lobiBtn.innerHTML = '👥 Arkadaşlar<b class="badge-count" hidden></b>'; lobiBtn.onclick = ac;
  const pb = $$('profilBtn'); if (pb) pb.after(lobiBtn);
  const odaBtn = document.createElement('button'); odaBtn.type = 'button'; odaBtn.className = 'btn small ark-btn'; odaBtn.id = 'arkBtn'; odaBtn.dataset.k = 'Arkadaş';
  odaBtn.title = 'Arkadaşlar ve davet'; odaBtn.innerHTML = '👥 <span class="lbl">Arkadaşlar</span><b class="badge-count" hidden></b>'; odaBtn.onclick = ac;
  const p2 = $$('profilBtn2'); if (p2) p2.after(odaBtn);
  function rozetSay(){
    [lobiBtn, odaBtn].forEach(b => { const c = b.querySelector('.badge-count'); c.hidden = !istekSayisi; c.textContent = istekSayisi; });
    odaBtn.hidden = !uye();
  }

  // ---------- odada: kişinin kartında "➕ Arkadaş" ----------
  function kartDugme(p){
    if (!p) return;
    // kontrol düğmeleri telefonda alttan açılan panele taşınmış olabilir
    const row = (p.card && p.card.querySelector('.kick-row')) || document.querySelector('.mob-sheet .kick-row[data-pid="' + p.id + '"]');
    if (!row) return;
    row.dataset.pid = p.id;
    let b = row.querySelector('.ark-kart');
    const goster = uye() && p.uye && kk(p.uye) !== kk(uye().kadi);
    if (!goster){ if (b) b.remove(); return; }
    if (!b){ b = document.createElement('button'); b.type = 'button'; b.className = 'btn dm-btn ark-kart'; row.append(b); }
    const ark = arkadasMi(p.uye), bek = gidenMi(p.uye);
    b.textContent = ark ? '🤝 Arkadaşın' : bek ? '⏳ İstek gitti' : '➕ Arkadaş';
    b.disabled = ark || bek;
    b.onclick = async e => { e.stopPropagation(); b.disabled = true; const d = await ekle(p.uye); if (d && !veri.giden.some(x => kk(x.kadi) === kk(p.uye)) && d.durum !== 'arkadas') veri.giden.push(d.kisi); kartDugme(p); };
  }
  function kartlariGuncelle(){ if (typeof peers !== 'undefined') peers.forEach(kartDugme); }
  if (typeof renderPeer === 'function'){ const r0 = renderPeer; renderPeer = function(p){ const r = r0.apply(this, arguments); try { kartDugme(p); } catch(e){} return r; }; }

  // ---------- girişte davetler ----------
  const kutu = document.createElement('div'); kutu.className = 'davet-kutu-lobi'; kutu.id = 'davetKutu'; kutu.hidden = true;
  const rj = $$('rejoin'); if (rj) rj.after(kutu);
  const once = ts => { const m = Math.max(1, Math.round((Date.now() - ts) / 60e3)); return m + ' dk önce'; };
  function davetCiz(){
    kutu.innerHTML = '';
    const list = davetler.filter(x => Date.now() - x.ts < 30 * 60e3);
    kutu.hidden = !list.length || (typeof joined !== 'undefined' && joined);
    list.forEach(x => {
      const k = document.createElement('div'); k.className = 'davet-kart';
      const t = document.createElement('div'); t.innerHTML = '<b></b><small></small>';
      t.querySelector('b').textContent = '📨 ' + x.name + ' seni odasına çağırıyor';
      t.querySelector('small').textContent = 'Oda ' + x.kod + ' · ' + once(x.ts);
      const kat = document.createElement('button'); kat.type = 'button'; kat.className = 'btn primary small'; kat.textContent = 'Katıl';
      kat.onclick = () => { $$('codeInput').value = x.kod; uyeApi('davet-sil', { kadi: x.kadi, kod: x.kod }).catch(() => {}); davetler = davetler.filter(y => y !== x); davetCiz(); $$('joinBtn').click(); };
      const x2 = document.createElement('button'); x2.type = 'button'; x2.className = 'btn small'; x2.textContent = '✕'; x2.title = 'Kapat';
      x2.onclick = () => { uyeApi('davet-sil', { kadi: x.kadi, kod: x.kod }).catch(() => {}); davetler = davetler.filter(y => y !== x); davetCiz(); };
      k.append(t, kat, x2); kutu.append(k);
    });
  }
  document.addEventListener('uye-ben', e => {
    const d = e.detail || {};
    davetler = Array.isArray(d.davetler) ? d.davetler : []; davetCiz();
    istekSayisi = d.istekSayisi || 0; rozetSay();
    if (uye() && !yuklendi) yukle();
  });
  // siteye dönünce (lobide) davet ve istekleri tazele
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !uye() || typeof refreshAccount !== 'function') return;
    if (Date.now() - (ac.son || 0) < 60e3) return; ac.son = Date.now();
    refreshAccount();
  });
  // bildirimden gelindiyse
  const q = new URLSearchParams(location.search);
  if (q.get('arkadas')) setTimeout(() => { if (uye()) ac(); }, 900);
  if (q.get('davet') && q.get('oda')) setTimeout(() => {
    if (typeof joined !== 'undefined' && joined) return;
    const ad = $$('nameInput').value.trim() || uye();
    if (ad){ $$('lobbyStatus').hidden = false; $$('lobbyStatus').textContent = '📨 Davetle geldin, odaya giriliyor…'; $$('joinBtn').click(); }
  }, 1200);
  if (typeof renderAccountBox === 'function'){ const a0 = renderAccountBox; renderAccountBox = function(){ const r = a0.apply(this, arguments); try { rozetSay(); } catch(e){} return r; }; }
  rozetSay();
  return { ac, yukle, ekle, arkadasMi, davetCiz, veri: () => veri };
})();
