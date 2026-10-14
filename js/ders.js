// 🗂 Toplantı & Ders kanalı: biri ekranını paylaşıp anlatır, diğerleri dinler.
//  • Giriş ekranı: "Ekranını paylaş" (yazılar net görünsün diye 📄 Yazı kalitesinde açılır) ve kaydın nasıl alınacağı.
//  • Üstteki şerit (ekran paylaşılırken de görünür):
//      ✋ Söz iste — dinleyen el kaldırır; herkese bildirim gider, kutucuğunda ✋ görünür, şeritte sırayla listelenir.
//      🔇 Herkesi sustur — kanaldaki diğer herkesin mikrofonu kapanır (isteyen kendi açabilir).
//      🔗 Kayıt linki — Drive linki yapıştırılır, kanalda sabit durur; sonradan gelen de görür, tıklayıp açar.
// Mesajlar: ders-el {on} · ders-sustur {} · ders-link {url|null}
(function(){
  const D = { el: false, elSira: new Map(), link: null };      // elSira: id → zaman (sıraya göre listelenir)
  const burada = () => typeof joined !== 'undefined' && joined && myChan().type === 'ders';
  const ad = id => id === (peer && peer.id) ? myName : ((peers.get(id) || {}).name || 'Biri');
  const temizUrl = u => { try { const x = new URL(String(u || '').trim()); return /^https?:$/.test(x.protocol) && x.href.length <= 600 ? x.href : null; } catch(e){ return null; } };

  // ---------- giriş ekranı ----------
  window.renderDersDeck = function(d){
    d.innerHTML = '';
    const h = document.createElement('h2'); h.className = 'deck-title'; h.textContent = '🗂 Toplantı & Ders';
    const p = document.createElement('p'); p.className = 'note';
    p.textContent = 'Anlatacak kişi ekranını paylaşır, diğerleri dinler. Sorusu olan ✋ Söz iste ile el kaldırır. Kayıt alınabilir, kayıt bitince bilgisayara iner.';
    const grid = document.createElement('div'); grid.className = 'film-start ders-start';
    const kart = (big, baslik, aciklama, fn) => {
      const b = document.createElement(fn ? 'button' : 'div'); b.className = 'film-card' + (fn ? '' : ' bilgi');
      b.innerHTML = '<span class="big"></span><b></b><span class="d"></span>';
      b.querySelector('.big').textContent = big; b.querySelector('b').textContent = baslik; b.querySelector('.d').textContent = aciklama;
      if (fn) b.onclick = fn; grid.append(b);
    };
    kart('🖥', 'Ekranını paylaş', 'Sunum, slayt, belge, kod… Yazılar okunaklı olsun diye net görüntü kalitesinde açılır. Bilgisayarın sesini de paylaşmak için açılan pencerede “Ses paylaş”ı işaretle.', () => {
      if (typeof screenStream !== 'undefined' && screenStream){ toast('Zaten ekranını paylaşıyorsun.'); return; }
      shareQ = 'detail'; store.set('oyunodasi-q', 'detail'); startScreenShare();
    });
    kart('🔴', 'Kayıt nasıl alınır?', 'Ekran paylaşılınca ekranın üstünde ⏺ Kaydet çıkar: görüntü ve kanaldaki bütün sesler kaydedilir, bitince bilgisayarına iner. Herkesle paylaşmak için Google Drive’a yükle, linki yukarıdaki 🔗 Kayıt linki’ne yapıştır.');
    d.append(h, p, grid);
  };

  // ---------- üst şerit ----------
  function serit(){
    let s = document.getElementById('dersSerit');
    if (!s){
      s = document.createElement('div'); s.id = 'dersSerit'; s.className = 'ders-serit';
      const main = document.querySelector('#room .main'); if (!main) return null;
      main.prepend(s);
    }
    return s;
  }
  function ciz(){
    const s = serit(); if (!s) return;
    s.hidden = !burada();
    if (s.hidden) return;
    s.innerHTML = '';
    const el = document.createElement('button'); el.type = 'button'; el.className = 'btn small' + (D.el ? ' on' : '');
    el.textContent = D.el ? '✋ Elini indir' : '✋ Söz iste';
    el.title = D.el ? 'Söz isteğini geri al' : 'El kaldır: anlatana ve herkese “söz istiyor” diye görünür';
    el.onclick = () => elKaldir(!D.el);
    const sus = document.createElement('button'); sus.type = 'button'; sus.className = 'btn small';
    sus.textContent = '🔇 Herkesi sustur'; sus.title = 'Kanaldaki diğer herkesin mikrofonu kapanır (isteyen kendi açabilir)';
    sus.onclick = herkesiSustur;
    s.append(el, sus);
    // söz isteyenler (sırayla)
    const sira = [...D.elSira.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
    if (sira.length){
      const l = document.createElement('span'); l.className = 'ders-eller';
      l.textContent = '✋ Söz isteyen: ' + sira.map((id, i) => (i + 1) + '. ' + ad(id)).join('  ');
      s.append(l);
    }
    const bos = document.createElement('span'); bos.className = 'ders-bosluk'; s.append(bos);
    // kayıt linki
    if (D.link){
      const a = document.createElement('a'); a.className = 'ders-link'; a.href = D.link.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = '🔗 Kaydı aç'; a.title = D.link.url + ' · paylaşan: ' + D.link.ad;
      const kim = document.createElement('small'); kim.textContent = ' · ' + D.link.ad;
      a.append(kim);
      const x = document.createElement('button'); x.type = 'button'; x.className = 'btn small ders-x'; x.textContent = '✕'; x.title = 'Linki kaldır';
      x.onclick = () => linkKoy(null);
      s.append(a, x);
    } else {
      const lb = document.createElement('button'); lb.type = 'button'; lb.className = 'btn small'; lb.textContent = '🔗 Kayıt linki';
      lb.title = 'Kaydı Drive’a yükledikten sonra linkini buraya yapıştır; kanalda herkes görür';
      lb.onclick = linkFormu;
      s.append(lb);
    }
  }
  function linkFormu(){
    const s = serit(); if (!s) return;
    const f = document.createElement('form'); f.className = 'ders-linkform';
    const i = document.createElement('input'); i.type = 'url'; i.className = 'inp'; i.placeholder = 'https://drive.google.com/… linkini yapıştır'; i.required = true;
    const ok = document.createElement('button'); ok.className = 'btn small primary'; ok.textContent = 'Paylaş';
    const vz = document.createElement('button'); vz.type = 'button'; vz.className = 'btn small'; vz.textContent = 'Vazgeç'; vz.onclick = ciz;
    f.append(i, ok, vz);
    f.onsubmit = e => { e.preventDefault(); const u = temizUrl(i.value); if (!u){ toast('Geçerli bir link yapıştır (https://…)'); i.focus(); return; } linkKoy(u); };
    const eski = s.querySelector('.ders-linkform'); if (eski) eski.remove();
    s.append(f); i.focus();
  }

  // ---------- işlemler ----------
  function elKaldir(on){
    D.el = !!on;
    if (peer){ if (D.el) D.elSira.set(peer.id, Date.now()); else D.elSira.delete(peer.id); }
    broadcast({ t: 'ders-el', on: D.el });
    if (D.el) toast('✋ Söz istedin. Sıran gelince mikrofonunu açıp konuşabilirsin.');
    renderSelf(); ciz();
  }
  function herkesiSustur(){
    broadcast({ t: 'ders-sustur' });
    toast('🔇 Kanaldaki herkesin mikrofonu kapatıldı');
    addSys(myName + ' herkesin mikrofonunu kapattı');
  }
  function linkKoy(url){
    D.link = url ? { url, ad: myName, ts: Date.now() } : null;
    broadcast({ t: 'ders-link', url: url || null });
    if (url){ addSys(myName + ' kayıt linkini paylaştı: ' + url); toast('🔗 Link herkesle paylaşıldı'); }
    linkSakla(); ciz();
  }
  const LINK_KEY = () => 'oyunodasi-ders-link-' + (typeof roomCode !== 'undefined' ? roomCode : '');
  function linkSakla(){ try { if (D.link) localStorage.setItem(LINK_KEY(), JSON.stringify(D.link)); else localStorage.removeItem(LINK_KEY()); } catch(e){} }

  // ---------- gelen mesajlar ----------
  window.dersOnData = (id, d) => {
    if (typeof d.t !== 'string' || !d.t.startsWith('ders-')) return false;
    const p = peers.get(id); if (!p) return true;
    if (d.t === 'ders-el'){
      const once = D.elSira.has(id);
      if (d.on){ if (!once){ D.elSira.set(id, Date.now()); if (p.channel === 'ders' && burada()){ toast('✋ ' + p.name + ' söz istiyor'); if (typeof tone === 'function') tone([660, 880], 0.08, 0.2, 0.08); } } }
      else D.elSira.delete(id);
      renderPeer(p); ciz();
    } else if (d.t === 'ders-sustur'){
      if (!burada()) return true;
      if (typeof micMuted !== 'undefined' && !micMuted && !noMic) $('micBtn').click();
      toast('🔇 ' + p.name + ' herkesin mikrofonunu kapattı. Konuşmak için mikrofonunu açabilirsin.');
    } else if (d.t === 'ders-link'){
      const u = d.url ? temizUrl(d.url) : null;
      if (d.url && !u) return true;                       // geçersiz/zararlı link: yok say
      const yeni = u && (!D.link || D.link.url !== u);
      D.link = u ? { url: u, ad: p.name, ts: Date.now() } : null;
      if (yeni && burada()) toast('🔗 ' + p.name + ' kayıt linkini paylaştı');
      linkSakla(); ciz();
    }
    return true;
  };
  // yeni gelen: link ve benim söz isteğim ona da gitsin
  window.dersOnHello = p => {
    if (D.link) send(p.conn, { t: 'ders-link', url: D.link.url });
    if (D.el) send(p.conn, { t: 'ders-el', on: true });
  };
  // kutucuklardaki ✋ rozeti
  window.dersRozet = id => (D.elSira.has(id) ? '<span class="pill el">✋ Söz istiyor</span>' : '');
  // ayrılanın eli iner
  setInterval(() => { let degisti = false; D.elSira.forEach((t, id) => { if (id !== (peer && peer.id) && !peers.has(id)){ D.elSira.delete(id); degisti = true; } }); if (degisti) ciz(); }, 5000);

  // kanal değişince şeridi göster/gizle; başka kanala geçen elini indirir
  const oda = document.getElementById('room');
  if (oda) new MutationObserver(() => {
    if (!burada() && D.el) elKaldir(false);
    ciz();
  }).observe(oda, { attributes: true, attributeFilter: ['class', 'hidden'] });
  // odaya girince bu odanın son linkini hatırla
  const bekle = setInterval(() => {
    if (typeof joined === 'undefined' || !joined) return;
    clearInterval(bekle);
    try { const l = JSON.parse(localStorage.getItem(LINK_KEY()) || 'null'); if (l && temizUrl(l.url) && Date.now() - l.ts < 30 * 864e5) D.link = l; } catch(e){}
    ciz();
  }, 1000);
  window.dersCiz = ciz;
})();
