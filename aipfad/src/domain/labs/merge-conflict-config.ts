import { z } from 'zod';

/**
 * Der Vertrag für die Konfiguration des Merge-Konflikt-Labs.
 *
 * Er stand zuvor nur in der Maske. Das hatte zwei Folgen: Die allgemeine
 * `labSchema` lässt `config` bewusst offen, also sah die Inhaltsprüfung
 * hier gar nichts — und ein Fehler fiel erst auf, wenn jemand das Lab im
 * Browser öffnete. Deshalb liegt der Vertrag jetzt hier, wird von der Maske
 * gelesen UND von `validateCourseGraph()` (Codex-Review auf PR #30).
 *
 * Eine zweite Fassung daneben gäbe es damit nicht: eine Quelle, zwei
 * Aufrufer — dieselbe Regel wie beim Inhalts-Validator selbst.
 */
export const mergeConflictConfigSchema = z
  .object({
    pfad: z.string().min(1),
    /** Der Branch, auf dem gearbeitet wird — die "unsere" Seite. */
    unserBranch: z.string().min(1),
    /** Der Branch, der hereingeholt wird — die "ihre" Seite. */
    ihrBranch: z.string().min(1),
    /** Worum es im Konflikt fachlich geht — damit die Entscheidung begründbar ist. */
    hintergrund: z.string().min(1),
    abschnitte: z
      .array(
        z.union([
          z.object({ art: z.literal('gemeinsam'), zeilen: z.array(z.string()) }),
          z.object({
            art: z.literal('konflikt'),
            id: z.string().min(1),
            unsere: z.array(z.string()).min(1),
            ihre: z.array(z.string()).min(1),
          }),
        ]),
      )
      .min(1),
  })
  .superRefine((config, ctx) => {
    const konflikte = config.abschnitte.filter((abschnitt) => abschnitt.art === 'konflikt');

    // Ohne Konfliktstelle gibt es nichts zu entscheiden, und das Lab gilt
    // sofort als gelöst — dieselbe Lücke, die die Konfliktaufgabe hatte.
    if (konflikte.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['abschnitte'],
        message: 'Kein Abschnitt mit art "konflikt". Ohne Konfliktstelle gibt es nichts zu lösen.',
      });
    }

    // Die Auflösungen werden unter der Kennung geführt. Zweimal dieselbe,
    // und EINE Entscheidung räumte beide Stellen ab: `git add` und
    // `git commit` wurden frei, obwohl die zweite Stelle nie bedacht wurde.
    const gesehen = new Set<string>();
    for (const [i, konflikt] of konflikte.entries()) {
      if (gesehen.has(konflikt.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['abschnitte', i, 'id'],
          message: `Doppelte Konflikt-Kennung "${konflikt.id}".`,
        });
      }
      gesehen.add(konflikt.id);
    }
  });

export type MergeConflictConfig = z.infer<typeof mergeConflictConfigSchema>;
