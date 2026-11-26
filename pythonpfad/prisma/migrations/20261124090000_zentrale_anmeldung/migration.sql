-- E4.4: Anbindung an das gemeinsame Konto (konto.lernpfade.net).
-- Rein additiv bis auf eine gelockerte Pflicht: Konten aus dem gemeinsamen
-- Konto haben in AIPfad kein eigenes Passwort. Vorhandene Zeilen behalten
-- ihren Hash; keine Daten werden verändert.
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "authSubject" TEXT;
ALTER TABLE "users" ADD COLUMN "authLinkedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "users_authSubject_key" ON "users"("authSubject");

ALTER TABLE "auth_sessions" ADD COLUMN "oidcSid" TEXT;
ALTER TABLE "auth_sessions" ADD COLUMN "oidcIdToken" TEXT;
CREATE INDEX "auth_sessions_oidcSid_idx" ON "auth_sessions"("oidcSid");
