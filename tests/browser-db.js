// Injected only by browser.mjs; production pages have no test switch or test backend.
(() => {
  const listeners = new Map();
  let nextId = 0;
  const snapshot = (record) => ({
    id: record.path.split("/").at(-1),
    exists: record.value !== null,
    data: () => structuredClone(record.value),
    metadata: { fromCache: !navigator.onLine, hasPendingWrites: false },
  });
  const result = (data, collection) =>
    collection
      ? {
          docs: data.map(snapshot),
          metadata: { fromCache: !navigator.onLine, hasPendingWrites: false },
        }
      : snapshot(data);
  async function bridge(type, data) {
    if (!navigator.onLine)
      throw Object.assign(new Error("Offline"), { code: "unavailable" });
    return window.firestoreBridge(type, data);
  }
  window.notifyTestSnapshot = (id, data) => {
    const listener = listeners.get(id);
    if (listener && navigator.onLine)
      listener.next(result(data, listener.collection));
  };
  class Ref {
    constructor(path, collection = false) {
      this.path = path;
      this.isCollection = collection;
    }
    doc(id) {
      return new Ref(this.path + "/" + id);
    }
    collection(name) {
      return new Ref(this.path + "/" + name, true);
    }
    async get() {
      return snapshot(await bridge("read", { path: this.path }));
    }
    onSnapshot(options, next, error) {
      const id = ++nextId;
      listeners.set(id, { next, error, collection: this.isCollection });
      bridge("subscribe", {
        id,
        path: this.path,
        collection: this.isCollection,
      })
        .then((data) => window.notifyTestSnapshot(id, data))
        .catch(error);
      return () => {
        listeners.delete(id);
        window.firestoreBridge("unsubscribe", { id }).catch(() => {});
      };
    }
  }
  const db = {
    collection: (path) => new Ref(path, true),
    runTransaction: async (work) => {
      for (let attempt = 0; attempt < 20; attempt++) {
        const reads = [],
          writes = [];
        const value = await work({
          get: async (ref) => {
            if (writes.length) throw new Error("Reads must precede writes");
            const data = await bridge("read", { path: ref.path });
            reads.push({ path: ref.path, version: data.version });
            return snapshot(data);
          },
          set: (ref, value) =>
            writes.push({ type: "set", path: ref.path, value }),
          update: (ref, value) =>
            writes.push({ type: "update", path: ref.path, value }),
          delete: (ref) => writes.push({ type: "delete", path: ref.path }),
        });
        if (await bridge("commit", { reads, writes })) return value;
      }
      throw new Error("Too much contention");
    },
  };
  window.firebase = {
    apps: [],
    initializeApp() {
      this.apps.push({});
    },
    firestore: () => db,
  };
})();
