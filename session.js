export const SESSION_KEY = "bustrinker.session.v2";
export const IDENTITY_KEY = "bustrinker.identity.v2";
const fallback = new Map();
const failedWrites = new Set();

export function readSaved(key) {
  // A readable but older disk value must not undo a failed write or removal.
  if (failedWrites.has(key)) return fallback.get(key) ?? null;
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return fallback.get(key) || null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
export function save(key, value) {
  fallback.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
    failedWrites.delete(key);
    return true;
  } catch {
    failedWrites.add(key);
    return false;
  }
}
export function removeSaved(key) {
  fallback.delete(key);
  try {
    localStorage.removeItem(key);
    failedWrites.delete(key);
  } catch {
    failedWrites.add(key);
  }
}
export function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return (
    "p" + [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
  );
}
export function getIdentity() {
  const saved = readSaved(IDENTITY_KEY);
  if (typeof saved?.id === "string" && /^p[a-f0-9]{32}$/.test(saved.id)) {
    return {
      id: saved.id,
      nickname: typeof saved.nickname === "string" ? saved.nickname : "",
    };
  }
  const identity = { id: newId(), nickname: "" };
  save(IDENTITY_KEY, identity);
  return identity;
}
export function loadSession() {
  const value = readSaved(SESSION_KEY);
  return value &&
    typeof value.roomCode === "string" &&
    typeof value.id === "string" &&
    /^[A-Z0-9]{6}$/.test(value.roomCode) &&
    ["player", "display"].includes(value.role) &&
    /^p[a-f0-9]{32}$/.test(value.id)
    ? value
    : null;
}
export function normalizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[\s-]/g, "");
}
