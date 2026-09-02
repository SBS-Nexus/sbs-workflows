/**
 * Deterministischer Git-Simulator für Arbeitsverzeichnis, Staging Area und
 * Commits.
 *
 * Wie der Terminal-Simulator eine reine Funktion: keine echte Shell, kein
 * `child_process`, kein Zugriff auf ein Dateisystem, kein echtes Git. Alles
 * spielt sich im übergebenen Zustand ab (siehe docs/CONTENT-POLICY.md).
 *
 * Das Modell bildet die drei Orte ab, um die es in Git wirklich geht — und
 * genau daran scheitert das Verständnis am häufigsten:
 *
 *   Arbeitsverzeichnis   was du gerade bearbeitest
 *   Staging Area         was beim nächsten Commit mitkommt
 *   Repository           was bereits festgehalten ist
 *
 * Jede Datei wird deshalb mit bis zu drei Fassungen geführt. Der Status ist
 * kein gespeichertes Feld, sondern ergibt sich aus dem Vergleich dieser
 * Fassungen — so wie `git status` ihn auch berechnet, statt ihn abzulesen.
 */

/** Eine Datei in bis zu drei Fassungen. `undefined` heißt: dort nicht vorhanden. */
export interface GitDatei {
  pfad: string;
  /** Fassung im Arbeitsverzeichnis. `undefined` = im Arbeitsbaum gelöscht. */
  arbeitsbaum?: string;
  /** Fassung in der Staging Area. */
  index?: string;
  /** Fassung im letzten Commit (HEAD). */
  head?: string;
}

export interface GitCommit {
  id: string;
  nachricht: string;
  /** Vollständiger Dateistand dieses Commits. */
  stand: Record<string, string>;
}

export interface GitArbeitsbaumZustand {
  dateien: GitDatei[];
  commits: GitCommit[];
}

/**
 * Die vier Zustände, um die es beim Einstieg geht.
 *
 * `committed` heißt hier: in allen drei Orten identisch, also nichts zu tun —
 * das, was `git status` als "nothing to commit, working tree clean" meldet.
 */
export type DateiStatus = 'untracked' | 'modified' | 'staged' | 'committed';

export interface StatusEintrag {
  pfad: string;
  status: DateiStatus;
  /**
   * Zusätzlich zu einer bereits gestagten Änderung liegt im Arbeitsbaum eine
   * weitere, noch nicht gestagte. Genau dieser Fall führt zu der Überraschung
   * "ich habe doch `git add` gemacht" — `git status` führt die Datei dann in
   * BEIDEN Abschnitten auf.
   */
  auchUngestagt: boolean;
  /** Im Arbeitsbaum gelöscht. */
  geloescht: boolean;
}

function istBekannt(datei: GitDatei): boolean {
  return datei.index !== undefined || datei.head !== undefined;
}

/** Berechnet den Status einer Datei aus dem Vergleich ihrer drei Fassungen. */
export function dateiStatus(datei: GitDatei): StatusEintrag {
  const imIndexGeaendert = datei.index !== datei.head;
  const imArbeitsbaumGeaendert = datei.arbeitsbaum !== (datei.index ?? datei.head);

  if (!istBekannt(datei)) {
    return {
      pfad: datei.pfad,
      status: 'untracked',
      auchUngestagt: false,
      geloescht: false,
    };
  }

  const geloescht = datei.arbeitsbaum === undefined;

  if (imIndexGeaendert) {
    return {
      pfad: datei.pfad,
      status: 'staged',
      auchUngestagt: imArbeitsbaumGeaendert,
      geloescht,
    };
  }

  if (imArbeitsbaumGeaendert) {
    return { pfad: datei.pfad, status: 'modified', auchUngestagt: true, geloescht };
  }

  return { pfad: datei.pfad, status: 'committed', auchUngestagt: false, geloescht };
}

export function status(zustand: GitArbeitsbaumZustand): StatusEintrag[] {
  return zustand.dateien.map(dateiStatus).sort((a, b) => a.pfad.localeCompare(b.pfad, 'de'));
}

export interface GitErgebnis {
  zustand: GitArbeitsbaumZustand;
  ausgabe: string;
  /** Für die Oberfläche: der Befehl hat den Zustand verändert. */
  veraendert: boolean;
}

const KEINE_AENDERUNG = (zustand: GitArbeitsbaumZustand, ausgabe: string): GitErgebnis => ({
  zustand,
  ausgabe,
  veraendert: false,
});

/** Die Befehle, die dieser Simulator ausführt. */
export const UMGESETZTE_GIT_BEFEHLE = [
  'git status',
  'git add',
  'git commit',
  'git diff',
  'git log',
  'git restore',
] as const;

function formatiereStatus(eintraege: StatusEintrag[]): string {
  const gestagt = eintraege.filter((e) => e.status === 'staged');
  const geaendert = eintraege.filter((e) => e.status === 'modified' || e.auchUngestagt);
  const unversioniert = eintraege.filter((e) => e.status === 'untracked');

  if (gestagt.length === 0 && geaendert.length === 0 && unversioniert.length === 0) {
    return 'Nichts zu committen, Arbeitsverzeichnis unverändert.';
  }

  const teile: string[] = [];
  if (gestagt.length > 0) {
    teile.push(
      [
        'Zum Commit vorgemerkt:',
        ...gestagt.map((e) => `  ${e.geloescht ? 'gelöscht' : 'geändert'}:   ${e.pfad}`),
      ].join('\n'),
    );
  }
  if (geaendert.length > 0) {
    teile.push(
      [
        'Änderungen, die NICHT zum Commit vorgemerkt sind:',
        ...geaendert.map((e) => `  ${e.geloescht ? 'gelöscht' : 'geändert'}:   ${e.pfad}`),
      ].join('\n'),
    );
  }
  if (unversioniert.length > 0) {
    teile.push(['Unversionierte Dateien:', ...unversioniert.map((e) => `  ${e.pfad}`)].join('\n'));
  }
  return teile.join('\n\n');
}

function zeilenDiff(vorher: string | undefined, nachher: string | undefined): string[] {
  const alt = (vorher ?? '').split('\n');
  const neu = (nachher ?? '').split('\n');
  const zeilen: string[] = [];
  const laenge = Math.max(alt.length, neu.length);
  for (let i = 0; i < laenge; i += 1) {
    const a = alt[i];
    const n = neu[i];
    if (a === n) {
      if (a !== undefined) zeilen.push(` ${a}`);
      continue;
    }
    if (a !== undefined && a !== '') zeilen.push(`-${a}`);
    if (n !== undefined && n !== '') zeilen.push(`+${n}`);
  }
  return zeilen;
}

/**
 * Führt einen Git-Befehl aus.
 *
 * Bewusst eng: Nur die Befehle, um die es beim Aufbau des mentalen Modells
 * geht. Ein unbekannter Befehl wird deutlich abgelehnt, statt still nichts zu
 * tun — dieselbe Regel wie im Terminal-Simulator.
 */
export function fuehreGitBefehlAus(zustand: GitArbeitsbaumZustand, eingabe: string): GitErgebnis {
  const teile = eingabe.trim().split(/\s+/);
  if (teile[0] !== 'git') {
    return KEINE_AENDERUNG(zustand, `Kein Git-Befehl: ${eingabe.trim()}`);
  }

  const unterbefehl = teile[1] ?? '';
  const args = teile.slice(2);
  const dateien = zustand.dateien.map((d) => ({ ...d }));

  switch (unterbefehl) {
    case 'status':
      return KEINE_AENDERUNG(zustand, formatiereStatus(status(zustand)));

    case 'add': {
      if (args.length === 0) {
        return KEINE_AENDERUNG(zustand, 'git add: Bitte gib an, was vorgemerkt werden soll.');
      }
      const alles = args.includes('.') || args.includes('-A') || args.includes('--all');
      const betroffen = alles ? dateien : dateien.filter((d) => args.includes(d.pfad));

      if (betroffen.length === 0) {
        return KEINE_AENDERUNG(zustand, `git add: Nicht gefunden: ${args.join(' ')}`);
      }
      for (const datei of betroffen) datei.index = datei.arbeitsbaum;
      return {
        zustand: { ...zustand, dateien },
        ausgabe: '',
        veraendert: true,
      };
    }

    case 'commit': {
      const nachricht = leseNachricht(eingabe);
      if (!nachricht) {
        return KEINE_AENDERUNG(
          zustand,
          'git commit: Es fehlt eine Nachricht. Beispiel: git commit -m "Was und warum"',
        );
      }
      const vorgemerkt = dateien.filter((d) => d.index !== d.head);
      if (vorgemerkt.length === 0) {
        return KEINE_AENDERUNG(
          zustand,
          'Nichts zum Committen vorgemerkt. Erst git add, dann git commit.',
        );
      }

      const stand: Record<string, string> = {};
      for (const datei of dateien) {
        datei.head = datei.index;
        if (datei.index !== undefined) stand[datei.pfad] = datei.index;
      }
      const commit: GitCommit = {
        id: naechsteCommitId(zustand.commits),
        nachricht,
        stand,
      };
      return {
        zustand: { dateien, commits: [...zustand.commits, commit] },
        ausgabe: `[main ${commit.id}] ${nachricht}\n ${vorgemerkt.length} Datei(en) geändert`,
        veraendert: true,
      };
    }

    case 'diff': {
      // Ohne Zusatz zeigt `git diff` die NICHT vorgemerkten Änderungen —
      // genau der Punkt, an dem viele "aber ich habe doch etwas geändert"
      // denken, nachdem sie bereits `git add` ausgeführt haben.
      const gestagt = args.includes('--staged') || args.includes('--cached');
      const bloecke: string[] = [];
      for (const datei of dateien) {
        const vorher = gestagt ? datei.head : (datei.index ?? datei.head);
        const nachher = gestagt ? datei.index : datei.arbeitsbaum;
        if (vorher === nachher) continue;
        if (!gestagt && !istBekannt(datei)) continue;
        const zeilen = zeilenDiff(vorher, nachher);
        if (zeilen.length === 0) continue;
        bloecke.push([`--- a/${datei.pfad}`, `+++ b/${datei.pfad}`, ...zeilen].join('\n'));
      }
      return KEINE_AENDERUNG(
        zustand,
        bloecke.length > 0
          ? bloecke.join('\n\n')
          : gestagt
            ? 'Keine vorgemerkten Änderungen.'
            : 'Keine ungemerkten Änderungen.',
      );
    }

    case 'log': {
      if (zustand.commits.length === 0) {
        return KEINE_AENDERUNG(zustand, 'Noch keine Commits.');
      }
      const zeilen = [...zustand.commits].reverse().map((c) => `${c.id}  ${c.nachricht}`);
      return KEINE_AENDERUNG(zustand, zeilen.join('\n'));
    }

    case 'restore': {
      if (args.length === 0) {
        return KEINE_AENDERUNG(zustand, 'git restore: Bitte gib eine Datei an.');
      }
      const ausIndex = args.includes('--staged');
      const pfade = args.filter((a) => !a.startsWith('-'));
      const betroffen = dateien.filter((d) => pfade.includes(d.pfad));
      if (betroffen.length === 0) {
        return KEINE_AENDERUNG(zustand, `git restore: Nicht gefunden: ${pfade.join(' ')}`);
      }
      for (const datei of betroffen) {
        if (ausIndex) datei.index = datei.head;
        else datei.arbeitsbaum = datei.index ?? datei.head;
      }
      return {
        zustand: { ...zustand, dateien },
        ausgabe: ausIndex
          ? 'Vormerkung zurückgenommen. Die Änderung bleibt im Arbeitsverzeichnis erhalten.'
          : 'Arbeitsverzeichnis zurückgesetzt. Diese Änderung ist weg.',
        veraendert: true,
      };
    }

    default:
      return KEINE_AENDERUNG(
        zustand,
        `git ${unterbefehl}: in diesem Simulator nicht umgesetzt. Verfügbar: ${UMGESETZTE_GIT_BEFEHLE.join(', ')}.`,
      );
  }
}

/** Liest die Nachricht aus `-m "…"` bzw. `-m '…'`. */
function leseNachricht(eingabe: string): string | null {
  const treffer = /-m\s+("([^"]*)"|'([^']*)'|(\S+))/.exec(eingabe);
  if (!treffer) return null;
  const wert = treffer[2] ?? treffer[3] ?? treffer[4] ?? '';
  return wert.trim().length > 0 ? wert.trim() : null;
}

function naechsteCommitId(commits: GitCommit[]): string {
  // Kurze, stabile Kennungen statt echter Hashes: Sie sollen wiedererkennbar
  // sein, nicht echt aussehen.
  const nummer = commits.length + 1;
  return `c${String(nummer).padStart(2, '0')}`;
}

/** Bearbeitet eine Datei im Arbeitsverzeichnis (die Rolle des Editors). */
export function bearbeiteDatei(
  zustand: GitArbeitsbaumZustand,
  pfad: string,
  inhalt: string,
): GitArbeitsbaumZustand {
  const vorhanden = zustand.dateien.some((d) => d.pfad === pfad);
  const dateien = vorhanden
    ? zustand.dateien.map((d) => (d.pfad === pfad ? { ...d, arbeitsbaum: inhalt } : d))
    : [...zustand.dateien, { pfad, arbeitsbaum: inhalt }];
  return { ...zustand, dateien };
}
