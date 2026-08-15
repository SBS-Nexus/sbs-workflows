import { describe, expect, it } from 'vitest';
import { beschreibeErgebnis, istZahlenspalte, zeigeWert } from '@/domain/sql/anzeige';
import type { Resultset } from '@/domain/sql/resultset';

const r = (spalten: string[], zeilen: unknown[][]): Resultset => ({ spalten, zeilen }) as Resultset;

describe('Werte anzeigen', () => {
  it('benennt NULL, statt die Zelle leer zu lassen', () => {
    /*
     * Die wichtigste Zeile dieser Datei. Eine leere Zelle könnte eine leere
     * Zeichenfolge sein, eine Null oder ein fehlender Wert - genau die
     * Verwechslung, die die erste Lektion ausräumen will.
     */
    const wert = zeigeWert(null);
    expect(wert.text).toBe('NULL');
    expect(wert.art).toBe('null');
  });

  it('unterscheidet NULL von der leeren Zeichenfolge', () => {
    expect(zeigeWert('').text).toBe('(leer)');
    expect(zeigeWert('').art).toBe('text');
    expect(zeigeWert(null).text).not.toBe(zeigeWert('').text);
  });

  it('unterscheidet NULL von der Zahl 0', () => {
    expect(zeigeWert(0).text).toBe('0');
    expect(zeigeWert(0).art).toBe('zahl');
  });

  it('gibt NULL einen vorlesbaren Satz', () => {
    // Vorgelesen wäre „NULL" nicht von der Zahl 0 zu unterscheiden.
    expect(zeigeWert(null).vorlesen).toMatch(/kein Wert/i);
  });

  it('zeigt bit als 0 und 1, nicht als true und false', () => {
    // Die Anzeige folgt der Datenbank, nicht JavaScript.
    expect(zeigeWert(true).text).toBe('1');
    expect(zeigeWert(false).text).toBe('0');
  });

  it('schreibt Zahlen ohne Tausendertrennung', () => {
    // Wer die Zahl weiterverwendet, kopiert sie sonst falsch.
    expect(zeigeWert(1234567).text).toBe('1234567');
  });

  it('macht aus -0 eine 0', () => {
    expect(zeigeWert(-0).text).toBe('0');
  });

  it('kürzt ein Datum ohne Zeitanteil auf das Datum', () => {
    expect(zeigeWert(new Date('2026-03-01T00:00:00.000Z')).text).toBe('2026-03-01');
  });

  it('behält den Zeitanteil, wenn einer da ist', () => {
    expect(zeigeWert(new Date('2026-03-01T14:30:00.000Z')).text).toContain('14:30');
  });

  it('kürzt einen Binärwert und nennt seine Länge', () => {
    const wert = zeigeWert(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    expect(wert.text.startsWith('0x')).toBe(true);
    expect(wert.text.endsWith('…')).toBe(true);
    expect(wert.vorlesen).toContain('10 Byte');
  });
});

describe('Ergebnis beschreiben', () => {
  it('nennt die Zahl der Zeilen', () => {
    expect(beschreibeErgebnis(r(['A'], [[1], [2], [3]]))).toBe('3 Zeilen');
  });

  it('setzt den Singular richtig', () => {
    expect(beschreibeErgebnis(r(['A'], [[1]]))).toBe('1 Zeile');
  });

  it('behandelt das leere Ergebnis als Ergebnis, nicht als Fehler', () => {
    /*
     * „Kein Ergebnis" ließe jemanden den Fehler in der Anwendung suchen. Der
     * Satz zeigt stattdessen auf die WHERE-Bedingung - dort liegt er fast
     * immer.
     */
    const satz = beschreibeErgebnis(r(['A'], []));
    expect(satz).toContain('Bedingung');
    expect(satz).not.toMatch(/fehler/i);
  });

  it('nennt bei einem gekürzten Ergebnis beide Zahlen', () => {
    // Nur die angezeigte Zahl zu nennen würde die gekürzte Anzeige als
    // vollständiges Ergebnis ausgeben.
    const satz = beschreibeErgebnis(r(['A'], [[1], [2]]), {
      abgeschnitten: true,
      gelieferteZeilen: 1240,
    });
    expect(satz).toContain('1240');
    expect(satz).toContain('2');
  });
});

describe('Zahlenspalten erkennen', () => {
  it('erkennt eine reine Zahlenspalte', () => {
    expect(istZahlenspalte(r(['Anzahl'], [[1], [2], [3]]), 0)).toBe(true);
  });

  it('zählt NULL nicht dagegen', () => {
    expect(istZahlenspalte(r(['Anzahl'], [[1], [null], [3]]), 0)).toBe(true);
  });

  it('erkennt eine gemischte Spalte nicht als Zahlenspalte', () => {
    expect(istZahlenspalte(r(['Wert'], [[1], ['zwei']]), 0)).toBe(false);
  });

  it('richtet eine Spalte ohne Werte nicht aus', () => {
    // Eine Aussage, die die Daten nicht hergeben, wird nicht getroffen.
    expect(istZahlenspalte(r(['Anzahl'], [[null], [null]]), 0)).toBe(false);
  });

  it('betrachtet jede Spalte für sich', () => {
    const ergebnis = r(['Name', 'Anzahl'], [['Anna', 3]]);
    expect(istZahlenspalte(ergebnis, 0)).toBe(false);
    expect(istZahlenspalte(ergebnis, 1)).toBe(true);
  });
});
