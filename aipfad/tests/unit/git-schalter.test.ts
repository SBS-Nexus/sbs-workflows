import { describe, expect, it } from 'vitest';
import { leseSchalter, zerlegeBefehl } from '@/domain/git/schalter';
import { fuehreGitBefehlAus, status, type GitArbeitsbaumZustand } from '@/domain/git/working-tree';
import { fuehreBranchBefehlAus, type BranchZustand } from '@/domain/git/branches';
import { fuehreKonfliktBefehlAus, loeseKonflikt } from '@/domain/git/merge-conflict';

/**
 * Der wiederkehrende Fehler dieser Simulatoren war immer derselbe: Ein nicht
 * umgesetzter Schalter wurde übergangen, und der Befehl tat danach etwas
 * anderes als verlangt. Diese Prüfungen decken die ganze Klasse ab, nicht
 * einzelne Fälle (Codex-Review auf PR #30).
 */

describe('Schalter lesen', () => {
  const ERLAUBT = [{ schreibweisen: ['-S', '--staged'], name: 'staged' }];

  it('erkennt beide Schreibweisen unter einem Namen', () => {
    expect(leseSchalter(['-S', 'a.txt'], ERLAUBT).gesetzt.has('staged')).toBe(true);
    expect(leseSchalter(['--staged', 'a.txt'], ERLAUBT).gesetzt.has('staged')).toBe(true);
  });

  it('trennt Operanden von Schaltern', () => {
    expect(leseSchalter(['-S', 'a.txt', 'b.txt'], ERLAUBT).operanden).toEqual(['a.txt', 'b.txt']);
  });

  it('meldet den ersten unbekannten Schalter', () => {
    expect(leseSchalter(['-x', 'a.txt'], ERLAUBT).unbekannt).toBe('-x');
  });

  it('behandelt nach -- alles als Operand', () => {
    const ergebnis = leseSchalter(['--', '-seltsamer-dateiname'], ERLAUBT);
    expect(ergebnis.unbekannt).toBeUndefined();
    expect(ergebnis.operanden).toEqual(['-seltsamer-dateiname']);
  });
});

function arbeitsbaum(): GitArbeitsbaumZustand {
  return {
    dateien: [
      { pfad: 'preise.md', arbeitsbaum: 'neu', index: 'mittel', head: 'alt' },
      { pfad: 'liesmich.md', arbeitsbaum: 'x', index: 'x', head: 'x' },
    ],
    commits: [],
  };
}

describe('git restore: Kurzform -S', () => {
  it('nimmt mit -S die Vormerkung zurück, statt die Arbeit zu verwerfen', () => {
    // Zuvor kannte der Simulator nur --staged. `-S` fiel in den anderen Zweig
    // und verwarf die zweite Änderung — ein Datenverlust im Simulator.
    const ergebnis = fuehreGitBefehlAus(arbeitsbaum(), 'git restore -S preise.md');
    const datei = ergebnis.zustand.dateien.find((d) => d.pfad === 'preise.md');

    expect(datei?.arbeitsbaum).toBe('neu');
    expect(datei?.index).toBe('alt');
  });
});

describe('git add mit Alles-Auswahl', () => {
  it('lehnt einen unbekannten Pfad auch neben einem Punkt ab', () => {
    const ergebnis = fuehreGitBefehlAus(arbeitsbaum(), 'git add . fehlt.txt');

    expect(ergebnis.ausgabe).toContain("pathspec 'fehlt.txt' did not match any files");
    expect(ergebnis.veraendert).toBe(false);
    expect(status(ergebnis.zustand).find((e) => e.pfad === 'preise.md')?.status).toBe('staged');
  });

  it('merkt mit einem Punkt alles vor, wenn kein Pfad danebensteht', () => {
    const ergebnis = fuehreGitBefehlAus(arbeitsbaum(), 'git add .');
    expect(ergebnis.veraendert).toBe(true);
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'preise.md')?.index).toBe('neu');
  });

  it('lehnt einen nicht umgesetzten Schalter ab', () => {
    const ergebnis = fuehreGitBefehlAus(arbeitsbaum(), 'git add -p preise.md');
    expect(ergebnis.ausgabe).toContain('nicht umgesetzt');
    expect(ergebnis.veraendert).toBe(false);
  });
});

function branches(): BranchZustand {
  return {
    commits: [
      { id: 'c01', nachricht: 'Erster', eltern: [] },
      { id: 'c02', nachricht: 'Zweiter', eltern: ['c01'] },
    ],
    branches: { main: 'c02' },
    aktuellerBranch: 'main',
  };
}

describe('git branch: Auflisten legt nichts an', () => {
  it('behandelt einen Operanden bei -l als Suchmuster', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git branch -l topic');
    expect(ergebnis.zustand.branches['topic']).toBeUndefined();
    expect(ergebnis.veraendert).toBe(false);
  });

  it('lehnt bei -a einen Operanden ab, statt ihn als Muster zu lesen', () => {
    // Diese Prüfung stand vorher andersherum: Sie hielt das Filtern mit -a
    // für richtig. `-a` und `-l` sind aber nicht dasselbe — `-a` nimmt gar
    // keinen Operanden entgegen (Codex-Review auf PR #30).
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git branch -a main');

    expect(ergebnis.ausgabe).toContain('do not take a branch name');
    expect(ergebnis.veraendert).toBe(false);
    expect(Object.keys(ergebnis.zustand.branches)).toEqual(['main']);
  });

  it('listet mit -a ohne Operanden alle Branches auf', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git branch -a');
    expect(ergebnis.ausgabe).toContain('main');
    expect(ergebnis.veraendert).toBe(false);
  });

  it('legt ohne Auflisten-Schalter weiterhin an', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git branch topic');
    expect(ergebnis.zustand.branches['topic']).toBe('c02');
  });
});

describe('git merge: nicht umgesetzte Schalter', () => {
  it('lehnt --squash ab, statt einen Merge-Commit anzulegen', () => {
    let zustand = fuehreBranchBefehlAus(branches(), 'git switch -c feature').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git commit -m "A"').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git switch main').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git commit -m "B"').zustand;

    const vorher = zustand.commits.length;
    const ergebnis = fuehreBranchBefehlAus(zustand, 'git merge --squash feature');

    expect(ergebnis.ausgabe).toContain('nicht umgesetzt');
    expect(ergebnis.veraendert).toBe(false);
    expect(ergebnis.zustand.commits).toHaveLength(vorher);
  });

  it('lehnt --no-ff ab', () => {
    expect(fuehreBranchBefehlAus(branches(), 'git merge --no-ff feature').ausgabe).toContain(
      'nicht umgesetzt',
    );
  });
});

describe('git switch: nicht umgesetzte Schalter', () => {
  it('lehnt -d ab, statt es zu übergehen', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git switch -d c01');
    expect(ergebnis.ausgabe).toContain('nicht umgesetzt');
    expect(ergebnis.zustand.aktuellerBranch).toBe('main');
  });
});

/**
 * Die Schalterprüfung gilt für JEDEN Unterbefehl, nicht nur für die, bei
 * denen bisher ein Fund gemeldet wurde. Ein vergessener Schalter soll
 * abgelehnt werden, egal wo (Codex-Review auf PR #30).
 */
describe('Schalterprüfung deckt alle Unterbefehle ab', () => {
  it('lehnt unbekannte Schalter im Arbeitsbaum-Simulator überall ab', () => {
    for (const befehl of [
      'git status --short',
      'git commit --amend -m "x"',
      'git diff --stat',
      'git log --oneline',
      'git add --patch preise.md',
      'git restore --source=HEAD preise.md',
    ]) {
      const ergebnis = fuehreGitBefehlAus(arbeitsbaum(), befehl);
      expect(ergebnis.ausgabe, befehl).toContain('nicht umgesetzt');
      expect(ergebnis.veraendert, befehl).toBe(false);
    }
  });

  it('lehnt unbekannte Schalter im Branch-Simulator überall ab', () => {
    for (const befehl of [
      'git commit --amend -m "x"',
      'git log --graph',
      'git switch --detach main',
      'git merge --no-commit feature',
    ]) {
      const ergebnis = fuehreBranchBefehlAus(branches(), befehl);
      expect(ergebnis.ausgabe, befehl).toContain('nicht umgesetzt');
      expect(ergebnis.veraendert, befehl).toBe(false);
    }
  });

  it('begrenzt git add -A auf einen angegebenen Pfad', () => {
    // Ohne die Begrenzung merkte -A trotz Pfadangabe ALLES vor. Beide
    // Dateien tragen deshalb eine nicht vorgemerkte Änderung: Nur so fällt
    // auf, wenn die Begrenzung fehlt.
    const zustand: GitArbeitsbaumZustand = {
      dateien: [
        { pfad: 'preise.md', arbeitsbaum: 'neu', index: 'alt', head: 'alt' },
        { pfad: 'liesmich.md', arbeitsbaum: 'auch neu', index: 'alt', head: 'alt' },
      ],
      commits: [],
    };
    const ergebnis = fuehreGitBefehlAus(zustand, 'git add -A preise.md');

    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'preise.md')?.index).toBe('neu');
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'liesmich.md')?.index).toBe('alt');
  });

  it('berücksichtigt beim Auflisten jedes angegebene Muster', () => {
    let zustand = fuehreBranchBefehlAus(branches(), 'git branch feature').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git branch hotfix').zustand;

    const ergebnis = fuehreBranchBefehlAus(zustand, 'git branch -l feature hotfix');
    expect(ergebnis.ausgabe).toContain('feature');
    expect(ergebnis.ausgabe).toContain('hotfix');
    expect(ergebnis.ausgabe).not.toContain('main');
  });
});

function konfliktStart() {
  return {
    datei: {
      pfad: 'preise.md',
      abschnitte: [
        { art: 'gemeinsam' as const, zeilen: ['# Preise'] },
        {
          art: 'konflikt' as const,
          id: 'k1',
          unsere: ['9 Euro'],
          ihre: ['12 Euro'],
        },
      ],
    },
    aufloesungen: {},
    vorgemerkt: false,
    status: 'laeuft' as const,
  };
}

describe('Konflikt-Simulator prüft Schalter und Pfad', () => {
  const konflikt = konfliktStart;

  it('merkt keinen fremden Pfad vor', () => {
    const geloest = loeseKonflikt(konflikt(), 'k1', { art: 'ihre' });
    const ergebnis = fuehreKonfliktBefehlAus(geloest, 'git add tippfehler.md');

    expect(ergebnis.ausgabe).toContain("pathspec 'tippfehler.md' did not match any files");
    expect(ergebnis.zustand.vorgemerkt).toBe(false);
  });

  it('lehnt unbekannte Schalter ab', () => {
    const ergebnis = fuehreKonfliktBefehlAus(konflikt(), 'git merge --continue');
    expect(ergebnis.ausgabe).toContain('nicht umgesetzt');
    expect(ergebnis.veraendert).toBe(false);
  });

  it('merkt die Konfliktdatei weiterhin vor', () => {
    const geloest = loeseKonflikt(konflikt(), 'k1', { art: 'ihre' });
    const ergebnis = fuehreKonfliktBefehlAus(geloest, 'git add preise.md');
    expect(ergebnis.zustand.vorgemerkt).toBe(true);
  });
});

/**
 * Der Schaltervertrag kannte anfangs nur die NAMEN der Schalter. Die
 * Commit-Nachricht las deshalb ein eigener regulärer Ausdruck aus der rohen
 * Eingabe — an der Prüfung vorbei. Der kannte `-m`, aber nicht `--message`,
 * und er bemerkte nicht, wenn gar kein Wert dastand (Codex-Review auf PR #30).
 */
describe('Schalter mit Wert', () => {
  const MIT_WERT = [{ schreibweisen: ['-m', '--message'], name: 'nachricht', brauchtWert: true }];

  it('nimmt den folgenden Bestandteil als Wert', () => {
    expect(leseSchalter(['-m', 'Erster Commit'], MIT_WERT).werte.get('nachricht')).toEqual([
      'Erster Commit',
    ]);
  });

  it('meldet einen Schalter, dem sein Wert fehlt', () => {
    expect(leseSchalter(['-m'], MIT_WERT).ohneWert).toBe('-m');
  });

  it('zählt den Wert nicht als Operanden', () => {
    const ergebnis = leseSchalter(['-m', 'Text', 'datei.md'], MIT_WERT);
    expect(ergebnis.operanden).toEqual(['datei.md']);
  });

  it('nimmt auch einen Wert, der wie ein Schalter aussieht', () => {
    // `git commit -m -x` meint in echtem Git die Nachricht "-x".
    const ergebnis = leseSchalter(['-m', '-x'], MIT_WERT);
    expect(ergebnis.werte.get('nachricht')).toEqual(['-x']);
    expect(ergebnis.unbekannt).toBeUndefined();
  });
});

describe('Befehlszeile zerlegen', () => {
  it('hält einen Text in Anführungszeichen zusammen', () => {
    expect(zerlegeBefehl('git commit -m "Zwei Wörter"')).toEqual([
      'git',
      'commit',
      '-m',
      'Zwei Wörter',
    ]);
  });

  it('versteht einfache Anführungszeichen genauso', () => {
    expect(zerlegeBefehl("git commit -m 'Zwei Wörter'")).toEqual([
      'git',
      'commit',
      '-m',
      'Zwei Wörter',
    ]);
  });

  it('behält einen leeren Text als eigenen Bestandteil', () => {
    // Sonst sähe `-m ""` aus wie ein `-m` ganz ohne Wert — zwei
    // verschiedene Fehler mit zwei verschiedenen Meldungen.
    expect(zerlegeBefehl('git commit -m ""')).toEqual(['git', 'commit', '-m', '']);
  });
});

describe('Commit-Nachricht in allen Simulatoren', () => {
  it('versteht die lange Schreibweise --message', () => {
    const zustand = fuehreGitBefehlAus(arbeitsbaum(), 'git add preise.md').zustand;
    const ergebnis = fuehreGitBefehlAus(zustand, 'git commit --message "Preise angepasst"');

    expect(ergebnis.veraendert).toBe(true);
    expect(ergebnis.zustand.commits[ergebnis.zustand.commits.length - 1]?.nachricht).toBe(
      'Preise angepasst',
    );
  });

  it('versteht --message auch im Branch-Simulator', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git commit --message "Neuer Stand"');
    expect(ergebnis.veraendert).toBe(true);
    expect(ergebnis.ausgabe).toContain('Neuer Stand');
  });

  it('lehnt -m ohne Nachricht ab, statt etwas zu tun', () => {
    const zustand = fuehreGitBefehlAus(arbeitsbaum(), 'git add preise.md').zustand;
    const vorher = zustand.commits.length;
    const ergebnis = fuehreGitBefehlAus(zustand, 'git commit -m');

    expect(ergebnis.ausgabe).toContain("switch 'm' requires a value");
    expect(ergebnis.zustand.commits.length).toBe(vorher);
  });

  it('schließt den Merge bei -m ohne Nachricht NICHT ab', () => {
    // Zuvor genügte ein nacktes -m, um den Merge abzuschließen.
    let zustand = loeseKonflikt(konfliktStart(), 'k1', { art: 'ihre' });
    zustand = fuehreKonfliktBefehlAus(zustand, 'git add preise.md').zustand;
    const ergebnis = fuehreKonfliktBefehlAus(zustand, 'git commit -m');

    expect(ergebnis.ausgabe).toContain("switch 'm' requires a value");
    expect(ergebnis.zustand.status).toBe('laeuft');
    expect(ergebnis.veraendert).toBe(false);
  });
});

describe('Pfadangaben ergänzen einander', () => {
  it('behält bei git add . die Alles-Bedeutung neben einem weiteren Pfad', () => {
    // `.` ist selbst eine Pfadangabe für alles. Zuvor schaltete jeder
    // danebenstehende Pfad sie ab, und `git add . preise.md` ließ die
    // zweite Änderung ungemerkt liegen.
    const zustand: GitArbeitsbaumZustand = {
      dateien: [
        { pfad: 'preise.md', arbeitsbaum: 'neu', index: 'alt', head: 'alt' },
        { pfad: 'liesmich.md', arbeitsbaum: 'auch neu', index: 'alt', head: 'alt' },
      ],
      commits: [],
    };
    const ergebnis = fuehreGitBefehlAus(zustand, 'git add . preise.md');

    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'preise.md')?.index).toBe('neu');
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'liesmich.md')?.index).toBe('auch neu');
  });
});

describe('git merge mit mehreren Köpfen', () => {
  it('lehnt zwei Branches ab, statt den zweiten fallen zu lassen', () => {
    // Echtes Git führt beide zusammen. Dieses Modell kennt nur zwei Eltern —
    // ein stillschweigend halber Merge wäre die schlechteste Antwort.
    let zustand = fuehreBranchBefehlAus(branches(), 'git switch -c feature').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git commit -m "Feature"').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git switch main').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git switch -c hotfix').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git commit -m "Hotfix"').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git switch main').zustand;

    const ergebnis = fuehreBranchBefehlAus(zustand, 'git merge feature hotfix');

    expect(ergebnis.veraendert).toBe(false);
    expect(ergebnis.ausgabe).toContain('Octopus-Merge');
    expect(ergebnis.zustand.branches['main']).toBe(zustand.branches['main']);
  });

  it('führt einen einzelnen Branch weiterhin zusammen', () => {
    let zustand = fuehreBranchBefehlAus(branches(), 'git switch -c feature').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git commit -m "Feature"').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git switch main').zustand;

    expect(fuehreBranchBefehlAus(zustand, 'git merge feature').veraendert).toBe(true);
  });
});

/**
 * Zwei Funde derselben Art wie zuvor, nur eine Ebene tiefer: Diesmal ging
 * es nicht darum, WELCHE Schalter es gibt, sondern was hinter ihnen steht
 * (Codex-Review auf PR #30).
 */
describe('Schalter, die ihren Wert bei sich tragen', () => {
  it('nimmt den Namen NACH -c, nicht den Operanden davor', () => {
    // `git switch topic -c` legte zuvor "topic" an. Echtes Git verlangt den
    // Namen hinter dem Schalter und legt sonst gar nichts an.
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git switch topic -c');

    expect(ergebnis.ausgabe).toContain("switch 'c' requires a value");
    expect(ergebnis.veraendert).toBe(false);
    expect(ergebnis.zustand.branches['topic']).toBeUndefined();
  });

  it('legt mit -c weiterhin den genannten Branch an', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git switch -c topic');
    expect(ergebnis.veraendert).toBe(true);
    expect(ergebnis.zustand.aktuellerBranch).toBe('topic');
  });

  it('lehnt mehr als einen Branch beim Wechseln ab', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git switch main topic');
    expect(ergebnis.ausgabe).toContain('only one reference expected');
    expect(ergebnis.veraendert).toBe(false);
  });
});

describe('Mehrfaches -m', () => {
  it('behält beide Nachrichten als Absätze', () => {
    // Zuvor überschrieb die zweite die erste. Git fügt sie zusammen.
    const ergebnis = fuehreBranchBefehlAus(
      branches(),
      'git commit -m "Titel" -m "Warum das nötig war"',
    );

    expect(ergebnis.ausgabe).toContain('Titel');
    expect(ergebnis.ausgabe).toContain('Warum das nötig war');
  });

  it('trennt die Absätze im Arbeitsbaum-Simulator durch eine Leerzeile', () => {
    const zustand = fuehreGitBefehlAus(arbeitsbaum(), 'git add preise.md').zustand;
    const ergebnis = fuehreGitBefehlAus(zustand, 'git commit -m "Titel" -m "Details"');
    const commit = ergebnis.zustand.commits[ergebnis.zustand.commits.length - 1];

    expect(commit?.nachricht).toBe('Titel\n\nDetails');
  });
});

/**
 * Nach den Schaltern war das die zweite Stelle, an der still etwas unter den
 * Tisch fiel: Operanden, die ein Unterbefehl gar nicht auswertet. Auch hier
 * gilt die Regel über alle Unterbefehle hinweg, nicht nur an den gemeldeten
 * Stellen (Codex-Review auf PR #30).
 */
describe('Operanden fallen nicht still unter den Tisch', () => {
  it('lehnt einen Commit einzelner Pfade ab, statt alles zu committen', () => {
    // `git commit -m "…" notizen.txt` committet in echtem Git NUR diese
    // Datei. Die Angabe zu ignorieren hätte etwas anderes committet als
    // verlangt — und die vorgemerkte Änderung dabei aufgebraucht.
    const zustand = fuehreGitBefehlAus(arbeitsbaum(), 'git add preise.md').zustand;
    const vorher = zustand.commits.length;
    const ergebnis = fuehreGitBefehlAus(zustand, 'git commit -m "Speichern" liesmich.md');

    expect(ergebnis.ausgabe).toContain('nicht umgesetzt');
    expect(ergebnis.zustand.commits.length).toBe(vorher);
    // Die Vormerkung ist noch da.
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'preise.md')?.index).toBe('neu');
  });

  it('lehnt nicht ausgewertete Operanden in allen betroffenen Unterbefehlen ab', () => {
    for (const befehl of ['git status preise.md', 'git diff preise.md', 'git log preise.md']) {
      const ergebnis = fuehreGitBefehlAus(arbeitsbaum(), befehl);
      expect(ergebnis.ausgabe, befehl).toContain('nicht ausgewertet');
      expect(ergebnis.veraendert, befehl).toBe(false);
    }
  });

  it('lehnt sie auch im Branch- und im Konflikt-Simulator ab', () => {
    expect(fuehreBranchBefehlAus(branches(), 'git log main').ausgabe).toContain(
      'nicht ausgewertet',
    );
    expect(fuehreKonfliktBefehlAus(konfliktStart(), 'git status preise.md').ausgabe).toContain(
      'nicht ausgewertet',
    );
  });
});

describe('git branch mit Startpunkt', () => {
  function mitFeature() {
    let zustand = fuehreBranchBefehlAus(branches(), 'git switch -c feature').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git commit -m "Feature"').zustand;
    return fuehreBranchBefehlAus(zustand, 'git switch main').zustand;
  }

  it('legt den Zeiger am angegebenen Startpunkt an, nicht am aktuellen Stand', () => {
    // Zuvor wurde der zweite Operand verworfen und topic entstand auf main —
    // ausgerechnet hier, wo der Zeiger die ganze Lehre ist.
    const zustand = mitFeature();
    const ergebnis = fuehreBranchBefehlAus(zustand, 'git branch topic feature');

    expect(ergebnis.veraendert).toBe(true);
    expect(ergebnis.zustand.branches['topic']).toBe(zustand.branches['feature']);
    expect(ergebnis.zustand.branches['topic']).not.toBe(zustand.branches['main']);
  });

  it('nimmt auch eine Commit-Kennung als Startpunkt', () => {
    const zustand = mitFeature();
    const ziel = zustand.branches['feature'] as string;
    const ergebnis = fuehreBranchBefehlAus(zustand, `git branch topic ${ziel}`);

    expect(ergebnis.zustand.branches['topic']).toBe(ziel);
  });

  it('lehnt einen unbekannten Startpunkt ab, statt ihn zu übergehen', () => {
    const ergebnis = fuehreBranchBefehlAus(mitFeature(), 'git branch topic gibtsnicht');

    expect(ergebnis.ausgabe).toContain('not a valid object name');
    expect(ergebnis.veraendert).toBe(false);
    expect(ergebnis.zustand.branches['topic']).toBeUndefined();
  });
});

describe('Mehrfaches -c', () => {
  it('nimmt den letzten Namen, wie echtes Git', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git switch -c eins -c zwei');

    expect(ergebnis.zustand.aktuellerBranch).toBe('zwei');
    expect(ergebnis.zustand.branches['eins']).toBeUndefined();
  });
});

/**
 * Muster sind Git-Muster, keine Teilzeichenketten. Ein schlichtes
 * `includes` lag in beide Richtungen falsch: `eat` passte auf `feature`,
 * `feat*` auf nichts (Codex-Review auf PR #30).
 */
describe('Muster beim Auflisten von Branches', () => {
  function mitBranches() {
    let zustand = fuehreBranchBefehlAus(branches(), 'git branch feature').zustand;
    zustand = fuehreBranchBefehlAus(zustand, 'git branch hotfix').zustand;
    return zustand;
  }

  it('passt NICHT auf einen Teil des Namens', () => {
    const ergebnis = fuehreBranchBefehlAus(mitBranches(), 'git branch -l eat');
    expect(ergebnis.ausgabe).toContain('Kein Branch passt');
  });

  it('versteht den Stern als Platzhalter', () => {
    const ergebnis = fuehreBranchBefehlAus(mitBranches(), 'git branch -l "feat*"');
    expect(ergebnis.ausgabe).toContain('feature');
    expect(ergebnis.ausgabe).not.toContain('hotfix');
  });

  it('versteht das Fragezeichen als einzelnes Zeichen', () => {
    const ergebnis = fuehreBranchBefehlAus(mitBranches(), 'git branch -l "mai?"');
    expect(ergebnis.ausgabe).toContain('main');
    expect(ergebnis.ausgabe).not.toContain('feature');
  });

  it('nimmt den vollen Namen weiterhin an', () => {
    const ergebnis = fuehreBranchBefehlAus(mitBranches(), 'git branch -l feature');
    expect(ergebnis.ausgabe).toContain('feature');
    expect(ergebnis.ausgabe).not.toContain('hotfix');
  });

  it('lehnt Zeichenklassen ab, statt sie als Zeichen zu lesen', () => {
    const ergebnis = fuehreBranchBefehlAus(mitBranches(), 'git branch -l "[fh]*"');
    expect(ergebnis.ausgabe).toContain('nicht umgesetzt');
  });
});

describe('git merge --abort mit Operanden', () => {
  it('bricht nichts ab, wenn ein Branchname danebensteht', () => {
    // Zuvor wurden alle Entscheidungen verworfen und Erfolg gemeldet.
    const zustand = loeseKonflikt(konfliktStart(), 'k1', { art: 'ihre' });
    const ergebnis = fuehreKonfliktBefehlAus(zustand, 'git merge --abort feature');

    expect(ergebnis.ausgabe).toContain('--abort expects no arguments');
    expect(ergebnis.veraendert).toBe(false);
    expect(ergebnis.zustand.status).toBe('laeuft');
    expect(ergebnis.zustand.aufloesungen).toEqual(zustand.aufloesungen);
  });
});

describe('git restore mit Punkt', () => {
  function geaendert(): GitArbeitsbaumZustand {
    return {
      dateien: [
        { pfad: 'preise.md', arbeitsbaum: 'neu', index: 'alt', head: 'alt' },
        { pfad: 'liesmich.md', arbeitsbaum: 'auch neu', index: 'auch neu', head: 'alt' },
        { pfad: 'notizen.txt', arbeitsbaum: 'Unversioniert' },
      ],
      commits: [],
    };
  }

  it('verwirft mit . alle Änderungen im Arbeitsverzeichnis', () => {
    // Zuvor galt `.` als unbekannter Dateiname: Der Befehl tat nichts.
    const ergebnis = fuehreGitBefehlAus(geaendert(), 'git restore .');

    expect(ergebnis.veraendert).toBe(true);
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'preise.md')?.arbeitsbaum).toBe('alt');
  });

  it('nimmt mit --staged . alle Vormerkungen zurück', () => {
    const ergebnis = fuehreGitBefehlAus(geaendert(), 'git restore --staged .');

    expect(ergebnis.veraendert).toBe(true);
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'liesmich.md')?.index).toBe('alt');
    // Die Arbeit bleibt erhalten — das ist der ganze Unterschied.
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'liesmich.md')?.arbeitsbaum).toBe(
      'auch neu',
    );
  });

  it('lässt unversionierte Dateien in Ruhe', () => {
    // Sonst wäre `git restore .` ein Löschbefehl.
    const ergebnis = fuehreGitBefehlAus(geaendert(), 'git restore .');
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'notizen.txt')?.arbeitsbaum).toBe(
      'Unversioniert',
    );
  });
});

describe('Branchnamen', () => {
  it('lehnt Namen ab, die echtes Git ablehnt', () => {
    // Zuvor entstanden Branches, auf denen sich wechseln und committen
    // ließ und die es draußen nicht geben kann.
    for (const befehl of [
      'git branch "feature name"',
      'git branch foo..bar',
      'git branch "feat*"',
      'git branch .versteckt',
      'git branch ding.lock',
    ]) {
      const ergebnis = fuehreBranchBefehlAus(branches(), befehl);
      expect(ergebnis.ausgabe, befehl).toContain('not a valid branch name');
      expect(ergebnis.veraendert, befehl).toBe(false);
    }
  });

  it('lehnt sie auch bei git switch -c ab', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git switch -c "feature name"');
    expect(ergebnis.ausgabe).toContain('not a valid branch name');
    expect(ergebnis.zustand.aktuellerBranch).toBe('main');
  });

  it('nimmt übliche Namen weiterhin an', () => {
    for (const name of ['feature/preise', 'fix-42', 'release_2']) {
      const ergebnis = fuehreBranchBefehlAus(branches(), `git branch ${name}`);
      expect(ergebnis.zustand.branches[name], name).toBeDefined();
    }
  });
});

describe('Maskierte Anführungszeichen', () => {
  it('nimmt ein Anführungszeichen in die Nachricht auf', () => {
    expect(zerlegeBefehl('git commit -m "sagt \\"hallo\\""')).toEqual([
      'git',
      'commit',
      '-m',
      'sagt "hallo"',
    ]);
  });

  it('trägt sie bis in den Commit', () => {
    const zustand = fuehreGitBefehlAus(arbeitsbaum(), 'git add preise.md').zustand;
    const ergebnis = fuehreGitBefehlAus(zustand, 'git commit -m "sagt \\"hallo\\""');

    expect(ergebnis.zustand.commits[ergebnis.zustand.commits.length - 1]?.nachricht).toBe(
      'sagt "hallo"',
    );
  });

  it('maskiert in einfachen Anführungszeichen nicht, wie eine echte Shell', () => {
    expect(zerlegeBefehl("git commit -m 'a\\b'")).toEqual(['git', 'commit', '-m', 'a\\b']);
  });
});

/**
 * Drei Rückfälle aus der Runde davor: Jede der drei Behebungen hatte eine
 * Ecke offen gelassen, die dieselbe Art von stillem Danebengehen erlaubte
 * (Codex-Review auf PR #30).
 */
describe('Nachbesserungen', () => {
  it('prüft bei git restore auch die Pfade neben dem Punkt', () => {
    // `.` deckte den Tippfehler zu: Alles wurde zurückgesetzt, Erfolg
    // gemeldet, die falsche Angabe verschwiegen.
    const zustand: GitArbeitsbaumZustand = {
      dateien: [
        { pfad: 'preise.md', arbeitsbaum: 'neu', index: 'alt', head: 'alt' },
        { pfad: 'notizen.txt', arbeitsbaum: 'Unversioniert' },
      ],
      commits: [],
    };
    const ergebnis = fuehreGitBefehlAus(zustand, 'git restore . notizen.txt');

    expect(ergebnis.ausgabe).toContain("pathspec 'notizen.txt' did not match");
    expect(ergebnis.veraendert).toBe(false);
    // Nichts wurde zurückgesetzt.
    expect(ergebnis.zustand.dateien.find((d) => d.pfad === 'preise.md')?.arbeitsbaum).toBe('neu');
  });

  it('prüft jeden Bestandteil eines Branchnamens, nicht nur den ganzen', () => {
    for (const befehl of [
      'git branch feature/.preise',
      'git branch feature.lock/preise',
      'git switch -c feature/.preise',
      'git branch feature/preise.',
      'git branch feature//preise',
    ]) {
      const ergebnis = fuehreBranchBefehlAus(branches(), befehl);
      expect(ergebnis.ausgabe, befehl).toContain('not a valid branch name');
      expect(ergebnis.veraendert, befehl).toBe(false);
    }
  });

  it('nimmt einen üblichen Namen mit Schrägstrich weiterhin an', () => {
    const ergebnis = fuehreBranchBefehlAus(branches(), 'git branch feature/preise');
    expect(ergebnis.zustand.branches['feature/preise']).toBeDefined();
  });

  it('behält einen gewöhnlichen Rückstrich in doppelten Anführungszeichen', () => {
    // In einer Shell ist der Rückstrich dort nur vor " $ ` \ besonders.
    // `C:\temp` als `C:temp` zu speichern wäre eine andere Nachricht.
    expect(zerlegeBefehl('git commit -m "C:\\temp"')).toEqual(['git', 'commit', '-m', 'C:\\temp']);
  });

  it('maskiert dort weiterhin das Anführungszeichen selbst', () => {
    expect(zerlegeBefehl('git commit -m "sagt \\"hallo\\""')).toEqual([
      'git',
      'commit',
      '-m',
      'sagt "hallo"',
    ]);
  });

  it('maskiert außerhalb von Anführungszeichen jedes Zeichen', () => {
    expect(zerlegeBefehl('git add mein\\ ordner')).toEqual(['git', 'add', 'mein ordner']);
  });
});
