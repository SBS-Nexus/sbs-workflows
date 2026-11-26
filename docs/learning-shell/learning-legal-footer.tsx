import type { ShellApp } from '@/lib/learning-shell';

/**
 * Rechtliche Verweise der Lernpfade-Shell (E6.1, docs/E6-PLAN.md).
 *
 * KANONISCH ist `docs/learning-shell/learning-legal-footer.tsx`; jede App
 * führt eine bytegleiche Kopie (geprüft von `scripts/check-learning-shell.mjs`)
 * und zeigt sie im Root-Layout unter jedem Inhalt.
 *
 * Impressum und Datenschutzhinweise gelten für alle Pfade und stehen zentral
 * auf der Plattform. Die Adressen sind fest: Pflichtangaben müssen immer
 * erreichbar sein, auch ohne Konfiguration (§ 5 DDG: leicht erkennbar,
 * unmittelbar erreichbar).
 */
export const RECHTLICHE_ADRESSEN = {
  impressum: 'https://www.lernpfade.net/impressum',
  datenschutz: 'https://www.lernpfade.net/datenschutz',
  status: 'https://www.lernpfade.net/status',
} as const;

export function LearningLegalFooter({ app }: { app: ShellApp }): React.ReactElement {
  return (
    <footer className="lp-shell lp-shell-legal" data-lp-app={app}>
      <nav aria-label="Rechtliches" className="lp-shell-legal-inner">
        <span className="lp-shell-legal-anbieter">
          Lernpfade · SBS Deutschland GmbH &amp; Co. KG
        </span>
        <a className="lp-shell-legal-link" href={RECHTLICHE_ADRESSEN.impressum}>
          Impressum
        </a>
        <a className="lp-shell-legal-link" href={RECHTLICHE_ADRESSEN.datenschutz}>
          Datenschutz
        </a>
        <a className="lp-shell-legal-link" href={RECHTLICHE_ADRESSEN.status}>
          Status
        </a>
      </nav>
    </footer>
  );
}
