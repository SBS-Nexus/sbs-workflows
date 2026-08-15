import { beschreibeErgebnis, istZahlenspalte, zeigeWert } from '@/domain/sql/anzeige';
import type { Resultset } from '@/domain/sql/resultset';
import { cx } from '@/components/ui/primitives';

/**
 * Die Ergebnistabelle.
 *
 * Was hier angezeigt wird, entscheidet `src/domain/sql/anzeige.ts` – diese
 * Datei setzt nur um. Drei Dinge sind trotzdem hier begründet, weil sie an der
 * Darstellung hängen:
 *
 *  - Die Tabelle ist ein `<table>` mit `<th scope="col">`. Ein Raster aus
 *    `<div>` sähe genauso aus und wäre für Hilfstechnik eine Reihe
 *    zusammenhangloser Texte.
 *  - Sie scrollt in einem eigenen Kasten. Sonst schiebt ein Ergebnis mit
 *    zwölf Spalten die ganze Seite zur Seite.
 *  - Ein gekürztes Ergebnis wird über der Tabelle benannt, nicht darunter.
 *    Wer die Zeilen zählt, hat die Anzeige längst für vollständig gehalten,
 *    bevor er unten ankommt.
 */

const ART_KLASSE = {
  null: 'italic text-[var(--text-muted)]',
  zahl: 'tabular-nums',
  wahrheit: 'tabular-nums',
  datum: 'tabular-nums',
  binaer: 'text-[var(--text-muted)]',
  text: '',
} as const;

export function ErgebnisTabelle({
  resultset,
  abgeschnitten = false,
  gelieferteZeilen,
  dauerMs,
}: {
  resultset: Resultset;
  abgeschnitten?: boolean;
  gelieferteZeilen?: number;
  dauerMs?: number;
}): React.ReactElement {
  const beschreibung = beschreibeErgebnis(resultset, {
    abgeschnitten,
    ...(gelieferteZeilen === undefined ? {} : { gelieferteZeilen }),
  });
  const rechtsbuendig = resultset.spalten.map((_, index) => istZahlenspalte(resultset, index));

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p
          className={cx(
            'text-sm font-semibold',
            abgeschnitten ? 'text-[var(--caution)]' : 'text-[var(--text-muted)]',
          )}
        >
          {beschreibung}
        </p>
        {dauerMs === undefined ? null : (
          <p className="text-sm text-[var(--text-muted)] tabular-nums">{dauerMs} ms</p>
        )}
      </div>

      {resultset.zeilen.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-[var(--text-muted)]">
          {/*
           * Auch das leere Ergebnis bekommt die Spaltenköpfe zu sehen: Sie
           * zeigen, dass die Abfrage gelaufen ist und welche Spalten sie
           * geliefert hätte.
           */}
          <p className="font-mono text-sm">{resultset.spalten.join(' · ')}</p>
          <p className="mt-2">Keine Zeile erfüllt die Bedingung.</p>
        </div>
      ) : (
        <div className="mt-3 max-h-[26rem] overflow-auto rounded-xl border border-[var(--border)]">
          <table className="w-full border-collapse text-left font-mono text-sm">
            <thead className="sticky top-0 bg-[var(--surface-sunken)]">
              <tr>
                {resultset.spalten.map((spalte, index) => (
                  <th
                    key={`${spalte}-${index}`}
                    scope="col"
                    className={cx(
                      'border-b border-[var(--border)] px-3 py-2 font-semibold whitespace-nowrap',
                      rechtsbuendig[index] ? 'text-right' : 'text-left',
                    )}
                  >
                    {spalte}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultset.zeilen.map((zeile, zeilenIndex) => (
                <tr key={zeilenIndex} className="odd:bg-[var(--surface-sunken)]/40">
                  {zeile.map((wert, spaltenIndex) => {
                    const angezeigt = zeigeWert(wert);
                    return (
                      <td
                        key={spaltenIndex}
                        className={cx(
                          'border-b border-[var(--border)] px-3 py-1.5 whitespace-nowrap',
                          rechtsbuendig[spaltenIndex] ? 'text-right' : 'text-left',
                          ART_KLASSE[angezeigt.art],
                        )}
                      >
                        {angezeigt.vorlesen ? (
                          <>
                            <span aria-hidden="true">{angezeigt.text}</span>
                            <span className="sr-only">{angezeigt.vorlesen}</span>
                          </>
                        ) : (
                          angezeigt.text
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
