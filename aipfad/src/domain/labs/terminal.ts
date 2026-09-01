/**
 * Deterministischer Terminal-Simulator für das Terminal-Lab.
 *
 * Bewusst eine reine Funktion ohne Zustand außerhalb der übergebenen Werte:
 * Es gibt keine echte Shell, keinen `child_process`, keinen Zugriff auf ein
 * Dateisystem. Alles spielt sich in dem übergebenen Objekt ab, das die
 * Oberfläche als React-State hält (siehe docs/CONTENT-POLICY.md: Labs sind
 * deterministisch und rufen nichts Externes auf).
 *
 * Zuvor waren `mkdir`, `touch`, `cp`, `mv`, `which` und `clear` zwar als
 * verfügbar ausgewiesen, fielen aber in einen Zweig ohne jede Wirkung — der
 * Befehl erschien im Verlauf, veränderte aber nichts und sagte auch nichts.
 * Für eine Lernumgebung ist das die schlechteste Variante: Sie lehrt still
 * etwas Falsches. Grundsatz daher: Was angeboten wird, funktioniert auch
 * (Codex-Review auf PR #29).
 */

/**
 * Die Befehle, die dieser Simulator tatsächlich ausführt.
 *
 * `tests/unit/content-validation.test.ts` prüft, dass kein Lab einen Befehl
 * als verfügbar ausweist, der hier fehlt. Damit bleibt der Grundsatz
 * "was angeboten wird, funktioniert auch" auch bei künftigen Inhalten
 * erzwungen und nicht nur einmalig hergestellt.
 */
export const UMGESETZTE_BEFEHLE = [
  'pwd',
  'ls',
  'cd',
  'cat',
  'echo',
  'which',
  'clear',
  'mkdir',
  'touch',
  'cp',
  'mv',
  'rm',
] as const;

/** `null` steht für ein Verzeichnis, eine Zeichenkette für den Dateiinhalt. */
export type SimuliertesDateisystem = Record<string, string | null>;

export interface TerminalZustand {
  cwd: string;
  fileSystem: SimuliertesDateisystem;
}

export interface TerminalErgebnis extends TerminalZustand {
  output: string;
  /** Nur `clear` setzt das — die Oberfläche leert dann den sichtbaren Verlauf. */
  clearHistory: boolean;
}

/** Löst `.` und `..` auf und liefert immer einen absoluten Pfad. */
export function normalisierePfad(pfad: string): string {
  const teile: string[] = [];
  for (const teil of pfad.split('/')) {
    if (teil === '' || teil === '.') continue;
    if (teil === '..') {
      teile.pop();
      continue;
    }
    teile.push(teil);
  }
  return `/${teile.join('/')}`.replace(/\/$/, '') || '/';
}

function aufloesen(cwd: string, pfad: string): string {
  return normalisierePfad(pfad.startsWith('/') ? pfad : `${cwd}/${pfad}`);
}

function elternVerzeichnis(pfad: string): string {
  return normalisierePfad(`${pfad}/..`);
}

function existiert(fs: SimuliertesDateisystem, pfad: string): boolean {
  return Object.prototype.hasOwnProperty.call(fs, pfad);
}

function istVerzeichnis(fs: SimuliertesDateisystem, pfad: string): boolean {
  return existiert(fs, pfad) && fs[pfad] === null;
}

/** Direkte Einträge eines Verzeichnisses, ohne die tiefer liegenden. */
function eintraege(fs: SimuliertesDateisystem, verzeichnis: string): string[] {
  const prefix = verzeichnis === '/' ? '/' : `${verzeichnis}/`;
  return Object.keys(fs)
    .filter((p) => p !== verzeichnis && p.startsWith(prefix))
    .map((p) => p.slice(prefix.length))
    .filter((rest) => rest.length > 0 && !rest.includes('/'))
    .sort();
}

/** Alles unterhalb eines Pfades — für das Verschieben und Löschen von Verzeichnissen. */
function nachfahren(fs: SimuliertesDateisystem, pfad: string): string[] {
  const prefix = `${pfad}/`;
  return Object.keys(fs).filter((p) => p.startsWith(prefix));
}

export function fuehreBefehlAus(
  zustand: TerminalZustand,
  eingabe: string,
  allowedCommands: readonly string[],
): TerminalErgebnis {
  const { cwd } = zustand;
  const fileSystem = { ...zustand.fileSystem };
  const unveraendert = (output: string): TerminalErgebnis => ({
    cwd,
    fileSystem: zustand.fileSystem,
    output,
    clearHistory: false,
  });

  const teile = eingabe.trim().split(/\s+/);
  const name = teile[0] ?? '';
  const args = teile.slice(1);

  if (!allowedCommands.includes(name)) {
    return unveraendert(`Befehl nicht verfügbar in diesem Lab: ${name}`);
  }

  const brauchtArgument = (): TerminalErgebnis => unveraendert(`${name}: Argument fehlt.`);

  switch (name) {
    case 'pwd':
      return unveraendert(cwd);

    case 'ls': {
      const ziel = args[0] ? aufloesen(cwd, args[0]) : cwd;
      if (!istVerzeichnis(fileSystem, ziel)) {
        return unveraendert(`ls: Kein solches Verzeichnis: ${args[0] ?? ziel}`);
      }
      const gefunden = eintraege(fileSystem, ziel);
      return unveraendert(gefunden.length > 0 ? gefunden.join('  ') : '(leer)');
    }

    case 'cd': {
      const ziel = args[0] ? aufloesen(cwd, args[0]) : '/';
      if (!istVerzeichnis(fileSystem, ziel)) {
        return unveraendert(`cd: Kein solches Verzeichnis: ${args[0] ?? ''}`);
      }
      return { cwd: ziel, fileSystem: zustand.fileSystem, output: '', clearHistory: false };
    }

    case 'cat': {
      if (!args[0]) return brauchtArgument();
      const ziel = aufloesen(cwd, args[0]);
      const inhalt = fileSystem[ziel];
      if (inhalt === undefined) return unveraendert(`cat: Datei nicht gefunden: ${args[0]}`);
      if (inhalt === null) return unveraendert(`cat: ${args[0]} ist ein Verzeichnis.`);
      return unveraendert(inhalt);
    }

    case 'echo':
      return unveraendert(args.join(' '));

    case 'which':
      if (!args[0]) return brauchtArgument();
      return unveraendert(
        allowedCommands.includes(args[0])
          ? `/usr/bin/${args[0]}`
          : `which: ${args[0]}: nicht gefunden`,
      );

    case 'clear':
      return { cwd, fileSystem: zustand.fileSystem, output: '', clearHistory: true };

    case 'mkdir': {
      if (!args[0]) return brauchtArgument();
      const ziel = aufloesen(cwd, args[0]);
      if (existiert(fileSystem, ziel)) {
        return unveraendert(`mkdir: ${args[0]} gibt es bereits.`);
      }
      if (!istVerzeichnis(fileSystem, elternVerzeichnis(ziel))) {
        return unveraendert(`mkdir: Übergeordnetes Verzeichnis fehlt: ${args[0]}`);
      }
      fileSystem[ziel] = null;
      return { cwd, fileSystem, output: '', clearHistory: false };
    }

    case 'touch': {
      if (!args[0]) return brauchtArgument();
      const ziel = aufloesen(cwd, args[0]);
      if (istVerzeichnis(fileSystem, ziel)) {
        return unveraendert(`touch: ${args[0]} ist ein Verzeichnis.`);
      }
      if (!istVerzeichnis(fileSystem, elternVerzeichnis(ziel))) {
        return unveraendert(`touch: Übergeordnetes Verzeichnis fehlt: ${args[0]}`);
      }
      // Eine vorhandene Datei bleibt unverändert — wie beim echten `touch`,
      // das nur den Zeitstempel anfasst.
      if (!existiert(fileSystem, ziel)) fileSystem[ziel] = '';
      return { cwd, fileSystem, output: '', clearHistory: false };
    }

    case 'cp': {
      if (!args[0] || !args[1]) return unveraendert('cp: Quelle und Ziel angeben.');
      const quelle = aufloesen(cwd, args[0]);
      const inhalt = fileSystem[quelle];
      if (inhalt === undefined) return unveraendert(`cp: Datei nicht gefunden: ${args[0]}`);
      if (inhalt === null) {
        return unveraendert(`cp: ${args[0]} ist ein Verzeichnis — hier nur Dateien.`);
      }
      // Zeigt das Ziel auf ein Verzeichnis, landet die Kopie darin.
      const angegeben = aufloesen(cwd, args[1]);
      const ziel = istVerzeichnis(fileSystem, angegeben)
        ? normalisierePfad(`${angegeben}/${quelle.split('/').pop() ?? ''}`)
        : angegeben;
      if (!istVerzeichnis(fileSystem, elternVerzeichnis(ziel))) {
        return unveraendert(`cp: Übergeordnetes Verzeichnis fehlt: ${args[1]}`);
      }
      fileSystem[ziel] = inhalt;
      return { cwd, fileSystem, output: '', clearHistory: false };
    }

    case 'mv': {
      if (!args[0] || !args[1]) return unveraendert('mv: Quelle und Ziel angeben.');
      const quelle = aufloesen(cwd, args[0]);
      if (!existiert(fileSystem, quelle)) {
        return unveraendert(`mv: Nicht gefunden: ${args[0]}`);
      }
      // Ist das Ziel ein vorhandenes Verzeichnis, wandert die Quelle HINEIN —
      // auch dann, wenn die Quelle selbst ein Verzeichnis ist. Andernfalls
      // benannte `mv dokumente bilder` das eine Verzeichnis in das andere um
      // und überschrieb dabei dessen Inhalt (Codex-Review auf PR #29).
      const angegeben = aufloesen(cwd, args[1]);
      const ziel = istVerzeichnis(fileSystem, angegeben)
        ? normalisierePfad(`${angegeben}/${quelle.split('/').pop() ?? ''}`)
        : angegeben;
      if (ziel === quelle) return { cwd, fileSystem, output: '', clearHistory: false };
      if (ziel.startsWith(`${quelle}/`)) {
        return unveraendert(`mv: ${args[1]} liegt innerhalb von ${args[0]}.`);
      }
      if (!istVerzeichnis(fileSystem, elternVerzeichnis(ziel))) {
        return unveraendert(`mv: Übergeordnetes Verzeichnis fehlt: ${args[1]}`);
      }
      // Ein Verzeichnis nimmt seinen gesamten Inhalt mit.
      for (const pfad of [quelle, ...nachfahren(fileSystem, quelle)]) {
        const neu = ziel + pfad.slice(quelle.length);
        fileSystem[neu] = fileSystem[pfad] ?? null;
        delete fileSystem[pfad];
      }
      const neuesCwd = cwd === quelle || cwd.startsWith(`${quelle}/`) ? ziel : cwd;
      return { cwd: neuesCwd, fileSystem, output: '', clearHistory: false };
    }

    case 'rm': {
      if (!args[0]) return brauchtArgument();
      const ziel = aufloesen(cwd, args[0]);
      if (!existiert(fileSystem, ziel)) {
        return unveraendert(`rm: Nicht gefunden: ${args[0]}`);
      }
      if (istVerzeichnis(fileSystem, ziel) && nachfahren(fileSystem, ziel).length > 0) {
        return unveraendert(`rm: ${args[0]} ist nicht leer.`);
      }
      delete fileSystem[ziel];
      return {
        cwd,
        fileSystem,
        output: `${args[0]} gelöscht. (simuliert — dein echter Rechner bleibt unberührt)`,
        clearHistory: false,
      };
    }

    default:
      // Erreichbar nur, wenn ein Lab einen Befehl anbietet, den es hier nicht
      // gibt. Dann wird das offen gesagt, statt stillschweigend nichts zu tun.
      return unveraendert(`${name}: in diesem Simulator noch nicht umgesetzt.`);
  }
}
