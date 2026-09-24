import { z } from 'zod';

/**
 * Kanonischer Vertrag für das Prompt-Reparatur-Lab.
 *
 * Das Lab verweist auf mindestens eine Übungskennung; die referenzielle
 * Existenzprüfung bleibt außerhalb dieses Formvertrags.
 */
export const promptRepairConfigSchema = z.object({
  relatedExerciseSlugs: z.array(z.string()).min(1),
});

export type PromptRepairConfig = z.infer<typeof promptRepairConfigSchema>;
