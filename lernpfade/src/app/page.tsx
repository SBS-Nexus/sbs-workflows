import { LernpfadeHero } from '@/components/home/lernpfade-hero';
import { LearningStudio } from '@/components/home/learning-studio';
import { CORE_PATHS, NEXT_PATHS, STATUS_LABEL, type LearningPath } from '@/lib/catalog';
import { ButtonLink } from '@/components/ui/primitives';

function ArrowIcon(): React.ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
      <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PathCard({ path, index, group }: { path: LearningPath; index: number; group: 'core' | 'future' }): React.ReactElement {
  const disconnected = path.status === 'available' && !path.href;
  const label = disconnected ? 'Noch nicht verbunden' : STATUS_LABEL[path.status];
  const ordinal = String(index + 1).padStart(2, '0');
  const content = (
    <>
      <div className="path-card-topline">
        <span className="path-card-ordinal">LP / {ordinal}</span>
        <span className="eyebrow">{path.eyebrow}</span>
        <span className={`status status-${disconnected ? 'building' : path.status}`}>{label}</span>
      </div>
      <div className="path-card-body">
        <div className={`path-mark accent-${path.accent}`} aria-hidden="true">{path.title.slice(0, 2).toUpperCase()}</div>
        <div className="path-card-copy">
          <h3>{path.title}</h3>
          <p className="path-description">{path.description}</p>
          <p className="path-outcome">{path.outcome}</p>
        </div>
      </div>
      <div className="path-card-bottom">
        <ul className="topic-list" aria-label={`Themen: ${path.title}`}>
          {path.topics.map((topic) => <li key={topic}>{topic}</li>)}
        </ul>
        <span className="card-action">
          {path.href ? 'Pfad öffnen' : disconnected ? 'Anbindung folgt' : path.status === 'planned' ? 'Vorgemerkt' : 'Im Ausbau'}
          {path.href ? <ArrowIcon /> : null}
        </span>
      </div>
    </>
  );

  const className = `path-card path-card--${group}${disconnected ? ' path-card-unavailable' : ''}${path.href ? ' path-card-link' : ''}`;
  return path.href ? (
    <a className={className} data-path={path.slug} href={path.href}>{content}</a>
  ) : (
    <article className={className} data-path={path.slug}>{content}</article>
  );
}

export default function Home(): React.ReactElement {
  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <a className="brand" href="/" aria-label="Lernpfade Startseite">
            <span className="brand-mark" aria-hidden="true">L<span>✳</span></span>
            <span>
              <strong>Lernpfade</strong>
              <small>SBS NEXUS / LEARNING SYSTEM</small>
            </span>
          </a>
          <nav aria-label="Seitennavigation">
            <a href="#pfade">Pfade</a>
            <a href="/vokabeln">Vokabeln</a>
            <a href="/wiederholen">Wiederholen</a>
            <a href="/fortschritt">Fortschritt</a>
            <a href="#zukunft">Roadmap</a>
            <a href="#lernmodell">Lernmodell</a>
          </nav>
        </div>
      </header>

      <main id="hauptinhalt" className="lp-main">
        <LernpfadeHero />

        <div className="lp-editorial-rule" aria-label="Unser Lernprinzip">
          <div className="shell lp-editorial-rule-inner">
            <span>DEIN WISSEN. DEIN TEMPO.</span>
            <span aria-hidden="true">✳</span>
            <span>VERSTEHEN / ANWENDEN / WIEDERHOLEN</span>
          </div>
        </div>

        <LearningStudio />

        <section id="pfade" className="section shell lp-path-index">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Lernpfade entdecken</p>
              <h2>Deine Kernpfade</h2>
            </div>
            <p>
              Python, SQL und Git bilden die Basis. Sobald ein Fachpfad angebunden ist,
              kannst du ihn von hier direkt öffnen.
            </p>
          </div>
          <div className="path-grid">
            {CORE_PATHS.map((path, index) => (
              <PathCard key={path.slug} path={path} index={index} group="core" />
            ))}
          </div>
        </section>

        <section id="lernmodell" className="model-section">
          <div className="shell">
            <div className="section-heading light-heading">
              <div>
                <p className="eyebrow">Gemeinsamer Kern</p>
                <h2>Ein Lernmodell <em>für alle Themen</em></h2>
              </div>
              <p>
                Nicht jeder Kurs erfindet seine eigene Bedienung. Was sich ändert, ist der Inhalt;
                was gleich bleibt, ist die Art zu lernen.
              </p>
            </div>
            <div className="model-grid" role="list">
              <article role="listitem">
                <span>01</span>
                <h3>Verstehen</h3>
                <p>Kurze Erklärungen, echte Beispiele und sichtbare Zusammenhänge.</p>
              </article>
              <article role="listitem">
                <span>02</span>
                <h3>Anwenden</h3>
                <p>Aufgaben, Labs und kleine Projekte statt passivem Durchklicken.</p>
              </article>
              <article role="listitem">
                <span>03</span>
                <h3>Verifizieren</h3>
                <p>Ergebnisse prüfen, Fehler erklären und AI-Ausgaben nicht blind übernehmen.</p>
              </article>
              <article role="listitem">
                <span>04</span>
                <h3>Wiederholen</h3>
                <p>Spaced Repetition für Konzepte, Befehle und später auch Vokabeln.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="zukunft" className="section shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Roadmap</p>
              <h2>Das Wissen von <em>morgen.</em></h2>
            </div>
            <p>
              Die Erweiterungen bauen auf vorhandenen Fähigkeiten auf. Kein Kurs entsteht nur,
              weil ein Thema gerade Trend ist.
            </p>
          </div>
          <div className="path-grid future-grid">
            {NEXT_PATHS.map((path, index) => (
              <PathCard key={path.slug} path={path} index={index + CORE_PATHS.length} group="future" />
            ))}
          </div>
        </section>

        <section className="vocab-section">
          <div className="shell vocab-grid">
            <div>
              <p className="eyebrow">VokabelPfad</p>
              <h2>Eigene Vokabeln – mit demselben Wiederholungs&shy;motor.</h2>
              <p>
                Der VokabelPfad ist als lokaler MVP nutzbar: Englisch ↔ Deutsch, eigene Decks, beide
                Lernrichtungen, Import/Export und tägliche Wiederholung. Technische Begriffe aus Git,
                SQL, Python und AI funktionieren mit derselben Kartenlogik. Gespeichert wird nur in
                deinem Browser.
              </p>
              <div className="hero-actions">
                <ButtonLink className="vocab-cta" href="/vokabeln">
                  VokabelPfad öffnen <ArrowIcon />
                </ButtonLink>
                <ButtonLink variant="secondary" className="vocab-cta" href="/wiederholen">
                  Alle Wiederholungen
                </ButtonLink>
              </div>
            </div>
            <div className="vocab-stack" aria-label="Beispielkarten"><div className="lp-vocab-art-label"><span>INDEX / 001—003</span><span>ACTIVE RECALL ↗</span></div>
              <div className="vocab-card vocab-card--featured">
                <span>EN → DE</span>
                <strong>retrieval</strong>
                <small>Abruf · Wiederauffinden</small>
              </div>
              <div className="vocab-card">
                <span>GIT</span>
                <strong>commit</strong>
                <small>gespeicherter Zustand im Verlauf</small>
              </div>
              <div className="vocab-card">
                <span>AI</span>
                <strong>embedding</strong>
                <small>numerische Repräsentation von Bedeutung</small>
              </div>
              <div className="lp-vocab-art-foot">Wörter werden Wissen. <span>✳</span></div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="shell footer-inner">
          <strong>Lernpfade</strong>
          <span>LEARNING OS / VERSTEHEN STATT NUR KLICKEN</span>
        </div>
      </footer>
    </>
  );
}
