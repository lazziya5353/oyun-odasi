// Tarayıcının kaydettiği WebM dosyasını ileri/geri sarılabilir yapar.
// MediaRecorder dosyayı canlı yazdığı için sonuna süre (Duration) ve atlama dizini (Cues) koymaz; Segment ve Cluster
// boyutları da "bilinmiyor" yazılır. Bu yüzden oynatıcılar süreyi göstermez, ileri saramaz.
// Burada dosya parça parça okunur (2 saatlik kayıtta bile bellek dolmaz), her kümenin (Cluster) yeri ve zamanı bulunur;
// başa süre + atlama dizini eklenir, küme boyutları yerinde (aynı uzunlukta) düzeltilir. Video verisi yeniden yazılmaz,
// sadece dilimlenip yeni başlıkla birleştirilir: birkaç saniye sürer.
//   webmDuzelt(blob, ilerleme?) → Promise<Blob>   (sorun çıkarsa dosyanın kendisini olduğu gibi döndürür)
(function(root){
  const ID = { EBML: 0x1A45DFA3, SEGMENT: 0x18538067, SEEKHEAD: 0x114D9B74, INFO: 0x1549A966, TRACKS: 0x1654AE6B, CLUSTER: 0x1F43B675,
    CUES: 0x1C53BB6B, VOID: 0xEC, TIMECODE: 0xE7, SIMPLEBLOCK: 0xA3, BLOCKGROUP: 0xA0, BLOCK: 0xA1, SCALE: 0x2AD7B1, DURATION: 0x4489,
    TRACKENTRY: 0xAE, TRACKNUMBER: 0xD7, TRACKTYPE: 0x83, CUEPOINT: 0xBB, CUETIME: 0xB3, CUETRACKPOS: 0xB7, CUETRACK: 0xF7,
    CUECLUSTERPOS: 0xF1, SEEK: 0x4DBB, SEEKID: 0x53AB, SEEKPOS: 0x53AC };

  // ---------- okuma ----------
  function idOku(b, i){                       // element kimliği (işaret bitleri dahil)
    const f = b[i]; if (f === undefined) return null;
    let l = 1, m = 0x80; while (l <= 4 && !(f & m)){ l++; m >>= 1; }
    if (l > 4 || i + l > b.length) return null;
    let v = 0; for (let k = 0; k < l; k++) v = v * 256 + b[i + k];
    return { v, l };
  }
  function boyOku(b, i){                      // boyut (vint); bilinmeyen boyut → -1
    const f = b[i]; if (f === undefined) return null;
    let l = 1, m = 0x80; while (l <= 8 && !(f & m)){ l++; m >>= 1; }
    if (l > 8 || i + l > b.length) return null;
    let v = f & (m - 1), hepsiBir = v === m - 1;
    for (let k = 1; k < l; k++){ v = v * 256 + b[i + k]; if (b[i + k] !== 0xFF) hepsiBir = false; }
    return { v: hepsiBir ? -1 : v, l };
  }
  const uintOku = (b, i, n) => { let v = 0; for (let k = 0; k < n; k++) v = v * 256 + b[i + k]; return v; };

  // ---------- yazma ----------
  const idBayt = id => { const a = []; let v = id; while (v > 0){ a.unshift(v & 0xFF); v = Math.floor(v / 256); } return a; };
  function boy8(n){ const a = [0x01]; for (let k = 6; k >= 0; k--) a.push(Math.floor(n / Math.pow(256, k)) & 0xFF); return a; }   // 8 baytlık boyut
  function uintBayt(n){ const a = []; do { a.unshift(n & 0xFF); n = Math.floor(n / 256); } while (n > 0); return a; }
  const el = (id, veri) => idBayt(id).concat(boy8(veri.length), veri);
  const uintEl = (id, n) => el(id, uintBayt(n));
  const uint8El = (id, n) => { const a = []; for (let k = 7; k >= 0; k--) a.push(Math.floor(n / Math.pow(256, k)) & 0xFF); return el(id, a); };   // sabit 8 bayt (yer hesabı için)
  function floatEl(id, f){ const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, f); return el(id, Array.from(new Uint8Array(dv.buffer))); }

  async function dilim(blob, bas, son){ return new Uint8Array(await blob.slice(bas, son).arrayBuffer()); }

  async function webmDuzelt(blob, ilerleme){
    try {
      // 1) baş kısım: EBML başlığı, Segment, Info, Tracks, ilk Cluster'ın yeri
      const bas = await dilim(blob, 0, Math.min(blob.size, 1 << 20));
      let i = 0;
      const e0 = idOku(bas, 0); if (!e0 || e0.v !== ID.EBML) return blob;
      const s0 = boyOku(bas, e0.l); const ebmlSon = e0.l + s0.l + s0.v;
      const ebmlBayt = Array.from(bas.subarray(0, ebmlSon));
      i = ebmlSon;
      const sg = idOku(bas, i); if (!sg || sg.v !== ID.SEGMENT) return blob;
      const sgb = boyOku(bas, i + sg.l);
      const segVeri = i + sg.l + sgb.l;           // Segment içeriğinin başladığı yer
      i = segVeri;
      let info = null, tracks = null, ilkKume = -1, olcek = 1000000, videoIz = 1;
      while (i < bas.length){
        const id = idOku(bas, i); if (!id) break;
        const bo = boyOku(bas, i + id.l); if (!bo) break;
        const veri = i + id.l + bo.l;
        if (id.v === ID.CLUSTER){ ilkKume = i; break; }
        if (bo.v < 0) return blob;                // kümeden önce bilinmeyen boyut: tanımadığımız yapı
        if (id.v === ID.INFO) info = { bas: i, veri, son: veri + bo.v };
        if (id.v === ID.TRACKS) tracks = { bas: i, son: veri + bo.v };
        if (id.v === ID.CUES) return blob;        // zaten dizini var
        i = veri + bo.v;
      }
      if (ilkKume < 0 || !info || !tracks) return blob;
      // Info içinden zaman ölçeği; varsa eski süreyi at
      const infoCocuk = [];
      for (let j = info.veri; j < info.son;){
        const id = idOku(bas, j), bo = boyOku(bas, j + id.l), v = j + id.l + bo.l;
        if (id.v === ID.SCALE) olcek = uintOku(bas, v, bo.v);
        if (id.v !== ID.DURATION) infoCocuk.push(...bas.subarray(j, v + bo.v));
        j = v + bo.v;
      }
      // video izinin numarası
      for (let j = tracks.bas + idOku(bas, tracks.bas).l + boyOku(bas, tracks.bas + idOku(bas, tracks.bas).l).l; j < tracks.son;){
        const id = idOku(bas, j), bo = boyOku(bas, j + id.l), v = j + id.l + bo.l;
        if (id.v === ID.TRACKENTRY){
          let no = 0, tur = 0;
          for (let k = v; k < v + bo.v;){ const a = idOku(bas, k), ab = boyOku(bas, k + a.l), av = k + a.l + ab.l;
            if (a.v === ID.TRACKNUMBER) no = uintOku(bas, av, ab.v); if (a.v === ID.TRACKTYPE) tur = uintOku(bas, av, ab.v); k = av + ab.v; }
          if (tur === 1) videoIz = no;
        }
        j = v + bo.v;
      }
      const tracksBayt = Array.from(bas.subarray(tracks.bas, tracks.son));

      // 2) kümeleri tara (parça parça): her kümenin yeri, zamanı, son blok zamanı
      const kumeler = [];                          // { yer, bas(başlık uzunluğu), boyAlan, boyUzun, zaman, anahtar }
      const PARCA = 4 << 20;
      let tampon = new Uint8Array(0), tamponBas = ilkKume, okunan = ilkKume, enSon = 0, kume = null;
      const bitti = () => okunan >= blob.size;
      async function doldur(gerek){
        while (tampon.length < gerek && !bitti()){
          const yeni = await dilim(blob, okunan, Math.min(blob.size, okunan + PARCA)); okunan += yeni.length;
          const t = new Uint8Array(tampon.length + yeni.length); t.set(tampon); t.set(yeni, tampon.length); tampon = t;
          if (ilerleme) ilerleme(okunan / blob.size);
        }
      }
      let p = 0;                                   // tampon içindeki konum
      while (true){
        if (tampon.length - p < 64 && !bitti()){ tampon = tampon.subarray(p); tamponBas += p; p = 0; await doldur(64); }
        if (p >= tampon.length) break;
        const id = idOku(tampon, p); if (!id){ if (bitti()) break; tampon = tampon.subarray(p); tamponBas += p; p = 0; await doldur(tampon.length + 16); continue; }
        const bo = boyOku(tampon, p + id.l); if (!bo) break;
        const veri = p + id.l + bo.l, mutlak = tamponBas + p;
        if (id.v === ID.CLUSTER){
          if (kume) kume.son = mutlak;
          kume = { yer: mutlak, baslik: id.l + bo.l, boyAlan: mutlak + id.l, boyUzun: bo.l, bilinmeyen: bo.v < 0, zaman: null, anahtar: false, son: -1 };
          kumeler.push(kume);
          p = veri; continue;                      // kümenin içine gir
        }
        if (bo.v < 0) break;                       // başka bilinmeyen boyutlu şey: dur
        // elementin tamamı tamponda olmalı (bloklar küçük; Timecode/SimpleBlock başlığı için ilk birkaç bayt yeter)
        if (veri + 8 > tampon.length && !bitti()){ const gerek = veri - p + 8; tampon = tampon.subarray(p); tamponBas += p; p = 0; await doldur(gerek); continue; }
        if (kume && id.v === ID.TIMECODE) kume.zaman = uintOku(tampon, veri, bo.v);
        if (kume && (id.v === ID.SIMPLEBLOCK || id.v === ID.BLOCKGROUP)){
          let bv = veri;
          if (id.v === ID.BLOCKGROUP){ const ic = idOku(tampon, veri); const icb = ic && boyOku(tampon, veri + ic.l); bv = ic && ic.v === ID.BLOCK ? veri + ic.l + icb.l : -1; }
          if (bv >= 0 && bv + 4 <= tampon.length){
            const iz = boyOku(tampon, bv); const rel = (tampon[bv + iz.l] << 8 | tampon[bv + iz.l + 1]) << 16 >> 16;
            const bayrak = tampon[bv + iz.l + 2];
            const z = (kume.zaman || 0) + rel; if (z > enSon) enSon = z;
            if (iz.v === videoIz && !kume.ilkVideo){ kume.ilkVideo = true; kume.anahtar = id.v === ID.SIMPLEBLOCK ? !!(bayrak & 0x80) : true; kume.videoZaman = z; }
          }
        }
        // elementi atla (tampondan taşıyorsa ileriye kaydır)
        const sonraki = veri + bo.v;
        if (sonraki > tampon.length){ const atla = tamponBas + sonraki; tampon = new Uint8Array(0); tamponBas = atla; okunan = atla; p = 0; continue; }
        p = sonraki;
      }
      if (kume) kume.son = blob.size;
      if (!kumeler.length) return blob;
      const kareSure = 33;                         // son karenin süresi (yaklaşık)
      const sureOlcekli = enSon + Math.round(kareSure * 1e6 / olcek);   // Duration, zaman ölçeği biriminde yazılır

      // 3) yeni baş kısım: SeekHead + Info(süreli) + Tracks + Cues, sonra kümeler (boyutları düzeltilmiş)
      const infoBayt = el(ID.INFO, infoCocuk.concat(floatEl(ID.DURATION, sureOlcekli)));
      const cuesYap = taban => el(ID.CUES, [].concat(...kumeler.filter(k => k.zaman !== null && (k.anahtar || k === kumeler[0])).map(k =>
        el(ID.CUEPOINT, uintEl(ID.CUETIME, k.zaman).concat(el(ID.CUETRACKPOS, uintEl(ID.CUETRACK, videoIz).concat(uint8El(ID.CUECLUSTERPOS, taban + (k.yer - ilkKume)))))))));
      const seekYap = (pInfo, pTracks, pCues) => el(ID.SEEKHEAD, [].concat(
        el(ID.SEEK, el(ID.SEEKID, idBayt(ID.INFO)).concat(uint8El(ID.SEEKPOS, pInfo))),
        el(ID.SEEK, el(ID.SEEKID, idBayt(ID.TRACKS)).concat(uint8El(ID.SEEKPOS, pTracks))),
        el(ID.SEEK, el(ID.SEEKID, idBayt(ID.CUES)).concat(uint8El(ID.SEEKPOS, pCues)))));
      const seekBoy = seekYap(0, 0, 0).length, cuesBoy = cuesYap(0).length;   // sabit genişlikli alanlar: boylar değişmez
      const pInfo = seekBoy, pTracks = pInfo + infoBayt.length, pCues = pTracks + tracksBayt.length, pKume = pCues + cuesBoy;
      const onEk = [].concat(seekYap(pInfo, pTracks, pCues), infoBayt, tracksBayt, cuesYap(pKume));
      const kumeVeriBoy = blob.size - ilkKume;
      const segBas = ebmlBayt.concat(idBayt(ID.SEGMENT), boy8(onEk.length + kumeVeriBoy));
      // kümeler: bilinmeyen boyutu (aynı uzunlukta) gerçek boyutla değiştir
      const parcalar = [new Uint8Array(segBas.concat(onEk))];
      for (const k of kumeler){
        const icerik = k.son - k.yer - k.baslik;
        if (k.bilinmeyen && k.boyUzun === 8 && icerik >= 0){
          const yeni = boy8(icerik);
          parcalar.push(blob.slice(k.yer, k.boyAlan), new Uint8Array(yeni), blob.slice(k.boyAlan + 8, k.son));
        } else parcalar.push(blob.slice(k.yer, k.son));
      }
      if (ilerleme) ilerleme(1);
      return new Blob(parcalar, { type: blob.type || 'video/webm' });
    } catch(e){
      try { console.warn('webmDuzelt', e); } catch(_){}
      return blob;
    }
  }
  root.webmDuzelt = webmDuzelt;
  if (typeof module !== 'undefined') module.exports = webmDuzelt;
})(typeof window !== 'undefined' ? window : globalThis);
