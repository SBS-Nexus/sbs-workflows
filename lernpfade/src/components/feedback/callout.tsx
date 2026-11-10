import { FEEDBACK_CLASS, feedbackCallout, feedbackLive, type CalloutTone } from '@/lib/learning-feedback';
import type { FeedbackMessage } from './source-feedback';

/**
 * Callout des Hubs im gemeinsamen Statusvertrag (LP-03B) — dieselbe
 * Darstellung wie in PythonPfad, SQLPfad und AIPfad. Symbol UND Titel tragen
 * die Bedeutung, Farbe unterstützt nur. Das Symbol ist dekorativ.
 *
 * Live-Meldungen (nur „wird geladen"): Die Statusregion liegt auf dem Text,
 * nicht auf dem ganzen Callout — angesagt wird genau der bisherige Satz,
 * ohne den sichtbaren Titel davor (bestehende Status-Semantik von LP-07).
 */

const PATHS: Record<CalloutTone, string> = {
  neutral: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  success: 'm5 12.5 4.5 4.5L19 7.5',
  warning: 'M12 9v4M12 17h.01M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  danger: 'm15 9-6 6M9 9l6 6M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
};

export function FeedbackCallout({
  message,
  children,
}: {
  message: FeedbackMessage;
  children: React.ReactNode;
}): React.ReactElement {
  const feedback = feedbackCallout(message.tone);
  return (
    <div className={feedback.className} data-lp-tone={feedback['data-lp-tone']}>
      <p className={FEEDBACK_CLASS.title}>
        <svg
          className={FEEDBACK_CLASS.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d={PATHS[feedback['data-lp-tone'] as CalloutTone]} />
        </svg>
        <span>{message.title}</span>
      </p>
      <div className={FEEDBACK_CLASS.body} {...feedbackLive(message.live)}>
        {children}
      </div>
    </div>
  );
}
