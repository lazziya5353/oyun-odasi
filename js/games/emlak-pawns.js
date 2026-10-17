// Emlak Oyunu: Türkiye temalı piyonlar (simit, vapur, martı, çay bardağı, kedi, balık) ve ev/otel çizimleri.
// Hepsi gölgelendirilmiş (degrade + parlama) SVG; tahtada dik durur, altında oyuncunun renginde taban vardır.
const EmPawns = (function(){
  const NAMES = ['Simit', 'Vapur', 'Martı', 'Çay bardağı', 'Kedi', 'Balık'];
  const ICON = ['🥯', '⛴️', '🕊️', '🍵', '🐱', '🐟'];
  // oyuncu renkleri: [ana, koyu, açık]
  const COL = [
    ['#2ec4b6', '#12877c', '#8ff3e8'],
    ['#ff6b6b', '#b73434', '#ffb0b0'],
    ['#ffbe0b', '#b98500', '#ffe48a'],
    ['#9b5de5', '#6130a3', '#cfaaf7'],
    ['#4d9bff', '#1f5db3', '#a9cfff'],
    ['#ff8fd0', '#bb4a8f', '#ffd1ec']
  ];
  const lg = (id, stops, x2 = 0, y2 = 1) => '<linearGradient id="emg-' + id + '" x1="0" y1="0" x2="' + x2 + '" y2="' + y2 + '">' +
    stops.map(s => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] !== undefined ? ' stop-opacity="' + s[2] + '"' : '') + '/>').join('') + '</linearGradient>';
  const rg = (id, stops, cx = 0.35, cy = 0.3, r = 0.8) => '<radialGradient id="emg-' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '">' +
    stops.map(s => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] !== undefined ? ' stop-opacity="' + s[2] + '"' : '') + '/>').join('') + '</radialGradient>';
  const DEFS =
    lg('gold', [[0, '#fbd27a'], [0.45, '#e39a31'], [1, '#9a5a12']]) +
    lg('goldD', [[0, '#b9701c'], [1, '#6e3b09']]) +
    lg('hullB', [[0, '#3b5a8c'], [1, '#101d38']]) +
    lg('white', [[0, '#ffffff'], [1, '#c9d1dc']]) +
    lg('whiteH', [[0, '#ffffff'], [0.6, '#eef2f7'], [1, '#b8c2d0']], 1, 0) +
    lg('red', [[0, '#ff7560'], [1, '#a91812']]) +
    lg('yel', [[0, '#ffe36b'], [1, '#d99b00']], 1, 0) +
    lg('glass', [[0, '#ffffff', 0.7], [0.5, '#dff4ff', 0.18], [1, '#ffffff', 0.45]], 1, 0) +
    lg('tea', [[0, '#e0702a'], [0.5, '#a8390f'], [1, '#5a1804']]) +
    lg('cat', [[0, '#f9b25d'], [1, '#c3600f']]) +
    lg('catD', [[0, '#e48a2d'], [1, '#9c4708']], 1, 0) +
    lg('fish', [[0, '#3f6a88'], [0.38, '#93b9d2'], [0.7, '#e8f3fa'], [1, '#c3d6e3']]) +
    lg('gull', [[0, '#ffffff'], [1, '#c8d0da']]) +
    lg('grey', [[0, '#a3adb8'], [1, '#5c6672']]) +
    lg('saucer', [[0, '#ffffff'], [1, '#c9ced6']]) +
    lg('roof', [[0, '#e0503f'], [1, '#8d1e14']]) +
    lg('wall', [[0, '#fff3d2'], [1, '#dcc791']], 1, 0) +
    lg('wallD', [[0, '#cdb67d'], [1, '#9c8650']], 1, 0) +
    lg('hotel', [[0, '#f5f1e6'], [1, '#b9b09a']], 1, 0) +
    lg('hotelD', [[0, '#a89f88'], [1, '#6f6857']], 1, 0) +
    lg('wave', [[0, '#bfe7ff'], [1, '#2f86c9']]) +
    rg('hi', [[0, '#ffffff', 0.8], [1, '#ffffff', 0]], 0.3, 0.25, 0.6);

  function ensureDefs(){
    if (document.getElementById('emDefs')) return;
    const d = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    d.id = 'emDefs'; d.setAttribute('width', '0'); d.setAttribute('height', '0'); d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML = '<defs>' + DEFS + '</defs>';
    document.body.append(d);
  }
  const U = id => 'url(#emg-' + id + ')';
  const base = '<ellipse cx="40" cy="91" rx="30" ry="8" fill="#000" opacity=".28"/>' +
    '<ellipse cx="40" cy="88" rx="27" ry="8.5" style="fill:var(--pcd)"/>' +
    '<ellipse cx="40" cy="85.5" rx="27" ry="8.5" style="fill:var(--pc)"/>' +
    '<ellipse cx="40" cy="84.5" rx="21" ry="5.6" style="fill:var(--pcl)" opacity=".55"/>';

  const PAWN = [
    // 0 SİMİT
    () => base +
      '<path d="M9 52a31 35 0 1 0 62 0a31 35 0 1 0-62 0Zm19 0a12 15 0 1 0 24 0a12 15 0 1 0-24 0Z" fill-rule="evenodd" transform="translate(0 4)" fill="' + U('goldD') + '"/>' +
      '<path d="M9 52a31 35 0 1 0 62 0a31 35 0 1 0-62 0Zm19 0a12 15 0 1 0 24 0a12 15 0 1 0-24 0Z" fill-rule="evenodd" fill="' + U('gold') + '"/>' +
      '<path d="M16 38c6-14 26-21 40-12" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>' +
      '<g fill="#fff6dc" stroke="#c88a2e" stroke-width=".4">' +
      [[16, 40, 30], [22, 28, -20], [33, 20, 10], [47, 19, -35], [58, 27, 20], [65, 40, -10], [66, 56, 35], [58, 69, -25], [45, 76, 5], [32, 76, 30], [20, 68, -15], [13, 54, 20], [24, 36, 0], [56, 37, 15], [57, 58, -30], [26, 64, 40]]
        .map(p => '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="2.1" ry="1.1" transform="rotate(' + p[2] + ' ' + p[0] + ' ' + p[1] + ')"/>').join('') + '</g>' +
      '<ellipse cx="40" cy="52" rx="10.5" ry="14" fill="#000" opacity=".18"/>',
    // 1 VAPUR
    () => base +
      '<path d="M5 72h70l-8 13q-27 6-54 0Z" fill="' + U('hullB') + '"/>' +
      '<path d="M5 66h70l.6 6H4.4Z" fill="' + U('white') + '"/>' +
      '<path d="M9.5 82.5q30.5 5.5 61 0l-.8 2.4q-29.4 5-59.4 0Z" fill="' + U('red') + '"/>' +
      '<rect x="14" y="53" width="52" height="13" rx="2.5" fill="' + U('white') + '"/>' +
      '<g fill="#27456f">' + [0, 1, 2, 3, 4, 5, 6, 7].map(i => '<rect x="' + (17.5 + i * 6) + '" y="57" width="3.8" height="4.6" rx=".8"/>').join('') + '</g>' +
      '<rect x="24" y="42" width="32" height="11" rx="2.5" fill="' + U('white') + '"/>' +
      '<g fill="#27456f">' + [0, 1, 2, 3, 4].map(i => '<rect x="' + (27 + i * 5.6) + '" y="45.6" width="3.6" height="4" rx=".8"/>').join('') + '</g>' +
      '<rect x="32" y="34" width="16" height="8" rx="2" fill="' + U('white') + '"/><rect x="34" y="36" width="12" height="3.4" rx="1" fill="#27456f"/>' +
      '<rect x="36" y="16" width="9" height="19" rx="1.5" fill="' + U('yel') + '"/><rect x="36" y="16" width="9" height="5" rx="1.5" fill="#1b1b1f"/><rect x="36" y="25" width="9" height="3" fill="#d7261e"/>' +
      '<g fill="#e8edf3" opacity=".6"><circle cx="41" cy="10" r="4.4"/><circle cx="47" cy="5" r="3.4" opacity=".7"/><circle cx="52" cy="1.5" r="2.6" opacity=".5"/></g>' +
      '<path d="M5 72h70" stroke="#fff" stroke-opacity=".4"/>' +
      '<path d="M7 87q8-3 16 0t16 0 16 0 16 0" fill="none" stroke="' + U('wave') + '" stroke-width="2.4" stroke-linecap="round"/>',
    // 2 MARTI
    () => base +
      '<g stroke="#e8761a" stroke-width="2.8" stroke-linecap="round" fill="none"><path d="M35 70l-1 14"/><path d="M45 70l2 14"/></g>' +
      '<g stroke="#e8761a" stroke-width="2.2" stroke-linecap="round"><path d="M34 84l-6 1.5M34 84l5 1.5M47 84l-5 1.5M47 84l6 1.5"/></g>' +
      '<path d="M22 56L2 49l1 7-4 6 22 2Z" fill="' + U('grey') + '" transform="translate(5 1)"/>' +
      '<ellipse cx="39" cy="58" rx="22" ry="15" fill="' + U('gull') + '"/>' +
      '<path d="M24 52Q44 38 66 52Q50 64 26 61Z" fill="' + U('grey') + '"/>' +
      '<path d="M24 52Q44 38 66 52" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/>' +
      '<path d="M14 58l-8 4 10 1Z" fill="#20252c"/>' +
      '<circle cx="59" cy="36" r="11" fill="' + U('gull') + '"/>' +
      '<path d="M50 44q2 8 8 12l-7-1q-4-5-1-11Z" fill="url(#emg-gull)"/>' +
      '<path d="M66 33l12 4-12 5Z" fill="#ffc933"/><path d="M66 33l12 4-12 5Z" fill="none" stroke="#c98b00" stroke-width=".6"/><circle cx="73" cy="38" r="1.3" fill="#e03a2c"/>' +
      '<circle cx="62" cy="33.5" r="2.2" fill="#1b1b1f"/><circle cx="62.7" cy="32.8" r=".8" fill="#fff"/>' +
      '<ellipse cx="55" cy="30" rx="6" ry="3.4" fill="url(#emg-hi)"/>',
    // 3 ÇAY BARDAĞI
    () => '<ellipse cx="40" cy="91" rx="32" ry="8" fill="#000" opacity=".28"/>' +
      '<ellipse cx="40" cy="88" rx="30" ry="8.8" style="fill:var(--pcd)"/><ellipse cx="40" cy="85.5" rx="30" ry="8.8" style="fill:var(--pc)"/>' +
      '<ellipse cx="40" cy="82" rx="26" ry="7" fill="' + U('saucer') + '"/><ellipse cx="40" cy="81.5" rx="26" ry="7" fill="none" stroke="#b3261e" stroke-width="1.6"/>' +
      '<ellipse cx="40" cy="81" rx="15" ry="3.8" fill="#dfe3ea"/>' +
      '<g opacity=".55" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M34 22q-5-6 0-11t0-9"/><path d="M45 20q5-6 0-11t0-8"/></g>' +
      '<path d="M26 30C25 46 36 48 34 60C33 68 29 72 31 78L49 78C51 72 47 68 46 60C44 48 55 46 54 30Z" fill="' + U('glass') + '" stroke="#cfe8f5" stroke-width="1"/>' +
      '<path d="M26.8 42C27 46 36 48 34 60C33 66 31 70 31.6 75L48.4 75C49 70 47 66 46 60C44 48 53 46 53.2 42Z" fill="' + U('tea') + '"/>' +
      '<ellipse cx="40" cy="42" rx="13.4" ry="3" fill="#f08a38"/><ellipse cx="40" cy="30" rx="14" ry="3.2" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.2"/>' +
      '<path d="M30 33C29.6 44 37 47 36 60" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M52 24l12-14" stroke="#cfd6df" stroke-width="2" stroke-linecap="round"/><ellipse cx="65" cy="9" rx="3" ry="1.7" transform="rotate(-48 65 9)" fill="#e3e8ee"/>',
    // 4 KEDİ
    () => base +
      '<path d="M56 82c18 1 22-14 15-27" fill="none" stroke="' + U('catD') + '" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M56 82c18 1 22-14 15-27" fill="none" stroke="#8a3f08" stroke-width="1.3" stroke-dasharray="3 5" stroke-linecap="round" opacity=".6"/>' +
      '<ellipse cx="40" cy="66" rx="19" ry="22" fill="' + U('cat') + '"/>' +
      '<ellipse cx="40" cy="72" rx="10" ry="15" fill="#fff4e4"/>' +
      '<g fill="#fff4e4" stroke="#d9b98a" stroke-width=".6"><ellipse cx="32" cy="85" rx="6.4" ry="4.2"/><ellipse cx="48" cy="85" rx="6.4" ry="4.2"/></g>' +
      '<path d="M26 30L28 10L41 22Z" fill="' + U('cat') + '"/><path d="M54 30L52 10L39 22Z" fill="' + U('cat') + '"/>' +
      '<path d="M29 25l.8-9.5 6 5Z" fill="#f4a3a3"/><path d="M51 25l-.8-9.5-6 5Z" fill="#f4a3a3"/>' +
      '<circle cx="40" cy="38" r="16.5" fill="' + U('cat') + '"/>' +
      '<g stroke="#9c4708" stroke-width="2" stroke-linecap="round"><path d="M40 23v7"/><path d="M33 24.5l2 5.5"/><path d="M47 24.5l-2 5.5"/></g>' +
      '<ellipse cx="40" cy="45" rx="8.4" ry="6" fill="#fff4e4"/>' +
      '<g><ellipse cx="33.5" cy="37" rx="3.6" ry="4.2" fill="#9be07a"/><ellipse cx="46.5" cy="37" rx="3.6" ry="4.2" fill="#9be07a"/>' +
      '<ellipse cx="33.5" cy="37" rx="1.2" ry="3.6" fill="#13200d"/><ellipse cx="46.5" cy="37" rx="1.2" ry="3.6" fill="#13200d"/>' +
      '<circle cx="34.6" cy="35.4" r="1" fill="#fff"/><circle cx="47.6" cy="35.4" r="1" fill="#fff"/></g>' +
      '<path d="M37.6 43.4h4.8l-2.4 3Z" fill="#f08b9b"/><path d="M40 46.4v2M40 48.4q-3 2.6-5.4 .6M40 48.4q3 2.6 5.4 .6" fill="none" stroke="#7a3b10" stroke-width=".9" stroke-linecap="round"/>' +
      '<g stroke="#fff" stroke-opacity=".85" stroke-width=".8" stroke-linecap="round"><path d="M32 45l-11-2.4M32 47l-10 2.4M48 45l11-2.4M48 47l10 2.4"/></g>' +
      '<ellipse cx="33" cy="30" rx="6" ry="3.4" fill="url(#emg-hi)"/>',
    // 5 BALIK
    () => '<ellipse cx="40" cy="91" rx="30" ry="8" fill="#000" opacity=".28"/>' +
      '<ellipse cx="40" cy="88" rx="27" ry="8.5" style="fill:var(--pcd)"/><ellipse cx="40" cy="85.5" rx="27" ry="8.5" style="fill:var(--pc)"/>' +
      '<path d="M16 84q6-9 12-2t12-3 12 3 12-3 8 4q-6 8-24 8T16 84Z" fill="' + U('wave') + '" opacity=".95"/>' +
      '<path d="M18 82q6-4 11 0M46 79q6-4 11 0" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>' +
      '<g transform="rotate(-24 40 54)">' +
      '<path d="M62 54L77 39q2 4 1 8l-3 7 3 7q2 5-1 8Z" fill="#456f8c"/>' +
      '<path d="M26 36q12-14 28-4l-6 8Z" fill="#35607d"/>' +
      '<path d="M34 70q8 10 16 4l-4-10Z" fill="#6c97b3"/>' +
      '<path d="M8 54C14 36 40 28 62 46Q66 54 62 62C40 80 14 74 8 54Z" fill="' + U('fish') + '"/>' +
      '<path d="M10 50C18 38 40 34 60 47" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>' +
      '<path d="M22 44q6 10 0 20M30 42q6 12 0 24" fill="none" stroke="#6d94ad" stroke-width="1.3" opacity=".7"/>' +
      '<g fill="none" stroke="#7aa2bb" stroke-width=".9" opacity=".8">' +
      [[38, 52], [46, 56], [38, 62], [46, 48], [52, 58], [31, 57]].map(p => '<path d="M' + p[0] + ' ' + p[1] + 'q4 3 0 6"/>').join('') + '</g>' +
      '<circle cx="19" cy="52" r="4.2" fill="#fff"/><circle cx="18.4" cy="52" r="2.5" fill="#12212d"/><circle cx="17.6" cy="51" r=".9" fill="#fff"/>' +
      '<path d="M26 47q-4 8 0 16" fill="none" stroke="#4d7690" stroke-width="1.6"/></g>'
  ];

  function pawn(k){
    return '<svg viewBox="0 0 80 100" class="em-pawn-svg" aria-hidden="true">' + PAWN[k]() + '</svg>';
  }
  function colorVars(k){
    const c = COL[k];
    return '--pc:' + c[0] + ';--pcd:' + c[1] + ';--pcl:' + c[2];
  }
  // ev ve otel (30x34 / 44x54)
  function house(){
    return '<svg viewBox="0 0 34 36" class="em-bld-svg" aria-hidden="true">' +
      '<ellipse cx="17" cy="33" rx="14" ry="3" fill="#000" opacity=".3"/>' +
      '<path d="M5 17h15v16H5Z" fill="' + U('wall') + '"/><path d="M20 17h10v16H20Z" fill="' + U('wallD') + '"/>' +
      '<path d="M2 18L12.5 5L23 18Z" fill="' + U('roof') + '"/><path d="M23 18L12.5 5L21 4l11 12Z" fill="#7e1a10"/>' +
      '<rect x="9.5" y="23" width="6" height="10" rx="1" fill="#6d4423"/><rect x="21.5" y="22" width="5" height="5" fill="#5aa4d6"/>' +
      '<path d="M2 18L12.5 5" stroke="#fff" stroke-opacity=".4"/></svg>';
  }
  function hotel(){
    return '<svg viewBox="0 0 46 56" class="em-bld-svg hotel" aria-hidden="true">' +
      '<ellipse cx="23" cy="53" rx="20" ry="3.6" fill="#000" opacity=".32"/>' +
      '<path d="M4 16h24v37H4Z" fill="' + U('hotel') + '"/><path d="M28 16h14v37H28Z" fill="' + U('hotelD') + '"/>' +
      '<path d="M2 17L16 6l14 11Z" fill="' + U('roof') + '"/><path d="M30 17L16 6h12l14 11Z" fill="#7e1a10"/>' +
      '<g fill="#5aa4d6">' + [0, 1, 2].map(r => [0, 1, 2].map(c => '<rect x="' + (7 + c * 7) + '" y="' + (20 + r * 9) + '" width="4.4" height="5.6" rx=".6"/>').join('')).join('') + '</g>' +
      '<g fill="#3d78a3" opacity=".8">' + [0, 1, 2].map(r => '<rect x="' + 31 + '" y="' + (20 + r * 9) + '" width="8" height="5.6" rx=".6"/>').join('') + '</g>' +
      '<rect x="12" y="44" width="8" height="9" rx="1" fill="#6d4423"/>' +
      '<rect x="12.5" y="9.5" width="7" height="4.2" rx="1" fill="#ffd23f"/><text x="16" y="13" font-size="3" font-weight="700" text-anchor="middle" fill="#7e1a10" font-family="sans-serif">OTEL</text></svg>';
  }
  return { NAMES, ICON, COL, ensureDefs, pawn, colorVars, house, hotel };
})();
