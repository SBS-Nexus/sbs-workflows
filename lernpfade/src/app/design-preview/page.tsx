import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import {
  LosFooter,
  LosHero,
  LosMoment,
  LosStatement,
  LosTicker,
  LosTracks,
  LosVocab,
} from '@/components/learning-os/home-sections';
import { BrandMark } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Learning OS – Designstudie',
  description: 'Designstudie für ein neues Lernpfade-Erlebnis. Premium SaaS trifft auf echtes Lernen.',
  robots: { index: false, follow: false },
};

/**
 * Review-Referenz der geprüften Designstudie (PR #77), bis zur Freigabe
 * erhalten und nicht indexiert. Die Abschnitte sind dieselben Bausteine wie
 * auf `/`; nur Kopfzeile und Rücksprungziel gehören zur Studie.
 */
export default function DesignPreview(): React.ReactElement {
  return (
    <div className="los-root">
      <header className="los-header">
        <a className="los-brand" href="/design-preview" aria-label="Lernpfade Designstudie – Startseite">
          <BrandMark />
          <span>lernpfade<span className="los-brand-period">.</span></span>
          <small>by SBS Nexus</small>
        </a>
        <nav className="los-nav" aria-label="Learning OS Navigation">
          <a href="#lernpfade">Lernpfade</a>
          <a href="#lernprinzip">Das Konzept</a>
          <a href="#lern-moment">Erleben</a>
        </nav>
        <a className="los-nav-cta" href="/vokabeln">Lernraum öffnen <ArrowUpRight size={16} aria-hidden="true" /></a>
      </header>

      <main id="hauptinhalt">
        <LosHero />
        <LosTicker />
        <LosStatement />
        <LosTracks />
        <LosMoment />
        <LosVocab />
      </main>
      <LosFooter homeHref="/design-preview" />
    </div>
  );
}
