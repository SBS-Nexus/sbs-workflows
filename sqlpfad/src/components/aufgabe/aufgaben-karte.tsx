'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { SqlEditor } from '@/components/editor/sql-editor';
import { ErgebnisTabelle } from '@/components/sql/ergebnis-tabelle';
import { Button, Callout, Card, CodeBlock, inputClass } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { Zeilentext } from '@/components/inhalt/lektionstext';
import { antwortform, type Antwort, type Bewertung } from '@/domain/aufgabe/bewertung';
import type { Aufgabenart } from '@/content/typen';
import type { UebungsDatensatz } from '@/domain/sql/schema';
import type { Resultset } from '@/domain/sql/resultset';
import {
  gibAufgabeAb,
  meldeSelbsteinschaetzung,
  zeigeLoesung,
  type Loesungsantwort,
} from '@/server/actions/aufgabe-actions';

/**
 * Eine Aufgabe bearbeiten.
 *
 * Der Aufbau ist für alle Arten derselbe: Frage, Eingabe, Hinweisleiter,
 * Abgabe, Rückmeldung. Nur das Eingabefeld wechselt. Wer zwischen einer
 * Auswahlaufgabe und einer Schreibaufgabe wechselt, soll sich nicht neu
 * zurechtfinden müssen.
 *
 * **Die Hinweisleiter steht neben dem Absenden, nicht dahinter.** Ein Hinweis
 * ist keine Belohnung für einen Fehlversuch und kostet nichts; ihn erst nach
 * dem Scheitern anzubieten, erzieht dazu, auf gut Glück abzuschicken. Wie viele
 * Hinweise genutzt wurden, wird festgehalten – nicht als Abzug, sondern damit
 * die Wiederholungsplanung weiß, wie selbstständig es lief.
 *
 * **Die Lösung liegt hinter der Leiter.** Sie ist kein verbotener Bereich; sie
 * kommt nur nicht vor den Hinweisen, weil sie danach etwas erklärt und davor
 * nur etwas beendet.
 */

export interface AufgabenAnsicht {
  slug: string;
  art: Aufgabenart;
  titel: string;
  aufgabenstellung: string;
  /** Nur, was zur Anzeige gebraucht wird - nie die richtige Antwort. */
  optionen: readonly string[];
  startSql: string;
  hinweise: readonly string[];
  hatLoesung: boolean;
}

export function AufgabenKarte({
  aufgabe,
  nummer,
  datensatz,
}: {
  aufgabe: AufgabenAnsicht;
  nummer: number;
  datensatz?: UebungsDatensatz;
}): React.ReactElement {
  const form = antwortform(aufgabe.art);

  const [gewaehlt, setGewaehlt] = useState<number[]>([]);
  const [reihenfolge, setReihenfolge] = useState<number[]>(() =>
    aufgabe.optionen.map((_option, index) => index),
  );
  const [zahl, setZahl] = useState('');
  const [text, setText] = useState('');
  const [sql, setSql] = useState(aufgabe.startSql);

  const [offeneHinweise, setOffeneHinweise] = useState(0);
  const [bewertung, setBewertung] = useState<Bewertung | null>(null);
  const [ergebnis, setErgebnis] = useState<Resultset | null>(null);
  const [loesung, setLoesung] = useState<Loesungsantwort | null>(null);
  const [eingeschaetzt, setEingeschaetzt] = useState(false);
  const [laeuft, starte] = useTransition();

  /*
   * Wann die Bearbeitung begann. Für die Dauer im Verlauf; sie sagt mehr über
   * eine Aufgabe aus als jede Selbsteinschätzung.
   *
   * Die Uhr wird im Effekt gestellt und nicht beim Rendern: `Date.now()` im
   * Rumpf einer Komponente liefert bei jedem Rendern etwas anderes, und React
   * darf beliebig oft rendern.
   */
  const begonnen = useRef<number | null>(null);
  useEffect(() => {
    begonnen.current = Date.now();
  }, []);

  function bisherigeDauerMs(): number {
    if (begonnen.current === null) return 0;
    return Math.min(Date.now() - begonnen.current, 6 * 60 * 60 * 1000);
  }

  function baueAntwort(): Antwort {
    switch (form) {
      case 'auswahl':
        return { art: 'auswahl', gewaehlt };
      case 'reihenfolge':
        return { art: 'reihenfolge', reihenfolge };
      case 'zahl':
        return { art: 'zahl', wert: zahl.trim() === '' ? -1 : Number.parseInt(zahl, 10) };
      case 'text':
        return { art: 'text', text };
      case 'sql':
        return { art: 'sql', sql };
    }
  }

  function absenden(): void {
    starte(async () => {
      const antwort = await gibAufgabeAb({
        aufgabeSlug: aufgabe.slug,
        antwort: baueAntwort(),
        hinweiseGenutzt: offeneHinweise,
        dauerMs: bisherigeDauerMs(),
      });
      setBewertung(antwort.bewertung);
      setErgebnis(antwort.erwartetesErgebnis ?? null);
      setEingeschaetzt(false);
    });
  }

  function loesungAnsehen(): void {
    starte(async () => {
      setLoesung(
        await zeigeLoesung({ aufgabeSlug: aufgabe.slug, hinweiseGenutzt: offeneHinweise }),
      );
    });
  }

  function einschaetzen(urteil: 'getroffen' | 'teilweise' | 'daneben'): void {
    starte(async () => {
      await meldeSelbsteinschaetzung({
        aufgabeSlug: aufgabe.slug,
        urteil,
        hinweiseGenutzt: offeneHinweise,
        dauerMs: bisherigeDauerMs(),
      });
      setEingeschaetzt(true);
    });
  }

  return (
    <Card as="li" className="border-2">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-bold text-[var(--text-muted)] tabular-nums">{nummer}.</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold tracking-tight">{aufgabe.titel}</h3>
          <div className="mt-1 text-[0.95rem] text-[var(--text-muted)]">
            <Zeilentext text={aufgabe.aufgabenstellung} />
          </div>

          <div className="mt-4 space-y-4">
            {form === 'auswahl' ? (
              <Auswahl
                aufgabe={aufgabe}
                gewaehlt={gewaehlt}
                setGewaehlt={setGewaehlt}
                mehrfach={aufgabe.art === 'MEHRFACHAUSWAHL'}
              />
            ) : null}

            {form === 'reihenfolge' ? (
              <Reihenfolge
                optionen={aufgabe.optionen}
                reihenfolge={reihenfolge}
                setReihenfolge={setReihenfolge}
              />
            ) : null}

            {form === 'zahl' ? (
              <div className="max-w-xs">
                <label
                  htmlFor={`${aufgabe.slug}-zahl`}
                  className="block text-sm font-semibold text-[var(--text)]"
                >
                  Deine Vorhersage: Wie viele Zeilen?
                </label>
                <input
                  id={`${aufgabe.slug}-zahl`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={zahl}
                  onChange={(ereignis) => setZahl(ereignis.target.value)}
                  className={`${inputClass} mt-1.5`}
                />
              </div>
            ) : null}

            {form === 'text' ? (
              <div>
                <label
                  htmlFor={`${aufgabe.slug}-text`}
                  className="block text-sm font-semibold text-[var(--text)]"
                >
                  Deine Antwort in eigenen Worten
                </label>
                <textarea
                  id={`${aufgabe.slug}-text`}
                  rows={4}
                  value={text}
                  onChange={(ereignis) => setText(ereignis.target.value)}
                  className={`${inputClass} mt-1.5 resize-y`}
                />
              </div>
            ) : null}

            {form === 'sql' ? (
              <SqlEditor
                wert={sql}
                beiAenderung={setSql}
                beiAusfuehren={absenden}
                datensatz={datensatz}
              />
            ) : null}

            <Hinweisleiter
              hinweise={aufgabe.hinweise}
              offen={offeneHinweise}
              beiOeffnen={() => setOffeneHinweise((zahl) => zahl + 1)}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={absenden} disabled={laeuft}>
                <Icon name="haken" size={18} />
                {laeuft ? 'Einen Moment …' : 'Antwort abgeben'}
              </Button>

              {aufgabe.hatLoesung && loesung?.art !== 'loesung' ? (
                <Button variant="ghost" onClick={loesungAnsehen} disabled={laeuft}>
                  <Icon name="schloss" size={18} />
                  Lösung ansehen
                </Button>
              ) : null}
            </div>

            <div aria-live="polite" className="space-y-4 empty:hidden">
              {bewertung ? (
                <Rueckmeldung
                  bewertung={bewertung}
                  eingeschaetzt={eingeschaetzt}
                  beiEinschaetzung={einschaetzen}
                  laeuft={laeuft}
                />
              ) : null}

              {ergebnis ? (
                <div>
                  <p className="mb-2 text-sm font-semibold">Das tatsächliche Ergebnis:</p>
                  <ErgebnisTabelle resultset={ergebnis} />
                </div>
              ) : null}

              {loesung?.art === 'gesperrt' ? (
                <Callout tone="info" title="Noch nicht">
                  {loesung.hinweis}
                </Callout>
              ) : null}

              {loesung?.art === 'keine' ? <Callout tone="info">{loesung.hinweis}</Callout> : null}

              {loesung?.art === 'loesung' ? (
                <div className="space-y-3">
                  {loesung.sql ? <CodeBlock code={loesung.sql} label="Musterlösung" /> : null}
                  {loesung.erklaerung ? (
                    <Callout tone="info" title="Warum so">
                      {loesung.erklaerung}
                    </Callout>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// --- Eingabeformen ---------------------------------------------------------

function Auswahl({
  aufgabe,
  gewaehlt,
  setGewaehlt,
  mehrfach,
}: {
  aufgabe: AufgabenAnsicht;
  gewaehlt: number[];
  setGewaehlt: (wert: number[]) => void;
  mehrfach: boolean;
}): React.ReactElement {
  function umschalten(index: number): void {
    if (!mehrfach) {
      setGewaehlt([index]);
      return;
    }
    setGewaehlt(
      gewaehlt.includes(index) ? gewaehlt.filter((wert) => wert !== index) : [...gewaehlt, index],
    );
  }

  return (
    <fieldset>
      <legend className="text-sm font-semibold">
        {mehrfach ? 'Mehrere Antworten sind richtig.' : 'Eine Antwort ist richtig.'}
      </legend>
      <div className="mt-2 space-y-2">
        {aufgabe.optionen.map((option, index) => (
          <label
            key={option}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--accent)]"
          >
            <input
              type={mehrfach ? 'checkbox' : 'radio'}
              name={`${aufgabe.slug}-auswahl`}
              checked={gewaehlt.includes(index)}
              onChange={() => umschalten(index)}
              className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
            />
            <span className="text-[0.95rem]">{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Bausteine ordnen – mit Knöpfen, nicht mit Ziehen.
 *
 * Ziehen und Fallenlassen sieht besser aus und schließt jeden aus, der mit der
 * Tastatur arbeitet oder eine grobmotorische Einschränkung hat. Zwei Knöpfe je
 * Zeile tun dasselbe, funktionieren überall und brauchen keine Bibliothek.
 */
function Reihenfolge({
  optionen,
  reihenfolge,
  setReihenfolge,
}: {
  optionen: readonly string[];
  reihenfolge: number[];
  setReihenfolge: (wert: number[]) => void;
}): React.ReactElement {
  function verschiebe(stelle: number, richtung: -1 | 1): void {
    const ziel = stelle + richtung;
    if (ziel < 0 || ziel >= reihenfolge.length) return;
    const neu = [...reihenfolge];
    const eins = neu[stelle];
    const zwei = neu[ziel];
    if (eins === undefined || zwei === undefined) return;
    neu[stelle] = zwei;
    neu[ziel] = eins;
    setReihenfolge(neu);
  }

  return (
    <ol className="space-y-2">
      {reihenfolge.map((index, stelle) => (
        <li
          key={index}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2"
        >
          <span className="text-sm font-bold tabular-nums text-[var(--text-muted)]">
            {stelle + 1}.
          </span>
          <span className="min-w-0 flex-1 font-mono text-[0.9rem]">{optionen[index]}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => verschiebe(stelle, -1)}
            disabled={stelle === 0}
            aria-label={`„${optionen[index]}" nach oben`}
          >
            <Icon name="anfang" size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => verschiebe(stelle, 1)}
            disabled={stelle === reihenfolge.length - 1}
            aria-label={`„${optionen[index]}" nach unten`}
          >
            <Icon name="ende" size={16} />
          </Button>
        </li>
      ))}
    </ol>
  );
}

// --- Hinweise und Rückmeldung ----------------------------------------------

function Hinweisleiter({
  hinweise,
  offen,
  beiOeffnen,
}: {
  hinweise: readonly string[];
  offen: number;
  beiOeffnen: () => void;
}): React.ReactElement | null {
  if (hinweise.length === 0) return null;

  return (
    <div className="rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-2.5">
      <ol className="space-y-2">
        {hinweise.slice(0, offen).map((hinweis, index) => (
          <li key={hinweis} className="flex gap-2 text-[0.95rem]">
            <Icon name="gluehbirne" size={16} className="mt-1 shrink-0 text-[var(--accent)]" />
            <span>
              <span className="font-semibold">Hinweis {index + 1}: </span>
              {hinweis}
            </span>
          </li>
        ))}
      </ol>

      {offen < hinweise.length ? (
        <Button variant="ghost" size="sm" onClick={beiOeffnen} className={offen > 0 ? 'mt-2' : ''}>
          <Icon name="gluehbirne" size={16} />
          {offen === 0 ? 'Ich brauche einen Hinweis' : 'Noch einen Hinweis'}
        </Button>
      ) : (
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Mehr Hinweise gibt es nicht – ab hier hilft nur noch die Lösung.
        </p>
      )}
    </div>
  );
}

function Rueckmeldung({
  bewertung,
  eingeschaetzt,
  beiEinschaetzung,
  laeuft,
}: {
  bewertung: Bewertung;
  eingeschaetzt: boolean;
  beiEinschaetzung: (urteil: 'getroffen' | 'teilweise' | 'daneben') => void;
  laeuft: boolean;
}): React.ReactElement {
  switch (bewertung.art) {
    case 'richtig':
      return (
        <Callout tone="success" title="Stimmt">
          {bewertung.begruendung}
        </Callout>
      );

    case 'teilweise':
      return (
        <Callout tone="info" title="Fast">
          {bewertung.begruendung}
        </Callout>
      );

    case 'falsch':
      /*
       * Ton „info" und nicht „fehler": Eine falsche Antwort auf eine
       * Übungsaufgabe ist kein Fehler, sondern der übliche Weg dorthin. Rot
       * wäre für kaputte Dinge reserviert.
       */
      return (
        <Callout tone="info" title="Noch nicht">
          {bewertung.begruendung}
        </Callout>
      );

    case 'selbst-vergleichen':
      return (
        <div className="space-y-3">
          <Callout tone="info" title="So hätte man es sagen können">
            {bewertung.musterantwort}
          </Callout>
          {eingeschaetzt ? (
            <p className="text-sm text-[var(--text-muted)]">
              Notiert. Deine Einschätzung fließt in die Wiederholungen ein.
            </p>
          ) : (
            <div>
              <p className="text-sm font-semibold">Hat deine Antwort das getroffen?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={laeuft}
                  onClick={() => beiEinschaetzung('getroffen')}
                >
                  Ja, im Kern
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={laeuft}
                  onClick={() => beiEinschaetzung('teilweise')}
                >
                  Teilweise
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={laeuft}
                  onClick={() => beiEinschaetzung('daneben')}
                >
                  Nein, daneben
                </Button>
              </div>
            </div>
          )}
        </div>
      );

    case 'braucht-ausfuehrung':
      return (
        <Callout tone="info" title="Geprüft, aber nicht ausgeführt">
          {bewertung.begruendung}
        </Callout>
      );

    case 'abgelehnt':
      return (
        <Callout tone="caution" title="Das passt nicht zur Aufgabe">
          {bewertung.begruendung}
        </Callout>
      );

    case 'leer':
      return <Callout tone="info">{bewertung.begruendung}</Callout>;
  }
}
