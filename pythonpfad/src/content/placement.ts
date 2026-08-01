import { z } from 'zod';
import {
  placementQuestionSchema,
  type PlacementQuestion,
  type PlacementQuestionDraft,
} from '@/domain/placement/placement';

/**
 * Diagnostische Einstufung.
 *
 * Aufbau von leicht nach anspruchsvoll und von "ganz ohne Code" zu "Python
 * lesen". Die ersten drei Fragen kommen ohne jeden Fachbegriff aus. Wer hier
 * abbricht, weil es zu technisch wird, hätte die Einstufung ohnehin nicht
 * gebraucht – deshalb steht der niedrigschwellige Teil bewusst am Anfang.
 *
 * Zu jeder Frage gibt es die Antwortmöglichkeit "Weiß ich noch nicht". Sie wird
 * nicht schlechter bewertet als ein falscher Rateversuch und liefert ein
 * ehrlicheres Bild.
 */
const drafts: PlacementQuestionDraft[] = [
  {
    id: 'p1',
    area: 'logic',
    question:
      'Ein Rezept sagt: "Zuerst Zwiebeln anbraten, dann Tomaten dazugeben, dann 10 Minuten köcheln." Jemand gibt die Tomaten zuerst hinein. Was trifft zu?',
    options: [
      {
        id: 'a',
        text: 'Das Ergebnis kann anders ausfallen, weil die Reihenfolge Teil der Anleitung ist.',
      },
      { id: 'b', text: 'Die Reihenfolge spielt keine Rolle, solange alle Zutaten im Topf landen.' },
      {
        id: 'c',
        text: 'Das Rezept ist dadurch ungültig und lässt sich nicht mehr zu Ende kochen.',
      },
      { id: 'weiss-nicht', text: 'Weiß ich noch nicht' },
    ],
    correctOptionId: 'a',
    weight: 1,
    explanation:
      'Anweisungen bauen aufeinander auf. Genau so arbeitet auch ein Programm: Es führt die Schritte in der aufgeschriebenen Reihenfolge aus.',
  },
  {
    id: 'p2',
    area: 'logic',
    question:
      'Eine Regel lautet: "Versandkostenfrei ab 50 Euro." Wie viel zahlt jemand mit einem Warenkorb von genau 50 Euro an Versand?',
    options: [
      { id: 'a', text: 'Nichts – 50 Euro erfüllen die Regel bereits.' },
      { id: 'b', text: 'Den vollen Versand – die Regel gilt erst über 50 Euro.' },
      { id: 'c', text: 'Den halben Versand.' },
      { id: 'weiss-nicht', text: 'Weiß ich noch nicht' },
    ],
    correctOptionId: 'a',
    weight: 1,
    explanation:
      '"Ab" schließt den Grenzwert mit ein. Solche Grenzfälle sind beim Programmieren die häufigste Fehlerquelle überhaupt.',
  },
  {
    id: 'p3',
    area: 'sequence',
    question:
      'Ein Zähler startet bei 0. Danach passiert dreimal hintereinander: "Erhöhe den Zähler um 2." Welchen Wert hat er am Ende?',
    options: [
      { id: 'a', text: '2' },
      { id: 'b', text: '6' },
      { id: 'c', text: '3' },
      { id: 'weiss-nicht', text: 'Weiß ich noch nicht' },
    ],
    correctOptionId: 'b',
    weight: 1,
    demonstratesConceptSlug: 'zaehler-variable',
    explanation:
      'Jeder Durchlauf baut auf dem bisherigen Wert auf: 0 + 2 + 2 + 2 = 6. Dasselbe Muster steckt in jeder Schleife mit Zähler.',
  },
  {
    id: 'p4',
    area: 'reading',
    question: 'Was gibt dieses Programm aus?',
    code: 'preis = 10\npreis = preis + 5\nprint(preis)',
    options: [
      { id: 'a', text: '10' },
      { id: 'b', text: '15' },
      { id: 'c', text: 'Eine Fehlermeldung, weil preis auf beiden Seiten steht' },
      { id: 'weiss-nicht', text: 'Weiß ich noch nicht' },
    ],
    correctOptionId: 'b',
    weight: 1.5,
    demonstratesConceptSlug: 'zuweisung',
    explanation:
      'Zuerst wird die rechte Seite berechnet (10 + 5), danach landet das Ergebnis wieder unter demselben Namen. Das ist keine Gleichung, sondern eine Zuweisung.',
  },
  {
    id: 'p5',
    area: 'reading',
    question: 'Was gibt dieses Programm aus?',
    code: 'alter = 16\n\nif alter >= 18:\n    print("volljaehrig")\nelse:\n    print("minderjaehrig")',
    options: [
      { id: 'a', text: 'volljaehrig' },
      { id: 'b', text: 'minderjaehrig' },
      { id: 'c', text: 'Beides nacheinander' },
      { id: 'weiss-nicht', text: 'Weiß ich noch nicht' },
    ],
    correctOptionId: 'b',
    weight: 1.5,
    demonstratesConceptSlug: 'if-bedingung',
    explanation:
      '16 ist nicht größer oder gleich 18, deshalb läuft der else-Zweig. Von if und else läuft immer genau einer der beiden Blöcke.',
  },
  {
    id: 'p6',
    area: 'python',
    question:
      'Jemand tippt bei input() die Ziffer 5 ein. Welchen Typ hat der zurückgegebene Wert in Python?',
    options: [
      { id: 'a', text: 'Eine ganze Zahl (int)' },
      { id: 'b', text: 'Eine Zeichenkette (str)' },
      { id: 'c', text: 'Einen Wahrheitswert (bool)' },
      { id: 'weiss-nicht', text: 'Weiß ich noch nicht' },
    ],
    correctOptionId: 'b',
    weight: 1.5,
    demonstratesConceptSlug: 'input-eingabe',
    explanation:
      'input() liefert immer eine Zeichenkette. Wer damit rechnen will, muss sie zuerst mit int() oder float() umwandeln.',
  },
  {
    id: 'p7',
    area: 'python',
    question: 'Wie oft wird die eingerückte Zeile ausgeführt?',
    code: 'for i in range(4):\n    print("Hallo")',
    options: [
      { id: 'a', text: '3-mal' },
      { id: 'b', text: '4-mal' },
      { id: 'c', text: '5-mal' },
      { id: 'weiss-nicht', text: 'Weiß ich noch nicht' },
    ],
    correctOptionId: 'b',
    weight: 2,
    demonstratesConceptSlug: 'range-funktion',
    explanation:
      'range(4) liefert die Werte 0, 1, 2 und 3 – also vier Durchläufe. Die Zahl in der Klammer ist die Anzahl, nicht der letzte Wert.',
  },
  {
    id: 'p8',
    area: 'python',
    question: 'Welchen Wert hat summe nach diesem Programm?',
    code: 'zahlen = [3, 5, 2]\nsumme = 0\n\nfor zahl in zahlen:\n    summe = summe + zahl',
    options: [
      { id: 'a', text: '10' },
      { id: 'b', text: '2' },
      { id: 'c', text: '0' },
      { id: 'weiss-nicht', text: 'Weiß ich noch nicht' },
    ],
    correctOptionId: 'a',
    weight: 2,
    demonstratesConceptSlug: 'akkumulator',
    explanation:
      'Der Startwert steht vor der Schleife, deshalb sammelt summe über alle Durchläufe hinweg: 3 + 5 + 2 = 10. Stünde summe = 0 im Rumpf, käme 2 heraus.',
  },
];

/**
 * Geprüfte Fassung mit gesetzten Standardwerten. Alles Weitere im Code arbeitet
 * mit dieser Variante, damit Gewichte und Pflichtfelder verlässlich vorliegen.
 */
export const placementQuestions: PlacementQuestion[] = z
  .array(placementQuestionSchema)
  .parse(drafts);
