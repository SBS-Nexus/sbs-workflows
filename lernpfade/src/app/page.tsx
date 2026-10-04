import { CORE_PATHS, NEXT_PATHS, STATUS_LABEL, type LearningPath } from '@/lib/catalog';

function ArrowIcon(): React.ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
      <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PathCard({ path }: { path: LearningPath }): React.ReactElement {
  const content = (
    <>
      <div className="card-topline">
        <span className="eyebrow">{path.eyebrow}</span>
        <span className={`status status-${path.status}`}>{STATUS_LABEL[path.status]}</span>
      </div>
      <div className={`path-mark accent-${path.accent}`} aria-hidden="true">
        {path.title.slice(0, 2).toUpperCase()}
      </div>
      <h3>{path.title}</h3>
      <p className="path-description">{path.description}</p>
      <p className="path-outcome">{path.outcome}</p>
      <ul className="topic-list" aria-label={`Themen in ${path.title}`}>
        {path.topics.map((topic) => (
          <li key={topic}>{topic}</li>
        ))}
      </ul>
      <span className="card-action">
        {path.href ? 'Pfad öffnen' : path.status === 'planned' ? 'Vorgemerkt' : 'Mehr erfahren'}
        {path.href ? <ArrowIcon /> : null}
      </span>
    </>
  );

  return path.href ? (
    <a className="path-card path-card-link" href={path.href}>
      {content}
    </a>
  ) : (
    <article className="path-card">{content}</article>
  );
}

export default function Home(): React.ReactElement {
  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <a className="brand" href="/" aria-label="Lernpfade Startseite">
            <span className="brand-mark" aria-hidden="true">LP</span>
            <span>
              <strong>Lernpfade</strong>
              <small>SBS Nexus Learning</small>
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

      <main id="hauptinhalt">
        <section className="hero">
          <div className="shell hero-grid">
            <div>
              <p className="kicker">Eine Plattform. Mehrere Fähigkeiten. Ein Lernmodell.</p>
              <h1>
                Technologie lernen,
                <span> als würde alles zusammengehören.</span>
              </h1>
              <p className="hero-copy">
                Python, SQL, Git & GitHub und AI sind keine getrennten Welten. Lernpfade verbindet
                sie in einer gemeinsamen Oberfläche mit derselben Navigation, denselben
                Interaktionsmustern und einem wiedererkennbaren Fortschrittsmodell.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#pfade">
                  Lernpfad wählen <ArrowIcon />
                </a>
                <a className="button button-secondary" href="#lernmodell">
                  So funktioniert das Lernen
                </a>
              </div>
            </div>
            <div className="system-card" aria-label="Lernsystem Übersicht">
              <div className="system-row">
                <span className="system-node accent-indigo">PY</span>
                <span>Programmieren</span>
                <strong>Python</strong>
              </div>
              <div className="system-line" />
              <div className="system-row">
                <span className="system-node accent-teal">SQL</span>
                <span>Daten</span>
                <strong>SQL</strong>
              </div>
              <div className="system-line" />
              <div className="system-row">
                <span className="system-node accent-violet">GIT</span>
                <span>Zusammenarbeit</span>
                <strong>GitHub</strong>
              </div>
              <div className="system-line" />
              <div className="system-row muted-row">
                <span className="system-node accent-amber">AI</span>
                <span>Verstehen & steuern</span>
                <strong>AI</strong>
              </div>
            </div>
          </div>
        </section>

        <section id="pfade" className="section shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Heute verfügbar</p>
              <h2>Deine Kernpfade</h2>
            </div>
            <p>
              Drei Einstiegspunkte, aber dieselbe Produktlogik. Wer zwischen Themen wechselt, muss
              die Plattform nicht neu lernen.
            </p>
          </div>
          <div className="path-grid">
            {CORE_PATHS.map((path) => (
              <PathCard key={path.slug} path={path} />
            ))}
          </div>
        </section>

        <section id="lernmodell" className="model-section">
          <div className="shell">
            <div className="section-heading light-heading">
              <div>
                <p className="eyebrow">Gemeinsamer Kern</p>
                <h2>Ein Lernmodell für alle Themen</h2>
              </div>
              <p>
                Nicht jeder Kurs erfindet seine eigene Bedienung. Was sich ändert, ist der Inhalt;
                was gleich bleibt, ist die Art zu lernen.
              </p>
            </div>
            <div className="model-grid">
              <article>
                <span>01</span>
                <h3>Verstehen</h3>
                <p>Kurze Erklärungen, echte Beispiele und sichtbare Zusammenhänge.</p>
              </article>
              <article>
                <span>02</span>
                <h3>Anwenden</h3>
                <p>Aufgaben, Labs und kleine Projekte statt passivem Durchklicken.</p>
              </article>
              <article>
                <span>03</span>
                <h3>Verifizieren</h3>
                <p>Ergebnisse prüfen, Fehler erklären und AI-Ausgaben nicht blind übernehmen.</p>
              </article>
              <article>
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
              <h2>Was als Nächstes sinnvoll ist</h2>
            </div>
            <p>
              Die Erweiterungen bauen auf vorhandenen Fähigkeiten auf. Kein Kurs entsteht nur,
              weil ein Thema gerade Trend ist.
            </p>
          </div>
          <div className="path-grid future-grid">
            {NEXT_PATHS.map((path) => (
              <PathCard key={path.slug} path={path} />
            ))}
          </div>
        </section>

        <section className="vocab-section">
          <div className="shell vocab-grid">
            <div>
              <p className="eyebrow">VokabelPfad</p>
              <h2>Eigene Vokabeln – mit demselben Wiederholungsmotor.</h2>
              <p>
                Der VokabelPfad ist als lokaler MVP nutzbar: Englisch ↔ Deutsch, eigene Decks, beide
                Lernrichtungen, Import/Export und tägliche Wiederholung. Technische Begriffe aus Git,
                SQL, Python und AI funktionieren mit derselben Kartenlogik. Gespeichert wird nur in
                deinem Browser.
              </p>
              <div className="hero-actions">
                <a className="button button-primary vocab-cta" href="/vokabeln">
                  VokabelPfad öffnen <ArrowIcon />
                </a>
                <a className="button button-secondary vocab-cta" href="/wiederholen">
                  Alle Wiederholungen
                </a>
              </div>
            </div>
            <div className="vocab-stack" aria-label="Beispielkarten">
              <div className="vocab-card">
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
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="shell footer-inner">
          <strong>Lernpfade</strong>
          <span>Python · SQL · Git & GitHub · AI · Vokabeln</span>
        </div>
      </footer>
    </>
  );
}
