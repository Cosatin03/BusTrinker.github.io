export const VALUES = [31,32,41,42,43,51,52,53,54,61,62,63,64,65,11,22,33,44,55,66,21];
export const rank = value => VALUES.indexOf(value);
export function valueOf(dice) {
  if (!Array.isArray(dice) || dice.length !== 2 || dice.some(n => !Number.isInteger(n) || n < 1 || n > 6)) throw new Error('Ungültige Würfel.');
  return Math.max(...dice) * 10 + Math.min(...dice);
}
export const label = value => value === 21 ? '21 · Mäxchen' :
  VALUES.includes(value) && value % 11 === 0 ? `${value / 11}er-Pasch` : String(value);
export function createRoom(id, name) {
  return {game:'maexchen',version:1,revision:0,host:id,players:[{id,name:name.trim().slice(0,24),penalty:0}],phase:'lobby',turn:id,claim:0,previous:null,commitment:null,result:null};
}
export function transition(source, id, cmd) {
  if(source.game !== 'maexchen' || source.version !== 1) throw new Error('Inkompatibler Raum.');
  const r=structuredClone(source), member=r.players.find(p=>p.id===id);
  const require = (ok, message='Diese Aktion ist gerade nicht möglich.') => {if(!ok)throw new Error(message);};
  if(cmd.type==='join') {
    require(r.phase==='lobby','Die Runde läuft bereits.');
    require(typeof cmd.name==='string' && cmd.name.trim(),'Trage deinen Namen ein.');
    if(!member){require(r.players.length<10,'Der Raum ist voll.');r.players.push({id,name:cmd.name.trim().slice(0,24),penalty:0});}
  } else {
    require(member,'Du bist nicht im Raum.');
    if(cmd.type==='leave') {
      r.players=r.players.filter(p=>p.id!==id);
      if(r.host===id)r.host=r.players[0]?.id||'';
      r.phase=r.players.length?'lobby':'closed';r.claim=0;r.previous=null;r.commitment=null;r.result=null;r.turn=r.host;
    } else {
      require(cmd.revision===r.revision,'Der Spielstand hat sich geändert. Bitte erneut versuchen.');
      if(cmd.type==='start'||cmd.type==='reset') {
        require(id===r.host && r.players.length>=2,'Nur der Host kann mit mindestens zwei Personen starten.');
        require(cmd.type==='reset'||r.phase==='lobby');
        r.phase='roll';r.turn=r.host;r.claim=0;r.previous=null;r.commitment=null;r.result=null;
      } else if(cmd.type==='rolled') {
        require(id===r.turn && r.phase==='roll');
        require(/^[a-f0-9]{64}$/.test(cmd.commitment),'Ungültiger Wurfnachweis.');
        r.commitment=cmd.commitment;r.phase='claim';
      } else if(cmd.type==='claim') {
        require(id===r.turn && r.phase==='claim');
        require(rank(cmd.value)>=0 && rank(cmd.value)>rank(r.claim),'Die Ansage muss höher sein.');
        r.claim=cmd.value;r.previous=id;r.turn=r.players[(r.players.findIndex(p=>p.id===id)+1)%r.players.length].id;r.phase='decision';
      } else if(cmd.type==='accept') {
        require(id===r.turn && r.phase==='decision' && r.claim!==21);
        r.phase='roll';r.commitment=null;
      } else if(cmd.type==='challenge') {
        require(id===r.turn && r.phase==='decision');r.phase='reveal';
      } else if(cmd.type==='reveal') {
        require(id===r.previous && r.phase==='reveal');
        // The store verifies the SHA-256 commitment before calling the engine.
        require(cmd.verified===true,'Der Wurfnachweis stimmt nicht.');
        const actual=valueOf(cmd.dice), truthful=rank(actual)>=rank(r.claim);
        const loser=truthful?r.turn:r.previous, penalty=r.claim===21?2:1;
        r.players.find(p=>p.id===loser).penalty+=penalty;
        r.result={dice:cmd.dice,actual,claim:r.claim,loser,penalty,truthful};r.turn=loser;r.phase='result';
      } else if(cmd.type==='concede') {
        require(id===r.turn && r.phase==='decision' && r.claim===21);
        member.penalty++;r.result={dice:null,actual:null,claim:21,loser:id,penalty:1,truthful:null};r.phase='result';
      } else if(cmd.type==='next') {
        require(r.phase==='result' && (id===r.turn||id===r.host));
        r.turn=r.players[(r.players.findIndex(p=>p.id===r.result.loser)+1)%r.players.length].id;
        r.phase='roll';r.claim=0;r.previous=null;r.commitment=null;r.result=null;
      } else throw new Error('Unbekannte Aktion.');
    }
  }
  r.revision++;return r;
}
export async function commitment(dice, nonce) {
  valueOf(dice);
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({dice,nonce})));
  return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
