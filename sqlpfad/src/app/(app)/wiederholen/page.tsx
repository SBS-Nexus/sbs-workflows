import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Wiederholen' };

/**
 * Wiederholen.
 *
 * Solange keine Inhalte eingespielt sind, sagt diese Seite genau das. Ein
 * ausgedachter Beispielinhalt wäre bequemer zu bauen und würde die erste
 * ehrliche Frage der Lernenden - „ist das echt?" - mit Nein beantworten.
 */
export default function Seite(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">Wiederholen</h1>
        <p className="mt-2 text-lg text-[var(--text-muted)]">
          Was ansteht, richtet sich nach deinem Verlauf – nicht nach dem Kalender und nicht nach
          einer Serie, die reißen kann.
        </p>
      </div>

      <EmptyState
        title="Nichts fällig"
        description="Wiederholungen entstehen aus bearbeiteten Aufgaben. Solange du noch keine bearbeitet hast, ist hier nichts zu tun – das ist kein Rückstand."
      />
    </div>
  );
}
