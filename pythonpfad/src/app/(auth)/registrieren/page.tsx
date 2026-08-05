import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { AuthShell } from '@/components/marketing/auth-shell';
import { RegisterForm } from './register-form';

export const metadata: Metadata = {
  title: 'Konto anlegen',
  alternates: { canonical: '/registrieren' },
};

export default async function RegisterPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (user) redirect('/lernen');

  return (
    <AuthShell
      title="Konto anlegen"
      intro="Du brauchst nur eine E-Mail-Adresse und ein Passwort. Es werden keine weiteren Daten abgefragt."
      punkte={[
        'Python läuft in deinem Browser – nichts wird installiert.',
        'Nach einer kurzen Einstufung bekommst du einen Pfad, der zu dir passt.',
        'Deine Daten kannst du jederzeit vollständig exportieren oder löschen.',
      ]}
      footer={
        <>
          Schon ein Konto?{' '}
          <Link href="/anmelden" className="font-bold text-[var(--accent)] underline">
            Hier anmelden
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
