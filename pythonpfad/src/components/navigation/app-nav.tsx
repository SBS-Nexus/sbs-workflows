'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { logoutAction } from '@/server/actions/auth-actions';
import { Kbd, cx } from '@/components/ui/primitives';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useCommandCenter } from '@/components/navigation/command-center';

/**
 * Hauptnavigation.
 *
 * Auf schmalen Bildschirmen liegt sie als Leiste am unteren Rand – dort sind
 * die Ziele mit dem Daumen erreichbar. Ab `sm` wandert sie nach oben.
 * Beide Varianten nutzen dieselbe Liste und dasselbe `aria-current`.
 */

const ITEMS = [
  { href: '/lernen', label: 'Lernen', icon: '◆' },
  { href: '/ueben', label: 'Üben', icon: '◇' },
  { href: '/projekte', label: 'Projekte', icon: '▣' },
  { href: '/wiederholen', label: 'Wiederholen', icon: '↺' },
  { href: '/fortschritt', label: 'Fortschritt', icon: '▤' },
  { href: '/profil', label: 'Profil', icon: '☺' },
] as const;

export function AppNav({
  userName,
  isAdmin,
  dueReviews,
}: {
  userName: string;
  isAdmin: boolean;
  dueReviews: number;
}): React.ReactElement {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { openPalette, openShortcuts } = useCommandCenter();

  const isActive = (href: string): boolean => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface-raised)]">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/lernen" className="shrink-0 text-base font-bold tracking-tight">
            PythonPfad
          </Link>

          <nav aria-label="Hauptnavigation" className="hidden flex-1 sm:block">
            <ul className="flex items-center gap-1">
              {ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cx(
                      'flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]',
                    )}
                  >
                    {item.label}
                    {item.href === '/wiederholen' && dueReviews > 0 ? (
                      <span className="rounded-full bg-[var(--accent)] px-1.5 text-xs font-semibold text-[var(--text-inverse)]">
                        {dueReviews}
                        <span className="sr-only"> fällige Wiederholungen</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
              {isAdmin ? (
                <li>
                  <Link
                    href="/admin"
                    aria-current={isActive('/admin') ? 'page' : undefined}
                    className={cx(
                      'flex min-h-10 items-center rounded-lg px-3 text-sm font-medium',
                      isActive('/admin')
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--surface-sunken)]',
                    )}
                  >
                    Redaktion
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/*
             * Sichtbarer Einstieg in die Befehlspalette. Ohne ihn wäre die
             * Funktion nur denen bekannt, die das Kürzel ohnehin schon kennen –
             * eine versteckte Funktion ist für Anfängerinnen und Anfänger keine.
             */}
            <button
              type="button"
              onClick={openPalette}
              className="hidden min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text)] md:flex"
            >
              <span aria-hidden="true">⌕</span>
              <span>Suchen</span>
              <Kbd>Strg K</Kbd>
            </button>
            <ThemeToggle />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm font-medium"
              >
                <span className="max-w-28 truncate">{userName}</span>
                <span aria-hidden="true">▾</span>
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-40 mt-1 w-52 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1 shadow-lg"
                >
                  <Link
                    href="/profil"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded px-3 py-2 text-sm hover:bg-[var(--surface-sunken)]"
                  >
                    Profil und Einstellungen
                  </Link>
                  <Link
                    href="/labor"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded px-3 py-2 text-sm hover:bg-[var(--surface-sunken)]"
                  >
                    Code-Labor
                  </Link>
                  <Link
                    href="/organisation"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded px-3 py-2 text-sm hover:bg-[var(--surface-sunken)]"
                  >
                    Organisationen
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      openPalette();
                    }}
                    className="w-full rounded px-3 py-2 text-left text-sm hover:bg-[var(--surface-sunken)] md:hidden"
                  >
                    Suchen und springen
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      openShortcuts();
                    }}
                    className="w-full rounded px-3 py-2 text-left text-sm hover:bg-[var(--surface-sunken)]"
                  >
                    Tastaturkürzel
                  </button>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      role="menuitem"
                      className="w-full rounded px-3 py-2 text-left text-sm hover:bg-[var(--surface-sunken)]"
                    >
                      Abmelden
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation am unteren Rand */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface-raised)] sm:hidden"
      >
        <ul className="flex">
          {ITEMS.map((item) => (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cx(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.6875rem] font-medium',
                  isActive(item.href) ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
                )}
              >
                <span aria-hidden="true" className="relative text-base leading-none">
                  {item.icon}
                  {item.href === '/wiederholen' && dueReviews > 0 ? (
                    <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-[var(--accent)]" />
                  ) : null}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
