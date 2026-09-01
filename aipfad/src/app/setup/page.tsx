import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/site-header';
import { SectionHeading } from '@/components/ui/primitives';
import { CommandCard } from '@/components/setup/command-card';
import { SETUP_SECTIONS } from '@/content/setup-commands';

export const metadata: Metadata = {
  title: 'Setup',
  description: 'Terminal, VS Code, Node.js und Python einrichten — mit Erklärung zu jedem Befehl.',
  alternates: { canonical: '/setup' },
};

export default function SetupPage(): React.ReactElement {
  return (
    <>
      <SiteHeader />
      <main id="hauptinhalt" className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
          Setup-Center · macOS
        </p>
        <h1 className="mt-2 font-mono text-3xl font-bold tracking-tight">
          Dein technischer Arbeitsplatz
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
          Zu jedem Befehl steht, was er tatsächlich tut, ob er das Netzwerk braucht und ob er sich
          rückgängig machen lässt. Windows und Linux folgen in einer späteren Ausbaustufe.
        </p>

        <div className="mt-10 space-y-12">
          {SETUP_SECTIONS.map((section) => (
            <section key={section.slug} aria-labelledby={`abschnitt-${section.slug}`}>
              <SectionHeading id={`abschnitt-${section.slug}`} description={section.summary}>
                {section.title}
              </SectionHeading>
              <div className="space-y-3">
                {section.commands.map((command) => (
                  <CommandCard key={command.command} command={command} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
