/**
 * Der SQL Runner: alles, was zwischen dem Editor und der Übungsdatenbank steht.
 *
 * Die Aufgabenteilung ist bewusst scharf:
 *
 * - **`SqlMotor`** ist der Anschluss an einen echten Server. Er kennt
 *   Verbindungen, Treiber und Zeitlimits – und sonst nichts. Er ist das
 *   einzige Stück, das für einen Test einen laufenden SQL Server bräuchte.
 * - **`SqlRunner`** ist die Fachlogik darüber: Policy, Grenzen, Übersetzung
 *   von Fehlern, Bewertung. Sie ist vollständig ohne Datenbank prüfbar, weil
 *   sie den Motor nur über diese Schnittstelle kennt.
 *
 * Diese Trennung ist nicht nur Ordnung. Die Regeln, die entscheiden, was eine
 * Lernende zu sehen bekommt, sind der Teil, der sich am häufigsten ändert und
 * am meisten Schaden anrichtet, wenn er falsch ist. Er gehört dorthin, wo ein
 * Test in Millisekunden läuft.
 *
 * **Was hier ausdrücklich nicht passiert:** Diese Datei ist keine
 * Sicherheitsgrenze. Die Grenze sind die Datenbankberechtigungen des
 * Anmeldenamens, mit dem der Motor arbeitet – siehe `docs/SQL-RUNNER.md`.
 *
 * Die Methodennamen `execute`, `grade`, `resetSandbox`, `cancel` und `health`
 * stehen so in der Architekturvorgabe und bleiben deshalb englisch; alles
 * andere folgt der Sprache des übrigen Codes.
 */

import { erklaereSqlFehler, type Fehlererklaerung } from './fehler';
import {
  type Resultset,
  type VergleichsOptionen,
  type Vergleichsergebnis,
  vergleicheResultsets,
} from './resultset';
import {
  type AnweisungsKlasse,
  type PolicyErgebnis,
  pruefeAnweisung,
  teileAnweisungen,
} from './statement-policy';

// ---------------------------------------------------------------------------
// Grenzen
// ---------------------------------------------------------------------------

/**
 * Harte Grenzen einer einzelnen Ausführung.
 *
 * Ohne sie kann eine einzige Abfrage den Übungsserver für alle blockieren –
 * meistens aus Versehen, etwa durch einen JOIN ohne Bedingung.
 */
export interface Ausfuehrungsgrenzen {
  /** Nach dieser Zeit bricht der Motor ab. */
  zeitlimitMs: number;
  /** Mehr Zeilen werden nicht übertragen; das Ergebnis gilt dann als gekürzt. */
  maxZeilen: number;
  /** Wie viele Anweisungen eine Eingabe enthalten darf. */
  maxAnweisungen: number;
}

export const STANDARDGRENZEN: Ausfuehrungsgrenzen = {
  zeitlimitMs: 5_000,
  maxZeilen: 500,
  maxAnweisungen: 10,
};

// ---------------------------------------------------------------------------
// Auftrag und Ergebnis
// ---------------------------------------------------------------------------

export interface Ausfuehrungsauftrag {
  /** Die Sandbox-Datenbank dieser Lernenden. Niemals die Plattformdatenbank. */
  sandboxId: string;
  /** Eindeutig je Ausführung, damit `cancel()` genau diese eine trifft. */
  ausfuehrungId: string;
  sql: string;
  /** Was die Aufgabe übt – alles andere wird erklärt, nicht ausgeführt. */
  erlaubteKlassen: readonly AnweisungsKlasse[];
  grenzen?: Partial<Ausfuehrungsgrenzen>;
}

export type Ausfuehrungsergebnis =
  | {
      art: 'abgelehnt';
      /** Enthält die an die Lernende gerichtete Begründung. */
      policy: PolicyErgebnis;
    }
  | {
      art: 'erfolg';
      resultset: Resultset;
      /** Wahr, wenn `maxZeilen` gegriffen hat. Wird sichtbar angezeigt. */
      abgeschnitten: boolean;
      /** Zeilen, die der Server geliefert hat – vor dem Kürzen. */
      gelieferteZeilen: number;
      /** Bei INSERT/UPDATE/DELETE die Zahl der betroffenen Zeilen. */
      betroffeneZeilen?: number;
      dauerMs: number;
    }
  | { art: 'fehler'; erklaerung: Fehlererklaerung; dauerMs: number }
  | { art: 'zeitlimit'; grenzeMs: number; hinweis: string }
  | { art: 'abgebrochen' };

export interface Bewertung {
  bestanden: boolean;
  ausfuehrung: Ausfuehrungsergebnis;
  /** Nur vorhanden, wenn die Ausführung überhaupt ein Ergebnis geliefert hat. */
  vergleich?: Vergleichsergebnis;
}

export interface Zustandsbericht {
  erreichbar: boolean;
  /** Ein Satz für die Oberfläche – auch im Fehlerfall ohne Schuldzuweisung. */
  hinweis: string;
  antwortzeitMs?: number;
}

// ---------------------------------------------------------------------------
// Der Anschluss an einen echten Server
// ---------------------------------------------------------------------------

/** Ein Ergebnis, wie es der Treiber liefert – ungekürzt und ungeprüft. */
export interface RohAusfuehrung {
  resultset?: Resultset;
  betroffeneZeilen?: number;
}

/** Ein Fehler, den SQL Server selbst gemeldet hat. */
export class SqlMotorFehler extends Error {
  constructor(
    message: string,
    readonly nummer?: number,
  ) {
    super(message);
    this.name = 'SqlMotorFehler';
  }
}

/** Das Zeitlimit hat gegriffen. */
export class SqlZeitlimitFehler extends Error {
  constructor(readonly grenzeMs: number) {
    super(`Zeitlimit von ${grenzeMs} ms überschritten`);
    this.name = 'SqlZeitlimitFehler';
  }
}

/** Die Lernende hat selbst abgebrochen. */
export class SqlAbbruchFehler extends Error {
  constructor() {
    super('Ausführung abgebrochen');
    this.name = 'SqlAbbruchFehler';
  }
}

export interface SqlMotor {
  fuehreAus(auftrag: Ausfuehrungsauftrag, grenzen: Ausfuehrungsgrenzen): Promise<RohAusfuehrung>;
  brichAb(ausfuehrungId: string): Promise<void>;
  setzeSandboxZurueck(sandboxId: string): Promise<void>;
  zustand(): Promise<Zustandsbericht>;
}

// ---------------------------------------------------------------------------
// Die Fachlogik
// ---------------------------------------------------------------------------

export interface SqlRunner {
  execute(auftrag: Ausfuehrungsauftrag): Promise<Ausfuehrungsergebnis>;
  grade(
    auftrag: Ausfuehrungsauftrag,
    erwartet: Resultset,
    optionen: VergleichsOptionen,
  ): Promise<Bewertung>;
  resetSandbox(sandboxId: string): Promise<void>;
  cancel(ausfuehrungId: string): Promise<void>;
  health(): Promise<Zustandsbericht>;
}

const LEERES_RESULTSET: Resultset = { spalten: [], zeilen: [] };

/**
 * Prüft die Eingabe, bevor sie den Server überhaupt erreicht.
 *
 * Zwei Gründe, in dieser Reihenfolge: Die Lernende bekommt eine Erklärung
 * statt einer Fehlermeldung, und der Übungsserver bekommt gar nicht erst
 * Arbeit, die er ohnehin ablehnen würde.
 */
function pruefeEingabe(
  auftrag: Ausfuehrungsauftrag,
  grenzen: Ausfuehrungsgrenzen,
): PolicyErgebnis | undefined {
  const anweisungen = teileAnweisungen(auftrag.sql);

  if (anweisungen.length === 0) {
    return {
      erlaubt: false,
      klasse: 'UNBEKANNT',
      begruendung: 'Im Editor steht noch keine Abfrage.',
    };
  }

  if (anweisungen.length > grenzen.maxAnweisungen) {
    return {
      erlaubt: false,
      klasse: 'UNBEKANNT',
      begruendung:
        `Es dürfen höchstens ${grenzen.maxAnweisungen} Anweisungen auf einmal laufen; ` +
        `hier sind es ${anweisungen.length}. Führe sie einzeln aus – dann siehst du auch, ` +
        'welche welchen Effekt hat.',
    };
  }

  // Jede einzelne Anweisung wird geprüft, nicht nur die erste. Sonst käme ein
  // UPDATE hinter einem SELECT ungesehen durch.
  for (const anweisung of anweisungen) {
    const ergebnis = pruefeAnweisung(anweisung, auftrag.erlaubteKlassen);
    if (!ergebnis.erlaubt) return ergebnis;
  }

  return undefined;
}

/** Kürzt ein Ergebnis auf die erlaubte Zeilenzahl. */
function kuerze(
  resultset: Resultset,
  maxZeilen: number,
): { resultset: Resultset; abgeschnitten: boolean; gelieferteZeilen: number } {
  const gelieferteZeilen = resultset.zeilen.length;
  if (gelieferteZeilen <= maxZeilen) {
    return { resultset, abgeschnitten: false, gelieferteZeilen };
  }
  return {
    resultset: { spalten: resultset.spalten, zeilen: resultset.zeilen.slice(0, maxZeilen) },
    abgeschnitten: true,
    gelieferteZeilen,
  };
}

export interface RunnerOptionen {
  grenzen?: Partial<Ausfuehrungsgrenzen>;
  /** Injizierbar, damit Tests die Dauer nicht vom Zufall abhängig messen. */
  uhr?: () => number;
}

export function erstelleSqlRunner(motor: SqlMotor, optionen: RunnerOptionen = {}): SqlRunner {
  const uhr = optionen.uhr ?? (() => Date.now());
  const grundgrenzen: Ausfuehrungsgrenzen = { ...STANDARDGRENZEN, ...optionen.grenzen };

  async function execute(auftrag: Ausfuehrungsauftrag): Promise<Ausfuehrungsergebnis> {
    const grenzen: Ausfuehrungsgrenzen = { ...grundgrenzen, ...auftrag.grenzen };

    const abgelehnt = pruefeEingabe(auftrag, grenzen);
    if (abgelehnt) return { art: 'abgelehnt', policy: abgelehnt };

    const begonnen = uhr();
    try {
      const roh = await motor.fuehreAus(auftrag, grenzen);
      const { resultset, abgeschnitten, gelieferteZeilen } = kuerze(
        roh.resultset ?? LEERES_RESULTSET,
        grenzen.maxZeilen,
      );

      return {
        art: 'erfolg',
        resultset,
        abgeschnitten,
        gelieferteZeilen,
        ...(roh.betroffeneZeilen === undefined ? {} : { betroffeneZeilen: roh.betroffeneZeilen }),
        dauerMs: uhr() - begonnen,
      };
    } catch (fehler) {
      if (fehler instanceof SqlAbbruchFehler) return { art: 'abgebrochen' };

      if (fehler instanceof SqlZeitlimitFehler) {
        return {
          art: 'zeitlimit',
          grenzeMs: fehler.grenzeMs,
          // Ein Zeitlimit ist fast nie „zu langsam getippt", sondern fast immer
          // eine Verknüpfung, die mehr Zeilen erzeugt als gedacht.
          hinweis:
            'Die Abfrage lief länger als erlaubt und wurde gestoppt. Häufigste Ursache: ' +
            'ein JOIN ohne passende Bedingung, der jede Zeile mit jeder verbindet. ' +
            'Prüfe, ob jede verbundene Tabelle eine ON-Bedingung hat.',
        };
      }

      if (fehler instanceof SqlMotorFehler) {
        return {
          art: 'fehler',
          erklaerung: erklaereSqlFehler({
            ...(fehler.nummer === undefined ? {} : { nummer: fehler.nummer }),
            meldung: fehler.message,
          }),
          dauerMs: uhr() - begonnen,
        };
      }

      throw fehler;
    }
  }

  return {
    execute,

    async grade(auftrag, erwartet, vergleichsOptionen) {
      const ausfuehrung = await execute(auftrag);

      if (ausfuehrung.art !== 'erfolg') {
        // Ohne Ergebnis gibt es nichts zu vergleichen. Wichtig ist, dass hier
        // kein leeres Resultset gegen die Musterlösung antritt – das ergäbe
        // eine Bewertung, die über die Lösung gar nichts aussagt.
        return { bestanden: false, ausfuehrung };
      }

      // Ein gekürztes Ergebnis kann nicht fair bewertet werden: Die fehlenden
      // Zeilen wären als „fehlt" gezählt, obwohl die Abfrage sie geliefert hat.
      if (ausfuehrung.abgeschnitten) {
        return {
          bestanden: false,
          ausfuehrung,
          vergleich: {
            stimmtUeberein: false,
            abweichungen: [
              {
                art: 'zeilenanzahl',
                beschreibung:
                  `Deine Abfrage liefert ${ausfuehrung.gelieferteZeilen} Zeilen. Angezeigt und ` +
                  `bewertet werden höchstens ${ausfuehrung.resultset.zeilen.length}. ` +
                  'Grenze das Ergebnis ein, bevor du es abgibst.',
              },
            ],
          },
        };
      }

      const vergleich = vergleicheResultsets(erwartet, ausfuehrung.resultset, vergleichsOptionen);
      return { bestanden: vergleich.stimmtUeberein, ausfuehrung, vergleich };
    },

    resetSandbox: (sandboxId) => motor.setzeSandboxZurueck(sandboxId),
    cancel: (ausfuehrungId) => motor.brichAb(ausfuehrungId),
    health: () => motor.zustand(),
  };
}
