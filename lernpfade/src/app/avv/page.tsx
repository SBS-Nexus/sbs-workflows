import type { Metadata } from 'next';
import { Rechtsseite } from '@/components/rechtliches/rechtsseite';
import { ANBIETER } from '@/lib/rechtliches';

export const metadata: Metadata = {
  title: 'Auftragsverarbeitung',
  description: 'Vorlage für den Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO für Organisationen, die Lernpfade nutzen.',
};

const INHALT = [
  { id: 'gegenstand', titel: 'Gegenstand und Dauer' },
  { id: 'art', titel: 'Art, Zweck, Daten und Betroffene' },
  { id: 'weisungen', titel: 'Weisungen und Vertraulichkeit' },
  { id: 'massnahmen', titel: 'Technische und organisatorische Maßnahmen' },
  { id: 'unterauftrag', titel: 'Unterauftragsverarbeiter' },
  { id: 'unterstuetzung', titel: 'Unterstützung und Meldungen' },
  { id: 'ende', titel: 'Löschung und Rückgabe' },
  { id: 'nachweise', titel: 'Nachweise und Kontrollen' },
] as const;

/**
 * E6.1 — Vorlage zur Auftragsverarbeitung für Organisationen (Art. 28 DSGVO).
 * Beschreibt nur Maßnahmen, die tatsächlich bestehen. Verbindlich wird sie
 * erst mit Unterschrift beider Seiten.
 */
export default function AvvSeite(): React.ReactElement {
  return (
    <Rechtsseite
      titel="Vorlage zur Auftragsverarbeitung"
      einleitung={
        <>
          Für Organisationen, die Lernpfade für ihre Mitglieder nutzen. Verbindlich wird der Vertrag erst mit Unterschrift
          beider Seiten; eine unterschriftsreife Fassung erhalten Sie unter{' '}
          <a href={`mailto:${ANBIETER.email}?subject=Auftragsverarbeitung%20Lernpfade`}>{ANBIETER.email}</a>.
        </>
      }
      inhalt={INHALT}
    >
      <p>
        Zwischen der Organisation, die Lernpfade nutzt (<strong>Verantwortliche</strong>), und der {ANBIETER.firma},{' '}
        {ANBIETER.strasse}, {ANBIETER.ort} (<strong>Auftragsverarbeiter</strong>).
      </p>

      <h2 id="gegenstand">1. Gegenstand und Dauer</h2>
      <p>
        Der Auftragsverarbeiter stellt der Verantwortlichen die Organisationsfunktionen von Lernpfade bereit:
        Organisation, Mitgliedschaften und Rollen, Einladungen, Teams, Lernpläne, Auswertungen des Lernstands und das
        Prüfprotokoll. Der Vertrag gilt, solange die Verantwortliche eine Organisation in Lernpfade führt.
      </p>

      <h2 id="art">2. Art, Zweck, Daten und Betroffene</h2>
      <ul>
        <li>
          <strong>Zweck:</strong> Organisation des Lernens der Mitglieder der Verantwortlichen und Übersicht über deren
          Lernstand im vereinbarten Umfang.
        </li>
        <li>
          <strong>Betroffene:</strong> Mitglieder der Organisation (etwa Beschäftigte, Lernende, Lehrkräfte) und
          eingeladene Personen.
        </li>
        <li>
          <strong>Daten:</strong> Kontokennung, Anzeigename, gegebenenfalls E-Mail-Adresse eingeladener Personen, Rolle,
          Teamzugehörigkeit, Einwilligung zur namentlichen Anzeige mit Zeitpunkt, Lernpläne, Prüfprotokoll der
          Verwaltung; zum Lernstand nur Summen ab drei Personen und, mit Einwilligung der Person, abgeschlossene
          Lektionen, fällige Wiederholungen und der Tag der letzten Aktivität.
        </li>
        <li>
          <strong>Nicht Gegenstand:</strong> Versuche, Bearbeitungszeiten, Antworten und eingereichte Programme gibt
          Lernpfade an die Verantwortliche nicht heraus. Das Lernpfade-Konto und der Lernstand in den Pfaden bleiben in
          der Verantwortung des Auftragsverarbeiters gegenüber der jeweiligen Person.
        </li>
      </ul>

      <h2 id="weisungen">3. Weisungen und Vertraulichkeit</h2>
      <p>
        Der Auftragsverarbeiter verarbeitet die Daten nur auf dokumentierte Weisung der Verantwortlichen; die Funktionen
        von Lernpfade und die Einstellungen der Organisation gelten als solche Weisung. Hält er eine Weisung für
        rechtswidrig, teilt er dies unverzüglich mit. Personen mit Zugriff sind zur Vertraulichkeit verpflichtet.
      </p>

      <h2 id="massnahmen">4. Technische und organisatorische Maßnahmen</h2>
      <ul>
        <li>Betrieb in der Region „EU West“ (Niederlande) des Hosting-Anbieters Railway.</li>
        <li>Verschlüsselte Übertragung (TLS) für alle Adressen von Lernpfade.</li>
        <li>Passwörter nur als kryptografischer Hash; Sitzungen der Plattform verschlüsselt.</li>
        <li>Zweiter Faktor verpflichtend für Admins und Lehrkräfte von Organisationen.</li>
        <li>Rollenbasierte Rechte, geprüft auf dem Server; Prüfprotokoll aller Verwaltungshandlungen.</li>
        <li>
          Datenminimierung: Summen erst ab drei Personen, Einzelwerte nur mit Einwilligung, keine Versuche, Zeiten oder
          Inhalte.
        </li>
        <li>Getrennte Datenbanken je Pfad und für die Plattform.</li>
        <li>
          Fehlerberichte nur bereinigt: ohne E-Mail-Adressen, Kennungen, IP-Adressen, Cookies und Inhalte; der Browser
          meldet an den eigenen Server, nicht an den Dienstleister.
        </li>
        <li>Statusüberwachung der Dienste; tägliche Datensicherungen beim Hosting-Anbieter ab dem 17. Dezember 2026.</li>
      </ul>

      <h2 id="unterauftrag">5. Unterauftragsverarbeiter</h2>
      <ul>
        <li>
          Railway Corporation, San Francisco, USA: Hosting, Region EU West. Drittlandübermittlungen auf Grundlage des
          EU-U.S. Data Privacy Framework und der Standardvertragsklauseln.
        </li>
        <li>Scaleway SAS, Paris, Frankreich: Versand der E-Mails des Lernpfade-Kontos (Bestätigungen, Passwort).</li>
        <li>STRATO GmbH, Berlin: Domains und DNS.</li>
        <li>
          Functional Software, Inc. (Sentry), San Francisco, USA: bereinigte Fehlerberichte, Speicherung in der EU
          (Frankfurt). Drittlandübermittlungen auf Grundlage des EU-U.S. Data Privacy Framework und der
          Standardvertragsklauseln.
        </li>
      </ul>
      <p>
        Über beabsichtigte Änderungen informiert der Auftragsverarbeiter vorab; die Verantwortliche kann aus wichtigem
        Grund widersprechen.
      </p>

      <h2 id="unterstuetzung">6. Unterstützung und Meldungen</h2>
      <p>
        Der Auftragsverarbeiter unterstützt die Verantwortliche bei Anfragen Betroffener, bei der Datenschutz-
        Folgenabschätzung und bei Meldungen an Aufsichtsbehörden. Verletzungen des Schutzes personenbezogener Daten meldet
        er unverzüglich nach Kenntnis.
      </p>

      <h2 id="ende">7. Löschung und Rückgabe</h2>
      <p>
        Nach Vertragsende löscht der Auftragsverarbeiter die Daten der Organisation, sofern keine gesetzliche
        Aufbewahrungspflicht besteht; auf Wunsch stellt er vorher einen Export bereit. Der Lernstand der Personen in den
        Pfaden bleibt davon unberührt.
      </p>

      <h2 id="nachweise">8. Nachweise und Kontrollen</h2>
      <p>
        Der Auftragsverarbeiter stellt die zum Nachweis nötigen Informationen bereit und ermöglicht Überprüfungen nach
        angemessener Ankündigung. Im Übrigen gelten Art. 28 DSGVO und die gesetzliche Haftung.
      </p>
    </Rechtsseite>
  );
}
