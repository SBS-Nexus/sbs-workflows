'use client';

import { useEffect, useId, useRef } from 'react';

/**
 * Zugänglicher Bestätigungsdialog auf Basis des nativen `<dialog>`:
 * modal, Fokus bleibt im Dialog, Escape bricht ab. Der Fokus startet auf
 * „Abbrechen", damit eine destruktive Aktion nie versehentlich per Enter
 * bestätigt wird.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}): React.ReactElement {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="vocab-dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <div id={bodyId} className="vocab-dialog-body">
        {children}
      </div>
      <div className="vocab-dialog-actions">
        <button className="button button-secondary" type="button" onClick={onCancel} autoFocus>
          Abbrechen
        </button>
        <button
          className={`button ${danger ? 'button-danger' : 'button-primary'}`}
          type="button"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
