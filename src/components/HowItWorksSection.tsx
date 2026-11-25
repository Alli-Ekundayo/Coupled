interface HowItWorksSectionProps {
  onReplayAnimation: () => void;
  onStart: () => void;
}

const STEPS = [
  {
    number: '01',
    title: 'Bring what you have',
    description:
      'Drop in a KiCad design, or just describe what you want to build and let the AI help you shape the first draft. Hobby project or pro board, you choose the starting point.',
    detail: 'KiCad files, or a plain-language brief',
  },
  {
    number: '02',
    title: 'Auto-place and route',
    description:
      'Coupled places every footprint and routes the copper between them. Already placed your parts? Switch to route-only and your layout stays exactly as you left it.',
    detail: 'Place + route, or route only',
  },
  {
    number: '03',
    title: 'Review, adjust, export',
    description:
      'Explode the board into layers, zoom down to the pad, then lock a footprint, nudge a part, or export. You stay in control.',
    detail: 'Inspect every layer and part',
  },
];

export function HowItWorksSection({
  onReplayAnimation,
  onStart,
}: HowItWorksSectionProps) {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="w-full border-t border-[var(--color-fg)] px-3 sm:px-5 lg:px-6"
    >
      <div className="w-full border-x border-[var(--color-fg)] px-5 py-16 md:px-10 md:py-24 lg:px-14 lg:py-28">
        <div className="relative z-20 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono-label text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-fg)]">
              HOW IT WORKS
            </p>
            <h2
              id="how-it-works-heading"
              className="font-display mt-4 max-w-[20ch] text-[clamp(1.75rem,3vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-fg)] [text-wrap:balance]"
            >
              From idea to routed board in three steps.
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => {
                document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' });
                onReplayAnimation();
              }}
              className="btn-secondary shrink-0 whitespace-nowrap px-5 py-2.5 text-[13px] font-medium"
            >
              Replay placement
            </button>
            <button
              type="button"
              onClick={onStart}
              className="btn-primary shrink-0 whitespace-nowrap px-5 py-2.5 text-[13px] font-medium"
            >
              Start building
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-8 md:grid-cols-12 lg:gap-12">
          {/* 01 - 03 editorial steps */}
          <ol className="relative z-20 flex flex-col divide-y divide-[var(--color-fg)] border border-[var(--color-fg)] md:col-span-12">
            {STEPS.map((step) => (
              <li
                key={step.number}
                className="flex flex-col justify-between p-6 md:p-7"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                  <span className="font-display shrink-0 text-3xl font-bold leading-none tracking-[-0.03em] text-[var(--color-fg)] md:text-4xl">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold tracking-tight text-[var(--color-fg)] md:text-xl">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-[1.68] text-[var(--color-fg)]">
                      {step.description}
                    </p>
                    <p className="font-mono-label mt-3 text-xs text-[var(--color-fg)]">
                      {step.detail}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
