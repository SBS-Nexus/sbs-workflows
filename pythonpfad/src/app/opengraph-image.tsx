import { ImageResponse } from 'next/og';
import { BRAND } from '@/lib/brand';

/**
 * Vorschaubild für geteilte Verweise.
 *
 * Wer einen Link auf diese Seite in einen Messenger, in ein Forum oder in ein
 * soziales Netz stellt, bekommt bisher ein leeres Kästchen. Das ist der
 * Unterschied zwischen „irgendein Link" und „das sieht nach etwas aus" – und er
 * entscheidet mit darüber, ob jemand klickt.
 *
 * Das Bild wird erzeugt und nicht als Datei abgelegt. Das hat einen
 * praktischen Grund: Es bleibt automatisch richtig, wenn sich Name oder
 * Anspruch ändern, und es gibt keine zweite Wahrheit, die still veraltet.
 *
 * Bewusst ohne mitgelieferte Schriftdatei. Der Preis dafür ist sichtbar: Ohne
 * Schriftdatei steht nur ein Schnitt zur Verfügung, die Überschrift wird also
 * normal statt fett gesetzt – anders als in der Anwendung selbst. Die
 * Alternative wären mehrere hundert Kilobyte Schrift im Auslieferungspaket für
 * ein einziges Bild. Dafür ist der Gewinn zu klein; die Aussage trägt sich
 * über Größe und Farbe.
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
      {/* Kopfzeile: Bildzeichen und Name */}
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
          {/* Dasselbe Bildzeichen wie im Symbol: ein Pfad, der aufsteigt. */}
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 18h4v-4M10 14h4v-4M16 10h4V6"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em' }}>{BRAND.name}</div>
      </div>

      {/* Aussage */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.035em',
          }}
        >
          <span>Python verstehen.</span>
          <span>Selbst schreiben.</span>
          <span style={{ color: colors.mint }}>Wirklich anwenden.</span>
        </div>
        <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.78)' }}>
          Für Menschen, die noch nie programmiert haben
        </div>
      </div>

      {/* Fußzeile: drei Punkte, die den Unterschied ausmachen */}
      <div style={{ display: 'flex', gap: 16 }}>
        {['Direkt im Browser', 'Ohne Installation', 'Auf Deutsch erklärt'].map((text) => (
          <div
            key={text}
            style={{
              display: 'flex',
              fontSize: 24,
              fontWeight: 600,
              padding: '12px 24px',
              borderRadius: 999,
              border: '2px solid rgba(255,255,255,0.28)',
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          >
            {text}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
