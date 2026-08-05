import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { cx } from '@/components/ui/primitives';
import { EckBoegen } from '@/components/ui/zierformen';
import { type ModuleTheme, heroGradient, themeStyle } from '@/domain/design/module-theme';

/**
 * Kopfbereich eines Hauptbereichs.
 *
 * Jeder Bereich der Anwendung – Üben, Wiederholen, Projekte, Fortschritt –
 * bekommt eine eigene Leitfarbe und ein eigenes Zeichen. Das ist keine Zierde:
 * Wer über die Navigation springt, weiß dadurch am Farbwechsel sofort, dass er
 * woanders gelandet ist. Die Überschrift bestätigt es nur noch.
 *
 * Zur Fläche: ein satter Verlauf mit weißer Schrift, nicht eine blasse
 * Tönung. Eine hell eingefärbte Fläche mit dunkler Schrift wirkt wie ein
 * Hinweiskasten – etwas, das man wegklickt. Ein Verlauf wirkt wie der Anfang
 * einer Seite. Da der Verlauf in beiden Farbschemata dunkel bleibt, stimmt der
 * Kontrast der weißen Schrift überall.
 *
 * Die große Zeichnung im Hintergrund ist stark beschnitten und blass. Sie soll
 * die Fläche beleben, nicht mit der Überschrift um Aufmerksamkeit
 * konkurrieren – deshalb liegt sie hinter dem Text und ist für Hilfstechnik
 * unsichtbar.
 */
export function PageHero({
  theme,
  icon,
  title,
  description,
  children,
  className,
  muster = 'raster',
}: {
  theme: ModuleTheme;
  icon: IconName;
  title: string;
  description?: ReactNode;
  /** Zusätzliche Angaben, etwa Kennzahlen oder ein Knopf. */
  children?: ReactNode;
  className?: string;
  /** Grundstruktur der Fläche. `raster` wirkt sachlich, `punkte` leichter. */
  muster?: 'raster' | 'punkte';
}): ReactNode {
  return (
    <header
      style={{ ...themeStyle(theme), backgroundImage: heroGradient(theme) }}
      className={cx(
        'relative isolate overflow-hidden rounded-3xl p-6 text-white sm:p-8',
        'muster-verlauf',
        muster === 'punkte' ? 'muster-punkte-hell' : 'muster-raster-hell',
        className,
      )}
    >
      {/*
       * Drei schmückende Ebenen, alle ohne Dauerbewegung:
       *
       *  1. ein Raster, das zur Mitte hin ausläuft – gibt der Fläche Struktur.
       *     Es steckt in den `muster-`Klassen oben und liegt auf `::after`,
       *  2. konzentrische Bögen in der Ecke,
       *  3. das Bereichszeichen als große, blasse Zeichnung.
       *
       * Nichts davon bewegt sich. Eine frühere Fassung ließ hier eine
       * weichgezeichnete Wolke wandern; das kostete bei jedem Bildaufbau
       * Rechenzeit und brachte in einem Testlauf sogar Serveraufrufe ins
       * Zeitlimit. Struktur wirkt auch stehend.
       */}
      <EckBoegen
        farbe="#ffffff"
        className="pointer-events-none absolute -right-6 -top-10 -z-10 size-64 opacity-70"
      />
      <span
        aria-hidden="true"
        className="animate-float pointer-events-none absolute -bottom-10 right-6 -z-10 text-white opacity-[0.13]"
      >
        <Icon name={icon} size={170} />
      </span>

      <div className="flex flex-wrap items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm"
        >
          <Icon name={icon} size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">{title}</h1>
          {description ? <p className="mt-2 max-w-prose text-white/80">{description}</p> : null}
        </div>
      </div>

      {children ? <div className="mt-6">{children}</div> : null}
    </header>
  );
}

/**
 * Kennzahl im Kopfbereich.
 *
 * Die Zahl steht groß über der Beschriftung, nicht daneben – so lassen sich
 * mehrere Kennzahlen nebeneinander in einer Zeile lesen, ohne dass die Augen
 * springen müssen.
 */
export function HeroStat({
  value,
  label,
  index = 0,
}: {
  value: ReactNode;
  label: string;
  /** Für das gestaffelte Erscheinen. */
  index?: number;
}): ReactNode {
  return (
    <div
      style={{ animationDelay: `${index * 80}ms` }}
      className="animate-in rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm"
    >
      <p className="text-2xl font-black tabular-nums tracking-tight">{value}</p>
      <p className="mt-0.5 text-sm text-white/70">{label}</p>
    </div>
  );
}
