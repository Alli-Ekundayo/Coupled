import { Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { PcbTheme } from '../three/pcbMaterials';

export type NavModalAction = 'sign-in' | 'get-started';

interface NavbarProps {
  theme: PcbTheme;
  onToggleTheme: () => void;
  onOpenModal: (action: NavModalAction) => void;
}

const SCROLL_LINKS: Array<{ label: string; href: string }> = [
  { label: 'Product', href: '#product' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
];

export function Navbar({ theme, onToggleTheme, onOpenModal }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScrollLinkClick = () => {
    setMobileMenuOpen(false);
  };

  const handleModalClick = (action: NavModalAction) => {
    setMobileMenuOpen(false);
    onOpenModal(action);
  };

  const toggleLabel =
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <header className="relative z-20 w-full border-b border-[var(--color-fg)]">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="flex w-full items-center justify-between gap-6 border-x border-[var(--color-fg)] px-5 py-4 md:px-10 lg:px-14">
          <a
            href="#top"
            className="font-display nav-link shrink-0 whitespace-nowrap text-xl font-bold tracking-tight text-[var(--color-fg)]"
          >
            Coupled
          </a>

          {/* Desktop & Tablet Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-6 md:flex"
          >
            {SCROLL_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="nav-link shrink-0 whitespace-nowrap px-1 py-1 text-[13px] font-medium text-[var(--color-fg)] underline-offset-4 hover:underline"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => handleModalClick('sign-in')}
              className="nav-link shrink-0 whitespace-nowrap bg-transparent px-1 py-1 text-[13px] font-medium text-[var(--color-fg)] underline-offset-4 hover:underline"
            >
              Sign in
            </button>
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
              onClick={() => handleModalClick('get-started')}
              className="btn-primary shrink-0 whitespace-nowrap px-4 py-2 text-[13px] font-medium"
            >
              Get started
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

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <nav
          id="mobile-nav-menu"
          aria-label="Mobile navigation"
          className="w-full border-t border-[var(--color-fg)] px-3 sm:px-5 md:hidden"
        >
          <div className="flex w-full flex-col gap-3 border-x border-[var(--color-fg)] px-5 py-5">
            {SCROLL_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={handleScrollLinkClick}
                className="nav-link flex min-h-[44px] w-full items-center justify-between border-b border-[var(--color-fg)] py-2 text-left text-sm font-medium text-[var(--color-fg)]"
              >
                <span>{item.label}</span>
              </a>
            ))}
            <button
              type="button"
              onClick={() => handleModalClick('sign-in')}
              className="nav-link flex min-h-[44px] w-full items-center justify-between border-b border-[var(--color-fg)] bg-transparent py-2 text-left text-sm font-medium text-[var(--color-fg)]"
            >
              <span>Sign in</span>
            </button>
            <button
              type="button"
              onClick={() => handleModalClick('get-started')}
              className="btn-primary mt-2 flex min-h-[44px] w-full items-center justify-center px-5 py-2.5 text-sm font-medium"
            >
              Get started
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
