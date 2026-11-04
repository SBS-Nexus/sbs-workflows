/**
 * Statement-Policy: welche Art von Anweisung eine Aufgabe zulässt.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ WICHTIG: Das hier ist NICHT die Sicherheitsgrenze.                    │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Die eigentliche Grenze sind Datenbankberechtigungen: Jeder Ausführungskontext
 * bekommt einen Anmeldenamen mit minimalen Rechten, der ausschließlich auf
 * seine eigene Sandbox zugreifen kann. Wer `DROP DATABASE` schickt, scheitert
 * dort – nicht hier.
 *
 * Diese Prüfung hat zwei andere Aufgaben:
 *
 *  1. **Didaktik.** In einer Lektion über `SELECT` soll ein `UPDATE` nicht
 *     einfach durchlaufen, sondern eine Erklärung auslösen: „Diese Aufgabe
 *     übt das Lesen von Daten." Das ist eine Lernhilfe, keine Abwehr.
 *  2. **Tiefenstaffelung.** Sollte eine Berechtigung falsch gesetzt sein, ist
 *     eine zweite Hürde besser als keine.
 *
 * Wer diese Datei je für die Absicherung hält, baut ein System, dessen
 * Sicherheit an einer Zeichenkettenanalyse hängt. SQL lässt sich beliebig
 * verschleiern – über Kommentare, Zeilenumbrüche, dynamisches SQL,
 * Unicode-Varianten. Eine Textprüfung gewinnt dieses Rennen nie.
 */

/** Grobe Klassen, in die eine Anweisung fällt. */
export type AnweisungsKlasse =
  | 'SELECT'
  | 'DML' // INSERT, UPDATE, DELETE, MERGE
  | 'DDL' // CREATE, ALTER, DROP, TRUNCATE
  | 'TRANSAKTION' // BEGIN/COMMIT/ROLLBACK TRANSACTION
  | 'PROGRAMMIERUNG' // DECLARE, SET, IF, WHILE, EXEC einer eigenen Prozedur
  | 'SERVER' // alles, was über die Sandbox hinausreicht
  | 'UNBEKANNT';

export interface PolicyErgebnis {
  erlaubt: boolean;
  klasse: AnweisungsKlasse;
  /** Für die Lernende gedachte Begründung. Leer, wenn erlaubt. */
  begruendung: string;
}

/**
 * Serverweite Befehle.
 *
 * Diese Liste ist Tiefenstaffelung, keine Abwehr – siehe Kopf der Datei. Sie
 * fängt die Fälle ab, die eine Lernende versehentlich aus einer Anleitung
 * kopiert, nicht die eines Angreifers.
 */
const SERVER_MUSTER: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bxp_cmdshell\b/i, 'Betriebssystembefehle'],
  [/\bsp_configure\b/i, 'Serverkonfiguration'],
  [/\bsp_addlinkedserver\b/i, 'Verbindungsserver'],
  [/\bsp_OA\w+/i, 'OLE-Automatisierung'],
  [/\bOPENROWSET\b/i, 'Zugriff auf externe Datenquellen'],
  [/\bOPENDATASOURCE\b/i, 'Zugriff auf externe Datenquellen'],
  [/\bOPENQUERY\b/i, 'Zugriff auf externe Datenquellen'],
  [/\bBULK\s+INSERT\b/i, 'Massenimport aus Dateien'],
  [/\bRESTORE\b/i, 'Sicherung und Wiederherstellung'],
  [/\bBACKUP\b/i, 'Sicherung und Wiederherstellung'],
  [/\bSHUTDOWN\b/i, 'Herunterfahren des Servers'],
  [/\bCREATE\s+(LOGIN|SERVER\s+ROLE|ENDPOINT|CREDENTIAL)\b/i, 'Serveranmeldungen'],
  [/\bALTER\s+(SERVER|LOGIN|AVAILABILITY|RESOURCE)\b/i, 'Servereinstellungen'],
  [/\bDROP\s+(LOGIN|SERVER\s+ROLE|DATABASE)\b/i, 'Löschen serverweiter Objekte'],
  [/\bCREATE\s+DATABASE\b/i, 'Anlegen von Datenbanken'],
  [/\bUSE\s+/i, 'Wechsel der Datenbank'],
  [/\bEXECUTE\s+AS\b/i, 'Wechsel des Sicherheitskontexts'],
  [/\bRECONFIGURE\b/i, 'Serverkonfiguration'],
  [/\bWAITFOR\b/i, 'gezieltes Warten, das den Übungsserver blockiert'],
];

/**
 * Entfernt Kommentare und Zeichenfolgenliterale.
 *
 * Ohne diesen Schritt löst das Wort `DELETE` in einem Kommentar oder in
 * `WHERE Bemerkung = 'bitte delete'` die Prüfung aus – und die Lernende
 * bekommt eine Ablehnung für eine völlig harmlose Abfrage.
 *
 * Umgekehrt gilt weiterhin: Wer *verstecken* will, schafft das hier. Genau
 * deshalb ist diese Datei nicht die Sicherheitsgrenze.
 */
export function entferneKommentareUndLiterale(sql: string): string {
  let ergebnis = '';
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const zwei = sql.slice(i, i + 2);

    if (zwei === '--') {
      while (i < n && sql[i] !== '\n') i += 1;
      continue;
    }
    if (zwei === '/*') {
      // Blockkommentare dürfen in T-SQL geschachtelt sein.
      let tiefe = 1;
      i += 2;
      while (i < n && tiefe > 0) {
        if (sql.slice(i, i + 2) === '/*') {
          tiefe += 1;
          i += 2;
        } else if (sql.slice(i, i + 2) === '*/') {
          tiefe -= 1;
          i += 2;
        } else i += 1;
      }
      // Für SQL Server trennt ein Kommentar wie Leerraum. Ohne das Leerzeichen
      // würde aus `SELECT 1/**/DELETE` hier `SELECT 1DELETE` – ein Wort, das
      // keine Wortsuche mehr als DELETE erkennt, das der Server aber ausführt.
      ergebnis += ' ';
      continue;
    }
    if (sql[i] === "'") {
      i += 1;
      while (i < n) {
        if (sql[i] === "'") {
          // Zwei Apostrophe hintereinander sind ein Apostroph im Text.
          if (sql[i + 1] === "'") i += 2;
          else {
            i += 1;
            break;
          }
        } else i += 1;
      }
      ergebnis += " '' ";
      continue;
    }
    if (sql[i] === '[') {
      // Eckige Klammern begrenzen Bezeichner, keine Texte – Inhalt behalten.
      const ende = sql.indexOf(']', i);
      if (ende === -1) break;
      ergebnis += sql.slice(i, ende + 1);
      i = ende + 1;
      continue;
    }

    ergebnis += sql[i];
    i += 1;
  }

  return ergebnis;
}

/**
 * Zerlegt eine Eingabe an den Semikola in einzelne Anweisungen.
 *
 * Ein einfaches `sql.split(';')` reicht dafür nicht: Ein Semikolon in
 * `WHERE Bemerkung = 'a;b'` oder in einem Kommentar gehört nicht zur Struktur.
 * Deshalb läuft hier derselbe Abtaster wie oben – nur behält er den
 * Originaltext, damit die Lernende ihre Anweisung unverändert wiedersieht.
 *
 * Leere Teile (etwa durch ein abschließendes Semikolon) fallen weg.
 */
export function teileAnweisungen(sql: string): string[] {
  const teile: string[] = [];
  let start = 0;
  let i = 0;
  const n = sql.length;

  const uebernimm = (bis: number): void => {
    const teil = sql.slice(start, bis).trim();
    if (teil === '') return;
    // Ein Stück, das nur aus Kommentar besteht, ist keine Anweisung. Ohne
    // diese Prüfung zählte „-- noch nichts" als eine auszuführende Anweisung.
    if (entferneKommentareUndLiterale(teil).trim() === '') return;
    teile.push(teil);
  };

  while (i < n) {
    const zwei = sql.slice(i, i + 2);

    if (zwei === '--') {
      while (i < n && sql[i] !== '\n') i += 1;
      continue;
    }
    if (zwei === '/*') {
      let tiefe = 1;
      i += 2;
      while (i < n && tiefe > 0) {
        if (sql.slice(i, i + 2) === '/*') {
          tiefe += 1;
          i += 2;
        } else if (sql.slice(i, i + 2) === '*/') {
          tiefe -= 1;
          i += 2;
        } else i += 1;
      }
      continue;
    }
    if (sql[i] === "'") {
      i += 1;
      while (i < n) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") i += 2;
          else {
            i += 1;
            break;
          }
        } else i += 1;
      }
      continue;
    }
    if (sql[i] === '[') {
      const ende = sql.indexOf(']', i);
      if (ende === -1) break;
      i = ende + 1;
      continue;
    }
    if (sql[i] === ';') {
      uebernimm(i);
      i += 1;
      start = i;
      continue;
    }

    i += 1;
  }

  uebernimm(n);
  return teile;
}

/** Bestimmt die Klasse der ersten bedeutungstragenden Anweisung. */
export function bestimmeKlasse(sql: string): AnweisungsKlasse {
  const sauber = entferneKommentareUndLiterale(sql).trim();

  for (const [muster] of SERVER_MUSTER) {
    if (muster.test(sauber)) return 'SERVER';
  }

  // Ein führendes WITH gehört zu einem CTE; entscheidend ist, was danach kommt.
  const ohneCte = sauber.replace(
    /^\s*;?\s*WITH\b[\s\S]*?\)\s*(?=SELECT|INSERT|UPDATE|DELETE)/i,
    '',
  );
  const erstes = /\b([A-Z_]+)\b/i.exec(ohneCte)?.[1]?.toUpperCase() ?? '';

  if (erstes === 'SELECT') return 'SELECT';
  if (['INSERT', 'UPDATE', 'DELETE', 'MERGE'].includes(erstes)) return 'DML';
  if (['CREATE', 'ALTER', 'DROP', 'TRUNCATE'].includes(erstes)) return 'DDL';
  if (['BEGIN', 'COMMIT', 'ROLLBACK', 'SAVE'].includes(erstes)) return 'TRANSAKTION';
  if (['DECLARE', 'SET', 'IF', 'WHILE', 'EXEC', 'EXECUTE', 'PRINT'].includes(erstes)) {
    return 'PROGRAMMIERUNG';
  }
  return 'UNBEKANNT';
}

/**
 * Wörter, mit denen innerhalb eines SELECT eine weitere Anweisung beginnt.
 *
 * T-SQL braucht zwischen zwei Anweisungen kein Semikolon: `SELECT 1 DELETE
 * FROM Kunden` sind für SQL Server zwei Anweisungen, und beide laufen. Die
 * Zerlegung an den Semikola sieht davon nur eine, und deren erstes Wort ist
 * SELECT. Deshalb wird ein SELECT zusätzlich nach diesen Wörtern abgesucht.
 *
 * Aufgenommen sind nur **reservierte** Schlüsselwörter. Ein reserviertes Wort
 * kann ohne Klammern oder Anführungszeichen kein Tabellen-, Spalten- oder
 * Aliasname sein – kommt es in einem gültigen SELECT vor, dann nur in seiner
 * Bedeutung als Schlüsselwort, und keines davon gehört zum SELECT selbst.
 * Damit trifft die Suche keine legitime Abfrage. Einzige Ausnahme ist FETCH
 * im Seitenumbruch `OFFSET … ROWS FETCH NEXT … ROWS ONLY`; siehe unten.
 *
 * Nicht reservierte Anweisungsanfänge (etwa THROW, das ohnehin ein Semikolon
 * davor verlangt) fehlen bewusst: Sie wären gültige Spaltennamen, und die
 * Suche würde harmlose Abfragen ablehnen. Hier gilt wie überall in dieser
 * Datei: Das ist Tiefenstaffelung, nicht die Grenze.
 *
 * Die Klasse bestimmt, ob die versteckte Anweisung in der Aufgabe erlaubt
 * wäre. `SELECT … DELETE …` ist dort, wo DML geübt wird, dasselbe wie
 * `SELECT …; DELETE …` – und das ist dort ausdrücklich zulässig.
 */
const ANWEISUNGSANFAENGE: ReadonlyMap<string, AnweisungsKlasse> = new Map([
  ['INSERT', 'DML'],
  ['UPDATE', 'DML'],
  ['DELETE', 'DML'],
  ['MERGE', 'DML'],
  ['WRITETEXT', 'DML'],
  ['UPDATETEXT', 'DML'],
  // `SELECT … INTO Neu FROM …` ist keine zweite Anweisung, legt aber eine
  // Tabelle an. In einer Leseaufgabe hat das denselben Effekt wie CREATE.
  ['INTO', 'DDL'],
  ['CREATE', 'DDL'],
  ['ALTER', 'DDL'],
  ['DROP', 'DDL'],
  ['TRUNCATE', 'DDL'],
  ['BEGIN', 'TRANSAKTION'],
  ['COMMIT', 'TRANSAKTION'],
  ['ROLLBACK', 'TRANSAKTION'],
  ['SAVE', 'TRANSAKTION'],
  ['DECLARE', 'PROGRAMMIERUNG'],
  ['SET', 'PROGRAMMIERUNG'],
  ['IF', 'PROGRAMMIERUNG'],
  ['WHILE', 'PROGRAMMIERUNG'],
  ['BREAK', 'PROGRAMMIERUNG'],
  ['CONTINUE', 'PROGRAMMIERUNG'],
  ['GOTO', 'PROGRAMMIERUNG'],
  ['RETURN', 'PROGRAMMIERUNG'],
  ['EXEC', 'PROGRAMMIERUNG'],
  ['EXECUTE', 'PROGRAMMIERUNG'],
  ['PRINT', 'PROGRAMMIERUNG'],
  ['RAISERROR', 'PROGRAMMIERUNG'],
  ['OPEN', 'PROGRAMMIERUNG'],
  ['CLOSE', 'PROGRAMMIERUNG'],
  ['FETCH', 'PROGRAMMIERUNG'],
  ['DEALLOCATE', 'PROGRAMMIERUNG'],
  ['READTEXT', 'PROGRAMMIERUNG'],
  // Rechte und Serverwerkzeuge sind in keiner Aufgabe vorgesehen.
  ['GRANT', 'SERVER'],
  ['DENY', 'SERVER'],
  ['REVOKE', 'SERVER'],
  ['SETUSER', 'SERVER'],
  ['DBCC', 'SERVER'],
  ['KILL', 'SERVER'],
  ['CHECKPOINT', 'SERVER'],
]);

/**
 * Zerlegt SQL in Wörter, wie SQL Server sie liest.
 *
 * Absichtlich ein eigener Abtaster über den Originaltext statt einer Suche im
 * bereinigten Text: Kommentare trennen Wörter (`1/* *\/DELETE`), Zahlen enden
 * vor einem Buchstaben (`SELECT 1DELETE` liest der Server als `1` und
 * `DELETE`), und Bezeichner in `[…]` oder `"…"`, Variablen (`@x`) und
 * temporäre Tabellen (`#t`) sind Namen, keine Schlüsselwörter – `[Update]`
 * darf eine Spalte heißen.
 */
function woerter(sql: string): string[] {
  const liste: string[] = [];
  const n = sql.length;
  let i = 0;

  const ueberspringeBis = (ende: string): void => {
    // Ein verdoppelter Begrenzer (`''`, `]]`, `""`) steht für das Zeichen selbst.
    i += 1;
    while (i < n) {
      if (sql[i] === ende) {
        if (sql[i + 1] === ende) i += 2;
        else {
          i += 1;
          return;
        }
      } else i += 1;
    }
  };

  while (i < n) {
    const zeichen = sql[i] as string;
    const zwei = sql.slice(i, i + 2);

    if (zwei === '--') {
      while (i < n && sql[i] !== '\n') i += 1;
    } else if (zwei === '/*') {
      let tiefe = 1;
      i += 2;
      while (i < n && tiefe > 0) {
        if (sql.slice(i, i + 2) === '/*') {
          tiefe += 1;
          i += 2;
        } else if (sql.slice(i, i + 2) === '*/') {
          tiefe -= 1;
          i += 2;
        } else i += 1;
      }
    } else if (zeichen === "'") {
      ueberspringeBis("'");
    } else if (zeichen === '[') {
      ueberspringeBis(']');
    } else if (zeichen === '"') {
      ueberspringeBis('"');
    } else if (/[0-9]/.test(zeichen) || (zeichen === '.' && /[0-9]/.test(sql[i + 1] ?? ''))) {
      // Zahl: 0x1F, 12, 1.5, 1e5, 1.5E-3 – danach beginnt ein neues Wort.
      const zahl = /^(?:0x[0-9A-Fa-f]*|[0-9]*\.?[0-9]*(?:[eE][+-]?[0-9]+)?)/.exec(sql.slice(i));
      i += Math.max(1, zahl?.[0].length ?? 1);
    } else if (/[\p{L}_@#]/u.test(zeichen)) {
      const wort = /^[\p{L}_@#][\p{L}\p{N}_@#$]*/u.exec(sql.slice(i))?.[0] ?? zeichen;
      // Variablen und temporäre Objekte sind Namen, nie Schlüsselwörter.
      if (!/^[@#]/.test(wort)) liste.push(wort.toUpperCase());
      i += wort.length;
    } else {
      i += 1;
    }
  }

  return liste;
}

/** Eine Anweisung, die innerhalb eines SELECT ohne Semikolon beginnt. */
export interface VersteckteAnweisung {
  wort: string;
  klasse: AnweisungsKlasse;
}

/**
 * Sucht in einer Anweisung, deren erstes Wort SELECT ist, nach einem Wort,
 * das eine andere Anweisung beginnt (siehe `ANWEISUNGSANFAENGE`).
 */
export function findeVersteckteAnweisung(sql: string): VersteckteAnweisung | undefined {
  const liste = woerter(sql);
  for (let k = 0; k < liste.length; k += 1) {
    const wort = liste[k] as string;
    const klasse = ANWEISUNGSANFAENGE.get(wort);
    if (!klasse) continue;
    // `OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY` gehört zum SELECT. Ein FETCH,
    // das einen Cursor liest, steht dagegen nie direkt hinter ROW oder ROWS.
    if (wort === 'FETCH' && ['ROW', 'ROWS'].includes(liste[k - 1] ?? '')) continue;
    return { wort, klasse };
  }
  return undefined;
}

/**
 * Prüft eine Eingabe gegen die für die Aufgabe erlaubten Klassen.
 *
 * Die Begründung ist an die Lernende gerichtet und erklärt, was die Aufgabe
 * übt – sie soll nicht wie eine Zurechtweisung klingen. Wer in einer
 * SELECT-Lektion ein UPDATE schreibt, hat meist die Aufgabe missverstanden und
 * nichts Böses vor.
 */
export function pruefeAnweisung(
  sql: string,
  erlaubteKlassen: readonly AnweisungsKlasse[],
): PolicyErgebnis {
  const sauber = entferneKommentareUndLiterale(sql);

  for (const [muster, was] of SERVER_MUSTER) {
    if (muster.test(sauber)) {
      return {
        erlaubt: false,
        klasse: 'SERVER',
        begruendung:
          `Diese Anweisung betrifft ${was} und wirkt über die Übungsdatenbank hinaus. ` +
          'In der Übungsumgebung ist das nicht vorgesehen.',
      };
    }
  }

  const klasse = bestimmeKlasse(sql);

  if (klasse === 'UNBEKANNT') {
    return {
      erlaubt: false,
      klasse,
      begruendung:
        'Diese Eingabe lässt sich keiner bekannten SQL-Anweisung zuordnen. ' +
        'Prüfe, ob am Anfang ein Schlüsselwort wie SELECT steht.',
    };
  }

  if (!erlaubteKlassen.includes(klasse)) {
    return { erlaubt: false, klasse, begruendung: begruendeAblehnung(klasse, erlaubteKlassen) };
  }

  // Ein SELECT kann ohne Semikolon eine weitere Anweisung mitbringen, die der
  // Server ebenfalls ausführt. Sie muss in der Aufgabe genauso erlaubt sein,
  // als stünde sie für sich.
  if (klasse === 'SELECT') {
    const versteckt = findeVersteckteAnweisung(sql);
    if (versteckt && !erlaubteKlassen.includes(versteckt.klasse)) {
      const hinweis =
        versteckt.wort === 'INTO'
          ? 'Mit SELECT … INTO legt SQL Server eine neue Tabelle an. '
          : `Mit ${versteckt.wort} beginnt hier eine weitere Anweisung – SQL Server braucht ` +
            'dafür kein Semikolon und würde sie mit ausführen. ';
      return {
        erlaubt: false,
        klasse: versteckt.klasse,
        begruendung: hinweis + begruendeAblehnung(versteckt.klasse, erlaubteKlassen),
      };
    }
  }

  return { erlaubt: true, klasse, begruendung: '' };
}

function begruendeAblehnung(
  klasse: AnweisungsKlasse,
  erlaubt: readonly AnweisungsKlasse[],
): string {
  const nurLesen = erlaubt.length === 1 && erlaubt[0] === 'SELECT';

  switch (klasse) {
    case 'DML':
      return nurLesen
        ? 'Diese Aufgabe übt das Lesen von Daten. Eine Anweisung, die Daten verändert, ' +
            'kommt in einer späteren Lektion – hier genügt ein SELECT.'
        : 'Datenverändernde Anweisungen sind in dieser Aufgabe nicht vorgesehen.';
    case 'DDL':
      return (
        'Diese Aufgabe arbeitet mit vorhandenen Tabellen. Tabellen anzulegen oder zu ' +
        'ändern gehört zu einem eigenen Modul.'
      );
    case 'TRANSAKTION':
      return 'Transaktionen sind ein eigenes Thema und in dieser Aufgabe noch nicht nötig.';
    case 'PROGRAMMIERUNG':
      return (
        'Variablen und Ablaufsteuerung gehören zum T-SQL-Modul. Diese Aufgabe lässt ' +
        'sich mit einer einzigen Abfrage lösen.'
      );
    default:
      return 'Diese Art von Anweisung ist in dieser Aufgabe nicht vorgesehen.';
  }
}
