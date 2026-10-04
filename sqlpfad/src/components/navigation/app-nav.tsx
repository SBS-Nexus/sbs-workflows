'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/icon';
import { BRAND } from '@/lib/brand';
import { cx } from '@/components/ui/primitives';
import { ThemeToggle } from '@/components/ui/theme-toggle';
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

export function AppNav({
  userName,
  istAdmin = false,
}: {
  userName: string;
  istAdmin?: boolean;
}): React.ReactElement {
  const pfad = usePathname();
  const ziele = istAdmin ? [...ZIELE, REDAKTION] : ZIELE;

  const istAktiv = (href: string): boolean => pfad === href || pfad.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface-raised)]">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/fortschritt" className="flex shrink-0 items-center gap-2 font-bold">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent-600)] to-[var(--color-accent-800)] text-white"
            >
              <Icon name="karte" size={18} />
            </span>
            <span className="hidden sm:inline">{BRAND.name}</span>
          </Link>

          <nav aria-label="Hauptnavigation" className="hidden min-w-0 flex-1 sm:block">
            <ul className="flex items-center gap-1 overflow-x-auto">
              {ziele.map((ziel) => {
                const aktiv = istAktiv(ziel.href);
                return (
                  <li key={ziel.href}>
                    <Link
                      href={ziel.href}
                      aria-current={aktiv ? 'page' : undefined}
                      className={cx(
                        'flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition-colors',
                        aktiv
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]',
                      )}
                    >
                      <Icon name={ziel.icon} size={18} />
                      {ziel.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/profil"
              className="hidden min-h-10 max-w-36 items-center rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)] md:flex"
            >
              <span className="truncate">{userName}</span>
            </Link>
            <form action={logoutAction} className="hidden md:block">
              <button
                type="submit"
                className="min-h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]"
              >
                Abmelden
              </button>
            </form>
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
                      'flex size-9 items-center justify-center rounded-2xl',
                      aktiv && 'bg-[var(--accent-soft)]',
                    )}
                  >
                    <Icon name={ziel.icon} size={22} />
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
