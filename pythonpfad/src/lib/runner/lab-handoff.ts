/**
 * Übergabe von Code an das Code-Labor.
 *
 * Der Weg führt bewusst über den sessionStorage und nicht über die Adresszeile:
 * Ein ganzes Programm als Parameter in der URL wäre unhandlich, landete in der
 * Verlaufsliste und in jedem Protokoll, und ab einer gewissen Länge schneiden
 * Server und Browser ihn ab. Der sessionStorage endet mit dem Tab, was für
 * eine Übergabe von einer Seite zur nächsten genau richtig ist.
 */
export const LAB_HANDOFF_KEY = 'pythonpfad-labor-uebernahme';

/**
 * Liest den übergebenen Code, ohne ihn zu verbrauchen.
 *
 * Lesen und Löschen sind bewusst getrennt. Der Wert wird beim Aufbau der
 * Laborseite als Anfangszustand gebraucht, und ein Anfangszustand muss sich
 * ohne Nebenwirkung berechnen lassen: React darf einen begonnenen Render
 * verwerfen und neu beginnen. Würde beim Lesen gelöscht, käme der zweite
 * Durchlauf mit leeren Händen zurück, und statt des Beispiels stünde die
 * Standardvorlage da – unvorhersehbar und schwer zu finden.
 *
 * Auf dem Server gibt es keinen sessionStorage. Der Zugriff wird abgefangen
 * und liefert dort schlicht nichts.
 */
export function readLabHandoff(): string | null {
  try {
    return window.sessionStorage.getItem(LAB_HANDOFF_KEY);
  } catch {
    return null;
  }
}

/**
 * Entfernt den übergebenen Code.
 *
 * Gehört in einen Effekt, also hinter den Render. Ohne das Löschen stünde beim
 * nächsten Besuch des Labors wieder das alte Beispiel da und überschriebe,
 * woran gerade gearbeitet wird.
 */
export function clearLabHandoff(): void {
  try {
    window.sessionStorage.removeItem(LAB_HANDOFF_KEY);
  } catch {
    // Ein gesperrter Speicher ist hier folgenlos.
  }
}
