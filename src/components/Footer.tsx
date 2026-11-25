import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  onStart: () => void;
}

export function Footer({ onStart }: FooterProps) {
  return (
    <footer className="relative z-20 w-full border-t border-[var(--color-fg)]">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="grid w-full grid-cols-1 gap-10 border-x border-[var(--color-fg)] px-5 py-12 md:grid-cols-12 md:px-10 md:py-16 lg:px-14">
          <div className="md:col-span-5">
            <Link
              to="/#top"
              className="font-display nav-link group inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-[var(--color-fg)]"
            >
              <BrandLogo className="h-[1.125rem] w-auto shrink-0 transition-colors duration-200 group-hover:text-[var(--color-green)] motion-reduce:transition-none" />
              <span>Coupled</span>
            </Link>
            <p className="mt-3 max-w-[34ch] text-[13px] leading-[1.7] text-[var(--color-fg)]">
              AI-assisted PCB placement and routing for hobbyists and professionals. Start from a design, from scratch, or just route.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
            <div>
              <h2 className="font-mono-label text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-fg)]">
                Product
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5 text-[13px]">
                <li>
                  <Link
                    to="/#product"
                    className="nav-link underline-offset-4 hover:underline"
                  >
                    Overview
                  </Link>
                </li>
                <li>
                  <Link
                    to="/#how-it-works"
                    className="nav-link underline-offset-4 hover:underline"
                  >
                    How it works
                  </Link>
                </li>
                <li>
                  <Link
                    to="/studio"
                    className="nav-link underline-offset-4 hover:underline"
                  >
                    CAD Studio
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-mono-label text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-fg)]">
                Account
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5 text-[13px]">
                <li>
                  <button
                    type="button"
                    onClick={onStart}
                    className="nav-link bg-transparent text-left underline-offset-4 hover:underline"
                  >
                    Start building
                  </button>
                </li>
                <li>
                  <Link
                    to="/auth"
                    className="nav-link underline-offset-4 hover:underline"
                  >
                    Sign in / Sign up
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-mono-label text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-fg)]">
                Formats
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5 text-[13px]">
                <li>KiCad (.kicad_pcb)</li>
                <li>KiCad (.kicad_sch)</li>
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
            AI-ASSISTED PCB DESIGN
          </p>
        </div>
      </div>
    </footer>
  );
}
