import { leseMarkdown, leseZeile, type Textteil } from '@/domain/inhalt/markdown';

/**
 * Der Erklärtext einer Lektion.
 *
 * Baut React-Elemente aus der Struktur, die `leseMarkdown` liefert – nicht aus
 * einer HTML-Zeichenfolge. Damit gibt es kein `dangerouslySetInnerHTML` und
 * keinen Weg, über den Inhalt Markup einzuschleusen. Die Begründung steht
 * ausführlich im Kopf von `src/domain/inhalt/markdown.ts`.
 */

function Teile({ teile }: { teile: readonly Textteil[] }): React.ReactElement {
  return (
    <>
      {teile.map((teil, index) =>
        teil.art === 'fett' ? (
          <strong key={index} className="font-bold">
            {teil.text}
          </strong>
        ) : teil.art === 'kursiv' ? (
          <em key={index} className="italic">
            {teil.text}
          </em>
        ) : teil.art === 'code' ? (
          <code
            key={index}
            className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono text-[0.9em]"
          >
            {teil.text}
          </code>
        ) : (
          <span key={index}>{teil.text}</span>
        ),
      )}
    </>
  );
}

/**
 * Eine einzelne Zeile mit Auszeichnung – für Aufgabenstellungen.
 *
 * Eine Aufgabenstellung wie „Wie sieht das Ergebnis von `SELECT Name FROM
 * Mitarbeitende` aus?" enthält Code mitten im Satz. Ohne Auszeichnung stünden
 * dort Backticks; mit dem vollen `Lektionstext` bekäme der Satz Absatzabstände,
 * die er nicht braucht.
 */
export function Zeilentext({ text }: { text: string }): React.ReactElement {
  return <Teile teile={leseZeile(text)} />;
}

export function Lektionstext({ text }: { text: string }): React.ReactElement {
  const blöcke = leseMarkdown(text);

  return (
    <div className="space-y-4 text-[1.05rem] leading-relaxed">
      {blöcke.map((block, index) => {
        if (block.art === 'code') {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-4 font-mono text-sm"
            >
              <code>{block.text}</code>
            </pre>
          );
        }

        if (block.art === 'liste') {
          return (
            <ul key={index} className="ml-1 space-y-2">
              {block.punkte.map((punkt, punktIndex) => (
                <li key={punktIndex} className="flex gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                  />
                  <span>
                    <Teile teile={punkt} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.art === 'tabelle') {
          return (
            // Eine Tabelle im Erklärtext kann breiter sein als die Spalte. Sie
            // scrollt in ihrem eigenen Kasten, damit nicht die Seite wandert.
            <div key={index} className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full border-collapse text-left text-[0.95rem]">
                <thead className="bg-[var(--surface-sunken)]">
                  <tr>
                    {block.kopf.map((zelle, zellenIndex) => (
                      <th
                        key={zellenIndex}
                        scope="col"
                        className="border-b border-[var(--border)] px-3 py-2 font-semibold"
                      >
                        <Teile teile={zelle} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.zeilen.map((zeile, zeilenIndex) => (
                    <tr key={zeilenIndex}>
                      {zeile.map((zelle, zellenIndex) => (
                        <td
                          key={zellenIndex}
                          className="border-b border-[var(--border)] px-3 py-2 last:border-0"
                        >
                          <Teile teile={zelle} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p key={index}>
            <Teile teile={block.teile} />
          </p>
        );
      })}
    </div>
  );
}
