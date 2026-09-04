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

import {
  anfuehrungNichtGeschlossen,
  fuegeAbsaetzeZusammen,
  leseSchalter,
  operandenNichtUmgesetzt,
  schalterNichtUmgesetzt,
  schalterOhneWert,
  zerlegeBefehl,
} from './schalter';

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
  const { teile, offeneAnfuehrung } = zerlegeBefehl(eingabe);
  if (offeneAnfuehrung) {
    return KEINE_AENDERUNG(zustand, anfuehrungNichtGeschlossen(offeneAnfuehrung));
  }
  if (teile[0] !== 'git') {
    return KEINE_AENDERUNG(zustand, `Kein Git-Befehl: ${eingabe.trim()}`);
  }

  const unterbefehl = teile[1] ?? '';
  const args = teile.slice(2);
  const dateien = zustand.dateien.map((d) => ({ ...d }));

  switch (unterbefehl) {
    case 'status': {
      const schalter = leseSchalter(args, []);
      if (schalter.unbekannt) {
        return KEINE_AENDERUNG(zustand, schalterNichtUmgesetzt('git status', schalter.unbekannt));
      }
      if (schalter.operanden.length > 0) {
        return KEINE_AENDERUNG(zustand, operandenNichtUmgesetzt('git status', schalter.operanden));
      }
      return KEINE_AENDERUNG(zustand, formatiereStatus(status(zustand)));
    }

    case 'add': {
      const schalter = leseSchalter(args, [{ schreibweisen: ['-A', '--all'], name: 'alle' }]);
      if (schalter.unbekannt) {
        return KEINE_AENDERUNG(zustand, schalterNichtUmgesetzt('git add', schalter.unbekannt));
      }
      if (schalter.operanden.length === 0 && !schalter.gesetzt.has('alle')) {
        return KEINE_AENDERUNG(zustand, 'git add: Bitte gib an, was vorgemerkt werden soll.');
      }

      // JEDER angegebene Pfad muss existieren, bevor irgendetwas vorgemerkt
      // wird — auch neben einem `.` oder `-A`. Zuvor genügte ein Treffer, und
      // `git add . fehlt.txt` verschwieg den Tippfehler. Echtes Git bricht ab
      // und merkt nichts vor (Codex-Review auf PR #30).
      const bekannt = new Set(dateien.map((d) => d.pfad));
      const fehlend = schalter.operanden.filter((pf) => pf !== '.' && !bekannt.has(pf));
      if (fehlend.length > 0) {
        return KEINE_AENDERUNG(zustand, `fatal: pathspec '${fehlend[0]}' did not match any files`);
      }

      // Pfadangaben ergänzen einander. `.` ist selbst eine Pfadangabe für
      // alles und behält diese Bedeutung auch, wenn ein weiterer Pfad
      // danebensteht: `git add . preise.md` merkt beides vor. `-A` dagegen
      // ist ein Schalter und wird von einer Pfadangabe begrenzt —
      // `git add -A unterordner` betrifft nur diesen Pfad
      // (Codex-Review auf PR #30).
      const ausdrueckliche = schalter.operanden.filter((pf) => pf !== '.');
      const alles =
        schalter.operanden.includes('.') ||
        (schalter.gesetzt.has('alle') && ausdrueckliche.length === 0);
      const betroffen = alles ? dateien : dateien.filter((d) => ausdrueckliche.includes(d.pfad));

      for (const datei of betroffen) datei.index = datei.arbeitsbaum;
      return { zustand: { ...zustand, dateien }, ausgabe: '', veraendert: true };
    }

    case 'commit': {
      const schalter = leseSchalter(args, [
        { schreibweisen: ['-m', '--message'], name: 'nachricht', brauchtWert: true },
      ]);
      if (schalter.unbekannt) {
        // Besonders `--amend` ist heikel: Es schreibt den letzten Commit um,
        // statt einen neuen anzulegen (Codex-Review auf PR #30).
        return KEINE_AENDERUNG(zustand, schalterNichtUmgesetzt('git commit', schalter.unbekannt));
      }
      if (schalter.ohneWert) {
        return KEINE_AENDERUNG(zustand, schalterOhneWert(schalter.ohneWert));
      }
      // `git commit -m "…" datei.md` committet in echtem Git NUR diese Datei
      // und lässt den Rest vorgemerkt. Dieser Simulator kennt nur den
      // Commit über alles Vorgemerkte — die Angabe zu ignorieren hätte
      // etwas anderes committet als verlangt (Codex-Review auf PR #30).
      if (schalter.operanden.length > 0) {
        return KEINE_AENDERUNG(
          zustand,
          `git commit: Ein Commit einzelner Pfade ("${schalter.operanden.join(' ')}") ist in diesem Simulator nicht umgesetzt. git commit nimmt hier alles Vorgemerkte.`,
        );
      }
      const nachricht = fuegeAbsaetzeZusammen(schalter.werte.get('nachricht')) || null;
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
      const schalter = leseSchalter(args, [
        { schreibweisen: ['--staged', '--cached'], name: 'staged' },
      ]);
      if (schalter.unbekannt) {
        return KEINE_AENDERUNG(zustand, schalterNichtUmgesetzt('git diff', schalter.unbekannt));
      }
      if (schalter.operanden.length > 0) {
        return KEINE_AENDERUNG(zustand, operandenNichtUmgesetzt('git diff', schalter.operanden));
      }
      // Ohne Zusatz zeigt `git diff` die NICHT vorgemerkten Änderungen —
      // genau der Punkt, an dem viele "aber ich habe doch etwas geändert"
      // denken, nachdem sie bereits `git add` ausgeführt haben.
      const gestagt = schalter.gesetzt.has('staged');
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
      const schalter = leseSchalter(args, []);
      if (schalter.unbekannt) {
        return KEINE_AENDERUNG(zustand, schalterNichtUmgesetzt('git log', schalter.unbekannt));
      }
      if (schalter.operanden.length > 0) {
        return KEINE_AENDERUNG(zustand, operandenNichtUmgesetzt('git log', schalter.operanden));
      }
      if (zustand.commits.length === 0) {
        return KEINE_AENDERUNG(zustand, 'Noch keine Commits.');
      }
      const zeilen = [...zustand.commits].reverse().map((c) => `${c.id}  ${c.nachricht}`);
      return KEINE_AENDERUNG(zustand, zeilen.join('\n'));
    }

    case 'restore': {
      const schalter = leseSchalter(args, [
        // `-S` ist die Kurzform von `--staged`. Sie zu übersehen war
        // besonders heikel: Der Befehl verwarf dann die Arbeit im
        // Arbeitsverzeichnis, statt die Vormerkung zurückzunehmen
        // (Codex-Review auf PR #30).
        { schreibweisen: ['-S', '--staged'], name: 'staged' },
      ]);
      if (schalter.unbekannt) {
        return KEINE_AENDERUNG(zustand, schalterNichtUmgesetzt('git restore', schalter.unbekannt));
      }
      if (schalter.operanden.length === 0) {
        return KEINE_AENDERUNG(zustand, 'git restore: Bitte gib eine Datei an.');
      }

      const ausIndex = schalter.gesetzt.has('staged');
      // `.` wählt wie bei `git add` alle versionierten Pfade aus. Es als
      // Dateinamen zu lesen ließ `git restore .` wirkungslos verpuffen
      // (Codex-Review auf PR #30).
      const allePfade = schalter.operanden.includes('.');
      const ausdrueckliche = schalter.operanden.filter((pf) => pf !== '.');

      // JEDER ausdrücklich genannte Pfad wird geprüft — auch neben einem
      // Punkt. Sonst schluckte `git restore . tippfehler.txt` die falsche
      // Angabe, setzte alles andere zurück und meldete Erfolg
      // (Codex-Review auf PR #30).
      //
      // Eine unversionierte Datei kennt Git nicht: Es gibt keinen Stand, auf
      // den zurückgesetzt werden könnte. Ohne diese Prüfung setzte die
      // Schleife unten den Inhalt auf `undefined` und LÖSCHTE die Datei,
      // während sie Erfolg meldete.
      for (const pfad of ausdrueckliche) {
        const datei = dateien.find((d) => d.pfad === pfad);
        if (datei === undefined || !istBekannt(datei)) {
          return KEINE_AENDERUNG(
            zustand,
            `error: pathspec '${pfad}' did not match any file(s) known to git`,
          );
        }
      }

      // Bei `.` sind das alle VERSIONIERTEN Dateien — unversionierte rührt
      // git restore auch dann nicht an, sonst wäre `.` ein Löschbefehl.
      const betroffen = allePfade
        ? dateien.filter(istBekannt)
        : dateien.filter((d) => ausdrueckliche.includes(d.pfad));

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
