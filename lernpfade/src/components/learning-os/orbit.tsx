/**
 * Wissensorbit — das eigenständige Leitmotiv des Learning OS.
 *
 * Eigene SVG-Geometrie (Ellipsen, Punkte, Haken), keine fremden Assets, keine
 * Textur, kein WebGL. Die Drehung steht in `learning-os.css` und endet bei
 * `prefers-reduced-motion: reduce`.
 */

export function OrbitInstrument(): React.ReactElement {
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

/**
 * Ruhige Kleinform des Orbits für die Kopfbereiche der Lernansichten.
 * Rein dekorativ, ohne Drehung, ohne Farbverlauf-IDs (keine Kollision mit
 * dem großen Instrument).
 */
export function OrbitMark(): React.ReactElement {
  return (
    <svg className="los-orbit-mark" viewBox="0 0 240 240" fill="none" aria-hidden="true" focusable="false">
      <circle cx="120" cy="120" r="108" stroke="currentColor" strokeOpacity=".16" />
      <circle cx="120" cy="120" r="74" stroke="currentColor" strokeOpacity=".14" strokeDasharray="2 7" />
      <ellipse cx="120" cy="120" rx="104" ry="40" stroke="#D0FA83" strokeOpacity=".55" transform="rotate(-37 120 120)" />
      <ellipse cx="120" cy="120" rx="104" ry="38" stroke="#B4F5D2" strokeOpacity=".4" transform="rotate(43 120 120)" />
      <circle cx="38" cy="70" r="3.5" fill="#D0FA83" />
      <circle cx="201" cy="157" r="3" fill="#B4A0FF" />
      <circle cx="120" cy="120" r="22" stroke="#D0FA83" strokeOpacity=".6" />
      <path d="M110 121l7 7 13-16" stroke="#D0FA83" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
