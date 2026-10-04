import assert from 'node:assert/strict';
import test from 'node:test';
import {
  charLength,
  checkTags,
  checkText,
  isIsoTimestamp,
  isValidId,
  localDayKey,
  parseReviewKey,
  reviewKey,
  splitTagInput,
} from './fields.ts';
import { LIMITS } from './model.ts';

test('review keys are stable and distinguish deck, card and direction', () => {
  const key = reviewKey('deck-a', 'card-1', 'en-de');
  assert.equal(key, 'deck-a:card-1:en-de');
  assert.equal(reviewKey('deck-a', 'card-1', 'en-de'), key, 'same inputs give the same key');
  const keys = new Set([
    reviewKey('deck-a', 'card-1', 'en-de'),
    reviewKey('deck-a', 'card-1', 'de-en'),
    reviewKey('deck-b', 'card-1', 'en-de'),
    reviewKey('deck-a', 'card-2', 'en-de'),
    // Kollisionsversuch über Trennzeichen ist nicht möglich: IDs enthalten keinen Doppelpunkt.
    reviewKey('a', 'b-c', 'en-de'),
    reviewKey('a-b', 'c', 'en-de'),
  ]);
  assert.equal(keys.size, 6);
  assert.deepEqual(parseReviewKey(key), { deckId: 'deck-a', cardId: 'card-1', direction: 'en-de' });
});

test('review keys reject ids that could break the key structure', () => {
  assert.throws(() => reviewKey('deck:a', 'card', 'en-de'));
  assert.throws(() => reviewKey('deck', 'card', 'en-fr' as never));
  assert.equal(parseReviewKey('a:b:c:en-de'), null);
  assert.equal(parseReviewKey('a:b:fr-de'), null);
  assert.equal(parseReviewKey(42), null);
});

test('ids are lowercase slugs without separators or path characters', () => {
  for (const id of ['deck-1', 'a', 'starter-en-alltag', 'deck-1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed']) {
    assert.equal(isValidId(id), true, id);
  }
  for (const id of ['', '-a', 'a-', 'A', 'a b', 'a:b', '../x', '__proto__', 'constructor!', 'x'.repeat(65), 7]) {
    assert.equal(isValidId(id), false, String(id));
  }
});

test('text fields trim, count Unicode characters and reject control characters', () => {
  assert.deepEqual(checkText('  Haus  ', 'translation', 10, true), { ok: true, value: 'Haus' });
  assert.equal(charLength('🚀🚀'), 2, 'emoji count as one character each');
  assert.equal(checkText('🚀'.repeat(LIMITS.term), 'term', LIMITS.term, true).ok, true);
  const tooLong = checkText('a'.repeat(LIMITS.term + 1), 'term', LIMITS.term, true);
  assert.equal(tooLong.ok, false);
  assert.equal(!tooLong.ok && tooLong.error.field, 'term');
  assert.equal(checkText('   ', 'term', 10, true).ok, false);
  assert.equal(checkText('', 'context', 10, false).ok, true);
  assert.equal(checkText('a\nb', 'term', 10, true).ok, false);
  assert.equal(checkText('a\u0000b', 'term', 10, true).ok, false);
  assert.equal(checkText('a b', 'term', 10, true).ok, false);
  assert.equal(checkText(42, 'term', 10, true).ok, false);
});

test('tags are trimmed, de-duplicated case-insensitively and bounded', () => {
  assert.deepEqual(checkTags(splitTagInput(' Reisen, bahn ,reisen,, ')), { ok: true, value: ['Reisen', 'bahn'] });
  const many = Array.from({ length: LIMITS.tagsPerCard + 1 }, (_, i) => `t${i}`);
  assert.equal(checkTags(many).ok, false);
  assert.equal(checkTags(['x'.repeat(LIMITS.tag + 1)]).ok, false);
  assert.equal(checkTags('a,b').ok, false);
});

test('timestamps must be strict ISO UTC and real dates', () => {
  assert.equal(isIsoTimestamp('2026-10-04T10:00:00.000Z'), true);
  assert.equal(isIsoTimestamp('2026-10-04T10:00:00Z'), true);
  assert.equal(isIsoTimestamp('2026-02-31T10:00:00.000Z'), false);
  assert.equal(isIsoTimestamp('2026-10-04 10:00'), false);
  assert.equal(isIsoTimestamp('1970-01-01T00:00:00.000Z'), false, 'outside the plausible range');
  assert.equal(isIsoTimestamp(Date.now()), false);
});

test('the local day follows the given time zone, not UTC', () => {
  // 22:30 UTC ist in Berlin (Sommerzeit, UTC+2) bereits der nächste Tag.
  const lateUtc = new Date('2026-10-04T22:30:00.000Z');
  assert.equal(localDayKey(lateUtc, 'UTC'), '2026-10-04');
  assert.equal(localDayKey(lateUtc, 'Europe/Berlin'), '2026-10-05');
  // Und in Los Angeles ist es noch derselbe Tag wie in UTC.
  assert.equal(localDayKey(new Date('2026-10-05T03:00:00.000Z'), 'America/Los_Angeles'), '2026-10-04');
});
