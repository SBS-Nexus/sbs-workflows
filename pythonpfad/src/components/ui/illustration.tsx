import type { ReactNode } from 'react';

/**
 * Illustrationen.
 *
 * Selbst gezeichnet und als SVG eingebettet. Der Grund ist nicht Sparsamkeit:
 * Die strenge Inhaltsrichtlinie erlaubt keine Bilder von fremden Servern, und
 * eingebettete Zeichnungen funktionieren offline, skalieren verlustfrei und
 * nehmen die Farbe des Bereichs an, in dem sie stehen.
 *
 * Bildsprache: geometrisch, freundlich, ohne Figuren. Menschen zu zeichnen
 * würde bedeuten, sich für Aussehen und Hautfarbe zu entscheiden – bei einer
 * Anwendung für Erwachsene aus allen Richtungen ist eine abstrakte Bildsprache
 * die ehrlichere Wahl. Die Formen greifen stattdessen auf, worum es geht:
 * Reihenfolge, Verzweigung, Wiederholung, Bausteine.
 *
 * Alle Illustrationen sind für Hilfstechnik unsichtbar. Sie stehen immer neben
 * einer Überschrift, die dasselbe sagt.
 */

type IllustrationProps = {
  className?: string;
  /** Farbe. Ohne Angabe wird die Akzentfarbe des Bereichs benutzt. */
  tone?: string;
};

const BASIS = 'block h-auto w-full';

/** Reihenfolge: drei Bausteine, die nacheinander abgearbeitet werden. */
export function IllustrationSequence({ className, tone }: IllustrationProps): ReactNode {
  const farbe = tone ?? 'var(--akzent, var(--accent))';
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true" className={`${BASIS} ${className ?? ''}`}>
      <defs>
        <linearGradient id="ill-seq" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={farbe} stopOpacity="0.9" />
          <stop offset="100%" stopColor={farbe} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect x="14" y="34" width="86" height="26" rx="13" fill="url(#ill-seq)" />
      <rect x="14" y="70" width="120" height="26" rx="13" fill={farbe} opacity="0.55" />
      <rect x="14" y="106" width="64" height="26" rx="13" fill={farbe} opacity="0.3" />
      <path
        d="M150 34h44a12 12 0 0 1 12 12v68a12 12 0 0 1-12 12h-44"
        stroke={farbe}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="150" cy="47" r="7" fill={farbe} />
      <circle cx="150" cy="83" r="7" fill={farbe} opacity="0.6" />
      <circle cx="150" cy="119" r="7" fill={farbe} opacity="0.35" />
    </svg>
  );
}

/** Verzweigung: ein Weg, der sich teilt. Für Bedingungen. */
export function IllustrationBranch({ className, tone }: IllustrationProps): ReactNode {
  const farbe = tone ?? 'var(--akzent, var(--accent))';
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true" className={`${BASIS} ${className ?? ''}`}>
      <path
        d="M24 80h56c18 0 18-42 36-42h56"
        stroke={farbe}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M24 80h56c18 0 18 42 36 42h56"
        stroke={farbe}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        opacity="0.4"
      />
      <circle cx="24" cy="80" r="10" fill={farbe} />
      <rect x="176" y="24" width="40" height="28" rx="10" fill={farbe} />
      <rect x="176" y="108" width="40" height="28" rx="10" fill={farbe} opacity="0.4" />
    </svg>
  );
}

/** Wiederholung: ein Kreis mit Etappen. Für Schleifen und Wiederholen. */
export function IllustrationLoop({ className, tone }: IllustrationProps): ReactNode {
  const farbe = tone ?? 'var(--akzent, var(--accent))';
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true" className={`${BASIS} ${className ?? ''}`}>
      <circle
        cx="120"
        cy="80"
        r="52"
        stroke={farbe}
        strokeWidth="4"
        fill="none"
        strokeDasharray="14 10"
        opacity="0.45"
      />
      <path
        d="M120 28a52 52 0 0 1 45 78"
        stroke={farbe}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M160 96l6 14 14-6" stroke={farbe} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="120" cy="28" r="9" fill={farbe} />
      <circle cx="68" cy="80" r="7" fill={farbe} opacity="0.5" />
      <circle cx="120" cy="132" r="7" fill={farbe} opacity="0.35" />
    </svg>
  );
}

/** Bausteine: gestapelte Formen. Für Projekte. */
export function IllustrationBuild({ className, tone }: IllustrationProps): ReactNode {
  const farbe = tone ?? 'var(--akzent, var(--accent))';
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true" className={`${BASIS} ${className ?? ''}`}>
      <rect x="52" y="96" width="60" height="44" rx="10" fill={farbe} opacity="0.85" />
      <rect x="120" y="112" width="68" height="28" rx="10" fill={farbe} opacity="0.45" />
      <rect x="76" y="48" width="88" height="40" rx="10" fill={farbe} opacity="0.6" />
      <rect x="104" y="14" width="40" height="26" rx="10" fill={farbe} />
      <path d="M40 148h160" stroke={farbe} strokeWidth="3" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

/** Leerer Zustand: eine offene Fläche mit einem Anfangspunkt. */
export function IllustrationEmpty({ className, tone }: IllustrationProps): ReactNode {
  const farbe = tone ?? 'var(--text-muted)';
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true" className={`${BASIS} ${className ?? ''}`}>
      <rect
        x="30"
        y="30"
        width="180"
        height="100"
        rx="18"
        stroke={farbe}
        strokeWidth="3"
        strokeDasharray="10 9"
        fill="none"
        opacity="0.5"
      />
      <circle cx="120" cy="80" r="16" stroke={farbe} strokeWidth="3" fill="none" opacity="0.7" />
      <path d="M120 72v16M112 80h16" stroke={farbe} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

/** Erfolg: aufsteigende Form mit Haken. Ohne Pokal, ohne Konfetti. */
export function IllustrationSuccess({ className, tone }: IllustrationProps): ReactNode {
  const farbe = tone ?? 'var(--success)';
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true" className={`${BASIS} ${className ?? ''}`}>
      <path
        d="M28 120c34 0 46-32 68-52s54-28 116-28"
        stroke={farbe}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="176" cy="56" r="30" fill={farbe} opacity="0.16" />
      <circle cx="176" cy="56" r="20" fill={farbe} />
      <path
        d="m167 56 6 6 12-12"
        stroke="var(--surface-raised)"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Fehler als Lernstoff: eine Lupe über einer Zeile. Kein Warndreieck. */
export function IllustrationInspect({ className, tone }: IllustrationProps): ReactNode {
  const farbe = tone ?? 'var(--caution)';
  return (
    <svg viewBox="0 0 240 160" aria-hidden="true" className={`${BASIS} ${className ?? ''}`}>
      <rect x="28" y="44" width="120" height="12" rx="6" fill={farbe} opacity="0.3" />
      <rect x="28" y="70" width="86" height="12" rx="6" fill={farbe} opacity="0.55" />
      <rect x="28" y="96" width="104" height="12" rx="6" fill={farbe} opacity="0.3" />
      <circle cx="158" cy="76" r="34" stroke={farbe} strokeWidth="5" fill="none" />
      <circle cx="158" cy="76" r="34" fill={farbe} opacity="0.08" />
      <path d="m183 101 22 22" stroke={farbe} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
