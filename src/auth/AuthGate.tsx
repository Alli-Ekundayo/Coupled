import { ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudioStore } from '../store/useStudioStore';
import { AuthForm } from './AuthForm';

export function AuthGate() {
  const navigate = useNavigate();
  const setMode = useStudioStore((s) => s.setMode);

  return (
    <div
      data-studio="true"
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[var(--bg-canvas)] px-4 py-10 text-[var(--text)]"
    >
      <div className="w-full max-w-[440px] rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-panel)] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-[var(--accent-dim)] text-[var(--accent)]">
              <Lock className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[var(--text)]">
                Sign in to Coupled Studio
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                Authentication is required by this backend
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode('landing');
              navigate('/');
            }}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Home</span>
          </button>
        </div>

        <AuthForm variant="studio" />
      </div>
    </div>
  );
}
