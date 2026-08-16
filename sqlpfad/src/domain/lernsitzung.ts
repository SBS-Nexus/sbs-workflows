/**
 * Wie lange jemand tatsächlich gelernt hat.
 *
 * Die Zeit wird **ab der letzten Aktivität** gemessen und nicht ab dem
 * Seitenaufruf. Wer eine Lektion öffnet und drei Stunden später wiederkommt,
 * hat nicht drei Stunden gelernt – und eine Anwendung, die ihm das erzählt,
 * macht aus einer nützlichen Zahl eine Schmeichelei.
 *
 * Konkret: Zwischen zwei Aktivitäten wird die verstrichene Zeit gutgeschrieben,
 * solange sie unter der Pausengrenze liegt. Liegt sie darüber, gilt die alte
 * Sitzung als beendet und eine neue beginnt – die Pause selbst wird nicht
 * mitgezählt.
 *
 * Was hier ausdrücklich **nicht** entsteht: eine Serie, ein Tagesziel oder ein
 * Balken, der voll werden will. Die Zahl beantwortet „wie lange war ich
 * dran?", und mehr soll sie nicht.
 */

/** Ab dieser Lücke gilt die Sitzung als beendet. */
export const PAUSE_MINUTEN = 30;

export interface Sitzungsstand {
  lastActiveAt: Date;
  activeMinutes: number;
}

export type Sitzungsentscheidung =
  /** Dieselbe Sitzung – mit der gutzuschreibenden Zeit. */
  | { art: 'fortsetzen'; aktiveMinuten: number }
  /** Zu lange her (oder gar keine): Die alte endet, eine neue beginnt. */
  | { art: 'neu-beginnen' };

export function beurteileAktivitaet(
  stand: Sitzungsstand | null,
  jetzt: Date,
): Sitzungsentscheidung {
  if (!stand) return { art: 'neu-beginnen' };

  const luecke = (jetzt.getTime() - stand.lastActiveAt.getTime()) / 60_000;

  /*
   * Eine negative Lücke heißt: Die gespeicherte Zeit liegt in der Zukunft.
   * Das kommt vor, wenn Uhren auseinanderlaufen. Sie als riesige Pause zu
   * behandeln wäre falsch, sie gutzuschreiben erst recht - also null Minuten
   * und weiter.
   */
  if (luecke < 0) return { art: 'fortsetzen', aktiveMinuten: stand.activeMinutes };

  if (luecke > PAUSE_MINUTEN) return { art: 'neu-beginnen' };

  // Abgerundet: Angefangene Minuten werden nicht großzügig aufgerundet, sonst
  // sammelt eine Reihe schneller Klicks Zeit, die niemand verbracht hat.
  return { art: 'fortsetzen', aktiveMinuten: stand.activeMinutes + Math.floor(luecke) };
}

/** „25 Minuten" oder „1 Stunde 5 Minuten" – nie „0,42 h". */
export function formatiereDauer(minuten: number): string {
  const ganze = Math.max(0, Math.floor(minuten));
  if (ganze < 60) return `${ganze} ${ganze === 1 ? 'Minute' : 'Minuten'}`;

  const stunden = Math.floor(ganze / 60);
  const rest = ganze % 60;
  const stundenteil = `${stunden} ${stunden === 1 ? 'Stunde' : 'Stunden'}`;
  if (rest === 0) return stundenteil;
  return `${stundenteil} ${rest} ${rest === 1 ? 'Minute' : 'Minuten'}`;
}
