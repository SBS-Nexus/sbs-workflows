/**
 * Konto anlegen oder zurücksetzen.
 *
 * Der Adminbereich prüft Rollen, vergibt sie aber nicht – es gibt also keinen
 * Weg über die Oberfläche, das erste Konto mit vollem Zugriff zu erzeugen.
 * Genau dafür ist dieses Skript da.
 *
 *   npm run konto -- --email=name@beispiel.de --name="Vor Nachname"
 *   npm run konto -- --email=name@beispiel.de --name="Vor Nachname" --rolle=admin
 *   npm run konto -- --email=name@beispiel.de --passwort-neu
 *
 * Zum Passwort: Ohne Angabe erzeugt das Skript eine Wortfolge und zeigt sie
 * genau einmal an – hier, auf diesem Rechner. Das ist Absicht. Ein Passwort,
 * das jemand anders für einen auswählt und übermittelt, ist ab dem Moment der
 * Übermittlung kein Geheimnis mehr: Es steht dann im Chatverlauf, im Postfach
 * oder im Ticketsystem. Wer ein eigenes setzen will, nimmt `--passwort=…`.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { checkPasswordStrength, hashPassword } from '../src/server/auth/password';
import { erzeugePassphrase } from '../src/server/auth/passphrase';

/*
 * `.env` nur laden, wenn sie da ist: `process.loadEnvFile` wirft sonst
 * `ENOENT`, und das `?.` fängt das nicht ab. In Bereitstellungsumgebungen
 * stehen die Werte bereits in `process.env`. Ausführlich in prisma.config.ts.
 */
const envDatei = path.join(import.meta.dirname, '..', '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

interface Optionen {
  email?: string;
  name?: string;
  rolle: 'LEARNER' | 'ADMIN';
  passwort?: string;
  passwortNeu: boolean;
}

function leseOptionen(argumente: readonly string[]): Optionen {
  const optionen: Optionen = { rolle: 'LEARNER', passwortNeu: false };

  for (const argument of argumente) {
    const [schluessel, ...rest] = argument.split('=');
    const wert = rest.join('=');

    switch (schluessel) {
      case '--email':
        optionen.email = wert.trim().toLowerCase();
        break;
      case '--name':
        optionen.name = wert.trim();
        break;
      case '--passwort':
        optionen.passwort = wert;
        break;
      case '--passwort-neu':
        optionen.passwortNeu = true;
        break;
      case '--rolle':
        if (wert !== 'admin' && wert !== 'learner') {
          abbrechen(`Unbekannte Rolle "${wert}". Erlaubt sind "learner" und "admin".`);
        }
        optionen.rolle = wert === 'admin' ? 'ADMIN' : 'LEARNER';
        break;
      default:
        abbrechen(`Unbekannte Angabe "${schluessel}".`);
    }
  }

  return optionen;
}

function abbrechen(nachricht: string): never {
  console.error(`\n  ✖ ${nachricht}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const optionen = leseOptionen(process.argv.slice(2));

  if (!optionen.email || !optionen.email.includes('@')) {
    abbrechen('Bitte eine gültige Adresse angeben:  --email=name@beispiel.de');
  }

  const verbindung = process.env.DATABASE_URL;
  if (!verbindung) {
    abbrechen(
      'DATABASE_URL ist nicht gesetzt. Bei einer verwalteten Datenbank die\n' +
        '    direkte Verbindung nehmen, nicht die gepoolte.',
    );
  }

  const passwort = optionen.passwort ?? erzeugePassphrase();
  const pruefung = checkPasswordStrength(passwort, optionen.email);
  if (!pruefung.ok) {
    abbrechen(`Das Passwort genügt den Regeln nicht:\n    ${pruefung.problems.join('\n    ')}`);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: verbindung }) });

  try {
    const vorhanden = await prisma.user.findUnique({
      where: { email: optionen.email },
      select: { id: true, name: true, role: true },
    });

    if (vorhanden && !optionen.passwortNeu && !optionen.passwort) {
      abbrechen(
        `Es gibt bereits ein Konto für ${optionen.email} (Rolle: ${vorhanden.role}).\n` +
          '    Zum Zurücksetzen des Passworts:  --passwort-neu\n' +
          '    Die Rolle wird dabei ebenfalls auf den angegebenen Wert gesetzt.',
      );
    }

    const passwordHash = await hashPassword(passwort);

    const konto = vorhanden
      ? await prisma.user.update({
          where: { email: optionen.email },
          data: {
            passwordHash,
            role: optionen.rolle,
            ...(optionen.name ? { name: optionen.name } : {}),
          },
          select: { email: true, name: true, role: true },
        })
      : await prisma.user.create({
          data: {
            email: optionen.email,
            name: optionen.name ?? optionen.email.split('@')[0]!,
            passwordHash,
            role: optionen.rolle,
          },
          select: { email: true, name: true, role: true },
        });

    console.info(`\n  ✓ Konto ${vorhanden ? 'aktualisiert' : 'angelegt'}\n`);
    console.info(`    Adresse   ${konto.email}`);
    console.info(`    Name      ${konto.name}`);
    console.info(
      `    Rolle     ${konto.role}${konto.role === 'ADMIN' ? '  (voller Zugriff)' : ''}`,
    );

    if (!optionen.passwort) {
      console.info(`\n    Passwort  ${passwort}`);
      console.info('\n    Diese Zeile steht nur hier, auf diesem Rechner. Jetzt in den');
      console.info('    Passwortspeicher übernehmen – nicht per Chat oder E-Mail weitergeben.');
    }
    console.info('');
  } finally {
    await prisma.$disconnect();
  }
}

await main();
