import { describe, expect, it } from 'vitest';
import { leseSchalter } from '@/domain/git/schalter';
import { fuehreGitBefehlAus, status, type GitArbeitsbaumZustand } from '@/domain/git/working-tree';
import { fuehreBranchBefehlAus, type BranchZustand } from '@/domain/git/branches';
import { fuehreKonfliktBefehlAus, loeseKonflikt } from '@/domain/git/merge-conflict';

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

/**
 * Die Schalterprüfung gilt für JEDEN Unterbefehl, nicht nur für die, bei
 * denen bisher ein Fund gemeldet wurde. Ein vergessener Schalter soll
 * abgelehnt werden, egal wo (Codex-Review auf PR #30).
 */
describe('Schalterprüfung deckt alle Unterbefehle ab', () => {
  it('lehnt unbekannte Schalter im Arbeitsbaum-Simulator überall ab', () => {
    for (const befehl of [
      'git status --short',
      'git commit --amend -m "x"',
      'git diff --stat',
      'git log --oneline',
      'git add --patch preise.md',
      'git restore --source=HEAD preise.md',
    ]) {
      const ergebnis = fuehreGitBefehlAus(arbeitsbaum(), befehl);
      expect(ergebnis.ausgabe, befehl).toContain('nicht umgesetzt');
      expect(ergebnis.veraendert, befehl).toBe(false);
    }
  });

  it('lehnt unbekannte Schalter im Branch-Simulator überall ab', () => {
    for (const befehl of [
      'git commit --amend -m "x"',
      'git log --graph',
      'git switch --detach main',
      'git merge --no-commit feature',
    ]) {
      const ergebnis = fuehreBranchBefehlAus(branches(), befehl);
      expect(ergebnis.ausgabe, befehl).toContain('nicht umgesetzt');
      expect(ergebnis.veraendert, befehl).toBe(false);
    }
  });

  it('begrenzt git add -A auf einen angegebenen Pfad', () => {
    // Ohne die Begrenzung merkte -A trotz Pfadangabe ALLES vor.
    const ergebnis = fuehreGitBefehlAus(arbeitsbaum(), 'git add -A preise.md');
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'preise.md')?.index).toBe('neu');
    // liesmich.md war unverändert und bleibt es.
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'liesmich.md')?.index).toBe('x');
  });

  it('berücksichtigt beim Auflisten jedes angegebene Muster', () => {
    let zustand = fuehreBranchBefehlAus(branches(), 'git branch feature').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git branch hotfix').zustand;

    const ergebnis = fuehreBranchBefehlAus(zustand, 'git branch -l feature hotfix');
    expect(ergebnis.ausgabe).toContain('feature');
    expect(ergebnis.ausgabe).toContain('hotfix');
    expect(ergebnis.ausgabe).not.toContain('main');
  });
});

describe('Konflikt-Simulator prüft Schalter und Pfad', () => {
  function konflikt() {
    return {
      datei: {
        pfad: 'preise.md',
        abschnitte: [
          { art: 'gemeinsam' as const, zeilen: ['# Preise'] },
          {
            art: 'konflikt' as const,
            id: 'k1',
            unsere: ['9 Euro'],
            ihre: ['12 Euro'],
          },
        ],
      },
      aufloesungen: {},
      vorgemerkt: false,
      status: 'laeuft' as const,
    };
  }

  it('merkt keinen fremden Pfad vor', () => {
    const geloest = loeseKonflikt(konflikt(), 'k1', { art: 'ihre' });
    const ergebnis = fuehreKonfliktBefehlAus(geloest, 'git add tippfehler.md');

    expect(ergebnis.ausgabe).toContain("pathspec 'tippfehler.md' did not match any files");
    expect(ergebnis.zustand.vorgemerkt).toBe(false);
  });

  it('lehnt unbekannte Schalter ab', () => {
    const ergebnis = fuehreKonfliktBefehlAus(konflikt(), 'git merge --continue');
    expect(ergebnis.ausgabe).toContain('nicht umgesetzt');
    expect(ergebnis.veraendert).toBe(false);
  });

  it('merkt die Konfliktdatei weiterhin vor', () => {
    const geloest = loeseKonflikt(konflikt(), 'k1', { art: 'ihre' });
    const ergebnis = fuehreKonfliktBefehlAus(geloest, 'git add preise.md');
    expect(ergebnis.zustand.vorgemerkt).toBe(true);
  });
});
