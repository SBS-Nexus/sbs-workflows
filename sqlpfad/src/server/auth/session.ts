import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { prisma } from '@/server/db/prisma';
import { getEnv } from '@/server/env';
import { isSecureDeployment } from '@/server/site';
import type { UserModel } from '@/generated/prisma/models';

/**
 * Sitzungsverwaltung.
 *
 * Warum eine eigene Implementierung und keine fertige Bibliothek?
 * Auth.js liegt für den App Router derzeit als Vorabversion vor. Das Lernmodell
 * dieser Anwendung braucht nur E-Mail und Passwort ohne Fremdanbieter. Eine
 * überschaubare, vollständig geprüfte Eigenimplementierung nach bekanntem Muster
 * ist hier tragfähiger als eine Vorabversion – siehe docs/ARCHITEKTUR.md.
 *
 * Verfahren:
 *  - Das Sitzungstoken ist ein zufälliger 32-Byte-Wert (opak, ohne Inhalt).
 *  - In der Datenbank liegt nur dessen SHA-256-Hash. Ein Datenbankleck gibt
 *    damit keine übernehmbaren Sitzungen preis.
 *  - Das Cookie ist httpOnly, SameSite=Lax und secure, sobald APP_URL auf
 *    https zeigt.
 *  - Zusätzlich zum SameSite-Schutz wird für Formulare ein
 *    Double-Submit-CSRF-Token verwendet.
 */

const SESSION_COOKIE = 'sqlpfad_session';
const CSRF_COOKIE = 'sqlpfad_csrf';
const SESSION_TTL_DAYS = 30;
/** Nach dieser Zeit wird `lastSeenAt` erneut geschrieben (spart Schreiblast). */
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

/**
 * Darf das `Secure`-Merkmal auf die Cookies?
 *
 * Es hängt an der konfigurierten Adresse und nicht mehr an `NODE_ENV`. Der
 * Unterschied ist keine Feinheit, sondern schlägt in beide Richtungen zu:
 *
 * Wer die Anwendung mit `NODE_ENV=production` hinter einfachem HTTP betreibt –
 * etwa zum Ausprobieren im Heimnetz – bekam bisher `Secure`-Cookies, die der
 * Browser über HTTP nie zurückschickt. Die Anmeldung meldet dann Erfolg und
 * wirft einen sofort wieder hinaus, ohne Fehlermeldung. Umgekehrt lief eine
 * Vorschauumgebung unter HTTPS ohne `Secure` und gab ihre Sitzungscookies
 * damit auch über eine unverschlüsselte Verbindung preis.
 *
 * `APP_URL` beschreibt, wie die Anwendung tatsächlich erreichbar ist. Genau
 * das ist die Frage, um die es hier geht.
 */
function cookiesNeedSecureFlag(): boolean {
  return isSecureDeployment();
}

/** Legt eine neue Sitzung an und setzt die Cookies. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const csrfSecret = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const headerList = await headers();
  const userAgent = headerList.get('user-agent')?.slice(0, 255) ?? null;

  await prisma.authSession.create({
    data: { userId, tokenHash: hashToken(token), csrfSecret, expiresAt, userAgent },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookiesNeedSecureFlag(),
    path: '/',
    expires: expiresAt,
  });
  // Das CSRF-Cookie muss für JavaScript lesbar sein (Double Submit).
  // Es ist kein Geheimnis im engeren Sinn: Es beweist nur, dass die Anfrage aus
  // dem eigenen Ursprung stammt.
  cookieStore.set(CSRF_COOKIE, csrfSecret, {
    httpOnly: false,
    sameSite: 'lax',
    secure: cookiesNeedSecureFlag(),
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
}

export async function destroyAllSessions(userId: string): Promise<void> {
  await prisma.authSession.deleteMany({ where: { userId } });
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
}

/**
 * Liest die aktuelle Sitzung.
 *
 * `cache()` sorgt dafür, dass pro Anfrage höchstens eine Datenbankabfrage
 * entsteht, auch wenn mehrere Server Components die Nutzerin bzw. den Nutzer
 * benötigen.
 */
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

/** Erzwingt eine angemeldete Sitzung. Wirft, wenn keine vorhanden ist. */
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

/**
 * Prüft das Double-Submit-Token.
 *
 * Next.js prüft bei Server Actions bereits Origin gegen Host. Diese zusätzliche
 * Prüfung deckt die Route Handler ab und bleibt auch dann wirksam, wenn ein
 * Reverse Proxy die Header umschreibt.
 */
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

/** Entfernt abgelaufene Sitzungen. Wird beim Anmelden nebenbei ausgeführt. */
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

/** Aufbewahrungsfrist für Versuchsdaten anwenden (Datenschutz). */
export async function applyRetentionPolicy(now: Date = new Date()): Promise<number> {
  const days = getEnv().ATTEMPT_RETENTION_DAYS;
  if (days === 0) return 0;

  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const result = await prisma.attempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return result.count;
}
