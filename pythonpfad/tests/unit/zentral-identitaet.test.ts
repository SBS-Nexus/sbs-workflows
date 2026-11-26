import { describe, expect, it } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import {
  anmeldezeitAus,
  identitaetAusClaims,
  pruefeDiensttoken,
  pruefeHubToken,
  UngueltigesZugriffstoken,
  pruefeAbmeldeToken,
  RUECKKANAL_EREIGNIS,
  UngueltigesAbmeldeToken,
} from '@/server/auth/zentral-identitaet';

describe('Identität aus den Claims des gemeinsamen Kontos (E4.2)', () => {
  const basis = {
    sub: '312345678901234567',
    email: 'Ada.Lovelace@Example.org',
    email_verified: true,
    name: 'Ada Lovelace',
    sid: 'V1_sitzung',
    amr: ['pwd', 'mfa', 'otp'],
  };

  it('liest sub, Adresse (kleingeschrieben), Bestätigung, Name, sid und zweiten Faktor', () => {
    expect(identitaetAusClaims(basis)).toEqual({
      sub: '312345678901234567',
      email: 'ada.lovelace@example.org',
      emailBestaetigt: true,
      name: 'Ada Lovelace',
      sid: 'V1_sitzung',
      zweiFaktoren: true,
    });
  });

  it('zählt nur ein echtes true als bestätigt', () => {
    expect(identitaetAusClaims({ ...basis, email_verified: 'true' })?.emailBestaetigt).toBe(false);
    expect(identitaetAusClaims({ ...basis, email_verified: undefined })?.emailBestaetigt).toBe(
      false,
    );
  });

  it('erkennt eine Anmeldung ohne zweiten Faktor', () => {
    expect(identitaetAusClaims({ ...basis, amr: ['pwd'] })?.zweiFaktoren).toBe(false);
    expect(identitaetAusClaims({ ...basis, amr: undefined })?.zweiFaktoren).toBe(false);
  });

  it('setzt den Namen aus Vor- und Nachname oder der Adresse zusammen', () => {
    expect(
      identitaetAusClaims({ ...basis, name: undefined, given_name: 'Ada', family_name: 'Lovelace' })
        ?.name,
    ).toBe('Ada Lovelace');
    expect(identitaetAusClaims({ ...basis, name: 'ada@example.org' })?.name).toBe('ada.lovelace');
    expect(identitaetAusClaims({ ...basis, name: 'x'.repeat(120) })?.name).toHaveLength(80);
  });

  it('gibt ohne sub oder ohne brauchbare Adresse keine Identität', () => {
    expect(identitaetAusClaims({ ...basis, sub: undefined })).toBeNull();
    expect(identitaetAusClaims({ ...basis, email: undefined })).toBeNull();
    expect(identitaetAusClaims({ ...basis, email: 'keine adresse' })).toBeNull();
  });
});

describe('Rückkanal-Abmeldung: Prüfung des Logout-Tokens', () => {
  const AUSSTELLER = 'https://konto.lernpfade.test';
  const ZIELGRUPPE = 'app-client';
  const JETZT = new Date('2026-11-23T12:00:00Z');

  async function aufbau() {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
    const schluessel = createLocalJWKSet({ keys: [jwk] });
    const fremd = await generateKeyPair('RS256');

    async function token(
      inhalt: JWTPayload,
      optionen: { privat?: CryptoKey; iat?: Date } = {},
    ): Promise<string> {
      return new SignJWT(inhalt)
        .setProtectedHeader({ alg: 'RS256', kid: 'k1', typ: 'logout+jwt' })
        .setIssuedAt(optionen.iat ?? JETZT)
        .sign(optionen.privat ?? privateKey);
    }
    const gueltig: JWTPayload = {
      iss: AUSSTELLER,
      aud: ZIELGRUPPE,
      jti: 'jti-1',
      sub: '312345678901234567',
      sid: 'V1_sitzung',
      events: { [RUECKKANAL_EREIGNIS]: {} },
    };
    const pruefe = (wert: string) =>
      pruefeAbmeldeToken(wert, {
        aussteller: AUSSTELLER,
        zielgruppe: ZIELGRUPPE,
        schluessel,
        jetzt: JETZT,
      });
    return { token, gueltig, pruefe, fremd };
  }

  it('nimmt ein gültiges Token an und liefert sid und sub', async () => {
    const { token, gueltig, pruefe } = await aufbau();
    await expect(pruefe(await token(gueltig))).resolves.toEqual({
      sid: 'V1_sitzung',
      sub: '312345678901234567',
    });
  });

  it('nimmt ein Token nur mit sub an', async () => {
    const { token, gueltig, pruefe } = await aufbau();
    const { sid: _sid, ...ohneSid } = gueltig;
    await expect(pruefe(await token(ohneSid))).resolves.toEqual({
      sid: null,
      sub: '312345678901234567',
    });
  });

  it.each([
    ['fremder Aussteller', { iss: 'https://anders.example' }],
    ['fremde Zielgruppe', { aud: 'andere-app' }],
    ['fehlendes Ereignis', { events: { 'https://anderes/ereignis': {} } }],
    ['Ereignis ohne Objekt', { events: { [RUECKKANAL_EREIGNIS]: 'ja' } }],
    ['nonce vorhanden (ID-Token statt Logout-Token)', { nonce: 'n' }],
    ['ohne jti', { jti: undefined }],
    ['weder sid noch sub', { sid: undefined, sub: undefined }],
  ])('lehnt ab: %s', async (_fall, aenderung) => {
    const { token, gueltig, pruefe } = await aufbau();
    const inhalt = { ...gueltig, ...aenderung } as JWTPayload;
    for (const [k, v] of Object.entries(inhalt)) if (v === undefined) delete inhalt[k];
    await expect(pruefe(await token(inhalt))).rejects.toBeInstanceOf(UngueltigesAbmeldeToken);
  });

  it('lehnt ein zu altes Token ab', async () => {
    const { token, gueltig, pruefe } = await aufbau();
    const alt = new Date(JETZT.getTime() - 10 * 60 * 1000);
    await expect(pruefe(await token(gueltig, { iat: alt }))).rejects.toBeInstanceOf(
      UngueltigesAbmeldeToken,
    );
  });

  it('lehnt eine fremde Signatur ab', async () => {
    const { token, gueltig, pruefe, fremd } = await aufbau();
    await expect(pruefe(await token(gueltig, { privat: fremd.privateKey }))).rejects.toBeInstanceOf(
      UngueltigesAbmeldeToken,
    );
  });

  it('lehnt ein unsigniertes Token ab', async () => {
    const { gueltig, pruefe } = await aufbau();
    const kopf = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const inhalt = Buffer.from(
      JSON.stringify({ ...gueltig, iat: JETZT.getTime() / 1000 }),
    ).toString('base64url');
    await expect(pruefe(`${kopf}.${inhalt}.`)).rejects.toBeInstanceOf(UngueltigesAbmeldeToken);
  });
});

describe('Anmeldezeit aus dem gespeicherten ID-Token', () => {
  const token = (inhalt: object) =>
    ['e30', Buffer.from(JSON.stringify(inhalt)).toString('base64url'), 'sig'].join('.');

  it('liest auth_time in Sekunden', () => {
    expect(anmeldezeitAus(token({ auth_time: 1795464357 }))?.toISOString()).toBe(
      '2026-11-23T20:05:57.000Z',
    );
  });

  it('gibt ohne brauchbare Angabe null', () => {
    expect(anmeldezeitAus(null)).toBeNull();
    expect(anmeldezeitAus('kein.token')).toBeNull();
    expect(anmeldezeitAus(token({}))).toBeNull();
    expect(anmeldezeitAus(token({ auth_time: '1795464357' }))).toBeNull();
    expect(anmeldezeitAus('a.%%%.c')).toBeNull();
  });
});

describe('Zugriffstoken des Hubs für die Plattformquellen (E4.5)', () => {
  const AUSSTELLER = 'https://konto.lernpfade.test';
  const HUB = 'hub-client';
  const PROJEKT = 'projekt-lernpfade';
  const JETZT = new Date('2026-11-24T12:00:00Z');

  async function aufbau() {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
    const schluessel = createLocalJWKSet({ keys: [jwk] });
    const fremd = await generateKeyPair('RS256');
    const gueltig: JWTPayload = {
      iss: AUSSTELLER,
      aud: [HUB, PROJEKT],
      sub: '312345678901234567',
      client_id: HUB,
    };
    async function token(
      inhalt: JWTPayload,
      optionen: { privat?: CryptoKey; ablauf?: Date } = {},
    ): Promise<string> {
      return new SignJWT(inhalt)
        .setProtectedHeader({ alg: 'RS256', kid: 'k1', typ: 'JWT' })
        .setIssuedAt(JETZT)
        .setExpirationTime(optionen.ablauf ?? new Date(JETZT.getTime() + 15 * 60 * 1000))
        .sign(optionen.privat ?? privateKey);
    }
    const pruefe = (wert: string, hubClientId = HUB) =>
      pruefeHubToken(wert, { aussteller: AUSSTELLER, hubClientId, schluessel, jetzt: JETZT });
    return { token, gueltig, pruefe, fremd };
  }

  it('gibt sub zurück, wenn das Token für den Hub ausgestellt ist', async () => {
    const { token, gueltig, pruefe } = await aufbau();
    await expect(pruefe(await token(gueltig))).resolves.toBe('312345678901234567');
  });

  it.each([
    [
      'Token einer App (andere client_id und Zielgruppe)',
      { client_id: 'app', aud: ['app', PROJEKT] },
    ],
    ['Zielgruppe ohne den Hub', { aud: [PROJEKT] }],
    ['client_id fehlt', { client_id: undefined }],
    ['fremder Aussteller', { iss: 'https://anders.example' }],
    ['ohne sub', { sub: undefined }],
  ])('lehnt ab: %s', async (_fall, aenderung) => {
    const { token, gueltig, pruefe } = await aufbau();
    const inhalt = { ...gueltig, ...aenderung } as JWTPayload;
    for (const [k, v] of Object.entries(inhalt)) if (v === undefined) delete inhalt[k];
    await expect(pruefe(await token(inhalt))).rejects.toBeInstanceOf(UngueltigesZugriffstoken);
  });

  it('lehnt abgelaufene und fremd signierte Token ab', async () => {
    const { token, gueltig, pruefe, fremd } = await aufbau();
    const abgelaufen = await token(gueltig, { ablauf: new Date(JETZT.getTime() - 5 * 60 * 1000) });
    await expect(pruefe(abgelaufen)).rejects.toBeInstanceOf(UngueltigesZugriffstoken);
    await expect(pruefe(await token(gueltig, { privat: fremd.privateKey }))).rejects.toBeInstanceOf(
      UngueltigesZugriffstoken,
    );
  });

  it('nimmt nichts an, solange kein Hub eingerichtet ist', async () => {
    const { token, gueltig, pruefe } = await aufbau();
    await expect(pruefe(await token(gueltig), '')).rejects.toBeInstanceOf(UngueltigesZugriffstoken);
  });
});

describe('Diensttoken der Plattform für die Team-Quelle (E5.2)', () => {
  const AUSSTELLER = 'https://konto.lernpfade.test';
  const PLATTFORM = '401200000000000001';
  const JETZT = new Date('2026-11-26T12:00:00Z');

  async function aufbau() {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
    const schluessel = createLocalJWKSet({ keys: [jwk] });
    const fremd = await generateKeyPair('RS256');
    const gueltig: JWTPayload = { iss: AUSSTELLER, aud: ['projekt-lernpfade'], sub: PLATTFORM };
    async function token(inhalt: JWTPayload, optionen: { privat?: CryptoKey; ablauf?: Date } = {}) {
      return new SignJWT(inhalt)
        .setProtectedHeader({ alg: 'RS256', kid: 'k1', typ: 'JWT' })
        .setIssuedAt(JETZT)
        .setExpirationTime(optionen.ablauf ?? new Date(JETZT.getTime() + 15 * 60 * 1000))
        .sign(optionen.privat ?? privateKey);
    }
    const pruefe = (wert: string, plattformSub = PLATTFORM) =>
      pruefeDiensttoken(wert, { aussteller: AUSSTELLER, plattformSub, schluessel, jetzt: JETZT });
    return { token, gueltig, pruefe, fremd };
  }

  it('nimmt das Token des Maschinenkontos an', async () => {
    const { token, gueltig, pruefe } = await aufbau();
    await expect(pruefe(await token(gueltig))).resolves.toBeUndefined();
  });

  it.each([
    ['Token einer Person (andere sub)', { sub: '312345678901234567' }],
    ['Token des Hubs für eine Person', { sub: '312345678901234567', client_id: 'hub-client' }],
    ['fremder Aussteller', { iss: 'https://anders.example' }],
    ['ohne sub', { sub: undefined }],
  ])('lehnt ab: %s', async (_fall, aenderung) => {
    const { token, gueltig, pruefe } = await aufbau();
    const inhalt = { ...gueltig, ...aenderung } as JWTPayload;
    for (const [k, v] of Object.entries(inhalt)) if (v === undefined) delete inhalt[k];
    await expect(pruefe(await token(inhalt))).rejects.toBeInstanceOf(UngueltigesZugriffstoken);
  });

  it('lehnt abgelaufene und fremd signierte Token ab und nimmt ohne Einrichtung nichts an', async () => {
    const { token, gueltig, pruefe, fremd } = await aufbau();
    const abgelaufen = await token(gueltig, { ablauf: new Date(JETZT.getTime() - 5 * 60 * 1000) });
    await expect(pruefe(abgelaufen)).rejects.toBeInstanceOf(UngueltigesZugriffstoken);
    await expect(pruefe(await token(gueltig, { privat: fremd.privateKey }))).rejects.toBeInstanceOf(
      UngueltigesZugriffstoken,
    );
    await expect(pruefe(await token(gueltig), '')).rejects.toBeInstanceOf(UngueltigesZugriffstoken);
  });
});
