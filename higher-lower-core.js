import { createDeck, normalizeName, RANKS, shuffle } from "./game-core.js";
export const LOCAL_KEY = "bustrinker.higher-lower.v1";
export function cardValue(card) {
  return 14 - RANKS.indexOf(card[0]);
}
export function pileRange(pile) {
  const ordered = [...pile].sort((a, b) => cardValue(a) - cardValue(b));
  return { low: ordered[0], high: ordered.at(-1) };
}
export function createLocalGame(names, random = Math.random) {
  if (!names.length || names.length > 10)
    throw new Error("Füge 1 bis 10 Spieler hinzu.");
  const normalized = names.map(normalizeName);
  if (
    new Set(normalized.map((name) => name.toLocaleLowerCase("de"))).size !==
    normalized.length
  )
    throw new Error("Jeder Name darf nur einmal vorkommen.");
  const deck = shuffle(createDeck(52), random);
  return {
    version: 1,
    revision: 0,
    players: normalized.map((name) => ({ name, sips: 0 })),
    currentPlayer: 0,
    deck,
    piles: [deck.pop(), deck.pop(), deck.pop(), deck.pop()].map((card) => [
      card,
    ]),
    discarded: [],
    selectedPile: null,
    phase: "guess",
    result: null,
  };
}
export function validLocalGame(state) {
  if (
    !state ||
    state.version !== 1 ||
    !Number.isInteger(state.revision) ||
    !["guess", "result", "finished"].includes(state.phase) ||
    !Array.isArray(state.players) ||
    !state.players.length ||
    state.players.length > 10 ||
    !state.players.every(
      (p) =>
        typeof p.name === "string" &&
        p.name.length > 0 &&
        p.name.length <= 24 &&
        Number.isInteger(p.sips) &&
        p.sips >= 0,
    ) ||
    !Number.isInteger(state.currentPlayer) ||
    state.currentPlayer < 0 ||
    state.currentPlayer >= state.players.length ||
    !Array.isArray(state.deck) ||
    !Array.isArray(state.discarded) ||
    !Array.isArray(state.piles) ||
    state.piles.length !== 4 ||
    !state.piles.every((pile) => Array.isArray(pile) && pile.length > 0) ||
    !(
      state.selectedPile === null ||
      (Number.isInteger(state.selectedPile) &&
        state.selectedPile >= 0 &&
        state.selectedPile < 4)
    )
  )
    return false;
  const cards = [...state.deck, ...state.discarded, ...state.piles.flat()];
  if (
    cards.length !== 52 ||
    new Set(cards).size !== 52 ||
    !cards.every(
      (card) => typeof card === "string" && /^[a-m][1-4]$/.test(card),
    )
  )
    return false;
  if (state.phase === "guess" && !state.deck.length) return false;
  if (
    state.phase === "result" &&
    (!state.result ||
      !/^[a-m][1-4]$/.test(state.result.card) ||
      typeof state.result.correct !== "boolean" ||
      !Number.isInteger(state.result.sips))
  )
    return false;
  return true;
}
export function localTransition(input, command) {
  if (!validLocalGame(input))
    throw new Error(
      "Dieser Spielstand konnte nicht gelesen werden. Starte eine neue Runde.",
    );
  if (command.expectedRevision !== input.revision)
    throw new Error(
      "Die Runde wurde in einem anderen Tab geändert. Der aktuelle Stand wurde geladen.",
    );
  const state = structuredClone(input);
  switch (command.type) {
    case "select":
      if (
        state.phase !== "guess" ||
        !Number.isInteger(command.index) ||
        command.index < 0 ||
        command.index > 3
      )
        throw new Error("Wähle einen der vier Stapel.");
      state.selectedPile = command.index;
      break;
    case "guess": {
      if (
        state.phase !== "guess" ||
        state.selectedPile === null ||
        !state.deck.length
      )
        throw new Error("Wähle zuerst einen Stapel.");
      if (!["higher", "lower", "equal"].includes(command.guess))
        throw new Error("Wähle höher, tiefer oder gleich.");
      const pile = state.piles[state.selectedPile],
        { low, high } = pileRange(pile),
        card = state.deck.pop();
      const value = cardValue(card);
      const correct =
        command.guess === "higher"
          ? value > cardValue(high)
          : command.guess === "lower"
            ? value < cardValue(low)
            : value === cardValue(low) || value === cardValue(high);
      const sips = correct ? 0 : command.guess === "equal" ? 5 : pile.length;
      state.result = {
        card,
        correct,
        sips,
        give: correct && command.guess === "equal" ? 10 : 0,
        guess: command.guess,
      };
      if (correct) pile.push(card);
      else {
        state.discarded.push(...pile);
        state.piles[state.selectedPile] = [card];
        state.players[state.currentPlayer].sips += sips;
      }
      state.phase = "result";
      break;
    }
    case "next":
      if (state.phase !== "result")
        throw new Error("Schließe zuerst deinen Spielzug ab.");
      state.phase = state.deck.length ? "guess" : "finished";
      if (state.deck.length)
        state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
      state.selectedPile = null;
      break;
    default:
      throw new Error("Unbekannte Spielaktion.");
  }
  state.revision++;
  return state;
}
