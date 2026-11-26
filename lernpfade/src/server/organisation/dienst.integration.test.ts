import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.ts';
import type { Person } from '../../domain/organisation/regeln.ts';
import {
  aendereRolle,
  einladungVorschau,
  entferne,
  hashToken,
  kontext,
  ladeEin,
  legeAn,
  loeseEin,
  organisationenVon,
  OrganisationsFehler,
  protokoll,
  uebersicht,
  verlasse,
  widerrufe,
  type OrgKontext,
} from './dienst.ts';

/**
 * E5.1 gegen echtes Postgres. Braucht `TEST_DATABASE_URL` mit angewandten
 * Migrationen (`npx prisma migrate deploy`); leert die Tabellen vor jedem Test.
 */
const adresse = process.env.TEST_DATABASE_URL;
if (!adresse) throw new Error('TEST_DATABASE_URL fehlt (Postgres mit angewandten Migrationen).');

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: adresse }) });

const person = (n: number, extra: Partial<Person> = {}): Person => ({
  sub: `sub-${n}`,
  name: `Person ${n}`,
  email: `person${n}@firma.de`,
  emailBestaetigt: true,
  zweiFaktoren: false,
  ...extra,
});
const ADA = person(1, { name: 'Ada Admin', zweiFaktoren: true });

async function neueOrganisation(name = 'Muster GmbH'): Promise<OrgKontext> {
  const angelegt = await legeAn(db, ADA, name);
  assert.equal(angelegt.ok, true);
  const k = await kontext(db, ADA.sub, (angelegt as { kuerzel: string }).kuerzel);
  assert.ok(k);
  return k;
}

async function einladung(k: OrgKontext, rolle = 'LEARNER', maxNutzungen = 5, email?: string): Promise<string> {
  const e = await ladeEin(db, k, ADA, { rolle, maxNutzungen, email });
  assert.equal(e.ok, true, JSON.stringify(e));
  return (e as { token: string }).token;
}

before(async () => {
  await db.$connect();
});
beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE organizations CASCADE');
});
after(async () => {
  await db.$disconnect();
});

test('anlegen nur mit zweitem Faktor; wer anlegt, ist Admin; Testphase mit 10 Plätzen', async () => {
  await assert.rejects(legeAn(db, person(2), 'Ohne Faktor AG'), (f) => f instanceof OrganisationsFehler && f.code === 'zweiter-faktor');
  assert.deepEqual(await legeAn(db, ADA, 'x'), { ok: false, meldung: 'Der Name braucht mindestens 2 Zeichen.' });

  const k = await neueOrganisation('Müller & Söhne GmbH');
  assert.equal(k.kuerzel, 'muller-sohne-gmbh');
  assert.equal(k.rolle, 'ADMIN');
  const zweite = await legeAn(db, ADA, 'Müller & Söhne GmbH');
  assert.equal(zweite.ok && zweite.kuerzel !== k.kuerzel, true);
  assert.deepEqual(
    (await organisationenVon(db, ADA.sub)).map((o) => o.rolle),
    ['ADMIN', 'ADMIN'],
  );
  const u = await uebersicht(db, k, ADA);
  assert.deepEqual(u.plaetze, { belegt: 0, gesamt: 10, frei: 10 });
  assert.match((await protokoll(db, k, ADA))[0]!.satz, /hat die Organisation „Müller & Söhne GmbH“ angelegt/);
});

test('Einladung: nur der Hash liegt in der Datenbank; Vorschau und Beitritt', async () => {
  const k = await neueOrganisation();
  const token = await einladung(k, 'LEARNER', 2);
  const gespeichert = await db.invitation.findFirstOrThrow({ select: { tokenHash: true } });
  assert.equal(gespeichert.tokenHash, hashToken(token));
  assert.notEqual(gespeichert.tokenHash, token);

  assert.deepEqual(await einladungVorschau(db, token), {
    organisation: 'Muster GmbH',
    rolle: 'LEARNER',
    gebunden: false,
    team: null,
  });
  assert.equal(await einladungVorschau(db, 'falsch'), null);

  assert.deepEqual(await loeseEin(db, person(2), token), { ok: true, kuerzel: k.kuerzel });
  assert.deepEqual(await loeseEin(db, person(2), token), { ok: false, grund: 'schon-mitglied' });
  assert.deepEqual(await loeseEin(db, person(3), token), { ok: true, kuerzel: k.kuerzel });
  assert.deepEqual(await loeseEin(db, person(4), token), { ok: false, grund: 'aufgebraucht' });
  assert.deepEqual(await loeseEin(db, person(4), 'gibt-es-nicht'), { ok: false, grund: 'ungueltig' });
  assert.deepEqual((await uebersicht(db, k, ADA)).plaetze, { belegt: 2, gesamt: 10, frei: 8 });
});

test('abgelaufen und widerrufen', async () => {
  const k = await neueOrganisation();
  const token = await einladung(k);
  const in15Tagen = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  assert.deepEqual(await loeseEin(db, person(2), token, in15Tagen), { ok: false, grund: 'abgelaufen' });
  const { id } = await db.invitation.findFirstOrThrow({ select: { id: true } });
  await widerrufe(db, k, ADA, id);
  assert.deepEqual(await loeseEin(db, person(2), token), { ok: false, grund: 'widerrufen' });
  assert.equal((await uebersicht(db, k, ADA)).einladungen.length, 0);
});

test('Plätze: volle Organisation nimmt keine Lernenden, aber Lehrkräfte', async () => {
  const k = await neueOrganisation();
  await db.organization.update({ where: { id: k.organisationId }, data: { seats: 1 } });
  const lernende = await einladung(k, 'LEARNER', 5);
  const lehrkraft = await einladung(k, 'TEACHER', 1);
  assert.equal((await loeseEin(db, person(2), lernende)).ok, true);
  assert.deepEqual(await loeseEin(db, person(3), lernende), { ok: false, grund: 'voll' });
  assert.equal((await loeseEin(db, person(4), lehrkraft)).ok, true);
});

test('gleichzeitige Beitritte überbuchen die Plätze nicht (Sperre auf der Organisation)', async () => {
  const k = await neueOrganisation();
  await db.organization.update({ where: { id: k.organisationId }, data: { seats: 2 } });
  const token = await einladung(k, 'LEARNER', 20);
  const ergebnisse = await Promise.all(Array.from({ length: 8 }, (_, i) => loeseEin(db, person(10 + i), token)));
  assert.equal(ergebnisse.filter((e) => e.ok).length, 2);
  assert.equal(ergebnisse.filter((e) => !e.ok && e.grund === 'voll').length, 6);
  assert.equal(await db.membership.count({ where: { organizationId: k.organisationId, role: 'LEARNER' } }), 2);
  assert.equal((await db.invitation.findFirstOrThrow({ select: { uses: true } })).uses, 2);
});

test('an eine Adresse gebunden: nur bestätigt und gleich, genau einmal', async () => {
  const k = await neueOrganisation();
  const token = await einladung(k, 'LEARNER', 99, ' Bea@Firma.de ');
  assert.equal((await db.invitation.findFirstOrThrow({ select: { maxUses: true } })).maxUses, 1);
  assert.deepEqual(await loeseEin(db, person(2, { email: 'eve@firma.de' }), token), { ok: false, grund: 'adresse-falsch' });
  assert.deepEqual(await loeseEin(db, person(2, { email: 'bea@firma.de', emailBestaetigt: false }), token), {
    ok: false,
    grund: 'adresse-unbestaetigt',
  });
  assert.equal((await loeseEin(db, person(2, { email: 'bea@firma.de' }), token)).ok, true);
});

test('Rechte: Lehrkraft lädt nur Lernende ein; Verwaltung nur mit zweitem Faktor; Lernende sehen nichts', async () => {
  const k = await neueOrganisation();
  await loeseEin(db, person(2, { zweiFaktoren: true }), await einladung(k, 'TEACHER', 1));
  await loeseEin(db, person(3), await einladung(k, 'LEARNER', 1));
  const lehrkraft = (await kontext(db, 'sub-2', k.kuerzel))!;
  const lernend = (await kontext(db, 'sub-3', k.kuerzel))!;
  const mitFaktor = person(2, { zweiFaktoren: true });

  assert.equal((await ladeEin(db, lehrkraft, mitFaktor, { rolle: 'LEARNER', maxNutzungen: 3 })).ok, true);
  await assert.rejects(ladeEin(db, lehrkraft, mitFaktor, { rolle: 'TEACHER' }), (f) => f instanceof OrganisationsFehler && f.code === 'verboten');
  await assert.rejects(ladeEin(db, lehrkraft, person(2), { rolle: 'LEARNER' }), (f) => f instanceof OrganisationsFehler && f.code === 'zweiter-faktor');
  await assert.rejects(protokoll(db, lehrkraft, mitFaktor), (f) => f instanceof OrganisationsFehler && f.code === 'verboten');
  await assert.rejects(uebersicht(db, lernend, person(3)), (f) => f instanceof OrganisationsFehler && f.code === 'verboten');
  await assert.rejects(uebersicht(db, k, { ...ADA, zweiFaktoren: false }), (f) => f instanceof OrganisationsFehler && f.code === 'zweiter-faktor');
});

test('immer mindestens ein Admin; Rollenwechsel und Austritt stehen im Protokoll', async () => {
  const k = await neueOrganisation();
  const ich = (await db.membership.findFirstOrThrow({ where: { sub: ADA.sub } })).id;
  assert.deepEqual(await aendereRolle(db, k, ADA, ich, 'TEACHER'), {
    ok: false,
    meldung: 'Eine Organisation braucht immer mindestens einen Admin.',
  });
  assert.equal((await entferne(db, k, ADA, ich)).ok, false);
  assert.equal((await verlasse(db, ADA, k.kuerzel)).ok, false);

  await loeseEin(db, person(2), await einladung(k, 'LEARNER', 1));
  const bea = (await db.membership.findFirstOrThrow({ where: { sub: 'sub-2' } })).id;
  assert.deepEqual(await aendereRolle(db, k, ADA, bea, 'ADMIN'), { ok: true });
  assert.deepEqual(await aendereRolle(db, k, ADA, ich, 'TEACHER'), { ok: true });
  assert.equal((await kontext(db, ADA.sub, k.kuerzel))?.rolle, 'TEACHER');

  const bea2 = { ...person(2), zweiFaktoren: true };
  const beaKontext = (await kontext(db, 'sub-2', k.kuerzel))!;
  assert.deepEqual(await entferne(db, beaKontext, bea2, ich), { ok: true });
  assert.equal(await kontext(db, ADA.sub, k.kuerzel), null);

  const saetze = (await protokoll(db, beaKontext, bea2)).map((e) => e.satz);
  assert.ok(saetze.some((s) => s.includes('von Lernend zu Admin')));
  assert.ok(saetze.some((s) => s.includes('aus der Organisation entfernt')));
});

test('Lernende können austreten; ihr Platz wird frei', async () => {
  const k = await neueOrganisation();
  await db.organization.update({ where: { id: k.organisationId }, data: { seats: 1 } });
  const token = await einladung(k, 'LEARNER', 2);
  await loeseEin(db, person(2), token);
  assert.deepEqual(await loeseEin(db, person(3), token), { ok: false, grund: 'voll' });
  assert.deepEqual(await verlasse(db, person(2), k.kuerzel), { ok: true });
  assert.equal((await loeseEin(db, person(3), token)).ok, true);
});
