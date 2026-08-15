import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/server/auth/session';
import { EmptyState } from '@/components/ui/primitives';
import { AufgabenKarte } from '@/components/aufgabe/aufgaben-karte';
import { waehleWiederholung } from '@/domain/aufgabe/auswahl';
import { ladeAufgabenVorrat } from '@/server/aufgaben-auswahl';

export const metadata: Metadata = { title: 'Wiederholen' };

const HOECHSTENS = 5;

/**
 * Wiederholen.
 *
 * Hier steht, was zuletzt nicht saß – das am längsten Zurückliegende zuerst.
 * Ausdrücklich **keine** Fälligkeit nach Intervallen: Das Datenmodell sieht sie
 * vor, die Rechnung dahinter gibt es noch nicht, und ein „in 3 Tagen wieder"
 * wäre eine Zahl mit dem Anschein von Wissenschaft und nichts dahinter.
 *
 * Eine leere Seite ist hier kein Rückstand, sondern der Normalfall – und sie
 * sagt das auch. Wer nichts offen hat, soll nicht das Gefühl bekommen, etwas
 * versäumt zu haben.
 */
export default async function WiederholenSeite(): Promise<React.ReactElement> {
  const user = await requireUser();
  const vorrat = await ladeAufgabenVorrat(user.id);
  const faellig = waehleWiederholung(vorrat.kandidaten, vorrat.staende, HOECHSTENS);

  const nochNichts = vorrat.staende.size === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">Wiederholen</h1>
        <p className="mt-2 max-w-2xl text-lg text-[var(--text-muted)]">
          Was ansteht, richtet sich nach deinem Verlauf – nicht nach dem Kalender und nicht nach
          einer Serie, die reißen kann.
        </p>
      </div>

      {faellig.length === 0 ? (
        <EmptyState
          title="Nichts offen"
          description={
            nochNichts
              ? 'Wiederholungen entstehen aus bearbeiteten Aufgaben. Solange du noch keine bearbeitet hast, ist hier nichts zu tun – das ist kein Rückstand.'
              : 'Alles, was du bearbeitet hast, saß beim letzten Mal. Hier steht wieder etwas, sobald etwas nicht gleich klappt – und das ist normal, nicht schlimm.'
          }
        />
      ) : (
        <>
          <p className="text-[0.95rem] text-[var(--text-muted)]">
            {faellig.length === 1
              ? 'Eine Aufgabe, die beim letzten Mal noch nicht saß.'
              : `${faellig.length} Aufgaben, die beim letzten Mal noch nicht saßen.`}{' '}
            Angesehene Lösungen zählen dabei nicht als gekonnt – sie sagen nichts darüber, ob es
            allein gelingt.
          </p>

          <ol className="space-y-3">
            {faellig.map((kandidat, index) => {
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

          <p className="text-sm text-[var(--text-muted)]">
            Wenn eine Aufgabe zum wiederholten Mal nicht klappt, liegt es selten an der Aufgabe.{' '}
            <Link href="/lernen" className="font-medium text-[var(--accent)] underline">
              Die Lektion dazu noch einmal lesen
            </Link>{' '}
            ist keine Niederlage, sondern der schnellere Weg.
          </p>
        </>
      )}
    </div>
  );
}
