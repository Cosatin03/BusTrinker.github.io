# Ein weiteres Spiel hinzufügen

1. Eine eigene HTML-Seite und ein eigenes ES-Modul für die Bedienung anlegen. `style.css`, `cards.js` und die Navigation zur Spielesammlung können gemeinsam verwendet werden.
2. Die Regeln in ein separates Modul schreiben, das ohne DOM und Netzwerk auskommt. Bei lokalen Spielen Zustand nach jeder Aktion speichern; bei Online-Spielen Änderungen atomar speichern und das Spiel bzw. seine Schemaversion im Raum kennzeichnen.
3. In `games.js` einen Eintrag ergänzen:

```js
{
  id: 'mein-spiel',
  title: 'Mein Spiel',
  subtitle: 'KURZE BESCHREIBUNG',
  mode: 'local', // 'online' für eigene Geräte mit Lobby
  players: '2–8 Spieler',
  duration: 'Ein Gerät',
  href: 'mein-spiel.html',
  rules: 'rules.html#mein-spiel',
  description: 'Was macht ihr in dieser Runde?',
  tags: ['Karten', 'Reihum'],
  illustration: 'higher-lower', // vorhandene Illustration oder Renderer ergänzen
  color: 'peach', // alternativ 'mint'
  cta: 'Spiel starten'
}
```

Der Katalog übernimmt den Eintrag automatisch in Suche, Filter und Spielanzahl. In `rules.html` einen Abschnitt mit der passenden ID ergänzen und die neue URL in `sitemap.xml` eintragen.

BusTrinker-Räume sind derzeit ausschließlich für BusTrinker vorgesehen. Ein neues Online-Spiel darf dessen `gameState` nicht ungeprüft wiederverwenden; lieber eine eigene Engine und eine eigene Raumschemaversion anlegen.

Für Spielregeln Regressionstests unter `tests/*.test.js` hinzufügen. Prüfen: Neustart, Neuladen in jeder Spielphase, ungültige/doppelte Aktionen, leeres Deck, schmale Displays, lange Namen und Tastaturbedienung. Benutzereingaben über `textContent` oder `element()` ausgeben, niemals als HTML einsetzen.
