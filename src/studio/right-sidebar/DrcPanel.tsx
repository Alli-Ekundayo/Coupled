import { CheckCircle2, Loader2, Play, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { ApiHttpError } from '../../api/client';
import { api } from '../../api/endpoints';
import { DrcReport } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';

interface DrcPanelProps {
  projectId: string | null;
  drc: DrcReport | null;
  onDrcUpdated: () => Promise<void>;
}

export function DrcPanel({ projectId, drc, onDrcUpdated }: DrcPanelProps) {
  const { backendOnline } = useAuth();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunDrc = async () => {
    if (!projectId || !backendOnline) return;
    setError(null);
    setRunning(true);
    try {
      await api.runDrc(projectId);
      await onDrcUpdated();
    } catch (err) {
      if (err instanceof ApiHttpError) setError(`${err.status}: ${err.detail}`);
      else setError(err instanceof Error ? err.message : 'DRC failed.');
    } finally {
      setRunning(false);
    }
  };

  const isCleanPass =
    Boolean(drc) &&
    drc!.passed &&
    drc!.error_count === 0 &&
    drc!.unconnected_count === 0;

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel-alt)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isCleanPass ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--ok)]" aria-hidden="true" />
          ) : (
            <ShieldAlert
              className={`h-3.5 w-3.5 ${drc ? 'text-[var(--err)]' : 'text-[var(--text-dim)]'}`}
              aria-hidden="true"
            />
          )}
          <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text)]">
            Design Rules (DRC)
          </span>
        </div>

        <button
          type="button"
          disabled={!backendOnline || !projectId || running}
          onClick={handleRunDrc}
          className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-card)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-45"
        >
          {running ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="h-2.5 w-2.5" aria-hidden="true" />
          )}
          <span>Run DRC</span>
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[11px] text-[var(--err)]">
          {error}
        </p>
      )}

      {!drc ? (
        <p className="mt-2 text-[11px] text-[var(--text-dim)]">
          No DRC report persisted yet. Run routing or click Run DRC once a board exists.
        </p>
      ) : (
        <div className="mt-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10.5px] text-[var(--text-muted)]">
            <span className="font-mono">
              Engine: {drc.engine}
              {drc.kicad_version ? ` (${drc.kicad_version})` : ''}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                isCleanPass
                  ? 'bg-[var(--accent-dim)] text-[var(--ok)]'
                  : 'bg-[var(--err)]/15 text-[var(--err)]'
              }`}
            >
              {isCleanPass ? 'PASS' : 'FAIL'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded bg-[var(--bg-input)] p-1.5">
              <p className="text-[9.5px] uppercase text-[var(--text-dim)]">Errors</p>
              <p
                className={`font-mono text-xs font-bold ${
                  drc.error_count > 0 ? 'text-[var(--err)]' : 'text-[var(--ok)]'
                }`}
              >
                {drc.error_count}
              </p>
            </div>
            <div className="rounded bg-[var(--bg-input)] p-1.5">
              <p className="text-[9.5px] uppercase text-[var(--text-dim)]">Warnings</p>
              <p
                className={`font-mono text-xs font-bold ${
                  drc.warning_count > 0 ? 'text-[var(--warn)]' : 'text-[var(--text)]'
                }`}
              >
                {drc.warning_count}
              </p>
            </div>
            <div className="rounded bg-[var(--bg-input)] p-1.5">
              <p className="text-[9.5px] uppercase text-[var(--text-dim)]">Unconn</p>
              <p
                className={`font-mono text-xs font-bold ${
                  drc.unconnected_count > 0 ? 'text-[var(--err)]' : 'text-[var(--ok)]'
                }`}
              >
                {drc.unconnected_count}
              </p>
            </div>
          </div>

          {drc.violations.length > 0 && (
            <ul className="max-h-[140px] space-y-1 overflow-y-auto rounded border border-[var(--border)] bg-[var(--bg-input)] p-2">
              {drc.violations.map((v, idx) => (
                <li key={idx} className="text-[10.5px] leading-snug">
                  <span
                    className={`mr-1.5 font-mono font-bold uppercase ${
                      v.severity === 'error' ? 'text-[var(--err)]' : 'text-[var(--warn)]'
                    }`}
                  >
                    [{v.type || v.severity}]
                  </span>
                  <span className="text-[var(--text-muted)]">{v.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
