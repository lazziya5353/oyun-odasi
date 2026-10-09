// Küçük yardımcılar: tüm dosyalar bunları kullanır.
const $ = id => document.getElementById(id);

const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
};

function toast(msg){
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toast.tm); toast.tm = setTimeout(() => t.hidden = true, 3000);
}

function genCode(){
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
const rid = () => Math.random().toString(36).slice(2, 9);
const clip = (s, n) => String(s == null ? '' : s).slice(0, n);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.matchMedia('(max-width: 860px)').matches;

// Türkçe harfleri çevir, sadece harf/rakam bırak
function cleanCode(s){
  const map = { 'Ç':'C','Ğ':'G','İ':'I','I':'I','Ö':'O','Ş':'S','Ü':'U' };
  return String(s || '').toLocaleUpperCase('tr-TR').replace(/[ÇĞİIÖŞÜ]/g, ch => map[ch] || ch).replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

function fmtTime(sec){
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}
const hhmm = ts => new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

// Pencerelerdeki "Kapat" düğmeleri
document.querySelectorAll('dialog [data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());
// Pencerenin dışına tıklayınca kapansın
document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
