import { z } from 'zod';

/**
 * Offline-Lehrmodell für JSON-Ausgaben und Tool-Calling.
 * Diese Funktionen bewerten Daten. Sie führen NIEMALS ein Werkzeug aus.
 * Ein echter Agent braucht Authentifizierung, Berechtigungen, Audit und
 * eine getrennte Ausführungsgrenze; diese Funktionen ersetzen das nicht.
 */
const ausgabeSchema = z
  .object({
    antwort: z.string().min(3).max(240),
    status: z.enum(['belegt', 'nicht-belegt']),
    belegId: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .nullable(),
  })
  .strict()
  .superRefine((wert, ctx) => {
    if (wert.status === 'belegt' && wert.belegId === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['belegId'],
        message: 'Eine belegte Antwort braucht eine Beleg-ID.',
      });
    }
    if (wert.status === 'nicht-belegt' && wert.belegId !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['belegId'],
        message: 'Ohne Beleg darf keine Beleg-ID angegeben werden.',
      });
    }
  });

const toolAufrufSchema = z
  .object({
    werkzeug: z.string().min(1).max(80),
    argumente: z.record(z.string(), z.unknown()),
  })
  .strict();

const nurLesen = z.object({ suchbegriff: z.string().trim().min(3).max(80) }).strict();

export interface PruefResultat {
  ok: boolean;
  meldungen: string[];
  /** Nur ein didaktisches Urteil. Es gibt KEINE Aktion oder Tool-Ausführung. */
  urteil: string;
}

/** Kennungen wie __proto__ müssen vor Zod auf dem Roh-JSON abgefangen werden. */
class VerbotenerJsonSchluessel extends Error {}

function parseJson(text: unknown): { wert?: unknown; fehler?: string } {
  if (typeof text !== 'string' || text.length > 2000) {
    return { fehler: 'Die Eingabe muss ein Text mit höchstens 2.000 Zeichen sein.' };
  }
  try {
    const wert = JSON.parse(text, (schluessel: string, inhalt: unknown): unknown => {
      if (schluessel === '__proto__') throw new VerbotenerJsonSchluessel();
      return inhalt;
    }) as unknown;
    return { wert };
  } catch (fehler) {
    if (fehler instanceof VerbotenerJsonSchluessel) {
      return { fehler: 'Nicht erlaubter JSON-Schlüssel "__proto__" (auch in verschachtelten Objekten).' };
    }
    return { fehler: 'Ungültiges JSON: Der Text lässt sich nicht als JSON lesen.' };
  }
}

export function pruefeStrukturierteAusgabe(text: unknown): PruefResultat {
  const parsed = parseJson(text);
  if (parsed.fehler) return { ok: false, meldungen: [parsed.fehler], urteil: 'Ausgabe abgelehnt' };
  const ergebnis = ausgabeSchema.safeParse(parsed.wert);
  if (!ergebnis.success) {
    return {
      ok: false,
      meldungen: ergebnis.error.issues.map(
        (i) => (i.path.join('.') || 'Objekt') + ': ' + i.message,
      ),
      urteil: 'Ausgabe abgelehnt',
    };
  }
  return {
    ok: true,
    meldungen: ['Alle vorgesehenen Felder und die Belegregel stimmen.'],
    urteil: 'Struktur gültig – die faktische Richtigkeit ist damit NICHT bewiesen',
  };
}

export function pruefeSimuliertenToolAufruf(text: unknown): PruefResultat {
  const parsed = parseJson(text);
  if (parsed.fehler) return { ok: false, meldungen: [parsed.fehler], urteil: 'Aufruf abgelehnt' };
  const ergebnis = toolAufrufSchema.safeParse(parsed.wert);
  if (!ergebnis.success) {
    return {
      ok: false,
      meldungen: ergebnis.error.issues.map(
        (i) => (i.path.join('.') || 'Aufruf') + ': ' + i.message,
      ),
      urteil: 'Aufruf abgelehnt',
    };
  }
  if (ergebnis.data.werkzeug !== 'suche_richtlinie') {
    return {
      ok: false,
      meldungen: [
        'Das Werkzeug ist nicht auf der erlaubten Leseliste. Schreibaktionen werden niemals simuliert.',
      ],
      urteil: 'Aufruf abgelehnt – keine Ausführung',
    };
  }
  const argumente = nurLesen.safeParse(ergebnis.data.argumente);
  if (!argumente.success) {
    return {
      ok: false,
      meldungen: argumente.error.issues.map(
        (i) => (i.path.join('.') || 'argumente') + ': ' + i.message,
      ),
      urteil: 'Aufruf abgelehnt – Argumentvertrag verletzt',
    };
  }
  return {
    ok: true,
    meldungen: [
      'Werkzeug und Argumente erfüllen den Lesekontrakt. Kein externer Dienst wurde aufgerufen.',
    ],
    urteil: 'Aufruf formal erlaubt (Simulation ohne Ausführung)',
  };
}
