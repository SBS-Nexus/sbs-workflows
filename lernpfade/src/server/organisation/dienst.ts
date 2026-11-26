import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/client.ts';
import {
  brauchtZweitenFaktor,
  darf,
  darfEinladenAls,
  EINLADUNG_GUELTIG_TAGE,
  EINLADUNG_MAX_NUTZUNGEN,
  kuerzelAus,
  platzstand,
  pruefeName,
  ROLLEN,
  ROLLEN_NAME,
  rollenwechselErlaubt,
  TESTPHASE_PLAETZE,
  urteileUeberEinloesung,
  type EinloesungsUrteil,
  type Person,
  type Platzstand,
  type Recht,
  type Rolle,
} from '../../domain/organisation/regeln.ts';

/**
 * E5.1 — Organisationen der Plattform (docs/E5-PLAN.md).
 *
 * Jede Funktion bekommt die Datenbank und die handelnde Person. Rechte prüft
 * der Dienst selbst; die Seiten zeigen nur an. Was Plätze oder den letzten
 * Admin betrifft, läuft in einer Transaktion mit Sperre auf der
 * Organisation, damit gleichzeitige Beitritte die Plätze nicht überbuchen.
 */

export type Db = PrismaClient;
export type Tx = Parameters<Parameters<Db['$transaction']>[0]>[0];

export type FehlerCode = 'nicht-gefunden' | 'verboten' | 'zweiter-faktor' | 'ungueltig' | 'letzter-admin' | 'voll';

export class OrganisationsFehler extends Error {
  readonly code: FehlerCode;
  constructor(code: FehlerCode, meldung: string) {
    super(meldung);
    this.name = 'OrganisationsFehler';
    this.code = code;
  }
}

export type OrgKontext = {
  organisationId: string;
  name: string;
  kuerzel: string;
  rolle: Rolle;
  gesperrt: boolean;
};

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function neuerToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function protokolliere(
  db: Tx | Db,
  eintrag: {
    organisationId: string;
    person: Person;
    aktion: string;
    zielTyp: string;
    zielId?: string | null;
    satz: string;
  },
): Promise<void> {
  await db.auditEntry.create({
    data: {
      organizationId: eintrag.organisationId,
      actorSub: eintrag.person.sub,
      actorName: eintrag.person.name,
      action: eintrag.aktion,
      targetType: eintrag.zielTyp,
      targetId: eintrag.zielId ?? null,
      summary: eintrag.satz,
    },
  });
}

/** Sperrt die Organisation bis zum Ende der Transaktion (Plätze, letzter Admin). */
export async function sperre(tx: Tx, organisationId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${organisationId} FOR UPDATE`;
}

async function belegtePlaetze(db: Tx | Db, organisationId: string): Promise<number> {
  return db.membership.count({ where: { organizationId: organisationId, role: 'LEARNER' } });
}

/** Wirft, wenn die Person das Recht nicht hat oder ihr der zweite Faktor fehlt. */
export function verlange(kontext: OrgKontext, person: Person, recht: Recht): void {
  if (!darf(kontext.rolle, recht)) {
    throw new OrganisationsFehler('verboten', 'Für diesen Schritt fehlt die Berechtigung in dieser Organisation.');
  }
  if (brauchtZweitenFaktor(kontext.rolle) && !person.zweiFaktoren) {
    throw new OrganisationsFehler('zweiter-faktor', 'Für Verwaltungsrechte ist ein zweiter Faktor Pflicht.');
  }
}

export async function kontext(db: Db, sub: string, kuerzel: string): Promise<OrgKontext | null> {
  const mitglied = await db.membership.findFirst({
    where: { sub, organization: { slug: kuerzel } },
    select: { role: true, organization: { select: { id: true, name: true, slug: true, status: true } } },
  });
  if (!mitglied) return null;
  return {
    organisationId: mitglied.organization.id,
    name: mitglied.organization.name,
    kuerzel: mitglied.organization.slug,
    rolle: mitglied.role,
    gesperrt: mitglied.organization.status === 'SUSPENDED',
  };
}

export async function organisationenVon(
  db: Db,
  sub: string,
): Promise<Array<{ kuerzel: string; name: string; rolle: Rolle }>> {
  const liste = await db.membership.findMany({
    where: { sub },
    select: { role: true, organization: { select: { slug: true, name: true } } },
    orderBy: { joinedAt: 'asc' },
  });
  return liste.map((m) => ({ kuerzel: m.organization.slug, name: m.organization.name, rolle: m.role }));
}

/** Hält den Anzeigenamen aktuell, ohne das Prüfprotokoll zu berühren. */
export async function aktualisiereAnzeigename(db: Db, person: Person): Promise<void> {
  await db.membership.updateMany({
    where: { sub: person.sub, NOT: { displayName: person.name } },
    data: { displayName: person.name },
  });
}

export type Ergebnis<T> = ({ ok: true } & T) | { ok: false; meldung: string };

/**
 * Organisation selbst anlegen (Testphase, Entscheidung 3 in docs/E5-PLAN.md).
 * Wer anlegt, wird Admin und braucht deshalb den zweiten Faktor.
 */
export async function legeAn(db: Db, person: Person, eingabe: unknown): Promise<Ergebnis<{ kuerzel: string }>> {
  if (!person.zweiFaktoren) {
    throw new OrganisationsFehler('zweiter-faktor', 'Für Verwaltungsrechte ist ein zweiter Faktor Pflicht.');
  }
  const geprueft = pruefeName(eingabe);
  if (!geprueft.ok) return { ok: false, meldung: geprueft.grund };

  const basis = kuerzelAus(geprueft.name);
  for (let versuch = 0; versuch < 20; versuch += 1) {
    const kuerzel = versuch === 0 ? basis : `${basis.slice(0, 34)}-${randomBytes(2).toString('hex')}`;
    try {
      await db.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: { slug: kuerzel, name: geprueft.name, seats: TESTPHASE_PLAETZE, createdBySub: person.sub },
        });
        await tx.membership.create({
          data: { organizationId: org.id, sub: person.sub, displayName: person.name, role: 'ADMIN' },
        });
        await protokolliere(tx, {
          organisationId: org.id,
          person,
          aktion: 'organization.created',
          zielTyp: 'organization',
          zielId: org.id,
          satz: `${person.name} hat die Organisation „${geprueft.name}“ angelegt.`,
        });
      });
      return { ok: true, kuerzel };
    } catch (fehler) {
      // Kürzel schon vergeben (P2002): nächster Versuch mit Zusatz.
      if ((fehler as { code?: string }).code !== 'P2002') throw fehler;
    }
  }
  return { ok: false, meldung: 'Gerade ist kein freies Kürzel zu finden. Bitte versuche es erneut.' };
}

export type Uebersicht = {
  plaetze: Platzstand;
  mitglieder: Array<{ id: string; name: string; rolle: Rolle; seit: Date; selbst: boolean }>;
  einladungen: Array<{
    id: string;
    rolle: Rolle;
    email: string | null;
    nutzungen: number;
    maxNutzungen: number;
    gueltigBis: Date;
    team: string | null;
  }>;
};

export async function uebersicht(db: Db, k: OrgKontext, person: Person, jetzt = new Date()): Promise<Uebersicht> {
  verlange(k, person, 'mitglieder.sehen');
  const [org, mitglieder, einladungen] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: k.organisationId }, select: { seats: true } }),
    db.membership.findMany({
      where: { organizationId: k.organisationId },
      select: { id: true, sub: true, displayName: true, role: true, joinedAt: true },
    }),
    db.invitation.findMany({
      where: { organizationId: k.organisationId, revokedAt: null, expiresAt: { gt: jetzt } },
      select: {
        id: true,
        role: true,
        email: true,
        uses: true,
        maxUses: true,
        expiresAt: true,
        team: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const reihenfolge = (r: Rolle) => ROLLEN.indexOf(r);
  return {
    plaetze: platzstand(mitglieder.filter((m) => m.role === 'LEARNER').length, org.seats),
    mitglieder: mitglieder
      .map((m) => ({ id: m.id, name: m.displayName, rolle: m.role, seit: m.joinedAt, selbst: m.sub === person.sub }))
      .sort((a, b) => reihenfolge(a.rolle) - reihenfolge(b.rolle) || a.name.localeCompare(b.name, 'de')),
    einladungen: einladungen
      .filter((e) => e.uses < e.maxUses)
      .map((e) => ({
        id: e.id,
        rolle: e.role,
        email: e.email,
        nutzungen: e.uses,
        maxNutzungen: e.maxUses,
        gueltigBis: e.expiresAt,
        team: e.team?.name ?? null,
      })),
  };
}

const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Einladung erzeugen. Zurück kommt der Token im Klartext, genau einmal; in der
 * Datenbank liegt nur sein Hash. Mit Adresse genau einmal einlösbar, sonst bis
 * zu `maxNutzungen` Mal.
 */
export async function ladeEin(
  db: Db,
  k: OrgKontext,
  person: Person,
  eingabe: { rolle: unknown; email?: unknown; maxNutzungen?: unknown; team?: unknown },
  jetzt = new Date(),
): Promise<Ergebnis<{ token: string }>> {
  const rolle = ROLLEN.find((r) => r === eingabe.rolle);
  if (!rolle) return { ok: false, meldung: 'Bitte wähle eine Rolle.' };
  verlange(k, person, rolle === 'LEARNER' ? 'einladen.lernende' : 'einladen.leitung');
  if (!darfEinladenAls(k.rolle, rolle)) {
    throw new OrganisationsFehler('verboten', 'Mit dieser Rolle darfst du nicht einladen.');
  }
  if (k.gesperrt) return { ok: false, meldung: 'Diese Organisation ist gesperrt und lädt niemanden ein.' };

  const email = typeof eingabe.email === 'string' ? eingabe.email.trim().toLowerCase() : '';
  if (email && !ADRESSE.test(email)) return { ok: false, meldung: 'Diese E-Mail-Adresse sieht nicht vollständig aus.' };
  const gewuenscht = Number(eingabe.maxNutzungen ?? 1);
  if (!email && (!Number.isInteger(gewuenscht) || gewuenscht < 1 || gewuenscht > EINLADUNG_MAX_NUTZUNGEN)) {
    return { ok: false, meldung: `Ein Link gilt für 1 bis ${EINLADUNG_MAX_NUTZUNGEN} Personen.` };
  }
  const maxNutzungen = email ? 1 : gewuenscht;

  // E5.2: optional direkt in ein offenes Team dieser Organisation.
  let team: { id: string; name: string } | null = null;
  if (typeof eingabe.team === 'string' && eingabe.team) {
    team = await db.team.findFirst({
      where: { id: eingabe.team, organizationId: k.organisationId, archivedAt: null },
      select: { id: true, name: true },
    });
    if (!team) return { ok: false, meldung: 'Dieses Team gibt es nicht oder es ist archiviert.' };
  }

  const token = neuerToken();
  const einladung = await db.invitation.create({
    data: {
      organizationId: k.organisationId,
      role: rolle,
      tokenHash: hashToken(token),
      email: email || null,
      maxUses: maxNutzungen,
      expiresAt: new Date(jetzt.getTime() + EINLADUNG_GUELTIG_TAGE * 24 * 60 * 60 * 1000),
      createdBySub: person.sub,
      teamId: team?.id ?? null,
    },
  });
  await protokolliere(db, {
    organisationId: k.organisationId,
    person,
    aktion: 'invitation.created',
    zielTyp: 'invitation',
    zielId: einladung.id,
    satz:
      (email
        ? `${person.name} hat ${email} als ${ROLLEN_NAME[rolle]} eingeladen`
        : `${person.name} hat einen Einladungslink für bis zu ${maxNutzungen} ${maxNutzungen === 1 ? 'Person' : 'Personen'} als ${ROLLEN_NAME[rolle]} erstellt`) +
      (team ? ` (Team „${team.name}“).` : '.'),
  });
  return { ok: true, token };
}

export async function widerrufe(db: Db, k: OrgKontext, person: Person, einladungId: string): Promise<void> {
  const einladung = await db.invitation.findFirst({
    where: { id: einladungId, organizationId: k.organisationId, revokedAt: null },
    select: { id: true, role: true },
  });
  if (!einladung) throw new OrganisationsFehler('nicht-gefunden', 'Diese Einladung gibt es nicht (mehr).');
  verlange(k, person, einladung.role === 'LEARNER' ? 'einladen.lernende' : 'einladen.leitung');
  await db.invitation.update({ where: { id: einladung.id }, data: { revokedAt: new Date() } });
  await protokolliere(db, {
    organisationId: k.organisationId,
    person,
    aktion: 'invitation.revoked',
    zielTyp: 'invitation',
    zielId: einladung.id,
    satz: `${person.name} hat eine Einladung als ${ROLLEN_NAME[einladung.role]} zurückgezogen.`,
  });
}

/** Was die Einladungsseite vor dem Annehmen zeigt. `null` = unbekannter Token. */
export async function einladungVorschau(
  db: Db,
  token: string,
): Promise<{ organisation: string; rolle: Rolle; gebunden: boolean; team: string | null } | null> {
  if (!token || token.length > 200) return null;
  const e = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      role: true,
      email: true,
      organization: { select: { name: true } },
      team: { select: { name: true, archivedAt: true } },
    },
  });
  if (!e) return null;
  return {
    organisation: e.organization.name,
    rolle: e.role,
    gebunden: e.email !== null,
    team: e.team && !e.team.archivedAt ? e.team.name : null,
  };
}

export type Einloesung = { ok: true; kuerzel: string } | { ok: false; grund: 'ungueltig' | Exclude<EinloesungsUrteil, { ok: true }>['grund'] };

export async function loeseEin(db: Db, person: Person, token: string, jetzt = new Date()): Promise<Einloesung> {
  if (!token || token.length > 200) return { ok: false, grund: 'ungueltig' };
  const tokenHash = hashToken(token);
  return db.$transaction(async (tx) => {
    const vorab = await tx.invitation.findUnique({ where: { tokenHash }, select: { organizationId: true } });
    if (!vorab) return { ok: false, grund: 'ungueltig' } as const;
    await sperre(tx, vorab.organizationId);

    const e = await tx.invitation.findUniqueOrThrow({
      where: { tokenHash },
      select: {
        id: true,
        role: true,
        email: true,
        uses: true,
        maxUses: true,
        expiresAt: true,
        revokedAt: true,
        organization: { select: { id: true, slug: true, name: true, seats: true, status: true } },
        team: { select: { id: true, organizationId: true, archivedAt: true } },
      },
    });
    const [schonMitglied, belegt] = await Promise.all([
      tx.membership.findUnique({
        where: { organizationId_sub: { organizationId: e.organization.id, sub: person.sub } },
        select: { id: true },
      }),
      belegtePlaetze(tx, e.organization.id),
    ]);
    const urteil = urteileUeberEinloesung(
      {
        rolle: e.role,
        email: e.email,
        maxNutzungen: e.maxUses,
        nutzungen: e.uses,
        gueltigBis: e.expiresAt,
        widerrufen: e.revokedAt !== null,
        organisationGesperrt: e.organization.status === 'SUSPENDED',
        schonMitglied: schonMitglied !== null,
        plaetze: platzstand(belegt, e.organization.seats),
      },
      person,
      jetzt,
    );
    if (!urteil.ok) return urteil;

    const neu = await tx.membership.create({
      data: { organizationId: e.organization.id, sub: person.sub, displayName: person.name, role: e.role },
    });
    // E5.2: direkt ins Team der Einladung, solange es offen ist und zur Organisation gehört.
    if (e.team && !e.team.archivedAt && e.team.organizationId === e.organization.id) {
      await tx.teamMembership.create({ data: { teamId: e.team.id, membershipId: neu.id } });
    }
    await tx.invitation.update({ where: { id: e.id }, data: { uses: { increment: 1 } } });
    await protokolliere(tx, {
      organisationId: e.organization.id,
      person,
      aktion: 'invitation.accepted',
      zielTyp: 'invitation',
      zielId: e.id,
      satz: `${person.name} ist als ${ROLLEN_NAME[e.role]} beigetreten.`,
    });
    return { ok: true, kuerzel: e.organization.slug } as const;
  });
}

export async function aendereRolle(
  db: Db,
  k: OrgKontext,
  person: Person,
  mitgliedId: string,
  eingabe: unknown,
): Promise<Ergebnis<object>> {
  verlange(k, person, 'mitglieder.verwalten');
  const neu = ROLLEN.find((r) => r === eingabe);
  if (!neu) return { ok: false, meldung: 'Bitte wähle eine Rolle.' };
  return db.$transaction(async (tx) => {
    await sperre(tx, k.organisationId);
    const m = await tx.membership.findFirst({
      where: { id: mitgliedId, organizationId: k.organisationId },
      select: { id: true, role: true, displayName: true },
    });
    if (!m) return { ok: false, meldung: 'Dieses Mitglied gibt es nicht (mehr).' } as const;
    if (m.role === neu) return { ok: true } as const;
    const admins = await tx.membership.count({ where: { organizationId: k.organisationId, role: 'ADMIN' } });
    if (!rollenwechselErlaubt(m.role, neu, admins)) {
      return { ok: false, meldung: 'Eine Organisation braucht immer mindestens einen Admin.' } as const;
    }
    if (neu === 'LEARNER') {
      const org = await tx.organization.findUniqueOrThrow({ where: { id: k.organisationId }, select: { seats: true } });
      if (platzstand(await belegtePlaetze(tx, k.organisationId), org.seats).frei <= 0) {
        return { ok: false, meldung: 'Alle Plätze für Lernende sind belegt.' } as const;
      }
    }
    await tx.membership.update({ where: { id: m.id }, data: { role: neu } });
    await protokolliere(tx, {
      organisationId: k.organisationId,
      person,
      aktion: 'membership.role-changed',
      zielTyp: 'membership',
      zielId: m.id,
      satz: `${person.name} hat ${m.displayName} von ${ROLLEN_NAME[m.role]} zu ${ROLLEN_NAME[neu]} gemacht.`,
    });
    return { ok: true } as const;
  });
}

export async function entferne(db: Db, k: OrgKontext, person: Person, mitgliedId: string): Promise<Ergebnis<object>> {
  verlange(k, person, 'mitglieder.verwalten');
  return db.$transaction(async (tx) => {
    await sperre(tx, k.organisationId);
    const m = await tx.membership.findFirst({
      where: { id: mitgliedId, organizationId: k.organisationId },
      select: { id: true, role: true, displayName: true, sub: true },
    });
    if (!m) return { ok: false, meldung: 'Dieses Mitglied gibt es nicht (mehr).' } as const;
    if (m.role === 'ADMIN') {
      const admins = await tx.membership.count({ where: { organizationId: k.organisationId, role: 'ADMIN' } });
      if (admins <= 1) return { ok: false, meldung: 'Eine Organisation braucht immer mindestens einen Admin.' } as const;
    }
    await tx.membership.delete({ where: { id: m.id } });
    await protokolliere(tx, {
      organisationId: k.organisationId,
      person,
      aktion: 'membership.removed',
      zielTyp: 'membership',
      zielId: m.id,
      satz:
        m.sub === person.sub
          ? `${person.name} hat die Organisation verlassen.`
          : `${person.name} hat ${m.displayName} aus der Organisation entfernt.`,
    });
    return { ok: true } as const;
  });
}

/** Selbst austreten. Der Lernstand bleibt bei der Person; nur die Mitgliedschaft endet. */
export async function verlasse(db: Db, person: Person, kuerzel: string): Promise<Ergebnis<object>> {
  const k = await kontext(db, person.sub, kuerzel);
  if (!k) return { ok: false, meldung: 'Du bist nicht Mitglied dieser Organisation.' };
  return db.$transaction(async (tx) => {
    await sperre(tx, k.organisationId);
    const m = await tx.membership.findUniqueOrThrow({
      where: { organizationId_sub: { organizationId: k.organisationId, sub: person.sub } },
      select: { id: true, role: true },
    });
    if (m.role === 'ADMIN') {
      const admins = await tx.membership.count({ where: { organizationId: k.organisationId, role: 'ADMIN' } });
      if (admins <= 1) {
        return {
          ok: false,
          meldung: 'Du bist der einzige Admin. Ernenne zuerst eine andere Person zum Admin.',
        } as const;
      }
    }
    await tx.membership.delete({ where: { id: m.id } });
    await protokolliere(tx, {
      organisationId: k.organisationId,
      person,
      aktion: 'membership.left',
      zielTyp: 'membership',
      zielId: m.id,
      satz: `${person.name} hat die Organisation verlassen.`,
    });
    return { ok: true } as const;
  });
}

export async function benenneUm(db: Db, k: OrgKontext, person: Person, eingabe: unknown): Promise<Ergebnis<object>> {
  verlange(k, person, 'organisation.umbenennen');
  const geprueft = pruefeName(eingabe);
  if (!geprueft.ok) return { ok: false, meldung: geprueft.grund };
  if (geprueft.name === k.name) return { ok: true };
  await db.organization.update({ where: { id: k.organisationId }, data: { name: geprueft.name } });
  await protokolliere(db, {
    organisationId: k.organisationId,
    person,
    aktion: 'organization.renamed',
    zielTyp: 'organization',
    zielId: k.organisationId,
    satz: `${person.name} hat die Organisation von „${k.name}“ in „${geprueft.name}“ umbenannt.`,
  });
  return { ok: true };
}

export async function protokoll(
  db: Db,
  k: OrgKontext,
  person: Person,
): Promise<Array<{ wann: Date; wer: string; satz: string }>> {
  verlange(k, person, 'protokoll.lesen');
  const eintraege = await db.auditEntry.findMany({
    where: { organizationId: k.organisationId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { createdAt: true, actorName: true, summary: true },
  });
  return eintraege.map((e) => ({ wann: e.createdAt, wer: e.actorName, satz: e.summary }));
}
