import { Check, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ProjectDetail } from '../api/types';
import { useStudioStore } from '../store/useStudioStore';

interface CodeInspectorViewProps {
  detail: ProjectDetail | null;
  kicadPcbText: string | null;
  kicadSchText: string | null;
}

type CodeTab = 'trace' | 'netlist' | 'kicad_pcb' | 'kicad_sch' | 'drc' | 'brief';

export function CodeInspectorView({
  detail,
  kicadPcbText,
  kicadSchText,
}: CodeInspectorViewProps) {
  const [activeTab, setActiveTab] = useState<CodeTab>('trace');
  const [copied, setCopied] = useState(false);

  const apiTraces = useStudioStore((s) => s.apiTraces);
  const clearApiTraces = useStudioStore((s) => s.clearApiTraces);

  const getTabContent = (): string => {
    switch (activeTab) {
      case 'trace':
        return JSON.stringify(apiTraces, null, 2);
      case 'netlist':
        return detail?.netlist ? JSON.stringify(detail.netlist, null, 2) : '// No netlist.json yet';
      case 'kicad_pcb':
        return kicadPcbText ?? '// No board.kicad_pcb generated yet';
      case 'kicad_sch':
        return kicadSchText ?? '// No board.kicad_sch generated yet';
      case 'drc':
        return detail?.drc ? JSON.stringify(detail.drc, null, 2) : '// No drc.json report yet';
      case 'brief':
        return JSON.stringify(
          {
            design_brief: detail?.design_brief ?? null,
            review: detail?.review ?? null,
          },
          null,
          2,
        );
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getTabContent());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const tabs: Array<{ id: CodeTab; label: string }> = [
    { id: 'trace', label: `API Trace (${apiTraces.length})` },
    { id: 'netlist', label: 'netlist.json' },
    { id: 'kicad_pcb', label: '.kicad_pcb' },
    { id: 'kicad_sch', label: '.kicad_sch' },
    { id: 'drc', label: 'drc.json' },
    { id: 'brief', label: 'Brief & Review' },
  ];

  return (
    <div className="flex h-full w-full flex-col bg-[var(--bg-canvas)] text-[var(--text)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2">
        <div role="tablist" aria-label="Code and API inspector tabs" className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`studio-tab shrink-0 rounded-[4px] px-2.5 py-1 font-mono text-[11px] ${
                  selected
                    ? 'bg-[var(--bg-card)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          {activeTab === 'trace' && apiTraces.length > 0 && (
            <button
              type="button"
              onClick={clearApiTraces}
              className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--bg-panel-alt)] px-2 py-1 font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              <span>Clear</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--bg-panel-alt)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            {copied ? (
              <Check className="h-3 w-3 text-[var(--accent)]" aria-hidden="true" />
            ) : (
              <Copy className="h-3 w-3" aria-hidden="true" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'trace' ? (
          apiTraces.length === 0 ? (
            <p className="font-mono text-xs text-[var(--text-dim)]">
              No API calls recorded yet in this session.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {apiTraces.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel)] p-2.5 font-mono text-[11px]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          entry.ok
                            ? 'bg-[var(--accent-dim)] text-[var(--ok)]'
                            : 'bg-[var(--err)]/15 text-[var(--err)]'
                        }`}
                      >
                        {entry.status ?? 'NET ERR'}
                      </span>
                      <span className="font-semibold text-[var(--text)]">{entry.method}</span>
                      <span className="text-[var(--text-muted)]">{entry.path}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] text-[var(--text-dim)]">
                      <span>{entry.durationMs}ms</span>
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  {entry.preview && (
                    <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-all rounded bg-[var(--bg-input)] p-2 text-[10.5px] text-[var(--text-dim)]">
                      {entry.preview}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <pre className="whitespace-pre-wrap break-words rounded-[6px] border border-[var(--border)] bg-[var(--bg-input)] p-4 font-mono text-[11.5px] leading-relaxed text-[var(--text)]">
            {getTabContent()}
          </pre>
        )}
      </div>
    </div>
  );
}
