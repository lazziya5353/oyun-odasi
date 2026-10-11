// Netlify her yayında bunu çalıştırır: "replikler" klasöründeki videoları bulup replikler/liste.json yazar.
// Dosya adı = replik adı ("Ben bu filmi görmüştüm.mp4" → "Ben bu filmi görmüştüm").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'replikler');
const VIDEO = /\.(mp4|webm|m4v|mov)$/i;
const MAX = 40 * 1024 * 1024;

fs.mkdirSync(dir, { recursive: true });
const list = fs.readdirSync(dir)
  .filter(f => VIDEO.test(f) && !f.startsWith('.'))
  .map(f => {
    const st = fs.statSync(path.join(dir, f));
    return { dosya: f.normalize('NFC'), ad: f.normalize('NFC').replace(VIDEO, '').replace(/[_]+/g, ' ').trim(), boyut: st.size, ts: Math.round(st.mtimeMs) };
  })
  .filter(x => x.boyut > 0 && x.boyut <= MAX)
  .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
// macOS'tan yüklenen adlar farklı biçimde (NFD) olabilir: gerçek dosya adını koru
for (const x of list){ const real = fs.readdirSync(dir).find(f => f.normalize('NFC') === x.dosya); if (real) x.dosya = real; }
fs.writeFileSync(path.join(dir, 'liste.json'), JSON.stringify({ guncel: Date.now(), klipler: list }, null, 1));
console.log('replikler: ' + list.length + ' klip listelendi');
