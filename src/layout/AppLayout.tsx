import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { StartDialog } from '../components/StartDialog';
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
    try {
      window.localStorage.setItem('coupled-theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const replayAnimation = useCallback(() => setAnimationKey((k) => k + 1), []);
  const openStart = useCallback((mode: BuildModeId) => setOpenMode(mode), []);
  const closeStart = useCallback(() => setOpenMode(null), []);

  const handleStart = (request: StartRequest) => {
    const project = createProject(request, projects.length + 1);
    setProjects((prev) => [project, ...prev]);
    setSelectedProjectId(project.id);
    setActivePresetId(request.presetId);
    replayAnimation();
    if (pathname !== '/') {
      navigate('/');
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
      <Navbar
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onStart={() => openStart('full')}
      />
      <main>
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
