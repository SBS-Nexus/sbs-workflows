type LearningPlatformBarProps = {
  current: string;
};

export function LearningPlatformBar({ current }: LearningPlatformBarProps): React.ReactElement {
  const hubUrl = process.env.NEXT_PUBLIC_LEARNING_HUB_URL?.trim();

  return (
    <div className="border-b border-[var(--lp-platform-border)] bg-[var(--lp-platform-bg)] text-[var(--lp-platform-fg)]">
      <div className="mx-auto flex min-h-9 max-w-7xl items-center justify-between gap-4 px-4 text-xs sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {hubUrl ? (
            <a
              href={hubUrl}
              className="font-bold tracking-tight text-[var(--lp-platform-fg)] no-underline hover:text-[var(--lp-platform-hover)]"
            >
              Lernpfade
            </a>
          ) : (
            <span className="font-bold tracking-tight">Lernpfade</span>
          )}
          <span aria-hidden="true" className="text-[var(--lp-platform-subtle)]">
            /
          </span>
          <span className="truncate text-[var(--lp-platform-muted)]">{current}</span>
        </div>

        {hubUrl ? (
          <div className="flex shrink-0 items-center gap-3 font-semibold">
            <a
              href={`${hubUrl}/wiederholen`}
              className="hidden text-[var(--lp-platform-muted)] no-underline hover:text-[var(--lp-platform-fg)] sm:inline"
            >
              Wiederholen
            </a>
            <a
              href={hubUrl}
              className="text-[var(--lp-platform-muted)] no-underline hover:text-[var(--lp-platform-fg)]"
            >
              Alle Pfade
              <span aria-hidden="true"> →</span>
            </a>
          </div>
        ) : (
          <span className="hidden text-[var(--lp-platform-muted)] sm:inline">
            Gemeinsame Lernplattform
          </span>
        )}
      </div>
    </div>
  );
}
