'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
import { checkPasswordStrength, hashPassword, verifyPassword } from '@/server/auth/password';
import { createSession, destroySession, pruneExpiredSessions } from '@/server/auth/session';
import { abmeldeAdresse, zentraleAnmeldungAktiv, zentralerZugang } from '@/server/auth/zentral';
import { protokoll } from '@/server/auth/zentral-protokoll';
import { clientIpAus } from '@/server/security/client-ip';
import { enforceRateLimit, RATE_LIMITS, RateLimitError } from '@/server/security/rate-limit';

/**
 * Server Actions für Registrierung, Anmeldung und Abmeldung.
 *
 * Next.js prüft bei Server Actions bereits den Origin-Header gegen den Host –
 * das ist der eingebaute CSRF-Schutz. Für Route Handler kommt zusätzlich das
 * Double-Submit-Token aus src/server/auth/session.ts zum Einsatz.
 */

export interface FormState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Bitte gib einen Namen mit mindestens zwei Zeichen an.').max(80),
  email: z.email('Das sieht nicht wie eine E-Mail-Adresse aus.').max(200),
  password: z.string().min(1, 'Bitte gib ein Passwort ein.').max(200),
});

const loginSchema = z.object({
  email: z.email('Das sieht nicht wie eine E-Mail-Adresse aus.').max(200),
  password: z.string().min(1, 'Bitte gib dein Passwort ein.').max(200),
});

/**
 * Grober Anfrageschlüssel für die Ratenbegrenzung. Welche Kopfzeile die
 * Herkunft bestimmt und warum, steht in `server/security/client-ip.ts`. Bis
 * zum Umzug auf Railway galt hier der linke Eintrag von `x-forwarded-for`.
 * Diesen Eintrag setzt der Client selbst, und mit wechselnden Werten bekam
 * jeder Versuch einen frischen Zähler.
 */
async function requestKey(prefix: string, identifier: string): Promise<string> {
  return `${prefix}:${clientIpAus(await headers())}:${identifier.toLowerCase()}`;
}

/**
 * Läuft die Anmeldung über das gemeinsame Konto (E4.4), nehmen die eigenen
 * Formulare nichts mehr an. Die Seiten leiten dann ohnehin weiter; diese
 * Prüfung hält auch direkte Aufrufe der Server Actions ab.
 */
const ZENTRAL_HINWEIS: FormState = {
  ok: false,
  error: 'Die Anmeldung läuft jetzt über dein Lernpfade-Konto. Lade die Seite bitte neu.',
};

export async function registerAction(_previous: FormState, formData: FormData): Promise<FormState> {
  if (zentraleAnmeldungAktiv()) return ZENTRAL_HINWEIS;

  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const email = parsed.data.email.toLowerCase();

  try {
    enforceRateLimit(await requestKey('register', email), RATE_LIMITS.register);
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: error.message };
    throw error;
  }

  const strength = checkPasswordStrength(parsed.data.password, email);
  if (!strength.ok) {
    return { ok: false, fieldErrors: { password: strength.problems.join(' ') } };
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return {
      ok: false,
      fieldErrors: {
        email: 'Für diese Adresse gibt es bereits ein Konto. Melde dich stattdessen an.',
      },
    };
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
    },
    select: { id: true },
  });

  await createSession(user.id);
  redirect('/onboarding');
}

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  if (zentraleAnmeldungAktiv()) return ZENTRAL_HINWEIS;

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }

  const email = parsed.data.email.toLowerCase();

  try {
    enforceRateLimit(await requestKey('login', email), RATE_LIMITS.login);
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: error.message };
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Auch bei unbekannter Adresse wird ein Hash geprüft. Sonst ließe sich an der
  // Antwortzeit ablesen, welche Adressen registriert sind.
  const passwordHash =
    user?.passwordHash ??
    'scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
  const valid = await verifyPassword(parsed.data.password, passwordHash);

  if (!user || !valid) {
    return { ok: false, error: 'E-Mail-Adresse oder Passwort stimmen nicht.' };
  }

  await pruneExpiredSessions();
  await createSession(user.id);

  redirect(user.onboardingCompleted ? '/fortschritt' : '/onboarding');
}

/**
 * Beendet die Sitzung in der App. War sie über das gemeinsame Konto
 * entstanden, geht es dort weiter, damit die Abmeldung auch dort gilt; das
 * Konto leitet danach zur Startseite zurück. Ist es nicht erreichbar, bleibt
 * die Person in der App trotzdem abgemeldet.
 */
export async function logoutAction(): Promise<void> {
  const beendet = await destroySession();
  const zugang = beendet.zentral ? zentralerZugang() : null;

  let ziel = '/';
  if (zugang) {
    try {
      ziel = (await abmeldeAdresse(zugang, beendet.idToken)).href;
    } catch (fehler) {
      protokoll.warn('Abmeldung beim gemeinsamen Konto nicht möglich', {
        errorType: fehler instanceof Error ? fehler.name : 'unbekannt',
      });
    }
  }
  redirect(ziel);
}
