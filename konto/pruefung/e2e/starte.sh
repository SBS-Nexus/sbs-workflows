#!/usr/bin/env bash
# Startet die Testumgebung des gemeinsamen Kontos und richtet sie so ein wie
# konto.lernpfade.net (konto/einrichtung/einrichten.mjs), dazu Testkonten.
# Danach liegen in $KONTO_E2E_DIR (Rechte 700):
#   aipfad.env       AUTH_*-Werte und Schalter `an` für AIPfad
#   testkonten.json  Adressen und Passwörter der Testkonten
#   einrichtung.pem  Schlüssel des befristeten System-Nutzers
# Aufräumen: docker compose -f konto/pruefung/e2e/compose.yaml down -v
set -euo pipefail

HIER=$(cd "$(dirname "$0")" && pwd)
WURZEL=$(cd "$HIER/../../.." && pwd)
DIR=${KONTO_E2E_DIR:?KONTO_E2E_DIR fehlt (Arbeitsordner für Testgeheimnisse)}
export KONTO_E2E_DIR="$DIR"
COMPOSE=(docker compose -f "$HIER/compose.yaml")

mkdir -p "$DIR/geheim"
chmod 700 "$DIR" "$DIR/geheim"
umask 077

openssl genrsa -out "$DIR/einrichtung.pem" 2048 2>/dev/null
KONTO_E2E_SYSTEMAPIUSERS=$(node -e '
  const pub = require("node:fs").readFileSync(0);
  const rollen = ["SYSTEM_OWNER", "IAM_OWNER", "ORG_OWNER"];
  process.stdout.write(JSON.stringify({ einrichtung: { KeyData: pub.toString("base64"),
    Memberships: [{ MemberType: "System", Roles: rollen }] } }));
' < <(openssl rsa -in "$DIR/einrichtung.pem" -pubout 2>/dev/null))
export KONTO_E2E_SYSTEMAPIUSERS

echo "== ZITADEL starten"
"${COMPOSE[@]}" up -d --wait --wait-timeout 300 konto-db konto

echo "== Einrichten wie konto.lernpfade.net"
node "$WURZEL/konto/einrichtung/einrichten.mjs" \
  --basis http://localhost:8080 \
  --schluessel "$DIR/einrichtung.pem" \
  --ausgabe "$DIR/geheim" \
  --anwendungen \
  --anwendung-basis aipfad=http://127.0.0.1:3101 \
  --rueckkanal-basis aipfad=http://host.docker.internal:3101

node -e '
  const fs = require("node:fs");
  const { ZITADEL_SERVICE_USER_TOKEN } = JSON.parse(fs.readFileSync(process.argv[1] + "/geheim/konto-login.json"));
  fs.writeFileSync(process.argv[1] + "/login.env", `ZITADEL_SERVICE_USER_TOKEN=${ZITADEL_SERVICE_USER_TOKEN}\n`, { mode: 0o600 });
' "$DIR"

echo "== Anmelde-App starten"
"${COMPOSE[@]}" up -d --wait --wait-timeout 180 konto-login

echo "== Testkonten"
node "$WURZEL/konto/pruefung/testkonten.mjs" \
  --basis http://localhost:8080 \
  --schluessel "$DIR/einrichtung.pem" \
  --ausgabe "$DIR/testkonten.json"

node -e '
  const fs = require("node:fs");
  const crypto = require("node:crypto");
  const { AUTH_CLIENT_ID, AUTH_CLIENT_SECRET } = JSON.parse(fs.readFileSync(process.argv[1] + "/geheim/aipfad-auth.json"));
  const zeilen = [
    "FEATURE_ZENTRALE_ANMELDUNG=an",
    "AUTH_ISSUER=http://localhost:8080",
    `AUTH_CLIENT_ID=${AUTH_CLIENT_ID}`,
    `AUTH_CLIENT_SECRET=${AUTH_CLIENT_SECRET}`,
    `AUTH_STATE_SECRET=${crypto.randomBytes(36).toString("base64url")}`,
  ];
  fs.writeFileSync(process.argv[1] + "/aipfad.env", zeilen.join("\n") + "\n", { mode: 0o600 });
' "$DIR"

echo "== Bereit: http://localhost:8080 (ZITADEL), http://localhost:3000/ui/v2/login (Anmeldung)"
