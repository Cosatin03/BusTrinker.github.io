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

function endRound() {
    if (confirm('Möchten Sie die aktuelle Runde beenden und eine neue Runde starten?')) {
        pyramid = [];
        revealedCards = [];
        nextCardOrderToReveal = 0;
        totalCards = 0;
        deck = [];

        players.forEach(player => {
            player.hand = [];
            player.receivedPoints = 0;
            player.receivedCards = [];
        });

        const deckSize = parseInt(document.getElementById('deckSize').value);
        deck = generateDeck(deckSize);
        buildPyramid(pyramidRows);

        distribute
