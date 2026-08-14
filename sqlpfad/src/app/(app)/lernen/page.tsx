import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Lernen' };

/**
 * Lernpfad.
 *
 * Solange keine Inhalte eingespielt sind, sagt diese Seite genau das. Ein
 * ausgedachter Beispielinhalt wäre bequemer zu bauen und würde die erste
 * ehrliche Frage der Lernenden - „ist das echt?" - mit Nein beantworten.
 */
export default function Seite(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">Lernpfad</h1>
        <p className="mt-2 text-lg text-[var(--text-muted)]">
          Hier steht dein Lernpfad: Lektionen in der Reihenfolge, die zu deinen Angaben passt.
        </p>
      </div>

      <EmptyState
        title="Noch keine Lektionen eingespielt"
        description="Auf dieser Installation sind noch keine Inhalte vorhanden. Sobald sie eingespielt sind, beginnt hier dein Weg."
      />
    </div>
  );
}
