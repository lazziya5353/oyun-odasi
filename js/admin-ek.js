// Yönetim paneli ekleri: 🌦 Hava efektleri (sitedekiyle aynı), 📻 Radyo (panelde sen dinlersin, odalara gitmez),
// 👤 Kişi profili (sitede/odalarda geçirilen süre, giriş geçmişi, hareketler; odadan at, çıkış yaptır, durdur, sil).
// admin.js'in yardımcılarını kullanır ($, el, button, dangerBtn, req, api, toast, fmt, ago, go, refresh, users, tab, renderList).

// ---------- süre biçimi ----------
function sureYaz(ms){
  const m = Math.round((ms || 0) / 60e3);
  if (m < 1) return ms > 0 ? '<1 dk' : '0 dk';
  const h = Math.floor(m / 60), d = m % 60;
  if (h >= 24) return Math.floor(h / 24) + ' gün ' + (h % 24) + ' saat';
  return h ? h + ' saat' + (d ? ' ' + d + ' dk' : '') : m + ' dk';
}
const tarihYaz = ts => ts ? new Date(ts).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–';

// ---------- 🌦 hava efektleri ----------
function renderHava(list){
  const box = el('div', 'ad-box');
  box.append(el('h3', '', '🌦 Hava efektleri'));
  if (typeof OyunHava === 'undefined'){ box.append(note('Hava efekti kitaplığı yüklenemedi, sayfayı yenile.', 'err')); list.append(box); return; }
  box.append(note('Sitedeki Görünüm → Hava ile aynı efektler. Seçim sadece bu tarayıcıda geçerlidir; kullanıcıların ekranını etkilemez.'));
  const picks = el('div', 'hava-picks');
  const cur = OyunHava.current || 'yok';
  OyunHava.list.forEach(h => {
    const b = el('button', 'hava-pick' + (h.id === cur ? ' on' : '')); b.type = 'button'; b.title = h.desc || h.name;
    b.append(el('span', 'hava-ico', h.icon), el('span', '', h.name));
    b.onclick = () => { OyunHava.set(h.id === 'yok' ? null : h.id, { yogunluk: OyunHava.yogunluk || 0.6 }); renderList(); };
    picks.append(b);
  });
  box.append(picks);
  if (cur !== 'yok'){
    const row = el('div', 'u-acts start');
    const yog = el('input'); yog.type = 'range'; yog.min = '0.2'; yog.max = '1'; yog.step = '0.1'; yog.value = OyunHava.yogunluk || 0.6; yog.setAttribute('aria-label', 'Yoğunluk');
    yog.oninput = () => OyunHava.set(OyunHava.current, { yogunluk: +yog.value });
    row.append(el('span', 'note', 'Yoğunluk'), yog, button('🧹 Temizle', '', () => OyunHava.clear()));
    box.append(row);
  }
  list.append(box);
}

// ---------- 📻 radyo ----------
const STW = 'https://playerservices.streamtheworld.com/api/livestream-redirect/';
const RADYOLAR = [
  ['Power FM', 'https://listen.powerapp.com.tr/powerfm/mpeg/icecast.audio', 'yabancı pop, hit'],
  ['Power Türk', 'https://listen.powerapp.com.tr/powerturk/mpeg/icecast.audio', 'türkçe pop'],
  ['Power Türk Taptaze', 'https://listen.powerapp.com.tr/powerturktaptaze/mpeg/icecast.audio', 'yeni türkçe pop'],
  ['Power Türk Akustik', 'https://listen.powerapp.com.tr/powerturkakustik/mpeg/icecast.audio', 'akustik'],
  ['Power Türk Slow', 'https://listen.powerapp.com.tr/powerturkslow/mpeg/icecast.audio', 'slow'],
  ['Power Türk Rap', 'https://listen.powerapp.com.tr/powerturkrap/mpeg/icecast.audio', 'türkçe rap'],
  ['Power Türk Rock', 'https://listen.powerapp.com.tr/powerturkrock/mpeg/icecast.audio', 'türkçe rock'],
  ['Power Pop', 'https://listen.powerapp.com.tr/powerpop/mpeg/icecast.audio', 'pop'],
  ['Power Love', 'https://listen.powerapp.com.tr/powerlove/mpeg/icecast.audio', 'aşk şarkıları'],
  ['Power Dance', 'https://listen.powerapp.com.tr/powerdance/mpeg/icecast.audio', 'dance, elektronik'],
  ['Kral FM', 'https://dygedge2.radyotvonline.net/kralfm/playlist.m3u8', 'arabesk, fantezi'],
  ['Joy FM', STW + 'JOY_FM.mp3', 'yabancı slow'],
  ['Joy Türk', STW + 'JOY_TURK.mp3', 'türkçe slow'],
  ['Joy Jazz', STW + 'JOY_JAZZ.mp3', 'caz'],
  ['Metro FM', STW + 'METRO_FM.mp3', 'yabancı hit'],
  ['Süper FM', STW + 'SUPER_FM.mp3', 'türkçe pop'],
  ['Virgin Radio', STW + 'VIRGIN_RADIO.mp3', 'yabancı pop, hit'],
  ['Radyo Fenomen', 'https://live.radyofenomen.com/fenomen/128/icecast.audio', 'hit'],
  ['Fenomen Türk', 'https://live.radyofenomen.com/fenomenturk/128/icecast.audio', 'türkçe pop'],
  ['Fenomen Akustik', 'https://live.radyofenomen.com/fenomenakustik/128/icecast.audio', 'akustik'],
  ['Slow Türk', 'https://radyo.duhnet.tv/ak_dtvh_slowturk', 'türkçe slow'],
  ['Radyo D', 'https://radyo.duhnet.tv/radyod', 'türkçe pop'],
  ['Alem FM', 'https://turkmedya.radyotvonline.net/alemfmaac', 'türkçe pop'],
  ['Radyo Viva', 'https://radyoviva.radyotvonline.net/radyoviva', 'türkçe pop'],
  ['Show Radyo', 'https://showradyo.radyotvonline.net/showradyo', 'türkçe pop']
].map(([name, url, tags]) => ({ name, url, tags }));
const RD = { el: null, hls: null, cur: null, vol: 0.7, q: '', sonuc: null, ara: false };
try { const v = parseFloat(localStorage.getItem('oyunodasi-admin-radyo-ses')); if (v >= 0 && v <= 1) RD.vol = v; } catch(e){}
function hlsYukle(){
  if (window.Hls) return Promise.resolve();
  return hlsYukle.s || (hlsYukle.s = new Promise((ok, no) => {
    const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.15/hls.min.js';
    sc.onload = ok; sc.onerror = () => { hlsYukle.s = null; no(); }; document.head.append(sc);
  }));
}
function radyoDurdur(){
  if (RD.hls){ try { RD.hls.destroy(); } catch(e){} RD.hls = null; }
  if (RD.el){ RD.el._url = ''; RD.el.pause(); RD.el.removeAttribute('src'); RD.el.load(); }
  RD.cur = null; miniRadyo(); if (tab === 'radyo') renderList();
}
function radyoCal(st){
  if (!RD.el){
    RD.el = new Audio(); RD.el.preload = 'none';
    RD.el.addEventListener('error', () => { if (RD.el._url){ toast('Bu radyo şu an açılamadı, başka bir istasyon dene.'); radyoDurdur(); } });
  }
  if (RD.hls){ try { RD.hls.destroy(); } catch(e){} RD.hls = null; }
  RD.cur = st; RD.el._url = st.url; RD.el.volume = RD.vol;
  if (/\.m3u8(\?|$)/i.test(st.url) && !RD.el.canPlayType('application/vnd.apple.mpegurl')){
    hlsYukle().then(() => {
      if (RD.el._url !== st.url || !window.Hls || !Hls.isSupported()) return;
      const h = new Hls({ lowLatencyMode: false }); RD.hls = h;
      h.on(Hls.Events.ERROR, (e, d) => { if (d.fatal && RD.el._url === st.url){ toast('Bu radyo şu an açılamadı, başka bir istasyon dene.'); radyoDurdur(); } });
      h.loadSource(st.url); h.attachMedia(RD.el);
      RD.el.play().catch(() => {});
    }).catch(() => toast('Radyo yüklenemedi'));
  } else { RD.el.src = st.url; RD.el.play().catch(() => toast('Radyoyu başlatmak için sayfaya bir kez tıkla.')); }
  miniRadyo(); if (tab === 'radyo') renderList();
}
// üst çubukta çalan radyo kutusu (sekme değişse de görünür)
function miniRadyo(){
  let m = document.getElementById('radyoMini');
  if (!RD.cur){ if (m) m.remove(); return; }
  if (!m){
    m = el('div', 'ad-radyo-mini'); m.id = 'radyoMini';
    const h = document.querySelector('.adm-head'); if (!h) return;
    h.insertBefore(m, document.getElementById('pushBtn'));
  }
  m.innerHTML = '';
  const vol = el('input'); vol.type = 'range'; vol.min = '0'; vol.max = '1'; vol.step = '0.05'; vol.value = RD.vol; vol.setAttribute('aria-label', 'Radyo sesi');
  vol.oninput = () => { RD.vol = +vol.value; if (RD.el) RD.el.volume = RD.vol; try { localStorage.setItem('oyunodasi-admin-radyo-ses', String(RD.vol)); } catch(e){} };
  m.append(el('span', '', '📻 ' + RD.cur.name), vol, button('⏹', '', radyoDurdur));
}
async function radyoAra(){
  RD.ara = true; RD.sonuc = null; if (tab === 'radyo') renderList();
  try {
    const r = await fetch('/api/radyo/ara?cc=TR&name=' + encodeURIComponent(RD.q));
    const d = r.ok ? await r.json() : [];
    RD.sonuc = (Array.isArray(d) ? d : []).filter(s => s.url_resolved).slice(0, 80).map(s => ({ name: s.name || 'Radyo', url: s.url_resolved, tags: (s.tags || '').split(',').slice(0, 3).join(', ') }));
  } catch(e){ RD.sonuc = []; }
  RD.ara = false; if (tab === 'radyo') renderList();
}
function renderRadyo(list){
  const box = el('div', 'ad-box');
  box.append(el('h3', '', '📻 Radyo'), note('Burada açtığın radyoyu sadece sen duyarsın (odalara gitmez). Başka sekmeye geçsen de çalmaya devam eder.'));
  if (RD.cur){
    const row = el('div', 'ad-banner ok');
    row.append(el('span', '', '▶ Çalıyor: ' + RD.cur.name), button('⏹ Durdur', '', radyoDurdur));
    box.append(row);
  }
  const ara = el('div', 'u-acts start');
  const inp = el('input', 'inp'); inp.placeholder = '🔎 İstasyon ara (ör. kral, jazz, haber)'; inp.value = RD.q; inp.style.flex = '1';
  const git = () => { RD.q = inp.value.trim(); if (RD.q) radyoAra(); else { RD.sonuc = null; renderList(); } };
  inp.onkeydown = e => { if (e.key === 'Enter') git(); };
  ara.append(inp, button('Ara', 'primary', git));
  if (RD.sonuc) ara.append(button('✕ Aramayı kapat', '', () => { RD.sonuc = null; RD.q = ''; renderList(); }));
  box.append(ara);
  const g = el('div', 'replik-liste');
  const goster = RD.ara ? [] : (RD.sonuc || RADYOLAR);
  if (RD.ara) g.append(note('Aranıyor…'));
  else if (RD.sonuc && !RD.sonuc.length) g.append(note('Sonuç yok. Başka bir kelime dene.'));
  else if (RD.sonuc) g.append(note(RD.sonuc.length + ' sonuç'));
  goster.forEach(st => {
    const r = el('div', 'replik-satir');
    const on = RD.cur && RD.cur.url === st.url;
    r.append(el('span', 'replik-ad', (on ? '▶ ' : '📻 ') + st.name), el('span', 'note', st.tags || ''));
    r.append(on ? button('⏹ Durdur', '', radyoDurdur) : button('▶ Çal', 'primary', () => radyoCal(st)));
    g.append(r);
  });
  box.append(g);
  list.append(box);
}

// ---------- 👤 kişi profili ----------
const KP = { dlg: null };
function kpOlay(x){
  if (x.tur === 'site') return '🌐 Siteyi açtı' + (x.cihaz ? ' (' + (x.cihaz === 'pc' ? 'bilgisayar' : 'telefon') + ')' : '');
  return x.tur === 'oda' ? '🎮 ' + x.kod + ' odasına girdi' : '🚪 ' + x.kod + ' odasından çıktı';
}
function kpKart(sayi, etiket){ const k = el('div', 'ad-stat'); k.style.cursor = 'default'; k.append(el('b', '', sayi), el('span', '', etiket)); return k; }
async function kisiProfil(kimlik){
  // kimlik: { kadi } (üye) ya da { misafir: ad }
  if (!KP.dlg){
    KP.dlg = document.getElementById('kisiDlg');
    KP.dlg.addEventListener('click', e => { if (e.target === KP.dlg) KP.dlg.close(); });
  }
  const body = KP.dlg.querySelector('.dlg-body');
  body.innerHTML = ''; body.append(note('Yükleniyor…'));
  KP.dlg.querySelector('h3').textContent = '👤 ' + (kimlik.kadi ? '@' + kimlik.kadi : kimlik.misafir);
  if (!KP.dlg.open) KP.dlg.showModal();
  let d;
  try { d = await req('/api/uye/admin-detay?' + (kimlik.kadi ? 'kadi=' + encodeURIComponent(kimlik.kadi) : 'misafir=' + encodeURIComponent(kimlik.misafir))); }
  catch(e){ body.innerHTML = ''; body.append(note(e.message, 'err')); return; }
  body.innerHTML = '';
  const u = d.uye, k = d.kisi;
  // üst: avatar + ad
  const ust = el('div', 'u'); ust.style.gridTemplateColumns = 'auto 1fr';
  const av = el('div', 'u-av');
  if (u && u.foto) av.style.backgroundImage = 'url("' + u.foto + '")'; else av.textContent = initial(d.ad);
  const info = el('div', 'u-info');
  const b = el('b', '', u ? u.adSoyad : d.ad);
  if (u) b.append(el('span', 'pill ' + ({ onayli: 'ok', bekliyor: 'wait' }[u.durum] || 'no'), { onayli: 'üye', bekliyor: 'onay bekliyor', red: 'reddedildi', askida: 'durduruldu' }[u.durum] || u.durum));
  else b.append(el('span', 'pill', 'misafir'));
  if (d.canli) b.append(el('span', 'pill ok', d.canli.kod ? '🎮 ' + d.canli.kod + ' odasında' : '🟢 sitede'));
  info.append(b);
  if (u) info.append(el('span', '', 'Görünen ad: ' + u.name + ' · @' + u.kadi));
  info.append(el('span', 'ad-muted', 'Başvuru: ' + tarihYaz(u && u.created) + (u && u.approvedAt ? ' · Onay: ' + tarihYaz(u.approvedAt) : '')));
  if (u && u.bio) { const bio = el('span', '', '“' + u.bio + '”'); bio.style.fontStyle = 'italic'; info.append(bio); }
  ust.append(av, info); body.append(ust);
  // sayılar
  const st = el('div', 'ad-stats');
  st.append(
    kpKart(k ? sureYaz(k.siteMs) : '–', 'sitede geçirdiği süre'),
    kpKart(k ? sureYaz(k.odaMs) : '–', 'odalarda geçirdiği süre'),
    kpKart(k ? String(k.girisler || (k.gecmis || []).filter(x => x.tur === 'site').length) : '–', 'siteye giriş'),
    kpKart(k ? ago(k.son) : 'hiç', 'son görülme')
  );
  body.append(st);
  if (k) body.append(note('İlk görülme: ' + tarihYaz(k.ilk) + ' · Son görülme: ' + tarihYaz(k.son) + ' · ' + ({ pc: '💻 bilgisayar', mobil: '📱 telefon', tablet: '📲 tablet' }[k.cihaz] || '') + (k.siteMs ? '' : ' · (süre sayacı yeni eklendi; bundan sonraki girişlerden itibaren dolar)')));
  else body.append(note('Bu kişi için canlı kayıt yok (henüz siteye girmemiş ya da kayıt silinmiş).'));
  // bildirim
  if (u){
    const n = u.bildirim || {};
    body.append(note('🔔 ' + (u.bildirimCihaz ? u.bildirimCihaz + ' cihazında bildirim açık' : 'Bildirimi açık cihaz yok') + ' · Oda açınca: ' + (n.gonder === false ? 'kimseye bildirim gitmez' : n.kime === 'secili' ? 'sadece seçtiği ' + (n.secili || []).length + ' kişiye gider' : 'herkese gider') + (n.al === false ? ' · başkalarının bildirimini almıyor' : '')));
  }
  // odalar
  if (k && k.odalar && Object.keys(k.odalar).length){
    const ob = el('div', 'ad-box'); ob.append(el('h3', '', '🎮 Girdiği odalar (süreye göre)'));
    Object.entries(k.odalar).sort((a, c) => c[1] - a[1]).forEach(([kod, ms]) => { const r = el('div', 'ad-mini'); r.append(el('span', '', kod), el('span', 'ad-muted', sureYaz(ms))); ob.append(r); });
    body.append(ob);
  }
  // giriş-çıkış geçmişi
  if (k && k.gecmis && k.gecmis.length){
    const gb = el('div', 'ad-box'); gb.append(el('h3', '', '🕘 Giriş / çıkış geçmişi (son ' + k.gecmis.length + ')'));
    k.gecmis.forEach(x => { const r = el('div', 'ad-mini'); r.append(el('span', '', kpOlay(x)), el('span', 'ad-muted', tarihYaz(x.ts))); gb.append(r); });
    body.append(gb);
  }
  // hareketler (ne yaptı, nereye tıkladı)
  const hb = el('div', 'ad-box'); hb.append(el('h3', '', '📋 Hareketleri (' + d.hareket.length + ')'));
  if (!d.hareket.length) hb.append(note('Kayıtlı hareket yok. (Son 500 hareket tutulur.)'));
  d.hareket.forEach(x => hb.append(hareketSatir(x)));
  body.append(hb);
  // işlemler
  const ac = el('div', 'u-acts start');
  const kapat = () => KP.dlg.close();
  if (d.canli && d.canli.kod) ac.append(dangerBtn('🚪 Odadan at', async () => { try { await req('/api/oda/admin-at', { anahtar: d.anahtar }); toast(d.ad + ' odadan atılacak (en geç 1 dakika içinde)'); } catch(e){ toast(e.message); } }));
  if (u){
    if (u.durum === 'onayli'){
      ac.append(button('🔑 Şifre sıfırla', '', async () => { try { const r = await api('admin-sifre', { id: u.id }); toast('Yeni geçici şifre: ' + r.yeni); } catch(e){ toast(e.message); } }));
      ac.append(dangerBtn('🚪 Çıkış yaptır', () => act('admin-oturum-kapat', { id: u.id }, u.name + ' tüm cihazlardan çıkarıldı')));
      ac.append(dangerBtn('⏸ Durdur', async () => { await act('admin-askiya', { id: u.id, askida: true }, u.name + ' durduruldu'); kapat(); }));
    }
    if (u.durum === 'askida') ac.append(button('▶ Yeniden aç', 'primary', async () => { await act('admin-askiya', { id: u.id, askida: false }, u.name + ' yeniden açıldı'); kapat(); }));
    ac.append(dangerBtn('🗑 Üyeliği kaldır', async () => { await act('admin-sil', { id: u.id }, u.name + ' üyelikten kaldırıldı'); kapat(); }));
  } else ac.append(dangerBtn('🗑 Listeden kaldır', async () => { try { await req('/api/oda/admin-kisi-sil', { anahtar: d.anahtar }); toast(d.ad + ' kişiler listesinden kaldırıldı'); kapat(); if (window.yanYenile) window.yanYenile(); } catch(e){ toast(e.message); } }));
  body.append(ac);
}
window.kisiProfil = kisiProfil;
