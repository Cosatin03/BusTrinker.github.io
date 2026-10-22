export const KEY = "bustrinker.ladders.v1";
export const CATEGORIES = {
  talk: { label: "Runde & Geschichten", icon: "✦", color: "#ecc2a8" },
  challenge: { label: "Challenge", icon: "⚡", color: "#dafa7a" },
  duel: { label: "Duell & Reaktion", icon: "◆", color: "#a8c9ec" },
  sip: { label: "Schlücke verteilen", icon: "●", color: "#dcacd7" },
};
const topics = [
  "Filme",
  "Städte",
  "Tiere",
  "Musikinstrumente",
  "Eissorten",
  "Berufe",
  "Sportarten",
  "Gemüsesorten",
  "Songs",
  "Dinge im Badezimmer",
  "Brettspiele",
  "Urlaubsziele",
];
const prompts = {
  talk: [
    "Welcher Song beschreibt deinen heutigen Tag?",
    "Welche unnütze Fähigkeit würdest du gern beherrschen?",
    "Erzähle von einem kleinen Missgeschick auf einer Reise.",
    "Welchen Film kannst du immer wieder sehen?",
    "Was war dein seltsamster spontaner Kauf?",
    "Was würdest du mit einem freien Tag ohne Handy machen?",
    "Welche harmlose Angewohnheit hast du?",
    "Welche Erfindung fehlt dir im Alltag?",
    "Erfinde einen neuen Namen für eure Gruppe.",
    "Welchen Beruf wolltest du als Kind machen?",
    "Welche Kleinigkeit hat dich diese Woche zum Lachen gebracht?",
    "Nenne einen Ort, den du noch sehen möchtest.",
    "Welches Essen würdest du für die Runde kochen?",
    "Was war dein erster Konzertbesuch?",
    "Erzähle zwei wahre und eine erfundene Kleinigkeit über dich. Die Runde rät.",
    "Welche Spielregel würdest du im echten Leben einführen?",
    "Was wäre der Titel deiner Autobiografie?",
    "Welche Figur aus einem Film wäre dein idealer Mitbewohner?",
    "Beschreibe deinen Tag mit drei Geräuschen.",
    "Erfinde einen neuen Feiertag und erkläre, wie man ihn feiert.",
    "Welche drei Dinge würdest du in eine Zeitkapsel legen?",
    "Nenne einen guten Rat, den du einmal bekommen hast.",
    "Beschreibe deinen Traumurlaub ohne Ortsnamen.",
    "Welche App würdest du selbst erfinden?",
  ],
  challenge: [
    "Erkläre einen Toaster wie ein Sportkommentator.",
    "Spiele einen Roboter, der zum ersten Mal tanzt.",
    "Verkaufe der Runde einen unsichtbaren Regenschirm.",
    "Sprich deinen nächsten Satz rückwärts Wort für Wort.",
    "Erfinde einen Werbespruch für den Gegenstand links von dir.",
    "Singe einen Satz deiner Wahl wie eine Oper.",
    "Zeige einen Beruf pantomimisch. Die Runde rät.",
    "Beschreibe einen Film ohne Namen von Figuren.",
    "Erkläre das Würfeln, ohne „Würfel“, „Zahl“ oder „werfen“ zu sagen.",
    "Zähle von 20 bis 1 in Zweierschritten.",
    "Nenne fünf Wörter, die mit deinem Anfangsbuchstaben beginnen.",
    "Sprich einen Zungenbrecher deiner Wahl dreimal.",
    "Erfinde eine Schlagzeile über diesen Spieleabend.",
    "Stelle ein Tier nur mit Geräuschen dar.",
    "Sprich bis zu deinem nächsten Zug wie eine Nachrichtensprecherin oder ein Nachrichtensprecher.",
    "Beschreibe eine Banane, ohne Farbe, Form oder Obst zu erwähnen.",
    "Erfinde einen Handschlag ohne Berührung und zeige ihn vor.",
    "Summ einen bekannten Song. Die Runde rät.",
    ...topics.map(
      (t) =>
        `Nenne in 15 Sekunden fünf Beispiele für ${t}. Die Runde zählt mit.`,
    ),
  ],
  duel: [
    "Wähle jemanden: Schere, Stein, Papier. Wer zuerst zwei Punkte hat, gewinnt.",
    "Blickduell mit einer freiwilligen Person: Wer zuerst lacht, verliert.",
    "Alle zeigen gleichzeitig 0–5 Finger. Wer die Summe am nächsten schätzt, gewinnt.",
    "Wähle jemanden. Nennt abwechselnd Reime auf „Haus“. Wiederholung oder fünf Sekunden Pause verliert.",
    "Alle tippen auf die nächste Würfelzahl. Merkt euch die Tipps bis zum nächsten Zug.",
    "Eine Person zeichnet mit dem Finger eine Form in die Luft. Du errätst sie.",
    "Wähle jemanden. Zählt abwechselnd hoch; ersetzt Vielfache von drei durch „Bus“. Erster Fehler verliert.",
    "Die Runde nennt ein langes Wort. Buchstabiere es rückwärts, dann ist die Person links von dir dran.",
    "Wer kann zehn Sekunden ohne Uhr am genauesten abschätzen? Eine Person stoppt.",
    "Du und eine freiwillige Person nennt gleichzeitig eine Farbe. Schafft ihr es in drei Versuchen, dieselbe zu sagen?",
    "Die Runde gibt euch drei Wörter. Du und eine freiwillige Person erfindet je einen Satz damit.",
    "Spiegelt zu zweit fünf Handbewegungen. Danach wechselt ihr die Rollen.",
    ...topics.map(
      (t) =>
        `Reihum ${t} nennen, du beginnst. Wiederholung oder fünf Sekunden Pause beendet die Runde.`,
    ),
  ],
  sip: [
    "Verteile {n} Schlücke frei in der Runde, auch auf mehrere Personen.",
    "Biete der Person links von dir {n} Schlücke an.",
    "Biete der Person rechts von dir {n} Schlücke an.",
    "Wähle jemanden, mit dem du anstößt. Ihr könnt je einen Schluck nehmen.",
    "Wer heute am frühesten aufgestanden ist, darf {n} Schlücke verteilen.",
    "Wer zuletzt Geburtstag hatte, darf {n} Schlücke verteilen.",
    "Wer die längste Anreise hatte, darf {n} Schlücke verteilen.",
    "Die Person auf dem hintersten Feld darf {n} Schlücke verteilen. Bei Gleichstand gemeinsam.",
    "Du darfst {n} Schlücke verteilen oder verfallen lassen.",
    "Die Runde stimmt ab: Wer hat den kreativsten Spielernamen? Diese Person verteilt {n} Schlücke.",
    "Wer zuletzt gekocht hat, darf {n} Schlücke verteilen.",
    "Alle können gemeinsam anstoßen und einen Schluck nehmen.",
    "Biete einer Person deiner Wahl einen Schluck an und mache ihr ein Kompliment.",
    "Wer als Nächstes Geburtstag hat, darf {n} Schlücke verteilen.",
    "Wer die kleinste Würfelzahl im letzten Zug hatte, darf {n} Schlücke verteilen. Bei Gleichstand gemeinsam.",
    "Nenne deine Lieblingsfarbe. Wer sie trägt, darf gemeinsam {n} Schlücke verteilen.",
    "Die Person rechts von dir entscheidet, wie {n} Schlücke verteilt werden.",
    "Die Person links von dir entscheidet, wie {n} Schlücke verteilt werden.",
    "Wer ein Haustier hat, darf gemeinsam {n} Schlücke verteilen.",
    "Macht eine kurze Getränkepause. Für dieses Feld wird nichts verteilt.",
    "Wer zuletzt Zug gefahren ist, darf {n} Schlücke verteilen.",
    "Wer heute schon Musik gehört hat, darf gemeinsam {n} Schlücke verteilen.",
    "Wer auf einem geraden Feld steht, darf gemeinsam {n} Schlücke verteilen.",
    "Wer auf einem ungeraden Feld steht, darf gemeinsam {n} Schlücke verteilen.",
  ],
};
export const TASKS = Object.entries(prompts).flatMap(([category, texts]) =>
  texts.map((text, i) => ({ id: `${category}-${i}`, category, text })),
);
export const DEFAULTS = {
  size: 64,
  ladders: 5,
  slides: 5,
  finish: "exact",
  extraSix: false,
  sips: 2,
  speed: 1,
  categories: Object.keys(CATEGORIES),
  custom: {},
  fields: {},
};
export function shuffle(values, rng = Math.random) {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function settings(input = {}) {
  const s = { ...DEFAULTS, ...input };
  for (const [key, lo, hi] of [
    ["size", 20, 120],
    ["ladders", 0, 10],
    ["slides", 0, 10],
    ["sips", 1, 10],
  ]) {
    if (!Number.isInteger(s[key]) || s[key] < lo || s[key] > hi)
      throw Error(`Ungültige Einstellung: ${key}`);
  }
  if ((s.ladders + s.slides) * 2 > s.size - 2)
    throw Error(
      "Für diese Anzahl Rutschen und Leitern braucht ihr mehr Felder.",
    );
  if (
    !["exact", "reach", "bounce"].includes(s.finish) ||
    ![0.5, 1, 1.5].includes(s.speed) ||
    typeof s.extraSix !== "boolean"
  )
    throw Error("Ungültige Spielregel.");
  if (
    !Array.isArray(s.categories) ||
    !s.categories.length ||
    s.categories.some((c) => !CATEGORIES[c])
  )
    throw Error("Mindestens eine Aufgabenkategorie auswählen.");
  s.categories = [...new Set(s.categories)];
  s.custom = Object.fromEntries(
    Object.keys(CATEGORIES).map((c) => [c, String(s.custom?.[c] || "").trim()]),
  );
  if (
    Object.values(s.custom).some(
      (t) =>
        t.length > 20000 || t.split("\n").some((line) => line.length > 300),
    )
  )
    throw Error(
      "Eigene Aufgaben: maximal 300 Zeichen pro Zeile und 20.000 pro Kategorie.",
    );
  s.fields = { ...s.fields };
  for (const [n, text] of Object.entries(s.fields))
    if (
      !Number.isInteger(+n) ||
      +n < 1 ||
      +n > s.size ||
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 300
    )
      throw Error("Prüfe die eigenen Feldaufgaben (maximal 300 Zeichen).");
  return s;
}
export function taskPool(s, category) {
  const custom = s.custom[category]
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
  return custom.length
    ? [...new Set(custom)].map((text, i) => ({
        id: `custom-${category}-${i}`,
        category,
        text,
      }))
    : TASKS.filter((t) => t.category === category);
}
export function createGame(names, input, rng = Math.random) {
  const options = settings(input);
  if (
    !Array.isArray(names) ||
    !names.length ||
    names.some(
      (n) => typeof n !== "string" || !n.trim() || n.trim().length > 24,
    )
  )
    throw Error("Tragt mindestens einen Namen ein (maximal 24 Zeichen).");
  if (
    new Set(names.map((n) => n.trim().toLocaleLowerCase("de"))).size !==
    names.length
  )
    throw Error("Bitte unterschiedliche Namen verwenden.");
  // Prefer short, separate connections instead of long diagonals across the board.
  const available = new Set(
    Array.from({ length: options.size - 2 }, (_, i) => i + 2),
  );
  const links = [];
  const cross = (a, b, c) =>
    (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  for (let i = 0; i < options.ladders + options.slides; i++) {
    let best = null,
      score = Infinity;
    for (const a of available)
      for (const b of available) {
        if (b <= a) continue;
        const pa = fieldPosition(a, options.size),
          pb = fieldPosition(b, options.size);
        let cost = Math.hypot(pa.x - pb.x, pa.z - pb.z) + rng() * 0.7;
        if (pa.z === pb.z) cost += 3;
        for (const l of links) {
          const pc = fieldPosition(l.from, options.size),
            pd = fieldPosition(l.to, options.size);
          if (
            cross(pa, pb, pc) * cross(pa, pb, pd) <= 0 &&
            cross(pc, pd, pa) * cross(pc, pd, pb) <= 0
          )
            cost += 1000;
        }
        if (cost < score) {
          score = cost;
          best = [a, b];
        }
      }
    const [a, b] = best;
    available.delete(a);
    available.delete(b);
    links.push(
      i < options.ladders
        ? { from: a, to: b, type: "ladder" }
        : { from: b, to: a, type: "slide" },
    );
  }
  let categories = [];
  while (categories.length < options.size)
    categories.push(...shuffle(options.categories, rng));
  return {
    version: 1,
    id: globalThis.crypto.randomUUID(),
    revision: 0,
    settings: options,
    players: names.map((name) => ({
      name: name.trim(),
      position: 0,
      rolls: 0,
      lastDie: null,
    })),
    current: 0,
    turn: 1,
    phase: "roll",
    links,
    fields: categories.slice(0, options.size),
    bags: Object.fromEntries(
      options.categories.map((c) => [c, shuffle(taskPool(options, c), rng)]),
    ),
    lastTasks: {},
    task: null,
    move: null,
    history: [],
  };
}
export function prepareTasks(state, rng = Math.random) {
  for (const category of state.settings.categories)
    if (!state.bags[category]?.length) {
      const tasks = shuffle(taskPool(state.settings, category), rng);
      if (tasks.length > 1 && tasks.at(-1).id === state.lastTasks[category])
        [tasks[0], tasks[tasks.length - 1]] = [tasks.at(-1), tasks[0]];
      state.bags[category] = tasks;
    }
}
export function previewTask(state, field) {
  if (state.settings.fields[field]) return state.settings.fields[field];
  const category = state.fields[field - 1];
  const text =
    state.settings.fields[field] ||
    state.bags[category]?.at(-1)?.text ||
    taskPool(state.settings, category)[0].text;
  return text.replaceAll("{n}", String(state.settings.sips));
}
export function taskTitle(text) {
  const words = text.replace(/[.,:;!?].*$/, "").split(/\s+/);
  return words.slice(0, 5).join(" ") + (words.length > 5 ? " …" : "");
}
export function drawTask(state, field, rng) {
  if (state.settings.fields[field])
    return { category: "custom", text: state.settings.fields[field], field };
  const category = state.fields[field - 1];
  prepareTasks(state, rng);
  const task = state.bags[category].pop();
  state.lastTasks[category] = task.id;
  prepareTasks(state, rng);
  return {
    ...task,
    text: task.text.replaceAll("{n}", String(state.settings.sips)),
    field,
  };
}
export function rollDie() {
  const a = new Uint32Array(1);
  do {
    crypto.getRandomValues(a);
  } while (a[0] >= 4294967292);
  return (a[0] % 6) + 1;
}
export function transition(previous, action, rng = Math.random) {
  if (action.revision !== previous.revision || action.id !== previous.id)
    throw Error("Der Spielstand hat sich geändert. Bitte erneut versuchen.");
  const s = structuredClone(previous),
    p = s.players[s.current];
  if (action.type === "roll") {
    if (
      s.phase !== "roll" ||
      !Number.isInteger(action.die) ||
      action.die < 1 ||
      action.die > 6
    )
      throw Error("Jetzt kann nicht gewürfelt werden.");
    const start = p.position,
      size = s.settings.size,
      path = [];
    let pos = start,
      direction = 1;
    const blocked = s.settings.finish === "exact" && start + action.die > size;
    if (!blocked)
      for (let i = 0; i < action.die; i++) {
        if (pos === size) {
          if (s.settings.finish === "bounce") direction = -1;
          else break;
        }
        pos += direction;
        path.push(pos);
      }
    const link = !blocked && s.links.find((l) => l.from === pos);
    if (link) pos = link.to;
    p.position = pos;
    p.rolls++;
    p.lastDie = action.die;
    s.move = {
      player: s.current,
      from: start,
      path,
      link: link || null,
      to: pos,
      die: action.die,
      blocked,
    };
    // The outcome and task are saved before animation; reload never rolls again.
    s.task = blocked ? null : drawTask(s, pos, rng);
    s.phase = "task";
    s.history.unshift({
      name: p.name,
      die: action.die,
      from: start,
      to: pos,
      link: link?.type,
      blocked,
    });
    s.history = s.history.slice(0, 20);
  } else if (action.type === "done" || action.type === "skip") {
    if (s.phase !== "task") throw Error("Es gibt keine offene Aufgabe.");
    if (p.position === s.settings.size) s.phase = "won";
    else {
      if (!(s.settings.extraSix && s.move.die === 6))
        s.current = (s.current + 1) % s.players.length;
      s.turn++;
      s.phase = "roll";
      s.task = null;
    }
  } else throw Error("Unbekannte Aktion.");
  s.revision++;
  return s;
}
export function validGame(s) {
  try {
    if (
      s?.version !== 1 ||
      typeof s.id !== "string" ||
      !Number.isInteger(s.revision) ||
      s.revision < 0
    )
      return false;
    const o = settings(s.settings);
    if (
      !Array.isArray(s.players) ||
      !s.players.length ||
      !s.players.every(
        (p) =>
          typeof p.name === "string" &&
          p.name.trim() &&
          Number.isInteger(p.position) &&
          p.position >= 0 &&
          p.position <= o.size,
      )
    )
      return false;
    if (
      !Number.isInteger(s.current) ||
      !s.players[s.current] ||
      !Number.isInteger(s.turn) ||
      s.turn < 1 ||
      !["roll", "task", "won"].includes(s.phase)
    )
      return false;
    if (
      !Array.isArray(s.fields) ||
      s.fields.length !== o.size ||
      s.fields.some((c) => !o.categories.includes(c))
    )
      return false;
    if (
      !Array.isArray(s.links) ||
      s.links.length !== o.ladders + o.slides ||
      new Set(s.links.flatMap((l) => [l.from, l.to])).size !==
        s.links.length * 2 ||
      s.links.some(
        (l) =>
          !Number.isInteger(l.from) ||
          !Number.isInteger(l.to) ||
          Math.min(l.from, l.to) < 2 ||
          Math.max(l.from, l.to) >= o.size ||
          (l.type === "ladder"
            ? l.to <= l.from
            : l.type !== "slide" || l.to >= l.from),
      )
    )
      return false;
    if (!s.bags || !s.lastTasks || !Array.isArray(s.history)) return false;
    for (const [c, bag] of Object.entries(s.bags))
      if (
        !CATEGORIES[c] ||
        !Array.isArray(bag) ||
        bag.some((t) => typeof t.text !== "string" || t.category !== c)
      )
        return false;
    if (
      s.phase === "task" &&
      (!s.move ||
        s.move.player !== s.current ||
        !Array.isArray(s.move.path) ||
        !Number.isInteger(s.move.die) ||
        s.move.die < 1 ||
        s.move.die > 6 ||
        (!s.move.blocked && typeof s.task?.text !== "string"))
    )
      return false;
    return s.phase !== "won" || s.players[s.current].position === o.size;
  } catch {
    return false;
  }
}
export function fieldPosition(n, size) {
  const cols = Math.ceil(Math.sqrt(size)),
    rows = Math.ceil(size / cols);
  if (n === 0) return { x: -(cols - 1) / 2 - 0.8, z: (rows - 1) / 2 + 0.7 };
  const row = Math.floor((n - 1) / cols),
    col = (n - 1) % cols;
  return {
    x: (row % 2 ? cols - 1 - col : col) - (cols - 1) / 2,
    z: (rows - 1) / 2 - row,
  };
}
