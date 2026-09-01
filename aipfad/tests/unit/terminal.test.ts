import { describe, expect, it } from 'vitest';
import { fuehreBefehlAus, normalisierePfad, type TerminalZustand } from '@/domain/labs/terminal';

/**
 * Regressionstests für den Codex-Fund "Implement or stop advertising no-op
 * terminal commands" (PR #29): `mkdir`, `touch`, `cp`, `mv`, `which` und
 * `clear` waren als verfügbar ausgewiesen, fielen aber in einen Zweig ohne
 * jede Wirkung. Der Befehl erschien im Verlauf, veränderte nichts und sagte
 * auch nichts.
 *
 * Der Simulator ist eine reine Funktion: keine Shell, kein Prozessaufruf,
 * kein Dateisystemzugriff. Alles spielt sich im übergebenen Zustand ab.
 */

const ERLAUBT = [
  'pwd',
  'ls',
  'cd',
  'mkdir',
  'touch',
  'cat',
  'cp',
  'mv',
  'rm',
  'which',
  'echo',
  'clear',
];

function start(): TerminalZustand {
  return {
    cwd: '/home/lernperson',
    fileSystem: {
      '/home/lernperson': null,
      '/home/lernperson/dokumente': null,
      '/home/lernperson/dokumente/notizen.txt': 'Erste Notiz.',
      '/home/lernperson/bilder': null,
    },
  };
}

/** Führt mehrere Befehle nacheinander aus und liefert Endzustand und Ausgaben. */
function laufe(befehle: string[], zustand: TerminalZustand = start()) {
  const ausgaben: string[] = [];
  let aktuell = zustand;
  for (const befehl of befehle) {
    const ergebnis = fuehreBefehlAus(aktuell, befehl, ERLAUBT);
    ausgaben.push(ergebnis.output);
    aktuell = { cwd: ergebnis.cwd, fileSystem: ergebnis.fileSystem };
  }
  return { ...aktuell, ausgaben, letzte: ausgaben[ausgaben.length - 1] ?? '' };
}

describe('Pfadauflösung', () => {
  it('löst . und .. auf', () => {
    expect(normalisierePfad('/a/b/../c')).toBe('/a/c');
    expect(normalisierePfad('/a/./b')).toBe('/a/b');
    expect(normalisierePfad('/a/b/../..')).toBe('/');
  });
});

describe('mkdir', () => {
  it('legt ein Verzeichnis an, in das man wechseln kann', () => {
    const { cwd, letzte } = laufe(['mkdir test', 'cd test', 'pwd']);
    expect(letzte).toBe('/home/lernperson/test');
    expect(cwd).toBe('/home/lernperson/test');
  });

  it('meldet ein bereits vorhandenes Verzeichnis', () => {
    const { letzte } = laufe(['mkdir dokumente']);
    expect(letzte).toContain('gibt es bereits');
  });

  it('legt nichts an, wenn das übergeordnete Verzeichnis fehlt', () => {
    const { fileSystem, letzte } = laufe(['mkdir fehlt/hier']);
    expect(letzte).toContain('Übergeordnetes Verzeichnis fehlt');
    expect(fileSystem['/home/lernperson/fehlt/hier']).toBeUndefined();
  });
});

describe('touch', () => {
  it('legt eine Datei an, die anschliessend in ls auftaucht', () => {
    const { letzte } = laufe(['touch datei.txt', 'ls']);
    expect(letzte.split('  ')).toContain('datei.txt');
  });

  it('überschreibt eine vorhandene Datei nicht', () => {
    const { fileSystem } = laufe(['cd dokumente', 'touch notizen.txt']);
    expect(fileSystem['/home/lernperson/dokumente/notizen.txt']).toBe('Erste Notiz.');
  });
});

describe('cp', () => {
  it('kopiert eine Datei mitsamt Inhalt', () => {
    const { fileSystem } = laufe(['cp dokumente/notizen.txt kopie.txt']);
    expect(fileSystem['/home/lernperson/kopie.txt']).toBe('Erste Notiz.');
    // Die Quelle bleibt bestehen.
    expect(fileSystem['/home/lernperson/dokumente/notizen.txt']).toBe('Erste Notiz.');
  });

  it('legt die Kopie in ein angegebenes Verzeichnis', () => {
    const { fileSystem } = laufe(['cp dokumente/notizen.txt bilder']);
    expect(fileSystem['/home/lernperson/bilder/notizen.txt']).toBe('Erste Notiz.');
  });

  it('meldet eine fehlende Quelle', () => {
    const { letzte } = laufe(['cp gibtsnicht.txt kopie.txt']);
    expect(letzte).toContain('Datei nicht gefunden');
  });
});

describe('mv', () => {
  it('verschiebt eine Datei', () => {
    const { fileSystem } = laufe(['mv dokumente/notizen.txt bilder/notizen.txt']);
    expect(fileSystem['/home/lernperson/bilder/notizen.txt']).toBe('Erste Notiz.');
    expect(fileSystem['/home/lernperson/dokumente/notizen.txt']).toBeUndefined();
  });

  it('nimmt beim Verschieben eines Verzeichnisses den Inhalt mit', () => {
    const { fileSystem } = laufe(['mkdir archiv', 'mv dokumente archiv/dokumente']);
    expect(fileSystem['/home/lernperson/archiv/dokumente']).toBeNull();
    expect(fileSystem['/home/lernperson/archiv/dokumente/notizen.txt']).toBe('Erste Notiz.');
    expect(fileSystem['/home/lernperson/dokumente']).toBeUndefined();
  });

  it('verschiebt ein Verzeichnis nicht in sich selbst', () => {
    const { letzte } = laufe(['mv dokumente dokumente/tiefer']);
    expect(letzte).toContain('innerhalb');
  });
});

describe('rm', () => {
  it('entfernt eine Datei wirklich aus dem Zustand', () => {
    const { fileSystem, ausgaben } = laufe(['rm dokumente/notizen.txt', 'ls dokumente']);
    expect(fileSystem['/home/lernperson/dokumente/notizen.txt']).toBeUndefined();
    expect(ausgaben[0]).toContain('simuliert');
    expect(ausgaben[1]).toBe('(leer)');
  });

  it('löscht ein nicht leeres Verzeichnis nicht', () => {
    const { fileSystem, letzte } = laufe(['rm dokumente']);
    expect(letzte).toContain('nicht leer');
    expect(fileSystem['/home/lernperson/dokumente']).toBeNull();
  });
});

describe('which', () => {
  it('nennt einen plausiblen Pfad für einen verfügbaren Befehl', () => {
    expect(laufe(['which ls']).letzte).toBe('/usr/bin/ls');
  });

  it('meldet einen nicht verfügbaren Befehl', () => {
    expect(laufe(['which curl']).letzte).toContain('nicht gefunden');
  });
});

describe('clear', () => {
  it('fordert das Leeren des Verlaufs an, ohne den Zustand zu zerstören', () => {
    const zustand = { cwd: '/home/lernperson/dokumente', fileSystem: start().fileSystem };
    const ergebnis = fuehreBefehlAus(zustand, 'clear', ERLAUBT);
    expect(ergebnis.clearHistory).toBe(true);
    expect(ergebnis.cwd).toBe('/home/lernperson/dokumente');
    expect(ergebnis.fileSystem).toEqual(zustand.fileSystem);
  });
});

describe('Nicht verfügbare Befehle', () => {
  it('werden klar abgelehnt statt still zu verpuffen', () => {
    expect(laufe(['sudo rm -rf /']).letzte).toContain('Befehl nicht verfügbar');
  });

  it('führt keinen beworbenen Befehl wirkungslos aus', () => {
    // Kern des Funds: Jeder als verfügbar ausgewiesene Befehl muss entweder
    // etwas verändern oder etwas sagen — niemals beides nicht.
    for (const befehl of ['mkdir neu', 'touch neu.txt', 'which ls', 'clear']) {
      const vorher = start();
      const ergebnis = fuehreBefehlAus(vorher, befehl, ERLAUBT);
      const veraendert =
        JSON.stringify(ergebnis.fileSystem) !== JSON.stringify(vorher.fileSystem) ||
        ergebnis.cwd !== vorher.cwd ||
        ergebnis.clearHistory;
      expect(veraendert || ergebnis.output.length > 0).toBe(true);
    }
  });
});

describe('mv in ein vorhandenes Verzeichnis', () => {
  it('verschiebt ein Verzeichnis HINEIN statt es zu überschreiben', () => {
    // Vorher benannte `mv dokumente bilder` das Verzeichnis um und
    // überschrieb dabei `bilder` samt Inhalt (Codex-Review auf PR #29).
    const { fileSystem } = laufe(['mv dokumente bilder']);

    expect(fileSystem['/home/lernperson/bilder']).toBeNull();
    expect(fileSystem['/home/lernperson/bilder/dokumente']).toBeNull();
    expect(fileSystem['/home/lernperson/bilder/dokumente/notizen.txt']).toBe('Erste Notiz.');
    expect(fileSystem['/home/lernperson/dokumente']).toBeUndefined();
  });

  it('behält ein bereits vorhandenes Zielverzeichnis mitsamt Inhalt', () => {
    const { fileSystem } = laufe(['touch bilder/foto.png', 'mkdir kiste', 'mv bilder kiste']);
    expect(fileSystem['/home/lernperson/kiste/bilder/foto.png']).toBe('');
    expect(fileSystem['/home/lernperson/kiste']).toBeNull();
  });
});

describe('mv auf ein belegtes Ziel', () => {
  it('überschreibt ein nicht leeres Zielverzeichnis nicht', () => {
    // Ohne diese Prüfung verschmolz die Quelle in das vorhandene Verzeichnis
    // und überschrieb dessen Dateien (Codex-Review auf PR #29).
    const { fileSystem, letzte } = laufe([
      'mkdir bilder/dokumente',
      'touch bilder/dokumente/wichtig.txt',
      'mv dokumente bilder',
    ]);

    expect(letzte).toContain('nicht leer');
    expect(fileSystem['/home/lernperson/bilder/dokumente/wichtig.txt']).toBe('');
    // Die Quelle bleibt unangetastet.
    expect(fileSystem['/home/lernperson/dokumente/notizen.txt']).toBe('Erste Notiz.');
  });

  it('verschiebt auf ein leeres Zielverzeichnis', () => {
    const { fileSystem, letzte } = laufe(['mkdir bilder/dokumente', 'mv dokumente bilder']);

    expect(letzte).toBe('');
    expect(fileSystem['/home/lernperson/bilder/dokumente/notizen.txt']).toBe('Erste Notiz.');
    expect(fileSystem['/home/lernperson/dokumente']).toBeUndefined();
  });

  it('schiebt eine Datei nicht über ein Verzeichnis', () => {
    const { fileSystem, letzte } = laufe([
      'touch notiz.txt',
      'mkdir bilder/notiz.txt',
      'mv notiz.txt bilder',
    ]);

    expect(letzte).toContain('ist ein Verzeichnis');
    expect(fileSystem['/home/lernperson/notiz.txt']).toBe('');
  });
});
