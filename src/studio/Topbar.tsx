import {
  ArrowLeft,
  Download,
  LogIn,
  LogOut,
  PanelLeft,
  PanelRight,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DrcReport, ProjectSummary } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { StudioView, useStudioStore } from '../store/useStudioStore';

interface TopbarProps {
  projects: ProjectSummary[];
  activeProjectId: string | null;
  drc: DrcReport | null;
  loadingProjects: boolean;
  onSelectProject: (pid: string) => void;
  onNewProject: () => void;
  onRefreshProjects: () => void;
  onOpenDelete: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  onToggleLeftDrawer: () => void;
  onToggleRightDrawer: () => void;
}

const VIEW_TABS: Array<{ id: StudioView; label: string }> = [
  { id: 'schematic', label: 'Schematic' },
  { id: 'code', label: 'Code / API' },
  { id: 'pcb', label: 'PCB' },
  { id: '3d', label: '3D' },
];

export function Topbar({
  projects,
  activeProjectId,
  drc,
  loadingProjects,
  onSelectProject,
  onNewProject,
  onRefreshProjects,
  onOpenDelete,
  onOpenExport,
  onOpenSettings,
  onToggleLeftDrawer,
  onToggleRightDrawer,
}: TopbarProps) {
  const {
    health,
    backendOnline,
    user,
    authEnabled,
    openAuthModal,
    signOut,
  } = useAuth();

  const navigate = useNavigate();
  const activeView = useStudioStore((s) => s.activeView);
  const setActiveView = useStudioStore((s) => s.setActiveView);
  const setMode = useStudioStore((s) => s.setMode);
  const localDemo = useStudioStore((s) => s.localDemo);

  const routerLabel =
    health?.active_router === 'pcbworld'
      ? 'PCBWorld RL'
      : health?.active_router === 'astar'
        ? 'A* 2L'
        : health?.active_router === 'mock'
          ? 'Mock'
          : 'Router';

  const kicadVersion = health?.worker_health?.kicad_version;
  const kicadReady = Boolean(health?.kicad_cli || health?.worker_health?.kicad_cli);

  const drcPass = Boolean(
    drc && drc.passed && drc.error_count === 0 && drc.unconnected_count === 0,
  );

  return (
    <header className="flex h-[46px] shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-panel)] px-2.5 text-xs">
      {/* Left: Brand + Mobile Drawer + Project Switcher */}
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleLeftDrawer}
          aria-label="Toggle left sidebar"
          className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] text-[var(--text-muted)] hover:text-[var(--text)] lg:hidden"
        >
          <PanelLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('landing');
            navigate('/');
          }}
          title="Back to Coupled overview"
          className="inline-flex h-7 items-center gap-1.5 rounded-[5px] px-1.5 font-semibold text-[var(--text)] hover:bg-[var(--bg-panel-alt)]"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-[var(--accent)] font-mono text-[11px] font-bold text-[var(--accent-text)]">
            C
          </span>
          <span className="hidden sm:inline tracking-tight">Coupled</span>
          <ArrowLeft className="hidden h-3 w-3 text-[var(--text-dim)] sm:inline" aria-hidden="true" />
        </button>

        <div className="mx-0.5 h-4 w-px bg-[var(--border)]" />

        <select
          aria-label="Active PCB project"
          value={activeProjectId ?? ''}
          onChange={(e) => {
            if (e.target.value) onSelectProject(e.target.value);
          }}
          className="h-7 max-w-[165px] truncate rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] px-2 font-mono text-[11px] text-[var(--text)] sm:max-w-[210px]"
        >
          {!activeProjectId && <option value="">Select project...</option>}
          {localDemo && (
            <option value={localDemo.detail.project_id}>
              {localDemo.detail.project_id} (Sample)
            </option>
          )}
          {projects.map((p) => (
            <option key={p.project_id} value={p.project_id}>
              {p.board_name ? `${p.board_name} (${p.project_id})` : p.project_id}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onNewProject}
          title="New AI PCB design"
          aria-label="New AI PCB design"
          className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] text-[var(--text)] hover:border-[var(--accent)]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onRefreshProjects}
          disabled={!backendOnline || loadingProjects}
          title="Refresh projects"
          aria-label="Refresh projects"
          className="hidden h-7 w-7 items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-45 sm:flex"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loadingProjects ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
        </button>

        {activeProjectId && !localDemo && backendOnline && (
          <button
            type="button"
            onClick={onOpenDelete}
            title="Delete active project"
            aria-label="Delete active project"
            className="hidden h-7 w-7 items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] text-[var(--text-muted)] hover:border-[var(--err)]/50 hover:text-[var(--err)] sm:flex"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Center: View Tabs */}
      <nav aria-label="CAD viewports" className="flex items-center">
        <div
          role="tablist"
          aria-label="Workspace view"
          className="flex items-center gap-0.5 rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] p-0.5"
        >
          {VIEW_TABS.map((tab) => {
            const selected = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveView(tab.id)}
                className={`studio-tab rounded-[4px] px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${
                  selected
                    ? 'bg-[var(--bg-card)] text-[var(--text)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Right: Capability Pills + Export + Settings + Auth */}
      <div className="flex items-center gap-1.5">
        <div className="hidden items-center gap-1 xl:flex">
          {!backendOnline ? (
            <span className="rounded-[4px] border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--warn)]">
              API Offline
            </span>
          ) : (
            <>
              <span
                className={`rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] ${
                  health?.llm
                    ? 'bg-[var(--accent-dim)] text-[var(--ok)]'
                    : 'bg-[var(--warn)]/15 text-[var(--warn)]'
                }`}
              >
                {health?.llm ? '● Gemini' : '● Offline LLM'}
              </span>
              <span
                className={`rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] ${
                  health?.octopart
                    ? 'bg-[var(--accent-dim)] text-[var(--ok)]'
                    : 'bg-[var(--bg-panel-alt)] text-[var(--text-dim)]'
                }`}
              >
                {health?.octopart ? '● Octopart' : '○ No Octo'}
              </span>
              <span className="rounded-[4px] bg-[var(--bg-panel-alt)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                {routerLabel}
              </span>
              <span
                className={`rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] ${
                  kicadReady
                    ? 'bg-[var(--accent-dim)] text-[var(--ok)]'
                    : 'bg-[var(--warn)]/15 text-[var(--warn)]'
                }`}
              >
                {kicadReady ? `KiCad ${kicadVersion ?? '9'}` : 'No KiCad'}
              </span>
              {drc && (
                <span
                  className={`rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                    drcPass
                      ? 'bg-[var(--accent-dim)] text-[var(--ok)]'
                      : 'bg-[var(--err)]/15 text-[var(--err)]'
                  }`}
                >
                  {drcPass
                    ? 'DRC PASS'
                    : `DRC ${drc.error_count}E/${drc.unconnected_count}U`}
                </span>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenExport}
          className="inline-flex h-7 items-center gap-1 rounded-[5px] bg-[var(--accent)] px-2.5 text-[11px] font-semibold text-[var(--accent-text)] hover:opacity-90"
        >
          <Download className="h-3 w-3" aria-hidden="true" />
          <span className="hidden sm:inline">EXPORT</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title="Backend API & CORS settings"
          aria-label="Backend API settings"
          className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <Settings className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {user ? (
          <div className="flex items-center gap-1">
            <span
              className="hidden max-w-[110px] truncate rounded-[5px] border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 font-mono text-[10.5px] text-[var(--text-muted)] md:inline"
              title={user.email}
            >
              {user.name || user.email}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              title="Sign out"
              aria-label="Sign out"
              className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          (authEnabled || !backendOnline) && (
            <button
              type="button"
              onClick={() => openAuthModal('sign-in')}
              className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-[var(--border-strong)] bg-[var(--bg-panel-alt)] px-2 text-[11px] font-medium text-[var(--text)] hover:border-[var(--accent)]"
            >
              <LogIn className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )
        )}

        <button
          type="button"
          onClick={onToggleRightDrawer}
          aria-label="Toggle right inspector"
          className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--bg-panel-alt)] text-[var(--text-muted)] hover:text-[var(--text)] lg:hidden"
        >
          <PanelRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
