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
  if (user) redirect('/pfad');

  return (
    <AuthShell
      title="Konto anlegen"
      intro="Du brauchst nur eine E-Mail-Adresse und ein Passwort. Es werden keine weiteren Daten abgefragt."
      punkte={[
        'Alle Übungen und Labs sind deterministisch — keine Übertragung an externe AI-Anbieter.',
        'Nach einer kurzen Einstufung bekommst du einen Pfad, der zu dir passt.',
        'Deine Daten kannst du jederzeit vollständig exportieren oder löschen.',
      ]}
      footer={
        <>
          Schon ein Konto?{' '}
          <Link href="/anmelden" className="font-bold text-signal-500 underline underline-offset-4">
            Hier anmelden
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
