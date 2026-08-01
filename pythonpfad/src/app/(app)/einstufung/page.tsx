import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/session';
import { placementQuestions } from '@/content/placement';
import { PlacementQuiz } from './placement-quiz';

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
      <header className="mb-8">
        <p className="text-sm font-semibold text-[var(--accent)]">Schritt 2 von 2</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Kurze Einstufung</h1>
        <p className="mt-3 text-[var(--text-muted)]">
          Acht Fragen, kein Zeitlimit. Die ersten kommen ganz ohne Programmierbegriffe aus. „Weiß
          ich noch nicht“ ist überall eine gleichwertige Antwort und wird nicht schlechter bewertet
          als ein Rateversuch.
        </p>
        <p className="mt-2 text-[var(--text-muted)]">
          Das Ergebnis entscheidet nicht darüber, was du lernen darfst – es bestimmt nur, wie
          ausführlich einzelne Lektionen für dich aufbereitet werden.
        </p>
      </header>

      <PlacementQuiz questions={publicQuestions} />
    </div>
  );
}
