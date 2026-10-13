import {
  BETS,
  betById,
  color,
  createGame,
  DEFAULTS,
  drawNumber,
  ROULETTE_KEY,
  transition,
  validGame,
} from "./roulette-core.js";
import { readSaved, save, removeSaved } from "./session.js";
import { element } from "./cards.js";
const $ = (id) => document.getElementById(id);
let saved = readSaved(ROULETTE_KEY),
  state = validGame(saved?.state) ? saved.state : null;
let names = state ? state.players.map((p) => p.name) : [],
  scene = null,
  timer = null,
  audioContext = null,
  soundTimer = null;
let busy = false;
const numberFormat = new Intl.NumberFormat("de-DE");
const fmt = (n) => numberFormat.format(n);
function notice(message = "") {
  $("notice").textContent = message;
  $("notice").hidden = !message;
}
function persist() {
  const ok = save(ROULETTE_KEY, { state });
  $("save-status").textContent = ok
    ? "Spielstand auf diesem Gerät gespeichert"
    : "Speichern blockiert · Diesen Tab offen lassen";
}
// Web Locks serialize simultaneous clicks across tabs; revisions reject stale views.
async function act(command) {
  if (busy || !state) return;
  busy = true;
  let succeeded = false;
  const expected = state.revision,
    gameId = state.gameId;
  const execute = () => {
    const latest = readSaved(ROULETTE_KEY)?.state;
    if (!latest) {
      state = null;
      notice("Die Partie wurde in einem anderen Tab beendet.");
      return;
    }
    if (validGame(latest)) state = latest;
    try {
      state = transition(state, { ...command, revision: expected, gameId });
      succeeded = true;
      persist();
      notice();
    } catch (error) {
      notice(error.message);
    }
  };
  try {
    if (navigator.locks) await navigator.locks.request(ROULETTE_KEY, execute);
    else execute();
  } finally {
    busy = false;
    render();
    if (succeeded && command.type === "bet") {
      document
        .querySelectorAll(".just-placed")
        .forEach((field) => field.classList.remove("just-placed"));
      const field = document.querySelector(`[data-bet="${command.id}"]`);
      if (field) {
        void field.offsetWidth;
        field.classList.add("just-placed");
      }
    }
    if (succeeded && command.type === "settle") {
      $("results").classList.remove("result-reveal");
      void $("results").offsetWidth;
      $("results").classList.add("result-reveal");
    }
    if (succeeded && command.type === "spin" && window.innerWidth <= 760) {
      document.querySelector(".wheel-panel").scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  }
}
function button(label, cls, fn) {
  const b = element("button", cls, label);
  b.type = "button";
  b.addEventListener("click", fn);
  return b;
}
function loadSettings(options = DEFAULTS) {
  for (const [key, id] of [
    ["minimum", "minimum"],
    ["lossMultiplier", "loss-multiplier"],
    ["winCap", "win-cap"],
    ["lossCap", "loss-cap"],
    ["duration", "duration"],
  ])
    $(id).value = options[key];
  $("sound").checked = options.sound;
}
function setupPlayers() {
  $("players").replaceChildren(
    ...names.map((name, i) => {
      const li = element("li", "");
      li.append(element("span", "", name));
      const remove = button("×", "", () => {
        names.splice(i, 1);
        setupPlayers();
      });
      remove.setAttribute("aria-label", `${name} entfernen`);
      li.append(remove);
      return li;
    }),
  );
  $("start").disabled = !names.length;
}
function place(id) {
  act({ type: "bet", id, amount: Number($("stake").value) });
}
const playerColor = (index) => `hsl(${(index * 137.508 + 38) % 360} 65% 65%)`;
const initials = (name) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
function makeField(bet) {
  const b = button(
    bet.kind === "column" ? `${bet.label} · 2:1` : bet.label,
    `bet-cell ${bet.kind === "straight" ? color(bet.numbers[0]) : bet.id === "red" ? "red" : bet.id === "black" ? "black" : ""}`,
    () => place(bet.id),
  );
  const label = element("span", "field-label", b.textContent);
  b.replaceChildren(label);
  b.dataset.bet = bet.id;
  b.title = `${bet.label} · ${bet.odds}:1`;
  b.setAttribute("aria-label", `${bet.label}, Gewinn ${bet.odds} zu 1`);
  return b;
}
for (const [kind, id] of [
  ["straight", "numbers"],
  ["column", "columns"],
  ["dozen", "dozens"],
  ["outside", "outside"],
]) {
  $(id).replaceChildren(
    ...BETS.filter((b) => b.kind === kind && b.id !== "n0").map(makeField),
  );
}
$("zero").addEventListener("click", () => place("n0"));
$("zero").setAttribute("aria-label", "0, Gewinn 35 zu 1");
function combinations() {
  $("combination").replaceChildren(
    ...BETS.filter((b) => b.kind === $("combination-type").value).map((b) => {
      const option = element("option", "", b.label);
      option.value = b.id;
      return option;
    }),
  );
}
$("combination-type").addEventListener("change", combinations);
combinations();
$("place-combination").addEventListener("click", () =>
  place($("combination").value),
);
function renderChips() {
  const m = state.settings.minimum;
  $("chip-controls").replaceChildren(
    ...[m, m * 2, m * 5].map((value) => {
      const b = button(String(value), "chip-button", () => {
        $("stake").value = value;
        renderChips();
      });
      b.setAttribute("aria-label", `${value} Schlücke einsetzen`);
      b.setAttribute(
        "aria-pressed",
        String(Number($("stake").value) === value),
      );
      b.disabled = state.phase !== "betting" || state.ready[state.current];
      return b;
    }),
  );
}
$("stake").addEventListener("input", () => {
  if (state) renderChips();
});
function renderBetting() {
  const editable = state.phase === "betting" && !state.ready[state.current];
  const mine = state.bets.filter((b) => b.player === state.current);
  document.querySelectorAll("[data-bet]").forEach((field) => {
    const rule = betById.get(field.dataset.bet);
    const placed = state.bets.filter(
      (bet) =>
        bet.id === rule.id ||
        (rule.kind === "straight" &&
          ["split", "street", "corner", "six"].includes(
            betById.get(bet.id).kind,
          ) &&
          betById.get(bet.id).numbers.includes(rule.numbers[0])),
    );
    field.disabled = !editable;
    field.classList.toggle("has-bet", placed.length > 0);
    field.classList.toggle(
      "winner",
      state.phase === "result" && rule.numbers.includes(state.outcome),
    );
    field.querySelector(".field-chips")?.remove();
    const markers = element("span", "field-chips");
    for (const bet of placed) {
      const player = state.players[bet.player];
      const marker = element(
        "span",
        `field-chip${bet.id !== rule.id ? " combination-chip" : ""}`,
        `${initials(player.name)} ${fmt(bet.amount)}`,
      );
      marker.style.setProperty("--player-color", playerColor(bet.player));
      marker.title = `${player.name}: ${betById.get(bet.id).label} · ${fmt(bet.amount)} Schlücke`;
      marker.setAttribute("aria-label", marker.title);
      markers.append(marker);
    }
    field.append(markers);
  });
  for (const id of [
    "stake",
    "clear",
    "combination-type",
    "combination",
    "place-combination",
  ])
    $(id).disabled = !editable;
  $("stake").min = state.settings.minimum;
  renderChips();
  $("bet-total").textContent =
    `${fmt(mine.reduce((sum, b) => sum + b.amount, 0))} Schlücke gesetzt`;
  $("bet-list").replaceChildren(
    ...mine.map((b) => {
      const rule = betById.get(b.id),
        li = element("li", "");
      li.append(
        element(
          "span",
          "",
          `${rule.label} · ${fmt(b.amount)} → ${fmt(b.amount * rule.odds)} verteilen`,
        ),
      );
      const remove = button("×", "", () => act({ type: "remove", id: b.id }));
      remove.disabled = !editable;
      remove.setAttribute("aria-label", `Einsatz auf ${rule.label} entfernen`);
      li.append(remove);
      return li;
    }),
  );
  $("ready").textContent = state.ready[state.current]
    ? "Einsätze wieder öffnen"
    : mine.length
      ? "Einsätze bestätigen →"
      : "Diese Runde aussetzen →";
  $("spin").disabled =
    state.phase !== "betting" ||
    !state.bets.length ||
    !state.ready.every(Boolean);
}
function renderAllBets() {
  const total = state.bets.reduce((sum, bet) => sum + bet.amount, 0);
  $("table-pool").textContent = `${fmt(total)} Schlücke im Spiel`;
  $("table-bet-count").textContent =
    `${state.bets.length} WETTEN · ALLE SPIELER`;
  $("all-bets-total").textContent = `${fmt(total)} Schlücke gesetzt`;
  $("all-bets").replaceChildren(
    ...state.players.map((player, index) => {
      const group = element("article", "wager-player");
      group.dataset.player = index;
      group.style.setProperty("--player-color", playerColor(index));
      const bets = state.bets.filter((bet) => bet.player === index);
      const heading = element("div", "wager-player-heading");
      heading.append(
        element("strong", "", player.name),
        element(
          "span",
          "",
          `${fmt(bets.reduce((sum, bet) => sum + bet.amount, 0))} Schlücke · ${state.phase === "betting" ? (state.ready[index] ? "bestätigt" : "setzt") : "geschlossen"}`,
        ),
      );
      group.append(heading);
      if (bets.length) {
        const list = element("ul", "wager-list");
        list.append(
          ...bets.map((bet) => {
            const rule = betById.get(bet.id),
              won =
                state.phase === "result" &&
                rule.numbers.includes(state.outcome);
            const entry = element("li", `wager-entry${won ? " won" : ""}`);
            entry.dataset.betId = bet.id;
            entry.dataset.player = index;
            entry.append(
              element("span", "", rule.label),
              element("span", "wager-stake", `${fmt(bet.amount)} Schlücke`),
              element(
                "span",
                "wager-odds",
                won
                  ? `+${fmt(bet.amount * rule.odds)} verteilen`
                  : `${rule.odds}:1`,
              ),
            );
            return entry;
          }),
        );
        group.append(list);
      } else
        group.append(
          element(
            "p",
            "no-wager",
            state.ready[index]
              ? "Setzt diese Runde aus."
              : "Noch kein Einsatz.",
          ),
        );
      return group;
    }),
  );
}
function renderResults() {
  $("result-number").textContent = state.outcome;
  $("result-number").className = `result-number ${color(state.outcome)}`;
  $("result-title").textContent =
    `${state.outcome} · ${{ red: "Rot", black: "Schwarz", green: "Zero" }[color(state.outcome)]}`;
  $("settlements").replaceChildren(
    ...state.players.map((player, index) => {
      const r = state.settlement[index],
        section = element("article", "settlement");
      section.append(element("h3", "", player.name));
      const won = state.bets.filter(
        (b) =>
          b.player === index &&
          betById.get(b.id).numbers.includes(state.outcome),
      );
      if (won.length)
        section.append(
          element(
            "p",
            "payout",
            won
              .map(
                (b) =>
                  `${betById.get(b.id).label}: ${fmt(b.amount)} × ${betById.get(b.id).odds} = ${fmt(b.amount * betById.get(b.id).odds)}`,
              )
              .join(" · "),
          ),
        );
      section.append(
        element(
          "p",
          "",
          `${fmt(r.drink)} Schlücke zugeteilt (${fmt(r.drink - r.acknowledged)} offen) · ${fmt(r.remaining)} noch zu verteilen`,
        ),
      );
      if (r.rawWin > r.give || r.rawLoss > (state.settings.lossCap || Infinity))
        section.append(
          element(
            "p",
            "muted",
            `Eure Grenzen wurden angewandt. Regulärer Gewinn: ${fmt(r.rawWin)}, Verlust: ${fmt(r.rawLoss)}.`,
          ),
        );
      if (r.remaining) {
        const form = element("form", "allocation");
        const recipientLabel = element("label", "", "Empfänger"),
          recipient = element("select", "");
        recipient.setAttribute("aria-label", `Empfänger für ${player.name}`);
        recipient.append(
          ...state.players.map((p, j) => {
            const o = element(
              "option",
              "",
              p.name + (j === index ? " (selbst)" : ""),
            );
            o.value = j;
            return o;
          }),
        );
        recipient.value =
          state.players.length > 1 ? (index + 1) % state.players.length : index;
        recipientLabel.append(recipient);
        const amountLabel = element("label", "", "Schlücke"),
          amount = element("input", "");
        amount.type = "number";
        amount.min = "1";
        amount.max = r.remaining;
        amount.step = "1";
        amount.value = Math.min(state.settings.minimum, r.remaining);
        amount.required = true;
        amount.setAttribute("aria-label", `Menge von ${player.name}`);
        amountLabel.append(amount);
        const give = element("button", "secondary", "Schlücke zuteilen");
        give.type = "submit";
        form.append(recipientLabel, amountLabel, give);
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          act({
            type: "give",
            from: index,
            to: Number(recipient.value),
            amount: Number(amount.value),
          });
        });
        section.append(form);
        section.append(
          button(
            `Restliche ${fmt(r.remaining)} verfallen lassen`,
            "text-button",
            () => act({ type: "waive", player: index }),
          ),
        );
      }
      if (r.drink) {
        const confirm = button(
          r.confirmed
            ? "✓ Bestätigt"
            : `${fmt(r.drink - r.acknowledged)} Schlücke bestätigen`,
          "secondary confirm-drink",
          () => act({ type: "confirm", player: index }),
        );
        confirm.disabled = r.confirmed;
        section.append(confirm);
      }
      return section;
    }),
  );
  $("next").disabled = state.settlement.some(
    (r) => r.remaining || !r.confirmed,
  );
}
function stopSound() {
  clearInterval(soundTimer);
  soundTimer = null;
}
function tickSound() {
  if (
    !audioContext ||
    audioContext.state !== "running" ||
    document.hidden ||
    state?.phase !== "spinning"
  )
    return;
  const progress =
    (Date.now() - state.startedAt) / (state.settings.duration * 1000);
  if (progress >= 1) return;
  const osc = audioContext.createOscillator(),
    gain = audioContext.createGain();
  osc.type = "triangle";
  osc.frequency.value = 700 + progress * 500;
  gain.gain.setValueAtTime(0.018, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + 0.035,
  );
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + 0.04);
}
function render() {
  clearTimeout(timer);
  stopSound();
  $("setup").hidden = !!state;
  $("play").hidden = !state;
  $("score-panel").hidden = !state;
  if (!state) {
    setupPlayers();
    $("wheel-status").textContent = "Euer Tisch wartet";
    $("history").replaceChildren();
    $("table-pool").textContent = "0 Schlücke im Spiel";
    $("wheel-callout").hidden = true;
    $("motion-status").textContent = "Einsätze vorbereiten";
    document.querySelector(".casino-table").dataset.phase = "setup";
    scene?.update(null);
    return;
  }
  const betting = state.phase === "betting",
    spinning = state.phase === "spinning";
  document.querySelector(".casino-table").dataset.phase = state.phase;
  $("betting").hidden = !betting;
  $("bet-editing").hidden = !betting;
  $("wheel-callout").hidden = state.phase !== "result";
  $("wheel-callout-label").textContent = "GEWINNZAHL";
  $("wheel-callout-number").textContent =
    state.phase === "result" ? state.outcome : "";
  $("motion-status").textContent = betting
    ? "Einsätze offen · Alle Wetten auf dem Tisch"
    : spinning
      ? "Kugel in der Laufbahn"
      : `Gewinnzahl ${state.outcome} · Gewinne verteilen`;
  $("spinning").hidden = !spinning;
  $("results").hidden = state.phase !== "result";
  $("round-label").textContent =
    `RUNDE ${state.round} · ${state.players.length} ${state.players.length === 1 ? "PERSON" : "PERSONEN"}`;
  $("turn-label").textContent = betting
    ? `${state.players[state.current].name} setzt.`
    : spinning
      ? "Die Kugel läuft."
      : "Euer Ergebnis.";
  $("instruction").textContent = betting
    ? `Jetonwert wählen, Felder antippen und bestätigen. Mindestens ${state.settings.minimum} Schlücke je Feld.`
    : spinning
      ? "Alle Einsätze sind geschlossen."
      : "Gewinne verteilen, selbst übernehmen oder verfallen lassen. Danach die zugeteilten Schlücke bestätigen.";
  $("edit").disabled = spinning;
  $("player-tabs").hidden = false;
  $("player-tabs").replaceChildren(
    ...state.players.map((p, index) => {
      const b = button(
        `${state.ready[index] ? "✓ " : ""}${p.name}`,
        `player-tab${state.current === index ? " active" : ""}`,
        () => act({ type: "select", player: index }),
      );
      b.setAttribute("aria-pressed", String(index === state.current));
      b.style.setProperty("--player-color", playerColor(index));
      b.disabled = !betting;
      return b;
    }),
  );
  $("wheel-status").textContent = betting
    ? "Faites vos jeux · Einsätze offen"
    : spinning
      ? "Rien ne va plus · Die Kugel läuft"
      : `Ergebnis: ${state.outcome} · ${{ red: "Rot", black: "Schwarz", green: "Zero" }[color(state.outcome)]}`;
  $("history").replaceChildren(
    ...state.history.map((n, i) => {
      const item = element("span", `history-number ${color(n)}`, String(n));
      item.title = i === 0 ? "Letztes Ergebnis" : `${i + 1}. letztes Ergebnis`;
      return item;
    }),
  );
  $("scores").replaceChildren(
    ...state.players.map((p) => {
      const li = element("li", "");
      li.append(
        element("strong", "", p.name),
        element(
          "span",
          "",
          `${fmt(p.drank)} zugeteilt · ${fmt(p.given)} verteilt · ${p.wins} Gewinnrunden`,
        ),
      );
      return li;
    }),
  );
  renderBetting();
  renderAllBets();
  if (state.phase === "result") renderResults();
  if (spinning) {
    const remaining =
      state.startedAt + state.settings.duration * 1000 - Date.now();
    timer = setTimeout(
      () => act({ type: "settle", now: Date.now() }),
      Math.max(20, remaining + 30),
    );
    if (state.settings.sound) soundTimer = setInterval(tickSound, 140);
  }
  const fallback = $("wheel-fallback").querySelector(".fallback-wheel");
  fallback.textContent = spinning ? "•" : (state.outcome ?? "0");
  fallback.classList.toggle("spinning", spinning);
  scene?.update(state);
}
$("add-player-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("player-name").value.trim().replace(/\s+/g, " ");
  if (
    !name ||
    name.length > 24 ||
    names.some(
      (n) => n.toLocaleLowerCase("de") === name.toLocaleLowerCase("de"),
    )
  ) {
    notice("Bitte einen neuen, eindeutigen Namen eingeben.");
    return;
  }
  names.push(name);
  $("player-name").value = "";
  notice();
  setupPlayers();
  $("player-name").focus();
});
$("settings-form").addEventListener("submit", (e) => {
  e.preventDefault();
  try {
    state = createGame(names, {
      minimum: Number($("minimum").value),
      lossMultiplier: Number($("loss-multiplier").value),
      winCap: Number($("win-cap").value),
      lossCap: Number($("loss-cap").value),
      duration: Number($("duration").value),
      sound: $("sound").checked,
    });
    $("stake").value = state.settings.minimum;
    persist();
    notice();
    render();
  } catch (error) {
    notice(error.message);
  }
});
$("clear").addEventListener("click", () => act({ type: "remove" }));
$("ready").addEventListener("click", () => act({ type: "ready" }));
$("spin").addEventListener("click", () => {
  if (state.settings.sound) {
    try {
      audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume().catch(() => {});
    } catch {
      /* Sound is optional. */
    }
  }
  act({ type: "spin", outcome: drawNumber(), now: Date.now() });
});
$("next").addEventListener("click", () => act({ type: "next" }));
$("edit").addEventListener("click", () => $("edit-dialog").showModal());
$("cancel-edit").addEventListener("click", () => $("edit-dialog").close());
$("confirm-edit").addEventListener("click", () => {
  names = state.players.map((p) => p.name);
  loadSettings(state.settings);
  state = null;
  removeSaved(ROULETTE_KEY);
  $("save-status").textContent = "Lokal auf diesem Gerät · Ohne Lobby";
  $("edit-dialog").close();
  notice();
  render();
});
window.addEventListener("storage", (e) => {
  if (e.key !== ROULETTE_KEY) return;
  const latest = readSaved(ROULETTE_KEY)?.state;
  if (validGame(latest)) {
    state = latest;
    render();
  } else if (!latest) {
    state = null;
    $("edit-dialog").close();
    render();
  }
});
window.addEventListener("pageshow", () => {
  if (state) render();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state) render();
  else stopSound();
});
if (saved?.state && !state)
  notice(
    "Der gespeicherte Spielstand ist unvollständig. Bitte eine neue Partie starten.",
  );
if (state) $("stake").value = state.settings.minimum;
render();
function fallback() {
  $("wheel-fallback").hidden = false;
  if (scene) {
    scene.dispose();
    scene = null;
  }
}
import("./roulette-scene.js")
  .then(({ createRouletteScene }) => {
    try {
      scene = createRouletteScene($("wheel-scene"), fallback, (stage) => {
        if (state?.phase === "spinning") $("motion-status").textContent = stage;
      });
      scene.update(state);
    } catch {
      fallback();
    }
  })
  .catch(fallback);
window.addEventListener("pagehide", () => {
  stopSound();
});
