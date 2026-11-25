import { Link } from 'react-router-dom';
import { HowItWorksSection } from '../components/HowItWorksSection';
import { PcbScrollStage } from '../components/PcbScrollStage';
import { useAppContext } from '../layout/appContext';

const TRUST_ITEMS = [
  'Works with KiCad',
  'For hobbyists and pros',
  'You stay in control',
];

export function HomePage() {
  const { theme, animationKey, replayAnimation, openStart, projects } = useAppContext();
  const latest = projects[0] ?? null;

  return (
    <>
      <PcbScrollStage
        theme={theme}
        animationKey={animationKey}
        hero={
          <>
            <p className="font-mono-label text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-fg)]">
              AI-ASSISTED PCB DESIGN
            </p>

            <h1
              id="hero-heading"
              className="font-display mt-5 max-w-[15ch] text-[clamp(2.65rem,1.5rem+3.7vw,4.75rem)] font-bold leading-[0.99] tracking-[-0.032em] text-[var(--color-fg)] [text-wrap:balance] md:mt-6"
            >
              From idea to routed board.
            </h1>

            <p className="mt-6 max-w-[48ch] text-sm leading-[1.7] text-[var(--color-fg)] md:mt-7 md:text-[15px]">
              Whether you are a hobbyist or a pro, Coupled helps you build hardware faster. Auto-place and route a finished design, start from scratch with AI, or hand over just the routing.
            </p>

            <div className="mt-8 flex w-full flex-col gap-3.5 sm:w-auto sm:flex-row sm:items-center sm:gap-4 md:mt-9">
              <Link
                to="/auth?redirect=/studio"
                className="btn-primary inline-flex min-h-[44px] w-full shrink-0 items-center justify-center whitespace-nowrap px-6 py-3.5 text-center text-[13px] font-medium sm:w-auto"
              >
                Start building
              </Link>
              <a
                href="#how-it-works"
                className="btn-secondary inline-flex min-h-[44px] w-full shrink-0 items-center justify-center whitespace-nowrap px-6 py-3.5 text-center text-[13px] font-medium sm:w-auto"
              >
                See how it works
              </a>
            </div>

            {latest && (
              <p
                role="status"
                className="font-mono-label mt-5 border border-[var(--color-fg)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-fg)]"
              >
                {latest.summary}
              </p>
            )}
          </>
        }
      />

      {/* Trust strip closes the hero once the pinned stage releases */}
      <div className="relative z-20 w-full border-t border-[var(--color-fg)] px-3 sm:px-5 lg:px-6">
        <ul className="grid w-full grid-cols-1 divide-y divide-[var(--color-fg)] border-x border-[var(--color-fg)] md:grid-cols-3 md:divide-x md:divide-y-0">
          {TRUST_ITEMS.map((item) => (
            <li
              key={item}
              className="px-5 py-4 text-[13px] font-medium tracking-tight text-[var(--color-fg)] md:px-6 md:py-6 md:text-center"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <HowItWorksSection
        onReplayAnimation={replayAnimation}
        onStart={() => openStart('full')}
      />
    </>
  );
}
