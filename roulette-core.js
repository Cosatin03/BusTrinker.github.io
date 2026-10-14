export const ROULETTE_KEY = "bustrinker.roulette.v1";
export const WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const RED = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);
export const color = (n) => (n === 0 ? "green" : RED.has(n) ? "red" : "black");
export const DEFAULTS = {
  minimum: 3,
  lossMultiplier: 1,
  winCap: 0,
  lossCap: 0,
  duration: 8,
  sound: false,
};
export const BETS = [];
function add(id, label, numbers, odds, kind) {
  BETS.push({ id, label, numbers, odds, kind });
}
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
for (let n = 0; n <= 36; n++) add(`n${n}`, String(n), [n], 10, "straight");
for (const [id, label, test] of [
  ["red", "Rot", (n) => RED.has(n)],
  ["black", "Schwarz", (n) => !RED.has(n)],
  ["even", "Gerade", (n) => n % 2 === 0],
  ["odd", "Ungerade", (n) => n % 2 === 1],
  ["low", "1–18", (n) => n <= 18],
  ["high", "19–36", (n) => n >= 19],
])
  add(id, label, range(1, 36).filter(test), 1, "outside");
for (let i = 0; i < 3; i++) {
  add(
    `dozen${i}`,
    `${i * 12 + 1}–${i * 12 + 12}`,
    range(i * 12 + 1, i * 12 + 12),
    2,
    "dozen",
  );
  add(
    `column${i}`,
    `Kolonne ${i + 1}`,
    range(1, 36).filter((n) => (n - 1) % 3 === i),
    2,
    "column",
  );
}
for (let n = 1; n <= 36; n++) {
  if (n % 3 !== 0)
    add(`split${n}-${n + 1}`, `${n} / ${n + 1}`, [n, n + 1], 17, "split");
  if (n <= 33)
    add(`split${n}-${n + 3}`, `${n} / ${n + 3}`, [n, n + 3], 17, "split");
  if (n % 3 === 1) {
    add(`street${n}`, `${n}–${n + 2}`, range(n, n + 2), 11, "street");
    if (n <= 31) add(`six${n}`, `${n}–${n + 5}`, range(n, n + 5), 5, "six");
  }
  if (n <= 32 && n % 3 !== 0)
    add(
      `corner${n}`,
      `${n} / ${n + 1} / ${n + 3} / ${n + 4}`,
      [n, n + 1, n + 3, n + 4],
      8,
      "corner",
    );
}
for (let n = 1; n <= 3; n++)
  add(`split0-${n}`, `0 / ${n}`, [0, n], 17, "split");
add("trio1", "0 / 1 / 2", [0, 1, 2], 11, "street");
add("trio2", "0 / 2 / 3", [0, 2, 3], 11, "street");
add("firstfour", "0 / 1 / 2 / 3", [0, 1, 2, 3], 8, "corner");
export const betById = new Map(BETS.map((b) => [b.id, b]));
const integer = (v, min = 0, max = 1e9) =>
  Number.isSafeInteger(v) && v >= min && v <= max;
export function settings(input = {}) {
  const s = { ...DEFAULTS, ...input };
  if (
    !integer(s.minimum, 1, 1000) ||
    !integer(s.lossMultiplier, 0, 10) ||
    !integer(s.winCap, 0, 10000) ||
    !integer(s.lossCap, 0, 10000) ||
    ![3, 8, 12].includes(s.duration) ||
    typeof s.sound !== "boolean"
  )
    throw Error("Bitte gültige Spieleinstellungen wählen.");
  return s;
}
export function createGame(names, options) {
  const clean = names.map((n) => String(n).trim().replace(/\s+/g, " "));
  if (
    !clean.length ||
    clean.some((n) => !n || n.length > 24) ||
    new Set(clean.map((n) => n.toLocaleLowerCase("de"))).size !== clean.length
  )
    throw Error(
      "Mindestens einen eindeutigen Namen mit höchstens 24 Zeichen eingeben.",
    );
  return {
    version: 1,
    gameId: globalThis.crypto.randomUUID(),
    revision: 0,
    settings: settings(options),
    players: clean.map((name) => ({ name, drank: 0, given: 0, wins: 0 })),
    round: 1,
    phase: "betting",
    current: 0,
    ready: clean.map(() => false),
    bets: [],
    outcome: null,
    startedAt: null,
    settlement: null,
    history: [],
    transfers: [],
  };
}
export function validGame(s) {
  try {
    if (
      !s ||
      s.version !== 1 ||
      typeof s.gameId !== "string" ||
      !integer(s.revision) ||
      !integer(s.round, 1) ||
      !["betting", "spinning", "result"].includes(s.phase)
    )
      return false;
    settings(s.settings);
    if (
      s.transfers !== undefined &&
      (!Array.isArray(s.transfers) ||
        !s.transfers.every(
          (t) =>
            integer(t.from, 0, s.players?.length - 1) &&
            integer(t.to, 0, s.players?.length - 1) &&
            integer(t.amount, 1),
        ))
    )
      return false;
    if (
      !Array.isArray(s.players) ||
      !s.players.length ||
      !s.players.every(
        (p) =>
          typeof p.name === "string" &&
          p.name.trim() &&
          p.name.length <= 24 &&
          ["drank", "given", "wins"].every((k) => integer(p[k])),
      )
    )
      return false;
    if (
      !integer(s.current, 0, s.players.length - 1) ||
      !Array.isArray(s.ready) ||
      s.ready.length !== s.players.length ||
      !s.ready.every((v) => typeof v === "boolean")
    )
      return false;
    if (
      !Array.isArray(s.bets) ||
      !s.bets.every(
        (b) =>
          integer(b.player, 0, s.players.length - 1) &&
          betById.has(b.id) &&
          integer(b.amount, s.settings.minimum, 10000),
      )
    )
      return false;
    if (
      new Set(s.bets.map((b) => `${b.player}:${b.id}`)).size !== s.bets.length
    )
      return false;
    if (
      !Array.isArray(s.history) ||
      s.history.length > 20 ||
      !s.history.every((n) => integer(n, 0, 36))
    )
      return false;
    if (s.phase === "betting")
      return s.outcome === null && s.settlement === null;
    if (
      !integer(s.outcome, 0, 36) ||
      !Number.isFinite(s.startedAt) ||
      !s.ready.every(Boolean) ||
      !s.bets.length
    )
      return false;
    if (s.phase === "spinning") return s.settlement === null;
    return (
      Array.isArray(s.settlement) &&
      s.settlement.length === s.players.length &&
      s.settlement.every(
        (r) =>
          [
            "give",
            "remaining",
            "drink",
            "acknowledged",
            "rawWin",
            "rawLoss",
          ].every((k) => integer(r[k])) &&
          r.remaining <= r.give &&
          r.acknowledged <= r.drink &&
          r.confirmed === (r.acknowledged === r.drink),
      )
    );
  } catch {
    return false;
  }
}
export function drawNumber(cryptoSource = globalThis.crypto) {
  const data = new Uint32Array(1),
    limit = Math.floor(2 ** 32 / 37) * 37;
  do {
    cryptoSource.getRandomValues(data);
  } while (data[0] >= limit);
  return data[0] % 37;
}
export function transition(input, command) {
  if (!validGame(input))
    throw Error(
      "Der Spielstand ist unvollständig. Bitte eine neue Partie starten.",
    );
  if (
    (command.gameId !== undefined && command.gameId !== input.gameId) ||
    command.revision !== input.revision
  )
    throw Error(
      "Die Partie wurde in einem anderen Tab geändert. Bitte erneut versuchen.",
    );
  const s = structuredClone(input),
    c = command;
  const betting = () => {
    if (s.phase !== "betting") throw Error("Die Einsätze sind geschlossen.");
  };
  switch (c.type) {
    case "select":
      betting();
      if (!integer(c.player, 0, s.players.length - 1))
        throw Error("Spieler auswählen.");
      s.current = c.player;
      break;
    case "bet": {
      betting();
      if (s.ready[s.current])
        throw Error("Öffne deine Einsätze zuerst wieder.");
      if (!betById.has(c.id) || !integer(c.amount, s.settings.minimum, 10000))
        throw Error(
          `Mindestens ${s.settings.minimum}, höchstens 10000 Schlücke pro Feld setzen.`,
        );
      const previous = s.bets.find(
        (b) => b.player === s.current && b.id === c.id,
      );
      if (previous) {
        if (previous.amount + c.amount > 10000)
          throw Error("Höchstens 10000 Schlücke pro Feld.");
        previous.amount += c.amount;
      } else s.bets.push({ player: s.current, id: c.id, amount: c.amount });
      break;
    }
    case "remove":
      betting();
      if (s.ready[s.current])
        throw Error("Öffne deine Einsätze zuerst wieder.");
      s.bets = s.bets.filter(
        (b) =>
          !(b.player === s.current && (c.id === undefined || b.id === c.id)),
      );
      break;
    case "ready": {
      betting();
      s.ready[s.current] = !s.ready[s.current];
      if (s.ready[s.current]) {
        const next = s.ready.findIndex((v) => !v);
        if (next >= 0) s.current = next;
      }
      break;
    }
    case "spin":
      betting();
      if (!s.bets.length || !s.ready.every(Boolean))
        throw Error(
          "Alle Spieler müssen setzen oder aussetzen und bestätigen.",
        );
      if (!integer(c.outcome, 0, 36) || !Number.isFinite(c.now))
        throw Error("Ungültiger Dreh.");
      s.outcome = c.outcome;
      s.startedAt = c.now;
      s.phase = "spinning";
      break;
    case "settle": {
      if (s.phase !== "spinning")
        throw Error("Diese Runde wurde bereits ausgewertet.");
      if (
        !Number.isFinite(c.now) ||
        c.now < s.startedAt + s.settings.duration * 1000
      )
        throw Error("Das Rad dreht noch.");
      s.settlement = s.players.map((_, player) => {
        let rawWin = 0,
          rawLoss = 0;
        for (const b of s.bets.filter((b) => b.player === player)) {
          const rule = betById.get(b.id);
          if (rule.numbers.includes(s.outcome)) rawWin += b.amount * rule.odds;
          else rawLoss += b.amount * s.settings.lossMultiplier;
        }
        const give = s.settings.winCap
          ? Math.min(rawWin, s.settings.winCap)
          : rawWin;
        const drink = s.settings.lossCap
          ? Math.min(rawLoss, s.settings.lossCap)
          : rawLoss;
        if (rawWin) s.players[player].wins++;
        s.players[player].drank += drink;
        return {
          give,
          remaining: give,
          drink,
          acknowledged: 0,
          rawWin,
          rawLoss,
          confirmed: drink === 0,
        };
      });
      s.history = [s.outcome, ...s.history].slice(0, 20);
      s.phase = "result";
      break;
    }
    case "give": {
      if (
        s.phase !== "result" ||
        !integer(c.from, 0, s.players.length - 1) ||
        !integer(c.to, 0, s.players.length - 1)
      )
        throw Error("Empfänger auswählen.");
      const result = s.settlement[c.from];
      if (!integer(c.amount, 1, result.remaining))
        throw Error("Die Menge muss innerhalb des offenen Gewinns liegen.");
      s.transfers ??= [];
      s.transfers.push({ from: c.from, to: c.to, amount: c.amount });
      result.remaining -= c.amount;
      s.players[c.from].given += c.amount;
      s.players[c.to].drank += c.amount;
      s.settlement[c.to].drink += c.amount;
      s.settlement[c.to].confirmed = false;
      break;
    }
    case "waive":
      if (s.phase !== "result" || !integer(c.player, 0, s.players.length - 1))
        throw Error("Ungültiger Spieler.");
      s.settlement[c.player].remaining = 0;
      break;
    case "confirm":
      if (s.phase !== "result" || !integer(c.player, 0, s.players.length - 1))
        throw Error("Ungültiger Spieler.");
      s.settlement[c.player].acknowledged = s.settlement[c.player].drink;
      s.settlement[c.player].confirmed = true;
      break;
    case "next":
      if (
        s.phase !== "result" ||
        s.settlement.some((r) => r.remaining || !r.confirmed)
      )
        throw Error(
          "Erst Gewinne verteilen oder verfallen lassen und Schlücke bestätigen.",
        );
      s.phase = "betting";
      s.round++;
      s.current = 0;
      s.ready.fill(false);
      s.bets = [];
      s.outcome = null;
      s.startedAt = null;
      s.settlement = null;
      s.transfers = [];
      break;
    default:
      throw Error("Unbekannte Spielaktion.");
  }
  s.revision++;
  if (!validGame(s))
    throw Error("Die Aktion überschreitet den unterstützten Zahlenbereich.");
  return s;
}
