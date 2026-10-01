type LearningPlatformBarProps = {
  current: string;
};

export function LearningPlatformBar({
  current,
}: LearningPlatformBarProps): React.ReactElement {
  const hubUrl = process.env.NEXT_PUBLIC_LEARNING_HUB_URL?.trim();

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
          <span className="truncate text-white/65">{current}</span>
        </div>

        {hubUrl ? (
          <a
            href={hubUrl}
            className="shrink-0 font-semibold text-white/65 no-underline hover:text-white"
          >
            Alle Pfade
            <span aria-hidden="true"> →</span>
          </a>
        ) : (
          <span className="hidden text-white/40 sm:inline">Gemeinsame Lernplattform</span>
        )}
      </div>
    </div>
  );
}
