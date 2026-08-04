/*
 * Service Worker von PythonPfad.
 *
 * Was zwischengespeichert wird – und was ausdrücklich nicht:
 *
 *   JA: die Python-Laufzeit unter /pyodide (rund 13 MB) und die statischen
 *       Bausteine unter /_next/static. Beide sind unveränderlich, enthalten
 *       nichts Personenbezogenes und sind der eigentliche Gewinn: Wer sie
 *       einmal geladen hat, kann den Code-Editor auch ohne Verbindung
 *       benutzen und muss beim nächsten Besuch nicht wieder warten.
 *
 *   NEIN: jede HTML-Seite des angemeldeten Bereichs. Diese Seiten enthalten
 *       den persönlichen Lernstand, Namen und Kohortenzugehörigkeit. Sie im
 *       Browser-Cache abzulegen hieße, personenbezogene Daten dort zu
 *       hinterlassen, wo sie nach dem Abmelden und auf geteilten Geräten
 *       nichts zu suchen haben. Der Zugewinn – Lektionen offline lesen –
 *       wiegt das nicht auf.
 *
 * Ohne Verbindung erscheint deshalb eine eigene Seite, die sagt, was geht
 * und was nicht, statt der Fehlerseite des Browsers.
 *
 * Die Version im Namen des Speichers ist die Sollbruchstelle: Wird sie
 * erhöht, räumt `activate` alle älteren Speicher ab.
 */

const CACHE_VERSION = 'pythonpfad-v1';
const OFFLINE_URL = '/offline';

/** Wird beim Einrichten fest hinterlegt, damit die Offlineseite immer da ist. */
const PRECACHE = [OFFLINE_URL, '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // Einzeln statt addAll: Ein fehlender Eintrag darf die gesamte
      // Einrichtung nicht scheitern lassen.
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: 'reload' }));
          } catch {
            // Kein Grund abzubrechen – die Seite arbeitet auch ohne.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const namen = await caches.keys();
      await Promise.all(
        namen.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Unveränderliche Bausteine: einmal geladen, immer gültig. */
function istUnveraenderlich(url) {
  return url.pathname.startsWith('/pyodide/') || url.pathname.startsWith('/_next/static/');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Nur GET. Alles andere verändert etwas auf dem Server und darf niemals aus
  // einem Speicher beantwortet werden.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (istUnveraenderlich(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        const gespeichert = await cache.match(request);
        if (gespeichert) return gespeichert;

        const antwort = await fetch(request);
        // Nur vollständige, erfolgreiche Antworten ablegen. Ein Teilstück
        // (Status 206) oder ein Fehler würde beim nächsten Mal ausgeliefert.
        if (antwort.ok && antwort.status === 200) {
          await cache.put(request, antwort.clone());
        }
        return antwort;
      })(),
    );
    return;
  }

  // Seitenaufrufe: immer aus dem Netz. Klappt das nicht, kommt die
  // Offlineseite – aber nie eine zwischengespeicherte persönliche Seite.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_VERSION);
          const offline = await cache.match(OFFLINE_URL);
          return (
            offline ??
            new Response('Keine Verbindung.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }
      })(),
    );
  }
});
