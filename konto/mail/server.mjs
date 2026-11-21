// konto-mail: nimmt Mails von ZITADEL entgegen (HTTP-Anbieter) und verschickt
// sie über die HTTPS-API von Scaleway Transactional Email.
//
// Warum nicht SMTP: Railway sperrt ausgehendes SMTP im Tarif Hobby.
// Warum öffentlich: ZITADEL ruft keine privaten Adressen auf (HTTPClient.DenyList
// enthält fc00::/7, dort liegt das private Railway-Netz), und diese Sperre
// soll bleiben. Der Dienst nimmt deshalb nur Anfragen mit gültiger Signatur
// von ZITADEL an, jede Signatur nur einmal, und höchstens MAILS_JE_MINUTE
// Mails pro Minute. Ins Protokoll kommen weder Adressen noch Codes.
import { createServer } from 'node:http';
import { baueMail, Drossel, ohneAdressen, pruefeSignatur, SchonGesehen } from './mail.mjs';

const KONFIG = {
  port: Number(process.env.PORT ?? 8080),
  signaturSchluessel: process.env.ZITADEL_SIGNING_KEY ?? '',
  scwSchluessel: process.env.SCW_SECRET_KEY ?? '',
  scwProjekt: process.env.SCW_PROJECT_ID ?? '',
  region: process.env.SCW_REGION ?? 'fr-par',
  absender: process.env.MAIL_FROM ?? 'konto@lernpfade.net',
  absenderName: process.env.MAIL_FROM_NAME ?? 'Lernpfade',
  host: process.env.KONTO_HOST ?? 'konto.lernpfade.net',
  mailsJeMinute: Number(process.env.MAILS_JE_MINUTE ?? 60),
};
const MAX_INHALT = 64 * 1024;
const gesehen = new SchonGesehen();
const drossel = new Drossel(KONFIG.mailsJeMinute, 60_000);

function protokoll(eintrag) {
  process.stdout.write(`${JSON.stringify({ zeit: new Date().toISOString(), ...eintrag })}\n`);
}

function bereit() {
  return Boolean(KONFIG.signaturSchluessel && KONFIG.scwSchluessel && KONFIG.scwProjekt);
}

function antworte(res, status, koerper) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(koerper));
}

function liesInhalt(req) {
  return new Promise((resolve, reject) => {
    const teile = [];
    let laenge = 0;
    req.on('data', (stueck) => {
      laenge += stueck.length;
      if (laenge > MAX_INHALT) {
        reject(Object.assign(new Error('zu groß'), { status: 413 }));
        req.destroy();
        return;
      }
      teile.push(stueck);
    });
    req.on('end', () => resolve(Buffer.concat(teile)));
    req.on('error', reject);
  });
}

async function versende(mail) {
  const antwort = await fetch(
    `https://api.scaleway.com/transactional-email/v1alpha1/regions/${KONFIG.region}/emails`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-auth-token': KONFIG.scwSchluessel,
      },
      body: JSON.stringify({
        from: { email: KONFIG.absender, name: KONFIG.absenderName },
        to: [{ email: mail.an }],
        subject: mail.betreff,
        text: mail.text,
        html: mail.html,
        project_id: KONFIG.scwProjekt,
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  const koerper = await antwort.text();
  return { ok: antwort.ok, status: antwort.status, koerper };
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    // Lebt der Prozess? Ob alle Schlüssel gesetzt sind, steht im Inhalt.
    antworte(res, 200, { bereit: bereit() });
    return;
  }
  if (req.method !== 'POST' || req.url !== '/') {
    antworte(res, 404, { fehler: 'nicht gefunden' });
    return;
  }
  const start = Date.now();
  if (!bereit()) {
    protokoll({ status: 503, grund: 'Konfiguration unvollständig' });
    antworte(res, 503, { fehler: 'nicht bereit' });
    return;
  }
  let inhalt;
  try {
    inhalt = await liesInhalt(req);
  } catch (fehler) {
    antworte(res, fehler.status ?? 400, { fehler: 'Inhalt nicht lesbar' });
    return;
  }
  const signatur = req.headers['zitadel-signature'];
  if (!pruefeSignatur(inhalt, signatur, KONFIG.signaturSchluessel)) {
    protokoll({ status: 401, grund: 'Signatur fehlt oder passt nicht' });
    antworte(res, 401, { fehler: 'Signatur ungültig' });
    return;
  }
  if (!gesehen.merke(signatur)) {
    protokoll({ status: 409, grund: 'Signatur schon benutzt' });
    antworte(res, 409, { fehler: 'schon verarbeitet' });
    return;
  }
  if (!drossel.erlaube()) {
    protokoll({ status: 429, grund: 'Grenze je Minute erreicht' });
    antworte(res, 429, { fehler: 'zu viele Mails' });
    return;
  }
  let mail;
  try {
    mail = baueMail(JSON.parse(inhalt.toString('utf8')), { host: KONFIG.host });
  } catch (fehler) {
    protokoll({ status: 400, grund: ohneAdressen(fehler.message) });
    antworte(res, 400, { fehler: 'Nachricht unvollständig' });
    return;
  }
  try {
    const ergebnis = await versende(mail);
    const dauerMs = Date.now() - start;
    if (!ergebnis.ok) {
      protokoll({
        ereignis: mail.ereignis,
        status: 502,
        scaleway: ergebnis.status,
        grund: ohneAdressen(ergebnis.koerper),
        dauerMs,
      });
      antworte(res, 502, { fehler: 'Versand fehlgeschlagen' });
      return;
    }
    protokoll({
      ereignis: mail.ereignis,
      status: 200,
      scaleway: ergebnis.status,
      dauerMs,
    });
    antworte(res, 200, { ok: true });
  } catch (fehler) {
    protokoll({
      ereignis: mail.ereignis,
      status: 502,
      grund: ohneAdressen(fehler.message),
    });
    antworte(res, 502, { fehler: 'Versand fehlgeschlagen' });
  }
});

server.listen(KONFIG.port, '::', () => {
  protokoll({ start: true, port: KONFIG.port, bereit: bereit() });
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
