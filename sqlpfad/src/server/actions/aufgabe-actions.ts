'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
import { ausDatenmodellArt } from '@/domain/aufgabe/art';
import { istLektionAbgeschlossen } from '@/domain/aufgabe/abschluss';
import {
  ladeAufgabenstaende,
  ladeLektionsstand,
  type Lektionsstand,
} from '@/server/lernen/lektionsstand';
import { anzeigereihenfolge } from '@/server/lernen/aufgaben-ansicht';
import { zurAufLehrplan } from '@/domain/aufgabe/anordnung';
import { haltAktivitaetFest } from '@/server/lernsitzung';
import { planeWiederholung } from '@/server/wiederholung';
import { istSqlRunnerVerfuegbar } from '@/server/env';
import { fuehreImRunnerAus, stelleSandboxBereit } from '@/server/sql/runner-client';
import {
  bewerteAusfuehrung,
  istAmErgebnisPruefbar,
  type Ausfuehrungsrueckmeldung,
  type Versuchsprotokoll,
} from '@/domain/aufgabe/ausfuehrung';
import {
  alsVersuchsergebnis,
  bewerteAufgabe,
  type Antwort,
  type BewertbareAufgabe,
  type Bewertung,
} from '@/domain/aufgabe/bewertung';
import { resultsetAusJson, type Resultset, type VergleichsOptionen } from '@/domain/sql/resultset';
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
 * Ist der Übungsserver eingeschaltet, wird eine geschriebene Abfrage in der
 * Sandbox der Lernenden ausgeführt und am Ergebnis bewertet
 * (`src/domain/aufgabe/ausfuehrung.ts`). Ohne ihn bleibt es bei „geprüft, aber
 * nicht ausgeführt".
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
  /** Nur bei am Ergebnis bewerteten Schreibaufgaben: eigenes Ergebnis, Abweichungen, Fehler. */
  ausfuehrung?: Pick<Ausfuehrungsrueckmeldung, 'eigenesErgebnis' | 'abweichungen' | 'fehler'>;
  /** Neuer Stand der Lektion, wenn der Versuch in den Verlauf ging. */
  lektion?: Lektionsstand;
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

  // Der Browser kennt nur Anzeigepositionen; zurück auf den Lehrplan, bevor
  // bewertet und festgehalten wird (src/domain/aufgabe/anordnung.ts).
  const antwort = zurAufLehrplan(
    geprueft.data.antwort as Antwort,
    anzeigereihenfolge(user.id, aufgabe.slug, aufgabe.bewertbar.nutzlast),
  );
  let bewertung = bewerteAufgabe(aufgabe.bewertbar, antwort);
  let ausgefuehrt: Ausfuehrungsrueckmeldung | null = null;

  if (
    bewertung.art === 'braucht-ausfuehrung' &&
    antwort.art === 'sql' &&
    istSqlRunnerVerfuegbar()
  ) {
    const ausfuehrung = await fuehreAufgabeAus(user.id, aufgabe, antwort.sql);
    if ('bewertung' in ausfuehrung) {
      ausgefuehrt = ausfuehrung;
      bewertung = ausfuehrung.bewertung;
    } else {
      bewertung = { art: 'braucht-ausfuehrung', begruendung: ausfuehrung.hinweis };
    }
  }

  const ergebnis = alsVersuchsergebnis(bewertung);
  if (ergebnis) {
    const protokoll: Versuchsprotokoll = ausgefuehrt?.protokoll ?? {
      errorType: ergebnis === 'PASSED' ? 'NONE' : 'WRONG_RESULT',
    };
    await prisma.attempt.create({
      data: {
        userId: user.id,
        exerciseId: aufgabe.id,
        submittedSql: alsText(antwort),
        result: ergebnis,
        errorType: protokoll.errorType,
        errorSignature: protokoll.errorSignature ?? null,
        returnedRows: protokoll.returnedRows ?? null,
        executionMs: protokoll.executionMs ?? null,
        hintsUsed: geprueft.data.hinweiseGenutzt,
        durationMs: geprueft.data.dauerMs,
      },
    });

    await haltAktivitaetFest(user.id);
    await planeWiederholung(user.id, aufgabe.id, ergebnis, geprueft.data.hinweiseGenutzt);
    await pruefeLektionsAbschluss(user.id, aufgabe.lektionId);
  }

  // Nur wenn sich etwas geändert haben kann: Ohne Versuch bleibt der Stand.
  const lektion =
    ergebnis && aufgabe.lektionId ? await ladeLektionsstand(user.id, aufgabe.lektionId) : null;
  const mitLektion = <T extends Abgabeantwort>(antwort: T): T =>
    lektion ? { ...antwort, lektion } : antwort;

  /*
   * Das erwartete Ergebnis wird nach der Abgabe gezeigt - auch, wenn die Zahl
   * daneben lag. Gerade dann: Die Vorhersage lernt man nur, indem man sie mit
   * dem tatsächlichen Ergebnis vergleicht.
   */
  if (aufgabe.bewertbar.art === 'ERGEBNIS_VORHERSAGEN' && aufgabe.bewertbar.erwartetesErgebnis) {
    if (bewertung.art === 'richtig' || bewertung.art === 'falsch') {
      return mitLektion({ bewertung, erwartetesErgebnis: aufgabe.bewertbar.erwartetesErgebnis });
    }
  }

  if (ausgefuehrt) {
    const { eigenesErgebnis, abweichungen, fehler } = ausgefuehrt;
    return mitLektion({
      bewertung,
      ausfuehrung: {
        abweichungen,
        ...(eigenesErgebnis ? { eigenesErgebnis } : {}),
        ...(fehler ? { fehler } : {}),
      },
    });
  }

  return mitLektion({ bewertung });
}

/**
 * Eine Schreibaufgabe auf dem Übungsserver ausführen und am Ergebnis bewerten.
 *
 * Gibt einen Hinweis statt einer Rückmeldung zurück, wenn es kein Urteil geben
 * kann: Die Aufgabe ist nicht am Ergebnis prüfbar, oder der Dienst ist nicht
 * erreichbar. In beiden Fällen wird nichts als Versuch festgehalten.
 */
async function fuehreAufgabeAus(
  userId: string,
  aufgabe: GeladeneAufgabe,
  sql: string,
): Promise<Ausfuehrungsrueckmeldung | { hinweis: string }> {
  const erwartet = aufgabe.bewertbar.erwartetesErgebnis;
  if (!istAmErgebnisPruefbar(aufgabe.bewertbar) || !erwartet || !aufgabe.datensatz) {
    const aendert = (aufgabe.bewertbar.erlaubteKlassen ?? ['SELECT']).some((k) => k !== 'SELECT');
    return {
      hinweis: aendert
        ? 'Deine Anweisung ist geprüft und passt zu dem, was diese Aufgabe übt. Aufgaben, die ' +
          'Daten oder Strukturen ändern, prüft SQLPfad noch nicht automatisch am Ergebnis – ' +
          'vergleiche deine Anweisung mit der Musterlösung, sobald du die Hinweise durch hast.'
        : 'Deine Abfrage ist geprüft und passt zu dem, was diese Aufgabe übt. Für diese Aufgabe ' +
          'ist kein Ergebnis hinterlegt, gegen das sie verglichen werden könnte – vergleiche sie ' +
          'mit der Musterlösung, sobald du die Hinweise durch hast.',
    };
  }

  const sandbox = await stelleSandboxBereit(userId, aufgabe.datensatz);
  if ('art' in sandbox) return { hinweis: sandbox.hinweis };

  const ausfuehrung = await fuehreImRunnerAus({
    datenbank: sandbox.datenbank,
    sql,
    erlaubteKlassen: aufgabe.bewertbar.erlaubteKlassen ?? ['SELECT'],
  });
  if (ausfuehrung.art === 'runner-nicht-erreichbar' || ausfuehrung.art === 'runner-abgewiesen') {
    return { hinweis: ausfuehrung.hinweis };
  }

  return bewerteAusfuehrung(ausfuehrung, erwartet, aufgabe.vergleich);
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
export async function meldeSelbsteinschaetzung(
  daten: unknown,
): Promise<{ gespeichert: boolean; lektion?: Lektionsstand }> {
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

  await haltAktivitaetFest(user.id);
  await planeWiederholung(user.id, aufgabe.id, ergebnis, geprueft.data.hinweiseGenutzt);
  await pruefeLektionsAbschluss(user.id, aufgabe.lektionId);

  return aufgabe.lektionId
    ? { gespeichert: true, lektion: await ladeLektionsstand(user.id, aufgabe.lektionId) }
    : { gespeichert: true };
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

  /*
   * Die angesehene Lösung geht als Güte 0 in die Planung ein - das Konzept
   * steht damit sofort wieder an. Nicht als Strafe: Wer die Lösung gelesen
   * hat, weiß danach nicht, ob er sie allein gefunden hätte, und genau das
   * soll die nächste Begegnung klären.
   */
  await planeWiederholung(user.id, aufgabe.id, 'SOLUTION_REVEALED', geprueft.data.hinweiseGenutzt);

  return {
    art: 'loesung',
    sql: aufgabe.loesungSql,
    erklaerung: aufgabe.loesungsErklaerung,
  };
}

// --- Gemeinsames -----------------------------------------------------------

interface GeladeneAufgabe {
  id: string;
  slug: string;
  lektionId: string | null;
  /** Slug des Übungsdatensatzes, in dessen Sandbox die Aufgabe läuft. */
  datensatz: string | null;
  vergleich: VergleichsOptionen;
  bewertbar: BewertbareAufgabe;
  hinweiseGesamt: number;
  loesungSql: string | null;
  loesungsErklaerung: string | null;
}

async function ladeAufgabe(slug: string): Promise<GeladeneAufgabe | null> {
  const zeile = await prisma.exercise.findUnique({
    where: { slug },
    include: { practiceSchema: { select: { slug: true } } },
  });
  if (!zeile || zeile.status !== 'PUBLISHED') return null;

  const art = ausDatenmodellArt(zeile.type);
  if (!art) return null;

  const hinweise = Array.isArray(zeile.hints) ? zeile.hints : [];

  return {
    id: zeile.id,
    slug: zeile.slug,
    lektionId: zeile.lessonId,
    datensatz: zeile.practiceSchema?.slug ?? null,
    vergleich: alsVergleichsoptionen(zeile.comparisonOptions),
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

  const staende = await ladeAufgabenstaende(userId, lektionId);

  // Mit eingeschaltetem Übungsserver zählen die Schreibaufgaben mit, die er
  // bewertet – sonst schlösse die Lektion ab, während sie noch offen sind.
  if (!istLektionAbgeschlossen(staende, { uebungsserver: istSqlRunnerVerfuegbar() })) return;

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

/**
 * Das erwartete Ergebnis aus der Datenbank. Es liegt dort als JSON, in dem aus
 * einem Datum ein Text geworden ist – `resultsetAusJson` macht wieder eins
 * daraus, sonst zeigte die Vorhersageaufgabe `2026-03-02T00:00:00.000Z`.
 */
function alsResultset(wert: unknown): Resultset | null {
  return resultsetAusJson(wert);
}

function alsVergleichsoptionen(wert: unknown): VergleichsOptionen {
  const kandidat = (typeof wert === 'object' && wert !== null ? wert : {}) as Record<
    string,
    unknown
  >;
  return {
    reihenfolgeZaehlt: kandidat['reihenfolgeZaehlt'] === true,
    ...(kandidat['spaltennamenZaehlen'] === true ? { spaltennamenZaehlen: true } : {}),
    ...(kandidat['textUnabhaengigVonGrossschreibung'] === true
      ? { textUnabhaengigVonGrossschreibung: true }
      : {}),
  };
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
