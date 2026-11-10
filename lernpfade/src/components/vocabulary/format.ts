import type { DeckOrigin } from '@/domain/vocabulary/model';

const DATE_TIME = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

export function originLabel(origin: DeckOrigin): string {
  if (origin.kind === 'self') return 'Selbst erstellt';
  if (origin.kind === 'starter') return origin.label;
  return `Importiert · Herkunft laut Datei: ${origin.label}`;
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
