import { describe, expect, it, vi } from 'vitest';
import type { PlatformProgressSource } from '@/server/platform/progress-source-http';
import {
  buildTeamSource,
  handleTeamSourceRequest,
  parseTeamAnfrage,
  tagAus,
  TEAM_SOURCE_SCHEMA_VERSION,
  type TeamSourceHandlerDeps,
} from '@/server/platform/team-source-http';

/**
 * E5.2 — Team-Quelle, ohne Datenbank. In PythonPfad, SQLPfad und AIPfad
 * wortgleich: Sie prüft die Grenze (nur Diensttoken, nur POST) und die
 * Datenschutzregeln (Summen ab drei, Einzelwerte nur für Benannte, nur der Tag).
 */

const NOW = new Date('2026-11-26T12:00:00.000Z');

function stand(
  teil: { completed?: number; due?: number; aktiv?: boolean; zuletzt?: string | null } = {},
) {
  return {
    schemaVersion: 1,
    source: 'ai',
    generatedAt: NOW.toISOString(),
    participation: { hasActivity: teil.aktiv ?? true },
    lessons: { completed: teil.completed ?? 2, total: 10 },
    reviews: { due: teil.due ?? 1 },
    concepts: { observed: 3, ready: 1, criterion: 'prerequisite-ready' },
    activity: {
      lastActiveAt: teil.zuletzt === undefined ? '2026-11-25T08:00:00.000Z' : teil.zuletzt,
    },
    projects: { kind: 'unsupported' },
  } as PlatformProgressSource;
}

const anfrage = (mitglieder: Array<[string, boolean]>) =>
  parseTeamAnfrage({
    schemaVersion: TEAM_SOURCE_SCHEMA_VERSION,
    mitglieder: mitglieder.map(([sub, benannt]) => ({ sub, benannt })),
  })!;

describe('Anfrage der Team-Quelle', () => {
  it('nimmt genau das Vertragsformat an', () => {
    expect(
      anfrage([
        ['311', true],
        ['312', false],
      ]).mitglieder,
    ).toHaveLength(2);
    expect(parseTeamAnfrage({ schemaVersion: 1, mitglieder: [] })).toEqual({
      schemaVersion: 1,
      mitglieder: [],
    });
  });

  it.each([
    ['fremde Version', { schemaVersion: 2, mitglieder: [] }],
    ['zusätzliches Feld', { schemaVersion: 1, mitglieder: [], userId: 'x' }],
    [
      'Feld je Person zu viel',
      { schemaVersion: 1, mitglieder: [{ sub: 'a', benannt: true, name: 'Ada' }] },
    ],
    [
      'doppelte Person',
      {
        schemaVersion: 1,
        mitglieder: [
          { sub: 'a', benannt: true },
          { sub: 'a', benannt: false },
        ],
      },
    ],
    ['unzulässige sub', { schemaVersion: 1, mitglieder: [{ sub: 'a b', benannt: true }] }],
    ['benannt kein Wahrheitswert', { schemaVersion: 1, mitglieder: [{ sub: 'a', benannt: 'ja' }] }],
    [
      'mehr als 500 Personen',
      {
        schemaVersion: 1,
        mitglieder: Array.from({ length: 501 }, (_, i) => ({ sub: `s${i}`, benannt: false })),
      },
    ],
    ['kein Objekt', []],
  ])('lehnt ab: %s', (_fall, koerper) => {
    expect(parseTeamAnfrage(koerper)).toBeNull();
  });
});

describe('Datenschutz der Team-Quelle', () => {
  it('gibt unter drei bekannten Personen keine Summen heraus', () => {
    const quelle = buildTeamSource(
      'ai',
      anfrage([
        ['a', false],
        ['b', false],
        ['c', false],
      ]),
      new Map([
        ['a', stand()],
        ['b', stand()],
      ]),
      NOW,
    );
    expect(quelle).toMatchObject({ angefragt: 3, bekannt: 2, summen: null, benannt: [] });
  });

  it('summiert ab drei bekannten Personen, Einzelwerte nur für Benannte', () => {
    const quelle = buildTeamSource(
      'ai',
      anfrage([
        ['a', true],
        ['b', false],
        ['c', false],
        ['unbekannt', true],
      ]),
      new Map([
        ['a', stand({ completed: 4, due: 2 })],
        ['b', stand({ completed: 1, due: 0, aktiv: false, zuletzt: null })],
        ['c', stand({ completed: 3, due: 5 })],
      ]),
      NOW,
    );
    expect(quelle.summen).toEqual({
      personen: 3,
      aktiv: 2,
      lektionen: { abgeschlossen: 8, jePerson: 10 },
      wiederholungenFaellig: 7,
    });
    expect(quelle.benannt).toEqual([
      {
        sub: 'a',
        lektionen: { completed: 4, total: 10 },
        wiederholungenFaellig: 2,
        letzteAktivitaet: '2026-11-25',
      },
    ]);
    // Kein Kompetenzwert, keine Konzepte, keine Uhrzeit verlässt die App.
    expect(JSON.stringify(quelle)).not.toMatch(/concepts|observed|T08:00/);
  });

  it('nennt nur den Tag der letzten Aktivität, in deutscher Zeit', () => {
    expect(tagAus('2026-11-25T23:30:00.000Z')).toBe('2026-11-26');
    expect(tagAus(null)).toBeNull();
    expect(tagAus('kein Datum')).toBeNull();
  });
});

describe('HTTP-Grenze der Team-Quelle', () => {
  const koerper = JSON.stringify({ schemaVersion: 1, mitglieder: [{ sub: 'a', benannt: true }] });
  const deps = (teil: Partial<TeamSourceHandlerDeps> = {}): TeamSourceHandlerDeps => ({
    source: 'ai',
    istDienst: async () => true,
    readTeam: async () => new Map([['a', stand()]]),
    now: () => NOW,
    ...teil,
  });
  const post = (inhalt = koerper) =>
    new Request('https://app.example/api/platform/team-source', { method: 'POST', body: inhalt });

  it('antwortet nur auf POST', async () => {
    const antwort = await handleTeamSourceRequest(new Request('https://app.example/x'), deps());
    expect(antwort.status).toBe(405);
  });

  it('ohne Diensttoken 401, und die Datenbank wird nicht gefragt', async () => {
    const readTeam = vi.fn();
    const antwort = await handleTeamSourceRequest(
      post(),
      deps({ istDienst: async () => false, readTeam }),
    );
    expect(antwort.status).toBe(401);
    expect(readTeam).not.toHaveBeenCalled();
  });

  it('unbrauchbare und zu große Körper werden abgelehnt', async () => {
    expect((await handleTeamSourceRequest(post('kein json'), deps())).status).toBe(400);
    expect((await handleTeamSourceRequest(post(JSON.stringify({ a: 1 })), deps())).status).toBe(
      400,
    );
    expect((await handleTeamSourceRequest(post('x'.repeat(70_000)), deps())).status).toBe(413);
  });

  it('200 ohne Zwischenspeicher und ohne CORS; Lesefehler werden 500 ohne Einzelheiten', async () => {
    const antwort = await handleTeamSourceRequest(post(), deps());
    expect(antwort.status).toBe(200);
    expect(antwort.headers.get('cache-control')).toContain('no-store');
    expect(antwort.headers.get('access-control-allow-origin')).toBeNull();
    expect(await antwort.json()).toMatchObject({ source: 'ai', bekannt: 1, summen: null });

    const onError = vi.fn();
    const fehler = await handleTeamSourceRequest(
      post(),
      deps({
        readTeam: async () => {
          throw new Error('geheim');
        },
        onError,
      }),
    );
    expect(fehler.status).toBe(500);
    expect(await fehler.text()).not.toContain('geheim');
    expect(onError).toHaveBeenCalledWith('platform_team_source_read_failed', expect.any(Error));
  });
});
