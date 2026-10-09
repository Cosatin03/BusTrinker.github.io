import test from "node:test";
import assert from "node:assert/strict";
import { RoomStore } from "../room-store.js";
import { MemoryFirestore } from "./memory-firestore.js";
import { turnKey } from "../game-core.js";
const host = { id: "host", role: "player" },
  guest = { id: "guest", role: "player" };
async function setup() {
  const db = new MemoryFirestore(),
    store = new RoomStore(db);
  await store.create("ABC123", host, "Host");
  await store.command("ABC123", guest, { type: "join", nickname: "Gast" });
  return { db, store };
}
test("simultaneous joins are retried and do not overwrite membership", async () => {
  const { db, store } = await setup();
  await Promise.all(
    ["a", "b", "c"].map((id) =>
      store.command(
        "ABC123",
        { id, role: "player" },
        { type: "join", nickname: id },
      ),
    ),
  );
  assert.equal(db.read("rooms/ABC123").value.playerIds.length, 5);
  assert.ok(db.retries > 0);
});
test("join racing with start either joins before the deal or is rejected with no orphan player", async () => {
  const { db, store } = await setup();
  const [started, joined] = await Promise.allSettled([
    store.command("ABC123", host, { type: "start" }),
    store.command(
      "ABC123",
      { id: "late", role: "player" },
      { type: "join", nickname: "Spät" },
    ),
  ]);
  assert.equal(started.status, "fulfilled");
  const room = db.read("rooms/ABC123").value;
  assert.equal(room.status, "in-game");
  assert.equal(room.playerIds.includes("late"), joined.status === "fulfilled");
  for (const id of room.playerIds)
    assert.ok(db.read(`rooms/ABC123/players/${id}`).value.hand.length > 0);
});
test("simultaneous host and display reveal commit exactly one turn", async () => {
  const { db, store } = await setup();
  await store.command("ABC123", host, {
    type: "settings",
    settings: { cardCount: 32, rowCount: 3 },
    externalDisplayEnabled: true,
  });
  await store.heartbeat({ roomCode: "ABC123", role: "display", id: "display" });
  await store.command("ABC123", host, { type: "start" });
  const expectedTurn = turnKey(db.read("rooms/ABC123").value);
  const results = await Promise.allSettled(
    [host, { role: "display", id: "display" }].map((actor) =>
      store.command("ABC123", actor, {
        type: "reveal",
        source: "pyramid",
        expectedTurn,
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(db.read("rooms/ABC123").value.gameState.turn, 1);
});
test("refresh checks preserve state and listeners are fully cleaned up", async () => {
  const { db, store } = await setup();
  await store.command("ABC123", host, { type: "start" });
  const session = { ...guest, roomCode: "ABC123" };
  const before = structuredClone(db.read("rooms/ABC123/players/guest").value);
  await store.checkSession(session);
  await store.heartbeat(session);
  const after = db.read("rooms/ABC123/players/guest").value;
  assert.deepEqual({ ...after, lastSeen: 0 }, { ...before, lastSeen: 0 });
  let received = 0;
  const off = store.subscribe(
    "ABC123",
    () => received++,
    assert.fail,
    () => {},
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(received > 0);
  assert.equal(db.watchers.size, 2);
  off();
  assert.equal(db.watchers.size, 0);
});
test("missing rooms expire but network errors do not erase sessions", async () => {
  const { store } = await setup();
  await assert.rejects(
    store.checkSession({ ...guest, roomCode: "MISSING" }),
    (error) => error.expired === true,
  );
  store.ref = () => ({
    get: async () => {
      throw Object.assign(new Error("offline"), { code: "unavailable" });
    },
  });
  await assert.rejects(
    store.checkSession({ ...guest, roomCode: "ABC123" }),
    (error) => !error.expired,
  );
});
test("leave and rejoin work when deployed rules reject document deletion", async () => {
  const {db, store} = await setup();
  const original = db.runTransaction.bind(db);
  db.runTransaction = (work) => original(tx => work({
    ...tx,
    delete() { throw Object.assign(new Error("Delete denied"), {code:"permission-denied"}); },
  }));
  await store.command("ABC123", guest, {type:"leave"});
  assert.deepEqual(db.read("rooms/ABC123").value.playerIds, [host.id]);
  await assert.rejects(store.checkSession({...guest, roomCode:"ABC123"}), error => error.expired);
  await store.command("ABC123", guest, {type:"join", nickname:"Gast zurück"});
  assert.equal(db.read("rooms/ABC123/players/guest").value.nickname, "Gast zurück");
  await store.command("ABC123", host, {type:"leave"});
  assert.equal(db.read("rooms/ABC123").value.hostId, guest.id);
  await store.command("ABC123", guest, {type:"leave"});
  assert.equal(db.read("rooms/ABC123").value.status, "closed");
});
