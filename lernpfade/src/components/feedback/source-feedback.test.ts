import assert from 'node:assert/strict';
import test from 'node:test';
import { FEEDBACK_TONES, feedbackCallout, feedbackLive } from '../../lib/learning-feedback.ts';
import { EMPTY_SOURCE, EMPTY_VOCABULARY, sourceFeedback, vocabularyFeedback } from './source-feedback.ts';

test('Quellzustände: nie Erfolg, Ausfall ist Warnung, nicht angemeldet ist Hinweis', () => {
  assert.deepEqual(sourceFeedback('loading'), { tone: 'neutral', title: 'Wird geladen', live: true });
  assert.deepEqual(sourceFeedback('not_configured'), { tone: 'neutral', title: 'Nicht verbunden', live: false });
  assert.deepEqual(sourceFeedback('unauthenticated'), { tone: 'info', title: 'Nicht angemeldet', live: false });
  assert.deepEqual(sourceFeedback('unavailable'), { tone: 'warning', title: 'Nicht erreichbar', live: false });
  for (const status of ['loading', 'not_configured', 'unauthenticated', 'unavailable'] as const) {
    assert.notEqual(sourceFeedback(status).tone, 'success', status);
    assert.notEqual(sourceFeedback(status).tone, 'danger', `${status}: Quellausfall ist kein Seitenfehler`);
  }
});

test('lokaler Vokabelstand: unlesbar ist ein Fehler, sonst Warnung; Laden wird angesagt', () => {
  assert.equal(vocabularyFeedback('corrupt').tone, 'danger');
  assert.equal(vocabularyFeedback('future').tone, 'warning');
  assert.equal(vocabularyFeedback('unavailable').tone, 'warning');
  assert.equal(vocabularyFeedback('loading').live, true);
  for (const reason of ['corrupt', 'future', 'unavailable'] as const) {
    assert.equal(vocabularyFeedback(reason).live, false, `${reason}: statisch, keine Live-Region`);
  }
});

test('gültige leere Antwort ist neutral — ein echter Stand, keine Störung', () => {
  assert.equal(EMPTY_SOURCE.tone, 'neutral');
  assert.equal(EMPTY_VOCABULARY.tone, 'neutral');
});

test('Hub nutzt den gemeinsamen Vertrag: Klassen, Zustandsattribut, höfliche Ansage nur auf Wunsch', () => {
  assert.ok(FEEDBACK_TONES.includes('warning'));
  assert.deepEqual(feedbackCallout('warning'), {
    className: 'lp-feedback lp-feedback-callout',
    'data-lp-tone': 'warning',
  });
  assert.deepEqual(feedbackCallout('caution')['data-lp-tone'], 'warning');
  assert.deepEqual(feedbackLive(false), {});
  assert.deepEqual(feedbackLive(true), { role: 'status', 'aria-live': 'polite' });
});
