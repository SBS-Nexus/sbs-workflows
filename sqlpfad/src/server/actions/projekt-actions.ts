'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { pruefeAnweisung, teileAnweisungen } from '@/domain/sql/statement-policy';
import { haltAktivitaetFest } from '@/server/lernsitzung';

/**
 * Projekte sichern und abgeben.
 *
 * Ein Projekt ist keine Aufgabe mit einer richtigen Lösung. Es gibt keinen
 * Vergleich gegen ein erwartetes Resultset und – auf dieser Installation – auch
 * niemanden, der die Abgabe ansieht. Der Maßstab sind die Abnahmekriterien, und
 * sie richten sich an die Lernende selbst.
 *
 * Deshalb tut „Abgeben" hier genau eine Sache: Es hält fest, dass jemand fertig
 * ist, und wann. Eine erfundene Rückmeldung („super gemacht!") oder ein
 * automatisches ACCEPTED wären das Gegenteil davon – sie behaupteten ein
 * Urteil, das niemand gefällt hat.
 */

const entwurfSchema = z.object({
  projektSlug: z.string().min(1).max(120),
  sql: z.string().max(20_000),
  notizen: z.string().max(5_000),
});

export type Projektantwort = {
  gespeichert: boolean;
  /** Erklärung, wenn etwas im SQL nicht zum Projekt passt. Leer, wenn alles gut ist. */
  hinweis: string;
};

export async function sichereProjekt(daten: unknown): Promise<Projektantwort> {
  return schreibe(daten, 'IN_PROGRESS');
}

export async function gibProjektAb(daten: unknown): Promise<Projektantwort> {
  return schreibe(daten, 'SUBMITTED');
}

/**
 * Den Entwurf wieder in Bearbeitung nehmen.
 *
 * Eine Abgabe ist kein Punkt ohne Wiederkehr. Wer nach zwei Tagen merkt, dass
 * die Summe doch nicht stimmt, soll weiterarbeiten dürfen, ohne von vorn
 * anzufangen – das Datum der Abgabe wird dabei gelöscht, weil es sonst etwas
 * behauptet, das nicht mehr gilt.
 */
export async function nimmProjektZurueck(daten: unknown): Promise<Projektantwort> {
  const user = await requireUser();
  const geprueft = z.object({ projektSlug: z.string().min(1).max(120) }).safeParse(daten);
  if (!geprueft.success) return { gespeichert: false, hinweis: 'Die Anfrage war unvollständig.' };

  const projekt = await prisma.project.findUnique({
    where: { slug: geprueft.data.projektSlug },
    select: { id: true },
  });
  if (!projekt) return { gespeichert: false, hinweis: 'Dieses Projekt gibt es nicht (mehr).' };

  await prisma.projectSubmission.updateMany({
    where: { userId: user.id, projectId: projekt.id },
    data: { status: 'IN_PROGRESS', submittedAt: null },
  });

  revalidatePath(`/projekte/${geprueft.data.projektSlug}`);
  revalidatePath('/projekte');
  return { gespeichert: true, hinweis: '' };
}

async function schreibe(
  daten: unknown,
  status: 'IN_PROGRESS' | 'SUBMITTED',
): Promise<Projektantwort> {
  const user = await requireUser();

  const geprueft = entwurfSchema.safeParse(daten);
  if (!geprueft.success) {
    return { gespeichert: false, hinweis: 'Die Eingabe konnte nicht gelesen werden.' };
  }

  const projekt = await prisma.project.findUnique({
    where: { slug: geprueft.data.projektSlug },
    select: { id: true, status: true },
  });
  if (!projekt || projekt.status !== 'PUBLISHED') {
    return { gespeichert: false, hinweis: 'Dieses Projekt gibt es nicht (mehr).' };
  }

  /*
   * Die Policy läuft auch hier - aber sie hält nichts auf.
   *
   * Ein Projekt darf lesen und ändern; was genau, entscheidet die Aufgabe im
   * Auftragstext und nicht diese Liste. Was hier abgefangen wird, sind die
   * serverweiten Befehle, die jemand versehentlich aus einer Anleitung kopiert.
   * Der Entwurf wird trotzdem gespeichert: Arbeit zu verwerfen, weil eine Zeile
   * darin nicht vorgesehen ist, wäre eine grobe Unhöflichkeit.
   */
  let hinweis = '';
  for (const anweisung of teileAnweisungen(geprueft.data.sql)) {
    const ergebnis = pruefeAnweisung(anweisung, ['SELECT', 'DML', 'DDL', 'TRANSAKTION']);
    if (!ergebnis.erlaubt) {
      hinweis = ergebnis.begruendung;
      break;
    }
  }

  await prisma.projectSubmission.upsert({
    where: { userId_projectId: { userId: user.id, projectId: projekt.id } },
    create: {
      userId: user.id,
      projectId: projekt.id,
      sql: geprueft.data.sql,
      notes: geprueft.data.notizen,
      status,
      submittedAt: status === 'SUBMITTED' ? new Date() : null,
    },
    update: {
      sql: geprueft.data.sql,
      notes: geprueft.data.notizen,
      status,
      // Beim Sichern bleibt ein früheres Abgabedatum unangetastet; erst das
      // Zurücknehmen löscht es.
      ...(status === 'SUBMITTED' ? { submittedAt: new Date() } : {}),
    },
  });

  await haltAktivitaetFest(user.id);

  revalidatePath(`/projekte/${geprueft.data.projektSlug}`);
  revalidatePath('/projekte');
  return { gespeichert: true, hinweis };
}
