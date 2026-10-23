# Wortspiel

Ein Wortratespiel nach dem Wordle-Prinzip – komplett in HTML, CSS und Vanilla JavaScript.
Keine Frameworks, keine Bibliotheken, keine Internetverbindung nötig.

## Starten

Die Datei `index.html` per Doppelklick im Browser öffnen. Eine Installation oder ein Server ist nicht nötig.

## Auf iPhone, iPad und Android nutzen

Die App ist eine installierbare Web-App (PWA) und läuft nach dem ersten Laden auch offline.
Dazu müssen die Dateien über **HTTPS** bereitgestellt werden (z. B. GitHub Pages, Netlify, eigener Webserver).
Ein Doppelklick auf `index.html` funktioniert weiterhin am PC, aber ohne Installation/Offline-Modus.

- **iPhone / iPad (Safari):** Teilen-Symbol → „Zum Home-Bildschirm“
- **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“

Lokal testen: im Projektordner `python -m http.server 8000` starten und `http://localhost:8000` öffnen
(vom Handy im selben WLAN über die IP des Rechners; die Installation verlangt aber HTTPS).

Nach Änderungen an den Dateien in `sw.js` den Wert `CACHE_NAME` hochzählen, damit Geräte die neue Version laden.

## Dateien

| Datei        | Inhalt                                                                 |
|--------------|------------------------------------------------------------------------|
| `index.html` | Seitenstruktur: Spielfeld, Tastatur, Anleitung, Statistik-Dialog       |
| `style.css`  | Gestaltung, Farben, Animationen, responsives Layout                    |
| `script.js`  | Wortliste, Spiellogik, Bildschirm-/Tastatureingabe, Statistik          |
| `manifest.webmanifest` | App-Daten für die Installation (Name, Farben, Icons)         |
| `sw.js`      | Service Worker für den Offline-Betrieb                                 |
| `icons/`     | App-Symbole (180, 192, 512 px)                                         |
| `README.md`  | Diese Beschreibung                                                     |

## Spielregeln

- Gesucht ist ein deutsches Wort mit genau **5 Buchstaben**. Du hast **6 Versuche**.
- Nach jedem Versuch wird jeder Buchstabe bewertet (Farbe **und** Symbol):
  - **Grün ✓** – richtiger Buchstabe an der richtigen Position
  - **Gelb ↔** – Buchstabe kommt im Wort vor, steht aber an anderer Stelle
  - **Grau ✕** – Buchstabe kommt nicht im Wort vor
- Doppelte Buchstaben werden korrekt gezählt: Ein Buchstabe wird nie häufiger als gelb/grün markiert, als er im Lösungswort vorkommt.
- Nach Sieg oder Niederlage sind keine Eingaben mehr möglich. Bei einer Niederlage wird das gesuchte Wort angezeigt.
- „Neues Spiel“ wählt ein neues zufälliges Wort.
- Eingabe: Bildschirmtastatur (QWERTZ) oder physische Tastatur (Buchstaben, Rücktaste, Enter). Groß-/Kleinschreibung ist egal.
- Statistiken (gespielt, gewonnen, Gewinnquote, aktuelle und beste Serie) werden im `localStorage` des Browsers gespeichert und lassen sich im Statistik-Dialog zurücksetzen.

## Wortliste ändern oder erweitern

In `script.js` ganz oben steht die Konstante `WORDS`. Dort einfach weitere Wörter eintragen:

- genau 5 Buchstaben, in Großbuchstaben
- keine Umlaute (Ä, Ö, Ü) und kein ß
- durch Kommas getrennt, in Anführungszeichen

Einträge mit anderer Länge werden automatisch ignoriert.

## Hinweis

Als Versuch wird jedes Wort aus 5 Buchstaben (A–Z) akzeptiert; es gibt keinen Abgleich mit einem vollständigen Wörterbuch. Dieser lässt sich bei Bedarf in `submitGuess()` ergänzen.
