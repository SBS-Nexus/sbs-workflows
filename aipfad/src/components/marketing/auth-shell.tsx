import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

/**
 * Rahmen für Anmeldung und Registrierung.
 *
 * Bewusst KEIN Gradient-/Aurora-Verlauf auf der Nebenseite (das ist die
 * PythonPfad-Handschrift und genau das generische "AI-Hero"-Muster, das
 * DESIGN.md ausschließt). Stattdessen eine ruhige, papierfarbene Fläche mit
 * denselben Datenblatt-Listen wie der Rest der Seite.
 */
export function AuthShell({
  title,
  intro,
  children,
  footer,
  punkte,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  punkte: readonly string[];
}): ReactNode {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main id="hauptinhalt" className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="font-mono text-lg font-bold tracking-tight">
            aipfad<span className="text-signal-500">_</span>
          </Link>

          <h1 className="mt-8 font-mono text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-[var(--fg-muted)]">{intro}</p>

          <div className="mt-8">{children}</div>

          <p className="mt-6 text-sm text-[var(--fg-muted)]">{footer}</p>
        </div>
      </main>

      <aside
        aria-hidden="true"
        className="hidden border-l border-[var(--border)] bg-ink-100 p-12 lg:flex lg:flex-col lg:justify-center dark:bg-ink-900"
      >
        <div className="max-w-sm">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
            Was dich erwartet
          </p>
          <ul className="mt-6 space-y-4">
            {punkte.map((punkt) => (
              <li key={punkt} className="flex items-start gap-3 text-[var(--fg)]">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-signal-500 text-signal-600 dark:text-signal-300">
                  <Icon name="check" size={14} />
                </span>
                <span>{punkt}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
