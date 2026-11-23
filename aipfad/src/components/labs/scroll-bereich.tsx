'use client';

/**
 * Horizontal scrollbarer Bereich für breite Tabellen.
 *
 * Bei 375 px passen Vektoren und Rangliste nicht in die Breite. Ein
 * scrollbarer Bereich muss dann auch ohne Maus erreichbar sein (WCAG 2.1.1,
 * axe-Regel `scrollable-region-focusable`): Er ist fokussierbar und trägt
 * einen Namen, damit der Fokus nicht auf einem namenlosen Kasten landet.
 */
export function ScrollBereich({
  beschriftung,
  children,
}: {
  beschriftung: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      role="region"
      aria-label={`${beschriftung} (horizontal scrollbar)`}
      // Scrollbarer Bereich muss per Tastatur erreichbar sein (siehe oben).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]"
    >
      {children}
    </div>
  );
}
