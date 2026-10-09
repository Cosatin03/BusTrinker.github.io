import { createRoom, transition, SCHEMA_VERSION } from "./game-core.js";

export class RoomStore {
  constructor(db) {
    this.db = db;
  }
  ref(code) {
    return this.db.collection("rooms").doc(code);
  }

  async create(code, actor, nickname) {
    const ref = this.ref(code);
    return this.db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) throw new Error("CODE_COLLISION");
      const state = createRoom(actor.id, nickname);
      tx.set(ref, state.room);
      tx.set(ref.collection("players").doc(actor.id), state.players[actor.id]);
      return state;
    });
  }

  async command(code, actor, command) {
    const ref = this.ref(code);
    return this.db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) throw new Error("Diesen Raum gibt es nicht mehr.");
      const room = doc.data();
      if (room.schemaVersion !== SCHEMA_VERSION)
        throw new Error(
          "Dieser Raum stammt aus einer älteren Version. Bitte erstellt einen neuen Raum.",
        );
      // Membership is read INSIDE the transaction, so join/start/leave cannot race.
      const players = {};
      for (const id of room.playerIds) {
        const player = await tx.get(ref.collection("players").doc(id));
        if (!player.exists)
          throw new Error(
            "Die Spielerdaten sind unvollständig. Bitte verbindet euch erneut.",
          );
        players[id] = player.data();
      }
      const next = transition({ room, players }, actor, command);
      tx.set(ref, next.room);
      for (const id of next.room.playerIds)
        tx.set(ref.collection("players").doc(id), next.players[id]);
      // Membership is defined by room.playerIds. The deployed rules allow
      // writes but reject deletes, so departed lobby records remain inactive.
      // A later lobby join overwrites that player's record with fresh state.
      return next;
    });
  }

  async checkSession(session) {
    const ref = this.ref(session.roomCode);
    const doc = await ref.get({ source: "server" });
    if (!doc.exists || doc.data().status === "closed")
      throw Object.assign(new Error("Diese Lobby existiert nicht mehr."), {
        expired: true,
      });
    const room = doc.data();
    if (room.schemaVersion !== SCHEMA_VERSION)
      throw Object.assign(
        new Error(
          "Dieser Raum verwendet die alte Spielversion. Bitte erstellt eine neue Lobby.",
        ),
        { expired: true },
      );
    if (session.role === "display") {
      if (!room.externalDisplayEnabled)
        throw Object.assign(
          new Error("Der Host hat das externe Display ausgeschaltet."),
          { expired: true },
        );
    } else if (!room.playerIds.includes(session.id)) {
      throw Object.assign(new Error("Du bist nicht mehr in dieser Lobby."), {
        expired: true,
      });
    }
    return room;
  }

  subscribe(code, onState, onError, onConnection) {
    let room,
      players,
      stopped = false;
    let roomFromServer = false,
      playersFromServer = false;
    const publish = () => {
      if (stopped) return;
      const coherent =
        room &&
        players &&
        room.playerIds?.every(
          (id) => players[id]?.stateVersion === room.revision,
        );
      onConnection(Boolean(roomFromServer && playersFromServer && coherent));
      if (coherent) onState({ room, players });
    };
    const ref = this.ref(code);
    const offRoom = ref.onSnapshot(
      { includeMetadataChanges: true },
      (doc) => {
        if (!doc.exists) {
          if (!doc.metadata.fromCache)
            onError(
              Object.assign(new Error("Die Lobby wurde gelöscht."), {
                expired: true,
              }),
            );
          return;
        }
        room = doc.data();
        roomFromServer =
          !doc.metadata.fromCache && !doc.metadata.hasPendingWrites;
        publish();
      },
      onError,
    );
    const offPlayers = ref.collection("players").onSnapshot(
      { includeMetadataChanges: true },
      (snap) => {
        players = Object.fromEntries(
          snap.docs.map((doc) => [doc.id, doc.data()]),
        );
        playersFromServer =
          !snap.metadata.fromCache && !snap.metadata.hasPendingWrites;
        publish();
      },
      onError,
    );
    return () => {
      stopped = true;
      offRoom();
      offPlayers();
    };
  }

  async heartbeat(session) {
    // Transactions fail offline instead of queueing stale presence writes for later.
    const ref = this.ref(session.roomCode);
    await this.db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists || doc.data().status === "closed") return;
      if (session.role === "display") {
        if (doc.data().externalDisplayEnabled)
          tx.update(ref, { displayLastSeen: Date.now() });
      } else if (doc.data().playerIds?.includes(session.id)) {
        tx.update(ref.collection("players").doc(session.id), {
          lastSeen: Date.now(),
        });
      }
    });
  }
}
