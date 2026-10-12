// Netlify her yayında bunu çalıştırır: "duvar-kagitlari" klasöründeki videoları bulup duvar-liste.json yazar (site kökünde; önbelleğe alınmaz).
// Her alt klasör bir kategoridir ("duvar-kagitlari/Manzara/Göl.mp4" → Görünüm'de "🎬 Manzara" altında "Göl").
// Videoyla aynı adlı bir resim varsa (Göl.jpg) önizleme olarak o kullanılır; yoksa videodan bir kare alınır.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'duvar-kagitlari');
const VIDEO = /\.(mp4|webm|m4v|mov)$/i, RESIM = /\.(jpe?g|png|webp)$/i;
const MAX = 100 * 1024 * 1024;
const nfc = s => s.normalize('NFC');
const adYap = f => nfc(f).replace(VIDEO, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();

function klasor(rel){
  const abs = path.join(dir, rel), dosyalar = fs.readdirSync(abs).filter(f => !f.startsWith('.'));
  const resimler = dosyalar.filter(f => RESIM.test(f));
  return dosyalar.filter(f => VIDEO.test(f)).map(f => {
    const st = fs.statSync(path.join(abs, f));
    if (!st.isFile() || st.size <= 0 || st.size > MAX) return null;
    const kok = nfc(f).replace(VIDEO, '');
    const poster = resimler.find(r => nfc(r).replace(RESIM, '') === kok);
    return { dosya: (rel ? rel + '/' : '') + f, ad: adYap(f), boyut: st.size, poster: poster ? (rel ? rel + '/' : '') + poster : null };
  }).filter(Boolean).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

fs.mkdirSync(dir, { recursive: true });
const kategoriler = [];
for (const f of fs.readdirSync(dir).sort((a, b) => nfc(a).localeCompare(nfc(b), 'tr'))){
  if (f.startsWith('.') || !fs.statSync(path.join(dir, f)).isDirectory()) continue;
  const videolar = klasor(f);
  if (videolar.length) kategoriler.push({ ad: nfc(f).replace(/[_]+/g, ' ').trim(), videolar });
}
const kok = klasor('');                  // alt klasöre konmamış videolar
if (kok.length) kategoriler.push({ ad: 'Diğer', videolar: kok });
fs.writeFileSync(path.join(root, 'duvar-liste.json'), JSON.stringify({ guncel: Date.now(), kategoriler }, null, 1));
console.log('duvar kağıtları: ' + kategoriler.reduce((n, k) => n + k.videolar.length, 0) + ' video, ' + kategoriler.length + ' kategori');
