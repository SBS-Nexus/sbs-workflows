/**
 * Schalterprüfung für die Git-Simulatoren.
 *
 * Der wiederkehrende Fehler in diesen Simulatoren war immer derselbe: Ein
 * nicht umgesetzter Schalter wurde übergangen, und der Befehl tat danach
 * etwas anderes als verlangt — `git branch -d topic` legte einen Branch AN,
 * `git restore -S datei` verwarf die Arbeit statt die Vormerkung
 * zurückzunehmen. Das ist in einer Lernumgebung schlimmer als eine
 * Fehlermeldung: Es bringt still etwas Falsches bei.
 *
 * Deshalb hier eine gemeinsame Regel statt Einzelfallprüfungen: Jeder Befehl
 * nennt ausdrücklich, welche Schalter er versteht. Alles andere wird
 * abgelehnt. Neue Schalter müssen bewusst aufgenommen werden — vergessen
 * heißt jetzt "wird abgelehnt", nicht "tut heimlich etwas anderes".
 */

/** Ein Schalter mit seinen Schreibweisen, z. B. `-S` und `--staged`. */
export interface SchalterDefinition {
  /** Alle akzeptierten Schreibweisen. */
  schreibweisen: string[];
  /** Einheitlicher Name, unter dem der Befehl ihn abfragt. */
  name: string;
  /**
   * Ob auf den Schalter ein Wert folgen muss, wie bei `-m "Nachricht"`.
   *
   * Ohne diese Angabe kannte der Vertrag nur die Namen der Schalter. Die
   * Nachricht wurde deshalb nebenher mit einem eigenen regulären Ausdruck
   * aus der Eingabe gefischt — der kannte `-m`, aber nicht `--message`, und
   * er bemerkte auch nicht, wenn gar kein Wert dastand. Beides ist an
   * derselben Stelle behoben, an der auch die Schalternamen stehen.
   */
  brauchtWert?: boolean;
}

export interface SchalterErgebnis {
  /** Die erkannten Schalter unter ihrem einheitlichen Namen. */
  gesetzt: Set<string>;
  /**
   * Die Werte der Schalter, die einen tragen, unter demselben Namen.
   *
   * Eine Liste, weil ein Schalter mehrfach stehen darf: `git commit -m
   * "Titel" -m "Details"` ergibt in echtem Git zwei Absätze. Nur den
   * letzten zu behalten hätte den ersten stillschweigend verschluckt.
   */
  werte: Map<string, string[]>;
  /** Alles, was kein Schalter ist — Pfade, Branchnamen, Nachrichten. */
  operanden: string[];
  /** Der erste nicht unterstützte Schalter, falls vorhanden. */
  unbekannt?: string;
  /** Der erste Schalter, dem sein Wert fehlt, falls vorhanden. */
  ohneWert?: string;
}

/**
 * Trennt Schalter von Operanden und meldet den ersten unbekannten Schalter.
 *
 * `--` beendet die Schalterliste, wie in echten Befehlen: Alles danach gilt
 * als Operand, auch wenn es mit einem Bindestrich beginnt.
 */
export function leseSchalter(
  args: readonly string[],
  erlaubt: readonly SchalterDefinition[],
): SchalterErgebnis {
  const gesetzt = new Set<string>();
  const werte = new Map<string, string[]>();
  const operanden: string[] = [];
  let nurNochOperanden = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] as string;

    if (nurNochOperanden) {
      operanden.push(arg);
      continue;
    }
    if (arg === '--') {
      nurNochOperanden = true;
      continue;
    }
    if (!arg.startsWith('-')) {
      operanden.push(arg);
      continue;
    }

    const treffer = erlaubt.find((s) => s.schreibweisen.includes(arg));
    if (!treffer) return { gesetzt, werte, operanden, unbekannt: arg };
    gesetzt.add(treffer.name);

    if (treffer.brauchtWert) {
      // Der nächste Bestandteil ist der Wert — auch dann, wenn er mit einem
      // Bindestrich beginnt: `git commit -m -x` meint in echtem Git die
      // Nachricht "-x", nicht den Schalter `-x`.
      const wert = args[i + 1];
      if (wert === undefined) return { gesetzt, werte, operanden, ohneWert: arg };
      werte.set(treffer.name, [...(werte.get(treffer.name) ?? []), wert]);
      i += 1;
    }
  }

  return { gesetzt, werte, operanden };
}

/**
 * Zerlegt eine Befehlszeile in ihre Bestandteile und beachtet dabei
 * Anführungszeichen.
 *
 * Ein einfaches Trennen an Leerzeichen zerrisse `git commit -m "Zwei Wörter"`
 * — deshalb las die Nachricht zuvor ein eigener regulärer Ausdruck aus der
 * rohen Eingabe, an der Schalterprüfung vorbei. Mit einer gemeinsamen
 * Zerlegung erübrigt sich das: Was der Vertrag sieht, ist auch das, was
 * dasteht.
 */
export function zerlegeBefehl(eingabe: string): string[] {
  const teile: string[] = [];
  let aktuell = '';
  let offen = false;
  let anfuehrung: '"' | "'" | null = null;

  for (const zeichen of eingabe.trim()) {
    if (anfuehrung) {
      if (zeichen === anfuehrung) anfuehrung = null;
      else aktuell += zeichen;
      continue;
    }
    if (zeichen === '"' || zeichen === "'") {
      anfuehrung = zeichen;
      // Auch `-m ""` ist ein Bestandteil — ein leerer, den der Befehl
      // dann als fehlende Nachricht ablehnen darf.
      offen = true;
      continue;
    }
    if (/\s/.test(zeichen)) {
      if (aktuell.length > 0 || offen) teile.push(aktuell);
      aktuell = '';
      offen = false;
      continue;
    }
    aktuell += zeichen;
  }
  if (aktuell.length > 0 || offen) teile.push(aktuell);

  return teile;
}

/** Einheitliche Meldung für einen Schalter, den ein Simulator nicht umsetzt. */
export function schalterNichtUmgesetzt(befehl: string, schalter: string): string {
  return `${befehl} ${schalter}: in diesem Simulator nicht umgesetzt. Der Schalter wird bewusst abgelehnt, statt still etwas anderes zu tun.`;
}

/** Einheitliche Meldung für einen Schalter, dem sein Wert fehlt. */
export function schalterOhneWert(schalter: string): string {
  return `error: switch '${schalter.replace(/^-+/, '')}' requires a value`;
}

/**
 * Fügt mehrfach angegebene Nachrichten so zusammen, wie Git es tut: als
 * Absätze, durch eine Leerzeile getrennt.
 */
export function fuegeAbsaetzeZusammen(werte: readonly string[] | undefined): string {
  return (werte ?? [])
    .map((wert) => wert.trim())
    .filter((wert) => wert.length > 0)
    .join('\n\n');
}

/**
 * Meldung für Operanden, die ein Unterbefehl nicht auswertet.
 *
 * Nach den Schaltern war das die zweite Stelle, an der still etwas unter den
 * Tisch fiel: `git commit -m "…" datei.md`, `git branch topic feature`,
 * `git switch main topic` — jeweils wurde ein Teil der Eingabe ignoriert und
 * trotzdem Erfolg gemeldet. Wer eine Angabe macht, soll sie wirken sehen oder
 * erfahren, dass sie hier nichts bewirkt (Codex-Review auf PR #30).
 */
export function operandenNichtUmgesetzt(befehl: string, operanden: readonly string[]): string {
  return `${befehl}: "${operanden.join(' ')}" wird hier nicht ausgewertet. Dieser Simulator kennt die Form ohne zusätzliche Angaben.`;
}
