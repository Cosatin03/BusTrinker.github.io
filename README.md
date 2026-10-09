# BusTrinker

Statische Spielesammlung für GitHub Pages: BusTrinker mit Firestore-Lobby und Höher / Tiefer an einem gemeinsamen Gerät. Die bestehenden URLs `index.html`, `HoeherTiefer.html` und `rules.html` bleiben erreichbar. Die BusTrinker-Lobby liegt unter `bustrinker.html`.

## Lokal starten

```sh
npm ci
npm run serve
```

`http://localhost:8080` öffnen. Die Website benötigt keinen Build-Schritt. Firebase wird erst in der Online-Lobby geladen; Menü und Höher / Tiefer benötigen keine Datenbankverbindung.

## Prüfen

Node.js 22 oder neuer:

```sh
npm test
npx playwright install chromium
npm run test:browser
```

Die Browsertests starten einen lokalen Webserver und verwenden eine geteilte Firestore-Testimplementierung mit Transaktionskonflikten. Sie schreiben nicht in die produktive Datenbank. Host, Spieler und Display laufen in getrennten Browser-Kontexten. Screenshots werden unter `test-results/` gespeichert. Optional lässt sich mit `BUSTRINKER_BROWSER_EXECUTABLE` ein vorhandenes Chromium angeben.

Die Tests prüfen u. a. doppelte Spielzüge, vollständige Kartenabgaben, gleichzeitige Empfängeraktionen, Kartenbilanz, Beitritt gegen Spielstart, Rundenende, Seitenwechsel, Neuladen, Offline-/Online-Wechsel und Handy-Layouts.

## Aufbau

| Datei                   | Aufgabe                                                 |
| ----------------------- | ------------------------------------------------------- |
| `games.js`              | Spielekatalog mit Links, Suchbegriffen und Spielmodus   |
| `catalog.js`            | Spielauswahl, Filter, Suche und Fortsetzen              |
| `game-core.js`          | Reine, unabhängig testbare BusTrinker-Zustandsübergänge |
| `room-store.js`         | Firestore-Transaktionen und synchronisierte Listener    |
| `script.js`             | Lobby, Wiedereinstieg, Präsenz und Spieloberfläche      |
| `session.js`            | Persistente Gerätekennung und Raumsitzung               |
| `higher-lower-core.js`  | Reine Regeln für Höher / Tiefer                         |
| `higher-lower.js`       | Lokaler Spielstand und Bedienung                        |
| `cards.js`, `style.css` | Gemeinsame Karten und Gestaltung                        |

Weitere Spiele hinzufügen: [docs/adding-games.md](docs/adding-games.md).

## Räume und Wiedereinstieg

Neue Räume verwenden `schemaVersion: 2`. Mitgliedschaft und Spielzustand bleiben unter `rooms/{code}` und `rooms/{code}/players/{playerId}`. Spielernamen sind sichtbare Texte, keine Dokument-IDs. Die zufällige Gerätekennung und die aktive Raumsitzung liegen in `localStorage`. Keine Spielerdaten werden bei `unload` oder einem Tab-Wechsel gelöscht.

Spielzüge lesen den Raum und alle aktuellen Mitglieder innerhalb einer Transaktion. Alle Lesezugriffe erfolgen vor Schreibzugriffen. Aufdecken, Punkte, Pflichtabgaben und Empfangsbestätigungen werden zusammen gespeichert. Ein Rundenzähler/Spielzugschlüssel verhindert, dass Transaktionswiederholungen oder zwei Geräte versehentlich zwei Karten aufdecken. Bestätigungen beziehen sich auf die tatsächlich angezeigte Empfangsrevision.

Eine gemeinsame `stateVersion` verhindert, dass die Oberfläche Raum- und Spielersnapshots aus unterschiedlichen Transaktionen mischt. Alle Listener werden beim Neuverbinden abgemeldet. Fehler beim Netzwerkzugriff löschen die Sitzung nicht. Nach Wiederkehr, `online` oder erneutem Seitenaufruf wird der Serverstand geladen. Aktionen bleiben bis zur Synchronisierung gesperrt.

Ein geöffneter Einladungslink bleibt auch nach einem App- oder Tab-Wechsel sichtbar. Eine zuvor gespeicherte andere Runde wird dort erst über „Runde fortsetzen“ wieder aufgenommen. Schlägt ein lokaler Schreib- oder Löschzugriff fehl, gilt im geöffneten Tab der letzte Stand im Arbeitsspeicher; ein älterer gespeicherter Stand setzt ihn nicht zurück. Nach Schließen des Tabs ist in diesem Fall nur der zuletzt erfolgreich gespeicherte Stand verfügbar.

Ein Hostwechsel ist nach zwei Minuten ohne Präsenzsignal möglich. Präsenz wird nur bei sichtbarer Seite etwa alle 30 Sekunden aktualisiert. Diese Anzeige nutzt die Gerätezeit und ist eine Bedienhilfe, keine serverseitige Verbindungs- oder Sicherheitsgarantie.

## Betrieb und Grenzen

- Das vorhandene Firebase-Projekt und die öffentliche Web-Konfiguration bleiben bestehen. Es wurden keine Firestore-Regeln oder Firebase-Projekteinstellungen ausgerollt. Die aktiven Regeln sind nicht Teil dieses Repositorys und müssen die vorhandenen Raum- und Spielerdokumente einschließlich der neuen Felder zulassen.
- Der Browser schreibt wie bisher direkt in Firestore. Gerätekennung und Display-Code sichern den Wiedereinstieg, sind aber keine Authentifizierung oder Manipulationssperre. Für nicht vertrauenswürdige öffentliche Spielrunden braucht es zusätzlich Firebase Authentication und dazu passende serverseitige Regeln bzw. autoritative Spielaktionen. Insbesondere dürfen offene Regeln nicht als Schutz privater Hände verstanden werden.
- Bereits vor diesem Update gestartete Räume besitzen keine gespeicherte Geräteidentität. Sie werden mit einem erklärenden Hinweis abgewiesen und nicht automatisch verändert. Nach dem Update eine neue Lobby erstellen.
- Wiederaufnahme gilt für denselben Browser mit erhaltenem Website-Speicher. Gelöschter Speicher, Privatmodus-Ende oder ein anderes Gerät können den ursprünglichen Platz nicht automatisch zurückholen.
- Die automatisierten Tests ersetzen keinen abschließenden Test gegen die aktiven Firestore-Regeln. Vor einer Veröffentlichung eine neue Testlobby auf zwei echten Geräten und optional einem Display durchspielen.
