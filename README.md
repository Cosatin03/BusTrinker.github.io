# BusTrinker

Statische Spielesammlung für GitHub Pages: BusTrinker mit Firestore-Lobby sowie Höher / Tiefer und Roulette an einem gemeinsamen Gerät. Die bestehenden URLs `index.html`, `HoeherTiefer.html` und `rules.html` bleiben erreichbar. Die BusTrinker-Lobby liegt unter `bustrinker.html`.

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

Beim ausdrücklichen Verlassen der Lobby wird die Gerätekennung aus `room.playerIds` entfernt. Das nicht mehr aktive Spielerdokument bleibt bestehen, da die aktiven Firebase-Regeln das Löschen ablehnen. Ein erneuter Lobbybeitritt überschreibt es mit einem frischen Zustand. Verlässt die letzte Person die Lobby, erhält der Raum den Status `closed`.

Spielzüge lesen den Raum und alle aktuellen Mitglieder innerhalb einer Transaktion. Alle Lesezugriffe erfolgen vor Schreibzugriffen. Aufdecken, Punkte, Pflichtabgaben und Empfangsbestätigungen werden zusammen gespeichert. Ein Rundenzähler/Spielzugschlüssel verhindert, dass Transaktionswiederholungen oder zwei Geräte versehentlich zwei Karten aufdecken. Bestätigungen beziehen sich auf die tatsächlich angezeigte Empfangsrevision.

Eine gemeinsame `stateVersion` verhindert, dass die Oberfläche Raum- und Spielersnapshots aus unterschiedlichen Transaktionen mischt. Alle Listener werden beim Neuverbinden abgemeldet. Fehler beim Netzwerkzugriff löschen die Sitzung nicht. Nach Wiederkehr, `online` oder erneutem Seitenaufruf wird der Serverstand geladen. Aktionen bleiben bis zur Synchronisierung gesperrt.

Ein geöffneter Einladungslink bleibt auch nach einem App- oder Tab-Wechsel sichtbar. Eine zuvor gespeicherte andere Runde wird dort erst über „Runde fortsetzen“ wieder aufgenommen. Schlägt ein lokaler Schreib- oder Löschzugriff fehl, gilt im geöffneten Tab der letzte Stand im Arbeitsspeicher; ein älterer gespeicherter Stand setzt ihn nicht zurück. Nach Schließen des Tabs ist in diesem Fall nur der zuletzt erfolgreich gespeicherte Stand verfügbar.

Ein Hostwechsel ist nach zwei Minuten ohne Präsenzsignal möglich. Präsenz wird nur bei sichtbarer Seite etwa alle 30 Sekunden aktualisiert. Diese Anzeige nutzt die Gerätezeit und ist eine Bedienhilfe, keine serverseitige Verbindungs- oder Sicherheitsgarantie.

## Betrieb und Grenzen

- Das vorhandene Firebase-Projekt und die öffentliche Web-Konfiguration bleiben bestehen. Es wurden keine Firestore-Regeln oder Firebase-Projekteinstellungen ausgerollt. Die aktiven Regeln sind nicht Teil dieses Repositorys und müssen die vorhandenen Raum- und Spielerdokumente einschließlich der neuen Felder zulassen.
- Der Browser schreibt wie bisher direkt in Firestore. Gerätekennung und Display-Code sichern den Wiedereinstieg, sind aber keine Authentifizierung oder Manipulationssperre. Für nicht vertrauenswürdige öffentliche Spielrunden braucht es zusätzlich Firebase Authentication und dazu passende serverseitige Regeln bzw. autoritative Spielaktionen. Insbesondere dürfen offene Regeln nicht als Schutz privater Hände verstanden werden.
- Bereits vor diesem Update gestartete Räume besitzen keine gespeicherte Geräteidentität. Sie werden mit einem erklärenden Hinweis abgewiesen und nicht automatisch verändert. Nach dem Update eine neue Lobby erstellen.
- Wiederaufnahme gilt für denselben Browser mit erhaltenem Website-Speicher. Gelöschter Speicher, Privatmodus-Ende oder ein anderes Gerät können den ursprünglichen Platz nicht automatisch zurückholen.
- Am 9. Oktober 2026 wurde eine vollständige Runde mit dem Firebase-SDK gegen die aktiven Regeln geprüft: Beitritt, Display, Start, Listener, Wiederaufnahme, Offline-/Online-Wechsel, konkurrierendes Aufdecken, Abgaben, Bestätigungen und Neustart. Mobile Browserabläufe werden zusätzlich mit getrennten Testkontexten geprüft; der Live-SDK-Test ersetzt keinen Test auf physischen Handys.

## Roulette

`roulette.html` ist ein lokales Spiel für mindestens eine Person ohne feste Spielergrenze. `roulette-core.js` enthält die vollständigen europäischen Setzfelder und Zustandsübergänge, `roulette.js` Bedienung und Speicherung, `roulette-scene.js` die feste Three.js-Kamera, Rad, Kugel und Jetons. Einzelne Zahlen einschließlich Zero gewinnen 10:1; die übrigen Wetten verwenden die üblichen Nettoquoten von 17:1 bis 1:1; gewonnene Einsätze werden nicht als zusätzliche Schlücke gezählt. Zero verliert auf allen Außenwetten. Gewinn- und Verlustgrenzen sind optional und standardmäßig aus.

Die zufällige Zahl wird vor der Animation mit Web Crypto und Rejection Sampling gleichverteilt gewählt und zusammen mit dem Startzeitpunkt gespeichert. Animation und Ergebnis benutzen dieselbe Zahl. Neuladen würfelt nicht erneut; das Abrechnen und Zuteilen ist revisionsgesichert. Web Locks serialisieren Aktionen mehrerer Tabs, soweit vom Browser unterstützt. Spielerzahl ist nur durch Gerätespeicher/Browser begrenzt. Der Zahlenbereich ist endlich; Einsätze sind auf 10.000 je Feld begrenzt.

Three.js 0.180.0 wird inklusive MIT-Lizenz unter `vendor/three/` ausgeliefert. Es sind weder CDN-Zugriff noch Build-Schritt nötig. Zur Aktualisierung die festgelegte npm-Version ändern und `three.module.min.js`, `three.core.min.js` sowie `LICENSE` aus dem Paket übernehmen. WebGL-Fehler blockieren die Spielregeln nicht. Reduzierte Bewegung wird respektiert; Sound ist standardmäßig aus und startet erst nach einer Benutzeraktion.

### Gemeinsamer Roulette-Tisch

Rad und Setzfeld stehen übereinander auf derselben Filzfläche. Das Setzfeld bleibt beim Drehen und im Ergebnis sichtbar und gesperrt. Farbige Jetons kennzeichnen jeden Spieler, auch auf den Zahlen von Kombinationswetten. Die dauerhaft sichtbare Übersicht „Alle Wetten“ zeigt jede einzelne Wette mit Spieler, Feld, Einsatz und Quote, ohne Filter auf die gerade aktive Person.

`roulette-motion.js` berechnet die reproduzierbare Dreh- und Kugelbewegung: Radrotation mit fortlaufender Verzögerung, gegenläufige Kugel in der Laufbahn, Fallphase, Abpraller und Mitnahme im ausgewählten Fach. Es handelt sich um eine animierte Bewegungsbahn, nicht um eine vollständige Starrkörper-Physik. Die Zufallszahl bleibt vorab gleichverteilt gewählt und gespeichert. Neuladen setzt dieselbe Bewegung fort; reine Anzeigeaktionen starten sie nicht neu.

### Gewinne und Empfang

Die Ergebnisphase steht vor dem Setzfeld. Ein Gewinnpanel zeigt den verbleibenden Betrag und den Verteilfortschritt. Empfänger werden direkt als Spielerkarten ausgewählt; Mengen lassen sich über Zähler, Schnellwerte oder freie Eingabe bestimmen. Daneben zeigen Empfangskarten offene Schlücke getrennt von bereits bestätigten Mengen, eigenen verlorenen Einsätzen und Zuteilungen anderer Spieler. Jede Verteilung erzeugt eine visuelle Rückmeldung.

Ein optionales `transfers`-Protokoll speichert pro Runde Absender, Empfänger und Menge. Alte Spielstände bleiben gültig; vorherige Zuteilungen ohne Protokoll werden als solche angezeigt. Nach einem Neuladen bleiben Verteilreste, Quellen und Bestätigungen erhalten. Beim Rundenwechsel wird das Protokoll geleert.

### Rutschen & Leitern

`ladders.html` ist ein lokales Spiel ab einer Person: 20–120 Felder, bis zu je
zehn Rutschen und Leitern, drei Zielregeln und optionaler Extrazug bei einer Sechs.
102 Aufgaben aus vier Kategorien werden ohne Wiederholung innerhalb des jeweiligen
Pools gezogen. Eigene Zeilen ersetzen einen Kategoriepool; feste Feldaufgaben
überschreiben den zufälligen Aufgabenbezug. Aufgaben und Duelle werden am Tisch
beurteilt. Sie verändern Positionen nicht automatisch und können übersprungen werden.

Die reine Logik liegt in `ladders-core.js`; die lokal geladene Three.js-Szene in
`ladders-scene.js` verwendet eine feste orthografische Kamera. Ergebnisse werden
vor der Animation gespeichert. Ohne WebGL ist ein bedienbares Ersatzbrett verfügbar.
`tests/ladders.test.js` prüft Bewegung, Endbedingungen und Aufgabenstapel;
`tests/ladders-browser.mjs` prüft 3D, mobile Darstellung, Wiederaufnahme,
Tab-Synchronisierung, eigene Aufgaben, Sammlung und einen vollständigen Spielabschluss.
