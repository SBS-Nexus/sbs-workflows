# E4 · Ein Konto für alles – Plan

Stand 19.11.2026. Gehört zu `docs/PRODUKT-ROADMAP.md`, Etappe E4 (Lücke L2,
mittelbar L6). Entschieden ist: **eigener Identitätsdienst**, betrieben auf
Railway in der EU, kein gehosteter Anbieter. Dieses Dokument legt fest, welcher
Dienst, wie die bestehenden Konten zusammenkommen, in welchen Etappen das
passiert und was es kostet. Umgesetzt wird erst nach Freigabe der Entscheidungen
in Abschnitt 9.

**Fertig, wenn:** Jemand sich einmal registriert, damit in PythonPfad, SQLPfad,
AIPfad und im Hub angemeldet ist, ohne ein zweites Mal ein Passwort einzugeben,
bestehende Konten mit seiner E-Mail-Adresse wiedergefunden hat, sein Passwort
per E-Mail zurücksetzen kann und sich an einer Stelle überall abmeldet.

> **Stand nach E4.0 (19.11.2026, `docs/E4-0-MACHBARKEIT.md`):** ZITADEL v4.20.5
> erfüllt alle Tore.
>
> - Die Anmelde-App steht unter **MIT**.
> - App-Hashes im scrypt-Format werden angenommen.
> - Rückkanal-Abmeldung und PKCE S256 sind vorhanden.
> - Der Dienst braucht 0,31 GB Arbeitsspeicher, Postgres 0,16 GB.
> - Heute gibt es **2 Konten** (je eines in PythonPfad und SQLPfad), ohne
>   Überschneidung.
>
> Kosten neu geschätzt: ca. 7–12 USD im Monat. Die Domain steht fest
> (`lernpfade.net`, `konto.lernpfade.net`), der Mailversand auch (Scaleway TEM,
> seit 20.11.2026 eingerichtet und für `lernpfade.net` verifiziert).
> Der zweite Faktor ist am 20.11.2026 entschieden. **Alle Entscheidungen aus
> Abschnitt 9 sind gefallen, E4.1 kann beginnen.**

---

## 1. Ausgangslage

|                   | PythonPfad                                                                            | SQLPfad               | AIPfad                | Hub                |
| ----------------- | ------------------------------------------------------------------------------------- | --------------------- | --------------------- | ------------------ |
| Konten            | eigene Tabelle `User`                                                                 | eigene Tabelle `User` | eigene Tabelle `User` | keine              |
| Anmeldung         | E-Mail + Passwort                                                                     | E-Mail + Passwort     | E-Mail + Passwort     | –                  |
| Passwort-Speicher | scrypt, `scrypt$N$r$p$salt$hash`                                                      | gleich                | gleich                | –                  |
| Sitzung           | eigenes Token, nur SHA-256 in der DB, Cookie httpOnly/SameSite=Lax, CSRF-Doppel-Token | gleich                | gleich                | –                  |
| E-Mail-Versand    | **keiner**                                                                            | **keiner**            | **keiner**            | –                  |
| Organisationen    | Organisation, Mitgliedschaft, Kohorte, Einladung                                      | dieselben Modelle     | keine                 | –                  |
| Domain            | www.pythonpfad.de                                                                     | www.sqlpfad.de        | www.aipfad.de         | `*.up.railway.app` |

Was daraus folgt:

1. **Kein Passwort-Zurücksetzen, keine bestätigten E-Mail-Adressen.** Heute kann
   jede Person jede Adresse registrieren. Für die Zusammenführung heißt das: Eine
   E-Mail-Adresse in einer App-Datenbank ist **kein Beleg**, dass die Person sie
   besitzt (Abschnitt 5).
2. **Getrennte registrierbare Domains.** Ein gemeinsames Cookie ist unmöglich.
   Einmalanmeldung (SSO) geht nur über Weiterleitungen zu einem Dienst auf
   eigener Domain, dessen Sitzung in seinem eigenen Cookie liegt. Das ist ein
   Erstanbieter-Cookie beim Weiterleiten und deshalb unabhängig davon, dass
   Browser Drittanbieter-Cookies sperren.
3. **Die Sitzungen der Apps bleiben.** Sie sind sauber gebaut. Was wechselt, ist
   nur, _wer_ beweist, dass jemand die Person ist: künftig der Identitätsdienst,
   danach legt die App wie bisher ihre eigene Sitzung an.
4. **Der Hub hat noch keine eigene Domain** (L6). Der Identitätsdienst braucht
   eine – das ist die erste Entscheidung (Abschnitt 9).

## 2. Anforderungen

- **Einmalanmeldung** über Hub und alle Apps per OpenID Connect,
  Autorisierungscode mit PKCE; nur Weiterleitungen auf oberster Ebene, keine
  versteckten iframes.
- **Konto-Abläufe**: Registrieren, E-Mail bestätigen, Passwort vergessen,
  Passwort ändern, E-Mail ändern, Konto löschen.
- **Abmelden überall**: von der Anmeldeseite und aus jeder App
  (RP-initiated Logout), dazu Rückkanal-Abmeldung an die übrigen Apps.
- **Sicherheit**: Brute-Force-Bremse, Passwortregeln wie heute (Passphrase),
  zweiter Faktor (TOTP, Passkeys) freiwillig für Lernende, Pflicht für
  Organisations- und Systemadmins; Ereignisprotokoll.
- **Daten in der EU**: Dienst und Datenbank in Railway `europe-west4`,
  E-Mail-Versand über einen Anbieter mit EU-Verarbeitung und AVV.
- **Aussehen**: Anmelde- und Kontoseiten im Learning OS (Papier, Tinte, IBM Plex,
  Akzentzeile), Deutsch, WCAG 2.2 AA – dieselben Maßstäbe wie die Apps.
- **Für E5 vorbereitet**: Organisationen im Identitätsdienst, Anmeldung über die
  eigene Firmenanmeldung eines Kunden (OIDC/SAML, z. B. Microsoft Entra ID),
  Zuordnung über die E-Mail-Domain.
- **Bestehende Passwörter weiterverwenden**, wo es sicher geht – niemand soll zum
  Start ein neues Passwort setzen müssen.

## 3. Optionen

|                                  | ZITADEL                                                                                              | Keycloak                                               | Ory Kratos + Hydra                                                  | Eigenbau auf `oidc-provider`                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------- |
| Art                              | fertiger Identitätsdienst (Go)                                                                       | fertiger Identitätsdienst (Java)                       | Bausteine ohne Oberfläche (Go)                                      | Bibliothek (Node), alles Weitere selbst         |
| Lizenz                           | Kern AGPL-3.0 seit v3; Lizenz der anpassbaren Anmelde-App laut Quellen uneinheitlich (AGPL oder MIT) | Apache-2.0                                             | Apache-2.0                                                          | MIT, OpenID Certified                           |
| scrypt-Hashes übernehmen         | ja, Verifizierer muss eingeschaltet werden                                                           | nicht ohne eigene Java-Erweiterung                     | ja (`$scrypt$ln=…`), Umwandlung nötig                               | ja, gleiches Verfahren                          |
| Organisationen, Firmen-SSO (E5)  | eingebaut (Organisationen, OIDC/SAML-Anbieter je Organisation)                                       | eingebaut (Organizations seit 26, Brokering OIDC/SAML) | soziale Anbieter ja; SAML/Firmen-SSO nicht im freien Teil gesichert | selbst bauen                                    |
| Anmeldeoberfläche im Learning OS | eigene Next.js-Anmelde-App möglich                                                                   | Themes (FreeMarker oder Keycloakify)                   | komplett selbst bauen                                               | komplett selbst bauen                           |
| Arbeitsspeicher (klein)          | Testbetrieb laut Doku 1 CPU / 512 MB                                                                 | Doku empfiehlt 2 GB Grenze für kleine Produktion       | klein                                                               | klein                                           |
| Eigene Verantwortung             | Betrieb, Updates                                                                                     | Betrieb, Updates, Java-Theming                         | Oberfläche und Abläufe                                              | **alles**: MFA, Passkeys, Mails, Sperren, Admin |

**Empfehlung: ZITADEL**, mit Keycloak als Rückfallebene.

- Bestehende scrypt-Hashes lassen sich übernehmen; niemand muss zum Start ein
  neues Passwort setzen.
- Organisationen und Firmen-SSO sind eingebaut; E5 baut darauf auf, statt es
  nachzurüsten.
- Die Anmeldeoberfläche ist eine Next.js-App. Sie kann den Token-Vertrag
  (`learning-tokens.css`) und IBM Plex direkt übernehmen und sieht damit aus wie
  der Rest der Plattform.
- Er ist sparsam genug für einen kleinen Railway-Dienst.

Der Eigenbau scheidet aus, weil er die sicherheitskritischsten Teile (MFA,
Passkeys, Sperren, Wiederherstellung) in unsere Verantwortung legt. Ory ist
solide, verlangt aber dieselbe Oberflächenarbeit ohne die eingebauten
Firmenfunktionen. Keycloak ist die sichere Wahl, falls die Machbarkeitsprüfung
(E4.0) bei ZITADEL scheitert – etwa an der Lizenz der Anmelde-App oder am
Hash-Import.

**Lizenzhinweis AGPL-3.0:** Wer AGPL-Software unverändert als Dienst betreibt,
muss nichts offenlegen. Wer sie verändert und über das Netz anbietet, muss den
veränderten Quelltext anbieten. Für den unveränderten ZITADEL-Kern ist das
unkritisch. Für eine angepasste Anmelde-App hängt es an deren Lizenz – genau das
klärt E4.0, bevor eine Zeile Oberfläche entsteht. Keine Rechtsberatung; bei
Zweifel vorher prüfen lassen.

## 4. Zielbild

```
                    konto.<plattform-domain>   (ZITADEL + Anmelde-App, EU)
                     │  Sitzungs-Cookie nur hier
       ┌─────────────┼───────────────┬───────────────┐
       ▼             ▼               ▼               ▼
  www.pythonpfad.de  www.sqlpfad.de  www.aipfad.de   Hub
  (OIDC-Client)      (OIDC-Client)   (OIDC-Client)   (OIDC-Client)
  eigene Sitzung     eigene Sitzung  eigene Sitzung  eigene Sitzung
  eigene Lerndaten   eigene Lerndaten eigene Lerndaten Gesamtsicht (L6)
```

- **Anmelden:** „Anmelden" in einer App leitet zu `konto.…` weiter
  (`/authorize`, Code + PKCE, `state`, `nonce`). Nach der Anmeldung kommt die
  Person auf `/auth/rueckkehr` der App zurück. Die App prüft das ID-Token
  (Signatur über JWKS, `iss`, `aud`, `nonce`, Ablauf), findet oder verknüpft das
  lokale Konto (Abschnitt 5) und legt mit dem **bestehenden** Sitzungscode ihre
  Sitzung an.
- **Zweite App:** Die Weiterleitung findet die Sitzung auf `konto.…` und kehrt
  ohne Passworteingabe zurück. Das ist ein kurzer Sprung über die
  Anmeldedomain, kein erneutes Anmelden.
- **Registrieren** findet nur noch im Identitätsdienst statt. Die lokale
  Registrierung der Apps entfällt nach der Umstellung.
- **Abmelden:** Die App beendet ihre Sitzung und leitet zu `end_session` weiter.
  Der Dienst beendet seine Sitzung und benachrichtigt die übrigen Apps über die
  Rückkanal-Abmeldung (`/auth/abmelden-rueckkanal`), die deren Sitzungen für
  diese Person löscht.
- **Lerndaten bleiben, wo sie sind.** Jede App behält ihre Datenbank; neu ist nur
  die Verknüpfung `User.authSubject` (die unveränderliche ID der Person im
  Identitätsdienst).
- **Hub:** wird ebenfalls Client. Mit der echten Identität fragt er die
  Plattformquellen der Apps im Namen der angemeldeten Person ab (L6) statt
  über die heutige Föderation.

Änderungen je App (gleich gebaut, als neuer gemeinsamer Vertrag
`docs/learning-auth/` mit Drift-Prüfung wie die übrigen):

- Schema: `User.authSubject String? @unique`, `User.authLinkedAt DateTime?`.
- Umgebung: `AUTH_ISSUER`, `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`,
  `FEATURE_ZENTRALE_ANMELDUNG`.
- Routen: `/anmelden` und `/registrieren` leiten weiter; dazu
  `/auth/rueckkehr`, `/abmelden` und `/auth/abmelden-rueckkanal`.
- Bibliothek: `openid-client` (MIT, derselbe Autor wie `oidc-provider`) statt
  Eigenbau der Protokollprüfung.

## 5. Bestehende Konten zusammenführen

Die Regel: **Verknüpft wird nur über eine bestätigte E-Mail-Adresse.** Weil die
Apps E-Mails nie bestätigt haben, gilt keine importierte Adresse als bestätigt.

1. **Ausfuhr** je App: E-Mail (kleingeschrieben, getrimmt), Name, Passwort-Hash,
   letzte Aktivität. Keine Lerndaten.
2. **Zusammenfassen** nach E-Mail. Gibt es dieselbe Adresse in mehreren Apps,
   wird der Hash des **zuletzt aktiven** Kontos übernommen.
3. **Einfuhr** in den Identitätsdienst: ein Konto je Adresse, E-Mail
   _unbestätigt_, Hash im scrypt-Format des Dienstes (umgewandelt aus
   `scrypt$N$r$p$salt$hash`). Probelauf mit Kopien, Zahlen ins Protokoll.
4. **Erste Anmeldung nach der Umstellung:**
   - Die Person meldet sich mit ihrer E-Mail und ihrem bisherigen Passwort an.
   - Der Dienst verlangt einmalig die Bestätigung der E-Mail per Code.
   - Erst dann verknüpft jede App ihr lokales Konto mit dieser Adresse
     (`authSubject` setzen). Die Lerndaten der Person sind danach in jeder App
     wieder da.
5. **Hat jemand in den Apps verschiedene Passwörter benutzt,** funktioniert nur
   das zuletzt benutzte. Die Anmeldeseite sagt das ausdrücklich und bietet
   „Passwort per E-Mail neu setzen" an. Damit gibt es erstmals überhaupt ein
   Zurücksetzen.
6. **Fremd registrierte Adresse:** Hat jemand früher eine fremde Adresse
   registriert, verliert er den Zugang. Die Bestätigung kann nur, wer das
   Postfach hat, und dessen Konto gewinnt. Das ist gewollt.
7. **Nie angemeldet:** Importierte Konten, die nach einer Frist nie bestätigt
   wurden, werden gelöscht. Die Frist schlage ich mit 12 Monaten vor, abgestimmt
   mit dem Aufbewahrungslauf aus E6.

Die Rollen bleiben in den Apps (Lernende, Admin; Organisationsrollen in
PythonPfad und SQLPfad). Der Identitätsdienst weiß, _wer_ jemand ist, die App
weiß, _was_ diese Person darf. Das ändert sich erst mit E5.

## 6. Datenschutz und Löschen

- Daten im Identitätsdienst: E-Mail, Name, Passwort-Hash, zweiter Faktor,
  Anmeldeereignisse. Keine Lerndaten.
- **Konto löschen** im Identitätsdienst löst über ein signiertes Ereignis an jede
  App deren Löschung aus. Wer nur eine App verlassen will, löscht dort wie heute.
- **Auskunft und Export:** Der Dienst liefert seine Daten, die Apps ihre. Der Hub
  bündelt beides, sobald L6 steht.
- Neue Auftragsverarbeitung: der E-Mail-Anbieter. Die Datenschutzerklärungen der
  Apps nennen den Identitätsdienst und den Mailversand; das gehört zu E6
  (Rechtsseiten).

## 7. Etappen

Jede Etappe endet wie in der Roadmap: grüne CI, axe, Aufnahmen und ein
Rundgang. Jede hat ein Tor, an dem erst weitergemacht wird, wenn es erfüllt
ist.

| Etappe                          | Inhalt                                                                                                                                                                                                                                                                              | Tor                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **E4.0 Machbarkeit** (1–2 Tage) | ZITADEL als Probe auf Railway (Staging): Speicher und CPU messen, scrypt-Import mit einem Test-Hash im App-Format, Rückkanal-Abmeldung, Lizenz der Anmelde-App aus der LICENSE-Datei, Mailversand mit dem gewählten Anbieter. Konten zählen (je App, Überschneidungen nach E-Mail). | Bericht mit Messwerten; bei einem harten Fehlschlag Wechsel auf Keycloak                                        |
| **E4.1 Identitätsdienst**       | Dienst und eigene Postgres auf Railway, Domain `konto.…`, Mailversand, Passwortregeln, Sperren, TOTP und Passkeys, Sicherung der Datenbank. Anmelde-App im Learning OS (Deutsch, Token-Vertrag, IBM Plex).                                                                          | Sicherheits-Checkliste, axe auf allen Kontoseiten, Rundgang Registrieren → Bestätigen → Zurücksetzen → Abmelden |
| **E4.2 Erste App**              | AIPfad (keine Organisationsdaten, kleinster Umbau) hinter `FEATURE_ZENTRALE_ANMELDUNG`: Client, Rückkehr, Verknüpfung, Abmelden, Rückkanal. Vertrag `docs/learning-auth/` mit Drift-Prüfung. In der CI ein ZITADEL-Container für die E2E-Tests.                                     | CI grün einschließlich E2E gegen echten Dienst; Rundgang auf Staging                                            |
| **E4.3 Übernahme der Konten**   | Ausfuhr, Zusammenfassen, Einfuhr (Abschnitt 5) – erst Probelauf auf Kopien, dann echt. Hinweis-Mail an alle Konten („Ein Konto für alle Pfade"), Text und Versand erst nach ausdrücklicher Freigabe.                                                                                | Probelauf-Bericht: Anzahl Konten, Überschneidungen, Fehler = 0                                                  |
| **E4.4 Umstellung**             | PythonPfad und SQLPfad wie AIPfad. Lokale Registrierung aus, lokale Anmeldung leitet um. Die alte Passwortspalte bleibt zunächst, ist aber nicht mehr nutzbar.                                                                                                                      | Fehlerrate bei Anmeldungen beobachtet, Rücknahme beschrieben und geprobt                                        |
| **E4.5 Hub und Aufräumen**      | Hub als Client, Gesamtfortschritt und Wiederholungen mit echter Identität (L6). Nach der Frist: Passwort-Hashes aus den App-Datenbanken löschen, lokalen Anmeldecode entfernen.                                                                                                     | `/fortschritt` im Hub zeigt echte Daten der angemeldeten Person                                                 |

**Rücknahme:** Bis E4.4 kann jede App über `FEATURE_ZENTRALE_ANMELDUNG=false`
zur eigenen Anmeldung zurück. Die Hashes bleiben bis E4.5 in den
App-Datenbanken, gerade damit das geht.

## 8. Kosten (monatlich, Schätzung)

Railway rechnet nach Verbrauch ab: etwa 10 USD je GB Arbeitsspeicher und Monat,
20 USD je vCPU und Monat, jeweils sekundengenau. Die Werte unten sind
Schätzungen; **E4.0 misst sie**, und vor jeder Kostenposition siehst du den
endgültigen Preis.

| Posten                     | ZITADEL                                                                | Keycloak (Rückfall)            |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------ |
| Dienst (dauerhaft laufend) | ca. 0,5–1 GB → 5–10 USD + CPU nach Last, wenige USD                    | ca. 1,5–2 GB → 15–20 USD + CPU |
| Anmelde-App (Next.js)      | ca. 0,25–0,5 GB → 3–5 USD                                              | entfällt (Themes im Dienst)    |
| Eigene Postgres            | 1–3 USD                                                                | 1–3 USD                        |
| Mailversand (EU)           | anfangs 0 € (Gratis-Kontingente der EU-Anbieter reichen für den Start) | gleich                         |
| Domain für `konto.…`       | 0 € mit vorhandener Domain, sonst ca. 10–20 € im **Jahr**              | gleich                         |
| **Summe**                  | **ca. 10–20 USD/Monat**                                                | **ca. 20–30 USD/Monat**        |

**Gemessen in E4.0:**

| Dienst                 | Speicher         | Kosten im Monat  |
| ---------------------- | ---------------- | ---------------- |
| ZITADEL                | 0,31 GB          | ca. 3 USD        |
| Postgres               | 0,16 GB          | ca. 1,5–2 USD    |
| CPU nach Last          | Spitze 0,16 vCPU | wenige USD       |
| Anmelde-App (erwartet) | 0,2–0,3 GB       | ca. 2–3 USD      |
| **Zusammen**           |                  | **ca. 7–12 USD** |

## 9. Entscheidungen, die vor E4.1 fallen müssen

1. **Plattform-Domain – entschieden am 19.11.2026: `lernpfade.net`.**
   - Bei Strato als Inklusiv-Domain im Paket Hosting Pro bestellt, 0 €
     (Bestellvorgang 33277). Strato meldet die Einrichtung per E-Mail.
   - Verwendung: `lernpfade.net` für den Hub (L6), `konto.lernpfade.net` für
     die Anmeldung.
   - DNS wie bei den Fach-Apps: `www` und `konto` als CNAME auf Railway, die
     nackte Domain per 301 auf `www` (Strato kann keinen CNAME auf der
     nackten Domain).
   - `lernpfade.app` wäre frei gewesen (18 € im ersten Jahr, danach
     21,60 €), wurde aber wegen der Kosten verworfen. `.net` erzwingt
     HTTPS nicht schon im Browser; die Dienste senden HSTS, später ist ein
     Eintrag in die HSTS-Preload-Liste möglich.
   - Geprüft und vergeben: `lernpfade.de`, `.com`, `.org`, `.eu`, `lernpfad.de`.
2. **Identitätsdienst bestätigen:** ZITADEL (empfohlen) mit Keycloak als
   Rückfall. Nach E4.0: Die Anmelde-App ist MIT, der AGPL-Kern läuft
   unverändert. Aus Lizenzsicht spricht nichts mehr für Keycloak.
3. **Mailanbieter – entschieden am 20.11.2026: Scaleway TEM** (Tarif Essential), Verarbeitung in der EU. Bedarf:
   Bestätigungs- und Zurücksetzen-Mails, anfangs wenige pro Tag. ZITADEL kann
   SMTP und HTTP.

   | Anbieter                           | Kosten für uns                                                                            | Standort, Firma                                                               | Hinweise                                                                                                                        |
   | ---------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
   | **Scaleway TEM** (Tarif Essential) | 300 Mails/Monat frei, danach 0,25 € je 1.000; kein Grundpreis                             | Paris (`fr-par`), Scaleway SAS (Frankreich), eigene Rechenzentren             | nur für Transaktionsmails gedacht, SMTP und API, anfangs bis 10.000 Mails/Monat; neues Konto mit Zahlungsmittel nötig           |
   | **Brevo** (Free)                   | 300 Mails/Tag frei (Angabe aus Vergleichsseiten, Herstellerseite rendert erst im Browser) | EU (OVH Frankreich/Deutschland, Google Cloud Belgien), Brevo SAS (Frankreich) | SMTP und API, AVV im Konto; eigentlich eine Marketing-Plattform                                                                 |
   | **Mailjet** (Free)                 | 6.000 Mails/Monat, höchstens 200/Tag                                                      | EU-Server, Sinch (Schweden)                                                   | SMTP und API; Unterauftragsverarbeiter teils in den USA; das Mailjet-Logo entfällt erst ab dem Tarif Essential                  |
   | **Strato-Postfach** (im Paket)     | 0 €, vorhanden                                                                            | Deutschland, Strato GmbH                                                      | DKIM-Signatur für alles über `smtp.strato.de`; Versandgrenzen nicht veröffentlicht, geteilte IPs, Berichte über Spam-Einstufung |

   **Empfehlung: Scaleway TEM.** Es ist ein reiner Transaktionsdienst ohne
   US-Mutter mit eigenen EU-Rechenzentren. Das ist das stärkste Argument
   gegenüber Firmenkunden. Bei unserem Aufkommen kostet es praktisch nichts,
   und ein Wachstum auf 10.000 Mails im Monat läge bei rund 2,50 €. Das
   Strato-Postfach taugt als kostenloser Notbehelf für die Testumgebung,
   nicht für Anmeldecodes im Betrieb: Dort zählt, dass die Mail ankommt.

   Einrichtung – **erledigt am 20.11.2026, Domain bei Scaleway „Verified“**:
   - Scaleway-Organisation „LearnIT“, Projekt `lernpfade`, Tarif Essential in
     `fr-par`. Konto und Zahlungsmittel hast du selbst angelegt.
   - Absenderdomain `lernpfade.net`, bei Strato eingetragen:

     | Eintrag     | Name                                              | Wert                                                          |
     | ----------- | ------------------------------------------------- | ------------------------------------------------------------- |
     | SPF (TXT)   | `lernpfade.net`                                   | `v=spf1 include:_spf.tem.scaleway.com -all`                   |
     | DKIM (TXT)  | `9cac10ab-1b37-4888-8f90-add4591fe11a._domainkey` | öffentlicher Schlüssel aus der Scaleway-Konsole (420 Zeichen) |
     | DMARC (TXT) | `_dmarc`                                          | `v=DMARC1;p=reject;` (Strato-Standardregel, unverändert)      |

   - Der MX bleibt bei Strato (`smtpin.rzone.de`), damit `lernpfade.net`
     weiter Mail empfangen kann. Die Strato-SPF-Regel steht auf „Keine“. Soll
     später auch Strato-Mail von `lernpfade.net` senden, muss Strato in den
     SPF-Eintrag.
   - Für ZITADEL (E4.1): SMTP `smtp.tem.scaleway.com`, Port 465 (TLS),
     Benutzer = Projekt-ID, Passwort = API-Schlüssel einer IAM-Anwendung mit
     Rechten nur für Transactional Email. Den Schlüssel erzeugst du und trägst
     ihn selbst als Railway-Geheimwert ein.

4. **Zweiter Faktor – entschieden am 20.11.2026:** freiwillig für Lernende,
   Pflicht für alle mit Admin- oder Organisationsrechten.
   - ZITADEL kann den zweiten Faktor nur je Instanz oder Organisation
     erzwingen, nicht je Rolle. Die Pflicht setzen deshalb die Apps durch: In
     Admin- und Organisationsbereichen prüfen sie, ob die Anmeldung mit
     zweitem Faktor erfolgte (Claim `amr` im Token), und schicken sonst zur
     Einrichtung bzw. zur erneuten Anmeldung. Ob ZITADEL `amr` dafür
     verlässlich liefert, prüft E4.1 als Erstes.
   - Lernende sehen das Angebot im Konto, werden aber nicht gedrängt.

## 10. Risiken

| Risiko                                               | Gegenmaßnahme                                                                                                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| scrypt-Import scheitert am Format                    | E4.0 prüft mit echtem Test-Hash; sonst Passwort beim nächsten Anmelden in der App abfangen und neu setzen (Übergangsweg) oder E-Mail-Zurücksetzen für alle |
| Rückkanal-Abmeldung fehlt oder ist unzuverlässig     | E4.0 prüft; sonst kurze Sitzungsdauer in den Apps plus Prüfung beim Dienst (`prompt=none` nur per Weiterleitung)                                           |
| Anmeldedienst fällt aus → niemand kann sich anmelden | bestehende App-Sitzungen laufen weiter (30 Tage); Gesundheitsprüfung und Alarm aus E6; Sicherung und geprobte Wiederherstellung                            |
| Lizenzpflichten der Anmelde-App                      | vor der Anpassung klären (E4.0); Keycloak als lizenzfreundlicher Rückfall                                                                                  |
| Verwechslung durch nie bestätigte Adressen           | Verknüpfung nur nach Bestätigung (Abschnitt 5)                                                                                                             |

## Quellen

- ZITADEL – Import und unterstützte Hash-Verfahren: https://zitadel.com/docs/concepts/architecture/secrets, https://zitadel.com/docs/guides/migrate/users
- ZITADEL – Lizenz (AGPL-3.0 ab v3): https://zitadel.com/blog/apache-to-agpl, https://zitadel.com/license-faq
- ZITADEL – Anmelde-App selbst betreiben: https://zitadel.com/blog/how-to-self-host-zitadel-typescript-login-ui
- ZITADEL – Ressourcen: https://zitadel.com/docs/self-hosting/manage/production
- Keycloak – Speicher und CPU: https://www.keycloak.org/high-availability/concepts-memory-and-cpu-sizing
- Keycloak – Organisationen (26): https://www.cncf.io/blog/2024/11/13/scalable-authentication-across-organizations-with-keycloak-26/
- Ory Kratos – Import mit Hashes: https://www.ory.com/docs/kratos/manage-identities/import-user-accounts-identities
- `oidc-provider` (OpenID Certified, MIT): https://www.npmjs.com/package/oidc-provider
- Railway – Abrechnung nach Verbrauch: https://blog.railway.com/p/usage-based-vs-fixed-pricing-2026
- EU-Mailanbieter im Vergleich: https://ahasend.com/blog/best-european-email-apis-2026/
