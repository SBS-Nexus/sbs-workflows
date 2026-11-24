#!/usr/bin/env node
/**
 * E4.4 — Drift-Check für den Anmeldevertrag (docs/learning-auth/).
 *
 * Prüft, nur lesend:
 *  1. Jede App führt bytegleiche Kopien der kanonischen Dateien.
 *  2. Jede App hat ihren Adapter `src/server/auth/zentral-app.ts` mit
 *     `ANMELDE_COOKIE = '<app>_anmeldung'` und `STARTSEITE`.
 *  3. `src/server/env.ts` nimmt die Felder des Vertrags auf und prüft sie.
 *  4. Die Hinweisseite `/auth/fehler` nutzt die Texte des Vertrags.
 *  5. Das Schema hat die Felder der Verknüpfung und der Rückkanal-Abmeldung.
 *  6. `openid-client`, `jose` und die Festlegung von `oauth4webapi` stimmen in
 *     allen Apps überein.
 *  7. Die Plattformquellen nehmen das Zugriffstoken des Hubs an (E4.5).
 *
 * Es wird nichts repariert. Aufruf: `node scripts/check-learning-auth.mjs`.
 * Exit-Code 0 = alles im Vertrag, 1 = Drift (mit Liste der Befunde).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonicalDir = path.join(root, 'docs', 'learning-auth');

/** Kanonische Datei → Ziel in jeder App (relativ zur App-Wurzel). */
const SHARED = [
  ['zentral-zustand.ts', 'src/server/auth/zentral-zustand.ts'],
  ['zentral-identitaet.ts', 'src/server/auth/zentral-identitaet.ts'],
  ['zentral-konfiguration.ts', 'src/server/auth/zentral-konfiguration.ts'],
  ['zentral-protokoll.ts', 'src/server/auth/zentral-protokoll.ts'],
  ['zentral.ts', 'src/server/auth/zentral.ts'],
  ['zentral-konto.ts', 'src/server/auth/zentral-konto.ts'],
  ['zentral-cookie.ts', 'src/server/auth/zentral-cookie.ts'],
  ['zentral-hinweise.ts', 'src/server/auth/zentral-hinweise.ts'],
  ['zentral-zugriff.ts', 'src/server/auth/zentral-zugriff.ts'],
  ['route-anmelden.ts', 'src/app/auth/anmelden/route.ts'],
  ['route-rueckkehr.ts', 'src/app/auth/rueckkehr/route.ts'],
  ['route-abmelden-rueckkanal.ts', 'src/app/auth/abmelden-rueckkanal/route.ts'],
  ['zentral-zustand.test.ts', 'tests/unit/zentral-zustand.test.ts'],
  ['zentral-identitaet.test.ts', 'tests/unit/zentral-identitaet.test.ts'],
  ['zentral-konfiguration.test.ts', 'tests/unit/zentral-konfiguration.test.ts'],
  ['zentrale-anmeldung.integration.test.ts', 'tests/integration/zentrale-anmeldung.test.ts'],
  ['e2e-konto.ts', 'e2e-konto/konto.ts'],
  ['e2e-zentrale-anmeldung.spec.ts', 'e2e-konto/zentrale-anmeldung.spec.ts'],
];

const APPS = ['pythonpfad', 'sqlpfad', 'aipfad'];
const PAKETE = ['openid-client', 'jose'];

const failures = [];
const fail = (message) => failures.push(message);
const rel = (file) => path.relative(root, file);
const read = (file) => (existsSync(file) ? readFileSync(file) : null);
const text = (file) => read(file)?.toString('utf8') ?? null;

for (const [canonical, target] of SHARED) {
  const canonicalFile = path.join(canonicalDir, canonical);
  const soll = read(canonicalFile);
  if (soll === null) {
    fail(`kanonische Datei fehlt: ${rel(canonicalFile)}`);
    continue;
  }
  for (const app of APPS) {
    const file = path.join(root, app, target);
    const ist = read(file);
    if (ist === null) fail(`${app}: Kopie fehlt: ${rel(file)}`);
    else if (!ist.equals(soll))
      fail(`${app}: weicht vom Vertrag ab: ${rel(file)} (Quelle ${canonical})`);
  }
}

const versionen = {};
for (const app of APPS) {
  const adapter = text(path.join(root, app, 'src/server/auth/zentral-app.ts'));
  if (adapter === null) {
    fail(`${app}: Adapter fehlt: ${app}/src/server/auth/zentral-app.ts`);
  } else {
    if (!adapter.includes(`export const ANMELDE_COOKIE = '${app}_anmeldung';`)) {
      fail(`${app}: zentral-app.ts setzt ANMELDE_COOKIE nicht auf '${app}_anmeldung'`);
    }
    if (!/export const STARTSEITE = '\/[a-z-]+';/.test(adapter)) {
      fail(`${app}: zentral-app.ts nennt keine STARTSEITE`);
    }
  }

  const env = text(path.join(root, app, 'src/server/env.ts')) ?? '';
  if (!env.includes('...zentraleAnmeldungFelder') || !env.includes('pruefeZentraleAnmeldung')) {
    fail(`${app}: src/server/env.ts nimmt die Felder des Vertrags nicht auf`);
  }

  const seite = text(path.join(root, app, 'src/app/auth/fehler/page.tsx')) ?? '';
  if (!seite.includes('hinweisFuer(')) {
    fail(`${app}: /auth/fehler fehlt oder nutzt die Texte des Vertrags nicht`);
  }

  // E4.5: Die Plattformquellen nehmen das Zugriffstoken des Hubs an.
  for (const quelle of ['progress-source', 'review-source']) {
    const route = text(path.join(root, app, `src/app/api/platform/${quelle}/route.ts`)) ?? '';
    if (!route.includes('nutzerAusHubToken(request)')) {
      fail(`${app}: /api/platform/${quelle} prüft kein Zugriffstoken des Hubs (nutzerAusHubToken)`);
    }
  }

  const schema = text(path.join(root, app, 'prisma/schema.prisma')) ?? '';
  for (const feld of [
    'authSubject  String?   @unique',
    'authLinkedAt DateTime?',
    'oidcSid',
    'oidcIdToken',
  ]) {
    if (!schema.includes(feld)) fail(`${app}: Schema ohne ${feld.split(' ')[0]}`);
  }

  const paket = JSON.parse(text(path.join(root, app, 'package.json')) ?? '{}');
  versionen[app] = {
    ...Object.fromEntries(PAKETE.map((name) => [name, paket.dependencies?.[name]])),
    oauth4webapi: paket.overrides?.oauth4webapi,
  };
}

const [erste, ...weitere] = APPS;
for (const name of [...PAKETE, 'oauth4webapi']) {
  if (!versionen[erste][name]) fail(`${erste}: ${name} ist nicht festgelegt`);
  for (const app of weitere) {
    if (versionen[app][name] !== versionen[erste][name]) {
      fail(
        `${app}: ${name} ${versionen[app][name] ?? 'fehlt'}, ${erste} hat ${versionen[erste][name]}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error(`Anmeldevertrag: ${failures.length} Befund(e)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `Anmeldevertrag: ${SHARED.length} Dateien in ${APPS.length} Apps bytegleich, Adapter, Umgebung, Schema und Pakete stimmen.`,
);
