import { describe, expect, it, vi } from 'vitest';
import {
  REVIEW_SOURCE_MAX_LIMIT,
  buildPlatformReviewBatch,
  handleReviewSourceRequest,
  isAllowedHubOriginSetting,
  parseReviewSourceQuery,
  ReviewSourceIntegrityError,
  type PlatformReviewBatch,
  type PlatformReviewSourceKind,
  type PlatformReviewSourceName,
  type ReviewSourceHandlerDeps,
} from '@/server/platform/review-source-http';

/**
 * LP-05B — HTTP-Grenze der Wiederholungsquelle, ohne Datenbank.
 *
 * Diese Datei ist in PythonPfad, SQLPfad und AIPfad gleich aufgebaut; sie
 * prüft die Sicherheitsgrenze, die alle drei Apps teilen.
 */

const SOURCE = 'ai' as const;
const KIND = 'exercise' as const;
const HUB = 'https://lernpfade.example';
const QUELLEN: readonly PlatformReviewSourceName[] = ['python', 'sql', 'ai'];
const ANDERE_QUELLE: PlatformReviewSourceName =
  QUELLEN.find((quelle) => quelle !== SOURCE) ?? 'python';
const ARTEN: readonly PlatformReviewSourceKind[] = ['exercise', 'concept'];
const FALSCHE_ART: PlatformReviewSourceKind = ARTEN.find((art) => art !== KIND) ?? 'concept';
const NOW = new Date('2026-10-01T12:00:00.000Z');

function leererStapel(): PlatformReviewBatch {
  return buildPlatformReviewBatch(SOURCE, {
    items: [],
    truncated: false,
    nextDueAt: null,
    now: NOW,
  });
}

function deps(overrides: Partial<ReviewSourceHandlerDeps> = {}): ReviewSourceHandlerDeps {
  return {
    source: SOURCE,
    resolveUserId: async () => 'user-eigen',
    readBatch: async () => leererStapel(),
    hubOrigin: () => HUB,
    now: () => NOW,
    ...overrides,
  };
}

function anfrage(query = '', init: RequestInit & { origin?: string } = {}): Request {
  const { origin = HUB, ...rest } = init;
  return new Request(`https://quelle.example/api/platform/review-source${query}`, {
    ...rest,
    headers: origin ? { origin } : {},
  });
}

describe('Wiederholungsquelle — HTTP-Grenze', () => {
  it('lehnt eine Anfrage ohne Sitzung mit 401 ab, ohne zu lesen', async () => {
    const readBatch = vi.fn(async () => leererStapel());
    const antwort = await handleReviewSourceRequest(
      anfrage(),
      deps({ resolveUserId: async () => null, readBatch }),
    );
    expect(antwort.status).toBe(401);
    expect(await antwort.json()).toEqual({ error: 'unauthenticated' });
    expect(readBatch).not.toHaveBeenCalled();
  });

  it('liest ausschließlich für die Kennung aus der Sitzung', async () => {
    const readBatch = vi.fn(async () => leererStapel());
    const antwort = await handleReviewSourceRequest(anfrage('?limit=7'), deps({ readBatch }));
    expect(antwort.status).toBe(200);
    expect(readBatch).toHaveBeenCalledTimes(1);
    expect(readBatch).toHaveBeenCalledWith('user-eigen', { limit: 7, now: NOW });
  });

  it('eine browsergelieferte userId kann den Umfang nicht ändern — sie wird abgewiesen', async () => {
    const readBatch = vi.fn(async () => leererStapel());
    for (const query of [
      '?userId=user-fremd',
      '?limit=5&userId=user-fremd',
      '?user_id=user-fremd',
      '?sub=user-fremd',
    ]) {
      const antwort = await handleReviewSourceRequest(anfrage(query), deps({ readBatch }));
      expect(antwort.status).toBe(400);
      expect(await antwort.json()).toEqual({ error: 'invalid_request' });
    }
    expect(readBatch).not.toHaveBeenCalled();
  });

  it('prüft das Limit streng: ganze Zahl, 1 bis Obergrenze, genau einmal', async () => {
    expect(parseReviewSourceQuery(new URL('https://x/?'))).toEqual({ ok: true, limit: 10 });
    expect(parseReviewSourceQuery(new URL(`https://x/?limit=${REVIEW_SOURCE_MAX_LIMIT}`))).toEqual({
      ok: true,
      limit: REVIEW_SOURCE_MAX_LIMIT,
    });
    for (const wert of ['0', '-1', '1.5', '26', '1e2', 'abc', '', '007', '99999999']) {
      expect(parseReviewSourceQuery(new URL(`https://x/?limit=${wert}`))).toEqual({ ok: false });
    }
    expect(parseReviewSourceQuery(new URL('https://x/?limit=1&limit=2'))).toEqual({ ok: false });

    const antwort = await handleReviewSourceRequest(anfrage('?limit=1000'), deps());
    expect(antwort.status).toBe(400);
  });

  it('jede Antwort ist privat und nicht zwischenspeicherbar', async () => {
    for (const [query, userId] of [
      ['', 'user-eigen'],
      ['?limit=0', 'user-eigen'],
      ['', null],
    ] as const) {
      const antwort = await handleReviewSourceRequest(
        anfrage(query),
        deps({ resolveUserId: async () => userId }),
      );
      const cache = antwort.headers.get('cache-control') ?? '';
      expect(cache).toContain('private');
      expect(cache).toContain('no-store');
      expect(antwort.headers.get('vary')).toContain('Origin');
      expect(antwort.headers.get('vary')).toContain('Cookie');
    }
  });

  it('gibt CORS nur für genau die konfigurierte Hub-Origin frei', async () => {
    const passend = await handleReviewSourceRequest(anfrage(), deps());
    expect(passend.headers.get('access-control-allow-origin')).toBe(HUB);
    expect(passend.headers.get('access-control-allow-credentials')).toBe('true');

    for (const origin of [
      'https://evil.example',
      'https://lernpfade.example.evil.example',
      'null',
    ]) {
      const fremd = await handleReviewSourceRequest(anfrage('', { origin }), deps());
      expect(fremd.headers.get('access-control-allow-origin')).toBeNull();
      expect(fremd.headers.get('access-control-allow-credentials')).toBeNull();
    }

    const ohneKonfiguration = await handleReviewSourceRequest(
      anfrage(),
      deps({ hubOrigin: () => '' }),
    );
    expect(ohneKonfiguration.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('verrät bei Fehlern keine Interna', async () => {
    const onError = vi.fn();
    const geheim = 'connect ECONNREFUSED 10.0.0.5:5432 /var/task/src/server/db/prisma.ts';
    for (const overrides of [
      { readBatch: async () => Promise.reject(new Error(geheim)) },
      { resolveUserId: async () => Promise.reject(new Error(geheim)) },
      {
        hubOrigin: () => {
          throw new Error(geheim);
        },
      },
    ] satisfies Array<Partial<ReviewSourceHandlerDeps>>) {
      const antwort = await handleReviewSourceRequest(anfrage(), deps({ ...overrides, onError }));
      expect(antwort.status).toBe(500);
      const text = await antwort.text();
      expect(text).toBe(JSON.stringify({ error: 'unavailable' }));
      expect(text).not.toContain('ECONNREFUSED');
    }
    expect(onError).toHaveBeenCalledTimes(3);
  });

  it('weist eine Antwort zurück, die mehr liefert als erbeten oder die falsche Quelle nennt', async () => {
    const zuViel = buildPlatformReviewBatch(SOURCE, {
      items: [1, 2, 3].map((n) => ({
        sourceKind: KIND,
        sourceItemId: `id-${n}`,
        conceptIds: [`id-${n}`],
        title: 'T',
        prompt: 'P',
        answer: 'A',
        dueAt: NOW,
      })),
      truncated: false,
      nextDueAt: null,
      now: NOW,
    });
    const antwort = await handleReviewSourceRequest(
      anfrage('?limit=2'),
      deps({ readBatch: async () => zuViel }),
    );
    expect(antwort.status).toBe(500);

    const falscheQuelle: PlatformReviewBatch = { ...leererStapel(), source: ANDERE_QUELLE };
    const zweite = await handleReviewSourceRequest(
      anfrage(),
      deps({ readBatch: async () => falscheQuelle }),
    );
    expect(zweite.status).toBe(500);
  });

  it('GET hat keine Schreibwirkung; andere Methoden werden abgewiesen', async () => {
    const readBatch = vi.fn(async () => leererStapel());
    const resolveUserId = vi.fn(async () => 'user-eigen');
    const antwort = await handleReviewSourceRequest(
      anfrage('', { method: 'POST' }),
      deps({ readBatch, resolveUserId }),
    );
    expect(antwort.status).toBe(405);
    expect(readBatch).not.toHaveBeenCalled();
  });
});

describe('Wiederholungsquelle — Vertrag', () => {
  it(`erzwingt die kanonische Identität (${KIND}) und ISO-Zeitpunkte`, () => {
    const stapel = buildPlatformReviewBatch(SOURCE, {
      items: [
        {
          sourceKind: KIND,
          sourceItemId: 'id-1',
          conceptIds: ['id-1'],
          title: ' Titel ',
          prompt: 'Frage',
          answer: 'Konzept',
          dueAt: new Date('2026-09-30T08:00:00Z'),
          repetition: 1,
          reason: 'Plan',
        },
      ],
      truncated: true,
      nextDueAt: new Date('2026-10-02T08:00:00Z'),
      now: NOW,
    });
    expect(stapel.schemaVersion).toBe(1);
    expect(stapel.items[0]).toMatchObject({
      source: SOURCE,
      sourceKind: KIND,
      sourceItemId: 'id-1',
      title: 'Titel',
      dueAt: '2026-09-30T08:00:00.000Z',
    });
    expect(stapel.nextDueAt).toBe('2026-10-02T08:00:00.000Z');
    expect(stapel.truncated).toBe(true);

    expect(() =>
      buildPlatformReviewBatch(SOURCE, {
        items: [
          {
            sourceKind: FALSCHE_ART,
            sourceItemId: 'x',
            conceptIds: ['x'],
            title: 'T',
            prompt: 'P',
            answer: 'A',
            dueAt: NOW,
          },
        ],
        truncated: false,
        nextDueAt: null,
        now: NOW,
      }),
    ).toThrow(ReviewSourceIntegrityError);
  });

  it('schlägt bei leerem Text, ungültigem Datum oder überlanger Kennung geschlossen fehl', () => {
    const basis = {
      sourceKind: KIND,
      sourceItemId: 'id',
      conceptIds: ['id'],
      title: 'T',
      prompt: 'P',
      answer: 'A',
      dueAt: NOW,
    };
    for (const kaputt of [
      { ...basis, prompt: '   ' },
      { ...basis, answer: '' },
      { ...basis, dueAt: new Date(Number.NaN) },
      { ...basis, sourceItemId: 'x'.repeat(201), conceptIds: ['x'.repeat(201)] },
      { ...basis, repetition: -1 },
    ]) {
      expect(() =>
        buildPlatformReviewBatch(SOURCE, {
          items: [kaputt],
          truncated: false,
          nextDueAt: null,
          now: NOW,
        }),
      ).toThrow(ReviewSourceIntegrityError);
    }
  });

  it('akzeptiert als Hub-Origin nur eine einzelne exakte Origin', () => {
    expect(isAllowedHubOriginSetting('')).toBe(true);
    expect(isAllowedHubOriginSetting('https://lernpfade.example')).toBe(true);
    expect(isAllowedHubOriginSetting('http://localhost:3010')).toBe(true);
    for (const wert of [
      '*',
      'https://lernpfade.example/',
      'https://lernpfade.example/wiederholen',
      'http://lernpfade.example',
      'https://a.example,https://b.example',
      'lernpfade.example',
    ]) {
      expect(isAllowedHubOriginSetting(wert)).toBe(false);
    }
  });
});
