/**
 * Nachschlagen in Datensätzen, die mit Namen aus der Eingabe befragt werden.
 *
 * Ein gewöhnliches Objekt antwortet auch auf Namen, die niemand hineingelegt
 * hat: `branches['toString']` liefert die geerbte Funktion von
 * `Object.prototype`, und eine Prüfung auf `!== undefined` hält den Branch
 * daraufhin für vorhanden. Im Branch-Lab hieß das: `git switch toString`
 * gelang, und der nächste Commit trug diese Funktion als Elternteil — der
 * Graph war still kaputt (Codex-Review auf PR #30).
 *
 * Verboten werden diese Namen deshalb NICHT. Echtes Git legt `toString`,
 * `constructor`, `hasOwnProperty` und `__proto__` anstandslos als Branch an;
 * sie zu sperren hieße, im Lab etwas anderes beizubringen als draußen gilt.
 * Falsch ist allein, dass ein NICHT angelegter Name eine Antwort bekommt.
 *
 * Geschrieben werden darf weiter unmittelbar: Ein berechneter Schlüssel
 * (`{ ...branches, [name]: ziel }`) legt auch für `__proto__` eine eigene
 * Eigenschaft an und verstellt nicht den Prototyp — anders als die
 * Schreibweise `__proto__:` im Objektliteral. Nur das Lesen braucht die
 * Absicherung.
 *
 * Der Terminal-Simulator hält diese Regel mit `existiert()` längst ein; die
 * Git-Simulatoren zogen hier nach.
 */

/**
 * Liest einen Eintrag ausschließlich aus den EIGENEN Feldern eines
 * Datensatzes. Alles Geerbte gilt als nicht vorhanden.
 */
export function eigenerEintrag<T>(datensatz: Record<string, T>, name: string): T | undefined {
  return Object.hasOwn(datensatz, name) ? datensatz[name] : undefined;
}
