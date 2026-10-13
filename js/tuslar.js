// Tuş atamaları: klavyeyle oynanan oyunlarda herkes tuşları kendine göre değiştirebilir (sadece kendi bilgisayarında;
// tarayıcıda saklanır). Oyun kendini TUS.tanim ile kaydeder, tuşa basılınca TUS.eylem(oyun, e.code) ile ne yapılacağını sorar.
// Oyunun üst çubuğundaki "⌨️ Tuşlar" ya da TUS.ac(oyun) değiştirme penceresini açar.
// Bir tuş başka bir eyleme verilirse oradan alınır (aynı tuş iki işi birden yapmaz).
(function(){
  const KEY = 'oyunodasi-tuslar';
  const tanimlar = new Map();          // oyun → { baslik, eylemler: [{ id, ad, vars: [kod] }] }
  let kayit = {};
  try { kayit = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch(e){ kayit = {}; }
  const sakla = () => { try { localStorage.setItem(KEY, JSON.stringify(kayit)); } catch(e){} };

  const ADLAR = { Space: 'Boşluk', Enter: 'Enter', Escape: 'Esc', Tab: 'Tab', Backspace: '⌫', ShiftLeft: 'Sol Shift', ShiftRight: 'Sağ Shift',
    ControlLeft: 'Sol Ctrl', ControlRight: 'Sağ Ctrl', AltLeft: 'Alt', AltRight: 'Alt Gr', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Comma: 'Ö', Period: 'Ç', Semicolon: 'Ş', Quote: 'İ', BracketLeft: 'Ğ', BracketRight: 'Ü', Slash: '.', Backslash: ',', Minus: '*', Equal: '-', Backquote: '"',
    CapsLock: 'Caps Lock' };
  function ad(kod){
    if (!kod) return '—';
    const yakalanan = kayit.__ad && kayit.__ad[kod];          // basıldığı anda klavyede ne yazdığı (Ö, Ç, Ş…)
    if (yakalanan) return yakalanan;
    if (ADLAR[kod]) return ADLAR[kod];
    let m = kod.match(/^Key([A-Z])$/); if (m) return m[1] === 'I' ? 'I' : m[1];
    m = kod.match(/^Digit(\d)$/); if (m) return m[1];
    m = kod.match(/^Numpad(.+)$/); if (m) return 'Num ' + m[1];
    return kod;
  }
  // geçerli atama: oyuncunun değiştirdiği varsa o, yoksa varsayılan
  function harita(oyun){
    const t = tanimlar.get(oyun); if (!t) return {};
    const k = kayit[oyun] || {}, h = {};
    t.eylemler.forEach(e => { h[e.id] = Array.isArray(k[e.id]) ? k[e.id].slice() : e.vars.slice(); });
    return h;
  }
  const onbellek = new Map();          // oyun → { kod → eylem }
  function ters(oyun){
    if (onbellek.has(oyun)) return onbellek.get(oyun);
    const h = harita(oyun), r = {};
    Object.keys(h).forEach(id => h[id].forEach(kod => { if (!(kod in r)) r[kod] = id; }));
    onbellek.set(oyun, r); return r;
  }
  function degisti(oyun){
    onbellek.delete(oyun); sakla();
    try { window.dispatchEvent(new CustomEvent('tuslar-degisti', { detail: { oyun } })); } catch(e){}
  }
  function ata(oyun, id, kod, tus){
    if (tus && tus.length === 1 && tus.trim()){ kayit.__ad = kayit.__ad || {}; kayit.__ad[kod] = tus.toLocaleUpperCase('tr-TR'); }
    const h = harita(oyun);
    Object.keys(h).forEach(x => { h[x] = h[x].filter(k => k !== kod); });      // başka eylemdeyse oradan al
    h[id] = [kod];
    kayit[oyun] = h; degisti(oyun);
  }
  function sifirla(oyun){ delete kayit[oyun]; degisti(oyun); }

  // ---------- değiştirme penceresi ----------
  let dlg = null, bekleyen = null;
  function pencere(){
    if (dlg) return dlg;
    dlg = document.createElement('dialog'); dlg.id = 'tusDlg'; dlg.className = 'tus-dlg';
    dlg.innerHTML = '<div class="dlg-head"><h3>⌨️ Tuşlar</h3><button type="button" class="btn small" data-kapat>Kapat</button></div><div class="dlg-body"></div>';
    dlg.querySelector('[data-kapat]').onclick = () => dlg.close();
    dlg.addEventListener('close', () => { bekleyen = null; });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    // tuş yakalama: pencere açıkken basılan tuş oyuna gitmez
    dlg.addEventListener('keydown', e => {
      if (!bekleyen) return;
      e.preventDefault(); e.stopPropagation();
      if (e.code === 'Escape'){ bekleyen = null; ciz(dlg.dataset.oyun); return; }
      if (!e.code || /^(Meta|OS)/.test(e.code)) return;
      ata(dlg.dataset.oyun, bekleyen, e.code, e.key); bekleyen = null; ciz(dlg.dataset.oyun);
    }, true);
    document.body.append(dlg);
    return dlg;
  }
  function ciz(oyun){
    const t = tanimlar.get(oyun), g = dlg.querySelector('.dlg-body'); g.innerHTML = '';
    dlg.querySelector('h3').textContent = '⌨️ Tuşlar · ' + t.baslik;
    const n = document.createElement('p'); n.className = 'note';
    n.textContent = 'Değiştirmek istediğin işin yanındaki tuşa tıkla, sonra yeni tuşa bas. Ayar sadece senin bilgisayarında geçerli.';
    g.append(n);
    const h = harita(oyun), liste = document.createElement('div'); liste.className = 'tus-liste';
    t.eylemler.forEach(e => {
      const r = document.createElement('div'); r.className = 'tus-satir';
      const s = document.createElement('span'); s.textContent = e.ad;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tus-kbd' + (bekleyen === e.id ? ' bekliyor' : '');
      b.textContent = bekleyen === e.id ? 'Bir tuşa bas…' : (h[e.id].length ? h[e.id].map(ad).join(' / ') : '— (atanmadı)');
      b.onclick = () => { bekleyen = bekleyen === e.id ? null : e.id; ciz(oyun); const y = dlg.querySelector('.tus-kbd.bekliyor'); if (y) y.focus(); };
      r.append(s, b); liste.append(r);
    });
    g.append(liste);
    const alt = document.createElement('div'); alt.className = 'row';
    const sf = document.createElement('button'); sf.type = 'button'; sf.className = 'btn small'; sf.textContent = '↺ Varsayılana dön';
    sf.disabled = !kayit[oyun];
    sf.onclick = () => { sifirla(oyun); bekleyen = null; ciz(oyun); };
    alt.append(sf); g.append(alt);
  }

  window.TUS = {
    tanim(oyun, baslik, eylemler){ tanimlar.set(oyun, { baslik, eylemler }); onbellek.delete(oyun); },
    var: oyun => tanimlar.has(oyun),
    eylem: (oyun, kod) => (tanimlar.has(oyun) ? ters(oyun)[kod] || null : null),
    kodlar: (oyun, id) => harita(oyun)[id] || [],
    ad,
    etiket: (oyun, id) => { const k = harita(oyun)[id] || []; return k.length ? k.map(ad).join(' / ') : '—'; },
    ac(oyun){
      if (!tanimlar.has(oyun)) return;
      pencere(); dlg.dataset.oyun = oyun; bekleyen = null; ciz(oyun);
      try { if (!dlg.open) dlg.showModal(); } catch(e){ dlg.setAttribute('open', ''); }
    },
    acikMi: () => !!(dlg && dlg.open)
  };

  // ---------- oyunların varsayılan tuşları ----------
  TUS.tanim('vampir', 'Vampir Köy', [
    { id: 'u', ad: '⬆️ Yukarı', vars: ['ArrowUp', 'KeyW'] },
    { id: 'd', ad: '⬇️ Aşağı', vars: ['ArrowDown', 'KeyS'] },
    { id: 'l', ad: '⬅️ Sola', vars: ['ArrowLeft', 'KeyA'] },
    { id: 'r', ad: '➡️ Sağa', vars: ['ArrowRight', 'KeyD'] },
    { id: 'kullan', ad: '✋ Kullan (görev / çan)', vars: ['KeyE', 'Space'] },
    { id: 'isir', ad: '🩸 Isır (vampir)', vars: ['KeyQ'] },
    { id: 'bildir', ad: '📢 Ceset bildir', vars: ['KeyR'] },
    { id: 'sabotaj', ad: '🌑 Fener söndür (vampir)', vars: ['KeyF'] },
    { id: 'mezar', ad: '🪦 Mezardan geç (vampir)', vars: ['KeyV'] }
  ]);
  TUS.tanim('kosu', 'Engel Koşusu', [
    { id: 'zipla', ad: '⤴️ Zıpla / başla', vars: ['Space', 'ArrowUp', 'KeyW'] },
    { id: 'egil', ad: '⤵️ Eğil', vars: ['ArrowDown', 'KeyS'] },
    { id: 'dur', ad: '⏸ Duraklat', vars: ['KeyP'] }
  ]);
  TUS.tanim('yilan', 'Yılan', [
    { id: 'up', ad: '⬆️ Yukarı', vars: ['ArrowUp', 'KeyW'] },
    { id: 'down', ad: '⬇️ Aşağı', vars: ['ArrowDown', 'KeyS'] },
    { id: 'left', ad: '⬅️ Sola', vars: ['ArrowLeft', 'KeyA'] },
    { id: 'right', ad: '➡️ Sağa', vars: ['ArrowRight', 'KeyD'] },
    { id: 'dur', ad: '⏸ Duraklat', vars: ['KeyP'] }
  ]);
})();
