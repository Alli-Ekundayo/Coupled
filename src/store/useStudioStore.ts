import { create } from 'zustand';
import {
  ApiTraceEntry,
  DrcReport,
  Part,
  ProjectDetail,
  RoutingStepEvent,
} from '../api/types';

export type AppMode = 'landing' | 'studio';
export type StudioView = 'schematic' | 'code' | 'pcb' | '3d';
export type LeftSidebarTab = 'library' | 'objects' | 'pipeline';
export type PipelineStepId = 'reqs' | 'parts' | 'sch' | 'place' | 'route' | 'drc';
export type PipelineStepStatus = 'idle' | 'running' | 'done' | 'error';

export interface LayerVisibility {
  fCu: boolean;
  bCu: boolean;
  silk: boolean;
  crtyd: boolean;
  zones: boolean;
}

export interface Camera2D {
  cx: number;
  cy: number;
  scale: number;
}

export interface SchematicTransform {
  x: number;
  y: number;
  scale: number;
}

export interface SseDesignProgress {
  running: boolean;
  projectId: string | null;
  steps: Record<PipelineStepId, PipelineStepStatus>;
  routingStep: RoutingStepEvent | null;
  liveSvgSnapshot: string | null;
  liveSchematicSvg: string | null;
  liveDrc: DrcReport | null;
  error: string | null;
}

export interface LocalDemoSnapshot {
  detail: ProjectDetail;
  kicadPcbText: string;
  kicadSchText: string;
  schematicSvg: string;
  bomCsv: string;
}

const INITIAL_STEPS: Record<PipelineStepId, PipelineStepStatus> = {
  reqs: 'idle',
  parts: 'idle',
  sch: 'idle',
  place: 'idle',
  route: 'idle',
  drc: 'idle',
};

function readInitialMode(): AppMode {
  if (typeof window === 'undefined') return 'landing';
  const hash = window.location.hash;
  const path = window.location.pathname;
  if (hash.startsWith('#/studio') || hash === '#studio' || path.startsWith('/studio')) {
    return 'studio';
  }
  return 'landing';
}

function readInitialProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('project');
  if (fromQuery) return fromQuery;
  const hashMatch = window.location.hash.match(/project=([^&]+)/);
  return hashMatch ? decodeURIComponent(hashMatch[1]) : null;
}

interface StudioState {
  mode: AppMode;
  activeProjectId: string | null;
  activeView: StudioView;
  leftTab: LeftSidebarTab;
  selectedRef: string | null;
  inspectedLibraryPart: Part | null;
  highlightedNet: string | null;
  layers: LayerVisibility;
  camera2d: Camera2D;
  schematicTransform: SchematicTransform;
  cursorMm: { x: number; y: number } | null;
  copilotOpen: boolean;
  copilotTab: 'design' | 'chat';
  pendingLandingPrompt: string | null;
  pendingLandingBoardFile: File | null;
  apiTraces: ApiTraceEntry[];
  sseDesign: SseDesignProgress;
  localDemo: LocalDemoSnapshot | null;

  setMode: (mode: AppMode, opts?: { projectId?: string | null; view?: StudioView }) => void;
  setActiveProjectId: (pid: string | null) => void;
  setActiveView: (view: StudioView) => void;
  setLeftTab: (tab: LeftSidebarTab) => void;
  selectComponent: (ref: string | null) => void;
  inspectLibraryPart: (part: Part | null) => void;
  setHighlightedNet: (net: string | null) => void;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  setCamera2d: (cam: Camera2D | ((prev: Camera2D) => Camera2D)) => void;
  setSchematicTransform: (t: SchematicTransform | ((prev: SchematicTransform) => SchematicTransform)) => void;
  setCursorMm: (pos: { x: number; y: number } | null) => void;
  setCopilotOpen: (open: boolean) => void;
  setCopilotTab: (tab: 'design' | 'chat') => void;
  setPendingLandingPayload: (payload: { prompt?: string | null; boardFile?: File | null }) => void;
  pushApiTrace: (entry: ApiTraceEntry) => void;
  clearApiTraces: () => void;
  resetSseDesign: () => void;
  patchSseDesign: (updater: (prev: SseDesignProgress) => SseDesignProgress) => void;
  setLocalDemo: (demo: LocalDemoSnapshot | null) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  mode: readInitialMode(),
  activeProjectId: readInitialProjectId(),
  activeView: 'pcb',
  leftTab: 'objects',
  selectedRef: null,
  inspectedLibraryPart: null,
  highlightedNet: null,
  layers: {
    fCu: true,
    bCu: true,
    silk: true,
    crtyd: true,
    zones: true,
  },
  camera2d: { cx: 20, cy: 15, scale: 14 },
  schematicTransform: { x: 0, y: 0, scale: 1 },
  cursorMm: null,
  copilotOpen: false,
  copilotTab: 'design',
  pendingLandingPrompt: null,
  pendingLandingBoardFile: null,
  apiTraces: [],
  sseDesign: {
    running: false,
    projectId: null,
    steps: { ...INITIAL_STEPS },
    routingStep: null,
    liveSvgSnapshot: null,
    liveSchematicSvg: null,
    liveDrc: null,
    error: null,
  },
  localDemo: null,

  setMode: (mode, opts) =>
    set((state) => ({
      mode,
      activeProjectId: opts?.projectId !== undefined ? opts.projectId : state.activeProjectId,
      activeView: opts?.view ?? state.activeView,
    })),

  setActiveProjectId: (activeProjectId) =>
    set({
      activeProjectId,
      selectedRef: null,
      inspectedLibraryPart: null,
      highlightedNet: null,
      localDemo: null,
    }),

  setActiveView: (activeView) => set({ activeView }),
  setLeftTab: (leftTab) => set({ leftTab }),
  selectComponent: (selectedRef) =>
    set({
      selectedRef,
      inspectedLibraryPart: null,
    }),
  inspectLibraryPart: (inspectedLibraryPart) =>
    set({
      inspectedLibraryPart,
      selectedRef: null,
    }),
  setHighlightedNet: (highlightedNet) => set({ highlightedNet }),
  toggleLayer: (layer) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: !state.layers[layer] },
    })),
  setCamera2d: (cam) =>
    set((state) => ({
      camera2d: typeof cam === 'function' ? cam(state.camera2d) : cam,
    })),
  setSchematicTransform: (t) =>
    set((state) => ({
      schematicTransform: typeof t === 'function' ? t(state.schematicTransform) : t,
    })),
  setCursorMm: (cursorMm) => set({ cursorMm }),
  setCopilotOpen: (copilotOpen) => set({ copilotOpen }),
  setCopilotTab: (copilotTab) => set({ copilotTab }),
  setPendingLandingPayload: (payload) =>
    set((state) => ({
      pendingLandingPrompt:
        payload.prompt !== undefined ? payload.prompt : state.pendingLandingPrompt,
      pendingLandingBoardFile:
        payload.boardFile !== undefined ? payload.boardFile : state.pendingLandingBoardFile,
    })),
  pushApiTrace: (entry) =>
    set((state) => ({
      apiTraces: [entry, ...state.apiTraces].slice(0, 100),
    })),
  clearApiTraces: () => set({ apiTraces: [] }),
  resetSseDesign: () =>
    set({
      sseDesign: {
        running: false,
        projectId: null,
        steps: { ...INITIAL_STEPS },
        routingStep: null,
        liveSvgSnapshot: null,
        liveSchematicSvg: null,
        liveDrc: null,
        error: null,
      },
    }),
  patchSseDesign: (updater) =>
    set((state) => ({
      sseDesign: updater(state.sseDesign),
    })),
  setLocalDemo: (localDemo) => set({ localDemo }),
}));
