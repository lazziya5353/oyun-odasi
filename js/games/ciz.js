// Çiz ve Tahmin Et: sırayla biri gizli kelimeyi çizer, diğerleri yazarak tahmin eder.
// Erken bilen daha çok puan alır; çizen de bilen her kişi için puan kazanır. Süre ilerledikçe harf ipucu açılır.
const CizCore = (() => {
  const WORDS = ('elma,armut,muz,çilek,karpuz,üzüm,limon,havuç,domates,patlıcan,mısır,mantar,simit,çay,kahve,dondurma,pasta,pizza,hamburger,börek,' +
    'balık,kedi,köpek,kuş,tavşan,fil,zürafa,aslan,kaplumbağa,yılan,örümcek,arı,kelebek,penguen,maymun,at,inek,tavuk,ördek,köpekbalığı,' +
    'ahtapot,yunus,deve,kirpi,baykuş,salyangoz,timsah,kurbağa,ayı,tilki,ev,okul,cami,köprü,kule,şato,çadır,deniz feneri,uçak,helikopter,' +
    'gemi,tren,otobüs,bisiklet,motosiklet,araba,roket,balon,paraşüt,denizaltı,güneş,ay,yıldız,bulut,yağmur,kar,şimşek,gökkuşağı,dağ,volkan,' +
    'ada,şelale,ağaç,çiçek,kaktüs,yaprak,orman,plaj,kum saati,saat,gözlük,şapka,ayakkabı,çorap,eldiven,atkı,elbise,kravat,taç,yüzük,' +
    'telefon,bilgisayar,televizyon,kulaklık,kamera,gitar,davul,piyano,keman,mikrofon,kitap,kalem,makas,cetvel,silgi,çanta,anahtar,kilit,' +
    'şemsiye,mum,lamba,ampul,ayna,yatak,sandalye,masa,kapı,pencere,merdiven,çekiç,testere,tornavida,fırça,boya,top,kale,raket,kaykay,' +
    'zar,tavla,satranç,kart,oyun kolu,robot,uzaylı,hayalet,korsan,şövalye,prenses,kral,büyücü,ejderha,deniz kızı,kardan adam,palyaço,' +
    'astronot,itfaiyeci,doktor,aşçı,polis,futbol,basketbol,yüzme,kayak,balık tutmak,uyumak,koşmak,dans etmek,gülmek,ağlamak,' +
    'pamuk şeker,mangal,piknik,çaydanlık,semaver,nazar boncuğu,kebap,lahmacun,baklava,ayran,martı,vapur,minare,lale,çınar,' +
    'tren rayı,trafik lambası,yangın,çit,kuyu,değirmen,traktör,kamyon,ambulans,pusula,harita,hazine,dürbün,mıknatıs,pil,priz,' +
    'zebra,gergedan,su aygırı,kanguru,koala,panda,kutup ayısı,fok,balina,denizatı,denizyıldızı,yengeç,ıstakoz,karides,midye,papağan,flamingo,leylek,kartal,karga,güvercin,tavus kuşu,devekuşu,horoz,civciv,kaz,hindi,koyun,keçi,kuzu,eşek,geyik,sincap,fare,köstebek,yarasa,kertenkele,bukalemun,dinozor,solucan,uğur böceği,sivrisinek,karınca,çekirge,akrep,ateşböceği,denizanası,kunduz,lama,leopar,kaplan,goril,tembel hayvan,su samuru,kuğu,ekmek,peynir,zeytin,yumurta,sucuk,çorba,makarna,pilav,mantı,döner,köfte,şiş kebap,kumpir,gözleme,pide,poğaça,kurabiye,kek,çikolata,lokum,sütlaç,krep,sandviç,tost,patates kızartması,sosis,patlamış mısır,nar,kiraz,şeftali,ananas,kivi,hindistan cevizi,avokado,brokoli,lahana,salatalık,biber,soğan,sarımsak,patates,kabak,bezelye,fındık,ceviz,bal,yoğurt,süt,limonata,buzdolabı,çamaşır makinesi,ütü,süpürge,saç kurutma makinesi,diş fırçası,diş macunu,tarak,havlu,sabun,küvet,duş,tuvalet,kanepe,koltuk,dolap,çekmece,halı,perde,yastık,battaniye,saksı,vazo,tablo,çerçeve,takvim,çalar saat,kumanda,şarj aleti,klavye,hoparlör,radyo,fotoğraf makinesi,mektup,zarf,gazete,defter,ataç,zımba,yapıştırıcı,pergel,hesap makinesi,tebeşir,kara tahta,sırt çantası,cüzdan,bozuk para,kredi kartı,bavul,termos,el feneri,kibrit,balta,kürek,tırmık,hortum,el arabası,iğne,iplik,düğme,fermuar,kemer,bere,kask,maske,pijama,mayo,şort,etek,gömlek,ceket,mont,bot,terlik,topuklu ayakkabı,papyon,küpe,kolye,bilezik,hastane,eczane,market,fırın,kütüphane,müze,stadyum,havalimanı,liman,istasyon,park,salıncak,kaydırak,tahterevalli,lunapark,dönme dolap,atlıkarınca,sirk,kamp ateşi,piramit,yel değirmeni,çeşme,havuz,kum kalesi,iskele,tekne,yelkenli,kano,sal,taksi,tramvay,metro,teleferik,itfaiye arabası,polis arabası,kepçe,vinç,paten,kızak,sörf tahtası,uçurtma,zeplin,sıcak hava balonu,uydu,uzay mekiği,gezegen,kuyruklu yıldız,kara delik,kar tanesi,buz dağı,çöl,vaha,palmiye,mağara,nehir,göl,kasırga,deprem,dolu,sis,gün batımı,yonca,gül,papatya,ayçiçeği,bambu,çam ağacı,yılbaşı ağacı,kozalak,zıplamak,uçmak,tırmanmak,düşmek,hapşırmak,esnemek,el sallamak,alkışlamak,sarılmak,selfie,şarkı söylemek,kitap okumak,yemek pişirmek,bulaşık yıkamak,kamp yapmak,bisiklet sürmek,dalış,paraşütle atlamak,buz pateni,bowling,golf,tenis,voleybol,masa tenisi,boks,okçuluk,güreş,halat çekme,saklambaç,seksek,ip atlamak,misket,vampir,zombi,mumya,cadı,peri,melek,dev,cüce,ninja,kovboy,dedektif,sihirbaz,bebek,dede,nine,gelin,damat,berber,garson,çiftçi,ressam,şarkıcı,futbolcu,hakem,kaleci,noel baba,korkuluk,süper kahraman,pelerin,kılıç,kalkan,ok ve yay,hazine sandığı,sihirli değnek,kristal küre,uçan halı,tek boynuzlu at,göz,burun,kulak,ağız,diş,saç,bıyık,sakal,el,ayak,parmak,kalp,beyin,iskelet,göbek,diz,bayrak,fes,kilim,cezve,kokoreç,midye dolma,çay bardağı,okey taşı,boğaz köprüsü,kız kulesi,galata kulesi,peri bacası,karagöz,davul zurna,horon,halay,nazar,tespih,çömlek,testi,kazan,tencere,tava,çatal,kaşık,bıçak,tabak,bardak,fincan,demlik,süzgeç,rende,oklava,hamur,kepçe kaşık,mikser,blender,tost makinesi,kahve makinesi,su ısıtıcısı,mikrodalga,ocak,davlumbaz,çöp kutusu,kova,paspas,mandal,çamaşır ipi,askı,ayakkabılık,kapı zili,posta kutusu,çit,bahçe cücesi,kuş yuvası,kümes,ahır,saman balyası,korkuluk,su kuyusu,köprü altı,tünel,trafik konisi,yaya geçidi,otoyol,benzinlik,park metre,sokak lambası,bank,heykel,gökdelen,asansör,yürüyen merdiven,anten,çanak anten,güneş paneli,rüzgar türbini,baraj,deniz kabuğu,inci,mercan,dalga,kum,ada,yarımada,pusula gülü,dürbün,mikroskop,teleskop,deney tüpü,mıknatıs,ampul,kibrit kutusu,mum ışığı,fener alayı,havai fişek,doğum günü pastası,hediye kutusu,balon demeti,konfeti,maske balo,karnaval,tiyatro,sinema,patlamış mısır kovası,bilet,kamera arkası,film şeridi,mikrofon sehpası,sahne,alkış,kupa,madalya,podyum,bitiş çizgisi,düdük,kronometre,' +
    'çita,kobra,anakonda,piranha,orka,japon balığı,mors,pelikan,serçe,kanarya,muhabbet kuşu,saksağan,ağaçkakan,kolibri,kuzgun,şahin,' +
    'akbaba,martı yuvası,ördek yavrusu,kurbağa yavrusu,tırtıl,koza,hamamböceği,sinek,yusufçuk,salyangoz kabuğu,istiridye,kalamar,vatoz,' +
    'kılıç balığı,balon balığı,palyaço balığı,yılan balığı,deniz kaplumbağası,kurt,çakal,sırtlan,yaban domuzu,domuz,manda,katır,' +
    'ren geyiği,alpaka,kokarca,hamster,gelincik,porsuk,rakun,armadillo,karıncayiyen,su kaplumbağası,iguana,kaplan yavrusu,aslan yelesi,' +
    'fil hortumu,zürafa boynu,kedi patisi,köpek kemiği,kuş kafesi,akvaryum,kedi kumu,tasma,mama kabı,şeftali ağacı,elma ağacı,' +
    'üzüm salkımı,muz kabuğu,karpuz dilimi,çilek reçeli,limon dilimi,portakal,mandalina,greyfurt,armut ağacı,erik,kayısı,incir,vişne,' +
    'böğürtlen,ahududu,yaban mersini,dut,hurma,kestane,fıstık,badem,mısır koçanı,bezelye kabuğu,enginar,pırasa,ıspanak,turp,pancar,' +
    'mantar şapkası,kırmızı biber,acı biber,zencefil,dereotu,maydanoz,nane,fesleğen,hamburger menü,hot dog,taco,suşi,erişte,köri,ramen,' +
    'donut,kruvasan,simit tablası,açma,çörek,pankek,waffle,sufle,tiramisu,cheesecake,kurabiye kavanozu,şeker kamışı,lolipop,sakız,' +
    'jelibon,akide şekeri,pamuk helva,dondurma külahı,milkshake,smoothie,kola,maden suyu,çay demliği,kahve fincanı,türk kahvesi,' +
    'meyve suyu,su şişesi,süt kutusu,yumurta kabı,sahanda yumurta,omlet,menemen,kuru fasulye,mercimek çorbası,karnıyarık,iskender,' +
    'adana kebap,çiğ köfte,tantuni,künefe,kadayıf,aşure,helva,pişmaniye,şömine,avize,abajur,sehpa,kitaplık,beşik,ranza,çekyat,puf,' +
    'tabure,mutfak tezgahı,lavabo,musluk,klozet,şofben,kombi,kalorifer,klima,vantilatör,ısıtıcı,nem alma,priz uzatma,uzatma kablosu,' +
    'anahtarlık,kilit dili,kapı kolu,kapı tokmağı,menteşe,çivi,vida,somun,anahtar takımı,pense,kerpeten,matkap,şerit metre,su terazisi,' +
    'zımpara,merdiven basamağı,boya rulosu,boya kovası,el feneri pili,yangın tüpü,yangın alarmı,duman dedektörü,güvenlik kamerası,' +
    'kapı dürbünü,zil düğmesi,diz üstü bilgisayar,tablet,akıllı saat,oyun konsolu,joystick,fare altlığı,web kamerası,yazıcı,tarayıcı,' +
    'usb bellek,hafıza kartı,modem,wifi,uydu anteni,drone,robot süpürge,sanal gerçeklik gözlüğü,üç boyutlu yazıcı,elektrikli scooter,' +
    'elektrikli araba,şarj istasyonu,powerbank,kablosuz kulaklık,akıllı telefon,emoji,kalp emojisi,gülen surat,ağlayan surat,kulübe,' +
    'kale burcu,saray,iglo,ağaç ev,çiftlik evi,deniz feneri kulesi,saat kulesi,rüzgar gülü,değirmen taşı,kuyu kovası,köy evi,apartman,' +
    'balkon,çatı,baca,kiremit,pencere pervazı,panjur,tente,bahçe kapısı,posta kutusu bayrağı,köpek kulübesi,kuş evi,arı kovanı,sera,' +
    'çadır kampı,karavan,kamp sandalyesi,bisiklet kaskı,dizlik,kar gözlüğü,kayak batonu,snowboard,buz hokeyi,hokey sopası,' +
    'beyzbol sopası,beyzbol eldiveni,amerikan futbolu,rugby topu,golf sopası,golf topu,bilardo,istaka,dart tahtası,dart oku,langırt,' +
    'masa futbolu,satranç atı,satranç şahı,piyon,zar atmak,iskambil kağıdı,maça ası,kupa ası,joker kartı,yapboz parçası,rubik küpü,' +
    'domino taşı,topaç,yoyo,su tabancası,su balonu,kum kovası,kürek kova,şişme bot,can simidi,deniz yatağı,şnorkel,palet,dalgıç tüpü,' +
    'saat kulesi zili,kum saati düşmesi,güneş saati,takvim yaprağı,ajanda,not kağıdı,yapışkan not,dosya,klasör,raptiye,mantar pano,' +
    'lastik silgi,kurşun kalem,tükenmez kalem,dolma kalem,mürekkep,fosforlu kalem,boya kalemi,pastel boya,suluboya,palet boya,şövale,' +
    'tuval,heykeltıraş,kil,çömlek çarkı,origami kuğu,kağıt uçak,kağıt gemi,konfeti topu,gitar penası,bateri,trompet,saksafon,flüt,' +
    'klarnet,akordeon,arp,çello,ukulele,bağlama,ney,zurna,darbuka,tef,zil,ksilofon,mızıka,nota,sol anahtarı,metronom,kulaklık seti,' +
    'plak,pikap,kaset,walkman,megafon,cankurtaran,cerrah,hemşire,eczacı,veteriner,diş hekimi,öğretmen,öğrenci,mezun,pilot,hostes,' +
    'kaptan,denizci,balıkçı,avcı,çoban,arıcı,bahçıvan,marangoz,demirci,kuyumcu,saatçi,terzi,kasap,fırıncı,pastacı,dondurmacı,simitçi,' +
    'çaycı,postacı,kurye,çöpçü,inşaat işçisi,madenci,astronom,bilim insanı,mucit,arkeolog,kaşif,dağcı,dalgıç,jokey,boksör,güreşçi,okçu,' +
    'kayakçı,sörfçü,patenci,dansçı,balerin,şef,orkestra şefi,davulcu,gitarist,dj,palyaço burnu,sihirbaz şapkası,korsan gemisi,' +
    'korsan şapkası,göz bandı,tahta bacak,hazine haritası,altın para,elmas,yakut,taç mücevheri,asa,kral tahtı,kale kapısı,şato kulesi,' +
    'ejderha yumurtası,anka kuşu,pegasus,deniz canavarı,kraken,minotor,tepegöz,cin lambası,sihirli halı,büyü kitabı,iksir,cadı kazanı,' +
    'cadı süpürgesi,balkabağı feneri,örümcek ağı,yarasa kanadı,hayalet kostümü,iskelet eli,mezar taşı,tabut,zombi eli,uzay gemisi,' +
    'uçan daire,ufo,uzaylı anteni,robot kol,lazer kılıcı,ışın tabancası,astronot kaskı,ay yüzeyi,ay arabası,mars kayası,satürn halkası,' +
    'güneş tutulması,ay tutulması,kayan yıldız,takımyıldız,büyük ayı,yağmur damlası,yağmur çizmesi,su birikintisi,çamur,kar topu,' +
    'kardan kale,kızak kaymak,buz sarkıtı,kar küreği,kırağı,sis lambası,rüzgar,yaprak dökümü,sonbahar yaprağı,bahar çiçeği,' +
    'arı ve çiçek,gökkuşağı köprüsü,şimşek çakması,fırtına bulutu,tsunami,çığ,yanardağ lavı,şelale havuzu,kaya,çakıl taşı,' +
    'mağara sarkıtı,fosil,kum tepesi,deve kervanı,vaha palmiyesi,kaktüs çiçeği,yüzmek,dalmak,kürek çekmek,balık yakalamak,ata binmek,' +
    'deve sürmek,ip cambazı,trambolin,takla atmak,amuda kalkmak,şınav çekmek,mekik,koşu bandı,halter kaldırmak,yoga yapmak,meditasyon,' +
    'kaykay yapmak,sörf yapmak,kayak yapmak,dağa tırmanmak,çadır kurmak,ateş yakmak,mangal yakmak,ızgara yapmak,pasta kesmek,' +
    'mum üflemek,hediye açmak,dilek tutmak,fotoğraf çekmek,video çekmek,resim yapmak,heykel yapmak,örgü örmek,dikiş dikmek,ütü yapmak,' +
    'çamaşır asmak,yer silmek,cam silmek,toz almak,çöp atmak,bahçe sulamak,çim biçmek,ağaç dikmek,tohum ekmek,çiçek koklamak,' +
    'kelebek yakalamak,kuş beslemek,köpek gezdirmek,kedi sevmek,balık beslemek,telefonla konuşmak,mesaj yazmak,klavyede yazmak,' +
    'oyun oynamak,televizyon izlemek,film izlemek,kitap yazmak,mektup yazmak,ders çalışmak,sınava girmek,parmak kaldırmak,' +
    'tahtaya yazmak,uyuklamak,horlamak,rüya görmek,uykuya dalmak,yataktan düşmek,diş fırçalamak,yüz yıkamak,duş almak,saç taramak,' +
    'makyaj yapmak,tıraş olmak,giyinmek,ayakkabı bağlamak,kravat bağlamak,merdiven çıkmak,asansöre binmek,otobüse binmek,' +
    'taksi çağırmak,trene yetişmek,uçağa binmek,bavul taşımak,harita okumak,yol sormak,kaybolmak,şemsiye açmak,yağmurda ıslanmak,' +
    'kar topu oynamak,kardan adam yapmak,gülümsemek,kızmak,şaşırmak,korkmak,utanmak,göz kırpmak,dil çıkarmak,omuz silkmek,' +
    'kafa sallamak,el sıkışmak,öpücük göndermek,kalp yapmak,beşlik çakmak,yumruk tokuşturmak,tebrik etmek,dans pisti,halay çekmek,' +
    'horon tepmek,zeybek').split(',').map(w => w.trim()).filter((w, i, a) => w && a.indexOf(w) === i);
  const FOLD = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  const fold = t => String(t || '').toLocaleLowerCase('tr-TR').replace(/[çğıiöşüâîû]/g, c => FOLD[c]).replace(/[^a-z0-9]/g, '');
  function lev(a, b){
    if (Math.abs(a.length - b.length) > 2) return 9;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++){
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  // tahmin: 'dogru' | 'yakin' | 'yanlis'
  function judge(guess, word){
    const g = fold(guess), w = fold(word);
    if (!g) return 'yanlis';
    if (g === w) return 'dogru';
    if (w.length >= 4 && lev(g, w) <= 1) return 'yakin';
    return 'yanlis';
  }
  // ipucu: açılmamış harfler '_' (boşluklar korunur)
  const mask = (word, shown) => [...word].map((ch, i) => ch === ' ' ? ' ' : shown.includes(i) ? ch.toLocaleUpperCase('tr-TR') : '_').join('');
  const guessPoints = (left, total) => Math.max(40, Math.round(60 + 240 * Math.max(0, left) / total));
  return { WORDS, fold, judge, mask, guessPoints, lev };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CizCore;

if (typeof registerTableGame === 'function') (function(){
  const C = CizCore;
  const T_PICK = 12000, T_GAP = 5500, MAX_PTS = 24000;
  const seatedIds = o => o.sum.seats.filter(x => x && !x.bot).map(x => x.id);
  const nameOf = (st, id) => st.names[id] || 'Oyuncu';
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // önceki oyunlarda çıkan kelimeler (masa sahibinin cihazında) bir süre tekrar sunulmaz
  const HK = 'oyunodasi-ciz-gecmis';
  const hist = () => { try { return JSON.parse(localStorage.getItem(HK)) || []; } catch(e){ return []; } };
  function remember(w){ const h = hist(); h.push(w); try { localStorage.setItem(HK, JSON.stringify(h.slice(-Math.floor(C.WORDS.length * 0.75)))); } catch(e){} }
  function pickWords(st){
    const h = hist();
    let pool = C.WORDS.filter(w => !st.usedWords.includes(w) && !h.includes(w));
    if (pool.length < 3) pool = C.WORDS.filter(w => !st.usedWords.includes(w));
    return shuffle(pool.length >= 3 ? pool.slice() : C.WORDS.slice()).slice(0, 3);
  }
  function beginTurn(o){
    const st = o.state, here = seatedIds(o);
    // sırası gelen hâlâ masadaysa o çizer; değilse sıradakine geç
    while (st.turnIdx < st.order.length && !here.includes(st.order[st.turnIdx])) st.turnIdx++;
    if (st.turnIdx >= st.order.length){
      st.round++; st.turnIdx = 0;
      st.order = st.order.filter(id => here.includes(id)).concat(here.filter(id => !st.order.includes(id)));
      if (st.round > st.rounds || st.order.length < 2){ endGame(o); return; }
    }
    st.drawer = st.order[st.turnIdx];
    st.phase = 'sec'; st.choices = pickWords(st); st.word = ''; st.endsAt = Date.now() + T_PICK;
    st.guessed = {}; st.strokes = []; st.shown = []; st.gain = {}; st.seq++;
  }
  function chooseWord(o, i){
    const st = o.state;
    st.word = st.choices[i] || st.choices[0]; st.usedWords.push(st.word); remember(st.word);
    st.phase = 'ciz'; st.endsAt = Date.now() + st.sure * 1000; st.total = st.sure * 1000; st.seq++;
    sendEvent(o, { k: 'sys', text: nameOf(st, st.drawer) + ' çiziyor!' });
  }
  function endTurn(o, why){
    const st = o.state;
    if (st.phase !== 'ciz' && st.phase !== 'sec') return;
    const n = Object.keys(st.guessed).length;
    if (st.phase === 'ciz' && n){ const dp = Math.min(240, 60 * n); st.scores[st.drawer] = (st.scores[st.drawer] || 0) + dp; st.gain[st.drawer] = dp; }
    st.phase = 'ara'; st.why = why || ''; st.endsAt = Date.now() + T_GAP; st.seq++;
  }
  function endGame(o){
    const st = o.state;
    st.phase = 'bitti'; st.endsAt = 0; st.seq++;
    const top = Object.keys(st.scores).sort((a, b) => st.scores[b] - st.scores[a])[0];
    if (top) addSys('🏆 Çiz ve Tahmin Et bitti! Kazanan: ' + nameOf(st, top) + ' (' + st.scores[top] + ' puan)');
  }
  function hintTimes(st){ return [0.5, 0.75].map(f => st.endsAt - st.total + st.total * f); }

  registerTableGame('ciz', {
    name: 'Çiz ve Tahmin Et', icon: '🎨', seats: 8, minPlayers: 2, bots: false, joinMidGame: true,
    cleanOpts: o => ({ rounds: [1, 2, 3, 4].includes(+o.rounds) ? +o.rounds : 2, sure: [60, 80, 100].includes(+o.sure) ? +o.sure : 80 }),
    variantName: s => s.opts.rounds + ' tur · ' + s.opts.sure + ' sn çizim',
    seatLabel: () => 'Oyuncu',
    waitText: (s, own) => own ? 'En az 2 kişi oturunca “Oyunu başlat”a bas. Sonradan gelenler de oturup katılabilir.' : 'Bir koltuğa otur; masa sahibi başlatınca oyun burada açılır.',
    makeCard: {
      desc: '2-8 kişi. Biri çizer, herkes tahmin eder. Erken bilen çok puan alır.',
      opts: '<label>Tur (herkes her turda bir kez çizer)<select data-o="rounds"><option value="1">1 tur</option><option value="2" selected>2 tur</option><option value="3">3 tur</option><option value="4">4 tur</option></select></label>' +
        '<label>Çizim süresi<select data-o="sure"><option value="60">60 sn</option><option value="80" selected>80 sn</option><option value="100">100 sn</option></select></label>',
      read: c => ({ rounds: c.querySelector('[data-o=rounds]').value, sure: c.querySelector('[data-o=sure]').value })
    },
    start(o){
      const ids = shuffle(seatedIds(o));
      o.state = { phase: 'sec', round: 1, rounds: o.sum.opts.rounds, sure: o.sum.opts.sure, order: ids, turnIdx: 0, drawer: null,
        choices: [], word: '', usedWords: [], scores: {}, names: {}, guessed: {}, strokes: [], shown: [], gain: {}, seq: 0, pts: 0 };
      o.sum.seats.forEach(x => { if (x && !x.bot){ o.state.names[x.id] = x.name; o.state.scores[x.id] = 0; } });
      beginTurn(o);
      return o.state;
    },
    onSeat(o, seat){
      const st = o.state, x = o.sum.seats[seat];
      st.names[x.id] = x.name; if (st.scores[x.id] == null) st.scores[x.id] = 0;
      if (!st.order.includes(x.id)) st.order.push(x.id);
      sendViews(o);
    },
    onLeave(o){
      const st = o.state;
      if ((st.phase === 'ciz' || st.phase === 'sec') && !seatedIds(o).includes(st.drawer)){ endTurn(o, 'Çizen ayrıldı'); sendViews(o); pump(o); return; }
      if (seatedIds(o).length < 2 && st.phase !== 'bitti'){ endGame(o); sendViews(o); return; }
      sendViews(o);
    },
    act(o, seat, a, who){
      const st = o.state; if (!st) return;
      if (a.type === 'newMatch'){ if (st.phase !== 'bitti' || who !== o.sum.owner) return; this.start(o); sendViews(o); pump(o); return; }
      if (a.type === 'gec' && who === o.sum.owner && (st.phase === 'ciz' || st.phase === 'sec')){ endTurn(o, 'Masa sahibi geçti'); sendViews(o); pump(o); return; }
      if (seat < 0) return;
      const drawer = who === st.drawer;
      if (a.type === 'sec' && drawer && st.phase === 'sec'){ chooseWord(o, +a.i); sendViews(o); pump(o); return; }
      if (st.phase !== 'ciz') return;
      if (drawer && a.type === 'cizgi' && Array.isArray(a.pts) && typeof a.sid === 'string'){
        if (st.pts > MAX_PTS) return;
        const pts = a.pts.slice(0, 200).filter(p => Array.isArray(p) && p.length === 2).map(p => [Math.max(0, Math.min(1000, Math.round(+p[0]) || 0)), Math.max(0, Math.min(750, Math.round(+p[1]) || 0))]);
        if (!pts.length) return;
        const c = /^#[0-9a-f]{6}$/i.test(a.c) ? a.c : '#111111', w = Math.max(2, Math.min(40, +a.w || 6));
        let sk = st.strokes.find(x => x.sid === a.sid);
        if (!sk){ sk = { sid: clip(a.sid, 20), c, w, pts: [] }; st.strokes.push(sk); }
        sk.pts.push(...pts); st.pts += pts.length;
        sendEvent(o, { k: 'cizgi', sid: sk.sid, c, w, pts }, who);
        return;
      }
      if (drawer && a.type === 'temizle'){ st.strokes = []; st.pts = 0; sendEvent(o, { k: 'temizle' }, who); return; }
      if (drawer && a.type === 'geri'){ st.strokes.pop(); sendEvent(o, { k: 'geri' }, who); return; }
      if (!drawer && a.type === 'tahmin' && typeof a.text === 'string'){
        const text = clip(a.text, 40); if (!text) return;
        const name = nameOf(st, who);
        st.names[who] = o.sum.seats[seat].name;
        if (st.guessed[who] != null) return;
        const j = C.judge(text, st.word);
        if (j === 'dogru'){
          const pts = C.guessPoints(st.endsAt - Date.now(), st.total);
          st.guessed[who] = pts; st.gain[who] = pts; st.scores[who] = (st.scores[who] || 0) + pts; st.seq++;
          sendEvent(o, { k: 'dogru', name, pts });
          const guessers = seatedIds(o).filter(id => id !== st.drawer);
          if (guessers.every(id => st.guessed[id] != null)) endTurn(o, 'Herkes bildi!');
          sendViews(o); pump(o);
          return;
        }
        if (j === 'yakin') sendTo(who, { t: 'tb-ev', id: o.sum.id, ev: { k: 'yakin', text } });
        else sendEvent(o, { k: 'tahmin', name, text });
      }
    },
    pump(o){
      const st = o.state, now = Date.now();
      if (st.phase === 'sec') later(o, Math.max(0, st.endsAt - now), () => { chooseWord(o, 0); sendViews(o); pump(o); });
      else if (st.phase === 'ciz'){
        later(o, Math.max(0, st.endsAt - now), () => { endTurn(o, 'Süre doldu'); sendViews(o); pump(o); });
        const next = hintTimes(st).find((t, i) => st.shown.length <= i && t > now - 50);
        if (next != null) later(o, Math.max(0, next - now), () => {
          const idx = [...st.word].map((ch, i) => i).filter(i => st.word[i] !== ' ' && !st.shown.includes(i));
          if (idx.length > 2) st.shown.push(idx[Math.floor(Math.random() * idx.length)]);
          st.seq++; sendViews(o); pump(o);
        });
      } else if (st.phase === 'ara') later(o, Math.max(0, st.endsAt - now), () => { st.turnIdx++; beginTurn(o); sendViews(o); pump(o); });
    },
    view(o, seat){
      const st = o.state, me_ = seat >= 0 && o.sum.seats[seat] ? o.sum.seats[seat].id : null;
      const drawer = me_ && me_ === st.drawer, reveal = st.phase === 'ara' || st.phase === 'bitti' || drawer || (me_ && st.guessed[me_] != null);
      const ids = [...new Set([...st.order, ...Object.keys(st.scores)])];
      return {
        phase: st.phase, round: st.round, rounds: st.rounds, seq: st.seq, me: me_, drawer: st.drawer, drawerName: st.drawer ? nameOf(st, st.drawer) : '',
        endsIn: st.endsAt ? Math.max(0, st.endsAt - Date.now()) : 0, total: st.phase === 'sec' ? T_PICK : st.phase === 'ara' ? T_GAP : st.sure * 1000,
        choices: drawer && st.phase === 'sec' ? st.choices : null,
        word: reveal ? st.word : '', mask: st.word ? C.mask(st.word, st.shown) : '', len: [...st.word].filter(ch => ch !== ' ').length,
        strokes: st.phase === 'ciz' || st.phase === 'ara' ? st.strokes : [], why: st.why || '',
        players: ids.map(id => ({ id, name: nameOf(st, id), score: st.scores[id] || 0, guessed: st.guessed[id] != null, gain: st.gain[id] || 0,
          here: o.sum.seats.some(x => x && x.id === id), drawing: id === st.drawer }))
      };
    },
    render: (body, s, lv) => renderCiz(body, s, lv),
    onEvent: (ev, s) => cizEvent(ev, s),
    isMyTurn: (v, seat) => seat >= 0 && v.drawer === v.me && v.phase === 'sec',
    turnKey: v => v.round + ':' + v.drawer
  });
})();

// ---------- arayüz ----------
const CIZ_COLORS = ['#111111', '#ffffff', '#8a8a8a', '#e53935', '#ff9800', '#ffeb3b', '#43a047', '#00bcd4', '#1e88e5', '#8e24aa', '#ff80ab', '#795548'];
const cz = { key: '', strokes: [], color: '#111111', width: 6, cur: null, sendT: null, buf: [], deadline: 0, timer: null, feed: [] };
function renderCiz(body, s, lv){
  const v = lv.v, drawing = v.drawer === v.me && lv.seat >= 0;
  let root = body.querySelector('.cz');
  const key = v.round + ':' + v.drawer + ':' + v.phase + ':' + (drawing ? 'd' : 'g') + ':' + (lv.seat >= 0);
  if (!root || cz.key !== key){
    const prevPhase = cz.key.split(':')[2], sameTurn = root && cz.key.split(':').slice(0, 2).join(':') === key.split(':').slice(0, 2).join(':');
    cz.key = key;
    if (!sameTurn) cz.feed = [];
    body.innerHTML = '';
    root = document.createElement('div'); root.className = 'cz cz-' + v.phase + (drawing ? ' drawer' : '');
    root.innerHTML =
      '<div class="cz-top"><span class="cz-round"></span><span class="cz-word"></span><span class="cz-time"></span></div>' +
      '<div class="cz-mid"><div class="cz-stage"><canvas class="cz-canvas" width="1000" height="750"></canvas><div class="cz-over" hidden></div></div>' +
      '<div class="cz-tools" hidden></div></div>' +
      '<div class="cz-side"><ol class="cz-players"></ol><div class="cz-feed"></div><form class="cz-guess"><input type="text" maxlength="40" placeholder="Tahminini yaz…" autocomplete="off" spellcheck="false"><button class="btn primary">↵</button></form></div>';
    body.append(root);
    cz.strokes = (v.strokes || []).map(k => ({ sid: k.sid, c: k.c, w: k.w, pts: k.pts.slice() }));
    redrawCiz(root);
    if (drawing && v.phase === 'ciz') buildCizTools(root);
    setupCizCanvas(root, drawing && v.phase === 'ciz');
    const form = root.querySelector('.cz-guess'), inp = form.querySelector('input');
    form.onsubmit = e => { e.preventDefault(); const t = inp.value.trim(); if (!t) return; tableAct({ type: 'tahmin', text: t }); inp.value = ''; };
    cz.feed.forEach(f => addCizFeed(root, f, true));
    if (v.phase === 'ciz' && !drawing && lv.seat >= 0 && !matchMedia('(max-width:860px)').matches) setTimeout(() => inp.focus(), 60);
    if (v.phase === 'bitti') setTimeout(() => confetti(root), 300);
    if (v.phase === 'sec' && drawing) gameSound('turn');
    if (v.phase === 'ara' && prevPhase === 'ciz') gameSound(v.players.some(p => p.guessed) ? 'win' : 'err');
  }
  cz.deadline = Date.now() + (v.endsIn || 0);
  root.querySelector('.cz-round').textContent = v.phase === 'bitti' ? 'Oyun bitti' : 'Tur ' + Math.min(v.round, v.rounds) + '/' + v.rounds;
  const wd = root.querySelector('.cz-word');
  if (v.phase === 'ciz') wd.textContent = v.word ? (drawing ? '✏️ ' : '✓ ') + v.word.toLocaleUpperCase('tr-TR') : v.mask.split('').join(' ') + '  (' + v.len + ')';
  else wd.textContent = v.phase === 'sec' ? (drawing ? 'Bir kelime seç' : v.drawerName + ' kelime seçiyor…') : '';
  wd.classList.toggle('hint', v.phase === 'ciz' && !v.word);
  // oyuncular
  const pl = root.querySelector('.cz-players'); pl.innerHTML = '';
  v.players.filter(p => p.here || p.score).sort((a, b) => b.score - a.score).forEach((p, i) => {
    const li = document.createElement('li'); li.className = (p.id === v.me ? 'me ' : '') + (p.guessed ? 'ok ' : '') + (p.drawing ? 'dr ' : '') + (p.here ? '' : 'gone');
    li.innerHTML = '<span class="n"></span><span class="nm"></span><span class="st"></span><b></b>';
    li.querySelector('.n').textContent = v.phase === 'bitti' && i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1;
    li.querySelector('.nm').textContent = p.name;
    li.querySelector('.st').textContent = p.drawing && v.phase !== 'bitti' ? '✏️' : p.guessed ? '✓' : '';
    li.querySelector('b').textContent = p.score + (p.gain && (v.phase === 'ara') ? ' (+' + p.gain + ')' : '');
    pl.append(li);
  });
  // tahmin kutusu
  const inp = root.querySelector('.cz-guess input'), btn = root.querySelector('.cz-guess button');
  const meP = v.players.find(p => p.id === v.me);
  const canGuess = v.phase === 'ciz' && lv.seat >= 0 && !drawing && !(meP && meP.guessed);
  inp.disabled = btn.disabled = !canGuess;
  inp.placeholder = drawing ? 'Sen çiziyorsun' : meP && meP.guessed ? 'Bildin! 🎉 Diğerlerini bekle' : lv.seat < 0 ? 'Tahmin için masaya otur' : v.phase === 'ciz' ? 'Tahminini yaz…' : '';
  // üst katman (seçim, ara, bitti)
  const ov = root.querySelector('.cz-over');
  ov.hidden = !(v.phase === 'sec' || v.phase === 'ara' || v.phase === 'bitti');
  ov.innerHTML = '';
  if (v.phase === 'sec'){
    const h = document.createElement('h3'); h.textContent = drawing ? 'Ne çizeceksin?' : '✏️ ' + v.drawerName + ' kelime seçiyor…'; ov.append(h);
    if (drawing && v.choices){
      const row = document.createElement('div'); row.className = 'cz-choices';
      v.choices.forEach((w, i) => { const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = w.toLocaleUpperCase('tr-TR'); b.onclick = () => tableAct({ type: 'sec', i }); row.append(b); });
      ov.append(row);
    }
  } else if (v.phase === 'ara'){
    const h = document.createElement('h3'); h.textContent = 'Kelime: ' + (v.word || '').toLocaleUpperCase('tr-TR'); ov.append(h);
    const p = document.createElement('p'); p.className = 'note'; p.textContent = v.why; ov.append(p);
    const ul = document.createElement('ul'); ul.className = 'cz-gains';
    v.players.filter(p2 => p2.gain).sort((a, b) => b.gain - a.gain).forEach(p2 => { const li = document.createElement('li'); li.textContent = p2.name + ' +' + p2.gain; ul.append(li); });
    if (!ul.children.length){ const li = document.createElement('li'); li.textContent = 'Kimse bilemedi 😅'; ul.append(li); }
    ov.append(ul);
  } else if (v.phase === 'bitti'){
    const h = document.createElement('h3'); h.textContent = '🏆 Oyun bitti'; ov.append(h);
    const ul = document.createElement('ol'); ul.className = 'cz-gains';
    v.players.slice().sort((a, b) => b.score - a.score).slice(0, 5).forEach(p2 => { const li = document.createElement('li'); li.textContent = p2.name + ' · ' + p2.score; ul.append(li); });
    ov.append(ul);
    if (s.owner === peer.id){ const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = '🔁 Yeni oyun'; b.onclick = () => tableAct({ type: 'newMatch' }); ov.append(b); }
  }
  if (s.owner === peer.id && (v.phase === 'ciz' || v.phase === 'sec')){
    let g = root.querySelector('.cz-skip');
    if (!g){ g = document.createElement('button'); g.className = 'btn small cz-skip'; g.textContent = '⏭ Geç'; g.title = 'Bu çizimi geç'; g.onclick = () => tableAct({ type: 'gec' }); root.querySelector('.cz-top').append(g); }
  }
  clearInterval(cz.timer);
  const tick = () => {
    if (!root.isConnected){ clearInterval(cz.timer); return; }
    const left = Math.max(0, cz.deadline - Date.now());
    const t = root.querySelector('.cz-time');
    t.textContent = v.phase === 'bitti' ? '' : '⏱ ' + Math.ceil(left / 1000);
    t.classList.toggle('low', v.phase === 'ciz' && left < 10000);
  };
  tick(); cz.timer = setInterval(tick, 250);
}
function buildCizTools(root){
  const t = root.querySelector('.cz-tools'); t.hidden = false; t.innerHTML = '';
  CIZ_COLORS.forEach(c => {
    const b = document.createElement('button'); b.className = 'cz-col' + (cz.color === c ? ' on' : ''); b.style.background = c; b.title = c;
    b.onclick = () => { cz.color = c; t.querySelectorAll('.cz-col').forEach(x => x.classList.toggle('on', x === b)); t.querySelector('.cz-er').classList.remove('on'); };
    t.append(b);
  });
  const sep = () => { const s = document.createElement('span'); s.className = 'cz-sep'; t.append(s); };
  sep();
  [[3, 'İnce'], [7, 'Orta'], [16, 'Kalın']].forEach(([w, n]) => {
    const b = document.createElement('button'); b.className = 'cz-size' + (cz.width === w ? ' on' : ''); b.title = n;
    b.innerHTML = '<i style="width:' + (w + 4) + 'px;height:' + (w + 4) + 'px"></i>';
    b.onclick = () => { cz.width = w; t.querySelectorAll('.cz-size').forEach(x => x.classList.toggle('on', x === b)); };
    t.append(b);
  });
  sep();
  const er = document.createElement('button'); er.className = 'cz-tool cz-er'; er.textContent = '🧽'; er.title = 'Silgi';
  er.onclick = () => { er.classList.toggle('on'); };
  const un = document.createElement('button'); un.className = 'cz-tool'; un.textContent = '↶'; un.title = 'Geri al';
  un.onclick = () => { if (!cz.strokes.length) return; cz.strokes.pop(); redrawCiz(root); tableAct({ type: 'geri' }); };
  const cl = document.createElement('button'); cl.className = 'cz-tool'; cl.textContent = '🗑'; cl.title = 'Hepsini sil';
  cl.onclick = () => { cz.strokes = []; redrawCiz(root); tableAct({ type: 'temizle' }); };
  t.append(er, un, cl);
}
function drawStroke(ctx, k, from){
  const p = k.pts; if (!p.length) return;
  ctx.strokeStyle = k.c; ctx.fillStyle = k.c; ctx.lineWidth = k.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (p.length === 1 || (from || 0) >= p.length - 1 && p.length === 1){ ctx.beginPath(); ctx.arc(p[0][0], p[0][1], k.w / 2, 0, Math.PI * 2); ctx.fill(); return; }
  const s = Math.max(0, (from || 0) - 1);
  ctx.beginPath(); ctx.moveTo(p[s][0], p[s][1]);
  for (let i = s + 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
  ctx.stroke();
}
function redrawCiz(root){
  const cv = root.querySelector('.cz-canvas'), ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
  cz.strokes.forEach(k => drawStroke(ctx, k, 0));
}
function setupCizCanvas(root, canDraw){
  const cv = root.querySelector('.cz-canvas'), ctx = cv.getContext('2d');
  if (!canDraw) return;
  cv.classList.add('can');
  const pos = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 1000), Math.round((e.clientY - r.top) / r.height * 750)]; };
  const flush = () => {
    if (!cz.cur || !cz.buf.length) return;
    tableAct({ type: 'cizgi', sid: cz.cur.sid, c: cz.cur.c, w: cz.cur.w, pts: cz.buf.splice(0) });
  };
  cv.onpointerdown = e => {
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const erase = root.querySelector('.cz-er') && root.querySelector('.cz-er').classList.contains('on');
    cz.cur = { sid: rid(), c: erase ? '#ffffff' : cz.color, w: erase ? 28 : cz.width, pts: [pos(e)] };
    cz.strokes.push(cz.cur); cz.buf = [cz.cur.pts[0]];
    drawStroke(ctx, cz.cur, 0);
    clearInterval(cz.sendT); cz.sendT = setInterval(flush, 50);
  };
  cv.onpointermove = e => {
    if (!cz.cur) return;
    const p = pos(e), last = cz.cur.pts[cz.cur.pts.length - 1];
    if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 3) return;
    cz.cur.pts.push(p); cz.buf.push(p);
    drawStroke(ctx, cz.cur, cz.cur.pts.length - 1);
  };
  const up = () => { if (!cz.cur) return; flush(); clearInterval(cz.sendT); cz.cur = null; };
  cv.onpointerup = up; cv.onpointercancel = up; cv.onlostpointercapture = up;
}
function addCizFeed(root, f, old){
  const box = root.querySelector('.cz-feed'); if (!box) return;
  const p = document.createElement('p'); p.className = 'cz-f ' + f.k + (old ? '' : ' new');
  p.textContent = f.text;
  box.append(p);
  while (box.children.length > 60) box.firstChild.remove();
  box.scrollTop = box.scrollHeight;
}
function cizEvent(ev, s){
  const root = $('deck').querySelector('.cz'); if (!root || !ev) return;
  if (ev.k === 'cizgi'){
    let k = cz.strokes.find(x => x.sid === ev.sid);
    const ctx = root.querySelector('.cz-canvas').getContext('2d');
    if (!k){ k = { sid: ev.sid, c: ev.c, w: ev.w, pts: [] }; cz.strokes.push(k); }
    const from = k.pts.length;
    k.pts.push(...ev.pts);
    drawStroke(ctx, k, from);
  } else if (ev.k === 'temizle'){ cz.strokes = []; redrawCiz(root); }
  else if (ev.k === 'geri'){ cz.strokes.pop(); redrawCiz(root); }
  else {
    const f = ev.k === 'dogru' ? { k: 'dogru', text: '🎉 ' + ev.name + ' bildi! (+' + ev.pts + ')' }
      : ev.k === 'yakin' ? { k: 'yakin', text: '🔥 “' + ev.text + '” çok yakın!' }
      : ev.k === 'tahmin' ? { k: 'tahmin', text: ev.name + ': ' + ev.text }
      : { k: 'sys', text: ev.text };
    cz.feed.push(f); if (cz.feed.length > 60) cz.feed.shift();
    addCizFeed(root, f);
    if (ev.k === 'dogru') gameSound('turn');
  }
}
