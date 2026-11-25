import { CSSProperties, ReactNode, useEffect, useRef } from 'react';
import { PcbTheme } from '../three/pcbMaterials';
import {
  computeScrollValues,
  computeStageProgress,
  ScrollValues,
} from '../utils/scrollStage';
import { PcbSceneCanvas } from './PcbSceneCanvas';

interface PcbScrollStageProps {
  /** Hero copy shown on the left until the board slides over. */
  hero: ReactNode;
  theme: PcbTheme;
  /** Bump to replay the board's assemble intro. */
  animationKey: number;
}

/** Product feature copy, one per scroll phase. Opacity follows the CSS scroll variables. */
const CAPTIONS = [
  {
    key: 'slide',
    number: '01',
    label: 'Auto-placement',
    title: 'Parts placed for you.',
    description:
      'Bring a finished KiCad design and Coupled arranges every footprint on the board, so you skip the hours of pushing parts around.',
    // fades down as the next phase takes over
    opacity: 'calc(1 - var(--explode) * 0.65)',
  },
  {
    key: 'explode',
    number: '02',
    label: 'Routing',
    title: 'Every net, connected.',
    description:
      'Coupled routes the copper between your parts. Already happy with your placement? Choose route-only and your layout stays exactly as it is.',
    opacity: 'calc(0.35 + var(--explode) * 0.65 - var(--zoom) * 0.65)',
  },
  {
    key: 'zoom',
    number: '03',
    label: 'Start from scratch',
    title: 'No design yet? Start with AI.',
    description:
      'Describe what you want to build and get a first board to refine. Then inspect any footprint, lock it, nudge it, or export.',
    opacity: 'calc(0.35 + var(--zoom) * 0.65)',
  },
] as const;

/**
 * A tall scroll section with a viewport-sized stage pinned (position: sticky) inside it.
 *
 * Scroll position is reduced to three 0..1 values - slide, explode, zoom - which are
 * written to a ref the WebGL scene reads on every frame, and to CSS variables that drive
 * the overlay copy. No React state changes while scrolling.
 */
export function PcbScrollStage({ hero, theme, animationKey }: PcbScrollStageProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const captionsRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef<ScrollValues>({ slide: 0, explode: 0, zoom: 0 });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const update = () => {
      const rect = section.getBoundingClientRect();
      const progress = computeStageProgress(rect.top, rect.height, window.innerHeight);
      const values = computeScrollValues(progress);

      // 1. The scene picks these up on its next frame.
      valuesRef.current = values;

      // 2. Overlay copy follows via CSS variables.
      section.style.setProperty('--slide', values.slide.toFixed(4));
      section.style.setProperty('--explode', values.explode.toFixed(4));
      section.style.setProperty('--zoom', values.zoom.toFixed(4));

      // Hidden copy must not stay focusable / clickable.
      heroRef.current?.toggleAttribute('inert', values.slide > 0.6);
      captionsRef.current?.toggleAttribute('inert', values.slide < 0.35);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const initialVars = {
    '--slide': 0,
    '--explode': 0,
    '--zoom': 0,
  } as CSSProperties;

  return (
    <section
      id="product"
      ref={sectionRef}
      aria-labelledby="hero-heading"
      data-testid="pcb-scroll-stage"
      className="relative h-[480svh] w-full"
      style={initialVars}
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <PcbSceneCanvas valuesRef={valuesRef} animationKey={animationKey} theme={theme} />

        <div className="pointer-events-none relative z-20 h-full w-full px-3 sm:px-5 lg:px-6">
          <div className="relative h-full w-full border-x border-[var(--color-fg)] px-5 md:px-10 lg:px-14">
            {/* Hero copy: fades and drifts left as the board slides across */}
            <div
              ref={heroRef}
              className="pointer-events-auto flex h-full max-w-[44rem] flex-col items-start justify-start pt-10 md:justify-center md:pt-0"
              style={{
                opacity: 'clamp(0, calc(1 - var(--slide) * 1.8), 1)' as string,
                transform: 'translateX(calc(var(--slide) * -4vw))',
              }}
            >
              {hero}
            </div>

            {/* Scroll captions: appear once the board has slid left */}
            <div
              ref={captionsRef}
              aria-label="Scroll-driven board inspection"
              className="pointer-events-auto absolute inset-x-5 bottom-5 flex flex-col gap-3 md:inset-x-auto md:bottom-auto md:right-10 md:top-1/2 md:w-[min(26rem,34vw)] md:-translate-y-1/2 lg:right-14"
              style={{
                opacity: 'clamp(0, calc((var(--slide) - 0.4) * 3), 1)' as string,
              }}
            >
              <ol className="flex flex-col divide-y divide-[var(--color-fg)] border border-[var(--color-fg)] bg-[var(--color-bg)]">
                {CAPTIONS.map((caption) => (
                  <li
                    key={caption.key}
                    className="flex flex-col gap-2 p-4 md:p-5"
                    style={{ opacity: caption.opacity as string }}
                  >
                    <span className="font-mono-label text-[11px] uppercase tracking-[0.14em] text-[var(--color-fg)]">
                      {caption.number} · {caption.label}
                    </span>
                    <h3 className="font-display text-base font-bold tracking-tight text-[var(--color-fg)] md:text-lg">
                      {caption.title}
                    </h3>
                    <p className="hidden text-[13px] leading-[1.6] text-[var(--color-fg)] md:block">
                      {caption.description}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Scroll hint, only at the very start */}
            <p
              aria-hidden="true"
              className="font-mono-label absolute bottom-5 left-5 hidden text-[11px] uppercase tracking-[0.14em] text-[var(--color-fg)] md:left-10 md:block lg:left-14"
              style={{ opacity: 'clamp(0, calc(1 - var(--slide) * 6), 1)' as string }}
            >
              Scroll ↓
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
