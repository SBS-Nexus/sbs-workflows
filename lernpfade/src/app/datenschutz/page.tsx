import type { Metadata } from 'next';
import { Rechtsseite } from '@/components/rechtliches/rechtsseite';
import { ANBIETER, AUFSICHT, GELTUNGSBEREICH } from '@/lib/rechtliches';

export const metadata: Metadata = {
  title: 'Datenschutz',
  description:
    'Wie Lernpfade, das Lernpfade-Konto, PythonPfad, SQLPfad und AIPfad personenbezogene Daten verarbeiten: ohne Tracking, ohne Werbung, Lernstand bleibt im Pfad.',
};

const INHALT = [
  { id: 'verantwortlich', titel: 'Verantwortlicher und Geltungsbereich' },
  { id: 'grundsaetze', titel: 'Grundsätze' },
  { id: 'bereitstellung', titel: 'Bereitstellung, Hosting und Protokolle' },
  { id: 'konto', titel: 'Lernpfade-Konto' },
  { id: 'lernen', titel: 'Lernen in PythonPfad, SQLPfad und AIPfad' },
  { id: 'plattform', titel: 'Lernpfade-Plattform' },
  { id: 'organisationen', titel: 'Organisationen, Teams und Lernpläne' },
  { id: 'speicher', titel: 'Cookies und Speicher im Browser' },
  { id: 'empfaenger', titel: 'Empfänger und Auftragsverarbeiter' },
  { id: 'rechte', titel: 'Ihre Rechte' },
  { id: 'beschwerde', titel: 'Beschwerde bei einer Aufsichtsbehörde' },
  { id: 'entscheidungen', titel: 'Automatisierte Entscheidungen und Änderungen' },
] as const;

/**
 * E6.1 — Datenschutzhinweise nach Art. 13 DSGVO. Beschreibt die tatsächlich
 * betriebenen Verarbeitungen (docs/E6-PLAN.md, Abschnitt 3). Ändert sich eine
 * Verarbeitung, ist diese Seite mitzuändern.
 */
export default function DatenschutzSeite(): React.ReactElement {
  return (
    <Rechtsseite
      titel="Datenschutzhinweise"
      einleitung="Lernpfade kommt ohne Tracking, ohne Werbung und ohne Analysedienste aus. Ihr Lernstand bleibt im jeweiligen Pfad; Organisationen sehen ihn nur in Summen oder mit Ihrer Einwilligung."
      inhalt={INHALT}
    >
      <h2 id="verantwortlich">1. Verantwortlicher und Geltungsbereich</h2>
      <p>Diese Hinweise gelten für die Lernplattform Lernpfade unter folgenden Adressen:</p>
      <ul>
        {GELTUNGSBEREICH.map((adresse) => (
          <li key={adresse}>{adresse}</li>
        ))}
      </ul>
      <p>
        Verantwortlich ist die {ANBIETER.firma}, {ANBIETER.strasse}, {ANBIETER.ort}, {ANBIETER.land}. {ANBIETER.vertretung}
      </p>
      <p>
        Telefon: <a href={`tel:${ANBIETER.telefonLink}`}>{ANBIETER.telefon}</a>
        <br />
        E-Mail: <a href={`mailto:${ANBIETER.email}`}>{ANBIETER.email}</a>
      </p>
      <p>
        Datenschutzanfragen bearbeitet {ANBIETER.datenschutzKontakt} über das Postfach{' '}
        <a href={`mailto:${ANBIETER.email}`}>{ANBIETER.email}</a>. Sie können sich auch postalisch an uns wenden; ein
        bestimmter Betreff oder ein Formular ist nicht nötig. Ein Datenschutzbeauftragter ist derzeit nicht bestellt.
      </p>
      <p>
        Nutzt eine Organisation, etwa ein Arbeitgeber oder eine Schule, Lernpfade für ihre Mitglieder, kann sie für die
        Verarbeitung im Rahmen der Organisation (Mitgliedschaften, Teams, Lernpläne, Auswertungen) selbst
        Verantwortliche sein. Wir verarbeiten diese Daten dann in ihrem Auftrag auf Grundlage eines Vertrags zur
        Auftragsverarbeitung nach Art. 28 DSGVO (<a href="/avv">Vorlage</a>); ergänzend gelten die Hinweise der
        Organisation.
      </p>

      <h2 id="grundsaetze">2. Grundsätze</h2>
      <ul>
        <li>
          Keine Analyse-, Werbe- oder Trackingdienste, keine Cookies zu solchen Zwecken und keine eingebundenen Inhalte
          Dritter. Schriften, Bilder und Skripte liefern wir selbst aus.
        </li>
        <li>Wir verkaufen keine Daten und geben sie nicht zu Werbezwecken weiter.</li>
        <li>
          Keine KI-Dienste Dritter: Die Lernhilfen in den Pfaden arbeiten regelbasiert in unseren eigenen Anwendungen. Ihre
          Eingaben werden nicht an Anbieter von KI-Modellen übermittelt.
        </li>
        <li>
          Ihr Lernstand bleibt im jeweiligen Pfad. Die Plattform liest ihn für Übersichten, speichert ihn aber nicht.
        </li>
      </ul>

      <h2 id="bereitstellung">3. Bereitstellung, Hosting und Protokolle</h2>
      <p>
        Alle Anwendungen und Datenbanken laufen bei der Railway Corporation, San Francisco, USA, in der Region „EU West“
        (Niederlande). Railway verarbeitet die Daten als Auftragsverarbeiter auf Grundlage seiner Vereinbarung zur
        Auftragsverarbeitung (<a href="https://railway.com/legal/dpa">railway.com/legal/dpa</a>). Der Serverstandort
        bedeutet nicht, dass sämtliche Leistungen ausschließlich in der EU erbracht werden: Unterstützung und
        Unterauftragnehmer von Railway können Zugriff aus den USA oder anderen Ländern haben. Für solche Übermittlungen
        sieht die Vereinbarung das EU-U.S. Data Privacy Framework und die Standardvertragsklauseln der EU-Kommission vor.
      </p>
      <p>
        Beim Aufruf verarbeitet die Infrastruktur insbesondere Ihre IP-Adresse, Datum und Uhrzeit, die angeforderte
        Adresse, den Statuscode der Antwort und technische Angaben zur Anfrage (etwa die Browserkennung), um die Inhalte
        auszuliefern, Störungen zu untersuchen und Angriffe abzuwehren. Unsere Anwendungsprotokolle enthalten keine
        Lerninhalte, Antworten oder Passwörter; Kontokennungen erscheinen darin nur gekürzt. Die Protokolle bewahrt
        Railway höchstens 30 Tage auf. Grundlage ist Art. 6 Abs. 1 Buchst. f DSGVO; unsere berechtigten Interessen sind
        die funktionsfähige, sichere Bereitstellung und der Schutz des Angebots.
      </p>
      <p>
        Die Domains lernpfade.net, pythonpfad.de, sqlpfad.de und aipfad.de und ihre DNS-Einträge verwaltet die STRATO
        GmbH, Otto-Ostrowski-Straße 7, 10249 Berlin. Rufen Sie eine Adresse ohne „www“ auf, leitet STRATO Sie weiter und
        verarbeitet dafür die technisch nötigen Verbindungsdaten.
      </p>

      <h2 id="konto">4. Lernpfade-Konto</h2>
      <p>
        Mit einem Lernpfade-Konto melden Sie sich in allen Pfaden und auf der Plattform an. Das Konto betreiben wir selbst
        mit der Software ZITADEL unter konto.lernpfade.net; es gibt keinen externen Anmeldedienst.
      </p>
      <p>
        Wir verarbeiten dafür Ihren Namen, Ihre E-Mail-Adresse und deren Bestätigungsstatus, Ihr Passwort ausschließlich
        als kryptografischen Hash, auf Wunsch einen zweiten Faktor (Passkey oder Authenticator-App) sowie Sitzungen und
        Anmeldeereignisse mit technischen Angaben wie IP-Adresse und Browserkennung, um Missbrauch zu erkennen. Grundlage
        ist Art. 6 Abs. 1 Buchst. b DSGVO (Nutzung des Angebots), für die Absicherung Art. 6 Abs. 1 Buchst. f DSGVO.
      </p>
      <p>
        Bestätigungs-, Passwort- und Sicherheits-E-Mails versenden wir über Scaleway Transactional Email der Scaleway SAS,
        Paris, Frankreich, als Auftragsverarbeiter. Dabei werden Ihre E-Mail-Adresse und der Inhalt der jeweiligen
        Nachricht verarbeitet.
      </p>
      <p>
        Die Kontodaten speichern wir, bis Sie Ihr Konto löschen lassen. Die Löschung können Sie jederzeit unter{' '}
        <a href={`mailto:${ANBIETER.email}`}>{ANBIETER.email}</a> verlangen; einzelne Pfade bieten zusätzlich das
        Löschen der dortigen Daten in den Einstellungen an.
      </p>

      <h2 id="lernen">5. Lernen in PythonPfad, SQLPfad und AIPfad</h2>
      <p>
        Jeder Pfad speichert Ihren Lernstand zu Ihrem Konto: abgeschlossene Lektionen, Ihre Versuche bei Aufgaben
        einschließlich eingereichter Programme und Abfragen, die Planung Ihrer Wiederholungen, im Einstieg angegebene
        Lernziele und den Zeitpunkt Ihrer letzten Aktivität. Damit bieten wir die Lernfunktionen an, zeigen Ihren
        Fortschritt und planen Wiederholungen. Grundlage ist Art. 6 Abs. 1 Buchst. b DSGVO.
      </p>
      <p>
        In SQLPfad führen wir Ihre Abfragen in einer abgeschotteten Datenbankumgebung aus, die keine personenbezogenen
        Daten enthält und nach der Ausführung verworfen wird.
      </p>
      <p>
        Zur Verbesserung der Inhalte zählen die Pfade Ereignisse wie „Lektion abgeschlossen“ ohne Bezug zu Ihrem Konto
        (Art des Ereignisses, betroffener Inhalt, Tag).
      </p>
      <p>Den Lernstand speichern wir, bis Sie ihn im Pfad oder zusammen mit Ihrem Konto löschen.</p>

      <h2 id="plattform">6. Lernpfade-Plattform (www.lernpfade.net)</h2>
      <p>
        Sind Sie auf der Plattform angemeldet, liest sie für die Seiten „Fortschritt“ und „Wiederholen“ Ihren Stand aus
        den Pfaden, mit einem kurzlebigen Zugriffsschlüssel Ihres Kontos. Die Plattform speichert diesen Stand nicht. Ihre
        Anmeldung auf der Plattform liegt verschlüsselt in einem Cookie; er enthält Ihre Kontokennung, Ihren Namen, Ihre
        E-Mail-Adresse und die Schlüssel für den Zugriff, lesbar nur für unseren Server.
      </p>
      <p>
        Ihre Vokabeldecks im VokabelPfad und der Stand des Demo-Decks bleiben ausschließlich in Ihrem Browser und werden
        nicht an uns übertragen.
      </p>

      <h2 id="organisationen">7. Organisationen, Teams und Lernpläne</h2>
      <p>
        Für Organisationen speichern wir den Namen der Organisation, Mitgliedschaften (Kontokennung, Anzeigename, Rolle),
        Teamzugehörigkeiten, Ihre Einwilligung zur namentlichen Anzeige mit Zeitpunkt, Einladungen (nur als Prüfwert des
        Einladungslinks und gegebenenfalls die eingeladene E-Mail-Adresse), Lernpläne sowie ein Prüfprotokoll der
        Verwaltung (wer wann was angelegt oder geändert hat).
      </p>
      <p>
        Admins und Lehrkräfte sehen Namen und Rollen der Mitglieder. Den Stand eines Teams sehen sie nur als Summe, und
        das erst ab drei Personen. Ihre Einzelwerte (abgeschlossene Lektionen, fällige Wiederholungen und der Tag Ihrer
        letzten Aktivität) sehen sie nur, wenn Sie es für das jeweilige Team selbst erlauben. Diese Einwilligung können
        Sie jederzeit mit Wirkung für die Zukunft zurücknehmen. Versuche, Bearbeitungszeiten, Antworten oder eingereichte
        Programme erhält eine Organisation nie. Ein CSV-Export enthält genau dasselbe; jeder Export steht im
        Prüfprotokoll.
      </p>
      <p>
        Grundlage ist Art. 6 Abs. 1 Buchst. b DSGVO (Teilnahme an der Organisation) und für die namentliche Anzeige Ihre
        Einwilligung nach Art. 6 Abs. 1 Buchst. a DSGVO. Ist die Organisation selbst Verantwortliche, siehe Abschnitt 1.
        Mitgliedschaft und Teamzugehörigkeit enden, wenn Sie austreten oder entfernt werden; mit der Organisation werden
        alle zugehörigen Daten gelöscht, nie aber Ihr Lernstand in den Pfaden.
      </p>

      <h2 id="speicher">8. Cookies und Speicher im Browser</h2>
      <p>
        Wir setzen nur Cookies und Speicher, die für die von Ihnen gewünschten Funktionen unbedingt erforderlich sind (§
        25 Abs. 2 Nr. 2 TDDDG). Eine Einwilligung ist dafür nicht nötig; Analyse- oder Werbecookies gibt es nicht.
      </p>
      <div className="recht-tabelle-rahmen">
        <table className="recht-tabelle">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Zweck</th>
              <th scope="col">Dauer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>pythonpfad_session, sqlpfad_session, aipfad_session</td>
              <td>Anmeldung im jeweiligen Pfad</td>
              <td>bis zu 30 Tage</td>
            </tr>
            <tr>
              <td>pythonpfad_anmeldung, sqlpfad_anmeldung, aipfad_anmeldung, lernpfade_anmeldung</td>
              <td>Sicherer Ablauf der Anmeldung über das Lernpfade-Konto</td>
              <td>30 Minuten</td>
            </tr>
            <tr>
              <td>lernpfade_sitzung, lernpfade_abmelden</td>
              <td>Verschlüsselte Anmeldung auf der Plattform und sicheres Abmelden</td>
              <td>bis zu 30 Tage</td>
            </tr>
            <tr>
              <td>Cookies der Anmeldeseite (konto.lernpfade.net)</td>
              <td>Sitzung beim Lernpfade-Konto</td>
              <td>bis zur Abmeldung oder zum Ablauf der Sitzung</td>
            </tr>
            <tr>
              <td>*-theme, *-reduce-motion (Local Storage der Pfade)</td>
              <td>Ihre Einstellungen zu Farbschema und Bewegung</td>
              <td>bis Sie sie im Browser löschen</td>
            </tr>
            <tr>
              <td>lernpfade-vokabeln (IndexedDB), lernpfade-review-state-v1 (Local Storage)</td>
              <td>VokabelPfad und Demo-Deck, nur in Ihrem Browser</td>
              <td>bis Sie sie im Browser löschen</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="empfaenger">9. Empfänger und Auftragsverarbeiter</h2>
      <ul>
        <li>Railway Corporation, USA: Hosting aller Anwendungen und Datenbanken (siehe Abschnitt 3).</li>
        <li>Scaleway SAS, Frankreich: Versand der E-Mails des Lernpfade-Kontos.</li>
        <li>STRATO GmbH, Deutschland: Domains, DNS und Weiterleitungen.</li>
        <li>
          Admins und Lehrkräfte Ihrer Organisation, im Umfang von Abschnitt 7, wenn Sie Mitglied einer Organisation sind.
        </li>
      </ul>
      <p>
        Andere Empfänger gibt es nicht, es sei denn, wir sind gesetzlich zur Herausgabe verpflichtet. Eine Kopie der
        Garantien für Übermittlungen in Drittländer erhalten Sie über den Datenschutzkontakt in Abschnitt 1.
      </p>

      <h2 id="rechte">10. Ihre Rechte</h2>
      <p>Sie haben unter den jeweiligen gesetzlichen Voraussetzungen folgende Rechte:</p>
      <ul>
        <li>Auskunft und eine Kopie Ihrer Daten (Art. 15 DSGVO),</li>
        <li>Berichtigung (Art. 16 DSGVO),</li>
        <li>Löschung (Art. 17 DSGVO),</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO),</li>
        <li>Widerruf einer Einwilligung mit Wirkung für die Zukunft; die Rechtmäßigkeit bis zum Widerruf bleibt unberührt.</li>
      </ul>
      <p>
        <strong>Widerspruch:</strong> Beruht eine Verarbeitung auf Art. 6 Abs. 1 Buchst. f DSGVO, können Sie aus Gründen
        Ihrer besonderen Situation widersprechen. Wir verarbeiten die Daten dann nicht weiter, es sei denn, wir können
        zwingende schutzwürdige Gründe nachweisen oder die Verarbeitung dient der Geltendmachung, Ausübung oder
        Verteidigung von Rechtsansprüchen.
      </p>
      <p>
        Über Maßnahmen auf Ihren Antrag informieren wir Sie unverzüglich, spätestens innerhalb eines Monats; bei
        komplexen oder zahlreichen Anträgen kann sich die Frist nach Art. 12 Abs. 3 DSGVO um bis zu zwei Monate
        verlängern, worüber wir Sie im ersten Monat informieren. Die Bearbeitung ist grundsätzlich unentgeltlich.
      </p>

      <h2 id="beschwerde">11. Beschwerde bei einer Aufsichtsbehörde</h2>
      <p>
        Sie können sich nach Art. 77 DSGVO bei einer Datenschutzaufsichtsbehörde beschweren, insbesondere am Ort Ihres
        gewöhnlichen Aufenthalts, Ihres Arbeitsplatzes oder des vermuteten Verstoßes. Für uns zuständig ist:
      </p>
      <address>
        {AUFSICHT.name}
        <br />
        Hausanschrift: {AUFSICHT.haus}
        <br />
        Postanschrift: {AUFSICHT.post}
        <br />
        Telefon: {AUFSICHT.telefon}
        <br />
        E-Mail: <a href={`mailto:${AUFSICHT.email}`}>{AUFSICHT.email}</a>
        <br />
        Website: <a href={AUFSICHT.website}>{AUFSICHT.website}</a>
      </address>

      <h2 id="entscheidungen">12. Automatisierte Entscheidungen und Änderungen</h2>
      <p>
        Lernpfade trifft keine ausschließlich automatisierten Entscheidungen, die Ihnen gegenüber rechtliche Wirkung
        entfalten oder Sie in ähnlicher Weise erheblich beeinträchtigen. Wiederholungstermine und Lernhinweise sind
        Empfehlungen.
      </p>
      <p>Diese Hinweise werden aktualisiert, wenn sich die beschriebenen Verarbeitungen ändern.</p>
    </Rechtsseite>
  );
}
