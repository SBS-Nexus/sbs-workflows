import { z } from 'zod';
import { branchnameSchema } from '@/domain/git/branch-name';
import { pruefeCommitGraph } from '@/domain/git/graph-invarianten';

/**
 * Der Vertrag für die Konfiguration des Branch-Labs.
 *
 * Er stand zuvor nur in der Maske, und zwar als `z.string()` für jedes Feld.
 * Damit kam `aktuellerBranch: 'toString'` durch, obwohl es keinen eigenen
 * Branch dieses Namens gab: Die Maske schrieb "Du bist auf toString" und
 * bot `toString $` als Eingabeaufforderung an, während jeder Befehl daneben
 * richtig "Kein aktueller Branch." antwortete — die Oberfläche widersprach
 * sich selbst (Codex-Review auf PR #30).
 *
 * Das ist kein Anzeigefehler, sondern eine ungültige Konfiguration. Sie
 * wird deshalb abgelehnt, bevor irgendetwas gezeichnet wird — und von
 * `validateCourseGraph()` mitgeprüft, sodass sie gar nicht erst
 * veröffentlicht werden kann.
 *
 * Die Beziehungsregeln des Graphen kommen aus `graph-invarianten.ts`, die
 * auch die `branchGraph`-Ansicht der Aufgaben prüft: ein Modell, eine
 * Fassung der Regeln.
 */
export const branchConfigSchema = z
  .object({
    commits: z
      .array(
        z.object({
          id: z.string().min(1),
          nachricht: z.string().min(1),
          eltern: z.array(z.string().min(1)).default([]),
        }),
      )
      .min(1),
    /** Branchname -> Commit-Kennung. */
    branches: z.record(branchnameSchema, z.string().min(1)),
    /** Auf welchem Branch HEAD steht. */
    aktuellerBranch: branchnameSchema,
    /** Vorschläge, damit man ohne Tippen loslegen kann. */
    vorschlaege: z.array(z.string()).default([]),
  })
  .superRefine((config, ctx) => {
    for (const befund of pruefeCommitGraph(config)) {
      ctx.addIssue({ code: 'custom', path: befund.pfad, message: befund.meldung });
    }
  });

export type BranchConfig = z.infer<typeof branchConfigSchema>;
