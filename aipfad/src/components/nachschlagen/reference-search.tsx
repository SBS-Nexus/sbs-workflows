'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { normalizeForSearch, type ReferenceEntry } from '@/lib/reference-index';

export function ReferenceSearch({ entries }: { entries: ReferenceEntry[] }): React.ReactElement {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const needle = normalizeForSearch(query.trim());
    if (needle.length === 0) return entries;
    return entries.filter((entry) =>
      normalizeForSearch(`${entry.title} ${entry.summary}`).includes(needle),
    );
  }, [entries, query]);

  return (
    <div>
      <label htmlFor="nachschlagen-suche" className="sr-only">
        Suchen
      </label>
      <input
        id="nachschlagen-suche"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="z. B. ls, Token, Kontextfenster …"
        className="w-full min-h-12 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-raised)] px-4 font-mono text-base placeholder:text-[var(--fg-muted)]"
      />

      <p aria-live="polite" className="mt-2 text-sm text-[var(--fg-muted)]">
        {results.length} {results.length === 1 ? 'Treffer' : 'Treffer'}
      </p>

      {results.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nichts gefunden"
            description="Versuch es mit einem kürzeren oder anderen Suchbegriff."
          />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {results.map((entry) => (
            <li key={entry.id} className="py-4">
              <Link href={entry.href} className="group flex items-start justify-between gap-4">
                <span>
                  <span className="font-mono text-base font-semibold group-hover:text-signal-600 dark:group-hover:text-signal-300">
                    {entry.title}
                  </span>
                  <span className="mt-1 block text-sm text-[var(--fg-muted)]">{entry.summary}</span>
                </span>
                <Badge tone="neutral">{entry.kind === 'befehl' ? 'Befehl' : 'Begriff'}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
