import { ImageResponse } from 'next/og';
import { BRAND } from '@/lib/brand';

/**
 * Vorschaubild für geteilte Verweise. Erzeugt statt als Datei abgelegt, damit
 * es automatisch richtig bleibt, wenn sich Name oder Anspruch ändern.
 *
 * Bewusst ohne Gradient und ohne mitgelieferte Schriftdatei (System-Schrift
 * genügt für ein einzelnes Bild und spart mehrere hundert Kilobyte). Die
 * Bildmarke ist dieselbe Drei-Knoten-Wissenslandkarte wie in `public/icon.svg`
 * – ein Wiedererkennungsmerkmal, keine Dekoration.
 */

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = BRAND.title;

const INK_950 = '#131110';
const SIGNAL_500 = '#b45309';
const SIGNAL_300 = '#efb26a';
const WIRE_500 = '#24618f';

export default function OpengraphImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        color: '#f6f4ef',
        backgroundColor: INK_950,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <svg width="56" height="56" viewBox="0 0 512 512">
          <line x1="128" y1="368" x2="256" y2="256" stroke={WIRE_500} strokeWidth="20" />
          <line x1="256" y1="256" x2="384" y2="144" stroke={WIRE_500} strokeWidth="20" />
          <circle cx="128" cy="368" r="40" fill={SIGNAL_500} />
          <circle cx="256" cy="256" r="40" fill={SIGNAL_300} />
          <circle cx="384" cy="144" r="40" fill={SIGNAL_500} />
        </svg>
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}>{BRAND.name}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 62,
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: '-0.02em',
          }}
        >
          <span>AI verstehen.</span>
          <span>Werkzeuge beherrschen.</span>
          <span style={{ color: SIGNAL_300 }}>Systeme bauen.</span>
        </div>
        <div style={{ fontSize: 26, color: 'rgba(246,244,239,0.72)' }}>
          Wie Tokens, Kontextfenster und Prompts wirklich funktionieren
        </div>
      </div>
    </div>,
    size,
  );
}
