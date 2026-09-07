import type { BefehlSicherheit } from '@/domain/commands/safety';

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
  /** Was der Befehl konkret tut — in einem Satz, ohne Fachjargon. */
  whatHappens: string;
  /** Eine ausgeschriebene, realistische Aufrufzeile. */
  example?: string;
  /** Was vorher dasein muss, damit der Befehl überhaupt sinnvoll ist. */
  prerequisites?: string[];
  /** Wirkbereiche, Gefährdung, Reversibilität, Netzwerkbedarf. */
  safety: BefehlSicherheit;
}

/**
 * Kurzform für die Anzeige. `dangerous` gab es hier früher als eigenes Feld;
 * es ist jetzt aus der Gefahrenstufe abgeleitet, damit es nur EINE Wahrheit
 * gibt und Anzeige, Aufgaben und Validator nicht auseinanderlaufen können.
 */
export function istGefaehrlich(command: SetupCommand): boolean {
  return command.safety.gefahr === 'destruktiv';
}

export interface SetupSection {
  slug: string;
  title: string;
  summary: string;
  commands: SetupCommand[];
}

/** Kurzschreibweise für die häufigen Fälle, damit die Liste lesbar bleibt. */
const nurLesend = (netzwerk = false): BefehlSicherheit => ({
  wirkung: ['nur-lesend'],
  gefahr: 'harmlos',
  reversibel: true,
  netzwerk,
});

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
        example: 'pwd',
        safety: nurLesend(),
      },
      {
        command: 'ls',
        description: 'Listet die Dateien im aktuellen Verzeichnis auf.',
        whatHappens: 'Liest den Verzeichnisinhalt, verändert nichts.',
        example: 'ls -la',
        safety: nurLesend(),
      },
      {
        command: 'cd zielordner',
        description: 'Wechselt in ein anderes Verzeichnis.',
        whatHappens: 'Ändert nur, wo nachfolgende Befehle wirken — keine Datei wird angefasst.',
        example: 'cd ~/projekte/mein-projekt',
        safety: nurLesend(),
      },
      {
        command: 'mkdir neuer-ordner',
        description: 'Legt einen neuen Ordner an.',
        whatHappens: 'Erstellt ein leeres Verzeichnis auf der Festplatte.',
        example: 'mkdir notizen',
        safety: {
          wirkung: ['arbeitsverzeichnis'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'rm -rf ordner',
        description: 'Löscht einen Ordner samt Inhalt unwiderruflich.',
        whatHappens:
          'Entfernt alle Dateien im angegebenen Ordner dauerhaft — kein Papierkorb, keine Nachfrage.',
        example: 'rm -rf build',
        safety: {
          wirkung: ['arbeitsverzeichnis'],
          gefahr: 'destruktiv',
          reversibel: false,
          netzwerk: false,
        },
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
        example: 'code .',
        safety: nurLesend(),
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
        example: 'node --version',
        safety: nurLesend(),
      },
      {
        command: 'npm install',
        description: 'Installiert alle Abhängigkeiten aus package.json.',
        whatHappens: 'Lädt Pakete aus dem npm-Registry herunter und legt sie in node_modules ab.',
        example: 'npm install',
        prerequisites: ['Eine package.json im aktuellen Verzeichnis'],
        safety: {
          wirkung: ['arbeitsverzeichnis', 'remote'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: true,
        },
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
        example: 'python3 --version',
        safety: nurLesend(),
      },
      {
        command: 'pip install paketname',
        description: 'Installiert ein Python-Paket.',
        whatHappens: 'Lädt das Paket aus dem Python-Registry (PyPI) herunter und installiert es.',
        example: 'pip install requests',
        safety: {
          wirkung: ['arbeitsverzeichnis', 'remote'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: true,
        },
      },
    ],
  },
  {
    slug: 'git-grundlagen',
    title: 'Git — Grundlagen',
    summary:
      'Die Befehle für den täglichen Weg vom Arbeitsverzeichnis über die Staging Area in einen Commit.',
    commands: [
      {
        command: 'git init',
        description: 'Macht aus einem gewöhnlichen Ordner ein Git-Repository.',
        whatHappens:
          'Legt den versteckten Ordner .git an. Erst dadurch kann Git überhaupt Versionen führen — deine vorhandenen Dateien bleiben unangetastet.',
        example: 'git init',
        safety: {
          wirkung: ['arbeitsverzeichnis'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git clone <url>',
        description: 'Holt ein bestehendes Repository samt Verlauf auf deinen Rechner.',
        whatHappens:
          'Lädt alle Commits herunter, legt einen Ordner an und richtet das Remote "origin" gleich mit ein.',
        example: 'git clone https://github.com/org/projekt.git',
        prerequisites: ['Die URL des Repositories', 'Leserecht darauf'],
        safety: {
          wirkung: ['arbeitsverzeichnis', 'remote'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: true,
        },
      },
      {
        command: 'git status',
        description: 'Zeigt, was sich seit dem letzten Commit geändert hat.',
        whatHappens:
          'Vergleicht Arbeitsverzeichnis, Staging Area und letzten Commit und listet die Unterschiede. Der Befehl, den man am häufigsten braucht — und der nie etwas kaputt macht.',
        example: 'git status',
        prerequisites: ['Ein Git-Repository'],
        safety: nurLesend(),
      },
      {
        command: 'git add <datei>',
        description: 'Merkt eine Änderung für den nächsten Commit vor.',
        whatHappens:
          'Kopiert den aktuellen Stand der Datei in die Staging Area. Änderst du die Datei danach erneut, ist die neue Änderung NICHT automatisch mit vorgemerkt.',
        example: 'git add src/index.ts',
        prerequisites: ['Eine geänderte oder neue Datei'],
        safety: {
          wirkung: ['staging'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git commit -m "Nachricht"',
        description: 'Hält alles Vorgemerkte als neuen Commit fest.',
        whatHappens:
          'Schreibt den Inhalt der Staging Area dauerhaft in den Verlauf. Nur was vorgemerkt war, kommt mit.',
        example: 'git commit -m "Anmeldeformular validiert Eingaben"',
        prerequisites: ['Mindestens eine vorgemerkte Änderung'],
        safety: {
          wirkung: ['verlauf'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git log',
        description: 'Zeigt den Verlauf der Commits.',
        whatHappens: 'Liest den Verlauf und zeigt ihn an, neueste zuerst.',
        example: 'git log --oneline --graph',
        safety: nurLesend(),
      },
      {
        command: 'git diff',
        description: 'Zeigt Änderungen, die noch NICHT vorgemerkt sind.',
        whatHappens:
          'Vergleicht Arbeitsverzeichnis mit der Staging Area. Nach einem git add zeigt der Befehl für diese Datei nichts mehr — dafür gibt es git diff --staged.',
        example: 'git diff --staged',
        safety: nurLesend(),
      },
    ],
  },
  {
    slug: 'git-branches',
    title: 'Git — Branches und Merge',
    summary: 'Parallel arbeiten, ohne sich gegenseitig zu überschreiben.',
    commands: [
      {
        command: 'git branch',
        description: 'Listet Branches auf oder legt einen neuen an.',
        whatHappens:
          'Ein Branch ist nur ein Zeiger auf einen Commit. Anlegen kostet praktisch nichts und kopiert keine Dateien.',
        example: 'git branch feature/anmeldung',
        safety: {
          wirkung: ['verlauf'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git switch <branch>',
        description: 'Wechselt auf einen anderen Branch.',
        whatHappens:
          'Setzt HEAD auf den anderen Branch und passt das Arbeitsverzeichnis an. Nicht committete Änderungen, die dabei verloren gingen, verhindern den Wechsel.',
        example: 'git switch main',
        prerequisites: ['Der Branch muss existieren'],
        safety: {
          wirkung: ['arbeitsverzeichnis'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git switch -c <branch>',
        description: 'Legt einen Branch an und wechselt sofort darauf.',
        whatHappens: 'Wie git branch und git switch in einem Schritt.',
        example: 'git switch -c fix/tippfehler',
        safety: {
          wirkung: ['verlauf', 'arbeitsverzeichnis'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git checkout <branch>',
        description: 'Älterer Weg, den Branch zu wechseln.',
        whatHappens:
          'Tut hier dasselbe wie git switch, kann aber noch viel mehr — Dateien zurücksetzen, Commits auschecken. Genau diese Vielseitigkeit macht ihn zur häufigen Fehlerquelle. In älteren Anleitungen wirst du ihn oft sehen; für neue Arbeit sind git switch und git restore die klareren Werkzeuge.',
        example: 'git checkout main',
        safety: {
          wirkung: ['arbeitsverzeichnis'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git merge <branch>',
        description: 'Führt einen anderen Branch in den aktuellen zusammen.',
        whatHappens:
          'Liegt dein Branch vollständig in dessen Vorgeschichte, wandert nur der Zeiger weiter (Fast-Forward). Sind beide Linien auseinandergelaufen, entsteht ein Merge-Commit mit zwei Eltern.',
        example: 'git merge feature/anmeldung',
        prerequisites: ['Sauberes Arbeitsverzeichnis'],
        safety: {
          wirkung: ['verlauf', 'arbeitsverzeichnis'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git merge --abort',
        description: 'Bricht einen laufenden Merge ab.',
        whatHappens:
          'Stellt den Stand von vor dem Merge wieder her. Der Rettungsanker, wenn ein Konflikt unübersichtlich wird.',
        example: 'git merge --abort',
        prerequisites: ['Ein laufender, noch nicht abgeschlossener Merge'],
        safety: {
          wirkung: ['arbeitsverzeichnis'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: false,
        },
      },
    ],
  },
  {
    slug: 'git-remote',
    title: 'Git — Remotes',
    summary: 'Der Austausch mit einem Repository, das woanders liegt.',
    commands: [
      {
        command: 'git remote -v',
        description: 'Zeigt, mit welchen entfernten Repositories dein Repository verbunden ist.',
        whatHappens:
          'Liest die konfigurierten Remotes samt URL. "origin" ist nur ein üblicher Name, kein Zauberwort.',
        example: 'git remote -v',
        safety: nurLesend(),
      },
      {
        command: 'git fetch',
        description: 'Holt den Stand vom Remote — ohne deine Arbeit anzufassen.',
        whatHappens:
          'Lädt neue Commits herunter und aktualisiert die Remote-Tracking-Branches wie origin/main. Dein aktueller Branch und dein Arbeitsverzeichnis bleiben unverändert. Danach kannst du in Ruhe ansehen, was sich getan hat.',
        example: 'git fetch origin',
        safety: {
          wirkung: ['remote'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: true,
        },
      },
      {
        command: 'git pull',
        description: 'Holt den Stand vom Remote UND baut ihn direkt ein.',
        whatHappens:
          'Entspricht git fetch gefolgt von einer Integration in deinen aktuellen Branch — standardmäßig ein Merge. Anders als bei git fetch verändert sich dein Arbeitsverzeichnis sofort, und es kann zu einem Konflikt kommen.',
        example: 'git pull origin main',
        prerequisites: ['Sauberes Arbeitsverzeichnis empfohlen'],
        safety: {
          wirkung: ['remote', 'arbeitsverzeichnis', 'verlauf'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: true,
        },
      },
      {
        command: 'git push',
        description: 'Überträgt deine Commits zum Remote.',
        whatHappens:
          'Schiebt lokale Commits hoch. Ab jetzt sehen andere sie. Lehnt Git den Push ab, ist das meist ein Hinweis: Auf dem Remote liegt etwas, das du noch nicht hast.',
        example: 'git push origin feature/anmeldung',
        prerequisites: ['Schreibrecht auf dem Remote'],
        safety: {
          wirkung: ['remote'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: true,
        },
      },
      {
        command: 'git push --force',
        description: 'Überschreibt den Stand auf dem Remote.',
        whatHappens:
          'Ersetzt den entfernten Branch durch deinen. Commits, die andere bereits geholt haben, verschwinden aus dem gemeinsamen Verlauf — deren Arbeit kann dadurch verloren gehen. Auf gemeinsam genutzten Branches praktisch nie richtig. Wenn es sein muss: --force-with-lease prüft wenigstens, ob jemand anders inzwischen etwas hochgeladen hat.',
        example: 'git push --force-with-lease origin mein-branch',
        safety: {
          wirkung: ['remote', 'verlauf'],
          gefahr: 'destruktiv',
          reversibel: false,
          netzwerk: true,
        },
      },
    ],
  },
  {
    slug: 'git-rettung',
    title: 'Git — Zurücknehmen und retten',
    summary:
      'Drei ähnlich klingende Befehle mit sehr verschiedenen Folgen — und der Rettungsanker, wenn doch etwas schiefgeht.',
    commands: [
      {
        command: 'git restore <datei>',
        description: 'Verwirft Änderungen im Arbeitsverzeichnis.',
        whatHappens:
          'Holt die Datei aus der Staging Area beziehungsweise dem letzten Commit zurück. Deine nicht gespeicherten Änderungen an dieser Datei sind danach weg — und zwar endgültig, denn Git hat sie nie gesehen.',
        example: 'git restore src/index.ts',
        safety: {
          wirkung: ['arbeitsverzeichnis'],
          gefahr: 'destruktiv',
          reversibel: false,
          netzwerk: false,
        },
      },
      {
        command: 'git restore --staged <datei>',
        description: 'Nimmt eine Vormerkung zurück.',
        whatHappens:
          'Entfernt die Datei aus der Staging Area. Deine Änderung im Arbeitsverzeichnis bleibt erhalten — nur der Commit-Plan ändert sich.',
        example: 'git restore --staged src/index.ts',
        safety: {
          wirkung: ['staging'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git revert <commit>',
        description: 'Macht einen Commit rückgängig — durch einen neuen Commit.',
        whatHappens:
          'Legt einen zusätzlichen Commit an, der die Änderung umkehrt. Der Verlauf bleibt vollständig erhalten. Deshalb der sichere Weg, wenn etwas schon veröffentlicht ist.',
        example: 'git revert a1b2c3d',
        safety: {
          wirkung: ['verlauf'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git reset --soft <commit>',
        description: 'Setzt den Branch-Zeiger zurück, behält alles andere.',
        whatHappens:
          'Die Commits danach verschwinden aus dem Branch, ihre Änderungen liegen aber vorgemerkt in der Staging Area. Nützlich, um mehrere Commits zu einem zusammenzufassen.',
        example: 'git reset --soft HEAD~1',
        safety: {
          wirkung: ['verlauf'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git reset --hard <commit>',
        description: 'Setzt Branch, Staging Area UND Arbeitsverzeichnis zurück.',
        whatHappens:
          'Alles nach diesem Commit ist aus dem Branch verschwunden, und nicht committete Änderungen sind vernichtet. Commits lassen sich über das Reflog meist noch retten — nie committete Arbeit nicht. Der gefährlichste Alltagsbefehl in Git.',
        example: 'git reset --hard origin/main',
        safety: {
          wirkung: ['verlauf', 'arbeitsverzeichnis', 'staging'],
          gefahr: 'destruktiv',
          reversibel: false,
          netzwerk: false,
        },
      },
      {
        command: 'git reflog',
        description: 'Zeigt, wo HEAD zuletzt überall stand.',
        whatHappens:
          'Führt Buch über jede Bewegung von HEAD — auch über die, die im normalen Verlauf nicht mehr auftauchen. Der Rettungsanker nach einem versehentlichen Reset: Hier steht die Commit-Kennung, zu der du zurückkannst.',
        example: 'git reflog',
        safety: nurLesend(),
      },
      {
        command: 'git stash',
        description: 'Legt unfertige Änderungen kurz beiseite.',
        whatHappens:
          'Räumt Arbeitsverzeichnis und Staging Area leer und hebt den Stand separat auf. Mit git stash pop holst du ihn zurück.',
        example: 'git stash push -m "Zwischenstand Formular"',
        safety: {
          wirkung: ['arbeitsverzeichnis', 'staging'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: false,
        },
      },
    ],
  },
  {
    slug: 'git-fortgeschritten',
    title: 'Git — Fortgeschritten',
    summary: 'Nichts davon brauchst du am Anfang. Gut zu wissen, dass es das gibt.',
    commands: [
      {
        command: 'git rebase <branch>',
        description: 'Setzt die eigenen Commits neu auf einen anderen Stand auf.',
        whatHappens:
          'Schreibt die eigenen Commits neu, damit der Verlauf gerade bleibt. Weil dabei neue Commit-Kennungen entstehen, ist es auf bereits geteilten Branches heikel.',
        example: 'git rebase main',
        safety: {
          wirkung: ['verlauf'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git cherry-pick <commit>',
        description: 'Holt einen einzelnen Commit in den aktuellen Branch.',
        whatHappens: 'Wendet die Änderung dieses einen Commits hier noch einmal an.',
        example: 'git cherry-pick a1b2c3d',
        safety: {
          wirkung: ['verlauf', 'arbeitsverzeichnis'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git tag <name>',
        description: 'Setzt eine feste Marke auf einen Commit.',
        whatHappens: 'Benennt einen Commit dauerhaft — üblich für Versionsstände.',
        example: 'git tag v1.2.0',
        safety: {
          wirkung: ['verlauf'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: false,
        },
      },
      {
        command: 'git bisect start',
        description: 'Sucht per Halbierung den Commit, der einen Fehler eingeführt hat.',
        whatHappens:
          'Springt zwischen Commits und fragt jeweils, ob der Fehler dort schon auftritt. Halbiert den Suchraum bei jedem Schritt.',
        example: 'git bisect start',
        safety: {
          wirkung: ['arbeitsverzeichnis'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: false,
        },
      },
    ],
  },
  {
    slug: 'github-cli',
    title: 'GitHub CLI (gh)',
    summary:
      'GitHub von der Kommandozeile aus. Ergänzt Git — ersetzt es nicht: gh spricht mit GitHub, git mit dem Verlauf.',
    commands: [
      {
        command: 'gh auth login',
        description: 'Meldet die GitHub CLI bei einem GitHub-Konto an.',
        whatHappens:
          'Führt durch die Anmeldung und legt die Zugangsdaten im Anmeldespeicher deines Systems ab.',
        example: 'gh auth login',
        prerequisites: ['Ein GitHub-Konto'],
        safety: {
          wirkung: ['remote'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: true,
        },
      },
      {
        command: 'gh auth status',
        description: 'Zeigt, als wer du gerade angemeldet bist.',
        whatHappens: 'Liest den Anmeldestatus je bekanntem GitHub-Host.',
        example: 'gh auth status',
        safety: nurLesend(true),
      },
      {
        command: 'gh repo clone <repo>',
        description: 'Klont ein Repository von GitHub.',
        whatHappens:
          'Wie git clone, nur mit Kurzschreibweise org/projekt statt vollständiger URL. Bei einem Fork richtet gh zusätzlich das Upstream-Remote ein.',
        example: 'gh repo clone org/projekt',
        prerequisites: ['Angemeldet über gh auth login'],
        safety: {
          wirkung: ['arbeitsverzeichnis', 'remote'],
          gefahr: 'harmlos',
          reversibel: true,
          netzwerk: true,
        },
      },
      {
        command: 'gh issue create',
        description: 'Legt ein Issue an.',
        whatHappens: 'Fragt Titel und Beschreibung ab und erstellt das Issue im Repository.',
        example: 'gh issue create --title "Anmeldung schlägt fehl" --body "Schritte: ..."',
        prerequisites: ['Angemeldet', 'Im Repository-Ordner'],
        safety: {
          wirkung: ['remote'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: true,
        },
      },
      {
        command: 'gh issue list',
        description: 'Listet die Issues des Repositories.',
        whatHappens: 'Liest offene Issues; mit --state all auch geschlossene.',
        example: 'gh issue list --state open --limit 20',
        safety: nurLesend(true),
      },
      {
        command: 'gh pr create',
        description: 'Öffnet einen Pull Request für den aktuellen Branch.',
        whatHappens:
          'Erstellt den Pull Request auf GitHub. Mit --fill übernimmt gh Titel und Beschreibung aus den Commits.',
        example: 'gh pr create --fill --base main',
        prerequisites: ['Der Branch ist bereits gepusht'],
        safety: {
          wirkung: ['remote'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: true,
        },
      },
      {
        command: 'gh pr view',
        description: 'Zeigt einen Pull Request im Terminal.',
        whatHappens: 'Liest Titel, Beschreibung und Status; mit --comments auch die Kommentare.',
        example: 'gh pr view 42 --comments',
        safety: nurLesend(true),
      },
      {
        command: 'gh pr checkout <nummer>',
        description: 'Holt den Branch eines Pull Requests lokal aus.',
        whatHappens:
          'Lädt den Branch herunter und wechselt darauf — der übliche Weg, um fremde Änderungen selbst auszuprobieren.',
        example: 'gh pr checkout 42',
        safety: {
          wirkung: ['arbeitsverzeichnis', 'remote'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: true,
        },
      },
      {
        command: 'gh pr merge <nummer>',
        description: 'Führt einen Pull Request zusammen.',
        whatHappens:
          'Merged auf GitHub. Die Art wählst du mit --merge, --squash oder --rebase; --delete-branch räumt den Branch danach auf.',
        example: 'gh pr merge 42 --merge --delete-branch',
        prerequisites: ['Erforderliche Prüfungen sind grün', 'Freigabe liegt vor'],
        safety: {
          wirkung: ['remote', 'verlauf'],
          gefahr: 'achtsam',
          reversibel: true,
          netzwerk: true,
        },
      },
      {
        command: 'gh run list',
        description: 'Listet die letzten GitHub-Actions-Läufe.',
        whatHappens: 'Liest den Status der Workflow-Läufe des Repositories.',
        example: 'gh run list --limit 10',
        safety: nurLesend(true),
      },
      {
        command: 'gh run watch <id>',
        description: 'Verfolgt einen laufenden Workflow bis zum Ende.',
        whatHappens:
          'Aktualisiert die Anzeige, bis der Lauf fertig ist. Mit --exit-status endet der Befehl bei einem Fehlschlag mit einem Fehlercode.',
        example: 'gh run watch 1234567 --exit-status',
        safety: nurLesend(true),
      },
    ],
  },
];
