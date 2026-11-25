import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiHttpError } from '../../api/client';
import { api } from '../../api/endpoints';
import { Netlist, Part, Pin } from '../../api/types';
import { ParsedFootprint } from '../../cad/parseKicadPcb';
import { useAuth } from '../../auth/AuthProvider';
import { useStudioStore } from '../../store/useStudioStore';

interface InspectorPanelProps {
  partsMap: Record<string, Part>;
  netlist: Netlist | null;
  footprints: ParsedFootprint[];
}

export function InspectorPanel({ partsMap, netlist, footprints }: InspectorPanelProps) {
  const { health, backendOnline } = useAuth();
  const selectedRef = useStudioStore((s) => s.selectedRef);
  const inspectedLibraryPart = useStudioStore((s) => s.inspectedLibraryPart);
  const highlightedNet = useStudioStore((s) => s.highlightedNet);
  const setHighlightedNet = useStudioStore((s) => s.setHighlightedNet);

  const [syncedOctopart, setSyncedOctopart] = useState<Record<string, Partial<Part>>>({});
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setSyncError(null);
  }, [selectedRef, inspectedLibraryPart?.mpn]);

  const activeFp = selectedRef
    ? footprints.find((f) => f.ref === selectedRef) ?? null
    : null;
  const basePart: Part | null = inspectedLibraryPart
    ? inspectedLibraryPart
    : selectedRef
      ? partsMap[selectedRef] ?? null
      : null;

  const badgeLabel = inspectedLibraryPart ? 'LIB' : selectedRef ?? null;
  const mpn = basePart?.mpn || activeFp?.value || '';
  const liveOverride = mpn ? syncedOctopart[mpn] : undefined;
  const mergedPart: Partial<Part> | null = basePart
    ? { ...basePart, ...liveOverride, pins: basePart.pins }
    : activeFp
      ? {
          mpn: activeFp.value || activeFp.lib,
          footprint_ref: activeFp.lib,
          value: activeFp.value,
          package: activeFp.lib.split(':').pop() ?? '',
          ...liveOverride,
        }
      : null;

  // Build pin rows: prefer verified part.pins, fallback to parsed footprint pads
  const padNetByPin = new Map<string, string>();
  if (activeFp) {
    for (const pd of activeFp.pads) {
      if (pd.num && pd.netName) {
        padNetByPin.set(pd.num, pd.netName);
      }
    }
  }
  if (netlist?.nets && selectedRef) {
    for (const [netName, conns] of Object.entries(netlist.nets)) {
      for (const [cRef, pinNum] of conns) {
        if (cRef === selectedRef && !padNetByPin.has(pinNum)) {
          padNetByPin.set(pinNum, netName);
        }
      }
    }
  }

  let pinRows: Array<{ num: string; name: string; type: string; net: string }> = [];
  if (mergedPart?.pins && mergedPart.pins.length > 0) {
    pinRows = mergedPart.pins.map((p: Pin) => ({
      num: p.num,
      name: p.name,
      type: p.type,
      net: selectedRef ? padNetByPin.get(p.num) ?? '—' : '—',
    }));
  } else if (activeFp && activeFp.pads.length > 0) {
    const seen = new Set<string>();
    for (const pd of activeFp.pads) {
      const key = pd.num || `${pd.px},${pd.py}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pinRows.push({
        num: pd.num || '?',
        name: pd.type,
        type: pd.shape,
        net: pd.netName || padNetByPin.get(pd.num) || '—',
      });
    }
  }

  const handleSyncOctopart = async () => {
    if (!mpn || !backendOnline) return;
    setSyncError(null);
    setSyncBusy(true);
    try {
      const fresh = await api.lookupOctopartMpn(mpn);
      setSyncedOctopart((prev) => ({
        ...prev,
        [mpn]: {
          stock: fresh.stock,
          price: fresh.price,
          octopart_url: fresh.octopart_url,
          manufacturer: fresh.manufacturer || prev[mpn]?.manufacturer,
          description: fresh.description || prev[mpn]?.description,
        },
      }));
    } catch (err) {
      if (err instanceof ApiHttpError) {
        if (err.status === 503) setSyncError('Octopart / Nexar API token unset (503).');
        else if (err.status === 404) setSyncError(`MPN "${mpn}" not found on Octopart.`);
        else setSyncError(err.detail);
      } else {
        setSyncError(err instanceof Error ? err.message : 'Octopart sync failed.');
      }
    } finally {
      setSyncBusy(false);
    }
  };

  if (!mergedPart) {
    return (
      <div className="rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel-alt)] p-3 text-xs text-[var(--text-muted)]">
        <p className="font-semibold text-[var(--text)]">Component Inspector</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-dim)]">
          Click any footprint on the 2D/3D board, in the Objects tree, or in the Parts Library to inspect its properties, live Octopart pricing, and pinout mapping.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Selected Part Hero */}
      <div className="rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel-alt)] p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {badgeLabel && (
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    inspectedLibraryPart
                      ? 'bg-[var(--ai)]/20 text-[var(--ai)]'
                      : 'bg-[var(--accent-dim)] text-[var(--accent)]'
                  }`}
                >
                  {badgeLabel}
                </span>
              )}
              <span className="truncate font-mono text-xs font-bold text-[var(--text)]">
                {mpn || 'Unknown Part'}
              </span>
            </div>
            {mergedPart.description && (
              <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                {mergedPart.description}
              </p>
            )}
          </div>
        </div>

        <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-[var(--border)] pt-2 text-[11px]">
          <dt className="text-[var(--text-dim)]">Mfr</dt>
          <dd className="truncate font-mono text-[var(--text)]">{mergedPart.manufacturer || '—'}</dd>
          <dt className="text-[var(--text-dim)]">Package</dt>
          <dd className="truncate font-mono text-[var(--text)]">{mergedPart.package || '—'}</dd>
          <dt className="text-[var(--text-dim)]">Value</dt>
          <dd className="truncate font-mono text-[var(--text)]">{mergedPart.value || '—'}</dd>
          <dt className="text-[var(--text-dim)]">Footprint</dt>
          <dd className="truncate font-mono text-[10.5px] text-[var(--text-muted)]" title={mergedPart.footprint_ref}>
            {mergedPart.footprint_ref || '—'}
          </dd>
          {activeFp && (
            <>
              <dt className="text-[var(--text-dim)]">Pose</dt>
              <dd className="font-mono text-[var(--accent)]">
                ({activeFp.x.toFixed(2)}, {activeFp.y.toFixed(2)}) mm · {activeFp.rot}°
              </dd>
            </>
          )}
        </dl>
      </div>

      {/* Pricing & Octopart Sync */}
      <div className="rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel-alt)] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Sourcing & Stock
          </span>
          <button
            type="button"
            disabled={!backendOnline || !mpn || !health?.octopart || syncBusy}
            onClick={handleSyncOctopart}
            title={
              health?.octopart
                ? 'Sync live price & stock from Octopart'
                : 'Octopart disabled (NEXAR_ACCESS_TOKEN unset)'
            }
            className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-card)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--text)] hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {syncBusy ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
            )}
            <span>Octopart ↻</span>
          </button>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded bg-[var(--bg-input)] p-1.5">
            <p className="text-[9.5px] uppercase text-[var(--text-dim)]">Stock</p>
            <p className="font-mono text-xs font-semibold text-[var(--text)]">
              {mergedPart.stock !== undefined ? mergedPart.stock.toLocaleString() : '—'}
            </p>
          </div>
          <div className="rounded bg-[var(--bg-input)] p-1.5">
            <p className="text-[9.5px] uppercase text-[var(--text-dim)]">Unit $</p>
            <p className="font-mono text-xs font-semibold text-[var(--accent)]">
              {mergedPart.price !== undefined ? `$${Number(mergedPart.price).toFixed(3)}` : '—'}
            </p>
          </div>
          <div className="rounded bg-[var(--bg-input)] p-1.5">
            <p className="text-[9.5px] uppercase text-[var(--text-dim)]">LCSC</p>
            <p className="truncate font-mono text-xs font-semibold text-[var(--text)]">
              {mergedPart.lcsc_id || '—'}
            </p>
          </div>
        </div>

        {mergedPart.octopart_url && (
          <a
            href={mergedPart.octopart_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline"
          >
            <span>Open datasheet / Octopart</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}

        {syncError && (
          <p role="alert" className="mt-2 text-[10.5px] text-[var(--warn)]">
            {syncError}
          </p>
        )}
      </div>

      {/* Pinout & Net Mapping Table */}
      <div className="rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel-alt)] p-2.5">
        <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
          Pinout & Net Mapping ({pinRows.length})
        </h3>
        {pinRows.length === 0 ? (
          <p className="text-[11px] text-[var(--text-dim)]">No pin table available.</p>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-label="Pinout and net mapping"
            className="cad-table-wrapper max-h-[220px] overflow-auto rounded border border-[var(--border)] bg-[var(--bg-input)]"
          >
            <table className="w-full border-separate border-spacing-0 text-left font-mono text-[10.5px]">
              <thead className="sticky top-0 z-10 bg-[var(--bg-panel)] text-[var(--text-dim)]">
                <tr>
                  <th scope="col" className="border-b border-[var(--border)] px-2 py-1.5">Pin</th>
                  <th scope="col" className="border-b border-[var(--border)] px-2 py-1.5">Name</th>
                  <th scope="col" className="border-b border-[var(--border)] px-2 py-1.5">Type</th>
                  <th scope="col" className="border-b border-[var(--border)] px-2 py-1.5">Net</th>
                </tr>
              </thead>
              <tbody>
                {pinRows.map((row) => {
                  const isNetActive = row.net !== '—' && highlightedNet === row.net;
                  return (
                    <tr key={`${row.num}-${row.name}`} className="hover:bg-[var(--bg-panel-alt)]">
                      <th
                        scope="row"
                        className="sticky left-0 border-b border-[var(--border)]/60 bg-[var(--bg-input)] px-2 py-1 font-semibold text-[var(--text)]"
                      >
                        {row.num}
                      </th>
                      <td className="border-b border-[var(--border)]/60 px-2 py-1 text-[var(--text-muted)]">
                        {row.name}
                      </td>
                      <td className="border-b border-[var(--border)]/60 px-2 py-1 text-[var(--text-dim)]">
                        {row.type}
                      </td>
                      <td className="border-b border-[var(--border)]/60 px-2 py-1">
                        {row.net !== '—' ? (
                          <button
                            type="button"
                            onClick={() =>
                              setHighlightedNet(isNetActive ? null : row.net)
                            }
                            className={`rounded px-1.5 py-0.5 text-[10px] ${
                              isNetActive
                                ? 'bg-[var(--accent)] text-[var(--accent-text)] font-bold'
                                : 'bg-[var(--bg-card)] text-[var(--text)] hover:text-[var(--accent)]'
                            }`}
                          >
                            {row.net}
                          </button>
                        ) : (
                          <span className="text-[var(--text-dim)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
