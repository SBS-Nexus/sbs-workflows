import {
  kosinusRechnung,
  pruefeVektor,
  vektornorm,
  VektorFehler,
  type KosinusRechnung,
} from './vektor';

/**
 * Ranking, Top-k-Auswahl und einfache Gütemaße für semantisches Retrieval.
 *
 * Alles deterministisch: dieselben Eingaben ergeben immer dieselbe
 * Reihenfolge, auch bei Gleichstand. Keine Funktion verändert ihre Eingaben.
 */

export interface RetrievalDokument {
  id: string;
  vektor: readonly number[];
}

export interface RanglistenEintrag {
  /** 1-basiert. */
  platz: number;
  id: string;
  score: number;
  rechnung: KosinusRechnung;
}

export interface AusgeschlossenesDokument {
  id: string;
  grund: 'NULLVEKTOR';
  meldung: string;
}

export interface Rangliste {
  eintraege: RanglistenEintrag[];
  /**
   * Dokumente, für die keine Ähnlichkeit definiert ist. Sie erscheinen NICHT
   * mit einem erfundenen Score von 0 in der Liste, sondern ausdrücklich hier.
   */
  ausgeschlossen: AusgeschlossenesDokument[];
}

/**
 * Auflösung, auf die Scores für den Gleichstandsvergleich gerundet werden.
 *
 * Gleitkomma-Rechnung liefert für mathematisch gleiche Kosinuswerte manchmal
 * Werte, die sich in der 16. Stelle unterscheiden. Ohne Rundung entschiede
 * dieses Rauschen über die Reihenfolge. Gerundet wird NUR für den Vergleich;
 * der ausgegebene Score bleibt ungerundet.
 */
export const GLEICHSTAND_AUFLOESUNG = 1e-9;

function vergleichsSchluessel(score: number): number {
  return Math.round(score / GLEICHSTAND_AUFLOESUNG);
}

/**
 * Feste Tie-Break-Regel: höherer Score zuerst; bei Gleichstand entscheidet
 * die Dokumentkennung in aufsteigender Codepunkt-Reihenfolge. Bewusst nicht
 * `localeCompare`, dessen Ergebnis von der Laufzeitumgebung abhängt.
 */
export function vergleicheTreffer(
  a: { id: string; score: number },
  b: { id: string; score: number },
): number {
  const differenz = vergleichsSchluessel(b.score) - vergleichsSchluessel(a.score);
  if (differenz !== 0) return differenz;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

/**
 * Bewertet alle Dokumente gegen die Anfrage und sortiert sie.
 *
 * Wirft bei ungültiger Anfrage (auch Nullvektor), bei ungültigen
 * Dokumentvektoren, unterschiedlichen Dimensionen und doppelten Kennungen —
 * das sind Fehler der Eingabe, keine Eigenschaften der Daten. Ein
 * Dokument-Nullvektor dagegen ist ein gültiger, nur nicht vergleichbarer
 * Datensatz und wird ausdrücklich ausgewiesen.
 */
export function rangliste(anfrage: unknown, dokumente: readonly RetrievalDokument[]): Rangliste {
  pruefeVektor(anfrage, 'Anfragevektor');
  if (vektornorm(anfrage) === 0) {
    throw new VektorFehler(
      'NULLVEKTOR',
      'Der Anfragevektor ist ein Nullvektor — ohne Richtung lässt sich nichts ranken.',
    );
  }
  if (!Array.isArray(dokumente)) {
    throw new VektorFehler('KEIN_ARRAY', 'Die Dokumentliste ist keine Liste.');
  }

  const gesehen = new Set<string>();
  const bewertet: Omit<RanglistenEintrag, 'platz'>[] = [];
  const ausgeschlossen: AusgeschlossenesDokument[] = [];

  for (const dokument of dokumente) {
    if (gesehen.has(dokument.id)) {
      throw new Error(`Doppelte Dokumentkennung "${dokument.id}".`);
    }
    gesehen.add(dokument.id);

    const name = `Dokument "${dokument.id}"`;
    pruefeVektor(dokument.vektor, name);
    if (dokument.vektor.length !== anfrage.length) {
      throw new VektorFehler(
        'DIMENSION',
        `${name} hat ${dokument.vektor.length} Dimensionen, der Anfragevektor hat ${anfrage.length}.`,
      );
    }
    // Nur der Dokument-Nullvektor ist ein Datenzustand. Eine Null-Anfrage
    // bleibt ein Fehler (oben geprüft), alles andere ebenso.
    if (vektornorm(dokument.vektor) === 0) {
      ausgeschlossen.push({
        id: dokument.id,
        grund: 'NULLVEKTOR',
        meldung: `${name} ist ein Nullvektor und hat keine Richtung.`,
      });
      continue;
    }
    const rechnung = kosinusRechnung(anfrage, dokument.vektor, { a: 'Anfragevektor', b: name });
    bewertet.push({ id: dokument.id, score: rechnung.kosinus, rechnung });
  }

  const sortiert = [...bewertet].sort(vergleicheTreffer);
  return {
    eintraege: sortiert.map((eintrag, index) => ({ ...eintrag, platz: index + 1 })),
    ausgeschlossen: [...ausgeschlossen].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
}

export interface TopK<T> {
  treffer: T[];
  /** Was angefordert wurde. */
  angefordert: number;
  /** Wie viele Kandidaten es überhaupt gab. */
  verfuegbar: number;
}

/**
 * Die ersten k Einträge einer bereits sortierten Liste.
 *
 * k muss eine ganze Zahl ≥ 1 sein. Gibt es weniger Kandidaten als k, kommen
 * alle zurück — und `angefordert` > `treffer.length` macht das sichtbar,
 * statt es zu verschweigen.
 */
export function topK<T>(sortiert: readonly T[], k: number): TopK<T> {
  if (!Number.isInteger(k) || k < 1) {
    throw new RangeError(`k muss eine ganze Zahl ≥ 1 sein, war ${String(k)}.`);
  }
  return { treffer: sortiert.slice(0, k), angefordert: k, verfuegbar: sortiert.length };
}

/**
 * Teilt Treffer an einer Mindestähnlichkeit. Eine leere `ueber`-Liste heißt
 * ausdrücklich "kein ausreichend ähnlicher Treffer" — der beste Kandidat wird
 * dann nicht trotzdem als Antwort ausgegeben.
 */
export function anSchwelleTeilen<T extends { score: number }>(
  treffer: readonly T[],
  schwelle: number,
): { ueber: T[]; unter: T[] } {
  if (!Number.isFinite(schwelle) || schwelle < -1 || schwelle > 1) {
    throw new RangeError(`Die Schwelle muss in [−1, 1] liegen, war ${String(schwelle)}.`);
  }
  return {
    ueber: treffer.filter((t) => t.score >= schwelle),
    unter: treffer.filter((t) => t.score < schwelle),
  };
}

export interface Guete {
  /** Relevante unter den gelieferten Treffern. */
  relevantGefunden: number;
  geliefert: number;
  relevantGesamt: number;
  /** relevantGefunden / geliefert — `null`, wenn nichts geliefert wurde. */
  precision: number | null;
  /** relevantGefunden / relevantGesamt — `null`, wenn es nichts Relevantes gibt. */
  recall: number | null;
}

/**
 * Precision und Recall für eine Trefferliste.
 *
 * Wo ein Maß nicht definiert ist (0/0), steht `null` statt einer erfundenen
 * 0 oder 1: "nichts geliefert" ist weder perfekt präzise noch völlig daneben.
 */
export function precisionUndRecall(
  gelieferteIds: readonly string[],
  relevanteIds: readonly string[],
): Guete {
  const geliefert = new Set(gelieferteIds);
  const relevant = new Set(relevanteIds);
  if (geliefert.size !== gelieferteIds.length) {
    throw new Error('Die Trefferliste enthält eine Kennung doppelt.');
  }
  const relevantGefunden = [...geliefert].filter((id) => relevant.has(id)).length;
  return {
    relevantGefunden,
    geliefert: geliefert.size,
    relevantGesamt: relevant.size,
    precision: geliefert.size === 0 ? null : relevantGefunden / geliefert.size,
    recall: relevant.size === 0 ? null : relevantGefunden / relevant.size,
  };
}

/**
 * Häufige Funktionswörter ab vier Buchstaben. Sie tragen keine Bedeutung für
 * die Suche und würden sonst Scheintreffer erzeugen ("eine" in Anfrage und
 * Dokument). Bewusst kurz gehalten: Es geht um das Prinzip, nicht um eine
 * vollständige Stoppwortliste.
 */
const STOPPWOERTER = new Set([
  'aber',
  'dein',
  'deine',
  'deinem',
  'deinen',
  'deiner',
  'dich',
  'eine',
  'einem',
  'einen',
  'einer',
  'eines',
  'nach',
  'nicht',
  'oder',
  'sich',
  'sind',
  'über',
  'unser',
  'unsere',
  'unseren',
  'unserer',
  'wann',
  'wird',
]);

/**
 * Wörter für einen sehr einfachen Schlüsselwortvergleich: klein geschrieben,
 * an allem getrennt, was kein Buchstabe und keine Ziffer ist, nur Wörter ab
 * `mindestLaenge` Zeichen und ohne häufige Funktionswörter — kurze Füllwörter
 * wie "ich" oder "was" sollen keinen Treffer erzeugen.
 */
export function woerter(text: string, mindestLaenge = 4): string[] {
  const einzeln = text
    .toLocaleLowerCase('de-DE')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((wort) => wort.length >= mindestLaenge && !STOPPWOERTER.has(wort));
  return [...new Set(einzeln)].sort();
}

/**
 * Gemeinsame Wörter zweier Texte — das, was eine reine Schlüsselwortsuche
 * sieht. Exakte Wortgleichheit, keine Wortstämme: "Urlaub" und "Urlaubstag"
 * sind hier verschiedene Wörter. Genau diese Grenze zeigt das Lab.
 */
export function gemeinsameWoerter(anfrage: string, dokument: string): string[] {
  const imDokument = new Set(woerter(dokument));
  return woerter(anfrage).filter((wort) => imDokument.has(wort));
}
