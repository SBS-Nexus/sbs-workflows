import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { AuroraBackdrop } from '@/components/marketing/hero-visual';

/**
 * Rahmen für Anmeldung und Registrierung.
 *
 * Links eine farbige Fläche mit dem Versprechen, rechts das Formular. Die
 * farbige Seite verschwindet auf schmalen Bildschirmen vollständig – dort zählt
 * jeder Millimeter für das Formular, und ein Zierbild, das man wegscrollen
 * muss, um ein Passwortfeld zu erreichen, wäre eine Zumutung.
 *
 * Das Formular steht links im Quelltext, damit es auch ohne Stilangaben zuerst
 * gelesen wird; die Anordnung auf dem Bildschirm macht `lg:order-*`.
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
  /** Drei kurze Aussagen für die farbige Seite. */
  punkte: readonly string[];
}): ReactNode {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main
        id="hauptinhalt"
        className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:order-1 lg:px-16"
      >
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 text-lg font-bold tracking-tight"
          >
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-modul-3)] to-[var(--color-modul-0)] text-white transition-transform group-hover:scale-105"
            >
              <Icon name="schritte" size={20} />
            </span>
            PythonPfad
          </Link>

          <h1 className="mt-8 text-3xl font-black leading-tight tracking-tight">{title}</h1>
          <p className="mt-2 text-[var(--text-muted)]">{intro}</p>

          <div className="mt-8">{children}</div>

          <p className="mt-6 text-sm text-[var(--text-muted)]">{footer}</p>
        </div>
      </main>

      <aside
        aria-hidden="true"
        className="gradient-hero relative isolate hidden overflow-hidden p-12 text-white lg:order-2 lg:flex lg:flex-col lg:justify-center"
      >
        <AuroraBackdrop />
        <div className="relative z-10 max-w-sm">
          <p className="text-display-sm font-black leading-[1.05] tracking-[-0.02em]">
            Deine erste
            <br />
            <span className="bg-gradient-to-r from-[#7ee2b8] to-[#93c5fd] bg-clip-text text-transparent">
              Zeile Code
            </span>
            <br />
            ist gleich hier.
          </p>
          <ul className="mt-10 space-y-4">
            {punkte.map((punkt) => (
              <li key={punkt} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Icon name="haken" size={14} />
                </span>
                <span className="text-white/85">{punkt}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
