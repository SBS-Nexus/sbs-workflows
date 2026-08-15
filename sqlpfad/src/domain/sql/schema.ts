/**
 * Beschreibung eines Übungsdatensatzes.
 *
 * Der Schema-Explorer zeigt diese Angaben an, und der Runner spielt daraus die
 * Sandbox ein. Beides aus derselben Quelle: Stünden Anzeige und DDL getrennt,
 * liefen sie beim ersten Umbenennen einer Spalte auseinander – und die
 * Lernende würde in einer Tabelle suchen, die es so nicht mehr gibt.
 *
 * Die Spaltenbeschreibungen sind kein Beiwerk. „Wer die Daten nicht kennt, rät
 * beim Abfragen" ist der zweite Schritt des Lernablaufs; ohne einen Satz je
 * Spalte bliebe der Explorer eine Liste von Namen.
 */

export interface SpaltenBeschreibung {
  name: string;
  /** Datentyp, wie er in der Datenbank steht – etwa `nvarchar(80)`. */
  typ: string;
  nullErlaubt: boolean;
  primaerschluessel?: boolean;
  /** Verweis auf `Tabelle.Spalte`, falls es ein Fremdschlüssel ist. */
  verweistAuf?: string;
  /** Ein Satz, der sagt, was in der Spalte steht – nicht, wie sie heißt. */
  bedeutung: string;
}

export interface TabellenBeschreibung {
  name: string;
  /** Wofür die Tabelle da ist, in einem Satz. */
  zweck: string;
  spalten: readonly SpaltenBeschreibung[];
  /** Ungefähre Zeilenzahl im Ausgangszustand. */
  zeilen: number;
}

export interface UebungsDatensatz {
  slug: string;
  titel: string;
  /** Der fachliche Zusammenhang, aus dem die Daten stammen. */
  bereich: string;
  beschreibung: string;
  version: string;
  tabellen: readonly TabellenBeschreibung[];
  /**
   * T-SQL, das Struktur und Beispieldaten anlegt.
   *
   * Wird beim Bereitstellen und bei jedem Zurücksetzen einer Sandbox
   * ausgeführt – siehe `SqlMotor.setzeSandboxZurueck`.
   */
  skript: string;
}

/** Alle Fremdschlüssel eines Datensatzes, für die Beziehungsanzeige. */
export function beziehungen(
  datensatz: UebungsDatensatz,
): Array<{ von: string; nach: string; ueber: string }> {
  const gefunden: Array<{ von: string; nach: string; ueber: string }> = [];

  for (const tabelle of datensatz.tabellen) {
    for (const spalte of tabelle.spalten) {
      if (!spalte.verweistAuf) continue;
      const ziel = spalte.verweistAuf.split('.')[0];
      if (ziel) gefunden.push({ von: tabelle.name, nach: ziel, ueber: spalte.name });
    }
  }

  return gefunden;
}
