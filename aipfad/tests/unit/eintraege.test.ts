import { describe, expect, it } from 'vitest';
import { eigenerEintrag } from '@/domain/eintraege';

/**
 * Diese Hilfe sichert alle Nachschlagevorgänge ab, die mit Kennungen aus
 * Inhalten oder Eingaben arbeiten — in den Git-Simulatoren, in der Bewertung
 * und in den Masken.
 *
 * Die Masken selbst haben in diesem Projekt keine Testumgebung (Node ohne
 * DOM, keine Testing-Library). Geprüft wird hier deshalb genau das Muster,
 * das sie erzeugen: ein durch Spread fortgeschriebener Zustand, befragt mit
 * einer Kennung aus dem Inhalt (Codex-Review auf PR #30).
 */
describe('eigenerEintrag', () => {
  const GEERBT = ['toString', 'constructor', 'hasOwnProperty', '__proto__', 'valueOf'];

  it('hält geerbte Namen für nicht vorhanden', () => {
    const leer: Record<string, string> = {};
    for (const name of GEERBT) {
      expect(eigenerEintrag(leer, name), name).toBeUndefined();
      // Zum Vergleich: der unmittelbare Zugriff liefert hier etwas.
      expect(leer[name], name).not.toBeUndefined();
    }
  });

  it('liefert einen selbst gesetzten Wert, auch unter einem geerbten Namen', () => {
    for (const name of GEERBT) {
      // Genau die Fortschreibung, die die Masken in `setState` benutzen.
      const zustand: Record<string, string> = { ...{}, [name]: 'ihre' };
      expect(eigenerEintrag(zustand, name), name).toBe('ihre');
    }
  });

  it('trägt eine Vollständigkeitsprüfung, die geerbte Namen nicht mitzählt', () => {
    // Das Muster aus ClassificationForm und ConflictResolutionForm:
    // `items.every((item) => eigenerEintrag(zuordnung, item.id))`.
    const elemente = [{ id: 'i1' }, { id: 'toString' }];
    let zuordnung: Record<string, string> = {};
    const vollstaendig = () => elemente.every((element) => eigenerEintrag(zuordnung, element.id));

    expect(vollstaendig()).toBe(false);

    zuordnung = { ...zuordnung, i1: 'k1' };
    // Vorher galt die Aufgabe hier bereits als vollständig, weil der
    // unmittelbare Zugriff für "toString" die geerbte Funktion lieferte.
    expect(vollstaendig()).toBe(false);

    zuordnung = { ...zuordnung, toString: 'k2' };
    expect(vollstaendig()).toBe(true);
  });

  it('gibt einen Text zurück, auf dem sich trim() aufrufen lässt', () => {
    // In der Konflikt-Maske stand `(texte[id] ?? '').trim()`. Für "toString"
    // war das eine Funktion, `??` griff nicht, und `.trim()` warf beim
    // Rendern — das ganze Lab war weg.
    const texte: Record<string, string> = {};
    for (const name of GEERBT) {
      expect(() => (eigenerEintrag(texte, name) ?? '').trim(), name).not.toThrow();
      expect((eigenerEintrag(texte, name) ?? '').trim(), name).toBe('');
    }
  });

  it('lässt gewöhnliche Namen unverändert durch', () => {
    const zustand = { main: 'c02', feature: 'c03' };

    expect(eigenerEintrag(zustand, 'main')).toBe('c02');
    expect(eigenerEintrag(zustand, 'feature')).toBe('c03');
    expect(eigenerEintrag(zustand, 'gibt-es-nicht')).toBeUndefined();
  });
});
