import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { isExternalAiConfigured } from '@/server/env';
import { SettingsForm } from './settings-form';
import { DataControls } from './data-controls';
import { FeedbackSettings } from '@/components/feedback/feedback-settings';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { ConsentControls } from '@/components/organisation/consent-controls';
import { listOwnCohorts } from '@/server/services/organisation-service';

export const metadata: Metadata = { title: 'Profil und Einstellungen' };

export default async function ProfilePage(): Promise<React.ReactElement> {
  const user = await requireUser();

  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      learningGoal: true,
      dailyTimeBudget: true,
      pace: true,
      theme: true,
      reduceMotion: true,
      aiTutorConsent: true,
      createdAt: true,
      placementScore: true,
    },
  });

  const externalAi = isExternalAiConfigured();
  const eigeneKohorten = await listOwnCohorts(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profil und Einstellungen</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Angemeldet als {profile.email}. Konto angelegt am{' '}
          {new Intl.DateTimeFormat('de-DE', { dateStyle: 'long' }).format(profile.createdAt)}.
        </p>
      </header>

      <SettingsForm
        defaults={{
          name: profile.name,
          learningGoal: profile.learningGoal,
          dailyTimeBudget: profile.dailyTimeBudget,
          pace: profile.pace,
          theme: profile.theme,
          reduceMotion: profile.reduceMotion,
          aiTutorConsent: profile.aiTutorConsent,
        }}
        externalAiConfigured={externalAi}
      />

      <FeedbackSettings />

      <section aria-labelledby="kohorten">
        <SectionHeading
          id="kohorten"
          description="Wenn du zu einer Kohorte gehörst, entscheidest du hier, was deine Lehrkräfte sehen. Ohne deine Freigabe erscheinst du in keiner namentlichen Ansicht."
        >
          Kohorten und Sichtbarkeit
        </SectionHeading>
        <ConsentControls cohorts={eigeneKohorten} />
      </section>

      <section aria-labelledby="daten">
        <SectionHeading
          id="daten"
          description="Du entscheidest, was mit deinen Daten passiert. Beide Funktionen wirken sofort."
        >
          Deine Daten
        </SectionHeading>
        <DataControls />
      </section>

      <section aria-labelledby="datenschutz">
        <SectionHeading id="datenschutz">Was gespeichert wird</SectionHeading>
        <Card>
          <dl className="space-y-4 text-[0.95rem]">
            <div>
              <dt className="font-medium">Zum Konto</dt>
              <dd className="text-[var(--text-muted)]">
                Name, E-Mail-Adresse und ein Passwort-Hash. Das Passwort selbst wird nirgends
                gespeichert und lässt sich aus dem Hash nicht zurückrechnen.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Zum Lernen</dt>
              <dd className="text-[var(--text-muted)]">
                Deine Abgaben samt eingereichtem Code, Ergebnis, Fehlerart, genutzten Hinweisen und
                Bearbeitungsdauer. Daraus entstehen dein Kompetenzstand und dein Wiederholungsplan.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Zur Produktverbesserung</dt>
              <dd className="text-[var(--text-muted)]">
                Anonyme Ereignisse wie „Lektion abgeschlossen“ – ohne Bezug zu deinem Konto und auf
                den Tag gerundet. Diese Daten lassen sich dir nicht zuordnen.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Was nicht gespeichert wird</dt>
              <dd className="text-[var(--text-muted)]">
                Der Text deiner Reflexionen in Lektionen und der Inhalt deiner Tutor-Fragen. Es gibt
                keine Werbekennungen und keine Weitergabe an Dritte.
              </dd>
            </div>
          </dl>
        </Card>
      </section>
    </div>
  );
}
