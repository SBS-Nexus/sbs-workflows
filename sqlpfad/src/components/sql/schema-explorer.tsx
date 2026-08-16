import { beziehungen, type UebungsDatensatz } from '@/domain/sql/schema';
import { Icon } from '@/components/ui/icon';

/**
 * Der Schema-Explorer.
 *
 * Er steht neben dem Editor, weil der zweite Schritt jeder Lektion „Die
 * Tabellen ansehen" heißt: Wer die Daten nicht kennt, rät beim Abfragen. Ein
 * Explorer, den man erst aufklappen muss, wird genau dann nicht benutzt, wenn
 * er gebraucht würde.
 *
 * Drei Angaben je Spalte, und alle drei aus einem Grund:
 *
 *  - **Der Datentyp**, weil `nvarchar` und `int` beim Vergleichen
 *    unterschiedlich reagieren und der Unterschied später Stunden kostet.
 *  - **Ob NULL erlaubt ist**, weil das die Frage ist, an der ein LEFT JOIN
 *    hängt – und weil eine Spalte ohne NULL gar nicht erst als „vielleicht
 *    leer" gelesen werden soll.
 *  - **Ein Satz zur Bedeutung**, weil ein Spaltenname sagt, wie etwas heißt,
 *    und nicht, was drinsteht.
 */

export function SchemaExplorer({ datensatz }: { datensatz: UebungsDatensatz }): React.ReactElement {
  const verweise = beziehungen(datensatz);

  return (
    <section aria-labelledby="schema-ueberschrift" className="space-y-4">
      <div>
        <h2
          id="schema-ueberschrift"
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <Icon name="karte" size={20} className="text-[var(--accent)]" />
          {datensatz.titel}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{datensatz.bereich}</p>
      </div>

      <ul className="space-y-3">
        {datensatz.tabellen.map((tabelle) => (
          <li key={tabelle.name} className="karte-flaeche rounded-2xl border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-mono text-base font-bold">{tabelle.name}</h3>
              <span className="text-sm text-[var(--text-muted)] tabular-nums">
                {tabelle.zeilen} Zeilen
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{tabelle.zweck}</p>

            <ul className="mt-3 space-y-2">
              {tabelle.spalten.map((spalte) => (
                <li key={spalte.name} className="border-t border-[var(--border)] pt-2">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-mono text-sm font-semibold">{spalte.name}</span>
                    <span className="font-mono text-xs text-[var(--text-muted)]">{spalte.typ}</span>

                    {spalte.primaerschluessel ? (
                      <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-[var(--accent)]">
                        Schlüssel
                      </span>
                    ) : null}

                    {/*
                     * Nur „NULL erlaubt" wird angezeigt, nicht auch „NOT NULL".
                     * Die Kennzeichnung soll auf die Stellen zeigen, an denen
                     * etwas fehlen kann; stünde an jeder Spalte etwas, würde
                     * man keine davon mehr lesen.
                     */}
                    {spalte.nullErlaubt ? (
                      <span className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[0.7rem] font-medium text-[var(--text-muted)]">
                        NULL erlaubt
                      </span>
                    ) : null}

                    {spalte.verweistAuf ? (
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        → {spalte.verweistAuf}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">{spalte.bedeutung}</p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {verweise.length > 0 ? (
        <div className="karte-flaeche rounded-2xl border p-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Wie die Tabellen zusammenhängen
          </h3>
          {/*
           * Als Sätze und nicht als Diagramm. Ein Pfeilbild sagt, dass es eine
           * Beziehung gibt; dieser Satz sagt, über welche Spalte man sie im
           * JOIN herstellt - und genau das muss gleich getippt werden.
           */}
          <ul className="mt-2 space-y-1 text-sm">
            {verweise.map((verweis) => (
              <li key={`${verweis.von}-${verweis.ueber}`}>
                <span className="font-mono">{verweis.von}</span> zeigt über{' '}
                <span className="font-mono">{verweis.ueber}</span> auf{' '}
                <span className="font-mono">{verweis.nach}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
