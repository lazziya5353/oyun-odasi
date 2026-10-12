// Gizli oda: yönetici yetki verdiği üye, açtığı odayı gizli açabilir. Gizli odada kimseye "oda açıldı" bildirimi gitmez,
// girişteki "Şu an açık odalar" listesinde görünmez. Kodu verdiği kişi odaya normal girer; odanın gizli olduğunu görmez
// (🔒 işaretini sadece odayı açan görür). Odada her şey normal odadaki gibidir.
const GIZLI_KEY = 'oyunodasi-gizli-odalar';
function gizliListe(){ try { const o = JSON.parse(localStorage.getItem(GIZLI_KEY) || '{}'); const n = Date.now(); for (const k in o) if (n - o[k] > 864e5) delete o[k]; return o; } catch(e){ return {}; } }
function gizliIsaretle(code){ const o = gizliListe(); o[code] = Date.now(); try { localStorage.setItem(GIZLI_KEY, JSON.stringify(o)); } catch(e){} }
function gizliOdaMi(code){ code = code || (typeof roomCode !== 'undefined' ? roomCode : ''); return !!code && !!gizliListe()[code]; }
function gizliYetkim(){ return !!(typeof account !== 'undefined' && account && account.uye && account.uye.gizliOda); }
// lobide "🔒 Gizli oda aç" seçeneği sadece yetkisi olan üyeye görünür
function gizliSecGuncelle(){ const s = document.getElementById('gizliSec'); if (s){ s.hidden = !gizliYetkim(); if (s.hidden) document.getElementById('gizliCb').checked = false; } }
// odadayken sadece açan kişi küçük bir 🔒 görür
function gizliRozet(){ const r = document.getElementById('gizliRozet'); if (r) r.hidden = !gizliOdaMi(); }
