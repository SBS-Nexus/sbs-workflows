# E5 · Für Unternehmen – Plan

Stand 25.11.2026. Gehört zu `docs/PRODUKT-ROADMAP.md`, Abschnitt E5, und löst
L5 („Firmenfunktionen nur in PythonPfad, ohne Plätze, Berichte oder
Abrechnung“). Baut auf E4 auf: Alle drei Apps und der Hub melden seit
25.11.2026 über das gemeinsame Konto an (`docs/E4-5-BAUPLAN.md`).

**Fertig, wenn (Roadmap):** ein Unternehmen ein Team einlädt, einen Lernplan
vergibt und den Stand ohne Support sieht.

## 1. Ausgangslage

- **PythonPfad** hat einen sorgfältigen Organisationsbereich:
  - Organisation mit Rollen `OWNER`, `TEACHER`, `MEMBER`;
  - Kohorten;
  - Einladungen mit gehashtem Token, 14 Tagen Gültigkeit und optionaler
    Adressbindung;
  - Prüfprotokoll.
- **Datenschutz** (`pythonpfad/docs/DATENSCHUTZ.md`) ist gestuft:
  - Ohne Einwilligung nur Summen, und erst ab drei Personen.
  - Mit Einwilligung Name, Lektionen, gelöste Aufgaben, letzter Tag.
  - Nie Versuche, Zeiten oder Code.
- **SQLPfad** trägt eine Kopie der Modelle, **AIPfad** keine.
- **Je App getrennt:** Eine Firma müsste drei Organisationen pflegen, und es
  gibt keine Plätze, keine Übersicht über alle Pfade und keine Lernpläne.
- **Seit E4** gibt es eine Identität für alle Apps (`sub` aus
  konto.lernpfade.net). Der Hub ruft die Plattformquellen der Apps mit
  geprüftem Token ab.

## 2. Anforderungen

- **Organisationen für alle Pfade:**
  - Plätze;
  - Rollen Admin, Lehrkraft und Lernende;
  - Einladung per Link (optional an eine Adresse gebunden), später per
    Domain.
- **Teamübersicht:**
  - Fortschritt je Person und Pfad und fällige Wiederholungen, als CSV
    exportierbar.
  - Nur Aggregate; Einzelwerte nur mit Einwilligung.
  - Keine Lernzeit- oder Verhaltensüberwachung.
- **Lernpläne:** Pfade, Reihenfolge, Ziel und Fälligkeit je Team. Lernende
  sehen ihren Plan.
- **Privat und Firma zugleich:** Dasselbe Konto lernt privat weiter. Der
  Lernstand gehört der Person und bleibt in den Apps. Verlässt jemand die
  Organisation, bleibt der Stand bei der Person.
- **Zweiter Faktor:** Pflicht für Admin und Lehrkraft (Entscheidung vom
  20.11.2026). Geprüft wird über `amr` im ID-Token.
- **Ohne Support:** Eine Firma legt ihre Organisation selbst an, lädt ein und
  sieht den Stand.
- **Später:** Firmen-SSO (OIDC/SAML) und Abrechnung der Plätze (E7).

## 3. Optionen

| Option                                     | Für                                                                                           | Gegen                                                                                                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A · je App (Ausbau von PythonPfad)         | Code vorhanden                                                                                | drei Organisationen je Firma, keine Übersicht über Pfade, dreifache Pflege                                                                                                 |
| B · Organisationen in ZITADEL              | Rollen im Token, Firmen-SSO je Organisation eingebaut                                         | In ZITADEL gehört jede Person genau einer Organisation. Privat und Firma zugleich, mehrere Firmen oder ein Wechsel ginge nur über Umwege. Plätze und Pläne fehlen ohnehin. |
| **C · zentral auf der Plattform (Hub-DB)** | eine Organisation für alle Pfade, Plätze und Pläne an einer Stelle, privat und Firma zugleich | Der Hub bekommt eine Datenbank; die Apps brauchen eine Team-Quelle.                                                                                                        |

**Entscheidung: C.**

- **ZITADEL bleibt die Identität:** wer jemand ist, zweiter Faktor, später
  Firmen-SSO.
- **Die Plattform** weiß, wer in welcher Organisation was darf.
- **Die Apps** wissen, was jemand gelernt hat.

Für Firmen-SSO (E5.5) bekommt ein Kunde zusätzlich eine eigene
ZITADEL-Organisation mit seinem Anbieter; die Plattform ordnet sie zu.

## 4. Zielbild

```
Browser ── www.lernpfade.net (Hub) ── /organisation, /team, /lernplan
                 │
                 ├─ Hub-DB (Postgres): Organisation, Mitgliedschaft (sub),
                 │   Team, Einwilligung, Einladung, Lernplan, Prüfprotokoll
                 │
                 └─ Hub-Server ── POST /api/platform/team-source ──▶ App
                                  Authorization: Bearer <Diensttoken>
                                  { Mitglieder: [sub, benannt?] }
                                  ◀── Summen (ab 3) + Werte nur der benannten
```

- **Diensttoken:** Die Plattform ruft die Team-Quelle mit einem eigenen
  Maschinenkonto ab (ZITADEL, Client Credentials, JWT). Die Apps prüfen es
  wie das Hub-Token in E4.5a, nur mit eigener Client-ID
  (`AUTH_PLATTFORM_CLIENT_ID`). Ein Personentoken öffnet die Team-Quelle nie.
- **Die App rechnet selbst zusammen:** Für Personen ohne Einwilligung
  verlassen nur Summen die App, und auch die nur ab drei Personen.
  Einzelwerte gibt sie nur für Personen heraus, die die Plattform als
  „benannt“ meldet. Die Plattform meldet nur echte Teammitglieder.
- **Unbekannte Person:** Kennt eine App eine Person nicht (dort nie
  angemeldet), zählt sie als „nicht begonnen“, nicht als Fehler.

## 5. Datenmodell (Hub-DB)

- **Organisation:**
  - Name, Kürzel (`slug`), Plätze (Zahl), Status (`test`, `aktiv`,
    `gesperrt`);
  - angelegt von, angelegt am.
- **Mitgliedschaft:**
  - Organisation, `sub`, Rolle (`ADMIN`, `LEHRKRAFT`, `LERNEND`),
    beigetreten;
  - Anzeigename aus dem Konto, beim Beitritt und bei jeder Anmeldung
    aktualisiert.
- **Team:** Organisation, Name, Kürzel, archiviert. Eine Person kann in
  mehreren Teams sein.
- **Teammitgliedschaft:**
  - Team, Mitgliedschaft;
  - Einwilligung „Stand namentlich zeigen“ mit Zeitpunkt (Standard aus,
    jederzeit widerrufbar).
- **Einladung:**
  - Organisation, optional Team, Rolle;
  - Token-Hash (SHA-256), optional gebundene Adresse;
  - gültig bis (14 Tage), eingelöst von und am.
- **Lernplan:** Team, Name. Dazu Planeinträge mit Reihenfolge, Pfad
  (`python`, `sql`, `ai`), Ziel (Lektionen: Anzahl oder „alle“) und
  Fälligkeit.
- **Prüfprotokoll:**
  - wer, wann, was (`team.created`, `invitation.accepted`, `plan.assigned`
    usw.);
  - nie, was jemand gelernt hat.

Plätze zählen Mitgliedschaften mit Rolle `LERNEND`. Ist die Organisation voll,
lassen sich keine weiteren Lernenden einladen oder aufnehmen. Admin und
Lehrkraft kosten keinen Platz.

## 6. Rollen und Rechte

| Recht                                 | Admin | Lehrkraft | Lernend    |
| ------------------------------------- | ----- | --------- | ---------- |
| Organisation umbenennen, Plätze sehen | ✓     | –         | –          |
| Rollen ändern, Mitglieder entfernen   | ✓     | –         | –          |
| Teams anlegen, archivieren            | ✓     | ✓         | –          |
| Einladen (Lernende)                   | ✓     | ✓         | –          |
| Einladen (Lehrkraft, Admin)           | ✓     | –         | –          |
| Teamübersicht, CSV                    | ✓     | ✓         | –          |
| Lernplan vergeben                     | ✓     | ✓         | –          |
| Eigenen Plan und eigene Teams sehen   | ✓     | ✓         | ✓          |
| Einwilligung geben oder zurücknehmen  | –     | –         | ✓ (eigene) |
| Prüfprotokoll lesen                   | ✓     | –         | –          |

Admin und Lehrkraft brauchen für Verwaltungsseiten den zweiten Faktor.
Fehlt er, führt die Seite zur Einrichtung beim Konto und dann zur erneuten
Anmeldung. Jede Organisation hat immer mindestens einen Admin.

## 7. Datenschutz

- **Gestufte Sichtbarkeit aus PythonPfad, jetzt für alle Pfade:**
  - Summen erst ab drei Personen.
  - Ein Konzept erscheint bei „woran die Gruppe hängt“ nur, wenn mindestens
    die Hälfte es begonnen hat.
  - Einzelwerte nur mit Einwilligung: Name, Lektionen (erledigt von
    gesamt), fällige Wiederholungen und der Tag der letzten Aktivität.
- **Nie:** Versuche, Bearbeitungszeiten, Fehlermeldungen, Code, Antworten
  oder Uhrzeiten.
- **Einwilligung:**
  - je Team-Mitgliedschaft, standardmäßig aus, sofort widerrufbar;
  - wird mit Zeitpunkt festgehalten;
  - die Person sieht jederzeit, wer was sieht.
- **CSV:** enthält genau, was die Übersicht zeigt, nicht mehr.
- **Datenhaltung:**
  - Organisation löschen löscht die Plattformdaten, nie den Lernstand der
    Personen.
  - Austritt löscht die Mitgliedschaft und damit jede Sichtbarkeit.
- **Firmenkunden** brauchen eine AVV-Vorlage (E6, Rechtsseiten). Bis dahin
  kein Verkauf; die Testphase ist kostenlos.

## 8. Etappen

| Etappe                       | Inhalt                                                                                                                                                                                                       | Tor                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **E5.1 Organisationen**      | Hub-DB (Prisma, Migrationen im preDeploy), Organisation selbst anlegen (Testphase, 10 Plätze), Rollen, Einladung per Link, Plätze, Prüfprotokoll, `/organisation` im Hub, zweiter Faktor für Admin/Lehrkraft | Strecke gegen echten ZITADEL: anlegen, einladen, beitreten, Plätze voll, Protokoll; Integrationstests mit Postgres |
| **E5.2 Teams und Übersicht** | Teams, Einwilligung, Team-Quelle in den drei Apps (Vertrag mit Drift-Check), Diensttoken, Teamübersicht über alle Pfade, CSV                                                                                 | Lehrkraft sieht den Stand ohne Support; ohne Einwilligung nur Summen ab 3 (Tests mit 2, 3 und 4 Personen)          |
| **E5.3 Lernpläne**           | Plan je Team (Pfad, Reihenfolge, Ziel, Fälligkeit), „Dein Lernplan“ im Hub, Erfüllung in der Übersicht                                                                                                       | **Tor der Roadmap**: einladen, Plan vergeben, Stand sehen – als Rundgang und als Strecke                           |
| **E5.4 Beitritt per Domain** | Domain per DNS-TXT bestätigen; Beitritt nur mit bestätigter Adresse dieser Domain; Plätze gelten                                                                                                             | Strecke mit Testdomain; ohne bestätigte Adresse kein Beitritt                                                      |
| **E5.5 Firmen-SSO**          | Beim ersten Kunden, der es braucht: ZITADEL-Organisation mit seinem OIDC/SAML-Anbieter, Domain-Erkennung, Zuordnung zur Plattform-Organisation                                                               | Anmeldung über einen Test-Anbieter                                                                                 |
| **E5.6 Aufräumen**           | Organisationsbereich in PythonPfad/SQLPfad abschalten; vorhandene Organisationen übernehmen, falls es echte gibt                                                                                             | Zählung vor und nach; nichts ohne Freigabe löschen                                                                 |

## 9. Entscheidungen

Getroffen nach dem Maßstab „Board eines Enterprise-SaaS“:

1. **Organisationen zentral auf der Plattform** (Option C); ZITADEL bleibt
   Identität und später SSO.
2. **Der Hub bekommt eine Datenbank** (Postgres auf Railway, Region wie
   alles andere). Die Hub-Sitzung bleibt im verschlüsselten Cookie.
3. **Selbst anlegen mit Testphase:** Jede angemeldete Person mit zweitem
   Faktor kann eine Organisation anlegen und wird ihr Admin. Testphase:
   10 Plätze, bis E7 Preise und Abrechnung bringt.
4. **Teams statt „Kohorten“** in der Oberfläche; gemeint ist dasselbe.
5. **Die App rechnet die Summen,** nicht die Plattform. Einzelwerte ohne
   Einwilligung verlassen die App nie.
6. **Lernplan-Ziel = Lektionen** (Anzahl oder alle) je Pfad. Den Wert gibt
   jede Quelle schon heute geprüft heraus. Feinere Ziele (Module, Konzepte)
   kommen, wenn Kunden sie brauchen.

**Braucht deine Freigabe (Kosten):** Die Hub-Datenbank ist ein zusätzlicher
Railway-Dienst, gleich gebaut wie die App-Datenbanken.

- Gemessen am 25.11.2026 über 8,5 Tage: Jede App-Datenbank braucht im
  Mittel etwa 42 MB Arbeitsspeicher, kaum Rechenzeit und unter 0,3 GB
  Speicher.
- Zu Railway-Preisen (Arbeitsspeicher 10 USD je GB-Monat, Rechenzeit 20 USD
  je vCPU-Monat, Laufwerk 0,15 USD je GB-Monat) sind das **etwa 0,50 USD im
  Monat**.
- Sicherungen kommen mit Railway Pro (E6) dazu.

Bauen und testen geht ohne sie; in CI und lokal läuft Postgres im Container.

## 10. Risiken

- **Rückschluss aus Summen:** Ab drei Personen und nur über echte
  Teammitglieder; Teamwechsel stehen im Prüfprotokoll. Differenzangriffe
  (Summe mit und ohne eine Person) schließt die Untergrenze nicht ganz aus.
  Deshalb gibt es keine Summen über frei gewählte Personengruppen, nur über
  Teams.
- **Eine Datenbank mehr:** Sicherungen erst mit Railway Pro (ab 17.12.2026,
  E6). Bis dahin bleibt die Organisation in der Testphase.
- **Doppelte Organisationsbereiche:** Bis E5.6 gibt es die
  PythonPfad-Organisationen weiter. Neue Firmen landen nur noch auf der
  Plattform.

## 11. Stand

**25.11.2026, E5.1 gebaut** (Zweig `claude/e5-1-organisationen-20261125`):

- **Hub-Datenbank:** Prisma 7.10.1 mit eigener Migration (Organisation,
  Mitgliedschaft, Einladung, Prüfprotokoll). Prüfungen in der Datenbank:
  Plätze ≥ 0 und Nutzungen ≤ Höchstzahl.
- **Sitzung:** Der Hub kennt Adresse, Bestätigungsstand und zweiten Faktor
  (Scope `email`, `amr`). Mit `?bestaetigen=1` meldet sich die Person frisch
  an.
- **Regeln und Dienst:**
  - Rechte, Plätze und Einlösen (Reihenfolge Einladung → Person → Plätze);
  - immer mindestens ein Admin;
  - Sperre auf der Organisation bei Beitritt und Rollenwechsel.
- **Seiten:** `/organisation`, `/organisation/[kuerzel]`,
  `/einladung/[token]`; in der Kopfzeile der Link „Organisation“.
- **Tests:**
  - 7 Einheiten und 9 Integrationstests gegen Postgres; dabei treten 8
    Personen gleichzeitig bei 2 freien Plätzen bei, und genau 2 kommen
    hinein.
  - Strecke gegen echten ZITADEL: anlegen mit zweitem Faktor, einladen,
    beitreten, aufgebrauchter Link, Protokoll, ohne zweiten Faktor keine
    Verwaltung.
- **Live seit 25.11.2026:**
  - Freigabe der Hub-Datenbank am 25.11.2026; `lernpfade-db` auf Railway
    (Postgres 18, nur privat).
  - #110 gemergt als `6f68851`.
  - Der Hub läuft mit `npm run db:deploy` vor dem Start.

**26.11.2026, E5.2a gebaut** (Zweig `claude/e5-2a-teams-20261125`):

- **Teams:** Admin und Lehrkraft legen Teams an, nehmen Mitglieder der
  Organisation auf, nehmen sie heraus und archivieren Teams.
- **Einladung direkt in ein Team:** Archiviert führt sie nur noch in die
  Organisation.
- **Einwilligung je Team-Mitgliedschaft:**
  - Standardmäßig aus; nur die Person selbst ändert sie, mit Zeitpunkt.
  - Sie steht nicht im Prüfprotokoll.
  - Lernende sehen unter „Deine Teams“, was namentlich sichtbar wäre.
- **Tests:**
  - Integration: Organisationsgrenzen, Archiv, Einladung ins Team,
    Einwilligung nur durch die Person, Austritt verlässt alle Teams.
  - Strecke: Team anlegen, ins Team einladen, Einwilligung geben, Admin
    sieht „namentlich sichtbar“.
- **Als Nächstes (E5.2b):**
  - Team-Quelle in den Apps mit Diensttoken;
  - Stand des Teams über alle Pfade;
  - CSV.
