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
`;
if (typeof module !== 'undefined' && module.exports) module.exports = TABU_KARTLAR;
