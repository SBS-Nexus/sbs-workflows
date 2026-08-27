import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { AuthShell } from '@/components/marketing/auth-shell';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Anmelden', alternates: { canonical: '/anmelden' } };

export default async function LoginPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (user) redirect('/pfad');

  return (
    <AuthShell
      title="Anmelden"
      intro="Weiter, wo du aufgehört hast."
      punkte={[
        'Dein Fortschritt wartet genau da, wo du ihn gelassen hast.',
        'Wiederholungen richten sich nach deinem Verlauf, nicht nach dem Kalender.',
        'Keine Streaks, kein Punktestand geht verloren, wenn du ein paar Tage nicht da warst.',
      ]}
      footer={
        <>
          Noch kein Konto?{' '}
          <Link
            href="/registrieren"
            className="font-bold text-signal-500 underline underline-offset-4"
          >
            Konto anlegen
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
