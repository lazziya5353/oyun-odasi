// "❓ Nasıl oynanır?": Oyun Salonu'nda ve her oyunun üst çubuğunda. Tıklayınca oyunların listesi (ya da açık oyunun
// anlatımı) açılır; okuyup kapatınca oyun kaldığı yerden devam eder (oyun durmaz, sadece üstüne pencere açılır).
// İçerik: amaç, adım adım nasıl oynanır, puan, kısayollar/ipuçları. Yeni oyun eklenince buraya da bir kayıt eklenir.
(function(){
  const N = [
    // ---------- masa oyunları ----------
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
      ipucu: ['Telefonda parmağınla çizebilirsin.', 'Yanlış tahminler sohbet gibi görünür, bol bol dene.'] },

    { id: 'isimsehir', tur: 'masa', ikon: '📝', ad: 'İsim-Şehir', kisi: '2-8 kişi',
      amac: 'Çıkan harfle başlayan isim, şehir, hayvan, bitki, eşya… kutularını herkesten hızlı ve farklı doldurmak.',
      adim: [
        'Masaya oturun, masayı açan “Oyunu başlat”a bassın.',
        'Her tur rastgele bir harf çıkar. Bütün kategorileri o harfle başlayan kelimelerle doldur.',
        'Hepsini dolduran “🛑 Bitirdim!”e basar; diğerlerine 5 saniye kalır. Süre biterse de tur kapanır.',
        'Sonra herkesin cevabı açılır. Uymayan bir cevap görürsen üstüne tıklayıp 👎 itiraz et.',
        'Diğer oyuncuların çoğunluğu itiraz ederse o cevap sayılmaz.',
        'Masayı açan “Devam”a basınca yeni harf gelir.'
      ],
      puan: 'O kategoride geçerli cevabı olan tek kişiysen 20, cevabın kimseyle aynı değilse 10, başkasıyla aynıysa 5, boş ya da geçersizse 0.',
      ipucu: ['Geniş seçenekte Ülke, Meslek ve Yemek de eklenir (8 kategori).', 'Herkesin aklına gelmeyecek cevaplar daha çok puan getirir.'] },

    { id: 'vampir', tur: 'masa', ikon: '🧛', ad: 'Vampir Köy', kisi: '3-10 kişi · sesli',
      amac: 'Köylüler: görevleri bitirmek ya da vampirleri bulup köyden kovmak. Vampirler: fark edilmeden köylüleri ısırmak.',
      adim: [
        'Masaya oturun, masayı açan başlatsın. Herkes gizlice rolünü öğrenir: 🧑‍🌾 köylü ya da 🧛 vampir.',
        'Köyde dolaş: bilgisayarda ok tuşları / W A S D, telefonda ekrandaki joystick.',
        'Köylüysen sarı parlayan yerlere gidip görevlerini yap (E ya da boşluk ile kullan).',
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
        'Masayı aç, eksik koltuklara 🤖 bot ekleyebilirsin. Herkese 13 kart dağıtılır.',
        'İhale: herkes sırayla öncekinden yüksek teklif verir ya da “Pas” der (tekli en az 4, eşli en az 7).',
        'İhaleyi alan kozu seçer ve ilk eli açar.',
        'Açılan renge uymak zorunlu; uyarken yerdeki kartı geçebiliyorsan büyük atmak zorunlu.',
        'O renk elinde yoksa koz atmak zorunlu; koz da yoksa istediğin kartı atarsın.',
        'Koz kırılmadan (biri koz atmadan) kozla el açılamaz. Eli en büyük koz, koz yoksa açılan rengin en büyüğü alır.'
      ],
      puan: 'İhaleyi alan söylediği kadar el alırsa aldığı el kadar artı, alamazsa ihale kadar eksi (battı). Diğerleri aldıkları el kadar artı yazar. Koz Maça’da: sözünü tutturan 10 × söz, tutturamayan −10 × söz.',
      ipucu: ['Eşli oyunda karşılıklı oturanlar takımdır.', 'Atabileceğin kartlar parlak, atamayacakların sönük görünür.'] },

    { id: 'okey', tur: 'masa', ikon: '🀄', ad: 'Okey', kisi: '4 kişi · bot eklenebilir',
      amac: 'Bütün taşlarını per (aynı renk sıralı: 3-4-5) ya da grup (aynı sayı, farklı renk: 7-7-7) yapıp elini bitirmek.',
      adim: [
        'Masayı aç, eksik koltuklara 🤖 bot ekleyebilirsin. Herkese 14 taş, başlayana 15 taş gelir.',
        'Ortada gösterge taşı açılır. Göstergenin aynı renkte bir fazlası OKEY’dir ve her taşın yerine geçer.',
        'Sıran gelince ortadan ya da solundakinin attığı taşı al, sonra bir taş at.',
        'Taşları ıstakanda sürükleyerek dizebilirsin. Atmak için: taşı seçip “At”a bas, çift tıkla ya da sağ alttaki alana sürükle.',
        'Bütün taşların perlere/gruplara oturunca son taşı atarak bitirirsin. 7 çift ile de bitebilir (çift bitiş).'
      ],
      puan: 'Klasik Okey’de herkes 20 puanla başlar, el kaybettikçe puan düşer; puanı sıfıra inen oyunu kaybeder. 101 Okey’de el açmak için perlerin toplamı en az 101 olmalı; seçilen el sayısı sonunda en az ceza puanı olan kazanır.',
      ipucu: ['Sahte okey, okey taşının kendisinin yerine geçer.', 'Eşli oyunda karşılıklı oturanlar takımdır.'] },

    { id: 'tavla', tur: 'masa', ikon: '🎲', ad: 'Tavla', kisi: '2 kişi · bot eklenebilir',
      amac: 'Bütün pullarını kendi evine toplayıp rakipten önce dışarı çıkarmak.',
      adim: [
        'Masayı aç; arkadaşın otursun ya da 🤖 bot ekle. ⚪ Beyaz ve ⚫ Siyah karşılıklı oynar.',
        'Sıran gelince zar at. Zarlardaki sayılar kadar pullarını ilerletirsin; çift gelirse 4 kez oynarsın.',
        'Oynamak için: bir pula tıkla, sonra parlayan haneye tıkla. Pula çift tıklarsan büyük zarla oynar.',
        'Rakibin tek pulu olan haneye gelirsen pulu kırılır, başa döner. Kırık pulun varsa önce onu sokman gerekir.',
        'İki ya da daha fazla pulun olan hane kapıdır, rakip oraya gelemez.',
        'Bütün pulların evindeyken pullarını toplamaya başlarsın.'
      ],
      puan: 'Normal bitirme 1 puan; rakip hiç pul toplayamadıysa mars, 2 puan. Seçilen puana ilk ulaşan maçı kazanır.',
      ipucu: ['Gidebileceğin haneler parlar, emin değilsen pula tıklayıp bak.'] },

    // ---------- tek kişilik ----------
    { id: 'kelime', tur: 'tek', ikon: '🔤', ad: 'Kelime Bul', kisi: 'tek kişilik · günlük',
      amac: 'Günün 5 harfli Türkçe kelimesini 6 tahminde bulmak. Herkese aynı kelime çıkar.',
      adim: [
        '5 harfli bir kelime yaz, Enter’a (ya da ekrandaki ENTER tuşuna) bas.',
        '🟩 Yeşil: harf doğru ve yeri doğru. 🟨 Sarı: harf kelimede var ama yeri yanlış. ⬛ Gri: harf kelimede yok.',
        'Renklere bakarak yeni tahmin yap; 6 hakkın var.'
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
        'İki kart çevir: aynıysa açık kalır, değilse kapanır. Yerlerini aklında tut!',
        'Bütün eşler bulununca oyun biter.'
      ],
      puan: 'Skor = süre + gereksiz her hamle için 2 saniye ceza. Az olan kazanır.',
      ipucu: ['Kolay, Orta ve Zor seviye var; her seviyenin ayrı tablosu var.'] },

    { id: 'sudoku', tur: 'tek', ikon: '🔢', ad: 'Günün Sudokusu', kisi: 'tek kişilik · günlük',
      amac: 'Her satıra, sütuna ve 3×3 kutuya 1-9 arası rakamları birer kez yerleştirmek.',
      adim: [
        'Boş bir kareye tıkla, alttan (ya da klavyeden) rakam seç.',
        'Yanlış rakam koyarsan hata sayılır ve +30 saniye ceza yazılır.',
        'Silmek için Sil düğmesi ya da Backspace. N tuşu (ya da not modu) ile karelere küçük not alabilirsin.'
      ],
      puan: 'Skor = süre + her hata için 30 saniye. En hızlı çözen kazanır; herkese aynı bulmaca çıkar.',
      ipucu: ['Önce bir satırda / kutuda tek boşluk kalan yerleri doldur.'] },

    { id: 'mayin', tur: 'tek', ikon: '💣', ad: 'Mayın Tarlası', kisi: 'tek kişilik',
      amac: 'Mayınlara basmadan bütün güvenli kareleri açmak.',
      adim: [
        'Bir kareye tıkla; ilk tıklama her zaman güvenlidir.',
        'Açılan sayılar, o karenin çevresindeki 8 karede kaç mayın olduğunu gösterir.',
        'Mayın olduğunu düşündüğün kareye 🚩 bayrak koy: sağ tık, telefonda uzun bas ya da 🚩 Bayrak modu (F).',
        'Bayrakları tamam olan bir sayıya tıklarsan çevresi kendiliğinden açılır.'
      ],
      puan: 'Skor = bitirme süren. Kaybedersen tabloya girmez.',
      ipucu: ['Telefonda Bayrak modunu açıp kapatarak oynamak daha kolay.'] },

    { id: 'ikibin', tur: 'tek', ikon: '🧮', ad: '2048', kisi: 'tek kişilik',
      amac: 'Aynı sayıları birleştirip 2048 taşına ulaşmak (ve ötesine geçmek).',
      adim: [
        'Ok tuşları ya da W A S D ile bütün taşları bir yöne kaydır; telefonda parmağınla çek.',
        'Aynı iki sayı çarpışınca birleşir (2+2=4, 4+4=8…).',
        'Her hamleden sonra yeni bir taş gelir. Hamle kalmayınca oyun biter.'
      ],
      puan: 'Skor = birleştirdiğin taşların toplamı. Çok olan kazanır.',
      ipucu: ['En büyük taşını bir köşede tutmaya çalış.'] },

    { id: 'yilan', tur: 'tek', ikon: '🐍', ad: 'Yılan', kisi: 'tek kişilik',
      amac: 'Elmaları yiyip uzamak; duvara ve kendine çarpmamak.',
      adim: [
        'Ok tuşları / W A S D ile yön ver; telefonda parmağınla kaydır.',
        'Her elma 10 puan ve 1 boy. Her 5 elmada süreli bir ⭐ çıkar: 50 puan.',
        'Uzadıkça hızlanır. P ile duraklatabilirsin.'
      ],
      puan: 'Topladığın puan skor tablosuna yazılır.',
      ipucu: ['Kenarlarda dolaşmak yerine ortada geniş dönüşler yap.', 'Tuşları beğenmediysen üst çubuktaki ⌨️ Tuşlar’dan istediğin gibi değiştirebilirsin.'] },

    { id: 'kosu', tur: 'tek', ikon: '🏃', ad: 'Engel Koşusu', kisi: 'tek kişilik',
      amac: 'Engellere takılmadan olabildiğince uzağa koşmak, simitleri toplamak.',
      adim: [
        'Zıplamak: boşluk, ↑ ya da ekrana dokun. Basılı tutarsan daha yükseğe zıplarsın.',
        'Havadayken bir kez daha basarsan çift zıplarsın.',
        'Eğilmek: ↓ ya da aşağı kaydır. P ile duraklat.'
      ],
      puan: 'Skor = koştuğun mesafe + her simit için 50 puan.',
      ipucu: ['Alçak engellerde kısa bas, yüksek engellerde basılı tut.', 'Tuşları beğenmediysen üst çubuktaki ⌨️ Tuşlar’dan istediğin gibi değiştirebilirsin.'] },

    { id: 'ordek', tur: 'tek', ikon: '🦆', ad: 'Ördek Avı', kisi: 'tek kişilik',
      amac: '10 dalgada olabildiğince çok ördek vurmak.',
      adim: [
        'Başlamak için tıkla. Ördeklere tıklayarak (telefonda dokunarak) ateş et.',
        'Her dalgada fişek sayın sınırlı: ördek sayısı + 1.',
        'Balonlara ateş etme! 6 ördek kaçarsa oyun erken biter.'
      ],
      puan: 'Normal ördek 100, yeşilbaş 150, altın ördek 300. Art arda vuruş çarpanı büyütür (en çok ×5). Balon vurmak 200 puan götürür.',
      ipucu: ['Iskalamamak çarpanı korur, acele etme.'] },

    { id: 'yapboz', tur: 'tek', ikon: '🧩', ad: 'Resimli Yapboz', kisi: 'tek kişilik',
      amac: 'Parçaları yerine koyup resmi en kısa sürede tamamlamak.',
      adim: [
        'Bir resim seç (istersen kendi fotoğrafını da yükleyebilirsin).',
        'Parçaları sürükle; doğru yerine yaklaşınca kendiliğinden oturur.',
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
    g.append(el('p', 'note', 'Bir oyuna tıkla, nasıl oynandığını oku. Kapatınca kaldığın yerden devam edersin. Oyun açıkken üst çubuktaki ⛶ Tam ekran ile oyunu büyütebilirsin.'));
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
