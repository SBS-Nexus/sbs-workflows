'use client';

import { useId, useState } from 'react';
import { Badge, Button, Callout, ProgressBar, cx } from '@/components/ui/primitives';
import { LabCompleteButton } from './lab-complete-button';
import { ScrollBereich } from './scroll-bereich';
import { ragPipelineConfigSchema, type RagPipelineConfig } from '@/domain/labs/rag-pipeline-config';
import { chunkeBestand, getrennteGruppen, type Chunk } from '@/domain/rag/chunking';
import { waehleKontext, type KontextEintrag } from '@/domain/rag/kontext';
import {
  NICHT_GENUEGEND_INFORMATIONEN,
  pruefeAussagen,
  simuliereAntwort,
  type GepruefteAussage,
} from '@/domain/rag/antwort';
import { bewerteRag } from '@/domain/rag/evaluation';

type Dokument = RagPipelineConfig['dokumente'][number];
type Entscheidung = RagPipelineConfig['entscheidungen'][number];

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

function satzbereich(von: number, bis: number): string {
  return von === bis ? `Satz ${von + 1}` : `Sätze ${von + 1}–${bis + 1}`;
}

const AUSSCHLUSS: Record<NonNullable<KontextEintrag['ausgeschlossen']>, string> = {
  'top-k': 'außerhalb Top-k',
  budget: 'Budget überschritten',
};

/**
 * Das RAG-Pipeline-Lab.
 *
 * Chunking, Ranking, Kontextauswahl, Belegprüfung und Evaluation laufen im
 * Browser über die reinen Funktionen aus `domain/rag/` und
 * `domain/retrieval/` — kein Modell, kein Netzaufruf. Der Antwort-Simulator
 * erzeugt nichts: Er zeigt vorgegebene Aussagen und ob der Kontext sie
 * trägt. Dokumenttexte werden ausschließlich als Text dargestellt.
 */
export function RagPipelineLab({
  config,
  onCompleteAction,
}: {
  config: unknown;
  onCompleteAction: () => Promise<boolean>;
}): React.ReactElement {
  const cfg = ragPipelineConfigSchema.parse(config);
  const idPrefix = useId();

  const [strategieId, setStrategieId] = useState(cfg.strategien[0]?.id ?? '');
  const [anfrageId, setAnfrageId] = useState(cfg.anfragen[0]?.id ?? '');
  const [k, setK] = useState(cfg.topK.start);
  const [budget, setBudget] = useState(cfg.budget.start);
  const [auswahl, setAuswahl] = useState<Record<string, string>>({});
  const [geprueftId, setGeprueftId] = useState<Record<string, string>>({});

  const strategie = cfg.strategien.find((s) => s.id === strategieId) ?? cfg.strategien[0];
  const anfrage = cfg.anfragen.find((a) => a.id === anfrageId) ?? cfg.anfragen[0];
  if (!strategie || !anfrage) throw new Error('Das Lab braucht Strategie und Anfrage.');

  const dokumentNachId = new Map(cfg.dokumente.map((d) => [d.id, d]));
  const chunks = chunkeBestand(cfg.dokumente, strategie);
  const kontext = waehleKontext(anfrage.vektor, chunks, { k, budget });
  const geprueft = pruefeAussagen(anfrage.aussagen, kontext.imKontext, cfg.dokumente);
  const antwort = simuliereAntwort(geprueft);
  const bewertung = bewerteRag({
    geprueft,
    benoetigteAussagen: anfrage.benoetigteAussagen,
    kontext: kontext.imKontext,
    alleChunks: chunks,
  });
  const getrennt = getrennteGruppen(
    chunks,
    anfrage.aussagen.flatMap((a) =>
      a.belege.filter((g) => g.length > 1).map((gruppe) => ({ aussage: a, gruppe })),
    ),
  );

  const istGeloest = (e: Entscheidung): boolean =>
    e.optionen.some((o) => o.korrekt && o.id === geprueftId[e.id]);
  const geloest = cfg.entscheidungen.filter(istGeloest);
  const alleGeloest = geloest.length === cfg.entscheidungen.length;
  const entscheidungZurAnfrage = cfg.entscheidungen.find((e) => e.anfrageId === anfrage.id);
  const lernpunktSichtbar = !entscheidungZurAnfrage || istGeloest(entscheidungZurAnfrage);

  const chunkLabel = (chunk: Chunk): string => {
    const dok = dokumentNachId.get(chunk.dokumentId);
    return `${dok?.quelle ?? chunk.dokumentId} · Version ${dok?.version ?? '?'} · ${satzbereich(chunk.von, chunk.bis)}`;
  };

  const zusammenfassung = `${kontext.imKontext.length} Chunks im Kontext, ${kontext.belegteEinheiten} von ${budget} Einheiten belegt. ${
    antwort.nichtGenuegend
      ? 'Simulierte Antwort: nicht genügend Informationen.'
      : `Simulierte Antwort: ${antwort.belegt.length} belegte Aussage(n).`
  }`;

  return (
    <div className="space-y-8">
      <Callout tone="caution" title="Simuliert, nicht echt">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Die Vektoren sind didaktische Beispielvektoren, redaktionell festgelegt — kein
            Embedding-Modell. Ein Chunk-Vektor ist die Summe seiner Satzvektoren.
          </li>
          <li>
            Das Kontextbudget zählt didaktische Einheiten: ein Wort je Einheit, keine Tokens eines
            bestimmten Modells.
          </li>
          <li>
            Der Antwort-Simulator ist keine KI. Er zeigt vorgegebene Aussagen und prüft, ob ein
            Chunk im Kontext sie belegt.
          </li>
        </ul>
      </Callout>

      {/* 1. Wissensbestand ----------------------------------------------- */}
      <section aria-labelledby={`${idPrefix}-bestand`}>
        <h2 id={`${idPrefix}-bestand`} className="mb-1 font-mono text-base font-semibold">
          1. Wissensbestand
        </h2>
        <p className="mb-3 text-sm text-[var(--fg-muted)]">
          Synthetische Unternehmensdokumente. Darunter siehst du, wie die gewählte Strategie sie in
          Chunks teilt.
        </p>
        <ul className="space-y-3">
          {cfg.dokumente.map((dok) => (
            <DokumentKarte
              key={dok.id}
              dokument={dok}
              nachfolger={dok.ersetztDurch ? dokumentNachId.get(dok.ersetztDurch) : undefined}
              chunks={chunks.filter((c) => c.dokumentId === dok.id)}
            />
          ))}
        </ul>
      </section>

      {/* 2. Chunking ---------------------------------------------------- */}
      <section aria-labelledby={`${idPrefix}-chunking`}>
        <h2 id={`${idPrefix}-chunking`} className="mb-3 font-mono text-base font-semibold">
          2. Chunking-Strategie
        </h2>
        <fieldset className="space-y-2">
          <legend className="sr-only">Chunking-Strategie</legend>
          {cfg.strategien.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm has-[:checked]:border-signal-500 has-[:checked]:bg-signal-100 dark:has-[:checked]:bg-signal-900/30"
            >
              <input
                type="radio"
                name={`${idPrefix}-strategie`}
                checked={s.id === strategie.id}
                onChange={() => setStrategieId(s.id)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">{s.bezeichnung}</span>
                <span className="block text-xs text-[var(--fg-muted)]">{s.beschreibung}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">{chunks.length} Chunks im Bestand.</p>
        {getrennt.length > 0 ? (
          <Callout tone="warning" title="Trennstelle zerschneidet einen Beleg" className="mt-3">
            {getrennt.map(({ aussage, gruppe }) => {
              const dok = dokumentNachId.get(gruppe[0]?.dokumentId ?? '');
              return (
                <p key={aussage.id}>
                  „{aussage.text}“ braucht {dok?.quelle}{' '}
                  {gruppe.map((v) => `Satz ${v.satz + 1}`).join(' und ')} zusammen — kein Chunk
                  dieser Strategie enthält alle.
                </p>
              );
            })}
          </Callout>
        ) : null}
      </section>

      {/* 3. Anfrage ----------------------------------------------------- */}
      <section aria-labelledby={`${idPrefix}-anfrage`}>
        <h2 id={`${idPrefix}-anfrage`} className="mb-3 font-mono text-base font-semibold">
          3. Anfrage
        </h2>
        <fieldset className="space-y-2">
          <legend className="sr-only">Anfrage</legend>
          {cfg.anfragen.map((a) => (
            <label
              key={a.id}
              className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm has-[:checked]:border-signal-500 has-[:checked]:bg-signal-100 dark:has-[:checked]:bg-signal-900/30"
            >
              <input
                type="radio"
                name={`${idPrefix}-anfrage`}
                checked={a.id === anfrage.id}
                onChange={() => setAnfrageId(a.id)}
                className="mt-1"
              />
              <span>{a.text}</span>
            </label>
          ))}
        </fieldset>
      </section>

      {/* 4. Retrieval und Kontext ------------------------------------------ */}
      <section aria-labelledby={`${idPrefix}-retrieval`}>
        <h2 id={`${idPrefix}-retrieval`} className="mb-3 font-mono text-base font-semibold">
          4. Retrieval und Kontextbudget
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Regler
            id={`${idPrefix}-k`}
            beschriftung="Anzahl der Treffer k"
            min={cfg.topK.min}
            max={cfg.topK.max}
            schritt={1}
            wert={k}
            anzeige={`k = ${k}`}
            onChange={setK}
          />
          <Regler
            id={`${idPrefix}-budget`}
            beschriftung="Kontextbudget in Einheiten"
            min={cfg.budget.min}
            max={cfg.budget.max}
            schritt={cfg.budget.schritt}
            wert={budget}
            anzeige={`${budget} Einheiten`}
            onChange={setBudget}
          />
        </div>
        <div className="mt-4">
          <ProgressBar
            value={kontext.belegteEinheiten}
            max={budget}
            label={`Kontextbudget: ${kontext.belegteEinheiten} von ${budget} Einheiten belegt`}
          />
          <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
            {kontext.belegteEinheiten} von {budget} Einheiten belegt (didaktische Wort-Einheiten).
          </p>
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {zusammenfassung}
        </p>
        <div className="mt-4">
          <ScrollBereich beschriftung="Chunk-Rangliste">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="px-3 pt-2 text-left text-xs text-[var(--fg-muted)]">
                Alle Chunks nach Kosinusähnlichkeit zur Anfrage, mit Status für den Kontext.
              </caption>
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th scope="col" className="px-3 py-2 font-medium text-[var(--fg-muted)]">
                    Platz
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-[var(--fg-muted)]">
                    Chunk
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-right font-medium text-[var(--fg-muted)]"
                  >
                    Score
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-right font-medium text-[var(--fg-muted)]"
                  >
                    Einheiten
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-[var(--fg-muted)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {kontext.eintraege.map((e) => (
                  <tr
                    key={e.chunk.id}
                    className={cx(
                      'border-b border-[var(--border)] align-top last:border-0',
                      e.ausgeschlossen === null && 'bg-signal-100/60 dark:bg-signal-900/20',
                    )}
                  >
                    <td className="px-3 py-2 font-mono">{e.platz}</td>
                    <th scope="row" className="min-w-56 px-3 py-2 text-left font-normal">
                      <span className="block font-medium">{chunkLabel(e.chunk)}</span>
                      <span className="block text-xs text-[var(--fg-muted)]">{e.chunk.text}</span>
                    </th>
                    <td className="px-3 py-2 text-right font-mono">{zahl(e.score)}</td>
                    <td className="px-3 py-2 text-right font-mono">{e.chunk.einheiten}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {e.ausgeschlossen === null ? (
                        <Badge tone="success">im Kontext</Badge>
                      ) : (
                        <Badge tone={e.ausgeschlossen === 'budget' ? 'caution' : 'neutral'}>
                          {AUSSCHLUSS[e.ausgeschlossen]}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollBereich>
        </div>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">
          Gleicher Score: Die Reihenfolge entscheidet die Chunk-Kennung, wie im Lab zur semantischen
          Suche. Chunks werden in Rangfolge übernommen, solange sie ins Budget passen.
        </p>
      </section>

      {/* 5. Simulierte Antwort ------------------------------------------------ */}
      <section aria-labelledby={`${idPrefix}-antwort`}>
        <h2 id={`${idPrefix}-antwort`} className="mb-3 font-mono text-base font-semibold">
          5. Simulierte Antwort
        </h2>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--fg-muted)]">
            Antwort-Simulator — keine KI, vorgegebene Aussagen
          </p>
          {antwort.nichtGenuegend ? (
            <p className="font-medium">{NICHT_GENUEGEND_INFORMATIONEN}</p>
          ) : (
            <ul className="space-y-3">
              {antwort.belegt.map((g) => (
                <li key={g.aussage.id}>
                  <p className="font-medium">{g.aussage.text}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--fg-muted)]">
                    <Badge tone="success">belegt</Badge>
                    <span>
                      Beleg: {g.belegChunks.map((c) => `${chunkLabel(c)} (${c.id})`).join('; ')}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        {antwort.zurueckgehalten.length > 0 ? (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">Nicht als Tatsache ausgegeben</h3>
            <ul className="space-y-2">
              {antwort.zurueckgehalten.map((g) => (
                <ZurueckgehalteneAussage
                  key={g.aussage.id}
                  geprueft={g}
                  chunkLabel={chunkLabel}
                  quelleVon={(id) => dokumentNachId.get(id)}
                  textVon={(id) => anfrage.aussagen.find((a) => a.id === id)?.text ?? id}
                />
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* 6. Evaluation ----------------------------------------------------- */}
      <section aria-labelledby={`${idPrefix}-evaluation`}>
        <h2 id={`${idPrefix}-evaluation`} className="mb-3 font-mono text-base font-semibold">
          6. Evaluation
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <Kennzahl
            name="Kontext-Precision"
            wert={anteil(bewertung.kontextPrecision)}
            hinweis="tragende Chunks / Chunks im Kontext"
          />
          <Kennzahl
            name="Kontext-Recall"
            wert={anteil(bewertung.kontextRecall)}
            hinweis="tragende Chunks im Kontext / im Bestand"
          />
          <Kennzahl
            name="Vollständigkeit"
            wert={anteil(bewertung.vollstaendigkeit)}
            hinweis="belegte / benötigte Aussagen"
          />
        </dl>
        <Callout
          tone={bewertung.ergebnisKorrekt ? 'success' : 'warning'}
          title={bewertung.ergebnisKorrekt ? 'Antwort fachlich richtig' : 'Antwort unvollständig'}
          className="mt-3"
        >
          {anfrage.benoetigteAussagen.length === 0
            ? bewertung.ergebnisKorrekt
              ? 'Keine Quelle beantwortet die Frage, und die Antwort sagt genau das.'
              : 'Keine Quelle beantwortet die Frage, die Antwort behauptet trotzdem etwas.'
            : bewertung.fehlend.length === 0
              ? 'Alle benötigten Aussagen sind belegt.'
              : `Es fehlt: ${bewertung.fehlend
                  .map((id) => anfrage.aussagen.find((a) => a.id === id)?.text ?? id)
                  .join(' · ')}`}
        </Callout>
        {lernpunktSichtbar ? (
          <Callout tone="info" title="Was diese Anfrage zeigt" className="mt-3">
            {anfrage.lernpunkt}
          </Callout>
        ) : null}
      </section>

      {/* 7. Entscheidungen -------------------------------------------------- */}
      <section aria-labelledby={`${idPrefix}-entscheidungen`}>
        <h2 id={`${idPrefix}-entscheidungen`} className="mb-1 font-mono text-base font-semibold">
          7. Deine Entscheidungen
        </h2>
        <p className="mb-4 text-sm text-[var(--fg-muted)]">
          Erst wenn alle {cfg.entscheidungen.length} Entscheidungen richtig sind, lässt sich das Lab
          abschließen.
        </p>
        <div className="space-y-5">
          {cfg.entscheidungen.map((e) => {
            const zugehoerig = cfg.anfragen.find((a) => a.id === e.anfrageId);
            const zielStrategie = e.strategieId
              ? cfg.strategien.find((s) => s.id === e.strategieId)
              : undefined;
            const aktiv =
              e.anfrageId === anfrage.id && (!e.strategieId || e.strategieId === strategie.id);
            const fertig = istGeloest(e);
            const gewaehlt = auswahl[e.id];
            const option = e.optionen.find((o) => o.id === geprueftId[e.id]);
            return (
              <fieldset
                key={e.id}
                className="rounded-[var(--radius-md)] border border-[var(--border)] p-4"
              >
                <legend className="px-1 text-sm font-semibold">{e.frage}</legend>
                {!aktiv && !fertig ? (
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-[var(--fg-muted)]">
                    <span>Dafür gehört die passende Einstellung in die Pipeline.</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setAnfrageId(e.anfrageId);
                        if (e.strategieId) setStrategieId(e.strategieId);
                      }}
                    >
                      {`Anfrage „${zugehoerig?.text ?? e.anfrageId}“${
                        zielStrategie ? ` mit „${zielStrategie.bezeichnung}“` : ''
                      } anzeigen`}
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
                      gewaehlt && setGeprueftId((vorher) => ({ ...vorher, [e.id]: gewaehlt }))
                    }
                  >
                    Entscheidung prüfen
                  </Button>
                )}
                {option ? (
                  <Callout
                    tone={option.korrekt ? 'success' : 'alert'}
                    title={option.korrekt ? 'Richtig' : 'Noch nicht'}
                    live
                    className="mt-3"
                  >
                    {option.feedback}
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

function DokumentKarte({
  dokument,
  nachfolger,
  chunks,
}: {
  dokument: Dokument;
  nachfolger: Dokument | undefined;
  chunks: Chunk[];
}): React.ReactElement {
  return (
    <li className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{dokument.titel}</p>
        <span className="font-mono text-xs text-[var(--fg-muted)]">
          {dokument.quelle} · Version {dokument.version} · gültig ab {dokument.gueltigAb}
        </span>
        {dokument.status === 'aktuell' ? (
          <Badge tone="success">aktuell</Badge>
        ) : (
          <Badge tone="caution">
            veraltet{nachfolger ? ` — ersetzt durch Version ${nachfolger.version}` : ''}
          </Badge>
        )}
      </div>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
        {dokument.saetze.map((satz, index) => (
          <li key={index}>{satz.text}</li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-[var(--fg-muted)]">
        Chunks: {chunks.map((c) => `${satzbereich(c.von, c.bis)} (${c.einheiten} E.)`).join(' · ')}
      </p>
    </li>
  );
}

function ZurueckgehalteneAussage({
  geprueft,
  chunkLabel,
  quelleVon,
  textVon,
}: {
  geprueft: GepruefteAussage;
  chunkLabel: (chunk: Chunk) => string;
  quelleVon: (id: string) => Dokument | undefined;
  textVon: (id: string) => string;
}): React.ReactElement {
  const { aussage, status } = geprueft;
  let grund: string;
  if (status === 'veraltet') {
    grund = `Nur in einer ersetzten Fassung belegt: ${geprueft.belegChunks.map(chunkLabel).join('; ')}.`;
  } else if (status === 'widerspruechlich') {
    grund = `Widerspricht einer ebenfalls belegten Aussage: ${geprueft.widersprichtDen.map(textVon).join('; ')}.`;
  } else if (geprueft.getrennt) {
    grund =
      'Die nötigen Sätze liegen im Kontext, aber in verschiedenen Chunks — keiner trägt die Aussage allein.';
  } else {
    grund = 'Kein Chunk im Kontext belegt diese Aussage.';
  }
  return (
    <li className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm">
      <p className="text-[var(--fg-muted)] line-through decoration-1">{aussage.text}</p>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
        <Badge tone={status === 'unbelegt' ? 'alert' : 'caution'}>
          {status === 'veraltet'
            ? 'veraltet'
            : status === 'widerspruechlich'
              ? 'widersprüchlich'
              : 'unbelegt'}
        </Badge>
        <span>{grund}</span>
      </p>
      {geprueft.erfundeneQuelle && aussage.zitierteQuelle ? (
        <p className="mt-1 text-xs">
          <Badge tone="alert">erfundene Quelle</Badge> Die Aussage beruft sich auf „
          {aussage.zitierteQuelle}“
          {quelleVon(aussage.zitierteQuelle) ? '' : ' — eine Quelle, die es im Bestand nicht gibt'};
          im Kontext liegt sie nicht.
        </p>
      ) : null}
    </li>
  );
}

function Regler({
  id,
  beschriftung,
  min,
  max,
  schritt,
  wert,
  anzeige,
  onChange,
}: {
  id: string;
  beschriftung: string;
  min: number;
  max: number;
  schritt: number;
  wert: number;
  anzeige: string;
  onChange: (wert: number) => void;
}): React.ReactElement {
  return (
    <div>
      <label htmlFor={id} className="block text-sm">
        {beschriftung}
      </label>
      <div className="mt-1 flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={schritt}
          value={wert}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-valuetext={anzeige}
          className="w-40 accent-[var(--color-signal-500)]"
        />
        <output htmlFor={id} className="font-mono text-sm font-semibold">
          {anzeige}
        </output>
      </div>
    </div>
  );
}

function Kennzahl({
  name,
  wert,
  hinweis,
}: {
  name: string;
  wert: string;
  hinweis: string;
}): React.ReactElement {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
      <dt className="text-xs text-[var(--fg-muted)]">{name}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold">{wert}</dd>
      <dd className="text-xs text-[var(--fg-muted)]">{hinweis}</dd>
    </div>
  );
}
