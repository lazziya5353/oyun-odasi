// Ses değiştirici: mikrofon sesine gerçek zamanlı efekt (herkes seni öyle duyar).
// Zincir: mikrofon (ve varsa gürültü azaltma) → efekt düğümleri → odaya giden ses.
const VFX = [
  ['normal', '🙂', 'Normal'], ['robot', '🤖', 'Robot'], ['sincap', '🐿️', 'Sincap'], ['helyum', '🎈', 'Helyum'], ['dev', '🦍', 'Dev'],
  ['kotu', '😈', 'Kötü adam'], ['uzayli', '👽', 'Uzaylı'], ['magara', '🕳️', 'Mağara yankısı'], ['stadyum', '🏟️', 'Stadyum'],
  ['telefon', '☎️', 'Telefon'], ['telsiz', '📻', 'Telsiz'], ['megafon', '📢', 'Megafon'], ['keci', '🐐', 'Titrek keçi'], ['sarhos', '🥴', 'Sarhoş'], ['kedi', '🐱', 'Çizgi film']
];
let vfxId = 'normal', vfxBase = null, vfxNodes = [], vfxMon = null, vfxDinle = false;

// ---------- yapı taşları ----------
function vfxPitch(ctx, semi){
  const r = Math.pow(2, semi / 12), BT = 0.1, sr = ctx.sampleRate, len = Math.floor(sr * BT);
  const depth = Math.min(BT * .95, Math.abs(r - 1) * BT), up = r > 1;
  const mk = fn => { const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = fn(i / len); return b; };
  const ramp = mk(x => up ? 1 - x : x), fade = mk(x => Math.pow(Math.sin(Math.PI * x), 2));
  const inp = ctx.createGain(), out = ctx.createGain(), nodes = [inp, out], t0 = ctx.currentTime + 0.05;
  for (let k = 0; k < 2; k++){
    const d = ctx.createDelay(1); d.delayTime.value = 0;
    const g = ctx.createGain(); g.gain.value = 0;
    const m = ctx.createBufferSource(); m.buffer = ramp; m.loop = true;
    const md = ctx.createGain(); md.gain.value = depth;
    const f = ctx.createBufferSource(); f.buffer = fade; f.loop = true;
    m.connect(md); md.connect(d.delayTime); f.connect(g.gain);
    inp.connect(d); d.connect(g); g.connect(out);
    m.start(t0 + k * BT / 2); f.start(t0 + k * BT / 2);
    nodes.push(d, g, m, md, f);
  }
  return { inp, out, nodes };
}
function vfxRing(ctx, freq, mix){
  const inp = ctx.createGain(), out = ctx.createGain(), ring = ctx.createGain(); ring.gain.value = 0;
  const o = ctx.createOscillator(); o.frequency.value = freq; o.connect(ring.gain); o.start();
  const dry = ctx.createGain(); dry.gain.value = 1 - mix; const wet = ctx.createGain(); wet.gain.value = mix * 1.6;
  inp.connect(ring); ring.connect(wet); wet.connect(out); inp.connect(dry); dry.connect(out);
  return { inp, out, nodes: [inp, out, ring, o, dry, wet] };
}
function vfxDist(ctx, amount){
  const w = ctx.createWaveShaper(), n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++){ const x = i * 2 / n - 1; c[i] = (1 + amount) * x / (1 + amount * Math.abs(x)); }
  w.curve = c; w.oversample = '2x'; return w;
}
function vfxFilter(ctx, type, f, q){ const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
function vfxEcho(ctx, time, fb, mix){
  const inp = ctx.createGain(), out = ctx.createGain(), d = ctx.createDelay(2), g = ctx.createGain(), w = ctx.createGain(), lp = vfxFilter(ctx, 'lowpass', 3000);
  d.delayTime.value = time; g.gain.value = fb; w.gain.value = mix;
  inp.connect(out); inp.connect(d); d.connect(lp); lp.connect(g); g.connect(d); lp.connect(w); w.connect(out);
  return { inp, out, nodes: [inp, out, d, g, w, lp] };
}
function vfxReverb(ctx, secs, mix){
  const len = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++){ const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  const cv = ctx.createConvolver(); cv.buffer = b;
  const inp = ctx.createGain(), out = ctx.createGain(), w = ctx.createGain(); w.gain.value = mix;
  inp.connect(out); inp.connect(cv); cv.connect(w); w.connect(out);
  return { inp, out, nodes: [inp, out, cv, w] };
}
function vfxVibrato(ctx, rate, depthMs, trem){
  const inp = ctx.createGain(), out = ctx.createGain(), d = ctx.createDelay(0.1); d.delayTime.value = depthMs / 1000 * 1.5;
  const l = ctx.createOscillator(); l.frequency.value = rate; const lg = ctx.createGain(); lg.gain.value = depthMs / 1000;
  l.connect(lg); lg.connect(d.delayTime); l.start();
  const tg = ctx.createGain(); tg.gain.value = 1 - (trem || 0);
  if (trem){ const tl = ctx.createGain(); tl.gain.value = trem; l.connect(tl); tl.connect(tg.gain); }
  inp.connect(d); d.connect(tg); tg.connect(out);
  return { inp, out, nodes: [inp, out, d, l, lg, tg] };
}
// sırayla bağla: [düğüm ya da {inp,out}] → tek {inp,out}
function vfxSeri(ctx, parts){
  const all = [];
  const io = parts.map(p => { if (p.inp){ all.push(...p.nodes); return p; } all.push(p); return { inp: p, out: p }; });
  for (let i = 0; i < io.length - 1; i++) io[i].out.connect(io[i + 1].inp);
  return { inp: io[0].inp, out: io[io.length - 1].out, nodes: all };
}
function vfxBuild(ctx, id){
  const F = (t, f, q) => vfxFilter(ctx, t, f, q), G = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
  switch (id){
    case 'robot': return vfxSeri(ctx, [vfxRing(ctx, 55, .85), vfxEcho(ctx, .012, .55, .5), F('highpass', 120)]);
    case 'sincap': return vfxSeri(ctx, [vfxPitch(ctx, 7), F('highpass', 200)]);
    case 'helyum': return vfxSeri(ctx, [vfxPitch(ctx, 12), F('highpass', 300)]);
    case 'dev': return vfxSeri(ctx, [vfxPitch(ctx, -7), F('lowpass', 2600), vfxReverb(ctx, 1.2, .25), G(1.4)]);
    case 'kotu': return vfxSeri(ctx, [vfxPitch(ctx, -5), vfxDist(ctx, 6), F('lowpass', 2200), vfxReverb(ctx, 1.6, .3), G(.9)]);
    case 'uzayli': return vfxSeri(ctx, [vfxPitch(ctx, 4), vfxRing(ctx, 340, .5), vfxVibrato(ctx, 7, 2.5), vfxEcho(ctx, .09, .35, .35)]);
    case 'magara': return vfxSeri(ctx, [vfxEcho(ctx, .32, .5, .55), vfxReverb(ctx, 2.2, .35)]);
    case 'stadyum': return vfxSeri(ctx, [F('highpass', 180), vfxReverb(ctx, 3.2, .7), vfxEcho(ctx, .45, .25, .3), G(1.2)]);
    case 'telefon': return vfxSeri(ctx, [F('highpass', 400), F('lowpass', 3200), vfxDist(ctx, 3), F('peaking', 1500, 1), G(.9)]);
    case 'telsiz': return vfxSeri(ctx, [F('bandpass', 1400, 1.8), vfxDist(ctx, 18), F('highpass', 600), G(.7)]);
    case 'megafon': return vfxSeri(ctx, [F('highpass', 600), F('lowpass', 3500), vfxDist(ctx, 10), vfxEcho(ctx, .06, .2, .25), G(.8)]);
    case 'keci': return vfxSeri(ctx, [vfxVibrato(ctx, 9, 4, .5)]);
    case 'sarhos': return vfxSeri(ctx, [vfxVibrato(ctx, 1.3, 9), vfxPitch(ctx, -2), vfxEcho(ctx, .18, .3, .3)]);
    case 'kedi': return vfxSeri(ctx, [vfxPitch(ctx, 9), vfxVibrato(ctx, 6, 1.2), F('highpass', 250)]);
  }
  return null;
}

// ---------- uygula ----------
// openMic yeni mikrofon açınca çağırır: temel sesi alır, efekt varsa üstüne kurar, odaya gidecek akışı döndürür
function vfxWrap(base){
  vfxBase = base;
  vfxSok();
  try { base.getAudioTracks()[0].enabled = !micMuted; } catch(e){}
  if (vfxId === 'normal' || !audioCtx || audioCtx.state !== 'running') return base;
  try {
    const src = audioCtx.createMediaStreamSource(base), fx = vfxBuild(audioCtx, vfxId), dest = audioCtx.createMediaStreamDestination();
    if (!fx) return base;
    const lim = audioCtx.createDynamicsCompressor(); lim.threshold.value = -6; lim.ratio.value = 12;
    src.connect(fx.inp); fx.out.connect(lim); lim.connect(dest);
    vfxNodes = [src, lim, ...fx.nodes];
    if (vfxDinle){ vfxMon = audioCtx.createGain(); vfxMon.gain.value = .9; lim.connect(vfxMon); vfxMon.connect(audioCtx.destination); vfxNodes.push(vfxMon); }
    const out = dest.stream;
    out.getAudioTracks()[0].enabled = !micMuted;
    return out;
  } catch(e){ console.warn('ses efekti kurulamadı', e); return base; }
}
function vfxSok(){
  vfxNodes.forEach(n => { try { n.stop && n.stop(); } catch(e){} try { n.disconnect(); } catch(e){} });
  vfxNodes = []; vfxMon = null;
}
function setVfx(id){
  if (!VFX.some(v => v[0] === id)) return;
  ensureCtx();
  if (noMic || !vfxBase){ toast('Ses değiştirici için mikrofonun açık olmalı'); return; }
  const old = localStream;
  vfxId = id;
  localStream = vfxWrap(vfxBase);
  if (old && old !== vfxBase && old !== localStream) old.getTracks().forEach(t => t.stop());
  selfAnalyser = makeAnalyser(localStream);
  if (typeof peers !== 'undefined') peers.forEach(p => updateMicRouting(p));
  const v = VFX.find(x => x[0] === id);
  toast(id === 'normal' ? '🙂 Sesin normale döndü' : v[1] + ' Sesin artık: ' + v[2]);
  if (typeof hareket === 'function') hareket('ses', 'ses efekti: ' + v[1] + ' ' + v[2]);
  if (typeof joined !== 'undefined' && joined){ broadcast({ t: 'vfx', v: id }); renderSelf(); }
  renderVfx();
}
function setVfxDinle(on){ vfxDinle = !!on; if (vfxId !== 'normal') setVfx(vfxId); else renderVfx(); }
function vfxOnData(id, d){
  if (d.t !== 'vfx') return false;
  const p = peers.get(id); if (p){ p.vfx = VFX.some(v => v[0] === d.v) ? d.v : 'normal'; renderPeer(p); }
  return true;
}
const vfxEtiket = id => { const v = VFX.find(x => x[0] === id); return v && id !== 'normal' ? v[1] + ' ' + v[2] : ''; };

// ---------- seçici (Şaka panelinde ve mikrofon penceresinde) ----------
function renderVfx(){
  document.querySelectorAll('.vfx-kutu').forEach(box => {
    box.innerHTML = '';
    const g = document.createElement('div'); g.className = 'vfx-izgara';
    VFX.forEach(([id, ikon, ad]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'vfx-sec' + (vfxId === id ? ' on' : '');
      b.append(Object.assign(document.createElement('b'), { textContent: ikon }), Object.assign(document.createElement('span'), { textContent: ad }));
      b.onclick = () => setVfx(id);
      g.append(b);
    });
    const r = document.createElement('label'); r.className = 'vfx-dinle';
    const c = document.createElement('input'); c.type = 'checkbox'; c.checked = vfxDinle; c.onchange = () => setVfxDinle(c.checked);
    r.append(c, ' Kendi sesimi dinle (kulaklıkla dene, hoparlörde yankı yapar)');
    const n = document.createElement('p'); n.className = 'note'; n.textContent = 'Efekt odadaki herkese gider; “Normal” ile kapatırsın. Sayfayı yenileyince normale döner.';
    box.append(g, r, n);
  });
}
renderVfx();
