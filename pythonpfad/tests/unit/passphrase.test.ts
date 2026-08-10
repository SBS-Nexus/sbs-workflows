import { describe, expect, it } from 'vitest';
import { erzeugePassphrase } from '@/server/auth/passphrase';
import { checkPasswordStrength } from '@/server/auth/password';

/**
 * Erzeugte Passwörter müssen die Regeln der Anwendung erfüllen.
 *
 * Ein Skript, das ein Passwort setzt, welches das Anmeldeformular später
 * ablehnen würde, ist schlimmer als keins: Das Konto existiert, lässt sich
 * anlegen, und erst beim Ändern des Passworts fällt der Widerspruch auf.
 */
describe('Erzeugte Wortfolge', () => {
  it('erfüllt die Passwortregeln der Anwendung', () => {
    for (let i = 0; i < 200; i += 1) {
      const passwort = erzeugePassphrase();
      const pruefung = checkPasswordStrength(passwort, 'jemand@beispiel.de');
      expect(pruefung.problems, `fehlgeschlagen bei "${passwort}"`).toEqual([]);
    }
  });

  it('bleibt unter der Höchstlänge', () => {
    expect(erzeugePassphrase(20).length).toBeLessThanOrEqual(200);
  });

  it('liefert bei jedem Aufruf etwas anderes', () => {
    // Kein Zufallstest im eigentlichen Sinn: Bei rund 42 Bit ist eine
    // Wiederholung unter hundert Ziehungen so unwahrscheinlich, dass ein
    // Treffer auf einen festen Startwert hindeutet – etwa weil jemand
    // `randomInt` durch `Math.random` mit fester Saat ersetzt hat.
    const gezogen = new Set(Array.from({ length: 100 }, () => erzeugePassphrase()));
    expect(gezogen.size).toBe(100);
  });

  it('enthält die verlangte Anzahl Wörter', () => {
    // Sechs Wörter plus die angehängte Zahl.
    expect(erzeugePassphrase(6).split('-')).toHaveLength(7);
    expect(erzeugePassphrase(4).split('-')).toHaveLength(5);
  });

  it('benutzt nur gut tippbare Zeichen', () => {
    // Umlaute und ß sind auf einer fremden Tastaturbelegung eine Geduldsprobe.
    for (let i = 0; i < 50; i += 1) {
      expect(erzeugePassphrase()).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
