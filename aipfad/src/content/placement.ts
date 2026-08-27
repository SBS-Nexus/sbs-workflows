import type { PlacementQuestionDraft } from '@/domain/placement/placement';

/**
 * Diagnostische Einstufung (Stufe 0). Acht Fragen, aufsteigend von
 * logischem Denken ohne Fachbegriff bis zu AI-Konzepten. "Weiß ich nicht"
 * ist immer eine gleichwertige Option (siehe domain/placement/placement.ts).
 */
export const placementQuestions: PlacementQuestionDraft[] = [
  {
    id: 'q1-logik',
    area: 'logic',
    question:
      'Ein Rezept sagt: "Rühre die Soße, bis sie eindickt." Was passiert, wenn du nach zwei Minuten Rühren aufhörst, obwohl die Soße noch flüssig ist?',
    options: [
      { id: 'a', text: 'Die Soße dickt trotzdem ein, weil zwei Minuten immer genug sind.' },
      { id: 'b', text: 'Die Anweisung ist noch nicht erfüllt — das Ziel zählt, nicht die Zeit.' },
      { id: 'c', text: 'Das Rezept ist falsch formuliert.' },
    ],
    correctOptionId: 'b',
    weight: 0.75,
    explanation:
      'Eine Bedingung ("bis sie eindickt") beschreibt ein Ziel, keine feste Dauer. Das ist dieselbe Art von Denken, die später bei Prompts und bei Programmschleifen wichtig wird.',
  },
  {
    id: 'q2-logik',
    area: 'logic',
    question:
      'Du befolgst eine Wegbeschreibung Schritt für Schritt. Bei Schritt 4 stellst du fest: Die Straße aus Schritt 3 gibt es nicht. Was ist der sinnvollste nächste Schritt?',
    options: [
      { id: 'a', text: 'Schritt 4 trotzdem versuchen — vielleicht klappt es zufällig.' },
      { id: 'b', text: 'Zurück zu Schritt 3 und die Voraussetzung genauer prüfen.' },
      { id: 'c', text: 'Von vorne beginnen, alle Schritte neu lesen.' },
    ],
    correctOptionId: 'b',
    weight: 0.75,
    explanation:
      'Ein Fehler an einer Stelle wird an der Stelle untersucht, an der er auftrat — nicht davor und nicht danach. Dieses Prinzip zieht sich durch Terminal-Fehlermeldungen und AI-Antworten gleichermaßen.',
  },
  {
    id: 'q3-technik',
    area: 'technical-basics',
    question: 'Was beschreibt ein "Pfad" wie /dokumente/notizen.txt am ehesten?',
    options: [
      { id: 'a', text: 'Den Namen eines Programms.' },
      { id: 'b', text: 'Den Weg zu einer Datei durch verschachtelte Ordner.' },
      { id: 'c', text: 'Eine Internetadresse.' },
    ],
    correctOptionId: 'b',
    demonstratesConceptSlug: 'pfad-und-pfadtrennzeichen',
    weight: 1,
    explanation:
      'Jeder Schrägstrich steht für einen weiteren Ordner. /dokumente/notizen.txt bedeutet: im Ordner "dokumente" liegt die Datei "notizen.txt".',
  },
  {
    id: 'q4-technik',
    area: 'technical-basics',
    question: 'Wofür wird eine .env-Datei in einem Softwareprojekt typischerweise verwendet?',
    context: 'Die Datei wird bewusst nicht in die Versionsverwaltung (Git) aufgenommen.',
    options: [
      {
        id: 'a',
        text: 'Für geheime Werte wie Zugangsschlüssel, lokal und außerhalb des Quelltexts.',
      },
      { id: 'b', text: 'Für die grafische Oberfläche der Anwendung.' },
      { id: 'c', text: 'Für automatisch generierte Übersetzungen.' },
    ],
    correctOptionId: 'a',
    demonstratesConceptSlug: 'umgebungsvariablen',
    weight: 1,
    explanation:
      'Secrets gehören nie in den Quelltext, der oft geteilt oder veröffentlicht wird. Eine .env-Datei hält sie lokal und getrennt.',
  },
  {
    id: 'q5-erfahrung',
    area: 'ai-exposure',
    question:
      'Du bittest einen Chatbot um eine Zusammenfassung eines langen Textes, den du nicht eingefügt hast. Was passiert am wahrscheinlichsten?',
    options: [
      { id: 'a', text: 'Der Chatbot lehnt ab und fragt nach dem Text.' },
      { id: 'b', text: 'Der Chatbot erfindet eine plausibel klingende Zusammenfassung.' },
      { id: 'c', text: 'Der Chatbot durchsucht automatisch das Internet danach.' },
    ],
    correctOptionId: 'b',
    demonstratesConceptSlug: 'halluzination',
    weight: 1,
    explanation:
      'Ohne den eigentlichen Text im Kontext erzeugt das Modell trotzdem eine Antwort, die richtig klingt — sicher klingend und erfunden zugleich. Das ist eine Halluzination.',
  },
  {
    id: 'q6-erfahrung',
    area: 'ai-exposure',
    question:
      'Warum "vergisst" ein Chatbot manchmal, was du vor zwanzig Nachrichten geschrieben hast, obwohl der Chat nicht gelöscht wurde?',
    options: [
      { id: 'a', text: 'Ein technischer Fehler, der eigentlich nicht passieren sollte.' },
      { id: 'b', text: 'Ältere Nachrichten passen nicht mehr in das begrenzte Kontextfenster.' },
      { id: 'c', text: 'Der Chatbot merkt sich grundsätzlich nur die letzte Nachricht.' },
    ],
    correctOptionId: 'b',
    demonstratesConceptSlug: 'context-window',
    weight: 1,
    explanation:
      'Das Kontextfenster ist die Menge an Text, die das Modell gleichzeitig verarbeiten kann. Wird es voll, fallen ältere Inhalte heraus.',
  },
  {
    id: 'q7-konzepte',
    area: 'ai-concepts',
    question:
      'Ein Sprachmodell verarbeitet den Satz "Ich mag Kaffee" nicht als Buchstabenfolge, sondern als:',
    options: [
      { id: 'a', text: 'Eine Folge von Tokens — oft Wortteile.' },
      { id: 'b', text: 'Ein einzelnes, unteilbares Objekt.' },
      { id: 'c', text: 'Eine Tonaufnahme.' },
    ],
    correctOptionId: 'a',
    demonstratesConceptSlug: 'token',
    weight: 1.25,
    explanation:
      'Text wird vor der Verarbeitung in Tokens zerlegt — meist Wortteile, nicht ganze Wörter und nicht einzelne Buchstaben.',
  },
  {
    id: 'q8-konzepte',
    area: 'ai-concepts',
    question:
      'Was unterscheidet einen guten Prompt am ehesten von "Schreib mir was über Marketing"?',
    options: [
      { id: 'a', text: 'Er ist länger formuliert.' },
      { id: 'b', text: 'Er nennt Ziel, Kontext und was ein gutes Ergebnis konkret ausmacht.' },
      { id: 'c', text: 'Er enthält mehr Fachbegriffe.' },
    ],
    correctOptionId: 'b',
    demonstratesConceptSlug: 'prompt-ziel-und-kontext',
    weight: 1,
    explanation:
      'Länge oder Fachjargon allein helfen nicht — entscheidend ist, ob das Modell erkennen kann, wofür die Antwort gebraucht wird.',
  },
];
