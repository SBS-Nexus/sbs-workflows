import Link from 'next/link';
import { logoutAction } from '@/server/actions/auth-actions';
import { Icon } from '@/components/ui/icon';

const PRIMARY_NAV = [
  { href: '/pfad', label: 'Pfad' },
  { href: '/lernen', label: 'Lernen' },
  { href: '/ueben', label: 'Üben' },
  { href: '/labs', label: 'Labs' },
  { href: '/fortschritt', label: 'Fortschritt' },
] as const;

const MORE_NAV = [
  { href: '/wissenslandkarte', label: 'Wissenslandkarte' },
  { href: '/nachschlagen', label: 'Nachschlagen' },
  { href: '/glossar', label: 'Glossar' },
  { href: '/setup', label: 'Setup' },
] as const;

/**
 * Kopfzeile für angemeldete Bereiche. Fünf gleichwertige Hauptpunkte (siehe
 * DESIGN.md/plan §9 – "nicht 13 gleichwertige Hauptnavigationseinträge"),
 * weitere Bereiche hinter einem nativen `<details>`-Menü ohne JavaScript.
 */
export function AppHeader({ userName }: { userName: string }): React.ReactElement {
  return (
    <header className="border-b border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/pfad" className="font-mono text-lg font-bold tracking-tight">
          aipfad<span className="text-signal-500">_</span>
        </Link>

        <nav
          aria-label="Hauptnavigation"
          className="order-3 flex w-full items-center gap-5 overflow-x-auto font-mono text-sm sm:order-none sm:w-auto sm:gap-6"
        >
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap hover:text-signal-600 dark:hover:text-signal-300"
            >
              {item.label}
            </Link>
          ))}

          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-1 whitespace-nowrap hover:text-signal-600 dark:hover:text-signal-300">
              Mehr
              <Icon name="chevronDown" size={14} />
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-52 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-raised)] py-2 shadow-lg">
              {MORE_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[var(--fg-muted)] sm:inline">{userName}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="font-mono text-sm text-[var(--fg-muted)] underline-offset-4 hover:text-signal-600 hover:underline dark:hover:text-signal-300"
            >
              Abmelden
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
