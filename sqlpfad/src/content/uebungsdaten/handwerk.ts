import type { UebungsDatensatz } from '@/domain/sql/schema';

/**
 * Übungsdatensatz „Handwerksbetrieb".
 *
 * Warum ausgerechnet ein Handwerksbetrieb und nicht der übliche
 * Online-Shop: Ein Betrieb mit Kundinnen, Aufträgen, Positionen und
 * Mitarbeitenden hat genau die Beziehungen, um die es in den ersten drei
 * Modulen geht – eins zu vielen, viele zu vielen über eine Zwischentabelle,
 * ein Fremdschlüssel, der NULL sein darf. Und er ist jemandem vertraut, der
 * abends nach der Arbeit vor dem Rechner sitzt und noch nie eine Datenbank
 * gesehen hat.
 *
 * Drei Eigenschaften der Daten sind absichtlich so gewählt:
 *
 *  - **Es gibt NULL.** Ein Auftrag ohne Abschlussdatum ist offen, eine Kundin
 *    ohne Telefonnummer hat keine hinterlassen. Beides ist ein echter
 *    fehlender Wert und kein Platzhalter – Lektion 1 hängt daran.
 *  - **Es gibt eine Kundin ohne Auftrag.** Ohne sie sähe ein LEFT JOIN
 *    genauso aus wie ein INNER JOIN, und die halbe JOIN-Lektion ginge ins
 *    Leere.
 *  - **Es gibt doppelte Nachnamen und gleiche Beträge.** Wer versehentlich
 *    DISTINCT setzt oder falsch gruppiert, merkt es an den Daten.
 */
export const HANDWERK: UebungsDatensatz = {
  slug: 'handwerk',
  titel: 'Handwerksbetrieb',
  bereich: 'Ein Betrieb mit vier Mitarbeitenden, seinen Kundinnen und Kunden und deren Aufträgen',
  beschreibung:
    'Vier Tabellen, die zusammenhängen wie in einem echten Betrieb: Wer hat wann welchen ' +
    'Auftrag bekommen, was steht darauf, und wer hat ihn ausgeführt.',
  version: '1.0.0',

  tabellen: [
    {
      name: 'Kunden',
      zweck: 'Wer beim Betrieb etwas beauftragt – Privatleute wie Firmen.',
      zeilen: 8,
      spalten: [
        {
          name: 'KundeId',
          typ: 'int',
          nullErlaubt: false,
          primaerschluessel: true,
          bedeutung:
            'Eindeutige Nummer. Sie steht in anderen Tabellen, wenn dort ein Kunde gemeint ist.',
        },
        {
          name: 'Name',
          typ: 'nvarchar(80)',
          nullErlaubt: false,
          bedeutung: 'Vor- und Nachname oder Firmenname.',
        },
        {
          name: 'Stadt',
          typ: 'nvarchar(60)',
          nullErlaubt: true,
          bedeutung: 'Ort. Leer, wenn er nie erfasst wurde.',
        },
        {
          name: 'Telefon',
          typ: 'nvarchar(30)',
          nullErlaubt: true,
          bedeutung: 'Rufnummer. NULL heißt: keine hinterlassen – nicht: unbekannt gleich leer.',
        },
        {
          name: 'KundeSeit',
          typ: 'date',
          nullErlaubt: false,
          bedeutung: 'Tag des ersten Kontakts.',
        },
      ],
    },
    {
      name: 'Mitarbeitende',
      zweck: 'Wer im Betrieb arbeitet und Aufträge ausführt.',
      zeilen: 4,
      spalten: [
        {
          name: 'MitarbeiterId',
          typ: 'int',
          nullErlaubt: false,
          primaerschluessel: true,
          bedeutung: 'Eindeutige Nummer.',
        },
        { name: 'Name', typ: 'nvarchar(80)', nullErlaubt: false, bedeutung: 'Vor- und Nachname.' },
        {
          name: 'Gewerk',
          typ: 'nvarchar(40)',
          nullErlaubt: false,
          bedeutung: 'Fachbereich, etwa Elektro oder Sanitär.',
        },
        {
          name: 'Stundensatz',
          typ: 'decimal(6,2)',
          nullErlaubt: false,
          bedeutung: 'Verrechnungssatz je Stunde in Euro.',
        },
      ],
    },
    {
      name: 'Auftraege',
      zweck: 'Was ein Kunde beauftragt hat und wer es ausführt.',
      zeilen: 12,
      spalten: [
        {
          name: 'AuftragId',
          typ: 'int',
          nullErlaubt: false,
          primaerschluessel: true,
          bedeutung: 'Eindeutige Nummer.',
        },
        {
          name: 'KundeId',
          typ: 'int',
          nullErlaubt: false,
          verweistAuf: 'Kunden.KundeId',
          bedeutung: 'Für wen der Auftrag ist. Verweist auf Kunden.',
        },
        {
          name: 'MitarbeiterId',
          typ: 'int',
          nullErlaubt: true,
          verweistAuf: 'Mitarbeitende.MitarbeiterId',
          bedeutung: 'Wer ihn ausführt. NULL heißt: noch niemand zugeteilt.',
        },
        {
          name: 'Bezeichnung',
          typ: 'nvarchar(120)',
          nullErlaubt: false,
          bedeutung: 'Worum es geht, in einem Satz.',
        },
        {
          name: 'Eingegangen',
          typ: 'date',
          nullErlaubt: false,
          bedeutung: 'Tag der Beauftragung.',
        },
        {
          name: 'Abgeschlossen',
          typ: 'date',
          nullErlaubt: true,
          bedeutung: 'Tag der Fertigstellung. NULL heißt: läuft noch.',
        },
      ],
    },
    {
      name: 'Positionen',
      zweck: 'Die einzelnen Zeilen eines Auftrags – Material und Arbeitszeit.',
      zeilen: 26,
      spalten: [
        {
          name: 'PositionId',
          typ: 'int',
          nullErlaubt: false,
          primaerschluessel: true,
          bedeutung: 'Eindeutige Nummer.',
        },
        {
          name: 'AuftragId',
          typ: 'int',
          nullErlaubt: false,
          verweistAuf: 'Auftraege.AuftragId',
          bedeutung: 'Zu welchem Auftrag die Zeile gehört.',
        },
        {
          name: 'Bezeichnung',
          typ: 'nvarchar(120)',
          nullErlaubt: false,
          bedeutung: 'Was berechnet wird.',
        },
        {
          name: 'Menge',
          typ: 'decimal(8,2)',
          nullErlaubt: false,
          bedeutung: 'Anzahl oder Stunden.',
        },
        {
          name: 'Einzelpreis',
          typ: 'decimal(8,2)',
          nullErlaubt: false,
          bedeutung: 'Preis je Einheit in Euro.',
        },
      ],
    },
  ],

  skript: `
CREATE TABLE Kunden (
  KundeId   int          NOT NULL CONSTRAINT PK_Kunden PRIMARY KEY,
  Name      nvarchar(80) NOT NULL,
  Stadt     nvarchar(60) NULL,
  Telefon   nvarchar(30) NULL,
  KundeSeit date         NOT NULL
);

CREATE TABLE Mitarbeitende (
  MitarbeiterId int           NOT NULL CONSTRAINT PK_Mitarbeitende PRIMARY KEY,
  Name          nvarchar(80)  NOT NULL,
  Gewerk        nvarchar(40)  NOT NULL,
  Stundensatz   decimal(6,2)  NOT NULL
);

CREATE TABLE Auftraege (
  AuftragId     int           NOT NULL CONSTRAINT PK_Auftraege PRIMARY KEY,
  KundeId       int           NOT NULL CONSTRAINT FK_Auftraege_Kunden REFERENCES Kunden(KundeId),
  MitarbeiterId int           NULL     CONSTRAINT FK_Auftraege_Mitarbeitende REFERENCES Mitarbeitende(MitarbeiterId),
  Bezeichnung   nvarchar(120) NOT NULL,
  Eingegangen   date          NOT NULL,
  Abgeschlossen date          NULL
);

CREATE TABLE Positionen (
  PositionId  int           NOT NULL CONSTRAINT PK_Positionen PRIMARY KEY,
  AuftragId   int           NOT NULL CONSTRAINT FK_Positionen_Auftraege REFERENCES Auftraege(AuftragId),
  Bezeichnung nvarchar(120) NOT NULL,
  Menge       decimal(8,2)  NOT NULL,
  Einzelpreis decimal(8,2)  NOT NULL
);

INSERT INTO Kunden (KundeId, Name, Stadt, Telefon, KundeSeit) VALUES
  (1, N'Anna Brandt',        N'Mannheim',   N'0621 445566', '2023-04-12'),
  (2, N'Mehmet Kaya',        N'Weinheim',   NULL,           '2024-01-08'),
  (3, N'Sofia Adler',        N'Mannheim',   N'0621 998877', '2024-06-21'),
  (4, N'Bäckerei Lindner',   N'Heidelberg', N'06221 33221', '2022-11-02'),
  (5, N'Jonas Brandt',       N'Mannheim',   NULL,           '2025-02-14'),
  (6, N'Praxis Dr. Weiß',    N'Ludwigshafen', N'0621 112233', '2023-09-30'),
  (7, N'Elif Yilmaz',        NULL,          N'0621 776655', '2025-07-05'),
  (8, N'Hausverwaltung Süd', N'Speyer',     N'06232 44556', '2021-03-17');

INSERT INTO Mitarbeitende (MitarbeiterId, Name, Gewerk, Stundensatz) VALUES
  (1, N'Katrin Storz',  N'Elektro',  68.00),
  (2, N'Tobias Renner', N'Sanitär',  64.50),
  (3, N'Miriam Hoff',   N'Elektro',  68.00),
  (4, N'Paul Denk',     N'Heizung',  71.00);

INSERT INTO Auftraege (AuftragId, KundeId, MitarbeiterId, Bezeichnung, Eingegangen, Abgeschlossen) VALUES
  (1,  1, 1,    N'Steckdosen im Wohnzimmer erneuern',  '2026-01-08', '2026-01-15'),
  (2,  1, 2,    N'Tropfenden Wasserhahn abdichten',    '2026-02-02', '2026-02-03'),
  (3,  2, 3,    N'Sicherungskasten prüfen',            '2026-01-20', '2026-01-28'),
  (4,  3, NULL, N'Heizung macht Geräusche',            '2026-03-02', NULL),
  (5,  4, 4,    N'Jahreswartung Heizungsanlage',       '2026-01-05', '2026-01-06'),
  (6,  4, 1,    N'Beleuchtung Verkaufsraum erweitern', '2026-02-18', '2026-03-04'),
  (7,  5, 2,    N'Neues Waschbecken einbauen',         '2026-02-25', NULL),
  (8,  6, 3,    N'Notbeleuchtung nachrüsten',          '2026-01-12', '2026-02-01'),
  (9,  6, 4,    N'Thermostate tauschen',               '2026-03-01', NULL),
  (10, 8, 1,    N'Treppenhauslicht auf Bewegungsmelder', '2025-11-14', '2025-11-29'),
  (11, 8, 2,    N'Rohrbruch im Keller',                '2026-01-02', '2026-01-02'),
  (12, 8, NULL, N'Angebot für Elektroprüfung',         '2026-03-10', NULL);

INSERT INTO Positionen (PositionId, AuftragId, Bezeichnung, Menge, Einzelpreis) VALUES
  (1,  1,  N'Arbeitszeit',            4.00,  68.00),
  (2,  1,  N'Steckdose Unterputz',    6.00,   8.90),
  (3,  1,  N'Kleinmaterial',          1.00,  14.50),
  (4,  2,  N'Arbeitszeit',            1.50,  64.50),
  (5,  2,  N'Dichtungssatz',          1.00,   6.20),
  (6,  3,  N'Arbeitszeit',            3.00,  68.00),
  (7,  3,  N'Sicherungsautomat',      4.00,  12.40),
  (8,  5,  N'Arbeitszeit',            2.50,  71.00),
  (9,  5,  N'Wartungssatz',           1.00,  48.00),
  (10, 6,  N'Arbeitszeit',           11.00,  68.00),
  (11, 6,  N'LED-Panel',              8.00,  42.00),
  (12, 6,  N'Kabel NYM 3x1,5',       60.00,   1.35),
  (13, 8,  N'Arbeitszeit',            7.50,  68.00),
  (14, 8,  N'Notleuchte',             5.00,  89.00),
  (15, 10, N'Arbeitszeit',            5.00,  68.00),
  (16, 10, N'Bewegungsmelder',        3.00,  34.90),
  (17, 10, N'Kleinmaterial',          1.00,  14.50),
  (18, 11, N'Arbeitszeit',            6.00,  64.50),
  (19, 11, N'Rohrstück Kupfer',       2.00,  18.70),
  (20, 11, N'Kleinmaterial',          1.00,  14.50),
  (21, 4,  N'Anfahrt',                1.00,  35.00),
  (22, 7,  N'Waschbecken',            1.00, 219.00),
  (23, 7,  N'Arbeitszeit',            3.00,  64.50),
  (24, 9,  N'Thermostat',             6.00,  27.90),
  (25, 9,  N'Arbeitszeit',            2.00,  71.00),
  (26, 2,  N'Anfahrt',                1.00,  35.00);
`,
};
