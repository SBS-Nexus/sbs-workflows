'use client';

import { useActionState, useState } from 'react';
import { abschliessenAction, type OnboardingFormState } from '@/server/actions/onboarding-actions';
import type { OeffentlicheFrage } from '@/domain/placement/placement';
import { Button, Callout, ProgressBar, SectionHeading } from '@/components/ui/primitives';

const AUSGANGSLAGE: OnboardingFormState = { ok: false };

const WAHL =
  'flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-strong)] p-3 ' +
  'has-[:checked]:border-signal-500 has-[:checked]:bg-signal-100 dark:has-[:checked]:bg-signal-900/30';

/** Die Einstellungen — jede für sich eine Entscheidung. */
const EINSTELLUNGEN = [
  {
    name: 'learningGoal',
    frage: 'Wofür möchtest du AIPfad vor allem nutzen?',
    optionen: [
      { value: 'GENERAL', label: 'Allgemeines Verständnis' },
      { value: 'DEVELOPER', label: 'Als Entwickler:in' },
      { value: 'PRODUCT_ROLE', label: 'Als Product- oder Business-Rolle' },
      { value: 'GOVERNANCE_ROLE', label: 'Governance und Compliance' },
      { value: 'LEADERSHIP', label: 'Als Entscheider:in' },
    ],
  },
  {
    name: 'experience',
    frage: 'Wie viel hattest du bisher mit KI zu tun?',
    optionen: [
      { value: 'NONE', label: 'Noch gar nichts' },
      { value: 'USED_CHATBOTS', label: 'Ich habe Chatbots benutzt' },
      { value: 'TECHNICAL_BACKGROUND', label: 'Ich habe technischen Hintergrund' },
      { value: 'AI_PRACTITIONER', label: 'Ich arbeite damit' },
    ],
  },
  {
    name: 'dailyTimeBudget',
    frage: 'Wie viel Zeit möchtest du dir am Tag nehmen?',
    optionen: [
      { value: '10', label: '10 Minuten' },
      { value: '20', label: '20 Minuten' },
      { value: '45', label: '45 Minuten' },
      { value: '90', label: '90 Minuten' },
    ],
  },
  {
    name: 'pace',
    frage: 'In welchem Tempo möchtest du vorankommen?',
    optionen: [
      { value: 'RELAXED', label: 'In Ruhe' },
      { value: 'STEADY', label: 'Gleichmäßig' },
      { value: 'FOCUSED', label: 'Zügig' },
    ],
  },
] as const;

type Schritt =
  | { art: 'einstellung'; index: number }
  | { art: 'entscheidung' }
  | { art: 'frage'; index: number }
  | { art: 'absenden' };

export function OnboardingFlow({ fragen }: { fragen: OeffentlicheFrage[] }): React.ReactElement {
  const [zustand, formAction] = useActionState(abschliessenAction, AUSGANGSLAGE);
  const [schritt, setSchritt] = useState<Schritt>({ art: 'einstellung', index: 0 });
  const [einstellungen, setEinstellungen] = useState<Record<string, string>>({});
  const [antworten, setAntworten] = useState<Record<string, string>>({});
  const [einstufungGewaehlt, setEinstufungGewaehlt] = useState(false);

  // Nach dem Absenden zeigt der Server das Ergebnis — der Fragenteil ist vorbei.
  if (zustand.ok && zustand.ergebnis) {
    return <Ergebnis ergebnis={zustand.ergebnis} />;
  }

  const gesamt = EINSTELLUNGEN.length + 1 + (einstufungGewaehlt ? fragen.length : 0);
  const erledigt =
    schritt.art === 'einstellung'
      ? schritt.index
      : schritt.art === 'entscheidung'
        ? EINSTELLUNGEN.length
        : schritt.art === 'frage'
          ? EINSTELLUNGEN.length + 1 + schritt.index
          : gesamt;

  const platzierung = einstufungGewaehlt
    ? {
        art: 'beantwortet' as const,
        antworten: Object.entries(antworten).map(([questionId, optionId]) => ({
          questionId,
          optionId,
        })),
      }
    : { art: 'uebersprungen' as const };

  function zurueck(): void {
    if (schritt.art === 'einstellung' && schritt.index > 0) {
      setSchritt({ art: 'einstellung', index: schritt.index - 1 });
    } else if (schritt.art === 'entscheidung') {
      setSchritt({ art: 'einstellung', index: EINSTELLUNGEN.length - 1 });
    } else if (schritt.art === 'frage') {
      // Die bereits gegebenen Antworten bleiben stehen — zurückgehen darf
      // nichts löschen.
      if (schritt.index === 0) setSchritt({ art: 'entscheidung' });
      else setSchritt({ art: 'frage', index: schritt.index - 1 });
    }
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {/* Die Eingaben reisen als verstecktes Feld mit: Der Server bekommt am
          Ende alles auf einmal, und vorher wird nichts gespeichert. */}
      {EINSTELLUNGEN.map((feld) => (
        <input
          key={feld.name}
          type="hidden"
          name={feld.name}
          value={einstellungen[feld.name] ?? ''}
        />
      ))}
      <input type="hidden" name="platzierung" value={JSON.stringify(platzierung)} />

      {zustand.error ? (
        <Callout tone="alert" title="Das hat nicht geklappt" live>
          {zustand.error} Deine Angaben stehen noch hier.
        </Callout>
      ) : null}

      <div className="space-y-2">
        <ProgressBar
          value={erledigt}
          max={gesamt}
          label={`Schritt ${erledigt + 1} von ${gesamt}`}
        />
        <p className="text-sm text-[var(--fg-muted)]">
          Schritt {Math.min(erledigt + 1, gesamt)} von {gesamt}
        </p>
      </div>

      {schritt.art === 'einstellung' ? (
        <EinstellungsSchritt
          feld={EINSTELLUNGEN[schritt.index]!}
          wert={einstellungen[EINSTELLUNGEN[schritt.index]!.name] ?? ''}
          onWahl={(wert) => {
            setEinstellungen((vorher) => ({
              ...vorher,
              [EINSTELLUNGEN[schritt.index]!.name]: wert,
            }));
          }}
          onWeiter={() => {
            if (schritt.index + 1 < EINSTELLUNGEN.length) {
              setSchritt({ art: 'einstellung', index: schritt.index + 1 });
            } else {
              setSchritt({ art: 'entscheidung' });
            }
          }}
          onZurueck={schritt.index > 0 ? zurueck : null}
        />
      ) : null}

      {schritt.art === 'entscheidung' ? (
        <EntscheidungsSchritt
          anzahl={fragen.length}
          onEinstufung={() => {
            setEinstufungGewaehlt(true);
            setSchritt({ art: 'frage', index: 0 });
          }}
          onUeberspringen={() => {
            setEinstufungGewaehlt(false);
            setSchritt({ art: 'absenden' });
          }}
          onZurueck={zurueck}
        />
      ) : null}

      {schritt.art === 'frage' ? (
        <FrageSchritt
          frage={fragen[schritt.index]!}
          nummer={schritt.index + 1}
          gesamt={fragen.length}
          wert={antworten[fragen[schritt.index]!.id] ?? ''}
          onWahl={(optionId) => {
            setAntworten((vorher) => ({ ...vorher, [fragen[schritt.index]!.id]: optionId }));
          }}
          onWeiter={() => {
            if (schritt.index + 1 < fragen.length) {
              setSchritt({ art: 'frage', index: schritt.index + 1 });
            } else {
              setSchritt({ art: 'absenden' });
            }
          }}
          onZurueck={zurueck}
        />
      ) : null}

      {schritt.art === 'absenden' ? (
        <AbsendeSchritt mitEinstufung={einstufungGewaehlt} onZurueck={zurueck} />
      ) : null}
    </form>
  );
}

function EinstellungsSchritt({
  feld,
  wert,
  onWahl,
  onWeiter,
  onZurueck,
}: {
  feld: (typeof EINSTELLUNGEN)[number];
  wert: string;
  onWahl: (wert: string) => void;
  onWeiter: () => void;
  onZurueck: (() => void) | null;
}): React.ReactElement {
  return (
    <fieldset className="space-y-4">
      <legend className="text-lg font-semibold">{feld.frage}</legend>
      <div className="grid gap-2">
        {feld.optionen.map((option) => (
          <label key={option.value} className={WAHL}>
            <input
              type="radio"
              name={`wahl-${feld.name}`}
              value={option.value}
              checked={wert === option.value}
              onChange={() => onWahl(option.value)}
              className="mt-0.5"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <Navigation weiterAus={wert === ''} onWeiter={onWeiter} onZurueck={onZurueck} />
    </fieldset>
  );
}

function EntscheidungsSchritt({
  anzahl,
  onEinstufung,
  onUeberspringen,
  onZurueck,
}: {
  anzahl: number;
  onEinstufung: () => void;
  onUeberspringen: () => void;
  onZurueck: () => void;
}): React.ReactElement {
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">Möchtest du kurz einschätzen lassen, wo du stehst?</h3>
      <p className="text-[var(--fg-muted)]">
        {anzahl} Fragen, ohne Zeitdruck. Sie messen nicht, wie klug du bist — sie helfen nur dabei,
        den Pfad passend einzuordnen. &bdquo;Weiß ich nicht&ldquo; ist überall eine gleichwertige
        Antwort.
      </p>
      <p className="text-[var(--fg-muted)]">
        Der Pfad enthält so oder so alle Lektionen. Es wird nichts ausgeblendet und nichts
        übersprungen — die Einstufung ändert nur, wie er eingeordnet wird.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={onEinstufung}>
          Einschätzung machen
        </Button>
        <Button type="button" variant="secondary" onClick={onUeberspringen}>
          Überspringen
        </Button>
      </div>
      <button
        type="button"
        onClick={onZurueck}
        className="text-sm underline underline-offset-4 hover:text-signal-600"
      >
        Zurück
      </button>
    </section>
  );
}

function FrageSchritt({
  frage,
  nummer,
  gesamt,
  wert,
  onWahl,
  onWeiter,
  onZurueck,
}: {
  frage: OeffentlicheFrage;
  nummer: number;
  gesamt: number;
  wert: string;
  onWahl: (optionId: string) => void;
  onWeiter: () => void;
  onZurueck: () => void;
}): React.ReactElement {
  return (
    <fieldset className="space-y-4">
      <legend className="space-y-1">
        <span className="block text-sm text-[var(--fg-muted)]">
          Frage {nummer} von {gesamt}
        </span>
        <span className="block text-lg font-semibold">{frage.question}</span>
      </legend>

      {frage.context ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-subtle)] p-3 font-mono text-sm">
          {frage.context}
        </p>
      ) : null}

      <div className="grid gap-2">
        {frage.options.map((option) => (
          <label key={option.id} className={WAHL}>
            <input
              type="radio"
              name={`frage-${frage.id}`}
              value={option.id}
              checked={wert === option.id}
              onChange={() => onWahl(option.id)}
              className="mt-0.5"
            />
            <span>{option.text}</span>
          </label>
        ))}
      </div>

      <Navigation weiterAus={wert === ''} onWeiter={onWeiter} onZurueck={onZurueck} />
    </fieldset>
  );
}

function AbsendeSchritt({
  mitEinstufung,
  onZurueck,
}: {
  mitEinstufung: boolean;
  onZurueck: () => void;
}): React.ReactElement {
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">Alles beisammen</h3>
      <p className="text-[var(--fg-muted)]">
        {mitEinstufung
          ? 'Deine Antworten werden jetzt ausgewertet. Die Auflösung siehst du gleich.'
          : 'Du hast die Einschätzung übersprungen. Der Pfad beginnt am Anfang — du kannst jederzeit weiterspringen.'}
      </p>
      <Absenden />
      <button
        type="button"
        onClick={onZurueck}
        className="text-sm underline underline-offset-4 hover:text-signal-600"
      >
        Zurück
      </button>
    </section>
  );
}

function Absenden(): React.ReactElement {
  return (
    <Button type="submit" className="w-full sm:w-auto">
      Los geht&apos;s
    </Button>
  );
}

function Navigation({
  weiterAus,
  onWeiter,
  onZurueck,
}: {
  weiterAus: boolean;
  onWeiter: () => void;
  onZurueck: (() => void) | null;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-4">
      <Button type="button" onClick={onWeiter} disabled={weiterAus}>
        Weiter
      </Button>
      {onZurueck ? (
        <button
          type="button"
          onClick={onZurueck}
          className="text-sm underline underline-offset-4 hover:text-signal-600"
        >
          Zurück
        </button>
      ) : null}
    </div>
  );
}

function Ergebnis({
  ergebnis,
}: {
  ergebnis: NonNullable<OnboardingFormState['ergebnis']>;
}): React.ReactElement {
  const { platzierung, erklaerungen } = ergebnis;

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Geschafft"
        description={
          platzierung
            ? platzierung.message
            : 'Du hast die Einschätzung übersprungen — der Pfad beginnt am Anfang.'
        }
      >
        {platzierung ? 'Deine Einschätzung' : 'Alles eingerichtet'}
      </SectionHeading>

      {platzierung ? (
        <Callout tone="info" title={`${platzierung.score} von 100 Punkten`}>
          Der Pfad enthält weiterhin alle Lektionen — es wird nichts übersprungen. Die Einschätzung
          ordnet nur ein, was dir davon schon vertraut sein dürfte.
        </Callout>
      ) : null}

      {erklaerungen.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Die Auflösung</h3>
          <ul className="space-y-3">
            {erklaerungen.map((eintrag) => (
              <li
                key={eintrag.questionId}
                className="rounded-[var(--radius-md)] border border-[var(--border)] p-3"
              >
                <p className="font-medium">
                  <span aria-hidden="true">{eintrag.richtig ? '✓ ' : '· '}</span>
                  {eintrag.question}
                </p>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">
                  <span className="sr-only">
                    {eintrag.richtig ? 'Richtig beantwortet. ' : 'Nicht richtig beantwortet. '}
                  </span>
                  {eintrag.explanation}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <a
        href="/pfad"
        className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-signal-500 px-4 py-2 font-medium text-white hover:bg-signal-600"
      >
        Zum Lernpfad
      </a>
    </div>
  );
}
