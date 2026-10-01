'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/server/actions/auth-actions';
import { Icon, type IconName } from '@/components/ui/icon';
import { cx } from '@/components/ui/primitives';

const PRIMARY_NAV: ReadonlyArray<{ href: string; label: string; icon: IconName }> = [
  { href: '/pfad', label: 'Überblick', icon: 'layers' },
  { href: '/lernen', label: 'Lernen', icon: 'book' },
  { href: '/wiederholen', label: 'Wiederholen', icon: 'clock' },
  { href: '/labs', label: 'Labs', icon: 'terminal' },
  { href: '/fortschritt', label: 'Fortschritt', icon: 'graphNode' },
];

const MORE_NAV: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/wissenslandkarte', label: 'Wissenslandkarte' },
  { href: '/nachschlagen', label: 'Nachschlagen' },
  { href: '/glossar', label: 'Glossar' },
  { href: '/setup', label: 'Setup' },
];

/**
 * Gemeinsame Anwendungsshell.
 *
 * Die Fachkomponenten von AIPfad bleiben technisch geprägt; die Navigation
 * folgt dagegen derselben Produktsprache wie PythonPfad und SQLPfad:
 * kompakte Markenfläche, klarer aktiver Zustand, dieselben Bereichsbegriffe
 * und ein getrenntes Nutzermenü.
 */
export function AppHeader({ userName }: { userName: string }): React.ReactElement {
  const pathname = usePathname();

  const isActive = (href: string): boolean =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-raised)]">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/pfad" className="flex shrink-0 items-center gap-2 font-bold no-underline">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-lg bg-signal-600 text-sm font-black text-white"
          >
            AI
          </span>
          <span className="hidden sm:inline">AIPfad</span>
        </Link>

        <nav aria-label="Hauptnavigation" className="min-w-0 flex-1">
          <ul className="flex items-center gap-1 overflow-x-auto">
            {PRIMARY_NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold no-underline',
                      active
                        ? 'bg-signal-100 text-signal-700 dark:bg-signal-900 dark:text-signal-200'
                        : 'text-[var(--fg-muted)] hover:bg-ink-100 hover:text-[var(--fg)] dark:hover:bg-ink-800',
                    )}
                  >
                    <Icon name={item.icon} size={17} />
                    {item.label}
                  </Link>
                </li>
              );
            })}

            <li>
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-[var(--fg-muted)] hover:bg-ink-100 hover:text-[var(--fg)] dark:hover:bg-ink-800">
                  Mehr
                  <Icon name="chevronDown" size={14} />
                </summary>
                <div className="absolute right-0 z-40 mt-2 w-52 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-raised)] py-2 shadow-lg">
                  {MORE_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-2 text-sm no-underline hover:bg-ink-100 dark:hover:bg-ink-800"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </details>
            </li>
          </ul>
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <span className="max-w-32 truncate text-sm text-[var(--fg-muted)]">{userName}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--fg-muted)] hover:bg-ink-100 hover:text-[var(--fg)] dark:hover:bg-ink-800"
            >
              Abmelden
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
