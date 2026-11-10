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
  ] as const)('lehnt __proto__ ohne Ausnahme ab: %s', (_name, pruefen, json) => {
    expect(() => pruefen(json)).not.toThrow();
    const ergebnis = pruefen(json);
    expect(ergebnis.ok).toBe(false);
    expect(ergebnis.meldungen.join(' ')).toContain('__proto__');
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
