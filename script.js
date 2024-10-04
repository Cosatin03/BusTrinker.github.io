let deck = [];
let players = [];
let pyramid = [];
let revealedCards = [];
let nextCardOrderToReveal = 0;
let pyramidRows = 0;
let totalCards = 0;

document.getElementById('startGame').addEventListener('click', startGame);
document.getElementById('restartGame').addEventListener('click', restartGame); // "Spiel Neu Starten"
document.getElementById('endRound').addEventListener('click', endRound); // "Runde Beenden"

function startGame() {
    // Initiale Einstellungen
    const deckSize = parseInt(document.getElementById('deckSize').value);
    pyramidRows = parseInt(document.getElementById('pyramidRows').value);
    const playerNames = document.getElementById('playerNames').value.split(',').map(name => name.trim()).filter(name => name);

    if (playerNames.length === 0) {
        alert('Bitte geben Sie mindestens einen Spielernamen ein.');
        return;
    }

    // Deck generieren
    deck = generateDeck(deckSize);

    // Spieler initialisieren
    initializePlayers(playerNames);

    // Pyramide bauen
    buildPyramid(pyramidRows);

    // Karten an Spieler verteilen
    distributeCards();

    // Spielbereich anzeigen
    document.getElementById('setup').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';

    // Spieler anzeigen
    displayPlayers();

    // Pyramide anzeigen
    displayPyramid();
}

function generateDeck(deckSize) {
    const suits = ['♥', '♦', '♣', '♠'];
    const values = deckSize === 32 ? [7, 8, 9, 10, 'B', 'D', 'K', 'A'] : [2, 3, 4, 5, 6, 7, 8, 9, 10, 'B', 'D', 'K', 'A'];
    let newDeck = [];

    for (let suit of suits) {
        for (let value of values) {
            newDeck.push({ suit, value, code: `${value}${suit}` });
        }
    }

    // Deck mischen
    return newDeck.sort(() => Math.random() - 0.5);
}

function buildPyramid(rows) {
    pyramid = [];
    totalCards = (rows * (rows + 1)) / 2;

    for (let i = 0; i < totalCards; i++) {
        pyramid.push(deck.pop());
    }

    nextCardOrderToReveal = 0;
}

function initializePlayers(playerNames) {
    players = playerNames.map(name => ({ name, hand: [], receivedPoints: 0, receivedCards: [] }));
}

function distributeCards() {
    // Anzahl der Karten pro Spieler berechnen
    let cardsPerPlayer = Math.floor(deck.length / players.length);

    // Überschüssige Karten aus dem Spiel entfernen
    let excessCards = deck.length % players.length;
    if (excessCards > 0) {
        deck.splice(0, excessCards);
    }

    // Karten gleichmäßig an Spieler verteilen
    for (let i = 0; i < cardsPerPlayer; i++) {
        for (let player of players) {
            player.hand.push(deck.pop());
        }
    }
}

function displayPlayers() {
    const playersDiv = document.getElementById('players');
    playersDiv.innerHTML = '';
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        playerDiv.dataset.name = player.name;

        const nameDiv = document.createElement('div');
        nameDiv.textContent = `${player.name} (Punkte: ${player.receivedPoints})`;
        nameDiv.addEventListener('click', () => showPlayerHand(player));
        playerDiv.appendChild(nameDiv);

        // Erhaltene Karten dauerhaft anzeigen
        const receivedCardsDiv = document.createElement('div');
        receivedCardsDiv.className = 'received-cards';
        receivedCardsDiv.textContent = `Erhaltene Karten: ${player.receivedCards.length > 0 ? player.receivedCards.map(c => c.code).join(', ') : 'Keine'}`;
        playerDiv.appendChild(receivedCardsDiv);

        playersDiv.appendChild(playerDiv);
    });
}

function updatePlayerDisplay() {
    players.forEach(player => {
        const playerDiv = document.querySelector(`.player[data-name="${player.name}"]`);
        if (playerDiv) {
            const nameDiv = playerDiv.querySelector('div');
            nameDiv.textContent = `${player.name} (Punkte: ${player.receivedPoints})`;

            // Erhaltene Karten aktualisieren
            const receivedCardsDiv = playerDiv.querySelector('.received-cards');
            receivedCardsDiv.textContent = `Erhaltene Karten: ${player.receivedCards.length > 0 ? player.receivedCards.map(c => c.code).join(', ') : 'Keine'}`;
        }
    });
}

function showPlayerHand(player) {
    let handText = '';
    player.hand.forEach(card => {
        handText += `${card.code} `;
    });

    alert(`Hand von ${player.name}: ${handText}`);
}

function displayPyramid() {
    const pyramidDiv = document.getElementById('pyramid');
    pyramidDiv.innerHTML = '';
    let index = 0;
    let order = 0;

    for (let i = pyramidRows; i >= 1; i--) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        rowDiv.dataset.rowNumber = pyramidRows - i + 1; // Reihenposition von unten nach oben
        for (let j = 0; j < i; j++) {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card face-down';
            cardDiv.dataset.index = index;
            cardDiv.dataset.order = order;
            cardDiv.dataset.rowNumber = pyramidRows - i + 1;
            cardDiv.addEventListener('click', revealCard);

            // Vorder- und Rückseite der Karte
            const frontDiv = document.createElement('div');
            frontDiv.className = 'front';
            frontDiv.textContent = '';
            cardDiv.appendChild(frontDiv);

            const backDiv = document.createElement('div');
            backDiv.className = 'back';
            backDiv.innerHTML = '&#127136;'; // Kartensymbol oder anderes Erkennungszeichen
            cardDiv.appendChild(backDiv);

            rowDiv.appendChild(cardDiv);
            index++;
            order++;
        }
        pyramidDiv.appendChild(rowDiv); // Reihenfolge von unten nach oben
    }
}

async function revealCard(event) {
    const cardDiv = event.currentTarget;
    const index = cardDiv.dataset.index;
    const cardOrder = parseInt(cardDiv.dataset.order);
    const card = pyramid[index];
    const rowNumber = parseInt(cardDiv.dataset.rowNumber); // Reihenposition

    if (!cardDiv.classList.contains('face-down')) return;

    if (cardOrder !== nextCardOrderToReveal) {
        alert('Bitte decken Sie die Karten in der richtigen Reihenfolge auf.');
        return;
    }

    cardDiv.classList.remove('face-down');
    cardDiv.classList.add('flipped');
    cardDiv.querySelector('.front').textContent = card.code;

    // Zur Liste der aufgedeckten Karten hinzufügen
    revealedCards.push(card);

    // Prüfen, welche Spieler eine Karte mit dem gleichen Wert haben (unabhängig von der Farbe)
    let matchingPlayers = players.filter(player => player.hand.some(handCard => handCard.value === card.value));

    if (matchingPlayers.length > 0) {
        let actionText = `Folgende Spieler haben den Wert ${card.value}: `;
        matchingPlayers.forEach(player => {
            actionText += `${player.name} `;
        });
        actionText += `\nDiese Spieler dürfen nacheinander die Karte an eine andere Person geben.`;

        document.getElementById('messageArea').textContent = actionText;

        // Jeder Spieler gibt die Karte an einen anderen Spieler
        for (let player of matchingPlayers) {
            // Karte(n) mit dem gleichen Wert aus der Hand des Spielers entfernen
            let cardsToGive = player.hand.filter(handCard => handCard.value === card.value);
            player.hand = player.hand.filter(handCard => handCard.value !== card.value);

            // Empfänger auswählen
            let recipientName = await selectRecipient(player, card.value);
            let recipientPlayer = players.find(p => p.name === recipientName);

            if (recipientPlayer && recipientPlayer !== player) {
                // Punkte zum Empfänger hinzufügen
                recipientPlayer.receivedPoints += rowNumber * cardsToGive.length;

                // Karten zur Liste der erhaltenen Karten hinzufügen
                recipientPlayer.receivedCards.push(...cardsToGive);

                alert(`${player.name} gibt ${cardsToGive.length} Karte(n) mit dem Wert ${card.value} an ${recipientPlayer.name}. ${recipientPlayer.name} muss ${rowNumber * cardsToGive.length} mal trinken.`);
            } else {
                alert(`${player.name} hat keinen Empfänger ausgewählt. Karte(n) bleiben bei ihm/ihr.`);
                // Karten zurück in die Hand des Spielers
                player.hand.push(...cardsToGive);
            }

            updatePlayerDisplay();
        }
    } else {
        document.getElementById('messageArea').textContent = `Keine Spieler haben eine Karte mit dem Wert ${card.value}.`;
    }

    nextCardOrderToReveal++;
}

function selectRecipient(player, cardValue) {
    return new Promise((resolve) => {
        const modal = document.getElementById('recipientModal');
        const recipientList = document.getElementById('recipientList');
        const closeModal = document.getElementById('closeModal');
        const modalTitle = document.getElementById('modalTitle');

        modalTitle.textContent = `${player.name}, wähle einen Empfänger für deine(n) ${cardValue}`;

        // Modal Inhalt vorbereiten
        recipientList.innerHTML = '';
        players.forEach(p => {
            if (p.name !== player.name) {
                const recipientItem = document.createElement('li');
                recipientItem.textContent = p.name;
                recipientItem.addEventListener('click', () => {
                    modal.style.display = 'none';
                    resolve(p.name);
                });
                recipientList.appendChild(recipientItem);
            }
        });

        // Modal anzeigen
        modal.style.display = 'block';

        // Schließen-Button
        closeModal.onclick = function() {
            modal.style.display = 'none';
            resolve(null);
        };

        // Klick außerhalb des Modals
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
                resolve(null);
            }
        };
    });
}

// Funktion zum Zurückkehren zum Hauptmenü und Neustarten des gesamten Spiels
function restartGame() {
    if (confirm('Möchten Sie das Spiel neu starten? Alle aktuellen Fortschritte gehen verloren.')) {
        // Zurück zum Setup-Bildschirm
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('setup').style.display = 'block';

        // Variablen zurücksetzen
        deck = [];
        players = [];
        pyramid = [];
        revealedCards = [];
        nextCardOrderToReveal = 0;
        totalCards = 0;
        document.getElementById('messageArea').textContent = '';
    }
}

// Funktion zum Beenden der aktuellen Runde und Starten einer neuen Runde
function endRound() {
    if (confirm('Möchten Sie die aktuelle Runde beenden und eine neue Runde starten?')) {
        // Zurücksetzen der relevanten Spielvariablen
        pyramid = [];
        revealedCards = [];
        nextCardOrderToReveal = 0;
        totalCards = 0;
        deck = [];

        // Spieler behalten ihre Namen
        players.forEach(player => {
            player.hand = [];
            player.receivedPoints = 0;
            player.receivedCards = [];
        });

        // Deck neu generieren und Pyramide neu aufbauen
        const deckSize = parseInt(document.getElementById('deckSize').value);
        deck = generateDeck(deckSize);
        buildPyramid(pyramidRows);

        // Karten an Spieler verteilen
        distributeCards();

        // Pyramide und Spieleranzeige aktualisieren
        displayPyramid();
        displayPlayers();

        // Nachricht zurücksetzen
        document.getElementById('messageArea').textContent = '';

        alert('Eine neue Runde wurde gestartet!');
    }
}
