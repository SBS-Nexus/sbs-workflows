/**
 * E6.1 — Angaben zum Anbieter für Impressum, Datenschutzhinweise und
 * AVV-Vorlage (docs/E6-PLAN.md). Eine Quelle für alle drei Seiten.
 *
 * Übernommen aus dem Impressum und den Datenschutzhinweisen von
 * https://sbsdeutschland.com (Stand dort: 18. November 2026). Ändern sich die
 * Angaben dort, sind sie hier nachzuziehen.
 */

export const ANBIETER = {
  firma: 'SBS Deutschland GmbH & Co. KG',
  strasse: 'In der Dell 19',
  ort: '69469 Weinheim',
  land: 'Deutschland',
  telefon: '+49 (0) 6201 24469',
  telefonLink: '+49620124469',
  email: 'info@sbsdeutschland.com',
  website: 'https://sbsdeutschland.com/',
  vertretung:
    'Die SBS Deutschland GmbH & Co. KG wird durch ihre persönlich haftende Gesellschafterin SBS Deutschland Beteiligungs GmbH (Amtsgericht Mannheim, HRB 721711) vertreten, diese durch ihren Geschäftsführer Andreas Schenk.',
  registergericht: 'Amtsgericht Mannheim',
  handelsregister: 'HRA 706204',
  ustId: 'DE345927327',
  inhaltlichVerantwortlich: { name: 'Luis Schenk', strasse: 'In der Dell 19', ort: '69469 Weinheim', land: 'Deutschland' },
  datenschutzKontakt: 'Andreas Schenk',
} as const;

export const AUFSICHT = {
  name: 'Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg',
  haus: 'Heilbronner Straße 35, 70191 Stuttgart',
  post: 'Postfach 10 29 32, 70025 Stuttgart',
  telefon: '0711 615541-0',
  email: 'poststelle@lfdi.bwl.de',
  website: 'https://www.baden-wuerttemberg.datenschutz.de/',
} as const;

/** Adressen, für die diese Angaben gelten. */
export const GELTUNGSBEREICH = [
  'https://www.lernpfade.net/ (Lernpfade, Organisationen und Teams)',
  'https://konto.lernpfade.net/ (Lernpfade-Konto)',
  'https://www.pythonpfad.de/ (PythonPfad)',
  'https://www.sqlpfad.de/ (SQLPfad)',
  'https://www.aipfad.de/ (AIPfad)',
] as const;

export const STAND = '26. November 2026';
