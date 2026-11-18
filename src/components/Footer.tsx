interface FooterProps {
  onOpenSignIn: () => void;
  onOpenUpload: () => void;
}

export function Footer({ onOpenSignIn, onOpenUpload }: FooterProps) {
  return (
    <footer className="relative z-20 w-full border-t border-[var(--color-fg)]">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="grid w-full grid-cols-1 gap-10 border-x border-[var(--color-fg)] px-5 py-12 md:grid-cols-12 md:px-10 md:py-16 lg:px-14">
          <div className="md:col-span-5">
            <a
              href="#top"
              className="font-display nav-link inline-block text-xl font-bold tracking-tight text-[var(--color-fg)]"
            >
              Coupled
            </a>
            <p className="mt-3 max-w-[34ch] text-[13px] leading-[1.7] text-[var(--color-fg)]">
              Rule-compliant circuit board layout in minutes. Built for engineers who keep full control over every trace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
            <div>
              <p className="font-mono-label text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-fg)]">
                Product
              </p>
              <ul className="mt-4 flex flex-col gap-2.5 text-[13px]">
                <li>
                  <a
                    href="#product"
                    className="nav-link underline-offset-4 hover:underline"
                  >
                    Overview
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="nav-link underline-offset-4 hover:underline"
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="nav-link underline-offset-4 hover:underline"
                  >
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-mono-label text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-fg)]">
                Workflow
              </p>
              <ul className="mt-4 flex flex-col gap-2.5 text-[13px]">
                <li>
                  <button
                    type="button"
                    onClick={onOpenUpload}
                    className="nav-link bg-transparent text-left underline-offset-4 hover:underline"
                  >
                    Upload a board
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenSignIn}
                    className="nav-link bg-transparent text-left underline-offset-4 hover:underline"
                  >
                    Sign in
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-mono-label text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-fg)]">
                Formats
              </p>
              <ul className="mt-4 flex flex-col gap-2.5 text-[13px]">
                <li>KiCad (.kicad_pcb)</li>
                <li>Gerber RS-274X</li>
                <li>Netlist (.net)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full border-t border-[var(--color-fg)] px-3 sm:px-5 lg:px-6">
        <div className="flex w-full flex-col items-start justify-between gap-3 border-x border-[var(--color-fg)] px-5 py-5 text-xs sm:flex-row sm:items-center md:px-10 lg:px-14">
          <p>© 2026 Coupled. All rights reserved.</p>
          <p className="font-mono-label uppercase tracking-[0.14em]">
            AI FOR PCB DESIGN
          </p>
        </div>
      </div>
    </footer>
  );
}
