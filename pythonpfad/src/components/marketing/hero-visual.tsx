import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';

/**
 * Das Bild neben der Hauptaussage der Startseite.
 *
 * Statt eines Fotos oder einer Illustration zeigt es das, worum es geht: einen
 * Ausschnitt aus der Anwendung selbst – Code, die vorhergesagte Ausgabe und die
 * Rückmeldung. Wer die Startseite sieht, weiß danach, wie das Lernen hier
 * aussieht, ohne ein Wort gelesen zu haben.
 *
 * Es ist bewusst kein Screenshot: Ein Bild würde bei jeder Änderung veralten,
 * wäre in beiden Farbschemata falsch und ließe sich nicht vergrößern. Diese
 * Nachbildung besteht aus denselben Bausteinen wie die echte Oberfläche.
 *
 * Für Hilfstechnik ist die ganze Gruppe unsichtbar. Der Text daneben sagt
 * dasselbe in Sätzen; eine zweite, zeichenweise Vorlesung des Codes wäre keine
 * Information, sondern Wiederholung.
 */

const ZEILEN: readonly string[] = [
  'name = "Yusuf"',
  'gruss = "Guten Morgen, "',
  'print(gruss + name)',
];

/** Sehr kleine Einfärbung – genug, damit es nach Code aussieht. */
function CodeZeile({ text }: { text: string }): ReactNode {
  const teile = text.split(/(".*?"|\bprint\b)/g);
  return (
    <>
      {teile.map((teil, index) => {
        if (teil.startsWith('"')) {
          return (
            <span key={index} className="text-[#7ee2b8]">
              {teil}
            </span>
          );
        }
        if (teil === 'print') {
          return (
            <span key={index} className="text-[#93c5fd]">
              {teil}
            </span>
          );
        }
        return <span key={index}>{teil}</span>;
      })}
    </>
  );
}

export function HeroVisual(): ReactNode {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md select-none lg:max-w-lg">
      {/* Leuchten hinter der Karte. Rein schmückend, liegt hinter allem. */}
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_50%_40%,rgba(124,58,237,0.55),transparent_65%)] blur-2xl" />

      <div className="animate-float rounded-2xl border border-white/15 bg-[#101528]/90 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-sm">
        {/* Fensterleiste */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="size-2.5 rounded-full bg-[#f87171]" />
          <span className="size-2.5 rounded-full bg-[#fbbf24]" />
          <span className="size-2.5 rounded-full bg-[#4ade80]" />
          <span className="ml-2 font-mono text-xs text-white/55">lektion_01.py</span>
        </div>

        {/* Code */}
        <div className="px-4 py-4 font-mono text-[0.8125rem] leading-relaxed text-white/90">
          {ZEILEN.map((zeile, index) => (
            <div key={zeile} className="flex gap-3">
              <span className="w-4 shrink-0 text-right text-white/30">{index + 1}</span>
              <span className="whitespace-pre">
                <CodeZeile text={zeile} />
                {index === ZEILEN.length - 1 ? (
                  <span className="animate-caret ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] bg-white/70" />
                ) : null}
              </span>
            </div>
          ))}
        </div>

        {/* Ausgabe. Unten ist bewusst Luft: Dort liegt die Erfolgsmarke, und sie
            darf die Ausgabezeile nicht verdecken. */}
        <div className="border-t border-white/10 bg-black/25 px-4 pb-9 pt-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-white/45">
            Ausgabe
          </p>
          <p
            className="animate-pop mt-1 font-mono text-[0.8125rem] text-[#7ee2b8]"
            style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}
          >
            Guten Morgen, Yusuf
          </p>
        </div>
      </div>

      {/* Rückmeldung – schwebt über der Ecke der Karte. */}
      <div
        className="animate-pop absolute -bottom-5 -left-3 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.6)] sm:-left-8"
        style={{ animationDelay: '900ms', animationFillMode: 'backwards' }}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-[var(--color-success-500)] text-white">
          <Icon name="haken" size={16} />
        </span>
        <span className="text-[0.8125rem] font-bold text-[var(--color-ink-900)]">
          Vorhersage richtig
        </span>
      </div>

      {/* Hinweis auf die Zeile, die gerade läuft. Die Farbe steht hier als
          fester Wert und nicht als Modulfarbe: Der Kopfbereich ist in beiden
          Farbschemata dunkel, die Modulfarben werden im dunklen Schema aber
          aufgehellt – Weiß auf Pastellorange wäre nicht mehr lesbar. */}
      <div
        className="animate-pop absolute -right-3 top-16 flex items-center gap-2 rounded-2xl bg-[#ea580c] px-3 py-2 text-white shadow-[0_16px_32px_-12px_rgba(0,0,0,0.6)] sm:-right-8"
        style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
      >
        <Icon name="abspielen" size={14} />
        <span className="text-[0.75rem] font-bold">Zeile 3</span>
      </div>
    </div>
  );
}

/**
 * Farbwolken hinter dem Kopfbereich.
 *
 * Drei weiche Flächen, die sich sehr langsam bewegen (22 Sekunden je Runde).
 * Langsam genug, dass es nicht ablenkt, sichtbar genug, dass die Fläche lebt.
 * Bei `prefers-reduced-motion` stehen sie still – die Farbe bleibt, nur die
 * Bewegung geht.
 */
export function AuroraBackdrop(): ReactNode {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="animate-drift absolute -left-24 -top-32 size-[32rem] rounded-full bg-[var(--color-modul-0)] opacity-40 blur-3xl"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="animate-drift absolute -right-32 top-0 size-[28rem] rounded-full bg-[var(--color-projekt)] opacity-30 blur-3xl"
        style={{ animationDelay: '-7s' }}
      />
      <div
        className="animate-drift absolute -bottom-40 left-1/3 size-[34rem] rounded-full bg-[var(--color-modul-3)] opacity-35 blur-3xl"
        style={{ animationDelay: '-14s' }}
      />
    </div>
  );
}
