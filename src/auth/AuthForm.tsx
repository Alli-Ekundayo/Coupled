import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { FormEvent, useId, useState } from 'react';
import { ApiHttpError } from '../api/client';
import { AuthModalMode, useAuth } from './AuthProvider';

interface AuthFormProps {
  initialMode?: AuthModalMode;
  variant?: 'editorial' | 'studio';
  onSuccess?: () => void;
}

export function AuthForm({
  initialMode = 'sign-in',
  variant = 'studio',
  onSuccess,
}: AuthFormProps) {
  const { authEnabled, backendOnline, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const uid = useId();
  const nameId = `${uid}-name`;
  const emailId = `${uid}-email`;
  const emailHintId = `${uid}-email-hint`;
  const passwordId = `${uid}-password`;
  const passwordHintId = `${uid}-password-hint`;

  const isEditorial = variant === 'editorial';

  const inputClass = isEditorial
    ? 'auth-validated-input w-full border border-[var(--color-fg)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg)]/50'
    : 'auth-validated-input w-full rounded-[5px] border border-[var(--border-strong)] bg-[var(--bg-input)] px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--text-dim)]';

  const labelClass = isEditorial
    ? 'font-mono-label text-xs uppercase tracking-[0.12em] text-[var(--color-fg)]'
    : 'text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]';

  const hintClass = isEditorial
    ? 'text-[11px] text-[var(--color-fg)]/70'
    : 'text-[11px] text-[var(--text-dim)]';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (!backendOnline) {
      setError('Cannot reach the hackpcb backend. Start the API server or check the API URL.');
      return;
    }

    if (!authEnabled) {
      setStatusMessage('Authentication is disabled on this backend — you already have full Studio access.');
      onSuccess?.();
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
      } else {
        await signUp(name, email, password);
      }
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiHttpError) {
        setError(err.detail || `Authentication failed (${err.status}).`);
      } else {
        setError(err instanceof Error ? err.message : 'Authentication failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!backendOnline && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-[5px] border px-3 py-2.5 text-xs ${
            isEditorial
              ? 'border-[var(--color-fg)] bg-[var(--color-bg)] text-[var(--color-fg)]'
              : 'border-[var(--warn)]/40 bg-[var(--warn)]/10 text-[var(--warn)]'
          }`}
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Backend API is currently unreachable. Connect a running <code>hackpcb</code> server or enter the Studio in local sample mode.
          </span>
        </div>
      )}

      {backendOnline && !authEnabled && (
        <div
          role="status"
          className={`rounded-[5px] border px-3 py-2.5 text-xs ${
            isEditorial
              ? 'border-[var(--color-fg)] text-[var(--color-fg)]'
              : 'border-[var(--accent)]/40 bg-[var(--accent-dim)] text-[var(--accent)]'
          }`}
        >
          Neon Auth is not enabled on this backend instance (`AUTH_REQUIRED=false`). All workspace routes are open.
        </div>
      )}

      <div
        role="tablist"
        aria-label="Authentication mode"
        className={`grid grid-cols-2 border ${
          isEditorial
            ? 'border-[var(--color-fg)]'
            : 'rounded-[5px] border-[var(--border)] bg-[var(--bg-input)] p-0.5'
        }`}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'sign-in'}
          onClick={() => {
            setMode('sign-in');
            setError(null);
          }}
          className={`py-2 text-xs font-medium transition-colors ${
            mode === 'sign-in'
              ? isEditorial
                ? 'bg-[var(--color-fg)] text-[var(--color-bg)]'
                : 'rounded-[4px] bg-[var(--bg-card)] text-[var(--text)]'
              : isEditorial
                ? 'bg-transparent text-[var(--color-fg)]'
                : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'sign-up'}
          onClick={() => {
            setMode('sign-up');
            setError(null);
          }}
          className={`py-2 text-xs font-medium transition-colors ${
            mode === 'sign-up'
              ? isEditorial
                ? 'bg-[var(--color-fg)] text-[var(--color-bg)]'
                : 'rounded-[4px] bg-[var(--bg-card)] text-[var(--text)]'
              : isEditorial
                ? 'bg-transparent text-[var(--color-fg)]'
                : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {mode === 'sign-up' && (
          <div className="flex flex-col gap-1">
            <label htmlFor={nameId} className={labelClass}>
              Full name
            </label>
            <input
              id={nameId}
              name="name"
              type="text"
              autoComplete="name"
              enterKeyHint="next"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              className={inputClass}
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor={emailId} className={labelClass}>
            Work email
          </label>
          <span id={emailHintId} className={hintClass}>
            Format: engineer@company.com
          </span>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="username"
            spellCheck={false}
            enterKeyHint="next"
            required
            aria-describedby={emailHintId}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="engineer@company.com"
            className={inputClass}
          />
          <p className="auth-error-msg text-[11px] font-medium text-[var(--err)]">
            Enter an email address in the format engineer@company.com.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={passwordId} className={labelClass}>
            Password
          </label>
          {mode === 'sign-up' && (
            <span id={passwordHintId} className={hintClass}>
              At least 8 characters
            </span>
          )}
          <div className="relative flex items-center">
            <input
              id={passwordId}
              name={mode === 'sign-in' ? 'current-password' : 'new-password'}
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              enterKeyHint="done"
              required
              minLength={mode === 'sign-up' ? 8 : undefined}
              aria-describedby={mode === 'sign-up' ? passwordHintId : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'sign-in' ? 'Enter your password' : 'Create a strong password'}
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className={`absolute right-2 flex h-7 w-7 items-center justify-center rounded ${
                isEditorial
                  ? 'text-[var(--color-fg)] hover:bg-[var(--color-fg)]/10'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {showPassword ? (
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
          {mode === 'sign-up' && (
            <p className="auth-error-msg text-[11px] font-medium text-[var(--err)]">
              Password must be at least 8 characters long.
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className={`rounded-[5px] border px-3 py-2 text-xs ${
              isEditorial
                ? 'border-[var(--color-fg)] text-[var(--color-fg)]'
                : 'border-[var(--err)]/40 bg-[var(--err)]/10 text-[var(--err)]'
            }`}
          >
            {error}
          </p>
        )}

        {statusMessage && (
          <p role="status" className="text-xs text-[var(--accent)]">
            {statusMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={
            isEditorial
              ? 'btn-primary flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-medium disabled:opacity-60'
              : 'flex w-full items-center justify-center gap-2 rounded-[5px] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-[var(--accent-text)] transition-opacity hover:opacity-90 disabled:opacity-60'
          }
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          <span>{mode === 'sign-in' ? 'Sign In' : 'Create account'}</span>
        </button>
      </form>
    </div>
  );
}
