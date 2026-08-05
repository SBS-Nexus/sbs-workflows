import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/session';
import { placementQuestions } from '@/content/placement';
import { PlacementQuiz } from './placement-quiz';
import { Schrittanzeige } from '@/components/ui/schrittanzeige';
import { heroGradient, moduleTheme } from '@/domain/design/module-theme';
import { EckBoegen } from '@/components/ui/zierformen';

export const metadata: Metadata = { title: 'Einstufung' };

/**
 * Die Fragen werden ohne die richtigen Antworten an den Browser gegeben.
 * Ausgewertet wird ausschließlich auf dem Server.
 */
export default async function PlacementPage(): Promise<React.ReactElement> {
  await requireUser();

  const publicQuestions = placementQuestions.map((question) => ({
    id: question.id,
    area: question.area,
    question: question.question,
    ...(question.code !== undefined ? { code: question.code } : {}),
    options: question.options.map((option) => ({ id: option.id, text: option.text })),
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header
        style={{ backgroundImage: heroGradient(moduleTheme(3)) }}
        className="relative isolate mb-8 overflow-hidden rounded-3xl p-6 text-white sm:p-8 muster-raster-hell muster-verlauf"
      >
        <EckBoegen
          farbe="#ffffff"
          className="pointer-events-none absolute -right-4 -top-8 -z-10 size-56 opacity-70"
        />
        <Schrittanzeige aktuell={2} />
        <h1 className="mt-4 text-display-sm font-black leading-tight tracking-[-0.02em]">
          Kurze Einstufung
        </h1>
        <p className="mt-3 max-w-prose text-white/80">
          Acht Fragen, kein Zeitlimit. Die ersten kommen ganz ohne Programmierbegriffe aus. „Weiß
          ich noch nicht“ ist überall eine gleichwertige Antwort und wird nicht schlechter bewertet
          als ein Rateversuch.
        </p>
        <p className="mt-2 max-w-prose text-white/80">
          Das Ergebnis entscheidet nicht darüber, was du lernen darfst – es bestimmt nur, wie
          ausführlich einzelne Lektionen für dich aufbereitet werden.
        </p>
      </header>

      <PlacementQuiz questions={publicQuestions} />
    </div>
  );
}
