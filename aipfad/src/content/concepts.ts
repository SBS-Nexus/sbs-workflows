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

  // --- Modul 5/6: Git & GitHub (Ausbaustufe 2) ------------------------------
  {
    slug: 'versionsverwaltung',
    name: 'Versionsverwaltung',
    description:
      'Ein System, das jeden Bearbeitungsstand festhält und jederzeit wieder abrufbar macht. Es beantwortet drei Fragen, die Dateikopien mit Namen wie "final_v3_wirklich_final" nie zuverlässig beantworten: Was hat sich geändert, wann, und warum. Erst dadurch wird gemeinsames Arbeiten am selben Stand möglich.',
    difficulty: 1,
    prerequisiteSlugs: ['terminal-grundbegriffe'],
  },
  {
    slug: 'git-repository',
    name: 'Repository',
    description:
      'Ein Ordner, in dem Git den vollständigen Verlauf mitführt — technisch im versteckten Unterordner .git. Erst dadurch wird ein gewöhnlicher Ordner zu einem Projekt mit Gedächtnis. Jede Kopie eines Repositories enthält den ganzen Verlauf, nicht nur den aktuellen Stand.',
    difficulty: 1,
    prerequisiteSlugs: ['versionsverwaltung', 'pfad-und-pfadtrennzeichen'],
  },
  {
    slug: 'arbeitsverzeichnis',
    name: 'Arbeitsverzeichnis',
    description:
      'Die Dateien, die du gerade siehst und bearbeitest. Was hier steht, ist zunächst nur auf deiner Festplatte — Git weiß erst davon, wenn du es ausdrücklich weitergibst. Änderungen hier sind nicht durch Git gesichert.',
    difficulty: 1,
    prerequisiteSlugs: ['git-repository'],
  },
  {
    slug: 'staging-area',
    name: 'Staging Area',
    description:
      'Der Zwischenbereich zwischen Arbeitsverzeichnis und Repository. Hier stellst du zusammen, was in den nächsten Commit soll — und nur das kommt mit. Die Staging Area ist der Grund, warum sich aus vielen gemischten Änderungen mehrere saubere Commits bauen lassen.',
    difficulty: 2,
    prerequisiteSlugs: ['arbeitsverzeichnis'],
  },
  {
    slug: 'commit',
    name: 'Commit',
    description:
      'Ein festgehaltener Stand mit Zeitpunkt, Urheberin und Begründung. Ein Commit ist keine Datei-Version, sondern eine Momentaufnahme des gesamten vorgemerkten Standes. Er ist unveränderlich: Spätere Korrekturen entstehen als neue Commits.',
    difficulty: 2,
    prerequisiteSlugs: ['staging-area'],
  },
  {
    slug: 'commit-verlauf',
    name: 'Commit-Verlauf',
    description:
      'Die Kette der Commits, jeder mit Verweis auf seinen Vorgänger. Aus dieser Kette ergibt sich, wie ein Stand entstanden ist. Weil jeder Commit auf seine Eltern zeigt, ist der Verlauf ein Graph — keine bloße Liste.',
    difficulty: 2,
    prerequisiteSlugs: ['commit'],
  },
  {
    slug: 'diff',
    name: 'Diff',
    description:
      'Die zeilenweise Gegenüberstellung zweier Stände: Was kam hinzu, was fiel weg. Ein Diff beantwortet die Frage "was genau ändert sich hier" — die zentrale Frage jeder Durchsicht. Welche zwei Stände verglichen werden, hängt vom Befehl ab.',
    difficulty: 2,
    prerequisiteSlugs: ['commit-verlauf'],
  },
  {
    slug: 'branch',
    name: 'Branch',
    description:
      'Ein beweglicher Zeiger auf einen Commit — keine Kopie und kein Ordner. Deshalb kostet das Anlegen praktisch nichts. Ein neuer Commit verschiebt den Zeiger des aktuellen Branches; alle anderen bleiben, wo sie sind.',
    difficulty: 3,
    prerequisiteSlugs: ['commit-verlauf'],
  },
  {
    slug: 'merge',
    name: 'Merge',
    description:
      'Das Zusammenführen zweier Entwicklungslinien. Liegt der eigene Stand vollständig in der Vorgeschichte des anderen, wandert nur der Zeiger weiter. Sind beide Linien auseinandergelaufen, entsteht ein Commit mit zwei Eltern, der beide Wege zusammenhält.',
    difficulty: 3,
    prerequisiteSlugs: ['branch'],
  },
  {
    slug: 'merge-konflikt',
    name: 'Merge-Konflikt',
    description:
      'Entsteht, wenn beide Seiten dieselbe Stelle unterschiedlich geändert haben. Kein Fehler und kein Schaden: Git markiert die Stelle und überlässt die Entscheidung dem Menschen, weil nur er weiß, was gemeint war. Die Marker müssen vor dem Abschluss entfernt werden.',
    difficulty: 3,
    prerequisiteSlugs: ['merge'],
  },
  {
    slug: 'remote-repository',
    name: 'Remote-Repository',
    description:
      'Ein Repository, das woanders liegt — meist auf einem Server, damit mehrere darauf zugreifen können. "origin" ist dabei nur der übliche Name für das Remote, aus dem geklont wurde, kein feststehender Begriff. Dein lokales Repository bleibt vollständig eigenständig.',
    difficulty: 3,
    prerequisiteSlugs: ['git-repository'],
  },
  {
    slug: 'fetch-und-pull',
    name: 'Fetch und Pull',
    description:
      'Fetch holt den entfernten Stand herunter und lässt deine Arbeit unangetastet — du kannst danach in Ruhe ansehen, was sich getan hat. Pull holt UND baut sofort in deinen aktuellen Branch ein. Der Unterschied entscheidet, ob du überrascht wirst oder nicht.',
    difficulty: 3,
    prerequisiteSlugs: ['remote-repository', 'merge'],
  },
  {
    slug: 'github-plattform',
    name: 'GitHub als Plattform',
    description:
      'GitHub ist nicht Git. Git ist das Versionsverwaltungssystem auf deinem Rechner; GitHub ist ein Dienst, der Repositories hostet und darum herum Zusammenarbeit organisiert: Issues, Pull Requests, Durchsichten, automatische Prüfungen, Rechte. Git funktioniert vollständig ohne GitHub.',
    difficulty: 2,
    prerequisiteSlugs: ['remote-repository'],
  },
  {
    slug: 'pull-request',
    name: 'Pull Request',
    description:
      'Der Vorschlag, einen Branch in einen anderen zu übernehmen — samt Ort für Diskussion, Durchsicht und automatische Prüfungen. Ein Pull Request ist ein Konzept der Plattform, nicht von Git selbst. Er macht aus einem Merge eine nachvollziehbare, gemeinsame Entscheidung.',
    difficulty: 3,
    prerequisiteSlugs: ['github-plattform', 'branch'],
  },
  {
    slug: 'code-review',
    name: 'Code Review',
    description:
      'Die Durchsicht vorgeschlagener Änderungen durch andere, bevor sie übernommen werden. Ziel ist nicht Kontrolle, sondern geteiltes Wissen und frühes Entdecken von Problemen. Anmerkungen beziehen sich auf konkrete Zeilen des Diffs.',
    difficulty: 3,
    prerequisiteSlugs: ['pull-request', 'diff'],
  },
  {
    slug: 'continuous-integration',
    name: 'Automatische Prüfungen (CI)',
    description:
      'Prüfläufe, die bei jeder vorgeschlagenen Änderung automatisch starten: übersetzen, testen, Regeln prüfen. Sie beantworten die Frage "funktioniert das überhaupt", bevor ein Mensch Zeit investiert. Eine rote Prüfung ist eine Information, kein Urteil.',
    difficulty: 3,
    prerequisiteSlugs: ['pull-request'],
  },
  {
    slug: 'aenderungen-zuruecknehmen',
    name: 'Änderungen zurücknehmen',
    description:
      'Drei ähnlich klingende Wege mit sehr verschiedenen Folgen: restore betrifft das Arbeitsverzeichnis, revert legt einen ausgleichenden neuen Commit an, reset verschiebt den Branch-Zeiger. Entscheidend ist, ob etwas bereits veröffentlicht wurde — dann ist revert der verträgliche Weg.',
    difficulty: 4,
    prerequisiteSlugs: ['commit-verlauf', 'staging-area'],
  },
  {
    slug: 'reflog',
    name: 'Reflog als Rettungsanker',
    description:
      'Git führt Buch über jede Bewegung von HEAD — auch über die, die im normalen Verlauf nicht mehr auftauchen. Nach einem versehentlichen Zurücksetzen steht hier die Commit-Kennung, zu der man zurückkann. Nie committete Arbeit rettet allerdings auch das Reflog nicht.',
    difficulty: 4,
    prerequisiteSlugs: ['aenderungen-zuruecknehmen'],
  },
];
