# Quince – Roadmap

Projektname: **Quince** (englisch für Quitte – international aussprechbar, passt zum ruhigen e-paper-Farbschema).
Tech-Stack: **SvelteKit** (minimaler Overhead, kleines Docker-Image, übersichtlicher Code).

Referenz/Original: [Mela Recipe Manager](https://mela.recipes/) ([iOS](https://apps.apple.com/us/app/mela-recipe-manager/id1548466041), [Mac](https://apps.apple.com/us/app/mela-recipe-manager/id1568924476?mt=12))
Dieses Projekt ist ein selbstgehosteter, quelloffener Fan-Clone im Look & Feel von Mela – kein offizielles Produkt. Klarer Credit/Link zum Original gehört in den About-Screen.

## Backlog / Ideen (noch nicht eingeplant, bei Bedarf evaluieren)

**Import & Export**

- Import aus Paprika-Format (`.paprikarecipes`)

**Organisation & Suche**

- Volltextsuche (Titel, Zutaten, Notizen)
- Einheiten-Umrechnung metrisch/imperial

**Kochen & Planung**

- Einkaufsliste aus mehreren Rezepten, abhakbar, Zutaten zusammenfassen
- Essensplaner/Kalender

**Sync & Multi-User**

- WebDAV/Nextcloud als Alternative zu Google Drive
- Mehrbenutzer-Haushalte (Rezepte teilen)
- Backup/Restore der Bibliothek als ZIP

**Technik/Self-Hosting**

- PWA: installierbar, Offline-Zugriff
- Dark Mode
- Health-Check-Endpoint, Backup-Skript für Datenhaltung

**Theming**

- Umschaltbare Schriftart (Sans-Serif/Serif) als Nutzereinstellung
  - Serif-Optionen: Playfair Display, Forum
  - Sans-Serif-Optionen: Open Sans (Standard), Geist

## Design-Entscheidungen (bereits festgelegt)

- **Deployment:** ein einzelner, schlanker Docker-Container, kein Overhead. Reverse Proxy/TLS ist Sache des Selfhosters.
- **Datenhaltung:** Bind-Mount/Volume mit Rezepten im Klartext-/Dateiformat, standardmäßig **ohne Account** – alle Nutzer einer Instanz sehen dieselben Rezepte. Login/DB (Step 5) ist eine spätere, optionale Erweiterung, kein Ersatz dafür.
- **Farbschema (bewusst reduziert, neutral-warm):** ein sehr heller Weizen-/Papierton (`#f7f2e7`)
  für alles, ein etwas kräftigerer Weizenton fürs Zutaten-Panel (`#efe4c9`), fast schwarzer Text
  (`#1a1614`), eine einzige Highlight-Farbe (`#8c7503`, Gold) für Mengenangaben, Kennzahlen
  (z. B. Ofentemperatur) und Zeiten.
  - **Wichtig: keine Grüntöne.** Grün wirkt bei Essen unappetitlich – die App bleibt neutral-warm,
    im Zweifel leicht bräunlich statt kühl. Frühere Versionen (Salbeigrau/Tannengrün aus einer
    botanischen Quitten-Illustration) wurden genau deshalb verworfen.
  - Ein Tintenton in verschiedenen Deckkräften für Ränder/gedämpften Text statt separater
    Grautöne (Idee von [iamrob.in](https://iamrob.in/)).
- **Typografie:** Rezepttitel und Zwischenüberschriften in Playfair Display (Serif, self-hosted,
  fett), moderat größer als der Fließtext – bewusst nicht überdimensioniert. Fließtext in Geist
  (Sans-Serif, self-hosted). Trennlinien schlicht, kurz und zentriert statt voller Breite.
- **Rezept-Layout:** Zutaten und Zubereitung stehen als zwei gleich hohe Spalten nebeneinander,
  beide Überschriften auf gleicher Höhe. Zutaten haben eine eigene Hintergrundfläche (kein
  Rahmen/Kasten). Meta-Angaben (Portionen, Vorbereitung, Kochzeit, Gesamtzeit) sind ausgeschrieben
  als Klartext mit `·`-Trennern, keine Icons und keine Bubbles.
  - "Liebe Heide" (Handschrift) ist aktuell nicht im Einsatz: Die vorhandene Datei ist die
    `-Color`-Variante (COLR/sbix, ~19 MB) mit fest eingebrannter, bläulicher Glyphenfarbe, die
    die CSS-Textfarbe überschrieb und store insgesamt zu unruhig wirkte. Fundstück: iamrob.in
    nutzt dieselbe Schriftfamilie, aber die Variante `LiebeHeide-FinelinerBold.otf`
    (Umriss-Font) – falls Daniel die besitzt, könnten wir Liebe Heide später wieder aufnehmen,
    ohne den Blaustich. Die Datei liegt weiterhin unter `static/fonts/liebe-heide.otf`.
- **Sprache:** Die UI (Buttons, Labels, Meldungen) ist zweisprachig (Deutsch/Englisch), erkannt
  server-seitig aus dem `Accept-Language`-Header — keine Umschalt-UI, da es keinen Account gibt,
  an dem man eine Einstellung festmachen könnte. Rezeptinhalte selbst (Titel, Zutaten,
  Zubereitung) werden nie übersetzt und bleiben in der Sprache, in der sie importiert wurden. Die
  About-Seite ist bewusst eine Ausnahme: fester, nur englischer Text (Zielgruppe sind
  internationale Mela-Fans), nicht über die übliche Übersetzungs-Infrastruktur gesteuert.

## Step-Roadmap (committed)

### Step 1 – MVP

- Web-App, `.melarecipe`-Datei hochladen, Rezept im Mela-Stil anzeigen
- Responsive: Desktop, Tablet, Smartphone
- Läuft in Docker, selfhosted
- Kein Zugriffsschutz (Absicherung ist Sache des Selfhosters/Reverse Proxy)
- Einfaches Platzhalter-Icon (Quitten-Silhouette)

**Status: implementiert.** SvelteKit-App mit Node-Adapter, dateibasierter Speicherung
(`data/recipes/*.melarecipe`), Upload, Detailansicht im Mela-Stil (Zutaten/Zubereitung
zweispaltig, Mengen-/Zeit-Highlights, Gruppentitel, Bold/Italic/Links), About-Screen mit
Mela-Credit, Dockerfile + docker-compose. Lokal in Chrome getestet (Desktop + Mobile-Viewport).

**Docker verifiziert:** Image gebaut (274 MB), Container gestartet, Upload und Anzeige im Browser
gegen `http://localhost:3000` getestet, Persistenz im Bind-Mount `./data` bestätigt.

**Stolperfalle `ORIGIN`:** adapter-node nimmt ohne gesetztes `ORIGIN` als Protokoll `https` an.
Der Browser sendet auf einer HTTP-Instanz aber `Origin: http://…`, wodurch SvelteKits
CSRF-Prüfung – die nur im Production-Build aktiv ist, im Dev-Server also nie auffällt – jeden
Upload mit „Cross-site POST form submissions are forbidden" abweist. `ORIGIN` ist daher im
Dockerfile auf `http://localhost:3000` vorbelegt und muss beim Betrieb hinter einem Reverse
Proxy auf die echte URL gesetzt werden (siehe `docker-compose.yml` und README).

Der temporäre Theme-Editor (`src/lib/theme/`) wurde nach dem Festzurren der Farben wieder
entfernt. Die dabei eingeführten Tokens (`--font-size-*`, `--line-height-body`,
`--font-weight-heading`) sind geblieben – Schriftgrößen und -gewicht lassen sich damit zentral
in `src/app.css` anpassen.

**Technische Eckpunkte (recherchiert):**

- `.melarecipe` ist reines JSON (kein ZIP), `.melarecipes` bündelt mehrere davon in einem ZIP
- Felder: `id`, `title` (Pflicht), `text`, `categories[]`, `yield`, `prepTime`, `cookTime`, `totalTime`, `ingredients` (newline-separiert, Markdown-Links, `#` für Gruppentitel), `instructions` (newline-separiert, `#`/`*`/`**`/Links), `notes`, `nutrition`, `link`, `images[]` (Base64 inline)
- Quelle: [mela.recipes/fileformat](https://mela.recipes/fileformat/index.html)

### Step 2 – Kochmodus

- Einstellbarer Timer
- Barrierefreiheit: Bildschirm-Pulsieren bei Timer-Ende (per Toggle ein/ausschaltbar) für Hörgeschädigte

**Status: implementiert.** Route `/recipe/[id]/cook`, erreichbar über einen Button auf der
Rezeptdetailseite. Ablenkungsfrei: Sidebar/Suche sind hier ausgeblendet
(`recipe/+layout.svelte` prüft auf `/cook`-Pfadende).

- **Zutaten** dauerhaft sichtbar (kein Auf-/Zuklappen), im Stil der Rezeptdetailseite, mit
  Checkboxen zum Abhaken (nur UI-State, nicht persistiert).
- **Zubereitung** Schritt für Schritt (Vor/Zurück), Gruppentitel erscheinen beim jeweils ersten
  Schritt einer Gruppe.
- **Timer** ist standardmäßig unsichtbar. Erkannte Zeitangaben im Schritttext (`.time-badge`,
  z. B. „30 Minuten") sind antippbar und blenden einen vorausgefüllten Timer ein — gestartet
  werden muss er manuell. Stunden/Minuten/Sekunden getrennt dargestellt; Zahl antippen öffnet
  Zifferneingabe (Ziffernblock auf Touch-Geräten), daneben eine +/− Wippe: kurzes Tippen = 1
  Minute, ab 2 Sekunden Halten beschleunigt auf 5-Minuten-Schritte. Minuten-Überlauf über 60
  trägt automatisch in die Stunden über (eine einzige Sekunden-Quelle intern, keine
  Sync-Logik zwischen den Einheiten nötig).
- **Alarm:** Signalton (Web Audio, kein Audio-Asset nötig) + optionales Bildschirm-Wabern
  (langsame ~3 s radiale Farbanimation, kein hartes Blinken) — Toggle persistiert in
  localStorage. Ganzer Bildschirm ist antippbar zum Stoppen, dismisst alle gerade
  alarmierenden Timer gleichzeitig.
- **Screen Wake Lock** (best-effort, feature-detected): Bildschirm bleibt an, solange der
  Kochmodus offen ist — kein Hindernis, falls der Browser das nicht unterstützt.
- **Layout:** drei Spalten (Zutaten | Zubereitung | Timer), auf schmalen Bildschirmen
  gestapelt. Kompakter „‹ 1/17 ›“-Pager statt Textbuttons für die Schritt-Navigation.
- **Mehrere gleichzeitige Timer** statt nur einem: „+ Timer hinzufügen“ legt einen leeren an,
  jedes Antippen einer Zeitangabe im Text legt einen weiteren, vorausgefüllten Timer in der
  Spalte ab, statt einen bestehenden zu überschreiben. Jede Karte hat eigenes
  Start/Pause/Reset/Entfernen.
- Bewusst nicht umgesetzt: Persistenz des Kochfortschritts (Timer, angehakte Zutaten,
  aktueller Schritt) über einen Seiten-Reload hinweg.

### Step 3 – Funktionalität erweitern

- Skalierbare Zutatenliste direkt im Kochmodus mit abhakbaren Checkboxen
- Kategorien, Tags, Favoriten, Ordner/Sammlungen (Mela nutzt das stark)
- Portionsgrößen-Skalierung (Rezept verdoppeln/halbieren, Mengen automatisch umrechnen)
- Import direkt per URL (Mela kann Rezepte von praktisch jeder Kochseite importieren, via
  schema.org/Recipe-Microdata-Parsing) – nicht nur `.melarecipe`-Dateien hochladen
- Export als `.melarecipe`, damit Nutzer jederzeit zurück ins Original wechseln können
  (Kompatibilität in beide Richtungen wäre ein schönes Signal an die Mela-Community)
- Druckansicht / PDF-Export

**Kategorien/Favoriten/Merkliste – implementiert.** Orientiert an Mela: keine separate
Tags/Ordner-Taxonomie, sondern genau die Felder aus dem echten `.melarecipe`-Format
(`categories`, `favorite`, `wantToCook` — letztere zwei waren im Schema zwar dokumentiert,
wurden bei uns aber bisher beim Einlesen verworfen).

- Rezeptdetailseite: Toggle-Buttons „Favorit“ / „Möchte ich kochen“ — nur ein Icon davor
  (☆/★ bzw. ⚐/⚑) füllt sich beim Aktivieren, der Button selbst bleibt schlicht umrandet wie
  die Kategorie-Chips, damit sich beide optisch nicht gleichen. Dazu editierbare
  Kategorie-Chips (hinzufügen per Texteingabe, entfernen per Klick auf den Chip) — alles über
  SvelteKit-Form-Actions, die direkt in die `.melarecipe`-Datei zurückschreiben.
- Sidebar: Filterleiste „Alle / Favoriten / Vorgemerkt“ plus Kategorie-Dropdown (Optionen aus
  allen vorhandenen Rezepten gesammelt), kombinierbar mit der bestehenden Textsuche.

**Portionsgrößen-Skalierung – implementiert.** Wie in Mela rein eine Ansichtshilfe: skaliert
nur die angezeigten Mengen in der Zutatenliste, ändert nichts an der gespeicherten Datei und
lässt das (oft frei formulierte) `yield`-Feld unangetastet.

- Neue Komponente `PortionScaler.svelte`: „−／×N／+“ in 0,5er-Schritten (0,5× bis 6×), Klick
  auf die Zahl setzt auf 1× zurück. Auf Rezeptdetailseite und im Kochmodus neben der
  „Zutaten“-Überschrift, jeweils eigener, nicht persistierter State.
- `renderIngredientLine()` in `parse.ts` skaliert die führende Menge und alle Mengen mit
  Einheit im Rest der Zeile (z. B. das „(500 g)“ hinter dem Zutatennamen) in einem Durchgang —
  wichtig, weil ein zweiter Parse-Durchlauf über bereits skalierten Text an eingesetzten
  Bruch-Glyphen ("½") scheitern würde. Zeiten/Temperaturen bleiben unangetastet.
- Hübsche Brüche (¼ ⅓ ½ ⅔ ¾) statt hässlicher Dezimalzahlen, wo die Rundung nah genug dran ist;
  sonst zwei Nachkommastellen mit Komma.
- Skaliert inzwischen auch Mengen mit Einheit im Zubereitungstext (z. B. „1.000 g Mehl“ in
  einem Schritt), nicht nur in der Zutatenliste — Zeiten/Temperaturen sind eigene, nicht
  überschneidende Regex-Muster ohne Mengeneinheiten und bleiben deshalb unberührt.
- Dabei einen echten Parsing-Bug gefunden und behoben: „1.000“ (deutsches
  Tausendertrennzeichen) wurde beim Skalieren als 1,0 statt 1000 interpretiert. Der Punkt gilt
  jetzt nur als Trennzeichen, wenn ihm vollständige Dreiergruppen folgen.

**`.melarecipe`-Export – implementiert.** Neuer Endpoint `/recipe/[id]/export`, liefert die
gespeicherte Datei unverändert mit `Content-Disposition: attachment` aus — kein
Neu-Serialisieren, also kein Risiko, dabei ein Feld zu verlieren. Link „Als .melarecipe
exportieren“ neben „Kochmodus starten“ auf der Rezeptdetailseite.

- Stolperfalle: Umlaute in der storageId (z. B. „Möhrengemüse …“) lassen sich nicht direkt in
  einen HTTP-Header schreiben (nur Latin1 erlaubt) — hätte in der Produktion, aber nicht beim
  ersten Dev-Test mit ASCII-Namen aufgefallen. Der `Content-Disposition`-Header trägt deshalb
  zwei Varianten: einen ASCII-Fallback-Dateinamen (Umlaute transliteriert) und den echten Namen
  korrekt kodiert über `filename*` (RFC 5987).
- Noch offen aus diesem Punkt: URL-Import, Druckansicht/PDF.

**Druckansicht/PDF – implementiert.** Wie in Mela kein eigener PDF-Generator, sondern nur eine
aufgeräumte Ansicht für den normalen Browser-Druckdialog ("Als PDF speichern" übernimmt der
Browser) — kein zusätzliches Package im Docker-Image nötig. Layout orientiert sich an einem
echten Mela-PDF-Export (Daniel hat eins als Referenz geschickt), nicht nur an eigenen Annahmen:
der erste Entwurf hatte Foto/Überschrift auf der falschen Seite und stapelte Zutaten/Zubereitung
untereinander statt nebeneinander — deutlich unaufgeräumter als das Original.

- Neuer „Drucken“-Button neben „Kochmodus starten“ / „Als .melarecipe exportieren“, ruft
  `window.print()`.
- `@media print` blendet App-Chrome aus (Header, Footer, Sidebar — in `app.css`, weil die aus
  übergeordneten Layouts kommen) sowie Bedienelemente auf der Rezeptseite selbst (Favorit/
  Merkliste-Toggles, Kategorie-Editor, Aktionsleiste).
- Layout wie im Mela-Export: Foto oben **links** (schmale Spalte, ca. 30 % Breite), daneben
  Titel/Beschreibung/Meta-Zeile in der breiten Spalte. Zutaten und Zubereitung teilen sich
  dieselbe Spaltenaufteilung darunter. Abschnittsüberschriften ("Zutaten", "Zubereitung",
  "Nährwerte") fallen komplett weg — die Spaltenposition macht die Zuordnung allein klar, genau
  wie im Original. Zutatenliste ohne Aufzählungspunkte, Schriftgröße durchgängig 11–12pt
  (Titel/Zwischenüberschriften etwas größer für die Hierarchie).
- Stolperfalle beim Ausrichten: Foto und Titel/Beschreibung/Meta lagen anfangs in derselben
  Grid-Zeile, wodurch die Zeile auf die Fotohöhe gestreckt wurde und ein hässlicher Leerraum
  zwischen Titel und Beschreibung entstand. Fix: Foto spannt explizit über die drei Zeilen
  (`grid-row: 1 / span 3`), Titel/Beschreibung/Meta bekommen je eine eigene, am Inhalt
  bemessene Zeile.
- `PortionScaler.svelte` blendet die +/− Stellknöpfe im Druck aus, lässt aber den aktuellen
  Faktor als Hinweistext stehen, falls z. B. mit 2× gedruckt wurde — nur bei unverändertem 1×
  verschwindet auch die Zahl, weil sie dann nichts aussagt.
- Bewusst vereinfacht gegenüber dem Mela-Vorbild: Nährwerte/Notizen/Quelle stehen bei uns
  weiterhin als volle Breite unter der zweispaltigen Zutaten/Zubereitung-Ansicht, nicht in der
  schmalen Spalte unter den Zutaten wie im Original — dafür hätten Zutaten und Nährwerte im
  selben Grid-Element stecken müssen, was mehr Markup-Umbau gebraucht hätte, als der Nutzen
  hier rechtfertigt.
- Noch offen aus diesem Punkt: URL-Import.

**Mehrsprachigkeit (DE/EN) – implementiert.** Nicht ursprünglich in Step 3 geplant, aber im
Zuge von Footer-/About-Texten mit angegangen: Daniel wollte, dass die komplette Bedienoberfläche
zweisprachig ist, nicht nur einzelne Texte.

- `hooks.server.ts` erkennt die Sprache aus dem `Accept-Language`-Header (alles außer "de\*"
  landet bei Englisch) und legt sie in `event.locals.locale` ab; die Root-`+layout.server.ts`
  reicht sie an alle Seiten durch.
- `src/lib/i18n.ts`: ein Wörterbuch mit `de`/`en`-Varianten für jeden UI-Text plus eine simple
  `t(locale, key, vars?)`-Funktion mit `{platzhalter}`-Ersetzung — bewusst kein Übersetzungs-Package,
  bei der überschaubaren Textmenge reicht das aus.
- Durchgezogen über die komplette App: Navigation, Footer, Formulare, Fehlermeldungen (auch
  serverseitige Validierungsfehler beim Upload/Kategorien, `InvalidRecipeError` trägt jetzt einen
  Übersetzungsschlüssel statt eines fertigen deutschen Texts), Kochmodus, Portionsskalierung.
- Rezeptinhalte (Titel, Zutaten, Zubereitung) bleiben immer unübersetzt, wie oben unter
  "Design-Entscheidungen" festgehalten.
- "Als .melarecipe exportieren" heißt jetzt schlicht "Exportieren"/"Export".
- Footer: "Created by Daniel Myrenne with Claude as an ode to Mela" (nur Englisch, keine
  Sprachvariante).
- About-Seite komplett neu getextet (nur Englisch) inkl. Dank an Silvio Rizzi
  ([@rizzi@gloria.social](https://gloria.social/@rizzi)), den Mela-Entwickler.

**READ_ONLY-Modus – implementiert.** Ebenfalls nicht ursprünglich geplant: Daniel möchte Quince
optional auch als öffentlich erreichbare, rein lesende Instanz betreiben können — jemand lädt eine
`.melarecipe`-Datei hoch, sieht sie sich an, aber nichts wird dauerhaft gespeichert und es gibt
keine Bibliothek fremder Rezepte zu entdecken.

- Lässt sich **nicht zuverlässig automatisch** an "kein Volume gemountet" festmachen — ein frisches
  Container-Dateisystem sieht beim Start identisch aus wie ein echtes Volume, der Unterschied zeigt
  sich erst (zu spät) beim nächsten Neustart. Deshalb ein expliziter Schalter: `READ_ONLY=true`
  (Standard: aus). Bei aktivem Schalter braucht es auch kein Volume mehr — der `volumes`-Block in
  `docker-compose.yml` kann dann entfernt werden.
- Neues Modul `ephemeralStore.ts`: hochgeladene Rezepte landen in einer simplen
  In-Memory-`Map` (Prozessspeicher, keine Datenbank) mit 1 h TTL und einer Obergrenze von 100
  Einträgen (FIFO-Verdrängung) — Schutz gegen Speicherverbrauch durch eine unauthentifizierte,
  öffentliche Instanz.
- `store.ts`-Funktionen (`getRecipe`, `saveUpload`, `listRecipes`, `updateRecipeMeta`,
  `getRecipeFileContents`) verzweigen intern auf den Cache statt aufs Dateisystem — für Routen und
  UI ändert sich an der Aufrufweise nichts, der Read-Only-Modus ist komplett in der Store-Schicht
  gekapselt.
- UI: keine Seitenleiste (`recipe/+layout.svelte`, `listRecipes()` liefert ohnehin immer `[]`),
  keine Favorit-/Merkliste-Toggles und keine Kategorie-Bearbeitung auf der Rezeptseite (Kategorien
  aus der Originaldatei werden weiterhin als reine Anzeige-Chips gezeigt). Kochmodus, Drucken,
  Portionsskalierung und `.melarecipe`-Export funktionieren unverändert, weil sie sowieso nichts
  persistieren.
- `updateRecipeMeta()` ist im READ_ONLY-Modus ein No-op — auch falls jemand die Server-Action
  direkt anspricht statt über die (dort ausgeblendete) UI.
- Verifiziert mit einem separaten Docker-Container ganz ohne `-v`-Flag: Upload → Ansicht →
  Export funktionieren, die Startseite listet nie etwas auf, keine Seitenleiste/Bearbeitungs-UI
  im HTML.

**Kleinere Feinschliffe auf der Rezeptseite:**

- "Kochmodus starten" heißt jetzt schlicht "Kochen"/"Cook".
- "Exportieren" und "Drucken" sind jetzt sekundäre Buttons im Stil der Favorit-/Merkliste-Chips
  (schlichter Rahmen statt Textlink), aber in derselben Größe wie der "Kochen"-Button — vorher
  sahen die drei Aktionen nebeneinander uneinheitlich aus.
- Klammerinhalte in Zutatenzeilen (z. B. „(500 g)“, „(optional)“) erscheinen jetzt in der
  gedämpften Sekundärfarbe statt in normalem Text — eine darin verschachtelte Mengenangabe behält
  trotzdem ihre eigene Hervorhebung (`renderInlineMarkdown()` erhält dafür ein drittes,
  optionales `highlightParens`-Flag, das nur von `renderIngredientLine()` gesetzt wird — bewusst
  nicht global, sonst wären auch Klammern in Zubereitungsschritten betroffen). Läuft technisch
  erst nach dem Markdown-Link-Parsing, sonst würde das „(url)“ aus `[text](url)` fälschlich als
  Klammerinhalt erkannt und der Link bricht.
- „Exportieren“ und „Drucken“ stehen jetzt rechtsbündig zum Rezeptcontainer (eigener
  `.secondary-actions`-Wrapper mit `margin-left: auto`) mit 8 px Abstand zueinander, statt direkt
  neben „Kochen“ zu kleben. Über `auto` statt `space-between` gelöst, damit es auch dann stimmt,
  wenn es gar keinen „Kochen“-Button gibt (Rezept ohne Zubereitungsschritte).

### Sicherheits-Härtung und Aufräumen vor der Veröffentlichung

Vor dem ersten Push auf GitHub einmal durchgesehen, mit Blick auf die READ_ONLY-Instanz, die ja
bewusst öffentlich erreichbar sein soll:

- **Zip-Bomben-Schutz beim Bündel-Import.** `unzipSync()` entpackt alles auf einmal in den RAM —
  ein paar Kilobyte Upload konnten so zu Gigabyte im Speicher werden. Es wird jetzt schon _vor_
  dem Entpacken über fflates `filter`-Option anhand der im ZIP angegebenen Originalgröße
  gefiltert: max. 64 MB pro Rezept, max. 1 GB pro Archiv. Nebeneffekt: Nicht-Rezepte und
  macOS-Ressourcegabeln werden gar nicht erst dekomprimiert, statt wie vorher erst danach
  aussortiert zu werden.
- **Speicherobergrenze im Ephemeral-Cache.** Die Begrenzung auf 100 Einträge sagte nichts über
  den Speicherverbrauch — ein Rezept mit Fotos kann zweistellige MB groß sein. Jetzt zusätzlich
  ein Budget von 256 MB über die tatsächliche Größe, mit FIFO-Verdrängung.
- **Strikte Bildtyperkennung.** `sniffImageMime()` fiel vorher bei allem Unbekannten auf
  `image/jpeg` zurück — ein präpariertes Rezept hätte so beliebigen Inhalt unter einer Bild-URL
  derselben Origin ausliefern können. Jetzt wird nur noch ausgeliefert, was sich anhand der
  Magic Bytes eindeutig als JPEG/PNG/GIF/WebP/HEIC/AVIF ausweist, alles andere ergibt 404.
- **Kategorienamen begrenzt** (60 Zeichen, serverseitig geprüft) — ein POST muss nicht aus dem
  Formular kommen, vorher wäre beliebig viel Text in der Rezeptdatei gelandet.
- **Security-Header** in `hooks.server.ts`: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`. Bewusst in
  der App und nicht nur im Reverse Proxy, damit sie auch bei einem `docker run` ohne Proxy greifen.
- Gegengeprüft und für in Ordnung befunden: Path-Traversal über die Rezept-ID (`isSafeStorageId()`
  greift, `../`-Versuche ergeben 404), XSS über Rezeptinhalte (`escapeHtml()` läuft _vor_ dem
  Markdown-Parsing, `javascript:`-Links werden verworfen), Bildindex-Validierung.
- Der `npm audit`-Befund zu `cookie <0.7.0` ist ein transitiver Fund über `@sveltejs/kit` ohne
  verfügbares Update (2.70.2 ist aktuell) — und ohne Relevanz, weil Quince überhaupt keine Cookies
  setzt.

**Entfernter Ballast:**

- `static/fonts/liebe-heide.otf` (19 MB) — Überbleibsel aus dem ersten Design-Entwurf, längst durch
  Playfair Display + Geist via Fontsource ersetzt und nirgends mehr referenziert. Wäre außerdem
  eine kommerziell lizenzierte Schrift in einem öffentlichen Repo gewesen.
- `@fontsource-variable/open-sans` aus den devDependencies — wurde nie importiert.
- `src/lib/index.ts` — leerer Platzhalter aus dem SvelteKit-Scaffold.
- `quitte_favicon.ico` lag unbenutzt im Projektwurzelverzeichnis; liegt jetzt als
  `static/favicon.ico` und ist in `app.html` verlinkt, wird also endlich auch angezeigt.

**Veröffentlichung:** Das Image liegt als `ghcr.io/dmyrenne/quince` auf der GitHub Container
Registry (Tags `latest` und `0.1.0`, mit `org.opencontainers.image.source`-Label, damit das Paket
am Repo hängt und dessen Sichtbarkeit erbt). `docker-compose.yml` zieht dieses Image jetzt
standardmäßig, statt lokal zu bauen — der Normalfall ist „compose-Datei holen, `up -d`, fertig",
ohne den Quellcode auszuchecken. Über `QUINCE_VERSION` lässt sich ein Tag festnageln statt
`latest` zu folgen. Die `build: .`-Zeile steht weiterhin auskommentiert direkt darunter, für alle,
die lieber selbst bauen; beide Varianten sind mit `docker compose config` gegengeprüft.

**Für GitHub vorbereitet:** MIT-Lizenz ergänzt, README auf Englisch neu geschrieben (der veraltete
Tech-Stack-Absatz nannte noch „Liebe Heide“ und Open Sans), mit deutlichem Hinweis darauf, dass
Quince keinerlei Authentifizierung hat und ein schreibfähiger Betrieb deshalb nicht ins offene
Internet gehört. `.gitignore` deckt `/data` (die eigene Rezeptsammlung), `.env` und
`.claude/settings.local.json` ab.

**Bekannte Einschränkung (kein Regressionsfehler):** Fotos aus Mela liegen teils als HEIC vor
(8 von 53 Bildern in der Testbibliothek). Die werden jetzt wenigstens mit korrektem `image/heic`
ausgeliefert statt fälschlich als JPEG, aber außerhalb von Safari kann sie kein Browser anzeigen.
Sauber lösen ließe sich das nur durch Transcodierung nach JPEG beim Import (bräuchte `sharp` mit
libheif, also eine native Abhängigkeit) — Kandidat für später, zusammen mit einem
Platzhalter-Fallback, wenn ein Bild nicht dekodierbar ist.

### Step 4 – Google Drive Anbindung

- Rezepte in Google Drive ablegen/synchronisieren

### Step 5 – Kochmodus mit mehreren Rezepten

- Wie im Original: mehrere Rezepte gleichzeitig im Kochmodus anzeigbar

### Step 6 – Login mit Datenbank

- Optionales Konto, um Rezepte ohne Google Drive zu speichern
