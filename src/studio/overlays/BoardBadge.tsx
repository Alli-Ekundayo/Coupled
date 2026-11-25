import { ParsedKicadPcb } from '../../cad/parseKicadPcb';

interface BoardBadgeProps {
  projectId: string | null;
  board: ParsedKicadPcb | null;
}

export function BoardBadge({ projectId, board }: BoardBadgeProps) {
  if (!projectId && !board) return null;

  return (
    <div className="pointer-events-none absolute left-3.5 top-3 z-20 flex items-center gap-2 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-panel)]/90 px-3 py-1.5 font-mono text-[11px] text-[var(--text)] backdrop-blur-sm">
      <span className="font-semibold text-[var(--accent)]">
        {projectId ?? 'untitled'}
      </span>
      {board && (
        <>
          <span className="text-[var(--text-dim)]">·</span>
          <span>
            {board.bounds.width.toFixed(1)}×{board.bounds.height.toFixed(1)}mm
          </span>
          <span className="text-[var(--text-dim)]">·</span>
          <span className="text-[var(--text-muted)]">{board.footprints.length} parts</span>
          <span className="text-[var(--text-dim)]">·</span>
          <span className="text-[var(--text-muted)]">{board.segments.length} segs</span>
          <span className="text-[var(--text-dim)]">·</span>
          <span className="text-[var(--text-muted)]">{board.vias.length} vias</span>
        </>
      )}
    </div>
  );
}
