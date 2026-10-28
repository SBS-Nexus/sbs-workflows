'use client';

import { useState } from 'react';
import { AufgabenKarte, type AufgabenAnsicht } from '@/components/aufgabe/aufgaben-karte';
import { ButtonLink, Card, ProgressBar } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import type { UebungsDatensatz } from '@/domain/sql/schema';
import type { Lektionsstand } from '@/server/lernen/lektionsstand';

/**
 * Die Aufgaben einer Lektion mit ihrem Stand: wie weit, was sitzt, wohin
 * danach.
 *
 * Vorher stand jede Aufgabe für sich. Wer die letzte richtig hatte, erfuhr
 * nicht, dass die Lektion damit durch war, und musste den Weg zur nächsten
 * über die Übersicht suchen. Genau an dieser Stelle entscheidet sich, ob man
 * „noch eine" macht.
 *
 * Bewusst **ohne** Punkte, Serien oder Ranglisten: Der Balken zählt Aufgaben,
 * die sitzen, nach derselben Regel wie der Abschluss, und der Abschluss sagt,
 * was als Nächstes kommt. Bewegung gibt es nur einmal, wenn der Balken voll
 * wird (Lichtstreif des Komponentenvertrags), und sie ruht unter „Bewegung
 * reduzieren".
 */
export function Lektionsverlauf({
  aufgaben,
  datensatz,
  anfangsstand,
}: {
  aufgaben: readonly AufgabenAnsicht[];
  datensatz?: UebungsDatensatz;
  anfangsstand: Lektionsstand;
}): React.ReactElement {
  const [stand, setStand] = useState(anfangsstand);
  // Nur in dieser Sitzung abgeschlossen: Dann ist es ein Moment, sonst ein Stand.
  const [geradeGeschafft, setGeradeGeschafft] = useState(false);

  function beiNeuemStand(neu: Lektionsstand): void {
    if (neu.abgeschlossen && !stand.abgeschlossen) setGeradeGeschafft(true);
    setStand(neu);
  }

  return (
    <>
      {stand.gesamt > 0 ? (
        <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">Dein Stand in dieser Lektion</p>
            <p className="text-sm text-[var(--text-muted)] tabular-nums">
              {stand.geloest} von {stand.gesamt} Aufgaben gelöst
            </p>
          </div>
          <div className="mt-2">
            <ProgressBar
              value={stand.geloest}
              max={stand.gesamt}
              label="Gelöste Aufgaben in dieser Lektion"
              tone={stand.geloest >= stand.gesamt ? 'success' : 'accent'}
            />
          </div>
        </div>
      ) : null}

      <ol className="space-y-3">
        {aufgaben.map((aufgabe, index) => (
          <AufgabenKarte
            key={aufgabe.slug}
            aufgabe={aufgabe}
            nummer={index + 1}
            datensatz={datensatz}
            geloest={stand.geloesteAufgaben.includes(aufgabe.slug)}
            beiNeuemStand={beiNeuemStand}
          />
        ))}
      </ol>

      {/* Die Ansage für Hilfstechnik steht immer im Baum, damit ein Wechsel
          vorgelesen wird – der sichtbare Abschluss erst, wenn es so weit ist. */}
      <p className="sr-only" role="status">
        {geradeGeschafft ? 'Lektion abgeschlossen.' : ''}
      </p>

      {stand.abgeschlossen ? <Abschluss stand={stand} geradeGeschafft={geradeGeschafft} /> : null}
    </>
  );
}

function Abschluss({
  stand,
  geradeGeschafft,
}: {
  stand: Lektionsstand;
  geradeGeschafft: boolean;
}): React.ReactElement {
  return (
    <Card
      as="section"
      emphasis="accent"
      aria-labelledby="lektion-abschluss"
      className={geradeGeschafft ? 'animate-rise mt-6' : 'mt-6'}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]"
        >
          <Icon name="haken" size={22} />
        </span>
        <div className="min-w-0">
          <h3 id="lektion-abschluss" className="text-lg font-black tracking-tight">
            {geradeGeschafft ? 'Lektion geschafft' : 'Diese Lektion hast du abgeschlossen'}
          </h3>
          <p className="mt-1 text-[var(--text-muted)]">
            {stand.gesamt === stand.geloest
              ? `Alle ${stand.gesamt} bewerteten Aufgaben sitzen.`
              : `${stand.geloest} von ${stand.gesamt} bewerteten Aufgaben sitzen gerade – abgeschlossen bleibt sie trotzdem.`}{' '}
            Was du hier geübt hast, kommt in den Wiederholungen zurück.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {stand.naechste ? (
              <ButtonLink href={`/lernen/${stand.naechste.slug}`}>
                Weiter: {stand.naechste.titel}
                <Icon name="vor" size={18} />
              </ButtonLink>
            ) : (
              <ButtonLink href="/projekte">
                Weiter zu den Projekten
                <Icon name="vor" size={18} />
              </ButtonLink>
            )}
            <ButtonLink href="/lernen" variant="secondary">
              Zur Übersicht
            </ButtonLink>
          </div>
        </div>
      </div>
    </Card>
  );
}
