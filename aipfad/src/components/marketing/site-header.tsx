import Link from 'next/link';
import { ButtonLink } from '@/components/ui/primitives';

export function SiteHeader(): React.ReactElement {
  return (
    <header className="border-b border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-6">
        <Link href="/" className="font-mono text-lg font-bold tracking-tight">
          aipfad<span className="text-signal-500">_</span>
        </Link>
        <nav
          aria-label="Hauptnavigation"
          className="order-3 flex w-full items-center gap-5 font-mono text-sm sm:order-none sm:w-auto sm:gap-6"
        >
          <Link href="/lernen" className="hover:text-signal-600 dark:hover:text-signal-300">
            Lernen
          </Link>
          <Link href="/nachschlagen" className="hover:text-signal-600 dark:hover:text-signal-300">
            Nachschlagen
          </Link>
          <Link href="/setup" className="hover:text-signal-600 dark:hover:text-signal-300">
            Setup
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/anmelden" variant="ghost" size="sm">
            Anmelden
          </ButtonLink>
          <ButtonLink href="/registrieren" variant="primary" size="sm">
            Kostenlos starten
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
