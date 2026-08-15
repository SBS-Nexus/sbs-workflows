'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { ausDatenmodellArt } from '@/domain/aufgabe/art';
import { istLektionAbgeschlossen, type AufgabenStand } from '@/domain/aufgabe/abschluss';
import {
  alsVersuchsergebnis,
  bewerteAufgabe,
  type Antwort,
  type BewertbareAufgabe,
  type Bewertung,
} from '@/domain/aufgabe/bewertung';
import type { Resultset } from '@/domain/sql/resultset';
import type { AnweisungsKlasse } from '@/domain/sql/statement-policy';

/**
 * Aufgaben abgeben, Hinweise nehmen, die Lösung ansehen.
 *
 * Das Urteil selbst fällt in `src/domain/aufgabe/bewertung.ts` und kennt weder
 * Datenbank noch Sitzung. Hier liegt nur, was ohne beides nicht geht: Die
 * Aufgabe wird **aus der Datenbank** geladen und nicht aus dem, was der Browser
 * mitschickt. Käme die richtige Antwort aus dem Client, wäre die Bewertung eine
 * Auskunft darüber, was der Client behauptet.
 *
 * Was ausdrücklich **nicht** passiert: ein Versuch wird nur festgehalten, wenn
 * es ein Urteil gibt. „Selbst vergleichen" und „braucht Ausführung" sind keine
 * Ergebnisse; sie als Fehlversuch zu speichern, würde den Verlauf mit Zahlen
 * füllen, die niemand gemessen hat.
 */

const antwortSchema = z.discriminatedUnion('art', [
  z.object({
    art: z.literal('auswahl'),
    gewaehlt: z.array(z.number().int().min(0).max(50)).max(20),
  }),
  z.object({
    art: z.literal('reihenfolge'),
    reihenfolge: z.array(z.number().int().min(0).max(50)).max(20),
  }),
  z.object({ art: z.literal('zahl'), wert: z.number().int().min(-1).max(1_000_000) }),
  z.object({ art: z.literal('text'), text: z.string().max(5_000) }),
  z.object({ art: z.literal('sql'), sql: z.string().max(20_000) }),
]);

const abgabeSchema = z.object({
  aufgabeSlug: z.string().min(1).max(120),
  antwort: antwortSchema,
  hinweiseGenutzt: z.number().int().min(0).max(10),
  dauerMs: z
    .number()
    .int()
    .min(0)
    .max(6 * 60 * 60 * 1000),
});

/**
 * Die Rückmeldung an die Oberfläche.
 *
 * `erwartetesErgebnis` kommt **erst mit der Abgabe** und liegt nicht schon
 * beim Laden der Seite im Browser: Bei einer Vorhersageaufgabe stünde die
 * Antwort sonst im Quelltext, und die Frage „was kommt dabei heraus?" wäre
 * beantwortet, bevor sie gestellt wurde.
 */
export type Abgabeantwort = {
  bewertung: Bewertung;
  erwartetesErgebnis?: Resultset;
};

export async function gibAufgabeAb(daten: unknown): Promise<Abgabeantwort> {
  const user = await requireUser();

  const geprueft = abgabeSchema.safeParse(daten);
  if (!geprueft.success) {
    return {
      bewertung: { art: 'abgelehnt', begruendung: 'Die Eingabe konnte nicht gelesen werden.' },
    };
  }

  const aufgabe = await ladeAufgabe(geprueft.data.aufgabeSlug);
  if (!aufgabe) {
    return { bewertung: { art: 'abgelehnt', begruendung: 'Diese Aufgabe gibt es nicht (mehr).' } };
  }

  const bewertung = bewerteAufgabe(aufgabe.bewertbar, geprueft.data.antwort as Antwort);

  const ergebnis = alsVersuchsergebnis(bewertung);
  if (ergebnis) {
    await prisma.attempt.create({
      data: {
        userId: user.id,
        exerciseId: aufgabe.id,
        submittedSql: alsText(geprueft.data.antwort as Antwort),
        result: ergebnis,
        errorType: ergebnis === 'PASSED' ? 'NONE' : 'WRONG_RESULT',
        hintsUsed: geprueft.data.hinweiseGenutzt,
        durationMs: geprueft.data.dauerMs,
      },
    });

    await pruefeLektionsAbschluss(user.id, aufgabe.lektionId);
  }

  /*
   * Das erwartete Ergebnis wird nach der Abgabe gezeigt - auch, wenn die Zahl
   * daneben lag. Gerade dann: Die Vorhersage lernt man nur, indem man sie mit
   * dem tatsächlichen Ergebnis vergleicht.
   */
  if (aufgabe.bewertbar.art === 'ERGEBNIS_VORHERSAGEN' && aufgabe.bewertbar.erwartetesErgebnis) {
    if (bewertung.art === 'richtig' || bewertung.art === 'falsch') {
      return { bewertung, erwartetesErgebnis: aufgabe.bewertbar.erwartetesErgebnis };
    }
  }

  return { bewertung };
}

const einschaetzungSchema = z.object({
  aufgabeSlug: z.string().min(1).max(120),
  urteil: z.enum(['getroffen', 'teilweise', 'daneben']),
  hinweiseGenutzt: z.number().int().min(0).max(10),
  dauerMs: z
    .number()
    .int()
    .min(0)
    .max(6 * 60 * 60 * 1000),
});

/**
 * Die eigene Einschätzung zu einer Antwort in eigenen Worten festhalten.
 *
 * Hier urteilt die Lernende über sich selbst, und das ist Absicht: Ein
 * Textvergleich, der „ungefähr richtig" behauptet, wäre eine Anmaßung. Wer
 * seine Antwort neben der Musterantwort liest und selbst entscheidet, hat den
 * Vergleich tatsächlich gezogen – das ist der lernwirksame Teil.
 */
export async function meldeSelbsteinschaetzung(daten: unknown): Promise<{ gespeichert: boolean }> {
  const user = await requireUser();

  const geprueft = einschaetzungSchema.safeParse(daten);
  if (!geprueft.success) return { gespeichert: false };

  const aufgabe = await ladeAufgabe(geprueft.data.aufgabeSlug);
  if (!aufgabe) return { gespeichert: false };

  const ergebnis = {
    getroffen: 'PASSED',
    teilweise: 'PARTIAL',
    daneben: 'FAILED',
  }[geprueft.data.urteil] as 'PASSED' | 'PARTIAL' | 'FAILED';

  await prisma.attempt.create({
    data: {
      userId: user.id,
      exerciseId: aufgabe.id,
      submittedSql: '',
      result: ergebnis,
      errorType: ergebnis === 'PASSED' ? 'NONE' : 'WRONG_RESULT',
      hintsUsed: geprueft.data.hinweiseGenutzt,
      durationMs: geprueft.data.dauerMs,
      confidenceAfter: ergebnis === 'PASSED' ? 'RATHER_SURE' : 'RATHER_UNSURE',
    },
  });

  await pruefeLektionsAbschluss(user.id, aufgabe.lektionId);

  return { gespeichert: true };
}

const loesungSchema = z.object({
  aufgabeSlug: z.string().min(1).max(120),
  hinweiseGenutzt: z.number().int().min(0).max(10),
});

export type Loesungsantwort =
  | { art: 'gesperrt'; hinweis: string }
  | { art: 'keine'; hinweis: string }
  | { art: 'loesung'; sql: string | null; erklaerung: string | null };

/**
 * Die Musterlösung ansehen.
 *
 * Sie steht erst zur Verfügung, wenn die Hinweisleiter durch ist. Das ist eine
 * didaktische Reihenfolge und keine Sperre gegen jemanden, der sie umgehen
 * will – die Zahl der genutzten Hinweise kommt aus dem Browser, und wer sie
 * fälscht, betrügt niemanden außer sich selbst.
 *
 * Der Blick auf die Lösung wird als SOLUTION_REVEALED festgehalten und zählt
 * ausdrücklich **nicht** als gelöst. Nicht als Strafe: Eine angesehene Lösung
 * sagt nichts darüber aus, ob die Aufgabe beim nächsten Mal allein gelingt, und
 * die Wiederholungsplanung soll das wissen.
 */
export async function zeigeLoesung(daten: unknown): Promise<Loesungsantwort> {
  const user = await requireUser();

  const geprueft = loesungSchema.safeParse(daten);
  if (!geprueft.success) return { art: 'keine', hinweis: 'Die Anfrage war unvollständig.' };

  const aufgabe = await ladeAufgabe(geprueft.data.aufgabeSlug);
  if (!aufgabe) return { art: 'keine', hinweis: 'Diese Aufgabe gibt es nicht (mehr).' };

  if (geprueft.data.hinweiseGenutzt < aufgabe.hinweiseGesamt) {
    return {
      art: 'gesperrt',
      hinweis:
        'Es sind noch Hinweise übrig. Sie führen dich schrittweise hin – die Lösung danach ' +
        'anzusehen, bringt mehr als sie davor zu lesen.',
    };
  }

  if (!aufgabe.loesungSql && !aufgabe.loesungsErklaerung) {
    return { art: 'keine', hinweis: 'Zu dieser Aufgabe gibt es keine Musterlösung in SQL.' };
  }

  await prisma.attempt.create({
    data: {
      userId: user.id,
      exerciseId: aufgabe.id,
      submittedSql: '',
      result: 'SOLUTION_REVEALED',
      hintsUsed: geprueft.data.hinweiseGenutzt,
    },
  });

  return {
    art: 'loesung',
    sql: aufgabe.loesungSql,
    erklaerung: aufgabe.loesungsErklaerung,
  };
}

// --- Gemeinsames -----------------------------------------------------------

interface GeladeneAufgabe {
  id: string;
  lektionId: string | null;
  bewertbar: BewertbareAufgabe;
  hinweiseGesamt: number;
  loesungSql: string | null;
  loesungsErklaerung: string | null;
}

async function ladeAufgabe(slug: string): Promise<GeladeneAufgabe | null> {
  const zeile = await prisma.exercise.findUnique({ where: { slug } });
  if (!zeile || zeile.status !== 'PUBLISHED') return null;

  const art = ausDatenmodellArt(zeile.type);
  if (!art) return null;

  const hinweise = Array.isArray(zeile.hints) ? zeile.hints : [];

  return {
    id: zeile.id,
    lektionId: zeile.lessonId,
    hinweiseGesamt: hinweise.length,
    loesungSql: zeile.solutionSql,
    loesungsErklaerung: zeile.solutionNotes,
    bewertbar: {
      art,
      nutzlast: alsNutzlast(zeile.payload),
      erwartetesErgebnis: alsResultset(zeile.expectedResultset),
      erlaubteKlassen: zeile.allowedStatementClasses as AnweisungsKlasse[],
    },
  };
}

/**
 * Nach einem Versuch prüfen, ob die Lektion damit durch ist.
 *
 * Die Regel steht in `src/domain/aufgabe/abschluss.ts`. Hier wird nur der Stand
 * beschafft und, falls sie greift, der Fortschritt gesetzt.
 *
 * Ein einmal erreichtes COMPLETED wird **nicht** zurückgenommen. Wer eine
 * Aufgabe später noch einmal öffnet und danebenliegt, hat die Lektion trotzdem
 * einmal gekonnt – ihm den Abschluss wieder wegzunehmen, wäre genau die
 * Verlustmechanik, die dieses Produkt nicht haben soll.
 */
async function pruefeLektionsAbschluss(userId: string, lektionId: string | null): Promise<void> {
  if (!lektionId) return;

  const vorhanden = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId: lektionId } },
    select: { state: true },
  });
  if (vorhanden?.state === 'COMPLETED') return;

  const aufgaben = await prisma.exercise.findMany({
    where: { lessonId: lektionId, status: 'PUBLISHED' },
    select: {
      type: true,
      attempts: {
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { result: true },
      },
    },
  });

  const staende: AufgabenStand[] = [];
  for (const aufgabe of aufgaben) {
    const art = ausDatenmodellArt(aufgabe.type);
    if (!art) continue;
    staende.push({
      art,
      letztesErgebnis: aufgabe.attempts[0]?.result as AufgabenStand['letztesErgebnis'],
    });
  }

  if (!istLektionAbgeschlossen(staende)) return;

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId: lektionId } },
    create: {
      userId,
      lessonId: lektionId,
      state: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
    },
    update: { state: 'COMPLETED', completedAt: new Date() },
  });

  revalidatePath('/lernen');
  revalidatePath('/fortschritt');
}

function alsNutzlast(wert: unknown): Record<string, unknown> | null {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
    ? (wert as Record<string, unknown>)
    : null;
}

function alsResultset(wert: unknown): Resultset | null {
  if (typeof wert !== 'object' || wert === null) return null;
  const kandidat = wert as { spalten?: unknown; zeilen?: unknown };
  if (!Array.isArray(kandidat.spalten) || !Array.isArray(kandidat.zeilen)) return null;
  return wert as Resultset;
}

/** Was von der Antwort im Verlauf steht. Bei SQL der Wortlaut, sonst eine Notiz. */
function alsText(antwort: Antwort): string {
  switch (antwort.art) {
    case 'sql':
      return antwort.sql;
    case 'text':
      return antwort.text;
    case 'zahl':
      return String(antwort.wert);
    case 'auswahl':
      return antwort.gewaehlt.join(', ');
    case 'reihenfolge':
      return antwort.reihenfolge.join(', ');
  }
}
