import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  transition,
  validGame,
  TASKS,
  MODES,
  TERM_POOLS,
  variantCount,
  taskPool,
  prepareTasks,
  previewTask,
  settings,
  fieldPosition,
} from "../ladders-core.js";
const basic = { size: 20, ladders: 0, slides: 0 };
const action = (s, type, die) =>
  transition(s, { id: s.id, revision: s.revision, type, die });
test("boards reserve unique internal link endpoints and assign every field", () => {
  for (const size of [20, 21, 64, 120])
    for (let i = 0; i < 30; i++) {
      const s = createGame(["A", "B"], { size, ladders: 4, slides: 4 });
      assert.ok(validGame(s));
      assert.equal(new Set(s.links.flatMap((l) => [l.from, l.to])).size, 16);
      assert.equal(s.fields.length, size);
      const coords = Array.from({ length: size }, (_, i) =>
        fieldPosition(i + 1, size),
      );
      assert.equal(new Set(coords.map((p) => `${p.x},${p.z}`)).size, size);
    }
  assert.throws(() => createGame(["A"], { ...basic, ladders: 10, slides: 10 }));
  assert.throws(() => createGame(["A", "a"], basic));
  assert.throws(() => settings({ categories: [] }));
  assert.ok(TASKS.length > 200);
});
test("exact, reach and bounce resolve overshoot, then confirm victory", () => {
  for (const finish of ["exact", "reach", "bounce"]) {
    let s = createGame(["A", "B"], { ...basic, finish });
    s.players[0].position = 18;
    s = action(s, "roll", 4);
    assert.equal(
      s.players[0].position,
      { exact: 18, reach: 20, bounce: 18 }[finish],
    );
    assert.equal(s.phase, "task");
    assert.equal(!!s.task, finish !== "exact");
    s = action(s, "done");
    assert.equal(s.phase, finish === "reach" ? "won" : "roll");
  }
  let s = createGame(["A"], basic);
  s.players[0].position = 19;
  s = action(s, "roll", 1);
  assert.equal(s.task.field, 20);
  s = action(s, "skip");
  assert.equal(s.phase, "won");
  assert.ok(validGame(s));
  assert.throws(() => action(s, "roll", 1));
});
test("landing triggers one connection and only final field task; crossing does not", () => {
  let s = createGame(["A"], {
    ...basic,
    ladders: 1,
    slides: 1,
    fields: { 12: "Eigene Aufgabe" },
  });
  s.links = [
    { from: 3, to: 12, type: "ladder" },
    { from: 16, to: 6, type: "slide" },
  ];
  s = action(s, "roll", 3);
  assert.deepEqual(s.move.path, [1, 2, 3]);
  assert.equal(s.players[0].position, 12);
  assert.equal(s.task.text, "Eigene Aufgabe");
  assert.ok(validGame(s));
  s = action(s, "done");
  s = action(s, "roll", 4);
  assert.equal(s.players[0].position, 6);
  assert.equal(s.task.field, 6);
  s = action(s, "done");
  s.players[0].position = 0;
  s = action(s, "roll", 4);
  assert.equal(s.players[0].position, 4);
});
test("saved outcome is stable; duplicate rolls and stale actions rejected; six rules", () => {
  let s = createGame(["A", "B"], { ...basic, extraSix: true });
  const before = structuredClone(s);
  s = action(s, "roll", 6);
  assert.throws(() => action(s, "roll", 6));
  assert.throws(() =>
    transition(s, { id: before.id, revision: before.revision, type: "done" }),
  );
  assert.ok(validGame(JSON.parse(JSON.stringify(s))));
  s = action(s, "skip");
  assert.equal(s.current, 0);
  s = action(s, "roll", 2);
  s = action(s, "done");
  assert.equal(s.current, 1);
  let normal = createGame(["A", "B"], basic);
  normal = action(normal, "roll", 6);
  normal = action(normal, "done");
  assert.equal(normal.current, 1);
});
test("task bags exhaust before reuse, substitute quantity and replace defaults", () => {
  let s = createGame(["A"], {
    ...basic,
    categories: ["talk"],
    custom: { talk: "Erste {n}\nZweite\nDritte" },
    sips: 3,
  });
  const seen = [];
  for (let i = 0; i < 4; i++) {
    s.players[0].position = 0;
    s = action(s, "roll", 1);
    seen.push(s.task.text);
    s = action(s, "done");
  }
  assert.equal(new Set(seen.slice(0, 3)).size, 3);
  assert.ok(seen.includes("Erste 3"));
  assert.notEqual(seen[2], seen[3]);
});
test("corrupt saves and invalid settings rejected", () => {
  const s = createGame(["A"], basic);
  for (const corrupt of [
    null,
    {},
    { ...s, current: 5 },
    { ...s, fields: [] },
    { ...s, bags: { talk: [{}] } },
    { ...s, phase: "task", move: null },
  ])
    assert.equal(validGame(corrupt), false);
  for (const input of [
    { size: NaN },
    { size: 20.5 },
    { finish: "other" },
    { fields: { 21: "outside" }, ...basic },
    { custom: { talk: "x".repeat(301) } },
  ])
    assert.throws(() => settings(input));
});
test("complete simulated games reach a winner with serializable valid states", () => {
  for (const finish of ["exact", "reach", "bounce"]) {
    let s = createGame(["A", "B", "C"], {
      size: 30,
      ladders: 3,
      slides: 3,
      finish,
    });
    let i = 0;
    while (s.phase !== "won" && i++ < 10000) {
      s = action(
        s,
        s.phase === "roll" ? "roll" : "done",
        1 + Math.floor(Math.random() * 6),
      );
      assert.ok(validGame(JSON.parse(JSON.stringify(s))));
    }
    assert.equal(s.phase, "won");
    assert.equal(s.players[s.current].position, 30);
  }
});

test("field preview matches the drawn task and advances with its category", () => {
  let s = createGame(["A"], {
    ...basic,
    categories: ["talk"],
    custom: { talk: "Erste Aufgabe\nZweite Aufgabe\nDritte Aufgabe" },
  });
  const first = previewTask(s, 1);
  s = action(s, "roll", 1);
  assert.equal(s.task.text, first);
  assert.notEqual(previewTask(s, 1), first);
  assert.equal(previewTask(s, 1), previewTask(s, 2));
  s.settings.fields[2] = "Feste Aufgabe";
  assert.equal(previewTask(s, 2), "Feste Aufgabe");
});

test("Hot and Weird have distinct themed tasks, not only different labels", () => {
  assert.equal(MODES.sexy.label, "Hot");
  assert.equal(MODES.weird.label, "Weird");
  const hot = TASKS.filter((t) => t.mode === "sexy"),
    weird = TASKS.filter((t) => t.mode === "weird"),
    crazy = TASKS.filter((t) => t.mode === "crazy");
  assert.ok(hot.some((t) => t.title === "Flirtduell"));
  assert.ok(weird.some((t) => t.title === "Schattenleben"));
  assert.ok(crazy.some((t) => t.title === "Nudeloper"));
  assert.ok(
    !weird.some((t) => t.title === "Flirtduell" || t.title === "Nudeloper"),
  );
});

test("each mode has 500 distinct variants; templates do not crowd the deck", () => {
  assert.equal(TERM_POOLS.rhymes.length, 100);
  assert.equal(TERM_POOLS.categories.length, 100);
  for (const pool of Object.values(TERM_POOLS))
    assert.equal(new Set(pool).size, pool.length);
  assert.equal(new Set(TASKS.map((t) => t.id)).size, TASKS.length);
  for (const mode of Object.keys(MODES)) {
    const tasks = TASKS.filter((t) => t.mode === mode);
    const expanded = tasks.flatMap((t) =>
      t.pool
        ? TERM_POOLS[t.pool].map((term) => t.text.replaceAll("{term}", term))
        : [t.text],
    );
    assert.ok(new Set(expanded).size >= 500, mode);
    assert.equal(variantCount(tasks), expanded.length);
    assert.equal(tasks.filter((t) => t.pool === "rhymes").length, 1);
    assert.equal(
      tasks.filter((t) => t.id === `template:${mode}:category`).length,
      1,
    );
    for (const c of ["talk", "challenge", "duel", "sip"])
      assert.ok(tasks.some((t) => t.category === c));
  }
});
test("mode decks are separate and Hot requires adult confirmation", () => {
  assert.throws(() => settings({ mode: "other" }));
  assert.throws(() => createGame(["A"], { ...basic, mode: "sexy" }));
  for (const mode of Object.keys(MODES)) {
    const s = createGame(["A"], {
      ...basic,
      mode,
      adultConfirmed: mode === "sexy",
    });
    assert.ok(validGame(s));
    for (const c of s.settings.categories)
      assert.ok(taskPool(s.settings, c).every((t) => t.mode === mode));
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  }
});
test("term bags exhaust independently and avoid immediate repeat on refill", () => {
  const s = createGame(["A"], { ...basic, categories: ["duel"] });
  s.termBags = {};
  s.lastTerms = {};
  const template = TASKS.find((t) => t.id === "template:normal:rhymes"),
    seen = [];
  for (let i = 0; i < 101; i++) {
    s.bags.duel = [{ ...template }];
    prepareTasks(s);
    seen.push(s.bags.duel[0].term);
  }
  assert.equal(new Set(seen.slice(0, 100)).size, 100);
  assert.notEqual(seen[99], seen[100]);
});
test("template preview survives reload and legacy saves still play", () => {
  let s = createGame(["A"], { ...basic, categories: ["duel"], mode: "crazy" });
  s.bags.duel = [{ ...TASKS.find((t) => t.id === "template:crazy:category") }];
  prepareTasks(s);
  const text = previewTask(s, 1);
  s = action(JSON.parse(JSON.stringify(s)), "roll", 1);
  assert.equal(s.task.text, text);
  assert.ok(s.task.term);
  assert.ok(!text.includes("{term}"));
  const old = createGame(["A"], basic);
  delete old.settings.mode;
  delete old.settings.adultConfirmed;
  delete old.termBags;
  delete old.lastTerms;
  assert.ok(validGame(old));
  assert.ok(validGame(action(old, "roll", 1)));
});
