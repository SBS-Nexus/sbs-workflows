import { describe, expect, it } from 'vitest';
import {
  bearbeiteDatei,
  dateiStatus,
  fuehreGitBefehlAus,
  status,
  type GitArbeitsbaumZustand,
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
    expect(dateiStatus({ pfad: 'neu.txt', arbeitsbaum: 'x' }).status).toBe('untracked');
  });

  it('erkennt eine unveränderte Datei als committed', () => {
    expect(dateiStatus({ pfad: 'a', arbeitsbaum: 'x', index: 'x', head: 'x' }).status).toBe(
      'committed',
    );
  });

  it('erkennt eine geänderte, nicht vorgemerkte Datei', () => {
    expect(dateiStatus({ pfad: 'a', arbeitsbaum: 'neu', index: 'alt', head: 'alt' }).status).toBe(
      'modified',
    );
  });

  it('erkennt eine vorgemerkte Änderung', () => {
    expect(dateiStatus({ pfad: 'a', arbeitsbaum: 'neu', index: 'neu', head: 'alt' }).status).toBe(
      'staged',
    );
  });

  it('meldet eine erneut geänderte, bereits vorgemerkte Datei in BEIDEN Abschnitten', () => {
    // Der häufigste Stolperstein: nach dem git add weitergearbeitet.
    const eintrag = dateiStatus({ pfad: 'a', arbeitsbaum: 'ganz neu', index: 'neu', head: 'alt' });
    expect(eintrag.status).toBe('staged');
    expect(eintrag.auchUngestagt).toBe(true);
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
    expect(laufe(['git add gibtsnicht.txt']).letzte).toContain('Nicht gefunden');
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
