'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  THEME_ICONS,
  THEME_LABELS,
  cycleTheme,
  readTheme,
  readThemeOnServer,
  subscribeAppearance,
} from '@/lib/preferences/appearance';
import { Icon } from '@/components/ui/icon';

/**
 * Umschalter für das Farbschema.
 *
 * Die Auswahl liegt im localStorage – einem externen Speicher außerhalb von
 * React. Deshalb wird sie über `useSyncExternalStore` gelesen statt über einen
 * Effekt: So bleibt der Server-Render eindeutig, und Änderungen in einem
 * anderen Tab oder über die Befehlspalette kommen automatisch an.
 *
 * Damit beim Laden nicht kurz das falsche Schema aufblitzt, setzt zusätzlich
 * ein kleines Inline-Skript in app/layout.tsx das Attribut, bevor React startet.
 */
export function ThemeToggle(): React.ReactElement {
  const theme = useSyncExternalStore(subscribeAppearance, readTheme, readThemeOnServer);
  const onClick = useCallback(() => {
    cycleTheme();
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-lg border border-[var(--border)] text-base transition-colors hover:bg-[var(--surface-sunken)]"
      title={`Farbschema: ${THEME_LABELS[theme]}`}
    >
      <Icon name={THEME_ICONS[theme]} size={18} />
      <span className="sr-only">Farbschema umschalten. Aktuell: {THEME_LABELS[theme]}</span>
    </button>
  );
}
