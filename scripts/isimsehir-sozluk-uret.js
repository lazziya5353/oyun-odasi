// İsim-Şehir sözlüğünü üretir: node scripts/isimsehir-sozluk-uret.js <klasör> js/games/isimsehir-sozluk.js
// <klasör> içinde: kaynak/ (= scripts/isimsehir-kaynak) ve node_modules (npm i turkey-neighbourhoods i18n-iso-countries all-the-cities --ignore-scripts)
const fs = require('fs'), path = require('path');
const D = process.argv[2], OUT = process.argv[3];
const req = p => require(path.join(D, 'node_modules', p));
const oku = f => fs.readFileSync(path.join(D, 'kaynak', f), 'utf8').split(/[,\n]/).map(x => x.trim()).filter(Boolean);
const fold = t => String(t).toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const cikar = {
  isim: ['Bü&#x015F;ra', 'Âşık', 'Atlas'],
  hayvan: ['Anchovy', 'Akrebe', 'Bayağı', 'Börtü', 'Bonfile', 'Dişi', 'Hayvan', 'Minik', 'Kurbağalı', 'Pullu', 'Tüylü', 'Kanatlı', 'Rakkas', 'Şarlman', 'Isı böceği', 'Isırgan böceği', 'Hindiba böceği', 'Foseptik böceği', 'Musluk böceği', 'Eğrelti böceği', 'Manyak kuşu', 'Çökelek böceği', 'Supangle balığı', 'Dalkavuk balığı', 'Hırsız kuşu', 'Gurbet kuşu', 'Ökse kuşu', 'Hokkabaz balığı', 'Çuha çiçeği böceği', 'Fırfır kuşu', 'Ekin böceği', 'Fasulye böceği', 'Fırça kuyruklu sıçan', 'Gergedan kuşu', 'Isırgan', 'Göl balığı', 'Golden', 'Sakız kuşu', 'Uzun kulak', 'Musluk', 'Yengeç örümceği', 'Porsuk balığı', 'Çin aslanı', 'Çayır kuşu', 'Çiftlik faresi', 'Pasifik ahtapotu', 'Domuz balığı', 'Diken balığı', 'Nar bülbülü', 'Nil faresi', 'Gergedan böceği', 'Kılkuyruk', 'Sarı kanarya', 'Sarıyakalı', 'Zıpzıp', 'Zehirli örümcek', 'Bıyıklı balina', 'Cüce timsah', 'Bedevi', 'Ördek balığı', 'Mısır kurdu', 'Üzüm kurdu', 'Uzun bacaklı örümcek', 'Lenger balığı', 'Nemo', 'Moli', 'Hint bülbülü', 'Cin balığı', 'Kalkan', 'Toy', 'Tüylü', 'Akkuyruk', 'Sarıkuyruk', 'Sarıcık', 'İsfendiyar', 'Mantis', 'Marsupial', 'Kum faresi', 'Kayın böceği', 'Fil foku', 'Fener balığı', 'Bakteri', 'Amip'],
  bitki: ['Amber çiçeği', 'Arnavut biberi', 'Ağaç çileği', 'Ağaç kavunu', 'Ağaç kabuğu', 'Bostan', 'Bodur ağaç', 'Ballık', 'Barut ağacı', 'Boylu', 'Ceylan çiçeği', 'Cam güzeli', 'Cezayir menekşesi', 'Dikotiledon', 'Dağ çayı', 'Dağ elması', 'Dağ lalesi', 'Eksik otu', 'Ejder ağacı', 'Ebucehil karpuzu', 'Fil kulağı', 'Fırça çiçeği', 'Fırfır çiçeği', 'Gümüş ağacı', 'Gün çiçeği', 'Gülkurusu', 'Hasır otu', 'İspinoz otu', 'İğne yapraklı', 'İpek ağacı', 'İsfendan', 'İstiridye mantarı', 'Koca karı', 'Kudret narı', 'Kuru üzüm', 'Lavta', 'Mevlana çiçeği', 'Nakış çiçeği', 'Oduncu', 'Ostrich', 'Ölmez çiçek', 'Pembe gül', 'Pişik otu', 'Perçem', 'Rengarenk', 'Rüzgar gülü', 'Ridens', 'Sarı çiçek', 'Şeytan elması', 'Şemsiye ağacı', 'Şebnem', 'Tavşan kulağı', 'Tespih ağacı', 'Turpgiller', 'Tropik meyve', 'Tavşancıl', 'Tarla', 'Üçgen', 'Yaprak', 'Yer fesleğeni', 'Yılan yastığı', 'Zühre çiçeği', 'Yıldız çiçeği', 'Yabani ot', 'Ot', 'Çiçek', 'Ağaç', 'Fidan', 'Çöpleme', 'Çördük', 'Dağ kekiği', 'Kır menekşesi', 'Mor menekşe', 'Piyan', 'Itır', 'Ilgın ağacı', 'Ayva çiçeği', 'Atatürk çiçeği', 'Gül ağacı', 'Gelin çiçeği', 'Kır çiçeği', 'Saz', 'Kekre', 'Kuzu göbeği', 'Narenciye', 'Nergiz', 'Leblebi', 'Palamut', 'Pelit', 'Mısır püskülü', 'Dağ mersini', 'Boğa dikeni', 'Bayır turpu', 'Kurt baklası', 'Yemlik'],
  esya: ['Ançüez', 'Ançuva', 'Anfi', 'Bastón', 'Benzinlik', 'Bomba', 'Çizgi film', 'Cıvık', 'Doğum günü pastası', 'Dövme', 'Ensiz', 'Ekspres', 'Ezan saati', 'Haşhaş kutusu', 'İz', 'İmleç', 'İstif', 'İstiridye kabuğu', 'Nalbur', 'Nişasta kabı', 'Ödünç kitap', 'Sergi', 'Sucuk', 'Tarama', 'Türbe', 'Ufak', 'Üçayak', 'Sazlık', 'Sim', 'Bezelik', 'Biley taşı', 'Fondip', 'Gübre', 'Hamaliye', 'Mataraca', 'Ojecik', 'Oltalık', 'Şişlik', 'Zeytinlik', 'Tahtakurusu', 'Yeleklik', 'Kemerlik', 'Eldivenlik', 'Ceketlik', 'Pul biberlik', 'Sarı kalem', 'Mozaik', 'Lavman', 'Hap kutusu', 'Tuz', 'Taş', 'Tahta', 'Tel', 'Takı', 'Kalas', 'Kese', 'Ufak', 'Minare saati', 'Cumba', 'Çatı', 'Çit', 'Baca', 'Benzinlik', 'Vakum', 'Pastel', 'Aspirin', 'Nüfus cüzdanı', 'Çubuk', 'Jelatin', 'Sünnet yatağı'],
  meslek: ['Pastörize', 'Pervazcı', 'Ezgici', 'Islahçı', 'Örücü', 'Muhasip', 'Ferman yazıcısı', 'Bant tekniği', 'Burun estetikçisi', 'Ölçümcü', 'Uygulamacı', 'Önder', 'Örgütçü', 'Kumarbaz', 'Forvet', 'Köylü', 'Ahçı', 'Gezgin', 'Emekçi', 'Isıtma teknisyeni', 'Işıkçı', 'Dizgici', 'Kılavuz', 'Patron', 'Atlet', 'Uzman', 'Usta', 'Dövüşçü', 'Kemik doktoru', 'Muhafız', 'Kulüp başkanı', 'Üretici', 'Nöbetçi', 'Fıstıkçı', 'Doğa bilimci', 'Başhemşire', 'Okutman', 'Topçu', 'Cevherci', 'Gondolcu', 'Lobici', 'Ölçümcü', 'Hayvancı', 'Kurabiyeci', 'Bilet satıcısı'],
  yemek: ['Bol köpüklü kahve', 'Alaturka', 'Kırıntı', 'Kofte', 'Ufak köfte', 'Öküz gözü', 'Öğle yemeği', 'Kahvaltı', 'Mangal', 'Malaga', 'Japon sushi', 'Işkembe', 'Kırma', 'Kavun', 'Germe', 'Pastel', 'Gül tatlısı', 'Sambusek', 'Hamur işi', 'Tatlı', 'Tava', 'Çorba', 'Salata', 'Bıldırcın', 'Kızartma', 'Simit tatlısı', 'Nar ekşili salata', 'Bostana', 'Fırın kebabı', 'Yer elması yemeği', 'Incir tatlısı', 'Çarşı pide', 'Fesleğenli makarna', 'Fındıklı çikolata']
};
// yine de kalsın istenen tek kelimelik genel yemekler: Balık ekmek, Kebap gibi çoğulları ayrı tutuyoruz; "Çorba", "Salata", "Tatlı" gibi genel adlar sayılmaz.
const DUNYA_CIKAR = ['Azerbaycan', 'Atlantik', 'Kapadokya', 'Kosova', 'Kanarya', 'Kırım', 'Girit', 'Rodos', 'Midilli', 'Sakız', 'Kos', 'İstanköy', 'Patmos', 'Bali', 'Ibiza', 'Mallorca', 'Zanzibar', 'Petra', 'Tunus', 'Panama', 'Kuveyt', 'Singapur', 'Lüksemburg', 'Monako', 'Cezayir', 'Meksiko', 'Kartaca', 'Kandiye', 'Lefke', 'İskele', 'Mağusa'];

const sonuc = {};
const ekle = (kat, liste, haric) => {
  const h = new Set((haric || []).map(fold));
  const m = sonuc[kat] || (sonuc[kat] = new Map());
  liste.forEach(w => {
    w = w.replace(/\s+/g, ' ').trim();
    if (!w || /[&;#]/.test(w) || w.length < 2) return;
    const f = fold(w); if (f.length < 2 || h.has(f)) return;
    if (!m.has(f)) m.set(f, w);
  });
};
['isim', 'hayvan', 'bitki', 'esya', 'meslek', 'yemek'].forEach(k => ekle(k, oku(k + '.txt'), cikar[k]));

// Şehir: 81 il ve tüm ilçeler (turkey-neighbourhoods, MIT), dünya şehirleri (Türkçe adlarıyla elle + all-the-cities/GeoNames nüfusu 100 bin üstü, MIT)
const tn = req('turkey-neighbourhoods/dist/index.cjs');
const iller = tn.getCityNames();
const ilceler = Object.values(tn.getDistrictsOfEachCity()).flat().filter(x => !/^merkez$/i.test(x));
ekle('sehir', iller); ekle('sehir', ilceler);
ekle('sehir', oku('sehir_dunya.txt'), DUNYA_CIKAR);
const cities = req('all-the-cities');
const ulkeKod = new Set();
ekle('sehir', cities.filter(c => c.population >= 100000).map(c => c.name.replace(/ City$/, '').replace(/^City of /, '')));

// Ülke: i18n-iso-countries Türkçe adları (MIT); ada/toprak gibi bağımlı bölgeler hariç + yaygın kısa adlar
const ic = req('i18n-iso-countries'); ic.registerLocale(req('i18n-iso-countries/langs/tr.json'));
const adlar = Object.values(ic.getNames('tr', { select: 'all' })).flat().filter(x => !/Ada(sı|ları)|Toprakları|ÖYB|Bölgeleri|Karayip|Kesimi|Antarktika|Saint |Mayotte|Réunion|Guadalupe|Martinik|Montserrat|Guernsey|Jersey|Anguilla|Aruba|Bermuda|Curaçao|Sint Maarten|Grönland|Cebelitarık|Batı Sahara|Fransız|Guam|Niue|Tokelau|Wallis|Pitcairn|Norfolk|Svalbard|Porto Riko|Yeni Kaledonya|Uzak/.test(x)).map(x => x.replace(/\s*\(.*\)/, '').replace(/ - .*/, ''));
ekle('ulke', adlar);
ekle('ulke', ['Amerika', 'ABD', 'Amerika Birleşik Devletleri', 'İngiltere', 'Birleşik Krallık', 'İskoçya', 'Galler', 'Kuzey İrlanda', 'Kuzey Kıbrıs', 'KKTC', 'Kuzey Kıbrıs Türk Cumhuriyeti', 'Kıbrıs', 'Güney Kıbrıs', 'Çekya', 'Çek Cumhuriyeti', 'Burma', 'Myanmar', 'Kongo', 'Demokratik Kongo', 'Zaire', 'Filistin', 'Makedonya', 'Belarus', 'Bosna', 'BAE', 'Arabistan', 'Seylan', 'Doğu Timor', 'Kosova', 'Vatikan', 'Tayvan', 'Kırım', 'Svaziland', 'Esvatini', 'Yeşil Burun Adaları', 'Fildişi', 'Holanda', 'Kamboçya', 'Laos', 'Cape Verde']);
ekle('ulke', ['Sovyetler Birliği', 'Yugoslavya', 'Osmanlı'], ['Sovyetler Birliği', 'Yugoslavya', 'Osmanlı']);

const say = {}; Object.keys(sonuc).forEach(k => say[k] = sonuc[k].size);
let js = '// İsim-Şehir sözlüğü (otomatik üretildi, elle düzenlemeyin; üretici: scripts/isimsehir-sozluk-uret.js)\n' +
  '// Şehir: 81 il ve ilçeler (turkey-neighbourhoods, MIT), dünya şehirleri (Türkçe adlar elle + all-the-cities, MIT, kaynak GeoNames CC-BY 4.0, nüfus 100 bin üstü).\n' +
  '// Ülke: i18n-iso-countries Türkçe adları (MIT) + yaygın kısa adlar. İsim, hayvan, bitki, eşya, meslek, yemek: elle derlendi.\n' +
  '// Kelimeler "|" ile ayrılır; karşılaştırma Türkçe harf/aksan/boşluk sadeleştirilerek yapılır.\n' +
  'const ISIMSEHIR_SOZLUK = {\n' + Object.keys(sonuc).map(k => '  ' + k + ': ' + JSON.stringify([...sonuc[k].values()].join('|'))).join(',\n') + '\n};\n' +
  "if (typeof module !== 'undefined' && module.exports) module.exports = ISIMSEHIR_SOZLUK;\n";
fs.writeFileSync(OUT, js);
console.log(say, Math.round(js.length / 1024) + ' KB');
