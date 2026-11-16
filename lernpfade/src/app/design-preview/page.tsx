import type { Metadata } from 'next';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import { CORE_PATHS, NEXT_PATHS } from '@/lib/catalog';
import { LearningMoment } from '@/components/studio/learning-moment';
import './studio.css';

export const metadata: Metadata = {
  title: 'Learning OS – Designstudie',
  description: 'Designstudie für ein neues Lernpfade-Erlebnis. Premium SaaS trifft auf echtes Lernen.',
  robots: { index: false, follow: false },
};

const tracks = [
  {
    number: '01',
    name: 'Python',
    category: 'Logik & Code',
    description: 'Von der ersten Variable zum eigenen Denken in Systemen.',
    type: 'python',
    href: CORE_PATHS.find((path) => path.slug === 'python')?.href,
    micro: 'print("hello, world")',
    status: 'Im Lernpfad',
  },
  {
    number: '02',
    name: 'SQL',
    category: 'Daten & Struktur',
    description: 'Stelle bessere Fragen. Finde Antworten in deinen Daten.',
    type: 'sql',
    href: CORE_PATHS.find((path) => path.slug === 'sql')?.href,
    micro: 'SELECT * FROM wissen;',
    status: 'Im Lernpfad',
  },
  {
    number: '03',
    name: 'Git & GitHub',
    category: 'Versionen & Zusammenarbeit',
    description: 'Verstehe, wie Ideen zu nachvollziehbaren Versionen werden.',
    type: 'git',
    href: CORE_PATHS.find((path) => path.slug === 'git')?.href,
    micro: 'git commit -m "learn"',
    status: 'Im Lernpfad',
  },
  {
    number: '04',
    name: 'AI',
    category: 'Modelle & Intelligenz',
    description: 'Durchdringe, was LLMs können – und wo ihre Grenzen liegen.',
    type: 'ai',
    href: NEXT_PATHS.find((path) => path.slug === 'ai')?.href,
    micro: 'reason → test → verify',
    status: 'In Entwicklung',
  },
] as const;

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return diagonal ? <ArrowUpRight size={20} aria-hidden="true" /> : <ArrowRight size={20} aria-hidden="true" />;
}

function OrbitInstrument() {
  return (
    <div className="los-instrument" aria-label="Abstrakte Lernlandkarte mit verbundenen Wissensgebieten" role="img">
      <div className="los-instrument-grid" aria-hidden="true" />
      <div className="los-instrument-halo" aria-hidden="true" />
      <svg className="los-orbit-art" viewBox="0 0 620 620" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="los-orbit-a" x1="50" y1="70" x2="550" y2="550" gradientUnits="userSpaceOnUse">
            <stop stopColor="#D7FF8C" />
            <stop offset=".5" stopColor="#89CFA7" stopOpacity=".68" />
            <stop offset="1" stopColor="#A78DF3" stopOpacity=".3" />
          </linearGradient>
          <linearGradient id="los-orbit-b" x1="600" y1="90" x2="30" y2="580" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E6FDAD" />
            <stop offset=".65" stopColor="#B3A6FE" stopOpacity=".8" />
            <stop offset="1" stopColor="#9FFFF0" stopOpacity=".15" />
          </linearGradient>
        </defs>
        <circle cx="310" cy="310" r="264" stroke="#D2E5D9" strokeOpacity=".17" />
        <circle cx="310" cy="310" r="204" stroke="#D2E5D9" strokeOpacity=".2" />
        <circle cx="310" cy="310" r="145" stroke="#D2E5D9" strokeOpacity=".14" strokeDasharray="3 10" />
        <g className="los-orbit-rotate">
          <ellipse cx="310" cy="310" rx="250" ry="99" stroke="url(#los-orbit-a)" strokeWidth="1.5" transform="rotate(-37 310 310)" />
          <ellipse cx="310" cy="310" rx="251" ry="94" stroke="url(#los-orbit-b)" strokeWidth="1.5" transform="rotate(43 310 310)" />
          <ellipse cx="310" cy="310" rx="215" ry="167" stroke="url(#los-orbit-a)" strokeOpacity=".7" strokeWidth="1" transform="rotate(22 310 310)" />
          <ellipse cx="310" cy="310" rx="209" ry="164" stroke="url(#los-orbit-b)" strokeOpacity=".56" strokeWidth="1" transform="rotate(82 310 310)" />
          <circle cx="100" cy="170" r="5" fill="#CFFD7C" />
          <circle cx="511" cy="400" r="4" fill="#B4A0FF" />
          <circle cx="310" cy="566" r="3" fill="#A2ECD6" />
        </g>
        <g className="los-orbit-core">
          <circle cx="310" cy="310" r="88" fill="#C9F47B" fillOpacity=".045" stroke="#D6F9AB" strokeOpacity=".28" />
          <circle cx="310" cy="310" r="47" stroke="#D3FF9B" strokeOpacity=".56" />
          <path d="M288 312l16 16 29-37" stroke="#D8FF9C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
      <span className="los-visual-id">EXPERIENCE / 001</span>
      <div className="los-visual-caption"><span className="los-pulse" /> Lernen ist ein Prozess, kein Feed</div>
      <div className="los-visual-coordinate" aria-hidden="true">48° 08&apos; N<br />11° 35&apos; E</div>
      <div className="los-visual-note" aria-hidden="true">EXPLORE<br />CONNECT<br />REMEMBER</div>
    </div>
  );
}

function TrackRow({ track }: { track: (typeof tracks)[number] }) {
  const content = (
    <>
      <span className="los-track-index">{track.number} / 04</span>
      <div className="los-track-identity">
        <span className="los-track-category">{track.category}</span>
        <h3>{track.name}</h3>
      </div>
      <p className="los-track-description">{track.description}</p>
      <div className="los-track-end">
        <code>{track.micro}</code>
        <span className="los-track-arrow"><Arrow diagonal /></span>
      </div>
    </>
  );

  return track.href ? (
    <a className={'los-track los-track-' + track.type} href={track.href} aria-label={track.name + ' öffnen'}>
      {content}
    </a>
  ) : (
    <div className={'los-track los-track-' + track.type + ' los-track-inactive'} aria-label={track.name + ': noch nicht verbunden'}>
      {content}
      <span className="los-track-inactive-note">{track.status === 'In Entwicklung' ? 'Im Aufbau' : 'Bald verfügbar'}</span>
    </div>
  );
}

export default function DesignPreview(): React.ReactElement {
  return (
    <div className="los-root">
      <header className="los-header">
        <a className="los-brand" href="/design-preview" aria-label="Lernpfade Designstudie – Startseite">
          <span className="los-brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>lernpfade<span className="los-brand-period">.</span></span>
          <small>by SBS Nexus</small>
        </a>
        <nav className="los-nav" aria-label="Learning OS Navigation">
          <a href="#lernpfade">Lernpfade</a>
          <a href="#lernprinzip">Das Konzept</a>
          <a href="#lern-moment">Erleben</a>
        </nav>
        <a className="los-nav-cta" href="/vokabeln">Lernraum öffnen <ArrowUpRight size={16} aria-hidden="true" /></a>
      </header>

      <main id="hauptinhalt">
        <section className="los-hero" aria-labelledby="los-heading">
          <div className="los-hero-copy">
            <div className="los-eyebrow"><span className="los-dot" /> EIN NEUES KAPITEL DES LERNENS <span className="los-eyebrow-index">01—26</span></div>
            <h1 id="los-heading">Wissen.<br />Verstehen.<br /><em>Können.</em></h1>
            <p className="los-hero-lead">Eine Lernwelt für Menschen, die nicht nur Antworten suchen, sondern <strong>Zusammenhänge begreifen.</strong></p>
            <div className="los-hero-actions">
              <a className="los-button-primary" href="#lernpfade">Entdecke deinen Pfad <ArrowUpRight size={18} aria-hidden="true" /></a>
              <a className="los-button-text" href="#lernprinzip">Die Idee dahinter <ArrowDown size={17} aria-hidden="true" /></a>
            </div>
            <div className="los-hero-foot"><span>SCROLL TO EXPLORE</span><span className="los-scroll-line" /></div>
          </div>
          <OrbitInstrument />
        </section>

        <div className="los-ticker">
          <div className="los-ticker-inner" aria-hidden="true">
            <span>LEARN DIFFERENT.</span><span className="los-ticker-star">✳</span>
            <span>THINK DEEPER.</span><span className="los-ticker-star">✳</span>
            <span>BUILD WHAT MATTERS.</span>
          </div>
        </div>

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
          <div className="los-principles" aria-label="Unser Lernprinzip">
            <div><span>01</span><strong>Verstehen</strong><small>Bevor du auswendig lernst.</small></div>
            <div><span>02</span><strong>Anwenden</strong><small>Damit Wissen greifbar wird.</small></div>
            <div><span>03</span><strong>Verankern</strong><small>Damit du es nicht wieder vergisst.</small></div>
          </div>
        </section>

        <section className="los-tracks-section" id="lernpfade" aria-labelledby="los-tracks-heading">
          <div className="los-section-label"><span>02 / DEINE WELTEN</span><span>CHOOSE YOUR DIRECTION</span></div>
          <div className="los-tracks-header">
            <h2 id="los-tracks-heading">Dein nächster<br /><em>Sprung.</em></h2>
            <p>Vier Perspektiven. Ein Lernsystem. Du entscheidest, wo deine Neugier beginnt.</p>
          </div>
          <div className="los-track-list">
            {tracks.map((track) => <TrackRow track={track} key={track.number} />)}
          </div>
          <p className="los-tracks-note">Weitere Lernpfade entstehen Schritt für Schritt. Keine künstlichen Fortschrittswerte, keine leeren Versprechen.</p>
        </section>

        <section className="los-moment-section" id="lern-moment" aria-labelledby="los-moment-heading">
          <div className="los-section-label"><span>03 / NICHT NUR ZUSCHAUEN</span><span>INTERACT TO UNDERSTAND</span></div>
          <div className="los-moment-layout">
            <div className="los-moment-intro">
              <span className="los-moment-asterisk" aria-hidden="true">✳</span>
              <h2 id="los-moment-heading">Aha statt<br /><em>Aha, okay.</em></h2>
              <p>Eine gute Lernoberfläche erklärt nicht nur. Sie lässt dich selbst denken. Probiere ein kurzes Beispiel.</p>
              <span className="los-demo-disclaimer">INTERAKTIVES BEISPIEL · KEINE SPEICHERUNG</span>
            </div>
            <LearningMoment />
          </div>
        </section>

        <section className="los-vocab-section" aria-labelledby="los-vocab-heading">
          <div className="los-section-label"><span>04 / WISSEN DAS BLEIBT</span><span>THE RECALL LOOP</span></div>
          <div className="los-vocab-inner">
            <div>
              <span className="los-vocab-symbol" aria-hidden="true">↗</span>
              <h2 id="los-vocab-heading">Lernen ist gut.<br /><em>Behalten ist besser.</em></h2>
              <p>Mit VokabelPfad und gezielter Wiederholung findest du den Weg vom ersten Verstehen zum langfristigen Können.</p>
              <a className="los-button-dark" href="/vokabeln">VokabelPfad ausprobieren <Arrow diagonal /></a>
              <p className="los-vocab-privacy">Deine Vokabeldecks bleiben derzeit lokal in deinem Browser. Kein Konto, keine Cloud-Synchronisation.</p>
            </div>
            <div className="los-vocab-art" aria-hidden="true">
              <div className="los-vocab-art-top">YOUR MIND / IN MOTION <span>↗</span></div>
              <div className="los-vocab-word">RE<span>CALL</span></div>
              <div className="los-vocab-art-bottom"><span>Verstehen</span><span>↗</span><span>Wiederholen</span><span>↗</span><span>Behalten</span></div>
            </div>
          </div>
        </section>

        <footer className="los-footer">
          <div className="los-footer-top"><span className="los-footer-star">✳</span><p>Deine Neugier verdient<br /><em>mehr als einen Kurs.</em></p></div>
          <div className="los-footer-bottom">
            <a className="los-footer-wordmark" href="/design-preview">lernpfade.</a>
            <span>Eine Idee von SBS Nexus Learning</span>
            <div><a href="/vokabeln">Vokabeln</a><a href="/wiederholen">Wiederholen</a><a href="/fortschritt">Fortschritt</a></div>
            <a href="#hauptinhalt" aria-label="Zurück nach oben">Zurück nach oben ↑</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
