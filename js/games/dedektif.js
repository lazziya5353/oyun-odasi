// Kara Dosyalar: ortak (co-op) kara film dedektif oyunu. Masa altyapısıyla çalışır: kuralları masayı açan yönetir,
// herkese kendi görünümü gider (ayrı gezmede herkesin bulduğu kendine özel).
// Akış: başta "toplu mu ayrı mı gezelim" oylaması → mekanları gez, nesnelere tıkla, delil topla → ortak deftere yaz, oyla
// → takılınca 3 kademeli ipucu (puan düşer) → "Katili Suçla": herkes şüpheli + 2 kanıt seçer → son.
if (typeof registerTableGame === 'function') (function(){
  const T_MOD = 25000, T_SUC = 150000;
  const seatedIds = o => o.sum.seats.filter(x => x && !x.bot).map(x => x.id);
  const V = id => DK_VAKALAR[id] || DK_VAKALAR.motel204;
  const nm = (st, id) => st.names[id] || 'Dedektif';
  const kisiAl = (st, id) => st.kisi[id] || (st.kisi[id] = { yer: V(st.vaka).baslangic, bulunan: [] });

  // bir oyuncunun bildiği deliller: toplu gezmede ortak; ayrı gezmede kendi bulduğu + ortak deftere asılanlar
  function bilinen(st, id){
    if (st.mod !== 'ayri') return new Set(st.bulunan);
    const k = new Set(id && st.kisi[id] ? st.kisi[id].bulunan : []);
    st.pano.forEach(p => { if (p.delil) k.add(p.delil); });
    return k;
  }
  const acikMi = (vaka, sahne, k) => { const sc = vaka.sahneler[sahne]; return !!sc && (!sc.kosul || !sc.kosul.length || sc.kosul.some(x => k.has(x))); };
  function logla(st, metin, gizli){ st.log.push({ t: Date.now(), metin, gizli: gizli || null }); if (st.log.length > 60) st.log.shift(); }
  function delilEkle(st, id, kim){
    const vaka = V(st.vaka), d = vaka.deliller[id]; if (!d) return false;
    const liste = st.mod === 'ayri' ? kisiAl(st, kim).bulunan : st.bulunan;
    if (liste.includes(id)) return false;
    liste.push(id);
    const yer = vaka.sahneler[d.sahne] ? vaka.sahneler[d.sahne].ad : '';
    if (st.mod === 'ayri') logla(st, '🔎 ' + nm(st, kim) + ' bir delil buldu (' + yer + ')', { kim, metin: '🔎 Buldun: ' + d.ikon + ' ' + d.ad });
    else logla(st, '🔎 ' + nm(st, kim) + ': ' + d.ikon + ' ' + d.ad);
    // iki delil bir araya gelince ortaya çıkan sonuç (ör. kasetteki klik + bardaki Zippo)
    Object.keys(vaka.deliller).forEach(k => { const o = vaka.deliller[k]; if (o.otomatik && !liste.includes(k) && o.otomatik.every(x => liste.includes(x) || (x === 'zippo' && liste.includes('zippo_kazima')))){ liste.push(k); logla(st, '💡 Bağlantı kuruldu: ' + o.ikon + ' ' + o.ad, st.mod === 'ayri' ? { kim, metin: '💡 Bağlantı kurdun: ' + o.ikon + ' ' + o.ad } : null); } });
    return true;
  }
  function asamaBul(vaka, k){ for (let i = 0; i < vaka.ipuclari.length; i++) if (vaka.ipuclari[i].kosul(k)) return i; return vaka.ipuclari.length - 1; }
  function suclamaBitir(o){
    const st = o.state, vaka = V(st.vaka), sec = Object.values(st.suc.secim);
    if (!sec.length){ st.faz = 'oyun'; st.suc = null; logla(st, '⚖️ Kimse seçim yapmadı, suçlama iptal.'); return; }
    const say = {}; sec.forEach(x => { say[x.supheli] = (say[x.supheli] || 0) + 1; });
    const enCok = Math.max(...Object.values(say)), adaylar = Object.keys(say).filter(k => say[k] === enCok);
    const baslatanSecim = st.suc.secim[st.suc.baslatan];
    const supheli = adaylar.length > 1 && baslatanSecim && adaylar.includes(baslatanSecim.supheli) ? baslatanSecim.supheli : adaylar[0];
    const dsay = {}; sec.filter(x => x.supheli === supheli).forEach(x => x.deliller.forEach(d => { dsay[d] = (dsay[d] || 0) + 1; }));
    const deliller = Object.keys(dsay).sort((a, b) => dsay[b] - dsay[a]).slice(0, 2);
    const gruplar = new Set(deliller.map(d => vaka.deliller[d]).filter(d => d && d.guclu).map(d => d.grup));
    let tur = 'basarisiz';
    if (supheli === vaka.katil) tur = gruplar.size >= 2 ? 'zafer' : 'kacis';
    const puan = tur === 'zafer' ? st.puan : tur === 'kacis' ? Math.round(st.puan * 0.4) : 0;
    st.sonuc = { tur, supheli, deliller, puan, oylar: say, sure: Date.now() - st.bas };
    st.faz = 'son'; st.suc = null;
    logla(st, tur === 'zafer' ? '⚖️ Dava kapandı! Katil yakalandı.' : tur === 'kacis' ? '⚖️ Doğru kişi ama kanıtlar yetersiz…' : '⚖️ Yanlış kişi suçlandı…');
  }

  registerTableGame('dedektif', {
    name: 'Kara Dosyalar', icon: '🕵️', seats: 8, minPlayers: 1, bots: false, joinMidGame: true, yeni: true,
    cleanOpts: o => ({ vaka: DK_VAKALAR[o.vaka] ? o.vaka : 'motel204' }),
    variantName: s => 'Dedektif · ' + V(s.opts.vaka).ad,
    seatLabel: () => 'Dedektif',
    waitText: (s, own) => own ? 'Dedektifler masaya oturunca “Oyunu başlat”a basabilirsiniz. Tek başına da oynanır. Başta ayrı mı toplu mu gezeceğinizi oylayacaksınız.' : 'Bir koltuğa otur; masa sahibi başlatınca vaka açılır.',
    makeCard: {
      desc: '1-8 kişi, ortak. Max Payne havasında kara film vakası: mekanları gez, delil topla, ortak deftere yaz, katili birlikte suçla.',
      opts: '<label>Vaka<select data-o="vaka">' + DK_ALBUM.map(a => '<option value="' + a.id + '"' + (a.hazir ? '' : ' disabled') + '>' + a.ad + (a.hazir ? '' : ' (yakında)') + '</option>').join('') + '</select></label>',
      read: c => ({ vaka: c.querySelector('[data-o=vaka]').value })
    },
    start(o){
      const vaka = V(o.sum.opts.vaka), ids = seatedIds(o), now = Date.now();
      const st = { vaka: o.sum.opts.vaka, faz: 'mod', modOy: {}, modBitis: now + T_MOD, mod: null, yer: vaka.baslangic, bulunan: [], kisi: {}, names: {},
        pano: [], log: [], ipucu: [], ipucuSay: {}, puan: vaka.puan, suc: null, sonuc: null, bas: now, pid: 0 };
      o.sum.seats.forEach(x => { if (x && !x.bot){ st.names[x.id] = x.name; kisiAl(st, x.id); } });
      if (ids.length <= 1){ st.faz = 'oyun'; st.mod = 'toplu'; st.bas = now; }
      logla(st, '🕵️ Vaka açıldı: ' + vaka.ad);
      return st;
    },
    onSeat(o, seat){ const st = o.state, x = o.sum.seats[seat]; st.names[x.id] = x.name; kisiAl(st, x.id); logla(st, '🕵️ ' + x.name + ' soruşturmaya katıldı'); sendViews(o); },
    onLeave(o){ const st = o.state; if (st.faz === 'mod' && seatedIds(o).every(id => st.modOy[id])) this.modBitir(o); if (st.faz === 'suclama' && seatedIds(o).every(id => st.suc.secim[id])) suclamaBitir(o); sendViews(o); pump(o); },
    modBitir(o){
      const st = o.state; let t = 0, a = 0;
      Object.values(st.modOy).forEach(v => { if (v === 'ayri') a++; else t++; });
      st.mod = a > t ? 'ayri' : 'toplu'; st.faz = 'oyun'; st.bas = Date.now();
      if (st.mod === 'ayri') seatedIds(o).forEach(id => { kisiAl(st, id).yer = V(st.vaka).baslangic; });
      logla(st, st.mod === 'ayri' ? '🧭 Karar: herkes ayrı geziyor. Bulduklarınızı ortak deftere asın!' : '👥 Karar: hep birlikte geziyoruz.');
    },
    act(o, seat, a, who){
      const st = o.state; if (!st) return;
      const vaka = V(st.vaka);
      if (a.type === 'yeni'){ if (st.faz !== 'son' || who !== o.sum.owner) return; o.state = this.start(o); sendViews(o); pump(o); return; }
      if (seat < 0) return;
      st.names[who] = o.sum.seats[seat].name;
      const kisi = kisiAl(st, who), k = bilinen(st, who), yer = st.mod === 'ayri' ? kisi.yer : st.yer;
      if (a.type === 'mod'){
        if (st.faz !== 'mod' || !['toplu', 'ayri'].includes(a.secim)) return;
        st.modOy[who] = a.secim;
        if (seatedIds(o).every(id => st.modOy[id])) this.modBitir(o);
        sendViews(o); pump(o); return;
      }
      if (a.type === 'pano'){
        const metin = clip(String(a.metin || ''), 220).trim(), delil = vaka.deliller[a.delil] && k.has(a.delil) ? a.delil : null;
        if (!metin && !delil) return;
        if (delil && st.pano.some(p => p.delil === delil && p.by === who)) return;
        st.pano.push({ id: ++st.pid, by: who, metin, delil, oy: {}, t: Date.now() });
        if (st.pano.length > 80) st.pano.shift();
        logla(st, '📒 ' + nm(st, who) + ' ortak deftere yazdı' + (delil ? ': ' + vaka.deliller[delil].ikon + ' ' + vaka.deliller[delil].ad : ''));
        sendViews(o); return;
      }
      if (a.type === 'oy'){ const p = st.pano.find(x => x.id === +a.id); if (!p || ![1, -1, 0].includes(a.d)) return; if (a.d) p.oy[who] = a.d; else delete p.oy[who]; sendViews(o); return; }
      if (a.type === 'panoSil'){ const i = st.pano.findIndex(x => x.id === +a.id && (x.by === who || who === o.sum.owner)); if (i >= 0){ st.pano.splice(i, 1); sendViews(o); } return; }
      if (st.faz === 'suclama'){
        if (a.type === 'suclaSec'){
          if (!vaka.supheliler.some(s => s.id === a.supheli)) return;
          const dl = (Array.isArray(a.deliller) ? a.deliller : []).filter(d => vaka.deliller[d] && k.has(d)).slice(0, 2);
          st.suc.secim[who] = { supheli: a.supheli, deliller: [...new Set(dl)] };
          if (seatedIds(o).every(id => st.suc.secim[id])) suclamaBitir(o);
          sendViews(o); pump(o); return;
        }
        if (a.type === 'suclaIptal' && (who === st.suc.baslatan || who === o.sum.owner)){ st.faz = 'oyun'; st.suc = null; logla(st, '⚖️ Suçlama geri çekildi, soruşturma sürüyor.'); sendViews(o); pump(o); }
        return;
      }
      if (st.faz !== 'oyun') return;
      if (a.type === 'git'){
        if (!acikMi(vaka, a.yer, k) || a.yer === yer) return;
        if (st.mod === 'ayri') kisi.yer = a.yer; else st.yer = a.yer;
        logla(st, '🚶 ' + nm(st, who) + ' → ' + vaka.sahneler[a.yer].ad, st.mod === 'ayri' ? null : null);
        sendViews(o); return;
      }
      if (a.type === 'bul'){
        const d = vaka.deliller[a.delil]; if (!d) return;
        // ya bulunduğu mekandaki bir nesne ya da elindeki bir nesnenin gizli yüzü olmalı
        const sahnede = (vaka.sahneler[yer].hot || []).some(h => h.delil === a.delil);
        const gizli = Object.keys(vaka.deliller).some(b => vaka.deliller[b].dondur && vaka.deliller[b].dondur.gizli === a.delil && k.has(b));
        if (!sahnede && !gizli) return;
        if (delilEkle(st, a.delil, who)) sendViews(o);
        return;
      }
      if (a.type === 'ipucu'){
        const asama = asamaBul(vaka, k), anahtar = asama + ':' + (st.mod === 'ayri' ? who : 'hep');
        const kademe = Math.min(2, st.ipucuSay[anahtar] || 0);
        st.ipucuSay[anahtar] = kademe + 1;
        const ceza = vaka.ipucuCeza[kademe];
        st.puan = Math.max(0, st.puan - ceza);
        st.ipucu.push({ t: Date.now(), by: who, kademe, metin: vaka.ipuclari[asama].k[kademe], kime: st.mod === 'ayri' ? who : null, ceza });
        logla(st, '💡 ' + nm(st, who) + ' ' + (kademe + 1) + '. kademe ipucu aldı (−' + ceza + ')');
        sendViews(o); return;
      }
      if (a.type === 'suclaBasla'){
        st.faz = 'suclama'; st.suc = { baslatan: who, bitis: Date.now() + T_SUC, secim: {} };
        logla(st, '⚖️ ' + nm(st, who) + ' suçlama başlattı! Herkes şüpheliyi ve kanıtlarını seçsin.');
        sendViews(o); pump(o); return;
      }
    },
    pump(o){
      const st = o.state, now = Date.now();
      if (st.faz === 'mod') later(o, Math.max(0, st.modBitis - now), () => { if (st.faz === 'mod'){ TABLE_GAMES.dedektif.modBitir(o); sendViews(o); pump(o); } });
      else if (st.faz === 'suclama') later(o, Math.max(0, st.suc.bitis - now), () => { if (st.faz === 'suclama'){ suclamaBitir(o); sendViews(o); pump(o); } });
    },
    view(o, seat){
      const st = o.state, vaka = V(st.vaka), me_ = seat >= 0 && o.sum.seats[seat] ? o.sum.seats[seat].id : null, now = Date.now();
      const k = bilinen(st, me_), yer = st.mod === 'ayri' && me_ ? kisiAl(st, me_).yer : st.yer;
      const here = seatedIds(o);
      const kendi = st.mod === 'ayri' && me_ ? new Set(kisiAl(st, me_).bulunan) : null;
      return {
        vaka: st.vaka, faz: st.faz, mod: st.mod, me: me_, yer, puan: st.puan, sure: now - st.bas, owner: o.sum.owner,
        bilinen: [...k], asili: st.mod === 'ayri' ? st.pano.filter(p => p.delil && !(kendi && kendi.has(p.delil))).map(p => ({ delil: p.delil, ad: nm(st, p.by) })) : [],
        acik: Object.keys(vaka.sahneler).filter(s => acikMi(vaka, s, k)),
        modOy: { toplu: Object.values(st.modOy).filter(v => v === 'toplu').length, ayri: Object.values(st.modOy).filter(v => v === 'ayri').length, benim: me_ ? st.modOy[me_] || null : null, kalan: Math.max(0, st.modBitis - now), kisi: here.length },
        pano: st.pano.map(p => ({ id: p.id, ad: nm(st, p.by), benim: p.by === me_, metin: p.metin, delil: p.delil, art: Object.values(p.oy).filter(v => v > 0).length, eks: Object.values(p.oy).filter(v => v < 0).length, oyum: me_ ? p.oy[me_] || 0 : 0, t: p.t })),
        log: st.log.map(l => ({ t: l.t, metin: l.gizli && l.gizli.kim === me_ ? l.gizli.metin : l.metin })).slice(-30),
        ipucu: st.ipucu.filter(i => !i.kime || i.kime === me_).map(i => ({ ad: nm(st, i.by), kademe: i.kademe, metin: i.metin, ceza: i.ceza })),
        sonrakiCeza: (() => { const as = asamaBul(vaka, k), n = Math.min(2, st.ipucuSay[as + ':' + (st.mod === 'ayri' ? me_ : 'hep')] || 0); return vaka.ipucuCeza[n]; })(),
        oyuncular: here.map(id => ({ id, ad: nm(st, id), yer: st.mod === 'ayri' ? kisiAl(st, id).yer : st.yer, n: st.mod === 'ayri' ? kisiAl(st, id).bulunan.length : st.bulunan.length })),
        suc: st.suc ? { baslatan: st.suc.baslatan, baslatanAd: nm(st, st.suc.baslatan), kalan: Math.max(0, st.suc.bitis - now), verenler: Object.keys(st.suc.secim).map(id => nm(st, id)), benim: me_ ? st.suc.secim[me_] || null : null, kisi: here.length } : null,
        sonuc: st.sonuc, ipucuSay: st.ipucu.length
      };
    },
    render: (body, s, lv) => dkCiz(body, s, lv),
    isMyTurn: (v, seat) => seat >= 0 && ((v.faz === 'mod' && !v.modOy.benim) || (v.faz === 'suclama' && !(v.suc && v.suc.benim))),
    turnKey: v => v.faz + ':' + (v.suc ? v.suc.baslatan : '')
  });
})();

// ======================= arayüz =======================
const dk = { tid: '', root: null, yer: '', goruldu: new Set(), ses: null, sesAcik: true, anlatim: false, sekme: 'deliller', yaz: null, gorsel: null, v: null, modalId: null, sucSecim: { supheli: null, deliller: [] }, sonGosterildi: '', notKey: '' };
try { dk.sesAcik = localStorage.getItem('oyunodasi-dk-ses') !== '0'; dk.anlatim = localStorage.getItem('oyunodasi-dk-anlatim') === '1'; } catch(e){}
const dkE = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const dkVaka = v => DK_VAKALAR[v.vaka] || DK_VAKALAR.motel204;
function dkSesKur(){
  if (!dk.ses && typeof DkSes === 'function') dk.ses = new DkSes();
  const sus = typeof deafened !== 'undefined' && deafened;
  if (dk.ses) dk.ses.ac_kapa(dk.sesAcik && !sus);
}
function dkSure(ms){ const d = Math.floor(ms / 60000); return d < 60 ? d + ' dk' : Math.floor(d / 60) + ' sa ' + (d % 60) + ' dk'; }

// ---------- daktilo altyazı ----------
function dkDaktilo(el, metin, hiz, bitince){
  clearInterval(el._t); let i = 0; el.classList.add('yaziyor');
  const tamamla = () => { clearInterval(el._t); el.textContent = metin; el.classList.remove('yaziyor'); if (bitince) bitince(); };
  el.onclick = tamamla;
  if (typeof reducedMotion === 'function' && reducedMotion()){ tamamla(); return; }
  el.textContent = '';
  el._t = setInterval(() => {
    if (!el.isConnected){ clearInterval(el._t); return; }
    i++; el.textContent = metin.slice(0, i);
    if (dk.ses && i % 2 === 0 && metin[i - 1] !== ' ') dk.ses.daktilo();
    if (metin[i - 1] === '\n' && dk.ses) dk.ses.zil();
    if (el._olay) el._olay(metin.slice(0, i));
    if (i >= metin.length) tamamla();
  }, hiz || 28);
}
function dkSoyle(metin){
  if (!dk.anlatim || !window.speechSynthesis) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(metin.replace(/[\[\]"“”]/g, '')); u.lang = 'tr-TR'; u.rate = 0.95; u.pitch = 0.8;
    const ses = speechSynthesis.getVoices().find(x => /^tr/i.test(x.lang)); if (ses) u.voice = ses; speechSynthesis.speak(u); } catch(e){}
}

// ---------- canlı katman: dış mekanda yağmur, şimşek, floresan titremesi ----------
class DkFoto {
  constructor(sahne){
    this.el = sahne; this.cv = sahne.querySelector('.dk-yagmur'); this.c = {}; this.damla = []; this.son = 0; this.t0 = performance.now();
    this.kare = this.kare.bind(this); this.raf = requestAnimationFrame(this.kare);
  }
  ayarla(sc){
    this.c = sc || {};
    const az = typeof reducedMotion === 'function' && reducedMotion();
    const n = this.c.dis && !az ? Math.round((this.c.yagmur || 0) * 380) : 0;
    this.damla = Array.from({ length: n }, () => { const y = Math.random() < 0.18; return { x: Math.random() * 1.15, y: Math.random(), v: y ? 0.05 + Math.random() * 0.02 : 0.028 + Math.random() * 0.016, l: y ? 0.09 + Math.random() * 0.06 : 0.025 + Math.random() * 0.035, a: y ? 0.1 + Math.random() * 0.1 : 0.06 + Math.random() * 0.14, w: y ? 2.2 : 1 }; });
    this.el.classList.toggle('floresan', !!this.c.floresan && !az);
  }
  simsek(){
    if (!(this.c.yagmur > 0)) return;
    this.son = performance.now();
    this.el.classList.remove('simsek'); void this.el.offsetWidth; this.el.classList.add('simsek');
    if (dk.ses) setTimeout(() => dk.ses.gok(), 400 + Math.random() * 1600);
  }
  kare(t){
    this.raf = requestAnimationFrame(this.kare);
    if (!this.el.isConnected){ cancelAnimationFrame(this.raf); return; }
    if (document.hidden) return;
    const cv = this.cv, r = cv.getBoundingClientRect();
    if (cv.width !== Math.round(r.width) || cv.height !== Math.round(r.height)){ cv.width = Math.max(1, Math.round(r.width)); cv.height = Math.max(1, Math.round(r.height)); }
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    if (this.damla.length){
      ctx.lineCap = 'round';
      this.damla.forEach(d => {
        d.y += d.v; d.x -= d.v * 0.16;
        if (d.y > 1.05){ d.y = -d.l; d.x = Math.random() * 1.15; }
        ctx.strokeStyle = 'rgba(205,218,238,' + d.a + ')'; ctx.lineWidth = d.w;
        ctx.beginPath(); ctx.moveTo(d.x * W, d.y * H); ctx.lineTo((d.x + d.l * 0.16) * W, (d.y - d.l) * H); ctx.stroke();
      });
    }
    if (this.c.yagmur > 0 && t - this.son > 14000 && Math.random() < 0.003) this.simsek();
  }
}

// ---------- ana çizim ----------
function dkCiz(body, s, lv){
  const v = lv.v; dk.v = v;
  if (v.faz !== 'son' && dk.sonGosterildi) dk.sonGosterildi = '';
  dk.bitis = Date.now() + (v.faz === 'mod' ? v.modOy.kalan : v.suc ? v.suc.kalan : 0);
  const vaka = dkVaka(v);
  if (!dk.root || !dk.root.isConnected || dk.tid !== s.id){
    dk.tid = s.id; dk.yer = ''; dk.goruldu = new Set(); dk.sonGosterildi = ''; dk.notKey = 'oyunodasi-dk-not-' + v.vaka;
    body.innerHTML = '';
    const r = dkE('div', 'dk');
    r.innerHTML =
      '<div class="dk-ust"><div class="dk-baslik"><b></b><span class="dk-yer"></span></div><span class="dk-mod-rozet"></span><span class="dk-puan" title="Ekip puanı"></span>' +
      '<div class="dk-tuslar"><button type="button" class="btn small" data-harita>🗺 Mekanlar</button><button type="button" class="btn small" data-goster title="Tıklanabilir yerleri göster">🔍</button>' +
      '<button type="button" class="btn small" data-ses title="Ses"></button><button type="button" class="btn small" data-anlatim title="Sesli anlatım (tarayıcının Türkçe sesiyle)"></button>' +
      '<button type="button" class="btn small dk-sucla-btn" data-sucla>⚖️ Katili Suçla</button></div></div>' +
      '<div class="dk-govde"><div class="dk-sol"><div class="dk-sahne"><img class="dk-foto" alt=""><canvas class="dk-yagmur"></canvas><div class="dk-hot"></div><div class="dk-gren"></div><div class="dk-flas"></div><div class="dk-perde"><p></p></div><div class="dk-serit"></div></div>' +
      '<div class="dk-altyazi" title="Tıkla: hemen göster"></div><div class="dk-log"></div></div>' +
      '<div class="dk-sag"><div class="dk-sekmeler"><button data-sk="deliller">🧾 Deliller</button><button data-sk="defter">📒 Ortak defter</button><button data-sk="supheli">🕵 Şüpheliler</button><button data-sk="not">✏️ Notlarım</button></div><div class="dk-sekme"></div>' +
      '<div class="dk-ipucu"><button type="button" class="btn small" data-ipucu></button><div class="dk-ipucu-liste"></div></div></div></div>' +
      '<div class="dk-katman"></div>';
    body.append(r); dk.root = r;
    dk.gorsel = new DkFoto(r.querySelector('.dk-sahne'));
    r.querySelector('[data-harita]').onclick = () => dkHarita();
    r.querySelector('[data-goster]').onclick = e => { r.querySelector('.dk-sahne').classList.toggle('goster'); e.currentTarget.classList.toggle('on'); };
    r.querySelector('[data-ses]').onclick = () => { dk.sesAcik = !dk.sesAcik; try { localStorage.setItem('oyunodasi-dk-ses', dk.sesAcik ? '1' : '0'); } catch(e){} dkSesKur(); dkUstGuncelle(); };
    r.querySelector('[data-anlatim]').onclick = () => { dk.anlatim = !dk.anlatim; try { localStorage.setItem('oyunodasi-dk-anlatim', dk.anlatim ? '1' : '0'); } catch(e){} if (!dk.anlatim && window.speechSynthesis) speechSynthesis.cancel(); dkUstGuncelle(); };
    r.querySelector('[data-sucla]').onclick = () => { if (dk.v.faz === 'oyun') dkOnay('⚖️ Katili suçla', 'Suçlama başlayınca masadaki herkes bir şüpheli ve en fazla 2 kanıt seçer. Çoğunluğun kararı kesin sonuçtur, geri dönüşü yok. Hazır mısınız?', 'Suçlamayı başlat', () => tableAct({ type: 'suclaBasla' })); };
    r.querySelector('[data-ipucu]').onclick = () => dkOnay('💡 İpucu', 'Bu ipucu ekip puanından ' + dk.v.sonrakiCeza + ' puan düşer. Aynı aşamada her yeni ipucu daha açık (ve daha pahalı) olur.', 'İpucu al (−' + dk.v.sonrakiCeza + ')', () => tableAct({ type: 'ipucu' }));
    r.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { dk.sekme = b.dataset.sk; dkSekmeCiz(); });
    // ilk dokunuşta ses başlasın (tarayıcılar kullanıcı hareketi olmadan ses açmaz)
    r.addEventListener('pointerdown', () => dkSesKur(), { once: true });
    dkSesKur();
    // oylama / suçlama geri sayımı
    clearInterval(dk.tik);
    dk.tik = setInterval(() => {
      if (!r.isConnected){ clearInterval(dk.tik); const pk = document.getElementById('dkPencereler'); if (pk) pk.innerHTML = ''; if (dk.ses) dk.ses.ac_kapa(false); if (window.speechSynthesis) speechSynthesis.cancel(); return; }
      const sn = Math.max(0, Math.ceil((dk.bitis - Date.now()) / 1000));
      r.querySelectorAll('[data-sn]').forEach(e => { e.textContent = sn + ' sn'; });
    }, 500);
  }
  const r = dk.root;
  dkUstGuncelle();
  // mekan değiştiyse: sinematik geçiş
  if (v.faz !== 'mod' && v.yer !== dk.yer) dkSahneGec(v.yer, !dk.yer);
  dkHotCiz();
  dkSekmeCiz();
  // ipucu alanı
  const ib = r.querySelector('[data-ipucu]'); ib.textContent = '💡 İpucu iste (−' + v.sonrakiCeza + ')'; ib.disabled = v.faz !== 'oyun';
  const il = r.querySelector('.dk-ipucu-liste'); il.innerHTML = '';
  v.ipucu.slice(-3).reverse().forEach(i => { const p = dkE('p', 'k' + i.kademe); p.append(dkE('b', '', ['🟢', '🟡', '🔴'][i.kademe] + ' ' + (i.kademe + 1) + '. kademe · ' + i.ad + ': '), document.createTextNode(i.metin)); il.append(p); });
  // olay akışı
  const lg = r.querySelector('.dk-log'); lg.innerHTML = '';
  v.log.slice(-5).forEach(l => lg.append(dkE('p', '', l.metin)));
  r.querySelector('[data-sucla]').disabled = v.faz !== 'oyun' || v.me == null;
  dkKatmanCiz();
}
function dkUstGuncelle(){
  const r = dk.root, v = dk.v, vaka = dkVaka(v), sc = vaka.sahneler[v.yer];
  r.querySelector('.dk-baslik b').textContent = '🕵️ ' + vaka.ad;
  r.querySelector('.dk-yer').textContent = sc ? sc.ad + ' · ' + sc.saat : '';
  r.querySelector('.dk-mod-rozet').textContent = v.mod === 'ayri' ? '🧭 Ayrı gezi' : v.mod === 'toplu' ? '👥 Toplu gezi' : '🗳 Oylama';
  r.querySelector('.dk-puan').textContent = '★ ' + v.puan;
  r.querySelector('[data-ses]').textContent = dk.sesAcik ? '🔊' : '🔇';
  r.querySelector('[data-anlatim]').textContent = '🗣';
  r.querySelector('[data-anlatim]').classList.toggle('on', dk.anlatim);
}
function dkSahneGec(yer, ilk){
  const r = dk.root, vaka = dkVaka(dk.v), sc = vaka.sahneler[yer]; if (!sc) return;
  const eski = dk.yer; dk.yer = yer;
  const sahne = r.querySelector('.dk-sahne'), perde = sahne.querySelector('.dk-perde'), img = sahne.querySelector('.dk-foto');
  const goster = () => {
    img.src = sc.img; img.alt = sc.ad;
    sahne.querySelector('.dk-serit').textContent = sc.ad + ' — ' + sc.saat;
    dk.gorsel.ayarla(sc);
    if (dk.ses) dk.ses.ortam(sc.yagmur, sc.ic);
    dkHotCiz();
    const alt = r.querySelector('.dk-altyazi');
    const metin = dk.goruldu.has(yer) ? sc.ad + '. ' + (sc.ic ? 'İçerisi hâlâ aynı kokuyordu.' : 'Yağmur hâlâ yağıyordu.') : sc.giris;
    dk.goruldu.add(yer);
    dkDaktilo(alt, metin, 26);
    dkSoyle(metin);
    setTimeout(() => sahne.classList.remove('kapali'), 60);
    if (sc.yagmur > 0.5 && !ilk) setTimeout(() => dk.gorsel.simsek(), 1600);
  };
  if (ilk || !eski){ sahne.classList.add('kapali'); goster(); return; }
  perde.querySelector('p').textContent = '→ ' + sc.ad + ' · ' + sc.saat;
  sahne.classList.add('kapali', 'gecis');
  if (dk.ses) dk.ses.silecek();
  setTimeout(() => { goster(); setTimeout(() => sahne.classList.remove('gecis'), 900); }, 1100);
}
function dkHotCiz(){
  const r = dk.root, v = dk.v, vaka = dkVaka(v), sc = vaka.sahneler[dk.yer]; if (!sc) return;
  const box = r.querySelector('.dk-hot'), k = new Set(v.bilinen), sig = dk.yer + '|' + v.bilinen.join(',') + '|' + v.faz;
  if (box._sig === sig) return; box._sig = sig; box.innerHTML = '';
  sc.hot.forEach(h => {
    const b = dkE('button', 'dk-nokta' + (h.delil ? '' : ' detay') + (h.delil && k.has(h.delil) ? ' bulundu' : ''));
    b.type = 'button'; b.style.left = h.x + '%'; b.style.top = h.y + '%'; b.style.width = h.w + '%'; b.style.height = h.h + '%';
    b.title = h.etiket; b.setAttribute('aria-label', h.etiket);
    b.append(dkE('span', 'dk-et', (h.delil && k.has(h.delil) ? '✓ ' : '🔍 ') + h.etiket));
    b.onclick = () => dkNoktaTik(h);
    box.append(b);
  });
}
function dkNoktaTik(h){
  const v = dk.v, vaka = dkVaka(v);
  dkSesKur();
  if (v.faz !== 'oyun'){ toast(v.faz === 'mod' ? 'Önce gezme şeklini oylayın' : 'Suçlama sürüyor'); return; }
  if (!h.delil){ dkModal({ ikon: '🔎', ad: h.etiket, metin: h.metin, resim: null }); if (dk.ses) dk.ses.kagit(); return; }
  if (!v.bilinen.includes(h.delil)){ tableAct({ type: 'bul', delil: h.delil }); if (dk.ses) dk.ses.bulundu(); }
  dkDelilAc(h.delil, h.git);
}

// ---------- inceleme penceresi ----------
function dkDelilAc(id, git){
  const vaka = dkVaka(dk.v), d = vaka.deliller[id]; if (!d) return;
  dkModal(Object.assign({ id }, d), git);
}
function dkModal(d, git){
  const kat = dkPencereKat();
  kat.querySelectorAll('.dk-modal').forEach(m => m.remove());
  if (window.speechSynthesis && dk.anlatim) speechSynthesis.cancel();
  const m = dkE('div', 'dk-modal tur-' + (d.tur || 'detay'));
  const kart = dkE('div', 'dk-kagit');
  kart.append(dkE('h3', '', (d.ikon || '🔎') + ' ' + d.ad));
  const ic = dkE('div', 'dk-ic');
  if (d.dondur){ ic.append(dkDondur(d)); }
  else if (d.resim){ const fig = dkE('div', 'dk-resim'); const im = dkE('img'); im.src = d.resim; im.alt = d.ad; fig.append(im); ic.append(fig); }
  const yazi = dkE('div', 'dk-yazi'); ic.append(yazi);
  kart.append(ic);
  const alt = dkE('div', 'dk-modal-alt');
  if (d.id && dk.v.me != null){
    const as = dkE('button', 'btn small', '📌 Ortak deftere as'); as.type = 'button';
    const kutu = dkE('div', 'dk-as'); kutu.hidden = true;
    const inp = dkE('input'); inp.type = 'text'; inp.maxLength = 220; inp.placeholder = 'Not ekle (isteğe bağlı)…';
    const tm = dkE('button', 'btn small primary', 'As'); tm.type = 'button';
    tm.onclick = () => { tableAct({ type: 'pano', delil: d.id, metin: inp.value || '' }); toast('📒 Ortak deftere asıldı'); kutu.hidden = true; as.disabled = true; };
    inp.onkeydown = e => { if (e.key === 'Enter') tm.click(); };
    kutu.append(inp, tm);
    as.onclick = () => { kutu.hidden = false; as.hidden = true; inp.focus({ preventScroll: true }); };
    kart.append(kutu);
    alt.append(as);
  }
  if (git){ const g = dkE('button', 'btn small primary', '📂 Dosyayı lambanın altına çek →'); g.type = 'button'; g.onclick = () => { m.remove(); tableAct({ type: 'git', yer: git }); }; alt.append(g); }
  const kapa = dkE('button', 'btn small', 'Masaya bırak'); kapa.type = 'button'; kapa.onclick = () => { m.remove(); if (dk.ses) dk.ses.kagit(); };
  alt.append(kapa);
  kart.append(alt);
  m.append(kart);
  m.onclick = e => { if (e.target === m) kapa.click(); };
  kat.append(m);
  // ses ve metin
  const metin = d.metin || '';
  if (dk.ses){ if (d.ses === 'kaset') dk.ses.kaset(); else if (d.ses === 'telsiz') dk.ses.telsiz(3.2); else if (d.ses === 'telefon') dk.ses.telefon(); else if (d.ses === 'zippo') dk.ses.zippo(); else dk.ses.kagit(); }
  let klik = false;
  yazi._olay = s2 => { if (!klik && /KLİK/.test(s2) && d.ses === 'kaset' && dk.ses){ klik = true; dk.ses.zippo(); } };
  const basla = () => dkDaktilo(yazi, metin, d.tur === 'ses' ? 30 : 12);
  if (d.ses === 'kaset' || d.ses === 'telsiz') setTimeout(basla, d.ses === 'kaset' ? 1500 : 400); else basla();
  dkSoyle(metin);
}
// 360° döndürme: ön yüz fotoğraf, arka yüz (dip tablası / taban) gizli damgayla
function dkDondur(d){
  const wrap = dkE('div', 'dk-dondur');
  const sahne = dkE('div', 'dk-obje-sahne'), obje = dkE('div', 'dk-obje ' + (d.dondur.gizli === 'kovan711' ? 'kovan' : 'zippo'));
  const on = dkE('div', 'yuz on'); const im = dkE('img'); im.src = d.resim; im.alt = d.ad; on.append(im);
  const arka = dkE('div', 'yuz arka'); const taban = dkE('div', 'taban'); const dam = dkE('span', 'damga', d.dondur.yazi); taban.append(dam); arka.append(taban);
  obje.append(on, arka); sahne.append(obje);
  const sl = dkE('input'); sl.type = 'range'; sl.min = 0; sl.max = 360; sl.value = 0; sl.className = 'dk-aci'; sl.setAttribute('aria-label', 'Nesneyi döndür');
  const bilgi = dkE('p', 'dk-dondur-not', '↔ Kaydır ya da sürükle: nesneyi çevir');
  let aci = 0, bulundu = dk.v.bilinen.includes(d.dondur.gizli);
  const uygula = () => {
    obje.style.transform = 'rotateY(' + aci + 'deg) rotateX(' + (Math.sin(aci * Math.PI / 180) * 8) + 'deg)';
    const [a1, a2] = d.dondur.ipucuAci, gorunur = aci >= a1 && aci <= a2;
    wrap.classList.toggle('acik', gorunur);
    if (gorunur && !bulundu && dk.v.faz === 'oyun'){
      bulundu = true; tableAct({ type: 'bul', delil: d.dondur.gizli });
      if (dk.ses){ dk.ses.bulundu(); if (d.dondur.gizli === 'zippo_kazima') dk.ses.zippo(); }
      bilgi.textContent = '🔎 Gizli bir şey buldun: ' + d.dondur.yazi;
      bilgi.classList.add('buldu');
      setTimeout(() => { const g = dkVaka(dk.v).deliller[d.dondur.gizli]; if (g) toast(g.ikon + ' ' + g.ad); }, 300);
    }
  };
  sl.oninput = () => { aci = +sl.value; uygula(); };
  let surukle = null;
  sahne.onpointerdown = e => { surukle = { x: e.clientX, a: aci }; sahne.setPointerCapture(e.pointerId); };
  sahne.onpointermove = e => { if (!surukle) return; aci = ((surukle.a + (e.clientX - surukle.x) * 0.9) % 360 + 360) % 360; sl.value = Math.round(aci); uygula(); };
  sahne.onpointerup = sahne.onpointercancel = () => { surukle = null; };
  wrap.append(sahne, sl, bilgi);
  if (bulundu){ bilgi.textContent = '✓ Gizli damga: ' + d.dondur.yazi; }
  uygula();
  return wrap;
}
// pencereler sayfanın en üstünde açılır (oyun alanının içinde kalırsa üst/alt çubuğun altında kalıyor)
function dkPencereKat(){
  let k = document.getElementById('dkPencereler');
  if (!k){ k = dkE('div', 'dk-pencereler'); k.id = 'dkPencereler'; document.body.append(k); }
  return k;
}
function dkOnay(baslik, metin, tamam, fn){
  const kat = dkPencereKat();
  const m = dkE('div', 'dk-modal'), k = dkE('div', 'dk-kagit kucuk');
  k.append(dkE('h3', '', baslik), dkE('p', '', metin));
  const a = dkE('div', 'dk-modal-alt'), e = dkE('button', 'btn small primary', tamam), h = dkE('button', 'btn small', 'Vazgeç');
  e.type = h.type = 'button'; e.onclick = () => { m.remove(); fn(); }; h.onclick = () => m.remove();
  a.append(e, h); k.append(a); m.append(k); m.onclick = ev => { if (ev.target === m) m.remove(); };
  kat.append(m);
}
function dkHarita(){
  const kat = dkPencereKat(), v = dk.v, vaka = dkVaka(v);
  const m = dkE('div', 'dk-modal'), k = dkE('div', 'dk-kagit dk-harita');
  k.append(dkE('h3', '', '🗺 Mekanlar'), dkE('p', 'note', v.mod === 'ayri' ? 'Ayrı geziyorsunuz: sadece sen gidersin.' : 'Toplu geziyorsunuz: bir mekana gidince bütün ekip gelir.'));
  const ul = dkE('div', 'dk-mekanlar');
  Object.keys(vaka.sahneler).forEach(id => {
    const sc = vaka.sahneler[id], acik = v.acik.includes(id);
    const b = dkE('button', 'dk-mekan' + (id === v.yer ? ' burada' : '') + (acik ? '' : ' kilitli')); b.type = 'button';
    const im = dkE('img'); im.src = sc.img; im.alt = ''; im.loading = 'lazy'; b.append(im);
    const t = dkE('div'); t.append(dkE('b', '', (acik ? '' : '🔒 ') + sc.ad), dkE('span', '', acik ? sc.saat + (id === v.yer ? ' · buradasın' : '') : sc.kosulAd || 'Kilitli'));
    const kim = v.mod === 'ayri' ? v.oyuncular.filter(p => p.yer === id && p.id !== v.me).map(p => p.ad) : [];
    if (kim.length) t.append(dkE('em', '', '👤 ' + kim.join(', ')));
    b.append(t);
    b.disabled = !acik || id === v.yer || v.faz !== 'oyun';
    b.onclick = () => { m.remove(); tableAct({ type: 'git', yer: id }); };
    ul.append(b);
  });
  k.append(ul);
  const kapa = dkE('button', 'btn small', 'Kapat'); kapa.type = 'button'; kapa.onclick = () => m.remove();
  const alt = dkE('div', 'dk-modal-alt'); alt.append(kapa); k.append(alt);
  m.append(k); m.onclick = e => { if (e.target === m) m.remove(); };
  kat.append(m);
}

// ---------- sağ panel ----------
function dkSekmeCiz(){
  const r = dk.root, v = dk.v, vaka = dkVaka(v), box = r.querySelector('.dk-sekme');
  r.querySelectorAll('[data-sk]').forEach(b => b.classList.toggle('on', b.dataset.sk === dk.sekme));
  const sig = dk.sekme + '|' + JSON.stringify([v.bilinen, v.pano, v.asili, v.mod]);
  if (dk.sekme !== 'not' && box._sig === sig) return;
  if (dk.sekme === 'not' && box._sig === 'not') return;
  box._sig = dk.sekme === 'not' ? 'not' : sig;
  // yazılan taslak kaybolmasın
  const taslak = box.querySelector('textarea.dk-taslak'); const tv = taslak ? taslak.value : '';
  box.innerHTML = '';
  if (dk.sekme === 'deliller'){
    const toplam = Object.keys(vaka.deliller).length;
    box.append(dkE('p', 'dk-sayac', v.bilinen.length + ' / ' + toplam + ' delil'));
    if (!v.bilinen.length) box.append(dkE('p', 'note', 'Henüz delil yok. Sahnede nesnelere tıkla (🔍 tuşu tıklanabilir yerleri gösterir).'));
    const asili = new Map(v.asili.map(a => [a.delil, a.ad]));
    v.bilinen.slice().reverse().forEach(id => {
      const d = vaka.deliller[id]; if (!d) return;
      const b = dkE('button', 'dk-delil' + (d.guclu ? ' guclu' : '')); b.type = 'button';
      b.append(dkE('span', 'ik', d.ikon), (() => { const x = dkE('div'); x.append(dkE('b', '', d.ad), dkE('span', '', d.ozet)); if (asili.has(id)) x.append(dkE('em', '', '📌 ' + asili.get(id) + ' deftere astı')); return x; })());
      b.onclick = () => dkDelilAc(id);
      box.append(b);
    });
  } else if (dk.sekme === 'defter'){
    box.append(dkE('p', 'note', v.mod === 'ayri' ? 'Ayrı geziyorsunuz: bulduğun delili buraya asarsan herkes görür ve onun açtığı mekanlara gidebilir.' : 'Fikirlerini yaz, ekip oylasın. En çok 👍 alan en üstte.'));
    const f = dkE('div', 'dk-defter-yaz');
    const ta = dkE('textarea', 'dk-taslak'); ta.maxLength = 220; ta.placeholder = 'Ör: Kasetteki klik bir çakmak olabilir…'; ta.value = tv;
    const sel = dkE('select'); sel.append(new Option('Delil ekleme (isteğe bağlı)', ''));
    v.bilinen.forEach(id => { const d = vaka.deliller[id]; if (d) sel.append(new Option(d.ikon + ' ' + d.ad, id)); });
    const b = dkE('button', 'btn small primary', 'Deftere yaz'); b.type = 'button';
    b.onclick = () => { if (!ta.value.trim() && !sel.value) return; tableAct({ type: 'pano', metin: ta.value, delil: sel.value || null }); ta.value = ''; };
    f.append(ta, sel, b); box.append(f);
    const liste = v.pano.slice().sort((a, b2) => (b2.art - b2.eks) - (a.art - a.eks) || b2.t - a.t);
    if (!liste.length) box.append(dkE('p', 'note', 'Defter boş.'));
    liste.forEach(p => {
      const e = dkE('div', 'dk-not');
      const ust = dkE('div', 'dk-not-ust'); ust.append(dkE('b', '', p.ad));
      if (p.delil && vaka.deliller[p.delil]){ const c = dkE('button', 'dk-cip', vaka.deliller[p.delil].ikon + ' ' + vaka.deliller[p.delil].ad); c.type = 'button'; c.onclick = () => dkDelilAc(p.delil); ust.append(c); }
      e.append(ust);
      if (p.metin) e.append(dkE('p', '', p.metin));
      const oy = dkE('div', 'dk-oy');
      const art = dkE('button', p.oyum > 0 ? 'on' : '', '👍 ' + p.art), eks = dkE('button', p.oyum < 0 ? 'on' : '', '👎 ' + p.eks);
      art.type = eks.type = 'button';
      art.onclick = () => tableAct({ type: 'oy', id: p.id, d: p.oyum > 0 ? 0 : 1 }); eks.onclick = () => tableAct({ type: 'oy', id: p.id, d: p.oyum < 0 ? 0 : -1 });
      oy.append(art, eks);
      if (p.benim || v.owner === v.me){ const x = dkE('button', 'sil', '✕'); x.type = 'button'; x.title = 'Sil'; x.onclick = () => tableAct({ type: 'panoSil', id: p.id }); oy.append(x); }
      e.append(oy); box.append(e);
    });
  } else if (dk.sekme === 'supheli'){
    vaka.supheliler.forEach(sp => {
      const c = dkE('div', 'dk-supheli');
      const f = dkE('div', 'dk-sup-foto'); if (sp.resim){ const im = dkE('img'); im.src = sp.resim; im.alt = sp.ad; f.append(im); } else f.append(dkE('span', '', 'FOTOĞRAF YOK'));
      const t = dkE('div'); t.append(dkE('b', '', sp.ad + ', ' + sp.yas), dkE('span', 'rol', sp.rol), dkE('p', 'ifade', sp.ifade), dkE('p', 'not', sp.not));
      c.append(f, t); box.append(c);
    });
  } else {
    let kayit = ''; try { kayit = localStorage.getItem(dk.notKey) || ''; } catch(e){}
    box.append(dkE('p', 'note', 'Sadece sen görürsün, bu cihazda saklanır.'));
    const ta = dkE('textarea', 'dk-notlarim'); ta.value = kayit; ta.placeholder = 'Şüphelerin, saatler, bağlantılar…';
    ta.oninput = () => { try { localStorage.setItem(dk.notKey, ta.value); } catch(e){} };
    box.append(ta);
  }
}

// ---------- tam ekran katmanlar: oylama, suçlama, son ----------
function dkKatmanCiz(){
  const v = dk.v, vaka = dkVaka(v), kat = dk.root.querySelector('.dk-katman');
  let el = kat.querySelector('.dk-tam');
  const tur = v.faz === 'mod' ? 'mod' : v.faz === 'suclama' ? 'suc' : v.faz === 'son' && dk.sonGosterildi !== 'kapali' ? 'son' : '';
  if (!tur){ if (el) el.remove(); return; }
  if (!el || el.dataset.tur !== tur){ if (el) el.remove(); el = dkE('div', 'dk-tam'); el.dataset.tur = tur; kat.prepend(el); el._ilk = true; }
  if (tur === 'mod'){
    el.style.backgroundImage = 'url(' + vaka.kapak + ')';
    if (el._ilk){
      el._ilk = false;
      el.innerHTML = '<div class="dk-tam-ic"><p class="dk-ust-yazi">KARA DOSYALAR · VAKA 1 · ' + vaka.yil.toLocaleUpperCase('tr-TR') + '</p><h2></h2><p class="dk-ozet"></p><h4>Nasıl gezelim?</h4><div class="dk-mod-sec"></div><p class="dk-mod-durum note"></p></div>';
      el.querySelector('h2').textContent = vaka.ad; el.querySelector('.dk-ozet').textContent = vaka.ozet;
      const sec = el.querySelector('.dk-mod-sec');
      [['toplu', '👥 Toplu gezelim', 'Herkes aynı mekanda. Biri bir yere gidince bütün ekip gider, bulunan her delil herkesindir.'], ['ayri', '🧭 Ayrı gezelim', 'Herkes kendi başına gezer, kendi delilini bulur. Bulduklarınızı ortak deftere asıp paylaşırsınız.']].forEach(([k, b, a]) => {
        const btn = dkE('button', 'dk-mod-kart'); btn.type = 'button'; btn.dataset.k = k; btn.append(dkE('b', '', b), dkE('span', '', a));
        btn.onclick = () => { dkSesKur(); tableAct({ type: 'mod', secim: k }); };
        sec.append(btn);
      });
    }
    el.querySelectorAll('.dk-mod-kart').forEach(b => { b.classList.toggle('on', v.modOy.benim === b.dataset.k); b.disabled = v.me == null; });
    el.querySelector('.dk-mod-durum').textContent = '👥 ' + v.modOy.toplu + ' · 🧭 ' + v.modOy.ayri + ' — ' + (v.modOy.toplu + v.modOy.ayri) + '/' + v.modOy.kisi + ' oy verdi · eşitlikte toplu · ';
    const sn1 = dkE('span'); sn1.dataset.sn = ''; sn1.textContent = Math.ceil(v.modOy.kalan / 1000) + ' sn'; el.querySelector('.dk-mod-durum').append(sn1);
  } else if (tur === 'suc'){
    const s = v.suc;
    if (el._ilk || el._b !== s.baslatan){
      el._ilk = false; el._b = s.baslatan; dk.sucSecim = { supheli: null, deliller: [] };
      el.style.backgroundImage = 'url(img/dedektif/4_dosya.webp)';
      el.innerHTML = '<div class="dk-tam-ic genis"><p class="dk-ust-yazi">⚖️ SUÇLAMA</p><h2>Katil kim?</h2><p class="note dk-suc-kim"></p><div class="dk-sup-sec"></div><h4>Kanıtların (en fazla 2)</h4><div class="dk-kanit-sec"></div><div class="dk-modal-alt"><button type="button" class="btn primary" data-gonder>Kararımı ver</button><button type="button" class="btn small" data-iptal>Suçlamayı geri çek</button></div><p class="dk-suc-durum note"></p></div>';
      const ss = el.querySelector('.dk-sup-sec');
      vaka.supheliler.forEach(sp => { const b = dkE('button', 'dk-sup-kart'); b.type = 'button'; b.dataset.id = sp.id; const f = dkE('div', 'dk-sup-foto'); if (sp.resim){ const im = dkE('img'); im.src = sp.resim; f.append(im); } else f.append(dkE('span', '', '?')); b.append(f, dkE('b', '', sp.ad)); b.onclick = () => { dk.sucSecim.supheli = sp.id; dkKatmanCiz(); }; ss.append(b); });
      el.querySelector('[data-gonder]').onclick = () => { if (!dk.sucSecim.supheli){ toast('Önce bir şüpheli seç'); return; } tableAct({ type: 'suclaSec', supheli: dk.sucSecim.supheli, deliller: dk.sucSecim.deliller }); };
      el.querySelector('[data-iptal]').onclick = () => tableAct({ type: 'suclaIptal' });
    }
    el.querySelector('.dk-suc-kim').textContent = s.baslatanAd + ' suçlama başlattı. Herkes kendi kararını versin; çoğunluk kazanır.';
    const ks = el.querySelector('.dk-kanit-sec'); ks.innerHTML = '';
    v.bilinen.forEach(id => { const d = vaka.deliller[id]; if (!d) return; const b = dkE('button', 'dk-cip' + (dk.sucSecim.deliller.includes(id) ? ' on' : ''), d.ikon + ' ' + d.ad); b.type = 'button';
      b.onclick = () => { const a = dk.sucSecim.deliller; const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else { if (a.length >= 2) a.shift(); a.push(id); } dkKatmanCiz(); }; ks.append(b); });
    el.querySelectorAll('.dk-sup-kart').forEach(b => b.classList.toggle('on', dk.sucSecim.supheli === b.dataset.id));
    const ben = s.benim;
    el.querySelector('[data-gonder]').disabled = v.me == null;
    el.querySelector('[data-gonder]').textContent = ben ? '✓ Kararını verdin (değiştirebilirsin)' : 'Kararımı ver';
    el.querySelector('[data-iptal]').hidden = !(v.me === s.baslatan || v.me === v.owner);
    el.querySelector('.dk-suc-durum').textContent = s.verenler.length + '/' + s.kisi + ' karar verdi' + (s.verenler.length ? ' (' + s.verenler.join(', ') + ')' : '') + ' · ';
    const sn2 = dkE('span'); sn2.dataset.sn = ''; sn2.textContent = Math.ceil(s.kalan / 1000) + ' sn'; el.querySelector('.dk-suc-durum').append(sn2);
  } else if (tur === 'son'){
    const so = v.sonuc, son = vaka.sonlar[so.tur];
    if (dk.sonGosterildi === v.vaka + so.sure) return;
    dk.sonGosterildi = v.vaka + so.sure;
    el.style.backgroundImage = 'url(' + son.img + ')';
    el.innerHTML = '<div class="dk-tam-ic son-' + so.tur + '"><p class="dk-ust-yazi">KARA DOSYALAR · ' + vaka.kisa.toLocaleUpperCase('tr-TR') + '</p><h2></h2><pre class="dk-son-metin"></pre><div class="dk-son-ist"></div><div class="dk-modal-alt"></div></div>';
    el.querySelector('h2').textContent = son.baslik;
    const sup = vaka.supheliler.find(x => x.id === so.supheli);
    const metin = so.tur === 'basarisiz' ? son[so.supheli] || son.viktor : son.metin;
    dkDaktilo(el.querySelector('.dk-son-metin'), metin, 30);
    dkSoyle(metin);
    if (dk.ses){ if (so.tur === 'zafer'){ dk.ses.zippo(); setTimeout(() => dk.ses.zippo(), 900); } else dk.ses.gok(); }
    const ist = el.querySelector('.dk-son-ist');
    [['Suçlanan', sup ? sup.ad : '?'], ['Kanıtlar', so.deliller.map(d => vaka.deliller[d] ? vaka.deliller[d].ikon + ' ' + vaka.deliller[d].ad : d).join(' + ') || '—'], ['Puan', '★ ' + so.puan], ['Süre', dkSure(so.sure)], ['İpucu', String(v.ipucuSay)], ['Bulunan delil', v.bilinen.length + '/' + Object.keys(vaka.deliller).length]]
      .forEach(([a, b]) => { const p = dkE('p'); p.append(dkE('span', '', a), dkE('b', '', b)); ist.append(p); });
    if (so.tur !== 'zafer'){ const g = dkE('p', 'dk-gercek'); g.textContent = 'Gerçek: Katil ' + vaka.supheliler.find(x => x.id === vaka.katil).ad + '. Belirleyici kanıtlar: Zippo sesi eşleşmesi (ya da kazıma) + 4082\'nin lastik izleri (ya da kırık mühür).'; el.querySelector('.dk-tam-ic').append(g); }
    const alt = el.querySelector('.dk-modal-alt');
    if (v.me === v.owner){ const y = dkE('button', 'btn primary', '🔁 Vakayı yeniden aç'); y.type = 'button'; y.onclick = () => { dk.sonGosterildi = ''; tableAct({ type: 'yeni' }); }; alt.append(y); }
    const k = dkE('button', 'btn small', 'Sahneye dön'); k.type = 'button'; k.onclick = () => { dk.sonGosterildi = 'kapali'; el.remove(); }; alt.append(k);
    if (so.tur === 'zafer' && typeof confetti === 'function') setTimeout(() => confetti(el), 800);
  }
}
