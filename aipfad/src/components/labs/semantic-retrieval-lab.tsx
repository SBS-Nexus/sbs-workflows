'use client';

import { useId, useState } from 'react';
import { Badge, Button, Callout, cx } from '@/components/ui/primitives';
import { LabCompleteButton } from './lab-complete-button';
import { ScrollBereich } from './scroll-bereich';
import {
  semanticRetrievalConfigSchema,
  type SemanticRetrievalConfig,
} from '@/domain/labs/semantic-retrieval-config';
import {
  anSchwelleTeilen,
  gemeinsameWoerter,
  precisionUndRecall,
  rangliste,
  topK,
  type RanglistenEintrag,
} from '@/domain/retrieval/ranking';

type Dokument = SemanticRetrievalConfig['dokumente'][number];
type Entscheidung = SemanticRetrievalConfig['entscheidungen'][number];

/**
 * Zahlen auf Deutsch mit fester Stellenzahl. −0,000 wird als 0,000
 * ausgegeben: Das Minus wäre an dieser Stelle reines Rundungsrauschen.
 */
function zahl(wert: number, stellen = 3): string {
  const gerundet = Number(wert.toFixed(stellen));
  return (Object.is(gerundet, -0) ? 0 : gerundet).toLocaleString('de-DE', {
    minimumFractionDigits: stellen,
    maximumFractionDigits: stellen,
  });
}

function anteil(wert: number | null): string {
  return wert === null ? 'nicht definiert' : zahl(wert, 2);
}

/**
 * Das Lab "Semantische Suche verstehen".
 *
 * Alle Zahlen entstehen im Browser aus den Domainfunktionen in
 * `domain/retrieval/` — kein Server-, Modell- oder Netzaufruf. Die Rangliste
 * ist eine echte Tabelle und bleibt auch ohne Farbe, Balken oder Maus
 * vollständig lesbar.
 *
 * Abschließen lässt sich das Lab erst, nachdem beide inhaltlichen
 * Entscheidungen richtig getroffen sind. Ein bloßer "Verstanden"-Knopf wäre
 * keine Interaktion mit dem Stoff.
 */
export function SemanticRetrievalLab({
  config,
  onCompleteAction,
}: {
  config: unknown;
  onCompleteAction: () => Promise<boolean>;
}): React.ReactElement {
  const cfg = semanticRetrievalConfigSchema.parse(config);
  const idPrefix = useId();

  const [anfrageId, setAnfrageId] = useState(cfg.anfragen[0]?.id ?? '');
  const [aufgenommen, setAufgenommen] = useState<ReadonlySet<string>>(
    () => new Set(cfg.dokumente.map((d) => d.id)),
  );
  const [k, setK] = useState(cfg.topK.start);
  const [rechnungFuer, setRechnungFuer] = useState<string | null>(null);
  const [auswahl, setAuswahl] = useState<Record<string, string>>({});
  const [geprueft, setGeprueft] = useState<Record<string, string>>({});

  const anfrage = cfg.anfragen.find((a) => a.id === anfrageId) ?? cfg.anfragen[0];
  if (!anfrage) throw new Error('Das Lab hat keine Anfrage.');

  const dokumentNachId = new Map(cfg.dokumente.map((d) => [d.id, d]));
  const aktiveDokumente = cfg.dokumente.filter((d) => aufgenommen.has(d.id));
  const vollstaendig = aktiveDokumente.length === cfg.dokumente.length;

  const liste = rangliste(anfrage.vektor, aktiveDokumente);
  const auswahlK = topK(liste.eintraege, k);
  const { ueber } = anSchwelleTeilen(auswahlK.treffer, cfg.schwelle);
  const ueberIds = new Set(ueber.map((t) => t.id));
  const topIds = new Set(auswahlK.treffer.map((t) => t.id));

  const istGeloest = (e: Entscheidung): boolean =>
    e.optionen.some((o) => o.korrekt && o.id === geprueft[e.id]);
  const geloest = cfg.entscheidungen.filter(istGeloest);
  const alleGeloest = geloest.length === cfg.entscheidungen.length;
  // Das fachliche Urteil wird erst gezeigt, wenn eine Entscheidung selbst
  // getroffen wurde — sonst wäre die Antwort vorweggenommen.
  const relevanzSichtbar = geloest.length > 0;
  const relevant = new Set(anfrage.relevanteDokumentIds);

  const guete = precisionUndRecall(
    ueber.map((t) => t.id),
    anfrage.relevanteDokumentIds.filter((id) => aufgenommen.has(id)),
  );

  const rechnungsEintrag = liste.eintraege.find((e) => e.id === rechnungFuer) ?? liste.eintraege[0];

  function dokumentUmschalten(id: string): void {
    setAufgenommen((vorher) => {
      const naechste = new Set(vorher);
      if (naechste.has(id)) {
        // Ohne ein einziges Dokument gäbe es keine Rangliste.
        if (naechste.size === 1) return vorher;
        naechste.delete(id);
      } else {
        naechste.add(id);
      }
      return naechste;
    });
  }

  const titel = (id: string): string => dokumentNachId.get(id)?.titel ?? id;
  const zusammenfassung =
    auswahlK.treffer.length === 0
      ? 'Keine Dokumente im Suchbestand.'
      : `Top-${k} für „${anfrage.text}“: ${auswahlK.treffer
          .map((t) => `${t.platz}. ${titel(t.id)} (${zahl(t.score)})`)
          .join(', ')}. ${
          ueber.length === 0
            ? `Kein Treffer erreicht die Schwelle ${zahl(cfg.schwelle, 2)}.`
            : `${ueber.length} davon über der Schwelle ${zahl(cfg.schwelle, 2)}.`
        }`;

  return (
    <div className="space-y-8">
      <Callout tone="caution" title="Didaktische Beispielvektoren">
        Alle Vektoren in diesem Lab sind redaktionell festgelegt, damit sich jede Rechnung von Hand
        nachvollziehen lässt. Sie stammen nicht von einem Embedding-Modell. Echte Embeddings haben
        weit mehr Dimensionen, und keine davon trägt einen Namen wie „
        {cfg.dimensionen[0]?.bezeichnung}“.
      </Callout>

      {/* 1. Anfrage ---------------------------------------------------- */}
      <section aria-labelledby={`${idPrefix}-anfrage`}>
        <h2 id={`${idPrefix}-anfrage`} className="mb-3 font-mono text-base font-semibold">
          1. Suchanfrage wählen
        </h2>
        <fieldset className="space-y-2">
          <legend className="sr-only">Suchanfrage</legend>
          {cfg.anfragen.map((a) => (
            <label
              key={a.id}
              className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm has-[:checked]:border-signal-500 has-[:checked]:bg-signal-100 dark:has-[:checked]:bg-signal-900/30"
            >
              <input
                type="radio"
                name={`${idPrefix}-anfrage`}
                value={a.id}
                checked={a.id === anfrage.id}
                onChange={() => {
                  setAnfrageId(a.id);
                  setRechnungFuer(null);
                }}
                className="mt-1"
              />
              <span>{a.text}</span>
            </label>
          ))}
        </fieldset>
      </section>

      {/* 2. Suchbestand ------------------------------------------------- */}
      <section aria-labelledby={`${idPrefix}-bestand`}>
        <h2 id={`${idPrefix}-bestand`} className="mb-1 font-mono text-base font-semibold">
          2. Suchbestand
        </h2>
        <p className="mb-3 text-sm text-[var(--fg-muted)]">
          Nur aufgenommene Dokumente werden verglichen. Mindestens eines bleibt immer aufgenommen.
        </p>
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Dokumente im Suchbestand</legend>
          {cfg.dokumente.map((d) => {
            const letztes = aufgenommen.has(d.id) && aufgenommen.size === 1;
            return (
              <label
                key={d.id}
                className={cx(
                  'flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm',
                  letztes ? 'cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                <input
                  type="checkbox"
                  checked={aufgenommen.has(d.id)}
                  disabled={letztes}
                  onChange={() => dokumentUmschalten(d.id)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{d.titel}</span>
                  <span className="block text-xs text-[var(--fg-muted)]">{d.quelle}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </section>

      {/* 3. Vektoren ---------------------------------------------------- */}
      <section aria-labelledby={`${idPrefix}-vektoren`}>
        <h2 id={`${idPrefix}-vektoren`} className="mb-3 font-mono text-base font-semibold">
          3. Zugeordnete Vektoren
        </h2>
        <ScrollBereich beschriftung="Vektortabelle">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="px-3 pt-2 text-left text-xs text-[var(--fg-muted)]">
              Didaktische Beispielvektoren, redaktionell festgelegt — eine Spalte je Dimension.
            </caption>
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th scope="col" className="px-3 py-2 font-medium text-[var(--fg-muted)]">
                  Text
                </th>
                {cfg.dimensionen.map((dim) => (
                  <th
                    key={dim.id}
                    scope="col"
                    className="px-2 py-2 text-right font-medium whitespace-nowrap text-[var(--fg-muted)]"
                  >
                    {dim.bezeichnung}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              <VektorZeile beschriftung="Anfrage" vektor={anfrage.vektor} hervorgehoben />
              {aktiveDokumente.map((d) => (
                <VektorZeile key={d.id} beschriftung={d.titel} vektor={d.vektor} />
              ))}
            </tbody>
          </table>
        </ScrollBereich>
      </section>

      {/* 4. Top-k ------------------------------------------------------- */}
      <section aria-labelledby={`${idPrefix}-k`}>
        <h2 id={`${idPrefix}-k`} className="mb-3 font-mono text-base font-semibold">
          4. Wie viele Treffer? (Top-k)
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <label htmlFor={`${idPrefix}-k-wert`} className="text-sm">
            Anzahl der Treffer k
          </label>
          <input
            id={`${idPrefix}-k-wert`}
            type="range"
            min={cfg.topK.min}
            max={cfg.topK.max}
            step={1}
            value={k}
            onChange={(event) => setK(Number(event.target.value))}
            aria-valuetext={`k = ${k}`}
            className="w-44 accent-[var(--color-signal-500)]"
          />
          <output htmlFor={`${idPrefix}-k-wert`} className="font-mono text-sm font-semibold">
            k = {k}
          </output>
        </div>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Schwelle für Antwortkandidaten: Kosinusähnlichkeit ab {zahl(cfg.schwelle, 2)}. Die
          Schwelle ist für diese Beispieldaten gewählt — für echte Daten muss sie an eigenen
          Beispielen geprüft werden.
        </p>
        {auswahlK.angefordert > auswahlK.treffer.length ? (
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Angefordert sind {auswahlK.angefordert} Treffer, im Suchbestand stehen nur{' '}
            {auswahlK.verfuegbar} Dokumente.
          </p>
        ) : null}
      </section>

      {/* 5. Rangliste --------------------------------------------------- */}
      <section aria-labelledby={`${idPrefix}-rangliste`}>
        <h2 id={`${idPrefix}-rangliste`} className="mb-3 font-mono text-base font-semibold">
          5. Rangliste nach Kosinusähnlichkeit
        </h2>
        <p role="status" aria-live="polite" className="sr-only">
          {zusammenfassung}
        </p>
        <ScrollBereich beschriftung="Rangliste">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="px-3 pt-2 text-left text-xs text-[var(--fg-muted)]">
              Alle aufgenommenen Dokumente, absteigend nach Score; bei Gleichstand alphabetisch nach
              Kennung.
            </caption>
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th scope="col" className="px-3 py-2 font-medium text-[var(--fg-muted)]">
                  Platz
                </th>
                <th scope="col" className="px-3 py-2 font-medium text-[var(--fg-muted)]">
                  Dokument
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium text-[var(--fg-muted)]">
                  Score
                </th>
                <th scope="col" className="px-3 py-2 font-medium text-[var(--fg-muted)]">
                  Gemeinsame Wörter
                </th>
                <th scope="col" className="px-3 py-2 font-medium text-[var(--fg-muted)]">
                  Status
                </th>
                {relevanzSichtbar ? (
                  <th scope="col" className="px-3 py-2 font-medium text-[var(--fg-muted)]">
                    Fachlich relevant?
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {liste.eintraege.map((eintrag) => {
                const dokument = dokumentNachId.get(eintrag.id);
                const woerter = dokument ? gemeinsameWoerter(anfrage.text, dokument.text) : [];
                const imTop = topIds.has(eintrag.id);
                return (
                  <tr
                    key={eintrag.id}
                    className={cx(
                      'border-b border-[var(--border)] last:border-0',
                      imTop && 'bg-signal-100/60 dark:bg-signal-900/20',
                    )}
                  >
                    <td className="px-3 py-2 font-mono">{eintrag.platz}</td>
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      {titel(eintrag.id)}
                    </th>
                    <td className="px-3 py-2 text-right font-mono">{zahl(eintrag.score)}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {woerter.length > 0 ? woerter.join(', ') : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex flex-wrap gap-1 whitespace-nowrap">
                        {imTop ? (
                          <Badge tone="info">in Top-{k}</Badge>
                        ) : (
                          <Badge tone="neutral">außerhalb</Badge>
                        )}
                        {imTop && !ueberIds.has(eintrag.id) ? (
                          <Badge tone="caution">unter Schwelle</Badge>
                        ) : null}
                      </span>
                    </td>
                    {relevanzSichtbar ? (
                      <td className="px-3 py-2">
                        {relevant.has(eintrag.id) ? (
                          <Badge tone="success">ja</Badge>
                        ) : (
                          <Badge tone="neutral">nein</Badge>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollBereich>
        {liste.ausgeschlossen.length > 0 ? (
          <Callout tone="caution" title="Nicht vergleichbar" className="mt-3">
            {liste.ausgeschlossen.map((a) => a.meldung).join(' ')}
          </Callout>
        ) : null}
        <p className="mt-2 text-xs text-[var(--fg-muted)]">
          „Gemeinsame Wörter“ zeigt, was eine reine Schlüsselwortsuche sehen würde: gleiche Wörter
          ab vier Buchstaben, ohne Füllwörter. Ein Strich heißt: kein einziges gemeinsames Wort.
        </p>
      </section>

      {/* 6. Treffer ----------------------------------------------------- */}
      <section aria-labelledby={`${idPrefix}-treffer`}>
        <h2 id={`${idPrefix}-treffer`} className="mb-3 font-mono text-base font-semibold">
          6. Treffer mit Quelltext
        </h2>
        {ueber.length === 0 ? (
          <Callout tone="caution" title="Kein ausreichend ähnlicher Treffer">
            Kein Dokument erreicht die Schwelle {zahl(cfg.schwelle, 2)}. Die Rangliste hat trotzdem
            einen Platz 1 — eine Rangliste sortiert nur. Ehrlich ist hier die Antwort „im
            Suchbestand steht nichts Passendes“.
          </Callout>
        ) : null}
        <ol className="mt-3 space-y-3">
          {auswahlK.treffer.map((t) => {
            const dokument = dokumentNachId.get(t.id);
            if (!dokument) return null;
            return (
              <TrefferKarte
                key={t.id}
                eintrag={t}
                dokument={dokument}
                unterSchwelle={!ueberIds.has(t.id)}
                relevanz={relevanzSichtbar ? relevant.has(t.id) : null}
              />
            );
          })}
        </ol>

        {relevanzSichtbar ? (
          <div className="mt-4 space-y-3">
            {anfrage.irrefuehrend && topIds.has(anfrage.irrefuehrend.dokumentId) ? (
              <Callout tone="warning" title="Irreführender Treffer">
                <strong>{titel(anfrage.irrefuehrend.dokumentId)}</strong>:{' '}
                {anfrage.irrefuehrend.erklaerung}
              </Callout>
            ) : null}
            <Callout tone="info" title="Mathematische Nähe und fachliche Relevanz">
              <p>{anfrage.lernpunkt}</p>
              <p className="mt-2">
                Über der Schwelle in Top-{k}: {guete.geliefert} Treffer, davon{' '}
                {guete.relevantGefunden} relevant. Precision {anteil(guete.precision)}, Recall{' '}
                {anteil(guete.recall)}
                {guete.recall === null ? ' (es gibt kein relevantes Dokument)' : ''}.
              </p>
            </Callout>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--fg-muted)]">
            Welche Treffer fachlich relevant sind, erscheint hier, sobald du unten eine Entscheidung
            richtig getroffen hast.
          </p>
        )}
      </section>

      {/* 7. Rechenweg --------------------------------------------------- */}
      <section aria-labelledby={`${idPrefix}-rechnung`}>
        <h2 id={`${idPrefix}-rechnung`} className="mb-3 font-mono text-base font-semibold">
          7. Rechenweg nachvollziehen
        </h2>
        <label htmlFor={`${idPrefix}-rechnung-dok`} className="mb-1 block text-sm">
          Kosinusähnlichkeit der Anfrage zu
        </label>
        <select
          id={`${idPrefix}-rechnung-dok`}
          value={rechnungsEintrag?.id ?? ''}
          onChange={(event) => setRechnungFuer(event.target.value)}
          className="mb-3 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm sm:w-auto"
        >
          {liste.eintraege.map((e) => (
            <option key={e.id} value={e.id}>
              {titel(e.id)}
            </option>
          ))}
        </select>
        {rechnungsEintrag ? (
          <Rechenweg
            eintrag={rechnungsEintrag}
            dimensionen={cfg.dimensionen.map((d) => d.bezeichnung)}
            anfrage={anfrage.vektor}
            dokument={dokumentNachId.get(rechnungsEintrag.id)?.vektor ?? []}
          />
        ) : null}
      </section>

      {/* 8. Entscheidungen ---------------------------------------------- */}
      <section aria-labelledby={`${idPrefix}-entscheidungen`}>
        <h2 id={`${idPrefix}-entscheidungen`} className="mb-1 font-mono text-base font-semibold">
          8. Deine Entscheidungen
        </h2>
        <p className="mb-4 text-sm text-[var(--fg-muted)]">
          Beide Entscheidungen beziehen sich auf den vollständigen Suchbestand. Erst wenn beide
          richtig sind, lässt sich das Lab abschließen.
        </p>
        <div className="space-y-5">
          {cfg.entscheidungen.map((e) => {
            const zugehoerig = cfg.anfragen.find((a) => a.id === e.anfrageId);
            const aktiv = e.anfrageId === anfrage.id && vollstaendig;
            const gewaehlt = auswahl[e.id];
            const geprueftId = geprueft[e.id];
            const geprueftOption = e.optionen.find((o) => o.id === geprueftId);
            const fertig = istGeloest(e);
            return (
              <fieldset
                key={e.id}
                className="rounded-[var(--radius-md)] border border-[var(--border)] p-4"
              >
                <legend className="px-1 text-sm font-semibold">{e.frage}</legend>
                {!aktiv && !fertig ? (
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-[var(--fg-muted)]">
                    <span>
                      {e.anfrageId !== anfrage.id
                        ? 'Dafür gehört die passende Anfrage in die Rangliste.'
                        : 'Dafür müssen alle Dokumente im Suchbestand sein.'}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setAnfrageId(e.anfrageId);
                        setAufgenommen(new Set(cfg.dokumente.map((d) => d.id)));
                        setRechnungFuer(null);
                      }}
                    >
                      {e.anfrageId !== anfrage.id
                        ? `Anfrage „${zugehoerig?.text ?? e.anfrageId}“ anzeigen`
                        : 'Alle Dokumente wieder aufnehmen'}
                    </Button>
                  </div>
                ) : null}
                <div className="space-y-2">
                  {e.optionen.map((o) => (
                    <label
                      key={o.id}
                      className={cx(
                        'flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm has-[:checked]:border-signal-500 has-[:checked]:bg-signal-100 dark:has-[:checked]:bg-signal-900/30',
                        aktiv && !fertig ? 'cursor-pointer' : 'cursor-not-allowed opacity-80',
                      )}
                    >
                      <input
                        type="radio"
                        name={`${idPrefix}-${e.id}`}
                        value={o.id}
                        checked={gewaehlt === o.id}
                        disabled={!aktiv || fertig}
                        onChange={() => setAuswahl((vorher) => ({ ...vorher, [e.id]: o.id }))}
                        className="mt-1"
                      />
                      <span>{o.text}</span>
                    </label>
                  ))}
                </div>
                {fertig ? null : (
                  <Button
                    size="sm"
                    className="mt-3"
                    disabled={!aktiv || !gewaehlt}
                    onClick={() =>
                      gewaehlt && setGeprueft((vorher) => ({ ...vorher, [e.id]: gewaehlt }))
                    }
                  >
                    Entscheidung prüfen
                  </Button>
                )}
                {geprueftOption ? (
                  <Callout
                    tone={geprueftOption.korrekt ? 'success' : 'alert'}
                    title={geprueftOption.korrekt ? 'Richtig' : 'Noch nicht'}
                    live
                    className="mt-3"
                  >
                    {geprueftOption.feedback}
                  </Callout>
                ) : null}
              </fieldset>
            );
          })}
        </div>
      </section>

      <div className="border-t border-[var(--border)] pt-5">
        {alleGeloest ? (
          <LabCompleteButton onCompleteAction={onCompleteAction} label="Lab abschließen" />
        ) : (
          <p className="text-sm text-[var(--fg-muted)]">
            Noch {cfg.entscheidungen.length - geloest.length} von {cfg.entscheidungen.length}{' '}
            Entscheidungen offen — danach kannst du das Lab abschließen.
          </p>
        )}
      </div>
    </div>
  );
}

function VektorZeile({
  beschriftung,
  vektor,
  hervorgehoben = false,
}: {
  beschriftung: string;
  vektor: readonly number[];
  hervorgehoben?: boolean;
}): React.ReactElement {
  return (
    <tr
      className={cx(
        'border-b border-[var(--border)] last:border-0',
        hervorgehoben && 'bg-signal-100/60 dark:bg-signal-900/20',
      )}
    >
      <th scope="row" className="px-3 py-1.5 text-left font-sans text-sm font-medium">
        {beschriftung}
      </th>
      {vektor.map((wert, index) => (
        <td key={index} className="px-2 py-1.5 text-right">
          {zahl(wert, 1)}
        </td>
      ))}
    </tr>
  );
}

function TrefferKarte({
  eintrag,
  dokument,
  unterSchwelle,
  relevanz,
}: {
  eintrag: RanglistenEintrag;
  dokument: Dokument;
  unterSchwelle: boolean;
  relevanz: boolean | null;
}): React.ReactElement {
  return (
    <li className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          <span className="font-mono">{eintrag.platz}.</span> {dokument.titel}
        </p>
        <p className="font-mono text-sm">Score {zahl(eintrag.score)}</p>
      </div>
      <blockquote className="mt-2 border-l-2 border-[var(--border)] pl-3 text-sm">
        {dokument.text}
      </blockquote>
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[var(--fg-muted)]">
        <span>Quelle: {dokument.quelle}</span>
        {unterSchwelle ? <Badge tone="caution">unter Schwelle</Badge> : null}
        {relevanz === true ? <Badge tone="success">fachlich relevant</Badge> : null}
        {relevanz === false ? <Badge tone="neutral">nicht relevant</Badge> : null}
      </p>
    </li>
  );
}

function Rechenweg({
  eintrag,
  dimensionen,
  anfrage,
  dokument,
}: {
  eintrag: RanglistenEintrag;
  dimensionen: string[];
  anfrage: readonly number[];
  dokument: readonly number[];
}): React.ReactElement {
  const { rechnung } = eintrag;
  const summanden = rechnung.produkte
    .map((_, i) => `${zahl(anfrage[i] ?? Number.NaN, 1)} · ${zahl(dokument[i] ?? Number.NaN, 1)}`)
    .join(' + ');
  return (
    <div className="space-y-3">
      <ScrollBereich beschriftung="Produkte je Dimension">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Produkte je Dimension</caption>
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th scope="col" className="px-3 py-2 font-medium text-[var(--fg-muted)]">
                Dimension
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-[var(--fg-muted)]">
                Anfrage
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-[var(--fg-muted)]">
                Dokument
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-[var(--fg-muted)]">
                Produkt
              </th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {rechnung.produkte.map((produkt, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0">
                <th scope="row" className="px-3 py-1.5 text-left font-sans text-sm font-normal">
                  {dimensionen[i]}
                </th>
                <td className="px-3 py-1.5 text-right">{zahl(anfrage[i] ?? Number.NaN, 1)}</td>
                <td className="px-3 py-1.5 text-right">{zahl(dokument[i] ?? Number.NaN, 1)}</td>
                <td className="px-3 py-1.5 text-right">{zahl(produkt, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollBereich>
      <dl className="space-y-1.5 font-mono text-xs leading-relaxed">
        <div>
          <dt className="inline font-sans text-sm font-medium">Skalarprodukt: </dt>
          <dd className="inline break-words">
            {summanden} = {zahl(rechnung.skalarprodukt)}
          </dd>
        </div>
        <div>
          <dt className="inline font-sans text-sm font-medium">Länge Anfrage: </dt>
          <dd className="inline">{zahl(rechnung.normA)}</dd>
        </div>
        <div>
          <dt className="inline font-sans text-sm font-medium">Länge Dokument: </dt>
          <dd className="inline">{zahl(rechnung.normB)}</dd>
        </div>
        <div>
          <dt className="inline font-sans text-sm font-medium">Kosinusähnlichkeit: </dt>
          <dd className="inline">
            {zahl(rechnung.skalarprodukt)} / ({zahl(rechnung.normA)} · {zahl(rechnung.normB)}) ={' '}
            <strong>{zahl(rechnung.kosinus)}</strong>
          </dd>
        </div>
      </dl>
    </div>
  );
}
