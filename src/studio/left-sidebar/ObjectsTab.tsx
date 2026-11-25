import { AlertTriangle, Cpu, GitBranch } from 'lucide-react';
import { Netlist, Part } from '../../api/types';
import { ParsedKicadPcb } from '../../cad/parseKicadPcb';
import { useStudioStore } from '../../store/useStudioStore';

interface ObjectsTabProps {
  partsMap: Record<string, Part>;
  netlist: Netlist | null;
  parsedBoard: ParsedKicadPcb | null;
}

const MAX_NETS = 64;

export function ObjectsTab({ partsMap, netlist, parsedBoard }: ObjectsTabProps) {
  const selectedRef = useStudioStore((s) => s.selectedRef);
  const highlightedNet = useStudioStore((s) => s.highlightedNet);
  const selectComponent = useStudioStore((s) => s.selectComponent);
  const setHighlightedNet = useStudioStore((s) => s.setHighlightedNet);
  const setCamera2d = useStudioStore((s) => s.setCamera2d);

  // Merge refs from parsed footprints and partsMap
  const refSet = new Set<string>(Object.keys(partsMap));
  for (const fp of parsedBoard?.footprints ?? []) {
    if (fp.ref) refSet.add(fp.ref);
  }
  const refs = Array.from(refSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Collect nets from netlist + parsed board netNames
  const netEntries: Array<{ name: string; netClass: string; pinCount: number }> = [];
  if (netlist?.nets) {
    for (const [name, pins] of Object.entries(netlist.nets)) {
      if (!name) continue;
      netEntries.push({
        name,
        netClass: netlist.net_classes?.[name] ?? 'signal',
        pinCount: pins.length,
      });
    }
  } else if (parsedBoard) {
    const seen = new Set<string>();
    for (const name of Object.values(parsedBoard.netNames)) {
      if (!name || seen.has(name)) continue;
      seen.add(name);
      netEntries.push({ name, netClass: 'signal', pinCount: 0 });
    }
  }

  const netCount = netEntries.length;
  const pct = Math.min(100, Math.round((netCount / MAX_NETS) * 100));
  const nearCap = netCount >= 50 && netCount <= MAX_NETS;
  const overCap = netCount > MAX_NETS;

  const handleSelectRef = (ref: string) => {
    selectComponent(ref);
    const fp = parsedBoard?.footprints.find((f) => f.ref === ref);
    if (fp) {
      setCamera2d((prev) => ({ ...prev, cx: fp.x, cy: fp.y }));
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3 gap-4">
      {/* 64-Net Hard Cap Meter */}
      <div className="rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel-alt)] p-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Routable Nets Cap
          </span>
          <span
            className={`font-mono font-semibold ${
              overCap
                ? 'text-[var(--err)]'
                : nearCap
                  ? 'text-[var(--warn)]'
                  : 'text-[var(--accent)]'
            }`}
          >
            {netCount} / {MAX_NETS}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-input)]">
          <div
            className={`h-full transition-all ${
              overCap
                ? 'bg-[var(--err)]'
                : nearCap
                  ? 'bg-[var(--warn)]'
                  : 'bg-[var(--accent)]'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {(nearCap || overCap) && (
          <p className="mt-1.5 flex items-center gap-1 text-[10.5px] text-[var(--warn)]">
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>
              {overCap
                ? 'Exceeds MAX_NETS (64) cap — routing will return 422.'
                : 'Approaching MAX_NETS (64) routing limit.'}
            </span>
          </p>
        )}
      </div>

      {/* Components */}
      <section aria-label="Board components">
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Components ({refs.length})</span>
          </h2>
        </div>

        {refs.length === 0 ? (
          <p className="text-xs text-[var(--text-dim)]">No components loaded.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {refs.map((ref) => {
              const part = partsMap[ref];
              const fp = parsedBoard?.footprints.find((f) => f.ref === ref);
              const isSelected = selectedRef === ref;
              return (
                <li key={ref}>
                  <button
                    type="button"
                    onClick={() => handleSelectRef(ref)}
                    className={`flex w-full items-center justify-between gap-2 rounded-[5px] border px-2.5 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--text)]'
                        : 'border-transparent bg-[var(--bg-panel-alt)] text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--text)]'
                    }`}
                  >
                    <span className="font-mono font-semibold text-[var(--text)]">{ref}</span>
                    <span className="truncate font-mono text-[11px] text-[var(--text-dim)]">
                      {part?.mpn || fp?.value || fp?.lib || 'Part'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Nets */}
      <section aria-label="Electrical nets">
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Nets ({netEntries.length})</span>
          </h2>
          {highlightedNet && (
            <button
              type="button"
              onClick={() => setHighlightedNet(null)}
              className="text-[10.5px] text-[var(--accent)] hover:underline"
            >
              Clear highlight
            </button>
          )}
        </div>

        {netEntries.length === 0 ? (
          <p className="text-xs text-[var(--text-dim)]">No nets parsed yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {netEntries.map((net) => {
              const active = highlightedNet === net.name;
              const isPower = net.netClass === 'power' || /vcc|vdd|vbus|3v3|5v|gnd/i.test(net.name);
              return (
                <li key={net.name}>
                  <button
                    type="button"
                    onClick={() => setHighlightedNet(active ? null : net.name)}
                    className={`flex w-full items-center justify-between gap-2 rounded-[5px] border px-2.5 py-1.5 text-left text-xs transition-colors ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--text)]'
                        : 'border-transparent bg-[var(--bg-panel-alt)] text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--text)]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate font-mono">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: active
                            ? '#00e676'
                            : isPower
                              ? 'var(--copper-f)'
                              : 'var(--copper-b)',
                        }}
                      />
                      <span className="truncate">{net.name}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[10.5px] text-[var(--text-dim)]">
                      {net.pinCount > 0 ? `${net.pinCount}p` : net.netClass}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
