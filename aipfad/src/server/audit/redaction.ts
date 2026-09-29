/**
 * Die feste Schwärzungsregel für Auditmetadaten (E07/ENT-B06).
 *
 * Ohne `server-only` und ohne Prisma, damit sie auf der Unit-Ebene ohne
 * Datenbank prüfbar bleibt.
 *
 * Warum eine EIGENE Regel und nicht die des Loggers: Der Logger schwärzt nur
 * die oberste Ebene seiner Felder (`observability/logger.ts`). Das genügt
 * dort, weil Logfelder flach übergeben werden. Metadaten sind JSON und
 * dürfen verschachtelt sein; eine flache Prüfung ließe `{ user: { email } }`
 * unverändert durch. Die Regel hier steigt deshalb rekursiv ab.
 *
 * Sie ist die zweite Verteidigungslinie, nicht die erste. Die erste ist der
 * Vertrag aus docs/SECURITY.md: Metadaten tragen knappe betriebliche
 * Tatsachen, keine Anfrageinhalte. `metadata: { ...requestBody }` bleibt
 * falsch, auch wenn diese Funktion darin etwas schwärzt.
 */

/**
 * Feldnamen, deren Wert nie in einer Auditzeile landen darf.
 *
 * Vierzehn Namen. Verglichen wird ohne Rücksicht auf Groß-/Kleinschreibung.
 * Die Liste deckt die Felder des Loggers ab (einschließlich der deutschen
 * Schreibweise `passwort`) und ergänzt, was erst im Auditzusammenhang
 * auftauchen kann: `authorization`, `cookie`, `secret`, `apiKey`.
 *
 * WICHTIG — verglichen wird der GANZE Feldname, nicht ein Namensbestandteil.
 * `userEmail`, `accessToken`, `emailAddress`, `user_email` und `api_key`
 * werden NICHT geschwärzt. Das ist Absicht: Eine Teilstringsuche träfe auch
 * harmlose Namen und gäbe eine Sicherheit vor, die sie nicht hat — `name`
 * etwa steckt in `hostname`, `filename` und `courseName`. Wer einen
 * Ereigniserzeuger schreibt, kann sich deshalb NICHT darauf verlassen, dass
 * diese Regel eine ungünstig benannte Kopie abfängt. Sie ist die zweite
 * Verteidigungslinie; die erste ist der Vertrag, dass Metadaten knappe
 * betriebliche Tatsachen tragen.
 */
const VERBOTENE_FELDER = new Set([
  'email',
  'name',
  'password',
  'passwort',
  'passwordhash',
  'token',
  'tokenhash',
  'csrfsecret',
  'authorization',
  'cookie',
  'secret',
  'apikey',
  'submittedanswer',
  'solutionnotes',
]);

/**
 * Die Markierung anstelle des Werts. Absichtlich dieselbe Zeichenkette wie
 * im Logger: Wer sie in einer Zeile sieht, soll sie überall wiedererkennen.
 */
export const SCHWAERZUNG = '[entfernt]';

/**
 * Wie tief die Regel absteigt.
 *
 * Eine Grenze ist nötig, weil JSON verschachtelt beliebig tief sein kann und
 * ein zyklischer Wert die Rekursion sonst nicht enden ließe. Wird sie
 * erreicht, ersetzt die Markierung den ganzen Teilbaum — im Zweifel lieber
 * zu viel geschwärzt als ein ungeprüfter Rest.
 */
const HOECHSTE_TIEFE = 8;

export type AuditMetadataWert =
  | string
  | number
  | boolean
  | null
  | AuditMetadataWert[]
  | {
      [schluessel: string]: AuditMetadataWert;
    };

export type AuditMetadata = Record<string, AuditMetadataWert>;

function istVerboten(schluessel: string): boolean {
  return VERBOTENE_FELDER.has(schluessel.toLowerCase());
}

function schwaerzeWert(wert: unknown, tiefe: number): AuditMetadataWert {
  if (tiefe >= HOECHSTE_TIEFE) return SCHWAERZUNG;

  if (wert === null) return null;
  if (typeof wert === 'string' || typeof wert === 'number' || typeof wert === 'boolean') {
    return wert;
  }
  if (Array.isArray(wert)) {
    return wert.map((eintrag) => schwaerzeWert(eintrag, tiefe + 1));
  }
  if (typeof wert === 'object') {
    return schwaerzeObjekt(wert as Record<string, unknown>, tiefe + 1);
  }

  // `undefined`, Funktionen, Symbole, BigInt: nichts davon ist gültiges JSON.
  // Sie verschwinden, statt die Zeile unschreibbar zu machen.
  return SCHWAERZUNG;
}

function schwaerzeObjekt(eingabe: Record<string, unknown>, tiefe: number): AuditMetadata {
  const ausgabe: AuditMetadata = {};
  for (const [schluessel, wert] of Object.entries(eingabe)) {
    // Der verbotene Schlüssel wird NICHT entfernt, sondern sein Wert ersetzt.
    // Dass das Feld da war, ist selbst eine betriebliche Tatsache; sein
    // Inhalt ist es nicht.
    ausgabe[schluessel] = istVerboten(schluessel) ? SCHWAERZUNG : schwaerzeWert(wert, tiefe);
  }
  return ausgabe;
}

/**
 * Schwärzt verbotene Felder rekursiv, auch in Objekten innerhalb von Arrays.
 *
 * Der ursprüngliche Wert wird weder zurückgegeben noch protokolliert noch in
 * eine Fehlermeldung aufgenommen — sonst verlagerte die Regel das Problem
 * nur von der Auditzeile in den Logstrom.
 */
export function redactMetadata(metadata: Record<string, unknown>): AuditMetadata {
  return schwaerzeObjekt(metadata, 0);
}
