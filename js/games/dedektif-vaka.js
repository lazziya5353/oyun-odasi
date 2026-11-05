// Kara Dosyalar · Vaka 1: "Gece Yarısı İnfazı: Motel 204"
// Görseller img/dedektif/ içinde (Gemini ile üretilmiş, oyun sahibine ait). Hotspot koordinatları görselin yüzdesi: x, y sol üst köşe; w, h boyut.
const DK_VAKALAR = {
  motel204: {
    ad: 'Gece Yarısı İnfazı: Motel 204',
    kisa: 'Motel 204',
    yil: 'Ekim 1999',
    kapak: 'img/dedektif/1_sokak.webp',
    ozet: 'Emekli Başkomiser Demir Karaca, ucuz bir motelin 204 numaralı odasında kalbinden tek kurşunla vurulmuş bulundu. Kapıda zorlama yok. Katilini tanıyordu.',
    baslangic: 'sokak',
    puan: 1000,
    sahneler: {
      sokak: {
        ad: 'Arka Sokak', saat: '02:15', img: 'img/dedektif/1_sokak.webp', yagmur: 1, dis: true,
        giris: 'Yağmur bu gece kenti temizlemiyordu. Sadece kanalizasyona sığmayan günahları sokaklara taşıyordu. Gece 02:15\'te telsizden geçen o cızırtılı anons, eski hocam Başkomiser Demir Karaca\'nın Motel 204\'te ölü bulunduğunu söylüyordu…',
        hot: [
          { id: 'neon', x: 19, y: 13, w: 6, h: 24, delil: 'telsiz', etiket: 'Neon tabela' },
          { id: 'afis', x: 85, y: 22, w: 15, h: 34, etiket: 'Duvardaki afişler', metin: 'Islak duvarda yarısı yırtılmış "ARANIYOR" afişleri. Yüzlerin çoğunu yağmur silmiş. Bu şehirde aranan adamlar çoğu zaman en görünür yerde durur.' },
          { id: 'rogar', x: 33, y: 77, w: 13, h: 9, etiket: 'Buharlı rögar', metin: 'Rögardan buhar yükseliyor. Kapağı birileri yerinden oynatmış; kenarında taze çamur var. Bu gece herkes bir şeyler saklıyor.' }
        ]
      },
      motel: {
        ad: 'Motel 204', saat: '02:40', img: 'img/dedektif/2_motel.webp', yagmur: 0.55, ic: true, kosul: [],
        giris: 'Odanın kapısını araladığımda içerisi bayat tütün ve ucuz viski kokuyordu. Demir rozetini komodinin üzerinden hiç ayırmamıştı ama masadaki kaset hâlâ dönüyordu…',
        hot: [
          { id: 'kaset', x: 54.5, y: 51.5, w: 12, h: 13, delil: 'kaset', etiket: 'Mikrokaset cihazı' },
          { id: 'polaroid', x: 59, y: 68.5, w: 16.5, h: 17, delil: 'polaroid', etiket: 'Polaroid fotoğraf' },
          { id: 'rozet', x: 74, y: 75, w: 13, h: 16, delil: 'rozet', etiket: 'Polis rozeti' },
          { id: 'sandalye', x: 8, y: 50, w: 34, h: 38, delil: 'tutanak', etiket: 'Devrik sandalye, delil kartları' },
          { id: 'kullik', x: 68, y: 56, w: 11, h: 14, delil: 'izmarit', etiket: 'Kül tablası' },
          { id: 'odatel', x: 39.5, y: 34, w: 11, h: 10, delil: 'santral', etiket: 'Oda telefonu' }
        ]
      },
      morg: {
        ad: 'Adli Tıp Morgu', saat: '04:10', img: 'img/dedektif/3_morg.webp', yagmur: 0.4, ic: true, floresan: true, kosul: ['kaset', 'polaroid', 'rozet', 'tutanak', 'izmarit', 'santral'],
        kosulAd: 'Motel 204\'te en az bir delil bul',
        giris: 'Motelden çıkıp Emniyet\'in soğuk morguna indim. Floresan lambaların cızırtısı koridorda yankılanıyordu. Demir çelik masada yatıyordu…',
        hot: [
          { id: 'rontgen', x: 63.5, y: 22, w: 14.5, h: 22, delil: 'rontgen', etiket: 'Göğüs röntgeni' },
          { id: 'dikte', x: 76, y: 73, w: 18, h: 17, delil: 'dikte', etiket: 'Doktorun ses kayıt cihazı' },
          { id: 'tepsi', x: 44.5, y: 74, w: 31, h: 20, delil: 'klasor', etiket: 'Tepsideki dosya ve mermi', git: 'dosya' },
          { id: 'etiket', x: 21.5, y: 56, w: 6, h: 17, etiket: 'Ayak etiketi', metin: 'Ayak bileğindeki karton etiket: "Demir Karaca, 54. Kayıt no: 99/1147. Ateşli silah." Otuz yıl bu şehre hizmet etmiş bir adamın son kimliği, bir iple bağlanmış bir kartondu.' }
        ]
      },
      dosya: {
        ad: 'Vaka Dosyası', saat: '04:35', img: 'img/dedektif/4_dosya.webp', yagmur: 0.25, ic: true, kosul: ['klasor'],
        kosulAd: 'Morgdaki tepsiyi incele',
        giris: 'Morg tepsisindeki "GİZLİ" damgalı klasörü lambanın altına çektim. Gerçekler o küçük delil poşetinin içinde saklanıyordu…',
        hot: [
          { id: 'kovan', x: 33, y: 43, w: 23, h: 31, delil: 'kovan', etiket: 'Delil poşeti (9x18 kovan)' },
          { id: 'viktor', x: 64, y: 27, w: 28.5, h: 31, delil: 'sabika', etiket: 'Ataşlı sabıka fotoğrafı' },
          { id: 'notlar', x: 60, y: 55, w: 23, h: 16, delil: 'notlar', etiket: 'El yazısı mavi notlar' },
          { id: 'gizli', x: 41, y: 17, w: 24, h: 9, etiket: 'Damga', metin: 'Kırmızı mürekkeple basılmış damga, kağıdın lifine kadar işlemiş. Demir hep derdi: "Gizli damgası vurulan dosya, birilerinin korktuğu dosyadır."' }
        ]
      },
      bar: {
        ad: 'Kara Orkide Barı', saat: '05:05', img: 'img/dedektif/5_bar.webp', yagmur: 0.6, ic: true, kosul: ['notlar'],
        kosulAd: 'Vaka dosyasındaki el yazısı notları oku',
        giris: 'Dosyayı bırakıp limandaki Kara Orkide Barı\'na sürdüm. Tezgâhın üzerinde unutulmuş gümüş bir Zippo ve ıslak bir peçete duruyordu…',
        hot: [
          { id: 'zippo', x: 50, y: 51, w: 14, h: 23, delil: 'zippo', etiket: 'Ejderha işlemeli Zippo' },
          { id: 'pecete', x: 43, y: 76, w: 36, h: 19, delil: 'pecete', etiket: 'Islak peçete' },
          { id: 'ankesor', x: 12.5, y: 10, w: 12, h: 41, delil: 'tarik', etiket: 'Ankesörlü telefon' },
          { id: 'bardak', x: 67, y: 45, w: 15, h: 34, etiket: 'Viski bardağı', metin: 'Buzlar daha erimemiş. Birisi bardağını doldurup dokunmadan gitmiş. Tek Göz omuz silkiyor: "Bazı müşteriler içmeye değil, unutmaya gelir."' }
        ]
      },
      depo: {
        ad: 'Liman Deposu No: 7', saat: '05:50', img: 'img/dedektif/6_depo.webp', yagmur: 0.8, dis: true, kosul: ['pecete'],
        kosulAd: 'Bardaki ıslak peçeteyi incele',
        giris: 'Şafak sökmeden Liman Deposu 7\'ye ulaştım. Tavandan sarkan tek ampul, ıslak betondaki taze lastik izlerini aydınlatıyordu. Parçalar birleşmeye başlamıştı…',
        hot: [
          { id: 'sandik', x: 64, y: 45, w: 31, h: 33, delil: 'sandik', etiket: 'Konteynerdeki askeri sandıklar' },
          { id: 'lastik', x: 38, y: 75, w: 40, h: 22, delil: 'lastik', etiket: 'Islak zemindeki lastik izleri' },
          { id: 'fener', x: 26, y: 41, w: 9, h: 18, etiket: 'Deniz feneri', metin: 'Fenerin ışığı her on saniyede bir depoyu yalıyor. Bu ışık o gece de buradaydı; gördüklerini kimseye anlatmayacak.' }
        ]
      }
    },
    // deliller. tur: belge | foto | ses | obje (döndürülebilir). guclu: suçlamada geçerli kanıt; grup: aynı gruptan iki kanıt tek sayılır
    deliller: {
      telsiz: { ad: 'Merkez telsiz kaydı', ikon: '📻', sahne: 'sokak', tur: 'ses', ses: 'telsiz', resim: 'img/dedektif/k_neon.webp',
        ozet: '01:50\'de motelden resmi görünümlü koyu bir sedan çıkmış.',
        metin: 'MERKEZ — 01:52 — TÜM EKİPLERE\n"Lale Motel arka otoparkından ihbar. Tanık, saat 01:50 civarı koyu renk bir sedanın farları kapalı çıktığını söylüyor. Kapısında beyaz rakamlar varmış: \'40\' ile başlıyor, gerisini yağmurdan okuyamamış. Resmi araç olabilir. Tekrar ediyorum, resmi araç olabilir."' },
      kaset: { ad: 'Demir\'in mikrokaseti', ikon: '📼', sahne: 'motel', tur: 'ses', ses: 'kaset', resim: 'img/dedektif/k_kaset.webp',
        ozet: 'Demir katili içeri kendisi almış. Kaydın sonunda çift metal tıkırtı: Zippo.',
        metin: 'KASET — "DK / 27.10.99" (cızırtılı)\n\nDEMİR (fısıltıyla): "…saat bir buçuk. Kayıt alıyorum. Bu gece gelecek, biliyorum. Depo 7… sicil numaraları… on yıl, kendime yalan söyledim."\n[kapı çalınıyor]\nDEMİR: "Açık, gel. Otur. Sana bir içki koyayım, eski günlerin hatırına."\n[bardak sesi — uzun sessizlik]\nBOĞUK SES: "Kaydı kapat, Demir."\n[KLİK… KLİK — metal bir çakmak kapağı]\n[boğuk bir patlama]\n[hışırtı… kayıt sürüyor]' },
      polaroid: { ad: 'Ortaklık polaroidi', ikon: '📷', sahne: 'motel', tur: 'foto', ses: 'kagit', resim: 'img/dedektif/k_polaroid.webp',
        ozet: 'Demir ve ortağı. Arkasında: "Bizi sırtımızdan vuran köstebek."',
        metin: 'Kuzguncuk, 1989. İki polis, bir ekip otosunun önünde poz vermiş: solda Demir, sağda o zamanlar genç bir komiser yardımcısı.\n\nArkasında iki isim yazılı: "Demir — Selim". "Selim" yazısının üstü sigara ucuyla yakılıp delinmiş. Altında Demir\'in titrek el yazısı:\n"Bizi sırtımızdan vuran köstebek. — D."' },
      rozet: { ad: 'Demir\'in onur rozeti', ikon: '🎖️', sahne: 'motel', tur: 'foto', ses: 'kagit', resim: 'img/dedektif/k_rozet.webp',
        ozet: 'Rozetin arkasına "D-7" yazılı bir anahtar bantlanmış.',
        metin: 'Başkomiser Demir Karaca — Sicil 1147. Emekli edildiği gün bile çıkarmadığı rozet.\n\nCüzdanın gizli gözüne bantlanmış küçük, paslı bir anahtar: üzerinde kazıma "D-7". Bir depo kapısı, belki de bir kilit.' },
      tutanak: { ad: 'Olay yeri tutanağı', ikon: '📝', sahne: 'motel', tur: 'belge', ses: 'kagit', resim: 'img/dedektif/k_sandalye.webp',
        ozet: 'Zorlama yok; iki bardak, biri silinmiş. Yatağın altında bir kovan.',
        metin: 'OLAY YERİ TUTANAĞI — 27.10.1999 — 02:35\n• Kapıda ve pencerede zorlama izi yok. Maktul katili içeri kendisi almıştır.\n• Komodinde iki viski bardağı: biri maktulün parmak izli, diğeri silinmiş.\n• Sandalye devrilmiş; boğuşma izi yok.\n• Delil 1: Yatağın altına yuvarlanmış 9x18 mm Makarov kovanı (Adli Tıp\'a gönderildi).\n• Delil 2: Halıda ıslak çamurlu ayakkabı izi, 43 numara.' },
      izmarit: { ad: 'Kül tablasındaki izmaritler', ikon: '🚬', sahne: 'motel', tur: 'foto', resim: 'img/dedektif/k_kullik.webp',
        ozet: 'Demir\'in Maltepe\'lerinin yanında, filtresi ısırılmış iki Marlboro.',
        metin: 'Kül tablasında iki çeşit izmarit var.\nDemir\'in filtresiz Maltepe\'leri ve yarısına kadar içilmiş, filtresi dişlenmiş iki Marlboro.\n\nMarlboro\'ların ucunda kibrit kükürdü yok; benzinli bir çakmakla, yüksek alevle yakılmışlar.' },
      santral: { ad: 'Motel santral defteri', ikon: '☎️', sahne: 'motel', tur: 'belge', ses: 'kagit', resim: 'img/dedektif/k_odatel.webp',
        ozet: '01:15\'te dışarıdan 204\'e 38 saniyelik bir arama.',
        metin: 'LALE MOTEL — SANTRAL DEFTERİ\n01:15 — Dış hat → Oda 204 — 38 sn\nArayan kendini "Tek Göz" diye tanıtmış. Gece görevlisinin notu: "Adam telaşlıydı, \'Çabuk bağla, hayati\' dedi."' },
      rontgen: { ad: 'Göğüs röntgeni', ikon: '🩻', sahne: 'morg', tur: 'foto', resim: 'img/dedektif/k_rontgen.webp',
        ozet: 'Tek kurşun kalpte; giriş deliğinde barut yanığı: 50 cm\'den yakın atış.',
        metin: 'Işıklı panodaki film: çekirdek kalbin sağ karıncığında, kaburgaya çarpmadan girmiş.\nDoktorun panoya iliştirdiği not:\n"Giriş deliği çevresinde barut yanığı ve is: atış 50 cm\'den yakın. Savunma yarası yok. Kurban katilin dibindeydi ve kaçmaya çalışmadı."' },
      dikte: { ad: 'Otopsi dikte kaydı', ikon: '🎙️', sahne: 'morg', tur: 'ses', ses: 'kaset', resim: 'img/dedektif/3_morg.webp',
        ozet: 'Ölüm saati 01:45. Çekirdek 9x18 Makarov, susturucu izi var.',
        metin: 'DR. NERMİN AYDIN — DİKTE\n"Maktul Demir Karaca, 54 yaşında. Vücut ısısı ve ölü katılığına göre ölüm saati 01:45, artı eksi on dakika. Tek kurşun. Çıkarılan çekirdek 9x18 milimetre Makarov, namlu ağzı izleri susturucu kullanıldığını gösteriyor. Mide içeriği: viski. Kayıt sonu."' },
      klasor: { ad: 'Otopsi klasörü', ikon: '📁', sahne: 'morg', tur: 'belge', ses: 'kagit', resim: 'img/dedektif/4_dosya.webp',
        ozet: 'Olay yerinden gelen delil poşeti ve Demir\'in notları bu dosyada.',
        metin: 'Tepsideki klasöre olay yeri delil poşeti ve Demir\'in cebinden çıkan notlar eklenmiş. Petri kabındaki ezik çekirdek, kalbinden çıkan kurşun.\n\nKlasörü lambanın altına çektim…' },
      kovan: { ad: '9x18 Makarov kovanı', ikon: '🔩', sahne: 'dosya', tur: 'obje', ses: 'kagit', resim: 'img/dedektif/k_kovan.webp',
        ozet: 'Motelde yatağın altından çıkan kovan. Dip tablası çamurlu.',
        metin: 'Olay yeri Delil 1: 9x18 mm Makarov kovanı. Dip tablası çamurla kaplı, damga okunmuyor.\n\nKovanı parmaklarımın arasında çevirmem lazım.',
        dondur: { gizli: 'kovan711', yazi: '711-RU', ipucuAci: [140, 240] } },
      kovan711: { ad: 'Kovandaki "711-RU" damgası', ikon: '🔎', sahne: 'dosya', tur: 'obje', resim: 'img/dedektif/k_kovan.webp',
        ozet: 'Kovan, 1996\'da el konulan Rus kaçak sevkiyatından.',
        metin: 'Dip tablasındaki çamuru silince soğuk damga ortaya çıktı: 711-RU.\n\nBu damga 1996\'daki Rus silah kaçakçılığı baskınında el konulan mühimmata ait. O mermiler mahkeme kararıyla Emniyet yediemin deposuna kaldırılmıştı. Yani katilin mermisi, polisin kilitli deposundan çıkmış.' },
      sabika: { ad: 'Viktor Kolesnikov\'un sabıka kaydı', ikon: '🗂️', sahne: 'dosya', tur: 'foto', resim: 'img/dedektif/k_viktor.webp',
        ozet: 'Kaçakçının mermileri; ama o saatte gemide olduğu kamerada.',
        metin: 'Viktor "Gölge" Kolesnikov, 41. Silah kaçakçılığı.\n1996 baskınında el konulan 711-RU mühimmatı Emniyet yediemin deposuna kaldırıldı; anahtarları Cinayet Büro\'da.\n\nEk not (Demir\'in el yazısıyla): "Liman kamerası: Viktor 27.10 gecesi 01:10 – 03:30 arası Karadeniz Yıldızı gemisinin güvertesinde. Kendisi değil."' },
      notlar: { ad: 'Demir\'in el yazısı notları', ikon: '✒️', sahne: 'dosya', tur: 'belge', ses: 'kagit', resim: 'img/dedektif/k_notlar.webp',
        ozet: '23:45 Kara Orkide Barı. "Liman Deposu No: 7."',
        metin: 'Mavi mürekkep, aceleyle yazılmış:\n"23:45 — Kara Orkide. Tek Göz\'le görüş.\n\'Bu gece, Liman Deposu No: 7.\'\nYediemin mühürleri kimin sicil numarasıyla açıldı?? → S.\nKimseye güvenme. Kimseye."' },
      zippo: { ad: 'Ejderha işlemeli Zippo', ikon: '🔥', sahne: 'bar', tur: 'obje', ses: 'zippo', resim: 'img/dedektif/k_zippo.webp',
        ozet: 'Barda unutulmuş gümüş çakmak. Klik sesi tanıdık.',
        metin: 'Gümüş, ejderha işlemeli bir Zippo. Kapağını açıp kapattım: KLİK… KLİK. Önce kısa, sonra tiz bir ikinci klik.\n\nTek Göz: "Gece ikiyi beş geçe bir polis geldi, motelden kimin aradığını sordu. Çakmağını burada unuttu."',
        dondur: { gizli: 'zippo_kazima', yazi: 'S.Y. — Cinayet Büro 1994', ipucuAci: [140, 240] } },
      zippo_kazima: { ad: 'Zippo\'nun altındaki kazıma', ikon: '🔎', sahne: 'bar', tur: 'obje', resim: 'img/dedektif/k_zippo.webp', guclu: true, grup: 'zippo',
        ozet: 'Çakmağın altında: "S.Y. — Cinayet Büro 1994".',
        metin: 'Çakmağı ters çevirince tabanındaki kazıma ışığa geldi:\n"S.Y. — Cinayet Büro 1994"\n\nCinayet Büro\'nun 1994 yılı terfi hediyesi. O yıl bu çakmaktan sadece birkaç tane kazındı.' },
      zippo_eslesme: { ad: 'Zippo sesi eşleşmesi', ikon: '🔊', sahne: 'bar', tur: 'ses', ses: 'zippo', resim: 'img/dedektif/k_kaset.webp', guclu: true, grup: 'zippo', otomatik: ['kaset', 'zippo'],
        ozet: 'Bardaki Zippo, motel kasetindeki tıkırtıyla birebir aynı.',
        metin: 'Kaseti bir kez daha sardım ve Zippo\'yu mikrofonun dibinde açtım.\nKaset: KLİK… KLİK.\nÇakmak: KLİK… KLİK.\n\nAynı aralık, aynı tiz ikinci klik. Bu çakmak saat 01:45\'te 204 numaralı odadaydı.' },
      pecete: { ad: 'Islak peçete', ikon: '🧻', sahne: 'bar', tur: 'belge', ses: 'kagit', resim: 'img/dedektif/k_pecete.webp',
        ozet: '"Gece 02:30 — Depo 7 — sevkiyat. 4082 gelecek."',
        metin: 'Islak peçete, mürekkep dağılmış. Bir telefon numarası, okunmuyor. Altında:\n"Gece 02:30 — Depo 7 — sevkiyat.\n4082 gelecek."' },
      tarik: { ad: 'Tek Göz Tarık\'ın ifadesi', ikon: '☎️', sahne: 'bar', tur: 'ses', ses: 'telefon', resim: 'img/dedektif/k_telefon.webp',
        ozet: '01:15\'te Demir\'i uyarmak için motelini aramış.',
        metin: 'TARIK "TEK GÖZ" ER — İFADE\n"Saat bir çeyrekte şu ankesörlüden moteli aradım. \'Abi, gelen senin adamın, kaçmaya bak\' dedim. Hat kesildi. Bütün gece buradaydım, beş müşteri şahidim.\n\nSonra ikiyi beş geçe biri geldi, motelden kimin aradığını sordu. Rozetini gösterdi. Çakmağını tezgâhta unuttu."' },
      sandik: { ad: 'Kırık yediemin mührü', ikon: '📦', sahne: 'depo', tur: 'foto', resim: 'img/dedektif/k_sandik.webp', guclu: true, grup: 'sandik',
        ozet: '711-RU sandıklarının mührü Selim Yavuz\'un sicil numarasıyla açılmış.',
        metin: 'Konteynerde 711-RU damgalı askeri sandıklar. Hepsinde Emniyet yediemin mührü var, hepsi kırılmış.\n\nMühür tutanağı sandığın içine sıkıştırılmış: "Teslim alan: Komiser Yrd. Selim Yavuz — Sicil 2214."' },
      lastik: { ad: '4082\'nin lastik izleri', ikon: '🛞', sahne: 'depo', tur: 'foto', resim: 'img/dedektif/k_lastik.webp', guclu: true, grup: 'arac',
        ozet: 'İzler 4082 kodlu resmi sivil aracın kış lastikleriyle birebir aynı.',
        metin: 'Islak betonda taze izler: kış lastiği, sağ ön tekerde belirgin bir kesik.\n\nEmniyet garaj kaydı: aynı desen ve aynı kesik 4082 kodlu sivil devriye aracında. O gece aracı imzayla alan: S. Yavuz. Giriş 00:40, dönüş 03:10.' }
    },
    supheliler: [
      { id: 'selim', ad: 'Komiser Yrd. Selim Yavuz', yas: 46, resim: 'img/dedektif/k_polaroid.webp', rol: 'Demir\'in 10 yıllık ortağı · Cinayet Büro',
        ifade: '"O gece 4082\'yle Beyoğlu devriyesindeydim. Motele hiç uğramadım. Demir benim abimdi."', not: 'Marlboro içer. Ayakkabı numarası 43.' },
      { id: 'viktor', ad: 'Viktor "Gölge" Kolesnikov', yas: 41, resim: 'img/dedektif/k_viktor.webp', rol: 'Silah kaçakçısı',
        ifade: '"Gemideydim. Kameralara bakın. O ihtiyarı ben öldürseydim, bulamazdınız."', not: 'Cinayette kullanılan 711-RU mermileri onun ele geçirilen sevkiyatından.' },
      { id: 'tarik', ad: 'Tarık "Tek Göz" Er', yas: 52, resim: '', rol: 'Kara Orkide barmeni · Demir\'in muhbiri',
        ifade: '"Abiyi uyarmaya çalıştım. Telefonu açtı, sonra hat kesildi."', not: 'Bütün gece barda; müşteriler şahit.' }
    ],
    katil: 'selim',
    // aşamalar: ilk eksik koşul hangisiyse o aşamanın ipuçları verilir
    ipuclari: [
      { kosul: k => !['kaset', 'polaroid', 'rozet', 'tutanak', 'izmarit', 'santral'].some(x => k.has(x)), k: [
        'Sokakta oyalanma. Neon tabela sana bir şey anlatabilir, sonra içeri gir.',
        '"🗺 Mekanlar"dan Motel 204\'e geç ve odadaki eşyalara tıkla.',
        'Motel 204\'te önce komodindeki kaset cihazına tıkla.' ] },
      { kosul: k => !k.has('kaset'), k: [
        'Odada hâlâ dönen bir şey var.',
        'Masadaki kaset cihazı, Demir\'in son anlarını kaydetmiş olabilir.',
        'Motel 204: masadaki mikrokaset cihazına tıkla, kaydı sonuna kadar dinle. Sondaki çift "klik"e dikkat.' ] },
      { kosul: k => !k.has('klasor'), k: [
        'Bir cesedin anlatacakları bitmez.',
        'Morga git. Ön taraftaki metal tepsiye bak.',
        'Adli Tıp Morgu: öndeki tepsiye (petri kabı ve dosya) tıkla, vaka dosyası açılır.' ] },
      { kosul: k => !k.has('kovan711'), k: [
        'Delil poşetindeki kovanın bir yüzü kirli.',
        'Kovanı incele ve dip tablasını görene kadar döndür.',
        'Vaka Dosyası: delil poşetine tıkla, kaydırıcıyla kovanı 180° civarına çevir. Damga: 711-RU.' ] },
      { kosul: k => !k.has('notlar'), k: [
        'Demir ölmeden önce bir yere uğradı.',
        'Dosyadaki mavi el yazısı notlar seni bir bara götürecek.',
        'Vaka Dosyası: el yazısı notlara tıkla; Kara Orkide Barı açılır.' ] },
      { kosul: k => !k.has('zippo_kazima'), k: [
        'Barda birinin unuttuğu bir şey var. Sesi tanıdık.',
        'Zippo\'yu incele; sadece önüne bakma, altını da çevir.',
        'Kara Orkide: Zippo\'ya tıkla, kaydırıcıyla 180° civarına çevir: "S.Y. — Cinayet Büro 1994".' ] },
      { kosul: k => !k.has('pecete'), k: [
        'Islak bir kağıt bazen bir haritadan fazlasını söyler.',
        'Tezgâhtaki peçeteyi oku.',
        'Kara Orkide: peçeteye tıkla. "02:30 — Depo 7 — 4082 gelecek." Liman Deposu açılır.' ] },
      { kosul: k => !k.has('lastik') && !k.has('sandik'), k: [
        'Depoya biri bu gece araçla gelmiş.',
        'Islak betondaki izlere ve açık konteynerlere bak.',
        'Liman Deposu: zemindeki lastik izlerine ve sağdaki konteynerdeki sandıklara tıkla.' ] },
      { kosul: k => true, k: [
        'Ortağına en çok güvenen adam, kapıyı ona açar.',
        'Katil, kasette sesi duyulan çakmağın sahibi ve o gece 4082\'yi kullanan kişi.',
        'Selim Yavuz\'u suçla. Kanıt: "Zippo sesi eşleşmesi" (ya da Zippo kazıması) + "4082\'nin lastik izleri".' ] }
    ],
    ipucuCeza: [30, 60, 120],
    sonlar: {
      zafer: { baslik: 'DAVA KAPANDI', img: 'img/dedektif/1_sokak.webp',
        metin: 'Kelepçeyi taktığımda yağmur dinmişti. Selim yüzüme bakmadı.\n"On yıl, Selim," dedim. "On yıl o adam senin sırtını kolladı."\nCebimden Zippo\'yu çıkarıp masaya bıraktım. Klik. Klik. Bazı sesler bir ömür yankılanır.\nDemir\'in kaseti mahkeme salonunda çaldığında kimse nefes almadı. 711-RU sandıkları aynı gün mühürlendi.\nŞafak sökerken şehir yine kirliydi. Ama bu gece, biraz daha az.' },
      kacis: { baslik: 'KATİL ELİNİZDEN KAYDI', img: 'img/dedektif/6_depo.webp',
        metin: 'Selim\'i gözaltına aldık ama elimizde yeterli kanıt yoktu. Avukatı kırk sekiz saati bile beklemedi.\nMerdivenlerden inerken bana döndü ve Zippo\'sunu yaktı. Klik. Klik.\n"Bu şehirde gerçek, kanıtlayabildiğin kadardır," dedi.\nYağmur yeniden başladı. Depo 7\'nin kapısı ertesi sabah boştu.' },
      basarisiz: { baslik: 'YANLIŞ ADAM', img: 'img/dedektif/5_bar.webp',
        viktor: 'Viktor\'u limanda yakaladık. Liman kameraları onu cinayet saatinde güvertede gösterince savcı dosyayı yüzüme fırlattı.\nO gece biri gülüyordu. Muhtemelen 4082\'nin direksiyonunda.\nKöstebek hâlâ teşkilattaydı ve artık bizim yüzümüzü biliyordu.',
        tarik: 'Tek Göz\'ü içeri aldık: Demir\'i kurtarmaya çalışan tek adamı.\nÜç gün sonra salıverildi; bir hafta sonra Haliç\'te cesedi bulundu.\nKöstebek hâlâ teşkilattaydı. Kara Orkide\'nin tezgâhında artık kimse konuşmuyor.' }
    }
  }
};
const DK_ALBUM = [
  { id: 'motel204', ad: 'Gece Yarısı İnfazı: Motel 204', yer: 'Liman şehri · 1999', hazir: true },
  { id: 'karakoy', ad: 'Karaköy\'de Son Vardiya', yer: 'İstanbul, Karaköy · 1998', hazir: false },
  { id: 'vespera', ad: 'Sis Şehri', yer: 'Vespera (hayali şehir)', hazir: false },
  { id: 'uludag', ad: 'Kar Oteli', yer: 'Uludağ', hazir: false },
  { id: 'ekspres', ad: 'Mavi Tren', yer: 'Doğu Ekspresi', hazir: false },
  { id: 'bodrum', ad: 'Ölü Sezon', yer: 'Bodrum', hazir: false }
];
if (typeof module !== 'undefined' && module.exports) module.exports = { DK_VAKALAR, DK_ALBUM };
