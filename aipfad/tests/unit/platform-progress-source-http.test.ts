import { describe, expect, it, vi } from 'vitest';
import {
  PROGRESS_SOURCE_SCHEMA_VERSION,
  ProgressSourceIntegrityError,
  buildPlatformProgressSource,
  handleProgressSourceRequest,
  isValidProgressSourceQuery,
  latestDate,
  type PlatformProgressInput,
  type PlatformProgressSource,
  type PlatformProgressSourceName,
  type ProgressSourceHandlerDeps,
} from '@/server/platform/progress-source-http';

/**
 * LP-07 — HTTP-Grenze und Vertrag der Fortschrittsquelle, ohne Datenbank.
 *
 * Diese Datei ist in PythonPfad, SQLPfad und AIPfad gleich aufgebaut; nur
 * `SOURCE` unterscheidet sich. Sie prüft die Sicherheitsgrenze und die
 * Vertragsregeln, die alle drei Apps teilen.
 */

const SOURCE: PlatformProgressSourceName = 'ai';
const HUB = 'https://lernpfade.example';
const QUELLEN: readonly PlatformProgressSourceName[] = ['python', 'sql', 'ai'];
const ANDERE_QUELLE: PlatformProgressSourceName =
  QUELLEN.find((quelle) => quelle !== SOURCE) ?? 'python';
const NOW = new Date('2026-10-01T12:00:00.000Z');

function eingabe(
  source: PlatformProgressSourceName,
  overrides: Partial<PlatformProgressInput> = {},
): PlatformProgressInput {
  return {
    lessons: { completed: 2, total: 10 },
    startedLessons: 3,
    reviewsDue: 4,
    concepts: { observed: 5, ready: 1 },
    lastActiveAt: new Date('2026-09-30T08:15:00.000Z'),
    projects: source === 'ai' ? null : { done: 1, total: 6 },
    ...overrides,
  };
}

/** Projekte ohne Abschluss — oder keine, wo die App keine kennt. */
function keineProjekte(source: PlatformProgressSourceName): PlatformProgressInput['projects'] {
  return source === 'ai' ? null : { done: 0, total: 6 };
}

function stand(source: PlatformProgressSourceName = SOURCE): PlatformProgressSource {
  return buildPlatformProgressSource(source, eingabe(source), NOW);
}

function deps(overrides: Partial<ProgressSourceHandlerDeps> = {}): ProgressSourceHandlerDeps {
  return {
    source: SOURCE,
    resolveUserId: async () => 'user-eigen',
    readProgress: async () => stand(),
    hubOrigin: () => HUB,
    now: () => NOW,
    ...overrides,
  };
}

function anfrage(query = '', init: RequestInit & { origin?: string } = {}): Request {
  const { origin = HUB, ...rest } = init;
  return new Request(`https://quelle.example/api/platform/progress-source${query}`, {
    ...rest,
    headers: origin ? { origin } : {},
  });
}

describe('Fortschrittsquelle — Vertrag', () => {
  it('liefert nur Aggregate, feste Werte und Zeitstempel — quellgerecht', () => {
    expect(stand('python')).toEqual({
      schemaVersion: PROGRESS_SOURCE_SCHEMA_VERSION,
      source: 'python',
      generatedAt: '2026-10-01T12:00:00.000Z',
      participation: { hasActivity: true },
      lessons: { completed: 2, total: 10 },
      reviews: { due: 4 },
      concepts: { observed: 5, ready: 1, criterion: 'prerequisite-ready' },
      activity: { lastActiveAt: '2026-09-30T08:15:00.000Z' },
      projects: { kind: 'accepted', done: 1, total: 6 },
    });
    expect(stand('sql').concepts.criterion).toBe('all-assessable-tasks-last-passed');
    expect(stand('sql').projects).toEqual({ kind: 'submitted', done: 1, total: 6 });
    expect(stand('ai').concepts.criterion).toBe('prerequisite-ready');
    expect(stand('ai').projects).toEqual({ kind: 'unsupported' });
  });

  it('enthält keine Kennungen, Namen oder Inhalte', () => {
    const text = JSON.stringify(stand());
    for (const verboten of ['userId', 'email', 'name', 'title', 'slug', 'score', 'masteryScore']) {
      expect(text).not.toContain(verboten);
    }
  });

  it('weist widersprüchliche oder unechte Zahlen zurück', () => {
    const falsch: Array<Partial<PlatformProgressInput>> = [
      { lessons: { completed: 11, total: 10 } },
      { lessons: { completed: -1, total: 10 } },
      { lessons: { completed: 1.5, total: 10 } },
      { lessons: { completed: 1, total: Number.NaN } },
      { lessons: { completed: 1, total: Number.POSITIVE_INFINITY } },
      { concepts: { observed: 1, ready: 2 } },
      { reviewsDue: -3 },
      { startedLessons: 0.5 },
      { lastActiveAt: new Date('kein Datum') },
    ];
    for (const overrides of falsch) {
      expect(() => buildPlatformProgressSource(SOURCE, eingabe(SOURCE, overrides), NOW)).toThrow(
        ProgressSourceIntegrityError,
      );
    }
    expect(() =>
      buildPlatformProgressSource(
        'python',
        eingabe('python', { projects: { done: 7, total: 6 } }),
        NOW,
      ),
    ).toThrow(ProgressSourceIntegrityError);
    // Projekte: Pflicht, wo die App sie kennt — verboten, wo nicht.
    expect(() =>
      buildPlatformProgressSource('python', eingabe('python', { projects: null }), NOW),
    ).toThrow(ProgressSourceIntegrityError);
    expect(() =>
      buildPlatformProgressSource('ai', eingabe('ai', { projects: { done: 0, total: 0 } }), NOW),
    ).toThrow(ProgressSourceIntegrityError);
  });

  it('meldet Aktivität nur bei echten Belegen; eine leere Quelle bleibt ehrlich 0', () => {
    const leer = buildPlatformProgressSource(
      SOURCE,
      eingabe(SOURCE, {
        lessons: { completed: 0, total: 10 },
        startedLessons: 0,
        reviewsDue: 0,
        concepts: { observed: 0, ready: 0 },
        lastActiveAt: null,
        projects: keineProjekte(SOURCE),
      }),
      NOW,
    );
    expect(leer.participation.hasActivity).toBe(false);
    expect(leer.activity.lastActiveAt).toBeNull();
    expect(leer.lessons).toEqual({ completed: 0, total: 10 });

    const begonnen = buildPlatformProgressSource(
      SOURCE,
      eingabe(SOURCE, {
        lessons: { completed: 0, total: 10 },
        startedLessons: 1,
        concepts: { observed: 0, ready: 0 },
        lastActiveAt: null,
        projects: keineProjekte(SOURCE),
      }),
      NOW,
    );
    expect(begonnen.participation.hasActivity).toBe(true);
  });

  it('nimmt den spätesten gültigen Zeitpunkt', () => {
    const a = new Date('2026-09-01T00:00:00.000Z');
    const b = new Date('2026-09-02T00:00:00.000Z');
    expect(latestDate(a, null, b, undefined)).toEqual(b);
    expect(latestDate(null, undefined)).toBeNull();
    expect(latestDate(new Date(Number.NaN), a)).toEqual(a);
  });
});

describe('Fortschrittsquelle — HTTP-Grenze', () => {
  it('lehnt eine Anfrage ohne Sitzung mit 401 ab, ohne zu lesen', async () => {
    const readProgress = vi.fn(async () => stand());
    const antwort = await handleProgressSourceRequest(
      anfrage(),
      deps({ resolveUserId: async () => null, readProgress }),
    );
    expect(antwort.status).toBe(401);
    expect(await antwort.json()).toEqual({ error: 'unauthenticated' });
    expect(readProgress).not.toHaveBeenCalled();
  });

  it('liest ausschließlich für die Kennung aus der Sitzung', async () => {
    const readProgress = vi.fn(async () => stand());
    const antwort = await handleProgressSourceRequest(anfrage(), deps({ readProgress }));
    expect(antwort.status).toBe(200);
    expect(await antwort.json()).toEqual(JSON.parse(JSON.stringify(stand())));
    expect(readProgress).toHaveBeenCalledTimes(1);
    expect(readProgress).toHaveBeenCalledWith('user-eigen', { now: NOW });
  });

  it('jeder Abfrageparameter wird abgewiesen — insbesondere eine Kennung', async () => {
    const readProgress = vi.fn(async () => stand());
    for (const query of [
      '?userId=user-fremd',
      '?user_id=user-fremd',
      '?email=a@b.example',
      '?limit=10',
      '?source=sql',
      '?x',
    ]) {
      const antwort = await handleProgressSourceRequest(anfrage(query), deps({ readProgress }));
      expect(antwort.status).toBe(400);
      expect(await antwort.json()).toEqual({ error: 'invalid_request' });
    }
    expect(readProgress).not.toHaveBeenCalled();
    expect(isValidProgressSourceQuery(new URL('https://x/api/platform/progress-source'))).toBe(
      true,
    );
  });

  it('jede Antwort ist privat und nicht zwischenspeicherbar', async () => {
    for (const [query, userId] of [
      ['', 'user-eigen'],
      ['?userId=x', 'user-eigen'],
      ['', null],
    ] as const) {
      const antwort = await handleProgressSourceRequest(
        anfrage(query),
        deps({ resolveUserId: async () => userId }),
      );
      const cache = antwort.headers.get('cache-control') ?? '';
      expect(cache).toContain('private');
      expect(cache).toContain('no-store');
      expect(cache).toContain('max-age=0');
      expect(antwort.headers.get('vary')).toContain('Origin');
      expect(antwort.headers.get('vary')).toContain('Cookie');
    }
  });

  it('gibt CORS nur für genau die konfigurierte Hub-Origin frei', async () => {
    const passend = await handleProgressSourceRequest(anfrage(), deps());
    expect(passend.headers.get('access-control-allow-origin')).toBe(HUB);
    expect(passend.headers.get('access-control-allow-credentials')).toBe('true');

    for (const origin of [
      'https://evil.example',
      'https://lernpfade.example.evil.example',
      'null',
    ]) {
      const fremd = await handleProgressSourceRequest(anfrage('', { origin }), deps());
      expect(fremd.headers.get('access-control-allow-origin')).toBeNull();
      expect(fremd.headers.get('access-control-allow-credentials')).toBeNull();
    }

    const ohneKonfiguration = await handleProgressSourceRequest(
      anfrage(),
      deps({ hubOrigin: () => '' }),
    );
    expect(ohneKonfiguration.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('verrät bei Fehlern keine Interna', async () => {
    const onError = vi.fn();
    const geheim = 'connect ECONNREFUSED 10.0.0.5:5432 /var/task/src/server/db/prisma.ts';
    for (const overrides of [
      { readProgress: async () => Promise.reject(new Error(geheim)) },
      { resolveUserId: async () => Promise.reject(new Error(geheim)) },
      {
        hubOrigin: () => {
          throw new Error(geheim);
        },
      },
    ] satisfies Array<Partial<ProgressSourceHandlerDeps>>) {
      const antwort = await handleProgressSourceRequest(anfrage(), deps({ ...overrides, onError }));
      expect(antwort.status).toBe(500);
      const text = await antwort.text();
      expect(text).toBe(JSON.stringify({ error: 'unavailable' }));
      expect(text).not.toContain('ECONNREFUSED');
    }
    expect(onError).toHaveBeenCalledTimes(3);
  });

  it('weist eine Antwort mit falscher Quelle oder Version zurück', async () => {
    const falscheQuelle = { ...stand(), source: ANDERE_QUELLE };
    const erste = await handleProgressSourceRequest(
      anfrage(),
      deps({ readProgress: async () => falscheQuelle }),
    );
    expect(erste.status).toBe(500);

    const falscheVersion = { ...stand(), schemaVersion: 2 } as unknown as PlatformProgressSource;
    const zweite = await handleProgressSourceRequest(
      anfrage(),
      deps({ readProgress: async () => falscheVersion }),
    );
    expect(zweite.status).toBe(500);
  });

  it('nur GET; andere Methoden werden abgewiesen, ohne zu lesen', async () => {
    const readProgress = vi.fn(async () => stand());
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const antwort = await handleProgressSourceRequest(
        anfrage('', { method }),
        deps({ readProgress }),
      );
      expect(antwort.status).toBe(405);
    }
    expect(readProgress).not.toHaveBeenCalled();
  });
});
