import { RoomStore } from "./room-store.js";
import {
  isPresent,
  nextPyramidIndex,
  pendingPlayers,
  turnKey,
  validateSettings,
} from "./game-core.js";
import {
  getIdentity,
  loadSession,
  save,
  removeSaved,
  SESSION_KEY,
  IDENTITY_KEY,
  normalizeCode,
} from "./session.js";
import { card, cardName, rankName, element, renderCards } from "./cards.js";

const $ = (id) => document.getElementById(id);
let identity = getIdentity(),
  session = loadSession(),
  store,
  state,
  unsubscribe;
let busy = false,
  connected = false,
  entryMode = "host",
  generation = 0,
  retryTimer,
  retryDelay = 1000;
let assignmentSignature = "",
  backendPromise;
const invitation = new URLSearchParams(location.search);

function show(view) {
  document.querySelectorAll(".view").forEach((el) => {
    el.hidden = el.id !== view;
  });
}
function notice(message = "") {
  $("notice").textContent = message;
  $("notice").hidden = !message;
}
function connection(ready) {
  connected = ready && navigator.onLine;
  $("connection-status").textContent = connected
    ? "Verbunden · Spielstand aktuell"
    : !navigator.onLine
      ? "Offline · Deine Runde bleibt gespeichert"
      : session
        ? "Verbindung wird wiederhergestellt …"
        : "Bereit für eure Runde";
  $("connection-status").classList.toggle(
    "is-offline",
    !connected && Boolean(session),
  );
  $("retry-connection").hidden = connected || !session;
  renderControls();
}
function persistSession(value) {
  session = value;
  if (!save(SESSION_KEY, value))
    notice(
      "Dieser Browser lässt keine Speicherung zu. Halte den Tab geöffnet, damit deine Sitzung erhalten bleibt.",
    );
  renderSaved();
}
function renderSaved() {
  $("saved-session").hidden = !session;
  $("saved-room").textContent = session ? `Raum ${session.roomCode}` : "";
}
function actor() {
  return { id: session.id, role: session.role };
}
function setBusy(value) {
  busy = value;
  $("main").setAttribute("aria-busy", String(value));
  renderControls();
}
async function action(work) {
  if (busy) return;
  notice();
  setBusy(true);
  try {
    await work();
  } catch (error) {
    notice(
      error.message || "Das hat nicht geklappt. Bitte versuche es erneut.",
    );
  } finally {
    setBusy(false);
  }
}
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      reject(
        new Error(
          "Die Verbindung zum Spielserver konnte nicht geladen werden. Bitte erneut verbinden.",
        ),
      );
    };
    document.head.append(script);
  });
}
async function getStore() {
  if (store) return store;
  if (!backendPromise)
    backendPromise = (async () => {
      if (!window.firebase)
        await loadScript(
          "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js",
        );
      if (!window.firebase.firestore)
        await loadScript(
          "https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js",
        );
      if (!window.bustrinkerDb) await loadScript("config.js");
      store = new RoomStore(window.bustrinkerDb);
      return store;
    })().catch((error) => {
      backendPromise = null;
      throw error;
    });
  return backendPromise;
}
function stopListening() {
  generation++;
  unsubscribe?.();
  unsubscribe = null;
  clearTimeout(retryTimer);
}
function handleError(error, version) {
  if (version !== generation) return;
  stopListening();
  connection(false);
  notice(error.message);
  if (error.expired) {
    stopListening();
    state = null;
    session = null;
    removeSaved(SESSION_KEY);
    renderSaved();
    show("entry-view");
    $("takeover-area").hidden = true;
    connection(false);
    return;
  }
  if (
    !["permission-denied", "unauthenticated"].includes(error.code) &&
    navigator.onLine
  ) {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(resume, retryDelay);
    retryDelay = Math.min(15_000, retryDelay * 2);
  }
}
async function resume() {
  if (!session) return;
  stopListening();
  const version = generation,
    saved = { ...session };
  connection(false);
  try {
    await getStore();
    await store.checkSession(saved);
    if (version !== generation) return;
    unsubscribe = store.subscribe(
      saved.roomCode,
      (next) => {
        if (version !== generation) return;
        if (
          next.room.status === "closed" ||
          (saved.role === "player" &&
            !next.room.playerIds.includes(saved.id)) ||
          (saved.role === "display" && !next.room.externalDisplayEnabled)
        ) {
          handleError(
            Object.assign(
              new Error("Diese Lobby ist für dich nicht mehr aktiv."),
              { expired: true },
            ),
            version,
          );
          return;
        }
        state = next;
        render();
      },
      (error) => handleError(error, version),
      (ready) => {
        if (version !== generation) return;
        connection(ready);
        if (ready) {
          retryDelay = 1000;
          clearTimeout(retryTimer);
        }
      },
    );
    void store.heartbeat(saved).catch((error) => handleError(error, version));
  } catch (error) {
    handleError(error, version);
  }
}
function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return [...crypto.getRandomValues(new Uint8Array(6))]
    .map((value) => alphabet[value % alphabet.length])
    .join("");
}
function setEntryMode(mode) {
  entryMode = mode;
  document.querySelectorAll("[data-entry]").forEach((button) => {
    button.classList.toggle("active", button.dataset.entry === mode);
    button.setAttribute("aria-pressed", String(button.dataset.entry === mode));
  });
  $("nickname-field").hidden = mode === "display";
  $("nickname-input").required = mode !== "display";
  $("room-code-field").hidden = mode !== "join";
  $("room-code-input").required = mode === "join";
  $("display-code-field").hidden = mode !== "display";
  $("display-code-input").required = mode === "display";
  $("entry-submit").textContent = {
    host: "Lobby erstellen →",
    join: "Lobby beitreten →",
    display: "Bildschirm verbinden →",
  }[mode];
  $("entry-hint").textContent = {
    host: "Du legst Deck und Pyramide fest. Die anderen kommen per Raum-Code dazu.",
    join: "Nutze zum Wiedereinstieg dasselbe Gerät und denselben Browser.",
    display:
      "Auf diesem Gerät wird das gemeinsame Spielfeld angezeigt. Du erhältst keine Handkarten.",
  }[mode];
}
async function enter() {
  if (!navigator.onLine)
    throw new Error("Zum Beitreten brauchst du eine Internetverbindung.");
  await getStore();
  const nickname = $("nickname-input").value.trim();
  identity = { ...identity, nickname };
  save(IDENTITY_KEY, identity);
  if (entryMode === "host") {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = {
        roomCode: generateRoomCode(),
        id: identity.id,
        role: "player",
      };
      try {
        await store.create(candidate.roomCode, candidate, nickname);
        persistSession(candidate);
        break;
      } catch (error) {
        if (error.message !== "CODE_COLLISION" || attempt === 4) throw error;
      }
    }
  } else if (entryMode === "join") {
    const code = normalizeCode($("room-code-input").value);
    if (!/^[A-Z0-9]{6}$/.test(code))
      throw new Error("Gib den sechsstelligen Raum-Code ein.");
    const candidate = { roomCode: code, id: identity.id, role: "player" };
    // The stable identity may rejoin a running round without resetting cards or scores.
    await store.command(code, candidate, { type: "join", nickname });
    persistSession(candidate);
  } else {
    const code = normalizeCode($("display-code-input").value);
    if (!/^D[A-Z0-9]{6}$/.test(code))
      throw new Error("Gib den Display-Code ein, zum Beispiel D-K7F2WM.");
    const candidate = {
      roomCode: code.slice(1),
      id: identity.id,
      role: "display",
    };
    await store.checkSession(candidate);
    persistSession(candidate);
  }
  history.replaceState(null, "", location.pathname);
  await resume();
}
async function command(type, extra = {}) {
  if (!session || !state || !connected)
    throw new Error("Warte kurz, bis die Verbindung wiederhergestellt ist.");
  await store.command(session.roomCode, actor(), {
    type,
    expectedTurn: turnKey(state.room),
    ...extra,
  });
}
function isHost() {
  return session?.role === "player" && state?.room.hostId === session.id;
}
function canReveal() {
  return isHost() || session?.role === "display";
}
function renderControls() {
  const disabled = busy || !connected;
  document
    .querySelectorAll("[data-game-action], .next-card")
    .forEach((button) => {
      button.disabled = disabled;
    });
  $("entry-submit").disabled = busy;
  $("resume-button").disabled = busy;
  document.querySelectorAll("[data-entry]").forEach((button) => {
    button.disabled = busy;
  });
  if (!state || !session) return;
  const { room } = state,
    waiting = pendingPlayers(state);
  $("start-game-button").disabled =
    disabled ||
    room.playerIds.length < 2 ||
    (room.externalDisplayEnabled && !isPresent(room.displayLastSeen));
  for (const id of [
    "card-count-select",
    "row-count-select",
    "external-display-checkbox",
  ])
    $(id).disabled = disabled;
  $("leave-lobby").disabled = disabled;
  $("reveal-button").disabled =
    disabled || waiting.length > 0 || room.status !== "in-game";
  document.querySelectorAll(".next-card").forEach((button) => {
    button.disabled = $("reveal-button").disabled;
  });
  $("finish-button").disabled =
    disabled || waiting.length > 0 || nextPyramidIndex(room) !== -1;
  $("give-button").disabled =
    disabled ||
    [...$("assignments").querySelectorAll("select")].some(
      (select) => !select.value,
    );
  $("confirm-button").disabled =
    disabled || !state.players[session.id]?.pendingReceipts.length;
  $("takeover-area").hidden = !(
    session.role === "player" &&
    !isHost() &&
    !isPresent(state.players[room.hostId]?.lastSeen)
  );
}
function renderPlayers(target, scores = false) {
  target.replaceChildren();
  const ids = [...state.room.playerIds];
  if (scores)
    ids.sort((a, b) => state.players[b].score - state.players[a].score);
  for (const id of ids) {
    const player = state.players[id],
      li = element("li", "player-row");
    const avatar = element(
      "span",
      "avatar",
      player.nickname.slice(0, 1).toLocaleUpperCase("de"),
    );
    const info = element("div", "player-info");
    info.append(
      element(
        "strong",
        "",
        player.nickname + (id === session.id ? " · Du" : ""),
      ),
    );
    const role = id === state.room.hostId ? "Host" : "Mitspieler";
    let activity = isPresent(player.lastSeen)
      ? role
      : `${role} · gerade nicht aktiv`;
    const gs = state.room.gameState;
    if (gs?.requiredGivers.includes(id) && !gs.giversDone.includes(id))
      activity = "Verteilt Karten";
    else if (player.pendingReceipts.length) activity = "Bestätigung ausstehend";
    info.append(element("span", "small muted", activity));
    const indicator = element(
      "span",
      scores ? "score-number" : "presence-dot",
      scores ? String(player.score) : "",
    );
    if (!scores)
      indicator.classList.toggle("away", !isPresent(player.lastSeen));
    li.append(avatar, info, indicator);
    target.append(li);
  }
}
function renderLobby() {
  const { room } = state;
  $("room-code-display").textContent = session.roomCode;
  $("player-count").textContent = room.playerIds.length;
  renderPlayers($("player-list"));
  $("host-controls").hidden = !isHost();
  $("guest-settings").hidden = isHost();
  $("guest-settings").textContent =
    `${room.settings.cardCount} Karten · ${room.settings.rowCount} Reihen · ${room.externalDisplayEnabled ? "Mit externem Bildschirm" : "Spielfeld auf euren Handys"}`;
  $("card-count-select").value = room.settings.cardCount;
  $("row-count-select").value = room.settings.rowCount;
  $("external-display-checkbox").checked = room.externalDisplayEnabled;
  for (const option of $("row-count-select").options) {
    try {
      validateSettings(
        { ...room.settings, rowCount: Number(option.value) },
        Math.max(2, room.playerIds.length),
      );
      option.disabled = false;
    } catch {
      option.disabled = true;
    }
  }
  const remaining =
    room.settings.cardCount -
    (room.settings.rowCount * (room.settings.rowCount + 1)) / 2;
  $("deal-preview").textContent =
    `${Math.floor(remaining / room.playerIds.length)} Handkarten pro Person · ${remaining % room.playerIds.length} Restkarten bei ${room.playerIds.length} Spielern`;
  $("display-code-area").hidden = !room.externalDisplayEnabled;
  $("display-code-display").textContent = `D-${session.roomCode}`;
  $("display-presence").textContent = isPresent(room.displayLastSeen)
    ? "● Bildschirm verbunden"
    : "○ Warte auf den Bildschirm …";
  $("start-game-button").hidden = !isHost();
  $("lobby-start-hint").textContent = !isHost()
    ? `${state.players[room.hostId].nickname} startet die Runde.`
    : room.playerIds.length < 2
      ? "Es fehlt noch mindestens ein Mitspieler."
      : room.externalDisplayEnabled && !isPresent(room.displayLastSeen)
        ? "Verbinde das Display oder schalte es oben aus."
        : "Alle dabei? Dann kann es losgehen.";
}
function renderPyramid() {
  const { room } = state,
    gs = room.gameState,
    next = nextPyramidIndex(room);
  const area = $("pyramid-area");
  area.replaceChildren();
  area.style.setProperty("--rows", room.settings.rowCount);
  let index = 0;
  for (let row = 1; row <= room.settings.rowCount; row++) {
    const rowEl = element("div", "pyramid-row"),
      points = room.settings.rowCount - row + 1;
    rowEl.append(element("span", "row-points", `${points}`));
    for (let col = 0; col < row; col++, index++) {
      const data = gs.pyramid[index],
        thisIndex = index;
      const interactive =
        canReveal() && thisIndex === next && room.status === "in-game";
      const el = card(data.cardValue, {
        hidden: !data.isRevealed,
        interactive,
      });
      if (interactive) {
        el.classList.add("next-card");
        el.setAttribute(
          "aria-label",
          `Nächste Karte aufdecken, ${points} ${points === 1 ? "Punkt" : "Punkte"}`,
        );
        el.addEventListener("click", () =>
          action(() =>
            command("reveal", { source: "pyramid", index: thisIndex }),
          ),
        );
      }
      if (data.isRevealed && gs.currentTrigger === data.cardValue)
        el.classList.add("current-card");
      rowEl.append(el);
    }
    area.append(rowEl);
  }
  $("pyramid-progress").textContent =
    `${gs.pyramid.filter((c) => c.isRevealed).length} / ${gs.pyramid.length} offen`;
}
function renderPersonal() {
  const { room, players } = state,
    me = players[session.id],
    gs = room.gameState;
  renderCards($("hand-cards"), me.hand, {
    empty: "Alle Handkarten verteilt.",
    sort: true,
  });
  $("hand-count").textContent = me.hand.length;
  $("hand-hint").textContent =
    room.status === "finished"
      ? "Die Runde ist abgeschlossen."
      : "Passende Karten erscheinen automatisch oben zum Verteilen.";
  renderCards($("received-cards"), me.receivedCards, { sort: true });
  $("received-count").textContent = me.receivedCards.length;
  $("received-section").hidden = me.receivedCards.length === 0;
  $("receipt-panel").hidden = !me.pendingReceipts.length;
  const total = me.pendingReceipts.reduce(
    (sum, receipt) => sum + receipt.points,
    0,
  );
  $("receipt-title").textContent =
    `${total} ${total === 1 ? "Punkt" : "Punkte"} für dich`;
  $("receipt-details").replaceChildren(
    ...me.pendingReceipts.map((receipt) =>
      element(
        "p",
        "",
        `${receipt.kind === "repeat" ? "Erneut getroffen" : "Erhalten"}: ${receipt.cards.map(cardName).join(", ")} · ${receipt.points} ${receipt.points === 1 ? "Punkt" : "Punkte"}`,
      ),
    ),
  );
  const mustGive =
    room.status === "in-game" &&
    gs.requiredGivers.includes(session.id) &&
    !gs.giversDone.includes(session.id);
  $("give-panel").hidden = !mustGive;
  const playable = mustGive
    ? me.hand.filter((c) => c[0] === gs.currentTrigger?.[0])
    : [];
  const signature = JSON.stringify([
    turnKey(room),
    playable,
    room.playerIds.map((id) => [id, players[id].nickname]),
  ]);
  if (signature !== assignmentSignature) {
    assignmentSignature = signature;
    $("assignments").replaceChildren();
    for (const value of playable) {
      const row = element("div", "assignment-row");
      row.append(card(value, { small: true }));
      const field = element("div", "assignment-field"),
        label = element("label", "", `${cardName(value)} geht an`);
      const select = element("select");
      select.dataset.card = value;
      select.id = `give-${value}`;
      select.required = true;
      label.htmlFor = select.id;
      const placeholder = element("option", "", "Person auswählen");
      placeholder.value = "";
      select.append(placeholder);
      for (const id of room.playerIds.filter((id) => id !== session.id)) {
        const option = element("option", "", players[id].nickname);
        option.value = id;
        select.append(option);
      }
      select.addEventListener("change", renderControls);
      field.append(label, select);
      row.append(field);
      $("assignments").append(row);
    }
  }
}
function renderGame() {
  const { room, players } = state,
    display = session.role === "display",
    gs = room.gameState;
  $("game-room-label").textContent =
    `${display ? "DISPLAY" : "BUSTRINKER"} · RAUM ${session.roomCode}`;
  $("game-title").textContent =
    room.status === "finished"
      ? "Das war eure Runde."
      : room.status === "lobby"
        ? "Alle an Bord?"
        : "Die Karten liegen.";
  $("round-badge").textContent =
    room.status === "lobby" ? "Lobby" : `Runde ${room.roundNumber}`;
  $("display-wait").hidden = room.status !== "lobby";
  $("display-wait-code").textContent = session.roomCode;
  $("active-game-layout").hidden = !gs;
  $("score-panel").hidden = !gs;
  $("result-panel").hidden = room.status !== "finished";
  $("personal-column").hidden = display;
  $("active-game-layout").classList.toggle("display-layout", display);
  if (!gs) return;
  renderPyramid();
  $("active-trigger").textContent = gs.currentTrigger
    ? rankName(gs.currentTrigger)
    : "Noch keine Karte";
  $("active-points").textContent = gs.currentPoints
    ? `${gs.currentPoints} ${gs.currentPoints === 1 ? "Punkt" : "Punkte"}`
    : "–";
  $("discard-area").hidden =
    !gs.discardPile.length && !gs.revealedDiscard.length;
  $("discard-count").textContent = `· ${gs.discardPile.length} verdeckt`;
  renderCards($("discard-cards"), gs.revealedDiscard, {
    empty: "Die Restkarten kommen nach der Pyramide.",
  });
  const pending = pendingPlayers(state);
  const waitText = pending.length
    ? `Warten auf ${pending.map((id) => players[id].nickname).join(", ")}.`
    : room.status === "finished"
      ? "Runde abgeschlossen."
      : "Alles erledigt. Die nächste Karte kann aufgedeckt werden.";
  $("host-wait-hint").textContent = waitText;
  $("round-status").textContent = waitText;
  $("reveal-controls").hidden = !canReveal() || room.status !== "in-game";
  $("reveal-button").textContent =
    nextPyramidIndex(room) >= 0
      ? "Nächste Pyramidenkarte aufdecken →"
      : "Nächste Restkarte aufdecken →";
  $("finish-button").hidden =
    !isHost() || nextPyramidIndex(room) !== -1 || !gs.discardPile.length;
  if (!display) renderPersonal();
  renderPlayers($("score-list"), true);
  if (room.status === "finished") {
    const highest = Math.max(...room.playerIds.map((id) => players[id].score));
    const drivers = room.playerIds
      .filter((id) => players[id].score === highest)
      .map((id) => players[id].nickname);
    $("result-title").textContent =
      `${drivers.join(" & ")} ${drivers.length === 1 ? "fährt" : "fahren"} den Bus.`;
    $("result-description").textContent =
      `${highest} ${highest === 1 ? "Punkt" : "Punkte"}${drivers.length > 1 ? " · Gleichstand an der Spitze." : " in dieser Runde."}`;
    $("new-round-button").hidden = !isHost();
  }
}
function render() {
  if (!state || !session) return;
  if (state.room.status === "lobby" && session.role === "player") {
    show("lobby-view");
    renderLobby();
  } else {
    show("game-view");
    renderGame();
  }
  renderControls();
}

document
  .querySelectorAll("[data-entry]")
  .forEach((button) =>
    button.addEventListener("click", () => setEntryMode(button.dataset.entry)),
  );
$("entry-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void action(enter);
});
$("resume-button").addEventListener("click", () => {
  notice();
  void action(resume);
});
$("retry-connection").addEventListener("click", () => {
  notice();
  void action(resume);
});
$("start-game-button").addEventListener("click", () =>
  action(() => command("start")),
);
$("reveal-button").addEventListener("click", () =>
  action(() =>
    command("reveal", {
      source: nextPyramidIndex(state.room) >= 0 ? "pyramid" : "discard",
    }),
  ),
);
$("finish-button").addEventListener("click", () =>
  action(() => command("finish")),
);
$("new-round-button").addEventListener("click", () =>
  action(() => command("new-round")),
);
$("claim-host-button").addEventListener("click", () =>
  action(() => command("claim-host")),
);
$("give-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void action(() =>
    command("give", {
      assignments: [...$("assignments").querySelectorAll("select")].map(
        (select) => ({ card: select.dataset.card, target: select.value }),
      ),
    }),
  );
});
$("confirm-button").addEventListener("click", () =>
  action(() =>
    command("confirm", {
      receiptRevision: state.players[session.id].receiptRevision,
    }),
  ),
);
for (const id of [
  "card-count-select",
  "row-count-select",
  "external-display-checkbox",
])
  $(id).addEventListener("change", () =>
    action(async () => {
      try {
        await command("settings", {
          settings: {
            cardCount: Number($("card-count-select").value),
            rowCount: Number($("row-count-select").value),
          },
          externalDisplayEnabled: $("external-display-checkbox").checked,
        });
      } finally {
        render();
      }
    }),
  );
$("leave-lobby").addEventListener("click", () =>
  action(async () => {
    await command("leave");
    stopListening();
    session = null;
    state = null;
    removeSaved(SESSION_KEY);
    assignmentSignature = "";
    renderSaved();
    show("entry-view");
    $("takeover-area").hidden = true;
    connection(false);
  }),
);
$("invite-button").addEventListener("click", () => {
  const url = new URL("bustrinker.html", location.href);
  url.searchParams.set("room", session.roomCode);
  $("invite-url").value = url.href;
  $("copy-status").textContent = "";
  $("invite-dialog").showModal();
});
$("close-invite").addEventListener("click", () => $("invite-dialog").close());
$("copy-invite").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("invite-url").value);
    $("copy-status").textContent = "Link kopiert.";
  } catch {
    $("invite-url").select();
    $("copy-status").textContent = "Kopiere den markierten Link.";
  }
});
$("nickname-input").value = identity.nickname;
renderSaved();
if (invitation.has("room")) {
  setEntryMode("join");
  $("room-code-input").value = normalizeCode(invitation.get("room"));
} else if (invitation.has("display")) {
  setEntryMode("display");
  $("display-code-input").value = invitation.get("display");
}
if (session && !invitation.has("room") && !invitation.has("display"))
  void resume();
else connection(false);
window.addEventListener("offline", () => {
  connection(false);
  render();
});
function wake() {
  if (session && !busy && !document.hidden && navigator.onLine) void resume();
}
window.addEventListener("online", wake);
window.addEventListener("pageshow", (event) => {
  if (event.persisted) wake();
});
document.addEventListener("visibilitychange", wake);
window.addEventListener("storage", (event) => {
  if (
    event.key === SESSION_KEY &&
    session &&
    loadSession()?.roomCode !== session.roomCode
  )
    notice(
      "In einem anderen Tab wurde eine andere Lobby geöffnet. Diese Runde bleibt hier aktiv.",
    );
});
setInterval(() => {
  if (session && store && connected && !document.hidden && !busy) {
    const version = generation;
    void store
      .heartbeat({ ...session })
      .catch((error) => handleError(error, version));
  }
  if (state) render();
}, 30_000);
