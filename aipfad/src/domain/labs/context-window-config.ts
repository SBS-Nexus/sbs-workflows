import { z } from 'zod';

/** Kanonischer Vertrag für das deterministische Kontextfenster-Lab. */
export const contextWindowConfigSchema = z.object({
  windowSizeTokens: z.number(),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      text: z.string(),
      tokens: z.number(),
    }),
  ),
});

export type ContextWindowConfig = z.infer<typeof contextWindowConfigSchema>;
