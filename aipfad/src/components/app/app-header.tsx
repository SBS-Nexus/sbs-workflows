'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/server/actions/auth-actions';
import { Icon, type IconName } from '@/components/ui/icon';
import { cx } from '@/components/ui/primitives';

const PRIMARY_NAV: ReadonlyArray<{ href: string; label: string; icon: IconName }> = [
  { href: '/pfad', label: 'Überblick', icon: 'layers' },
  { href: '/lernen', label: 'Lernen', icon: 'book' },
  { href: '/labs', label: 'Labs', icon: 'terminal' },
  { href: '/wiederholen', label: 'Wiederholen', icon: 'clock' },
  { href: '/fortschritt', label: 'Fortschritt', icon: 'graphNode' },
];

const MORE_NAV: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/wissenslandkarte', label: 'Wissenslandkarte' },
  { href: '/nachschlagen', label: 'Nachschlagen' },
  { href: '/glossar', label: 'Glossar' },
  { href: '/setup', label: 'Setup' },
];

/**
 * AIPfad folgt demselben Shell-Vertrag wie PythonPfad und SQLPfad:
 *
 * - Desktop: Markenfläche, primäre Lernbereiche und Konto oben.
 * - Mobil: dieselben Kernbereiche als Daumen-Navigation unten.
 * - Fachnavigation bleibt AI-spezifisch; Labs ersetzen hier "Üben".
 */
export function AppHeader({ userName }: { userName: string }): React.ReactElement {
  const pathname = usePathname();

  const isActive = (href: string): boolean => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
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

          <nav aria-label="Hauptnavigation" className="hidden min-w-0 flex-1 sm:block">
            <ul className="flex items-center gap-1">
              {PRIMARY_NAV.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cx(
                        'flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold no-underline',
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
                  <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-[var(--fg-muted)] hover:bg-ink-100 hover:text-[var(--fg)] dark:hover:bg-ink-800">
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

          <details className="relative ml-auto">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold text-[var(--fg-muted)] hover:bg-ink-100 hover:text-[var(--fg)] dark:hover:bg-ink-800">
              <span className="max-w-24 truncate sm:max-w-32">{userName}</span>
              <Icon name="chevronDown" size={14} />
            </summary>
            <div className="absolute right-0 z-50 mt-1 w-52 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-raised)] p-1 shadow-lg">
              <Link
                href="/setup"
                className="block rounded px-3 py-2 text-sm no-underline hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                Setup und Umgebung
              </Link>
              <Link
                href="/nachschlagen"
                className="block rounded px-3 py-2 text-sm no-underline hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                Nachschlagen
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
                >
                  Abmelden
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>

      <nav
        aria-label="Hauptnavigation"
        className="aipfad-mobile-nav fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--bg-raised)] sm:hidden"
      >
        <ul className="flex">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.6875rem] font-bold no-underline',
                    active ? 'text-signal-700 dark:text-signal-200' : 'text-[var(--fg-muted)]',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'flex size-9 items-center justify-center rounded-2xl',
                      active && 'bg-signal-100 dark:bg-signal-900',
                    )}
                  >
                    <Icon name={item.icon} size={20} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
