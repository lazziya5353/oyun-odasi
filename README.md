# Oyun Odası

Arkadaşlarla oyun oynarken kullanmak için tarayıcıda çalışan sesli sohbet odası. Kurulum yok, bağlantıyı açan girer.

## Neler var

- **Sesli sohbet:** gürültü azaltma (normal / güçlü), kişi kişi ses ayarı, konuşanın etrafında ses dalgaları
- **Kanallar:** Genel Sohbet, Müzik Odası, Film Odası. Oda sahibi yeni ses kanalları ekleyebilir. Ses sadece aynı kanaldakilere gider.
- **Ekran paylaşımı:** Oyun / Dengeli / Film / Yazı / Zayıf internet kalite seçenekleri, yayın sırasında kalite değiştirme, canlı FPS / hız / donma göstergesi, büyütme ve tam ekran
- **Sohbet:** herkese açık sohbet, kişiye özel mesaj, fotoğraf gönderme (seç, yapıştır ya da sürükle). Sohbet kalıcıdır: odadan çıkıp dönünce durur, **🧹 Temizle** ile herkes için silinir
- **📻 Radyo:** odadaki herkes dinler (hangi kanalda olursa olsun); herkes kendi radyo sesini ayarlar ya da sadece kendisi için susturur
- **Müzik Odası:** herkes müzik yükleyebilir (ortak sıra)
- **📚 Müzik Kütüphanesi:** yüklenen her şarkı kalıcı olarak saklanır ve yükleyenin adı yazar (silinmez). Herkes kendi adına playlist oluşturur; tüm şarkılar, bir playlist ya da birinin yükledikleri tek tuşla (istersen karışık) çalınır
- **Son odana dön:** girişte tek tıkla son odaya kodsuz dönülür. Odadaki herkes çıkınca oda kapanır ve bu kart kendiliğinden kaybolur. “Oda oluştur” her zaman yeni kodla yeni oda kurar
- **Film Odası:** bilgisayardan film yayını, YouTube'u birlikte senkron izleme, Film modunda ekran paylaşımı
- **🎲 Oyun Salonu:** Tavla (1/3/5/7 sayılık maç, mars, kırma, zar animasyonu) ve Okey (Klasik, Eşli, 101). Boş koltuklara bot oturur, oyundan çıkanın yerine bot geçer. Oyun sırasında radyo çalmaya devam eder
- **Masa oyunları:** Tavla, Okey (Klasik / Eşli / 101), **Batak** (İhaleli, Eşli, Koz Maça; botlu), **İsim-Şehir** (2-8 kişi, itiraz oylaması), **Çiz ve Tahmin Et** (2-8 kişi, canlı çizim)
- **Tek kişilik oyunlar (skor tablolu):** Günün Sudokusu, Kelime Bul (Türkçe Wordle), Resimli Yapboz, Engel Koşusu. Günlük ve haftalık + tüm zamanlar tablosu; rekor odaya duyurulur
- **🎨 Görünüm:** Standart, Cyberpunk ve LED modu (kayan / nabız / sabit ışık, renk ya da otomatik RGB, hız, parlama). Herkes kendi görünümünü seçer
- **🍵 İkram:** kişinin kutucuğundaki İkram düğmesiyle çay, simit, Türk kahvesi, ayran, çekirdek, Maraş dondurması, lokum ya da su ikram edilir; ikram uçarak gider, 1 dakika masada durur
- **📲 Uygulama gibi yükleme:** telefonda ana ekrana, bilgisayarda masaüstüne eklenir; kendi simgesiyle tam ekran açılır
- **🔔 Bildirimler:** biri oda açınca bildirimleri açmış herkese bildirim gider (site kapalıyken de). iPhone'da önce Ana Ekrana eklenmeli
- **Diğer:** emoji tepkileri, odadan atma, oda sahibi çıkınca odanın devam etmesi, telefondan katılım (mikrofonsuz da olur)

## Nasıl kullanılır

1. Siteyi aç, adını yaz.
2. **Oda oluştur**'a bas (kod boş kalırsa otomatik verilir).
3. **Daveti kopyala** ile bağlantıyı arkadaşlarına gönder. Bağlantıyla gelenin oda kodu kendiliğinden dolar.

En iyi sonuç için Chrome veya Edge önerilir.

## Nasıl çalışır

Ses, görüntü, müzik ve mesajlar kişiler arasında doğrudan (WebRTC) gider, arada bir sunucu yoktur. Bağlantıyı kurmak için:

- [PeerJS](https://peerjs.com/) ücretsiz eşleştirme sunucusu (kimin nerede olduğunu bulmak için)
- [Open Relay](https://www.metered.ca/tools/openrelay/) ücretsiz aktarma sunucusu (doğrudan bağlanamayanlar için)
- [Radio Browser](https://www.radio-browser.info/) açık radyo dizini

## Kendi eşleştirme sunucunu kurma (önerilir, ücretsiz)

Herkese açık PeerJS sunucusu ücretsizdir ama zaman zaman cevap vermez. Kendi sunucun olursa site önce onu kullanır,
o cevap vermezse herkese açık sunucuyu yedek olarak dener.

1. [render.com](https://render.com) adresinde **GitHub ile giriş yap**.
2. **New → Web Service** → bu depoyu (`oyun-odasi`) seç.
3. Ayarlar:
   - **Name:** `oyun-odasi-sinyal`
   - **Root Directory:** `sinyal-sunucusu`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
4. **Deploy Web Service**'e bas. Birkaç dakika sonra üstte `https://oyun-odasi-sinyal.onrender.com` gibi bir adres çıkar.
   Adresin sonuna `/saglik` ekleyip açınca `ok` yazıyorsa sunucu çalışıyor.
5. GitHub'da `js/config.js` dosyasını aç, kalem simgesiyle düzenle ve adresi yaz:
   ```js
   sunucu: 'oyun-odasi-sinyal.onrender.com'
   ```
   **Commit changes**'a bas. Netlify siteyi birkaç saniyede günceller.

Ücretsiz Render sunucusu 15 dakika kimse kullanmazsa uyur; ilk açılışta uyanması yaklaşık 1 dakika sürer.
Site sayfa açılır açılmaz sunucuyu uyandırmaya başlar ve bu sırada “Sunucu uyanıyor…” yazar.
Odada biri olduğu sürece sunucu uyumaz.

## Bildirimler nasıl çalışır

`netlify/functions/bildirim.mjs` Netlify'da kendiliğinden çalışan küçük bir sunucu fonksiyonudur; ayrı bir kurulum ya da ayar gerekmez.
Bildirimi açan cihazların listesi ve bildirim anahtarı Netlify Blobs'ta saklanır (anahtar ilk kullanımda kendiliğinden üretilir).
Aynı oda için 3 dakikada bir, toplamda saatte en fazla 20 "oda açıldı" bildirimi gider.

- **Bilgisayar (Chrome, Edge, Firefox, Mac Safari):** giriş ekranında “Bildirimleri aç” → izin ver.
- **Android:** aynısı; istersen “Uygulama olarak yükle” ile ana ekrana ekle.
- **iPhone / iPad (iOS 16.4+):** Safari'de Paylaş ⬆ → “Ana Ekrana Ekle”, sonra ana ekrandaki simgeden açıp “Bildirimleri aç”.

## Müzik kütüphanesi nasıl çalışır

`netlify/functions/muzik.mjs` şarkıları 2,5 MB'lık parçalar hâlinde Netlify Blobs'a kaydeder; ayar gerekmez.
Sınırlar: şarkı başına 30 MB, toplam 600 şarkı / 3 GB. Aynı şarkı iki kez yüklenirse kopya oluşmaz.
Sıraya ekleyen kişi şarkıyı bir kez indirir (tarayıcısında saklanır) ve Müzik Odası'ndakilere canlı aktarır;
dinleyenler ayrıca indirmez. Netlify'ın ücretsiz planı aylık kredi ile çalışır; şarkı indirmeleri bu krediden düşer.

## Skor tabloları

`netlify/functions/skor.mjs` tekli oyunların sonuçlarını Netlify Blobs'ta saklar (her isim için en iyi sonuç, ilk 100).
Giriş sistemi olmadığı için isimler yazılan ada göre tutulur.

## Sınırlar

- Herkes herkese bağlandığı için sesli sohbette 8–10 kişi, ekran paylaşımında 4–5 izleyici rahat çalışır.
- Ekran yayınının akıcılığı, yayın yapanın yükleme (upload) hızına bağlıdır. Görüntünün sol üstündeki gösterge sorunun nerede olduğunu yazar.
- Netflix gibi korumalı sitelerde ekran paylaşımı siyah görünebilir.

## Dosyalar

```
index.html        sayfa iskeleti
logo.svg          logo (oyun kolu + ses dalgası)
js/config.js      AYARLAR: kendi eşleştirme sunucunun adresi
sinyal-sunucusu/  kendi eşleştirme sunucun (Render'da çalışır)
render.yaml       Render kurulum dosyası
css/style.css     görünüm
js/util.js        küçük yardımcılar
js/audio.js       mikrofon, gürültü azaltma, ses dalgaları
js/net.js         bağlantılar, kanallar, oda sahibi devri
js/ui.js          kanallar, kutucuklar, ses ayarları
js/screen.js      ekran paylaşımı, kalite, FPS göstergesi
js/chat.js        sohbet, özel mesaj, fotoğraf
js/music.js       müzik sırası, radyo
js/library.js     müzik kütüphanesi ve playlistler
js/film.js        film yayını, YouTube senkron izleme
js/main.js        giriş ekranı
js/games/         oyunlar: tavla, okey, batak, isim-şehir, çiz-tahmin, tekli oyunlar, skor çerçevesi, ikramlar
js/theme.js       görünüm modları (css/theme.css)
css/games.css     oyun görünümü
js/push.js        bildirimler, uygulama olarak yükleme
sw.js             bildirimleri gösteren servis çalışanı
manifest.webmanifest, icons/   ana ekran simgesi ve uygulama bilgileri
netlify/          sunucu fonksiyonları: bildirim, müzik kütüphanesi, skor tabloları
netlify.toml      Netlify ayarı
```

## Güncelleme

Bu depoya yapılan her değişikliği Netlify birkaç saniye içinde yayına alır. Site adresi değişmez.
