import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { BeitretenKnopf } from '@/components/organisation/formulare';
import { AnmeldenHinweis } from '@/components/organisation/hinweise';
import { ROLLEN_NAME } from '@/domain/organisation/regeln';
import { einladungVorschau } from '@/server/organisation/dienst';
import { anmeldeAdresse, orgZugang } from '@/server/organisation/zugang';

/**
 * E5.1 — Einladung annehmen. Die Seite zeigt nur Organisation und Rolle; ob
 * der Link noch gilt, entscheidet erst das Einlösen (gleiche Prüfung, eine
 * Transaktion). Suchmaschinen sollen Einladungen nie sehen.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Einladung',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function EinladungSeite({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<React.ReactElement> {
  const { token } = await params;
  const zugang = await orgZugang();
  if (!zugang) notFound();
  const vorschau = await einladungVorschau(zugang.db, token);

  return (
    <>
      <SiteHeader />
      <main id="hauptinhalt" className="los-app los-flow org-page">
        <header className="los-head">
          <div className="los-head-copy">
            <p className="eyebrow">Einladung</p>
            {vorschau ? (
              <>
                <h1>{vorschau.organisation}</h1>
                <p>
                  Du bist eingeladen, als <strong>{ROLLEN_NAME[vorschau.rolle]}</strong> beizutreten. Dein Lernstand
                  bleibt bei dir; deine Organisation sieht Einzelwerte nur mit deiner Einwilligung.
                </p>
              </>
            ) : (
              <>
                <h1>Diese Einladung gibt es nicht</h1>
                <p>Prüfe, ob der Link vollständig ist, oder bitte um einen neuen.</p>
              </>
            )}
          </div>
        </header>
        {vorschau ? (
          <section className="los-section" aria-label="Beitreten">
            {zugang.person ? (
              <BeitretenKnopf token={token} organisation={vorschau.organisation} />
            ) : (
              <AnmeldenHinweis
                adresse={anmeldeAdresse(`/einladung/${token}`)}
                text={
                  vorschau.gebunden
                    ? 'Diese Einladung gilt für eine bestimmte E-Mail-Adresse. Melde dich mit dem Lernpfade-Konto dieser Adresse an oder registriere dich damit.'
                    : 'Melde dich mit deinem Lernpfade-Konto an oder registriere dich – danach trittst du mit einem Klick bei.'
                }
              />
            )}
          </section>
        ) : null}
      </main>
    </>
  );
}
