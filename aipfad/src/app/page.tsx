import { ButtonLink } from '@/components/ui/primitives';
import { ContextGraph } from '@/components/context-graph';
import { SiteHeader } from '@/components/marketing/site-header';
import { TokenizerStrip } from '@/components/marketing/tokenizer-strip';
import { concepts } from '@/content/concepts';

const MODULES = [
  {
    code: 'STUFE 0',
    title: 'Orientierung',
    description: 'Was AIPfad ist, was AI kann und nicht kann, wie dein Fortschritt gemessen wird.',
    minutes: 20,
  },
  {
    code: 'STUFE 1',
    title: 'Technischer Arbeitsplatz',
    description:
      'Pfade, Terminal, Umgebungsvariablen — die Werkzeuge, auf denen alles Weitere aufbaut.',
    minutes: 35,
  },
  {
    code: 'STUFE 4',
    title: 'LLM-Grundlagen',
    description:
      'Tokens, Embeddings, Aufmerksamkeit, Kontextfenster, Nachrichtenrollen, Halluzination.',
    minutes: 55,
  },
  {
    code: 'STUFE 5',
    title: 'Prompting-Grundlagen',
    description:
      'Ziel, Kontext, Constraints, Zerlegung, Iteration — wirksame Prompts als Handwerk.',
    minutes: 30,
  },
] as const;

/*
 * Ausschnitt der Wissenslandkarte für die Startseite: die LLM- und
 * Prompting-Konzepte bilden eine zusammenhängende, gut lesbare Kette. Die
 * vollständige Karte (alle vier Module) steht unter /wissenslandkarte.
 */
const HERO_GRAPH_SLUGS = new Set([
  'token',
  'tokenisierung',
  'embedding',
  'transformer-aufmerksamkeit',
  'context-window',
  'nachrichtenrollen',
  'prompt-ziel-und-kontext',
  'prompt-constraints-und-beispiele',
]);
const heroGraphConcepts = concepts.filter((c) => HERO_GRAPH_SLUGS.has(c.slug));

export default function LandingPage(): React.ReactElement {
  return (
    <>
      <SiteHeader />
      <main id="hauptinhalt">
        {/* --------------------------------------------------------------- */}
        {/* Hero: These + funktionierender Tokenizer, keine Illustration.    */}
        {/* --------------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-signal-600 dark:text-signal-300">
            Interaktive AI-Kompetenz · Deutsch
          </p>
          <h1 className="max-w-3xl font-mono text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Wie AI wirklich funktioniert — nicht, wie sie beworben wird.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[var(--fg-muted)]">
            AIPfad zeigt dir Tokens, Kontextfenster und Prompts als das, was sie sind:
            nachvollziehbare Mechanik. Kein Kurs mit dreißig Folien pro Bildschirm — ein Werkzeug,
            das du bedienst.
          </p>

          <div className="mt-8 max-w-2xl">
            <TokenizerStrip />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/registrieren" size="lg">
              Kostenlos starten
            </ButtonLink>
            <ButtonLink href="/lernen" variant="secondary" size="lg">
              Bibliothek durchsuchen
            </ButtonLink>
          </div>
        </section>

        {/* --------------------------------------------------------------- */}
        {/* Was du lernst: Datenblatt-Liste statt Kachel-Raster.             */}
        {/* --------------------------------------------------------------- */}
        <section className="border-t border-[var(--border)] bg-[var(--bg-raised)]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              Was diese Ausbaustufe abdeckt
            </h2>
            <dl className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {MODULES.map((mod) => (
                <div
                  key={mod.code}
                  className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-[7rem_1fr_6rem] sm:items-baseline sm:gap-6"
                >
                  <dt className="font-mono text-xs font-semibold text-signal-600 dark:text-signal-300">
                    {mod.code}
                  </dt>
                  <dd>
                    <p className="font-mono text-base font-semibold tracking-tight">{mod.title}</p>
                    <p className="mt-1 text-sm text-[var(--fg-muted)]">{mod.description}</p>
                  </dd>
                  <dd className="font-mono text-xs text-[var(--fg-muted)] sm:text-right">
                    ~{mod.minutes} Min.
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 max-w-2xl text-sm text-[var(--fg-muted)]">
              Der vollständige AIPfad-Lehrplan umfasst deutlich mehr — Git &amp; GitHub, RAG,
              Agents, MCP, AI-Coding, Sicherheit und Governance. Diese Ausbaustufe baut die
              Grundlagen, auf denen alles Weitere aufsetzt; der volle Umfang steht in{' '}
              <code className="font-mono text-xs">docs/LEHRPLAN.md</code>.
            </p>
          </div>
        </section>

        {/* --------------------------------------------------------------- */}
        {/* Signatur: Wissenslandkarte, echte Konzeptbeziehungen.            */}
        {/* --------------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            Die Wissenslandkarte
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
            Jedes Konzept baut sichtbar auf anderen auf. Kein Diagramm zur Zierde — jeder Knoten ist
            eine echte Seite, jede Linie eine echte Voraussetzung.
          </p>
          <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-raised)] p-4 sm:p-6">
            <ContextGraph concepts={heroGraphConcepts} />
          </div>
          <div className="mt-4">
            <ButtonLink href="/wissenslandkarte" variant="ghost" size="sm">
              Vollständige Karte ansehen →
            </ButtonLink>
          </div>
        </section>

        <footer className="border-t border-[var(--border)] py-8">
          <div className="mx-auto max-w-6xl px-4 text-sm text-[var(--fg-muted)] sm:px-6">
            <p>AIPfad · Deterministische Übungen, keine Übertragung an externe AI-Anbieter.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
