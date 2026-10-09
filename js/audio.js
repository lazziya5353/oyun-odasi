// Mikrofon, gürültü azaltma, mikrofon/ağ testi, bildirim sesleri, konuşma algılama ve ses dalgası çizimi.
let audioCtx = null;
let localStream = null, rawStream = null;   // localStream: karşıya giden (işlenmiş olabilir), rawStream: mikrofonun kendisi
let micMuted = false, noMic = false, deafened = false;
let masterVol = 1;
let selfAnalyser = null, meterStarted = false;
let quietSince = 0, heardVoice = false;

// ses motorunu tıklamanın içinde (await'ten önce) başlat; bazı tarayıcılar sonradan başlatılanı duraklatıyor
function ensureCtx(){
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state !== 'running') audioCtx.resume().catch(() => {});
  } catch(e){}
}
document.addEventListener('pointerdown', () => { if (audioCtx && audioCtx.state !== 'running') audioCtx.resume().catch(() => {}); }, true);

function makeAnalyser(stream){
  try {
    const src = audioCtx.createMediaStreamSource(stream);
    const an = audioCtx.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.75;
    src.connect(an); return an;
  } catch(e){ return null; }
}

// Bildirim sesleri: katılma (yükselen), ayrılma (alçalan), mesaj (kısa tık)
function tone(notes, gap, len, vol){
  if (!audioCtx || deafened) return;
  try {
    const t0 = audioCtx.currentTime;
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t = t0 + i * gap;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * Math.max(masterVol, 0.2), t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + len + 0.05);
    });
  } catch(e){}
}
const chime = up => tone(up ? [660, 990] : [660, 440], 0.13, 0.35, 0.18);
const tick = () => tone([1320], 0, 0.12, 0.08);

// ---------- gürültü azaltma ----------
// "normal": tarayıcının kendi gürültü azaltması. "strong": ek olarak uğultu/tıslama filtresi ve
// konuşmadığın anlarda mikrofonu kapatan bir ses kapısı (klavye, fan, nefes sesi gitmez).
let nsMode = store.get('oyunodasi-ns') || 'normal';
$('nsSelect').value = nsMode;
let gateNodes = null, gateLoaded = false;
const GATE_CODE = `
  class OyunGate extends AudioWorkletProcessor {
    constructor(){ super(); this.g = 0; this.hold = 0; }
    process(inputs, outputs){
      const inp = inputs[0], out = outputs[0];
      if (!inp || !inp[0] || !out || !out[0]) return true;
      const x = inp[0], y = out[0], th = 0.012;
      let s = 0; for (let k = 0; k < x.length; k++) s += x[k] * x[k];
      const rms = Math.sqrt(s / x.length);
      if (rms > th) this.hold = sampleRate * 0.25; else this.hold = Math.max(0, this.hold - x.length);
      const target = this.hold > 0 ? 1 : 0;
      let g = this.g;
      for (let k = 0; k < y.length; k++){ g += (target - g) * (target > g ? 0.02 : 0.0006); y[k] = x[k] * g; }
      this.g = g;
      return true;
    }
  }
  registerProcessor('oyun-gate', OyunGate);`;

// Önce ses iş parçacığında çalışan AudioWorklet denenir; izin verilmezse her yerde çalışan eski yönteme düşülür.
async function makeGateNode(){
  if (audioCtx.audioWorklet && gateLoaded !== 'failed'){
    try {
      if (!gateLoaded){
        const url = URL.createObjectURL(new Blob([GATE_CODE], { type: 'application/javascript' }));
        await audioCtx.audioWorklet.addModule(url);
        gateLoaded = true;
      }
      return new AudioWorkletNode(audioCtx, 'oyun-gate', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    } catch(e){ gateLoaded = 'failed'; }
  }
  if (!audioCtx.createScriptProcessor) return null;
  const sp = audioCtx.createScriptProcessor(1024, 1, 1);
  let g = 0, hold = 0;
  const th = 0.012, holdLen = audioCtx.sampleRate * 0.25;
  sp.onaudioprocess = ev => {
    const x = ev.inputBuffer.getChannelData(0), y = ev.outputBuffer.getChannelData(0);
    let s = 0; for (let k = 0; k < x.length; k++) s += x[k] * x[k];
    const rms = Math.sqrt(s / x.length);
    if (rms > th) hold = holdLen; else hold = Math.max(0, hold - x.length);
    const target = hold > 0 ? 1 : 0;
    for (let k = 0; k < y.length; k++){ g += (target - g) * (target > g ? 0.02 : 0.0006); y[k] = x[k] * g; }
  };
  return sp;
}
async function buildStrongChain(raw){
  try {
    if (!audioCtx) return null;
    const gate = await makeGateNode();
    if (!gate) return null;
    const src = audioCtx.createMediaStreamSource(raw);
    const hp = audioCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;
    const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000;
    const dest = audioCtx.createMediaStreamDestination();
    src.connect(hp); hp.connect(lp); lp.connect(gate); gate.connect(dest);
    gateNodes = [src, hp, lp, gate];
    return dest.stream;
  } catch(e){ console.warn('Güçlü gürültü azaltma açılamadı', e); return null; }
}

// ---------- mikrofon ----------
// Gerçek mikrofon olmayan sanal cihazlar: sessizlik ya da bilgisayarın kendi sesini gönderirler.
const VIRTUAL_MIC = /steam streaming|stereo mix|stereo karışımı|what u hear|wave out mix|cable output/i;
async function getMicStream(deviceId){
  const audio = { echoCancellation: true, noiseSuppression: nsMode !== 'off', autoGainControl: true };
  if (deviceId) audio.deviceId = { exact: deviceId };
  return navigator.mediaDevices.getUserMedia({ audio, video: false });
}
// Kişi kendisi seçmediyse ve açılan cihaz sanal bir mikrofonsa, varsa gerçek bir mikrofona geç
async function avoidVirtualMic(raw){
  if (store.get('oyunodasi-mic-manual') === '1') return raw;
  const tr = raw.getAudioTracks()[0];
  if (!tr || !VIRTUAL_MIC.test(tr.label)) return raw;
  try {
    const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput' && d.label);
    const real = devs.find(d => !VIRTUAL_MIC.test(d.label) && d.deviceId !== 'default' && d.deviceId !== 'communications');
    if (!real) return raw;
    const next = await getMicStream(real.deviceId);
    raw.getTracks().forEach(t => t.stop());
    toast('“' + tr.label + '” gerçek bir mikrofon değil; “' + real.label + '” seçildi. İstersen mikrofon testinden değiştirebilirsin.');
    return next;
  } catch(e){ return raw; }
}

async function openMic(deviceId){
  const raw = await avoidVirtualMic(await getMicStream(deviceId));
  ensureCtx();
  try { if (audioCtx && audioCtx.state !== 'running') await Promise.race([audioCtx.resume(), new Promise(r => setTimeout(r, 1000))]); } catch(e){}

  const oldRaw = rawStream, oldOut = localStream, oldNodes = gateNodes;
  gateNodes = null;
  let out = raw;
  if (nsMode === 'strong'){
    const processed = (audioCtx && audioCtx.state === 'running') ? await buildStrongChain(raw) : null;
    if (processed) out = processed;
    else toast('Güçlü gürültü azaltma bu tarayıcıda açılamadı, normal mod kullanılıyor.');
  }
  const wasNoMic = noMic;
  noMic = false;
  if (wasNoMic) micMuted = false;
  out.getAudioTracks()[0].enabled = !micMuted;
  rawStream = raw;
  localStream = out;
  if (typeof peers !== 'undefined') peers.forEach(p => updateMicRouting(p));   // herkese giden sesi yeni mikrofonla değiştir
  if (oldNodes) oldNodes.forEach(n => { try { n.disconnect(); } catch(e){} });
  if (oldRaw) oldRaw.getTracks().forEach(t => t.stop());
  if (oldOut && oldOut !== oldRaw) oldOut.getTracks().forEach(t => t.stop());

  selfAnalyser = makeAnalyser(out);
  store.set('oyunodasi-mic', raw.getAudioTracks()[0].getSettings().deviceId || '');
  await fillMicList();
  startMeters();
  if (wasNoMic && typeof joined !== 'undefined' && joined){ updateMicButton(); broadcast({ t: 'state', muted: micMuted, noMic: false }); renderSelf(); }
}
// Mikrofon izni yoksa sessiz bir ses kanalıyla katıl: dinleyebilir ve yazışabilirsin
function useSilentMic(){
  ensureCtx();
  try { localStream = audioCtx.createMediaStreamDestination().stream; }
  catch(e){ localStream = new MediaStream(); }
  rawStream = null; noMic = true; micMuted = true;
}

async function fillMicList(){
  try {
    const list = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput');
    const sel = $('micSelect');
    const cur = rawStream && rawStream.getAudioTracks()[0].getSettings().deviceId;
    sel.innerHTML = '';
    list.forEach((d, i) => {
      const o = document.createElement('option');
      o.value = d.deviceId; o.textContent = d.label || ('Mikrofon ' + (i + 1));
      if (d.deviceId === cur) o.selected = true;
      sel.append(o);
    });
    sel.hidden = list.length === 0 || !rawStream;
  } catch(e){}
}
$('micSelect').onchange = async e => {
  store.set('oyunodasi-mic-manual', '1');   // kişi kendisi seçti: sanal mikrofon olsa bile değiştirme
  try {
    await openMic(e.target.value); toast('Mikrofon değiştirildi');
    heardVoice = false; quietSince = performance.now();
    setHint('Konuş: çubuk yeşil dolmalı.', '');
  } catch(err){ toast('Bu mikrofon açılamadı.'); }
};
$('nsSelect').onchange = async e => {
  ensureCtx();
  nsMode = e.target.value;
  store.set('oyunodasi-ns', nsMode);
  if (!rawStream) return;   // mikrofon henüz açılmadıysa açıldığında uygulanır
  try {
    const dev = rawStream.getAudioTracks()[0].getSettings().deviceId;
    await openMic(dev || undefined);
    toast(nsMode === 'off' ? 'Gürültü azaltma kapatıldı' : nsMode === 'strong' ? 'Güçlü gürültü azaltma açık' : 'Normal gürültü azaltma açık');
  } catch(err){ toast('Mikrofon yeniden açılamadı.'); }
};

function setHint(text, cls){ const h = $('micHint'); h.textContent = text; h.className = 'hint ' + (cls || ''); }

$('testBtn').onclick = async () => {
  ensureCtx();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ setHint('Bu tarayıcı mikrofona erişemiyor. Sayfayı https üzerinden aç.', 'bad'); return; }
  try {
    if (!rawStream) await openMic(store.get('oyunodasi-mic') || undefined).catch(() => openMic());
    $('testBtn').textContent = '🎙 Test açık';
    $('testBtn').disabled = true;
    $('recBtn').disabled = false;
    setHint('Konuş: çubuk yeşil dolmalı.', '');
    quietSince = performance.now(); heardVoice = false;
  } catch(e){
    setHint('Mikrofon izni verilmedi. Adres çubuğundaki kilit simgesinden izin ver.', 'bad');
  }
};

// 3 saniye kaydet ve geri çal
$('recBtn').onclick = () => {
  if (!rawStream || typeof MediaRecorder === 'undefined'){ setHint('Önce mikrofonu aç. Bu tarayıcı kaydı desteklemiyor olabilir.', 'bad'); return; }
  if (micMuted){ setHint('Mikrofonun kapalı. Önce mikrofonu aç, sonra kaydet.', 'bad'); return; }
  const rec = new MediaRecorder(localStream);
  const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
    const a = new Audio(url);
    setHint('Kaydın çalınıyor…', '');
    a.onended = () => { setHint('Kendi sesini net duyduysan mikrofonun hazır.', 'ok'); $('recBtn').disabled = false; URL.revokeObjectURL(url); };
    a.play().catch(() => { setHint('Kayıt çalınamadı.', 'bad'); $('recBtn').disabled = false; });
  };
  $('recBtn').disabled = true;
  let left = 3;
  setHint('Kaydediliyor… ' + left, '');
  rec.start();
  const iv = setInterval(() => {
    left--;
    if (left > 0) setHint('Kaydediliyor… ' + left, '');
    else { clearInterval(iv); rec.stop(); }
  }, 1000);
};

// ---------- ağ testi: bu bilgisayar dışarıya hangi yollarla ulaşabiliyor? ----------
$('netBtn').onclick = async () => {
  const out = $('netResult'); out.hidden = false;
  out.innerHTML = '<li>Test ediliyor, 15 saniye kadar sürer…</li>';
  $('netBtn').disabled = true;
  const types = new Set();
  let pc;
  try {
    pc = new RTCPeerConnection({ iceServers: await iceServers() });
    pc.createDataChannel('test');
    pc.onicecandidate = e => { if (e.candidate){ const m = / typ (\w+)/.exec(e.candidate.candidate); if (m) types.add(m[1]); } };
    await pc.setLocalDescription(await pc.createOffer());
    await new Promise(r => setTimeout(r, 6000));
  } catch(e){
    out.innerHTML = '<li class="bad">Bu tarayıcı bağlantı testine izin vermedi. Chrome ile dene.</li>';
    $('netBtn').disabled = false; try { pc && pc.close(); } catch(_){}
    return;
  }
  try { pc.close(); } catch(e){}
  const row = (ok, text) => '<li class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ ' : '✗ ') + text + '</li>';
  // eşleştirme sunucularına ulaşılıyor mu?
  let sigRows = '';
  if (typeof Peer !== 'undefined'){
    const results = await Promise.all(signalServers().map(s =>
      openPeer(PREFIX + 'test-' + rid() + rid(), s, 9000).then(pr => { try { pr.destroy(); } catch(e){} return true; }, () => false)));
    signalServers().forEach((s, i) => {
      sigRows += row(results[i], 'Eşleştirme sunucusu (' + s.label + '): ' + (results[i] ? 'ulaşılıyor.' : 'ulaşılamıyor' + (s.own ? ' (uykudaysa 1 dk sonra tekrar dene).' : '.')));
    });
  }
  out.innerHTML = sigRows +
    row(types.has('srflx'), types.has('srflx') ? 'İnternet adresin bulundu, doğrudan bağlantı denenebilir.' : 'İnternet adresin bulunamadı. Güvenlik duvarı ya da VPN engelliyor olabilir.') +
    row(types.has('relay'), types.has('relay') ? 'Aktarma sunucusuna ulaşılıyor. Doğrudan bağlantı olmasa da ses gelmeli.' : 'Aktarma sunucusuna ulaşılamadı. Doğrudan bağlantı da kurulamazsa ses gelmez.') +
    (!types.has('srflx') && !types.has('relay') ? '<li class="bad">Bu ağ sesli bağlantıyı tamamen engelliyor. VPN, okul/iş ağı ya da Mac\'te “Gizli mod” güvenlik duvarı olabilir. Başka bir ağ ya da telefon hotspot\'u ile dene.</li>' : '');
  $('netBtn').disabled = false;
};

// ---------- ses seviyeleri ----------
const tbuf = new Uint8Array(512);
function level(an){
  an.getByteTimeDomainData(tbuf);
  let s = 0; for (let i = 0; i < tbuf.length; i++){ const v = (tbuf[i] - 128) / 128; s += v * v; }
  return Math.sqrt(s / tbuf.length);
}
function paintMeter(el, lv){
  if (!el) return;
  const pct = Math.min(100, Math.sqrt(lv) * 260);   // karekök ölçek: kısık mikrofonlarda da belirgin
  el.style.width = pct + '%';
  const box = el.parentElement;
  box.classList.toggle('hot', pct > 60 && pct <= 88);
  box.classList.toggle('loud', pct > 88);
}

// Avatarın çevresine, sesin frekanslarına göre uzayıp kısalan çubuklar çizer.
const fbuf = new Uint8Array(256);
const BARS = 44;
function drawViz(card, an, color, active){
  const cv = card.querySelector('.viz'); if (!cv) return;
  const w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(w * dpr)){ cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const hs = cv._h || (cv._h = new Float32Array(BARS));
  let any = false;
  if (an && active){
    an.getByteFrequencyData(fbuf);
    for (let i = 0; i < BARS; i++){
      const k = i < BARS / 2 ? i : BARS - 1 - i;     // yarım çember frekans, diğer yarısı ayna
      const v = fbuf[2 + Math.floor(k * 1.9)] / 255;
      hs[i] = Math.max(v, hs[i] * 0.86);
    }
  } else for (let i = 0; i < BARS; i++) hs[i] *= 0.86;
  for (let i = 0; i < BARS; i++) if (hs[i] > 0.02){ any = true; break; }
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (!any) return;
  const cx = cv.width / 2, cy = cv.height / 2;
  const av = card.querySelector('.avatar').offsetWidth * dpr;
  const r0 = av / 2 + 6 * dpr, maxLen = Math.min(cx, cy) - r0 - 2 * dpr;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, av / 30);
  ctx.strokeStyle = color;
  for (let i = 0; i < BARS; i++){
    const len = Math.max(0, hs[i]) * maxLen;
    if (len < 1) continue;
    const a = (i / BARS) * Math.PI * 2 - Math.PI / 2;
    ctx.globalAlpha = 0.35 + 0.65 * hs[i];
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// konuşanın avatarını sesin şiddetine göre büyüt; dönüş: konuşuyorsa yumuşatılmış şiddet
function animateSpeaker(card, state, lv, an, color){
  const now = performance.now();
  state._lv = (state._lv || 0) * 0.7 + Math.min(1, lv * 8) * 0.3;
  if (lv > 0.025) state._lastVoice = now;
  const speaking = now - (state._lastVoice || 0) < 300;      // kısa duraklamalarda sönmesin
  card.classList.toggle('speaking', speaking);
  const av = card.querySelector('.avatar');
  if (av) av.style.setProperty('--lv', speaking ? state._lv.toFixed(3) : 0);
  drawViz(card, an, color, speaking);
  return speaking ? state._lv : 0;
}

// Tüm canlı göstergeleri tek döngüde günceller
function startMeters(){
  if (meterStarted) return;
  meterStarted = true;
  const loop = () => {
    const selfLv = (selfAnalyser && !micMuted && !noMic) ? level(selfAnalyser) : 0;
    paintMeter($('micMeter'), selfLv);
    let loudest = 0, glow = 'transparent';
    const me_ = $('selfCard');
    if (me_){
      const c = me_.style.getPropertyValue('--c') || '#5ee0b5';
      const s = animateSpeaker(me_, me_, selfLv, micMuted ? null : selfAnalyser, c);
      if (s > loudest){ loudest = s; glow = c; }
      setMiniSpeaking(typeof peer !== 'undefined' && peer ? peer.id : '', s > 0);
    }
    micHintCheck(selfLv);
    if (typeof peers !== 'undefined') peers.forEach(p => {
      const audible = p.analyser && !p.localMuted && sameChan(p);
      const lv = audible ? level(p.analyser) : 0;
      if (p.card){
        const s = animateSpeaker(p.card, p, lv, audible ? p.analyser : null, p.color || '#5ee0b5');
        if (s > loudest){ loudest = s; glow = p.color; }
        setMiniSpeaking(p.id, s > 0);
      }
      document.querySelectorAll('[data-meter="' + p.id + '"]').forEach(el => paintMeter(el, lv));
    });
    const room = $('room');
    if (room._glow !== glow){ room._glow = glow; room.style.setProperty('--glow', glow); }
    if (typeof drawMusicViz === 'function') drawMusicViz();
    requestAnimationFrame(loop);
  };
  loop();
}
// mikrofon testinde ses gelmiyorsa nedenini söyle
function micHintCheck(selfLv){
  if (!$('testBtn').disabled || heardVoice) return;
  const track = rawStream && rawStream.getAudioTracks()[0];
  if (selfLv > 0.012){ heardVoice = true; setHint('Ses geliyor 👍 İstersen kaydedip dinle.', 'ok'); }
  else if (performance.now() - quietSince > 4000){
    if (noMic) setHint('Mikrofon izni yok, dinleyici olarak buradasın. Alttaki mikrofon düğmesiyle tekrar izin isteyebilirsin.', 'bad');
    else if (audioCtx && audioCtx.state !== 'running') setHint('Ses ölçer duraklatıldı. Sayfada herhangi bir yere bir kez tıkla.', 'bad');
    else if (track && track.readyState === 'ended') setHint('Mikrofon bağlantısı koptu. Mikrofonu takıp listeden yeniden seç.', 'bad');
    else if (track && track.muted) setHint('Mikrofon sistem tarafından susturulmuş. Kulaklıktaki sessiz düğmesine ve sistem ses ayarlarına bak.', 'bad');
    else setHint('Ses algılanmadı. Listeden doğru mikrofonu seç; kulaklığın mikrofonu ayrı bir seçenek olabilir.', 'bad');
    quietSince = performance.now();
  }
}
