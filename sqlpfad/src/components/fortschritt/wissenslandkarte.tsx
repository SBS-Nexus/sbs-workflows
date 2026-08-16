import { Card } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/icon';
import { beschreibeStand, type Kompetenz, type Kompetenzstand } from '@/domain/aufgabe/kompetenz';

/**
 * Die Wissenslandkarte.
 *
 * Ein Wort je Konzept und die Zahlen, aus denen es entsteht – keine Prozente,
 * keine Ringe, die sich füllen. Wer hier „wackelig" liest, soll nachzählen
 * können, warum.
 *
 * Die Farben tragen die Aussage nicht allein (WCAG 1.4.1): Neben jedem Punkt
 * steht das Wort, und jeder Stand hat ein eigenes Zeichen.
 */

const DARSTELLUNG: Record<
  Kompetenzstand,
  { wort: string; icon: IconName; farbe: string; flaeche: string }
> = {
  ungeuebt: {
    wort: 'Noch offen',
    icon: 'kreis',
    farbe: 'text-[var(--text-muted)]',
    flaeche: 'bg-[var(--surface-sunken)]',
  },
  angefangen: {
    wort: 'Angefangen',
    icon: 'schritte',
    farbe: 'text-[var(--accent)]',
    flaeche: 'bg-[var(--accent-soft)]',
  },
  wackelig: {
    wort: 'Wackelig',
    icon: 'info',
    farbe: 'text-[var(--caution)]',
    flaeche: 'bg-[var(--caution-soft)]',
  },
  sitzt: {
    wort: 'Sitzt',
    icon: 'haken',
    farbe: 'text-[var(--success)]',
    flaeche: 'bg-[var(--success-soft)]',
  },
  'nicht-beurteilbar': {
    wort: 'Braucht den Server',
    icon: 'schloss',
    farbe: 'text-[var(--text-muted)]',
    flaeche: 'bg-[var(--surface-sunken)]',
  },
};

export interface KonzeptZeile {
  slug: string;
  titel: string;
  beschreibung: string;
  kompetenz: Kompetenz;
}

export function Wissenslandkarte({
  konzepte,
}: {
  konzepte: readonly KonzeptZeile[];
}): React.ReactElement {
  return (
    <ul aria-label="Wissenslandkarte" className="mt-4 grid gap-3 sm:grid-cols-2">
      {konzepte.map((konzept) => {
        const stil = DARSTELLUNG[konzept.kompetenz.stand];
        return (
          <Card as="li" key={konzept.slug}>
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${stil.flaeche} ${stil.farbe}`}
              >
                <Icon name={stil.icon} size={16} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h3 className="font-bold tracking-tight">{konzept.titel}</h3>
                  <span className={`text-xs font-bold uppercase tracking-widest ${stil.farbe}`}>
                    {stil.wort}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {beschreibeStand(konzept.kompetenz)}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </ul>
  );
}
