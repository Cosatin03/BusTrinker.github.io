export const MODES = {
  normal: {
    label: "Normal",
    icon: "✦",
    description: "Geschichten, Duelle und Partyaufgaben.",
  },
  hardcore: {
    label: "Hardcore",
    icon: "⚡",
    description: "Zeitdruck, direkte Fragen und mutige Auftritte.",
  },
  sexy: {
    label: "Hot",
    icon: "♥",
    description: "Ab 18: Flirts, Herzklopfen und freiwillige Nähe.",
  },
  crazy: {
    label: "Verrückt",
    icon: "✳",
    description: "Absurde Rollen, Improtheater und Chaos-Duelle.",
  },
  weird: {
    label: "Weird",
    icon: "◈",
    description: "Skurrile Fragen, unmögliche Regeln und schräge Denkduelle.",
  },
};
const list = (text) =>
  text
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
export const TERM_POOLS = {
  rhymes: list(
    "Haus|Maus|Hand|Land|Baum|Traum|Nacht|Macht|Zeit|Kleid|Licht|Sicht|Wind|Kind|Meer|Bär|Stein|Wein|Brot|Boot|Hut|Mut|Stern|Kern|Ball|Fall|Tisch|Fisch|Schnee|Tee|Tor|Ohr|Haar|Jahr|Blick|Glück|Herz|Schmerz|Welt|Geld|Glas|Gras|Sand|Band|Wand|Strand|Regen|Segen|Sonne|Tonne|Blume|Krume|Rose|Dose|Katze|Tatze|Mund|Hund|Nase|Hase|Bein|Schwein|Topf|Kopf|Bett|Brett|Stuhl|Pool|Buch|Tuch|Schrank|Bank|Mann|Kahn|Frau|Pfau|Weg|Steg|Berg|Zwerg|See|Fee|Laus|Klaus|Ring|Ding|Turm|Wurm|Kuss|Fluss|Bauch|Rauch|Saal|Wal|Reis|Eis|Kamm|Lamm|Zelt|Held",
  ),
  categories: list(
    "Obstsorten|Gemüsesorten|Hauptstädte|Europäische Länder|Afrikanische Länder|Asiatische Länder|Inseln|Flüsse|Berge|Seen|Säugetiere|Vögel|Fische|Insekten|Haustiere|Dinosaurier|Bäume|Blumen|Kräuter|Gewürze|Pastaformen|Käsesorten|Brotsorten|Eissorten|Kuchen|Suppen|Frühstückssachen|Pizzabeläge|Alkoholfreie Getränke|Süßigkeiten|Sportarten|Olympische Disziplinen|Ballsportarten|Wintersportarten|Musikinstrumente|Musikgenres|Bands|Solokünstler|Lieder mit Farben im Titel|Filme|Serien|Zeichentrickfiguren|Superhelden|Märchenfiguren|Bücher|Brettspiele|Kartenspiele|Videospiele|Kinderspiele|Berufe|Werkzeuge|Küchengeräte|Dinge im Badezimmer|Dinge im Büro|Dinge im Rucksack|Kleidungsstücke|Schuharten|Kopfbedeckungen|Schmuckstücke|Fahrzeuge|Automarken|Verkehrszeichen|Dinge am Bahnhof|Dinge am Flughafen|Urlaubsziele|Campingausrüstung|Strandutensilien|Museumsarten|Sehenswürdigkeiten|Sprachen|Wörter mit Doppelbuchstaben|Wörter mit drei Silben|Wörter mit X|Wörter mit Z|Redewendungen|Sprichwörter|Vornamen mit A|Vornamen mit M|Nachnamen aus Berufen|Farbtöne|Materialien|Formen|Geräusche|Gerüche|Wetterphänomene|Planeten|Sternzeichen|Erfindungen|Schulfächer|Studienfächer|Hobbys|Dinge mit Rädern|Dinge mit Knöpfen|Dinge aus Holz|Dinge aus Metall|Dinge im Kühlschrank|Dinge im Garten|Dinge auf einer Bühne|Dinge auf einem Markt|Dinge, die schwimmen",
  ),
  objects: list(
    "Toaster|Gummiente|Regenschirm|Teebeutel|Staubsauger|Korkenzieher|Kochlöffel|Wäscheklammer|Schneebesen|Radiergummi|Zahnbürste|Wecker|Schlüssel|Blumentopf|Sonnenbrille|Fahrradhelm|Thermoskanne|Kissen|Pantoffel|Fernbedienung|Locher|Klebeband|Taschenlampe|Seifenblase|Briefmarke|Serviette|Büroklammer|Suppenteller|Wärmflasche|Würfel",
  ),
  words: list(
    "Kaktus|Satellit|Konfetti|Gummistiefel|Papagei|Marmelade|Schneesturm|Kronleuchter|Dudelsack|Leuchtturm|Zirkuszelt|Zitronenpresse|Wackelpudding|Raumschiff|Schnabeltier|Luftmatratze|Wasserfall|Kaffeemühle|Schmetterling|Schatzkarte|Lavalampe|Funkgerät|Glühwürmchen|Wäschekorb|Käsekuchen|Schlafanzug|Seepferdchen|Flaschenpost|Nebelmaschine|Wörterbuch",
  ),
  characters: list(
    "ein übermüdeter Zauberer|eine beleidigte Königin|ein nervöser Nachrichtensprecher|ein euphorischer Wetterfrosch|eine strenge Tanzlehrerin|ein chaotischer Detektiv|eine gelangweilte Piratin|ein verliebter Roboter|ein empörter Museumsführer|eine dramatische Opernsängerin|ein völlig ehrlicher Verkäufer|eine ehrgeizige Schnecke|ein selbstverliebter Spiegel|ein skeptischer Außerirdischer|eine plaudernde Topfpflanze|ein höflicher Bösewicht|eine ratlose Zeitreisende|ein pingeliger Koch|eine vergessliche Superheldin|ein übermotivierter Sportkommentator|eine genervte Märchenfee|ein äußerst langsamer Rennfahrer|eine ängstliche Geisterjägerin|ein feierlicher Stadtausrufer|eine misstrauische Katze|ein beratender Kühlschrank|eine optimistische Wetterwolke|ein beleidigter Wecker|eine äußerst vornehme Taube|ein pathetischer Fahrstuhl",
  ),
  scenes: list(
    "der letzte freie Sitz im Zug|eine Reklamation beim Drachenverleih|die Eröffnung eines Wolkenladens|ein Vorstellungsgespräch auf dem Mond|der Streit um die letzte Pommes|eine Preisverleihung für Socken|ein Aufzug voller Pinguine|ein verlorener unsichtbarer Hund|ein Urlaub im Kühlschrank|eine Gerichtsverhandlung gegen einen Wecker|die Wahl zum Bürgermeister im Aquarium|ein Restaurant ohne Essen|eine Modenschau für Kartoffeln|ein Einbruch im Keksregal|ein Bewerbungsgespräch als Hofnarr|eine Liebeserklärung an den WLAN-Router|eine Führung durchs eigene Chaos|ein Zoo mit vertauschten Tierstimmen|ein Konzert ohne Instrumente|ein Picknick bei umgekehrter Schwerkraft|ein Handy mit eigener Meinung|eine Taxifahrt in die Vergangenheit|die Schule für Superschurken|eine Wolke beim Psychologen|eine Raumfahrtmission im Karton|ein Flohmarkt für schlechte Ideen|eine Hochzeit zwischen zwei Haushaltsgeräten|ein Trainingslager für Faultiere|ein Spukhaus mit höflichen Geistern|eine Pressekonferenz nach dem Nudelunfall",
  ),
  emotions: list(
    "triumphierend|eifersüchtig|übertrieben höflich|voller Vorfreude|beleidigt|geheimnisvoll|völlig gelassen|theatralisch verzweifelt|unfassbar begeistert|misstrauisch|verlegen|gelangweilt|nostalgisch|extrem neugierig|schadenfroh|ehrfürchtig|ungeduldig|verwirrt|hoffnungsvoll|selbstverliebt",
  ),
  taboo: list(
    "Urlaub: Reise, Strand, Hotel|Kaffee: trinken, Bohne, Tasse|Fußball: Ball, Tor, Mannschaft|Internet: online, Computer, Netz|Winter: kalt, Schnee, Eis|Pizza: Käse, Teig, Italien|Schule: lernen, Lehrer, Klasse|Musik: hören, Lied, Ton|Geburtstag: feiern, Kuchen, Geschenk|Fahrrad: Rad, fahren, Pedal|Kino: Film, Leinwand, Popcorn|Bahnhof: Zug, Gleis, Reise|Küche: kochen, Essen, Herd|Regen: Wasser, nass, Wolke|Bibliothek: Buch, lesen, leise|Zirkus: Clown, Zelt, Akrobat|Schokolade: süß, Kakao, Tafel|Spiegel: sehen, Bild, Glas|Telefon: Anruf, sprechen, Nummer|Uhr: Zeit, Stunde, Minute|Gitarre: Saiten, Musik, spielen|Supermarkt: kaufen, Kasse, Lebensmittel|Schwimmbad: Wasser, schwimmen, Becken|Krankenhaus: Arzt, krank, Bett|Feuerwehr: Feuer, löschen, rot|Mond: Nacht, Erde, Himmel|Biene: Honig, Blume, fliegen|Schlüssel: Tür, Schloss, öffnen|Zelt: Camping, schlafen, Stoff|Brille: Augen, sehen, Glas",
  ),
  hardCategories: list(
    "Länder ohne den Buchstaben A|Städte mit mehr als sechs Buchstaben|Tiere ohne den Buchstaben E|Berufe mit mindestens drei Silben|Wörter, die auf -ung enden|Filme mit genau einem Wort im Titel|Lieder mit einer Zahl im Titel|Dinge, die rund und essbar sind|Wörter mit mindestens zwei Umlauten|Fremdwörter aus dem Alltag|Dinge, die keinen Strom brauchen|Wörter mit vier Konsonanten hintereinander|Sportarten ohne Ball|Länder mit einer Küste|Hauptstädte außerhalb Europas|Säugetiere, die im Wasser leben|Instrumente ohne Saiten|Gemüse, das unter der Erde wächst|Wörter mit stummem H|Dinge, die in jede Hosentasche passen|Tiere, deren Name mit S beginnt|Städte, deren Name mit B beginnt|Gegenstände mit einem Gelenk|Wörter, die vorwärts und rückwärts gleich sind|Dinge, die durchsichtig sind|Dinge, die man falten kann|Begriffe aus der Astronomie|Begriffe aus der Musiktheorie|Erfindungen vor dem Jahr 1900|Hobbys ohne Bildschirm",
  ),
  flirtTopics: list(
    "ein erstes Date|ein ehrliches Kompliment|eine unerwartete Einladung|ein romantischer Regentag|ein heimlicher Schwarm|eine Nachricht nach Mitternacht|ein Wiedersehen am Bahnhof|eine Panne beim Flirten|ein Tanz zu zweit|ein Wochenende ohne Handy|ein Date im Museum|ein Blick quer durch den Raum|eine Einladung zum Kaffee|ein gemeinsames Lieblingslied|ein Spaziergang am Meer|ein gemeinsamer Kochabend|eine Liebeserklärung im Alltag|ein Date auf dem Jahrmarkt|eine Verabredung im Buchladen|ein Filmabend zu zweit|ein überraschender Blumenstrauß|ein gemeinsames Frühstück|ein Abschied auf dem Bahnsteig|ein Flirt mit falschem Namen|eine charmante Entschuldigung|ein Date ohne gemeinsames Hobby|eine romantische Schnitzeljagd|ein Wiedersehen nach Jahren|ein Liebesbrief mit Kaffeefleck|ein Ausflug zu den Sternen",
  ),
  sexyCategories: list(
    "gute Ideen fürs erste Date|charmante Komplimente ohne Bezug auf den Körper|Romantische Filmklischees|Songs für einen langsamen Tanz|Orte für ein entspanntes Date|Dinge, die Vertrauen schaffen|Kleine romantische Gesten|Green Flags beim Kennenlernen|Peinliche Flirtpannen|Gute Fragen beim ersten Date|Dinge, die einen Menschen attraktiv machen|Ungewöhnliche Date-Aktivitäten|Romantische Filmszenen ohne Namen|Geschenke ohne Geld|Dinge für ein Picknick zu zweit|Schlechte Anmachsprüche|Gute Abschiedssätze nach einem Date|Liebeslieder|Romantische Reiseziele|Komplimente über Persönlichkeit|Situationen mit Herzklopfen|Gründe, beim Date zu lachen|Einladungen ohne das Wort Date|Wörter, die nach Romantik klingen|Vorteile langsamen Kennenlernens|Charmante Möglichkeiten, Interesse zu zeigen|Dinge, die man gemeinsam lernen kann|Ideen für ein verregnetes Date|Verabredungen ohne Bildschirm|Kitschige Kosenamen",
  ),
  weirdCategories: list(
    "Berufe für Gespenster|Ausreden eines sprechenden Toasters|Luxusprobleme von Drachen|Schlechte Namen für einen Freizeitpark|Gerichte auf dem Mars|Produkte im Laden für Riesen|Superkräfte, die im Alltag nerven|Sportarten für Schnecken|Schlagzeilen aus dem Jahr 3020|Regeln in einem Hotel für Vampire|Möbel für Meerjungfrauen|Werbesprüche für unsichtbare Dinge|Lieder aus Sicht eines Kühlschranks|Schlechte Zaubersprüche|Beschwerden einer Topfpflanze|Feiertage für Roboter|Berufe für Einhörner|Tiere mit Bürojobs|Erfindungen, die niemand braucht|Namen für eine Band aus Kartoffeln|Geschenke für einen Vulkan|Schimpfwörter ohne beleidigende Wörter|Schlechte Apps für Dinosaurier|Gründe für eine Socken-Demonstration|Hobbys eines gelangweilten Mondes|Geräusche in einer Geisterküche|Jobs in einer Wolkenfabrik|Reisetipps für Zeitreisende|Absurd schlechte Superheldennamen|Unnötige Warnhinweise",
  ),
  oddCategories: list(
    "Dinge, die ein Spiegel verschweigt|Ausreden einer verschwundenen Minute|Gesetze in einem Traum|Gedanken eines leeren Stuhls|Gründe für einen beleidigten Schatten|Geheimnisse einer Zimmerdecke|Geräusche, die Farben machen könnten|Fragen an eine sprechende Tür|Dinge, die ein Kühlschrank nachts plant|Ängste einer Socke|Währungen für Erinnerungen|Hobbys der Schwerkraft|Dinge, die rückwärts besser funktionieren|Probleme unsichtbarer Nachbarn|Jobs für verlorene Gedanken|Geschenke für die Stille|Namen für unbekannte Gefühle|Regeln für ein Dorf ohne gestern|Gründe für eine Pause der Sonne|Dinge, die die Zeit sammeln könnte|Speisen für eine Idee|Wetterberichte aus einem Bücherregal|Gesetze im Land der Spiegel|Lügen eines sehr ehrlichen Weckers|Warnschilder für Träume|Dinge, die ein Loch besitzen könnte|Unnötige Rechte für Wochentage|Urlaubsziele für Zahlen|Streitpunkte zwischen links und rechts|Dinge, die die Farbe Blau vermisst",
  ),
  oddPairs: list(
    "ein Staubsauger und ein König|eine Wolke und ein Passwort|eine Socke und ein Gerichtsurteil|ein Spiegel und ein Versprechen|ein Kaktus und ein Fahrplan|ein Kühlschrank und ein Geheimnis|ein Fahrstuhl und ein Gedicht|eine Schnecke und ein Feuerwerk|ein Schatten und ein Notizbuch|ein Wecker und ein Urlaub|eine Treppe und ein Gerücht|ein Pinguin und ein Taschenrechner|ein Löffel und ein Gewitter|ein Schuh und ein Traum|eine Münze und ein Regenbogen|ein Kompass und ein Kompliment|eine Tür und eine Erinnerung|ein Zahnrad und ein Liebesbrief|ein Luftballon und eine Steuererklärung|ein Staubkorn und eine Krone|ein Regenschirm und eine Ausrede|ein Vulkan und ein Kalender|eine Nudel und ein Denkmal|eine Brille und ein Verbot|ein Seepferdchen und ein Vertrag|ein Teebeutel und ein Planet|ein Ohrwurm und ein Schloss|eine Büroklammer und ein Gespenst|ein Kissen und ein Wahlplakat|eine Laterne und ein Zufall",
  ),
  oddLaws: list(
    "Schatten dürfen einmal täglich kündigen|Mittwochs läuft die Zeit rückwärts|Spiegel zeigen die nächste Entscheidung|Erinnerungen lassen sich wiegen|Jeder Gedanke kostet einen Cent|Türen wählen ihre Besucher selbst|Farben wechseln mit der Stimmung|Schwerkraft macht Mittagspause|Jede Lüge verwandelt sich in Konfetti|Träume stehen morgens in der Zeitung|Verlorene Dinge gründen eine Stadt|Jeder Stuhl hat eine eigene Meinung|Namen dürfen nur ausgeliehen werden|Gähnen verschiebt den nächsten Montag|Stille kann in Flaschen verkauft werden|Regen fällt nur auf schlechte Ausreden|Der Mond nimmt Beschwerden entgegen|Uhren dürfen über die Uhrzeit abstimmen|Musik verändert die Form von Möbeln|Jede Zahl bekommt einen freien Tag|Lachen erzeugt kleine Wolken|Kalorien werden in Erinnerungen gemessen|Gefühle haben Öffnungszeiten|Links und rechts tauschen stündlich|Alle Pflanzen verstehen Ironie|Man kann Gerüche fotografieren|Jeder Mensch hat einen Untertitel|Leere Räume sammeln Geschichten|Das Wetter hört auf Mehrheitsentscheidungen|Wochentage können Urlaub tauschen",
  ),
};
const cards = {
  weird: `talk|Schattenleben|Was würde dein Schatten tun, wenn er heute einen freien Tag hätte?
talk|Neue Erinnerung|Welche völlig erfundene Erinnerung würdest du einem Toaster geben?
talk|Verdächtige Stille|Du hörst plötzlich die Gedanken deiner Zimmerdecke. Was ist ihr erster Satz?
talk|Gefühl erfinden|Erfinde einen Namen für das Gefühl, wenn du weißt, dass du etwas vergessen hast, aber nicht was.
talk|Das Recht auf Dienstag|Welches Grundrecht würdest du einem Wochentag geben?
talk|Fragwürdiger Kauf|Du kannst für einen Euro eine Minute von morgen kaufen. Was würdest du damit machen?
talk|Unmögliche Diagnose|Dein Spiegel behauptet, du seist eigentlich ein Möbelstück. Begründe, welches.
talk|Lochbesitzer|Wem gehört ein Loch in einer Mauer? Erkläre deine sehr ernste Rechtsauffassung.
challenge|Wort ohne Bedeutung|Erfinde ein Wort für etwas, das es nicht gibt. Gib Definition und Beispielsatz.
challenge|Geruch übersetzen|Beschreibe den Geruch von Montag, ohne einen bekannten Geruch zu nennen.
challenge|Unsichtbare Regel|Erfinde eine Regel, die jede Person bereits befolgt, ohne sie zu kennen.
challenge|Zwei linke Seiten|Beschreibe ein Universum, in dem es kein rechts gibt. Drei Sätze.
challenge|Falsches Wörterbuch|Definiere „Wasser“ so, als hättest du noch nie Wasser gesehen.
challenge|Anleitung zur Stille|Erkläre in drei Schritten, wie man Stille repariert.
duel|Wer bin ich nicht|Zwei Freiwillige beschreiben denselben Gegenstand nur durch Dinge, die er nicht ist. Die Runde rät.
duel|Unmögliche Abstimmung|Stimmt ab: Hat eine Erinnerung ein Gewicht? Zwei Personen dürfen je ein Argument erfinden.
duel|Falscher Zusammenhang|Eine Person nennt zwei zufällige Dinge. Du erklärst, warum das eine offensichtlich das andere verursacht.
duel|Erfundene Logik|Erfindet zu zweit ein unmögliches Naturgesetz und danach je eine logische Folge daraus.
sip|Merkwürdige Begründung|Begründe, warum eine Büroklammer genau {n} Schlücke verteilen dürfte. Du darfst sie symbolisch verteilen oder auslassen.
sip|Abstimmung im Kopf|Die Runde stimmt ab, welche Farbe die Stille hätte. Wer seine Wahl begründen möchte, darf {n} Schlücke verteilen.`,
  normal: `talk|Unpopuläre Meinung|Verteidige eine unpopuläre Meinung über Essen.
talk|Erster Eindruck|Was denken Leute beim ersten Treffen oft falsch über dich?
talk|Kleine Rebellion|Welche harmlose Regel brichst du regelmäßig?
talk|Besser als gedacht|Was hast du erst belächelt und dann selbst geliebt?
challenge|Trailersprecher|Kündige die nächste Person wie einen Filmstar an.
challenge|Drei Genres|Sag „Der Bus kommt gleich“ als Horrorfilm, Romanze und Sportbericht.
challenge|Werbejingle|Sing einen kurzen Werbejingle für euren Spieleabend.
challenge|Neue Maßeinheit|Erfinde eine Maßeinheit für die Stimmung dieser Runde.
duel|Wörterstaffel|Erzählt zu zweit eine Geschichte, immer abwechselnd ein Wort. Schafft zehn sinnvolle Wörter.
duel|Emoji ohne Handy|Stellt zu zweit gleichzeitig ein Emoji dar. Die Runde errät beide.
sip|Publikumspreis|Die Runde kürt die originellste Antwort des letzten Zugs. Diese Person darf {n} Schlücke verteilen.
sip|Teamwahl|Wähle jemanden. Teilt gemeinsam {n} Schlücke zu oder lasst sie verfallen.`,
  hardcore: `talk|Ego-Check|Worin hältst du dich für besser, als du wahrscheinlich bist?
talk|Unbequeme Wahrheit|Welche Ausrede benutzt du, obwohl sie dir niemand glaubt?
talk|Cringe-Rückblick|Welche frühere Phase von dir ist dir heute am peinlichsten?
talk|Eigener Roast|Roaste dich selbst in drei Sätzen. Niemand anderes wird zum Ziel.
talk|Fassade runter|Bei welchem Thema tust du manchmal so, als würdest du dich auskennen?
talk|Blinder Fleck|Welche Kritik an dir trifft wahrscheinlich zu?
talk|Große Ansage|Was hast du groß angekündigt und dann nie gemacht?
talk|Gescheiterter Eindruck|Wann wolltest du beeindrucken und hast das Gegenteil erreicht?
challenge|45 Sekunden Bühne|Halte ohne Pause eine 45-sekündige Dankesrede für einen Preis, den du überhaupt nicht verdient hast.
challenge|Kein Füllwort|Erzähle 30 Sekunden von deinem Tag ohne „äh“, „also“ oder „irgendwie“.
challenge|Kopfrechnen|Starte bei 100 und ziehe fünfmal 7 ab. Ohne Handy.
challenge|Gedächtnis unter Druck|Die Runde nennt sechs Gegenstände. Wiederhole sie rückwärts.
challenge|Debattenwechsel|Verteidige 20 Sekunden Hausaufgaben. Wechsle auf Zuruf sofort zur Gegenposition.
challenge|Zehn Wörter|Bilde einen sinnvollen Satz aus zehn Wörtern. Keines darf den Buchstaben E enthalten.
challenge|Freestyle|Rap 20 Sekunden über diese Runde. Niemand muss beleidigt werden.
challenge|Schnelldenkprobe|Nenne in zehn Sekunden fünf Wörter mit mindestens acht Buchstaben.
duel|Kein Ja, kein Nein|Eine freiwillige Person stellt dir 30 Sekunden schnelle Fragen. Du darfst weder ja noch nein sagen oder nicken.
duel|Pokerface|Eine freiwillige Person versucht dich 20 Sekunden mit Worten zum Lachen zu bringen. Kein Berühren.
duel|Reverse-ABC|Nennt zu zweit abwechselnd das Alphabet rückwärts. Erster Fehler beendet das Duell.
duel|Rechenstaffel|Start bei 3: abwechselnd mal zwei, dann plus eins. Sechs Antworten ohne Fehler.
duel|Hotdog-Debatte|Diskutiert zu zweit, ob ein Hotdog ein Sandwich ist. Jeder hat drei Sätze. Dann stimmt die Runde ab.
duel|Merkkette extrem|Packt abwechselnd einen imaginären Koffer und wiederholt alle bisherigen Gegenstände in Reihenfolge.
sip|Bühnenbonus|Nach einer freiwilligen 20-Sekunden-Selbstparodie darfst du {n} Schlücke verteilen. Passen lässt den Bonus verfallen.
sip|Risikoansage|Sag vor dem nächsten Wurf eine einzelne Zahl voraus. Bei einem Treffer verteilst du {n} Schlücke, sonst passiert nichts.
sip|Mut zur Stille|Halte zehn Sekunden eine Siegerrede ohne ein Wort. Danach darfst du {n} Schlücke verteilen.
sip|Ehrlich verdient|Nenne einen eigenen Fehler und was du daraus gelernt hast. Danach darfst du {n} Schlücke verteilen.`,
  sexy: `talk|Anziehung|Was macht jemanden sofort attraktiv, noch bevor die Person etwas sagt?
talk|Kopfkino|Welches harmlose Detail kann bei dir sofort für Herzklopfen sorgen?
talk|Erster Kuss|Erzähle die lustige oder romantische Seite deines ersten Kusses, ohne Namen zu nennen.
talk|Flirtpanne|Was war dein peinlichster eigener Flirtversuch?
talk|Direkter Wunsch|Welches Kompliment würdest du gern öfter hören?
talk|Chemie|Woran merkst du, dass zwischen zwei Menschen die Chemie stimmt?
talk|Dein Typ|Nenne drei Eigenschaften, die dich anziehen. Du musst niemanden aus der Runde zuordnen.
talk|Gänsehaut|Welche Art Stimme oder welches Lachen findest du attraktiv?
talk|Romantische Schwäche|Bei welchem kitschigen Moment wirst du doch weich?
talk|Spannung|Lieber langsam kennenlernen oder Interesse sofort klar aussprechen? Warum?
talk|Nachricht mit Wirkung|Was könnte in einer einzigen Nachricht stehen, damit du lächeln musst?
talk|Grenzen sagen|Formuliere einen charmanten Satz, mit dem du beim Flirten eine Grenze setzt.
challenge|Blickkontakt|Frage eine Person, ob sie zehn Sekunden Blickkontakt möchte. Ein Nein beendet die Aufgabe ohne Ersatz.
challenge|Flirtstimme|Sag „Der Bus fährt in fünf Minuten“, als wäre es eine Einladung zu einem Date.
challenge|Charmanter Auftritt|Stelle dich einer imaginären Person vor, die du unbedingt kennenlernen möchtest.
challenge|Kompliment ohne Klischee|Wenn jemand mitmachen möchte: Mache der Person ein konkretes Kompliment über ihre Art.
challenge|Kuss anbieten|Du darfst einer freiwilligen erwachsenen Person einen Kuss auf die Wange anbieten. Nur ein ausdrückliches Ja zählt. Sonst direkt weiter.
challenge|Tanzangebot|Frage eine Person nach 15 Sekunden gemeinsamem Tanzen. Mit Abstand oder solo geht genauso.
challenge|Liebesbrief|Erfinde einen Liebesbrief aus drei Sätzen an einen Gegenstand im Raum.
challenge|Date-Pitch|Plane in 20 Sekunden ein Date, das nichts kostet und trotzdem persönlich ist.
duel|Flirtduell|Zwei Freiwillige erfinden je einen charmanten Eröffnungssatz. Die Runde bewertet Kreativität, nicht Aussehen.
duel|Kitsch-Battle|Überbietet euch zu zweit mit erfundenen kitschigen Kosenamen. Drei Runden.
duel|Kompliment-Pingpong|Zwei Freiwillige nennen abwechselnd je drei positive Eigenschaften des Gegenübers.
duel|Nur Blicke|Zwei Freiwillige spielen ein erstes Kennenlernen zehn Sekunden ohne Worte und ohne Berührung.
sip|Green Flag|Nenne eine Green Flag beim Dating. Du darfst {n} Schlücke verteilen.
sip|Charmepreis|Wer freiwillig einen kreativen Flirtspruch liefert, darf {n} Schlücke verteilen. Ohne Beitrag direkt weiter.`,
  crazy: `talk|Schurkenplan|Was wäre dein völlig harmloser Plan zur Weltherrschaft?
talk|Neue Spezies|Erfinde ein Tier aus drei vorhandenen Tieren und erkläre sein größtes Problem.
talk|Sockenpolitik|Erkläre, warum deine Socken eine eigene Regierung brauchen.
talk|Neue Währung|Womit würdest du bezahlen, wenn Geld morgen durch etwas Absurdes ersetzt würde?
talk|Haushaltsdrama|Welcher Gegenstand im Raum hätte das dramatischste Privatleben?
talk|Schlechte Superkraft|Erfinde eine Superkraft mit einem völlig unpraktischen Nebeneffekt.
challenge|Tierischer Wetterbericht|Gib 20 Sekunden Wetterbericht, als wärst du ein sehr aufgeregter Pinguin.
challenge|Nudeloper|Singe eine kurze Oper über eine verlorene Nudel.
challenge|Fremdsprache Quatsch|Halte eine kurze Rede in einer erfundenen Sprache. Übersetze danach genau einen Satz.
challenge|Geisterbahn höflich|Erschrecke ein imaginäres Publikum, während du dich ständig entschuldigst.
challenge|Unsichtbarer Sturm|Spiele, wie du im Sturm eine unsichtbare Zeitung liest. Bleib dabei an deinem Platz.
challenge|Museum des Nichts|Führe die Runde 20 Sekunden durch eine Ausstellung unsichtbarer Kunst.
challenge|Berufswechsel|Spiele einen Koch, der plötzlich glaubt, er sei Fluglotse.
challenge|Alien-Anleitung|Erkläre Außerirdischen, wie man einen Stuhl benutzt, ohne sitzen zu sagen.
duel|Dolmetscher|Eine Person spricht zehn Sekunden Kauderwelsch, die andere übersetzt völlig ernst.
duel|Interview mit Möbel|Interviewe eine Person, die einen beleidigten Schrank spielt. Drei Fragen.
duel|Werbespot zu zweit|Eine Person macht nur Geräusche, die andere bewirbt dazu ein erfundenes Produkt.
duel|Zeitlupenstreit|Spielt zu zweit einen Streit um einen imaginären Keks in Zeitlupe und ohne Berührung.
duel|Regiechaos|Spiele Zähneputzen pantomimisch. Eine Person ruft dreimal ein neues Filmgenre dazu.
duel|Ein-Wort-Pressekonferenz|Die Runde stellt Fragen. Du und eine freiwillige Person antwortet abwechselnd mit einem Wort.
sip|Quatschsteuer|Erfinde einen absurden Steuernamen und verteile {n} Schlücke als symbolische Steuer. Ablehnen ist erlaubt.
sip|Amt für Unsinn|Ernenne eine freiwillige Person zum Minister für unnötige Dinge. Sie darf {n} Schlücke verteilen.
sip|Alien-Prost|Erfinde einen außerirdischen Trinkspruch. Danach dürfen {n} Schlücke verteilt oder ausgelassen werden.
sip|Würfelorakel|Deute den letzten Wurf als absurde Prophezeiung. Du darfst {n} Schlücke verteilen.
sip|Pokal für nichts|Vergib einen imaginären Preis für eine erfundene Leistung. Die Person darf {n} Schlücke verteilen.
sip|Feierliche Pause|Verkünde zehn Sekunden Pause wie eine historische Sensation. Niemand bekommt zusätzliche Schlücke.`,
};
export const MODE_TASKS = Object.entries(cards).flatMap(([mode, block]) =>
  block.split("\n").map((row, i) => {
    const [category, title, text] = row.split("|");
    return { id: `card:${mode}:${i}`, mode, category, title, text };
  }),
);
const templates = [];
const add = (mode, category, id, title, pool, text) =>
  templates.push({
    id: `template:${mode}:${id}`,
    mode,
    category,
    title,
    pool,
    text,
  });
for (const mode of Object.keys(MODES)) {
  const fast = mode === "hardcore",
    categoryPool = {
      normal: "categories",
      hardcore: "hardCategories",
      sexy: "sexyCategories",
      crazy: "weirdCategories",
      weird: "oddCategories",
    }[mode];
  add(
    mode,
    "duel",
    "rhymes",
    "Reimduell",
    "rhymes",
    `Reihum auf „{term}“ reimen. Du beginnst. ${fast ? "Drei" : "Fünf"} Sekunden pro Antwort; Wiederholung oder kein Reim beendet das Duell.`,
  );
  add(
    mode,
    "duel",
    "category",
    "Kategorienrunde",
    categoryPool,
    `Reihum: {term}. Du beginnst. ${fast ? "Drei" : "Fünf"} Sekunden Bedenkzeit. Wiederholung oder keine Antwort beendet die Runde.`,
  );
  add(
    mode,
    "challenge",
    "five",
    "Fünf auf einen Streich",
    categoryPool,
    `Nenne in ${fast ? "zehn" : "20"} Sekunden fünf Beispiele für: {term}. Die Runde zählt mit.`,
  );
}
for (const mode of ["normal", "hardcore", "crazy"]) {
  const fast = mode === "hardcore";
  add(
    mode,
    "challenge",
    "taboo",
    "Tabu",
    "taboo",
    `Erkläre den Begriff vor dem Doppelpunkt, ohne die drei Wörter dahinter zu verwenden. ${fast ? "15" : "30"} Sekunden: {term}.`,
  );
  add(
    mode,
    "challenge",
    "spelling",
    "Rückwärts buchstabieren",
    "words",
    `Buchstabiere „{term}“ rückwärts, ohne es aufzuschreiben. ${fast ? "Zehn" : "20"} Sekunden.`,
  );
  add(
    mode,
    "challenge",
    "mime",
    "Pantomime",
    "objects",
    `Stelle ohne Worte dar: {term}. Die Runde hat ${fast ? "15" : "30"} Sekunden zum Raten.`,
  );
  add(
    mode,
    "talk",
    "pitch",
    "Verkaufstalent",
    "objects",
    `Verkaufe der Runde in ${fast ? "zehn" : "20"} Sekunden dieses Ding als wichtigste Erfindung aller Zeiten: {term}.`,
  );
}
add(
  "normal",
  "challenge",
  "role",
  "Rollenwechsel",
  "characters",
  "Stelle dich in 20 Sekunden vor, als wärst du {term}.",
);
add(
  "normal",
  "duel",
  "scene",
  "Mini-Szene",
  "scenes",
  "Spielt freiwillig zu zweit 30 Sekunden: {term}. Solo übernimmst du beide Rollen.",
);
add(
  "normal",
  "talk",
  "feeling",
  "Gefühlssache",
  "emotions",
  "Sag „Das ist mein letzter Keks“ in diesem Ton: {term}. Die Runde errät das Gefühl.",
);
add(
  "hardcore",
  "challenge",
  "role",
  "Rolle ohne Pause",
  "characters",
  "Du bist {term}. Halte 45 Sekunden ohne Pause eine Rede über euren Spieleabend.",
);
add(
  "hardcore",
  "duel",
  "scene",
  "Impro unter Druck",
  "scenes",
  "Spielt zu zweit: {term}. Jeder Satz beginnt mit dem nächsten Buchstaben im Alphabet. Start bei A, sechs Sätze.",
);
add(
  "hardcore",
  "talk",
  "debate",
  "Sofort verteidigen",
  "objects",
  "Fünf Sekunden Vorbereitung: Warum sollte „{term}“ Pflichtausstattung in jedem Haushalt sein? Sprich 30 Sekunden.",
);
add(
  "hardcore",
  "challenge",
  "emotion",
  "Keine Sekunde neutral",
  "emotions",
  "Erkläre 20 Sekunden das Würfeln in diesem Ton: {term}. Bleib in deiner Rolle.",
);
add(
  "hardcore",
  "duel",
  "forbidden",
  "Ohne Schlüsselwort",
  "objects",
  "Erkläre einer freiwilligen Person in 15 Sekunden diesen Gegenstand, ohne seinen Namen zu sagen: {term}.",
);
add(
  "hardcore",
  "challenge",
  "memory",
  "Gedächtnisrede",
  "scenes",
  "Erfinde drei Details zu dieser Szene: {term}. Erzähle sie danach sofort in umgekehrter Reihenfolge.",
);
add(
  "hardcore",
  "talk",
  "opposition",
  "Gegenposition",
  "hardCategories",
  "Wähle ein Beispiel aus „{term}“. Begründe 20 Sekunden, warum es überschätzt wird, und dann sofort das Gegenteil.",
);
add(
  "hardcore",
  "duel",
  "alphabet",
  "Alphabet-Staffel",
  "characters",
  "Ihr spielt zu zweit {term}. Jeder Satz beginnt mit dem nächsten Alphabetbuchstaben. Sechs Sätze, keine Pause über drei Sekunden.",
);
add(
  "crazy",
  "challenge",
  "role",
  "Quatschrolle",
  "characters",
  "Du bist {term}. Beschwere dich 30 Sekunden über die Schwerkraft.",
);
add(
  "crazy",
  "duel",
  "scene",
  "Impro-Chaos",
  "scenes",
  "Spielt zu zweit 30 Sekunden: {term}. Nach 15 Sekunden tauscht ihr mitten im Satz die Rollen.",
);
add(
  "crazy",
  "talk",
  "headline",
  "Schlagzeile aus Absurdistan",
  "scenes",
  "Erfinde eine reißerische Schlagzeile und einen ernsten ersten Nachrichtensatz über: {term}.",
);
add(
  "crazy",
  "challenge",
  "emotion",
  "Drama um nichts",
  "emotions",
  "Reagiere auf eine imaginäre fallende Erbse, als wäre das weltbewegend. Dein Gefühl: {term}.",
);
add(
  "crazy",
  "sip",
  "toast",
  "Toast auf Dinge",
  "objects",
  "Halte einen feierlichen Toast auf: {term}. Du darfst {n} Schlücke verteilen oder verfallen lassen.",
);
add(
  "crazy",
  "duel",
  "trial",
  "Ding vor Gericht",
  "objects",
  "Klage in einem erfundenen Prozess diesen Gegenstand wegen Unsinns an: {term}. Eine freiwillige Person verteidigt ihn.",
);
add(
  "crazy",
  "talk",
  "manual",
  "Katastrophale Anleitung",
  "objects",
  "Gib eine offensichtlich absurde, nicht zum Nachmachen gedachte Bedienungsanleitung für: {term}. Drei Sätze.",
);
add(
  "crazy",
  "challenge",
  "news",
  "Eilmeldung",
  "weirdCategories",
  "Verkünde eine völlig erfundene Eilmeldung zum Thema „{term}“, als wäre sie weltbewegend.",
);
add(
  "crazy",
  "duel",
  "expert",
  "Experteninterview",
  "weirdCategories",
  "Die Runde interviewt dich als angeblichen Experten für „{term}“. Beantworte drei Fragen mit ernst vorgetragenem Unsinn.",
);
add(
  "sexy",
  "talk",
  "story",
  "Romantischer Einstieg",
  "flirtTopics",
  "Erfinde einen charmanten ersten Satz für diese Situation: {term}.",
);
add(
  "sexy",
  "challenge",
  "scene",
  "Romantische Szene",
  "flirtTopics",
  "Spiele 20 Sekunden die Hauptrolle in dieser romantischen Szene: {term}. Ein imaginäres Gegenüber genügt.",
);
add(
  "sexy",
  "duel",
  "duet",
  "Zu zweit erfunden",
  "flirtTopics",
  "Zwei Freiwillige erzählen abwechselnd je einen Satz über: {term}. Vier Sätze, ein überraschendes Ende.",
);
add(
  "sexy",
  "challenge",
  "emotion",
  "Eine Stimme, ein Blick",
  "emotions",
  "Sag „Schön, dass du da bist“ in diesem Ton: {term}. Danach so, wie du es selbst beim Date sagen würdest.",
);
add(
  "sexy",
  "talk",
  "object",
  "Charmanter Vergleich",
  "objects",
  "Erfinde einen charmanten Vergleich zwischen einem gelungenen Date und diesem Gegenstand: {term}.",
);
add(
  "sexy",
  "challenge",
  "radio",
  "Date-Radio",
  "flirtTopics",
  "Kündige mit deiner charmantesten Radiostimme einen Film über diese Situation an: {term}. 20 Sekunden.",
);
add(
  "sexy",
  "talk",
  "question",
  "Die richtige Frage",
  "flirtTopics",
  "Welche offene Frage würde in dieser Situation ein gutes Gespräch beginnen? {term}. Ohne Ja-Nein-Antwort.",
);
add(
  "sexy",
  "duel",
  "twist",
  "Charmante Wendung",
  "flirtTopics",
  "Zwei Freiwillige spielen: {term}. Eine Person erfindet eine kleine Panne, die andere reagiert charmant darauf.",
);
add(
  "sexy",
  "challenge",
  "silent",
  "Romantik ohne Worte",
  "flirtTopics",
  "Zeige diese Szene pantomimisch mit einem imaginären Gegenüber: {term}. Die Runde rät.",
);
add(
  "sexy",
  "talk",
  "playlist",
  "Ein Lied für zwei",
  "flirtTopics",
  "Welches Lied passt zu dieser Situation und warum? {term}. Abspielen ist nicht nötig.",
);
add(
  "sexy",
  "duel",
  "letter",
  "Vier-Satz-Liebesbrief",
  "flirtTopics",
  "Erfindet zu zweit einen Liebesbrief: abwechselnd vier Sätze über {term}. Der letzte Satz soll überraschen.",
);
add(
  "sexy",
  "talk",
  "mistake",
  "Charmant gerettet",
  "flirtTopics",
  "Erfinde eine kleine eigene Panne für diese Situation und rette sie mit einem ehrlichen Satz: {term}.",
);
add(
  "sexy",
  "challenge",
  "trailer",
  "Romantischer Trailer",
  "flirtTopics",
  "Sprich einen 15-sekündigen Filmtrailer über {term}. Mit dramatischem Flüstern und einem hoffnungsvollen Ende.",
);
add(
  "weird",
  "talk",
  "law",
  "Unmögliches Gesetz",
  "oddLaws",
  "Angenommen: {term}. Welche unerwartete Folge hätte das in deinem Alltag?",
);
add(
  "weird",
  "talk",
  "pair",
  "Geheimer Zusammenhang",
  "oddPairs",
  "Diese zwei Dinge sind in Wahrheit eng verwandt: {term}. Erfinde die Erklärung.",
);
add(
  "weird",
  "talk",
  "object",
  "Ding mit Innenleben",
  "objects",
  "Dieser Gegenstand entwickelt ein Bewusstsein: {term}. Was ist seine erste Sorge?",
);
add(
  "weird",
  "talk",
  "word",
  "Vergessene Bedeutung",
  "words",
  "„{term}“ war früher der Name eines Gefühls. Erfinde, welches, und wann man es empfindet.",
);
add(
  "weird",
  "talk",
  "category-story",
  "Nachts im Unmöglichen",
  "oddCategories",
  "Wähle ein Beispiel für „{term}“ und erzähle seine seltsamste Geschichte.",
);
add(
  "weird",
  "challenge",
  "manual",
  "Verkehrte Funktion",
  "objects",
  "Beschreibe einen neuen Alltagsnutzen für „{term}“, der nichts mit seiner üblichen Funktion zu tun hat.",
);
add(
  "weird",
  "challenge",
  "dictionary",
  "Alternatives Wörterbuch",
  "words",
  "Definiere „{term}“ komplett falsch, aber so überzeugend wie ein Wörterbuch.",
);
add(
  "weird",
  "challenge",
  "emotion",
  "Gefühl als Gegenstand",
  "emotions",
  "Das Gefühl „{term}“ ist plötzlich ein Gegenstand. Beschreibe Form, Geräusch und Gebrauch.",
);
add(
  "weird",
  "duel",
  "similarity",
  "Seltsame Gemeinsamkeit",
  "oddPairs",
  "Nennt zu zweit abwechselnd Gemeinsamkeiten für: {term}. Drei pro Person, auch erfundene zählen mit Begründung.",
);
add(
  "weird",
  "duel",
  "lawdebate",
  "Parlament der Träume",
  "oddLaws",
  "Debattiert zu zweit: Sollte dieses Gesetz gelten? {term}. Jede Person hat zwei Argumente, dann stimmt die Runde ab.",
);
add(
  "weird",
  "duel",
  "objectvoice",
  "Ding spricht zurück",
  "objects",
  "Eine Person stellt drei Fragen an „{term}“. Eine andere antwortet aus Sicht des Gegenstands.",
);
add(
  "weird",
  "sip",
  "objectquestion",
  "Sehr wichtige Frage",
  "objects",
  "Was wäre die seltsamste Frage an „{term}“? Für eine freiwillige Antwort darfst du {n} Schlücke verteilen.",
);
add(
  "weird",
  "sip",
  "wordprophecy",
  "Wörterorakel",
  "words",
  "„{term}“ ist das Zeichen für euren Abend. Erfinde seine Bedeutung und verteile {n} Schlücke oder lass sie verfallen.",
);
export const TEMPLATES = templates;
export function variantCount(tasks) {
  return tasks.reduce(
    (n, t) => n + (t.pool ? TERM_POOLS[t.pool].length : 1),
    0,
  );
}
