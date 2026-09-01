import { concepts } from '@/content/concepts';
import { SETUP_SECTIONS } from '@/content/setup-commands';

/**
 * Flacher Suchindex für /nachschlagen. Fasst Terminalbefehle und
 * AI-Begriffe zu einer gemeinsamen, durchsuchbaren Liste zusammen — dieselbe
 * Idee wie PythonPfads Befehlspalette, hier als eigene Nachschlage-Seite statt
 * als Overlay, weil AIPfad noch keine große Zahl an Bibliotheksseiten hat, für
 * die sich ein globales Cmd+K-Overlay bereits lohnt.
 */

export interface ReferenceEntry {
  id: string;
  kind: 'befehl' | 'begriff';
  title: string;
  summary: string;
  href: string;
}

/** Entfernt Diakritika für eine tolerante Suche (z. B. "ausfuhren" → "ausführen" findet). */
export function normalizeForSearch(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function buildReferenceIndex(): ReferenceEntry[] {
  const commandEntries: ReferenceEntry[] = SETUP_SECTIONS.flatMap((section) =>
    section.commands.map((command) => ({
      id: `befehl-${command.command}`,
      kind: 'befehl' as const,
      title: command.command,
      summary: command.description,
      href: `/setup#abschnitt-${section.slug}`,
    })),
  );

  const conceptEntries: ReferenceEntry[] = concepts.map((concept) => ({
    id: `begriff-${concept.slug}`,
    kind: 'begriff' as const,
    title: concept.name,
    summary: concept.description,
    href: `/glossar#${concept.slug}`,
  }));

  return [...commandEntries, ...conceptEntries];
}
