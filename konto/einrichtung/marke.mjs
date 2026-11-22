// Logo und Icon der Anmeldeseite, gebaut aus der Learning-OS-Marke
// (lernpfade/src/styles/learning-os.css: .los-brand-mark, .los-brand-period).
// IBM Plex Sans steckt eingebettet im SVG, weil ein Bild keine Webschriften der
// Seite nutzen kann. Farben aus docs/learning-tokens/learning-tokens.css.
import { readFileSync } from 'node:fs';

const SCHRIFT = new URL('../../docs/learning-tokens/schriften/plex-sans.woff2', import.meta.url);

const FARBEN = {
  hell: { text: '#0b0e0e', akzent: '#4f6e2e' },
  dunkel: { text: '#f1f1e9', akzent: '#d0fa83' },
};

/** Drei Signalstriche wie .los-brand-mark: 25/17/9 breit, 3 hoch, je 4 px versetzt, −24°. */
function striche(farbe, x, y, massstab) {
  return (
    `<g transform="translate(${x} ${y}) rotate(-24) scale(${massstab})" fill="${farbe}">` +
    '<rect x="-12.5" y="-7.5" width="25" height="3" rx="1.5"/>' +
    '<rect x="-8.5" y="-1.5" width="17" height="3" rx="1.5"/>' +
    '<rect x="-4.5" y="4.5" width="9" height="3" rx="1.5"/>' +
    '</g>'
  );
}

/** Wortmarke mit Bildmarke, für hellen oder dunklen Hintergrund. */
export function logoSvg(variante) {
  const { text, akzent } = FARBEN[variante];
  const schrift = readFileSync(SCHRIFT).toString('base64');
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 48" width="190" height="48" role="img" aria-label="Lernpfade">' +
    `<style>@font-face{font-family:"LP Plex";src:url(data:font/woff2;base64,${schrift}) format("woff2");font-weight:100 700;}</style>` +
    striche(akzent, 24, 24, 1.5) +
    `<text x="52" y="33" font-family="'LP Plex','IBM Plex Sans',system-ui,sans-serif" font-size="27" font-weight="700" letter-spacing="-0.8" fill="${text}">` +
    `lernpfade<tspan fill="${akzent}">.</tspan></text>` +
    '</svg>'
  );
}

/** Quadratisches Icon (Favicon): Bildmarke in Limette auf Tinte, für beide Modi gleich. */
export function iconSvg() {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Lernpfade">' +
    '<rect width="64" height="64" rx="14" fill="#0b0e0e"/>' +
    striche('#d0fa83', 32, 32, 1.6) +
    '</svg>'
  );
}

export function schriftDatei() {
  return readFileSync(SCHRIFT);
}
