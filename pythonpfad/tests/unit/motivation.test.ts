import { describe, expect, it } from 'vitest';
import {
  CALENDAR_DAYS,
  buildRhythm,
  describeStreak,
  toIsoDay,
  type DayActivity,
} from '@/domain/motivation/rhythm';
import {
  MILESTONES,
  evaluateMilestones,
  newlyReached,
  nextMilestone,
  type MilestoneStats,
} from '@/domain/motivation/milestones';

const HEUTE = new Date(2026, 7, 4, 14, 0, 0); // 4. August 2026, ein Dienstag

function tag(offsetTage: number, minutes: number): DayActivity {
  const date = new Date(HEUTE);
  date.setDate(date.getDate() - offsetTage);
  return { date: toIsoDay(date), minutes, activities: Math.max(1, Math.round(minutes / 5)) };
}

const LEERE_STATS: MilestoneStats = {
  lessonsCompleted: 0,
  exercisesPassed: 0,
  exercisesPassedFirstTry: 0,
  transferPassed: 0,
  conceptsAtThreshold: 0,
  recoveredWithoutSolution: 0,
  reviewsCompleted: 0,
  projectsAccepted: 0,
  solvedWithoutTemplate: 0,
};

describe('Tagesziel', () => {
  it('rechnet den Fortschritt bis zum Ziel', () => {
    const rhythm = buildRhythm([tag(0, 12)], 20, HEUTE);
    expect(rhythm.today.minutes).toBe(12);
    expect(rhythm.today.goalMinutes).toBe(20);
    expect(rhythm.today.reached).toBe(false);
    expect(rhythm.today.remainingMinutes).toBe(8);
    expect(rhythm.today.percent).toBe(60);
  });

  it('deckelt bei erreichtem Ziel und zeigt kein Übertreffen', () => {
    // Wer sein Ziel erreicht hat, soll nicht das Gefühl bekommen, es sei zu
    // niedrig gewesen. Der Ring bleibt bei 100.
    const rhythm = buildRhythm([tag(0, 90)], 20, HEUTE);
    expect(rhythm.today.reached).toBe(true);
    expect(rhythm.today.percent).toBe(100);
    expect(rhythm.today.remainingMinutes).toBe(0);
  });

  it('kommt ohne gesetztes Ziel zurecht', () => {
    const rhythm = buildRhythm([tag(0, 5)], 0, HEUTE);
    expect(rhythm.today.percent).toBe(100);
    expect(rhythm.message).toContain('kein Tagesziel');
  });
});

describe('Lerntage', () => {
  it('zählt Tage mit Aktivität in den letzten 30 Tagen', () => {
    const rhythm = buildRhythm([tag(0, 10), tag(3, 5), tag(20, 30)], 20, HEUTE);
    expect(rhythm.learningDaysLast30).toBe(3);
  });

  it('lässt Tage außerhalb des Fensters unberücksichtigt', () => {
    const rhythm = buildRhythm([tag(0, 10), tag(45, 60)], 20, HEUTE);
    expect(rhythm.learningDaysLast30).toBe(1);
    expect(rhythm.calendar).toHaveLength(CALENDAR_DAYS);
  });

  it('liefert die Kalenderleiste chronologisch mit heute am Ende', () => {
    const rhythm = buildRhythm([tag(0, 10)], 20, HEUTE);
    const letzter = rhythm.calendar[rhythm.calendar.length - 1];
    expect(letzter?.isToday).toBe(true);
    expect(letzter?.date).toBe(toIsoDay(HEUTE));
    expect(rhythm.calendar.filter((day) => day.isToday)).toHaveLength(1);
  });

  it('stuft die Tage am eigenen Ziel ab', () => {
    const rhythm = buildRhythm([tag(0, 20), tag(1, 12), tag(2, 3), tag(3, 0)], 20, HEUTE);
    const nachDatum = new Map(rhythm.calendar.map((day) => [day.date, day.level]));
    expect(nachDatum.get(tag(0, 0).date)).toBe(3); // Ziel erreicht
    expect(nachDatum.get(tag(1, 0).date)).toBe(2); // über der Hälfte
    expect(nachDatum.get(tag(2, 0).date)).toBe(1); // etwas
    expect(nachDatum.get(tag(3, 0).date)).toBe(0); // nichts
  });

  it('beschreibt jeden Tag vorlesbar', () => {
    const rhythm = buildRhythm([tag(0, 12)], 20, HEUTE);
    const heute = rhythm.calendar[rhythm.calendar.length - 1];
    expect(heute?.label).toBe('Dienstag, 4. August: 12 Minuten');
    const gestern = rhythm.calendar[rhythm.calendar.length - 2];
    expect(gestern?.label).toBe('Montag, 3. August: keine Übung');
  });
});

describe('Serie', () => {
  it('zählt zusammenhängende Tage', () => {
    const rhythm = buildRhythm([tag(0, 10), tag(1, 10), tag(2, 10)], 20, HEUTE);
    expect(rhythm.currentStreakDays).toBe(3);
  });

  it('bricht bei einer Lücke ab', () => {
    const rhythm = buildRhythm([tag(0, 10), tag(2, 10), tag(3, 10)], 20, HEUTE);
    expect(rhythm.currentStreakDays).toBe(1);
    expect(rhythm.longestStreakDays).toBe(2);
  });

  it('gilt am Morgen noch nicht als unterbrochen', () => {
    // Heute noch nichts, gestern und vorgestern schon: Die Serie steht bei
    // zwei. Alles andere wäre eine Anzeige der Uhrzeit, nicht des Lernens.
    const rhythm = buildRhythm([tag(1, 10), tag(2, 10)], 20, HEUTE);
    expect(rhythm.currentStreakDays).toBe(2);
  });

  it('merkt sich die längste Serie unabhängig von der aktuellen', () => {
    const rhythm = buildRhythm(
      [tag(0, 10), tag(5, 10), tag(6, 10), tag(7, 10), tag(8, 10)],
      20,
      HEUTE,
    );
    expect(rhythm.currentStreakDays).toBe(1);
    expect(rhythm.longestStreakDays).toBe(4);
  });
});

describe('Formulierungen ohne Dunkelmuster', () => {
  const faelle: Array<[string, DayActivity[]]> = [
    ['ohne jede Aktivität', []],
    ['heute nichts, früher viel', [tag(1, 60), tag(2, 60), tag(3, 60)]],
    ['heute angefangen', [tag(0, 3)]],
    ['Ziel erreicht', [tag(0, 25)]],
    ['nach langer Pause', [tag(28, 60)]],
  ];

  // Diese Muster sind ausdrücklich untersagt: Verlust, Druck, Beschämung,
  // künstliche Dringlichkeit, Anfeuerung.
  const verboten = [
    /verloren/i,
    /verlierst/i,
    /nicht aufgeben/i,
    /schade/i,
    /leider/i,
    /nur noch heute/i,
    /schnell/i,
    /versäum/i,
    /schon wieder/i,
    /endlich/i,
    /streng dich/i,
    /!/,
  ];

  it.each(faelle)('formuliert %s ohne Druck', (_name, days) => {
    const rhythm = buildRhythm(days, 20, HEUTE);
    for (const muster of verboten) {
      expect(rhythm.message, rhythm.message).not.toMatch(muster);
    }
  });

  it('beschreibt eine fehlende Serie neutral', () => {
    expect(describeStreak(0, 0)).toBe('Zurzeit keine Serie.');
    expect(describeStreak(0, 9)).toContain('Deine längste waren 9 Tage.');
    expect(describeStreak(1, 1)).toBe('Heute schon geübt.');
    expect(describeStreak(4, 9)).toBe('4 Tage in Folge.');

    for (const text of [describeStreak(0, 0), describeStreak(0, 9)]) {
      expect(text).not.toMatch(/verloren|unterbrochen|leider/i);
    }
  });
});

describe('Meilensteine', () => {
  it('hat eindeutige Schlüssel und sinnvolle Ziele', () => {
    const keys = MILESTONES.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const milestone of MILESTONES) {
      expect(milestone.target, milestone.key).toBeGreaterThan(0);
      expect(milestone.description.length, milestone.key).toBeGreaterThan(30);
    }
  });

  it('koppelt keinen Meilenstein an Regelmäßigkeit oder Zeitaufwand', () => {
    // Die zentrale Produktentscheidung dieser Datei. Anwesenheit ist keine
    // Kompetenz; wer in zwei Sitzungen so weit kommt wie jemand anders in
    // zwei Wochen, hat dasselbe gelernt.
    const stats = Object.keys(LEERE_STATS);
    expect(stats).not.toContain('streakDays');
    expect(stats).not.toContain('activeMinutes');
    expect(stats).not.toContain('daysActive');

    for (const milestone of MILESTONES) {
      expect(`${milestone.label} ${milestone.description}`, milestone.key).not.toMatch(
        /in Folge|täglich|jeden Tag|Serie|Minuten lang|Stunden/i,
      );
    }
  });

  it('erkennt einen erreichten Meilenstein', () => {
    const states = evaluateMilestones({ ...LEERE_STATS, lessonsCompleted: 1 }, new Map());
    expect(states.find((s) => s.key === 'erste-lektion')?.reached).toBe(true);
    expect(states.find((s) => s.key === 'zehn-aufgaben')?.reached).toBe(false);
  });

  it('zeigt den Fortschritt gedeckelt auf das Ziel', () => {
    const states = evaluateMilestones({ ...LEERE_STATS, exercisesPassed: 40 }, new Map());
    const zehn = states.find((s) => s.key === 'zehn-aufgaben');
    expect(zehn?.current).toBe(10);
    expect(zehn?.target).toBe(10);
  });

  it('behält einen vergebenen Meilenstein, auch wenn der Wert später sinkt', () => {
    const vergeben = new Map([['zehn-konzepte-gefestigt', new Date(2026, 0, 1)]]);
    const states = evaluateMilestones({ ...LEERE_STATS, conceptsAtThreshold: 0 }, vergeben);
    const eintrag = states.find((s) => s.key === 'zehn-konzepte-gefestigt');
    expect(eintrag?.reached).toBe(true);
    expect(eintrag?.awardedAt).toEqual(new Date(2026, 0, 1));
  });

  it('meldet nur wirklich neue Meilensteine', () => {
    const stats = { ...LEERE_STATS, lessonsCompleted: 3, exercisesPassed: 12 };
    expect(newlyReached(stats, new Map())).toEqual(
      expect.arrayContaining(['erste-lektion', 'zehn-aufgaben']),
    );
    const schonDa = new Map([['erste-lektion', new Date()]]);
    expect(newlyReached(stats, schonDa)).not.toContain('erste-lektion');
    expect(newlyReached(stats, schonDa)).toContain('zehn-aufgaben');
  });

  it('schlägt genau einen nächsten Meilenstein vor – den nächstliegenden', () => {
    const states = evaluateMilestones(
      { ...LEERE_STATS, lessonsCompleted: 1, exercisesPassed: 9, projectsAccepted: 0 },
      new Map([['erste-lektion', new Date()]]),
    );
    const naechster = nextMilestone(states);
    // Sowohl „zehn Aufgaben" (9 von 10) als auch „einen Fehler selbst behoben"
    // (0 von 1) fehlen um eins. Gewählt wird der, bei dem schon neun Zehntel
    // des Weges zurückgelegt sind.
    expect(naechster?.key).toBe('zehn-aufgaben');
  });

  it('zieht bei gleichem Rückstand den weiter fortgeschrittenen vor', () => {
    const states = evaluateMilestones(
      { ...LEERE_STATS, exercisesPassed: 9, exercisesPassedFirstTry: 24 },
      new Map([['erste-lektion', new Date()]]),
    );
    // Beiden fehlt genau einer; „25 im ersten Anlauf" ist mit 24/25 weiter
    // als „zehn Aufgaben" mit 9/10.
    expect(nextMilestone(states)?.key).toBe('sicher-im-ersten-anlauf');
  });

  it('liefert null, wenn alles erreicht ist', () => {
    const alles: MilestoneStats = {
      lessonsCompleted: 99,
      exercisesPassed: 99,
      exercisesPassedFirstTry: 99,
      transferPassed: 99,
      conceptsAtThreshold: 99,
      recoveredWithoutSolution: 99,
      reviewsCompleted: 99,
      projectsAccepted: 99,
      solvedWithoutTemplate: 99,
    };
    expect(nextMilestone(evaluateMilestones(alles, new Map()))).toBeNull();
  });

  it('beschreibt Können statt Lob', () => {
    for (const milestone of MILESTONES) {
      expect(milestone.description, milestone.key).not.toMatch(
        /super|toll|großartig|stolz|Champion|Held|Stufe \d/i,
      );
    }
  });
});
