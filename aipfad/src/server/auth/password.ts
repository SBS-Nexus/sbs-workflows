import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Passwort-Hashing mit scrypt aus der Node-Standardbibliothek. Übernommen
 * aus PythonPfad/SQLPfad – siehe dortige Begründung in docs/ARCHITEKTUR.md
 * §2.2 (scrypt statt argon2/bcrypt: keine native Abhängigkeit).
 *
 * Parameter nach OWASP-Empfehlung (N=2^16, r=8, p=1). Sie stehen im Hash mit
 * drin, sodass sie später erhöht werden können, ohne bestehende Konten zu
 * entwerten.
 */
const SCRYPT_PARAMS = { N: 65536, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEM = 192 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, {
    ...SCRYPT_PARAMS,
    maxmem: MAX_MEM,
  });

  return [
    'scrypt',
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const N = Number.parseInt(parts[1] ?? '', 10);
  const r = Number.parseInt(parts[2] ?? '', 10);
  const p = Number.parseInt(parts[3] ?? '', 10);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  const salt = Buffer.from(parts[4] ?? '', 'base64');
  const expected = Buffer.from(parts[5] ?? '', 'base64');
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const derived = await scrypt(password.normalize('NFKC'), salt, expected.length, {
      N,
      r,
      p,
      maxmem: MAX_MEM,
    });
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export interface PasswordCheck {
  ok: boolean;
  problems: string[];
}

const COMMON_PASSWORDS = new Set([
  'passwort',
  'password',
  'passwort123',
  '12345678',
  '123456789',
  'qwertzuiop',
  'qwertyuiop',
  'aipfad123',
  'geheim123',
  'willkommen',
  'sommer2024',
  'sommer2025',
  'sommer2026',
]);

/**
 * Prüft die Passwortqualität. Bewusst NICHT nach dem alten Muster
 * "mindestens ein Sonderzeichen": Solche Regeln führen erfahrungsgemäß zu
 * vorhersehbaren Passwörtern. Entscheidend ist die Länge.
 */
export function checkPasswordStrength(password: string, email?: string): PasswordCheck {
  const problems: string[] = [];
  const normalized = password.normalize('NFKC');

  if (normalized.length < 10) {
    problems.push('Das Passwort muss mindestens 10 Zeichen lang sein.');
  }
  if (normalized.length > 200) {
    problems.push('Das Passwort darf höchstens 200 Zeichen lang sein.');
  }
  if (COMMON_PASSWORDS.has(normalized.toLowerCase())) {
    problems.push('Dieses Passwort ist zu bekannt. Wähle bitte eine eigene Wortfolge.');
  }
  if (email) {
    const localPart = email.split('@')[0]?.toLowerCase() ?? '';
    if (localPart.length >= 3 && normalized.toLowerCase().includes(localPart)) {
      problems.push('Das Passwort sollte nicht deine E-Mail-Adresse enthalten.');
    }
  }
  if (/^(.)\1+$/.test(normalized)) {
    problems.push('Ein einzelnes wiederholtes Zeichen ist kein sicheres Passwort.');
  }

  return { ok: problems.length === 0, problems };
}
