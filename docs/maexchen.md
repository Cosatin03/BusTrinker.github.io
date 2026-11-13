# Mäxchen

`maexchen.html` ergänzt den Katalog um ein Online-Spiel für 2–10 Personen mit sechsstelligen Raumcodes und Einladungslinks. Die Raumdaten liegen separat in `maexchenRooms/{code}`; bestehende BusTrinker- und C-Shake-Räume werden nicht geändert.

## Regeln

Ansagen müssen strikt steigen: 31, 32, 41, 42, 43, 51, 52, 53, 54, 61, 62, 63, 64, 65, 1er-Pasch, 2er-Pasch, 3er-Pasch, 4er-Pasch, 5er-Pasch, 6er-Pasch, 21 (Mäxchen). Beim Anzweifeln reicht ein tatsächlicher Wurf mindestens in Höhe der Ansage. Die verlierende Person erhält einen Schluck. Anschließend beginnt die nächste Person in der Spielreihenfolge die neue Runde. Ein angezweifeltes Mäxchen zählt zwei; ein ohne Aufdecken akzeptiertes Mäxchen einen. Die Zähler lassen sich auch als alkoholfreie Punkte verwenden.

## Technik und Wiederverbindung

Three.js 0.180.0 rendert lokal gebündelte Würfel. Cannon-es 0.20.0 simuliert Box-Körper, Boden, Banden, Schwerkraft, Reibung, Rückprall, Drehimpuls und Würfel-Würfel-Kollisionen in festen 1/120-Sekunden-Schritten. Die Augenzahl wird erst nach Stillstand anhand der nach oben gerichteten Flächennormale gelesen. Schräglagen und Zeitüberschreitungen erzeugen einen erneuten Wurfversuch; es gibt kein vorab ausgewähltes Ergebnis oder nachträgliches Drehen auf einen Zielwert. Beim Neuladen und Aufdecken wird das gespeicherte Ergebnis statisch dargestellt.

Jeder Zug läuft atomar über eine Firestore-Transaktion mit Revisions-, Mitgliedschafts-, Rollen- und Phasenprüfung. Der eigene Wurf und eine zufällige Nonce werden vor dem Absenden lokal gespeichert. Öffentlich ist bis zum Aufdecken nur SHA-256 über `{dice,nonce}`. Der Store prüft beim Aufdecken den Hash. Andere Geräte erhalten vor dem Aufdecken keine Augenzahlen. Ein Browser-Neuladen verwendet dieselbe Gerätekennung und den gespeicherten Wurf. Bitte den lokalen Speicher während einer Runde nicht löschen.

Ein regulärer Austritt setzt den Raum in die Lobby zurück und übergibt bei Bedarf die Hostrolle. Verbindungsabbrüche behalten den Zug bei. Fehlt ein Gerät samt verdecktem Wurf dauerhaft, kann der Host die Runde ohne Wertung zurücksetzen. Ein dauerhaft ausgefallener Host wird nicht automatisch ersetzt; in diesem Fall einen neuen Raum erstellen.

## Firebase-Einrichtung vor Veröffentlichung

Die Firebase-Webkonfiguration aus `config.js` wird wiederverwendet. Zusätzlich muss das vorhandene Firebase-Projekt Lesen, Erstellen und Aktualisieren der Dokumente `maexchenRooms/{code}` erlauben. Löschzugriffe und Unterkollektionen werden nicht benötigt. Bestehende Regeln für `rooms` und `cshakeRooms` unverändert lassen. Das Repository enthält weder deploybare Bestandsregeln noch administrative Firebase-Zugangsdaten. Deshalb wurden keine produktiven Regeln geändert und der Livezugriff nicht verifiziert. Bei fehlender Freigabe zeigt das Spiel eine konkrete Fehlermeldung.

Wie die vorhandenen Spiele verwendet Mäxchen eine lokale Gerätekennung ohne Firebase Authentication. Die Prüfungen und der Commitment-Vergleich laufen im Client, nicht in einer vertrauenswürdigen Serverfunktion. Dies schützt den normalen Spielablauf vor versehentlichen Rennen und verrät anderen regulären Clients keine Würfel; es ist kein manipulationssicheres Wettkampfsystem. Für serverseitig erzwungene Zugrechte wären Firebase Authentication, validierte Regeln und eine serverseitige Spiellogik nötig. Keine pauschalen offenen Datenbankregeln für das gesamte Projekt setzen.

## Tests

`npm test` prüft Rangfolge, Phasen, Anzweifeln, Mäxchen, Hostwechsel, Transaktionsrennen, manipulierte Aufdeckungen und 100 physikalische Würfe. `node tests/maexchen-browser.mjs` verwendet zwei isolierte Browserkontexte, echte WebGL-Würfel und die vorhandene In-Memory-Firestore-Testbrücke: Lobby, verdeckter Wurf, Neuladen, Ansage, Aufdecken, identisches Ergebnis, Wiederverbindung, Hostwechsel und schmale Displays. Dieser Test gehört auch zu `npm run test:browser` und dem bestehenden CI-Workflow.
