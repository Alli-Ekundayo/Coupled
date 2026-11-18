import { useEffect, useState } from 'react';
import { Footer } from './components/Footer';
import { ActiveModal, HeroModals } from './components/HeroModals';
import { HowItWorksSection } from './components/HowItWorksSection';
import { Navbar, NavModalAction } from './components/Navbar';
import { PcbSceneCanvas } from './components/PcbSceneCanvas';
import { PricingSection } from './components/PricingSection';
import { PcbTheme } from './three/pcbMaterials';
import { BOARD_PRESETS, PcbBoardPreset } from './utils/pcbLayout';

const TRUST_ITEMS = [
  'Works with KiCad',
  'Rule-safe layouts',
  'Export in one click',
];

export default function App() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [activePresetId, setActivePresetId] = useState<PcbBoardPreset['id']>('sensor-node');
  const [animationKey, setAnimationKey] = useState(0);
  const [proposedBanner, setProposedBanner] = useState<string | null>(null);
  const [theme, setTheme] = useState<PcbTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('coupled-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 768px)').matches
      : true
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('coupled-theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };
    setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const activePreset = BOARD_PRESETS[activePresetId];

  const handleOpenNavModal = (action: NavModalAction) => {
    if (action === 'get-started') {
      setActiveModal('upload');
      return;
    }
    setActiveModal(action);
  };

  const handleApplyBoard = (presetId: PcbBoardPreset['id'], uploadedFileName?: string) => {
    setActivePresetId(presetId);
    setAnimationKey((prev) => prev + 1);
    const preset = BOARD_PRESETS[presetId];
    const sourceName = uploadedFileName ?? preset.fileName;
    setProposedBanner(
      `${sourceName} · ${preset.rulesSummary.drcViolations} DRC violations · ${preset.rulesSummary.minClearanceMm}mm clearance`
    );
  };

  const handleReplayAnimation = () => {
    setAnimationKey((prev) => prev + 1);
  };

  return (
    <div
      id="top"
      className="bg-paper-texture min-h-screen text-[var(--color-fg)]"
    >
      {/* Persistent scroll-choreographed 3D PCB stage on tablet/desktop */}
      {isDesktop && (
        <PcbSceneCanvas
          key="desktop-pcb"
          preset={activePreset}
          animationKey={animationKey}
          isDesktop={true}
          theme={theme}
        />
      )}

      <Navbar
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onOpenModal={handleOpenNavModal}
      />

      <main>
        <section
          id="product"
          aria-labelledby="hero-heading"
        >
          {/* Hero 2-column grid on tablet/desktop (~120px vertical padding on desktop) */}
          <div className="w-full px-3 sm:px-5 lg:px-6">
            <div className="grid w-full grid-cols-1 items-center gap-9 border-x border-[var(--color-fg)] px-5 py-9 md:grid-cols-12 md:gap-8 md:px-10 md:py-20 lg:gap-10 lg:px-14 lg:py-[112px]">
              {/* Left column: Label, Enlarged Display Headline, Subheadline, CTAs */}
              <div className="relative z-20 flex flex-col items-start md:col-span-7">
                <p className="font-mono-label text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-fg)]">
                  AI FOR PCB DESIGN
                </p>

                <h1
                  id="hero-heading"
                  className="font-display mt-5 max-w-[15ch] text-[clamp(2.65rem,5.2vw,4.75rem)] font-bold leading-[0.99] tracking-[-0.032em] text-[var(--color-fg)] [text-wrap:balance] md:mt-6"
                >
                  Lay out your circuit board in minutes, not days.
                </h1>

                <p className="mt-6 max-w-[44ch] text-sm leading-[1.7] text-[var(--color-fg)] md:mt-7 md:text-[15px]">
                  Upload your design. Coupled proposes a complete, rule-compliant layout. You stay in control.
                </p>

                <div className="mt-8 flex w-full flex-col gap-3.5 sm:w-auto sm:flex-row sm:items-center sm:gap-4 md:mt-9">
                  <button
                    type="button"
                    onClick={() => setActiveModal('upload')}
                    className="btn-primary w-full shrink-0 whitespace-nowrap px-6 py-3.5 text-center text-[13px] font-medium sm:w-auto"
                  >
                    Upload a board
                  </button>
                  <a
                    href="#how-it-works"
                    className="btn-secondary inline-flex w-full shrink-0 items-center justify-center whitespace-nowrap px-6 py-3.5 text-center text-[13px] font-medium sm:w-auto"
                  >
                    See how it works
                  </a>
                </div>

                {proposedBanner && (
                  <p
                    role="status"
                    className="font-mono-label mt-5 border border-[var(--color-fg)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-fg)]"
                  >
                    {proposedBanner}
                  </p>
                )}
              </div>

              {/* Right column: 3D PCB stage zone (inline canvas on mobile, open stage on desktop) */}
              <div className="md:col-span-5">
                {!isDesktop ? (
                  <PcbSceneCanvas
                    key="mobile-pcb"
                    preset={activePreset}
                    animationKey={animationKey}
                    isDesktop={false}
                    theme={theme}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="min-h-[340px] w-full lg:min-h-[420px]"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Trust strip at the bottom of the hero */}
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
        </section>

        <HowItWorksSection
          onReplayAnimation={handleReplayAnimation}
          onUploadBoard={() => setActiveModal('upload')}
        />

        <PricingSection
          onSelectPlan={() => setActiveModal('upload')}
          onContactSales={() => setActiveModal('sign-in')}
        />
      </main>

      <Footer
        onOpenSignIn={() => setActiveModal('sign-in')}
        onOpenUpload={() => setActiveModal('upload')}
      />

      <HeroModals
        activeModal={activeModal}
        activePresetId={activePresetId}
        onClose={() => setActiveModal(null)}
        onApplyBoard={handleApplyBoard}
        onReplayAnimation={handleReplayAnimation}
        onOpenUpload={() => setActiveModal('upload')}
      />
    </div>
  );
}
