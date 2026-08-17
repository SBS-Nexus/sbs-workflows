'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/icon';
import { BRAND } from '@/lib/brand';
import { cx } from '@/components/ui/primitives';

/**
 * Hauptnavigation des angemeldeten Bereichs.
 *
 * Fünf Ziele, mehr nicht. Eine Navigation, die alles anbietet, hilft bei
 * nichts – und die Stelle, an der man gerade steht, ist wichtiger als die
 * Stellen, an denen man stehen könnte.
 *
 * Die aktive Seite wird nicht nur farbig markiert, sondern trägt
 * `aria-current="page"`. Farbe allein wäre für Screenreader gar keine und für
 * einen Teil der Sehenden keine verlässliche Auskunft (WCAG 1.4.1).
 */

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
 * @param istAdmin Blendet die Redaktion ein. Ausdrücklich **keine**
 *   Zugangskontrolle – die steht in `requireAdmin` auf dem Server. Wer den
 *   Pfad kennt, tippt ihn ohnehin; ein fehlender Link hält niemanden auf.
 *   Er hält nur die Leiste für alle anderen frei von einem Ziel, das ihnen
 *   nichts sagt.
 */
export function AppNav({ istAdmin = false }: { istAdmin?: boolean }): React.ReactElement {
  const pfad = usePathname();
  const ziele = istAdmin ? [...ZIELE, REDAKTION] : ZIELE;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface-raised)]/85 backdrop-blur">
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

        <nav aria-label="Hauptbereiche" className="min-w-0 flex-1">
          <ul className="flex items-center gap-1 overflow-x-auto">
            {ziele.map((ziel) => {
              const aktiv = pfad === ziel.href || pfad.startsWith(`${ziel.href}/`);
              return (
                <li key={ziel.href}>
                  <Link
                    href={ziel.href}
                    {...(aktiv ? { 'aria-current': 'page' as const } : {})}
                    className={cx(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap',
                      aktiv
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--surface-sunken)]',
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
      </div>
    </header>
  );
}
