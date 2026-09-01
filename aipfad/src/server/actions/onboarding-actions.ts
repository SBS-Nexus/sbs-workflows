'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import {
  completeOnboarding,
  onboardingSchema,
  skipPlacement,
} from '@/server/services/onboarding-service';

export interface OnboardingFormState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function submitOnboardingAction(
  _previous: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const user = await requireUser();

  const parsed = onboardingSchema.safeParse({
    learningGoal: formData.get('learningGoal'),
    experience: formData.get('experience'),
    dailyTimeBudget: formData.get('dailyTimeBudget'),
    pace: formData.get('pace'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  await completeOnboarding(user.id, parsed.data);
  redirect('/pfad');
}

/**
 * Die Einstufung selbst ist ein dokumentierter nächster Schritt, sobald das
 * Placement-Instrument aus der Stufe-0-Inhalte vorliegt (siehe
 * docs/LEHRPLAN.md). Bis dahin markiert dieser Pfad die Einstufung als
 * übersprungen, statt eine leere Seite zu zeigen.
 */
export async function skipPlacementAction(): Promise<void> {
  const user = await requireUser();
  await skipPlacement(user.id);
  redirect('/pfad');
}
