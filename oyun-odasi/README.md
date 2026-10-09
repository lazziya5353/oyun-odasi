# Oyun Odası

Arkadaşlarla oyun oynarken kullanmak için tarayıcıda çalışan sesli sohbet odası. Kurulum yok, bağlantıyı açan girer.

## Neler var

- **Sesli sohbet:** gürültü azaltma (normal / güçlü), kişi kişi ses ayarı, konuşanın etrafında ses dalgaları
- **Kanallar:** Genel Sohbet, Müzik Odası, Film Odası. Oda sahibi yeni ses kanalları ekleyebilir. Ses sadece aynı kanaldakilere gider.
- **Ekran paylaşımı:** Oyun / Dengeli / Film / Yazı / Zayıf internet kalite seçenekleri, yayın sırasında kalite değiştirme, canlı FPS / hız / donma göstergesi, büyütme ve tam ekran
- **Sohbet:** herkese açık sohbet, kişiye özel mesaj, fotoğraf gönderme (seç, yapıştır ya da sürükle). Sohbet kalıcıdır: odadan çıkıp dönünce durur, **🧹 Temizle** ile herkes için silinir
- **📻 Radyo:** odadaki herkes dinler (hangi kanalda olursa olsun); herkes kendi radyo sesini ayarlar ya da sadece kendisi için susturur
- **Müzik Odası:** herkes bilgisayarından müzik yükleyebilir (ortak sıra)
- **Son odana dön:** girişte tek tıkla son odaya kodsuz dönülür; oda kapanmışsa aynı kodla yeniden açılır. “Oda oluştur” her zaman yeni kodla yeni oda kurar
- **Film Odası:** bilgisayardan film yayını, YouTube'u birlikte senkron izleme, Film modunda ekran paylaşımı
- **🎲 Oyun Salonu:** Tavla (1/3/5/7 sayılık maç, mars, kırma, zar animasyonu) ve Okey (Klasik, Eşli, 101). Boş koltuklara bot oturur, oyundan çıkanın yerine bot geçer. Oyun sırasında radyo çalmaya devam eder
- **🍵 İkram:** kişinin kutucuğundaki İkram düğmesiyle çay, simit, Türk kahvesi, ayran, çekirdek, Maraş dondurması, lokum ya da su ikram edilir; ikram uçarak gider, 1 dakika masada durur
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
js/film.js        film yayını, YouTube senkron izleme
js/main.js        giriş ekranı
js/games/         tavla ve okey kuralları, masalar, ikramlar
css/games.css     oyun görünümü
netlify.toml      Netlify ayarı
```

## Güncelleme

Bu depoya yapılan her değişikliği Netlify birkaç saniye içinde yayına alır. Site adresi değişmez.
