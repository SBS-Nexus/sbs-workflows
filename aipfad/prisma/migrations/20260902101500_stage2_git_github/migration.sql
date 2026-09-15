-- Ausbaustufe 2 (Git & GitHub): neue Interaktionsformen und Lab-Arten.
--
-- Reines Hinzufügen von Enum-Werten: Bestehende Zeilen behalten ihren Wert,
-- es werden keine Daten verändert oder entfernt. PostgreSQL erlaubt das
-- Hinzufügen ohne Neuaufbau der Tabellen.

-- AlterEnum
ALTER TYPE "ExerciseType" ADD VALUE IF NOT EXISTS 'INTERPRETATION';
ALTER TYPE "ExerciseType" ADD VALUE IF NOT EXISTS 'CLASSIFICATION';
ALTER TYPE "ExerciseType" ADD VALUE IF NOT EXISTS 'CONFLICT_RESOLUTION';

-- AlterEnum
ALTER TYPE "LabKind" ADD VALUE IF NOT EXISTS 'GIT_STATE';
ALTER TYPE "LabKind" ADD VALUE IF NOT EXISTS 'BRANCH';
ALTER TYPE "LabKind" ADD VALUE IF NOT EXISTS 'MERGE_CONFLICT';
