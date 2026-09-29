/**
 * Der Rahmen für Aufbewahrungsfristen (E04A/ENT-B03).
 *
 * Bewusst ein Rahmen und kein Sonderfall für `Attempt`: Jede Datenart bekommt
 * eine eigene Regel mit eigener Frist und eigener Umgebungsvariablen. Kommt
 * später eine zweite Art dazu — E07 plant die Auditzeilen —, meldet sie ihre
 * Regel in derselben Liste an, statt einen zweiten Zeitplan zu bauen. Ein
 * zweiter Zeitplan wäre die eigentliche Gefahr: zwei Läufe, zwei Zeitpunkte,
 * zwei Fehlerbilder, und niemand sieht mehr, was wann gelöscht wird.
 *
 * Die Typen hier sind absichtlich frei von Prisma und von `server-only`: So
 * bleibt der Lauf auf der Unit-Ebene mit eingeschleusten Regeln prüfbar
 * (docs/TESTING.md), und die echten Regeln liegen getrennt in `rules.ts`.
 */

/**
 * Trockenlauf oder Ernstfall.
 *
 * Es gibt genau diese zwei Werte und keinen dritten, unklaren. Die
 * Bereitstellung muss sich entscheiden; ein Standard, der stillschweigend
 * löscht, wäre für eine unwiderrufliche Operation das falsche Verhalten.
 */
export type RetentionMode = 'dry-run' | 'execute';

/** Ausgang einer einzelnen Regel. */
export type RetentionRuleStatus = 'success' | 'skipped-disabled' | 'failed';

/** Ausgang des gesamten Laufs. */
export type RetentionRunStatus = 'success' | 'partial-failure' | 'failed';

/**
 * Eine Aufbewahrungsregel für genau EINE Datenart.
 *
 * `cutoffAt()` ist die einzige Stelle, an der die Grenze gerechnet wird. Zählen
 * und Löschen bekommen beide denselben Wert übergeben — sonst driften
 * Trockenlauf und Ernstfall auseinander, und der Trockenlauf verliert genau
 * die Aussage, für die es ihn gibt.
 */
export interface RetentionRule {
  /** Stabile Kennung, erscheint im Protokoll und in der Antwort. */
  readonly id: string;
  /** Welche Datenart betroffen ist, für Menschen lesbar. */
  readonly dataCategory: string;
  /** Name der Umgebungsvariablen, aus der die Frist stammt. */
  readonly retentionDaysEnvVar: string;
  /** Aktuelle Frist in Tagen. 0 bedeutet: Regel ist abgeschaltet. */
  retentionDays(): number;
  /** Grenze, ab der Daten als zu alt gelten. Einmal je Lauf berechnet. */
  cutoffAt(now: Date, retentionDays: number): Date;
  /** Wie viele Zeilen wären betroffen? Verändert nichts. */
  countCandidates(cutoff: Date): Promise<number>;
  /** Löscht die betroffenen Zeilen und meldet, wie viele es waren. */
  deleteCandidates(cutoff: Date): Promise<number>;
}

export interface RetentionRuleResult {
  ruleId: string;
  dataCategory: string;
  status: RetentionRuleStatus;
  retentionDays: number;
  /** Fehlt, wenn die Regel abgeschaltet war oder scheiterte. */
  cutoff?: string;
  candidateCount: number;
  deletedCount: number;
  durationMs: number;
  /**
   * Nur die Fehlerart, nie die Meldung. Eine Datenbankmeldung kann
   * Verbindungsangaben oder Feldinhalte enthalten; beides hat weder im
   * Protokoll noch in der Antwort etwas zu suchen.
   */
  errorType?: string;
}

export interface RetentionRunReport {
  runId: string;
  mode: RetentionMode;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: RetentionRunStatus;
  totalCandidateCount: number;
  totalDeletedCount: number;
  rules: RetentionRuleResult[];
}
