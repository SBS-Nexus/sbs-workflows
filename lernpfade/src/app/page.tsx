import {
  LosFooter,
  LosHero,
  LosMoment,
  LosStatement,
  LosTicker,
  LosTracks,
  LosVocab,
} from '@/components/learning-os/home-sections';
import { SiteHeader } from '@/components/site-header';

/**
 * Startseite des Hubs: Learning OS. Dieselben Abschnitte wie die geprüfte
 * Designstudie `/design-preview`, mit der gemeinsamen Kopfzeile aller Routen.
 * Ziele und Status stammen aus `src/lib/catalog.ts`; fehlende Adressen werden
 * als „nicht verbunden" gezeigt, nicht als tote Links.
 */
export default function Home(): React.ReactElement {
  return (
    <div className="los-root">
      <SiteHeader current="start" />
      <main id="hauptinhalt">
        <LosHero />
        <LosTicker />
        <LosStatement />
        <LosTracks />
        <LosMoment />
        <LosVocab />
      </main>
      <LosFooter homeHref="/" />
    </div>
  );
}
