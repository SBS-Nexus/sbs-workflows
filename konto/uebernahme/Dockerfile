# Befristeter Railway-Job für die Kontoübernahme (E4.3). Kontext ist konto/
# (Railway: rootDirectory /konto, dockerfilePath uebernahme/Dockerfile), weil
# das Werkzeug ../einrichtung/zugang.mjs mitbraucht.
FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5
WORKDIR /app
COPY einrichtung/zugang.mjs einrichtung/zugang.mjs
COPY uebernahme/package.json uebernahme/package-lock.json uebernahme/
RUN cd uebernahme && npm ci --omit=dev && npm cache clean --force
COPY uebernahme/umwandeln.mjs uebernahme/uebernahme.mjs uebernahme/
USER node
CMD ["node", "uebernahme/uebernahme.mjs"]
