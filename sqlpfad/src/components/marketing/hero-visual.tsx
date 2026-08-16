/**
 * Das Bild im Kopfbereich.
 *
 * Kein Foto und keine Illustration von Menschen am Laptop, sondern das, was
 * die Anwendung tatsächlich tut: links eine Abfrage, rechts das Ergebnis. Wer
 * SQL noch nie gesehen hat, versteht daran in drei Sekunden, worum es geht –
 * und wer es kennt, erkennt, dass hier jemand T-SQL meint und nicht
 * „Datenbanken allgemein".
 *
 * Zwei Details sind Absicht und keine Zierde:
 *
 *  - In der Ergebnistabelle steht ein NULL. Es ist als NULL gekennzeichnet und
 *    nicht als leere Zelle. Dass diese beiden nicht dasselbe sind, ist der
 *    häufigste Anfängerirrtum überhaupt; die Anwendung fängt gar nicht erst
 *    damit an, ihn zu befördern.
 *  - Der Text ist echtes Markup und kein Bild. Er lässt sich vergrößern,
 *    markieren und vorlesen.
 */

/** Ein Stück Text; `schlüssel` markiert ein T-SQL-Schlüsselwort. */
interface Stueck {
  text: string;
  art?: 'schlüssel';
}

const ZEILEN: ReadonlyArray<ReadonlyArray<Stueck>> = [
  [{ text: 'SELECT', art: 'schlüssel' }, { text: ' k.Name, MAX(b.Datum) AS Letzte' }],
  [{ text: 'FROM', art: 'schlüssel' }, { text: ' Kunden k' }],
  [
    { text: 'LEFT JOIN', art: 'schlüssel' },
    { text: ' Bestellungen b ' },
    { text: 'ON', art: 'schlüssel' },
    { text: ' b.KundeId = k.KundeId' },
  ],
  [{ text: 'GROUP BY', art: 'schlüssel' }, { text: ' k.Name' }],
  [
    { text: 'ORDER BY', art: 'schlüssel' },
    { text: ' Letzte ' },
    { text: 'DESC', art: 'schlüssel' },
    { text: ';' },
  ],
];

const ERGEBNIS: ReadonlyArray<readonly [string, string | null]> = [
  ['Sofia Adler', '2026-03-14'],
  ['Mehmet Kaya', '2026-02-02'],
  ['Anna Brandt', null],
];

const FARBE = { schlüssel: 'text-[#6ed3c7]' } as const;

export function HeroVisual(): React.ReactElement {
  return (
    <figure className="relative min-w-0">
      <figcaption className="sr-only">
        Beispiel: Eine T-SQL-Abfrage, die je Kundin das Datum der letzten Bestellung ermittelt,
        daneben das Ergebnis mit drei Zeilen. Bei einer Kundin ohne Bestellung steht NULL.
      </figcaption>

      <div
        aria-hidden="true"
        className="rounded-3xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur-sm sm:p-5"
      >
        {/* Abfrage ---------------------------------------------------------- */}
        <p className="text-[0.7rem] font-bold uppercase tracking-widest text-white/50">Abfrage</p>
        <pre className="mt-2 overflow-x-auto font-mono text-[0.8rem] leading-relaxed text-white/85 sm:text-[0.875rem]">
          <code>
            {ZEILEN.map((zeile, index) => (
              <span key={index} className="block">
                {zeile.map((stueck, i) => (
                  <span key={i} className={stueck.art ? FARBE[stueck.art] : undefined}>
                    {stueck.text}
                  </span>
                ))}
                {index === ZEILEN.length - 1 ? (
                  <span className="animate-caret ml-0.5 inline-block w-[0.5ch] bg-white/70 align-text-bottom">
                    &nbsp;
                  </span>
                ) : null}
              </span>
            ))}
          </code>
        </pre>

        {/* Ergebnis --------------------------------------------------------- */}
        <p className="mt-5 text-[0.7rem] font-bold uppercase tracking-widest text-white/50">
          Ergebnis · 3 Zeilen
        </p>
        <table className="mt-2 w-full border-collapse text-left font-mono text-[0.8rem]">
          <thead>
            <tr className="border-b border-white/20 text-white/60">
              <th scope="col" className="py-1.5 pr-3 font-semibold">
                Name
              </th>
              <th scope="col" className="py-1.5 font-semibold">
                Letzte
              </th>
            </tr>
          </thead>
          <tbody>
            {ERGEBNIS.map(([name, datum]) => (
              <tr key={name} className="border-b border-white/10 last:border-0">
                <td className="py-1.5 pr-3 text-white/85">{name}</td>
                <td className="py-1.5">
                  {datum === null ? (
                    /*
                     * NULL wird benannt und nicht weggelassen. Eine leere Zelle
                     * würde genau die Verwechslung nahelegen, die die erste
                     * Lektion auszuräumen versucht.
                     */
                    <span className="italic text-white/40">NULL</span>
                  ) : (
                    <span className="text-white/85">{datum}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
