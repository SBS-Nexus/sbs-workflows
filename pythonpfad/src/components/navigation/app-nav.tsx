'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { logoutAction } from '@/server/actions/auth-actions';
import { Kbd, cx } from '@/components/ui/primitives';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useCommandCenter } from '@/components/navigation/command-center';
import { Icon } from '@/components/ui/icon';
import { VollSymbol, type VollSymbolName } from '@/components/ui/icon-voll';
import {
  PROJECT_THEME,
  REVIEW_THEME,
  type ModuleTheme,
  moduleTheme,
  themeStyle,
} from '@/domain/design/module-theme';

/**
 * Hauptnavigation.
 *
 * Auf schmalen Bildschirmen liegt sie als Leiste am unteren Rand – dort sind
 * die Ziele mit dem Daumen erreichbar. Ab `sm` wandert sie nach oben.
 * Beide Varianten nutzen dieselbe Liste und dasselbe `aria-current`.
 */

/*
 * Jeder Bereich hat eine eigene Farbe – dieselbe, die auch im Kopfbereich der
 * Seite steht. Beim Wechsel sieht man dadurch schon in der Navigation, wohin
 * es geht, und nach dem Wechsel bestätigt die Seite die Farbe.
 */
const ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  icon: VollSymbolName;
  theme: ModuleTheme;
}> = [
  { href: '/lernen', label: 'Lernen', icon: 'lernen', theme: moduleTheme(0) },
  { href: '/ueben', label: 'Üben', icon: 'ueben', theme: moduleTheme(1) },
  { href: '/projekte', label: 'Projekte', icon: 'projekte', theme: PROJECT_THEME },
  { href: '/wiederholen', label: 'Wiederholen', icon: 'wiederholen', theme: REVIEW_THEME },
  { href: '/fortschritt', label: 'Fortschritt', icon: 'fortschritt', theme: moduleTheme(3) },
  { href: '/profil', label: 'Profil', icon: 'profil', theme: moduleTheme(2) },
];

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
      {/*
       * Deckende Fläche, kein `backdrop-filter`.
       *
       * Eine durchscheinende, weichgezeichnete Kopfleiste sieht gut aus, kostet
       * aber dauerhaft: Weil die Leiste klebt und über die ganze Breite geht,
       * muss der Browser bei jedem Bildaufbau den Bereich dahinter erneut
       * weichzeichnen. Auf schwächeren Geräten ruckelt dadurch das Scrollen der
       * ganzen Anwendung – gemessen an einem Testlauf, in dem darüber sogar
       * Serveraufrufe ins Zeitlimit liefen. Der Gewinn stand in keinem
       * Verhältnis dazu.
       */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface-raised)]">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/lernen"
            className="group flex shrink-0 items-center gap-2 text-base font-bold tracking-tight"
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-modul-3)] to-[var(--color-modul-0)] text-[var(--text-inverse)] transition-transform group-hover:scale-105"
            >
              <Icon name="schritte" size={18} />
            </span>
            PythonPfad
          </Link>

          <nav aria-label="Hauptnavigation" className="hidden flex-1 sm:block">
            <ul className="flex items-center gap-1">
              {ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    style={themeStyle(item.theme)}
                    className={cx(
                      'group/nav flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors',
                      isActive(item.href)
                        ? 'bg-[var(--akzent-soft)] text-[var(--akzent)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--akzent)]',
                    )}
                  >
                    {/*
                     * Das Symbol behält seine Bereichsfarbe auch dann, wenn der
                     * Eintrag nicht aktiv ist. Nur die Beschriftung wird grau.
                     * Andernfalls wäre die Leiste im Ruhezustand wieder eine
                     * Reihe grauer Zeichen – also genau das, was hier weg
                     * sollte. Die Farbe ist zugleich die schnellste
                     * Orientierung: Wer die Bereichsfarbe einmal kennt, findet
                     * den Eintrag, ohne zu lesen.
                     */}
                    <span className="text-[var(--akzent)] transition-transform group-hover/nav:scale-110">
                      <VollSymbol name={item.icon} size={19} />
                    </span>
                    {item.label}
                    {item.href === '/wiederholen' && dueReviews > 0 ? (
                      <span className="rounded-full bg-[var(--akzent)] px-1.5 text-xs font-bold text-[var(--text-inverse)]">
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
                    style={themeStyle(moduleTheme(0))}
                    className={cx(
                      'group/nav flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors',
                      isActive('/admin')
                        ? 'bg-[var(--akzent-soft)] text-[var(--akzent)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--akzent)]',
                    )}
                  >
                    <span className="text-[var(--akzent)] transition-transform group-hover/nav:scale-110">
                      <VollSymbol name="karte" size={19} />
                    </span>
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
              <Icon name="suchen" size={16} />
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
                <Icon name="runter" size={14} />
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
                style={themeStyle(item.theme)}
                className={cx(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.6875rem] font-bold',
                  isActive(item.href) ? 'text-[var(--akzent)]' : 'text-[var(--text-muted)]',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    'relative flex size-9 items-center justify-center rounded-2xl leading-none transition-colors',
                    isActive(item.href) && 'bg-[var(--akzent-soft)]',
                  )}
                >
                  <Icon name={item.icon} size={22} />
                  {item.href === '/wiederholen' && dueReviews > 0 ? (
                    <span className="absolute right-1 top-1 size-2 rounded-full bg-[var(--akzent)]" />
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
