import test from "node:test";
import assert from "node:assert/strict";
import {
  getIdentity,
  loadSession,
  readSaved,
  save,
  removeSaved,
  SESSION_KEY,
} from "../session.js";
function storage() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  return values;
}
test("the device identity survives reload and session deletion does not change it", () => {
  storage();
  const id = getIdentity().id;
  assert.match(id, /^p[a-f0-9]{32}$/);
  assert.equal(getIdentity().id, id);
  save(SESSION_KEY, { roomCode: "ABC123", id, role: "player" });
  assert.equal(loadSession().id, id);
  removeSaved(SESSION_KEY);
  assert.equal(loadSession(), null);
  assert.equal(getIdentity().id, id);
});
test("storage cleared by another tab or corrupted data never resurrect a previous session", () => {
  const values = storage();
  const session = { roomCode: "ABC123", id: getIdentity().id, role: "player" };
  save(SESSION_KEY, session);
  values.delete(SESSION_KEY);
  assert.equal(loadSession(), null);
  save(SESSION_KEY, session);
  values.set(SESSION_KEY, "{invalid");
  assert.equal(loadSession(), null);
  values.set(SESSION_KEY, JSON.stringify({ ...session, roomCode: ["ABC123"] }));
  assert.equal(loadSession(), null);
});
test("blocked storage keeps the current tab usable and reports failed persistence", () => {
  globalThis.localStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(save("blocked-test", { value: 1 }), false);
  assert.deepEqual(readSaved("blocked-test"), { value: 1 });
  removeSaved("blocked-test");
  assert.equal(readSaved("blocked-test"), null);
});
test("failed writes use the latest in-memory state even when old storage is readable", () => {
  storage();
  save("quota-test", { revision: 1 });
  localStorage.setItem = () => {
    throw new Error("quota exceeded");
  };
  assert.equal(save("quota-test", { revision: 2 }), false);
  assert.deepEqual(readSaved("quota-test"), { revision: 2 });
});
test("failed removal cannot resurrect a saved session in the current tab", () => {
  storage();
  save("remove-test", { roomCode: "ABC123" });
  localStorage.removeItem = () => {
    throw new Error("blocked");
  };
  removeSaved("remove-test");
  assert.equal(readSaved("remove-test"), null);
});
