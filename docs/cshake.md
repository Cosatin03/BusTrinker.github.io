# C-Shake: Implementierungsstand

Das bestehende BusTrinker-Repository ist eine statische ES-Module-Anwendung (HTML, CSS, JavaScript, GitHub Pages). C-Shake ist derzeit als **Solo-Prototyp** eingebunden, nicht als vollständiges Firebase-Multiplayer-Spiel. Die Oberfläche zeigt diesen Status explizit an. Keine Mock-Daten geben Multiplayer vor.

## Solo starten

`npm run serve` und `http://localhost:8080/cshake.html` öffnen. Für tatsächliche Smartphone-Sensortests eine HTTPS-Adresse verwenden. In Safari unter iOS wird die Motion-Berechtigung nur über den Klick auf „Bewegungssensor aktivieren“ angefragt. Chrome unter Android benötigt einen kompatiblen Sensor und entsprechende Berechtigungen.

## Shake-Erkennung

`cshake-core.js` exportiert `ShakeDetector` und die Standard-Schwellenwerte. Falls `acceleration` verfügbar ist, verwendet der Detektor gravitationsfreie Werte. Andernfalls wird `accelerationIncludingGravity` über einen zeitabhängigen Tiefpass von der Rohbeschleunigung getrennt. Ein Shake setzt einen Schwellenimpuls nach einer Ruhephase voraus. Ein Cooldown von 180 ms verhindert zusätzliche Zählungen in derselben schnellen Impulsfolge. Die Zeitstempel kommen aus einer monotonen Uhr, nicht aus der Zahl der Sensor-Callbacks. Die Schwellen sind noch **nicht auf iOS und Android kalibriert**; die lokale Solo-Punktzahl ist nicht manipulationssicher.

`npm test` führt auch `tests/cshake.test.js` aus.

## Für die Multiplayer-Abnahme noch erforderlich

1. Eigenständiges Next.js/TypeScript-Modul oder abgesprochene Integration des Stacks in das bestehende Projekt.
2. Firebase Authentication (anonymous), Realtime Database, Firestore, App Check und Emulator-Konfiguration.
3. Cloud Functions für Raumcodes, Join/Leave, Host-Transfer, Präsenz, Ready/Start, autorisierte Rundenzeiten, Shake-Ereignisse, Abschluss und Rematch.
4. RTDB- und Firestore-Regeln, die direkte Client-Schreibzugriffe auf offizielle Punkte, Spielphasen und Ranglisten verbieten.
5. Servervalidierung mit Sequenznummern, Zeitfenster, Obergrenzen, Batch-Einreichung, Deduplizierung und verdächtigen Ergebnissen. Browser-Motiondaten sind grundsätzlich fälschbar.
6. Öffentliche 1:1-Vermittlung, globale und tägliche Bestenlisten sowie persönliche Profile.
7. Browser-/Firebase-Emulator-Tests und reale Tests auf iPhone/Safari und Android/Chrome.
8. Firebase-Projektkonfiguration, Secrets und Deployment von Rules/Functions. **Keine neuen Firebase-Regeln wurden live deployt.**

Die vorhandene BusTrinker-Firestore-Lobby bleibt unangetastet. Niemals pauschal bestehende Firebase-Regeln durch offene Entwicklungsregeln ersetzen.
