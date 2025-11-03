


let myNickname = '', currentRoomCode = '', isHost = false;
let unsubscribeRoom, unsubscribeMyHand;
let currentPlayersInGame = [];
let playerIsDisplay = false;

const SVG_SPRITE_URL = 'https://upload.wikimedia.org/wikipedia/commons/c/c9/SVG-cards-1.3-French-style.svg';
const RANK_MAP = { 'a': 'A', 'b': 'K', 'c': 'Q', 'd': 'J', 'e': '10', 'f': '9', 'g': '8', 'h': '7', 'i': '6', 'j': '5', 'k': '4', 'l': '3', 'm': '2' };
const SUIT_MAP_NUM = { '1': 'H', '2': 'D', '3': 'S', '4': 'C' }; // 1=Herz, 2=Karo, 3=Pik, 4=Kreuz
const RANK_TEXT = { 'a': 'Ass', 'b': 'König', 'c': 'Dame', 'd': 'Bube', 'e': '10', 'f': '9', 'g': '8', 'h': '7', 'i': '6', 'j': '5', 'k': '4', 'l': '3', 'm': '2' };
const SUIT_TEXT = { '1': 'Herz', '2': 'Karo', '3': 'Pik', '4': 'Kreuz' };
function suitSymbolByNum(suitNum){
  // 1=Herz ♥, 2=Karo ♦, 3=Pik ♠, 4=Kreuz ♣
  switch(String(suitNum)){
    case '1': return '♥';
    case '2': return '♦';
    case '3': return '♠';
    case '4': return '♣';
    default : return '?';
  }
}
function suitColorClass(suitNum){
  return (String(suitNum)==='1' || String(suitNum)==='2') ? 'card--red' : 'card--black';
}

/* ================== UTIL ================== */
function showScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function generateCode(len,isNumeric=false){ const c=isNumeric?'0123456789':'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let r=''; for(let i=0;i<len;i++) r+=c.charAt(Math.floor(Math.random()*c.length)); return r; }

function generateAlphanumericDeck(cardCount){
    const deck=[];
    const ranks = (cardCount===32) ? 'abcdefgh' : 'abcdefghijklm';
    for(const rank of ranks){
        for(let suit=1; suit<=4; suit++) {
            deck.push(rank + suit);
        }
    }
    return deck;
}

function getTotalRows(pyramidData) { let r = 0, total = 0; while (total < pyramidData.length) { r++; total += r; } return r; }

function getCardSvgId(cardValue) {
    const rankChar = cardValue.charAt(0);
    const suitNum = cardValue.substring(1);
    const svgRank = RANK_MAP[rankChar];
    const svgSuit = SUIT_MAP_NUM[suitNum];
    if (!svgRank || !svgSuit) return 'FR-back-blue-2';
    return `FR-${svgSuit}-${svgRank}`;
}

function cardValueToText(cardValue) {
    const rankChar = cardValue.charAt(0);
    const suitNum = cardValue.substring(1);
    return `${SUIT_TEXT[suitNum]} ${RANK_TEXT[rankChar]}`;
}

function createCardElement(cardValue, isHidden = false) {
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  if (cardValue) cardEl.dataset.value = cardValue;

  if (isHidden) {
    cardEl.classList.add('back');
    return cardEl;
  }

  const rankChar = String(cardValue||'').charAt(0);
  const suitNum  = String(cardValue||'').substring(1);
  const rankDisp = RANK_MAP[rankChar] || '?';
  const suitSym  = suitSymbolByNum(suitNum);
  const colorCls = suitColorClass(suitNum);
  const isFaceCard = /^(J|Q|K)$/.test(rankDisp);

  const face = document.createElement('div');
  face.className = `card-face ${colorCls}`;
  face.innerHTML = `
    <div class="card-corner tl">
      <div class="card-rank">${rankDisp}</div>
      <div class="card-suit">${suitSym}</div>
    </div>
    <div class="card-corner br">
      <div class="card-rank">${rankDisp}</div>
      <div class="card-suit">${suitSym}</div>
    </div>
    <div class="card-center-suit ${isFaceCard ? 'is-face' : ''}">
      ${isFaceCard ? rankDisp : suitSym}
    </div>
  `;
  cardEl.appendChild(face);
  return cardEl;
}


/* ================== LOBBY ================== */
async function hostGame(){
  window.open('https://otieu.com/4/9969336', '_blank');
  myNickname = document.getElementById('nickname-input').value.trim();
  if(!myNickname){ alert('Bitte gib einen Nickname ein.'); return; }
  isHost = true; playerIsDisplay=false; currentRoomCode = generateCode(6);
  const roomRef = db.collection('rooms').doc(currentRoomCode);
  try{
    await roomRef.set({ host: myNickname, status:'lobby', settings:{cardCount:32,rowCount:3}, externalDisplayEnabled:false, displayCode:null });
    await roomRef.collection('players').doc(myNickname).set({ joinedAt: firebase.firestore.FieldValue.serverTimestamp(), receivedCards: [], lastReceived: [], actionConfirmed: true, score: 0 });
    setupLobbyListeners(currentRoomCode);
    showScreen('lobby-screen');
    document.getElementById('room-code-display').innerText = currentRoomCode;
    document.getElementById('host-controls').style.display = 'block';
  }catch(e){ console.error(e); alert('Spiel konnte nicht gehostet werden.'); }
}

async function joinGame(){
  myNickname = document.getElementById('nickname-input').value.trim();
  const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
  if(!myNickname || !roomCode){ alert('Nickname und Raum-Code sind erforderlich.'); return; }
  isHost=false; playerIsDisplay=false; currentRoomCode=roomCode;
  const roomRef = db.collection('rooms').doc(currentRoomCode);
  try{
    const roomDoc = await roomRef.get();
    if(!roomDoc.exists) throw new Error('Raum existiert nicht.');
    if(roomDoc.data().status!=='lobby') throw new Error('Spiel hat bereits begonnen.');
    const playersSnapshot = await roomRef.collection('players').get();
    if(playersSnapshot.docs.some(d=>d.id===myNickname)) throw new Error('Nickname bereits vergeben.');
    if(playersSnapshot.size>=10) throw new Error('Raum ist voll.');
    await roomRef.collection('players').doc(myNickname).set({ joinedAt: firebase.firestore.FieldValue.serverTimestamp(), receivedCards: [], lastReceived: [], actionConfirmed: true, score: 0 });
    setupLobbyListeners(currentRoomCode);
    showScreen('lobby-screen');
    document.getElementById('room-code-display').innerText = currentRoomCode;
    document.getElementById('player-wait-message').style.display='block';
  }catch(e){ console.error(e); alert('Beitreten fehlgeschlagen: '+e.message); }
}

async function joinAsDisplay(){
  const displayCode = document.getElementById('display-code-input').value.trim();
  if(!displayCode){ alert('Bitte gib einen Display-Code ein.'); return; }
  isHost=false; playerIsDisplay=true;
  try{
    const snap = await db.collection('rooms').where('displayCode','==',displayCode).limit(1).get();
    if(snap.empty) throw new Error('Kein Raum mit diesem Code gefunden.');
    currentRoomCode = snap.docs[0].id;
    showScreen('display-screen');
    setupDisplayListeners(currentRoomCode);
  }catch(e){ console.error(e); alert('Beitritt als Display fehlgeschlagen.'); }
}

function updateSettings(){
  if(!isHost) return;
  const roomRef = db.collection('rooms').doc(currentRoomCode);
  roomRef.get().then(doc=>{
    const currentDisplayCode = doc.data().displayCode;
    const updates = {
      'settings.cardCount': parseInt(document.getElementById('card-count-select').value,10),
      'settings.rowCount': parseInt(document.getElementById('row-count-select').value,10),
      'externalDisplayEnabled': document.getElementById('external-display-checkbox').checked
    };
    if(updates.externalDisplayEnabled && !currentDisplayCode) updates.displayCode = generateCode(4,true);
    else if(!updates.externalDisplayEnabled) updates.displayCode = null;
    roomRef.update(updates);
  });
}

/* ================== GAME START/STATE ================== */
async function startGame(){
  if(!isHost) return;
  const roomRef = db.collection('rooms').doc(currentRoomCode);
  const playersRef = roomRef.collection('players');
  try{
    const playersSnapshot = await playersRef.get();
    const players = playersSnapshot.docs.map(doc=>doc.id);
    if(players.length<2){ alert('Mindestens 2 Spieler werden benötigt.'); return; }
    await db.runTransaction(async (t)=>{
      const roomDoc = await t.get(roomRef);
      if(!roomDoc.exists || roomDoc.data().status!=='lobby') return;
      const {cardCount,rowCount} = roomDoc.data().settings;
      let deck = generateAlphanumericDeck(cardCount);
      deck = deck.sort(()=>Math.random()-0.5);
      const pyramidCardCount = (rowCount*(rowCount+1))/2;
      if(pyramidCardCount>=deck.length) throw new Error(`Zu viele Reihen (${rowCount}) für Kartenanzahl (${cardCount}).`);
      const pyramid = deck.splice(0,pyramidCardCount).map(card=>({cardValue:card,isRevealed:false}));
      const cardsPerPlayer = Math.floor(deck.length/players.length);
      const playerHands = {};
      players.forEach(n=>playerHands[n]=deck.splice(0,cardsPerPlayer));
      const discardPile = deck;
      t.update(roomRef,{ status:'in-game', gameState:{ pyramid, discardPile, revealedDiscard:[], currentTrigger:null, currentRow:null, currentPoints:null, requiredGivers:[], giversDone:[] } });
      for(const n of players) t.update(playersRef.doc(n),{ hand: playerHands[n], actionConfirmed:true, score: (roomDoc.get(`players.${n}.score`)||0) });
    });
  }catch(e){ console.error(e); alert('Spiel konnte nicht gestartet werden: '+e.message); }
}

async function revealPyramidCard(index){
  const roomRef = db.collection('rooms').doc(currentRoomCode);
  let triggerCard=null;
  await db.runTransaction(async (t)=>{
    const doc = await t.get(roomRef);
    const gs = doc.data().gameState;
    if(gs.pyramid[index] && !gs.pyramid[index].isRevealed){
      gs.pyramid[index].isRevealed = true;
      triggerCard = gs.pyramid[index].cardValue;
      
      const totalRows = getTotalRows(gs.pyramid);
      const triggerRowFromTop = indexToRow(gs.pyramid, index);
      const points = totalRows - triggerRowFromTop + 1;

      gs.currentTrigger = triggerCard;
      gs.currentRow = triggerRowFromTop;
      gs.currentPoints = points;
      gs.giversDone = [];
      gs.requiredGivers = [];
      t.update(roomRef,{ gameState: gs });
    }
  });
  if(triggerCard){
    await awardRowPointsOnReveal(triggerCard);
    await computeRequiredGivers(triggerCard);
  }
}

async function revealNextPyramidCardByHost(){
  const roomRef = db.collection('rooms').doc(currentRoomCode);
  let triggerCard=null;
  await db.runTransaction(async (t)=>{
    const doc = await t.get(roomRef);
    const gs = doc.data().gameState;
    const next = gs.pyramid.map(c => c.isRevealed).lastIndexOf(false);
    if(next!==-1){
      gs.pyramid[next].isRevealed = true;
      triggerCard = gs.pyramid[next].cardValue;

      const totalRows = getTotalRows(gs.pyramid);
      const triggerRowFromTop = indexToRow(gs.pyramid, next);
      const points = totalRows - triggerRowFromTop + 1;

      gs.currentTrigger = triggerCard;
      gs.currentRow = triggerRowFromTop;
      gs.currentPoints = points;
      gs.giversDone = [];
      gs.requiredGivers = [];
      t.update(roomRef,{ gameState: gs });
    }
  });
  if(triggerCard){
    await awardRowPointsOnReveal(triggerCard);
    await computeRequiredGivers(triggerCard);
  }
}

async function revealNextDiscardCard(){
  if(!isHost) return;
  const roomRef = db.collection('rooms').doc(currentRoomCode);
  const playersRef = roomRef.collection('players');
  try{
    const playersSnapshot = await playersRef.get();
    const allConfirmed = playersSnapshot.docs.every(d=>d.data().actionConfirmed);
    const roomDoc = await roomRef.get();
    const gs = roomDoc.data().gameState||{};
    const requiredGivers = gs.requiredGivers||[];
    const giversDone = gs.giversDone||[];
    const allGiversDone = requiredGivers.every(n=>giversDone.includes(n));
    if(!allConfirmed || !allGiversDone){ alert('Warten: Nicht alle Bestätigungen/Abgaben sind erledigt.'); return; }

    let triggerCard=null;
    await db.runTransaction(async (t)=>{
      const doc = await t.get(roomRef);
      const g = doc.data().gameState;
      if(g.discardPile.length===0) return;
      const cardToReveal = g.discardPile.shift();
      g.revealedDiscard.push(cardToReveal);
      triggerCard = cardToReveal;
      g.currentTrigger = triggerCard;
      g.currentRow = null;
      g.currentPoints = 1; 
      g.giversDone = [];
      g.requiredGivers = [];
      t.update(roomRef,{ gameState: g });
    });
    if(triggerCard){
      await awardRowPointsOnReveal(triggerCard);
      await computeRequiredGivers(triggerCard);
    }
  }catch(e){ console.error(e); alert('Reststapel-Karte konnte nicht aufgedeckt werden: '+e.message); }
}

/* ================== ACTIONS ================== */
async function giveCard(){
    const assignmentArea = document.getElementById('card-assignment-area');
    const selects = assignmentArea.querySelectorAll('select');

    const assignments = {};
    const allCardsToGive = [];
    selects.forEach(select => {
        const card = select.dataset.card;
        const target = select.value;
        if (target) {
            if (!assignments[target]) assignments[target] = [];
            assignments[target].push(card);
            allCardsToGive.push(card);
        }
    });

    if (allCardsToGive.length === 0) {
        alert('Bitte weise mindestens eine Karte einem Spieler zu.');
        return;
    }

    try {
        await db.runTransaction(async (t) => {
            const roomRef = db.collection('rooms').doc(currentRoomCode);
            const sourceRef = roomRef.collection('players').doc(myNickname);

            const roomDoc = await t.get(roomRef);
            const sourceDoc = await t.get(sourceRef);

            const targetRefs = {};
            const targetDocs = {};
            for (const targetPlayer in assignments) {
                targetRefs[targetPlayer] = roomRef.collection('players').doc(targetPlayer);
                targetDocs[targetPlayer] = await t.get(targetRefs[targetPlayer]);
            }

            const gs = roomDoc.data().gameState || {};
            const requiredGivers = gs.requiredGivers || [];
            const giversDone = gs.giversDone || [];
            if (requiredGivers.includes(myNickname) && giversDone.includes(myNickname)) throw new Error('Du hast für diesen Buchstaben bereits abgegeben.');

            const sourceHand = sourceDoc.data().hand;
            for (const card of allCardsToGive) {
                if (!sourceHand.includes(card)) throw new Error(`Karte ${card} ist nicht mehr in deiner Hand.`);
            }

            const finalSourceHand = sourceHand.filter(c => !allCardsToGive.includes(c));
            t.update(sourceRef, { hand: finalSourceHand });

            for (const targetPlayer in assignments) {
                const cardsForThisPlayer = assignments[targetPlayer];
                const targetData = targetDocs[targetPlayer].data();
                const targetReceived = targetData.receivedCards || [];

                const rowPts = Number(gs.currentPoints) || 1;
                const pointsToAdd = rowPts * cardsForThisPlayer.length;
                const newScore = (Number(targetData.score) || 0) + pointsToAdd;

                t.update(targetRefs[targetPlayer], {
                    receivedCards: [...targetReceived, ...cardsForThisPlayer],
                    lastReceived: cardsForThisPlayer,
                    actionConfirmed: false,
                    score: newScore
                });
            }

            const newGiversDone = giversDone.includes(myNickname) ? giversDone : [...giversDone, myNickname];
            t.update(roomRef, { 'gameState.giversDone': newGiversDone });
        });

        document.getElementById('give-card-controls').style.display = 'none';
        await checkTriggerResolved();
    } catch (e) {
        console.error(e);
        alert('Karten konnten nicht abgegeben werden: ' + e.message);
    }
}

async function confirmReceivedCard(){
  const playerRef = db.collection('rooms').doc(currentRoomCode).collection('players').doc(myNickname);
  try{
    await playerRef.update({ actionConfirmed:true, lastReceived: firebase.firestore.FieldValue.delete() });
    document.getElementById('card-received-overlay').style.display='none';
    await checkTriggerResolved();
  }catch(e){ console.error(e); alert('Bestätigung fehlgeschlagen: '+e.message); }
}

/* ================== LISTENERS / UI ================== */
function setupLobbyListeners(roomCode){
  let unsubscribePlayers = db.collection('rooms').doc(roomCode).collection('players').onSnapshot(snap=>{
    currentPlayersInGame = snap.docs.map(doc=>doc.id);
    updatePlayerListUI(currentPlayersInGame);
    if(isHost) document.getElementById('start-game-button').disabled = currentPlayersInGame.length<2;
  });
  unsubscribeRoom = db.collection('rooms').doc(roomCode).onSnapshot(doc=>{
    const data = doc.data(); if(!data) return;
    if(data.status==='in-game'){
      if(unsubscribePlayers) unsubscribePlayers(); if(unsubscribeRoom) unsubscribeRoom();
      document.getElementById('game-player-list').innerHTML = document.getElementById('player-list').innerHTML;
      showScreen('game-screen');
      setupGameListeners(roomCode);
      updateGamePlayerScores(roomCode);
      return;
    }
    if(isHost){
      const area = document.getElementById('display-code-area');
      if(data.externalDisplayEnabled && data.displayCode){
        document.getElementById('display-code-display').innerText = data.displayCode; area.style.display='block';
      }else area.style.display='none';
    }else{
      document.getElementById('player-settings-display').innerHTML = `<p><strong>Einstellungen:</strong> ${data.settings.cardCount} Karten, ${data.settings.rowCount} Reihen. Display: ${data.externalDisplayEnabled?'Ja':'Nein'}</p>`;
    }
  });
}

function setupGameListeners(roomCode){
  if(isHost) document.getElementById('host-game-controls').style.display='block';
  unsubscribeMyHand = db.collection('rooms').doc(roomCode).collection('players').doc(myNickname).onSnapshot(doc=>{
    if(doc.exists){
      const p = doc.data();
      displayCards(p.hand||[],'hand-cards-display');
      const receivedArea = document.getElementById('received-cards');
      if(p.receivedCards && p.receivedCards.length>0){
        displayCards(p.receivedCards,'received-cards-display');
        receivedArea.style.display='block';
        
        if(!p.actionConfirmed && p.lastReceived && p.lastReceived.length > 0){
          const cardTexts = p.lastReceived.map(cardValueToText).join(', ');
          const cardPlural = p.lastReceived.length > 1 ? 'Karten' : 'Karte';
          
          document.querySelector('#card-received-overlay h2').innerText = `${cardPlural} erhalten!`;
          const pElement = document.querySelector('#card-received-overlay p');
          pElement.innerHTML = `Du hast die ${cardPlural.toLowerCase()} <strong id="received-card-value">${cardTexts}</strong> erhalten.`;
          
          document.getElementById('card-received-overlay').style.display='flex';
        }
      }else receivedArea.style.display='none';
    }
  });
  unsubscribeRoom = db.collection('rooms').doc(roomCode).onSnapshot(async doc=>{
    const data = doc.data(); if(!data || !data.gameState) return;
    const { pyramid, revealedDiscard, discardPile, currentTrigger, currentPoints, requiredGivers=[], giversDone=[] } = data.gameState;

    displayPyramid(pyramid,'pyramid-area-player',false);
    displayCards(revealedDiscard,'public-revealed-cards');

    const triggerRank = currentTrigger ? RANK_TEXT[currentTrigger.charAt(0)] : null;
    document.getElementById('active-trigger-player').innerText = triggerRank ? `${triggerRank} (${currentPoints || '-'} Pkt.)` : '–';

    if(isHost){
      const playersSnapshot = await db.collection('rooms').doc(roomCode).collection('players').get();
      const allConfirmed = playersSnapshot.docs.every(d=>d.data().actionConfirmed);
      const allGiversDone = requiredGivers.every(n=>giversDone.includes(n));
      document.getElementById('reveal-pyramid-card-button').style.display = data.externalDisplayEnabled ? 'none' : 'block';
      document.getElementById('reveal-pyramid-card-button').disabled = pyramid.every(c=>c.isRevealed) || !allConfirmed || !allGiversDone;
      document.getElementById('reveal-discard-card-button').disabled = discardPile.length===0 || !allConfirmed || !allGiversDone;
      document.getElementById('host-wait-hint').style.display = (allConfirmed && allGiversDone)?'none':'block';
    }

    const giveControls = document.getElementById('give-card-controls');
    if(triggerRank){
      const myHand = Array.from(document.querySelectorAll('#hand-cards-display .card')).map(c=>c.dataset.value);
      const playableCards = myHand.filter(c=>c.charAt(0)===currentTrigger.charAt(0));
      const mustGive = requiredGivers.includes(myNickname) && !giversDone.includes(myNickname);
      if(playableCards.length>0 && mustGive){
        const assignmentArea = document.getElementById('card-assignment-area');
        assignmentArea.innerHTML = '';
        const otherPlayers = currentPlayersInGame.filter(p => p !== myNickname);
        const playerOptions = '<option value="">- Spieler wählen -</option>' + otherPlayers.map(p => `<option value="${p}">${p}</option>`).join('');
        playableCards.forEach(card => {
            const row = document.createElement('div');
            row.className = 'card-assignment-row';
            const cardElHTML = createCardElement(card).outerHTML;
            row.innerHTML = `${cardElHTML}<select data-card="${card}">${playerOptions}</select>`;
            assignmentArea.appendChild(row);
        });
        giveControls.style.display='block';
      }else giveControls.style.display='none';

    }else giveControls.style.display='none';
  });
}

function setupDisplayListeners(roomCode){
  unsubscribeRoom = db.collection('rooms').doc(roomCode).onSnapshot(async doc=>{
    const data = doc.data();
    if(data && data.gameState){
      const { pyramid, revealedDiscard, currentTrigger, currentPoints, requiredGivers=[], giversDone=[] } = data.gameState;
      displayPyramid(pyramid,'pyramid-area-display',true);
      displayCards(revealedDiscard,'display-revealed-cards');

      const triggerRank = currentTrigger ? RANK_TEXT[currentTrigger.charAt(0)] : null;
      document.getElementById('active-trigger-display').innerText = triggerRank ? `${triggerRank} (${currentPoints || '-'} Pkt.)` : '–';

      const playersSnapshot = await db.collection('rooms').doc(roomCode).collection('players').get();
      const allConfirmed = playersSnapshot.docs.every(d=>d.data().actionConfirmed);
      const allGiversDone = requiredGivers.every(n=>giversDone.includes(n));
      document.querySelectorAll('#pyramid-area-display .card.interactive').forEach(cardEl=>{
        const ok = allConfirmed && allGiversDone;
        cardEl.style.pointerEvents = ok ? 'auto' : 'none';
        cardEl.style.opacity = ok ? '1' : '0.5';
      });
    }
  });
}

function updatePlayerListUI(players){
  const list = document.getElementById('player-list'); list.innerHTML='';
  players.forEach(name=>{
    const li = document.createElement('li');
    li.textContent = name + (name===myNickname?' (Du)':'');
    if(name===myNickname) li.style.fontWeight='bold';
    list.appendChild(li);
  });
  document.getElementById('player-count').innerText = players.length;
}

function updateGamePlayerScores(roomCode){
  const list = document.getElementById('game-player-list');
  db.collection('rooms').doc(roomCode).collection('players').onSnapshot(snap=>{
    const arr = snap.docs.map(d=>({ name:d.id, score:Number(d.data().score)||0 }));
    list.innerHTML = arr
      .sort((a,b)=> b.score-a.score || a.name.localeCompare(b.name))
      .map(p=>`<li>${p.name}${p.name===myNickname?' (Du)':''} — Punkte: <strong>${p.score}</strong></li>`)
      .join('');
  });
}

function displayCards(cards,id){
  const el=document.getElementById(id); el.innerHTML='';
  if(!cards||cards.length===0){ el.innerText='Keine'; return; }
  cards.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  cards.forEach(card=>{
      el.appendChild(createCardElement(card));
  });
}

function displayPyramid(pyramidData, containerId, isInteractive){
  const container = document.getElementById(containerId); container.innerHTML='';
  if(!pyramidData || pyramidData.length===0) return;
  const totalRows = getTotalRows(pyramidData);
  let pos=0;
  for(let row=1; row<=totalRows; row++){
    const rowEl=document.createElement('div'); rowEl.className='pyramid-row';
    for(let i=0;i<row;i++){
      const cardData = pyramidData[pos];
      const isRevealed = cardData.isRevealed;
      const cardEl = createCardElement(cardData.cardValue, !isRevealed);
      cardEl.dataset.index = pos;

      if(!isRevealed && isInteractive){
          cardEl.classList.add('interactive');
          cardEl.onclick = () => revealPyramidCard(cardEl.dataset.index);
      }
      rowEl.appendChild(cardEl);
      pos++;
    }
    container.appendChild(rowEl);
  }
}

function indexToRow(pyramidData, idx){
  let row=1, used=0;
  while(true){
    if(idx < used+row) return row;
    used += row; row++;
  }
}

async function computeRequiredGivers(triggerCard){
  const roomRef = db.collection('rooms').doc(currentRoomCode);
  const rank = String(triggerCard).charAt(0);
  try{
    const playersSnapshot = await roomRef.collection('players').get();
    const required = playersSnapshot.docs
      .filter(d=>Array.isArray(d.data().hand) && d.data().hand.some(c=>String(c).charAt(0)===rank))
      .map(d=>d.id);
    await roomRef.update({ 'gameState.requiredGivers': required, 'gameState.giversDone': [] });
  }catch(e){ console.error('computeRequiredGivers error', e); }
}

async function awardRowPointsOnReveal(triggerCard){
  const roomRef = db.collection('rooms').doc(currentRoomCode);
  const rank = String(triggerCard).charAt(0);
  const roomDoc = await roomRef.get();
  const gs = roomDoc.data().gameState||{};
  const pts = Number(gs.currentPoints)||1;
  if(!pts) return;
  const playersSnapshot = await roomRef.collection('players').get();
  const updates = [];
  for(const d of playersSnapshot.docs){
    const data = d.data();
    const received = Array.isArray(data.receivedCards) ? data.receivedCards : [];
    const matches = received.filter(c=>String(c).charAt(0)===rank).length;
    if(matches>0){
      const newScore = (Number(data.score)||0) + matches*pts;
      updates.push(roomRef.collection('players').doc(d.id).update({ score: newScore }));
    }
  }
  await Promise.all(updates);
}

async function checkTriggerResolved(){
  const roomRef = db.collection('rooms').doc(currentRoomCode);
  try{
    const roomDoc = await roomRef.get();
    const gs = roomDoc.data().gameState||{};
    const required = gs.requiredGivers||[];
    const done = gs.giversDone||[];
    const playersSnapshot = await roomRef.collection('players').get();
    const allConfirmed = playersSnapshot.docs.every(d=>d.data().actionConfirmed);
    const allGiversDone = required.every(n=>done.includes(n));
    if(gs.currentTrigger && allConfirmed && allGiversDone){
      await roomRef.update({
        'gameState.currentTrigger': null,
        'gameState.currentRow': null,
        'gameState.currentPoints': null,
        'gameState.requiredGivers': [],
        'gameState.giversDone': []
      });
    }
  }catch(e){ console.error('checkTriggerResolved error', e); }
}
