'use server';

import { requireUser } from '@/server/auth/session';
import { recordLabAttempt } from '@/server/services/lab-service';

export async function recordLabCompletionAction(labSlug: string, result: unknown): Promise<void> {
  const user = await requireUser();
  await recordLabAttempt(user.id, labSlug, result, true);
}
