type LearningPlatformBarProps = {
  current: string;
};

export function LearningPlatformBar({ current }: LearningPlatformBarProps): React.ReactElement {
  const configuredHubUrl = process.env.NEXT_PUBLIC_LEARNING_HUB_URL?.trim();
  const hubUrl = configuredHubUrl?.replace(/\/$/, '');

  return (
    <div className="border-b border-white/10 bg-[#111827] text-white">
      <div className="mx-auto flex min-h-9 max-w-7xl items-center justify-between gap-4 px-4 text-xs sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {hubUrl ? (
            <a
              href={hubUrl}
              className="font-bold tracking-tight text-white no-underline hover:text-[#c7d2fe]"
            >
              Lernpfade
            </a>
          ) : (
            <span className="font-bold tracking-tight">Lernpfade</span>
          )}
          <span aria-hidden="true" className="text-white/35">
            /
          </span>
          <span className="truncate text-white/70">{current}</span>
        </div>

        {hubUrl ? (
          <nav aria-label="Lernpfade Schnellzugriff" className="flex shrink-0 items-center gap-3">
            <a
              href={hubUrl + '/wiederholen'}
              className="font-semibold text-white/75 no-underline hover:text-white"
            >
              Daily 5
            </a>
            <a
              href={hubUrl}
              className="hidden font-semibold text-white/75 no-underline hover:text-white sm:inline"
            >
              Alle Pfade
              <span aria-hidden="true"> →</span>
            </a>
          </nav>
        ) : (
          <span className="hidden text-white/70 sm:inline">Gemeinsame Lernplattform</span>
        )}
      </div>
    </div>
  );
}
