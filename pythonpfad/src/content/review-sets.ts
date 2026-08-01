import type { ReviewSetDraft } from '@/domain/content/schema';

/**
 * Kuratierte Wiederholungssets.
 *
 * Neben den automatisch geplanten Einzelwiederholungen gibt es diese festen
 * Sets. Sie mischen bewusst ältere und neuere Konzepte (Interleaving) und
 * werden erst nach einem zeitlichen Abstand angeboten – ein Abruf am selben Tag
 * misst vor allem das Kurzzeitgedächtnis.
 */
export const reviewSets: ReviewSetDraft[] = [
  {
    slug: 'wiederholung-grundlagen',
    title: 'Wiederholung: Grundlagen',
    description:
      'Ausgabe, Variablen, Rechnen, Text und Eingaben in gemischter Reihenfolge. Wenn dir hier etwas nicht mehr präsent ist, ist das normal – genau dafür ist diese Runde da.',
    unlockAfterDays: 1,
    requiredLessonSlugs: [
      'ausgabe-und-kommentare',
      'variablen-und-zuweisung',
      'zahlen-und-rechnen',
      'text-und-f-strings',
      'eingabe-und-typumwandlung',
    ],
    exerciseSlugs: [
      'e1-print-vorhersage',
      'e1-var-vorhersage',
      'e1-zahlen-division',
      'e1-string-typfehler',
      'e1-input-typ',
      'e1-var-namen',
    ],
  },
  {
    slug: 'wiederholung-entscheidungen',
    title: 'Wiederholung: Entscheidungen',
    description:
      'Vergleiche, if, elif und logische Verknüpfungen – gemischt mit einer Aufgabe aus den Grundlagen, damit beides gleichzeitig abrufbar bleibt.',
    unlockAfterDays: 3,
    requiredLessonSlugs: [
      'vergleiche-und-wahrheitswerte',
      'if-und-else',
      'mehrere-faelle-mit-elif',
      'bedingungen-verknuepfen',
    ],
    exerciseSlugs: [
      'e2-vergleich-vorhersage',
      'e2-if-vorhersage',
      'e2-elif-reihenfolge',
      'e2-logik-vorhersage',
      'e2-logik-truthiness',
      'e1-var-vorhersage',
    ],
  },
  {
    slug: 'wiederholung-schleifen-mix',
    title: 'Wiederholung: Schleifen im Mix',
    description:
      'Schleifen zusammen mit Bedingungen und Grundlagen. Diese Mischung ist anspruchsvoller als eine sortierte Wiederholung – und genau deshalb wirksamer.',
    unlockAfterDays: 7,
    requiredLessonSlugs: [
      'for-schleife-ueber-listen',
      'zaehlen-und-summieren',
      'while-schleife',
      'break-und-continue',
    ],
    exerciseSlugs: [
      'e3-for-vorhersage',
      'e3-range-vorhersage',
      'e3-while-vorhersage',
      'e3-break-vorhersage',
      'e3-akkumulator-fehler',
      'e2-elif-reihenfolge',
      'e1-zahlen-division',
    ],
  },
];
