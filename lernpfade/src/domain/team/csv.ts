import type { TeamQuelle, TeamSourceName } from './contract.ts';

/**
 * E5.2 — CSV des Teamstands. Enthält genau, was die Übersicht zeigt: Summen
 * je Pfad (ab drei Personen) und Einzelwerte nur der Personen mit
 * Einwilligung. Für Excel in Deutschland: Semikolon, UTF-8 mit BOM, CRLF.
 * Zellen, die mit = + - @ beginnen, bekommen ein Hochkomma vorangestellt,
 * damit keine Tabellenkalkulation sie als Formel ausführt.
 */

export const PFAD_NAME: Readonly<Record<TeamSourceName, string>> = {
  python: 'PythonPfad',
  sql: 'SQLPfad',
  ai: 'AIPfad',
};

const KOPF = [
  'Art',
  'Person',
  'Pfad',
  'Lektionen abgeschlossen',
  'Lektionen gesamt',
  'Fällige Wiederholungen',
  'Letzte Aktivität',
  'Personen',
  'Davon aktiv',
];

export function zelle(wert: string | number | null): string {
  if (wert === null) return '';
  let text = String(wert);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function teamCsv(
  personen: ReadonlyArray<{ sub: string; name: string; freigabe: boolean }>,
  quellen: ReadonlyArray<TeamQuelle>,
): string {
  const namen = new Map(personen.filter((p) => p.freigabe).map((p) => [p.sub, p.name]));
  const zeilen: Array<Array<string | number | null>> = [KOPF];
  for (const q of quellen) {
    if (q.summen) {
      zeilen.push([
        'Summe',
        null,
        PFAD_NAME[q.source],
        q.summen.lektionen.abgeschlossen,
        q.summen.lektionen.jePerson * q.summen.personen,
        q.summen.wiederholungenFaellig,
        null,
        q.summen.personen,
        q.summen.aktiv,
      ]);
    }
  }
  for (const q of quellen) {
    for (const b of q.benannt) {
      const name = namen.get(b.sub);
      // Ohne Einwilligung im Hub kein Name, selbst wenn eine App Werte schickte.
      if (!name) continue;
      zeilen.push([
        'Person',
        name,
        PFAD_NAME[q.source],
        b.lektionen.completed,
        b.lektionen.total,
        b.wiederholungenFaellig,
        b.letzteAktivitaet,
        null,
        null,
      ]);
    }
  }
  return `﻿${zeilen.map((z) => z.map(zelle).join(';')).join('\r\n')}\r\n`;
}
