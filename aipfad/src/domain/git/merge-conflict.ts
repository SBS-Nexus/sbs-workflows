/**
 * Deterministischer Merge-Konflikt-Simulator.
 *
 * Ein Konflikt entsteht nicht, weil Git etwas nicht kann, sondern weil zwei
 * Entwicklungslinien **dieselbe Stelle** unterschiedlich geändert haben. Git
 * kann diese Frage nicht beantworten — nur ein Mensch weiß, was gemeint war.
 * Genau das soll dieses Lab erfahrbar machen.
 *
 * Kein echtes Git, keine Shell, keine Dateien: Alles läuft über den
 * übergebenen Zustand.
 */

/** Ein Abschnitt der Datei: entweder unstrittig oder ein Konflikt. */
export type Abschnitt =
  | { art: 'gemeinsam'; zeilen: string[] }
  | {
      art: 'konflikt';
      id: string;
      /** Fassung des Branches, auf dem gemerged wird (HEAD, "ours"). */
      unsere: string[];
      /** Fassung des hereingeholten Branches ("theirs"). */
      ihre: string[];
    };

export interface KonfliktDatei {
  pfad: string;
  abschnitte: Abschnitt[];
}

/** Wie ein einzelner Konflikt aufgelöst wurde. */
export type Aufloesung =
  | { art: 'offen' }
  | { art: 'unsere' }
  | { art: 'ihre' }
  | { art: 'beide' }
  | { art: 'eigene'; zeilen: string[] };

/**
 * Der Merge selbst hat drei Zustände — und nur im ersten gibt es überhaupt
 * einen Konflikt.
 *
 * Zwei getrennte Wahrheitswerte "abgebrochen" und "abgeschlossen" wären
 * dieselbe Information in einer Form, die widersprüchliche Kombinationen
 * zulässt. Als ein Feld kann der Zustand nicht auseinanderlaufen.
 */
export type MergeZustand = 'laeuft' | 'abgebrochen' | 'abgeschlossen';

export interface KonfliktZustand {
  datei: KonfliktDatei;
  /** Konflikt-Kennung -> Auflösung. */
  aufloesungen: Record<string, Aufloesung>;
  /** Wurde die Datei als aufgelöst vorgemerkt (git add)? */
  vorgemerkt: boolean;
  status: MergeZustand;
  /**
   * Der Branch, der hereingeholt wird — die "ihre" Seite des Konflikts.
   *
   * Ohne ihn wusste der Simulator nicht, welcher Merge hier eigentlich
   * ansteht, und startete nach einem Abbruch auf JEDE Merge-Eingabe hin
   * denselben Konflikt neu (Codex-Review auf PR #30).
   */
  ihrBranch: string;
}

import {
  anfuehrungNichtGeschlossen,
  leseSchalter,
  operandenNichtUmgesetzt,
  schalterNichtUmgesetzt,
  schalterOhneWert,
  zerlegeBefehl,
} from './schalter';
import { eigenerEintrag } from '../eintraege';

export const KONFLIKT_START = '<<<<<<<';
export const KONFLIKT_TRENNER = '=======';
export const KONFLIKT_ENDE = '>>>>>>>';

export interface MarkerBeschriftung {
  unser: string;
  ihr: string;
}

/**
 * Die Datei so, wie Git sie beim Konflikt hinterlässt — mit Markern.
 *
 * Die Marker sind kein Fehler und kein kaputter Zustand: Sie sind Gits Art zu
 * sagen "hier weiß nur du weiter". Wer sie einmal gelesen hat, verliert die
 * Scheu davor.
 */
export function mitKonfliktMarkern(
  zustand: KonfliktZustand,
  beschriftung: MarkerBeschriftung,
): string[] {
  // Nach einem Abbruch gibt es keinen Konflikt mehr: Git stellt den Stand von
  // vor dem Merge wieder her — die eigene Fassung, ohne Marker.
  if (zustand.status === 'abgebrochen') {
    return zustand.datei.abschnitte.flatMap((abschnitt) =>
      abschnitt.art === 'gemeinsam' ? abschnitt.zeilen : abschnitt.unsere,
    );
  }

  const zeilen: string[] = [];
  for (const abschnitt of zustand.datei.abschnitte) {
    if (abschnitt.art === 'gemeinsam') {
      zeilen.push(...abschnitt.zeilen);
      continue;
    }
    const aufloesung = eigenerEintrag(zustand.aufloesungen, abschnitt.id) ?? {
      art: 'offen' as const,
    };
    if (aufloesung.art === 'offen') {
      zeilen.push(
        `${KONFLIKT_START} ${beschriftung.unser}`,
        ...abschnitt.unsere,
        KONFLIKT_TRENNER,
        ...abschnitt.ihre,
        `${KONFLIKT_ENDE} ${beschriftung.ihr}`,
      );
      continue;
    }
    zeilen.push(...aufgeloesteZeilen(abschnitt, aufloesung));
  }
  return zeilen;
}

function aufgeloesteZeilen(
  abschnitt: Extract<Abschnitt, { art: 'konflikt' }>,
  aufloesung: Aufloesung,
): string[] {
  switch (aufloesung.art) {
    case 'unsere':
      return abschnitt.unsere;
    case 'ihre':
      return abschnitt.ihre;
    case 'beide':
      return [...abschnitt.unsere, ...abschnitt.ihre];
    case 'eigene':
      return aufloesung.zeilen;
    case 'offen':
      return [];
  }
}

/** Der Inhalt ohne Marker — das, was nach dem Auflösen in der Datei steht. */
export function aufgeloesterInhalt(zustand: KonfliktZustand): string[] {
  const zeilen: string[] = [];
  for (const abschnitt of zustand.datei.abschnitte) {
    if (abschnitt.art === 'gemeinsam') {
      zeilen.push(...abschnitt.zeilen);
      continue;
    }
    const aufloesung = eigenerEintrag(zustand.aufloesungen, abschnitt.id) ?? {
      art: 'offen' as const,
    };
    zeilen.push(...aufgeloesteZeilen(abschnitt, aufloesung));
  }
  return zeilen;
}

export function offeneKonflikte(zustand: KonfliktZustand): string[] {
  return zustand.datei.abschnitte
    .filter((a): a is Extract<Abschnitt, { art: 'konflikt' }> => a.art === 'konflikt')
    .filter((a) => (eigenerEintrag(zustand.aufloesungen, a.id) ?? { art: 'offen' }).art === 'offen')
    .map((a) => a.id);
}

export function alleKonflikteGeloest(zustand: KonfliktZustand): boolean {
  return offeneKonflikte(zustand).length === 0;
}

/**
 * Bleiben noch Konfliktmarker im Text stehen?
 *
 * Wichtiger Lerninhalt: Git prüft das NICHT. Wer die Marker stehen lässt und
 * committet, hat sie anschließend im Quelltext. Deshalb prüft dieses Lab es
 * ausdrücklich und sagt es deutlich.
 */
export function enthaeltMarker(zeilen: string[]): boolean {
  return zeilen.some(
    (zeile) =>
      zeile.startsWith(KONFLIKT_START) ||
      zeile.trimEnd() === KONFLIKT_TRENNER ||
      zeile.startsWith(KONFLIKT_ENDE),
  );
}

export interface KonfliktErgebnis {
  zustand: KonfliktZustand;
  ausgabe: string;
  veraendert: boolean;
}

export function loeseKonflikt(
  zustand: KonfliktZustand,
  konfliktId: string,
  aufloesung: Aufloesung,
): KonfliktZustand {
  // Entschieden wird nur, solange der Merge läuft.
  if (zustand.status !== 'laeuft') return zustand;
  return {
    ...zustand,
    // Eine Auflösung nach dem Vormerken macht die Vormerkung ungültig — die
    // vorgemerkte Fassung wäre sonst nicht mehr die, die man sieht.
    vorgemerkt: false,
    aufloesungen: { ...zustand.aufloesungen, [konfliktId]: aufloesung },
  };
}

/**
 * Merkt die aufgelöste Konfliktdatei vor — als getypter Übergang.
 *
 * Denselben Umweg wie beim Neustart nahm auch der Vormerk-Knopf: Aus dem
 * bereits getypten `pfad` wurde `git add <pfad>` gebaut und sofort wieder
 * zerlegt. Bei `preise 2026.md` wurden daraus zwei Operanden, bei
 * `preise"final".md` verschwanden die Anführungszeichen — beide Male passte
 * der Pfad danach nicht mehr zu dem konfigurierten, und das Lab ließ sich
 * über seinen eigenen Knopf nicht mehr abschließen
 * (Codex-Review auf PR #30).
 *
 * Dateinamen dürfen Leerzeichen und Anführungszeichen enthalten; das zu
 * verbieten hieße, das Dateimodell nach den Bequemlichkeiten eines Knopfes
 * zu schneiden. Der Umweg entfällt stattdessen.
 *
 * Zwei Aufrufer, ein Übergang: der geparste Lernbefehl und der Knopf.
 */
export function merkeKonfliktdateiVor(zustand: KonfliktZustand): KonfliktErgebnis {
  if (zustand.status !== 'laeuft') {
    return { zustand, ausgabe: 'Kein Merge im Gange.', veraendert: false };
  }
  if (!alleKonflikteGeloest(zustand)) {
    return {
      zustand,
      ausgabe: 'Es sind noch Konfliktstellen offen. Löse sie erst auf.',
      veraendert: false,
    };
  }
  if (enthaeltMarker(aufgeloesterInhalt(zustand))) {
    return {
      zustand,
      ausgabe:
        'Im Text stehen noch Konfliktmarker. Git würde sie mitcommitten — entferne sie zuerst.',
      veraendert: false,
    };
  }
  return {
    zustand: { ...zustand, vorgemerkt: true },
    ausgabe: `${zustand.datei.pfad} als aufgelöst vorgemerkt.`,
    veraendert: true,
  };
}

/**
 * Beginnt den abgebrochenen Merge erneut — als getypter Übergang.
 *
 * Der Neustartknopf hatte zuvor den Umweg über eine Zeichenkette genommen:
 * Aus dem bereits getypten `ihrBranch` wurde `git merge <name>` gebaut, das
 * dann wieder zerlegt wurde. Bei einem Branch wie `feature"prices"` — in
 * echtem Git ein völlig gewöhnlicher Name — las der Zerleger die
 * Anführungszeichen als Befehlssyntax, und übrig blieb `featureprices`. Das
 * Lab wies daraufhin den Befehl seiner eigenen Maske zurück und blieb in
 * "abgebrochen" stehen (Codex-Review auf PR #30).
 *
 * Die Antwort ist nicht, den Namen zu maskieren oder gültige Namen zu
 * verbieten, sondern den Umweg zu lassen: Was die Anwendung getypt in der
 * Hand hat, wird nicht erst zu Text und dann wieder zurück gelesen.
 *
 * Zwei Aufrufer, ein Übergang: der geparste Lernbefehl und der Knopf.
 */
export function starteMergeErneut(zustand: KonfliktZustand): KonfliktErgebnis {
  if (zustand.status !== 'abgebrochen') {
    return {
      zustand,
      ausgabe: 'Kein abgebrochener Merge, der neu beginnen könnte.',
      veraendert: false,
    };
  }
  return {
    zustand: { ...zustand, aufloesungen: {}, vorgemerkt: false, status: 'laeuft' },
    ausgabe: 'Automatischer Merge fehlgeschlagen; behebe die Konflikte und committe das Ergebnis.',
    veraendert: true,
  };
}

/**
 * Der Abschluss eines Merges in der Reihenfolge, die Git verlangt:
 * auflösen → `git add` → `git commit`. Der mittlere Schritt ist der, den
 * viele überspringen; ohne ihn bleibt der Merge unfertig.
 */
export function fuehreKonfliktBefehlAus(
  zustand: KonfliktZustand,
  eingabe: string,
): KonfliktErgebnis {
  const { teile, offeneAnfuehrung } = zerlegeBefehl(eingabe);
  if (offeneAnfuehrung) {
    return { zustand, ausgabe: anfuehrungNichtGeschlossen(offeneAnfuehrung), veraendert: false };
  }
  if (teile[0] !== 'git') {
    return { zustand, ausgabe: `Kein Git-Befehl: ${eingabe.trim()}`, veraendert: false };
  }
  const unterbefehl = teile[1] ?? '';
  const args = teile.slice(2);
  const unveraendert = (ausgabe: string): KonfliktErgebnis => ({
    zustand,
    ausgabe,
    veraendert: false,
  });

  switch (unterbefehl) {
    case 'status': {
      const schalter = leseSchalter(args, []);
      if (schalter.unbekannt) {
        return unveraendert(schalterNichtUmgesetzt('git status', schalter.unbekannt));
      }
      if (schalter.operanden.length > 0) {
        return unveraendert(operandenNichtUmgesetzt('git status', schalter.operanden));
      }
      if (zustand.status === 'abgeschlossen') {
        return {
          zustand,
          ausgabe: 'Kein Merge im Gange. Der Merge ist abgeschlossen.',
          veraendert: false,
        };
      }
      if (zustand.status === 'abgebrochen') {
        return {
          zustand,
          ausgabe: 'Kein Merge im Gange. Der Stand von vor dem Merge ist wiederhergestellt.',
          veraendert: false,
        };
      }
      const offen = offeneKonflikte(zustand);
      if (offen.length > 0) {
        return {
          zustand,
          ausgabe: [
            'Du befindest dich mitten in einem Merge.',
            'Nicht zusammengeführte Pfade:',
            `  beide geändert:   ${zustand.datei.pfad}`,
            '',
            `Offene Konfliktstellen: ${offen.length}`,
          ].join('\n'),
          veraendert: false,
        };
      }
      return {
        zustand,
        ausgabe: zustand.vorgemerkt
          ? 'Alle Konflikte aufgelöst und vorgemerkt. Jetzt: git commit'
          : `Alle Konflikte aufgelöst — aber noch nicht vorgemerkt. Jetzt: git add ${zustand.datei.pfad}`,
        veraendert: false,
      };
    }

    case 'add': {
      const schalter = leseSchalter(args, []);
      if (schalter.unbekannt) {
        return unveraendert(schalterNichtUmgesetzt('git add', schalter.unbekannt));
      }
      // Der angegebene Pfad muss die Konfliktdatei sein. Zuvor merkte jeder
      // beliebige Pfad die Konfliktdatei vor — auch ein Tippfehler
      // (Codex-Review auf PR #30).
      const fremd = schalter.operanden.filter((pf) => pf !== '.' && pf !== zustand.datei.pfad);
      if (fremd.length > 0) {
        return unveraendert(`fatal: pathspec '${fremd[0]}' did not match any files`);
      }
      if (schalter.operanden.length === 0) {
        return unveraendert(`git add: Bitte gib die Datei an: git add ${zustand.datei.pfad}`);
      }
      // Ab hier ist der Befehl verstanden — die Zustandsänderung selbst
      // liegt an genau einer Stelle, die auch der Knopf benutzt.
      return merkeKonfliktdateiVor(zustand);
    }

    case 'commit': {
      const schalter = leseSchalter(args, [
        { schreibweisen: ['-m', '--message'], name: 'nachricht', brauchtWert: true },
      ]);
      if (schalter.unbekannt) {
        return unveraendert(schalterNichtUmgesetzt('git commit', schalter.unbekannt));
      }
      // Ein `-m` ohne Nachricht schloss den Merge zuvor trotzdem ab. Echtes
      // Git bricht hier ab, bevor irgendetwas geschieht
      // (Codex-Review auf PR #30).
      if (schalter.ohneWert) {
        return unveraendert(schalterOhneWert(schalter.ohneWert));
      }
      if (schalter.operanden.length > 0) {
        return unveraendert(
          `git commit: Ein Commit einzelner Pfade ("${schalter.operanden.join(' ')}") ist in diesem Simulator nicht umgesetzt.`,
        );
      }
      if (zustand.status !== 'laeuft') {
        return { zustand, ausgabe: 'Kein Merge im Gange.', veraendert: false };
      }
      if (!alleKonflikteGeloest(zustand)) {
        return { zustand, ausgabe: 'Es sind noch Konflikte offen.', veraendert: false };
      }
      if (!zustand.vorgemerkt) {
        return {
          zustand,
          ausgabe: `Noch nichts vorgemerkt. Erst git add ${zustand.datei.pfad}, dann git commit.`,
          veraendert: false,
        };
      }
      return {
        zustand: { ...zustand, status: 'abgeschlossen' },
        ausgabe: 'Merge abgeschlossen. Der Merge-Commit hält beide Entwicklungslinien zusammen.',
        veraendert: true,
      };
    }

    case 'merge': {
      const schalter = leseSchalter(args, [{ schreibweisen: ['--abort'], name: 'abbrechen' }]);
      if (schalter.unbekannt) {
        return unveraendert(schalterNichtUmgesetzt('git merge', schalter.unbekannt));
      }
      if (schalter.gesetzt.has('abbrechen')) {
        // `git merge --abort feature` ist in echtem Git ein Fehler. Den
        // Branchnamen zu übergehen hätte alle Entscheidungen verworfen —
        // und zwar mit Erfolgsmeldung (Codex-Review auf PR #30).
        if (schalter.operanden.length > 0) {
          return unveraendert('fatal: --abort expects no arguments');
        }
        if (zustand.status !== 'laeuft') {
          // Echtes Git kennt keinen Abbruch ohne laufenden Merge — und schon
          // gar nicht nach einem abgeschlossenen. Sonst ließe sich hier ein
          // fertiger Merge nachträglich zurücknehmen.
          return {
            zustand,
            ausgabe: 'Kein Merge im Gange, den man abbrechen könnte.',
            veraendert: false,
          };
        }
        return {
          zustand: {
            ...zustand,
            aufloesungen: {},
            vorgemerkt: false,
            status: 'abgebrochen',
          },
          ausgabe: 'Merge abgebrochen. Der Stand von vor dem Merge ist wieder da.',
          veraendert: true,
        };
      }

      if (zustand.status === 'laeuft') {
        return { zustand, ausgabe: 'Ein Merge läuft bereits.', veraendert: false };
      }
      if (zustand.status === 'abgeschlossen') {
        return {
          zustand,
          ausgabe: 'Bereits zusammengeführt — es gibt nichts mehr zu tun.',
          veraendert: false,
        };
      }
      // Nach einem Abbruch lässt sich derselbe Merge erneut beginnen — aber
      // nur derselbe. Zuvor startete JEDE Merge-Eingabe den Konflikt neu,
      // auch `git merge` ohne Angabe und `git merge tippfehler`. Damit war
      // im Lab nicht mehr zu sehen, dass ein Merge immer sagt, WAS
      // hereingeholt wird (Codex-Review auf PR #30).
      if (schalter.operanden.length === 0) {
        return unveraendert(
          `git merge: Es fehlt die Angabe, was hereingeholt werden soll. Hier ist das ${zustand.ihrBranch}.`,
        );
      }
      if (schalter.operanden.length > 1) {
        return unveraendert(
          `git merge: Mehrere Angaben auf einmal sind in diesem Lab nicht umgesetzt. Hier geht es allein um ${zustand.ihrBranch}.`,
        );
      }
      const hereinzuholen = schalter.operanden[0];
      if (hereinzuholen !== zustand.ihrBranch) {
        return unveraendert(
          `merge: ${hereinzuholen} - not something we can merge. In diesem Lab gibt es nur ${zustand.ihrBranch}.`,
        );
      }
      // Ab hier ist der Befehl verstanden — die Zustandsänderung selbst
      // liegt an genau einer Stelle, die auch der Knopf benutzt.
      return starteMergeErneut(zustand);
    }

    default:
      return {
        zustand,
        ausgabe: `git ${unterbefehl}: in diesem Lab nicht umgesetzt. Verfügbar: git status, git add, git commit, git merge, git merge --abort.`,
        veraendert: false,
      };
  }
}
