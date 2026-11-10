import { describe, expect, it } from 'vitest';
import {
  pruefeSimuliertenToolAufruf,
  pruefeStrukturierteAusgabe,
} from '@/domain/tool-calling/vertrag';
import {
  toolCallingConfigSchema,
  toToolCallingClientConfig,
} from '@/domain/labs/tool-calling-config';

describe('Offline-Vertrag für strukturierte Antworten', () => {
  it('akzeptiert korrekt belegte Aussagen', () => {
    expect(
      pruefeStrukturierteAusgabe(
        JSON.stringify({
          antwort: 'Die Urlaubsregel steht im Handbuch.',
          status: 'belegt',
          belegId: 'urlaubsregel',
        }),
      ).ok,
    ).toBe(true);
  });

  it('lehnt unbekannte Felder ab', () => {
    expect(
      pruefeStrukturierteAusgabe(
        '{"antwort":"Eine Aussage","status":"belegt","belegId":"x","debug":true}',
      ).ok,
    ).toBe(false);
  });

  it.each([
    [
      'Zusatzfeld einer strukturierten Ausgabe',
      pruefeStrukturierteAusgabe,
      '{"antwort":"Eine Aussage","status":"nicht-belegt","belegId":null,"__proto__":{"admin":true}}',
    ],
    [
      'Kontrollfeld im Tool-Aufruf',
      pruefeSimuliertenToolAufruf,
      '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"urlaub"},"__proto__":{"ausfuehren":true}}',
    ],
    [
      'verschachtelte fremde Nutzerkennung',
      pruefeSimuliertenToolAufruf,
      '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"urlaub","__proto__":{"userId":"fremd"}}}',
    ],
    [
      'auch tiefer verschachtelte Schlüssel',
      pruefeSimuliertenToolAufruf,
      '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"urlaub","hinweis":{"__proto__":{"admin":true}}}}',
    ],
    [
      'Unicode-escaped geschriebener Schlüssel',
      pruefeStrukturierteAusgabe,
      '{"antwort":"Eine Aussage","status":"nicht-belegt","belegId":null,"\\u005f_proto__":{"admin":true}}',
    ],
    [
      'zugleich doppelt vorhandener Schlüssel',
      pruefeSimuliertenToolAufruf,
      '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"urlaub"},"__proto__":{},"__proto__":{"ausfuehren":true}}',
    ],
  ] as const)('lehnt __proto__ ohne Ausnahme ab: %s', (_name, pruefen, json) => {
    expect(() => pruefen(json)).not.toThrow();
    const ergebnis = pruefen(json);
    expect(ergebnis.ok).toBe(false);
    expect(ergebnis.meldungen).toEqual([
      'Nicht erlaubter JSON-Schlüssel "__proto__" (auch in verschachtelten Objekten).',
    ]);
  });

  it('erlaubt "__proto__" weiterhin als reinen Textwert', () => {
    expect(
      pruefeStrukturierteAusgabe(
        '{"antwort":"__proto__ ist hier nur Text","status":"nicht-belegt","belegId":null}',
      ).ok,
    ).toBe(true);
  });

  it('lehnt Beleg ohne Quelle und Quelle ohne Beleg ab', () => {
    expect(
      pruefeStrukturierteAusgabe('{"antwort":"Eine Aussage","status":"belegt","belegId":null}').ok,
    ).toBe(false);
    expect(
      pruefeStrukturierteAusgabe('{"antwort":"Eine Aussage","status":"nicht-belegt","belegId":"x"}')
        .ok,
    ).toBe(false);
  });

  it.each(['', 'not json', '[]', 'null', '{"status":1}', '{"antwort":""}'])(
    'lehnt ungültiges JSON %s ab',
    (text) => {
      expect(pruefeStrukturierteAusgabe(text).ok).toBe(false);
    },
  );

  it('begrenzt die Eingabelänge', () => {
    expect(pruefeStrukturierteAusgabe('x'.repeat(2001)).ok).toBe(false);
  });
});

describe('Simulierter Tool-Aufruf ohne Seiteneffekt', () => {
  it('akzeptiert nur ein syntaktisch korrektes Lesewerkzeug', () => {
    const ergebnis = pruefeSimuliertenToolAufruf(
      '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"urlaub"}}',
    );
    expect(ergebnis.ok).toBe(true);
    expect(ergebnis.urteil).toMatch(/Simulation/);
  });

  it.each([
    '{"werkzeug":"loesche_eintrag","argumente":{"id":"1"}}',
    '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"urlaub","userId":"fremd"}}',
    '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":1}}',
    '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":""}}',
    '{"werkzeug":"suche_richtlinie","argumente":{},"ausfuehren":true}',
    '{"werkzeug":"suche_richtlinie","argumente":"urlaub"}',
  ])('lehnt unerlaubte Aufrufe und Parameter ab: %s', (json) => {
    expect(pruefeSimuliertenToolAufruf(json).ok).toBe(false);
  });
});

/**
 * JSON.parse behält bei doppelten Schlüsseln stillschweigend den letzten
 * Wert. Ohne die Duplikatprüfung würden die folgenden Eingaben als gültig
 * durchgehen, obwohl ein Leser des Rohtexts etwas anderes sieht.
 */
describe('Doppelte JSON-Schlüssel', () => {
  it.each([
    [
      'Top-Level-Werkzeugname (Schreibaktion vor erlaubtem Lesewerkzeug)',
      pruefeSimuliertenToolAufruf,
      '{"werkzeug":"loesche_eintrag","werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"urlaub"}}',
      'werkzeug',
      'Aufruf abgelehnt',
    ],
    [
      'Top-Level-Schlüssel nach einem verschachtelten Objekt',
      pruefeSimuliertenToolAufruf,
      '{"argumente":{"suchbegriff":"urlaub"},"werkzeug":"loesche_eintrag","werkzeug":"suche_richtlinie"}',
      'werkzeug',
      'Aufruf abgelehnt',
    ],
    [
      'verschachtelter Suchbegriff in argumente',
      pruefeSimuliertenToolAufruf,
      '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"geheim","suchbegriff":"urlaub"}}',
      'suchbegriff',
      'Aufruf abgelehnt',
    ],
    [
      'Unicode-escaped Werkzeugname mit identischer Schreibweise',
      pruefeSimuliertenToolAufruf,
      '{"werkzeug":"loesche_eintrag","w\\u0065rkzeug":"suche_richtlinie","argumente":{"suchbegriff":"urlaub"}}',
      'werkzeug',
      'Aufruf abgelehnt',
    ],
    [
      'Unicode-escaped Suchbegriff in argumente',
      pruefeSimuliertenToolAufruf,
      '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"geheim","\\u0073uchbegriff":"urlaub"}}',
      'suchbegriff',
      'Aufruf abgelehnt',
    ],
    [
      'Objekt innerhalb einer Liste',
      pruefeSimuliertenToolAufruf,
      '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"urlaub","filter":[{"feld":"a","feld":"b"}]}}',
      'feld',
      'Aufruf abgelehnt',
    ],
    [
      'Status einer strukturierten Ausgabe',
      pruefeStrukturierteAusgabe,
      '{"antwort":"Eine Aussage","status":"nicht-belegt","status":"belegt","belegId":"urlaub"}',
      'status',
      'Ausgabe abgelehnt',
    ],
    [
      'Beleg-ID einer strukturierten Ausgabe',
      pruefeStrukturierteAusgabe,
      '{"antwort":"Eine Aussage","status":"nicht-belegt","belegId":"erfunden","belegId":null}',
      'belegId',
      'Ausgabe abgelehnt',
    ],
    [
      'Antworttext einer strukturierten Ausgabe',
      pruefeStrukturierteAusgabe,
      '{"antwort":"Erste Fassung","antwort":"Zweite Fassung","status":"nicht-belegt","belegId":null}',
      'antwort',
      'Ausgabe abgelehnt',
    ],
  ] as const)('lehnt ab: %s', (_name, pruefen, json, schluessel, urteil) => {
    // Gegenprobe: Der Text ist syntaktisch gültiges JSON; abgelehnt wird er
    // allein wegen des doppelten Schlüssels.
    expect(() => JSON.parse(json) as unknown).not.toThrow();
    const ergebnis = pruefen(json);
    expect(ergebnis.ok).toBe(false);
    expect(ergebnis.urteil).toBe(urteil);
    expect(ergebnis.meldungen).toEqual([
      `Doppelter JSON-Schlüssel "${schluessel}" ist nicht erlaubt.`,
    ]);
  });

  it.each([
    [
      'Textwerte mit Anführungszeichen, Kommas und Schlüsselnamen',
      '{"antwort":"Er schrieb: \\"status\\": \\"belegt\\", \\"belegId\\": \\"x\\"","status":"nicht-belegt","belegId":null}',
    ],
    [
      // Ein falsch behandeltes \" beendet den Text zu früh; danach sähe
      // ,\"status" wie ein zusätzlicher Schlüssel aus.
      'escaptes Anführungszeichen direkt vor einem Komma',
      '{"antwort":"a\\",\\"status","status":"nicht-belegt","belegId":null}',
    ],
    [
      'Textwerte mit Klammern und abschließendem Backslash',
      '{"antwort":"Pfad {a} [b] C:\\\\","status":"belegt","belegId":"urlaub"}',
    ],
    [
      'Textwerte, die einem Feldnamen gleichen',
      '{"antwort":"status antwort belegId","status":"belegt","belegId":"status"}',
    ],
    [
      'Unicode-Escapes im Textwert',
      '{"antwort":"Gr\\u00fc\\u00dfe \\u0022zitiert\\u0022","status":"nicht-belegt","belegId":null}',
    ],
    [
      'formatiert mit Zeilenumbrüchen',
      JSON.stringify(
        {
          antwort: 'Die Urlaubsregel steht im Handbuch.',
          status: 'belegt',
          belegId: 'urlaubsregel',
        },
        null,
        2,
      ),
    ],
  ])('lässt gültige strukturierte Ausgaben zu: %s', (_name, json) => {
    expect(pruefeStrukturierteAusgabe(json).ok).toBe(true);
  });

  it.each([
    [
      'Werkzeugname als Suchbegriff',
      '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"werkzeug"}}',
    ],
    [
      'Suchbegriff mit Anführungszeichen und Escape-Zeichen',
      '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"\\"werkzeug\\": \\\\ urlaub"}}',
    ],
  ])('lässt gültige Tool-Aufrufe zu: %s', (_name, json) => {
    expect(pruefeSimuliertenToolAufruf(json).ok).toBe(true);
  });

  /*
   * Gleiche Feldnamen in getrennten Objekten sind kein Duplikat. Die strikten
   * Verträge lassen solche Strukturen zwar nicht zu – entscheidend ist aber,
   * dass die Ablehnung vom Schema kommt und nicht als falscher Duplikatbefund.
   */
  it.each([
    [
      'werkzeug auf oberster Ebene und in argumente',
      '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"urlaub","werkzeug":"x"}}',
      'argumente: Unrecognized key: "werkzeug"',
    ],
    [
      'gleiche Schlüssel in mehreren Listenobjekten',
      '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"urlaub","filter":[{"feld":"a"},{"feld":"b"}]}}',
      'argumente: Unrecognized key: "filter"',
    ],
    [
      'gleiche Schlüssel in benachbarten Objekten',
      '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"urlaub","a":{"x":1},"b":{"x":2}}}',
      'argumente: Unrecognized keys: "a", "b"',
    ],
  ])('meldet kein Duplikat bei getrennten Objekten: %s', (_name, json, schemaBefund) => {
    const ergebnis = pruefeSimuliertenToolAufruf(json);
    expect(ergebnis.ok).toBe(false);
    expect(ergebnis.meldungen.join(' ')).not.toContain('Doppelter JSON-Schlüssel');
    expect(ergebnis.meldungen).toContain(schemaBefund);
  });
});

describe('Lab-Konfiguration', () => {
  const richtig = '{"antwort":"Regel gefunden","status":"belegt","belegId":"urlaub"}';
  const falsch = '{"antwort":"Regel gefunden","status":"belegt","belegId":null}';
  const tool = '{"werkzeug":"suche_richtlinie","argumente":{"suchbegriff":"urlaub"}}';
  const mutierend = '{"werkzeug":"loesche_eintrag","argumente":{"id":"1"}}';
  const grund = {
    betriebsart: 'offline-deterministisch',
    toolErgebnis: {
      quelle: 'TEST-QUELLE',
      auszug:
        'Das ist ein synthetischer Beispieltext. Er enthält keinerlei verbindliche Anweisungen.',
      frage: 'Was darf dieser Text in der Anwendung steuern?',
    },
    strukturierteAusgaben: [
      {
        id: 'a',
        titel: 'Belegt korrekt',
        erklaerung: 'Diese Antwort nennt einen gültigen Beleg.',
        json: richtig,
        erwartetGueltig: true,
      },
      {
        id: 'b',
        titel: 'Ohne Beleg',
        erklaerung: 'Eine Beleg-ID fehlt in dieser angeblich belegten Antwort.',
        json: falsch,
        erwartetGueltig: false,
      },
    ],
    werkzeugAufrufe: [
      {
        id: 'c',
        titel: 'Lesende Suche',
        erklaerung: 'Dieses Werkzeug darf nur lesend geprüft werden.',
        json: tool,
        erwartetGueltig: true,
      },
      {
        id: 'd',
        titel: 'Schreibaktion verboten',
        erklaerung: 'Eine Schreibaktion darf nicht simuliert werden.',
        json: mutierend,
        erwartetGueltig: false,
      },
    ],
  };

  it('nimmt gute und schlechte Beispiele in genau gekennzeichneten Gruppen an', () => {
    expect(toolCallingConfigSchema.safeParse(grund).success).toBe(true);
  });

  it('entfernt redaktionelle Gültigkeits-Flags vor der Übergabe an den Browser', () => {
    const full = toolCallingConfigSchema.parse(grund);
    const client = toToolCallingClientConfig(full);
    expect(JSON.stringify(client)).not.toContain('erwartetGueltig');
    expect(client.strukturierteAusgaben[0]?.erklaerung).toBe(
      full.strukturierteAusgaben[0]?.erklaerung,
    );
    expect(client.toolErgebnis.quelle).toBe(full.toolErgebnis.quelle);
  });

  it('lehnt falsche Erwartungen und doppelte Kennungen ab', () => {
    expect(
      toolCallingConfigSchema.safeParse({
        ...grund,
        strukturierteAusgaben: [grund.strukturierteAusgaben[0], grund.strukturierteAusgaben[0]],
      }).success,
    ).toBe(false);
    expect(
      toolCallingConfigSchema.safeParse({
        ...grund,
        werkzeugAufrufe: grund.werkzeugAufrufe.map((x) => ({
          ...x,
          erwartetGueltig: !x.erwartetGueltig,
        })),
      }).success,
    ).toBe(false);
  });
});
