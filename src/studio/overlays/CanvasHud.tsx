import { Maximize2, Minus, Plus } from 'lucide-react';
import { LayerVisibility, useStudioStore } from '../../store/useStudioStore';

interface CanvasHudProps {
  onFit: () => void;
}

const LAYER_PILLS: Array<{ key: keyof LayerVisibility; label: string; dotColor: string }> = [
  { key: 'fCu', label: 'F.Cu', dotColor: 'var(--copper-f)' },
  { key: 'bCu', label: 'B.Cu', dotColor: 'var(--copper-b)' },
  { key: 'silk', label: 'Silk', dotColor: '#f1f5f9' },
  { key: 'crtyd', label: 'CrtYd', dotColor: '#94a3b8' },
  { key: 'zones', label: 'Zones', dotColor: 'var(--warn)' },
];

export function CanvasHud({ onFit }: CanvasHudProps) {
  const activeView = useStudioStore((s) => s.activeView);
  const setActiveView = useStudioStore((s) => s.setActiveView);
  const layers = useStudioStore((s) => s.layers);
  const toggleLayer = useStudioStore((s) => s.toggleLayer);
  const cursorMm = useStudioStore((s) => s.cursorMm);
  const setCamera2d = useStudioStore((s) => s.setCamera2d);
  const setSchematicTransform = useStudioStore((s) => s.setSchematicTransform);

  if (activeView === 'code') return null;

  const isBoardView = activeView === 'pcb' || activeView === '3d';

  const adjustZoom = (factor: number) => {
    if (activeView === 'pcb') {
      setCamera2d((prev) => ({
        ...prev,
        scale: Math.max(2, Math.min(90, prev.scale * factor)),
      }));
    } else if (activeView === 'schematic') {
      setSchematicTransform((prev) => ({
        ...prev,
        scale: Math.max(0.2, Math.min(5, prev.scale * factor)),
      }));
    }
  };

  return (
    <div className="absolute bottom-3.5 left-3.5 z-20 flex flex-wrap items-center gap-1.5 rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-panel)]/95 p-1.5 text-[11px] shadow-lg backdrop-blur-sm">
      {isBoardView && (
        <>
          <div className="flex items-center rounded-[5px] bg-[var(--bg-input)] p-0.5">
            <button
              type="button"
              onClick={() => setActiveView('pcb')}
              className={`rounded-[4px] px-2 py-1 font-mono text-[11px] font-semibold ${
                activeView === 'pcb'
                  ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              2D
            </button>
            <button
              type="button"
              onClick={() => setActiveView('3d')}
              className={`rounded-[4px] px-2 py-1 font-mono text-[11px] font-semibold ${
                activeView === '3d'
                  ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              3D
            </button>
          </div>

          <div className="h-4 w-px bg-[var(--border)]" />

          <div className="flex items-center gap-1">
            {LAYER_PILLS.map((pill) => {
              const active = layers[pill.key];
              return (
                <button
                  key={pill.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleLayer(pill.key)}
                  className={`inline-flex items-center gap-1 rounded-[4px] border px-2 py-1 font-mono text-[10.5px] transition-colors ${
                    active
                      ? 'border-[var(--border-strong)] bg-[var(--bg-card)] text-[var(--text)]'
                      : 'border-transparent bg-transparent text-[var(--text-dim)] hover:text-[var(--text-muted)]'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: pill.dotColor,
                      opacity: active ? 1 : 0.3,
                    }}
                  />
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-[var(--border)]" />
        </>
      )}

      <div className="flex items-center gap-0.5">
        {activeView !== '3d' && (
          <button
            type="button"
            onClick={() => adjustZoom(1 / 1.2)}
            aria-label="Zoom out"
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text)]"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={onFit}
          className="inline-flex h-6 items-center gap-1 rounded-[4px] px-2 font-mono text-[10.5px] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text)]"
        >
          <Maximize2 className="h-3 w-3" aria-hidden="true" />
          <span>Fit</span>
        </button>
        {activeView !== '3d' && (
          <button
            type="button"
            onClick={() => adjustZoom(1.2)}
            aria-label="Zoom in"
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text)]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {activeView === 'pcb' && (
        <>
          <div className="h-4 w-px bg-[var(--border)]" />
          <span className="min-w-[96px] px-1 font-mono text-[10.5px] text-[var(--text-muted)]">
            {cursorMm ? `${cursorMm.x.toFixed(2)}, ${cursorMm.y.toFixed(2)} mm` : '—, — mm'}
          </span>
        </>
      )}
    </div>
  );
}
