/**
 * Setup-Center-Befehle (macOS). Bewusst als eigene, kleine statische Liste
 * und NICHT durch die Lektionsinhalts-Pipeline (parseContent) geprüft – das
 * ist für Lernstoff mit Konzeptverweisen und Hinweisleiter gedacht, hier
 * geht es um reine Werkzeug-Referenz. Deckt spec §44/§45: jeder Befehl
 * nennt Wirkung, Netzwerkbedarf, Reversibilität und Gefährdungsstufe.
 */

export interface SetupCommand {
  command: string;
  description: string;
  whatHappens: string;
  network: boolean;
  reversible: boolean;
  dangerous: boolean;
}

export interface SetupSection {
  slug: string;
  title: string;
  summary: string;
  commands: SetupCommand[];
}

export const SETUP_SECTIONS: SetupSection[] = [
  {
    slug: 'terminal',
    title: 'Terminal',
    summary: 'Die Kommandozeile deines Rechners — Voraussetzung für alles Weitere.',
    commands: [
      {
        command: 'pwd',
        description: 'Zeigt das aktuelle Arbeitsverzeichnis.',
        whatHappens: 'Liest nur den aktuellen Pfad, verändert nichts.',
        network: false,
        reversible: true,
        dangerous: false,
      },
      {
        command: 'ls',
        description: 'Listet die Dateien im aktuellen Verzeichnis auf.',
        whatHappens: 'Liest den Verzeichnisinhalt, verändert nichts.',
        network: false,
        reversible: true,
        dangerous: false,
      },
      {
        command: 'cd zielordner',
        description: 'Wechselt in ein anderes Verzeichnis.',
        whatHappens: 'Ändert nur, wo nachfolgende Befehle wirken — keine Datei wird angefasst.',
        network: false,
        reversible: true,
        dangerous: false,
      },
      {
        command: 'mkdir neuer-ordner',
        description: 'Legt einen neuen Ordner an.',
        whatHappens: 'Erstellt ein leeres Verzeichnis auf der Festplatte.',
        network: false,
        reversible: true,
        dangerous: false,
      },
      {
        command: 'rm -rf ordner',
        description: 'Löscht einen Ordner samt Inhalt unwiderruflich.',
        whatHappens:
          'Entfernt alle Dateien im angegebenen Ordner dauerhaft — kein Papierkorb, keine Nachfrage.',
        network: false,
        reversible: false,
        dangerous: true,
      },
    ],
  },
  {
    slug: 'vscode',
    title: 'VS Code',
    summary: 'Der Editor, in dem der meiste Quelltext dieses Kurses entsteht.',
    commands: [
      {
        command: 'code .',
        description: 'Öffnet das aktuelle Verzeichnis in VS Code.',
        whatHappens: 'Startet den Editor mit dem aktuellen Ordner als Projekt.',
        network: false,
        reversible: true,
        dangerous: false,
      },
    ],
  },
  {
    slug: 'node',
    title: 'Node.js & npm',
    summary: 'Die JavaScript-Laufzeit und ihr Paketmanager.',
    commands: [
      {
        command: 'node --version',
        description: 'Zeigt die installierte Node.js-Version.',
        whatHappens: 'Liest nur Versionsinformationen.',
        network: false,
        reversible: true,
        dangerous: false,
      },
      {
        command: 'npm install',
        description: 'Installiert alle Abhängigkeiten aus package.json.',
        whatHappens: 'Lädt Pakete aus dem npm-Registry herunter und legt sie in node_modules ab.',
        network: true,
        reversible: true,
        dangerous: false,
      },
    ],
  },
  {
    slug: 'python',
    title: 'Python & pip',
    summary: 'Für Skripte und Werkzeuge außerhalb des Browsers.',
    commands: [
      {
        command: 'python3 --version',
        description: 'Zeigt die installierte Python-Version.',
        whatHappens: 'Liest nur Versionsinformationen.',
        network: false,
        reversible: true,
        dangerous: false,
      },
      {
        command: 'pip install paketname',
        description: 'Installiert ein Python-Paket.',
        whatHappens: 'Lädt das Paket aus dem Python-Registry (PyPI) herunter und installiert es.',
        network: true,
        reversible: true,
        dangerous: false,
      },
    ],
  },
];
