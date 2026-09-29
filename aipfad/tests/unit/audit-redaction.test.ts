import { describe, expect, it } from 'vitest';
import { redactMetadata, SCHWAERZUNG } from '@/server/audit/redaction';

/**
 * Die Schwärzungsregel für Auditmetadaten (E07/ENT-B06).
 *
 * Der Kern jeder Prüfung hier ist derselbe: Der ursprüngliche Wert darf im
 * Ergebnis NIRGENDS mehr vorkommen — auch nicht tief verschachtelt, auch
 * nicht in einem Array. Deshalb prüfen mehrere Fälle zusätzlich gegen die
 * serialisierte Ausgabe, statt nur einzelne Felder zu vergleichen: Ein
 * Feldvergleich übersieht eine Kopie an anderer Stelle.
 */

const GEHEIM = 'SUPERGEHEIM-KANARIENVOGEL';

describe('Schwärzung der Auditmetadaten', () => {
  it('lässt unverfängliche betriebliche Tatsachen unverändert', () => {
    const eingabe = { previousRole: 'MEMBER', newRole: 'ADMIN', source: 'ui', count: 3, ok: true };
    expect(redactMetadata(eingabe)).toEqual(eingabe);
  });

  it('schwärzt verbotene Felder auf oberster Ebene', () => {
    const ergebnis = redactMetadata({ email: GEHEIM, password: GEHEIM, reasonCode: 'R1' });
    expect(ergebnis.email).toBe(SCHWAERZUNG);
    expect(ergebnis.password).toBe(SCHWAERZUNG);
    expect(ergebnis.reasonCode).toBe('R1');
  });

  it('steigt in verschachtelte Objekte ab', () => {
    const ergebnis = redactMetadata({
      actor: { id: 'u1', email: GEHEIM, profil: { name: GEHEIM, stufe: 2 } },
    });
    expect(JSON.stringify(ergebnis)).not.toContain(GEHEIM);
    const actor = ergebnis.actor as Record<string, unknown>;
    expect(actor.id).toBe('u1');
    expect((actor.profil as Record<string, unknown>).stufe).toBe(2);
  });

  it('schwärzt auch in Objekten innerhalb von Arrays', () => {
    const ergebnis = redactMetadata({
      mitglieder: [
        { id: 'a', email: GEHEIM },
        { id: 'b', token: GEHEIM },
      ],
    });
    expect(JSON.stringify(ergebnis)).not.toContain(GEHEIM);
    const liste = ergebnis.mitglieder as Record<string, unknown>[];
    expect(liste[0]?.id).toBe('a');
    expect(liste[1]?.id).toBe('b');
  });

  it('vergleicht Feldnamen ohne Rücksicht auf Groß- und Kleinschreibung', () => {
    const ergebnis = redactMetadata({
      EMAIL: GEHEIM,
      PasswordHash: GEHEIM,
      apiKey: GEHEIM,
      ApiKey: GEHEIM,
      AUTHORIZATION: GEHEIM,
      Cookie: GEHEIM,
    });
    expect(JSON.stringify(ergebnis)).not.toContain(GEHEIM);
  });

  it('deckt jedes im Vertrag genannte Feld ab', () => {
    // Die Liste aus docs/SECURITY.md, einzeln geprüft — damit ein späteres
    // Entfernen eines Eintrags aus der Regel hier auffällt und nicht erst,
    // wenn ein echter Wert in einer Auditzeile steht.
    const felder = [
      'email',
      'name',
      'password',
      // Die deutsche Schreibweise steht ebenfalls in der Regel; sie fehlte
      // hier, und ihr Entfernen aus dem Code blieb dadurch unbemerkt.
      'passwort',
      'passwordHash',
      'token',
      'tokenHash',
      'csrfSecret',
      'authorization',
      'cookie',
      'secret',
      'apiKey',
      'submittedAnswer',
      'solutionNotes',
    ];
    for (const feld of felder) {
      const ergebnis = redactMetadata({ [feld]: GEHEIM });
      expect(ergebnis[feld], `${feld} wurde nicht geschwärzt`).toBe(SCHWAERZUNG);
    }
  });

  it('vergleicht den GANZEN Feldnamen, nicht einen Namensbestandteil', () => {
    // Festgehalten, weil es die wichtigste Grenze der Regel ist und jeder
    // spätere Ereigniserzeuger (E04B, E04C, E08B) sie kennen muss:
    // Zusammengesetzte Namen sind NICHT abgedeckt. Eine Teilstringsuche
    // träfe auch `hostname`, `filename` oder `courseName` und gäbe eine
    // Sicherheit vor, die sie nicht hat. Schlägt diese Prüfung fehl, weil
    // jemand auf Teilstrings umgestellt hat, ist das eine bewusste
    // Entscheidung — und die Dokumentation muss mit.
    const zusammengesetzt = ['userEmail', 'accessToken', 'emailAddress', 'user_email', 'api_key'];
    for (const feld of zusammengesetzt) {
      const ergebnis = redactMetadata({ [feld]: GEHEIM });
      expect(ergebnis[feld], `${feld} verhält sich anders als dokumentiert`).toBe(GEHEIM);
    }
  });

  it('zählt vierzehn verbotene Felder, nicht dreizehn', () => {
    // Die Regel deckt eines mehr ab, als Dokumentation und Vertrag lange
    // nannten (`passwort`). Diese Prüfung hält Zahl und Liste zusammen.
    const alle = [
      'email',
      'name',
      'password',
      'passwort',
      'passwordHash',
      'token',
      'tokenHash',
      'csrfSecret',
      'authorization',
      'cookie',
      'secret',
      'apiKey',
      'submittedAnswer',
      'solutionNotes',
    ];
    expect(alle).toHaveLength(14);
    const geschwaerzt = alle.filter((f) => redactMetadata({ [f]: GEHEIM })[f] === SCHWAERZUNG);
    expect(geschwaerzt).toHaveLength(14);
  });

  it('behält den Schlüssel und ersetzt nur den Wert', () => {
    // Dass ein Feld da war, ist eine betriebliche Tatsache; sein Inhalt
    // nicht. Ein entfernter Schlüssel verlöre die erste Information.
    const ergebnis = redactMetadata({ email: GEHEIM });
    expect(Object.keys(ergebnis)).toEqual(['email']);
  });

  it('schwärzt einen verbotenen Schlüssel samt seines ganzen Teilbaums', () => {
    const ergebnis = redactMetadata({ secret: { tief: { tiefer: GEHEIM } } });
    expect(ergebnis.secret).toBe(SCHWAERZUNG);
    expect(JSON.stringify(ergebnis)).not.toContain(GEHEIM);
  });

  it('bricht sehr tiefe Verschachtelung ab, statt endlos abzusteigen', () => {
    // Konstruiert 20 Ebenen; ab der Grenze steht die Markierung. Wichtig ist
    // nicht die genaue Tiefe, sondern dass die Funktion terminiert und nichts
    // Ungeprüftes durchlässt.
    let tief: Record<string, unknown> = { email: GEHEIM };
    for (let i = 0; i < 20; i += 1) tief = { ebene: tief };

    const ergebnis = redactMetadata(tief);
    expect(JSON.stringify(ergebnis)).not.toContain(GEHEIM);
  });

  it('überlebt einen zyklischen Wert, ohne zu hängen', () => {
    const zyklus: Record<string, unknown> = { id: 'x' };
    zyklus.selbst = zyklus;
    const ergebnis = redactMetadata(zyklus);
    // Terminiert und ist serialisierbar — beides wäre ohne Tiefengrenze nicht so.
    expect(() => JSON.stringify(ergebnis)).not.toThrow();
  });

  it('ersetzt Werte, die kein gültiges JSON sind', () => {
    const ergebnis = redactMetadata({
      fn: () => GEHEIM,
      sym: Symbol(GEHEIM),
      leer: undefined,
      echt: 'bleibt',
    });
    expect(ergebnis.fn).toBe(SCHWAERZUNG);
    expect(ergebnis.sym).toBe(SCHWAERZUNG);
    expect(ergebnis.leer).toBe(SCHWAERZUNG);
    expect(ergebnis.echt).toBe('bleibt');
    expect(JSON.stringify(ergebnis)).not.toContain(GEHEIM);
  });

  it('verändert die Eingabe nicht', () => {
    const eingabe = { email: GEHEIM, tief: { token: GEHEIM } };
    redactMetadata(eingabe);
    // Der Aufrufer hält sein Objekt möglicherweise noch; die Regel darf es
    // ihm nicht unter der Hand umschreiben.
    expect(eingabe.email).toBe(GEHEIM);
    expect(eingabe.tief.token).toBe(GEHEIM);
  });

  it('lässt null und leere Objekte unangetastet', () => {
    expect(redactMetadata({})).toEqual({});
    expect(redactMetadata({ leer: null })).toEqual({ leer: null });
  });
});
