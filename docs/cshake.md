# C-Shake: Implementierungsstand

Das bestehende BusTrinker-Repository ist eine statische ES-Module-Anwendung (HTML, CSS, JavaScript, GitHub Pages). C-Shake bietet einen **Solo-Modus** und einen lokalen **Party Battle** für 2–10 Personen auf einem weitergereichten Smartphone. Beide Modi laufen ohne Firebase. Der gleichzeitige Online-Modus liegt in `cshake-online.html`; globale Bestenlisten sind weiterhin nicht implementiert.

## Solo starten

`npm run serve` und `http://localhost:8080/cshake.html` öffnen. Für tatsächliche Smartphone-Sensortests eine HTTPS-Adresse verwenden. In Safari unter iOS wird die Motion-Berechtigung nur über den Klick auf „Bewegungssensor aktivieren“ angefragt. Chrome unter Android benötigt einen kompatiblen Sensor und entsprechende Berechtigungen.

## Shake-Erkennung

`cshake-core.js` nutzt ausschließlich die **Y-Achse** (Handy aufrecht halten), direkt aus `DeviceMotionEvent.acceleration.y` in m/s². Ist dieser Wert nicht verfügbar, wird `accelerationIncludingGravity.y` mit einem beim ersten Sample erfassten festen Ausgangswert verwendet. Die X- und Z-Achsen werden ignoriert.

Kontinuierliches schnelles Auf-und-ab-Schütteln wird über abwechselnde Richtungsimpulse gezählt: erst zwei aufeinanderfolgende entgegengesetzte Schwellenimpulse ergeben zusammen **einen Punkt** (eine vollständige Auf-und-ab-Bewegung). Der erste Richtungsimpuls allein zählt noch nicht. Es ist keine Ruhephase zwischen Impulsen nötig. Ein Abstand von mindestens 65 ms zwischen akzeptierten Richtungsimpulsen verhindert extreme Doppelzählung; gleichbleibende Beschleunigung erhöht den Zähler nicht. Bei längerer Sensorpause wird auch eine begonnene halbe Bewegung verworfen. Die Grenzwerte sind praktische Startwerte und noch nicht auf realen iOS-/Android-Geräten kalibriert; unterschiedliche Geräte können voneinander abweichen. Die Browserwerte sind nicht manipulationssicher.

`npm test` prüft `tests/cshake.test.js`, einschließlich schneller Richtungswechsel, Achsenauswahl, Schwellenwert und Cooldown.

## Party Battle

Im Spielmodus Party Battle werden 2–10 unterschiedliche Spielernamen zeilenweise eingetragen. Jede Person bekommt nacheinander dieselbe Zeit (10, 20 oder 30 Sekunden), einschließlich 3-Sekunden-Countdown. Währenddessen zählen nur Sensorschüttler im aktiven Zeitfenster. Danach erscheinen Ergebnis und Zwischenstand, am Ende der Sieger. Der lokale Rekord bleibt separat auf dem jeweiligen Gerät. Bei Browser-/App-Wechsel wird die laufende Runde abgebrochen. Es gibt keine Netzwerk-Synchronisation, Serverwertung oder manipulationssichere Bestenliste. Bei ausbleibenden Sensordaten muss die Berechtigung erneut aktiviert werden.

## Für eine spätere Online-Multiplayer-Version noch erforderlich

1. Eigenständiges Next.js/TypeScript-Modul oder abgesprochene Integration des Stacks in das bestehende Projekt.
2. Firebase Authentication (anonymous), Realtime Database, Firestore, App Check und Emulator-Konfiguration.
3. Cloud Functions für Raumcodes, Join/Leave, Host-Transfer, Präsenz, Ready/Start, autorisierte Rundenzeiten, Shake-Ereignisse, Abschluss und Rematch.
4. RTDB- und Firestore-Regeln, die direkte Client-Schreibzugriffe auf offizielle Punkte, Spielphasen und Ranglisten verbieten.
5. Servervalidierung mit Sequenznummern, Zeitfenster, Obergrenzen, Batch-Einreichung, Deduplizierung und verdächtigen Ergebnissen. Browser-Motiondaten sind grundsätzlich fälschbar.
6. Öffentliche 1:1-Vermittlung, globale und tägliche Bestenlisten sowie persönliche Profile.
7. Browser-/Firebase-Emulator-Tests und reale Tests auf iPhone/Safari und Android/Chrome.
8. Firebase-Projektkonfiguration, Secrets und Deployment von Rules/Functions. **Keine neuen Firebase-Regeln wurden live deployt.**

Die vorhandene BusTrinker-Firestore-Lobby bleibt unangetastet. Niemals pauschal bestehende Firebase-Regeln durch offene Entwicklungsregeln ersetzen.

## Gleichzeitiges Online Battle (1–4 Geräte)

`cshake-online.html` und `cshake-online.js` nutzen dieselbe öffentliche Firebase-Webkonfiguration aus `config.js` und den Firestore-Dienst, aber getrennte Dokumente in `cshakeRooms/{code}` mit Spielern unter `players/{deviceId}`. Die vorhandenen BusTrinker-Lobbys unter `rooms` werden nicht verändert.

Ein Host erstellt einen sechsstelligen Raum, weitere Personen treten per Code oder Link bei. Jeder aktiviert seinen Bewegungssensor und signalisiert Bereitschaft. Der Host startet eine Runde erst, wenn alle bereit sind. Firestore `serverTimestamp()` bestimmt den gemeinsamen Start mit vier Sekunden Vorlauf; die Geräte rechnen die Anzeige mit ihrer lokalen Uhr. Diese Methode ist für Partyspiele geeignet, aber **keine millisekundengenaue serverautorisierte Synchronisierung** bei falsch eingestellten Geräteuhren. Jeder Browser erkennt die Schüttler lokal und sendet den aktuellen Punktestand ungefähr alle 650 ms per Firestore-Transaktion. Abschluss und Neustart der Lobby erfolgen über Transaktionen. Ausgefallene Geräte können die Abschlussphase aufhalten; ein Server-Timeout ist noch nicht implementiert.

**Für den produktiven Einsatz ist eine einmalige Firebase-Konfiguration außerhalb des Repositories nötig:** Firestore-Regeln für `cshakeRooms` und deren `players` erstellen. Eine Firebase-Authentication-Anmeldung wird bewusst nicht verwendet. Die bestehenden Regeln für `rooms` dürfen nicht ersetzt oder gelockert werden. Eine reine öffentliche API-Konfiguration gibt keine Zugriffsrechte. Wie in BusTrinker wird eine lokal gespeicherte, zufällige Gerätekennung verwendet (`session.js`). Sie ist kein verifizierter Identitätsnachweis. Firestore-Regeln können ohne Firebase Authentication weder den echten Host noch den tatsächlichen Gerätebesitzer sicher erkennen. Raumregeln sollten trotzdem zulässige Felder, Phasen, Spieleranzahl und Zahlenbereiche begrenzen; manipulationssichere Spieler- und Punkteberechtigungen sind ohne vertrauenswürdige Identität bzw. Serverfunktionen nicht möglich. Eine serverseitig überprüfte Punktwertung erfordert zusätzliche Cloud Functions und ist hier **nicht** vorhanden; browserbasierte Sensorwerte können manipuliert werden. Firestore-Regeln wurden nicht ausgerollt oder auf einer produktiven Firebase-Instanz getestet.

Den Test mit mindestens zwei physischen Handys unter HTTPS durchführen, insbesondere iOS Safari (Berechtigungsdialog), Android Chrome, Hintergrundwechsel, Netzverlust und mehrere gleichzeitig sendende Spieler.
