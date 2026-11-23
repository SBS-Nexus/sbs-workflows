'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/icon';
import { BRAND } from '@/lib/brand';
import { activeShellHref, shellNav, type ShellArea } from '@/lib/learning-shell';
import { ShellMenu } from '@/components/navigation/shell-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { logoutAction } from '@/server/actions/auth-actions';

/**
 * Hauptnavigation (Lernpfade-Shell, LP-03A).
 *
 * Bereiche, Reihenfolge, Beschriftung und Routen kommen aus dem gemeinsamen
 * Vertrag (`@/lib/learning-shell`). Unter 640 px liegt die Navigation unten;
 * von 640 bis 1279 px steht sie in eigener Zeile und bricht um, statt
 * versteckt seitlich zu scrollen; ab 1280 px passt sie in die Kopfzeile.
 * Konto und Abmelden sind unterhalb von `md` über das Konto-Menü erreichbar.
 */

/** App-eigene Symbole je Bereich. */
const SYMBOL: Record<ShellArea, IconName | undefined> = {
  overview: 'fortschritt',
  learn: 'lernen',
  practice: 'ueben',
  projects: 'projekte',
  review: 'wiederholen',
  progress: undefined,
  profile: 'profil',
};

const ZIELE = shellNav('sql').map((ziel) => {
  const icon = SYMBOL[ziel.id];
  if (!icon) throw new Error(`SQLPfad: kein Symbol für den Bereich ${ziel.id}`);
  return { ...ziel, icon };
});

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
  const aktiv = activeShellHref(pfad, ziele);
  const aktuell = (href: string): 'page' | undefined => (aktiv === href ? 'page' : undefined);

  return (
    <>
      <header className="lp-shell lp-shell-header sticky top-0 z-40" data-lp-app="sql">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
          <Link href="/fortschritt" className="flex min-h-11 shrink-0 items-center gap-2 font-bold">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent-600)] to-[var(--color-accent-800)] text-white"
            >
              <Icon name="karte" size={18} />
            </span>
            <span className="hidden sm:inline">{BRAND.name}</span>
            <span className="sr-only sm:hidden">{BRAND.name}</span>
          </Link>

          <nav
            aria-label="Hauptnavigation"
            className="hidden w-full pb-1 sm:order-last sm:block xl:order-none xl:w-auto xl:flex-1 xl:pb-0"
          >
            <ul className="lp-shell-nav-list">
              {ziele.map((ziel) => (
                <li key={ziel.href}>
                  <Link
                    href={ziel.href}
                    aria-current={aktuell(ziel.href)}
                    className="lp-shell-nav-link"
                  >
                    <Icon name={ziel.icon} size={18} />
                    {ziel.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden md:block">
              <Link
                href="/profil"
                className="lp-shell-action max-w-36 text-[var(--lp-shell-text-muted)]"
              >
                <span className="truncate">{userName}</span>
              </Link>
            </div>
            <form action={logoutAction} className="hidden md:block">
              <button type="submit" className="lp-shell-action">
                Abmelden
              </button>
            </form>
            <ShellMenu
              className="md:hidden"
              label={
                <>
                  Konto
                  <Icon name="profil" size={16} />
                </>
              }
            >
              {(close) => (
                <>
                  <p className="lp-shell-menu-heading">Angemeldet als {userName}</p>
                  <Link
                    href="/profil"
                    aria-current={aktuell('/profil')}
                    className="lp-shell-menu-item"
                    onClick={close}
                  >
                    Profil und Einstellungen
                  </Link>
                  {istAdmin ? (
                    <div className="sm:hidden">
                      <Link
                        href={REDAKTION.href}
                        aria-current={aktuell(REDAKTION.href)}
                        className="lp-shell-menu-item"
                        onClick={close}
                      >
                        {REDAKTION.label}
                      </Link>
                    </div>
                  ) : null}
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
        className="lp-shell lp-shell-tabbar fixed inset-x-0 bottom-0 z-40 sm:hidden"
        data-lp-app="sql"
      >
        <ul className="lp-shell-tabbar-list">
          {ZIELE.map((ziel) => (
            <li key={ziel.href} className="flex-1">
              <Link href={ziel.href} aria-current={aktuell(ziel.href)} className="lp-shell-tab">
                <span aria-hidden="true" className="lp-shell-tab-icon">
                  <Icon name={ziel.icon} size={22} />
                </span>
                <span>{ziel.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
