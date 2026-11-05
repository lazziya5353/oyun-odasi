// Kara Dosyalar: ses motoru. Hiçbir ses dosyası indirilmez, hepsi tarayıcıda üretilir (Web Audio):
// sağanak yağmur, alçak uğultu, gök gürültüsü, uzakta siren, daktilo, kağıt hışırtısı, kaset sarma, Zippo "klik",
// telsiz cızırtısı, ankesörlü telefon zili, silecek.
class DkSes {
  constructor(){ this.ac = null; this.acik = false; this.yag = null; this.ana = null; this.hedefYag = 0; }
  baslat(){
    if (this.ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ac = new AC();
    this.ana = this.ac.createGain(); this.ana.gain.value = 0; this.ana.connect(this.ac.destination);
    const len = this.ac.sampleRate * 3, buf = this.ac.createBuffer(2, len, this.ac.sampleRate);
    for (let ch = 0; ch < 2; ch++){ const d = buf.getChannelData(ch); let b = 0; for (let i = 0; i < len; i++){ const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.5 + b * 2.2; } }
    const src = this.ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = this.ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.4;
    this.yagF = this.ac.createBiquadFilter(); this.yagF.type = 'lowpass'; this.yagF.frequency.value = 4200;
    this.yag = this.ac.createGain(); this.yag.gain.value = 0;
    src.connect(f); f.connect(this.yagF); this.yagF.connect(this.yag); this.yag.connect(this.ana); src.start();
    const o = this.ac.createOscillator(), o2 = this.ac.createOscillator(), og = this.ac.createGain();
    o.type = 'sine'; o.frequency.value = 55; o2.type = 'sine'; o2.frequency.value = 82.4; og.gain.value = 0.035;
    o.connect(og); o2.connect(og); og.connect(this.ana); o.start(); o2.start();
    this.sirenT = setInterval(() => { if (this.acik && Math.random() < 0.25) this.siren(); }, 45000);
  }
  ac_kapa(on){
    this.acik = on;
    if (on) this.baslat();
    if (!this.ac) return;
    if (this.ac.state === 'suspended') this.ac.resume();
    this.ana.gain.setTargetAtTime(on ? 0.9 : 0, this.ac.currentTime, 0.4);
  }
  // yagmur: 0..1; ic: içerideyse camın ardından boğuk gelir
  ortam(yagmur, ic){
    this.hedefYag = yagmur || 0;
    if (!this.yag) return;
    this.yag.gain.setTargetAtTime(0.04 + this.hedefYag * 0.3, this.ac.currentTime, 0.8);
    this.yagF.frequency.setTargetAtTime(ic ? 1600 : 4200, this.ac.currentTime, 0.8);
  }
  hazir(){ return this.ac && this.acik; }
  gurultu(sure, filtre, frek, q, kazanc, zarf, gecikme){
    const t = this.ac.currentTime + (gecikme || 0), len = Math.max(1, Math.floor(this.ac.sampleRate * sure)), buf = this.ac.createBuffer(1, len, this.ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (zarf ? zarf(i / len) : 1);
    const s = this.ac.createBufferSource(); s.buffer = buf;
    const f = this.ac.createBiquadFilter(); f.type = filtre; f.frequency.value = frek; f.Q.value = q || 0.7;
    const g = this.ac.createGain(); g.gain.value = kazanc;
    s.connect(f); f.connect(g); g.connect(this.ana); s.start(t);
    return { s, f, g, t };
  }
  gok(){
    if (!this.hazir()) return;
    const len = this.ac.sampleRate * 4, buf = this.ac.createBuffer(1, len, this.ac.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < len; i++){ b = 0.985 * b + 0.015 * (Math.random() * 2 - 1); d[i] = b * 6 * Math.pow(1 - i / len, 1.4) * (i < 2000 ? i / 2000 : 1); }
    const s = this.ac.createBufferSource(); s.buffer = buf;
    const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
    const g = this.ac.createGain(); g.gain.value = 0.9;
    s.connect(f); f.connect(g); g.connect(this.ana); s.start();
  }
  siren(){
    if (!this.hazir()) return;
    const t = this.ac.currentTime, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(650, t);
    for (let i = 0; i < 6; i++){ o.frequency.linearRampToValueAtTime(900, t + i * 1.2 + 0.6); o.frequency.linearRampToValueAtTime(650, t + i * 1.2 + 1.2); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.012, t + 1.5); g.gain.linearRampToValueAtTime(0, t + 7.2);
    const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    o.connect(f); f.connect(g); g.connect(this.ana); o.start(t); o.stop(t + 7.3);
  }
  daktilo(){
    if (!this.hazir()) return;
    this.gurultu(0.014, 'highpass', 1800, 0.7, 0.10 + Math.random() * 0.06, x => Math.pow(1 - x, 6));
  }
  // daktilonun satır sonu zili
  zil(){
    if (!this.hazir()) return;
    const t = this.ac.currentTime, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = 'sine'; o.frequency.value = 2650; g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g); g.connect(this.ana); o.start(t); o.stop(t + 0.62);
  }
  kagit(){
    if (!this.hazir()) return;
    for (let i = 0; i < 5; i++) this.gurultu(0.06 + Math.random() * 0.08, 'bandpass', 2500 + Math.random() * 3000, 0.8, 0.25, x => Math.sin(x * Math.PI), i * 0.05 + Math.random() * 0.04);
  }
  // metalik Zippo: kapağın açılış "klik"i + taşın sürtünmesi + alev
  zippo(){
    if (!this.hazir()) return;
    const klik = (gec, frek) => {
      this.gurultu(0.012, 'bandpass', frek, 6, 0.9, x => Math.pow(1 - x, 3), gec);
      const t = this.ac.currentTime + gec, o = this.ac.createOscillator(), g = this.ac.createGain();
      o.type = 'square'; o.frequency.value = frek * 0.9; g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      const f = this.ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = frek; f.Q.value = 12;
      o.connect(f); f.connect(g); g.connect(this.ana); o.start(t); o.stop(t + 0.1);
    };
    klik(0, 3400); klik(0.07, 5200);
    this.gurultu(0.09, 'highpass', 3000, 0.7, 0.35, x => Math.pow(1 - x, 2), 0.32);
    this.gurultu(0.7, 'lowpass', 600, 0.7, 0.18, x => Math.sin(Math.min(1, x * 3) * Math.PI / 2) * (1 - x), 0.4);
  }
  kaset(){
    if (!this.hazir()) return;
    const t = this.ac.currentTime, o = this.ac.createOscillator(), g = this.ac.createGain(), f = this.ac.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(420, t + 1.4);
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.1); g.gain.setValueAtTime(0.05, t + 1.35); g.gain.linearRampToValueAtTime(0, t + 1.45);
    o.connect(f); f.connect(g); g.connect(this.ana); o.start(t); o.stop(t + 1.5);
    this.gurultu(0.03, 'bandpass', 1800, 3, 0.6, x => 1 - x, 1.5);
    this.gurultu(5.5, 'bandpass', 4000, 0.5, 0.05, x => (x < 0.02 ? x * 50 : 1) * (x > 0.95 ? (1 - x) * 20 : 1), 1.55);
  }
  telsiz(sure){
    if (!this.hazir()) return;
    const s = sure || 3;
    this.gurultu(s, 'bandpass', 1700, 1.5, 0.14, x => (0.6 + 0.4 * Math.sin(x * 90)) * (x > 0.97 ? (1 - x) * 30 : 1));
    [0, s - 0.15].forEach(g => { const t = this.ac.currentTime + g, o = this.ac.createOscillator(), gg = this.ac.createGain(); o.type = 'sine'; o.frequency.value = 1250; gg.gain.setValueAtTime(0.05, t); gg.gain.linearRampToValueAtTime(0, t + 0.12); o.connect(gg); gg.connect(this.ana); o.start(t); o.stop(t + 0.13); });
  }
  telefon(){
    if (!this.hazir()) return;
    [0, 0.45, 2.2, 2.65].forEach(g => {
      const t = this.ac.currentTime + g, o = this.ac.createOscillator(), o2 = this.ac.createOscillator(), gg = this.ac.createGain(), lfo = this.ac.createOscillator(), lg = this.ac.createGain();
      o.frequency.value = 440; o2.frequency.value = 480; lfo.frequency.value = 20; lg.gain.value = 0.03;
      gg.gain.setValueAtTime(0.03, t); gg.gain.setValueAtTime(0.03, t + 0.38); gg.gain.linearRampToValueAtTime(0, t + 0.4);
      lfo.connect(lg); lg.connect(gg.gain); o.connect(gg); o2.connect(gg); gg.connect(this.ana);
      [o, o2, lfo].forEach(x => { x.start(t); x.stop(t + 0.42); });
    });
  }
  silecek(){
    if (!this.hazir()) return;
    [0, 0.6].forEach(g => this.gurultu(0.45, 'bandpass', 700, 0.9, 0.18, x => Math.sin(x * Math.PI), g));
  }
  bulundu(){
    if (!this.hazir()) return;
    const t = this.ac.currentTime;
    [196, 233, 294].forEach((fq, i) => { const o = this.ac.createOscillator(), g = this.ac.createGain(); o.type = 'triangle'; o.frequency.value = fq; g.gain.setValueAtTime(0, t + i * 0.09); g.gain.linearRampToValueAtTime(0.05, t + i * 0.09 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 1.2); o.connect(g); g.connect(this.ana); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 1.25); });
  }
}
