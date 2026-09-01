/**
 * Landing-Hero: eine echte Tokenisierung als These der Seite, keine
 * Illustration. Statische, redaktionell festgelegte Beispielzerlegung (siehe
 * DESIGN.md) – kein Aufruf an einen echten Tokenizer oder KI-Anbieter, damit
 * die Aussage deterministisch und reproduzierbar bleibt. Die eigentliche
 * Lab-Übung unter /labs/tokenizer arbeitet mit eigenen, redaktionell
 * geprüften Beispielen.
 *
 * Führende Leerzeichen werden als "·" sichtbar gemacht – dieselbe Konvention,
 * die verbreitete Tokenizer-Visualisierungen nutzen, damit Wortgrenzen nicht
 * unsichtbar im Leerraum verschwinden.
 */

const TOKENS = [
  'Ver',
  'stehe',
  ',',
  ' was',
  ' ein',
  ' Sprach',
  'modell',
  ' wirklich',
  ' sieht',
  '.',
];

const TINTS = [
  'border-ink-300 bg-ink-100 text-ink-800 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-100',
  'border-signal-300 bg-signal-100 text-signal-700 dark:border-signal-700 dark:bg-signal-900/50 dark:text-signal-200',
  'border-wire-300 bg-wire-100 text-wire-600 dark:border-wire-600 dark:bg-wire-900/50 dark:text-wire-300',
];

export function TokenizerStrip(): React.ReactElement {
  return (
    <figure className="w-full">
      <div
        aria-label={`Beispielzerlegung des Satzes "Verstehe, was ein Sprachmodell wirklich sieht." in ${TOKENS.length} Tokens`}
        className="flex flex-wrap gap-1.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-raised)] p-4 sm:p-5"
      >
        {TOKENS.map((token, index) => (
          <span
            key={index}
            style={{ ['--stagger' as string]: `${index * 55}ms` }}
            className={`token-chip flex flex-col items-center rounded-[var(--radius-sm)] border px-2 py-1 font-mono text-sm ${TINTS[index % TINTS.length]}`}
          >
            <span className="whitespace-pre">
              {token.startsWith(' ') ? `·${token.slice(1)}` : token}
            </span>
            <span className="mt-0.5 text-[0.65rem] leading-none opacity-60">{index}</span>
          </span>
        ))}
      </div>
      <figcaption className="mt-2 text-xs text-[var(--fg-muted)]">
        Beispielhafte Zerlegung in {TOKENS.length} Tokens — jede Zahl ist die Position im
        Kontextfenster, jeder Punkt „·“ steht für ein führendes Leerzeichen. Genau das lernst du im{' '}
        <span className="font-mono">Tokenizer-Lab</span> nachzuvollziehen.
      </figcaption>
    </figure>
  );
}
