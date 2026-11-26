import { isIP } from 'node:net';

/**
 * Die Client-IP, auf die die Ratengrenzen aufsetzen.
 *
 * Wer diesen Wert selbst bestimmen kann, bekommt bei jedem Versuch einen
 * frischen Zähler und hebelt damit die Anmelde- und Registrierungsgrenzen aus —
 * also genau den Schutz gegen Credential Stuffing und Massen-Enumeration.
 * Deshalb zählt nur, was die eigene Infrastruktur gesetzt hat:
 *
 *  1. `x-real-ip`. Auf Railway setzt der Edge diesen Wert selbst
 *     (docs.railway.com, „Specs & Limits"). Hinter einem eigenen Proxy muss
 *     dieser ihn ebenso setzen, bei nginx mit
 *     `proxy_set_header X-Real-IP $remote_addr`. Sonst reicht er durch, was
 *     der Client mitschickt.
 *  2. Fehlt er, der RECHTE Eintrag von `x-forwarded-for`. Den hat der letzte,
 *     eigene Proxy angehängt; alles weiter links kann vom Client stammen.
 *  3. Fehlt beides, ein gemeinsamer Zähler. Das begrenzt eher zu streng als
 *     zu großzügig und ist hier die richtige Richtung.
 *
 * Es zählen nur gültige IP-Adressen. Ein beliebiger Text, etwa ein
 * kilobytelanger Wert, wird so nie Teil eines Zählerschlüssels.
 *
 * `x-vercel-forwarded-for` wird bewusst nicht gelesen. Die Kopfzeile ist nur
 * hinter Vercel vertrauenswürdig; auf jeder anderen Plattform setzt sie der
 * Client frei.
 *
 * Diese Datei ist in PythonPfad, SQLPfad und AIPfad gleich. Ohne
 * `server-only`, damit sie auf der Unit-Ebene ohne Next.js testbar bleibt.
 */
export const UNBEKANNTE_IP = 'unbekannt';

export interface Kopfzeilen {
  get(name: string): string | null;
}

export function clientIpAus(kopfzeilen: Kopfzeilen): string {
  const realIp = kopfzeilen.get('x-real-ip')?.trim();
  if (realIp && isIP(realIp) !== 0) return realIp;

  const letzterProxy = kopfzeilen.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  if (letzterProxy && isIP(letzterProxy) !== 0) return letzterProxy;

  return UNBEKANNTE_IP;
}
