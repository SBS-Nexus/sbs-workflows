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
  /** Im Arbeitsbaum gelöscht — gehört zum Vergleich INDEX -> ARBEITSBAUM. */
  geloescht: boolean;
  /**
   * Die Art der vorgemerkten Änderung (HEAD -> INDEX), oder `null`, wenn
   * nichts vorgemerkt ist. Bewusst getrennt von `geloescht`: Das eine
   * beschreibt HEAD -> INDEX, das andere INDEX -> ARBEITSBAUM.
   */
  vorgemerkt: GestagteArt | null;
}

function istBekannt(datei: GitDatei): boolean {
  return datei.index !== undefined || datei.head !== undefined;
}

/**
 * Die Art einer vorgemerkten Änderung — abgeleitet AUSSCHLIESSLICH aus
 * HEAD -> INDEX.
 *
 * Zuvor stand dort ein einziges `geloescht`, das aus der Abwesenheit im
 * ARBEITSBAUM stammte und trotzdem in der Überschrift für die vorgemerkten
 * Änderungen benutzt wurde — zwei verschiedene Baumpaare in einem Feld.
 * Deshalb meldete das Git-State-Lab beim ersten `git add notizen.txt`
 * "geändert" statt "neue Datei", ausgerechnet in der Lektion, die das Lesen
 * von `git status` beibringt (Code-Review vor dem Merge von PR #30).
 */
export type GestagteArt = 'neu' | 'geaendert' | 'geloescht';

function gestagteArt(datei: GitDatei): GestagteArt | null {
  if (datei.index === datei.head) return null;
  if (datei.head === undefined) return 'neu';
  if (datei.index === undefined) return 'geloescht';
  return 'geaendert';
}

/**
 * Berechnet den Status einer Datei aus dem Vergleich ihrer drei Fassungen.
 *
 * Jede Aussage gehört zu genau einem Baumpaar:
 *
 *   vorgemerkt    HEAD      -> INDEX
 *   ungemerkt     INDEX     -> ARBEITSBAUM
 *   unversioniert weder in HEAD noch im INDEX, aber im ARBEITSBAUM
 *
 * `null` heißt: Diese Datei hat in `git status` gar keine Zeile.
 */
export function dateiStatus(datei: GitDatei): StatusEintrag | null {
  const vorgemerkt = gestagteArt(datei);
  // Ungemerkte Änderungen sind der Unterschied zwischen ARBEITSBAUM und
  // INDEX — nicht zwischen Arbeitsbaum und "Index oder ersatzweise HEAD".
  // `index === undefined` ist eine Aussage: Der Pfad liegt NICHT in der
  // Staging Area.
  const imArbeitsbaumGeaendert = datei.arbeitsbaum !== datei.index;
  const geloescht = datei.arbeitsbaum === undefined;

  if (!istBekannt(datei)) {
    // Unversioniert heißt: im Arbeitsbaum vorhanden, aber weder in HEAD noch
    // im Index. Fehlt die Datei auch dort, existiert sie nirgends — nach
    // einer committeten Löschung etwa. Echtes Git meldet dann "nichts zu
    // committen", nicht eine unversionierte Datei, die es nicht gibt.
    if (datei.arbeitsbaum === undefined) return null;
    return {
      pfad: datei.pfad,
      status: 'untracked',
      auchUngestagt: false,
      geloescht: false,
      vorgemerkt: null,
    };
  }

  // Der Pfad liegt nicht in der Staging Area, HEAD kennt ihn aber noch: die
  // Löschung ist vorgemerkt. Was danach im Arbeitsverzeichnis liegt, ist
  // unversioniert — der Index kennt den Pfad ja nicht — und deshalb KEINE
  // zusätzliche ungemerkte Änderung. `status()` hängt dafür eine eigene
  // Zeile an, so wie echtes Git `D  f.md` und `?? f.md` nebeneinander zeigt.
  if (datei.index === undefined) {
    return {
      pfad: datei.pfad,
      status: 'staged',
      auchUngestagt: false,
      geloescht: true,
      vorgemerkt,
    };
  }

  if (vorgemerkt) {
    return {
      pfad: datei.pfad,
      status: 'staged',
      auchUngestagt: imArbeitsbaumGeaendert,
      geloescht,
      vorgemerkt,
    };
  }

  if (imArbeitsbaumGeaendert) {
    return {
      pfad: datei.pfad,
      status: 'modified',
      auchUngestagt: true,
      geloescht,
      vorgemerkt: null,
    };
  }

  return {
    pfad: datei.pfad,
    status: 'committed',
    auchUngestagt: false,
    geloescht,
    vorgemerkt: null,
  };
}

export function status(zustand: GitArbeitsbaumZustand): StatusEintrag[] {
  const eintraege = zustand.dateien.flatMap((datei) => {
    const eintrag = dateiStatus(datei);
    if (eintrag === null) return [];

    // Ein Sonderfall, den echtes Git mit ZWEI Zeilen beantwortet: Die
    // Löschung ist vorgemerkt (der Pfad fehlt im Index), und im
    // Arbeitsverzeichnis liegt wieder eine Datei dieses Namens. Weil der
    // Index den Pfad nicht kennt, ist diese Datei unversioniert — `git
    // status` zeigt `D  f.md` und `?? f.md` nebeneinander.
    const vorgemerktGeloescht = datei.index === undefined && datei.head !== undefined;
    if (vorgemerktGeloescht && datei.arbeitsbaum !== undefined) {
      return [
        eintrag,
        {
          pfad: datei.pfad,
          status: 'untracked' as const,
          auchUngestagt: false,
          geloescht: false,
          vorgemerkt: null,
        },
      ];
    }
    return [eintrag];
  });

  return eintraege.sort((a, b) => a.pfad.localeCompare(b.pfad, 'de'));
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

const VORGEMERKT_VERB: Record<GestagteArt, string> = {
  neu: 'neue Datei',
  geaendert: 'geändert',
  geloescht: 'gelöscht',
};

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
        // Die Überschrift beschreibt HEAD -> INDEX, also auch das Verb.
        ...gestagt.map((e) => `  ${VORGEMERKT_VERB[e.vorgemerkt ?? 'geaendert']}:   ${e.pfad}`),
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

/**
 * Eine Fassung einer Datei — vorhanden mit Inhalt, oder eben nicht da.
 *
 * `undefined` als "kein Inhalt" zu lesen warf zwei verschiedene Zustände
 * zusammen: die LEERE Datei und die NICHT VORHANDENE. Beim Löschen einer
 * leeren Datei kam so gar keine Zeile zustande, und `git diff` meldete
 * "keine Änderungen", während `git status` die Löschung anzeigte
 * (Codex-Review auf PR #30). Dieselbe Verwechslung wie beim Index: Abwesend
 * ist ein Zustand, kein fehlender Wert.
 */
type DateiFassung = { vorhanden: false } | { vorhanden: true; inhalt: string };

function fassung(inhalt: string | undefined): DateiFassung {
  return inhalt === undefined ? { vorhanden: false } : { vorhanden: true, inhalt };
}

/** Eine Zeile und ob sie mit einem Zeilenumbruch abgeschlossen ist. */
interface Zeile {
  text: string;
  abgeschlossen: boolean;
}

/**
 * Zerlegt eine Fassung in Zeilen.
 *
 * Ein abschließender Zeilenumbruch ist ein ABSCHLUSS, keine weitere leere
 * Zeile. Ihn als Zeile zu zählen erfand bei jeder Datei, die auf `\n` endet,
 * eine leere Zeile im Diff — `a\n` -> `b\n` bekam eine leere Kontextzeile
 * angehängt, die echtes Git dort nicht zeigt (Codex-Review auf PR #30).
 *
 * Eine LEERE Datei hat null Zeilen. Sonst entstünde beim Löschen ein `-`
 * ohne Inhalt — eine erfundene Zeile; echtes Git meldet dort nur
 * `deleted file mode`.
 */
function inZeilen(fassung: DateiFassung): Zeile[] {
  if (!fassung.vorhanden || fassung.inhalt === '') return [];
  const teile = fassung.inhalt.split('\n');
  const endetMitUmbruch = teile[teile.length - 1] === '';
  if (endetMitUmbruch) teile.pop();
  return teile.map((text, i) => ({
    text,
    abgeschlossen: i < teile.length - 1 ? true : endetMitUmbruch,
  }));
}

/** Wie echtes Git es schreibt, nur auf Deutsch. */
const OHNE_ABSCHLUSS = '\\ Kein Zeilenumbruch am Dateiende';

function gleich(a: Zeile | undefined, b: Zeile | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  // Der fehlende Abschluss gehört zur Zeile: `a\n` und `a` sind nicht
  // dasselbe, auch wenn der Text gleich ist. Genau so hält es Git, das die
  // Zeile dann als `-`/`+` samt Markierung zeigt.
  return a.text === b.text && a.abgeschlossen === b.abgeschlossen;
}

/**
 * Zeilenweiser Vergleich zweier Fassungen über die längste gemeinsame
 * Teilfolge.
 *
 * Ein stellenweiser Vergleich (Zeile 1 gegen Zeile 1, Zeile 2 gegen Zeile 2)
 * ist kein Diff: Wird irgendwo eine Zeile eingefügt, gilt ab da ALLES als
 * geändert. `a\nb` -> `a\n\nb` erschien so als "b entfernt, Leerzeile und b
 * hinzugefügt", während echtes Git die eingefügte Leerzeile zeigt und `b`
 * als Kontext stehen lässt (Codex-Review auf PR #30).
 *
 * Die Tabelle ist quadratisch in der Zeilenzahl. Für Lerninhalte — ein paar
 * Dutzend Zeilen — ist das ohne Belang.
 */
function zeilenDiff(vorher: DateiFassung, nachher: DateiFassung): string[] {
  const alt = inZeilen(vorher);
  const neu = inZeilen(nachher);
  const n = alt.length;
  const m = neu.length;

  // laenge[i][j] = Länge der längsten gemeinsamen Teilfolge ab alt[i]/neu[j].
  const laenge: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      const naechste = gleich(alt[i], neu[j])
        ? (laenge[i + 1]?.[j + 1] ?? 0) + 1
        : Math.max(laenge[i + 1]?.[j] ?? 0, laenge[i]?.[j + 1] ?? 0);
      const zeile = laenge[i];
      if (zeile) zeile[j] = naechste;
    }
  }

  const zeilen: string[] = [];
  const schreibe = (praefix: string, zeile: Zeile | undefined): void => {
    if (!zeile) return;
    zeilen.push(`${praefix}${zeile.text}`);
    if (!zeile.abgeschlossen) zeilen.push(OHNE_ABSCHLUSS);
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (gleich(alt[i], neu[j])) {
      schreibe(' ', alt[i]);
      i += 1;
      j += 1;
    } else if ((laenge[i + 1]?.[j] ?? 0) >= (laenge[i]?.[j + 1] ?? 0)) {
      schreibe('-', alt[i]);
      i += 1;
    } else {
      schreibe('+', neu[j]);
      j += 1;
    }
  }
  while (i < n) {
    schreibe('-', alt[i]);
    i += 1;
  }
  while (j < m) {
    schreibe('+', neu[j]);
    j += 1;
  }
  return zeilen;
}

/**
 * Der Diff-Block einer Datei, oder `null`, wenn sich nichts geändert hat.
 *
 * Angelehnt an echtes Git: Beim Anlegen und Löschen steht die Art der
 * Änderung als eigene Zeile da. Das ist nicht nur Zierrat — bei einer LEEREN
 * Datei gibt es keine Inhaltszeile, und ohne diese Kopfzeile wäre die
 * Löschung schlicht unsichtbar. Echtes Git schreibt dort
 * `deleted file mode 100644` und sonst nichts.
 */
function diffBlock(pfad: string, vorher: DateiFassung, nachher: DateiFassung): string | null {
  if (!vorher.vorhanden && !nachher.vorhanden) return null;
  if (vorher.vorhanden && nachher.vorhanden && vorher.inhalt === nachher.inhalt) return null;

  const kopf: string[] = [];
  if (!nachher.vorhanden) {
    kopf.push(`--- a/${pfad}`, '+++ /dev/null', 'gelöschte Datei');
  } else if (!vorher.vorhanden) {
    kopf.push('--- /dev/null', `+++ b/${pfad}`, 'neue Datei');
  } else {
    kopf.push(`--- a/${pfad}`, `+++ b/${pfad}`);
  }

  return [...kopf, ...zeilenDiff(vorher, nachher)].join('\n');
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
      // Ein Eintrag, der in keinem der drei Orte mehr steht — etwa nach einer
      // committeten Löschung — beschreibt keine Datei mehr. Ihn als bekannt
      // zu führen ließ `git add f.md` danach wortlos gelingen, mit
      // `veraendert: true`, obwohl es nichts gab. Echtes Git bricht mit
      // "pathspec did not match" ab. Stiller Erfolg ist genau das, was
      // dieser Simulator nirgends tun soll (Codex-Review auf PR #30).
      const bekannt = new Set(
        dateien
          .filter(
            (d) => d.arbeitsbaum !== undefined || d.index !== undefined || d.head !== undefined,
          )
          .map((d) => d.pfad),
      );
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
        // `git diff` vergleicht INDEX -> ARBEITSBAUM, `git diff --staged`
        // vergleicht HEAD -> INDEX. Das ersatzweise HEAD verglich eine
        // vorgemerkte Löschung gegen HEAD und zeigte sie als ungemerkte
        // Änderung, obwohl Index und Arbeitsbaum übereinstimmen.
        const vorher = gestagt ? datei.head : datei.index;
        const nachher = gestagt ? datei.index : datei.arbeitsbaum;
        if (vorher === nachher) continue;
        // Für den ungemerkten Vergleich heißt "versioniert": IM INDEX.
        // `istBekannt` lässt auch HEAD gelten — damit rutschte eine
        // vorgemerkte Löschung, deren Datei im Arbeitsbaum wieder angelegt
        // wurde, als Hinzufügung in `git diff`, obwohl echtes Git dort
        // nichts zeigt: Der Pfad fehlt im Index, die neue Datei ist
        // unversioniert (Code-Review vor dem Merge von PR #30).
        if (!gestagt && datei.index === undefined) continue;
        const block = diffBlock(datei.pfad, fassung(vorher), fassung(nachher));
        if (block === null) continue;
        bloecke.push(block);
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
        // Ohne `--staged` liest git restore aus dem INDEX. Ein Pfad, der
        // dort nicht liegt, passt auf nichts — auch dann nicht, wenn HEAD
        // ihn noch kennt. Genau so verhält sich echtes Git bei einer
        // vorgemerkten Löschung: `git restore f.md` bricht mit
        // "pathspec did not match" ab, statt die Datei aus HEAD
        // wiederauferstehen zu lassen und die vorgemerkte Löschung
        // stillschweigend zu verwerfen (Code-Review vor dem Merge von
        // PR #30).
        const imIndex = datei !== undefined && datei.index !== undefined;
        const nutzbar = ausIndex ? datei !== undefined && istBekannt(datei) : imIndex;
        if (!nutzbar) {
          return KEINE_AENDERUNG(
            zustand,
            `error: pathspec '${pfad}' did not match any file(s) known to git`,
          );
        }
      }

      // Bei `.` sind das alle VERSIONIERTEN Dateien — unversionierte rührt
      // git restore auch dann nicht an, sonst wäre `.` ein Löschbefehl.
      // Bei `.` übergeht echtes Git eine vorgemerkte Löschung und setzt die
      // übrigen Dateien zurück — aber nur, solange überhaupt etwas im Index
      // passt. Passt gar nichts, meldet es einen Fehler. Beides gegen
      // Git 2.52 nachgestellt.
      const betroffen = allePfade
        ? dateien.filter((d) => (ausIndex ? istBekannt(d) : d.index !== undefined))
        : dateien.filter((d) => ausdrueckliche.includes(d.pfad));

      if (allePfade && betroffen.length === 0) {
        return KEINE_AENDERUNG(
          zustand,
          `error: pathspec '.' did not match any file(s) known to git`,
        );
      }

      for (const datei of betroffen) {
        // `--staged` nimmt die Vormerkung zurück: der Index bekommt wieder
        // den Stand aus HEAD. Fehlt der Pfad in HEAD, war er neu — dann
        // verschwindet er aus dem Index, statt Inhalt zu erfinden.
        if (ausIndex) datei.index = datei.head;
        // Ohne `--staged` kommt der Arbeitsbaum aus dem INDEX. Dass der
        // Pfad dort liegt, ist oben geprüft.
        else datei.arbeitsbaum = datei.index;
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

function naechsteCommitId(commits: { id: string }[]): string {
  // Aus den VORHANDENEN Kennungen ableiten, nicht aus der Anzahl. Eine
  // Konfiguration mit Lücken (c01, c03) ergab sonst beim nächsten Commit
  // erneut `c03` — mit sich selbst als Elternteil. Der Graph war damit
  // doppelt vergeben und zyklisch, obwohl die Konfiguration beide Regeln
  // erfüllte: Geprüft wird der Anfangszustand, erzeugt wird hier
  // (Code-Review vor dem Merge von PR #30).
  const zahlen = commits
    .map((commit) => /^c(\d+)$/.exec(commit.id))
    .map((treffer) => (treffer ? Number(treffer[1]) : 0));
  const hoechste = zahlen.length > 0 ? Math.max(...zahlen) : 0;
  return `c${String(hoechste + 1).padStart(2, '0')}`;
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
