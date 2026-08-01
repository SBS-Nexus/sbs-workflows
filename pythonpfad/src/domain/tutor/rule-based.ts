import { explainPythonError } from '@/domain/errors/python-errors';
import type { TutorContext, TutorProvider, TutorReply, TutorRequest } from './types';

/**
 * Regelbasierter Tutor.
 *
 * Er arbeitet ausschließlich mit dem, was ohnehin auf dem Server liegt: der
 * Aufgabenstellung, den Konzeptbeschreibungen, dem Kompetenzstand und der
 * Fehlererklärung aus src/domain/errors. Kein Netzwerkzugriff, keine
 * Weitergabe von Code an Dritte, keine erfundenen Python-Funktionen.
 *
 * Das ist der Standardbetrieb. Er bleibt auch dann verfügbar, wenn kein
 * KI-Anbieter konfiguriert ist oder die Einwilligung fehlt.
 */
export class RuleBasedTutor implements TutorProvider {
  readonly name = 'rule-based' as const;

  async reply(request: TutorRequest, context: TutorContext): Promise<TutorReply> {
    switch (request.mode) {
      case 'explain-error-message':
      case 'error-help':
        return this.#errorHelp(request);
      case 'simpler':
        return this.#simpler(context);
      case 'impulse':
        return this.#impulse(context);
      case 'check-approach':
        return this.#checkApproach(request, context);
      case 'control-question':
        return this.#controlQuestion(context);
      case 'similar-example':
        return this.#similarExample(context);
      case 'verify-understanding':
        return this.#verifyUnderstanding(context);
    }
  }

  #weakestConcept(context: TutorContext): TutorContext['concepts'][number] | undefined {
    return [...context.concepts].sort(
      (a, b) => (context.masteryByConcept[a.slug] ?? 0) - (context.masteryByConcept[b.slug] ?? 0),
    )[0];
  }

  #errorHelp(request: TutorRequest): TutorReply {
    if (!request.traceback || request.traceback.trim().length === 0) {
      return {
        provider: this.name,
        paragraphs: [
          'Mir liegt gerade keine Fehlermeldung vor. Führe den Code einmal aus – die Meldung im Ausgabebereich ist der beste Ausgangspunkt.',
          'Falls das Programm ohne Abbruch läuft, aber etwas anderes tut als gewollt, ist es kein Fehler im engeren Sinn, sondern ein Logikfehler. Dann hilft es, den Code Zeile für Zeile durchzugehen und die Werte der beteiligten Variablen aufzuschreiben.',
        ],
        nextStep: 'Führe den Code aus und schau dir die letzte Zeile der Meldung an.',
      };
    }

    const info = explainPythonError(request.traceback);

    const paragraphs = [
      `Python meldet ${info.pythonType}. ${info.meaning}`,
      info.line
        ? `Die Meldung verweist auf Zeile ${info.line}. Beachte dabei: Die Ursache liegt manchmal eine Zeile darüber – besonders bei fehlenden Klammern.`
        : 'Die Meldung nennt keine eindeutige Zeile. Lies sie von unten nach oben: Die letzte Zeile enthält den Fehlertyp.',
      `Häufige Ursachen: ${info.likelyCauses.map((c) => `\n  • ${c}`).join('')}`,
      `So kannst du vorgehen: ${info.searchStrategy.map((s) => `\n  ${s}`).join('')}`,
    ];

    return {
      provider: this.name,
      paragraphs,
      nextStep: info.selfCheck,
      caveat:
        'Diese Einordnung stützt sich auf den Fehlertyp, nicht auf deinen konkreten Code. Prüfe die genannten Ursachen der Reihe nach.',
      documentation: {
        label: 'Python-Dokumentation: Fehler und Ausnahmen',
        url: 'https://docs.python.org/de/3/tutorial/errors.html',
      },
    };
  }

  #simpler(context: TutorContext): TutorReply {
    const concept = this.#weakestConcept(context);
    if (!concept) {
      return {
        provider: this.name,
        paragraphs: [
          `Es geht in dieser Aufgabe um Folgendes: ${context.exercisePrompt}`,
          'Lies die Aufgabenstellung einmal Satz für Satz und markiere, welche Angabe woher kommt und was am Ende herauskommen soll.',
        ],
        nextStep: 'Formuliere in einem Satz, was das Programm am Ende ausgeben soll.',
      };
    }

    return {
      provider: this.name,
      paragraphs: [
        `Im Kern geht es um ${concept.name}.`,
        concept.description,
        'Wenn dir die Aufgabenstellung zu viel auf einmal ist: Zerlege sie in Eingabe, Verarbeitung und Ausgabe. Fange mit dem Teil an, bei dem du sicher bist – das ist fast immer die Ausgabe.',
      ],
      nextStep: `Schreibe in eigenen Worten auf, was ${concept.name} in dieser Aufgabe konkret leisten muss.`,
    };
  }

  #impulse(context: TutorContext): TutorReply {
    const concept = this.#weakestConcept(context);
    const questions: Record<string, string> = {
      'for-schleife':
        'Welche Variable verändert sich in jedem Schleifendurchlauf – und welche nicht?',
      'while-schleife':
        'Welche Variable steht in deiner Bedingung, und an welcher Stelle im Rumpf verändert sie sich?',
      akkumulator:
        'Wo legst du den Startwert fest – vor der Schleife oder darin? Was wäre der Unterschied?',
      'zaehler-variable': 'Welchen Wert soll dein Zähler haben, bevor der erste Durchlauf beginnt?',
      'if-bedingung':
        'Nimm einen konkreten Beispielwert. Trifft deine Bedingung damit zu oder nicht – und stimmt das mit der Aufgabe überein?',
      'elif-kette':
        'Gehe deine Fälle mit einem Beispielwert von oben nach unten durch. Bei welchem bleibt Python stehen?',
      'logische-operatoren':
        'Muss für dein Ergebnis wirklich beides zutreffen, oder genügt eines von beidem?',
      typumwandlung:
        'Welchen Typ hat der Wert an dieser Stelle tatsächlich – und welchen bräuchtest du?',
      'input-eingabe': 'Was liefert input() zurück, bevor du irgendetwas damit machst?',
      variable: 'Welchen Wert hat diese Variable unmittelbar vor der Zeile, um die es dir geht?',
      'range-funktion':
        'Bei welcher Zahl beginnt deine Zählung, und welche gehört nicht mehr dazu?',
      'break-continue': 'Soll die Schleife danach weiterlaufen oder ganz enden?',
    };

    const question = concept
      ? (questions[concept.slug] ??
        `Welchen Beitrag leistet ${concept.name} zur Lösung dieser Aufgabe?`)
      : 'Was genau soll am Ende herauskommen – und welche Angabe fehlt dir dafür noch?';

    return {
      provider: this.name,
      paragraphs: [
        question,
        'Beantworte die Frage kurz für dich, bevor du weiterschreibst. Meistens ergibt sich der nächste Schritt daraus von selbst.',
      ],
      nextStep: 'Schreibe die Antwort auf diese Frage in einem Satz auf.',
    };
  }

  #checkApproach(request: TutorRequest, context: TutorContext): TutorReply {
    const code = (request.code ?? '').trim();

    if (code.length === 0) {
      return {
        provider: this.name,
        paragraphs: [
          'Im Editor steht noch nichts. Ein Ansatz muss nicht funktionieren, um besprechbar zu sein – auch eine unvollständige Zeile oder ein Kommentar mit deinem Plan genügt.',
        ],
        nextStep: 'Schreibe als Kommentar in den Editor, welche Schritte du dir vorstellst.',
      };
    }

    const observations: string[] = [];

    // Strukturelle Beobachtungen – bewusst ohne Bewertung der Korrektheit.
    if (/\bfor\b|\bwhile\b/.test(code)) observations.push('Du verwendest eine Schleife.');
    if (/\bif\b/.test(code)) observations.push('Du triffst eine Fallunterscheidung.');
    // Wortgrenze davor: Ohne sie würde bereits "print(" als int() gelten.
    if (/input\s*\(/.test(code) && !/\bint\s*\(|\bfloat\s*\(/.test(code)) {
      observations.push(
        'Du liest eine Eingabe ein, wandelst sie aber nirgends um. Falls du damit rechnen willst, fehlt dieser Schritt.',
      );
    }
    if (/while\s+True/.test(code) && !/\bbreak\b/.test(code)) {
      observations.push(
        'Du hast eine while True-Schleife ohne break. So formuliert endet sie nie – prüfe, wo der Ausstieg liegen soll.',
      );
    }
    if (/print\s*\(/.test(code) === false) {
      observations.push('Es gibt noch keine Ausgabe. Ohne print() bleibt das Ergebnis unsichtbar.');
    }
    if (context.lastTotalTests > 0) {
      observations.push(
        `Beim letzten Prüflauf waren ${context.lastPassedTests} von ${context.lastTotalTests} Tests erfüllt. Schau dir gezielt den ersten fehlgeschlagenen Test an – oft hängen die übrigen daran.`,
      );
    }

    if (observations.length === 0) {
      observations.push(
        'Dein Ansatz besteht bisher aus einer geraden Abfolge ohne Verzweigung oder Wiederholung. Prüfe an der Aufgabenstellung, ob das ausreicht.',
      );
    }

    return {
      provider: this.name,
      paragraphs: [
        'Ich schaue mir die Struktur deines Ansatzes an, nicht die Korrektheit im Einzelnen – das übernehmen die Tests zuverlässiger.',
        observations.map((o) => `• ${o}`).join('\n'),
      ],
      nextStep:
        'Führe deinen Code aus und vergleiche die Ausgabe Zeile für Zeile mit dem, was die Aufgabe verlangt.',
      caveat:
        'Diese Rückmeldung beruht auf Mustern im Quelltext. Ob dein Programm fachlich richtig rechnet, zeigen erst die Tests.',
    };
  }

  #controlQuestion(context: TutorContext): TutorReply {
    const concept = this.#weakestConcept(context);
    const checks: Record<string, string> = {
      'for-schleife':
        'Wie viele Ausgabezeilen entstehen, wenn deine Liste vier Elemente hat und im Rumpf ein print() steht?',
      'while-schleife':
        'Was passiert, wenn die Bedingung schon beim allerersten Prüfen nicht zutrifft?',
      akkumulator: 'Welchen Wert hat deine Summenvariable unmittelbar vor dem ersten Durchlauf?',
      'if-bedingung':
        'Welche Zeilen deines Programms laufen unabhängig davon, ob die Bedingung zutrifft?',
      'elif-kette': 'Was passiert, wenn zwei deiner Bedingungen gleichzeitig zutreffen?',
      typumwandlung: 'Was liefert int("7") – und was liefert int("sieben")?',
      'input-eingabe': 'Welchen Typ hat der Rückgabewert von input(), wenn jemand 5 eintippt?',
      'range-funktion': 'Welche Zahlen liefert range(2, 5)?',
      vergleichsoperator: 'Worin unterscheiden sich = und == in Python?',
    };

    const question = concept
      ? (checks[concept.slug] ??
        `Erkläre in einem Satz, woran du erkennst, dass ${concept.name} hier gebraucht wird.`)
      : 'Erkläre in einem Satz, was diese Aufgabe von dir verlangt.';

    return {
      provider: this.name,
      paragraphs: [
        question,
        'Beantworte sie ohne nachzuschlagen. Wenn du zögerst, ist genau das die Stelle, an der sich ein Blick in die Lektion lohnt.',
      ],
      nextStep: 'Beantworte die Frage für dich, bevor du weiterarbeitest.',
    };
  }

  #similarExample(context: TutorContext): TutorReply {
    const concept = this.#weakestConcept(context);

    const examples: Record<string, { text: string; code: string }> = {
      'for-schleife': {
        text: 'Dieselbe Struktur mit anderem Inhalt: für jedes Element einer Liste eine Zeile ausgeben.',
        code: 'staedte = ["Kiel", "Erfurt"]\nfor stadt in staedte:\n    print(stadt)',
      },
      akkumulator: {
        text: 'Dieselbe Struktur: Startwert vor der Schleife, Erhöhung im Rumpf.',
        code: 'gesamt = 0\nfor wert in [2, 5]:\n    gesamt = gesamt + wert',
      },
      'while-schleife': {
        text: 'Dieselbe Struktur: Bedingung in der while-Zeile, Veränderung im Rumpf.',
        code: 'rest = 10\nwhile rest > 0:\n    rest = rest - 4',
      },
      'elif-kette': {
        text: 'Dieselbe Struktur mit drei Stufen, von der engsten zur weitesten Bedingung.',
        code: 'if wert <= 10:\n    stufe = "klein"\nelif wert <= 100:\n    stufe = "mittel"\nelse:\n    stufe = "gross"',
      },
      typumwandlung: {
        text: 'Dieselbe Struktur: einlesen und im selben Schritt umwandeln.',
        code: 'menge = int(input("Menge: "))',
      },
    };

    const example = concept ? examples[concept.slug] : undefined;

    if (!example) {
      return {
        provider: this.name,
        paragraphs: [
          'Für dieses Konzept habe ich kein passendes Gegenbeispiel hinterlegt.',
          'Das durchgerechnete Beispiel in der Lektion hat dieselbe Struktur wie deine Aufgabe. Gehe es Zeile für Zeile durch und frage dich bei jeder: Welche Entsprechung hat sie in meiner Aufgabe?',
        ],
        nextStep:
          'Öffne den Abschnitt "Beispiel" der Lektion und vergleiche ihn mit deiner Aufgabe.',
      };
    }

    return {
      provider: this.name,
      paragraphs: [
        example.text,
        `\`\`\`python\n${example.code}\n\`\`\``,
        'Der Inhalt ist ein anderer, das Muster ist dasselbe. Übertrage die Struktur auf deine Aufgabe – die Namen und Werte änderst du.',
      ],
      nextStep: 'Schreibe dasselbe Muster mit den Namen und Werten aus deiner Aufgabe.',
    };
  }

  #verifyUnderstanding(context: TutorContext): TutorReply {
    const concept = this.#weakestConcept(context);
    const mastery = concept ? (context.masteryByConcept[concept.slug] ?? 0) : 0;

    const paragraphs = [
      concept
        ? `Ein echter Nachweis für ${concept.name} ist nicht die richtige Antwort auf diese Aufgabe, sondern die Anwendung in einer anderen Situation.`
        : 'Ein echter Nachweis ist die Anwendung in einer anderen Situation, nicht das Wiedererkennen einer bekannten Aufgabe.',
      concept
        ? `Aufgabe zum Selbsttest: Beschreibe eine Situation aus deinem eigenen Alltag oder Beruf, in der ${concept.name} nützlich wäre. Skizziere dazu in zwei bis drei Zeilen, wie das Programm ungefähr aussähe.`
        : 'Aufgabe zum Selbsttest: Beschreibe eine eigene Situation, in der dieses Vorgehen nützlich wäre.',
    ];

    if (mastery > 0 && mastery < 60) {
      paragraphs.push(
        'Nach deinem bisherigen Verlauf ist dieses Konzept noch im Aufbau. Das ist an dieser Stelle völlig normal – es braucht meistens mehrere Anläufe an unterschiedlichen Aufgaben.',
      );
    } else if (mastery >= 80) {
      paragraphs.push(
        'Dein bisheriger Verlauf spricht dafür, dass dieses Konzept sitzt. Eine Transferaufgabe zeigt, ob es auch außerhalb des bekannten Musters trägt.',
      );
    }

    return {
      provider: this.name,
      paragraphs,
      nextStep: 'Formuliere ein eigenes Beispiel und skizziere den Code dazu.',
      caveat:
        'Der Kompetenzwert ist eine Orientierung aus deinem bisherigen Verlauf, keine Messung deiner Fähigkeit.',
    };
  }
}
