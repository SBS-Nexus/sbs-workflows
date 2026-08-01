export default function Loading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6" role="status" aria-live="polite">
      <span className="sr-only">Inhalt wird geladen</span>
      <div className="space-y-4" aria-hidden="true">
        <div className="h-8 w-2/3 rounded bg-[var(--surface-sunken)]" />
        <div className="h-4 w-full rounded bg-[var(--surface-sunken)]" />
        <div className="h-4 w-5/6 rounded bg-[var(--surface-sunken)]" />
        <div className="h-40 w-full rounded-xl bg-[var(--surface-sunken)]" />
      </div>
    </div>
  );
}
