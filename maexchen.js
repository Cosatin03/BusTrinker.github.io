import {getIdentity,normalizeCode,readSaved,save,removeSaved,newId} from './session.js';
import {VALUES,rank,label,valueOf,commitment} from './maexchen-core.js';
import {MaexchenStore} from './maexchen-store.js';
const $=id=>document.getElementById(id), id=getIdentity().id, KEY='maexchen.session.v1';
let scenePromise;
let store,initializing,code=null,room=null,off=null,connected=false,busy=false,scene,rolling=false;
const notice=text=>{$('notice').textContent=text||'';};
const secretKey=()=>`maexchen.secret.${code}.${id}`;
const secret=()=>readSaved(secretKey());
const name=()=>$('nickname').value.trim().slice(0,24);
async function script(src){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error('Verbindung konnte nicht geladen werden.'));};document.head.append(s);});}
async function backend(){
  if(store)return store;if(initializing)return initializing;
  initializing=(async()=>{if(!window.firebase)await script('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');if(!window.firebase.firestore)await script('https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js');if(!window.bustrinkerDb)await script('config.js');store=new MaexchenStore(window.bustrinkerDb);return store;})().finally(()=>initializing=null);return initializing;
}
async function initScene(){
  if(scene)return scene;
  if(scenePromise)return scenePromise;
  scenePromise=import('./maexchen-scene.js').then(({DiceScene})=>{scene=new DiceScene($('table'));return scene;}).catch(()=>{throw new Error('3D-Würfel konnten nicht geladen werden. Aktiviere WebGL und lade die Seite neu.');}).finally(()=>scenePromise=null);
  return scenePromise;
}
function clear(){off?.();off=null;room=null;connected=false;code=null;removeSaved(KEY);render();}
function subscribe(){
  off?.();connected=false;
  off=store.ref(code).onSnapshot({includeMetadataChanges:true},snap=>{
    connected=!snap.metadata.fromCache&&!snap.metadata.hasPendingWrites&&navigator.onLine;
    if(!snap.exists){if(connected){clear();notice('Der Raum existiert nicht mehr.');}return;}
    const r=snap.data();
    if(r.game!=='maexchen'||r.version!==1){clear();notice('Dieser Raum ist nicht kompatibel.');return;}
    if(!r.players.some(p=>p.id===id)||r.phase==='closed'){clear();notice('Du bist nicht mehr im Raum.');return;}
    room=r;render();
  },e=>{connected=false;notice(errorText(e));render();});
}
function errorText(e){return e.code==='permission-denied'?'Firebase verweigert den Zugriff. Für Mäxchen müssen die Firestore-Regeln für maexchenRooms freigegeben sein.':e.message||'Verbindung fehlgeschlagen.';}
async function action(fn){if(busy)return;busy=true;notice('');render();try{await fn();}catch(e){notice(errorText(e));}finally{busy=false;rolling=false;render();}}
async function command(type,extra={}){
  if(!connected||!navigator.onLine)throw new Error('Keine Serververbindung. Bitte warte auf die Verbindung.');
  const updated=await store.command(code,id,{type,revision:room.revision,...extra});
  if(!room||updated.revision>=room.revision)room=updated;render();
}
async function enter(create){
  if(!name())throw new Error('Trage deinen Namen ein.');
  await backend();
  let target=normalizeCode($('join-code').value);
  if(create){
    for(let i=0;i<6;i++){
      target=Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
      try{await store.create(target,id,name());break;}catch(e){if(e.message!=='CODE_COLLISION'||i===5)throw e;}
    }
  }else{
    if(!/^[A-HJ-NP-Z2-9]{6}$/.test(target))throw new Error('Gib eine gültige sechsstellige Raum-ID ein.');
    await store.command(target,id,{type:'join',name:name()});
  }
  code=target;save(KEY,{code,name:name()});subscribe();
}
async function roll(){
  const view=await initScene();
  // Persist before the transaction: a reload or a lost acknowledgement must not lose a committed throw.
  let s=secret();
  if(!s||s.revision!==room.revision){
    rolling=true;$('dice-label').textContent='Die Würfel rollen …';const dice=await view.roll();rolling=false;
    s={dice,nonce:newId(),revision:room.revision};s.hash=await commitment(s.dice,s.nonce);
    if(!save(secretKey(),s))throw new Error('Dein Browser kann den verdeckten Wurf nicht dauerhaft speichern. Erlaube lokalen Speicher und würfle erneut.');
  }
  await command('rolled',{commitment:s.hash});
}
function render(){
  $('entry').hidden=!!room;$('room').hidden=!room;
  for(const button of document.querySelectorAll('button'))button.disabled=busy||(!!room&&!connected);
  if(!room)return;
  $('room-code').textContent=code;$('connection').textContent=connected?'Verbunden':'Verbindung unterbrochen – Aktionen pausiert';
  const mine=room.turn===id,host=room.host===id, current=room.players.find(p=>p.id===room.turn), previous=room.players.find(p=>p.id===room.previous);
  $('players').replaceChildren(...room.players.map(p=>{const li=document.createElement('li');li.textContent=`${p.name}${p.id===id?' (du)':''}${p.id===room.host?' ♛':''} · ${p.penalty} Schluck${p.penalty===1?'':'e'}`;li.classList.toggle('active',room.phase!=='lobby'&&p.id===room.turn);return li;}));
  const titles={lobby:'Wer spielt mit?',roll:'Verdeckt würfeln',claim:'Welche Zahl sagst du an?',decision:'Glauben oder anzweifeln?',reveal:'Der Wurf wird aufgedeckt',result:'Runde beendet'};
  $('phase-title').textContent=titles[room.phase]||'Mäxchen';
  $('phase-info').textContent=room.phase==='lobby'?`${room.players.length} von 10 Personen. Der Host startet ab zwei Personen.`:room.phase==='reveal'?`${previous?.name} muss den gespeicherten Wurf aufdecken.`:`${mine?'Du bist':current?.name+' ist'} dran.${room.claim?' Letzte Ansage: '+label(room.claim)+'.':''}`;
  const visible={start:host&&room.phase==='lobby',roll:mine&&room.phase==='roll',accept:mine&&room.phase==='decision'&&room.claim!==21,challenge:mine&&room.phase==='decision',concede:mine&&room.phase==='decision'&&room.claim===21,reveal:room.previous===id&&room.phase==='reveal',next:room.phase==='result'&&(mine||host),reset:host};
  for(const [key,show]of Object.entries(visible))$(key).hidden=!show;
  $('start').disabled||=room.players.length<2;$('reset').disabled||=room.players.length<2;
  $('host-tools').hidden=!host||room.phase==='lobby';
  $('claim-controls').hidden=!(mine&&room.phase==='claim');
  const selected=Number($('claim-value').value);$('claim-value').replaceChildren(...VALUES.filter(v=>rank(v)>rank(room.claim)).map(v=>{const opt=document.createElement('option');opt.value=v;opt.textContent=label(v);opt.selected=v===selected;return opt;}));
  const s=secret();let dice=null;
  if(room.phase==='claim'&&mine&&s?.hash===room.commitment)dice=s.dice;
  if(room.phase==='result'){
    dice=room.result.dice;const loser=room.players.find(p=>p.id===room.result.loser);
    $('phase-info').textContent=`${loser?.name}: ${room.result.penalty} Schluck${room.result.penalty===1?'':'e'}. ${dice?`Ansage ${label(room.result.claim)}, gewürfelt ${label(room.result.actual)}. ${room.result.truthful?'Ansage stimmt.':'Bluff aufgedeckt.'}`:'Mäxchen akzeptiert, ohne aufzudecken.'}`;
  }
  if(!rolling){$('dice-label').textContent=dice?`${dice.join(' + ')} → ${label(valueOf(dice))}${room.phase==='claim'?' · Nur du siehst diesen Wurf':''}`:'Würfel verdeckt';if(scene){if(dice)scene.show(dice);else scene.hide();}}
  if(!scene)initScene().then(()=>render()).catch(e=>{notice(e.message);$('roll').disabled=true;});
}
$('create').onclick=()=>action(()=>enter(true));$('join').onclick=()=>action(()=>enter(false));$('roll').onclick=()=>action(roll);
for(const type of ['start','accept','challenge','concede','next','reset'])$(type).onclick=()=>action(()=>command(type));
$('claim').onclick=()=>action(()=>command('claim',{value:Number($('claim-value').value)}));
$('reveal').onclick=()=>action(async()=>{const s=secret();if(!s||s.hash!==room.commitment)throw new Error('Der gespeicherte Wurf fehlt auf diesem Gerät. Der Host kann die Runde ohne Wertung neu starten.');await command('reveal',{dice:s.dice,nonce:s.nonce});});
$('leave').onclick=()=>action(async()=>{await command('leave');removeSaved(secretKey());clear();});
$('invite').onclick=()=>action(async()=>{const url=new URL('maexchen.html',location.href);url.searchParams.set('room',code);await navigator.clipboard.writeText(url.href);notice('Einladungslink kopiert.');});
window.addEventListener('offline',()=>{connected=false;render();});window.addEventListener('online',()=>{if(code)subscribe();});
(async()=>{
  const saved=readSaved(KEY), invite=new URLSearchParams(location.search).get('room');
  $('nickname').value=saved?.name||getIdentity().nickname||'';
  if(invite)$('join-code').value=normalizeCode(invite).slice(0,6);
  if(saved?.code&&(!invite||normalizeCode(invite)===saved.code))await action(async()=>{await backend();code=saved.code;subscribe();});
})();
