import {
  type Ausfuehrungsauftrag,
  type Ausfuehrungsgrenzen,
  type RohAusfuehrung,
  type SqlMotor,
  type Zustandsbericht,
} from '@/domain/sql/runner';

/**
 * Ein Motor ohne Datenbank.
 *
 * Er beweist ausdrücklich **nichts** über SQL-Server-Semantik – das können nur
 * Integrationstests gegen einen echten Server. Er beweist etwas über die
 * Schicht darüber: dass die Policy vor der Ausführung greift, dass Grenzen
 * eingehalten werden, dass Fehler übersetzt statt durchgereicht werden und
 * dass ein gekürztes Ergebnis nicht als bestanden gilt.
 *
 * Genau diese Regeln ändern sich oft und richten Schaden an, wenn sie falsch
 * sind. Sie gehören in Tests, die in Millisekunden laufen.
 */
export class MotorAttrappe implements SqlMotor {
  /** Jeder Auftrag, der tatsächlich bis zum Server durchgekommen wäre. */
  readonly ausgefuehrt: Ausfuehrungsauftrag[] = [];
  readonly abgebrochen: string[] = [];
  readonly zurueckgesetzt: string[] = [];

  /** Was der nächste Aufruf liefern soll – Ergebnis oder Fehler. */
  antwort: RohAusfuehrung | (() => Promise<RohAusfuehrung>) = {};

  erreichbar = true;

  async fuehreAus(
    auftrag: Ausfuehrungsauftrag,
    _grenzen: Ausfuehrungsgrenzen,
  ): Promise<RohAusfuehrung> {
    this.ausgefuehrt.push(auftrag);
    return typeof this.antwort === 'function' ? this.antwort() : this.antwort;
  }

  async brichAb(ausfuehrungId: string): Promise<void> {
    this.abgebrochen.push(ausfuehrungId);
  }

  async setzeSandboxZurueck(sandboxId: string): Promise<void> {
    this.zurueckgesetzt.push(sandboxId);
  }

  async zustand(): Promise<Zustandsbericht> {
    return this.erreichbar
      ? { erreichbar: true, hinweis: 'Der Übungsserver antwortet.', antwortzeitMs: 1 }
      : {
          erreichbar: false,
          hinweis: 'Der Übungsserver antwortet gerade nicht. Deine Lösungen bleiben gespeichert.',
        };
  }
}
