import { ImageResponse } from 'next/og';
import { BRAND } from '@/lib/brand';

/**
 * Vorschaubild für geteilte Verweise.
 *
 * Bisher stand in den Kopfdaten `twitter:card: summary_large_image`, ohne dass
 * es ein Bild gab – also ein großes leeres Kästchen, die schlechteste aller
 * Varianten. Wer einen Link in einen Messenger oder ein Forum stellt, sieht
 * jetzt, worum es geht.
 *
 * Das Bild wird erzeugt und nicht als Datei abgelegt. Damit bleibt es
 * automatisch richtig, wenn sich Name oder Anspruch ändern, und es gibt keine
 * zweite Wahrheit, die still veraltet.
 *
 * Bewusst **ohne mitgelieferte Schriftdatei**. Der Preis ist sichtbar: Es steht
 * nur ein Schnitt zur Verfügung, die Überschrift wird also normal statt fett
 * gesetzt – anders als in der Anwendung. Die Alternative wären mehrere hundert
 * Kilobyte Schrift im Auslieferungspaket für ein einziges Bild. Dafür ist der
 * Gewinn zu klein; die Aussage trägt sich über Größe und Farbe.
 */

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = `${BRAND.name} – ${BRAND.claim}`;

export default function OpengraphImage(): ImageResponse {
  const { colors } = BRAND;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        color: '#ffffff',
        backgroundColor: colors.heroVia,
        backgroundImage: `radial-gradient(circle at 12% 8%, ${colors.heroTo} 0%, transparent 55%), radial-gradient(circle at 88% 92%, ${colors.primary} 0%, transparent 55%), linear-gradient(140deg, ${colors.heroFrom} 0%, ${colors.heroVia} 50%, ${colors.heroTo} 100%)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            display: 'flex',
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.16)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Dasselbe Zeichen wie im Symbol: drei Knoten, durch Kanten verbunden. */}
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="6" cy="7" r="2.5" />
            <circle cx="18" cy="7" r="2.5" />
            <circle cx="12" cy="17" r="2.5" />
            <path d="M7.8 8.6 10.6 15M16.2 8.6 13.4 15M8.5 7h7" />
          </svg>
        </div>
        <div style={{ fontSize: 44, letterSpacing: '-0.02em' }}>{BRAND.name}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/*
         * Drei Zeilen als drei Kästen, nicht ein Absatz mit <br />.
         *
         * Satori - der Renderer hinter ImageResponse - ist kein Browser. Er
         * verlangt bei mehr als einem Kindknoten ein ausdrückliches `display`
         * und bricht sonst den ganzen Build ab. Der Fehler kommt dabei erst
         * beim Vorrendern und nicht beim Übersetzen: typecheck und lint waren
         * grün, der Build nicht.
         */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 68,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            maxWidth: 900,
          }}
        >
          <div>SQL verstehen.</div>
          <div>Abfragen schreiben.</div>
          <div style={{ color: colors.mint }}>Daten wirklich nutzen.</div>
        </div>
        <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.78)', maxWidth: 860 }}>
          T-SQL auf SQL Server – mit einer eigenen Übungsdatenbank.
        </div>
      </div>
    </div>,
    size,
  );
}
