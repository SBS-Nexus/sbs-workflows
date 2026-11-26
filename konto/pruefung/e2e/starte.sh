#!/usr/bin/env bash
# Startet die Testumgebung des gemeinsamen Kontos und richtet sie so ein wie
# konto.lernpfade.net (konto/einrichtung/einrichten.mjs), dazu Testkonten.
# Danach liegen in $KONTO_E2E_DIR (Rechte 700):
#   <app>.env        AUTH_*-Werte und Schalter `an` je App (aipfad, pythonpfad,
#                    sqlpfad)
#   testkonten.json  Adressen und Passwörter der Testkonten
#   einrichtung.pem  Schlüssel des befristeten System-Nutzers
# Mit KONTO_E2E_UMFANG=zitadel startet nur ZITADEL (ohne Einrichtung,
# Anmelde-App und Testkonten).
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

# KONTO_E2E_UMFANG=zitadel: nur ZITADEL und der Schlüssel des System-Nutzers,
# etwa für die Probe der Kontoübernahme (konto/pruefung/uebernahme-pruefung.mjs).
if [ "${KONTO_E2E_UMFANG:-alles}" = "zitadel" ]; then
  echo "== Bereit: http://localhost:8080 (nur ZITADEL)"
  exit 0
fi

echo "== Einrichten wie konto.lernpfade.net"
node "$WURZEL/konto/einrichtung/einrichten.mjs" \
  --basis http://localhost:8080 \
  --schluessel "$DIR/einrichtung.pem" \
  --ausgabe "$DIR/geheim" \
  --anwendungen \
  --anwendung-basis aipfad=http://127.0.0.1:3101 \
  --anwendung-basis pythonpfad=http://127.0.0.1:3100 \
  --anwendung-basis sqlpfad=http://127.0.0.1:3100 \
  --anwendung-basis hub=http://127.0.0.1:3210 \
  --rueckkanal-basis aipfad=http://host.docker.internal:3101 \
  --rueckkanal-basis pythonpfad=http://host.docker.internal:3100 \
  --rueckkanal-basis sqlpfad=http://host.docker.internal:3100

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

for APP in aipfad pythonpfad sqlpfad; do
  node -e '
    const fs = require("node:fs");
    const crypto = require("node:crypto");
    const [dir, app] = process.argv.slice(1);
    const { AUTH_CLIENT_ID, AUTH_CLIENT_SECRET } = JSON.parse(fs.readFileSync(`${dir}/geheim/${app}-auth.json`));
    const hub = JSON.parse(fs.readFileSync(`${dir}/geheim/hub-auth.json`));
    const plattform = JSON.parse(fs.readFileSync(`${dir}/geheim/plattform-auth.json`));
    const zeilen = [
      `AUTH_HUB_CLIENT_ID=${hub.AUTH_CLIENT_ID}`,
      `AUTH_PLATTFORM_SUB=${plattform.AUTH_PLATTFORM_SUB}`,
      "FEATURE_ZENTRALE_ANMELDUNG=an",
      "AUTH_ISSUER=http://localhost:8080",
      `AUTH_CLIENT_ID=${AUTH_CLIENT_ID}`,
      `AUTH_CLIENT_SECRET=${AUTH_CLIENT_SECRET}`,
      `AUTH_STATE_SECRET=${crypto.randomBytes(36).toString("base64url")}`,
    ];
    fs.writeFileSync(`${dir}/${app}.env`, zeilen.join("\n") + "\n", { mode: 0o600 });
  ' "$DIR" "$APP"
done

# Zugang des Hubs für die Strecke (E4.5): Client-ID und Secret, dazu die
# Umgebung des Hubs selbst (hub.env, E4.5b).
cp "$DIR/geheim/hub-auth.json" "$DIR/hub.json"
node -e '
  const fs = require("node:fs");
  const crypto = require("node:crypto");
  const dir = process.argv[1];
  const { AUTH_CLIENT_ID, AUTH_CLIENT_SECRET } = JSON.parse(fs.readFileSync(`${dir}/geheim/hub-auth.json`));
  const plattform = JSON.parse(fs.readFileSync(`${dir}/geheim/plattform-auth.json`));
  const zeilen = [
    `PLATTFORM_CLIENT_ID=${plattform.PLATTFORM_CLIENT_ID}`,
    `PLATTFORM_CLIENT_SECRET=${plattform.PLATTFORM_CLIENT_SECRET}`,
    "AUTH_ISSUER=http://localhost:8080",
    `AUTH_CLIENT_ID=${AUTH_CLIENT_ID}`,
    `AUTH_CLIENT_SECRET=${AUTH_CLIENT_SECRET}`,
    `HUB_SESSION_SECRET=${crypto.randomBytes(36).toString("base64url")}`,
    "HUB_URL=http://127.0.0.1:3210",
  ];
  fs.writeFileSync(`${dir}/hub.env`, zeilen.join("\n") + "\n", { mode: 0o600 });
' "$DIR"

echo "== Bereit: http://localhost:8080 (ZITADEL), http://localhost:3000/ui/v2/login (Anmeldung)"
