import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { createLocalSampleProject, createLocalUploadedProject } from '../cad/sampleProject';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { StartDialog } from '../components/StartDialog';
import { useStudioStore } from '../store/useStudioStore';
import { PcbTheme } from '../three/pcbMaterials';
import { BuildModeId } from '../utils/buildModes';
import { PcbBoardPreset } from '../utils/pcbLayout';
import { createProject, Project, StartRequest } from '../utils/projects';
import { AppContextType } from './appContext';

function getInitialTheme(): PcbTheme {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem('coupled-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  }
  return 'dark';
}

function useScrollToAnchorOnNavigation() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
}

export function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<PcbTheme>(getInitialTheme);
  const [openMode, setOpenMode] = useState<BuildModeId | null>(null);
  const [activePresetId, setActivePresetId] = useState<PcbBoardPreset['id']>('sensor-node');
  const [animationKey, setAnimationKey] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useScrollToAnchorOnNavigation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', theme);
    try {
      window.localStorage.setItem('coupled-theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'coupled-theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const replayAnimation = useCallback(() => setAnimationKey((k) => k + 1), []);
  const openStart = useCallback((_mode?: BuildModeId) => {
    navigate('/auth?redirect=/studio');
  }, [navigate]);
  const closeStart = useCallback(() => setOpenMode(null), []);

  const handleStart = async (request: StartRequest) => {
    const project = createProject(request, projects.length + 1);
    setProjects((prev) => [project, ...prev]);
    setSelectedProjectId(project.id);
    setActivePresetId(request.presetId);
    replayAnimation();

    const studio = useStudioStore.getState();
    studio.setMode('studio');

    if (request.mode === 'scratch' && request.brief) {
      studio.setLocalDemo(null);
      studio.setPendingLandingPayload({ prompt: request.brief, boardFile: null });
      studio.setCopilotTab('design');
      studio.setCopilotOpen(true);
    } else if (request.file) {
      studio.setPendingLandingPayload({ boardFile: request.file, prompt: null });
      studio.setLeftTab('pipeline');
      studio.setActiveView('pcb');
      studio.setCopilotOpen(false);
      if (request.file.name.toLowerCase().endsWith('.kicad_pcb')) {
        try {
          const text = await request.file.text();
          const snapshot = createLocalUploadedProject(request.file.name, text);
          studio.setLocalDemo(snapshot);
          studio.setActiveProjectId(snapshot.detail.project_id);
        } catch {
          // If client-side parse fails, PipelineTab still holds the File for backend upload
        }
      }
    } else {
      const sample = createLocalSampleProject();
      studio.setPendingLandingPayload({ prompt: null, boardFile: null });
      studio.setLocalDemo(sample);
      studio.setActiveProjectId(sample.detail.project_id);
      studio.setActiveView('pcb');
      studio.setCopilotOpen(false);
    }

    if (pathname !== '/studio') {
      navigate('/studio');
    }
  };

  const contextValue: AppContextType = {
    theme,
    openStart,
    projects,
    selectedProjectId,
    selectProject: setSelectedProjectId,
    animationKey,
    replayAnimation,
  };

  return (
    <div id="top" className="bg-paper-texture min-h-screen text-[var(--color-fg)]">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navbar
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onStart={() => openStart('full')}
      />
      <main id="main-content" tabIndex={-1}>
        <Outlet context={contextValue} />
      </main>
      <Footer onStart={() => openStart('full')} />
      <StartDialog
        openMode={openMode}
        activePresetId={activePresetId}
        onClose={closeStart}
        onStart={handleStart}
      />
    </div>
  );
}
