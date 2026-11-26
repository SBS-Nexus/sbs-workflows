import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  baueMail,
  Drossel,
  gueltigeAdresse,
  SchonGesehen,
  klartext,
  ohneAdressen,
  pruefeSignatur,
  sichererLink,
  sichererText,
} from './mail.mjs';

const SCHLUESSEL = 'probe-schluessel-nur-fuer-tests';
const JETZT_MS = 1_795_000_000_000;

function signiere(inhalt, zeit = JETZT_MS / 1000, schluessel = SCHLUESSEL) {
  const mac = createHmac('sha256', schluessel).update(`${zeit}.`).update(inhalt).digest('hex');
  return `t=${zeit},v1=${mac}`;
}

test('Signatur: gültig wird angenommen', () => {
  const inhalt = Buffer.from('{"a":1}');
  assert.equal(pruefeSignatur(inhalt, signiere(inhalt), SCHLUESSEL, JETZT_MS), true);
});

test('Signatur: falscher Schlüssel, verändertes Feld, fehlender Kopf werden abgelehnt', () => {
  const inhalt = Buffer.from('{"a":1}');
  assert.equal(
    pruefeSignatur(inhalt, signiere(inhalt, undefined, 'anderer'), SCHLUESSEL, JETZT_MS),
    false,
  );
  assert.equal(
    pruefeSignatur(Buffer.from('{"a":2}'), signiere(inhalt), SCHLUESSEL, JETZT_MS),
    false,
  );
  assert.equal(pruefeSignatur(inhalt, undefined, SCHLUESSEL, JETZT_MS), false);
  assert.equal(pruefeSignatur(inhalt, '', SCHLUESSEL, JETZT_MS), false);
  assert.equal(pruefeSignatur(inhalt, signiere(inhalt), '', JETZT_MS), false);
});

test('Signatur: zu alt oder zu weit in der Zukunft wird abgelehnt', () => {
  const inhalt = Buffer.from('{}');
  assert.equal(
    pruefeSignatur(inhalt, signiere(inhalt, JETZT_MS / 1000 - 301), SCHLUESSEL, JETZT_MS),
    false,
  );
  assert.equal(
    pruefeSignatur(inhalt, signiere(inhalt, JETZT_MS / 1000 + 301), SCHLUESSEL, JETZT_MS),
    false,
  );
  assert.equal(
    pruefeSignatur(inhalt, signiere(inhalt, JETZT_MS / 1000 - 299), SCHLUESSEL, JETZT_MS),
    true,
  );
});

test('Signatur: kaputte Köpfe werden abgelehnt, mehrere v1 sind erlaubt', () => {
  const inhalt = Buffer.from('{}');
  const gut = signiere(inhalt);
  assert.equal(pruefeSignatur(inhalt, 'v1=abc', SCHLUESSEL, JETZT_MS), false);
  assert.equal(pruefeSignatur(inhalt, `t=x,${gut.split(',')[1]}`, SCHLUESSEL, JETZT_MS), false);
  assert.equal(
    pruefeSignatur(inhalt, `${gut.split(',')[0]},v1=nichthex`, SCHLUESSEL, JETZT_MS),
    false,
  );
  assert.equal(pruefeSignatur(inhalt, `${gut},v1=${'0'.repeat(64)}`, SCHLUESSEL, JETZT_MS), true);
});

test('Text: HTML aus Werten wird maskiert, Umbrüche und Fettdruck bleiben', () => {
  const roh =
    'Hallo <script>alert(1)</script><br>Dein Code: <strong>AB12</strong><img src=x onerror=y>';
  const html = sichererText(roh);
  assert.ok(!html.includes('<script'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('<br>'));
  assert.ok(html.includes('<strong>AB12</strong>'));
  assert.equal(
    sichererText('<strong class="x">a</strong>'),
    '&lt;strong class=&quot;x&quot;&gt;a</strong>',
  );
});

test('Klartext: Tags fallen weg, Umbrüche bleiben', () => {
  assert.equal(klartext('Zeile 1<br>Zeile <strong>2</strong>'), 'Zeile 1\nZeile 2');
});

test('Link: nur HTTPS auf den eigenen Host', () => {
  const host = 'konto.lernpfade.net';
  assert.equal(
    sichererLink('https://konto.lernpfade.net/ui/v2/login/verify?code=1', host),
    'https://konto.lernpfade.net/ui/v2/login/verify?code=1',
  );
  assert.equal(sichererLink('http://konto.lernpfade.net/x', host), null);
  assert.equal(sichererLink('https://konto.lernpfade.net.evil.test/x', host), null);
  assert.equal(sichererLink('https://user:pw@konto.lernpfade.net/x', host), null);
  assert.equal(sichererLink('javascript:alert(1)', host), null);
  assert.equal(sichererLink('', host), null);
});

test('Adresse: gültig und ungültig', () => {
  assert.equal(gueltigeAdresse('lea@example.test'), true);
  assert.equal(gueltigeAdresse('lea@localhost'), false);
  assert.equal(gueltigeAdresse('a b@example.test'), false);
  assert.equal(gueltigeAdresse(`${'a'.repeat(250)}@example.test`), false);
});

test('Protokoll: Adressen werden entfernt', () => {
  assert.equal(ohneAdressen('invalid recipient lea@example.test'), 'invalid recipient <adresse>');
});

test('Mail: baut Betreff, HTML mit Knopf und Klartext', () => {
  const mail = baueMail(
    {
      contextInfo: {
        recipientEmailAddress: 'lea@example.test',
        eventType: 'user.human.password.code.added',
      },
      templateData: {
        title: 'Passwort zurücksetzen',
        preHeader: 'Neues Passwort',
        subject: 'Dein neues Passwort\r\nBcc: x@y.test',
        greeting: 'Hallo Lea,',
        text: 'Dein Code: <strong>AB12CD</strong>',
        url: 'https://konto.lernpfade.net/ui/v2/login/password/set?code=AB12CD',
        buttonText: 'Passwort setzen',
      },
    },
    { host: 'konto.lernpfade.net' },
  );
  assert.equal(mail.an, 'lea@example.test');
  assert.equal(mail.betreff, 'Dein neues Passwort Bcc: x@y.test');
  assert.ok(mail.html.includes('<strong>AB12CD</strong>'));
  assert.ok(
    mail.html.includes('href="https://konto.lernpfade.net/ui/v2/login/password/set?code=AB12CD"'),
  );
  assert.ok(mail.html.includes('lang="de"'));
  assert.ok(mail.text.includes('Dein Code: AB12CD'));
  assert.ok(mail.text.includes('Passwort setzen: https://konto.lernpfade.net/'));
  assert.equal(mail.ereignis, 'user.human.password.code.added');
});

test('Mail: fremder Link ergibt keinen Knopf, fehlender Empfänger wirft', () => {
  const mail = baueMail(
    {
      contextInfo: { recipientEmailAddress: 'lea@example.test' },
      templateData: {
        text: 'x',
        url: 'https://boese.example.test/',
        buttonText: 'Klick',
      },
    },
    { host: 'konto.lernpfade.net' },
  );
  assert.ok(!mail.html.includes('boese.example.test'));
  assert.ok(!mail.text.includes('boese.example.test'));
  assert.throws(() =>
    baueMail({ contextInfo: {}, templateData: {} }, { host: 'konto.lernpfade.net' }),
  );
});

test('Wiederholung: dieselbe Signatur nur einmal, nach Ablauf wieder frei', () => {
  const gesehen = new SchonGesehen(1000);
  assert.equal(gesehen.merke('t=1,v1=a', 0), true);
  assert.equal(gesehen.merke('t=1,v1=a', 500), false);
  assert.equal(gesehen.merke('t=1,v1=b', 500), true);
  assert.equal(gesehen.merke('t=1,v1=a', 1001), true);
});

test('Drossel: höchstens n je Fenster, danach wieder frei', () => {
  const drossel = new Drossel(2, 1000);
  assert.equal(drossel.erlaube(0), true);
  assert.equal(drossel.erlaube(10), true);
  assert.equal(drossel.erlaube(20), false);
  assert.equal(drossel.erlaube(1001), true);
});
