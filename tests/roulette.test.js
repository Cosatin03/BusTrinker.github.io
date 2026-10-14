import test from "node:test";
import assert from "node:assert/strict";
import {
  BETS,
  WHEEL,
  betById,
  color,
  createGame,
  drawNumber,
  transition,
  validGame,
} from "../roulette-core.js";
const act = (s, c) => transition(s, { ...c, revision: s.revision });
function spin(s, n = 0) {
  while (s.ready.some((v) => !v)) s = act(s, { type: "ready" });
  s = act(s, { type: "spin", outcome: n, now: 1000 });
  return act(s, { type: "settle", now: 14000 });
}
test("European wheel, 10:1 straight bets and standard combination payouts", () => {
  assert.equal(new Set(WHEEL).size, 37);
  assert.equal(WHEEL.length, 37);
  assert.equal(WHEEL.filter((n) => color(n) === "red").length, 18);
  assert.equal(BETS.length, new Set(BETS.map((b) => b.id)).size);
  for (const b of BETS) {
    assert.equal(b.odds, b.kind === "straight" ? 10 : 36 / b.numbers.length - 1);
    assert.equal(new Set(b.numbers).size, b.numbers.length);
    assert.ok(b.numbers.every((n) => WHEEL.includes(n)));
    for (let outcome = 0; outcome <= 36; outcome++) {
      let s = createGame(["A"]);
      s = act(s, { type: "bet", id: b.id, amount: 3 });
      s = spin(s, outcome);
      assert.equal(
        s.settlement[0].give,
        b.numbers.includes(outcome) ? 3 * b.odds : 0,
        `${b.id} at ${outcome}`,
      );
      assert.equal(s.settlement[0].drink, b.numbers.includes(outcome) ? 0 : 3);
    }
  }
  assert.deepEqual(betById.get("firstfour").numbers, [0, 1, 2, 3]);
  for (const b of BETS.filter((b) =>
    ["outside", "dozen", "column"].includes(b.kind),
  ))
    assert.ok(!b.numbers.includes(0));
  assert.equal(BETS.filter((b) => b.kind === "split").length, 60);
});
test("minimum, accumulated stakes, removing, pass, ready and closed bets", () => {
  let s = createGame(["A", "B"]);
  assert.throws(() => act(s, { type: "bet", id: "red", amount: 2 }));
  assert.throws(() => act(s, { type: "bet", id: "fake", amount: 3 }));
  assert.throws(() => act(s, { type: "bet", id: "red", amount: 3.5 }));
  assert.throws(() => act(s, { type: "spin", outcome: 3, now: 1000 }));
  s = act(s, { type: "bet", id: "red", amount: 3 });
  s = act(s, { type: "bet", id: "red", amount: 6 });
  assert.equal(s.bets[0].amount, 9);
  s = act(s, { type: "ready" });
  assert.equal(s.current, 1);
  s = act(s, { type: "ready" });
  assert.throws(() => act(s, { type: "bet", id: "red", amount: 3 }));
  s = act(s, { type: "spin", outcome: 3, now: 1000 });
  assert.throws(() => act(s, { type: "remove" }));
  assert.throws(() => act(s, { type: "spin", outcome: 4, now: 1000 }));
  assert.throws(() => act(s, { type: "settle", now: 8999 }));
  const reloaded = JSON.parse(JSON.stringify(s));
  assert.ok(validGame(reloaded));
  s = act(reloaded, { type: "settle", now: 9000 });
  assert.equal(s.outcome, 3);
  assert.equal(s.settlement[0].give, 9);
  assert.equal(s.settlement[1].give, 0);
  assert.throws(() => act(s, { type: "settle", now: 20000 }));
});
test("net odds, caps, losses, split allocation, confirmations and next round", () => {
  let s = createGame(["A", "B", "C"], {
    minimum: 3,
    lossMultiplier: 2,
    winCap: 20,
    lossCap: 4,
  });
  s = act(s, { type: "bet", id: "n1", amount: 3 });
  s = act(s, { type: "bet", id: "black", amount: 3 });
  s = spin(s, 1);
  assert.equal(s.settlement[0].rawWin, 30);
  assert.equal(s.settlement[0].give, 20);
  assert.equal(s.settlement[0].drink, 4);
  assert.throws(() => act(s, { type: "next" }));
  assert.throws(() => act(s, { type: "give", from: 0, to: 1, amount: 21 }));
  s = act(s, { type: "give", from: 0, to: 1, amount: 7 });
  s = act(s, { type: "confirm", player: 1 });
  s = act(s, { type: "give", from: 0, to: 1, amount: 1 });
  assert.equal(s.settlement[1].confirmed, false);
  assert.equal(s.settlement[1].drink - s.settlement[1].acknowledged, 1);
  s = act(s, { type: "give", from: 0, to: 2, amount: 12 });
  assert.equal(s.players[0].given, 20);
  assert.equal(s.players[1].drank, 8);
  for (let player = 0; player < 3; player++)
    s = act(s, { type: "confirm", player });
  s = act(s, { type: "next" });
  assert.equal(s.round, 2);
  assert.deepEqual(s.bets, []);
  assert.equal(s.players[0].drank, 4);
  assert.deepEqual(s.history, [1]);
});
test("solo self allocation and waiving winnings; zero loses even/red", () => {
  let s = createGame(["Solo"]);
  s = act(s, { type: "bet", id: "n0", amount: 3 });
  s = act(s, { type: "bet", id: "even", amount: 3 });
  s = spin(s, 0);
  assert.equal(s.settlement[0].give, 30);
  assert.equal(s.settlement[0].drink, 3);
  s = act(s, { type: "give", from: 0, to: 0, amount: 2 });
  s = act(s, { type: "waive", player: 0 });
  s = act(s, { type: "confirm", player: 0 });
  s = act(s, { type: "next" });
  assert.equal(s.players[0].drank, 5);
});
test("unbounded roster, invalid settings/state and stale revisions", () => {
  assert.equal(
    createGame(Array.from({ length: 250 }, (_, i) => `Player ${i}`)).players
      .length,
    250,
  );
  for (const names of [[], ["A", "a"], [" "]])
    assert.throws(() => createGame(names));
  for (const options of [
    { minimum: 0 },
    { minimum: NaN },
    { lossCap: -1 },
    { duration: 0 },
    { winCap: 1.2 },
  ])
    assert.throws(() => createGame(["A"], options));
  let s = createGame(["A"]);
  assert.ok(validGame(s));
  assert.equal(validGame({ ...s, current: 9 }), false);
  assert.equal(
    validGame({ ...s, bets: [{ player: 0, id: "x", amount: 3 }] }),
    false,
  );
  assert.throws(() => transition(s, { type: "ready", revision: 9 }));
  assert.throws(() =>
    transition(s, { type: "ready", revision: s.revision, gameId: "old-game" }),
  );
  s = act(s, { type: "ready" });
  assert.throws(() => act(s, { type: "spin", outcome: 0, now: 1 }));
});
test("random selection rejects biased tail before mapping 37 equal outcomes", () => {
  let calls = 0;
  const fake = {
    getRandomValues(buffer) {
      buffer[0] = calls++ === 0 ? 0xffffffff : 36;
      return buffer;
    },
  };
  assert.equal(drawNumber(fake), 36);
  assert.equal(calls, 2);
});

test("transfer sources persist, old saves still load and next round clears the ledger", () => {
  let s = createGame(["A", "B"]);
  s = act(s, { type: "bet", id: "red", amount: 3 });
  s = spin(s, 1);
  const old = structuredClone(s);
  delete old.transfers;
  assert.ok(validGame(old));
  s = act(old, { type: "give", from: 0, to: 1, amount: 1 });
  s = act(s, { type: "confirm", player: 1 });
  s = act(s, { type: "give", from: 0, to: 1, amount: 1 });
  assert.deepEqual(s.transfers, [
    { from: 0, to: 1, amount: 1 },
    { from: 0, to: 1, amount: 1 },
  ]);
  assert.ok(validGame(JSON.parse(JSON.stringify(s))));
  assert.equal(s.settlement[1].drink - s.settlement[1].acknowledged, 1);
  assert.equal(
    validGame({ ...s, transfers: [{ from: 0, to: 99, amount: 1 }] }),
    false,
  );
  s = act(s, { type: "waive", player: 0 });
  s = act(s, { type: "confirm", player: 1 });
  s = act(s, { type: "next" });
  assert.deepEqual(s.transfers, []);
});
