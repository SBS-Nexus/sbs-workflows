-- LP-10B (Stufe 10, RAG – Wissen mit Quellen nutzen): neue Lab-Art.
--
-- Reines Hinzufügen eines Enum-Werts nach dem Muster von LP-10A: Bestehende
-- Zeilen in "labs" und "lab_attempts" behalten ihren Wert, es werden keine
-- Daten verändert oder entfernt, keine Tabelle wird neu aufgebaut.
-- `IF NOT EXISTS` macht die Migration wiederholbar.

-- AlterEnum
ALTER TYPE "LabKind" ADD VALUE IF NOT EXISTS 'RAG_PIPELINE';
