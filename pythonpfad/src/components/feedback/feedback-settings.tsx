'use client';

import { useSyncExternalStore } from 'react';
import { Button, Card, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { useFeedback } from '@/components/feedback/use-feedback';
import { unterstuetztVibration } from '@/lib/feedback/feedback-player';
import {
  readHaptics,
  readSound,
  setHaptics,
  setSound,
  subscribeFeedback,
} from '@/lib/preferences/feedback';

/**
 * Einstellungen für Ton und Vibration.
 *
 * Eigene Komponente und nicht Teil des großen Einstellungsformulars: Die
 * übrigen Angaben liegen im Konto und werden beim Absenden gespeichert, diese
 * beiden liegen im Browser und wirken sofort. Beides in ein Formular zu
 * mischen, hieße, dass ein Teil der Schalter beim Klick auf „Speichern" wartet
 * und der andere nicht – für Nutzende nicht durchschaubar.
 *
 * Der Probeknopf ist der eigentliche Punkt dieser Ansicht. Wer einen Ton
 * einschalten soll, den er noch nie gehört hat, schaltet ihn nicht ein. Wer
 * ihn vorher hören kann, entscheidet in Kenntnis der Sache.
 */
/** Abonnement für eine Eigenschaft, die sich nicht ändert. Muss stabil sein. */
const NIE_AENDERND = (): (() => void) => () => undefined;

export function FeedbackSettings(): React.ReactElement {
  const sound = useSyncExternalStore(subscribeFeedback, readSound, () => false);
  const haptics = useSyncExternalStore(subscribeFeedback, readHaptics, () => true);
  const melde = useFeedback();

  // Ob das Gerät vibrieren kann, steht erst im Browser fest – auf dem Server
  // gibt es keinen `navigator`. Über `useSyncExternalStore` bekommt React
  // beide Fassungen ausdrücklich genannt und beanstandet den Unterschied
  // nicht. Die Fähigkeit ändert sich zur Laufzeit nie, deshalb ein
  // Abonnement, das nichts tut.
  const kannVibrieren = useSyncExternalStore(NIE_AENDERND, unterstuetztVibration, () => true);

  return (
    <Card as="section" className="space-y-5" aria-labelledby="rueckmeldung">
      <div>
        <h2 id="rueckmeldung" className="flex items-center gap-2.5 text-lg font-bold">
          <span aria-hidden="true" className="text-[var(--accent)]">
            <Icon name="funke" size={20} />
          </span>
          Spürbare Rückmeldung
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Diese beiden Schalter gelten nur auf diesem Gerät und wirken sofort. Es gibt
          ausschließlich Signale für Gelungenes – bei einem Fehler bleibt es still.
        </p>
      </div>

      <Schalter
        an={sound}
        aufSchalten={(wert) => {
          setSound(wert);
          // Beim Einschalten sofort ein Beispiel: Sonst müsste man erst eine
          // Aufgabe lösen, um zu erfahren, worauf man sich eingelassen hat.
          if (wert) window.setTimeout(() => melde('aufgabe-geloest'), 60);
        }}
        titel="Ton"
        beschreibung="Ein kurzer, zweistufiger Klang, wenn eine Aufgabe gelöst ist. Standardmäßig aus."
        icon="funke"
      />

      <Schalter
        an={haptics}
        aufSchalten={(wert) => {
          setHaptics(wert);
          if (wert) window.setTimeout(() => melde('bedienung'), 60);
        }}
        titel="Vibration"
        beschreibung={
          kannVibrieren
            ? 'Ein sehr kurzer Impuls bei Bedienung und Erfolg. Folgt automatisch der Einstellung „Bewegung reduzieren".'
            : 'Dieses Gerät kann nicht vibrieren. Der Schalter bleibt ohne Wirkung, bis du die Seite auf einem Telefon öffnest.'
        }
        icon="bewegung"
        gedaempft={!kannVibrieren}
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
        <Button type="button" variant="secondary" onClick={() => melde('lektion-fertig')}>
          <Icon name="abspielen" size={16} />
          Probe hören
        </Button>
        <p className="text-sm text-[var(--text-muted)]">
          {sound
            ? 'Spielt den Klang ab, der beim Abschluss einer Lektion kommt.'
            : 'Bei ausgeschaltetem Ton passiert hier nichts – das ist der Beweis, dass der Schalter wirkt.'}
        </p>
      </div>
    </Card>
  );
}

function Schalter({
  an,
  aufSchalten,
  titel,
  beschreibung,
  icon,
  gedaempft = false,
}: {
  an: boolean;
  aufSchalten: (wert: boolean) => void;
  titel: string;
  beschreibung: string;
  icon: 'funke' | 'bewegung';
  gedaempft?: boolean;
}): React.ReactElement {
  return (
    <label className={cx('flex cursor-pointer items-start gap-3', gedaempft && 'opacity-60')}>
      <input
        type="checkbox"
        checked={an}
        onChange={(event) => aufSchalten(event.target.checked)}
        className="mt-1 size-4 shrink-0"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-semibold">
          <span aria-hidden="true" className="text-[var(--text-muted)]">
            <Icon name={icon} size={16} />
          </span>
          {titel}
        </span>
        <span className="mt-0.5 block text-sm text-[var(--text-muted)]">{beschreibung}</span>
      </span>
    </label>
  );
}
