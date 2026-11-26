/**
 * E5.2 — Vertrag der Team-Quelle, Seite des Hubs (docs/E5-PLAN.md).
 *
 * Gegenstück zu `src/server/platform/team-source-http.ts` in den Apps
 * (scripts/check-platform-sources.mjs vergleicht Version und Quellnamen).
 * Streng geprüft: Eine Antwort mit fremden Feldern, Summen unter drei
 * Personen oder Einzelwerten für nicht benannte Personen gilt als ungültig
 * und wird nicht angezeigt. Lieber „nicht verfügbar“ als eine Datenpanne.
 */

export const TEAM_SOURCES = ['python', 'sql', 'ai'] as const;
export type TeamSourceName = (typeof TEAM_SOURCES)[number];

export const TEAM_SOURCE_SCHEMA_VERSION = 1;
export const SUMMEN_AB = 3;
const MAX_ZAHL = 1_000_000;

export type TeamSummen = {
  personen: number;
  aktiv: number;
  lektionen: { abgeschlossen: number; jePerson: number };
  wiederholungenFaellig: number;
};

export type TeamBenannt = {
  sub: string;
  lektionen: { completed: number; total: number };
  wiederholungenFaellig: number;
  letzteAktivitaet: string | null;
};

export type TeamQuelle = {
  source: TeamSourceName;
  generatedAt: string;
  angefragt: number;
  bekannt: number;
  summen: TeamSummen | null;
  benannt: TeamBenannt[];
};

export class TeamQuellenFehler extends Error {
  constructor(meldung: string) {
    super(meldung);
    this.name = 'TeamQuellenFehler';
  }
}

function fehl(meldung: string): never {
  throw new TeamQuellenFehler(meldung);
}

function objekt(wert: unknown, felder: readonly string[], name: string): Record<string, unknown> {
  if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) fehl(`${name} ist kein Objekt`);
  const o = wert as Record<string, unknown>;
  if (Object.keys(o).sort().join(',') !== [...felder].sort().join(',')) fehl(`${name}: Felder passen nicht`);
  return o;
}

function zahl(wert: unknown, name: string): number {
  if (typeof wert !== 'number' || !Number.isInteger(wert) || wert < 0 || wert > MAX_ZAHL) fehl(`${name} ist keine Anzahl`);
  return wert;
}

const TAG = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Prüft die Antwort einer App gegen das, was der Hub angefragt hat:
 * `benanntErlaubt` sind die `sub` mit Einwilligung, `angefragt` die Anzahl.
 */
export function pruefeTeamQuelle(
  koerper: unknown,
  erwartet: { source: TeamSourceName; angefragt: number; benanntErlaubt: ReadonlySet<string> },
): TeamQuelle {
  const o = objekt(
    koerper,
    ['schemaVersion', 'source', 'generatedAt', 'angefragt', 'bekannt', 'summen', 'benannt'],
    'Antwort',
  );
  if (o.schemaVersion !== TEAM_SOURCE_SCHEMA_VERSION) fehl('fremde Version');
  if (o.source !== erwartet.source) fehl('fremde Quelle');
  if (typeof o.generatedAt !== 'string' || Number.isNaN(Date.parse(o.generatedAt))) fehl('generatedAt');
  const angefragt = zahl(o.angefragt, 'angefragt');
  const bekannt = zahl(o.bekannt, 'bekannt');
  if (angefragt !== erwartet.angefragt || bekannt > angefragt) fehl('Anzahl passt nicht zur Anfrage');

  let summen: TeamSummen | null = null;
  if (o.summen !== null) {
    const s = objekt(o.summen, ['personen', 'aktiv', 'lektionen', 'wiederholungenFaellig'], 'summen');
    const l = objekt(s.lektionen, ['abgeschlossen', 'jePerson'], 'summen.lektionen');
    summen = {
      personen: zahl(s.personen, 'summen.personen'),
      aktiv: zahl(s.aktiv, 'summen.aktiv'),
      lektionen: { abgeschlossen: zahl(l.abgeschlossen, 'abgeschlossen'), jePerson: zahl(l.jePerson, 'jePerson') },
      wiederholungenFaellig: zahl(s.wiederholungenFaellig, 'summen.wiederholungenFaellig'),
    };
    if (summen.personen !== bekannt || summen.personen < SUMMEN_AB) fehl('Summen unter drei Personen');
    if (summen.aktiv > summen.personen) fehl('mehr Aktive als Personen');
    if (summen.lektionen.abgeschlossen > summen.personen * summen.lektionen.jePerson) fehl('Lektionen');
  }

  if (!Array.isArray(o.benannt) || o.benannt.length > bekannt) fehl('benannt');
  const gesehen = new Set<string>();
  const benannt = o.benannt.map((eintrag, i): TeamBenannt => {
    const b = objekt(eintrag, ['sub', 'lektionen', 'wiederholungenFaellig', 'letzteAktivitaet'], `benannt[${i}]`);
    if (typeof b.sub !== 'string' || !erwartet.benanntErlaubt.has(b.sub) || gesehen.has(b.sub)) {
      fehl('Einzelwerte für eine Person ohne Einwilligung');
    }
    gesehen.add(b.sub);
    const l = objekt(b.lektionen, ['completed', 'total'], `benannt[${i}].lektionen`);
    const completed = zahl(l.completed, 'completed');
    const total = zahl(l.total, 'total');
    if (completed > total) fehl('mehr Lektionen als vorhanden');
    if (b.letzteAktivitaet !== null && (typeof b.letzteAktivitaet !== 'string' || !TAG.test(b.letzteAktivitaet))) {
      fehl('letzte Aktivität ist kein Tag');
    }
    return {
      sub: b.sub,
      lektionen: { completed, total },
      wiederholungenFaellig: zahl(b.wiederholungenFaellig, 'wiederholungenFaellig'),
      letzteAktivitaet: b.letzteAktivitaet as string | null,
    };
  });

  return { source: erwartet.source, generatedAt: o.generatedAt, angefragt, bekannt, summen, benannt };
}
