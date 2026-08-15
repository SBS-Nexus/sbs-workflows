'use client';

import { useState, useTransition } from 'react';
import { SqlEditor } from '@/components/editor/sql-editor';
import { Button, Callout, inputClass } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import {
  gibProjektAb,
  nimmProjektZurueck,
  sichereProjekt,
  type Projektantwort,
} from '@/server/actions/projekt-actions';
import type { UebungsDatensatz } from '@/domain/sql/schema';

/**
 * Die Arbeitsfläche eines Projekts.
 *
 * Anders als bei einer Aufgabe gibt es hier kein Urteil. Die Abnahmekriterien
 * stehen daneben und werden von der Lernenden selbst abgehakt – das Häkchen ist
 * eine Lesehilfe und keine Prüfung, und es wird bewusst **nicht** gespeichert:
 * Ein gespeichertes Häkchen sähe wie eine bestandene Abnahme aus, obwohl es nur
 * eine Behauptung wäre.
 *
 * „Abgeben" hält fest, dass jemand fertig ist. Die Oberfläche sagt ausdrücklich,
 * dass darauf keine Rückmeldung folgt – ein Knopf, der nach Einsendung aussieht
 * und ins Leere führt, wäre schlimmer als gar keiner.
 */
export function ProjektWerkbank({
  projektSlug,
  abnahme,
  startSql,
  gespeichertesSql,
  gespeicherteNotizen,
  abgegebenAm,
  datensatz,
}: {
  projektSlug: string;
  abnahme: readonly string[];
  startSql: string;
  gespeichertesSql: string | null;
  gespeicherteNotizen: string | null;
  abgegebenAm: string | null;
  datensatz?: UebungsDatensatz;
}): React.ReactElement {
  const [sql, setSql] = useState(gespeichertesSql ?? startSql);
  const [notizen, setNotizen] = useState(gespeicherteNotizen ?? '');
  const [abgehakt, setAbgehakt] = useState<number[]>([]);
  const [antwort, setAntwort] = useState<(Projektantwort & { was: string }) | null>(null);
  const [laeuft, starte] = useTransition();

  const abgegeben = abgegebenAm !== null;

  function fuehreAus(
    aktion: (daten: unknown) => Promise<Projektantwort>,
    was: string,
    mitInhalt = true,
  ): void {
    starte(async () => {
      const ergebnis = await aktion(mitInhalt ? { projektSlug, sql, notizen } : { projektSlug });
      setAntwort({ ...ergebnis, was });
    });
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="abnahme">
        <h2
          id="abnahme"
          className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]"
        >
          Fertig ist es, wenn
        </h2>
        <ul className="mt-3 space-y-2">
          {abnahme.map((kriterium, index) => (
            <li key={kriterium}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--accent)]">
                <input
                  type="checkbox"
                  checked={abgehakt.includes(index)}
                  onChange={() =>
                    setAbgehakt(
                      abgehakt.includes(index)
                        ? abgehakt.filter((wert) => wert !== index)
                        : [...abgehakt, index],
                    )
                  }
                  className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="text-[0.95rem]">{kriterium}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Die Häkchen setzt du für dich. Sie werden nicht gespeichert und von niemandem geprüft –
          sie sind da, damit du beim Durchgehen nichts übersiehst.
        </p>
      </section>

      <section aria-labelledby="arbeit" className="space-y-4">
        <h2
          id="arbeit"
          className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]"
        >
          Deine Lösung
        </h2>

        <SqlEditor wert={sql} beiAenderung={setSql} datensatz={datensatz} />

        <div>
          <label htmlFor="notizen" className="block text-sm font-semibold">
            Notizen – warum du es so gelöst hast
          </label>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            In mehreren Abnahmekriterien steht &bdquo;du kannst erklären, warum&ldquo;. Hier ist der
            Platz dafür. Wer die Begründung aufschreibt, merkt am ehesten, wenn sie fehlt.
          </p>
          <textarea
            id="notizen"
            rows={5}
            value={notizen}
            onChange={(ereignis) => setNotizen(ereignis.target.value)}
            className={`${inputClass} mt-2 resize-y`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => fuehreAus(sichereProjekt, 'gesichert')}
            disabled={laeuft}
          >
            <Icon name="haken" size={18} />
            Zwischenstand sichern
          </Button>

          {abgegeben ? (
            <Button
              onClick={() => fuehreAus(nimmProjektZurueck, 'zurueckgenommen', false)}
              disabled={laeuft}
            >
              <Icon name="zurueck" size={18} />
              Wieder in Bearbeitung nehmen
            </Button>
          ) : (
            <Button onClick={() => fuehreAus(gibProjektAb, 'abgegeben')} disabled={laeuft}>
              <Icon name="haken" size={18} />
              Als fertig markieren
            </Button>
          )}
        </div>

        <div aria-live="polite" className="space-y-3 empty:hidden">
          {antwort?.gespeichert && antwort.was === 'gesichert' ? (
            <Callout tone="success" title="Gesichert">
              Dein Stand ist gespeichert. Du kannst jederzeit weitermachen.
            </Callout>
          ) : null}

          {antwort?.gespeichert && antwort.was === 'abgegeben' ? (
            <Callout tone="success" title="Als fertig markiert">
              Notiert – mit Datum. Eine Rückmeldung von jemand anderem folgt hier nicht; der Maßstab
              sind die Abnahmekriterien oben. Du kannst das jederzeit zurücknehmen.
            </Callout>
          ) : null}

          {antwort?.gespeichert && antwort.was === 'zurueckgenommen' ? (
            <Callout tone="info" title="Wieder in Bearbeitung">
              Das Abgabedatum ist gelöscht. Deine Lösung steht unverändert im Editor.
            </Callout>
          ) : null}

          {antwort && !antwort.gespeichert ? (
            <Callout tone="caution" title="Nicht gespeichert">
              {antwort.hinweis}
            </Callout>
          ) : null}

          {antwort?.gespeichert && antwort.hinweis !== '' ? (
            <Callout tone="caution" title="Ein Hinweis zu deinem SQL">
              {antwort.hinweis} Gespeichert wurde trotzdem alles.
            </Callout>
          ) : null}
        </div>
      </section>
    </div>
  );
}
