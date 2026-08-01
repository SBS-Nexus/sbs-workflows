import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/session';
import { CodeLab } from './code-lab';

export const metadata: Metadata = { title: 'Code-Labor' };

export default async function LabPage(): Promise<React.ReactElement> {
  await requireUser();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Code-Labor</h1>
        <p className="mt-3 max-w-prose text-[var(--text-muted)]">
          Ein freier Arbeitsbereich ohne Aufgabe und ohne Bewertung. Zum Ausprobieren, zum Nachbauen
          eines Beispiels aus einer Lektion, oder um eine Vermutung schnell zu prüfen. Genau dieses
          Herumprobieren ist einer der wirksamsten Wege, eine Sprache kennenzulernen.
        </p>
      </header>

      <CodeLab />
    </div>
  );
}
