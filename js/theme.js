// Görünüm: Standart / Cyberpunk / LED. Seçim bu cihazda saklanır (herkes kendi görünümünü seçer).
// LED modunda renk (ya da Otomatik RGB), ışık stili (kayan / nabız / sabit), hız ve parlaklık ayarlanır.
const THEME_KEY = 'oyunodasi-tema';
const LED_COLORS = [
  ['auto', 'Otomatik (RGB)'], ['#00e5ff', 'Buz mavisi'], ['#2f7bff', 'Mavi'], ['#8b5cff', 'Mor'], ['#ff3df2', 'Pembe'],
  ['#ff2a4d', 'Kırmızı'], ['#ff8a00', 'Turuncu'], ['#ffe600', 'Sarı'], ['#39ff14', 'Neon yeşil'], ['#ffffff', 'Beyaz']
];
const THEME_DEFAULT = { mode: 'standart', color: 'auto', style: 'kayan', speed: 3, glow: 2 };
let theme = (() => {
  try { return Object.assign({}, THEME_DEFAULT, JSON.parse(localStorage.getItem(THEME_KEY) || '{}')); } catch(e){ return Object.assign({}, THEME_DEFAULT); }
})();

function hexToRgb(h){ const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function shiftHue(hex, deg){
  let [r, g, b] = hexToRgb(hex).map(x => x / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn){
    const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
  }
  h = (h + deg + 360) % 360;
  return 'hsl(' + Math.round(h) + ' ' + Math.round(Math.max(s, .7) * 100) + '% ' + Math.round(Math.min(Math.max(l, .45), .65) * 100) + '%)';
}
const inkFor = hex => { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#06120d' : '#ffffff'; };

function applyTheme(){
  const html = document.documentElement, st = html.style;
  const mode = ['standart', 'cyber', 'led'].includes(theme.mode) ? theme.mode : 'standart';
  if (mode === 'standart') delete html.dataset.tema; else html.dataset.tema = mode;
  html.dataset.led = ['kayan', 'nabiz', 'sabit'].includes(theme.style) ? theme.style : 'kayan';
  const auto = theme.color === 'auto' || !/^#[0-9a-f]{6}$/i.test(theme.color);
  html.dataset.ledauto = auto ? '1' : '0';
  ['--led-1', '--led-2', '--accent', '--accent-ink'].forEach(v => st.removeProperty(v));
  st.setProperty('--led-speed', [7, 4.5, 2.8, 1.8, 1.1][Math.min(4, Math.max(0, (theme.speed | 0) - 1))] + 's');
  st.setProperty('--led-glow', [0, 8, 14, 22][Math.min(3, Math.max(0, theme.glow | 0))] + 'px');
  if (mode === 'led' && !auto){
    st.setProperty('--led-1', theme.color);
    st.setProperty('--led-2', shiftHue(theme.color, 40));
    st.setProperty('--accent', theme.color);
    st.setProperty('--accent-ink', inkFor(theme.color));
  }
  // kayan ışık için tarayıcının @property desteği gerekir; yoksa yedek animasyon kullanılır
  html.dataset.ledfb = window.CSS && CSS.registerProperty ? '0' : '1';
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = mode === 'cyber' ? '#07060d' : mode === 'led' ? '#07080c' : '#0f1218';
}
function saveTheme(){ try { localStorage.setItem(THEME_KEY, JSON.stringify(theme)); } catch(e){} applyTheme(); renderThemeDlg(); }
applyTheme();

function renderThemeDlg(){
  const box = $('temaBody'); if (!box) return;
  box.querySelectorAll('.tema-mode').forEach(b => b.classList.toggle('on', b.dataset.mode === theme.mode));
  $('temaLed').hidden = theme.mode === 'standart';
  $('temaColorsRow').hidden = theme.mode !== 'led';
  $('temaStyleRow').hidden = theme.mode !== 'led';
  box.querySelectorAll('.tema-sw').forEach(b => b.classList.toggle('on', b.dataset.c === theme.color));
  box.querySelectorAll('[data-style]').forEach(b => b.classList.toggle('on', b.dataset.style === theme.style));
  $('temaSpeed').value = theme.speed; $('temaGlow').value = theme.glow;
  if (/^#[0-9a-f]{6}$/i.test(theme.color)) $('temaCustom').value = theme.color;
}
let openThemeDlg = function(){ renderThemeDlg(); $('temaDlg').showModal(); };
(function initThemeDlg(){
  const cols = $('temaColors');
  LED_COLORS.forEach(([c, name]) => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'tema-sw' + (c === 'auto' ? ' auto' : ''); b.dataset.c = c; b.title = name; b.setAttribute('aria-label', name);
    if (c !== 'auto'){ b.style.background = c; b.style.color = c; }
    b.onclick = () => { theme.color = c; if (theme.mode !== 'led') theme.mode = 'led'; saveTheme(); };
    cols.append(b);
  });
  $('temaCustom').oninput = e => { theme.color = e.target.value; theme.mode = 'led'; saveTheme(); };
  document.querySelectorAll('#temaBody .tema-mode').forEach(b => { b.onclick = () => { theme.mode = b.dataset.mode; saveTheme(); }; });
  document.querySelectorAll('#temaBody [data-style]').forEach(b => { b.onclick = () => { theme.style = b.dataset.style; saveTheme(); }; });
  $('temaSpeed').oninput = e => { theme.speed = +e.target.value; saveTheme(); };
  $('temaGlow').oninput = e => { theme.glow = +e.target.value; saveTheme(); };
  $('temaReset').onclick = () => { theme = Object.assign({}, THEME_DEFAULT); saveTheme(); if (typeof OyunBG !== 'undefined'){ OyunBG.set(null); renderBgPicker(); } if (typeof OyunHava !== 'undefined'){ OyunHava.set(null); renderHavaPicker(); } };
  ['temaBtn', 'temaBtn2'].forEach(id => { const b = $(id); if (b) b.onclick = openThemeDlg; });
})();

// ---------- arka plan (js/backgrounds.js) ----------
function bgState(){ const p = typeof OyunBG !== 'undefined' && OyunBG.saved ? OyunBG.saved() : null; return { id: (typeof OyunBG !== 'undefined' && OyunBG.current) || 'yok', animate: p && p.animate !== undefined ? !!p.animate : true, dim: p && p.dim !== undefined ? +p.dim : 0.25 }; }
function renderBgPicker(){
  const box = $('bgPicks'); if (!box || typeof OyunBG === 'undefined') return;
  const st = bgState();
  if (!box.children.length){
    let lastGrup = null;
    OyunBG.list.forEach(item => {
      if (item.grup && item.grup !== lastGrup && item.grup !== 'Genel'){ lastGrup = item.grup; const h = document.createElement('div'); h.className = 'bg-grup'; h.textContent = item.grup; box.append(h); }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'bg-pick'; b.dataset.bg = item.id; b.title = item.desc || item.name;
      const cv = document.createElement('canvas'); cv.width = 320; cv.height = 200;
      const t = document.createElement('span'); t.textContent = (item.icon ? item.icon + ' ' : '') + item.name;
      b.append(cv, t);
      b.onclick = async () => {
        if (item.id === 'ozel' && OyunBG.hasCustom && !(await OyunBG.hasCustom())){ $('bgOzelFile').click(); return; }
        const s2 = bgState(); OyunBG.set(item.id, { animate: s2.animate, dim: s2.dim }); renderBgPicker();
      };
      box.append(b);
    });
    // önizlemeler pencere açıldıktan sonra sırayla çizilsin (pencere takılmasın)
    [...box.querySelectorAll('.bg-pick')].forEach((b, i) => setTimeout(() => { try { OyunBG.thumb(b.dataset.bg, b.querySelector('canvas')); } catch(e){} }, 60 + i * 40));
  }
  box.querySelectorAll('.bg-pick').forEach(b => b.classList.toggle('on', b.dataset.bg === st.id));
  document.querySelectorAll('[data-bganim]').forEach(b => b.classList.toggle('on', (b.dataset.bganim === '1') === st.animate));
  $('bgDim').value = Math.round(st.dim * 100);
  if (OyunBG.hasCustom) OyunBG.hasCustom().then(has => {
    $('bgOzelSil').hidden = !has;
    $('bgOzelSec').textContent = has ? '📷 Görseli değiştir' : '📷 Görsel seç';
    $('bgEfekt').hidden = !has;
    document.querySelectorAll('[data-efekt]').forEach(b => b.classList.toggle('on', b.dataset.efekt === OyunBG.efekt));
  });
}
(function initBg(){
  if (typeof OyunBG === 'undefined' || !$('bgPicks')) return;
  document.querySelectorAll('[data-bganim]').forEach(b => { b.onclick = () => { const s = bgState(); OyunBG.set(s.id === 'yok' ? null : s.id, { animate: b.dataset.bganim === '1', dim: s.dim }); renderBgPicker(); }; });
  $('bgOzelSec').onclick = () => $('bgOzelFile').click();
  $('bgOzelFile').onchange = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      await OyunBG.setCustomImage(f);
      const c = document.querySelector('.bg-pick[data-bg="ozel"] canvas'); if (c) OyunBG.thumb('ozel', c);
      renderBgPicker(); toast('🖼 Arka plan görselin ayarlandı (sadece bu cihazda)');
    } catch(err){ toast(err.message || 'Görsel ayarlanamadı'); }
  };
  $('bgOzelSil').onclick = async () => { await OyunBG.removeCustom(); const c = document.querySelector('.bg-pick[data-bg="ozel"] canvas'); if (c) OyunBG.thumb('ozel', c); renderBgPicker(); };
  document.querySelectorAll('[data-efekt]').forEach(b => { b.onclick = () => { const s = bgState(); OyunBG.set('ozel', { efekt: b.dataset.efekt, animate: s.animate, dim: s.dim }); renderBgPicker(); }; });
  $('bgDim').oninput = e => { const s = bgState(); if (s.id !== 'yok') OyunBG.set(s.id, { animate: s.animate, dim: e.target.value / 100 }); };
  const open0 = openThemeDlg;
  openThemeDlg = function(){ open0(); renderBgPicker(); };
  ['temaBtn', 'temaBtn2'].forEach(id => { const b = $(id); if (b) b.onclick = openThemeDlg; });
})();

// ---------- hava durumu (js/hava.js) ----------
function renderHavaPicker(){
  const box = $('havaPicks'); if (!box || typeof OyunHava === 'undefined') return;
  if (!box.children.length){
    OyunHava.list.forEach(h => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'hava-pick'; b.dataset.hava = h.id; b.title = h.desc || h.name;
      const i = document.createElement('span'); i.className = 'hava-ico'; i.textContent = h.icon;
      const t = document.createElement('span'); t.textContent = h.name;
      b.append(i, t);
      b.onclick = () => { OyunHava.set(h.id === 'yok' ? null : h.id, { yogunluk: +$('havaYog').value || OyunHava.yogunluk }); renderHavaPicker(); };
      box.append(b);
    });
  }
  const cur = OyunHava.current || 'yok';
  box.querySelectorAll('.hava-pick').forEach(b => b.classList.toggle('on', b.dataset.hava === cur));
  $('havaYog').value = OyunHava.yogunluk || 0.6;
  $('havaAyar').hidden = cur === 'yok';
  $('havaTemizle').textContent = cur === 'kar' ? '🧹 Karı temizle' : cur === 'yaprak' ? '🧹 Yaprakları temizle' : '🧹 Damlaları sil';
}
(function initHava(){
  if (typeof OyunHava === 'undefined' || !$('havaPicks')) return;
  $('havaYog').oninput = e => { if (OyunHava.current && OyunHava.current !== 'yok') OyunHava.set(OyunHava.current, { yogunluk: +e.target.value }); };
  $('havaTemizle').onclick = () => OyunHava.clear();
  const open1 = openThemeDlg;
  openThemeDlg = function(){ open1(); renderHavaPicker(); };
  ['temaBtn', 'temaBtn2'].forEach(id => { const b = $(id); if (b) b.onclick = openThemeDlg; });
})();
