import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Konto anlegen' };

export default async function RegisterPage(): Promise<React.ReactElement> {
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
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Konto anlegen</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Du brauchst nur eine E-Mail-Adresse und ein Passwort. Es werden keine weiteren Daten
          abgefragt.
        </p>
      </div>

      <RegisterForm />

      <p className="mt-6 text-sm text-[var(--text-muted)]">
        Schon ein Konto?{' '}
        <Link href="/anmelden" className="font-medium text-[var(--accent)] underline">
          Hier anmelden
        </Link>
      </p>
    </main>
  );
}
