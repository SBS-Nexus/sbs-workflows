// Reine Regeln der Kontoübernahme (E4.3, docs/E4-4-BAUPLAN.md Abschnitt 4,
// docs/E4-KONTO-PLAN.md Abschnitt 5). Ohne Netz und ohne Datenbank, damit
// jede Regel einzeln geprüft ist (umwandeln.test.mjs).

/**
 * Rechnet einen Passwort-Hash der Apps in das scrypt-Format von ZITADEL um.
 *
 *   App:      scrypt$65536$8$1$<Salt Base64>$<Hash Base64>
 *   ZITADEL:  $scrypt$ln=16,r=8,p=1$<Salt Base64 ohne =>$<Hash Base64 ohne =>
 *
 * Belegt in E4.0 (docs/E4-0-MACHBARKEIT.md): ZITADEL nimmt so einen Hash an,
 * das richtige Passwort meldet an, ein falsches nicht. Gibt `null` zurück,
 * wenn der Hash nicht in diesem Format vorliegt.
 */
export function zitadelHash(appHash) {
  if (typeof appHash !== 'string') return null;
  const teile = appHash.split('$');
  if (teile.length !== 6 || teile[0] !== 'scrypt') return null;
  const [, nText, rText, pText, salz, hash] = teile;
  const n = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (![n, r, p].every(Number.isSafeInteger) || n < 2 || r < 1 || p < 1) return null;
  const ln = Math.log2(n);
  if (!Number.isInteger(ln)) return null;

  const salzBytes = Buffer.from(salz, 'base64');
  const hashBytes = Buffer.from(hash, 'base64');
  if (salzBytes.length < 8 || hashBytes.length < 16) return null;
  const ohneAuffuellung = (bytes) => bytes.toString('base64').replace(/=+$/, '');
  return [
    '',
    'scrypt',
    `ln=${ln},r=${r},p=${p}`,
    ohneAuffuellung(salzBytes),
    ohneAuffuellung(hashBytes),
  ].join('$');
}

/** Kleingeschrieben und ohne Leerraum; `null`, wenn es keine Adresse ist. */
export function normaleAdresse(roh) {
  if (typeof roh !== 'string') return null;
  const email = roh.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200 ? email : null;
}

function zeit(wert) {
  const ms = wert instanceof Date ? wert.getTime() : Date.parse(wert ?? '');
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Fasst die Konten aller Apps nach Adresse zusammen. Hat eine Adresse Konten
 * in mehreren Apps, gelten Hash und Name des zuletzt aktiven Kontos.
 *
 * `konten`: [{ app, email, name, passwordHash, zuletzt }]
 * Ergebnis: { personen: [{ email, name, passwordHash, apps }], zahlen }
 */
export function zusammenfassen(konten) {
  const zahlen = {
    gelesen: 0,
    ohneAdresse: 0,
    ohneHash: 0,
    unbrauchbarerHash: 0,
    jeApp: {},
    ueberschneidungen: 0,
  };
  const nachAdresse = new Map();

  for (const konto of konten) {
    zahlen.gelesen += 1;
    zahlen.jeApp[konto.app] = (zahlen.jeApp[konto.app] ?? 0) + 1;
    const email = normaleAdresse(konto.email);
    if (!email) {
      zahlen.ohneAdresse += 1;
      continue;
    }
    if (!konto.passwordHash) {
      // Konten aus dem gemeinsamen Konto haben kein lokales Passwort.
      zahlen.ohneHash += 1;
      continue;
    }
    if (!zitadelHash(konto.passwordHash)) {
      zahlen.unbrauchbarerHash += 1;
      continue;
    }
    const eintrag = { ...konto, email };
    const bisher = nachAdresse.get(email);
    if (!bisher) {
      nachAdresse.set(email, { neuestes: eintrag, apps: new Set([konto.app]) });
      continue;
    }
    bisher.apps.add(konto.app);
    if (zeit(eintrag.zuletzt) > zeit(bisher.neuestes.zuletzt)) bisher.neuestes = eintrag;
  }

  const personen = [...nachAdresse.values()].map(({ neuestes, apps }) => ({
    email: neuestes.email,
    name: neuestes.name,
    passwordHash: neuestes.passwordHash,
    apps: [...apps].sort(),
  }));
  zahlen.ueberschneidungen = personen.filter((p) => p.apps.length > 1).length;
  return { personen, zahlen };
}

/**
 * Vor- und Nachname für ZITADEL, das beide verlangt. Der vollständige Name
 * bleibt als Anzeigename erhalten; ein einzelnes Wort wird zu beidem.
 */
export function namensteile(name, email) {
  const sauber = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  const anzeige = sauber.length >= 2 ? sauber.slice(0, 200) : (email.split('@')[0] ?? 'Lernende');
  const woerter = anzeige.split(' ');
  const vorname = woerter[0] ?? anzeige;
  const nachname = woerter.length > 1 ? woerter.slice(1).join(' ') : vorname;
  return { anzeige, vorname, nachname };
}
