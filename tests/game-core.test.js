import test from "node:test";
import assert from "node:assert/strict";
import {
  createRoom,
  createDeck,
  transition,
  turnKey,
  nextPyramidIndex,
  pendingPlayers,
  validateSettings,
  PRESENCE_TIMEOUT,
} from "../game-core.js";

const actor = (id) => ({ id, role: "player" });
const host = actor("host");
function lobby(count = 3) {
  let state = createRoom("host", "Host", 1_000_000);
  for (let i = 1; i < count; i++)
    state = transition(state, actor(`p${i}`), {
      type: "join",
      nickname: `Spieler ${i}`,
    });
  return state;
}
const play = (state, who, type, extra = {}) =>
  transition(state, who, { type, expectedTurn: turnKey(state.room), ...extra });
function fixture() {
  const state = play(lobby(), host, "start");
  state.room.gameState.pyramid = ["b1", "c1", "d1", "e1", "f1", "a1"].map(
    (cardValue) => ({ cardValue, isRevealed: false }),
  );
  state.room.gameState.discardPile = ["g1"];
  state.players.host.hand = ["a2", "a3", "b2"];
  state.players.p1.hand = ["a4", "c2"];
  state.players.p2.hand = ["h1"];
  return state;
}
test("32/52-card decks contain every card exactly once", () => {
  for (const size of [32, 52]) {
    assert.equal(createDeck(size).length, size);
    assert.equal(new Set(createDeck(size)).size, size);
  }
});
test("dealing keeps all cards, even with ten players, and never creates empty hands", () => {
  for (const count of [32, 52])
    for (let players = 2; players <= 10; players++)
      for (let rows = 3; rows <= 8; rows++) {
        const settings = { cardCount: count, rowCount: rows };
        if (count - (rows * (rows + 1)) / 2 < players) {
          assert.throws(() => validateSettings(settings, players));
          continue;
        }
        let state = play(lobby(players), host, "settings", {
          settings,
          externalDisplayEnabled: false,
        });
        state = play(state, host, "start");
        const cards = [
          ...state.room.gameState.pyramid.map((p) => p.cardValue),
          ...state.room.gameState.discardPile,
          ...Object.values(state.players).flatMap((p) => p.hand),
        ];
        assert.equal(cards.length, count);
        assert.equal(new Set(cards).size, count);
        assert.ok(Object.values(state.players).every((p) => p.hand.length > 0));
      }
});
test("rejoining a started room keeps the exact hand, scores and pending actions", () => {
  let state = play(fixture(), host, "reveal", { source: "pyramid" });
  state = play(state, host, "give", {
    assignments: [
      { card: "a2", target: "p1" },
      { card: "a3", target: "p1" },
    ],
  });
  const before = structuredClone(state);
  state = play(state, actor("p1"), "join", { nickname: "Different name" });
  assert.deepEqual(state, before);
  assert.throws(
    () => play(state, actor("stranger"), "join", { nickname: "Neu" }),
    /Lobby/,
  );
});
test("names are case-insensitively unique and are independent from document paths", () => {
  assert.throws(
    () => play(lobby(), actor("x"), "join", { nickname: "host" }),
    /vergeben/,
  );
  const state = play(lobby(), actor("x"), "join", {
    nickname: "A/B <img src=x>",
  });
  assert.equal(state.players.x.nickname, "A/B <img src=x>");
});
test("only host/display can reveal; discard and out-of-order pyramid reveals are rejected", () => {
  const state = fixture();
  assert.throws(
    () => play(state, actor("p1"), "reveal", { source: "pyramid" }),
    /Host/,
  );
  assert.throws(
    () => play(state, host, "reveal", { source: "discard" }),
    /Pyramide/,
  );
  assert.throws(
    () => play(state, host, "reveal", { source: "pyramid", index: 0 }),
    /markierte/,
  );
  assert.throws(
    () => play(state, { role: "display" }, "reveal", { source: "pyramid" }),
    /gehörst/,
  );
  state.room.externalDisplayEnabled = true;
  assert.equal(
    play(state, { role: "display" }, "reveal", { source: "pyramid" }).room
      .gameState.turn,
    1,
  );
});
test("reveal atomically establishes givers and prevents double clicks or early progression", () => {
  const state = fixture();
  const key = turnKey(state.room);
  const next = play(state, host, "reveal", { source: "pyramid" });
  assert.deepEqual(next.room.gameState.requiredGivers, ["host", "p1"]);
  assert.deepEqual(state.room.gameState.requiredGivers, []);
  assert.throws(
    () =>
      transition(next, host, {
        type: "reveal",
        source: "pyramid",
        expectedTurn: key,
      }),
    /geändert/,
  );
  assert.throws(
    () => play(next, host, "reveal", { source: "pyramid" }),
    /fehlen/,
  );
});
test("must give all matching cards once; no wrong-rank, duplicate, self or unknown recipients", () => {
  const state = play(fixture(), host, "reveal", { source: "pyramid" });
  for (const assignments of [
    [],
    [{ card: "a2", target: "p1" }],
    [
      { card: "a2", target: "p1" },
      { card: "a2", target: "p1" },
    ],
    [
      { card: "a2", target: "p1" },
      { card: "b2", target: "p1" },
    ],
    [
      { card: "a2", target: "host" },
      { card: "a3", target: "p1" },
    ],
    [
      { card: "a2", target: "missing" },
      { card: "a3", target: "p1" },
    ],
  ])
    assert.throws(() => play(state, host, "give", { assignments }));
  const next = play(state, host, "give", {
    assignments: [
      { card: "a2", target: "p1" },
      { card: "a3", target: "p2" },
    ],
  });
  assert.deepEqual(next.players.host.hand, ["b2"]);
  assert.equal(next.players.p1.score, 1);
  assert.equal(next.players.p2.score, 1);
  assert.throws(() => play(next, host, "give", { assignments: [] }), /keine/);
});
test("multiple givers accumulate receipts; an old confirmation cannot acknowledge unseen cards", () => {
  let state = play(fixture(), host, "reveal", { source: "pyramid" });
  state = play(state, host, "give", {
    assignments: [
      { card: "a2", target: "p2" },
      { card: "a3", target: "p2" },
    ],
  });
  const firstReceipt = state.players.p2.receiptRevision;
  state = play(state, actor("p1"), "give", {
    assignments: [{ card: "a4", target: "p2" }],
  });
  assert.equal(state.players.p2.pendingReceipts.length, 2);
  assert.equal(state.players.p2.score, 3);
  assert.throws(
    () =>
      play(state, actor("p2"), "confirm", { receiptRevision: firstReceipt }),
    /weitere/,
  );
  state = play(state, actor("p2"), "confirm", {
    receiptRevision: state.players.p2.receiptRevision,
  });
  assert.deepEqual(pendingPlayers(state), []);
});
test("received cards score again and require an explicit confirmation", () => {
  const base = fixture();
  base.players.p2.receivedCards = ["a4"];
  base.players.p1.hand = [];
  const next = play(base, host, "reveal", { source: "pyramid" });
  assert.equal(next.players.p2.score, 1);
  assert.equal(next.players.p2.pendingReceipts[0].kind, "repeat");
});
test("a selected display must connect before start; host retains reveal control", () => {
  let state = play(lobby(), host, "settings", {
    settings: { cardCount: 32, rowCount: 3 },
    externalDisplayEnabled: true,
  });
  assert.throws(() => play(state, host, "start"), /Bildschirm/);
  state.room.displayLastSeen = Date.now();
  state = play(state, host, "start");
  assert.equal(
    play(state, host, "reveal", { source: "pyramid" }).room.gameState.turn,
    1,
  );
});
test("host departure transfers leadership and the final departure closes the lobby", () => {
  let state = play(lobby(2), host, "leave");
  assert.equal(state.room.hostId, "p1");
  assert.equal(state.players.host, undefined);
  state = play(state, actor("p1"), "leave");
  assert.equal(state.room.status, "closed");
});
test("host takeover only works after absence and leaves cards intact", () => {
  const state = fixture();
  state.players.host.lastSeen = Date.now();
  assert.throws(() => play(state, actor("p1"), "claim-host"), /verbunden/);
  state.players.host.lastSeen -= PRESENCE_TIMEOUT + 1;
  const next = play(state, actor("p1"), "claim-host");
  assert.equal(next.room.hostId, "p1");
  assert.deepEqual(next.players.host.hand, state.players.host.hand);
});
test("a whole round finishes only after final receipts and can restart without stale scores", () => {
  for (const count of [2, 3, 10]) {
    let state = play(lobby(count), host, "start");
    let turns = 0;
    while (state.room.status === "in-game") {
      assert.ok(turns++ < 60);
      const before = structuredClone(state);
      const index = nextPyramidIndex(state.room);
      state = play(state, host, "reveal", {
        source: index >= 0 ? "pyramid" : "discard",
      });
      assert.equal(
        state.room.gameState.currentPoints,
        index >= 3 ? 1 : index >= 1 ? 2 : index === 0 ? 3 : 1,
      );
      for (const giver of state.room.gameState.requiredGivers) {
        const target = state.room.playerIds.find((id) => id !== giver);
        const assignments = state.players[giver].hand
          .filter((c) => c[0] === state.room.gameState.currentTrigger[0])
          .map((card) => ({ card, target }));
        state = play(state, actor(giver), "give", { assignments });
      }
      for (const id of state.room.playerIds)
        if (state.players[id].pendingReceipts.length)
          state = play(state, actor(id), "confirm", {
            receiptRevision: state.players[id].receiptRevision,
          });
      for (const id of state.room.playerIds)
        assert.ok(state.players[id].score >= before.players[id].score);
      const gs = state.room.gameState;
      const cards = [
        ...gs.pyramid.map((c) => c.cardValue),
        ...gs.discardPile,
        ...gs.revealedDiscard,
        ...Object.values(state.players).flatMap((p) => [
          ...p.hand,
          ...p.receivedCards,
        ]),
      ];
      assert.equal(new Set(cards).size, 32);
      assert.equal(cards.length, 32);
    }
    assert.equal(state.room.status, "finished");
    assert.deepEqual(pendingPlayers(state), []);
    state = play(state, host, "new-round");
    assert.equal(state.room.status, "lobby");
    assert.ok(
      Object.values(state.players).every(
        (p) => p.score === 0 && p.receivedCards.length === 0,
      ),
    );
    state = play(state, host, "start");
    assert.equal(state.room.roundNumber, 2);
  }
});
