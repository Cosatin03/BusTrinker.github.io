/***********************
 * Helper: Close Button für Widgets
 ***********************/
function addCloseButtonTo(element, callback) {
    const btn = document.createElement("button");
    btn.innerText = "Schließen";
    btn.className = "close-btn";
    element.appendChild(btn);
    btn.addEventListener("click", () => {
        element.style.display = "none";
        if (callback) callback();
    });
}

/***********************
 * Busfahrer / Zugfahrer Spielcode (bestehende Funktionen)
 ***********************/
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

document.getElementById('boardGameMode').addEventListener('click', () => {
    // Beim Brettspiel-Modus werden die anderen Setups ausgeblendet
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('setup').style.display = 'none';
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('boardGameSetup').style.display = 'block';
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
            nameDiv.textContent = `${player.name} (Schlücke erhalten: ${player.receivedSips})`;

            const receivedCardsDiv = playerDiv.querySelector('.received-cards');
            receivedCardsDiv.textContent = `Erhaltene Karten: ${player.receivedCards.length > 0 ? player.receivedCards.map(c => c.code).join(', ') : 'Keine'}`;
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

async function revealCard(event) {
    const cardDiv = event.currentTarget;
    const index = cardDiv.dataset.index;
    const card = layoutCards[index];
    const rowNumber = parseInt(cardDiv.dataset.rowNumber);

    if (!cardDiv.classList.contains('face-down')) return;

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

    let playersToDrinkAgain = [];
    players.forEach(player => {
        const receivedBefore = player.receivedCards.some(c => c.value === card.value && c.rowNumber !== rowNumber);
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

function showGeneralMessage(message) {
    const modal = document.getElementById('generalMessageModal');
    const contentDiv = document.getElementById('generalMessageContent');
    contentDiv.innerHTML = message;
    addCloseButtonTo(contentDiv, () => {
        modal.style.display = 'none';
    });
    modal.style.display = 'block';
}

async function distributeCardsToPlayers(matchingPlayers, cardValue, sips) {
    const modal = document.getElementById('recipientModal');
    const distributionArea = document.getElementById('distributionArea');
    const distributeCardsButton = document.getElementById('distributeCardsButton');

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

        let recipientIndex = 0;
        for (let card of cardsToGive) {
            let recipientName = recipients[recipientIndex % recipients.length];
            let recipient = players.find(p => p.name === recipientName);

            recipient.receivedSips += sips;
            recipient.receivedCards.push({ ...card, rowNumber: currentRow });
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

/***********************
 * Board Game Mode Code (Brettspiel)
 ***********************/
let bgBoardSize = 20;      // Anzahl der Felder im Brettspiel
let bgColumns = 5;
let bgCellSize = 80;
let bgPlayerPositions = [];
let bgCurrentPlayer = 0;
let bgGameActive = false;
let bgNumPlayers = 0;
let bgPieceElements = [];
const bgPlayerColors = ["red", "blue", "green", "orange"];

const bgFieldActions = [
    "Trinke 1 Schluck.",
    "Bestimme jemanden, der 2 Schluck trinken muss.",
    "Alle trinken einen Schluck.",
    "Minispiel: Höher/Tiefer",
    "Reimrunde: Sag ein Wort, und wer nicht reimen kann, trinkt.",
    "Trinke 2 Schluck, wenn du in dunkler Kleidung bist.",
    "Bestimme einen Trinkpartner: Ihr beide trinkt je 1 Schluck.",
    "Alle Jungs trinken 1 Schluck.",
    "Minispiel: Rennen",
    "Trinke 1 Schluck und wähle einen Mitspieler, der ebenfalls trinkt.",
    "Stille Post: Der Spieler links muss 3 Schluck trinken.",
    "Erzähle dein peinlichstes Erlebnis – sonst trinkst du 1 Schluck.",
    "Minispiel: Höher/Tiefer",
    "Trinke 2 Schluck, wenn du heute früh aufgestanden bist.",
    "Bestimme eine Kategorie: Wer keinen Begriff findet, trinkt.",
    "Alle mit Namen, die mit einem Vokal beginnen, trinken 1 Schluck.",
    "Minispiel: Rennen",
    "Wahrheit oder Pflicht: Beantworte eine peinliche Frage oder trink 2 Schluck.",
    "Jeder, der gerade lächelt, trinkt 1 Schluck.",
    "Trinke 3 Schluck und tausche deinen Platz mit einem Mitspieler."
];

const bgFieldMiniGames = {
    3: "hoherTiefer",
    8: "rennen",
    12: "hoherTiefer",
    16: "rennen"
};

const bgCardRanks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

document.getElementById('startBoardGame').addEventListener('click', bgStartBoardGame);
document.getElementById('bgRollDice').addEventListener('click', bgRollDice);
document.getElementById('bgMainMenu').addEventListener('click', bgReturnToMainMenu);

function bgStartBoardGame() {
    const bgPlayerNames = document.getElementById('bgPlayerNames').value
        .split(',').map(name => name.trim()).filter(name => name);
    if (bgPlayerNames.length < 2) {
        alert('Bitte geben Sie mindestens zwei Spielernamen ein.');
        return;
    }
    bgNumPlayers = bgPlayerNames.length;
    bgPlayerPositions = Array(bgNumPlayers).fill(0);
    bgCurrentPlayer = 0;
    bgGameActive = true;
    // Startmenü ausblenden
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('boardGameSetup').style.display = 'none';
    document.getElementById('boardGameArea').style.display = 'block';
    document.getElementById('bgMessage').textContent = "Spiel gestartet! Spieler 1 ist am Zug.";
    bgCreateBoard();
    bgCreatePieces();
    bgUpdatePieces();
    document.getElementById('bgDice').textContent = "?";
    document.getElementById('bgRollDice').disabled = false;
}

function bgCreateBoard() {
    const bgBoardDiv = document.getElementById('bgBoard');
    bgBoardDiv.innerHTML = '';
    for (let i = 0; i < bgBoardSize; i++) {
        const cell = document.createElement('div');
        cell.className = 'bgCell';
        cell.dataset.index = i;
        const cellNumber = document.createElement('div');
        cellNumber.className = 'bgCellNumber';
        cellNumber.textContent = i;
        cell.appendChild(cellNumber);
        const cellAction = document.createElement('div');
        cellAction.className = 'bgCellAction';
        cellAction.textContent = bgFieldActions[i] || "";
        cell.appendChild(cellAction);
        bgBoardDiv.appendChild(cell);
    }
}

function bgCreatePieces() {
    const bgPiecesContainer = document.getElementById('bgPiecesContainer');
    bgPiecesContainer.innerHTML = '';
    bgPieceElements = [];
    for (let i = 0; i < bgNumPlayers; i++) {
        const piece = document.createElement('div');
        piece.className = 'bgPiece';
        piece.style.backgroundColor = bgPlayerColors[i];
        bgPiecesContainer.appendChild(piece);
        bgPieceElements.push(piece);
    }
}

function bgUpdatePieces() {
    for (let i = 0; i < bgNumPlayers; i++) {
        const pos = bgPlayerPositions[i];
        const coords = bgGetCellCoordinates(pos);
        const offset = getBgPieceOffset(bgNumPlayers, i);
        const left = coords.col * bgCellSize + (bgCellSize / 2) - 10 + offset.x;
        const top = coords.row * bgCellSize + (bgCellSize / 2) - 10 + offset.y;
        bgPieceElements[i].style.left = left + "px";
        bgPieceElements[i].style.top = top + "px";
    }
}

function bgGetCellCoordinates(index) {
    const row = Math.floor(index / bgColumns);
    const col = index % bgColumns;
    return { row, col };
}

function getBgPieceOffset(numPlayers, playerIndex) {
    const offsets = {
        1: [{ x: 0, y: 0 }],
        2: [{ x: -10, y: 0 }, { x: 10, y: 0 }],
        3: [{ x: -10, y: 10 }, { x: 10, y: 10 }, { x: 0, y: -10 }],
        4: [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: -10, y: 10 }, { x: 10, y: 10 }]
    };
    return offsets[numPlayers] ? offsets[numPlayers][playerIndex] : { x: 0, y: 0 };
}

function bgRollDice() {
    if (!bgGameActive) return;
    document.getElementById('bgRollDice').disabled = true;
    const bgDiceEl = document.getElementById('bgDice');
    bgDiceEl.classList.add('bgRolling');
    bgDiceEl.textContent = "";
    setTimeout(() => {
        bgDiceEl.classList.remove('bgRolling');
        const dice = Math.floor(Math.random() * 6) + 1;
        bgDiceEl.textContent = dice;
        document.getElementById('bgMessage').textContent = "Spieler " + (bgCurrentPlayer + 1) + " würfelt: " + dice;
        bgMoveCurrentPlayer(dice);
    }, 500);
}

function bgMoveCurrentPlayer(dice) {
    let newPos = bgPlayerPositions[bgCurrentPlayer] + dice;
    if (newPos >= bgBoardSize - 1) {
        newPos = bgBoardSize - 1;
    }
    bgPlayerPositions[bgCurrentPlayer] = newPos;
    bgUpdatePieces();
    if (newPos === bgBoardSize - 1) {
        document.getElementById('bgMessage').textContent = "Spieler " + (bgCurrentPlayer + 1) + " hat gewonnen!";
        bgGameActive = false;
        document.getElementById('bgRollDice').disabled = true;
        return;
    }
    if (bgFieldMiniGames[newPos]) {
        bgStartMinigame(bgFieldMiniGames[newPos], function() {
            bgCurrentPlayer = (bgCurrentPlayer + 1) % bgNumPlayers;
            document.getElementById('bgMessage').textContent = "Nächster: Spieler " + (bgCurrentPlayer + 1);
            document.getElementById('bgRollDice').disabled = false;
        });
    } else {
        bgShowFieldAction(newPos);
    }
}

function bgShowFieldAction(index) {
    const action = bgFieldActions[index] || "";
    if (action) {
        const bgActionWidget = document.getElementById('bgActionWidget');
        bgActionWidget.innerHTML = action;
        addCloseButtonTo(bgActionWidget, () => {
            bgCurrentPlayer = (bgCurrentPlayer + 1) % bgNumPlayers;
            document.getElementById('bgMessage').textContent = "Nächster: Spieler " + (bgCurrentPlayer + 1);
            document.getElementById('bgRollDice').disabled = false;
        });
        bgActionWidget.style.display = 'block';
    }
}

function bgStartMinigame(type, callback) {
    document.getElementById('bgRollDice').disabled = true;
    if (type === "hoherTiefer") {
        bgStartHoherTiefer(callback);
    } else if (type === "rennen") {
        bgStartRace(callback);
    }
}

function bgStartHoherTiefer(callback) {
    const bgActionWidget = document.getElementById('bgActionWidget');
    bgActionWidget.innerHTML = "";
    bgActionWidget.style.display = "block";
    const title = document.createElement("div");
    title.textContent = "Minispiel: Höher oder Tiefer";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "10px";
    bgActionWidget.appendChild(title);

    let currentCardIndex = Math.floor(Math.random() * bgCardRanks.length);
    const currentCardElement = document.createElement("div");
    currentCardElement.className = "bgCardSprite";
    currentCardElement.textContent = bgCardRanks[currentCardIndex];
    bgActionWidget.appendChild(currentCardElement);

    const buttonContainer = document.createElement("div");
    buttonContainer.style.marginTop = "10px";
    const higherButton = document.createElement("button");
    higherButton.textContent = "Höher";
    const lowerButton = document.createElement("button");
    lowerButton.textContent = "Tiefer";
    buttonContainer.appendChild(higherButton);
    buttonContainer.appendChild(lowerButton);
    bgActionWidget.appendChild(buttonContainer);

    const resultDiv = document.createElement("div");
    resultDiv.style.marginTop = "10px";
    bgActionWidget.appendChild(resultDiv);

    function finish(resultText) {
        resultDiv.textContent = resultText;
        addCloseButtonTo(bgActionWidget, () => {
            callback();
        });
    }

    function handleGuess(guess) {
        let nextCardIndex = Math.floor(Math.random() * bgCardRanks.length);
        const nextCardElement = document.createElement("div");
        nextCardElement.className = "bgCardSprite";
        nextCardElement.textContent = bgCardRanks[nextCardIndex];
        bgActionWidget.appendChild(nextCardElement);

        if ((guess === "höher" && nextCardIndex > currentCardIndex) ||
            (guess === "tiefer" && nextCardIndex < currentCardIndex)) {
            finish("Richtig! Kein Trinken.");
        } else if (nextCardIndex === currentCardIndex) {
            finish("Unentschieden! Keine Aktion.");
        } else {
            finish("Falsch! Trink 2 Schluck.");
        }
    }

    higherButton.addEventListener("click", () => {
        higherButton.disabled = true;
        lowerButton.disabled = true;
        handleGuess("höher");
    });
    lowerButton.addEventListener("click", () => {
        higherButton.disabled = true;
        lowerButton.disabled = true;
        handleGuess("tiefer");
    });
}

function bgStartRace(callback) {
    const bgActionWidget = document.getElementById('bgActionWidget');
    bgActionWidget.innerHTML = "";
    bgActionWidget.style.display = "block";
    const title = document.createElement("div");
    title.textContent = "Minispiel: Rennen";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "10px";
    bgActionWidget.appendChild(title);

    const instruction = document.createElement("div");
    instruction.textContent = "Wähle deinen Teilnehmer:";
    instruction.style.marginBottom = "10px";
    bgActionWidget.appendChild(instruction);

    const raceContainer = document.createElement("div");
    raceContainer.style.position = "relative";
    raceContainer.style.width = "300px";
    raceContainer.style.height = "100px";
    raceContainer.style.border = "1px solid #333";
    raceContainer.style.margin = "0 auto";
    raceContainer.style.overflow = "hidden";
    bgActionWidget.appendChild(raceContainer);

    const numRacers = 3;
    let racers = [];
    for (let i = 0; i < numRacers; i++) {
        let racer = document.createElement("div");
        racer.textContent = "🐌";
        racer.style.position = "absolute";
        racer.style.left = "0px";
        racer.style.top = (i * 30) + "px";
        racer.style.fontSize = "24px";
        racer.style.cursor = "pointer";
        racer.dataset.index = i;
        raceContainer.appendChild(racer);
        racers.push(racer);
    }

    let selectedRacer = null;
    racers.forEach(racer => {
        racer.addEventListener("click", function() {
            racers.forEach(r => r.style.border = "");
            racer.style.border = "2px solid gold";
            selectedRacer = parseInt(racer.dataset.index);
        });
    });

    const startRaceBtn = document.createElement("button");
    startRaceBtn.textContent = "Start Race";
    startRaceBtn.style.marginTop = "10px";
    bgActionWidget.appendChild(startRaceBtn);

    let raceInterval;
    startRaceBtn.addEventListener("click", function() {
        if (selectedRacer === null) {
            alert("Bitte wähle einen Teilnehmer aus!");
            return;
        }
        startRaceBtn.disabled = true;
        raceInterval = setInterval(() => {
            let winner = null;
            racers.forEach((racer, index) => {
                let currentLeft = parseInt(racer.style.left);
                let move = Math.floor(Math.random() * 5) + 1;
                currentLeft += move;
                racer.style.left = currentLeft + "px";
                if (currentLeft >= 280) {
                    winner = index;
                }
            });
            if (winner !== null) {
                clearInterval(raceInterval);
                const resultDiv = document.createElement("div");
                resultDiv.style.marginTop = "10px";
                if (winner === selectedRacer) {
                    resultDiv.textContent = "Gewonnen! Dein Teilnehmer hat gewonnen!";
                } else {
                    resultDiv.textContent = "Verloren! Dein Teilnehmer hat verloren!";
                }
                bgActionWidget.appendChild(resultDiv);
                addCloseButtonTo(bgActionWidget, () => {
                    callback();
                });
            }
        }, 100);
    });
}

function bgReturnToMainMenu() {
    bgGameActive = false;
    document.getElementById('boardGameArea').style.display = 'none';
    document.getElementById('boardGameSetup').style.display = 'none';
    // Startmenü wieder anzeigen
    document.getElementById('startMenu').style.display = 'block';
    document.getElementById('bgRollDice').disabled = false;
}