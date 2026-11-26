/**
 * E6.3 — Fehlerberichte: Kern (docs/E6-PLAN.md, docs/learning-fehlerbericht/).
 *
 * Kanonisch in `docs/learning-fehlerbericht/`, bytegleich im Hub und in den
 * drei Apps (`scripts/check-learning-fehlerbericht.mjs`). Ohne Importe, damit
 * dieselbe Datei überall läuft und ohne Bündler testbar ist.
 *
 * Grundsatz: Es geht nur hinaus, was hier ausdrücklich steht. Ein Bericht
 * enthält Fehlerart, bereinigte Meldung, Aufrufstapel (Datei, Funktion,
 * Zeile), Routenmuster, Methode, Version und Umgebung. Er enthält keine
 * Person, keine IP-Adresse, keine Kopfzeilen, Cookies, Anfrage- oder
 * Antwortinhalte. Browserfehler kommen über die eigene Route
 * (`/api/fehlerbericht`) und werden erst auf dem Server bereinigt und
 * weitergegeben; der Browser spricht nie mit Sentry.
 *
 * Ziel ist Sentry in der EU (Frankfurt). Eine Adresse außerhalb von
 * `*.ingest.de.sentry.io` wird abgelehnt.
 */

export const FEHLERBERICHT_KENNUNG = 'lernpfade-fehlerbericht/1';

export const GRENZEN = {
  meldung: 500,
  typ: 80,
  funktion: 120,
  datei: 200,
  rahmen: 40,
  route: 200,
  methode: 10,
  digest: 64,
  browserKoerper: 16_384,
  browserMeldung: 2_000,
  browserStapel: 8_000,
  browserPfad: 300,
} as const;

/* ------------------------------------------------------------------ */
/* Bereinigung                                                         */
/* ------------------------------------------------------------------ */

const ERSETZUNGEN: ReadonlyArray<readonly [RegExp, string]> = [
  // Zugangsdaten in Adressen (schema://name:passwort@host).
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi, '$1[Zugang]@'],
  // JSON Web Tokens.
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[Token]'],
  // E-Mail-Adressen.
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[E-Mail]'],
  // Abfrage und Anker von Adressen.
  [/(https?:\/\/[^\s?#"'`]+)[?#][^\s"'`]*/gi, '$1'],
  // UUIDs.
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[ID]'],
  // IPv4.
  [/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '[IP]'],
  // IPv6: volle Schreibweise und verkürzte mit „::“ (nicht Uhrzeiten wie 12:30:45).
  [/\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b/gi, '[IP]'],
  [/(?:\b[0-9a-f]{1,4})?(?::[0-9a-f]{1,4})*::(?:[0-9a-f]{1,4}:)*[0-9a-f]{1,4}\b/gi, '[IP]'],
  // Lange Kennungen, Schlüssel, Hashes: ab 20 Zeichen mit mindestens einer Ziffer.
  [/\b(?=[A-Za-z_-]*\d)[A-Za-z0-9_-]{20,}\b/g, '[Kennung]'],
  // Zahlenfolgen ab sechs Ziffern (Kontokennungen, Telefonnummern).
  [/\d{6,}/g, '[Zahl]'],
];

/** Zitierte Werte mit Leerzeichen oder über 32 Zeichen: oft Eingaben oder Namen. */
const ZITAT = /(["'„“”])([^"'„“”\n]*)(["'„“”])/g;

function kuerze(text: string, grenze: number): string {
  return text.length > grenze ? `${text.slice(0, grenze - 1)}…` : text;
}

/** Entfernt aus einer Meldung alles, was auf Personen oder Geheimnisse deuten kann. */
export function bereinige(text: string, grenze: number = GRENZEN.meldung): string {
  let ergebnis = String(text);
  for (const [muster, ersatz] of ERSETZUNGEN) ergebnis = ergebnis.replace(muster, ersatz);
  ergebnis = ergebnis.replace(ZITAT, (ganz, auf: string, inhalt: string, zu: string) =>
    /\s/.test(inhalt) || inhalt.length > 32 ? `${auf}[Wert]${zu}` : ganz,
  );
  return kuerze(ergebnis.replace(/\s+/g, ' ').trim(), grenze);
}

/** Pfad aus dem Browser: ohne Abfrage, Kennungen werden zu `:id`. */
export function bereinigePfad(pfad: string): string {
  const ohneAbfrage = String(pfad).split(/[?#]/)[0] ?? '';
  if (!ohneAbfrage.startsWith('/')) return '/';
  const teile = ohneAbfrage
    .split('/')
    .filter(Boolean)
    .slice(0, 8)
    .map((teil) =>
      /\d/.test(teil) || teil.length > 24 || /[^a-z0-9._-]/i.test(teil) ? ':id' : teil,
    );
  return kuerze(`/${teile.join('/')}`, GRENZEN.route);
}

/** Datei eines Stapelrahmens ohne Herkunft, Abfrage und lokale Verzeichnisse. */
export function bereinigeDatei(datei: string): string {
  let d = String(datei).replace(/^webpack-internal:\/\/\/?(?:\([^)]*\)\/)?/, '');
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '');
  d = d.split(/[?#]/)[0] ?? '';
  for (const anker of ['/.next/', '/node_modules/', '/src/']) {
    const stelle = d.lastIndexOf(anker);
    if (stelle >= 0) {
      d = d.slice(stelle + 1);
      break;
    }
  }
  if (/^\/(?:Users|home|root|private|var|tmp)\//.test(d)) d = d.split('/').slice(-2).join('/');
  return kuerze(bereinige(d, GRENZEN.datei), GRENZEN.datei);
}

/* ------------------------------------------------------------------ */
/* Aufrufstapel                                                        */
/* ------------------------------------------------------------------ */

export type Rahmen = {
  filename: string;
  function?: string;
  lineno: number;
  colno: number;
  in_app: boolean;
};

const V8 = /^\s*at (?:(?:async )?(.+?) \()?(.+?):(\d+):(\d+)\)?\s*$/;
const GECKO = /^\s*(.*?)@(.+?):(\d+):(\d+)\s*$/;

/** Liest V8- und Firefox/Safari-Stapel; Rahmen in Sentry-Reihenfolge (ältester zuerst). */
export function rahmenAus(stapel: string | undefined): Rahmen[] {
  if (!stapel) return [];
  const rahmen: Rahmen[] = [];
  for (const zeile of String(stapel).split('\n').slice(0, 200)) {
    const treffer = V8.exec(zeile) ?? GECKO.exec(zeile);
    if (!treffer) continue;
    const [, funktion, datei, zeilenNr, spalte] = treffer;
    if (!datei) continue;
    const filename = bereinigeDatei(datei.replace(/^async /, ''));
    const eintrag: Rahmen = {
      filename,
      lineno: Number(zeilenNr),
      colno: Number(spalte),
      in_app: !/(?:^|\/)node_modules\/|^node:|^internal\//.test(filename),
    };
    const name = funktion?.trim();
    if (name) eintrag.function = kuerze(bereinige(name, GRENZEN.funktion), GRENZEN.funktion);
    rahmen.push(eintrag);
    if (rahmen.length >= GRENZEN.rahmen) break;
  }
  return rahmen.reverse();
}

/* ------------------------------------------------------------------ */
/* Ereignis und Umschlag                                               */
/* ------------------------------------------------------------------ */

export type Fehlerangaben = {
  quelle: 'server' | 'browser';
  typ: string;
  meldung: string;
  stapel?: string;
  /** Routenmuster (Server) oder bereinigter Pfad (Browser). */
  route?: string;
  methode?: string;
  /** `render`, `route`, `action`, `proxy` (Next) oder `browser`. */
  art?: string;
  /** Kennung, die die Fehlerseite als „Referenz“ zeigt. */
  digest?: string;
};

export type Fehlerereignis = {
  event_id: string;
  timestamp: number;
  platform: 'node' | 'javascript';
  level: 'error';
  logger: string;
  environment: string;
  release?: string;
  exception: { values: [{ type: string; value: string; stacktrace?: { frames: Rahmen[] } }] };
  tags: Record<string, string>;
};

export type Ziel = { adresse: string; schluessel: string };

/** DSN `https://<schlüssel>@<host>.ingest.de.sentry.io/<projekt>`; sonst `null`. */
export function zielAus(dsn: string | undefined): Ziel | null {
  if (!dsn) return null;
  let url: URL;
  try {
    url = new URL(dsn.trim());
  } catch {
    return null;
  }
  const projekt = url.pathname.replace(/^\/+|\/+$/g, '');
  if (
    url.protocol !== 'https:' ||
    !/^[0-9a-f]{32}$/.test(url.username) ||
    url.password !== '' ||
    !/^[a-z0-9-]+\.ingest\.de\.sentry\.io$/.test(url.hostname) ||
    !/^\d+$/.test(projekt)
  ) {
    return null;
  }
  return { adresse: `https://${url.hostname}/api/${projekt}/envelope/`, schluessel: url.username };
}

const zeichenfrei = (wert: string, grenze: number) =>
  kuerze(wert.replace(/[^\w./:[\]()-]/g, ''), grenze);

export function ereignisAus(
  angaben: Fehlerangaben,
  rahmen: { kennung: string; zeit: number; umgebung: string; version?: string },
): Fehlerereignis {
  const typ = zeichenfrei(angaben.typ || 'Error', GRENZEN.typ) || 'Error';
  const frames = rahmenAus(angaben.stapel);
  const tags: Record<string, string> = { quelle: angaben.quelle };
  if (angaben.route) tags.route = kuerze(bereinige(angaben.route, GRENZEN.route), GRENZEN.route);
  if (angaben.methode) tags.methode = zeichenfrei(angaben.methode.toUpperCase(), GRENZEN.methode);
  if (angaben.art) tags.art = zeichenfrei(angaben.art, 20);
  if (angaben.digest) tags.digest = zeichenfrei(angaben.digest, GRENZEN.digest);
  const ereignis: Fehlerereignis = {
    event_id: rahmen.kennung,
    timestamp: rahmen.zeit / 1000,
    platform: angaben.quelle === 'browser' ? 'javascript' : 'node',
    level: 'error',
    logger: angaben.quelle,
    environment: zeichenfrei(rahmen.umgebung, 64) || 'production',
    exception: {
      values: [
        {
          type: typ,
          value: bereinige(angaben.meldung || typ),
          ...(frames.length > 0 ? { stacktrace: { frames } } : {}),
        },
      ],
    },
    tags,
  };
  if (rahmen.version) ereignis.release = zeichenfrei(rahmen.version, 64);
  return ereignis;
}

/** Sentry-Umschlag (Envelope) mit genau einem Ereignis. */
export function umschlagAus(ereignis: Fehlerereignis, zeit: number): string {
  const kopf = JSON.stringify({
    event_id: ereignis.event_id,
    sent_at: new Date(zeit).toISOString(),
  });
  return `${kopf}\n${JSON.stringify({ type: 'event' })}\n${JSON.stringify(ereignis)}\n`;
}

/* ------------------------------------------------------------------ */
/* Drossel                                                             */
/* ------------------------------------------------------------------ */

export type Drossel = { erlaubt: (schluessel: string) => boolean };

/** Höchstens `proMinute` Berichte je Minute; derselbe Schlüssel nur einmal je Minute. */
export function erzeugeDrossel(proMinute: number, jetzt: () => number): Drossel {
  let fensterBeginn = 0;
  let anzahl = 0;
  const zuletzt = new Map<string, number>();
  return {
    erlaubt(schluessel) {
      const t = jetzt();
      if (t - fensterBeginn >= 60_000) {
        fensterBeginn = t;
        anzahl = 0;
        for (const [k, wann] of zuletzt) if (t - wann >= 60_000) zuletzt.delete(k);
      }
      const vorher = zuletzt.get(schluessel);
      if (vorher !== undefined && t - vorher < 60_000) return false;
      if (anzahl >= proMinute) return false;
      anzahl += 1;
      if (zuletzt.size >= 500) zuletzt.clear();
      zuletzt.set(schluessel, t);
      return true;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Browserberichte                                                     */
/* ------------------------------------------------------------------ */

export type Browserbericht = { typ: string; meldung: string; stapel?: string; pfad?: string };

/** Strenge Prüfung des Körpers von `/api/fehlerbericht`; Unbekanntes fällt weg. */
export function pruefeBrowserbericht(wert: unknown): Browserbericht | null {
  if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) return null;
  const w = wert as Record<string, unknown>;
  const text = (feld: unknown, grenze: number): string | undefined =>
    typeof feld === 'string' && feld.length <= grenze ? feld : undefined;
  const typ = text(w.typ, GRENZEN.typ);
  const meldung = text(w.meldung, GRENZEN.browserMeldung);
  if (!typ || meldung === undefined) return null;
  const bericht: Browserbericht = { typ, meldung };
  const stapel = text(w.stapel, GRENZEN.browserStapel);
  const pfad = text(w.pfad, GRENZEN.browserPfad);
  if (stapel) bericht.stapel = stapel;
  if (pfad) bericht.pfad = pfad;
  return bericht;
}

/** Fehler aus Erweiterungen und bekannte harmlose Meldungen gehören nicht in den Bericht. */
export function istRauschen(bericht: Browserbericht): boolean {
  return (
    /(?:chrome|moz|safari(?:-web)?)-extension:\/\//.test(bericht.stapel ?? '') ||
    /^ResizeObserver loop|^Script error\.?$/.test(bericht.meldung)
  );
}

/* ------------------------------------------------------------------ */
/* Dienst                                                              */
/* ------------------------------------------------------------------ */

type FetchLike = (adresse: string, init: RequestInit) => Promise<Response>;

export type Fehlerberichtsdienst = {
  /** Sendet einen Bericht; scheitert nie, liefert `true`, wenn er hinausging. */
  sende: (angaben: Fehlerangaben) => Promise<boolean>;
  /** Für `onRequestError` in `instrumentation.ts`. */
  meldeAnfragefehler: (
    fehler: unknown,
    anfrage: { method: string },
    kontext: { routePath: string; routeType: string },
  ) => Promise<void>;
  /** Für `POST /api/fehlerbericht`. */
  empfangeBrowserbericht: (anfrage: Request) => Promise<Response>;
};

export type Abhaengigkeiten = {
  umgebung: () => Record<string, string | undefined>;
  fetchImpl: FetchLike;
  jetzt: () => number;
  kennung: () => string;
  warne: (ereignis: string) => void;
  fristMs?: number;
};

/** Next-eigene Steuerfehler (Weiterleitung, 404, dynamische Nutzung) sind keine Fehler. */
const STEUERUNG =
  /^(?:NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT_SIDE_RENDERING)/;

function digestVon(fehler: unknown): string | undefined {
  if (typeof fehler === 'object' && fehler !== null && 'digest' in fehler) {
    const d = (fehler as { digest?: unknown }).digest;
    return typeof d === 'string' ? d : undefined;
  }
  return undefined;
}

const KEIN_INHALT = () =>
  new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

async function liesBegrenzt(anfrage: Request, grenze: number): Promise<string | null> {
  const laenge = Number(anfrage.headers.get('content-length') ?? '0');
  if (laenge > grenze) return null;
  if (!anfrage.body) return '';
  const leser = anfrage.body.getReader();
  const teile: Uint8Array[] = [];
  let gelesen = 0;
  for (;;) {
    const { done, value } = await leser.read();
    if (done) break;
    gelesen += value.byteLength;
    if (gelesen > grenze) {
      await leser.cancel().catch(() => undefined);
      return null;
    }
    teile.push(value);
  }
  const ganz = new Uint8Array(gelesen);
  let stelle = 0;
  for (const teil of teile) {
    ganz.set(teil, stelle);
    stelle += teil.byteLength;
  }
  return new TextDecoder().decode(ganz);
}

export function erzeugeFehlerbericht(a: Abhaengigkeiten): Fehlerberichtsdienst {
  const fristMs = a.fristMs ?? 3000;
  const serverDrossel = erzeugeDrossel(30, a.jetzt);
  const browserDrossel = erzeugeDrossel(20, a.jetzt);
  let konfiguration: { ziel: Ziel | null; umgebung: string; version?: string } | null = null;

  const lies = () => {
    if (konfiguration) return konfiguration;
    const env = a.umgebung();
    const ziel = zielAus(env.SENTRY_DSN);
    if (env.SENTRY_DSN && !ziel) a.warne('fehlerbericht_dsn_ungueltig');
    const version =
      (env.RAILWAY_GIT_COMMIT_SHA ?? env.DEPLOYMENT_ID ?? '').slice(0, 12) || undefined;
    konfiguration = { ziel, umgebung: env.SENTRY_ENVIRONMENT ?? 'production', version };
    return konfiguration;
  };

  const sende = async (angaben: Fehlerangaben): Promise<boolean> => {
    try {
      const k = lies();
      if (!k.ziel) return false;
      const zeit = a.jetzt();
      const ereignis = ereignisAus(angaben, {
        kennung: a.kennung(),
        zeit,
        umgebung: k.umgebung,
        version: k.version,
      });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), fristMs);
      try {
        const antwort = await a.fetchImpl(k.ziel.adresse, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-sentry-envelope',
            'x-sentry-auth': `Sentry sentry_version=7, sentry_key=${k.ziel.schluessel}, sentry_client=${FEHLERBERICHT_KENNUNG}`,
          },
          body: umschlagAus(ereignis, zeit),
          redirect: 'error',
          signal: controller.signal,
        });
        await antwort.body?.cancel().catch(() => undefined);
        if (!antwort.ok) a.warne(`fehlerbericht_abgelehnt_${antwort.status}`);
        return antwort.ok;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      a.warne('fehlerbericht_nicht_gesendet');
      return false;
    }
  };

  return {
    sende,

    async meldeAnfragefehler(fehler, anfrage, kontext) {
      const digest = digestVon(fehler);
      if (digest && STEUERUNG.test(digest)) return;
      const e = fehler instanceof Error ? fehler : new Error(String(fehler));
      if (!lies().ziel) return;
      if (!serverDrossel.erlaubt(`${e.name}|${e.message}|${kontext.routePath}`)) return;
      await sende({
        quelle: 'server',
        typ: e.name,
        meldung: e.message,
        stapel: e.stack,
        route: kontext.routePath,
        methode: anfrage.method,
        art: kontext.routeType,
        digest,
      });
    },

    async empfangeBrowserbericht(anfrage) {
      const herkunft = anfrage.headers.get('origin');
      const host = anfrage.headers.get('host');
      if (herkunft && host) {
        try {
          if (new URL(herkunft).host !== host) return new Response(null, { status: 403 });
        } catch {
          return new Response(null, { status: 403 });
        }
      }
      if (!/^application\/json\b/.test(anfrage.headers.get('content-type') ?? '')) {
        return new Response(null, { status: 415 });
      }
      const text = await liesBegrenzt(anfrage, GRENZEN.browserKoerper);
      if (text === null) return new Response(null, { status: 413 });
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return new Response(null, { status: 400 });
      }
      const bericht = pruefeBrowserbericht(json);
      if (!bericht) return new Response(null, { status: 400 });
      if (istRauschen(bericht) || !lies().ziel) return KEIN_INHALT();
      if (!browserDrossel.erlaubt(`${bericht.typ}|${bericht.meldung}`)) return KEIN_INHALT();
      await sende({
        quelle: 'browser',
        typ: bericht.typ,
        meldung: bericht.meldung,
        stapel: bericht.stapel,
        route: bericht.pfad ? bereinigePfad(bericht.pfad) : undefined,
        art: 'browser',
      });
      return KEIN_INHALT();
    },
  };
}
