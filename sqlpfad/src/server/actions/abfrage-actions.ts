'use server';

import { z } from 'zod';
import { requireUser } from '@/server/auth/session';
import { getEnv, istSqlRunnerVerfuegbar } from '@/server/env';
import { erklaereSqlFehler, type Fehlererklaerung } from '@/domain/sql/fehler';
import { pruefeAnweisung, teileAnweisungen } from '@/domain/sql/statement-policy';
import type { Resultset } from '@/domain/sql/resultset';

/**
 * Eine Abfrage ausführen.
 *
 * Der Weg der Anfrage: Browser → diese Server Action → Runner-Dienst →
 * Sandbox. Die Anwendung spricht nie direkt Port 1433; die Begründung steht in
 * docs/SQL-RUNNER.md, Abschnitt 3.
 *
 * **Solange kein Runner erreichbar ist, wird das gesagt und nichts
 * vorgetäuscht.** Es gibt bewusst keinen Ersatzweg, der ein Ergebnis
 * herbeirechnet oder ein gespeichertes zeigt: Wer glaubt, seine Abfrage sei
 * gelaufen, lernt aus dem Ergebnis das Falsche.
 *
 * Die Policy läuft trotzdem – auch ohne Runner. Sie ist keine
 * Sicherheitsprüfung, sondern Didaktik: Wer in einer SELECT-Lektion ein UPDATE
 * schreibt, soll die Erklärung sofort bekommen und nicht erst, wenn irgendwann
 * ein Server bereitsteht.
 */

const eingabe = z.object({
  sql: z.string().min(1).max(20_000),
  /** Anweisungsklassen, die die aktuelle Aufgabe zulässt. */
  erlaubteKlassen: z.array(z.enum(['SELECT', 'DML', 'DDL', 'TRANSAKTION', 'PROGRAMMIERUNG'])),
});

export type AbfrageErgebnis =
  | { art: 'nicht-verfuegbar'; hinweis: string }
  | { art: 'abgelehnt'; begruendung: string }
  | {
      art: 'erfolg';
      resultset: Resultset;
      abgeschnitten: boolean;
      gelieferteZeilen: number;
      dauerMs: number;
    }
  | { art: 'fehler'; erklaerung: Fehlererklaerung }
  | { art: 'zeitlimit'; hinweis: string };

export async function fuehreAbfrageAus(daten: {
  sql: string;
  erlaubteKlassen: string[];
}): Promise<AbfrageErgebnis> {
  await requireUser();

  const geprueft = eingabe.safeParse(daten);
  if (!geprueft.success) {
    return { art: 'abgelehnt', begruendung: 'Die Eingabe konnte nicht gelesen werden.' };
  }

  const env = getEnv();
  const anweisungen = teileAnweisungen(geprueft.data.sql);

  if (anweisungen.length === 0) {
    return { art: 'abgelehnt', begruendung: 'Im Editor steht noch keine Abfrage.' };
  }

  if (anweisungen.length > env.SQL_MAX_ANWEISUNGEN) {
    return {
      art: 'abgelehnt',
      begruendung:
        `Es dürfen höchstens ${env.SQL_MAX_ANWEISUNGEN} Anweisungen auf einmal laufen; ` +
        `hier sind es ${anweisungen.length}. Führe sie einzeln aus – dann siehst du auch, ` +
        'welche welchen Effekt hat.',
    };
  }

  // Jede einzelne Anweisung, nicht nur die erste: Sonst käme ein UPDATE hinter
  // einem harmlosen SELECT ungesehen durch.
  for (const anweisung of anweisungen) {
    const ergebnis = pruefeAnweisung(anweisung, geprueft.data.erlaubteKlassen);
    if (!ergebnis.erlaubt) return { art: 'abgelehnt', begruendung: ergebnis.begruendung };
  }

  if (!istSqlRunnerVerfuegbar()) {
    /*
     * Der ehrliche Zustand.
     *
     * Nicht „Fehler beim Ausführen" und nicht „später erneut versuchen": Auf
     * dieser Installation ist die Ausführung abgeschaltet, und das ist eine
     * Entscheidung, keine Störung. Sie so darzustellen, als läge es an der
     * Verbindung, würde jemanden minutenlang neu laden lassen.
     */
    return {
      art: 'nicht-verfuegbar',
      hinweis:
        'Auf dieser Installation ist das Ausführen von Abfragen noch nicht eingeschaltet. ' +
        'Deine Abfrage wurde geprüft, aber nicht ausgeführt – ein Ergebnis dazu gibt es ' +
        'deshalb nicht, und es wird auch keines erfunden.',
    };
  }

  /*
   * Ab hier führt der Runner-Dienst aus.
   *
   * Der Client dafür steht noch aus; solange er fehlt, wird nicht so getan,
   * als sei die Ausführung möglich. Diese Verzweigung ist über
   * `istSqlRunnerVerfuegbar()` heute nicht erreichbar – sie bleibt als
   * benannte Lücke stehen, statt als stiller Rückfall auf irgendetwas.
   */
  return {
    art: 'nicht-verfuegbar',
    hinweis:
      'Der Übungsserver ist eingerichtet, die Anbindung an den Runner-Dienst fehlt in dieser ' +
      'Fassung aber noch. Siehe docs/SQL-RUNNER.md, Abschnitt 10.',
  };
}

/** Nur für die Anzeige: erzeugt die Erklärung zu einer Servermeldung. */
export async function erklaereMeldung(meldung: string): Promise<Fehlererklaerung> {
  await requireUser();
  return erklaereSqlFehler({ meldung });
}
