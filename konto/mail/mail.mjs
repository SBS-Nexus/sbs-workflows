// konto-mail: reine Funktionen (Signatur prüfen, Mail bauen). Ohne Abhängigkeiten.
//
// ZITADEL schickt bei einem HTTP-Mailanbieter keine fertige Mail, sondern
// JSON: { contextInfo: { recipientEmailAddress, eventType }, templateData:
// { title, preHeader, subject, greeting, text, url, buttonText, footerText,
// includeFooter }, args }. Die Texte sind schon übersetzt und mit den Werten
// (Code, Name) gefüllt. Siehe docs/E4-1-BAUPLAN.md, Abschnitt 3.
import { createHmac, timingSafeEqual } from 'node:crypto';

/** ZITADEL prüft selbst mit 300 Sekunden (pkg/actions/signing.go). */
export const SIGNATUR_TOLERANZ_S = 300;

/**
 * Prüft den Kopf `ZITADEL-Signature: t=<unix>,v1=<hex>` (HMAC-SHA256 über
 * `<t>.<roher Inhalt>`). Gibt nur true zurück, wenn eine Signatur passt und der
 * Zeitstempel höchstens 300 Sekunden abweicht.
 */
export function pruefeSignatur(rohInhalt, kopf, schluessel, jetztMs = Date.now()) {
  if (typeof kopf !== 'string' || kopf === '' || !schluessel) return false;
  let zeit;
  const signaturen = [];
  for (const teil of kopf.split(',')) {
    const trenner = teil.indexOf('=');
    if (trenner <= 0) return false;
    const name = teil.slice(0, trenner).trim();
    const wert = teil.slice(trenner + 1).trim();
    if (name === 't') zeit = /^\d{1,12}$/.test(wert) ? Number(wert) : Number.NaN;
    else if (name === 'v1') signaturen.push(wert);
  }
  if (!Number.isFinite(zeit) || signaturen.length === 0) return false;
  if (Math.abs(jetztMs / 1000 - zeit) > SIGNATUR_TOLERANZ_S) return false;
  const erwartet = createHmac('sha256', schluessel).update(`${zeit}.`).update(rohInhalt).digest();
  return signaturen.some(
    (s) => /^[0-9a-f]{64}$/.test(s) && timingSafeEqual(Buffer.from(s, 'hex'), erwartet),
  );
}

/**
 * Merkt sich Signaturen für die Dauer der Toleranz. Dieselbe Anfrage wird so
 * nur einmal verarbeitet; ZITADEL signiert jeden Versuch neu.
 */
export class SchonGesehen {
  #eintraege = new Map();
  #dauerMs;

  constructor(dauerMs = 2 * SIGNATUR_TOLERANZ_S * 1000) {
    this.#dauerMs = dauerMs;
  }

  /** true beim ersten Mal, false bei einer Wiederholung. */
  merke(signatur, jetztMs = Date.now()) {
    for (const [s, bis] of this.#eintraege) if (bis <= jetztMs) this.#eintraege.delete(s);
    if (this.#eintraege.has(signatur)) return false;
    this.#eintraege.set(signatur, jetztMs + this.#dauerMs);
    return true;
  }
}

/** Höchstens `anzahl` Ereignisse je gleitendem Zeitfenster. */
export class Drossel {
  #zeiten = [];
  #anzahl;
  #fensterMs;

  constructor(anzahl, fensterMs) {
    this.#anzahl = anzahl;
    this.#fensterMs = fensterMs;
  }

  erlaube(jetztMs = Date.now()) {
    while (this.#zeiten.length > 0 && this.#zeiten[0] <= jetztMs - this.#fensterMs)
      this.#zeiten.shift();
    if (this.#zeiten.length >= this.#anzahl) return false;
    this.#zeiten.push(jetztMs);
    return true;
  }
}

const ZEICHEN = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function maskiere(text) {
  return String(text ?? '').replace(/[&<>"']/g, (z) => ZEICHEN[z]);
}

/**
 * Text aus den Mailvorlagen als HTML. Alles wird maskiert; danach sind nur
 * `<br>`, `<p>` und `<strong>` ohne Attribute wieder erlaubt. Werte, die
 * Nutzerinnen selbst setzen (etwa der Anzeigename), können so kein HTML
 * einschleusen.
 */
export function sichererText(roh) {
  return maskiere(roh).replace(/&lt;(\/?)(br|p|strong|b)\s*\/?&gt;/gi, (_, schluss, tag) => {
    const t = tag.toLowerCase();
    if (t === 'br') return '<br>';
    return `<${schluss}${t === 'b' ? 'strong' : t}>`;
  });
}

/** Klartext-Fassung: Umbrüche bleiben, Tags fallen weg. */
export function klartext(roh) {
  return String(roh ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Nur HTTPS-Links auf den eigenen Kontohost werden zum Knopf. */
export function sichererLink(url, erlaubterHost) {
  if (typeof url !== 'string' || url === '') return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.hostname !== erlaubterHost || u.username || u.password) {
      return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

const ADRESSE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

export function gueltigeAdresse(adresse) {
  return typeof adresse === 'string' && adresse.length <= 254 && ADRESSE.test(adresse);
}

/** Entfernt Adressen aus Fehlermeldungen, bevor sie ins Protokoll gehen. */
export function ohneAdressen(text) {
  return String(text ?? '')
    .replace(/[^\s@"'<>]+@[^\s@"'<>]+/g, '<adresse>')
    .slice(0, 300);
}

function einzeilig(text, max) {
  return String(text ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, max);
}

// Learning OS, aus docs/learning-tokens/learning-tokens.css (Mailprogramme
// kennen keine CSS-Variablen, deshalb hier als Werte).
const FARBE = {
  papier: '#f2f2e9',
  flaeche: '#fbfbf6',
  linie: '#cdd5c8',
  text: '#141c18',
  leise: '#4b5a51',
  tinte: '#0b0e0e',
  creme: '#f1f1e9',
  limette: '#d0fa83',
};
const SCHRIFT =
  "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Baut aus den Daten von ZITADEL die Mail. Wirft, wenn Pflichtangaben fehlen.
 * @returns {{ an: string, betreff: string, html: string, text: string, ereignis: string }}
 */
export function baueMail(nutzlast, { host }) {
  const kontext = nutzlast?.contextInfo ?? {};
  const daten = nutzlast?.templateData ?? {};
  const an = kontext.recipientEmailAddress;
  if (!gueltigeAdresse(an)) throw new Error('Empfänger fehlt oder ist ungültig');

  const betreff = einzeilig(daten.subject, 200) || 'Lernpfade';
  const titel = einzeilig(daten.title, 200) || betreff;
  const vorschau = einzeilig(daten.preHeader, 200);
  const gruss = sichererText(daten.greeting);
  const inhalt = sichererText(daten.text);
  const link = sichererLink(daten.url, host);
  const knopf = einzeilig(daten.buttonText, 80) || 'Weiter';
  const fusszeile = daten.includeFooter ? sichererText(daten.footerText) : '';
  const hinweis =
    'Du bekommst diese Mail, weil deine Adresse bei Lernpfade angegeben wurde. Warst du das nicht, kannst du sie einfach ignorieren.';

  const knopfHtml = link
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;"><tr><td style="border-radius:8px;background:${FARBE.tinte};border-bottom:3px solid ${FARBE.limette};">` +
      `<a href="${maskiere(link)}" style="display:inline-block;padding:12px 22px;font-family:${SCHRIFT};font-size:16px;font-weight:600;line-height:1.2;color:${FARBE.creme};text-decoration:none;border-radius:8px;">${maskiere(knopf)}</a>` +
      `</td></tr></table>` +
      `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${FARBE.leise};">Falls der Knopf nicht funktioniert, öffne diesen Link:<br><a href="${maskiere(link)}" style="color:${FARBE.text};word-break:break-all;">${maskiere(link)}</a></p>`
    : '';

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${maskiere(betreff)}</title>
</head>
<body style="margin:0;padding:0;background:${FARBE.papier};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${maskiere(vorschau)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FARBE.papier};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 4px 16px;font-family:${SCHRIFT};font-size:15px;font-weight:600;letter-spacing:0.01em;color:${FARBE.tinte};">Lernpfade</td></tr>
<tr><td style="background:${FARBE.flaeche};border:1px solid ${FARBE.linie};border-radius:12px;padding:32px 28px;font-family:${SCHRIFT};color:${FARBE.text};">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;color:${FARBE.tinte};">${maskiere(titel)}</h1>
${gruss ? `<p style="margin:0 0 12px;font-size:16px;line-height:1.6;">${gruss}</p>` : ''}
<div style="font-size:16px;line-height:1.6;">${inhalt}</div>
${knopfHtml}
</td></tr>
<tr><td style="padding:16px 4px 0;font-family:${SCHRIFT};font-size:12px;line-height:1.5;color:${FARBE.leise};">${fusszeile ? `${fusszeile}<br><br>` : ''}${hinweis}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const textTeile = [klartext(daten.greeting), klartext(daten.text)];
  if (link) textTeile.push(`${knopf}: ${link}`);
  if (fusszeile) textTeile.push(klartext(daten.footerText));
  textTeile.push(hinweis);
  const text = textTeile.filter(Boolean).join('\n\n');

  return {
    an,
    betreff,
    html,
    text,
    ereignis: einzeilig(kontext.eventType, 80) || 'unbekannt',
  };
}
