import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthForm } from '../auth/AuthForm';
import { useAuth } from '../auth/AuthProvider';
import { BrandLogo } from '../components/BrandLogo';

export function AuthPage() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const searchParams = new URLSearchParams(search);
  const redirectTo = searchParams.get('redirect') || '/studio';
  const initialMode = pathname === '/sign-up' ? 'sign-up' : 'sign-in';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

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
                {initialMode === 'sign-in' ? 'Sign in' : 'Create account'}
              </p>
            </div>
            <Link
              to="/"
              className="nav-link font-mono-label text-xs underline-offset-4 hover:underline"
            >
              ← Back home
            </Link>
          </div>

          <h1
            id="auth-heading"
            className="font-display mt-6 text-2xl font-bold tracking-tight"
          >
            Welcome to Coupled.
          </h1>
          <p className="mt-2 mb-6 text-sm leading-relaxed">
            Access saved boards, AI schematic drafts, 2-layer routing runs, and the 3D CAD Studio.
          </p>

          <AuthForm
            key={initialMode}
            initialMode={initialMode}
            variant="editorial"
            onSuccess={() => navigate(redirectTo)}
          />

          <p className="mt-5 border-t border-[var(--color-fg)] pt-4 text-xs">
            Want to explore offline first?{' '}
            <Link
              to="/studio"
              className="nav-link font-medium underline underline-offset-4"
            >
              Open CAD Studio →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
