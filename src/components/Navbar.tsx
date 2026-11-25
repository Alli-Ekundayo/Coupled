import { Menu, Moon, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { PcbTheme } from '../three/pcbMaterials';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  theme: PcbTheme;
  onToggleTheme: () => void;
  onStart: () => void;
}

const SCROLL_LINKS: Array<{ label: string; to: string }> = [
  { label: 'Product', to: '/#product' },
  { label: 'How it works', to: '/#how-it-works' },
];

export function Navbar({ theme, onToggleTheme, onStart }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = mobileDialogRef.current;
    if (!dialog) return;
    if (mobileMenuOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [mobileMenuOpen]);

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  const handleStartClick = () => {
    setMobileMenuOpen(false);
    onStart();
  };

  const toggleLabel =
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <header className="relative z-20 w-full border-b border-[var(--color-fg)]">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="flex w-full items-center justify-between gap-6 border-x border-[var(--color-fg)] px-5 py-4 md:px-10 lg:px-14">
          <NavLink
            to="/"
            end
            className="font-display nav-link group inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap text-xl font-bold tracking-tight text-[var(--color-fg)]"
          >
            <BrandLogo className="h-[1.125rem] w-auto shrink-0 transition-colors duration-200 group-hover:text-[var(--color-green)] motion-reduce:transition-none" />
            <span>Coupled</span>
          </NavLink>

          {/* Desktop & Tablet Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-6 md:flex"
          >
            {SCROLL_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="nav-link shrink-0 whitespace-nowrap px-1 py-1 text-[13px] font-medium text-[var(--color-fg)] underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            ))}
            <NavLink
              to="/studio"
              className={({ isActive }) =>
                `nav-link shrink-0 whitespace-nowrap px-1 py-1 text-[13px] font-medium text-[var(--color-fg)] underline-offset-4 hover:underline ${
                  isActive ? 'underline' : ''
                }`
              }
            >
              CAD Studio
            </NavLink>
            <NavLink
              to="/auth"
              className={({ isActive }) =>
                `nav-link shrink-0 whitespace-nowrap px-1 py-1 text-[13px] font-medium text-[var(--color-fg)] underline-offset-4 hover:underline ${
                  isActive ? 'underline' : ''
                }`
              }
            >
              Sign in
            </NavLink>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={toggleLabel}
              aria-pressed={theme === 'light'}
              title={toggleLabel}
              data-testid="theme-toggle"
              className="btn-secondary inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-xs font-medium"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              )}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleStartClick()}
              className="btn-primary shrink-0 whitespace-nowrap px-4 py-2 text-[13px] font-medium"
            >
              Start building
            </button>
          </nav>

          {/* Mobile Controls: Theme Toggle + Menu Icon */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={toggleLabel}
              aria-pressed={theme === 'light'}
              className="btn-secondary flex h-11 w-11 items-center justify-center"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="btn-secondary flex h-11 w-11 items-center justify-center"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer (native dialog) */}
      <dialog
        ref={mobileDialogRef}
        id="mobile-nav-menu"
        aria-label="Mobile navigation"
        onClose={() => setMobileMenuOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMobileMenuOpen(false);
        }}
        className="fixed inset-0 z-50 m-0 h-full w-full border-none bg-transparent p-0 backdrop:bg-transparent md:hidden open:flex open:flex-col"
      >
        <div className="mt-[73px] w-full border-t border-[var(--color-fg)] bg-[var(--color-bg)] px-3 sm:px-5">
          <nav className="flex w-full flex-col gap-3 border-x border-[var(--color-fg)] px-5 py-5">
            {SCROLL_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={handleLinkClick}
                className="nav-link flex min-h-[44px] w-full items-center justify-between border-b border-[var(--color-fg)] py-2 text-left text-sm font-medium text-[var(--color-fg)]"
              >
                <span>{item.label}</span>
              </Link>
            ))}
            <NavLink
              to="/studio"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `nav-link flex min-h-[44px] w-full items-center justify-between border-b border-[var(--color-fg)] py-2 text-left text-sm font-medium text-[var(--color-fg)] ${
                  isActive ? 'underline underline-offset-4' : ''
                }`
              }
            >
              <span>CAD Studio</span>
            </NavLink>
            <NavLink
              to="/auth"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `nav-link flex min-h-[44px] w-full items-center justify-between border-b border-[var(--color-fg)] py-2 text-left text-sm font-medium text-[var(--color-fg)] ${
                  isActive ? 'underline underline-offset-4' : ''
                }`
              }
            >
              <span>Sign in</span>
            </NavLink>
            <button
              type="button"
              onClick={() => handleStartClick()}
              className="btn-primary mt-2 flex min-h-[44px] w-full items-center justify-center px-5 py-2.5 text-sm font-medium"
            >
              Start building
            </button>
          </nav>
        </div>
      </dialog>
    </header>
  );
}
