import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';

type AuthMode = 'sign-in' | 'sign-up';

const INPUT_CLASS =
  'w-full border border-[var(--color-fg)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg)]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-fg)]';

export function AuthPage() {
  const { pathname } = useLocation();
  const initialMode: AuthMode = pathname === '/sign-up' ? 'sign-up' : 'sign-in';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setStatus(null);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (mode === 'sign-up' && !name.trim()) {
      setError('Enter your name to create an account.');
      setStatus(null);
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Enter a valid email address.');
      setStatus(null);
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setStatus(null);
      return;
    }
    setError(null);
    setStatus(
      mode === 'sign-in'
        ? `Signed in as ${trimmedEmail}.`
        : `Account created for ${trimmedEmail}.`
    );
  };

  return (
    <section
      aria-labelledby="auth-heading"
      className="w-full px-3 sm:px-5 lg:px-6"
    >
      <div className="flex w-full flex-col items-center border-x border-[var(--color-fg)] px-5 py-16 md:px-10 md:py-24 lg:px-14">
        <div className="w-full max-w-[460px] border border-[var(--color-fg)] bg-[var(--color-bg)] p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-fg)] pb-4">
            <div className="flex items-center gap-2.5">
              <BrandLogo className="h-4 w-auto shrink-0 text-[var(--color-fg)]" />
              <p className="font-mono-label text-xs uppercase tracking-[0.14em]">
                {mode === 'sign-in' ? 'Sign in' : 'Create account'}
              </p>
            </div>
            <Link
              to="/"
              className="nav-link font-mono-label text-xs underline-offset-4 hover:underline"
            >
              ← Back home
            </Link>
          </div>

          <div
            role="tablist"
            aria-label="Authentication mode"
            className="mt-6 grid grid-cols-2 border border-[var(--color-fg)]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'sign-in'}
              onClick={() => switchMode('sign-in')}
              className={`px-4 py-2.5 text-xs font-medium uppercase tracking-[0.12em] ${
                mode === 'sign-in'
                  ? 'bg-[var(--color-fg)] text-[var(--color-bg)]'
                  : 'bg-[var(--color-bg)] text-[var(--color-fg)]'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'sign-up'}
              onClick={() => switchMode('sign-up')}
              className={`border-l border-[var(--color-fg)] px-4 py-2.5 text-xs font-medium uppercase tracking-[0.12em] ${
                mode === 'sign-up'
                  ? 'bg-[var(--color-fg)] text-[var(--color-bg)]'
                  : 'bg-[var(--color-bg)] text-[var(--color-fg)]'
              }`}
            >
              Sign up
            </button>
          </div>

          <h1
            id="auth-heading"
            className="font-display mt-6 text-2xl font-bold tracking-tight"
          >
            {mode === 'sign-in'
              ? 'Welcome back to Coupled.'
              : 'Create your Coupled account.'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed">
            {mode === 'sign-in'
              ? 'Sign in to access your saved boards, AI drafts, and routing runs.'
              : 'Built for hobbyists and pros alike. Start from a KiCad design, from scratch with AI, or route only.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            {mode === 'sign-up' && (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="coupled-auth-name"
                  className="font-mono-label text-xs uppercase tracking-[0.12em]"
                >
                  Full name
                </label>
                <input
                  id="coupled-auth-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className={INPUT_CLASS}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="coupled-auth-email"
                className="font-mono-label text-xs uppercase tracking-[0.12em]"
              >
                Email address
              </label>
              <input
                id="coupled-auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="coupled-auth-password"
                className="font-mono-label text-xs uppercase tracking-[0.12em]"
              >
                Password
              </label>
              <input
                id="coupled-auth-password"
                type="password"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={INPUT_CLASS}
              />
            </div>

            {error && (
              <p role="alert" className="text-xs font-medium text-[var(--color-fg)]">
                {error}
              </p>
            )}

            {status && (
              <p
                role="status"
                className="font-mono-label border border-[var(--color-fg)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-fg)]"
              >
                {status}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary mt-1 w-full px-5 py-3 text-sm font-medium"
            >
              {mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 border-t border-[var(--color-fg)] pt-4 text-xs">
            {mode === 'sign-in' ? (
              <>
                New to Coupled?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('sign-up')}
                  className="nav-link bg-transparent font-medium underline underline-offset-4"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('sign-in')}
                  className="nav-link bg-transparent font-medium underline underline-offset-4"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
