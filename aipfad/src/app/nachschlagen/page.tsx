import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/site-header';
import { ReferenceSearch } from '@/components/nachschlagen/reference-search';
import { buildReferenceIndex } from '@/lib/reference-index';

export const metadata: Metadata = {
  title: 'Nachschlagen',
  description: 'Terminalbefehle und AI-Begriffe schnell nachschlagen.',
  alternates: { canonical: '/nachschlagen' },
};

export default function NachschlagenPage(): React.ReactElement {
  const entries = buildReferenceIndex();

  return (
    <>
      <SiteHeader />
      <main id="hauptinhalt" className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
          Nachschlagen
        </p>
        <h1 className="mt-2 font-mono text-3xl font-bold tracking-tight">
          Schnell finden statt neu lernen
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
          Alle Terminalbefehle und AI-Begriffe dieser Ausbaustufe an einem Ort. Die Suche findet
          auch dann, wenn Umlaute fehlen.
        </p>

        <div className="mt-8">
          <ReferenceSearch entries={entries} />
        </div>
      </main>
    </>
  );
}
