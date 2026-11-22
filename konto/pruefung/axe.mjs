// axe-Prüfung der Kontoseiten auf konto.lernpfade.net (E4.1c, docs/E4-1-BAUPLAN.md).
// Aufruf: node konto/pruefung/axe.mjs (braucht `npx playwright install chromium-headless-shell`).
// Legt kein Konto an und gibt kein Passwort ein; für Passwortseiten dient eine
// erfundene Adresse.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

// Playwright und axe-core kommen aus einer App (z. B. pythonpfad/node_modules), Pfad über PRUEF_NODE_MODULES.
const NM = (
  process.env.PRUEF_NODE_MODULES ??
  new URL('../../pythonpfad/node_modules/', import.meta.url).pathname
).replace(/\/?$/, '/');
const require = createRequire(NM);
const { chromium } = require('playwright');
const AXE = readFileSync(NM + 'axe-core/axe.min.js', 'utf8');
const BASIS = 'https://konto.lernpfade.net/ui/v2/login';
const ADRESSE = 'axe-pruefung@example.test';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function pruefe(seite) {
  await seite.evaluate(AXE);
  return seite.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      hilfe: v.help,
      anzahl: v.nodes.length,
      ziele: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
      details: v.nodes
        .slice(0, 2)
        .map((n) => (n.failureSummary || '').split('\n').slice(1, 3).join(' ').slice(0, 220)),
    }));
  }, TAGS);
}

const WEGE = {
  anmeldung: async (s) => s.goto(`${BASIS}/loginname`),
  registrierung: async (s) => s.goto(`${BASIS}/register`),
  kontoauswahl: async (s) => s.goto(`${BASIS}/accounts`),
  abmelden: async (s) => s.goto(`${BASIS}/logout`),
  bestaetigen: async (s) => s.goto(`${BASIS}/verify`),
  passwort: async (s) => {
    await s.goto(`${BASIS}/loginname`);
    await s.locator('input[type="text"]').first().fill(ADRESSE);
    await s.locator('button[type="submit"]').first().click();
    await s.waitForURL(/\/password/, { timeout: 15000 });
  },
  zuruecksetzen: async (s) => {
    await WEGE.passwort(s);
    await s.getByText('Passwort vergessen?').click();
    await s.waitForURL(/\/password\/set/, { timeout: 15000 });
  },
};

const browser = await chromium.launch();
const bericht = [];
for (const [name, weg] of Object.entries(WEGE)) {
  for (const schema of ['light', 'dark']) {
    for (const [geraet, viewport] of [
      ['desktop', { width: 1280, height: 860 }],
      ['mobil', { width: 390, height: 844 }],
    ]) {
      const kontext = await browser.newContext({ colorScheme: schema, viewport, locale: 'de-DE' });
      const seite = await kontext.newPage();
      let eintrag = { seite: name, schema, geraet };
      try {
        await weg(seite);
        await seite.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await seite.waitForTimeout(800);
        eintrag.url = new URL(seite.url()).pathname;
        eintrag.titel = await seite.title();
        eintrag.befunde = await pruefe(seite);
      } catch (fehler) {
        eintrag.fehler = String(fehler.message).split('\n')[0].slice(0, 200);
      }
      bericht.push(eintrag);
      await kontext.close();
    }
  }
}
await browser.close();
writeFileSync(
  process.env.PRUEF_BERICHT ?? 'konto-axe-bericht.json',
  JSON.stringify(bericht, null, 1),
);

// Zusammenfassung: je Regel, auf welchen Seiten/Modi
const regeln = {};
for (const e of bericht) {
  if (e.fehler) {
    console.log(`FEHLER ${e.seite} ${e.schema} ${e.geraet}: ${e.fehler}`);
    continue;
  }
  for (const b of e.befunde) {
    regeln[b.id] ??= {
      impact: b.impact,
      hilfe: b.hilfe,
      wo: new Set(),
      ziele: new Set(),
      details: new Set(),
    };
    regeln[b.id].wo.add(`${e.seite}/${e.schema}/${e.geraet}`);
    b.ziele.forEach((z) => regeln[b.id].ziele.add(z));
    b.details.forEach((d) => d && regeln[b.id].details.add(d));
  }
}
const ohne = bericht
  .filter((e) => !e.fehler && e.befunde.length === 0)
  .map((e) => `${e.seite}/${e.schema}/${e.geraet}`);
console.log(`Geprüft: ${bericht.length} Ansichten, ohne Befund: ${ohne.length}`);
for (const [id, r] of Object.entries(regeln)) {
  console.log(
    `\n[${r.impact}] ${id} – ${r.hilfe}\n  Ansichten (${r.wo.size}): ${[...r.wo].slice(0, 6).join(', ')}${r.wo.size > 6 ? ' …' : ''}\n  Elemente: ${[...r.ziele].slice(0, 4).join(' | ')}\n  Details: ${[...r.details].slice(0, 2).join(' | ')}`,
  );
}
