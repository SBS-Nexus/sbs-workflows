import Link from 'next/link';
import { ButtonLink } from '@/components/ui/primitives';

export function SiteHeader(): React.ReactElement {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg-raised)]">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight no-underline">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-lg bg-signal-600 text-sm font-black text-white"
          >
            AI
          </span>
          <span>AIPfad</span>
        </Link>

        <nav
          aria-label="Hauptnavigation"
          className="order-3 flex w-full items-center gap-1 overflow-x-auto text-sm font-semibold sm:order-none sm:w-auto"
        >
          <Link
            href="/lernen"
            className="whitespace-nowrap rounded-lg px-3 py-2 no-underline text-[var(--fg-muted)] hover:bg-ink-100 hover:text-[var(--fg)] dark:hover:bg-ink-800"
          >
            Lernen
          </Link>
          <Link
            href="/nachschlagen"
            className="whitespace-nowrap rounded-lg px-3 py-2 no-underline text-[var(--fg-muted)] hover:bg-ink-100 hover:text-[var(--fg)] dark:hover:bg-ink-800"
          >
            Nachschlagen
          </Link>
          <Link
            href="/setup"
            className="whitespace-nowrap rounded-lg px-3 py-2 no-underline text-[var(--fg-muted)] hover:bg-ink-100 hover:text-[var(--fg)] dark:hover:bg-ink-800"
          >
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
