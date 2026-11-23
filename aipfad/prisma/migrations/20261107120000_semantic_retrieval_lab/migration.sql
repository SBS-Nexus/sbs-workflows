-- LP-10A (Stufe 9, Embeddings & semantische Suche): neue Lab-Art.
--
-- Reines Hinzufügen eines Enum-Werts nach dem Muster der Ausbaustufe 2:
-- Bestehende Zeilen in "labs" und "lab_attempts" behalten ihren Wert, es
-- werden keine Daten verändert oder entfernt, keine Tabelle wird neu
-- aufgebaut. `IF NOT EXISTS` macht die Migration wiederholbar.

-- AlterEnum
ALTER TYPE "LabKind" ADD VALUE IF NOT EXISTS 'SEMANTIC_RETRIEVAL';
