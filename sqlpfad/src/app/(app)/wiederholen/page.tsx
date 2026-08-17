import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/server/auth/session';
import { Callout, EmptyState } from '@/components/ui/primitives';
import { AufgabenKarte } from '@/components/aufgabe/aufgaben-karte';
import { ladeAufgabenVorrat } from '@/server/aufgaben-auswahl';
import {
  ladeFaelligeKonzepte,
  naechsterTermin,
  waehleAufgabenZuKonzepten,
} from '@/server/wiederholung';
import { beschreibeFaelligkeit } from '@/domain/wiederholung/sm2';

export const metadata: Metadata = { title: 'Wiederholen' };

const HOECHSTENS = 5;

/**
 * Wiederholen.
 *
 * Was hier ansteht, kommt aus der Terminrechnung in
 * `src/domain/wiederholung/sm2.ts` – nach SM-2, einem veröffentlichten
 * Verfahren mit seinen Originalkonstanten. Geplant wird je **Konzept**, gezeigt
 * wird je Konzept eine Aufgabe, an der es sich prüfen lässt.
 *
 * Dass diese eine Liste vollständig ist, hängt an einer Zusicherung aus dem
 * Lehrplan: Jede Aufgabe hat mindestens ein Konzept – der Validator lehnt
 * andernfalls ab, und der Seed schreibt nicht, was der Validator ablehnt.
 * Ohne diese Prüfung bräuchte es hier eine zweite Liste für Aufgaben, die
 * durch das Raster fallen; mit ihr gibt es keine solchen Aufgaben.
 *
 * Eine leere Seite ist kein Rückstand, sondern der Normalfall – und sie sagt
 * das auch. Wer nichts offen hat, soll nicht das Gefühl bekommen, etwas
 * versäumt zu haben.
 */
export default async function WiederholenSeite(): Promise<React.ReactElement> {
  const user = await requireUser();
  const jetzt = new Date();

  const faellig = await ladeFaelligeKonzepte(user.id, jetzt, HOECHSTENS);
  const aufgabenJeKonzept = await waehleAufgabenZuKonzepten(
    user.id,
    faellig.map((konzept) => konzept.conceptId),
  );
  const vorrat = await ladeAufgabenVorrat(user.id);

  /*
   * Zwei Konzepte können auf dieselbe Aufgabe fallen - etwa „JOIN" und
   * „Fremdschlüssel" auf dieselbe Verbindungsaufgabe. Sie zweimal
   * untereinander zu zeigen sähe nach einem Fehler aus; das zweite Konzept
   * kommt beim nächsten Aufruf dran.
   */
  const gezeigt = new Set<string>();
  const anstehend = faellig.flatMap((konzept) => {
    const aufgabeSlug = aufgabenJeKonzept.get(konzept.conceptId);
    if (!aufgabeSlug || gezeigt.has(aufgabeSlug)) return [];
    const ansicht = vorrat.ansichten.get(aufgabeSlug);
    if (!ansicht) return [];
    gezeigt.add(aufgabeSlug);
    return [{ konzept, aufgabeSlug, ansicht }];
  });

  const naechster = anstehend.length === 0 ? await naechsterTermin(user.id, jetzt) : null;
  const nochNichts = vorrat.staende.size === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm font-black leading-tight tracking-[-0.02em]">Wiederholen</h1>
        <p className="mt-2 max-w-2xl text-lg text-[var(--text-muted)]">
          Was ansteht, richtet sich nach deinem Verlauf – nicht nach einer Serie, die reißen kann,
          und nicht nach einem Tagespensum.
        </p>
      </div>

      {anstehend.length === 0 ? (
        <>
          <EmptyState
            title="Nichts offen"
            description={
              nochNichts
                ? 'Wiederholungen entstehen aus bearbeiteten Aufgaben. Solange du noch keine bearbeitet hast, ist hier nichts zu tun – das ist kein Rückstand.'
                : 'Alles, was ansteht, hast du hinter dir. Hier steht wieder etwas, sobald ein Termin fällig wird.'
            }
          />
          {naechster ? (
            <p className="text-[0.95rem] text-[var(--text-muted)]">
              Der nächste Termin: {beschreibeFaelligkeit(naechster, jetzt)}. Du musst nicht darauf
              warten –{' '}
              <Link href="/ueben" className="font-medium text-[var(--accent)] underline">
                üben
              </Link>{' '}
              geht jederzeit und verschiebt nichts zum Schlechteren.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-[0.95rem] text-[var(--text-muted)]">
            {anstehend.length === 1
              ? 'Ein Konzept steht heute an.'
              : `${anstehend.length} Konzepte stehen heute an.`}{' '}
            Je Konzept eine Aufgabe – und möglichst eine, die du länger nicht gesehen hast. Wer
            dasselbe Beispiel zum dritten Mal löst, erinnert sich an das Beispiel.
          </p>

          <ol className="space-y-3">
            {anstehend.map((eintrag, index) => (
              <li key={eintrag.aufgabeSlug} className="space-y-1.5">
                <p className="text-sm font-semibold text-[var(--text-muted)]">
                  {eintrag.konzept.titel}
                  {eintrag.konzept.gelungen > 0 ? (
                    <span className="font-normal">
                      {' · '}
                      {eintrag.konzept.gelungen === 1
                        ? 'einmal gekonnt'
                        : `${eintrag.konzept.gelungen}-mal gekonnt`}
                    </span>
                  ) : null}
                </p>
                <AufgabenKarte
                  aufgabe={eintrag.ansicht}
                  nummer={index + 1}
                  datensatz={vorrat.datensaetze.get(eintrag.aufgabeSlug)}
                />
              </li>
            ))}
          </ol>

          <Callout tone="info">
            Der Abstand bis zur nächsten Wiederholung wächst, solange etwas sitzt, und wird kürzer,
            sobald es nicht mehr sitzt. Das Verfahren dahinter (SM-2) ist ein nachvollziehbarer
            Vorschlag, wann sich Wiederholen lohnt – keine Vorhersage, wann du etwas vergisst. Eine
            solche Zahl hätten wir nicht.
          </Callout>

          <p className="text-sm text-[var(--text-muted)]">
            Wenn ein Konzept zum wiederholten Mal nicht klappt, liegt es selten an der Aufgabe.{' '}
            <Link href="/lernen" className="font-medium text-[var(--accent)] underline">
              Die Lektion dazu noch einmal lesen
            </Link>{' '}
            ist keine Niederlage, sondern der schnellere Weg.
          </p>
        </>
      )}
    </div>
  );
}
