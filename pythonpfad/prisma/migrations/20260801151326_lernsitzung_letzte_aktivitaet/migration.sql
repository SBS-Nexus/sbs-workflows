-- Zeitpunkt der letzten Aktivität einer Lernsitzung.
--
-- Die Untätigkeitsspanne wird ab hier gemessen statt ab `startedAt`. Sonst
-- würde eine durchgehend aktive Sitzung nach Erreichen der Höchstdauer
-- fälschlich als beendet gelten und geteilt.
ALTER TABLE "learning_sessions"
  ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Bestehende Zeilen: Die letzte bekannte Aktivität ist das Sitzungsende,
-- ersatzweise der Sitzungsbeginn. Ohne diese Rückführung würden alte, längst
-- beendete Sitzungen als gerade eben aktiv gelten und bei der nächsten
-- Bearbeitung fortgesetzt statt neu begonnen.
UPDATE "learning_sessions"
   SET "lastActivityAt" = COALESCE("endedAt", "startedAt");
