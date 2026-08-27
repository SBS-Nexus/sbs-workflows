import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/site-header';
import { ContextGraph } from '@/components/context-graph';
import { concepts } from '@/content/concepts';

export const metadata: Metadata = {
  title: 'Wissenslandkarte',
  description: 'Alle Konzepte dieser Ausbaustufe und wie sie aufeinander aufbauen.',
  alternates: { canonical: '/wissenslandkarte' },
};

export default function WissenslandkartePage(): React.ReactElement {
  return (
    <>
      <SiteHeader />
      <main id="hauptinhalt" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
          Wissenslandkarte
        </p>
        <h1 className="mt-2 font-mono text-3xl font-bold tracking-tight">
          Jedes Konzept baut auf einem anderen auf
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
          {concepts.length} Konzepte,{' '}
          {concepts.filter((c) => (c.prerequisiteSlugs ?? []).length === 0).length} davon ohne
          Voraussetzung. Kein Diagramm zur Zierde — jede Linie ist eine echte Voraussetzung, jeder
          Knoten führt zum Begriff im Glossar.
        </p>

        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-raised)] p-4 sm:p-6">
          <ContextGraph concepts={concepts} basePath="/glossar" />
        </div>

        <p className="mt-6 max-w-2xl text-sm text-[var(--fg-muted)]">
          Alphabetische Liste stattdessen? Sieh dir das{' '}
          <a href="/glossar" className="font-medium text-signal-500 underline underline-offset-4">
            Glossar
          </a>{' '}
          an.
        </p>
      </main>
    </>
  );
}
