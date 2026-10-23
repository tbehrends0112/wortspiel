/* ==========================================================
   Wortspiel – Spiellogik
   Aufbau:
   1. Konstanten und Wortliste
   2. Reine Hilfsfunktionen (Auswertung, Prüfung)
   3. Statistik (localStorage)
   4. Spielzustand und Oberfläche
   5. Ereignisse (Tastatur, Schaltflächen) und Start
   ========================================================== */

"use strict";

/* ---------- 1. Konstanten und Wortliste ---------- */

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const STORAGE_KEY = "wortspiel-statistik";

// Hier kann die Wortliste geändert oder erweitert werden.
// Regeln: genau 5 Buchstaben, Großbuchstaben, keine Umlaute und kein ß.
const WORDS = [
  "APFEL", "BAUER", "BERGE", "BLATT", "BLITZ", "BLUME", "BRAUN", "BRAUT", "BRIEF", "BRUCH",
  "BRUST", "BUSCH", "DACHS", "DAUER", "DEGEN", "DRUCK", "EIMER", "FABEL", "FARBE", "FEIER",
  "FEUER", "FILME", "FISCH", "FLUSS", "FRAGE", "GABEL", "GEIST", "HAFEN", "HANDY", "HASEN",
  "HEFTE", "HONIG", "HOTEL", "HUNDE", "INSEL", "JACKE", "JAHRE", "KARTE", "KATZE", "KERZE",
  "KISTE", "KLEID", "KOHLE", "KRAFT", "KREIS", "LAMPE", "LEBEN", "LEDER", "LICHT", "LIEBE",
  "LINIE", "MACHT", "MAGEN", "MILCH", "MONAT", "MUSIK", "NACHT", "NADEL", "NEBEL", "NUDEL",
  "OHREN", "PAPST", "PAUSE", "PILZE", "PLATZ", "PREIS", "PUNKT", "RADIO", "REGEN", "REISE",
  "RUHIG", "SALAT", "SCHAF", "SEGEL", "SONNE", "SPIEL", "STADT", "STEIN", "STERN", "STIFT",
  "STROM", "STUHL", "TAFEL", "TASSE", "TIGER", "TISCH", "TRAUM", "VOGEL", "WAAGE", "WELLE",
  "WIESE", "WOCHE", "WOLKE", "WURST", "ZEBRA", "ZEUGE", "ZWEIG", "BANAN", "ROSEN", "WAGEN",
  "KUGEL", "TEICH", "STAUB", "SCHAL", "KLEIN", "BLOCK", "MAUER", "DECKE"
].filter((w) => w.length === WORD_LENGTH); // Sicherheitsnetz gegen Tippfehler in der Liste

// Layout der Bildschirmtastatur (deutsches QWERTZ).
// "ENTER" und "BACK" sind Sondertasten.
const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Y", "X", "C", "V", "B", "N", "M", "BACK"]
];

// Rangfolge der Zustände: ein höherer Wert darf nie von einem niedrigeren überschrieben werden.
const STATE_RANK = { absent: 1, present: 2, correct: 3 };

// Lesbare Namen für Screenreader
const STATE_LABEL = { correct: "richtig", present: "falsche Position", absent: "nicht enthalten" };

/* ---------- 2. Reine Hilfsfunktionen ---------- */

/**
 * Wertet einen Versuch gegen das Lösungswort aus.
 * Gibt ein Array mit "correct" | "present" | "absent" pro Buchstabe zurück.
 * Doppelte Buchstaben werden korrekt behandelt: Ein Buchstabe wird nie
 * häufiger markiert, als er im Lösungswort vorkommt.
 */
function evaluateGuess(guess, solution) {
  const result = new Array(guess.length).fill("absent");
  const remaining = {}; // Anzahl der noch "verfügbaren" Buchstaben der Lösung

  // Durchgang 1: Grüne Treffer markieren, alle anderen Lösungsbuchstaben zählen
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === solution[i]) {
      result[i] = "correct";
    } else {
      remaining[solution[i]] = (remaining[solution[i]] || 0) + 1;
    }
  }

  // Durchgang 2: Gelb nur, solange noch ein unverbrauchter Buchstabe übrig ist
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    if (remaining[guess[i]] > 0) {
      result[i] = "present";
      remaining[guess[i]]--;
    }
  }
  return result;
}

/** Prüft, ob die Eingabe aus genau fünf Buchstaben (A–Z) besteht. */
function isValidWordFormat(word) {
  return new RegExp("^[A-Z]{" + WORD_LENGTH + "}$").test(word);
}

/** Liefert ein zufälliges Wort, möglichst nicht das zuletzt gespielte. */
function pickRandomWord(previous) {
  let word;
  do {
    word = WORDS[Math.floor(Math.random() * WORDS.length)];
  } while (word === previous && WORDS.length > 1);
  return word;
}

/* ---------- 3. Statistik (localStorage) ---------- */

const DEFAULT_STATS = { played: 0, won: 0, streak: 0, best: 0 };

function loadStats() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Object.assign({}, DEFAULT_STATS, stored);
  } catch (e) {
    return Object.assign({}, DEFAULT_STATS); // localStorage nicht verfügbar oder beschädigt
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    /* Speichern nicht möglich – das Spiel läuft trotzdem weiter */
  }
}

/** Trägt das Ergebnis eines beendeten Spiels in die Statistik ein. */
function recordResult(won) {
  const stats = loadStats();
  stats.played++;
  if (won) {
    stats.won++;
    stats.streak++;
    stats.best = Math.max(stats.best, stats.streak);
  } else {
    stats.streak = 0;
  }
  saveStats(stats);
}

/* ---------- 4. Spielzustand und Oberfläche ---------- */

// Der Browser-Teil läuft nur, wenn ein Dokument vorhanden ist
// (so lässt sich die Logik oben auch ohne Browser testen).
if (typeof document !== "undefined") {
  const els = {
    board: document.getElementById("board"),
    keyboard: document.getElementById("keyboard"),
    message: document.getElementById("message"),
    attempt: document.getElementById("attempt"),
    result: document.getElementById("result"),
    help: document.getElementById("help"),
    helpToggle: document.getElementById("help-toggle"),
    newGame: document.getElementById("new-game"),
    statsBtn: document.getElementById("stats-btn"),
    statsDialog: document.getElementById("stats-dialog"),
    statsClose: document.getElementById("stats-close"),
    statsReset: document.getElementById("stats-reset")
  };

  let solution = "";
  let currentRow = 0;          // Index der aktuellen Zeile
  let currentGuess = "";       // bisher getippte Buchstaben
  let gameOver = false;
  let busy = false;            // true während der Aufdeck-Animation
  let messageTimer = null;
  let gameId = 0;              // erhöht sich pro Spiel; verwirft veraltete Animations-Timer
  const keyStates = {};        // Buchstabe -> bester bekannter Zustand
  const tiles = [];            // tiles[zeile][spalte]
  const rows = [];

  /** Erzeugt Spielfeld und Bildschirmtastatur (einmalig). */
  function buildUI() {
    for (let r = 0; r < MAX_ATTEMPTS; r++) {
      const row = document.createElement("div");
      row.className = "row";
      tiles[r] = [];
      for (let c = 0; c < WORD_LENGTH; c++) {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.setAttribute("role", "img");
        tile.setAttribute("aria-label", "leer");
        row.appendChild(tile);
        tiles[r][c] = tile;
      }
      els.board.appendChild(row);
      rows[r] = row;
    }

    KEYBOARD_ROWS.forEach((letters) => {
      const row = document.createElement("div");
      row.className = "kb-row";
      letters.forEach((k) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "key";
        btn.dataset.key = k;
        if (k === "ENTER") {
          btn.textContent = "Enter";
          btn.classList.add("wide");
          btn.setAttribute("aria-label", "Eingabe bestätigen");
        } else if (k === "BACK") {
          btn.textContent = "⌫";
          btn.classList.add("wide");
          btn.setAttribute("aria-label", "Letzten Buchstaben löschen");
        } else {
          btn.textContent = k;
        }
        row.appendChild(btn);
      });
      els.keyboard.appendChild(row);
    });
  }

  /** Setzt alles zurück und wählt ein neues Wort. */
  function startGame() {
    gameId++;
    solution = pickRandomWord(solution);
    currentRow = 0;
    currentGuess = "";
    gameOver = false;
    busy = false;

    for (let r = 0; r < MAX_ATTEMPTS; r++) {
      for (let c = 0; c < WORD_LENGTH; c++) {
        const t = tiles[r][c];
        t.textContent = "";
        t.className = "tile";
        t.removeAttribute("data-state");
        t.removeAttribute("data-filled");
        t.setAttribute("aria-label", "leer");
      }
    }
    Object.keys(keyStates).forEach((k) => delete keyStates[k]);
    els.keyboard.querySelectorAll(".key").forEach((btn) => btn.removeAttribute("data-state"));

    els.result.hidden = true;
    els.result.textContent = "";
    showMessage("");
    updateAttemptDisplay();
  }

  function updateAttemptDisplay() {
    const n = Math.min(currentRow + 1, MAX_ATTEMPTS);
    els.attempt.textContent = gameOver ? "Spiel beendet" : "Versuch " + n + " von " + MAX_ATTEMPTS;
  }

  /** Zeigt eine Meldung; mit duration (ms) verschwindet sie wieder. */
  function showMessage(text, duration) {
    clearTimeout(messageTimer);
    els.message.textContent = text;
    if (text && duration) {
      messageTimer = setTimeout(() => { els.message.textContent = ""; }, duration);
    }
  }

  /** Lässt die aktuelle Zeile wackeln. */
  function shakeRow() {
    const row = rows[currentRow];
    row.classList.remove("shake");
    void row.offsetWidth; // Animation neu starten
    row.classList.add("shake");
  }

  /** Zeigt den aktuellen Eingabestand in der aktuellen Zeile an. */
  function renderCurrentRow() {
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = tiles[currentRow][c];
      const letter = currentGuess[c] || "";
      tile.textContent = letter;
      if (letter) {
        tile.dataset.filled = "true";
        tile.setAttribute("aria-label", letter);
      } else {
        tile.removeAttribute("data-filled");
        tile.setAttribute("aria-label", "leer");
      }
    }
  }

  function addLetter(letter) {
    if (gameOver || busy || currentGuess.length >= WORD_LENGTH) return;
    currentGuess += letter;
    renderCurrentRow();
  }

  function removeLetter() {
    if (gameOver || busy || currentGuess.length === 0) return;
    currentGuess = currentGuess.slice(0, -1);
    renderCurrentRow();
  }

  /** Versuch absenden: prüfen, auswerten, aufdecken. */
  function submitGuess() {
    if (gameOver || busy) return;

    if (currentGuess.length < WORD_LENGTH) {
      showMessage("Bitte gib ein Wort mit " + WORD_LENGTH + " Buchstaben ein.", 2000);
      shakeRow();
      return;
    }
    if (!isValidWordFormat(currentGuess)) {
      showMessage("Nur Buchstaben von A bis Z sind erlaubt.", 2000);
      shakeRow();
      return;
    }

    showMessage("");
    const guess = currentGuess;
    const rowIndex = currentRow;
    const states = evaluateGuess(guess, solution);
    const thisGame = gameId;
    busy = true;

    // Felder nacheinander umdrehen; die Farbe wird in der Mitte der Animation gesetzt
    states.forEach((state, i) => {
      setTimeout(() => {
        if (thisGame !== gameId) return; // in der Zwischenzeit wurde ein neues Spiel gestartet
        const tile = tiles[rowIndex][i];
        tile.classList.add("flip");
        setTimeout(() => {
          if (thisGame !== gameId) return;
          tile.dataset.state = state;
          tile.setAttribute("aria-label", guess[i] + ", " + STATE_LABEL[state]);
        }, 250);
      }, i * 300);
    });

    // Nach der letzten Animation: Tastatur aktualisieren und Spielende prüfen
    setTimeout(() => {
      if (thisGame !== gameId) return;
      updateKeyboard(guess, states);
      busy = false;
      finishAttempt(guess);
    }, (WORD_LENGTH - 1) * 300 + 550);
  }

  /** Prüft nach einem Versuch auf Sieg/Niederlage oder geht zur nächsten Zeile. */
  function finishAttempt(guess) {
    if (guess === solution) {
      gameOver = true;
      recordResult(true);
      const n = currentRow + 1;
      showResult("win", "🎉 Super! Du hast das Wort in " + n + (n === 1 ? " Versuch" : " Versuchen") + " erraten!");
    } else if (currentRow === MAX_ATTEMPTS - 1) {
      gameOver = true;
      recordResult(false);
      showResult("lose", "Leider verloren. Das gesuchte Wort war: " + solution);
    } else {
      currentRow++;
      currentGuess = "";
    }
    updateAttemptDisplay();
  }

  function showResult(type, text) {
    els.result.className = "result " + type;
    els.result.textContent = text;
    els.result.hidden = false;
  }

  /** Färbt die Bildschirmtastatur; ein besserer Zustand wird nie überschrieben. */
  function updateKeyboard(guess, states) {
    states.forEach((state, i) => {
      const letter = guess[i];
      if (!keyStates[letter] || STATE_RANK[state] > STATE_RANK[keyStates[letter]]) {
        keyStates[letter] = state;
        const btn = els.keyboard.querySelector('[data-key="' + letter + '"]');
        if (btn) {
          btn.dataset.state = state;
          btn.setAttribute("aria-label", letter + ", " + STATE_LABEL[state]);
        }
      }
    });
  }

  /* ---------- Statistik-Anzeige ---------- */

  function renderStats() {
    const s = loadStats();
    const rate = s.played > 0 ? Math.round((s.won / s.played) * 100) : 0;
    document.getElementById("stat-played").textContent = s.played;
    document.getElementById("stat-won").textContent = s.won;
    document.getElementById("stat-rate").textContent = rate + " %";
    document.getElementById("stat-streak").textContent = s.streak;
    document.getElementById("stat-best").textContent = s.best;
  }

  /* ---------- 5. Ereignisse und Start ---------- */

  /** Gemeinsamer Einstieg für Bildschirm- und physische Tastatur. */
  function handleKey(key) {
    if (key === "ENTER") submitGuess();
    else if (key === "BACK") removeLetter();
    else addLetter(key);
  }

  // Bildschirmtastatur
  els.keyboard.addEventListener("click", (event) => {
    const btn = event.target.closest(".key");
    if (btn) handleKey(btn.dataset.key);
  });

  // Physische Tastatur
  document.addEventListener("keydown", (event) => {
    if (els.statsDialog.open) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === "Enter") {
      // Hat eine Schaltfläche den Fokus, löst Enter bereits deren Klick aus
      if (event.target.closest && event.target.closest("button")) return;
      event.preventDefault();
      handleKey("ENTER");
    } else if (event.key === "Backspace") {
      event.preventDefault();
      handleKey("BACK");
    } else if (/^[a-zA-Z]$/.test(event.key)) {
      handleKey(event.key.toUpperCase());
    }
  });

  // Neues Spiel
  els.newGame.addEventListener("click", () => {
    startGame();
    els.newGame.blur(); // Fokus abgeben, damit Enter nicht erneut ein neues Spiel startet
  });

  // Anleitung ein-/ausblenden
  els.helpToggle.addEventListener("click", () => {
    const open = els.help.hidden;
    els.help.hidden = !open;
    els.helpToggle.setAttribute("aria-expanded", String(open));
    els.helpToggle.textContent = open ? "Anleitung ausblenden" : "Anleitung";
  });

  // Statistik
  els.statsBtn.addEventListener("click", () => {
    renderStats();
    els.statsDialog.showModal();
  });
  els.statsClose.addEventListener("click", () => els.statsDialog.close());
  els.statsReset.addEventListener("click", () => {
    if (confirm("Möchtest du die gespeicherte Statistik wirklich zurücksetzen?")) {
      saveStats(Object.assign({}, DEFAULT_STATS));
      renderStats();
    }
  });

  buildUI();
  startGame();

  // Offline-Fähigkeit / Installation als App (nur über http(s), nicht per file://)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* Spiel läuft auch ohne */ });
  }
}
