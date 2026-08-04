import { describe, expect, it } from 'vitest';
import {
  foldForSearch,
  fuzzyMatch,
  rankEntries,
  splitByRanges,
  type SearchableEntry,
} from '@/lib/search/fuzzy';
import { STATIC_COMMANDS } from '@/lib/search/command-index';

describe('Textfaltung', () => {
  it('macht Umlaute und ß vergleichbar', () => {
    expect(foldForSearch('Schleife')).toBe('schleife');
    expect(foldForSearch('Ausführen')).toBe('ausfuhren');
    expect(foldForSearch('Straße')).toBe('strasse');
    expect(foldForSearch('ÜBUNG')).toBe('ubung');
  });
});

describe('Unscharfe Suche', () => {
  it('findet zusammenhängende Teilzeichenketten', () => {
    const match = fuzzyMatch('Was ist ein Programm?', 'programm');
    expect(match).not.toBeNull();
    expect(match?.ranges).toEqual([{ start: 12, end: 20 }]);
  });

  it('findet Zeichen auch verteilt über den Text', () => {
    const match = fuzzyMatch('Entscheidungen treffen', 'etreffen');
    expect(match).not.toBeNull();
  });

  it('lehnt ab, wenn ein Zeichen fehlt', () => {
    expect(fuzzyMatch('Schleifen', 'schleifex')).toBeNull();
  });

  it('behandelt Umlaute auf beiden Seiten gleich', () => {
    expect(fuzzyMatch('Code ausführen', 'ausfuhren')).not.toBeNull();
    expect(fuzzyMatch('Code ausfuhren', 'ausführen')).not.toBeNull();
    expect(fuzzyMatch('Straße', 'strasse')).not.toBeNull();
  });

  it('verzichtet im zweiten Anlauf lieber auf die Hervorhebung als auf den Treffer', () => {
    // „strasse" hat ein s mehr als die längentreue Faltung von „Straße".
    // Gefunden wird der Eintrag trotzdem – nur eben ohne markierte Stellen,
    // weil die Positionen nach der ß-Auflösung nicht mehr passen würden.
    const match = fuzzyMatch('Straße', 'strasse');
    expect(match).not.toBeNull();
    expect(match?.ranges).toEqual([]);
  });

  it('liefert Trefferbereiche, die exakt auf den Originaltext passen', () => {
    const text = 'Übungen zu Schleifen';
    const match = fuzzyMatch(text, 'schleif');
    expect(match).not.toBeNull();
    const range = match?.ranges[0];
    expect(range).toBeDefined();
    // Der springende Punkt: Trotz Umlaut im Text stimmen die Indizes.
    expect(text.slice(range!.start, range!.end)).toBe('Schleif');
  });

  it('bewertet Wortanfänge höher als Treffer mitten im Wort', () => {
    const amAnfang = fuzzyMatch('Fehler finden', 'fe');
    const mittendrin = fuzzyMatch('Oberfläche', 'fe');
    expect(amAnfang).not.toBeNull();
    expect(mittendrin).not.toBeNull();
    expect(amAnfang!.score).toBeGreaterThan(mittendrin!.score);
  });

  it('bevorzugt zusammenhängende Treffer gegenüber verstreuten', () => {
    const zusammen = fuzzyMatch('Projekte', 'proj');
    const verstreut = fuzzyMatch('Python rechnet oft jetzt', 'proj');
    expect(zusammen).not.toBeNull();
    expect(verstreut).not.toBeNull();
    expect(zusammen!.score).toBeGreaterThan(verstreut!.score);
  });

  it('schiebt Treffer zum späteren Wortanfang, statt am ersten Zeichen zu kleben', () => {
    // Das „a" aus „Code" wäre der erste Fund, gemeint ist aber „ausführen".
    const match = fuzzyMatch('Code ausführen', 'ausf');
    expect(match?.ranges).toEqual([{ start: 5, end: 9 }]);
  });

  it('behandelt eine leere Eingabe als Treffer ohne Hervorhebung', () => {
    expect(fuzzyMatch('Egal', '')).toEqual({ score: 0, ranges: [] });
    expect(fuzzyMatch('Egal', '   ')).toEqual({ score: 0, ranges: [] });
  });

  it('lehnt Eingaben ab, die länger als der Text sind', () => {
    expect(fuzzyMatch('kurz', 'sehr viel laenger')).toBeNull();
  });
});

describe('Bewertete Liste', () => {
  const EINTRAEGE: SearchableEntry[] = [
    { title: 'Schleifen wiederholen' },
    { title: 'Was ist ein Programm?' },
    { title: 'Fortschritt', keywords: 'dashboard statistik kompetenz' },
  ];

  it('sortiert den besten Treffer nach vorn', () => {
    const results = rankEntries(EINTRAEGE, 'schleif');
    expect(results[0]?.item.title).toBe('Schleifen wiederholen');
  });

  it('findet über Stichwörter, hebt dort aber nichts hervor', () => {
    const results = rankEntries(EINTRAEGE, 'dashboard');
    expect(results[0]?.item.title).toBe('Fortschritt');
    expect(results[0]?.ranges).toEqual([]);
  });

  it('gewichtet Stichworttreffer schwächer als Titeltreffer', () => {
    const eintraege: SearchableEntry[] = [
      { title: 'Statistik' },
      { title: 'Fortschritt', keywords: 'statistik' },
    ];
    const results = rankEntries(eintraege, 'statistik');
    expect(results[0]?.item.title).toBe('Statistik');
  });

  it('hält die Höchstzahl ein', () => {
    const viele = Array.from({ length: 50 }, (_, index) => ({ title: `Aufgabe ${index}` }));
    expect(rankEntries(viele, 'aufgabe', 5)).toHaveLength(5);
  });

  it('liefert bei leerer Eingabe alle Einträge bis zur Höchstzahl', () => {
    expect(rankEntries(EINTRAEGE, '')).toHaveLength(3);
  });
});

describe('Zerlegung für die Hervorhebung', () => {
  it('setzt den Text lückenlos wieder zusammen', () => {
    const text = 'Was ist ein Programm?';
    const match = fuzzyMatch(text, 'prog');
    const parts = splitByRanges(text, match?.ranges ?? []);
    expect(parts.map((part) => part.text).join('')).toBe(text);
    expect(parts.filter((part) => part.highlighted).map((part) => part.text)).toEqual(['Prog']);
  });

  it('kommt ohne Trefferbereiche zurecht', () => {
    expect(splitByRanges('Ohne Treffer', [])).toEqual([
      { text: 'Ohne Treffer', highlighted: false },
    ]);
  });
});

describe('Festes Befehlsverzeichnis', () => {
  it('hat eindeutige Kennungen', () => {
    const ids = STATIC_COMMANDS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gibt jedem Eintrag genau ein Ziel', () => {
    for (const entry of STATIC_COMMANDS) {
      const targets = [entry.href, entry.action].filter(Boolean);
      expect(targets, `Eintrag ${entry.id}`).toHaveLength(1);
    }
  });

  it('ist über die Suche erreichbar', () => {
    // Stichprobe: Die Bereiche müssen mit den naheliegenden Wörtern auffindbar sein.
    expect(rankEntries(STATIC_COMMANDS, 'labor')[0]?.item.id).toBe('bereich-labor');
    expect(rankEntries(STATIC_COMMANDS, 'dunkel')[0]?.item.id).toBe('aktion-theme');
    expect(rankEntries(STATIC_COMMANDS, 'wiederhol')[0]?.item.id).toBe('bereich-wiederholen');
  });
});
