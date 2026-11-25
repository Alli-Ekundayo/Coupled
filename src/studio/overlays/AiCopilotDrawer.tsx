import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  SlidersHorizontal,
  Sparkles,
  Square,
} from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ApiHttpError } from '../../api/client';
import { api } from '../../api/endpoints';
import { ChatMessage, DesignStreamEvent } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { PipelineStepId, PipelineStepStatus, useStudioStore } from '../../store/useStudioStore';

interface AiCopilotDrawerProps {
  projectId: string | null;
  chatHistory: ChatMessage[];
  onHydrateProject: (pid: string, switchView?: 'schematic' | 'pcb') => Promise<void>;
}

const STEP_LABELS: Array<{ id: PipelineStepId; label: string }> = [
  { id: 'reqs', label: 'Reqs' },
  { id: 'parts', label: 'Parts' },
  { id: 'sch', label: 'Sch' },
  { id: 'place', label: 'Place' },
  { id: 'route', label: 'Route' },
  { id: 'drc', label: 'DRC' },
];

const DEMO_PROMPTS = [
  'USB-C powered 3.3V BME280 environmental sensor board with I2C header and power LED',
  'Resize board to 45x35',
  'Add a green 0603 power indicator LED with a 4.7k resistor on 3V3',
];

export function AiCopilotDrawer({
  projectId,
  chatHistory,
  onHydrateProject,
}: AiCopilotDrawerProps) {
  const { health, backendOnline } = useAuth();
  const copilotOpen = useStudioStore((s) => s.copilotOpen);
  const setCopilotOpen = useStudioStore((s) => s.setCopilotOpen);
  const copilotTab = useStudioStore((s) => s.copilotTab);
  const setCopilotTab = useStudioStore((s) => s.setCopilotTab);
  const sseDesign = useStudioStore((s) => s.sseDesign);
  const resetSseDesign = useStudioStore((s) => s.resetSseDesign);
  const patchSseDesign = useStudioStore((s) => s.patchSseDesign);
  const pendingPrompt = useStudioStore((s) => s.pendingLandingPrompt);
  const setPendingLandingPayload = useStudioStore((s) => s.setPendingLandingPayload);

  const [designPrompt, setDesignPrompt] = useState(
    'USB-C powered 3.3V BME280 environmental sensor board with I2C header and power LED',
  );
  const [customProjectId, setCustomProjectId] = useState('');
  const [boardWidth, setBoardWidth] = useState('');
  const [boardHeight, setBoardHeight] = useState('');
  const [autoRoute, setAutoRoute] = useState(true);
  const [preferOctopart, setPreferOctopart] = useState(false);
  const [iterations, setIterations] = useState('2500');
  const [checkpoint, setCheckpoint] = useState('d2/ppo');
  const [maxSteps, setMaxSteps] = useState('300');
  const [seed, setSeed] = useState('0');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Array<ChatMessage & { action?: string }>>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Sync persisted chat history when project loads
  useEffect(() => {
    setLocalMessages(chatHistory.map((m) => ({ ...m })));
    setChatError(null);
  }, [projectId, chatHistory]);

  // Accept prompt launched from Landing Page modal
  useEffect(() => {
    if (pendingPrompt) {
      setDesignPrompt(pendingPrompt);
      setCopilotTab('design');
      setCopilotOpen(true);
      setPendingLandingPayload({ prompt: null });
    }
  }, [pendingPrompt, setCopilotOpen, setCopilotTab, setPendingLandingPayload]);

  const offlineLlm = Boolean(backendOnline && health && !health.llm);

  const handleRunDesignStream = async (e: FormEvent) => {
    e.preventDefault();
    if (!backendOnline || !designPrompt.trim()) return;

    resetSseDesign();
    patchSseDesign((prev) => ({
      ...prev,
      running: true,
      error: null,
      steps: { ...prev.steps, reqs: 'running' },
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let resolvedPid: string | null = customProjectId.trim() || null;
      let streamHadError = false;

      await api.streamDesign(
        {
          prompt: designPrompt.trim(),
          project_id: resolvedPid,
          board_width_mm: boardWidth ? Number(boardWidth) : null,
          board_height_mm: boardHeight ? Number(boardHeight) : null,
          auto_route: autoRoute,
          prefer_octopart: preferOctopart,
          iterations: Number(iterations) || 2500,
          checkpoint,
          max_steps: Number(maxSteps) || 300,
          seed: Number(seed) || 0,
        },
        (eventName, ev: DesignStreamEvent) => {
          if (eventName === 'error' || ev.type === 'error') {
            streamHadError = true;
            const errMsg = ev.error ?? ev.message ?? 'Design stream failed.';
            patchSseDesign((prev) => ({
              ...prev,
              running: false,
              error: errMsg,
            }));
            return;
          }

          if (ev.project_id) {
            resolvedPid = ev.project_id;
          }

          if (ev.type === 'stage' && ev.stage) {
            const stageMap: Record<string, PipelineStepId> = {
              requirements: 'reqs',
              components: 'parts',
              netlist: 'sch',
              schematic: 'sch',
              placement: 'place',
              routing: 'route',
              drc: 'drc',
            };
            const stepId = stageMap[ev.stage];
            const nextStatus: PipelineStepStatus = ev.status === 'done' ? 'done' : 'running';

            patchSseDesign((prev) => ({
              ...prev,
              projectId: resolvedPid ?? prev.projectId,
              steps: stepId ? { ...prev.steps, [stepId]: nextStatus } : prev.steps,
              liveSchematicSvg: ev.schematic_svg ?? prev.liveSchematicSvg,
              liveSvgSnapshot: ev.pcb_svg ?? prev.liveSvgSnapshot,
              liveDrc: ev.drc ?? prev.liveDrc,
            }));
          }

          if (ev.type === 'routing_step' || eventName === 'routing_step') {
            patchSseDesign((prev) => ({
              ...prev,
              routingStep: {
                type: 'routing_step',
                step: ev.step ?? 0,
                connected_nets: ev.connected_nets ?? 0,
                total_nets: ev.total_nets ?? 0,
                unrouted_count: ev.unrouted_count,
                vias: ev.vias,
                drc_violations: ev.drc_violations,
                ratsnest_reduction: ev.ratsnest_reduction,
                engine: ev.engine,
                svg_snapshot: ev.svg_snapshot,
              },
              liveSvgSnapshot: ev.svg_snapshot ?? prev.liveSvgSnapshot,
            }));
          }

          if (eventName === 'done' || ev.type === 'done') {
            const finalPid = ev.project_id ?? ev.result?.project_id ?? resolvedPid;
            patchSseDesign((prev) => ({
              ...prev,
              running: false,
              projectId: finalPid,
              steps: {
                reqs: 'done',
                parts: 'done',
                sch: 'done',
                place: 'done',
                route: autoRoute ? 'done' : prev.steps.route,
                drc: 'done',
              },
            }));
            if (finalPid) {
              void onHydrateProject(finalPid, 'pcb');
            }
          }
        },
        controller.signal,
      );

      if (!streamHadError && resolvedPid) {
        patchSseDesign((prev) => ({ ...prev, running: false }));
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        patchSseDesign((prev) => ({
          ...prev,
          running: false,
          error: 'Design stream cancelled by user.',
        }));
      } else {
        const msg =
          err instanceof ApiHttpError
            ? `${err.status}: ${err.detail}`
            : err instanceof Error
              ? err.message
              : String(err);
        patchSseDesign((prev) => ({
          ...prev,
          running: false,
          error: msg,
        }));
      }
    } finally {
      abortRef.current = null;
    }
  };

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg || !backendOnline) return;

    const pid = projectId || customProjectId.trim() || `design_${Date.now().toString(36)}`;
    setChatError(null);
    setChatInput('');
    setLocalMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setChatBusy(true);

    try {
      const res = await api.chatProject(pid, {
        message: msg,
        auto_route: autoRoute,
        iterations: Number(iterations) || 2500,
        max_steps: Number(maxSteps) || 300,
        checkpoint,
      });

      setLocalMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply, action: res.action },
      ]);

      if (res.design !== null) {
        await onHydrateProject(res.project_id, 'pcb');
      }
    } catch (err) {
      const detail =
        err instanceof ApiHttpError
          ? `${err.status}: ${err.detail}`
          : err instanceof Error
            ? err.message
            : String(err);
      setChatError(detail);
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <aside
      aria-label="AI Copilot"
      className="absolute right-3.5 top-3 z-20 flex w-[365px] max-w-[calc(100%-28px)] flex-col overflow-hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-panel)]/95 shadow-2xl backdrop-blur-md"
      style={{ maxHeight: 'calc(100% - 76px)' }}
    >
      {/* Header / Collapse Trigger */}
      <button
        type="button"
        onClick={() => setCopilotOpen(!copilotOpen)}
        aria-expanded={copilotOpen}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-[var(--bg-panel-alt)]"
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-5 w-5 items-center justify-center rounded text-white"
            style={{ background: 'var(--ai-grad)' }}
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold text-[var(--text)]">AI Copilot</span>
          {sseDesign.running && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ai)]/15 px-2 py-0.5 font-mono text-[10px] text-[var(--ai)]">
              <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
              Streaming
            </span>
          )}
        </div>
        {copilotOpen ? (
          <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
        )}
      </button>

      {copilotOpen && (
        <div className="flex min-h-0 flex-1 flex-col border-t border-[var(--border)]">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 border-b border-[var(--border)] bg-[var(--bg-input)] p-1.5">
            <button
              type="button"
              onClick={() => setCopilotTab('design')}
              className={`rounded-[4px] py-1 text-[11px] font-medium ${
                copilotTab === 'design'
                  ? 'bg-[var(--bg-card)] text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Design From Scratch
            </button>
            <button
              type="button"
              onClick={() => setCopilotTab('chat')}
              className={`rounded-[4px] py-1 text-[11px] font-medium ${
                copilotTab === 'chat'
                  ? 'bg-[var(--bg-card)] text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Chat & Refine
            </button>
          </div>

          {offlineLlm && (
            <div className="border-b border-[var(--border)] bg-[var(--warn)]/10 px-3 py-2 text-[10.5px] text-[var(--warn)]">
              Offline Demo Mode (`GEMINI_API_KEY` unset): arbitrary prompts return 422; use the built-in USB-C/BME280 demo prompt or `&lt;W&gt;x&lt;H&gt;` resize.
            </div>
          )}

          {copilotTab === 'design' ? (
            <form
              onSubmit={handleRunDesignStream}
              className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3"
            >
              {/* 6-Pill Stepper */}
              <div className="grid grid-cols-6 gap-1">
                {STEP_LABELS.map((step) => {
                  const st = sseDesign.steps[step.id];
                  return (
                    <div
                      key={step.id}
                      className={`rounded-[4px] border px-1 py-1 text-center font-mono text-[10px] font-semibold ${
                        st === 'done'
                          ? 'border-[var(--accent)]/40 bg-[var(--accent-dim)] text-[var(--accent)]'
                          : st === 'running'
                            ? 'animate-pulse border-[var(--ai)] bg-[var(--ai)]/15 text-[var(--ai)]'
                            : st === 'error'
                              ? 'border-[var(--err)]/40 bg-[var(--err)]/10 text-[var(--err)]'
                              : 'border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-dim)]'
                      }`}
                    >
                      {step.label}
                    </div>
                  );
                })}
              </div>

              {sseDesign.routingStep && (
                <div className="rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] px-2.5 py-1.5 font-mono text-[10.5px] text-[var(--text-muted)]">
                  Step {sseDesign.routingStep.step} · {sseDesign.routingStep.connected_nets}/
                  {sseDesign.routingStep.total_nets} nets ·{' '}
                  {sseDesign.routingStep.vias ?? 0} vias
                  {sseDesign.routingStep.ratsnest_reduction !== undefined &&
                    ` · ${Math.round(sseDesign.routingStep.ratsnest_reduction * 100)}% routed`}
                </div>
              )}

              {sseDesign.error && (
                <p role="alert" className="rounded-[5px] border border-[var(--err)]/40 bg-[var(--err)]/10 px-2.5 py-2 text-[11px] text-[var(--err)]">
                  {sseDesign.error}
                </p>
              )}

              <textarea
                rows={3}
                value={designPrompt}
                onChange={(e) => setDesignPrompt(e.target.value)}
                placeholder="Describe your PCB architecture, power rails, MCU/sensors, and connectors..."
                aria-label="PCB design prompt"
                className="w-full rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] p-2.5 text-xs text-[var(--text)] placeholder:text-[var(--text-dim)]"
              />

              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setDesignPrompt(DEMO_PROMPTS[0])}
                  className="rounded border border-[var(--border)] bg-[var(--bg-panel-alt)] px-2 py-0.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  USB-C BME280 Demo
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="inline-flex items-center gap-1.5 self-start text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
                <span>{showAdvanced ? 'Hide parameters' : 'Board & router parameters'}</span>
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-2 rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] p-2.5 text-[11px]">
                  <input
                    type="text"
                    value={customProjectId}
                    onChange={(e) => setCustomProjectId(e.target.value)}
                    placeholder="project_id (auto)"
                    className="col-span-2 rounded border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1 font-mono text-[11px] text-[var(--text)]"
                  />
                  <input
                    type="number"
                    value={boardWidth}
                    onChange={(e) => setBoardWidth(e.target.value)}
                    placeholder="Width mm (auto)"
                    className="rounded border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1 font-mono text-[11px] text-[var(--text)]"
                  />
                  <input
                    type="number"
                    value={boardHeight}
                    onChange={(e) => setBoardHeight(e.target.value)}
                    placeholder="Height mm (auto)"
                    className="rounded border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1 font-mono text-[11px] text-[var(--text)]"
                  />
                  <select
                    value={checkpoint}
                    onChange={(e) => setCheckpoint(e.target.value)}
                    className="rounded border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1 font-mono text-[11px] text-[var(--text)]"
                  >
                    <option value="d2/ppo">d2/ppo</option>
                    <option value="d2/grpo">d2/grpo</option>
                    <option value="d2/ppo_terminal">d2/ppo_terminal</option>
                    <option value="d1/grid100">d1/grid100</option>
                  </select>
                  <input
                    type="number"
                    value={iterations}
                    onChange={(e) => setIterations(e.target.value)}
                    placeholder="SA iters"
                    className="rounded border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1 font-mono text-[11px] text-[var(--text)]"
                  />
                  <input
                    type="number"
                    value={maxSteps}
                    onChange={(e) => setMaxSteps(e.target.value)}
                    placeholder="Max steps"
                    className="rounded border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1 font-mono text-[11px] text-[var(--text)]"
                  />
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Seed"
                    className="rounded border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1 font-mono text-[11px] text-[var(--text)]"
                  />
                  <label className="flex items-center gap-1.5 text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      checked={autoRoute}
                      onChange={(e) => setAutoRoute(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    <span>Auto-route</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      checked={preferOctopart}
                      onChange={(e) => setPreferOctopart(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    <span>Octopart first</span>
                  </label>
                </div>
              )}

              <div className="flex gap-1.5">
                <button
                  type="submit"
                  disabled={!backendOnline || sseDesign.running}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-text)] disabled:opacity-45"
                >
                  {sseDesign.running ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{sseDesign.running ? 'Designing Board...' : 'Stream Full Design'}</span>
                </button>
                {sseDesign.running && (
                  <button
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                    aria-label="Cancel design stream"
                    className="inline-flex items-center justify-center rounded-[5px] border border-[var(--err)]/40 bg-[var(--err)]/15 px-3 py-2 text-xs text-[var(--err)]"
                  >
                    <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
                {localMessages.length === 0 ? (
                  <p className="text-xs text-[var(--text-dim)]">
                    Ask an engineering question or request a layout change (e.g. "Resize board to 45x35" or "Add a green 0603 LED on 3V3").
                  </p>
                ) : (
                  localMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col gap-1 rounded-[6px] px-2.5 py-2 text-xs ${
                        msg.role === 'user'
                          ? 'ml-6 bg-[var(--bg-card)] text-[var(--text)]'
                          : 'mr-4 border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-muted)]'
                      }`}
                    >
                      {msg.action && (
                        <span className="self-start rounded bg-[var(--ai)]/15 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-[var(--ai)]">
                          {msg.action}
                        </span>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  ))
                )}

                {chatBusy && (
                  <div className="flex items-center gap-2 text-xs text-[var(--ai)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>Thinking & rebuilding if needed...</span>
                  </div>
                )}

                {chatError && (
                  <p role="alert" className="rounded-[5px] border border-[var(--err)]/40 bg-[var(--err)]/10 px-2.5 py-2 text-[11px] text-[var(--err)]">
                    {chatError}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-1 border-t border-[var(--border)] px-3 pt-2">
                {DEMO_PROMPTS.slice(1).map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setChatInput(chip)}
                    className="rounded border border-[var(--border)] bg-[var(--bg-panel-alt)] px-2 py-0.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    {chip.slice(0, 28)}
                    {chip.length > 28 ? '…' : ''}
                  </button>
                ))}
              </div>

              <form onSubmit={handleChatSubmit} className="flex gap-1.5 p-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask or refine this PCB..."
                  aria-label="Chat with AI Copilot"
                  className="flex-1 rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] px-2.5 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--text-dim)]"
                />
                <button
                  type="submit"
                  disabled={!backendOnline || chatBusy || !chatInput.trim()}
                  aria-label="Send message"
                  className="inline-flex items-center justify-center rounded-[5px] bg-[var(--accent)] px-2.5 py-1.5 text-[var(--accent-text)] disabled:opacity-45"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
