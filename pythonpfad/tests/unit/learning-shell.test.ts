import { describe, expect, it } from 'vitest';
import {
  SHELL_AREAS,
  SHELL_NAV,
  activeShellHref,
  hubLinks,
  isWithin,
  shellNav,
  type ShellApp,
} from '@/lib/learning-shell';

/*
 * LP-03A — Navigationsvertrag der Lernpfade-Shell.
 *
 * KANONISCH ist `docs/learning-shell/learning-shell.test.ts`; jede App führt
 * eine bytegleiche Kopie unter `tests/unit/learning-shell.test.ts`.
 */

const APPS: readonly ShellApp[] = ['python', 'sql', 'ai'];

describe('Navigationsvertrag', () => {
  it('hält in jeder App die verbindliche Bereichsreihenfolge ein', () => {
    for (const app of APPS) {
      const positions = shellNav(app).map((item) => SHELL_AREAS.indexOf(item.id));
      expect(
        positions.every((position) => position >= 0),
        app,
      ).toBe(true);
      expect(positions, app).toEqual([...positions].sort((a, b) => a - b));
      expect(new Set(positions).size, `${app}: kein Bereich doppelt`).toBe(positions.length);
    }
  });

  it('führt kein Ziel doppelt und erfindet keine Bereiche', () => {
    for (const app of APPS) {
      const hrefs = shellNav(app).map((item) => item.href);
      expect(new Set(hrefs).size, `${app}: jede Route genau einmal`).toBe(hrefs.length);
    }
    // Python und SQL: Überblick IST /fortschritt — kein zweiter Fortschrittseintrag.
    for (const app of ['python', 'sql'] as const) {
      const ids = shellNav(app).map((item) => item.id);
      expect(ids).not.toContain('progress');
      expect(shellNav(app).find((item) => item.id === 'overview')?.href).toBe('/fortschritt');
    }
    // AIPfad: Überblick und Fortschritt getrennt; keine Projekte, kein Profil.
    const ai = shellNav('ai');
    expect(ai.find((item) => item.id === 'overview')?.href).toBe('/pfad');
    expect(ai.find((item) => item.id === 'progress')?.href).toBe('/fortschritt');
    expect(ai.map((item) => item.id)).not.toContain('projects');
    expect(ai.map((item) => item.id)).not.toContain('profile');
  });

  it('benennt die Praxis je App, mit derselben semantischen ID', () => {
    expect(shellNav('python').find((item) => item.id === 'practice')).toMatchObject({
      href: '/ueben',
      label: 'Üben',
    });
    expect(shellNav('sql').find((item) => item.id === 'practice')).toMatchObject({
      href: '/ueben',
      label: 'Üben',
    });
    expect(shellNav('ai').find((item) => item.id === 'practice')).toMatchObject({
      href: '/labs',
      label: 'Labs',
    });
  });
});

describe('aktiver Eintrag', () => {
  it('ordnet echte Detailrouten dem richtigen Bereich zu', () => {
    const ai = SHELL_NAV.ai;
    expect(activeShellHref('/lektion/grundlagen/3', ai)).toBe('/lernen');
    expect(activeShellHref('/labs/git-grundlagen', ai)).toBe('/labs');
    expect(activeShellHref('/fortschritt', ai)).toBe('/fortschritt');
    expect(activeShellHref('/pfad', ai)).toBe('/pfad');

    const python = SHELL_NAV.python;
    expect(activeShellHref('/ueben/variablen-1', python)).toBe('/ueben');
    expect(activeShellHref('/projekte/taschenrechner/abgabe', python)).toBe('/projekte');
    expect(activeShellHref('/fortschritt', python)).toBe('/fortschritt');
  });

  it('trifft nie über Teilstrings und markiert fremde Seiten nicht', () => {
    expect(isWithin('/lernen-extra', '/lernen')).toBe(false);
    expect(activeShellHref('/lektionen', SHELL_NAV.ai)).toBeNull();
    expect(activeShellHref('/wiederholenx', SHELL_NAV.sql)).toBeNull();
    expect(activeShellHref('/wissenslandkarte', SHELL_NAV.ai)).toBeNull();
    expect(activeShellHref('/', SHELL_NAV.python)).toBeNull();
    expect(activeShellHref('/labor', SHELL_NAV.python)).toBeNull();
  });

  it('wählt bei Verschachtelung genau einen Eintrag — den spezifischeren', () => {
    const entries = [{ href: '/lernen' }, { href: '/lernen/vertiefung' }, { href: '/admin' }];
    expect(activeShellHref('/lernen/vertiefung/kapitel-2', entries)).toBe('/lernen/vertiefung');
    expect(activeShellHref('/lernen/kapitel-2', entries)).toBe('/lernen');
    expect(activeShellHref('/admin/inhalte', entries)).toBe('/admin');
  });
});

describe('Hub-Ziele der Dachleiste', () => {
  it('erfindet ohne Konfiguration keine Adresse', () => {
    for (const value of [undefined, null, '', '   ']) expect(hubLinks(value)).toBeNull();
  });

  it('setzt Ziele ohne doppelte Schrägstriche zusammen', () => {
    expect(hubLinks(' https://lernpfade.example///')).toEqual({
      home: 'https://lernpfade.example',
      review: 'https://lernpfade.example/wiederholen',
      progress: 'https://lernpfade.example/fortschritt',
    });
    expect(hubLinks('https://plattform.example/hub/')).toEqual({
      home: 'https://plattform.example/hub',
      review: 'https://plattform.example/hub/wiederholen',
      progress: 'https://plattform.example/hub/fortschritt',
    });
    expect(hubLinks('http://127.0.0.1:3299')?.review).toBe('http://127.0.0.1:3299/wiederholen');
  });

  it('lehnt unbrauchbare oder unsichere Angaben ab', () => {
    for (const value of [
      'lernpfade.example',
      'javascript:alert(1)',
      'ftp://lernpfade.example',
      'https://nutzer:geheim@lernpfade.example',
      'https://lernpfade.example/?quelle=x',
      'https://lernpfade.example/#anker',
    ]) {
      expect(hubLinks(value), value).toBeNull();
    }
  });
});
