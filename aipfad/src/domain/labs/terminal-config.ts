import { z } from 'zod';

/**
 * Kanonischer Vertrag für das Terminal-Lab.
 *
 * Dieselbe Form wird von der Maske und von `validateCourseGraph()` gelesen.
 * Die Regeln entsprechen bewusst dem bisherigen Laufzeitvertrag: E01B zieht
 * die Prüfung nach vorn, statt nebenbei die akzeptierte Inhaltsform zu ändern.
 */
export const terminalConfigSchema = z.object({
  startingDirectory: z.string(),
  fileSystem: z.record(z.string(), z.string().nullable()),
  allowedCommands: z.array(z.string()),
  dangerousCommands: z.array(z.string()),
});

export type TerminalConfig = z.infer<typeof terminalConfigSchema>;
