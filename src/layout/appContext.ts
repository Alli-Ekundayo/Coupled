import { useOutletContext } from 'react-router-dom';
import { PcbTheme } from '../three/pcbMaterials';
import { BuildModeId } from '../utils/buildModes';
import { Project } from '../utils/projects';

export interface AppContextType {
  theme: PcbTheme;
  openStart: (mode: BuildModeId) => void;
  projects: readonly Project[];
  selectedProjectId: string | null;
  selectProject: (id: string | null) => void;
  animationKey: number;
  replayAnimation: () => void;
}

export function useAppContext(): AppContextType {
  return useOutletContext<AppContextType>();
}
