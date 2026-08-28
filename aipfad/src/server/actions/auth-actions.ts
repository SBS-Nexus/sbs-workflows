'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/server/db/prisma';
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

async function clientIp(): Promise<string> {
  const headerList = await headers();
  return headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
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
