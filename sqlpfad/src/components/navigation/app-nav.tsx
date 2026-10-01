'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { BRAND } from '@/lib/brand';
import { cx } from '@/components/ui/primitives';
import { logoutAction } from '@/server/actions/auth-actions';

const ZIELE: ReadonlyArray<{ href: string; label: string; icon: IconName }> = [
  { href: '/fortschritt', label: 'Überblick', icon: 'fortschritt' },
  { href: '/lernen', label: 'Lernen', icon: 'lernen' },
  { href: '/ueben', label: 'Üben', icon: 'ueben' },
  { href: '/projekte', label: 'Projekte', icon: 'projekte' },
  { href: '/wiederholen', label: 'Wiederholen', icon: 'wiederholen' },
  { href: '/profil', label: 'Profil', icon: 'profil' },
];

const REDAKTION = { href: '/admin', label: 'Redaktion', icon: 'karte' } as const;

/**
 * SQLPfad folgt demselben Shell-Vertrag wie PythonPfad:
 *
 * - Desktop: Markenfläche, primäre Bereiche, Darstellung und Konto oben.
 * - Mobil: dieselben Kernbereiche als Daumen-Navigation am unteren Rand.
 * - Aktiver Zustand zusätzlich über aria-current, nie nur über Farbe.
 *
 * Die fachliche Leitfarbe bleibt SQL-spezifisch; Struktur und Interaktion sind
 * plattformweit dieselben.
 */
export function AppNav({
  userName,
  istAdmin = false,
  dueReviews = 0,
}: {
  userName: string;
  istAdmin?: boolean;
  dueReviews?: number;
}): React.ReactElement {
  const pfad = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const desktopZiele = istAdmin ? [...ZIELE, REDAKTION] : ZIELE;

  const istAktiv = (href: string): boolean => pfad === href || pfad.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface-raised)]">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/fortschritt" className="flex shrink-0 items-center gap-2 font-bold">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent-600)] to-[var(--color-accent-800)] text-white"
            >
              <Icon name="karte" size={18} />
            </span>
            <span className="hidden sm:inline">{BRAND.name}</span>
          </Link>

          <nav aria-label="Hauptnavigation" className="hidden min-w-0 flex-1 sm:block">
            <ul className="flex items-center gap-1">
              {desktopZiele.map((ziel) => {
                const aktiv = istAktiv(ziel.href);
                return (
                  <li key={ziel.href}>
                    <Link
                      href={ziel.href}
                      aria-current={aktiv ? 'page' : undefined}
                      className={cx(
                        'flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold',
                        aktiv
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]',
                      )}
                    >
                      <Icon name={ziel.icon} size={18} />
                      {ziel.label}
                      {ziel.href === '/wiederholen' && dueReviews > 0 ? (
                        <span className="rounded-full bg-[var(--accent)] px-1.5 text-xs font-bold text-white">
                          {dueReviews}
                          <span className="sr-only"> fällige Wiederholungen</span>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm font-medium"
              >
                <span className="max-w-24 truncate sm:max-w-32">{userName}</span>
                <Icon name="runter" size={14} />
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1 shadow-lg"
                >
                  <Link
                    href="/profil"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded px-3 py-2 text-sm hover:bg-[var(--surface-sunken)]"
                  >
                    Profil und Einstellungen
                  </Link>

                  {istAdmin ? (
                    <Link
                      href="/admin"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded px-3 py-2 text-sm hover:bg-[var(--surface-sunken)] sm:hidden"
                    >
                      Redaktion
                    </Link>
                  ) : null}

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

      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface-raised)] sm:hidden"
      >
        <ul className="flex">
          {ZIELE.map((ziel) => {
            const aktiv = istAktiv(ziel.href);
            return (
              <li key={ziel.href} className="flex-1">
                <Link
                  href={ziel.href}
                  aria-current={aktiv ? 'page' : undefined}
                  className={cx(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.6875rem] font-bold',
                    aktiv ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'relative flex size-9 items-center justify-center rounded-2xl',
                      aktiv && 'bg-[var(--accent-soft)]',
                    )}
                  >
                    <Icon name={ziel.icon} size={21} />
                    {ziel.href === '/wiederholen' && dueReviews > 0 ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="absolute right-1 top-1 size-2 rounded-full bg-[var(--accent)]"
                        />
                        <span className="sr-only">{dueReviews} fällige Wiederholungen</span>
                      </>
                    ) : null}
                  </span>
                  <span>{ziel.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
