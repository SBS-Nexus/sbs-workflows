import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.ts';
import type { Person } from '../../domain/organisation/regeln.ts';
import { kontext, ladeEin, legeAn, loeseEin, OrganisationsFehler, protokoll, type OrgKontext } from './dienst.ts';
import {
  eigeneLernplaene,
  entferneEintrag,
  fuegeEintragHinzu,
  legePlanAn,
  loeschePlan,
  planDesTeams,
  verschiebeEintrag,
} from './lernplan.ts';
import { archiviereTeam, legeTeamAn, team } from './teams.ts';

/** E5.3 gegen echtes Postgres; wie die übrigen Integrationstests. */
const adresse = process.env.TEST_DATABASE_URL;
if (!adresse) throw new Error('TEST_DATABASE_URL fehlt (Postgres mit angewandten Migrationen).');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: adresse }) });

const JETZT = new Date('2026-11-26T12:00:00Z');
const person = (n: number, extra: Partial<Person> = {}): Person => ({
  sub: `sub-${n}`,
  name: `Person ${n}`,
  email: `person${n}@firma.de`,
  emailBestaetigt: true,
  zweiFaktoren: false,
  ...extra,
});
const ADA = person(1, { name: 'Ada Admin', zweiFaktoren: true });

async function aufbau(): Promise<{ k: OrgKontext; teamId: string }> {
  const a = await legeAn(db, ADA, 'Muster GmbH');
  const k = (await kontext(db, ADA.sub, (a as { kuerzel: string }).kuerzel))!;
  const t = await legeTeamAn(db, k, ADA, 'Vertrieb');
  const teamId = (await team(db, k, ADA, (t as { kuerzel: string }).kuerzel))!.id;
  return { k, teamId };
}

async function beitreten(k: OrgKontext, p: Person, teamId?: string, rolle = 'LEARNER'): Promise<void> {
  const e = await ladeEin(db, k, ADA, { rolle, maxNutzungen: 1, team: teamId });
  assert.equal((await loeseEin(db, p, (e as { token: string }).token)).ok, true);
}

const eintrag = (pfad: string, ziel: string, faellig = '') => ({ pfad, ziel, alle: null, faellig });

before(async () => db.$connect());
beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE organizations CASCADE');
});
after(async () => db.$disconnect());

test('ein Plan je Team; Lernende dürfen keinen anlegen', async () => {
  const { k, teamId } = await aufbau();
  await beitreten(k, person(2), teamId);
  assert.deepEqual(await legePlanAn(db, k, ADA, teamId, 'Q1 Einstieg'), { ok: true });
  assert.deepEqual(await legePlanAn(db, k, ADA, teamId, 'Noch einer'), {
    ok: false,
    meldung: 'Dieses Team hat schon einen Lernplan.',
  });
  const lernend = (await kontext(db, 'sub-2', k.kuerzel))!;
  await assert.rejects(planDesTeams(db, lernend, person(2), teamId), (f) => f instanceof OrganisationsFehler && f.code === 'verboten');
  assert.equal((await planDesTeams(db, k, ADA, teamId))?.name, 'Q1 Einstieg');
});

test('Einträge: prüfen, anhängen, verschieben, entfernen; Positionen bleiben lückenlos', async () => {
  const { k, teamId } = await aufbau();
  await legePlanAn(db, k, ADA, teamId, 'Q1');
  const planId = (await planDesTeams(db, k, ADA, teamId))!.id;

  assert.equal((await fuegeEintragHinzu(db, k, ADA, planId, eintrag('rust', '3'), JETZT)).ok, false);
  assert.equal((await fuegeEintragHinzu(db, k, ADA, planId, eintrag('ai', '0'), JETZT)).ok, false);
  assert.deepEqual(await fuegeEintragHinzu(db, k, ADA, planId, eintrag('ai', '5', '2027-01-15'), JETZT), { ok: true });
  assert.deepEqual(await fuegeEintragHinzu(db, k, ADA, planId, eintrag('python', '8'), JETZT), { ok: true });
  assert.deepEqual(
    await fuegeEintragHinzu(db, k, ADA, planId, { pfad: 'sql', ziel: '', alle: 'on', faellig: '2027-03-31' }, JETZT),
    { ok: true },
  );

  let plan = (await planDesTeams(db, k, ADA, teamId))!;
  assert.deepEqual(
    plan.eintraege.map((e) => [e.position, e.pfad, e.ziel, e.faellig]),
    [
      [0, 'ai', 5, '2027-01-15'],
      [1, 'python', 8, null],
      [2, 'sql', null, '2027-03-31'],
    ],
  );

  await verschiebeEintrag(db, k, ADA, plan.eintraege[2]!.id, 'hoch');
  await verschiebeEintrag(db, k, ADA, plan.eintraege[0]!.id, 'hoch'); // ganz oben: bleibt
  plan = (await planDesTeams(db, k, ADA, teamId))!;
  assert.deepEqual(plan.eintraege.map((e) => [e.position, e.pfad]), [
    [0, 'ai'],
    [1, 'sql'],
    [2, 'python'],
  ]);

  assert.deepEqual(await entferneEintrag(db, k, ADA, plan.eintraege[1]!.id), { ok: true });
  assert.deepEqual((await planDesTeams(db, k, ADA, teamId))!.eintraege.map((e) => e.pfad), ['ai', 'python']);
  assert.match((await protokoll(db, k, ADA)).map((e) => e.satz).join('\n'), /AIPfad \(5 Lektionen, fällig 2027-01-15\) hinzugefügt/);
});

test('fremde Organisationen sehen und ändern den Plan nicht', async () => {
  const { k, teamId } = await aufbau();
  await legePlanAn(db, k, ADA, teamId, 'Q1');
  const planId = (await planDesTeams(db, k, ADA, teamId))!.id;
  const fremd = person(9, { zweiFaktoren: true });
  const f = await legeAn(db, fremd, 'Andere AG');
  const fk = (await kontext(db, fremd.sub, (f as { kuerzel: string }).kuerzel))!;
  await assert.rejects(planDesTeams(db, fk, fremd, teamId), (e) => e instanceof OrganisationsFehler && e.code === 'nicht-gefunden');
  await assert.rejects(fuegeEintragHinzu(db, fk, fremd, planId, eintrag('ai', '1'), JETZT), (e) => e instanceof OrganisationsFehler && e.code === 'nicht-gefunden');
  await assert.rejects(loeschePlan(db, fk, fremd, planId), (e) => e instanceof OrganisationsFehler && e.code === 'nicht-gefunden');
});

test('Lernende sehen die Pläne ihrer offenen Teams, sonst keine', async () => {
  const { k, teamId } = await aufbau();
  await beitreten(k, person(2), teamId);
  await beitreten(k, person(3));
  await legePlanAn(db, k, ADA, teamId, 'Q1');
  const planId = (await planDesTeams(db, k, ADA, teamId))!.id;
  await fuegeEintragHinzu(db, k, ADA, planId, eintrag('ai', '3'), JETZT);

  const bea = person(2);
  const beaK = (await kontext(db, bea.sub, k.kuerzel))!;
  const eigene = await eigeneLernplaene(db, beaK, bea);
  assert.deepEqual(eigene.map((e) => [e.team, e.plan.name, e.plan.eintraege.length]), [['Vertrieb', 'Q1', 1]]);

  const cem = (await kontext(db, 'sub-3', k.kuerzel))!;
  assert.deepEqual(await eigeneLernplaene(db, cem, person(3)), []);

  await archiviereTeam(db, k, ADA, teamId, true);
  assert.deepEqual(await eigeneLernplaene(db, beaK, bea), []);
});

test('Plan löschen löscht seine Einträge; die Datenbank weist unzulässige Pfade ab', async () => {
  const { k, teamId } = await aufbau();
  await legePlanAn(db, k, ADA, teamId, 'Q1');
  const planId = (await planDesTeams(db, k, ADA, teamId))!.id;
  await fuegeEintragHinzu(db, k, ADA, planId, eintrag('ai', '3'), JETZT);
  await assert.rejects(
    db.learningPlanItem.create({ data: { planId, position: 5, path: 'rust' } }),
    /learning_plan_items_path_check/,
  );
  assert.deepEqual(await loeschePlan(db, k, ADA, planId), { ok: true });
  assert.equal(await db.learningPlanItem.count(), 0);
  assert.equal(await planDesTeams(db, k, ADA, teamId), null);
});
