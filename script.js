let deck = [];
let players = [];
let layoutCards = [];
let revealedCards = [];
let currentRow = 0;
let totalRows = 0;
let cardWidth = 120;
let gameMode = 'Busfahrer'; // Oder 'Zugfahrer'

document.getElementById('busfahrerMode').addEventListener('click', () => {
    gameMode = 'Busfahrer';
    setupGame();
});

document.getElementById('zugfahrerMode').addEventListener('click', () => {
    gameMode = 'Zugfahrer';
    setupGame();
});

function setupGame() {
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('setup').style.display = 'block';

    if (gameMode === 'Busfahrer') {
        document.getElementById('busfahrerRowsContainer').style.display = 'block';
        document.getElementById('zugfahrerRowsContainer').style.display = 'none';
        document.getElementById('gameTitle').textContent = 'Pyramide';
    } else {
        document.getElementById('busfahrerRowsContainer').style.display = 'none';
        document.getElementById('zugfahrerRowsContainer').style.display = 'block';
        document.getElementById('gameTitle').textContent = 'Zugfahrer';
    }
}

document.getElementById('startGame').addEventListener('click', startGame);
document.getElementById('restartGame').addEventListener('click', endRound);
document.getElementById('endRound').addEventListener('click', restartGame);

document.getElementById('openSettings').addEventListener('click', () => {
    document.getElementById('settingsModal').style.display = 'block';
    document.getElementById('cardSizeInGame').value = cardWidth;
});

document.getElementById('openSettingsSetup').addEventListener('click', () => {
    document.getElementById('settingsModal').style.display = 'block';
    document.getElementById('cardSizeInGame').value = cardWidth;
});

document.getElementById('closeSettingsModal').addEventListener('click', () => {
    document.getElementById('settingsModal').style.display = 'none';
});

document.getElementById('cardSizeInGame').addEventListener('input', (e) => {
    cardWidth = parseInt(e.target.value);
    document.documentElement.style.setProperty('--card-width', `${cardWidth}px`);
});

function startGame() {
    const deckSize = parseInt(document.getElementById('deckSize').value);

    if (gameMode === 'Busfahrer') {
        totalRows = parseInt(document.getElementById('pyramidRows').value);
        if (totalRows < 3 || totalRows > 7) {
            alert('Bitte wählen Sie eine Anzahl von Reihen zwischen 3 und 7.');
            return;
        }
    } else {
        totalRows = parseInt(document.getElementById('zugfahrerRows').value);
        if (totalRows < 10 || totalRows > 15) {
            alert('Bitte wählen Sie eine Anzahl von Reihen zwischen 10 und 15.');
            return;
        }
    }

    const playerNames = document.getElementById('playerNames').value
        .split(',').map(name => name.trim()).filter(name => name);

    if (playerNames.length < 2) {
        alert('Bitte geben Sie mindestens zwei Spielernamen ein.');
        return;
    }

    deck = generateDeck(deckSize);
    initializePlayers(playerNames);
    buildLayout();
    distributeCards();

    document.getElementById('setup').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';

    displayPlayers();
    displayLayout();
}

function generateDeck(deckSize) {
    const suits = ['♥', '♦', '♣', '♠'];
    const values = deckSize === 32 ? [7, 8, 9, 10, 'B', 'D', 'K', 'A']
        : [2, 3, 4, 5, 6, 7, 8, 9, 10, 'B', 'D', 'K', 'A'];
    let newDeck = [];

    for (let suit of suits) {
        for (let value of values) {
            newDeck.push({ suit, value, code: `${value}${suit}` });
        }
    }

    return newDeck.sort(() => Math.random() - 0.5);
}

function initializePlayers(playerNames) {
    players = playerNames.map(name => ({
        name,
        hand: [],
        receivedSips: 0,
        receivedCards: [],
        previousReceivedCards: []
    }));
}

function buildLayout() {
    layoutCards = [];
    let totalCards = 0;

    if (gameMode === 'Busfahrer') {
        totalCards = (totalRows * (totalRows + 1)) / 2;
    } else {
        totalCards = totalRows * 2;
    }

    for (let i = 0; i < totalCards; i++) {
        layoutCards.push(deck.pop());
    }

    currentRow = 0;
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
        nameDiv.textContent = `${player.name} (Schlücke erhalten: ${player.receivedSips})`;
        nameDiv.addEventListener('click', () => showPlayerHand(player));
        playerDiv.appendChild(nameDiv);

        const receivedCardsDiv = document.createElement('div');
        receivedCardsDiv.className = 'received-cards';
        receivedCardsDiv.textContent = `Erhaltene Karten: ${
            player.receivedCards.length > 0 ? player.receivedCards.map(c =>
                c.code).join(', ') : 'Keine'}`;
        playerDiv.appendChild(receivedCardsDiv);

        playersDiv.appendChild(playerDiv);
    });
}

function updatePlayerDisplay() {
    players.forEach(player => {
        const playerDiv = document.querySelector(`.player[data-name="${player.name}"]`);
        if (playerDiv) {
            const nameDiv = playerDiv.querySelector('div');
            nameDiv.textContent = `${player.name} (Schlücke erhalten: ${player.receivedSips})`;

            const receivedCardsDiv = playerDiv.querySelector('.received-cards');
            receivedCardsDiv.textContent = `Erhaltene Karten: ${
                player.receivedCards.length > 0 ? player.receivedCards.map(c =>
                    c.code).join(', ') : 'Keine'}`;
        }
    });
}

function showPlayerHand(player) {
    const modal = document.getElementById('handCardsModal');
    const handCardsContainer = document.getElementById('handCardsContainer');
    handCardsContainer.innerHTML = '';

    player.hand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'hand-card';
        cardDiv.textContent = card.code;
        handCardsContainer.appendChild(cardDiv);
    });

    modal.style.display = 'block';

    modal.onclick = () => {
        modal.style.display = 'none';
    };
}

function displayLayout() {
    const layoutDiv = document.getElementById('cardLayout');
    layoutDiv.innerHTML = '';
    let index = 0;

    if (gameMode === 'Busfahrer') {
        for (let i = totalRows; i >= 1; i--) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';
            rowDiv.dataset.rowNumber = totalRows - i;

            for (let j = 0; j < i; j++) {
                const cardDiv = createCardDiv(index, totalRows - i);
                rowDiv.appendChild(cardDiv);
                index++;
            }
            layoutDiv.appendChild(rowDiv);
        }
    } else {
        for (let i = 0; i < totalRows; i++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';
            rowDiv.dataset.rowNumber = i;

            for (let j = 0; j < 2; j++) {
                const cardDiv = createCardDiv(index, i);
                rowDiv.appendChild(cardDiv);
                index++;
            }
            layoutDiv.appendChild(rowDiv);
        }
    }
}

function createCardDiv(index, rowNumber) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card face-down';
    cardDiv.dataset.index = index;
    cardDiv.dataset.rowNumber = rowNumber;
    cardDiv.addEventListener('click', revealCard);

    const frontDiv = document.createElement('div');
    frontDiv.className = 'front';
    frontDiv.textContent = '';
    cardDiv.appendChild(frontDiv);

    const backDiv = document.createElement('div');
    backDiv.className = 'back';
    backDiv.innerHTML = '&#127136;';
    cardDiv.appendChild(backDiv);

    return cardDiv;
}

// Funktion zum Aufdecken der Karten
async function revealCard(event) {
    const cardDiv = event.currentTarget;
    const index = cardDiv.dataset.index;
    const card = layoutCards[index];
    const rowNumber = parseInt(cardDiv.dataset.rowNumber);

    if (!cardDiv.classList.contains('face-down')) return;

    // Prüfen, ob Karten aus der vorherigen Reihe noch verdeckt sind
    const previousRowCards = document.querySelectorAll(`.card[data-row-number="${rowNumber - 1}"]`);
    const anyPreviousRowCardFaceDown = Array.from(previousRowCards).some(c => c.classList.contains('face-down'));

    if (rowNumber > 0 && anyPreviousRowCardFaceDown) {
        alert('Sie müssen zuerst alle Karten der vorherigen Reihe aufdecken.');
        return;
    }

    cardDiv.classList.remove('face-down');
    cardDiv.classList.add('flipped');
    cardDiv.querySelector('.front').textContent = card.code;

    revealedCards.push(card);

    let matchingPlayers = players.filter(player => player.hand.some(
        handCard => handCard.value === card.value));

    if (matchingPlayers.length > 0) {
        document.getElementById('messageArea').textContent = 'Spieler verteilen ihre Karten...';

        await distributeCardsToPlayers(matchingPlayers, card.value, rowNumber + 1);
        updatePlayerDisplay();
    } else {
        document.getElementById('messageArea').textContent = `Keine Spieler haben eine Karte mit dem Wert ${card.value}.`;
    }

    // Spieler müssen erneut trinken, wenn sie die Karte bereits zuvor erhalten haben (nicht gerade eben)
    let playersToDrinkAgain = [];
    players.forEach(player => {
        // Prüfen, ob der Spieler die Karte bereits vorher erhalten hat
        const receivedBefore = player.receivedCards.some(c => c.value === card.value && c.rowNumber !== rowNumber);
        // Prüfen, ob der Spieler die Karte nicht gerade eben erhalten hat
        const justReceived = player.lastReceivedCards && player.lastReceivedCards.some(c => c.value === card.value && c.rowNumber === rowNumber);

        if (receivedBefore && !justReceived) {
            player.receivedSips += (rowNumber + 1);
            playersToDrinkAgain.push(`${player.name} trinkt ${rowNumber + 1} Schlücke erneut, da er/sie bereits die Karte ${card.value} erhalten hat.`);
        }
    });

    if (playersToDrinkAgain.length > 0) {
        showGeneralMessage(playersToDrinkAgain.join('<br>'));
    }
}

// Funktion zum Anzeigen allgemeiner Nachrichten
function showGeneralMessage(message) {
    const modal = document.getElementById('generalMessageModal');
    const contentDiv = document.getElementById('generalMessageContent');
    contentDiv.innerHTML = message;
    modal.style.display = 'block';

    modal.onclick = () => {
        modal.style.display = 'none';
    };
}

// Funktion zum Verteilen der Karten an die Spieler
async function distributeCardsToPlayers(matchingPlayers, cardValue, sips) {
    const modal = document.getElementById('recipientModal');
    const distributionArea = document.getElementById('distributionArea');
    const distributeCardsButton = document.getElementById('distributeCardsButton');
    const modalTitle = document.getElementById('modalTitle');

    distributionArea.innerHTML = '';

    for (let player of matchingPlayers) {
        let cardsToGive = player.hand.filter(handCard => handCard.value === cardValue);
        player.hand = player.hand.filter(handCard => handCard.value !== cardValue);

        const distItem = document.createElement('div');
        distItem.className = 'distribution-item';

        const label = document.createElement('label');
        label.textContent = `${player.name}, du hast ${cardsToGive.length} Karte(n) mit dem Wert ${cardValue}. Wähle Empfänger aus:`;
        distItem.appendChild(label);

        const recipientButtonsDiv = document.createElement('div');
        recipientButtonsDiv.className = 'recipient-buttons';

        // Wenn nur zwei Spieler, automatisch den anderen auswählen
        if (players.length === 2) {
            players.forEach(p => {
                if (p.name !== player.name) {
                    const button = document.createElement('button');
                    button.className = 'recipient-button selected';
                    button.textContent = p.name;
                    button.dataset.playerName = p.name;
                    recipientButtonsDiv.appendChild(button);
                }
            });
        } else {
            players.forEach(p => {
                if (p.name !== player.name) {
                    const button = document.createElement('button');
                    button.className = 'recipient-button';
                    button.textContent = p.name;
                    button.dataset.playerName = p.name;
                    button.addEventListener('click', () => {
                        button.classList.toggle('selected');
                    });
                    recipientButtonsDiv.appendChild(button);
                }
            });
        }

        distItem.appendChild(recipientButtonsDiv);

        distItem.dataset.playerName = player.name;
        distItem.dataset.cardValue = cardValue;
        distItem.dataset.cardsToGive = JSON.stringify(cardsToGive);

        distributionArea.appendChild(distItem);
    }

    modal.style.display = 'block';

    await new Promise(resolve => {
        distributeCardsButton.onclick = () => {
            modal.style.display = 'none';
            resolve();
        };
    });

    // Karten verteilen
    let distItems = distributionArea.getElementsByClassName('distribution-item');
    let messages = [];
    for (let item of distItems) {
        let playerName = item.dataset.playerName;
        let cardValue = item.dataset.cardValue;
        let cardsToGive = JSON.parse(item.dataset.cardsToGive);
        let selectedButtons = item.querySelectorAll('.recipient-button.selected');

        if (selectedButtons.length === 0) {
            alert(`${playerName}, du musst mindestens einen Empfänger auswählen.`);
            return;
        }

        let recipients = Array.from(selectedButtons).map(button => button.dataset.playerName);
        let player = players.find(p => p.name === playerName);

        // Karten gleichmäßig verteilen
        let recipientIndex = 0;
        for (let card of cardsToGive) {
            let recipientName = recipients[recipientIndex % recipients.length];
            let recipient = players.find(p => p.name === recipientName);

            recipient.receivedSips += sips;
            recipient.receivedCards.push({ ...card, rowNumber: currentRow });
            // Speichern, dass die Karte gerade eben erhalten wurde
            if (!recipient.lastReceivedCards) {
                recipient.lastReceivedCards = [];
            }
            recipient.lastReceivedCards.push({ ...card, rowNumber: currentRow });

            messages.push(`${player.name} gibt die Karte ${card.code} an ${recipient.name}. ${recipient.name} muss ${sips} Schlücke trinken.`);

            recipientIndex++;
        }
    }

    if (messages.length > 0) {
        showGeneralMessage(messages.join('<br>'));
    }

    // Nachdem die Karten verteilt wurden, leeren wir lastReceivedCards nach dem aktuellen Durchgang
    players.forEach(player => {
        if (player.lastReceivedCards) {
            player.lastReceivedCards = [];
        }
    });
}

function restartGame() {
    if (confirm('Möchten Sie das Spiel neu starten? Alle aktuellen Fortschritte gehen verloren.')) {
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('startMenu').style.display = 'block';

        deck = [];
        players = [];
        layoutCards = [];
        revealedCards = [];
        currentRow = 0;
        document.getElementById('messageArea').textContent = '';
    }
}

function endRound() {
    if (confirm('Möchten Sie die aktuelle Runde beenden und eine neue Runde starten?')) {
        layoutCards = [];
        revealedCards = [];
        currentRow = 0;
        deck = [];

        players.forEach(player => {
            player.hand = [];
            player.receivedSips = 0;
            player.receivedCards = [];
            player.previousReceivedCards = [];
            player.lastReceivedCards = [];
        });

        const deckSize = parseInt(document.getElementById('deckSize').value);
        deck = generateDeck(deckSize);
        buildLayout();
        distributeCards();

        displayLayout();
        displayPlayers();

        document.getElementById('messageArea').textContent = '';

        alert('Eine neue Runde wurde gestartet!');
    }
}
