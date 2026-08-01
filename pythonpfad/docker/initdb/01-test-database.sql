-- Legt beim ersten Start des Containers zusätzlich die Testdatenbank an.
-- Integrationstests arbeiten damit auf einer eigenen Datenbank und können
-- gefahrlos migriert und geleert werden.
CREATE DATABASE pythonpfad_test OWNER pythonpfad;
