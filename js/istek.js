// Açık odaya katılma isteği: kodu bilmeyen, girişteki "Şu an açık odalar" listesinden istek gönderir;
// oda sahibinin ekranına "X katılmak istiyor [Kabul] [Reddet]" düşer, kabul ederse içeri alınır. Kod hiç görünmez.
// Nasıl: oda sahibi eşleştirme sunucusunda rastgele bir "kapı" adresi açar ve bunu canlı durum listesine yazar;
// isteyen o adrese bağlanır. Kabul edilince kod bu doğrudan bağlantıdan iletilir.
// Ayrıca: yöneticinin "kodsuz giriş" yetkisi verdiği üye listedeki odaya doğrudan girer.
const ISTEK = (() => {
  const $$ = id => document.getElementById(id);
  const rasgele = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
  let kapiPeer = null, kapiTok = '';

  // ---------- oda sahibi: kapıyı aç / kapat ----------
  const gerekli = () => typeof joined !== 'undefined' && joined && isHost && !(typeof gizliOdaMi === 'function' && gizliOdaMi());
  async function kapiAc(){
    kapiTok = rasgele();
    const tok = kapiTok;
    let pr;
    try { pr = new Peer(PREFIX + 'kapi-' + tok, await peerOpts(serverInUse)); } catch(e){ kapiTok = ''; return; }
    if (tok !== kapiTok){ try { pr.destroy(); } catch(e){} return; }
    kapiPeer = pr;
    pr.on('open', () => { if (typeof varlikNabiz === 'function') varlikNabiz(); });
    pr.on('connection', conn => {
      conn.on('data', d => { if (d && d.t === 'istek') gelenIstek(conn, d); });
      conn.on('close', () => { const k = conn._kart; if (k && k.isConnected && !k._cevap){ k.remove(); kutuGuncelle(); } });
    });
    pr.on('disconnected', () => { setTimeout(() => { if (kapiPeer === pr && !pr.destroyed) try { pr.reconnect(); } catch(e){} }, 3000); });
    pr.on('error', () => {});
  }
  function kapiKapat(){
    if (kapiPeer){ try { kapiPeer.destroy(); } catch(e){} }
    kapiPeer = null; kapiTok = '';
    kutu.innerHTML = ''; kutuGuncelle();
  }
  setInterval(() => {
    if (gerekli() && !kapiTok) kapiAc();
    else if (!gerekli() && kapiTok) kapiKapat();
  }, 2000);

  // gelen istek kartları (sağ üstte)
  const kutu = document.createElement('div'); kutu.id = 'istekKutu'; kutu.className = 'istek-kutu'; kutu.setAttribute('aria-live', 'polite');
  document.body.append(kutu);
  const kutuGuncelle = () => { kutu.hidden = !kutu.children.length; };
  kutuGuncelle();
  function gelenIstek(conn, d){
    if (!gerekli()) { try { conn.send({ t: 'red', neden: 'kapali' }); } catch(e){} return; }
    if (conn._kart) return;
    const ad = (typeof clip === 'function' ? clip(d.ad, 20) : String(d.ad || '').slice(0, 20)) || 'Biri';
    const kadi = typeof d.uye === 'string' && /^[a-zA-Z0-9çğıöşüÇĞİÖŞÜ._-]{3,20}$/.test(d.uye) ? d.uye : '';
    const foto = typeof safeFoto === 'function' ? safeFoto(d.foto) : null;
    const k = document.createElement('div'); k.className = 'istek-kart'; conn._kart = k;
    const av = document.createElement('span'); av.className = 'acct-av'; if (typeof paintAvatar === 'function') paintAvatar(av, ad, foto);
    const t = document.createElement('div'); t.className = 'istek-yazi';
    t.innerHTML = '<b></b><small></small>';
    t.querySelector('b').textContent = ad + ' odaya katılmak istiyor';
    t.querySelector('small').textContent = kadi ? '@' + kadi + ' · üye' : 'misafir';
    const ev = document.createElement('div'); ev.className = 'istek-ac';
    const kabul = document.createElement('button'); kabul.type = 'button'; kabul.className = 'btn primary small'; kabul.textContent = '✓ Kabul';
    const red = document.createElement('button'); red.type = 'button'; red.className = 'btn small'; red.textContent = 'Reddet';
    const bitir = (sonuc) => {
      k._cevap = true;
      try { conn.send(sonuc ? { t: 'kabul', kod: roomCode } : { t: 'red' }); } catch(e){}
      k.classList.add('bitti'); t.querySelector('small').textContent = sonuc ? '✓ İçeri alınıyor…' : 'Reddedildi';
      ev.remove();
      setTimeout(() => { k.remove(); kutuGuncelle(); }, 2200);
      setTimeout(() => { try { conn.close(); } catch(e){} }, 4000);
      if (typeof hareket === 'function') hareket('oda', ad + ' katılma isteği ' + (sonuc ? 'kabul edildi' : 'reddedildi'));
    };
    kabul.onclick = () => bitir(true); red.onclick = () => bitir(false);
    ev.append(kabul, red);
    k.append(av, t, ev);
    kutu.append(k); kutuGuncelle();
    try { if (typeof tone === 'function') tone([660, 880, 990], 0.1, 0.25, 0.12); } catch(e){}
    // 2 dakika cevap verilmezse kapanır
    setTimeout(() => { if (!k._cevap && k.isConnected){ try { conn.send({ t: 'red', neden: 'zaman' }); } catch(e){} k.remove(); kutuGuncelle(); } }, 120e3);
  }

  // ---------- isteyen: listeden istek gönder ----------
  let bekleyen = null;
  function vazgec(){
    if (!bekleyen) return;
    const b = bekleyen; bekleyen = null;
    clearTimeout(b.zaman);
    try { b.peer.destroy(); } catch(e){}
  }
  async function gonder(o, durum){
    vazgec();
    const acc = typeof account !== 'undefined' && account && account.uye;
    const ad = acc ? acc.name : $$('nameInput').value.trim();
    if (!ad){ durum('Önce yukarıya adını yaz.', 'hata'); $$('nameInput').focus(); return; }
    if (!o.kapi){ durum('Bu oda şu an istek kabul etmiyor. Kodu yazarak girebilirsin.', 'hata'); return; }
    durum('⏳ İstek gönderiliyor…');
    const b = bekleyen = { o };
    const sunucular = signalServers();
    const dene = async i => {
      if (bekleyen !== b) return;
      if (i >= sunucular.length){ durum('Oda sahibine ulaşılamadı. Oda kapanmış olabilir.', 'hata'); vazgec(); return; }
      let pr;
      try { pr = new Peer(undefined, await peerOpts(sunucular[i])); } catch(e){ dene(i + 1); return; }
      b.peer = pr;
      pr.on('error', err => { if (bekleyen !== b) return; try { pr.destroy(); } catch(e){} if (!b.bagli) dene(i + 1); else { durum('Bağlantı koptu, tekrar dene.', 'hata'); vazgec(); } });
      pr.on('open', () => {
        if (bekleyen !== b) return;
        const c = pr.connect(PREFIX + 'kapi-' + o.kapi, { reliable: true });
        c.on('open', () => {
          b.bagli = true;
          c.send({ t: 'istek', ad, uye: acc ? acc.kadi : null, foto: acc ? acc.foto : null });
          durum('🙋 İstek gönderildi. Oda sahibinin onayı bekleniyor…', 'bekle');
        });
        c.on('data', d => {
          if (bekleyen !== b || !d) return;
          if (d.t === 'kabul' && typeof d.kod === 'string'){
            durum('✓ Kabul edildi, odaya giriliyor…', 'ok');
            const kod = typeof cleanCode === 'function' ? cleanCode(d.kod) : d.kod;
            vazgec();
            if (!acc && !$$('nameInput').value.trim()) $$('nameInput').value = ad;
            $$('codeInput').value = kod;
            $$('joinBtn').click();
          } else if (d.t === 'red'){
            durum(d.neden === 'zaman' ? 'Oda sahibi cevap vermedi.' : d.neden === 'kapali' ? 'Bu oda şu an istek kabul etmiyor.' : 'İsteğin kabul edilmedi.', 'hata');
            vazgec();
          }
        });
        c.on('close', () => { if (bekleyen === b && b.bagli){ durum('Oda sahibi isteği kapattı.', 'hata'); vazgec(); } });
      });
    };
    b.zaman = setTimeout(() => { if (bekleyen === b){ durum('Cevap gelmedi. Biraz sonra tekrar dene.', 'hata'); vazgec(); } }, 150e3);
    dene(0);
  }
  // yönetici yetkisi: kodsuz giriş
  // yönetici: aynı tarayıcıda yönetim paneline giriş yapmışsa (12 saat) ya da üyeliğine yetki verilmişse
  const yoneticiTok = () => { try { const y = JSON.parse(localStorage.getItem('oyunodasi-yonetici') || 'null'); return y && y.token && y.exp > Date.now() ? y.token : ''; } catch(e){ return ''; } };
  const kodsuzMu = () => !!yoneticiTok() || !!(typeof account !== 'undefined' && account && account.uye && account.uye.kodsuz);
  async function kodsuzGir(o, durum){
    durum('⏳ Giriliyor…');
    try {
      const h = { 'content-type': 'application/json' }, yt = yoneticiTok();
      if (yt) h['x-admin'] = yt;
      if (typeof account !== 'undefined' && account) h.authorization = 'Bearer ' + account.token;
      const r = await fetch('/api/oda/kodsuz', { method: 'POST', headers: h, body: JSON.stringify({ id: o.id }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.kod){
        if (d.hata === 'yetki'){ try { localStorage.removeItem('oyunodasi-yonetici'); } catch(e){} durum('Yönetici oturumun bitmiş. Yönetim paneline yeniden giriş yap ya da kodu yaz.', 'hata'); }
        else durum(d.hata || 'Odaya girilemedi.', 'hata');
        return;
      }
      $$('codeInput').value = d.kod; $$('joinBtn').click();
    } catch(e){ durum('Sunucuya ulaşılamadı.', 'hata'); }
  }
  return { kapi: () => (kapiPeer && kapiPeer.open && gerekli() ? kapiTok : ''), gonder, vazgec, bekliyor: () => !!bekleyen, kodsuzMu, kodsuzGir };
})();
