import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Anmelden' };

export default async function LoginPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (user) redirect('/lernen');

  return (
    <main
      id="hauptinhalt"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12"
    >
      <div className="mb-8">
        <Link href="/" className="text-lg font-bold tracking-tight">
          PythonPfad
        </Link>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Anmelden</h1>
        <p className="mt-2 text-[var(--text-muted)]">Weiter, wo du aufgehört hast.</p>
      </div>

      <LoginForm />

      <p className="mt-6 text-sm text-[var(--text-muted)]">
        Noch kein Konto?{' '}
        <Link href="/registrieren" className="font-medium text-[var(--accent)] underline">
          Konto anlegen
        </Link>
      </p>
    </main>
  );
}
