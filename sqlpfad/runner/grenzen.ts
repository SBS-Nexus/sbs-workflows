/**
 * Die Grenzen aus docs/SQL-RUNNER.md, Abschnitt 5 – als Code statt als Tabelle.
 *
 * Bis hierher standen sie nur in der Dokumentation. Eine Grenze, die
 * beschrieben, aber nicht durchgesetzt ist, ist keine Grenze; sie ist eine
 * Absichtserklärung, auf die sich jemand verlässt.
 *
 * Alles hier ist reine Rechnung: keine Datenbank, kein Netz, keine Uhr außer
 * der übergebenen. Damit ist es prüfbar, ohne einen Server zu starten – und
 * genau das ist bei Schutzmechanismen der Punkt, weil man ihr Versagen sonst
 * erst im Ernstfall sieht.
 */

export interface Betriebsgrenzen {
  /** Gleichzeitige Ausführungen einer einzelnen Person. */
  jeSandbox: number;
  /** Gleichzeitige Ausführungen über alle Sandboxes. */
  insgesamt: number;
  /** Ausführungen je Sandbox innerhalb des Zeitfensters. */
  proFenster: number;
  fensterMs: number;
}

export const STANDARD_BETRIEBSGRENZEN: Betriebsgrenzen = {
  /*
   * Zwei je Sandbox, nicht eine: Wer eine lange Abfrage laufen hat und sie
   * abbrechen will, klickt danach oft sofort auf Ausführen. Bei einer Grenze
   * von eins bekäme genau diese Person eine Abfuhr – und zwar für ihre eigene,
   * gerade beendete Abfrage.
   */
  jeSandbox: 2,
  insgesamt: 20,
  proFenster: 30,
  fensterMs: 60_000,
};

export type Abweisungsgrund = 'zu-viele-je-sandbox' | 'server-ausgelastet' | 'zu-schnell';

export interface Einlassergebnis {
  eingelassen: boolean;
  grund?: Abweisungsgrund;
  /** Satz für die Lernende – erklärend, nicht tadelnd. */
  hinweis?: string;
}

/**
 * Die Sätze, die eine abgewiesene Ausführung begleiten.
 *
 * Keiner davon macht der Lernenden einen Vorwurf. „Zu schnell" ist meist ein
 * doppelter Klick oder ein hängender Editor, nicht ein Angriff – und wer eine
 * Aufgabe lösen will, ist mit „du hast etwas falsch gemacht" nicht geholfen.
 */
const HINWEISE: Record<Abweisungsgrund, string> = {
  'zu-viele-je-sandbox':
    'Es läuft noch eine Abfrage von dir. Warte, bis sie fertig ist, oder brich sie ab – ' +
    'zwei gleichzeitig würden sich in derselben Übungsdatenbank gegenseitig behindern.',
  'server-ausgelastet':
    'Gerade rechnen viele gleichzeitig. Versuch es in ein paar Sekunden noch einmal; ' +
    'deine Abfrage ist nicht verloren.',
  'zu-schnell':
    'Das waren viele Ausführungen in kurzer Zeit. Warte einen Moment – meist steckt ein ' +
    'doppelter Klick dahinter, und deine Abfrage bleibt im Editor stehen.',
};

const EINGELASSEN: Einlassergebnis = { eingelassen: true };

function abgewiesen(grund: Abweisungsgrund): Einlassergebnis {
  return { eingelassen: false, grund, hinweis: HINWEISE[grund] };
}

/**
 * Führt Buch über das, was gerade läuft.
 *
 * Bewusst im Speicher eines einzelnen Prozesses und ohne gemeinsamen Speicher
 * über mehrere Instanzen. Das ist kein Versehen: Ein Runner hält eigene
 * Verbindungspools zu den Sandboxes; zwei Instanzen ohne gemeinsamen Zustand
 * wären ohnehin ein anderes Problem als eine ungenaue Zählung. Sollte je
 * waagerecht skaliert werden, gehört hier ein gemeinsamer Zähler hin – und
 * dieser Satz ist die Stelle, an der man es merkt.
 */
export interface Aufsicht {
  bittEinlass(sandboxId: string, jetzt?: number): Einlassergebnis;
  entlasse(sandboxId: string): void;
  laufende(): number;
}

export function erstelleAufsicht(grenzen: Betriebsgrenzen = STANDARD_BETRIEBSGRENZEN): Aufsicht {
  const laufendeJeSandbox = new Map<string, number>();
  /** Zeitpunkte der letzten Ausführungen je Sandbox, für das Zeitfenster. */
  const verlauf = new Map<string, number[]>();
  let gesamt = 0;

  return {
    bittEinlass(sandboxId, jetzt = Date.now()) {
      const offen = laufendeJeSandbox.get(sandboxId) ?? 0;
      if (offen >= grenzen.jeSandbox) return abgewiesen('zu-viele-je-sandbox');
      if (gesamt >= grenzen.insgesamt) return abgewiesen('server-ausgelastet');

      // Alte Einträge fallen aus dem Fenster, bevor gezählt wird. Ohne das
      // wüchse die Liste unbegrenzt und die Grenze griffe irgendwann für
      // immer.
      const frisch = (verlauf.get(sandboxId) ?? []).filter(
        (zeitpunkt) => jetzt - zeitpunkt < grenzen.fensterMs,
      );
      if (frisch.length >= grenzen.proFenster) {
        verlauf.set(sandboxId, frisch);
        return abgewiesen('zu-schnell');
      }

      frisch.push(jetzt);
      verlauf.set(sandboxId, frisch);
      laufendeJeSandbox.set(sandboxId, offen + 1);
      gesamt += 1;
      return EINGELASSEN;
    },

    entlasse(sandboxId) {
      const offen = laufendeJeSandbox.get(sandboxId) ?? 0;
      /*
       * Nicht unter null zählen.
       *
       * Ein zweites `entlasse` zur selben Ausführung – etwa aus einem
       * `finally` nach einem Abbruch – würde den Zähler sonst dauerhaft
       * verfälschen, und zwar nach unten: Die Grenze griffe danach nie wieder.
       */
      if (offen <= 0) return;
      if (offen === 1) laufendeJeSandbox.delete(sandboxId);
      else laufendeJeSandbox.set(sandboxId, offen - 1);
      gesamt = Math.max(0, gesamt - 1);
    },

    laufende() {
      return gesamt;
    },
  };
}
