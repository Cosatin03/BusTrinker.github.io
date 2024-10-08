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

    // Überprüfen, ob die Anzahl der Pyramidenreihen zwischen 3 und 7 liegt
    if (pyramidRows < 3 || pyramidRows > 7) {
        alert('Bitte wählen Sie eine Anzahl von Pyramidenreihen zwischen 3 und 7.');
        return;
    }

    const playerNames = document.getElementById('playerNames').value.split(',').map(name => name.trim()).filter(name => name);

    if (playerNames.length < 2) {
        alert('Bitte geben Sie mindestens zwei Spielernamen ein.');
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
    return newDeck.sort(() => Math.random() - 0.3);
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
    let cardsPerPlayer = Math.floor(deck.length / players.length);
    let excessCards = deck.length % players.length;
    if (excessCards > 0) {
        deck.splice(0, excessCards);
    }

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
        rowDiv.dataset.rowNumber = pyramidRows - i + 1;
        for (let j = 0; j < i; j++) {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card face-down';
            cardDiv.dataset.index = index;
            cardDiv.dataset.order = order;
            cardDiv.dataset.rowNumber = pyramidRows - i + 1;
            cardDiv.addEventListener('click', revealCard);

            const frontDiv = document.createElement('div');
            frontDiv.className = 'front';
            frontDiv.textContent = '';
            cardDiv.appendChild(frontDiv);

            const backDiv = document.createElement('div');
            backDiv.className = 'back';
            backDiv.innerHTML = '&#127136;';
            cardDiv.appendChild(backDiv);

            rowDiv.appendChild(cardDiv);
            index++;
            order++;
        }
        pyramidDiv.appendChild(rowDiv);
    }
}

async function revealCard(event) {
    const cardDiv = event.currentTarget;
    const index = cardDiv.dataset.index;
    const cardOrder = parseInt(cardDiv.dataset.order);
    const card = pyramid[index];
    const rowNumber = parseInt(cardDiv.dataset.rowNumber);

    if (!cardDiv.classList.contains('face-down')) return;

    if (cardOrder !== nextCardOrderToReveal) {
        alert('Bitte decken Sie die Karten in der richtigen Reihenfolge auf.');
        return;
    }

    cardDiv.classList.remove('face-down');
    cardDiv.classList.add('flipped');
    cardDiv.querySelector('.front').textContent = card.code;

    revealedCards.push(card);

    let matchingPlayers = players.filter(player => player.hand.some(handCard => handCard.value === card.value));

    if (matchingPlayers.length > 0) {
        let actionText = `Folgende Spieler haben den Wert ${card.value}: `;
        matchingPlayers.forEach(player => {
            actionText += `${player.name} `;
        });
        actionText += `\nDiese Spieler können jede Karte an eine andere Person geben.`;

        document.getElementById('messageArea').textContent = actionText;

        for (let player of matchingPlayers) {
            let cardsToGive = player.hand.filter(handCard => handCard.value === card.value);
            player.hand = player.hand.filter(handCard => handCard.value !== card.value);

            for (let card of cardsToGive) {
                let recipientName = await selectRecipient(player, card.value);
                let recipientPlayer = players.find(p => p.name === recipientName);

                if (recipientPlayer && recipientPlayer !== player) {
                    recipientPlayer.receivedPoints += rowNumber;
                    recipientPlayer.receivedCards.push(card);

                    alert(`${player.name} gibt 1 Karte mit dem Wert ${card.value} an ${recipientPlayer.name}. ${recipientPlayer.name} muss ${rowNumber} mal trinken.`);
                } else {
                    alert(`${player.name} hat keinen Empfänger ausgewählt. Die Karte bleibt bei ihm/ihr.`);
                    player.hand.push(card);
                }
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

        modal.style.display = 'block';

        closeModal.onclick = function() {
            modal.style.display = 'none';
            resolve(null);
        };

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
                resolve(null);
            }
        };
    });
}

function restartGame() {
    if (confirm('Möchten Sie das Spiel neu starten? Alle aktuellen Fortschritte gehen verloren.')) {
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('setup').style.display = 'block';

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
        distributeCards();

        displayPyramid();
        displayPlayers();

        document.getElementById('messageArea').textContent = '';

        alert('Eine neue Runde wurde gestartet!');
    }
}
