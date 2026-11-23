import { z } from 'zod';
import { VektorFehler } from '@/domain/retrieval/vektor';
import { chunkeBestand, getrennteGruppen, type Chunk } from '@/domain/rag/chunking';
import { waehleKontext } from '@/domain/rag/kontext';
import { pruefeAussagen } from '@/domain/rag/antwort';
import { bewerteRag } from '@/domain/rag/evaluation';

/**
 * Kanonischer Vertrag für das RAG-Pipeline-Lab (Stufe 10).
 *
 * Drei Dinge sind simuliert und müssen es laut Vertrag auch sagen:
 *  - `simulation.vektoren: 'didaktisch'` — redaktionell festgelegte
 *    Satzvektoren, kein Embedding-Modell;
 *  - `simulation.einheiten: 'woerter'` — das Kontextbudget zählt Wörter,
 *    keine Tokens eines bestimmten Modells;
 *  - `simulation.antwort: 'vorgegebene-bausteine'` — keine generierte
 *    Antwort, sondern vorgegebene Aussagen mit verknüpften Belegen.
 *
 * Die Beziehungsprüfung rechnet mit denselben Domainfunktionen wie das Lab.
 * Ein Rechenfehler (etwa ein Überlauf) wird als Befund gemeldet, nie als
 * Absturz der Prüfung (Lehre aus Review 5812621557 zu LP-10A).
 */

const kennung = z.string().regex(/^[a-z0-9-]+$/, 'Kennung: Kleinbuchstaben, Ziffern, Bindestriche');

const satzVerweisSchema = z.object({
  dokumentId: kennung,
  satz: z.number().int().min(0),
});

const aussageSchema = z.object({
  id: kennung,
  text: z.string().min(10),
  belege: z.array(z.array(satzVerweisSchema).min(1)),
  zitierteQuelle: kennung.optional(),
  schliesstAus: z.array(kennung).optional(),
});

const SZENARIEN = ['beleg-vorhanden', 'top-k', 'chunk-grenze', 'kein-beleg'] as const;

export const ragPipelineConfigSchema = z
  .object({
    simulation: z.object({
      vektoren: z.literal('didaktisch'),
      einheiten: z.literal('woerter'),
      antwort: z.literal('vorgegebene-bausteine'),
    }),
    dimensionen: z
      .array(z.object({ id: kennung, bezeichnung: z.string().min(2) }))
      .min(2)
      .max(8),
    dokumente: z
      .array(
        z.object({
          id: kennung,
          titel: z.string().min(3),
          /** Sichtbare Quellenkennung, z. B. "HR-URLAUB". */
          quelle: z
            .string()
            .regex(/^[A-Z0-9-]+$/, 'Quellenkennung: Großbuchstaben, Ziffern, Bindestriche'),
          version: z.string().min(1),
          gueltigAb: z.iso.date(),
          status: z.enum(['aktuell', 'veraltet']),
          ersetztDurch: kennung.optional(),
          saetze: z
            .array(z.object({ text: z.string().min(10), vektor: z.array(z.number()).min(2) }))
            .min(2),
        }),
      )
      .min(4),
    strategien: z
      .array(
        z
          .object({
            id: kennung,
            bezeichnung: z.string().min(3),
            beschreibung: z.string().min(20),
            saetzeProChunk: z.number().int().min(1).max(10),
            overlap: z.number().int().min(0),
          })
          .refine((s) => s.overlap < s.saetzeProChunk, {
            message: 'overlap muss kleiner als saetzeProChunk sein.',
            path: ['overlap'],
          }),
      )
      .min(2),
    anfragen: z
      .array(
        z.object({
          id: kennung,
          text: z.string().min(10),
          vektor: z.array(z.number()).min(2),
          szenario: z.enum(SZENARIEN),
          aussagen: z.array(aussageSchema).min(1),
          /** Fachliches Urteil: Welche Aussagen braucht eine vollständige Antwort? */
          benoetigteAussagen: z.array(kennung),
          lernpunkt: z.string().min(20),
        }),
      )
      .min(4),
    topK: z.object({
      min: z.literal(1),
      max: z.number().int().min(2).max(10),
      start: z.number().int().min(1),
    }),
    budget: z.object({
      min: z.number().int().min(1),
      max: z.number().int().min(2),
      start: z.number().int().min(1),
      schritt: z.number().int().min(1),
    }),
    entscheidungen: z
      .array(
        z.object({
          id: kennung,
          anfrageId: kennung,
          /** Optional: Die Entscheidung gilt nur bei dieser Chunking-Strategie. */
          strategieId: kennung.optional(),
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
        }),
      )
      .min(2),
  })
  .superRefine((config, ctx) => {
    const melde = (path: (string | number)[], message: string): void => {
      ctx.addIssue({ code: 'custom', path, message });
    };
    const eindeutig = (ids: string[], path: (string | number)[], was: string): boolean => {
      const gesehen = new Set<string>();
      let ok = true;
      for (const id of ids) {
        if (gesehen.has(id)) {
          melde(path, `${was}-Kennung "${id}" ist doppelt vergeben.`);
          ok = false;
        }
        gesehen.add(id);
      }
      return ok;
    };

    const dimension = config.dimensionen.length;
    let rechenbar = true;
    rechenbar =
      eindeutig(
        config.dimensionen.map((d) => d.id),
        ['dimensionen'],
        'Dimension',
      ) && rechenbar;
    rechenbar =
      eindeutig(
        config.dokumente.map((d) => d.id),
        ['dokumente'],
        'Dokument',
      ) && rechenbar;
    rechenbar =
      eindeutig(
        config.strategien.map((s) => s.id),
        ['strategien'],
        'Strategie',
      ) && rechenbar;
    eindeutig(
      config.anfragen.map((a) => a.id),
      ['anfragen'],
      'Anfrage',
    );
    eindeutig(
      config.entscheidungen.map((e) => e.id),
      ['entscheidungen'],
      'Entscheidung',
    );
    // Aussagekennungen gelten labweit, damit Anzeige und Prüfung sie
    // eindeutig zuordnen.
    rechenbar =
      eindeutig(
        config.anfragen.flatMap((a) => a.aussagen.map((s) => s.id)),
        ['anfragen'],
        'Aussage',
      ) && rechenbar;

    // Zod-Grenzen wie `.int()`, `.min()` oder die Overlap-Regel brechen nicht
    // ab: Diese Prüfung läuft auch dann, wenn ein Feld schon einen Befund hat.
    // Die Rechenphase würde an solchen Werten zu Recht werfen (`topK()`,
    // `chunkeDokument()`, `waehleKontext()`). Deshalb werden hier genau die
    // Vorbedingungen geprüft, die sie braucht, und die Rechnung wird
    // gesperrt. Den Feldbefund setzt Zod bereits; hier entsteht keiner
    // doppelt (Review 5818387760).
    if (!zahlenFuerRechnungGueltig(config)) rechenbar = false;

    if (config.topK.start > config.topK.max) {
      melde(['topK', 'start'], `topK.start (${config.topK.start}) liegt über topK.max.`);
    }
    const { budget } = config;
    if (budget.min > budget.max || budget.start < budget.min || budget.start > budget.max) {
      melde(['budget'], 'Das Budget braucht min ≤ start ≤ max.');
      rechenbar = false;
    }

    const istNull = (v: readonly number[]): boolean => v.every((w) => w === 0);
    const endlich = (v: readonly number[]): boolean => v.every((w) => Number.isFinite(w));

    // --- Dokumente ----------------------------------------------------
    const dokumente = new Map(config.dokumente.map((d) => [d.id, d]));
    for (const [i, dok] of config.dokumente.entries()) {
      for (const [j, satz] of dok.saetze.entries()) {
        if (satz.vektor.length !== dimension) {
          rechenbar = false;
          melde(
            ['dokumente', i, 'saetze', j, 'vektor'],
            `Satz ${j + 1} in "${dok.id}" hat ${satz.vektor.length} statt ${dimension} Dimensionen.`,
          );
        } else if (!endlich(satz.vektor)) {
          rechenbar = false;
        } else if (istNull(satz.vektor)) {
          rechenbar = false;
          melde(
            ['dokumente', i, 'saetze', j, 'vektor'],
            `Satz ${j + 1} in "${dok.id}" ist ein Nullvektor.`,
          );
        }
      }
      if (dok.status === 'veraltet') {
        if (!dok.ersetztDurch) {
          melde(
            ['dokumente', i, 'ersetztDurch'],
            `Veraltetes Dokument "${dok.id}" nennt keinen Nachfolger.`,
          );
        } else if (dokumente.get(dok.ersetztDurch)?.status !== 'aktuell') {
          melde(
            ['dokumente', i, 'ersetztDurch'],
            `"${dok.ersetztDurch}" ist kein aktuelles Dokument dieses Bestands.`,
          );
        }
      } else if (dok.ersetztDurch) {
        melde(
          ['dokumente', i, 'ersetztDurch'],
          `Aktuelles Dokument "${dok.id}" kann nicht ersetzt sein.`,
        );
      }
    }

    // --- Anfragen und Aussagen --------------------------------------------
    for (const [i, anfrage] of config.anfragen.entries()) {
      if (anfrage.vektor.length !== dimension) {
        rechenbar = false;
        melde(
          ['anfragen', i, 'vektor'],
          `Anfrage "${anfrage.id}" hat ${anfrage.vektor.length} statt ${dimension} Dimensionen.`,
        );
      } else if (!endlich(anfrage.vektor)) {
        rechenbar = false;
      } else if (istNull(anfrage.vektor)) {
        rechenbar = false;
        melde(['anfragen', i, 'vektor'], `Anfrage "${anfrage.id}" ist ein Nullvektor.`);
      }

      const aussageIds = new Set(anfrage.aussagen.map((a) => a.id));
      for (const [j, aussage] of anfrage.aussagen.entries()) {
        for (const [g, gruppe] of aussage.belege.entries()) {
          for (const verweis of gruppe) {
            const dok = dokumente.get(verweis.dokumentId);
            if (!dok) {
              rechenbar = false;
              melde(
                ['anfragen', i, 'aussagen', j, 'belege', g],
                `Unbekanntes Dokument "${verweis.dokumentId}".`,
              );
            } else if (verweis.satz >= dok.saetze.length) {
              rechenbar = false;
              melde(
                ['anfragen', i, 'aussagen', j, 'belege', g],
                `"${dok.id}" hat keinen Satz ${verweis.satz + 1}.`,
              );
            }
          }
        }
        for (const andere of aussage.schliesstAus ?? []) {
          if (!aussageIds.has(andere) || andere === aussage.id) {
            melde(
              ['anfragen', i, 'aussagen', j, 'schliesstAus'],
              `"${andere}" ist keine andere Aussage dieser Anfrage.`,
            );
          }
        }
      }
      for (const id of anfrage.benoetigteAussagen) {
        if (!aussageIds.has(id)) {
          rechenbar = false;
          melde(['anfragen', i, 'benoetigteAussagen'], `Unbekannte Aussage "${id}".`);
        }
      }
      if (anfrage.szenario === 'kein-beleg') {
        if (anfrage.benoetigteAussagen.length > 0) {
          melde(
            ['anfragen', i, 'benoetigteAussagen'],
            'Ein Szenario ohne Beleg kann keine benötigten Aussagen haben.',
          );
        }
        if (anfrage.aussagen.some((a) => a.belege.length > 0)) {
          melde(
            ['anfragen', i, 'aussagen'],
            'Im Szenario ohne Beleg darf keine Aussage einen Beleg haben.',
          );
        }
      } else if (anfrage.benoetigteAussagen.length === 0) {
        melde(
          ['anfragen', i, 'benoetigteAussagen'],
          'Ohne benötigte Aussage lässt sich das Szenario nicht prüfen.',
        );
      }
    }

    for (const szenario of SZENARIEN) {
      if (!config.anfragen.some((a) => a.szenario === szenario)) {
        melde(['anfragen'], `Szenario "${szenario}" fehlt.`);
      }
    }

    // --- Entscheidungen -----------------------------------------------------
    const anfrageIds = new Set(config.anfragen.map((a) => a.id));
    const strategieIds = new Set(config.strategien.map((s) => s.id));
    for (const [i, e] of config.entscheidungen.entries()) {
      if (!anfrageIds.has(e.anfrageId)) {
        melde(['entscheidungen', i, 'anfrageId'], `Unbekannte Anfrage "${e.anfrageId}".`);
      }
      if (e.strategieId && !strategieIds.has(e.strategieId)) {
        melde(['entscheidungen', i, 'strategieId'], `Unbekannte Strategie "${e.strategieId}".`);
      }
      const korrekt = e.optionen.filter((o) => o.korrekt).length;
      if (korrekt !== 1) {
        melde(
          ['entscheidungen', i, 'optionen'],
          `Genau eine Option muss korrekt sein, gefunden: ${korrekt}.`,
        );
      }
      eindeutig(
        e.optionen.map((o) => o.id),
        ['entscheidungen', i, 'optionen'],
        'Option',
      );
    }

    if (!rechenbar) return;

    // --- Die Szenarien müssen tatsächlich eintreten -------------------------
    try {
      const chunksJe = new Map<string, Chunk[]>(
        config.strategien.map((s) => [s.id, chunkeBestand(config.dokumente, s)]),
      );
      const startStrategie = config.strategien[0];
      if (!startStrategie) return;

      for (const [i, anfrage] of config.anfragen.entries()) {
        const benoetigt = anfrage.aussagen.filter((a) => anfrage.benoetigteAussagen.includes(a.id));
        const gruppen = benoetigt.flatMap((a) => a.belege.map((gruppe) => ({ gruppe })));
        const auswerten = (chunks: Chunk[], k: number, b: number): boolean => {
          const kontext = waehleKontext(anfrage.vektor, chunks, { k, budget: b });
          const geprueft = pruefeAussagen(anfrage.aussagen, kontext.imKontext, config.dokumente);
          return bewerteRag({
            geprueft,
            benoetigteAussagen: anfrage.benoetigteAussagen,
            kontext: kontext.imKontext,
            alleChunks: chunks,
          }).ergebnisKorrekt;
        };
        const start = chunksJe.get(startStrategie.id) ?? [];

        if (
          anfrage.szenario === 'beleg-vorhanden' &&
          !auswerten(start, config.topK.start, budget.start)
        ) {
          melde(
            ['anfragen', i],
            'Szenario "beleg-vorhanden": Mit den Startwerten ist die Antwort nicht vollständig belegt.',
          );
        }
        if (anfrage.szenario === 'top-k') {
          // Mit großem k belegt, mit k = 1 nicht: Sonst zeigt der Regler nichts.
          const tritt = [...chunksJe.values()].some(
            (chunks) =>
              auswerten(chunks, config.topK.max, budget.max) && !auswerten(chunks, 1, budget.max),
          );
          if (!tritt) {
            melde(
              ['anfragen', i],
              'Szenario "top-k": Kein Top-k-Wert lässt den benötigten Beleg herausfallen.',
            );
          }
        }
        if (anfrage.szenario === 'chunk-grenze') {
          const getrennt = [...chunksJe.values()].filter(
            (c) => getrennteGruppen(c, gruppen).length > 0,
          );
          const zusammen = [...chunksJe.values()].filter(
            (c) => getrennteGruppen(c, gruppen).length === 0,
          );
          if (getrennt.length === 0 || zusammen.length === 0) {
            melde(
              ['anfragen', i],
              'Szenario "chunk-grenze": Es braucht eine Strategie, die den Beleg trennt, und eine, die ihn zusammenhält.',
            );
          }
        }
      }
    } catch (fehler) {
      if (!(fehler instanceof VektorFehler)) throw fehler;
      melde(['anfragen'], `Die Pipeline lässt sich nicht berechnen: ${fehler.message}`);
    }
  });

const ganzzahlAb = (wert: number, min: number): boolean => Number.isInteger(wert) && wert >= min;

/**
 * Die numerischen Vorbedingungen der Rechenphase — dieselben, die
 * `topK()`, `chunkeDokument()` und `waehleKontext()` sonst mit einer
 * `RangeError` durchsetzen.
 */
function zahlenFuerRechnungGueltig(config: {
  topK: { max: number; start: number };
  budget: { min: number; max: number; start: number; schritt: number };
  strategien: readonly { saetzeProChunk: number; overlap: number }[];
  anfragen: readonly {
    aussagen: readonly { belege: readonly (readonly { satz: number }[])[] }[];
  }[];
}): boolean {
  const { topK, budget } = config;
  return (
    ganzzahlAb(topK.start, 1) &&
    ganzzahlAb(topK.max, 1) &&
    topK.start <= topK.max &&
    ganzzahlAb(budget.min, 0) &&
    ganzzahlAb(budget.start, budget.min) &&
    ganzzahlAb(budget.max, budget.start) &&
    ganzzahlAb(budget.schritt, 1) &&
    config.strategien.every(
      (s) =>
        ganzzahlAb(s.saetzeProChunk, 1) && ganzzahlAb(s.overlap, 0) && s.overlap < s.saetzeProChunk,
    ) &&
    config.anfragen.every((a) =>
      a.aussagen.every((aussage) =>
        aussage.belege.every((gruppe) => gruppe.every((v) => ganzzahlAb(v.satz, 0))),
      ),
    )
  );
}

export type RagPipelineConfig = z.infer<typeof ragPipelineConfigSchema>;
