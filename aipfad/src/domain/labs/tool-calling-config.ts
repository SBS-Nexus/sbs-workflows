import { z } from 'zod';
import { pruefeSimuliertenToolAufruf, pruefeStrukturierteAusgabe } from '@/domain/tool-calling/vertrag';

/** Redaktionell begrenzte Beispiele. Kein Provider, kein Netzwerk. */
const beispiel = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  titel: z.string().min(5),
  erklaerung: z.string().min(20),
  json: z.string().min(2).max(2000),
  erwartetGueltig: z.boolean(),
});

export const toolCallingConfigSchema = z
  .object({
    betriebsart: z.literal('offline-deterministisch'),
    strukturierteAusgaben: z.array(beispiel).min(2).max(8),
    werkzeugAufrufe: z.array(beispiel).min(2).max(8),
  })
  .strict()
  .superRefine((cfg, ctx) => {
    for (const [name, liste, pruefen] of [
      ['strukturierteAusgaben', cfg.strukturierteAusgaben, pruefeStrukturierteAusgabe],
      ['werkzeugAufrufe', cfg.werkzeugAufrufe, pruefeSimuliertenToolAufruf],
    ] as const) {
      const ids = new Set<string>();
      for (const [index, e] of liste.entries()) {
        if (ids.has(e.id)) {
          ctx.addIssue({ code: 'custom', path: [name, index, 'id'], message: 'Doppelte Beispielkennung.' });
        }
        ids.add(e.id);
        if (pruefen(e.json).ok !== e.erwartetGueltig) {
          ctx.addIssue({
            code: 'custom',
            path: [name, index, 'erwartetGueltig'],
            message: 'Die redaktionelle Erwartung stimmt nicht mit dem tatsächlichen Validator überein.',
          });
        }
      }
      if (!liste.some((e) => e.erwartetGueltig) || !liste.some((e) => !e.erwartetGueltig)) {
        ctx.addIssue({ code: 'custom', path: [name], message: 'Jeweils gültige UND ungültige Beispiele erforderlich.' });
      }
    }
  });

export type ToolCallingConfig = z.infer<typeof toolCallingConfigSchema>;
