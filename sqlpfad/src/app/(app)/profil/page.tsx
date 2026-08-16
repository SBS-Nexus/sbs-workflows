import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { logoutAction } from '@/server/actions/auth-actions';
import { Button, Card, SectionHeading } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Profil' };

const ERFAHRUNG: Record<string, string> = {
  NONE: 'Noch nie mit Datenbanken gearbeitet',
  SPREADSHEETS_ONLY: 'Tabellenkalkulation, kein SQL',
  READS_QUERIES: 'Liest fremde Abfragen',
  WRITES_SIMPLE_QUERIES: 'Schreibt einfache Abfragen',
  OTHER_SQL_DIALECT: 'SQL aus einem anderen System',
};

export default async function ProfilPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  // Die Sitzung trägt nur, was auf jeder Seite gebraucht wird. Die Angaben aus
  // dem Einstieg werden hier gelesen, statt sie in jede Sitzung zu packen.
  const angaben = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { experience: true, dailyTimeBudget: true },
  });

  return (
    <div className="space-y-10">
      <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">Profil</h1>

      <section aria-labelledby="konto">
        <SectionHeading id="konto">Konto</SectionHeading>
        <Card>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Name</dt>
              <dd className="font-medium">{user.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--text-muted)]">E-Mail-Adresse</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Vorkenntnisse</dt>
              <dd className="font-medium">{ERFAHRUNG[angaben.experience] ?? angaben.experience}</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Geplante Zeit am Tag</dt>
              <dd className="font-medium">{angaben.dailyTimeBudget} Minuten</dd>
            </div>
          </dl>
        </Card>
      </section>

      <section aria-labelledby="sitzung">
        <SectionHeading id="sitzung">Sitzung</SectionHeading>
        <Card>
          <p className="text-[var(--text-muted)]">
            Beim Abmelden wird die Sitzung auf dem Server gelöscht, nicht nur im Browser. Ein
            kopiertes Cookie nützt danach niemandem mehr etwas.
          </p>
          <form action={logoutAction} className="mt-4">
            <Button type="submit" variant="ghost">
              Abmelden
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
