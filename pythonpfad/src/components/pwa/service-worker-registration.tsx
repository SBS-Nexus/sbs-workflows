'use client';

import { useEffect } from 'react';

/**
 * Meldet den Service Worker an.
 *
 * Bewusst erst nach dem vollständigen Laden der Seite: Die Anmeldung selbst
 * kostet wenig, das Vorladen der Python-Laufzeit im Hintergrund aber schon.
 * Wer gerade eine Lektion öffnet, soll nicht mit dem Nachladen konkurrieren.
 *
 * In der Entwicklung wird der Service Worker nicht angemeldet und ein
 * eventuell vorhandener abgemeldet. Sonst liefert er nach jeder Änderung
 * veraltete Bausteine aus, und die Fehlersuche beginnt regelmäßig mit der
 * Frage, ob der Browser überhaupt den neuen Stand hat.
 */
export function ServiceWorkerRegistration(): null {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) void registration.unregister();
      });
      return;
    }

    const anmelden = (): void => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Ohne Service Worker funktioniert alles weiter, nur eben ohne
        // Zwischenspeicher. Das ist kein Grund für eine Fehlermeldung.
      });
    };

    if (document.readyState === 'complete') {
      anmelden();
      return;
    }

    window.addEventListener('load', anmelden);
    return () => window.removeEventListener('load', anmelden);
  }, []);

  return null;
}
