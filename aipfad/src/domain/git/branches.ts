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

import {
  anfuehrungNichtGeschlossen,
  fuegeAbsaetzeZusammen,
  leseSchalter,
  musterNichtUmgesetzt,
  operandenNichtUmgesetzt,
  passtAufMuster,
  schalterNichtUmgesetzt,
  schalterOhneWert,
  zerlegeBefehl,
} from './schalter';
import { eigenerEintrag } from '../eintraege';

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
  const { teile, offeneAnfuehrung } = zerlegeBefehl(eingabe);
  if (offeneAnfuehrung) return UNVERAENDERT(zustand, anfuehrungNichtGeschlossen(offeneAnfuehrung));
  if (teile[0] !== 'git') return UNVERAENDERT(zustand, `Kein Git-Befehl: ${eingabe.trim()}`);

  const unterbefehl = teile[1] ?? '';
  const args = teile.slice(2);
  const kopfCommit = eigenerEintrag(zustand.branches, zustand.aktuellerBranch);
  if (kopfCommit === undefined) {
    return UNVERAENDERT(zustand, 'Kein aktueller Branch.');
  }

  switch (unterbefehl) {
    case 'branch': {
      // `-a` und `-l` sind NICHT dasselbe: `-l` nimmt Suchmuster entgegen,
      // `-a` nimmt gar keinen Operanden. Unter einem gemeinsamen Namen
      // gelesen wurde `git branch -a feature` zu einer gefilterten Liste,
      // statt abgelehnt zu werden (Codex-Review auf PR #30).
      const schalter = leseSchalter(args, [
        { schreibweisen: ['-a', '--all'], name: 'alle' },
        { schreibweisen: ['-l', '--list'], name: 'auflisten' },
      ]);
      if (schalter.unbekannt) {
        // `git branch -d topic` legte zuvor einen Branch AN — das Gegenteil
        // des Verlangten (Codex-Review auf PR #30).
        return UNVERAENDERT(zustand, schalterNichtUmgesetzt('git branch', schalter.unbekannt));
      }

      const alle = schalter.gesetzt.has('alle');
      const auflisten = schalter.gesetzt.has('auflisten');
      const name = schalter.operanden[0];
      const muster = schalter.operanden;

      if (alle && !auflisten && muster.length > 0) {
        return UNVERAENDERT(
          zustand,
          "fatal: the -a, and -r, options to 'git branch' do not take a branch name",
        );
      }

      // Mit einem Auflisten-Schalter ist ein Operand ein Suchmuster, kein
      // neuer Branchname. `git branch -l topic` darf also nichts anlegen.
      if (alle || auflisten || name === undefined) {
        const unbekanntesMuster = muster.find(musterNichtUmgesetzt);
        if (unbekanntesMuster !== undefined) {
          return UNVERAENDERT(
            zustand,
            `git branch: Zeichenklassen im Muster ("${unbekanntesMuster}") sind in diesem Simulator nicht umgesetzt. Umgesetzt sind * und ?.`,
          );
        }
        // Jedes angegebene Muster zählt, nicht nur das erste — und es wird
        // wie ein Git-Muster gelesen, nicht als Teilzeichenkette.
        const zeilen = Object.keys(zustand.branches)
          .sort()
          .filter((b) => muster.length === 0 || muster.some((m) => passtAufMuster(b, m)))
          .map((b) => `${b === zustand.aktuellerBranch ? '*' : ' '} ${b}`);
        return UNVERAENDERT(zustand, zeilen.join('\n') || 'Kein Branch passt auf dieses Muster.');
      }

      if (eigenerEintrag(zustand.branches, name) !== undefined) {
        return UNVERAENDERT(zustand, `Branch "${name}" gibt es bereits.`);
      }
      const namensfehler = branchnameFehler(name);
      if (namensfehler) return UNVERAENDERT(zustand, namensfehler);

      // `git branch <name> <startpunkt>` legt den Zeiger dort an, nicht am
      // aktuellen Stand. Den zweiten Operanden zu übergehen hätte einen
      // Branch an einer anderen Stelle angelegt als verlangt — und
      // ausgerechnet hier ist der Zeiger die ganze Lehre
      // (Codex-Review auf PR #30).
      if (schalter.operanden.length > 2) {
        return UNVERAENDERT(zustand, 'fatal: too many arguments');
      }
      const startpunkt = schalter.operanden[1];
      let ziel = kopfCommit;
      if (startpunkt !== undefined) {
        const ausBranch = eigenerEintrag(zustand.branches, startpunkt);
        const ausCommit = zustand.commits.find((c) => c.id === startpunkt)?.id;
        const aufgeloest = ausBranch ?? ausCommit;
        if (aufgeloest === undefined) {
          return UNVERAENDERT(zustand, `fatal: not a valid object name: '${startpunkt}'`);
        }
        ziel = aufgeloest;
      }

      // Ein neuer Branch ist nur ein weiterer Zeiger auf einen Commit.
      return {
        zustand: { ...zustand, branches: { ...zustand.branches, [name]: ziel } },
        ausgabe: `Branch "${name}" zeigt jetzt auf ${ziel}.`,
        veraendert: true,
      };
    }

    case 'switch': {
      // `-c` trägt den neuen Branchnamen bei sich: `git switch -c neu`.
      // Als reiner Ja/Nein-Schalter gelesen hätte `git switch topic -c` den
      // vorangehenden Operanden als Namen genommen und `topic` angelegt —
      // echtes Git verlangt den Namen NACH dem Schalter
      // (Codex-Review auf PR #30).
      const schalter = leseSchalter(args, [
        { schreibweisen: ['-c', '--create'], name: 'anlegen', brauchtWert: true },
      ]);
      if (schalter.unbekannt) {
        return UNVERAENDERT(zustand, schalterNichtUmgesetzt('git switch', schalter.unbekannt));
      }
      if (schalter.ohneWert) {
        return UNVERAENDERT(zustand, schalterOhneWert(schalter.ohneWert));
      }
      const neu = schalter.gesetzt.has('anlegen');
      // Ein Branch auf einmal. Weitere Operanden still fallen zu lassen wäre
      // dieselbe Falle wie beim Merge mit mehreren Köpfen.
      const uebrig = neu ? schalter.operanden.length : schalter.operanden.length - 1;
      if (uebrig > 0) {
        return UNVERAENDERT(zustand, 'fatal: only one reference expected');
      }
      // Mehrfaches `-c`: Der letzte gewinnt, wie in echtem Git.
      const name = neu ? schalter.werte.get('anlegen')?.at(-1) : schalter.operanden[0];
      if (!name) return UNVERAENDERT(zustand, 'git switch: Bitte gib einen Branch an.');

      if (neu) {
        if (eigenerEintrag(zustand.branches, name) !== undefined) {
          return UNVERAENDERT(zustand, `Branch "${name}" gibt es bereits.`);
        }
        const fehler = branchnameFehler(name);
        if (fehler) return UNVERAENDERT(zustand, fehler);
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

      if (eigenerEintrag(zustand.branches, name) === undefined) {
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
      const schalter = leseSchalter(args, [
        { schreibweisen: ['-m', '--message'], name: 'nachricht', brauchtWert: true },
      ]);
      if (schalter.unbekannt) {
        // `--amend` schriebe den letzten Commit um, statt einen neuen
        // anzulegen (Codex-Review auf PR #30).
        return UNVERAENDERT(zustand, schalterNichtUmgesetzt('git commit', schalter.unbekannt));
      }
      if (schalter.ohneWert) {
        return UNVERAENDERT(zustand, schalterOhneWert(schalter.ohneWert));
      }
      if (schalter.operanden.length > 0) {
        return UNVERAENDERT(
          zustand,
          `git commit: Ein Commit einzelner Pfade ("${schalter.operanden.join(' ')}") ist in diesem Simulator nicht umgesetzt.`,
        );
      }
      const nachricht = fuegeAbsaetzeZusammen(schalter.werte.get('nachricht'));
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
      // Echtes Git nimmt mehrere Köpfe entgegen und führt sie ALLE zusammen
      // (ein Octopus-Merge). Dieses Modell kennt nur zwei Eltern. Den Rest
      // still fallen zu lassen hätte einen erfolgreichen Merge gemeldet, in
      // dem der zweite Branch gar nicht steckt (Codex-Review auf PR #30).
      if (schalter.operanden.length > 1) {
        return UNVERAENDERT(
          zustand,
          'git merge: Mehrere Branches auf einmal (ein Octopus-Merge) sind in diesem Simulator nicht umgesetzt. Führe sie nacheinander zusammen.',
        );
      }
      const quelle = eigenerEintrag(zustand.branches, name);
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
      const schalter = leseSchalter(args, []);
      if (schalter.unbekannt) {
        return UNVERAENDERT(zustand, schalterNichtUmgesetzt('git log', schalter.unbekannt));
      }
      if (schalter.operanden.length > 0) {
        return UNVERAENDERT(zustand, operandenNichtUmgesetzt('git log', schalter.operanden));
      }
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

/**
 * Prüft einen Branchnamen nach den Regeln von `git check-ref-format`.
 *
 * Ohne diese Prüfung entstanden Branches, die echtes Git ablehnt — mit
 * Leerzeichen, mit `..`, mit einem Stern. Danach ließ sich auf ihnen
 * wechseln und committen, und wer das im Lab lernt, lernt etwas, das
 * draußen scheitert (Codex-Review auf PR #30).
 *
 * Umgesetzt sind die Regeln, die hier auffallen können; die vollständige
 * Liste ist länger und für ein Lab ohne Belang.
 */
function branchnameFehler(name: string): string | null {
  const verboten = /[\s~^:?*[\\]/;
  const bestandteile = name.split('/');

  const ungueltig =
    name.length === 0 ||
    // Zwei Regeln gelten für den GANZEN Namen und ausdrücklich nicht je
    // Bestandteil — sie stammen aus der Kurzform, mit der man einen Branch
    // benennt, nicht aus der Prüfung einer vollständigen Ref:
    //
    //   `-topic`  abgelehnt, `feature/-topic` angelegt
    //   `HEAD`    abgelehnt, `feature/HEAD` und `HEAD/x` angelegt
    //
    // `refs/heads/HEAD` besteht `git check-ref-format` sogar; verboten ist
    // allein die Kurzform, weil `HEAD` dort schon den aktuellen Commit
    // meint. Beide je Bestandteil zu ziehen wäre die Übertreibung der
    // Lehre aus den Runden davor (Codex-Review auf PR #30).
    name.startsWith('-') ||
    name === 'HEAD' ||
    verboten.test(name) ||
    name.includes('..') ||
    name.includes('@{') ||
    name.endsWith('.lock') ||
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u001f\u007f]/.test(name) ||
    // Die Regeln zu Punkt und `.lock` gelten für JEDEN durch Schrägstrich
    // getrennten Bestandteil, nicht nur für den ganzen Namen: `feature/.preise`
    // und `feature.lock/preise` lehnt echtes Git ebenso ab
    // (Codex-Review auf PR #30). Ein leerer Bestandteil deckt zugleich
    // führende, abschließende und doppelte Schrägstriche ab.
    bestandteile.some(
      (teil) =>
        teil.length === 0 || teil.startsWith('.') || teil.endsWith('.') || teil.endsWith('.lock'),
    );

  return ungueltig
    ? `fatal: '${name}' is not a valid branch name. Erlaubt sind keine Leerzeichen und keine der Zeichen ~ ^ : ? * [ \\ sowie kein ".." im Namen; kein Namensteil darf mit einem Punkt beginnen oder enden oder auf ".lock" enden; der Name selbst darf nicht mit einem Bindestrich beginnen und nicht "HEAD" lauten.`
    : null;
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
  // `unterwegs` bricht Zyklen ab. Ohne das rief sich die Tiefenberechnung bei
  // einem Commit, der sich selbst (oder über einen zweiten Commit) als
  // Elternteil nennt, endlos auf und riss mit einem Stapelüberlauf die ganze
  // Seite mit — der Graph kommt auch aus Lab-Konfigurationen, und deren
  // `config` ist nicht typisiert (Codex-Review auf PR #30).
  //
  // Die Inhaltsprüfung lehnt solche Graphen zusätzlich ab; hier steht die
  // Absicherung für den Fall, dass doch einer durchkommt. Ein Zyklus hat
  // keine sinnvolle Tiefe — 0 ist die ruhigste Antwort, die nichts erfindet.
  const unterwegs = new Set<string>();
  const berechneTiefe = (id: string): number => {
    const bekannt = tiefe.get(id);
    if (bekannt !== undefined) return bekannt;
    if (unterwegs.has(id)) return 0;

    const commit = commitById(zustand, id);
    if (!commit || commit.eltern.length === 0) {
      tiefe.set(id, 0);
      return 0;
    }
    unterwegs.add(id);
    const wert = Math.max(...commit.eltern.map(berechneTiefe)) + 1;
    unterwegs.delete(id);
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
    let aktuell = eigenerEintrag(zustand.branches, branch);
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
