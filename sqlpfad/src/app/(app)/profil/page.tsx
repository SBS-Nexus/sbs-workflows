import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { logoutAction } from '@/server/actions/auth-actions';
import { Button, Card, SectionHeading } from '@/components/ui/primitives';
import { LernangabenForm } from '@/components/profil/lernangaben-form';
import { DarstellungForm } from '@/components/profil/darstellung-form';
import { PasswortForm } from '@/components/profil/passwort-form';
import { KontoLoeschen } from '@/components/profil/konto-loeschen';
import type { Theme } from '@/lib/preferences/appearance';

export const metadata: Metadata = { title: 'Profil' };

/**
 * Das Profil.
 *
 * Die Angaben aus dem Einstieg stehen hier nicht nur, sie lassen sich auch
 * ändern – vorher waren sie einmalig, und wer sich beim Einstieg
 * unterschätzt hatte, blieb dabei.
 *
 * Farbschema und Bewegungsreduktion werden am Konto gespeichert und nicht nur
 * im Browser. Für die Bewegungsreduktion ist das mehr als Bequemlichkeit: Sie
 * ist eine Barrierefreiheitseinstellung und soll der Person folgen, nicht dem
 * Gerät.
 */
export default async function ProfilPage(): Promise<React.ReactElement> {
  const user = await requireUser();

  // Die Sitzung trägt nur, was auf jeder Seite gebraucht wird. Die Angaben aus
  // dem Einstieg werden hier gelesen, statt sie in jede Sitzung zu packen.
  const angaben = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      experience: true,
      learningGoal: true,
      dailyTimeBudget: true,
      pace: true,
      theme: true,
      reduceMotion: true,
      createdAt: true,
    },
  });

  const theme: Theme =
    angaben.theme === 'light' || angaben.theme === 'dark' ? angaben.theme : 'system';

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
              <dt className="text-sm text-[var(--text-muted)]">Dabei seit</dt>
              <dd className="font-medium">
                {angaben.createdAt.toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </Card>
      </section>

      <section aria-labelledby="lernangaben">
        <SectionHeading id="lernangaben">Deine Angaben</SectionHeading>
        <p className="mb-4 text-[0.95rem] text-[var(--text-muted)]">
          Selbstauskunft, kein Testergebnis. Sie steuern die Reihenfolge und die Beispiele – sie
          sperren nichts.
        </p>
        <Card>
          <LernangabenForm
            experience={angaben.experience}
            learningGoal={angaben.learningGoal}
            dailyTimeBudget={angaben.dailyTimeBudget}
            pace={angaben.pace}
          />
        </Card>
      </section>

      <section aria-labelledby="darstellung">
        <SectionHeading id="darstellung">Darstellung</SectionHeading>
        <p className="mb-4 text-[0.95rem] text-[var(--text-muted)]">
          Wirkt sofort und wird am Konto gespeichert – also auch auf anderen Geräten.
        </p>
        <Card>
          <DarstellungForm theme={theme} reduceMotion={angaben.reduceMotion} />
        </Card>
      </section>

      <section aria-labelledby="passwort">
        <SectionHeading id="passwort">Passwort</SectionHeading>
        <Card>
          <PasswortForm />
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

      <section aria-labelledby="loeschen">
        <SectionHeading id="loeschen">Konto löschen</SectionHeading>
        <Card className="border-2 border-[var(--alert)]">
          <KontoLoeschen />
        </Card>
      </section>
    </div>
  );
}
