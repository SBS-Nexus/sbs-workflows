import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { cx } from '@/components/ui/primitives';
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
}: {
  theme: ModuleTheme;
  icon: IconName;
  title: string;
  description?: ReactNode;
  /** Zusätzliche Angaben, etwa Kennzahlen oder ein Knopf. */
  children?: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <header
      style={{ ...themeStyle(theme), backgroundImage: heroGradient(theme) }}
      className={cx(
        'relative isolate overflow-hidden rounded-3xl p-6 text-white sm:p-8',
        className,
      )}
    >
      {/*
       * Zwei schmückende Elemente: eine Farbwolke und das Bereichszeichen als
       * große, blasse Zeichnung.
       *
       * Die Wolke steht bewusst still. Ein weichgezeichneter Kreis von
       * 18 rem, der sich dauerhaft bewegt, muss bei jedem Bildaufbau neu
       * durch den Weichzeichner – mal sechs Seiten summiert sich das zu
       * spürbarer Grundlast. In einem Testlauf liefen darüber sogar
       * Serveraufrufe ins Zeitlimit. Farbe und Tiefe bleiben ohne die
       * Bewegung vollständig erhalten; bewegt wird nur noch die Zeichnung,
       * die keinen Weichzeichner braucht.
       */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 -z-10 size-72 rounded-full bg-white opacity-20 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="animate-float pointer-events-none absolute -right-8 -top-10 -z-10 text-white opacity-15"
      >
        <Icon name={icon} size={190} />
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
