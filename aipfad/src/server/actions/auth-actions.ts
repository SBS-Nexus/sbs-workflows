'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
// Kein `import type`: die Fehlerklasse wird als Wert für `instanceof` gebraucht.
import { Prisma } from '@/generated/prisma/client';
import { checkPasswordStrength, hashPassword, verifyPassword } from '@/server/auth/password';
import { createSession, destroySession, pruneExpiredSessions } from '@/server/auth/session';
import { enforceRateLimit, RATE_LIMITS, RateLimitError } from '@/server/security/rate-limit';

/**
 * Server Actions für Registrierung, Anmeldung und Abmeldung. Übernommen aus
 * PythonPfad/SQLPfad. Next.js prüft bei Server Actions bereits den
 * Origin-Header gegen den Host (eingebauter CSRF-Schutz).
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
 * Die IP, auf die alle Ratengrenzen dieser Datei aufsetzen.
 *
 * `x-forwarded-for` ist ein vom Client gesetzter Kopfzeilenwert: Der linke
 * Eintrag der Kette stammt von der anfragenden Seite selbst. Wer ihn bei
 * jedem Versuch anders setzt, landet in einem jeweils frischen Zähler und
 * hebelt damit sämtliche Anmelde- und Registrierungsgrenzen aus — also
 * genau den Schutz gegen Credential Stuffing und Massen-Enumeration
 * (Sicherheitsprüfung zu PR #29).
 *
 * Deshalb zuerst `x-vercel-forwarded-for`: Diesen Wert setzt die Plattform
 * selbst und überschreibt eine mitgeschickte Angabe. Er ist auf der
 * dokumentierten Zielplattform (docs/DEPLOYMENT.md) nicht fälschbar.
 * Ohne Plattform-Kopfzeile — eigener Betrieb hinter nginx/Traefik — wird der
 * RECHTE Eintrag der Kette genommen: Den hat der letzte, eigene Proxy
 * angehängt, während alles weiter links vom Client stammen kann. Fehlt jede
 * Angabe, teilen sich alle Anfragen einen gemeinsamen Zähler; das begrenzt
 * eher zu streng als zu großzügig und ist hier die richtige Richtung.
 */
async function clientIp(): Promise<string> {
  const headerList = await headers();

  const platformIp = headerList.get('x-vercel-forwarded-for')?.trim();
  if (platformIp) return platformIp;

  const chain =
    headerList
      .get('x-forwarded-for')
      ?.split(',')
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  return chain.at(-1) ?? 'unbekannt';
}

async function requestKey(prefix: string, identifier: string): Promise<string> {
  return `${prefix}:${await clientIp()}:${identifier.toLowerCase()}`;
}

/**
 * Zusätzlich zur Pro-Konto-Grenze in `requestKey()` wird hier eine reine
 * IP-Grenze durchgesetzt — sonst eröffnet jede neue E-Mail-Adresse einen
 * frischen Zähler, und jemand könnte von derselben IP aus unbegrenzt viele
 * Adressen durchprobieren (Credential Stuffing, Massen-Enumeration
 * registrierter Adressen). Siehe `server/security/rate-limit.ts`.
 */
async function enforcePerIpLimit(
  config: Parameters<typeof enforceRateLimit>[1],
  prefix: string,
): Promise<void> {
  enforceRateLimit(`${prefix}-ip:${await clientIp()}`, config);
}

/**
 * Grenze allein auf das Konto, ohne IP-Anteil.
 *
 * `requestKey()` kombiniert IP UND E-Mail. Das bremst viele Versuche von
 * EINER Herkunft gegen ein Konto, lässt aber die andere Richtung offen: wer
 * über viele Herkünfte verfügt, bekommt die zehn Versuche je Herkunft erneut
 * und kann ein einzelnes, gezielt ausgewähltes Konto beliebig lange
 * beschießen. Diese kontobezogene Grenze schließt genau diese Richtung
 * (Sicherheitsprüfung zu PR #29).
 */
function enforcePerAccountLimit(
  config: Parameters<typeof enforceRateLimit>[1],
  prefix: string,
  email: string,
): void {
  enforceRateLimit(`${prefix}-konto:${email.toLowerCase()}`, config);
}

export async function registerAction(_previous: FormState, formData: FormData): Promise<FormState> {
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
    await enforcePerIpLimit(RATE_LIMITS.registerPerIp, 'register');
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

  // Zwischen der Prüfung oben und diesem `create` liegt ein Zeitfenster: Zwei
  // gleichzeitige Registrierungen für dieselbe, bislang unbenutzte Adresse
  // kommen beide an der Prüfung vorbei, und eine scheitert dann am
  // Unique-Index. Ohne diese Behandlung bekäme sie eine Serverfehlerseite
  // statt der normalen Rückmeldung "Adresse ist schon vergeben"
  // (Codex-Review auf PR #29, b41d724).
  let user: { id: string };
  try {
    user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash: await hashPassword(parsed.data.password),
      },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        ok: false,
        fieldErrors: {
          email: 'Für diese Adresse gibt es bereits ein Konto. Melde dich stattdessen an.',
        },
      };
    }
    throw error;
  }

  await createSession(user.id);
  redirect('/onboarding');
}

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
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
    await enforcePerIpLimit(RATE_LIMITS.loginPerIp, 'login');
    enforcePerAccountLimit(RATE_LIMITS.loginPerAccount, 'login', email);
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: error.message };
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Auch bei unbekannter Adresse wird ein Hash geprüft, sonst ließe sich an
  // der Antwortzeit ablesen, welche Adressen registriert sind.
  const passwordHash =
    user?.passwordHash ??
    'scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
  const valid = await verifyPassword(parsed.data.password, passwordHash);

  if (!user || !valid) {
    return { ok: false, error: 'E-Mail-Adresse oder Passwort stimmen nicht.' };
  }

  await pruneExpiredSessions();
  await createSession(user.id);

  redirect(user.onboardingCompleted ? '/pfad' : '/onboarding');
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/');
}
