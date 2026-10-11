// Bağlantı kalitesi: her kişinin kartında sinyal çubukları (ping + ses paketi kaybı).
// Değerler doğrudan bağlantının kendi istatistiklerinden okunur (3 sn'de bir); sunucuya bir şey gönderilmez.
const bq = new Map();   // id → { rtt, kayip, relay, seviye, onceki: {lost, recv} }
function bqSeviye(rtt, kayip){
  if (rtt == null) return 0;
  if (rtt < 90 && kayip < 1) return 4;
  if (rtt < 160 && kayip < 3) return 3;
  if (rtt < 320 && kayip < 8) return 2;
  return 1;
}
async function bqOlc(p){
  const pcs = [p.micCall && p.micCall.peerConnection, p.conn && p.conn.peerConnection].filter(Boolean);
  if (!pcs.length) return null;
  const o = bq.get(p.id) || { onceki: { lost: 0, recv: 0 } };
  let rtt = null, relay = false, lost = null, recv = null;
  for (const pc of pcs){
    let st; try { st = await pc.getStats(); } catch(e){ continue; }
    let pairId = null;
    st.forEach(r => { if (r.type === 'transport' && r.selectedCandidatePairId) pairId = r.selectedCandidatePairId; });
    st.forEach(r => {
      if (r.type === 'candidate-pair' && (r.id === pairId || (!pairId && r.state === 'succeeded' && r.nominated)) && typeof r.currentRoundTripTime === 'number'){
        if (rtt == null) rtt = r.currentRoundTripTime * 1000;
        const lc = st.get(r.localCandidateId), rc = st.get(r.remoteCandidateId);
        if ((lc && lc.candidateType === 'relay') || (rc && rc.candidateType === 'relay')) relay = true;
      }
      if (r.type === 'inbound-rtp' && (r.kind === 'audio' || r.mediaType === 'audio') && lost == null){ lost = r.packetsLost || 0; recv = r.packetsReceived || 0; }
    });
    if (rtt != null && lost != null) break;
  }
  let kayip = 0;
  if (lost != null){
    const dl = lost - o.onceki.lost, dr = recv - o.onceki.recv;
    kayip = dr + dl > 0 ? Math.max(0, dl) / (dr + Math.max(0, dl)) * 100 : 0;
    o.onceki = { lost, recv };
  }
  o.rtt = rtt == null ? null : Math.round(rtt); o.kayip = Math.round(kayip * 10) / 10; o.relay = relay;
  o.seviye = bqSeviye(o.rtt, o.kayip);
  bq.set(p.id, o);
  return o;
}
function bqCiz(card, o, ben){
  if (!card) return;
  let el = card.querySelector('.sinyal');
  if (!o || !o.seviye){ if (el) el.hidden = true; return; }
  if (!el){
    el = document.createElement('span'); el.className = 'sinyal';
    el.innerHTML = '<i></i><i></i><i></i><i></i>';
    card.append(el);
  }
  el.hidden = false;
  el.dataset.s = o.seviye;
  const ad = ['', 'zayıf', 'orta', 'iyi', 'çok iyi'][o.seviye];
  el.title = (ben ? 'Senin bağlantın (ortalama): ' : 'Bağlantı: ') + ad + ' · ping ' + o.rtt + ' ms' + (o.kayip ? ' · ses kaybı %' + o.kayip : '') + (o.relay ? ' · aktarma sunucusu üzerinden' : '');
  el.setAttribute('aria-label', el.title);
}
setInterval(async () => {
  if (typeof joined === 'undefined' || !joined || document.hidden) return;
  const list = [];
  for (const p of peers.values()){
    if (!p.linked) continue;
    const o = await bqOlc(p).catch(() => null);
    if (o){ bqCiz(p.card, o); if (o.rtt != null) list.push(o); }
  }
  // kendi kartında: herkese olan bağlantının ortalaması
  if (list.length){
    const rtt = Math.round(list.reduce((a, o) => a + o.rtt, 0) / list.length), kayip = Math.round(list.reduce((a, o) => a + o.kayip, 0) / list.length * 10) / 10;
    bqCiz(document.getElementById('selfCard'), { rtt, kayip, relay: list.some(o => o.relay), seviye: bqSeviye(rtt, kayip) }, true);
  } else bqCiz(document.getElementById('selfCard'), null);
}, 3000);
