'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Badge, Button, Callout, cx } from '@/components/ui/primitives';
import { LabCompleteButton } from './lab-complete-button';
import { BefehlsKonsole } from './befehls-konsole';
import { eigenerEintrag } from '@/domain/eintraege';
import {
  alleKonflikteGeloest,
  aufgeloesterInhalt,
  enthaeltMarker,
  fuehreKonfliktBefehlAus,
  KONFLIKT_ENDE,
  KONFLIKT_START,
  KONFLIKT_TRENNER,
  loeseKonflikt,
  mitKonfliktMarkern,
  offeneKonflikte,
  type Abschnitt,
  type KonfliktZustand,
} from '@/domain/git/merge-conflict';

const configSchema = z.object({
  pfad: z.string(),
  unserBranch: z.string(),
  ihrBranch: z.string(),
  /** Worum es im Konflikt fachlich geht — damit die Entscheidung begründbar ist. */
  hintergrund: z.string(),
  abschnitte: z.array(
    z.union([
      z.object({ art: z.literal('gemeinsam'), zeilen: z.array(z.string()) }),
      z.object({
        art: z.literal('konflikt'),
        id: z.string(),
        unsere: z.array(z.string()),
        ihre: z.array(z.string()),
      }),
    ]),
  ),
});

type Wahl = 'unsere' | 'ihre' | 'beide' | 'eigene';

/**
 * Das Merge-Konflikt-Lab.
 *
 * Der Ablauf folgt dem echten: Konflikt sehen → Marker lesen → je Stelle
 * entscheiden → `git add` → `git commit`. Der mittlere Schritt ist der, den
 * viele überspringen, deshalb lässt das Lab ihn nicht aus.
 *
 * Ausdrücklich ohne Ziehen-und-Ablegen: Jede Entscheidung ist ein Knopf und
 * damit auch mit der Tastatur erreichbar.
 */
export function MergeConflictLab({
  config,
  onCompleteAction,
}: {
  config: unknown;
  onCompleteAction: () => Promise<boolean>;
}): React.ReactElement {
  const { pfad, unserBranch, ihrBranch, hintergrund, abschnitte } = configSchema.parse(config);

  const [zustand, setZustand] = useState<KonfliktZustand>({
    datei: { pfad, abschnitte: abschnitte as Abschnitt[] },
    aufloesungen: {},
    vorgemerkt: false,
    status: 'laeuft',
  });
  const [verlauf, setVerlauf] = useState<{ befehl: string; ausgabe: string }[]>([]);
  const [eigeneTexte, setEigeneTexte] = useState<Record<string, string>>({});

  const beschriftung = { unser: unserBranch, ihr: ihrBranch };
  const laeuft = zustand.status === 'laeuft';
  const konflikte = zustand.datei.abschnitte.filter(
    (a): a is Extract<Abschnitt, { art: 'konflikt' }> => a.art === 'konflikt',
  );
  const offen = offeneKonflikte(zustand);
  const inhalt = aufgeloesterInhalt(zustand);
  const markerUebrig = enthaeltMarker(inhalt);

  function befehl(text: string): void {
    const ergebnis = fuehreKonfliktBefehlAus(zustand, text);
    setZustand(ergebnis.zustand);
    setVerlauf((prev) => [...prev, { befehl: text, ausgabe: ergebnis.ausgabe }]);
  }

  function waehle(konfliktId: string, wahl: Wahl): void {
    if (wahl === 'eigene') {
      const zeilen = (eigenerEintrag(eigeneTexte, konfliktId) ?? '').split('\n');
      setZustand((prev) => loeseKonflikt(prev, konfliktId, { art: 'eigene', zeilen }));
      return;
    }
    setZustand((prev) => loeseKonflikt(prev, konfliktId, { art: wahl }));
  }

  return (
    <div className="space-y-5">
      <Callout tone="info" title="Worum es geht">
        {hintergrund}
      </Callout>

      <section>
        <h3 className="mb-2 text-sm font-semibold">
          So sieht <code className="font-mono">{pfad}</code> gerade aus
        </h3>
        <p className="mb-2 text-sm text-[var(--fg-muted)]">
          Die Marker sind kein Schaden und kein Fehler. Git sagt damit: Hier haben beide Seiten
          dieselbe Stelle geändert — das kann nur ein Mensch entscheiden.
        </p>
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-ink-900 p-4">
          <pre className="min-w-max font-mono text-xs leading-relaxed text-ink-50">
            {mitKonfliktMarkern(zustand, beschriftung).map((zeile, index) => (
              <span
                key={index}
                className={cx(
                  'block',
                  (zeile.startsWith(KONFLIKT_START) ||
                    zeile.startsWith(KONFLIKT_ENDE) ||
                    zeile.trimEnd() === KONFLIKT_TRENNER) &&
                    'font-semibold text-alert-100',
                )}
              >
                {zeile || ' '}
              </span>
            ))}
          </pre>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">
          {laeuft
            ? `Entscheide jede Stelle (${konflikte.length - offen.length} von ${konflikte.length} erledigt)`
            : 'Konfliktstellen dieses Merges'}
        </h3>

        {konflikte.map((konflikt) => {
          const aktuell = eigenerEintrag(zustand.aufloesungen, konflikt.id) ?? {
            art: 'offen' as const,
          };
          return (
            <fieldset
              key={konflikt.id}
              className="rounded-[var(--radius-md)] border border-[var(--border)] p-3"
            >
              <legend className="flex items-center gap-2 px-1 text-xs font-semibold">
                Konfliktstelle {konflikt.id}
                {!laeuft ? (
                  <Badge tone="neutral">kein Merge im Gange</Badge>
                ) : aktuell.art === 'offen' ? (
                  <Badge tone="caution">offen</Badge>
                ) : (
                  <Badge tone="success">entschieden</Badge>
                )}
              </legend>

              <div className="grid gap-2 sm:grid-cols-2">
                <FassungKarte titel={`Deine Fassung (${unserBranch})`} zeilen={konflikt.unsere} />
                <FassungKarte titel={`Hereingeholt (${ihrBranch})`} zeilen={konflikt.ihre} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={aktuell.art === 'unsere' ? 'primary' : 'secondary'}
                  disabled={!laeuft}
                  onClick={() => waehle(konflikt.id, 'unsere')}
                >
                  Meine behalten
                </Button>
                <Button
                  size="sm"
                  variant={aktuell.art === 'ihre' ? 'primary' : 'secondary'}
                  disabled={!laeuft}
                  onClick={() => waehle(konflikt.id, 'ihre')}
                >
                  Ihre übernehmen
                </Button>
                <Button
                  size="sm"
                  variant={aktuell.art === 'beide' ? 'primary' : 'secondary'}
                  disabled={!laeuft}
                  onClick={() => waehle(konflikt.id, 'beide')}
                >
                  Beide behalten
                </Button>
              </div>

              <div className="mt-3">
                <label
                  htmlFor={`eigene-${konflikt.id}`}
                  className="block text-xs text-[var(--fg-muted)]"
                >
                  Oder selbst formulieren — oft ist keine der beiden Fassungen die richtige:
                </label>
                <textarea
                  id={`eigene-${konflikt.id}`}
                  rows={2}
                  disabled={!laeuft}
                  value={eigenerEintrag(eigeneTexte, konflikt.id) ?? ''}
                  onChange={(e) =>
                    setEigeneTexte((prev) => ({ ...prev, [konflikt.id]: e.target.value }))
                  }
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg)] p-2 font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant={aktuell.art === 'eigene' ? 'primary' : 'secondary'}
                  className="mt-1.5"
                  disabled={
                    !laeuft || (eigenerEintrag(eigeneTexte, konflikt.id) ?? '').trim().length === 0
                  }
                  onClick={() => waehle(konflikt.id, 'eigene')}
                >
                  Eigene Fassung übernehmen
                </Button>
              </div>
            </fieldset>
          );
        })}
      </section>

      {markerUebrig ? (
        <Callout tone="alert" title="Es stehen noch Marker im Text" live>
          Git prüft das nicht. Wer so committet, hat die Marker anschließend im Quelltext.
        </Callout>
      ) : null}

      <section>
        <h3 className="mb-2 text-sm font-semibold">Merge abschließen</h3>
        <p className="mb-2 text-sm text-[var(--fg-muted)]">
          Auflösen allein genügt nicht: Git will die Datei danach ausdrücklich als erledigt
          vorgemerkt sehen.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => befehl('git status')}>
            git status
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => befehl(`git add ${pfad}`)}
            disabled={!laeuft}
          >
            git add {pfad}
          </Button>
          <Button size="sm" onClick={() => befehl('git commit')} disabled={!laeuft}>
            git commit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => befehl('git merge --abort')}
            disabled={!laeuft}
          >
            git merge --abort
          </Button>
          {zustand.status === 'abgebrochen' ? (
            <Button size="sm" onClick={() => befehl(`git merge ${ihrBranch}`)}>
              Merge erneut beginnen
            </Button>
          ) : null}
        </div>

        {verlauf.length > 0 ? (
          <div className="mt-3">
            <BefehlsKonsole eintraege={verlauf} />
          </div>
        ) : null}
      </section>

      {zustand.status === 'abgebrochen' ? (
        <Callout tone="info" title="Merge abgebrochen" live>
          Der Stand von vor dem Merge ist wieder da — die Konfliktmarker sind weg und deine
          Entscheidungen verworfen. Genau dafür gibt es{' '}
          <code className="font-mono">git merge --abort</code>: Es kostet nichts, einen Merge
          abzubrechen und in Ruhe neu anzusetzen.
        </Callout>
      ) : null}

      {zustand.status === 'abgeschlossen' ? (
        <Callout tone="success" title="Merge abgeschlossen" live>
          Der Merge-Commit hält beide Entwicklungslinien zusammen. Im Verlauf ist dauerhaft
          ablesbar, dass hier zwei Wege zusammengeführt wurden — und wie du entschieden hast.
        </Callout>
      ) : null}

      <LabCompleteButton
        onCompleteAction={onCompleteAction}
        label="Fertig — Lab abschließen"
        disabled={zustand.status !== 'abgeschlossen'}
      />

      {laeuft && alleKonflikteGeloest(zustand) && !zustand.vorgemerkt ? (
        <p className="text-sm text-[var(--fg-muted)]">
          Alles entschieden. Es fehlt noch <code className="font-mono">git add</code> und{' '}
          <code className="font-mono">git commit</code>.
        </p>
      ) : null}
    </div>
  );
}

function FassungKarte({ titel, zeilen }: { titel: string; zeilen: string[] }): React.ReactElement {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-raised)] p-2">
      <p className="mb-1 text-xs font-medium text-[var(--fg-muted)]">{titel}</p>
      <pre className="overflow-x-auto font-mono text-xs">{zeilen.join('\n')}</pre>
    </div>
  );
}
