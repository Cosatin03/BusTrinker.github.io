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
$("main").setAttribute("aria-busy", "false");
const numberFormat = new Intl.NumberFormat("de-DE");
const fmt = (n) => numberFormat.format(n);
const sipWord = (n) => (n === 1 ? "Schluck" : "Schlücke");
let allocationChoice = { key: null, from: null, to: null, amount: null };
let feedbackTimer;
function roundFeedback(command) {
  let message;
  if (command.type === "give")
    message = `${state.players[command.from].name} → ${state.players[command.to].name} · +${fmt(command.amount)} ${sipWord(command.amount)}`;
  else if (command.type === "confirm")
    message = `${state.players[command.player].name} · Schlücke bestätigt ✓`;
  else return;
  const feedback = $("round-feedback");
  clearTimeout(feedbackTimer);
  feedback.textContent = message;
  feedback.hidden = false;
  feedback.classList.remove("feedback-pop");
  void feedback.offsetWidth;
  feedback.classList.add("feedback-pop");
  if (command.type === "give")
    document
      .querySelector(`[data-receipt-player="${command.to}"]`)
      ?.classList.add("receipt-arrival");
  feedbackTimer = setTimeout(() => {
    feedback.hidden = true;
  }, 2300);
}
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
  $("main").setAttribute("aria-busy", "true");
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
    $("main").setAttribute("aria-busy", "false");
    if (succeeded) roundFeedback(command);
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
      $("results").scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
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
    ["startBalance", "start-balance"],
    ["minimum", "minimum"],
    ["lossMultiplier", "loss-multiplier"],
    ["winCap", "win-cap"],
    ["lossCap", "loss-cap"],
    ["duration", "duration"],
  ])
    $(id).value = options[key] ?? DEFAULTS[key];
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
$("zero").setAttribute("aria-label", "0, Gewinn 10 zu 1");
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
  const editable =
    state.phase === "betting" &&
    !state.ready[state.current] &&
    (state.players[state.current].balance ??
      state.settings.startBalance ??
      100) >= state.settings.minimum;
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
    `${fmt(mine.reduce((sum, b) => sum + b.amount, 0))} gesetzt · ${fmt((state.players[state.current].balance ?? state.settings.startBalance ?? 100) - mine.reduce((sum, b) => sum + b.amount, 0))} verfügbar`;
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
function avatar(index, cls = "round-avatar") {
  const node = element("span", cls, initials(state.players[index].name));
  node.style.setProperty("--player-color", playerColor(index));
  return node;
}
function renderResults() {
  const results = state.settlement,
    key = `${state.gameId}:${state.round}`;
  const open = results
    .map((r, i) => (r.remaining ? i : null))
    .filter((i) => i !== null);
  if (allocationChoice.key !== key)
    allocationChoice = { key, from: null, to: null, amount: null };
  if (!open.includes(allocationChoice.from)) {
    allocationChoice.from = open[0] ?? null;
    allocationChoice.to = null;
    allocationChoice.amount = null;
  }
  $("result-number").textContent = state.outcome;
  $("result-number").className = `result-number ${color(state.outcome)}`;
  $("result-title").textContent =
    `${state.outcome} · ${{ red: "Rot", black: "Schwarz", green: "Zero" }[color(state.outcome)]}`;
  $("round-prize-total").textContent = fmt(
    results.reduce((sum, r) => sum + r.give, 0),
  );
  const sparks = document.querySelector(".prize-sparks");
  if (!sparks.children.length)
    for (let i = 0; i < 16; i++) {
      const spark = element("i", "");
      spark.style.setProperty("--i", i);
      sparks.append(spark);
    }
  sparks.hidden = !results.some((r) => r.give);
  const layout = element("div", "settlement-layout"),
    payout = element("section", "payout-panel"),
    receipts = element("section", "receipt-panel");
  payout.setAttribute("aria-label", "Gewinne verteilen");
  receipts.setAttribute("aria-label", "Erhaltene Schlücke");
  payout.append(element("p", "eyebrow", "VERTEILEN"));
  const selectors = element("div", "winner-selectors");
  results.forEach((r, i) => {
    if (!r.give) return;
    const select = button(
      `${state.players[i].name} · ${r.remaining ? fmt(r.remaining) : "✓"}`,
      `winner-pill${allocationChoice.from === i ? " active" : ""}`,
      () => {
        allocationChoice.from = i;
        allocationChoice.to = null;
        allocationChoice.amount = null;
        renderResults();
      },
    );
    select.prepend(avatar(i, "winner-avatar"));
    select.disabled = !r.remaining;
    select.setAttribute("aria-pressed", String(allocationChoice.from === i));
    selectors.append(select);
  });
  payout.append(selectors);
  if (allocationChoice.from === null) {
    payout.append(
      element(
        "span",
        "payout-done-icon",
        results.some((r) => r.give) ? "✓" : "—",
      ),
      element(
        "h3",
        "",
        results.some((r) => r.give) ? "Alles verteilt." : "Keine Gewinne.",
      ),
      element(
        "p",
        "payout-done-copy",
        results.some((r) => r.give)
          ? "Jetzt die offenen Schlücke bestätigen."
          : "Bestätigt die verlorenen Einsätze.",
      ),
    );
  } else {
    const from = allocationChoice.from,
      r = results[from];
    if (!Number.isInteger(allocationChoice.to))
      allocationChoice.to =
        state.players.length > 1 ? (from + 1) % state.players.length : from;
    allocationChoice.amount = Math.max(
      1,
      Math.min(r.remaining, allocationChoice.amount ?? state.settings.minimum),
    );
    const bank = element("div", "winner-bank"),
      ring = element("div", "prize-ring");
    ring.style.setProperty(
      "--progress",
      `${(1 - r.remaining / r.give) * 360}deg`,
    );
    ring.append(
      element("strong", "prize-count", fmt(r.remaining)),
      element("span", "", "noch offen"),
    );
    const bankCopy = element("div", "bank-copy");
    bankCopy.append(
      avatar(from),
      element("h3", "", `${state.players[from].name} verteilt`),
      element(
        "p",
        "",
        `${fmt(r.give - r.remaining)} von ${fmt(r.give)} verteilt oder freigegeben`,
      ),
    );
    bank.append(ring, bankCopy);
    payout.append(bank);
    if (r.rawWin > r.give)
      payout.append(
        element(
          "p",
          "cap-note",
          `Gewinngrenze: ${fmt(r.give)} statt ${fmt(r.rawWin)} Schlücke.`,
        ),
      );
    payout.append(
      element("p", "recipient-label", "Wem gibst du die Schlücke?"),
    );
    const targets = element("div", "recipient-grid");
    targets.setAttribute("role", "group");
    targets.setAttribute(
      "aria-label",
      `Empfänger für ${state.players[from].name}`,
    );
    state.players.forEach((p, i) => {
      const target = button(
        "",
        `recipient-card${allocationChoice.to === i ? " selected" : ""}`,
        () => {
          allocationChoice.to = i;
          renderResults();
        },
      );
      target.dataset.recipient = i;
      target.setAttribute(
        "aria-label",
        `${p.name}${i === from ? " (selbst)" : ""}`,
      );
      target.setAttribute("aria-pressed", String(allocationChoice.to === i));
      target.append(
        avatar(i),
        element("strong", "", p.name),
        element(
          "small",
          "",
          i === from
            ? "Selbst übernehmen"
            : `${fmt(results[i].drink - results[i].acknowledged)} offen`,
        ),
      );
      targets.append(target);
    });
    payout.append(targets);
    const form = element("form", "allocation allocation-modern"),
      label = element("label", "amount-label", "Wie viele?"),
      counter = element("div", "sip-counter");
    const amount = element("input", "");
    amount.id = "give-amount";
    amount.type = "number";
    amount.min = 1;
    amount.max = r.remaining;
    amount.step = 1;
    amount.value = allocationChoice.amount;
    amount.required = true;
    amount.setAttribute("aria-label", `Menge von ${state.players[from].name}`);
    const send = element("button", "gold-button send-sips");
    send.id = "send-sips";
    send.type = "submit";
    const update = () => {
      allocationChoice.amount = Number(amount.value);
      const n = allocationChoice.amount;
      send.textContent = `${fmt(Number.isFinite(n) ? n : 0)} → ${state.players[allocationChoice.to].name} verteilen`;
      send.disabled = !Number.isSafeInteger(n) || n < 1 || n > r.remaining;
    };
    counter.append(
      button("−", "amount-step", () => {
        amount.value = Math.max(1, Number(amount.value) - 1);
        update();
      }),
      amount,
      button("+", "amount-step", () => {
        amount.value = Math.min(r.remaining, Number(amount.value) + 1);
        update();
      }),
    );
    amount.addEventListener("input", update);
    label.append(counter);
    const presets = element("div", "amount-presets");
    [...new Set([1, state.settings.minimum, 5, r.remaining])]
      .filter((n) => n <= r.remaining)
      .forEach((n) =>
        presets.append(
          button(
            n === r.remaining ? "Alle" : String(n),
            "amount-preset",
            () => {
              amount.value = n;
              update();
            },
          ),
        ),
      );
    form.append(label, presets, send);
    update();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      act({
        type: "give",
        from,
        to: allocationChoice.to,
        amount: Number(amount.value),
      });
    });
    payout.append(form);
    payout.append(
      button(
        `Restliche ${fmt(r.remaining)} verfallen lassen`,
        "text-button waive-button",
        () => act({ type: "waive", player: from }),
      ),
    );
  }
  const pending = results.reduce((sum, r) => sum + r.drink - r.acknowledged, 0);
  const receiptTitle = element("div", "receipt-heading");
  receiptTitle.append(
    element("p", "eyebrow", "ERHALTEN"),
    element("h3", "", `${fmt(pending)} ${sipWord(pending)} offen`),
  );
  receipts.append(receiptTitle);
  state.players.forEach((player, i) => {
    const r = results[i],
      left = r.drink - r.acknowledged,
      card = element(
        "article",
        `receipt-card${left ? " pending" : " cleared"}`,
      );
    card.dataset.receiptPlayer = i;
    const header = element("div", "receipt-card-heading");
    header.append(
      avatar(i),
      element("strong", "", player.name),
      element("span", "receipt-count", left ? fmt(left) : "✓"),
    );
    card.append(header);
    const loss = state.settings.lossCap
      ? Math.min(r.rawLoss, state.settings.lossCap)
      : r.rawLoss;
    const sources = element("ul", "receipt-sources");
    if (loss) {
      const line = element("li", "");
      line.append(
        element("span", "", "Eigener verlorener Einsatz"),
        element("strong", "", String(loss)),
      );
      sources.append(line);
    }
    const grouped = new Map();
    for (const t of state.transfers ?? [])
      if (t.to === i)
        grouped.set(t.from, (grouped.get(t.from) ?? 0) + t.amount);
    for (const [from, n] of grouped) {
      const line = element("li", "");
      line.append(
        element(
          "span",
          "",
          from === i ? "Selbst übernommen" : `Von ${state.players[from].name}`,
        ),
        element("strong", "", fmt(n)),
      );
      sources.append(line);
    }
    const earlier =
      r.drink - loss - [...grouped.values()].reduce((a, b) => a + b, 0);
    if (earlier > 0) {
      const line = element("li", "");
      line.append(
        element("span", "", "Frühere Zuteilungen"),
        element("strong", "", fmt(earlier)),
      );
      sources.append(line);
    }
    if (r.acknowledged)
      card.append(
        element("p", "receipt-ack", `${fmt(r.acknowledged)} bereits bestätigt`),
      );
    card.append(sources);
    if (left) {
      const confirm = button(
        `${fmt(left)} ${sipWord(left)} bestätigen`,
        "confirm-drink",
        () => act({ type: "confirm", player: i }),
      );
      card.append(confirm);
    } else
      card.append(
        element(
          "span",
          "receipt-clear-note",
          r.drink ? "Alles bestätigt" : "Keine Schlücke offen",
        ),
      );
    receipts.append(card);
  });
  layout.append(payout, receipts);
  $("settlements").replaceChildren(layout);
  const remaining = results.reduce((sum, r) => sum + r.remaining, 0),
    confirmations = results.filter((r) => !r.confirmed).length;
  $("next").disabled = !!remaining || !!confirmations;
  $("round-progress").textContent = remaining
    ? `${fmt(remaining)} noch verteilen · ${confirmations} Bestätigungen offen`
    : confirmations
      ? `${confirmations} Bestätigungen offen`
      : "✓ Runde abgeschlossen";
  $("results").classList.toggle(
    "round-is-complete",
    !remaining && !confirmations,
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
  if (
    betting &&
    state.players.every(
      (p) =>
        (p.balance ?? state.settings.startBalance ?? 100) <
        state.settings.minimum,
    )
  )
    $("instruction").textContent =
      "Alle Guthaben liegen unter dem Mindesteinsatz. Beendet die Runde oder startet über Einstellungen eine neue Partie.";
  $("player-tabs").hidden = false;
  $("player-tabs").replaceChildren(
    ...state.players.map((p, index) => {
      const b = button(
        `${state.ready[index] ? "✓ " : ""}${p.name} · ${fmt(p.balance ?? state.settings.startBalance ?? 100)} Schlücke`,
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
          `${fmt(p.balance ?? state.settings.startBalance ?? 100)} Guthaben · ${fmt(p.drank)} zugeteilt · ${fmt(p.given)} verteilt`,
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
      startBalance: Number($("start-balance").value),
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
