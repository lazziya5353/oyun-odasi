// Dinlenme modu: ekranda sadece seçili arka plan (tema) kalır; arayüz gizlenir.
// Sesli sohbet, radyo, müzik aynen devam eder (sadece görünüm gizlenir, hiçbir bağlantıya dokunulmaz).
// Çıkmak: ESC (bilgisayar) ya da ekrana dokunup "✕ Çık" (telefon). Çıkınca kaldığın oda/ekran aynen durur.
(function(){
  let acik = false, geciciTema = false, eskiDim = null, ipucuT = 0, tamEkran = false;
  const ui = document.createElement('div');
  ui.id = 'dinlenUI';
  ui.innerHTML = '<div class="dinlen-ipucu">🌙 Dinlenme modu · çıkmak için <b>ESC</b></div><button type="button" class="dinlen-cik">✕ Çık</button>';
  ui.querySelector('.dinlen-cik').onclick = e => { e.stopPropagation(); kapat(); };
  const dokunmatik = () => { try { return matchMedia('(pointer:coarse)').matches; } catch(e){ return false; } };
  function goster(){
    ui.classList.remove('gizli');
    clearTimeout(ipucuT); ipucuT = setTimeout(() => ui.classList.add('gizli'), 3500);
  }
  function ac(){
    if (acik) return;
    acik = true;
    document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch(e){} });
    if (typeof OyunBG !== 'undefined'){
      // arka plan seçili değilse dinlenme süresince gece sakurası
      if (!OyunBG.current){ geciciTema = true; OyunBG.set('gecesakura', { dim: 0, animate: true, save: false }); }
      OyunBG.pause(false);
    }
    const dim = document.getElementById('bgdim');
    if (dim){ eskiDim = dim.style.opacity; dim.style.opacity = '0'; }
    document.documentElement.classList.add('dinlen');
    ui.querySelector('.dinlen-ipucu').innerHTML = dokunmatik() ? '🌙 Dinlenme modu · çıkmak için ekrana dokun' : '🌙 Dinlenme modu · çıkmak için <b>ESC</b>' + (tus ? ' ya da <b>' + tusAd(tus) + '</b>' : '');
    document.body.append(ui);
    goster();
    tamEkran = false;
    if (!dokunmatik() && document.documentElement.requestFullscreen && !document.fullscreenElement){
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => { tamEkran = true; }).catch(() => {});
    }
    if (typeof hareket === 'function') hareket('ses', '🌙 dinlenme moduna geçti');
  }
  function kapat(){
    if (!acik) return;
    acik = false;
    clearTimeout(ipucuT);
    document.documentElement.classList.remove('dinlen');
    ui.remove();
    const dim = document.getElementById('bgdim');
    if (dim && eskiDim !== null) dim.style.opacity = eskiDim;
    eskiDim = null;
    if (geciciTema && typeof OyunBG !== 'undefined'){ geciciTema = false; const s = OyunBG.saved(); if (s && s.id && s.id !== 'yok') OyunBG.restore(); else OyunBG.set(null, { save: false }); }
    if (document.fullscreenElement && tamEkran) document.exitFullscreen().catch(() => {});
    tamEkran = false;
  }
  // ---------- kısayol tuşu (isteğe bağlı, herkes kendi bilgisayarı için seçer) ----------
  // Örn. Ctrl+P. Tarayıcıların kendine ayırdığı bazı tuşlar (Ctrl+W/T/N gibi) yakalanamadığı için seçilemez.
  const KEY = 'oyunodasi-dinlen-tus';
  let tus = null, yakaliyor = false;
  try { tus = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e){ tus = null; }
  const saklaT = () => { try { if (tus) localStorage.setItem(KEY, JSON.stringify(tus)); else localStorage.removeItem(KEY); } catch(e){} };
  const KOD_AD = { Space: 'Boşluk', Enter: 'Enter', Tab: 'Tab', Backspace: '⌫', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backquote: '"', Minus: '*', Equal: '-' };
  function kodAd(c, key){
    if (KOD_AD[c]) return KOD_AD[c];
    let m = c.match(/^Key([A-Z])$/); if (m) return key && key.length === 1 ? key.toLocaleUpperCase('tr-TR') : m[1];
    m = c.match(/^Digit(\d)$/); if (m) return m[1];
    m = c.match(/^(F\d{1,2})$/); if (m) return m[1];
    return key && key.length === 1 ? key.toLocaleUpperCase('tr-TR') : c;
  }
  const tusAd = t => t ? [t.ctrl ? 'Ctrl' : '', t.alt ? 'Alt' : '', t.shift ? 'Shift' : '', t.meta ? 'Cmd' : '', t.ad].filter(Boolean).join(' + ') : 'Atanmadı';
  const eslesir = (e, t) => t && e.code === t.code && !!e.ctrlKey === !!t.ctrl && !!e.altKey === !!t.alt && !!e.shiftKey === !!t.shift && !!e.metaKey === !!t.meta;
  // tarayıcının elinden alamadığımız tuşlar
  function yasak(t){
    const k = t.code;
    if ((t.ctrl || t.meta) && ['KeyW', 'KeyT', 'KeyN', 'Tab', 'PageUp', 'PageDown'].includes(k)) return 'Bu tuşu tarayıcı kendine ayırıyor (sekme/pencere işlemleri), başka bir tuş seç.';
    if (t.alt && ['F4', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(k)) return 'Bu tuş sistem tarafından kullanılıyor, başka bir tuş seç.';
    if (k === 'F5' || k === 'F11' || k === 'F12' || k === 'F4') return 'Bu tuş tarayıcı işlevlerine ayrılmış, başka bir tuş seç.';
    if (k === 'Escape') return 'Esc zaten dinlenme modundan çıkar.';
    if (!t.ctrl && !t.alt && !t.meta && !/^F\d{1,2}$/.test(k)) return 'Yazı yazarken karışmaması için Ctrl, Alt ya da Cmd ile birlikte bir tuş seç (örn. Ctrl + P).';
    return '';
  }
  let dlg = null, bilgi = '';
  function dlgCiz(){
    const b = dlg.querySelector('.dlg-body');
    b.innerHTML = '<p class="note">Dinlenme modunu tek tuşla açıp kapatmak için istediğin kısayolu ata. Ayar sadece bu bilgisayarda geçerli.</p>' +
      '<div class="tus-satir"><span>🌙 Dinlenme modu</span><button type="button" class="tus-kbd' + (yakaliyor ? ' bekliyor' : '') + '" data-ata>' + (yakaliyor ? 'Tuşlara bas…' : tusAd(tus)) + '</button></div>' +
      (bilgi ? '<p class="note" style="color:var(--danger,#ff8d8d)">' + bilgi + '</p>' : '<p class="note">Değiştirmek için tuşa tıkla, sonra kısayola bas (örn. Ctrl + P).</p>') +
      '<div class="row"><button type="button" class="btn small" data-kaldir' + (tus ? '' : ' disabled') + '>Kısayolu kaldır</button></div>';
    b.querySelector('[data-ata]').onclick = () => { yakaliyor = !yakaliyor; bilgi = ''; dlgCiz(); const y = b.querySelector('.bekliyor'); if (y) y.focus(); };
    b.querySelector('[data-kaldir]').onclick = () => { tus = null; saklaT(); yakaliyor = false; bilgi = ''; dlgCiz(); etiketle(); };
  }
  function tusPenceresi(){
    if (!dlg){
      dlg = document.createElement('dialog'); dlg.id = 'dinlenTusDlg'; dlg.className = 'tus-dlg';
      dlg.innerHTML = '<div class="dlg-head"><h3>⌨️ Dinlenme modu kısayolu</h3><button type="button" class="btn small" data-kapat>Kapat</button></div><div class="dlg-body"></div>';
      dlg.querySelector('[data-kapat]').onclick = () => dlg.close();
      dlg.addEventListener('close', () => { yakaliyor = false; });
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('keydown', e => {
        if (!yakaliyor) return;
        e.preventDefault(); e.stopPropagation();
        if (/^(Control|Shift|Alt|Meta)(Left|Right)$/.test(e.code) || e.code === 'OS' + 'Left' || e.code === 'OSRight') return;   // sadece değiştirici tuşa basıldı: bekle
        if (e.code === 'Escape'){ yakaliyor = false; bilgi = ''; dlgCiz(); return; }
        const t = { code: e.code, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey, ad: kodAd(e.code, e.key) };
        const y = yasak(t);
        if (y){ bilgi = y; dlgCiz(); return; }
        tus = t; saklaT(); yakaliyor = false; bilgi = ''; dlgCiz(); etiketle();
      }, true);
      document.body.append(dlg);
    }
    yakaliyor = false; bilgi = ''; dlgCiz();
    try { if (!dlg.open) dlg.showModal(); } catch(e){ dlg.setAttribute('open', ''); }
  }
  function etiketle(){
    const t = tus ? ' · kısayol: ' + tusAd(tus) : '';
    const bt = document.getElementById('dinlenBtn'); if (bt) bt.title = 'Dinlenme modu: ekranda sadece arka plan kalır, sesli sohbet devam eder (ESC ile çık)' + t;
    const kb = document.getElementById('dinlenTusBtn'); if (kb) kb.title = 'Dinlenme modu kısayolu' + (tus ? ': ' + tusAd(tus) : ' (atanmadı)');
    document.querySelectorAll('.dinlen-tus-satir small').forEach(x => { x.textContent = tusAd(tus); });
  }
  // üst çubuğa ve Görünüm penceresine kısayol düğmesi
  (function(){
    const d = document.getElementById('dinlenBtn');
    if (d && !document.getElementById('dinlenTusBtn')){
      const kb = document.createElement('button'); kb.type = 'button'; kb.id = 'dinlenTusBtn'; kb.className = 'btn small dinlen-top hide-mobile'; kb.textContent = '⌨️';
      kb.onclick = tusPenceresi; d.after(kb);
    }
    const d2 = document.getElementById('dinlenBtn2');
    if (d2 && !document.querySelector('.dinlen-tus-satir')){
      const r = document.createElement('button'); r.type = 'button'; r.className = 'btn small dinlen-tus-satir hide-mobile'; r.style.cssText = 'margin:-6px 0 12px;width:100%';
      r.innerHTML = '⌨️ Dinlenme modu kısayolu: <small></small>'; r.onclick = tusPenceresi; d2.after(r);
    }
    etiketle();
  })();

  document.addEventListener('keydown', e => {
    if (yakaliyor) return;
    if (acik && e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); kapat(); return; }
    if (tus && !e.repeat && eslesir(e, tus) && !(dlg && dlg.open)){
      e.preventDefault(); e.stopPropagation();
      if (acik) kapat(); else ac();
    }
  }, true);
  // tam ekrandayken ESC'yi tarayıcı yakalar: tam ekrandan çıkınca dinlenme modundan da çık
  document.addEventListener('fullscreenchange', () => { if (acik && tamEkran && !document.fullscreenElement) kapat(); });
  // ekrana dokununca / fare oynayınca çıkış düğmesi görünür
  document.addEventListener('pointerdown', () => { if (acik) goster(); }, true);
  document.addEventListener('pointermove', e => { if (acik && e.pointerType === 'mouse') goster(); }, true);
  window.dinlenmeModu = { ac, kapat, get acik(){ return acik; } };
  const b1 = document.getElementById('dinlenBtn'); if (b1) b1.onclick = ac;
  const b2 = document.getElementById('dinlenBtn2'); if (b2) b2.onclick = ac;
  const b3 = document.getElementById('dinlenBtn3'); if (b3) b3.onclick = ac;
})();
