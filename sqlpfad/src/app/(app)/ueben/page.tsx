import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Üben' };

/**
 * Aufgaben.
 *
 * Solange keine Inhalte eingespielt sind, sagt diese Seite genau das. Ein
 * ausgedachter Beispielinhalt wäre bequemer zu bauen und würde die erste
 * ehrliche Frage der Lernenden - „ist das echt?" - mit Nein beantworten.
 */
export default function Seite(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">Aufgaben</h1>
        <p className="mt-2 text-lg text-[var(--text-muted)]">
          Aufgaben zu dem, was du zuletzt gelernt hast – gemischt, damit du das Erkennen mitübst.
        </p>
      </div>

      <EmptyState
        title="Noch keine Aufgaben verfügbar"
        description="Aufgaben entstehen aus den Lektionen. Sobald Inhalte eingespielt sind, steht hier etwas zu tun."
      />
    </div>
  );
}
