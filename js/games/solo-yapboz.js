// Resimli Yapboz: 8 hazır çizim (SVG) ya da kendi fotoğrafınla gerçek yapboz parçaları (çıkıntı/girinti),
// sürükle-bırak (fare + dokunmatik), doğru yere yaklaşınca oturur. Skor = saniye (az olan iyi).
// YapbozCore DOM'suz; Node'da kenar üretimi test edilebilir.
(function(){
'use strict';

// ---------------- Saf çekirdek ----------------
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Tek bir kenarın çıkıntı eğrisi: A'dan B'ye 3 kübik bezier. sign +1: çıkıntı normal yönüne (alt/sağ parçaya) doğru.
function knobSegs(ax, ay, dx, dy, nx, ny, L, s, sign, j){
  const t = j.t, b = j.b, c = j.c, d = j.d;
  const P = (u, v, raw) => {
    const along = raw ? u * L : L / 2 + (u - 0.5) * s, perp = v * s * sign;
    return [ax + dx * along + nx * perp, ay + dy * along + ny * perp];
  };
  const p1 = P(0.2, 0, true), p2 = P(0.5 + b + d, -t + c), p3 = P(0.5 - t + b, t + c),
        p4 = P(0.5 - 2 * t + b - d, 3 * t + c), p5 = P(0.5 + 2 * t + b - d, 3 * t + c), p6 = P(0.5 + t + b, t + c),
        p7 = P(0.5 + b + d, -t + c), p8 = P(0.8, 0, true), p9 = [ax + dx * L, ay + dy * L];
  return { start: [ax, ay], segs: [p1.concat(p2, p3), p4.concat(p5, p6), p7.concat(p8, p9)] };
}

function reverseChain(ch){
  const pts = [ch.start];
  ch.segs.forEach(sg => pts.push([sg[4], sg[5]]));
  const out = [];
  for (let i = ch.segs.length - 1; i >= 0; i--){
    const sg = ch.segs[i], p0 = pts[i];
    out.push([sg[2], sg[3], sg[0], sg[1], p0[0], p0[1]]);
  }
  return { start: pts[pts.length - 1], segs: out };
}

/** Yapboz: cols×rows parça, W×H resim. Her iç kenara rastgele çıkıntı yönü + küçük şekil oynaması. */
function makePuzzle(cols, rows, W, H, rng){
  const pw = W / cols, ph = H / rows, s = Math.min(pw, ph);
  const jit = () => ({ t: 0.085 + rng() * 0.025, b: (rng() - 0.5) * 0.08, c: (rng() - 0.5) * 0.04, d: (rng() - 0.5) * 0.06 });
  const hE = [], vE = [], hS = [], vS = [];
  for (let r = 0; r < rows - 1; r++){
    hE.push([]); hS.push([]);
    for (let c = 0; c < cols; c++){
      const sg = rng() < 0.5 ? 1 : -1; hS[r].push(sg);
      hE[r].push(knobSegs(c * pw, (r + 1) * ph, 1, 0, 0, 1, pw, s, sg, jit()));
    }
  }
  for (let r = 0; r < rows; r++){
    vE.push([]); vS.push([]);
    for (let c = 0; c < cols - 1; c++){
      const sg = rng() < 0.5 ? 1 : -1; vS[r].push(sg);
      vE[r].push(knobSegs((c + 1) * pw, r * ph, 0, 1, 1, 0, ph, s, sg, jit()));
    }
  }
  const line = (x0, y0, x1, y1) => ({ start: [x0, y0], segs: [[x0, y0, x1, y1, x1, y1]], flat: true });
  const pieces = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
    const x0 = c * pw, y0 = r * ph, x1 = x0 + pw, y1 = y0 + ph;
    const top = r === 0 ? line(x0, y0, x1, y0) : hE[r - 1][c];
    const right = c === cols - 1 ? line(x1, y0, x1, y1) : vE[r][c];
    const bottom = r === rows - 1 ? line(x1, y1, x0, y1) : reverseChain(hE[r][c]);
    const left = c === 0 ? line(x0, y1, x0, y0) : reverseChain(vE[r][c - 1]);
    // çıkıntı: +1 dışa (tab), -1 içe (boşluk), 0 düz
    const out = {
      top: r === 0 ? 0 : -hS[r - 1][c], bottom: r === rows - 1 ? 0 : hS[r][c],
      left: c === 0 ? 0 : -vS[r][c - 1], right: c === cols - 1 ? 0 : vS[r][c]
    };
    pieces.push({ i: pieces.length, r, c, x: x0, y: y0, sides: { top, right, bottom, left }, out });
  }
  return { cols, rows, W, H, pw, ph, pad: Math.ceil(s * 0.38), pieces };
}

// Parçanın kapalı yolu (M/C komutları), resim koordinatlarında
function outline(p){
  const cmds = [['M', p.x, p.y]];
  ['top', 'right', 'bottom', 'left'].forEach(k => p.sides[k].segs.forEach(sg => cmds.push(['C'].concat(sg))));
  return cmds;
}

// Bezier zincirini örnekle (test ve sınır kutusu için)
function sampleChain(ch, n){
  const pts = []; let p0 = ch.start;
  ch.segs.forEach(sg => {
    for (let i = 0; i <= n; i++){
      const t = i / n, u = 1 - t;
      pts.push([u*u*u*p0[0] + 3*u*u*t*sg[0] + 3*u*t*t*sg[2] + t*t*t*sg[4], u*u*u*p0[1] + 3*u*u*t*sg[1] + 3*u*t*t*sg[3] + t*t*t*sg[5]]);
    }
    p0 = [sg[4], sg[5]];
  });
  return pts;
}

const LEVELS = { kolay: [3, 3], orta: [4, 4], zor: [6, 6] };
const YapbozCore = { mulberry32, makePuzzle, outline, sampleChain, reverseChain, LEVELS };
if (typeof module !== 'undefined' && module.exports){ module.exports = YapbozCore; return; }
if (typeof window !== 'undefined') window.YapbozCore = YapbozCore;

// ---------------- Çizimler (SVG) ----------------
const IW = 960, IH = 720;
const svgWrap = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${IW}" height="${IH}" viewBox="0 0 ${IW} ${IH}"><defs>${defs}</defs>${body}</svg>`;
const lg = (id, stops, x2, y2) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2 == null ? 0 : x2}" y2="${y2 == null ? 1 : y2}">${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('')}</linearGradient>`;
const rg = (id, stops, cx, cy, r) => `<radialGradient id="${id}" cx="${cx || 0.5}" cy="${cy || 0.5}" r="${r || 0.5}">${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('')}</radialGradient>`;
const f1 = n => Math.round(n * 10) / 10;

function gull(x, y, s, col){
  return `<path d="M${x - 14 * s} ${y}q${7 * s} ${-9 * s} ${14 * s} 0q${7 * s} ${-9 * s} ${14 * s} 0" fill="none" stroke="${col}" stroke-width="${2.6 * s}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function mosque(x, base, s, col){
  // ortada büyük kubbe, yan yarım kubbeler, dört minare
  let o = `<g fill="${col}">`;
  o += `<rect x="${x - 70 * s}" y="${base - 40 * s}" width="${140 * s}" height="${40 * s}"/>`;
  o += `<path d="M${x - 50 * s} ${base - 40 * s}a${50 * s} ${46 * s} 0 0 1 ${100 * s} 0z"/>`;
  o += `<rect x="${x - 3 * s}" y="${base - 98 * s}" width="${6 * s}" height="${14 * s}"/>`;
  o += `<path d="M${x - 78 * s} ${base - 30 * s}a${26 * s} ${22 * s} 0 0 1 ${52 * s} 0zM${x + 26 * s} ${base - 30 * s}a${26 * s} ${22 * s} 0 0 1 ${52 * s} 0z"/>`;
  [-92, -62, 62, 92].forEach((dx, k) => {
    const h = (k === 0 || k === 3 ? 150 : 175) * s, mx = x + dx * s;
    o += `<rect x="${mx - 4 * s}" y="${base - h}" width="${8 * s}" height="${h}"/>`;
    o += `<rect x="${mx - 6.5 * s}" y="${base - h * 0.72}" width="${13 * s}" height="${4 * s}"/>`;
    o += `<path d="M${mx - 4.5 * s} ${base - h}l${4.5 * s} ${-26 * s}l${4.5 * s} ${26 * s}z"/>`;
  });
  return o + '</g>';
}
function rngSvg(seed){ return mulberry32(seed); }

function imgIstanbul(){
  const R = rngSvg(11);
  let b = `<rect width="960" height="480" fill="url(#sky)"/>`;
  b += `<circle cx="610" cy="430" r="230" fill="url(#glow)"/><circle cx="610" cy="430" r="62" fill="#fff1b8"/>`;
  for (let i = 0; i < 7; i++){
    const cx = R() * 960, cy = 70 + R() * 230, w = 120 + R() * 220;
    b += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(w)}" ry="${f1(10 + R() * 12)}" fill="${['#ff9f80', '#d9668e', '#f6b26b', '#a14d8f'][i % 4]}" opacity="${0.35 + R() * 0.3}"/>`;
  }
  // köprü
  b += `<g stroke="#b06a8c" fill="none"><path d="M420 452H960" stroke-width="4"/><path d="M560 456V372M820 456V372" stroke-width="7"/><path d="M420 452Q500 430 560 374Q690 450 820 374Q880 430 960 448" stroke-width="2.4"/></g>`;
  // uzak tepeler
  b += `<path d="M0 462Q120 420 260 440T520 446T780 428T960 444V480H0z" fill="#7b3d74"/>`;
  // tarihi yarımada
  b += `<path d="M0 470V378Q90 350 200 362T380 386Q420 398 450 470z" fill="#4a1f55"/>`;
  b += mosque(190, 372, 1.05, '#33153f') + mosque(370, 398, 0.62, '#3c1847');
  // Galata tepesi ve kulesi
  b += `<path d="M560 470Q620 410 700 392T880 380Q930 384 960 398V470z" fill="#3a1748"/>`;
  b += `<g fill="#2a0f36"><rect x="752" y="262" width="44" height="140"/><rect x="746" y="256" width="56" height="12" rx="3"/><path d="M748 258L774 186L800 258z"/><rect x="772" y="170" width="4" height="20"/></g>`;
  for (let i = 0; i < 4; i++) b += `<rect x="${760 + i * 9}" y="276" width="5" height="14" rx="2.5" fill="#ffcf6b"/>`;
  // evler ve ışıklı pencereler
  for (let i = 0; i < 26; i++){
    const left = i < 12, x = left ? 20 + i * 36 + R() * 10 : 560 + (i - 12) * 28 + R() * 8;
    const top = left ? 420 + R() * 14 : 404 + R() * 16, w = 22 + R() * 14;
    b += `<rect x="${f1(x)}" y="${f1(top)}" width="${f1(w)}" height="${f1(480 - top)}" fill="${left ? '#3a1647' : '#30123e'}"/>`;
    for (let k = 0; k < 3; k++) if (R() < 0.6) b += `<rect x="${f1(x + 4 + k * 6)}" y="${f1(top + 8 + R() * 18)}" width="3.5" height="5" fill="#ffd07a"/>`;
  }
  // deniz
  b += `<rect y="470" width="960" height="250" fill="url(#sea)"/>`;
  for (let i = 0; i < 26; i++){
    const y = 482 + i * 9 + R() * 4, w = 160 - i * 4 + R() * 60;
    b += `<rect x="${f1(610 - w / 2 + (R() - 0.5) * 40)}" y="${f1(y)}" width="${f1(w)}" height="${f1(3 + i * 0.15)}" rx="2" fill="#ffd77e" opacity="${f1(0.85 - i * 0.025)}"/>`;
  }
  for (let i = 0; i < 40; i++){
    const x = R() * 960, y = 500 + R() * 210;
    b += `<path d="M${f1(x)} ${f1(y)}q12 -5 24 0" stroke="#c98ab8" stroke-width="2" fill="none" opacity=".45"/>`;
  }
  // vapur
  b += `<g transform="translate(250 560)"><path d="M-40 34Q100 52 230 30L300 46Q120 74 -60 46z" fill="#fff" opacity=".35"/>
  <path d="M0 0H220L200 34H18z" fill="#f4efe6"/><path d="M14 22H206L200 34H18z" fill="#2c2238"/>
  <rect x="30" y="-28" width="160" height="28" rx="4" fill="#fbf7ef"/><rect x="58" y="-48" width="104" height="22" rx="4" fill="#fbf7ef"/>
  ${[0,1,2,3,4,5,6,7,8].map(k => `<rect x="${38 + k * 17}" y="-21" width="10" height="10" rx="2" fill="#5a7fb0"/>`).join('')}
  <rect x="100" y="-82" width="20" height="36" fill="#f6f2ea"/><rect x="100" y="-86" width="20" height="12" fill="#1c1a22"/><rect x="100" y="-64" width="20" height="5" fill="#d43c3c"/>
  <path d="M0 0L-12 -10H14z" fill="#d43c3c"/></g>`;
  // martılar
  [[120, 150, 1.6], [190, 120, 1.1], [420, 220, 1.3], [860, 170, 1.7], [900, 240, 1], [500, 120, 0.9]].forEach(g => { b += gull(g[0], g[1], g[2], '#2a1235'); });
  b += `<g transform="translate(80 610)"><ellipse cx="0" cy="0" rx="26" ry="11" fill="#f7f4ee"/><circle cx="24" cy="-8" r="9" fill="#f7f4ee"/><path d="M32 -8l12 3l-12 2z" fill="#f0a830"/><path d="M-20 -6q16 -12 40 -2q-14 10 -40 2z" fill="#b8bfca"/><path d="M-26 -2l-14 -4l4 8z" fill="#2a2a33"/><circle cx="26" cy="-10" r="1.8" fill="#222"/></g>`;
  const defs = lg('sky', [[0, '#25124a'], [0.32, '#6d2a6b'], [0.6, '#d9564d'], [0.82, '#ffa64a'], [1, '#ffd480']]) +
    rg('glow', [[0, '#fff3c0', 0.95], [0.3, '#ffc066', 0.5], [1, '#ff8a4a', 0]]) +
    lg('sea', [[0, '#d9734f'], [0.25, '#8d3d6a'], [1, '#1d1240']]);
  return svgWrap(defs, b);
}

function balloon(x, y, s, cols){
  const id = 'b' + Math.round(x) + '_' + Math.round(y);
  let o = `<clipPath id="${id}"><path d="M${x} ${y + 70 * s}C${x - 30 * s} ${y + 40 * s} ${x - 58 * s} ${y + 10 * s} ${x - 58 * s} ${y - 22 * s}C${x - 58 * s} ${y - 58 * s} ${x - 30 * s} ${y - 78 * s} ${x} ${y - 78 * s}C${x + 30 * s} ${y - 78 * s} ${x + 58 * s} ${y - 58 * s} ${x + 58 * s} ${y - 22 * s}C${x + 58 * s} ${y + 10 * s} ${x + 30 * s} ${y + 40 * s} ${x} ${y + 70 * s}z"/></clipPath>`;
  o += `<g clip-path="url(#${id})">`;
  for (let k = 0; k < 8; k++) o += `<rect x="${x - 58 * s + k * 14.5 * s}" y="${y - 80 * s}" width="${14.6 * s}" height="${160 * s}" fill="${cols[k % cols.length]}"/>`;
  o += `<rect x="${x - 60 * s}" y="${y - 6 * s}" width="${120 * s}" height="${10 * s}" fill="#fff" opacity=".35"/>`;
  o += `<ellipse cx="${x - 22 * s}" cy="${y - 44 * s}" rx="${16 * s}" ry="${26 * s}" fill="#fff" opacity=".25"/></g>`;
  o += `<path d="M${x - 14 * s} ${y + 66 * s}L${x - 9 * s} ${y + 86 * s}M${x + 14 * s} ${y + 66 * s}L${x + 9 * s} ${y + 86 * s}" stroke="#5a3a24" stroke-width="${1.5 * s}"/>`;
  o += `<rect x="${x - 10 * s}" y="${y + 86 * s}" width="${20 * s}" height="${14 * s}" rx="${2 * s}" fill="#8a5a33"/>`;
  return o;
}
function imgKapadokya(){
  const R = rngSvg(22);
  const sets = [['#e63946', '#f1c453', '#2a9d8f', '#f4a261'], ['#5e60ce', '#ff70a6', '#ffd670', '#70d6ff'], ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'], ['#9b5de5', '#f15bb5', '#fee440', '#00bbf9'], ['#ff7b00', '#ffb700', '#ff4800', '#ffd000'], ['#3a86ff', '#ffbe0b', '#fb5607', '#ff006e']];
  let b = `<rect width="960" height="720" fill="url(#sky)"/><circle cx="760" cy="420" r="160" fill="url(#sunG)"/><circle cx="760" cy="430" r="44" fill="#fff4d6"/>`;
  b += `<path d="M0 470Q160 400 320 440T640 420T960 430V720H0z" fill="#d9a67c"/>`;
  b += `<path d="M0 520Q200 470 380 500T740 480T960 500V720H0z" fill="#c98b5e"/>`;
  // peri bacaları
  const chim = (x, base, w, h, col, cap) => {
    let o = `<path d="M${x - w} ${base}C${x - w * 0.9} ${base - h * 0.5} ${x - w * 0.45} ${base - h * 0.85} ${x - w * 0.3} ${base - h}H${x + w * 0.3}C${x + w * 0.45} ${base - h * 0.85} ${x + w * 0.9} ${base - h * 0.5} ${x + w} ${base}z" fill="${col}"/>`;
    o += `<path d="M${x - w * 0.15} ${base - h * 0.9}C${x - w * 0.05} ${base - h * 0.4} ${x + w * 0.2} ${base - h * 0.4} ${x + w * 0.6} ${base}H${x + w}C${x + w * 0.9} ${base - h * 0.5} ${x + w * 0.45} ${base - h * 0.85} ${x + w * 0.3} ${base - h}z" fill="#000" opacity=".12"/>`;
    o += `<ellipse cx="${x}" cy="${base - h - 4}" rx="${w * 0.55}" ry="${w * 0.22}" fill="${cap}"/><path d="M${x - w * 0.55} ${base - h - 4}Q${x} ${base - h - w * 0.6} ${x + w * 0.55} ${base - h - 4}z" fill="${cap}"/>`;
    for (let k = 0; k < 3; k++) if (R() < 0.75) o += `<path d="M${f1(x - w * 0.3 + R() * w * 0.5)} ${f1(base - h * (0.25 + k * 0.22))}a7 9 0 0 1 14 0v10h-14z" fill="#4a2a1a" opacity=".8"/>`;
    return o;
  };
  [[300, 380, 0.55], [540, 380, 0.45], [880, 330, 0.4]].forEach((p, k) => { b += balloon(p[0], p[1], p[2], sets[(k + 2) % 6]); });
  [[80, 600, 60, 210], [190, 620, 48, 170], [300, 590, 70, 240], [610, 610, 56, 190], [720, 600, 74, 250], [860, 620, 58, 200]]
    .forEach((c, k) => { b += chim(c[0], c[1], c[2], c[3], k % 2 ? '#e8c39a' : '#dcae80', '#8a5a3c'); });
  b += `<path d="M0 600Q220 560 470 600T960 590V720H0z" fill="#b5764a"/>`;
  b += `<path d="M0 650Q240 620 480 660T960 640V720H0z" fill="#8c5a36"/>`;
  for (let i = 0; i < 30; i++) b += `<circle cx="${f1(R() * 960)}" cy="${f1(640 + R() * 70)}" r="${f1(5 + R() * 8)}" fill="${R() < 0.5 ? '#5d7a3a' : '#6f8f45'}"/>`;
  [[160, 150, 1.05], [420, 250, 1.4], [640, 120, 0.9], [820, 260, 0.75], [880, 90, 0.5], [60, 330, 0.6]]
    .forEach((p, k) => { b += balloon(p[0], p[1], p[2], sets[k % sets.length]); });
  const defs = lg('sky', [[0, '#6aa8e0'], [0.45, '#b9c8e6'], [0.7, '#f7c7b0'], [1, '#ffd9a8']]) + rg('sunG', [[0, '#fff2cc', 0.9], [1, '#ffcc88', 0]]);
  return svgWrap(defs, b);
}

function imgCay(){
  const R = rngSvg(33);
  let b = `<rect width="960" height="720" fill="url(#bg)"/>`;
  b += `<rect y="250" width="960" height="40" fill="#3f8fc4" opacity=".9"/><rect y="270" width="960" height="20" fill="#2f78ad"/>`;
  for (let i = 0; i < 9; i++){
    const x = i * 120 - 20 + R() * 30;
    b += `<rect x="${f1(x + 46)}" y="160" width="14" height="140" fill="#5b3a22"/><circle cx="${f1(x + 54)}" cy="130" r="${f1(70 + R() * 20)}" fill="${['#2f7d3a', '#3c9447', '#2a6e35'][i % 3]}"/><circle cx="${f1(x + 20)}" cy="${f1(160 + R() * 20)}" r="${f1(40 + R() * 16)}" fill="#47a352" opacity=".85"/>`;
  }
  // ampul zinciri: üç sarkık tel, ampuller telin üstünde
  let wire = 'M0 40';
  for (let k = 0; k < 3; k++) wire += `Q${k * 320 + 160} 130 ${(k + 1) * 320} 40`;
  b += `<path d="${wire}" stroke="#2b2b2b" stroke-width="2.5" fill="none"/>`;
  for (let i = 0; i < 18; i++){
    const k = Math.floor(i / 6), t = (i % 6 + 0.5) / 6, x = k * 320 + t * 320, y = 40 + 2 * t * (1 - t) * 90;
    b += `<circle cx="${f1(x)}" cy="${f1(y + 12)}" r="17" fill="#ffe08a" opacity=".35"/><rect x="${f1(x - 3)}" y="${f1(y)}" width="6" height="6" fill="#333"/><circle cx="${f1(x)}" cy="${f1(y + 12)}" r="7.5" fill="${['#ffd35c', '#ff8a5c', '#9de07a', '#7ac8ff'][i % 4]}"/>`;
  }
  // masa
  b += `<path d="M-20 330H980V720H-20z" fill="url(#wood)"/>`;
  for (let i = 0; i < 8; i++) b += `<path d="M-20 ${360 + i * 48}H980" stroke="#5a3418" stroke-width="3" opacity=".55"/>`;
  for (let i = 0; i < 30; i++) b += `<path d="M${f1(R() * 960)} ${f1(340 + R() * 370)}q30 ${f1(-4 + R() * 8)} 70 0" stroke="#9c6a3c" stroke-width="2" fill="none" opacity=".5"/>`;
  // kareli örtü
  b += `<g transform="translate(40 380) skewX(-12)"><rect width="380" height="300" fill="#fff"/>`;
  for (let i = 0; i < 8; i++) b += `<rect x="${i * 48}" width="24" height="300" fill="#d93838" opacity=".55"/><rect y="${i * 40}" width="380" height="20" fill="#d93838" opacity=".55"/>`;
  b += `</g>`;
  // tavla
  b += `<g transform="translate(520 360)"><rect width="420" height="300" rx="14" fill="#6b3a1d"/><rect x="16" y="16" width="186" height="268" fill="#e9d3a6"/><rect x="218" y="16" width="186" height="268" fill="#e9d3a6"/><rect x="202" y="10" width="16" height="280" fill="#4a2510"/>`;
  for (let side = 0; side < 2; side++) for (let k = 0; k < 6; k++){
    const x = 16 + side * 202 + k * 31;
    b += `<path d="M${x} 16l15.5 110l15.5 -110z" fill="${k % 2 ? '#2b5d8a' : '#b8342c'}"/><path d="M${x} 284l15.5 -110l15.5 110z" fill="${k % 2 ? '#b8342c' : '#2b5d8a'}"/>`;
  }
  const chk = (x, y, w) => `<circle cx="${x}" cy="${y}" r="14" fill="${w ? '#fbf6ea' : '#2a1a14'}" stroke="${w ? '#c9b98f' : '#000'}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${w ? '#d8c9a2' : '#4a3a30'}" stroke-width="2"/>`;
  [[31, 32, 1], [31, 60, 1], [31, 88, 1], [124, 32, 0], [124, 60, 0], [233, 32, 1], [233, 60, 1], [357, 268, 0], [357, 240, 0], [357, 212, 0], [295, 268, 1], [93, 268, 0], [93, 240, 0], [186, 268, 1]].forEach(c => { b += chk(c[0], c[1], c[2]); });
  b += `<g transform="translate(280 140) rotate(14)"><rect width="36" height="36" rx="7" fill="#fff" stroke="#ccc"/><circle cx="10" cy="10" r="3.5"/><circle cx="26" cy="26" r="3.5"/><circle cx="18" cy="18" r="3.5"/></g>`;
  b += `<g transform="translate(330 170) rotate(-20)"><rect width="36" height="36" rx="7" fill="#fff" stroke="#ccc"/><circle cx="10" cy="10" r="3.5"/><circle cx="26" cy="10" r="3.5"/><circle cx="10" cy="26" r="3.5"/><circle cx="26" cy="26" r="3.5"/></g></g>`;
  // simit tabağı
  b += `<ellipse cx="200" cy="520" rx="150" ry="62" fill="#e8eef2"/><ellipse cx="200" cy="514" rx="128" ry="50" fill="#fff"/>`;
  b += `<ellipse cx="200" cy="500" rx="106" ry="46" fill="url(#simit)"/><ellipse cx="200" cy="496" rx="44" ry="16" fill="#fff"/><ellipse cx="200" cy="492" rx="100" ry="40" fill="none" stroke="#e7a65a" stroke-width="4" opacity=".6"/>`;
  for (let i = 0; i < 90; i++){
    const a = R() * Math.PI * 2, rr = 0.55 + R() * 0.4;
    b += `<ellipse cx="${f1(200 + Math.cos(a) * 100 * rr)}" cy="${f1(496 + Math.sin(a) * 40 * rr)}" rx="2.6" ry="1.5" transform="rotate(${f1(R() * 180)} ${f1(200 + Math.cos(a) * 100 * rr)} ${f1(496 + Math.sin(a) * 40 * rr)})" fill="#fff3d6"/>`;
  }
  // ince belli çay bardağı
  b += `<ellipse cx="420" cy="626" rx="92" ry="26" fill="#c8102e"/><ellipse cx="420" cy="620" rx="80" ry="20" fill="#e43148"/><ellipse cx="420" cy="618" rx="40" ry="9" fill="#a50d26"/>`;
  b += `<path d="M370 400C364 470 400 500 396 540C392 580 376 600 384 616H456C464 600 448 580 444 540C440 500 476 470 470 400z" fill="url(#glass)" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>`;
  b += `<path d="M375 440C376 482 402 504 399 540C395 580 380 600 386 612H454C460 600 445 580 441 540C438 504 464 482 465 440z" fill="url(#tea)"/>`;
  b += `<ellipse cx="420" cy="440" rx="45" ry="8" fill="#e0602c"/><path d="M384 420q-4 60 18 96" stroke="#fff" stroke-width="6" opacity=".55" fill="none" stroke-linecap="round"/>`;
  b += `<ellipse cx="420" cy="400" rx="50" ry="9" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/>`;
  b += `<g stroke="#fff" stroke-width="5" fill="none" opacity=".5" stroke-linecap="round"><path d="M400 380q-14 -24 4 -44t-2 -40"/><path d="M436 376q14 -22 -2 -42t4 -38"/></g>`;
  b += `<path d="M500 610l60 -14" stroke="#c9ccd2" stroke-width="7" stroke-linecap="round"/><ellipse cx="566" cy="595" rx="12" ry="6" fill="#c9ccd2"/>`;
  b += `<g transform="translate(470 650)"><rect width="30" height="22" rx="3" fill="#fff"/><rect x="34" y="6" width="22" height="18" rx="3" fill="#fff" opacity=".9"/></g>`;
  const defs = lg('bg', [[0, '#9fd8f5'], [1, '#d8f0ff']]) + lg('wood', [[0, '#a0643a'], [1, '#6e3f1f']]) +
    lg('simit', [[0, '#d98a3a'], [0.6, '#b0601f'], [1, '#8a4512']]) +
    lg('glass', [[0, '#ffffff', 0.35], [1, '#ffffff', 0.15]], 1, 0) + lg('tea', [[0, '#d2401d'], [0.6, '#a3210f'], [1, '#7a160a']]);
  return svgWrap(defs, b);
}

function imgUzay(){
  const R = rngSvg(44);
  let b = `<rect width="960" height="720" fill="url(#bg)"/>`;
  b += `<ellipse cx="260" cy="260" rx="380" ry="200" fill="url(#neb1)" transform="rotate(-20 260 260)"/><ellipse cx="760" cy="520" rx="340" ry="180" fill="url(#neb2)" transform="rotate(25 760 520)"/>`;
  for (let i = 0; i < 260; i++){
    const r = R() < 0.92 ? 0.6 + R() * 1.4 : 2 + R() * 1.6;
    b += `<circle cx="${f1(R() * 960)}" cy="${f1(R() * 720)}" r="${f1(r)}" fill="${['#ffffff', '#cfe3ff', '#ffe9c4'][i % 3]}" opacity="${f1(0.5 + R() * 0.5)}"/>`;
  }
  for (let i = 0; i < 6; i++){
    const x = R() * 960, y = R() * 720;
    b += `<path d="M${f1(x)} ${f1(y - 10)}L${f1(x + 2)} ${f1(y - 2)}L${f1(x + 10)} ${f1(y)}L${f1(x + 2)} ${f1(y + 2)}L${f1(x)} ${f1(y + 10)}L${f1(x - 2)} ${f1(y + 2)}L${f1(x - 10)} ${f1(y)}L${f1(x - 2)} ${f1(y - 2)}z" fill="#fff"/>`;
  }
  // kuyruklu yıldız
  b += `<path d="M120 120L330 230L320 244z" fill="url(#comet)"/><circle cx="326" cy="236" r="8" fill="#fff"/>`;
  // halkalı gezegen
  b += `<g transform="translate(640 270) rotate(-18)"><ellipse rx="230" ry="54" fill="none" stroke="#e8c48a" stroke-width="18" opacity=".55"/>
  <circle r="130" fill="url(#sat)"/>`;
  for (let k = 0; k < 6; k++) b += `<path d="M-130 ${-80 + k * 32}Q0 ${-64 + k * 32} 130 ${-80 + k * 32}" stroke="${k % 2 ? '#c8763a' : '#f2c27a'}" stroke-width="12" fill="none" opacity=".55" clip-path="url(#satc)"/>`;
  b += `<path d="M-230 0A230 54 0 0 0 230 0" fill="none" stroke="#ffd9a0" stroke-width="18"/></g>`;
  // mavi gezegen
  b += `<circle cx="180" cy="540" r="96" fill="url(#earth)"/><path d="M110 500q30 -30 60 -10t40 30q-20 30 -50 20t-50 -40zM190 590q30 -10 50 10q-10 20 -40 18z" fill="#4fbf6a" opacity=".9"/><circle cx="180" cy="540" r="96" fill="url(#shade)"/>`;
  // ay
  b += `<circle cx="380" cy="430" r="40" fill="#cfd3dc"/><circle cx="368" cy="420" r="9" fill="#a9afbb"/><circle cx="392" cy="446" r="6" fill="#a9afbb"/><circle cx="394" cy="414" r="4" fill="#a9afbb"/><circle cx="380" cy="430" r="40" fill="url(#shade)"/>`;
  // roket
  b += `<g transform="translate(780 560) rotate(40)"><path d="M0 -90C26 -60 30 -10 24 30H-24C-30 -10 -26 -60 0 -90z" fill="#f4f4f8"/><path d="M0 -90C10 -78 16 -66 20 -54H-20C-16 -66 -10 -78 0 -90z" fill="#e63946"/>
  <circle cy="-24" r="12" fill="#4cc9f0" stroke="#3a4a6a" stroke-width="4"/><path d="M-24 0L-46 40L-22 30zM24 0L46 40L22 30z" fill="#e63946"/>
  <path d="M-16 32Q0 110 16 32z" fill="url(#flame)"/></g>`;
  // küçük mor gezegen
  b += `<circle cx="880" cy="90" r="34" fill="#b06ce0"/><path d="M846 94q34 10 68 -6" stroke="#d9a6ff" stroke-width="6" fill="none" opacity=".6"/>`;
  const defs = rg('bg', [[0, '#1b1e4a'], [1, '#05060f']], 0.5, 0.4, 0.8) +
    rg('neb1', [[0, '#c04ad8', 0.55], [1, '#c04ad8', 0]]) + rg('neb2', [[0, '#2bb7d9', 0.45], [1, '#2bb7d9', 0]]) +
    rg('sat', [[0, '#ffd59a'], [1, '#c7743a']], 0.38, 0.35, 0.7) + rg('earth', [[0, '#5ab8ff'], [1, '#1b4b9a']], 0.35, 0.35, 0.75) +
    rg('shade', [[0, '#000', 0], [0.7, '#000', 0.05], [1, '#000', 0.5]], 0.35, 0.3, 0.75) +
    lg('comet', [[0, '#ffffff', 0], [1, '#bfe8ff', 0.9]], 1, 0.5) + lg('flame', [[0, '#fff3a0'], [0.5, '#ff9f1c'], [1, '#ff3d00', 0]]) +
    '<clipPath id="satc"><circle r="130"/></clipPath>';
  return svgWrap(defs, b);
}

function imgFener(){
  const R = rngSvg(55);
  let b = `<rect width="960" height="720" fill="url(#sky)"/>`;
  b += `<circle cx="180" cy="120" r="70" fill="#fff6dc" opacity=".08"/><path d="M180 74A46 46 0 1 0 180 166A38 46 0 1 1 180 74z" fill="#fff6dc"/>`;
  for (let i = 0; i < 70; i++) b += `<circle cx="${f1(R() * 960)}" cy="${f1(R() * 300)}" r="${f1(0.6 + R() * 1.4)}" fill="#fff" opacity="${f1(0.3 + R() * 0.6)}"/>`;
  for (let i = 0; i < 4; i++){
    const x = 300 + i * 170 + R() * 40, y = 70 + R() * 120;
    b += `<g fill="#7e86b8" opacity=".55"><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="80" ry="20"/><ellipse cx="${f1(x + 30)}" cy="${f1(y - 14)}" rx="44" ry="20"/></g>`;
  }
  // ışık huzmesi
  b += `<path d="M690 180L0 40V300z" fill="url(#beam)"/><path d="M690 180L960 120V230z" fill="url(#beam2)"/>`;
  // kayalık
  b += `<path d="M520 470L560 380L640 350L760 340L860 380L960 360V560H500z" fill="#3b3f4f"/><path d="M560 380L640 350L700 420L620 470z" fill="#4c5163"/><path d="M760 340L860 380L820 450L740 420z" fill="#2b2f3c"/>`;
  // fener
  b += `<g transform="translate(690 0)"><path d="M-56 360L-38 200H38L56 360z" fill="#f2f2f2"/>`;
  b += `<path d="M-52 330L-49 300H49L52 330zM-45 270L-42 240H42L45 270z" fill="#d62f2f"/>`;
  b += `<path d="M-41 230L-38 200H38L41 230z" fill="#d62f2f"/><rect x="-48" y="188" width="96" height="12" rx="3" fill="#2a2d38"/>`;
  b += `<rect x="-26" y="148" width="52" height="40" fill="#ffe27a"/><circle cy="168" r="30" fill="#fff7c4" opacity=".7"/><path d="M-26 148V188M-9 148V188M9 148V188M26 148V188" stroke="#2a2d38" stroke-width="3"/>`;
  b += `<path d="M-34 148L0 116L34 148z" fill="#d62f2f"/><rect x="-2" y="102" width="4" height="16" fill="#2a2d38"/>`;
  b += `<rect x="-12" y="320" width="24" height="40" rx="12" fill="#5a4030"/><rect x="-8" y="250" width="16" height="20" rx="8" fill="#5f8fbf"/></g>`;
  b += `<g transform="translate(800 330)"><rect width="56" height="40" fill="#e9e2d0"/><path d="M-6 0L28 -26L62 0z" fill="#8a3a2a"/><rect x="20" y="14" width="14" height="26" fill="#6a4a30"/></g>`;
  // deniz katmanları
  const wave = (y, amp, col, ph) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= 960; x += 60) d += `Q${x + 15} ${y - amp + Math.sin(x * 0.02 + ph) * 4} ${x + 30} ${y}T${x + 60} ${y}`;
    return `<path d="${d}V720H0z" fill="${col}"/>`;
  };
  b += wave(470, 10, '#2c5b8f', 0) + wave(520, 14, '#24508a', 1) + wave(580, 16, '#1d4479', 2) + wave(640, 18, '#163a6b', 3) + wave(690, 14, '#10305c', 4);
  for (let i = 0; i < 60; i++){
    const x = R() * 960, y = 480 + R() * 230;
    b += `<path d="M${f1(x)} ${f1(y)}q10 -6 20 0q10 -6 20 0" stroke="#bfe3ff" stroke-width="2.4" fill="none" opacity="${f1(0.3 + R() * 0.5)}" stroke-linecap="round"/>`;
  }
  // kayaya vuran köpük
  for (let i = 0; i < 18; i++) b += `<circle cx="${f1(510 + R() * 450)}" cy="${f1(540 + R() * 30)}" r="${f1(6 + R() * 12)}" fill="#e8f6ff" opacity=".85"/>`;
  // yelkenli
  b += `<g transform="translate(260 520)"><path d="M-70 0H70L50 26H-50z" fill="#8a4b2a"/><path d="M0 -150V0" stroke="#3a2a20" stroke-width="5"/><path d="M4 -146L84 -12H4z" fill="#f8f4e8"/><path d="M-4 -120L-66 -12H-4z" fill="#ffcf5a"/><path d="M0 -150l26 8l-26 8z" fill="#d62f2f"/></g>`;
  b += gull(420, 330, 1.2, '#e8eefa') + gull(470, 300, 0.8, '#e8eefa');
  const defs = lg('sky', [[0, '#141b3d'], [0.5, '#3b3f7a'], [0.85, '#c27a8a'], [1, '#f2b38a']]) + lg('skyT', [[0, '#1a2148'], [1, '#2a2f62']]) +
    lg('beam', [[0, '#fff3a6', 0], [1, '#fff3a6', 0.55]], 1, 0) + lg('beam2', [[0, '#fff3a6', 0.5], [1, '#fff3a6', 0]], 1, 0);
  return svgWrap(defs, b);
}

function imgNeon(){
  const R = rngSvg(66);
  let b = `<rect width="960" height="720" fill="url(#sky)"/>`;
  for (let i = 0; i < 90; i++) b += `<circle cx="${f1(R() * 960)}" cy="${f1(R() * 300)}" r="${f1(0.6 + R())}" fill="#fff" opacity="${f1(0.3 + R() * 0.6)}"/>`;
  // çizgili güneş
  b += `<circle cx="480" cy="360" r="190" fill="url(#sun)"/>`;
  for (let i = 0; i < 7; i++) b += `<rect x="280" y="${370 + i * 22}" width="400" height="${4 + i * 1.6}" fill="#1a0b2e"/>`;
  // binalar
  const neon = ['#00f0ff', '#ff2bd6', '#ffe14d', '#7cff6b', '#8a6bff'];
  for (let layer = 0; layer < 2; layer++){
    for (let i = 0; i < 14; i++){
      const w = 50 + R() * 50, x = i * 72 - 30 + R() * 20, h = layer ? 120 + R() * 170 : 160 + R() * 240;
      const top = 470 - h, col = neon[(i + layer) % neon.length];
      b += `<rect x="${f1(x)}" y="${f1(top)}" width="${f1(w)}" height="${f1(h)}" fill="${layer ? '#120822' : '#1d0e36'}" stroke="${col}" stroke-opacity="${layer ? 0.9 : 0.35}" stroke-width="2"/>`;
      if (R() < 0.4) b += `<rect x="${f1(x + w / 2 - 2)}" y="${f1(top - 30)}" width="4" height="30" fill="${col}"/>`;
      for (let yy = top + 12; yy < 460; yy += 18) for (let xx = x + 8; xx < x + w - 10; xx += 14) {
        if (R() < (layer ? 0.45 : 0.25)) b += `<rect x="${f1(xx)}" y="${f1(yy)}" width="7" height="8" fill="${R() < 0.7 ? '#ffd27a' : col}" opacity="${layer ? 0.9 : 0.5}"/>`;
      }
    }
  }
  // neon tabelalar
  b += `<g font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" text-anchor="middle">
  <rect x="96" y="250" width="150" height="56" rx="10" fill="#120822" stroke="#ff2bd6" stroke-width="4"/><text x="171" y="291" font-size="34" fill="#ffb3f2" stroke="#ff2bd6" stroke-width="1.5">OYUN</text>
  <rect x="704" y="220" width="130" height="56" rx="10" fill="#120822" stroke="#00f0ff" stroke-width="4"/><text x="769" y="261" font-size="34" fill="#b8fbff" stroke="#00f0ff" stroke-width="1.5">ÇAY</text></g>`;
  // ızgara zemin
  b += `<rect y="470" width="960" height="250" fill="url(#floor)"/>`;
  for (let i = 0; i < 9; i++){ const y = 470 + Math.pow(i / 8, 2) * 250; b += `<path d="M0 ${f1(y)}H960" stroke="#ff2bd6" stroke-width="${f1(1 + i * 0.35)}" opacity=".8"/>`; }
  for (let i = -12; i <= 12; i++) b += `<path d="M${480 + i * 14} 470L${480 + i * 110} 720" stroke="#00f0ff" stroke-width="1.6" opacity=".7"/>`;
  b += `<rect y="466" width="960" height="6" fill="#ff7af0"/>`;
  // uçan araba
  b += `<g transform="translate(620 150)"><path d="M0 20Q20 0 60 0H110Q140 4 150 20L156 34H-6z" fill="#2a1450" stroke="#00f0ff" stroke-width="3"/><path d="M40 4H100L112 18H30z" fill="#7a4bff" opacity=".7"/><path d="M-6 34H-60" stroke="#ff2bd6" stroke-width="5" opacity=".7"/><path d="M-6 26H-40" stroke="#ffe14d" stroke-width="3" opacity=".7"/></g>`;
  const defs = lg('sky', [[0, '#05020f'], [0.5, '#2a0b4a'], [1, '#6a1360']]) + lg('sun', [[0, '#ffe14d'], [0.5, '#ff7a3d'], [1, '#ff2bd6']]) +
    lg('floor', [[0, '#2a0b40'], [1, '#07020f']]);
  return svgWrap(defs, b);
}

function imgOrman(){
  const R = rngSvg(77);
  let b = `<rect width="960" height="720" fill="url(#sky)"/>`;
  b += `<path d="M640 0L520 720H600L700 0zM760 0L700 720H760L820 0z" fill="#fff8d0" opacity=".14"/>`;
  // uzak dağ
  b += `<path d="M0 300L120 180L230 260L360 120L470 230L560 160L700 280L820 150L960 260V420H0z" fill="#9fc3c9"/><path d="M360 120L330 170L360 160L390 175zM820 150L795 190L822 180L850 195z" fill="#fff"/>`;
  // ağaç sırası çizici
  const pines = (y, n, hMin, hMax, cols, seed, sides) => {
    const r = mulberry32(seed); let o = '';
    for (let i = 0; i < n; i++){
      const x = sides ? (i % 2 ? 660 + r() * 320 : -20 + r() * 300) : r() * 980 - 10, h = hMin + r() * (hMax - hMin), w = h * 0.38, col = cols[i % cols.length];
      o += `<path d="M${f1(x)} ${f1(y - h)}L${f1(x + w * 0.6)} ${f1(y - h * 0.55)}H${f1(x + w * 0.35)}L${f1(x + w)} ${f1(y - h * 0.1)}H${f1(x - w)}L${f1(x - w * 0.35)} ${f1(y - h * 0.55)}H${f1(x - w * 0.6)}z" fill="${col}"/><rect x="${f1(x - 3)}" y="${f1(y - h * 0.1)}" width="6" height="${f1(h * 0.12)}" fill="#4a3020"/>`;
    }
    return o;
  };
  b += pines(400, 40, 60, 110, ['#5f9a86', '#6aa892', '#57907c'], 1);
  b += `<path d="M0 396H960V720H0z" fill="#6fae6a"/><path d="M0 430Q240 410 480 440T960 420V720H0z" fill="#5d9c5a"/>`;
  // kayalık yamaçlar ve şelale
  b += `<path d="M300 220Q330 200 360 230L380 520H260z" fill="#6f6a72"/><path d="M560 230Q600 200 640 240L680 520H560z" fill="#77727a"/>`;
  b += `<path d="M360 232Q460 214 560 232V540H360z" fill="url(#fall)"/>`;
  for (let i = 0; i < 26; i++){
    const x = 370 + R() * 180;
    b += `<path d="M${f1(x)} ${f1(240 + R() * 40)}V${f1(400 + R() * 140)}" stroke="#ffffff" stroke-width="${f1(2 + R() * 4)}" opacity="${f1(0.35 + R() * 0.4)}" stroke-linecap="round"/>`;
  }
  b += `<path d="M360 232Q460 214 560 232" stroke="#e6fbff" stroke-width="8" fill="none"/>`;
  // gökkuşağı
  ['#ff4d4d', '#ffa64d', '#ffe14d', '#5edc6a', '#4db8ff', '#8a6bff'].forEach((c, k) => {
    b += `<path d="M330 520A150 170 0 0 1 630 520" stroke="${c}" stroke-width="7" fill="none" opacity=".32" transform="translate(0 ${-k * 7}) scale(1 1)"/>`;
  });
  // göl
  b += `<ellipse cx="460" cy="560" rx="360" ry="70" fill="url(#pool)"/>`;
  for (let i = 0; i < 6; i++) b += `<ellipse cx="460" cy="548" rx="${60 + i * 46}" ry="${12 + i * 7}" fill="none" stroke="#e6fbff" stroke-width="2" opacity="${f1(0.5 - i * 0.07)}"/>`;
  for (let i = 0; i < 20; i++) b += `<circle cx="${f1(400 + R() * 120)}" cy="${f1(520 + R() * 30)}" r="${f1(8 + R() * 16)}" fill="#fff" opacity=".55"/>`;
  b += pines(630, 12, 170, 280, ['#2f6b46', '#2a5e3e', '#367a50'], 7, true);
  // ön çimen ve çiçekler
  b += `<path d="M0 600Q240 570 480 620T960 600V720H0z" fill="#3f8a46"/><path d="M0 660Q300 630 560 670T960 650V720H0z" fill="#357a3b"/>`;
  for (let i = 0; i < 50; i++){
    const x = R() * 960, y = 610 + R() * 100, c = ['#ff6b8a', '#ffd84d', '#ffffff', '#b98bff'][i % 4];
    b += `<path d="M${f1(x)} ${f1(y)}v12" stroke="#2a5e2e" stroke-width="2"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(4 + R() * 3)}" fill="${c}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="1.6" fill="#ffb300"/>`;
  }
  // geyik
  b += `<g transform="translate(780 560)" fill="#8a5a33"><ellipse cx="0" cy="0" rx="40" ry="20"/><rect x="-32" y="10" width="7" height="40"/><rect x="-14" y="10" width="7" height="40"/><rect x="16" y="10" width="7" height="40"/><rect x="28" y="10" width="7" height="40"/>
  <path d="M30 -8L46 -50L60 -46L48 -2z"/><ellipse cx="60" cy="-54" rx="16" ry="10"/><path d="M52 -62l-8 -24l-8 -4M52 -72l-12 -4M64 -62l6 -24l10 -6M68 -74l10 -2" stroke="#5a3a20" stroke-width="3" fill="none"/>
  <circle cx="66" cy="-56" r="2" fill="#111"/><g fill="#f4e6d0"><circle cx="-10" cy="-4" r="3"/><circle cx="6" cy="-8" r="3"/><circle cx="-22" cy="-6" r="2.5"/></g></g>`;
  const defs = lg('sky', [[0, '#bfe6ff'], [1, '#eaf8ff']]) + lg('fall', [[0, '#a8e6f5'], [1, '#5cc3e0']], 1, 0) + rg('pool', [[0, '#7fd6ea'], [1, '#2f8fae']]);
  return svgWrap(defs, b);
}

function imgArcade(){
  const R = rngSvg(88);
  let b = `<rect width="960" height="720" fill="#151a2c"/>`;
  // memphis desenli arka plan
  const cols = ['#ff5fa2', '#ffd23f', '#3bceac', '#7aa2ff', '#ff8c42'];
  for (let i = 0; i < 70; i++){
    const x = R() * 960, y = R() * 720, c = cols[i % cols.length], k = i % 5, s = 10 + R() * 14, rot = R() * 360;
    if (k === 0) b += `<path d="M${f1(x)} ${f1(y)}l${f1(s)} ${f1(s * 1.6)}h${f1(-s * 2)}z" fill="none" stroke="${c}" stroke-width="4" transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})"/>`;
    else if (k === 1) b += `<path d="M${f1(x)} ${f1(y)}q8 -14 16 0t16 0t16 0" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})"/>`;
    else if (k === 2) b += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s * 0.5)}" fill="${c}"/>`;
    else if (k === 3) b += `<path d="M${f1(x - s)} ${f1(y)}h${f1(s * 2)}M${f1(x)} ${f1(y - s)}v${f1(s * 2)}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
    else b += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(s)}" height="${f1(s)}" fill="none" stroke="${c}" stroke-width="4" transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})"/>`;
  }
  // piksel figürler
  const px = (ox, oy, sz, rows, col) => {
    let o = '';
    rows.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === '1') o += `<rect x="${ox + rx * sz}" y="${oy + ry * sz}" width="${sz}" height="${sz}" fill="${col}"/>`; });
    return o;
  };
  const inv = ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000'];
  const heart = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
  const coin = ['00111100', '01111110', '11011011', '11011011', '11011011', '11011011', '01111110', '00111100'];
  b += px(60, 60, 9, inv, '#3bceac') + px(800, 80, 8, inv, '#ff5fa2') + px(60, 560, 10, heart, '#ff4d6d') + px(140, 560, 10, heart, '#ff4d6d') + px(220, 560, 10, heart, '#ff4d6d');
  b += px(820, 560, 9, coin, '#ffd23f') + px(740, 600, 7, coin, '#ffd23f') + px(880, 640, 6, coin, '#ffd23f');
  // büyük oyun kolu
  b += `<g transform="translate(480 380) scale(9) translate(-32 -38)">
  <ellipse cx="32" cy="56" rx="28" ry="4" fill="#000" opacity=".35"/>
  <path fill="url(#pad)" d="M18.5 22.5h27c7 0 11.7 4.6 13.2 11.4l2.3 10.6c1.1 5.1-2.4 9.5-7.2 9.5-3 0-5.1-1.5-6.6-4L44.8 45H19.2l-2.4 5c-1.5 2.5-3.6 4-6.6 4-4.8 0-8.3-4.4-7.2-9.5l2.3-10.6c1.5-6.8 6.2-11.4 13.2-11.4z"/>
  <path fill="#fff" opacity=".35" d="M18.5 22.5h27c4.8 0 8.6 2.2 10.9 5.8H7.6c2.3-3.6 6.1-5.8 10.9-5.8z"/>
  <rect x="12.5" y="32" width="13" height="4.4" rx="1.6" fill="#0f1218"/><rect x="16.8" y="27.7" width="4.4" height="13" rx="1.6" fill="#0f1218"/>
  <circle cx="45.5" cy="29.8" r="2.7" fill="#ffd23f"/><circle cx="50.6" cy="34.4" r="2.7" fill="#ff5fa2"/><circle cx="40.4" cy="34.4" r="2.7" fill="#7aa2ff"/><circle cx="45.5" cy="39" r="2.7" fill="#3bceac" stroke="#0f1218" stroke-width=".6"/>
  <rect x="27" y="35" width="4" height="1.6" rx=".8" fill="#0f1218" opacity=".6"/><rect x="33" y="35" width="4" height="1.6" rx=".8" fill="#0f1218" opacity=".6"/>
  <path d="M45.5 11.5a9.5 9.5 0 0 1 7 7" fill="none" stroke="#5ee0b5" stroke-width="2.4" stroke-linecap="round"/><path d="M47 4a16.5 16.5 0 0 1 13 13" fill="none" stroke="#7aa2ff" stroke-width="2.4" stroke-linecap="round"/></g>`;
  b += `<g font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" text-anchor="middle"><text x="480" y="130" font-size="66" fill="#ffd23f" stroke="#ff5fa2" stroke-width="3" letter-spacing="4" paint-order="stroke">OYUN ODASI</text>
  <text x="480" y="684" font-size="30" fill="#3bceac" letter-spacing="6">BAŞLAMAK İÇİN BAS</text></g>`;
  const defs = lg('pad', [[0, '#5ee0b5'], [1, '#7aa2ff']], 1, 1);
  return svgWrap(defs, b);
}

const IMAGES = [
  { id: 'istanbul', name: 'İstanbul gün batımı', make: imgIstanbul },
  { id: 'kapadokya', name: 'Kapadokya balonları', make: imgKapadokya },
  { id: 'cay', name: 'Çay bahçesi', make: imgCay },
  { id: 'uzay', name: 'Uzay', make: imgUzay },
  { id: 'fener', name: 'Deniz feneri', make: imgFener },
  { id: 'neon', name: 'Neon şehir', make: imgNeon },
  { id: 'orman', name: 'Orman şelalesi', make: imgOrman },
  { id: 'arcade', name: 'Retro oyun', make: imgArcade }
];
const urlCache = {};
const imgUrl = im => urlCache[im.id] || (urlCache[im.id] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(im.make()));

function loadImage(src){
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
// resmi 960×720 tuvale oturt (4:3 ortadan kırp)
function toCanvas(img){
  const cv = document.createElement('canvas'); cv.width = IW; cv.height = IH;
  const g = cv.getContext('2d'), iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const sc = Math.max(IW / iw, IH / ih), w = iw * sc, h = ih * sc;
  g.fillStyle = '#000'; g.fillRect(0, 0, IW, IH);
  g.drawImage(img, (IW - w) / 2, (IH - h) / 2, w, h);
  return cv;
}

// ---------------- Arayüz ----------------
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const LEVEL_NAMES = { kolay: 'Kolay', orta: 'Orta', zor: 'Zor' };

function mount(root, ctx){
  const level = LEVELS[ctx.level] ? ctx.level : 'orta';
  const [COLS, ROWS] = LEVELS[level];
  const wrap = el('div', 'yapboz'); root.append(wrap);
  let timers = [], raf = 0, destroyed = false, onResize = null, ro = null;

  function clearGame(){
    timers.forEach(t => clearInterval(t)); timers = [];
    cancelAnimationFrame(raf);
    if (ro) { ro.disconnect(); ro = null; }
    if (onResize) { window.removeEventListener('resize', onResize); onResize = null; }
  }

  // ---- resim seçici ----
  function chooser(){
    clearGame(); wrap.innerHTML = '';
    const head = el('div', 'yapboz-head');
    head.append(el('div', 'yapboz-title', `Bir resim seç <span class="yapboz-lvl">${LEVEL_NAMES[level]} · ${COLS * ROWS} parça</span>`));
    const rnd = el('button', 'btn small primary', '🎲 Rastgele');
    rnd.onclick = () => start(IMAGES[Math.floor(Math.random() * IMAGES.length)]);
    head.append(rnd);
    const grid = el('div', 'yapboz-grid');
    IMAGES.forEach(im => {
      const b = el('button', 'yapboz-pick');
      b.type = 'button'; b.dataset.img = im.id;
      const th = el('img'); th.alt = ''; th.src = imgUrl(im); th.draggable = false;
      b.append(th, el('span', '', im.name));
      b.onclick = () => start(im);
      grid.append(b);
    });
    const ph = el('label', 'yapboz-pick yapboz-photo');
    ph.innerHTML = '<span class="yapboz-cam">📷</span><span>Kendi fotoğrafın</span><small>Tabloya yazılmaz</small>';
    const inp = el('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.hidden = true;
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const u = URL.createObjectURL(f);
      loadImage(u).then(img => { URL.revokeObjectURL(u); start({ id: 'foto', name: 'Kendi fotoğrafın', custom: true }, toCanvas(img)); })
        .catch(() => { URL.revokeObjectURL(u); ctx.toast('Bu fotoğraf açılamadı'); });
    };
    ph.append(inp); grid.append(ph);
    wrap.append(head, grid);
  }

  // ---- oyun ----
  async function start(im, readyCanvas){
    clearGame();
    let src = readyCanvas;
    if (!src){
      try { src = toCanvas(await loadImage(imgUrl(im))); } catch(e){ ctx.toast('Resim yüklenemedi'); return; }
    }
    if (destroyed) return;
    wrap.innerHTML = '';
    const seed = (Math.random() * 4294967296) >>> 0, rng = mulberry32(seed);
    const P = makePuzzle(COLS, ROWS, IW, IH, rng);
    const bar = el('div', 'yapboz-bar');
    const back = el('button', 'btn small', '←<span class="yapboz-lbl"> Resimler</span>');
    back.title = 'Resim seçimine dön';
    const stat = el('div', 'yapboz-stat', `<b class="yapboz-time">0:00</b><span class="yapboz-count">0/${P.pieces.length}</span>`);
    const peek = el('button', 'btn small yapboz-peek', '👁<span class="yapboz-lbl"> Resmi göster</span>');
    peek.title = 'Resmin tamamını 2 saniye göster';
    const ghostBtn = el('button', 'btn small yapboz-ghostbtn on', '🖼<span class="yapboz-lbl"> Silik resim</span>');
    ghostBtn.title = 'Tahtadaki silik resmi aç/kapat';
    bar.append(back, el('span', 'yapboz-name', im.name), el('span', 'yapboz-sp'), stat, peek, ghostBtn);
    const area = el('div', 'yapboz-area');
    const board = el('div', 'yapboz-board');
    const ghost = document.createElement('canvas');
    ghost.width = IW / 2; ghost.height = IH / 2; ghost.className = 'yapboz-ghost';
    ghost.getContext('2d').drawImage(src, 0, 0, IW / 2, IH / 2);
    const full = document.createElement('canvas'); full.width = IW; full.height = IH; full.className = 'yapboz-full';
    full.getContext('2d').drawImage(src, 0, 0);
    const tray = el('div', 'yapboz-tray');
    board.append(ghost, full);
    area.append(tray, board);
    const note = el('div', 'yapboz-note');
    wrap.append(bar, area, note);
    if (im.custom) note.textContent = 'Kendi fotoğrafınla oynuyorsun — bu sonuç skor tablosuna yazılmaz.';

    const G = { P, im, src, area, board, tray, pieces: [], placed: 0, t0: performance.now(), done: false, z: 10, S: 1, k: 0, L: null };
    const timeEl = stat.querySelector('.yapboz-time'), countEl = stat.querySelector('.yapboz-count');
    timers.push(setInterval(() => { if (!G.done) timeEl.textContent = fmtTime((performance.now() - G.t0) / 1000); }, 250));

    back.onclick = chooser;
    let peekT = 0;
    peek.onclick = () => { board.classList.add('peek'); clearTimeout(peekT); peekT = setTimeout(() => board.classList.remove('peek'), 2000); };
    ghostBtn.onclick = () => { const on = !ghostBtn.classList.contains('on'); ghostBtn.classList.toggle('on', on); board.classList.toggle('noghost', !on); };

    // parçalar: Path2D yerel koordinatlarda (sol üst = parça kutusu - pad)
    P.pieces.forEach(p => {
      const path = new Path2D(), ox = p.x - P.pad, oy = p.y - P.pad;
      outline(p).forEach(c => { if (c[0] === 'M') path.moveTo(c[1] - ox, c[2] - oy); else path.bezierCurveTo(c[1] - ox, c[2] - oy, c[3] - ox, c[4] - oy, c[5] - ox, c[6] - oy); });
      path.closePath();
      const cv = document.createElement('canvas'); cv.className = 'yapboz-piece'; cv.dataset.i = p.i;
      area.append(cv);
      G.pieces.push({ p, path, cv, zone: 'tray', u: 0, v: 0, placed: false, z: 0, x: 0, y: 0 });
    });
    // tepside dağınık yerleşim: karışık sıralı, sallantılı ızgara
    const order = G.pieces.slice();
    for (let i = order.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    G.order = order;

    layout(G, true);
    onResize = () => layout(G, false);
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver){ ro = new ResizeObserver(() => layout(G, false)); ro.observe(wrap); }
    bindDrag(G, countEl);
  }

  // Yerleşim: masaüstünde tahta solda tepsi sağda, dar ekranda tahta üstte tepsi altta
  function layout(G, first){
    if (!G || destroyed) return;
    const W = Math.max(280, wrap.clientWidth);
    const wide = W >= 640;
    let bw, bh, ah, tr;
    const gap = 12;
    if (wide){
      const avail = Math.max(340, Math.min(520, (root.clientHeight || 520) - 56));
      ah = avail; bh = ah - 8; bw = bh * 4 / 3;
      if (bw > (W - gap) * 0.64){ bw = (W - gap) * 0.64; bh = bw * 3 / 4; }
      const bx = 4, by = Math.round((ah - bh) / 2);
      G.B = { x: bx, y: by, w: bw, h: bh };
      tr = { x: bx + bw + gap, y: 4, w: W - bw - gap - 8, h: ah - 8 };
    } else {
      bw = W - 8; bh = bw * 3 / 4;
      const th = Math.max(220, Math.round(bh * 1.05));
      ah = bh + th + gap + 8;
      G.B = { x: 4, y: 4, w: bw, h: bh };
      tr = { x: 4, y: bh + gap + 4, w: W - 8, h: th };
    }
    G.T = tr;
    const S = bw / IW, P = G.P;
    G.S = S;
    G.area.style.height = ah + 'px';
    Object.assign(G.board.style, { left: G.B.x + 'px', top: G.B.y + 'px', width: bw + 'px', height: bh + 'px' });
    Object.assign(G.tray.style, { left: tr.x + 'px', top: tr.y + 'px', width: tr.w + 'px', height: tr.h + 'px' });
    // gerekirse parçaları yeni çözünürlükte çiz
    const k = Math.min(1.5, S * (window.devicePixelRatio || 1));
    if (!G.k || k > G.k * 1.2 || first) { G.k = k; G.pieces.forEach(pc => renderPiece(G, pc)); }
    const cw = (P.pw + 2 * P.pad) * S, ch = (P.ph + 2 * P.pad) * S;
    G.pieces.forEach(pc => { pc.cv.style.width = cw + 'px'; pc.cv.style.height = ch + 'px'; });
    if (first){
      const n = G.order.length, pw = P.pw * S, ph = P.ph * S;
      const ar = tr.w / tr.h;
      let cols = Math.max(1, Math.round(Math.sqrt(n * ar * (ph / pw)))), rows = Math.ceil(n / cols);
      G.order.forEach((pc, i) => {
        const cx = i % cols, cy = Math.floor(i / cols);
        const fx = cols > 1 ? cx / (cols - 1) : 0.5, fy = rows > 1 ? cy / (rows - 1) : 0.5;
        pc.zone = 'tray';
        pc.u = Math.min(1, Math.max(0, fx + (Math.random() - 0.5) * 0.12 / cols));
        pc.v = Math.min(1, Math.max(0, fy + (Math.random() - 0.5) * 0.12 / rows));
        pc.z = ++G.z;
      });
    }
    G.pieces.forEach(pc => place(G, pc));
  }

  // bölgeye göre ekran konumu (parça kutusunun sol üstü)
  function place(G, pc){
    const P = G.P, S = G.S, pw = P.pw * S, ph = P.ph * S;
    let x, y;
    if (pc.placed){ x = G.B.x + pc.p.x * S; y = G.B.y + pc.p.y * S; }
    else if (pc.zone === 'board'){ x = G.B.x + pc.u * G.B.w; y = G.B.y + pc.v * G.B.h; }
    else {
      x = G.T.x + pc.u * Math.max(0, G.T.w - pw); y = G.T.y + pc.v * Math.max(0, G.T.h - ph);
    }
    setPos(G, pc, x, y);
  }
  function setPos(G, pc, x, y){
    pc.x = x; pc.y = y;
    const pad = G.P.pad * G.S;
    pc.cv.style.transform = `translate(${x - pad}px,${y - pad}px)`;
    pc.cv.style.zIndex = pc.placed ? 1 : pc.z;
  }

  function renderPiece(G, pc){
    const P = G.P, k = G.k, cv = pc.cv, p = pc.p;
    cv.width = Math.ceil((P.pw + 2 * P.pad) * k); cv.height = Math.ceil((P.ph + 2 * P.pad) * k);
    const g = cv.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    const ox = p.x - P.pad, oy = p.y - P.pad;
    g.save(); g.clip(pc.path);
    g.drawImage(G.src, -ox, -oy);
    // hafif kabartma: sol üst kenarda ışık, sağ altta gölge (ekranda ~1-2 px)
    const lw = 1 / G.S;
    g.lineWidth = lw * 2.4;
    g.translate(lw, lw); g.strokeStyle = 'rgba(255,255,255,.32)'; g.stroke(pc.path);
    g.translate(-2 * lw, -2 * lw); g.strokeStyle = 'rgba(0,0,0,.32)'; g.stroke(pc.path);
    g.restore();
    g.lineWidth = 0.8 / G.S; g.strokeStyle = 'rgba(0,0,0,.5)'; g.stroke(pc.path);
  }

  function bindDrag(G, countEl){
    const area = G.area;
    let drag = null;
    const hit = (cx, cy) => {
      const r = area.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
      const hc = hitCtx(), S = G.S, pad = G.P.pad * S;
      const list = G.pieces.filter(pc => !pc.placed).sort((a, b) => b.z - a.z);
      for (const pc of list){
        const lx = (x - (pc.x - pad)) / S, ly = (y - (pc.y - pad)) / S;
        if (lx < 0 || ly < 0 || lx > G.P.pw + 2 * G.P.pad || ly > G.P.ph + 2 * G.P.pad) continue;
        if (hc.isPointInPath(pc.path, lx, ly)) return { pc, x, y };
      }
      return null;
    };
    area.addEventListener('pointerdown', e => {
      if (G.done || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const h = hit(e.clientX, e.clientY); if (!h) return;
      e.preventDefault();
      try { area.setPointerCapture(e.pointerId); } catch(err){}
      h.pc.z = ++G.z;
      drag = { pc: h.pc, id: e.pointerId, dx: h.x - h.pc.x, dy: h.y - h.pc.y };
      h.pc.cv.classList.add('drag');
      setPos(G, h.pc, h.pc.x, h.pc.y);
    });
    area.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const r = area.getBoundingClientRect();
      const x = Math.min(r.width - 10, Math.max(10 - G.P.pw * G.S, e.clientX - r.left - drag.dx));
      const y = Math.min(r.height - 10, Math.max(10 - G.P.ph * G.S, e.clientY - r.top - drag.dy));
      setPos(G, drag.pc, x, y);
    });
    const up = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const pc = drag.pc; drag = null;
      pc.cv.classList.remove('drag');
      drop(G, pc, countEl);
    };
    area.addEventListener('pointerup', up);
    area.addEventListener('pointercancel', up);
  }

  let _hc = null;
  function hitCtx(){ if (!_hc) _hc = document.createElement('canvas').getContext('2d'); return _hc; }

  function drop(G, pc, countEl){
    const S = G.S, P = G.P;
    const tx = G.B.x + pc.p.x * S, ty = G.B.y + pc.p.y * S;
    const tol = Math.max(0.18 * Math.max(P.pw, P.ph) * S, 14);
    if (Math.hypot(pc.x - tx, pc.y - ty) <= tol){
      pc.placed = true; place(G, pc);
      G.placed++;
      countEl.textContent = G.placed + '/' + P.pieces.length;
      pc.cv.classList.remove('snap'); void pc.cv.offsetWidth; pc.cv.classList.add('snap', 'placed');
      try { ctx.sound('tile'); } catch(e){}
      if (G.placed === P.pieces.length) complete(G);
      return;
    }
    const pw = P.pw * S, ph = P.ph * S, cx = pc.x + pw / 2, cy = pc.y + ph / 2;
    if (cx >= G.B.x && cx <= G.B.x + G.B.w && cy >= G.B.y && cy <= G.B.y + G.B.h){
      pc.zone = 'board'; pc.u = (pc.x - G.B.x) / G.B.w; pc.v = (pc.y - G.B.y) / G.B.h;
    } else {
      pc.zone = 'tray';
      pc.u = G.T.w > pw ? (pc.x - G.T.x) / (G.T.w - pw) : 0; pc.v = G.T.h > ph ? (pc.y - G.T.y) / (G.T.h - ph) : 0;
    }
  }

  function complete(G){
    G.done = true;
    const ms = performance.now() - G.t0, secs = Math.max(1, Math.round(ms / 1000));
    wrap.querySelector('.yapboz-time').textContent = fmtTime(secs);
    G.board.classList.add('done');
    try { ctx.sound('win'); } catch(e){}
    try { if (!ctx.reducedMotion) confetti(G.area); } catch(e){}
    const msg = G.im.custom ? `Tamamlandı! ${fmtTime(secs)} — kendi fotoğrafın olduğu için tabloya yazılmadı.` : `Tamamlandı! ${fmtTime(secs)}`;
    const n = wrap.querySelector('.yapboz-note'); if (n) n.textContent = msg;
    setTimeout(() => {
      if (destroyed) return;
      ctx.finish({ score: secs, ranked: !G.im.custom, detail: { pieces: G.P.pieces.length, image: G.im.id, ms: Math.round(ms) } });
    }, ctx.reducedMotion ? 200 : 1300);
  }

  chooser();
  return { destroy(){ destroyed = true; clearGame(); wrap.remove(); } };
}

const def = {
  id: 'yapboz', name: 'Resimli Yapboz', icon: '🧩',
  desc: 'Parçaları sürükle, resmi tamamla. En hızlı bitiren kazanır.',
  levels: [{ id: 'kolay', name: 'Kolay (9)' }, { id: 'orta', name: 'Orta (16)' }, { id: 'zor', name: 'Zor (36)' }],
  daily: false, better: 'low', format: s => fmtTime(s), mount
};
if (typeof registerSolo === 'function') registerSolo(def);
else (window.SOLO_PENDING = window.SOLO_PENDING || []).push(def);
})();
