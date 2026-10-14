import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Badge, Callout } from '@/components/ui/primitives';

/*
 * LP-03B — die app-lokalen Badge-/Callout-Adapter beziehen Zustand und
 * Darstellung aus dem gemeinsamen Statusvertrag. Gerendert werden die echten
 * Komponenten, nicht eine Nachbildung.
 */

function callout(props: Record<string, unknown>): string {
  return renderToStaticMarkup(createElement(Callout, props as never, 'Inhalt'));
}

function badge(tone: string): string {
  return renderToStaticMarkup(createElement(Badge, { tone } as never, 'Text'));
}

describe('Callout-Adapter', () => {
  it.each([
    ['info', 'info', 'Hinweis'],
    ['success', 'success', 'Erfolg'],
    ['caution', 'warning', 'Achtung'],
    ['alert', 'danger', 'Fehler'],
    ['warning', 'warning', 'Achtung'],
    ['danger', 'danger', 'Fehler'],
  ])('%s → data-lp-tone="%s", Standardtitel „%s"', (tone, canonical, title) => {
    const html = callout({ tone });
    expect(html).toContain('class="lp-feedback lp-feedback-callout"');
    expect(html).toContain(`data-lp-tone="${canonical}"`);
    expect(html).toContain(`<span>${title}</span>`);
  });

  it('behält den fachlichen Titel und zusätzliche Klassen', () => {
    const html = callout({ tone: 'alert', title: 'Anmeldung nicht möglich', className: 'mt-3' });
    expect(html).toContain('<span>Anmeldung nicht möglich</span>');
    expect(html).not.toContain('<span>Fehler</span>');
    expect(html).toContain('class="lp-feedback lp-feedback-callout mt-3"');
  });

  it('statisch ohne Live-Region (auch danger); live höflich, nie role="alert"', () => {
    const still = callout({ tone: 'alert' });
    expect(still).not.toContain('role=');
    expect(still).not.toContain('aria-live');
    const live = callout({ tone: 'alert', live: true });
    expect(live).toContain('role="status"');
    expect(live).toContain('aria-live="polite"');
    expect(live).not.toContain('role="alert"');
  });

  it('Symbol ist dekorativ und trägt die Vertragsklasse', () => {
    const html = callout({ tone: 'caution' });
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).toMatch(/<svg[^>]*class="lp-feedback-icon"/);
  });

  it('keine app-eigenen Statusfarben mehr am Callout', () => {
    for (const tone of ['info', 'success', 'caution', 'alert']) {
      expect(callout({ tone })).not.toMatch(
        /(bg|border|text)-(\[var|success|caution|alert|wire|ink)/,
      );
    }
  });
});

describe('Badge-Adapter', () => {
  it.each([
    ['neutral', 'neutral'],
    ['info', 'info'],
    ['success', 'success'],
    ['caution', 'warning'],
    ['alert', 'danger'],
    ['due', 'due'],
    ['in-progress', 'in-progress'],
    ['locked', 'locked'],
  ])('%s → data-lp-tone="%s"', (tone, canonical) => {
    const html = badge(tone);
    expect(html).toContain('lp-feedback lp-feedback-badge');
    expect(html).toContain(`data-lp-tone="${canonical}"`);
    expect(html).not.toMatch(/(bg|border|text)-(\[var|success|caution|alert|wire|ink)/);
  });
});
