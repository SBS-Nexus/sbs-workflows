import Link from 'next/link';
import { ButtonLink } from '@/components/ui/primitives';

/**
 * Kopfzeile der öffentlichen Seiten.
 *
 * `aufDunkel` setzt sie auf die Tinte des Learning OS (Roadmap E3), damit sie
 * auf der Startseite mit dem dunklen Kopfbereich darunter eine Fläche bildet –
 * wie bei SQLPfad und PythonPfad. Die übrigen öffentlichen Seiten behalten die
 * helle Kopfzeile auf Papier.
 */
export function SiteHeader({ aufDunkel = false }: { aufDunkel?: boolean }): React.ReactElement {
  const navLink = aufDunkel
    ? 'whitespace-nowrap rounded-lg px-3 py-2 no-underline text-[var(--fg-muted)] hover:bg-white/10 hover:text-[var(--fg)]'
    : 'whitespace-nowrap rounded-lg px-3 py-2 no-underline text-[var(--fg-muted)] hover:bg-ink-100 hover:text-[var(--fg)] dark:hover:bg-ink-800';

  return (
    <header
      className={
        aufDunkel
          ? 'los-dunkel border-b border-white/10 bg-[#0b0e0e]'
          : 'border-b border-[var(--border)] bg-[var(--bg-raised)]'
      }
    >
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
          <Link href="/lernen" className={navLink}>
            Lernen
          </Link>
          <Link href="/nachschlagen" className={navLink}>
            Nachschlagen
          </Link>
          <Link href="/setup" className={navLink}>
            Setup
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href="/anmelden" variant={aufDunkel ? 'onDarkGhost' : 'ghost'} size="sm">
            Anmelden
          </ButtonLink>
          <ButtonLink href="/registrieren" variant={aufDunkel ? 'onDark' : 'primary'} size="sm">
            Kostenlos starten
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
