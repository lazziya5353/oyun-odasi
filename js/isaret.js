// Ekranda işaretleme: paylaşılan ekranın üstündeki "🖍 İşaretle" açılınca o ekranı izleyen herkes
// (paylaşan da kendi önizlemesinde) imleci adıyla görür. Tıklanan yerde halka çıkar, basılı tutup sürüklenince çizgi
// çizilir ve birkaç saniyede kendiliğinden silinir. Kontrol değildir: sadece "şuraya tıkla" diye göstermek için.
// Koordinatlar görüntünün kendisine göre (0–1) gönderilir; ekran boyutu, büyütme ya da tam ekran fark etmez.
(() => {
  const ekranlar = document.getElementById('screens');
  if (!ekranlar) return;
  const IMLEC_SURE = 3500, CIZGI_SURE = 4000, HALKA_SURE = 1100;

  const benId = () => (typeof peer !== 'undefined' && peer ? peer.id : null);
  const renkOf = id => {
    const st = typeof stilOf === 'function' ? stilOf(id) : null;
    return (st && st.renk) || (id === benId() ? (me && me.color) : (peers.get(id) || {}).color) || (typeof colorFor === 'function' ? colorFor(id) : '#5ee0b5');
  };
  const adOf = id => id === benId() ? (typeof myName !== 'undefined' ? myName : 'Ben') : ((peers.get(id) || {}).name || 'Biri');

  // hangi ekranın kimin olduğu
  function sahibi(tile){
    if (typeof localScreenTile !== 'undefined' && tile === localScreenTile) return benId();
    for (const p of peers.values()) if (p.tile === tile) return p.id;
    return null;
  }
  function tileOf(sahip){
    if (sahip === benId()) return typeof localScreenTile !== 'undefined' ? localScreenTile : null;
    const p = peers.get(sahip); return p ? p.tile : null;
  }
  const filmMi = (tile, sahip) => {
    if (tile.classList.contains('yt')) return true;
    if (sahip === benId()) return !!(typeof shareInfo !== 'undefined' && shareInfo && shareInfo.fromFile);
    const p = peers.get(sahip); return !!(p && p.screenMode === 'film');
  };

  // görüntünün kutu içindeki gerçek yeri (kenarlarda siyah boşluk olabilir)
  function icerik(v){
    const w = v.clientWidth, h = v.clientHeight, vw = v.videoWidth || 16, vh = v.videoHeight || 9;
    const s = Math.min(w / vw, h / vh), cw = vw * s, ch = vh * s;
    return { x: (w - cw) / 2, y: (h - ch) / 2, w: cw, h: ch };
  }

  // ---------- kutuya katman ve düğme ----------
  function hazirla(tile){
    if (tile._isaret) return;
    const v = tile.querySelector('video'); if (!v) return;
    const sahip = sahibi(tile); if (!sahip || filmMi(tile, sahip)) return;
    const cv = document.createElement('canvas'); cv.className = 'isaret-kat';
    v.after(cv);
    const S = tile._isaret = { v, cv, sahip, imlec: new Map(), cizgi: new Map(), bitmis: [], halka: [], acik: false, raf: 0 };
    boyutla(S);
    if (window.ResizeObserver) new ResizeObserver(() => { boyutla(S); ciz(S); }).observe(v);
    v.addEventListener('loadedmetadata', () => boyutla(S));
    const tools = tile.querySelector('.screen-tools');
    if (tools){
      const b = document.createElement('button'); b.type = 'button'; b.className = 'isaret-btn';
      b.textContent = '🖍 İşaretle'; b.title = 'Ekranda göster: tıkladığın yerde halka çıkar, basılı tutup çizebilirsin (Esc ile kapanır)';
      b.onclick = e => { e.stopPropagation(); ac(tile, !S.acik); };
      tools.prepend(b); S.btn = b;
    }
    // fare / dokunma
    let son = 0, basili = false, x0 = 0, y0 = 0, yol = 0;
    const konum = e => {
      const r = cv.getBoundingClientRect(), c = icerik(v);
      const x = (e.clientX - r.left - c.x) / c.w, y = (e.clientY - r.top - c.y) / c.h;
      return { x: Math.round(Math.min(1, Math.max(0, x)) * 1000) / 1000, y: Math.round(Math.min(1, Math.max(0, y)) * 1000) / 1000, icinde: x >= 0 && x <= 1 && y >= 0 && y <= 1 };
    };
    cv.addEventListener('pointerdown', e => {
      if (!S.acik) return;
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch(err){}
      const k = konum(e); if (!k.icinde) return;
      basili = true; x0 = k.x; y0 = k.y; yol = 0;
      gonder(S, { k: 'd', x: k.x, y: k.y }); son = performance.now();
    });
    cv.addEventListener('pointermove', e => {
      if (!S.acik) return;
      const simdi = performance.now(); if (simdi - son < 40) return;
      const k = konum(e); if (!k.icinde && !basili) return;
      if (basili) yol = Math.max(yol, Math.hypot(k.x - x0, k.y - y0));
      son = simdi; gonder(S, { k: 'm', x: k.x, y: k.y, dr: basili ? 1 : 0 });
    });
    const birak = e => {
      if (!basili) return; basili = false;
      const k = konum(e);
      gonder(S, { k: 'u', x: k.x, y: k.y, tik: yol < 0.012 ? 1 : 0 });
    };
    cv.addEventListener('pointerup', birak); cv.addEventListener('pointercancel', birak);
    cv.addEventListener('dblclick', e => e.stopPropagation());
  }
  function ac(tile, on){
    const S = tile._isaret; if (!S) return;
    if (on) document.querySelectorAll('#screens .screen').forEach(t => { if (t !== tile && t._isaret && t._isaret.acik) ac(t, false); });
    S.acik = on;
    tile.classList.toggle('isaretliyor', on);
    if (S.btn){ S.btn.textContent = on ? '✓ İşaretleniyor' : '🖍 İşaretle'; S.btn.classList.toggle('on', on); }
    if (on && typeof toast === 'function' && !ac._ipucu){ ac._ipucu = 1; toast('🖍 Tıkladığın yerde halka çıkar, basılı tutup çizebilirsin. Ekranı izleyen herkes görür.'); }
    if (!on) gonder(S, { k: 'x' });
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('#screens .screen.isaretliyor').forEach(t => ac(t, false));
  });

  // ---------- gönder / al ----------
  function gonder(S, m){
    const msg = Object.assign({ t: 'isaret', s: S.sahip }, m);
    isle(benId(), msg);
    if (typeof peers === 'undefined') return;
    peers.forEach(p => { if (p.linked && (typeof sameChan !== 'function' || sameChan(p))) try { send(p.conn, msg); } catch(e){} });
  }
  const sayi = v => typeof v === 'number' && isFinite(v) ? Math.min(1, Math.max(0, v)) : null;
  const uyarilan = new Set();
  function isle(kim, d){
    const tile = tileOf(d.s); if (!tile || !tile.isConnected) return;
    if (!tile._isaret) hazirla(tile);
    const S = tile._isaret; if (!S) return;
    const simdi = performance.now();
    if (d.k === 'x'){ S.imlec.delete(kim); bitir(S, kim, simdi); ciz(S); return; }
    const x = sayi(d.x), y = sayi(d.y); if (x == null || y == null) return;
    const renk = renkOf(kim), ad = adOf(kim);
    S.imlec.set(kim, { x, y, renk, ad, t: simdi });
    if (d.k === 'd') S.cizgi.set(kim, { renk, pts: [[x, y]], t: simdi });
    else if (d.k === 'm' && d.dr){ const c = S.cizgi.get(kim); if (c && c.pts.length < 2000) c.pts.push([x, y]); }
    else if (d.k === 'u'){
      const c = S.cizgi.get(kim);
      if (d.tik || !c || c.pts.length < 2){ S.cizgi.delete(kim); S.halka.push({ x, y, renk, t: simdi }); }
      else { c.pts.push([x, y]); bitir(S, kim, simdi); }
    }
    // benim ekranımda biri işaret yapıyorsa bir kez haber ver (paylaşan genelde kendi önizlemesine bakmıyor)
    if (kim !== benId() && d.s === benId() && !uyarilan.has(kim) && typeof toast === 'function'){
      uyarilan.add(kim); toast('🖍 ' + ad + ' ekranında işaret gösteriyor. Ekran önizlemenden görebilirsin.');
    }
    ciz(S);
  }
  function bitir(S, kim, simdi){
    const c = S.cizgi.get(kim);
    if (c){ S.cizgi.delete(kim); if (c.pts.length > 1){ c.t = simdi; S.bitmis.push(c); } }
  }
  window.isaretOnData = (id, d) => {
    if (!d || d.t !== 'isaret') return false;
    const p = peers.get(id);
    if (p && typeof sameChan === 'function' && !sameChan(p)) return true;
    isle(id, d);
    return true;
  };

  // ---------- çizim ----------
  function boyutla(S){
    const { v, cv } = S, dpr = Math.min(2, window.devicePixelRatio || 1), w = v.clientWidth, h = v.clientHeight;
    cv.style.left = v.offsetLeft + 'px'; cv.style.top = v.offsetTop + 'px';
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)){ cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    return dpr;
  }
  function ciz(S){
    if (S.raf) return;
    const kare = () => {
      S.raf = 0;
      if (!S.cv.isConnected) return;
      const { v, cv } = S, dpr = boyutla(S), w = v.clientWidth, h = v.clientHeight;
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      const c = icerik(v), P = (x, y) => [c.x + x * c.w, c.y + y * c.h];
      const simdi = performance.now();
      const kalin = Math.max(3, Math.min(6, c.w / 260));
      // çizgiler
      const cizgi = (o, a) => {
        g.globalAlpha = a; g.strokeStyle = o.renk; g.lineWidth = kalin; g.lineCap = 'round'; g.lineJoin = 'round';
        g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 4;
        g.beginPath(); o.pts.forEach((p, i) => { const [x, y] = P(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
        g.shadowBlur = 0; g.globalAlpha = 1;
      };
      S.cizgi.forEach(o => cizgi(o, 1));
      S.bitmis = S.bitmis.filter(o => simdi - o.t < CIZGI_SURE);
      S.bitmis.forEach(o => { const k = (simdi - o.t) / CIZGI_SURE; cizgi(o, k < .7 ? 1 : 1 - (k - .7) / .3); });
      // halkalar
      S.halka = S.halka.filter(o => simdi - o.t < HALKA_SURE);
      S.halka.forEach(o => {
        const k = (simdi - o.t) / HALKA_SURE, [x, y] = P(o.x, o.y);
        for (const gec of [0, .25]){
          const kk = k - gec; if (kk < 0) continue;
          g.globalAlpha = Math.max(0, 1 - kk); g.strokeStyle = o.renk; g.lineWidth = 3.5;
          g.beginPath(); g.arc(x, y, 8 + kk * 34, 0, Math.PI * 2); g.stroke();
        }
        g.globalAlpha = 1;
      });
      // imleçler (adıyla)
      S.imlec.forEach((o, kim) => {
        const yas = simdi - o.t; if (yas > IMLEC_SURE){ S.imlec.delete(kim); return; }
        const a = yas < IMLEC_SURE - 600 ? 1 : (IMLEC_SURE - yas) / 600;
        const [x, y] = P(o.x, o.y);
        g.globalAlpha = a;
        g.save(); g.translate(x, y);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 19); g.lineTo(5, 14.5); g.lineTo(8.5, 22); g.lineTo(11.5, 20.6); g.lineTo(8.2, 13.4); g.lineTo(14.5, 13.4); g.closePath();
        g.fillStyle = o.renk; g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 5; g.fill(); g.shadowBlur = 0; g.stroke();
        g.font = '600 12px system-ui, sans-serif';
        const tw = g.measureText(o.ad).width;
        g.fillStyle = o.renk; rr(g, 14, 20, tw + 12, 19, 9); g.fill();
        g.fillStyle = '#0b0e13'; g.fillText(o.ad, 20, 33.5);
        g.restore(); g.globalAlpha = 1;
      });
      if (S.imlec.size || S.cizgi.size || S.bitmis.length || S.halka.length) S.raf = requestAnimationFrame(kare);
    };
    S.raf = requestAnimationFrame(kare);
  }
  function rr(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // yeni ekran kutularına düğme ekle (sahibi belli olduktan sonra)
  const tara = () => setTimeout(() => ekranlar.querySelectorAll('.screen').forEach(hazirla), 0);
  new MutationObserver(tara).observe(ekranlar, { childList: true });
  tara();
})();
