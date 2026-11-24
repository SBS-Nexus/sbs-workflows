import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { zentraleAnmeldungAktiv } from '@/server/auth/zentral';
import { sicheresZiel } from '@/server/auth/zentral-zustand';
import { AuthShell } from '@/components/marketing/auth-shell';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Anmelden', alternates: { canonical: '/anmelden' } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  const ziel = sicheresZiel((await searchParams).ziel);
  if (user) redirect(ziel ?? '/fortschritt');

  // E4.4: Mit dem Schalter läuft die Anmeldung über das gemeinsame Konto.
  if (zentraleAnmeldungAktiv()) {
    const parameter = new URLSearchParams({ ...(ziel ? { ziel } : {}) });
    redirect(`/auth/anmelden${parameter.size ? `?${parameter}` : ''}`);
  }

  return (
    <AuthShell
      title="Anmelden"
      intro="Weiter, wo du aufgehört hast."
      punkte={[
        'Dein Fortschritt wartet genau da, wo du ihn gelassen hast.',
        'Deine Übungsdatenbank steht so, wie du sie verlassen hast – zurücksetzen kannst du sie jederzeit selbst.',
        'Die Wiederholungen richten sich nach deinem Verlauf, nicht nach dem Kalender.',
      ]}
      footer={
        <>
          Noch kein Konto?{' '}
          <Link href="/registrieren" className="font-bold text-[var(--accent)] underline">
            Konto anlegen
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
