'use server';

import { z } from 'zod';
import { requireUser } from '@/server/auth/session';
import { recordLabAttempt } from '@/server/services/lab-service';

/**
 * Auch hier wird die Eingabe geprüft, nicht nur durchgereicht: `result` landet
 * unverändert in einer `Json`-Spalte, und `unknown` hieß bisher, dass jede
 * angemeldete Person beliebig große, beliebig geformte Daten ablegen konnte
 * (Code-Review auf PR #29). Die Labs schicken tatsächlich nur einen
 * Zeitstempel — mehr wird deshalb auch nicht angenommen.
 */
const labSlugSchema = z.string().min(1).max(200);
const labResultSchema = z.object({ completedAt: z.iso.datetime() });

export async function recordLabCompletionAction(labSlug: string, result: unknown): Promise<void> {
  const user = await requireUser();
  await recordLabAttempt(
    user.id,
    labSlugSchema.parse(labSlug),
    labResultSchema.parse(result),
    true,
  );
}
