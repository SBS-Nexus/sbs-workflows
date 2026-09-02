import { describe, expect, it } from 'vitest';
import {
  baueGraph,
  fuehreBranchBefehlAus,
  istVorfahre,
  mergeArt,
  type BranchZustand,
} from '@/domain/git/branches';

/**
 * Der Branch-Simulator soll die eine Einsicht tragen, an der alles hängt:
 * Ein Branch ist ein ZEIGER auf einen Commit. Daraus folgt, warum Verzweigen
 * nichts kostet und warum es zwei Arten von Merge gibt.
 */

function start(): BranchZustand {
  return {
    commits: [
      { id: 'c01', nachricht: 'Erster Commit', eltern: [] },
      { id: 'c02', nachricht: 'Startseite', eltern: ['c01'] },
    ],
    branches: { main: 'c02' },
    aktuellerBranch: 'main',
  };
}

function laufe(befehle: string[], zustand: BranchZustand = start()) {
  const ausgaben: string[] = [];
  let aktuell = zustand;
  for (const befehl of befehle) {
    const ergebnis = fuehreBranchBefehlAus(aktuell, befehl);
    ausgaben.push(ergebnis.ausgabe);
    aktuell = ergebnis.zustand;
  }
  return { zustand: aktuell, ausgaben, letzte: ausgaben[ausgaben.length - 1] ?? '' };
}

describe('Branch anlegen und wechseln', () => {
  it('legt einen Branch als zweiten Zeiger auf denselben Commit an', () => {
    const { zustand } = laufe(['git branch feature']);
    expect(zustand.branches['feature']).toBe('c02');
    expect(zustand.branches['main']).toBe('c02');
    // Kein neuer Commit — Verzweigen kostet nichts.
    expect(zustand.commits).toHaveLength(2);
  });

  it('legt mit switch -c an und wechselt in einem Schritt', () => {
    const { zustand } = laufe(['git switch -c feature']);
    expect(zustand.aktuellerBranch).toBe('feature');
    expect(zustand.branches['feature']).toBe('c02');
  });

  it('verweist beim Wechsel auf einen unbekannten Branch auf -c', () => {
    expect(laufe(['git switch gibtsnicht']).letzte).toContain('git switch -c');
  });

  it('bewegt beim Commit nur den aktuellen Branch', () => {
    const { zustand } = laufe(['git switch -c feature', 'git commit -m "Neue Sache"']);
    expect(zustand.branches['feature']).toBe('c03');
    expect(zustand.branches['main']).toBe('c02');
  });
});

describe('Merge-Art', () => {
  it('ist fast-forward, wenn der eigene Stand in der Vorgeschichte liegt', () => {
    const { zustand } = laufe(['git switch -c feature', 'git commit -m "A"', 'git switch main']);
    expect(mergeArt(zustand, 'c02', 'c03')).toBe('fast-forward');
  });

  it('ist ein Merge-Commit, wenn beide Linien auseinandergelaufen sind', () => {
    const { zustand } = laufe([
      'git switch -c feature',
      'git commit -m "A"',
      'git switch main',
      'git commit -m "B"',
    ]);
    const main = zustand.branches['main'];
    const feature = zustand.branches['feature'];
    expect(main).toBeDefined();
    expect(feature).toBeDefined();
    expect(mergeArt(zustand, main!, feature!)).toBe('merge-commit');
  });

  it('ist bereits aktuell, wenn der andere Branch schon enthalten ist', () => {
    const zustand = start();
    expect(mergeArt(zustand, 'c02', 'c01')).toBe('bereits-aktuell');
  });
});

describe('git merge', () => {
  it('schiebt beim Fast-Forward nur den Zeiger weiter, ohne neuen Commit', () => {
    const { zustand, letzte } = laufe([
      'git switch -c feature',
      'git commit -m "A"',
      'git switch main',
      'git merge feature',
    ]);
    expect(letzte).toContain('Fast-Forward');
    expect(zustand.branches['main']).toBe('c03');
    expect(zustand.commits).toHaveLength(3);
  });

  it('legt bei auseinandergelaufenen Linien einen Merge-Commit mit zwei Eltern an', () => {
    const { zustand, letzte } = laufe([
      'git switch -c feature',
      'git commit -m "A"',
      'git switch main',
      'git commit -m "B"',
      'git merge feature',
    ]);
    expect(letzte).toContain('Merge-Commit');
    const merge = zustand.commits[zustand.commits.length - 1];
    expect(merge?.eltern).toHaveLength(2);
    expect(zustand.branches['main']).toBe(merge?.id);
    // Der hereingeholte Branch bleibt, wo er war.
    expect(zustand.branches['feature']).toBe('c03');
  });

  it('meldet, wenn nichts zu tun ist', () => {
    const { letzte } = laufe(['git branch feature', 'git merge feature']);
    expect(letzte).toContain('Bereits aktuell');
  });

  it('lehnt den Merge eines Branches mit sich selbst ab', () => {
    expect(laufe(['git merge main']).letzte).toContain('mit sich selbst');
  });
});

describe('Vorfahren', () => {
  it('erkennt einen Vorfahren über mehrere Schritte', () => {
    const zustand = start();
    expect(istVorfahre(zustand, 'c01', 'c02')).toBe(true);
    expect(istVorfahre(zustand, 'c02', 'c01')).toBe(false);
  });
});

describe('Graph-Darstellung', () => {
  it('ordnet Commits nach Tiefe und Entwicklungslinie an', () => {
    const { zustand } = laufe([
      'git switch -c feature',
      'git commit -m "A"',
      'git switch main',
      'git commit -m "B"',
    ]);
    const graph = baueGraph(zustand);

    const c01 = graph.find((k) => k.commit.id === 'c01');
    const feature = graph.find((k) => k.commit.id === 'c03');
    const mainSpitze = graph.find((k) => k.commit.id === 'c04');

    expect(c01?.spalte).toBe(0);
    expect(feature?.spalte).toBe(2);
    expect(mainSpitze?.spalte).toBe(2);
    // main bleibt oben, damit die Darstellung ruhig bleibt.
    expect(mainSpitze?.zeile).toBeLessThan(feature?.zeile ?? 99);
  });

  it('führt die Branchnamen an ihrem Commit auf', () => {
    const graph = baueGraph(start());
    expect(graph.find((k) => k.commit.id === 'c02')?.zeiger).toEqual(['main']);
  });
});

describe('Nicht umgesetzte Befehle', () => {
  it('werden deutlich abgelehnt', () => {
    expect(laufe(['git rebase main']).letzte).toContain('nicht umgesetzt');
  });
});

describe('Graph nach einem Merge', () => {
  it('lässt den hereingeholten Ast auf seiner eigenen Zeile stehen', () => {
    // Ohne diese Eigenschaft flacht der Graph nach dem Merge zu einer Linie
    // ab: main erreicht dann auch die Commits des Astes. Die Verzweigung wäre
    // genau in dem Moment unsichtbar, in dem sie erklärt werden soll.
    const { zustand } = laufe([
      'git switch -c feature',
      'git commit -m "A"',
      'git switch main',
      'git commit -m "B"',
      'git merge feature',
    ]);
    const graph = baueGraph(zustand);

    const zeile = (id: string) => graph.find((k) => k.commit.id === id)?.zeile;
    // main-Linie: Wurzel, eigener Commit und der Merge-Commit.
    expect(zeile('c01')).toBe(0);
    expect(zeile('c04')).toBe(0);
    expect(zeile('c05')).toBe(0);
    // Der hereingeholte Commit bleibt auf der Zeile des Astes.
    expect(zeile('c03')).toBe(1);
  });

  it('zeichnet den Merge-Commit mit beiden Eltern', () => {
    const { zustand } = laufe([
      'git switch -c feature',
      'git commit -m "A"',
      'git switch main',
      'git commit -m "B"',
      'git merge feature',
    ]);
    const graph = baueGraph(zustand);
    const merge = graph.find((k) => k.commit.eltern.length === 2);
    expect(merge).toBeDefined();
    expect(merge?.commit.eltern).toEqual(['c04', 'c03']);
  });
});
