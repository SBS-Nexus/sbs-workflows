import type { ConceptDraft } from '@/domain/content/schema';

/**
 * Konzeptgraph für den Kurs "AI-Grundlagen".
 *
 * Die Reihenfolge folgt bewusst der didaktischen Abfolge der vier Module
 * (Orientierung -> Technischer Arbeitsplatz -> LLM-Grundlagen ->
 * Prompting-Grundlagen). `difficulty` beschreibt die fachliche Einstiegshürde
 * (1 = ohne Vorwissen zugänglich, 5 = braucht mehrere gefestigte Vorläufer).
 */
export const concepts: ConceptDraft[] = [
  // --- Modul 1: Orientierung ------------------------------------------------
  {
    slug: 'aipfad-lernprinzip',
    name: 'AIPfad-Lernprinzip',
    description:
      'Das Grundprinzip von AIPfad: weniger Inhalt gleichzeitig, dafür tatsächliches Verständnis. Ein geführter Pfad schlägt jeweils einen nächsten Schritt vor, eine Bibliothek bleibt zum gezielten Nachschlagen verfügbar. Es gibt keine Streaks oder künstlichen Druckmittel.',
    difficulty: 1,
    prerequisiteSlugs: [],
  },
  {
    slug: 'ki-faehigkeiten-und-grenzen',
    name: 'Fähigkeiten und Grenzen heutiger KI',
    description:
      'Aktuelle KI-Sprachmodelle sind bei Textentwürfen, Übersetzung und Zusammenfassung stark, aber unzuverlässig bei exaktem Zählen, aktuellen Fakten und der Einschätzung der eigenen Unsicherheit. Sie erzeugen Sprache statistisch, ohne echtes Verständnis im menschlichen Sinn.',
    difficulty: 1,
    prerequisiteSlugs: [],
  },
  {
    slug: 'kompetenzstufen',
    name: 'Kompetenzstufen statt Prozentzahlen',
    description:
      'AIPfad zeigt Fortschritt als wenige, grobe Kompetenzbanden statt als genaue Prozentzahl, und verzichtet auf Streak-Verlust bei Pausen. Das verhindert falsche Präzision und unnötigen Druck, ohne den tatsächlichen Lernstand zu verschleiern.',
    difficulty: 1,
    prerequisiteSlugs: ['aipfad-lernprinzip'],
  },

  // --- Modul 2: Technischer Arbeitsplatz ------------------------------------
  {
    slug: 'pfad-und-pfadtrennzeichen',
    name: 'Pfad, Ordner und Dateiendung',
    description:
      'Ein Pfad beschreibt den Weg zu einer Datei durch verschachtelte Ordner. Absolute Pfade beginnen an der Wurzel des Dateisystems, relative Pfade gelten nur ausgehend vom aktuellen Arbeitsverzeichnis. Die Dateiendung benennt das erwartete Format.',
    difficulty: 1,
    prerequisiteSlugs: [],
  },
  {
    slug: 'terminal-grundbegriffe',
    name: 'Terminal-Grundbegriffe',
    description:
      'Im Terminal besteht eine Eingabe aus einem Befehl und optionalen Argumenten. Das Arbeitsverzeichnis legt fest, wo relative Pfade und Befehle wie ls oder cd greifen. Jeder Befehl wirkt zuerst genau dort, wo du gerade "stehst".',
    difficulty: 2,
    prerequisiteSlugs: ['pfad-und-pfadtrennzeichen'],
  },
  {
    slug: 'umgebungsvariablen',
    name: 'Umgebungsvariablen und .gitignore',
    description:
      'Eine .env-Datei speichert geheime Werte wie Zugangsschlüssel lokal außerhalb des Quellcodes. Die .gitignore-Datei listet Dateien, die Git niemals in die Versionsgeschichte aufnehmen soll – so bleiben Geheimnisse aus dem Repository heraus.',
    difficulty: 2,
    prerequisiteSlugs: ['terminal-grundbegriffe'],
  },

  // --- Modul 3: LLM-Grundlagen -----------------------------------------------
  {
    slug: 'token',
    name: 'Token',
    description:
      'Die kleinste Texteinheit, mit der ein Sprachmodell rechnet – oft ein Wortteil, kein ganzer Buchstabe und kein ganzes Wort. Modelle "sehen" Text als Folge von Tokens, nicht als Folge einzelner Zeichen.',
    difficulty: 1,
    prerequisiteSlugs: [],
  },
  {
    slug: 'tokenisierung',
    name: 'Tokenisierung',
    description:
      'Der Vorgang, der Text in Tokens zerlegt, bevor ein Sprachmodell ihn verarbeitet. Häufige Wörter werden oft zu einem Token, seltene oder lange Wörter in mehrere Teilstücke zerlegt.',
    difficulty: 2,
    prerequisiteSlugs: ['token'],
  },
  {
    slug: 'embedding',
    name: 'Embedding',
    description:
      'Die Abbildung eines Tokens auf eine lange Liste von Zahlen (einen Vektor), die seine Position in einem Bedeutungsraum beschreibt. Bedeutungsähnliche Tokens liegen dort nah beieinander, unabhängig von ihrer Schreibweise.',
    difficulty: 2,
    prerequisiteSlugs: ['tokenisierung'],
  },
  {
    slug: 'transformer-aufmerksamkeit',
    name: 'Transformer-Aufmerksamkeit (Attention)',
    description:
      'Der Mechanismus, mit dem ein Transformer-Modell für jedes Token berechnet, wie relevant jedes andere Token im Kontext für seine Interpretation ist. Diese gelernte Gewichtung entscheidet, welche früheren Wörter bei der nächsten Vorhersage stärker einfließen.',
    difficulty: 3,
    prerequisiteSlugs: ['embedding'],
  },
  {
    slug: 'training-vs-inferenz',
    name: 'Training vs. Inferenz',
    description:
      'Training passt die Modellgewichte einmalig anhand riesiger Textmengen an und ist extrem rechenintensiv. Inferenz nutzt die danach eingefrorenen Gewichte, um bei jeder einzelnen Nachricht schnell eine Antwort zu berechnen, ohne dabei dauerhaft etwas Neues zu lernen.',
    difficulty: 2,
    prerequisiteSlugs: ['transformer-aufmerksamkeit'],
  },
  {
    slug: 'context-window',
    name: 'Context Window',
    description:
      'Das Kontextfenster (Context Window) ist die begrenzte Menge an Tokens, die ein Modell in einem Gespräch gleichzeitig "sehen" kann. Wird das Limit erreicht, fallen ältere Inhalte heraus oder werden gekürzt und sind für das Modell nicht mehr sichtbar.',
    difficulty: 2,
    prerequisiteSlugs: ['training-vs-inferenz'],
  },
  {
    slug: 'nachrichtenrollen',
    name: 'Nachrichtenrollen (System, User, Assistant)',
    description:
      'Nachrichten in einem Chat-Verlauf tragen eine Rolle: System (Regeln des Betreibers), User (Eingaben der Nutzerin oder des Nutzers) und Assistant (bisherige Antworten des Modells). Alle Rollen zusammen füllen dasselbe Context Window.',
    difficulty: 1,
    prerequisiteSlugs: ['context-window'],
  },
  {
    slug: 'halluzination',
    name: 'Halluzination',
    description:
      'Sicher klingende, aber erfundene oder falsche Aussagen eines Sprachmodells. Sie entstehen strukturell, weil das Modell das plausibelste nächste Token vorhersagt, ohne eingebauten Abgleich mit einer verlässlichen Wissensquelle.',
    difficulty: 3,
    prerequisiteSlugs: ['training-vs-inferenz', 'ki-faehigkeiten-und-grenzen'],
  },

  // --- Modul 4: Prompting-Grundlagen ------------------------------------------
  {
    slug: 'prompt-ziel-und-kontext',
    name: 'Prompt-Ziel und Kontext',
    description:
      'Ein wirksamer Prompt benennt explizit das gewünschte Ziel (wofür wird die Antwort gebraucht) und liefert den nötigen Hintergrund (Kontext), damit das Modell nicht raten muss, was gemeint ist.',
    difficulty: 1,
    prerequisiteSlugs: ['nachrichtenrollen'],
  },
  {
    slug: 'prompt-constraints-und-beispiele',
    name: 'Prompt-Constraints und Beispiele',
    description:
      'Einschränkungen (Länge, Tonfall, Ausschlüsse, Format) und Beispiele engen den Ergebnisraum eines Prompts gezielt ein und erhöhen die Trefferwahrscheinlichkeit der Antwort deutlich.',
    difficulty: 2,
    prerequisiteSlugs: ['prompt-ziel-und-kontext'],
  },
  {
    slug: 'prompt-iteration',
    name: 'Zerlegung und Iteration',
    description:
      'Große, vage Aufträge lassen sich in kleinere, prüfbare Teilschritte zerlegen. Ein unbefriedigendes Zwischenergebnis wird gezielt nachgebessert statt komplett neu formuliert.',
    difficulty: 2,
    prerequisiteSlugs: ['prompt-constraints-und-beispiele'],
  },
];
