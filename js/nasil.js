// "❓ Nasıl oynanır?": Oyun Salonu'nda ve her oyunun üst çubuğunda. Tıklayınca oyunların listesi (ya da açık oyunun
// anlatımı) açılır; okuyup kapatınca oyun kaldığı yerden devam eder (oyun durmaz, sadece üstüne pencere açılır).
// İçerik: amaç, adım adım nasıl oynanır, puan, kısayollar/ipuçları. Yeni oyun eklenince buraya da bir kayıt eklenir.
(function(){
  const N = [
    // ---------- masa oyunları ----------
    { id: 'hax', tur: 'masa', ikon: '🥅', ad: 'Canlı Futbol 1v1', kisi: '2 kişi ya da bota karşı',
      amac: 'Yuvarlak oyuncunu sürüp topu rakip kaleye şutlamak. Süre bitince en çok golü atan kazanır.',
      adim: [
        'Masa açarken modu (bota karşı / iki kişi), süreyi (isterseniz kendiniz belirleyebilirsiniz) ve bot zorluğunu seçebilirsiniz.',
        'Bilgisayarda W A S D ya da yön tuşlarıyla hareket edebilir, topun yanındayken SPACE ile şut çekebilirsiniz.',
        'Telefonda sol alttaki joystick ile hareket edebilir, sağ alttaki ŞUT düğmesine basabilirsiniz.',
        'Topa çarparak da sürebilirsin; şut tuşuna basılıyken oyuncun biraz yavaşlar ama sert vurur.',
        'Sağdaki hızlı mesajlarla (bilgisayarda 1-6 tuşları) rakibine laf atabilirsin; mesaj oyuncunun üstünde balon olarak çıkar.',
        'Gol olunca herkes yerine döner; santrada rakip yarı sahaya geçilmez.'
      ],
      puan: 'Her gol 1 puan. Süre bittiğinde eşitlik varsa ALTIN GOL: ilk golü atan kazanır.',
      ipucu: ['Kendi kalen her zaman solda (telefon dik tutulunca altta) görünür; tuşlar ekrana göre çalışır.', 'Masayı açan kişinin sekmesi açık kalsın; oyunun fiziğini onun bilgisayarı hesaplar.'] },

    { id: 'futbol', tur: 'masa', ikon: '⚽', ad: 'Taş Futbolu', kisi: '2 kişi ya da bota karşı',
      amac: 'Taşlarınla topa vurup rakip kaleye sokmak. Belirlenen gol sayısına ilk ulaşan kazanır.',
      adim: [
        'Her takımın 5 yuvarlak taşı var: 🔴 Kırmızı solda, 🔵 Mavi sağda (kendi kalen her zaman solda ya da telefonda altta görünür).',
        'Sıra sizdeyken taşlarınızdan birine basıp parmağınızı / farenizi geriye doğru çekebilirsiniz. Taşın yanında yeşilden kırmızıya dolan şiddet barı ve gideceği yönü gösteren noktalı çizgi çıkar.',
        'Bırakınca taş fırlar; taşlar ve top birbirine çarpıp seker.',
        'Bütün taşlar ve top durunca sıra rakibe geçer.',
        'Her hamlenin bir süresi var; süre dolarsa sıran geçer.',
        'Gol olunca taşlar yerine döner, golü yiyen takım başlar.'
      ],
      puan: 'Her gol 1 puan. Masa açarken seçilen gol sayısına (1, 3, 5, 7) ilk ulaşan kazanır.',
      ipucu: ['Topa tam arkasından değil, biraz yanından vurursan açılı gider.', 'Duvarlardan sektirerek de gol atabilirsin.', 'Az çekip bırakırsan atış olmaz, taş seçili kalır.'] },

    { id: 'hokey', tur: 'masa', ikon: '🏒', ad: 'Hava Hokeyi', kisi: '2 kişi ya da bota karşı',
      amac: 'Tokmağınla pukı rakibin kalesine sokmak. Süre bitince en çok golü atan kazanır.',
      adim: [
        'Masa açarken modu seçebilirsiniz: “Tek oyunculu” bota karşı hemen başlar, “Çok oyunculu”da arkadaşınız mavi koltuğa oturur.',
        'Süreyi sen belirle: 1, 2, 3, 5, 10 dakika ya da “Kendim belirleyeyim” ile istediğin süre (yarım dakikadan 30 dakikaya kadar).',
        'Bilgisayarda fareyi oynattığınızda tokmak peşinden gelir. Telefonda parmağınızla sürükleyebilirsiniz.',
        'Kendi yarı sahandan çıkamazsın. Kendi kalen her zaman solda (telefon dik tutulunca altta) görünür.',
        'Pukı hızlı vurmak için tokmağı ona doğru hızla sür; duvarlardan sektirerek de gol atabilirsin.',
        'Maç bitince masayı açan yeni maç başlatır; isterse süreyi ve modu değiştirir.'
      ],
      puan: 'Her gol 1 puan. Süre bittiğinde eşitlik varsa ALTIN GOL: ilk golü atan kazanır.',
      ipucu: ['Bot zorluğunu masa açarken seçebilirsin: kolay, orta, zor.', 'Masayı açan kişinin sekmesi açık kalsın; oyunun fiziğini onun bilgisayarı hesaplar.', 'Sağ üstteki 🔊 düğmesiyle oyun seslerini kapatabilirsin.'] },

    { id: 'tabu', tur: 'masa', ikon: '🤐', ad: 'Tabu', kisi: '2-10 kişi · sesli',
      amac: 'Kartın üstündeki kelimeyi, altındaki yasaklı kelimeleri söylemeden anlatıp arkadaşlarına buldurmak.',
      adim: [
        'Biri masa açar, herkes bir koltuğa oturur. Masayı açan “Oyunu başlat”a basar.',
        '4 ve daha fazla kişide iki takım olur: 🔴 Kırmızı ve 🔵 Mavi. 2-3 kişide herkes kendi için oynar.',
        'Sırası gelen anlatıcı kartı görür ve süre bitene kadar SESLİ anlatır. Yasaklı kelimeleri ve kelimenin kendisini söylemek yok!',
        'Kendi takımı sesli tahmin eder. Bilen olunca anlatıcı “✓ Doğru”ya basar ve yeni kart gelir.',
        'Bilemeyeceğini düşünürsen “⏭ Pas” de: her turda 3 pas hakkın var.',
        'Rakip takım da kartı görür. Anlatıcı yasaklı kelime söylerse “TABU!”ya basar.'
      ],
      puan: 'Doğru +1, Tabu −1, Pas cezasız. Tüm turlar bitince en çok puanı alan takım (ya da kişi) kazanır.',
      ipucu: ['Mikrofonlar açık olsun, oyun tamamen sesli.', 'Oyun başladıktan sonra gelenler de oturup katılabilir.'] },

    { id: 'ciz', tur: 'masa', ikon: '🎨', ad: 'Çiz ve Tahmin Et', kisi: '2-8 kişi',
      amac: 'Çizen kişinin çizdiği kelimeyi herkesten önce bulmak.',
      adim: [
        'Masaya oturun, masayı açan “Oyunu başlat”a bassın.',
        'Sırası gelen kişiye 3 kelime gösterilir, birini seçer. Kelimeyi sadece o görür.',
        'Çizen, süre bitene kadar kelimeyi çizer. Yazı yazmak ve harf çizmek yok!',
        'Diğerleri tahminlerini alttaki kutuya yazar. Doğru tahmin edenin kelimesi gizli kalır, herkese sadece “bildi!” görünür.',
        'Süre ilerledikçe kelimenin bazı harfleri ipucu olarak açılır.',
        'Herkes her turda bir kez çizer; seçilen tur sayısı bitince oyun biter.'
      ],
      puan: 'Erken bilen daha çok puan alır. Çizen de kelimeyi bilen her kişi için puan kazanır. Sonda en çok puanı olan kazanır.',
      ipucu: ['Telefonda parmağınla çizebilirsin.', 'Yanlış tahminler sohbet gibi görünür, bol bol deneyebilirsiniz.'] },

    { id: 'isimsehir', tur: 'masa', ikon: '📝', ad: 'İsim-Şehir', kisi: '2-8 kişi',
      amac: 'Zarla çıkan harfle başlayan isim, şehir, hayvan, bitki, eşya… kutularını doğru, hızlı ve herkesten farklı doldurmak.',
      adim: [
        'Masaya oturun, masayı açan tur sayısını (3, 5, 10, 15 ya da 20) seçip “Oyunu başlat”a bassın.',
        'Her tur 🎲 harf zarı atılır; zar hangi harfte durursa o harf oynanır. Bir oyunda aynı harf ikinci kez gelmez (çıkan harfler üstte yazar).',
        'Bütün kategorileri tam o harfle başlayan kelimelerle doldur. Ç yerine C, Ş yerine S, İ yerine I sayılmaz.',
        'Hepsini dolduran “🛑 Bitirdim!”e basar; diğerlerine 5 saniye kalır. Süre biterse de tur kapanır.',
        'Cevaplar sözlükle denetlenir: her kategorinin kendi listesi var (isimler, il ve ilçeler, dünya şehirleri, ülkeler, hayvanlar, bitkiler, eşyalar, meslekler, yemekler).',
        'Aynı kelimeyi birden fazla kategoriye yazarsan (ör. her yere “Ali”) o kelimeden hiç puan alamazsın. Anlamsız harf yığınları da otomatik geçersiz.',
        'Sözlükte olan cevaba itiraz edebilirsin (👎); diğer oyuncuların çoğunluğu itiraz ederse sayılmaz.',
        'Sözlükte olmayan cevap ancak diğer oyuncuların çoğunluğu 👍 kabul ederse sayılır ve yarım puan alır.',
        'Oyun bitince kazanan, masadaki birine 👋 tokat, 🦵 tekme gibi bir “ceza” verir; kime ne yaptığı herkesin ekranında ve sohbette görünür.'
      ],
      puan: 'O kategoride geçerli cevabı olan tek kişiysen 20, cevabın kimseyle aynı değilse 10, başkasıyla aynıysa 5; sözlükte olmayıp onay alan cevap bunların yarısı. Boş, harfi tutmayan, tekrar eden ya da itirazla düşen cevap 0.',
      ipucu: ['Geniş seçenekte Ülke, Meslek ve Yemek de eklenir (8 kategori).', 'Herkesin aklına gelmeyecek ama sözlükte olan cevaplar en çok puanı getirir.', 'Türkçe karakterleri doğru yazmanız gerekir: “Çorum” Ç harfinde geçer, C harfinde geçmez.'] },

    { id: 'dedektif', tur: 'masa', ikon: '🕵️', ad: 'Kara Dosyalar', kisi: '1-8 kişi · ortak',
      amac: 'Ekip olarak bir cinayet vakasını çözmek: mekanları gezip delil toplayın, birbirinize anlatın ve doğru katili doğru kanıtlarla suçlayın.',
      adim: [
        'Masaya oturun, masayı açan başlatsın. Başta oylama yapılır: 👥 Toplu gezersiniz (biri bir mekana gidince herkes gider, bulunan her delil ortak) ya da 🧭 Ayrı gezersiniz (herkes kendi başına, bulduğunu ortak deftere asar).',
        'Sahnedeki nesnelere tıkla (🔍 tuşu tıklanabilir yerleri gösterir). Belgeler okunur, kasetler dinlenir; bazı nesneleri kaydırıcıyla çevirip gizli yüzünü bulman gerekir.',
        'Yeni mekanlar delil buldukça açılır: 🗺 Mekanlar’dan gidersin.',
        'Sağdaki 📒 Ortak defter’e fikirlerinizi ve delilleri yazabilirsiniz; herkes 👍 / 👎 ile oylar. ✏️ Notlarım sadece sizindir.',
        'Takılırsanız 💡 İpucu: aynı aşamada ilk ipucu hafif bir dürtme, ikincisi delil bağlantısı, üçüncüsü tam çözüm. Her biri puandan düşer.',
        'Hazır olunca ⚖️ Katili Suçla: herkes bir şüpheli ve en fazla 2 kanıt seçer, çoğunluğun kararı geçer.'
      ],
      puan: 'Ekip 1000 puanla başlar; ipuçları 30 / 60 / 120 düşer. Doğru katil + iki güçlü kanıt (farklı türden) = dava kapanır, puanın tamamı. Doğru katil ama zayıf kanıt = katil kaçar, puanın %40’ı. Yanlış kişi = 0.',
      ipucu: ['Sesleri açık oynayın: bazı ipuçları kulakla bulunur.', 'Aynı türden iki kanıt tek kanıt sayılır; farklı yönlerden kanıt seçin.', 'Telefonda tıklanabilir yerler hafif yanıp sönen noktalarla gösterilir.'] },

    { id: 'vampir', tur: 'masa', ikon: '🧛', ad: 'Vampir Köy', kisi: '3-10 kişi · sesli',
      amac: 'Köylüler: görevleri bitirmek ya da vampirleri bulup köyden kovmak. Vampirler: fark edilmeden köylüleri ısırmak.',
      adim: [
        'Masaya oturun, masayı açan başlatsın. Herkes gizlice rolünü öğrenir: 🧑‍🌾 köylü ya da 🧛 vampir.',
        'Köyde dolaş: bilgisayarda ok tuşları / W A S D, telefonda ekrandaki joystick.',
        'Köylüyseniz sarı parlayan yerlere gidip görevlerinizi yapabilirsiniz (E ya da boşluk ile kullanılır).',
        'Vampirsen yalnız bulduğun birinin yanında 🩸 Isır (Q). Mezarlardan 🪦 gizlice geçebilir (V), fenerleri 🌑 söndürebilirsin (F).',
        'Ceset görürsen 📢 Bildir (R). Şüphelendiğin biri varsa meydandaki 🔔 çanı çal.',
        'Toplantıda herkes konuşur, sonra oylama yapılır. En çok oyu alan köyden kovulur.',
        'Isırılan kişi 👻 hayalet olur: yaşayanlar onu duymaz ama görevlerini yaparak köylülere yardım edebilir.'
      ],
      puan: 'Köylüler bütün görevler biterse ya da bütün vampirler kovulursa kazanır. Vampirler, sayıları köylülere eşitlenirse (ya da ayarlıysa süre dolarsa) kazanır.',
      ipucu: ['Vampirler de görev yapıyormuş gibi dolaşır; ona göre şüphelen!', 'Görev penceresini Esc ile kapatabilirsin.', 'Tuşları beğenmediysen üst çubuktaki ⌨️ Tuşlar’dan istediğin gibi değiştirebilirsin.'] },

    { id: 'batak', tur: 'masa', ikon: '♠️', ad: 'Batak', kisi: '4 kişi · bot eklenebilir',
      amac: 'İhalede söylediğin kadar eli (ya da daha fazlasını) almak.',
      adim: [
        'Masayı açıp eksik koltuklara 🤖 bot ekleyebilirsiniz. Herkese 13 kart dağıtılır.',
        'İhale: herkes sırayla öncekinden yüksek teklif verir ya da “Pas” der (tekli en az 4, eşli en az 7).',
        'İhaleyi alan kozu seçer ve ilk eli açar.',
        'Açılan renge uymak zorunlu; uyarken yerdeki kartı geçebiliyorsan büyük atmak zorunlu.',
        'O renk elinde yoksa koz atmak zorunlu; koz da yoksa istediğin kartı atarsın.',
        'Koz kırılmadan (biri koz atmadan) kozla el açılamaz. Eli en büyük koz, koz yoksa açılan rengin en büyüğü alır.'
      ],
      puan: 'İhaleyi alan söylediği kadar el alırsa aldığı el kadar artı, alamazsa ihale kadar eksi (battı). Diğerleri aldıkları el kadar artı yazar. Koz Maça’da: sözünü tutturan 10 × söz, tutturamayan −10 × söz.',
      ipucu: ['Eşli oyunda karşılıklı oturanlar takımdır.', 'Atabileceğin kartlar parlak, atamayacakların sönük görünür.'] },

    { id: 'emlak', tur: 'masa', ikon: '🏙️', ad: 'Emlak Oyunu', kisi: '2-6 kişi · bot eklenebilir',
      amac: 'Tapu satın alıp ev ve otel kurarak kira toplamak, diğer oyuncuları iflas ettirip ayakta kalan tek kişi olmak.',
      adim: [
        'Masayı açabilirsiniz, 2-6 kişi oturabilir (boş koltuğa 🤖 bot ekleyebilirsiniz). Herkesin kendi piyonu var: 🥯 simit, ⛴️ vapur, 🕊️ martı, 🍵 çay bardağı, 🐱 kedi, 🐟 balık. Herkes ₺1500 ile başlar; ilk oyuncu kurayla belirlenir.',
        'Sırası gelen “🎲 Zar at” der ve iki zarın toplamı kadar tahtada ilerler (Başla\'dan sola doğru). Çift atarsan bir kez daha atarsın; üst üste 3 çift atarsan cezaevine gidersin.',
        'Başla\'dan her geçişte bankadan ₺200 alırsın.',
        'Sahipsiz bir tapuya gelirsen “Satın al” diyebilirsin. İstemezsen ya da paran yetmezse tapu açık artırmaya çıkar: sırayla teklif verilir ya da pas denir, en yüksek teklif alır.',
        'Sahibi olan bir tapuya gelirsen sahibine kira ödersin. İpotekli tapudan kira alınmaz.',
        'Aynı renkteki bütün tapular bir kişideyse o renk seti tamamlanmıştır: evsiz tapuların kirası 2 katına çıkar ve ev yapılabilir. Evler her renkte eşit yapılır (bir tapuya 2. evi yapmak için setteki hepsinde 1 ev olmalı). 4 evden sonra aynı tapuya otel kurulur. Bankada 32 ev ve 12 otel var.',
        '❓ Şans ve 🎁 Kamu Fonu karelerine gelince bir kart çekilir; kart anında uygulanır. “Cezadan Çık” kartını saklayabilirsin.',
        'Vergi karelerine gelirsen bankaya ödersin. “Hapse Git” karesine gelirsen doğrudan cezaevine gidersin (Başla\'dan geçmeden).',
        'Cezaevinden çıkmak için çift atabilir, ₺50 ödeyebilir ya da “Cezadan Çık” kartını kullanabilirsiniz. 3 turda çift atamazsanız ₺50 zorunlu ödenir. Cezaevindeyken kira toplamaya devam edersiniz.',
        'Paran yetmezse: ev/otel sat (yapının yarı fiyatını alırsın) ya da tapuyu ipotek et (yarı fiyatını alırsın; ipoteği kaldırmak için %10 fazlasını ödersin). Yine de borcu ödeyemezsen iflas edersin: bütün varlığın alacaklıya (banka ise bankaya) geçer.',
        '🤝 Takas: istediğin oyuncuya tapu, para ve “Cezadan Çık” kartı teklif edebilirsin. Karşı taraf kabul ederse takas olur. Evli setlerde önce yapıların satılması gerekir.'
      ],
      puan: 'Klasik oyun: herkesi iflas ettiren son oyuncu kazanır. Kısa oyun: herkes 2 tapuyla başlar, ev yapmak için 3\'lü renklerde 2 tapu yeter ve ilk iflas olduğunda oyun biter; en zengin (nakit + tapu + yapı değeri) kazanır.',
      ipucu: ['Tahtadaki bir kareye (telefonda dokunarak) tıklayınca tapu kartı ve kira tablosu açılır.', 'Turuncu ve kırmızı renkler, çok uğranıldığı için en kârlı tapular arasındadır; istasyonları toplamak da güvenli gelir getirir.', 'Elinde nakit tut: kira ve vergiler beklenmedik gelir.', 'Telefonun ya da bilgisayarın yavaşsa üstteki “⚡ Hafif mod” ile 3 boyutlu görünümü kapatabilirsin.', 'Sıran gelince uzun süre hamle yapmazsan oyun senin yerine otomatik oynar.'],
      tablolar: () => {
        const C = window.EmlakCore; if (!C) return [];
        const m = n => '₺' + n.toLocaleString('tr-TR');
        const ad = { brown: 'Kahverengi', lblue: 'Açık mavi', pink: 'Pembe', orange: 'Turuncu', red: 'Kırmızı', yellow: 'Sarı', green: 'Yeşil', dblue: 'Koyu mavi' };
        const sat = [];
        Object.keys(C.GROUPS).forEach(g => C.GROUPS[g].forEach(i => { const T = C.TILES[i]; sat.push({ renk: C.GRP[g].c, c: [T.n + ' (' + ad[g] + ')', m(T.price), m(T.rent[0]), m(T.rent[1]), m(T.rent[2]), m(T.rent[3]), m(T.rent[4]), m(T.rent[5]), m(T.h)] }); }));
        return [
          { baslik: '🏷 Tapular: fiyat ve kiralar', bas: ['Tapu', 'Fiyat', 'Kira', '1 ev', '2 ev', '3 ev', '4 ev', 'Otel', 'Ev/otel'], sat, not: 'Renk setini tamamlayınca evsiz tapuların kirası 2 katı olur. İpotek değeri tapu fiyatının yarısıdır.' },
          { baslik: '🚂 İstasyonlar ve 💡 şirketler', bas: ['', 'Fiyat', 'Kira'], sat: [
            { c: ['İstasyonlar (Haydarpaşa, Sirkeci, Ankara, Basmane)', m(200), '1 istasyon ₺25 · 2 istasyon ₺50 · 3 istasyon ₺100 · 4 istasyon ₺200'] },
            { c: ['Şirketler (Elektrik, Su)', m(150), 'Biri sendeyse zar × 4 · ikisi de sendeyse zar × 10'] }
          ] },
          { baslik: '💰 Maaş, vergi ve ceza', bas: ['', 'Tutar'], sat: [
            { c: ['Başla\'dan geçiş', '+' + m(C.GO_PAY)] }, { c: ['Gelir Vergisi', m(200)] }, { c: ['Lüks Vergi', m(100)] },
            { c: ['Cezaevinden ₺ ile çıkış', m(C.JAIL_FINE)] }, { c: ['İpotek kaldırma', 'ipotek bedeli + %10'] }, { c: ['Başlangıç parası', m(1500) + ' (masada ₺1000 / ₺2000 de seçilebilir)'] }
          ] }
        ];
      } },

    { id: 'kizma', tur: 'masa', ikon: '🎲', ad: 'Kızma Panpi', kisi: '2-4 kişi · bot eklenebilir',
      amac: 'Kendi rengindeki 4 taşı da tahtayı bir tur dolaştırıp ortadaki BİTİŞ alanına ilk ulaştıran oyuncu kazanır.',
      adim: [
        'Masayı açarken tahtayı seçebilirsiniz: “Ludo” (ahşap tahta, varsayılan) ya da “Klasik kızma birader”. 2-4 kişi oturabilir (boş koltuğa 🤖 bot ekleyebilirsiniz). Renkler kırmızı, yeşil, sarı ve mavi; herkesin köşede kendi yuvasında 4 taşı var.',
        'Sıra belirleme: oyun başlarken herkes zar atar, en yüksek atan başlar (eşitlikte eşitler yeniden atar). Sonra sıra saat yönünde döner.',
        'Sıran gelince turuncu “🎲 ZAR AT” düğmesine basarsın; tek zar, 1-6.',
        'Taşı oyuna sokmak için 6 atmalısın: yuvandan bir taşı kendi renkli başlangıç karene çıkarırsın.',
        '6 atan hamlesini yapar ve bir zar daha atar. Masa ayarında “Üst üste üç 6” açıksa üçüncü 6’da o hamle yanar ve sıra geçer.',
        'Tahtada birden fazla taşınız varsa hangisini oynatacağınızı siz seçersiniz: parlayan taşın üstüne geldiğinizde (telefonda bir kez dokunduğunuzda) gideceği kare görünür; tıklayınca (telefonda ikinci dokunuşta) oynar. Taşlar saat yönünde ilerler.',
        'Rakibin taşının olduğu kareye tam gelirsen onu yersin: o taş yuvasına döner ve sahibinin yeniden 6 atması gerekir.',
        '⭐ Yıldızlı kareler ve her rengin başlangıç karesi güvenlidir: orada duran taş yenmez, farklı renkler aynı karede durabilir.',
        'Kendi iki taşın aynı karede üst üste durabilir. Masa ayarında “Blok kuralı” açıksa aynı renkten iki taş bir blok olur: rakip taşlar o karenin üstünden geçemez, üstüne de konamaz.',
        'Bir tur dolaşan taş kendi rengindeki ev yoluna (ok işaretli yerden) girer, oradan ortadaki BİTİŞ’e gider. Bitişe tam zarla girilir: 3 kare kalmışsa 4 atarsan o taşla oynayamazsın, başka taşını oynatırsın.',
        'Dört taşını da BİTİŞ’e ilk ulaştıran kazanır. (Klasik tahtada taşlar 4 karelik eve girer, kendi taşının üstüne konamaz, hiç taşın yokken 3 deneme hakkın vardır.)'
      ],
      puan: 'Puan yok: dört taşını ilk bitiren kazanır.',
      ipucu: ['Rakibin taşına 1-6 kare yakınsan yenme ihtimalin var; mümkünse yıldızlı güvenli kareye kaç.', 'Atılan zar tahtanın ortasında da görünür.', 'Telefonun yavaşsa üstteki “⚡ Hafif mod” ile 3 boyutlu görünümü kapatabilirsin.', 'Sıran gelince 60 saniye hamle yapmazsan oyun senin yerine oynar.'] },

    { id: 'tekkart', tur: 'masa', ikon: '🟥', ad: 'Tek Kart', kisi: '2-6 kişi · bot eklenebilir',
      amac: 'Elindeki bütün kartları ilk bitiren olmak. Puanlı oyunda eli bitiren, rakiplerin elinde kalan kartların puanını alır; hedef puana ilk ulaşan kazanır.',
      adim: [
        'Masayı açabilirsiniz, 2-6 kişi oturabilir (boş koltuğa 🤖 bot ekleyebilirsiniz). Destede 108 kart var: 4 renk (kırmızı, sarı, yeşil, mavi) × 0-9 sayılar, Pas, Yön değiştir ve +2 kartları; bir de 4 Joker ve 4 Joker +4.',
        'Herkese 7 kart dağıtılır, destenin üstündeki kart yere açılır. Dağıtanın solundaki oyuncu başlar.',
        'Sıran gelince yerdeki kartla aynı renkte, aynı sayıda ya da aynı sembolde bir kart atarsın. Joker her zaman atılabilir. Atabileceğin kartlar parlak görünür.',
        'Atacak kartın yoksa (ya da atmak istemezsen) desteden 1 kart çekersin. Çektiğin kart uyuyorsa hemen oynayabilir ya da elinde tutabilirsin; uymuyorsa sıra geçer.',
        '⊘ Pas: sıradaki oyuncu oynayamaz. ⇄ Yön değiştir: oyun ters yöne döner (iki kişide Pas gibi çalışır). +2: sıradaki oyuncu 2 kart çeker ve sırası geçer.',
        'Joker: istediğin rengi seçersin. Joker +4: rengi seçersin, sıradaki oyuncu 4 kart çeker ve sırası geçer. Ama Joker +4 yalnızca elinde yerdeki renkten kart yokken atılabilir.',
        'Joker +4 gelen oyuncu itiraz edebilir: atan kişi kuralsız attıysa 4 kartı o çeker ve itiraz eden normal oynar; kuralsız değilse itiraz eden 6 kart çeker ve sırası geçer.',
        'Sondan bir önceki kartınızı atarken “📣 TEK!” demelisiniz (kartı atmadan önce TEK düğmesine basabilirsiniz). Demezseniz ve sıradaki oyuncu oynamadan biri “🚨 Yakala” derse 2 kart ceza çekersiniz.',
        'Elindeki son kartı atan eli bitirir. Son kart +2 ya da Joker +4 ise sıradaki oyuncu yine de kartları çeker.',
        'Desteden kart bitince yerdeki kartlar (en üstteki hariç) karıştırılıp yeni deste yapılır. +2 ya da +4 üst üste eklenmez.'
      ],
      puan: 'Eli bitiren, rakiplerinin elinde kalan kartların puanını toplar: sayılar kendi değeri (0-9), Pas · Yön · +2 = 20 puan, Joker · Joker +4 = 50 puan. “Tek el” seçilirse ilk bitiren kazanır; 250 ya da 500 puan seçilirse o puana ilk ulaşan oyunu kazanır.',
      ipucu: ['Jokerleri sona sakla: renk sana uymadığında kurtarır.', 'Sıradaki oyuncunun az kartı kaldıysa Pas, +2 ve Yön kartlarıyla onu durdurabilirsiniz.', 'Rakibin tek kartı kalıp “TEK!” demediyse hızlı olmanız gerekir: Yakala düğmesi sıradaki oyuncu oynayana kadar durur.', 'Sıran gelince 45 saniye içinde oynamazsan oyun senin yerine oynar.'] },

    { id: 'boyut', tur: 'masa', ikon: '📏', ad: 'Boyut Bilmece', kisi: '1-8 kişi · tek başına da oynanır · bot eklenebilir',
      amac: 'Bir şeyin gerçek boyunu, yanındaki bilinen bir şeye bakarak tahmin etmek. Siyah silüetin ölçüsü yazılıdır; beyaz silüeti ona göre büyütüp küçültürsün. Gerçeğe ne kadar yakınsan o kadar puan.',
      adim: [
        'Ekranda iki silüet var: siyah olan referans (adı ve gerçek ölçüsü altında yazar), beyaz olan tahmin edeceğin şey.',
        'Beyaz silüeti alttaki kaydırıcıyla, fare tekerleğiyle, köşedeki ⤢ tutamağı çekerek ya da + / - tuşlarıyla boyutlandır. Silüeti sürükleyip referansın yanına koyabilirsin.',
        'Emin olunca “🔒 Kilitle”ye bas (Enter da olur). Gerçek boyu kırmızıyla açılır; tahminin, sapman ve kısa bir bilgi görünür.',
        'Tek başına oynamak için Oyun Salonu’ndaki “Boyut Bilmece” kartından açabilirsiniz. Günlük 5 ya da 10 soru herkes için aynıdır ve skor tablosuna yazılır; sonra istediğiniz konuda serbest oynayabilirsiniz.',
        'Masada “Toplu”: herkes aynı soruyu aynı anda tahmin eder (40 sn). Herkes kilitleyince tahminler oyuncu renkleriyle üst üste açılır.',
        'Masada “Sıralı”: sırayla oynanır, herkes sıradakinin silüeti nasıl büyütüp küçülttüğünü canlı izler. Her oyuncu kendi sorusunu alır (45 sn).'
      ],
      puan: 'Her soru en fazla 100 puan. %5’e kadar sapma tam puan; yarısı ya da iki katı tahmin 45 puan alır, uzaklaştıkça puan düşer. Masada en çok puanı toplayan kazanır.',
      ipucu: ['Önce birimlere bakabilirsiniz: boy mu, uzunluk mu, kanat açıklığı mı soruluyor?', 'Referansı aklında “kaç tane yan yana/üst üste” diye düşün: zürafa kaç insan boyu?', 'Süre biterken kilitlemediysen o anki tahminin otomatik kilitlenir.'] },

    { id: 'okey', tur: 'masa', ikon: '🀄', ad: 'Okey', kisi: '4 kişi · bot eklenebilir',
      amac: 'Bütün taşlarını per (aynı renk sıralı: 3-4-5) ya da grup (aynı sayı, farklı renk: 7-7-7) yapıp elini bitirmek.',
      adim: [
        'Masayı açıp eksik koltuklara 🤖 bot ekleyebilirsiniz. Herkese 14 taş, başlayana 15 taş gelir.',
        'Ortada gösterge taşı açılır. Göstergenin aynı renkte bir fazlası OKEY’dir ve her taşın yerine geçer.',
        'Sıranız gelince ortadan ya da solunuzdakinin attığı taşı alıp bir taş atabilirsiniz.',
        'Taşları ıstakanızda sürükleyerek dizebilirsiniz. Atmak için taşı seçip “At”a basabilir, çift tıklayabilir ya da sağ alttaki alana sürükleyebilirsiniz.',
        'Bütün taşların perlere/gruplara oturunca son taşı atarak bitirirsin. 7 çift ile de bitebilir (çift bitiş).'
      ],
      puan: 'Klasik Okey’de herkes 20 puanla başlar, el kaybettikçe puan düşer; puanı sıfıra inen oyunu kaybeder. 101 Okey’de el açmak için perlerin toplamı en az 101 olmalı; seçilen el sayısı sonunda en az ceza puanı olan kazanır.',
      ipucu: ['Sahte okey, okey taşının kendisinin yerine geçer.', 'Eşli oyunda karşılıklı oturanlar takımdır.'] },

    { id: 'tavla', tur: 'masa', ikon: '🎲', ad: 'Tavla', kisi: '2 kişi · bot eklenebilir',
      amac: 'Bütün pullarını kendi evine toplayıp rakipten önce dışarı çıkarmak.',
      adim: [
        'Masayı açabilirsiniz; arkadaşınız oturabilir ya da 🤖 bot ekleyebilirsiniz. ⚪ Beyaz ve ⚫ Siyah karşılıklı oynar.',
        'Sıran gelince zar at. Zarlardaki sayılar kadar pullarını ilerletirsin; çift gelirse 4 kez oynarsın.',
        'Oynamak için bir pula, sonra parlayan haneye tıklayabilirsiniz. Pula çift tıklarsanız büyük zarla oynar.',
        'Rakibin tek pulu olan haneye gelirsen pulu kırılır, başa döner. Kırık pulun varsa önce onu sokman gerekir.',
        'İki ya da daha fazla pulun olan hane kapıdır, rakip oraya gelemez.',
        'Bütün pulların evindeyken pullarını toplamaya başlarsın.'
      ],
      puan: 'Normal bitirme 1 puan; rakip hiç pul toplayamadıysa mars, 2 puan. Seçilen puana ilk ulaşan maçı kazanır.',
      ipucu: ['Gidebileceğiniz haneler parlar, emin değilseniz pula tıklayıp bakabilirsiniz.'] },

    // ---------- tek kişilik ----------
    { id: 'kelime', tur: 'tek', ikon: '🔤', ad: 'Kelime Bul', kisi: 'tek kişilik · günlük',
      amac: 'Günün 5 harfli Türkçe kelimesini 6 tahminde bulmak. Herkese aynı kelime çıkar.',
      adim: [
        '5 harfli bir kelime yazıp Enter’a (ya da ekrandaki ENTER tuşuna) basabilirsiniz.',
        '🟩 Yeşil: harf doğru ve yeri doğru. 🟨 Sarı: harf kelimede var ama yeri yanlış. ⬛ Gri: harf kelimede yok.',
        'Renklere bakarak yeni tahmin yapabilirsiniz; 6 hakkınız var.'
      ],
      puan: 'Ne kadar az tahminde ve ne kadar hızlı bulursan o kadar iyi. Skor tablosunda bugün oynayanlarla yarışırsın.',
      ipucu: ['Yazdığın kelime sözlükte olmalı.', 'İlk tahminde sesli harfi bol bir kelime dene.'] },

    { id: 'adam', tur: 'tek', ikon: '🪢', ad: 'Adam Asmaca', kisi: 'tek kişilik',
      amac: 'Asılmadan art arda olabildiğince çok kelime bilmek.',
      adim: [
        'Kelimenin kategorisi yazar, harfleri gizlidir.',
        'Harflere tıklayarak (ya da klavyeden yazarak) tahmin et. Doğru harf yerine yerleşir.',
        'Her kelimede 6 hata hakkın var. Bilirsen sıradaki kelime gelir, seri devam eder.'
      ],
      puan: 'Kelime puanı = harf sayısı × 10 + kalan can × 15 + hız bonusu. Serinin toplam puanı skor tablosuna yazılır.',
      ipucu: ['İpucu almak bir can götürür.'] },

    { id: 'hafiza', tur: 'tek', ikon: '🃏', ad: 'Hafıza Kartları', kisi: 'tek kişilik',
      amac: 'Kapalı kartları çevirip bütün eşleri en kısa sürede bulmak.',
      adim: [
        'Bir karta dokununca süre başlar.',
        'İki kart çevirebilirsiniz: aynıysa açık kalır, değilse kapanır. Yerlerini aklınızda tutmaya çalışın!',
        'Bütün eşler bulununca oyun biter.'
      ],
      puan: 'Skor = süre + gereksiz her hamle için 2 saniye ceza. Az olan kazanır.',
      ipucu: ['Kolay, Orta ve Zor seviye var; her seviyenin ayrı tablosu var.'] },

    { id: 'sudoku', tur: 'tek', ikon: '🔢', ad: 'Günün Sudokusu', kisi: 'tek kişilik · günlük',
      amac: 'Her satıra, sütuna ve 3×3 kutuya 1-9 arası rakamları birer kez yerleştirmek.',
      adim: [
        'Boş bir kareye tıklayıp alttan (ya da klavyeden) rakam seçebilirsiniz.',
        'Yanlış rakam koyarsan hata sayılır ve +30 saniye ceza yazılır.',
        'Silmek için Sil düğmesi ya da Backspace. N tuşu (ya da not modu) ile karelere küçük not alabilirsin.'
      ],
      puan: 'Skor = süre + her hata için 30 saniye. En hızlı çözen kazanır; herkese aynı bulmaca çıkar.',
      ipucu: ['Önce bir satırda / kutuda tek boşluk kalan yerleri doldur.'] },

    { id: 'mayin', tur: 'tek', ikon: '💣', ad: 'Mayın Tarlası', kisi: 'tek kişilik',
      amac: 'Mayınlara basmadan bütün güvenli kareleri açmak.',
      adim: [
        'Bir kareye tıklayabilirsiniz; ilk tıklama her zaman güvenlidir.',
        'Açılan sayılar, o karenin çevresindeki 8 karede kaç mayın olduğunu gösterir.',
        'Mayın olduğunu düşündüğünüz kareye 🚩 bayrak koyabilirsiniz: sağ tık, telefonda uzun basma ya da 🚩 Bayrak modu (F).',
        'Bayrakları tamam olan bir sayıya tıklarsan çevresi kendiliğinden açılır.'
      ],
      puan: 'Skor = bitirme süren. Kaybedersen tabloya girmez.',
      ipucu: ['Telefonda Bayrak modunu açıp kapatarak oynamak daha kolay.'] },

    { id: 'ikibin', tur: 'tek', ikon: '🧮', ad: '2048', kisi: 'tek kişilik',
      amac: 'Aynı sayıları birleştirip 2048 taşına ulaşmak (ve ötesine geçmek).',
      adim: [
        'Ok tuşları ya da W A S D ile bütün taşları bir yöne kaydırabilirsiniz; telefonda parmağınızla çekebilirsiniz.',
        'Aynı iki sayı çarpışınca birleşir (2+2=4, 4+4=8…).',
        'Her hamleden sonra yeni bir taş gelir. Hamle kalmayınca oyun biter.'
      ],
      puan: 'Skor = birleştirdiğin taşların toplamı. Çok olan kazanır.',
      ipucu: ['En büyük taşını bir köşede tutmaya çalış.'] },

    { id: 'yilan', tur: 'tek', ikon: '🐍', ad: 'Yılan', kisi: 'tek kişilik',
      amac: 'Elmaları yiyip uzamak; duvara ve kendine çarpmamak.',
      adim: [
        'Ok tuşları / W A S D ile yön verebilirsiniz; telefonda parmağınızla kaydırabilirsiniz.',
        'Her elma 10 puan ve 1 boy. Her 5 elmada süreli bir ⭐ çıkar: 50 puan.',
        'Uzadıkça hızlanır. P ile duraklatabilirsin.'
      ],
      puan: 'Topladığın puan skor tablosuna yazılır.',
      ipucu: ['Kenarlarda dolaşmak yerine ortada geniş dönüşler yapabilirsiniz.', 'Tuşları beğenmediysen üst çubuktaki ⌨️ Tuşlar’dan istediğin gibi değiştirebilirsin.'] },

    { id: 'kosu', tur: 'tek', ikon: '🏃', ad: 'Engel Koşusu', kisi: 'tek kişilik',
      amac: 'Engellere takılmadan olabildiğince uzağa koşmak, simitleri toplamak.',
      adim: [
        'Zıplamak için boşluk, ↑ ya da ekrana dokunabilirsiniz. Basılı tutarsanız daha yükseğe zıplarsınız.',
        'Havadayken bir kez daha basarsan çift zıplarsın.',
        'Eğilmek: ↓ ya da aşağı kaydır. P ile duraklat.'
      ],
      puan: 'Skor = koştuğun mesafe + her simit için 50 puan.',
      ipucu: ['Alçak engellerde kısa basabilir, yüksek engellerde basılı tutabilirsiniz.', 'Tuşları beğenmediysen üst çubuktaki ⌨️ Tuşlar’dan istediğin gibi değiştirebilirsin.'] },

    { id: 'ordek', tur: 'tek', ikon: '🦆', ad: 'Ördek Avı', kisi: 'tek kişilik',
      amac: '10 dalgada olabildiğince çok ördek vurmak.',
      adim: [
        'Başlamak için tıklayabilirsiniz. Ördeklere tıklayarak (telefonda dokunarak) ateş edersiniz.',
        'Her dalgada fişek sayın sınırlı: ördek sayısı + 1.',
        'Balonlara ateş etme! 6 ördek kaçarsa oyun erken biter.'
      ],
      puan: 'Normal ördek 100, yeşilbaş 150, altın ördek 300. Art arda vuruş çarpanı büyütür (en çok ×5). Balon vurmak 200 puan götürür.',
      ipucu: ['Iskalamamak çarpanı korur, acele etme.'] },

    { id: 'yapboz', tur: 'tek', ikon: '🧩', ad: 'Resimli Yapboz', kisi: 'tek kişilik',
      amac: 'Parçaları yerine koyup resmi en kısa sürede tamamlamak.',
      adim: [
        'Bir resim seç (istersen kendi fotoğrafını da yükleyebilirsin).',
        'Parçaları sürükleyebilirsiniz; doğru yerine yaklaşınca kendiliğinden oturur.',
        'Bütün parçalar yerleşince süre durur.'
      ],
      puan: 'Skor = süre. En hızlı bitiren kazanır.',
      ipucu: ['Önce kenar parçalarını yerleştir.'] }
  ];
  const BUL = new Map(N.map(x => [x.id, x]));
  window.NASIL = N;

  let dlg = null;
  function kur(){
    if (dlg) return dlg;
    dlg = document.createElement('dialog'); dlg.id = 'nasilDlg'; dlg.className = 'wide nasil-dlg';
    dlg.innerHTML = '<div class="dlg-head"><button type="button" class="btn small nasil-geri" hidden>← Oyunlar</button><h3>❓ Nasıl oynanır?</h3><button type="button" class="btn small nasil-kapat">Kapat</button></div><div class="dlg-body nasil-govde"></div>';
    dlg.querySelector('.nasil-kapat').onclick = () => dlg.close();
    dlg.querySelector('.nasil-geri').onclick = () => liste();
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });   // dışına tıklayınca kapanır
    document.body.append(dlg);
    return dlg;
  }
  const el = (t, c, s) => { const e = document.createElement(t); if (c) e.className = c; if (s != null) e.textContent = s; return e; };
  function liste(){
    const g = dlg.querySelector('.nasil-govde'); g.innerHTML = '';
    dlg.querySelector('.nasil-geri').hidden = true;
    dlg.querySelector('h3').textContent = '❓ Nasıl oynanır?';
    g.append(el('p', 'note', 'Bir oyuna tıklayıp nasıl oynandığını okuyabilirsiniz. Kapatınca kaldığınız yerden devam edersiniz. Oyun açıkken üst çubuktaki ⛶ Tam ekran ile oyunu büyütebilirsiniz.'));
    [['masa', '🃏 Masa oyunları (arkadaşlarınla)'], ['tek', '🙋 Tek kişilik (skor tablolu)']].forEach(([tur, baslik]) => {
      g.append(el('h4', 'nasil-baslik', baslik));
      const iz = el('div', 'nasil-izgara');
      N.filter(x => x.tur === tur).forEach(x => {
        const b = el('button', 'nasil-kart'); b.type = 'button';
        b.append(el('span', 'nk-ikon', x.ikon), Object.assign(el('span', 'nk-yazi'), {}));
        b.lastChild.append(el('b', '', x.ad), el('small', '', x.kisi));
        b.onclick = () => goster(x.id);
        iz.append(b);
      });
      g.append(iz);
    });
    g.scrollTop = 0;
  }
  function goster(id){
    const x = BUL.get(id); if (!x){ liste(); return; }
    const g = dlg.querySelector('.nasil-govde'); g.innerHTML = '';
    dlg.querySelector('.nasil-geri').hidden = false;
    dlg.querySelector('h3').textContent = x.ikon + ' ' + x.ad;
    g.append(el('p', 'nasil-kisi', x.kisi));
    const amac = el('div', 'nasil-kutu amac'); amac.append(el('b', '', '🎯 Amaç'), el('p', '', x.amac)); g.append(amac);
    const ad = el('div', 'nasil-kutu'); ad.append(el('b', '', '🕹️ Nasıl oynanır'));
    const ol = el('ol', 'nasil-adim'); x.adim.forEach(a => ol.append(el('li', '', a))); ad.append(ol); g.append(ad);
    const pu = el('div', 'nasil-kutu'); pu.append(el('b', '', '🏆 Puan ve kazanma'), el('p', '', x.puan)); g.append(pu);
    if (x.ipucu && x.ipucu.length){
      const ip = el('div', 'nasil-kutu ipucu'); ip.append(el('b', '', '💡 İpucu'));
      const ul = el('ul'); x.ipucu.forEach(a => ul.append(el('li', '', a))); ip.append(ul); g.append(ip);
    }
    if (typeof x.tablolar === 'function'){
      x.tablolar().forEach(t => {
        const kt = el('div', 'nasil-kutu'); kt.append(el('b', '', t.baslik));
        const sar = el('div', 'nasil-tablo-sar'); const tb = el('table', 'nasil-tablo');
        const th = el('tr'); t.bas.forEach(h2 => th.append(el('th', '', h2))); tb.append(th);
        t.sat.forEach(r => {
          const tr = el('tr');
          r.c.forEach((hc, q) => { const td = el('td', '', hc); if (q === 0 && r.renk){ td.style.borderLeft = '8px solid ' + r.renk; } tr.append(td); });
          tb.append(tr);
        });
        sar.append(tb); kt.append(sar);
        if (t.not) kt.append(el('p', 'note', t.not));
        g.append(kt);
      });
    }
    g.scrollTop = 0;
  }
  // id verilirse doğrudan o oyunun anlatımı, verilmezse oyun listesi açılır
  window.nasilAc = function(id){
    kur();
    if (id && BUL.has(id)) goster(id); else liste();
    try { if (!dlg.open) dlg.showModal(); } catch(e){ dlg.setAttribute('open', ''); }
  };
  window.nasilVar = id => BUL.has(id);
})();
