import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/server/auth/session';
import { EmptyState } from '@/components/ui/primitives';
import { AufgabenKarte } from '@/components/aufgabe/aufgaben-karte';
import { waehleUebung } from '@/domain/aufgabe/auswahl';
import { ladeAufgabenVorrat } from '@/server/aufgaben-auswahl';

export const metadata: Metadata = { title: 'Üben' };

/** Wie viele Aufgaben ein Durchgang hat. */
const DURCHGANG = 5;

/**
 * Üben.
 *
 * Aufgaben aus verschiedenen Lektionen, absichtlich durcheinander. Wer vier
 * JOIN-Aufgaben am Stück löst, übt das Ausführen; wer eine JOIN-Aufgabe
 * zwischen zwei anderen findet, muss erst erkennen, dass es eine ist – und das
 * ist die Fähigkeit, die später gebraucht wird.
 *
 * Es gibt **keine Serie und keine Punkte**. Fünf Aufgaben sind ein Durchgang,
 * weil das eine überschaubare Menge ist, nicht weil danach etwas freigeschaltet
 * würde. Wer aufhört, verliert nichts.
 */
export default async function UebenSeite(): Promise<React.ReactElement> {
  const user = await requireUser();
  const vorrat = await ladeAufgabenVorrat(user.id);
  const gewaehlt = waehleUebung(vorrat.kandidaten, vorrat.staende, DURCHGANG);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">Aufgaben</h1>
        <p className="mt-2 max-w-2xl text-lg text-[var(--text-muted)]">
          Aufgaben zu dem, was du zuletzt gelernt hast – gemischt, damit du das Erkennen mitübst.
        </p>
      </div>

      {gewaehlt.length === 0 ? (
        <EmptyState
          title="Noch keine Aufgaben verfügbar"
          description="Aufgaben entstehen aus den Lektionen. Sobald Inhalte eingespielt sind, steht hier etwas zu tun."
        />
      ) : (
        <>
          <ol className="space-y-3">
            {gewaehlt.map((kandidat, index) => {
              const ansicht = vorrat.ansichten.get(kandidat.aufgabeSlug);
              if (!ansicht) return null;
              return (
                <AufgabenKarte
                  key={kandidat.aufgabeSlug}
                  aufgabe={ansicht}
                  nummer={index + 1}
                  datensatz={vorrat.datensaetze.get(kandidat.aufgabeSlug)}
                />
              );
            })}
          </ol>

          {/*
           * Kein „weiter"-Knopf, der einen neuen Durchgang lädt und den alten
           * verschwinden lässt. Die Auswahl richtet sich nach dem Verlauf -
           * wer die fünf bearbeitet hat und die Seite neu lädt, bekommt die
           * nächsten fünf, und zwar aus demselben Grund.
           */}
          <p className="text-sm text-[var(--text-muted)]">
            Das war der Durchgang. Beim nächsten Aufruf stehen hier andere Aufgaben – was schon saß,
            kommt zuletzt.{' '}
            <Link href="/lernen" className="font-medium text-[var(--accent)] underline">
              Zum Lernpfad
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
