import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { isEnabled } from '@/server/feature-flags';
import { Card } from '@/components/ui/primitives';
import { AcceptInvitationForm } from './accept-invitation-form';

export const metadata: Metadata = { title: 'Einladung' };

/**
 * Einlösen einer Einladung.
 *
 * Der Beitritt passiert bewusst erst auf Knopfdruck und nicht schon beim
 * Öffnen des Links. Zum einen ist der Beitritt zu einer Organisation eine
 * Entscheidung, die man sehen sollte, bevor sie wirksam wird. Zum anderen
 * würden Link-Vorschauen in Messengern die Einladung sonst im Vorbeigehen
 * einlösen.
 *
 * Die Seite liegt im angemeldeten Bereich: Wer nicht angemeldet ist, wird zur
 * Anmeldung geführt und landet danach wieder hier.
 */
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<React.ReactElement> {
  const { token } = await params;
  // Abschaltbar für Installationen, die ausschließlich Einzelkonten führen.
  if (!isEnabled('ORGANISATIONEN')) notFound();
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Einladung</h1>
      <p className="mt-2 text-[var(--text-muted)]">
        Du bist als {user.name} angemeldet. Mit dem Beitritt wirst du Mitglied einer Organisation.
      </p>

      <Card className="mt-6">
        <h2 className="text-base font-semibold">Was das bedeutet</h2>
        <ul className="mt-2 ml-5 list-disc space-y-1 text-[0.9375rem]">
          <li>
            Lehrkräfte der Organisation sehen den Stand ihrer Kohorte als Summenwert – etwa, an
            welchem Konzept die Gruppe hängt.
          </li>
          <li>
            Dein persönlicher Verlauf bleibt privat. Namentlich erscheinst du nur, wenn du das im
            Profil ausdrücklich erlaubst, und du kannst es jederzeit zurücknehmen.
          </li>
          <li>Einzelne Versuche, Zeiten und Fehlermeldungen sieht niemand außer dir.</li>
        </ul>

        <div className="mt-5">
          <AcceptInvitationForm token={token} />
        </div>
      </Card>
    </div>
  );
}
