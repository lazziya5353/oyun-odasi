// Şakalar: yönetici panelden odadakilere domates, yumurta, korku efekti… atar; kişinin ekranında birden çıkar.
//
// Nasıl ulaşır: yönetim paneli odaya görünmez bir bağlantıyla (önce oda sahibine, olmazsa odadaki başka birine)
// bağlanır. Bağlantı, sunucunun imzaladığı bir "bilet" taşır; bağlanılan kişi bileti açık anahtarla doğrular ve
// şakayı bilet ile birlikte herkese iletir; alan herkes bileti yine kendisi doğrular.
// Böylece sunucuya sürekli sorgu gerekmez ve efekt anında görünür. Kimse kişi listesinde yönetici görmez.
// Herkes Görünüm penceresinden şaka efektlerini kapatabilir.
(() => {
const SAKA = {
  domates: { ad: 'Domates', ikon: '🍅', fiil: 'domates attı' },
  yumurta: { ad: 'Yumurta', ikon: '🥚', fiil: 'yumurta attı' },
  pasta: { ad: 'Pasta', ikon: '🥧', fiil: 'suratına pasta yapıştırdı' },
  hamsi: { ad: 'Hamsi tokadı', ikon: '🐟', fiil: 'hamsi tokadı attı' },
  korku: { ad: 'Korku', ikon: '👻', fiil: 'korkuttu' },
  orumcek: { ad: 'Örümcek', ikon: '🕷️', fiil: 'örümcek saldı' },
  cam: { ad: 'Ekran kırıldı', ikon: '💥', fiil: 'ekranını kırdı' },
  sarhos: { ad: 'Baş dönmesi', ikon: '🌀', fiil: 'başını döndürdü' },
  donma: { ad: 'Dondur', ikon: '🥶', fiil: 'dondurdu' },
  osuruk: { ad: 'Pırrt', ikon: '💨', fiil: 'pırrt yaptı' },
  korna: { ad: 'Korna', ikon: '📯', fiil: 'korna çaldı' },
  tavuk: { ad: 'Tavuklar', ikon: '🐔', fiil: 'tavuk saldı' },
  konfeti: { ad: 'Konfeti', ikon: '🎉', fiil: 'konfeti patlattı' },
  mesaj: { ad: 'Mesaj', ikon: '📣', fiil: 'mesaj gönderdi' },
  // komik sesler (ekranda küçük bir balon da çıkar)
  pirtuzun: { ad: 'Uzun pırrt', ikon: '💨', fiil: 'upuzun bir pırrt yaptı', tur: 'ses' },
  badumtss: { ad: 'Ba dum tss', ikon: '🥁', fiil: 'ba dum tss çaldı', tur: 'ses' },
  huzun: { ad: 'Hüzünlü trompet', ikon: '🎺', fiil: 'hüzünlü trompet çaldı', tur: 'ses' },
  kriket: { ad: 'Cır cır (sessizlik)', ikon: '🦗', fiil: 'cır cır böceği saldı', tur: 'ses' },
  alkis: { ad: 'Alkış', ikon: '👏', fiil: 'alkışladı', tur: 'ses' },
  yuh: { ad: 'Yuhalama', ikon: '👎', fiil: 'yuhaladı', tur: 'ses' },
  dramatik: { ad: 'Dramatik', ikon: '😱', fiil: 'dramatik müzik çaldı', tur: 'ses' },
  boing: { ad: 'Boing', ikon: '🌀', fiil: 'boing yaptı', tur: 'ses' },
  kaydirak: { ad: 'Kaydırak düdüğü', ikon: '🎢', fiil: 'düdük öttürdü', tur: 'ses' },
  zil: { ad: 'Ring zili', ikon: '🔔', fiil: 'ring zilini çaldı', tur: 'ses' },
  vak: { ad: 'Vak vak', ikon: '🦆', fiil: 'ördek saldı', tur: 'ses' },
  opucuk: { ad: 'Öpücük', ikon: '😘', fiil: 'öpücük gönderdi', tur: 'ses' },
  yanlis: { ad: 'Yanlış cevap', ikon: '❌', fiil: 'yanlış cevap düğmesine bastı', tur: 'ses' },
  dogru: { ad: 'Doğru cevap', ikon: '✅', fiil: 'doğru cevap düğmesine bastı', tur: 'ses' },
  davul: { ad: 'Davul gerilimi', ikon: '🥁', fiil: 'davul çaldı', tur: 'ses' },
  // replik videoları: "replikler" klasöründeki videolar (ad = dosya adı); ekranın ortasında sesli oynar
  replik: { ad: 'Replik', ikon: '🎬', fiil: 'replik attı', tur: 'replik' }
};
// ---------- replik listesi (replikler/liste.json, Netlify her yayında üretir) ----------
let REPLIK = [], replikAt = 0, replikP = null;
const REPLIK_RE = /^[^\/\\]{1,160}\.(mp4|webm|m4v|mov)$/i;
function replikYukle(force){
  if (!force && replikP) return replikP;
  if (!force && Date.now() - replikAt < 3 * 60e3) return Promise.resolve(REPLIK);
  replikP = fetch('replikler/liste.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
    if (d && Array.isArray(d.klipler)) REPLIK = d.klipler.filter(k => k && REPLIK_RE.test(k.dosya)).map(k => ({ dosya: k.dosya, ad: clip(k.ad || k.dosya, 100) }));
    replikAt = Date.now(); replikP = null; return REPLIK;
  }, () => { replikP = null; return REPLIK; });
  return replikP;
}
const replikAd = dosya => { const k = REPLIK.find(x => x.dosya === dosya); return k ? k.ad : String(dosya || '').replace(/\.[^.]+$/, ''); };
const SAKA_KEY = 'oyunodasi-saka';
const sakaAcik = () => store.get(SAKA_KEY) !== 'kapali';

// ---------- odadaki herhangi biri: yönetici bağlantısını doğrula ve şakaları herkese ilet ----------
// (Eskiden sadece oda sahibi iletiyordu; oda sahibinin sayfası eski kaldıysa şaka hiç ulaşmıyordu.)
let sakaPub = null;
const sakaOkSigs = new Map();
// bilet doğrulama: önce tarayıcıda (açık anahtarla), olmazsa sunucuya sorarak.
// Saat farkı sorun olmasın diye süre kontrolü geniş tutulur; asıl kontrolü imza ve sunucu yapar.
async function sakaVerify(b){
  if (!b || typeof b.sig !== 'string' || b.sig.length > 200 || !(Number(b.exp) > Date.now() - 6 * 3600e3)) return false;
  if (sakaOkSigs.get(b.sig) === b.exp) return true;
  let ok = false;
  try {
    if (!sakaPub){
      const { jwk } = await (await fetch('/api/uye/saka-anahtar', { cache: 'no-store' })).json();
      sakaPub = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    }
    const s64 = b.sig.replace(/-/g, '+').replace(/_/g, '/');
    const sig = Uint8Array.from(atob(s64 + '==='.slice((s64.length + 3) % 4)), c => c.charCodeAt(0));
    ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, sakaPub, sig, new TextEncoder().encode('oyunodasi-saka-v1|' + b.exp));
  } catch(e){ ok = false; }
  if (!ok){
    try { ok = !!(await (await fetch('/api/uye/saka-dogrula', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ exp: b.exp, sig: b.sig }) })).json()).ok; } catch(e){}
  }
  if (ok) sakaOkSigs.set(b.sig, b.exp);
  return ok;
}
function sakaAdminConn(conn){
  let ok = false;
  const ticket = conn.metadata && conn.metadata.saka;
  conn.on('open', async () => {
    ok = joined && !!peer && await sakaVerify(ticket);
    if (!ok){ send(conn, { t: 'saka-red', joined }); setTimeout(() => { try { conn.close(); } catch(e){} }, 400); return; }
    sakaRoster(conn);
  });
  conn.on('data', d => {
    if (!ok || !d || typeof d !== 'object') return;
    if (d.t === 'saka-liste') sakaRoster(conn);
    else if (d.t === 'saka') sakaRelay(d, conn, ticket);
    else if (d.t === 'saka-ayar'){ broadcast({ t: 'saka-ayar-yenile', b: { exp: ticket.exp, sig: ticket.sig } }); sakaAyarYukle(true); }
  });
  conn.on('error', () => {});
}
function sakaRoster(conn){
  const list = [{ id: peer.id, name: myName }];
  peers.forEach(p => { if (p.linked && p.helloed) list.push({ id: p.id, name: p.name }); });
  send(conn, { t: 'saka-liste', oda: roomCode, list });
}
function sakaRelay(d, conn, ticket){
  if (!SAKA[d.e]) return;
  const now = Date.now();
  if (now - (conn._sakaT || 0) < 700) return;
  conn._sakaT = now;
  if (d.e === 'replik' && !REPLIK_RE.test(String(d.r || ''))) return;
  const msg = { t: 'saka', e: d.e, to: typeof d.to === 'string' ? d.to : '*', m: clip(d.m || '', 90), b: { exp: ticket.exp, sig: ticket.sig } };
  if (d.e === 'replik') msg.r = d.r;
  broadcast(msg);
  sakaShow(msg);
  send(conn, { t: 'saka-ok', e: d.e, to: msg.to });
}
// başka biri iletti: içindeki yönetici biletini doğrula, sonra göster
function sakaOnData(id, d){
  if (d.t === 'saka-u'){ sakaUOnData(id, d); return true; }
  if (d.t === 'saka-ayar-yenile'){ sakaVerify(d.b).then(ok => { if (ok) sakaAyarYukle(true); }); return true; }
  if (d.t !== 'saka') return false;
  if (SAKA[d.e]) sakaVerify(d.b).then(ok => { if (ok) sakaShow(d); });
  return true;
}
let sakaLast = 0;
const sakaBekleyen = [];
document.addEventListener('visibilitychange', async () => {
  if (document.hidden || !sakaBekleyen.length) return;
  const list = sakaBekleyen.splice(0).filter(x => Date.now() - x.at < 10 * 60e3);
  if (!list.length) return;
  await new Promise(r => setTimeout(r, 400));
  for (const x of list){ await playSaka(x.e, x.m, x.r, x.kimden); await new Promise(r => setTimeout(r, 500)); }
});
// Türkçe yönelme eki: Mert'e, Ayşe'ye, Kaan'a, Ali'ye, Oğuz'a
function yonelme(ad){
  ad = String(ad || '').trim(); if (!ad) return 'birine';
  const v = (ad.toLocaleLowerCase('tr-TR').match(/[aeıioöuü](?=[^aeıioöuü]*$)/) || ['e'])[0];
  const kalin = 'aıou'.includes(v), sonSesli = /[aeıioöuü]$/i.test(ad.toLocaleLowerCase('tr-TR'));
  return ad + '\'' + (sonSesli ? 'y' : '') + (kalin ? 'a' : 'e');
}
function sakaShow(d, kimden, fromId){
  const s = SAKA[d.e];
  const me = peer && peer.id;
  // "herkese": şakayı atan kendi ekranında görmez (sesleri o da duyar)
  if (d.e === 'replik' && !REPLIK_RE.test(String(d.r || ''))) return;
  const toMe = d.to === me || (d.to === '*' && (fromId !== me || s.tur === 'ses' || s.tur === 'replik'));
  const who = d.to === '*' ? 'herkese' : d.to === me ? (fromId === me ? 'kendine' : 'sana') : yonelme((peers.get(d.to) || {}).name || '');
  const fiil = d.e === 'replik' ? '“' + replikAd(d.r) + '” repliğini attı' : s.fiil;
  addSys(s.ikon + ' ' + (kimden || 'Yönetici') + ' ' + who + ' ' + fiil + (d.e === 'mesaj' && d.m ? ': “' + d.m + '”' : '') + '!');
  if (!toMe) return;
  const now = Date.now();
  if (now - sakaLast < 600) return;
  sakaLast = now;
  if (!sakaAcik()){ toast(s.ikon + ' ' + (kimden || 'Yönetici') + ' sana ' + s.fiil + (d.m ? ': “' + d.m + '”' : '') + ' (şaka efektlerin kapalı)'); return; }
  // sekme arka plandaysa tarayıcı animasyonları dondurur: şakayı beklet, sekmeye dönünce oynat
  if (document.hidden){ if (sakaBekleyen.length < 3) sakaBekleyen.push({ e: d.e, m: d.m, r: d.r, kimden: kimden || 'Yönetici', at: now }); return; }
  playSaka(d.e, d.m, d.r, kimden || 'Yönetici');
}

// ---------- ses ----------
function sfx(fn){
  if (typeof deafened !== 'undefined' && deafened) return;
  try {
    ensureCtx();
    if (!audioCtx) return;
    const out = audioCtx.createGain();
    out.gain.value = 0.55 * Math.max(typeof masterVol === 'number' ? masterVol : 1, 0.3);
    out.connect(audioCtx.destination);
    fn(audioCtx, audioCtx.currentTime + 0.01, out);
  } catch(e){}
}
function noiseSrc(ctx, dur){
  const n = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = buf; return s;
}
function env(ctx, t, a, peak, d){
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  return g;
}
function burst(ctx, t, out, { dur = 0.3, type = 'lowpass', f = 900, q = 0.8, peak = 0.8, a = 0.005, sweepTo = 0 }){
  const s = noiseSrc(ctx, dur + a + 0.05), fl = ctx.createBiquadFilter(), g = env(ctx, t, a, peak, dur);
  fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t + a + dur);
  s.connect(fl); fl.connect(g); g.connect(out); s.start(t); s.stop(t + a + dur + 0.05);
}
function osc(ctx, t, out, { type = 'sine', f = 440, to = 0, dur = 0.2, peak = 0.3, a = 0.01, vib = 0, vibF = 6 }){
  const o = ctx.createOscillator(), g = env(ctx, t, a, peak, dur);
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + a + dur);
  if (vib){ const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vibF; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + a + dur + 0.05); }
  o.connect(g); g.connect(out); o.start(t); o.stop(t + a + dur + 0.05);
}
const SES = {
  whoosh: (c, t, o) => burst(c, t, o, { dur: 0.35, type: 'bandpass', f: 400, sweepTo: 2400, q: 1.2, peak: 0.35, a: 0.12 }),
  splat: (c, t, o, big) => { burst(c, t, o, { dur: big ? 0.45 : 0.28, f: big ? 700 : 1100, peak: 1 }); osc(c, t, o, { f: 140, to: 50, dur: 0.18, peak: 0.6 }); },
  crack: (c, t, o) => { burst(c, t, o, { dur: 0.05, type: 'highpass', f: 2500, peak: 0.7 }); burst(c, t + 0.06, o, { dur: 0.04, type: 'highpass', f: 3500, peak: 0.5 }); },
  slap: (c, t, o) => { burst(c, t, o, { dur: 0.12, type: 'bandpass', f: 1800, q: 0.6, peak: 1, a: 0.002 }); osc(c, t, o, { f: 180, to: 60, dur: 0.12, peak: 0.6, a: 0.002 }); },
  scream: (c, t, o) => {
    [0, 7, -9].forEach((d, i) => osc(c, t, o, { type: 'sawtooth', f: 520 + d * 3, to: 1250 + d * 9, dur: 1.1, peak: 0.13, a: 0.04, vib: 40 + i * 15, vibF: 9 + i }));
    burst(c, t, o, { dur: 1.1, type: 'bandpass', f: 1500, q: 2, peak: 0.5, a: 0.04, sweepTo: 3000 });
  },
  boom: (c, t, o) => { osc(c, t, o, { f: 90, to: 30, dur: 0.6, peak: 0.8 }); burst(c, t, o, { dur: 0.5, f: 300, peak: 0.6 }); },
  glass: (c, t, o) => {
    burst(c, t, o, { dur: 0.35, type: 'highpass', f: 2200, peak: 0.9, a: 0.002 });
    for (let i = 0; i < 12; i++) osc(c, t + 0.04 + Math.random() * 0.6, o, { f: 2200 + Math.random() * 3800, dur: 0.18 + Math.random() * 0.2, peak: 0.08 + Math.random() * 0.06, a: 0.002 });
  },
  wobble: (c, t, o) => { osc(c, t, o, { type: 'triangle', f: 330, dur: 2.6, peak: 0.18, a: 0.2, vib: 80, vibF: 1.6 }); osc(c, t, o, { type: 'sine', f: 220, dur: 2.6, peak: 0.12, a: 0.2, vib: 50, vibF: 1.1 }); },
  freeze: (c, t, o) => { for (let i = 0; i < 26; i++) burst(c, t + i * 0.045 + Math.random() * 0.03, o, { dur: 0.025, type: 'highpass', f: 3000 + Math.random() * 3000, peak: 0.25 + Math.random() * 0.3, a: 0.001 }); osc(c, t, o, { f: 1800, to: 2600, dur: 1, peak: 0.05, a: 0.3 }); },
  fart: (c, t, o) => {
    const v = c.createOscillator(), fl = c.createBiquadFilter(), g = env(c, t, 0.03, 0.9, 0.95);
    v.type = 'sawtooth';
    const curve = new Float32Array(40); for (let i = 0; i < 40; i++) curve[i] = 70 + Math.random() * 45 - i * 0.6;
    v.frequency.setValueCurveAtTime(curve, t, 0.98);
    fl.type = 'lowpass'; fl.frequency.value = 420; fl.Q.value = 6;
    v.connect(fl); fl.connect(g); g.connect(o); v.start(t); v.stop(t + 1.05);
    burst(c, t, o, { dur: 0.9, f: 260, peak: 0.25, a: 0.03 });
  },
  horn: (c, t, o) => { [0, 0.45, 0.9].forEach((dt, k) => [440, 554, 659].forEach(f => osc(c, t + dt, o, { type: 'sawtooth', f: f * (k === 2 ? 1.06 : 1), dur: k === 2 ? 0.7 : 0.3, peak: 0.09, a: 0.02, vib: 4, vibF: 7 }))); },
  cluck: (c, t, o) => { for (let i = 0; i < 6; i++) osc(c, t + i * 0.22 + Math.random() * 0.08, o, { type: 'square', f: 650 + Math.random() * 200, to: 1100 + Math.random() * 300, dur: 0.07, peak: 0.06, a: 0.004 }); },
  skitter: (c, t, o) => { for (let i = 0; i < 30; i++) burst(c, t + i * 0.06 + Math.random() * 0.04, o, { dur: 0.012, type: 'highpass', f: 4000, peak: 0.12, a: 0.001 }); },
  cheer: (c, t, o) => { [523, 659, 784, 1047].forEach((f, i) => osc(c, t + i * 0.09, o, { type: 'triangle', f, dur: 0.4, peak: 0.16 })); burst(c, t + 0.1, o, { dur: 0.15, type: 'highpass', f: 1500, peak: 0.4 }); },
  ding: (c, t, o) => { osc(c, t, o, { f: 880, dur: 0.5, peak: 0.2 }); osc(c, t + 0.12, o, { f: 1320, dur: 0.7, peak: 0.18 }); },
  // uzun pırrt: kesik kesik, ara ara inceleyip kalınlaşan, sonunda küçük bir "pıt"
  fartLong: (c, t, o) => {
    const v = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    v.type = 'sawtooth'; fl.type = 'lowpass'; fl.frequency.value = 480; fl.Q.value = 7;
    const D = 3.6, n = 140, fc = new Float32Array(n), gc = new Float32Array(n);
    for (let i = 0; i < n; i++){
      const x = i / n;
      fc[i] = 62 + 40 * Math.sin(x * 9) + Math.random() * 30 + (x > 0.55 && x < 0.7 ? 60 : 0) - x * 20;
      gc[i] = (x < 0.02 ? x * 40 : 1) * (0.55 + 0.45 * (Math.sin(x * 47) > -0.6 ? 1 : 0.15)) * (x > 0.93 ? (1 - x) * 14 : 1);
    }
    v.frequency.setValueCurveAtTime(fc, t, D);
    g.gain.setValueCurveAtTime(gc, t, D);
    v.connect(fl); fl.connect(g); g.connect(o); v.start(t); v.stop(t + D + 0.05);
    burst(c, t, o, { dur: D, f: 240, peak: 0.18, a: 0.05 });
    osc(c, t + D + 0.25, o, { type: 'sawtooth', f: 160, to: 90, dur: 0.12, peak: 0.35 });
    burst(c, t + D + 0.25, o, { dur: 0.1, f: 400, peak: 0.3 });
  },
  tom: (c, t, o, f) => { osc(c, t, o, { f: f || 160, to: (f || 160) * 0.55, dur: 0.25, peak: 0.7, a: 0.003 }); burst(c, t, o, { dur: 0.06, f: 1200, peak: 0.25, a: 0.002 }); },
  cymbal: (c, t, o, d) => { burst(c, t, o, { dur: d || 1.2, type: 'highpass', f: 6000, q: 0.5, peak: 0.45, a: 0.002 }); burst(c, t, o, { dur: (d || 1.2) * 0.6, type: 'bandpass', f: 9000, q: 1, peak: 0.25, a: 0.002 }); },
  sadTrombone: (c, t, o) => {
    [[311, 0.45], [294, 0.45], [277, 0.45], [262, 1.5]].forEach(([f, d], i) => {
      const at = t + i * 0.5;
      const v = c.createOscillator(), fl = c.createBiquadFilter(), g = env(c, at, 0.04, 0.32, d);
      v.type = 'sawtooth'; v.frequency.setValueAtTime(f, at);
      if (i === 3){ const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5; lg.gain.value = 9; l.connect(lg); lg.connect(v.frequency); l.start(at + 0.3); l.stop(at + d); }
      fl.type = 'lowpass'; fl.Q.value = 6; fl.frequency.setValueAtTime(500, at); fl.frequency.linearRampToValueAtTime(1500, at + 0.15); fl.frequency.linearRampToValueAtTime(700, at + d);
      v.connect(fl); fl.connect(g); g.connect(o); v.start(at); v.stop(at + d + 0.05);
    });
  },
  cricket: (c, t, o) => { for (let k = 0; k < 5; k++) for (let i = 0; i < 4; i++) osc(c, t + k * 0.55 + i * 0.045, o, { f: 4400, dur: 0.03, peak: 0.07, a: 0.004 }); },
  applause: (c, t, o) => { for (let i = 0; i < 160; i++) burst(c, t + Math.random() * 2.6 * Math.pow(Math.random(), 0.6), o, { dur: 0.02 + Math.random() * 0.03, type: 'bandpass', f: 1200 + Math.random() * 2500, q: 0.9, peak: 0.1 + Math.random() * 0.15, a: 0.001 }); },
  boo: (c, t, o) => {
    for (let k = 0; k < 7; k++){
      const at = t + Math.random() * 0.25, f = 140 + Math.random() * 90;
      const v = c.createOscillator(), fl = c.createBiquadFilter(), g = env(c, at, 0.15, 0.09, 1.6);
      v.type = 'sawtooth'; v.frequency.setValueAtTime(f, at); v.frequency.linearRampToValueAtTime(f * 0.75, at + 1.7);
      fl.type = 'lowpass'; fl.frequency.value = 650; fl.Q.value = 3;
      v.connect(fl); fl.connect(g); g.connect(o); v.start(at); v.stop(at + 1.9);
    }
    burst(c, t, o, { dur: 1.6, f: 500, peak: 0.12, a: 0.15 });
  },
  dramatic: (c, t, o) => {
    [[110, 0.22], [104, 0.22], [82, 1.6]].forEach(([f, d], i) => {
      const at = t + i * 0.32;
      [1, 1.5, 2].forEach(m => osc(c, at, o, { type: 'sawtooth', f: f * m, dur: d, peak: 0.1, a: 0.01 }));
      osc(c, at, o, { f: 55, to: 40, dur: d, peak: 0.4 });
    });
    SES.cymbal(c, t + 0.64, o, 1.8);
  },
  boing: (c, t, o) => { osc(c, t, o, { type: 'triangle', f: 180, to: 520, dur: 0.6, peak: 0.35, vib: 70, vibF: 18 }); },
  slideWhistle: (c, t, o) => {
    const v = c.createOscillator(), g = env(c, t, 0.03, 0.22, 1.3);
    v.type = 'sine'; v.frequency.setValueAtTime(500, t); v.frequency.exponentialRampToValueAtTime(2200, t + 0.55); v.frequency.exponentialRampToValueAtTime(420, t + 1.3);
    v.connect(g); g.connect(o); v.start(t); v.stop(t + 1.4);
  },
  bell: (c, t, o) => { [0, 0.35, 0.7].forEach(dt => [520, 1240, 1780, 2610].forEach((f, i) => osc(c, t + dt, o, { f, dur: 1.1 - i * 0.18, peak: 0.16 / (i + 1), a: 0.002 }))); },
  quack: (c, t, o) => {
    [0, 0.32, 0.64].forEach(dt => {
      const at = t + dt, v = c.createOscillator(), f1 = c.createBiquadFilter(), g = env(c, at, 0.01, 0.4, 0.18);
      v.type = 'sawtooth'; v.frequency.setValueAtTime(330, at); v.frequency.exponentialRampToValueAtTime(230, at + 0.2);
      f1.type = 'bandpass'; f1.frequency.value = 1100; f1.Q.value = 3;
      v.connect(f1); f1.connect(g); g.connect(o); v.start(at); v.stop(at + 0.25);
    });
  },
  kiss: (c, t, o) => { burst(c, t, o, { dur: 0.05, type: 'bandpass', f: 2600, q: 2, peak: 0.6, a: 0.002 }); osc(c, t, o, { f: 1400, to: 600, dur: 0.08, peak: 0.25, a: 0.002 }); osc(c, t + 0.2, o, { f: 900, to: 1500, dur: 0.25, peak: 0.08 }); },
  buzzer: (c, t, o) => { osc(c, t, o, { type: 'square', f: 140, dur: 0.85, peak: 0.16, a: 0.01 }); osc(c, t, o, { type: 'sawtooth', f: 147, dur: 0.85, peak: 0.1, a: 0.01 }); },
  correct: (c, t, o) => { [[1047, 0], [1319, 0.13], [1568, 0.26], [2093, 0.39]].forEach(([f, dt]) => osc(c, t + dt, o, { type: 'triangle', f, dur: 0.35, peak: 0.16 })); },
  drumroll: (c, t, o) => { for (let i = 0; i < 44; i++) burst(c, t + i * 0.045, o, { dur: 0.05, type: 'bandpass', f: 900 + (i % 2) * 150, q: 1.2, peak: 0.12 + i * 0.008, a: 0.002 }); SES.tom(c, t + 2.05, o, 120); SES.cymbal(c, t + 2.05, o, 1.6); }
};
const play = (name, delay, x) => sfx((c, t, o) => SES[name](c, t + (delay || 0), o, x));

// ---------- görüntü ----------
function sakaLayer(){
  let l = document.getElementById('sakaLayer');
  if (!l){ l = document.createElement('div'); l.id = 'sakaLayer'; l.setAttribute('aria-hidden', 'true'); document.body.append(l); }
  return l;
}
const W = () => innerWidth, H = () => innerHeight;
const rnd = (a, b) => a + Math.random() * (b - a);
const wait = ms => new Promise(r => setTimeout(r, ms));
function add(html, cls, style){
  const e = document.createElement('div'); e.className = 'saka-el ' + (cls || '');
  if (html) e.innerHTML = html;
  if (style) Object.assign(e.style, style);
  sakaLayer().append(e); return e;
}
function fadeOut(e, ms, extra){ const a = e.animate([{ opacity: 1 }, Object.assign({ opacity: 0 }, extra || {})], { duration: ms, easing: 'ease-in', fill: 'forwards' }); a.onfinish = () => e.remove(); }
function shake(px, ms){
  const r = document.querySelector('#room:not([hidden])') || document.querySelector('#lobby:not([hidden])') || document.body;
  const k = []; for (let i = 0; i < 10; i++) k.push({ transform: 'translate(' + rnd(-px, px) + 'px,' + rnd(-px, px) + 'px)' });
  k.push({ transform: 'none' });
  r.animate(k, { duration: ms || 450, easing: 'linear' });
}
function caption(text, ms, cls){
  const e = add('', 'saka-yazi ' + (cls || '')); e.textContent = text;
  e.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 450, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'forwards' });
  setTimeout(() => fadeOut(e, 500), ms || 2200);
  return e;
}
// ekranın dışından hedefe doğru uçan nesne (kameraya doğru büyür)
async function fly(emoji, x, y, size){
  play('whoosh');
  const e = add('', 'saka-fly'); e.textContent = emoji;
  e.style.fontSize = (size || 90) + 'px';
  const sx = rnd(0.1, 0.9) * W(), sy = H() + 80;
  await e.animate([
    { transform: 'translate(' + sx + 'px,' + sy + 'px) translate(-50%,-50%) scale(.25) rotate(0deg)' },
    { transform: 'translate(' + ((sx + x) / 2) + 'px,' + (Math.min(sy, y) - H() * 0.25) + 'px) translate(-50%,-50%) scale(.8) rotate(' + rnd(200, 400) + 'deg)', offset: 0.55 },
    { transform: 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(1.9) rotate(' + rnd(500, 720) + 'deg)' }
  ], { duration: 560, easing: 'cubic-bezier(.4,.1,.9,.6)', fill: 'forwards' }).finished.catch(() => {});
  e.remove();
}
// sıvı lekesi (svg): düzensiz kenarlı leke, etrafa sıçrayan damlalar, aşağı akan izler
function splat(x, y, r, fill, dark, opts = {}){
  const pts = [], n = 18;
  for (let i = 0; i < n; i++){
    const a = i / n * Math.PI * 2, rr = r * (i % 2 ? rnd(0.62, 0.85) : rnd(0.9, 1.25)) * (Math.random() < 0.2 ? 1.35 : 1);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  let d = 'M' + ((pts[0][0] + pts[n - 1][0]) / 2) + ' ' + ((pts[0][1] + pts[n - 1][1]) / 2);
  pts.forEach((p, i) => { const q = pts[(i + 1) % n]; d += ' Q' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' ' + ((p[0] + q[0]) / 2).toFixed(1) + ' ' + ((p[1] + q[1]) / 2).toFixed(1); });
  let drops = '';
  for (let i = 0; i < 12; i++){ const a = rnd(0, Math.PI * 2), dist = r * rnd(1.25, 2.1); drops += '<circle cx="' + (Math.cos(a) * dist).toFixed(1) + '" cy="' + (Math.sin(a) * dist).toFixed(1) + '" r="' + rnd(r * 0.03, r * 0.11).toFixed(1) + '"/>'; }
  let drips = '';
  const nd = opts.drips == null ? 4 : opts.drips;
  for (let i = 0; i < nd; i++){
    const dx = rnd(-r * 0.6, r * 0.6), w = rnd(r * 0.07, r * 0.14), len = rnd(r * 0.8, r * 2.2), dur = rnd(2.2, 4).toFixed(1);
    drips += '<g transform="translate(' + dx.toFixed(1) + ' ' + (r * 0.3).toFixed(1) + ')"><rect x="' + (-w / 2).toFixed(1) + '" y="0" width="' + w.toFixed(1) + '" height="1" rx="' + (w / 2).toFixed(1) + '"><animate attributeName="height" from="1" to="' + len.toFixed(0) + '" dur="' + dur + 's" fill="freeze" calcMode="spline" keySplines=".2 .6 .4 1" keyTimes="0;1"/></rect>' +
      '<circle cx="0" cy="0" r="' + (w * 0.75).toFixed(1) + '"><animate attributeName="cy" from="0" to="' + len.toFixed(0) + '" dur="' + dur + 's" fill="freeze" calcMode="spline" keySplines=".2 .6 .4 1" keyTimes="0;1"/></circle></g>';
  }
  const S = r * 4.6;
  const svg = '<svg viewBox="' + (-S / 2) + ' ' + (-S / 2) + ' ' + S + ' ' + S + '" width="' + S + '" height="' + S + '">' +
    '<defs><radialGradient id="sg' + (++splat.n) + '" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="' + (opts.light || fill) + '"/><stop offset=".55" stop-color="' + fill + '"/><stop offset="1" stop-color="' + dark + '"/></radialGradient></defs>' +
    '<g fill="url(#sg' + splat.n + ')"><path d="' + d + ' Z"/>' + drops + drips + '</g>' + (opts.extra || '') + '</svg>';
  const e = add(svg, 'saka-splat');
  e.style.left = x + 'px'; e.style.top = y + 'px';
  e.animate([{ transform: 'translate(-50%,-50%) scale(.2)' }, { transform: 'translate(-50%,-50%) scale(1.08)', offset: 0.7 }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
  return e;
}
splat.n = 0;
const center = () => [rnd(0.3, 0.7) * W(), rnd(0.3, 0.6) * H()];
const unit = () => Math.min(W(), H());

const EFEKT = {
  async domates(){
    const [x, y] = center();
    await fly('🍅', x, y, 96);
    play('splat'); shake(8, 300);
    const e = splat(x, y, unit() * 0.17, '#d9261c', '#7e0d07', { light: '#ff5a3c', extra: seeds(unit() * 0.17) });
    setTimeout(() => fadeOut(e, 900), 4200);
  },
  async yumurta(){
    const [x, y] = center();
    await fly('🥚', x, y, 84);
    play('crack'); play('splat', 0.05);
    const r = unit() * 0.18;
    const e = splat(x, y, r, '#f3efe2', '#c9c2a8', { light: '#ffffff', drips: 3, extra: '<circle cx="' + (r * 0.1) + '" cy="' + (-r * 0.05) + '" r="' + (r * 0.36) + '" fill="#f6ad09"/><circle cx="' + (-r * 0.02) + '" cy="' + (-r * 0.17) + '" r="' + (r * 0.11) + '" fill="#ffe38a" opacity=".8"/>' });
    setTimeout(() => fadeOut(e, 900), 4500);
  },
  async pasta(){
    const x = W() / 2, y = H() * 0.45;
    await fly('🥧', x, y, 120);
    play('splat', 0, true); shake(10, 350);
    const r = unit() * 0.24;
    const blobs = [splat(x, y, r, '#fbf6ee', '#d8cbb6', { light: '#ffffff', drips: 6, extra: '<circle cx="' + (r * 0.15) + '" cy="' + (-r * 0.35) + '" r="' + (r * 0.13) + '" fill="#c8102e"/>' })];
    for (let i = 0; i < 7; i++) blobs.push(splat(rnd(0.05, 0.95) * W(), rnd(0.1, 0.9) * H(), unit() * rnd(0.06, 0.12), '#fbf6ee', '#d8cbb6', { light: '#fff', drips: 2 }));
    caption('Pastayı yedin! 🥧', 2400);
    await wait(3000);
    blobs.forEach(b => fadeOut(b, 1400, { transform: 'translate(-50%,-50%) translateY(' + H() * 0.5 + 'px)' }));
  },
  async hamsi(){
    const e = add('', 'saka-fly'); e.textContent = '🐟'; e.style.fontSize = Math.round(unit() * 0.42) + 'px';
    const x = W() / 2, y = H() / 2;
    play('whoosh');
    await e.animate([
      { transform: 'translate(' + (-W() * 0.3) + 'px,' + y + 'px) translate(-50%,-50%) rotate(-80deg) scaleX(-1)' },
      { transform: 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) rotate(15deg) scaleX(-1)' }
    ], { duration: 280, easing: 'cubic-bezier(.5,0,.9,.5)', fill: 'forwards' }).finished.catch(() => {});
    play('slap'); shake(18, 450);
    const flash = add('', 'saka-flash'); fadeOut(flash, 300);
    caption('HAMSİ TOKADI! 🐟', 1800, 'kalin');
    await e.animate([{ transform: 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) rotate(15deg) scaleX(-1)' }, { transform: 'translate(' + (W() + 300) + 'px,' + (y - 200) + 'px) translate(-50%,-50%) rotate(140deg) scaleX(-1)' }], { duration: 900, delay: 350, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    e.remove();
  },
  async korku(){
    const dark = add('', 'saka-karanlik');
    dark.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.3 }, { opacity: 0.4, offset: 0.45 }, { opacity: 0.92, offset: 0.6 }, { opacity: 0.55, offset: 0.75 }, { opacity: 0.96 }], { duration: 1100, fill: 'forwards' });
    await wait(1100);
    play('scream'); shake(14, 700);
    const f = add(GHOST_SVG, 'saka-hayalet');
    await f.animate([{ transform: 'translate(-50%,-50%) scale(.15)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 1, offset: 0.35 }, { transform: 'translate(-50%,-50%) scale(1.3)', opacity: 1 }], { duration: 900, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' }).finished.catch(() => {});
    fadeOut(f, 500); fadeOut(dark, 700);
  },
  async orumcek(){
    play('skitter'); play('skitter', 1.8);
    for (let i = 0; i < 7; i++){
      const x = rnd(0.06, 0.94) * W(), down = rnd(0.25, 0.7) * H(), dur = rnd(4200, 5600);
      const s = add('<i class="saka-ip"></i><b>🕷️</b>', 'saka-orumcek'); s.style.left = x + 'px'; s.style.fontSize = rnd(34, 64) + 'px';
      s.animate([{ transform: 'translateY(-80px)' }, { transform: 'translateY(' + down + 'px)', offset: 0.35 }, { transform: 'translateY(' + (down - 20) + 'px) rotate(8deg)', offset: 0.5 }, { transform: 'translateY(' + down + 'px) rotate(-8deg)', offset: 0.65 }, { transform: 'translateY(-120px)' }],
        { duration: dur, delay: i * 220, easing: 'ease-in-out', fill: 'both' }).onfinish = () => s.remove();
    }
    for (let i = 0; i < 3; i++){
      const s = add('', 'saka-fly'); s.textContent = '🕷️'; s.style.fontSize = '44px';
      const y = rnd(0.2, 0.9) * H(), dir = Math.random() < 0.5;
      const k = []; for (let j = 0; j <= 10; j++){ const px = dir ? -80 + j * (W() + 160) / 10 : W() + 80 - j * (W() + 160) / 10; k.push({ transform: 'translate(' + px + 'px,' + (y + rnd(-30, 30)) + 'px) rotate(' + (dir ? 90 : -90) + 'deg)' }); }
      s.animate(k, { duration: rnd(2500, 3800), delay: 900 + i * 700, easing: 'linear', fill: 'both' }).onfinish = () => s.remove();
    }
    caption('Üstünde bir şey var… 🕷️', 2000);
  },
  async cam(){
    const x = rnd(0.3, 0.7) * W(), y = rnd(0.3, 0.6) * H();
    play('glass'); shake(10, 300);
    const flash = add('', 'saka-flash'); fadeOut(flash, 250);
    const e = add(crackSVG(x, y), 'saka-cam');
    setTimeout(() => fadeOut(e, 1000), 4200);
  },
  async sarhos(){
    play('wobble');
    const r = document.querySelector('#room:not([hidden])') || document.querySelector('#lobby:not([hidden])') || document.body;
    const e = add('', 'saka-fly'); e.textContent = '🌀'; e.style.fontSize = '120px';
    e.animate([{ transform: 'translate(' + W() / 2 + 'px,' + H() / 2 + 'px) translate(-50%,-50%) rotate(0) scale(.3)', opacity: 0.9 }, { transform: 'translate(' + W() / 2 + 'px,' + H() / 2 + 'px) translate(-50%,-50%) rotate(1080deg) scale(2.4)', opacity: 0 }], { duration: 1600, easing: 'ease-out', fill: 'forwards' }).onfinish = () => e.remove();
    await r.animate([
      { transform: 'none', filter: 'none' },
      { transform: 'rotate(4deg) skewX(4deg) scale(1.02)', filter: 'blur(1.5px) hue-rotate(60deg)' },
      { transform: 'rotate(-5deg) skewX(-5deg) scale(.98)', filter: 'blur(2.5px) hue-rotate(150deg)' },
      { transform: 'rotate(3deg) skewY(3deg)', filter: 'blur(1px) hue-rotate(250deg)' },
      { transform: 'rotate(-2deg)', filter: 'blur(.5px) hue-rotate(320deg)' },
      { transform: 'none', filter: 'none' }
    ], { duration: 3800, easing: 'ease-in-out' }).finished.catch(() => {});
  },
  async donma(){
    play('freeze');
    const e = add('', 'saka-buz');
    let flakes = '';
    for (let i = 0; i < 26; i++){
      const edge = i % 4, p = rnd(0, 100);
      const pos = edge === 0 ? 'left:' + p + '%;top:' + rnd(0, 12) + '%' : edge === 1 ? 'left:' + p + '%;top:' + rnd(86, 96) + '%' : edge === 2 ? 'top:' + p + '%;left:' + rnd(0, 8) + '%' : 'top:' + p + '%;left:' + rnd(90, 96) + '%';
      flakes += '<span style="' + pos + ';font-size:' + rnd(18, 46).toFixed(0) + 'px;transform:rotate(' + rnd(0, 60).toFixed(0) + 'deg)">❄</span>';
    }
    e.innerHTML = flakes;
    e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1300, easing: 'ease-out', fill: 'forwards' });
    caption('Dondun! 🥶', 2600, 'buz');
    await wait(3600);
    fadeOut(e, 1400, { filter: 'blur(6px)' });
  },
  async osuruk(){
    play('fart');
    for (let i = 0; i < 9; i++){
      const c = add('', 'saka-bulut');
      const x = W() / 2 + rnd(-W() * 0.25, W() * 0.25), s = rnd(120, 260);
      Object.assign(c.style, { left: x + 'px', width: s + 'px', height: s + 'px' });
      c.animate([{ transform: 'translate(-50%,0) translateY(' + (H() + 40) + 'px) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,0) translateY(' + (H() * rnd(0.35, 0.65)) + 'px) scale(1)', opacity: 0.85, offset: 0.4 }, { transform: 'translate(-50%,0) translateY(' + (H() * rnd(0.05, 0.3)) + 'px) scale(1.6)', opacity: 0 }],
        { duration: rnd(2600, 3600), delay: i * 90, easing: 'ease-out', fill: 'both' }).onfinish = () => c.remove();
    }
    await wait(500);
    caption('💨 Pırrt! Kim yaptı bunu?!', 2400);
  },
  async korna(){
    play('horn');
    [0, 450, 900].forEach(ms => setTimeout(() => shake(14, 350), ms));
    caption('📯 UYAN!', 1900, 'kalin');
  },
  async tavuk(){
    play('cluck'); play('cluck', 1.4); play('cluck', 2.6);
    for (let i = 0; i < 6; i++){
      const c = add('', 'saka-fly'); c.textContent = i === 5 ? '🐣' : '🐔'; c.style.fontSize = (i === 5 ? 40 : rnd(56, 84)) + 'px';
      const y = H() - rnd(50, 140), k = [];
      for (let j = 0; j <= 16; j++) k.push({ transform: 'translate(' + (W() + 100 - j * (W() + 200) / 16) + 'px,' + (y - (j % 2 ? 18 : 0)) + 'px)' });
      c.animate(k, { duration: rnd(2600, 3400), delay: i * 380, easing: 'linear', fill: 'both' }).onfinish = () => c.remove();
    }
    caption('Gıt gıt gıdaak! 🐔', 2200);
  },
  async konfeti(){
    play('cheer');
    const colors = ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#ff9f1c'];
    for (let i = 0; i < 130; i++){
      const c = add('', 'saka-konfeti');
      Object.assign(c.style, { left: (W() / 2) + 'px', top: (H() * 0.55) + 'px', background: colors[i % colors.length], width: rnd(6, 11) + 'px', height: rnd(10, 18) + 'px' });
      const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), v = rnd(0.35, 0.8) * unit();
      const dx = Math.cos(a) * v, dy = Math.sin(a) * v;
      c.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rnd(180, 540) + 'deg)', offset: 0.35 }, { transform: 'translate(' + (dx * 1.3) + 'px,' + (H() * 0.6) + 'px) rotate(' + rnd(600, 1200) + 'deg)', opacity: 0.2 }],
        { duration: rnd(2200, 3200), easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).onfinish = () => c.remove();
    }
    caption('Tebrikler! 🎉', 2400);
  },
  async pirtuzun(){
    play('fartLong');
    for (let i = 0; i < 16; i++){
      const c = add('', 'saka-bulut');
      const x = W() / 2 + rnd(-W() * 0.3, W() * 0.3), sz = rnd(140, 300);
      Object.assign(c.style, { left: x + 'px', width: sz + 'px', height: sz + 'px' });
      c.animate([{ transform: 'translate(-50%,0) translateY(' + (H() + 40) + 'px) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,0) translateY(' + (H() * rnd(0.3, 0.6)) + 'px) scale(1)', opacity: 0.85, offset: 0.4 }, { transform: 'translate(-50%,0) translateY(' + (H() * rnd(0, 0.3)) + 'px) scale(1.8)', opacity: 0 }],
        { duration: rnd(3200, 4400), delay: i * 220, easing: 'ease-out', fill: 'both' }).onfinish = () => c.remove();
    }
    sesBalon('💨', 'Pırrrrrrrrrrt…', 3600);
    await wait(2000); caption('Bitmiyor bu! 😷', 1800);
  },
  async badumtss(){ play('tom', 0, 190); play('tom', 0.22, 140); play('cymbal', 0.44); sesBalon('🥁', 'Ba dum tss!', 2000); },
  async huzun(){ play('sadTrombone'); sesBalon('🎺', 'Vah vah vaaah…', 3200); },
  async kriket(){ play('cricket'); sesBalon('🦗', 'cır cır… (sessizlik)', 3000); },
  async alkis(){ play('applause'); sesBalon('👏', 'Alkışlar!', 2800); },
  async yuh(){ play('boo'); sesBalon('👎', 'Yuuuuh!', 2200); },
  async dramatik(){ play('dramatic'); sesBalon('😱', 'Dan dan daaan!', 2800); const d = add('', 'saka-karanlik'); d.animate([{ opacity: 0 }, { opacity: 0.5, offset: 0.4 }, { opacity: 0 }], { duration: 2400 }).onfinish = () => d.remove(); },
  async boing(){ play('boing'); sesBalon('🌀', 'Boiiing!', 1600); shake(6, 300); },
  async kaydirak(){ play('slideWhistle'); sesBalon('🎢', 'Fiiiiiuuuv', 1800); },
  async zil(){ play('bell'); sesBalon('🔔', 'DING DING DING!', 2200); },
  async vak(){ play('quack'); sesBalon('🦆', 'Vak vak vak!', 1800); },
  async opucuk(){
    play('kiss');
    for (let i = 0; i < 10; i++){
      const h = add('', 'saka-fly'); h.textContent = '❤️'; h.style.fontSize = rnd(26, 56) + 'px';
      const x = rnd(0.2, 0.8) * W();
      h.animate([{ transform: 'translate(' + x + 'px,' + (H() + 40) + 'px) scale(.5)' }, { transform: 'translate(' + (x + rnd(-80, 80)) + 'px,' + rnd(0.1, 0.5) * H() + 'px) scale(1.2)', opacity: 0 }], { duration: rnd(1800, 2800), delay: i * 90, easing: 'ease-out', fill: 'both' }).onfinish = () => h.remove();
    }
    sesBalon('😘', 'Muuuck!', 1800);
  },
  async yanlis(){ play('buzzer'); sesBalon('❌', 'Yanlış cevap!', 1800); const f = add('', 'saka-flash kirmizi'); fadeOut(f, 600); },
  async dogru(){ play('correct'); sesBalon('✅', 'Doğru cevap!', 1800); },
  async davul(){ play('drumroll'); sesBalon('🥁', 'Trrrrrrrr…', 2000); await wait(2050); sesBalon('💥', 'TSSS!', 1200); },
  // Kick'teki gibi: ekranın ortasında, sesli, bitince kaybolan video
  async replik(m, dosya, kimden){
    if (!REPLIK_RE.test(String(dosya || ''))) return;
    if (!REPLIK.length) replikYukle();
    await new Promise(res => replikQueue.push(res) === 1 ? res() : 0);   // aynı anda tek replik: sıraya girsin
    try { await replikOynat(dosya, kimden); } finally { replikQueue.shift(); if (replikQueue.length) replikQueue[0](); }
  },
  async mesaj(m){
    play('ding');
    const e = add('', 'saka-mesaj');
    const l = document.createElement('small'); l.textContent = '📣 Yöneticiden';
    const t = document.createElement('div'); t.textContent = m || 'Merhaba! 👋';
    e.append(l, t);
    e.animate([{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'forwards' });
    setTimeout(() => fadeOut(e, 600), 5200);
  }
};
// ses efektlerinin küçük görsel balonu (ekranın üst kısmında, kısa süre)
function sesBalon(ikon, yazi, ms){
  const e = add('', 'saka-sesbalon');
  e.append(Object.assign(document.createElement('b'), { textContent: ikon }), Object.assign(document.createElement('span'), { textContent: yazi }));
  e.animate([{ transform: 'translate(-50%,-30px) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,0) scale(1.06)', opacity: 1, offset: 0.6 }, { transform: 'translate(-50%,0) scale(1)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'forwards' });
  setTimeout(() => fadeOut(e, 400), ms || 2000);
}
const replikQueue = [];
function replikOynat(dosya, kimden){
  return new Promise(res => {
    const box = add('', 'saka-replik');
    const v = document.createElement('video');
    v.src = 'replikler/' + encodeURIComponent(dosya); v.playsInline = true; v.preload = 'auto';
    v.muted = typeof deafened !== 'undefined' && deafened;
    v.volume = Math.max(0, Math.min(1, typeof masterVol === 'number' ? masterVol : 1));
    const cap = document.createElement('div'); cap.className = 'saka-replik-cap';
    cap.append(Object.assign(document.createElement('b'), { textContent: '🎬 ' + replikAd(dosya) }), Object.assign(document.createElement('span'), { textContent: kimden ? kimden + ' gönderdi' : '' }));
    box.append(v, cap);
    let done = false;
    const bitir = () => { if (done) return; done = true; clearTimeout(maxT); clearTimeout(loadT); box.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(.85)', opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = () => { v.removeAttribute('src'); v.load(); box.remove(); res(); }; };
    const maxT = setTimeout(bitir, 45000);
    const loadT = setTimeout(() => { if (v.readyState < 3) bitir(); }, 12000);     // yüklenemezse takılı kalmasın
    v.addEventListener('ended', bitir); v.addEventListener('error', bitir);
    v.addEventListener('canplay', () => {
      if (done || box.classList.contains('acik')) return;
      box.classList.add('acik');
      box.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.04)', opacity: 1, offset: .7 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'forwards' });
      v.play().catch(() => { v.muted = true; v.play().catch(bitir); });
    }, { once: true });
  });
}
function seeds(r){
  let s = '<g fill="#f7d36a" opacity=".85">';
  for (let i = 0; i < 9; i++){ const a = rnd(0, Math.PI * 2), d = rnd(0, r * 0.55); s += '<ellipse cx="' + (Math.cos(a) * d).toFixed(1) + '" cy="' + (Math.sin(a) * d).toFixed(1) + '" rx="' + (r * 0.035).toFixed(1) + '" ry="' + (r * 0.06).toFixed(1) + '" transform="rotate(' + rnd(0, 180).toFixed(0) + ' ' + (Math.cos(a) * d).toFixed(1) + ' ' + (Math.sin(a) * d).toFixed(1) + ')"/>'; }
  return s + '</g>';
}
// kırık cam: çarpma noktasından dağılan çatlaklar ve aralarında halkalar
function crackSVG(x, y){
  const w = W(), h = H(), n = 15, R = Math.hypot(w, h);
  const rays = [];
  let lines = '';
  for (let i = 0; i < n; i++){
    const a = i / n * Math.PI * 2 + rnd(-0.15, 0.15);
    const pts = [[x, y]]; let px = x, py = y, aa = a;
    for (let d = 0; d < R;){ const step = rnd(30, 90); d += step; aa += rnd(-0.25, 0.25); px += Math.cos(aa) * step; py += Math.sin(aa) * step; pts.push([px, py]); }
    rays.push(pts);
    lines += '<polyline points="' + pts.map(p => p[0].toFixed(0) + ',' + p[1].toFixed(0)).join(' ') + '"/>';
  }
  [2, 4, 7].forEach(k => {
    let ring = '';
    rays.forEach((r, i) => { const p = r[Math.min(k, r.length - 1)], q = rays[(i + 1) % n][Math.min(k + (Math.random() < 0.5 ? 1 : 0), rays[(i + 1) % n].length - 1)]; if (Math.random() < 0.8) ring += '<line x1="' + p[0].toFixed(0) + '" y1="' + p[1].toFixed(0) + '" x2="' + q[0].toFixed(0) + '" y2="' + q[1].toFixed(0) + '"/>'; });
    lines += ring;
  });
  return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><g fill="none" stroke-linecap="round">' +
    '<g stroke="rgba(0,0,0,.55)" stroke-width="3.5" transform="translate(1.5 1.5)">' + lines + '</g><g stroke="rgba(255,255,255,.9)" stroke-width="1.6">' + lines + '</g></g>' +
    '<circle cx="' + x + '" cy="' + y + '" r="22" fill="rgba(255,255,255,.35)" stroke="rgba(255,255,255,.9)"/></svg>';
}
// hayalet yüzü (özgün çizim): solgun yüz, kapkara boş gözler, uzun açık ağız
const GHOST_SVG = '<svg viewBox="0 0 200 260" width="420" height="546"><defs>' +
  '<radialGradient id="ghF" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#e9efe9"/><stop offset=".6" stop-color="#aab6ad"/><stop offset="1" stop-color="#4c5a52" stop-opacity="0"/></radialGradient>' +
  '<radialGradient id="ghE" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000"/><stop offset=".7" stop-color="#050505"/><stop offset="1" stop-color="#2a332e"/></radialGradient>' +
  '<filter id="ghB"><feGaussianBlur stdDeviation="2.2"/></filter></defs>' +
  '<ellipse cx="100" cy="120" rx="86" ry="118" fill="url(#ghF)" filter="url(#ghB)"/>' +
  '<ellipse cx="66" cy="98" rx="22" ry="30" fill="url(#ghE)" transform="rotate(-12 66 98)"/><ellipse cx="134" cy="98" rx="22" ry="30" fill="url(#ghE)" transform="rotate(12 134 98)"/>' +
  '<circle cx="70" cy="102" r="2.5" fill="#d6ffe8"/><circle cx="130" cy="102" r="2.5" fill="#d6ffe8"/>' +
  '<path d="M80 160 C 82 150, 118 150, 120 160 C 124 196, 112 228, 100 230 C 88 228, 76 196, 80 160 Z" fill="url(#ghE)"/>' +
  '<path d="M60 70 Q66 60 80 66 M140 70 Q134 60 120 66" stroke="#3a443e" stroke-width="3" fill="none"/></svg>';

let sakaBusy = false;
async function playSaka(e, m, r, kimden){
  if (!EFEKT[e]) return;
  if (sakaBusy && e !== 'mesaj' && e !== 'replik') await wait(400);
  sakaBusy = true;
  try { await EFEKT[e](m, r, kimden); } catch(err){ console.warn(err); }
  sakaBusy = false;
}

// ---------- ayar ----------
(function sakaAyar(){
  const c = document.getElementById('sakaAcik');
  if (!c) return;
  c.checked = sakaAcik();
  c.onchange = () => { store.set(SAKA_KEY, c.checked ? 'acik' : 'kapali'); if (c.checked) playSaka('konfeti'); };
})();

// ---------- herkesin birbirine şaka yapması (yönetici panelinden açılıp kapatılır) ----------
// Ayarlar sunucuda: tamamen aç/kapat, kapalı efektler, engellenen kişiler (ad), iki şaka arası bekleme.
// Hem gönderen hem alan kontrol eder: engellenen birinin şakası kimsenin ekranında oynamaz.
let AYAR = { acik: true, kapali: [], engel: [], bekleme: 5 }, ayarAt = 0, ayarP = null;
const lowTr = x => String(x || '').toLocaleLowerCase('tr-TR').trim();
function sakaAyarYukle(force){
  if (!force && ayarP) return ayarP;
  if (!force && Date.now() - ayarAt < 4 * 60e3) return Promise.resolve(AYAR);
  ayarP = fetch('/api/uye/saka-ayar', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
    if (d && typeof d === 'object'){
      AYAR = { acik: d.acik !== false, kapali: Array.isArray(d.kapali) ? d.kapali : [], engel: Array.isArray(d.engel) ? d.engel.map(lowTr) : [], bekleme: Math.max(0, Math.min(600, Number(d.bekleme) || 0)) };
      ayarAt = Date.now();
    }
    ayarP = null; renderSakaPanel(); return AYAR;
  }, () => { ayarP = null; return AYAR; });
  return ayarP;
}
setInterval(() => { if (joined && !document.hidden && Date.now() - ayarAt > 5 * 60e3) sakaAyarYukle(); }, 20000);
const engelli = name => AYAR.engel.includes(lowTr(name));
const efektAcik = e => AYAR.acik && !AYAR.kapali.includes(e);
const sakaSon = new Map();
function sakaUOnData(id, d){
  const p = peers.get(id);
  if (!p || !SAKA[d.e] || typeof d.to !== 'string') return;
  if (Date.now() - ayarAt > 5 * 60e3) sakaAyarYukle();
  if (!efektAcik(d.e) || engelli(p.name)) return;
  const now = Date.now();
  if (now - (sakaSon.get(id) || 0) < Math.max(1500, AYAR.bekleme * 1000 * 0.8)) return;
  if (d.e === 'replik' && !REPLIK_RE.test(String(d.r || ''))) return;
  sakaSon.set(id, now);
  sakaShow({ e: d.e, to: d.to, m: clip(d.m || '', 90), r: d.e === 'replik' ? d.r : undefined }, p.name, id);
}
let benimSon = 0;
function sakaGonder(e, to, m, r){
  if (!joined || !peer) return;
  if (!AYAR.acik){ toast('🎭 Şakalar yönetici tarafından kapatıldı'); return; }
  if (!efektAcik(e)){ toast('Bu efekt yönetici tarafından kapatıldı'); return; }
  if (engelli(myName)){ toast('🚫 Yönetici senin şaka yapmanı kapattı'); return; }
  const kalan = Math.ceil((benimSon + AYAR.bekleme * 1000 - Date.now()) / 1000);
  if (kalan > 0){ toast('⏳ ' + kalan + ' sn sonra tekrar atabilirsin'); return; }
  if (e === 'mesaj' && !String(m || '').trim()){ toast('Mesajı yaz'); return; }
  benimSon = Date.now();
  const msg = { t: 'saka-u', e, to, m: clip(m || '', 90) };
  if (e === 'replik') msg.r = r;
  peers.forEach(p => { if (p.linked) send(p.conn, msg); });
  sakaShow(msg, myName, peer.id);
  renderSakaPanel();
}

// ---------- şaka paneli (alt şeritteki 🎭 düğmesi) ----------
const sp = { to: '*', tab: 'firlat', dlg: null, timer: null };
function sakaPanelAc(){
  if (!sp.dlg){
    const d = document.createElement('dialog'); d.id = 'sakaDlg'; d.className = 'wide'; d.setAttribute('aria-labelledby', 'sakaDlgT');
    d.innerHTML = '<div class="dlg-head"><h3 id="sakaDlgT">🎭 Şaka yap</h3><button class="btn small" data-close>Kapat</button></div>' +
      '<div class="dlg-body saka-panel"><p class="note saka-durum"></p><div class="saka-kime"></div>' +
      '<div class="saka-tabs"><button type="button" data-tab="firlat">🍅 Fırlat</button><button type="button" data-tab="ses">🔊 Komik sesler</button><button type="button" data-tab="replik">🎬 Replikler</button></div>' +
      '<div class="saka-izgara"></div><form class="saka-mesajrow"><input type="text" maxlength="90" placeholder="Ekrana kocaman yazı gönder…"><button class="btn primary" type="submit">📣 Gönder</button></form>' +
      '<p class="note">Şakalar herkesin ekranında birden çıkar. İsteyen Görünüm → 🎭 Şakalar’dan kendi ekranında kapatabilir.</p></div>';
    document.body.append(d); sp.dlg = d;
    d.querySelector('[data-close]').onclick = () => d.close();
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    d.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { sp.tab = b.dataset.tab; renderSakaPanel(); });
    d.querySelector('.saka-mesajrow').onsubmit = e => { e.preventDefault(); const i = d.querySelector('.saka-mesajrow input'); sakaGonder('mesaj', sp.to, i.value.trim()); i.value = ''; };
    d.addEventListener('close', () => { clearInterval(sp.timer); });
  }
  renderSakaPanel(); sp.dlg.showModal();
  sakaAyarYukle(true);
  replikYukle(true).then(() => renderSakaPanel());
  clearInterval(sp.timer); sp.timer = setInterval(renderSakaDurum, 500);
}
function renderSakaDurum(){
  if (!sp.dlg) return;
  const el = sp.dlg.querySelector('.saka-durum');
  const kalan = Math.ceil((benimSon + AYAR.bekleme * 1000 - Date.now()) / 1000);
  el.classList.toggle('err', !AYAR.acik || engelli(myName));
  el.textContent = !AYAR.acik ? '🔒 Şakalar şu an yönetici tarafından kapalı.' : engelli(myName) ? '🚫 Yönetici senin şaka yapmanı kapattı.' : kalan > 0 ? '⏳ Yeni şaka için ' + kalan + ' sn bekle' : 'Kime atacağını seç, sonra efekte bas!';
  sp.dlg.querySelector('.saka-izgara').classList.toggle('bekle', kalan > 0);
}
function renderSakaPanel(){
  if (!sp.dlg || !joined) return;
  const d = sp.dlg;
  const kime = d.querySelector('.saka-kime'); kime.innerHTML = '';
  const people = [{ id: '*', name: '👥 Herkes' }];
  peers.forEach(p => { if (p.linked && p.helloed) people.push({ id: p.id, name: p.name }); });
  people.push({ id: peer.id, name: '🙋 Kendime' });
  if (!people.some(x => x.id === sp.to)) sp.to = '*';
  people.forEach(x => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (sp.to === x.id ? ' on' : ''); b.textContent = x.name; b.onclick = () => { sp.to = x.id; renderSakaPanel(); }; kime.append(b); });
  d.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === sp.tab));
  const g = d.querySelector('.saka-izgara'); g.innerHTML = '';
  g.classList.toggle('replikler', sp.tab === 'replik');
  if (sp.tab === 'replik'){
    if (!efektAcik('replik')) g.append(Object.assign(document.createElement('p'), { className: 'note', textContent: 'Replikler yönetici tarafından kapatıldı.' }));
    else if (!REPLIK.length) g.append(Object.assign(document.createElement('p'), { className: 'note', textContent: replikAt ? 'Henüz replik yok. Yönetici “replikler” klasörüne video ekleyince burada çıkar.' : 'Yükleniyor…' }));
    REPLIK.forEach(k => {
      const row = document.createElement('div'); row.className = 'replik-sec';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'replik-at';
      b.append(Object.assign(document.createElement('b'), { textContent: '🎬' }), Object.assign(document.createElement('span'), { textContent: k.ad }));
      b.disabled = !efektAcik('replik') || engelli(myName);
      b.onclick = () => { const once = benimSon; sakaGonder('replik', sp.to, '', k.dosya); if (benimSon !== once) d.close(); };
      const pv = document.createElement('button'); pv.type = 'button'; pv.className = 'replik-on'; pv.textContent = '👁'; pv.title = 'Önizle (sadece sen görürsün)';
      pv.onclick = () => { d.close(); playSaka('replik', '', k.dosya, 'Önizleme · sadece sen'); };
      row.append(b, pv); g.append(row);
    });
    if (!replikAt) replikYukle().then(() => renderSakaPanel());
    d.querySelector('.saka-mesajrow').hidden = true;
    renderSakaDurum();
    return;
  }
  Object.entries(SAKA).filter(([k, v]) => k !== 'mesaj' && v.tur !== 'replik' && (sp.tab === 'ses' ? v.tur === 'ses' : v.tur !== 'ses')).forEach(([k, v]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'saka-sec';
    b.append(Object.assign(document.createElement('b'), { textContent: v.ikon }), Object.assign(document.createElement('span'), { textContent: v.ad }));
    b.disabled = !efektAcik(k) || engelli(myName);
    if (!efektAcik(k)) b.title = 'Yönetici bu efekti kapattı';
    b.onclick = () => sakaGonder(k, sp.to);
    g.append(b);
  });
  const mr = d.querySelector('.saka-mesajrow'); mr.hidden = sp.tab !== 'firlat' || !efektAcik('mesaj');
  renderSakaDurum();
}
const sakaBtn = document.getElementById('sakaBtn');
if (sakaBtn) sakaBtn.onclick = sakaPanelAc;

// odanın kodu (net.js) bu üçünü çağırır
window.sakaAdminConn = sakaAdminConn;
window.sakaOnData = sakaOnData;
window.playSaka = playSaka;
})();
