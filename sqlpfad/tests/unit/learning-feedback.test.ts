import { describe, expect, it } from 'vitest';
import {
  CALLOUT_DEFAULT_TITLES,
  CALLOUT_TONES,
  FEEDBACK_TONES,
  FEEDBACK_TONE_ALIASES,
  calloutTitle,
  calloutTone,
  feedbackBadge,
  feedbackCallout,
  feedbackLive,
  feedbackTone,
} from '@/lib/learning-feedback';

/*
 * LP-03B — gemeinsamer Statusvertrag. KANONISCH unter
 * `docs/learning-feedback/learning-feedback.test.ts`; PythonPfad, SQLPfad und
 * AIPfad führen eine bytegleiche Kopie (Drift-Check).
 */

describe('Statusvertrag (LP-03B)', () => {
  it('kennt genau die acht Zustände aus LEARNING-DESIGN-SYSTEM §3', () => {
    expect([...FEEDBACK_TONES]).toEqual([
      'neutral',
      'info',
      'success',
      'warning',
      'danger',
      'due',
      'in-progress',
      'locked',
    ]);
  });

  it('löst die älteren Tonnamen an der Adaptergrenze auf', () => {
    expect(FEEDBACK_TONE_ALIASES).toEqual({ caution: 'warning', alert: 'danger' });
    expect(feedbackTone('caution')).toBe('warning');
    expect(feedbackTone('alert')).toBe('danger');
    for (const tone of FEEDBACK_TONES) expect(feedbackTone(tone)).toBe(tone);
  });

  it('Lernzustände bleiben eigene Zustände und werden nie zu Meldungstönen', () => {
    expect(feedbackTone('due')).toBe('due');
    expect(feedbackTone('in-progress')).toBe('in-progress');
    expect(feedbackTone('locked')).toBe('locked');
    expect(new Set(FEEDBACK_TONES).size).toBe(FEEDBACK_TONES.length);
  });

  it('Callouts sind Meldungen; Lernzustände sind dort nicht erlaubt', () => {
    expect([...CALLOUT_TONES]).toEqual(['neutral', 'info', 'success', 'warning', 'danger']);
    expect(calloutTone('alert')).toBe('danger');
    expect(() => calloutTone('due' as never)).toThrow();
    expect(() => feedbackTone('gefaehrlich' as never)).toThrow();
  });

  it('Standardtitel sind allgemein; ein fachlicher Titel hat Vorrang', () => {
    expect(CALLOUT_DEFAULT_TITLES).toEqual({
      info: 'Hinweis',
      success: 'Erfolg',
      warning: 'Achtung',
      danger: 'Fehler',
    });
    expect(calloutTitle('alert')).toBe('Fehler');
    expect(calloutTitle('caution')).toBe('Achtung');
    expect(calloutTitle('alert', 'Anmeldung nicht möglich')).toBe('Anmeldung nicht möglich');
    expect(calloutTitle('neutral')).toBeNull();
  });

  it('liefert Klassen und Zustandsattribut der gemeinsamen Darstellung', () => {
    expect(feedbackBadge('caution')).toEqual({
      className: 'lp-feedback lp-feedback-badge',
      'data-lp-tone': 'warning',
    });
    expect(feedbackCallout('alert')).toEqual({
      className: 'lp-feedback lp-feedback-callout',
      'data-lp-tone': 'danger',
    });
  });

  it('statisch ohne Live-Region, auch bei danger; auf Wunsch höflich', () => {
    expect(feedbackLive(false)).toEqual({});
    expect(feedbackLive(true)).toEqual({ role: 'status', 'aria-live': 'polite' });
  });
});
