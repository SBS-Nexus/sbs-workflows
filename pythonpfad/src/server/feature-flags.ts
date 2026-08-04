import 'server-only';

/**
 * Funktionsschalter.
 *
 * Zweck: Neues ausliefern, ohne es sofort für alle einzuschalten – und im
 * Zweifel abschalten können, ohne eine neue Fassung ausrollen zu müssen.
 *
 * Bewusst über Umgebungsvariablen und nicht über die Datenbank: Ein Schalter,
 * der selbst von der Datenbank abhängt, hilft genau dann nicht, wenn man ihn
 * am dringendsten braucht. Und ein Neustart mit geänderter Variable ist im
 * Betrieb ohnehin der schnellere Weg als eine Migration.
 *
 * Jeder Schalter hat einen Standardwert, der ohne Konfiguration gilt. Die
 * Anwendung muss vollständig funktionieren, wenn keine einzige Variable
 * gesetzt ist.
 */

export interface FeatureFlag {
  key: string;
  /** Wofür der Schalter da ist – erscheint auch im Redaktionsbereich. */
  description: string;
  defaultValue: boolean;
}

export const FEATURE_FLAGS: readonly FeatureFlag[] = [
  {
    key: 'AUSFUEHRUNGS_VISUALISIERER',
    description:
      'Schaltfläche „Schritt für Schritt" in Editor und Lektionsbeispiel. Ausschalten, falls die Aufzeichnung auf schwachen Geräten stört.',
    defaultValue: true,
  },
  {
    key: 'WISSENSLANDKARTE',
    description: 'Konzeptgraph und Behaltensprognose im Fortschrittsbereich.',
    defaultValue: true,
  },
  {
    key: 'ORGANISATIONEN',
    description:
      'Organisationen, Kohorten und Lehrkraftbereich. Ausschalten für Installationen, die ausschließlich Einzelkonten führen.',
    defaultValue: true,
  },
  {
    key: 'EDITOR_VORSCHLAEGE',
    description: 'Vorschlagsliste mit deutschen Erklärungen im Code-Editor (Strg + Leertaste).',
    defaultValue: true,
  },
];

const PREFIX = 'FEATURE_';

/**
 * Liest einen Schalter.
 *
 * Nur die ausdrücklichen Werte `true` und `false` zählen. Alles andere – ein
 * Tippfehler, eine leere Zeichenkette, ein `1` – führt zum Standardwert und
 * nicht zu einem zufälligen Verhalten.
 */
export function isEnabled(key: string): boolean {
  const flag = FEATURE_FLAGS.find((eintrag) => eintrag.key === key);
  const standard = flag?.defaultValue ?? false;

  const wert = process.env[`${PREFIX}${key}`];
  if (wert === 'true') return true;
  if (wert === 'false') return false;
  return standard;
}

/** Aktueller Stand aller Schalter – für den Redaktionsbereich und die Diagnose. */
export function allFlags(): Array<FeatureFlag & { enabled: boolean; overridden: boolean }> {
  return FEATURE_FLAGS.map((flag) => {
    const wert = process.env[`${PREFIX}${flag.key}`];
    return {
      ...flag,
      enabled: isEnabled(flag.key),
      overridden: wert === 'true' || wert === 'false',
    };
  });
}
