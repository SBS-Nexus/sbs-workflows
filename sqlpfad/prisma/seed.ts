/**
 * Den Lehrplan in die Datenbank schreiben.
 *
 * Die Dateien unter `src/content` sind die Quelle, die Datenbank ist die
 * Kopie. Der Seed ist deshalb **idempotent**: Zweimal ausgeführt ergibt er
 * denselben Stand wie einmal. Wer stattdessen bei jedem Lauf neu anlegt,
 * verliert beim zweiten Mal den Fortschritt aller Lernenden – die Versuche
 * hängen an den Aufgaben-IDs.
 *
 * Was hier ausdrücklich **nicht** passiert: Es werden keine Konten angelegt.
 * Ein Demo-Konto mit bekanntem Passwort, das versehentlich in einer
 * erreichbaren Umgebung landet, ist eine offene Tür. Konten entstehen über
 * `npm run konto` oder über die Registrierung.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { LEHRPLAN, UEBUNGSDATEN } from '../src/content';
import { pruefeLehrplan } from '../src/content/validator';
import { ART_IM_DATENMODELL } from '../src/domain/aufgabe/art';

const envDatei = path.join(import.meta.dirname, '..', '.env');
if (existsSync(envDatei)) process.loadEnvFile?.(envDatei);

const verbindung = process.env.DATABASE_URL;
if (!verbindung) {
  console.error('DATABASE_URL ist nicht gesetzt. Vorlage: .env.example');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: verbindung }) });

async function seed(): Promise<void> {
  /*
   * Erst prüfen, dann schreiben.
   *
   * Ein Lehrplan mit Fehlern gehört nicht in die Datenbank - dort fiele er
   * erst auf, wenn eine Lernende darüber stolpert. Der Abbruch hier ist
   * unbequem und genau richtig.
   */
  const befunde = pruefeLehrplan(LEHRPLAN);
  if (befunde.length > 0) {
    console.error('\n  Der Lehrplan hat Fehler und wird nicht eingespielt:\n');
    for (const befund of befunde) console.error(`   - ${befund.ort}: ${befund.problem}`);
    console.error('');
    process.exit(1);
  }

  // --- Übungsdatensätze ---------------------------------------------------
  for (const datensatz of UEBUNGSDATEN) {
    await prisma.practiceSchema.upsert({
      where: { slug: datensatz.slug },
      create: {
        slug: datensatz.slug,
        title: datensatz.titel,
        description: datensatz.beschreibung,
        domain: datensatz.bereich,
        version: datensatz.version,
      },
      update: {
        title: datensatz.titel,
        description: datensatz.beschreibung,
        domain: datensatz.bereich,
        version: datensatz.version,
      },
    });
  }

  // --- Konzepte -----------------------------------------------------------
  for (const konzept of LEHRPLAN.konzepte) {
    await prisma.concept.upsert({
      where: { slug: konzept.slug },
      create: {
        slug: konzept.slug,
        title: konzept.titel,
        description: konzept.beschreibung,
        difficulty: konzept.schwierigkeit,
      },
      update: {
        title: konzept.titel,
        description: konzept.beschreibung,
        difficulty: konzept.schwierigkeit,
      },
    });
  }

  const konzeptIds = new Map(
    (await prisma.concept.findMany({ select: { id: true, slug: true } })).map((konzept) => [
      konzept.slug,
      konzept.id,
    ]),
  );

  // --- Kurs ---------------------------------------------------------------
  const kurs = await prisma.course.upsert({
    where: { slug: 'sqlpfad-grundkurs' },
    create: {
      slug: 'sqlpfad-grundkurs',
      title: 'SQL verstehen und anwenden',
      description: 'Von der ersten Tabelle bis zur eigenen Auswertung.',
      version: LEHRPLAN.version,
    },
    update: { version: LEHRPLAN.version },
  });

  // --- Module, Lektionen, Aufgaben ---------------------------------------
  let modulNummer = 0;
  for (const modul of LEHRPLAN.module) {
    const gespeichertesModul = await prisma.courseModule.upsert({
      where: { slug: modul.slug },
      create: {
        slug: modul.slug,
        courseId: kurs.id,
        title: modul.titel,
        description: modul.beschreibung,
        order: modulNummer,
      },
      update: { title: modul.titel, description: modul.beschreibung, order: modulNummer },
    });
    modulNummer += 1;

    let lektionsNummer = 0;
    for (const lektion of modul.lektionen) {
      const datensatzId = (
        await prisma.practiceSchema.findUnique({
          where: { slug: lektion.datensatz },
          select: { id: true },
        })
      )?.id;

      const gespeicherteLektion = await prisma.lesson.upsert({
        where: { slug: lektion.slug },
        create: {
          slug: lektion.slug,
          moduleId: gespeichertesModul.id,
          practiceSchemaId: datensatzId ?? null,
          title: lektion.titel,
          leadingQuestion: lektion.leitfrage,
          objectives: [...lektion.lernziele],
          body: lektion.text,
          estimatedMinutes: lektion.dauerMinuten,
          order: lektionsNummer,
          contentVersion: LEHRPLAN.version,
        },
        update: {
          title: lektion.titel,
          leadingQuestion: lektion.leitfrage,
          objectives: [...lektion.lernziele],
          body: lektion.text,
          estimatedMinutes: lektion.dauerMinuten,
          order: lektionsNummer,
          contentVersion: LEHRPLAN.version,
        },
      });
      lektionsNummer += 1;

      /*
       * Zuordnungen erst löschen, dann neu setzen.
       *
       * Ein Upsert je Paar ließe eine Zuordnung stehen, die aus dem Inhalt
       * entfernt wurde - und das Konzept bliebe still mit der Lektion
       * verbunden. Die Zuordnung trägt keinen eigenen Zustand, also ist das
       * hier ungefährlich.
       */
      await prisma.lessonConcept.deleteMany({ where: { lessonId: gespeicherteLektion.id } });
      for (const slug of lektion.konzepte) {
        const konzeptId = konzeptIds.get(slug);
        if (!konzeptId) continue;
        await prisma.lessonConcept.create({
          data: { lessonId: gespeicherteLektion.id, conceptId: konzeptId, isPrimary: true },
        });
      }

      let aufgabenNummer = 0;
      for (const aufgabe of lektion.aufgaben) {
        const gespeicherteAufgabe = await prisma.exercise.upsert({
          where: { slug: aufgabe.slug },
          create: {
            slug: aufgabe.slug,
            lessonId: gespeicherteLektion.id,
            practiceSchemaId: datensatzId ?? null,
            type: alsPrismaArt(aufgabe.art),
            title: aufgabe.titel,
            prompt: aufgabe.aufgabenstellung,
            payload: (aufgabe.nutzlast ?? {}) as never,
            starterSql: aufgabe.startSql ?? null,
            solutionSql: aufgabe.loesungSql ?? null,
            solutionNotes: aufgabe.loesungsErklaerung ?? null,
            allowedStatementClasses: [...(aufgabe.erlaubteKlassen ?? ['SELECT'])],
            expectedResultset: (aufgabe.erwartetesErgebnis ?? null) as never,
            comparisonOptions: (aufgabe.vergleich ?? { reihenfolgeZaehlt: false }) as never,
            hints: [...aufgabe.hinweise],
            difficulty: aufgabe.schwierigkeit,
            order: aufgabenNummer,
            contentVersion: LEHRPLAN.version,
          },
          update: {
            type: alsPrismaArt(aufgabe.art),
            title: aufgabe.titel,
            prompt: aufgabe.aufgabenstellung,
            payload: (aufgabe.nutzlast ?? {}) as never,
            starterSql: aufgabe.startSql ?? null,
            solutionSql: aufgabe.loesungSql ?? null,
            solutionNotes: aufgabe.loesungsErklaerung ?? null,
            allowedStatementClasses: [...(aufgabe.erlaubteKlassen ?? ['SELECT'])],
            expectedResultset: (aufgabe.erwartetesErgebnis ?? null) as never,
            comparisonOptions: (aufgabe.vergleich ?? { reihenfolgeZaehlt: false }) as never,
            hints: [...aufgabe.hinweise],
            difficulty: aufgabe.schwierigkeit,
            order: aufgabenNummer,
            contentVersion: LEHRPLAN.version,
          },
        });
        aufgabenNummer += 1;

        await prisma.exerciseConcept.deleteMany({ where: { exerciseId: gespeicherteAufgabe.id } });
        for (const slug of aufgabe.konzepte) {
          const konzeptId = konzeptIds.get(slug);
          if (!konzeptId) continue;
          await prisma.exerciseConcept.create({
            data: { exerciseId: gespeicherteAufgabe.id, conceptId: konzeptId },
          });
        }
      }
    }
  }

  // --- Projekte -----------------------------------------------------------
  let projektNummer = 0;
  for (const projekt of LEHRPLAN.projekte) {
    const modulId = (
      await prisma.courseModule.findUnique({
        where: { slug: projekt.modul },
        select: { id: true },
      })
    )?.id;

    await prisma.project.upsert({
      where: { slug: projekt.slug },
      create: {
        slug: projekt.slug,
        moduleId: modulId ?? null,
        title: projekt.titel,
        brief: projekt.auftrag,
        acceptance: [...projekt.abnahme],
        starterSql: projekt.startSql ?? null,
        order: projektNummer,
        contentVersion: LEHRPLAN.version,
      },
      update: {
        title: projekt.titel,
        brief: projekt.auftrag,
        acceptance: [...projekt.abnahme],
        starterSql: projekt.startSql ?? null,
        order: projektNummer,
        contentVersion: LEHRPLAN.version,
      },
    });
    projektNummer += 1;
  }

  const zahlen = {
    module: LEHRPLAN.module.length,
    lektionen: LEHRPLAN.module.reduce((summe, modul) => summe + modul.lektionen.length, 0),
    aufgaben: LEHRPLAN.module.reduce(
      (summe, modul) =>
        summe + modul.lektionen.reduce((teil, lektion) => teil + lektion.aufgaben.length, 0),
      0,
    ),
    konzepte: LEHRPLAN.konzepte.length,
    projekte: LEHRPLAN.projekte.length,
  };

  console.log(
    `\n  Lehrplan eingespielt: ${zahlen.module} Module, ${zahlen.lektionen} Lektionen, ` +
      `${zahlen.aufgaben} Aufgaben, ${zahlen.konzepte} Konzepte, ${zahlen.projekte} Projekte.\n`,
  );
}

/**
 * Die Aufgabenart des Inhalts auf die des Datenmodells abbilden.
 *
 * Die Zuordnung selbst steht in `src/domain/aufgabe/art.ts` – dieselbe Tabelle
 * braucht die Anwendung beim Lesen in der Gegenrichtung, und zwei Kopien davon
 * laufen irgendwann auseinander.
 */
function alsPrismaArt(art: string): never {
  const wert = ART_IM_DATENMODELL[art as keyof typeof ART_IM_DATENMODELL];
  // Ein unbekannter Wert würde sonst als ungültiger Enum-Wert erst in der
  // Datenbank auffallen - mit einer Meldung, die den Inhalt nicht nennt.
  if (!wert) throw new Error(`Unbekannte Aufgabenart im Inhalt: ${art}`);
  return wert as never;
}

seed()
  .catch((fehler: unknown) => {
    console.error(fehler);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
