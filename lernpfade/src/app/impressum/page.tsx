import type { Metadata } from 'next';
import { Rechtsseite } from '@/components/rechtliches/rechtsseite';
import { ANBIETER, GELTUNGSBEREICH } from '@/lib/rechtliches';

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Anbieterkennzeichnung für Lernpfade, das Lernpfade-Konto, PythonPfad, SQLPfad und AIPfad.',
};

/** E6.1 — Anbieterkennzeichnung nach § 5 DDG. Angaben aus `src/lib/rechtliches.ts`. */
export default function ImpressumSeite(): React.ReactElement {
  const v = ANBIETER.inhaltlichVerantwortlich;
  return (
    <Rechtsseite titel="Impressum">
      <h2>Anbieter</h2>
      <address>
        {ANBIETER.firma}
        <br />
        {ANBIETER.strasse}
        <br />
        {ANBIETER.ort}
        <br />
        {ANBIETER.land}
      </address>
      <p>
        Telefon: <a href={`tel:${ANBIETER.telefonLink}`}>{ANBIETER.telefon}</a>
        <br />
        E-Mail: <a href={`mailto:${ANBIETER.email}`}>{ANBIETER.email}</a>
        <br />
        Website: <a href={ANBIETER.website}>{ANBIETER.website}</a>
      </p>
      <p>Angaben zur Anbieterkennzeichnung nach § 5 Digitale-Dienste-Gesetz (DDG).</p>

      <h2>Geschäftsführung und Vertretung</h2>
      <p>{ANBIETER.vertretung}</p>

      <h2>Register und Umsatzsteuer</h2>
      <p>
        Registergericht: {ANBIETER.registergericht}
        <br />
        Handelsregister: {ANBIETER.handelsregister}
        <br />
        Umsatzsteuer-Identifikationsnummer nach § 27a Umsatzsteuergesetz: {ANBIETER.ustId}
      </p>

      <h2>Verantwortlich für den Inhalt</h2>
      <p>Nach § 18 Abs. 2 Medienstaatsvertrag (MStV):</p>
      <address>
        {v.name}
        <br />
        {v.strasse}
        <br />
        {v.ort}
        <br />
        {v.land}
      </address>

      <h2>Geltungsbereich</h2>
      <p>Diese Anbieterkennzeichnung gilt für die Lernplattform Lernpfade unter folgenden Adressen:</p>
      <ul>
        {GELTUNGSBEREICH.map((adresse) => (
          <li key={adresse}>{adresse}</li>
        ))}
      </ul>
      <p>
        Dazu gehören die Weiterleitungen von lernpfade.net, pythonpfad.de, sqlpfad.de und aipfad.de auf die jeweilige
        Adresse mit „www“.
      </p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen (§ 36 VSBG).
      </p>

      <h2>Datenschutz</h2>
      <p>
        Wie wir personenbezogene Daten verarbeiten, erläutern die <a href="/datenschutz">Datenschutzhinweise</a>. Für
        Organisationen gibt es eine <a href="/avv">Vorlage zur Auftragsverarbeitung</a>.
      </p>
    </Rechtsseite>
  );
}
