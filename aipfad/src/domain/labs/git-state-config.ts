import { z } from 'zod';

/**
 * Der Vertrag für die Konfiguration des Git-State-Labs.
 *
 * Er stand zuvor nur in der Maske. Weil `labSchema.config` bewusst offen
 * bleibt, sah die Inhaltsprüfung hier gar nichts: Eine Konfiguration ohne
 * `dateien` kam durch `content:validate` und warf erst beim Öffnen der
 * Seite. Merge- und Branch-Lab hatten ihren Vertrag längst in der Domäne —
 * das dritte Lab fehlte (Codex-Review auf PR #30).
 *
 * Eine Quelle, zwei Aufrufer: die Maske und `validateCourseGraph()`.
 */
export const gitStateConfigSchema = z
  .object({
    dateien: z
      .array(
        z.object({
          pfad: z.string().min(1),
          /** `undefined` heißt: an diesem Ort nicht vorhanden. */
          arbeitsbaum: z.string().optional(),
          index: z.string().optional(),
          head: z.string().optional(),
        }),
      )
      .min(1),
    commits: z
      .array(
        z.object({
          id: z.string().min(1),
          nachricht: z.string().min(1),
          stand: z.record(z.string(), z.string()),
        }),
      )
      .default([]),
    /** Vorgeschlagene Bearbeitungen, damit man ohne Editor etwas ändern kann. */
    bearbeitungen: z
      .array(
        z.object({
          pfad: z.string().min(1),
          inhalt: z.string(),
          beschriftung: z.string().min(1),
        }),
      )
      .default([]),
  })
  .superRefine((config, ctx) => {
    // Der Pfad IST die Kennung einer Datei. Zweimal derselbe, und das Lab
    // führt zwei Sätze für eine Datei: `git status` zeigt zwei Zeilen,
    // `git add` merkt beide vor, und der Commit behält am Ende stillschweigend
    // nur einen der Inhalte — der andere ist weg, ohne dass es jemand sagt
    // (Codex-Review auf PR #30).
    const gesehen = new Set<string>();
    for (const [i, datei] of config.dateien.entries()) {
      if (gesehen.has(datei.pfad)) {
        ctx.addIssue({
          code: 'custom',
          path: ['dateien', i, 'pfad'],
          message: `Doppelter Pfad "${datei.pfad}".`,
        });
      }
      gesehen.add(datei.pfad);
    }
  });

export type GitStateConfig = z.infer<typeof gitStateConfigSchema>;
