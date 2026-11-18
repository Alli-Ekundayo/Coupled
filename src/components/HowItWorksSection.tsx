interface HowItWorksSectionProps {
  onReplayAnimation: () => void;
  onUploadBoard: () => void;
}

const STEPS = [
  {
    number: '01',
    title: 'Upload schematic or netlist',
    description:
      'Drop in your KiCad project, board outline, and design rules. Coupled reads net classes, differential pairs, and mechanical keep-out zones automatically.',
    detail: 'Supports .kicad_pcb, .kicad_sch, and .net',
  },
  {
    number: '02',
    title: 'Constraint-first placement & routing',
    description:
      'Components settle into rule-compliant zones by signal integrity and thermal budget, then copper traces route cleanly with zero DRC violations.',
    detail: 'Verified trace widths and clearances',
  },
  {
    number: '03',
    title: 'Review, adjust, and export',
    description:
      'Lock critical footprints, nudge any trace directly, and export production-ready KiCad files or Gerber fabrication archives in a single click.',
    detail: 'Native KiCad 8 round-trip and Gerber RS-274X',
  },
];

export function HowItWorksSection({
  onReplayAnimation,
  onUploadBoard,
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
              From netlist to fab-ready layout in three steps.
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
              onClick={onUploadBoard}
              className="btn-primary shrink-0 whitespace-nowrap px-5 py-2.5 text-[13px] font-medium"
            >
              Upload a board
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-8 md:grid-cols-12 lg:gap-12">
          {/* Open inspection stage where the 3D PCB glides on scroll with exploded layers */}
          <div
            aria-hidden="true"
            className="hidden md:col-span-5 md:flex md:min-h-[480px] md:flex-col md:justify-between md:border md:border-[var(--color-fg)]/25 md:p-5"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono-label text-[11px] uppercase tracking-[0.14em] text-[var(--color-fg)]">
                3D Stackup Inspection
              </span>
              <span className="font-mono-label text-[11px] uppercase tracking-[0.14em] text-[var(--color-fg)]">
                2-Layer · FR4
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono-label text-[11px] text-[var(--color-fg)]">
                X / Y / Z
              </span>
              <span className="font-mono-label text-[11px] text-[var(--color-fg)]">
                0 DRC
              </span>
            </div>
          </div>

          {/* Right column: 01 - 03 editorial steps */}
          <ol className="relative z-20 flex flex-col divide-y divide-[var(--color-fg)] border border-[var(--color-fg)] md:col-span-7">
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
