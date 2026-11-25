import { FileUp, Loader2, Play, Square, Wrench } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ApiHttpError } from '../../api/client';
import { api } from '../../api/endpoints';
import { NetlistPartOverride, RoutingJobStreamEvent } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { useStudioStore } from '../../store/useStudioStore';

interface PipelineTabProps {
  projectId: string | null;
  onProjectMutated: (pid: string, switchView?: 'schematic' | 'pcb') => Promise<void>;
}

export function PipelineTab({ projectId, onProjectMutated }: PipelineTabProps) {
  const { health, backendOnline } = useAuth();
  const pendingBoardFile = useStudioStore((s) => s.pendingLandingBoardFile);
  const setPendingLandingPayload = useStudioStore((s) => s.setPendingLandingPayload);

  // Stage 2: Netlist
  const [netlistPrompt, setNetlistPrompt] = useState(
    'USB-C powered 3.3V BME280 sensor board with I2C header',
  );
  const [explicitPartsJson, setExplicitPartsJson] = useState('');
  const [netlistBusy, setNetlistBusy] = useState(false);
  const [netlistInfo, setNetlistInfo] = useState<string | null>(null);

  // Stage 3: Place (Netlist or Scraped)
  const [boardWidth, setBoardWidth] = useState('42');
  const [boardHeight, setBoardHeight] = useState('30');
  const [iterations, setIterations] = useState('2500');
  const [seed, setSeed] = useState('0');
  const [scrapedFile, setScrapedFile] = useState<File | null>(null);
  const [keepZones, setKeepZones] = useState(true);
  const [placeBusy, setPlaceBusy] = useState(false);
  const [placeInfo, setPlaceInfo] = useState<string | null>(null);

  // Stage 4: Route & Finish
  const [checkpoint, setCheckpoint] = useState('d2/ppo');
  const [maxSteps, setMaxSteps] = useState('300');
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeLog, setRouteLog] = useState<string | null>(null);
  const [finishBusy, setFinishBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Pick up any uploaded file carried over from Landing Page modal
  useEffect(() => {
    if (pendingBoardFile) {
      setScrapedFile(pendingBoardFile);
      setPendingLandingPayload({ boardFile: null });
    }
  }, [pendingBoardFile, setPendingLandingPayload]);

  const pid = projectId || 'manual_board';
  const workerAvailable = Boolean(health && health.worker !== 'in-process');

  const formatErr = (err: unknown) => {
    if (err instanceof ApiHttpError) return `${err.status}: ${err.detail}`;
    return err instanceof Error ? err.message : String(err);
  };

  const handleStage2Netlist = async (e: FormEvent) => {
    e.preventDefault();
    if (!backendOnline) return;
    setErrorMsg(null);
    setNetlistInfo(null);
    setNetlistBusy(true);

    try {
      let parts: NetlistPartOverride[] | null = null;
      if (explicitPartsJson.trim()) {
        parts = JSON.parse(explicitPartsJson) as NetlistPartOverride[];
      }
      const res = await api.runNetlist(pid, {
        prompt: netlistPrompt.trim(),
        parts,
      });
      setNetlistInfo(`ERC ${res.erc_status} · ${Object.keys(res.netlist.nets).length} nets`);
      await onProjectMutated(pid, 'schematic');
    } catch (err) {
      setErrorMsg(formatErr(err));
    } finally {
      setNetlistBusy(false);
    }
  };

  const handleStage3Place = async (mode: 'netlist' | 'scraped') => {
    if (!backendOnline) return;
    if (mode === 'scraped' && !scrapedFile) {
      setErrorMsg('Select a .kicad_pcb file for scraped placement.');
      return;
    }

    setErrorMsg(null);
    setPlaceInfo(null);
    setPlaceBusy(true);

    try {
      const fd = new FormData();
      fd.append('iterations', iterations || '3000');
      fd.append('seed', seed || '0');
      if (mode === 'scraped' && scrapedFile) {
        fd.append('board', scrapedFile);
        fd.append('keep_zones', keepZones ? 'true' : 'false');
      } else {
        fd.append('netlist_id', pid);
        fd.append('board_width_mm', boardWidth || '40');
        fd.append('board_height_mm', boardHeight || '30');
      }

      const res = await api.placeBoard(pid, fd);
      setPlaceInfo(
        `${res.mode} · ${res.placements.length} parts · HPWL ${res.hpwl_mm.toFixed(1)}mm · zones: ${res.zones_preserved}`,
      );
      await onProjectMutated(pid, 'pcb');
    } catch (err) {
      setErrorMsg(formatErr(err));
    } finally {
      setPlaceBusy(false);
    }
  };

  const handleStage4Route = async () => {
    if (!backendOnline) return;
    setErrorMsg(null);
    setRouteBusy(true);
    setRouteLog('Enqueuing 2-layer routing job...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { job_id } = await api.startRoute(pid, {
        board_file: null,
        checkpoint,
        max_steps: Number(maxSteps) || 300,
      });
      setRouteLog(`Job ${job_id} queued — streaming telemetry...`);

      let streamFailed = false;
      await api.streamRouteJob(
        job_id,
        (eventName, ev: RoutingJobStreamEvent) => {
          if (eventName === 'error' || ev.type === 'error') {
            streamFailed = true;
            setErrorMsg(ev.error ?? ev.message ?? 'Routing job failed');
            return;
          }
          if (eventName === 'step' || ev.type === 'step') {
            setRouteLog(
              `Step ${ev.step ?? 0} · ${ev.connected_nets ?? 0}/${ev.total_nets ?? '?'} nets · ${ev.vias ?? 0} vias (${ev.engine ?? 'router'})`,
            );
          }
          if (eventName === 'done' || ev.type === 'done') {
            const m = ev.final_metrics ?? {};
            setRouteLog(
              `Done (${ev.engine ?? 'router'}) · ${m.connected_nets ?? '?'}/${m.total_nets ?? '?'} nets · ${m.vias ?? 0} vias`,
            );
          }
        },
        controller.signal,
      );

      if (!streamFailed) {
        try {
          await api.runDrc(pid);
        } catch {
          // DRC call best-effort after route completion
        }
        await onProjectMutated(pid, 'pcb');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setErrorMsg(formatErr(err));
      } else {
        setRouteLog('Routing stream aborted.');
      }
    } finally {
      abortRef.current = null;
      setRouteBusy(false);
    }
  };

  const handleFinishFreerouting = async () => {
    if (!backendOnline || !workerAvailable) return;
    setErrorMsg(null);
    setFinishBusy(true);
    try {
      const res = await api.finishRouting(pid);
      setRouteLog(`Freerouting finished: ${res.output_path}`);
      await api.runDrc(pid);
      await onProjectMutated(pid, 'pcb');
    } catch (err) {
      setErrorMsg(formatErr(err));
    } finally {
      setFinishBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3 text-xs">
      <div className="rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] px-2.5 py-2 text-[11px] text-[var(--text-muted)]">
        Target project: <span className="font-mono font-semibold text-[var(--text)]">{pid}</span>
      </div>

      {errorMsg && (
        <p role="alert" className="rounded-[5px] border border-[var(--err)]/40 bg-[var(--err)]/10 p-2.5 text-[11px] text-[var(--err)]">
          {errorMsg}
        </p>
      )}

      {/* Stage 2: Netlist */}
      <form
        onSubmit={handleStage2Netlist}
        className="flex flex-col gap-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel-alt)] p-2.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text)]">
            Stage 2 · Grounded Netlist
          </span>
          <span className="font-mono text-[10px] text-[var(--text-dim)]">POST /netlist</span>
        </div>
        <textarea
          rows={2}
          value={netlistPrompt}
          onChange={(e) => setNetlistPrompt(e.target.value)}
          aria-label="Netlist prompt"
          className="w-full rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] p-2 text-[11.5px] text-[var(--text)]"
        />
        <input
          type="text"
          value={explicitPartsJson}
          onChange={(e) => setExplicitPartsJson(e.target.value)}
          placeholder='Optional parts JSON: [{"ref":"U1","mpn":"..."}]'
          aria-label="Optional explicit parts JSON"
          className="w-full rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 font-mono text-[10.5px] text-[var(--text)] placeholder:text-[var(--text-dim)]"
        />
        <button
          type="submit"
          disabled={!backendOnline || netlistBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-[5px] border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-50"
        >
          {netlistBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3 w-3" />}
          <span>Generate Netlist + ERC</span>
        </button>
        {netlistInfo && <p className="font-mono text-[10.5px] text-[var(--accent)]">{netlistInfo}</p>}
      </form>

      {/* Stage 3: Placement */}
      <div className="flex flex-col gap-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel-alt)] p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text)]">
            Stage 3 · SA Placement
          </span>
          <span className="font-mono text-[10px] text-[var(--text-dim)]">multipart /place</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <label className="flex flex-col gap-0.5 text-[10.5px] text-[var(--text-dim)]">
            <span>Width (mm)</span>
            <input
              type="number"
              value={boardWidth}
              onChange={(e) => setBoardWidth(e.target.value)}
              className="rounded-[4px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 font-mono text-xs text-[var(--text)]"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[10.5px] text-[var(--text-dim)]">
            <span>Height (mm)</span>
            <input
              type="number"
              value={boardHeight}
              onChange={(e) => setBoardHeight(e.target.value)}
              className="rounded-[4px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 font-mono text-xs text-[var(--text)]"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[10.5px] text-[var(--text-dim)]">
            <span>Iterations</span>
            <input
              type="number"
              value={iterations}
              onChange={(e) => setIterations(e.target.value)}
              className="rounded-[4px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 font-mono text-xs text-[var(--text)]"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[10.5px] text-[var(--text-dim)]">
            <span>Seed</span>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="rounded-[4px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 font-mono text-xs text-[var(--text)]"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={!backendOnline || placeBusy}
          onClick={() => handleStage3Place('netlist')}
          className="inline-flex items-center justify-center gap-1.5 rounded-[5px] border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-50"
        >
          {placeBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3 w-3" />}
          <span>Place Project Netlist</span>
        </button>

        {/* Scraped .kicad_pcb upload */}
        <div className="mt-1 border-t border-[var(--border)] pt-2">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[5px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-input)] px-3 py-2.5 text-center hover:border-[var(--accent)]">
            <FileUp className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
            <span className="text-[11px] font-medium text-[var(--text)]">
              {scrapedFile ? scrapedFile.name : 'Upload scraped .kicad_pcb'}
            </span>
            <span className="text-[10px] text-[var(--text-dim)]">
              Preserves Edge.Cuts holes & zones
            </span>
            <input
              type="file"
              accept=".kicad_pcb"
              className="sr-only"
              onChange={(e) => setScrapedFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={keepZones}
              onChange={(e) => setKeepZones(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            <span>Preserve copper pour zones (`keep_zones`)</span>
          </label>

          <button
            type="button"
            disabled={!backendOnline || placeBusy || !scrapedFile}
            onClick={() => handleStage3Place('scraped')}
            className="mt-2 w-full rounded-[5px] border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-45"
          >
            Re-place Uploaded .kicad_pcb
          </button>
        </div>

        {placeInfo && <p className="font-mono text-[10.5px] text-[var(--accent)]">{placeInfo}</p>}
      </div>

      {/* Stage 4: Route & Finish */}
      <div className="flex flex-col gap-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel-alt)] p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text)]">
            Stage 4 · 2-Layer Routing
          </span>
          <span className="font-mono text-[10px] text-[var(--text-dim)]">POST /route</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <select
            value={checkpoint}
            onChange={(e) => setCheckpoint(e.target.value)}
            aria-label="PCBWorld checkpoint"
            className="rounded-[4px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 font-mono text-[11px] text-[var(--text)]"
          >
            <option value="d2/ppo">d2/ppo</option>
            <option value="d2/grpo">d2/grpo</option>
            <option value="d2/ppo_terminal">d2/ppo_terminal</option>
            <option value="d1/grid100">d1/grid100</option>
          </select>
          <input
            type="number"
            value={maxSteps}
            onChange={(e) => setMaxSteps(e.target.value)}
            aria-label="Max routing steps"
            placeholder="Max steps"
            className="rounded-[4px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 font-mono text-[11px] text-[var(--text)]"
          />
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={!backendOnline || routeBusy}
            onClick={handleStage4Route}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-text)] disabled:opacity-50"
          >
            {routeBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3 w-3" />}
            <span>Route 2-Layer</span>
          </button>

          {routeBusy && (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              aria-label="Cancel routing stream"
              className="inline-flex items-center justify-center rounded-[5px] border border-[var(--err)]/40 bg-[var(--err)]/15 px-2.5 py-1.5 text-xs text-[var(--err)]"
            >
              <Square className="h-3 w-3" />
            </button>
          )}
        </div>

        <button
          type="button"
          disabled={!backendOnline || !workerAvailable || finishBusy}
          title={
            workerAvailable
              ? 'Run Freerouting fallback on worker container'
              : 'Requires Linux worker container (WORKER_URL) with freerouting.jar'
          }
          onClick={handleFinishFreerouting}
          className="inline-flex items-center justify-center gap-1.5 rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {finishBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wrench className="h-3 w-3" />}
          <span>Finish w/ Freerouting {workerAvailable ? '' : '(Worker only)'}</span>
        </button>

        {routeLog && (
          <p className="rounded bg-[var(--bg-input)] px-2 py-1.5 font-mono text-[10.5px] text-[var(--text-muted)]">
            {routeLog}
          </p>
        )}
      </div>
    </div>
  );
}
