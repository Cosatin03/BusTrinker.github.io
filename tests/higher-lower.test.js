import test from "node:test";
import assert from "node:assert/strict";
import {
  createLocalGame,
  localTransition,
  validLocalGame,
  pileRange,
  cardValue,
} from "../higher-lower-core.js";
const move = (s, c) =>
  localTransition(s, { ...c, expectedRevision: s.revision });
test("equal is valid on a single-card pile; the revealed result survives serialization", () => {
  let s = createLocalGame(["Anne"], () => 0.5);
  // Put another card of the same rank on top without introducing duplicates.
  const index = s.deck.findIndex((c) => c[0] === s.piles[0][0][0]);
  [s.deck[index], s.deck[s.deck.length - 1]] = [s.deck.at(-1), s.deck[index]];
  s = move(s, { type: "select", index: 0 });
  s = move(s, { type: "guess", guess: "equal" });
  assert.equal(s.result.correct, true);
  assert.equal(s.result.give, 10);
  assert.equal(s.phase, "result");
  assert.ok(validLocalGame(JSON.parse(JSON.stringify(s))));
  assert.throws(() => move(s, { type: "guess", guess: "equal" }));
});
test("wrong equal counts five; other wrong guesses count the previous pile length", () => {
  for (const guess of ["equal", "higher", "lower"]) {
    let s = createLocalGame(["Anne", "Ben"], () => 0.5);
    const { low, high } = pileRange(s.piles[0]);
    const index = s.deck.findIndex((c) =>
      guess === "equal"
        ? c[0] !== low[0]
        : guess === "higher"
          ? cardValue(c) <= cardValue(high)
          : cardValue(c) >= cardValue(low),
    );
    [s.deck[index], s.deck[s.deck.length - 1]] = [s.deck.at(-1), s.deck[index]];
    s = move(s, { type: "select", index: 0 });
    s = move(s, { type: "guess", guess });
    assert.equal(s.result.correct, false);
    assert.equal(s.players[0].sips, guess === "equal" ? 5 : 1);
    assert.equal(s.piles[0].length, 1);
    assert.ok(validLocalGame(s));
  }
});
test("all 48 turns conserve all cards and show the final result before finishing", () => {
  let s = createLocalGame(["Anne", "Ben"]);
  for (let turn = 0; turn < 48; turn++) {
    s = move(s, { type: "select", index: turn % 4 });
    s = move(s, {
      type: "guess",
      guess: ["higher", "lower", "equal"][turn % 3],
    });
    assert.ok(validLocalGame(s));
    assert.equal(s.phase, "result");
    assert.equal(s.deck.length, 47 - turn);
    s = move(s, { type: "next" });
    assert.ok(validLocalGame(s));
  }
  assert.equal(s.phase, "finished");
  assert.throws(() => move(s, { type: "guess", guess: "higher" }));
});
test("invalid saves and stale cross-tab commands are rejected", () => {
  const s = createLocalGame(["Anne"]);
  assert.ok(validLocalGame(s));
  assert.equal(validLocalGame({ ...s, piles: [] }), false);
  assert.equal(validLocalGame({ ...s, deck: [] }), false);
  assert.equal(validLocalGame({ ...s, currentPlayer: -1 }), false);
  assert.throws(
    () => localTransition(s, { type: "select", index: 0, expectedRevision: 3 }),
    /anderen Tab/,
  );
  assert.throws(() => createLocalGame(["Anne", "anne"]), /einmal/);
});
