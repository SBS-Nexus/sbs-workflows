import type { Fehlererklaerung, Fehlerkategorie } from '@/domain/sql/fehler';
import {
  type Resultset,
  type VergleichsOptionen,
  vergleicheResultsets,
} from '@/domain/sql/resultset';
import type { Ausfuehrungsergebnis } from '@/domain/sql/runner';
import { antwortform, type BewertbareAufgabe, type Bewertung } from './bewertung';

/**
 * Schreibaufgaben am Ergebnis bewerten – sobald ein Übungsserver da ist.
 *
 * `bewertung.ts` urteilt ohne Datenbank und sagt bei einer geschriebenen
 * Abfrage ehrlich: „geprüft, aber nicht ausgeführt". Ist der Übungsserver
 * eingeschaltet, führt die Anwendung die Abfrage in der Sandbox der Lernenden
 * aus, und dieses Modul macht aus dem Ergebnis ein Urteil. Es kennt weder
 * Datenbank noch Netz und lässt sich deshalb vollständig prüfen.
 *
 * Vorher landete jede Schreibaufgabe auch mit eingeschaltetem Server bei
 * „noch nicht eingeschaltet" – der Vergleich lag fertig in der Fachschicht,
 * war aber nirgends angeschlossen.
 */

/**
 * Lässt sich diese Aufgabe am Ergebnis bewerten?
 *
 * Nur, wenn sie eine Abfrage verlangt, ein erwartetes Ergebnis hat und
 * ausschließlich liest. Aufgaben, die Daten oder Strukturen ändern, würden die
 * Sandbox verändern, und ihr Ergebnis ist ein Zustand, keine Ergebnismenge –
 * dafür braucht es eine eigene Prüfung, die es noch nicht gibt.
 */
export function istAmErgebnisPruefbar(aufgabe: BewertbareAufgabe): boolean {
  if (antwortform(aufgabe.art) !== 'sql' || !aufgabe.erwartetesErgebnis) return false;
  return (aufgabe.erlaubteKlassen ?? ['SELECT']).every((klasse) => klasse === 'SELECT');
}

/** Was im Lernverlauf über den Versuch steht – Werte des Datenmodells. */
export interface Versuchsprotokoll {
  errorType: Fehlerart;
  errorSignature?: string;
  returnedRows?: number;
  executionMs?: number;
}

/** Entspricht `ErrorCategory` im Prisma-Schema. */
export type Fehlerart =
  | 'NONE'
  | 'SYNTAX'
  | 'OBJECT'
  | 'COLUMN'
  | 'ALIAS'
  | 'DATATYPE'
  | 'CONVERSION'
  | 'NULLABILITY'
  | 'CONSTRAINT'
  | 'KEY'
  | 'AGGREGATION'
  | 'SUBQUERY'
  | 'TRANSACTION'
  | 'PERMISSION'
  | 'TIMEOUT'
  | 'DEADLOCK'
  | 'POLICY'
  | 'WRONG_RESULT'
  | 'UNKNOWN';

const FEHLERART: Record<Fehlerkategorie, Fehlerart> = {
  SYNTAX: 'SYNTAX',
  OBJEKT: 'OBJECT',
  SPALTE: 'COLUMN',
  ALIAS: 'ALIAS',
  DATENTYP: 'DATATYPE',
  KONVERTIERUNG: 'CONVERSION',
  NULL: 'NULLABILITY',
  CONSTRAINT: 'CONSTRAINT',
  SCHLUESSEL: 'KEY',
  AGGREGATION: 'AGGREGATION',
  UNTERABFRAGE: 'SUBQUERY',
  TRANSAKTION: 'TRANSACTION',
  BERECHTIGUNG: 'PERMISSION',
  ZEITLIMIT: 'TIMEOUT',
  DEADLOCK: 'DEADLOCK',
  POLICY: 'POLICY',
  UNBEKANNT: 'UNKNOWN',
};

/** Die Rückmeldung zu einer ausgeführten Abgabe. */
export interface Ausfuehrungsrueckmeldung {
  bewertung: Bewertung;
  /** Was die eigene Abfrage geliefert hat – nie das erwartete Ergebnis. */
  eigenesErgebnis?: {
    resultset: Resultset;
    abgeschnitten: boolean;
    gelieferteZeilen: number;
    dauerMs: number;
  };
  /** Was nicht passt, vom Groben zum Feinen. Leer, wenn alles stimmt. */
  abweichungen: string[];
  /** Hat die Datenbank abgelehnt, die übersetzte Meldung. */
  fehler?: Fehlererklaerung;
  /** Nur gesetzt, wenn es ein Urteil gibt, das in den Verlauf gehört. */
  protokoll?: Versuchsprotokoll;
}

/** Höchstens so viele Abweichungen zeigen – die ersten erklären meist die übrigen. */
const MAX_ABWEICHUNGEN = 4;

export function bewerteAusfuehrung(
  ausfuehrung: Ausfuehrungsergebnis,
  erwartet: Resultset,
  optionen: VergleichsOptionen,
): Ausfuehrungsrueckmeldung {
  switch (ausfuehrung.art) {
    case 'abgelehnt':
      // Die Anweisungsprüfung des Dienstes. Kein Versuch: Die Abfrage ist nie
      // gelaufen, und ein Missverständnis der Aufgabe ist kein Fehlergebnis.
      return {
        bewertung: { art: 'abgelehnt', begruendung: ausfuehrung.policy.begruendung },
        abweichungen: [],
      };

    case 'abgebrochen':
      return {
        bewertung: {
          art: 'braucht-ausfuehrung',
          begruendung: 'Die Ausführung wurde abgebrochen. Es ist nichts passiert.',
        },
        abweichungen: [],
      };

    case 'zeitlimit':
      return {
        bewertung: { art: 'falsch', begruendung: ausfuehrung.hinweis },
        abweichungen: [],
        protokoll: { errorType: 'TIMEOUT', executionMs: ausfuehrung.grenzeMs },
      };

    case 'fehler':
      return {
        bewertung: {
          art: 'falsch',
          begruendung:
            'Die Datenbank hat deine Abfrage nicht ausgeführt. Was sie meldet und woran es ' +
            'liegen kann, steht darunter.',
        },
        abweichungen: [],
        fehler: ausfuehrung.erklaerung,
        protokoll: {
          errorType: FEHLERART[ausfuehrung.erklaerung.kategorie],
          errorSignature: ersteZeile(ausfuehrung.erklaerung.original),
          executionMs: ausfuehrung.dauerMs,
        },
      };

    case 'erfolg': {
      const eigenesErgebnis = {
        resultset: ausfuehrung.resultset,
        abgeschnitten: ausfuehrung.abgeschnitten,
        gelieferteZeilen: ausfuehrung.gelieferteZeilen,
        dauerMs: ausfuehrung.dauerMs,
      };
      const protokoll = {
        returnedRows: ausfuehrung.gelieferteZeilen,
        executionMs: ausfuehrung.dauerMs,
      };

      // Ein gekürztes Ergebnis lässt sich nicht fair vergleichen: Die
      // abgeschnittenen Zeilen zählten als „fehlt", obwohl die Abfrage sie
      // geliefert hat. Dieselbe Regel wie in `SqlRunner.grade`.
      if (ausfuehrung.abgeschnitten) {
        return {
          bewertung: {
            art: 'falsch',
            begruendung:
              `Deine Abfrage liefert ${ausfuehrung.gelieferteZeilen} Zeilen – mehr, als hier ` +
              'angezeigt und verglichen werden. Grenze das Ergebnis ein, bevor du es abgibst.',
          },
          eigenesErgebnis,
          abweichungen: [],
          protokoll: { ...protokoll, errorType: 'WRONG_RESULT' },
        };
      }

      const vergleich = vergleicheResultsets(erwartet, ausfuehrung.resultset, optionen);
      if (vergleich.stimmtUeberein) {
        return {
          bewertung: {
            art: 'richtig',
            begruendung:
              `Deine Abfrage liefert genau das verlangte Ergebnis: ${zeilen(erwartet.zeilen.length)} ` +
              `mit ${spalten(erwartet.spalten.length)}.`,
          },
          eigenesErgebnis,
          abweichungen: [],
          protokoll: { ...protokoll, errorType: 'NONE' },
        };
      }

      return {
        bewertung: {
          art: 'falsch',
          begruendung:
            'Die Abfrage läuft, liefert aber noch nicht das verlangte Ergebnis. Ein Fehler ohne ' +
            'Fehlermeldung ist der häufigste überhaupt – vergleiche dein Ergebnis mit der ' +
            'Aufgabenstellung.',
        },
        eigenesErgebnis,
        abweichungen: [
          ...new Set(vergleich.abweichungen.map((abweichung) => abweichung.beschreibung)),
        ].slice(0, MAX_ABWEICHUNGEN),
        protokoll: { ...protokoll, errorType: 'WRONG_RESULT' },
      };
    }
  }
}

function ersteZeile(text: string): string {
  return (text.split('\n')[0] ?? '').slice(0, 200);
}

function zeilen(anzahl: number): string {
  return anzahl === 1 ? 'eine Zeile' : `${anzahl} Zeilen`;
}

function spalten(anzahl: number): string {
  return anzahl === 1 ? 'einer Spalte' : `${anzahl} Spalten`;
}
