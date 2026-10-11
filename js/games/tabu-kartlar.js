// Tabu kartları: "kelime: yasak1, yasak2, yasak3, yasak4, yasak5" (her satır bir kart).
// Anlatıcı kelimeyi, yasaklı kelimeleri (ve kelimenin kendisini) söylemeden anlatır.
const TABU_KARTLAR = `
# Ev ve eşyalar
buzdolabı: soğuk, mutfak, yiyecek, buz, beyaz eşya
çamaşır makinesi: yıkamak, kıyafet, deterjan, kirli, sıkma
ütü: kırışık, buharlı, gömlek, sıcak, masa
süpürge: toz, temizlik, halı, elektrik, çekmek
yastık: uyku, baş, yatak, yumuşak, kılıf
battaniye: örtmek, soğuk, yatak, yün, ısınmak
ayna: yansıma, bakmak, cam, yüz, banyo
perde: pencere, ışık, kumaş, kapatmak, tül
halı: yer, kilim, ev, desen, süpürge
merdiven: basamak, çıkmak, inmek, kat, asansör
asansör: kat, düğme, yukarı, bina, merdiven
kapı zili: çalmak, misafir, düğme, ses, kapı
anahtar: kilit, kapı, açmak, ev, anahtarlık
şemsiye: yağmur, ıslak, açmak, tutmak, kapalı
mum: ışık, ateş, elektrik, yanmak, doğum günü
çaydanlık: çay, demlik, su, kaynamak, ocak
tencere: yemek, kapak, pişirmek, ocak, tava
çatal: kaşık, bıçak, yemek, sivri, masa
makas: kesmek, kağıt, saç, iki, keskin
kumanda: televizyon, kanal, düğme, uzaktan, pil
priz: elektrik, fiş, duvar, takmak, çarpmak
ampul: ışık, lamba, elektrik, yanmak, tavan
saksı: çiçek, toprak, bitki, sulamak, pencere
vazo: çiçek, su, cam, masa, süs
takvim: gün, ay, yıl, tarih, duvar
çalar saat: uyanmak, sabah, zil, alarm, erken
cüzdan: para, kart, cep, deri, kimlik
bavul: tatil, yolculuk, eşya, valiz, tekerlek
termos: sıcak, çay, kahve, soğumak, şişe
gözlük: göz, görmek, cam, numara, takmak
diş fırçası: diş, macun, fırçalamak, sabah, ağız
havlu: kurulanmak, banyo, ıslak, plaj, pamuk
sabun: köpük, yıkamak, el, temiz, banyo
tarak: saç, taramak, diş, ayna, fırça
kanepe: oturmak, salon, koltuk, uzanmak, yumuşak
dolap: kıyafet, kapak, raf, mutfak, gardırop
çekmece: dolap, açmak, çekmek, masa, eşya
lamba: ışık, ampul, gece, açmak, abajur
mikrodalga: ısıtmak, fırın, dakika, yemek, düğme
blender: meyve, karıştırmak, mutfak, smoothie, motor
çöp kutusu: atmak, poşet, kirli, çöp, mutfak
kova: su, plaj, kum, taşımak, sap
mandal: çamaşır, asmak, ip, kuru, tutmak
posta kutusu: mektup, kapı, postacı, fatura, kutu
çit: bahçe, tahta, sınır, ev, boyamak

# Mutfak ve yemek
çay: demlik, bardak, şeker, kahvaltı, içmek
kahve: telve, fincan, türk, kafein, sabah
simit: susam, çay, halka, fırın, martı
börek: hamur, peynir, yufka, fırın, kıyma
menemen: yumurta, domates, biber, tava, kahvaltı
lahmacun: kıyma, ince, hamur, limon, maydanoz
mantı: yoğurt, hamur, kıyma, kayseri, küçük
baklava: şerbet, fıstık, tatlı, yufka, bayram
dondurma: soğuk, külah, yaz, kaymak, maraş
pizza: peynir, hamur, italya, dilim, sucuk
hamburger: köfte, ekmek, patates, fast food, marul
döner: et, dürüm, tavuk, ekmek, şiş
kebap: et, mangal, adana, şiş, acı
pilav: pirinç, tereyağı, tabak, bulgur, fasulye
çorba: kaşık, sıcak, mercimek, kase, içmek
salata: marul, domates, yeşil, zeytinyağı, sebze
yoğurt: süt, ayran, kase, mayalamak, beyaz
peynir: süt, beyaz, kaşar, kahvaltı, tost
zeytin: yeşil, siyah, kahvaltı, yağ, çekirdek
yumurta: tavuk, kabuk, sarı, haşlamak, omlet
bal: arı, tatlı, petek, kahvaltı, sarı
reçel: meyve, kahvaltı, kavanoz, tatlı, çilek
ekmek: fırın, un, dilim, somun, hamur
makarna: spagetti, sos, haşlamak, italya, erişte
patates kızartması: kızartma, ketçap, yağ, tuz, fast food
pasta: doğum günü, mum, krema, dilim, kek
çikolata: kakao, tatlı, sütlü, bitter, kahverengi
lokum: şeker, gül, kahve, tatlı, pudra
aşure: tatlı, buğday, muharrem, kase, dağıtmak
sütlaç: süt, pirinç, fırın, tatlı, tarçın
kokoreç: bağırsak, sokak, ekmek, kekik, gece
midye dolma: limon, pirinç, sokak, deniz, kabuk
ayran: yoğurt, su, köpük, tuz, içmek
limonata: limon, şeker, soğuk, yaz, ekşi
şalgam: acı, adana, mor, turşu, kebap
turşu: sirke, salatalık, kavanoz, ekşi, suyu
kumpir: patates, ortaköy, malzeme, tereyağı, kaşar
gözleme: hamur, sac, peynir, ıspanak, yufka
pide: karadeniz, kaşar, kıyma, fırın, uzun
köfte: kıyma, ızgara, inegöl, yuvarlak, et
karpuz: yaz, kırmızı, çekirdek, yeşil, peynir
muz: sarı, maymun, kabuk, tropik, meyve
çilek: kırmızı, krema, yaz, meyve, reçel
limon: sarı, ekşi, sıkmak, vitamin, limonata
domates: kırmızı, salata, sebze, salça, meyve
soğan: göz, yaşartmak, katman, sarımsak, kesmek
patlıcan: mor, karnıyarık, közlemek, sebze, kebap
mısır: koçan, patlamış, sarı, haşlama, tane
nar: tane, kırmızı, ekşi, kabuk, bereket
fındık: karadeniz, kabuk, kuruyemiş, çikolata, giresun
ceviz: kabuk, beyin, kuruyemiş, ağaç, sert
mangal: kömür, et, ateş, piknik, ızgara
kahvaltı: sabah, yumurta, çay, peynir, zeytin
piknik: çimen, sepet, örtü, mangal, hafta sonu
fast food: hızlı, hamburger, paket, menü, patates
vejetaryen: et, sebze, yemek, hayvan, beslenme
diyet: kilo, zayıflamak, kalori, spor, yemek
tatlı: şeker, baklava, pasta, yemek sonrası, şerbet
acı: biber, yakmak, baharat, isot, ağız
tuz: tuzluk, deniz, beyaz, yemek, şeker
şeker: tatlı, küp, çay, beyaz, tuz

# Hayvanlar
kedi: miyav, fare, tüy, evcil, pati
köpek: havlamak, kemik, sadık, kuyruk, evcil
aslan: kral, orman, yele, kükremek, afrika
fil: hortum, büyük, gri, fildişi, kulak
zürafa: boyun, uzun, benek, afrika, yaprak
maymun: muz, ağaç, tırmanmak, kuyruk, şempanze
penguen: kutup, buz, kuş, siyah beyaz, yürümek
yılan: sürünmek, zehir, tıslamak, uzun, deri
kaplumbağa: kabuk, yavaş, deniz, yüz, yaşlı
tavşan: havuç, kulak, zıplamak, beyaz, hızlı
kurbağa: vıraklamak, göl, zıplamak, yeşil, prens
arı: bal, sokmak, çiçek, kovan, vızıldamak
kelebek: kanat, renkli, tırtıl, uçmak, çiçek
örümcek: ağ, sekiz, bacak, böcek, köşe
köpekbalığı: deniz, diş, yüzgeç, tehlike, okyanus
yunus: deniz, zeki, akıllı, yüzmek, gösteri
ahtapot: sekiz, kol, deniz, mürekkep, vantuz
baykuş: gece, uhu, göz, bilge, kuş
papağan: konuşmak, renkli, kuş, taklit, kafes
deve: hörgüç, çöl, su, kum, kervan
at: koşmak, eyer, nal, binmek, yarış
inek: süt, mö, çiftlik, otlamak, ahır
tavuk: yumurta, gıdak, kümes, horoz, civciv
koyun: yün, kuzu, çoban, meee, sürü
keçi: boynuz, süt, dağ, sakal, peynir
ayı: bal, kış uykusu, orman, büyük, boz
kurt: uluma, sürü, orman, ay, vahşi
tilki: kurnaz, kızıl, kuyruk, orman, tavuk
sincap: fındık, ağaç, kuyruk, ceviz, kemirgen
kirpi: diken, küçük, gece, top, elma
yarasa: gece, uçmak, mağara, ters, kör
karınca: küçük, çalışkan, yuva, şeker, ordu
sivrisinek: ısırmak, kaşıntı, gece, vızıltı, kan
timsah: nehir, diş, sürüngen, gözyaşı, yeşil
kanguru: avustralya, kese, zıplamak, yavru, boks
panda: bambu, çin, siyah beyaz, ayı, sevimli
balina: büyük, okyanus, memeli, su püskürtmek, mavi
kartal: yırtıcı, uçmak, pençe, gaga, yüksek
leylek: bebek, uzun bacak, göç, yuva, gaga
martı: deniz, simit, sahil, beyaz, istanbul
horoz: sabah, ötmek, ibik, tavuk, kükürükü
salyangoz: yavaş, kabuk, sümük, yağmur, boynuz
dinozor: fosil, eski, büyük, nesli tükenmiş, jurassic
kunduz: baraj, diş, ağaç, nehir, kemirmek
fare: peynir, kedi, kemirgen, delik, küçük
zebra: çizgi, siyah beyaz, at, afrika, yaya geçidi
bukalemun: renk, değiştirmek, kertenkele, dil, saklanmak
uğur böceği: kırmızı, benek, şans, küçük, uçmak
ateşböceği: ışık, gece, yaz, parlamak, böcek
denizanası: yakmak, şeffaf, deniz, dokunaç, yüzmek

# Meslekler
doktor: hastane, hasta, ilaç, muayene, beyaz önlük
hemşire: hastane, iğne, doktor, serum, nöbet
öğretmen: okul, öğrenci, ders, sınıf, tahta
polis: suç, hırsız, düdük, karakol, üniforma
itfaiyeci: yangın, söndürmek, hortum, merdiven, su
aşçı: yemek, mutfak, şapka, tencere, restoran
garson: restoran, sipariş, bahşiş, tepsi, masa
pilot: uçak, kokpit, kaptan, uçmak, havalimanı
berber: saç, tıraş, makas, sakal, koltuk
terzi: dikiş, kumaş, iğne, ölçü, makas
çiftçi: tarla, traktör, ekmek, hasat, köy
avukat: mahkeme, dava, hukuk, savunmak, hakim
hakim: mahkeme, karar, tokmak, dava, cübbe
mimar: bina, çizim, proje, tasarım, inşaat
mühendis: hesap, proje, teknik, inşaat, bilgisayar
diş hekimi: diş, çürük, dolgu, ağrı, koltuk
eczacı: ilaç, reçete, eczane, hap, doktor
postacı: mektup, kargo, zil, dağıtmak, çanta
astronot: uzay, roket, ay, yerçekimi, kask
dedektif: ipucu, suç, büyüteç, katil, araştırmak
ressam: tablo, fırça, boya, tuval, sanat
fotoğrafçı: kamera, çekmek, poz, flaş, fotoğraf
gazeteci: haber, röportaj, muhabir, yazmak, gazete
şoför: araba, sürmek, direksiyon, otobüs, yol
kasap: et, bıçak, dükkan, kıyma, kesmek
fırıncı: ekmek, fırın, hamur, sabah, simit
balıkçı: balık, ağ, tekne, deniz, olta
marangoz: tahta, ağaç, testere, mobilya, çivi
elektrikçi: kablo, elektrik, sigorta, priz, tamir
tesisatçı: su, boru, musluk, kaçak, tamir
psikolog: ruh, terapi, konuşmak, dinlemek, danışan
veteriner: hayvan, kedi, köpek, doktor, aşı
kaptan: gemi, deniz, dümen, tayfa, liman
hakem: maç, düdük, kart, futbol, faul
sihirbaz: şapka, tavşan, numara, gösteri, değnek
palyaço: sirk, kırmızı burun, gülmek, makyaj, komik
youtuber: video, kanal, abone, kamera, internet
yazılımcı: kod, bilgisayar, program, uygulama, hata
kuaför: saç, boya, fön, makas, salon
bekçi: gece, düdük, mahalle, nöbet, sopa

# Yerler
hastane: doktor, hasta, ambulans, ameliyat, acil
okul: öğrenci, öğretmen, ders, sınıf, teneffüs
kütüphane: kitap, okumak, sessiz, ödünç, raf
müze: tarih, eser, sergi, bilet, eski
sinema: film, perde, patlamış mısır, bilet, salon
tiyatro: sahne, oyuncu, perde, oyun, alkış
havalimanı: uçak, bavul, pasaport, kalkış, terminal
plaj: kum, deniz, güneş, şemsiye, havlu
kamp: çadır, ateş, orman, uyku tulumu, doğa
lunapark: dönme dolap, oyun, eğlence, bilet, çarpışan araba
hayvanat bahçesi: hayvan, kafes, aslan, fil, ziyaret
market: alışveriş, kasa, sepet, ürün, raf
pazar: sebze, meyve, tezgah, bağırmak, pazarcı
eczane: ilaç, reçete, nöbetçi, eczacı, hap
berber dükkanı: saç, tıraş, ayna, koltuk, makas
cami: ezan, namaz, minare, cuma, kubbe
stadyum: maç, futbol, taraftar, tribün, saha
kafe: kahve, oturmak, masa, sohbet, garson
banka: para, hesap, kredi, faiz, şube
otel: oda, rezervasyon, tatil, resepsiyon, yatak
hapishane: mahkum, suç, parmaklık, ceza, gardiyan
mezarlık: ölü, mezar, taş, ziyaret, sessiz
çöl: kum, sıcak, deve, vaha, susuz
orman: ağaç, yeşil, hayvan, yaprak, kamp
mağara: karanlık, kaya, yarasa, dağ, oyuk
ada: deniz, su, çevrili, kara, tekne
şelale: su, yüksek, akmak, düşmek, nehir
volkan: lav, patlamak, dağ, kül, ateş
köprü: geçmek, nehir, boğaz, iki yaka, araba
deniz feneri: ışık, gemi, kule, sahil, gece
spor salonu: ağırlık, kas, antrenman, koşu bandı, ter
park: çocuk, salıncak, bank, ağaç, yürüyüş
otogar: otobüs, bilet, yolculuk, peron, şehirlerarası
benzinlik: yakıt, araba, depo, pompa, akaryakıt
istanbul: boğaz, köprü, kalabalık, şehir, galata
kapadokya: balon, peri bacası, nevşehir, kaya, mağara
antalya: tatil, deniz, otel, güney, turist
paris: fransa, eyfel, kule, aşk, şehir
mısır piramitleri: firavun, mumya, çöl, eski, üçgen
kuzey kutbu: buz, soğuk, penguen, ayı, kar

# Ulaşım ve araçlar
araba: tekerlek, sürmek, direksiyon, benzin, yol
otobüs: durak, şoför, yolcu, bilet, toplu taşıma
uçak: kanat, pilot, havalimanı, uçmak, bilet
gemi: deniz, kaptan, liman, yüzmek, büyük
bisiklet: pedal, iki tekerlek, sürmek, zincir, kask
motosiklet: kask, iki teker, hız, motor, sürmek
tren: ray, vagon, istasyon, lokomotif, raylı
metro: yeraltı, istasyon, ray, kart, şehir
vapur: boğaz, deniz, martı, iskele, simit
taksi: sarı, taksimetre, şoför, para, çağırmak
ambulans: hastane, siren, acil, hasta, sedye
helikopter: pervane, uçmak, pilot, iniş, gürültü
roket: uzay, fırlatmak, ay, ateş, astronot
denizaltı: su altı, deniz, periskop, dalmak, gemi
traktör: tarla, çiftçi, köy, römork, tekerlek
kaykay: tahta, tekerlek, kaymak, sokak, numara
paten: kaymak, tekerlek, buz, ayakkabı, düşmek
teleferik: kablo, dağ, kabin, yukarı, kayak
balon: uçmak, şişirmek, renkli, patlamak, hava
trafik lambası: kırmızı, yeşil, sarı, durmak, kavşak
ehliyet: araba, sınav, sürücü, kurs, belge
kemer: emniyet, takmak, araba, bağlamak, güvenlik
korna: araba, ses, çalmak, trafik, bip
navigasyon: yol, harita, tarif, telefon, gps
trafik: sıkışık, araba, korna, kırmızı ışık, yol
park etmek: araba, yer, otopark, bırakmak, cadde
benzin: yakıt, depo, araba, litre, pompa

# Spor ve oyunlar
futbol: top, gol, kale, saha, maç
basketbol: pota, top, smaç, nba, sayı
voleybol: file, smaç, top, set, plaj
tenis: raket, top, file, kort, servis
yüzme: havuz, su, kulaç, mayo, deniz
satranç: şah, mat, vezir, piyon, tahta
tavla: zar, pul, mars, kahvehane, şeş
okey: taş, istaka, dört kişi, joker, gösterge
boks: yumruk, eldiven, ring, nakavt, maç
güreş: yağlı, kırkpınar, minder, pehlivan, tuş
maraton: koşu, uzun, kilometre, yarış, bitiş
kayak: kar, dağ, kaymak, baton, pist
sörf: dalga, tahta, deniz, kaymak, plaj
dalış: su altı, tüp, deniz, balık, oksijen
bowling: lobut, top, strike, devirmek, salon
golf: sopa, delik, top, çim, vuruş
okçuluk: ok, yay, hedef, nişan, atış
penaltı: kale, futbol, kaleci, beyaz nokta, atış
ofsayt: futbol, hakem, bayrak, kural, pozisyon
gol: kale, file, top, sayı, futbol
taraftar: tribün, takım, tezahürat, maç, forma
olimpiyat: madalya, altın, oyunlar, dünya, halkalar
saklambaç: saklanmak, ebe, saymak, bulmak, sobe
körebe: göz, bağlamak, ebe, yakalamak, kör
ip atlamak: zıplamak, ip, sallamak, çocuk, oyun
yapboz: parça, birleştirmek, resim, puzzle, eksik
bilmece: soru, cevap, tahmin, bilmek, zeka
zar: atmak, altı, tavla, şans, nokta
kart oyunu: deste, kağıt, kupa, maça, dağıtmak
bilgisayar oyunu: oynamak, ekran, konsol, seviye, karakter
e-spor: oyun, turnuva, bilgisayar, takım, yayın
yoga: esneme, nefes, mat, meditasyon, poz
fitness: spor, kas, ağırlık, salon, antrenman
şampiyon: birinci, kupa, kazanmak, lig, sezon
madalya: altın, gümüş, bronz, boyun, ödül
kupa: şampiyon, kaldırmak, ödül, final, gümüş

# Okul ve iş
sınav: soru, not, test, çalışmak, kopya
ödev: ev, öğretmen, yapmak, defter, teslim
karne: not, okul sonu, tatil, takdir, teşekkür
teneffüs: zil, ders arası, bahçe, oyun, kantin
öğle arası: yemek, iş, mola, saat, dinlenmek
toplantı: ofis, sunum, iş, masa, konuşmak
patron: iş, şef, maaş, müdür, çalışan
maaş: para, ay, iş, ödemek, banka
emeklilik: yaşlı, çalışmamak, iş, maaş, son
mezuniyet: kep, diploma, okul, bitirmek, tören
üniversite: fakülte, öğrenci, bölüm, kampüs, sınav
diploma: mezun, okul, belge, kep, bitirmek
kopya çekmek: sınav, hile, kağıt, bakmak, yakalanmak
tatil: dinlenmek, deniz, izin, yaz, otel
iş görüşmesi: başvuru, cv, mülakat, işe alım, soru
cv: özgeçmiş, iş, başvuru, deneyim, belge
fazla mesai: iş, saat, geç, ofis, ekstra
pazartesi: hafta, ilk gün, iş, sendrom, başlamak
hafta sonu: cumartesi, pazar, tatil, dinlenmek, iki gün
alarm: uyanmak, saat, sabah, çalmak, ertelemek
bilet: sinema, otobüs, giriş, kontrol, satın almak

# Teknoloji ve internet
telefon: aramak, mesaj, akıllı, şarj, ekran
bilgisayar: klavye, fare, ekran, internet, laptop
internet: wifi, site, bağlantı, google, çevrimiçi
şifre: parola, güvenlik, giriş, unutmak, hesap
şarj: pil, kablo, telefon, yüzde, priz
selfie: fotoğraf, kendi, telefon, poz, ön kamera
emoji: mesaj, yüz, gülmek, sembol, sarı
mesaj: yazmak, telefon, göndermek, cevap, whatsapp
video: izlemek, çekmek, youtube, kamera, film
oyun konsolu: oyun, kol, televizyon, oynamak, joystick
kulaklık: müzik, kulak, dinlemek, kablosuz, ses
robot: makine, yapay zeka, metal, otomatik, insan
yapay zeka: robot, bilgisayar, akıllı, makine, öğrenmek
sosyal medya: paylaşım, beğeni, takipçi, instagram, hesap
takipçi: sosyal medya, hesap, sayı, abone, instagram
virüs: bilgisayar, hastalık, antivirüs, bulaşmak, mikrop
uygulama: telefon, indirmek, mağaza, program, ikon
wifi: internet, kablosuz, şifre, bağlanmak, modem
ekran: telefon, televizyon, görüntü, dokunmatik, monitör
klavye: tuş, yazmak, bilgisayar, harf, mouse
kamera: fotoğraf, video, çekmek, lens, objektif
drone: uçmak, kamera, pervane, kumanda, havadan
akıllı saat: bilek, telefon, adım, bildirim, saat
podcast: dinlemek, bölüm, yayın, ses, konuşma
canlı yayın: anlık, izleyici, kamera, internet, yayıncı
spam: istenmeyen, e-posta, reklam, çöp, mesaj
e-posta: mail, göndermek, adres, gelen kutusu, mesaj
ekran görüntüsü: telefon, kaydetmek, fotoğraf, tuş, ss
güncelleme: yeni sürüm, yüklemek, telefon, uygulama, indirmek

# Duygular ve davranışlar
mutluluk: sevinç, gülmek, neşe, keyif, iyi
üzüntü: ağlamak, hüzün, keder, mutsuz, gözyaşı
öfke: kızmak, sinir, bağırmak, kırmızı, kavga
korku: korkmak, karanlık, kabus, titremek, çığlık
kıskançlık: sevgili, imrenmek, haset, başkası, yeşil
utanç: kızarmak, mahcup, yüz, sıkılmak, ayıp
özlem: hasret, uzak, sevdiğin, görmek istemek, gurbet
heyecan: kalp, çarpmak, beklemek, sabırsızlık, sevinç
can sıkıntısı: sıkılmak, yapacak, boş, esnemek, uzun
tembellik: üşenmek, yatmak, çalışmamak, miskin, kanepe
cesaret: korkusuz, yürek, kahraman, gözü kara, güçlü
yalan: doğru, söylemek, burun, kandırmak, gerçek
sır: saklamak, gizli, söylememek, kimse, güvenmek
özür: pardon, af, hata, üzgünüm, dilemek
teşekkür: sağ ol, minnet, nezaket, karşılık, söylemek
kahkaha: gülmek, yüksek, komik, şaka, ses
esnemek: uyku, ağız, yorgun, açmak, sıkılmak
hapşırmak: burun, hapşu, nezle, çok yaşa, toz
horlamak: uyku, ses, gece, burun, rahatsız
hıçkırık: su, nefes, hık, durdurmak, korkutmak
gıdıklamak: gülmek, ayak, koltuk altı, parmak, dayanamamak
dedikodu: konuşmak, arkasından, söz taşımak, laf, komşu
inat: vazgeçmemek, keçi, ısrar, dik kafa, laf dinlememek
sabır: beklemek, sakin, acele, tahammül, dayanmak
aşk: sevgi, kalp, sevgili, romantik, sevmek
ayrılık: sevgili, ayrılmak, üzgün, veda, bitmek
düğün: gelin, damat, nikah, halay, evlilik
nişan: yüzük, söz, evlilik, aile, takmak
kavga: tartışma, yumruk, bağırmak, küs, dövüşmek
barışmak: küs, kavga, sarılmak, özür, tekrar
uyku: yatak, rüya, gece, yorgun, horlamak
rüya: uyku, gece, görmek, kabus, hayal
kabus: korku, rüya, gece, uyanmak, kötü
diyet yapmak: kilo, yemek, zayıflamak, kalori, salata

# Doğa ve hava
yağmur: şemsiye, ıslak, bulut, damla, yağmak
kar: beyaz, kış, soğuk, kardan adam, yağmak
güneş: sıcak, yaz, ışık, gökyüzü, sarı
ay: gece, dolunay, uydu, hilal, gökyüzü
yıldız: gece, parlak, gökyüzü, kayan, uzay
gökkuşağı: renk, yağmur, yedi, güneş, kemer
şimşek: gök gürültüsü, fırtına, ışık, yıldırım, çakmak
deprem: sallanmak, fay, bina, korku, büyüklük
sel: su, yağmur, taşmak, felaket, nehir
fırtına: rüzgar, şiddetli, yağmur, kasırga, deniz
sis: görmek, puslu, beyaz, sabah, yol
dolu: buz, yağmak, top, araba, tane
rüzgar: esmek, hava, uçurtma, yel, saç
deniz: dalga, mavi, tuzlu, yüzmek, plaj
dağ: zirve, tırmanmak, yüksek, kar, tepe
nehir: akmak, su, köprü, dere, ırmak
göl: su, durgun, balık, kayık, kıyı
ağaç: yaprak, dal, gövde, orman, kök
çiçek: koku, yaprak, bahçe, gül, açmak
kaktüs: diken, çöl, saksı, su, yeşil
yaprak: ağaç, yeşil, sonbahar, düşmek, dal
sonbahar: yaprak, düşmek, eylül, mevsim, yağmur
ilkbahar: bahar, çiçek, mart, mevsim, açmak
yaz: sıcak, tatil, deniz, mevsim, güneş
kış: soğuk, kar, mevsim, aralık, palto
gün batımı: akşam, güneş, kırmızı, deniz, manzara
gündoğumu: sabah, güneş, erken, doğmak, şafak
kum: plaj, sahil, kale, çöl, tane
taş: sert, kaya, atmak, yol, çakıl
toprak: bitki, çamur, kahverengi, tarla, ekmek
çamur: toprak, yağmur, ıslak, kirli, ayakkabı
buz: soğuk, donmak, su, kaygan, küp
ateş: yanmak, sıcak, alev, duman, odun
duman: ateş, sigara, gri, baca, yanmak
gökyüzü: mavi, bulut, yukarı, hava, uçak
bulut: beyaz, gökyüzü, yağmur, pamuk, hava
orman yangını: ağaç, alev, itfaiye, duman, söndürmek
okyanus: deniz, büyük, dalga, atlantik, derin

# Vücut ve sağlık
göz: görmek, kirpik, gözlük, bakmak, iki
kulak: duymak, ses, küpe, iki, dinlemek
burun: koku, nefes, yüz, hapşırmak, sümük
diş: fırçalamak, ağız, çiğnemek, diş hekimi, beyaz
kalp: atmak, aşk, organ, kan, göğüs
beyin: düşünmek, kafa, zeka, akıl, organ
saç: tarak, kafa, uzun, kesmek, berber
sakal: tıraş, yüz, erkek, bıyık, uzatmak
bıyık: dudak, sakal, tıraş, erkek, yüz
parmak: el, beş, tırnak, yüzük, saymak
tırnak: kesmek, parmak, oje, uzun, el
dirsek: kol, eklem, bükmek, çarpmak, kemik
ateş ölçer: derece, hasta, termometre, sıcaklık, ölçmek
grip: hasta, ateş, öksürük, virüs, nezle
öksürük: boğaz, hasta, şurup, grip, nefes
iğne: aşı, hemşire, acımak, kol, doktor
aşı: iğne, hastalık, bağışıklık, çocuk, doktor
ilaç: hap, eczane, hasta, reçete, şurup
diş ağrısı: diş, acı, diş hekimi, çürük, ağrı kesici
baş ağrısı: kafa, ağrı, ilaç, migren, yorgun
yorgunluk: dinlenmek, uyku, bitkin, çalışmak, enerji
spor yapmak: koşu, salon, egzersiz, terlemek, sağlık
uykusuzluk: uyumak, gece, yorgun, uyanık, yatak

# Kültür, sanat, eğlence
müzik: şarkı, dinlemek, nota, enstrüman, melodi
şarkı: söylemek, müzik, söz, şarkıcı, nakarat
dans: müzik, ritim, oynamak, adım, halay
halay: düğün, el ele, davul, zurna, oynamak
davul: vurmak, tokmak, zurna, ritim, ramazan
gitar: tel, çalmak, akor, müzik, pena
piyano: tuş, siyah beyaz, çalmak, müzik, kuyruklu
keman: yay, tel, çalmak, çene, müzik
bağlama: saz, tel, türkü, çalmak, halk müziği
konser: sahne, müzik, şarkıcı, bilet, seyirci
film: sinema, izlemek, oyuncu, yönetmen, senaryo
dizi: bölüm, televizyon, sezon, izlemek, karakter
korku filmi: korkmak, hayalet, gece, çığlık, gerilim
çizgi film: animasyon, çocuk, karakter, televizyon, eğlenceli
roman: kitap, yazar, okumak, sayfa, hikaye
şiir: dize, kafiye, şair, okumak, duygu
masal: bir varmış bir yokmuş, peri, çocuk, anlatmak, hikaye
tablo: resim, ressam, müze, çerçeve, boya
heykel: taş, yontmak, sanat, müze, mermer
fotoğraf: çekmek, kamera, kare, albüm, poz
karaoke: şarkı, söylemek, mikrofon, ekran, eğlence
sirk: palyaço, cambaz, çadır, gösteri, hayvan
sihir: büyü, sihirbaz, numara, değnek, şapka
bulmaca: kare, kelime, çözmek, gazete, soldan sağa
kahvehane: tavla, okey, çay, emekli, iskambil
gazino: sahne, şarkıcı, masa, rakı, eğlence
bayram: tatil, şeker, el öpmek, harçlık, kurban
şeker bayramı: ramazan, şeker, harçlık, el öpmek, tatil
ramazan: oruç, iftar, sahur, davul, ay
yılbaşı: noel baba, çam ağacı, hediye, ocak, kutlama
doğum günü: pasta, mum, hediye, yaş, kutlamak
nazar boncuğu: göz, mavi, kötü, korumak, takmak
fal: kahve, fincan, gelecek, falcı, bakmak
kına gecesi: gelin, kına, düğün öncesi, ağlamak, el
takı: altın, düğün, bilezik, yüzük, kolye
hamam: kese, sıcak, köpük, göbek taşı, terlemek
nargile: duman, kafe, tütün, köz, içmek
çay bahçesi: çay, aile, oturmak, simit, açık hava
iskambil: kart, deste, kupa, maça, oyun
kurban: bayram, koç, kesmek, et, dağıtmak

# Fantastik ve kahramanlar
ejderha: ateş, kanat, masal, uçmak, pullu
hayalet: ruh, korku, beyaz, görünmez, ev
vampir: kan, diş, gece, tabut, sarımsak
cadı: süpürge, büyü, şapka, kazan, masal
peri: kanat, küçük, sihir, masal, dilek
deniz kızı: kuyruk, deniz, masal, balık, şarkı
uzaylı: uzay, ufo, yeşil, gezegen, istila
zombi: ölü, yürüyen, ısırmak, beyin, salgın
korsan: gemi, hazine, göz bandı, papağan, kanca
şövalye: zırh, kılıç, at, kral, kale
prenses: kral, şato, taç, masal, prens
kral: taç, taht, kraliçe, saray, hükümdar
süper kahraman: pelerin, güç, kurtarmak, kötü, uçmak
ninja: japonya, siyah, gizli, kılıç, dövüş
sihirli değnek: büyü, sihirbaz, peri, sallamak, dilek
uçan halı: uçmak, masal, alaaddin, halı, lamba
hazine: altın, sandık, harita, korsan, bulmak
labirent: çıkış, yol, kaybolmak, duvar, bulmak
zaman makinesi: geçmiş, gelecek, yolculuk, bilim kurgu, zaman
görünmezlik: görmek, kaybolmak, pelerin, süper güç, saydam
kardan adam: kar, havuç, kış, burun, yapmak
noel baba: hediye, yılbaşı, sakal, kırmızı, geyik
diş perisi: diş, yastık, para, çocuk, düşmek
dev: büyük, uzun, masal, cüce, güçlü
cin: lamba, dilek, üç, masal, şişe

# Kavramlar ve deyimler
zaman: saat, dakika, geçmek, süre, takvim
para: ödemek, lira, cüzdan, zengin, banka
şans: talih, kumar, uğur, piyango, tesadüf
piyango: bilet, büyük ikramiye, çekiliş, şans, yılbaşı
borç: ödemek, para, almak, vermek, kredi
kira: ev, ay, ödemek, ev sahibi, kiracı
komşu: yan, kapı, apartman, ev, mahalle
misafir: gelmek, ikram, ev, ziyaret, çay
akraba: aile, kuzen, teyze, amca, bayram
kayınvalide: eş, anne, gelin, damat, aile
torun: dede, nine, çocuk, aile, sevmek
ikiz: kardeş, aynı, iki, benzer, doğmak
bebek: ağlamak, emzik, bez, küçük, yeni doğmuş
yaşlılık: ihtiyar, emekli, dede, nine, yaş
gençlik: genç, ergen, yaş, enerji, okul
seçim: oy, sandık, aday, kazanmak, parti
vergi: devlet, ödemek, kdv, gelir, maliye
kuyruk: sıra, beklemek, insan, uzun, arka
indirim: ucuz, fiyat, kampanya, yüzde, mağaza
pazarlık: fiyat, indirim, kapalıçarşı, satıcı, ucuz
hediye: paket, vermek, doğum günü, sürpriz, kurdele
sürpriz: beklenmedik, parti, hediye, şaşırmak, gizli
randevu: saat, buluşmak, doktor, sevgili, tarih
tatil köyü: otel, her şey dahil, havuz, deniz, animasyon
kamp ateşi: odun, gece, çadır, marshmallow, ısınmak
geç kalmak: saat, erken, beklemek, trafik, randevu
erken kalkmak: sabah, alarm, uyanmak, uyku, horoz
unutkanlık: hatırlamak, akıl, anahtar, unutmak, hafıza
sınav stresi: sınav, ders, korku, çalışmak, kaygı
dolmuş: minibüs, durak, yolcu, şoför, para uzatmak
kapıcı: apartman, ekmek, çöp, bina, yönetici
apartman: kat, daire, bina, komşu, asansör
mahalle: sokak, komşu, bakkal, çocuk, semt
bakkal: mahalle, ekmek, veresiye, dükkan, süt
veresiye: borç, defter, bakkal, ödemek, sonra
gurbet: uzak, memleket, özlem, yabancı, göç
memleket: doğduğun yer, şehir, köy, özlem, hemşehri
köy: tarla, muhtar, çiftçi, kasaba, şehir
şehir: kalabalık, bina, trafik, köy, büyük
trafik cezası: polis, para, hız, kural, makbuz
hız: süre, yavaş, hızlı, kilometre, araba
gece yarısı: saat on iki, karanlık, uyku, gece, geç
sabah kahvesi: sabah, fincan, kafein, uyanmak, içmek
çay molası: çay, ara, iş, dinlenmek, sohbet
# Ev, eşya ve mutfak (2)
bulaşık makinesi: tabak, yıkamak, mutfak, deterjan, kirli
klima: serin, sıcak, hava, kumanda, yaz
kombi: ısıtma, kış, petek, sıcak su, doğalgaz
kalorifer: ısınmak, kış, petek, sıcak, bina
şofben: sıcak su, banyo, gaz, duş, ısıtmak
tost makinesi: ekmek, kaşar, sıkmak, kahvaltı, sıcak
çay bardağı: ince belli, cam, içmek, tabak, kaşık
kevgir: süzmek, delik, makarna, su, mutfak
rende: havuç, peynir, ince, sürtmek, mutfak
oklava: hamur, açmak, yufka, uzun, tahta
tava: kızartmak, yağ, yumurta, ocak, sap
düdüklü tencere: buhar, ses, pişirmek, basınç, fasulye
cezve: kahve, köpük, ocak, türk kahvesi, bakır
semaver: çay, büyük, kömür, bakır, piknik
tepsi: taşımak, servis, çay, düz, misafir
kaşık: çorba, yemek, çatal, metal, karıştırmak
bıçak: kesmek, keskin, ekmek, mutfak, sap
kesme tahtası: doğramak, bıçak, soğan, tahta, mutfak
buzluk: dondurmak, buz, soğuk, dolap, et
fırın: pişirmek, sıcak, kek, ekmek, mutfak
ocak: yemek, ateş, tencere, gaz, pişirmek
musluk: su, açmak, lavabo, damla, banyo
lavabo: el yıkamak, musluk, banyo, sabun, su
küvet: banyo, köpük, su, uzanmak, duş
klozet: tuvalet, sifon, banyo, kapak, oturmak
diş macunu: fırça, beyaz, tüp, sabah, ağız
şampuan: saç, köpük, banyo, yıkamak, şişe
saç kurutma makinesi: fön, sıcak, ıslak, rüzgar, banyo
tıraş makinesi: sakal, bıyık, elektrik, kesmek, erkek
deodorant: koku, ter, koltuk altı, sıkmak, spor
parfüm: koku, şişe, sıkmak, güzel, hediye
çamaşır ipi: asmak, kurutmak, mandal, balkon, ıslak
ütü masası: ütü, katlanmak, gömlek, düz, kırışık
elbise askısı: dolap, ceket, asmak, kanca, gömlek
kapı kolu: açmak, çevirmek, kapı, tutmak, metal
paspas: kapı, ayak silmek, giriş, çamur, halı
yorgan: yatak, kış, sıcak, örtmek, uyumak
çarşaf: yatak, beyaz, örtü, yastık kılıfı, yıkamak
beşik: bebek, sallamak, uyumak, küçük, yatak
çekyat: kanepe, açılmak, yatak, misafir, oturmak
sehpa: çay, orta, salon, küçük masa, koymak
kitaplık: raf, kitap, dizmek, duvar, dolap
avize: tavan, ışık, kristal, salon, sallanmak
duvar saati: zaman, akrep, yelkovan, tik tak, asmak
termometre: derece, ateş, sıcaklık, ölçmek, hasta
fener: ışık, karanlık, pil, kamp, el
çakmak: ateş, sigara, yakmak, alev, gaz
kibrit: yakmak, çöp, kutu, ateş, sürtmek
pil: enerji, kumanda, şarj, artı eksi, bitmek
uzatma kablosu: priz, elektrik, uzun, fiş, kablo
yangın tüpü: söndürmek, kırmızı, alev, acil, köpük
zil: kapı, çalmak, misafir, ses, basmak
kilit: anahtar, kapı, güvenlik, kapatmak, çilingir
çilingir: anahtar, kilit, açmak, kapıda kalmak, usta
el feneri: pil, ışık, karanlık, elektrik kesintisi, tutmak
mutfak robotu: doğramak, karıştırmak, elektrik, hızlı, bıçak
çay süzgeci: demlik, yaprak, süzmek, bardak, delik
demlik: çay, demlemek, çaydanlık, üst, porselen
kahve makinesi: filtre, espresso, sabah, fincan, kafein
sürahi: su, cam, doldurmak, masa, büyük
matara: su, asker, kamp, taşımak, yürüyüş
piknik sepeti: hasır, yiyecek, çimen, örtü, taşımak
# Yemek ve içecek (2)
iskender: döner, tereyağı, yoğurt, bursa, sos
adana kebap: acı, kıyma, şiş, mangal, şehir
karnıyarık: patlıcan, kıyma, fırın, domates, yarmak
imam bayıldı: patlıcan, zeytinyağı, soğan, bayılmak, soğuk
dolma: biber, pirinç, sarma, doldurmak, yaprak
sarma: yaprak, pirinç, zeytinyağı, dolma, sarmak
kuru fasulye: pilav, beyaz, tencere, bakla, kış
mercimek çorbası: kırmızı, limon, kış, lokanta, sıcak
tarhana: çorba, kurutmak, yoğurt, kış, köy
pastırma: et, çemen, kayseri, kurutulmuş, yumurta
sucuk: yumurta, baharat, et, kahvaltı, mangal
mıhlama: karadeniz, mısır unu, peynir, uzamak, tereyağı
hamsi: balık, karadeniz, kızartma, küçük, kış
çiğ köfte: bulgur, acı, dürüm, marul, isot
tantuni: mersin, et, dürüm, sac, limon
balık ekmek: eminönü, vapur, ekmek arası, uskumru, deniz
künefe: hatay, peynir, şerbet, kadayıf, sıcak
kadayıf: tel, şerbet, tatlı, fıstık, fırın
revani: irmik, şerbet, tatlı, kek, hindistan cevizi
helva: un, tahin, ölü, şeker, kavurmak
pişmaniye: ip gibi, tatlı, kocaeli, şeker, beyaz
kestane şekeri: bursa, tatlı, kış, kestane, şeker
pamuk şeker: pembe, lunapark, çubuk, şeker, bulut
macun: şekerci, renkli, çubuk, tatlı, sarmak
gofret: çikolata, kat, çıtır, atıştırmak, paket
cips: patates, çıtır, paket, tuzlu, film
patlamış mısır: sinema, tuz, mısır, mikrodalga, patlamak
kuruyemiş: fındık, fıstık, çekirdek, karışık, atıştırmak
çekirdek: ayçiçeği, çitlemek, maç, kabuk, tuzlu
ayva: sarı, meyve, tatlı, tüylü, kış
kiraz: kırmızı, çekirdek, sap, yaz, küpe
vişne: ekşi, kırmızı, reçel, şerbet, kiraz
erik: yeşil, ekşi, bahar, tuz, can
şeftali: tüylü, yaz, sulu, turuncu, meyve
kayısı: malatya, kurutmak, turuncu, yaz, çekirdek
incir: tatlı, mor, kurutmak, ege, ağaç
avokado: yeşil, guacamole, çekirdek, sağlıklı, tost
ananas: tropik, dikenli, sarı, tatlı, pizza
hindistan cevizi: sert, beyaz, süt, palmiye, kabuk
mandalina: turuncu, kış, soymak, portakal, küçük
portakal: turuncu, suyu, vitamin, kış, sıkmak
greyfurt: ekşi, acı, pembe, turunçgil, kahvaltı
salatalık: yeşil, cacık, salata, serin, çıtır
marul: salata, yeşil, yaprak, göbek, hamburger
biber: acı, yeşil, dolma, kırmızı, sivri
sarımsak: koku, diş, cacık, vampir, beyaz
mantar: orman, zehirli, sote, şapka, pizza
brokoli: yeşil, sağlıklı, ağaç, sebze, haşlamak
ıspanak: yeşil, temel reis, demir, yaprak, yumurta
kabak: dolma, mücver, yeşil, sebze, çiçek
pırasa: kış, zeytinyağı, sebze, yeşil, uzun
lahana: sarma, turşu, yaprak, top, kış
fasulye: taze, kuru, yeşil, sebze, pilav
nohut: humus, pilav, leblebi, sarı, haşlamak
leblebi: nohut, çorum, kavrulmuş, sarı, kuruyemiş
humus: nohut, tahin, ezme, sarımsak, meze
cacık: yoğurt, salatalık, sarımsak, nane, soğuk
meze: rakı, masa, küçük tabak, haydari, başlangıç
haydari: yoğurt, meze, dereotu, sarımsak, kalın
pekmez: üzüm, tatlı, tahin, koyu, kahvaltı
tahin: susam, pekmez, helva, ezme, kahverengi
kaymak: bal, süt, beyaz, kahvaltı, manda
tereyağı: süt, sarı, sürmek, kahvaltı, yağ
margarin: yağ, sürmek, tereyağı, kek, bitkisel
mayonez: beyaz, sos, yumurta, patates, tüp
ketçap: kırmızı, sos, domates, patates kızartması, şişe
hardal: sarı, sos, sosisli, acı, tüp
sosisli: sandviç, ekmek, ketçap, hardal, sokak
tost: kaşar, sucuk, ekmek, makine, sıcak
krep: ince, nutella, hamur, tava, fransız
waffle: çikolata, meyve, kare, hamur, tatlı
sufle: çikolata, akmak, sıcak, fırın, dondurma
kek: fırın, çay saati, yumurta, un, kabarmak
kurabiye: çay, un, tereyağı, şekil, fırın
poğaça: hamur, peynir, fırın, kahvaltı, yumuşak
açma: simit, poğaça, yumuşak, fırın, kahvaltı
boza: kış, ekşi, leblebi, tarçın, kalın
sahlep: kış, sıcak, süt, tarçın, içecek
salep: kış, tarçın, sıcak, süt, kalın
şerbet: tatlı, şekerli su, osmanlı, soğuk, baklava
kola: gazlı, siyah, şeker, buz, şişe
soda: maden suyu, gazlı, mide, limon, şişe
meyve suyu: portakal, vişne, kutu, şişe, çocuk
smoothie: meyve, blender, yoğurt, sağlıklı, pipet
milkshake: süt, dondurma, pipet, çilek, çalkalamak
espresso: kahve, sert, küçük, italyan, fincan
latte: süt, kahve, köpük, bardak, kafe
türk kahvesi: köpük, fincan, fal, cezve, telve
# Hayvanlar (2)
kaplan: çizgili, kedi, vahşi, turuncu, avcı
leopar: benekli, hızlı, kedi, avcı, ağaç
çita: hızlı, benekli, koşmak, afrika, kedi
gergedan: boynuz, kalın deri, afrika, büyük, gri
su aygırı: nehir, büyük, ağız, afrika, şişman
goril: maymun, büyük, göğüs, siyah, orman
koala: avustralya, okaliptüs, ağaç, uyku, gri
kutup ayısı: beyaz, buz, soğuk, kuzey, fok
fok: buz, balık, kutup, alkış, yüzmek
mors: dişler, buz, bıyık, kutup, iri
flamingo: pembe, tek ayak, kuş, göl, uzun bacak
tavus kuşu: kuyruk, renkli, tüy, gösteriş, kuş
devekuşu: kum, kafa gömmek, büyük kuş, koşmak, yumurta
pelikan: gaga, balık, kese, kuş, deniz
karga: siyah, kuş, gak, akıllı, çöp
serçe: küçük kuş, cik, kahverengi, şehir, uçmak
güvercin: kuş, meydan, yem, posta, gugukluk
kanarya: sarı, ötmek, kafes, kuş, şarkı
muhabbet kuşu: kafes, yeşil, konuşmak, küçük, kuş
hindi: yılbaşı, glu glu, büyük, kuş, şükran günü
ördek: vak vak, göl, yüzmek, sarı, gaga
kaz: göl, beyaz, ördek, tüy, ciyak
civciv: sarı, tavuk, yumurta, küçük, cik
eşek: anırmak, inatçı, yük, kulak, at
katır: eşek, at, yük, inatçı, dağ
manda: kaymak, siyah, boynuz, çamur, inek
geyik: boynuz, orman, ren, kahverengi, koşmak
ren geyiği: noel baba, kızak, boynuz, kuzey, rudolf
kokarca: koku, siyah beyaz, kuyruk, kaçmak, kötü
köstebek: toprak, kör, tünel, bahçe, kazmak
hamster: kafes, çark, küçük, yanak, evcil
kertenkele: kuyruk, sürüngen, güneş, duvar, küçük
iguana: yeşil, sürüngen, kertenkele, pul, evcil
kobra: yılan, zehir, şapka, dans, hint
anakonda: yılan, büyük, sıkmak, amazon, su
akrep: kuyruk, zehir, çöl, iğne, burç
çekirge: zıplamak, yeşil, tarla, cırcır, böcek
hamamböceği: iğrenç, mutfak, böcek, kahverengi, kaçmak
sinek: vızıltı, bal, çöp, uçmak, kovalamak
solucan: toprak, uzun, yağmur, olta, sürünmek
tırtıl: kelebek, yaprak, koza, yeşil, sürünmek
yengeç: kıskaç, yan yürümek, deniz, kabuk, kırmızı
ıstakoz: kırmızı, kıskaç, deniz ürünü, pahalı, kabuk
karides: deniz, pembe, küçük, tava, kabuk
denizyıldızı: beş kol, deniz, kum, yıldız, plaj
denizatı: at, deniz, küçük, kuyruk, erkek doğurur
orka: katil balina, siyah beyaz, okyanus, yunus, avcı
piranha: diş, nehir, et, balık, amazon
japon balığı: akvaryum, turuncu, küçük, kavanoz, hafıza
lama: tükürmek, tüylü, peru, deve, boyun
alpaka: yün, tüylü, sevimli, lama, peru
tembel hayvan: yavaş, ağaç, uyku, asılı, gülümseme
yaban domuzu: orman, diş, avcı, hırçın, çamur
domuz: pembe, çamur, kuyruk, burun, çiftlik
kuzu: koyun, beyaz, yavru, meee, bayram
oğlak: keçi, yavru, zıplamak, burç, dağ
buzağı: inek, yavru, süt, çiftlik, ahır
tay: at, yavru, koşmak, çiftlik, bacak
kurbağa yavrusu: iribaş, su, kuyruk, gölet, küçük
# Meslekler (2)
cerrah: ameliyat, doktor, neşter, hastane, maske
anestezist: uyutmak, ameliyat, doktor, iğne, narkoz
ebe: doğum, bebek, hastane, kadın, hemşire
fizyoterapist: egzersiz, kas, tedavi, masaj, sakatlık
diyetisyen: kilo, beslenme, liste, sağlıklı, kalori
eczane kalfası: ilaç, reçete, kasa, eczacı, satmak
muhasebeci: hesap, vergi, fatura, rakam, şirket
bankacı: para, kredi, hesap, gişe, faiz
borsacı: hisse, yükselmek, düşmek, ekran, para
emlakçı: ev, kira, satmak, daire, komisyon
sekreter: telefon, randevu, masa, patron, dosya
çevirmen: dil, tercüme, yabancı, kitap, sözlük
kütüphaneci: kitap, sessizlik, raf, ödünç, kütüphane
arkeolog: kazı, antik, toprak, fırça, tarih
jeolog: taş, kaya, deprem, yer bilimi, maden
astronom: yıldız, teleskop, gezegen, gökyüzü, uzay
kimyager: laboratuvar, deney, tüp, element, karışım
biyolog: canlı, hücre, mikroskop, hayvan, bitki
matematikçi: sayı, formül, problem, hesap, teorem
bilim insanı: deney, laboratuvar, keşif, araştırma, önlük
mucit: icat, buluş, makine, fikir, patent
yazar: kitap, roman, kalem, yazmak, yayınevi
şair: şiir, kafiye, dize, duygu, yazmak
editör: düzeltmek, kitap, gazete, metin, okumak
yönetmen: film, kamera, set, oyuncu, kesmek
oyuncu: rol, film, dizi, sahne, ünlü
dublör: tehlikeli, sahne, yerine, düşmek, film
şarkıcı: ses, konser, mikrofon, albüm, sahne
dj: müzik, plak, parti, kulüp, mikser
dansçı: dans, sahne, bale, koreografi, ritim
model: podyum, fotoğraf, moda, güzel, defile
moda tasarımcısı: elbise, kumaş, çizim, defile, koleksiyon
grafik tasarımcı: logo, bilgisayar, çizim, renk, afiş
inşaat işçisi: baret, beton, tuğla, iskele, bina
vinç operatörü: yük, kaldırmak, yüksek, inşaat, makine
madenci: kömür, yer altı, kask, kazmak, ocak
çöpçü: çöp, sokak, temizlik, kamyon, süpürge
bahçıvan: çiçek, sulamak, çim, budamak, toprak
çoban: koyun, sürü, kaval, dağ, köpek
arıcı: bal, kovan, maske, arı, petek
kaptan pilot: uçak, kokpit, uçuş, yolcu, kanat
hostes: uçak, yolcu, ikram, kabin, üniforma
makinist: tren, ray, lokomotif, kullanmak, istasyon
kurye: paket, motor, teslimat, hızlı, kapı
kargo görevlisi: paket, teslim, imza, adres, araç
güvenlik görevlisi: kapı, kontrol, üniforma, bina, koruma
asker: üniforma, silah, vatan, kışla, nöbet
polis memuru: trafik, ceza, düdük, devriye, karakol
savcı: mahkeme, suç, iddia, dava, hukuk
noter: imza, onay, belge, mühür, satış
siyasetçi: seçim, parti, oy, meclis, konuşma
muhtar: mahalle, ikametgah, seçim, köy, mühür
imam: cami, namaz, ezan, hutbe, din
gazete bayisi: dergi, gazete, sigara, satmak, sabah
manav: meyve, sebze, tezgah, taze, pazar
kasiyer: kasa, para üstü, market, fiş, barkod
tamirci: tamir, usta, alet, bozuk, araba
oto yıkamacı: araba, köpük, su, temiz, cila
boyacı: boya, fırça, duvar, rulo, badana
camcı: cam, pencere, kırık, kesmek, çerçeve
kuyumcu: altın, yüzük, takı, gram, vitrin
saatçi: saat, tamir, pil, kordon, küçük
ayakkabıcı: ayakkabı, tamir, deri, boya, numara
dondurmacı: külah, top, maraş, yaz, kaşık
simitçi: simit, susam, tepsi, sabah, sokak
çaycı: çay, tepsi, ocak, bardak, ofis
taksici: taksi, taksimetre, yolcu, sarı, şoför
# Türkiye ve dünya
ankara: başkent, anıtkabir, kızılay, türkiye, meclis
izmir: ege, kordon, boyoz, saat kulesi, şehir
bursa: iskender, uludağ, yeşil, osmanlı, şehir
trabzon: karadeniz, hamsi, uzungöl, horon, futbol
pamukkale: beyaz, travertenler, denizli, termal, kireç
efes: antik kent, kütüphane, izmir, roma, harabe
truva: at, tahta, savaş, çanakkale, antik
nemrut dağı: heykel, gün doğumu, adıyaman, baş, zirve
sümela manastırı: trabzon, kaya, dağ, kilise, orman
anıtkabir: atatürk, ankara, mezar, ziyaret, tören
galata kulesi: istanbul, kule, beyoğlu, manzara, taş
kız kulesi: istanbul, deniz, üsküdar, efsane, ada
ayasofya: istanbul, cami, kubbe, müze, bizans
topkapı sarayı: osmanlı, padişah, istanbul, hazine, saray
kapalıçarşı: istanbul, alışveriş, kuyumcu, tarihi, dükkan
boğaz köprüsü: istanbul, asya, avrupa, deniz, köprü
uludağ: kayak, bursa, kar, dağ, otel
ölüdeniz: fethiye, mavi, yamaç paraşütü, plaj, deniz
çanakkale: savaş, boğaz, şehitlik, 1915, gelibolu
van gölü: kedi, göl, tuzlu, doğu, akdamar
eiffel kulesi: paris, demir, fransa, kule, yüksek
özgürlük heykeli: new york, amerika, meşale, yeşil, ada
çin seddi: duvar, uzun, çin, uzaydan görünür, taş
kolezyum: roma, gladyatör, arena, italya, antik
pisa kulesi: eğik, italya, kule, fotoğraf, düşmek
big ben: londra, saat, kule, ingiltere, çan
tac mahal: hindistan, beyaz, mermer, aşk, mezar
amazon: orman, nehir, brezilya, yağmur ormanı, vahşi
sahra: çöl, kum, afrika, sıcak, deve
himalaya: dağ, everest, kar, tırmanmak, zirve
everest: en yüksek, dağ, tırmanmak, zirve, nepal
venedik: gondol, kanal, italya, su, köprü
new york: amerika, gökdelen, taksi, manhattan, şehir
londra: ingiltere, kraliçe, yağmur, otobüs, şehir
roma: italya, papa, kolezyum, pizza, antik
tokyo: japonya, sushi, kalabalık, metro, anime
dubai: gökdelen, çöl, zengin, alışveriş, birleşik arap
kutup: buz, soğuk, penguen, beyaz, kuzey
ekvator: sıcak, orta, çizgi, dünya, yarı
tropik: sıcak, palmiye, nemli, ada, meyve
# Okul, bilim ve tarih
matematik: sayı, problem, hesap, ders, formül
fizik: kuvvet, hareket, newton, deney, ders
kimya: element, tüp, deney, formül, laboratuvar
biyoloji: canlı, hücre, ders, bitki, hayvan
tarih: geçmiş, savaş, ders, padişah, yıl
coğrafya: harita, dağ, ülke, iklim, ders
edebiyat: şiir, roman, yazar, ders, kitap
beden eğitimi: spor, ders, top, eşofman, öğretmen
müzik dersi: flüt, şarkı, nota, öğretmen, ders
resim dersi: boya, fırça, çizmek, kağıt, ders
tahta: yazı, tebeşir, sınıf, silmek, öğretmen
tebeşir: tahta, beyaz, toz, yazmak, sınıf
sıra: sınıf, oturmak, arkadaş, masa, öğrenci
okul servisi: sabah, öğrenci, minibüs, şoför, ev
mezuniyet töreni: kep, diploma, okul, kutlama, cübbe
kep: mezuniyet, atmak, şapka, siyah, tören
yaz tatili: okul, deniz, karne, uzun, sıcak
ders zili: teneffüs, çalmak, sınıf, okul, bitmek
nöbetçi öğretmen: teneffüs, koridor, kontrol, okul, sıra
veli toplantısı: anne, baba, öğretmen, not, okul
yazılı sınav: kağıt, soru, cevap, not, kalem
test: şık, soru, işaretlemek, optik, sınav
optik form: kurşun kalem, işaretlemek, sınav, kodlamak, silgi
mikroskop: küçük, büyütmek, hücre, laboratuvar, lens
teleskop: yıldız, uzak, gökyüzü, büyütmek, gezegen
mıknatıs: çekmek, demir, kutup, metal, buzdolabı
pusula: yön, kuzey, iğne, kaybolmak, harita
harita: yol, ülke, kağıt, kaybolmak, konum
küre: dünya, dönmek, yuvarlak, harita, ülke
yerçekimi: newton, elma, düşmek, ağırlık, dünya
elektrik: akım, kablo, ampul, priz, kesinti
mıknatıslık: çekim, kutup, demir, manyetik, alan
atom: küçük, element, çekirdek, elektron, kimya
dna: gen, sarmal, kalıtım, hücre, biyoloji
evrim: darwin, maymun, değişim, tür, zaman
fotosentez: bitki, güneş, yaprak, oksijen, klorofil
gezegen: güneş, mars, dünya, yörünge, uzay
mars: kırmızı, gezegen, uzay, dördüncü, robot
güneş sistemi: gezegen, güneş, yörünge, ay, uzay
kara delik: uzay, yutmak, karanlık, yıldız, çekim
meteor: göktaşı, kayan yıldız, düşmek, uzay, dilek
uzay istasyonu: astronot, yörünge, uzay, dönmek, roket
osmanlı: padişah, saray, imparatorluk, istanbul, tarih
padişah: saray, osmanlı, taht, sultan, hükümdar
fatih sultan mehmet: istanbul, fetih, 1453, padişah, genç
kanuni: süleyman, padişah, osmanlı, kanun, muhteşem
atatürk: cumhuriyet, kurucu, 1923, önder, ankara
cumhuriyet bayramı: 29 ekim, 1923, kutlama, bayrak, türkiye
23 nisan: çocuk bayramı, meclis, bayram, okul, çocuk
19 mayıs: gençlik, spor, bayram, samsun, atatürk
mısır firavunu: piramit, mumya, altın, kral, mısır
mumya: sargı, mısır, firavun, mezar, eski
şövalye zırhı: demir, ortaçağ, kalkan, kılıç, savaş
viking: boynuzlu miğfer, kuzey, gemi, savaşçı, balta
samuray: japon, kılıç, savaşçı, onur, zırh
gladyatör: roma, arena, dövüş, kılıç, kolezyum
dinozor fosili: kemik, müze, kazı, taş, eski
# Spor ve oyunlar (2)
hentbol: el, kale, top, takım, atmak
su topu: havuz, top, kale, yüzmek, takım
masa tenisi: pinpon, raket, masa, top, file
badminton: raket, tüy top, file, vurmak, hafif
eskrim: kılıç, maske, beyaz, dokunmak, düello
binicilik: at, eyer, yarış, engel, jokey
at yarışı: jokey, ganyan, hipodrom, koşmak, bahis
formula 1: araba, pist, hız, pit, yarış
ralli: araba, toprak yol, yarış, hız, toz
bisiklet yarışı: pedal, tur, kask, hız, yol
kaykay parkı: rampa, kaykay, atlamak, genç, düşmek
dağcılık: tırmanmak, zirve, ip, dağ, kamp
yamaç paraşütü: uçmak, dağ, paraşüt, rüzgar, fethiye
bungee jumping: atlamak, ip, köprü, adrenalin, yüksek
rafting: bot, nehir, kürek, akıntı, su
kano: kürek, su, tekne, göl, dar
yelken: rüzgar, tekne, deniz, direk, yarış
buz pateni: paten, buz, kaymak, dönmek, pist
buz hokeyi: sopa, disk, buz, paten, kale
snowboard: kar, tahta, kaymak, dağ, kayak
halter: ağırlık, kaldırmak, güç, kilo, olimpiyat
jimnastik: takla, esneklik, denge, minder, salto
kick boks: tekme, yumruk, ring, eldiven, dövüş
karate: kuşak, tekme, japon, dövüş, siyah
judo: kuşak, fırlatmak, minder, dövüş, japon
tekvando: tekme, kuşak, kore, dövüş, kask
sumo: şişman, japon, itmek, güreş, ring
dart: ok, tahta, atmak, hedef, pub
bilardo: istaka, top, delik, masa, yeşil
langırt: masa, kol, çevirmek, kale, kafe
bowling topu: delik, labut, yuvarlamak, ağır, pist
frizbi: atmak, plastik, yakalamak, uçmak, park
uçurtma: rüzgar, ip, uçurmak, bayram, gökyüzü
saklambaç oyunu: ebe, saymak, saklanmak, bulmak, çocuk
istop: top, ebe, çocuk, sokak, isim
yakar top: top, vurmak, iki takım, çocuk, yanmak
mendil kapmaca: mendil, kapmak, ebe, koşmak, çocuk
seksek: çizgi, taş, zıplamak, kare, tebeşir
misket: cam, top, yuvarlamak, çocuk, çukur
topaç: dönmek, ip, oyuncak, çocuk, fırlatmak
lego: parça, yapmak, plastik, oyuncak, renkli
monopoly: emlak, para, zar, kutu oyunu, hapis
tabu oyunu: yasak kelime, anlatmak, kart, takım, kum saati
sudoku: rakam, kare, bulmaca, dokuz, gazete
rubik küpü: renk, çevirmek, kare, zeka, altı yüz
domino: taş, dizmek, nokta, devirmek, oyun
amiral battı: gemi, kare, harf, rakam, batırmak
adam asmaca: harf, kelime, çizmek, tahmin, ip
# Giyim ve aksesuar
mont: kış, ceket, sıcak, fermuar, kapüşon
kaban: kış, uzun, yün, palto, düğme
palto: uzun, kış, ceket, yün, şık
yağmurluk: yağmur, ıslanmamak, ince, kapüşon, ceket
kazak: yün, kış, örgü, sıcak, boğazlı
hırka: düğme, örgü, ince, kazak, ön açık
tişört: kısa kol, pamuk, yaz, baskı, üst
gömlek: yaka, düğme, ütü, iş, kravat
kravat: boyun, düğüm, takım elbise, gömlek, erkek
papyon: kelebek, boyun, takım, şık, düğün
takım elbise: ceket, pantolon, kravat, düğün, iş
etek: kadın, kısa, uzun, bel, elbise
şort: kısa, yaz, bacak, plaj, pantolon
kot pantolon: mavi, denim, cep, pantolon, yıpranmış
eşofman: spor, rahat, ev, takım, lastikli
pijama: uyku, gece, rahat, takım, yatak
terlik: ev, ayak, rahat, banyo, plaj
sandalet: yaz, ayakkabı, açık, ayak, kayış
çizme: uzun, kış, yağmur, ayakkabı, deri
spor ayakkabı: koşmak, bağcık, rahat, marka, beyaz
topuklu ayakkabı: kadın, yüksek, şık, tak tak, ayak
bağcık: ayakkabı, bağlamak, çözülmek, ip, fiyonk
şapka: baş, güneş, kafa, siper, takmak
bere: kış, örgü, kafa, sıcak, kulak
kask: bisiklet, motor, koruma, kafa, inşaat
güneş gözlüğü: güneş, siyah, yaz, göz, plaj
saat kordonu: bilek, saat, deri, metal, takmak
kolye: boyun, altın, takı, zincir, hediye
küpe: kulak, takı, delik, altın, gümüş
bilezik: kol, altın, takı, bilek, düğün
yüzük: parmak, evlilik, altın, taş, nişan
alyans: evlilik, yüzük, parmak, düğün, altın
çanta: omuz, taşımak, kadın, fermuar, cüzdan
sırt çantası: okul, sırt, kitap, kamp, taşımak
valiz: tatil, tekerlek, kıyafet, havalimanı, bavul
atkı: boyun, kış, sarmak, yün, sıcak
eldiven: el, kış, parmak, sıcak, yün
şemsiye kılıfı: şemsiye, yağmur, ıslak, kapalı, kılıf
fermuar: açmak, kapatmak, ceket, çanta, çekmek
düğme: gömlek, ilik, dikmek, ceket, yuvarlak
cep: pantolon, koymak, para, el, ceket
yaka: gömlek, boyun, kıvrık, ceket, kirli
kapüşon: kafa, mont, sweatshirt, yağmur, örtmek
mayo: deniz, yüzmek, havuz, plaj, yaz
bikini: plaj, kadın, iki parça, yaz, güneş
# Teknoloji (2)
tablet: ekran, dokunmatik, büyük telefon, uygulama, çocuk
dizüstü bilgisayar: laptop, taşımak, klavye, şarj, ekran
yazıcı: kağıt, mürekkep, çıktı, ofis, belge
tarayıcı: internet, chrome, site, sekme, gezinmek
arama motoru: google, aramak, sonuç, internet, sorgu
şarj aleti: kablo, priz, batarya, telefon, dolmak
powerbank: taşınabilir, şarj, batarya, yedek, telefon
bluetooth: kablosuz, bağlanmak, kulaklık, eşleşmek, mavi
usb bellek: flash, dosya, takmak, taşımak, küçük
hard disk: depolama, dosya, bilgisayar, kapasite, yedek
oyun bilgisayarı: ekran kartı, fps, rgb, kasa, oyun
ekran kartı: grafik, oyun, ısınmak, bilgisayar, fiyat
modem: internet, wifi, ışık, kablo, ev
şifre unutmak: giriş, hesap, sıfırlamak, hatırlamak, e-posta
hacker: siber, saldırı, şifre, bilgisayar, kod
kod yazmak: programlama, bilgisayar, yazılım, hata, satır
bug: hata, yazılım, program, düzeltmek, böcek
yazılım güncellemesi: yeni sürüm, indirmek, telefon, yüklemek, yeniden başlat
virüs programı: koruma, antivirüs, tarama, bilgisayar, tehdit
akıllı telefon: dokunmatik, uygulama, ekran, internet, cep
navigasyon uygulaması: yol tarifi, harita, konum, sapmak, trafik
online alışveriş: sepet, kargo, internet, sipariş, indirim
yemek siparişi: uygulama, kurye, aç, motorlu, getirmek
görüntülü arama: kamera, yüz, konuşmak, uzak, telefon
grup sohbeti: mesaj, arkadaş, bildirim, aile, çok kişi
sesli mesaj: kaydetmek, dinlemek, uzun, mikrofon, whatsapp
sticker: çıkartma, mesaj, komik, resim, gönder
meme: komik, internet, resim, yazı, paylaşmak
hashtag: kare işareti, etiket, sosyal medya, trend, kelime
viral: yayılmak, çok izlenme, internet, paylaşım, ünlü
influencer: takipçi, reklam, instagram, ünlü, sosyal medya
abone olmak: kanal, youtube, takip, bildirim, zil
beğeni: kalp, like, sosyal medya, gönderi, sayı
yorum yapmak: yazmak, gönderi, altına, fikir, sosyal medya
story: hikaye, 24 saat, instagram, paylaşmak, kaybolmak
ekran süresi: telefon, saat, bağımlılık, kullanım, kontrol
oyun bağımlılığı: saatlerce, bilgisayar, bırakamamak, oyun, ekran
sanal gerçeklik: gözlük, vr, oyun, dünya, kafa
3d yazıcı: üç boyut, plastik, basmak, model, katman
elektrikli araba: şarj, sessiz, tesla, batarya, çevreci
robot süpürge: temizlik, kendi kendine, dönmek, halı, akıllı
akıllı ev: ses komutu, ışık, uzaktan, telefon, otomatik
# Duygular, davranışlar ve hâller (2)
şaşkınlık: hayret, ağız açık, beklenmedik, şok, gözler
merak: soru, öğrenmek, kedi, bilmek, ilgi
gurur: başarı, kendini beğenmek, kibir, övünmek, göğüs
pişmanlık: keşke, hata, üzülmek, geç, vicdan
vicdan azabı: suçluluk, rahatsız, hata, pişman, iç ses
özgüven: kendine güvenmek, cesaret, emin, karizma, inanç
çekingenlik: utangaç, sessiz, kızarmak, içine kapanık, sosyal
dalgınlık: unutmak, hayal, dikkat, düşünceli, boş bakmak
hayal kurmak: düşünmek, gelecek, uçmak, rüya, dalmak
sinirlenmek: kızmak, öfke, bağırmak, yüz kızarması, sakin olmak
kahkaha atmak: gülmek, yüksek sesle, komik, şaka, eğlence
somurtmak: surat asmak, küsmek, mutsuz, dudak, sessiz
küsmek: konuşmamak, kavga, darılmak, barışmak, arkadaş
sarılmak: kucaklamak, kollar, sevgi, sıcak, özlem
öpücük: dudak, sevgi, yanak, aşk, şapur
göz kırpmak: işaret, flört, tek göz, gizli, şaka
el sallamak: selam, hoşça kal, uzaktan, merhaba, el
alkışlamak: tebrik, el çırpmak, sahne, başarı, ses
fısıldamak: sessiz, kulağa, gizli, alçak ses, sır
bağırmak: yüksek ses, kızmak, çığlık, ses, sinir
şarkı söylemek: ses, mikrofon, banyo, nota, söz
ıslık çalmak: dudak, ses, melodi, çağırmak, rüzgar
parmak şıklatmak: ses, el, ritim, dikkat, şak
tırnak yemek: stres, kemirmek, alışkanlık, parmak, endişe
saç yolmak: sinir, stres, çaresizlik, kafa, deli olmak
kıskanmak: sevgili, istemek, başkası, hırs, kıskançlık
övünmek: kendini anlatmak, böbürlenmek, gurur, abartmak, başarı
yalan söylemek: doğru değil, kandırmak, burun uzaması, palavra, gerçek
şaka yapmak: komik, gülmek, espri, eşek şakası, eğlence
dedikodu yapmak: arkasından konuşmak, söylenti, komşu, laf, haber
gecikmek: geç kalmak, saat, bekletmek, randevu, trafik
acele etmek: koşmak, hızlı, zaman yok, telaş, geç
beklemek: sıra, sabır, zaman, durak, kuyruk
kaybolmak: yol, bulamamak, harita, şaşırmak, yön
unutmak: hatırlamamak, hafıza, anahtar, akıl, kafa
hatırlamak: hafıza, anı, geçmiş, akla gelmek, unutmamak
sıkılmak: can sıkıntısı, yapacak bir şey yok, esnemek, monoton, uzun
uyuklamak: kestirmek, uyku, göz kapanması, yorgun, ders
şekerleme yapmak: öğle uykusu, kısa, kestirmek, kanepe, yorgun
tembellik yapmak: yatmak, çalışmamak, kanepe, ertelemek, miskin
erteleme: sonra, yarın, iş, son dakika, tembellik
mızıkçılık: oyun, kaybetmek, hile, bozmak, çocuk
hile yapmak: kopya, kural, kandırmak, oyun, kazanmak
inatlaşmak: dediğim dedik, ısrar, keçi, vazgeçmemek, tartışma
# Doğa, bitki ve hava (2)
gül: kırmızı, diken, çiçek, sevgili, koku
lale: istanbul, çiçek, hollanda, nisan, soğan
papatya: beyaz, seviyor sevmiyor, çiçek, sarı, yaprak
ayçiçeği: güneş, sarı, çekirdek, tarla, büyük
orkide: saksı, pahalı, mor, çiçek, zarif
menekşe: mor, küçük, çiçek, bahar, saksı
zambak: beyaz, çiçek, koku, uzun, gelin
nergis: sarı, çiçek, kış, koku, narsist
lavanta: mor, koku, tarla, sabun, çiçek
çam ağacı: iğne yaprak, yılbaşı, kozalak, yeşil, orman
meşe: palamut, ağaç, sert, orman, odun
söğüt: ağlayan, su kenarı, dal, ağaç, eğilmek
çınar: büyük, gölge, yaşlı, ağaç, meydan
palmiye: tropik, hurma, kumsal, uzun, yaprak
bambu: panda, uzun, boğum, çin, yeşil
sarmaşık: duvar, tırmanmak, yeşil, bitki, sarmak
yosun: yeşil, taş, ıslak, kaygan, deniz
eğrelti otu: yaprak, orman, yeşil, gölge, bitki
çimen: yeşil, park, biçmek, yeşillik, yürümek
saman: kuru, ahır, inek, sarı, balya
tohum: ekmek, toprak, filizlenmek, bitki, küçük
kök: toprak, ağaç, alt, su, bitki
dal: ağaç, kol, kırılmak, yaprak, kuş
odun: yakmak, şömine, kesmek, ağaç, kış
kozalak: çam, sert, kahverengi, düşmek, orman
yağmur ormanı: amazon, nemli, sık, tropik, hayvan
savan: afrika, aslan, zürafa, ot, düz
kanyon: derin, vadi, kaya, nehir, dar
vadi: dağ, arası, çukur, nehir, yeşil
yayla: yüksek, karadeniz, yaz, dağ, ev
plato: düz, yüksek, düzlük, dağ, ova
ova: düz, tarla, verimli, geniş, toprak
bataklık: çamur, sivrisinek, su, batmak, kurbağa
göl kenarı: su, piknik, kuğu, sakin, kıyı
dere: küçük nehir, akmak, su, taş, köy
şelale sesi: su, düşmek, gürültü, doğa, akmak
dalga: deniz, köpük, sörf, kıyı, yükselmek
gelgit: deniz, ay, çekilmek, yükselmek, okyanus
tsunami: dev dalga, deprem, deniz, felaket, sahil
kasırga: fırtına, rüzgar, dönmek, yıkım, amerika
hortum: rüzgar, dönmek, huni, fırtına, emmek
çığ: kar, dağ, kaymak, tehlike, kayak
heyelan: toprak kayması, yağmur, yamaç, ev, felaket
kuraklık: susuz, yağmur yok, toprak çatlaması, sıcak, kıtlık
sıcak hava dalgası: yaz, termometre, bunaltıcı, güneş, ter
don: buz, soğuk, gece, sıfır altı, bitki
kırağı: beyaz, sabah, soğuk, çimen, buz
çiy: sabah, damla, yaprak, ıslak, su
rüzgar gülü: elektrik, dönmek, kanat, enerji, rüzgar
güneş paneli: enerji, çatı, elektrik, güneş, temiz
mevsim: dört, yaz, kış, bahar, sonbahar
hava durumu: tahmin, sıcaklık, yağmur, televizyon, meteoroloji
# Kültür, sanat ve eğlence (2)
opera: şarkı, soprano, sahne, klasik, yüksek ses
bale: dans, parmak ucu, tütü, kuğu gölü, sahne
orkestra: şef, müzisyen, enstrüman, senfoni, konser
şef: orkestra, baton, yönetmek, konser, el
koro: şarkı, grup, birlikte, ses, okul
rap: şarkı, hızlı, söz, ritim, sokak
rock müzik: gitar, davul, sert, konser, saç
caz: saksafon, doğaçlama, müzik, kulüp, amerika
arabesk: dertli, şarkı, türk, damar, müzik
türkü: halk, bağlama, anonim, yöresel, şarkı
pop müzik: popüler, şarkı, liste, klip, dans
klip: şarkı, video, çekim, müzik, yayınlamak
albüm: şarkı, kayıt, sanatçı, kapak, çıkarmak
plak: pikap, eski, siyah, müzik, döndürmek
kaset: eski, şerit, teyp, müzik, kalem
mikrofon: konuşmak, ses, sahne, şarkı, yükseltmek
hoparlör: ses, yüksek, müzik, bas, kablo
festival: konser, kalabalık, çadır, müzik, yaz
sergi: tablo, sanat, galeri, müze, gezmek
galeri: tablo, sanat, sergi, duvar, satmak
karikatür: çizim, komik, gazete, mizah, abartı
çizgi roman: süper kahraman, kare, konuşma balonu, çizim, dergi
anime: japon, çizgi film, büyük göz, manga, dizi
manga: japon, çizgi roman, sağdan sola, siyah beyaz, kitap
sinema bileti: koltuk, salon, film, gişe, patlamış mısır
fragman: film, kısa, tanıtım, video, yakında
senaryo: film, yazmak, diyalog, sahne, hikaye
altyazı: film, yazı, çeviri, okumak, alt
dublaj: ses, çeviri, film, seslendirmek, türkçe
oscar: ödül, film, heykelcik, hollywood, altın
kırmızı halı: ünlü, ödül, fotoğraf, şık, gala
sahne korkusu: heyecan, seyirci, titremek, konuşmak, panik
stand up: komedi, mikrofon, tek kişi, gülmek, sahne
skeç: kısa, komedi, oyun, sahne, rol
kukla: ip, oyuncak, tiyatro, el, çocuk
karagöz: hacivat, gölge oyunu, perde, tasvir, geleneksel
meddah: hikaye, anlatmak, mendil, sopa, geleneksel
ebru: su, boya, kağıt, desen, sanat
hat sanatı: yazı, kalem, arapça, güzel yazı, osmanlı
çini: mavi, seramik, desen, iznik, duvar
seramik: kil, pişirmek, çömlek, fırın, tabak
çömlekçi: kil, çark, çömlek, şekil vermek, el
örgü: şiş, yün, kazak, ilmek, anneanne
dikiş: iğne, iplik, makine, kumaş, terzi
nakış: iğne, iplik, desen, kumaş, işlemek
origami: kağıt, katlamak, japon, kuş, şekil
graffiti: duvar, sprey, boya, sokak, yazı
dövme: deri, iğne, mürekkep, kalıcı, kol
lunapark treni: hız, çığlık, ray, korku, eğlence
dönme dolap: lunapark, yüksek, dönmek, manzara, kabin
çarpışan araba: lunapark, çarpmak, elektrik, çocuk, eğlence
korku tüneli: lunapark, karanlık, çığlık, hayalet, vagon
sihirbazlık gösterisi: tavşan, şapka, kart, numara, sahne
kutu oyunu: masa, zar, piyon, aile, kart
satranç tahtası: siyah beyaz, kare, şah, vezir, piyon
puzzle: parça, birleştirmek, resim, yapboz, masa
escape room: kaçış, oda, bulmaca, ipucu, kilit
bowling salonu: labut, top, ayakkabı, pist, strike
paintball: boya, silah, takım, maske, vurmak
lazer tag: ışık, takım, yelek, karanlık, vurmak
# Günlük hayat ve gelenekler
sabah sporu: koşu, erken, egzersiz, park, enerji
kahvaltı sofrası: peynir, zeytin, çay, yumurta, pazar
pazar kahvaltısı: geç, uzun, aile, menemen, sofra
akşam yemeği: aile, sofra, gece, yemek, masa
öğle yemeği: öğlen, yemekhane, mola, iş, öğün
yemek tarifi: malzeme, pişirmek, adım, ölçü, mutfak
bulaşık yıkamak: tabak, deterjan, lavabo, sünger, kirli
çamaşır asmak: mandal, ip, balkon, kurutmak, ıslak
ev temizliği: süpürmek, toz almak, silmek, cumartesi, paspas
bahar temizliği: perde, cam, halı, büyük temizlik, yıkamak
cam silmek: pencere, bez, iz, temiz, sprey
toz almak: bez, mobilya, temizlik, raf, hapşırmak
yatak toplamak: sabah, çarşaf, yastık, düzeltmek, yorgan
alışveriş listesi: market, kağıt, unutmak, yazmak, ihtiyaç
market arabası: tekerlek, itmek, alışveriş, doldurmak, kasa
indirim reyonu: ucuz, etiket, kampanya, market, fırsat
taksit: kredi kartı, ödeme, ay, bölmek, borç
fatura: elektrik, su, ödemek, ay sonu, doğalgaz
kira günü: ev sahibi, ödemek, ay, para, daire
taşınmak: ev, koli, kamyon, eşya, yeni
ev arkadaşı: paylaşmak, kira, üniversite, oda, beraber
komşuluk: kapı, yardım, tuz istemek, apartman, selam
misafirlik: ikram, ziyaret, çay, oturmak, akraba
el öpmek: bayram, büyükler, harçlık, saygı, alın
bayram harçlığı: para, çocuk, el öpmek, şeker, cep
bayram şekeri: lokum, akide, kapı, çocuk, kutu
kurban bayramı: koyun, et, dağıtmak, kesmek, bayram
iftar: ramazan, oruç, akşam, top atışı, sofra
sahur: ramazan, gece, davul, oruç, yemek
ramazan davulcusu: sahur, davul, gece, mahalle, mani
hıdrellez: bahar, dilek, gül ağacı, ateş atlamak, mayıs
nevruz: bahar, ateş, bayram, mart, yeni gün
kına: gelin, kırmızı, el, kına gecesi, yakmak
gelin arabası: düğün, süslü, korna, konvoy, çiçek
düğün salonu: dans, gelin, damat, takı, halay
takı töreni: altın, düğün, takmak, kurdele, gelin
nişan yüzüğü: parmak, söz, kurdele, kesmek, altın
söz kesmek: aile, evlilik, istemek, kız, çay
kız isteme: tuzlu kahve, damat, aile, söz, çiçek
sünnet düğünü: erkek çocuk, kıyafet, kutlama, asa, şapka
lohusa şerbeti: doğum, kırmızı, bebek, anne, ziyaret
diş buğdayı: bebek, ilk diş, kutlama, buğday, seçmek
askerlik: vatan, kışla, üniforma, yemin, uğurlama
asker uğurlaması: davul, konvoy, gitmek, aile, bayrak
taziye: cenaze, baş sağlığı, ziyaret, üzüntü, ölüm
mevlit: dua, lokum, şerbet, cami, okumak
kandil: gece, simit, cami, ışık, mübarek
çay ocağı: bardak, işyeri, ocakçı, demlik, tepsi
mahalle kahvesi: okey, çay, emekli, gazete, masa
pazar yeri: tezgah, sebze, bağırmak, ucuz, file
semt pazarı: haftalık, tezgah, file, sebze, pazarlık
kapalı otopark: araba, kat, bilet, karanlık, park
toplu taşıma: otobüs, metro, kart, kalabalık, durak
istanbulkart: metro, basmak, otobüs, para yüklemek, turnike
turnike: geçiş, kart, metro, dönmek, giriş
otobüs durağı: beklemek, sıra, tabela, gelmek, kalabalık
aktarma: metro, otobüs, değiştirmek, yolculuk, hat
trafik sıkışıklığı: korna, yavaş, akşam, yoğun, araba
köprü trafiği: istanbul, boğaz, yoğun, sabah, beklemek
kırmızı ışık: durmak, trafik, beklemek, lamba, yeşil
yaya geçidi: zebra, çizgi, karşıdan karşıya, ışık, yaya
park cezası: polis, yanlış park, çekici, para, kağıt
çekici: araba, götürmek, park, bozuk, kamyon
lastik patlaması: tekerlek, yol, stepne, değiştirmek, kriko
stepne: yedek lastik, bagaj, patlamak, değiştirmek, tekerlek
bagaj: arka, araba, valiz, açmak, yük
emniyet kemeri: takmak, araba, güvenlik, ceza, bağlanmak
ehliyet sınavı: direksiyon, sürüş, kural, park, geçmek
hava alanı güvenliği: x ray, bavul, kemer çıkarmak, sıra, kontrol
pasaport: ülke, vize, yurt dışı, fotoğraf, kimlik
vize: pasaport, ülke, başvuru, konsolosluk, izin
gümrük: ülke, eşya, kontrol, vergi, sınır
check-in: otel, havalimanı, kayıt, bagaj, bilet
rezervasyon: önceden, yer ayırmak, otel, restoran, masa
oda servisi: otel, yemek, telefon, kapı, sipariş
her şey dahil: otel, tatil, sınırsız, yemek, içki
kumsal: plaj, havlu, deniz, kum, şezlong
şezlong: plaj, uzanmak, güneş, şemsiye, havuz
güneş kremi: koruma, plaj, yanmak, sürmek, faktör
bronzlaşmak: güneş, ten, plaj, esmer, kahverengi
deniz kabuğu: plaj, kum, toplamak, deniz, salyangoz
kumdan kale: plaj, kova, çocuk, inşa etmek, dalga
şnorkel: dalmak, deniz, maske, nefes, balık
can simidi: yüzmek, kurtarmak, havuz, şişme, deniz
cankurtaran: plaj, kurtarmak, düdük, havuz, yüzücü
kamp çadırı: kurmak, doğa, uyku tulumu, kazık, açık hava
uyku tulumu: kamp, fermuar, uyumak, sıcak, çadır
el feneri ışığı: karanlık, kamp, pil, gece, aydınlatmak
# Kavramlar ve deyimler (2)
şans eseri: tesadüf, beklenmedik, rastgele, birden, kader
kader: alın yazısı, yazgı, şans, olacak, hayat
tesadüf: rastlantı, beklenmedik, şans, birden, buluşmak
deja vu: daha önce, yaşamak, tanıdık, his, tekrar
nostalji: geçmiş, özlem, eski, çocukluk, anı
anı: geçmiş, hatıra, fotoğraf, hatırlamak, eski
hayal kırıklığı: beklenti, üzülmek, umut, olmamak, kırılmak
umut: beklemek, iyi olacak, gelecek, inanmak, ışık
hedef: amaç, ulaşmak, plan, gelecek, başarı
başarı: kazanmak, çalışmak, hedef, zafer, sonuç
başarısızlık: kaybetmek, olmamak, hata, düşmek, deneme
rekabet: yarış, rakip, kazanmak, mücadele, birinci
takım ruhu: birlikte, işbirliği, takım, dayanışma, beraber
liderlik: yönetmek, takım, öncülük, kaptan, karar
özgürlük: serbest, bağımsız, kuş, kafes, hak
adalet: hak, hukuk, terazi, mahkeme, eşitlik
eşitlik: aynı, adalet, hak, denge, fark yok
dostluk: arkadaş, güven, sadakat, kardeş, yakın
sadakat: bağlılık, köpek, güven, aldatmamak, dostluk
güven: inanmak, sırdaş, dost, emin, kırılmak
ihanet: arkadan vurmak, aldatmak, güven, satmak, düşman
fedakarlık: vermek, kendinden, anne, özveri, sevgi
cimrilik: para, harcamamak, eli sıkı, pinti, vermemek
cömertlik: vermek, bonkör, el açık, paylaşmak, ikram
kibir: kendini beğenmek, burnu havada, gurur, ukala, büyüklenmek
alçakgönüllülük: mütevazı, kibirsiz, sade, gösterişsiz, kendini övmemek
sabırsızlık: beklemek, acele, hemen, huzursuz, sabır
merakla beklemek: heyecan, sabırsız, sonuç, gelecek, an
sürpriz parti: doğum günü, gizli, saklanmak, arkadaş, şaşırtmak
son dakika: geç, acele, son an, haber, panik
plan yapmak: program, liste, gelecek, düzen, hazırlık
moral bozukluğu: üzgün, keyifsiz, mutsuz, kötü gün, çökmek
pozitif düşünmek: iyimser, olumlu, umut, güzel, bardağın dolu tarafı
bardağın dolu tarafı: iyimserlik, olumlu, yarısı, bakmak, boş taraf
yalancının mumu: yatsıya kadar, söndürmek, yalan, ortaya çıkmak, atasözü
damlaya damlaya göl olur: biriktirmek, az az, atasözü, su, sabır
sakla samanı: gelir zamanı, atasözü, biriktirmek, saman, lazım
ayağını yorganına göre uzat: atasözü, harcamak, bütçe, ölçülü, yatak
dereyi görmeden paçaları sıvamak: acele, erken, atasözü, su, pantolon
etekleri zil çalmak: çok sevinmek, deyim, mutlu, zıplamak, ses
kulak misafiri olmak: duymak, istemeden, dinlemek, deyim, konuşma
gözden düşmek: değer kaybetmek, deyim, sevilmemek, itibar, güven
burnundan solumak: çok kızgın, deyim, öfke, nefes, sinir
pire için yorgan yakmak: deyim, küçük şey, büyük zarar, abartmak, öfke
`;
if (typeof module !== 'undefined' && module.exports) module.exports = TABU_KARTLAR;
