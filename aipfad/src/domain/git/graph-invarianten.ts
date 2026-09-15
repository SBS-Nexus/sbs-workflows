import { eigenerEintrag } from '@/domain/eintraege';

/**
 * Die Beziehungsregeln eines Commit-Graphen — an einer Stelle.
 *
 * Dieselben Regeln gelten für zwei Dinge, die dasselbe Modell beschreiben:
 * die `branchGraph`-Ansicht einer Aufgabe und die Konfiguration des
 * Branch-Labs. Sie zweimal zu pflegen hieße, sie auseinanderlaufen zu lassen
 * — das Lab hatte deshalb gar keine (Codex-Review auf PR #30).
 */

export interface GraphBefund {
  /** Wohin die Meldung im Payload gehört. */
  pfad: (string | number)[];
  meldung: string;
}

export interface CommitGraphEingabe {
  commits: { id: string; eltern: string[] }[];
  /** Branchname -> Commit-Kennung. */
  branches: Record<string, string>;
  aktuellerBranch: string;
}

/**
 * Prüft die Beziehungen eines Commit-Graphen und liefert die Befunde.
 *
 * Bewusst als Liste statt als Wurf: Die Aufrufer sind Zod-Verfeinerungen,
 * die jeden Befund an seiner eigenen Stelle melden wollen.
 */
export function pruefeCommitGraph(eingabe: CommitGraphEingabe): GraphBefund[] {
  const befunde: GraphBefund[] = [];
  const bekannt = new Set<string>();

  // --- Eindeutige Kennungen ------------------------------------------------
  for (const [i, commit] of eingabe.commits.entries()) {
    if (bekannt.has(commit.id)) {
      befunde.push({
        pfad: ['commits', i, 'id'],
        meldung: `Doppelte Commit-Kennung "${commit.id}".`,
      });
    }
    bekannt.add(commit.id);
  }

  // --- Eltern müssen existieren -------------------------------------------
  for (const [i, commit] of eingabe.commits.entries()) {
    for (const elternteil of commit.eltern) {
      if (!bekannt.has(elternteil)) {
        befunde.push({
          pfad: ['commits', i, 'eltern'],
          meldung: `Elternteil "${elternteil}" ist kein Commit dieser Ansicht.`,
        });
      }
    }
  }

  // --- Keine Zyklen --------------------------------------------------------
  // Ein Commit, der sich selbst als Vorfahr nennt, ließ die Tiefenberechnung
  // in `baueGraph()` endlos laufen und riss die Seite mit einem
  // Stapelüberlauf ab. Ein Zyklus ist ohnehin kein Commit-Graph: Vorher
  // heißt vorher.
  const eltern = new Map(eingabe.commits.map((commit) => [commit.id, commit.eltern]));
  const besucht = new Map<string, 'laeuft' | 'fertig'>();
  const findeZyklus = (id: string): string | null => {
    if (besucht.get(id) === 'laeuft') return id;
    if (besucht.get(id) === 'fertig') return null;
    besucht.set(id, 'laeuft');
    for (const elternteil of eltern.get(id) ?? []) {
      const treffer = findeZyklus(elternteil);
      if (treffer) return treffer;
    }
    besucht.set(id, 'fertig');
    return null;
  };
  for (const commit of eingabe.commits) {
    const treffer = findeZyklus(commit.id);
    if (treffer) {
      befunde.push({
        pfad: ['commits'],
        meldung: `Zyklische Vorgeschichte bei Commit "${treffer}".`,
      });
      break;
    }
  }

  // --- Branchzeiger müssen auf Commits zeigen ------------------------------
  for (const [branch, id] of Object.entries(eingabe.branches)) {
    if (!bekannt.has(id)) {
      befunde.push({
        pfad: ['branches', branch],
        meldung: `Branch "${branch}" zeigt auf "${id}" — das ist kein Commit dieser Ansicht.`,
      });
    }
  }

  // --- HEAD steht auf einem Branch, den es gibt ----------------------------
  // Gefragt wird nach einem EIGENEN Schlüssel: `aktuellerBranch: 'toString'`
  // fände sonst die geerbte Eigenschaft und gälte als vorhanden. Ein
  // tatsächlich angelegter Branch dieses Namens bleibt erlaubt.
  if (eigenerEintrag(eingabe.branches, eingabe.aktuellerBranch) === undefined) {
    befunde.push({
      pfad: ['aktuellerBranch'],
      meldung: `Aktueller Branch "${eingabe.aktuellerBranch}" steht nicht in branches.`,
    });
  }

  return befunde;
}
