'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { destroyAllSessions, requireUser, zentralFrischBestaetigt } from '@/server/auth/session';
import { zentraleAnmeldungAktiv } from '@/server/auth/zentral';
import { prisma } from '@/server/db/prisma';
import { checkPasswordStrength, hashPassword, verifyPassword } from '@/server/auth/password';

/**
 * Passwort ändern und Konto löschen.
 *
 * Beide verlangen das **aktuelle Passwort**. Nicht aus Förmlichkeit: Wer an
 * einem unbeaufsichtigten, angemeldeten Rechner sitzt, könnte sonst das
 * Passwort ändern und die Besitzerin aussperren – oder in zwei Klicks alles
 * löschen, was sie in Wochen erarbeitet hat. Die erneute Eingabe ist die
 * einzige Stelle, an der die Anwendung wissen kann, ob wirklich die Person
 * davorsitzt, der das Konto gehört.
 *
 * Mit dem gemeinsamen Konto (E4.4) gilt derselbe Gedanke dort: Das Passwort
 * wird im Lernpfade-Konto geändert, und vor dem Löschen steht eine frische
 * Anmeldung beim Konto, höchstens zehn Minuten alt.
 */

export interface KontoState {
  ok: boolean;
  meldung?: string;
}

// --- Passwort ändern -------------------------------------------------------

const passwortSchema = z.object({
  aktuell: z.string().min(1).max(200),
  neu: z.string().min(1).max(200),
  wiederholung: z.string().min(1).max(200),
});

export async function aenderePasswort(
  _vorher: KontoState,
  formData: FormData,
): Promise<KontoState> {
  const user = await requireUser();

  const geprueft = passwortSchema.safeParse({
    aktuell: formData.get('aktuell'),
    neu: formData.get('neu'),
    wiederholung: formData.get('wiederholung'),
  });
  if (!geprueft.success) {
    return { ok: false, meldung: 'Bitte fülle alle drei Felder aus.' };
  }

  if (geprueft.data.neu !== geprueft.data.wiederholung) {
    return { ok: false, meldung: 'Die beiden neuen Passwörter stimmen nicht überein.' };
  }

  const konto = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true, email: true },
  });

  // Verwaltet das gemeinsame Konto das Passwort, gibt es hier keins zu ändern.
  if (konto.passwordHash === null || zentraleAnmeldungAktiv()) {
    return { ok: false, meldung: 'Dein Passwort änderst du in deinem Lernpfade-Konto.' };
  }

  if (!(await verifyPassword(geprueft.data.aktuell, konto.passwordHash))) {
    // Bewusst dieselbe knappe Auskunft wie beim Anmelden: Sie nennt nicht,
    // woran es lag, und lädt damit nicht zum Ausprobieren ein.
    return { ok: false, meldung: 'Das aktuelle Passwort stimmt nicht.' };
  }

  const staerke = checkPasswordStrength(geprueft.data.neu, konto.email);
  if (!staerke.ok) {
    return { ok: false, meldung: staerke.problems.join(' ') };
  }

  if (geprueft.data.neu === geprueft.data.aktuell) {
    return { ok: false, meldung: 'Das neue Passwort ist dasselbe wie das alte.' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(geprueft.data.neu) },
  });

  /*
   * Alle Sitzungen beenden – auch die eigene.
   *
   * Wer sein Passwort ändert, tut das oft, weil er befürchtet, dass jemand
   * anderes es kennt. Eine Sitzung, die danach weiterläuft, wäre genau die,
   * die man loswerden wollte. Der Preis ist eine erneute Anmeldung, und der
   * ist an dieser Stelle richtig.
   */
  await destroyAllSessions(user.id);
  redirect('/anmelden?geaendert=1');
}

// --- Konto löschen ---------------------------------------------------------

const loeschSchema = z.object({
  // Entfällt, wenn das gemeinsame Konto die Bestätigung übernimmt.
  passwort: z.string().max(200).optional(),
  bestaetigung: z.string().min(1).max(50),
});

/**
 * Das Konto und alles daran löschen.
 *
 * Es gibt keinen Papierkorb und keine Frist, nach der es sich noch
 * zurückholen ließe. Das ist Absicht: „Gelöscht" soll heißen, was es sagt.
 * Deshalb steht der Satz vor dem Knopf und nicht danach.
 *
 * Das Löschen selbst erledigen die Fremdschlüsselregeln im Datenmodell – jede
 * Beziehung auf `User` trägt eine ausdrückliche Regel. Hier einzelne Tabellen
 * von Hand aufzuräumen, hieße dieselbe Liste ein zweites Mal zu führen, und
 * die zweite wäre irgendwann unvollständig.
 */
export async function loescheKonto(_vorher: KontoState, formData: FormData): Promise<KontoState> {
  const user = await requireUser();

  const geprueft = loeschSchema.safeParse({
    passwort: formData.get('passwort') ?? undefined,
    bestaetigung: formData.get('bestaetigung'),
  });
  if (!geprueft.success) {
    return { ok: false, meldung: 'Bitte gib dein Passwort ein und bestätige mit dem Wort.' };
  }

  if (geprueft.data.bestaetigung.trim().toLowerCase() !== 'löschen') {
    return {
      ok: false,
      meldung: 'Zur Bestätigung muss im zweiten Feld das Wort „löschen" stehen.',
    };
  }

  const konto = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (konto.passwordHash === null || zentraleAnmeldungAktiv()) {
    if (!(await zentralFrischBestaetigt())) {
      return {
        ok: false,
        meldung:
          'Bitte bestätige zuerst mit deinem Lernpfade-Konto. Danach hast du zehn Minuten Zeit.',
      };
    }
  } else if (!(await verifyPassword(geprueft.data.passwort ?? '', konto.passwordHash))) {
    return { ok: false, meldung: 'Das Passwort stimmt nicht. Es wurde nichts gelöscht.' };
  }

  await prisma.user.delete({ where: { id: user.id } });

  // Die Sitzungszeilen sind mit dem Konto schon weg; dieser Aufruf räumt die
  // Cookies im Browser ab, damit die nächste Anfrage nicht mit einem Token
  // ankommt, zu dem es nichts mehr gibt.
  await destroyAllSessions(user.id);

  redirect('/?geloescht=1');
}
