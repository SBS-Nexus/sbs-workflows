/**
 * Deterministischer Branch- und Merge-Simulator.
 *
 * Wieder eine reine Funktion ohne echtes Git. Modelliert wird der Punkt, an
 * dem das mentale Modell kippt: Ein Branch ist kein Ordner und keine Kopie,
 * sondern ein **Zeiger auf einen Commit**. Deshalb ist Verzweigen billig, und
 * deshalb gibt es zwei verschiedene Arten von Merge.
 */

export interface Commit {
  id: string;
  nachricht: string;
  /** Eltern-Commits. Zwei Eltern = Merge-Commit. */
  eltern: string[];
}

export interface BranchZustand {
  commits: Commit[];
  /** Branchname -> Commit-Kennung, auf die er zeigt. */
  branches: Record<string, string>;
  /** Auf welchem Branch HEAD gerade steht. */
  aktuellerBranch: string;
}

export interface BranchErgebnis {
  zustand: BranchZustand;
  ausgabe: string;
  veraendert: boolean;
}

export const UMGESETZTE_BRANCH_BEFEHLE = [
  'git branch',
  'git switch',
  'git switch -c',
  'git merge',
  'git commit',
  'git log',
] as const;

const UNVERAENDERT = (zustand: BranchZustand, ausgabe: string): BranchErgebnis => ({
  zustand,
  ausgabe,
  veraendert: false,
});

import { leseSchalter, schalterNichtUmgesetzt } from './schalter';

function commitById(zustand: BranchZustand, id: string): Commit | undefined {
  return zustand.commits.find((c) => c.id === id);
}

/** Alle Vorfahren eines Commits, ihn selbst eingeschlossen. */
export function vorfahren(zustand: BranchZustand, id: string): Set<string> {
  const gesehen = new Set<string>();
  const offen = [id];
  while (offen.length > 0) {
    const aktuell = offen.pop();
    if (aktuell === undefined || gesehen.has(aktuell)) continue;
    gesehen.add(aktuell);
    const commit = commitById(zustand, aktuell);
    if (commit) offen.push(...commit.eltern);
  }
  return gesehen;
}

/**
 * Ist `moeglicherVorfahre` ein Vorfahre von `commit`?
 *
 * Genau diese Frage entscheidet, ob ein Merge ein Fast-Forward sein kann:
 * Liegt der eigene Branch vollständig in der Vorgeschichte des anderen, muss
 * nichts zusammengeführt werden — der Zeiger wird nur weitergeschoben.
 */
export function istVorfahre(
  zustand: BranchZustand,
  moeglicherVorfahre: string,
  commit: string,
): boolean {
  return vorfahren(zustand, commit).has(moeglicherVorfahre);
}

export type MergeArt = 'bereits-aktuell' | 'fast-forward' | 'merge-commit';

/** Bestimmt, welche Art von Merge zwischen zwei Ständen nötig wäre. */
export function mergeArt(zustand: BranchZustand, ziel: string, quelle: string): MergeArt {
  if (ziel === quelle || istVorfahre(zustand, quelle, ziel)) return 'bereits-aktuell';
  if (istVorfahre(zustand, ziel, quelle)) return 'fast-forward';
  return 'merge-commit';
}

function naechsteId(commits: Commit[]): string {
  const nummer = commits.length + 1;
  return `c${String(nummer).padStart(2, '0')}`;
}

export function fuehreBranchBefehlAus(zustand: BranchZustand, eingabe: string): BranchErgebnis {
  const teile = eingabe.trim().split(/\s+/);
  if (teile[0] !== 'git') return UNVERAENDERT(zustand, `Kein Git-Befehl: ${eingabe.trim()}`);

  const unterbefehl = teile[1] ?? '';
  const args = teile.slice(2);
  const kopfCommit = zustand.branches[zustand.aktuellerBranch];
  if (kopfCommit === undefined) {
    return UNVERAENDERT(zustand, 'Kein aktueller Branch.');
  }

  switch (unterbefehl) {
    case 'branch': {
      const schalter = leseSchalter(args, [
        { schreibweisen: ['-a', '--all', '-l', '--list'], name: 'auflisten' },
      ]);
      if (schalter.unbekannt) {
        // `git branch -d topic` legte zuvor einen Branch AN — das Gegenteil
        // des Verlangten (Codex-Review auf PR #30).
        return UNVERAENDERT(zustand, schalterNichtUmgesetzt('git branch', schalter.unbekannt));
      }

      const auflisten = schalter.gesetzt.has('auflisten');
      const name = schalter.operanden[0];

      // Mit einem Auflisten-Schalter ist ein Operand ein Suchmuster, kein
      // neuer Branchname. `git branch -l topic` darf also nichts anlegen.
      if (auflisten || name === undefined) {
        const zeilen = Object.keys(zustand.branches)
          .sort()
          .filter((b) => name === undefined || b.includes(name))
          .map((b) => `${b === zustand.aktuellerBranch ? '*' : ' '} ${b}`);
        return UNVERAENDERT(zustand, zeilen.join('\n') || 'Kein Branch passt auf dieses Muster.');
      }

      if (zustand.branches[name] !== undefined) {
        return UNVERAENDERT(zustand, `Branch "${name}" gibt es bereits.`);
      }
      // Ein neuer Branch ist nur ein weiterer Zeiger auf denselben Commit.
      return {
        zustand: { ...zustand, branches: { ...zustand.branches, [name]: kopfCommit } },
        ausgabe: `Branch "${name}" zeigt jetzt auf ${kopfCommit}.`,
        veraendert: true,
      };
    }

    case 'switch': {
      const schalter = leseSchalter(args, [{ schreibweisen: ['-c', '--create'], name: 'anlegen' }]);
      if (schalter.unbekannt) {
        return UNVERAENDERT(zustand, schalterNichtUmgesetzt('git switch', schalter.unbekannt));
      }
      const neu = schalter.gesetzt.has('anlegen');
      const name = schalter.operanden[0];
      if (!name) return UNVERAENDERT(zustand, 'git switch: Bitte gib einen Branch an.');

      if (neu) {
        if (zustand.branches[name] !== undefined) {
          return UNVERAENDERT(zustand, `Branch "${name}" gibt es bereits.`);
        }
        return {
          zustand: {
            ...zustand,
            branches: { ...zustand.branches, [name]: kopfCommit },
            aktuellerBranch: name,
          },
          ausgabe: `Zu neuem Branch "${name}" gewechselt.`,
          veraendert: true,
        };
      }

      if (zustand.branches[name] === undefined) {
        return UNVERAENDERT(
          zustand,
          `Branch "${name}" gibt es nicht. Mit git switch -c ${name} legst du ihn an.`,
        );
      }
      return {
        zustand: { ...zustand, aktuellerBranch: name },
        ausgabe: `Zu Branch "${name}" gewechselt.`,
        veraendert: true,
      };
    }

    case 'commit': {
      const treffer = /-m\s+("([^"]*)"|'([^']*)'|(\S+))/.exec(eingabe);
      const nachricht = (treffer?.[2] ?? treffer?.[3] ?? treffer?.[4] ?? '').trim();
      if (!nachricht) {
        return UNVERAENDERT(zustand, 'git commit: Es fehlt eine Nachricht (-m "…").');
      }
      const commit: Commit = {
        id: naechsteId(zustand.commits),
        nachricht,
        eltern: [kopfCommit],
      };
      return {
        zustand: {
          ...zustand,
          commits: [...zustand.commits, commit],
          branches: { ...zustand.branches, [zustand.aktuellerBranch]: commit.id },
        },
        ausgabe: `[${zustand.aktuellerBranch} ${commit.id}] ${nachricht}`,
        veraendert: true,
      };
    }

    case 'merge': {
      // `--squash`, `--no-ff` und Verwandte ändern das Ergebnis grundlegend.
      // Sie zu übergehen hätte einen Merge-Commit angelegt, wo echtes Git
      // keinen anlegt (Codex-Review auf PR #30).
      const schalter = leseSchalter(args, []);
      if (schalter.unbekannt) {
        return UNVERAENDERT(zustand, schalterNichtUmgesetzt('git merge', schalter.unbekannt));
      }
      const name = schalter.operanden[0];
      if (!name) return UNVERAENDERT(zustand, 'git merge: Bitte gib einen Branch an.');
      const quelle = zustand.branches[name];
      if (quelle === undefined) {
        return UNVERAENDERT(zustand, `Branch "${name}" gibt es nicht.`);
      }
      if (name === zustand.aktuellerBranch) {
        return UNVERAENDERT(zustand, 'Ein Branch lässt sich nicht mit sich selbst zusammenführen.');
      }

      const art = mergeArt(zustand, kopfCommit, quelle);

      if (art === 'bereits-aktuell') {
        return UNVERAENDERT(zustand, `Bereits aktuell — "${name}" steckt schon vollständig drin.`);
      }

      if (art === 'fast-forward') {
        // Nichts zusammenzuführen: Der eigene Stand liegt vollständig in der
        // Vorgeschichte. Der Zeiger wandert einfach weiter.
        return {
          zustand: {
            ...zustand,
            branches: { ...zustand.branches, [zustand.aktuellerBranch]: quelle },
          },
          ausgabe: `Fast-Forward: "${zustand.aktuellerBranch}" zeigt jetzt auf ${quelle}. Kein neuer Commit nötig.`,
          veraendert: true,
        };
      }

      const commit: Commit = {
        id: naechsteId(zustand.commits),
        nachricht: `Merge branch '${name}' into ${zustand.aktuellerBranch}`,
        eltern: [kopfCommit, quelle],
      };
      return {
        zustand: {
          ...zustand,
          commits: [...zustand.commits, commit],
          branches: { ...zustand.branches, [zustand.aktuellerBranch]: commit.id },
        },
        ausgabe: `Merge-Commit ${commit.id} angelegt: Beide Entwicklungslinien laufen hier zusammen.`,
        veraendert: true,
      };
    }

    case 'log': {
      const erreichbar = vorfahren(zustand, kopfCommit);
      const zeilen = [...zustand.commits]
        .reverse()
        .filter((c) => erreichbar.has(c.id))
        .map((c) => `${c.id}  ${c.nachricht}`);
      return UNVERAENDERT(zustand, zeilen.join('\n') || 'Noch keine Commits.');
    }

    default:
      return UNVERAENDERT(
        zustand,
        `git ${unterbefehl}: in diesem Simulator nicht umgesetzt. Verfügbar: ${UMGESETZTE_BRANCH_BEFEHLE.join(', ')}.`,
      );
  }
}

// ---------------------------------------------------------------------------
// Darstellung des Commit-Graphen
// ---------------------------------------------------------------------------

export interface GraphKnoten {
  commit: Commit;
  /** Waagerechte Position: Abstand vom ersten Commit. */
  spalte: number;
  /** Senkrechte Position: Entwicklungslinie. */
  zeile: number;
  /** Branchnamen, die genau auf diesen Commit zeigen. */
  zeiger: string[];
}

/**
 * Ordnet die Commits für eine Darstellung an: waagerecht nach Tiefe in der
 * Vorgeschichte, senkrecht nach Entwicklungslinie. Bewusst schlicht — es geht
 * darum, Verzweigung und Zusammenführung zu sehen, nicht um ein originalgetreues
 * `git log --graph`.
 *
 * Die Zeile ergibt sich aus der Kette der ERSTEN Eltern, nicht daraus, welche
 * Branches einen Commit irgendwie erreichen können. Der Unterschied zeigt sich
 * nach einem Merge: Danach erreicht `main` auch die Commits des hereingeholten
 * Branches, und eine Zuordnung über "erreichbar von" legte alles auf eine
 * Linie — die Verzweigung wäre genau in dem Moment unsichtbar, in dem sie
 * erklärt werden soll. Über die erste Elternkette bleibt der Seitenast dort,
 * wo er entstanden ist.
 */
export function baueGraph(zustand: BranchZustand): GraphKnoten[] {
  const tiefe = new Map<string, number>();
  const berechneTiefe = (id: string): number => {
    const bekannt = tiefe.get(id);
    if (bekannt !== undefined) return bekannt;
    const commit = commitById(zustand, id);
    if (!commit || commit.eltern.length === 0) {
      tiefe.set(id, 0);
      return 0;
    }
    const wert = Math.max(...commit.eltern.map(berechneTiefe)) + 1;
    tiefe.set(id, wert);
    return wert;
  };
  for (const commit of zustand.commits) berechneTiefe(commit.id);

  // Jede Entwicklungslinie bekommt eine eigene Zeile. Die Linie von `main`
  // (bzw. dem ersten Branch) bleibt oben, damit die Darstellung ruhig bleibt.
  const branchNamen = Object.keys(zustand.branches).sort((a, b) =>
    a === 'main' ? -1 : b === 'main' ? 1 : a.localeCompare(b),
  );
  const zeileFuer = new Map<string, number>();
  branchNamen.forEach((branch, index) => {
    let aktuell = zustand.branches[branch];
    // Nur der ersten Elternkette folgen: Der zweite Elternteil eines
    // Merge-Commits gehört zum hereingeholten Ast und behält dessen Zeile.
    while (aktuell !== undefined && !zeileFuer.has(aktuell)) {
      zeileFuer.set(aktuell, index);
      aktuell = commitById(zustand, aktuell)?.eltern[0];
    }
  });

  const zeigerFuer = new Map<string, string[]>();
  for (const [branch, id] of Object.entries(zustand.branches)) {
    zeigerFuer.set(id, [...(zeigerFuer.get(id) ?? []), branch]);
  }

  return zustand.commits.map((commit) => ({
    commit,
    spalte: tiefe.get(commit.id) ?? 0,
    zeile: zeileFuer.get(commit.id) ?? 0,
    zeiger: (zeigerFuer.get(commit.id) ?? []).sort(),
  }));
}
