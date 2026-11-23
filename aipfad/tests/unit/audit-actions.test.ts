import { describe, expect, it } from 'vitest';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_OWNERS,
  istAuditAction,
  type AuditAction,
} from '@/server/audit/actions';

/**
 * Das Verzeichnis der prüfpflichtigen Vorgänge (E07/ENT-B06).
 *
 * Geprüft wird hier nicht, dass die Liste „richtig" ist — das entscheidet
 * der Fahrplan —, sondern dass sie EINE Liste bleibt: Anzahl, Eindeutigkeit
 * und dass jeder Vorgang genau einen Eigentümer hat. Ein Vorgang ohne
 * Eigentümer wäre ein Ereignis, das niemand liefert; ein Eigentümer ohne
 * Vorgang ein Erzeuger ohne Ziel.
 */

const ERWARTETE_ANZAHL = 17;

describe('Auditvorgangsverzeichnis', () => {
  it('enthält genau die siebzehn geplanten Vorgänge', () => {
    expect(AUDIT_ACTIONS).toHaveLength(ERWARTETE_ANZAHL);
    expect(Object.keys(AUDIT_ACTION_OWNERS)).toHaveLength(ERWARTETE_ANZAHL);
  });

  it('führt jede Bezeichnung nur einmal', () => {
    expect(new Set(AUDIT_ACTIONS).size).toBe(AUDIT_ACTIONS.length);
  });

  it('gibt jedem Vorgang genau einen Eigentümer, keinen leeren', () => {
    for (const action of AUDIT_ACTIONS) {
      const eigentuemer = AUDIT_ACTION_OWNERS[action];
      expect(typeof eigentuemer).toBe('string');
      expect(eigentuemer.length).toBeGreaterThan(0);
    }
    // Keine Bezeichnung ohne Eintrag: Schlüsselmenge und Vorgangsliste sind
    // dieselbe Menge, weil der Typ aus der Abbildung abgeleitet ist.
    expect(Object.keys(AUDIT_ACTION_OWNERS).sort()).toEqual([...AUDIT_ACTIONS].sort());
  });

  it('nennt die Eigentümer, die der Fahrplan zuweist', () => {
    // Stichproben über beide Blöcke: Fundament und bezahlter Einsatz.
    expect(AUDIT_ACTION_OWNERS.PERSONAL_DATA_EXPORTED).toBe('E04B');
    expect(AUDIT_ACTION_OWNERS.ACCOUNT_DELETED).toBe('E04C');
    expect(AUDIT_ACTION_OWNERS.PLATFORM_ROLE_MIGRATED).toBe('E09B');
    expect(AUDIT_ACTION_OWNERS.OIDC_CONFIGURATION_CHANGED).toBe('E12');
    expect(AUDIT_ACTION_OWNERS.ORGANIZATION_DELETED).toBe('E13B');
  });

  it('erkennt fremde Bezeichnungen zur Laufzeit als ungültig', () => {
    expect(istAuditAction('ACCOUNT_DELETED')).toBe(true);
    expect(istAuditAction('ERFUNDEN')).toBe(false);
    expect(istAuditAction('')).toBe(false);
    expect(istAuditAction(undefined)).toBe(false);
    expect(istAuditAction(null)).toBe(false);
    expect(istAuditAction(42)).toBe(false);
    // Geerbte Eigenschaften dürfen nicht durchrutschen: `Object.hasOwn`
    // statt `in`, sonst gälte etwa `toString` als gültiger Vorgang.
    expect(istAuditAction('toString')).toBe(false);
    expect(istAuditAction('constructor')).toBe(false);
  });

  it('nennt keinen Vorgang, den E07 selbst erzeugen müsste', () => {
    // E07 liefert die Grundlage, nicht die Ereignisse. Stünde hier ein
    // Eigentümer "E07", wäre das ein Erzeuger, den dieser Punkt schuldet.
    const eigentuemer = new Set(Object.values(AUDIT_ACTION_OWNERS) as string[]);
    expect(eigentuemer.has('E07')).toBe(false);
  });

  it('hält den Typ und die Abbildung in einer Quelle zusammen', () => {
    // Rein statisch: Wäre `AuditAction` ein zweiter, eigener Union, ließe
    // sich hier eine Bezeichnung zuweisen, die in der Abbildung fehlt.
    const action: AuditAction = 'COHORT_CREATED';
    expect(AUDIT_ACTION_OWNERS[action]).toBe('E11A');
  });
});
