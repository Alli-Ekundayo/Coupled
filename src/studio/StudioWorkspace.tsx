import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BookOpen,
  Boxes,
  Cpu,
  FolderOpen,
  RefreshCw,
  ShieldAlert,
  Workflow,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiHttpError } from '../api/client';
import { api } from '../api/endpoints';
import { Part, ProjectDetail, SourcingEntry } from '../api/types';
import { AuthGate } from '../auth/AuthGate';
import { useAuth } from '../auth/AuthProvider';
import { PcbCanvas2D } from '../cad/PcbCanvas2D';
import { PcbCanvas3D } from '../cad/PcbCanvas3D';
import { SchematicViewer } from '../cad/SchematicViewer';
import { parseKicadPcb } from '../cad/parseKicadPcb';
import { createLocalSampleProject } from '../cad/sampleProject';
import { LeftSidebarTab, useStudioStore } from '../store/useStudioStore';
import { CodeInspectorView } from './CodeInspectorView';
import { ExportModal } from './ExportModal';
import { ApiSettingsModal, DeleteProjectDialog } from './StudioDialogs';
import { Topbar } from './Topbar';
import { LibraryTab } from './left-sidebar/LibraryTab';
import { ObjectsTab } from './left-sidebar/ObjectsTab';
import { PipelineTab } from './left-sidebar/PipelineTab';
import { AiCopilotDrawer } from './overlays/AiCopilotDrawer';
import { BoardBadge } from './overlays/BoardBadge';
import { CanvasHud } from './overlays/CanvasHud';
import { BomSummaryCard } from './right-sidebar/BomSummaryCard';
import { DrcPanel } from './right-sidebar/DrcPanel';
import { InspectorPanel } from './right-sidebar/InspectorPanel';

function normalizeParts(detail: ProjectDetail | null): {
  partsMap: Record<string, Part>;
  sourcingEntries: SourcingEntry[];
} {
  if (!detail) return { partsMap: {}, sourcingEntries: [] };

  const partsMap: Record<string, Part> = detail.parts ? { ...detail.parts } : {};
  let sourcingEntries: SourcingEntry[] = [];

  if (Array.isArray(detail.components)) {
    sourcingEntries = detail.components;
    for (const entry of detail.components) {
      if (!partsMap[entry.ref] && entry.mpn) {
        partsMap[entry.ref] = {
          mpn: entry.mpn,
          lcsc_id: entry.lcsc_id ?? '',
          category: '',
          package: '',
          description: entry.role ?? '',
          manufacturer: '',
          value: '',
          price: entry.price ?? 0,
          stock: entry.stock ?? 0,
          voltage_max: null,
          footprint_ref: entry.footprint_ref ?? '',
          pins: [],
          score: null,
          octopart_url: entry.octopart_url ?? '',
        };
      }
    }
  } else if (detail.components && typeof detail.components === 'object') {
    for (const [ref, part] of Object.entries(detail.components)) {
      if (!partsMap[ref]) {
        partsMap[ref] = part;
      }
    }
  }

  return { partsMap, sourcingEntries };
}

export function StudioWorkspace() {
  const queryClient = useQueryClient();
  const {
    backendOnline,
    authRequired,
    isAuthenticated,
    checkingSession,
    refreshHealthAndSession,
  } = useAuth();

  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const setActiveProjectId = useStudioStore((s) => s.setActiveProjectId);
  const activeView = useStudioStore((s) => s.activeView);
  const setActiveView = useStudioStore((s) => s.setActiveView);
  const leftTab = useStudioStore((s) => s.leftTab);
  const setLeftTab = useStudioStore((s) => s.setLeftTab);
  const setCopilotOpen = useStudioStore((s) => s.setCopilotOpen);
  const setCopilotTab = useStudioStore((s) => s.setCopilotTab);
  const sseDesign = useStudioStore((s) => s.sseDesign);
  const localDemo = useStudioStore((s) => s.localDemo);
  const setLocalDemo = useStudioStore((s) => s.setLocalDemo);
  const pendingBoardFile = useStudioStore((s) => s.pendingLandingBoardFile);

  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  // Switch to Pipeline tab automatically if user uploaded a file from Landing Page
  useEffect(() => {
    if (pendingBoardFile) {
      setLeftTab('pipeline');
    }
  }, [pendingBoardFile, setLeftTab]);

  // Projects list query
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: api.listProjects,
    enabled: backendOnline && (!authRequired || isAuthenticated),
    retry: 0,
    staleTime: 15_000,
  });

  const projects = projectsQuery.data?.projects ?? [];

  // Auto-select most recent project if none selected
  useEffect(() => {
    if (!activeProjectId && !localDemo && projects.length > 0) {
      setActiveProjectId(projects[0].project_id);
      setCopilotOpen(false);
    }
  }, [activeProjectId, localDemo, projects, setActiveProjectId, setCopilotOpen]);

  // Auto-open Copilot if user has 0 projects on a live backend
  useEffect(() => {
    if (backendOnline && projectsQuery.isSuccess && projects.length === 0 && !activeProjectId) {
      setCopilotOpen(true);
    }
  }, [backendOnline, projectsQuery.isSuccess, projects.length, activeProjectId, setCopilotOpen]);

  // Project detail + CAD files hydration
  const projectBundleQuery = useQuery({
    queryKey: ['project-bundle', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      const detail = await api.getProject(activeProjectId);

      const [pcbRes, schRes, schSvgRes] = await Promise.allSettled([
        api.exportProjectText(activeProjectId, 'kicad_pcb'),
        api.exportProjectText(activeProjectId, 'kicad_sch'),
        api.exportProjectText(activeProjectId, 'schematic_svg'),
      ]);

      return {
        detail,
        kicadPcbText: pcbRes.status === 'fulfilled' ? pcbRes.value : null,
        kicadSchText: schRes.status === 'fulfilled' ? schRes.value : null,
        schematicSvg: schSvgRes.status === 'fulfilled' ? schSvgRes.value : null,
      };
    },
    enabled: Boolean(
      backendOnline &&
        activeProjectId &&
        !localDemo &&
        (!authRequired || isAuthenticated),
    ),
    retry: 0,
    staleTime: 10_000,
  });

  const effectiveBundle = localDemo
    ? {
        detail: localDemo.detail,
        kicadPcbText: localDemo.kicadPcbText,
        kicadSchText: localDemo.kicadSchText,
        schematicSvg: localDemo.schematicSvg,
      }
    : projectBundleQuery.data ?? null;

  const detail = effectiveBundle?.detail ?? null;
  const kicadPcbText = effectiveBundle?.kicadPcbText ?? null;
  const kicadSchText = effectiveBundle?.kicadSchText ?? null;
  const schematicSvg = sseDesign.running && sseDesign.liveSchematicSvg
    ? sseDesign.liveSchematicSvg
    : effectiveBundle?.schematicSvg ?? null;

  const parsedBoard = useMemo(() => {
    if (!kicadPcbText) return null;
    try {
      return parseKicadPcb(kicadPcbText);
    } catch {
      return null;
    }
  }, [kicadPcbText]);

  const { partsMap, sourcingEntries } = useMemo(() => normalizeParts(detail), [detail]);

  const hydrateProject = useCallback(
    async (pid: string, switchView?: 'schematic' | 'pcb') => {
      setLocalDemo(null);
      setActiveProjectId(pid);
      if (switchView) setActiveView(switchView);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['project-bundle', pid] }),
      ]);
      await queryClient.refetchQueries({ queryKey: ['project-bundle', pid] });
    },
    [queryClient, setActiveProjectId, setActiveView, setLocalDemo],
  );

  const handleDeleteConfirm = async () => {
    if (!activeProjectId) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.deleteProject(activeProjectId);
      setDeleteOpen(false);
      setActiveProjectId(null);
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (err) {
      setDeleteError(
        err instanceof ApiHttpError
          ? `${err.status}: ${err.detail}`
          : err instanceof Error
            ? err.message
            : 'Delete failed.',
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleLoadLocalDemo = () => {
    const sample = createLocalSampleProject();
    setLocalDemo(sample);
    setActiveProjectId(sample.detail.project_id);
    setActiveView('pcb');
    setCopilotOpen(false);
  };

  // Auth gate when required by live backend
  if (authRequired && !isAuthenticated && !checkingSession) {
    return <AuthGate />;
  }

  const projectErr = projectBundleQuery.error;
  const isForbidden = projectErr instanceof ApiHttpError && projectErr.status === 403;
  const isNotFound = projectErr instanceof ApiHttpError && projectErr.status === 404;

  const leftTabs: Array<{ id: LeftSidebarTab; label: string; icon: typeof BookOpen }> = [
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'objects', label: 'Objects', icon: Boxes },
    { id: 'pipeline', label: 'Pipeline', icon: Workflow },
  ];

  const leftSidebarContent = (
    <div className="flex h-full flex-col bg-[var(--bg-panel)]">
      <div
        role="tablist"
        aria-label="Left sidebar panels"
        className="grid grid-cols-3 border-b border-[var(--border)] bg-[var(--bg-panel-alt)]"
      >
        {leftTabs.map((t) => {
          const Icon = t.icon;
          const active = leftTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setLeftTab(t.id)}
              className={`studio-tab flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold ${
                active
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {leftTab === 'library' && <LibraryTab />}
        {leftTab === 'objects' && (
          <ObjectsTab
            partsMap={partsMap}
            netlist={detail?.netlist ?? null}
            parsedBoard={parsedBoard}
          />
        )}
        {leftTab === 'pipeline' && (
          <PipelineTab
            projectId={activeProjectId}
            onProjectMutated={hydrateProject}
          />
        )}
      </div>
    </div>
  );

  const rightSidebarContent = (
    <div className="flex h-full flex-col gap-3 overflow-y-auto bg-[var(--bg-panel)] p-3">
      <InspectorPanel
        partsMap={partsMap}
        netlist={detail?.netlist ?? null}
        footprints={parsedBoard?.footprints ?? []}
      />
      <DrcPanel
        projectId={localDemo ? null : activeProjectId}
        drc={sseDesign.liveDrc ?? detail?.drc ?? null}
        onDrcUpdated={async () => {
          if (activeProjectId) {
            await hydrateProject(activeProjectId);
          }
        }}
      />
      <BomSummaryCard partsMap={partsMap} sourcingEntries={sourcingEntries} />
    </div>
  );

  return (
    <div
      data-studio="true"
      className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--bg-canvas)] text-[var(--text)]"
    >
      <a href="#main-content" className="skip-link">
        Skip to studio viewport
      </a>
      <Topbar
        projects={projects}
        activeProjectId={activeProjectId}
        drc={sseDesign.liveDrc ?? detail?.drc ?? null}
        loadingProjects={projectsQuery.isFetching}
        onSelectProject={(pid) => {
          setLocalDemo(null);
          setActiveProjectId(pid);
          setCopilotOpen(false);
        }}
        onNewProject={() => {
          setCopilotTab('design');
          setCopilotOpen(true);
        }}
        onRefreshProjects={() => {
          void refreshHealthAndSession();
          void projectsQuery.refetch();
          if (activeProjectId && !localDemo) {
            void projectBundleQuery.refetch();
          }
        }}
        onOpenDelete={() => {
          setDeleteError(null);
          setDeleteOpen(true);
        }}
        onOpenExport={() => setExportOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleLeftDrawer={() => setLeftDrawerOpen((v) => !v)}
        onToggleRightDrawer={() => setRightDrawerOpen((v) => !v)}
      />

      {/* Offline / Local Sample Status Strip */}
      {!backendOnline && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-panel-alt)] px-3 py-1.5 text-[11px]">
          <div className="flex items-center gap-2 text-[var(--warn)]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Backend API unreachable. Start <code>hackpcb</code> or configure the API URL.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!localDemo && (
              <button
                type="button"
                onClick={handleLoadLocalDemo}
                className="rounded-[4px] bg-[var(--accent)] px-2.5 py-0.5 font-semibold text-[var(--accent-text)]"
              >
                Load Sample Board
              </button>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-[4px] border border-[var(--border-strong)] bg-[var(--bg-card)] px-2 py-0.5 text-[var(--text)]"
            >
              API URL
            </button>
            <button
              type="button"
              onClick={() => void refreshHealthAndSession()}
              className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--border)] px-2 py-0.5 text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* 3-Pane Desktop CAD Shell */}
      <div className="relative grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_1fr_310px]">
        {/* Left Sidebar (Desktop) */}
        <aside
          aria-label="Parts, Objects, and Pipeline"
          className="hidden min-h-0 border-r border-[var(--border)] lg:block"
        >
          {leftSidebarContent}
        </aside>

        {/* Center Interactive Viewport */}
        <main id="main-content" tabIndex={-1} className="relative min-h-0 overflow-hidden bg-[var(--bg-canvas)]">
          {isForbidden ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="max-w-md rounded-[8px] border border-[var(--err)]/40 bg-[var(--bg-panel)] p-6 text-center">
                <ShieldAlert className="mx-auto h-8 w-8 text-[var(--err)]" aria-hidden="true" />
                <h2 className="mt-3 text-base font-bold text-[var(--text)]">
                  Access Denied (403 Forbidden)
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
                  Project <code className="font-mono">{activeProjectId}</code> is owned by another user. Select one of your projects or start a new design.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveProjectId(null);
                    setCopilotTab('design');
                    setCopilotOpen(true);
                  }}
                  className="mt-4 rounded-[5px] bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-text)]"
                >
                  Start New Design
                </button>
              </div>
            </div>
          ) : isNotFound ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="max-w-md rounded-[8px] border border-[var(--border)] bg-[var(--bg-panel)] p-6 text-center">
                <FolderOpen className="mx-auto h-8 w-8 text-[var(--text-dim)]" aria-hidden="true" />
                <h2 className="mt-3 text-base font-bold text-[var(--text)]">
                  Project Not Found (404)
                </h2>
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  The requested project ID does not exist or was deleted.
                </p>
              </div>
            </div>
          ) : !activeProjectId && !localDemo && !sseDesign.running ? (
            <div className="cad-grid-bg flex h-full items-center justify-center p-6">
              <div className="max-w-md rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-panel)]/95 p-6 text-center shadow-xl">
                <Cpu className="mx-auto h-8 w-8 text-[var(--accent)]" aria-hidden="true" />
                <h2 className="mt-3 text-base font-bold text-[var(--text)]">
                  Coupled AI PCB Studio
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
                  {backendOnline
                    ? 'Open the AI Copilot to stream a full 6-stage PCB design, or upload a .kicad_pcb board in the Pipeline tab.'
                    : 'Connect a hackpcb backend or load the built-in sample board to inspect 2D copper layers, 3D FR-4 geometry, and KiCad schematics.'}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCopilotTab('design');
                      setCopilotOpen(true);
                    }}
                    className="rounded-[5px] bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-text)]"
                  >
                    Open AI Copilot
                  </button>
                  {!backendOnline && (
                    <button
                      type="button"
                      onClick={handleLoadLocalDemo}
                      className="rounded-[5px] border border-[var(--border-strong)] bg-[var(--bg-card)] px-4 py-2 text-xs font-medium text-[var(--text)]"
                    >
                      Load Sample Board
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeView === 'pcb' && (
                <PcbCanvas2D board={parsedBoard} fitTrigger={fitTrigger} />
              )}
              {activeView === '3d' && (
                <PcbCanvas3D board={parsedBoard} fitTrigger={fitTrigger} />
              )}
              {activeView === 'schematic' && (
                <SchematicViewer svgText={schematicSvg} fitTrigger={fitTrigger} />
              )}
              {activeView === 'code' && (
                <CodeInspectorView
                  detail={detail}
                  kicadPcbText={kicadPcbText}
                  kicadSchText={kicadSchText}
                />
              )}
            </>
          )}

          {/* Non-colliding Floating Overlays */}
          {(activeView === 'pcb' || activeView === '3d') && (
            <BoardBadge projectId={activeProjectId} board={parsedBoard} />
          )}

          <CanvasHud onFit={() => setFitTrigger((n) => n + 1)} />

          <AiCopilotDrawer
            projectId={localDemo ? null : activeProjectId}
            chatHistory={detail?.chat_history ?? []}
            onHydrateProject={hydrateProject}
          />
        </main>

        {/* Right Inspector (Desktop) */}
        <aside
          aria-label="Inspector, DRC, and BOM"
          className="hidden min-h-0 border-l border-[var(--border)] lg:block"
        >
          {rightSidebarContent}
        </aside>

        {/* Responsive Slide-over Drawers (< 1100px / < lg) */}
        {leftDrawerOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div className="relative h-full w-[300px] max-w-[85vw] border-r border-[var(--border-strong)] bg-[var(--bg-panel)] shadow-2xl">
              <button
                type="button"
                onClick={() => setLeftDrawerOpen(false)}
                aria-label="Close left sidebar"
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded bg-[var(--bg-card)] text-[var(--text)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              {leftSidebarContent}
            </div>
            <div
              className="flex-1 bg-black/50"
              onClick={() => setLeftDrawerOpen(false)}
            />
          </div>
        )}

        {rightDrawerOpen && (
          <div className="fixed inset-0 z-40 flex justify-end lg:hidden">
            <div
              className="flex-1 bg-black/50"
              onClick={() => setRightDrawerOpen(false)}
            />
            <div className="relative h-full w-[310px] max-w-[85vw] border-l border-[var(--border-strong)] bg-[var(--bg-panel)] shadow-2xl">
              <button
                type="button"
                onClick={() => setRightDrawerOpen(false)}
                aria-label="Close right inspector"
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded bg-[var(--bg-card)] text-[var(--text)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              {rightSidebarContent}
            </div>
          </div>
        )}
      </div>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        projectId={activeProjectId}
        localDemo={localDemo}
      />

      <DeleteProjectDialog
        open={deleteOpen}
        projectId={activeProjectId}
        busy={deleteBusy}
        error={deleteError}
        onConfirm={() => void handleDeleteConfirm()}
        onClose={() => setDeleteOpen(false)}
      />

      <ApiSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
