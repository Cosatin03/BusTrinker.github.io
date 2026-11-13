import { ShakeDetector } from "./cshake-core.js";
const $ = s => document.querySelector(s);
const detector = new ShakeDetector();
const state = { party: true, players: [], current: 0, scores: [], duration: 10, sensorReady: false, phase: "setup", start: 0, end: 0, samples: 0, lastSample: 0, raf: 0, audio: null };
const read = (key) => { try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; } };
const save = (key,value) => { try { localStorage.setItem(key,String(value)); } catch {} };
const updateStats = () => { $("#record").textContent = read("cshake.record"); $("#rounds").textContent = read("cshake.rounds"); };
updateStats();
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function setMode(party) {
  if (state.phase === "playing" || state.phase === "countdown") return;
  state.party = party;
  $("#party-mode").classList.toggle("chosen",party);
  $("#solo-mode").classList.toggle("chosen",!party);
  $("#party-setup").hidden = !party;
  $("#start").textContent = party ? "Battle starten →" : "Solo starten →";
}
$("#party-mode").addEventListener("click",()=>setMode(true));
$("#solo-mode").addEventListener("click",()=>setMode(false));
function playerNames() {
  return [...new Set($("#player-names").value.split(/\n/).map(n=>n.trim().slice(0,24)).filter(Boolean))].slice(0,10);
}
function rankings() {
  return state.scores.map((score,i)=>({name:state.players[i],score,index:i}))
    .sort((a,b)=>b.score-a.score || a.index-b.index);
}
function standingsHtml() {
  if (!state.party) return "";
  return '<h3>Rangliste</h3><ol>'+rankings().map((p,i)=>'<li><span>'+ (i===0?"👑 ":"") +escapeHtml(p.name)+'</span><strong>'+p.score+' Shakes</strong></li>').join("")+'</ol>';
}
document.querySelectorAll("[data-duration]").forEach(b => b.addEventListener("click",()=>{ state.duration=Number(b.dataset.duration); document.querySelectorAll("[data-duration]").forEach(x=>x.classList.toggle("chosen",x===b)); updateStats(); }));
const error = msg => { $("#sensor-info").textContent=msg; $("#sensor-info").classList.add("error"); };
const motionHandler = e => {
  state.samples++;
  state.lastSample = performance.now();
  if (state.phase!=="playing") return;
  const a = e.acceleration, g=e.accelerationIncludingGravity;
  const source = a && Number.isFinite(a.y) ? a : g;
  if (!source) return;
  const timestamp = performance.now();
  if (timestamp < state.start || timestamp >= state.end) return;
  if (detector.sample({y:source.y,time:timestamp,includesGravity:source===g})) {
    $("#score").textContent=String(detector.score);
    if(detector.score % 10 === 0) {
      $("#feedback").textContent=["10ER-KOMBO! 🔥","UNAUFHALTSAM! ⚡","DAS WIRD ENG! 🚀"][Math.floor(detector.score/10-1)%3];
      beep(940,.09);
    }
    const el=$("#score-wrap");el.classList.remove("pulse");void el.offsetWidth;el.classList.add("pulse");
    if ($("#haptics").checked) navigator.vibrate?.(12);
    beep(680,.045);
  }
};
function beep(freq,duration) {
  if (!$("#sound").checked) return;
  try { const C=window.AudioContext||window.webkitAudioContext; if (!C) return; state.audio??=new C(); const ctx=state.audio, o=ctx.createOscillator(), v=ctx.createGain();o.frequency.value=freq;o.type="sine";v.gain.setValueAtTime(.06,ctx.currentTime);v.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);o.connect(v).connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration); } catch {}
}
$("#permission").addEventListener("click",async()=>{
  $("#sensor-info").classList.remove("error");
  if (!window.isSecureContext) return error("Für Sensorzugriff ist HTTPS erforderlich (localhost ist ebenfalls möglich).");
  if (!("DeviceMotionEvent" in window)) return error("Dieses Gerät stellt keine Bewegungssensoren im Browser bereit.");
  try {
    if (typeof DeviceMotionEvent.requestPermission==="function") {
      const answer=await DeviceMotionEvent.requestPermission();
      if (answer!=="granted") return error("Sensorzugriff verweigert. Prüfe die Safari-Einstellungen und versuche es erneut.");
    }
    window.removeEventListener("devicemotion",motionHandler);
    state.samples=0; state.lastSample=0;
    window.addEventListener("devicemotion",motionHandler,{passive:true});
    $("#sensor-info").textContent="Berechtigung erteilt. Bewege das Handy kurz, um den Sensor zu testen …";
    setTimeout(()=>{
      if (state.samples===0 || performance.now()-state.lastSample>1900) return error("Es kommen keine Sensordaten an. Prüfe Geräte- und Browserberechtigungen und versuche es erneut.");
      state.sensorReady=true;$("#sensor-info").textContent="Sensor aktiv. Bereit zum Start!";$("#start").disabled=false;
    },2200);
  } catch { error("Sensor konnte nicht aktiviert werden. Prüfe die Berechtigungen und versuche es erneut."); }
});
function screen(which) { for(const id of ["setup","game","result"]) $("#"+id).hidden=id!==which; }
function finish() {
  if(state.phase==="finished") return;
  state.phase="finished";cancelAnimationFrame(state.raf);
  const score=detector.score, old=read("cshake.record"), record=Math.max(score,old);
  if(state.party) state.scores[state.current]=score;
  save("cshake.record",record);save("cshake.rounds",read("cshake.rounds")+1);updateStats();
  screen("result");$("#final-score").textContent=score;
  if(state.party) {
    const remaining=state.current<state.players.length-1;
    const leader=rankings()[0];
    $("#result-heading").textContent=remaining?"HANDWECHSEL!": "🏆 "+leader.name+" GEWINNT!";
    $("#result-message").textContent=remaining
      ? state.players[state.current]+" hat "+score+" Shakes geschafft. Als Nächstes: "+state.players[state.current+1]+"."
      : "Party Battle beendet! "+leader.score+" Shakes in "+state.duration+" Sekunden sind der Spitzenwert.";
    $("#standings").innerHTML=standingsHtml();
    $("#next").hidden=!remaining;
    $("#again").hidden=remaining;
    $("#share").hidden=remaining;
  } else {
    $("#result-heading").textContent=score>old?"NEUER REKORD!":"GESCHAFFT!";
    $("#result-message").textContent="Dein Bestwert: "+record+" Shakes in "+state.duration+" Sekunden.";
    $("#standings").innerHTML="";
    $("#next").hidden=true;$("#again").hidden=false;$("#share").hidden=false;
  }
  beep(score>old?880:520,.22);
}
function tick(){
  const now=performance.now();
  if (document.hidden) { state.phase="cancelled"; cancelAnimationFrame(state.raf); screen("setup");error("Runde wegen App-Wechsel abgebrochen. Starte erneut.");return; }
  if(now>=state.end) { finish();return; }
  const remaining=Math.max(0,(state.end-now)/1000);
  if(now<state.start){$("#phase").textContent="START IN";$("#timer").textContent=String(Math.ceil((state.start-now)/1000));}
  else {if(state.phase!=="playing"){state.phase="playing";detector.reset();beep(740,.15);}$("#phase").textContent="ZEIT";$("#timer").textContent=remaining.toFixed(1); }
  $("#progress").style.width=`${Math.max(0,Math.min(100,(now-state.start)/(state.end-state.start)*100))}%`;
  state.raf=requestAnimationFrame(tick);
}
function start() {
  if(!state.sensorReady || performance.now()-state.lastSample>4000){error("Keine aktuellen Sensordaten. Aktiviere den Sensor erneut.");$("#start").disabled=true;state.sensorReady=false;state.phase="setup";screen("setup");return;}
  detector.reset();$("#score").textContent="0";
  $("#current-player").textContent=state.party ? state.players[state.current]+" ist dran!" : "";
  $("#feedback").textContent=["SCHÜTTEL, ALS WÄR'S DEIN JOB!","ZEIG, WAS DU DRAUFHAST!","VOLLGAS!"][state.current%3];
  state.phase="countdown";state.start=performance.now()+3000;state.end=state.start+state.duration*1000;screen("game");tick();
}
$("#start").addEventListener("click",()=>{
  if(state.party){
    const names=playerNames();
    if(names.length<2) { error("Trage mindestens zwei verschiedene Namen ein."); return; }
    state.players=names;state.scores=[];state.current=0;
  }
  start();
});
$("#next").addEventListener("click",()=>{
  if(!state.party || state.current>=state.players.length-1) return;
  state.current++;
  start();
});
$("#again").addEventListener("click",()=>{screen("setup");state.phase="setup";state.current=0;state.scores=[];$("#share").textContent="Ergebnis teilen";});
$("#share").addEventListener("click",async()=>{const text=state.party ? `C-Shake Party Battle (${state.duration}s):\n${rankings().map((p,i)=>`${i+1}. ${p.name}: ${p.score} Shakes`).join("\n")}` : `Ich habe bei C-Shake ${detector.score} Shakes in ${state.duration} Sekunden geschafft!`;try{if(navigator.share)await navigator.share({title:"C-Shake",text,url:location.href});else if(navigator.clipboard){await navigator.clipboard.writeText(text);$("#share").textContent="Kopiert!";}}catch{}});
