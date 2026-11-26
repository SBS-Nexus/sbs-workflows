import 'server-only';

/**
 * Anmeldung des Hubs über das gemeinsame Konto (E4.5b, docs/E4-5-BAUPLAN.md).
 *
 * Fünf Werte, entweder alle oder keiner. Ohne sie bleibt der Hub, wie er war:
 * keine Anmeldung, `/auth/*` antwortet mit 404. Eine halbe Konfiguration ist
 * ein Fehler und wird nicht still übergangen.
 */
export interface HubKonto {
  /** Aussteller, etwa https://konto.lernpfade.net */
  aussteller: string;
  clientId: string;
  clientSecret: string;
  /** Mindestens 32 Zeichen; daraus werden die Schlüssel für Sitzung und Zustand abgeleitet. */
  sitzungsGeheimnis: string;
  /** Öffentliche Adresse des Hubs, etwa https://www.lernpfade.net (ohne / am Ende). */
  basis: string;
}

const NAMEN = [
  'AUTH_ISSUER',
  'AUTH_CLIENT_ID',
  'AUTH_CLIENT_SECRET',
  'HUB_SESSION_SECRET',
  'HUB_URL',
] as const;

type Umgebung = Readonly<Record<string, string | undefined>>;

/** https, oder http nur für localhost (Teststrecke); ohne Abfrage, Anker und Zugangsdaten. */
export function istZulaessigeAdresse(wert: string): boolean {
  let url: URL;
  try {
    url = new URL(wert);
  } catch {
    return false;
  }
  if (url.search || url.hash || url.username || url.password) return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

export class KontoKonfigurationsFehler extends Error {
  constructor(meldung: string) {
    super(meldung);
    this.name = 'KontoKonfigurationsFehler';
  }
}

/** Liest und prüft die Werte. `null` heißt: Anmeldung im Hub ist aus. */
export function hubKontoAus(umgebung: Umgebung): HubKonto | null {
  const werte = Object.fromEntries(NAMEN.map((n) => [n, (umgebung[n] ?? '').trim()])) as Record<
    (typeof NAMEN)[number],
    string
  >;
  const gesetzt = NAMEN.filter((n) => werte[n].length > 0);
  if (gesetzt.length === 0) return null;
  const fehlend = NAMEN.filter((n) => werte[n].length === 0);
  if (fehlend.length > 0) {
    throw new KontoKonfigurationsFehler(
      `Anmeldung im Hub unvollständig: ${fehlend.join(', ')} fehlt. Alle fünf Werte oder keiner.`,
    );
  }
  if (!istZulaessigeAdresse(werte.AUTH_ISSUER) || !istZulaessigeAdresse(werte.HUB_URL)) {
    throw new KontoKonfigurationsFehler(
      'AUTH_ISSUER und HUB_URL müssen https-Adressen sein (http nur für localhost).',
    );
  }
  if (werte.HUB_SESSION_SECRET.length < 32) {
    throw new KontoKonfigurationsFehler('HUB_SESSION_SECRET muss mindestens 32 Zeichen lang sein.');
  }
  if (werte.AUTH_CLIENT_SECRET.length < 16) {
    throw new KontoKonfigurationsFehler('AUTH_CLIENT_SECRET muss mindestens 16 Zeichen lang sein.');
  }
  return {
    aussteller: werte.AUTH_ISSUER,
    clientId: werte.AUTH_CLIENT_ID,
    clientSecret: werte.AUTH_CLIENT_SECRET,
    sitzungsGeheimnis: werte.HUB_SESSION_SECRET,
    basis: werte.HUB_URL.replace(/\/+$/, ''),
  };
}

/** Die Werte dieses Prozesses. */
export function hubKonto(): HubKonto | null {
  return hubKontoAus(process.env);
}
