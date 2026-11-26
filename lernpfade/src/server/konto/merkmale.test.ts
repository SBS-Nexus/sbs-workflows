import assert from 'node:assert/strict';
import test from 'node:test';
import { merkmaleAus } from './oidc.ts';

test('zweiter Faktor nur mit `mfa` in `amr`, wie im Anmeldevertrag der Apps', () => {
  assert.equal(merkmaleAus({ sub: 's', amr: ['pwd', 'mfa', 'otp'] }).zweiFaktoren, true);
  assert.equal(merkmaleAus({ sub: 's', amr: ['pwd'] }).zweiFaktoren, false);
  assert.equal(merkmaleAus({ sub: 's', amr: 'mfa' }).zweiFaktoren, false);
  assert.equal(merkmaleAus({ sub: 's' }).zweiFaktoren, false);
});

test('Adresse klein geschrieben; bestätigt nur bei `email_verified: true`', () => {
  const m = merkmaleAus({ sub: 's', email: ' Ada@Example.ORG ', email_verified: true, name: 'Ada L.' });
  assert.deepEqual(m, {
    sub: 's',
    name: 'Ada L.',
    email: 'ada@example.org',
    emailBestaetigt: true,
    zweiFaktoren: false,
  });
  assert.equal(merkmaleAus({ sub: 's', email: 'a@b.de', email_verified: 'true' }).emailBestaetigt, false);
  assert.equal(merkmaleAus({ sub: 's', email: 'keine-adresse' }).email, null);
});
