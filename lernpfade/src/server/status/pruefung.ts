import { bewerte, gesamt, type Dienst, type Statusbericht } from '../../domain/status/status.ts';

/**
 * E6.2 — Prüfungen der Statusseite. Jede Prüfung ist eine Funktion, die
 * `true` liefert, wenn der Dienst arbeitet; alle laufen parallel mit eigener
 * Frist. Das Ergebnis wird kurz zwischengespeichert, damit die Statusseite
 * die Dienste nicht bei jedem Aufruf belastet.
 *
 * Nach außen geht nur Dienst, Zustand und Antwortzeit, nie eine Fehlermeldung.
 */

export type Pruefung = { id: string; name: string; kritisch: boolean; pruefe: (signal: AbortSignal) => Promise<boolean> };

export const FRIST_MS = 5000;
export const ZWISCHENSPEICHER_MS = 30_000;

export async function pruefeAlle(
  pruefungen: readonly Pruefung[],
  jetzt: () => number = Date.now,
  fristMs = FRIST_MS,
): Promise<Statusbericht> {
  const dienste = await Promise.all(
    pruefungen.map(async (p): Promise<Dienst> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), fristMs);
      const beginn = jetzt();
      let ok = false;
      try {
        ok = await p.pruefe(controller.signal);
      } catch {
        ok = false;
      } finally {
        clearTimeout(timer);
      }
      const ms = jetzt() - beginn;
      return { id: p.id, name: p.name, kritisch: p.kritisch, status: bewerte(ok, ms), ms: ok ? ms : null };
    }),
  );
  return { gesamt: gesamt(dienste), geprueftAm: new Date(jetzt()).toISOString(), dienste };
}

type FetchLike = (adresse: string, init: RequestInit) => Promise<Response>;

/** Prüfung über HTTP: 2xx innerhalb der Frist, ohne Weiterleitung. */
export function httpPruefung(
  id: string,
  name: string,
  kritisch: boolean,
  adresse: string,
  fetchImpl: FetchLike,
): Pruefung {
  return {
    id,
    name,
    kritisch,
    pruefe: async (signal) => {
      const antwort = await fetchImpl(adresse, {
        method: 'GET',
        cache: 'no-store',
        redirect: 'error',
        headers: { accept: 'application/json, text/html' },
        signal,
      });
      // Den Körper verwerfen, damit die Verbindung frei wird.
      await antwort.body?.cancel().catch(() => undefined);
      return antwort.ok;
    },
  };
}

let gespeichert: { bericht: Statusbericht; bis: number } | null = null;

/** Mit Zwischenspeicher: höchstens alle 30 Sekunden eine echte Prüfung. */
export async function statusbericht(
  pruefungen: () => readonly Pruefung[],
  jetzt: () => number = Date.now,
): Promise<Statusbericht> {
  if (gespeichert && gespeichert.bis > jetzt()) return gespeichert.bericht;
  const bericht = await pruefeAlle(pruefungen(), jetzt);
  gespeichert = { bericht, bis: jetzt() + ZWISCHENSPEICHER_MS };
  return bericht;
}

/** Nur für Tests. */
export function leereZwischenspeicher(): void {
  gespeichert = null;
}
