'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import {
  finalisiereOnboarding,
  onboardingSchema,
  platzierungSchema,
  PlatzierungUngueltig,
  OnboardingBereitsAbgeschlossen,
  type OnboardingErgebnis,
} from '@/server/services/onboarding-service';

export interface OnboardingFormState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  ergebnis?: OnboardingErgebnis;
}

/**
 * Wachposten: Dies ist der Typ, der tatsächlich in den Browser geht.
 *
 * `OnboardingErgebnis` ist gegen zusätzliche Felder abgesichert, aber es
 * liegt eine Ebene tiefer. Ein `debug?: PlacementResult` HIER trüge das
 * vollständige Ergebnis hinaus, ohne dass der Typ darunter oder die Prüfung
 * an der Dienstgrenze etwas merkten. Ein neues Feld muss deshalb zuerst hier
 * eingetragen werden — sonst schlägt die Übersetzung fehl.
 */
type ErlaubtesFeld = 'ok' | 'error' | 'fieldErrors' | 'ergebnis';
type KeineUnbekanntenFelder =
  Exclude<keyof OnboardingFormState, ErlaubtesFeld> extends never ? true : never;
const _nurBekannteFelder: KeineUnbekanntenFelder = true;
void _nurBekannteFelder;

/**
 * Schließt Einstellungen und Einstufung in einem Schritt ab.
 *
 * Die Kennung des Kontos kommt aus der Sitzung, nie aus der Eingabe: Eine
 * mitgeschickte `userId` wäre eine Einladung, den Zustand eines anderen
 * Kontos zu ändern. Ebenso wird keine Punktzahl entgegengenommen — der
 * Server bewertet die Antworten selbst.
 *
 * Was zurückkommt, geht vollständig in den Browser: Eine Serveraktion
 * überträgt das ganze Objekt, nicht nur die Felder, die die Anzeige liest.
 * Deshalb steht in `OnboardingErgebnis` aufgezählt, was hinaus darf —
 * Punktzahl, Text und die Erklärungen zu den Fragen. Die inneren Größen der
 * Bewertung (Band, Trefferquote je Gebiet, erkannte Konzepte) bleiben auf
 * dem Server.
 */
export async function abschliessenAction(
  _previous: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const user = await requireUser();

  // Wer schon fertig ist, fängt nicht versehentlich von vorne an: Ein
  // erneutes Absenden dürfte sonst eine vorhandene Einstufung überschreiben.
  if (user.onboardingCompleted) redirect('/pfad');

  const einstellungen = onboardingSchema.safeParse({
    learningGoal: formData.get('learningGoal'),
    experience: formData.get('experience'),
    dailyTimeBudget: formData.get('dailyTimeBudget'),
    pace: formData.get('pace'),
  });

  if (!einstellungen.success) {
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        einstellungen.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const roh = formData.get('platzierung');
  let platzierung;
  try {
    platzierung = platzierungSchema.parse(JSON.parse(typeof roh === 'string' ? roh : '""'));
  } catch {
    return { ok: false, error: 'Die Antworten der Einstufung waren unvollständig.' };
  }

  try {
    const ergebnis = await finalisiereOnboarding(user.id, einstellungen.data, platzierung);
    return { ok: true, ergebnis };
  } catch (fehler) {
    // Zwischen der Prüfung oben und dem Schreiben kann ein zweiter Versuch
    // durchgekommen sein. Dann ist das Onboarding fertig — dorthin, wohin
    // die Prüfung oben ohnehin geschickt hätte.
    if (fehler instanceof OnboardingBereitsAbgeschlossen) redirect('/pfad');
    // Nur hier bleibt die Eingabe in der Maske stehen: Es wird ein Zustand
    // zurückgegeben, die Komponente bleibt stehen, die acht Antworten auch.
    // Die beiden anderen Zweige verlassen die Seite — der eine leitet
    // weiter, der andere fällt an die Fehlergrenze, die den Baum abräumt.
    if (fehler instanceof PlatzierungUngueltig) {
      return { ok: false, error: 'Diese Antworten passen nicht zu den Fragen der Einstufung.' };
    }
    // Alles andere weiterreichen, wie es auch die Anmeldeaktionen halten:
    // Ein fehlender Kurs oder eine abgerissene Datenbankverbindung ist kein
    // Fall für "versuch es noch einmal" — das schickte Lernende in eine
    // Schleife und verschwiege den Fehler zugleich.
    throw fehler;
  }
}
