import {
  createLocalGame,
  LOCAL_KEY,
  localTransition,
  pileRange,
  validLocalGame,
} from "./higher-lower-core.js";
import { normalizeName } from "./game-core.js";
import { readSaved, save, removeSaved } from "./session.js";
import { card, cardName, element, rankName } from "./cards.js";
const $ = (id) => document.getElementById(id);
const saved = readSaved(LOCAL_KEY);
let state = validLocalGame(saved?.state) ? saved.state : null;
let names = state ? state.players.map((player) => player.name) : [],
  restartMode = "restart";
function notice(message = "") {
  $("local-notice").textContent = message;
  $("local-notice").hidden = !message;
}
function persist() {
  const stored = save(LOCAL_KEY, { state });
  $("save-status").textContent = stored
    ? "Spielstand auf diesem Gerät gespeichert"
    : "Speichern blockiert · Bitte diesen Tab offen lassen";
}
function act(command) {
  notice();
  try {
    const latest = readSaved(LOCAL_KEY)?.state;
    const current = validLocalGame(latest) ? latest : state;
    const expectedRevision = state.revision;
    state = current;
    state = localTransition(state, { ...command, expectedRevision });
    persist();
  } catch (error) {
    notice(error.message);
  }
  render();
}
function renderSetup() {
  $("local-player-list").replaceChildren();
  names.forEach((name, index) => {
    const li = element("li", "player-row");
    li.append(
      element("span", "avatar", String(index + 1)),
      element("strong", "player-info", name),
    );
    const remove = element("button", "icon-button", "×");
    remove.setAttribute("aria-label", `${name} entfernen`);
    remove.addEventListener("click", () => {
      names.splice(index, 1);
      renderSetup();
    });
    li.append(remove);
    $("local-player-list").append(li);
  });
  $("local-start").disabled = names.length === 0;
}
function render() {
  $("local-setup").hidden = Boolean(state);
  $("local-board").hidden = !state;
  if (!state) {
    renderSetup();
    return;
  }
  const player = state.players[state.currentPlayer],
    guessing = state.phase === "guess";
  $("turn-indicator").textContent =
    state.phase === "finished" ? "Runde beendet." : `${player.name} ist dran.`;
  $("deck-count").textContent = `${state.deck.length} Karten übrig`;
  $("local-instruction").textContent =
    state.phase === "finished"
      ? "Gleiche Gruppe, neue Karten? Startet direkt die nächste Runde."
      : !guessing
        ? "Schaut euch das Ergebnis an, bevor ihr das Gerät weitergebt."
        : state.selectedPile === null
          ? "1. Wähle einen Stapel. 2. Tippe auf höher, tiefer oder gleich."
          : "Höher als die höchste Karte, tiefer als die niedrigste. Gleich trifft einen der beiden Randwerte.";
  $("piles").replaceChildren();
  state.piles.forEach((pile, index) => {
    const { low, high } = pileRange(pile);
    const button = element(
      "button",
      `pile${state.selectedPile === index ? " selected" : ""}`,
    );
    button.disabled = !guessing;
    button.setAttribute("aria-pressed", String(state.selectedPile === index));
    button.setAttribute(
      "aria-label",
      `Stapel ${index + 1}: ${cardName(low)} bis ${cardName(high)}, ${pile.length} Karten`,
    );
    button.append(element("span", "eyebrow", `STAPEL ${index + 1}`));
    const visuals = element("span", "pile-cards");
    visuals.append(card(low));
    if (high !== low) visuals.append(card(high));
    button.append(
      visuals,
      element(
        "strong",
        "pile-range",
        low[0] === high[0]
          ? rankName(low)
          : `${rankName(low)} – ${rankName(high)}`,
      ),
      element(
        "span",
        "small muted",
        `${pile.length} ${pile.length === 1 ? "Karte" : "Karten"}`,
      ),
    );
    button.addEventListener("click", () => act({ type: "select", index }));
    $("piles").append(button);
  });
  $("guess-controls").hidden = !guessing;
  document.querySelectorAll("[data-guess]").forEach((button) => {
    button.disabled = !guessing || state.selectedPile === null;
  });
  $("local-result").hidden = state.phase !== "result";
  $("local-finished").hidden = state.phase !== "finished";
  if (state.phase === "result") {
    const result = state.result;
    $("drawn-card").replaceChildren(card(result.card));
    $("result-message").textContent = result.correct
      ? result.give
        ? "Gleich getroffen!"
        : "Richtig getippt."
      : `${result.sips} ${result.sips === 1 ? "Schluck" : "Schlücke"} für ${player.name}.`;
    $("result-detail").textContent =
      `${cardName(result.card)}. ${result.correct ? (result.give ? "Verteile 10 Schlücke in der Runde." : "Die Karte bleibt auf dem Stapel.") : "Der Stapel wird durch diese Karte ersetzt."}`;
    $("next-player").textContent = state.deck.length
      ? `Weiter zu ${state.players[(state.currentPlayer + 1) % state.players.length].name} →`
      : "Ergebnis anzeigen →";
  }
  $("local-scores").replaceChildren(
    ...state.players.map((p) => {
      const li = element("li", "player-row");
      li.append(
        element("span", "avatar", p.name.slice(0, 1)),
        element("strong", "player-info", p.name),
        element("span", "score-number", String(p.sips)),
      );
      return li;
    }),
  );
}
$("add-player-form").addEventListener("submit", (event) => {
  event.preventDefault();
  notice();
  try {
    const name = normalizeName($("player-input").value);
    if (names.length >= 10)
      throw new Error("Es können höchstens 10 Spieler mitspielen.");
    if (
      names.some(
        (value) =>
          value.toLocaleLowerCase("de") === name.toLocaleLowerCase("de"),
      )
    )
      throw new Error("Dieser Name ist bereits dabei.");
    names.push(name);
    $("player-input").value = "";
    renderSetup();
    $("player-input").focus();
  } catch (error) {
    notice(error.message);
  }
});
$("local-start").addEventListener("click", () => {
  state = createLocalGame(names);
  persist();
  render();
});
document
  .querySelectorAll("[data-guess]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      act({ type: "guess", guess: button.dataset.guess }),
    ),
  );
$("next-player").addEventListener("click", () => act({ type: "next" }));
function restart() {
  names = state.players.map((player) => player.name);
  if (restartMode === "edit") {
    state = null;
    removeSaved(LOCAL_KEY);
  } else {
    state = createLocalGame(names);
    persist();
  }
  notice();
  render();
  $("restart-dialog").close();
}
function requestRestart(mode) {
  restartMode = mode;
  $("confirm-restart").textContent =
    mode === "edit" ? "Spieler ändern" : "Neue Runde";
  if (state.phase === "finished") restart();
  else $("restart-dialog").showModal();
}
$("local-restart").addEventListener("click", () => requestRestart("restart"));
$("edit-players").addEventListener("click", () => requestRestart("edit"));
$("cancel-restart").addEventListener("click", () =>
  $("restart-dialog").close(),
);
$("confirm-restart").addEventListener("click", restart);
window.addEventListener("storage", (event) => {
  if (event.key !== LOCAL_KEY) return;
  const latest = readSaved(LOCAL_KEY)?.state;
  if (validLocalGame(latest)) {
    state = latest;
    render();
  } else if (!latest) {
    state = null;
    render();
  }
});
if (saved?.state && !state)
  notice(
    "Der gespeicherte Spielstand war unvollständig. Bitte starte eine neue Runde.",
  );
render();
