import { AlertTriangle, Loader2, Server, X } from 'lucide-react';
import { FormEvent, useEffect, useId, useState } from 'react';
import {
  getApiBaseUrl,
  isCookieAuthMode,
  setApiBaseUrlOverride,
  setCookieAuthMode,
} from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { useDialogController } from '../auth/AuthModal';

interface DeleteProjectDialogProps {
  open: boolean;
  projectId: string | null;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteProjectDialog({
  open,
  projectId,
  busy,
  error,
  onConfirm,
  onClose,
}: DeleteProjectDialogProps) {
  const dialogRef = useDialogController(open, onClose);
  const titleId = useId();

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby={titleId}
      className="studio-dialog m-auto w-[calc(100%-2rem)] max-w-[420px] rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-panel)] p-6 text-[var(--text)] shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-[var(--err)]/15 text-[var(--err)]">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-base font-bold text-[var(--text)]">
            Delete project?
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            This permanently deletes{' '}
            <code className="font-mono font-semibold text-[var(--text)]">{projectId}</code>,
            all KiCad files, netlists, and chat history from the backend.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded border border-[var(--err)]/40 bg-[var(--err)]/10 px-3 py-2 text-xs text-[var(--err)]">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          autoFocus
          disabled={busy}
          onClick={onClose}
          className="rounded-[5px] border border-[var(--border-strong)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-medium text-[var(--text)]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="inline-flex items-center gap-1.5 rounded-[5px] bg-[var(--err)] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          <span>Delete Project</span>
        </button>
      </div>
    </dialog>
  );
}

interface ApiSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ApiSettingsModal({ open, onClose }: ApiSettingsModalProps) {
  const { refreshHealthAndSession } = useAuth();
  const dialogRef = useDialogController(open, onClose);
  const titleId = useId();
  const inputId = useId();

  const [baseUrl, setBaseUrl] = useState(getApiBaseUrl);
  const [cookieMode, setCookieMode] = useState(isCookieAuthMode);

  useEffect(() => {
    if (open) {
      setBaseUrl(getApiBaseUrl());
      setCookieMode(isCookieAuthMode());
    }
  }, [open]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setApiBaseUrlOverride(baseUrl);
    setCookieAuthMode(cookieMode);
    await refreshHealthAndSession();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby={titleId}
      className="studio-dialog m-auto w-[calc(100%-2rem)] max-w-[440px] rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-panel)] p-6 text-[var(--text)] shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3.5">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
          <h2 id={titleId} className="text-base font-bold text-[var(--text)]">
            Backend Connection Settings
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close connection settings"
          className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-xs font-semibold text-[var(--text)]">
            hackpcb API Base URL
          </label>
          <span className="text-[11px] text-[var(--text-dim)]">
            Default: http://localhost:8000 (leave empty for same-origin proxy)
          </span>
          <input
            id={inputId}
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:8000"
            className="rounded-[5px] border border-[var(--border-strong)] bg-[var(--bg-input)] px-3 py-2 font-mono text-xs text-[var(--text)]"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2 rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] p-2.5 text-xs text-[var(--text-muted)]">
          <input
            type="checkbox"
            checked={cookieMode}
            onChange={(e) => setCookieMode(e.target.checked)}
            className="mt-0.5 accent-[var(--accent)]"
          />
          <span>
            Send cross-origin credentials (`credentials: &quot;include&quot;`) when using cookie auth with explicit `CORS_ORIGINS`.
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setApiBaseUrlOverride(null);
              setCookieAuthMode(false);
              setBaseUrl(getApiBaseUrl());
              setCookieMode(false);
            }}
            className="rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] px-3 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Reset Default
          </button>
          <button
            type="submit"
            className="rounded-[5px] bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-text)]"
          >
            Save & Reconnect
          </button>
        </div>
      </form>
    </dialog>
  );
}
