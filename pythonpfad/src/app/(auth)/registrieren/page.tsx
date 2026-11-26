import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { zentraleAnmeldungAktiv } from '@/server/auth/zentral';
import { sicheresZiel } from '@/server/auth/zentral-zustand';
import { AuthShell } from '@/components/marketing/auth-shell';
import { RegisterForm } from './register-form';

export const metadata: Metadata = {
  title: 'Konto anlegen',
  alternates: { canonical: '/registrieren' },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  const ziel = sicheresZiel((await searchParams).ziel);
  if (user) redirect(ziel ?? '/lernen');

  // E4.4: Mit dem Schalter läuft die Registrierung über das gemeinsame Konto.
  if (zentraleAnmeldungAktiv()) {
    const parameter = new URLSearchParams({ modus: 'registrieren', ...(ziel ? { ziel } : {}) });
    redirect(`/auth/anmelden${parameter.size ? `?${parameter}` : ''}`);
  }

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
