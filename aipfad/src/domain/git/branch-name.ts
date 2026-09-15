import { z } from 'zod';

/**
 * Was ein gültiger Branchname ist — an einer Stelle, für alle Aufrufer.
 *
 * Diese Regeln standen zuvor nur im Branch-Simulator. Die Konfiguration des
 * Merge-Labs hatte deshalb ihren eigenen, viel laxeren Begriff von
 * "Branchname" (`z.string()`), und `ihrBranch: 'feature prices'` kam durch.
 * Der Neustartknopf baute daraus `git merge feature prices` — zwei
 * Merge-Köpfe. Der Simulator wies also den Befehl seiner eigenen Maske
 * zurück, und das Lab blieb in "abgebrochen" hängen
 * (Codex-Review auf PR #30).
 *
 * Ein Branchname mit Leerzeichen ist nicht bloß für den Knopf unbequem,
 * sondern in Git schlicht keiner. Die Antwort ist deshalb ein gemeinsamer
 * Vertrag und kein zweites Maskieren im Knopf: Dieser Simulator ist keine
 * Shell.
 */

/**
 * Prüft einen Branchnamen nach den Regeln von `git check-ref-format`.
 *
 * Ohne diese Prüfung entstanden Branches, die echtes Git ablehnt — mit
 * Leerzeichen, mit `..`, mit einem Stern. Danach ließ sich auf ihnen
 * wechseln und committen, und wer das im Lab lernt, lernt etwas, das
 * draußen scheitert (Codex-Review auf PR #30).
 *
 * Umgesetzt sind die Regeln, die hier auffallen können; die vollständige
 * Liste ist länger und für ein Lab ohne Belang.
 */
export function branchnameFehler(name: string): string | null {
  const verboten = /[\s~^:?*[\\]/;
  const bestandteile = name.split('/');

  const ungueltig =
    name.length === 0 ||
    // Zwei Regeln gelten für den GANZEN Namen und ausdrücklich nicht je
    // Bestandteil — sie stammen aus der Kurzform, mit der man einen Branch
    // benennt, nicht aus der Prüfung einer vollständigen Ref:
    //
    //   `-topic`  abgelehnt, `feature/-topic` angelegt
    //   `HEAD`    abgelehnt, `feature/HEAD` und `HEAD/x` angelegt
    //
    // `refs/heads/HEAD` besteht `git check-ref-format` sogar; verboten ist
    // allein die Kurzform, weil `HEAD` dort schon den aktuellen Commit
    // meint. Beide je Bestandteil zu ziehen wäre die Übertreibung der
    // Lehre aus den Runden davor (Codex-Review auf PR #30).
    name.startsWith('-') ||
    name === 'HEAD' ||
    verboten.test(name) ||
    name.includes('..') ||
    name.includes('@{') ||
    name.endsWith('.lock') ||
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u001f\u007f]/.test(name) ||
    // Die Regeln zu Punkt und `.lock` gelten für JEDEN durch Schrägstrich
    // getrennten Bestandteil, nicht nur für den ganzen Namen: `feature/.preise`
    // und `feature.lock/preise` lehnt echtes Git ebenso ab
    // (Codex-Review auf PR #30). Ein leerer Bestandteil deckt zugleich
    // führende, abschließende und doppelte Schrägstriche ab.
    bestandteile.some(
      (teil) =>
        teil.length === 0 || teil.startsWith('.') || teil.endsWith('.') || teil.endsWith('.lock'),
    );

  return ungueltig
    ? `fatal: '${name}' is not a valid branch name. Erlaubt sind keine Leerzeichen und keine der Zeichen ~ ^ : ? * [ \\ sowie kein ".." im Namen; kein Namensteil darf mit einem Punkt beginnen oder enden oder auf ".lock" enden; der Name selbst darf nicht mit einem Bindestrich beginnen und nicht "HEAD" lauten.`
    : null;
}

/**
 * Derselbe Vertrag für redaktionelle Inhalte, die einen Branchnamen nennen.
 *
 * Die Meldung ist bewusst dieselbe wie im Simulator: Was das Lab beim
 * Anlegen eines Branches ablehnt, darf in seiner Konfiguration nicht als
 * gegeben dastehen.
 */
export const branchnameSchema = z.string().superRefine((name, ctx) => {
  const fehler = branchnameFehler(name);
  if (fehler) ctx.addIssue({ code: 'custom', message: fehler });
});
