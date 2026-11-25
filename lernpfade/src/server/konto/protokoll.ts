/**
 * Eine JSON-Zeile je Ereignis, wie in den Apps (`zentral-protokoll.ts`):
 * Railway liest `level`, `message` und die übrigen Felder als Attribute.
 * Nie Token, Adressen oder Inhalte hineinschreiben.
 */
export type Stufe = 'info' | 'warn' | 'error';

export function protokoll(
  bereich: string,
  stufe: Stufe,
  meldung: string,
  felder: Record<string, unknown> = {},
): void {
  const zeile = JSON.stringify({ level: stufe, message: meldung, bereich, ...felder });
  if (stufe === 'error') console.error(zeile);
  else if (stufe === 'warn') console.warn(zeile);
  else console.info(zeile);
}
