import {
  KEY,
  CATEGORIES,
  DEFAULTS,
  TASKS,
  settings,
  createGame,
  transition,
  rollDie,
  validGame,
} from "./ladders-core.js";
import { readSaved, save } from "./session.js";
import { element } from "./cards.js";
const $ = (id) => document.getElementById(id);
const colors = [
  "#dafa7a",
  "#ecc2a8",
  "#a8c9ec",
  "#dcacd7",
  "#f5b75a",
  "#7edac5",
  "#f58f9c",
  "#c6b2ff",
];
let state = readSaved(KEY),
  scene = null,
  sceneModule = null,
  sceneFailed = false,
  loadingScene = false,
  busy = false,
  editing = false,
  overrides = {},
  pending = null;
if (!validGame(state)) state = null;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function notice(text = "") {
  $("notice").textContent = text;
  $("notice").hidden = !text;
}
function button(text, action) {
  const b = element("button", "", text);
  b.type = "button";
  b.addEventListener("click", action);
  return b;
}
function persist() {
  $("save-status").textContent = save(KEY, state)
    ? "Spielstand auf diesem Gerät gespeichert."
    : "Speichern ist blockiert. Lasst diesen Tab für die laufende Partie offen.";
}
for (const [id, c] of Object.entries(CATEGORIES)) {
  const wrap = element("div", "category-editor"),
    label = element("label", "check-label"),
    check = element("input");
  check.type = "checkbox";
  check.id = `cat-${id}`;
  check.checked = true;
  label.append(
    check,
    document.createTextNode(
      `${c.icon} ${c.label} · ${TASKS.filter((t) => t.category === id).length} Aufgaben`,
    ),
  );
  const custom = element("textarea");
  custom.id = `pool-${id}`;
  custom.rows = 3;
  custom.maxLength = 20000;
  custom.placeholder = "Optional: eigene Aufgaben, eine pro Zeile";
  custom.setAttribute("aria-label", `Eigener Aufgabenpool: ${c.label}`);
  wrap.append(label, custom);
  $("category-settings").append(wrap);
}
$("task-count").textContent = ` · ${TASKS.length} Vorlagen`;
function loadSettings(s = DEFAULTS, names = []) {
  for (const id of ["size", "ladders", "slides", "finish", "sips", "speed"])
    $(id).value = s[id];
  $("extra-six").checked = s.extraSix;
  $("names").value = names.join("\n");
  for (const c of Object.keys(CATEGORIES)) {
    $(`cat-${c}`).checked = s.categories.includes(c);
    $(`pool-${c}`).value = s.custom[c] || "";
  }
  overrides = { ...s.fields };
  renderOverrides();
}
function renderOverrides() {
  $("assigned-fields").replaceChildren(
    ...Object.entries(overrides)
      .sort((a, b) => a[0] - b[0])
      .map(([n, text]) => {
        const li = element("li");
        const remove = button("×", () => {
          delete overrides[n];
          renderOverrides();
        });
        remove.setAttribute("aria-label", `Aufgabe auf Feld ${n} entfernen`);
        li.append(element("span", "", `${n} · ${text}`), remove);
        return li;
      }),
  );
}
$("assign-field").addEventListener("click", () => {
  const n = Number($("custom-field").value),
    text = $("custom-task").value.trim();
  if (!Number.isInteger(n) || n < 1 || n > Number($("size").value) || !text) {
    notice("Feld innerhalb des Spielbretts wählen und eine Aufgabe eingeben.");
    return;
  }
  overrides[n] = text;
  $("custom-task").value = "";
  renderOverrides();
  notice();
});
function inputSettings() {
  return settings({
    size: Number($("size").value),
    ladders: Number($("ladders").value),
    slides: Number($("slides").value),
    finish: $("finish").value,
    sips: Number($("sips").value),
    speed: Number($("speed").value),
    extraSix: $("extra-six").checked,
    categories: Object.keys(CATEGORIES).filter((c) => $(`cat-${c}`).checked),
    custom: Object.fromEntries(
      Object.keys(CATEGORIES).map((c) => [c, $(`pool-${c}`).value]),
    ),
    fields: overrides,
  });
}
async function lock(fn) {
  if (navigator.locks) return navigator.locks.request(KEY, fn);
  return fn();
}
async function start(candidate) {
  if (busy) return;
  busy = true;
  try {
    await lock(() => {
      state = candidate;
      editing = false;
      scene?.dispose();
      scene = null;
      sceneFailed = false;
      persist();
    });
    notice();
    render();
    $("game").scrollIntoView({
      block: "start",
      behavior: reduced() ? "instant" : "smooth",
    });
  } finally {
    busy = false;
    render();
  }
}
$("setup-form").addEventListener("submit", (e) => {
  e.preventDefault();
  try {
    const candidate = createGame(
      $("names")
        .value.split("\n")
        .map((n) => n.trim())
        .filter(Boolean),
      inputSettings(),
    );
    if (state && state.phase !== "won") {
      pending = candidate;
      $("restart-dialog").showModal();
    } else start(candidate);
  } catch (error) {
    notice(error.message);
    $("notice").scrollIntoView({ block: "center" });
  }
});
$("replace-game").addEventListener("click", () => {
  $("restart-dialog").close();
  if (pending) start(pending);
  pending = null;
});
$("keep-game").addEventListener("click", () => {
  $("restart-dialog").close();
  pending = null;
});
function edit() {
  if (busy) return;
  loadSettings(
    state.settings,
    state.players.map((p) => p.name),
  );
  editing = true;
  render();
  $("setup").scrollIntoView({ behavior: reduced() ? "instant" : "smooth" });
}
$("edit").addEventListener("click", edit);
$("again").addEventListener("click", edit);
$("cancel-setup").addEventListener("click", () => {
  editing = false;
  render();
});
async function act(type) {
  if (busy || !state) return;
  busy = true;
  const expected = state.revision,
    id = state.id;
  let changed = false;
  try {
    await lock(() => {
      const latest = readSaved(KEY);
      if (validGame(latest)) state = latest;
      state = transition(state, {
        type,
        die: type === "roll" ? rollDie() : undefined,
        revision: expected,
        id,
      });
      persist();
      changed = true;
    });
    notice();
    render(false);
    if (changed && type === "roll") {
      $("dice").classList.add("rolling");
      $("task-card").hidden = true;
      $("task-actions").hidden = true;
      $("move-label").textContent = "Der Würfel fällt …";
      const motion = scene?.animate(state.move, state, reduced());
      if (motion) await motion;
      else if (!reduced())
        await new Promise((resolve) => setTimeout(resolve, 650));
    }
  } catch (error) {
    notice(error.message);
  } finally {
    busy = false;
    $("dice").classList.remove("rolling");
    render();
  }
}
$("roll").addEventListener("click", () => act("roll"));
$("done").addEventListener("click", () => act("done"));
$("skip").addEventListener("click", () => act("skip"));
function fieldDescription(n) {
  const c = CATEGORIES[state.fields[n - 1]],
    link = state.links.find((l) => l.from === n);
  return `Feld ${n}${n === state.settings.size ? " · Ziel" : ""} · ${state.settings.fields[n] ? "Eigene Aufgabe: " + state.settings.fields[n] : c.label}${link ? ` · ${link.type === "ladder" ? "Leiter" : "Rutsche"} zu Feld ${link.to}` : ""}`;
}
function selectField(n) {
  $("field-info").hidden = false;
  $("field-info").textContent = fieldDescription(n);
}
function fallback() {
  sceneFailed = true;
  scene?.dispose();
  scene = null;
  $("scene-host").hidden = true;
  $("fallback").hidden = false;
  renderFlat();
}
function renderFlat() {
  if (!state) return;
  $("flat-board").replaceChildren(
    ...state.fields.map((c, i) => {
      const n = i + 1,
        players = state.players
          .map((p, j) => (p.position === n ? j + 1 : null))
          .filter(Boolean),
        link = state.links.find((l) => l.from === n);
      const b = button(
        `${n}${link ? ` ${link.type === "ladder" ? "↑" : "↓"}${link.to}` : ""}${players.length ? ` · ♟${players.join(",")}` : ""}`,
        () => selectField(n),
      );
      b.style.setProperty("--tile-color", CATEGORIES[c].color);
      b.classList.toggle("occupied", !!players.length);
      b.setAttribute(
        "aria-label",
        fieldDescription(n) +
          (players.length ? ` · Figuren ${players.join(", ")}` : ""),
      );
      return b;
    }),
  );
}
async function ensureScene() {
  if (loadingScene || sceneFailed || !state || editing) return;
  if (scene?.id === state.id) return;
  loadingScene = true;
  const id = state.id;
  try {
    sceneModule ||= await import("./ladders-scene.js");
    if (!state || state.id !== id || editing) return;
    scene?.dispose();
    scene = sceneModule.createBoard(
      $("scene-host"),
      state,
      selectField,
      fallback,
    );
  } catch {
    fallback();
  } finally {
    loadingScene = false;
    if (state && state.id !== id) ensureScene();
  }
}
function render(syncScene = true) {
  $("setup").hidden = !!state && !editing;
  $("game").hidden = !state || editing;
  $("cancel-setup").hidden = !state;
  if (!state || editing) return;
  const p = state.players[state.current],
    won = state.phase === "won",
    task = state.phase === "task",
    move = state.move;
  $("turn-number").textContent =
    `ZUG ${state.turn} · ${state.players.length} ${state.players.length === 1 ? "PERSON" : "PERSONEN"}`;
  $("board-size").textContent =
    `${state.settings.size} FELDER · ${state.links.length} VERBINDUNGEN`;
  $("phase-label").textContent = won
    ? "ZIEL ERREICHT"
    : task
      ? "DEINE AUFGABE"
      : "DU BIST DRAN";
  $("current-name").textContent = won ? `${p.name} gewinnt!` : p.name;
  $("position-label").textContent = won
    ? `In ${p.rolls} Würfen ins Ziel.`
    : p.position
      ? `Feld ${p.position} · noch ${state.settings.size - p.position} bis zum Ziel`
      : "Am Start · bereit für den ersten Wurf";
  $("dice").textContent = won
    ? "♛"
    : move
      ? ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][move.die]
      : "⚄";
  $("move-label").textContent = task
    ? move.blocked
      ? `${move.die} gewürfelt · zu weit. Du bleibst stehen.`
      : `${move.die} gewürfelt · ${move.from || "Start"} → ${move.path.at(-1)}${move.link ? ` ${move.link.type === "ladder" ? "↗ Leiter" : "↘ Rutsche"} → ${move.to}` : ""}`
    : won
      ? "Oben angekommen. Die Runde gehört dir."
      : "Tippen, würfeln, weiterziehen.";
  $("task-card").hidden = !task || !state.task;
  if (task && state.task) {
    const c = CATEGORIES[state.task.category];
    $("task-category").textContent =
      `FELD ${state.task.field} · ${c?.label || "EIGENE AUFGABE"}`;
    $("task-text").textContent = state.task.text;
    $("task-card").style.setProperty("--task-color", c?.color || "#dafa7a");
  }
  $("roll").hidden = state.phase !== "roll";
  $("roll").disabled = busy;
  $("task-actions").hidden = !task;
  $("done").disabled = busy;
  $("skip").disabled = busy;
  $("edit").disabled = busy;
  $("again").hidden = !won;
  $("again").disabled = busy;
  $("done").textContent =
    task && !state.task
      ? "Zug abschließen →"
      : p.position === state.settings.size
        ? "Ziel bestätigen ♛"
        : "Aufgabe erledigt →";
  $("skip").hidden = task && !state.task;
  const extra = task && state.settings.extraSix && move.die === 6;
  $("next-player").textContent = won
    ? "Neue Partie: neues Brett, neue Aufgaben."
    : extra
      ? `${p.name} darf nach der Aufgabe noch einmal würfeln.`
      : `Danach: ${state.players[(state.current + 1) % state.players.length].name}`;
  document.querySelector(".turn-panel").classList.toggle("winner", won);
  $("standings").replaceChildren(
    ...state.players.map((player, i) => {
      const li = element(
        "li",
        `player-position${i === state.current ? " active" : ""}`,
      );
      li.style.setProperty("--player-color", colors[i % colors.length]);
      const row = element("div");
      row.append(
        element("span", "player-number", String(i + 1)),
        element("strong", "", player.name),
        element("span", "", String(player.position)),
      );
      const progress = element("progress");
      progress.max = state.settings.size;
      progress.value = player.position;
      progress.setAttribute(
        "aria-label",
        `${player.name}: Feld ${player.position} von ${state.settings.size}`,
      );
      li.append(
        row,
        progress,
        element(
          "small",
          "",
          `${player.rolls} Würfe${player.lastDie ? ` · zuletzt ${player.lastDie}` : ""}${i === state.current ? " · am Zug" : ""}`,
        ),
      );
      return li;
    }),
  );
  $("progress-label").textContent = `Ziel: ${state.settings.size}`;
  $("field-list").replaceChildren(
    ...state.fields.map((_, i) =>
      button(fieldDescription(i + 1), () => {
        selectField(i + 1);
        $("field-info").scrollIntoView({
          block: "center",
          behavior: reduced() ? "instant" : "smooth",
        });
      }),
    ),
  );
  $("history").replaceChildren(
    ...state.history.map((h) =>
      element(
        "li",
        "",
        `${h.name}: ${h.die} · ${h.from || "Start"} → ${h.to}${h.blocked ? " (zu weit)" : h.link === "ladder" ? " ↗ Leiter" : h.link === "slide" ? " ↘ Rutsche" : ""}`,
      ),
    ),
  );
  $("active-rules").textContent =
    `${state.settings.size} Felder, ${state.settings.ladders} Leitern, ${state.settings.slides} Rutschen. Ziel: ${{ exact: "genau treffen", reach: "erreichen oder überwürfeln", bounce: "zurückprallen" }[state.settings.finish]}. ${state.settings.extraSix ? "Eine Sechs gibt einen weiteren Zug." : "Auch nach einer Sechs geht es reihum weiter."} Schluckmenge: ${state.settings.sips}. Aufgaben können ohne Strafe übersprungen werden. Eigene Aufgaben haben keine automatischen Bewegungsfolgen.`;
  $("scene-host").hidden = sceneFailed;
  $("fallback").hidden = !sceneFailed;
  if (sceneFailed) renderFlat();
  else {
    ensureScene();
    if (syncScene) scene?.sync(state);
  }
}
window.addEventListener("storage", (e) => {
  if (e.key !== KEY) return;
  const latest = readSaved(KEY);
  if (!validGame(latest)) {
    notice(
      "Der gespeicherte Spielstand wurde in einem anderen Tab entfernt oder ist ungültig. Diese Ansicht bleibt offen.",
    );
    return;
  }
  if (latest.id === state?.id && latest.revision === state?.revision) return;
  scene?.sync(latest.id === scene.id ? latest : state);
  if (latest.id !== state?.id) {
    scene?.dispose();
    scene = null;
  }
  state = latest;
  busy = false;
  editing = false;
  render();
  notice("Spielstand aus dem anderen Tab übernommen.");
});
loadSettings(
  state?.settings || DEFAULTS,
  state?.players.map((p) => p.name) || [],
);
render();
if (state)
  $("save-status").textContent =
    "Gespeicherte Partie fortgesetzt. Eine offene Aufgabe bleibt erhalten.";
window.addEventListener("pagehide", () => {
  scene?.dispose();
  scene = null;
});
window.addEventListener("pageshow", () => {
  if (state && !editing) ensureScene();
});
