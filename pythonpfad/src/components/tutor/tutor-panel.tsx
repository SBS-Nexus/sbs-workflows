'use client';

import { useState } from 'react';
import { Badge, Button, Callout, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { askTutorAction } from '@/server/actions/tutor-actions';
import {
  TUTOR_MODE_DESCRIPTIONS,
  TUTOR_MODE_LABELS,
  TUTOR_MODES,
  type TutorMode,
  type TutorReply,
} from '@/domain/tutor/types';

/**
 * Lerncoach neben der Aufgabe.
 *
 * Es gibt keinen freien Chat, sondern klar benannte Modi. Das ist Absicht: Ein
 * offenes Eingabefeld verführt dazu, nach der Lösung zu fragen. Die Modi lenken
 * die Frage auf das, was beim Lernen weiterhilft.
 */
export function TutorPanel({
  exerciseSlug,
  code,
  traceback,
}: {
  exerciseSlug?: string;
  code?: string;
  traceback?: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState<TutorReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fellBack, setFellBack] = useState(false);

  const ask = async (mode: TutorMode): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result = await askTutorAction({
        mode,
        ...(exerciseSlug !== undefined ? { exerciseSlug } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(traceback !== undefined ? { traceback } : {}),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReply(result.reply);
      setFellBack(result.fellBack);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="tutor-titel" className="rounded-lg border border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span id="tutor-titel" className="font-semibold">
          Lerncoach
          <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
            stellt Fragen, statt Lösungen zu liefern
          </span>
        </span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-[var(--border)] p-4">
          <div className="flex flex-wrap gap-2">
            {TUTOR_MODES.map((mode) => (
              <Button
                key={mode}
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void ask(mode)}
                title={TUTOR_MODE_DESCRIPTIONS[mode]}
                className="text-sm"
              >
                {TUTOR_MODE_LABELS[mode]}
              </Button>
            ))}
          </div>

          {busy ? (
            <p role="status" className="text-sm text-[var(--text-muted)]">
              Der Lerncoach denkt nach …
            </p>
          ) : null}

          {error ? (
            <Callout tone="caution" title="Das ging gerade nicht" live>
              {error}
            </Callout>
          ) : null}

          {reply ? (
            <div className="animate-enter space-y-3 rounded-lg bg-[var(--surface-sunken)] p-4">
              {reply.paragraphs.map((paragraph, index) => (
                <ParagraphWithCode key={index} text={paragraph} />
              ))}

              <p className="rounded border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-[0.95rem]">
                <strong>Nächster Schritt:</strong> {reply.nextStep}
              </p>

              {reply.caveat ? (
                <p className="text-sm text-[var(--text-muted)]">
                  <Icon name="info" size={14} className="mr-1 inline align-[-2px]" />
                  {reply.caveat}
                </p>
              ) : null}

              {reply.documentation ? (
                <p className="text-sm">
                  <a
                    href={reply.documentation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] underline"
                  >
                    {reply.documentation.label}
                  </a>{' '}
                  <span className="text-[var(--text-muted)]">(öffnet in neuem Tab)</span>
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-2 text-xs text-[var(--text-muted)]">
                <Badge tone="neutral">
                  {reply.provider === 'rule-based'
                    ? 'Regelbasiert, ohne externe Anfrage'
                    : `Über externen Anbieter: ${reply.provider}`}
                </Badge>
                {fellBack ? (
                  <span>
                    Die externe Antwort wurde verworfen, weil sie den Lernregeln widersprach. Du
                    siehst die regelbasierte Antwort.
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <p className="text-xs text-[var(--text-muted)]">
            Standardmäßig arbeitet der Lerncoach vollständig auf diesem Server, ohne Daten
            weiterzugeben. Ein externer KI-Anbieter wird nur genutzt, wenn er eingerichtet ist und
            du im Profil ausdrücklich zugestimmt hast.
          </p>
        </div>
      ) : null}
    </section>
  );
}

/** Stellt eingebettete Codeblöcke in Absätzen dar. */
function ParagraphWithCode({ text }: { text: string }): React.ReactElement {
  const parts = text.split(/```(?:python)?\n?([\s\S]*?)```/g);

  return (
    <div className="space-y-2">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <pre
            key={index}
            className="overflow-x-auto rounded border border-[var(--border)] bg-[var(--surface-raised)] p-3 font-mono text-sm"
          >
            {part.trimEnd()}
          </pre>
        ) : part.trim().length > 0 ? (
          <p key={index} className={cx('whitespace-pre-line text-[0.95rem]')}>
            {part.trim()}
          </p>
        ) : null,
      )}
    </div>
  );
}
