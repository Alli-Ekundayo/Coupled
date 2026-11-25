import { Download, Loader2, Package, X } from 'lucide-react';
import { useId, useState } from 'react';
import { ApiHttpError } from '../api/client';
import { api } from '../api/endpoints';
import { ExportFormat } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { useDialogController } from '../auth/AuthModal';
import { LocalDemoSnapshot } from '../store/useStudioStore';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  localDemo: LocalDemoSnapshot | null;
}

const EXPORT_ITEMS: Array<{
  format: ExportFormat;
  title: string;
  subtitle: string;
  requiresKicad?: boolean;
}> = [
  {
    format: 'kicad_pcb',
    title: 'KiCad 9 PCB (.kicad_pcb)',
    subtitle: '2-layer board with routed tracks, vias, and footprints',
  },
  {
    format: 'kicad_sch',
    title: 'KiCad 9 Schematic (.kicad_sch)',
    subtitle: 'Grounded schematic sheet generated from netlist',
  },
  {
    format: 'gerber',
    title: 'Fabrication Archive (Gerbers + Drill + BOM ZIP)',
    subtitle: 'RS-274X Gerbers, Excellon drill files, and JLCPCB BOM',
    requiresKicad: true,
  },
  {
    format: 'bom',
    title: 'JLCPCB BOM (.csv)',
    subtitle: 'Grouped Comment, Designator, Footprint, LCSC Part #',
  },
  {
    format: 'schematic_svg',
    title: 'Schematic Preview (.svg)',
    subtitle: 'Vector schematic diagram with net labels',
  },
  {
    format: 'svg',
    title: 'PCB Board Preview (.svg)',
    subtitle: '2D top/bottom copper & silkscreen vector preview',
  },
];

function triggerTextDownload(text: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportModal({ open, onClose, projectId, localDemo }: ExportModalProps) {
  const { health, backendOnline } = useAuth();
  const dialogRef = useDialogController(open, onClose);
  const titleId = useId();
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const kicadAvailable = Boolean(health?.kicad_cli || health?.worker_health?.kicad_cli);

  const handleDownload = async (format: ExportFormat) => {
    setErrorMsg(null);
    setStatusMsg(null);

    if (localDemo) {
      if (format === 'kicad_pcb') {
        triggerTextDownload(localDemo.kicadPcbText, `${localDemo.detail.project_id}.kicad_pcb`);
        setStatusMsg('Downloaded sample .kicad_pcb');
      } else if (format === 'kicad_sch') {
        triggerTextDownload(localDemo.kicadSchText, `${localDemo.detail.project_id}.kicad_sch`);
        setStatusMsg('Downloaded sample .kicad_sch');
      } else if (format === 'schematic_svg') {
        triggerTextDownload(localDemo.schematicSvg, `${localDemo.detail.project_id}_schematic.svg`, 'image/svg+xml');
        setStatusMsg('Downloaded sample schematic SVG');
      } else if (format === 'bom') {
        triggerTextDownload(localDemo.bomCsv, `${localDemo.detail.project_id}_bom.csv`, 'text/csv');
        setStatusMsg('Downloaded sample BOM CSV');
      } else {
        setErrorMsg('Gerber ZIP & KiCad SVG rendering require a connected hackpcb backend with kicad-cli.');
      }
      return;
    }

    if (!projectId || !backendOnline) {
      setErrorMsg('Select an active project on a connected backend first.');
      return;
    }

    setDownloading(format);
    try {
      const savedAs = await api.downloadProjectExport(projectId, format);
      setStatusMsg(`Downloaded ${savedAs}`);
    } catch (err) {
      if (err instanceof ApiHttpError) {
        if (err.status === 501) {
          setErrorMsg('501 Not Implemented: Gerber ZIP requires kicad-cli locally or in worker container.');
        } else {
          setErrorMsg(`${err.status}: ${err.detail}`);
        }
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Export failed.');
      }
    } finally {
      setDownloading(null);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby={titleId}
      className="studio-dialog m-auto w-[calc(100%-2rem)] max-w-[520px] rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-panel)] p-6 text-[var(--text)] shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-[var(--accent-dim)] text-[var(--accent)]">
            <Package className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id={titleId} className="text-base font-bold tracking-tight text-[var(--text)]">
              Export Fabrication & CAD Files
            </h2>
            <p className="font-mono text-[11px] text-[var(--text-muted)]">
              Project: {projectId ?? 'none'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close export dialog"
          className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {EXPORT_ITEMS.map((item) => {
          const disabledForWorker = Boolean(item.requiresKicad && !kicadAvailable && !localDemo);
          const disabled =
            downloading !== null ||
            (!localDemo && (!backendOnline || !projectId)) ||
            disabledForWorker ||
            (Boolean(localDemo) && (item.format === 'gerber' || item.format === 'svg'));

          return (
            <button
              key={item.format}
              type="button"
              disabled={disabled}
              title={
                disabledForWorker
                  ? 'Requires KiCad 9 CLI locally or via WORKER_URL'
                  : undefined
              }
              onClick={() => handleDownload(item.format)}
              className="flex w-full items-center justify-between gap-3 rounded-[6px] border border-[var(--border)] bg-[var(--bg-panel-alt)] px-3.5 py-2.5 text-left transition-colors hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <div>
                <p className="text-xs font-semibold text-[var(--text)]">{item.title}</p>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {disabledForWorker
                    ? 'Unavailable: KiCad 9 CLI not detected on backend / worker.'
                    : item.subtitle}
                </p>
              </div>
              {downloading === item.format ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {statusMsg && (
        <p role="status" className="mt-3 rounded bg-[var(--accent-dim)] px-3 py-2 font-mono text-xs text-[var(--accent)]">
          {statusMsg}
        </p>
      )}
      {errorMsg && (
        <p role="alert" className="mt-3 rounded border border-[var(--err)]/40 bg-[var(--err)]/10 px-3 py-2 text-xs text-[var(--err)]">
          {errorMsg}
        </p>
      )}
    </dialog>
  );
}
