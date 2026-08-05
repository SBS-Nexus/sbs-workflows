import { type FeedbackPlan, type Ton, isSilent } from '@/domain/feedback/feedback-policy';

/**
 * Führt einen Rückmeldeplan auf dem Gerät aus.
 *
 * Die Töne werden erzeugt, nicht abgespielt. Der Unterschied ist größer, als er
 * klingt:
 *
 *  - Keine Audiodateien im Auslieferungspaket. Fünf kurze Klänge in
 *    brauchbarer Qualität wären schnell ein paar hundert Kilobyte – für etwas,
 *    das die meisten nie einschalten.
 *  - Die Inhaltsrichtlinie bleibt unangetastet. `media-src` müsste sonst
 *    geöffnet werden.
 *  - Ein Sinuston mit weicher Hüllkurve klingt auf jedem Gerät gleich und
 *    braucht keine Rücksicht auf Dateiformate.
 *
 * Der Audio-Kontext wird erst beim ersten Ton angelegt und danach behalten.
 * Browser erlauben Klang ohnehin erst nach einer Nutzerhandlung – ein Kontext,
 * der beim Laden der Seite entsteht, bleibt gesperrt und muss später doch
 * wieder aufgeweckt werden.
 */

let kontext: AudioContext | null = null;

function holeKontext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!kontext) {
    const Konstruktor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Konstruktor) return null;
    try {
      kontext = new Konstruktor();
    } catch {
      // Manche Browser verweigern den Kontext ohne Nutzerhandlung. Kein Grund,
      // die auslösende Handlung scheitern zu lassen – Ton ist Beiwerk.
      return null;
    }
  }

  if (kontext.state === 'suspended') void kontext.resume();
  return kontext;
}

/**
 * Ein einzelner Ton mit weicher Hüllkurve.
 *
 * Die An- und Abschwellzeiten sind der eigentliche Trick: Ein Sinuston, der
 * abrupt beginnt und endet, knackt hörbar. Zwölf Millisekunden Anstieg und ein
 * exponentielles Ausklingen genügen, damit daraus ein runder Klang wird.
 */
function spieleTon(ctx: AudioContext, ton: Ton, startZeit: number): void {
  const oszillator = ctx.createOscillator();
  const huelle = ctx.createGain();

  oszillator.type = 'sine';
  oszillator.frequency.setValueAtTime(ton.hz, startZeit);

  const dauer = ton.ms / 1000;
  const anstieg = Math.min(0.012, dauer / 3);

  huelle.gain.setValueAtTime(0.0001, startZeit);
  huelle.gain.exponentialRampToValueAtTime(ton.lautstaerke, startZeit + anstieg);
  huelle.gain.exponentialRampToValueAtTime(0.0001, startZeit + dauer);

  oszillator.connect(huelle);
  huelle.connect(ctx.destination);

  oszillator.start(startZeit);
  oszillator.stop(startZeit + dauer + 0.02);
}

/** Kann das Gerät überhaupt vibrieren? */
export function unterstuetztVibration(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * Führt den Plan aus.
 *
 * Schlägt bewusst nie fehl: Rückmeldung ist Beiwerk. Wenn das Gerät keinen Ton
 * kann, die Vibration verweigert oder der Browser den Audio-Kontext sperrt,
 * darf davon nichts nach außen dringen – die Aufgabe wurde trotzdem gelöst.
 */
export function fuehreAus(plan: FeedbackPlan): void {
  if (isSilent(plan)) return;

  if (plan.vibration.length > 0 && unterstuetztVibration()) {
    try {
      navigator.vibrate(plan.vibration);
    } catch {
      /* Manche Browser melden hier einen Fehler, statt es einfach zu lassen. */
    }
  }

  if (plan.toene.length === 0) return;

  const ctx = holeKontext();
  if (!ctx) return;

  try {
    // Ein kleiner Vorlauf, damit der erste Ton nicht schon während der
    // Einplanung beginnt und dadurch abgeschnitten klingt.
    let zeit = ctx.currentTime + 0.01;
    for (const ton of plan.toene) {
      spieleTon(ctx, ton, zeit);
      zeit += ton.ms / 1000;
    }
  } catch {
    /* Siehe oben: Ton darf nichts aufhalten. */
  }
}

/**
 * Gibt den Audio-Kontext frei.
 *
 * Wird gebraucht, wenn jemand den Ton abschaltet: Ein offener Kontext hält
 * sonst auf manchen Geräten die Audio-Einheit wach und kostet Akku, obwohl nie
 * wieder ein Ton kommt.
 */
export function schliesseKontext(): void {
  if (!kontext) return;
  void kontext.close().catch(() => undefined);
  kontext = null;
}
