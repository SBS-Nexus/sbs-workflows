#!/usr/bin/env node
/**
 * LP-05B/LP-07 — Drift-Check für die schreibgeschützten Plattformquellen.
 *
 * PythonPfad, SQLPfad und AIPfad liefern dem Hub Wiederholungen
 * (`/api/platform/review-source`) und Fortschritt
 * (`/api/platform/progress-source`). Vertrag, Prüfung und HTTP-Grenze stehen
 * je App in `src/server/platform/*-source-http.ts` – laut Dateikopf
 * „wortgleich", erzwungen hat das bisher nichts (ROADMAP, Nacharbeiten aus
 * dem Integrationsreview).
 *
 * Prüft, nur lesend:
 *  1. Beide Adapterdateien sind in den drei Fach-Apps bytegleich.
 *  2. Die Schema-Version jedes Adapters ist die, die der Hub annimmt
 *     (`lernpfade/src/domain/review/federation.ts`,
 *     `lernpfade/src/domain/progress/contract.ts`). Erhöht eine Seite allein,
 *     meldet der Hub jede Quelle als ungültig.
 *  3. Die Quellnamen des Adapters sind genau die, die der Hub kennt.
 *  4. Jede App bindet beide Routen an den Adapter an und meldet sich unter
 *     ihrem eigenen Namen – ein kopierter Name ordnete im Hub die Daten der
 *     falschen App zu.
 *
 * Es wird nichts repariert. Aufruf: `node scripts/check-platform-sources.mjs`.
 * Exit-Code 0 = alles im Vertrag, 1 = Drift (mit Liste der Befunde).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** App-Verzeichnis → Quellname, unter dem sie sich beim Hub meldet. */
const APPS = { pythonpfad: 'python', sqlpfad: 'sql', aipfad: 'ai' };

const QUELLEN = [
  {
    art: 'review',
    adapter: 'src/server/platform/review-source-http.ts',
    route: 'src/app/api/platform/review-source/route.ts',
    handler: 'handleReviewSourceRequest',
    version: 'REVIEW_SOURCE_SCHEMA_VERSION',
    namenstyp: 'PlatformReviewSourceName',
    hub: 'lernpfade/src/domain/review/federation.ts',
    hubNamen: 'FEDERATED_SOURCES',
  },
  {
    art: 'progress',
    adapter: 'src/server/platform/progress-source-http.ts',
    route: 'src/app/api/platform/progress-source/route.ts',
    handler: 'handleProgressSourceRequest',
    version: 'PROGRESS_SOURCE_SCHEMA_VERSION',
    namenstyp: 'PlatformProgressSourceName',
    hub: 'lernpfade/src/domain/progress/contract.ts',
    hubNamen: 'PROGRESS_SOURCES',
  },
];

const befunde = [];
const lies = (relativ) => {
  const datei = path.join(root, relativ);
  if (!existsSync(datei)) {
    befunde.push(`${relativ} fehlt.`);
    return null;
  }
  return readFileSync(datei, 'utf8');
};

const zahl = (text, name) =>
  new RegExp(`export const ${name}\\s*=\\s*(\\d+)\\s*;`).exec(text ?? '')?.[1] ?? null;
const zeichenketten = (text) => [...(text ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();

for (const quelle of QUELLEN) {
  const kopien = Object.keys(APPS).map((app) => ({
    app,
    text: lies(path.join(app, quelle.adapter)),
  }));

  // 1. Bytegleich
  const referenz = kopien[0];
  for (const kopie of kopien.slice(1)) {
    if (referenz.text !== null && kopie.text !== null && kopie.text !== referenz.text) {
      befunde.push(
        `${kopie.app}/${quelle.adapter} weicht von ${referenz.app}/${quelle.adapter} ab.`,
      );
    }
  }

  // 2. Schema-Version wie im Hub
  const hubText = lies(quelle.hub);
  const hubVersion = zahl(hubText, quelle.version);
  if (hubText !== null && hubVersion === null) {
    befunde.push(`${quelle.hub}: ${quelle.version} nicht gefunden.`);
  }
  for (const { app, text } of kopien) {
    if (text === null) continue;
    const version = zahl(text, quelle.version);
    if (version === null)
      befunde.push(`${app}/${quelle.adapter}: ${quelle.version} nicht gefunden.`);
    else if (hubVersion !== null && version !== hubVersion) {
      befunde.push(
        `${app}/${quelle.adapter}: ${quelle.version} = ${version}, der Hub erwartet ${hubVersion}.`,
      );
    }
  }

  // 3. Quellnamen wie im Hub
  const hubNamen = zeichenketten(
    new RegExp(`export const ${quelle.hubNamen}\\s*=\\s*\\[([^\\]]*)\\]`).exec(hubText ?? '')?.[1],
  );
  const adapterNamen = zeichenketten(
    new RegExp(`export type ${quelle.namenstyp}\\s*=([^;]*);`).exec(referenz.text ?? '')?.[1],
  );
  const erwarteteNamen = Object.values(APPS).sort();
  if (JSON.stringify(adapterNamen) !== JSON.stringify(erwarteteNamen)) {
    befunde.push(
      `${quelle.adapter}: ${quelle.namenstyp} nennt [${adapterNamen}], erwartet [${erwarteteNamen}].`,
    );
  }
  if (hubText !== null && JSON.stringify(hubNamen) !== JSON.stringify(erwarteteNamen)) {
    befunde.push(
      `${quelle.hub}: ${quelle.hubNamen} nennt [${hubNamen}], erwartet [${erwarteteNamen}].`,
    );
  }

  // 4. Route je App: angebunden und unter dem eigenen Namen
  for (const [app, name] of Object.entries(APPS)) {
    const route = lies(path.join(app, quelle.route));
    if (route === null) continue;
    if (!route.includes(`from '@/server/platform/${path.basename(quelle.adapter, '.ts')}'`)) {
      befunde.push(`${app}/${quelle.route} bindet den Adapter nicht ein.`);
    }
    if (!route.includes(`${quelle.handler}(`)) {
      befunde.push(`${app}/${quelle.route} ruft ${quelle.handler} nicht auf.`);
    }
    const gemeldet = /source:\s*'([^']+)'/.exec(route)?.[1];
    if (gemeldet !== name) {
      befunde.push(
        `${app}/${quelle.route} meldet sich als '${gemeldet ?? '?'}', erwartet '${name}'.`,
      );
    }
  }
}

if (befunde.length > 0) {
  console.error(`Plattformquellen: ${befunde.length} Befund(e)`);
  for (const befund of befunde) console.error(`  ✖ ${befund}`);
  process.exit(1);
}

console.log(
  'Plattformquellen: Adapter für Wiederholung und Fortschritt bytegleich in 3 Apps, ' +
    'Schema-Versionen und Quellnamen wie im Hub, Routen unter dem eigenen Namen angebunden.',
);
