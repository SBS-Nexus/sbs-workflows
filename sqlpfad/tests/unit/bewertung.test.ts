import { describe, expect, it } from 'vitest';
import {
  alsVersuchsergebnis,
  antwortform,
  bewerteAufgabe,
  type BewertbareAufgabe,
} from '@/domain/aufgabe/bewertung';
import { LEHRPLAN } from '@/content';

/**
 * Eine Bewertung, die zu freundlich ist, ist genauso falsch wie eine, die zu
 * streng ist. Beide erzählen der Lernenden etwas über ihren Stand, das nicht
 * stimmt – und die eine kostet sie den nächsten Versuch, die andere die
 * Vorbereitung auf die nächste Aufgabe.
 */

describe('Einfachauswahl', () => {
  const aufgabe: BewertbareAufgabe = {
    art: 'EINFACHAUSWAHL',
    nutzlast: { optionen: ['a', 'b', 'c'], richtig: 1, aufloesung: 'Weil b.' },
  };

  it('erkennt die richtige Antwort und nennt die Auflösung', () => {
    const bewertung = bewerteAufgabe(aufgabe, { art: 'auswahl', gewaehlt: [1] });
    expect(bewertung.art).toBe('richtig');
    expect(bewertung).toHaveProperty('begruendung', 'Weil b.');
  });

  it('erkennt die falsche Antwort', () => {
    expect(bewerteAufgabe(aufgabe, { art: 'auswahl', gewaehlt: [0] }).art).toBe('falsch');
  });

  it('nimmt keine Mehrfachauswahl an', () => {
    // Sonst wäre „alles ankreuzen" eine Gewinnstrategie.
    expect(bewerteAufgabe(aufgabe, { art: 'auswahl', gewaehlt: [0, 1, 2] }).art).toBe('abgelehnt');
  });

  it('meldet eine leere Auswahl als leer und nicht als falsch', () => {
    // Wer nichts angekreuzt hat, hat sich nicht geirrt - er hat noch nicht
    // geantwortet. Als „falsch" gezählt wäre das ein Versuch, den es nie gab.
    expect(bewerteAufgabe(aufgabe, { art: 'auswahl', gewaehlt: [] }).art).toBe('leer');
  });
});

describe('Mehrfachauswahl', () => {
  const aufgabe: BewertbareAufgabe = {
    art: 'MEHRFACHAUSWAHL',
    nutzlast: {
      optionen: ['a', 'b', 'c', 'd'],
      richtig: [0, 1, 2],
      aufloesung: 'Die ersten drei.',
    },
  };

  it('erkennt die vollständig richtige Auswahl, unabhängig von der Reihenfolge', () => {
    expect(bewerteAufgabe(aufgabe, { art: 'auswahl', gewaehlt: [2, 0, 1] }).art).toBe('richtig');
  });

  it('nennt eine unvollständige Auswahl teilweise richtig', () => {
    const bewertung = bewerteAufgabe(aufgabe, { art: 'auswahl', gewaehlt: [0, 1] });
    expect(bewertung.art).toBe('teilweise');
    expect(bewertung).toHaveProperty('begruendung', expect.stringContaining('noch eine'));
  });

  it('nennt eine Auswahl mit einer falschen dabei ebenfalls teilweise', () => {
    const bewertung = bewerteAufgabe(aufgabe, { art: 'auswahl', gewaehlt: [0, 1, 2, 3] });
    expect(bewertung.art).toBe('teilweise');
    expect(bewertung).toHaveProperty('begruendung', expect.stringContaining('nicht dazu'));
  });

  it('ist falsch, wenn etwas fehlt und etwas Falsches dabei ist', () => {
    expect(bewerteAufgabe(aufgabe, { art: 'auswahl', gewaehlt: [0, 3] }).art).toBe('falsch');
  });

  it('gibt „alles ankreuzen" nicht als richtig aus', () => {
    /*
     * Die wichtigste Gegenprobe dieser Datei: Wenn das Ankreuzen aller
     * Optionen durchginge, wäre die Aufgabenart wertlos.
     */
    expect(bewerteAufgabe(aufgabe, { art: 'auswahl', gewaehlt: [0, 1, 2, 3] }).art).not.toBe(
      'richtig',
    );
  });
});

describe('Reihenfolge', () => {
  const aufgabe: BewertbareAufgabe = {
    art: 'REIHENFOLGE',
    nutzlast: { optionen: ['SELECT', 'FROM', 'WHERE'], richtig: [0, 1, 2], aufloesung: 'So.' },
  };

  it('erkennt die richtige Reihenfolge', () => {
    expect(bewerteAufgabe(aufgabe, { art: 'reihenfolge', reihenfolge: [0, 1, 2] }).art).toBe(
      'richtig',
    );
  });

  it('sagt, wie viele Bausteine schon stehen – ohne zu verraten, welche', () => {
    const bewertung = bewerteAufgabe(aufgabe, { art: 'reihenfolge', reihenfolge: [0, 2, 1] });
    expect(bewertung.art).toBe('teilweise');
    expect(bewertung).toHaveProperty('begruendung', expect.stringContaining('1 von 3'));
    expect(bewertung).toHaveProperty('begruendung', expect.not.stringContaining('SELECT'));
  });

  it('ist falsch, wenn kein Baustein an seiner Stelle steht', () => {
    expect(bewerteAufgabe(aufgabe, { art: 'reihenfolge', reihenfolge: [2, 0, 1] }).art).toBe(
      'falsch',
    );
  });
});

describe('Vorhersage der Zeilenzahl', () => {
  const aufgabe: BewertbareAufgabe = {
    art: 'ERGEBNIS_VORHERSAGEN',
    erwartetesErgebnis: { spalten: ['Name'], zeilen: [['a'], ['b']] },
  };

  it('erkennt die richtige Zahl', () => {
    expect(bewerteAufgabe(aufgabe, { art: 'zahl', wert: 2 }).art).toBe('richtig');
  });

  it('nennt bei einer falschen Zahl die richtige', () => {
    const bewertung = bewerteAufgabe(aufgabe, { art: 'zahl', wert: 4 });
    expect(bewertung.art).toBe('falsch');
    expect(bewertung).toHaveProperty('begruendung', expect.stringContaining('2 Zeilen'));
  });

  it('nimmt die Null als Antwort an', () => {
    // Ein leeres Ergebnis vorherzusagen ist der lehrreichste Fall überhaupt -
    // er darf nicht als „noch nichts eingetragen" durchfallen.
    const leer: BewertbareAufgabe = {
      art: 'ERGEBNIS_VORHERSAGEN',
      erwartetesErgebnis: { spalten: ['Name'], zeilen: [] },
    };
    expect(bewerteAufgabe(leer, { art: 'zahl', wert: 0 }).art).toBe('richtig');
  });

  it('weist eine negative Zahl zurück', () => {
    expect(bewerteAufgabe(aufgabe, { art: 'zahl', wert: -1 }).art).toBe('leer');
  });
});

describe('Antworten in eigenen Worten', () => {
  const aufgabe: BewertbareAufgabe = {
    art: 'FREITEXT',
    nutzlast: { musterantwort: 'Weil ohne ON jede Zeile mit jeder verbunden wird.' },
  };

  it('urteilt nicht, sondern legt die Musterantwort daneben', () => {
    const bewertung = bewerteAufgabe(aufgabe, {
      art: 'text',
      text: 'Es kommen viel zu viele Zeilen heraus, weil alles mit allem kombiniert wird.',
    });
    expect(bewertung.art).toBe('selbst-vergleichen');
    expect(bewertung).toHaveProperty('musterantwort', expect.stringContaining('jede Zeile'));
  });

  it('gibt die Musterantwort nicht heraus, bevor etwas dasteht', () => {
    /*
     * Sonst wäre der Weg zur Lösung ein Klick auf „Absenden" mit leerem Feld -
     * und der Vergleich, um den es geht, fände nie statt.
     */
    const bewertung = bewerteAufgabe(aufgabe, { art: 'text', text: '   ?   ' });
    expect(bewertung.art).toBe('leer');
    expect(JSON.stringify(bewertung)).not.toContain('jede Zeile');
  });
});

describe('Geschriebene Abfragen', () => {
  const aufgabe: BewertbareAufgabe = { art: 'ABFRAGE_SCHREIBEN', erlaubteKlassen: ['SELECT'] };

  it('behauptet nicht, eine Abfrage sei richtig, weil sie richtig aussieht', () => {
    const bewertung = bewerteAufgabe(aufgabe, { art: 'sql', sql: 'SELECT Name FROM Kunden;' });
    expect(bewertung.art).toBe('braucht-ausfuehrung');
    // Kein „richtig" auf Verdacht - und auch kein Versuch im Verlauf.
    expect(alsVersuchsergebnis(bewertung)).toBeNull();
  });

  it('erklärt eine Anweisung, die nicht zur Aufgabe passt', () => {
    const bewertung = bewerteAufgabe(aufgabe, {
      art: 'sql',
      sql: 'UPDATE Kunden SET Stadt = NULL;',
    });
    expect(bewertung.art).toBe('abgelehnt');
  });

  it('prüft jede Anweisung, nicht nur die erste', () => {
    const bewertung = bewerteAufgabe(aufgabe, {
      art: 'sql',
      sql: 'SELECT Name FROM Kunden; UPDATE Kunden SET Stadt = NULL;',
    });
    expect(bewertung.art).toBe('abgelehnt');
  });

  it('hält einen reinen Kommentar nicht für eine Abfrage', () => {
    expect(bewerteAufgabe(aufgabe, { art: 'sql', sql: '-- noch nichts' }).art).toBe('leer');
  });
});

describe('Die Antwortform passt zur Aufgabe', () => {
  it('weist eine Antwort in der falschen Form zurück', () => {
    const aufgabe: BewertbareAufgabe = { art: 'EINFACHAUSWAHL', nutzlast: { richtig: 0 } };
    expect(bewerteAufgabe(aufgabe, { art: 'sql', sql: 'SELECT 1;' }).art).toBe('abgelehnt');
  });

  it('kennt für jede Aufgabenart des Lehrplans eine Form', () => {
    /*
     * Eine neue Aufgabenart im Inhalt, für die hier nichts vorgesehen ist,
     * fiele sonst erst auf, wenn jemand sie zu bearbeiten versucht.
     */
    const arten = new Set(
      LEHRPLAN.module.flatMap((modul) =>
        modul.lektionen.flatMap((lektion) => lektion.aufgaben.map((aufgabe) => aufgabe.art)),
      ),
    );
    for (const art of arten) {
      expect(['auswahl', 'reihenfolge', 'zahl', 'text', 'sql']).toContain(antwortform(art));
    }
  });
});

describe('Was im Versuchsverlauf landet', () => {
  it('hält nur echte Urteile fest', () => {
    expect(alsVersuchsergebnis({ art: 'richtig', begruendung: '' })).toBe('PASSED');
    expect(alsVersuchsergebnis({ art: 'teilweise', begruendung: '' })).toBe('PARTIAL');
    expect(alsVersuchsergebnis({ art: 'falsch', begruendung: '' })).toBe('FAILED');
    expect(alsVersuchsergebnis({ art: 'leer', begruendung: '' })).toBeNull();
    expect(alsVersuchsergebnis({ art: 'selbst-vergleichen', musterantwort: '' })).toBeNull();
    expect(alsVersuchsergebnis({ art: 'abgelehnt', begruendung: '' })).toBeNull();
  });
});
