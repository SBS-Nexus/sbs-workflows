-- LP-11A: rein additiver Enum-Wert für das Offline-Vertragslabor.
-- Keine Änderung an vorhandenen Lab-Zeilen, Nutzerkonten oder Fortschritten.
ALTER TYPE "LabKind" ADD VALUE IF NOT EXISTS 'TOOL_CALLING';
