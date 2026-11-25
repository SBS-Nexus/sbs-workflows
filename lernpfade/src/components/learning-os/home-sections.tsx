import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import {
  LEARNING_OS_PLANNED,
  LEARNING_OS_ROUTES,
  LEARNING_OS_SQL_HREF,
  LEARNING_OS_TRACKS,
  LEARNING_OS_VOCAB,
  type LearningOsRoute,
  type LearningOsTrack,
} from '@/lib/learning-os';
import { LearningMoment } from './learning-moment';
import { OrbitInstrument } from './orbit';

/**
 * Abschnitte der Learning-OS-Startseite. Dieselben Bausteine rendern `/` und
 * die Review-Referenz `/design-preview` — es gibt nur eine Umsetzung.
 * Server Components; nur der Lernmoment ist ein Client-Baustein.
 */

function Arrow({ diagonal = false }: { diagonal?: boolean }): React.ReactElement {
  return diagonal ? <ArrowUpRight size={20} aria-hidden="true" /> : <ArrowRight size={20} aria-hidden="true" />;
}

export function LosHero(): React.ReactElement {
  return (
    <section className="los-hero" aria-labelledby="los-heading">
      <div className="los-hero-copy">
        <div className="los-eyebrow"><span className="los-dot" /> EIN NEUES KAPITEL DES LERNENS <span className="los-eyebrow-index">01—26</span></div>
        <h1 id="los-heading">Wissen.<br />Verstehen.<br /><em>Können.</em></h1>
        <p className="los-hero-lead">Eine Lernwelt für Menschen, die nicht nur Antworten suchen, sondern <strong>Zusammenhänge begreifen.</strong></p>
        <div className="los-hero-actions">
          <a className="los-button-primary" href="#lernpfade">Entdecke deinen Pfad <ArrowUpRight size={18} aria-hidden="true" /></a>
          <a className="los-button-text" href="#lernprinzip">Die Idee dahinter <ArrowDown size={17} aria-hidden="true" /></a>
        </div>
        <div className="los-hero-foot" aria-hidden="true"><span>SCROLL TO EXPLORE</span><span className="los-scroll-line" /></div>
      </div>
      <OrbitInstrument />
    </section>
  );
}

export function LosTicker(): React.ReactElement {
  return (
    <div className="los-ticker">
      <div className="los-ticker-inner" aria-hidden="true">
        <span>LEARN DIFFERENT.</span><span className="los-ticker-star">✳</span>
        <span>THINK DEEPER.</span><span className="los-ticker-star">✳</span>
        <span>BUILD WHAT MATTERS.</span>
      </div>
    </div>
  );
}

export function LosStatement(): React.ReactElement {
  return (
    <section className="los-statement" id="lernprinzip" aria-labelledby="los-statement-heading">
      <div className="los-section-label"><span>01 / DIE IDEE</span><span>BEYOND PASSIVE LEARNING</span></div>
      <div className="los-statement-layout">
        <h2 id="los-statement-heading">Weniger<br /><em>konsumieren.</em><br />Mehr begreifen.</h2>
        <div className="los-statement-aside">
          <div className="los-statement-glyph" aria-hidden="true">✳</div>
          <p>Die nächste Generation des Lernens ist nicht lauter. Sie ist klarer.</p>
          <p>Ein durchdachtes System, in dem du Ideen entdeckst, direkt ausprobierst und mit jedem Schritt sicherer wirst.</p>
          <a href="#lern-moment" className="los-inline-link">So fühlt es sich an <Arrow diagonal /></a>
        </div>
      </div>
      <ol className="los-principles" aria-label="Unser Lernprinzip">
        <li><span>01</span><strong>Verstehen</strong><small>Bevor du auswendig lernst.</small></li>
        <li><span>02</span><strong>Anwenden</strong><small>Damit Wissen greifbar wird.</small></li>
        <li><span>03</span><strong>Verankern</strong><small>Damit du es nicht wieder vergisst.</small></li>
      </ol>
    </section>
  );
}

function TrackRow({ track }: { track: LearningOsTrack }): React.ReactElement {
  const descriptionId = `los-track-${track.slug}-text`;
  const statusId = `los-track-${track.slug}-status`;
  const content = (
    <>
      <span className="los-track-index" aria-hidden="true">{track.number} / 04</span>
      <div className="los-track-identity">
        <span className="los-track-category">{track.category}</span>
        <h3>{track.name}</h3>
      </div>
      <p className="los-track-description" id={descriptionId}>{track.description}</p>
      <div className="los-track-end">
        <span className="los-track-status" id={statusId} data-status={track.href ? track.status : 'offline'}>
          {track.href ? track.statusLabel : 'Noch nicht verbunden'}
        </span>
        <code aria-hidden="true">{track.micro}</code>
        <span className="los-track-arrow" aria-hidden="true"><Arrow diagonal /></span>
      </div>
    </>
  );

  return (
    <li>
      {track.href ? (
        <a
          className={'los-track los-track-' + track.slug}
          href={track.href}
          aria-label={`${track.appName} öffnen`}
          aria-describedby={`${statusId} ${descriptionId}`}
        >
          {content}
        </a>
      ) : (
        <div className={'los-track los-track-' + track.slug + ' los-track-inactive'}>{content}</div>
      )}
    </li>
  );
}

export function LosTracks(): React.ReactElement {
  return (
    <section className="los-tracks-section" id="lernpfade" aria-labelledby="los-tracks-heading">
      <div className="los-section-label"><span>02 / DEINE WELTEN</span><span>CHOOSE YOUR DIRECTION</span></div>
      <div className="los-tracks-header">
        <h2 id="los-tracks-heading">Dein nächster<br /><em>Sprung.</em></h2>
        <p>Vier Perspektiven. Ein Lernsystem. Du entscheidest, wo deine Neugier beginnt.</p>
      </div>
      <ul className="los-track-list">
        {LEARNING_OS_TRACKS.map((track) => <TrackRow track={track} key={track.slug} />)}
      </ul>
      <div className="los-roadmap">
        <h3 className="los-roadmap-title">Als Nächstes geplant</h3>
        <ul className="los-roadmap-list">
          {LEARNING_OS_PLANNED.map((path) => (
            <li key={path.slug}>{path.title}<span>{path.statusLabel}</span></li>
          ))}
        </ul>
        <p className="los-tracks-note">Geplant heißt: noch nicht verfügbar, ohne Termin. Keine künstlichen Fortschrittswerte, keine leeren Versprechen.</p>
      </div>
    </section>
  );
}

/**
 * Empfohlene Reihenfolge (Roadmap E1): zwei Wege, je mit Begründung pro
 * Schritt. Ein eigener Abschnitt und eigene Linktexte („Mit Python
 * beginnen"), damit die vier Pfadzeilen darüber die einzigen „… öffnen"-Links
 * bleiben. Ohne konfigurierte Adresse steht statt des Startlinks ein Hinweis.
 */
export function LosRoutes(): React.ReactElement {
  return (
    <section className="los-routes-section" id="einstieg" aria-labelledby="los-routes-heading">
      <div className="los-section-label"><span>03 / DEIN EINSTIEG</span><span>WHERE TO BEGIN</span></div>
      <div className="los-routes-header">
        <h2 id="los-routes-heading">Womit du<br /><em>anfängst.</em></h2>
        <p>Zwei bewährte Wege durch die Pfade – je nachdem, ob du neu einsteigst oder im Fachbereich mit Daten arbeitest. Beides sind Empfehlungen, keine Pflicht: Jeder Pfad lässt sich auch für sich lernen.</p>
      </div>
      <div className="los-routes">
        {LEARNING_OS_ROUTES.map((route) => <RouteCard route={route} key={route.id} />)}
      </div>
    </section>
  );
}

function RouteCard({ route }: { route: LearningOsRoute }): React.ReactElement {
  const titleId = `los-route-${route.id}-titel`;
  return (
    <article className="los-route" aria-labelledby={titleId}>
      <p className="los-route-eyebrow">{route.eyebrow}</p>
      <h3 id={titleId}>{route.title}</h3>
      <p className="los-route-audience">{route.audience}</p>
      <ol className="los-route-steps" aria-label={`Reihenfolge: ${route.steps.map((s) => s.name).join(', dann ')}`}>
        {route.steps.map((s, index) => (
          <li key={s.slug}>
            <span className="los-route-number" aria-hidden="true">{index + 1}</span>
            <div>
              <p className="los-route-step-name">
                <strong>{s.name}</strong>
                <span className="los-route-app">{s.appName}</span>
                {s.status !== 'available' ? <span className="los-route-status">{s.statusLabel}</span> : null}
              </p>
              <p className="los-route-why">{s.why}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="los-route-companion">
        <span className="los-route-companion-label">{route.id === 'einstieg' ? 'Begleitend' : 'Später'}</span>
        {route.companion.text}
        {route.companion.href ? (
          <a className="los-inline-link" href={route.companion.href}>{route.companion.linkLabel} <Arrow /></a>
        ) : null}
      </p>
      {route.start.href ? (
        <a className="los-button-dark los-route-start" href={route.start.href}>{route.start.label} <Arrow diagonal /></a>
      ) : (
        <p className="los-route-offline">{route.steps[0]?.appName} ist auf dieser Installation noch nicht verbunden.</p>
      )}
    </article>
  );
}

export function LosMoment(): React.ReactElement {
  return (
    <section className="los-moment-section" id="lern-moment" aria-labelledby="los-moment-heading">
      <div className="los-section-label"><span>04 / NICHT NUR ZUSCHAUEN</span><span>INTERACT TO UNDERSTAND</span></div>
      <div className="los-moment-layout">
        <div className="los-moment-intro">
          <span className="los-moment-asterisk" aria-hidden="true">✳</span>
          <h2 id="los-moment-heading">Aha statt<br /><em>Aha, okay.</em></h2>
          <p>Eine gute Lernoberfläche erklärt nicht nur. Sie lässt dich selbst denken. Probiere ein kurzes Beispiel.</p>
          <span className="los-demo-disclaimer">INTERAKTIVES BEISPIEL · KEINE SPEICHERUNG</span>
          {LEARNING_OS_SQL_HREF ? (
            <a className="los-inline-link los-moment-continue" href={LEARNING_OS_SQL_HREF}>
              JOINs im SQLPfad vertiefen <Arrow diagonal />
            </a>
          ) : null}
        </div>
        <LearningMoment />
      </div>
    </section>
  );
}

export function LosVocab(): React.ReactElement {
  return (
    <section className="los-vocab-section" id="vokabelpfad" aria-labelledby="los-vocab-heading">
      <div className="los-section-label"><span>05 / WISSEN DAS BLEIBT</span><span>THE RECALL LOOP</span></div>
      <div className="los-vocab-inner">
        <div>
          <span className="los-vocab-symbol" aria-hidden="true">↗</span>
          <p className="los-vocab-status">VokabelPfad · {LEARNING_OS_VOCAB.statusLabel}</p>
          <h2 id="los-vocab-heading">Lernen ist gut.<br /><em>Behalten ist besser.</em></h2>
          <p>Mit VokabelPfad und gezielter Wiederholung findest du den Weg vom ersten Verstehen zum langfristigen Können.</p>
          <div className="los-vocab-actions">
            <a className="los-button-dark" href={LEARNING_OS_VOCAB.href}>VokabelPfad ausprobieren <Arrow diagonal /></a>
            <a className="los-inline-link" href="/wiederholen">Alle Wiederholungen <Arrow /></a>
          </div>
          <p className="los-vocab-privacy">Deine Vokabeldecks bleiben derzeit lokal in deinem Browser. Kein Konto, keine Cloud-Synchronisation.</p>
        </div>
        <div className="los-vocab-art" aria-hidden="true">
          <div className="los-vocab-art-top">YOUR MIND / IN MOTION <span>↗</span></div>
          <div className="los-vocab-word">RE<span>CALL</span></div>
          <div className="los-vocab-art-bottom"><span>Verstehen</span><span>↗</span><span>Wiederholen</span><span>↗</span><span>Behalten</span></div>
        </div>
      </div>
    </section>
  );
}

export function LosFooter({ homeHref }: { homeHref: string }): React.ReactElement {
  return (
    <footer className="los-footer">
      <div className="los-footer-top"><span className="los-footer-star" aria-hidden="true">✳</span><p>Deine Neugier verdient<br /><em>mehr als einen Kurs.</em></p></div>
      <div className="los-footer-bottom">
        <a className="los-footer-wordmark" href={homeHref}>lernpfade.</a>
        <span>Eine Idee von SBS Nexus Learning</span>
        <nav aria-label="Fußnavigation"><a href="/vokabeln">Vokabeln</a><a href="/wiederholen">Wiederholen</a><a href="/fortschritt">Fortschritt</a><a href="/status">Status</a></nav>
        <a href="#hauptinhalt">Zurück nach oben <span aria-hidden="true">↑</span></a>
      </div>
    </footer>
  );
}
