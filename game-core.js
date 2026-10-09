// Pure state transitions. The Firestore adapter commits each transition atomically.
export const SCHEMA_VERSION = 2;
export const MAX_PLAYERS = 10;
export const PRESENCE_TIMEOUT = 120_000;
export const RANKS = "abcdefghijklm";
export const RANK_LABELS = [
  "Ass",
  "König",
  "Dame",
  "Bube",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
];

function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}

export function normalizeName(name) {
  const value = String(name || "")
    .trim()
    .normalize("NFC");
  requireThat(
    value.length >= 1 && value.length <= 24,
    "Dein Name muss 1 bis 24 Zeichen lang sein.",
  );
  requireThat(
    !/[\u0000-\u001f\u007f]/.test(value),
    "Bitte verwende einen Namen ohne Steuerzeichen.",
  );
  return value;
}

export function createDeck(count = 32) {
  requireThat(
    [32, 52].includes(count),
    "Wähle ein Deck mit 32 oder 52 Karten.",
  );
  return [...RANKS.slice(0, count / 4)].flatMap((rank) =>
    [1, 2, 3, 4].map((suit) => rank + suit),
  );
}

export function shuffle(cards, random = Math.random) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function validateSettings(settings, playerCount = 2) {
  const { cardCount, rowCount } = settings;
  requireThat([32, 52].includes(cardCount), "Wähle 32 oder 52 Karten.");
  requireThat(
    Number.isInteger(rowCount) && rowCount >= 3 && rowCount <= 8,
    "Wähle 3 bis 8 Reihen.",
  );
  requireThat(
    cardCount - (rowCount * (rowCount + 1)) / 2 >= playerCount,
    "Zu viele Reihen: Es muss mindestens eine Handkarte pro Person übrig bleiben.",
  );
}

export function createPlayer(nickname, now = Date.now()) {
  return {
    nickname: normalizeName(nickname),
    joinedAt: now,
    lastSeen: now,
    stateVersion: 0,
    hand: [],
    receivedCards: [],
    pendingReceipts: [],
    receiptRevision: 0,
    actionConfirmed: true,
    score: 0,
  };
}

export function createRoom(hostId, nickname, now = Date.now()) {
  return {
    room: {
      schemaVersion: SCHEMA_VERSION,
      revision: 0,
      hostId,
      status: "lobby",
      playerIds: [hostId],
      settings: { cardCount: 32, rowCount: 3 },
      externalDisplayEnabled: false,
      displayLastSeen: 0,
      roundNumber: 0,
      createdAt: now,
      updatedAt: now,
      gameState: null,
    },
    players: { [hostId]: createPlayer(nickname, now) },
  };
}

export function turnKey(room) {
  return `${room.roundNumber}:${room.gameState?.turn || 0}`;
}

export function pendingPlayers(state) {
  const gs = state.room.gameState;
  if (!gs) return [];
  return state.room.playerIds.filter(
    (id) =>
      (gs.requiredGivers.includes(id) && !gs.giversDone.includes(id)) ||
      state.players[id]?.pendingReceipts.length,
  );
}

export function nextPyramidIndex(room) {
  return (
    room.gameState?.pyramid.map((card) => card.isRevealed).lastIndexOf(false) ??
    -1
  );
}

export function isPresent(lastSeen, now = Date.now()) {
  return typeof lastSeen === "number" && now - lastSeen < PRESENCE_TIMEOUT;
}

function addReceipt(player, cards, points, kind, turn) {
  player.score += points;
  player.pendingReceipts.push({ cards: [...cards], points, kind, turn });
  player.receiptRevision++;
  player.actionConfirmed = false;
}

function finishIfComplete(state) {
  if (
    state.room.status === "in-game" &&
    nextPyramidIndex(state.room) === -1 &&
    !state.room.gameState.discardPile.length &&
    !pendingPlayers(state).length
  )
    state.room.status = "finished";
}

// expectedTurn / receiptRevision are captured from the UI, never recomputed on transaction retry.
export function transition(
  input,
  actor,
  command,
  { now = Date.now(), random = Math.random } = {},
) {
  const state = structuredClone(input);
  const { room, players } = state;
  requireThat(
    room.schemaVersion === SCHEMA_VERSION,
    "Dieser Raum stammt aus einer älteren Version. Bitte erstellt einen neuen Raum.",
  );
  requireThat(room.status !== "closed", "Die Lobby wurde geschlossen.");
  const host = actor.role === "player" && actor.id === room.hostId;
  const member = actor.role === "player" && room.playerIds.includes(actor.id);
  const display = actor.role === "display" && room.externalDisplayEnabled;
  requireThat(
    member || display || command.type === "join",
    "Du gehörst nicht zu diesem Raum.",
  );
  const lobbyOnly = () =>
    requireThat(
      room.status === "lobby",
      "Diese Aktion ist nur in der Lobby möglich.",
    );
  const hostOnly = () => requireThat(host, "Das kann nur der Host.");
  const playing = () => {
    requireThat(room.status === "in-game", "Die Runde läuft gerade nicht.");
    requireThat(
      command.expectedTurn === turnKey(room),
      "Der Spielstand hat sich geändert. Bitte versuche es erneut.",
    );
  };

  switch (command.type) {
    case "join": {
      requireThat(
        actor.role === "player",
        "Nur Spieler können der Lobby beitreten.",
      );
      if (room.playerIds.includes(actor.id)) return state;
      lobbyOnly();
      requireThat(room.playerIds.length < MAX_PLAYERS, "Die Lobby ist voll.");
      const name = normalizeName(command.nickname);
      requireThat(
        !room.playerIds.some(
          (id) =>
            players[id].nickname.toLocaleLowerCase("de") ===
            name.toLocaleLowerCase("de"),
        ),
        "Dieser Name ist bereits vergeben. Nutze auf deinem bisherigen Gerät „Runde fortsetzen“.",
      );
      validateSettings(room.settings, room.playerIds.length + 1);
      players[actor.id] = createPlayer(name, now);
      room.playerIds.push(actor.id);
      break;
    }
    case "settings":
      hostOnly();
      lobbyOnly();
      validateSettings(command.settings, Math.max(2, room.playerIds.length));
      room.settings = { ...command.settings };
      room.externalDisplayEnabled = Boolean(command.externalDisplayEnabled);
      break;
    case "start": {
      hostOnly();
      lobbyOnly();
      requireThat(
        room.playerIds.length >= 2,
        "Mindestens zwei Spieler werden benötigt.",
      );
      validateSettings(room.settings, room.playerIds.length);
      requireThat(
        !room.externalDisplayEnabled || isPresent(room.displayLastSeen, now),
        "Verbinde den Bildschirm oder schalte das externe Display aus.",
      );
      const deck = shuffle(createDeck(room.settings.cardCount), random);
      const count = (room.settings.rowCount * (room.settings.rowCount + 1)) / 2;
      const pyramid = deck
        .splice(0, count)
        .map((cardValue) => ({ cardValue, isRevealed: false }));
      const handSize = Math.floor(deck.length / room.playerIds.length);
      for (const id of room.playerIds)
        Object.assign(players[id], {
          hand: deck.splice(0, handSize),
          receivedCards: [],
          pendingReceipts: [],
          receiptRevision: 0,
          actionConfirmed: true,
          score: 0,
        });
      room.roundNumber++;
      room.status = "in-game";
      room.gameState = {
        pyramid,
        discardPile: deck,
        revealedDiscard: [],
        currentTrigger: null,
        currentPoints: 0,
        turn: 0,
        requiredGivers: [],
        giversDone: [],
      };
      break;
    }
    case "reveal": {
      requireThat(
        host || display,
        "Nur der Host oder das Display kann aufdecken.",
      );
      playing();
      requireThat(
        !pendingPlayers(state).length,
        "Es fehlen noch Abgaben oder Bestätigungen.",
      );
      const gs = room.gameState;
      const index = nextPyramidIndex(room);
      let card, points;
      if (index >= 0) {
        requireThat(
          command.source === "pyramid",
          "Deckt zuerst die Pyramide auf.",
        );
        if (command.index !== undefined)
          requireThat(
            command.index === index,
            "Bitte decke die markierte nächste Karte auf.",
          );
        card = gs.pyramid[index].cardValue;
        gs.pyramid[index].isRevealed = true;
        const row = Math.ceil((Math.sqrt(8 * (index + 1) + 1) - 1) / 2);
        points = room.settings.rowCount - row + 1;
      } else {
        requireThat(
          command.source === "discard" && gs.discardPile.length,
          "Es sind keine verdeckten Karten mehr übrig.",
        );
        card = gs.discardPile.shift();
        gs.revealedDiscard.push(card);
        points = 1;
      }
      Object.assign(gs, {
        currentTrigger: card,
        currentPoints: points,
        turn: gs.turn + 1,
        requiredGivers: room.playerIds.filter((id) =>
          players[id].hand.some((c) => c[0] === card[0]),
        ),
        giversDone: [],
      });
      for (const id of room.playerIds) {
        const matches = players[id].receivedCards.filter(
          (c) => c[0] === card[0],
        );
        if (matches.length)
          addReceipt(
            players[id],
            matches,
            matches.length * points,
            "repeat",
            gs.turn,
          );
      }
      finishIfComplete(state);
      break;
    }
    case "give": {
      requireThat(member, "Nur Spieler können Karten verteilen.");
      playing();
      const gs = room.gameState;
      requireThat(
        gs.requiredGivers.includes(actor.id) &&
          !gs.giversDone.includes(actor.id),
        "Du hast gerade keine Karten abzugeben.",
      );
      const playable = players[actor.id].hand.filter(
        (c) => c[0] === gs.currentTrigger[0],
      );
      const assignments = command.assignments;
      requireThat(
        Array.isArray(assignments) &&
          assignments.length === playable.length &&
          new Set(assignments.map((a) => a.card)).size === playable.length &&
          assignments.every((a) => playable.includes(a.card)),
        "Weise alle passenden Handkarten genau einmal zu.",
      );
      for (const assignment of assignments) {
        requireThat(
          assignment.target !== actor.id &&
            room.playerIds.includes(assignment.target),
          "Wähle für jede Karte einen anderen Spieler.",
        );
      }
      for (const target of new Set(assignments.map((a) => a.target))) {
        const cards = assignments
          .filter((a) => a.target === target)
          .map((a) => a.card);
        players[target].receivedCards.push(...cards);
        addReceipt(
          players[target],
          cards,
          cards.length * gs.currentPoints,
          "given",
          gs.turn,
        );
      }
      players[actor.id].hand = players[actor.id].hand.filter(
        (c) => !playable.includes(c),
      );
      gs.giversDone.push(actor.id);
      finishIfComplete(state);
      break;
    }
    case "confirm": {
      requireThat(member, "Nur Spieler können bestätigen.");
      playing();
      const player = players[actor.id];
      requireThat(
        player.pendingReceipts.length > 0,
        "Es gibt gerade nichts zu bestätigen.",
      );
      requireThat(
        command.receiptRevision === player.receiptRevision,
        "Du hast weitere Karten erhalten. Bitte bestätige den aktualisierten Stand.",
      );
      player.pendingReceipts = [];
      player.actionConfirmed = true;
      finishIfComplete(state);
      break;
    }
    case "finish":
      hostOnly();
      playing();
      requireThat(
        nextPyramidIndex(room) === -1 && !pendingPlayers(state).length,
        "Schließt zuerst die Pyramide und alle Aktionen ab.",
      );
      room.status = "finished";
      break;
    case "new-round":
      hostOnly();
      requireThat(
        room.status === "finished",
        "Beendet zuerst die aktuelle Runde.",
      );
      room.status = "lobby";
      room.gameState = null;
      for (const id of room.playerIds)
        Object.assign(players[id], {
          hand: [],
          receivedCards: [],
          pendingReceipts: [],
          score: 0,
          actionConfirmed: true,
          receiptRevision: 0,
        });
      break;
    case "leave":
      requireThat(member, "Du bist kein Spieler dieser Lobby.");
      lobbyOnly();
      room.playerIds = room.playerIds.filter((id) => id !== actor.id);
      delete players[actor.id];
      if (host) room.hostId = room.playerIds[0] || null;
      if (!room.playerIds.length) room.status = "closed";
      break;
    case "claim-host":
      requireThat(
        member && !host,
        "Du kannst den Host gerade nicht übernehmen.",
      );
      requireThat(
        !isPresent(players[room.hostId]?.lastSeen, now),
        "Der Host ist noch verbunden.",
      );
      room.hostId = actor.id;
      break;
    default:
      throw new Error("Unbekannte Spielaktion.");
  }
  room.revision++;
  room.updatedAt = now;
  for (const id of room.playerIds) players[id].stateVersion = room.revision;
  return state;
}
