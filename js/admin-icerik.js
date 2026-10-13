// Yönetim paneli: 🎬 Video duvar kağıtları (panelden yükle, GitHub'a ve yayına gerek yok) ve 🔤 Kelimeler (Tabu / Çiz).
// admin.js'teki yardımcıları kullanır (el, note, button, dangerBtn, toast, req, trLow, mb).

/* ================= 🎬 Video duvar kağıtları ================= */
const DV = { liste: null, dosyalar: [], yukleniyor: false, sonKategori: '' };
try { DV.sonKategori = localStorage.getItem('oyunodasi-admin-kategori') || ''; } catch(e){}
const PARCA_B = 3 * 1024 * 1024;
const yeniId = () => [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join('');
const dosyaAdi = f => f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
const tipTahmin = (f, tur) => f.type || (tur === 'v' ? (/\.webm$/i.test(f.name) ? 'video/webm' : 'video/mp4') : tur === 'm' ? 'audio/mpeg' : 'image/jpeg');

async function duvarYukle(){
  try { const r = await fetch('/api/duvar/liste', { cache: 'no-store' }); DV.liste = r.ok ? (await r.json()).videolar : []; } catch(e){ DV.liste = DV.liste || []; }
  try { const r = await fetch('duvar-liste.json', { cache: 'no-cache' }); DV.dosyalar = r.ok ? (await r.json()).kategoriler || [] : []; } catch(e){ DV.dosyalar = []; }
}
// dosyayı 3 MB'lık parçalar hâlinde yükle
async function parcaYukle(id, tur, file, ilerle){
  const n = Math.max(1, Math.ceil(file.size / PARCA_B));
  for (let i = 0; i < n; i++){
    const parca = file.slice(i * PARCA_B, Math.min(file.size, (i + 1) * PARCA_B));
    let son;
    for (let deneme = 0; deneme < 3; deneme++){
      try {
        const r = await fetch('/api/duvar/parca?id=' + id + '&tur=' + tur + '&n=' + i, { method: 'POST', headers: { 'content-type': 'application/octet-stream', 'x-admin': tok }, body: parca });
        if (r.ok){ son = null; break; }
        const d = await r.json().catch(() => ({})); son = new Error(d.hata || 'yükleme hatası');
        if (r.status === 401){ logout(); throw son; }
      } catch(e){ son = e; }
      await new Promise(res => setTimeout(res, 800 * (deneme + 1)));
    }
    if (son) throw son;
    if (ilerle) ilerle((i + 1) / n);
  }
  return { parca: n, boyut: file.size, tip: tipTahmin(file, tur) };
}
// videodan önizleme resmi (1. saniye, 1280 px JPEG; video yüklenirken sitede bu görünür) — sitede Görünüm penceresi hızlı açılsın
function videoKapak(file){
  return new Promise(res => {
    const v = document.createElement('video'), u = URL.createObjectURL(file);
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    const bit = b => { URL.revokeObjectURL(u); res(b); };
    v.onloadeddata = () => { try { v.currentTime = Math.min(1, (v.duration || 2) / 3); } catch(e){ bit(null); } };
    v.onseeked = () => {
      try { const W = Math.min(1280, v.videoWidth || 1280), c = document.createElement('canvas'); c.width = W; c.height = Math.round(W * v.videoHeight / v.videoWidth) || 360;
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); c.toBlob(b => { if (b){ b.vw = v.videoWidth; b.vh = v.videoHeight; } bit(b); }, 'image/jpeg', .82);
      } catch(e){ bit(null); }
    };
    v.onerror = () => bit(null); setTimeout(() => bit(null), 15000);
    v.src = u;
  });
}
function kategoriler(){
  const s = new Set();
  (DV.liste || []).forEach(x => s.add(x.kategori)); DV.dosyalar.forEach(k => s.add(k.ad));
  ['Manzara', 'Anime', 'Oyun', 'Film', 'Gece', 'Doğa'].forEach(x => s.add(x));
  return [...s];
}
function renderDuvarTab(list){
  // ---- yükleme formu
  const box = el('div', 'ad-box dv-form');
  box.append(el('h3', '', '⬆️ Yeni video duvar kağıdı yükle'),
    note('Video yüklenince sitede Görünüm → Arka plan’da hemen çıkar. GitHub’a ve yayına gerek yok, Netlify kredisi harcamaz. mp4 ya da webm, en fazla 60 MB (önerilen 5–20 MB, 1080p, sessiz).'));
  const vInp = el('input'); vInp.type = 'file'; vInp.accept = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v';
  const mInp = el('input'); mInp.type = 'file'; mInp.accept = 'audio/*,.mp3,.m4a,.ogg,.wav';
  const ad = el('input', 'inp'); ad.placeholder = 'Ad (ör. Gece göl)'; ad.maxLength = 60;
  const kat = el('input', 'inp'); kat.placeholder = 'Kategori (ör. Manzara)'; kat.maxLength = 30; kat.value = DV.sonKategori || 'Manzara';
  const dl = el('datalist'); dl.id = 'dvKategoriler'; kategoriler().forEach(k => { const o = el('option'); o.value = k; dl.append(o); }); kat.setAttribute('list', 'dvKategoriler');
  vInp.onchange = () => { const f = vInp.files[0]; if (f && !ad.value) ad.value = dosyaAdi(f); bilgi(); };
  mInp.onchange = () => bilgi();
  const bil = note(''); const bilgi = () => {
    const f = vInp.files[0], m = mInp.files[0];
    bil.textContent = (f ? '🎬 ' + f.name + ' · ' + mb(f.size) + (f.size > 25 * 1048576 ? ' — büyük dosya, ilk açılış biraz sürer' : '') : '') + (m ? '   🎵 ' + m.name + ' · ' + mb(m.size) : '');
    bil.className = 'note' + (f && f.size > 60 * 1048576 ? ' err' : '');
  };
  const sat = (lbl, x) => { const r = el('label', 'dv-satir'); r.append(el('span', '', lbl), x); return r; };
  const cubuk = el('div', 'dv-cubuk'); const ic = el('i'); cubuk.append(ic); cubuk.hidden = true;
  const durumY = note('');
  const gonder = button('⬆️ Yükle', 'primary', async () => {
    const f = vInp.files[0], m = mInp.files[0];
    if (!f){ toast('Önce bir video seç'); return; }
    if (f.size > 60 * 1048576){ toast('Video en fazla 60 MB olabilir'); return; }
    if (m && m.size > 30 * 1048576){ toast('Müzik en fazla 30 MB olabilir'); return; }
    if (!ad.value.trim()){ toast('Ad yaz'); ad.focus(); return; }
    DV.yukleniyor = true; gonder.disabled = true; cubuk.hidden = false; ic.style.width = '0%';
    const id = yeniId(), top = f.size + (m ? m.size : 0); let biten = 0;
    const ilerle = boyut => p => { ic.style.width = Math.round((biten + p * boyut) / top * 100) + '%'; };
    try {
      durumY.textContent = 'Önizleme hazırlanıyor…';
      const kapak = await videoKapak(f);
      // 4K ya da çok büyük video: sitede ilk açılışta takılır (önce tamamı inmeli, telefon 4K çözerken zorlanır)
      if ((kapak && Math.min(kapak.vw, kapak.vh) > 1200) || f.size > 25 * 1048576)
        toast('⚠️ Bu video ' + (kapak && Math.min(kapak.vw, kapak.vh) > 1200 ? kapak.vw + '×' + kapak.vh + ' (4K)' : 'büyük') + ': sitede ilk açılışta takılabilir. 1080p ve 25 MB altı önerilir.');
      let poster = null;
      if (kapak){ poster = await parcaYukle(id, 'p', new File([kapak], 'kapak.jpg', { type: 'image/jpeg' })); }
      durumY.textContent = 'Video yükleniyor…';
      const video = await parcaYukle(id, 'v', f, ilerle(f.size)); biten += f.size;
      let muzik = null;
      if (m){ durumY.textContent = 'Müzik yükleniyor…'; muzik = await parcaYukle(id, 'm', m, ilerle(m.size)); biten += m.size; }
      durumY.textContent = 'Kaydediliyor…';
      await req('/api/duvar/admin-ekle', { id, ad: ad.value.trim(), kategori: kat.value.trim() || 'Diğer', video, poster, muzik });
      DV.sonKategori = kat.value.trim(); try { localStorage.setItem('oyunodasi-admin-kategori', DV.sonKategori); } catch(e){}
      toast('✅ “' + ad.value.trim() + '” yüklendi, sitede hemen görünür');
      await duvarYukle(); if (typeof OyunBG !== 'undefined' && OyunBG.panelYenile) OyunBG.panelYenile();
      DV.yukleniyor = false; renderList();
    } catch(e){
      DV.yukleniyor = false; gonder.disabled = false; durumY.textContent = ''; cubuk.hidden = true;
      toast('Yüklenemedi: ' + (e.message || e));
    }
  });
  box.append(sat('Video', vInp), sat('Müzik (isteğe bağlı)', mInp), bil, sat('Ad', ad), sat('Kategori', kat), dl, cubuk, durumY, gonder);
  list.append(box);
  // ---- panelden yüklenenler
  const v = DV.liste || [];
  const kb = el('div', 'ad-box'); kb.append(el('h3', '', '🎬 Panelden yüklenenler (' + v.length + ') · ' + mb(v.reduce((a, x) => a + x.video.boyut + (x.muzik ? x.muzik.boyut : 0), 0))));
  if (!v.length) kb.append(note('Henüz yok. Yukarıdan ilk videonu yükle.'));
  const grup = {}; v.forEach(x => (grup[x.kategori] = grup[x.kategori] || []).push(x));
  Object.keys(grup).sort((a, b) => a.localeCompare(b, 'tr')).forEach(k => {
    kb.append(el('div', 'dv-kat', '🎬 ' + k));
    grup[k].sort((a, b) => a.ad.localeCompare(b.ad, 'tr')).forEach(x => kb.append(dvSatir(x)));
  });
  list.append(kb);
  // ---- GitHub klasöründekiler (salt okunur)
  if (DV.dosyalar.length){
    const gb = el('div', 'ad-box'); gb.append(el('h3', '', '📁 GitHub’daki duvar-kagitlari klasörü'), note('Bunlar GitHub’dan yüklendi; silmek ya da değiştirmek için GitHub’da dosyayı sil.'));
    DV.dosyalar.forEach(k => k.videolar.forEach(x => { const r = el('div', 'ad-mini'); r.append(el('span', '', '🎬 ' + k.ad + ' / ' + x.ad + (x.muzik ? ' 🎵' : '')), el('span', 'ad-muted', mb(x.boyut))); gb.append(r); }));
    list.append(gb);
  }
}
function dvSatir(x){
  const r = el('div', 'dv-video');
  const im = el('img'); im.alt = ''; im.loading = 'lazy'; if (x.poster) im.src = '/api/duvar/parca?id=' + x.id + '&tur=p&n=0';
  const bilgi = el('div', 'dv-bilgi');
  bilgi.append(el('b', '', x.ad), el('span', 'ad-muted', mb(x.video.boyut) + (x.muzik ? ' · 🎵 müzik ' + mb(x.muzik.boyut) : ' · müzik yok')));
  const acts = el('div', 'u-acts');
  acts.append(button('▶ Arka plan yap', '', () => { if (typeof OyunBG !== 'undefined'){ OyunBG.set('p:' + x.id); toast('Arka plan: ' + x.ad); } }));
  acts.append(button('✏️ Düzenle', '', () => {
    const a = el('input', 'inp'); a.value = x.ad; a.maxLength = 60;
    const k = el('input', 'inp'); k.value = x.kategori; k.maxLength = 30; k.setAttribute('list', 'dvKategoriler');
    acts.innerHTML = ''; acts.append(a, k, button('Kaydet', 'primary', async () => {
      try { await req('/api/duvar/admin-duzenle', { id: x.id, ad: a.value, kategori: k.value }); toast('Kaydedildi'); await duvarYukle(); if (OyunBG.panelYenile) OyunBG.panelYenile(); renderList(); } catch(e){ toast(e.message); }
    }), button('Vazgeç', '', () => renderList()));
    a.focus();
  }));
  const mInp = el('input'); mInp.type = 'file'; mInp.accept = 'audio/*,.mp3,.m4a,.ogg,.wav'; mInp.hidden = true;
  mInp.onchange = async () => {
    const m = mInp.files[0]; if (!m) return;
    if (m.size > 30 * 1048576){ toast('Müzik en fazla 30 MB olabilir'); return; }
    try { toast('🎵 Müzik yükleniyor…'); const muzik = await parcaYukle(x.id, 'm', m); await req('/api/duvar/admin-muzik', { id: x.id, muzik }); toast('🎵 Müzik eklendi'); await duvarYukle(); if (OyunBG.panelYenile) OyunBG.panelYenile(); renderList(); }
    catch(e){ toast('Müzik yüklenemedi: ' + e.message); }
  };
  acts.append(mInp, button(x.muzik ? '🎵 Müziği değiştir' : '🎵 Müzik ekle', '', () => mInp.click()));
  if (x.muzik) acts.append(dangerBtn('🔇 Müziği kaldır', async () => { try { await req('/api/duvar/admin-muzik', { id: x.id, muzik: null }); toast('Müzik kaldırıldı'); await duvarYukle(); if (OyunBG.panelYenile) OyunBG.panelYenile(); renderList(); } catch(e){ toast(e.message); } }));
  acts.append(dangerBtn('🗑 Sil', async () => {
    try { if (typeof OyunBG !== 'undefined' && OyunBG.current === 'p:' + x.id) OyunBG.set(null); await req('/api/duvar/admin-sil', { id: x.id }); toast('Silindi'); await duvarYukle(); if (OyunBG.panelYenile) OyunBG.panelYenile(); renderList(); } catch(e){ toast(e.message); }
  }));
  r.append(im, bilgi, acts);
  return r;
}

/* ================= 🔤 Kelimeler (Tabu / Çiz) ================= */
const KL = { d: null, oyun: 'tabu', q: '', duzenle: null };
const kk = s => String(s || '').toLocaleLowerCase('tr-TR');
// arama sırası: tam eşleşme → ile başlayan → kelimede geçen → yasaklılarda geçen
const puan = (w, q) => { const x = trLow(w); return x === q ? 0 : x.startsWith(q) ? 1 : x.includes(q) ? 2 : 3; };
async function kelimeYukle(){
  try { const r = await fetch('/api/kelime/liste', { cache: 'no-store' }); KL.d = r.ok ? await r.json() : null; } catch(e){}
  KL.d = KL.d || { tabu: { ekle: [], sil: [] }, ciz: { ekle: [], sil: [] } };
}
// yerleşik liste + panel değişiklikleri
function tabuGorunum(){
  const ekle = new Map(KL.d.tabu.ekle.map(c => [kk(c.w), c])), sil = new Set(KL.d.tabu.sil);
  const out = [], gor = new Set();
  (typeof TabuCore !== 'undefined' ? TabuCore.CARDS : []).forEach(c => { const k = kk(c.w); gor.add(k); const e = ekle.get(k); out.push({ w: c.w, y: e ? e.y : c.y, durum: sil.has(k) ? 'silindi' : e ? 'duzen' : '' }); });
  KL.d.tabu.ekle.forEach(c => { const k = kk(c.w); if (!gor.has(k)) out.push({ w: c.w, y: c.y, durum: sil.has(k) ? 'silindi' : 'yeni' }); });
  return out;
}
function cizGorunum(){
  const sil = new Set(KL.d.ciz.sil), out = [], gor = new Set();
  (typeof CizCore !== 'undefined' ? CizCore.WORDS : []).forEach(w => { const k = kk(w); if (gor.has(k)) return; gor.add(k); out.push({ w, durum: sil.has(k) ? 'silindi' : '' }); });
  KL.d.ciz.ekle.forEach(w => { const k = kk(w); if (gor.has(k)) return; gor.add(k); out.push({ w, durum: sil.has(k) ? 'silindi' : 'yeni' }); });
  return out;
}
async function kelimeIslem(yol, govde, mesaj){
  try { const d = await req('/api/kelime/' + yol, govde); if (d.liste) KL.d = d.liste; if (mesaj) toast(mesaj); renderList(); return true; }
  catch(e){ toast(e.message); return false; }
}
function renderKelime(list){
  const tabu = tabuGorunum(), ciz = cizGorunum();
  const seg = el('div', 'seg');
  [['tabu', '🃏 Tabu (' + tabu.filter(c => c.durum !== 'silindi').length + ' kart)'], ['ciz', '🎨 Çiz ve Tahmin Et (' + ciz.filter(c => c.durum !== 'silindi').length + ' kelime)']].forEach(([k, n]) => {
    const b = el('button', KL.oyun === k ? 'on' : '', n); b.type = 'button'; b.onclick = () => { KL.oyun = k; KL.q = ''; KL.duzenle = null; renderList(); }; seg.append(b);
  });
  list.append(seg, note('Değişiklikler sitede bir sonraki açılışta (sayfa yenilenince) geçerli olur; oyun oynanırken masa sahibinin listesi kullanılır.'));
  if (KL.oyun === 'tabu') renderTabu(list, tabu); else renderCiz(list, ciz);
}
function renderTabu(list, kartlar){
  const f = el('div', 'ad-box kl-form');
  const d = KL.duzenle;
  f.append(el('h3', '', d ? '✏️ Kartı düzenle: ' + d.w : '➕ Yeni Tabu kartı'));
  const w = el('input', 'inp'); w.placeholder = 'Anlatılacak kelime'; w.maxLength = 40; if (d) w.value = d.w;
  const ys = [0, 1, 2, 3, 4].map(i => { const x = el('input', 'inp'); x.placeholder = 'Yasaklı ' + (i + 1); x.maxLength = 30; if (d && d.y[i]) x.value = d.y[i]; return x; });
  const yk = el('div', 'kl-yasak'); ys.forEach(x => yk.append(x));
  const kaydet = button(d ? '💾 Kaydet' : '➕ Kartı ekle', 'primary', async () => {
    const y = ys.map(x => x.value.trim()).filter(Boolean);
    if (!w.value.trim()){ toast('Kelimeyi yaz'); w.focus(); return; }
    if (y.length < 3){ toast('En az 3 yasaklı kelime yaz'); return; }
    if (await kelimeIslem('admin-tabu', { w: w.value.trim(), y }, d ? 'Kart güncellendi' : 'Kart eklendi: ' + w.value.trim())) KL.duzenle = null;
  });
  f.append(w, yk, note('Aynı kelimeyle kart varsa yasaklı kelimeleri güncellenir.'));
  const ar = el('div', 'u-acts start'); ar.append(kaydet); if (d) ar.append(button('Vazgeç', '', () => { KL.duzenle = null; renderList(); }));
  f.append(ar);
  list.append(f);
  // arama + liste
  const ara = el('input', 'inp'); ara.placeholder = '🔎 Kart ara (kelime ya da yasaklı)'; ara.value = KL.q;
  const kutu = el('div', 'kl-liste');
  const ciz = () => {
    kutu.innerHTML = '';
    const q = trLow(KL.q.trim());
    const s = kartlar.filter(c => c.durum !== 'silindi' && (!q || trLow(c.w + ' ' + c.y.join(' ')).includes(q)));
    const yeniler = q ? s.slice().sort((a, b) => puan(a.w, q) - puan(b.w, q)) : s.filter(c => c.durum).concat(s.filter(c => !c.durum));
    yeniler.slice(0, 120).forEach(c => {
      const r = el('div', 'kl-kart');
      const t = el('div', 'kl-metin'); const b = el('b', '', c.w);
      if (c.durum === 'yeni') b.append(el('span', 'pill ok', 'eklendi')); if (c.durum === 'duzen') b.append(el('span', 'pill wait', 'düzenlendi'));
      t.append(b, el('span', 'ad-muted', c.y.join(' · ')));
      const a = el('div', 'u-acts');
      a.append(button('✏️', '', () => { KL.duzenle = c; renderList(); scrollTo({ top: 0, behavior: 'smooth' }); }));
      a.append(dangerBtn('🗑', () => kelimeIslem('admin-tabu-sil', { w: c.w }, 'Kart silindi: ' + c.w)));
      r.append(t, a); kutu.append(r);
    });
    if (s.length > 120) kutu.append(note(s.length + ' karttan ilk 120 gösteriliyor; aramayla daralt.'));
    if (!s.length) kutu.append(note('Eşleşen kart yok.'));
  };
  ara.oninput = () => { KL.q = ara.value; ciz(); };
  const lb = el('div', 'ad-box'); lb.append(el('h3', '', '🃏 Kartlar'), ara, kutu); list.append(lb); ciz();
  silinenler(list, kartlar.filter(c => c.durum === 'silindi'), c => kelimeIslem('admin-tabu-geri', { w: c.w }, 'Geri alındı: ' + c.w));
}
function renderCiz(list, kelimeler){
  const f = el('div', 'ad-box');
  f.append(el('h3', '', '➕ Yeni kelimeler'));
  const ta = el('textarea', 'inp'); ta.rows = 3; ta.placeholder = 'Kelimeleri virgülle ya da alt alta yaz (ör. kahve makinesi, uçurtma, Kaan’ın arabası)';
  f.append(ta, button('➕ Ekle', 'primary', async () => {
    const k = ta.value.split(/[,\n]/).map(x => x.trim()).filter(x => x.length >= 2);
    if (!k.length){ toast('Kelime yaz'); return; }
    await kelimeIslem('admin-ciz', { kelimeler: k }, k.length + ' kelime eklendi');
  }));
  list.append(f);
  const ara = el('input', 'inp'); ara.placeholder = '🔎 Kelime ara'; ara.value = KL.q;
  const kutu = el('div', 'kl-chips');
  const ciz = () => {
    kutu.innerHTML = '';
    const q = trLow(KL.q.trim());
    const s = kelimeler.filter(c => c.durum !== 'silindi' && (!q || trLow(c.w).includes(q)));
    const sirali = q ? s.slice().sort((a, b) => puan(a.w, q) - puan(b.w, q)) : s.filter(c => c.durum).concat(s.filter(c => !c.durum));
    sirali.slice(0, 300).forEach(c => {
      const ch = el('span', 'kl-chip' + (c.durum === 'yeni' ? ' yeni' : ''), c.w);
      const x = el('button', '', '✕'); x.type = 'button'; x.title = 'Sil'; x.onclick = () => kelimeIslem('admin-ciz-sil', { w: c.w }, 'Silindi: ' + c.w);
      ch.append(x); kutu.append(ch);
    });
    if (s.length > 300) kutu.append(note(s.length + ' kelimeden ilk 300 gösteriliyor; aramayla daralt.'));
    if (!s.length) kutu.append(note('Eşleşen kelime yok.'));
  };
  ara.oninput = () => { KL.q = ara.value; ciz(); };
  const lb = el('div', 'ad-box'); lb.append(el('h3', '', '🎨 Kelimeler'), ara, kutu); list.append(lb); ciz();
  silinenler(list, kelimeler.filter(c => c.durum === 'silindi'), c => kelimeIslem('admin-ciz-geri', { w: c.w }, 'Geri alındı: ' + c.w));
}
function silinenler(list, s, geri){
  if (!s.length) return;
  const d = el('details', 'ad-box'); d.append(el('summary', '', '🗑 Silinenler (' + s.length + ')'));
  s.forEach(c => { const r = el('div', 'ad-mini'); r.append(el('span', '', c.w), button('↩ Geri al', '', () => geri(c))); d.append(r); });
  list.append(d);
}
