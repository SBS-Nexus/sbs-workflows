'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/server/actions/auth-actions';
import { Kbd } from '@/components/ui/primitives';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useCommandCenter } from '@/components/navigation/command-center';
import { ShellMenu } from '@/components/navigation/shell-menu';
import { Icon } from '@/components/ui/icon';
import { VollSymbol, type VollSymbolName } from '@/components/ui/icon-voll';
import { activeShellHref, shellNav, type ShellArea } from '@/lib/learning-shell';
import {
  PROJECT_THEME,
  REVIEW_THEME,
  type ModuleTheme,
  moduleTheme,
  themeStyle,
} from '@/domain/design/module-theme';

/**
 * Hauptnavigation (Lernpfade-Shell, LP-03A).
 *
 * Bereiche, Reihenfolge, Beschriftung und Routen kommen aus dem gemeinsamen
 * Vertrag (`@/lib/learning-shell`); eine Liste speist Kopf und untere Leiste.
 * Unter 640 px liegt die Navigation als Leiste am unteren Rand — mit dem
 * Daumen erreichbar. Von 640 bis 1279 px steht sie in eigener Zeile unter der
 * Marke und bricht um, statt versteckt seitlich zu scrollen; ab 1280 px passt
 * sie in die Kopfzeile.
 */

/*
 * App-eigen bleiben Symbol und Bereichsfarbe: Jeder Bereich hat dieselbe
 * Farbe wie im Kopfbereich der Seite. Das Symbol behält sie auch im
 * Ruhezustand — wer die Farbe kennt, findet den Eintrag, ohne zu lesen.
 */
const LOOK: Record<ShellArea, { icon: VollSymbolName; theme: ModuleTheme } | undefined> = {
  overview: { icon: 'fortschritt', theme: moduleTheme(3) },
  learn: { icon: 'lernen', theme: moduleTheme(0) },
  practice: { icon: 'ueben', theme: moduleTheme(1) },
  projects: { icon: 'projekte', theme: PROJECT_THEME },
  review: { icon: 'wiederholen', theme: REVIEW_THEME },
  progress: undefined,
  profile: { icon: 'profil', theme: moduleTheme(2) },
};

const ITEMS = shellNav('python').map((item) => {
  const look = LOOK[item.id];
  if (!look) throw new Error(`PythonPfad: kein Symbol für den Bereich ${item.id}`);
  return { ...item, ...look };
});

const REDAKTION = { href: '/admin', label: 'Redaktion' } as const;

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
  const { openPalette, openShortcuts } = useCommandCenter();
  const active = activeShellHref(pathname, isAdmin ? [...ITEMS, REDAKTION] : ITEMS);
  const current = (href: string): 'page' | undefined => (active === href ? 'page' : undefined);

  const dueBadge = (
    <span className="lp-shell-badge">
      {dueReviews}
      <span className="sr-only"> fällige Wiederholungen</span>
    </span>
  );

  return (
    <>
      {/*
       * Deckende Fläche, kein `backdrop-filter`: Eine klebende, weichgezeichnete
       * Leiste über die ganze Breite muss bei jedem Bildaufbau neu
       * weichgezeichnet werden und ließ auf schwächeren Geräten das Scrollen
       * ruckeln. Der Gewinn stand in keinem Verhältnis dazu.
       */}
      <header className="lp-shell lp-shell-header sticky top-0 z-30" data-lp-app="python">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
          <Link
            href="/lernen"
            className="group flex min-h-11 shrink-0 items-center gap-2 text-base font-bold tracking-tight"
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-modul-3)] to-[var(--color-modul-0)] text-[var(--text-inverse)] transition-transform group-hover:scale-105"
            >
              <Icon name="schritte" size={18} />
            </span>
            PythonPfad
          </Link>

          <nav
            aria-label="Hauptnavigation"
            className="hidden w-full pb-1 sm:order-last sm:block xl:order-none xl:w-auto xl:flex-1 xl:pb-0"
          >
            <ul className="lp-shell-nav-list">
              {ITEMS.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={current(item.href)}
                    style={themeStyle(item.theme)}
                    className="lp-shell-nav-link group/nav"
                  >
                    <span className="text-[var(--akzent)] transition-transform group-hover/nav:scale-110">
                      <VollSymbol name={item.icon} size={19} />
                    </span>
                    {item.label}
                    {item.id === 'review' && dueReviews > 0 ? dueBadge : null}
                  </Link>
                </li>
              ))}
              {isAdmin ? (
                <li>
                  <Link
                    href={REDAKTION.href}
                    aria-current={current(REDAKTION.href)}
                    style={themeStyle(moduleTheme(0))}
                    className="lp-shell-nav-link group/nav"
                  >
                    <span className="text-[var(--akzent)] transition-transform group-hover/nav:scale-110">
                      <VollSymbol name="karte" size={19} />
                    </span>
                    {REDAKTION.label}
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/*
             * Sichtbarer Einstieg in die Befehlspalette. Ohne ihn wäre die
             * Funktion nur denen bekannt, die das Kürzel ohnehin schon kennen.
             * Unterhalb von `md` steht derselbe Einstieg im Menü.
             */}
            <div className="hidden md:block">
              <button type="button" onClick={openPalette} className="lp-shell-action">
                <Icon name="suchen" size={16} />
                <span>Suchen</span>
                <Kbd>Strg K</Kbd>
              </button>
            </div>
            <ThemeToggle />
            <ShellMenu
              label={
                <>
                  <span className="max-w-20 truncate sm:max-w-28">{userName}</span>
                  <Icon name="runter" size={14} />
                </>
              }
            >
              {(close) => (
                <>
                  <p className="lp-shell-menu-heading">Angemeldet als {userName}</p>
                  <Link href="/profil" className="lp-shell-menu-item" onClick={close}>
                    Profil und Einstellungen
                  </Link>
                  <Link href="/labor" className="lp-shell-menu-item" onClick={close}>
                    Code-Labor
                  </Link>
                  <Link href="/organisation" className="lp-shell-menu-item" onClick={close}>
                    Organisationen
                  </Link>
                  {isAdmin ? (
                    <div className="sm:hidden">
                      <Link
                        href={REDAKTION.href}
                        aria-current={current(REDAKTION.href)}
                        className="lp-shell-menu-item"
                        onClick={close}
                      >
                        {REDAKTION.label}
                      </Link>
                    </div>
                  ) : null}
                  <div className="md:hidden">
                    <button
                      type="button"
                      className="lp-shell-menu-item"
                      onClick={() => {
                        close();
                        openPalette();
                      }}
                    >
                      Suchen und springen
                    </button>
                  </div>
                  <button
                    type="button"
                    className="lp-shell-menu-item"
                    onClick={() => {
                      close();
                      openShortcuts();
                    }}
                  >
                    Tastaturkürzel
                  </button>
                  <form action={logoutAction}>
                    <button type="submit" className="lp-shell-menu-item">
                      Abmelden
                    </button>
                  </form>
                </>
              )}
            </ShellMenu>
          </div>
        </div>
      </header>

      {/* Mobile Navigation am unteren Rand */}
      <nav
        aria-label="Hauptnavigation"
        className="lp-shell lp-shell-tabbar fixed inset-x-0 bottom-0 z-30 sm:hidden"
        data-lp-app="python"
      >
        <ul className="lp-shell-tabbar-list">
          {ITEMS.map((item) => (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                aria-current={current(item.href)}
                style={themeStyle(item.theme)}
                className="lp-shell-tab"
              >
                <span className="lp-shell-tab-icon">
                  <span aria-hidden="true" className="leading-none">
                    <Icon name={item.icon} size={22} />
                  </span>
                  {item.id === 'review' && dueReviews > 0 ? dueBadge : null}
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
