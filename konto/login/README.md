# konto-login – Anmelde-App mit Lernpfade-Änderungen

Grundlage ist `apps/login` aus ZITADEL **v4.20.5** (Commit `59827a8e`, MIT).
Das `Dockerfile` holt diesen Stand, wendet die Patches aus `patches/` in
Reihenfolge an und baut die App wie ZITADEL (`pnpm run build`, Standalone).
Plan und Begründung: `docs/E4-1-BAUPLAN.md`, E4.1b Stufe 2.

| Patch                    | Zweck                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `0001-next-16.4.6.patch` | Next.js 16.4.3 → 16.4.6 (sieben Sicherheitshinweise, behoben ab 16.4.5); Lock-Datei neu aufgelöst |
| `0002-html-lang.patch`   | `<html lang>` aus der aktiven Sprache (WCAG 3.1.1, axe `html-has-lang`)                           |

## Lokal bauen

```sh
git clone --filter=blob:none --no-checkout --depth 1 --branch v4.20.5 https://github.com/zitadel/zitadel zitadel-src
cd zitadel-src
git sparse-checkout init --no-cone
git sparse-checkout set /package.json /pnpm-workspace.yaml /pnpm-lock.yaml /.npmrc /apps/login/ /packages/zitadel-client/ /packages/zitadel-proto/ /proto/
git checkout
git apply ../konto/login/patches/*.patch
CI=true npx pnpm@10.30.3 install --frozen-lockfile --filter "@zitadel/login..." --filter "@zitadel/zitadel"
(cd packages/zitadel-proto && npx pnpm@10.30.3 exec buf generate ../../proto)
npx pnpm@10.30.3 --filter @zitadel/client run build
(cd apps/login && npx pnpm@10.30.3 run build)
```

## Einen Patch ändern oder ergänzen

Im lokalen Checkout die Patches anwenden und je Patch einen lokalen Commit
anlegen. Danach die Änderung machen und mit `git diff > patches/000N-name.patch`
sichern. Patches bauen aufeinander auf; ihre Reihenfolge ergibt sich aus dem
Dateinamen.

## Auf eine neue ZITADEL-Version gehen

`ZITADEL_TAG` und `ZITADEL_COMMIT` im Dockerfile anheben, dann prüfen, ob sich
die Patches noch anwenden lassen (`git apply --check`). Ist Next.js dort schon
auf einem sicheren Stand, entfällt `0001`.
