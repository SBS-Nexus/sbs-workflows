import { z } from 'zod';

/**
 * Kanonischer Vertrag für das Tokenizer-Lab.
 *
 * Eine Quelle für Renderpfad und Inhaltsprüfung; damit fällt ein fehlendes
 * Beispiel bereits beim Content-Build auf und nicht erst beim Seitenaufruf.
 */
export const tokenizerConfigSchema = z.object({
  examples: z.array(z.object({ text: z.string(), tokens: z.array(z.string()) })).min(1),
});

export type TokenizerConfig = z.infer<typeof tokenizerConfigSchema>;
