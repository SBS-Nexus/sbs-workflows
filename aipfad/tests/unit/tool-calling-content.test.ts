import { describe, expect, it } from 'vitest';
import {
  courseSchema, conceptSchema, labSchema, validateCourseGraph,
} from '@/domain/content/schema';
import { toolCallingConfigSchema } from '@/domain/labs/tool-calling-config';
import { course } from '@/content/course';
import { concepts } from '@/content/concepts';
import { labs } from '@/content/labs';
import { toPublicPayload } from '@/domain/content/exercise-payload';

const parsedCourse = courseSchema.parse(course);
const parsedConcepts = concepts.map((c) => conceptSchema.parse(c));
const parsedLabs = labs.map((l) => labSchema.parse(l));

describe('LP-11A – Offline-Grundlagen', () => {
  it('enthält drei vollständige Lektionen mit neun bewertbaren Aufgaben', () => {
    const modul = parsedCourse.modules.find((m) => m.slug === 'structured-outputs-tool-calling');
    expect(modul?.status).toBe('PUBLISHED');
    expect(modul?.lessons).toHaveLength(3);
    expect(modul?.lessons.flatMap((l) => l.exercises)).toHaveLength(9);
    expect(modul?.prerequisiteModuleSlugs).toContain('prompting-grundlagen');
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
      const oeffentlich = toPublicPayload(aufgabe.payload);
      expect(oeffentlich.items.map((i) => i.id)).not.toEqual(aufgabe.payload.correctOrder);
      expect(JSON.stringify(oeffentlich)).not.toContain('correctOrder');
    }
  });

  it('hat ein validiertes, rein offline arbeitendes Lab mit positiven und negativen Fällen', () => {
    const lab = parsedLabs.find((l) => l.slug === 'tool-calling-offline-lab');
    expect(lab?.kind).toBe('TOOL_CALLING');
    const cfg = toolCallingConfigSchema.parse(lab?.config);
    expect(cfg.betriebsart).toBe('offline-deterministisch');
    expect(cfg.strukturierteAusgaben).toHaveLength(3);
    expect(cfg.werkzeugAufrufe).toHaveLength(3);
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
    ]) expect(bekannt.has(slug)).toBe(true);
  });
});
