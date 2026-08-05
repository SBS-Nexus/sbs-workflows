'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/dialog';
import { Kbd, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { useToast } from '@/components/ui/toast';
import { cycleTheme, THEME_LABELS, toggleReduceMotion } from '@/lib/preferences/appearance';
import { rankEntries, splitByRanges, type MatchRange } from '@/lib/search/fuzzy';
import type { CommandAction, CommandEntry, CommandGroup } from '@/lib/search/command-index';

/**
 * Befehlspalette und Tastaturbedienung.
 *
 * Warum überhaupt: Die Anwendung hat inzwischen gut ein Dutzend Bereiche und
 * über sechzig Aufgaben. Wer weiß, wohin er will, soll nicht klicken müssen.
 * Wer es nicht weiß, verliert nichts – jede Funktion bleibt vollständig über
 * die sichtbare Navigation erreichbar. Die Palette ist eine Abkürzung, keine
 * Voraussetzung.
 *
 * Bedienung:
 *   Strg/Cmd + K   Palette öffnen
 *   ?              Übersicht der Tastaturkürzel
 *   g dann l/u/p/w/f/c   direkt in einen Bereich springen
 *
 * Die Sprungfolgen greifen nur, wenn der Fokus nicht in einem Eingabefeld
 * liegt. Sonst könnte niemand mehr ein Wort mit „g" tippen.
 */

interface CommandCenterApi {
  openPalette: () => void;
  openShortcuts: () => void;
}

const CommandCenterContext = createContext<CommandCenterApi | null>(null);

export function useCommandCenter(): CommandCenterApi {
  const context = useContext(CommandCenterContext);
  if (!context) {
    throw new Error('useCommandCenter benötigt einen CommandCenterProvider weiter oben im Baum.');
  }
  return context;
}

/** Ziele der Sprungfolge „g dann Taste". */
const JUMP_TARGETS: Readonly<Record<string, { href: string; label: string }>> = {
  l: { href: '/lernen', label: 'Lernen' },
  u: { href: '/ueben', label: 'Üben' },
  p: { href: '/projekte', label: 'Projekte' },
  w: { href: '/wiederholen', label: 'Wiederholen' },
  f: { href: '/fortschritt', label: 'Fortschritt' },
  c: { href: '/labor', label: 'Code-Labor' },
};

/** Zeitfenster für den zweiten Tastendruck einer Sprungfolge. */
const CHORD_WINDOW_MS = 1_500;

const RECENT_STORAGE_KEY = 'pythonpfad-palette-verlauf';
const RECENT_LIMIT = 5;

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  // CodeMirror bekommt seinen Inhalt über ein contenteditable, das je nach
  // Version verschachtelt liegt – deshalb zusätzlich der Vorfahrenblick.
  return target.closest('.cm-editor') !== null;
}

export function CommandCenterProvider({
  entries,
  children,
}: {
  entries: readonly CommandEntry[];
  children: ReactNode;
}): ReactNode {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const router = useRouter();
  const { notify } = useToast();
  const chordArmedAt = useRef<number | null>(null);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const api = useMemo<CommandCenterApi>(
    () => ({ openPalette, openShortcuts }),
    [openPalette, openShortcuts],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return;

      // Strg/Cmd + K – auch aus Eingabefeldern heraus, das ist die
      // Erwartungshaltung aus anderen Werkzeugen.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextEntry(event.target)) return;

      if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (event.key === 'g') {
        chordArmedAt.current = Date.now();
        return;
      }

      const armedAt = chordArmedAt.current;
      if (armedAt !== null) {
        chordArmedAt.current = null;
        if (Date.now() - armedAt <= CHORD_WINDOW_MS) {
          const target = JUMP_TARGETS[event.key.toLowerCase()];
          if (target) {
            event.preventDefault();
            router.push(target.href);
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  const runAction = useCallback(
    (action: CommandAction): void => {
      if (action === 'toggle-theme') {
        const next = cycleTheme();
        notify(`Farbschema: ${THEME_LABELS[next]}`, { tone: 'info', durationMs: 2_500 });
        return;
      }
      if (action === 'toggle-motion') {
        const reduced = toggleReduceMotion();
        notify(reduced ? 'Bewegung wird reduziert.' : 'Bewegung wieder normal.', {
          tone: 'info',
          durationMs: 2_500,
        });
        return;
      }
      setShortcutsOpen(true);
    },
    [notify],
  );

  return (
    <CommandCenterContext.Provider value={api}>
      {children}
      {/*
       * Die Palette wird erst beim Öffnen eingehängt und beim Schließen wieder
       * ausgehängt. Dadurch beginnt jedes Öffnen mit leerem Suchfeld und
       * frisch gelesenem Verlauf, ohne dass ein Effekt den Zustand
       * nachträglich zurücksetzen müsste.
       */}
      {paletteOpen ? (
        <CommandPalette
          entries={entries}
          onClose={() => setPaletteOpen(false)}
          onNavigate={(href) => {
            setPaletteOpen(false);
            router.push(href);
          }}
          onAction={(action) => {
            setPaletteOpen(false);
            runAction(action);
          }}
        />
      ) : null}
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </CommandCenterContext.Provider>
  );
}

// ---------------------------------------------------------------------------

const GROUP_ORDER: readonly CommandGroup[] = [
  'Bereiche',
  'Lektionen',
  'Projekte',
  'Wiederholen',
  'Aktionen',
  'Hilfe',
];

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

function rememberRecent(id: string): void {
  try {
    const next = [id, ...readRecent().filter((value) => value !== id)].slice(0, RECENT_LIMIT);
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ein voller oder gesperrter Speicher darf die Palette nicht lahmlegen.
  }
}

function CommandPalette({
  entries,
  onClose,
  onNavigate,
  onAction,
}: {
  entries: readonly CommandEntry[];
  onClose: () => void;
  onNavigate: (href: string) => void;
  onAction: (action: CommandAction) => void;
}): ReactNode {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  // Der Verlauf liegt im localStorage. Das Lesen hier ist unbedenklich, weil
  // die Komponente ausschließlich nach einer Nutzereingabe eingehängt wird –
  // sie läuft nie auf dem Server und nie während der Hydratation.
  const [recent] = useState<string[]>(() => readRecent());
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = 'befehlspalette-liste';

  const results = useMemo(() => {
    if (query.trim().length === 0) {
      const byId = new Map(entries.map((entry) => [entry.id, entry]));
      const recentEntries = recent
        .map((id) => byId.get(id))
        .filter((entry): entry is CommandEntry => entry !== undefined);
      const rest = entries.filter(
        (entry) => entry.group === 'Bereiche' && !recent.includes(entry.id),
      );
      return [...recentEntries, ...rest].slice(0, 10).map((item) => ({
        item,
        ranges: [] as MatchRange[],
        fromHistory: recent.includes(item.id),
      }));
    }

    return rankEntries(entries, query, 14).map((result) => ({
      item: result.item,
      ranges: result.ranges,
      fromHistory: false,
    }));
  }, [entries, query, recent]);

  // Gruppiert, dazu je Eintrag seine laufende Nummer über alle Gruppen hinweg.
  // Die Nummer wird hier ausgerechnet und nicht beim Rendern hochgezählt: Ein
  // Zähler, der während des Renderns verändert wird, liefert beim zweiten
  // Durchlauf andere Werte.
  const sections = useMemo(() => {
    const grouped: Array<{ group: string; items: typeof results }> =
      query.trim().length === 0
        ? [{ group: 'Zuletzt benutzt', items: results }]
        : (() => {
            const buckets = new Map<CommandGroup, typeof results>();
            for (const result of results) {
              const bucket = buckets.get(result.item.group);
              if (bucket) bucket.push(result);
              else buckets.set(result.item.group, [result]);
            }
            return GROUP_ORDER.filter((group) => buckets.has(group)).map((group) => ({
              group: group as string,
              items: buckets.get(group) ?? [],
            }));
          })();

    return grouped.map((section, sectionIndex) => {
      const offset = grouped
        .slice(0, sectionIndex)
        .reduce((sum, earlier) => sum + earlier.items.length, 0);
      return {
        group: section.group,
        items: section.items.map((item, itemIndex) => ({ ...item, index: offset + itemIndex })),
      };
    });
  }, [results, query]);

  const flat = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  // Abgeleitet statt gespeichert: Schrumpft die Trefferliste, muss der
  // hervorgehobene Eintrag sofort im gültigen Bereich liegen – ein Effekt, der
  // das nachträglich korrigiert, würde einen Zwischenrender mit ungültigem
  // Index erzeugen.
  const selectedIndex = flat.length === 0 ? 0 : Math.min(activeIndex, flat.length - 1);
  const selected = flat[selectedIndex];

  // Die hervorgehobene Zeile muss sichtbar bleiben, wenn mit den Pfeiltasten
  // über den sichtbaren Bereich hinaus gelaufen wird.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, flat.length]);

  const choose = useCallback(
    (entry: CommandEntry): void => {
      rememberRecent(entry.id);
      if (entry.href) onNavigate(entry.href);
      else if (entry.action) onAction(entry.action);
    },
    [onNavigate, onAction],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (flat.length === 0 ? 0 : (index + 1) % flat.length));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (flat.length === 0 ? 0 : (index - 1 + flat.length) % flat.length));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(0, flat.length - 1));
      return;
    }
    if (event.key === 'Enter') {
      if (selected) {
        event.preventDefault();
        choose(selected.item);
      }
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Befehlspalette"
      description="Tippe, um Lektionen, Projekte und Funktionen zu finden."
      hideTitle
      size="wide"
      align="top"
      initialFocusRef={inputRef}
    >
      <div className="border-b border-[var(--border)] px-4 py-3">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label="Suchen und springen"
          aria-activedescendant={selected ? `befehl-${selected.item.id}` : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Wohin möchtest du?"
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-transparent text-lg outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>

      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label="Treffer"
        className="max-h-[min(24rem,50vh)] overflow-y-auto py-2"
      >
        {flat.length === 0 ? (
          <li role="presentation" className="px-4 py-6 text-center text-[var(--text-muted)]">
            Dazu findet sich nichts. Andere Schreibweise oder ein kürzeres Stichwort hilft oft.
          </li>
        ) : null}

        {sections.map((section) => (
          <li key={section.group} role="presentation">
            <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {section.group}
            </p>
            <ul role="group" aria-label={section.group}>
              {section.items.map((result) => {
                const isActive = result.index === selectedIndex;
                return (
                  /*
                   * Nach dem Muster „Combobox mit Listbox-Popup" liegt die
                   * Tastaturbedienung im Eingabefeld: Es behält den Fokus und
                   * verweist über aria-activedescendant auf die hervorgehobene
                   * Zeile. Die Zeilen selbst dürfen deshalb weder fokussierbar
                   * sein noch eigene Tastaturereignisse behandeln – genau das
                   * verlangt die Regel unten, die hier bewusst ausgesetzt wird.
                   */
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                  <li
                    key={result.item.id}
                    id={`befehl-${result.item.id}`}
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    onMouseMove={() => setActiveIndex(result.index)}
                    onClick={() => choose(result.item)}
                    className={cx(
                      'mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5',
                      isActive ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-sunken)]',
                    )}
                  >
                    <span
                      className={cx(
                        'flex size-7 shrink-0 items-center justify-center rounded-lg',
                        isActive
                          ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                          : 'bg-[var(--surface-sunken)] text-[var(--text-muted)]',
                      )}
                    >
                      <Icon name={result.item.icon ?? 'vor'} size={15} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[0.95rem]">
                      {splitByRanges(result.item.title, result.ranges).map((part, partIndex) =>
                        part.highlighted ? (
                          <mark
                            key={partIndex}
                            className="bg-transparent font-semibold text-[var(--accent)]"
                          >
                            {part.text}
                          </mark>
                        ) : (
                          <span key={partIndex}>{part.text}</span>
                        ),
                      )}
                    </span>
                    {result.item.hint ? (
                      <span className="shrink-0 text-xs text-[var(--text-muted)]">
                        {result.item.hint}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> auswählen
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> öffnen
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd> schließen
        </span>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

interface ShortcutItem {
  keys: string[];
  description: string;
  /** Nacheinander statt gleichzeitig – zwischen den Tasten steht dann „dann". */
  sequence?: boolean;
  /** Entweder–oder statt gleichzeitig. */
  alternative?: boolean;
}

const SHORTCUT_GROUPS: ReadonlyArray<{ title: string; items: readonly ShortcutItem[] }> = [
  {
    title: 'Überall',
    items: [
      { keys: ['Strg', 'K'], description: 'Befehlspalette öffnen (auf dem Mac: Cmd + K)' },
      { keys: ['?'], description: 'Diese Übersicht anzeigen' },
      { keys: ['Esc'], description: 'Dialog oder Palette schließen' },
    ],
  },
  {
    title: 'Springen',
    items: [
      { keys: ['g', 'l'], description: 'Lernen', sequence: true },
      { keys: ['g', 'u'], description: 'Üben', sequence: true },
      { keys: ['g', 'p'], description: 'Projekte', sequence: true },
      { keys: ['g', 'w'], description: 'Wiederholen', sequence: true },
      { keys: ['g', 'f'], description: 'Fortschritt', sequence: true },
      { keys: ['g', 'c'], description: 'Code-Labor', sequence: true },
    ],
  },
  {
    title: 'Im Code-Editor',
    items: [
      { keys: ['Strg', '↵'], description: 'Programm ausführen' },
      {
        keys: ['Esc', 'Tab'],
        description: 'Aus dem Editor heraus zum nächsten Element',
        sequence: true,
      },
    ],
  },
  {
    title: 'Im Ausführungs-Visualisierer',
    items: [
      { keys: ['←', '→'], description: 'Einen Schritt zurück oder vor', alternative: true },
      { keys: ['Pos1', 'Ende'], description: 'Zum ersten oder letzten Schritt', alternative: true },
      { keys: ['Leertaste'], description: 'Abspielen und anhalten' },
    ],
  },
];

function keySeparator(item: ShortcutItem): string {
  if (item.sequence) return 'dann';
  if (item.alternative) return 'oder';
  return '+';
}

function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactNode {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tastaturkürzel"
      description="Alles hier lässt sich auch mit der Maus erledigen. Die Kürzel sind eine Abkürzung, keine Voraussetzung."
    >
      <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-4">
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-sm font-semibold">{group.title}</h3>
            <dl className="space-y-1.5">
              {group.items.map((item) => (
                <div key={item.description} className="flex items-baseline justify-between gap-4">
                  <dt className="flex shrink-0 items-center gap-1">
                    {item.keys.map((key, index) => (
                      <span key={key} className="flex items-center gap-1">
                        {index > 0 ? (
                          <span className="text-xs text-[var(--text-muted)]">
                            {keySeparator(item)}
                          </span>
                        ) : null}
                        <Kbd>{key}</Kbd>
                      </span>
                    ))}
                  </dt>
                  <dd className="min-w-0 flex-1 text-right text-sm text-[var(--text-muted)]">
                    {item.description}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <div className="border-t border-[var(--border)] px-5 py-3 text-right">
        <button
          type="button"
          onClick={onClose}
          className="min-h-10 rounded-lg border border-[var(--border-strong)] px-4 text-sm font-medium hover:bg-[var(--surface-sunken)]"
        >
          Schließen
        </button>
      </div>
    </Dialog>
  );
}
