/**
 * Eine laufende Installation von außen prüfen.
 *
 *   npm run auslieferung:pruefen -- https://sqlpfad.de
 *
 * ## Warum es dieses Skript gibt
 *
 * Die E2E-Tests laufen gegen einen Produktionsbuild auf `localhost`. Sie
 * können deshalb genau die Fehlerklasse nicht sehen, die beim Ausliefern
 * entsteht: eine Adresse, die die Anwendung für sich hält, die aber nicht die
 * ist, unter der Besucher ankommen.
 *
 * Der Anlass war echt. Vercel leitete `sqlpfad.de` auf `www.sqlpfad.de` um,
 * während `APP_URL` weiter `https://sqlpfad.de` sagte. Beides für sich sah
 * richtig aus: Die Seite lud, das Zertifikat galt, die Anmeldung
 * funktionierte. Nur zeigte jeder kanonische Verweis und jeder Eintrag im
 * Seitenverzeichnis auf eine Adresse, die mit einer Weiterleitung antwortet –
 * und das sagt einem niemand, weil es niemandem auffällt.
 *
 * Das Skript ändert nichts. Es stellt Fragen und meldet Abweichungen.
 */

interface Befund {
  ort: string;
  problem: string;
}

const befunde: Befund[] = [];
const notiz = (text: string): void => console.info(`  ${text}`);

function melde(ort: string, problem: string): void {
  befunde.push({ ort, problem });
}

/** Folgt Weiterleitungen und sagt, wo man tatsächlich landet. */
async function endstation(url: string): Promise<{ ziel: string; sprünge: number }> {
  let aktuell = url;
  let sprünge = 0;

  for (; sprünge < 5; sprünge += 1) {
    const antwort = await fetch(aktuell, { redirect: 'manual' });
    const weiter = antwort.headers.get('location');
    if (antwort.status < 300 || antwort.status >= 400 || !weiter) break;
    aktuell = new URL(weiter, aktuell).toString();
  }

  return { ziel: aktuell, sprünge };
}

async function main(): Promise<void> {
  const eingabe = process.argv[2];
  if (!eingabe) {
    console.error('\n  Aufruf:  npm run auslieferung:pruefen -- https://sqlpfad.de\n');
    process.exit(1);
  }

  const start = eingabe.replace(/\/+$/, '');
  console.info(`\n  Prüfe ${start}\n`);

  // --- 1. Wo landet man wirklich? -----------------------------------------

  const { ziel, sprünge } = await endstation(`${start}/`);
  const echteBasis = new URL(ziel).origin;

  if (sprünge > 0) {
    notiz(`↪ ${start} leitet weiter auf ${echteBasis} (${sprünge} Sprung/Sprünge)`);
  } else {
    notiz(`✓ ${start} antwortet direkt, ohne Weiterleitung`);
  }

  // --- 2. Was hält die Anwendung für ihre Adresse? -------------------------

  const robots = await (await fetch(`${echteBasis}/robots.txt`)).text();
  const hostZeile = /^Host:\s*(\S+)/m.exec(robots)?.[1];
  const sitemapZeile = /^Sitemap:\s*(\S+)/m.exec(robots)?.[1];

  if (!hostZeile) {
    melde('robots.txt', 'Es steht keine Host-Zeile darin.');
  } else if (hostZeile.replace(/\/+$/, '') !== echteBasis) {
    melde(
      'robots.txt',
      `APP_URL sagt ${hostZeile}, Besucher landen aber auf ${echteBasis}. ` +
        'Entweder die Weiterleitung umdrehen oder APP_URL angleichen – beides ' +
        'muss dieselbe Adresse nennen.',
    );
  } else {
    notiz(`✓ robots.txt nennt dieselbe Adresse: ${hostZeile}`);
  }

  // --- 3. Zeigt das Verzeichnis auf Seiten oder auf Weiterleitungen? -------

  if (sitemapZeile) {
    const xml = await (await fetch(sitemapZeile)).text();
    const adressen = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((treffer) => treffer[1]!);

    if (adressen.length === 0) melde('sitemap.xml', 'Das Verzeichnis ist leer.');

    for (const adresse of adressen) {
      const antwort = await fetch(adresse, { redirect: 'manual' });
      if (antwort.status >= 300 && antwort.status < 400) {
        melde(
          'sitemap.xml',
          `${adresse} antwortet mit ${antwort.status} statt mit einer Seite. ` +
            'Ein Verzeichnis voller Weiterleitungen beschädigt das Vertrauen in die ganze Datei.',
        );
      } else if (antwort.status !== 200) {
        melde('sitemap.xml', `${adresse} antwortet mit ${antwort.status}.`);
      }
    }
    if (adressen.length > 0) notiz(`✓ ${adressen.length} Adressen im Verzeichnis geprüft`);
  }

  // --- 4. Kanonische Verweise ----------------------------------------------

  for (const pfad of ['/', '/anmelden', '/registrieren']) {
    const adresse = `${echteBasis}${pfad}`;
    const html = await (await fetch(adresse)).text();
    const kanonisch = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];

    if (!kanonisch) {
      melde(pfad, 'Kein kanonischer Verweis in der Seite.');
      continue;
    }
    if (new URL(kanonisch).origin !== echteBasis) {
      melde(
        pfad,
        `Der kanonische Verweis zeigt auf ${kanonisch}, die Seite steht aber unter ${adresse}.`,
      );
    }
  }
  notiz('✓ kanonische Verweise geprüft');

  // --- 5. Sicherheitskopfzeilen --------------------------------------------

  const kopf = (await fetch(`${echteBasis}/`)).headers;
  const pflicht = [
    'strict-transport-security',
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
  ];
  for (const name of pflicht) {
    if (!kopf.get(name)) melde('Kopfzeilen', `${name} fehlt.`);
  }
  notiz('✓ Sicherheitskopfzeilen geprüft');

  // --- 6. Manifest und die darin genannten Symbole -------------------------

  const manifestAntwort = await fetch(`${echteBasis}/manifest.webmanifest`);
  if (!manifestAntwort.ok) {
    melde('manifest.webmanifest', `antwortet mit ${manifestAntwort.status}.`);
  } else {
    const manifest = (await manifestAntwort.json()) as { icons?: { src: string }[] };
    for (const symbol of manifest.icons ?? []) {
      const antwort = await fetch(new URL(symbol.src, echteBasis));
      if (!antwort.ok) {
        melde(
          'manifest.webmanifest',
          `${symbol.src} antwortet mit ${antwort.status}. Ein Manifest, das auf eine 404 zeigt, ` +
            'ist schlimmer als eines ohne Symbole.',
        );
      }
    }
    notiz('✓ Manifest und Symbole geprüft');
  }

  // --- 7. Vorschaubild ------------------------------------------------------

  const bild = await fetch(`${echteBasis}/opengraph-image`);
  if (!bild.ok || !bild.headers.get('content-type')?.includes('image/')) {
    melde(
      '/opengraph-image',
      `antwortet mit ${bild.status} (${bild.headers.get('content-type') ?? 'ohne Typ'}). ` +
        'In den Kopfdaten steht summary_large_image – ohne Bild ist das ein leeres Kästchen.',
    );
  } else {
    notiz('✓ Vorschaubild wird ausgeliefert');
  }

  // --- Ergebnis -------------------------------------------------------------

  if (befunde.length === 0) {
    console.info('\n  ✓ Ohne Befund.\n');
    return;
  }

  console.error(`\n  ✖ ${befunde.length} Befund${befunde.length === 1 ? '' : 'e'}\n`);
  for (const befund of befunde) {
    console.error(`    ${befund.ort}`);
    console.error(`      ${befund.problem}\n`);
  }
  process.exit(1);
}

await main();
