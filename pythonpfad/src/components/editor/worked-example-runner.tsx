'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Callout } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icon';
import { ExecutionTimeline } from './execution-timeline';
import { usePythonRunner } from './use-python-runner';
import { LAB_HANDOFF_KEY } from '@/lib/runner/lab-handoff';
import type { TraceResult } from '@/lib/runner/types';

/**
 * Macht aus dem durchgerechneten Beispiel einer Lektion einen echten Ablauf.
 *
 * Bisher stand unter jedem Beispiel eine von Hand geschriebene Liste „Schritt
 * für Schritt nachvollzogen". Die ist weiterhin da und weiterhin nützlich –
 * sie ist redaktionell geprüft und liest sich wie eine Erklärung. Was ihr
 * fehlt, ist die Möglichkeit, etwas zu verändern und zu sehen, was dann
 * passiert. Genau dafür ist dieser Knopf da.
 *
 * Die Laufzeit wird erst geladen, wenn jemand darauf drückt. Eine Lektion, die
 * beim Öffnen 13 MB nachlädt, wäre auf einer langsamen Verbindung ein
 * schlechter Tausch für eine Funktion, die nicht jede Person braucht.
 */
export function WorkedExampleRunner({ code }: { code: string }): React.ReactElement {
  const runner = usePythonRunner();
  const router = useRouter();
  const [trace, setTrace] = useState<TraceResult | null>(null);

  const start = async (): Promise<void> => {
    setTrace(await runner.trace({ code }));
  };

  const openInLab = (): void => {
    try {
      window.sessionStorage.setItem(LAB_HANDOFF_KEY, code);
    } catch {
      // Gesperrter Speicher darf den Wechsel nicht verhindern; im Labor steht
      // dann eben die übliche Vorlage.
    }
    router.push('/labor');
  };

  return (
    <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void start()} disabled={runner.isRunning}>
          <Icon name="schritte" size={17} />
          {runner.isRunning ? 'Wird ausgeführt …' : 'Beispiel wirklich ausführen'}
        </Button>
        <Button type="button" variant="secondary" onClick={openInLab}>
          Im Code-Labor öffnen und verändern
        </Button>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Das Beispiel läuft dann tatsächlich in deinem Browser – du siehst jede Zeile und jeden Wert
        zum Zeitpunkt der Ausführung. Beim ersten Mal dauert das Laden der Python-Laufzeit einen
        Moment.
      </p>

      {runner.status.phase === 'loading' ? (
        <p role="status" className="text-sm text-[var(--text-muted)]">
          {runner.status.message} Beim ersten Mal werden rund 13 MB geladen, danach kommt alles aus
          dem Browser-Cache.
        </p>
      ) : null}

      {runner.status.phase === 'error' ? (
        <Callout tone="alert" title="Die Python-Laufzeit konnte nicht gestartet werden" live>
          {runner.status.message} Die Erklärung oben gilt unabhängig davon – sie ist von Hand
          geschrieben und geprüft.
        </Callout>
      ) : null}

      {trace ? (
        <ExecutionTimeline code={code} result={trace} onClose={() => setTrace(null)} />
      ) : null}
    </div>
  );
}
