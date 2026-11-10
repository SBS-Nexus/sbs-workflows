import { describe, expect, it } from 'vitest';
import {
  courseSchema,
  conceptSchema,
  labSchema,
  validateCourseGraph,
} from '@/domain/content/schema';
import { toolCallingConfigSchema } from '@/domain/labs/tool-calling-config';
import { course } from '@/content/course';
import { concepts } from '@/content/concepts';
import { labs } from '@/content/labs';
import { toPublicPayload } from '@/domain/grading/grade';

const parsedCourse = courseSchema.parse(course);
const parsedConcepts = concepts.map((c) => conceptSchema.parse(c));
const parsedLabs = labs.map((l) => labSchema.parse(l));

describe('LP-11A – Offline-Grundlagen', () => {
  it('enthält drei vollständige Lektionen mit neun bewertbaren Aufgaben', () => {
    const modul = parsedCourse.modules.find((m) => m.slug === 'structured-outputs-tool-calling');
    expect(modul?.status).toBe('PUBLISHED');
    expect(modul?.lessons).toHaveLength(3);
    expect(modul?.lessons.flatMap((l) => l.exercises)).toHaveLength(9);
    expect(modul?.prerequisiteModuleSlugs).toEqual([
      'prompting-grundlagen',
      'rag-wissen-mit-quellen',
    ]);
  });

  it('hält die vollständige Inhalts- und Konzeptvalidierung ein', () => {
    const ergebnis = validateCourseGraph({
      course: parsedCourse,
      concepts: parsedConcepts,
      labs: parsedLabs,
    });
    expect(ergebnis.issues.filter((x) => x.severity === 'error')).toEqual([]);
  });

  it('liefert niemals bereits korrekt sortierte Reihenfolgeaufgaben aus', () => {
    const modul = parsedCourse.modules.find((m) => m.slug === 'structured-outputs-tool-calling');
    for (const aufgabe of modul?.lessons.flatMap((l) => l.exercises) ?? []) {
      if (aufgabe.payload.kind !== 'ordering') continue;
      const oeffentlich = toPublicPayload(aufgabe.payload) as { items: { id: string }[] };
      expect(oeffentlich.items.map((i) => i.id)).not.toEqual(aufgabe.payload.correctOrder);
      expect(JSON.stringify(oeffentlich)).not.toContain('correctOrder');
    }
  });

  it('verteilt die richtigen Auswahlpositionen und verhindert den Immer-erstes-Musterfehler', () => {
    const modul = parsedCourse.modules.find((m) => m.slug === 'structured-outputs-tool-calling');
    expect(modul).toBeDefined();
    const positionen: number[] = [];
    for (const aufgabe of modul?.lessons.flatMap((l) => l.exercises) ?? []) {
      const payload = aufgabe.payload;
      if (payload.kind === 'singleChoice') {
        positionen.push(payload.options.findIndex((o) => o.id === payload.correctOptionId));
      }
      if (payload.kind === 'scenarioDecision') {
        positionen.push(payload.options.findIndex((o) => o.quality === 'optimal'));
      }
    }
    expect(positionen).toHaveLength(6);
    expect(new Set(positionen)).toEqual(new Set([0, 1, 2]));
    expect(positionen.filter((pos) => pos === 0)).toHaveLength(2);
  });

  it('definiert den Tool-Ergebnis-Ablauf in eindeutiger fachlicher Reihenfolge', () => {
    const modul = parsedCourse.modules.find((m) => m.slug === 'structured-outputs-tool-calling');
    const aufgabe = modul?.lessons
      .flatMap((l) => l.exercises)
      .find((e) => e.slug === 'tc-tool-grenze');
    expect(aufgabe?.payload.kind).toBe('ordering');
    if (aufgabe?.payload.kind !== 'ordering') throw new Error('Ordering-Aufgabe fehlt.');
    expect(aufgabe.payload.correctOrder).toEqual(['lesen', 'pruefen', 'belegen', 'entscheiden']);
    expect(aufgabe.payload.instruction).toContain('Vorgängers');
    const nachId = new Map(aufgabe.payload.items.map((i) => [i.id, i.text]));
    expect(nachId.get('belegen')).toMatch(/Nach der Quellenprüfung/);
    expect(nachId.get('entscheiden')).toMatch(/Erst nach dieser Belegzuordnung/);
  });

  it('hat drei fachlich gestufte Hilfen je Aufgabe statt generischer Ein-Satz-Hinweise', () => {
    const modul = parsedCourse.modules.find((m) => m.slug === 'structured-outputs-tool-calling');
    const aufgaben = modul?.lessons.flatMap((l) => l.exercises) ?? [];
    expect(aufgaben).toHaveLength(9);
    const unique = new Set<string>();
    for (const aufgabe of aufgaben) {
      expect(aufgabe.hints.map((h) => h.level)).toEqual([1, 2, 3]);
      expect(aufgabe.hints.map((h) => h.kind)).toEqual(['impulse', 'concept', 'structure']);
      expect(aufgabe.hints.every((h) => h.text.length > 35)).toBe(true);
      unique.add(aufgabe.hints[0]?.text ?? '');
    }
    expect(unique.size).toBe(9);
  });

  it('hat ein validiertes, rein offline arbeitendes Lab mit positiven und negativen Fällen', () => {
    const lab = parsedLabs.find((l) => l.slug === 'tool-calling-offline-lab');
    expect(lab?.kind).toBe('TOOL_CALLING');
    const cfg = toolCallingConfigSchema.parse(lab?.config);
    expect(cfg.betriebsart).toBe('offline-deterministisch');
    expect(cfg.strukturierteAusgaben).toHaveLength(3);
    expect(cfg.werkzeugAufrufe).toHaveLength(3);
    expect(cfg.toolErgebnis.auszug).toContain('Ignoriere');
  });

  it('verweist nur auf vorhandene Konzepte', () => {
    const bekannt = new Set(parsedConcepts.map((c) => c.slug));
    for (const slug of [
      'json-vertrag',
      'schema-validierung',
      'ausgabe-und-wahrheit',
      'tool-aufruf',
      'tool-berechtigung',
      'tool-resultat-untrusted',
    ])
      expect(bekannt.has(slug)).toBe(true);
  });
});
