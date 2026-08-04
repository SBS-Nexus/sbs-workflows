'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Funktionsschalter im Browser.
 *
 * Die Schalter werden auf dem Server aus Umgebungsvariablen gelesen und hier
 * nur weitergereicht. Es gibt bewusst keinen Weg, sie im Browser zu ändern:
 * Ein Schalter, den die Oberfläche selbst setzen kann, ist keine
 * Betriebsentscheidung mehr.
 *
 * Fehlt der Anbieter – etwa in einem einzeln gerenderten Baustein –, gilt
 * alles als eingeschaltet. Ein fehlender Kontext soll Funktionen nicht
 * stillschweigend verschwinden lassen; das wäre schwerer zu finden als eine
 * Funktion, die einmal zu viel erscheint.
 */
const FeatureContext = createContext<Readonly<Record<string, boolean>> | null>(null);

export function FeatureProvider({
  flags,
  children,
}: {
  flags: Readonly<Record<string, boolean>>;
  children: ReactNode;
}): ReactNode {
  return <FeatureContext.Provider value={flags}>{children}</FeatureContext.Provider>;
}

export function useFeature(key: string): boolean {
  const flags = useContext(FeatureContext);
  if (!flags) return true;
  return flags[key] ?? true;
}
