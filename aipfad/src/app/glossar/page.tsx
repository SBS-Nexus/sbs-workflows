import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/site-header';
import { Badge } from '@/components/ui/primitives';
import { concepts } from '@/content/concepts';

export const metadata: Metadata = {
  title: 'Glossar',
  description: 'Alle AI-Begriffe dieser Ausbaustufe, alphabetisch.',
  alternates: { canonical: '/glossar' },
};

export default function GlossarPage(): React.ReactElement {
  const sorted = [...concepts].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return (
    <>
      <SiteHeader />
      <main id="hauptinhalt" className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
          Glossar
        </p>
        <h1 className="mt-2 font-mono text-3xl font-bold tracking-tight">Begriffe von A bis Z</h1>
        <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
          {sorted.length} Begriffe aus dieser Ausbaustufe. Der vollständige AIPfad-Lehrplan bringt
          deutlich mehr — sieh dir <code className="font-mono text-sm">docs/LEHRPLAN.md</code> an.
        </p>

        <dl className="mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {sorted.map((concept) => (
            <div key={concept.slug} id={concept.slug} className="scroll-mt-20 py-5">
              <dt className="flex flex-wrap items-center gap-2 font-mono text-base font-semibold">
                {concept.name}
                <Badge tone="neutral">Stufe {concept.difficulty}</Badge>
              </dt>
              <dd className="mt-1.5 text-sm text-[var(--fg-muted)]">{concept.description}</dd>
            </div>
          ))}
        </dl>
      </main>
    </>
  );
}
