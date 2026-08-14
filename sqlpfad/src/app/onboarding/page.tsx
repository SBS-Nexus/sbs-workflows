import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = { title: 'Einstieg' };

/**
 * Diese Seite liegt bewusst außerhalb der Gruppe `(app)`.
 *
 * Deren Layout schickt alle, die den Einstieg noch nicht abgeschlossen haben,
 * hierher. Läge die Seite selbst darin, verwiese sie auf sich selbst – eine
 * Weiterleitungsschleife, die den Browser abbrechen lässt.
 */
export default async function OnboardingPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');
  if (user.onboardingCompleted) redirect('/fortschritt');

  return (
    <div className="min-h-dvh">
      <main id="hauptinhalt" className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]">
          Vier kurze Fragen
        </p>
        <h1 className="mt-3 text-display-sm font-black leading-tight tracking-[-0.02em]">
          Schön, dass du da bist, {user.name.split(' ')[0]}.
        </h1>
        <p className="mt-4 text-lg text-[var(--text-muted)]">
          Damit der Weg zu dir passt. Du kannst alles später im Profil ändern – und keine Antwort
          verschließt dir etwas.
        </p>

        <div className="mt-10">
          <OnboardingForm />
        </div>
      </main>
    </div>
  );
}
