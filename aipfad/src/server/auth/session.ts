import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { prisma } from '@/server/db/prisma';
import { isSecureDeployment } from '@/server/site';
import type { UserModel } from '@/generated/prisma/models';

/**
 * Sitzungsverwaltung. Übernommen aus PythonPfad/SQLPfad (siehe dortige
 * Begründung in pythonpfad/docs/ARCHITEKTUR.md §2.2): Auth.js liegt für den App Router
 * als Vorabversion vor, und diese Anwendung braucht nur E-Mail und Passwort
 * ohne Fremdanbieter.
 *
 * Verfahren:
 *  - Das Sitzungstoken ist ein zufälliger 32-Byte-Wert (opak, ohne Inhalt).
 *  - In der Datenbank liegt nur dessen SHA-256-Hash.
 *  - Das Cookie ist httpOnly, SameSite=Lax und secure, sobald APP_URL auf
 *    https zeigt.
 *  - Ein Double-Submit-CSRF-Verfahren ist vorbereitet (`csrfSecret`,
 *    `assertCsrf()`, `getCsrfToken()`), aber NICHT angebunden: Keine Server
 *    Action ruft es auf. Wirksam sind `SameSite=Lax`, die bedingte
 *    Herkunftsprüfung in `src/proxy.ts` (bei vorhandenem `Origin`) und die
 *    eingebaute Prüfung von Next.js für Server Actions.
 */

const SESSION_COOKIE = 'aipfad_session';
const CSRF_COOKIE = 'aipfad_csrf';
const SESSION_TTL_DAYS = 30;
const TOUCH_INTERVAL_MS = 15 * 60 * 1000;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'LEARNER' | 'ADMIN';
  onboardingCompleted: boolean;
  placementCompleted: boolean;
  reduceMotion: boolean;
  theme: string;
  locale: string;
  timezone: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function cookiesNeedSecureFlag(): boolean {
  return isSecureDeployment();
}

/** Bei einer Anmeldung über das gemeinsame Konto (E4.2). */
export interface ZentraleSitzung {
  sid: string | null;
  idToken: string;
}

export async function createSession(userId: string, zentral?: ZentraleSitzung): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const csrfSecret = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const headerList = await headers();
  const userAgent = headerList.get('user-agent')?.slice(0, 255) ?? null;

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      csrfSecret,
      expiresAt,
      userAgent,
      oidcSid: zentral?.sid ?? null,
      oidcIdToken: zentral?.idToken ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookiesNeedSecureFlag(),
    path: '/',
    expires: expiresAt,
  });
  cookieStore.set(CSRF_COOKIE, csrfSecret, {
    httpOnly: false,
    sameSite: 'lax',
    secure: cookiesNeedSecureFlag(),
    path: '/',
    expires: expiresAt,
  });
}

/**
 * Beendet die Sitzung dieses Browsers. Gibt zurück, ob sie über das
 * gemeinsame Konto entstanden war; dann muss die Abmeldung dort weitergehen.
 */
export async function destroySession(): Promise<{ zentral: boolean; idToken: string | null }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  let ergebnis = { zentral: false, idToken: null as string | null };

  if (token) {
    const sitzung = await prisma.authSession.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { oidcIdToken: true },
    });
    if (sitzung?.oidcIdToken) ergebnis = { zentral: true, idToken: sitzung.oidcIdToken };
    await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
  return ergebnis;
}

/**
 * Rückkanal-Abmeldung (E4.2): Beendet die Sitzungen, die zu einer Sitzung
 * beim gemeinsamen Konto gehören. Mit `sid` genau diese, sonst alle über das
 * gemeinsame Konto entstandenen Sitzungen der Person. Gibt die Anzahl zurück.
 */
export async function destroyZentraleSitzungen(auftrag: {
  sid: string | null;
  sub: string | null;
}): Promise<number> {
  if (auftrag.sid) {
    const result = await prisma.authSession.deleteMany({
      where: {
        oidcSid: auftrag.sid,
        ...(auftrag.sub ? { user: { authSubject: auftrag.sub } } : {}),
      },
    });
    return result.count;
  }
  if (auftrag.sub) {
    const result = await prisma.authSession.deleteMany({
      where: { user: { authSubject: auftrag.sub }, oidcIdToken: { not: null } },
    });
    return result.count;
  }
  return 0;
}

export async function destroyAllSessions(userId: string): Promise<void> {
  await prisma.authSession.deleteMany({ where: { userId } });
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.authSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.authSession
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }

  return toSessionUser(session.user);
});

function toSessionUser(user: UserModel): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    onboardingCompleted: user.onboardingCompleted,
    placementCompleted: user.placementCompleted,
    reduceMotion: user.reduceMotion,
    theme: user.theme,
    locale: user.locale,
    timezone: user.timezone,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw new ForbiddenError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Nicht angemeldet.');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('Für diesen Bereich fehlen die Rechte.');
    this.name = 'ForbiddenError';
  }
}

// ---------------------------------------------------------------------------
// CSRF
// ---------------------------------------------------------------------------

export async function assertCsrf(providedToken: string | null | undefined): Promise<void> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;

  if (!cookieToken || !providedToken) {
    throw new CsrfError();
  }

  const a = Buffer.from(cookieToken);
  const b = Buffer.from(providedToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new CsrfError();
  }
}

export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE)?.value ?? null;
}

export class CsrfError extends Error {
  constructor() {
    super('Die Anfrage konnte nicht bestätigt werden. Bitte lade die Seite neu.');
    this.name = 'CsrfError';
  }
}

export async function pruneExpiredSessions(): Promise<number> {
  const result = await prisma.authSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const CSRF_COOKIE_NAME = CSRF_COOKIE;
export const SESSION_TTL_IN_DAYS = SESSION_TTL_DAYS;

/** Nur für Tests und Wartungsskripte. */
export function __hashTokenForTests(token: string): string {
  return hashToken(token);
}
