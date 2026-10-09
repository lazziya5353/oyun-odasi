// Oyun Odası eşleştirme (sinyal) sunucusu.
// Görevi sadece kişilerin birbirini bulmasını sağlamak: ses, görüntü ve mesajlar bu sunucudan GEÇMEZ,
// kişiler arasında doğrudan gider. Bu yüzden çok az kaynak harcar ve ücretsiz planda rahat çalışır.
const express = require('express');
const { ExpressPeerServer } = require('peer');

const PORT = process.env.PORT || 9000;
const app = express();

// Sitenin sunucuyu "uyandırmak" ve durumunu kontrol etmek için kullandığı adres
app.get('/saglik', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'no-store');
  res.send('ok');
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('Oyun Odası sinyal sunucusu çalışıyor, port ' + PORT);
});

const peerServer = ExpressPeerServer(server, {
  path: '/',
  proxied: true,            // Render gibi bir vekil sunucunun arkasında çalışıyor
  alive_timeout: 60000,     // 60 sn sinyal gelmeyen bağlantı düşürülür (sekmesi çöken kişinin kodu boşalır)
  concurrent_limit: 1000,
  allow_discovery: false    // kimse odadakilerin listesini sunucudan çekemez
});
app.use('/', peerServer);

peerServer.on('connection', client => console.log('bağlandı:', client.getId()));
peerServer.on('disconnect', client => console.log('ayrıldı:', client.getId()));
