'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import {
  finalisiereOnboarding,
  onboardingSchema,
  platzierungSchema,
  PlatzierungUngueltig,
  type OnboardingErgebnis,
} from '@/server/services/onboarding-service';

export interface OnboardingFormState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  ergebnis?: OnboardingErgebnis;
}

/**
 * Schließt Einstellungen und Einstufung in einem Schritt ab.
 *
 * Die Kennung des Kontos kommt aus der Sitzung, nie aus der Eingabe: Eine
 * mitgeschickte `userId` wäre eine Einladung, den Zustand eines anderen
 * Kontos zu ändern. Ebenso wird keine Punktzahl entgegengenommen — der
 * Server bewertet die Antworten selbst.
 */
export async function abschliessenAction(
  _previous: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const user = await requireUser();

  // Wer schon fertig ist, fängt nicht versehentlich von vorne an: Ein
  // erneutes Absenden dürfte sonst eine vorhandene Einstufung überschreiben.
  if (user.onboardingCompleted) redirect('/pfad');

  const einstellungen = onboardingSchema.safeParse({
    learningGoal: formData.get('learningGoal'),
    experience: formData.get('experience'),
    dailyTimeBudget: formData.get('dailyTimeBudget'),
    pace: formData.get('pace'),
  });

  if (!einstellungen.success) {
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        einstellungen.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const roh = formData.get('platzierung');
  let platzierung;
  try {
    platzierung = platzierungSchema.parse(JSON.parse(typeof roh === 'string' ? roh : '""'));
  } catch {
    return { ok: false, error: 'Die Antworten der Einstufung waren unvollständig.' };
  }

  try {
    const ergebnis = await finalisiereOnboarding(user.id, einstellungen.data, platzierung);
    return { ok: true, ergebnis };
  } catch (fehler) {
    // Die Eingabe bleibt in der Maske stehen — wer hier scheitert, soll nicht
    // acht Fragen neu beantworten müssen.
    if (fehler instanceof PlatzierungUngueltig) {
      return { ok: false, error: 'Diese Antworten passen nicht zu den Fragen der Einstufung.' };
    }
    return {
      ok: false,
      error: 'Das Speichern hat nicht geklappt. Versuch es bitte noch einmal.',
    };
  }
}
