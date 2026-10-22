import { games } from "./games.js";
import { loadSession, readSaved } from "./session.js";
import { element, card } from "./cards.js";

const params = new URLSearchParams(location.search);
if (params.has("room") || params.has("display"))
  location.replace(`bustrinker.html${location.search}`);
let filter = "all";
const search = document.querySelector("#game-search");
function render() {
  const query = search.value.trim().toLocaleLowerCase("de");
  const matches = games.filter(
    (game) =>
      (filter === "all" || game.mode === filter) &&
      `${game.title} ${game.description} ${game.tags.join(" ")}`
        .toLocaleLowerCase("de")
        .includes(query),
  );
  const grid = document.querySelector("#game-grid");
  grid.replaceChildren();
  for (const game of matches) {
    const tile = element("article", `game-tile ${game.color}`);
    const art = element("div", `game-art ${game.illustration}`);
    art.setAttribute("aria-hidden", "true");
    if (game.illustration === "ladders") {
      const board = element("div", "catalog-board");
      ["08", "09 ↗", "10", "07", "♟", "11 ↘", "06", "05", "04"].forEach(
        (n) => board.append(element("span", "", n)),
      );
      art.append(board, element("span", "art-stamp", "HOCH HINAUS"));
    } else if (game.illustration === "pyramid") {
      for (const values of [[null], ["a3", null], [null, "c1", null]]) {
        const row = element("div", "art-row");
        values.forEach((value) => row.append(card(value, { hidden: !value })));
        art.append(row);
      }
      art.append(element("span", "art-stamp", "ALLE AN BORD"));
    } else if (game.illustration === "ring-of-fire") {
      const ring = element("div", "catalog-fire-ring");
      for (let i = 0; i < 13; i++) {
        const c = element("span", "", "♧");
        c.style.setProperty("--angle", `${(i * 360) / 13}deg`);
        ring.append(c);
      }
      ring.append(element("b", "", "♛"));
      art.append(ring, element("span", "art-stamp", "HALTET DEN KREIS"));
    } else if (game.illustration === "roulette") {
      art.append(
        element("div", "catalog-wheel", "0"),
        element("span", "catalog-chip", "3"),
        element("span", "art-stamp", "FAITES VOS JEUX"),
      );
    } else
      art.append(
        card("h3"),
        element("span", "art-arrows", "↑↓"),
        card("b1"),
        element("span", "art-stamp", "HÖHER ODER TIEFER?"),
      );
    const body = element("div", "game-tile-body");
    body.append(
      element("p", "eyebrow", game.subtitle),
      element("h3", "", game.title),
      element("p", "game-description", game.description),
    );
    const meta = element("div", "game-meta");
    meta.append(
      element("span", "", game.players),
      element("span", "", game.duration),
    );
    const actions = element("div", "game-tile-actions");
    const play = element("a", "button tile-button", game.cta + "  →");
    play.href = game.href;
    const rules = element("a", "tile-rules", "Regeln");
    rules.href = game.rules;
    rules.setAttribute("aria-label", `Regeln für ${game.title}`);
    actions.append(play, rules);
    body.append(meta, actions);
    tile.append(art, body);
    grid.append(tile);
  }
  document.querySelector("#game-count").textContent =
    `${matches.length} ${matches.length === 1 ? "Spiel" : "Spiele"}`;
  document.querySelector("#no-games").hidden = matches.length > 0;
}
document.querySelectorAll("[data-filter]").forEach((button) =>
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((tab) => {
      tab.classList.toggle("active", tab === button);
      tab.setAttribute("aria-pressed", String(tab === button));
    });
    render();
  }),
);
search.addEventListener("input", render);
render();
const ladders = readSaved("bustrinker.ladders.v1");
const activeLadders =
  ladders?.version === 1 &&
  ["roll", "task"].includes(ladders.phase) &&
  ladders.players?.length;
const session = loadSession(),
  local = readSaved("bustrinker.higher-lower.v1"),
  roulette = readSaved("bustrinker.roulette.v1"),
  ring = readSaved("bustrinker.ring-of-fire.v1");
if (
  activeLadders ||
  session ||
  local?.state ||
  roulette?.state ||
  (ring && ring.phase !== "finished")
) {
  document.querySelector("#resume-area").hidden = false;
  document.querySelector("#resume-label").textContent = activeLadders
    ? "Rutschen & Leitern"
    : session
      ? `BusTrinker · ${session.roomCode}`
      : ring && ring.phase !== "finished"
        ? "Ring of Fire"
        : roulette?.state
          ? "Roulette"
          : "Höher / Tiefer";
  document.querySelector("#resume-description").textContent =
    !activeLadders && session
      ? "Mit deinen Karten und deinem bisherigen Punktestand weiterspielen."
      : "Euer Spielstand ist auf diesem Gerät gespeichert.";
  document.querySelector("#resume-link").href = activeLadders
    ? "ladders.html"
    : session
      ? "bustrinker.html"
      : ring && ring.phase !== "finished"
        ? "ring-of-fire.html"
        : roulette?.state
          ? "roulette.html"
          : "HoeherTiefer.html";
}
