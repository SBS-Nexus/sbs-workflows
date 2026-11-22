# konto-login: Anmelde-App von ZITADEL (apps/login, v4.20.5, MIT) mit den
# Änderungen der Lernpfade aus konto/login/patches/ (docs/E4-1-BAUPLAN.md,
# E4.1b Stufe 2). Gebaut wird aus dem Quelltext beim festen Commit; die
# Laufzeit-Stufe entspricht apps/login/Dockerfile von ZITADEL.
FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS bau
RUN apk add --no-cache git
ARG ZITADEL_TAG=v4.20.5
ARG ZITADEL_COMMIT=59827a8ec6dd0c23acbba5d0ebdf41fdc857d66c
WORKDIR /src
RUN git clone --filter=blob:none --no-checkout --depth 1 --branch "$ZITADEL_TAG" https://github.com/zitadel/zitadel . \
 && test "$(git rev-parse HEAD)" = "$ZITADEL_COMMIT" \
 && git sparse-checkout init --no-cone \
 && git sparse-checkout set '/package.json' '/pnpm-workspace.yaml' '/pnpm-lock.yaml' '/.npmrc' \
      '/apps/login/' '/packages/zitadel-client/' '/packages/zitadel-proto/' '/proto/' \
 && git checkout -q
COPY patches /patches
RUN git apply --verbose /patches/*.patch
ENV CI=true NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
RUN pnpm install --frozen-lockfile --filter "@zitadel/login..." --filter "@zitadel/zitadel"
RUN cd packages/zitadel-proto && pnpm exec buf generate ../../proto
RUN pnpm --filter @zitadel/client run build
RUN cd apps/login && pnpm run build

FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs \
 && mkdir -p /.env-file && touch /.env-file/.env && chown -R nextjs:nodejs /.env-file
COPY --from=bau --chown=nextjs:nodejs /src/apps/login/.next/standalone ./
USER nextjs
ENV HOSTNAME="::" \
    PORT="3000" \
    NODE_ENV="production" \
    NODE_OPTIONS="--use-openssl-ca --require /app/load-ssl-cert-dir.cjs" \
    SSL_CERT_FILE="/etc/ssl/certs/ca-certificates.crt" \
    ZITADEL_TLS_ENABLED="false" \
    OTEL_SERVICE_NAME="zitadel-login" \
    OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ["/usr/local/bin/node", "/app/healthcheck.mjs", "/ui/v2/login/ready"]
ENTRYPOINT ["/app/entrypoint.sh", "node", "apps/login/server.js"]
