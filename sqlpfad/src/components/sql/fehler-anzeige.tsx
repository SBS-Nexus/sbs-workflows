import type { Fehlererklaerung } from '@/domain/sql/fehler';
import { Icon } from '@/components/ui/icon';

/**
 * Eine Fehlermeldung, aus der man etwas lernt.
 *
 * Die Reihenfolge der vier Teile ist Absicht und steht so im Kopf von
 * `src/domain/sql/fehler.ts`. Zwei Entscheidungen sind hier sichtbar:
 *
 * **Die Originalmeldung steht oben und nicht versteckt in einem Aufklapper.**
 * Wer später beruflich mit SQL arbeitet, wird genau diese englischen Texte
 * lesen müssen. Sie wegzusperren wäre kurzfristig freundlich und langfristig
 * schädlich – man lernt sonst nie, sie selbst zu deuten.
 *
 * **Die Kachel ist nicht rot.** Ein Fehler in einer Übung ist kein Unfall,
 * sondern der Normalfall; er ist die Stelle, an der gelernt wird. Rot ist für
 * Dinge reserviert, bei denen etwas verloren geht.
 */
export function FehlerAnzeige({
  erklaerung,
}: {
  erklaerung: Fehlererklaerung;
}): React.ReactElement {
  return (
    <section
      aria-labelledby="fehler-ueberschrift"
      className="rounded-2xl border border-[var(--caution)] bg-[var(--caution-soft)] p-5"
    >
      <h3
        id="fehler-ueberschrift"
        className="flex items-center gap-2 text-base font-bold tracking-tight text-[var(--caution)]"
      >
        <Icon name="suchen" size={18} />
        Die Datenbank kommt hier nicht weiter
      </h3>

      {/* 1. Was SQL Server meldet */}
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Was SQL Server meldet
        </p>
        <pre className="mt-1.5 overflow-x-auto rounded-lg bg-[var(--surface-raised)] p-3 font-mono text-[0.8rem] leading-relaxed">
          <code>{erklaerung.original}</code>
        </pre>
      </div>

      {/* 2. Was das bedeutet */}
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Was das bedeutet
        </p>
        <p className="mt-1.5">{erklaerung.bedeutung}</p>
      </div>

      {/* 3. Woran es liegen kann – ausdrücklich als Möglichkeiten */}
      {erklaerung.moeglicheUrsachen.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Woran es liegen kann
          </p>
          {/*
           * „kann" und nicht „liegt". Die Anwendung weiß nicht, was gemeint
           * war; eine als sicher formulierte Falschdiagnose kostet mehr Zeit
           * als keine.
           */}
          <ul className="mt-1.5 space-y-1">
            {erklaerung.moeglicheUrsachen.map((ursache) => (
              <li key={ursache} className="flex gap-2">
                <span aria-hidden="true" className="text-[var(--text-muted)]">
                  ·
                </span>
                <span>{ursache}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 4. Wo du suchen solltest */}
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Wo du suchen solltest
        </p>
        <p className="mt-1.5">{erklaerung.woSuchen}</p>
      </div>

      <p className="mt-5 border-t border-[var(--caution)]/30 pt-4 font-medium">
        {erklaerung.kontrollfrage}
      </p>
    </section>
  );
}
