# Oyun Odası

Arkadaşlarla oyun oynarken kullanmak için tarayıcıda çalışan sesli sohbet odası. Kurulum yok, bağlantıyı açan girer.

## Neler var

- **Sesli sohbet:** gürültü azaltma (normal / güçlü), kişi kişi ses ayarı, konuşanın etrafında ses dalgaları
- **Kanallar:** Genel Sohbet, Müzik Odası, Film Odası. Oda sahibi yeni ses kanalları ekleyebilir. Ses sadece aynı kanaldakilere gider.
- **Ekran paylaşımı:** Oyun / Dengeli / Film / Yazı / Zayıf internet kalite seçenekleri, yayın sırasında kalite değiştirme, canlı FPS / hız / donma göstergesi, büyütme ve tam ekran
- **Sohbet:** herkese açık sohbet, kişiye özel mesaj, fotoğraf gönderme (seç, yapıştır ya da sürükle), sonradan gelene geçmiş
- **Müzik Odası:** herkes bilgisayarından müzik yükleyebilir (ortak sıra), Türk ve dünya radyoları
- **Film Odası:** bilgisayardan film yayını, YouTube'u birlikte senkron izleme, Film modunda ekran paylaşımı
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

## Sınırlar

- Herkes herkese bağlandığı için sesli sohbette 8–10 kişi, ekran paylaşımında 4–5 izleyici rahat çalışır.
- Ekran yayınının akıcılığı, yayın yapanın yükleme (upload) hızına bağlıdır. Görüntünün sol üstündeki gösterge sorunun nerede olduğunu yazar.
- Netflix gibi korumalı sitelerde ekran paylaşımı siyah görünebilir.

## Dosyalar

```
index.html        sayfa iskeleti
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
netlify.toml      Netlify ayarı
```

## Güncelleme

Bu depoya yapılan her değişikliği Netlify birkaç saniye içinde yayına alır. Site adresi değişmez.
