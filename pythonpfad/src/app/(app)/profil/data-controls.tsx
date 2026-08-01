'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  deleteAccountAction,
  exportAccountDataAction,
  type SettingsState,
} from '@/server/actions/account-actions';
import { Button, Callout, Card, Field, inputClass } from '@/components/ui/primitives';

const initialState: SettingsState = { ok: false };

function DeleteButton(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? 'Konto wird gelöscht …' : 'Konto endgültig löschen'}
    </Button>
  );
}

export function DataControls(): React.ReactElement {
  const [state, formAction] = useActionState(deleteAccountAction, initialState);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    setExportError(null);
    try {
      const result = await exportAccountDataAction();
      if (!result.ok) {
        setExportError(result.error);
        return;
      }
      // Der Download entsteht vollständig im Browser – die Datei wird nirgends
      // zwischengespeichert.
      const blob = new Blob([result.data], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold">Daten herunterladen</h3>
        <p className="mt-1 text-[0.95rem] text-[var(--text-muted)]">
          Du bekommst eine JSON-Datei mit deinem Profil, allen Abgaben samt eingereichtem Code,
          deinem Kompetenzstand, deinen Projekten und deinem Wiederholungsplan.
        </p>
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleExport()}
            disabled={exporting}
          >
            {exporting ? 'Wird zusammengestellt …' : 'Daten als JSON herunterladen'}
          </Button>
        </div>
        {exportError ? (
          <div className="mt-3">
            <Callout tone="alert" live>
              {exportError}
            </Callout>
          </div>
        ) : null}
      </Card>

      <Card className="border-[var(--alert)]">
        <h3 className="font-semibold">Konto löschen</h3>
        <p className="mt-1 text-[0.95rem] text-[var(--text-muted)]">
          Damit werden dein Konto und sämtliche Lerndaten sofort und vollständig entfernt. Das lässt
          sich nicht rückgängig machen. Lade dir vorher deine Daten herunter, wenn du sie behalten
          möchtest.
        </p>

        {state.error ? (
          <div className="mt-3">
            <Callout tone="alert" live>
              {state.error}
            </Callout>
          </div>
        ) : null}

        {!confirmOpen ? (
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(true)}>
              Löschung vorbereiten
            </Button>
          </div>
        ) : (
          <form action={formAction} className="mt-4 space-y-3">
            <Field
              label="Bestätigung"
              htmlFor="confirmation"
              hint="Tippe LÖSCHEN in Großbuchstaben, um die Löschung zu bestätigen."
            >
              <input
                id="confirmation"
                name="confirmation"
                type="text"
                required
                autoComplete="off"
                className={inputClass}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <DeleteButton />
              <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
                Abbrechen
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
