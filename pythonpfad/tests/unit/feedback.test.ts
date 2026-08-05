import { describe, expect, it } from 'vitest';
import {
  FEEDBACK_DEFAULTS,
  FEEDBACK_EVENTS,
  type FeedbackPreferences,
  isSilent,
  planDauerMs,
  planFeedback,
} from '@/domain/feedback/feedback-policy';

const AN: FeedbackPreferences = { sound: true, haptics: true, reduceMotion: false };

describe('Regeln der spürbaren Rückmeldung', () => {
  it('bleibt in der Voreinstellung tonlos', () => {
    // Die wichtigste Zusicherung dieser Datei: Wer die Anwendung zum ersten
    // Mal öffnet – im Zug, im Büro, neben einem schlafenden Kind – hört nichts.
    expect(FEEDBACK_DEFAULTS.sound).toBe(false);
    for (const event of FEEDBACK_EVENTS) {
      expect(planFeedback(event, FEEDBACK_DEFAULTS).toene, event).toEqual([]);
    }
  });

  it('lässt in der Voreinstellung vibrieren', () => {
    // Vibration spürt nur, wer das Gerät in der Hand hält – sie stört niemanden
    // im Raum und darf deshalb voreingestellt sein.
    expect(planFeedback('aufgabe-geloest', FEEDBACK_DEFAULTS).vibration.length).toBeGreaterThan(0);
  });

  it('gibt bei eingeschaltetem Ton für jedes Erfolgsereignis einen Klang', () => {
    for (const event of FEEDBACK_EVENTS) {
      const plan = planFeedback(event, AN);
      if (event === 'bedienung') continue; // siehe eigener Test unten
      expect(plan.toene.length, event).toBeGreaterThan(0);
    }
  });

  it('lässt eine Bedienhandlung niemals klingen', () => {
    // Ein Klick je Auswahl wäre nach zwei Minuten unerträglich. Tastgefühl ja,
    // Geräusch nein – und zwar unabhängig davon, ob der Ton eingeschaltet ist.
    expect(planFeedback('bedienung', AN).toene).toEqual([]);
    expect(planFeedback('bedienung', AN).vibration.length).toBeGreaterThan(0);
  });

  it('schaltet die Vibration mit der Bewegungsreduktion ab', () => {
    const ruhig: FeedbackPreferences = { ...AN, reduceMotion: true };
    for (const event of FEEDBACK_EVENTS) {
      expect(planFeedback(event, ruhig).vibration, event).toEqual([]);
    }
  });

  it('lässt den Ton von der Bewegungsreduktion unberührt', () => {
    // Bewegung und Klang sind verschiedene Sinne. Wer wegen Schwindel keine
    // Animationen will, hat deshalb nichts gegen einen Ton.
    const ruhig: FeedbackPreferences = { ...AN, reduceMotion: true };
    expect(planFeedback('aufgabe-geloest', ruhig).toene.length).toBeGreaterThan(0);
  });

  it('schaltet jeden Kanal einzeln ab', () => {
    const nurTon: FeedbackPreferences = { sound: true, haptics: false, reduceMotion: false };
    const nurVibration: FeedbackPreferences = { sound: false, haptics: true, reduceMotion: false };

    expect(planFeedback('aufgabe-geloest', nurTon).vibration).toEqual([]);
    expect(planFeedback('aufgabe-geloest', nurTon).toene.length).toBeGreaterThan(0);
    expect(planFeedback('aufgabe-geloest', nurVibration).toene).toEqual([]);
    expect(planFeedback('aufgabe-geloest', nurVibration).vibration.length).toBeGreaterThan(0);
  });

  it('ist vollständig still, wenn beides aus ist', () => {
    const aus: FeedbackPreferences = { sound: false, haptics: false, reduceMotion: false };
    for (const event of FEEDBACK_EVENTS) {
      expect(isSilent(planFeedback(event, aus)), event).toBe(true);
    }
  });

  it('hält jeden Klang kurz', () => {
    // Eine Rückmeldung, die länger dauert als der Gedanke danach, hält auf.
    for (const event of FEEDBACK_EVENTS) {
      expect(planDauerMs(planFeedback(event, AN)), event).toBeLessThanOrEqual(300);
    }
  });

  it('steigt in der Tonhöhe an', () => {
    // Aufsteigende Intervalle werden als Bestätigung gehört, absteigende als
    // Verneinung. Da es hier nur Erfolgsereignisse gibt, darf keine Folge fallen.
    for (const event of FEEDBACK_EVENTS) {
      const toene = planFeedback(event, AN).toene;
      for (let i = 1; i < toene.length; i += 1) {
        expect(toene[i]!.hz, `${event}, Ton ${i + 1}`).toBeGreaterThan(toene[i - 1]!.hz);
      }
    }
  });

  it('bleibt leise genug, um nicht zu erschrecken', () => {
    for (const event of FEEDBACK_EVENTS) {
      for (const ton of planFeedback(event, AN).toene) {
        expect(ton.lautstaerke, event).toBeGreaterThan(0);
        expect(ton.lautstaerke, event).toBeLessThanOrEqual(0.2);
      }
    }
  });

  it('kennt kein Ereignis für einen Fehlschlag', () => {
    // Diese Prüfung ist eine Absichtserklärung in Testform: Sobald jemand ein
    // Ereignis wie „aufgabe-falsch" ergänzt, schlägt sie fehl und zwingt zu
    // einer bewussten Entscheidung.
    const verdaechtig = /falsch|fehler|misslungen|verloren|verpasst|abgebrochen/i;
    for (const event of FEEDBACK_EVENTS) {
      expect(event, `Ereignis „${event}" klingt nach Misserfolg`).not.toMatch(verdaechtig);
    }
  });

  it('liefert für ein unbekanntes Ereignis nichts, statt zu scheitern', () => {
    const plan = planFeedback('gibt-es-nicht' as never, AN);
    expect(isSilent(plan)).toBe(true);
  });
});
