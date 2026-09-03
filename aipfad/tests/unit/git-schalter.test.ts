import { describe, expect, it } from 'vitest';
import { leseSchalter } from '@/domain/git/schalter';
import { fuehreGitBefehlAus, status, type GitArbeitsbaumZustand } from '@/domain/git/working-tree';
import { fuehreBranchBefehlAus, type BranchZustand } from '@/domain/git/branches';

/**
 * Der wiederkehrende Fehler dieser Simulatoren war immer derselbe: Ein nicht
 * umgesetzter Schalter wurde übergangen, und der Befehl tat danach etwas
 * anderes als verlangt. Diese Prüfungen decken die ganze Klasse ab, nicht
 * einzelne Fälle (Codex-Review auf PR #30).
 */

describe('Schalter lesen', () => {
  const ERLAUBT = [{ schreibweisen: ['-S', '--staged'], name: 'staged' }];

  it('erkennt beide Schreibweisen unter einem Namen', () => {
    expect(leseSchalter(['-S', 'a.txt'], ERLAUBT).gesetzt.has('staged')).toBe(true);
    expect(leseSchalter(['--staged', 'a.txt'], ERLAUBT).gesetzt.has('staged')).toBe(true);
  });

  it('trennt Operanden von Schaltern', () => {
    expect(leseSchalter(['-S', 'a.txt', 'b.txt'], ERLAUBT).operanden).toEqual(['a.txt', 'b.txt']);
  });

  it('meldet den ersten unbekannten Schalter', () => {
    expect(leseSchalter(['-x', 'a.txt'], ERLAUBT).unbekannt).toBe('-x');
  });

  it('behandelt nach -- alles als Operand', () => {
    const ergebnis = leseSchalter(['--', '-seltsamer-dateiname'], ERLAUBT);
    expect(ergebnis.unbekannt).toBeUndefined();
    expect(ergebnis.operanden).toEqual(['-seltsamer-dateiname']);
  });
});

function arbeitsbaum(): GitArbeitsbaumZustand {
  return {
    dateien: [
      { pfad: 'preise.md', arbeitsbaum: 'neu', index: 'mittel', head: 'alt' },
      { pfad: 'liesmich.md', arbeitsbaum: 'x', index: 'x', head: 'x' },
    ],
    commits: [],
  };
}

describe('git restore: Kurzform -S', () => {
  it('nimmt mit -S die Vormerkung zurück, statt die Arbeit zu verwerfen', () => {
    // Zuvor kannte der Simulator nur --staged. `-S` fiel in den anderen Zweig
    // und verwarf die zweite Änderung — ein Datenverlust im Simulator.
    const ergebnis = fuehreGitBefehlAus(arbeitsbaum(), 'git restore -S preise.md');
    const datei = ergebnis.zustand.dateien.find((d) => d.pfad === 'preise.md');

    expect(datei?.arbeitsbaum).toBe('neu');
    expect(datei?.index).toBe('alt');
  });
});

describe('git add mit Alles-Auswahl', () => {
  it('lehnt einen unbekannten Pfad auch neben einem Punkt ab', () => {
    const ergebnis = fuehreGitBefehlAus(arbeitsbaum(), 'git add . fehlt.txt');

    expect(ergebnis.ausgabe).toContain("pathspec 'fehlt.txt' did not match any files");
    expect(ergebnis.veraendert).toBe(false);
    expect(status(ergebnis.zustand).find((e) => e.pfad === 'preise.md')?.status).toBe('staged');
  });

  it('merkt mit einem Punkt alles vor, wenn kein Pfad danebensteht', () => {
    const ergebnis = fuehreGitBefehlAus(arbeitsbaum(), 'git add .');
    expect(ergebnis.veraendert).toBe(true);
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'preise.md')?.index).toBe('neu');
  });

  it('lehnt einen nicht umgesetzten Schalter ab', () => {
    const ergebnis = fuehreGitBefehlAus(arbeitsbaum(), 'git add -p preise.md');
    expect(ergebnis.ausgabe).toContain('nicht umgesetzt');
    expect(ergebnis.veraendert).toBe(false);
  });
});

function branches(): BranchZustand {
  return {
    commits: [
      { id: 'c01', nachricht: 'Erster', eltern: [] },
      { id: 'c02', nachricht: 'Zweiter', eltern: ['c01'] },
    ],
    branches: { main: 'c02' },
    aktuellerBranch: 'main',
  };
}

describe('git branch: Auflisten legt nichts an', () => {
  it('behandelt einen Operanden bei -l als Suchmuster', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git branch -l topic');
    expect(ergebnis.zustand.branches['topic']).toBeUndefined();
    expect(ergebnis.veraendert).toBe(false);
  });

  it('filtert mit -a nach dem Muster, statt anzulegen', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git branch -a main');
    expect(ergebnis.ausgabe).toContain('main');
    expect(Object.keys(ergebnis.zustand.branches)).toEqual(['main']);
  });

  it('legt ohne Auflisten-Schalter weiterhin an', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git branch topic');
    expect(ergebnis.zustand.branches['topic']).toBe('c02');
  });
});

describe('git merge: nicht umgesetzte Schalter', () => {
  it('lehnt --squash ab, statt einen Merge-Commit anzulegen', () => {
    let zustand = fuehreBranchBefehlAus(branches(), 'git switch -c feature').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git commit -m "A"').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git switch main').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git commit -m "B"').zustand;

    const vorher = zustand.commits.length;
    const ergebnis = fuehreBranchBefehlAus(zustand, 'git merge --squash feature');

    expect(ergebnis.ausgabe).toContain('nicht umgesetzt');
    expect(ergebnis.veraendert).toBe(false);
    expect(ergebnis.zustand.commits).toHaveLength(vorher);
  });

  it('lehnt --no-ff ab', () => {
    expect(fuehreBranchBefehlAus(branches(), 'git merge --no-ff feature').ausgabe).toContain(
      'nicht umgesetzt',
    );
  });
});

describe('git switch: nicht umgesetzte Schalter', () => {
  it('lehnt -d ab, statt es zu übergehen', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git switch -d c01');
    expect(ergebnis.ausgabe).toContain('nicht umgesetzt');
    expect(ergebnis.zustand.aktuellerBranch).toBe('main');
  });
});
