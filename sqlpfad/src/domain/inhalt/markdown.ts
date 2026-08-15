/**
 * Ein sehr kleiner Markdown-Leser.
 *
 * Er beherrscht genau das, was in den Lektionstexten vorkommt: Absätze,
 * **fett**, `Quelltext`, Codeblöcke mit ```, Aufzählungen und Tabellen. Mehr
 * nicht – und das ist Absicht in zwei Richtungen.
 *
 * **Warum keine Bibliothek:** Eine vollständige Markdown-Bibliothek erzeugt
 * HTML, und HTML aus einer Zeichenfolge landet über `dangerouslySetInnerHTML`
 * im Baum. Damit hinge die Sicherheit der Anwendung daran, dass der Inhalt
 * niemals fremd ist. Heute stimmt das; es bleibt eine Annahme, die niemand
 * mehr prüft, sobald jemand Inhalte über den Adminbereich pflegt.
 *
 * **Was dieser Leser stattdessen tut:** Er liefert eine Struktur, aus der die
 * Komponente React-Elemente baut. Es gibt keinen Weg, über den Inhalt Markup
 * einzuschleusen – ein `<script>` im Text wird zu Text, weil er nirgends als
 * HTML gedeutet wird.
 *
 * Was er nicht kann, steht in `NICHT_UNTERSTUETZT` und wird vom
 * Inhaltsvalidator gemeldet, statt still falsch dargestellt zu werden.
 */

export type Textteil =
  | { art: 'text'; text: string }
  | { art: 'fett'; text: string }
  | { art: 'kursiv'; text: string }
  | { art: 'code'; text: string };

export type Block =
  | { art: 'absatz'; teile: Textteil[] }
  | { art: 'code'; sprache: string; text: string }
  | { art: 'liste'; punkte: Textteil[][] }
  | { art: 'tabelle'; kopf: Textteil[][]; zeilen: Textteil[][][] };

/** Auszeichnungen, die dieser Leser bewusst nicht kennt. */
export const NICHT_UNTERSTUETZT = [
  { muster: /^#{1,6}\s/m, name: 'Überschriften' },
  { muster: /!\[[^\]]*\]\(/, name: 'Bilder' },
  { muster: /(?<!!)\[[^\]]+\]\([^)]+\)/, name: 'Verweise' },
  { muster: /^>\s/m, name: 'Zitate' },
] as const;

/** Zerlegt eine Zeile in Text, Fettes, Kursives und Quelltext. */
export function leseZeile(zeile: string): Textteil[] {
  const teile: Textteil[] = [];
  /*
   * Ein Durchgang für alle Auszeichnungen. Zwei Dinge hängen an dieser einen
   * Zeile:
   *
   * Die Reihenfolge der Alternativen. `**fett**` steht vor `*kursiv*`, sonst
   * läse der Ausdruck zwei Sternchen als leeres Kursives.
   *
   * Der gemeinsame Durchgang. Wer erst fett und dann Code ersetzt, greift in
   * `SELECT * FROM Kunden` hinein - und in SQL steht der Stern ständig.
   */
  const muster = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*`]+)\*)/g;
  let zuletzt = 0;

  for (const treffer of zeile.matchAll(muster)) {
    const start = treffer.index;
    if (start > zuletzt) teile.push({ art: 'text', text: zeile.slice(zuletzt, start) });

    if (treffer[2] !== undefined) teile.push({ art: 'fett', text: treffer[2] });
    else if (treffer[4] !== undefined) teile.push({ art: 'code', text: treffer[4] });
    else if (treffer[6] !== undefined) teile.push({ art: 'kursiv', text: treffer[6] });

    zuletzt = start + treffer[0].length;
  }

  if (zuletzt < zeile.length) teile.push({ art: 'text', text: zeile.slice(zuletzt) });
  return teile;
}

function zelleAufteilen(zeile: string): Textteil[][] {
  return zeile
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((zelle) => leseZeile(zelle.trim()));
}

export function leseMarkdown(text: string): Block[] {
  const blöcke: Block[] = [];
  const zeilen = text.replaceAll('\r\n', '\n').split('\n');
  let i = 0;

  while (i < zeilen.length) {
    const zeile = zeilen[i] ?? '';

    // --- Codeblock --------------------------------------------------------
    if (zeile.startsWith('```')) {
      const sprache = zeile.slice(3).trim();
      const inhalt: string[] = [];
      i += 1;
      while (i < zeilen.length && !(zeilen[i] ?? '').startsWith('```')) {
        inhalt.push(zeilen[i] ?? '');
        i += 1;
      }
      i += 1; // schließende Zeile
      blöcke.push({ art: 'code', sprache, text: inhalt.join('\n') });
      continue;
    }

    // --- Tabelle ----------------------------------------------------------
    if (zeile.trim().startsWith('|') && (zeilen[i + 1] ?? '').includes('---')) {
      const kopf = zelleAufteilen(zeile.trim());
      i += 2; // Kopf und Trennzeile
      const zeilenInhalt: Textteil[][][] = [];
      while (i < zeilen.length && (zeilen[i] ?? '').trim().startsWith('|')) {
        zeilenInhalt.push(zelleAufteilen((zeilen[i] ?? '').trim()));
        i += 1;
      }
      blöcke.push({ art: 'tabelle', kopf, zeilen: zeilenInhalt });
      continue;
    }

    // --- Aufzählung -------------------------------------------------------
    if (/^\s*-\s/.test(zeile)) {
      const punkte: Textteil[][] = [];
      while (i < zeilen.length && /^\s*-\s/.test(zeilen[i] ?? '')) {
        let punkt = (zeilen[i] ?? '').replace(/^\s*-\s/, '');
        // Fortsetzungszeilen gehören zum selben Punkt.
        while (i + 1 < zeilen.length && /^\s{2,}\S/.test(zeilen[i + 1] ?? '')) {
          i += 1;
          punkt += ` ${(zeilen[i] ?? '').trim()}`;
        }
        punkte.push(leseZeile(punkt));
        i += 1;
      }
      blöcke.push({ art: 'liste', punkte });
      continue;
    }

    // --- Absatz -----------------------------------------------------------
    if (zeile.trim() === '') {
      i += 1;
      continue;
    }

    const absatz: string[] = [];
    while (i < zeilen.length && (zeilen[i] ?? '').trim() !== '') {
      const laufend = zeilen[i] ?? '';
      // Ein Absatz endet, wo ein anderer Block beginnt.
      if (laufend.startsWith('```') || /^\s*-\s/.test(laufend) || laufend.trim().startsWith('|')) {
        break;
      }
      absatz.push(laufend.trim());
      i += 1;
    }
    if (absatz.length > 0) blöcke.push({ art: 'absatz', teile: leseZeile(absatz.join(' ')) });
  }

  return blöcke;
}
