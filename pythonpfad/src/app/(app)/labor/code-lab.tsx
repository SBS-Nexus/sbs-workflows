'use client';

import { useState } from 'react';
import { Button, Card, cx } from '@/components/ui/primitives';
import { PythonWorkbench } from '@/components/editor/python-workbench';

const STARTER = `# Probiere hier alles aus, was dir einfaellt.
# Nichts davon wird bewertet.

zahlen = [4, 8, 15, 16, 23, 42]

summe = 0
for zahl in zahlen:
    summe = summe + zahl

print(f"Summe: {summe}")
print(f"Durchschnitt: {summe / len(zahlen):.2f}")
`;

/** Vorlagen, die typische Muster aus dem Kurs zeigen. */
const SNIPPETS = [
  {
    id: 'variablen',
    label: 'Variablen und Ausgabe',
    code: `name = "Welt"\nzahl = 7\n\nprint(f"Hallo {name}!")\nprint(f"Das Doppelte von {zahl} ist {zahl * 2}.")\n`,
  },
  {
    id: 'bedingung',
    label: 'Bedingung',
    code: `punkte = 72\n\nif punkte >= 90:\n    note = "sehr gut"\nelif punkte >= 70:\n    note = "gut"\nelse:\n    note = "bestanden"\n\nprint(note)\n`,
  },
  {
    id: 'schleife',
    label: 'Schleife mit Zähler',
    code: `woerter = ["Apfel", "Birne", "Kirsche", "Zwetschge"]\n\nlang = 0\nfor wort in woerter:\n    if len(wort) > 5:\n        lang = lang + 1\n\nprint(f"{lang} Woerter sind laenger als 5 Zeichen.")\n`,
  },
  {
    id: 'fehler',
    label: 'Fehler absichtlich erzeugen',
    code: `# Dieser Code bricht in der letzten Zeile ab.\n# Sieh dir danach die Erklaerung unter der Ausgabe an.\n\nalter = "30"        # Text, keine Zahl\nprint(alter * 2)    # wiederholt den Text\nprint(alter + 1)    # bricht ab: Text plus Zahl geht nicht\n`,
  },
] as const;

export function CodeLab(): React.ReactElement {
  const [code, setCode] = useState(STARTER);
  const [activeSnippet, setActiveSnippet] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-sm font-semibold">Vorlagen zum Einsteigen</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Ein Klick ersetzt den Inhalt des Editors. Verändere die Werte und beobachte, was sich
          ändert.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SNIPPETS.map((snippet) => (
            <Button
              key={snippet.id}
              type="button"
              variant="secondary"
              onClick={() => {
                setCode(snippet.code);
                setActiveSnippet(snippet.id);
              }}
              className={cx(
                'text-sm',
                activeSnippet === snippet.id && 'border-[var(--accent)] text-[var(--accent)]',
              )}
            >
              {snippet.label}
            </Button>
          ))}
        </div>
      </Card>

      <PythonWorkbench
        code={code}
        onCodeChange={setCode}
        ariaLabel="Freier Python-Editor im Code-Labor"
        starterCode={STARTER}
        minHeight="20rem"
      />
    </div>
  );
}
