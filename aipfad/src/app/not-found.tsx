import Link from 'next/link';

export default function NotFound(): React.ReactElement {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4">
      <h1 className="font-mono text-2xl font-bold tracking-tight">Diese Seite gibt es nicht</h1>
      <p className="mt-3 text-[var(--fg-muted)]">
        Der Link führt ins Leere. Möglicherweise wurde ein Inhalt umbenannt oder ist noch nicht
        veröffentlicht.
      </p>
      <div className="mt-6 flex flex-wrap gap-4">
        <Link href="/pfad" className="font-medium text-signal-500 underline underline-offset-4">
          Zum Lernpfad
        </Link>
        <Link href="/" className="font-medium text-signal-500 underline underline-offset-4">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
