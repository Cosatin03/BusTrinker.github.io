import { RANKS, RANK_LABELS } from "./game-core.js";
const symbols = { 1: "♥", 2: "♦", 3: "♠", 4: "♣" };
const suits = { 1: "Herz", 2: "Karo", 3: "Pik", 4: "Kreuz" };
const ranks = [
  "A",
  "K",
  "D",
  "B",
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
export function rankName(value) {
  return RANK_LABELS[RANKS.indexOf(value?.[0])] || "–";
}
export function cardName(value) {
  return `${suits[value?.[1]] || ""} ${rankName(value)}`.trim();
}
export function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
export function card(
  value,
  { hidden = false, interactive = false, small = false } = {},
) {
  const el = element(
    interactive ? "button" : "div",
    `playing-card${hidden ? " card-back" : ""}${small ? " card-small" : ""}`,
  );
  el.setAttribute("aria-label", hidden ? "Verdeckte Karte" : cardName(value));
  if (interactive) el.type = "button";
  if (hidden) {
    el.append(element("span", "back-mark", "B"));
    return el;
  }
  el.dataset.card = value;
  el.classList.toggle("red", ["1", "2"].includes(value?.[1]));
  const corner = element("span", "card-corner");
  corner.append(
    element("b", "", ranks[RANKS.indexOf(value?.[0])] || "?"),
    element("span", "", symbols[value?.[1]] || "?"),
  );
  el.append(corner, element("span", "card-symbol", symbols[value?.[1]] || "?"));
  return el;
}
export function renderCards(
  container,
  cards,
  { empty = "Keine Karten", sort = false } = {},
) {
  container.replaceChildren();
  if (!cards.length) {
    container.append(element("p", "muted empty-copy", empty));
    return;
  }
  for (const value of sort ? [...cards].sort() : cards)
    container.append(card(value));
}
