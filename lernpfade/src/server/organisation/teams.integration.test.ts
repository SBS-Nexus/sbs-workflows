import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.ts';
import type { Person } from '../../domain/organisation/regeln.ts';
import {
  einladungVorschau,
  entferne,
  kontext,
  ladeEin,
  legeAn,
  loeseEin,
  OrganisationsFehler,
  protokoll,
  type OrgKontext,
} from './dienst.ts';
import {
  archiviereTeam,
  eigeneTeams,
  entferneAusTeam,
  fuegeHinzu,
  legeTeamAn,
  setzeFreigabe,
  team,
  teamsVon,
} from './teams.ts';

/** E5.2 gegen echtes Postgres; wie dienst.integration.test.ts. */
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

async function organisation(name = 'Muster GmbH', admin = ADA): Promise<OrgKontext> {
  const a = await legeAn(db, admin, name);
  assert.equal(a.ok, true);
  return (await kontext(db, admin.sub, (a as { kuerzel: string }).kuerzel))!;
}

async function beitreten(k: OrgKontext, p: Person, rolle = 'LEARNER', teamId?: string): Promise<void> {
  const e = await ladeEin(db, k, ADA, { rolle, maxNutzungen: 1, team: teamId });
  assert.equal(e.ok, true, JSON.stringify(e));
  assert.equal((await loeseEin(db, p, (e as { token: string }).token)).ok, true);
}

async function neuesTeam(k: OrgKontext, name = 'Backend'): Promise<{ id: string; kuerzel: string }> {
  const t = await legeTeamAn(db, k, ADA, name);
  assert.equal(t.ok, true);
  const kuerzel = (t as { kuerzel: string }).kuerzel;
  return { id: (await team(db, k, ADA, kuerzel))!.id, kuerzel };
}

const mitgliedId = async (sub: string) => (await db.membership.findFirstOrThrow({ where: { sub } })).id;

before(async () => db.$connect());
beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE organizations CASCADE');
});
after(async () => db.$disconnect());

test('Lehrkraft legt Teams an; Lernende dürfen es nicht; Kürzel je Organisation', async () => {
  const k = await organisation();
  await beitreten(k, person(2, { zweiFaktoren: true }), 'TEACHER');
  await beitreten(k, person(3));
  const lehrkraft = (await kontext(db, 'sub-2', k.kuerzel))!;
  const lernend = (await kontext(db, 'sub-3', k.kuerzel))!;

  assert.equal((await legeTeamAn(db, lehrkraft, person(2, { zweiFaktoren: true }), 'Backend Team')).ok, true);
  await assert.rejects(legeTeamAn(db, lernend, person(3), 'Eigenes Team'), (f) => f instanceof OrganisationsFehler && f.code === 'verboten');
  await assert.rejects(legeTeamAn(db, lehrkraft, person(2), 'Ohne Faktor'), (f) => f instanceof OrganisationsFehler && f.code === 'zweiter-faktor');

  const zweite = await organisation('Andere AG', person(9, { zweiFaktoren: true }));
  assert.equal((await legeTeamAn(db, zweite, person(9, { zweiFaktoren: true }), 'Backend Team')).ok, true);
  assert.deepEqual((await teamsVon(db, k, ADA)).map((t) => t.kuerzel), ['backend-team']);
});

test('aufnehmen nur aus der eigenen Organisation, nicht in archivierte Teams; doppelt ist harmlos', async () => {
  const k = await organisation();
  const fremd = await organisation('Andere AG', person(9, { zweiFaktoren: true }));
  await beitreten(k, person(2));
  await beitreten(fremd, person(8), 'LEARNER');
  const t = await neuesTeam(k);

  assert.deepEqual(await fuegeHinzu(db, k, ADA, t.id, await mitgliedId('sub-2')), { ok: true });
  assert.deepEqual(await fuegeHinzu(db, k, ADA, t.id, await mitgliedId('sub-2')), { ok: true });
  assert.equal((await fuegeHinzu(db, k, ADA, t.id, await mitgliedId('sub-8'))).ok, false);
  await assert.rejects(fuegeHinzu(db, fremd, person(9, { zweiFaktoren: true }), t.id, await mitgliedId('sub-8')), (f) => f instanceof OrganisationsFehler && f.code === 'nicht-gefunden');

  await archiviereTeam(db, k, ADA, t.id, true);
  assert.equal((await fuegeHinzu(db, k, ADA, t.id, await mitgliedId(ADA.sub))).ok, false);
  const detail = (await team(db, k, ADA, t.kuerzel))!;
  assert.equal(detail.archiviert, true);
  assert.deepEqual(detail.personen.map((p) => p.name), ['Person 2']);
  assert.deepEqual(detail.kandidaten.map((p) => p.name), ['Ada Admin']);
});

test('Einladung ins Team: Beitritt landet im Team; archiviert nur in der Organisation', async () => {
  const k = await organisation();
  const t = await neuesTeam(k);
  const e = await ladeEin(db, k, ADA, { rolle: 'LEARNER', maxNutzungen: 3, team: t.id });
  const token = (e as { token: string }).token;
  assert.deepEqual(await einladungVorschau(db, token), {
    organisation: 'Muster GmbH',
    rolle: 'LEARNER',
    gebunden: false,
    team: 'Backend',
  });
  await loeseEin(db, person(2), token);
  assert.deepEqual((await team(db, k, ADA, t.kuerzel))!.personen.map((p) => p.name), ['Person 2']);

  await archiviereTeam(db, k, ADA, t.id, true);
  assert.equal((await einladungVorschau(db, token))?.team, null);
  await loeseEin(db, person(3), token);
  assert.equal((await team(db, k, ADA, t.kuerzel))!.personen.length, 1);
  assert.equal((await kontext(db, 'sub-3', k.kuerzel))?.rolle, 'LEARNER');

  assert.equal((await ladeEin(db, k, ADA, { rolle: 'LEARNER', team: t.id })).ok, false);
  assert.equal((await ladeEin(db, k, ADA, { rolle: 'LEARNER', team: 'gibt-es-nicht' })).ok, false);
});

test('Einwilligung: standardmäßig aus, nur die Person selbst, mit Zeitpunkt, nicht im Protokoll', async () => {
  const k = await organisation();
  const t = await neuesTeam(k);
  await beitreten(k, person(2), 'LEARNER', t.id);
  await beitreten(k, person(3), 'LEARNER', t.id);
  const bea = person(2);
  const beaK = (await kontext(db, bea.sub, k.kuerzel))!;

  const [eigen] = await eigeneTeams(db, beaK, bea);
  assert.equal(eigen?.freigabe, false);
  assert.equal(eigen?.seit, null);

  // Eine andere Person (auch Admin) kann sie nicht setzen.
  assert.equal((await setzeFreigabe(db, ADA, eigen!.teamMitgliedId, true)).ok, false);
  assert.equal((await eigeneTeams(db, beaK, bea))[0]?.freigabe, false);

  const jetzt = new Date('2026-11-26T09:00:00Z');
  assert.deepEqual(await setzeFreigabe(db, bea, eigen!.teamMitgliedId, true, jetzt), { ok: true });
  const danach = (await eigeneTeams(db, beaK, bea))[0]!;
  assert.equal(danach.freigabe, true);
  assert.equal(danach.seit?.toISOString(), jetzt.toISOString());
  assert.deepEqual((await teamsVon(db, k, ADA)).map((x) => [x.mitglieder, x.freigaben]), [[2, 1]]);

  assert.deepEqual(await setzeFreigabe(db, bea, eigen!.teamMitgliedId, false), { ok: true });
  assert.equal((await eigeneTeams(db, beaK, bea))[0]?.freigabe, false);

  const saetze = (await protokoll(db, k, ADA)).map((e) => e.satz).join('\n');
  assert.match(saetze, /hat das Team „Backend“ angelegt/);
  assert.doesNotMatch(saetze, /Einwilligung|Freigabe|namentlich/);
});

test('aus dem Team nehmen; wer die Organisation verlässt, verlässt alle Teams', async () => {
  const k = await organisation();
  const t = await neuesTeam(k);
  await beitreten(k, person(2), 'LEARNER', t.id);
  await beitreten(k, person(3), 'LEARNER', t.id);
  const detail = (await team(db, k, ADA, t.kuerzel))!;
  const p2 = detail.personen.find((p) => p.name === 'Person 2')!;
  assert.deepEqual(await entferneAusTeam(db, k, ADA, p2.teamMitgliedId), { ok: true });
  assert.equal((await entferneAusTeam(db, k, ADA, p2.teamMitgliedId)).ok, false);

  await entferne(db, k, ADA, await mitgliedId('sub-3'));
  assert.equal((await team(db, k, ADA, t.kuerzel))!.personen.length, 0);
  assert.equal(await db.teamMembership.count(), 0);
});
