import { describe, expect, it } from 'vitest';
import {
  antwortFehler,
  bandZuPunktzahl,
  DONT_KNOW_OPTION_ID,
  evaluatePlacement,
  oeffentlicheFragen,
  oeffentlichesErgebnis,
  pfadBegruendung,
  placementQuestionSchema,
  validatePlacementQuestions,
  type PlacementQuestion,
} from '@/domain/placement/placement';
import { placementQuestions } from '@/content/placement';

const questions: PlacementQuestion[] = [
  {
    id: 'q1',
    area: 'logic',
    question: 'Was passiert zuerst?',
    options: [
      { id: 'a', text: 'Schritt A' },
      { id: 'b', text: 'Schritt B' },
      { id: DONT_KNOW_OPTION_ID, text: 'Weiß ich nicht' },
    ],
    correctOptionId: 'a',
    weight: 1,
    explanation: 'Schritt A kommt zuerst, weil ...',
  },
  {
    id: 'q2',
    area: 'ai-concepts',
    question: 'Was ist ein Token?',
    options: [
      { id: 'a', text: 'Ein Zeichen' },
      { id: 'b', text: 'Ein Textbaustein' },
      { id: DONT_KNOW_OPTION_ID, text: 'Weiß ich nicht' },
    ],
    correctOptionId: 'b',
    demonstratesConceptSlug: 'token',
    weight: 2,
    explanation: 'Ein Token ist ein Textbaustein, kein einzelnes Zeichen.',
  },
];

describe('evaluatePlacement', () => {
  it('scores 100 when every question is answered correctly', () => {
    const result = evaluatePlacement(questions, [
      { questionId: 'q1', optionId: 'a' },
      { questionId: 'q2', optionId: 'b' },
    ]);
    expect(result.score).toBe(100);
    expect(result.band).toBe('refresher');
  });

  it('treats "weiß ich nicht" the same as any other wrong answer, not worse', () => {
    const dontKnow = evaluatePlacement(questions, [
      { questionId: 'q1', optionId: DONT_KNOW_OPTION_ID },
      { questionId: 'q2', optionId: 'b' },
    ]);
    const wrongGuess = evaluatePlacement(questions, [
      { questionId: 'q1', optionId: 'b' },
      { questionId: 'q2', optionId: 'b' },
    ]);
    expect(dontKnow.score).toBe(wrongGuess.score);
  });

  it('only counts a concept as demonstrated when its question was answered correctly', () => {
    const correct = evaluatePlacement(questions, [{ questionId: 'q2', optionId: 'b' }]);
    expect(correct.demonstratedConceptSlugs).toContain('token');

    const wrong = evaluatePlacement(questions, [{ questionId: 'q2', optionId: 'a' }]);
    expect(wrong.demonstratedConceptSlugs).not.toContain('token');
  });

  it('assigns the beginner band for a low score', () => {
    const result = evaluatePlacement(questions, []);
    expect(result.score).toBe(0);
    expect(result.band).toBe('beginner');
  });

  it('never gives a time-based or speed-based bonus (no such input exists)', () => {
    // The evaluator's only inputs are question weight and correctness — this
    // test documents that guarantee by exhaustively checking the signature.
    const result = evaluatePlacement(questions, [{ questionId: 'q1', optionId: 'a' }]);
    expect(Object.keys(result)).toEqual([
      'score',
      'band',
      'demonstratedConceptSlugs',
      'byArea',
      'message',
      'version',
    ]);
  });
});

/**
 * Die Einstufung ist jetzt im Onboarding eingehängt. Geprüft wird das, was
 * dabei neu hinzukommt: was der Browser sehen darf, was er schicken darf,
 * und wie ein Ergebnis den Pfad einordnet.
 */
describe('Fragen für den Browser', () => {
  const fragen = placementQuestions.map((f) => placementQuestionSchema.parse(f));
  const oeffentlich = oeffentlicheFragen(fragen);

  it('gibt weder Lösung noch Erklärung heraus', () => {
    const serialisiert = JSON.stringify(oeffentlich);
    for (const frage of fragen) {
      expect(serialisiert).not.toContain(frage.explanation);
    }
    // Die Schlüsselmenge ist abschließend aufgezählt, nicht nur gegen eine
    // Verbotsliste gehalten. Eine Verbotsliste fängt nur, was heute schon so
    // heißt: Ein `loesung: frage.correctOptionId` stünde auf keiner und
    // brächte die richtige Antwort in den Browser, BEVOR sie gegeben ist.
    for (const frage of oeffentlich) {
      const erlaubt =
        frage.context === undefined
          ? ['area', 'id', 'options', 'question']
          : ['area', 'context', 'id', 'options', 'question'];
      expect(Object.keys(frage).sort(), frage.id).toEqual(erlaubt);
      for (const option of frage.options) {
        expect(Object.keys(option).sort(), option.id).toEqual(['id', 'text']);
      }
    }

    // Und die Texte kommen Wort für Wort aus der Frage: Auf die Schlüssel zu
    // sehen genügt nicht, wenn sich in einen erlaubten Text alles
    // hineinschreiben ließe — etwa die Lösung im Fragetext.
    for (let i = 0; i < fragen.length; i += 1) {
      const quelle = fragen[i]!;
      const fassung = oeffentlich[i]!;
      expect(fassung.id, quelle.id).toBe(quelle.id);
      expect(fassung.question, quelle.id).toBe(quelle.question);
      expect(
        fassung.options.filter((o) => o.id !== DONT_KNOW_OPTION_ID).map((o) => o.text),
        quelle.id,
      ).toEqual(quelle.options.map((o) => o.text));
    }
  });

  it('hängt jeder Frage "Weiß ich nicht" an', () => {
    for (const frage of oeffentlich) {
      expect(frage.options.at(-1)?.id, frage.id).toBe(DONT_KNOW_OPTION_ID);
      expect(frage.options.length, frage.id).toBe(
        (fragen.find((f) => f.id === frage.id)?.options.length ?? 0) + 1,
      );
    }
  });

  it('behält Reihenfolge und Text der eigentlichen Optionen', () => {
    for (const [i, frage] of oeffentlich.entries()) {
      const quelle = fragen[i]!;
      expect(frage.id).toBe(quelle.id);
      expect(frage.question).toBe(quelle.question);
      expect(frage.options.slice(0, -1).map((o) => o.id)).toEqual(quelle.options.map((o) => o.id));
    }
  });
});

describe('Antworten aus dem Browser', () => {
  const fragen = placementQuestions.map((f) => placementQuestionSchema.parse(f));

  it('nimmt eine gültige Option an', () => {
    const frage = fragen[0]!;
    expect(
      antwortFehler(fragen, { questionId: frage.id, optionId: frage.options[0]!.id }),
    ).toBeNull();
  });

  it('nimmt "Weiß ich nicht" überall an', () => {
    for (const frage of fragen) {
      expect(
        antwortFehler(fragen, { questionId: frage.id, optionId: DONT_KNOW_OPTION_ID }),
        frage.id,
      ).toBeNull();
    }
  });

  it('lehnt eine unbekannte Frage ab', () => {
    expect(antwortFehler(fragen, { questionId: 'gibt-es-nicht', optionId: 'a' })).toContain(
      'Unbekannte Frage',
    );
  });

  it('lehnt eine Option ab, die nicht zu dieser Frage gehört', () => {
    // Eine erfundene Kennung ist ein Fehler, keine falsche Antwort — sonst
    // sähe ein Tippfehler in der Maske aus wie geraten.
    expect(antwortFehler(fragen, { questionId: fragen[0]!.id, optionId: 'zzz' })).toContain(
      'gehört nicht zur Frage',
    );
  });

  it('wertet "Weiß ich nicht" wie eine falsche Antwort, nicht schlechter', () => {
    const weissNicht = fragen.map((f) => ({ questionId: f.id, optionId: DONT_KNOW_OPTION_ID }));
    const falsch = fragen.map((f) => ({
      questionId: f.id,
      optionId: f.options.find((o) => o.id !== f.correctOptionId)!.id,
    }));
    expect(evaluatePlacement(fragen, weissNicht).score).toBe(
      evaluatePlacement(fragen, falsch).score,
    );
  });
});

describe('Band und Pfadbegründung', () => {
  it('teilt an denselben Grenzen ein wie die Auswertung', () => {
    expect(bandZuPunktzahl(0)).toBe('beginner');
    expect(bandZuPunktzahl(34)).toBe('beginner');
    expect(bandZuPunktzahl(35)).toBe('advanced-beginner');
    expect(bandZuPunktzahl(69)).toBe('advanced-beginner');
    expect(bandZuPunktzahl(70)).toBe('refresher');
    expect(bandZuPunktzahl(100)).toBe('refresher');
  });

  it('nennt in jeder Begründung die Grundregel, dass nichts übersprungen wird', () => {
    for (const band of [null, 'beginner', 'advanced-beginner', 'refresher'] as const) {
      expect(pfadBegruendung(band), String(band)).toContain('nie eine Lektion übersprungen');
    }
  });

  it('verspricht in keiner Begründung einen gekürzten Pfad', () => {
    // Die Grundregel allein zu finden genügt nicht: Der Bandsatz wird
    // dahintergehängt und kann ihr widersprechen, ohne sie zu entfernen.
    // Genau das stand hier — "kürzt Bekanntes ab" zwei Sätze nach "es wird
    // nie eine Lektion übersprungen", gespeichert und auf /pfad gezeigt.
    // Ohne `null`: Dort gibt es keinen Bandsatz, der geprüfte Rest wäre leer
    // und die Schleife liefe ins Leere. Dass die Grundregel selbst nichts
    // Falsches verspricht, hält die Prüfung darüber fest.
    for (const band of ['beginner', 'advanced-beginner', 'refresher'] as const) {
      // Wortstämme, keine ganzen Wörter: "kürzt" allein ließe "Der Pfad ist
      // dadurch kürzer" durch, und "Auffrischung" allein ließe
      // "aufgefrischt" durch.
      //
      // "überspring" UND "übersprung" müssen beide dastehen: Der erste
      // Stamm trifft "überspringen", nicht aber "übersprungen" — also
      // ausgerechnet die Form, in der der Widerspruch am ehesten dastünde.
      // Genau deshalb wird auch nur der Bandsatz geprüft und nicht der
      // ganze Text: Die Grundregel selbst enthält "übersprungen" und
      // träfe sich sonst selbst.
      const bandsatz = pfadBegruendung(band).replace(pfadBegruendung(null), '');
      expect(bandsatz, String(band)).not.toMatch(
        /kürz|überspring|übersprung|auslass|weglass|ausgeblendet|frisch|spar(st|t) dir/i,
      );
    }
  });

  it('ergänzt die Begründung um den Hinweis zum Band', () => {
    expect(pfadBegruendung('refresher')).not.toBe(pfadBegruendung(null));
    expect(pfadBegruendung('beginner')).not.toBe(pfadBegruendung('refresher'));
  });
});

describe('Ergebnis für den Browser', () => {
  it('trägt nur Punktzahl und Text, nicht die inneren Größen', () => {
    const voll = evaluatePlacement(
      questions,
      questions.map((f) => ({ questionId: f.id, optionId: f.correctOptionId })),
    );

    // Das vollständige Ergebnis hat sie — das ist richtig so, der Server
    // braucht sie.
    expect(voll.band).toBeDefined();
    expect(voll.byArea).toBeDefined();
    expect(voll.demonstratedConceptSlugs).toBeDefined();
    expect(voll.version).toBeDefined();

    // Hinaus geht davon nichts.
    const oeffentlich = oeffentlichesErgebnis(voll);
    expect(Object.keys(oeffentlich).sort()).toEqual(['message', 'score']);
    expect(oeffentlich.score).toBe(voll.score);
    expect(oeffentlich.message).toBe(voll.message);
  });
});

describe('Inhaltsprüfung der Einstufung', () => {
  const fragen = placementQuestions.map((f) => placementQuestionSchema.parse(f));

  it('nimmt die ausgelieferten Fragen an', () => {
    expect(validatePlacementQuestions(fragen)).toEqual([]);
  });

  it('meldet eine doppelte Fragekennung', () => {
    const befunde = validatePlacementQuestions([fragen[0]!, fragen[0]!]);
    expect(befunde.some((b) => b.message.includes('Doppelte Fragekennung'))).toBe(true);
  });

  it('meldet eine doppelte Optionskennung', () => {
    const kaputt = {
      ...fragen[0]!,
      options: [fragen[0]!.options[0]!, fragen[0]!.options[0]!],
    };
    expect(
      validatePlacementQuestions([kaputt]).some((b) =>
        b.message.includes('Doppelte Optionskennung'),
      ),
    ).toBe(true);
  });

  it('meldet eine richtige Antwort, die es nicht gibt', () => {
    const kaputt = { ...fragen[0]!, correctOptionId: 'gibt-es-nicht' };
    expect(
      validatePlacementQuestions([kaputt]).some((b) =>
        b.message.includes('zeigt auf keine Option'),
      ),
    ).toBe(true);
  });

  it('meldet eine Option, die "Weiß ich nicht" in die Quere kommt', () => {
    const kaputt = {
      ...fragen[0]!,
      options: [...fragen[0]!.options, { id: DONT_KNOW_OPTION_ID, text: 'Weiß ich nicht' }],
    };
    expect(validatePlacementQuestions([kaputt]).some((b) => b.message.includes('reserviert'))).toBe(
      true,
    );
  });

  it('warnt, wenn ein Bereich gar nicht vorkommt', () => {
    const nurLogik = fragen.filter((f) => f.area === 'logic');
    const befunde = validatePlacementQuestions(nurLogik);
    expect(befunde.filter((b) => b.severity === 'warning').length).toBeGreaterThan(0);
    expect(befunde.every((b) => b.severity !== 'error')).toBe(true);
  });
});
