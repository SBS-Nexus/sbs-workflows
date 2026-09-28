import type {
  RetentionMode,
  RetentionRule,
  RetentionRuleResult,
  RetentionRunReport,
  RetentionRunStatus,
} from '@/server/retention/types';

/**
 * Führt eine Menge von Aufbewahrungsregeln aus und schreibt ein Protokoll.
 *
 * Bewusst ohne `server-only` und ohne Prisma: Der Lauf kennt nur die
 * Schnittstelle `RetentionRule`. Dadurch lässt er sich mit eingeschleusten
 * Regeln auf der Unit-Ebene prüfen — auch der Teilfehlerfall, der sich mit
 * echten Tabellen kaum herbeiführen ließe.
 *
 * `now` kommt von außen. Ohne das wäre die Grenze nicht prüfbar: Ein Test, der
 * `new Date()` aus dem Inneren gegen `new Date()` von außen vergleicht, prüft
 * die Uhr und nicht die Regel.
 */

export interface RetentionRunOptions {
  rules: readonly RetentionRule[];
  mode: RetentionMode;
  now: Date;
  runId: string;
  /** Wird je Regel aufgerufen, sobald ihr Ergebnis feststeht. */
  onRuleFinished?: (result: RetentionRuleResult) => void;
}

const MILLISEKUNDEN_JE_TAG = 24 * 60 * 60 * 1000;

/**
 * Grenze für eine Frist in Tagen. Einzige Rechenstelle; Regeln, die keine
 * eigene Grenze brauchen, verweisen darauf.
 */
export function cutoffFromDays(now: Date, retentionDays: number): Date {
  return new Date(now.getTime() - retentionDays * MILLISEKUNDEN_JE_TAG);
}

async function regelAusfuehren(
  rule: RetentionRule,
  mode: RetentionMode,
  now: Date,
): Promise<RetentionRuleResult> {
  const begonnen = Date.now();
  const basis = { ruleId: rule.id, dataCategory: rule.dataCategory };

  try {
    const retentionDays = rule.retentionDays();

    // Frist 0 heißt ABGESCHALTET, nicht "alles löschen, was älter als jetzt
    // ist". Die Unterscheidung steht auch im Protokoll: `skipped-disabled`
    // ist etwas anderes als "gelaufen, nichts gefunden".
    if (retentionDays === 0) {
      return {
        ...basis,
        status: 'skipped-disabled',
        retentionDays,
        candidateCount: 0,
        deletedCount: 0,
        durationMs: Date.now() - begonnen,
      };
    }

    // EINE Grenze für beide Wege. Zählen und Löschen dürfen nicht je eigene
    // Formeln haben, sonst misst der Trockenlauf etwas anderes als der
    // Ernstfall es tut.
    const cutoff = rule.cutoffAt(now, retentionDays);
    const candidateCount = await rule.countCandidates(cutoff);
    const deletedCount = mode === 'execute' ? await rule.deleteCandidates(cutoff) : 0;

    return {
      ...basis,
      status: 'success',
      retentionDays,
      cutoff: cutoff.toISOString(),
      candidateCount,
      deletedCount,
      durationMs: Date.now() - begonnen,
    };
  } catch (error) {
    return {
      ...basis,
      status: 'failed',
      retentionDays: 0,
      candidateCount: 0,
      deletedCount: 0,
      durationMs: Date.now() - begonnen,
      errorType: error instanceof Error ? error.name : 'unbekannt',
    };
  }
}

function gesamtstatus(ergebnisse: readonly RetentionRuleResult[]): RetentionRunStatus {
  const gescheitert = ergebnisse.filter((e) => e.status === 'failed').length;
  if (gescheitert === 0) return 'success';
  return gescheitert === ergebnisse.length ? 'failed' : 'partial-failure';
}

/**
 * Regeln laufen NACHEINANDER und UNABHÄNGIG.
 *
 * Unabhängig heißt: Eine scheiternde Regel hält die übrigen nicht auf, und
 * schon gelöschte Daten einer früheren Regel werden nicht zurückgerollt. Der
 * naheliegende Gegenentwurf — alles in eine Transaktion — wäre hier falsch:
 * Die Fristen verschiedener Datenarten haben nichts miteinander zu tun, und
 * eine kaputte Regel dürfte nicht dafür sorgen, dass auf Dauer gar nichts mehr
 * aufgeräumt wird.
 *
 * Nacheinander statt gleichzeitig, damit sich die Regeln nicht um denselben
 * Verbindungspool streiten; die Läufe sind selten und dürfen dauern.
 */
export async function runRetention(options: RetentionRunOptions): Promise<RetentionRunReport> {
  const { rules, mode, now, runId, onRuleFinished } = options;
  const startedAt = new Date();
  const ergebnisse: RetentionRuleResult[] = [];

  for (const rule of rules) {
    const ergebnis = await regelAusfuehren(rule, mode, now);
    ergebnisse.push(ergebnis);
    onRuleFinished?.(ergebnis);
  }

  const finishedAt = new Date();

  return {
    runId,
    mode,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    status: gesamtstatus(ergebnisse),
    totalCandidateCount: ergebnisse.reduce((summe, e) => summe + e.candidateCount, 0),
    totalDeletedCount: ergebnisse.reduce((summe, e) => summe + e.deletedCount, 0),
    rules: ergebnisse,
  };
}
