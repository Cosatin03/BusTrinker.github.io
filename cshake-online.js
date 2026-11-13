import { ShakeDetector } from "./cshake-core.js?v=20261113-cycle";
import { getIdentity, normalizeCode } from "./session.js";

const $ = id => document.getElementById(id);
const detector = new ShakeDetector();
const state = { db:null, uid:getIdentity().id, code:null, room:null, people:[], duration:10, sensor:false,
  samples:0,lastSample:0, activeRound:0, score:0, published:0, lastPublish:0, tickId:0, offRoom:null,
  offPeople:null, phase:"entry", audio:null, busy:false, finalizing:false, roundStarted:false };
const STORAGE = "cshake.online.session";
const show = id => ["entry","lobby","arena","result"].forEach(view=>$(view).hidden=view!==id);
const message = value => { $("notice").textContent=value || ""; };
const safe = value => String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nickname = () => $("nickname").value.trim().slice(0,24);
const members = () => state.room?.members || [];
const me = () => state.people.find(p=>p.id===state.uid);
const scores = () => state.people.filter(p=>members().includes(p.id)).sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name));
const codeGen = () => Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[v%32]).join("");
const persist = () => { try { localStorage.setItem(STORAGE,JSON.stringify({code:state.code,name:nickname()})); } catch {} };
const clearPersist = () => { try { localStorage.removeItem(STORAGE); } catch {} };
const ref = () => state.db.collection("cshakeRooms").doc(state.code);
function rankHtml() {
  return "<ol>"+scores().map((p,i)=>"<li><span>"+(i===0?"🏆 ":"")+safe(p.name)+(p.id===state.uid?" (du)":"")+"</span><strong>"+Math.max(0,Number(p.score)||0)+" Shakes</strong></li>").join("")+"</ol>";
}
function listHtml() {
  return "<ol>"+state.people.filter(p=>members().includes(p.id)).map(p=>"<li><span>"+safe(p.name)+(p.id===state.room.host?" 👑":"")+"</span><strong>"+(p.ready?"✓ Bereit":"Wartet")+"</strong></li>").join("")+"</ol>";
}
function loadScript(src) {
  return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error("Firebase konnte nicht geladen werden."));document.head.append(s);});
}
let initialization;
async function backend() {
  if(initialization) return initialization;
  initialization=(async()=>{
    if(!navigator.onLine) throw new Error("Für Online Battle wird eine Internetverbindung benötigt.");
    if(!window.firebase) await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
    if(!firebase.firestore) await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js");
    if(!window.bustrinkerDb) await loadScript("config.js");
    state.db=window.bustrinkerDb;
  })().catch(e=>{initialization=null;throw e;});
  return initialization;
}
async function action(task) {
  if(state.busy) return;
  state.busy=true;message("");
  for(const id of ["create","join","launch","ready","rematch","leave","result-leave"]) $(id).disabled=true;
  try { await task(); }
  catch(e) {
    message(e?.code==="permission-denied"
      ? "Firebase hat den Raumzugriff verweigert (permission-denied). Bitte Firestore-Regeln prüfen."
      : (e?.message || "Verbindung fehlgeschlagen.") + (e?.code ? " (" + e.code + ")" : ""));
  }
  finally {state.busy=false;render();}
}
function disconnect() {
  cancelAnimationFrame(state.tickId);
  state.offRoom?.(); state.offPeople?.();state.offRoom=null;state.offPeople=null;
  state.room=null;state.people=[];state.activeRound=0;state.code=null;state.phase="entry";state.finalizing=false;state.roundStarted=false;
}
async function create() {
  if(!nickname()) throw new Error("Trage deinen Namen ein.");
  await backend();
  for(let i=0;i<6;i++){
    const code=codeGen(), doc=state.db.collection("cshakeRooms").doc(code);
    try {
      await state.db.runTransaction(async tx=>{
        if((await tx.get(doc)).exists) throw new Error("CODE_COLLISION");
        tx.set(doc,{host:state.uid,members:[state.uid],duration:state.duration,phase:"lobby",round:0,startedAt:null,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
        tx.set(doc.collection("players").doc(state.uid),{name:nickname(),ready:false,score:0,round:0,finished:false});
      });
      state.code=code; persist();subscribe();return;
    }catch(e){if(e.message!=="CODE_COLLISION")throw e;}
  }
  throw new Error("Kein freier Raum-Code gefunden.");
}
async function join(code) {
  if(!nickname()) throw new Error("Trage deinen Namen ein.");
  if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) throw new Error("Ungültiger Raum-Code.");
  await backend();
  const doc=state.db.collection("cshakeRooms").doc(code);
  await state.db.runTransaction(async tx=>{
    const snap=await tx.get(doc);
    if(!snap.exists)throw new Error("Dieser Raum existiert nicht.");
    const room=snap.data();
    if(room.phase!=="lobby") throw new Error("Die Runde läuft bereits. Warte bis zum nächsten Battle.");
    if(!room.members.includes(state.uid)&&room.members.length>=4)throw new Error("Der Raum ist voll (maximal vier Personen).");
    const people=room.members.includes(state.uid)?room.members:[...room.members,state.uid];
    tx.update(doc,{members:people});
    tx.set(doc.collection("players").doc(state.uid),{name:nickname(),ready:false,score:0,round:room.round,finished:false});
  });
  state.code=code;persist();subscribe();
}
function subscribe() {
  state.offRoom?.();state.offPeople?.();
  const doc=ref();
  state.offRoom=doc.onSnapshot({includeMetadataChanges:true},snap=>{
    if(!snap.exists){message("Raum wurde geschlossen.");disconnect();show("entry");return;}
    if(snap.metadata.fromCache||snap.metadata.hasPendingWrites) return;
    state.room=snap.data();
    if(!members().includes(state.uid)){message("Du bist nicht mehr in diesem Raum.");clearPersist();disconnect();show("entry");return;}
    render();
  },e=>message("Raumverbindung: "+e.message));
  state.offPeople=doc.collection("players").onSnapshot({includeMetadataChanges:true},snap=>{
    if(snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;
    state.people=snap.docs.map(d=>({...d.data(),id:d.id}));
    render();
  },e=>message("Punktestand: "+e.message));
}
function motion(e) {
  state.samples++;state.lastSample=performance.now();
  if(state.phase!=="playing")return;
  const a=e.acceleration, g=e.accelerationIncludingGravity;
  const src=a&&Number.isFinite(a.y)?a:g;
  if(!src)return;
  if(detector.sample({y:src.y,time:performance.now(),includesGravity:src===g})){
    state.score=detector.score;$("score").textContent=String(state.score);
    const el=$("score-wrap");el.classList.remove("pulse");void el.offsetWidth;el.classList.add("pulse");
    if(state.score%10===0)$("feedback").textContent="🔥 "+state.score+" SHAKES!";
    if($("haptics").checked)navigator.vibrate?.(12);
    beep(680,.045);
  }
}
function beep(freq,len) {
  if(!$("sound").checked)return;
  try{const C=AudioContext||webkitAudioContext;state.audio??=new C();const a=state.audio,o=a.createOscillator(),g=a.createGain();o.frequency.value=freq;g.gain.value=.05;o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+len);}catch{}
}
async function sensor() {
  if(!isSecureContext)throw new Error("Bewegungssensor benötigt HTTPS.");
  if(!("DeviceMotionEvent" in window))throw new Error("Dein Browser unterstützt keinen Bewegungssensor.");
  if(typeof DeviceMotionEvent.requestPermission==="function"){
    const answer=await DeviceMotionEvent.requestPermission();
    if(answer!=="granted")throw new Error("Sensorberechtigung wurde verweigert.");
  }
  window.removeEventListener("devicemotion",motion);
  state.samples=0;window.addEventListener("devicemotion",motion,{passive:true});
  $("sensor-info").textContent="Bewege dein Handy zum Sensortest …";
  await new Promise(resolve=>setTimeout(resolve,1600));
  if(!state.samples||performance.now()-state.lastSample>1200)throw new Error("Keine Sensordaten empfangen. Prüfe die Browserberechtigung.");
  state.sensor=true;$("sensor-info").textContent="Sensor aktiv. Du kannst dich bereit machen.";
}
async function ready(){
  if(!state.sensor||performance.now()-state.lastSample>5000)throw new Error("Aktiviere den Sensor erneut.");
  await ref().collection("players").doc(state.uid).update({ready:!me()?.ready});
}
async function launch() {
  await state.db.runTransaction(async tx=>{
    const doc=ref(), rs=await tx.get(doc);
    if(!rs.exists)throw new Error("Raum fehlt.");
    const r=rs.data();
    if(r.host!==state.uid||r.phase!=="lobby")throw new Error("Nur der Host kann eine neue Runde starten.");
    if(r.members.length<1||r.members.length>4)throw new Error("Erlaubt sind 1–4 Spieler.");
    const playerDocs=[];
    for(const id of r.members)playerDocs.push(await tx.get(doc.collection("players").doc(id)));
    if(playerDocs.some(p=>!p.exists||!p.data().ready))throw new Error("Alle müssen bereit sein.");
    const round=r.round+1;
    tx.update(doc,{phase:"countdown",round,startedAt:firebase.firestore.FieldValue.serverTimestamp()});
    for(const p of playerDocs)tx.update(p.ref,{round,score:0,finished:false,ready:false});
  });
}
let pending=false;
async function publish(final=false) {
  if(final){while(pending)await new Promise(resolve=>setTimeout(resolve,60));}
  if(pending||!state.room||!members().includes(state.uid))return;
  pending=true;const round=state.activeRound,score=state.score;
  try{
    await state.db.runTransaction(async tx=>{
      const doc=ref(), rs=await tx.get(doc), p=doc.collection("players").doc(state.uid), ps=await tx.get(p);
      if(!rs.exists||!ps.exists)return;
      if(rs.data().round!==round||!["countdown","playing","finished"].includes(rs.data().phase))return;
      if(ps.data().round!==round||ps.data().finished)return;
      tx.update(p,{score:Math.max(Number(ps.data().score)||0,score),...(final?{finished:true}:{})});
    });
    state.published=score;
  }catch(e){message("Punkte konnten nicht gesendet werden: "+e.message);}
  finally{pending=false;}
}
async function finish() {
  if(state.phase==="finished"||state.phase==="finishing")return;
  state.phase="finishing";cancelAnimationFrame(state.tickId);
  await publish(true);
  state.phase="finished";render();
}
function tick(){
  if(!state.room||!state.room.startedAt)return;
  if(document.hidden){state.phase="paused";return;}
  const start=state.room.startedAt.toMillis()+4000;
  const now=Date.now();
  const remaining=(start+state.room.duration*1000-now)/1000;
  if(now<start){
    state.phase="countdown";$("phase").textContent="START IN";$("timer").textContent=String(Math.ceil((start-now)/1000));
  }else if(remaining>0){
    if(!state.roundStarted) {detector.reset();state.score=0;$("score").textContent="0";state.roundStarted=true;beep(880,.15);}
    state.phase="playing";
    $("phase").textContent="ZEIT";$("timer").textContent=remaining.toFixed(1);
    if(performance.now()-state.lastPublish>650 && state.score!==state.published){state.lastPublish=performance.now();void publish();}
  }else {void finish();return;}
  $("progress").style.width=(Math.max(0,Math.min(100,(now-start)/(state.room.duration*1000)*100)))+"%";
  state.tickId=requestAnimationFrame(tick);
}
function render() {
  if(!state.room){show("entry");return;}
  const room=state.room, players=state.people.filter(p=>members().includes(p.id));
  $("room-code").textContent=state.code;
  $("room-info").textContent=players.length+" von 4 Spielern · "+room.duration+" Sekunden · "+(room.host===state.uid?"Du bist Host":"Host startet die Runde");
  $("lobby-players").innerHTML=listHtml();
  $("ready").textContent=me()?.ready?"Bereits bereit ✓":"Bereit machen";
  $("ready").disabled=state.busy||!state.sensor;
  $("launch").hidden=room.host!==state.uid;
  $("launch").disabled=state.busy||players.length!==members().length||!players.length||!players.every(p=>p.ready);
  for(const id of ["create","join","leave","result-leave","rematch"]) $(id).disabled=state.busy;
  if(room.phase==="lobby"){cancelAnimationFrame(state.tickId);state.phase="lobby";state.activeRound=0;show("lobby");return;}
  if(room.phase==="countdown"){
    show("arena");$("live-scores").innerHTML=rankHtml();
    if(state.activeRound!==room.round && room.startedAt) {
      state.activeRound=room.round;state.published=0;state.score=0;state.roundStarted=false;
      detector.reset();$("score").textContent="0";$("feedback").textContent="SCHAU DEINEN GEGNERN IN DIE AUGEN!";
      cancelAnimationFrame(state.tickId);state.phase="countdown";tick();
    }else if(!state.tickId && state.phase==="paused"){tick();}
    return;
  }
  if(room.phase==="finished"){
    cancelAnimationFrame(state.tickId);state.phase="finished";show("result");
    $("final-scores").innerHTML=rankHtml();
    const winners=scores().filter(p=>p.score===scores()[0]?.score).map(p=>p.name);
    $("winner").textContent=winners.length>1?"Gleichstand: "+winners.join(" & "):"🏆 "+(winners[0]||"Battle")+" gewinnt!";
    $("rematch").hidden=room.host!==state.uid;
    return;
  }
}
async function checkCompleted() {
  if(!state.room||state.room.phase!=="countdown")return;
  const players=state.people.filter(p=>members().includes(p.id));
  if(players.length===members().length&&players.every(p=>p.finished&&p.round===state.room.round)){
    await state.db.runTransaction(async tx=>{
      const doc=ref(),rs=await tx.get(doc);
      if(rs.exists&&rs.data().phase==="countdown"&&rs.data().round===state.room.round)tx.update(doc,{phase:"finished"});
    });
  }
}
async function rematch(){
  await state.db.runTransaction(async tx=>{
    const doc=ref(),rs=await tx.get(doc);
    if(!rs.exists||rs.data().host!==state.uid||rs.data().phase!=="finished")throw new Error("Neue Runde ist noch nicht möglich.");
    tx.update(doc,{phase:"lobby",startedAt:null});
  });
}
async function leave(){
  if(state.code&&state.db){
    const doc=ref();
    await state.db.runTransaction(async tx=>{
      const rs=await tx.get(doc);if(!rs.exists)return;
      const r=rs.data(),members=r.members.filter(id=>id!==state.uid);
      tx.update(doc,{members,host:r.host===state.uid?(members[0]||""):r.host,...(!members.length?{phase:"closed"}:{})});
    });
  }
  clearPersist();disconnect();show("entry");
}
document.querySelectorAll("[data-duration]").forEach(btn=>btn.addEventListener("click",()=>{state.duration=Number(btn.dataset.duration);document.querySelectorAll("[data-duration]").forEach(b=>b.classList.toggle("chosen",b===btn));}));
$("create").addEventListener("click",()=>action(create));
$("join").addEventListener("click",()=>action(()=>join(normalizeCode($("join-code").value))));
$("sensor").addEventListener("click",()=>action(sensor));
$("ready").addEventListener("click",()=>action(ready));
$("launch").addEventListener("click",()=>action(launch));
$("rematch").addEventListener("click",()=>action(rematch));
$("leave").addEventListener("click",()=>action(leave));
$("result-leave").addEventListener("click",()=>action(leave));
$("invite").addEventListener("click",async()=>{
 const url=location.origin+location.pathname+"?room="+encodeURIComponent(state.code);
 try{if(navigator.share)await navigator.share({title:"C-Shake Live",url});else await navigator.clipboard.writeText(url);message("Einladungslink bereit.");}catch{}
});
window.addEventListener("visibilitychange",()=>{
 if(document.hidden){cancelAnimationFrame(state.tickId);state.tickId=0;if(state.phase==="playing")void publish();}
 else if(state.room?.phase==="countdown"&&state.room.startedAt){cancelAnimationFrame(state.tickId);tick();}
});
window.addEventListener("online",()=>{if(state.code&&!state.offRoom)subscribe();});
setInterval(()=>{if(state.room?.phase==="countdown"&&state.phase==="finished")void checkCompleted();},900);
(async()=>{
 const urlCode=new URLSearchParams(location.search).get("room");
 if(urlCode){$("join-code").value=urlCode.toUpperCase().slice(0,6);history.replaceState(null,"",location.pathname);}
 try {
   const saved=JSON.parse(localStorage.getItem(STORAGE)||"null");
   if(saved?.name)$("nickname").value=saved.name;
   if(!urlCode&&saved?.code){await backend();state.code=saved.code;const snap=await ref().get({source:"server"});if(snap.exists&&snap.data().members.includes(state.uid)){subscribe();return;}clearPersist();}
 }catch{}
})();
