# E4.0 · Machbarkeit ZITADEL – Bericht

Stand 19.11.2026. Etappe E4.0 aus `docs/E4-KONTO-PLAN.md`. Geprüft auf der
Railway-Testumgebung (`sbs-lernpfade-staging`, Region `europe-west4`) mit
ZITADEL **v4.20.5** (Release vom 18.11.2026) und einer eigenen, flüchtigen
Postgres 17. Die Probe-Instanz wurde danach wieder entfernt.

**Ergebnis: ZITADEL ist geeignet. Alle Tore von E4.0 sind erfüllt; kein Grund,
auf Keycloak auszuweichen.**

## 1. Ergebnisse

| Prüfpunkt                   | Ergebnis                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lizenz der Anmelde-App      | **MIT** (`apps/login/LICENSE` im ZITADEL-Repository). Der Kern ist AGPL-3.0 und läuft unverändert. Die Anmeldeseiten dürfen wir frei im Learning OS gestalten, ohne Offenlegungspflicht. Die offene Frage aus dem Plan ist damit geklärt.                                                                                                                           |
| scrypt-Import               | **funktioniert**. Ein Hash, erzeugt exakt wie in den Apps (N=65536, r=8, p=1, 16 Byte Salt, 64 Byte Schlüssel), umgeschrieben zu `$scrypt$ln=16,r=8,p=1$<salt>$<hash>` (Base64 ohne Auffüllung), wird angenommen. Richtiges Passwort → Sitzung angelegt (201), falsches → abgelehnt (400). Voraussetzung: `ZITADEL_SYSTEMDEFAULTS_PASSWORDHASHER_VERIFIERS=scrypt`. |
| Umlaute im Passwort         | funktionieren (201 / 400).                                                                                                                                                                                                                                                                                                                                          |
| Sonderfall NFKC             | Die Apps normalisieren Passwörter vor dem Hashen (NFKC), ZITADEL nicht. Bei einem Passwort mit Ligatur („ﬁ") klappt die Anmeldung nur mit der normalisierten Fassung. **Lösung:** Die eigene Anmelde-App normalisiert vor dem Absenden ebenfalls NFKC – für übernommene und neue Konten gleich.                                                                     |
| Rückkanal-Abmeldung         | unterstützt: `backchannel_logout_supported` und `backchannel_logout_session_supported` sind `true`, `end_session_endpoint` vorhanden.                                                                                                                                                                                                                               |
| PKCE                        | `S256`.                                                                                                                                                                                                                                                                                                                                                             |
| Anmelde-App                 | Neue Instanzen setzen sie voraus (Feature `loginV2.required = true`). Für jeden echten Anmeldefluss muss sie als eigener Dienst laufen – so war es im Plan ohnehin vorgesehen.                                                                                                                                                                                      |
| Mailversand                 | SMTP-Schnittstelle vorhanden, noch ohne Anbieter. Getestet wird, sobald der Anbieter entschieden ist (Entscheidung 3 im Plan).                                                                                                                                                                                                                                      |
| Antwortzeit Passwortprüfung | nacheinander Median **0,92 s** (p90 1,03 s, max 1,28 s); zehn gleichzeitig Median 1,29 s (max 1,49 s), alle 40 erfolgreich. Den Großteil macht das bewusst teure scrypt aus (rund 64 MB Speicher je Prüfung).                                                                                                                                                       |
| Arbeitsspeicher             | ZITADEL höchstens **0,31 GB** (nach der Last), Postgres 0,16 GB.                                                                                                                                                                                                                                                                                                    |
| CPU                         | Spitze 0,16 vCPU im 30-Sekunden-Mittel, sonst nahe 0.                                                                                                                                                                                                                                                                                                               |

## 2. Konten heute

Gezählt im privaten Railway-Netz. Verglichen wurden nur Prüfsummen der
kleingeschriebenen Adressen im Container, ausgegeben nur Zahlen.

|                             | PythonPfad | SQLPfad | AIPfad |
| --------------------------- | ---------- | ------- | ------ |
| Konten                      | 1          | 1       | 0      |
| davon Admin                 | 0          | 0       | 0      |
| neu in den letzten 30 Tagen | 1          | 1       | 0      |

Überschneidungen nach E-Mail: keine. **Personen insgesamt: 2.**

Die Übernahme (E4.3) ist damit kein Risiko. Das Werkzeug wird trotzdem
vollständig gebaut und an Kopien geprobt: bis zum Start kommen Konten dazu, und
derselbe Weg gilt für jede weitere App.

## 3. Was das für den Plan heißt

- **Kosten nach unten korrigiert.**

  | Dienst                 | Speicher   | Kosten im Monat  |
  | ---------------------- | ---------- | ---------------- |
  | ZITADEL                | 0,3 GB     | ca. 3 USD        |
  | Postgres               | 0,16 GB    | ca. 1,5–2 USD    |
  | Anmelde-App (erwartet) | 0,2–0,3 GB | ca. 2–3 USD      |
  | CPU nach Last          | –          | wenige USD       |
  | **Zusammen**           |            | **ca. 7–12 USD** |

  Die Schätzung im Plan lag bei 10–20 USD.

- **Anmelde-App** im eigenen Repository-Ordner auf Basis von `apps/login` (MIT):
  - NFKC-Normalisierung des Passworts,
  - Learning-OS-Theme mit Token-Vertrag und IBM Plex,
  - Deutsch als Sprache.
- **Konfiguration für den Betrieb:**
  - `start-from-init --masterkeyFromEnv --tlsMode external` hinter dem
    Railway-Proxy,
  - Postgres über das private Netz,
  - scrypt-Verifizierer eingeschaltet.

  Der Masterkey gehört in einen Railway-Geheimwert und in die Sicherung. Ohne
  ihn sind die verschlüsselten Daten nicht lesbar.

- **Persistente Postgres mit Sicherung** statt der flüchtigen Probe-Datenbank
  (E4.1).

## 4. Durchführung und Aufräumen

- Dienste `konto-poc`, `konto-poc-db` und `konto-zaehlung` auf der
  Testumgebung, Railway-Adresse `konto-poc-staging.up.railway.app`.
- Geheimnisse wurden lokal in einer geschützten Datei erzeugt und nur über
  Dateien an Railway übergeben.
- Der API-Dienstnutzer schrieb seinen Zugangsschlüssel ins Startprotokoll; ich
  habe ihn in eine geschützte Datei übernommen. Beim Suchen sind Teile des
  Schlüssels einmal in der Sitzungsausgabe erschienen. Er gehörte nur zu dieser
  Wegwerf-Instanz und ist mit ihr gelöscht.
- **Für den Betrieb (E4.1):** keinen Schlüssel über das Protokoll ausgeben, den
  Dienstnutzer stattdessen per Maschinenschlüssel und Railway-Geheimwert
  einrichten.
- Alle drei Dienste sind gelöscht; die lokalen Geheimnisdateien sind entfernt.
  Die Probe lief rund eine Stunde, die Kosten liegen im Cent-Bereich.

## Quellen

- ZITADEL Release v4.20.5: https://github.com/zitadel/zitadel/releases/tag/v4.20.5
- Lizenz der Anmelde-App: https://github.com/zitadel/zitadel/blob/v4.20.5/apps/login/LICENSE
- scrypt-Format im Quelltext: https://github.com/zitadel/passwap/blob/main/scrypt/scrypt.go
- Hash-Import: https://zitadel.com/docs/concepts/architecture/secrets
