import { describe, expect, it } from 'vitest';
import {
  KIND_LABELS,
  PYTHON_VOCABULARY,
  lookupVocabulary,
  matchVocabulary,
} from '@/domain/python/vocabulary';
import { concepts } from '@/content/concepts';

describe('Python-Vokabular', () => {
  it('hat eindeutige Namen', () => {
    const namen = PYTHON_VOCABULARY.map((entry) => entry.name);
    expect(new Set(namen).size).toBe(namen.length);
  });

  it('erklärt jeden Eintrag auf Deutsch mit Beispiel', () => {
    for (const entry of PYTHON_VOCABULARY) {
      expect(entry.description.length, entry.name).toBeGreaterThan(20);
      // Ein ganzer Satz, kein Stichwort.
      expect(entry.description, entry.name).toMatch(/\.$/);
      expect(entry.example.length, entry.name).toBeGreaterThan(2);
      expect(entry.example, entry.name).toContain(entry.name);
    }
  });

  it('hält sich an die Sprachregeln des Kurses', () => {
    // Diese Wendungen sind im Projekt ausdrücklich untersagt: Sie erklären
    // nichts und stellen die lernende Person bloß.
    const verboten = [
      /das ist ganz einfach/i,
      /du musst nur/i,
      /offensichtlich/i,
      /jeder weiß/i,
      /selbstverständlich/i,
    ];
    for (const entry of PYTHON_VOCABULARY) {
      for (const muster of verboten) {
        expect(entry.description, `${entry.name}: ${entry.description}`).not.toMatch(muster);
      }
    }
  });

  it('benennt jede Art auf Deutsch', () => {
    for (const entry of PYTHON_VOCABULARY) {
      expect(KIND_LABELS[entry.kind]).toBeTruthy();
    }
  });

  it('ordnet jeden Eintrag einem Modul des Kurses zu', () => {
    for (const entry of PYTHON_VOCABULARY) {
      expect(entry.introducedIn, entry.name).toBeGreaterThanOrEqual(0);
      expect(entry.introducedIn, entry.name).toBeLessThanOrEqual(3);
    }
  });
});

describe('Vorschläge zu einem angefangenen Wort', () => {
  it('sucht nur am Wortanfang', () => {
    const treffer = matchVocabulary('pri').map((entry) => entry.name);
    expect(treffer).toEqual(['print']);
    // „rin" steckt in print, ist aber kein Wortanfang – und damit kein Treffer.
    expect(matchVocabulary('rin')).toEqual([]);
  });

  it('ist unabhängig von Groß- und Kleinschreibung', () => {
    expect(matchVocabulary('PRI').map((entry) => entry.name)).toEqual(['print']);
    expect(matchVocabulary('tru').map((entry) => entry.name)).toEqual(['True']);
  });

  it('stellt früh Eingeführtes nach vorn', () => {
    const treffer = matchVocabulary('i').map((entry) => entry.name);
    // input und int kommen aus Modul 1, if und in erst aus Modul 2.
    expect(treffer.indexOf('int')).toBeLessThan(treffer.indexOf('if'));
    expect(treffer.indexOf('input')).toBeLessThan(treffer.indexOf('in'));
  });

  it('liefert bei leerer Eingabe nichts', () => {
    expect(matchVocabulary('')).toEqual([]);
  });

  it('liefert nichts für Unbekanntes', () => {
    expect(matchVocabulary('numpy')).toEqual([]);
    // Bewusst nicht enthalten: Was im Kurs nicht vorkommt, wird nicht
    // vorgeschlagen. Eine Vorschlagsliste ist kein Sprachwörterbuch.
    expect(matchVocabulary('lambda')).toEqual([]);
    expect(matchVocabulary('yield')).toEqual([]);
  });

  it('schlägt genau ein Wort nach', () => {
    expect(lookupVocabulary('range')?.kind).toBe('function');
    expect(lookupVocabulary('gibtsnicht')).toBeNull();
  });
});

describe('Abgleich mit dem Kursinhalt', () => {
  it('deckt die zentralen Bausteine des Kurses ab', () => {
    // Stichprobe der Bausteine, die in den Lektionen unvermeidlich vorkommen.
    const pflicht = ['print', 'input', 'int', 'if', 'else', 'for', 'while', 'range', 'len'];
    for (const name of pflicht) {
      expect(lookupVocabulary(name), `${name} fehlt im Vokabular`).not.toBeNull();
    }
  });

  it('bleibt im Umfang der vier Module', () => {
    // Der Kurs führt vier Module. Ein Vokabular, das darüber hinausgeht, würde
    // Vorschläge zu Dingen machen, die nirgends erklärt sind.
    const hoechstesModul = Math.max(...PYTHON_VOCABULARY.map((entry) => entry.introducedIn));
    expect(hoechstesModul).toBeLessThanOrEqual(3);
    // Und der Konzeptgraph des Kurses existiert überhaupt – ohne ihn wäre die
    // Zuordnung oben eine Behauptung ins Leere.
    expect(concepts.length).toBeGreaterThan(0);
  });
});
