import { describe, expect, it } from 'vitest';
import {
  bearbeiteDatei,
  dateiStatus,
  fuehreGitBefehlAus,
  status,
  type GitArbeitsbaumZustand,
  type GitDatei,
} from '@/domain/git/working-tree';

/**
 * Der Git-Simulator bildet die drei Orte ab, an denen eine Datei liegen kann.
 * Geprüft wird deshalb vor allem das, woran das Verständnis in der Praxis
 * scheitert: dass `git add` eine MOMENTAUFNAHME macht, dass `git diff` ohne
 * Zusatz nur die nicht vorgemerkten Änderungen zeigt, und dass ein Commit
 * ausschließlich das mitnimmt, was vorgemerkt war.
 */

function start(): GitArbeitsbaumZustand {
  return {
    dateien: [
      { pfad: 'liesmich.md', arbeitsbaum: 'Hallo', index: 'Hallo', head: 'Hallo' },
      { pfad: 'notizen.txt', arbeitsbaum: 'Neu' },
    ],
    commits: [{ id: 'c01', nachricht: 'Erster Commit', stand: { 'liesmich.md': 'Hallo' } }],
  };
}

function laufe(befehle: string[], zustand: GitArbeitsbaumZustand = start()) {
  const ausgaben: string[] = [];
  let aktuell = zustand;
  for (const befehl of befehle) {
    const ergebnis = fuehreGitBefehlAus(aktuell, befehl);
    ausgaben.push(ergebnis.ausgabe);
    aktuell = ergebnis.zustand;
  }
  return { zustand: aktuell, ausgaben, letzte: ausgaben[ausgaben.length - 1] ?? '' };
}

describe('Dateizustand', () => {
  it('erkennt eine unversionierte Datei', () => {
    expect(dateiStatus({ pfad: 'neu.txt', arbeitsbaum: 'x' })?.status).toBe('untracked');
  });

  it('erkennt eine unveränderte Datei als committed', () => {
    expect(dateiStatus({ pfad: 'a', arbeitsbaum: 'x', index: 'x', head: 'x' })?.status).toBe(
      'committed',
    );
  });

  it('erkennt eine geänderte, nicht vorgemerkte Datei', () => {
    expect(dateiStatus({ pfad: 'a', arbeitsbaum: 'neu', index: 'alt', head: 'alt' })?.status).toBe(
      'modified',
    );
  });

  it('erkennt eine vorgemerkte Änderung', () => {
    expect(dateiStatus({ pfad: 'a', arbeitsbaum: 'neu', index: 'neu', head: 'alt' })?.status).toBe(
      'staged',
    );
  });

  it('meldet eine erneut geänderte, bereits vorgemerkte Datei in BEIDEN Abschnitten', () => {
    // Der häufigste Stolperstein: nach dem git add weitergearbeitet.
    const eintrag = dateiStatus({ pfad: 'a', arbeitsbaum: 'ganz neu', index: 'neu', head: 'alt' });
    expect(eintrag?.status).toBe('staged');
    expect(eintrag?.auchUngestagt).toBe(true);
  });
});

describe('git status', () => {
  it('führt vorgemerkte, geänderte und unversionierte Dateien getrennt auf', () => {
    const { letzte } = laufe(['git add liesmich.md', 'git status'], {
      ...start(),
      dateien: [
        { pfad: 'liesmich.md', arbeitsbaum: 'Hallo Welt', index: 'Hallo', head: 'Hallo' },
        { pfad: 'notizen.txt', arbeitsbaum: 'Neu' },
      ],
    });
    expect(letzte).toContain('Zum Commit vorgemerkt');
    expect(letzte).toContain('liesmich.md');
    expect(letzte).toContain('Unversionierte Dateien');
    expect(letzte).toContain('notizen.txt');
  });

  it('meldet ein sauberes Arbeitsverzeichnis', () => {
    const { letzte } = laufe(['git status'], {
      dateien: [{ pfad: 'a', arbeitsbaum: 'x', index: 'x', head: 'x' }],
      commits: [],
    });
    expect(letzte).toContain('Nichts zu committen');
  });
});

describe('git add', () => {
  it('merkt den Stand zum Zeitpunkt des Aufrufs vor', () => {
    let zustand = start();
    zustand = fuehreGitBefehlAus(zustand, 'git add notizen.txt').zustand;
    expect(status(zustand).find((e) => e.pfad === 'notizen.txt')?.status).toBe('staged');
  });

  it('nimmt spätere Änderungen NICHT automatisch mit', () => {
    let zustand = start();
    zustand = fuehreGitBefehlAus(zustand, 'git add notizen.txt').zustand;
    zustand = bearbeiteDatei(zustand, 'notizen.txt', 'Doch anders');

    const eintrag = status(zustand).find((e) => e.pfad === 'notizen.txt');
    expect(eintrag?.status).toBe('staged');
    expect(eintrag?.auchUngestagt).toBe(true);
  });

  it('meldet eine unbekannte Datei', () => {
    expect(laufe(['git add gibtsnicht.txt']).letzte).toContain(
      "pathspec 'gibtsnicht.txt' did not match any files",
    );
  });

  it('merkt NICHTS vor, wenn einer von mehreren Pfaden nicht existiert', () => {
    // Zuvor genügte ein Treffer: preise.md wurde vorgemerkt und der
    // Tippfehler verschwiegen (Codex-Review auf PR #30).
    const ergebnis = fuehreGitBefehlAus(start(), 'git add liesmich.md fehlt.txt');

    expect(ergebnis.ausgabe).toContain("pathspec 'fehlt.txt' did not match any files");
    expect(ergebnis.veraendert).toBe(false);
    expect(status(ergebnis.zustand).find((e) => e.pfad === 'liesmich.md')?.status).toBe(
      'committed',
    );
  });
});

describe('git commit', () => {
  it('nimmt nur Vorgemerktes mit', () => {
    const { zustand } = laufe(['git add notizen.txt', 'git commit -m "Notizen ergänzt"'], {
      ...start(),
      dateien: [
        { pfad: 'liesmich.md', arbeitsbaum: 'Geändert', index: 'Hallo', head: 'Hallo' },
        { pfad: 'notizen.txt', arbeitsbaum: 'Neu' },
      ],
    });

    const neuesterCommit = zustand.commits[zustand.commits.length - 1];
    expect(neuesterCommit?.stand['notizen.txt']).toBe('Neu');
    // Die nicht vorgemerkte Änderung an liesmich.md ist NICHT im Commit.
    expect(neuesterCommit?.stand['liesmich.md']).toBe('Hallo');
    expect(status(zustand).find((e) => e.pfad === 'liesmich.md')?.status).toBe('modified');
  });

  it('lehnt einen Commit ohne Vormerkung ab', () => {
    const { letzte } = laufe(['git commit -m "Nichts"'], {
      dateien: [{ pfad: 'a', arbeitsbaum: 'x', index: 'x', head: 'x' }],
      commits: [],
    });
    expect(letzte).toContain('Nichts zum Committen vorgemerkt');
  });

  it('verlangt eine Nachricht', () => {
    expect(laufe(['git add notizen.txt', 'git commit']).letzte).toContain('fehlt eine Nachricht');
  });
});

describe('git diff', () => {
  it('zeigt ohne Zusatz nur die NICHT vorgemerkten Änderungen', () => {
    const zustand: GitArbeitsbaumZustand = {
      dateien: [{ pfad: 'a.txt', arbeitsbaum: 'neu', index: 'alt', head: 'alt' }],
      commits: [],
    };
    const ergebnis = fuehreGitBefehlAus(zustand, 'git diff');
    expect(ergebnis.ausgabe).toContain('-alt');
    expect(ergebnis.ausgabe).toContain('+neu');
  });

  it('zeigt nach git add nichts mehr — dafür aber mit --staged', () => {
    let zustand = start();
    zustand = bearbeiteDatei(zustand, 'liesmich.md', 'Hallo Welt');
    zustand = fuehreGitBefehlAus(zustand, 'git add liesmich.md').zustand;

    expect(fuehreGitBefehlAus(zustand, 'git diff').ausgabe).toContain('Keine ungemerkten');
    expect(fuehreGitBefehlAus(zustand, 'git diff --staged').ausgabe).toContain('+Hallo Welt');
  });
});

describe('git restore', () => {
  it('nimmt mit --staged nur die Vormerkung zurück und behält die Änderung', () => {
    let zustand = start();
    zustand = bearbeiteDatei(zustand, 'liesmich.md', 'Hallo Welt');
    zustand = fuehreGitBefehlAus(zustand, 'git add liesmich.md').zustand;
    zustand = fuehreGitBefehlAus(zustand, 'git restore --staged liesmich.md').zustand;

    const eintrag = status(zustand).find((e) => e.pfad === 'liesmich.md');
    expect(eintrag?.status).toBe('modified');
    expect(zustand.dateien.find((d) => d.pfad === 'liesmich.md')?.arbeitsbaum).toBe('Hallo Welt');
  });

  it('lehnt eine unversionierte Datei ab, statt sie zu löschen', () => {
    // Ohne diese Prüfung setzte git restore den Inhalt auf undefined und
    // LÖSCHTE die Datei, während es Erfolg meldete — in einer Lernumgebung
    // die schlechteste Variante (Codex-Review auf PR #30).
    const ergebnis = fuehreGitBefehlAus(start(), 'git restore notizen.txt');

    expect(ergebnis.ausgabe).toContain('did not match any file(s) known to git');
    expect(ergebnis.veraendert).toBe(false);
    // Die Datei ist unangetastet und weiterhin unversioniert.
    const eintrag = status(ergebnis.zustand).find((e) => e.pfad === 'notizen.txt');
    expect(eintrag?.status).toBe('untracked');
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'notizen.txt')?.arbeitsbaum).toBe('Neu');
  });

  it('setzt NICHTS zurück, wenn einer von mehreren Pfaden nicht existiert', () => {
    let zustand = start();
    zustand = bearbeiteDatei(zustand, 'liesmich.md', 'Geändert');
    const ergebnis = fuehreGitBefehlAus(zustand, 'git restore liesmich.md fehlt.txt');

    expect(ergebnis.ausgabe).toContain("pathspec 'fehlt.txt' did not match");
    expect(ergebnis.veraendert).toBe(false);
    // Die Änderung ist noch da.
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'liesmich.md')?.arbeitsbaum).toBe(
      'Geändert',
    );
  });

  it('lehnt auch mit --staged eine unversionierte Datei ab', () => {
    const ergebnis = fuehreGitBefehlAus(start(), 'git restore --staged notizen.txt');
    expect(ergebnis.ausgabe).toContain('did not match any file(s) known to git');
    expect(ergebnis.veraendert).toBe(false);
  });

  it('verwirft ohne --staged die Änderung im Arbeitsverzeichnis', () => {
    let zustand = start();
    zustand = bearbeiteDatei(zustand, 'liesmich.md', 'Hallo Welt');
    const ergebnis = fuehreGitBefehlAus(zustand, 'git restore liesmich.md');

    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'liesmich.md')?.arbeitsbaum).toBe(
      'Hallo',
    );
    expect(ergebnis.ausgabe).toContain('weg');
  });
});

describe('Nicht umgesetzte Befehle', () => {
  it('werden deutlich abgelehnt statt still zu verpuffen', () => {
    const ergebnis = fuehreGitBefehlAus(start(), 'git rebase main');
    expect(ergebnis.ausgabe).toContain('nicht umgesetzt');
    expect(ergebnis.veraendert).toBe(false);
  });

  it('lehnt einen Nicht-Git-Befehl ab', () => {
    expect(fuehreGitBefehlAus(start(), 'ls -la').ausgabe).toContain('Kein Git-Befehl');
  });
});

/**
 * `index === undefined` ist eine Aussage über den Zustand: Der Pfad liegt
 * NICHT in der Staging Area. Bei einer vorgemerkten Löschung ist das
 * gewollt. Das frühere `index ?? head` machte daraus "kein Indexwert, also
 * ersatzweise HEAD" und zerstörte damit genau diese Unterscheidung.
 *
 * Alle erwarteten Ergebnisse sind gegen echtes Git 2.52 nachgestellt
 * (Code-Review vor dem Merge von PR #30).
 */
describe('Drei Orte: HEAD, INDEX, Arbeitsbaum', () => {
  it('deckt die ganze Zustandsmatrix ab', () => {
    const faelle: {
      name: string;
      datei: GitDatei;
      status: string;
      auchUngestagt: boolean;
      geloescht: boolean;
    }[] = [
      {
        name: 'A: unverändert',
        datei: { pfad: 'f.md', head: 'A', index: 'A', arbeitsbaum: 'A' },
        status: 'committed',
        auchUngestagt: false,
        geloescht: false,
      },
      {
        name: 'B: ungemerkte Änderung',
        datei: { pfad: 'f.md', head: 'A', index: 'A', arbeitsbaum: 'B' },
        status: 'modified',
        auchUngestagt: true,
        geloescht: false,
      },
      {
        name: 'C: vorgemerkte Änderung',
        datei: { pfad: 'f.md', head: 'A', index: 'B', arbeitsbaum: 'B' },
        status: 'staged',
        auchUngestagt: false,
        geloescht: false,
      },
      {
        name: 'D: vorgemerkt und danach weiter geändert',
        datei: { pfad: 'f.md', head: 'A', index: 'B', arbeitsbaum: 'C' },
        status: 'staged',
        auchUngestagt: true,
        geloescht: false,
      },
      {
        name: 'E: ungemerkte Löschung',
        datei: { pfad: 'f.md', head: 'A', index: 'A', arbeitsbaum: undefined },
        status: 'modified',
        auchUngestagt: true,
        geloescht: true,
      },
      {
        name: 'F: vorgemerkte Löschung',
        datei: { pfad: 'f.md', head: 'A', index: undefined, arbeitsbaum: undefined },
        status: 'staged',
        auchUngestagt: false,
        geloescht: true,
      },
      {
        name: 'G: vorgemerkte Löschung, Datei im Arbeitsbaum wieder angelegt',
        datei: { pfad: 'f.md', head: 'A', index: undefined, arbeitsbaum: 'neu' },
        status: 'staged',
        auchUngestagt: false,
        geloescht: true,
      },
    ];

    for (const fall of faelle) {
      const eintrag = dateiStatus(fall.datei);
      expect(eintrag?.status, fall.name).toBe(fall.status);
      expect(eintrag?.auchUngestagt, fall.name).toBe(fall.auchUngestagt);
      expect(eintrag?.geloescht, fall.name).toBe(fall.geloescht);
    }
  });

  it('führt eine vorgemerkte Löschung NUR unter den vorgemerkten Änderungen', () => {
    // Vorher stand sie unter beiden Überschriften — genau die Verwirrung
    // "ich habe doch git add gemacht", nur diesmal vom Simulator erfunden.
    const zustand: GitArbeitsbaumZustand = {
      dateien: [{ pfad: 'f.md', head: 'A' }],
      commits: [],
    };
    const eintraege = status(zustand);

    expect(eintraege).toHaveLength(1);
    expect(eintraege[0]?.status).toBe('staged');
    expect(eintraege[0]?.auchUngestagt).toBe(false);
    expect(eintraege[0]?.geloescht).toBe(true);
  });

  it('lässt dateiStatus und status bei Fall G dasselbe sagen', () => {
    // Die zusätzliche Zeile entsteht in status(); die Bewertung der Datei
    // selbst gehört in dateiStatus. Wären beide getrennt gepflegt, liefen
    // sie auseinander — sie taten es bereits
    // (Code-Review vor dem Merge von PR #30).
    const datei: GitDatei = { pfad: 'f.md', head: 'A', arbeitsbaum: 'neu' };
    const einzeln = dateiStatus(datei);
    const gestagteZeile = status({ dateien: [datei], commits: [] }).find(
      (e) => e.status === 'staged',
    );

    expect(gestagteZeile).toEqual(einzeln);
  });

  it('zeigt eine wieder angelegte Datei daneben als unversioniert (Fall G)', () => {
    // Echtes Git antwortet hier mit ZWEI Zeilen: `D  f.md` und `?? f.md`.
    // Weil der Index den Pfad nicht kennt, ist die neue Datei unversioniert.
    const zustand: GitArbeitsbaumZustand = {
      dateien: [{ pfad: 'f.md', head: 'A', arbeitsbaum: 'neu' }],
      commits: [],
    };
    const eintraege = status(zustand);

    expect(eintraege).toHaveLength(2);
    expect(eintraege.map((e) => e.status).sort()).toEqual(['staged', 'untracked']);
    expect(eintraege.find((e) => e.status === 'staged')?.geloescht).toBe(true);
    expect(eintraege.find((e) => e.status === 'staged')?.auchUngestagt).toBe(false);
  });
});

describe('Vorgemerkte Löschung: diff, restore und commit', () => {
  function mitVorgemerkterLoeschung(): GitArbeitsbaumZustand {
    return { dateien: [{ pfad: 'f.md', head: 'A' }], commits: [] };
  }

  it('zeigt sie in git diff --staged, aber nicht in git diff', () => {
    const zustand = mitVorgemerkterLoeschung();

    expect(fuehreGitBefehlAus(zustand, 'git diff').ausgabe).toContain('Keine ungemerkten');
    const gestagt = fuehreGitBefehlAus(zustand, 'git diff --staged').ausgabe;
    expect(gestagt).toContain('f.md');
    expect(gestagt).toContain('-A');
  });

  it('lässt git restore die Datei NICHT aus HEAD wiederauferstehen', () => {
    // Echtes Git: "pathspec did not match" — der Pfad liegt nicht im Index,
    // aus dem git restore liest. Vorher holte der Simulator ihn aus HEAD
    // zurück und verwarf damit stillschweigend die vorgemerkte Löschung.
    const zustand = mitVorgemerkterLoeschung();
    const ergebnis = fuehreGitBefehlAus(zustand, 'git restore f.md');

    expect(ergebnis.ausgabe).toContain('did not match');
    expect(ergebnis.veraendert).toBe(false);
    expect(ergebnis.zustand.dateien[0]?.arbeitsbaum).toBeUndefined();
  });

  it('nimmt sie mit git restore --staged zurück', () => {
    const ergebnis = fuehreGitBefehlAus(mitVorgemerkterLoeschung(), 'git restore --staged f.md');
    const datei = ergebnis.zustand.dateien[0];

    expect(ergebnis.veraendert).toBe(true);
    // Index wieder wie HEAD, Arbeitsbaum bleibt gelöscht: ungemerkte Löschung.
    expect(datei?.index).toBe('A');
    expect(datei?.arbeitsbaum).toBeUndefined();
    const eintrag = status(ergebnis.zustand)[0];
    expect(eintrag?.status).toBe('modified');
    expect(eintrag?.geloescht).toBe(true);
  });

  it('überspringt sie bei git restore . und setzt die übrigen zurück', () => {
    // Echtes Git meldet hier keinen Fehler, sondern lässt die vorgemerkte
    // Löschung in Ruhe.
    const zustand: GitArbeitsbaumZustand = {
      dateien: [
        { pfad: 'f.md', head: 'A' },
        { pfad: 'g.md', head: 'X', index: 'X', arbeitsbaum: 'Y' },
      ],
      commits: [],
    };
    const ergebnis = fuehreGitBefehlAus(zustand, 'git restore .');

    expect(ergebnis.veraendert).toBe(true);
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'g.md')?.arbeitsbaum).toBe('X');
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'f.md')?.arbeitsbaum).toBeUndefined();
  });

  it('zeigt Fall G in git diff nicht — die neue Datei ist unversioniert', () => {
    // Der Pfad fehlt im Index, aus dem der ungemerkte Vergleich liest.
    // Echtes Git zeigt hier nichts; die wieder angelegte Datei taucht als
    // unversioniert im Status auf, nicht als Hinzufügung im Diff.
    const zustand: GitArbeitsbaumZustand = {
      dateien: [{ pfad: 'f.md', head: 'A', arbeitsbaum: 'neu' }],
      commits: [],
    };

    expect(fuehreGitBefehlAus(zustand, 'git diff').ausgabe).toContain('Keine ungemerkten');
    expect(fuehreGitBefehlAus(zustand, 'git diff --staged').ausgabe).toContain('-A');
  });

  it('zeigt eine unversionierte Datei weiterhin nicht in git diff', () => {
    const zustand: GitArbeitsbaumZustand = {
      dateien: [{ pfad: 'n.txt', arbeitsbaum: 'x' }],
      commits: [],
    };
    expect(fuehreGitBefehlAus(zustand, 'git diff').ausgabe).toContain('Keine ungemerkten');
  });

  it('committet sie: die Datei fehlt danach im Stand des Commits', () => {
    const ergebnis = fuehreGitBefehlAus(mitVorgemerkterLoeschung(), 'git commit -m "f entfernt"');
    const commit = ergebnis.zustand.commits[ergebnis.zustand.commits.length - 1];

    expect(ergebnis.veraendert).toBe(true);
    expect(commit?.stand['f.md']).toBeUndefined();
    expect(ergebnis.zustand.dateien[0]?.head).toBeUndefined();
  });

  it('lässt den gewöhnlichen Ablauf unberührt', () => {
    const zustand: GitArbeitsbaumZustand = {
      dateien: [{ pfad: 'f.md', head: 'A', index: 'B', arbeitsbaum: 'C' }],
      commits: [],
    };
    // Vorgemerkt und danach weiter geändert: restore holt den INDEX-Stand.
    const ergebnis = fuehreGitBefehlAus(zustand, 'git restore f.md');
    expect(ergebnis.zustand.dateien[0]?.arbeitsbaum).toBe('B');
  });
});

/**
 * Abwesend und leer sind zwei Zustände, nicht einer. Das frühere
 * `(inhalt ?? '')` warf sie zusammen: Beim Löschen einer LEEREN Datei kam
 * gar keine Zeile zustande, und `git diff` meldete "keine Änderungen",
 * während `git status` die Löschung anzeigte.
 *
 * Alle Erwartungen gegen echtes Git 2.52 nachgestellt: Es schreibt dort
 * `deleted file mode` bzw. `new file mode` — die Kopfzeile trägt die
 * Aussage, wenn es keine Inhaltszeile gibt (Codex-Review auf PR #30).
 */
describe('Diff unterscheidet abwesend von leer', () => {
  const diff = (datei: GitDatei, befehl = 'git diff'): string =>
    fuehreGitBefehlAus({ dateien: [datei], commits: [] }, befehl).ausgabe;

  /** Nur die Inhaltszeilen — die Kopfzeilen `---`/`+++` gehören nicht dazu. */
  const inhaltszeilen = (ausgabe: string): string[] =>
    ausgabe
      .split('\n')
      .filter((z) => /^[-+]/.test(z) && !z.startsWith('---') && !z.startsWith('+++'));

  it('zeigt das Löschen einer Datei mit Inhalt', () => {
    const ausgabe = diff({ pfad: 'f.md', head: 'text', index: 'text' });
    expect(ausgabe).toContain('gelöschte Datei');
    expect(ausgabe).toContain('-text');
  });

  it('zeigt das Löschen einer LEEREN Datei — ohne erfundene Inhaltszeile', () => {
    const ausgabe = diff({ pfad: 'f.md', head: '', index: '' });

    expect(ausgabe).toContain('gelöschte Datei');
    expect(ausgabe).toContain('/dev/null');
    // Echtes Git zeigt hier keine Inhaltszeile; eine erfundene `-` wäre
    // schlechter als keine.
    expect(inhaltszeilen(ausgabe)).toEqual([]);
  });

  it('zeigt das Anlegen einer LEEREN Datei', () => {
    const ausgabe = diff({ pfad: 'f.md', index: '', arbeitsbaum: '' }, 'git diff --staged');

    expect(ausgabe).toContain('neue Datei');
    expect(inhaltszeilen(ausgabe)).toEqual([]);
  });

  it('zeigt das Anlegen einer Datei mit Inhalt', () => {
    const ausgabe = diff({ pfad: 'f.md', index: 'text', arbeitsbaum: 'text' }, 'git diff --staged');
    expect(ausgabe).toContain('neue Datei');
    expect(ausgabe).toContain('+text');
  });

  it('meldet bei leer -> leer nichts', () => {
    expect(diff({ pfad: 'f.md', head: '', index: '', arbeitsbaum: '' })).toContain(
      'Keine ungemerkten',
    );
  });

  it('zeigt einen entfernten abschließenden Zeilenumbruch', () => {
    // `a\n` -> `a`: Der Unterschied ist genau der Abschluss. Echtes Git
    // zeigt die Zeile dafür als `-a`/`+a` mit Markierung — der Umbruch ist
    // ein Abschluss, keine leere Zeile.
    const ausgabe = diff({ pfad: 'f.md', head: 'a\n', index: 'a\n', arbeitsbaum: 'a' });

    expect(inhaltszeilen(ausgabe)).toEqual(['-a', '+a']);
    expect(ausgabe).toContain('Kein Zeilenumbruch am Dateiende');
  });

  it('zeigt einen hinzugefügten abschließenden Zeilenumbruch', () => {
    const ausgabe = diff({ pfad: 'f.md', head: 'a', index: 'a', arbeitsbaum: 'a\n' });

    expect(inhaltszeilen(ausgabe)).toEqual(['-a', '+a']);
    expect(ausgabe).toContain('Kein Zeilenumbruch am Dateiende');
  });

  it('erfindet bei abgeschlossenen Zeilen keine leere Kontextzeile', () => {
    // `a\n` -> `b\n`: Echtes Git zeigt nur `-a` und `+b`. Den Abschluss als
    // leere Zeile zu zählen hängte hier eine leere Kontextzeile an
    // (Codex-Review auf PR #30).
    const ausgabe = diff({ pfad: 'f.md', head: 'a\n', index: 'a\n', arbeitsbaum: 'b\n' });

    expect(inhaltszeilen(ausgabe)).toEqual(['-a', '+b']);
    expect(ausgabe).not.toContain('Kein Zeilenumbruch');
    expect(ausgabe.split('\n').some((z) => z === ' ')).toBe(false);
  });

  it('zeigt eine eingefügte Leerzeile mitten im Text', () => {
    const ausgabe = diff({
      pfad: 'f.md',
      head: 'a\nb\n',
      index: 'a\nb\n',
      arbeitsbaum: 'a\n\nb\n',
    });

    // Genau das, was echtes Git zeigt: `b` bleibt Kontext, nur die Leerzeile
    // kommt hinzu. Ein stellenweiser Vergleich meldete `b` als entfernt UND
    // hinzugefügt (Codex-Review auf PR #30).
    expect(ausgabe.split('\n').slice(2)).toEqual([' a', '+', ' b']);
  });

  it('behält unveränderte Zeilen nach einer Einfügung als Kontext', () => {
    const ausgabe = diff({
      pfad: 'f.md',
      head: 'a\nc\n',
      index: 'a\nc\n',
      arbeitsbaum: 'a\nb\nc\n',
    });
    expect(ausgabe.split('\n').slice(2)).toEqual([' a', '+b', ' c']);
  });

  it('behält unveränderte Zeilen nach einer Löschung als Kontext', () => {
    const ausgabe = diff({
      pfad: 'f.md',
      head: 'a\nb\nc\n',
      index: 'a\nb\nc\n',
      arbeitsbaum: 'a\nc\n',
    });
    expect(ausgabe.split('\n').slice(2)).toEqual([' a', '-b', ' c']);
  });

  it('lässt gewöhnliche Inhaltsänderungen unverändert', () => {
    const ausgabe = diff({ pfad: 'f.md', head: 'a', index: 'a', arbeitsbaum: 'b' });
    expect(ausgabe).toContain('-a');
    expect(ausgabe).toContain('+b');
    expect(ausgabe).not.toContain('gelöschte Datei');
  });
});

describe('Lebenslauf einer gelöschten leeren Datei', () => {
  it('führt von ungemerkt über vorgemerkt bis in den Commit', () => {
    let zustand: GitArbeitsbaumZustand = {
      dateien: [{ pfad: 'leer.md', head: '', index: '', arbeitsbaum: undefined }],
      commits: [],
    };

    // 1. ungemerkte Löschung: im ungemerkten Diff sichtbar
    expect(fuehreGitBefehlAus(zustand, 'git diff').ausgabe).toContain('gelöschte Datei');
    expect(fuehreGitBefehlAus(zustand, 'git diff --staged').ausgabe).toContain(
      'Keine vorgemerkten',
    );

    // 2. vormerken
    zustand = fuehreGitBefehlAus(zustand, 'git add leer.md').zustand;
    expect(zustand.dateien[0]?.index).toBeUndefined();

    // 3. jetzt umgekehrt: gestagt sichtbar, ungemerkt nichts mehr
    expect(fuehreGitBefehlAus(zustand, 'git diff').ausgabe).toContain('Keine ungemerkten');
    expect(fuehreGitBefehlAus(zustand, 'git diff --staged').ausgabe).toContain('gelöschte Datei');

    // 4. committen: die Datei fehlt im Stand, danach ist nichts mehr offen
    const nachCommit = fuehreGitBefehlAus(zustand, 'git commit -m "leer.md entfernt"');
    const commit = nachCommit.zustand.commits[nachCommit.zustand.commits.length - 1];
    expect(commit?.stand['leer.md']).toBeUndefined();
    expect(fuehreGitBefehlAus(nachCommit.zustand, 'git diff').ausgabe).toContain(
      'Keine ungemerkten',
    );
    expect(fuehreGitBefehlAus(nachCommit.zustand, 'git diff --staged').ausgabe).toContain(
      'Keine vorgemerkten',
    );
  });
});

/**
 * Die vollständige Zustandsmatrix, gegen echtes Git 2.52 nachgestellt.
 *
 * Jede Aussage gehört zu genau einem Baumpaar — vorgemerkt HEAD -> INDEX,
 * ungemerkt INDEX -> ARBEITSBAUM, unversioniert nur bei einer Datei im
 * Arbeitsbaum, die weder HEAD noch Index kennen. Ein Feld, das die Paare
 * vermischte, meldete beim ersten `git add` des Labs "geändert" statt
 * "neue Datei" (Code-Review vor dem Merge von PR #30).
 */
describe('Statusmatrix über die drei Orte', () => {
  const zeilen = (datei: GitDatei): string[] =>
    status({ dateien: [datei], commits: [] }).map(
      (e) =>
        `${e.status}${e.vorgemerkt ? `(${e.vorgemerkt})` : ''}${e.auchUngestagt ? '+ungemerkt' : ''}`,
    );

  it('bildet jeden der elf Fälle ab', () => {
    const faelle: [string, GitDatei, string[]][] = [
      ['1  A/A/A  sauber', { pfad: 'f', head: 'A', index: 'A', arbeitsbaum: 'A' }, ['committed']],
      [
        '2  A/A/B  ungemerkt',
        { pfad: 'f', head: 'A', index: 'A', arbeitsbaum: 'B' },
        ['modified+ungemerkt'],
      ],
      [
        '3  A/B/B  vorgemerkt',
        { pfad: 'f', head: 'A', index: 'B', arbeitsbaum: 'B' },
        ['staged(geaendert)'],
      ],
      [
        '4  A/B/C  beides',
        { pfad: 'f', head: 'A', index: 'B', arbeitsbaum: 'C' },
        ['staged(geaendert)+ungemerkt'],
      ],
      ['5  -/-/A  unversioniert', { pfad: 'f', arbeitsbaum: 'A' }, ['untracked']],
      ['6  -/A/A  neu vorgemerkt', { pfad: 'f', index: 'A', arbeitsbaum: 'A' }, ['staged(neu)']],
      [
        '7  -/A/B  neu + ungemerkt',
        { pfad: 'f', index: 'A', arbeitsbaum: 'B' },
        ['staged(neu)+ungemerkt'],
      ],
      [
        '8  A/A/-  ungemerkte Löschung',
        { pfad: 'f', head: 'A', index: 'A' },
        ['modified+ungemerkt'],
      ],
      ['9  A/-/-  vorgemerkte Löschung', { pfad: 'f', head: 'A' }, ['staged(geloescht)']],
      [
        '10 A/-/neu Löschung + unversioniert',
        { pfad: 'f', head: 'A', arbeitsbaum: 'neu' },
        ['staged(geloescht)', 'untracked'],
      ],
      ['11 -/-/-  keine Zeile', { pfad: 'f' }, []],
    ];

    for (const [name, datei, erwartet] of faelle) {
      expect(zeilen(datei), name).toEqual(erwartet);
    }
  });

  it('leitet die vorgemerkte Art allein aus HEAD -> INDEX ab', () => {
    // Der Arbeitsbaum darf daran nichts ändern: Eine vorgemerkt NEUE Datei
    // bleibt neu, auch wenn sie danach im Arbeitsbaum gelöscht wird
    // (echtes Git: `AD`).
    expect(dateiStatus({ pfad: 'f', index: 'A', arbeitsbaum: 'A' })?.vorgemerkt).toBe('neu');
    expect(dateiStatus({ pfad: 'f', index: 'A' })?.vorgemerkt).toBe('neu');
    expect(dateiStatus({ pfad: 'f', head: 'A', index: 'B', arbeitsbaum: 'B' })?.vorgemerkt).toBe(
      'geaendert',
    );
    expect(dateiStatus({ pfad: 'f', head: 'A' })?.vorgemerkt).toBe('geloescht');
    expect(
      dateiStatus({ pfad: 'f', head: 'A', index: 'A', arbeitsbaum: 'B' })?.vorgemerkt,
    ).toBeNull();
  });

  it('nennt eine vorgemerkte neue Datei im Lab beim Namen', () => {
    // Der zentrale Handgriff des Git-State-Labs, mit dessen ausgelieferter
    // Konfiguration: `notizen.txt` ist unversioniert.
    const zustand: GitArbeitsbaumZustand = {
      dateien: [
        { pfad: 'liesmich.md', arbeitsbaum: '# Projekt', index: '# Projekt', head: '# Projekt' },
        { pfad: 'notizen.txt', arbeitsbaum: 'Erste Idee' },
      ],
      commits: [],
    };
    const nachAdd = fuehreGitBefehlAus(zustand, 'git add notizen.txt').zustand;
    const ausgabe = fuehreGitBefehlAus(nachAdd, 'git status').ausgabe;

    expect(ausgabe).toContain('neue Datei');
    expect(ausgabe).toContain('notizen.txt');
    expect(ausgabe).not.toMatch(/geändert:\s+notizen\.txt/);
  });

  it('lehnt git add für eine Datei ab, die es nirgends mehr gibt', () => {
    // Stiller Erfolg ist genau das, was dieser Simulator nirgends tun soll:
    // Der Eintrag stand nach dem Commit in keinem der drei Orte mehr, galt
    // aber weiter als bekannt (Codex-Review auf PR #30).
    let zustand: GitArbeitsbaumZustand = {
      dateien: [{ pfad: 'f.md', head: 'A', index: 'A', arbeitsbaum: undefined }],
      commits: [],
    };
    zustand = fuehreGitBefehlAus(zustand, 'git add f.md').zustand;
    zustand = fuehreGitBefehlAus(zustand, 'git commit -m "f.md entfernt"').zustand;

    const ergebnis = fuehreGitBefehlAus(zustand, 'git add f.md');

    expect(ergebnis.ausgabe).toContain('did not match any files');
    expect(ergebnis.veraendert).toBe(false);
  });

  it('lässt nach einer committeten Löschung nichts zurück', () => {
    let zustand: GitArbeitsbaumZustand = {
      dateien: [{ pfad: 'f.md', head: 'A', index: 'A', arbeitsbaum: undefined }],
      commits: [],
    };
    zustand = fuehreGitBefehlAus(zustand, 'git add f.md').zustand;
    expect(fuehreGitBefehlAus(zustand, 'git status').ausgabe).toContain('gelöscht');

    zustand = fuehreGitBefehlAus(zustand, 'git commit -m "f.md entfernt"').zustand;

    // Kein Geisterbild: Die Datei gibt es nirgends mehr.
    expect(fuehreGitBefehlAus(zustand, 'git status').ausgabe).toBe(
      'Nichts zu committen, Arbeitsverzeichnis unverändert.',
    );
    expect(fuehreGitBefehlAus(zustand, 'git diff').ausgabe).toContain('Keine ungemerkten');
    expect(fuehreGitBefehlAus(zustand, 'git diff --staged').ausgabe).toContain(
      'Keine vorgemerkten',
    );
    const commit = zustand.commits[zustand.commits.length - 1];
    expect(commit?.stand['f.md']).toBeUndefined();
  });
});
