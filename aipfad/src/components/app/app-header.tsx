'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/server/actions/auth-actions';
import { Icon, type IconName } from '@/components/ui/icon';
import { ShellMenu } from '@/components/app/shell-menu';
import { activeShellHref, shellNav, type ShellArea } from '@/lib/learning-shell';

/**
 * Kopf und Hauptnavigation (Lernpfade-Shell, LP-03A).
 *
 * Bereiche, Reihenfolge, Beschriftung und Routen kommen aus dem gemeinsamen
 * Vertrag (`@/lib/learning-shell`). AIPfad hat keinen Projekt- und keinen
 * Profilbereich; Überblick (`/pfad`) und Fortschritt (`/fortschritt`) bleiben
 * getrennt. Lektionen unter `/lektion/...` gehören zu „Lernen".
 *
 * Unter 640 px liegt die Navigation unten, „Mehr" und Abmelden stehen im
 * Menü oben rechts. Von 640 bis 1279 px steht die Navigation in eigener Zeile
 * und bricht um — die frühere seitlich scrollende Liste hat das aufklappende
 * „Mehr" abgeschnitten. Ab 1280 px passt sie in die Kopfzeile.
 */

/** App-eigene Symbole je Bereich. */
const SYMBOL: Record<ShellArea, IconName | undefined> = {
  overview: 'layers',
  learn: 'book',
  practice: 'terminal',
  projects: undefined,
  review: 'clock',
  progress: 'graphNode',
  profile: undefined,
};

const PRIMARY_NAV = shellNav('ai').map((item) => {
  const icon = SYMBOL[item.id];
  if (!icon) throw new Error(`AIPfad: kein Symbol für den Bereich ${item.id}`);
  return { ...item, icon };
});

/** Weitere Ziele — vorhanden und erreichbar, aber nicht in der Hauptleiste. */
const MORE_NAV: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/wissenslandkarte', label: 'Wissenslandkarte' },
  { href: '/nachschlagen', label: 'Nachschlagen' },
  { href: '/glossar', label: 'Glossar' },
  { href: '/setup', label: 'Setup' },
];

export function AppHeader({ userName }: { userName: string }): React.ReactElement {
  const pathname = usePathname();
  const active = activeShellHref(pathname, PRIMARY_NAV);
  const activeMore = activeShellHref(pathname, MORE_NAV);
  const current = (href: string): 'page' | undefined => (active === href ? 'page' : undefined);

  const moreLinks = (close: () => void): React.ReactNode =>
    MORE_NAV.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        aria-current={activeMore === item.href ? 'page' : undefined}
        className="lp-shell-menu-item"
        onClick={close}
      >
        {item.label}
      </Link>
    ));

  return (
    <>
      <header className="lp-shell lp-shell-header sticky top-0 z-30" data-lp-app="ai">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
          <Link
            href="/pfad"
            className="flex min-h-11 shrink-0 items-center gap-2 font-bold no-underline"
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-xl bg-signal-600 text-sm font-black text-white"
            >
              AI
            </span>
            <span className="hidden sm:inline">AIPfad</span>
            <span className="sr-only sm:hidden">AIPfad</span>
          </Link>

          <nav
            aria-label="Hauptnavigation"
            className="hidden w-full pb-1 sm:order-last sm:block xl:order-none xl:w-auto xl:flex-1 xl:pb-0"
          >
            <ul className="lp-shell-nav-list">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current(item.href)}
                    className="lp-shell-nav-link"
                  >
                    <Icon name={item.icon} size={17} />
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <ShellMenu
                  label={
                    <>
                      Mehr
                      <Icon name="chevronDown" size={14} />
                    </>
                  }
                >
                  {moreLinks}
                </ShellMenu>
              </li>
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <span className="max-w-32 truncate text-sm text-[var(--lp-shell-text-muted)]">
                {userName}
              </span>
              <form action={logoutAction}>
                <button type="submit" className="lp-shell-action">
                  Abmelden
                </button>
              </form>
            </div>
            <ShellMenu
              className="sm:hidden"
              label={
                <>
                  Mehr
                  <Icon name="chevronDown" size={14} />
                </>
              }
            >
              {(close) => (
                <>
                  <p className="lp-shell-menu-heading">Angemeldet als {userName}</p>
                  {moreLinks(close)}
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

      <nav
        aria-label="Hauptnavigation"
        className="lp-shell lp-shell-tabbar fixed inset-x-0 bottom-0 z-30 sm:hidden"
        data-lp-app="ai"
      >
        <ul className="lp-shell-tabbar-list">
          {PRIMARY_NAV.map((item) => (
            <li key={item.href} className="flex-1">
              <Link href={item.href} aria-current={current(item.href)} className="lp-shell-tab">
                <span aria-hidden="true" className="lp-shell-tab-icon">
                  <Icon name={item.icon} size={20} />
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div aria-hidden="true" className="h-16 sm:hidden" />
    </>
  );
}
