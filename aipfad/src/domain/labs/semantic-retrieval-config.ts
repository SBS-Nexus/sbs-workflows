import { z } from 'zod';
import { anSchwelleTeilen, rangliste } from '@/domain/retrieval/ranking';

/**
 * Kanonischer Vertrag für das Lab "Semantische Suche verstehen".
 *
 * Die Vektoren sind redaktionell festgelegt. Damit das nirgends als
 * Modellausgabe missverstanden werden kann, verlangt der Vertrag die
 * ausdrückliche Herkunftsangabe `vektorHerkunft: 'didaktisch'` und eine
 * benannte Bedeutung je Dimension — echte Embedding-Dimensionen haben keine
 * solchen Namen.
 *
 * Die Beziehungen, die ein reines Formschema nicht abdeckt, prüft
 * `superRefine` mit denselben Domainfunktionen, die das Lab zum Rechnen
 * benutzt: Eine Konfiguration, die im Build gültig ist, rechnet im Browser
 * genauso.
 */

const kennung = z.string().regex(/^[a-z0-9-]+$/, 'Kennung: Kleinbuchstaben, Ziffern, Bindestriche');

/** z.number() lehnt in Zod 4 NaN und ±Infinity bereits ab. */
const komponente = z.number();

const dokumentSchema = z.object({
  id: kennung,
  titel: z.string().min(3),
  /** Der Quelltext, der als Treffer angezeigt wird. */
  text: z.string().min(20),
  /** Woher der Text stammt, z. B. "Personalhandbuch, Abschnitt Urlaub". */
  quelle: z.string().min(3),
  vektor: z.array(komponente).min(2),
});

const anfrageSchema = z.object({
  id: kennung,
  text: z.string().min(10),
  vektor: z.array(komponente).min(2),
  /** Fachliches Urteil: Welche Dokumente beantworten die Anfrage wirklich? */
  relevanteDokumentIds: z.array(kennung),
  /** Ein Dokument, das mathematisch nah liegt, fachlich aber nicht passt. */
  irrefuehrend: z
    .object({
      dokumentId: kennung,
      erklaerung: z.string().min(40),
    })
    .optional(),
  /** Was diese Anfrage im Lab zeigen soll. */
  lernpunkt: z.string().min(20),
});

const entscheidungSchema = z.object({
  id: kennung,
  /** Bei welcher Anfrage die Entscheidung fällt. */
  anfrageId: kennung,
  frage: z.string().min(20),
  optionen: z
    .array(
      z.object({
        id: kennung,
        text: z.string().min(5),
        korrekt: z.boolean(),
        feedback: z.string().min(20),
      }),
    )
    .min(2),
});

export const semanticRetrievalConfigSchema = z
  .object({
    vektorHerkunft: z.literal('didaktisch'),
    dimensionen: z
      .array(z.object({ id: kennung, bezeichnung: z.string().min(2) }))
      .min(2)
      .max(8),
    dokumente: z.array(dokumentSchema).min(3),
    anfragen: z.array(anfrageSchema).min(2),
    topK: z.object({
      min: z.literal(1),
      max: z.number().int().min(2).max(10),
      start: z.number().int().min(1),
    }),
    /** Mindestähnlichkeit, ab der ein Treffer als Antwortkandidat gilt. */
    schwelle: z.number().gt(-1).lt(1),
    entscheidungen: z.array(entscheidungSchema).min(1),
  })
  .superRefine((config, ctx) => {
    const dimension = config.dimensionen.length;
    const melde = (path: (string | number)[], message: string): void => {
      ctx.addIssue({ code: 'custom', path, message });
    };

    pruefeEindeutig(
      config.dimensionen.map((d) => d.id),
      ['dimensionen'],
      'Dimension',
      melde,
    );
    pruefeEindeutig(
      config.dokumente.map((d) => d.id),
      ['dokumente'],
      'Dokument',
      melde,
    );
    pruefeEindeutig(
      config.anfragen.map((a) => a.id),
      ['anfragen'],
      'Anfrage',
      melde,
    );
    pruefeEindeutig(
      config.entscheidungen.map((e) => e.id),
      ['entscheidungen'],
      'Entscheidung',
      melde,
    );

    if (config.topK.start > config.topK.max) {
      melde(['topK', 'start'], `topK.start (${config.topK.start}) liegt über topK.max.`);
    }

    // Doppelte Dokumentkennungen sind oben gemeldet; `rangliste()` würde an
    // ihnen werfen, deshalb wird dann nicht weitergerechnet.
    let vektorenGueltig =
      new Set(config.dokumente.map((d) => d.id)).size === config.dokumente.length;
    for (const [i, dokument] of config.dokumente.entries()) {
      if (dokument.vektor.length !== dimension) {
        vektorenGueltig = false;
        melde(
          ['dokumente', i, 'vektor'],
          `Dokument "${dokument.id}" hat ${dokument.vektor.length} statt ${dimension} Dimensionen.`,
        );
      } else if (istNullvektor(dokument.vektor)) {
        // Gültig in der Domain (wird dort ausdrücklich ausgeschlossen), im
        // Lab aber ohne Lernwert: Es wäre ein Dokument, das nie erscheint.
        vektorenGueltig = false;
        melde(['dokumente', i, 'vektor'], `Dokument "${dokument.id}" ist ein Nullvektor.`);
      }
    }

    const dokumentIds = new Set(config.dokumente.map((d) => d.id));
    for (const [i, anfrage] of config.anfragen.entries()) {
      if (anfrage.vektor.length !== dimension) {
        vektorenGueltig = false;
        melde(
          ['anfragen', i, 'vektor'],
          `Anfrage "${anfrage.id}" hat ${anfrage.vektor.length} statt ${dimension} Dimensionen.`,
        );
      } else if (istNullvektor(anfrage.vektor)) {
        vektorenGueltig = false;
        melde(['anfragen', i, 'vektor'], `Anfrage "${anfrage.id}" ist ein Nullvektor.`);
      }
      for (const id of anfrage.relevanteDokumentIds) {
        if (!dokumentIds.has(id)) {
          melde(['anfragen', i, 'relevanteDokumentIds'], `Unbekanntes Dokument "${id}".`);
        }
      }
      if (anfrage.irrefuehrend) {
        const { dokumentId } = anfrage.irrefuehrend;
        if (!dokumentIds.has(dokumentId)) {
          melde(
            ['anfragen', i, 'irrefuehrend', 'dokumentId'],
            `Unbekanntes Dokument "${dokumentId}".`,
          );
        }
        if (anfrage.relevanteDokumentIds.includes(dokumentId)) {
          melde(
            ['anfragen', i, 'irrefuehrend', 'dokumentId'],
            `"${dokumentId}" kann nicht zugleich relevant und irreführend sein.`,
          );
        }
      }
    }

    // Ab hier wird tatsächlich gerechnet — nur mit gültigen Eingaben.
    //
    // Zod führt diese Prüfung auch dann aus, wenn ein Feld schon einen
    // nicht abbrechenden Befund hat (etwa `schwelle: 1.2` an `.lt(1)`). Die
    // Domainfunktionen würden an solchen Werten zu Recht werfen; eine
    // ungültige Konfiguration soll aber als Befund zurückkommen, nicht als
    // Absturz der Inhaltsprüfung.
    const schwelleGueltig =
      Number.isFinite(config.schwelle) && config.schwelle > -1 && config.schwelle < 1;
    const allesEndlich = [...config.dokumente, ...config.anfragen].every((eintrag) =>
      eintrag.vektor.every((wert) => Number.isFinite(wert)),
    );
    if (!vektorenGueltig || !schwelleGueltig || !allesEndlich) return;

    for (const [i, anfrage] of config.anfragen.entries()) {
      const liste = rangliste(anfrage.vektor, config.dokumente).eintraege;
      const ueber = anSchwelleTeilen(liste, config.schwelle).ueber;

      if (anfrage.irrefuehrend) {
        // Ein "irreführender Treffer", der gar nicht weit oben landet, zeigt
        // nichts. Er muss mindestens ein relevantes Dokument überholen und
        // über der Schwelle liegen, sonst ist die Lektion des Labs leer.
        const platzIrrefuehrend = liste.findIndex((e) => e.id === anfrage.irrefuehrend?.dokumentId);
        const bestesRelevantes = liste.findIndex((e) =>
          anfrage.relevanteDokumentIds.includes(e.id),
        );
        if (bestesRelevantes !== -1 && platzIrrefuehrend > bestesRelevantes) {
          melde(
            ['anfragen', i, 'irrefuehrend'],
            'Der irreführende Treffer liegt hinter dem besten relevanten Dokument und demonstriert so nichts.',
          );
        }
        if (!ueber.some((e) => e.id === anfrage.irrefuehrend?.dokumentId)) {
          melde(
            ['anfragen', i, 'irrefuehrend'],
            'Der irreführende Treffer liegt unter der Schwelle und erscheint nie als Antwortkandidat.',
          );
        }
      }

      if (anfrage.relevanteDokumentIds.length === 0 && ueber.length > 0) {
        // Eine Anfrage ohne relevante Dokumente soll den Fall "nichts
        // Passendes" zeigen. Liegt trotzdem etwas über der Schwelle, zeigt
        // das Lab das Gegenteil dessen, was der Lernpunkt behauptet.
        melde(
          ['anfragen', i],
          `Anfrage "${anfrage.id}" hat keine relevanten Dokumente, aber Treffer über der Schwelle.`,
        );
      }
    }

    const anfrageIds = new Set(config.anfragen.map((a) => a.id));
    for (const [i, entscheidung] of config.entscheidungen.entries()) {
      if (!anfrageIds.has(entscheidung.anfrageId)) {
        melde(
          ['entscheidungen', i, 'anfrageId'],
          `Unbekannte Anfrage "${entscheidung.anfrageId}".`,
        );
      }
      const korrekt = entscheidung.optionen.filter((o) => o.korrekt).length;
      if (korrekt !== 1) {
        melde(
          ['entscheidungen', i, 'optionen'],
          `Genau eine Option muss korrekt sein, gefunden: ${korrekt}.`,
        );
      }
      pruefeEindeutig(
        entscheidung.optionen.map((o) => o.id),
        ['entscheidungen', i, 'optionen'],
        'Option',
        melde,
      );
    }
  });

/**
 * Reiner Vergleich statt `vektornorm() === 0`: Diese Prüfung läuft auch für
 * Vektoren, die NaN enthalten, und darf an ihnen nicht werfen.
 */
function istNullvektor(vektor: readonly number[]): boolean {
  return vektor.every((wert) => wert === 0);
}

function pruefeEindeutig(
  ids: string[],
  path: (string | number)[],
  was: string,
  melde: (path: (string | number)[], message: string) => void,
): void {
  const gesehen = new Set<string>();
  for (const id of ids) {
    if (gesehen.has(id)) melde(path, `${was}-Kennung "${id}" ist doppelt vergeben.`);
    gesehen.add(id);
  }
}

export type SemanticRetrievalConfig = z.infer<typeof semanticRetrievalConfigSchema>;
