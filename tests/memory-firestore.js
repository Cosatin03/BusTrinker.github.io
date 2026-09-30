// Small MVCC test double: read versions are checked again at atomic commit.
// It deliberately rejects reads after writes, like the Firestore web SDK.
export class MemoryFirestore {
  constructor() {
    this.documents = new Map();
    this.version = 0;
    this.watchers = new Map();
    this.nextWatcher = 0;
    this.retries = 0;
  }
  collection(path) {
    return new Reference(this, path, true);
  }
  read(path, collection = false) {
    if (collection)
      return [...this.documents]
        .filter(
          ([key]) =>
            key.startsWith(path + "/") &&
            key.split("/").length === path.split("/").length + 1,
        )
        .map(([key, record]) => ({ path: key, ...structuredClone(record) }));
    return {
      path,
      ...structuredClone(
        this.documents.get(path) || { value: null, version: 0 },
      ),
    };
  }
  commit(reads, writes) {
    if (
      reads.some(
        (read) =>
          (this.documents.get(read.path)?.version || 0) !== read.version,
      )
    )
      return false;
    for (const write of writes) {
      if (write.type === "delete") this.documents.delete(write.path);
      else {
        const value =
          write.type === "update"
            ? { ...this.documents.get(write.path)?.value, ...write.value }
            : write.value;
        this.documents.set(write.path, {
          value: structuredClone(value),
          version: ++this.version,
        });
      }
    }
    for (const watcher of this.watchers.values()) watcher();
    return true;
  }
  async runTransaction(work) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const reads = [],
        writes = [];
      const result = await work({
        get: async (ref) => {
          if (writes.length)
            throw new Error("Firestore requires all reads before writes");
          const record = this.read(ref.path);
          reads.push({ path: ref.path, version: record.version });
          return snapshot(record);
        },
        set: (ref, value) =>
          writes.push({ type: "set", path: ref.path, value }),
        update: (ref, value) =>
          writes.push({ type: "update", path: ref.path, value }),
        delete: (ref) => writes.push({ type: "delete", path: ref.path }),
      });
      if (this.commit(reads, writes)) return result;
      this.retries++;
    }
    throw new Error("Too much contention");
  }
}
export function snapshot(record) {
  return {
    id: record.path.split("/").at(-1),
    exists: record.value !== null,
    data: () => structuredClone(record.value),
    metadata: { fromCache: false, hasPendingWrites: false },
  };
}
class Reference {
  constructor(db, path, collection = false) {
    Object.assign(this, { db, path, isCollection: collection });
  }
  doc(id) {
    return new Reference(this.db, this.path + "/" + id);
  }
  collection(name) {
    return new Reference(this.db, this.path + "/" + name, true);
  }
  async get() {
    return snapshot(this.db.read(this.path));
  }
  onSnapshot(options, next) {
    const id = ++this.db.nextWatcher;
    const send = () =>
      queueMicrotask(() => {
        if (!this.db.watchers.has(id)) return;
        const value = this.db.read(this.path, this.isCollection);
        next(
          this.isCollection
            ? {
                docs: value.map(snapshot),
                metadata: { fromCache: false, hasPendingWrites: false },
              }
            : snapshot(value),
        );
      });
    this.db.watchers.set(id, send);
    send();
    return () => this.db.watchers.delete(id);
  }
}
